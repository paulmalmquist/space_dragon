import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ARENA, ARENA_EVENT, ARENA_IDLE, ARENA_LAYOUT, ROBOT_PROFILES, actionFor,
  createArena, diveTargets, mergeProgress, sidekickFor, sidekickFree, stepArena, stunTarget,
} from '../src/game/arena/arena.ts';
import type { ArenaInput, ArenaLayout, ArenaState, RobotState } from '../src/game/arena/arena.ts';
import { LUKE_ARENA, ROBOTS, SIDEKICK, ZONES, zoneAt, zoneOf } from '../src/game/arena/arena-world.ts';
import type { RobotKind, RobotSpec } from '../src/game/arena/arena-world.ts';
import { createHero, HERO_EVENT } from '../src/game/traversal/hero.ts';
import { TRAVERSAL_STEP, TUNING } from '../src/game/traversal/tuning.ts';
import type { TraversalWorld } from '../src/game/traversal/world.ts';
import { penetration } from './helpers/traversal.ts';

const STEP = TRAVERSAL_STEP;
const steps = (seconds: number) => Math.round(seconds / STEP);

/**
 * A flat test yard: a play floor to the west, a floor the sidekick stays out of to the east,
 * and a strip of hub between them. One tall tower and one low wall stand on the play floor.
 */
const YARD: TraversalWorld = {
  id: 'sidekick-test', bounds: { minX: -30, maxX: 30, minZ: -30, maxZ: 30 },
  solids: [
    { id: 'tower', kind: 'block', minX: 8, maxX: 12, minZ: 8, maxZ: 12, minY: 0, maxY: 6 },
    { id: 'wall', kind: 'block', minX: -3, maxX: 3, minZ: -12, maxZ: -11, minY: 0, maxY: 3 },
  ],
  anchors: [], water: [], sparks: [], recoveries: [], spawn: { x: 0, z: 0, yaw: 0 },
};
const GATE = { trial: 'stealth', x: 15, z: 0, yaw: Math.PI / 2 } as const;
const spec = (id: string, kind: RobotKind, x: number, z: number, yaw: number, extra: Partial<RobotSpec> = {}): RobotSpec =>
  ({ id, kind, trial: 'ring', wave: 0, x, z, yaw, patrol: [], sweepFrom: yaw, sweepTo: yaw, sweepRate: 0, ...extra });
function yard(robots: RobotSpec[] = [], sidekick = true): ArenaLayout {
  return {
    world: YARD, robots, waves: 0, pickups: [], hides: [{ id: 'start', x: 20, z: -8, yaw: 0 }],
    zones: [{ id: 'ring', minX: -30, maxX: 14, minZ: -30, maxZ: 30 }, { id: 'stealth', minX: 16, maxX: 30, minZ: -30, maxZ: 30 }],
    ...(sidekick ? { sidekick: { id: 'dad', x: -2, z: -2, yaw: 0, waits: [GATE] } } : {}),
  };
}
type Pose = { x: number; z: number; yaw: number; y?: number };
const place = (state: ArenaState, layout: ArenaLayout, pose: Pose): ArenaState => ({ ...state, hero: createHero(layout.world, pose) });
/** Put the sidekick somewhere, rested and following. */
const dadAt = (state: ArenaState, x: number, z: number): ArenaState =>
  ({ ...state, sidekick: { ...state.sidekick, x, z, mode: 'follow', timer: 0, cooldown: 0, stuck: 0, aimId: '' } });
function run(state: ArenaState, layout: ArenaLayout, seconds: number, input: Partial<ArenaInput> = {}, visit?: (state: ArenaState) => void): ArenaState {
  const held = { ...ARENA_IDLE, ...input };
  for (let index = 0; index < steps(seconds); index++) { state = stepArena(state, held, STEP, layout); visit?.(state); }
  return state;
}
/** One press: down for a step, then up. */
function tap(state: ArenaState, layout: ArenaLayout, input: Partial<ArenaInput>, visit?: (state: ArenaState) => void): ArenaState {
  state = stepArena(state, { ...ARENA_IDLE, ...input }, STEP, layout); visit?.(state);
  state = stepArena(state, ARENA_IDLE, STEP, layout); visit?.(state);
  return state;
}
const robotOf = (state: ArenaState, id: string): RobotState => state.robots.find(robot => robot.id === id)!;
const apart = (state: ArenaState) => Math.hypot(state.hero.x - state.sidekick.x, state.hero.z - state.sidekick.z);
/** Place Luke, step once so the trial is entered, and stand the sidekick where a test wants him. */
function begin(layout: ArenaLayout, pose: Pose, dad?: { x: number; z: number }): ArenaState {
  const state = stepArena(place(createArena(layout), layout, pose), ARENA_IDLE, STEP, layout);
  return dad ? dadAt(state, dad.x, dad.z) : state;
}
const alerted = (state: ArenaState): ArenaState =>
  ({ ...state, robots: state.robots.map(robot => ({ ...robot, mode: 'alert', awareness: 1, lastSeenX: state.hero.x, lastSeenZ: state.hero.z })) });
const sparksLeft = (state: ArenaState) => state.robots.reduce((sum, robot) => sum + robot.sparks, 0);
/** Run until an alley-oop is over, counting what happened on the way. */
function fly(state: ArenaState, layout: ArenaLayout, input: (state: ArenaState, step: number) => Partial<ArenaInput> = () => ({})) {
  const seen = { toss: 0, hang: 0, dive: 0, impact: 0, hit: 0, caught: 0, hop: 0, top: state.hero.y, hangSteps: 0, steps: 0 };
  const count = (next: ArenaState) => {
    for (const name of ['toss', 'hang', 'dive', 'impact', 'hit', 'caught'] as const) if (next.events & ARENA_EVENT[name]) seen[name]++;
    if (next.hero.events & HERO_EVENT.hop) seen.hop++;
    if (next.oop === 'hang') seen.hangSteps++;
    seen.top = Math.max(seen.top, next.hero.y); seen.steps++;
  };
  for (let step = 0; step < steps(12); step++) {
    state = stepArena(state, { ...ARENA_IDLE, ...input(state, step) }, STEP, layout);
    count(state);
    if (state.oop === '' && state.hero.mode === 'ground' && step > 2) break;
  }
  return { state, seen };
}

test("the real level gives Luke a sidekick who starts beside him in clear space and waits outside the stealth yard", () => {
  const fresh = createArena();
  assert.equal(fresh.sidekick.present, true);
  assert.equal(zoneAt(SIDEKICK.x, SIDEKICK.z), '', 'he starts in the hub');
  assert.ok(Math.hypot(SIDEKICK.x - LUKE_ARENA.spawn.x, SIDEKICK.z - LUKE_ARENA.spawn.z) < 3, 'beside Luke');
  assert.equal(sidekickFree(ARENA_LAYOUT, SIDEKICK.x, SIDEKICK.z), true);
  assert.deepEqual(SIDEKICK.waits.map(spot => spot.trial), ['stealth'], 'stealth is the one trial he stays out of');
  for (const spot of SIDEKICK.waits) {
    assert.equal(zoneAt(spot.x, spot.z), '', 'he waits on the hub floor');
    assert.equal(sidekickFree(ARENA_LAYOUT, spot.x, spot.z), true);
    const zone = zoneOf(spot.trial);
    const gap = Math.hypot(spot.x - Math.min(Math.max(spot.x, zone.minX), zone.maxX), spot.z - Math.min(Math.max(spot.z, zone.minZ), zone.maxZ));
    assert.ok(gap > ARENA.sidekickRadius && gap < 3, `close to the line but off the floor: ${gap}`);
  }
  // Standing still at the start, he is already close enough to throw Luke.
  const settled = run(fresh, ARENA_LAYOUT, 1);
  assert.equal(settled.sidekick.mode, 'ready');
  assert.equal(sidekickFor(ARENA_LAYOUT, settled), 'oop');
  // A level with no sidekick simply has none.
  const alone = yard([spec('a', 'iguana', 0, 6, 0)], false);
  const solo = tap(alerted(begin(alone, { x: 0, z: 0, yaw: 0 })), alone, { sidekick: true });
  assert.equal(solo.sidekick.present, false);
  assert.equal(sidekickFor(alone, solo), 'none');
  assert.equal(solo.events & (ARENA_EVENT.toss | ARENA_EVENT.stun), 0);
  assert.equal(sidekickFree(alone, 0, 0), false);
});

test('the sidekick keeps close on his own: he follows a run, stops short of Luke and slides round what is in the way', () => {
  const layout = yard();
  let state = begin(layout, { x: -20, z: 16, yaw: 0 }, { x: -22, z: 15 });
  let farthest = 0;
  const watch = (next: ArenaState) => {
    farthest = Math.max(farthest, apart(next));
    assert.equal(sidekickFree(layout, next.sidekick.x, next.sidekick.z), true, `clear at ${next.sidekick.x}, ${next.sidekick.z}`);
    assert.ok(next.events === 0 || (next.events & ARENA_EVENT.zip) === 0, 'an ordinary run needs no hop');
  };
  // A run east along a line that clips the tower's corner, so he has to slide round it.
  state = run(state, layout, 5.6, { moveX: 1, moveZ: -0.22 }, watch);
  assert.ok(state.hero.x > 4, `Luke ran: ${state.hero.x}`);
  const trailing = ARENA.followNear + TUNING.runSpeed / ARENA.sidekickGain;
  assert.ok(farthest < trailing + 0.6, `he trails by about ${trailing.toFixed(2)} m at a run, never more than ${farthest.toFixed(2)}`);
  assert.equal(state.sidekick.mode, 'follow', 'trailing a run he is too far back to throw');
  // Luke stops: he closes to arm's length, faces Luke and is ready.
  state = run(state, layout, 2, {}, watch);
  assert.ok(Math.abs(apart(state) - ARENA.followNear) < 0.05, `stops short: ${apart(state)}`);
  assert.equal(state.sidekick.mode, 'ready');
  const facing = Math.atan2(state.hero.x - state.sidekick.x, state.hero.z - state.sidekick.z);
  assert.ok(Math.abs(Math.atan2(Math.sin(facing - state.sidekick.yaw), Math.cos(facing - state.sidekick.yaw))) < 0.02, 'facing Luke');
  // A sprint outruns him for a while; he never gives up and never hops while he can still walk it.
  state = run(state, layout, 1.5, { moveX: -1, power: true }, watch);
  assert.ok(apart(state) > ARENA.oopReach, 'a sprint opens the gap');
  state = run(state, layout, 2.5, {}, watch);
  assert.ok(apart(state) < ARENA.followNear + 0.1);
});

test('walked into, the sidekick gives Luke room instead of standing in him, and being backed against a wall is not being stuck', () => {
  const layout = yard();
  // Luke walks straight at him across open floor: he is herded along, never walked through.
  let state = begin(layout, { x: -20, z: -20, yaw: Math.PI / 2 }, { x: -18, z: -20 });
  let closest = Infinity;
  state = run(state, layout, 3, { moveX: 1 }, next => {
    closest = Math.min(closest, apart(next));
    assert.equal(sidekickFree(layout, next.sidekick.x, next.sidekick.z), true);
    assert.equal(next.events & ARENA_EVENT.zip, 0);
  });
  assert.ok(state.sidekick.x > -12, `he was pushed along: ${state.sidekick.x}`);
  assert.ok(closest > 0.3, `never inside him: ${closest}`);
  // Luke stops: the gap opens back out to arm's length and he is ready to throw.
  state = run(state, layout, 1.5);
  assert.ok(apart(state) >= ARENA.followMin - 0.01 && apart(state) <= ARENA.followNear + 0.05, `room again: ${apart(state)}`);
  assert.equal(state.sidekick.mode, 'ready');
  const facing = Math.atan2(state.hero.x - state.sidekick.x, state.hero.z - state.sidekick.z);
  assert.ok(Math.abs(Math.atan2(Math.sin(facing - state.sidekick.yaw), Math.cos(facing - state.sidekick.yaw))) < 0.05, 'he backed away facing Luke');
  // Backed up against the tower he simply stays put: no hop, and still on legal ground.
  let cornered = begin(layout, { x: 5, z: 10, yaw: Math.PI / 2 }, { x: 7.2, z: 10 });
  cornered = run(cornered, layout, 3, { moveX: 1 }, next => {
    assert.equal(sidekickFree(layout, next.sidekick.x, next.sidekick.z), true);
    assert.equal(next.events & ARENA_EVENT.zip, 0, 'backed against a wall is not stuck');
    assert.equal(next.sidekick.stuck, 0);
  });
  assert.ok(cornered.sidekick.x <= 8 - ARENA.sidekickRadius + 1e-6);
});

test('left far behind or stuck behind something, he hops to Luke\'s side: nobody is ever lost', () => {
  const layout = yard();
  // Luke is suddenly somewhere else, as after a long swing or a safety catch.
  let state = begin(layout, { x: -20, z: 0, yaw: 0 }, { x: -22, z: 0 });
  state = stepArena(place(state, layout, { x: 4, z: -20, yaw: 0 }), ARENA_IDLE, STEP, layout);
  assert.ok(state.events & ARENA_EVENT.zip, 'one step later he is there');
  assert.ok(Math.abs(apart(state) - (ARENA.followNear + 0.3)) < 1e-9, `beside Luke: ${apart(state)}`);
  assert.equal(sidekickFree(layout, state.sidekick.x, state.sidekick.z), true);
  // Straight into a wall with Luke standing just behind it: he pushes for a moment, then hops over.
  let blocked = begin(layout, { x: 0, z: -8.5, yaw: 0 }, { x: 0, z: -15 });
  let hops = 0, longest = 0;
  blocked = run(blocked, layout, 3, {}, next => { if (next.events & ARENA_EVENT.zip) hops++; longest = Math.max(longest, next.sidekick.stuck); });
  assert.equal(hops, 1, 'exactly one hop');
  assert.ok(longest >= ARENA.zipStuck - STEP && longest < ARENA.zipStuck + STEP, `after pushing for ${longest}s`);
  assert.ok(apart(blocked) < ARENA.followNear + 0.35);
  // Luke up on the tower is not "stuck": the sidekick waits at its foot and does not hop about.
  let above = begin(layout, { x: 10, z: 10, yaw: 0, y: 6 }, { x: 4, z: 10 });
  assert.equal(above.hero.y, 6);
  above = run(above, layout, 4, {}, next => assert.equal(next.events & ARENA_EVENT.zip, 0, 'no hopping while Luke is up high'));
  assert.ok(above.sidekick.x < 8 - ARENA.sidekickRadius + 1e-6 && above.sidekick.x > 7, `at the foot of the tower: ${above.sidekick.x}`);
  assert.equal(sidekickFor(layout, above), 'none', 'too far below for a throw, and nothing to stun');
});

test('in a trial he waits at, the sidekick holds back at the line, cannot be asked, and joins Luke again outside', () => {
  const guard = spec('guard', 'iguana', 22, 4, 0, { trial: 'stealth' });
  const layout = yard([guard]);
  let state = begin(layout, { x: 12, z: 0, yaw: 0 }, { x: 10.5, z: 0 });
  // Luke walks over the line; the sidekick goes to the gate and stays there.
  const outside = (next: ArenaState) => assert.ok(next.sidekick.x <= 16 - ARENA.sidekickRadius + 1e-6, `never on the stealth floor: ${next.sidekick.x}`);
  state = run(state, layout, 2.4, { moveX: 1 }, outside);
  assert.equal(state.trial, 'stealth');
  state = run(state, layout, 2, {}, outside);
  assert.equal(state.sidekick.mode, 'wait');
  assert.ok(Math.hypot(state.sidekick.x - GATE.x, state.sidekick.z - GATE.z) < 0.02, 'at the gate');
  assert.ok(Math.abs(state.sidekick.yaw - GATE.yaw) < 0.02, 'keeping watch');
  // Standing right beside the line, with a robot in view: still nothing. Stealth is Luke's own test.
  const beside = stepArena(alerted(place(state, layout, { x: 16.4, z: 0, yaw: 0 })), ARENA_IDLE, STEP, layout);
  assert.equal(beside.trial, 'stealth');
  assert.ok(apart(beside) < ARENA.oopReach);
  assert.equal(sidekickFor(layout, beside), 'none');
  const pressed = tap(beside, layout, { sidekick: true });
  assert.equal(pressed.oop, '');
  assert.equal(robotOf(pressed, 'guard').stunned, false);
  // The guard never minds him: only Luke is ever seen.
  const quiet = run(state, layout, 3, {}, outside);
  assert.equal(robotOf(quiet, 'guard').awareness, 0);
  // Back out on the hub, he follows again and can be asked.
  let back = run(place(state, layout, { x: 12, z: 6, yaw: 0 }), layout, ARENA.leaveSeconds + 2.5, {}, outside);
  assert.notEqual(back.trial, 'stealth');
  assert.equal(back.sidekick.mode, 'ready');
  // Sent to the far end of the yard, he hops to the gate rather than walking round the world.
  back = stepArena(dadAt(place(back, layout, { x: 20, z: 0, yaw: 0 }), -25, 20), ARENA_IDLE, STEP, layout);
  back = stepArena(back, ARENA_IDLE, STEP, layout);
  assert.ok(Math.hypot(back.sidekick.x - GATE.x, back.sidekick.z - GATE.z) < 0.02, 'straight to the gate');
});

test('the sidekick button and its hint always agree: an alley-oop beside him, a stun elsewhere, nothing when he cannot help', () => {
  const layout = yard([spec('a', 'iguana', 0, 7, 0), spec('behind-wall', 'iguana', 0, -14, Math.PI)]);
  const beside = alerted(begin(layout, { x: 0, z: 0, yaw: 0 }, { x: -2, z: 0 }));
  const apartFrom = alerted(begin(layout, { x: 0, z: 0, yaw: 0 }, { x: -5, z: 0 }));
  assert.equal(sidekickFor(layout, beside), 'oop');
  assert.equal(sidekickFor(layout, apartFrom), 'stun');
  assert.equal(stunTarget(layout, apartFrom)?.id, 'a');
  // In the air or up on something, there is nobody to cup their hands under: the button stuns instead.
  const airborne = { ...beside, hero: { ...beside.hero, mode: 'air' as const, y: 1.2, groundId: '' } };
  assert.equal(sidekickFor(layout, airborne), 'stun');
  // Dizzy, held, mid-leap, mid-throw, being caught back to safety, or while he rests: nothing.
  for (const busy of [{ bonk: 1 }, { held: 1 }, { pounceId: 'a' }, { oop: 'rise' as const }, { sidekick: { ...beside.sidekick, cooldown: 0.5 } }, { sidekick: { ...beside.sidekick, timer: 0.2 } }])
    assert.equal(sidekickFor(layout, { ...beside, ...busy }), 'none', JSON.stringify(Object.keys(busy)));
  assert.equal(sidekickFor(layout, { ...beside, hero: { ...beside.hero, mode: 'catch' } }), 'none');
  // Too far for him, or out of his sight: nothing to stun.
  const far = { ...apartFrom, sidekick: { ...apartFrom.sidekick, x: -5 - ARENA.stunRange, z: 7 } };
  assert.equal(stunTarget(layout, far), undefined);
  const hidden = alerted(begin(layout, { x: 0, z: -8, yaw: Math.PI }, { x: 0, z: -9.5 }));
  assert.equal(robotOf(hidden, 'a').mode, 'alert');
  assert.equal(stunTarget(layout, { ...hidden, robots: hidden.robots.filter(robot => robot.id !== 'a') })?.id, undefined, 'the wall hides the robot behind it');
  // Whatever the hint says is what one press does, and the action button's own hint is untouched.
  for (const start of [beside, apartFrom, airborne, far]) {
    const said = sidekickFor(layout, start);
    const after = stepArena({ ...start, sidekickHeld: false }, { ...ARENA_IDLE, sidekick: true }, STEP, layout);
    assert.equal((after.events & ARENA_EVENT.toss) !== 0, said === 'oop', `toss when it says ${said}`);
    assert.equal((after.events & ARENA_EVENT.stun) !== 0, said === 'stun', `stun when it says ${said}`);
  }
  assert.equal(actionFor(layout, apartFrom, robotOf(apartFrom, 'a')), 'snare');
  // Holding the button down is one request, not one a step.
  let held = stepArena(apartFrom, { ...ARENA_IDLE, sidekick: true }, STEP, layout);
  let stuns = held.events & ARENA_EVENT.stun ? 1 : 0;
  held = run(held, layout, ARENA.stunCooldown + ARENA.stunSeconds + 1, { sidekick: true }, next => { if (next.events & ARENA_EVENT.stun) stuns++; });
  assert.equal(stuns, 1);
});

test("a stun holds a robot dizzy without taking a spark, stops its attack and sets up Luke's finish", () => {
  const layout = yard([spec('a', 'iguana', 0, 6, Math.PI), spec('b', 'iguana', 5, 6, Math.PI), spec('big', 'mower', -9, 6, Math.PI / 2)]);
  let state = alerted(begin(layout, { x: 0, z: 0, yaw: 0 }, { x: -5, z: -1 }));
  // Let the nearest one start its wind-up, then ask.
  for (let index = 0; index < steps(6) && robotOf(state, 'a').mode !== 'windup'; index++) state = stepArena(dadAt(state, -5, -1), ARENA_IDLE, STEP, layout);
  assert.equal(robotOf(state, 'a').mode, 'windup');
  assert.equal(state.targetId, 'a');
  state = tap(dadAt(state, -5, -1), layout, { sidekick: true });
  const dizzy = robotOf(state, 'a');
  assert.equal(dizzy.stunned, true);
  assert.equal(dizzy.tethered, false);
  assert.ok(dizzy.hold > ARENA.stunSeconds - 3 * STEP);
  assert.equal(dizzy.sparks, ROBOT_PROFILES.iguana.sparks, 'no spark taken: the finish stays with Luke');
  assert.equal(state.sidekick.mode, 'stun');
  assert.equal(state.sidekick.aimId, 'a');
  assert.ok(Math.abs(state.sidekick.cooldown - (ARENA.stunCooldown - STEP * 2)) < 1e-9);
  // It never strikes while dizzy: the wind-up it had begun simply stops where it was.
  const frozen = { x: dizzy.x, z: dizzy.z };
  let dazed = run(state, layout, ARENA.stunSeconds - 0.2, {}, next => assert.equal(robotOf(next, 'a').mode, 'windup'));
  assert.deepEqual({ x: robotOf(dazed, 'a').x, z: robotOf(dazed, 'a').z }, frozen, 'held where it stood');
  assert.equal(robotOf(dazed, 'a').stunned, true);
  // The pose has played out and he is following again, but still catching up on his cooldown.
  assert.equal(dazed.sidekick.aimId, '');
  assert.notEqual(dazed.sidekick.mode, 'stun');
  // When it wears off the robot is simply alert again: the attack it was winding up is gone.
  dazed = run(dazed, layout, 0.3);
  assert.equal(robotOf(dazed, 'a').stunned, false);
  assert.equal(robotOf(dazed, 'a').hold, 0);
  assert.equal(robotOf(dazed, 'a').mode, 'alert');

  // A stunned robot is an open finish: the one button pounces, and one pounce powers a small robot down.
  let finish = tap(dadAt(alerted(begin(layout, { x: 0, z: 0, yaw: 0 })), -5, -1), layout, { sidekick: true });
  assert.equal(robotOf(finish, 'a').stunned, true);
  assert.equal(actionFor(layout, finish, robotOf(finish, 'a')), 'pounce');
  finish = run(tap(finish, layout, { action: true, aimX: 0, aimZ: 1 }), layout, 1);
  assert.equal(robotOf(finish, 'a').mode, 'resolved');
  assert.equal(robotOf(finish, 'a').stunned, false);
  // The ringed robot is the one he goes for, even when another is nearer to Luke.
  const choose = dadAt(alerted(begin(layout, { x: 0, z: 0, yaw: 0 })), -3, -1);
  assert.equal(stunTarget(layout, { ...choose, targetId: 'b' })?.id, 'b');
  assert.equal(stunTarget(layout, { ...choose, targetId: '' })?.id, 'a', 'with nothing ringed, the one nearest Luke');
  assert.equal(stunTarget(layout, { ...choose, targetId: 'b', robots: choose.robots.map(robot => robot.id === 'b' ? { ...robot, hold: 1 } : robot) })?.id, 'a', 'never one that is already held');
  // A stunned mow-bot loses a spark to a pounce instead of bouncing Luke off.
  let mower = dadAt(alerted(begin(layout, { x: -9, z: 0, yaw: 0 })), -13, -1);
  mower = tap({ ...mower, targetId: 'big' }, layout, { sidekick: true });
  assert.equal(robotOf(mower, 'big').stunned, true);
  mower = run(tap(mower, layout, { pounce: true, aimX: 0, aimZ: 1 }), layout, 1);
  assert.equal(robotOf(mower, 'big').sparks, ROBOT_PROFILES.mower.sparks - 1);
  // He needs a moment before the next one.
  let again = tap(dadAt(alerted(begin(layout, { x: 0, z: 0, yaw: 0 })), -5, -1), layout, { sidekick: true });
  again = tap(again, layout, { sidekick: true });
  assert.equal(again.robots.filter(robot => robot.stunned).length, 1, 'a second press straight away does nothing');
  again = run(again, layout, ARENA.stunCooldown, {}, next => { again = next; });
  again = tap(dadAt(again, again.hero.x - 5, again.hero.z - 1), layout, { sidekick: true });
  assert.ok(again.robots.filter(robot => robot.stunned).length >= 1);
});

/** Three robots standing with their backs to Luke, so nothing moves while he is in the air, and one far away. */
const QUIET_FOUR = [spec('near', 'iguana', 0, 6, 0), spec('left', 'iguana', -3, 8, 0), spec('right', 'iguana', 3.5, 9, 0), spec('far', 'iguana', 0, 24, 0)];

test('an alley-oop throws Luke to the top of the arc, slows the moment, and the dive lands once on the nearest robots', () => {
  const layout = yard(QUIET_FOUR);
  const start = begin(layout, { x: 0, z: 0, yaw: 0 }, { x: -2, z: 0 });
  assert.equal(start.sidekick.mode, 'follow');
  assert.equal(sidekickFor(layout, start), 'oop');
  const before = sparksLeft(start);
  let state = stepArena(start, { ...ARENA_IDLE, sidekick: true }, STEP, layout);
  assert.ok(state.events & ARENA_EVENT.toss);
  assert.equal(state.oop, 'rise');
  assert.equal(state.sidekick.mode, 'toss');
  assert.ok(Math.abs(state.sidekick.cooldown - ARENA.oopCooldown) < STEP * 2);
  assert.ok(state.hero.vy > 15 && state.hero.vz > 2, `thrown up and toward the robots: ${state.hero.vy}, ${state.hero.vz}`);
  assert.equal(state.targetId, '', 'nothing is ringed while Luke is in the air');
  const dives: string[][] = [];
  let hangSeconds = 0, slowTop = 0, slowBottom = Infinity;
  const { state: landed, seen } = (() => {
    const result = { toss: 1, hang: 0, dive: 0, impact: 0, top: 0, resolved: 0 };
    for (let index = 0; index < steps(8); index++) {
      const previous = state;
      state = stepArena(state, ARENA_IDLE, STEP, layout);
      // What glows during the moment is exactly what the dive will land on.
      if (state.events & ARENA_EVENT.hang) { result.hang++; assert.deepEqual(diveTargets(layout, state).map(robot => robot.id), ['near', 'left', 'right']); }
      if (state.events & ARENA_EVENT.dive) { result.dive++; dives.push([...state.diveIds]); }
      if (state.events & ARENA_EVENT.impact) result.impact++;
      if (state.events & ARENA_EVENT.resolve) result.resolved++;
      if (previous.oop === 'hang' && state.oop === 'hang') { hangSeconds += STEP; slowTop = Math.max(slowTop, previous.hero.y); slowBottom = Math.min(slowBottom, state.hero.y); }
      result.top = Math.max(result.top, state.hero.y);
      if (state.oop === '' && state.hero.mode === 'ground') break;
    }
    return { state, seen: result };
  })();
  assert.ok(seen.top > ARENA.oopApex - 0.15 && seen.top < ARENA.oopApex + 0.05, `the top of the arc: ${seen.top}`);
  assert.deepEqual([seen.hang, seen.dive, seen.impact], [1, 1, 1], 'one moment, one dive, one landing');
  assert.ok(Math.abs(hangSeconds - ARENA.oopHang) < STEP * 2, `the moment lasts ${hangSeconds}s`);
  assert.ok(slowTop - slowBottom < 0.9, `floating, not falling: ${slowTop - slowBottom} m in a second`);
  assert.deepEqual(dives, [['near', 'left', 'right']], 'the nearest three, closest first');
  // The nearest powers down outright; the other two each lose a spark and are pinned. The far one is untouched.
  assert.equal(robotOf(landed, 'near').mode, 'resolved');
  for (const id of ['left', 'right']) {
    assert.equal(robotOf(landed, id).sparks, ROBOT_PROFILES.iguana.sparks - 1, id);
    assert.ok(robotOf(landed, id).hold > 0 && !robotOf(landed, id).tethered && !robotOf(landed, id).stunned, `${id} is pinned`);
    assert.equal(robotOf(landed, id).awareness, 1);
  }
  assert.deepEqual([robotOf(landed, 'far').sparks, robotOf(landed, 'far').mode], [ROBOT_PROFILES.iguana.sparks, 'patrol']);
  assert.equal(before - sparksLeft(landed), ROBOT_PROFILES.iguana.sparks + 2, 'applied exactly once');
  assert.equal(seen.resolved, 1);
  // These three had not noticed him, so the dive is the moment they do. This floor keeps no count of that.
  assert.equal(landed.seen, false);
  // A robot that is fully aware of Luke at the instant of the dive raises no second alarm.
  let hanging = stepArena(start, { ...ARENA_IDLE, sidekick: true }, STEP, layout);
  while (hanging.oop !== 'hang') hanging = stepArena(hanging, ARENA_IDLE, STEP, layout);
  const dived = (awareness: number) => stepArena({ ...hanging, robots: hanging.robots.map(robot => ({ ...robot, awareness })) }, { ...ARENA_IDLE, action: true }, STEP, layout);
  assert.ok(dived(0).events & ARENA_EVENT.dive);
  assert.ok(dived(0).events & ARENA_EVENT.spotted, 'unnoticed until now');
  assert.ok(dived(1).events & ARENA_EVENT.dive);
  assert.equal(dived(1).events & ARENA_EVENT.spotted, 0, 'already known');
  // Luke came down where the nearest robot stood, on his feet, with the list cleared.
  assert.ok(Math.hypot(landed.hero.x, landed.hero.z - 6) < 1.5, `landed at ${landed.hero.x}, ${landed.hero.z}`);
  assert.equal(landed.hero.y, 0);
  assert.deepEqual(landed.diveIds, []);
  assert.equal(penetration(landed.hero, YARD).depth, 0);
  // The sidekick threw, caught his breath, and needs a moment before the next one.
  assert.ok(landed.sidekick.cooldown > 0);
  assert.equal(sidekickFor(layout, landed), 'none');
  const rested = run(landed, layout, ARENA.oopCooldown);
  assert.equal(rested.sidekick.cooldown, 0);
  assert.equal(rested.sidekick.mode, 'ready', 'he walked over and is ready again');
});

test('one press finishes the moment early, mashing does nothing more, and a robot already held powers down too', () => {
  const layout = yard(QUIET_FOUR);
  const start = begin(layout, { x: 0, z: 0, yaw: 0 }, { x: -2, z: 0 });
  const toss = (from: ArenaState) => stepArena(from, { ...ARENA_IDLE, sidekick: true }, STEP, layout);
  // Left alone, the dive goes when the moment ends.
  const waited = fly(toss(start), layout);
  // One press of the action button during the moment sends it at once.
  let pressedAt = -1;
  const pressed = fly(toss(start), layout, (state, step) => { const press = state.oop === 'hang' && pressedAt < 0; if (press) pressedAt = step; return { action: press }; });
  assert.ok(pressedAt > 0);
  assert.deepEqual([pressed.seen.hang, pressed.seen.dive, pressed.seen.impact], [1, 1, 1]);
  assert.ok(pressed.seen.hangSteps <= 2, `no waiting: ${pressed.seen.hangSteps} steps`);
  assert.ok(waited.seen.hangSteps >= steps(ARENA.oopHang) - 2);
  // Every button, every other step, for as long as the alley-oop lasts.
  const mashed = fly(toss(start), layout, (state, step) => state.oop !== '' && step % 2 === 0 ? { action: true, pounce: true, sidekick: true, jump: true, power: true } : {});
  assert.deepEqual([mashed.seen.hang, mashed.seen.dive, mashed.seen.impact, mashed.seen.hop], [1, 1, 1, 0], 'no second dive, no thruster hop, no tether');
  for (const result of [waited, pressed, mashed]) {
    assert.deepEqual(result.state.robots.map(robot => [robot.id, robot.sparks, robot.mode === 'resolved']),
      [['near', 0, true], ['left', 1, false], ['right', 1, false], ['far', 2, false]], 'the same result however it was finished');
    assert.equal(result.state.pounceId, '');
  }
  // The other buttons do nothing on the way up: the throw is the move.
  const early = stepArena(toss(start), { ...ARENA_IDLE, action: true, pounce: true }, STEP, layout);
  assert.equal(early.oop, 'rise');
  assert.equal(early.events & (ARENA_EVENT.snare | ARENA_EVENT.pounce | ARENA_EVENT.dive), 0);
  // A robot that was already held is finished by the dive, wherever it is in the order.
  const heldFirst = { ...start, robots: start.robots.map(robot => robot.id === 'right' ? { ...robot, hold: 9, tethered: true } : robot) };
  const combo = fly(toss(heldFirst), layout);
  assert.deepEqual(combo.state.robots.map(robot => [robot.id, robot.sparks]), [['near', 0], ['left', 1], ['right', 0], ['far', 2]]);
  assert.equal(combo.state.snareId, '');
});

test('with nothing to land on the throw is simply a boost: no slow motion, control straight back, and a hop reaches a six-metre top', () => {
  const layout = yard();
  // Out in the open: up, over the top and down again, with no pause.
  const open = fly(stepArena(begin(layout, { x: -10, z: -10, yaw: Math.PI / 2 }, { x: -12, z: -10 }), { ...ARENA_IDLE, sidekick: true, aimX: 1, aimZ: 0 }, STEP, layout), layout);
  assert.deepEqual([open.seen.hang, open.seen.dive, open.seen.impact], [0, 0, 0]);
  assert.ok(open.seen.top > ARENA.oopApex - 0.15, `as high as ever: ${open.seen.top}`);
  assert.ok(open.state.hero.x > -8, `thrown the way the camera looks: ${open.state.hero.x}`);
  assert.equal(open.state.hero.y, 0);
  assert.ok(open.seen.steps < steps(2.2), 'no moment of slow motion');
  // Beside the tower: the throw alone tops out below its roof.
  const foot = begin(layout, { x: 7, z: 10, yaw: Math.PI / 2 }, { x: 5, z: 10 });
  const short = fly(stepArena(foot, { ...ARENA_IDLE, sidekick: true, aimX: 1, aimZ: 0 }, STEP, layout), layout, () => ({ moveX: 1 }));
  assert.ok(short.seen.top < 6, `not enough on its own: ${short.seen.top}`);
  assert.equal(short.state.hero.y, 0);
  // The thruster hop is ready the instant the throw is over. Throw, then hop at the top, and Luke is on the roof.
  let hopped = false;
  const up = fly(stepArena(foot, { ...ARENA_IDLE, sidekick: true, aimX: 1, aimZ: 0 }, STEP, layout), layout, state => {
    const now = !hopped && state.oop === '' && state.hero.mode === 'air';
    if (now) { assert.equal(state.hero.hopAvailable, true); hopped = true; }
    return { moveX: 1, jump: now };
  });
  assert.equal(up.seen.hop, 1);
  assert.deepEqual([up.state.hero.y, up.state.hero.groundId], [6, 'tower'], 'on the tower');
  assert.equal(penetration(up.state.hero, YARD).depth, 0);
});

test('nothing can hit or hold Luke during an alley-oop, and he lands with a moment of mercy', () => {
  // A robot about to lunge, and a floodlight already looking at him.
  const layout = yard([spec('lunger', 'iguana', 0, 1.7, Math.PI), spec('light', 'sentry', 0, 9, Math.PI)]);
  let state = alerted(begin(layout, { x: 0, z: 0, yaw: 0 }, { x: -2, z: 0 }));
  state = { ...state, robots: state.robots.map(robot => robot.id === 'lunger' ? { ...robot, mode: 'windup' as const, timer: STEP * 3, strikeX: 0, strikeY: 0.9, strikeZ: 0 } : robot) };
  // Without the throw, this is a hit and a catch.
  let plain = state, plainHits = 0, plainCaught = 0;
  plain = run(plain, layout, 0.6, {}, next => { if (next.events & ARENA_EVENT.hit) plainHits++; if (next.events & ARENA_EVENT.caught) plainCaught++; });
  assert.ok(plainHits + plainCaught >= 1, 'standing there, he is hit or caught');
  // With it, neither: he is in the air and out of reach until he lands.
  const tossed = stepArena(state, { ...ARENA_IDLE, sidekick: true }, STEP, layout);
  assert.equal(tossed.oop, 'rise');
  const flown = fly(tossed, layout);
  assert.deepEqual([flown.seen.hit, flown.seen.caught], [0, 0]);
  assert.equal(flown.seen.dive, 1);
  assert.equal(flown.state.energy, ARENA.energyMax);
  // Mercy starts at the landing, not at the throw.
  let landing: ArenaState | undefined;
  fly(tossed, layout, next => { if (!landing && next.oop === 'dive') landing = next; return {}; });
  let after = landing!;
  while (after.oop === 'dive') after = stepArena(after, ARENA_IDLE, STEP, layout);
  assert.ok(after.mercy >= ARENA.diveMercy - STEP, `mercy on landing: ${after.mercy}`);
  assert.ok(after.events & ARENA_EVENT.impact);
  // A dive in a trial that keeps count of being noticed counts: it is loud.
  const yardLayout: ArenaLayout = { ...yard([spec('guard', 'iguana', 22, 6, 0, { trial: 'stealth' })]), sidekick: { id: 'dad', x: 20, z: -2, yaw: 0, waits: [] } };
  const loud = fly(stepArena(begin(yardLayout, { x: 22, z: 0, yaw: 0 }, { x: 20, z: 0 }), { ...ARENA_IDLE, sidekick: true }, STEP, yardLayout), yardLayout);
  assert.equal(loud.seen.dive, 1);
  assert.equal(robotOf(loud.state, 'guard').mode, 'resolved');
  assert.equal(loud.state.seen, true, 'nobody dives quietly');
  assert.equal(loud.state.progress.quiet, 0);
});

test('time really slows at the top: robots below move a fifth as fast, and everything is pure and repeatable', () => {
  const layout = yard([spec('chaser', 'iguana', 0, 8.6, Math.PI)]);
  let state = alerted(begin(layout, { x: 0, z: 0, yaw: 0 }, { x: -2, z: 0 }));
  state = stepArena(state, { ...ARENA_IDLE, sidekick: true }, STEP, layout);
  const snapshots: ArenaState[] = [];
  let normal = 0, slow = 0, normalSteps = 0, slowSteps = 0;
  for (let index = 0; index < steps(4) && (state.oop !== '' || snapshots.length < 3); index++) {
    const previous = state;
    state = stepArena(state, ARENA_IDLE, STEP, layout);
    const moved = Math.hypot(robotOf(state, 'chaser').x - robotOf(previous, 'chaser').x, robotOf(state, 'chaser').z - robotOf(previous, 'chaser').z);
    if (previous.oop === 'rise' && state.oop === 'rise' && robotOf(state, 'chaser').mode === 'alert' && moved > 0) { normal += moved; normalSteps++; }
    if (previous.oop === 'hang' && state.oop === 'hang' && robotOf(state, 'chaser').mode === 'alert' && moved > 0) { slow += moved; slowSteps++; }
    if (index % 25 === 0) snapshots.push(previous);
  }
  assert.ok(normalSteps > 20 && slowSteps > 20, `${normalSteps} ordinary steps, ${slowSteps} slow ones`);
  assert.ok(Math.abs(slow / slowSteps / (normal / normalSteps) - ARENA.oopSlow) < 0.02, `ratio ${slow / slowSteps / (normal / normalSteps)}`);
  // Pure at every phase: stepping twice from the same state gives the same answer and leaves it untouched.
  assert.ok(snapshots.some(snap => snap.oop === 'rise') && snapshots.some(snap => snap.oop === 'hang'));
  const input: ArenaInput = { moveX: 0.3, moveZ: -1, jump: true, power: true, action: false, pounce: false, sidekick: true, aimX: 1, aimZ: 0 };
  for (const snap of snapshots) {
    const frozen = JSON.stringify(snap);
    assert.deepEqual(stepArena(snap, input, STEP, layout), stepArena(snap, input, STEP, layout));
    assert.equal(JSON.stringify(snap), frozen, 'the state passed in is never changed');
    assert.equal(stepArena(snap, input, 0, layout), snap);
  }
});

/** A player who never presses the action or the pounce button: only moves, stands still and asks the sidekick. */
function duo(state: ArenaState, seconds: number) {
  const counts = { toss: 0, dive: 0, stun: 0, snare: 0, pounce: 0, hit: 0, bonk: 0, zip: 0 };
  let step = 0;
  for (; step < steps(seconds) && state.wave <= ARENA_LAYOUT.waves; step++) {
    const ask = sidekickFor(ARENA_LAYOUT, state);
    const rested = state.sidekick.cooldown <= 0 && state.sidekick.timer <= 0;
    // Circle the middle of the ring at a run; when the sidekick is rested, stop so he can catch up and throw.
    const angle = step * STEP * 1.3;
    const wantX = Math.sin(angle) * 4.5, wantZ = 7 + Math.cos(angle) * 4.5;
    let moveX = wantX - state.hero.x, moveZ = wantZ - state.hero.z;
    const length = Math.hypot(moveX, moveZ) || 1;
    moveX /= length; moveZ /= length;
    const waiting = rested && state.waveTimer <= 0 && state.oop === '' && state.hero.mode === 'ground';
    if (waiting) { moveX = 0; moveZ = 0; }
    state = stepArena(state, { ...ARENA_IDLE, moveX, moveZ, sidekick: (ask === 'oop' && waiting) || (state.oop === 'hang' && step % 2 === 0) }, STEP, ARENA_LAYOUT);
    for (const name of Object.keys(counts) as (keyof typeof counts)[]) if (state.events & ARENA_EVENT[name]) counts[name]++;
  }
  return { state, counts, seconds: step * STEP };
}

test('the battle ring can be cleared by two: alley-oops alone, with no snare and no pounce from Luke', () => {
  let state = createArena();
  state = run({ ...state, hero: createHero(LUKE_ARENA, { x: 0, z: -1, yaw: 0 }), sidekick: { ...state.sidekick, x: -1.5, z: -2.5 } }, ARENA_LAYOUT, 0.1);
  assert.equal(state.trial, 'ring');
  const battle = duo(state, 240);
  assert.ok(battle.state.wave > ARENA_LAYOUT.waves, `stuck on wave ${battle.state.wave} after ${battle.seconds}s: ${JSON.stringify(battle.counts)}`);
  assert.deepEqual([battle.counts.snare, battle.counts.pounce], [0, 0], 'Luke never used his own moves');
  assert.ok(battle.counts.toss >= 5 && battle.counts.dive >= 5, `thrown ${battle.counts.toss} times, dived ${battle.counts.dive}`);
  assert.ok(battle.state.progress.ringStars >= 1);
  assert.equal(battle.state.progress.ringBest, ARENA_LAYOUT.waves);
  assert.ok(battle.seconds < 150, `in ${battle.seconds}s`);
  assert.ok(battle.state.robots.filter(robot => robot.id.startsWith('ring')).every(robot => robot.mode === 'resolved'));
});

test('thousands of arbitrary inputs with the sidekick button keep everyone valid: nobody stuck, lost, hit in the air or on the wrong floor', () => {
  let seed = 20261117;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  // Six stretches of forty seconds from each trial and the hub, twice round.
  const starts = [{ x: 0, z: 2 }, { x: -18, z: -4 }, { x: 16, z: -4 }, { x: 10, z: -9 }, { x: 0, z: 9 }, { x: 24, z: 6 }];
  const stealth = ZONES.find(zone => zone.id === 'stealth')!;
  let state = createArena();
  let input: ArenaInput = { ...ARENA_IDLE };
  let worst = 0, inOop = 0, longestOop = 0, toss = 0, dive = 0, hang = 0, stun = 0, zip = 0, waited = 0;
  let before = state.progress;
  for (let step = 0; step < 60_000; step++) {
    if (step % 5000 === 0) {
      const from = starts[Math.floor(step / 5000) % starts.length];
      state = run({ ...state, hero: createHero(LUKE_ARENA) }, ARENA_LAYOUT, ARENA.leaveSeconds + 0.1);
      state = { ...state, hero: createHero(LUKE_ARENA, { x: from.x, z: from.z, yaw: 0 }) };
    }
    if (step % 17 === 0) input = { moveX: random() < 0.35 ? 0 : random() * 2 - 1, moveZ: random() < 0.35 ? 0 : random() * 2 - 1, jump: random() < 0.15, power: random() < 0.2,
      action: random() < 0.15, pounce: random() < 0.05, sidekick: random() < 0.5, aimX: random() * 2 - 1, aimZ: random() * 2 - 1 };
    const previous = state;
    state = stepArena(state, input, STEP, ARENA_LAYOUT);
    const hero = state.hero, dad = state.sidekick;
    assert.ok(Number.isFinite(hero.x) && Number.isFinite(hero.y) && Number.isFinite(hero.z), 'finite');
    assert.ok(hero.x >= LUKE_ARENA.bounds.minX && hero.x <= LUKE_ARENA.bounds.maxX && hero.z >= LUKE_ARENA.bounds.minZ && hero.z <= LUKE_ARENA.bounds.maxZ, 'in bounds');
    assert.ok(hero.y >= -1e-6 && hero.y < 40, `height ${hero.y}`);
    if (!state.pounceId && state.oop !== 'dive') worst = Math.max(worst, penetration(hero, LUKE_ARENA).depth);
    // The sidekick is always somewhere he is allowed to be.
    assert.ok(Number.isFinite(dad.x) && Number.isFinite(dad.z) && Number.isFinite(dad.yaw), 'sidekick finite');
    assert.equal(sidekickFree(ARENA_LAYOUT, dad.x, dad.z), true, `sidekick clear at ${dad.x}, ${dad.z} on step ${step}`);
    assert.ok(dad.x < stealth.minX || dad.z < stealth.minZ, 'never on the stealth floor');
    assert.ok(dad.cooldown >= 0 && dad.cooldown <= ARENA.oopCooldown && dad.timer >= 0 && dad.stuck >= 0 && dad.stuck < ARENA.zipStuck + STEP);
    if (state.trial === 'stealth' && previous.trial === 'stealth' && dad.timer <= 0) { assert.equal(dad.mode, 'wait'); waited++; }
    // An alley-oop never lasts longer than its parts, and nothing touches Luke while it does.
    inOop = state.oop !== '' ? inOop + 1 : 0;
    longestOop = Math.max(longestOop, inOop);
    if (previous.oop !== '') { assert.equal(state.events & (ARENA_EVENT.hit | ARENA_EVENT.caught | ARENA_EVENT.bonk), 0, 'untouchable in the air'); assert.equal(state.energy, previous.energy); }
    if (state.oop !== 'dive') assert.deepEqual(state.diveIds, []);
    for (const robot of state.robots) {
      assert.ok(Number.isFinite(robot.x) && Number.isFinite(robot.z) && robot.sparks >= 0 && robot.hold >= 0);
      if (robot.stunned) assert.ok(robot.hold > 0 && !robot.tethered, 'a stun is a hold');
      const zone = ZONES.find(candidate => candidate.id === ROBOTS.find(item => item.id === robot.id)!.trial)!;
      assert.ok(robot.x >= zone.minX - 1e-9 && robot.x <= zone.maxX + 1e-9 && robot.z >= zone.minZ - 1e-9 && robot.z <= zone.maxZ + 1e-9, `${robot.id} stays in its zone`);
    }
    if (state.events & ARENA_EVENT.toss) toss++;
    if (state.events & ARENA_EVENT.hang) hang++;
    if (state.events & ARENA_EVENT.dive) dive++;
    if (state.events & ARENA_EVENT.stun) stun++;
    if (state.events & ARENA_EVENT.zip) zip++;
    assert.deepEqual(mergeProgress(ARENA_LAYOUT, before, state.progress), state.progress, 'rewards only grow');
    before = state.progress;
  }
  assert.ok(worst < 0.05, `Luke stayed outside every solid: ${worst}`);
  assert.ok(longestOop <= steps(ARENA.oopRiseMax + ARENA.oopHang + ARENA.diveLong) + 3, `longest alley-oop ${longestOop * STEP}s`);
  assert.ok(toss > 15 && dive > 3 && hang >= dive && stun > 10, `the walk used the sidekick: ${toss} throws, ${hang} moments, ${dive} dives, ${stun} stuns`);
  assert.ok(zip >= 1 && waited > 1000, `he hopped ${zip} times and waited at the gate for ${waited} steps`);
});
