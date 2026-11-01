// Additive Oscar intake: no scene selection, previous-asset rewrite or build.
// --verify works from checked-in runtime inputs, without ignored Blender masters.
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {OSCAR_PROFILE, OSCAR_SOCKETS, parseOscarGlb, verifyOscarDragon} from '../verify-oscar-dragon.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const target = path.join(root, 'unity/SpaceDragon/Assets/SpaceDragon/Dogfight');
const sourceDefault = 'assets/game/local/spacecraft/oscar-dragon/oscar-v001/dragon-oscar-v001.glb';
const imported = 'Imported/dragon-oscar-v001.glb', noticeName = 'Imported/dragon-oscar-v001-NOTICE.txt';
const measuredName = 'oscar-contract-v001.json', materialName = 'material-contract-v005.json';
const exportReceiptName = 'oscar-export-receipt-v001.json', provenanceName = 'oscar-provenance-v001.json';
const receiptName = 'asset-receipt-v005.json', previousName = 'asset-receipt-v004.json';
const skinMetadataName = 'Editor/oscar-fullweights-v001.json', skinBinaryName = 'Editor/oscar-fullweights-v001.bytes';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const options = {source: sourceDefault, 'source-root': root, verify: false};
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--verify') options.verify = true;
  else if (['--source', '--source-root', '--master-root', '--export-receipt'].includes(arg) && process.argv[i + 1]) options[arg.slice(2)] = process.argv[++i];
  else throw Error('Usage: prepare-oscar-dragon.mjs [--verify] [--source-root export-repository] [--master-root source-repository] [--source candidate.glb] [--export-receipt export-receipt.json]');
}
function contained(base, relative, label) {
  assert(typeof relative === 'string' && relative.length, `${label} path required`);
  const file = path.resolve(base, relative), rel = path.relative(base, file);
  assert(rel && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel), `${label} escapes its explicit root`);
  return file;
}
const withinTarget = relative => contained(target, relative, 'Runtime receipt destination');
async function hashFile(file) {
  const hasher = createHash('sha256');
  for await (const chunk of createReadStream(file)) hasher.update(chunk);
  return hasher.digest('hex');
}
async function verifyFiles(receipt) {
  assert(Array.isArray(receipt.files) && receipt.files.length, 'Prepared file list required');
  const destinations = new Set();
  for (const file of receipt.files) {
    assert(!destinations.has(file.destination), `Duplicate destination: ${file.destination}`); destinations.add(file.destination);
    const body = await readFile(withinTarget(file.destination));
    assert.equal(body.length, file.bytes, `Prepared length changed: ${file.destination}`);
    assert.equal(hash(body), file.sha256, `Prepared content changed: ${file.destination}`);
  }
  return destinations;
}
// Bounds clamp the gameplay jaw input first; jawScale then chooses direction:
// angle = clamp(input, jawMinRadians, jawMaxRadians) * jawScale.
// The axis is source-local glTF; Unity performs its explicit handedness conversion.
function presentationContract(value, measured) {
  assert(value && measured.bones.includes(value.jawBone), 'Presentation needs the actual measured jaw bone');
  assert(Array.isArray(value.jawAxis) && value.jawAxis.length === 3 && value.jawAxis.every(Number.isFinite) &&
    Math.abs(Math.hypot(...value.jawAxis) - 1) < .001, 'Jaw axis must be a normalized source-local vector');
  assert(value.jawScale === 1 || value.jawScale === -1, 'Jaw direction sign must be explicit');
  assert(Number.isFinite(value.jawMinRadians) && Number.isFinite(value.jawMaxRadians) &&
    value.jawMinRadians < value.jawMaxRadians, 'Jaw angle bounds required');
  assert(Number.isSafeInteger(value.sampleRate) && value.sampleRate > 0 && value.sampleRate <= 120, 'Integer animation sample rate required');
  assert(Array.isArray(value.damageSockets) && value.damageSockets.length === 3 &&
    new Set(value.damageSockets).size === 3 && value.damageSockets.every(name => OSCAR_SOCKETS.includes(name)), 'Three distinct named damage sockets required');
  return {jawBone: value.jawBone, jawAxis: value.jawAxis, jawScale: value.jawScale, jawMinRadians: value.jawMinRadians,
    jawMaxRadians: value.jawMaxRadians, sampleRate: value.sampleRate, damageSockets: value.damageSockets};
}
function sourceCredit(value) {
  assert(value?.creator?.displayName && value.creator.profileUrl && value.sourceUrl && value.title, 'Creator/source credit required');
  assert.equal(value.license?.spdx, 'CC-BY-4.0', 'Expected documented source license');
  assert.equal(value.license.url, 'https://creativecommons.org/licenses/by/4.0/');
  assert(/^[a-f0-9]{64}$/i.test(value.sourceSha256) && value.originalCopyrightNotice, 'Original source identity/notice required');
  return {title: value.title, creator: value.creator, sourceUrl: value.sourceUrl, license: value.license,
    originalCopyrightNotice: value.originalCopyrightNotice, originalSourceSha256: value.sourceSha256,
    licenseEvidence: value.evidence};
}
function verifySourceReceipt(receipt, measured) {
  assert.equal(receipt.sha256, measured.sha256, 'Blender handoff does not identify this GLB');
  assert.equal(receipt.bytes, measured.bytes, 'Blender handoff byte length differs');
  assert.equal(receipt.triangles, measured.triangles, 'Blender handoff triangles differ');
  assert(typeof receipt.source === 'string' && /^[a-f0-9]{64}$/i.test(receipt.sourceSha256), 'Editable source identity required');
  assert(Array.isArray(receipt.modifications) && receipt.modifications.length && receipt.modifications.every(item => typeof item === 'string' && item.trim()), 'Actual derivative modifications must be recorded for attribution');
  presentationContract(receipt.presentation, measured);
  assert.equal(receipt.sourceUnchanged, true, 'Export must preserve the saved source');
  const policy=receipt.weightReduction;
  assert(policy && policy.requestedWeightLimit===0 && policy.retainedAllPositiveAssignments===true && policy.verticesTrimmed===0 &&
    policy.gate==='PASS' && policy.maximumCandidateInfluences===measured.maxInfluencesPerVertex &&
    policy.originalMaximumInfluences===measured.maxInfluencesPerVertex, 'Only the verified full-source-weight candidate can be prepared');
  assert(Array.isArray(policy.checks) && policy.checks.length && policy.checks.every(row=>Number.isFinite(row.maxMetres) && Number.isFinite(row.p95Metres) &&
    row.maxMetres<=.001 && row.p95Metres<=.001), 'Full-weight source deformation must pass the 1mm gate');
  assert.equal(receipt.skinExportAudit?.maximumInfluences, measured.maxInfluencesPerVertex, 'Export influence audit disagrees with GLB');
  assert.equal(receipt.influenceExtractor?.restored, true, 'Scoped Blender exporter hook must be restored');
}

if (options.verify) {
  const receipt = JSON.parse(await readFile(withinTarget(receiptName), 'utf8'));
  assert.equal(receipt.schemaVersion, 5); assert.equal(receipt.previousReceipt, previousName); assert.equal(receipt.rigProfile, OSCAR_PROFILE);
  const destinations = await verifyFiles(receipt);
  for (const file of [previousName, imported, measuredName, materialName, exportReceiptName, noticeName, provenanceName, skinMetadataName, skinBinaryName])
    assert(destinations.has(file), `Missing Oscar dependency: ${file}`);
  const measured = JSON.parse(await readFile(withinTarget(measuredName), 'utf8'));
  assert.equal(measured.schemaVersion, 1); assert.equal(measured.file, path.basename(imported)); assert.equal(measured.authoredPresentation, true);
  assert.deepEqual(measured.coordinateSystem, {metersPerUnit: 1, sourceForward: '+Z', sourceUp: '+Y', gameplayForward: '+Z', sourceBasisYawDegrees: 0});
  const checked = await verifyOscarDragon(withinTarget(imported), measured, {includeSkinSidecar: true});
  assert((await readFile(withinTarget(skinBinaryName))).equals(checked.skinSidecar.binary), 'Full-weight binary differs from actual GLB');
  assert.deepEqual(JSON.parse(await readFile(withinTarget(skinMetadataName), 'utf8')), checked.skinSidecar.metadata, 'Full-weight metadata/pose expectations differ from actual GLB');
  presentationContract(measured.presentation, checked);
  const sourceReceipt = JSON.parse(await readFile(withinTarget(exportReceiptName), 'utf8')); verifySourceReceipt(sourceReceipt, checked);
  assert.equal(measured.sourceSha256, sourceReceipt.sourceSha256);
  assert.equal(measured.exportReceiptSha256, hash(await readFile(withinTarget(exportReceiptName))));
  assert.deepEqual(measured.presentation, presentationContract(sourceReceipt.presentation, checked));
  const provenance = JSON.parse(await readFile(withinTarget(provenanceName), 'utf8'));
  assert.equal(provenance.candidateSha256, checked.sha256); assert.equal(provenance.license.spdx, 'CC-BY-4.0');
  const notice = await readFile(withinTarget(noticeName), 'utf8');
  for (const required of [provenance.creator.displayName, provenance.sourceUrl, provenance.license.url, provenance.originalCopyrightNotice,
    ...sourceReceipt.modifications]) assert(notice.includes(required), 'Runtime credit/modification notice incomplete');
  console.log(JSON.stringify({result: 'PASS', mode: 'verified', candidate: imported, sha256: checked.sha256, bytes: checked.bytes,
    triangles: checked.triangles, bones: checked.bones.length, bounds: checked.bounds, previousReceiptsPreserved: true,
    creatorCredit: noticeName, scenePromotion: 'NOT PERFORMED', limitations: checked.limitations}));
  process.exit(0);
}

const sourceRoot = path.resolve(options['source-root']);
const source = contained(sourceRoot, options.source, 'Explicit source');
const sourceReceiptPath = contained(sourceRoot, options['export-receipt'] ?? path.join(path.dirname(source), 'export-receipt.json'), 'Export receipt');
const sourceReceiptBytes = await readFile(sourceReceiptPath), sourceReceipt = JSON.parse(sourceReceiptBytes.toString());
const bytes = await readFile(source), checked = await verifyOscarDragon(source, null, {includeSkinSidecar: true}); verifySourceReceipt(sourceReceipt, checked);
const masterRoot = path.resolve(options['master-root'] ?? sourceRoot);
const sourceBlendFile = contained(masterRoot, sourceReceipt.source, 'Editable source');
assert(path.extname(sourceBlendFile).toLowerCase() === '.blend', 'Expected an editable Blender master');
assert.equal(await hashFile(sourceBlendFile), sourceReceipt.sourceSha256, 'Editable source changed after export');
const sourceBlend = path.relative(masterRoot, sourceBlendFile).split(path.sep).join('/');
const previousBytes = await readFile(withinTarget(previousName)), previous = JSON.parse(previousBytes.toString());
assert.equal(previous.schemaVersion, 4, 'Preserve the violet intake as rollback');
await verifyFiles(previous); assert(Array.isArray(previous.sourceFiles), 'Previous source provenance missing');
const previousContract = JSON.parse(await readFile(withinTarget('violet-contract-v007.json'), 'utf8'));
const gameplay = previousContract.gameplay;
assert(gameplay?.collisionShape === 'sphere' && Number.isFinite(gameplay.collisionRadiusMetres) && gameplay.collisionRadiusMetres > 0, 'Measured prior gameplay collision contract missing');
const oldMaterials = JSON.parse(await readFile(withinTarget('material-contract-v004.json'), 'utf8'));
const drone = oldMaterials.models?.find(model => model.file === 'drone.glb'); assert(drone, 'Preserved drone material contract missing');
const sourceProvenance = JSON.parse(await readFile(path.join(root, 'assets/source/dragons/oscar-creativo/provenance.json'), 'utf8'));
const credit = sourceCredit(sourceProvenance), gltf = parseOscarGlb(bytes);
const materials = gltf.materials.map((material, index) => {
  const extension = material.extensions?.KHR_materials_emissive_strength, factor = material.emissiveFactor ?? [0, 0, 0], strength = extension?.emissiveStrength ?? 1;
  assert(Number.isFinite(strength) && strength >= 0 && factor.length === 3 && factor.every(v => Number.isFinite(v) && v >= 0), 'Invalid material emission');
  return {index, name: material.name ?? `material_${index}`, hasEmissionStrength: extension !== undefined, sourceFactor: factor,
    strength, effectiveFactor: factor.map(v => v * strength), clearcoat: material.extensions?.KHR_materials_clearcoat?.clearcoatFactor ?? 0,
    normalScale: material.normalTexture?.scale ?? 1, metallicFactor: material.pbrMetallicRoughness?.metallicFactor ?? 1,
    roughnessFactor: material.pbrMetallicRoughness?.roughnessFactor ?? 1, hasBaseColorMap: material.pbrMetallicRoughness?.baseColorTexture !== undefined,
    hasNormalMap: material.normalTexture !== undefined, hasOcclusionMap: material.occlusionTexture !== undefined};
});
const {candidate: _candidate, result: _result, skinSidecar, ...measurement} = checked;
const contract = {schemaVersion: 1, file: path.basename(imported), ...measurement, authoredPresentation: true,
  coordinateSystem: {metersPerUnit: 1, sourceForward: '+Z', sourceUp: '+Y', gameplayForward: '+Z', sourceBasisYawDegrees: 0},
  sourceBlend, sourceSha256: sourceReceipt.sourceSha256, exportReceiptSha256: hash(sourceReceiptBytes),
  presentation: presentationContract(sourceReceipt.presentation, checked), gameplay,
  attributionNotice: noticeName, provenanceFile: provenanceName,
  skinRestoration: {metadata: skinMetadataName, binary: skinBinaryName, scope: 'Editor-only exact full-weight restoration; source GLB remains unchanged. Runtime renderer weight limit and deformation must be actually tested.'},
  status: 'STRUCTURALLY VERIFIED CANDIDATE; Unity import, deformation, appearance, performance and owner review remain separate.'};
const provenance = {schemaVersion: 1, ...credit, candidate: path.basename(imported), candidateSha256: checked.sha256,
  sourceBlend, sourceSha256: sourceReceipt.sourceSha256, exportReceiptSha256: hash(sourceReceiptBytes), modifications: sourceReceipt.modifications,
  scope: 'Derivative asset credit; no creator endorsement or release approval implied.'};
const notice = Buffer.from(`${credit.title}\nBy ${credit.creator.displayName} (${credit.creator.profileUrl})\nSource: ${credit.sourceUrl}\n` +
  `License: Creative Commons Attribution 4.0 International (${credit.license.url})\n${credit.originalCopyrightNotice}\n\n` +
  `Space Dragon derivative modifications:\n${sourceReceipt.modifications.map(value => '- ' + value).join('\n')}\n\n` +
  `Original source SHA-256: ${credit.originalSourceSha256}\nGame candidate SHA-256: ${checked.sha256}\nNo endorsement by the original creator is implied.\n`);
const output = new Map([[imported, bytes], [exportReceiptName, sourceReceiptBytes], [measuredName, json(contract)],
  [materialName, json({schemaVersion: 1, note: 'Oscar candidate plus unchanged drone. Older material contracts remain rollback.',
    models: [{file: path.basename(imported), sha256: checked.sha256, materials}, drone]})], [noticeName, notice], [provenanceName, json(provenance)], [skinMetadataName, json(skinSidecar.metadata)], [skinBinaryName, skinSidecar.binary]]);
const receipt = {schemaVersion: 5, previousReceipt: previousName, rigProfile: OSCAR_PROFILE,
  scope: 'Owner-selected Oscar Creativo source; additive measured candidate and attribution. No scene promotion or release approval.',
  sourceFiles: [...previous.sourceFiles, {source: path.relative(sourceRoot, source).split(path.sep).join('/'), destination: imported, bytes: bytes.length, sha256: checked.sha256}],
  files: [...previous.files, {destination: previousName, bytes: previousBytes.length, sha256: hash(previousBytes)},
    ...[...output].map(([destination, body]) => ({destination, bytes: body.length, sha256: hash(body)}))]};
assert.equal(new Set(receipt.files.map(file => file.destination)).size, receipt.files.length, 'A previous intake already owns a new destination');
output.set(receiptName, json(receipt));
// Check all destinations before the first write. Existing candidates are immutable.
const missing = [];
for (const [name, body] of output) {
  const destination = withinTarget(name);
  try { assert((await readFile(destination)).equals(body), `Refusing to overwrite changed Oscar intake: ${name}; choose a new version.`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; missing.push([destination, body]); }
}
for (const [destination, body] of missing) { await mkdir(path.dirname(destination), {recursive: true}); await writeFile(destination, body, {flag: 'wx'}); }
console.log(JSON.stringify({result: 'PASS', mode: 'prepared', candidate: imported, sha256: checked.sha256, bytes: checked.bytes,
  triangles: checked.triangles, bones: checked.bones.length, bounds: checked.bounds, previousReceiptsPreserved: true,
  creatorCredit: noticeName, scenePromotion: 'NOT PERFORMED', limitations: checked.limitations}));
