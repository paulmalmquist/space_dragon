// SD-080 source review only. No external fetches, image edits or runtime promotion.
import { readFile, writeFile, readdir, stat, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(repo, 'artifacts/blender/violet-dragon-v006');
const output = path.join(directory, 'index.html');
const sourceRoot = path.join(repo, 'assets/source/local/spacecraft/space-dragon-spacecraft');
const receipt = JSON.parse(await readFile(path.join(directory, 'final-source-receipt.json'), 'utf8'));
const source = path.resolve(receipt.source);
const within = (root, candidate) => {
  const suffix = path.relative(root, candidate);
  return suffix === '' || (!path.isAbsolute(suffix) && suffix !== '..' && !suffix.startsWith(`..${path.sep}`));
};
if (!within(await realpath(sourceRoot), await realpath(source))) throw new Error('Source receipt escapes the intended source folder.');
const sourceBytes = await readFile(source);
if (sourceBytes.length !== receipt.sourceBytes || createHash('sha256').update(sourceBytes).digest('hex') !== receipt.sourceSha256)
  throw new Error('Source identity changed; update its measured receipt before regenerating this gallery.');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const href = file => path.relative(directory, file).split(path.sep).map(encodeURIComponent).join('/');
const number = value => Number.isFinite(value) ? value.toLocaleString('en-US') : 'unavailable';
async function figure(title, file, caption) {
  if (!within(await realpath(path.join(repo, 'artifacts')), await realpath(file))) throw new Error('Image escaped local artifact folder.');
  return `<figure><h3>${escape(title)}</h3><a href="${href(file)}"><img loading="lazy" src="${href(file)}" alt="${escape(title)}"></a><figcaption>${escape(caption)}</figcaption></figure>`;
}
const entries = await readdir(directory);
const currentViews = entries.filter(name => /^violet-[a-z0-9-]+\.png$/i.test(name)).sort((a, b) => {
  if (a === 'violet-full-body.png') return -1;
  if (b === 'violet-full-body.png') return 1;
  return a.localeCompare(b);
});
if (!currentViews.length) throw new Error('No actual violet source-review images exist.');
const views = await Promise.all(currentViews.map(name => figure(name.replace(/\.png$/i, '').replace(/-/g, ' '), path.join(directory, name),
  'Actual Blender source render. This does not verify export, skinning, flight clips or Unity appearance.')));
const stages = [];
for (const [name, title] of [['first-shape-review.png', 'Preserved first shape'], ['refined-full.png', 'Intermediate refinement']]) {
  if (entries.includes(name)) stages.push(await figure(title, path.join(directory, name), 'Earlier source iteration retained for review; not the final game asset.'));
}
const referenceDirectory = path.join(repo, 'artifacts/reference/dragon-flight-c520671c');
const referenceFrames = [];
for (const frame of ['01', '03', '05', '06', '07']) {
  const file = path.join(referenceDirectory, `frame-${frame}.png`);
  try { await stat(file); }
  catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  referenceFrames.push(await figure(`Owner video — extracted frame ${frame}`, file,
    'Local analysis frame from the supplied flying/fire-breath reference. Reference use only; not a matched-angle comparison or approved runtime texture.'));
}
const referenceVideo = path.join(repo, 'gemini_generated_video_c520671c.mp4');
let videoLink = '';
try {
  await stat(referenceVideo);
  videoLink = `<p><a href="${href(referenceVideo)}">Open the original local reference video</a> · 20.032 s · 1280×720 / 24 fps. Audio stream present; no audio-reuse or human mix approval implied.</p>`;
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Violet dragon — source candidate review</title>
<style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#14101b;color:#eee9f5;font:16px/1.5 system-ui,sans-serif}main{max-width:1600px;margin:auto;padding:24px}h1{font-size:clamp(25px,3vw,40px);line-height:1.2}h2{margin-top:36px}h3{font-size:18px;margin:0 0 8px}p{max-width:1150px;color:#c8bfd4}a{color:#d5adff}code{overflow-wrap:anywhere}.notice{border-left:4px solid #c19aff;padding:14px 18px;background:#271d34}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}figure{margin:0;padding:14px;background:#20192c;border:1px solid #45364f;border-radius:8px}img{display:block;width:100%;height:auto}figcaption{font-size:14px;color:#bcb0cb;margin-top:10px}dl{display:grid;grid-template-columns:240px 1fr;gap:8px;max-width:1100px}dt{color:#bcb0cb}dd{margin:0;overflow-wrap:anywhere}@media(max-width:850px){main{padding:16px}.grid{grid-template-columns:1fr}dl{grid-template-columns:1fr}dd{margin-bottom:10px}}</style>
<main><h1>Violet organic dragon — first source candidate</h1><p class="notice"><strong>Blender source only. Not yet a game-ready or approved cinematic asset.</strong> Anatomy and surface sculpture remain stylized. The new 15-bone rig has no validated deformation/flight export yet; this model is not a drop-in replacement for the mechanical nine-bone candidate. The live Unity lab still uses the previous mechanical model while separate camera/audio work is tested.</p>
<p><a href="${href(source)}">Open the current Blender source</a> · <a href="../../../docs/reports/2026-10-31-purple-organic-dragon.md">Source verification receipt and remaining work</a>. Post-Undo recovery, first shape and prior mechanical sources remain preserved.</p>
<dl><dt>Source bytes</dt><dd>${number(receipt.sourceBytes)}</dd><dt>Visible meshes / base triangles</dt><dd>${number(receipt.visibleMeshes)} / ${number(receipt.baseTrianglesBeforeModifiers)} before modifiers — not a game mesh budget</dd><dt>New bones</dt><dd>${number(receipt.bones)}</dd><dt>Source SHA-256</dt><dd><code>${escape(receipt.sourceSha256)}</code></dd></dl>
<h2>Current source views</h2><p>Click an image for its original resolution. These are actual Blender renders, not concept-generation results or Unity screenshots.</p><div class="grid">${views.join('')}</div>
<h2>Preserved iterations</h2><div class="grid">${stages.join('')}</div>
<h2>Owner-supplied motion and fire reference</h2><p>Sampled frames guide posture, wing movement, throat warm-up and the broad fire jet. They use different viewpoints and lighting from the source renders; this is not a matched-camera or quality-equivalence claim. The clip's filename does not independently verify its provider or license. No publication or runtime clip/audio use is authorized.</p>${videoLink}<div class="grid">${referenceFrames.join('')}</div>
<p>Generated locally by <code>node tools/violet-dragon-gallery.mjs</code>. No external requests or image edits. The SD-078 mechanical gallery remains unchanged.</p></main></html>`;
await writeFile(output, html, 'utf8');
console.log(`Violet source gallery: ${output}`);
