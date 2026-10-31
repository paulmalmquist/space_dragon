import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CRASH_TIMING, CrashSequence, evaluateImpact, sweepAsteroidImpact } from '../src/prototypes/dogfight/systems/crash.js';
import { CrashEffects } from '../src/prototypes/dogfight/assets/crash-effects.js';

const vector = (x, y, z) => new THREE.Vector3(x, y, z);
const rock = (id, x, y, z, radius) => ({ id, center: vector(x, y, z), radius });
const near = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

test('a swept hull hits the nearest asteroid instead of tunneling through at boost speed', () => {
  const start = vector(0, 0, 0), end = vector(0, 0, -148);
  const far = rock('far', 0, 0, -100, 10), nearRock = rock('near', 0, 0, -45, 8);
  const hit = sweepAsteroidImpact(start, end, [far, nearRock], 3.3);
  assert.equal(hit.id, 'near'); near(hit.t, (45 - 11.3) / 148);
  near(hit.point.z, -33.7); assert.deepEqual(hit.normal.toArray(), [0, 0, 1]);
  near(hit.contactPoint.distanceTo(nearRock.center), nearRock.radius);
  near(hit.safePosition.distanceTo(nearRock.center), nearRock.radius + 3.3 + .05);
  assert.deepEqual(start.toArray(), [0, 0, 0]); assert.deepEqual(end.toArray(), [0, 0, -148]);
  assert.deepEqual(nearRock.center.toArray(), [0, 0, -45]);
});

test('sweeps distinguish misses, tangency, moving away, inside starts and invalid colliders', () => {
  const asteroid = rock(1, 0, 0, 0, 4);
  assert.equal(sweepAsteroidImpact(vector(10, 0, 0), vector(20, 0, 0), [asteroid], 1), null);
  assert.equal(sweepAsteroidImpact(vector(-10, 6, 0), vector(10, 6, 0), [asteroid], 1), null);
  const tangent = sweepAsteroidImpact(vector(-10, 5, 0), vector(10, 5, 0), [asteroid], 1);
  near(tangent.t, .5); assert.deepEqual(tangent.normal.toArray(), [0, 1, 0]);
  const inside = sweepAsteroidImpact(vector(0, 0, 0), vector(0, 0, -10), [asteroid], 1);
  assert.equal(inside.t, 0); near(inside.normal.distanceTo(vector(0, 0, 1)), 0);
  const stillInside = sweepAsteroidImpact(vector(0, 0, 0), vector(0, 0, 0), [asteroid], 1);
  assert.deepEqual(stillInside.normal.toArray(), [0, 1, 0]);
  assert.equal(sweepAsteroidImpact(vector(NaN, 0, 0), vector(0, 0, 0), [asteroid]), null);
  assert.equal(sweepAsteroidImpact(vector(10, 0, 0), vector(0, 0, 0), [rock(2, NaN, 0, 0, 5), rock(3, 0, 0, 0, -1)]), null);
  assert.throws(() => sweepAsteroidImpact(vector(0, 0, 0), vector(0, 0, -10), [], -1), RangeError);
});

test('impact severity follows inward speed: a fast graze deflects while a head-on boost destroys hull', () => {
  const velocity = vector(140, 0, -12), normal = vector(0, 0, 1);
  const graze = evaluateImpact(velocity, normal, 100);
  assert.equal(graze.fatal, false); assert.ok(graze.damage >= 12 && graze.damage <= 35);
  assert.equal(graze.normalSpeed, 12); assert.ok(graze.deflectedVelocity.dot(normal) > 0);
  assert.ok(graze.deflectedVelocity.x > 100 && graze.deflectedVelocity.x < velocity.x);
  const heavy = evaluateImpact(vector(0, 0, -148), normal, 100);
  assert.equal(heavy.fatal, true); assert.ok(heavy.damage >= 100);
  assert.equal(evaluateImpact(velocity, normal, graze.damage).fatal, true);
  assert.deepEqual(velocity.toArray(), [140, 0, -12]); assert.deepEqual(normal.toArray(), [0, 0, 1]);
  assert.throws(() => evaluateImpact(vector(NaN, 0, 0), normal, 100), TypeError);
  assert.throws(() => evaluateImpact(velocity, vector(0, 0, 0), 100), TypeError);
});

test('minor contact is resolved outside the rock and outward deflection does not immediately tunnel back in', () => {
  const asteroid = rock('surface', 0, 0, -30, 10);
  const impact = sweepAsteroidImpact(vector(0, 0, 0), vector(0, 0, -20), [asteroid], 3.3);
  const result = evaluateImpact(vector(0, 0, -35), impact.normal, 100);
  assert.equal(result.fatal, false);
  assert.ok(impact.safePosition.distanceTo(impact.point) < .051);
  const next = impact.safePosition.clone().addScaledVector(result.deflectedVelocity, .05);
  assert.equal(sweepAsteroidImpact(impact.safePosition, next, [asteroid], 3.3), null);
});

test('crash stages retain an observable mechanical sequence and emit recovery exactly once', () => {
  const crash = new CrashSequence(), origin = vector(1, 2, 3), velocity = vector(0, 0, -148);
  assert.equal(crash.begin({ cause: 'asteroid', colliderId: 'a-1', point: origin, velocity }), true);
  assert.equal(crash.begin({ cause: 'hull failure', point: vector(99, 0, 0) }), false);
  assert.equal(crash.snapshot().stage, 'impact');
  crash.update(.3); assert.equal(crash.snapshot().stage, 'rupture');
  crash.update(.7); assert.equal(crash.snapshot().stage, 'tumble'); assert.equal(crash.snapshot().pose.modelVisible, true);
  assert.notEqual(crash.snapshot().pose.roll, 0);
  crash.update(.8); assert.equal(crash.snapshot().stage, 'wreckage'); assert.equal(crash.snapshot().pose.modelVisible, false);
  const outcome = crash.update(5);
  assert.equal(outcome.recovery, true); assert.deepEqual(outcome.events, [{ type: 'recover', id: 1, cause: 'asteroid' }]);
  assert.equal(crash.active, false); assert.equal(crash.elapsed, CRASH_TIMING.duration);
  assert.deepEqual(crash.update(1).events, []); assert.equal(crash.begin({}), false);
  assert.deepEqual(origin.toArray(), [1, 2, 3]); assert.deepEqual(velocity.toArray(), [0, 0, -148]);
});

test('pause and snapshot mutation cannot advance or rewrite a crash; retry permits a fresh sequence', () => {
  const crash = new CrashSequence(); crash.begin({ point: vector(0, 0, -40), velocity: vector(0, 0, -100) }); crash.update(.4);
  const paused = crash.snapshot();
  crash.update(0); crash.update(NaN); crash.update(-1); assert.deepEqual(crash.snapshot(), paused);
  const altered = crash.snapshot(); altered.pose.offset[0] = 999; altered.point[0] = 999; altered.stage = 'recovery';
  assert.deepEqual(crash.snapshot(), paused);
  crash.reset(); assert.equal(crash.snapshot().stage, 'idle'); assert.equal(crash.snapshot().active, false);
  assert.equal(crash.begin({ cause: 'hull failure' }), true); assert.equal(crash.snapshot().id, 2);
});

test('reduced motion uses a short stationary impact with no model spin or drifting pose', () => {
  const crash = new CrashSequence(); crash.begin({ velocity: vector(0, 0, -148), reducedMotion: true });
  assert.equal(crash.duration, .8);
  crash.update(.2); const pose = crash.snapshot().pose;
  assert.ok(pose.offset.every(value => value === 0)); assert.equal(pose.roll, 0); assert.equal(pose.pitch, 0);
  const outcome = crash.update(.6); assert.equal(outcome.recovery, true); assert.equal(crash.snapshot().stage, 'recovery');
});

test('crash progress and pose agree at 30 and 120 Hz', () => {
  const snapshots = [30, 120].map(fps => {
    const crash = new CrashSequence(); crash.begin({ velocity: vector(20, 0, -100) });
    for (let i = 0; i < fps; i++) crash.update(1 / fps);
    return crash.snapshot();
  });
  near(snapshots[0].elapsed, snapshots[1].elapsed); near(snapshots[0].pose.roll, snapshots[1].pose.roll);
  snapshots[0].pose.offset.forEach((value, index) => near(value, snapshots[1].pose.offset[index]));
});

test('mechanical crash effects use bounded red armor/strut batches and cannot change hull or source transforms', () => {
  const scene = new THREE.Scene(), effects = new CrashEffects(scene), position = vector(0, 2, -50), orientation = new THREE.Quaternion();
  const velocity = vector(0, 0, -148), health = { value: 100 };
  const crash = new CrashSequence(); crash.begin({ point: position, velocity });
  assert.equal(effects.start({ position, orientation, velocity, onDamage: () => { health.value = 0; } }), true);
  assert.equal(effects.start({ position, orientation, velocity }), false);
  assert.equal(effects.snapshot().armorPlates, 40); assert.equal(effects.snapshot().struts, 16);
  const color = new THREE.Color(); effects.plates.getColorAt(0, color); assert.ok(color.r > color.g * 4 && color.r > color.b * 4);
  for (let i = 0; i < 150; i++) { crash.update(1 / 60); effects.update(1 / 60, crash.snapshot()); }
  assert.equal(effects.snapshot().debris, 56); assert.equal(effects.snapshot().bursts, 3);
  assert.ok(effects.snapshot().particles > 0 && effects.snapshot().particles <= 144);
  assert.ok(effects.effects.items.some(item => item.type === 'smoke'));
  assert.equal(health.value, 100); assert.deepEqual(position.toArray(), [0, 2, -50]); assert.deepEqual(velocity.toArray(), [0, 0, -148]);
  assert.deepEqual(orientation.toArray(), [0, 0, 0, 1]);
  const paused = effects.items[0].position.toArray(); effects.update(0, crash.snapshot()); assert.deepEqual(effects.items[0].position.toArray(), paused);
  crash.update(1); effects.update(.1, crash.snapshot()); assert.equal(effects.snapshot().active, false); assert.equal(effects.snapshot().debris, 0);
  effects.dispose(); effects.dispose(); assert.equal(scene.children.length, 0); assert.equal(effects.start({}), false);
});

test('reduced-motion crash effects avoid repeated explosions and rapid spinning; clear is reusable', () => {
  const scene = new THREE.Scene(), effects = new CrashEffects(scene), crash = new CrashSequence();
  crash.begin({ reducedMotion: true }); effects.start({ position: vector(0, 0, 0), reducedMotion: true });
  assert.equal(effects.snapshot().debris, 9); assert.ok(effects.items.every(item => item.spin.lengthSq() === 0));
  for (let i = 0; i < 40; i++) { crash.update(1 / 60); effects.update(1 / 60, crash.snapshot()); }
  assert.equal(effects.snapshot().bursts, 1); effects.clear();
  assert.equal(effects.plates.count, 0); assert.equal(effects.struts.count, 0); assert.equal(effects.snapshot().particles, 0);
  assert.equal(effects.start({ position: vector(1, 2, 3) }), true); assert.equal(effects.snapshot().debris, 56);
  effects.dispose(); assert.equal(scene.children.length, 0);
});
