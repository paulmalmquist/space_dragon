// Observed development-player verification. No fake clocks, forced rewards or direct state edits.
// Start serve-dogfight.mjs separately after a fresh development Web build.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, copyFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const url = new URL(process.env.SPACE_DRAGON_DOGFIGHT_URL || 'http://127.0.0.1:5207/space-dragon-dogfight/');
assert(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Only the local Dogfight player may be tested.');
assert(['http:', 'https:'].includes(url.protocol), 'Serve the built player over HTTP.');
const output = path.resolve(process.argv[2] || path.join(repo, 'artifacts/unity/dogfight-playtest'));
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const runOutput = path.join(output, 'runs', runId);
await mkdir(runOutput, { recursive: true });
const forceWebGL2 = process.env.SPACE_DRAGON_DOGFIGHT_WEBGL2 === '1';
const performanceOnly = process.env.SPACE_DRAGON_DOGFIGHT_PERF_ONLY === '1';
const baselineMode = process.env.SPACE_DRAGON_DOGFIGHT_BASELINE === '1';
const report = {
  runId, startedAt: new Date().toISOString(), url: url.href, viewport: [1366, 768], forceWebGL2,
  command: process.argv.join(' '), result: 'RUNNING', performanceOnly, baselineMode,
  baselineScope: baselineMode
    ? 'All eight SD-090 combat upgrade flags and independent wing bank are explicitly disabled through the development comparison fixture at startup and every restart. Existing eleven-case assertions are unchanged.'
    : 'Upgrade flags are not changed by this verifier. This run must not be described as an all-flags-off baseline.',
  scope: 'Installed Chrome, normal GPU configuration, actual Unity player and browser keyboard/mouse events. Development fixtures arrange quiet threats, a moving-relative target, damage, supplies and a collider; real simulation resolves locks, projectiles, collection, repairs and losses. No clocks or authoritative counters are advanced by the verifier.',
  performanceScope: 'The separate natural encounter sample uses no quiet/target/damage fixtures. resetPerf clears measurement counters only. Unity frame intervals are wall-clock Update intervals, not GPU execution time; draw counters are last-frame observations and texture memory is Unity allocation, not driver VRAM. Ten-second sampling is not endurance or a quality approval.',
  limitations: ['Physical controller, human sound audibility, comfort, family usability and final art approval are NOT TESTED.', 'Condition fixtures are compiled into this development review player; these tests do not validate release-player fixture exclusion.', 'Headless installed Chrome is not a human play session. Renderer identity is recorded rather than inferred from launch options.'],
  cases: [], screenshots: [], trace: [], samples: [], mouthChecks: [], console: [], consoleErrors: [], pageErrors: [],
  externalRequests: [], requestFailures: [], transfers: [], fixtures: [], artifacts: [],
};
let browser, context, page, reportTimer, currentCase = 'startup';
let reportWrite = Promise.resolve();
const networkTasks = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const inputs = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', 'Tab', 'Enter', 'Space', 'Escape', 'q', 'e', 'b', 'm', 'x', 'w', 'a', 'd', 'z', '1', '2', '3'];
const fieldNames = ['hull', 'propulsion', 'weapons'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const finitePoint = point => point && ['x', 'y', 'z'].every(axis => Number.isFinite(point[axis]));
async function artifact(relative) {
  const bytes = await readFile(path.join(repo, relative));
  report.artifacts.push({path: relative, bytes: bytes.length, sha256: sha(bytes)});
  return bytes;
}
function mouthCheck(state, kind) {
  assert.equal(state.muzzleAttached, true, 'Effects must use the imported muzzle attachment, never a fallback offset.');
  assert(finitePoint(state.muzzle) && finitePoint(state.muzzleScreen), 'Muzzle world and projected coordinates must be finite.');
  const entries = kind === 'plasma' ? [['lastPlasmaOrigin', 'lastPlasmaMuzzle']]
    : kind === 'windup' ? [['windupOrigin', 'muzzle']] : [['beamOrigin', 'muzzle'], ['beamCoreOrigin', 'muzzle']];
  if (kind === 'plasma') assert.equal(state.lastPlasmaRecorded, true, 'A real player projectile must have spawned.');
  if (kind === 'windup') assert.equal(state.windupActive, true, 'Windup visual must actually be enabled.');
  if (kind === 'beam') assert.equal(state.beam, true, 'Beam must actually be enabled.');
  for (const [effect, socket] of entries) {
    assert(finitePoint(state[effect]) && finitePoint(state[socket]), `Missing actual ${effect} telemetry.`);
    const errorMetres = distance(state[effect], state[socket]);
    assert(errorMetres <= .02, `${effect} must originate at the actual mouth socket (observed ${errorMetres}m).`);
    report.mouthChecks.push({kind, effect, socket, errorMetres, worldOrigin: state[effect], socketPosition: state[socket], elapsed: state.elapsed,
      scope: 'Actual spawned visual/LineRenderer transform versus imported socket; pixel appearance requires screenshot review.'});
  }
}

async function saveReport() {
  const body = JSON.stringify(report, null, 2);
  // Serialize periodic and final checkpoints so an older startup write cannot
  // finish after, and overwrite, the final failure evidence.
  reportWrite = reportWrite.catch(() => {}).then(async () => {
    await writeFile(path.join(runOutput, 'report.json'), body);
    await writeFile(path.join(output, 'report.json'), body);
  });
  return reportWrite;
}
function throwOnRuntimeFailure() {
  const pageError = report.pageErrors[0];
  const aborted = report.consoleErrors.find(entry => /\babort(?:ed)?\b|was not exported|RuntimeError:|unreachable|out of memory/i.test(entry.text));
  if (pageError || aborted) throw new Error(`Unity/browser runtime failed: ${(pageError || aborted).text}`);
}
async function send(method, arg) {
  return page.evaluate(({ method, arg }) => window.__SPACE_DRAGON_DOGFIGHT__?.send(method, arg), { method, arg });
}
async function snapshot() {
  throwOnRuntimeFailure();
  const state = await page.evaluate(() => {
    const error = document.querySelector('#error');
    if (error && !error.hidden) throw new Error(document.querySelector('#error-message')?.textContent || 'Unity player failed to load.');
    const api = window.__SPACE_DRAGON_DOGFIGHT__;
    if (!api?.instance) return null;
    api.send('RequestSnapshot');
    if (api.lastSnapshotError) throw new Error(api.lastSnapshotError);
    return api.snapshot ? api.snapshot() : api.latestSnapshot;
  });
  if (state?.scene) report.trace.push({ case: currentCase, wallMs: Date.now(), elapsed: state.elapsed,
    paused: state.paused, dead: state.dead, hull: state.hull, missileCharges: state.missileCharges,
    repairing: state.repairing, repairProgress: state.repairProgress, repairsCompleted: state.repairsCompleted,
    repairsInterrupted: state.repairsInterrupted, salvage: state.salvage, lockState: state.lockState,
    breathPhase: state.breathPhase, beam: state.beam, fixture: state.fixture,
    rollAngle:state.rollAngle,bankAngle:state.bankAngle,yawRate:state.yawRate,breakActive:state.breakActive,propulsionLevel:state.propulsionLevel });
  return state;
}
async function waitState(predicate, label, timeout = 45000, allowDead = false) {
  const deadline = Date.now() + timeout;
  let state;
  while (Date.now() < deadline) {
    throwOnRuntimeFailure();
    state = await snapshot();
    throwOnRuntimeFailure();
    if (state?.scene && predicate(state)) return state;
    if (state?.dead && !allowDead) throw new Error(`${label}: dragon disabled unexpectedly.`);
    await delay(80);
  }
  throw new Error(`${label}: timed out. Last snapshot: ${JSON.stringify(state)}`);
}
async function waitSim(seconds) {
  const before = await snapshot();
  assert(before && !before.paused && !before.dead, 'Simulation wait requires live, unpaused flight.');
  return waitState(s => s.elapsed - before.elapsed >= seconds, `${seconds}s of actual simulation`, Math.max(20000, seconds * 5000 + 15000));
}
async function releaseInputs() {
  if (!page || page.isClosed()) return;
  for (const key of inputs) await page.keyboard.up(key);
  for (const button of ['left', 'middle', 'right']) await page.mouse.up({ button });
}
async function tap(key) { await page.keyboard.press(key, { delay: 100 }); }
async function fixture(action) {
  report.fixtures.push({ case: currentCase, action, wallMs: Date.now() });
  await send('QaFixture', action);
}
function assertBaselineFlags(state) {
  if (!baselineMode) return;
  for (const name of ['perfectRoll', 'enemyRoles', 'clawFinisher', 'wingman', 'rockWeapons', 'multiTargetBreath', 'repairCode', 'comeback', 'independentBank'])
    assert.match(state.combatFlags || '', new RegExp(`${name}=False(?:;|$)`), `Baseline must disable ${name}.`);
}
async function restart(mode = 'quiet') {
  await releaseInputs();
  await page.locator('#unity-canvas').focus();
  // One browser operation prevents a rendered frame between restart and fixture isolation.
  await page.evaluate(({mode, baselineMode}) => {
    const api = window.__SPACE_DRAGON_DOGFIGHT__;
    if (baselineMode) api.send('QaFixture', 'upgrades:off');
    else api.send('RestartEncounter');
    if (mode) api.send('QaFixture', mode);
    api.send('RequestSnapshot');
  }, {mode, baselineMode});
  if (baselineMode) report.fixtures.push({ case: currentCase, action: 'upgrades:off', resetsEncounter: true, baselineComparison: true, wallMs: Date.now() });
  if (mode) report.fixtures.push({ case: currentCase, action: mode, afterRestart: true, wallMs: Date.now() });
  const state = await waitState(s => !s.dead && !s.paused && s.hull === 100 && s.propulsion === 100 && s.weapons === 100 &&
    s.salvage === 1 && s.repairsRemaining === 3 && s.missileCharges === 2 && s.missilesLaunched === 0 && s.kills === 0,
  'complete encounter restart', 30000, true);
  assertBaselineFlags(state);
  if (mode) assert.equal(state.fixture, true, 'This harness requires the development condition fixtures.');
  await waitSim(.15); // The runtime requires fresh neutral input after restart.
  return state;
}
async function capture(name) {
  const state = await snapshot();
  const wallMs = Date.now();
  const file = path.join(runOutput, `${name}.png`);
  await page.locator('#unity-canvas').screenshot({ path: file, timeout: 15000 });
  await copyFile(file, path.join(output, `${name}.png`));
  const after = await snapshot();
  report.screenshots.push({ name, case: currentCase, wallMs, path: path.relative(output, file).split(path.sep).join('/'), snapshot: state, afterSnapshot: after,
    captureScope: 'Live unpaused frames; before/after snapshots bound the screenshot interval.' });
  return state;
}
async function captureMouth(name, observed) {
  const before = observed || await snapshot();
  assert(finitePoint(before.muzzleScreen) && before.muzzleScreen.z > 0, 'Mouth must project in front of the gameplay camera.');
  // One browser capture only. Waiting for a second screenshot can outlast the
  // entire beam; derive its detail crop from these exact same pixels instead.
  const fullName = name.replace(/-mouth$/, '');
  const fullFile = path.join(runOutput, `${fullName}.png`);
  const image = await page.locator('#unity-canvas').screenshot({path: fullFile, timeout: 15000});
  const after = await snapshot();
  const metadata = await sharp(image).metadata();
  const width = Math.min(260, metadata.width), height = Math.min(200, metadata.height);
  const center = {x: before.muzzleScreen.x * metadata.width, y: (1 - before.muzzleScreen.y) * metadata.height};
  assert(center.x >= 0 && center.x <= metadata.width && center.y >= 0 && center.y <= metadata.height,
    'Actual muzzle must be visible inside the gameplay canvas for the mouth crop.');
  const clip = {left: Math.floor(Math.max(0, Math.min(metadata.width - width, center.x - width / 2))),
    top: Math.floor(Math.max(0, Math.min(metadata.height - height, center.y - height / 2))), width, height};
  const file = path.join(runOutput, `${name}.png`);
  await sharp(image).extract(clip).toFile(file);
  await copyFile(fullFile, path.join(output, `${fullName}.png`));
  await copyFile(file, path.join(output, `${name}.png`));
  const beforePhase = before.breathStage || before.breathPhase;
  const afterPhase = after.breathStage || after.breathPhase;
  const phaseStable = beforePhase === afterPhase && before.breathsFired === after.breathsFired;
  const timing = {beforePhase, afterPhase, phaseAdvancedDuringCapture: !phaseStable,
    imagePhase: phaseStable ? `bounded by ${beforePhase} snapshots` : 'UNCONFIRMED: attack phase advanced while screenshot capture waited',
    beforeElapsed: before.elapsed, afterElapsed: after.elapsed};
  report.screenshots.push({name: fullName, case: currentCase, path: path.relative(output, fullFile).split(path.sep).join('/'),
    snapshot: before, afterSnapshot: after, timing,
    captureScope: 'One live full-frame screenshot after phase/origin observation; phase labeling depends on both bounding snapshots, never the requested filename.'});
  report.screenshots.push({name, case: currentCase, path: path.relative(output, file).split(path.sep).join('/'), clip,
    sourceFullFrame: path.relative(output, fullFile).split(path.sep).join('/'), snapshot: before, afterSnapshot: after, timing,
    captureScope: 'Crop of the exact same full-frame PNG; centered using the preceding socket projection. No second browser capture or frame pause.'});
  return {before, after, timing};
}
async function aimAt(id) {
  const state = await snapshot();
  const enemy = state?.enemies?.find(e => e.id === id && !e.dead);
  assert(enemy && enemy.screenZ > 0 && enemy.screenX > .02 && enemy.screenX < .98 && enemy.screenY > .02 && enemy.screenY < .98, `Target ${id} must actually be visible.`);
  const box = await page.locator('#unity-canvas').boundingBox();
  await page.mouse.move(box.x + enemy.screenX * box.width, box.y + enemy.screenY * box.height);
  return state;
}
async function trackUntil(id, predicate, label, timeout = 45000) {
  const deadline = Date.now() + timeout;
  let state;
  while (Date.now() < deadline) {
    state = await aimAt(id);
    if (predicate(state)) return state;
    assert(!state.dead, `${label}: dragon disabled.`);
    await delay(80);
  }
  throw new Error(`${label}: timed out at ${JSON.stringify(state)}`);
}
async function startRepair(index, expectStart = true) {
  await releaseInputs(); await page.locator('#unity-canvas').focus(); await waitSim(.15);
  await page.keyboard.down('Tab');
  try {
    await waitState(s => s.selector, 'held Tab opens the system selector');
    await tap(String(index + 1));
    return expectStart ? await waitState(s => s.repairing, `repair ${fieldNames[index]} starts`) :
      await waitState(s => !s.selector && !s.repairing && /remaining|salvage|intact/i.test(s.toast), 'repair refusal is visible');
  } finally { await page.keyboard.up('Tab'); }
}
async function spellCurrentWord() {
  const initial = await snapshot();
  assert.equal(initial.breathPhase, 'Charging'); assert.match(initial.word, /^[A-Z]{4}$/);
  for (let index = initial.letterIndex; index < 4; index++) {
    await tap(initial.word[index].toLowerCase());
    await waitState(s => s.word === initial.word && s.letterIndex === index + 1, `actual letter ${index + 1}`);
  }
  return waitState(s => s.breathPhase === 'Ready', 'word charges the separate breath attack');
}
async function acquireBreath(id) {
  const start = await snapshot();
  return trackUntil(id, s => (s.breathLockedCount !== undefined ? s.breathLockedCount > 0 : s.elapsed - start.elapsed >= 1.2), 'sustained visible breath tracking');
}
async function runCase(name, operation) {
  if (performanceOnly && name !== 'natural-flight-performance') return;
  currentCase = name;
  const entry = { name, startedAt: new Date().toISOString(), result: 'RUNNING' };
  report.cases.push(entry); console.log(`Dogfight verification: ${name}`);
  try { entry.evidence = await operation(); entry.result = 'PASS'; }
  catch (error) {
    entry.result = 'FAIL'; entry.failure = String(error.stack || error);
    try { await capture(`FAIL-${name}`); } catch (captureError) { entry.captureFailure = String(captureError); }
    console.error(`${name}: ${error.message}`);
  } finally { await releaseInputs(); entry.finishedAt = new Date().toISOString(); await saveReport(); }
}

try {
  await saveReport();
  reportTimer = setInterval(() => { saveReport().catch(error => console.error(`Report checkpoint failed: ${error.message}`)); }, 2000);
  reportTimer.unref();
  report.head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
  for (const relative of ['unity/SpaceDragon/Builds/DogfightWeb/build-receipt.json',
    'unity/SpaceDragon/Assets/SpaceDragon/Runtime/Dogfight/DogfightEncounter.cs',
    'unity/SpaceDragon/Assets/SpaceDragon/Runtime/Dogfight/FlightState.cs',
    'unity/SpaceDragon/Assets/SpaceDragon/Runtime/Dogfight/WingPropulsion.cs',
    'unity/SpaceDragon/Assets/SpaceDragon/Runtime/Dogfight/ShipWeaponsVfx.cs',
    'unity/SpaceDragon/Assets/SpaceDragon/Runtime/Dogfight/WingLaserQuery.cs',
    'unity/SpaceDragon/Assets/SpaceDragon/Runtime/Dogfight/SpacecraftWing.shader',
    'unity/SpaceDragon/Assets/SpaceDragon/Runtime/Dogfight/WeaponEnergy.shader',
    'assets/source/environments/near-orbit-nasa-v001/provenance.json',
    'unity/SpaceDragon/Assets/SpaceDragon/Runtime/Dogfight/TacticalState.cs',
    'unity/SpaceDragon/Assets/SpaceDragon/Runtime/Dogfight/HomingMissile.cs', 'tools/unity/verify-dogfight.mjs']) {
    const bytes = await artifact(relative);
    if (relative.endsWith('build-receipt.json')) report.buildReceipt = JSON.parse(bytes);
  }
  const requested = process.env.SPACE_DRAGON_DOGFIGHT_ASSET;
  assert(!requested || ['heroic-v005', 'violet-v007', 'oscar-v001'].includes(requested), 'Unknown selected Dogfight asset.');
  const intakeRoot = 'unity/SpaceDragon/Assets/SpaceDragon/Dogfight/';
  const organicAvailable = await stat(path.join(repo, intakeRoot, 'asset-receipt-v004.json')).then(info => info.isFile()).catch(error => {
    if (error.code === 'ENOENT') return false; throw error;
  });
  const oscarAvailable = await stat(path.join(repo, intakeRoot, 'asset-receipt-v005.json')).then(info => info.isFile()).catch(error => {
    if (error.code === 'ENOENT') return false; throw error;
  });
  const oscar = requested === 'oscar-v001' || (!requested && oscarAvailable);
  const organic = requested === 'violet-v007' || (!requested && !oscar && organicAvailable);
  report.selectedAsset = {version: oscar ? 'oscar-v001' : organic ? 'violet-v007' : 'heroic-v005', organic, oscar,
    selection: requested || 'new prepared Oscar intake, then organic, then preserved heroic rollback'};
  report.intakeVerification = JSON.parse(execFileSync(process.execPath,
    [path.join(repo, 'tools/unity', oscar ? 'prepare-oscar-dragon.mjs' : organic ? 'prepare-violet-dragon.mjs' : 'prepare-heroic-dragon.mjs'), '--verify'],
    {cwd: repo, encoding: 'utf8', maxBuffer: 4*1024*1024}).trim());
  report.modelContract = JSON.parse(await artifact(intakeRoot + (oscar ? 'oscar-contract-v001.json' : organic ? 'violet-contract-v007.json' : 'heroic-contract-v005.json')));
  report.intakeReceipt = JSON.parse(await artifact(intakeRoot + (oscar ? 'asset-receipt-v005.json' : organic ? 'asset-receipt-v004.json' : 'asset-receipt-v003.json')));
  if (oscar) report.fullSkinMetadata = JSON.parse(await artifact(intakeRoot + report.modelContract.skinRestoration.metadata));
  if (oscar && (report.buildReceipt.textureMode === 'bc7' || report.buildReceipt.mechanicalAccessoriesSha256)) {
    report.setupReceipt = JSON.parse(await artifact('unity/SpaceDragon/Builds/dogfight-setup-receipt.json'));
    await artifact('unity/SpaceDragon/Assets/SpaceDragon/Editor/Dogfight/OscarCompressedTextures.cs');
    assert.equal(report.setupReceipt.sourceSha256, report.modelContract.sha256);
    assert.equal(report.setupReceipt.textureMode, report.buildReceipt.textureMode);
    if (report.buildReceipt.textureMode === 'bc7') assert(report.setupReceipt.compressedTextures.uniqueTextures > 0, 'Measured texture derivative receipt is required.');
  }
  if (oscar && report.buildReceipt.mechanicalAccessoriesSha256) {
    report.mechanicalContract = JSON.parse(await artifact(intakeRoot + 'oscar-mechanical-contract-v004.json'));
    report.mechanicalIntake = JSON.parse(execFileSync(process.execPath,[path.join(repo,'tools/unity/prepare-oscar-mechanical.mjs'),'--verify'],{cwd:repo,encoding:'utf8'}).trim());
    assert.equal(report.mechanicalContract.sha256, report.buildReceipt.mechanicalAccessoriesSha256);
    assert.equal(report.setupReceipt.mechanicalAccessories.sourceSha256, report.mechanicalContract.sha256);
    assert.equal(report.setupReceipt.mechanicalAccessories.triangles, report.mechanicalContract.triangles);
    assert.equal(report.setupReceipt.presentationVersion, report.buildReceipt.presentationVersion);
  }
  assert.equal(report.intakeReceipt.schemaVersion, oscar ? 5 : organic ? 4 : 3);
  assert.equal(report.buildReceipt.result, 'Succeeded', 'A completed player build is required.');
  assert.equal(report.buildReceipt.sourceSha256, report.modelContract.sha256, 'The build must use the selected measured model.');
  assert.equal(report.buildReceipt.dragonVersion || 'heroic-v005', report.selectedAsset.version);
  const served = await fetch(new URL('build-receipt.json', url));
  assert(served.ok, 'The local player server must expose its build receipt.');
  report.servedBuildReceipt = JSON.parse(await served.text());
  assert.deepEqual(report.servedBuildReceipt, report.buildReceipt, 'The server must serve this exact local build.');
  assert.equal(report.buildReceipt.developmentBuild, true, 'Condition fixtures require a fresh development review build.');
  // Installed Chrome, normal GPU path. No SwiftShader, disable-GPU or clock override.
  browser = await chromium.launch({ channel: 'chrome', headless: true,
    args: forceWebGL2 ? ['--disable-features=WebGPUService'] : [] });
  report.browser = browser.version();
  context = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  page.on('pageerror', error => report.pageErrors.push({ case: currentCase, text: error.message }));
  page.on('console', message => {
    const entry = { case: currentCase, type: message.type(), text: message.text(), location: message.location() };
    if (report.console.length < 500) report.console.push(entry); else report.consoleTruncated = (report.consoleTruncated || 0) + 1;
    if (message.type() === 'error') report.consoleErrors.push(entry);
  });
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== url.origin) report.externalRequests.push(request.url());
  });
  page.on('requestfailed', request => report.requestFailures.push({ case: currentCase, url: request.url(), failure: request.failure() }));
  page.on('requestfinished', request => networkTasks.push((async () => {
    try {
      const response = await request.response(); const sizes = await request.sizes();
      report.transfers.push({ case: currentCase, url: request.url(), status: response?.status(), encoding: await response?.headerValue('content-encoding') || 'identity', ...sizes });
    } catch (error) { report.transfers.push({ url: request.url(), error: String(error) }); }
  })()));
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 180000 });
  report.initial = await waitState(s => s.scene === 'Unity Dogfight' && s.frameSamples > 2, 'Unity player and snapshot bridge ready', 240000, true);
  if (baselineMode) {
    report.beforeBaselineFixture = report.initial;
    await fixture('upgrades:off');
    report.initial = await waitState(s => !s.dead && !s.paused && s.hull === 100 && s.kills === 0 && s.rolls === 0,
      'explicit all-flags-off baseline startup', 30000, true);
    assertBaselineFlags(report.initial);
  }
  assert.equal(report.initial.authoredClips, true, 'Imported authored flight clips must be connected.');
  assert.equal(report.initial.organicRig, organic, 'The actual player must select the expected rig adapter.');
  assert.equal(report.initial.modelName, oscar ? 'DragonOscar.v001.Authored' : organic ? 'DragonViolet.v007.Organic' : 'DragonHeroic.v005.Authored');
  if (oscar) {
    assert.equal(report.initial.rigProfile, 'oscar-creativo-flight', 'The selected model must use its measured full-TRS adapter.');
    assert.equal(report.initial.spacecraft,true,'The selected Oscar player uses the ship presentation.');
    assert.equal(report.initial.wingMaterialCount,2,'Both main wings have metallic material instances.');
    assert(report.initial.propulsionTriangles>0&&report.initial.propulsionLevel>0,'Wing engine geometry and active propulsion must be present.');
    assert(distance(report.initial.laserLeft,report.initial.laserRight)>2,'Laser mounts must be separate on the wings.');
  }
  if (oscar) {
    const addonEvidence = report.buildReceipt.mechanicalAccessoriesSha256 ? report.setupReceipt.mechanicalAccessories : null;
    assert.equal(report.initial.skinWeightsStatus, 'READABLE_FULL_WEIGHT_DATA', 'The built player must expose actual retained mesh weights.');
    assert.equal(report.initial.maxMeshInfluences, report.modelContract.maxInfluencesPerVertex);
    assert.equal(report.initial.skinnedMeshCount, report.fullSkinMetadata.meshes.length + (addonEvidence?.renderers || 0));
    assert.equal(report.initial.totalPositiveInfluences, report.fullSkinMetadata.meshes.reduce((sum, mesh) => sum + mesh.weights.count, 0)
      + (addonEvidence?.positiveInfluences || 0));
    assert.equal(report.initial.runtimeQualitySkinWeights, 'Unlimited');
    assert.equal(report.initial.allRendererQualityAuto, true);
    assert.equal(report.initial.unreadableSkinMeshes, 0);
    if (report.buildReceipt.textureMode === 'bc7') {
      const expectedTextures = report.setupReceipt.compressedTextures.uniqueTextures;
      assert.equal(report.initial.textureMode, 'bc7');
      assert.equal(report.initial.supportsBc7, true, 'This target renderer must actually support the selected compression format.');
      assert.equal(report.initial.modelTextureCount, expectedTextures);
      assert.equal(report.initial.modelBc7TextureCount, expectedTextures);
      assert.equal(report.initial.modelOtherTextureCount, 0, 'The loaded model must not retain the uncompressed source textures.');
      assert.equal(report.initial.modelTexturesReadableCount, 0, 'Game textures should release their CPU-readable copy.');
      assert(Array.isArray(report.initial.modelTextureFormats) && report.initial.modelTextureFormats.length > 0);
      assert(Number.isFinite(report.initial.modelTextureAllocatedBytes) && report.initial.modelTextureAllocatedBytes >= 0);
    }
  }
  assert.equal(report.initial.muzzleAttached, true, 'The actual imported mouth socket must be connected.');
  if (organic || oscar) assert.equal(report.initial.addedArmorTriangles, 0, 'Do not add the legacy procedural overlay; imported fitted accessories are measured separately.');
  assert.match(report.initial.audio || '', /Five layered licensed Sonniss v002 cues/,
    'All five upgraded recorded cues must be bound in the actual player. This does not establish human mix quality.');
  if (forceWebGL2) assert.equal(report.initial.graphics, 'OpenGLES3', 'The explicit WebGL2 verification must use the OpenGLES3 backend.');
  report.renderer = { graphics: report.initial.graphics, device: report.initial.device,
    softwareReported: /swiftshader|llvmpipe|software rasterizer/i.test(report.initial.device || '') };
  if (report.renderer.softwareReported) report.limitations.push('The runtime reports a software renderer; these samples cannot establish hardware-GPU performance.');
  await page.locator('#unity-canvas').focus();
  await page.evaluate(() => localStorage.setItem('dogfight-verification-sentinel', 'retain'));
  const storageBefore = await page.evaluate(() => ({ ...localStorage }));

  await runCase('natural-flight-performance', async () => {
    await restart(null);
    // No mouse movement before this assertion: an initial cursor at a canvas edge
    // must not silently engage mouse flight and spin the dragon on load/restart.
    const steadyCruise = await waitSim(2);
    assert(distance(steadyCruise.forward, { x: 0, y: 0, z: 1 }) <= .03,
      `Neutral startup must keep +Z forward; observed ${JSON.stringify(steadyCruise.forward)}.`);
    assert(Number.isFinite(steadyCruise.cameraTrailingDistance) && Math.abs(steadyCruise.cameraTrailingDistance - 8) <= .2,
      `Steady-cruise camera must trail by 8 ± 0.2 m; observed ${steadyCruise.cameraTrailingDistance}.`);
    await fixture('resetPerf');
    const before = await snapshot(); assert.equal(before.fixture, false);
    const wallStart = performance.now();
    await page.keyboard.down('ArrowRight'); await delay(10000); await page.keyboard.up('ArrowRight');
    const after = await snapshot();
    const sample = { kind: 'natural encounter; no quiet target or damage fixture', wallMs: performance.now() - wallStart,
      simulationSeconds: after.elapsed - before.elapsed, validFlightSample: !after.dead, steadyCruise, before, after };
    report.samples.push(sample);
    if (after.dead) report.limitations.push('Natural encounter sampling reached a loss; that sample includes the loss presentation and is not a complete live-flight performance benchmark.');
    assert(after.frameSamples >= 30, 'At least 30 observed frames are required to report a short sample.');
    assert(Number.isFinite(after.frameMeanMs) && after.frameMeanMs > 0 && Number.isFinite(after.frameP95Ms) && after.frameP95Ms > 0);
    sample.measured = {meanFrameMs: after.frameMeanMs, p95FrameMs: after.frameP95Ms, observedFrames: after.frameSamples,
      approximateFps: 1000 / after.frameMeanMs, drawCallsLastFrame: after.drawCalls, trianglesLastFrame: after.renderTriangles,
      textureAllocatedMiB: after.textureAllocatedMiB, selectedModelTriangles: (report.modelContract.instanceTriangles || report.modelContract.triangles)
        + (report.mechanicalContract?.triangles || 0), propulsionTriangles:after.propulsionTriangles};
    if (!(after.drawCalls > 0 && after.renderTriangles > 0)) report.limitations.push('Render draw/triangle counters unavailable or zero in the observed frame; no invented renderer-cost measurement.');
    if (!(after.textureAllocatedMiB > 0)) report.limitations.push('Runtime texture allocation was unavailable in this sample.');
    const knownModelMiB=(report.setupReceipt?.compressedTextures?.compressedPayloadBytes||0)/1048576;
    if(after.textureAllocatedMiB<knownModelMiB){
      sample.measured.textureAllocationReliable=false;
      report.limitations.push('Unity texture allocation underreports this backend: its total is below the known loaded model BC7 payload. Do not treat it as GPU texture memory. Use WebGL2 allocation and analytical asset payload separately.');
    }else sample.measured.textureAllocationReliable=true;
    await capture('natural-flight'); return sample;
  });

  await runCase('flight-controls-mouse-modes-evasion-and-pause', async () => {
    await restart(); const initial = await snapshot();
    if (initial.mouseAim) await tap('m');
    await tap('x'); const before = await snapshot();
    await page.keyboard.down('ArrowRight'); const arrow = await waitState(s => distance(s.forward, before.forward) > .12, 'arrow steering'); await page.keyboard.up('ArrowRight');
    await tap('m'); await waitState(s => s.mouseAim, 'M selects mouse aiming'); await waitSim(1);
    const aimBefore = await snapshot(); await page.mouse.move(1050, 270); const aimAfter = await waitSim(.5);
    assert(distance(aimBefore.forward, aimAfter.forward) < .05, 'Mouse-only aiming must preserve neutral flight direction.');
    await tap('m'); await waitState(s => !s.mouseAim, 'M selects mouse flight');
    await page.mouse.move(350, 300); const mouse = await waitState(s => distance(s.forward, aimAfter.forward) > .08, 'mouse steering');
    await tap('x'); await tap('m'); await waitState(s => s.mouseAim, 'return to independent mouse aim');
    await waitSim(.5); const zoomBefore = await snapshot(); await page.mouse.down({ button: 'right' });
    const zoom = await waitState(s => s.fov < zoomBefore.fov - 5, 'held right-button zoom'); await page.mouse.up({ button: 'right' });
    const boostBefore = await snapshot(); await page.keyboard.down('Shift');
    const boost = await waitState(s => s.boosting && s.speed > boostBefore.speed + 10 && s.boostEnergy < boostBefore.boostEnergy, 'finite-energy boost'); await page.keyboard.up('Shift');
    await tap('q'); const roll = await waitState(s => s.rolls >= 1 && s.evasion < 95, 'left barrel roll spends energy');
    await capture('roll-left-entry');await waitSim(.35);await capture('roll-left-mid');
    await waitSim(1.6);const turnBefore=await snapshot();
    await page.keyboard.down('ArrowRight');await page.keyboard.down('b');
    const hardBreak=await waitState(s=>s.breakActive&&s.breaks>=1&&s.yawRate>2.5&&s.elapsed-turnBefore.elapsed>.4,'held B tightens live steering');
    assert(hardBreak.speed<turnBefore.speed&&hardBreak.evasion<turnBefore.evasion,'Held turn brakes and drains evasion energy.');
    await capture('held-evasive-turn');
    await page.keyboard.up('b');await page.keyboard.up('ArrowRight');
    await waitState(s=>!s.breakActive,'release B ends the powered turn');
    await waitState(s=>s.evasion>=50&&!s.breakActive,'energy recharges for the opposite roll');await tap('e'); const otherRoll = await waitState(s => s.rolls >= 2, 'right barrel roll');
    await tap('Escape'); const paused = await waitState(s => s.paused, 'Escape pauses');
    await page.keyboard.down('ArrowUp'); await delay(600); const still = await snapshot(); await page.keyboard.up('ArrowUp');
    assert.equal(still.elapsed, paused.elapsed); assert(distance(still.position, paused.position) < .001);
    await tap('Escape'); await waitState(s => !s.paused, 'Escape resumes'); await releaseInputs();
    await waitState(s=>s.evasion>=50&&s.rollAngle===0,'energy recharges before the held-turn pause check');
    await page.keyboard.down('ArrowLeft');await page.keyboard.down('b');
    await waitState(s=>s.breakActive,'new held turn before pause');
    await tap('Escape');const pausedTurn=await waitState(s=>s.paused&&!s.breakActive,'pause cancels the held turn');
    await tap('Escape');await waitState(s=>!s.paused,'resume with B still physically held');
    const heldAfterResume=await waitSim(.4);assert.equal(heldAfterResume.breakActive,false,'B must be released before rearming after pause.');
    await releaseInputs();await waitSim(.2);
    await capture('flight-controls'); return { before, arrow, aimBefore, aimAfter, mouse, zoom, boost, roll, hardBreak, otherRoll, paused, still, pausedTurn, heldAfterResume };
  });

  await runCase('invalid-launch-does-not-spend', async () => {
    await restart(); const before = await snapshot(); await tap('Enter');
    const after = await waitState(s => s.rejectedLaunches > before.rejectedLaunches, 'deliberate invalid launch rejected');
    assert.equal(after.missileCharges, 2); assert.equal(after.missilesLaunched, 0); return { before, after };
  });

  await runCase('missiles-plasma-kill-salvage-and-sequential-recharge', async () => {
    await restart('target'); const id = (await snapshot()).enemies[0].id;
    const locked = await trackUntil(id, s => s.lockState === 'Locked' && s.lockedTarget === id, 'confirmed missile lock');
    await capture('missile-lock'); await tap('Enter');
    const firstLaunch = await waitState(s => s.missilesLaunched === 1 && s.missileCharges === 1, 'Enter launches one missile');
    const firstHit = await waitState(s => s.missileHits >= 1, 'missile intersects a live target');
    assert(firstHit.enemies.find(e => e.id === id).health < locked.enemies.find(e => e.id === id).health);
    await aimAt(id); await page.mouse.down({ button: 'left' });
    let plasma;
    try { plasma = await trackUntil(id, s => s.ordinaryHits > firstHit.ordinaryHits, 'ordinary plasma follows the independent target'); }
    finally { await page.mouse.up({ button: 'left' }); }
    if(plasma.spacecraft){
      assert(plasma.laserBeamsFired>=2&&plasma.laserBeamsFired===plasma.shotsFired*2,'Every volley fires two wing lasers.');
      assert.equal(plasma.playerBoltsActive,0,'Instant primary fire has no travelling player bolts.');
      assert.equal(plasma.lastLaserFiredAt,plasma.lastLaserResolvedAt,'Both rays resolve in the firing simulation tick.');
      assert(plasma.lastLaserLeftHit&&plasma.lastLaserRightHit,'Both wing rays hit the currently aimed target.');
      for(const side of ['Left','Right'])assert(distance(plasma[`lastLaser${side}Origin`],plasma[`lastLaser${side}Socket`])<.02,'Laser origin must use its named wing socket.');
      await aimAt(id);await page.mouse.down({button:'left'});
      try {
        const live=await waitState(s=>s.lasersActive,'visible laser pulse');
        assert(distance(live.laserVisualLeft,live.laserLeft)<.02&&distance(live.laserVisualRight,live.laserRight)<.02,'Both actual rendered pulses must start at their live wing attachments.');
        await capture('twin-wing-lasers');
      }finally{await page.mouse.up({button:'left'});}
    }else{mouthCheck(plasma,'plasma');await captureMouth('ordinary-fire-mouth');}
    await trackUntil(id, s => s.lockState === 'Locked' && s.lockedTarget === id, 'reconfirm second deliberate launch');
    await page.mouse.down({ button: 'middle' }); await delay(100); await page.mouse.up({ button: 'middle' });
    const spent = await waitState(s => s.missilesLaunched === 2 && s.missileCharges === 0, 'middle button spends the second charge');
    await waitState(s => s.missileHits >= 2, 'second missile impact');
    if (!(await snapshot()).enemies.find(e => e.id === id).dead) {
      await aimAt(id); await page.mouse.down({ button: 'left' });
      try { await waitState(s => s.enemies.find(e => e.id === id).dead, 'finish damaged bogey with ordinary fire'); }
      finally { await page.mouse.up({ button: 'left' }); }
    }
    const destroyed = await waitState(s => s.kills === 1 && s.debris.some(d => d.id === id), 'one component from the destroyed bogey');
    assert.equal(destroyed.debris.length, 1);
    const recovered = await waitState(s => s.pickups === 1 && s.salvage === 2, 'fly through the forgiving salvage pickup radius');
    assert(!recovered.debris.some(d => d.id === id)); await capture('salvage-recovered');
    const chargeOne = await waitState(s => s.missileCharges === 1, 'first sequential recharge', 120000);
    assert(chargeOne.rechargeProgress < .08);
    const chargeTwo = await waitState(s => s.missileCharges === 2, 'second sequential recharge', 120000);
    assert(chargeTwo.elapsed - chargeOne.elapsed >= 14.4, 'Charges must regenerate sequentially, not together.');
    assert.equal(chargeTwo.rechargeProgress, 0);
    return { locked, firstLaunch, firstHit, plasma, spent, destroyed, recovered, chargeOne, chargeTwo };
  });

  await runCase('localized-warnings-and-maneuvering-repair', async () => {
    await restart('target'); const id = (await snapshot()).enemies[0].id;
    await fixture('damage:1'); const caution = await waitState(s => s.propulsion === 45 && s.warning === 'Caution', 'localized propulsion caution');
    await fixture('damage:1'); const critical = await waitState(s => s.propulsion === 0 && s.warning === 'Critical', 'escalating critical-system warning');
    assert.equal(critical.weapons, 100); assert(Math.abs(critical.hull - 61.5) < .01); await capture('critical-propulsion');
    await trackUntil(id, s => s.lockState === 'Locked', 'valid target before repair');
    const started = await startRepair(1); assert.equal(started.salvage, 1); assert.equal(started.repairsRemaining, 3);
    await waitSim(.2); await tap('Enter'); const refused = await waitState(s => s.rejectedLaunches > 0, 'missile attempt is rejected during repair');
    await page.keyboard.down('ArrowRight'); await page.keyboard.down('Shift');
    const during = await waitState(s => s.repairing && s.repairProgress >= .25, 'visible drone repair progress');
    assert.equal(during.boosting, false); assert.equal(during.missileCharges, 2); assert.equal(during.salvage, 1);
    assert(distance(during.position, started.position) > 5); assert(during.drones > 0, 'Visible maintenance drones accompany repair.');
    await capture('repair-in-progress');
    await page.keyboard.up('Shift'); await page.keyboard.up('ArrowRight');
    const completed = await waitState(s => s.repairsCompleted === 1 && !s.repairing, 'four-second repair completes', 90000);
    assert.equal(completed.propulsion, 35); assert.equal(completed.repairsRemaining, 2); assert.equal(completed.salvage, 0);
    assert(completed.patches >= 1); assert(completed.elapsed - started.elapsed >= 3.6);
    await capture('repaired-patchwork'); return { caution, critical, started, refused, during, completed };
  });

  await runCase('projectile-interrupt-retains-repair-resources', async () => {
    await restart('target'); await fixture('damage:0');
    const started = await startRepair(0); await fixture('interrupt:0');
    const interrupted = await waitState(s => !s.repairing && s.repairsInterrupted === 1 && s.damageHits > started.damageHits, 'real projectile interrupts repair', 90000);
    assert.equal(interrupted.repairsCompleted, 0); assert.equal(interrupted.repairsRemaining, 3); assert.equal(interrupted.salvage, 1);
    assert.equal(interrupted.patches, 0); assert(interrupted.hull < started.hull);
    await capture('repair-interrupted'); return { started, interrupted };
  });

  await runCase('three-repair-limit-survives-extra-salvage', async () => {
    await restart('target'); await fixture('supply'); const completions = [];
    for (let system = 0; system < 3; system++) {
      await fixture(`damage:${system}`); await startRepair(system);
      completions.push(await waitState(s => s.repairsCompleted === system + 1 && !s.repairing, `repair activation ${system + 1}`, 90000));
    }
    const exhausted = await snapshot(); assert.equal(exhausted.repairsRemaining, 0); assert.equal(exhausted.salvage, 0);
    await fixture('supply'); const refused = await startRepair(1, false); assert.equal(refused.salvage, 3);
    const later = await waitSim(4.3); assert.equal(later.repairsCompleted, 3); assert.equal(later.repairsRemaining, 0); assert.equal(later.salvage, 3);
    await capture('repair-limit'); return { completions, exhausted, refused, later };
  });

  await runCase('incoming-missile-warning-and-roll-evasion', async () => {
    await restart(); await fixture('incoming');
    const incoming = await waitState(s => s.warning === 'IncomingMissile' && s.missilesActive > 0, 'distinct incoming missile warning');
    assert.equal(incoming.breathPhase, 'Charging', 'A pending word must not freeze the incoming threat.');
    await tap('q');
    const evaded = await waitState(s => s.rolls === 1 && s.warning !== 'IncomingMissile', 'roll breaks hostile seeker tracking');
    assert(evaded.evasion < incoming.evasion); await capture('missile-evasion'); return { incoming, evaded };
  });

  await runCase('live-spelling-windup-roar-and-fire-beam', async () => {
    await restart('target'); await send('SetSoundEnabled', 'true');
    const before = await snapshot(); const id = before.enemies[0].id;
    await page.keyboard.down('ArrowRight'); await tap(before.word[0].toLowerCase());
    const flying = await waitState(s => s.letterIndex === 1 && s.elapsed - before.elapsed >= .5, 'flight remains live during spelling');
    await page.keyboard.up('ArrowRight'); assert(distance(flying.position, before.position) > 5); assert.equal(flying.paused, false);
    const ready = await spellCurrentWord(); await acquireBreath(id); await waitSim(.1); await tap('Space');
    const windup = await waitState(s => s.breathsFired === 1 && s.breathPhase === 'Burst' && s.windupActive && s.breathStage === 'windup', 'Space initiates the authored breath timeline');
    // Observe both short-lived stages before any potentially blocking screenshot.
    // Slow capture must not make a resolved attack look like a missing beam.
    mouthCheck(windup, 'windup');
    const windupCapture=await captureMouth('breath-windup-mouth',windup);
    const beam = await waitState(s => s.beam && s.breathPhase === 'Burst', 'windup transitions into visible fire beam');
    mouthCheck(beam, 'beam');
    const attackCapture = await captureMouth('breath-attack-mouth', beam);
    const impact = await waitState(s => s.breathsResolved === 1 && s.kills === 1 && s.breathPhase === 'Charging', 'one breath resolves one target and starts the next word');
    assert.equal(impact.breathsFired, 1); assert.equal(impact.letterIndex, 0); assert.notEqual(impact.word, before.word);
    assert.equal(impact.missilesLaunched, 0); assert.equal(impact.missileCharges, 2);
    assert(distance(impact.position, windup.position) > 5); return { before, flying, ready, windup, windupCapture, beam, attackCapture, impact };
  });

  await runCase('full-inventory-leaves-recoverable-salvage', async () => {
    await restart('target'); await fixture('supply'); const id = (await snapshot()).enemies[0].id;
    await spellCurrentWord(); await acquireBreath(id); await tap('Space');
    await waitState(s => s.kills === 1 && s.debris.some(d => d.id === id), 'destroyed bogey drops a component');
    const full = await waitState(s => s.debris.some(d => d.id === id && d.distance < 18) && /Salvage full/i.test(s.toast), 'full-inventory pickup notice');
    assert.equal(full.salvage, 3); assert.equal(full.pickups, 0); assert.equal(full.repairsRemaining, 3);
    assert(full.debris.some(d => d.id === id)); await capture('salvage-full'); return full;
  });

  await runCase('environment-collision-loss-and-complete-restart', async () => {
    await restart(); const before = await snapshot(); await fixture('crash');
    const collision = await waitState(s => s.collisionHits > before.collisionHits, 'actual rock collider hit', 30000, true);
    assert(collision.hull < before.hull, 'A physical asteroid collision damages the hull.');
    await capture('asteroid-collision');
    // Cruise-speed contacts can deflect safely. Arrange a separate fatal hull hit to
    // verify loss/recovery without misreporting a harmless graze as a fatal crash.
    const lossCondition = collision.dead ? 'observed collider impact was fatal' : 'explicit fatal-damage fixture after a separately observed collider impact';
    if (!collision.dead) await fixture('disable');
    const lost = await waitState(s => s.dead && s.hull === 0 && s.collisionHits > 0, 'disabled encounter', 30000, true);
    assert.equal(lost.propulsionLevel,0,'Destroyed ship engines shut down.');assert.equal(lost.lasersActive,false);assert.equal(lost.beam,false);
    assert.equal(lost.repairing, false); await capture('dragon-disabled');
    await page.keyboard.down('Tab'); await tap('1'); await page.keyboard.up('Tab'); await tap('Enter'); await delay(400);
    const stillDisabled = await snapshot(); assert.equal(stillDisabled.hull, 0);
    assert.equal(stillDisabled.salvage, lost.salvage); assert.equal(stillDisabled.repairsRemaining, lost.repairsRemaining);
    assert.equal(stillDisabled.missilesLaunched, lost.missilesLaunched);
    const recovered = await restart('quiet');
    if(recovered.spacecraft)assert(recovered.propulsionLevel>0,'Restart restores wing propulsion.');
    assert.equal(recovered.repairsCompleted, 0); assert.equal(recovered.repairsInterrupted, 0); assert.equal(recovered.patches, 0);
    assert.equal(recovered.pickups, 0); assert.equal(recovered.breathsFired, 0); assert.equal(recovered.missilesActive, 0);
    await capture('restart-restored'); return { before, collision, lossCondition, lost, stillDisabled, recovered };
  });

  const storageAfter = await page.evaluate(() => ({ ...localStorage }));
  report.storage = { before: storageBefore, after: storageAfter, unchanged: JSON.stringify(storageBefore) === JSON.stringify(storageAfter), scope: 'Isolated verification browser context localStorage; does not inspect unrelated origins or establish all persistence behavior.' };
  assert.deepEqual(storageAfter, storageBefore, 'The encounter must preserve existing localStorage entries.');
  report.final = await snapshot();
} catch (error) {
  report.fatal = String(error.stack || error); console.error(error);
} finally {
  clearInterval(reportTimer);
  try { await releaseInputs(); } catch { /* The page may already have failed. */ }
  await Promise.allSettled(networkTasks);
  report.finishedAt = new Date().toISOString();
  report.result = !report.fatal && report.cases.length === (performanceOnly ? 1 : 11) && report.cases.every(entry => entry.result === 'PASS') &&
    report.pageErrors.length === 0 && report.consoleErrors.length === 0 && report.externalRequests.length === 0 && report.requestFailures.length === 0 ? 'PASS' : 'FAIL';
  await saveReport();
  if (browser) await browser.close();
  console.log(`Dogfight verification ${report.result}: ${path.join(runOutput, 'report.json')}`);
  if (report.result !== 'PASS') process.exitCode = 1;
}
