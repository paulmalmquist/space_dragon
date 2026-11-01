// Capture the explicit development inspection mode after a fresh local Web build.
// Never starts Unity or a server. Matching camera does not imply lighting/art parity.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, copyFile, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const url = new URL(process.env.SPACE_DRAGON_DOGFIGHT_URL || 'http://127.0.0.1:5207/space-dragon-dogfight/');
assert(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Local player only.');
assert(['http:', 'https:'].includes(url.protocol) && url.port === '5207', 'Use the existing local Dogfight review server on port 5207.');
const output = path.resolve(repo, process.argv[2] || 'artifacts/unity/violet-inspection');
assert(output.startsWith(path.join(repo, 'artifacts') + path.sep), 'Keep review artifacts in this repository artifact directory.');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const runOutput = path.join(output, 'runs', runId);
await mkdir(runOutput, {recursive: true});
const forceWebGL2 = process.env.SPACE_DRAGON_DOGFIGHT_WEBGL2 === '1';
const report = {runId, startedAt: new Date().toISOString(), url: url.href, viewport: [1200, 800], forceWebGL2,
  result: 'RUNNING', command: process.argv.join(' '),
  scope: 'Installed Chrome and the actual Unity development player. Explicit inspection URL creates an isolated static asset scene; no combat, gameplay time manipulation, rewards or save writes.',
  comparison: {reference: 'artifacts/blender/violet-dragon-v007/flight-final.png', referenceRenderer: 'Blender EEVEE',
    sourceCamera: {positionBlender: [10, 12, 6], targetBlender: [0, 0, .1], lensMm: 50, sensorMm: [36, 24], resolution: [1200, 800]},
    matchingCameraUnity: {position: [-10, 6, -12], target: [0, .1, 0]},
    visualReview: 'PENDING: inspect silhouette, visible cap/triangle artifacts, scale relief, facial shape, membrane highlights and color differences manually.'},
  performanceScope: 'Stationary neutral-view wall-clock frame intervals after resetting measurement counters; not a natural combat benchmark, GPU time or endurance test.',
  limitations: ['Neutral Unity lights/reflection differ from the Blender EEVEE reference; camera matching is not pixel-equivalent lighting.',
    'Source face remains stylized and visible foot/root caps may need another art pass; screenshots do not constitute owner approval.',
    'No human sound/comfort review or physical controller/mobile test is performed.'],
  views: [], artifacts: [], console: [], consoleErrors: [], pageErrors: [], externalRequests: [], requestFailures: []};
const sha = body => createHash('sha256').update(body).digest('hex');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const pointDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
let browser, page, currentView = 'startup', timer, writes = Promise.resolve();
async function save() {
  const body = JSON.stringify(report, null, 2);
  writes = writes.catch(() => {}).then(async () => {
    await writeFile(path.join(runOutput, 'report.json'), body);
    await writeFile(path.join(output, 'report.json'), body);
  });
  await writes;
}
async function artifact(relative) {
  const body = await readFile(path.join(repo, relative));
  report.artifacts.push({path: relative, bytes: body.length, sha256: sha(body)});
  return body;
}
async function snapshot() {
  if (report.pageErrors.length) throw new Error(report.pageErrors[0].text);
  return page.evaluate(() => {
    const error = document.querySelector('#error');
    if (error && !error.hidden) throw new Error(document.querySelector('#error-message')?.textContent || 'Unity load failed');
    const api = window.__SPACE_DRAGON_DOGFIGHT__;
    if (!api?.instance) return null;
    api.send('RequestSnapshot');
    if (api.lastSnapshotError) throw new Error(api.lastSnapshotError);
    return api.snapshot();
  });
}
async function waitState(predicate, label, timeout = 30000) {
  const deadline = Date.now() + timeout; let state;
  while (Date.now() < deadline) {
    state = await snapshot();
    if (state && predicate(state)) return state;
    await delay(100);
  }
  throw new Error(`${label}: timed out; last state=${JSON.stringify(state)}`);
}

try {
  await save();
  timer = setInterval(() => save().catch(error => console.error(error)), 2000); timer.unref();
  report.head = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: repo, encoding: 'utf8'}).trim();
  report.buildReceipt = JSON.parse(await artifact('unity/SpaceDragon/Builds/DogfightWeb/build-receipt.json'));
  assert.equal(report.buildReceipt.result, 'Succeeded');
  assert.equal(report.buildReceipt.developmentBuild, true, 'Inspection mode requires a development player.');
  const requested = process.env.SPACE_DRAGON_DOGFIGHT_ASSET;
  assert(!requested || ['heroic-v005', 'violet-v007'].includes(requested), 'Unknown selected asset.');
  const intake = 'unity/SpaceDragon/Assets/SpaceDragon/Dogfight/';
  const available = await stat(path.join(repo, intake, 'asset-receipt-v004.json')).then(file => file.isFile()).catch(error => {
    if (error.code === 'ENOENT') return false; throw error;
  });
  const organic = requested === 'violet-v007' || (!requested && available);
  report.selectedAsset = organic ? 'violet-v007' : 'heroic-v005';
  report.intakeVerification = JSON.parse(execFileSync(process.execPath,
    [path.join(repo, 'tools/unity', organic ? 'prepare-violet-dragon.mjs' : 'prepare-heroic-dragon.mjs'), '--verify'],
    {cwd: repo, encoding: 'utf8', maxBuffer: 4*1024*1024}).trim());
  report.modelContract = JSON.parse(await artifact(intake + (organic ? 'violet-contract-v007.json' : 'heroic-contract-v005.json')));
  await artifact(intake + (organic ? 'asset-receipt-v004.json' : 'asset-receipt-v003.json'));
  assert.equal(report.buildReceipt.sourceSha256, report.modelContract.sha256, 'Player must contain the selected model.');
  assert.equal(report.buildReceipt.dragonVersion || 'heroic-v005', report.selectedAsset);
  const served = await fetch(new URL('build-receipt.json', url), {signal: AbortSignal.timeout(15000)});
  assert(served.ok, 'The existing local server must serve the build receipt.');
  report.servedBuildReceipt = JSON.parse(await served.text());
  assert.deepEqual(report.servedBuildReceipt, report.buildReceipt, 'Served and local build identities must match.');
  await artifact('unity/SpaceDragon/Assets/SpaceDragon/Runtime/Dogfight/DogfightAssetInspection.cs');
  await artifact('tools/unity/review-violet-inspection.mjs');
  if (organic) {
    try {
      const reference = await artifact(report.comparison.reference);
      await writeFile(path.join(runOutput, 'blender-flight-final.png'), reference);
      report.comparison.referenceSha256 = sha(reference);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      report.limitations.push('The requested local Blender reference image was unavailable; no matching-image comparison can be claimed.');
    }
  } else report.limitations.push('Explicit mechanical rollback selected: the purple Blender image is not a matching asset comparison.');

  browser = await chromium.launch({channel: 'chrome', headless: true, args: forceWebGL2 ? ['--disable-features=WebGPUService'] : []});
  report.browser = browser.version();
  const context = await browser.newContext({viewport: {width: 1200, height: 800}, deviceScaleFactor: 1, serviceWorkers: 'block'});
  page = await context.newPage();
  const cdp = await context.newCDPSession(page); await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', {cacheDisabled: true});
  page.on('pageerror', error => report.pageErrors.push({view: currentView, text: error.message}));
  page.on('console', message => {
    const entry = {view: currentView, type: message.type(), text: message.text()};
    if (report.console.length < 500) report.console.push(entry);
    if (message.type() === 'error') report.consoleErrors.push(entry);
  });
  page.on('request', request => {if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== url.origin) report.externalRequests.push(request.url());});
  page.on('requestfailed', request => report.requestFailures.push({view: currentView, url: request.url(), failure: request.failure()}));
  let storageBefore;
  for (const view of ['blender-neutral', 'front', 'side']) {
    currentView = view;
    const viewUrl = new URL(url); viewUrl.searchParams.set('inspect', 'dragon'); viewUrl.searchParams.set('inspectionview', view);
    await page.goto(viewUrl.href, {waitUntil: 'domcontentloaded', timeout: 180000});
    const ready = await waitState(state => state.mode === 'asset-inspection' && state.view === view && state.frameSamples > 2,
      'actual isolated inspection scene ready', 240000);
    assert.equal(ready.model, organic ? 'DragonViolet.v007.Organic.Inspection' : 'DragonHeroic.v005.Authored.Inspection');
    assert.equal(ready.modelTriangles, report.modelContract.instanceTriangles || report.modelContract.triangles);
    assert.equal(ready.combatActive, false); assert.equal(ready.savesWritten, false);
    assert.equal(ready.width, 1200); assert.equal(ready.height, 800);
    assert.equal(ready.browser.canvasWidth, 1200); assert.equal(ready.browser.canvasHeight, 800);
    assert(typeof ready.graphics === 'string' && ready.graphics && typeof ready.device === 'string' && ready.device, 'Actual renderer identity must be reported.');
    if (forceWebGL2) assert.equal(ready.graphics, 'OpenGLES3');
    if (view === 'blender-neutral') {
      assert(pointDistance(ready.cameraPosition, {x: -10, y: 6, z: -12}) < .0001);
      assert(pointDistance(ready.cameraTarget, {x: 0, y: .1, z: 0}) < .0001);
      assert.equal(ready.focalLength, 50);
      const expectedFov = Math.atan(24 / (2*50))*360/Math.PI;
      assert(Math.abs(ready.verticalFov - expectedFov) < .01, '50mm vertical framing must match a 36x24 sensor.');
      report.renderer = {graphics: ready.graphics, device: ready.device, softwareReported: /swiftshader|llvmpipe|software rasterizer/i.test(ready.device)};
      if (report.renderer.softwareReported) report.limitations.push('Reported renderer is software; no hardware GPU performance claim.');
      storageBefore = await page.evaluate(() => ({...localStorage}));
    }
    await page.evaluate(() => window.__SPACE_DRAGON_DOGFIGHT__.send('ResetMeasurement'));
    const start = performance.now();
    await delay(2400);
    const measured = await waitState(state => state.mode === 'asset-inspection' && state.frameSamples >= 30, 'stationary measurement frames');
    assert(Number.isFinite(measured.frameMeanMs) && measured.frameMeanMs > 0);
    const file = path.join(runOutput, `${view}.png`);
    await page.locator('#unity-canvas').screenshot({path: file, timeout: 15000});
    await copyFile(file, path.join(output, `${view}.png`));
    const image = sharp(await readFile(file)), dimensions = await image.metadata(), statistics = await image.stats();
    assert.equal(dimensions.width, 1200); assert.equal(dimensions.height, 800);
    assert(statistics.channels.some(channel => channel.stdev > 1), 'Inspection image must not be a single blank color.');
    report.views.push({view, url: viewUrl.href, path: path.relative(output, file).split(path.sep).join('/'),
      screenshotSha256: sha(await readFile(file)), before: ready, measured, after: await snapshot(),
      stationarySampleWallMs: performance.now() - start, approximateFps: 1000/measured.frameMeanMs,
      imageCheck: 'Nonuniform1200x800 pixels only; not automatic dragon/material/quality recognition.'});
    await save(); console.log(`Captured neutral asset view ${view}`);
  }
  report.storage = {before: storageBefore, after: await page.evaluate(() => ({...localStorage}))};
  assert.deepEqual(report.storage.after, report.storage.before, 'Inspection must not change localStorage.');
  const references = report.comparison.referenceSha256 ? '<figure><img src="blender-flight-final.png"><figcaption>Final Blender EEVEE reference; source lighting differs.</figcaption></figure>' : '';
  const figures = report.views.map(view => `<figure><img src="${view.view}.png"><figcaption>${view.view} — actual Unity player</figcaption></figure>`).join('');
  await writeFile(path.join(runOutput, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Space Dragon organic inspection</title><style>body{font:16px system-ui;background:#15151d;color:#eee;margin:24px}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}figure{margin:0}img{width:100%}figcaption{padding:10px}a{color:#c9b3ff}</style><h1>Organic dragon inspection</h1><p>Actual build ${report.buildReceipt.createdUtc}; camera-matched comparison with different neutral lighting. Visual review and final art approval remain pending.</p><main>${references}${figures}</main><p><a href="report.json">Build identity, renderer, checks and limits</a></p></html>`);
} catch (error) {
  report.fatal = String(error.stack || error); console.error(error);
  try {if (page && !page.isClosed()) await page.screenshot({path: path.join(runOutput, 'failure.png')});} catch { /* Keep the original failure. */ }
} finally {
  clearInterval(timer);
  report.finishedAt = new Date().toISOString();
  report.result = !report.fatal && report.views.length === 3 && !report.consoleErrors.length && !report.pageErrors.length
    && !report.requestFailures.length && !report.externalRequests.length ? 'CAPTURED_REQUIRES_VISUAL_REVIEW' : 'FAIL';
  await save();
  if (browser) await browser.close();
  console.log(`Inspection ${report.result}: ${path.join(runOutput, 'report.json')}`);
  if (report.result === 'FAIL') process.exitCode = 1;
}
