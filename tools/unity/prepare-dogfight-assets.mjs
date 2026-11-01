/** Immutable local intake for Unity Dogfight. Never changes browser assets or another Unity lab. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const target = 'unity/SpaceDragon/Assets/SpaceDragon/Dogfight';
const hash = value => createHash('sha256').update(value).digest('hex');
const json = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const verify = process.argv.includes('--verify');
if (process.argv.slice(2).some(arg => arg !== '--verify')) throw new Error('Usage: node tools/unity/prepare-dogfight-assets.mjs [--verify]');
const inputs = [
  ['public/assets/dogfight/models/dragon-flight-v003.glb', '1446d3c3c9606a61ad8d871473ce5b1242107c0a6d52b59c795102adb74f853c'],
  ['public/assets/dogfight/models/drone.glb', '28fe73860616abc79c256c842ace570c839cf6212b3c0e92a1692942925e5407'],
  ['public/assets/dogfight/textures/nebula.jpg', '6824a4c9b203258f1d0d1b591730029efb47d929ebe3a3a74db691fbed5ca9de'],
  ['public/assets/dogfight/textures/planet.jpg', '7a6e78ab88f9bcfaef21c7cbfc5a166a36d9a79695b2affbe7af600194d06bc1'],
  ['public/assets/dogfight/NOTICE.md', '802bb42acab36c33e7a5631fcd2ab375b58ac2047a4ce27dc0252326b1362bec'],
];
const cueProvenance = JSON.parse(await readFile(path.join(root, 'assets/source/audio/sonniss-gdc-2026/game-cues.json'), 'utf8'));
const cuePins = {
  'dragon-roar': '99bf925e7542adb58c135ab7dca794c8c92b6370290250d67d02ac13d0ec1326',
  'fire-breath': 'b65546032e3590e54e0fdce92f6cc7aa3f733d0cb148cbb047d04da0db32e531',
  'machine-blast': '63da3996977c0932aa5fe1bcc46da31044706a89c2eb8cc0a9b5aca0bccf21d1',
  'metal-impact': 'e59e17993e5ae2490678f2bcb24e90dfd9fc2294e2c84154873920259147bd6b',
  'jet-surge': '3cbeb13f87b9b55dae46a2da6991dbe23a11dfc12c2c01e859f48b0b6ec05ec8',
};
for (const [id, expected] of Object.entries(cuePins)) {
  const cue = cueProvenance.files.find(item => item.id === id);
  if (!cue || cue.sha256 !== expected || cue.path !== `assets/audio/sonniss-gdc-2026/${id}-v001.wav`)
    throw new Error(`Existing audio provenance changed: ${id}. Review a new intake version.`);
  inputs.push([`public/${cue.path}`, expected]);
}

function glbDocument(bytes, source) {
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length || bytes.readUInt32LE(16) !== 0x4e4f534a)
    throw new Error(`Expected GLB2 JSON container: ${source}`);
  const end = 20 + bytes.readUInt32LE(12);
  if (end > bytes.length) throw new Error(`Unbounded GLB JSON: ${source}`);
  return JSON.parse(bytes.subarray(20, end).toString('utf8'));
}
const output = new Map();
const sourceFiles = [];
const models = [];
for (const [source, expected] of inputs) {
  const bytes = await readFile(path.join(root, source));
  if (hash(bytes) !== expected) throw new Error(`Source differs from reviewed asset pin: ${source}. Do not silently update the pin.`);
  const destination = `Imported/${path.basename(source)}`;
  output.set(destination, bytes);
  sourceFiles.push({ source, destination, bytes: bytes.length, sha256: expected });
  if (source.endsWith('.glb')) {
    const gltf = glbDocument(bytes, source);
    models.push({ file: path.basename(source), sha256: expected,
      materials: (gltf.materials ?? []).map((material, index) => {
        const strengthExtension = material.extensions?.KHR_materials_emissive_strength;
        const factor = material.emissiveFactor ?? [0, 0, 0];
        const strength = strengthExtension?.emissiveStrength ?? 1;
        if (factor.length !== 3 || factor.some(v => !Number.isFinite(v) || v < 0) || !Number.isFinite(strength) || strength < 0)
          throw new Error(`Invalid emission ${source}:${index}`);
        return { index, name: material.name ?? `material_${index}`, hasEmissionStrength: strengthExtension !== undefined,
          sourceFactor: factor, strength, effectiveFactor: factor.map(v => v * strength),
          clearcoat: material.extensions?.KHR_materials_clearcoat?.clearcoatFactor ?? 0,
          normalScale: material.normalTexture?.scale ?? 1 };
      }) });
  }
}
output.set('material-contract.json', json({ schemaVersion: 1,
  note: 'Exact GLB JSON membership is decoded by Node. Only hasEmissionStrength=true requires a reset-from-imported material clone; clearcoat-only materials must never get a fabricated emissive extension.', models }));
const receipt = { schemaVersion: 1, scope: 'Local Unity Dogfight migration of existing game assets; no new source art, family likeness, external upload or publication approval.',
  coordinates: { units: 'metres', up: '+Y', gameplayForward: '+Z', sourceForward: '-Z', basisEuler: [0, 180, 0], collisionRadius: 3.3, groundContactY: -.665026843547821 },
  provenance: { assets: 'public/assets/manifest.json', audio: 'assets/source/audio/sonniss-gdc-2026/game-cues.json', license: cueProvenance.license_url,
    thirdPartyNotice: 'Imported/NOTICE.md', rightsStatus: 'Original supplied Seele drone/environment retain their existing local-experiment rights limitations.' },
  sourceFiles,
  files: [...output].map(([destination, bytes]) => ({ destination, bytes: bytes.length, sha256: hash(bytes) })) };
output.set('asset-receipt.json', json(receipt));

// The first review used one filtered cube for both reflections and visible sky.
// Preserve that intake receipt exactly, then add an independently imported copy
// of the SAME pinned JPEG for the unfiltered panoramic background. This is a
// versioned additive migration; no earlier receipt/source is overwritten.
const visibleSky = output.get('Imported/nebula.jpg');
const visibleSkySource = { source: 'public/assets/dogfight/textures/nebula.jpg',
  destination: 'Imported/nebula-sky.jpg', bytes: visibleSky.length, sha256: hash(visibleSky) };
output.set(visibleSkySource.destination, visibleSky);
const receiptV2 = { ...receipt, schemaVersion: 2, previousReceipt: 'asset-receipt.json',
  uniqueOriginalSources: sourceFiles.length,
  sourceFiles: [...sourceFiles, visibleSkySource],
  files: [...output].map(([destination, bytes]) => ({ destination, bytes: bytes.length, sha256: hash(bytes) })) };
output.set('asset-receipt-v002.json', json(receiptV2));

// Preflight every destination before making any writes. Both source assets and
// derived receipts are protected: edited/mismatched files require a new version.
const missing = [];
for (const [relative, bytes] of output) {
  const destination = path.join(root, target, relative);
  try {
    if (!(await readFile(destination)).equals(bytes)) throw new Error(`Refusing to overwrite modified Dogfight intake: ${relative}. Preserve it and use a new versioned destination.`);
  } catch (error) {
    if (error.code !== 'ENOENT' || verify) throw error;
    missing.push([destination, bytes]);
  }
}
for (const [destination, bytes] of missing) {
  await mkdir(path.dirname(destination), { recursive: true });
  // Exclusive creation also protects a concurrent writer after the preflight.
  await writeFile(destination, bytes, { flag: 'wx' });
}
console.log(`${verify ? 'Verified' : 'Prepared'} ${sourceFiles.length} unique pinned Dogfight inputs plus an identical visible-sky copy (${receiptV2.sourceFiles.reduce((sum, file) => sum + file.bytes, 0)} imported bytes); preserved v001 receipt and added v002.`);
