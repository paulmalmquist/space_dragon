// Offline, reproducible Unity derivatives of the explicitly recorded CC0 scans.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = path.join(root, 'assets/source/local/town-drive/surface-v002');
const destination = path.join(root, 'unity/SpaceDragon/Assets/SpaceDragon/TownDrive/Art/v002');
const sha = b => createHash('sha256').update(b).digest('hex');
if (process.argv.includes('--verify')) {
  const receipt = JSON.parse(await readFile(path.join(destination, 'provenance.json'), 'utf8'));
  for (const file of receipt.files) {
    if (file.path.includes('..') || path.isAbsolute(file.path)) throw Error('Invalid derivative path.');
    const bytes = await readFile(path.join(destination, file.path));
    if (sha(bytes) !== file.sha256 || bytes.length !== file.bytes) throw Error(`Changed art input: ${file.path}`);
  }
  console.log(`Verified ${receipt.files.length} scanned surface derivatives, CC0 provenance retained.`);
  process.exit(0);
}
const inputs = JSON.parse((await readFile(path.join(source, 'sources.json'), 'utf8')).replace(/^\uFEFF/, ''));
const receipt = { version: 2, provider: 'Poly Haven', credit: 'Powered by Poly Haven', license: 'CC0-1.0',
  licenseUrl: 'https://polyhaven.com/license', recipe: 'Unchanged diffuse RGB and OpenGL normal direction; 1024px 8-bit PNG. Mask R=0 metal, G=source AO, B=0, A=1-roughness. No AI generation.', assets: [], files: [] };
async function put(relative, bytes) {
  const target = path.join(destination, relative); await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes); receipt.files.push({ path: relative, bytes: bytes.length, sha256: sha(bytes) });
}
for (const asset of inputs.assets) {
  const maps = {};
  for (const file of asset.files) {
    const bytes = await readFile(path.join(source, file.path));
    if (sha(bytes) !== file.sha256) throw Error(`Source changed: ${file.path}`);
    maps[file.slot] = bytes;
  }
  await put(`${asset.id}/albedo.png`, await sharp(maps.diffuse).removeAlpha().png().toBuffer());
  await put(`${asset.id}/normal.png`, await sharp(maps.normal).removeAlpha().png().toBuffer());
  const rough = await sharp(maps.roughness).greyscale().raw().toBuffer({ resolveWithObject: true });
  const ao = await sharp(maps.occlusion).greyscale().raw().toBuffer({ resolveWithObject: true });
  if (rough.info.width !== 1024 || rough.info.height !== 1024 || ao.data.length !== rough.data.length) throw Error('Unexpected source dimensions.');
  const pixels = Buffer.alloc(1024 * 1024 * 4);
  for (let i=0;i<rough.data.length;i++) { pixels[i*4+1]=ao.data[i]; pixels[i*4+3]=255-rough.data[i]; }
  await put(`${asset.id}/mask.png`, await sharp(pixels,{raw:{width:1024,height:1024,channels:4}}).png().toBuffer());
  receipt.assets.push({ id: asset.id, url: `https://polyhaven.com/a/${asset.id}`, authors: asset.info.authors,
    sourceDimensionsMillimetres: asset.info.dimensions, sourceFiles: asset.files });
}
await writeFile(path.join(destination,'provenance.json'),JSON.stringify(receipt,null,2)+'\n');
await writeFile(path.join(destination,'LICENSE.txt'),'Powered by Poly Haven\nCC0 1.0 Universal: https://creativecommons.org/publicdomain/zero/1.0/\nAsset license: https://polyhaven.com/license\nSee provenance.json for authors, source URLs, hashes and conversion.\n');
console.log(`Prepared ${receipt.files.length} native maps. Original downloads stay outside Unity Assets.`);
