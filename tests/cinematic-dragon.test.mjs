import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CINEMATIC_DRAGON, MECHANICAL_DRAGON, DRAGON_BONES, modelMuzzle, inspectDragon } from '../src/prototypes/dogfight/assets/dragon-model.js';
import { DragonAnimation } from '../src/prototypes/dogfight/animation/dragon.js';
import { refineModelMaterials } from '../src/prototypes/dogfight/assets/surface-materials.js';

const assetBytes = asset => readFile(`public/assets/dogfight/models/${asset.filename}`);
const jsonOf = bytes => JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8').trim());
async function loadGeometry(bytes) {
  // Node verifies actual geometry/skin/material bindings, not decoded pixels.
  // Installed-Chrome asset and gameplay checks exercise the embedded images.
  const loader = new GLTFLoader();
  loader.register(() => ({ name: 'UNIT_GEOMETRY_TEXTURE_STUB', loadTexture: () => Promise.resolve(new THREE.Texture()) }));
  return (await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
}

test('cinematic section exports six authored material roles and embedded normal/occlusion data separate from paint', async () => {
  const bytes = await assetBytes(CINEMATIC_DRAGON), raw = jsonOf(bytes);
  const roles = ['Dark painted armor', 'Crimson painted armor', 'Exposed directional metal',
    'Flexible graphite joints', 'Structured crimson membrane', 'Internal orange energy'];
  assert.deepEqual([...new Set(raw.materials.map(material => material.extras.surfaceRole))].sort(), [...roles].sort());
  assert.ok(raw.materials.every(material => material.extras.authoredSurface === true));
  for (const material of raw.materials) {
    const pbr = material.pbrMetallicRoughness, role = material.extras.surfaceRole;
    if (/painted/.test(role)) {
      assert.ok(pbr.metallicFactor < .1, `${role} paint became bare metal`);
      assert.ok(pbr.baseColorFactor.slice(0, 3).every(value => value > 0), 'pure black would hide the forms');
    }
    if (/Crimson|membrane/.test(role)) assert.ok(pbr.baseColorFactor[0] > pbr.baseColorFactor[1] * 5);
    if (/Exposed/.test(role)) assert.ok(pbr.metallicFactor > .9);
    if (/Flexible/.test(role)) assert.equal(pbr.metallicFactor, 0);
    if (material.name.endsWith('_Atlas')) {
      assert.ok(material.normalTexture); assert.ok(material.occlusionTexture); assert.ok(pbr.metallicRoughnessTexture);
      assert.equal(material.occlusionTexture.index, pbr.metallicRoughnessTexture.index, 'AO/roughness use separate channels in ORM');
      assert.notEqual(material.occlusionTexture.index, pbr.baseColorTexture?.index, 'AO must not multiply the source paint color');
    }
  }
  const energy = raw.materials.find(material => material.extras.surfaceRole === 'Internal orange energy');
  assert.ok(energy.emissiveFactor[0] > energy.emissiveFactor[1] * 5);
  assert.ok(energy.extensions.KHR_materials_emissive_strength.emissiveStrength > 1);
  assert.equal(raw.images.length, 2);
  const binaryStart = 20 + bytes.readUInt32LE(12) + 8;
  for (const image of raw.images) {
    assert.equal(image.uri, undefined); assert.equal(image.mimeType, 'image/png');
    const offset = binaryStart + (raw.bufferViews[image.bufferView].byteOffset || 0);
    assert.equal(bytes.subarray(offset + 1, offset + 4).toString(), 'PNG');
    assert.deepEqual([bytes.readUInt32BE(offset + 16), bytes.readUInt32BE(offset + 20)], [1024, 1024]);
  }
  for (const mesh of raw.meshes) for (const primitive of mesh.primitives) {
    if (raw.materials[primitive.material].normalTexture) {
      assert.ok(Number.isInteger(primitive.attributes.TEXCOORD_0));
      assert.ok(Number.isInteger(primitive.attributes.TANGENT), 'baked normals require exported tangent frames');
    }
  }
  assert.equal((raw.cameras || []).length, 0);
  assert.ok(!raw.extensionsUsed?.includes('KHR_lights_punctual'));
  assert.ok(!raw.nodes.some(node => /review studio|SD3_review|original.*comparison|organic.*recovery/i.test(node.name || '')));
});

test('cinematic mesh retains nine bone rest transforms, muzzle and working skin deformation', async () => {
  const [candidate, rollback] = await Promise.all([loadGeometry(await assetBytes(CINEMATIC_DRAGON)), loadGeometry(await assetBytes(MECHANICAL_DRAGON))]);
  candidate.updateMatrixWorld(true); rollback.updateMatrixWorld(true);
  const animation = new DragonAnimation(candidate), before = new DragonAnimation(rollback);
  assert.deepEqual(Object.keys(animation.bones).sort(), [...DRAGON_BONES].sort());
  for (const name of DRAGON_BONES) {
    const left = animation.bones[name].bone.matrixWorld.elements, right = before.bones[name].bone.matrixWorld.elements;
    assert.ok(left.every((value, index) => Math.abs(value - right[index]) < 1e-6), `${name} rest transform changed`);
  }
  assert.ok(modelMuzzle(candidate, CINEMATIC_DRAGON).distanceTo(new THREE.Vector3(...CINEMATIC_DRAGON.muzzle)) < 1e-6);
  const info = inspectDragon(candidate, CINEMATIC_DRAGON);
  assert.equal(info.id, CINEMATIC_DRAGON.id); assert.equal(info.meshes, 41); assert.equal(info.triangles, 81991);
  assert.equal(info.materials, 10); assert.ok(info.bounds.size[0] > 9.9 && info.bounds.size[0] < 10.2);
  const probes = Object.fromEntries(DRAGON_BONES.filter(name => name !== 'Root').map(name => [name, []]));
  candidate.traverse(mesh => {
    if (!mesh.isSkinnedMesh) return;
    mesh.skeleton.update();
    const joints = mesh.geometry.attributes.skinIndex, weights = mesh.geometry.attributes.skinWeight;
    for (let index = 0; index < joints.count; index++) for (let slot = 0; slot < 4; slot++) {
      const name = mesh.skeleton.bones[joints.getComponent(index, slot)]?.name;
      if (!probes[name] || probes[name].length >= 8 || weights.getComponent(index, slot) < .99) continue;
      probes[name].push({ mesh, index, rest: mesh.getVertexPosition(index, new THREE.Vector3()).clone() });
    }
  });
  animation.update(.6, .15, false, true, .8, { stage: 'beam', progress: .5 });
  candidate.updateMatrixWorld(true); candidate.traverse(mesh => { if (mesh.isSkinnedMesh) mesh.skeleton.update(); });
  for (const [name, samples] of Object.entries(probes)) {
    assert.ok(samples.length > 0, `missing skin weighted to ${name}`);
    assert.ok(samples.some(({ mesh, index, rest }) => mesh.getVertexPosition(index, new THREE.Vector3()).distanceTo(rest) > .001), `${name} skin did not articulate`);
  }
  const materials = refineModelMaterials(candidate, {}, 'mechanical');
  for (const [source, refined] of materials) {
    assert.equal(refined.normalMap, source.normalMap); assert.equal(refined.aoMap, source.aoMap);
    assert.equal(refined.roughnessMap, source.roughnessMap); assert.deepEqual(refined.color.toArray(), source.color.toArray());
    assert.equal(refined.emissiveIntensity, source.emissiveIntensity);
  }
});
