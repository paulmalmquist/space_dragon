/** Offline HDR-to-ENV conversion. Uses only a local Vite server and installed native Chrome. */
import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, access, unlink } from 'node:fs/promises';
import { resolve, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appUrl = new URL(process.argv[2] ?? 'http://127.0.0.1:5182/space-dragon/drive/');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(appUrl.hostname)) throw new Error('Preparation only accepts a loopback Vite URL.');
const source = resolve(root, 'assets/source/local/drive-materials/v001/kloofendal_48d_partly_cloudy_puresky_2k.hdr');
const output = resolve(root, process.argv[3] ?? 'public/assets/drive/sky/daylight-512.env');
const verifyOnly = process.argv.includes('--verify');
const outputRelative = relative(resolve(root, 'public/assets/drive/sky'), output);
if (!outputRelative || outputRelative.startsWith(`..${sep}`) || outputRelative === '..' || outputRelative.includes(sep) || !outputRelative.endsWith('.env')) throw new Error('Output must be a named ENV file directly in the owned sky directory.');
if (verifyOnly) await access(output);
else {
  try { await access(output); throw new Error(`Refusing to replace existing output: ${output}`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceBytes = await readFile(source);
const sourceSha256 = sha(sourceBytes);
if (sourceSha256 !== '5244534e9cf5b606f2ff513aa00ddb161b0a4826ffd88a0d3bd03ac29247d198') throw new Error('Source HDR does not match the licensed receipt.');
const evidence = resolve(root, 'assets/source/local/drive-materials/environment-v001');
await mkdir(evidence, { recursive: true });
await mkdir(dirname(output), { recursive: true });
const baseUrl = new URL('../', appUrl);
const sourceUrl = new URL('__drive-environment-source.hdr', baseUrl).href;
const helper = resolve(root, '.tools/drive-environment-prepare.html');
await mkdir(dirname(helper), { recursive: true });
await writeFile(helper, `<!doctype html><html><head><link rel="icon" href="data:,"></head><body><canvas id="canvas" width="64" height="64"></canvas><script type="module">
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math';
import { HDRCubeTexture } from '@babylonjs/core/Materials/Textures/hdrCubeTexture';
import { EnvironmentTextureTools } from '@babylonjs/core/Misc/environmentTextureTools';
const engine = new Engine(document.querySelector('#canvas'), false, { powerPreference: 'high-performance' });
const scene = new Scene(engine); new FreeCamera('preparation-camera', new Vector3(0, 0, 0), scene);
const ready = new Promise((resolve, reject) => {
  const texture = new HDRCubeTexture(${JSON.stringify(sourceUrl)}, scene, 512, false, true, false, true,
    () => resolve(texture), message => reject(new Error(message)), false, false, false, 64);
});
engine.runRenderLoop(() => scene.render());
window.exportDriveEnvironment = async () => {
  const texture = await ready;
  const buffer = await EnvironmentTextureTools.CreateEnvTextureAsync(texture, { imageType: 'image/png', disableIrradianceTexture: true });
  const data = new Uint8Array(buffer); let binary = '';
  for (let index = 0; index < data.length; index += 16384) binary += String.fromCharCode(...data.subarray(index, index + 16384));
  return { base64: btoa(binary), renderer: engine.getGlInfo(), cubeSize: texture.getSize(), lodGenerationScale: texture.lodGenerationScale,
    hasSphericalPolynomial: !!texture.sphericalPolynomial };
};
</script></body></html>`);
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11'] });
const page = await browser.newPage();
page.setDefaultTimeout(240_000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.route(sourceUrl, route => route.fulfill({ body: sourceBytes, contentType: 'application/octet-stream' }));
try {
  let exported;
  // First use of authoring-only imports can make Vite optimize and reload once.
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(new URL('.tools/drive-environment-prepare.html', baseUrl).href);
    await page.waitForFunction(() => typeof window.exportDriveEnvironment === 'function');
    try { exported = await page.evaluate(() => window.exportDriveEnvironment()); break; }
    catch (error) { if (attempt === 2 || !/Execution context was destroyed|Failed to fetch dynamically imported|Outdated Optimize Dep/i.test(error.message)) throw error; }
  }
  const bytes = Buffer.from(exported.base64, 'base64');
  if (!verifyOnly) await writeFile(output, bytes, { flag: 'wx' });
  const { base64: _, ...metadata } = exported;
  const processing = 'Babylon 9.33.0 offline 512px cubemap; default 4096-sample specular prefilter, 64px spherical-polynomial integration target; PNG RGBD mip chain and polynomial irradiance via EnvironmentTextureTools.CreateEnvTextureAsync';
  const record = { path: `assets/drive/sky/${outputRelative}`, asset: 'kloofendal_48d_partly_cloudy_puresky',
    sourceUrl: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/kloofendal_48d_partly_cloudy_puresky_2k.hdr',
    sourceBytes: sourceBytes.length, sourceSha256, bytes: bytes.length, sha256: sha(bytes), processing };
  if (!verifyOnly) {
    const provenancePath = resolve(root, 'public/assets/drive/materials/PROVENANCE.json');
    const provenance = JSON.parse(await readFile(provenancePath, 'utf8'));
    provenance.files = provenance.files.filter(file => file.path !== 'assets/drive/sky/daylight-2k.hdr' && file.path !== record.path);
    provenance.files.push(record);
    await writeFile(provenancePath, JSON.stringify(provenance, null, 2) + '\n');
    const oldRuntimeSource = resolve(root, 'public/assets/drive/sky/daylight-2k.hdr');
    try {
      if (sha(await readFile(oldRuntimeSource)) !== sourceSha256) throw new Error('Unexpected old runtime HDR: leaving it untouched.');
      await unlink(oldRuntimeSource); // The verified identical original remains in the local source directory.
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const report = { ...metadata, ...record, source: relative(root, source).replaceAll('\\', '/'),
    babylonVersion: JSON.parse(await readFile(resolve(root, 'node_modules/@babylonjs/core/package.json'), 'utf8')).version,
    verificationOnly: verifyOnly, matchesExistingBytes: verifyOnly ? sha(await readFile(output)) === record.sha256 : undefined, errors };
  await writeFile(resolve(evidence, verifyOnly ? 'reproduction.json' : 'receipt.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  if (errors.length || report.matchesExistingBytes === false) process.exitCode = 1;
} finally { await browser.close(); }
