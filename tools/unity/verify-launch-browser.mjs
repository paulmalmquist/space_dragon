import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const url = new URL(process.env.SPACE_DRAGON_LAUNCH_URL || 'http://127.0.0.1:5195/space-dragon-launch/');
assert(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Use the local LaunchLab server.');
assert(['http:', 'https:'].includes(url.protocol), 'LaunchLab needs an HTTP server.');
const output = path.resolve(process.argv[2] || 'artifacts/unity-launch/browser');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const runOutput = path.join(output, 'runs', runId);
await mkdir(runOutput, { recursive: true });
const forceWebGL = process.env.SPACE_DRAGON_FORCE_WEBGL === '1';
const missingUrl = new URL(`__missing_launch_test_${runId}.mp4`, url).href;
const stalledUrl = new URL(`__stalled_launch_test_${runId}.mp4`, url).href;
const reducedMotionUrl = new URL(`__reduced_motion_no_download_${runId}.mp4`, url).href;
const tolerances = { position: 0.01, camera: 0.05, rotationDegrees: 0.1, velocity: 0.001, replay: 0.0001 };
const report = {
  startedAt: new Date().toISOString(), url: url.href, command: process.argv.join(' '), runId,
  viewport: [1366, 900], requestedCanvas: [1280, 720], forceWebGL, tolerances,
  scope: 'Installed Chrome, actual UI/keyboard launch and safe flight, controlled Blender animatic URL, missing-media fallback and interruption checks. No AI footage, physical controller, audible-output, human-quality or sustained-performance claim.',
  performanceScope: 'Unity Update wall-clock intervals and handoff observations on the reported backend; not GPU execution time. Rolling windows, warmup and sample count remain attached to each sample. Full-session WebM recording, screenshots and polling add overhead to these short functional-run samples; recorded-video frame rate is not a performance measurement.',
  cases: [], samples: [], screenshots: [], trace: [], console: [], pageErrors: [], externalRequests: [],
  expectedMediaErrors: [], unexpectedErrors: [], network: [], requests: [], networkMeasurementErrors: [], requestFailures: [], expectedRequestFailures: [],
};
let browser, context, page, recordingPath, currentCase = 'startup';
const pendingNetwork = new Set();
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const rotationDistance = (a, b) => {
  const norm = Math.hypot(a.x, a.y, a.z, a.w) * Math.hypot(b.x, b.y, b.z, b.w);
  assert(norm > 0 && Number.isFinite(norm), 'Invalid rotation.');
  const dot = Math.abs(a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w) / norm;
  return 2 * Math.acos(Math.min(1, dot)) * 180 / Math.PI;
};
function close(actual, expected, epsilon, label) {
  assert(Number.isFinite(actual) && Number.isFinite(expected), `${label}: non-finite value`);
  assert(Math.abs(actual - expected) <= epsilon, `${label}: ${actual} vs ${expected}, tolerance ${epsilon}`);
}
function comparePose(actual, expected, label) {
  assert(actual && expected, `${label}: missing captured pose`);
  for (const field of ['position', 'velocity', 'cameraPosition'])
    close(distance(actual[field], expected[field]), 0, tolerances.replay, `${label}.${field}`);
  for (const field of ['rotation', 'cameraRotation'])
    close(rotationDistance(actual[field], expected[field]), 0, 0.01, `${label}.${field}`);
  for (const field of ['bank', 'animationTime', 'cameraFov'])
    close(actual[field], expected[field], tolerances.replay, `${label}.${field}`);
}
function checkHandoff(state) {
  assert.equal(state.phase, 'Flight');
  assert.equal(state.handoffCount, 1);
  assert.equal(state.inputOwner, 'flight');
  assert.equal(state.destinationReady, true);
  assert.equal(state.orbitLoaded, true);
  assert.equal(state.writesProgress, false);
  close(state.sequenceTime, 12, 0.0001, 'authored endpoint');
  for (const [field, limit] of [
    ['handoffPositionError', tolerances.position], ['handoffCameraError', tolerances.camera],
    ['handoffRotationError', tolerances.rotationDegrees], ['handoffVelocityError', tolerances.velocity],
  ]) close(state[field], 0, limit, field);
  assert(state.handoffPose, 'Immutable exact handoff pose must be exposed.');
}
async function writeReport() {
  const json = JSON.stringify(report, null, 2);
  await writeFile(path.join(runOutput, 'report.json'), json);
  await writeFile(path.join(output, 'report.json'), json);
}
function classifyConsoleErrors() {
  const missingResponse = report.network.find(entry => entry.url === missingUrl && entry.status === 404);
  report.expectedMediaErrors = [];
  report.unexpectedErrors = [];
  report.expectedRequestFailures = report.requestFailures.filter(entry => entry.url === stalledUrl &&
    /ERR_ABORTED/i.test(entry.failure?.errorText || '')).map(entry => ({ ...entry,
    reason: 'Only this unique media request was intentionally held without a response for the readiness-timeout case, then aborted/released after observed runtime fallback.' }));
  for (const entry of report.console.filter(item => item.type === 'error')) {
    const namesMissing = entry.text.includes(missingUrl) || entry.location?.url === missingUrl;
    const scopedMissing = entry.case === 'missing-video-url-local-fallback' && missingResponse &&
      (/Failed to load resource.*404/i.test(entry.text) || /VideoPlayer.*(?:error|failed|cannot|unsupported)/i.test(entry.text));
    const namesDeliberateAbort = report.expectedRequestFailures.length > 0 &&
      (entry.text.includes(stalledUrl) || entry.location?.url === stalledUrl) && /abort|cancel|failed|error/i.test(entry.text);
    (namesMissing || scopedMissing || namesDeliberateAbort ? report.expectedMediaErrors : report.unexpectedErrors).push(entry);
  }
}
async function snapshot() {
  const state = await page.evaluate(() => {
    const api = window.__SPACE_DRAGON_UNITY__;
    if (!api?.instance) return null;
    api.send('RequestSnapshot');
    return api.snapshot();
  });
  if (state) {
    report.trace.push({ case: currentCase, observedAtMs: Date.now(), generation: state.generation,
      phase: state.phase, sequenceTime: state.sequenceTime, mediaTime: state.mediaTime,
      paused: state.paused, controlsReady: state.controlsReady, handoffCount: state.handoffCount,
      videoFirstFrame: state.videoFirstFrame, videoFallback: state.videoFallback });
    assert.equal(state.writesProgress, false, 'Runtime must report no progress writes.');
  }
  return state;
}
const send = (method, value) => page.evaluate(({ method, value }) =>
  window.__SPACE_DRAGON_UNITY__.send(method, value), { method, value });
async function waitState(predicate, label, timeout = 45000) {
  const deadline = Date.now() + timeout;
  let latest;
  while (Date.now() < deadline) {
    latest = await snapshot();
    if (latest?.phase === 'Failed') throw new Error(`${label}: runtime failed: ${latest.notice}`);
    if (latest && predicate(latest)) return latest;
    await delay(80);
  }
  throw new Error(`${label}: timed out; phase=${latest?.phase}, time=${latest?.sequenceTime}, notice=${latest?.notice}`);
}
async function capture(name) {
  const state = await snapshot();
  const file = path.join(runOutput, `${name}.png`);
  await page.locator('#unity-canvas').screenshot({ path: file, timeout: 15000 });
  await copyFile(file, path.join(output, `${name}.png`));
  report.screenshots.push({ name, path: path.relative(output, file).split(path.sep).join('/'), snapshot: state });
  return state;
}
async function sample(name) {
  const state = await snapshot();
  report.samples.push({ name, observedAt: new Date().toISOString(), measurement: state });
  return state;
}
async function videoElements() {
  return page.evaluate(() => {
    const tracked = (window.__launchVideoElements || []).map(reference => reference.deref()).filter(Boolean);
    return [...new Set([...document.querySelectorAll('video'), ...tracked])].map(video => ({
      src: video.src, currentSrc: video.currentSrc, width: video.videoWidth, height: video.videoHeight,
      readyState: video.readyState, networkState: video.networkState, currentTime: video.currentTime,
      duration: Number.isFinite(video.duration) ? video.duration : null, paused: video.paused, ended: video.ended,
    }));
  });
}
async function menu() {
  for (const key of ['w', 'a', 's', 'd', 'Shift', 'Space', 'Enter', 'Escape']) await page.keyboard.up(key);
  await send('ReturnToMenu');
  await waitState(s => s.phase === 'Exited', 'return to menu');
  await page.locator('#unity-canvas').focus();
}
async function clickLaunch(id, expectedMode) {
  await page.locator(id).click({ timeout: 15000 });
  await page.locator('#unity-canvas').focus();
  return waitState(s => s.mode === expectedMode && !['Idle', 'Exited'].includes(s.phase), `launch ${expectedMode}`);
}
async function verifyFreshSteering() {
  await waitState(s => s.controlsReady, 'neutral controls ready');
  const before = await snapshot();
  await page.keyboard.down('d');
  let after;
  try {
    after = await waitState(s => Math.abs(s.flight.bank - before.flight.bank) > 1 &&
      rotationDistance(s.flight.rotation, before.flight.rotation) > 1, 'fresh steering changes flight', 5000);
  } finally { await page.keyboard.up('d'); }
  assert(distance(after.flight.position, before.flight.position) > 0.1, 'Fresh steering must occur in moving flight.');
  return { before, after };
}
async function runCase(name, operation) {
  currentCase = name;
  const entry = { name, startedAt: new Date().toISOString(),
    recordingStartOffsetMs: report.recording ? Date.now() - report.recording.pageCreationEpochMs : null, result: 'RUNNING' };
  report.cases.push(entry);
  try {
    entry.evidence = await operation();
    entry.result = entry.evidence?.verificationStatus === 'NOT TESTED' ? 'NOT TESTED' : 'PASS';
  }
  catch (error) { entry.result = 'FAIL'; entry.failure = String(error.stack || error); throw error; }
  finally {
    entry.finishedAt = new Date().toISOString();
    entry.recordingEndOffsetMs = report.recording ? Date.now() - report.recording.pageCreationEpochMs : null;
    await writeReport();
  }
}

try {
  try { report.head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { report.head = null; }
  report.artifacts = [];
  for (const file of ['unity/SpaceDragon/Builds/LaunchWeb/build-receipt.json',
    'unity/SpaceDragon/Assets/SpaceDragon/Runtime/LaunchLab/LaunchLabExperience.cs',
    'unity/SpaceDragon/Assets/SpaceDragon/Runtime/LaunchLab/LaunchSession.cs']) {
    try {
      const bytes = await readFile(file);
      report.artifacts.push({ path: file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    } catch (error) { report.artifacts.push({ path: file, unavailable: error.code }); }
  }
  // Installed Chrome's normal GPU path. Do not add SwiftShader or disable-GPU flags.
  browser = await chromium.launch({ channel: 'chrome', headless: true,
    args: forceWebGL ? ['--disable-features=WebGPUService'] : [] });
  report.browser = browser.version();
  context = await browser.newContext({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1, serviceWorkers: 'block',
    recordVideo: { dir: runOutput, size: { width: 1366, height: 900 } } });
  await context.route('**/*', route => {
    const target = new URL(route.request().url());
    if (/^https?:$/.test(target.protocol) && target.origin !== url.origin) {
      report.externalRequests.push(target.href);
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  await context.addInitScript(() => {
    if (!/^https?:$/.test(location.protocol)) return;
    const focusAudit = window.__launchFocusAudit = [];
    const recordFocus = event => focusAudit.push({ event, atMs: performance.now(),
      visibilityState: document.visibilityState, hasFocus: document.hasFocus() });
    recordFocus('initial');
    window.addEventListener('blur', () => recordFocus('blur'));
    window.addEventListener('focus', () => recordFocus('focus'));
    document.addEventListener('visibilitychange', () => recordFocus('visibilitychange'));
    // Unity can keep its HTMLVideoElement detached. Weak references observe decoded
    // dimensions without retaining disposed video resources or changing playback.
    window.__launchVideoElements = [];
    const createElement = Document.prototype.createElement;
    Document.prototype.createElement = function (...args) {
      const element = createElement.apply(this, args);
      if (String(args[0]).toLowerCase() === 'video') window.__launchVideoElements.push(new WeakRef(element));
      return element;
    };
    const audit = window.__launchStorageAudit = { webWrites: [], indexedDBWrites: [], initial: {}, hookErrors: [] };
    // Synthetic markers in this disposable origin only; never copy real player records into a test.
    const keys = ['space-dragon.checkpoint.v2', 'space-dragon.exploration.v1', 'space-dragon.unity.first-contact.v1'];
    for (const key of keys) localStorage.setItem(key, `launch-verifier-sentinel:${key}`);
    const dump = store => Object.fromEntries(Object.keys(store).sort().map(key => [key, store.getItem(key)]));
    audit.initial = { local: dump(localStorage), session: dump(sessionStorage) };
    for (const method of ['setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        audit.webWrites.push({ method, area: this === localStorage ? 'local' : 'session', key: String(args[0] ?? '') });
        return original.apply(this, args);
      };
    }
    try {
      for (const method of ['put', 'add', 'delete', 'clear']) {
        const original = IDBObjectStore.prototype[method];
        IDBObjectStore.prototype[method] = function (...args) {
          const value = args[0];
          const key = method === 'delete' ? value : args[1] ?? (typeof this.keyPath === 'string' ? value?.[this.keyPath] : undefined);
          audit.indexedDBWrites.push({ method, database: this.transaction.db.name, store: this.name,
            key: typeof key === 'string' || typeof key === 'number' ? String(key).slice(0, 300) : null });
          return original.apply(this, args);
        };
      }
    } catch (error) { audit.hookErrors.push(String(error)); }
  });
  report.recording = { format: 'Playwright WebM', size: [1366, 900], pageCreationEpochMs: Date.now(),
    scope: 'Full isolated browser session, including both launch alternatives and real control recovery. Case offsets are wall-clock review markers relative to page creation, not frame-accurate WebM edit points; first recorded-frame timing can differ. Encoding/recording overhead is present. Never derive game fps from this recording.' };
  page = await context.newPage();
  recordingPath = await page.video().path();
  report.recording.path = path.relative(output, recordingPath).split(path.sep).join('/');
  page.setDefaultTimeout(15000);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  page.on('pageerror', error => report.pageErrors.push({ case: currentCase, text: error.message }));
  page.on('console', message => {
    if (['error', 'warning'].includes(message.type())) report.console.push({ case: currentCase,
      type: message.type(), text: message.text(), location: message.location() });
  });
  page.on('requestfailed', request => report.requestFailures.push({ case: currentCase, url: request.url(), failure: request.failure() }));
  context.on('request', request => report.requests.push({ case: currentCase, url: request.url(),
    resourceType: request.resourceType(), observedAtMs: Date.now() }));
  context.on('requestfinished', request => {
    if (!request.url().startsWith(url.origin + '/')) return;
    const observedCase = currentCase;
    const pending = (async () => {
      const response = await request.response();
      const sizes = await request.sizes();
      report.network.push({ case: observedCase, url: request.url(), status: response?.status(),
        contentEncoding: await response?.headerValue('content-encoding') || 'identity',
        encodedBodyBytes: sizes.responseBodySize, transferBytes: sizes.responseBodySize + sizes.responseHeadersSize });
    })().catch(error => report.networkMeasurementErrors.push({ url: request.url(), error: String(error) }));
    pendingNetwork.add(pending);
    pending.finally(() => pendingNetwork.delete(pending));
  });
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 180000 });
  report.initial = await waitState(s => s.scene === 'unity-launch-lab' && s.ready && s.phase === 'Idle', 'ready launch menu', 180000);
  report.webgpuAdapterAvailable = await page.evaluate(async () => Boolean(navigator.gpu && await navigator.gpu.requestAdapter()));
  const renderer = report.initial.performance?.renderer || '';
  report.hardwareRendering = renderer.length > 0 && !/swiftshader|llvmpipe|software|microsoft basic|\bwarp\b/i.test(renderer);
  assert(report.hardwareRendering, `Hardware renderer was not established: ${renderer}`);
  assert.equal(report.initial.performance.cameraPixelWidth, 1280);
  assert.equal(report.initial.performance.cameraPixelHeight, 720);
  if (forceWebGL) {
    assert.equal(report.webgpuAdapterAvailable, false);
    assert.equal(report.initial.performance.graphicsApi, 'OpenGLES3');
  }

  await runCase('live-ui-launch-pause-held-input-handoff', async () => {
    const started = await clickLaunch('#launch-live', 'InEngine');
    const generation = started.generation;
    for (let i = 0; i < 3; i++) await send('StartLaunch');
    assert.equal((await snapshot()).generation, generation, 'Repeated active launch must not restart.');
    await waitState(s => s.sequenceTime >= 1.5, 'live ascent before pause');
    await page.keyboard.press('Escape');
    const paused = await waitState(s => s.paused, 'keyboard pause');
    await delay(450);
    const stillPaused = await snapshot();
    close(stillPaused.sequenceTime, paused.sequenceTime, 0.001, 'paused cinematic time');
    close(distance(stillPaused.flight.position, paused.flight.position), 0, 0.001, 'paused actor');
    await page.keyboard.press('Escape');
    await waitState(s => !s.paused, 'keyboard resume');
    await waitState(s => s.sequenceTime >= 4.9 && s.phase === 'Timeline', 'live shot near five seconds');
    const live = await capture('live-5s');
    report.samples.push({ name: 'live-near-5s', measurement: live });
    await page.keyboard.down('d');
    const handoff = await waitState(s => s.phase === 'Flight', 'normal live handoff');
    checkHandoff(handoff);
    assert.equal(handoff.controlsReady, false, 'Held steering must keep takeover neutral barrier closed.');
    await capture('handoff');
    await delay(350);
    const held = await snapshot();
    assert.equal(held.controlsReady, false);
    close(rotationDistance(held.flight.rotation, handoff.flight.rotation), 0, 0.15, 'stale held steering');
    await page.keyboard.up('d');
    const fresh = await verifyFreshSteering();
    for (let i = 0; i < 3; i++) await send('SkipCinematic');
    assert.equal((await snapshot()).handoffCount, 1);
    return { generation, paused, stillPaused, handoff, held, fresh };
  });

  await runCase('actual-tab-focus-loss-pause-and-fresh-input-recovery', async () => {
    await waitState(s => s.phase === 'Flight' && s.controlsReady && !s.paused, 'flight before tab switch');
    const focusState = () => page.evaluate(() => ({ visibilityState: document.visibilityState,
      hasFocus: document.hasFocus(), events: [...(window.__launchFocusAudit || [])] }));
    const beforeFocus = await focusState();
    const beforeFlight = await snapshot();
    let otherTab;
    try {
      await page.keyboard.down('d');
      await delay(120);
      const heldBeforeSwitch = await snapshot();
      otherTab = await context.newPage();
      await otherTab.goto('about:blank');
      await otherTab.bringToFront();
      const focusDeadline = Date.now() + 2000;
      let background;
      let observedFocusLoss = false;
      while (Date.now() < focusDeadline) {
        background = await focusState();
        const newEvents = background.events.slice(beforeFocus.events.length);
        observedFocusLoss = (beforeFocus.hasFocus && !background.hasFocus) ||
          (beforeFocus.visibilityState === 'visible' && background.visibilityState !== 'visible') ||
          newEvents.some(event => event.event === 'blur' ||
            (event.event === 'visibilitychange' && event.visibilityState !== 'visible'));
        if (observedFocusLoss) break;
        await delay(80);
      }
      const backgroundSnapshot = await snapshot();
      if (!observedFocusLoss) {
        return { verificationStatus: 'NOT TESTED',
          reason: 'Headless tab activation did not produce observable focus loss or document hiding. No synthetic blur/visibility event was substituted and no focus-recovery pass is claimed.',
          beforeFocus, beforeFlight, heldBeforeSwitch, background, backgroundSnapshot };
      }
      const paused = await waitState(s => s.paused, 'actual focus loss pauses LaunchLab', 4000);
      await delay(400);
      const backgroundStill = await snapshot();
      assert.equal(backgroundStill.paused, true);
      comparePose(backgroundStill.flight, paused.flight, 'focus-loss pause preserves flight');
      close(backgroundStill.sequenceTime, paused.sequenceTime, 0.001, 'focus-loss sequence clock');
      await page.bringToFront();
      await page.locator('#unity-canvas').focus();
      await delay(250);
      const returnedFocus = await focusState();
      const returned = await snapshot();
      assert.equal(returned.paused, true, 'Returning to the game must not automatically resume.');
      comparePose(returned.flight, paused.flight, 'return remains paused');
      // Browser/Input System may release keys on blur; explicitly hold steering
      // again while paused to verify the real resume neutral-input barrier.
      await page.keyboard.down('d');
      await page.keyboard.press('Escape');
      const resumedHeld = await waitState(s => !s.paused, 'deliberate Escape resume');
      assert.equal(resumedHeld.controlsReady, false, 'Held steering must not activate on resume.');
      await delay(180);
      const stillHeld = await snapshot();
      assert.equal(stillHeld.controlsReady, false);
      await page.keyboard.up('d');
      const fresh = await verifyFreshSteering();
      return { verificationStatus: 'VERIFIED', beforeFocus, beforeFlight, heldBeforeSwitch, background,
        backgroundSnapshot, paused, backgroundStill, returnedFocus, returned, resumedHeld, stillHeld, fresh };
    } finally {
      await page.bringToFront().catch(() => {});
      await page.locator('#unity-canvas').focus().catch(() => {});
      await page.keyboard.up('d').catch(() => {});
      if (otherTab && !otherTab.isClosed()) {
        const file = await otherTab.video()?.path().catch(() => null);
        if (file) report.recording.focusProbeTab = path.relative(output, file).split(path.sep).join('/');
        await otherTab.close();
      }
      const cleanupState = await snapshot().catch(() => null);
      if (cleanupState?.paused) await page.keyboard.press('Escape');
      await waitState(s => s.phase === 'Flight' && s.controlsReady && !s.paused,
        'restore safe flight after focus probe', 5000);
    }
  });

  await runCase('flight-pause-replay-restores-exact-pose-and-velocity', async () => {
    await page.keyboard.press('Escape');
    const paused = await waitState(s => s.paused, 'pause flight');
    await delay(350);
    comparePose((await snapshot()).flight, paused.flight, 'paused flight');
    const replay = await page.evaluate(() => {
      const api = window.__SPACE_DRAGON_UNITY__;
      api.send('RequestSnapshot'); const before = api.snapshot();
      api.send('ReplayCinematic'); api.send('RequestSnapshot');
      return { before, begun: api.snapshot() };
    });
    comparePose(replay.begun.replayReturn, replay.before.flight, 'replay capture');
    await send('SkipCinematic');
    await send('SkipCinematic');
    const restored = await waitState(s => s.phase === 'Flight', 'replay handoff');
    checkHandoff(restored);
    assert.equal(restored.replayRestored, true);
    comparePose(restored.handoffPose, restored.replayReturn, 'exact replay restore');
    const fresh = await verifyFreshSteering();
    return { replay, restored, fresh };
  });

  await runCase('controlled-blender-url-first-frame-pause-protected-ending', async () => {
    await menu();
    await clickLaunch('#launch-video', 'BlenderURL');
    const firstFrame = await waitState(s => s.phase === 'PlayingVideo' && s.videoFirstFrame && s.mediaTime >= 0.1,
      'controlled source video first frame');
    assert.equal(firstFrame.videoFallback, false);
    assert.equal(new URL(firstFrame.videoUrl).origin, url.origin);
    await waitState(s => s.mediaTime >= 1.8 && s.phase === 'PlayingVideo', 'video progress near five sequence seconds');
    const video = await capture('video-5s');
    report.samples.push({ name: 'controlled-animatic-near-5s', measurement: video });
    assert(video.mediaTime > firstFrame.mediaTime);
    await page.keyboard.press('Escape');
    const paused = await waitState(s => s.paused, 'pause source video');
    await delay(450);
    const stillPaused = await snapshot();
    close(stillPaused.sequenceTime, paused.sequenceTime, 0.02, 'paused video sequence');
    close(stillPaused.mediaTime, paused.mediaTime, 0.02, 'paused reported media');
    await page.keyboard.press('Escape');
    const ending = await waitState(s => s.phase === 'Timeline' && s.sequenceTime >= 10 && s.sequenceTime < 12,
      'protected live 10–12 second ending');
    assert.equal(ending.controlsReady, false);
    assert.equal(ending.videoFallback, false);
    assert.equal(ending.videoFirstFrame, true);
    await capture('protected-live-ending');
    const handoff = await waitState(s => s.phase === 'Flight', 'video normal handoff');
    checkHandoff(handoff);
    assert.equal(handoff.videoFallback, false);
    const fresh = await verifyFreshSteering();
    return { content: 'Controlled original Blender animatic; not AI-enhanced footage', firstFrame, video, paused, stillPaused, ending, handoff, fresh };
  });

  await runCase('low-540p-video-decodes-and-returns-control', async () => {
    await menu();
    await page.locator('#video-quality').selectOption('low');
    assert.equal(await page.locator('#video-quality').inputValue(), 'low');
    try {
      await clickLaunch('#launch-video', 'BlenderURL');
      const firstFrame = await waitState(s => s.phase === 'PlayingVideo' && s.videoFirstFrame && s.mediaTime >= 0.1,
        '540p video first frame');
      assert.equal(firstFrame.videoQuality, 'low');
      assert.equal(firstFrame.videoFallback, false);
      const elements = await videoElements();
      const decoded = elements.find(video => video.currentSrc === firstFrame.videoUrl || video.src === firstFrame.videoUrl);
      assert(decoded, 'Observe the actual HTMLVideoElement for the selected low-quality URL.');
      assert.equal(decoded.height, 540, 'Low variant must actually decode at 540p.');
      assert.equal(decoded.width, 960);
      assert(decoded.readyState >= 2, 'Decoded video needs current frame data.');
      const progress = await waitState(s => s.phase === 'PlayingVideo' && s.mediaTime >= 1.5,
        '540p media clock progresses');
      assert(progress.mediaTime > firstFrame.mediaTime);
      await capture('video-low-540p');
      const ending = await waitState(s => s.phase === 'Timeline' && s.sequenceTime >= 10 && s.sequenceTime < 12,
        '540p protected live ending');
      assert.equal(ending.videoFallback, false);
      const handoff = await waitState(s => s.phase === 'Flight', '540p normal handoff');
      checkHandoff(handoff);
      assert.equal(handoff.videoFallback, false);
      const fresh = await verifyFreshSteering();
      return { selectedThrough: '#video-quality UI select', firstFrame, decoded, observedVideoElements: elements, progress, ending, handoff, fresh };
    } finally { await page.locator('#video-quality').selectOption('balanced'); }
  });

  await runCase('held-video-response-readiness-timeout-fallback', async () => {
    await menu();
    const held = [];
    const routeTasks = [];
    let release;
    const released = new Promise(resolve => { release = resolve; });
    let fallbackObservedAtMs = null;
    const handler = route => {
      const record = { url: route.request().url(), heldAtMs: Date.now(), abortAttemptedAtMs: null };
      held.push(record);
      const operation = (async () => {
        await released;
        record.abortAttemptedAtMs = Date.now();
        try { await route.abort('aborted'); record.abortResult = 'aborted'; }
        catch (error) {
          // Runtime teardown may already cancel this exact held media request.
          record.abortResult = 'request already cancelled or abort failed';
          record.abortError = String(error);
        }
      })();
      routeTasks.push(operation);
      return operation;
    };
    await context.route(stalledUrl, handler);
    try {
      await send('StartVideoUrl', stalledUrl);
      const waiting = await waitState(s => s.phase === 'PreparingVideo' && !s.videoPrepared && !s.videoFirstFrame,
        'held response reaches explicit video readiness wait', 15000);
      const waitObservedAtMs = Date.now();
      const fallback = await waitState(s => s.videoFallback, 'six-active-second video readiness timeout', 18000);
      fallbackObservedAtMs = Date.now();
      assert(held.length > 0, 'The unique selected media request must actually be intercepted.');
      assert.match(fallback.notice, /No playable first frame arrived/i);
      assert.equal(fallback.videoFirstFrame, false);
      assert.equal(fallback.paused, false);
      assert(fallbackObservedAtMs - waitObservedAtMs >= 5500,
        'Readiness must not fail immediately; allow polling granularity around the six-active-second watchdog.');
      assert(fallbackObservedAtMs - held[0].heldAtMs >= 6000, 'Hold the request without any response for over six seconds.');
      assert(held.every(entry => entry.abortAttemptedAtMs === null), 'Do not abort to cause the timeout.');
      release();
      await Promise.allSettled(routeTasks);
      assert(held.every(entry => entry.abortAttemptedAtMs >= fallbackObservedAtMs), 'Abort only after observed local fallback.');
      const handoff = await waitState(s => s.phase === 'Flight', 'readiness-timeout fallback safe flight');
      checkHandoff(handoff);
      assert.equal(handoff.videoFallback, true);
      assert(!report.network.some(entry => entry.url === stalledUrl), 'Injected stall must provide no successful response.');
      const aborted = report.requestFailures.filter(entry => entry.url === stalledUrl);
      assert(aborted.some(entry => /ERR_ABORTED/i.test(entry.failure?.errorText || '')), 'Record this deliberate media cancellation.');
      return { fault: 'Unique same-origin URL intercepted without headers/body until runtime fallback', stalledUrl,
        waiting, waitObservedAtMs, fallbackObservedAtMs, fallback, heldRequests: held, aborted, handoff };
    } finally {
      release();
      await Promise.allSettled(routeTasks);
      await context.unroute(stalledUrl, handler);
    }
  });

  await runCase('reduced-motion-video-bypass-no-media-request', async () => {
    await menu();
    await page.locator('#reduced-motion').check();
    assert.equal(await page.locator('#reduced-motion').isChecked(), true);
    await waitState(s => s.reducedMotion, 'reduced-motion UI reaches runtime');
    const requestStart = report.requests.length;
    try {
      await send('StartVideoUrl', reducedMotionUrl);
      const bypass = await waitState(s => s.reducedMotion && s.videoFallback, 'reduced-motion local bypass');
      assert.match(bypass.notice, /Reduced motion/i);
      const live = await waitState(s => s.phase === 'Timeline' && s.sequenceTime >= 4, 'steady live reduced-motion ascent');
      assert.equal(live.videoFirstFrame, false);
      assert.equal(live.videoPrepared, false);
      const handoff = await waitState(s => s.phase === 'Flight', 'reduced-motion handoff');
      checkHandoff(handoff);
      assert.equal(handoff.reducedMotion, true);
      assert.equal(handoff.videoFirstFrame, false);
      const fresh = await verifyFreshSteering();
      const requests = report.requests.slice(requestStart);
      assert(!requests.some(entry => entry.url === reducedMotionUrl), 'Bypass must not request the selected video, even unsuccessfully.');
      assert(!requests.some(entry => entry.resourceType === 'media' || /\.mp4(?:[?#]|$)/i.test(entry.url)),
        'Reduced-motion path must make no media download request.');
      return { selectedThrough: '#reduced-motion UI checkbox', selectedButUnrequestedUrl: reducedMotionUrl, bypass, live, handoff, fresh, observedRequests: requests };
    } finally {
      await page.locator('#reduced-motion').uncheck();
      await waitState(s => !s.reducedMotion, 'reduced-motion UI reset reaches runtime');
    }
  });

  await runCase('missing-video-url-local-fallback', async () => {
    await menu();
    await send('StartVideoUrl', missingUrl);
    const fallback = await waitState(s => s.videoFallback, 'missing URL produces local fallback');
    assert.match(fallback.notice, /unavailable/i);
    const handoff = await waitState(s => s.phase === 'Flight', 'missing-video safe flight');
    checkHandoff(handoff);
    assert.equal(handoff.videoFallback, true);
    return { missingUrl, fallback, handoff };
  });

  await runCase('skip-preparing-and-repeated-launch-skip', async () => {
    await menu();
    const states = await page.evaluate(() => {
      const api = window.__SPACE_DRAGON_UNITY__;
      const read = () => { api.send('RequestSnapshot'); return api.snapshot(); };
      api.send('StartLaunch'); const preparing = read();
      api.send('StartLaunch'); api.send('StartLaunch'); const repeated = read();
      api.send('SkipCinematic'); api.send('SkipCinematic'); return { preparing, repeated, skipped: read() };
    });
    assert.equal(states.preparing.phase, 'Preparing');
    assert.equal(states.repeated.generation, states.preparing.generation);
    assert.equal(states.skipped.phase, 'Handoff');
    const handoff = await waitState(s => s.phase === 'Flight', 'skip preparation handoff');
    checkHandoff(handoff);
    return { ...states, handoff };
  });

  await runCase('skip-playing-video', async () => {
    await menu();
    await clickLaunch('#launch-video', 'BlenderURL');
    const before = await waitState(s => s.phase === 'PlayingVideo' && s.videoFirstFrame && s.mediaTime > 0.1, 'video before skip');
    await page.keyboard.press('Space');
    await send('SkipCinematic');
    const handoff = await waitState(s => s.phase === 'Flight', 'skip video handoff');
    checkHandoff(handoff);
    assert.equal(handoff.videoFallback, false, 'Intentional skip is not a decode failure.');
    return { before, handoff };
  });

  await runCase('skip-protected-ending', async () => {
    await menu();
    await clickLaunch('#launch-live', 'InEngine');
    const before = await waitState(s => s.phase === 'Timeline' && s.sequenceTime >= 10 && s.sequenceTime < 12, 'live ending before skip');
    await page.keyboard.press('Space');
    await send('SkipCinematic');
    const handoff = await waitState(s => s.phase === 'Flight', 'ending skip handoff');
    checkHandoff(handoff);
    return { before, handoff };
  });

  await runCase('short-safe-flight-measurement-and-storage-isolation', async () => {
    await waitState(s => s.controlsReady, 'controls ready for measurement');
    await send('ResetMeasurement');
    const start = Date.now();
    await waitState(s => s.performance?.frames?.sampleCount >= 180, 'post-warmup flight sample', 30000);
    const measured = await sample('safe-flight-post-warmup');
    measured.observationWaitMs = Date.now() - start;
    const storage = await page.evaluate(() => {
      const dump = store => Object.fromEntries(Object.keys(store).sort().map(key => [key, store.getItem(key)]));
      return { ...window.__launchStorageAudit, final: { local: dump(localStorage), session: dump(sessionStorage) } };
    });
    report.storage = { ...storage,
      scope: 'Fresh isolated browser origin with synthetic existing-save sentinels, observed through the final sample. Web Storage method mutations and main-window IndexedDB object-store mutations observed; engine asset-cache writes are distinct. Shutdown writes, worker/native/WASM internals, another origin/profile, disk durability and native PlayerPrefs are not exhaustively observed.' };
    report.storage.suspectedProgressWrites = storage.indexedDBWrites.filter(entry =>
      /playerprefs|checkpoint|exploration|learner|first-contact/i.test([entry.database, entry.store, entry.key].join(' ')));
    assert.deepEqual(storage.hookErrors, []);
    assert.deepEqual(storage.final, storage.initial, 'Synthetic existing save records must remain byte-identical.');
    assert.deepEqual(storage.webWrites, [], 'Launch must not mutate Web Storage.');
    assert.deepEqual(report.storage.suspectedProgressWrites, [], 'Observed progress-like IndexedDB writes are forbidden.');
    return { sample: measured, storage: report.storage };
  });

  await Promise.allSettled([...pendingNetwork]);
  const missingResponse = report.network.find(entry => entry.url === missingUrl && entry.status === 404);
  assert(missingResponse, 'The missing-media case must observe its actual same-origin 404.');
  classifyConsoleErrors();
  assert.deepEqual(report.pageErrors, [], 'Unexpected page exceptions.');
  assert.deepEqual(report.unexpectedErrors, [], 'Unexpected browser/Unity console errors.');
  assert.deepEqual(report.externalRequests, [], 'Only the selected local server may be requested.');
  assert.equal((await snapshot()).handoffCount, 1);
  report.notTested = report.cases.filter(entry => entry.result === 'NOT TESTED').map(entry => ({ name: entry.name, reason: entry.evidence?.reason }));
  report.result = report.notTested.length ? 'PASS_WITH_NOT_TESTED' : 'PASS';
} catch (error) {
  report.result = 'FAIL';
  report.failure = String(error.stack || error);
  report.failedCase = currentCase;
  if (page && !page.isClosed()) {
    report.lastSnapshot = await snapshot().catch(() => null);
    try {
      const file = path.join(runOutput, 'failure.png');
      await page.screenshot({ path: file, fullPage: true, timeout: 15000 });
      await copyFile(file, path.join(output, 'failure.png'));
      report.screenshots.push({ name: 'failure', path: path.relative(output, file).split(path.sep).join('/'), snapshot: report.lastSnapshot });
    } catch (captureError) { report.failureScreenshotError = String(captureError); }
  }
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  await Promise.allSettled([...pendingNetwork]);
  classifyConsoleErrors();
  // Context closure finalizes the WebM. Preserve the per-run file even when a check failed.
  if (context) {
    try {
      await context.close();
      if (recordingPath) {
        await copyFile(recordingPath, path.join(output, 'session.webm'));
        report.recording.finalized = true;
        report.recording.latestAlias = 'session.webm';
      }
    } catch (error) {
      report.recordingError = String(error);
      report.result = 'FAIL';
      process.exitCode = 1;
    }
  }
  await writeReport();
  if (browser) await browser.close();
}
console.log(`${report.result}: LaunchLab browser verification; ${path.join(output, 'report.json')}`);
