// Build a local review gallery from observed verifier artifacts only.
// Usage: node tools/unity/dogfight-gallery.mjs [artifacts/unity/dogfight-playtest/report.json]
// This performs no browser/Unity operation and never fetches external resources.
import { readFile, writeFile, stat, mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const artifactRoot = path.join(repo, 'artifacts/unity/dogfight-playtest');
const reportPath = path.resolve(process.argv[2] || path.join(artifactRoot, 'report.json'));
const destination = path.join(repo, 'artifacts/unity/dogfight-gallery.html');
const within = (root, candidate) => {
  const relative = path.relative(root, candidate);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
};
if (!within(artifactRoot, reportPath) || path.extname(reportPath).toLowerCase() !== '.json')
  throw new Error('Read a verifier JSON report beneath artifacts/unity/dogfight-playtest.');
let report;
try {
  if (!within(await realpath(artifactRoot), await realpath(reportPath))) throw new Error('Report resolves outside the Dogfight artifact directory.');
  report = JSON.parse(await readFile(reportPath, 'utf8'));
} catch (error) {
  throw new Error(`Cannot build a measured gallery without the actual report: ${reportPath}\n${error.message}`);
}
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const href = absolute => path.relative(path.dirname(destination), absolute).split(path.sep).map(encodeURIComponent).join('/');
const list = value => Array.isArray(value) ? value : [];
const number = (value, digits = 1) => Number.isFinite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }) : 'not recorded';
const count = value => Number.isFinite(value) && value >= 0 ? number(value, 0) : 'unavailable';
const finitePosition = p => p && [p.x, p.y, p.z].every(Number.isFinite);
const knownCases = {
  'natural-flight': 'natural-flight-performance',
  'flight-controls': 'flight-controls-mouse-modes-evasion-and-pause',
  'missile-lock': 'missiles-plasma-kill-salvage-and-sequential-recharge',
  'salvage-recovered': 'missiles-plasma-kill-salvage-and-sequential-recharge',
  'critical-propulsion': 'localized-warnings-and-maneuvering-repair',
  'repair-in-progress': 'localized-warnings-and-maneuvering-repair',
  'repaired-patchwork': 'localized-warnings-and-maneuvering-repair',
  'repair-interrupted': 'projectile-interrupt-retains-repair-resources',
  'repair-limit': 'three-repair-limit-survives-extra-salvage',
  'missile-evasion': 'incoming-missile-warning-and-roll-evasion',
  'breath-windup': 'live-spelling-windup-roar-and-fire-beam',
  'fire-beam': 'live-spelling-windup-roar-and-fire-beam',
  'salvage-full': 'full-inventory-leaves-recoverable-salvage',
  'asteroid-collision': 'environment-collision-loss-and-complete-restart',
  'dragon-disabled': 'environment-collision-loss-and-complete-restart',
  'restart-restored': 'environment-collision-loss-and-complete-restart',
};
const fixtureDefinitions = {
  quiet: 'Suppresses ordinary encounter threats for the condition test.',
  target: 'Suppresses ordinary threats and places the first bogey at a moving player-relative position.',
  supply: 'Adds salvage through the authoritative capacity-limited inventory method.',
  incoming: 'Spawns an actual hostile homing missile.',
  crash: 'Places an actual asteroid collider in the flight path.',
  disable: 'Applies explicit fatal hull damage; not evidence that the preceding collision was fatal.',
  resetPerf: 'Clears performance measurements only; does not change encounter conditions.',
};
function fixtureDescription(action) {
  if (fixtureDefinitions[action]) return fixtureDefinitions[action];
  if (/^damage:[012]$/.test(action)) return `Arranges localized ${['hull', 'propulsion', 'weapons'][Number(action.at(-1))]} damage through the state damage API.`;
  if (/^interrupt:[012]$/.test(action)) return 'Schedules an actual incoming projectile to test repair interruption.';
  return 'Fixture action recorded by the verifier; see source report for scope.';
}
function caseFor(shot) {
  return shot.case || knownCases[shot.name] || (String(shot.name).startsWith('FAIL-') ? String(shot.name).slice(5) : null);
}
function attribution(shot) {
  const caseName = caseFor(shot);
  const all = list(report.fixtures).filter(f => caseName && f.case === caseName);
  const preceding = Number.isFinite(shot.wallMs) ? all.filter(f => !Number.isFinite(f.wallMs) || f.wallMs <= shot.wallMs) : all;
  const arranged = preceding.filter(f => f.action !== 'resetPerf');
  let label = arranged.length ? 'ARRANGED CONDITIONS' : 'CONDITIONS NOT FULLY ATTRIBUTED';
  if (caseName === 'natural-flight-performance' && !arranged.length && shot.snapshot?.fixture === false) label = 'NATURAL ENCOUNTER';
  if (String(shot.name).startsWith('FAIL-')) label += ' / FAILURE CAPTURE';
  const timing = Number.isFinite(shot.wallMs)
    ? 'Actions recorded before this screenshot in its case.'
    : 'Case-level fixture inventory: screenshot timing was not recorded, so this is not a claim that every action preceded this image.';
  return { caseName, preceding, label, timing };
}
function observationMap(snapshot) {
  if (!finitePosition(snapshot?.position)) return '<p class="muted">Position map unavailable: no complete snapshot position.</p>';
  const origin = snapshot.position;
  const points = [
    ...list(snapshot.enemies).filter(e => !e.dead && finitePosition(e.position)).map(e => ({ name: e.id, p: e.position, color: '#ffbc70', kind: 'bogey' })),
    ...list(snapshot.debris).filter(e => finitePosition(e.position)).map(e => ({ name: e.id, p: e.position, color: '#81dee4', kind: 'salvage' })),
  ];
  const range = Math.max(250, Math.ceil(Math.max(0, ...points.map(p => Math.max(Math.abs(p.p.x-origin.x), Math.abs(p.p.z-origin.z))))/100)*100);
  const at = p => [100+(p.x-origin.x)/range*83, 100-(p.z-origin.z)/range*83];
  const marks = points.map(p => {
    const [x,y] = at(p.p);
    const title = escape(`${p.kind} ${p.name}; relative X ${number(p.p.x-origin.x)} m, Z ${number(p.p.z-origin.z)} m`);
    return p.kind === 'salvage' ? `<rect x="${x-3}" y="${y-3}" width="6" height="6" fill="${p.color}"><title>${title}</title></rect>`
      : `<circle cx="${x}" cy="${y}" r="3.5" fill="${p.color}"><title>${title}</title></circle>`;
  }).join('');
  const f = snapshot.forward;
  const norm = finitePosition(f) ? Math.hypot(f.x,f.z) : 0;
  const arrow = norm > .001 ? `<path d="M100 100 L${100+f.x/norm*19} ${100-f.z/norm*19}" stroke="#fff" stroke-width="2"/>` : '';
  return `<svg viewBox="0 0 200 200" role="img" aria-label="Observed relative X Z positions; player in center, amber bogeys, cyan salvage">
    <rect x="1" y="1" width="198" height="198" rx="5" fill="#07151f" stroke="#3a5968"/>
    <path d="M100 15V185 M15 100H185" stroke="#29414d"/><circle cx="100" cy="100" r="83" fill="none" stroke="#29414d"/>
    <text x="103" y="13" fill="#a9c4cb" font-size="10">+Z</text><text x="181" y="96" fill="#a9c4cb" font-size="10">+X</text>
    ${marks}${arrow}<circle cx="100" cy="100" r="4" fill="#fff"/></svg>
    <p class="tiny">Observed X/Z positions · ±${count(range)} m<br>White: dragon · amber: bogeys · cyan: salvage.<br>Top-down projection, not a level map. Asteroid positions and altitude are not included in this snapshot.</p>`;
}
async function screenshotCard(shot) {
  const description = attribution(shot), s = shot.snapshot || {};
  let image;
  try {
    if (typeof shot.path !== 'string' || /^(?:[a-z]+:|[\\/])/i.test(shot.path)) throw new Error('Non-relative image path rejected.');
    // Verifier paths are relative to its stable output root even when reading
    // the immutable copy of report.json inside runs/<id>/.
    const absolute = path.resolve(artifactRoot, shot.path);
    if (!within(artifactRoot, absolute) || !/\.(png|jpe?g|webp)$/i.test(absolute)) throw new Error('Image must be a local Dogfight screenshot.');
    if (!within(await realpath(artifactRoot), await realpath(absolute))) throw new Error('Image resolves outside Dogfight artifacts.');
    if (!(await stat(absolute)).isFile()) throw new Error('Screenshot is not a file.');
    image = `<a href="${escape(href(absolute))}"><img src="${escape(href(absolute))}" loading="lazy" alt="${escape(shot.name)} — ${escape(description.label)}"></a>`;
  } catch (error) { image = `<p class="missing">Image unavailable: ${escape(error.message)}</p>`; }
  const fixtures = description.preceding.length ? description.preceding.map(f => `<li><code>${escape(f.action)}</code>${f.afterRestart ? ' (after restart)' : ''}: ${escape(fixtureDescription(f.action))}</li>`).join('') : '<li>No fixture actions attributed to this case.</li>';
  const loss = description.caseName === 'environment-collision-loss-and-complete-restart'
    ? list(report.cases).find(c => c.name === description.caseName)?.evidence?.lossCondition : null;
  return `<article><div class="card-heading"><h3>${escape(shot.name)}</h3><span class="tag">${escape(description.label)}</span></div>
    ${image}<div class="observation"><div><p class="muted">Case: ${escape(description.caseName || 'not recorded')}</p>
    <p>Simulation ${number(s.elapsed)} s · ${s.paused ? 'PAUSED' : s.dead ? 'DISABLED' : 'live'}<br>
    Hull ${number(s.hull,0)} · propulsion ${number(s.propulsion,0)} · weapons ${number(s.weapons,0)}<br>
    Missile charges ${count(s.missileCharges)} · salvage ${count(s.salvage)} · repairs remaining ${count(s.repairsRemaining)}<br>
    Repair progress ${Number.isFinite(s.repairProgress) ? number(s.repairProgress*100,0)+'%' : 'not recorded'} · drones ${count(s.drones)} · patches ${count(s.patches)}<br>
    Animation ${escape(s.animation || 'not recorded')} · breath ${escape(s.breathPhase || 'not recorded')} · warning ${escape(s.warning || 'not recorded')}</p>
    ${loss ? `<p class="notice">Loss evidence: ${escape(loss)}</p>` : ''}
    <details><summary>Exact fixture attribution</summary><p>${escape(description.timing)}</p><ul>${fixtures}</ul></details>
    </div><div class="map">${observationMap(s)}</div></div></article>`;
}
function performanceCard(sample) {
  const s = sample.after || {};
  const live = sample.validFlightSample === true;
  return `<article class="performance"><h3>${escape(sample.kind || 'Recorded sample')}</h3><p class="tag">${live ? 'LIVE-FLIGHT SAMPLE' : 'LOSS-INCLUSIVE / LIVE-FLIGHT VALIDITY NOT ESTABLISHED'}</p>
    <dl><dt>Wall-clock duration</dt><dd>${number(sample.wallMs/1000)} s</dd><dt>Simulation advance</dt><dd>${number(sample.simulationSeconds)} s</dd>
    <dt>Canvas</dt><dd>${count(s.width)} × ${count(s.height)}</dd><dt>Observed frame intervals</dt><dd>${count(s.frameSamples)}</dd>
    <dt>Mean / p95 frame interval</dt><dd>${number(s.frameMeanMs,2)} / ${number(s.frameP95Ms,2)} ms</dd>
    <dt>Derived average rate</dt><dd>${Number.isFinite(s.frameMeanMs)&&s.frameMeanMs>0 ? number(1000/s.frameMeanMs,1)+' fps' : 'unavailable'}</dd>
    <dt>Last observed draw calls</dt><dd>${count(s.drawCalls)}</dd><dt>Last observed rendered triangles</dt><dd>${count(s.renderTriangles)}</dd>
    <dt>Unity texture allocation</dt><dd>${number(s.textureAllocatedMiB,2)} MiB</dd>
    <dt>Added armor triangles</dt><dd>${count(s.addedArmorTriangles)}</dd><dt>Renderer / reported device</dt><dd>${escape(s.graphics || report.renderer?.graphics || 'not recorded')} / ${escape(s.device || report.renderer?.device || 'not recorded')}</dd></dl></article>`;
}

const screenshots = await Promise.all(list(report.screenshots).map(screenshotCard));
const cases = list(report.cases);
const passCount = cases.filter(c => c.result === 'PASS').length;
const caseRows = cases.map(c => `<tr><td>${escape(c.name)}</td><td class="${c.result === 'PASS' ? 'pass' : 'fail'}">${escape(c.result)}</td><td>${c.failure ? `<details open><summary>Failure</summary><pre>${escape(c.failure)}</pre></details>` : escape(c.finishedAt || 'not finished')}</td></tr>`).join('');
const errors = ['pageErrors','consoleErrors','requestFailures','externalRequests'].map(key => `${escape(key)}: ${list(report[key]).length}`).join(' · ');
const artifactRows = list(report.artifacts).map(a => `<tr><td>${escape(a.path)}</td><td>${count(a.bytes)}</td><td><code>${escape(a.sha256)}</code></td></tr>`).join('');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>Unity Dogfight — measured local review</title><style>
:root{color-scheme:dark;font:16px/1.5 system-ui,sans-serif;background:#071019;color:#e0ebee}*{box-sizing:border-box}body{margin:0}main{max-width:1480px;margin:auto;padding:32px 28px 70px}h1{font-size:36px;line-height:1.2;margin:10px 0 16px}h2{font-size:24px;margin-top:42px;color:#9ce6ec}h3{font-size:18px;margin:0}p{max-width:1100px}a{color:#9ce6ec}code{overflow-wrap:anywhere;font-size:.86em}pre{white-space:pre-wrap;font-size:12px;max-width:100%;overflow-wrap:anywhere}.muted,.tiny{color:#a0b6c1}.tiny{font-size:12px}.tag{font-size:11px;font-weight:700;letter-spacing:.06em;color:#ffd096;border:1px solid #63513e;padding:5px 8px;border-radius:3px;display:inline-block}.hero{border-bottom:1px solid #35505c;padding-bottom:24px}.notice{border-left:3px solid #e7a24c;padding:10px 15px;background:#251e16}.fail{color:#ffb6a8}.pass{color:#99e5ba}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(580px,100%),1fr));gap:24px}.card-heading{padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}article{border:1px solid #294652;background:#0c1c27;border-radius:6px;overflow:hidden}article img{width:100%;height:auto;display:block;background:#02080c}.missing{padding:30px;color:#ffb6a8}.observation{display:grid;grid-template-columns:minmax(0,1fr) 185px;gap:18px;padding:0 18px 18px}.observation p{font-size:13px}.map{padding-top:16px}.map svg{width:100%;height:auto}.performance{padding:20px}dl{display:grid;grid-template-columns:1fr 1fr;gap:9px 20px;font-size:14px}dt{color:#aac0c9}dd{margin:0;overflow-wrap:anywhere}details{font-size:13px}summary{cursor:pointer;color:#9ce6ec}ul{padding-left:23px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;vertical-align:top;padding:10px;border-bottom:1px solid #29414b}th{color:#9ce6ec}.scroll{overflow:auto}footer{font-size:13px;color:#98afbb;margin-top:35px}@media(max-width:700px){main{padding:20px 12px}.observation{grid-template-columns:1fr}.map{max-width:200px}h1{font-size:28px}dl{grid-template-columns:1fr}dd{margin-bottom:8px}}
</style></head><body><main>
<header class="hero"><span class="tag">LOCAL DEVELOPMENT PLAYER / OBSERVED ARTIFACTS</span><h1>Space Dragon · Unity Dogfight</h1>
<p>${escape(report.scope || 'Scope not recorded.')}</p><p><strong>Verifier result: ${escape(report.result || 'not recorded')} · ${passCount}/${cases.length} recorded cases passed.</strong><br>
Run ${escape(report.runId || 'not recorded')} · started ${escape(report.startedAt || 'not recorded')} · finished ${escape(report.finishedAt || 'not recorded')}<br>
Source HEAD <code>${escape(report.head || 'not recorded')}</code> · Chrome ${escape(report.browser || 'not recorded')}<br>
<a href="${escape(href(reportPath))}">Read the exact source report</a></p><p class="muted">${errors}</p></header>
${report.fatal ? `<section class="notice fail"><h2>Verifier stopped</h2><pre>${escape(report.fatal)}</pre></section>` : ''}
<section><h2>Measured performance</h2><p>${escape(report.performanceScope || 'Performance scope was not recorded. Values below retain their original report labels.')}</p>
<p class="muted">Implementation scope: four combined armor accent meshes, 416 added triangles, original imported rig and model retained. Runtime counters below are the observed measurements; final art approval remains open.</p>
${report.renderer?.softwareReported ? '<p class="notice">The report identifies a software renderer. These values do not establish hardware GPU performance.</p>' : ''}
<div class="grid">${list(report.samples).map(performanceCard).join('') || '<p class="notice">No measured samples recorded in this report.</p>'}</div></section>
<section><h2>Observed screenshots and positions</h2><p>Click an image to inspect its original resolution. Condition labels distinguish natural flight from arranged development conditions. Maps use only positions recorded alongside each screenshot.</p>
<div class="grid">${screenshots.join('') || '<p class="notice">No screenshots recorded in this report.</p>'}</div></section>
<section><h2>Verification outcomes</h2><div class="scroll"><table><thead><tr><th>Case</th><th>Result</th><th>Completion / failure</th></tr></thead><tbody>${caseRows}</tbody></table></div></section>
<section><h2>Remaining limitations</h2><ul>${list(report.limitations).map(l => `<li>${escape(l)}</li>`).join('') || '<li>No limitations recorded; this absence is not an approval.</li>'}</ul>
<p class="notice">This gallery reports measured observations. It does not approve final art, family usability, sustained performance, release readiness or deployment.</p></section>
<section><h2>Inspected build artifacts</h2><p>Development build: ${report.buildReceipt?.developmentBuild === true ? 'yes' : report.buildReceipt?.developmentBuild === false ? 'no' : 'not recorded'}.</p>
<div class="scroll"><table><thead><tr><th>Artifact</th><th>Bytes</th><th>SHA-256</th></tr></thead><tbody>${artifactRows}</tbody></table></div></section>
<footer>Generated locally from ${escape(path.relative(repo,reportPath).split(path.sep).join('/'))}. No external images, fonts, scripts, analytics or media requests.</footer>
</main></body></html>`;
await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination, html, 'utf8');
console.log(JSON.stringify({ output: path.relative(repo, destination).split(path.sep).join('/'), result: report.result, cases: cases.length, screenshots: screenshots.length, samples: list(report.samples).length }, null, 2));
