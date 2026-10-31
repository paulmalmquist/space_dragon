import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { access, mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';

const url = new URL(process.env.SPACE_DRAGON_LAUNCH_URL || 'http://127.0.0.1:5195/space-dragon-launch/');
assert(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Use the local LaunchLab server.');
assert(['http:', 'https:'].includes(url.protocol));
const output = path.resolve(process.argv[2] || 'artifacts/unity-launch/browser-focus');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const runOutput = path.join(output, 'runs', runId);
await mkdir(runOutput, { recursive: true });
const forceWebGL = process.env.SPACE_DRAGON_FORCE_WEBGL === '1';
const report = {
  result: 'RUNNING',
  startedAt: new Date().toISOString(), runId, url: url.href, command: process.argv.join(' '),
  headed: true, forceWebGL, viewport: [1366, 900], requestedCanvas: [1280, 720],
  scope: 'One actual headed-Chrome tab switch during safe flight: observed focus/visibility loss, frozen state, deliberate resume, held-input barrier and fresh steering. No synthetic blur event, runtime pause command, full-suite repeat or performance claim.',
  focusEmulation: {
    connection: 'chromium.connectOverCDP(endpoint, { noDefaults: true }); browser.contexts()[0]',
    documentation: 'https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp',
    protocolDocumentation: 'https://chromedevtools.github.io/devtools-protocol/tot/Emulation/#method-setFocusEmulationEnabled',
    localEvidence: 'node_modules/playwright-core/lib/coreBundle.js:39020–39024 skips default focus overrides only for the default context with noDefaults; types/types.d.ts:26044–26056 documents this option.',
    purpose: 'Attach to a freshly spawned dedicated Chrome profile without ever enabling Playwright focus emulation. No focus-emulation command, synthetic blur event or runtime pause command is sent.',
  },
  cases: [], trace: [], screenshots: [], console: [], pageErrors: [], externalRequests: [],
};
let browser, context, page, otherTab, chromeProcess, chromeExit;
let chromeStderr = '';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const hash = value => createHash('sha256').update(value).digest('hex');
const relative = file => path.relative(output, file).split(path.sep).join('/');
const heading = q => Math.atan2(2 * (q.x * q.z + q.w * q.y), 1 - 2 * (q.x * q.x + q.y * q.y)) * 180 / Math.PI;
const headingChange = (a, b) => Math.abs(((heading(a) - heading(b) + 540) % 360) - 180);
function identicalPose(actual, expected, label) {
  assert(actual && expected, `${label}: missing pose`);
  assert.equal(JSON.stringify(actual), JSON.stringify(expected), `${label}: serialized flight pose must remain byte-identical`);
  return hash(JSON.stringify(actual));
}
async function snapshot() {
  const state = await page.evaluate(() => {
    const api = window.__SPACE_DRAGON_UNITY__;
    if (!api?.instance) return null;
    api.send('RequestSnapshot');
    return api.snapshot();
  });
  if (state) {
    assert.equal(state.writesProgress, false);
    report.trace.push({ at: Date.now(), phase: state.phase, paused: state.paused, controlsReady: state.controlsReady,
      position: state.flight?.position, handoffCount: state.handoffCount });
  }
  return state;
}
const send = (method, value) => page.evaluate(({ method, value }) => window.__SPACE_DRAGON_UNITY__.send(method, value), { method, value });
const focusState = () => page.evaluate(() => ({ visibilityState: document.visibilityState, hasFocus: document.hasFocus(),
  events: [...(window.__launchFocusAudit || [])] }));
async function waitState(predicate, label, timeout = 10000, progress = null) {
  const deadline = Date.now() + timeout;
  let nextProgress = 0;
  let latest;
  while (Date.now() < deadline) {
    latest = await snapshot();
    if (progress && Date.now() >= nextProgress) {
      await progress(latest);
      nextProgress = Date.now() + 5000;
    }
    if (latest?.phase === 'Failed') throw new Error(`${label}: ${latest.notice}`);
    if (latest && predicate(latest)) return latest;
    await delay(80);
  }
  throw new Error(`${label}: timed out; phase=${latest?.phase}, paused=${latest?.paused}, controlsReady=${latest?.controlsReady}`);
}
async function capture(name) {
  const file = path.join(runOutput, `${name}.png`);
  await page.locator('#unity-canvas').screenshot({ path: file, timeout: 15000 });
  await copyFile(file, path.join(output, `${name}.png`));
  report.screenshots.push({ name, path: relative(file), snapshot: await snapshot() });
}
async function writeReport() {
  const json = JSON.stringify(report, null, 2);
  await writeFile(path.join(runOutput, 'report.json'), json);
  await writeFile(path.join(output, 'report.json'), json);
}
async function launchOwnedChrome() {
  const candidates = [process.env.SPACE_DRAGON_CHROME_PATH,
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'),
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google/Chrome/Application/chrome.exe'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe')].filter(Boolean);
  let executable;
  for (const candidate of candidates) { try { await access(candidate); executable = path.resolve(candidate); break; } catch {} }
  assert(executable, 'Installed Chrome not found; set SPACE_DRAGON_CHROME_PATH to its executable.');
  const profile = path.resolve(runOutput, 'chrome-profile');
  assert.equal(path.dirname(profile), runOutput, 'The dedicated profile must remain inside this run folder.');
  await mkdir(profile); // Never reuse an existing profile, including the normal user profile.
  const args = [`--user-data-dir=${profile}`, '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update',
    '--disable-sync', '--metrics-recording-only', '--window-size=1400,1040', '--window-position=0,0',
    ...(forceWebGL ? ['--disable-features=WebGPUService'] : []), 'about:blank'];
  report.chromeProcess = { executable, args, profile, profileDisposition: 'Retained under this timestamped local artifact run; no user profile is opened or removed.' };
  chromeProcess = spawn(executable, args, { windowsHide: false, stdio: ['ignore', 'ignore', 'pipe'] });
  report.chromeProcess.pid = chromeProcess.pid;
  chromeProcess.stderr.on('data', chunk => { chromeStderr = (chromeStderr + chunk.toString()).slice(-32768); });
  chromeExit = new Promise(resolve => {
    chromeProcess.once('exit', (code, signal) => { report.chromeProcess.exit = { code, signal }; resolve(); });
    chromeProcess.once('error', error => { report.chromeProcess.spawnError = String(error); resolve(); });
  });
  const portFile = path.join(profile, 'DevToolsActivePort');
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (report.chromeProcess.spawnError || report.chromeProcess.exit) throw new Error('Owned Chrome exited before its debug endpoint became available.');
    try {
      const [port, endpointPath] = (await readFile(portFile, 'utf8')).trim().split(/\r?\n/);
      if (/^\d+$/.test(port) && Number(port) > 0 && Number(port) <= 65535 && endpointPath?.startsWith('/devtools/browser/')) {
        const endpoint = `ws://127.0.0.1:${port}${endpointPath}`;
        report.chromeProcess.endpoint = endpoint;
        return endpoint;
      }
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await delay(100);
  }
  throw new Error('Owned Chrome did not publish DevToolsActivePort within 20 seconds.');
}

try {
  try { report.head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).trim(); } catch { report.head = null; }
  report.artifacts = [];
  for (const file of ['unity/SpaceDragon/Builds/LaunchWeb/build-receipt.json', 'unity/SpaceDragon/Assets/SpaceDragon/Runtime/LaunchLab/LaunchLabExperience.cs']) {
    try { const bytes = await readFile(file); report.artifacts.push({ path: file, bytes: bytes.length, sha256: hash(bytes) }); }
    catch (error) { report.artifacts.push({ path: file, unavailable: error.code }); }
  }
  const endpoint = await launchOwnedChrome();
  browser = await chromium.connectOverCDP(endpoint, { noDefaults: true });
  report.browser = browser.version();
  context = browser.contexts()[0];
  assert(context, 'The owned Chrome default context must be available; do not create a context with Playwright defaults.');
  await context.route('**/*', route => {
    const target = new URL(route.request().url());
    if (/^https?:$/.test(target.protocol) && target.origin !== url.origin) {
      report.externalRequests.push(target.href);
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  await context.addInitScript(() => {
    window.__launchFocusAudit = [];
    const record = event => window.__launchFocusAudit.push({ event, atMs: performance.now(),
      visibilityState: document.visibilityState, hasFocus: document.hasFocus() });
    record('initial');
    window.addEventListener('blur', () => record('blur'));
    window.addEventListener('focus', () => record('focus'));
    document.addEventListener('visibilitychange', () => record('visibilitychange'));
  });
  report.recording = { status: 'NOT AVAILABLE', reason: 'The existing default CDP context has no Playwright video recorder. Creating a recording context would re-enable default overrides; this focused check retains screenshots, real events and exact state snapshots instead.' };
  report.pageCreationEpochMs = Date.now();
  page = context.pages()[0] || await context.newPage();
  await page.setViewportSize({ width: 1366, height: 900 });
  page.on('pageerror', error => report.pageErrors.push(error.message));
  page.on('console', message => {
    if (['error', 'warning'].includes(message.type())) report.console.push({ type: message.type(), text: message.text(), location: message.location() });
  });
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 180000 });
  // With ordinary background throttling restored, establish the actual foreground
  // before waiting for Unity's first frames, not after its readiness callback.
  await page.bringToFront();
  await page.locator('#unity-canvas').focus();
  report.startup = { activatedAt: new Date().toISOString(), focus: await focusState(), progress: [] };
  await writeReport();
  report.initial = await waitState(s => s.ready && s.phase === 'Idle', 'ready LaunchLab menu', 180000, async state => {
    const observation = await page.evaluate(() => ({ atMs: performance.now(), hasFocus: document.hasFocus(),
      visibilityState: document.visibilityState, loadingText: document.querySelector('#loading')?.textContent,
      loadingHidden: document.querySelector('#loading')?.hidden, errorText: document.querySelector('#error')?.textContent,
      playerReady: Boolean(window.__SPACE_DRAGON_UNITY__?.ready), instanceAvailable: Boolean(window.__SPACE_DRAGON_UNITY__?.instance) }));
    report.startup.progress.push({ observedAt: new Date().toISOString(), ...observation, phase: state?.phase ?? null, ready: Boolean(state?.ready) });
    await writeReport();
    console.log(`LaunchLab startup: ${observation.loadingText}; visible=${observation.visibilityState}; focused=${observation.hasFocus}; phase=${state?.phase ?? 'player loading'}`);
  });
  report.startup.readyAt = new Date().toISOString();
  report.startup.readyFocus = await focusState();
  assert.equal(report.initial.performance.cameraPixelWidth, 1280);
  assert.equal(report.initial.performance.cameraPixelHeight, 720);
  report.renderer = report.initial.performance.renderer;
  report.graphicsApi = report.initial.performance.graphicsApi;
  assert(report.renderer && !/swiftshader|llvmpipe|software|microsoft basic|\bwarp\b/i.test(report.renderer), 'Actual hardware rendering must be identified.');
  if (forceWebGL) assert.equal(report.graphicsApi, 'OpenGLES3');
  await page.bringToFront();
  await page.locator('#unity-canvas').focus();
  await page.locator('#launch-live').click();
  await page.locator('#unity-canvas').focus();
  await waitState(s => !['Idle', 'Exited'].includes(s.phase), 'start focus fixture');
  await send('SkipCinematic');
  await waitState(s => s.phase === 'Flight' && s.controlsReady && !s.paused, 'safe flight fixture');
  const test = { name: 'headed-tab-focus-loss-pause-and-fresh-input-recovery', startedAt: new Date().toISOString(), result: 'RUNNING' };
  report.cases.push(test);
  report.focusStartOffsetMs = Date.now() - report.pageCreationEpochMs;
  const beforeFocus = await focusState();
  const beforeFlight = await snapshot();
  test.evidence = { beforeFocus, beforeFlight };
  await capture('before-focus-loss');
  await page.keyboard.down('d');
  await delay(120);
  test.evidence.heldBeforeSwitch = await snapshot();
  otherTab = await context.newPage();
  await otherTab.goto('about:blank');
  await otherTab.setContent('<title>LaunchLab focus check</title><p>The game is in the other tab. This tab tests real browser focus loss.</p>');
  await otherTab.bringToFront();
  const deadline = Date.now() + 4000;
  let observed = false;
  do {
    const background = await focusState();
    test.evidence.background = background;
    const events = background.events.slice(beforeFocus.events.length);
    observed = events.some(event => event.event === 'blur') && beforeFocus.hasFocus && !background.hasFocus ||
      events.some(event => event.event === 'visibilitychange' && event.visibilityState === 'hidden') &&
      beforeFocus.visibilityState === 'visible' && background.visibilityState === 'hidden';
    if (!observed) await delay(80);
  } while (!observed && Date.now() < deadline);
  if (!observed) {
    test.result = report.result = 'NOT TESTED';
    test.reason = 'Headed Chrome tab activation did not produce observed real blur/visibility loss. No synthetic event or pause command was substituted.';
  } else {
    test.evidence.paused = await waitState(s => s.paused, 'real tab loss pauses Unity', 8000);
    await delay(650);
    test.evidence.backgroundStill = await snapshot();
    assert.equal(test.evidence.backgroundStill.paused, true);
    test.evidence.pausedPoseSha256 = identicalPose(test.evidence.backgroundStill.flight, test.evidence.paused.flight, 'hidden-tab flight');
    assert.equal(test.evidence.backgroundStill.sequenceTime, test.evidence.paused.sequenceTime);
    await page.bringToFront();
    await page.locator('#unity-canvas').focus();
    await delay(300);
    test.evidence.returnedFocus = await focusState();
    test.evidence.returned = await snapshot();
    assert.equal(test.evidence.returnedFocus.hasFocus, true);
    assert.equal(test.evidence.returnedFocus.visibilityState, 'visible');
    assert.equal(test.evidence.returned.paused, true, 'Return must not automatically resume.');
    identicalPose(test.evidence.returned.flight, test.evidence.paused.flight, 'return remains paused');
    await capture('returned-still-paused');
    // Blur may clear keyboard state. Re-establish a genuinely held key while paused.
    await page.keyboard.up('d');
    await page.keyboard.down('d');
    await page.keyboard.press('Escape');
    test.evidence.resumedHeld = await waitState(s => !s.paused, 'explicit Escape resume');
    assert.equal(test.evidence.resumedHeld.controlsReady, false);
    await delay(250);
    test.evidence.stillHeld = await snapshot();
    assert.equal(test.evidence.stillHeld.controlsReady, false, 'Held steering must keep the neutral barrier closed.');
    assert(headingChange(test.evidence.stillHeld.flight.rotation, test.evidence.resumedHeld.flight.rotation) < 0.15,
      'Suppressed held input must not steer; cosmetic bank may settle.');
    await page.keyboard.up('d');
    test.evidence.neutral = await waitState(s => s.controlsReady, 'released input opens barrier');
    await page.keyboard.down('d');
    test.evidence.freshSteering = await waitState(s => headingChange(s.flight.rotation, test.evidence.neutral.flight.rotation) > 1 &&
      Math.abs(s.flight.bank - test.evidence.neutral.flight.bank) > 1, 'fresh D steers the moving dragon', 5000);
    await page.keyboard.up('d');
    assert.equal(test.evidence.freshSteering.handoffCount, 1);
    await page.keyboard.press('Escape');
    await waitState(s => s.paused, 'freeze final evidence');
    await capture('fresh-steering-recovered');
    assert.deepEqual(report.pageErrors, []);
    assert.deepEqual(report.console.filter(entry => entry.type === 'error'), []);
    assert.deepEqual(report.externalRequests, []);
    test.result = report.result = 'PASS';
  }
  test.finishedAt = new Date().toISOString();
  report.focusEndOffsetMs = Date.now() - report.pageCreationEpochMs;
} catch (error) {
  report.result = 'FAIL';
  report.failure = String(error.stack || error);
  const test = report.cases.at(-1);
  if (test?.result === 'RUNNING') { test.result = 'FAIL'; test.failure = report.failure; }
  if (page && !page.isClosed()) {
    report.lastSnapshot = await snapshot().catch(() => null);
    await page.bringToFront().catch(() => {});
    await capture('failure').catch(() => {});
  }
  process.exitCode = 1;
} finally {
  if (page && !page.isClosed()) await page.keyboard.up('d').catch(() => {});
  if (otherTab && !otherTab.isClosed()) await otherTab.close().catch(() => {});
  if (browser?.isConnected()) {
    // This endpoint belongs only to the process spawned above with its fresh profile.
    try { const session = await browser.newBrowserCDPSession(); await session.send('Browser.close'); }
    catch (error) { report.chromeProcess.closeNotice = String(error.message || error); }
    await browser.close().catch(() => {});
  }
  if (chromeExit) {
    await Promise.race([chromeExit, delay(5000)]);
    if (chromeProcess.exitCode === null && chromeProcess.signalCode === null && !report.chromeProcess.spawnError) {
      report.chromeProcess.forcedOwnedProcessTermination = true;
      chromeProcess.kill();
      await Promise.race([chromeExit, delay(3000)]);
    }
    report.chromeProcess.stderrTail = chromeStderr;
  }
  report.finishedAt = new Date().toISOString();
  report.notTested = report.cases.filter(entry => entry.result === 'NOT TESTED').map(entry => ({ name: entry.name, reason: entry.reason }));
  await writeReport();
}
console.log(`${report.result}: headed LaunchLab focus check; ${path.join(output, 'report.json')}`);
