// SD-090 observed combat checks. Start the freshly built development player separately.
// Fixtures arrange initial conditions only; keyboard/mouse and the production simulation
// must resolve every reward, hit, lock, repair, defeat and recovery asserted below.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const url = new URL(process.env.SPACE_DRAGON_DOGFIGHT_URL || 'http://127.0.0.1:5207/space-dragon-dogfight/');
assert(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Only a local Dogfight player may be tested.');
assert(['http:', 'https:'].includes(url.protocol), 'Serve the built player over HTTP.');
const output = path.resolve(process.argv[2] || path.join(repo, 'artifacts/unity/combat-upgrades'));
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const runOutput = path.join(output, 'runs', runId);
const forceWebGL2 = process.env.SPACE_DRAGON_DOGFIGHT_WEBGL2 === '1';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const living = state => state.enemies.filter(enemy => !enemy.dead);
const enemyAt = (state, id) => state.enemies.find(enemy => enemy.id === id);
const inputs = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', 'Tab', 'Enter', 'Space', 'Escape', 'F1',
  ...'abcdefghijklmnopqrstuvwxyz', ...'0123456789'];
const flagNames = ['perfectRoll', 'enemyRoles', 'clawFinisher', 'wingman', 'rockWeapons', 'multiTargetBreath', 'repairCode', 'comeback', 'independentBank'];
const report = {
  runId, startedAt: new Date().toISOString(), url: url.href, viewport: [1366, 768], forceWebGL2,
  command: process.argv.join(' '), result: 'RUNNING',
  scope: 'Installed Chrome with normal GPU configuration, real Unity Web player and browser input. Named development fixtures arrange threats, wounded/shielded targets, damaged systems, gas/scenery and a zero-hull hit; no reward, lock, timer or completion counter is set by this verifier.',
  baselineScope: 'The unchanged 11-case verify-dogfight.mjs suite with all upgrade flags disabled is a separate required run. This suite does not replace that regression evidence.',
  limitations: ['Human difficulty, fun, comfort, sound audibility/mix and family usability are NOT TESTED.',
    'Screenshots are captured evidence requiring visual review, not an automatic art approval.',
    'Condition-fixture encounters are not natural-flight performance measurements; use the separate baseline/natural sampler.',
    'Development fixtures are intentional and do not establish that a release build excludes them.',
    'Keyboard automation and headless installed Chrome do not establish controller, touch or physical-device comfort.'],
  cases: [], fixtures: [], trace: [], screenshots: [], artifacts: [], console: [], consoleErrors: [], pageErrors: [],
  externalRequests: [], requestFailures: [], transfers: [],
};
let browser, context, page, reportTimer, currentCase = 'startup', reportWrite = Promise.resolve();
const networkTasks = [];
const cases = [];
function test(name, operation) { cases.push({ name, operation }); }
async function artifact(relative) {
  const bytes = await readFile(path.join(repo, relative));
  report.artifacts.push({ path: relative, bytes: bytes.length, sha256: sha(bytes) });
  return bytes;
}
async function saveReport() {
  const body = JSON.stringify(report, null, 2);
  reportWrite = reportWrite.catch(() => {}).then(async () => {
    await writeFile(path.join(runOutput, 'report.json'), body);
    await writeFile(path.join(output, 'report.json'), body);
  });
  return reportWrite;
}
function checkRuntime() {
  const error = report.pageErrors[0] || report.consoleErrors.find(item =>
    /\babort(?:ed)?\b|was not exported|RuntimeError:|unreachable|out of memory/i.test(item.text));
  if (error) throw new Error(`Unity/browser runtime failed: ${error.text}`);
}
async function send(method, arg) {
  return page.evaluate(({ method, arg }) => {
    const api = window.__SPACE_DRAGON_DOGFIGHT__;
    if (!api?.instance) throw new Error('Unity bridge is not ready.');
    return api.send(method, arg);
  }, { method, arg });
}
async function snapshot() {
  checkRuntime();
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
    paused: state.paused, dead: state.dead, hull: state.hull, evasion: state.evasion, boostEnergy: state.boostEnergy,
    perfectRolls: state.perfectRolls, slowRemaining: state.slowRemaining, rolls: state.rolls, finishers: state.finishers,
    freezeRemaining: state.freezeRemaining, wave: state.wave, kills: state.kills, wingmanRuns: state.wingmanRuns,
    wingmanRunning: state.wingmanRunning, wingmanCooldown: state.wingmanCooldown,
    rockShots: state.rockShots, gasDetonations: state.gasDetonations, breathPhase: state.breathPhase,
    breathLockedCount: state.breathLockedCount, breathsFired: state.breathsFired, breathsResolved: state.breathsResolved,
    repairing: state.repairing, repairProgress: state.repairProgress, repairCodeIndex: state.repairCodeIndex,
    repairBonus: state.repairBonus, comebackActive: state.comebackActive, comebackUsed: state.comebackUsed,
    comebackLetterIndex: state.comebackLetterIndex, comebackProtection: state.comebackProtection, qaCondition: state.qaCondition });
  return state;
}
async function waitState(predicate, label, timeout = 45000, allowDead = false) {
  const deadline = Date.now() + timeout;
  let state;
  while (Date.now() < deadline) {
    state = await snapshot();
    if (state?.scene && predicate(state)) return state;
    if (state?.dead && !allowDead) throw new Error(`${label}: dragon disabled unexpectedly.`);
    await delay(45);
  }
  throw new Error(`${label}: timed out. Last snapshot: ${JSON.stringify(state)}`);
}
async function waitSim(seconds, allowDead = false) {
  const before = await snapshot();
  assert(before && !before.paused, 'Simulation wait requires an unpaused player.');
  return waitState(state => state.elapsed - before.elapsed >= seconds, `${seconds}s of real simulation`,
    Math.max(20000, seconds * 5000 + 15000), allowDead);
}
async function releaseInputs() {
  if (!page || page.isClosed()) return;
  await page.evaluate(() => window.__verificationPad?.neutral());
  for (const key of inputs) await page.keyboard.up(key);
  for (const button of ['left', 'middle', 'right']) await page.mouse.up({ button });
}
async function tap(key) { await page.keyboard.press(key, { delay: 65 }); }
async function fixture(action) {
  report.fixtures.push({ case: currentCase, action, wallMs: Date.now(), kind: 'development initial-condition setup' });
  await send('QaFixture', action);
}
function assertFlags(state, enabled) {
  for (const name of flagNames) assert.match(state.combatFlags || '', new RegExp(`${name}=${enabled ? 'True' : 'False'}(?:;|$)`), name);
}
async function restart(condition = 'quiet', enabled = true) {
  await releaseInputs();
  await page.locator('#unity-canvas').focus();
  // Same browser operation prevents an exposed combat frame between reset and isolation.
  await page.evaluate(({ condition, enabled }) => {
    const api = window.__SPACE_DRAGON_DOGFIGHT__;
    api.send('SetReducedMotion', 'false');
    api.send('QaFixture', enabled ? 'upgrades:on' : 'upgrades:off');
    if (condition) api.send('QaFixture', condition);
    api.send('RequestSnapshot');
  }, { condition, enabled });
  report.fixtures.push({ case: currentCase, action: enabled ? 'upgrades:on' : 'upgrades:off', resetsEncounter: true, wallMs: Date.now() });
  if (condition) report.fixtures.push({ case: currentCase, action: condition, afterRestart: true, wallMs: Date.now() });
  const state = await waitState(s => !s.dead && !s.paused && s.hull === 100 && s.kills === 0 && s.rolls === 0 &&
    s.perfectRolls === 0 && s.finishers === 0 && s.wingmanRuns === 0, 'complete combat reset', 30000, true);
  assertFlags(state, enabled);
  await waitSim(.15); // Fresh neutral input arms existing combat controls.
  return snapshot();
}
async function capture(name) {
  const before = await snapshot();
  const file = path.join(runOutput, `${name}.png`);
  await page.locator('#unity-canvas').screenshot({ path: file, timeout: 15000 });
  const bytes = await readFile(file);
  await copyFile(file, path.join(output, `${name}.png`));
  const after = await snapshot();
  const evidence = { name, case: currentCase, path: path.relative(output, file).split(path.sep).join('/'),
    bytes: bytes.length, sha256: sha(bytes), snapshot: before, afterSnapshot: after,
    result: 'CAPTURED_REQUIRES_VISUAL_REVIEW', captureScope: 'Real canvas; surrounding snapshots bound the capture interval.' };
  report.screenshots.push(evidence);
  return evidence;
}
async function aimAt(id) {
  const state = await snapshot();
  const enemy = enemyAt(state, id);
  assert(enemy && !enemy.dead && enemy.screenZ > 0 && enemy.screenX > .02 && enemy.screenX < .98 &&
    enemy.screenY > .02 && enemy.screenY < .98, `Target ${id} must actually be on screen.`);
  const box = await page.locator('#unity-canvas').boundingBox();
  await page.mouse.move(box.x + enemy.screenX * box.width, box.y + enemy.screenY * box.height);
  return state;
}
async function trackUntil(id, predicate, label, timeout = 45000) {
  const deadline = Date.now() + timeout;
  let state;
  while (Date.now() < deadline) {
    state = await snapshot();
    if (predicate(state)) return state;
    assert(!state.dead, `${label}: dragon disabled.`);
    await aimAt(id);
    await delay(45);
  }
  throw new Error(`${label}: timed out at ${JSON.stringify(state)}`);
}
async function aimMode() {
  if (!(await snapshot()).mouseAim) await tap('m');
  await waitState(s => s.mouseAim, 'mouse target mode');
}
async function chargeAssisted() {
  await tap('F1');
  return waitState(s => s.breathPhase === 'Ready', 'F1 charges breath through the real assisted input');
}
async function breathAt(id) {
  await aimMode(); await chargeAssisted();
  await trackUntil(id, s => s.breathLockedCount >= 1, 'visible target acquires breath lock');
  const before = await snapshot(); await tap('Space');
  return waitState(s => s.breathsResolved === before.breathsResolved + 1, 'charged breath resolves', 45000);
}
async function startRepair(index) {
  await releaseInputs(); await waitSim(.15); await page.keyboard.down('Tab');
  try {
    await waitState(s => s.selector, 'held Tab displays repair selection');
    await tap(String(index + 1));
    return await waitState(s => s.repairing, 'selected field repair starts');
  } finally { await page.keyboard.up('Tab'); }
}

test('flags-off-boundary-and-sound-opt-in', async () => {
  const off = await restart('quiet', false);
  assert.equal(off.breathCapacity, 1); assert.equal(off.waveCount, 1);
  assert(living(off).every(enemy => enemy.role === 'Fighter'));
  await tap('t'); await tap('q');
  const ordinary = await waitState(s => s.rolls === 1, 'ordinary baseline roll');
  assert.equal(ordinary.perfectRolls, 0); assert.equal(ordinary.wingmanRuns, 0); assert(ordinary.evasion < 70);
  const on = await restart();
  assert.equal(on.breathCapacity, 3); assert.equal(on.waveCount, 4);
  assert(!on.word.includes('T'), 'T is reserved for the wingman, never requested by the word bank.');
  await send('SetSoundEnabled', 'false'); assert.equal((await snapshot()).sound, false);
  await send('SetSoundEnabled', 'true');
  const enabled = await waitState(s => s.sound, 'explicit sound opt-in');
  await capture('flags-on-sound-enabled');
  return { off, ordinary, on, enabled, baseline: report.baselineScope };
});

test('perfect-roll-bolt-refund-and-early-normal-roll', async () => {
  await restart(); await fixture('perfect:early'); await tap('q');
  const early = await waitState(s => s.rolls === 1, 'early roll accepted');
  assert.equal(early.perfectRolls, 0); assert(early.evasion <= 61);
  await restart(); const before = await snapshot();
  await fixture('perfect:bolt'); await tap('q');
  const perfect = await waitState(s => s.perfectRolls === 1, 'imminent hostile bolt produces perfect roll');
  assert.equal(perfect.rolls, 1); assert(perfect.evasion >= 99.5, 'Full roll cost is refunded.');
  assert.equal(perfect.hull, before.hull);
  await capture('perfect-roll-bolt');
  const safe = await waitSim(1.65);
  assert.equal(safe.damageHits, before.damageHits); assert.equal(safe.perfectRolls, 1);
  assert.equal(safe.slowRemaining, 0); assert.equal(safe.combatTimeScale, 1);
  return { early, before, perfect, safe };
});

test('perfect-seeker-reduced-motion-and-pause-reset', async () => {
  await restart(); await send('SetReducedMotion', 'true');
  await fixture('perfect:missile'); await tap('e');
  const reduced = await waitState(s => s.perfectRolls === 1, 'reduced-motion perfect seeker roll');
  assert.equal(reduced.combatTimeScale, 1); assert(reduced.evasion >= 99.5);
  await tap('Escape');
  const paused = await waitState(s => s.paused, 'Escape pauses');
  await delay(450); const still = await snapshot();
  assert.equal(still.elapsed, paused.elapsed); assert.equal(still.slowRemaining, 0);
  await tap('Escape'); await waitState(s => !s.paused, 'Escape resumes');
  const safe = await waitSim(1.5); assert.equal(safe.damageHits, 0);
  await capture('perfect-seeker-reduced-motion');
  const reset = await restart(); assert.equal(reset.slowRemaining, 0); assert.equal(reset.perfectRolls, 0);
  return { reduced, paused, still, safe, reset };
});

test('racer-guided-missile-answer', async () => {
  const before = await restart('role:Racer'); const target = living(before)[0];
  assert.equal(target.role, 'Racer'); assert(target.maxHealth < 216);
  await trackUntil(target.id, s => s.lockState === 'Locked' && s.lockedTarget === target.id, 'Racer missile lock');
  await tap('Enter');
  const disabled = await waitState(s => s.kills === 1 && s.missileHits === 1, 'one actual guided missile disables Racer');
  assert.equal(disabled.missilesLaunched, 1); assert.equal(disabled.shotsFired, 0);
  await capture('racer-missile'); return { before, disabled };
});

test('gunship-front-shield-and-assisted-breath-answer', async () => {
  const before = await restart('role:Gunship'); const target = living(before)[0];
  assert.equal(target.shield, true); await aimAt(target.id);
  await page.mouse.down({ button: 'left' });
  const blocked = await trackUntil(target.id, s => s.shotsFired >= 3 && /SHIELDED/.test(s.toast), 'front primary fire blocked by shield');
  await page.mouse.up({ button: 'left' });
  assert.equal(enemyAt(blocked, target.id).health, target.health);
  await trackUntil(target.id, s => s.lockState === 'Locked', 'shielded Gunship missile lock');
  await tap('Enter');
  const missile = await waitState(s => s.missileHits === 1, 'guided missile reaches shield');
  assert.equal(enemyAt(missile, target.id).health, target.health); assert.equal(enemyAt(missile, target.id).shield, true);
  await capture('gunship-shielded');
  const broken = await breathAt(target.id);
  assert.equal(enemyAt(broken, target.id).shield, false); assert.equal(enemyAt(broken, target.id).health, target.health);
  await aimAt(target.id); await page.mouse.down({ button: 'left' });
  try { await trackUntil(target.id, s => enemyAt(s, target.id).health < target.health, 'ordinary damage after shield break'); }
  finally { await page.mouse.up({ button: 'left' }); }
  const damaged = await snapshot(); await capture('gunship-shield-broken'); return { before, blocked, missile, broken, damaged };
});

test('grappler-latch-blocks-boost-and-roll-shakes-off', async () => {
  await restart('role:Grappler');
  const latched = await waitState(s => s.enemies.some(e => e.role === 'Grappler' && e.latched), 'Grappler physically approaches and latches', 90000);
  await page.keyboard.down('Shift');
  const held = await waitSim(.5); await page.keyboard.up('Shift');
  assert.equal(held.boosting, false); assert(held.speed < 48, 'Latch applies 30% travel-speed reduction.');
  await capture('grappler-latched'); await tap('q');
  const shaken = await waitState(s => s.rolls === 1 && s.enemies.some(e => e.role === 'Grappler' && !e.latched && e.stunned), 'accepted roll shakes off Grappler');
  assert(shaken.evasion < held.evasion); await capture('grappler-stunned');
  return { latched, held, shaken };
});

test('boost-claw-finisher-single-drop-and-refill', async () => {
  const full = await restart();
  await page.keyboard.down('Shift'); await waitSim(1.1); await page.keyboard.up('Shift');
  await tap('q'); await waitSim(1.45);
  await fixture('finisher');
  const before = await snapshot(); const target = living(before)[0];
  assert(target.health < target.maxHealth * .25); assert(before.evasion < 85);
  assert(before.boostEnergy < full.boostEnergy - .2, 'Spend real boost before testing the refill.');
  await page.keyboard.down('Shift');
  const finished = await waitState(s => s.finishers === 1 && s.kills === 1, 'boost approach triggers automatic finisher');
  await page.keyboard.up('Shift');
  assert(finished.boostEnergy >= full.boostEnergy - .2, 'Finisher refills the seconds-based boost reservoir.');
  assert(finished.evasion >= before.evasion + 14.5, 'Finisher adds the existing evasion resource.');
  assert.equal(finished.collisionHits, 0);
  assert.equal(finished.missilesLaunched, 0); assert.equal(finished.shotsFired, 0);
  const later = await waitSim(.4);
  assert.equal(later.finishers, 1); assert.equal(later.kills, 1);
  assert.equal(later.pickups + later.debris.filter(item => item.id === target.id).length, 1, 'Exactly one salvage drop or pickup.');
  assert.equal(later.freezeRemaining, 0); await capture('claw-finisher-result'); return { full, before, finished, later };
});

test('wingman-real-damage-cooldown-and-pause', async () => {
  const before = await restart('role:Fighter'); const target = living(before)[0];
  await tap('t');
  const sent = await waitState(s => s.wingmanRuns === 1 && s.wingmanRunning, 'T sends lab wingman');
  await tap('t'); await tap('Escape'); const paused = await waitState(s => s.paused, 'pause wingman run');
  await delay(400); const still = await snapshot();
  assert.equal(still.wingmanCooldown, paused.wingmanCooldown); assert.equal(still.wingmanRuns, 1);
  await tap('Escape'); await waitState(s => !s.paused, 'resume wingman run');
  const done = await waitState(s => !s.wingmanRunning && s.wingmanRuns === 1, 'four-second strafe completes');
  const dealt = target.health - enemyAt(done, target.id).health;
  assert(dealt > 0 && dealt <= 73, `Modest integrated wingman damage, observed ${dealt}.`);
  assert.equal(done.shotsFired, 0); assert.equal(done.missilesLaunched, 0); assert(done.wingmanCooldown > 0);
  await tap('t'); assert.equal((await snapshot()).wingmanRuns, 1);
  await capture('wingman-cooldown');
  await waitState(s => s.wingmanCooldown === 0, 'twenty-second cooldown naturally expires', 120000);
  await tap('t'); const again = await waitState(s => s.wingmanRuns === 2, 'T works after cooldown');
  return { before, sent, paused, still, done, damage: dealt, again };
});

test('multi-target-breath-one-impact-each-held-space-safe', async () => {
  const before = await restart('multi'); const targets = living(before).map(enemy => enemy.id);
  assert.equal(targets.length, 3); assert.equal(before.breathCapacity, 3);
  await aimMode(); await chargeAssisted();
  for (let i = 0; i < targets.length; i++) await trackUntil(targets[i], s => s.breathLockedCount === i + 1, `sweep acquires breath lock ${i + 1}`);
  const locked = await snapshot(); await capture('three-breath-locks');
  await page.keyboard.down('Space');
  const windup = await waitState(s => s.breathsFired === 1 && s.windupActive, 'one held Space starts breath windup');
  const beam = await waitState(s => s.beam && s.breathStage === 'beam', 'multi-target beam presentation');
  assert.equal(beam.activeBreathBeams, 3, 'All locked targets receive an actual beam visual.');
  await capture('multi-target-beam');
  const resolved = await waitState(s => s.breathsResolved === 1 && s.kills === 3, 'one burst disables all three targets exactly once');
  const nextWave = await waitState(s => s.wave === 2 && living(s).length > 0, 'next real wave provides a fresh eligible target');
  await fixture('wave:targets'); await chargeAssisted();
  await trackUntil(living(nextWave)[0].id, s => s.breathLockedCount === 1, 'fresh charged lock while Space remains held');
  const held = await waitSim(.35); await page.keyboard.up('Space');
  assert.equal(held.breathsFired, 1); assert.equal(held.breathsResolved, 1); assert.equal(held.kills, 3);
  assert.equal(held.missilesLaunched, 0); assert.equal(held.shotsFired, 0);
  assert(distance(resolved.position, windup.position) > 10, 'Flight continues throughout spelling/attack.');
  return { before, targets, locked, windup, beam, resolved, nextWave, held };
});

test('hostile-missile-scenery-interception-rewards-once', async () => {
  await restart(); await tap('q');
  await waitSim(1.7); const spent = await snapshot();
  assert(spent.evasion < 90, 'Spend real roll energy before checking a bounded reward.');
  await fixture('rockshot');
  const reward = await waitState(s => s.rockShots === 1 && /ROCK SHOT/.test(s.toast), 'actual hostile missile hits solid scenery nearby');
  assert(reward.evasion >= spent.evasion + 14.5 && reward.evasion <= 100);
  assert.equal(reward.damageHits, spent.damageHits);
  await capture('rock-shot');
  const later = await waitSim(.6); assert.equal(later.rockShots, 1);
  return { spent, reward, later };
});

test('gas-pocket-primary-detonation-is-once-and-restarts', async () => {
  const before = await restart('gas');
  assert(before.gasPockets >= 3 && before.gasPockets <= 5);
  const pocket = before.gas.find(item => item.id === 'gas-0');
  assert(pocket && !pocket.detonated && pocket.screenZ > 0);
  const box = await page.locator('#unity-canvas').boundingBox();
  await page.mouse.move(box.x + pocket.screenX * box.width, box.y + pocket.screenY * box.height);
  await page.mouse.down({ button: 'left' });
  const detonated = await waitState(s => s.gasDetonations === 1 && s.gas.find(item => item.id === pocket.id)?.detonated,
    'real twin laser hits gas asteroid and resolves explosion');
  const repeat = await waitSim(.4); await page.mouse.up({ button: 'left' });
  assert.equal(repeat.gasDetonations, 1); assert(repeat.shotsFired > 1);
  await capture('gas-pocket-detonated');
  const reset = await restart(); assert.equal(reset.gasDetonations, 0); assert.equal(reset.rockShots, 0);
  assert(reset.gas.every(item => !item.detonated));
  return { before, detonated, repeat, reset,
    scope: 'Observed production laser/solid-scenery detonation and deduplication. Blast-radius boundaries and other weapon dispatch have separate EditMode coverage.' };
});

test('all-four-real-waves-win-with-assisted-charging', async () => {
  let state = await restart('wave:targets');
  const expectedRoles = [['Fighter', 'Fighter', 'Fighter'], ['Fighter', 'Fighter', 'Grappler'],
    ['Fighter', 'Racer', 'Racer'], ['Gunship', 'Fighter', 'Fighter']];
  const waves = [];
  for (let wave = 1; wave <= 4; wave++) {
    state = await waitState(s => s.wave === wave && living(s).length === 3, `actual wave ${wave} spawns`, 60000);
    assert.deepEqual(living(state).map(enemy => enemy.role).sort(), [...expectedRoles[wave - 1]].sort());
    const initial = state; const attacks = [];
    // Four attacks is a hard guard: three unshielded targets plus one shield-breaking breath.
    for (let attack = 0; attack < 4 && !state.won && state.wave === wave && living(state).length; attack++) {
      await chargeAssisted();
      const targets = living(await snapshot()).map(enemy => enemy.id);
      for (let i = 0; i < targets.length; i++) await trackUntil(targets[i], s => s.breathLockedCount === i + 1,
        `wave ${wave} assisted target ${i + 1}`);
      const before = await snapshot(); await tap('Space');
      state = await waitState(s => s.breathsResolved === before.breathsResolved + 1, `wave ${wave} breath resolves`, 60000);
      attacks.push(state);
    }
    assert(state.won || state.wave > wave || living(state).length === 0, `Wave ${wave} must be defeated by real assisted breath.`);
    assert.equal(state.shotsFired, 0); assert.equal(state.missilesLaunched, 0); assert.equal(state.wingmanRuns, 0);
    waves.push({ wave, initial, attacks }); await capture(`assisted-wave-${wave}`);
  }
  const won = await waitState(s => s.won && s.wave === 4 && s.kills === 12, 'all four waves disabled');
  const flying = await waitSim(.5); assert(distance(flying.position, won.position) > 10);
  return { waves, won, flying, scope: 'QA only quiets threats and stages existing live wave targets in view; actual roles, health, shields, locks, breath impacts and wave advancement remain authoritative.' };
});

function repairAnswer(state) {
  const prompt = String(state.repairCodePrompt || '').trim();
  const number = /^(\d)$/.exec(prompt);
  const sum = /^(\d)\s*\+\s*(\d)$/.exec(prompt);
  assert(number || sum, `Expected a visible digit or small sum, received ${JSON.stringify(prompt)}.`);
  const answer = number ? Number(number[1]) : Number(sum[1]) + Number(sum[2]);
  if (sum) assert(answer <= 5, 'Sums stay within five.');
  assert.equal(state.repairCodeExpected, answer, 'Rendered prompt and authoritative expected digit agree.');
  return answer;
}
async function setRepairMode(mode) {
  await tap('Escape'); await waitState(s => s.paused, 'pause to select optional repair mode');
  await send('SetRepairCodeMode', mode);
  const selected = await waitState(s => s.repairCodeMode === mode, `pause-menu ${mode} repair option`);
  await tap('Escape'); await waitState(s => !s.paused, 'resume after repair option');
  return selected;
}
test('repair-optional-code-speeds-live-repair-without-extra-spend', async () => {
  await restart('role:Fighter'); await setRepairMode('Numbers'); await fixture('damage:0');
  const started = await startRepair(0);
  assert.equal(started.repairCodeIndex, 0, 'The repair-selection digit does not answer the optional code.');
  const expected = repairAnswer(started); await tap(String((expected + 1) % 10));
  const wrong = await snapshot(); assert.equal(wrong.repairCodeIndex, 0); assert.equal(wrong.repairBonus, false);
  await page.keyboard.down('ArrowRight');
  const steps = [];
  for (let i = 0; i < 3; i++) {
    const current = await snapshot(); assert.equal(current.repairCodeIndex, i);
    await tap(String(repairAnswer(current)));
    steps.push(await waitState(s => s.repairCodeIndex === i + 1, `correct optional code digit ${i + 1}`));
  }
  const bonus = steps[2]; assert.equal(bonus.repairBonus, true); assert.equal(bonus.salvage, started.salvage);
  assert(distance(bonus.position, started.position) > 5, 'Flying remains live during optional repair input.');
  await page.keyboard.up('ArrowRight');
  const completed = await waitState(s => s.repairsCompleted === 1 && !s.repairing, 'code-assisted repair completes');
  assert(completed.elapsed - started.elapsed < 3.8, 'Correct code beats the normal four-second repair.');
  assert.equal(completed.repairsRemaining, 2); assert.equal(completed.salvage, 0); assert.equal(completed.hull, 80);
  await capture('repair-code-completed'); return { started, wrong, steps, bonus, completed };
});

test('repair-ignored-sums-off-and-real-damage-interruption', async () => {
  await restart('role:Fighter'); await setRepairMode('Numbers'); await fixture('damage:0');
  const ignored = await startRepair(0);
  const ordinary = await waitState(s => s.repairsCompleted === 1 && !s.repairing, 'ignored optional code keeps ordinary repair');
  assert(ordinary.elapsed - ignored.elapsed >= 3.7); assert.equal(ordinary.repairBonus, false);
  await restart('role:Fighter'); await setRepairMode('Sums'); await fixture('damage:0');
  const sum = await startRepair(0); repairAnswer(sum); assert.match(sum.repairCodePrompt, /\+/);
  await fixture('interrupt:0');
  const interrupted = await waitState(s => !s.repairing && s.repairsInterrupted === 1 && s.damageHits > sum.damageHits,
    'real hostile projectile interrupts sum-mode repair');
  assert.equal(interrupted.salvage, 1); assert.equal(interrupted.repairsRemaining, 3);
  assert.equal(interrupted.repairCodePrompt, ''); assert.equal(interrupted.repairBonus, false);
  await restart('role:Fighter'); await setRepairMode('Off'); await fixture('damage:0');
  const off = await startRepair(0); assert.equal(off.repairCodePrompt, ''); assert.equal(off.repairCodeExpected, -1);
  const finished = await waitState(s => s.repairsCompleted === 1 && !s.repairing, 'Off mode remains an ordinary repair');
  assert(finished.elapsed - off.elapsed >= 3.7); await capture('repair-option-off');
  return { ignored, ordinary, sum, interrupted, off, finished };
});

test('typed-comeback-separate-word-protection-and-second-loss', async () => {
  const before = await restart();
  await page.keyboard.down('Tab');
  const selector = await waitState(s => s.selector, 'held Tab opens the system selector before hull failure');
  await fixture('comeback');
  const tumbling = await waitState(s => s.comebackActive && !s.dead && s.hull === 0, 'first zero hull opens live comeback');
  assert.equal(tumbling.selector, false, 'Comeback must close the repair selector so SONG remains visible.');
  await page.keyboard.up('Tab');
  const released = await snapshot();
  assert.equal(released.selector, false, 'Releasing Tab during comeback cannot leave a stale selector.');
  assert.equal(tumbling.comebackUsed, true); assert.equal(tumbling.comebackLetterIndex, 0);
  await tap('i'); assert.equal((await snapshot()).comebackLetterIndex, 0, 'Wrong comeback letter has no penalty or progress.');
  const letters = [];
  for (let i = 0; i < 4; i++) {
    await tap('song'[i]);
    letters.push(await waitState(s => s.comebackLetterIndex === i + 1, `comeback letter ${i + 1}`, 15000));
  }
  const recovered = await waitState(s => !s.comebackActive && !s.dead && s.hull === 30 && s.comebackProtection > 0, 'SONG restores thirty hull');
  assert.equal(recovered.comebackAssisted, false); assert.equal(recovered.word, before.word);
  assert.equal(recovered.letterIndex, before.letterIndex, 'Comeback input must not advance the separate breath word.');
  assert.equal(recovered.selector, false, 'Recovery keeps the interrupted repair selector closed.');
  assert(recovered.enemies.every(enemy => enemy.threat === 0), 'Recovery breaks existing enemy tracking.');
  await waitSim(.15); // Neutral released input rearms normal combat after the tumble.
  await page.mouse.down({ button: 'left' });
  let normalFire;
  try { normalFire = await waitState(s => s.shotsFired > recovered.shotsFired, 'ordinary fire works after recovering with Tab released'); }
  finally { await page.mouse.up({ button: 'left' }); }
  assert.equal(normalFire.selector, false);
  await fixture('comeback'); const protectedHit = await snapshot();
  assert.equal(protectedHit.hull, 30); assert.equal(protectedHit.dead, false);
  await capture('comeback-recovered');
  await waitState(s => s.comebackProtection === 0, 'two-second comeback protection expires');
  await fixture('comeback');
  const secondLoss = await waitState(s => s.dead && !s.comebackActive && s.hull === 0, 'second hull failure uses normal disabled flow', 30000, true);
  const reset = await restart(); assert.equal(reset.comebackUsed, false); assert.equal(reset.comebackActive, false);
  assert.equal(reset.comebackProtection, 0); await capture('comeback-reset');
  return { before, selector, tumbling, released, letters, recovered, normalFire, protectedHit, secondLoss, reset };
});

test('comeback-assistance-pause-timeout-and-full-restart', async () => {
  await restart(); await fixture('comeback');
  await waitState(s => s.comebackActive, 'comeback starts'); await tap('Escape');
  const paused = await waitState(s => s.paused, 'pause comeback'); await delay(500);
  const still = await snapshot(); assert.equal(still.comebackRemaining, paused.comebackRemaining);
  assert.equal(still.elapsed, paused.elapsed); await tap('Escape'); await waitState(s => !s.paused, 'resume comeback');
  await tap('F1');
  const assisted = await waitState(s => !s.comebackActive && s.comebackAssisted && s.hull === 30 && !s.dead, 'F1 completes an explicitly assisted comeback');
  await capture('comeback-assisted');
  await restart(); await fixture('comeback');
  const timeoutStart = await waitState(s => s.comebackActive, 'independent timeout case starts');
  await capture('comeback-tumble');
  const timedOut = await waitState(s => s.dead && !s.comebackActive, 'ignored comeback times out into normal loss', 60000, true);
  assert.equal(timedOut.hull, 0); assert.equal(timedOut.comebackAssisted, false);
  const reset = await restart();
  for (const field of ['perfectRolls', 'finishers', 'wingmanRuns', 'rockShots', 'gasDetonations', 'breathsFired',
    'repairsCompleted', 'repairsInterrupted', 'comebackLetterIndex']) assert.equal(reset[field], 0, `Restart resets ${field}.`);
  assert.equal(reset.comebackUsed, false); assert.equal(reset.wingmanRunning, false); assert.equal(reset.repairing, false);
  assert.equal(reset.slowRemaining, 0); assert.equal(reset.freezeRemaining, 0); assert.equal(reset.wingmanCooldown, 0);
  await capture('all-combat-state-reset'); return { paused, still, assisted, timeoutStart, timedOut, reset };
});

test('real-canvas-focus-loss-pauses-timers-and-clears-held-evasion', async () => {
  await restart('role:Fighter'); await tap('t'); await page.keyboard.down('b');
  const active = await waitState(s => s.wingmanRunning && s.breakActive, 'wingman and held-B evasion are active');
  try {
    // Headless Chrome keeps both real tabs visible/focused. Move actual DOM focus
    // off the canvas instead; do not fabricate an event or send a pause command.
    await page.locator('body').focus();
    assert.equal(await page.locator('#unity-canvas').evaluate(el => document.activeElement === el), false);
    const paused = await waitState(s => s.paused, 'actual canvas focus loss pauses Unity', 15000);
    await delay(500); const still = await snapshot();
    assert.equal(still.elapsed, paused.elapsed); assert.equal(still.wingmanCooldown, paused.wingmanCooldown);
    assert.equal(still.breakActive, false); assert.equal(still.slowRemaining, 0); assert.equal(still.freezeRemaining, 0);
    await page.bringToFront(); await releaseInputs(); await page.locator('#unity-canvas').focus();
    await tap('Escape'); const resumed = await waitState(s => !s.paused, 'explicit resume after real focus loss');
    const fresh = await waitSim(.3); assert.equal(fresh.breakActive, false); assert.equal(fresh.breaks, active.breaks);
    assert.equal(fresh.wingmanRuns, 1); await capture('focus-loss-resumed');
    return { active, paused, still, resumed, fresh, scope: 'Real installed-Chrome canvas-to-body focus transition; no synthetic DOM event or forced Unity timer state. OS/tab switching remains NOT TESTED in this headless run.' };
  } finally {
    await page.locator('#unity-canvas').focus();
  }
});

test('independent-wing-bank-keeps-flight-vector-and-normal-roll', async () => {
  await restart('target'); await aimMode();
  const box = await page.locator('#unity-canvas').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const before = await snapshot(); assert.equal(before.independentBankEnabled, true);
  await page.mouse.down({ button: 'right' }); await page.keyboard.down('q');
  const banked = await waitSim(.4);
  assert(banked.bankAngle > .25 && banked.independentBankInput > .25, 'RMB + held Q commands a visible independent wing bank.');
  assert.equal(banked.rolls, 0); assert.equal(banked.evasion, before.evasion);
  assert(distance(banked.forward, before.forward) < .001, 'Wing bank leaves the authoritative flight direction unchanged.');
  const displacement = { x: banked.position.x - before.position.x, y: banked.position.y - before.position.y, z: banked.position.z - before.position.z };
  const forwardTravel = displacement.x * before.forward.x + displacement.y * before.forward.y + displacement.z * before.forward.z;
  assert(forwardTravel > 10, 'Flight advances while the wings bank.');
  assert(Math.hypot(displacement.x - forwardTravel * before.forward.x, displacement.y - forwardTravel * before.forward.y,
    displacement.z - forwardTravel * before.forward.z) < .01, 'Independent bank introduces no lateral movement.');
  await capture('independent-wing-bank');
  const held = await snapshot(); await page.keyboard.up('q');
  const release = await waitState(s => s.independentBankInput === 0 && s.bankAngle < held.bankAngle, 'release starts smooth bank return');
  assert(release.bankAngle > .025, 'Observe an intermediate bank angle instead of snapping immediately to level.');
  const level = await waitState(s => Math.abs(s.bankAngle) < .025, 'released wings ease back to level');
  assert.equal(level.rolls, 0); assert(distance(level.forward, before.forward) < .001);
  await page.mouse.up({ button: 'right' }); await tap('q');
  const roll = await waitState(s => s.rolls === 1, 'fresh unmodified Q still starts a normal timed roll');
  assert(roll.evasion < level.evasion); assert.equal(roll.perfectRolls, 0);
  await capture('normal-roll-after-bank'); return { before, banked, held, release, level, roll };
});

// Software-only browser Gamepad API injection: exercises Unity's Web input bridge,
// not a QA action in the game. Physical DualSense/DS4 remains a separate owner test.
async function pad(buttons = [], axes = [0, 0, 0, 0]) {
  await page.evaluate(({buttons, axes}) => window.__verificationPad.set(buttons, axes), {buttons, axes});
}
async function padTap(index) { await pad([index]); await delay(100); await pad(); await delay(100); }
test('controller-browser-bridge-flight-aim-bank-roll-and-weapons', async () => {
  await restart('target');
  await page.evaluate(() => window.__verificationPad.connect());
  await waitState(s => s.controllerConnected && s.paused, 'standard browser gamepad connects and pauses safely');
  await waitState(s => s.controllerArmed, 'neutral controller arms menu');
  await padTap(9); await waitState(s => !s.paused && s.controllerArmed, 'Options resumes after release');
  const before = await snapshot();
  await pad([], [.5, 0, .5, 0]); const steered = await waitSim(.4); await pad();
  assert(distance(before.forward, steered.forward) > .05); assert(steered.aimX > before.aimX + .03);
  await padTap(11); assert(Math.abs((await snapshot()).aimX) < .02, 'R3 centers aim');
  await waitSim(.8); // Existing steering response eases to neutral before comparing bank-only motion.
  const level = await snapshot(); await pad([6, 4]); const banked = await waitSim(.35); await pad();
  assert(banked.independentBankInput > .25); assert.equal(banked.rolls, 0);
  assert(distance(level.forward, banked.forward) < .02, 'L2 + L1 banks without a new nose turn');
  await waitSim(.3); await padTap(5); const rolled = await waitState(s => s.rolls === 1, 'R1 starts ordinary roll');
  await pad([0]); const boosted = await waitState(s => s.boosting, 'Cross boosts'); await pad();
  await waitSim(1.8); await pad([1], [-.6, 0, 0, 0]);
  const turned = await waitState(s => s.breakActive, 'Circle plus stick sharpens turn'); await pad();
  await pad([7]); const fired = await waitState(s => s.shotsFired > 0 && s.laserBeamsFired >= 2, 'R2 fires wing lasers'); await pad();
  await padTap(2); const missile = await waitState(s => s.launchAttempts > 0, 'Square requests existing missile launch');
  assert.equal(missile.usingController, true); await capture('controller-flight-controls');
  return {before, steered, banked, rolled, boosted, turned, fired, missile,
    scope: 'Injected standard browser Gamepad API drives the actual Unity input bridge. No physical controller claim.'};
});
test('controller-assisted-breath-wingman-and-normal-repair', async () => {
  const before = await restart('target');
  await padTap(12); await waitState(s => s.breathPhase === 'Ready', 'D-pad Up assisted word charge');
  // Initial target is centered in this condition; R3 selects the centered reticle.
  await padTap(11); await waitState(s => s.breathLockedCount >= 1, 'centered controller reticle gets real breath lock');
  await padTap(3); await waitState(s => s.breathsResolved === 1, 'Triangle fires charged beam');
  await fixture('role:Fighter'); await padTap(13); const ally = await waitState(s => s.wingmanRuns === 1, 'D-pad Down sends wingman');
  await fixture('damage:0'); await pad([8]); await waitState(s => s.selector, 'held Share/Create opens repair selector');
  await pad([8, 14]); const repairing = await waitState(s => s.repairing, 'Share plus left selects hull repair'); await pad();
  assert.equal(repairing.repairCodeIndex, 0, 'D-pad selection does not answer optional keyboard digits');
  const repaired = await waitState(s => s.repairsCompleted === 1, 'normal repair completes without typing');
  await capture('controller-repair-result'); return {ally, repairing, repaired};
});
test('controller-menu-reconnect-gate-and-assisted-comeback', async () => {
  await restart('quiet'); await padTap(9); await waitState(s => s.paused && s.controllerArmed, 'Options opens menu');
  await padTap(13); assert.equal((await snapshot()).controllerMenuIndex, 1);
  const soundBefore = (await snapshot()).sound; await padTap(0);
  await waitState(s => s.sound !== soundBefore, 'Cross activates selected sound option');
  await capture('controller-pause-menu'); await padTap(1); await waitState(s => !s.paused && s.controllerArmed, 'Circle resumes');
  await pad([7]); await waitState(s => s.shotsFired > 0, 'trigger fires before disconnect');
  await page.evaluate(() => window.__verificationPad.disconnect());
  const lost = await waitState(s => !s.controllerConnected && s.paused, 'disconnect pauses');
  await page.evaluate(() => window.__verificationPad.connect());
  await pad([7]); // Repeat the still-held sample after the WebGL device has reappeared.
  await delay(200); const held = await snapshot(); assert.equal(held.controllerArmed, false); assert.equal(held.shotsFired, lost.shotsFired);
  await pad(); await waitState(s => s.controllerArmed, 'release trigger after reconnect');
  await padTap(9); await waitState(s => !s.paused && s.controllerArmed, 'explicit resume after reconnect');
  const resumed = await waitSim(.2); assert.equal(resumed.shotsFired, lost.shotsFired);
  await fixture('comeback'); await waitState(s => s.comebackActive && s.controllerArmed, 'neutral input arms SONG context');
  await padTap(12); const revived = await waitState(s => s.comebackSucceeded === 1 && s.hull === 30 && s.comebackAssisted, 'D-pad Up completes assisted SONG');
  await waitSim(2.1); await fixture('comeback'); await waitState(s => s.dead && s.controllerArmed, 'second failure reaches disabled controller screen', 15000, true);
  await padTap(0); const reset = await waitState(s => !s.dead && !s.paused && s.hull === 100 && !s.comebackUsed, 'Cross restarts from disabled screen', 15000, true);
  await capture('controller-restarted');
  await page.evaluate(() => window.__verificationPad.disconnect());
  return {lost, held, resumed, revived, reset, physicalController: 'NOT TESTED'};
});

try {
  await mkdir(runOutput, { recursive: true }); await saveReport();
  reportTimer = setInterval(() => { saveReport().catch(error => console.error(error.message)); }, 2000); reportTimer.unref();
  report.head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
  report.workingTree = execFileSync('git', ['status', '--short'], { cwd: repo, encoding: 'utf8' }).trim();
  report.buildReceipt = JSON.parse(await artifact('unity/SpaceDragon/Builds/DogfightWeb/build-receipt.json'));
  assert.equal(report.buildReceipt.result, 'Succeeded'); assert.equal(report.buildReceipt.developmentBuild, true);
  for (const name of ['DogfightEncounter', 'DogfightCombat', 'DogfightTuning', 'PerfectRollState', 'EnemyRoleState', 'RolePilotState',
    'ClawFinisherState', 'WingmanState', 'RocksWeaponState', 'BreathState', 'RepairCodeState', 'ComebackState', 'TacticalState',
    'ControllerInputState', 'DogfightController'])
    await artifact(`unity/SpaceDragon/Assets/SpaceDragon/Runtime/Dogfight/${name}.cs`);
  await artifact('tools/unity/verify-combat-upgrades.mjs');
  const served = await fetch(new URL('build-receipt.json', url)); assert(served.ok, 'Player server must expose its exact build receipt.');
  report.servedBuildReceipt = JSON.parse(await served.text());
  assert.deepEqual(report.servedBuildReceipt, report.buildReceipt, 'Served and locally measured build receipts must match.');
  const contractName = report.buildReceipt.dragonVersion === 'oscar-v001' ? 'oscar-contract-v001.json' :
    report.buildReceipt.dragonVersion === 'violet-v007' ? 'violet-contract-v007.json' : 'heroic-contract-v005.json';
  report.modelContract = JSON.parse(await artifact(`unity/SpaceDragon/Assets/SpaceDragon/Dogfight/${contractName}`));
  assert.equal(report.modelContract.sha256, report.buildReceipt.sourceSha256);
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: forceWebGL2 ? ['--disable-features=WebGPUService'] : [] });
  report.browser = browser.version();
  context = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  page = await context.newPage();
  await page.addInitScript(() => {
    let connected = false;
    const device = {id: 'DualSense Wireless Controller (verification software fixture)', index: 0,
      mapping: 'standard', connected: false, timestamp: 0, axes: [0, 0, 0, 0],
      buttons: Array.from({length: 17}, () => ({pressed: false, touched: false, value: 0}))};
    Object.defineProperty(navigator, 'getGamepads', {configurable: true, value: () => connected ? [device] : [null]});
    const emit = name => {const event = new Event(name); Object.defineProperty(event, 'gamepad', {value: device}); window.dispatchEvent(event);};
    const set = (buttons, axes) => {device.timestamp = performance.now(); device.axes = [...axes];
      device.buttons = device.buttons.map((_, i) => ({pressed: buttons.includes(i), touched: buttons.includes(i), value: buttons.includes(i) ? 1 : 0}));};
    window.__verificationPad = {connect() {connected = device.connected = true; device.timestamp = performance.now(); emit('gamepadconnected');},
      disconnect() {connected = device.connected = false; device.timestamp = performance.now(); emit('gamepaddisconnected');}, set,
      neutral() {set([], [0, 0, 0, 0]);}};
  });
  const cdp = await context.newCDPSession(page); await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
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
  report.initial = await waitState(s => s.scene === 'Unity Dogfight' && s.frameSamples > 2, 'Unity snapshot bridge ready', 240000, true);
  for (const field of ['perfectRolls', 'finishers', 'wingmanRuns', 'rockShots', 'gasDetonations', 'breathCapacity',
    'repairCodeIndex', 'repairCodeExpected', 'comebackLetterIndex', 'comebackRemaining', 'comebackProtection'])
    assert.equal(typeof report.initial[field], 'number', `The fresh build must expose ${field}.`);
  assertFlags(report.initial, true);
  if (forceWebGL2) assert.equal(report.initial.graphics, 'OpenGLES3', 'Explicit WebGL2 run must use its actual backend.');
  report.renderer = { graphics: report.initial.graphics, device: report.initial.device,
    softwareReported: /swiftshader|llvmpipe|software rasterizer/i.test(report.initial.device || '') };
  if (report.renderer.softwareReported) report.limitations.push('Runtime reports a software renderer; no hardware performance claim is supported.');
  assert.equal(report.initial.authoredClips, true); assert.equal(report.initial.sound, false, 'Audio starts opt-in.');
  await page.locator('#unity-canvas').focus();
  await page.evaluate(() => localStorage.setItem('combat-upgrades-verification-sentinel', 'retain'));
  const storageBefore = await page.evaluate(() => ({ ...localStorage }));
  const selectedCases = process.env.SPACE_DRAGON_COMBAT_CASE_FILTER
    ? cases.filter(item => item.name.includes(process.env.SPACE_DRAGON_COMBAT_CASE_FILTER)) : cases;
  report.caseFilter = process.env.SPACE_DRAGON_COMBAT_CASE_FILTER || null;
  report.expectedCases = selectedCases.map(item => item.name);
  assert(selectedCases.length > 0, 'Case filter must select at least one check.');
  for (const { name, operation } of selectedCases) {
    currentCase = name; const entry = { name, startedAt: new Date().toISOString(), result: 'RUNNING' };
    report.cases.push(entry); console.log(`Combat upgrades: ${name}`);
    try { entry.evidence = await operation(); entry.result = 'PASS'; }
    catch (error) {
      entry.result = 'FAIL'; entry.failure = String(error.stack || error); console.error(`${name}: ${error.message}`);
      try { await capture(`FAIL-${name}`); } catch (failure) { entry.captureFailure = String(failure); }
    } finally { await releaseInputs(); entry.finishedAt = new Date().toISOString(); await saveReport(); }
  }
  const storageAfter = await page.evaluate(() => ({ ...localStorage }));
  report.storage = { before: storageBefore, after: storageAfter, unchanged: JSON.stringify(storageBefore) === JSON.stringify(storageAfter),
    scope: 'Isolated verification context only; no learner records or unrelated origins inspected.' };
  assert.deepEqual(storageAfter, storageBefore, 'Encounter upgrades preserve localStorage.');
  report.final = await snapshot();
} catch (error) { report.fatal = String(error.stack || error); console.error(error); }
finally {
  clearInterval(reportTimer);
  try { await releaseInputs(); } catch { /* Preserve the original runtime failure. */ }
  await Promise.allSettled(networkTasks);
  report.finishedAt = new Date().toISOString();
  report.result = !report.fatal && report.cases.length === report.expectedCases?.length && report.cases.every(entry => entry.result === 'PASS') &&
    report.pageErrors.length === 0 && report.consoleErrors.length === 0 && report.externalRequests.length === 0 && report.requestFailures.length === 0 ? 'PASS' : 'FAIL';
  await saveReport(); if (browser) await browser.close();
  console.log(`Combat upgrades ${report.result}: ${path.join(runOutput, 'report.json')}`);
  if (report.result !== 'PASS') process.exitCode = 1;
}
