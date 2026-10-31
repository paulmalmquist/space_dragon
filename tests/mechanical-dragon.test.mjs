import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DragonAnimation } from '../src/prototypes/dogfight/animation/dragon.js';
import { ACTIVE_DRAGON, MECHANICAL_DRAGON, LEGACY_DRAGON, DRAGON_BONES, modelMuzzle } from '../src/prototypes/dogfight/assets/dragon-model.js';
import { mouthPosition } from '../src/prototypes/dogfight/systems/aim.js';
import { Flight } from '../src/prototypes/dogfight/systems/flight.js';

test('muzzle binds an authored local socket and legacy fallback remains available', () => {
  const model = new THREE.Group(), socket = new THREE.Object3D(); socket.name = 'socket_muzzle';
  socket.position.set(0, .5, -3.66); model.add(socket);
  model.position.set(5, 2, -30); model.rotation.y = .4;
  const muzzle = modelMuzzle(model, MECHANICAL_DRAGON);
  assert.ok(muzzle.distanceTo(socket.position) < 1e-10);
  assert.ok(modelMuzzle(new THREE.Group(), LEGACY_DRAGON).distanceTo(new THREE.Vector3(0, .52, -3.12)) < 1e-10);
  assert.throws(() => modelMuzzle(new THREE.Group(), MECHANICAL_DRAGON), /socket_muzzle/);
});

test('aim, plasma and breath share a muzzle matching visual bank, roll, lift and flight orientation', () => {
  const flight = new Flight(); flight.position.set(11, 7, -20);
  flight.orientation.setFromEuler(new THREE.Euler(.2, .5, -.1));
  flight.bank = -.7; flight.rollAngle = 1.1; flight.visualLift = .14;
  flight.muzzleOffset = new THREE.Vector3(0, .5, -3.66);
  const root = new THREE.Group(), visual = new THREE.Group(), socket = new THREE.Object3D();
  root.position.copy(flight.position); root.quaternion.copy(flight.orientation);
  visual.rotation.z = flight.bank + flight.rollAngle; visual.position.y = flight.visualLift;
  socket.position.copy(flight.muzzleOffset); root.add(visual); visual.add(socket); root.updateMatrixWorld(true);
  assert.ok(mouthPosition(flight).distanceTo(socket.getWorldPosition(new THREE.Vector3())) < 1e-10);
  const before = flight.muzzleOffset.clone(); mouthPosition(flight);
  assert.equal(flight.muzzleOffset.distanceTo(before), 0);
});

test('red mechanical rollback loads with nine bones, authored palette, muzzle and no studio or hidden recovery meshes', async () => {
  const bytes = await readFile(`public/assets/dogfight/models/${MECHANICAL_DRAGON.filename}`);
  const raw = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8').trim());
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const model = gltf.scene, animation = new DragonAnimation(model);
  const size = new THREE.Box3().setFromObject(model, true).getSize(new THREE.Vector3());
  assert.ok(size.x > 9.9 && size.x < 10.2, `wrong wingspan ${size.x}`);
  assert.ok(size.z > 8.8 && size.z < 9.1, `wrong nose/tail length ${size.z}`);
  assert.deepEqual(Object.keys(animation.bones).sort(), [...DRAGON_BONES].sort());
  assert.ok(modelMuzzle(model, MECHANICAL_DRAGON).distanceTo(new THREE.Vector3(...MECHANICAL_DRAGON.muzzle)) < .001);
  assert.equal((raw.cameras || []).length, 0);
  assert.equal(raw.extensionsUsed?.includes('KHR_lights_punctual') || false, false);
  assert.ok(!raw.nodes.some(node => /review studio|sdm_review|sdm_key|sdm_rim|sdm_warm/i.test(node.name || '')));
  assert.ok(raw.materials.every(material => material.name.startsWith('SDM_')));
  assert.ok(raw.materials.some(material => /Petrol blue armor/.test(material.name) && material.pbrMetallicRoughness.metallicFactor > .7));
  // Material names retain source identity; the owner superseded its palette.
  for (const material of raw.materials.filter(material => !/reactor light|hot core/.test(material.name))) {
    const [red, green, blue] = material.pbrMetallicRoughness.baseColorFactor;
    assert.ok(red > green * 3 && red > blue * 3, `${material.name} did not receive the red palette`);
  }
  assert.ok(raw.materials.some(material => /Red composite wing/.test(material.name) && material.pbrMetallicRoughness.baseColorFactor[0] > material.pbrMetallicRoughness.baseColorFactor[2] * 3));
  const eyes = [];
  model.traverse(object => { if (object.isMesh) for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (/Amber reactor|Eye hot core/.test(material.name)) eyes.push(material); });
  assert.ok(eyes.length > 0); assert.ok(eyes.every(material => material.emissive.r > material.emissive.b && material.emissiveIntensity >= 5));

  // Test the exported skin itself, not only bone quaternions. Keep several
  // vertices per moving joint so a point on the hinge axis cannot hide a fault.
  const probes = Object.fromEntries(DRAGON_BONES.filter(name => name !== 'Root').map(name => [name, []]));
  model.updateMatrixWorld(true);
  model.traverse(mesh => {
    if (!mesh.isSkinnedMesh) return;
    mesh.skeleton.update();
    const joints = mesh.geometry.attributes.skinIndex, weights = mesh.geometry.attributes.skinWeight;
    for (let index = 0; index < joints.count; index++) {
      for (let slot = 0; slot < 4; slot++) {
        const name = mesh.skeleton.bones[joints.getComponent(index, slot)]?.name;
        if (!probes[name] || probes[name].length >= 8 || weights.getComponent(index, slot) < .99) continue;
        probes[name].push({ mesh, index, rest: mesh.getVertexPosition(index, new THREE.Vector3()).clone() });
      }
    }
  });
  animation.update(.6, .15, false, true, .8); model.updateMatrixWorld(true);
  model.traverse(mesh => { if (mesh.isSkinnedMesh) mesh.skeleton.update(); });
  for (const [name, samples] of Object.entries(probes)) {
    assert.ok(samples.length > 0, `no exported vertex weighted to ${name}`);
    const moved = samples.some(({ mesh, index, rest }) => mesh.getVertexPosition(index, new THREE.Vector3()).distanceTo(rest) > .001);
    assert.equal(moved, true, `exported ${name} geometry did not articulate`);
  }
});
