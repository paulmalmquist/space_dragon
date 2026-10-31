/** Unity derivatives: decode embedded WebP to PNG without changing rig/animation data. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const align = value => (value + 3) & ~3;
const provenancePath = 'Meshes/pedestrians/PROVENANCE.json';

function parse(bytes) {
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const length = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + length).toString('utf8'));
  const offset = 20 + length;
  assert.equal(bytes.readUInt32LE(offset + 4), 0x004e4942);
  return { json, bin: bytes.subarray(offset + 8, offset + 8 + bytes.readUInt32LE(offset)) };
}

function pack(json, bin) {
  const encoded = Buffer.from(JSON.stringify(json));
  const text = Buffer.alloc(align(encoded.length), 32);
  encoded.copy(text);
  const bytes = Buffer.alloc(12 + 8 + text.length + 8 + align(bin.length));
  bytes.writeUInt32LE(0x46546c67, 0); bytes.writeUInt32LE(2, 4); bytes.writeUInt32LE(bytes.length, 8);
  bytes.writeUInt32LE(text.length, 12); bytes.writeUInt32LE(0x4e4f534a, 16); text.copy(bytes, 20);
  bytes.writeUInt32LE(align(bin.length), 20 + text.length); bytes.writeUInt32LE(0x004e4942, 24 + text.length);
  bin.copy(bytes, 28 + text.length);
  return bytes;
}

function viewBytes(glb, index) {
  const view = glb.json.bufferViews[index];
  assert.equal(view.buffer, 0);
  return glb.bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
}

export async function verifyPedestrianConversion(sourceBytes, derivativeBytes) {
  const source = parse(sourceBytes), derivative = parse(derivativeBytes);
  const allowed = new Set(['images', 'textures', 'bufferViews', 'buffers', 'extensionsUsed', 'extensionsRequired']);
  for (const key of new Set([...Object.keys(source.json), ...Object.keys(derivative.json)])) {
    if (!allowed.has(key)) assert.deepEqual(derivative.json[key], source.json[key], `Preserve ${key}`);
  }
  assert(!derivative.json.extensionsUsed?.includes('EXT_texture_webp'));
  assert(!derivative.json.extensionsRequired?.includes('EXT_texture_webp'));
  assert.equal(derivative.json.images.length, source.json.images.length);
  assert.equal(derivative.json.bufferViews.length, source.json.bufferViews.length);
  const imageViews = new Set(source.json.images.map(image => image.bufferView));
  const nonImageParts = [];
  for (let i = 0; i < source.json.bufferViews.length; i++) {
    if (imageViews.has(i)) continue;
    const original = viewBytes(source, i);
    assert.deepEqual(viewBytes(derivative, i), original, `Non-image binary view ${i}`);
    nonImageParts.push(original);
  }
  const textures = [];
  for (let i = 0; i < source.json.images.length; i++) {
    const oldImage = source.json.images[i], newImage = derivative.json.images[i];
    assert.equal(newImage.mimeType, 'image/png');
    assert.equal(newImage.bufferView, oldImage.bufferView);
    const before = await sharp(viewBytes(source, oldImage.bufferView)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const after = await sharp(viewBytes(derivative, newImage.bufferView)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(after.info.width, before.info.width); assert.equal(after.info.height, before.info.height);
    assert.deepEqual(after.data, before.data, `Decoded texture pixels ${i}`);
    textures.push({ image: i, name: oldImage.name, width: before.info.width, height: before.info.height,
      decodedRgbaSha256: hash(before.data), decodedPixelsIdentical: true });
  }
  for (let i = 0; i < source.json.textures.length; i++) {
    const before = structuredClone(source.json.textures[i]);
    if (before.extensions?.EXT_texture_webp) {
      before.source = before.extensions.EXT_texture_webp.source;
      delete before.extensions.EXT_texture_webp;
      if (!Object.keys(before.extensions).length) delete before.extensions;
    }
    assert.deepEqual(derivative.json.textures[i], before, `Texture binding ${i}`);
  }
  return { unchangedJson: ['asset', 'meshes', 'accessors', 'nodes', 'skins', 'animations', 'scenes', 'materials', 'samplers'],
    jsonHashes: ['meshes', 'accessors', 'nodes', 'skins', 'animations'].map(key => ({ key, sha256: hash(Buffer.from(JSON.stringify(source.json[key]))) })),
    nonImageBufferBytes: nonImageParts.reduce((n, bytes) => n + bytes.length, 0),
    nonImageBufferSha256: hash(Buffer.concat(nonImageParts)), nonImageBufferIdentical: true, textures };
}

async function convert(sourceBytes) {
  const source = parse(sourceBytes), json = structuredClone(source.json), replacements = new Map();
  for (const image of json.images) {
    assert.equal(image.mimeType, 'image/webp');
    replacements.set(image.bufferView, await sharp(viewBytes(source, image.bufferView)).png().toBuffer());
    image.mimeType = 'image/png';
  }
  let offset = 0;
  const parts = [];
  for (let i = 0; i < json.bufferViews.length; i++) {
    const data = replacements.get(i) ?? viewBytes(source, i);
    const padded = Buffer.alloc(align(data.length)); data.copy(padded); parts.push(padded);
    json.bufferViews[i] = { ...json.bufferViews[i], byteOffset: offset, byteLength: data.length };
    offset += padded.length;
  }
  json.buffers = [{ ...json.buffers[0], byteLength: offset }];
  for (const texture of json.textures) {
    if (!texture.extensions?.EXT_texture_webp) continue;
    texture.source = texture.extensions.EXT_texture_webp.source;
    delete texture.extensions.EXT_texture_webp;
    if (!Object.keys(texture.extensions).length) delete texture.extensions;
  }
  for (const key of ['extensionsUsed', 'extensionsRequired']) {
    if (!json[key]) continue;
    json[key] = json[key].filter(extension => extension !== 'EXT_texture_webp');
    if (!json[key].length) delete json[key];
  }
  return pack(json, Buffer.concat(parts));
}

export async function prepareUnityPedestrians(out, put) {
  const records = [], conversions = [];
  for (const [appearance, id] of ['adult-male', 'adult-female'].entries()) {
    const sourcePath = `Sources~/pedestrians/${id}.glb`, destination = `Meshes/pedestrians/${id}.glb`;
    const source = await readFile(path.join(out, sourcePath));
    const bytes = await convert(source), evidence = await verifyPedestrianConversion(source, bytes);
    const { json } = parse(bytes);
    await put(destination, bytes);
    const record = { id, appearance, path: destination, sourcePath, provenancePath, clipName: 'walk',
      bytes: bytes.length, sha256: hash(bytes), sourceSha256: hash(source),
      meshCount: json.meshes.length, primitiveCount: json.meshes.reduce((n, mesh) => n + mesh.primitives.length, 0),
      skinCount: json.skins.length, jointCount: json.skins.reduce((n, skin) => n + skin.joints.length, 0),
      animationCount: json.animations.length, accessorCount: json.accessors.length, textureCount: json.images.length };
    records.push(record); conversions.push({ ...record, evidence });
  }
  await put(provenancePath, Buffer.from(JSON.stringify({ schemaVersion: 1,
    operation: 'Lossless decoding of embedded WebP to PNG for glTFast 6.20; no geometry, rig, material, skin or animation changes.',
    tool: 'tools/unity/export-town-drive-scene.pedestrians.mjs', sharpVersion: sharp.versions.sharp,
    sourceProvenance: 'Sources~/pedestrians/PROVENANCE.json', license: 'MIT',
    licenseFile: 'Sources~/pedestrians/LICENSE-Microsoft-Rocketbox.txt', conversions }, null, 2) + '\n'));
  return records;
}
