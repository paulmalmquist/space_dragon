import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { Flight } from '../src/prototypes/dogfight/systems/flight.js';
import { Aim, mouthPosition } from '../src/prototypes/dogfight/systems/aim.js';
import { Combat, segmentDistanceSq, assistedTarget } from '../src/prototypes/dogfight/systems/combat.js';
import { ChaseCamera } from '../src/prototypes/dogfight/systems/camera.js';
import { pointerStick } from '../src/prototypes/dogfight/systems/pointer.js';
import { CONFIG } from '../src/prototypes/dogfight/config.js';

function step(flight, keys, duration, fps = 60) {
  const frames = Math.ceil(duration * fps);
  for (let i = 0; i < frames; i++) flight.update(duration / frames, new Set(keys));
}
function cameraFor(flight) {
  const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1.6, .1, 35000);
  new ChaseCamera(camera).update(1, flight, true); return camera;
}
function combatFor(drones = [], onDamage = () => {}, onDisable = () => {}) {
  const squad = { drones, damage(d, amount) { d.health = Math.max(0, d.health - amount); d.dead = !d.health; return d.dead; } };
  return new Combat(new THREE.Scene(), { burst() {} }, { fire() {}, hit() {}, disable() {} }, squad, () => {}, onDamage, onDisable);
}
function drone(x, y, z, health = CONFIG.enemy.health) {
  return { position: new THREE.Vector3(x, y, z), velocity: new THREE.Vector3(), health, dead: false };
}
const near = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);

test('arrow steering turns, pitches and stabilizes; WADZ never steers the dragon', () => {
  const flight = new Flight(); step(flight, ['KeyW', 'KeyA', 'KeyD', 'KeyZ'], 1);
  assert.deepEqual(flight.forward.toArray(), [0, 0, -1]); near(flight.position.z, -54);
  step(flight, ['ArrowLeft'], 2.8); assert.ok(flight.forward.z > .9); assert.ok(flight.bank > .9);
  step(flight, [], 2); assert.ok(Math.abs(flight.bank) < .001); assert.ok(Math.abs(flight.yawRate) < .001);
  flight.reset(); step(flight, ['ArrowUp'], 1); assert.ok(flight.forward.y > .5);
  flight.reset(); step(flight, ['ArrowDown'], 1); assert.ok(flight.forward.y < -.5);
  flight.reset(); step(flight, ['ArrowRight'], 1); assert.ok(flight.forward.x > .5); assert.ok(flight.bank < -.9);
});

test('cruise clamps, temporary boost depletes and recharges', () => {
  const flight = new Flight(); step(flight, ['KeyR'], 10); assert.equal(flight.cruiseSpeed, CONFIG.flight.maxSpeed);
  step(flight, ['KeyF'], 10); assert.equal(flight.cruiseSpeed, CONFIG.flight.minSpeed);
  step(flight, ['ShiftLeft'], 4); assert.ok(flight.speed > 130); assert.ok(flight.boost < 1);
  step(flight, ['ShiftLeft'], 1); assert.equal(flight.boosting, false); assert.equal(flight.boostLocked, true);
  const spent = flight.boost; step(flight, [], 5); assert.ok(flight.boost > spent);
  flight.reset(); assert.equal(flight.speed, CONFIG.flight.cruiseSpeed); assert.equal(flight.boost, CONFIG.boost.capacity);
});

test('mouse flight-stick mapping has a dead zone, correct directions and safe edge clamps', () => {
  assert.deepEqual(pointerStick(500, 300, 1000, 600), { x: 0, y: 0 });
  assert.deepEqual(pointerStick(545, 275, 1000, 600), { x: 0, y: 0 });
  const half = pointerStick(750, 150, 1000, 600); near(half.x, .5); near(half.y, .5);
  assert.deepEqual(pointerStick(-500, 900, 1000, 600), { x: -1, y: -1 });
  assert.deepEqual(pointerStick(2000, -500, 1000, 600), { x: 1, y: 1 });
  assert.deepEqual(pointerStick(1, 1, 0, 0), { x: 0, y: 0 });
  assert.deepEqual(pointerStick(NaN, 1, 1000, 600), { x: 0, y: 0 });
});

test('mouse stick pitches and banks identically to arrows without moving the independent target', () => {
  const mouse = new Flight(), keyboard = new Flight(), aim = new Aim();
  const camera = cameraFor(mouse);
  for (let i = 0; i < 60; i++) {
    mouse.update(1 / 60, new Set(), { x: -1, y: 1 });
    keyboard.update(1 / 60, new Set(['ArrowLeft', 'ArrowUp']));
    aim.update(1 / 60, new Set(), camera, mouse);
  }
  near(mouse.position.distanceTo(keyboard.position), 0); near(mouse.forward.distanceTo(keyboard.forward), 0);
  assert.ok(mouse.forward.y > .5); assert.ok(mouse.bank > .9); assert.equal(aim.x, 0); assert.equal(aim.y, 0);
});

test('arrows override mouse on each held axis, including opposed keys and invalid stick data', () => {
  const flight = new Flight();
  for (let i = 0; i < 60; i++) flight.update(1 / 60, new Set(['ArrowLeft', 'ArrowDown']), { x: 1, y: 1 });
  assert.ok(flight.bank > .9); assert.ok(flight.forward.y < -.5);
  flight.reset();
  for (let i = 0; i < 60; i++) flight.update(1 / 60, new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']), { x: 1, y: 1 });
  assert.deepEqual(flight.forward.toArray(), [0, 0, -1]);
  flight.update(.1, new Set(), { x: NaN, y: Infinity }); assert.deepEqual(flight.forward.toArray(), [0, 0, -1]);
});

test('right-button zoom eases inward, wins over boost and releases to the appropriate FOV', () => {
  const flight = new Flight(), camera = cameraFor(flight), chase = new ChaseCamera(camera);
  const before = camera.fov; chase.update(1 / 60, flight, false, true);
  assert.ok(camera.fov < before && camera.fov > CONFIG.camera.zoomFov);
  for (let i = 0; i < 90; i++) chase.update(1 / 60, flight, false, true);
  near(camera.fov, CONFIG.camera.zoomFov, .001);
  flight.boosting = true; flight.speed = CONFIG.boost.speed; chase.update(1, flight, false, true); near(camera.fov, CONFIG.camera.zoomFov, .001);
  chase.update(1, flight); assert.ok(camera.fov > 70);
  flight.boosting = false; flight.speed = CONFIG.flight.cruiseSpeed; chase.update(1, flight); near(camera.fov, CONFIG.camera.fov, .02);
  chase.update(0, flight, true, true); assert.equal(camera.fov, CONFIG.camera.zoomFov);
  chase.update(0, flight, true); assert.equal(camera.fov, CONFIG.camera.fov);
});

test('WADZ aims in four screen directions, clamps, holds on release and X centers', () => {
  const flight = new Flight(), aim = new Aim(), camera = cameraFor(flight);
  for (let i = 0; i < 120; i++) aim.update(1 / 60, new Set(['KeyD', 'KeyW']), camera, flight);
  assert.equal(aim.x, CONFIG.aim.horizontalLimit); assert.equal(aim.y, CONFIG.aim.verticalLimit);
  const held = [aim.x, aim.y]; aim.update(1, new Set(), camera, flight); assert.deepEqual([aim.x, aim.y], held);
  aim.update(.2, new Set(['KeyA', 'KeyZ']), camera, flight); assert.ok(aim.x < held[0]); assert.ok(aim.y < held[1]);
  aim.update(0, new Set(['KeyX']), camera, flight); assert.equal(aim.x, 0); assert.equal(aim.y, 0);
  const before = aim.direction.clone(); aim.update(1, new Set(['ArrowLeft', 'ArrowUp']), camera, flight);
  assert.equal(aim.x, 0); assert.equal(aim.y, 0); near(before.distanceTo(aim.direction), 0);
});

test('reticle point projects to its chosen screen position and shots follow its ray', () => {
  const flight = new Flight(), aim = new Aim(), camera = cameraFor(flight), combat = combatFor();
  aim.update(.5, new Set(['KeyD', 'KeyW']), camera, flight);
  const projected = aim.point.clone().project(camera); near(projected.x, aim.x); near(projected.y, aim.y);
  assert.equal(combat.fire(flight, aim.direction), true);
  assert.ok(combat.lastShotDirection.x > .2); assert.ok(combat.lastShotDirection.y > 0);
  near(combat.pulses[0].velocity.clone().normalize().distanceTo(aim.direction), 0);
  near(segmentDistanceSq(aim.point, mouthPosition(flight), mouthPosition(flight).addScaledVector(aim.direction, 1000)), 0, 1e-20);
  assert.equal(combat.fire(flight, aim.direction), false); assert.equal(combat.shots, 1);
  combat.reset(); assert.equal(combat.lastShotDirection, null); assert.equal(combat.shots, 0); assert.equal(combat.pulses.length, 0);
});

test('assist cone follows manual aim rather than the dragon nose', () => {
  const flight = new Flight(), nose = drone(0, 0, -100), right = drone(85, 0, -100);
  const aim = right.position.clone().normalize();
  assert.equal(assistedTarget(flight, [nose, right], aim), right);
  assert.equal(assistedTarget(flight, [nose, right]), nose);
  right.dead = true; assert.equal(assistedTarget(flight, [nose, right], aim), null);
  right.dead = false; right.position.multiplyScalar(100); assert.equal(assistedTarget(flight, [right], aim), null);
});

test('manual off-axis fire actually hits a drone while the flight nose stays unchanged', () => {
  const flight = new Flight(), aim = new Aim(), camera = cameraFor(flight);
  aim.update(.5, new Set(['KeyD']), camera, flight);
  const target = drone(...mouthPosition(flight).addScaledVector(aim.direction, 100).toArray(), CONFIG.weapon.damage);
  const combat = combatFor([target]);
  assert.ok(target.position.x > 20); assert.deepEqual(flight.forward.toArray(), [0, 0, -1]);
  assert.equal(combat.fire(flight, aim.direction), true);
  combat.update(.3, flight); assert.equal(combat.hits, 1); assert.equal(target.dead, true);
});

test('barrel rolls complete in either direction, move the flight path and keep a stable chase horizon', () => {
  for (const direction of [-1, 1]) {
    const flight = new Flight(), camera = cameraFor(flight), chase = new ChaseCamera(camera);
    assert.equal(flight.requestRoll(direction), true); assert.equal(flight.requestRoll(-direction), false);
    step(flight, [], CONFIG.roll.duration / 4);
    assert.equal(flight.rollActive, true); assert.ok(flight.position.x * direction > .5); assert.ok(flight.position.y > .2);
    assert.ok(flight.rollAngle * direction < 0); assert.deepEqual(flight.up.toArray(), [0, 1, 0]);
    chase.update(.1, flight); assert.ok(camera.up.y > .999);
    step(flight, [], CONFIG.roll.duration); assert.equal(flight.rollActive, false); assert.equal(flight.rollsCompleted, 1);
    assert.equal(flight.rollAngle, 0); near(flight.position.x, 0); near(flight.position.y, 0);
    step(flight, [], CONFIG.roll.cooldown); assert.equal(flight.requestRoll(-direction), true);
    flight.reset(); assert.equal(flight.rollActive, false); assert.equal(flight.rollsCompleted, 0); assert.equal(flight.rollCooldown, 0);
  }
});

test('roll cooldown rejects chaining and normal steering still works during a roll', () => {
  const flight = new Flight(); assert.equal(flight.requestRoll(0), false);
  flight.requestRoll(1); step(flight, ['ArrowLeft'], CONFIG.roll.duration + .001);
  assert.ok(flight.forward.x < -.5); assert.equal(flight.rollsCompleted, 1); assert.equal(flight.requestRoll(1), false);
  step(flight, [], CONFIG.roll.cooldown + .001); assert.equal(flight.requestRoll(1), true);
});

test('roll duration/path and aim speed agree at 30 and 120 frames per second', () => {
  const states = [30, 120].map(fps => {
    const flight = new Flight(), aim = new Aim(), camera = cameraFor(flight);
    flight.requestRoll(-1); step(flight, [], CONFIG.roll.duration * .5, fps);
    for (let i = 0; i < fps; i++) aim.update(.4 / fps, new Set(['KeyD']), camera, flight);
    return { flight, aim };
  });
  near(states[0].flight.rollAngle, states[1].flight.rollAngle, 1e-12);
  near(states[0].flight.position.distanceTo(states[1].flight.position), 0, 1e-10);
  near(states[0].aim.x, states[1].aim.x, 1e-12);
});

test('swept projectiles damage/disable once and rolling does not grant damage immunity', () => {
  assert.equal(segmentDistanceSq(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-100, 0, 0), new THREE.Vector3(100, 0, 0)), 1);
  assert.equal(segmentDistanceSq(new THREE.Vector3(0, 0, 2), new THREE.Vector3(), new THREE.Vector3()), 4);
  const flight = new Flight(), target = drone(0, 0, -50, CONFIG.weapon.damage);
  let disabled = 0, damage = 0;
  const combat = combatFor([target], () => { damage++; }, () => { disabled++; });
  combat.spawn(new THREE.Vector3(), new THREE.Vector3(0, 0, -1), 1000);
  combat.update(.1, flight); assert.equal(disabled, 1); assert.equal(target.dead, true); assert.equal(combat.hits, 1);
  combat.spawn(new THREE.Vector3(), new THREE.Vector3(0, 0, -1), 1000);
  combat.update(.1, flight); assert.equal(disabled, 1);
  flight.requestRoll(1); combat.spawn(flight.position, new THREE.Vector3(0, 0, -1), 0, true);
  combat.update(.01, flight); assert.equal(damage, 1);
  combat.reset(); assert.equal(combat.pulses.length, 0);
});

test('migrated dragon keeps its weighted nine-bone skeleton and embedded images', () => {
  const bytes = fs.readFileSync(new URL('../public/assets/dogfight/models/dragon.glb', import.meta.url));
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
  assert.equal(gltf.skins.length, 1); assert.equal(gltf.skins[0].joints.length, 9);
  assert.ok(gltf.nodes.filter(node => node.skin !== undefined).length >= 60);
  assert.ok(gltf.images.every(image => image.bufferView !== undefined));
  for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
    assert.ok(primitive.attributes.WEIGHTS_0 !== undefined); assert.ok(primitive.attributes.JOINTS_0 !== undefined);
  }
});
