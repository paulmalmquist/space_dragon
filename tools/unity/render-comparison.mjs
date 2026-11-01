import { readFile, writeFile, readdir, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'artifacts/unity');
await mkdir(root, { recursive: true });
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const relative = file => path.relative(root, file).split(path.sep).map(encodeURIComponent).join('/');
async function exists(file) { try { return (await stat(file)).isFile(); } catch { return false; } }
async function read(file) {
  try { return { file, data: JSON.parse(await readFile(file, 'utf8')) }; }
  catch (error) { return { file, issue: error.code === 'ENOENT' ? 'Pending report' : 'Report could not be read' }; }
}
const nativeFiles = [];
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isDirectory() || !entry.name.startsWith('native')) continue;
  const file = path.join(root, entry.name, 'native-arrival-measurements.json');
  if (await exists(file)) nativeFiles.push({ file, time: (await stat(file)).mtimeMs });
}
nativeFiles.sort((a, b) => b.time - a.time);
const [babylon, browser, fallback, load, native, processMemory] = await Promise.all([
  read(path.join(root, 'babylon/measurements.json')),
  read(path.join(root, 'browser/report.json')),
  read(path.join(root, 'browser-webgl/report.json')),
  read(path.join(root, 'babylon-production-load.json')),
  read(nativeFiles[0]?.file || path.join(root, 'native/native-arrival-measurements.json')),
  read(path.join(root, 'browser-memory.json')),
]);
const shots = ['home', 'arrival', 'reveal'];
const shotLabel = { home: 'Home', arrival: 'Backyard arrival', reveal: 'Pod detail' };
const unityInitial = source => source.data?.initial || source.data?.samples?.[0]?.measurement;
const api = source => unityInitial(source)?.performance?.graphicsApi;
const browserTitle = `Unity browser · ${api(browser) || 'API pending'}`;
const fallbackTitle = `Unity fallback · ${api(fallback) || 'API pending'}`;
const nativeTitle = `Unity Windows · ${native.data?.snapshot?.performance?.graphicsApi || 'API pending'}`;
const missing = source => source.data ? 'Unavailable' : 'Pending';
const number = (value, source, suffix = '', digits = 1) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? `${value.toFixed(digits)}${suffix}` : missing(source);
const bytes = (value, source) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? `${(value / 1048576).toFixed(2)} MiB` : missing(source);
const seconds = (value, source) => number(typeof value === 'number' ? value / 1000 : null, source, ' s', 2);
const dims = (width, height, source) => width > 0 && height > 0 ? `${width} × ${height}` : missing(source);
const status = source => source.issue || source.data?.result || `Captured (${source.data?.samples?.length || 0} views)`;
const sourceLink = source => source.data ? `<a href="${relative(source.file)}">${escape(status(source))}</a>` : escape(status(source));
const tableRow = values => `<tr>${values.map(value => `<td>${value}</td>`).join('')}</tr>`;

const frameRows = [];
for (const [title, source, engine] of [['Babylon · High', babylon, 'babylon'], [browserTitle, browser, 'unity'], [fallbackTitle, fallback, 'unity'], [nativeTitle, native, 'native']]) {
  for (const shot of engine === 'native' ? ['arrival'] : shots) {
    const sample = engine === 'native' ? source.data?.snapshot : source.data?.samples?.find(value => value.shot === shot);
    const measurement = engine === 'unity' ? sample?.measurement : sample;
    const performance = measurement?.performance;
    const frames = engine === 'babylon' ? performance : performance?.frames;
    const drawCalls = engine === 'babylon' ? performance?.drawCalls : performance?.drawCallsAvailable ? performance.previousCompletedFrameDrawCalls : null;
    frameRows.push(tableRow([escape(title), shotLabel[shot], number(frames?.medianFrameMs, source, ' ms'), number(frames?.p95FrameMs, source, ' ms'),
      number(frames?.estimatedFps, source), dims(performance?.renderWidth ?? performance?.cameraPixelWidth, performance?.renderHeight ?? performance?.cameraPixelHeight, source),
      frames ? `${number(frames.sampleCount, source, '', 0)} frames / ${seconds(frames.elapsedMs, source)}` : 'Pending sample',
      number(drawCalls, source, '', 0)]));
  }
}

const bLoad = load.data?.measurement;
const uStart = unityInitial(browser);
const fStart = unityInitial(fallback);
const nStart = native.data?.snapshot;
const notApplicable = 'Not applicable';
const loadRows = [
  ['Navigation → Babylon visual ready', seconds(bLoad?.timings?.navigationToVisualReadyMs, load), notApplicable, notApplicable, notApplicable],
  ['Play quietly click → ready', seconds(bLoad?.timings?.clickToReadyMs, load), notApplicable, notApplicable, notApplicable],
  ['Unity page → player loaded', notApplicable, seconds(uStart?.browser?.playerLoadedMs, browser), seconds(fStart?.browser?.playerLoadedMs, fallback), 'Not recorded'],
  ['Unity page → controls ready', notApplicable, seconds(uStart?.browser?.controlsReadyMs, browser), seconds(fStart?.browser?.controlsReadyMs, fallback), 'Not recorded'],
  ['Initial encoded HTTP body', bytes(load.data?.network?.encodedBodyBytes, load), bytes(browser.data?.network?.encodedBodyBytes, browser), bytes(fallback.data?.network?.encodedBodyBytes, fallback), 'Local application'],
  ['Initial HTTP body + headers', bytes(load.data?.network?.transferBytes, load), bytes(browser.data?.network?.transferBytes, browser), bytes(fallback.data?.network?.transferBytes, fallback), 'Local application'],
  ['JavaScript heap used', bytes(bLoad?.memory?.jsHeapUsedBytes, load), bytes(uStart?.browser?.jsHeapUsedBytes, browser), bytes(fStart?.browser?.jsHeapUsedBytes, fallback), notApplicable],
  ['WASM heap allocated', load.data ? 'Decoder memory not exposed' : 'Pending', bytes(uStart?.browser?.wasmHeapAllocatedBytes, browser), bytes(fStart?.browser?.wasmHeapAllocatedBytes, fallback), notApplicable],
  ['Unity total used memory counter', notApplicable, bytes(uStart?.performance?.memoryAvailable ? uStart.performance.unityTotalUsedMemoryBytes : null, browser),
    bytes(fStart?.performance?.memoryAvailable ? fStart.performance.unityTotalUsedMemoryBytes : null, fallback), bytes(nStart?.performance?.memoryAvailable ? nStart.performance.unityTotalUsedMemoryBytes : null, native)],
].map(row => tableRow(row.map(escape))).join('');

const processRows = ['babylon', 'unity'].map(app => {
  const sample = processMemory.data?.samples?.find(value => value.app === app);
  const source = sample ? { data: sample } : {};
  const period = sample?.processQuery ? `${sample.processQuery.startedAtUtc} – ${sample.processQuery.finishedAtUtc}` : 'Pending';
  return tableRow([escape(app === 'babylon' ? 'Babylon · High' : `Unity · ${sample?.view?.graphicsApi || 'API pending'}`),
    escape(dims(sample?.view?.renderPixels?.[0], sample?.view?.renderPixels?.[1], source)),
    escape(bytes(sample?.totals?.privateCommittedBytes, source)), escape(bytes(sample?.totals?.privateResidentWorkingSetBytes, source)),
    escape(number(sample?.totals?.processCount, source, '', 0)), escape(sample?.result || 'Pending'), `<small>${escape(period)}</small>`]);
}).join('');
const processSection = `<section><h2>Browser process memory</h2><p>Separate fresh Chrome runs show the backyard after loading and a short settling period. These sums cover only the measured browser’s own reported processes, including its renderer and services. Browser overhead is included. Other Chrome instances and the test tools are excluded.</p><div class="table-wrap"><table><thead><tr><th>Candidate</th><th>Render pixels</th><th>Private committed</th><th>Private resident</th><th>Processes</th><th>Evidence</th><th>Counter-read interval (UTC)</th></tr></thead><tbody>${processRows}</tbody></table></div><p class="muted">Committed memory can be resident or paged out; private resident memory counts private pages currently in RAM. These values overlap and must not be added. Shared resident pages are excluded from the sum. GPU VRAM, unreported helper processes, peaks and long-term growth are outside this measurement. ${sourceLink(processMemory)}</p></section>`;

async function imageCard(file, caption) {
  const image = await exists(file) ? `<a href="${relative(file)}"><img src="${relative(file)}" alt="${escape(caption)}" loading="lazy"></a>` : '<div class="pending">Pending capture</div>';
  return `<figure>${image}<figcaption>${escape(caption)}</figcaption></figure>`;
}
const imageSections = [];
for (const [title, source, directory] of [[browserTitle, browser, 'browser'], [fallbackTitle, fallback, 'browser-webgl']]) {
  const pairs = [];
  for (const shot of shots) {
    const quality = babylon.data?.samples?.find(sample => sample.shot === shot)?.quality || 'high';
    pairs.push(`<h3>${shotLabel[shot]}</h3><div class="pair">${await imageCard(path.join(root, `babylon/after/${shot}-${quality}.png`), `Babylon · ${quality}`)}${await imageCard(path.join(root, directory, `${shot}.png`), title)}</div>`);
  }
  imageSections.push(`<section><h2>${escape(title)}</h2><p class="muted">${sourceLink(source)}</p>${pairs.join('')}</section>`);
}
if (native.data) imageSections.push(`<section><h2>${escape(nativeTitle)}</h2><p class="muted">Newest recorded native run · ${sourceLink(native)}</p><div class="pair">${await imageCard(path.join(root, 'browser/arrival.png'), browserTitle)}${await imageCard(path.join(path.dirname(native.file), 'native-arrival.png'), nativeTitle)}</div></section>`);

const evidence = [babylon, browser, fallback, load, native, processMemory].map(source => `<li>${escape(path.relative(root, source.file))}: ${sourceLink(source)}${source.data?.failure ? ` — ${escape(source.data.failure).slice(0, 280)}` : ''}</li>`).join('');
const devices = [
  ['Babylon', babylon.data?.device?.renderer || bLoad?.device?.renderer],
  [browserTitle, uStart?.performance?.renderer], [fallbackTitle, fStart?.performance?.renderer], [nativeTitle, nStart?.performance?.renderer],
].map(([name, device]) => `<li><strong>${escape(name)}:</strong> ${escape(device || 'Pending device evidence')}</li>`).join('');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Space Dragon · renderer comparison</title><style>
*{box-sizing:border-box}body{margin:0;background:#0a141d;color:#dce8ed;font:15px/1.55 system-ui,sans-serif}main{max-width:1440px;margin:auto;padding:40px 28px}h1{font-size:34px;line-height:1.1;margin:10px 0 18px}h2{font-size:24px;margin:0 0 12px}h3{font-size:17px;margin:24px 0 8px}p{max-width:1000px}.eyebrow{color:#9ac7d2;font-size:12px;letter-spacing:.16em;text-transform:uppercase}.muted,small{color:#a8bcc7}section{margin-top:42px;padding-top:26px;border-top:1px solid #29404e}.table-wrap{overflow:auto;border:1px solid #29404e;border-radius:8px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:11px 13px;border-bottom:1px solid #29404e;text-align:left;vertical-align:top}th{background:#172936;color:#bedde5;white-space:nowrap}tr:last-child td{border:0}td:first-child{font-weight:600;min-width:180px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px}figure{margin:0;background:#11212d;border:1px solid #29404e;border-radius:8px;overflow:hidden}img{display:block;width:100%;height:auto}figcaption{padding:10px 13px;color:#c9dce6}a{color:#90d4df}.pending{aspect-ratio:16/9;display:grid;place-items:center;color:#a2b8c5;background:#132330}details{margin-top:26px;padding:16px;background:#11212d;border-radius:8px}li{margin:6px 0}summary{cursor:pointer;font-weight:600}@media(max-width:760px){main{padding:24px 16px}.pair{grid-template-columns:1fr}h1{font-size:28px}}
</style></head><body><main><p class="eyebrow">Space Dragon · local production candidates</p><h1>First Contact, compared in the browser and on Windows</h1><p>The home, yard and character are still provisional. This page collects actual captures and short measurements; human art approval and sustained performance testing remain pending.</p><p class="muted">The views share the original pod and camera targets. Lighting, tone mapping, surrounding detail and output dimensions can differ. Those differences limit conclusions about engine speed or final visual quality.</p>
<section><h2>Frame timing</h2><p>Lower milliseconds means a faster frame. Each ten-second run reports up to 300 recent frames after warmup. The measured window below can be shorter than the run. Native Windows targets 60 fps; browser timing follows the display. Draw counts describe one completed frame.</p><div class="table-wrap"><table><thead><tr><th>Renderer</th><th>View</th><th>Median</th><th>95th percentile</th><th>Average fps</th><th>Render pixels</th><th>Measured window</th><th>Draws</th></tr></thead><tbody>${frameRows.join('')}</tbody></table></div></section>
<section><h2>Startup, download and memory</h2><p>Startup events differ: Babylon renders behind its welcome screen, while Unity loads a player and runs a short intro before handing over control. A zero click delay means Babylon was already ready. Download sizes are local test responses; compression and delivery settings can change them.</p><div class="table-wrap"><table><thead><tr><th>Observation</th><th>Babylon production</th><th>${escape(browserTitle)}</th><th>${escape(fallbackTitle)}</th><th>Unity Windows</th></tr></thead><tbody>${loadRows}</tbody></table></div><p class="muted">Memory rows measure different things and can overlap. Do not add them or use them as equivalent total-memory figures. GPU memory is not measured. Missing evidence is shown as Pending or Unavailable.</p></section>
${processSection}${imageSections.join('')}<details><summary>Devices and evidence</summary><ul>${devices}</ul><ul>${evidence}</ul><p class="muted">Generated from local reports on ${escape(new Date().toISOString())}. Images and reports stay local; this page loads no external resources.</p></details></main></body></html>`;
const output = path.join(root, 'comparison.html');
await writeFile(output, html);
console.log(`Wrote ${output}; ${[babylon, browser, fallback, load, native, processMemory].filter(source => source.data).length}/6 report groups available.`);
