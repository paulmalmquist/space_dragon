import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Combat } from '../src/prototypes/dogfight/systems/combat.js';
import { LockBreath } from '../src/prototypes/dogfight/assets/lock-breath.js';
import { Flight } from '../src/prototypes/dogfight/systems/flight.js';
import { Aim } from '../src/prototypes/dogfight/systems/aim.js';

test('charged breath disables only selected live ships and repeated impact is harmless', () => {
  const drones = [0, 1, 2].map(id => ({ id, position: new THREE.Vector3(id * 30, 0, -100), health: 216, dead: false }));
  const disabled = [], hits = [];
  const squad = { drones, damage(drone, amount) { drone.health = Math.max(0, drone.health - amount); drone.dead = drone.health === 0; return drone.dead; } };
  const combat = new Combat(new THREE.Scene(), { burst() {} }, { disable() {} }, squad,
    drone => hits.push(drone.id), () => {}, drone => disabled.push(drone.id));
  assert.equal(combat.strikeLocked([1, 1], 1), 1);
  assert.equal(drones[1].dead, true); assert.equal(drones[0].health, 216); assert.equal(drones[2].health, 216);
  assert.equal(combat.strikeLocked([1], 1), 0); assert.equal(combat.strikeLocked([1], 2), 0);
  assert.equal(combat.strikeLocked([2], 1), 0); // A replay cannot expand its original target batch.
  assert.equal(drones[2].health, 216);
  assert.deepEqual(disabled, [1]); assert.deepEqual(hits, [1]); assert.equal(combat.breathHits, 1);
  assert.equal(combat.shots, 0); assert.equal(combat.hits, 0);
  assert.equal(combat.strikeLocked([0, 2], 3), 2); assert.deepEqual(disabled, [1, 0, 2]);
  assert.equal(combat.strikeLocked([0], NaN), 0); assert.equal(combat.strikeLocked(null, 3), 0);
  combat.reset(); assert.equal(combat.breathShots, 0); assert.equal(combat.breathHits, 0);
});

test('homing visual follows the authoritative clock and moving target without applying damage', () => {
  const scene = new THREE.Scene(), flight = new Flight();
  const target = { id: 1, position: new THREE.Vector3(80, 20, -200), health: 216, dead: false };
  const visual = new LockBreath(scene), squad = { drones: [target] };
  const burst = { id: 1, targetIds: [1], duration: .85, elapsed: .4 };
  visual.start(burst, flight, squad); const first = visual.paths[0].tip.position.clone();
  target.position.x += 100; visual.update(burst, flight, squad);
  assert.ok(visual.paths[0].tip.position.x > first.x);
  const paused = visual.paths[0].tip.position.clone(); visual.update(burst, flight, squad);
  assert.equal(paused.distanceTo(visual.paths[0].tip.position), 0);
  visual.update({ ...burst, elapsed: .85 }, flight, squad, true);
  assert.ok(visual.paths[0].tip.position.distanceTo(target.position) < 1e-9);
  assert.equal(target.health, 216); assert.equal(target.dead, false);
  visual.clear(); assert.equal(visual.paths.length, 0); assert.equal(visual.root.visible, false);
  visual.dispose(); assert.equal(scene.children.length, 0);
});

test('mouse aiming clamps to the usable view and leaves flight orientation untouched', () => {
  const flight = new Flight(), aim = new Aim();
  aim.setPointer(1000, 0, 1000, 600);
  assert.ok(aim.x > 0); assert.ok(aim.y > 0);
  assert.deepEqual(flight.forward.toArray(), [0, 0, -1]);
  aim.setPointer(500, 300, 1000, 600); assert.equal(aim.x, 0); assert.equal(aim.y, 0);
  aim.setPointer(NaN, 0, 1000, 600); assert.equal(aim.x, 0); assert.equal(aim.y, 0);
});

test('windup follows the muzzle with no beam, then holds a fire beam on the moving target', () => {
  const scene = new THREE.Scene(), flight = new Flight();
  const target = { id: 1, position: new THREE.Vector3(40, 0, -300) }, squad = { drones: [target] };
  const visual = new LockBreath(scene);
  const burst = { id: 4, targetIds: [1], elapsed: .3, windupDuration: .65, beamDuration: 1.1, duration: 1.75 };
  visual.start(burst, flight, squad);
  assert.equal(visual.paths[0].shell.visible, false); assert.equal(visual.paths[0].tip.visible, false);
  const before = visual.glow.position.clone(); flight.position.x = 8; visual.update(burst, flight, squad);
  assert.equal(visual.glow.position.x - before.x, 8);
  for (const elapsed of [1, 1.5]) {
    visual.update({ ...burst, elapsed }, flight, squad);
    assert.equal(visual.paths[0].shell.visible, true);
    assert.ok(visual.paths[0].tip.position.distanceTo(target.position) < 1e-9);
  }
  visual.dispose();
});
