// Actual-player art capture: hold real ArrowRight to inspect the horizon at 0/120/240 degrees.
// Run only after the heroic-v005 Unity Web build is ready and served locally on port5207.
// The explicit quiet fixture suppresses combat/collisions. These are art views, not performance samples.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const url = new URL(process.env.SPACE_DRAGON_DOGFIGHT_URL || 'http://127.0.0.1:5207/space-dragon-dogfight/');
assert(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Only a localhost player may be reviewed.');
assert(['http:', 'https:'].includes(url.protocol), 'Use the local HTTP review server.');
const output = path.resolve(repo, process.argv[2] || 'artifacts/unity/near-orbit-review');
assert(output.startsWith(path.join(repo, 'artifacts') + path.sep), 'Keep art captures in this repository artifact directory.');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const runOutput = path.join(output, 'runs', runId);
await mkdir(runOutput, { recursive: true });
const forceWebGL2 = process.env.SPACE_DRAGON_DOGFIGHT_WEBGL2 === '1';
const report = {
  runId, startedAt: new Date().toISOString(), url: url.href, viewport: [1366, 768], forceWebGL2,
  result: 'RUNNING', command: process.argv.join(' '),
  scope: 'Installed Chrome, actual Unity Web player, fresh encounter and explicit quiet development fixture. Real ArrowRight inputs turn the dragon; snapshots derive yaw from atan2(forward.x, forward.z). No time or pose injection, no pause, no direct gameplay mutation beyond the declared condition fixture.',
  limitations: ['Quiet fixture suppresses threats and rock collision: screenshots are art inspections, not difficulty, natural-performance or gameplay evidence.',
    'Planet visibility, dragon v005 appearance and material quality require visual review of the screenshots; this script does not infer them from state.',
    'Heading tolerance is 14 degrees to allow actual steering/camera damping. Pitch is left neutral.',
    'Camera snapshot provides FOV/trailing distance and viewport; no exact camera transform is currently exposed.'],
  headings: [], trace: [], fixtures: [], artifacts: [], pageErrors: [], consoleErrors: [], console: [], requestFailures: [], externalRequests: [],
};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const heading = state => ((Math.atan2(state.forward.x, state.forward.z) * 180 / Math.PI) + 360) % 360;
const angularError = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
let browser, context, page, reportTimer, currentHeading = 'startup';
let reportWrite = Promise.resolve();

async function saveReport() {
  const text = JSON.stringify(report, null, 2);
  reportWrite = reportWrite.catch(() => {}).then(async () => {
    await writeFile(path.join(runOutput, 'report.json'), text);
    await writeFile(path.join(output, 'report.json'), text);
  });
  await reportWrite;
}
async function snapshot() {
  if (report.pageErrors.length) throw new Error(`Player failed: ${report.pageErrors[0].text}`);
  const state = await page.evaluate(() => {
    const error = document.querySelector('#error');
    if (error && !error.hidden) throw new Error(document.querySelector('#error-message')?.textContent || 'Unity load failed.');
    const api = window.__SPACE_DRAGON_DOGFIGHT__;
    if (!api?.instance) return null;
    api.send('RequestSnapshot');
    if (api.lastSnapshotError) throw new Error(api.lastSnapshotError);
    return api.snapshot ? api.snapshot() : api.latestSnapshot;
  });
  if (state?.forward && report.trace.length < 1000) report.trace.push({ wallMs: Date.now(), elapsed: state.elapsed,
    heading: heading(state), requestedHeading: currentHeading, paused: state.paused, dead: state.dead,
    position: state.position, forward: state.forward, fov: state.fov, cameraTrailingDistance: state.cameraTrailingDistance });
  return state;
}
async function waitState(predicate, label, timeout = 30000) {
  const deadline = Date.now() + timeout;
  let state;
  while (Date.now() < deadline) {
    state = await snapshot();
    if (state?.scene && predicate(state)) return state;
    if (state?.dead || state?.paused) throw new Error(`${label}: flight stopped unexpectedly.`);
    await delay(60);
  }
  throw new Error(`${label} deadline exceeded. Last state: ${JSON.stringify(state)}`);
}
async function settle(seconds) {
  const before = await snapshot();
  assert(before && !before.paused && !before.dead, 'Art captures require active flight.');
  return waitState(s => s.elapsed - before.elapsed >= seconds, 'real flight settling', 15000);
}
async function capture(target) {
  currentHeading = target;
  const before = await snapshot();
  assert.equal(before.fixture, true, 'Quiet fixture must be explicitly active.');
  assert(!before.paused && !before.dead, 'Capture must be live flight.');
  assert(angularError(heading(before), target) <= 14, `Expected heading near ${target}, observed ${heading(before)}.`);
  const name = `heading-${String(target).padStart(3, '0')}`;
  const file = path.join(runOutput, `${name}.png`);
  await page.locator('#unity-canvas').screenshot({ path: file, timeout: 15000 });
  await copyFile(file, path.join(output, `${name}.png`));
  const after = await snapshot();
  report.headings.push({ target, observedBefore: heading(before), observedAfter: heading(after),
    path: path.relative(output, file).split(path.sep).join('/'), fixture: 'quiet', before, after });
  console.log(`Near-orbit art view: ${target} degrees (observed ${heading(before).toFixed(1)}).`);
  await saveReport();
}
async function turnTo(target) {
  currentHeading = target;
  // At full rate, the current steering damper adds about11 degrees after release.
  // Stop early, then capture the observed settled heading with a documented tolerance.
  await page.keyboard.down('ArrowRight');
  try { await waitState(s => heading(s) >= target - 11 && heading(s) < target + 20,
    `real ArrowRight reaches the ${target}-degree approach`, 30000); }
  finally { await page.keyboard.up('ArrowRight'); }
  await settle(.8);
  await capture(target);
}

try {
  await saveReport();
  reportTimer = setInterval(() => { saveReport().catch(error => console.error(error)); }, 2000);
  reportTimer.unref();
  report.head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
  for (const relative of ['unity/SpaceDragon/Builds/DogfightWeb/build-receipt.json',
    'unity/SpaceDragon/Assets/SpaceDragon/Dogfight/heroic-contract-v005.json',
    'unity/SpaceDragon/Assets/SpaceDragon/Runtime/Dogfight/NearOrbitBackdrop.cs',
    'unity/SpaceDragon/Assets/SpaceDragon/Runtime/Dogfight/NearOrbitSurface.shader',
    'unity/SpaceDragon/Assets/SpaceDragon/Runtime/Dogfight/NearOrbitAtmosphere.shader', 'tools/unity/review-near-orbit.mjs']) {
    const bytes = await readFile(path.join(repo, relative));
    report.artifacts.push({ path: relative, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    if (relative.endsWith('build-receipt.json')) report.buildReceipt = JSON.parse(bytes);
    if (relative.endsWith('heroic-contract-v005.json')) report.heroicContract = JSON.parse(bytes);
  }
  assert.equal(report.buildReceipt.result, 'Succeeded');
  assert.equal(report.buildReceipt.developmentBuild, true, 'This art review requires declared development fixtures.');
  assert.equal(report.buildReceipt.sourceSha256, report.heroicContract.sha256, 'Build receipt must identify the current heroic-v005 export.');
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: forceWebGL2 ? ['--disable-features=WebGPUService'] : [] });
  report.browser = browser.version();
  context = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  page = await context.newPage();
  page.on('pageerror', error => report.pageErrors.push({ heading: currentHeading, text: error.message }));
  page.on('console', message => {
    const entry = { heading: currentHeading, type: message.type(), text: message.text() };
    if (report.console.length < 300) report.console.push(entry);
    if (message.type() === 'error') report.consoleErrors.push(entry);
  });
  page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== url.origin) report.externalRequests.push(request.url()); });
  page.on('requestfailed', request => report.requestFailures.push({ url: request.url(), failure: request.failure() }));
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 180000 });
  report.initial = await waitState(s => s.scene === 'Unity Dogfight' && s.frameSamples > 2, 'actual Unity player ready', 240000);
  report.renderer = { graphics: report.initial.graphics, device: report.initial.device };
  if (forceWebGL2) assert.equal(report.initial.graphics, 'OpenGLES3');
  await page.locator('#unity-canvas').focus();
  await page.evaluate(() => {
    const api = window.__SPACE_DRAGON_DOGFIGHT__;
    api.send('RestartEncounter'); api.send('QaFixture', 'quiet'); api.send('RequestSnapshot');
  });
  report.fixtures.push({ action: 'quiet', afterFreshRestart: true, wallMs: Date.now(), reason: 'Stable art inspection at three headings; not a natural gameplay or performance sample.' });
  await waitState(s => s.fixture && !s.paused && !s.dead && s.hull === 100 && s.kills === 0, 'fresh quiet encounter', 30000);
  await settle(1.2);
  await capture(0);
  await turnTo(120);
  await turnTo(240);
  report.final = await settle(.25);
  assert.equal(report.final.paused, false, 'The script must leave flight running until its isolated browser closes.');
} catch (error) {
  report.fatal = String(error.stack || error); console.error(error);
  try { if (page && !page.isClosed()) await page.screenshot({ path: path.join(runOutput, 'failure.png') }); } catch { /* Keep original failure. */ }
} finally {
  clearInterval(reportTimer);
  try { if (page && !page.isClosed()) await page.keyboard.up('ArrowRight'); } catch { /* Browser may have failed. */ }
  report.finishedAt = new Date().toISOString();
  report.result = !report.fatal && report.headings.length === 3 && report.pageErrors.length === 0 && report.consoleErrors.length === 0 &&
    report.requestFailures.length === 0 && report.externalRequests.length === 0 ? 'CAPTURED_REQUIRES_VISUAL_REVIEW' : 'FAIL';
  await saveReport();
  if (browser) await browser.close();
  console.log(`Near-orbit review ${report.result}: ${path.join(runOutput, 'report.json')}`);
  if (report.result === 'FAIL') process.exitCode = 1;
}
