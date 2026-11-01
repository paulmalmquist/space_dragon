// Exercise the actual locally built Unity Town Drive player in an isolated browser profile.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const url = new URL(process.env.SPACE_DRAGON_TOWN_DRIVE_URL || 'http://127.0.0.1:5208/space-dragon-town-drive/');
assert(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Use the local review server.');
const output = path.resolve(process.argv[2] || path.join(repo, 'artifacts/unity-town-drive/scene-browser'));
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const runOutput = path.join(output, 'runs', runId);
await mkdir(runOutput, { recursive: true });
const routeData = JSON.parse(await readFile(path.join(repo, 'unity/SpaceDragon/Assets/SpaceDragon/TownDrive/Data/town-drive-v001.json'), 'utf8'));
const close = (a,b,epsilon=1e-3) => Math.abs(a-b) <= epsilon;
const forceWebGL2 = process.env.SPACE_DRAGON_TOWN_DRIVE_WEBGL2 === '1';
const fullLap = process.env.SPACE_DRAGON_TOWN_DRIVE_FULL_LAP === '1';
const report = { runId, startedAt: new Date().toISOString(), url: url.href, result: 'RUNNING',
  viewport: [1280, 720], forceWebGL2, fullLap, cases: [], trace: [], screenshots: [],
  pageErrors: [], consoleErrors: [], console: [], failedRequests: [], externalRequests: [], artifacts: [],
  scope: 'Installed Chrome, isolated browser context, actual Unity player. Normal driving uses real keyboard events. A separately labeled full-lap run may feed bounded semantic input to the same fixed-step simulation; it cannot set pose, checkpoints or time.',
  limitations: ['Headless browser checks do not establish human comfort or art approval.', 'Physical gamepad, touch, sound audibility and sustained hardware performance are not inferred.'] };
let browser, context, page, saveTimer;
let saving = Promise.resolve();
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function saveReport() {
  const text = JSON.stringify(report, null, 2);
  saving = saving.catch(() => {}).then(async () => {
    await writeFile(path.join(runOutput, 'report.json'), text);
    await writeFile(path.join(output, 'report.json'), text);
  });
  return saving;
}
async function send(method, arg) {
  return page.evaluate(({ method, arg }) => window.__SPACE_DRAGON_TOWN_DRIVE__?.send(method, arg), { method, arg });
}
async function snapshot() {
  assert.equal(report.pageErrors.length, 0, 'No browser runtime exception.');
  const state = await page.evaluate(() => {
    const error = document.querySelector('#error');
    if (error && !error.hidden) throw new Error(document.querySelector('#error-message')?.textContent || 'Unity loading failed.');
    const api = window.__SPACE_DRAGON_TOWN_DRIVE__;
    if (!api?.instance) return null;
    api.send('RequestSnapshot');
    if (api.lastSnapshotError) throw new Error(api.lastSnapshotError);
    return api.latestSnapshot ? api.snapshot() : null;
  });
  if (state?.error) throw new Error(`Unity runtime: ${state.error}`);
  return state;
}
async function waitState(predicate, label, timeout = 45000) {
  const end = Date.now() + timeout; let state;
  while (Date.now() < end) {
    state = await snapshot();
    if (state && predicate(state)) return state;
    await delay(80);
  }
  throw new Error(`${label} timed out: ${JSON.stringify(state)}`);
}
// PlayerPrefs.Save queues asynchronous IDBFS work. An immediate reload can
// interrupt that write even after the runtime reports "Checkpoint saved".
// Observe the existing write; never call FS.syncfs or repair storage for a test.
async function waitForDurableTownDriveSave() {
  const started = Date.now();
  const handle = await page.waitForFunction(async key => {
    const mountNode = window.__SPACE_DRAGON_TOWN_DRIVE__?.instance?.Module?.__unityIdbfsMount;
    if (mountNode?.mount?.idbPersistState !== 0) return false;
    const pending = [];
    function visit(node, filePath) {
      if (node.contents instanceof Uint8Array) {
        const bytes = node.contents.slice(0, node.usedBytes ?? node.contents.length);
        // Unity owns the preference-file encoding. Inspect only files carrying
        // this lab's key; compare raw bytes rather than reconstructing the file.
        const containsKey = ['utf-8', 'utf-16le'].some(encoding => new TextDecoder(encoding).decode(bytes).includes(key));
        if (containsKey) pending.push({ filePath, bytes });
      } else if (node.contents && typeof node.contents === 'object') {
        for (const [name, child] of Object.entries(node.contents)) visit(child, filePath + '/' + name);
      }
    }
    visit(mountNode, mountNode.mount.mountpoint);
    if (!pending.length) return false;
    if (!(await indexedDB.databases()).some(db => db.name === '/idbfs')) return false;
    const stored = await new Promise((resolve, reject) => {
      let database;
      const timeout = setTimeout(() => { database?.close(); reject(new Error('Read-only persistence inspection timed out.')); }, 5000);
      const finish = (error, value) => { clearTimeout(timeout); database?.close(); error ? reject(error) : resolve(value); };
      const request = indexedDB.open('/idbfs');
      // Never create a database if storage disappears between discovery/open.
      request.onupgradeneeded = () => request.transaction.abort();
      request.onerror = () => finish(request.error);
      request.onsuccess = () => {
        database = request.result;
        if (!database.objectStoreNames.contains('FILE_DATA')) { finish(null, null); return; }
        const transaction = database.transaction('FILE_DATA', 'readonly');
        const values = new Map();
        transaction.onerror = () => finish(transaction.error);
        transaction.onabort = () => finish(transaction.error || new Error('Persistence inspection aborted.'));
        transaction.oncomplete = () => finish(null, values);
        const store = transaction.objectStore('FILE_DATA');
        for (const { filePath } of pending) {
          const read = store.get(filePath);
          read.onsuccess = () => values.set(filePath, read.result?.contents);
        }
      };
    });
    if (!stored || mountNode.mount.idbPersistState !== 0) return false;
    const files = [];
    for (const { filePath, bytes } of pending) {
      const saved = stored.get(filePath);
      if (!(saved instanceof Uint8Array) || saved.length !== bytes.length || !bytes.every((value, i) => value === saved[i])) return false;
      const hash = await crypto.subtle.digest('SHA-256', saved);
      files.push({ path: filePath, bytes: saved.length,
        sha256: Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, '0')).join('') });
    }
    return { key, database: '/idbfs', store: 'FILE_DATA', persistState: 0, files,
      scope: 'Read-only persisted bytes match the key-scoped in-memory preference file after Unity IDBFS commit. No test-triggered synchronization.' };
  }, 'space-dragon.unity.drive.v1', { timeout: 30000, polling: 100 });
  const result = await handle.jsonValue(); await handle.dispose();
  return { ...result, waitMs: Date.now() - started };
}
async function tap(key) { await page.keyboard.down(key); await delay(100); await page.keyboard.up(key); }
async function release() {
  if (!page || page.isClosed()) return;
  for (const key of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','q','e','Space','Escape','c','r']) await page.keyboard.up(key);
}
async function capture(name) {
  const file = path.join(runOutput, name + '.png');
  await page.screenshot({ path: file });
  const state = await snapshot(); report.screenshots.push({ name, path: file, state });
  return state;
}
async function runCase(name, action) {
  const entry = { name, result: 'RUNNING', startedAt: new Date().toISOString() }; report.cases.push(entry); await saveReport();
  try { entry.evidence = await action(); entry.result = 'PASS'; }
  catch (error) { entry.result = 'FAIL'; entry.error = String(error.stack || error); throw error; }
  finally { entry.finishedAt = new Date().toISOString(); await saveReport(); }
}

try {
  const buildRoot = path.join(repo, 'unity/SpaceDragon/Builds/TownDriveWeb');
  report.build = JSON.parse(await readFile(path.join(buildRoot, 'town-drive-build-receipt.json'), 'utf8'));
  assert.equal(report.build.result, 'Succeeded');
  if (fullLap) assert.equal(report.build.semanticReviewHooks, true, 'Full lap requires an explicit review build.');
  async function inventory(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { await inventory(file); continue; }
      if (!entry.isFile()) continue;
      const hash = createHash('sha256'); let bytes = 0;
      for await (const chunk of createReadStream(file)) { bytes += chunk.length; hash.update(chunk); }
      report.artifacts.push({ path: path.relative(buildRoot, file).split(path.sep).join('/'), bytes, sha256: hash.digest('hex') });
    }
  }
  await inventory(buildRoot);
  const args = forceWebGL2 ? ['--disable-features=WebGPUService'] : [];
  browser = await chromium.launch({ channel: 'chrome', headless: true, args });
  report.browser = browser.version();
  context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => { if (!localStorage.getItem('town-drive-verification-sentinel')) localStorage.setItem('town-drive-verification-sentinel', 'campaign-data-must-stay'); });
  page = await context.newPage();
  page.on('pageerror', error => report.pageErrors.push(String(error)));
  page.on('console', message => {
    const item = { type: message.type(), text: message.text() };
    if (item.type === 'error') report.consoleErrors.push(item); else report.console.push(item);
  });
  page.on('request', request => { const target = new URL(request.url()); if (['http:','https:'].includes(target.protocol) && target.origin !== url.origin) report.externalRequests.push(request.url()); });
  page.on('requestfailed', request => report.failedRequests.push({ url: request.url(), failure: request.failure() }));
  saveTimer = setInterval(() => { void saveReport(); }, 10000);
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await waitState(s => s.ready && s.scene, 'Unity scene ready', 180000);
  await page.locator('#unity-canvas').click({ position: { x: 640, y: 360 } });
  if ((await snapshot()).paused) { await tap('Escape'); await waitState(s => !s.paused, 'deliberate resume after startup focus'); }
  await release(); await delay(200);
  // Case bodies are maintained with the runtime snapshot contract below.
  await runCase('detailed-scene-ready', async () => {
    const state = await capture('home-chase');
    assert(state.scene.includes('TownDrive'));
    assert(Number.isFinite(state.x) && Number.isFinite(state.z));
    assert(state.trafficCount > 0 && state.pedestrianCount > 0);
    assert(state.graphicsDeviceType && state.graphicsDeviceName, 'Actual renderer identity is recorded.');
    if (forceWebGL2) assert.equal(state.graphicsDeviceType, 'OpenGLES3');
    return state;
  });
  await runCase('keyboard-drive-steer-brake', async () => {
    const before = await snapshot();
    await page.keyboard.down('ArrowUp');
    const moving = await waitState(s => s.speed > 2 && Math.hypot(s.x - before.x, s.z - before.z) > 3, 'real keyboard acceleration');
    await page.keyboard.down('ArrowRight'); await delay(350); await page.keyboard.up('ArrowRight');
    const steered = await snapshot(); assert(Math.abs(steered.yaw - moving.yaw) > .01);
    await page.keyboard.up('ArrowUp'); await page.keyboard.down('ArrowDown');
    const stopped = await waitState(s => Math.abs(s.speed) < .5, 'braking');
    await page.keyboard.up('ArrowDown'); await capture('driving'); return { before, moving, steered, stopped };
  });
  await runCase('pause-freezes-player-and-ambient-time', async () => {
    await tap('Escape'); const paused = await waitState(s => s.paused, 'pause');
    await page.keyboard.down('ArrowUp'); await delay(750); const held = await snapshot();
    assert.equal(held.elapsed, paused.elapsed); assert.equal(held.x, paused.x); assert.equal(held.z, paused.z);
    assert.deepEqual(held.traffic, paused.traffic); assert.deepEqual(held.pedestrians, paused.pedestrians);
    await page.keyboard.up('ArrowUp'); await tap('Escape'); const resumed = await waitState(s => !s.paused, 'resume');
    return { paused, held, resumed };
  });
  await runCase('detailed-cabin-and-look', async () => {
    await tap('c'); const cabin = await waitState(s => s.cameraMode === 'cabin', 'cabin camera');
    assert(cabin.cabinVisible && close(cabin.frontGlazingAlpha,.10) && cabin.dashboardMph>=0);
    assert(close(cabin.cabinEyeLocal.x,-.46) && close(cabin.cabinEyeLocal.y,1.42) && close(cabin.cabinEyeLocal.z,.42));
    const mirror = await waitState(s => s.rearViewSupported && s.rearViewActive && s.rearViewCaptures > 0, 'live rear view');
    const cabinStart = await snapshot(), cabinStartedAt = Date.now();
    report.warmedCabinWindow = await waitState(s => s.frames >= cabinStart.frames + 240, '240 cabin frames with live rear view', 90000);
    report.cabinCaptureWindow = { wallMs: Date.now() - cabinStartedAt, captures: report.warmedCabinWindow.rearViewCaptures - cabinStart.rearViewCaptures };
    assert(report.cabinCaptureWindow.captures <= Math.ceil(report.cabinCaptureWindow.wallMs * .006) + 1, 'Rear view stays within its six-capture-per-second budget.');
    assert(report.warmedCabinWindow.rearViewCaptures > mirror.rearViewCaptures, 'Rear view updates while active.');
    await tap('Escape'); const mirrorPaused = await waitState(s => s.paused, 'cabin pause');
    await delay(600); const mirrorHeld = await snapshot();
    assert.equal(mirrorHeld.rearViewCaptures, mirrorPaused.rearViewCaptures, 'Paused mirror does not render hidden work.');
    await tap('Escape'); await waitState(s => !s.paused && s.rearViewCaptures > mirrorPaused.rearViewCaptures, 'live rear view resumes');
    await capture('cabin-forward');
    await page.keyboard.down('q'); await delay(600); const left = await capture('cabin-left'); await page.keyboard.up('q');
    assert(left.lookYaw < cabin.lookYaw - .1);
    await page.keyboard.down('e'); await delay(600); const right = await capture('cabin-right'); await page.keyboard.up('e');
    assert(right.lookYaw > left.lookYaw + .1);
    await tap('c'); const chase = await waitState(s => s.cameraMode === 'chase', 'chase camera restored'); assert(close(chase.frontGlazingAlpha,.55));
    await delay(500); const mirrorOff = await snapshot();
    assert.equal(mirrorOff.rearViewActive, false); assert.equal(mirrorOff.rearViewCaptures, chase.rearViewCaptures, 'Chase view has no mirror rendering cost.');
    return { cabin, left, right, mirror, mirrorPaused, mirrorHeld, mirrorOff };
  });
  await runCase('reset-snaps-common-car-camera-presentation', async () => {
    await tap('r'); const state = await waitState(s => Math.abs(s.speed) < .01, 'reset');
    assert.equal(state.paused, false);
    const checkpoint=routeData.route.checkpoints.find(c=>c.id===state.checkpointId);
    assert(close(state.x,checkpoint.x) && close(state.z,checkpoint.z) && close(state.routeS,checkpoint.s));
    assert(close(state.displayedCarPosition.x,state.x) && close(state.displayedCarPosition.z,state.z));
    return await capture('reset-home');
  });
  await runCase('checkpoint-save-and-reload', async () => {
    const before = await snapshot();
    await tap('f'); const saved = await waitState(s => s.assist !== before.assist, 'assist setting saved');
    report.persistence = { before, saved }; await saveReport();
    const committed = await waitForDurableTownDriveSave();
    report.persistence.committed = committed; await saveReport();
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
    const restored = await waitState(s => s.ready, 'player reload', 180000);
    assert.equal(restored.assist, saved.assist); assert.deepEqual(restored.visited, saved.visited);
    assert.equal(restored.checkpointId, saved.checkpointId);
    assert.equal(await page.evaluate(() => localStorage.getItem('town-drive-verification-sentinel')), 'campaign-data-must-stay');
    await page.locator('#unity-canvas').click({ position: { x: 640, y: 360 } });
    if (restored.paused) { await tap('Escape'); await waitState(s => !s.paused, 'resume after reload'); }
    if (restored.assist) { await tap('f'); await waitState(s => !s.assist, 'normal handling restored'); }
    return { before, saved, committed, restored };
  });
  const warmStart = await snapshot();
  report.warmedStationaryWindow = await waitState(s => s.frames >= warmStart.frames + 240,
    '240 rendered frames after reload', 60000);
  report.frameTimingScope = 'Last 240 Unity Update wall intervals after the reload warmup; not GPU timings or an endurance/performance approval.';
  if (fullLap) await runCase('complete-real-fixed-step-lap-with-semantic-controls', async () => {
    await tap('r'); await waitState(s => Math.abs(s.speed) < .01, 'home reset before complete lap');
    let state = await snapshot(), previous = state; const started = Date.now(), startElapsed = state.elapsed;
    const checkpoints = [state.checkpointId], samples = []; let maximumStep = 0, contactSnapshots = 0, lastSample = -1;
    assert.equal(state.checkpointId, 'home'); assert.equal(state.completed, false);
    while (!state.completed && Date.now() - started < 1200000) {
      assert.equal(state.paused, false, 'Full lap remains actively simulated.');
      const heading = Math.atan2(state.targetAhead.x - state.x, state.targetAhead.z - state.z);
      const error = Math.atan2(Math.sin(heading - state.yaw), Math.cos(heading - state.yaw));
      let targetSpeed = state.recommendedSpeed;
      for (const car of state.traffic || []) {
        const dx = car.x-state.x, dz=car.z-state.z;
        const forward=dx*Math.sin(state.yaw)+dz*Math.cos(state.yaw), side=dx*Math.cos(state.yaw)-dz*Math.sin(state.yaw);
        if (forward > 0 && forward < 85 && Math.abs(side)<2.1 && Math.cos(car.yaw-state.yaw)>.2)
          targetSpeed=Math.min(targetSpeed,Math.max(0,car.speed+(forward-8)/1.3),Math.sqrt(car.speed*car.speed+2*6*Math.max(0,forward-8)));
      }
      await send('SetReviewInput', JSON.stringify({ throttle: state.speed < targetSpeed ? 1 : 0,
        brake: state.speed > targetSpeed+.3 ? .6 : 0, steer: Math.max(-1,Math.min(1,error*3)), handbrake: false }));
      await delay(40); state = await snapshot();
      const displacement=Math.hypot(state.x-previous.x,state.z-previous.z), elapsed=state.elapsed-previous.elapsed;
      maximumStep=Math.max(maximumStep,displacement);
      assert(displacement <= Math.max(2,elapsed*40+1), 'No world-pose teleport during semantic driving.');
      if(state.bonkSeconds>0)contactSnapshots++;
      if(checkpoints.at(-1)!==state.checkpointId){checkpoints.push(state.checkpointId);await capture('checkpoint-'+checkpoints.length);}
      const sampleBucket=Math.floor((state.elapsed-startElapsed)/10);
      if(sampleBucket>lastSample){lastSample=sampleBucket;samples.push({elapsed:state.elapsed,x:state.x,z:state.z,s:state.routeS,speed:state.speed,checkpointId:state.checkpointId});report.lapProgress=samples.at(-1);await saveReport();}
      previous=state;
    }
    await send('StopReviewInput'); assert.equal(state.completed,true,'Return home completes the entire route.');
    assert.deepEqual(state.visited,['home','leg-1','leg-2','leg-3','leg-4']);
    assert.deepEqual(checkpoints,['home','leg-1','leg-2','leg-3','leg-4','home']);
    assert(state.elapsed-startElapsed>180, 'Real simulation time must cover a full drive.');
    await capture('complete-home');
    report.completedPersistence = await waitForDurableTownDriveSave(); await saveReport();
    await page.reload({waitUntil:'domcontentloaded',timeout:90000});const restored=await waitState(s=>s.ready,'completed save reload',180000);
    assert.equal(restored.completed,true);assert.deepEqual(restored.visited,state.visited);assert.equal(restored.checkpointId,'home');
    return{semanticInputOnly:true,wallSeconds:(Date.now()-started)/1000,simulatedSeconds:state.elapsed-startElapsed,checkpoints,maximumObservedDisplacement:maximumStep,contactSnapshots,samples,completed:state,restored};
  });
  report.final = await snapshot();
} catch (error) { report.fatal = String(error.stack || error); console.error(error); }
finally {
  clearInterval(saveTimer); try { await release(); } catch {}
  report.finishedAt = new Date().toISOString();
  report.result = !report.fatal && report.cases.length === (fullLap ? 7 : 6) && report.cases.every(c => c.result === 'PASS') &&
    !report.pageErrors.length && !report.consoleErrors.length && !report.externalRequests.length && !report.failedRequests.length ? 'PASS' : 'FAIL';
  await saveReport(); if (browser) await browser.close();
  console.log(`Town Drive verification ${report.result}: ${path.join(runOutput, 'report.json')}`);
  if (report.result !== 'PASS') process.exitCode = 1;
}
