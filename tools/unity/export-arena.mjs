import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Writes Luke's Arena for the engine-free C# port: the level, the tunable rules, and scripted
// runs recorded from the TypeScript rules that the port must reproduce. Run from the repository root:
//   node --experimental-strip-types tools/unity/export-arena.mjs [--verify]
// No Unity Editor, renderer or art is loaded. --verify regenerates in memory and fails when the
// committed C# no longer matches the TypeScript source.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const verify = process.argv.includes('--verify');
const source = path => pathToFileURL(join(root, 'src/game', path)).href;
const { ARENA, ARENA_EVENT, ARENA_IDLE, ARENA_LAYOUT, ROBOT_PROFILES, createArena, stepArena } = await import(source('arena/arena.ts'));
const { BLOCKS, LUKE_ARENA } = await import(source('arena/arena-world.ts'));
const { createHero } = await import(source('traversal/hero.ts'));
const { TRAVERSAL_STEP } = await import(source('traversal/tuning.ts'));

const sourceFiles = ['traversal/tuning.ts', 'traversal/world.ts', 'traversal/hero.ts', 'arena/arena-world.ts', 'arena/arena.ts'];
const aggregate = createHash('sha256');
for (const name of sourceFiles) {
  const text = (await readFile(join(root, 'src/game', name), 'utf8')).replaceAll('\r\n', '\n');
  aggregate.update(name).update('\0').update(text).update('\0');
}
const sourceFingerprint = aggregate.digest('hex');

const number = value => {
  if (!Number.isFinite(value)) throw new Error(`Non-finite arena value ${value}`);
  const text = String(value);
  return /[.e]/.test(text) ? text : `${text}.0`;
};
const quote = value => `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
const title = value => value[0].toUpperCase() + value.slice(1);
const trial = value => `TrialId.${value ? title(value) : 'None'}`;
const HERO_MODES = ['ground', 'air', 'swing', 'catch', 'climb'];
const ROBOT_MODES = ['dormant', 'patrol', 'curious', 'alert', 'windup', 'strike', 'recover', 'search', 'resolved'];
const ROBOT_KINDS = ['iguana', 'drone', 'mower', 'sentry'];
const TRIALS = ['', 'course', 'ring', 'stealth'];
const SIDEKICK_MODES = ['follow', 'wait', 'ready', 'stun', 'toss', 'rest'];
const OOP_PHASES = ['', 'rise', 'hang', 'dive'];
const INTEGER_RULES = ['energyMax', 'catchHelpMax', 'diveCount'];

// ---------- Scripted runs ----------
const seconds = value => Math.round(value / TRAVERSAL_STEP);
const idle = steps => ({ steps });
/** Tap a button on a steady rhythm: `gap` steps released, then two steps pressed. */
const taps = (count, gap, button, extra = {}) => Array.from({ length: count }, () => [{ steps: gap, ...extra, [button]: false }, { steps: 2, ...extra, [button]: true }]).flat();
function seeded(seed, count, askSeed = 0) {
  let state = seed;
  const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
  // The sidekick button draws from its own sequence, so runs recorded before it existed keep their inputs.
  let askState = askSeed;
  const ask = () => { askState = (askState * 1664525 + 1013904223) >>> 0; return askState / 4294967296; };
  // Short decimals keep the generated file readable; both runtimes read the same rounded values.
  const round = value => Math.round(value * 1000) / 1000;
  return Array.from({ length: count }, () => {
    const angle = random() * Math.PI * 2, strength = random() < 0.15 ? 0 : 1, aim = random() * Math.PI * 2;
    return { steps: 12 + Math.floor(random() * 30), moveX: round(Math.sin(angle) * strength), moveZ: round(Math.cos(angle) * strength),
      jump: random() < 0.3, power: random() < 0.35, action: random() < 0.45, pounce: random() < 0.15, sidekick: askSeed !== 0 && ask() < 0.45, aimX: round(Math.sin(aim)), aimZ: round(Math.cos(aim)) };
  });
}
const scripts = [
  // Walk into the tower's marked face, climb, pull up, cross the top, leap and zip to the ledge.
  { name: 'course-climb-mantle-and-zip', start: { x: -18.6, z: -4, yaw: -Math.PI / 2 }, segments: [
    { steps: seconds(3.1), moveX: -1 }, { steps: seconds(0.2), moveX: 0 }, { steps: seconds(0.35), moveZ: 1 },
    { steps: seconds(3), moveZ: 1, jump: true, power: true }, { steps: seconds(1.5), moveZ: 0.4, jump: false, power: false }, idle(seconds(3.2)) ] },
  // Up a chimney face, hang, shuffle, wall-jump off and grab it again.
  { name: 'course-chimney-shuffle-and-wall-jump', start: { x: -12.9, z: 6, yaw: Math.PI / 2 }, segments: [
    { steps: seconds(1.2), moveX: -1 }, { steps: seconds(0.6), moveX: 0, moveZ: 1 }, { steps: seconds(0.5), moveZ: -1 }, { steps: 4, moveZ: 0, jump: true },
    { steps: seconds(0.5), jump: false, moveX: 1 }, { steps: seconds(1.4), moveX: 1 }, { steps: seconds(0.8), moveX: -1 }, idle(seconds(0.5)) ] },
  // Stand in the ring and press the one button on a rhythm while the waves come.
  { name: 'ring-stand-and-press', start: { x: 0, z: 4, yaw: 0 }, segments: taps(110, 38, 'action', { aimZ: 1 }) },
  // The same with the pounce button, moving.
  { name: 'ring-circle-and-pounce', start: { x: 0, z: 1, yaw: 0 }, segments: taps(45, 58, 'pounce', { moveX: 0.7, moveZ: 0.5, aimZ: 1 }).concat(taps(45, 58, 'pounce', { moveX: -0.8, moveZ: 0.3, aimX: -1 })) },
  { name: 'ring-seeded-inputs', start: { x: 0, z: 2, yaw: 0 }, segments: seeded(20261116, 130) },
  // Put the controller down in the middle of a wave: hit, bonked, back on his feet, and nothing lost.
  { name: 'ring-idle-until-bonked', start: { x: 0, z: 13, yaw: 0 }, segments: [idle(seconds(46))] },
  // Walk in from the hub, back out over the line, and in again.
  { name: 'hub-in-out-and-in', start: { x: 0, z: -18, yaw: 0 }, segments: [
    { steps: seconds(4.2), moveZ: 1 }, { steps: seconds(2.4), moveZ: -1 }, { steps: seconds(1.2), moveZ: 0 }, { steps: seconds(3), moveZ: 1, power: true }, idle(seconds(5)) ] },
  // Stand where the floodlight sweeps: caught, held, set down in hiding, and left alone.
  { name: 'yard-floodlight-catch', start: { x: 26.5, z: 7, yaw: 0 }, segments: [idle(seconds(9)), { steps: seconds(4), moveX: 1, moveZ: 1 }, idle(seconds(4))] },
  // South of the near patrol: press the button as the guard goes by.
  { name: 'yard-quiet-opening', start: { x: 21.5, z: -2.5, yaw: 0 }, segments: taps(60, 46, 'action', { aimZ: 1 }) },
  { name: 'yard-seeded-inputs', start: { x: 16, z: -4, yaw: 0 }, segments: seeded(4711, 130) },
  { name: 'course-seeded-inputs', start: { x: -18, z: -4, yaw: 0 }, segments: seeded(987654321, 110) },
  // Stand in the ring and ask the sidekick on a rhythm: he hops over, throws, the moment slows, the dive lands, and again once he has rested.
  { name: 'ring-stand-and-ask', start: { x: 0, z: 4, yaw: 0 }, segments: taps(70, 58, 'sidekick', { aimZ: 1 }) },
  // On the move, away from him, the same button stuns; the action button then finishes what he set up.
  { name: 'ring-run-ask-and-finish', start: { x: 0, z: 6, yaw: 0 }, segments: Array.from({ length: 26 }, (_unused, index) => {
    const turn = index * 1.3, round = value => Math.round(value * 100) / 100;
    const move = { moveX: round(Math.sin(turn) * 0.9), moveZ: round(Math.cos(turn) * 0.9), aimX: round(Math.sin(turn + 2)), aimZ: round(Math.cos(turn + 2)) };
    return [{ steps: 46, ...move, sidekick: false, action: false }, { steps: 2, ...move, sidekick: true }, { steps: 34, ...move, sidekick: false }, { steps: 2, ...move, action: true }, { steps: 26, ...move, action: false }];
  }).flat() },
  // In the hub a throw is a boost with a hop at the top. Over the stealth line he waits at the gate and cannot be asked; back out, he can.
  { name: 'hub-toss-hop-and-gate', start: { x: 6, z: -14, yaw: 0 }, segments: [
    idle(seconds(2)), { steps: 2, sidekick: true, aimX: 1 }, { steps: seconds(0.72), sidekick: false }, { steps: 3, jump: true }, { steps: seconds(2.2), jump: false, moveX: 1 },
    { steps: seconds(3.4), moveX: 0.8, moveZ: 0.6 }, { steps: seconds(2), moveX: 0, moveZ: 0 }, ...taps(3, 50, 'sidekick'),
    { steps: seconds(3), moveX: -0.8, moveZ: -0.6, sidekick: false }, { steps: seconds(2.5), moveX: 0, moveZ: 0 }, ...taps(2, 40, 'sidekick', { aimX: 0, aimZ: 1 }), idle(seconds(3)) ] },
  { name: 'ring-seeded-with-sidekick', start: { x: 0, z: 3, yaw: 0 }, segments: seeded(20261117, 150, 77) },
  { name: 'course-seeded-with-sidekick', start: { x: -16, z: 0, yaw: 0 }, segments: seeded(31337, 110, 5) },
];
const hash = values => values.reduce((total, value, index) => total + value * (index + 1), 0);
// Besides once a second, a run is checked at the very step the sidekick does something: those moments are short.
const MOMENTS = ARENA_EVENT.toss | ARENA_EVENT.hang | ARENA_EVENT.dive | ARENA_EVENT.stun | ARENA_EVENT.zip;
// A heading as one smooth number: facing exactly backwards reads the same whether it is stored as +pi or -pi.
const heading = yaw => Math.cos(yaw) + 2 * Math.sin(yaw);
function record(script) {
  let state = createArena(ARENA_LAYOUT);
  state = { ...state, hero: createHero(LUKE_ARENA, script.start) };
  let input = { ...ARENA_IDLE };
  const marks = [];
  let step = 0, events = 0;
  const mark = () => {
    const { hero, robots, sidekick } = state;
    marks.push({ step, heroX: hero.x, heroY: hero.y, heroZ: hero.z, heroYaw: heading(hero.yaw),
      robotX: hash(robots.map(robot => robot.x)), robotZ: hash(robots.map(robot => robot.z)), robotYaw: hash(robots.map(robot => heading(robot.yaw))), awareness: hash(robots.map(robot => robot.awareness)),
      energy: state.energy, sparks: hash(robots.map(robot => robot.sparks)), heroMode: HERO_MODES.indexOf(hero.mode), trial: TRIALS.indexOf(state.trial), wave: state.wave,
      modes: hash(robots.map(robot => ROBOT_MODES.indexOf(robot.mode))),
      dadX: sidekick.x, dadZ: sidekick.z, dadYaw: heading(sidekick.yaw), dadMode: SIDEKICK_MODES.indexOf(sidekick.mode), oop: OOP_PHASES.indexOf(state.oop),
      holds: hash(robots.map(robot => robot.hold)), stunned: hash(robots.map(robot => Number(robot.stunned))), diving: state.diveIds.length });
  };
  const segments = script.segments.map(segment => ({ steps: segment.steps, moveX: 0, moveZ: 0, aimX: 0, aimZ: 0, jump: false, power: false, action: false, pounce: false, sidekick: false, ...segment }));
  for (const segment of script.segments) {
    const { steps, ...change } = segment;
    // Scripts list only what changes; seeded segments set everything.
    input = { ...input, ...change };
    for (let index = 0; index < steps; index++) {
      state = stepArena(state, input, TRAVERSAL_STEP, ARENA_LAYOUT);
      step++; events |= state.events;
      if (step % 120 === 0 || (state.events & MOMENTS) !== 0) mark();
    }
  }
  // The closing mark, unless the last step was already one.
  if (marks.length === 0 || marks[marks.length - 1].step !== step) mark();
  // What the port must be fed: the full input held during each segment.
  let held = { ...ARENA_IDLE };
  const full = script.segments.map(segment => { const { steps, ...change } = segment; held = { ...held, ...change }; return { steps, ...held }; });
  if (full.length !== segments.length) throw new Error('segment bookkeeping');
  return { name: script.name, start: script.start, segments: full, marks, events, steps: step, final: state };
}
const probes = scripts.map(record);

// ---------- Generated C# ----------
const lines = [];
const push = text => lines.push(text);
push('// <auto-generated>');
push('// Generated by tools/unity/export-arena.mjs from src/game/arena/arena-world.ts and src/game/arena/arena.ts.');
push('// Do not edit by hand: change the TypeScript arena and run the exporter.');
push('// </auto-generated>');
push('namespace SpaceDragon.Traversal');
push('{');
push("    /// <summary>Luke's Arena: a fictional training yard with an ability course, a battle ring and a stealth yard. A lab, not a story mission.</summary>");
push('    public static class LukeArenaData');
push('    {');
push(`        public const string WorldId = ${quote(LUKE_ARENA.id)};`);
push(`        public const string SourceFingerprint = ${quote(sourceFingerprint)};`);
push('');
push('        public static ArenaLayout Create()');
push('        {');
push('            return new ArenaLayout');
push('            {');
push(`                waves = ${ARENA_LAYOUT.waves},`);
push('                world = new TraversalWorld');
push('                {');
push('                    id = WorldId,');
const b = LUKE_ARENA.bounds;
push(`                    bounds = new WorldBounds { minX = ${number(b.minX)}, maxX = ${number(b.maxX)}, minZ = ${number(b.minZ)}, maxZ = ${number(b.maxZ)} },`);
push(`                    spawn = new SpawnPose { x = ${number(LUKE_ARENA.spawn.x)}, z = ${number(LUKE_ARENA.spawn.z)}, yaw = ${number(LUKE_ARENA.spawn.yaw)} },`);
push('                    solids = new[]');
push('                    {');
for (const s of LUKE_ARENA.solids) {
  if (s.slope || s.bounce || s.house) throw new Error(`Arena solid ${s.id} uses a feature the exporter does not write`);
  push(`                        new Solid { id = ${quote(s.id)}, kind = ${quote(s.kind)}, minX = ${number(s.minX)}, maxX = ${number(s.maxX)}, minZ = ${number(s.minZ)}, maxZ = ${number(s.maxZ)}, minY = ${number(s.minY)}, maxY = ${number(s.maxY)} },`);
}
push('                    },');
push('                    anchors = new[]');
push('                    {');
for (const a of LUKE_ARENA.anchors) push(`                        new Anchor { id = ${quote(a.id)}, x = ${number(a.x)}, y = ${number(a.y)}, z = ${number(a.z)}, floor = ${number(a.floor)}, perch = ${a.perch} },`);
push('                    },');
if (LUKE_ARENA.water.length || LUKE_ARENA.sparks.length) throw new Error('The arena exporter does not write water or sparks');
push('                    water = new WaterZone[0],');
push('                    sparks = new SparkSpot[0],');
push('                    recoveries = new[]');
push('                    {');
for (const r of LUKE_ARENA.recoveries) push(`                        new Recovery { id = ${quote(r.id)}, x = ${number(r.x)}, y = ${number(r.y)}, z = ${number(r.z)}, yaw = ${number(r.yaw)} },`);
push('                    },');
push('                    climbs = new[]');
push('                    {');
for (const c of LUKE_ARENA.climbs) push(`                        new ClimbSurface { id = ${quote(c.id)}, alongX = ${c.axis === 'z'}, at = ${number(c.at)}, facing = ${number(c.facing)}, min = ${number(c.min)}, max = ${number(c.max)}, minY = ${number(c.minY)}, maxY = ${number(c.maxY)} },`);
push('                    },');
push('                },');
push('                blocks = new[]');
push('                {');
for (const block of BLOCKS) push(`                    new ArenaBlock { id = ${quote(block.id)}, look = ${quote(block.look)}, minX = ${number(block.minX)}, maxX = ${number(block.maxX)}, minZ = ${number(block.minZ)}, maxZ = ${number(block.maxZ)}, top = ${number(block.top)} },`);
push('                },');
push('                zones = new[]');
push('                {');
for (const zone of ARENA_LAYOUT.zones) push(`                    new ArenaZone { id = ${trial(zone.id)}, minX = ${number(zone.minX)}, maxX = ${number(zone.maxX)}, minZ = ${number(zone.minZ)}, maxZ = ${number(zone.maxZ)} },`);
push('                },');
push('                robots = new[]');
push('                {');
for (const robot of ARENA_LAYOUT.robots) {
  const patrol = robot.patrol.length ? `new[] { ${robot.patrol.map(point => `new Waypoint { x = ${number(point.x)}, z = ${number(point.z)}, wait = ${number(point.wait)} }`).join(', ')} }` : 'new Waypoint[0]';
  push(`                    new RobotSpec { id = ${quote(robot.id)}, kind = RobotKind.${title(robot.kind)}, trial = ${trial(robot.trial)}, wave = ${robot.wave}, x = ${number(robot.x)}, z = ${number(robot.z)}, yaw = ${number(robot.yaw)},`);
  push(`                        sweepFrom = ${number(robot.sweepFrom)}, sweepTo = ${number(robot.sweepTo)}, sweepRate = ${number(robot.sweepRate)}, patrol = ${patrol} },`);
}
push('                },');
push('                pickups = new[]');
push('                {');
for (const pickup of ARENA_LAYOUT.pickups) push(`                    new ArenaPickup { id = ${quote(pickup.id)}, trial = ${trial(pickup.trial)}, x = ${number(pickup.x)}, y = ${number(pickup.y)}, z = ${number(pickup.z)} },`);
push('                },');
push('                hides = new[]');
push('                {');
for (const hide of ARENA_LAYOUT.hides) push(`                    new HideSpot { id = ${quote(hide.id)}, x = ${number(hide.x)}, z = ${number(hide.z)}, yaw = ${number(hide.yaw)} },`);
push('                },');
const buddy = ARENA_LAYOUT.sidekick;
if (buddy) {
  const waits = buddy.waits.length ? `new[] { ${buddy.waits.map(spot => `new SidekickWait { trial = ${trial(spot.trial)}, x = ${number(spot.x)}, z = ${number(spot.z)}, yaw = ${number(spot.yaw)} }`).join(', ')} }` : 'new SidekickWait[0]';
  push(`                sidekick = new SidekickSpec { id = ${quote(buddy.id)}, x = ${number(buddy.x)}, z = ${number(buddy.z)}, yaw = ${number(buddy.yaw)}, waits = ${waits} },`);
}
push('                rules = new ArenaRules');
push('                {');
for (const [name, value] of Object.entries(ARENA)) push(`                    ${name} = ${INTEGER_RULES.includes(name) ? value : number(value)},`);
push('                },');
push('                profiles = new[]');
push('                {');
for (const kind of ROBOT_KINDS) {
  const p = ROBOT_PROFILES[kind];
  const fields = Object.entries(p).map(([name, value]) => `${name} = ${typeof value === 'boolean' ? value : name === 'sparks' ? value : number(value)}`).join(', ');
  push(`                    new RobotProfile { ${fields} }, // ${kind}`);
}
push('                },');
push('            };');
push('        }');
push('');
push('        /// <summary>Scripted runs recorded from the TypeScript rules. The port must pass through the same moments.</summary>');
push('        public static readonly ArenaProbe[] Probes =');
push('        {');
for (const probe of probes) {
  const { start, final } = probe;
  push('            new ArenaProbe');
  push('            {');
  push(`                name = ${quote(probe.name)}, startX = ${number(start.x)}, startZ = ${number(start.z)}, startYaw = ${number(start.yaw)}, startY = ${number(start.y ?? 0)}, hasStartY = ${start.y !== undefined},`);
  push(`                events = ${probe.events}, courseStars = ${final.progress.courseStars}, ringStars = ${final.progress.ringStars}, ringBest = ${final.progress.ringBest}, stealthStars = ${final.progress.stealthStars}, quiet = ${final.progress.quiet},`);
  push(`                catches = ${final.catches}, ringHits = ${final.ringHits}, seen = ${final.seen}, courseBest = ${number(final.progress.courseBest)}, course = new string[] { ${final.progress.course.map(quote).join(', ')} },`);
  push('                segments = new[]');
  push('                {');
  for (const s of probe.segments) push(`                    new ArenaProbeSegment { steps = ${s.steps}, moveX = ${number(s.moveX)}, moveZ = ${number(s.moveZ)}, aimX = ${number(s.aimX)}, aimZ = ${number(s.aimZ)}, jump = ${s.jump}, power = ${s.power}, action = ${s.action}, pounce = ${s.pounce}, sidekick = ${s.sidekick} },`);
  push('                },');
  push('                marks = new[]');
  push('                {');
  for (const m of probe.marks) {
    push(`                    new ArenaProbeMark { step = ${m.step}, heroX = ${number(m.heroX)}, heroY = ${number(m.heroY)}, heroZ = ${number(m.heroZ)}, heroYaw = ${number(m.heroYaw)}, robotX = ${number(m.robotX)}, robotZ = ${number(m.robotZ)}, robotYaw = ${number(m.robotYaw)}, awareness = ${number(m.awareness)},`);
    push(`                        energy = ${m.energy}, sparks = ${m.sparks}, heroMode = ${m.heroMode}, trial = ${m.trial}, wave = ${m.wave}, modes = ${m.modes},`);
    push(`                        dadX = ${number(m.dadX)}, dadZ = ${number(m.dadZ)}, dadYaw = ${number(m.dadYaw)}, dadMode = ${m.dadMode}, oop = ${m.oop}, holds = ${number(m.holds)}, stunned = ${m.stunned}, diving = ${m.diving} },`);
  }
  push('                },');
  push('            },');
}
push('        };');
push('    }');
push('}');
const csharp = `${lines.join('\n')}\n`;

const dataPath = join(root, 'unity/SpaceDragon/Assets/SpaceDragon/Traversal/Core/LukeArenaData.cs');
const EVENT_NAMES = ['snare', 'pounce', 'impact', 'resolve', 'quiet', 'hit', 'bonk', 'revive', 'caught', 'release', 'spotted', 'wave', 'pickup', 'trial', 'bounce', 'star', 'toss', 'hang', 'dive', 'stun', 'zip'];
const summary = { sourceFingerprint, probes: probes.length, steps: probes.reduce((sum, probe) => sum + probe.steps, 0), marks: probes.reduce((sum, probe) => sum + probe.marks.length, 0),
  dataBytes: Buffer.byteLength(csharp),
  // Which rules the recorded runs actually reach, so thin coverage is visible when the level changes.
  eventsReached: EVENT_NAMES.filter((_name, index) => probes.some(probe => probe.events & (1 << index))),
  heroModes: HERO_MODES.filter((_mode, index) => probes.some(probe => probe.marks.some(item => item.heroMode === index))),
  sidekickModes: SIDEKICK_MODES.filter((_mode, index) => probes.some(probe => probe.marks.some(item => item.dadMode === index))),
  oopPhases: OOP_PHASES.filter((phase, index) => phase && probes.some(probe => probe.marks.some(item => item.oop === index))) };
if (verify) {
  const actual = await readFile(dataPath, 'utf8').catch(() => null);
  if (actual === null) { console.error(`${dataPath} is missing`); process.exit(1); }
  if (actual.replaceAll('\r\n', '\n') !== csharp) { console.error(`${dataPath} does not match the TypeScript source; run the exporter without --verify`); process.exit(1); }
  console.log(JSON.stringify({ verified: true, ...summary }));
} else {
  await writeFile(dataPath, csharp);
  console.log(JSON.stringify({ written: true, ...summary }));
}
