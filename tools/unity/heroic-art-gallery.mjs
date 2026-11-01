// Local SD-078 review gallery. Reads observed artifacts only; no fetches or image edits.
// Regenerate after final player reports: node tools/unity/heroic-art-gallery.mjs
import { readFile, writeFile, access, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const artifacts = path.join(repo, 'artifacts/unity');
const directory = path.join(artifacts, 'heroic-dragon-review');
const output = path.join(directory, 'index.html');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const relative = file => path.relative(directory, file).split(path.sep).map(encodeURIComponent).join('/');
const within = (root, candidate) => {
  const suffix = path.relative(root, candidate);
  return suffix === '' || (!path.isAbsolute(suffix) && suffix !== '..' && !suffix.startsWith(`..${path.sep}`));
};
const number = (value, digits = 2) => Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: digits }) : 'unavailable';
async function optionalJson(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw new Error(`Cannot read review report ${file}: ${error.message}`); }
}
async function figure(title, file, caption) {
  await access(file);
  if (!within(await realpath(artifacts), await realpath(file))) throw new Error('Gallery image escaped the local Unity artifact directory.');
  return `<figure><h3>${escape(title)}</h3><a href="${relative(file)}"><img loading="lazy" src="${relative(file)}" alt="${escape(title)}"></a><figcaption>${escape(caption)}</figcaption></figure>`;
}

const chase = await Promise.all([
  figure('Original — chase', path.join(directory, 'blender-original-chase.png'), 'Retained v004 source, same Blender chase camera.'),
  figure('Heroic v005 — chase', path.join(directory, 'blender-heroic-chase.png'), 'Authored wing structure, shoulder machinery and dorsal/tail detail.'),
]);
const head = await Promise.all([
  figure('Original — head', path.join(directory, 'blender-original-head.png'), 'Retained source, same Blender head camera.'),
  figure('Heroic v005 — head', path.join(directory, 'blender-heroic-head.png'), 'Gunmetal/crimson source treatment; this is not a Unity frame.'),
]);
const flap = await figure('Heroic v005 — flap pose', path.join(directory, 'blender-heroic-flap.png'), 'Sampled Blender pose inspection, not proof against every articulation collision.');

const orbitRoot = path.join(artifacts, 'near-orbit-review');
const orbitPath = path.join(orbitRoot, 'report.json');
const orbit = await optionalJson(orbitPath);
let orbitSection = '<p>Actual near-orbit player captures are pending.</p>';
if (orbit) {
  const images = [];
  for (const target of [0, 120, 240]) {
    const heading = (Array.isArray(orbit.headings) ? orbit.headings : []).find(item => item.target === target);
    if (!heading?.path) continue;
    const file = path.resolve(orbitRoot, heading.path);
    if (!within(orbitRoot, file) || path.extname(file).toLowerCase() !== '.png') throw new Error('Invalid near-orbit screenshot path.');
    images.push(await figure(`Unity heading ${target}°`, file,
      `QUIET DEVELOPMENT FIXTURE: threats and rock collision suppressed. Observed yaw ${number(heading.observedAfter, 1)}°. Real steering; no injected pose. Art inspection only.`));
  }
  orbitSection = `<p>Run <code>${escape(orbit.runId)}</code> · capture status <strong>${escape(orbit.result)}</strong> · ${escape((orbit.viewport || []).join(' × '))}.</p>
    <p><a href="${relative(orbitPath)}">Capture report and fixture details</a>. These game views use different cameras from the Blender pairs and are not matched-angle comparisons. Quiet captures do not establish encounter difficulty or natural performance.</p><div class="grid">${images.join('')}</div>`;
}

let measured = '';
for (const [label, folder] of [['WebGPU', 'dogfight-heroic-playtest'], ['WebGL2', 'dogfight-heroic-playtest-webgl2']]) {
  const file = path.join(artifacts, folder, 'report.json');
  const report = await optionalJson(file);
  if (!report) { measured += `<article><h3>${label}</h3><p>Final player report pending.</p></article>`; continue; }
  const status = `<p>Run <code>${escape(report.runId)}</code> · <strong>${escape(report.result)}</strong> · <a href="${relative(file)}">full report</a></p>`;
  if (report.result !== 'PASS') { measured += `<article><h3>${label}</h3>${status}<p>No passing measured summary is claimed for this report.</p></article>`; continue; }
  const cases = Array.isArray(report.cases) ? report.cases : [];
  const sample = (Array.isArray(report.samples) ? report.samples : []).find(item => item.validFlightSample && item.after);
  const after = sample?.after;
  const metrics = after ? `<dl><dt>Mean interval / approximate fps</dt><dd>${number(after.frameMeanMs)} ms / ${number(1000 / after.frameMeanMs, 1)}</dd><dt>p95 interval</dt><dd>${number(after.frameP95Ms)} ms</dd><dt>Last-frame draws / rendered triangles</dt><dd>${number(after.drawCalls, 0)} / ${number(after.renderTriangles, 0)}</dd><dt>Unity texture allocation</dt><dd>${number(after.textureAllocatedMiB)} MiB</dd></dl>` : '<p>No valid natural-flight sample was recorded.</p>';
  measured += `<article><h3>${label}</h3>${status}<p>${cases.filter(item => item.result === 'PASS').length}/${cases.length} recorded cases pass. Renderer: ${escape(report.renderer?.graphics)}; ${escape(report.renderer?.device)}.</p>${metrics}</article>`;
}

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>SD-078 — Heroic dragon and near-orbit review</title>
<style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#10151e;color:#edf0f6;font:16px/1.5 system-ui,sans-serif}main{max-width:1600px;margin:auto;padding:24px}h1{font-size:clamp(24px,3vw,38px);line-height:1.2}h2{margin-top:40px}h3{font-size:18px;margin:0 0 8px}p{max-width:1100px;color:#bfcbdb}a{color:#99d9ed}code{overflow-wrap:anywhere}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}figure,article{margin:0;padding:16px;background:#182130;border:1px solid #334255;border-radius:8px}img{display:block;width:100%;height:auto}figcaption{color:#afbdd0;font-size:14px;margin-top:10px}dl{display:grid;grid-template-columns:1fr 1fr;gap:10px}dt{color:#afbdd0}dd{margin:0}.single{max-width:1000px}@media(max-width:800px){main{padding:16px}.grid{grid-template-columns:1fr}dl{grid-template-columns:1fr}dd{margin-bottom:10px}}</style>
<main><h1>Heroic mechanical dragon &amp; near-orbit battlefield</h1><p>SD-078 local review. Source and runtime evidence remain distinct. New artwork is not owner-approved merely because these images exist. <a href="../../../docs/reports/2026-10-31-near-orbit-heroic-dragon.md">Verification receipt, artifact identities and remaining limits</a>.</p>
<h2>Blender source: original and upgrade</h2><p>The source pairs share the same Blender camera for each view. They show actual retained and upgraded models, not generated concept art. Click any image for its original resolution.</p><div class="grid">${chase.join('')}</div><h2>Head comparison</h2><div class="grid">${head.join('')}</div><h2>Articulation sample</h2><div class="single">${flap}</div>
<h2>Actual Unity player: three headings</h2>${orbitSection}
<h2>Recorded player checks</h2><p>Only reports marked PASS contribute measurements below. Ten-second wall-clock frame intervals are not GPU timings or sustained-performance guarantees. Unity texture allocation differs by backend and is not exact driver VRAM. Natural-flight samples are separate from the quiet art fixtures.</p><div class="grid">${measured}</div>
<p>Generated locally by <code>tools/unity/heroic-art-gallery.mjs</code>. No external requests, embedded reference photographs or image edits.</p></main></html>`;
await writeFile(output, html, 'utf8');
console.log(`Heroic art gallery: ${output}`);
