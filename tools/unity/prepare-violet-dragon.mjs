// Additive organic model intake. Neither preparation nor --verify promotes a
// scene or edits a previous receipt, GLB, material contract or audio candidate.
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseEmbeddedGlb, verifyVioletDragon} from '../verify-violet-dragon.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const target = path.join(root, 'unity/SpaceDragon/Assets/SpaceDragon/Dogfight');
const sourceDefault = 'assets/game/local/spacecraft/space-dragon-spacecraft/violet-v007/dragon-violet-v007.glb';
const imported = 'Imported/dragon-violet-v007.glb';
const measuredName = 'violet-contract-v007.json';
const materialName = 'material-contract-v004.json';
const exportReceiptName = 'violet-export-receipt-v007.json';
const receiptName = 'asset-receipt-v004.json';
const previousName = 'asset-receipt-v003.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const options = {source: sourceDefault, verify: false};
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--verify') options.verify = true;
  else if (['--source', '--export-receipt'].includes(arg) && process.argv[i + 1]) options[arg.slice(2)] = process.argv[++i];
  else throw Error('Usage: prepare-violet-dragon.mjs [--verify] [--source candidate.glb] [--export-receipt export-receipt.json]');
}
function withinTarget(relative) {
  assert(typeof relative === 'string' && relative.length, 'Receipt needs a destination');
  const destination = path.resolve(target, relative);
  assert(destination.startsWith(target + path.sep), 'Receipt destination escapes Dogfight intake');
  return destination;
}
async function verifyFiles(receipt) {
  assert(Array.isArray(receipt.files) && receipt.files.length > 0, 'Receipt needs prepared files');
  const destinations = new Set();
  for (const file of receipt.files) {
    assert(!destinations.has(file.destination), `Duplicate receipt destination: ${file.destination}`);
    destinations.add(file.destination);
    const bytes = await readFile(withinTarget(file.destination));
    assert.equal(bytes.length, file.bytes, `Prepared length changed: ${file.destination}`);
    assert.equal(hash(bytes), file.sha256, `Prepared content changed: ${file.destination}`);
  }
  return destinations;
}
function relativeSource(file) {
  const absolute = path.resolve(root, file);
  assert(absolute.startsWith(root + path.sep), 'Source provenance must resolve inside this repository');
  return path.relative(root, absolute).split(path.sep).join('/');
}

if (options.verify) {
  // Checkout validation needs prepared runtime files only, never ignored masters.
  const receipt = JSON.parse(await readFile(withinTarget(receiptName), 'utf8'));
  assert.equal(receipt.schemaVersion, 4);
  assert.equal(receipt.previousReceipt, previousName);
  assert.equal(receipt.rigProfile, 'violet-organic-15');
  const destinations = await verifyFiles(receipt);
  for (const file of [previousName, imported, measuredName, materialName, exportReceiptName])
    assert(destinations.has(file), `Missing organic intake dependency: ${file}`);
  const measured = JSON.parse(await readFile(withinTarget(measuredName), 'utf8'));
  assert.equal(measured.schemaVersion, 2);
  assert.equal(measured.file, path.basename(imported));
  assert.equal(measured.authoredPresentation, true);
  const checked = await verifyVioletDragon(withinTarget(imported), measured);
  const sourceReceipt = JSON.parse(await readFile(withinTarget(exportReceiptName), 'utf8'));
  assert.equal(sourceReceipt.sha256, checked.sha256);
  assert.equal(sourceReceipt.triangles, checked.triangles);
  console.log(JSON.stringify({result: 'PASS', mode: 'verified', candidate: imported,
    sha256: checked.sha256, bytes: checked.bytes, triangles: checked.triangles, bones: checked.bones.length,
    bounds: checked.bounds, limitations: checked.limitations, previousReceiptsPreserved: true, scenePromotion: 'NOT PERFORMED'}));
  process.exit(0);
}

const source = path.resolve(root, options.source);
const sourceReceiptPath = path.resolve(root, options['export-receipt'] ?? path.join(path.dirname(source), 'export-receipt.json'));
// The handoff receipt is required before creating anything. There is no guessed
// candidate hash or implicit fallback to the earlier source-only v006 sculpture.
const sourceReceiptBytes = await readFile(sourceReceiptPath);
const sourceReceipt = JSON.parse(sourceReceiptBytes.toString());
const bytes = await readFile(source), verified = await verifyVioletDragon(source);
assert.equal(sourceReceipt.sha256, hash(bytes), 'Blender handoff does not identify this GLB');
assert.equal(sourceReceipt.bytes, bytes.length, 'Blender handoff byte length differs');
assert.equal(sourceReceipt.triangles, verified.triangles, 'Blender handoff triangle count differs');
assert(typeof sourceReceipt.source === 'string' && /^[a-f0-9]{64}$/i.test(sourceReceipt.sourceSha256), 'Missing editable source identity');
const sourceBlend = relativeSource(sourceReceipt.source);
assert.equal(hash(await readFile(path.join(root, sourceBlend))), sourceReceipt.sourceSha256, 'Editable source changed after export receipt');
const gltf = parseEmbeddedGlb(bytes);
const previousBytes = await readFile(withinTarget(previousName));
const previous = JSON.parse(previousBytes.toString());
assert.equal(previous.schemaVersion, 3, 'Preserved heroic intake required for rollback');
await verifyFiles(previous);
assert(Array.isArray(previous.sourceFiles), 'Previous source provenance missing');
const oldMaterials = JSON.parse(await readFile(withinTarget('material-contract-v003.json'), 'utf8'));
const drone = oldMaterials.models?.find(model => model.file === 'drone.glb');
assert(drone, 'Preserved drone material contract missing');
const materials = gltf.materials.map((material, index) => {
  const extension = material.extensions?.KHR_materials_emissive_strength;
  const factor = material.emissiveFactor ?? [0, 0, 0], strength = extension?.emissiveStrength ?? 1;
  assert(Number.isFinite(strength) && strength >= 0 && factor.length === 3 && factor.every(value => Number.isFinite(value) && value >= 0), 'Invalid organic emission');
  return {index, name: material.name ?? `material_${index}`, hasEmissionStrength: extension !== undefined,
    sourceFactor: factor, strength, effectiveFactor: factor.map(value => value * strength),
    clearcoat: material.extensions?.KHR_materials_clearcoat?.clearcoatFactor ?? 0, normalScale: material.normalTexture?.scale ?? 1,
    metallicFactor: material.pbrMetallicRoughness?.metallicFactor ?? 1,
    roughnessFactor: material.pbrMetallicRoughness?.roughnessFactor ?? 1,
    hasBaseColorMap: material.pbrMetallicRoughness?.baseColorTexture !== undefined,
    hasNormalMap: material.normalTexture !== undefined, hasOcclusionMap: material.occlusionTexture !== undefined};
});
const contract = {schemaVersion: 2, file: path.basename(imported), sha256: verified.sha256, bytes: verified.bytes,
  rigProfile: verified.rigProfile, authoredPresentation: true,
  coordinateSystem: {metersPerUnit: 1, sourceForward: '-Z', sourceUp: '+Y', gameplayForward: '+Z', sourceBasisYawDegrees: 180},
  sourceBlend, sourceSha256: sourceReceipt.sourceSha256, exportReceiptSha256: hash(sourceReceiptBytes),
  triangles: verified.triangles, instanceTriangles: verified.instanceTriangles, meshes: verified.meshes, primitives: verified.primitives,
  bones: verified.bones, boneRest: verified.boneRest, inverseBindSha256: verified.inverseBindSha256,
  bounds: verified.bounds, sockets: verified.sockets, contactY: verified.contactY, clips: verified.clips,
  materials: verified.materials, textures: verified.textures, estimatedTextureRgbaBytes: verified.estimatedTextureRgbaBytes,
  textureMemoryMethod: verified.textureMemoryMethod, limitations: verified.limitations,
  gameplay: {collisionShape: 'sphere', collisionRadiusMetres: 3.3, collisionPolicy: 'Retained gameplay sphere; render anatomy does not silently rebalance hits.'},
  status: 'STRUCTURALLY VERIFIED CANDIDATE; Unity import, deformation, appearance, performance and owner review remain separate.'};
const output = new Map([[imported, bytes], [exportReceiptName, sourceReceiptBytes],
  [measuredName, json(contract)], [materialName, json({schemaVersion: 1,
    note: 'Organic violet v007 plus unchanged drone. Older material contracts remain rollback.',
    models: [{file: path.basename(imported), sha256: verified.sha256, materials}, drone]})]]);
const receipt = {schemaVersion: 4, previousReceipt: previousName, rigProfile: verified.rigProfile,
  scope: 'Separate organic 15-bone candidate. No mechanical rig/pivot identity assumption, scene promotion or release approval.',
  sourceFiles: [...previous.sourceFiles, {source: relativeSource(source), destination: imported, bytes: bytes.length, sha256: hash(bytes)}],
  files: [...previous.files, {destination: previousName, bytes: previousBytes.length, sha256: hash(previousBytes)},
    ...[...output].map(([destination, body]) => ({destination, bytes: body.length, sha256: hash(body)}))]};
assert.equal(new Set(receipt.files.map(file => file.destination)).size, receipt.files.length, 'A previous intake already owns a new destination');
output.set(receiptName, json(receipt));
const missing = [];
for (const [name, body] of output) {
  const destination = withinTarget(name);
  try { assert((await readFile(destination)).equals(body), `Refusing to overwrite changed organic intake: ${name}. Choose a fresh version.`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; missing.push([destination, body]); }
}
for (const [destination, body] of missing) {
  await mkdir(path.dirname(destination), {recursive: true});
  await writeFile(destination, body, {flag: 'wx'});
}
console.log(JSON.stringify({result: 'PASS', mode: 'prepared', candidate: imported, sha256: verified.sha256,
  bytes: verified.bytes, triangles: verified.triangles, bones: verified.bones.length, bounds: verified.bounds,
  limitations: verified.limitations, previousReceiptsPreserved: true, scenePromotion: 'NOT PERFORMED'}));
