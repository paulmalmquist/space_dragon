import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOME_BLOCK, HOUSES, roofSolids } from '../src/game/traversal/home-block.ts';
import { createHero, HERO_EVENT, IDLE_INPUT, selectAnchor, settleHero, stepHero, tetherSight } from '../src/game/traversal/hero.ts';
import type { HeroState } from '../src/game/traversal/hero.ts';
import { TRAVERSAL_STEP, TUNING } from '../src/game/traversal/tuning.ts';
import { clipBoom, isStandable, supportAt, topAt, waterAt } from '../src/game/traversal/world.ts';
import { fly, penetration, play, STEP } from './helpers/traversal.ts';

const W = HOME_BLOCK;
const T = TUNING;
function near(actual: number, expected: number, tolerance: number, label = '') {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label} ${actual} is not within ${tolerance} of ${expected}`);
}
const lawn = { x: 4, z: -8, yaw: 0 };
const street = { x: -26, z: -20, yaw: 0 };

test('the home block is well formed: unique ids, sane prisms, reachable anchors and safe footing', () => {
  const ids = new Set<string>();
  for (const solid of W.solids) {
    assert.equal(ids.has(solid.id), false, `duplicate solid ${solid.id}`);
    ids.add(solid.id);
    assert.ok(solid.minX < solid.maxX && solid.minZ < solid.maxZ && solid.minY < solid.maxY, `degenerate ${solid.id}`);
    if (solid.slope) assert.equal(Math.max(solid.slope.atMin, solid.slope.atMax), solid.maxY, `${solid.id} maxY is its highest edge`);
  }
  const anchorIds = new Set(W.anchors.map(anchor => anchor.id));
  assert.equal(anchorIds.size, W.anchors.length);
  for (const anchor of W.anchors) {
    assert.ok(anchor.y - anchor.floor >= T.handHeight + T.swingClearance + T.ropeMin - 1e-9, `${anchor.id} leaves room to hang`);
    assert.ok(anchor.x > W.bounds.minX && anchor.x < W.bounds.maxX && anchor.z > W.bounds.minZ && anchor.z < W.bounds.maxZ);
  }
  assert.equal(new Set(W.sparks.map(spark => spark.id)).size, 12);
  for (const spark of W.sparks) assert.ok(spark.y > 0.5 && spark.x > W.bounds.minX && spark.x < W.bounds.maxX, spark.id);
  const standable = (x: number, z: number) => isStandable(W, x, z, T.radius, T.stepHeight, T.height, T.placeReach);
  assert.equal(standable(W.spawn.x, W.spawn.z), true);
  for (const spot of W.recoveries) {
    assert.equal(standable(spot.x, spot.z), true, `${spot.id} is safe footing`);
    near(supportAt(W, spot.x, spot.z, 0, T.placeReach).height, spot.y, 1e-9, spot.id);
  }
  // Inside furniture, a wall, the pod, a car, the lake or outside the bounds is never a safe pose.
  for (const [x, z] of [[-4, 1], [-12, 3], [3.5, 0], [-20, 5.4], [30, 10], [200, 0], [7.7, 2.7], [NaN, 0]]) assert.equal(standable(x, z), false, `${x},${z}`);
  assert.equal(standable(28, 0), true, 'the dock is safe footing above the water');
});

test('gable roofs meet at the ridge and continue the wall line', () => {
  const [a, b] = roofSolids(HOUSES[0]);
  near(topAt(a, -8, 3), HOUSES[0].ridge, 1e-9);
  near(topAt(b, -8, 3), HOUSES[0].ridge, 1e-9);
  near(topAt(a, -8, -3), HOUSES[0].wall + 0.14, 1e-9, 'roof sits on the wall plate');
  assert.ok(topAt(a, -8, -3.6) < topAt(a, -8, -3));
  assert.ok(a.minY > T.height + 0.15, 'a person stands upright beneath the eave and the ceiling');
});

test('a step never mutates its input, ignores unusable time and is exactly repeatable', () => {
  const hero = createHero(W, lawn);
  const frozen = JSON.stringify(hero);
  for (const dt of [0, -1, NaN, Infinity]) assert.strictEqual(stepHero(W, hero, { moveX: 1, moveZ: 0, jump: true, power: true }, dt), hero);
  const script = [{ seconds: 0.4, moveX: 1, power: true }, { seconds: 0.3, jump: true }, { seconds: 2.5, jump: false, moveZ: 0.6 }];
  const first = play(hero, script);
  assert.equal(JSON.stringify(hero), frozen);
  assert.deepEqual(play(createHero(W, lawn), script), first);
  for (const value of Object.values(first)) if (typeof value === 'number') assert.ok(Number.isFinite(value));
});

test('a hero at rest is bit-stable: standing still never drifts position or facing', () => {
  // Found by a browser check on hosted CI: re-wrapping an unchanged yaw added rounding noise each step.
  for (const yaw of [0, 0.1404878048780487, -2.9, Math.PI, 1e-12]) {
    let hero = createHero(HOME_BLOCK, { x: -2, z: -1.5, yaw });
    const start = { x: hero.x, y: hero.y, z: hero.z, yaw: hero.yaw };
    for (let step = 0; step < 600; step++) hero = stepHero(HOME_BLOCK, hero, IDLE_INPUT);
    assert.deepEqual({ x: hero.x, y: hero.y, z: hero.z, yaw: hero.yaw }, start, `idle from yaw ${yaw}`);
  }
  // After a walk and a stop, the pose settles and then stays exactly where it is.
  let hero = play(createHero(HOME_BLOCK, { x: 4, z: -8, yaw: 0 }), [{ seconds: 0.6, moveX: 0.7, moveZ: 0.3 }, { seconds: 0.6, moveX: 0, moveZ: 0 }]);
  const rest = { x: hero.x, z: hero.z, yaw: hero.yaw };
  hero = play(hero, [{ seconds: 2 }]);
  assert.deepEqual({ x: hero.x, z: hero.z, yaw: hero.yaw }, rest);
  // Walking straight never picks up sideways travel.
  const walker = play(createHero(HOME_BLOCK, HOME_BLOCK.spawn), [{ seconds: 2, moveX: 1 }]);
  assert.equal(walker.z, HOME_BLOCK.spawn.z);
});

test('running builds and sheds speed quickly; suit power sprints; diagonals are not faster', () => {
  const run = play(createHero(W, lawn), [{ seconds: 1, moveX: 1 }]);
  near(run.vx, T.runSpeed, 1e-9);
  const sprint = play(createHero(W, lawn), [{ seconds: 1, moveX: 1, power: true }]);
  near(sprint.vx, T.sprintSpeed, 1e-9);
  const diagonal = play(createHero(W, street), [{ seconds: 1, moveX: 1, moveZ: 1 }]);
  near(Math.hypot(diagonal.vx, diagonal.vz), T.runSpeed, 1e-9);
  near(diagonal.yaw, Math.PI / 4, 1e-6, 'faces the direction of travel');
  const oversized = play(createHero(W, lawn), [{ seconds: 1, moveX: 40, moveZ: 0 }]);
  near(oversized.vx, T.runSpeed, 1e-9, 'input magnitude is bounded');
  const stopped = play(run, [{ seconds: 0.2, moveX: 0 }]);
  assert.equal(stopped.vx, 0);
  assert.ok(stopped.x - run.x < 0.3, 'stops within a stride');
  const garbage = play(createHero(W, lawn), [{ seconds: 0.5, moveX: NaN, moveZ: Infinity }]);
  assert.deepEqual([garbage.x, garbage.z, garbage.vx], [lawn.x, lawn.z, 0]);
});

test('walls, furniture, the pod and fences are solid; the doorway is open; contact slides', () => {
  const blocked = play(createHero(W, { x: -2, z: 2, yaw: 0 }), [{ seconds: 3, moveX: 1 }]);
  near(blocked.x, -0.6 - T.radius, 1e-6, 'east wall');
  const outside = play(createHero(W, { x: -2, z: 0, yaw: 0 }), [{ seconds: 1.2, moveX: 1 }]);
  assert.ok(outside.x > 1.5, 'walked out through the doorway');
  near(outside.y, 0.06, 1e-9, 'stepped down from the floor to the patio');
  const back = play(outside, [{ seconds: 1.4, moveX: -1 }]);
  assert.ok(back.x < -1 && Math.abs(back.y - 0.15) < 1e-9, 'stepped back up onto the floor');
  const desk = play(createHero(W, { x: -4, z: -0.5, yaw: 0 }), [{ seconds: 3, moveZ: 1 }]);
  near(desk.z, 0.45 - T.radius, 1e-6);
  const sofa = play(createHero(W, { x: -4, z: -0.5, yaw: 0 }), [{ seconds: 3, moveZ: -1 }]);
  near(sofa.z, -1.25 + T.radius, 1e-6);
  const pod = play(createHero(W, { x: 1, z: 0, yaw: 0 }), [{ seconds: 3, moveX: 1 }]);
  near(pod.x, 2.65 - T.radius, 1e-6);
  const fence = play(createHero(W, { x: 9, z: -3, yaw: 0 }), [{ seconds: 3, moveX: 1 }]);
  near(fence.x, 9.9 - T.radius, 1e-6);
  const gate = play(createHero(W, { x: 9, z: 0.4, yaw: 0 }), [{ seconds: 1, moveX: 1 }]);
  assert.ok(gate.x > 11, 'the gate in the east fence is open');
  const sliding = play(createHero(W, { x: -1.5, z: 1.4, yaw: 0 }), [{ seconds: 0.6, moveX: 1, moveZ: 1 }]);
  near(sliding.x, -0.6 - T.radius, 1e-6);
  assert.ok(sliding.z > 2.2, 'kept moving along the wall');
  for (const hero of [blocked, desk, sofa, pod, fence, sliding]) assert.ok(penetration(hero).depth < 1e-6);
});

test('a fast body cannot cross a thin wall, and the world bounds hold', () => {
  const thin = { ...W, solids: [{ id: 'thin', kind: 'wall' as const, minX: 6, maxX: 6.02, minZ: -20, maxZ: 20, minY: 0, maxY: 4 }], anchors: [] };
  let hero: HeroState = { ...createHero(thin, lawn), vx: T.maxSpeed, mode: 'air', y: 1.2 };
  for (let index = 0; index < 60; index++) hero = stepHero(thin, hero, IDLE_INPUT);
  assert.ok(hero.x <= 6 - T.radius + 1e-9);
  const edge = play(createHero(W, { x: -30, z: 28, yaw: 0 }), [{ seconds: 4, moveX: -1, moveZ: 1, power: true }]);
  near(edge.x, W.bounds.minX + T.radius, 1e-9);
  near(edge.z, W.bounds.maxZ + -T.radius, 1e-9);
});

test('jump height follows the held key; coyote time and buffering forgive timing; one hop per airtime', () => {
  let peak = 0;
  const track = (hero: HeroState) => { peak = Math.max(peak, hero.y); };
  play(createHero(W, lawn), [{ seconds: 0.05, jump: true }, { seconds: 1.5, jump: false }], W, track);
  const tap = peak;
  peak = 0;
  play(createHero(W, lawn), [{ seconds: 1.5, jump: true }], W, track);
  const held = peak;
  assert.ok(tap > 0.8 && tap < 1.1, `tap ${tap}`);
  assert.ok(held > 1.6 && held < 1.75, `held ${held}`);
  peak = 0;
  const hopped = play(createHero(W, lawn), [{ seconds: 0.35, jump: true }, { seconds: 0.05, jump: false }, { seconds: 0.1, jump: true }, { seconds: 0.1, jump: false },
    { seconds: 0.1, jump: true }, { seconds: 2, jump: false }], W, track);
  assert.ok(peak > 3.2 && peak < 3.6, `jump plus one hop ${peak}`);
  assert.equal(hopped.mode, 'ground');
  assert.equal(hopped.hopAvailable, true, 'landing restores the hop');
  // Coyote: run off the garage roof, then jump a moment after the edge.
  const edge = play(createHero(W, { x: 8.4, z: 7, yaw: 0, y: 4 }), [{ seconds: 0.2, moveX: 1 }]);
  assert.equal(edge.mode, 'ground');
  let left = edge;
  while (left.mode === 'ground') left = stepHero(W, left, { moveX: 1, moveZ: 0, jump: false, power: false });
  const late = play(left, [{ seconds: 0.08, moveX: 1 }, { seconds: STEP, jump: true }]);
  assert.ok(late.events & HERO_EVENT.jump, 'a late press still jumps');
  assert.equal(late.hopAvailable, true, 'and does not spend the hop');
  // Buffer: a press just before touchdown jumps on landing.
  let falling = play(createHero(W, lawn), [{ seconds: 0.1, jump: true }, { seconds: 0.2, jump: false }, { seconds: 0.05, jump: true }, { seconds: 0.2, jump: false }]);
  while (!(falling.mode === 'air' && falling.vy < 0 && falling.y < 0.25)) falling = stepHero(W, falling, IDLE_INPUT);
  let rebound = stepHero(W, falling, { ...IDLE_INPUT, jump: true });
  let jumps = 0;
  for (let index = 0; index < 20; index++) { rebound = stepHero(W, rebound, { ...IDLE_INPUT, jump: true }); if (rebound.events & HERO_EVENT.jump) jumps++; }
  assert.equal(jumps, 1, 'buffered press jumped once on landing');
});

test('the living-room ceiling stops a jump and the hero cannot leave over the cutaway walls', () => {
  let peak = 0;
  const hero = play(createHero(W, { x: -2, z: -1.5, yaw: 0 }), [{ seconds: 0.5, jump: true }, { seconds: 0.1, jump: false }, { seconds: 0.3, jump: true, moveX: 1 }, { seconds: 1.5, jump: false }],
    W, state => { peak = Math.max(peak, state.y + T.height); });
  const ceiling = W.solids.find(solid => solid.id === 'home-roof-a')!.minY;
  assert.ok(peak <= ceiling + 1e-9, `head ${peak} stayed under ${ceiling}`);
  assert.ok(hero.x <= -0.6 - T.radius + 1e-6, 'still inside the room');
});

test('the trampoline launches without a key press and its step lets a walker climb on', () => {
  let bounces = 0;
  let peak = 0;
  const hero = play(createHero(W, { x: 5.4, z: 3.1, yaw: 0 }), [{ seconds: 0.5, moveX: 1 }, { seconds: 0.6, moveX: 0 }], W, state => {
    if (state.events & HERO_EVENT.bounce) bounces++;
    peak = Math.max(peak, state.y);
  });
  assert.equal(bounces, 1);
  assert.ok(peak > 4.2, `bounced to ${peak}`);
  assert.equal(hero.cutEligible, false, 'a bounce is never cut short by a released key');
  const walled = play(createHero(W, { x: 7.7, z: 0.6, yaw: 0 }), [{ seconds: 1, moveZ: 1 }]);
  assert.ok(walled.z < 2 - T.radius + 1e-6, 'without the step the frame is too tall to walk onto');
});

test('roofs can be reached, walked over the ridge and passed beneath at the eave', () => {
  const under = play(createHero(W, { x: -9, z: -6, yaw: 0 }), [{ seconds: 2, moveZ: 1 }]);
  near(under.z, -3.1 - T.radius, 1e-6, 'walks under the overhang up to the wall');
  const ridge = createHero(W, { x: -9, z: 2.9, yaw: 0, y: 6 });
  near(ridge.y, topAt(W.solids.find(solid => solid.id === 'home-roof-a')!, -9, 2.9), 1e-9);
  let highest = 0;
  const over = play(ridge, [{ seconds: 1.4, moveZ: 1 }], W, state => { highest = Math.max(highest, state.y); assert.equal(state.mode, 'ground'); });
  near(highest, HOUSES[0].ridge, 0.02);
  assert.ok(over.z > 7 && over.y < 4, 'walked down the far slope');
  assert.match(over.groundId, /home-roof-b/);
});

test('tethers need an anchor above, in range, ahead and in sight', () => {
  const air = (x: number, y: number, z: number): HeroState => ({ ...createHero(W, lawn), x, y, z, mode: 'air' });
  assert.equal(selectAnchor(W, air(10, 1.5, 0.4), 1, 0)?.id, 'palm-dock');
  assert.equal(selectAnchor(W, air(14, 1.5, -24), 1, 0), null, 'anchors behind the direction of travel are ignored');
  assert.equal(selectAnchor(W, air(14, 1.5, -24), -0.7, 0.7)?.id, 'palm-shore-far-south');
  assert.equal(selectAnchor(W, air(10, 9, 0.4), 1, 0), null, 'the hand is already level with the anchors');
  assert.equal(selectAnchor(W, air(-33, 1.5, -29), 1, 0), null, 'out of range');
  assert.equal(selectAnchor(W, air(10, 1.5, 0.4), 1, 0, 'palm-dock')?.id, 'dock-lamp-1', 'an excluded anchor is skipped');
  const roofMast = W.anchors.find(anchor => anchor.id === 'roof-mast')!;
  assert.equal(tetherSight(W, 5, 5, 3, roofMast), true);
  assert.equal(tetherSight(W, -4, 1.6, 0, roofMast), false, 'the roof blocks a rope from inside the living room');
  assert.equal(selectAnchor(W, air(-4, 0.2, 0), 0.4, 0.9), null, 'so nothing can be tethered from indoors');
  const grounded = play(createHero(W, { x: 10.5, z: 0.4, yaw: 0 }), [{ seconds: 1, power: true }]);
  assert.equal(grounded.mode, 'ground');
  assert.equal(grounded.tetherId, '', 'suit power on the ground only sprints');
});

test('a swing keeps the rope taut and clear of the ground, then launches on the far side', () => {
  const anchor = W.anchors.find(candidate => candidate.id === 'palm-dock')!;
  let attached = false;
  let released = false;
  let lowest = Infinity;
  let longest = 0;
  const hero = play(createHero(W, { x: 7.4, z: 0.4, yaw: 0 }), [{ seconds: 0.1, moveX: 1, power: true }, { seconds: 0.3, jump: true }, { seconds: 3, jump: false }], W, state => {
    if (state.events & HERO_EVENT.attach && !attached) { attached = true; assert.equal(state.tetherId, 'palm-dock'); }
    if (state.events & HERO_EVENT.release) released = true;
    if (state.mode === 'swing' && state.tetherId === 'palm-dock') {
      lowest = Math.min(lowest, state.y);
      const length = Math.hypot(state.x - anchor.x, state.y + T.handHeight - anchor.y, state.z - anchor.z);
      assert.ok(length <= state.ropeLength + 1e-6, 'the hand never passes the end of the rope');
      longest = Math.max(longest, state.ropeLength);
    }
  });
  assert.ok(attached && released);
  assert.ok(lowest > anchor.floor + T.swingClearance - 0.35, `arc bottom ${lowest}`);
  assert.ok(longest <= T.tetherRange);
  assert.ok(hero.x > 17, 'carried out over the dock');
});

test('letting go, jumping off and the time limit all end a swing; a held key never loops forever', () => {
  const start = () => play(createHero(W, { x: 7.4, z: 0.4, yaw: 0 }), [{ seconds: 0.1, moveX: 1, power: true }, { seconds: 0.3, jump: true }, { seconds: 0.5, jump: false }]);
  const swinging = start();
  assert.equal(swinging.mode, 'swing');
  const dropped = stepHero(W, swinging, { moveX: 1, moveZ: 0, jump: false, power: false });
  assert.ok(dropped.events & HERO_EVENT.release);
  assert.equal(dropped.mode, 'air');
  assert.equal(dropped.hopAvailable, true);
  const leapt = stepHero(W, swinging, { moveX: 1, moveZ: 0, jump: true, power: true });
  assert.ok(leapt.events & HERO_EVENT.release);
  assert.ok(leapt.vy >= dropped.vy + 2, 'jumping off adds lift');
  // Steering straight at the anchor makes a dead hang; the swing still ends on its own.
  const anchor = W.anchors.find(candidate => candidate.id === 'palm-dock')!;
  let hero = swinging;
  let longestSwing = 0;
  let current = 0;
  for (let index = 0; index < 20 / STEP; index++) {
    const dx = anchor.x - hero.x;
    const dz = anchor.z - hero.z;
    const d = Math.hypot(dx, dz) || 1;
    hero = stepHero(W, hero, { moveX: dx / d, moveZ: dz / d, jump: false, power: true });
    current = hero.mode === 'swing' ? current + STEP : 0;
    longestSwing = Math.max(longestSwing, current);
  }
  assert.ok(longestSwing <= T.swingMaxTime + STEP, `longest unbroken swing ${longestSwing}`);
});

test('a perch anchor sets the hero down on its roof', () => {
  const flight = fly({ x: 5.2, z: 3.1, yaw: Math.PI / 2 }, [{ x: 7.7, z: 3.1, r: 0.5, power: false }, { x: -4, z: 3, r: 2 }], 8);
  assert.equal(flight.reached, true);
  assert.deepEqual(flight.events.filter(event => event.startsWith('attach')), ['attach:roof-mast']);
  assert.match(flight.hero.groundId, /^home-roof-/);
  assert.ok(flight.hero.y > 4.5);
});

test('the lake never traps or fails: a safety catch returns the hero to the nearest footing', () => {
  let caught = false;
  let recovered = false;
  const walker = play(createHero(W, { x: 15, z: 8, yaw: 0 }), [{ seconds: 1.2, moveX: 1 }, { seconds: 2, moveX: 0 }], W, state => {
    if (state.events & HERO_EVENT.catch) { caught = true; assert.ok(waterAt(W, state.x, state.z)); }
    if (state.events & HERO_EVENT.recover) recovered = true;
    if (state.mode === 'catch') assert.deepEqual([state.vx, state.vy, state.vz], [0, 0, 0]);
  });
  assert.ok(caught && recovered);
  assert.equal(walker.mode, 'ground');
  assert.equal(waterAt(W, walker.x, walker.z) === null || walker.y > 0, true);
  assert.ok(Math.hypot(walker.x - 15, walker.z - 8) < 8, 'set down near where the walk began');
  // Falling off the far end of the dock recovers on the dock, not back at the house.
  const diver = play(createHero(W, { x: 39, z: 0, yaw: 0 }), [{ seconds: 1.5, moveX: 1, power: true }, { seconds: 2.5, moveX: 0, power: false }]);
  assert.equal(diver.mode, 'ground');
  assert.equal(diver.groundId, 'dock-end');
  // Holding into the water repeats the catch; it never leaves the hero stuck below the surface.
  const stubborn = play(createHero(W, { x: 15, z: 8, yaw: 0 }), [{ seconds: 12, moveX: 1, power: true }]);
  assert.ok(stubborn.y > T.catchDepth - 3 && Number.isFinite(stubborn.x));
});

test('pausing cancels ground motion and held keys without dropping a tether or a fall', () => {
  const running = play(createHero(W, lawn), [{ seconds: 0.5, moveX: 1, power: true }]);
  const settled = settleHero(running);
  assert.deepEqual([settled.vx, settled.vz, settled.powerHeld, settled.jumpBuffer], [0, 0, false, 0]);
  assert.strictEqual(stepHero(W, settled, IDLE_INPUT).x, settled.x);
  const airborne = play(createHero(W, lawn), [{ seconds: 0.2, jump: true, moveX: 1 }]);
  const held = settleHero(airborne);
  assert.equal(held.vy, airborne.vy);
  assert.equal(held.jumpHeld, false);
});

test('every leg of the practice course is flyable without a catch and finds its sparks', () => {
  const legs = {
    yardToDock: fly({ x: 5, z: 0.4, yaw: 1.57 }, [{ x: 8.2, z: 0.4, r: 0.8, jump: true, hold: 0.4 }, { x: 13, z: 0.4, r: 2.5 }, { x: 38, z: 0, r: 2.5 }]),
    dockToNorthShore: fly({ x: 30, z: 0, yaw: 1.57 }, [{ x: 35.5, z: 0, r: 1.2, jump: true, hold: 0.4 }, { x: 40.4, z: 8.5, r: 3 }, { x: 37.6, z: 16.6, r: 3 }, { x: 31.6, z: 22.5, r: 3 }, { x: 24, z: 24.4, r: 3 }, { x: 12, z: 22.4, r: 3 }]),
    northShoreToRoof: fly({ x: 15, z: 21.5, yaw: -1.57 }, [{ x: 12, z: 21.3, r: 1, jump: true, hold: 0.4 }, { x: 4.6, z: 21.2, r: 2.5 }, { x: -6, z: 19, r: 2.5 }]),
    northRoofToSouthRoof: fly({ x: -6, z: 19, yaw: -1.57, y: 6 }, [{ x: -15.6, z: 19, r: 1.2, jump: true, hold: 0.4 }, { x: -23.6, z: 16, r: 3 }, { x: -23.7, z: 8, r: 3 }, { x: -23.6, z: 0, r: 3 },
      { x: -23.7, z: -8, r: 3 }, { x: -23.6, z: -15, r: 3 }, { x: -12, z: -17, r: 3 }]),
    southRoofToYard: fly({ x: -9, z: -17, yaw: 1.57, y: 6 }, [{ x: -2.4, z: -17, r: 1.2, jump: true, hold: 0.4 }, { x: 4.6, z: -17.2, r: 2.5 }, { x: 11.8, z: -17.6, r: 3 }, { x: 11.7, z: -8.9, r: 3 }, { x: 11.6, z: 0.4, r: 2 }]),
  };
  for (const [name, flight] of Object.entries(legs)) {
    assert.equal(flight.reached, true, `${name} stopped at waypoint ${flight.index}: ${flight.events.join(' ')}`);
    assert.equal(flight.catches, 0, `${name} needed a safety catch`);
    assert.ok(flight.maxSpeed <= T.maxSpeed + 1e-9 && flight.maxHeight < 12, `${name} stayed within sane speed and height`);
  }
  assert.ok(legs.yardToDock.sparks.includes('spark-09'));
  assert.ok(legs.dockToNorthShore.sparks.includes('spark-11'));
  assert.ok(legs.northRoofToSouthRoof.sparks.includes('spark-12') && legs.northRoofToSouthRoof.sparks.includes('spark-07'));
  assert.match(legs.northRoofToSouthRoof.hero.groundId, /^south-house-roof-/);
  assert.ok(legs.southRoofToYard.sparks.includes('spark-08'));
});

test('thousands of arbitrary inputs keep the hero finite, in bounds and outside every solid', () => {
  let seed = 20261115;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (const start of [W.spawn, { x: 7.7, z: -1, yaw: 0 }, { x: -20, z: 10, yaw: 0 }, { x: 30, z: 0, yaw: 0 }, { x: -9, z: 19, yaw: 0, y: 6 }]) {
    let hero = createHero(W, start);
    let input = { moveX: 0, moveZ: 0, jump: false, power: false };
    for (let step = 0; step < 24000; step++) {
      if (step % 24 === 0) {
        const angle = random() * Math.PI * 2;
        const strength = random() < 0.15 ? 0 : 1;
        input = { moveX: Math.sin(angle) * strength, moveZ: Math.cos(angle) * strength, jump: random() < 0.45, power: random() < 0.6 };
      }
      hero = stepHero(W, hero, input);
      assert.ok(Number.isFinite(hero.x + hero.y + hero.z + hero.vx + hero.vy + hero.vz + hero.yaw), `non-finite at step ${step}`);
      assert.ok(hero.x >= W.bounds.minX && hero.x <= W.bounds.maxX && hero.z >= W.bounds.minZ && hero.z <= W.bounds.maxZ, `out of bounds at ${step}`);
      assert.ok(hero.y > -8 && hero.y < 30, `height ${hero.y} at ${step}`);
      if (hero.mode !== 'catch') {
        const overlap = penetration(hero);
        assert.ok(overlap.depth < 0.02, `inside ${overlap.id} by ${overlap.depth} at step ${step} (${hero.x.toFixed(2)}, ${hero.y.toFixed(2)}, ${hero.z.toFixed(2)}) ${hero.mode}`);
      }
    }
  }
});

test('the camera boom stops at walls, sees over the cutaway indoors and ignores thin trunks', () => {
  const focus = { x: -2, y: 1.4, z: 0 };
  const west = { x: -9, y: 1.4, z: 0 };
  const full = clipBoom(W, focus, west, false);
  assert.ok(full > 0.6 && full < 0.8, `stops before the west wing at ${full}`);
  const high = clipBoom(W, focus, { x: -9, y: 3.4, z: 0 }, true);
  assert.equal(high, 1, 'indoors the camera may rise above the cut walls');
  assert.ok(clipBoom(W, focus, { x: -9, y: 3.4, z: 0 }, false) < 1, 'outdoors the roof and walls block it');
  assert.ok(clipBoom(W, focus, { x: -9, y: 0.5, z: 0 }, true) < 1, 'below the cut the wall still blocks');
  assert.equal(clipBoom(W, { x: 12.6, y: 2, z: 1 }, { x: 12.6, y: 2, z: 6 }, false), 1, 'a palm trunk does not pull the camera in');
  assert.equal(clipBoom(W, { x: 20, y: 6, z: -20 }, { x: 24, y: 8, z: -24 }, false), 1, 'open air is clear');
  assert.equal(TRAVERSAL_STEP, 1 / 120);
});
