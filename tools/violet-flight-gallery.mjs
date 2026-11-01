// Local SD-080 v007 source/export review; no image edits, fetches or deployment.
import { readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folder = path.join(root, 'artifacts/blender/violet-dragon-v007');
const candidateFolder = path.join(root, 'assets/game/local/spacecraft/space-dragon-spacecraft/violet-v007');
const exported = JSON.parse(await readFile(path.join(candidateFolder, 'export-receipt.json'), 'utf8'));
const source = path.resolve(exported.source);
const expectedSourceFolder = path.join(root, 'assets/source/local/spacecraft/space-dragon-spacecraft');
if (path.dirname(source) !== expectedSourceFolder || path.basename(source) !== 'Space Dragon-v007-violet-flight.blend')
  throw new Error('Unexpected source path; preserve existing gallery and review the receipt.');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceBytes = await readFile(source);
if (digest(sourceBytes) !== exported.sourceSha256) throw new Error('Source differs from export receipt.');
const glb = path.join(candidateFolder, 'dragon-violet-v007.glb');
const glbBytes = await readFile(glb);
if (digest(glbBytes) !== exported.sha256 || glbBytes.length !== exported.bytes)
  throw new Error('GLB differs from export receipt.');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const href = file => path.relative(folder, file).split(path.sep).map(encodeURIComponent).join('/');
const number = n => n.toLocaleString('en-US');
const images = [];
async function figure(title, relative, caption) {
  const file = path.join(root, relative);
  const bytes = await readFile(file);
  images.push({file: relative, bytes: bytes.length, sha256: digest(bytes)});
  return `<figure><h3>${escape(title)}</h3><a href="${href(file)}"><img loading="lazy" src="${href(file)}" alt="${escape(title)}"></a><figcaption>${escape(caption)}</figcaption></figure>`;
}
const finals = [];
for (const [name, title, caption] of [
  ['head-final.png', 'v007 — head after UV/bake correction', 'Actual Blender render. Broad black/white atlas defects are corrected and crown roots are seated. Smooth facial silhouette remains stylized; this is not a reference-quality or owner-approval claim.'],
  ['chase-final.png', 'v007 — rear chase study', 'Actual Blender render of the flight candidate. Wings, tail and tucked limbs are readable. Two pale cap-like surfaces at the rear feet remain visible in this image; actual Unity framing is separate.'],
  ['flight-final.png', 'v007 — flight three-quarter study', 'Actual Blender render with the new flight posture. A still pose does not verify continuous clips, transitions, deformation or combat effects.'],
]) finals.push(await figure(title, `artifacts/blender/violet-dragon-v007/${name}`, caption));
const earlier = [];
for (const [name, title] of [['violet-head.png','Preserved v006 head study'],['violet-full-body.png','Preserved v006 full-body study']])
  earlier.push(await figure(title, `artifacts/blender/violet-dragon-v006/${name}`, 'Earlier source study retained for comparison and recovery. Different cameras, posture and lighting: not a matched-angle measurement.'));
const references = [];
for (const frame of ['03','05','06','07']) references.push(await figure(`Motion reference — frame ${frame}`,
  `artifacts/reference/dragon-flight-c520671c/frame-${frame}.png`,
  'Selected local frame from the owner-supplied flying/fire reference. Reference only, different viewpoint/lighting; no publication or runtime clip/audio use implied.'));
const playerRuns = [
  'artifacts/unity/violet-gpu-skinning-playtest/runs/2026-11-01T01-25-22-561Z',
  'artifacts/unity/violet-gpu-skinning-webgl2/runs/2026-11-01T01-28-28-074Z',
];
for (const run of playerRuns) {
  const report = JSON.parse(await readFile(path.join(root, run, 'report.json'), 'utf8'));
  if (report.result !== 'PASS' || report.cases.length !== 11 || report.cases.some(c => c.result !== 'PASS')
      || report.buildReceipt.sourceSha256 !== exported.sha256)
    throw new Error('Expected matching final 11-case player evidence before labeling the gallery verified.');
}
const playerViews = [
  await figure('Actual Unity — natural flight', `${playerRuns[0]}/natural-flight.png`,
    'Current GPUBatched-configured Development player, installed Chrome/AMD, 1366×768. Actual flight screenshot; source studio framing and lighting differ.'),
  await figure('Actual Unity — charged fire beam', `${playerRuns[0]}/breath-attack.png`,
    'Actual beam capture from the final full WebGPU suite. Target arrangement is a development fixture; imported mouth/socket telemetry is checked separately.'),
];
const video = path.join(root, 'gemini_generated_video_c520671c.mp4');
await stat(video);
const generated = new Date().toISOString();
const snapshot = {
  generatedAt: generated, scope: 'Blender source/export gallery plus matching final 11-case WebGPU/WebGL2 player evidence; owner approval and fallback performance remain open.',
  source: path.relative(root, source).split(path.sep).join('/'),
  sourceBytes: sourceBytes.length, sourceSha256: exported.sourceSha256,
  glb: path.relative(root, glb).split(path.sep).join('/'), glbBytes: glbBytes.length,
  glbSha256: exported.sha256, triangles: exported.triangles, materials: exported.materials,
  meshes: exported.meshes, images,
  limitations: ['Source views are not Unity screenshots.', 'Old/new/reference views do not match cameras.',
    'Face remains stylized; pale rear-foot cap-like surfaces visible in chase-final.',
    'Owner appearance approval remains open; isolated WebGL2 sample 24.3 fps misses 30 fps target.',
    'GPUBatched configuration is not proof of actual skinning execution; repository QA passes on installed Chrome, not a software-CI claim.'],
};
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Violet dragon v007 — source and flight candidate</title>
<style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#14101c;color:#f0ebf6;font:16px/1.5 system-ui,sans-serif}main{max-width:1500px;padding:28px;margin:auto}h1{font-size:clamp(26px,3vw,42px);line-height:1.15}h2{margin-top:38px}h3{font-size:18px;margin:0 0 10px}p{max-width:1150px;color:#cfc3dc}a{color:#d6adff}.notice{padding:16px 20px;background:#2a2036;border-left:4px solid #bb8de6}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}figure{margin:0;background:#211a2c;border:1px solid #493857;padding:14px;border-radius:8px}img{display:block;width:100%;height:auto}figcaption{font-size:14px;color:#bfb2cd;margin-top:10px}dl{display:grid;grid-template-columns:220px 1fr;gap:8px}dt{color:#bfb2cd}dd{margin:0;overflow-wrap:anywhere}code{overflow-wrap:anywhere}.finals figure:first-child{grid-column:1/-1}.finals figure:first-child img{max-height:780px;object-fit:contain;background:#121015}@media(max-width:800px){main{padding:16px}.grid{grid-template-columns:1fr}dl{grid-template-columns:1fr}dd{margin-bottom:8px}}</style>
<main><h1>Violet dragon v007 — source and playable integration</h1><p class="notice"><strong>Integrated and technically verified for the named Unity checks.</strong> Both final 11-case browser suites pass. Separate isolated samples at 1366×768 measured 58.1 fps WebGPU and 24.3 fps WebGL2; the fallback misses the 30 fps target. Owner art approval remains open. The face remains stylized, and the source chase view retains visible pale foot caps.</p>
<p><a href="${href(source)}">Open v007 Blender source</a> · <a href="../../../docs/reports/2026-10-31-purple-organic-dragon.md">Verification receipt and remaining limitations</a> · <a href="${href(path.join(candidateFolder,'export-receipt.json'))}">Export receipt</a> · <a href="../violet-dragon-v006/index.html">Preserved v006 gallery</a></p>
<dl><dt>Current source</dt><dd>${number(sourceBytes.length)} bytes · <code>${escape(exported.sourceSha256)}</code></dd><dt>Current GLB</dt><dd>${number(exported.bytes)} bytes · <code>${escape(exported.sha256)}</code></dd><dt>Export geometry</dt><dd>${number(exported.triangles)} triangles · ${exported.meshes} meshes · ${exported.materials} materials · 15-bone organic rig</dd><dt>Textures</dt><dd>2048 skin atlas; 1024 membrane atlas; six embedded base-color/normal/ORM maps. Small scales, keratin and teeth retain PBR constants. Membrane uses opaque double-sided PBR, without source scattering/transmission.</dd></dl>
<h2>Actual Unity player</h2><p><a href="${href(path.join(root,playerRuns[0],'report.json'))}">Final WebGPU 11/11 report</a> · <a href="${href(path.join(root,playerRuns[1],'report.json'))}">Final WebGL2 11/11 report</a> · <a href="${href(path.join(root,'artifacts/unity/violet-final-inspection/visual-review.md'))}">Final-build neutral-render comparison</a>. Functional verification does not approve art quality or establish a sustained performance pass. The final player preserves controls, live spelling/dodging and encounter-only saves.</p><div class="grid">${playerViews.join('')}</div>
<h2>Current Blender source and flight views</h2><p>Click each image for original resolution. These are actual Blender renders, separate from the Unity screenshots above.</p><div class="grid finals">${finals.join('')}</div>
<h2>Preserved first organic study</h2><p>Earlier source artwork remains available. Posture and cameras differ; this comparison shows the design progression rather than equivalent rendering conditions.</p><div class="grid">${earlier.join('')}</div>
<h2>Owner-supplied motion and fire reference</h2><p><a href="${href(video)}">Open the original local reference video</a> · 20.032 seconds · 1280×720 /24 fps. Local reference use only; no clip/audio publication or runtime reuse authorization. The filename does not verify provider or licensing.</p><div class="grid">${references.join('')}</div>
<p>Generated locally by <code>node tools/violet-flight-gallery.mjs</code>. No external fetches or image editing. Source/GLB/image identities are recorded in <a href="gallery-receipt.json">the gallery snapshot</a>. Earlier galleries remain intact.</p></main></html>`;
await writeFile(path.join(folder, 'gallery-receipt.json'), JSON.stringify(snapshot, null, 2)+'\n');
await writeFile(path.join(folder, 'index.html'), html);
console.log(`Violet v007 review: ${path.join(folder,'index.html')} (${number(exported.bytes)} B GLB)`);
