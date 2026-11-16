import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ARENA, ARENA_EVENT, ARENA_IDLE, ARENA_LAYOUT, ROBOT_PROFILES, actionFor,
  canSee, createArena, emptyProgress, isArenaProgress, isVulnerable, mergeProgress, pickTarget, quietOpening, sightLine, stepArena,
} from '../src/game/arena/arena.ts';
import type { ArenaInput, ArenaLayout, ArenaState, RobotState } from '../src/game/arena/arena.ts';
import { BLOCKS, CLIMBS, HIDE_SPOTS, LUKE_ARENA, PICKUPS, ROBOTS, ZONES, zoneAt } from '../src/game/arena/arena-world.ts';
import type { RobotKind, RobotSpec, TrialId } from '../src/game/arena/arena-world.ts';
import { createHero } from '../src/game/traversal/hero.ts';
import type { HeroState } from '../src/game/traversal/hero.ts';
import { TRAVERSAL_STEP } from '../src/game/traversal/tuning.ts';
import type { TraversalWorld } from '../src/game/traversal/world.ts';
import { penetration } from './helpers/traversal.ts';

const STEP = TRAVERSAL_STEP;
const steps = (seconds: number) => Math.round(seconds / STEP);

/** A flat test yard with one crate for cover and one tall block to stand on. */
const YARD: TraversalWorld = {
  id: 'arena-test', bounds: { minX: -30, maxX: 30, minZ: -30, maxZ: 30 },
  solids: [
    { id: 'crate', kind: 'block', minX: -1, maxX: 1, minZ: 4, maxZ: 5, minY: 0, maxY: 1.3 },
    { id: 'perch', kind: 'block', minX: 8, maxX: 10, minZ: 8, maxZ: 10, minY: 0, maxY: 3 },
    { id: 'wall', kind: 'block', minX: -12, maxX: -11, minZ: -10, maxZ: 10, minY: 0, maxY: 4 },
  ],
  anchors: [], water: [], sparks: [], recoveries: [], spawn: { x: 0, z: 0, yaw: 0 },
};
const spec = (id: string, kind: RobotKind, x: number, z: number, yaw: number, extra: Partial<RobotSpec> = {}): RobotSpec =>
  ({ id, kind, trial: 'stealth', wave: 0, x, z, yaw, patrol: [], sweepFrom: yaw, sweepTo: yaw, sweepRate: 0, ...extra });
function yard(robots: RobotSpec[], trial: TrialId = 'stealth'): ArenaLayout {
  return {
    world: YARD, robots: robots.map(robot => ({ ...robot, trial })), waves: Math.max(0, ...robots.map(robot => robot.wave)),
    pickups: [{ id: 'vault', trial: 'stealth', x: 20, y: 1.2, z: 20 }],
    zones: [{ id: trial, minX: -30, maxX: 30, minZ: -30, maxZ: 30 }],
    hides: [{ id: 'start', x: 0, z: -8, yaw: 0 }],
  };
}
const place = (state: ArenaState, layout: ArenaLayout, pose: { x: number; z: number; yaw: number; y?: number }): ArenaState => ({ ...state, hero: createHero(layout.world, pose) });
function run(state: ArenaState, layout: ArenaLayout, seconds: number, input: Partial<ArenaInput> = {}, visit?: (state: ArenaState) => void): ArenaState {
  const held = { ...ARENA_IDLE, ...input };
  for (let index = 0; index < steps(seconds); index++) { state = stepArena(state, held, STEP, layout); visit?.(state); }
  return state;
}
/** One press: down for a step, then up. */
function tap(state: ArenaState, layout: ArenaLayout, input: Partial<ArenaInput>): ArenaState {
  state = stepArena(state, { ...ARENA_IDLE, ...input }, STEP, layout);
  return stepArena(state, ARENA_IDLE, STEP, layout);
}
const robotOf = (state: ArenaState, id: string): RobotState => state.robots.find(robot => robot.id === id)!;
const settle = (state: ArenaState, layout: ArenaLayout) => stepArena(state, ARENA_IDLE, STEP, layout);

test("Luke's Arena is well formed: unique ids, robots and hiding places in clear space, marked faces on real walls", () => {
  for (const list of [BLOCKS, CLIMBS, ROBOTS, PICKUPS, HIDE_SPOTS, LUKE_ARENA.anchors]) assert.equal(new Set(list.map(item => item.id)).size, list.length);
  assert.deepEqual(ZONES.map(zone => zone.id), ['course', 'ring', 'stealth']);
  assert.equal(zoneAt(LUKE_ARENA.spawn.x, LUKE_ARENA.spawn.z), '', 'the hub belongs to no trial');
  for (const robot of ROBOTS) {
    assert.equal(zoneAt(robot.x, robot.z), robot.trial, `${robot.id} starts in its own zone`);
    const body = { ...createHero(LUKE_ARENA, { x: robot.x, z: robot.z, yaw: 0 }) };
    assert.equal(body.y, 0, `${robot.id} stands on the ground`);
    assert.ok(penetration(body, LUKE_ARENA).depth === 0, `${robot.id} is clear of solids`);
    for (const point of robot.patrol) assert.equal(zoneAt(point.x, point.z), robot.trial, `${robot.id} patrols inside its zone`);
    assert.ok(ROBOT_PROFILES[robot.kind].windup === 0 || ROBOT_PROFILES[robot.kind].windup >= 1, 'every telegraph lasts at least a second');
  }
  for (const face of CLIMBS) {
    const wall = BLOCKS.find(block => (face.axis === 'x' ? (face.facing > 0 ? block.maxX : block.minX) : (face.facing > 0 ? block.maxZ : block.minZ)) === face.at &&
      (face.axis === 'x' ? face.min >= block.minZ && face.max <= block.maxZ : face.min >= block.minX && face.max <= block.maxX) && block.top === face.maxY);
    assert.ok(wall, `${face.id} lies on a block face and ends at its top`);
  }
  const fresh = createArena();
  for (const hide of HIDE_SPOTS) {
    assert.equal(zoneAt(hide.x, hide.z), 'stealth');
    const hero = createHero(LUKE_ARENA, hide);
    assert.equal(penetration(hero, LUKE_ARENA).depth, 0);
    for (const robot of fresh.robots.filter(candidate => candidate.mode === 'patrol')) assert.equal(canSee(LUKE_ARENA, robot, hero), false, `${hide.id} starts hidden from ${robot.id}`);
  }
  assert.equal(fresh.energy, ARENA.energyMax);
  assert.ok(fresh.robots.filter(robot => robot.mode === 'dormant').length === ROBOTS.filter(robot => robot.trial === 'ring').length, 'ring robots wait for their wave');
});

test('a robot sees Luke only in range, inside its cone, below its eye line and with no cover between', () => {
  const layout = yard([spec('guard', 'iguana', 0, 0, 0)]);
  const guard = createArena(layout).robots[0];
  const at = (x: number, z: number, y?: number): HeroState => ({ ...createHero(YARD, { x, z, yaw: 0, y }) });
  assert.equal(canSee(YARD, guard, at(0, 3)), true, 'straight ahead');
  assert.equal(canSee(YARD, guard, at(0, 9.5)), false, 'beyond range');
  assert.equal(canSee(YARD, guard, at(4, 0.5)), false, 'off to the side, outside the cone');
  assert.equal(canSee(YARD, guard, at(0, -3)), false, 'behind');
  assert.equal(canSee(YARD, guard, at(0, -0.8)), true, 'close enough to bump is noticed from any side');
  assert.equal(canSee(YARD, guard, at(0, 6)), false, 'behind the crate');
  assert.equal(canSee(YARD, guard, at(0, 8.5)), false, 'the crate still shadows a little farther back');
  const high = { ...at(1.6, 3), y: 2.2 };
  assert.equal(canSee(YARD, guard, high), false, 'ground robots do not look up');
  assert.equal(canSee(YARD, guard, { ...high, y: 1.5 }), true);
  // A drone senses all round and from above.
  const drone = createArena(yard([spec('bug', 'drone', 0, 0, 0)])).robots[0];
  assert.equal(canSee(YARD, drone, at(0, -3)), true);
  assert.equal(canSee(YARD, drone, at(0, -9)), false);
  assert.equal(sightLine(YARD, 0, 0.5, 0, 0, 0.9, 6), false);
  assert.equal(sightLine(YARD, 3, 0.5, 0, 3, 0.9, 6), true);
});

/** An open strip of the test yard, clear of the crate, the perch and the wall. */
const LANE = -6;
/** Place Luke and take one step so the trial is entered before a test arranges its robots. */
const begin = (layout: ArenaLayout, pose: { x: number; z: number; yaw: number; y?: number }, progress = emptyProgress()) =>
  settle(place(createArena(layout, progress), layout, pose), layout);
const alerted = (state: ArenaState): ArenaState =>
  ({ ...state, robots: state.robots.map(robot => ({ ...robot, mode: 'alert', awareness: 1, lastSeenX: state.hero.x, lastSeenZ: state.hero.z })) });

test('awareness builds faster up close, fades in cover, and the gaze moves on', () => {
  const layout = yard([spec('guard', 'iguana', 0, 0, 0)]);
  // Far away in the open: noticed slowly.
  let far = run(begin(layout, { x: 0, z: 3.4, yaw: 0 }), layout, 0.15);
  const near = run(begin(layout, { x: 0, z: 1.5, yaw: 0 }), layout, 0.15);
  assert.ok(robotOf(near, 'guard').awareness > robotOf(far, 'guard').awareness * 1.15, 'closer is noticed sooner');
  assert.ok(robotOf(far, 'guard').awareness > 0 && robotOf(far, 'guard').awareness < ARENA.unaware, `a glance: ${robotOf(far, 'guard').awareness}`);
  assert.equal(robotOf(far, 'guard').mode, 'patrol');
  // Keep standing there: curious first, then alert, with a spotted event exactly once.
  let spotted = 0;
  const modes: string[] = [];
  far = run(far, layout, 3, {}, state => { if (state.events & ARENA_EVENT.spotted) spotted++; modes.push(robotOf(state, 'guard').mode); });
  assert.ok(modes.includes('curious'), 'curious before alert');
  assert.ok(modes.indexOf('curious') < modes.indexOf('alert'), 'in that order');
  assert.equal(spotted, 1);
  assert.equal(far.seen, true);
  // Break the line of sight: a glimpse fades back to patrol without ever raising the alarm.
  let glimpse = run(begin(layout, { x: 0, z: 3.4, yaw: 0 }), layout, 0.3);
  assert.ok(robotOf(glimpse, 'guard').awareness >= ARENA.unaware && robotOf(glimpse, 'guard').awareness < 1);
  glimpse = run(place(glimpse, layout, { x: 0, z: 6, yaw: 0 }), layout, 6);
  assert.equal(robotOf(glimpse, 'guard').mode, 'patrol');
  assert.equal(robotOf(glimpse, 'guard').awareness, 0);
  assert.equal(glimpse.seen, false, 'a curious look is not being seen');
});

test('sprinting close by turns heads; walking does not', () => {
  const layout = yard([spec('guard', 'iguana', LANE, 0, 0)]);
  // Behind the guard, crossing left to right.
  const walk = run(begin(layout, { x: LANE - 5, z: -3.5, yaw: Math.PI / 2 }), layout, 1.4, { moveX: 1 });
  assert.equal(robotOf(walk, 'guard').mode, 'patrol');
  assert.equal(robotOf(walk, 'guard').awareness, 0);
  let heard = false;
  run(begin(layout, { x: LANE - 5, z: -3.5, yaw: Math.PI / 2 }), layout, 1.4, { moveX: 1, power: true }, state => { heard ||= robotOf(state, 'guard').mode === 'curious'; });
  assert.ok(heard, 'the sprint was heard');
});

test('Tether Snare holds a robot, takes one spark, finishes a drone and has a short cooldown', () => {
  const layout = yard([spec('guard', 'iguana', LANE, 5.5, Math.PI), spec('bug', 'drone', LANE + 9, 4, 0)]);
  let state = begin(layout, { x: LANE, z: 0, yaw: 0 });
  assert.equal(state.targetId, 'guard', 'the robot ahead is offered');
  // The guard is facing Luke; make it properly alert so this is a fight, not an ambush. The drone stays unaware.
  state = { ...state, robots: state.robots.map(robot => robot.id === 'guard' ? { ...robot, mode: 'alert', awareness: 1, lastSeenX: LANE, lastSeenZ: 0 } : robot) };
  const before = { x: robotOf(state, 'guard').x, z: robotOf(state, 'guard').z };
  state = tap(state, layout, { action: true });
  const guard = robotOf(state, 'guard');
  assert.ok(guard.hold > ARENA.snareSeconds - 0.1 && guard.tethered);
  assert.equal(guard.sparks, 1);
  assert.equal(state.snareId, 'guard');
  assert.ok(state.snareCooldown > 0);
  // Held means held: no movement, no wind-up, no strike, for the whole hold.
  let acted = false;
  state = run(state, layout, ARENA.snareSeconds - 0.3, {}, next => {
    const robot = robotOf(next, 'guard');
    acted ||= robot.mode === 'windup' || robot.mode === 'strike' || Math.hypot(robot.x - before.x, robot.z - before.z) > 1e-9;
  });
  assert.equal(acted, false);
  assert.equal(state.energy, ARENA.energyMax);
  // A second press while it is held and the snare is ready pounces rather than snaring again.
  assert.equal(robotOf(state, 'guard').sparks, 1);
  // A drone is a swarm robot: one action resolves it.
  let bug = begin(layout, { x: LANE + 9, z: 0, yaw: 0 });
  assert.equal(bug.targetId, 'bug');
  bug = alerted(bug);
  bug = tap(bug, layout, { action: true });
  assert.equal(robotOf(bug, 'bug').mode, 'resolved');
  assert.ok(bug.snareCooldown > 0);
  // The line snaps if Luke runs too far away.
  let snap = tap(alerted(begin(layout, { x: LANE, z: 0, yaw: 0 })), layout, { action: true });
  assert.equal(snap.snareId, 'guard');
  snap = run(snap, layout, 1.6, { moveZ: -1, power: true });
  assert.equal(snap.snareId, '');
  assert.equal(robotOf(snap, 'guard').hold, 0);
});

test('a pounce from hiding is a quiet takedown; on an alert robot it takes a spark and pins', () => {
  // The guard faces away; a second guard stands near, also facing away.
  const layout = yard([spec('guard', 'iguana', LANE, 5, 0), spec('other', 'iguana', LANE + 3, 7.5, 0)]);
  let state = begin(layout, { x: LANE, z: 0, yaw: 0 });
  assert.equal(robotOf(state, 'guard').awareness, 0);
  assert.equal(quietOpening(YARD, robotOf(state, 'guard'), state.hero), true);
  assert.equal(state.targetQuiet, true, 'the opening is offered');
  let events = 0;
  state = stepArena(state, { ...ARENA_IDLE, action: true }, STEP, layout);
  assert.equal(state.pounceId, 'guard', 'the one-button action chooses the pounce');
  state = run(state, layout, 1, {}, next => { events |= next.events; });
  assert.equal(robotOf(state, 'guard').mode, 'resolved');
  assert.ok(events & ARENA_EVENT.quiet && events & ARENA_EVENT.resolve && events & ARENA_EVENT.bounce);
  assert.equal(state.progress.quiet, 1);
  assert.equal(robotOf(state, 'other').awareness, 0, 'a quiet takedown is not heard');
  assert.equal(state.seen, false);
  assert.equal(state.hero.hopAvailable, true);

  // Walking up to its face is not stealth, however early the button is pressed: the robot can see Luke,
  // so the one button snares instead, and a forced pounce is loud.
  const facing = yard([spec('guard', 'iguana', LANE, 5, Math.PI)]);
  let front = begin(facing, { x: LANE, z: 0, yaw: 0 });
  assert.ok(robotOf(front, 'guard').awareness < ARENA.unaware, 'not yet noticed');
  assert.equal(quietOpening(YARD, robotOf(front, 'guard'), front.hero), false);
  assert.equal(front.targetQuiet, false);
  const snared = stepArena(front, { ...ARENA_IDLE, action: true }, STEP, facing);
  assert.equal(snared.pounceId, '');
  assert.ok(snared.events & ARENA_EVENT.snare && snared.events & ARENA_EVENT.spotted);
  assert.equal(snared.seen, true);
  front = stepArena(front, { ...ARENA_IDLE, pounce: true }, STEP, facing);
  assert.equal(front.pounceId, 'guard');
  assert.equal(front.pounceQuiet, false);
  let frontEvents = 0;
  front = run(front, facing, 1, {}, next => { frontEvents |= next.events; });
  assert.equal(frontEvents & ARENA_EVENT.quiet, 0);
  assert.ok(frontEvents & ARENA_EVENT.spotted);
  assert.equal(robotOf(front, 'guard').sparks, 1);
  assert.equal(front.progress.quiet, 0);
  assert.equal(front.seen, true);
  // From above is as good as from behind: ground robots do not look up.
  const above = yard([spec('guard', 'iguana', 9, 5.5, 0)]);
  let drop = begin(above, { x: 9, z: 9, yaw: Math.PI, y: 3 });
  assert.equal(drop.hero.y, 3);
  assert.equal(drop.targetId, 'guard');
  assert.equal(drop.targetQuiet, true);
  drop = run(stepArena(drop, { ...ARENA_IDLE, action: true }, STEP, above), above, 1);
  assert.equal(robotOf(drop, 'guard').mode, 'resolved');
  assert.equal(drop.progress.quiet, 1);
  assert.equal(drop.seen, false);

  // Head-on, the guard has noticed: the pounce costs one spark and pins it briefly instead.
  let fight = alerted(begin(facing, { x: LANE, z: 0, yaw: 0 }));
  fight = stepArena(fight, { ...ARENA_IDLE, pounce: true }, STEP, facing);
  assert.equal(fight.pounceId, 'guard');
  let landed = 0;
  fight = run(fight, facing, 0.8, {}, next => { if (next.events & ARENA_EVENT.impact) landed++; });
  assert.equal(landed, 1);
  assert.equal(robotOf(fight, 'guard').sparks, 1);
  assert.ok(robotOf(fight, 'guard').hold > 0 && !robotOf(fight, 'guard').tethered, 'pinned, not tethered');
  // Snare then pounce is the standard finish for a two-spark robot.
  let combo = tap(alerted(begin(facing, { x: LANE, z: 0, yaw: 0 })), facing, { action: true });
  assert.equal(robotOf(combo, 'guard').sparks, 1);
  combo = stepArena(combo, { ...ARENA_IDLE, action: true }, STEP, facing);
  assert.equal(combo.pounceId, 'guard', 'the held robot is now worth pouncing');
  combo = run(combo, facing, 1);
  assert.equal(robotOf(combo, 'guard').mode, 'resolved');
  assert.equal(combo.progress.quiet, 0);
});

test('a pounce follows a moving robot and always lands; a mow-bot is a springboard', () => {
  const layout = yard([spec('runner', 'iguana', LANE - 3, 6, Math.PI / 2, { patrol: [{ x: LANE + 3, z: 6, wait: 0 }, { x: LANE - 3, z: 6, wait: 0 }] })]);
  // Luke waits behind the patrol line, so the runner never looks his way.
  let state = run(begin(layout, { x: LANE, z: 11, yaw: Math.PI }), layout, 1.5);
  const target = robotOf(state, 'runner');
  assert.equal(target.mode, 'patrol');
  assert.equal(target.awareness, 0);
  state = stepArena(state, { ...ARENA_IDLE, pounce: true, aimX: target.x - state.hero.x, aimZ: target.z - state.hero.z }, STEP, layout);
  assert.equal(state.pounceId, 'runner');
  const landing: { hero: HeroState; robot: RobotState }[] = [];
  state = run(state, layout, 1, {}, next => { if (next.events & ARENA_EVENT.impact) landing.push({ hero: next.hero, robot: robotOf(next, 'runner') }); });
  assert.equal(landing.length, 1, 'landed once');
  assert.ok(Math.hypot(landing[0].hero.x - landing[0].robot.x, landing[0].hero.z - landing[0].robot.z) < 0.05, 'landed on the robot where it had moved to');
  assert.ok(Math.abs(landing[0].robot.x - target.x) > 0.3, 'the robot really had moved on');
  assert.equal(landing[0].robot.mode, 'resolved');

  const big = yard([spec('mower', 'mower', LANE, 6, Math.PI)]);
  let ride = alerted(begin(big, { x: LANE, z: 0, yaw: 0 }));
  assert.equal(isVulnerable(robotOf(ride, 'mower')), false);
  ride = stepArena(ride, { ...ARENA_IDLE, pounce: true }, STEP, big);
  assert.equal(ride.pounceId, 'mower');
  let bounced = false;
  let peak = 0;
  ride = run(ride, big, 0.9, {}, next => { bounced ||= (next.events & ARENA_EVENT.bounce) !== 0; if (bounced) peak = Math.max(peak, next.hero.y); });
  assert.ok(bounced, 'bounced');
  assert.equal(robotOf(ride, 'mower').sparks, 2, 'an alert mow-bot shrugs off the pounce');
  assert.ok(peak > ROBOT_PROFILES.mower.height + 0.8, `Luke springs off it: ${peak}`);
});

test('every attack is announced: a wind-up of at least a second, then a strike that a sidestep avoids', () => {
  const layout = yard([spec('guard', 'iguana', LANE, 6, Math.PI)], 'ring');
  let state = alerted(begin(layout, { x: LANE, z: 0, yaw: 0 }));
  let windup = 0, struck = false, firstStrike = -1, time = 0;
  // Stand still: the lunge connects after a full telegraph.
  state = run(state, layout, 6, {}, next => {
    time += STEP;
    const mode = robotOf(next, 'guard').mode;
    if (mode === 'windup' && firstStrike < 0) windup += STEP;
    if (mode === 'strike' && firstStrike < 0) firstStrike = time;
    struck ||= (next.events & ARENA_EVENT.hit) !== 0;
  });
  assert.ok(windup >= 1 - 2 * STEP, `telegraph lasted ${windup}`);
  assert.ok(struck, 'standing still gets bonked on the nose');
  assert.ok(state.energy < ARENA.energyMax);

  // Step aside once the robot commits and the lunge misses, every time.
  let dodge = alerted(begin(layout, { x: LANE, z: 0, yaw: 0 }));
  let hits = 0, lunges = 0, wasStriking = false;
  for (let index = 0; index < steps(9); index++) {
    const guard = robotOf(dodge, 'guard');
    const committed = guard.mode === 'windup' && guard.timer <= ROBOT_PROFILES.iguana.windup * 0.4;
    dodge = stepArena(dodge, { ...ARENA_IDLE, moveX: committed || guard.mode === 'strike' ? 1 : 0 }, STEP, layout);
    if (dodge.events & ARENA_EVENT.hit) hits++;
    const striking = robotOf(dodge, 'guard').mode === 'strike';
    if (striking && !wasStriking) lunges++;
    wasStriking = striking;
  }
  assert.ok(lunges >= 2, `it kept trying: ${lunges}`);
  assert.equal(hits, 0, 'a sidestep after the commit avoids every lunge');
  assert.equal(dodge.energy, ARENA.energyMax);
});

test('a mow-bot charges in a straight line, stalls on a wall, and standing high keeps Luke out of reach', () => {
  const layout = yard([spec('mower', 'mower', -4, -6, -Math.PI / 2)], 'ring');
  // Luke stands in front of the west wall; the mower faces him.
  let state = alerted(begin(layout, { x: -10, z: -6, yaw: Math.PI / 2 }));
  const path: number[] = [];
  let stalled = 0, charging = false;
  for (let index = 0; index < steps(6); index++) {
    const mower = robotOf(state, 'mower');
    // Walk out of the lane once it commits.
    const committed = (mower.mode === 'windup' && mower.timer <= ROBOT_PROFILES.mower.windup * 0.4) || mower.mode === 'strike';
    state = stepArena(state, { ...ARENA_IDLE, moveZ: committed && !charging ? 1 : committed ? 1 : 0 }, STEP, layout);
    const now = robotOf(state, 'mower');
    if (now.mode === 'strike') { charging = true; path.push(now.z); }
    if (charging && now.mode === 'recover') stalled = Math.max(stalled, now.timer);
  }
  assert.ok(charging, 'it charged');
  assert.ok(path.every(z => Math.abs(z - path[0]) < 1e-9), 'the charge never curves');
  assert.ok(stalled > ROBOT_PROFILES.mower.recover, `stalled against the wall for ${stalled}`);
  assert.equal(state.energy, ARENA.energyMax, 'walking aside cleared the charge');

  // On top of the tall block Luke cannot be seen or hit by ground robots.
  const perch = yard([spec('guard', 'iguana', 9, 4, 0)], 'ring');
  let safe = alerted(begin(perch, { x: 9, z: 9, yaw: 0, y: 3 }));
  let hit = false;
  safe = run(safe, perch, 13, {}, next => { hit ||= (next.events & ARENA_EVENT.hit) !== 0; });
  assert.equal(hit, false);
  assert.equal(safe.hero.y, 3);
  assert.equal(robotOf(safe, 'guard').mode, 'patrol', 'it gave up and went back');
});

test('bonked, never beaten: energy runs out, robots leave Luke alone, everything won is kept', () => {
  const layout = yard([spec('a', 'iguana', LANE, 3, Math.PI), spec('b', 'iguana', LANE + 1.5, 3, Math.PI)], 'ring');
  let state = begin(layout, { x: LANE, z: 0, yaw: 0 }, { ...emptyProgress(), course: ['course-1'], ringBest: 2 });
  state = alerted(state);
  state = { ...state, robots: state.robots.map((robot, index) => ({ ...robot, sparks: index === 0 ? 1 : 2 })) };
  let bonkAt = -1, hitsWhileBonked = 0, minGap = Infinity, lastHit = -Infinity, time = 0, revived = false, awareWhileBonked = 0;
  state = run(state, layout, 60, {}, next => {
    time += STEP;
    if (next.events & ARENA_EVENT.hit) { minGap = Math.min(minGap, time - lastHit); lastHit = time; if (next.bonk > 0 && !(next.events & ARENA_EVENT.bonk)) hitsWhileBonked++; }
    if (next.events & ARENA_EVENT.bonk && bonkAt < 0) bonkAt = time;
    if (next.bonk > 0 && next.bonk < ARENA.bonkSeconds - 0.8) awareWhileBonked = Math.max(awareWhileBonked, ...next.robots.map(robot => robot.awareness));
    revived ||= (next.events & ARENA_EVENT.revive) !== 0;
  });
  assert.ok(bonkAt > 0, 'standing still in a fight eventually bonks');
  assert.equal(hitsWhileBonked, 0, 'robots never target a bonked hero');
  assert.ok(minGap >= ARENA.mercy - STEP, `hits are spaced by the mercy window: ${minGap}`);
  assert.ok(awareWhileBonked < 0.25, `they lose interest: ${awareWhileBonked}`);
  assert.ok(revived, 'back on his feet');
  assert.ok(state.energy > 0);
  assert.deepEqual(state.progress.course, ['course-1']);
  assert.equal(state.progress.ringBest, 2);
  assert.equal(robotOf(state, 'a').sparks, 1, 'a spark already removed stays removed');
  assert.ok(Number.isFinite(state.hero.x) && penetration(state.hero, YARD).depth < 0.02);
});

test('the floodlight catches, holds for a moment and sets Luke back in hiding with nothing lost', () => {
  const layout = yard([spec('light', 'sentry', LANE, 0, 0)]);
  // Stand in the beam.
  let state = begin(layout, { x: LANE, z: 6, yaw: 0 }, { ...emptyProgress(), quiet: 3 });
  let caught = 0, released = 0, movedWhileHeld = 0, time = 0, caughtAt = -1, releasedAt = -1;
  let heldAt: HeroState | null = null;
  state = run(state, layout, 6, { moveX: 0 }, next => {
    time += STEP;
    if (next.events & ARENA_EVENT.caught) { caught++; heldAt = next.hero; caughtAt = time; }
    if (next.events & ARENA_EVENT.release) { released++; releasedAt = time; }
  });
  assert.equal(caught, 1, 'caught once');
  assert.equal(released, 1);
  assert.ok(Math.abs(releasedAt - caughtAt - ARENA.holdSeconds) < 2 * STEP, 'held for a moment, no longer');
  assert.equal(state.seen, true);
  assert.equal(state.energy, ARENA.energyMax, 'being caught costs no energy');
  assert.equal(state.progress.quiet, 3);
  assert.ok(Math.hypot(state.hero.x - 0, state.hero.z - -8) < 1e-9, 'set down at the hiding place');
  // While held, pushing the stick does nothing.
  let stuck = begin(layout, { x: LANE, z: 6, yaw: 0 });
  for (let index = 0; index < steps(4) && stuck.held <= 0; index++) stuck = stepArena(stuck, ARENA_IDLE, STEP, layout);
  assert.ok(stuck.held > 0);
  heldAt = stuck.hero;
  for (let index = 0; index < steps(ARENA.holdSeconds - 0.1); index++) {
    stuck = stepArena(stuck, { ...ARENA_IDLE, moveX: 1, jump: true, action: true }, STEP, layout);
    movedWhileHeld = Math.max(movedWhileHeld, Math.hypot(stuck.hero.x - (heldAt as HeroState).x, stuck.hero.z - (heldAt as HeroState).z));
  }
  assert.ok(movedWhileHeld < 1e-9, 'held still');
  // The light can be switched off from behind: a quiet pounce.
  let sneak = begin(layout, { x: LANE, z: -5, yaw: 0 });
  sneak = stepArena(sneak, { ...ARENA_IDLE, action: true }, STEP, layout);
  assert.equal(sneak.pounceId, 'light');
  sneak = run(sneak, layout, 1);
  assert.equal(robotOf(sneak, 'light').mode, 'resolved');
  assert.equal(sneak.seen, false);
  assert.equal(sneak.progress.quiet, 1);
});

test('held and bonked heroes ignore input; the step is pure and repeatable', () => {
  const layout = yard([spec('guard', 'iguana', 0, 6, Math.PI)]);
  const start = run(begin(layout, { x: 0, z: -4, yaw: 0 }), layout, 0.7, { moveX: 0.4, moveZ: 0.6 });
  const frozen = JSON.stringify(start);
  const input: ArenaInput = { moveX: 1, moveZ: -1, jump: true, power: true, action: true, pounce: false, aimX: 0, aimZ: 1 };
  const once = stepArena(start, input, STEP, layout);
  const twice = stepArena(start, input, STEP, layout);
  assert.equal(JSON.stringify(start), frozen, 'input state untouched');
  assert.deepEqual(once, twice);
  assert.equal(stepArena(start, input, 0, layout), start);
  assert.equal(stepArena(start, input, Number.NaN, layout), start);
  const held = { ...start, held: 1 };
  const after = run(held, layout, 0.5, { moveX: 1, jump: true, action: true });
  assert.ok(Math.hypot(after.hero.x - start.hero.x, after.hero.z - start.hero.z) < 1e-9);
  assert.equal(after.pounceId, '');
  const dizzy = run({ ...start, bonk: 1 }, layout, 0.5, { moveX: 1, action: true });
  assert.ok(Math.abs(dizzy.hero.x - start.hero.x) < 0.2, 'only leftover momentum, no steering');
  assert.equal(dizzy.snareCooldown, 0);
});

test('target choice follows the aim, needs a clear line and prefers an easy finish', () => {
  const layout = yard([spec('left', 'iguana', -4, 4, Math.PI), spec('right', 'iguana', 4, 4, Math.PI), spec('hidden', 'iguana', 0, 7, Math.PI)]);
  const state = begin(layout, { x: 0, z: 0, yaw: 0 });
  assert.equal(pickTarget(layout, state, -1, 1), 'left');
  assert.equal(pickTarget(layout, state, 1, 1), 'right');
  assert.equal(pickTarget(layout, { ...state, robots: state.robots.filter(robot => robot.id === 'hidden') }, 0, 1), '', 'no target through the crate');
  const far = begin(layout, { x: 0, z: -9, yaw: 0 });
  assert.equal(pickTarget(layout, far, 0, 1), '', 'out of range');
  // Of two robots equally placed, the held one is the better target.
  const held = { ...state, robots: state.robots.map(robot => robot.id === 'right' ? { ...robot, hold: 2, awareness: 1 } : { ...robot, awareness: 1 }) };
  assert.equal(pickTarget(layout, held, 0, 1), 'right');
});

test('progress only ever accumulates and merges in level order', () => {
  const a = { ...emptyProgress(), course: ['course-4', 'course-1'], ringBest: 2, quiet: 1, stealthStars: 3 };
  const b = { ...emptyProgress(), course: ['course-2', 'course-1', 'not-a-spark'], ringStars: 2, ringBest: 3, stealthStars: 1, quiet: 4 };
  const merged = mergeProgress(ARENA_LAYOUT, a, b);
  assert.deepEqual(merged.course, ['course-1', 'course-2', 'course-4']);
  assert.deepEqual({ ...merged, course: [] }, { ...emptyProgress(), ringStars: 2, ringBest: 3, stealthStars: 3, quiet: 4 });
  assert.deepEqual(mergeProgress(ARENA_LAYOUT, merged, merged), merged);
  assert.deepEqual(mergeProgress(ARENA_LAYOUT, emptyProgress(), a).course, ['course-1', 'course-4']);
  // The fastest lap wins, and no lap never beats a real one.
  const all = ['course-1', 'course-2', 'course-3', 'course-4', 'course-5'];
  const slow = { ...emptyProgress(), course: all, courseStars: 2, courseBest: 61.5 };
  const fast = { ...emptyProgress(), course: all, courseStars: 3, courseBest: 33.25 };
  assert.equal(mergeProgress(ARENA_LAYOUT, slow, fast).courseBest, 33.25);
  assert.equal(mergeProgress(ARENA_LAYOUT, fast, slow).courseStars, 3);
  assert.equal(mergeProgress(ARENA_LAYOUT, emptyProgress(), slow).courseBest, 61.5);
  assert.equal(mergeProgress(ARENA_LAYOUT, slow, emptyProgress()).courseBest, 61.5);

  // Only progress this arena could have produced is accepted back from storage.
  for (const good of [emptyProgress(), merged, slow, fast, { ...emptyProgress(), ringStars: 1, ringBest: 3 }, { ...emptyProgress(), course: all, courseStars: 1 }]) {
    assert.equal(isArenaProgress(ARENA_LAYOUT, good), true, JSON.stringify(good));
  }
  const bad: unknown[] = [null, 4, [], {}, a, b, { ...emptyProgress(), course: ['course-2', 'course-1'] }, { ...emptyProgress(), course: ['course-1', 'course-1'] },
    { ...emptyProgress(), courseStars: 1 }, { ...emptyProgress(), course: all }, { ...emptyProgress(), courseBest: 20 }, { ...slow, courseBest: 0 }, { ...fast, courseBest: 50 },
    { ...slow, courseBest: Number.NaN }, { ...slow, courseBest: -1 }, { ...emptyProgress(), ringStars: 4, ringBest: 3 }, { ...emptyProgress(), ringStars: 1 }, { ...emptyProgress(), ringBest: 3 },
    { ...emptyProgress(), ringBest: 1.5 }, { ...emptyProgress(), stealthStars: -1 }, { ...emptyProgress(), stealthStars: '3' }, { ...emptyProgress(), quiet: 2.5 }, { ...emptyProgress(), quiet: -1 },
    { ...emptyProgress(), course: 'course-1' }];
  for (const value of bad) assert.equal(isArenaProgress(ARENA_LAYOUT, value), false, JSON.stringify(value));
});

// ---------- The real arena, end to end ----------
interface Leg { x: number; z: number; r?: number; y?: number; ground?: boolean; power?: boolean; jump?: number; until?: (state: ArenaState) => boolean; }
interface Drive { state: ArenaState; reached: boolean; index: number; seconds: number; events: number; caught: number; spotted: number; hits: number; modes: Set<string>; tethers: Set<string>; worst: number; }
/** Steer Luke through waypoints with the move keys only, pressing jump or holding suit power where a leg asks. */
function drive(state: ArenaState, route: Leg[], seconds: number, layout: ArenaLayout = ARENA_LAYOUT): Drive {
  const out: Drive = { state, reached: false, index: 0, seconds: 0, events: 0, caught: 0, spotted: 0, hits: 0, modes: new Set(), tethers: new Set(), worst: 0 };
  for (let step = 0; step < steps(seconds) && out.index < route.length; step++) {
    const leg = route[out.index];
    const hero = out.state.hero;
    const dx = leg.x - hero.x, dz = leg.z - hero.z, distance = Math.hypot(dx, dz);
    const arrived = leg.until ? leg.until(out.state) : distance < (leg.r ?? 0.6) && (leg.y === undefined || Math.abs(hero.y - leg.y) < 0.3) && (!leg.ground || hero.mode === 'ground');
    if (arrived) { out.index++; continue; }
    const push = distance > 0.05 ? 1 / distance : 0;
    out.state = stepArena(out.state, { ...ARENA_IDLE, moveX: dx * push, moveZ: dz * push, power: leg.power === true, jump: leg.jump !== undefined && distance < leg.jump }, STEP, layout);
    out.seconds += STEP;
    out.events |= out.state.events;
    out.modes.add(out.state.hero.mode);
    if (out.state.hero.tetherId) out.tethers.add(out.state.hero.tetherId);
    if (out.state.events & ARENA_EVENT.caught) out.caught++;
    if (out.state.events & ARENA_EVENT.spotted) out.spotted++;
    if (out.state.events & ARENA_EVENT.hit) out.hits++;
    if (!out.state.pounceId) out.worst = Math.max(out.worst, penetration(out.state.hero, layout.world).depth);
  }
  out.reached = out.index >= route.length;
  return out;
}

const COURSE_ROUTE: Leg[] = [
  { x: -18.6, z: -4, r: 0.4 }, { x: -22, z: -4, r: 0.5, y: 6 }, { x: -22, z: -2.5, r: 0.3 },
  { x: -22, z: 8, r: 1.2, power: true, jump: 99, y: 6, ground: true },
  { x: -18.4, z: 9, r: 0.5 }, { x: -12.9, z: 2.6, r: 0.5 }, { x: -12.9, z: 6, r: 0.4 }, { x: -10.8, z: 6, r: 0.5, y: 8 },
  { x: -10.8, z: 9.2, r: 0.5 }, { x: -24.6, z: 14, r: 0.5 }, { x: -27, z: 14, r: 0.5, jump: 2, y: 1.5 },
];
const HIGH_ROUTE: Leg[] = [
  { x: 14.4, z: -5.6, r: 0.5 }, { x: 14.3, z: -0.4, r: 0.4 }, { x: 12.8, z: -0.4, r: 0.4, y: 4.4 }, { x: 12.8, z: 15.2, r: 0.4 },
  // Watch from the top until the near patrol has turned its back and walked off.
  { x: 12.8, z: 15.2, until: state => { const guard = state.robots.find(robot => robot.id === 'yard-guard-b')!; return guard.patrolIndex === 0 && guard.z < 10.5; } },
  // Leap, hold the tether through the bottom of the swing, let go on the way up and drop beside the vault.
  { x: 27.4, z: 17.4, power: true, jump: 99, until: state => state.hero.mode === 'swing' && state.hero.x > 19 },
  { x: 27.4, z: 17.4, r: 1, ground: true }, { x: 27.4, z: 17.4, r: 0.4 },
];

test('the ability course is completable with the move keys, jump and suit power: climb, mantle, zip, chimney, hop', () => {
  const run1 = drive(createArena(), COURSE_ROUTE, 80);
  assert.ok(run1.reached, `stopped at leg ${run1.index}`);
  assert.deepEqual(run1.state.progress.course, ['course-1', 'course-2', 'course-3', 'course-4', 'course-5']);
  assert.ok(run1.events & ARENA_EVENT.trial && run1.events & ARENA_EVENT.star);
  assert.equal(run1.state.progress.courseStars, 3, `a clean lap is a gold lap: ${run1.state.lapTime}s`);
  assert.ok(run1.state.progress.courseBest > 5 && run1.state.progress.courseBest < ARENA.courseGold);
  assert.equal(run1.state.progress.courseBest, run1.state.lapTime, 'the clock ran from the first spark to the last');
  assert.ok(run1.seconds - run1.state.lapTime > 1, 'the walk to the first spark is not on the clock');
  for (const mode of ['ground', 'climb', 'air', 'swing']) assert.ok(run1.modes.has(mode), `used ${mode}`);
  assert.deepEqual([...run1.tethers], ['course-perch']);
  assert.ok(run1.worst < 0.02, `never inside a solid: ${run1.worst}`);
  assert.equal(run1.state.energy, ARENA.energyMax, 'nothing on the course can bonk');
  // A finished lap rests for a moment, then every practice spark is back for another go.
  assert.equal(run1.state.lap.length, 5);
  let rested = run(run1.state, ARENA_LAYOUT, ARENA.lapRest + 2);
  assert.equal(rested.lap.length, 5, 'standing on the last spark never starts the clock');
  assert.ok(rested.lapRest > 0);
  rested = run(rested, ARENA_LAYOUT, 1.2, { moveX: 1 });
  assert.deepEqual([rested.lap.length, rested.lapTime, rested.lapRest], [0, 0, 0], 'step away and the sparks are back');
  // The same lap again is a lap, with its sparkle, and earns nothing twice.
  const again = drive(createArena(ARENA_LAYOUT, run1.state.progress), COURSE_ROUTE, 80);
  assert.ok(again.events & ARENA_EVENT.trial && again.events & ARENA_EVENT.pickup);
  assert.equal(again.events & ARENA_EVENT.star, 0);
  assert.deepEqual(again.state.progress, run1.state.progress);
});

test('course stars: every spark over several visits is one star; a slow whole lap is one, silver two, gold three', () => {
  const sparks = PICKUPS.filter(pickup => pickup.trial === 'course');
  const touch = (state: ArenaState, id: string): ArenaState => {
    const spark = sparks.find(pickup => pickup.id === id)!;
    const hero: HeroState = { ...createHero(LUKE_ARENA, { x: spark.x, z: spark.z, yaw: 0 }), y: spark.y - ARENA.heroCentre, mode: 'air', groundId: '' };
    return settle({ ...state, hero }, ARENA_LAYOUT);
  };
  const hub = (state: ArenaState): ArenaState => run(place(state, ARENA_LAYOUT, LUKE_ARENA.spawn), ARENA_LAYOUT, ARENA.leaveSeconds + 0.1);
  // Three sparks today.
  let state = createArena();
  for (const id of ['course-1', 'course-2', 'course-3']) state = touch(state, id);
  assert.deepEqual(state.progress.course, ['course-1', 'course-2', 'course-3']);
  assert.equal(state.progress.courseStars, 0);
  assert.equal(state.lap.length, 3);
  // Leaving ends the lap; what was found stays found. A reload is the same as leaving.
  state = hub(state);
  assert.equal(state.trial, '');
  const reloaded = createArena(ARENA_LAYOUT, state.progress);
  let events = 0;
  let later = reloaded;
  for (const id of ['course-5', 'course-4']) { later = touch(later, id); events |= later.events; }
  assert.deepEqual(later.progress.course, sparks.map(pickup => pickup.id), 'kept in level order');
  assert.equal(later.progress.courseStars, 1);
  assert.equal(later.progress.courseBest, 0, 'no whole lap yet');
  assert.ok(events & ARENA_EVENT.star, 'the star is announced');
  assert.equal(events & ARENA_EVENT.trial, 0, 'two sparks are not a lap');
  // Whole laps at three speeds.
  const lap = (start: ArenaState, seconds: number): ArenaState => {
    let next = touch(hub(start), 'course-1');
    next = run(next, ARENA_LAYOUT, seconds);
    for (const id of ['course-2', 'course-3', 'course-4', 'course-5']) next = touch(next, id);
    return next;
  };
  const slow = lap(later, ARENA.courseSilver + 1);
  assert.equal(slow.progress.courseStars, 1);
  assert.ok(Math.abs(slow.progress.courseBest - (ARENA.courseSilver + 1)) < 0.1);
  const silver = lap(slow, ARENA.courseGold + 1);
  assert.equal(silver.progress.courseStars, 2);
  const gold = lap(silver, 5);
  assert.equal(gold.progress.courseStars, 3);
  assert.ok(gold.progress.courseBest < 6);
  // A slower lap afterwards changes nothing.
  const after = lap(gold, ARENA.courseSilver + 5);
  assert.deepEqual(after.progress, gold.progress);
  assert.ok(isArenaProgress(ARENA_LAYOUT, after.progress));
});

test('the stealth yard has a high route that nothing notices, and each visit is a fresh attempt', () => {
  const sneak = drive(createArena(), HIGH_ROUTE, 90);
  assert.ok(sneak.reached, `stopped at leg ${sneak.index}`);
  assert.equal(sneak.state.progress.stealthStars, 3);
  assert.ok(sneak.events & ARENA_EVENT.star && sneak.events & ARENA_EVENT.trial);
  assert.equal(sneak.caught + sneak.spotted + sneak.hits, 0);
  assert.ok(sneak.state.robots.filter(robot => robot.id.startsWith('yard')).every(robot => robot.awareness < ARENA.unaware), 'no robot even grew curious');
  assert.ok(sneak.modes.has('climb') && sneak.modes.has('swing'), 'by climbing and swinging');
  // Walk out and back in: robots, the vault spark and the unseen flag start over; the saved result does not.
  const back = drive(sneak.state, [{ x: 20, z: -12, r: 0.6 }, { x: 14.4, z: -5.6, r: 0.5 }], 30);
  assert.ok(back.reached);
  assert.equal(back.state.vaultTaken, false);
  assert.equal(back.state.seen, false);
  assert.equal(back.state.progress.stealthStars, 3);
  // Noticed on the way in but never caught: two stars.
  const gate = drive(createArena(), HIGH_ROUTE.slice(0, 1), 30);
  const noticed = drive({ ...gate.state, seen: true }, HIGH_ROUTE.slice(1), 90);
  assert.ok(noticed.reached);
  assert.equal(noticed.state.progress.stealthStars, 2);
});

test('walking straight at the vault is noticed and caught, and still gets there: stealth has no fail state', () => {
  const walk = drive(createArena(), [{ x: 14.4, z: -5.6, r: 0.5 }, { x: 24, z: 4, r: 0.6 }, { x: 27.4, z: 17.4, r: 0.6 }], 120);
  assert.ok(walk.reached, `stopped at leg ${walk.index}`);
  assert.ok(walk.caught >= 1, 'the floodlight caught him');
  assert.ok(walk.caught <= 6, `the dark spells grow until he gets through: ${walk.caught} catches`);
  assert.equal(walk.state.progress.stealthStars, 1, 'one star for getting there at all');
  assert.equal(walk.state.seen, true);
  // A later clean run upgrades the result; a later messy one never downgrades it.
  const clean = drive(createArena(ARENA_LAYOUT, walk.state.progress), HIGH_ROUTE, 90);
  assert.equal(clean.state.progress.stealthStars, 3);
  const messy = drive(createArena(ARENA_LAYOUT, clean.state.progress), [{ x: 14.4, z: -5.6, r: 0.5 }, { x: 24, z: 4, r: 0.6 }, { x: 27.4, z: 17.4, r: 0.6 }], 120);
  assert.equal(messy.state.progress.stealthStars, 3);
  assert.equal(messy.events & ARENA_EVENT.star, 0);
});

/** A plain fighter: face the nearest ring robot, tap the one action on a rhythm, sidestep once a robot commits. */
function fight(state: ArenaState, seconds: number, careful: boolean): { state: ArenaState; seconds: number; hits: number; bonks: number; waves: number; resolved: number; worst: number } {
  let hits = 0, bonks = 0, waves = 0, resolved = 0, press = 0, time = 0, worst = 0;
  for (let step = 0; step < steps(seconds) && state.wave <= ARENA_LAYOUT.waves; step++) {
    const hero = state.hero;
    let nearest: RobotState | null = null;
    let best = Infinity;
    for (const robot of state.robots) {
      if (robot.mode === 'dormant' || robot.mode === 'resolved' || !robot.id.startsWith('ring')) continue;
      const distance = Math.hypot(robot.x - hero.x, robot.z - hero.z);
      if (distance < best) { best = distance; nearest = robot; }
    }
    let moveX = 0, moveZ = 0, aimX = 0, aimZ = 1, action = false;
    if (nearest) {
      const dx = nearest.x - hero.x, dz = nearest.z - hero.z;
      aimX = dx; aimZ = dz;
      const danger = careful && state.robots.some(robot => (robot.mode === 'strike' || (robot.mode === 'windup' && robot.timer <= ROBOT_PROFILES[robot.kind].windup * 0.4)) && Math.hypot(robot.x - hero.x, robot.z - hero.z) < 12);
      if (danger) { moveX = dz / best; moveZ = -dx / best; }
      else if (best > 5.5) { moveX = dx / best; moveZ = dz / best; }
      else if (best < 3) { moveX = -dx / best; moveZ = -dz / best; }
      press += STEP;
      if (press > 0.3) { action = true; press = 0; }
    } else {
      const dx = -hero.x, dz = 7 - hero.z, distance = Math.hypot(dx, dz);
      if (distance > 1) { moveX = dx / distance; moveZ = dz / distance; }
    }
    state = stepArena(state, { ...ARENA_IDLE, moveX, moveZ, action, aimX, aimZ }, STEP, ARENA_LAYOUT);
    time += STEP;
    if (state.events & ARENA_EVENT.hit) hits++;
    if (state.events & ARENA_EVENT.bonk) bonks++;
    if (state.events & ARENA_EVENT.wave) waves++;
    if (state.events & ARENA_EVENT.resolve) resolved++;
    if (!state.pounceId) worst = Math.max(worst, penetration(state.hero, LUKE_ARENA).depth);
  }
  return { state, seconds: time, hits, bonks, waves, resolved, worst };
}

test('the battle ring runs three waves that the one-button action can clear, and carries on after leaving', () => {
  const entered = drive(createArena(), [{ x: 0, z: -1, r: 0.5 }], 20);
  assert.equal(entered.state.trial, 'ring');
  assert.equal(entered.state.wave, 1);
  const battle = fight(entered.state, 240, true);
  assert.ok(battle.state.wave > ARENA_LAYOUT.waves, `stuck on wave ${battle.state.wave} after ${battle.seconds}s`);
  assert.equal(battle.state.progress.ringBest, 3);
  assert.equal(battle.hits, 0, 'sidestepping every committed attack keeps Luke untouched');
  assert.equal(battle.state.progress.ringStars, 3);
  assert.equal(battle.waves, 3);
  assert.equal(battle.resolved, ROBOTS.filter(robot => robot.trial === 'ring').length, 'every robot powered down exactly once');
  assert.ok(battle.worst < 0.02);
  // A fighter who never dodges gets bonked on the nose now and then and still wins.
  const brawl = fight(entered.state, 400, false);
  assert.ok(brawl.state.wave > ARENA_LAYOUT.waves);
  assert.ok(brawl.hits >= 1, 'robots do land hits on someone who stands still');
  assert.deepEqual([brawl.state.ringHits, brawl.state.ringBonks], [brawl.hits, brawl.bonks]);
  assert.equal(brawl.state.progress.ringStars, brawl.bonks > 0 ? 1 : 2, 'a win with hits taken is a win with fewer stars');

  // Leave mid-wave: the wave is kept, sparks already removed stay removed, and the robots stand down.
  let mid = entered.state;
  for (let step = 0; step < steps(8) && !mid.robots.some(robot => robot.id === 'ring-iguana-a' && robot.sparks === 1); step++) {
    const target = robotOf(mid, 'ring-iguana-a');
    mid = stepArena(mid, { ...ARENA_IDLE, action: step % 40 === 0, aimX: target.x - mid.hero.x, aimZ: target.z - mid.hero.z }, STEP, ARENA_LAYOUT);
  }
  assert.equal(robotOf(mid, 'ring-iguana-a').sparks, 1);
  const left = drive(mid, [{ x: 0, z: -8, r: 0.6 }], 20);
  assert.equal(left.state.trial, '');
  assert.equal(left.state.wave, 1);
  assert.ok(left.state.robots.filter(robot => robot.id.startsWith('ring') && robot.mode !== 'dormant' && robot.mode !== 'resolved').every(robot => robot.awareness === 0));
  const returned = drive(left.state, [{ x: 0, z: -1, r: 0.5 }], 20);
  assert.equal(robotOf(returned.state, 'ring-iguana-a').sparks, 1, 'the spark stays removed');
  // A finished ring starts over from wave one on the next visit; the record stays.
  const replay = drive(drive(battle.state, [{ x: 0, z: -8, r: 0.6 }], 30).state, [{ x: 0, z: -1, r: 0.5 }], 20);
  assert.equal(replay.state.wave, 1);
  assert.deepEqual([replay.state.ringHits, replay.state.ringBonks], [0, 0]);
  assert.equal(replay.state.progress.ringStars, 3);
  assert.ok(replay.state.robots.filter(robot => robot.id.startsWith('ring')).every(robot => robot.sparks === ROBOT_PROFILES[robot.kind].sparks));
});

test('thousands of arbitrary inputs keep the arena valid: nobody stuck, lost or out of bounds, rewards only grow', () => {
  let seed = 20261116;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  // Stretches of fifty seconds from different places. In some the player mashes at random; in others
  // the controller is put down in the middle of the ring or in the floodlight's sweep.
  const stretches = [
    { x: 0, z: -1, idle: false }, { x: 16, z: -4, idle: false }, { x: -18, z: -4, idle: false }, { x: 0, z: 8, idle: true },
    { x: 24, z: 6, idle: true }, { x: 24, z: 6, idle: false }, { x: 0, z: 8, idle: false },
  ];
  let state = createArena();
  let input: ArenaInput = { ...ARENA_IDLE };
  let worst = 0, stuckHeld = 0, bonks = 0, catches = 0, pounces = 0, snares = 0;
  let before = state.progress;
  for (let step = 0; step < 90_000; step++) {
    const stretch = stretches[Math.floor(step / 6000) % stretches.length];
    if (step % 6000 === 0) {
      // Through the hub first, so each stretch walks into its trial afresh.
      state = run({ ...state, hero: createHero(LUKE_ARENA) }, ARENA_LAYOUT, ARENA.leaveSeconds + 0.1);
      state = { ...state, hero: createHero(LUKE_ARENA, { x: stretch.x, z: stretch.z, yaw: 0 }) };
    }
    if (stretch.idle) input = { ...ARENA_IDLE };
    else if (step % 19 === 0) input = { moveX: random() * 2 - 1, moveZ: random() * 2 - 1, jump: random() < 0.2, power: random() < 0.25, action: random() < 0.3, pounce: random() < 0.1, aimX: random() * 2 - 1, aimZ: random() * 2 - 1 };
    state = stepArena(state, input, STEP, ARENA_LAYOUT);
    const hero = state.hero;
    assert.ok(Number.isFinite(hero.x) && Number.isFinite(hero.y) && Number.isFinite(hero.z), 'finite');
    assert.ok(hero.x >= LUKE_ARENA.bounds.minX && hero.x <= LUKE_ARENA.bounds.maxX && hero.z >= LUKE_ARENA.bounds.minZ && hero.z <= LUKE_ARENA.bounds.maxZ, 'in bounds');
    assert.ok(hero.y >= -1e-6 && hero.y < 40, `height ${hero.y}`);
    assert.ok(state.energy >= 0 && state.energy <= ARENA.energyMax);
    assert.ok(state.bonk <= ARENA.bonkSeconds && state.held <= ARENA.holdSeconds);
    if (!state.pounceId) worst = Math.max(worst, penetration(hero, LUKE_ARENA).depth);
    stuckHeld = state.held > 0 || state.bonk > 0 ? stuckHeld + 1 : 0;
    assert.ok(stuckHeld <= steps(ARENA.bonkSeconds) + 2, 'never held or dizzy for longer than the rule says');
    for (const robot of state.robots) {
      assert.ok(Number.isFinite(robot.x) && Number.isFinite(robot.z) && robot.awareness >= 0 && robot.awareness <= 1 && robot.sparks >= 0);
      const zone = ZONES.find(candidate => candidate.id === ROBOTS.find(item => item.id === robot.id)!.trial)!;
      assert.ok(robot.x >= zone.minX - 1e-9 && robot.x <= zone.maxX + 1e-9 && robot.z >= zone.minZ - 1e-9 && robot.z <= zone.maxZ + 1e-9, `${robot.id} stays in its zone`);
    }
    if (state.events & ARENA_EVENT.bonk) bonks++;
    if (state.events & ARENA_EVENT.caught) catches++;
    if (state.events & ARENA_EVENT.pounce) pounces++;
    if (state.events & ARENA_EVENT.snare) snares++;
    // Rewards are monotonic.
    assert.deepEqual(mergeProgress(ARENA_LAYOUT, before, state.progress), state.progress);
    before = state.progress;
  }
  assert.ok(worst < 0.05, `stayed outside every solid: ${worst}`);
  assert.ok(pounces > 20 && snares > 20, `the walk used the abilities: ${pounces} pounces, ${snares} snares`);
  assert.ok(bonks >= 1 && catches >= 1, `standing still was bonked and caught: ${bonks} bonks, ${catches} catches`);
});

test('the on-screen hint and the one button always agree about what the action will do', () => {
  const layout = yard([spec('guard', 'iguana', LANE, 5, 0)]);
  const behind = begin(layout, { x: LANE, z: 0, yaw: 0 });
  const guard = (state: ArenaState) => robotOf(state, 'guard');
  assert.equal(actionFor(layout, behind, guard(behind)), 'quiet');
  assert.equal(actionFor(layout, behind, undefined), 'none');
  const noticed = alerted(behind);
  assert.equal(actionFor(layout, noticed, guard(noticed)), 'snare');
  const held = tap(noticed, layout, { action: true });
  assert.equal(actionFor(layout, held, guard(held)), 'pounce', 'a held robot is worth the leap');
  // Out of snare reach but inside pounce reach, the action still does something.
  const far = alerted(begin(layout, { x: LANE, z: 5 - (ARENA.snareRange + 0.5), yaw: 0 }));
  assert.equal(actionFor(layout, far, guard(far)), 'pounce');
  // Cooling down, mid-leap, dizzy or held: nothing.
  assert.equal(actionFor(layout, { ...noticed, snareCooldown: 1, pounceCooldown: 1 }, guard(noticed)), 'none');
  assert.equal(actionFor(layout, { ...noticed, snareCooldown: 1 }, guard(noticed)), 'pounce');
  assert.equal(actionFor(layout, { ...behind, bonk: 1 }, guard(behind)), 'none');
  assert.equal(actionFor(layout, { ...behind, held: 1 }, guard(behind)), 'none');
  // Whatever it says is what one press does.
  for (const start of [behind, noticed, held, far]) {
    const said = actionFor(layout, start, guard(start));
    const after = stepArena({ ...start, actionHeld: false }, { ...ARENA_IDLE, action: true }, STEP, layout);
    if (said === 'snare') assert.ok(after.events & ARENA_EVENT.snare);
    else { assert.ok(after.events & ARENA_EVENT.pounce); assert.equal(after.pounceQuiet, said === 'quiet'); }
  }
});
