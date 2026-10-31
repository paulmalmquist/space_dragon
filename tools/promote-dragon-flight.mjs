// Local promotion only. No upload, Git operation or deployment.
import { readFile, writeFile, copyFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { verifyDragonFlight } from './verify-dragon-flight.mjs';

const source = process.argv[2] || 'assets/game/local/spacecraft/space-dragon-spacecraft/flight-v003/dragon-flight-v003.glb';
const runtimePath = 'assets/dogfight/models/dragon-flight-v003.glb', target = `public/${runtimePath}`;
const verified = await verifyDragonFlight(source);
const hash = data => createHash('sha256').update(data).digest('hex');
try {
  await stat(target);
  if (hash(await readFile(target)) !== verified.sha256) throw new Error('Versioned runtime target differs; choose a new version instead of overwriting it.');
} catch (error) { if (error.code !== 'ENOENT') throw error; }
await copyFile(source, target);
const sourceBlendLocal = 'assets/source/local/spacecraft/space-dragon-spacecraft/Space Dragon Spacecraft-v004-flight.blend';
const manifestPath = 'public/assets/manifest.json', manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const entry = { id: 'space-dragon-flight-pipeline', version: 'v003', role: 'active Dogfight Lab authored animation/socket candidate',
  status: 'owner-authorized local integration; measured verification in receipt; human art approval and deployment separate',
  runtimePath, rollbackRuntimePath: 'assets/dogfight/models/dragon-cinematic-benchmark-v002.glb',
  sourceBlendLocal, sourceSha256: hash(await readFile(sourceBlendLocal)),
  exportScript: 'tools/export_dragon_flight.py', promotionScript: 'tools/promote-dragon-flight.mjs',
  verificationScript: 'tools/verify-dragon-flight.mjs', contract: 'docs/engineering/DRAGON_ASSET_CONTRACT.md',
  receipt: 'docs/reports/2026-10-30-dragon-asset-pipeline.md', ...verified,
  files: [{ path: runtimePath, bytes: verified.bytes, sha256: verified.sha256 }] };
// The structural report's extras must not overwrite the documentation link.
entry.exportMetadata = verified.contract; entry.contract = 'docs/engineering/DRAGON_ASSET_CONTRACT.md';
entry.status = 'local candidate; structural verification passed; see receipt for browser evidence';
const index = manifest.assets.findIndex(asset => asset.id === entry.id);
if (index >= 0) manifest.assets[index] = entry; else manifest.assets.push(entry);
const rollback = manifest.assets.find(asset => asset.id === 'space-dragon-cinematic-benchmark');
if (rollback) rollback.role = 'retained cinematic v002 rollback; active flight candidate adds clips and sockets';
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ target, bytes: verified.bytes, sha256: verified.sha256, status: 'locally promoted; not deployed' }));
