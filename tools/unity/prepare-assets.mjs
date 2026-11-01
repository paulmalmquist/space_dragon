/** Reproducible, local-only derivatives of assets already used by the Babylon reference. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const target = 'unity/SpaceDragon/Assets/SpaceDragon/Imported';
const records = [];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
if (process.argv.includes('--verify')) {
  const receipt = JSON.parse(await readFile(path.join(root, target, 'asset-receipt.json'), 'utf8'));
  for (const record of receipt.files) {
    const relative = record.destination;
    if (typeof relative !== 'string' || relative.includes('..') || path.isAbsolute(relative)) throw new Error('Invalid candidate receipt path.');
    const bytes = await readFile(path.join(root, target, relative));
    if (bytes.length !== record.bytes || sha(bytes) !== record.sha256) throw new Error(`Candidate asset differs: ${relative}`);
  }
  console.log(`Verified ${receipt.files.length} imported assets without requiring ignored Blender/source HDR folders.`);
  process.exit(0);
}
async function put(source, destination, transform, sourceDescription) {
  const input = await readFile(path.join(root, source));
  const output = transform ? await transform(input) : input;
  const destinationPath = path.join(root, target, destination);
  await mkdir(path.dirname(destinationPath), { recursive: true });
  try {
    const existing = await readFile(destinationPath);
    if (!existing.equals(output)) throw new Error(`Refusing to overwrite different candidate bytes: ${destinationPath}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await writeFile(destinationPath, output);
  }
  records.push({ source, sourceSha256: sha(input), sourceBytes: input.length,
    destination, sha256: sha(output), bytes: output.length, sourceDescription });
}
await put('assets/game/local/props/pod/v002/rescue-pod-v002.glb', 'rescue-pod-v002.glb', null,
  'Original Blender pod v002, uncompressed export of the same geometry/materials/animation used by Babylon. No redesign; avoids adding a second KTX2 decoder. See docs/reports/2026-10-29-pod-asset.md.');
for (const surface of ['grass', 'concrete', 'plaster', 'wood']) {
  for (const channel of ['albedo', 'normal', 'roughness']) {
    await put(`public/assets/drive/materials/${surface}-${channel}.webp`, `Surfaces/${surface}-${channel}.png`,
      bytes => sharp(bytes).png().toBuffer(), 'Lossless PNG conversion of already manifest-listed runtime WEBP; pixels retained; CC0 provenance in surface-provenance.json.');
  }
  await put(`public/assets/drive/materials/${surface}-roughness.webp`, `Surfaces/${surface}-metallic-smoothness.png`,
    async bytes => {
      const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      for (let offset = 0; offset < data.length; offset += 4) {
        const smoothness = 255 - data[offset + 1];
        data[offset] = data[offset + 1] = data[offset + 2] = 0;
        data[offset + 3] = smoothness;
      }
      return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
    }, 'URP dielectric metallic/smoothness packing: RGB=0, alpha=255 minus original roughness green. Source pixels unchanged elsewhere.');
}
await put('public/assets/drive/materials/PROVENANCE.json', 'surface-provenance.json', null, 'Existing texture provenance; copied without change.');
await put('assets/source/local/drive-materials/v001/kloofendal_48d_partly_cloudy_puresky_2k.hdr', 'daylight.hdr', null,
  'Poly Haven CC0 https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky; same source as Babylon daylight-512.env; see tools/prepare-drive-environment.mjs.');
await writeFile(path.join(root, target, 'asset-receipt.json'), JSON.stringify({ schemaVersion: 1,
  scope: 'Local Unity comparison candidate; same pod and source surfaces/environment as Babylon. No new reference photographs or likeness assets.',
  tool: `sharp ${sharp.versions.sharp}`, files: records }, null, 2) + '\n');
console.log(`Prepared ${records.length} assets (${records.reduce((sum, value) => sum + value.bytes, 0)} bytes); existing differing files are never overwritten.`);
