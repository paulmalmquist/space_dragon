// Focus-only acceptance of the real local Unity player. No synthetic blur/pause commands.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const url = new URL(process.env.SPACE_DRAGON_TOWN_DRIVE_URL || 'http://127.0.0.1:5208/space-dragon-town-drive/');
assert(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && ['http:', 'https:'].includes(url.protocol), 'Use the local review server.');
const output = path.resolve(process.argv[2] || path.join(repo, 'artifacts/unity-town-drive/focus-browser'));
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const runOutput = path.join(output, 'runs', runId);
await mkdir(runOutput, { recursive: true });
const forceWebGL2 = process.env.SPACE_DRAGON_TOWN_DRIVE_WEBGL2 === '1';
const report = {
  runId, result: 'RUNNING', startedAt: new Date().toISOString(), url: url.href,
  headless: true, viewport: [1280, 720], forceWebGL2,
  scope: 'One actual tab switch in a fresh dedicated Chrome profile. Observed document focus/visibility loss must pause player and ambient state; return stays paused; deliberate keyboard resume suppresses a held accelerator until neutral, then fresh throttle works. No synthetic focus event, focus-emulation command, runtime pause/replay command, full lap or performance gate.',
  focusEmulation: { connection: 'chromium.connectOverCDP(endpoint, { noDefaults: true }); browser.contexts()[0]',
    documentation: 'https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp',
    observedEventsRequired: true },
  cases: [], trace: [], screenshots: [], pageErrors: [], consoleErrors: [], externalRequests: [], artifacts: [],
  limitations: ['Headless tab activation must produce real observed focus or visibility changes; otherwise this check is NOT TESTED.',
    'No human comfort, sustained hardware performance, physical gamepad or operating-system window-switch claim.'],
};
let browser, context, page, otherTab, chromeProcess, chromeExit;
let chromeStderr = '';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function writeReport() {
  const json = JSON.stringify(report, null, 2);
  await writeFile(path.join(runOutput, 'report.json'), json);
  await writeFile(path.join(output, 'report.json'), json);
}
function frozenValues(state) {
  return { elapsed: state.elapsed, x: state.x, z: state.z, yaw: state.yaw, speed: state.speed,
    routeS: state.routeS, checkpointId: state.checkpointId, visited: state.visited, completed: state.completed,
    displayedCarPosition: state.displayedCarPosition, cameraPosition: state.cameraPosition,
    traffic: state.traffic, pedestrians: state.pedestrians, signals: state.signals };
}
function assertFrozen(actual, expected, label) {
  const a = JSON.stringify(frozenValues(actual)), e = JSON.stringify(frozenValues(expected));
  assert.equal(a, e, `${label}: player, presentation and visible ambient state must remain identical`);
  return hash(a);
}
async function snapshot() {
  const state = await page.evaluate(() => {
    const error = document.querySelector('#error');
    if (error && !error.hidden) throw new Error(document.querySelector('#error-message')?.textContent || 'Unity loading failed');
    const api = window.__SPACE_DRAGON_TOWN_DRIVE__;
    if (!api?.instance) return null;
    api.send('RequestSnapshot');
    if (api.lastSnapshotError) throw new Error(api.lastSnapshotError);
    return api.latestSnapshot ? api.snapshot() : null;
  });
  if (state?.error) throw new Error(`Unity runtime: ${state.error}`);
  if (state) report.trace.push({ at: Date.now(), ready: state.ready, paused: state.paused, elapsed: state.elapsed,
    x: state.x, z: state.z, speed: state.speed, routeS: state.routeS, visibleTraffic: state.visibleTraffic, visiblePedestrians: state.visiblePedestrians });
  return state;
}
const focusState = () => page.evaluate(() => ({ hasFocus: document.hasFocus(), visibilityState: document.visibilityState, events: [...window.__townDriveFocusAudit] }));
async function waitState(predicate, label, timeout = 10000) {
  const deadline = Date.now() + timeout; let latest, lastProgress = 0;
  while (Date.now() < deadline) {
    latest = await snapshot();
    if (latest && predicate(latest)) return latest;
    if (Date.now() - lastProgress > 10000) { lastProgress = Date.now(); await writeReport(); }
    await delay(80);
  }
  throw new Error(`${label} timed out: ${JSON.stringify(latest)}`);
}
async function tap(key) { await page.keyboard.down(key); await delay(120); await page.keyboard.up(key); }
async function capture(name) {
  const file = path.join(runOutput, name + '.png'); await page.screenshot({ path: file });
  report.screenshots.push({ name, path: file, state: await snapshot() });
}
async function launchOwnedChrome() {
  const candidates = [process.env.SPACE_DRAGON_CHROME_PATH,
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'),
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google/Chrome/Application/chrome.exe'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe')].filter(Boolean);
  let executable;
  for (const candidate of candidates) { try { await access(candidate); executable = path.resolve(candidate); break; } catch {} }
  assert(executable, 'Installed Chrome not found; set SPACE_DRAGON_CHROME_PATH.');
  const profile = path.resolve(runOutput, 'chrome-profile'); assert.equal(path.dirname(profile), runOutput);
  await mkdir(profile); // A new profile only; never opens or deletes the user's profile.
  const args = ['--headless=new', `--user-data-dir=${profile}`, '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update',
    '--disable-sync', '--metrics-recording-only', '--window-size=1280,720',
    ...(forceWebGL2 ? ['--disable-features=WebGPU,WebGPUService'] : []), 'about:blank'];
  report.chromeProcess = { executable, args, profile, disposition: 'Dedicated timestamped local profile retained for evidence.' };
  chromeProcess = spawn(executable, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  report.chromeProcess.pid = chromeProcess.pid;
  chromeProcess.stderr.on('data', chunk => { chromeStderr = (chromeStderr + chunk.toString()).slice(-32768); });
  chromeExit = new Promise(resolve => {
    chromeProcess.once('exit', (code, signal) => { report.chromeProcess.exit = { code, signal }; resolve(); });
    chromeProcess.once('error', error => { report.chromeProcess.spawnError = String(error); resolve(); });
  });
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (report.chromeProcess.spawnError || report.chromeProcess.exit) throw new Error('Owned Chrome exited before CDP was ready.');
    try {
      const [port, endpointPath] = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).trim().split(/\r?\n/);
      if (/^\d+$/.test(port) && Number(port) > 0 && Number(port) <= 65535 && endpointPath?.startsWith('/devtools/browser/'))
        return `ws://127.0.0.1:${port}${endpointPath}`;
    } catch (error) { if (!['ENOENT','EBUSY','EACCES'].includes(error.code)) throw error; }
    await delay(100);
  }
  throw new Error('Owned Chrome did not publish its CDP endpoint.');
}

try {
  for (const relative of ['unity/SpaceDragon/Builds/TownDriveWeb/town-drive-build-receipt.json',
    'unity/SpaceDragon/Assets/SpaceDragon/TownDrive/Runtime/TownDriveExperience.cs']) {
    try { const bytes = await readFile(path.join(repo, relative)); report.artifacts.push({ path: relative, bytes: bytes.length, sha256: hash(bytes) }); }
    catch (error) { report.artifacts.push({ path: relative, unavailable: error.code }); }
  }
  browser = await chromium.connectOverCDP(await launchOwnedChrome(), { noDefaults: true });
  report.browser = browser.version(); context = browser.contexts()[0];
  assert(context, 'Use the dedicated Chrome default context; no Playwright context with focus emulation.');
  await context.route('**/*', route => {
    const target = new URL(route.request().url());
    if (/^https?:$/.test(target.protocol) && target.origin !== url.origin) { report.externalRequests.push(target.href); return route.abort('blockedbyclient'); }
    return route.continue();
  });
  await context.addInitScript(() => {
    window.__townDriveFocusAudit = [];
    const record = event => window.__townDriveFocusAudit.push({ event, atMs: performance.now(), hasFocus: document.hasFocus(), visibilityState: document.visibilityState });
    record('initial'); window.addEventListener('blur', () => record('blur')); window.addEventListener('focus', () => record('focus'));
    document.addEventListener('visibilitychange', () => record('visibilitychange'));
  });
  page = context.pages()[0] || await context.newPage(); await page.setViewportSize({ width: 1280, height: 720 });
  page.on('pageerror', error => report.pageErrors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 180000 }); await page.bringToFront(); await page.locator('#unity-canvas').focus();
  report.initial = await waitState(s => s.ready && s.frames >= 3, 'Town Drive ready', 180000);
  if (forceWebGL2) assert.equal(report.initial.graphicsDeviceType, 'OpenGLES3');
  if (report.initial.paused) { await tap('Escape'); await waitState(s => !s.paused, 'deliberate startup resume'); }
  await page.keyboard.up('ArrowUp'); await delay(150);
  const test = { name: 'real-tab-focus-loss-pause-and-neutral-release', result: 'RUNNING', startedAt: new Date().toISOString(), evidence: {} }; report.cases.push(test);
  const beforeFocus = await focusState(); test.evidence.beforeFocus = beforeFocus;
  if (!beforeFocus.hasFocus || beforeFocus.visibilityState !== 'visible') {
    test.result = report.result = 'NOT TESTED'; test.reason = 'Owned headless Chrome did not establish observed foreground focus; no emulated focus was substituted.';
  } else {
    await page.keyboard.down('ArrowUp');
    test.evidence.driving = await waitState(s => s.speed > 1.5 && s.elapsed > report.initial.elapsed + .3, 'real accelerator input');
    await capture('before-focus-loss');
    otherTab = await context.newPage(); await otherTab.goto('about:blank');
    await otherTab.setContent('<title>Town Drive focus check</title><p>The driving game is in the other tab.</p>'); await otherTab.bringToFront();
    let observed = false; const deadline = Date.now() + 5000;
    while (!observed && Date.now() < deadline) {
      const background = await focusState(); test.evidence.background = background;
      const events = background.events.slice(beforeFocus.events.length);
      observed = (events.some(event => event.event === 'blur') && !background.hasFocus) ||
        (events.some(event => event.event === 'visibilitychange' && event.visibilityState === 'hidden') && background.visibilityState === 'hidden');
      if (!observed) await delay(80);
    }
    if (!observed) {
      test.result = report.result = 'NOT TESTED'; test.reason = 'Tab activation produced no observed real focus/visibility loss; no synthetic event or runtime pause command was substituted.';
    } else {
      const paused = test.evidence.paused = await waitState(s => s.paused, 'actual focus loss pauses Unity', 8000);
      await delay(750); const backgroundStill = test.evidence.backgroundStill = await snapshot();
      assert.equal(backgroundStill.paused, true); test.evidence.frozenHash = assertFrozen(backgroundStill, paused, 'background pause');
      assert((paused.traffic?.length || 0) + (paused.pedestrians?.length || 0) > 0, 'At least one rendered ambient actor must support the freeze assertion.');
      await page.bringToFront(); await page.locator('#unity-canvas').focus(); await delay(300);
      test.evidence.returnedFocus = await focusState(); const returned = test.evidence.returned = await snapshot();
      assert(test.evidence.returnedFocus.hasFocus && test.evidence.returnedFocus.visibilityState === 'visible');
      assert.equal(returned.paused, true, 'Focus return cannot automatically resume.'); assertFrozen(returned, paused, 'return before deliberate resume');
      await capture('returned-still-paused');
      // A real key remains down across explicit Escape resume. No replay/debug control is used.
      await page.keyboard.up('ArrowUp'); await page.keyboard.down('ArrowUp'); await delay(150); await tap('Escape');
      const resumed = test.evidence.resumedHeld = await waitState(s => !s.paused, 'deliberate keyboard resume');
      const held = test.evidence.stillHeld = await waitState(s => s.elapsed >= resumed.elapsed + .35, 'held accelerator suppression');
      assert.equal(held.bonkSeconds, 0, 'Contact must not disguise acceleration during the held-input check.');
      assert(resumed.speed > .2, 'The drive must retain real momentum for the no-throttle coast comparison.');
      const expectedCoast = resumed.speed * Math.exp(-.22 * (held.elapsed - resumed.elapsed));
      assert(Math.abs(held.speed - expectedCoast) < .025, 'Held accelerator must be suppressed; authoritative speed must follow neutral coasting.');
      await page.keyboard.up('ArrowUp'); await delay(180); const neutral = test.evidence.neutral = await snapshot();
      await page.keyboard.down('ArrowUp');
      test.evidence.freshThrottle = await waitState(s => s.speed > neutral.speed + .75 && Math.hypot(s.x-neutral.x,s.z-neutral.z) > .2,
        'fresh accelerator works after release', 5000); await page.keyboard.up('ArrowUp');
      await tap('Escape'); await waitState(s => s.paused, 'pause final evidence'); await capture('fresh-throttle-recovered');
      assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.consoleErrors, []); assert.deepEqual(report.externalRequests, []);
      test.result = report.result = 'PASS';
    }
  }
  test.finishedAt = new Date().toISOString();
} catch (error) {
  report.result = 'FAIL'; report.failure = String(error.stack || error);
  const test = report.cases.at(-1); if (test?.result === 'RUNNING') { test.result = 'FAIL'; test.failure = report.failure; }
  if (page && !page.isClosed()) report.lastSnapshot = await snapshot().catch(() => null);
} finally {
  if (page && !page.isClosed()) { await page.keyboard.up('ArrowUp').catch(() => {}); await page.keyboard.up('Escape').catch(() => {}); }
  if (otherTab && !otherTab.isClosed()) await otherTab.close().catch(() => {});
  if (browser?.isConnected()) {
    try { const session = await browser.newBrowserCDPSession(); await session.send('Browser.close'); }
    catch (error) { report.chromeProcess.closeNotice = String(error.message || error); }
    await browser.close().catch(() => {});
  }
  if (chromeExit) {
    await Promise.race([chromeExit, delay(5000)]);
    if (chromeProcess.exitCode === null && chromeProcess.signalCode === null && !report.chromeProcess.spawnError) {
      report.chromeProcess.forcedOwnedProcessTermination = true; chromeProcess.kill(); await Promise.race([chromeExit, delay(3000)]);
    }
    report.chromeProcess.stderrTail = chromeStderr;
  }
  if (report.result === 'PASS' && (report.pageErrors.length || report.consoleErrors.length || report.externalRequests.length))
    report.result = 'FAIL';
  report.finishedAt = new Date().toISOString(); await writeReport();
}
console.log(`Town Drive focus verification ${report.result}: ${path.join(runOutput, 'report.json')}`);
if (report.result !== 'PASS') process.exitCode = report.result === 'NOT TESTED' ? 2 : 1;
