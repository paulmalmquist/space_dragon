// Lossless welding for the generator-owned organic v007 candidate. No prune,
// join, simplification, quantization, image processing or animation resampling.
// Explicitly unlink unused samplers left by the exporter channel filter; omit
// their orphan accessors during serialization. Referenced samples remain exact.
// Preserve raw Blender output, the pre-weld GLB and its complete export receipt.
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {weld} from '@gltf-transform/functions';
import {parseEmbeddedGlb, verifyVioletDragon} from './verify-violet-dragon.mjs';

const rootPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const relativeFolder = 'assets/game/local/spacecraft/space-dragon-spacecraft/violet-v007';
const folder = path.join(rootPath, relativeFolder);
const final = path.join(folder, 'dragon-violet-v007.glb');
const receiptPath = path.join(folder, 'export-receipt.json');
const rawPath = path.join(folder, 'dragon-violet-v007-raw.glb');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const relative = file => path.relative(rootPath, file).split(path.sep).join('/');
const args = process.argv.slice(2);
assert(args.every(arg => arg === '--trial'), 'Usage: node tools/optimize-violet-dragon.mjs [--trial]');
const trialOnly = args.includes('--trial');

function binaryChunk(bytes) {
  const offset = 20 + bytes.readUInt32LE(12);
  assert.equal(bytes.readUInt32LE(offset+4), 0x004e4942);
  return bytes.subarray(offset+8, offset+8+bytes.readUInt32LE(offset));
}
function imageIdentities(raw, bytes) {
  const binary = binaryChunk(bytes);
  return (raw.images ?? []).map(image => {
    const view = raw.bufferViews[image.bufferView];
    return hash(binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0)+view.byteLength));
  });
}
function retainExactJson(original, serialized) {
  const before = parseEmbeddedGlb(original), after = parseEmbeddedGlb(serialized);
  const originalNodes = new Map(before.nodes.map(node => [node.name, node]));
  assert.equal(after.nodes.length, originalNodes.size);
  for (const node of after.nodes) {
    const source = originalNodes.get(node.name); assert(source, `Unknown serialized node ${node.name}`);
    // NodeIO drops almost-unit scale factors. Preserve even that small source
    // difference so sockets and the inverse-bind relationship remain exact.
    for (const field of ['translation','rotation','scale','matrix']) {
      delete node[field]; if (field in source) node[field] = source[field];
    }
  }
  // Image order/bytes and material order are verified before restoring exact
  // original material/texture/sampler JSON. This also preserves sampler defaults
  // and extension definitions while avoiding dependence on texture index order.
  assert.deepEqual(imageIdentities(after, serialized), imageIdentities(before, original));
  assert.deepEqual(after.materials.map(m => m.name), before.materials.map(m => m.name));
  for (const field of ['materials','textures','samplers']) {
    delete after[field]; if (field in before) after[field] = before[field];
  }
  const text = Buffer.from(JSON.stringify(after));
  const encoded = Buffer.concat([text, Buffer.alloc((4-text.length%4)%4, 0x20)]);
  const binary = binaryChunk(serialized), header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
  header.write('glTF'); header.writeUInt32LE(2,4); header.writeUInt32LE(28+encoded.length+binary.length,8);
  header.writeUInt32LE(encoded.length,12); header.writeUInt32LE(0x4e4f534a,16);
  binHeader.writeUInt32LE(binary.length); binHeader.writeUInt32LE(0x004e4942,4);
  return Buffer.concat([header,encoded,binHeader,binary]);
}

async function preserve(file, bytes) {
  try {
    assert((await readFile(file)).equals(bytes), `Refusing to overwrite a changed preserved candidate: ${relative(file)}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await writeFile(file, bytes, {flag: 'wx'});
  }
}
const arrayHash = accessor => {
  const array = accessor.getArray();
  return {type: accessor.getType(), normalized: accessor.getNormalized(),
    componentType: accessor.getComponentType(), count: accessor.getCount(),
    sha256: hash(Buffer.from(array.buffer, array.byteOffset, array.byteLength))};
};

// Index values change during welding; indexed triangle-corner attribute values
// must remain byte-identical, including normals, UVs, tangents and skin weights.
function expandedGeometry(document) {
  return document.getRoot().listMeshes().map(mesh => ({name: mesh.getName(),
    primitives: mesh.listPrimitives().map(primitive => {
      assert.equal(primitive.listTargets().length, 0, 'Morph targets need an explicit preservation check');
      const indices = primitive.getIndices()?.getArray();
      return {mode: primitive.getMode(), material: primitive.getMaterial()?.getName(),
        attributes: primitive.listSemantics().sort().map(semantic => {
          const accessor = primitive.getAttribute(semantic), array = accessor.getArray();
          const stride = accessor.getElementSize() * array.BYTES_PER_ELEMENT;
          const source = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
          const count = indices?.length ?? accessor.getCount();
          const expanded = Buffer.allocUnsafe(count * stride);
          for (let i = 0; i < count; i++) {
            const offset = (indices ? indices[i] : i) * stride;
            source.copy(expanded, i * stride, offset, offset + stride);
          }
          return {semantic, componentType: accessor.getComponentType(), type: accessor.getType(),
            normalized: accessor.getNormalized(), corners: count, sha256: hash(expanded)};
        })};
    })}));
}

function identity(document) {
  const root = document.getRoot();
  return {
    nodes: root.listNodes().map(node => ({name: node.getName(),
      parent: node.getParentNode()?.getName() ?? null, children: node.listChildren().map(n => n.getName()),
      matrix: node.getMatrix(), mesh: node.getMesh()?.getName() ?? null,
      skin: node.getSkin()?.getName() ?? null, extras: node.getExtras()})),
    skins: root.listSkins().map(skin => ({name: skin.getName(), joints: skin.listJoints().map(n => n.getName()),
      inverseBind: arrayHash(skin.getInverseBindMatrices())})),
    textures: root.listTextures().map(texture => ({name: texture.getName(), mime: texture.getMimeType(),
      size: texture.getSize(), extras: texture.getExtras(), sha256: hash(texture.getImage())})),
    animations: root.listAnimations().map(clip => ({name: clip.getName(), extras: clip.getExtras(),
      channels: clip.listChannels().map(channel => ({node: channel.getTargetNode().getName(),
        path: channel.getTargetPath(), interpolation: channel.getSampler().getInterpolation(),
        input: arrayHash(channel.getSampler().getInput()), output: arrayHash(channel.getSampler().getOutput())}))})),
  };
}

function vertexStorage(document) {
  const positions = new Set(), attributes = new Set();
  for (const mesh of document.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
    positions.add(primitive.getAttribute('POSITION'));
    for (const accessor of primitive.listAttributes()) attributes.add(accessor);
  }
  return {uniquePositionAccessors: positions.size,
    uniquePositionVertices: [...positions].reduce((sum, accessor) => sum + accessor.getCount(), 0),
    uniqueAttributeBytes: [...attributes].reduce((sum, accessor) => sum + accessor.getArray().byteLength, 0)};
}

const receiptBytes = await readFile(receiptPath), receipt = JSON.parse(receiptBytes);
const original = await readFile(final), raw = await readFile(rawPath);
assert.equal(hash(original), receipt.sha256, 'Generated GLB differs from receipt; preserve edits and choose a fresh version');
assert.equal(original.length, receipt.bytes, 'Generated GLB length differs from receipt');
if (receipt.optimization?.operation === 'lossless vertex weld') {
  console.log(JSON.stringify({result: 'PASS', mode: 'already optimized', ...(await verifyVioletDragon(final))}));
  process.exit(0);
}
const before = await verifyVioletDragon(final);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.readBinary(new Uint8Array(original));
const beforeIdentity = identity(document), beforeGeometry = expandedGeometry(document);
const storageBefore = vertexStorage(document);
let unusedAnimationSamplersRemoved = 0, orphanAnimationAccessorsRemoved = 0;
const unusedAccessors = new Set();
for (const animation of document.getRoot().listAnimations()) {
  const used = new Set(animation.listChannels().map(channel => channel.getSampler()));
  for (const sampler of animation.listSamplers()) if (!used.has(sampler)) {
    unusedAccessors.add(sampler.getInput()); unusedAccessors.add(sampler.getOutput());
    animation.removeSampler(sampler); sampler.dispose(); unusedAnimationSamplersRemoved++;
  }
}
for (const accessor of unusedAccessors) if (accessor.listParents().every(parent => parent.propertyType === 'Root')) {
  accessor.dispose(); orphanAnimationAccessorsRemoved++;
}
const serializationOnly = retainExactJson(original, Buffer.from(await io.writeBinary(document)));
await document.transform(weld());
assert.deepEqual(identity(document), beforeIdentity, 'Weld altered nodes, images, skin or clip samples');
assert.deepEqual(expandedGeometry(document), beforeGeometry, 'Weld altered indexed geometry/attributes');
const optimized = retainExactJson(original, Buffer.from(await io.writeBinary(document)));
const sourceId = receipt.sha256.slice(0, 12);
const trial = path.join(folder, `dragon-violet-v007-weld-${sourceId}.glb`);
await preserve(trial, optimized);
const after = await verifyVioletDragon(trial);
const reloaded = await io.readBinary(new Uint8Array(optimized));
const storageAfter = vertexStorage(reloaded);
assert.deepEqual(identity(reloaded), beforeIdentity, 'Serialization altered nodes, images, skin or clip samples');
assert.deepEqual(expandedGeometry(reloaded), beforeGeometry, 'Serialization altered indexed geometry/attributes');
for (const field of ['triangles', 'meshes', 'meshInstances', 'primitives', 'instanceTriangles', 'inverseBindSha256'])
  assert.equal(after[field], before[field], `Weld changed ${field}`);
for (const field of ['bounds', 'sockets', 'clips', 'boneRest', 'materials', 'textures'])
  assert.deepEqual(after[field], before[field], `Weld changed ${field}`);
const beforeRaw = parseEmbeddedGlb(original), afterRaw = parseEmbeddedGlb(optimized);
assert.deepEqual(afterRaw.asset.extras, beforeRaw.asset.extras, 'Asset contract/source identity changed');
assert.deepEqual(afterRaw.materials, beforeRaw.materials, 'Serialized material definitions changed');
assert(optimized.length < original.length, 'No measured size reduction; do not replace the candidate');
const unwelded = path.join(folder, `dragon-violet-v007-unwelded-${sourceId}.glb`);
await preserve(unwelded, original);
await preserve(path.join(folder, `export-receipt-unwelded-${sourceId}.json`), receiptBytes);
// Detect another export or receipt writer before changing the owned final path.
assert.equal(hash(await readFile(final)), receipt.sha256, 'Candidate changed during optimization');
assert((await readFile(receiptPath)).equals(receiptBytes), 'Export receipt changed during optimization');
assert((await readFile(rawPath)).equals(raw), 'Raw Blender export changed during optimization');
const optimization = {
  operation: 'lossless vertex weld', unwelded: relative(unwelded), unweldedSha256: before.sha256,
  raw: relative(rawPath), rawSha256: hash(raw), rawBytes: raw.length,
  bytesBefore: before.bytes, bytesAfter: after.bytes, bytesSaved: before.bytes - after.bytes,
  percentSaved: Number(((1-after.bytes/before.bytes)*100).toFixed(2)),
  verticesBefore: before.vertices, verticesAfter: after.vertices, trianglesUnchanged: after.triangles,
  vertexCountMethod: 'Verifier sums position count per primitive; shared accessors can be counted repeatedly. Use unique storage below for actual geometry comparison.',
  storageBefore, storageAfter, serializationOnlyBytes: serializationOnly.length,
  accessorsBefore: beforeRaw.accessors.length, accessorsAfter: afterRaw.accessors.length,
  unusedAnimationSamplersRemoved, orphanAnimationAccessorsRemoved,
  textures: 'byte-identical images; no recompression',
  geometry: 'indexed triangle-corner attributes byte-identical',
  nodes: 'all retained with identical hierarchy and local transforms; no prune/join',
  animation: 'all retained channel samples, interpolation and targets byte-identical',
  serialization: 'Unused animation samplers/orphan accessors removed; exact original node transforms and material/texture/sampler definitions restored',
};
const evidence = {before, after, optimization,
  limitations: ['Lossless structural preservation and file size only; not a render, deformation or runtime performance measurement.']};
const evidenceBytes = json(evidence);
await preserve(path.join(folder, `optimization-verification-${sourceId}-${hash(evidenceBytes).slice(0,8)}.json`), evidenceBytes);
if (trialOnly) {
  console.log(JSON.stringify({result:'PASS', mode:'trial only; final GLB and receipt unchanged', trial:relative(trial),
    sha256:after.sha256, bytes:after.bytes, vertices:after.vertices, triangles:after.triangles, optimization}));
  process.exit(0);
}
await writeFile(final, optimized);
Object.assign(receipt, {sha256: after.sha256, bytes: after.bytes, optimization});
await writeFile(receiptPath, json(receipt));
await writeFile(path.join(folder, 'optimization-verification.json'), json(evidence));
console.log(JSON.stringify({result: 'PASS', sha256: after.sha256, bytes: after.bytes, vertices: after.vertices,
  triangles: after.triangles, optimization}));
