// Promote selected, locally authored Blender exports. Never copies source .blend or reference media.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const target = path.join(repo, 'unity/SpaceDragon/Assets/SpaceDragon/TownDrive/Art/v004');
const args = process.argv.slice(2), verify = args.includes('--verify');
const sourceFlag = args.indexOf('--source-root');
assert(args.every((arg, index) => arg === '--verify' || arg === '--source-root' || index === sourceFlag + 1 && sourceFlag >= 0), 'Unknown argument.');
assert(verify || sourceFlag >= 0 && args[sourceFlag + 1], 'Use --source-root <selected Blender candidate directory> or --verify.');
const source = sourceFlag >= 0 ? path.resolve(args[sourceFlag + 1]) : null;
const hash = data => createHash('sha256').update(data).digest('hex');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const ids = ['fan-palm', 'royal-palm', 'clipped-hedge'];
const modelPath = id => `Models/${id}-v004.glb`;
const destination = relative => {
  assert(typeof relative === 'string' && !path.isAbsolute(relative));
  const file = path.resolve(target, relative);
  assert(file.startsWith(target + path.sep), 'Artifact must remain inside the v004 folder.');
  return file;
};
async function inspect(file, id) {
  const bytes = await readFile(file);
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(4), 2); assert.equal(bytes.readUInt32LE(8), bytes.length);
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)).trim());
  assert.equal(gltf.asset.version, '2.0');
  assert(!(gltf.animations?.length || gltf.skins?.length || gltf.cameras?.length), 'Plant exports contain no rigs, cameras or clips.');
  assert((gltf.buffers || []).every(buffer => !buffer.uri), 'GLBs must embed buffers.');
  assert((gltf.images || []).every(image => !image.uri && Number.isInteger(image.bufferView)), 'GLBs must embed only selected runtime textures.');
  assert((gltf.images || []).length > 0, 'Textured Blender exports are required.');
  assert((gltf.materials || []).every(material => material.alphaMode !== 'BLEND'), 'Foliage must use opaque or masked surfaces.');
  const document = await io.read(file), root = document.getRoot();
  const lod = suffix => {
    const matches = root.listNodes().filter(node => node.getName().endsWith(suffix));
    assert.equal(matches.length, 1, `Exactly one ${suffix} group in ${id}.`);
    let triangles = 0, meshes = 0;
    matches[0].traverse(node => {
      if (!node.getMesh()) return;
      meshes++;
      for (const primitive of node.getMesh().listPrimitives()) {
        assert.equal(primitive.getMode(), 4);
        triangles += (primitive.getIndices() || primitive.getAttribute('POSITION')).getCount() / 3;
      }
    });
    assert(meshes > 0 && Number.isInteger(triangles) && triangles > 0);
    return { name: matches[0].getName(), triangles, meshes, bounds: getBounds(matches[0]) };
  };
  const near = lod('LOD0'), far = lod('LOD1');
  const size = near.bounds.max.map((n, i) => n - near.bounds.min[i]);
  assert(size.every(n => Number.isFinite(n) && n > 0));
  assert(Math.abs(near.bounds.min[1]) < .03, `${id} must have a ground-level origin.`);
  assert(far.triangles < near.triangles / 2, 'Far silhouette must reduce the geometry workload.');
  return { id, path: modelPath(id), bytes: bytes.length, sha256: hash(bytes),
    nearNode: near.name, farNode: far.name, nearTriangles: near.triangles, farTriangles: far.triangles,
    sourceHeight: size[1], sourceWidth: size[0], sourceDepth: size[2],
    nearBounds: near.bounds, farBounds: far.bounds,
    materials: root.listMaterials().length, textures: root.listTextures().length,
    generator: gltf.asset.generator, extensionsRequired: gltf.extensionsRequired || [] };
}
function verifyReceipt(provenance, models) {
  assert.deepEqual(provenance.assets.map(asset => asset.id).sort(), [...ids].sort(), 'Source receipt must name the exact three exports.');
  for (const model of models) {
    const asset = provenance.assets.find(asset => asset.id === model.id);
    assert.equal(asset.sha256, model.sha256, 'Source receipt must match the exported bytes: ' + model.id);
    assert.equal(asset.bytes, model.bytes);
    assert.equal(asset.levels[0].triangles, model.nearTriangles);
    assert.equal(asset.levels[1].triangles, model.farTriangles);
  }
}
if (!verify) {
  const receipt = await readFile(path.join(source, 'source-receipt.json'));
  const provenance = JSON.parse(receipt);
  assert(provenance && typeof provenance === 'object', 'Authoring/provenance receipt required.');
  // Inspect every input before writing any tracked candidate file.
  const models = [];
  for (const id of ids) models.push(await inspect(path.join(source, `${id}-v004.glb`), id));
  verifyReceipt(provenance, models);
  await mkdir(path.join(target, 'Models'), { recursive: true });
  for (const model of models) await copyFile(path.join(source, `${model.id}-v004.glb`), destination(model.path));
  await writeFile(destination('source-receipt.json'), receipt);
  await writeFile(destination('reference-art.json'), JSON.stringify({ version: 4, id: 'town-drive-reference-v004',
    units: 'metres', runtimeUp: '+Y', sourceReceipt: 'source-receipt.json', sourceReceiptSha256: hash(receipt), models,
    scope: 'Selected Blender-authored runtime plants. Original videos and editable Blender sources are excluded. Placement remains a Unity presentation concern.' }, null, 2) + '\n');
}
const manifest = JSON.parse(await readFile(destination('reference-art.json'), 'utf8'));
assert.equal(manifest.version, 4); assert.deepEqual(manifest.models.map(model => model.id), ids);
assert.equal(manifest.sourceReceiptSha256, hash(await readFile(destination(manifest.sourceReceipt))));
verifyReceipt(JSON.parse(await readFile(destination(manifest.sourceReceipt), 'utf8')), manifest.models);
for (const expected of manifest.models) assert.deepEqual(await inspect(destination(expected.path), expected.id), expected);
const modelFiles = (await readdir(path.join(target, 'Models'))).filter(name => !name.endsWith('.meta')).sort();
assert.deepEqual(modelFiles, ids.map(id => `${id}-v004.glb`).sort());
console.log(`PASS: three self-contained Blender exports, measured LODs and provenance (${manifest.models.reduce((sum, model) => sum + model.bytes, 0)} bytes). Runtime appearance is checked separately.`);
