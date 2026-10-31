// Independent invariants across the retained red flight asset and a new section
// candidate. Format validation and visual/animation review remain separate.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const candidatePath = process.argv[2];
if (!candidatePath) throw new Error('Usage: node tools/verify-cinematic-dragon.mjs candidate.glb [reference.glb]');
const referencePath = process.argv[3] || 'public/assets/dogfight/models/dragon-mechanical-red-v001.glb';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const [reference, candidate] = await Promise.all([io.read(referencePath), io.read(candidatePath)]);
const original = reference.getRoot(), upgraded = candidate.getRoot();
const names = root => new Map(root.listNodes().map(node => [node.getName(), node]));
const before = names(original), after = names(upgraded);
const difference = (a, b) => Math.max(...a.map((value, index) => Math.abs(value - b[index])));
const componentNodes = original.listNodes().filter(node => node.getExtras().sourceComponentName);
assert.equal(componentNodes.length, 706, 'Reference must retain all original component markers.');
let pivotError = 0;
for (const node of componentNodes) {
  const next = after.get(node.getName());
  assert.ok(next, `Missing retained component name: ${node.getName()}`);
  const error = difference(node.getWorldMatrix(), next.getWorldMatrix());
  pivotError = Math.max(pivotError, error);
  assert.ok(error < 1e-5, `${node.getName()}: changed reference pivot by ${error}`);
}
const bones = ['Root', 'Wing_L', 'Wing_R', 'Jaw', 'Tail_0', 'Tail_1', 'Tail_2', 'Tail_3', 'Tail_4'];
for (const bone of bones) {
  assert.ok(after.has(bone), `Missing bone: ${bone}`);
  assert.ok(difference(before.get(bone).getWorldMatrix(), after.get(bone).getWorldMatrix()) < 1e-6, `Changed bone rest: ${bone}`);
}
assert.equal(upgraded.listSkins().length, 1);
const skin = upgraded.listSkins()[0], originalSkin = original.listSkins()[0];
assert.deepEqual(skin.listJoints().map(joint => joint.getName()), originalSkin.listJoints().map(joint => joint.getName()));
assert.deepEqual(skin.getInverseBindMatrices().getArray(), originalSkin.getInverseBindMatrices().getArray());
assert.ok(after.has('socket_muzzle'));
assert.ok(difference(after.get('socket_muzzle').getWorldMatrix(), before.get('socket_muzzle').getWorldMatrix()) < 1e-5, 'Muzzle changed without matching runtime placement.');
let primitives = 0, triangles = 0, weightedVertices = 0;
for (const mesh of upgraded.listMeshes()) for (const primitive of mesh.listPrimitives()) {
  primitives++;
  const position = primitive.getAttribute('POSITION'), joints = primitive.getAttribute('JOINTS_0'), weights = primitive.getAttribute('WEIGHTS_0');
  triangles += (primitive.getIndices()?.getCount() ?? position.getCount()) / 3;
  assert.ok(joints && weights, `${mesh.getName()}: missing articulation weights`);
  const j = joints.getArray(), w = weights.getArray();
  for (let index = 0; index < weights.getCount(); index++) {
    let sum = 0;
    for (let slot = 0; slot < 4; slot++) {
      const weight = w[index * 4 + slot]; sum += weight;
      assert.ok(Number.isFinite(weight) && weight >= 0);
      assert.ok(j[index * 4 + slot] < bones.length);
    }
    assert.ok(Math.abs(sum - 1) < 1e-4, `${mesh.getName()}: invalid weight sum ${sum}`);
    weightedVertices++;
  }
  const material = primitive.getMaterial();
  if (material?.getNormalTexture() || material?.getOcclusionTexture()) assert.ok(primitive.getAttribute('TEXCOORD_0'), `${mesh.getName()}: baked maps need UVs`);
  if (material?.getNormalTexture()) assert.ok(primitive.getAttribute('TANGENT'), `${mesh.getName()}: baked normal maps require matching exported tangents`);
}
const materials = upgraded.listMaterials();
const baked = materials.filter(material => material.getNormalTexture() && material.getOcclusionTexture());
assert.ok(baked.length > 0, 'Candidate must contain real embedded normal and AO maps.');
for (const material of baked) {
  assert.notEqual(material.getOcclusionTexture(), material.getBaseColorTexture(), `${material.getName()}: AO must remain separate from base color`);
  assert.ok(material.getExtras().authoredSurface, `${material.getName()}: authored surface marker is required to prevent runtime noise overrides`);
}
assert.equal(upgraded.listCameras().length, 0);
assert.ok(!upgraded.listNodes().some(node => /review studio|source.only|original organic|sdm_review camera/i.test(node.getName())), 'Source-only content leaked into game.');
const textures = upgraded.listTextures().map(texture => ({ name: texture.getName(), mime: texture.getMimeType(), size: texture.getSize(), bytes: texture.getImage()?.byteLength ?? 0 }));
assert.ok(textures.every(texture => texture.bytes > 0 && texture.size), 'Texture data must be embedded and identifiable.');
const bytes = await readFile(candidatePath);
const raw = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
assert.ok((raw.images ?? []).every(image => image.bufferView !== undefined && image.uri === undefined));
assert.ok(!raw.extensionsRequired?.length, 'New decoder requirements must be reviewed separately.');
console.log(JSON.stringify({ result: 'PASS', candidatePath, referencePath, bytes: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'), preservedComponentPivots: componentNodes.length, maxPivotError: pivotError,
  bones, inverseBindMatrices: 'identical', primitives, triangles, weightedVertices,
  materials: materials.map(material => ({ name: material.getName(), baseColor: material.getBaseColorFactor(), metallic: material.getMetallicFactor(), roughness: material.getRoughnessFactor(), normal: material.getNormalTexture()?.getName(), ao: material.getOcclusionTexture()?.getName() })),
  textures, nominalRGBA8TextureBytesWithMips: textures.reduce((sum, texture) => sum + texture.size[0] * texture.size[1] * 4 * 4 / 3, 0),
  scope: 'File-level structure, attachment, normalized weights, UV/map separation and embedded data. Actual texture appearance, rig motion and performance require browser checks.' }, null, 2));
