import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createDragonInstance, DRAGON_ATTACHMENTS } from '../src/prototypes/dogfight/assets/dragon-instance.js';
import { mouthPosition } from '../src/prototypes/dogfight/systems/aim.js';
import { dragonCollisionRadius } from '../src/prototypes/dogfight/systems/collision-shapes.js';
import { sweepAsteroidImpact } from '../src/prototypes/dogfight/systems/crash.js';
import { Flight } from '../src/prototypes/dogfight/systems/flight.js';

const asset = { id: 'test-contract', filename: 'fixture.glb', socket: 'socket_muzzle', muzzle: [0, .5, -3.66], attachmentContract: 1 };
function fixture() {
  const model = new THREE.Group(), bone = new THREE.Bone(); bone.name = 'head'; model.add(bone);
  model.add(new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4), new THREE.MeshStandardMaterial()));
  for (const name of Object.values(DRAGON_ATTACHMENTS)) {
    const node = new THREE.Object3D(); node.name = name;
    if (name === 'socket_muzzle') { node.position.fromArray(asset.muzzle); bone.add(node); }
    else { if (name === 'socket_ground') node.position.y = -.665; model.add(node); }
  }
  return { scene: model, animations: [], bone };
}

test('gameplay root preserves authored metres/forward/contact and animated mouth aligns through roll/bank', () => {
  const gltf = fixture(), instance = createDragonInstance(gltf, asset), flight = new Flight();
  assert.deepEqual(instance.root.scale.toArray(), [1, 1, 1]);
  assert.deepEqual(instance.coordinates.forward, [0, 0, -1]);
  assert.equal(instance.groundY, -.665);
  flight.position.set(9, 15, -40); flight.orientation.setFromEuler(new THREE.Euler(.3, .8, -.2));
  flight.bank = .6; flight.rollAngle = 1.4; flight.visualLift = .17;
  gltf.bone.rotation.y = .2;
  instance.sync(flight);
  assert.ok(mouthPosition(flight).distanceTo(instance.worldAttachment('mouth')) < 1e-10);
  assert.deepEqual(instance.root.position.toArray(), flight.position.toArray());
  assert.deepEqual(instance.root.quaternion.toArray(), flight.orientation.toArray());
  assert.ok(instance.localAttachment('mouth').distanceTo(new THREE.Vector3(...asset.muzzle)) > .1, 'must follow animated socket');
  assert.deepEqual(instance.snapshot().fallbackAttachments, []);
});

test('visual scale and wing animation cannot change the gameplay collision or swept time of impact', () => {
  const instance = createDragonInstance(fixture(), asset);
  const start = new THREE.Vector3(0, 0, 0), end = new THREE.Vector3(0, 0, -100);
  const rocks = [{ id: 'rock', center: new THREE.Vector3(0, 0, -50), radius: 4 }];
  const initial = sweepAsteroidImpact(start, end, rocks);
  instance.model.scale.set(15, .1, 30); instance.visual.rotation.z = 2;
  assert.equal(dragonCollisionRadius(), 3.3);
  assert.equal(dragonCollisionRadius('enemy-projectile'), 4.3);
  assert.equal(sweepAsteroidImpact(start, end, rocks).t, initial.t);
  assert.equal(instance.snapshot().collision.radius, 3.3);
});

test('new contract fails clearly for absent named nodes; rollback supports explicit fallback attachments', () => {
  const gltf = fixture(); gltf.scene.remove(gltf.scene.getObjectByName('socket_wing_l'));
  assert.throws(() => createDragonInstance(gltf, asset), /missing required attachment socket_wing_l/);
  const old = fixture(); old.scene.remove(old.scene.getObjectByName('socket_thruster_r'));
  const instance = createDragonInstance(old, { ...asset, attachmentContract: undefined });
  assert.deepEqual(instance.snapshot().fallbackAttachments, ['thrusterRight']);
  assert.throws(() => instance.localAttachment('unknown'), /Unknown dragon attachment/);
});
