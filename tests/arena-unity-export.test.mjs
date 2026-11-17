import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const core = 'unity/SpaceDragon/Assets/SpaceDragon/Traversal/Core';
const run = (...parts) => execFileSync(process.execPath, ['--no-warnings', ...parts], { encoding: 'utf8' });
const { ARENA, ARENA_EVENT, ROBOT_PROFILES } = await import('../src/game/arena/arena.ts');
const { HERO_EVENT } = await import('../src/game/traversal/hero.ts');
const { TUNING } = await import('../src/game/traversal/tuning.ts');

// Unity plays Luke's Arena from generated C# and a hand-written port of the rules. Neither may
// drift from the TypeScript arena they came from.
test("committed Luke's Arena C# matches the TypeScript source and its recorded runs reach every rule", async () => {
  const result = JSON.parse(run('--experimental-strip-types', 'tools/unity/export-arena.mjs', '--verify').trim().split('\n').at(-1));
  assert.equal(result.verified, true);
  assert.ok(result.probes >= 16 && result.steps > 45_000 && result.marks > 380);
  assert.deepEqual(result.eventsReached, Object.keys(ARENA_EVENT), 'between them the recorded runs raise every arena event');
  for (const mode of ['ground', 'air', 'swing', 'climb']) assert.ok(result.heroModes.includes(mode), mode);
  assert.deepEqual(result.sidekickModes, ['follow', 'wait', 'ready', 'stun', 'toss', 'rest'], 'the sidekick is seen every way he can stand');
  assert.deepEqual(result.oopPhases, ['rise', 'hang', 'dive'], 'every phase of an alley-oop is seen');
  const data = await readFile(`${core}/LukeArenaData.cs`, 'utf8');
  assert.match(data, /auto-generated/);
  assert.ok(data.includes(`SourceFingerprint = "${result.sourceFingerprint}"`));
  for (const id of ['luke-arena-v001', 'course-tower-east', 'yard-catwalk-east', 'ring-anchor', 'yard-floodlight', 'ring-mower', 'vault', 'behind-crate-4', 'dad']) assert.ok(data.includes(`"${id}"`), id);
  assert.match(data, /sidekick = new SidekickSpec \{ id = "dad", [^}]*waits = new\[\] \{ new SidekickWait \{ trial = TrialId\.Stealth,/);
  // Every tunable number is written out, and nothing else is invented.
  for (const [name, value] of Object.entries(ARENA)) assert.match(data, new RegExp(`\\b${name} = ${String(value).replace('.', '\\.')}(\\.0)?,`), name);
  for (const [kind, profile] of Object.entries(ROBOT_PROFILES)) assert.match(data, new RegExp(`sparks = ${profile.sparks}, large = ${profile.large}, radius = [^}]+\\}, // ${kind}`), kind);
});

test('the hand-written C# names every event, mode and tuning value the TypeScript rules use', async () => {
  const types = await readFile(`${core}/ArenaTypes.cs`, 'utf8');
  const enumBody = name => types.match(new RegExp(`enum ${name}\\s*\\{([^}]*)\\}`))?.[1] ?? assert.fail(`${name} enum not found`);
  const flags = Object.fromEntries([...enumBody('ArenaEvent').matchAll(/(\w+) = (\d+)/g)].map(([, name, value]) => [name.toLowerCase(), Number(value)]));
  assert.deepEqual(flags, { none: 0, ...ARENA_EVENT });
  const names = name => enumBody(name).split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
  assert.deepEqual(names('RobotMode'), ['dormant', 'patrol', 'curious', 'alert', 'windup', 'strike', 'recover', 'search', 'resolved']);
  assert.deepEqual(names('RobotKind'), Object.keys(ROBOT_PROFILES));
  assert.deepEqual(names('TrialId'), ['none', 'course', 'ring', 'stealth']);
  assert.deepEqual(names('ActionKind'), ['none', 'snare', 'pounce', 'quiet']);
  assert.deepEqual(names('SidekickMode'), ['follow', 'wait', 'ready', 'stun', 'toss', 'rest']);
  assert.deepEqual(names('OopPhase'), ['none', 'rise', 'hang', 'dive']);
  assert.deepEqual(names('SidekickAsk'), ['none', 'oop', 'stun']);
  for (const name of Object.keys(ARENA)) assert.match(types, new RegExp(`\\b${name}\\b`), `ArenaRules has ${name}`);
  for (const name of Object.keys(ROBOT_PROFILES.iguana)) assert.match(types, new RegExp(`\\b${name}\\b`), `RobotProfile has ${name}`);

  const hero = await readFile(`${core}/HeroSimulation.cs`, 'utf8');
  const heroFlags = Object.fromEntries([...hero.match(/enum HeroEvent \{([^}]*)\}/)[1].matchAll(/(\w+) = (\d+)/g)].map(([, name, value]) => [name.toLowerCase(), Number(value)]));
  assert.deepEqual(heroFlags, { none: 0, ...HERO_EVENT });
  assert.match(hero, /enum HeroMode \{ Ground, Air, Swing, Catch, Climb \}/);
  const tuning = await readFile(`${core}/TraversalTuning.cs`, 'utf8');
  for (const [name, value] of Object.entries(TUNING)) assert.match(tuning, new RegExp(`\\b${name} = ${String(value).replace('.', '\\.').replace('-', '\\-')}\\b`), `${name} = ${value}`);

  // The port is the rules and nothing else: no engine, clock, storage or randomness.
  const rules = await readFile(`${core}/ArenaSimulation.cs`, 'utf8');
  const session = await readFile(`${core}/ArenaSession.cs`, 'utf8');
  for (const source of [rules, session, types]) assert.doesNotMatch(source, /UnityEngine|DateTime|Stopwatch|System\.Random|PlayerPrefs|File\./);
});

test('the Unity arena scene code is wired to the same save keys and entry points as its runner', async () => {
  const game = await readFile('unity/SpaceDragon/Assets/SpaceDragon/Playground/Runtime/ArenaGame.cs', 'utf8');
  assert.match(game, /SaveKey = "space-dragon\.arena\.v1"/);
  assert.match(game, /BackupKey = "space-dragon\.arena\.v1\.backup"/);
  assert.match(game, /if \(session\.ShouldSave\) SaveNow\(\);/, 'a reward is stored as soon as it is earned');
  const scene = await readFile('unity/SpaceDragon/Assets/SpaceDragon/Playground/Editor/LukeArenaScene.cs', 'utf8');
  const runner = await readFile('tools/unity/run-playground.ps1', 'utf8');
  for (const method of ['SetupArena', 'BuildArenaWindows', 'BuildArenaWeb']) {
    assert.match(scene, new RegExp(`public static void ${method}\\(`), method);
    assert.ok(runner.includes(`LukePlaygroundProject.${method}'`), `${method} is reachable from the runner`);
  }
  for (const receipt of ['Builds/arena-setup-receipt.json', 'Builds/Arena/Windows/build-receipt.json', 'Builds/Arena/Web/build-receipt.json']) assert.ok(runner.includes(receipt), receipt);
  assert.ok(scene.includes('"Builds/arena-setup-receipt.json"'));
  const scripts = JSON.parse(await readFile('package.json', 'utf8')).scripts;
  for (const name of ['export', 'verify', 'setup', 'windows', 'web', 'play']) assert.ok(scripts[`unity:arena:${name}`], `unity:arena:${name}`);
  assert.match(run('tools/unity/ensure-metas.mjs', 'Playground', 'Traversal', '--check'), /UNITY_METAS_COMPLETE/);
});
