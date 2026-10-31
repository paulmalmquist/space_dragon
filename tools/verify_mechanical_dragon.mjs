// Independent file-level comparison of the selected raw export and optimized
// flight candidate. It checks names/rest pivots and bind matrices, not only size.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { Matrix4, Vector3, Quaternion } from 'three';

const base = 'assets/game/local/spacecraft/space-dragon-spacecraft/';
const paths = process.argv.slice(2);
const rawPath = paths[0] || `${base}dragon-mechanical-v002-raw.glb`;
const finalPath = paths[1] || `${base}dragon-mechanical-red-v001.glb`;
async function load(path) {
  const buffer = await readFile(path);
  assert.equal(buffer.toString('ascii', 0, 4), 'glTF');
  const jsonLength = buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength));
  const binOffset = 20 + jsonLength + 8;
  const parents = new Map();
  gltf.nodes.forEach((node, index) => (node.children || []).forEach(child => parents.set(child, index)));
  const worlds = new Map();
  function world(index) {
    if (worlds.has(index)) return worlds.get(index);
    const node = gltf.nodes[index];
    const local = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
      new Vector3().fromArray(node.translation || [0, 0, 0]), new Quaternion().fromArray(node.rotation || [0, 0, 0, 1]),
      new Vector3().fromArray(node.scale || [1, 1, 1]));
    const result = parents.has(index) ? world(parents.get(index)).clone().multiply(local) : local;
    worlds.set(index, result); return result;
  }
  function floats(accessorIndex) {
    const accessor = gltf.accessors[accessorIndex], view = gltf.bufferViews[accessor.bufferView];
    assert.equal(accessor.componentType, 5126); assert.equal(accessor.type, 'MAT4');
    const values = [];
    for (let index = 0; index < accessor.count * 16; index++) values.push(buffer.readFloatLE(binOffset + (view.byteOffset || 0) + (accessor.byteOffset || 0) + index * 4));
    return values;
  }
  function accessorValues(accessorIndex) {
    const accessor = gltf.accessors[accessorIndex], view = gltf.bufferViews[accessor.bufferView];
    const width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[accessor.type];
    const [bytes, reader, divisor] = { 5121: [1, 'readUInt8', 255], 5123: [2, 'readUInt16LE', 65535], 5126: [4, 'readFloatLE', 1] }[accessor.componentType];
    const stride = view.byteStride || width * bytes, values = [];
    const offset = binOffset + (view.byteOffset || 0) + (accessor.byteOffset || 0);
    for (let index = 0; index < accessor.count; index++) for (let component = 0; component < width; component++) {
      const value = buffer[reader](offset + index * stride + component * bytes);
      values.push(accessor.normalized ? value / divisor : value);
    }
    return values;
  }
  return { path, gltf, buffer, world, floats, accessorValues, names: new Map(gltf.nodes.map((node, index) => [node.name, index])) };
}
const [raw, candidate] = await Promise.all([load(rawPath), load(finalPath)]);
const maxDifference = (a, b) => Math.max(...a.map((value, index) => Math.abs(value - b[index])));
const components = raw.gltf.nodes.filter(node => node.mesh !== undefined).map(node => node.name);
assert.equal(components.length, 706);
let maximumRestPivotError = 0;
for (const name of components) {
  assert.ok(candidate.names.has(name), `Missing component ${name}`);
  const index = candidate.names.get(name), node = candidate.gltf.nodes[index];
  assert.equal(node.extras?.sourceComponentName, name);
  const error = maxDifference(raw.world(raw.names.get(name)).elements, candidate.world(index).elements);
  maximumRestPivotError = Math.max(maximumRestPivotError, error);
  assert.ok(error < 1e-5, `${name}: rest pivot error ${error}`);
}
const bones = ['Root', 'Wing_L', 'Wing_R', 'Jaw', 'Tail_0', 'Tail_1', 'Tail_2', 'Tail_3', 'Tail_4'];
for (const name of bones) {
  assert.ok(raw.names.has(name) && candidate.names.has(name), `Missing bone ${name}`);
  assert.ok(maxDifference(raw.world(raw.names.get(name)).elements, candidate.world(candidate.names.get(name)).elements) < 1e-6, `Bone rest changed ${name}`);
}
assert.equal(raw.gltf.skins.length, 1); assert.equal(candidate.gltf.skins.length, 1);
assert.deepEqual(raw.floats(raw.gltf.skins[0].inverseBindMatrices), candidate.floats(candidate.gltf.skins[0].inverseBindMatrices));
assert.equal(candidate.gltf.skins[0].joints.length, 9);
let rigidBatches = 0, flexibleMeshes = 0;
for (const node of candidate.gltf.nodes.filter(node => node.mesh !== undefined)) {
  const primitive = candidate.gltf.meshes[node.mesh].primitives[0];
  if (node.extras?.batchBone) {
    const joints = candidate.accessorValues(primitive.attributes.JOINTS_0);
    const weights = candidate.accessorValues(primitive.attributes.WEIGHTS_0);
    const expected = candidate.gltf.skins[0].joints.findIndex(index => candidate.gltf.nodes[index].name === node.extras.batchBone);
    assert.ok(expected >= 0);
    for (let index = 0; index < weights.length; index++) if (weights[index] > 0) {
      assert.equal(joints[index], expected, `${node.name}: rigid batch attached to wrong bone`);
      assert.equal(weights[index], 1, `${node.name}: partial rigid weight`);
    }
    rigidBatches++;
  } else {
    const referenceNode = raw.gltf.nodes[raw.names.get(node.name)];
    const reference = raw.gltf.meshes[referenceNode.mesh].primitives[0];
    for (const attribute of ['POSITION', 'JOINTS_0', 'WEIGHTS_0']) {
      assert.deepEqual(candidate.accessorValues(primitive.attributes[attribute]), raw.accessorValues(reference.attributes[attribute]), `${node.name}: flexible geometry/weights changed (${attribute})`);
    }
    flexibleMeshes++;
  }
}
assert.equal(rigidBatches, 36); assert.equal(flexibleMeshes, 7);
function bounds(asset) {
  const minimum = [Infinity, Infinity, Infinity], maximum = [-Infinity, -Infinity, -Infinity];
  for (const mesh of asset.gltf.meshes) for (const primitive of mesh.primitives) {
    const accessor = asset.gltf.accessors[primitive.attributes.POSITION];
    for (let axis = 0; axis < 3; axis++) { minimum[axis] = Math.min(minimum[axis], accessor.min[axis]); maximum[axis] = Math.max(maximum[axis], accessor.max[axis]); }
  }
  return { minimum, maximum };
}
assert.deepEqual(bounds(raw), bounds(candidate));
assert.equal(candidate.gltf.nodes[candidate.names.get('socket_muzzle')].extras.role, 'mechanical_dragon_muzzle');
const muzzle = new Vector3().setFromMatrixPosition(candidate.world(candidate.names.get('socket_muzzle')));
assert.ok(muzzle.distanceTo(new Vector3(0, .5, -3.66)) < 1e-5, `Muzzle location ${muzzle.toArray()}`);
assert.equal((candidate.gltf.images || []).length, 0);
assert.equal(candidate.gltf.materials.length, 8);
assert.ok([...candidate.names.keys()].every(name => !name?.includes('Review Studio') && !name?.includes('__SOURCE_ONLY__')));
assert.ok(candidate.gltf.materials.filter(material => !material.emissiveFactor).every(material => {
  const [r, g, b] = material.pbrMetallicRoughness.baseColorFactor;
  return r > g * 3 && r > b * 3;
}), 'All non-emissive surfaces must use the owner red palette.');
for (const [name, strength] of [['SDM_Amber reactor light', 5], ['SDM_Eye hot core', 9]]) {
  const material = candidate.gltf.materials.find(item => item.name === name);
  assert.equal(material.extensions.KHR_materials_emissive_strength.emissiveStrength, strength);
  assert.equal(material.emissiveFactor[0], 1);
}
console.log(JSON.stringify({ result: 'PASS', path: finalPath, bytes: candidate.buffer.length,
  sha256: createHash('sha256').update(candidate.buffer).digest('hex'), preservedComponentNames: components.length,
  maximumRestPivotError, preservedBones: bones, inverseBindMatrices: 'identical', muzzle: muzzle.toArray(),
  meshes: candidate.gltf.meshes.length, primitives: candidate.gltf.meshes.reduce((sum, mesh) => sum + mesh.primitives.length, 0),
  rigidBatchesWithVerifiedWeights: rigidBatches, flexibleMeshesWithIdenticalGeometryAndWeights: flexibleMeshes,
  restGeometryBounds: bounds(candidate), images: 0, materials: 8, palette: 'red-v001',
  scope: 'Independent asset structure comparison; browser appearance/performance remain separate.' }, null, 2));
