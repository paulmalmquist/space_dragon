import { test, expect as baseExpect, type Page } from '@playwright/test';
import { chargeDisplayedWord } from './helpers/dogfight';
// The software renderer advances the same simulation in slower wall time.
const expect = baseExpect.configure({ timeout: 15_000 });

type FlightSnapshot = {
  state: string; elapsed: number; keys: string[]; position: number[]; forward: number[];
  aim: { x: number; y: number; direction: number[] }; shots: number; lastShotDirection: number[] | null;
  rollActive: boolean; rollAngle: number; rollsCompleted: number; alive: number; energy: number;
  mouse: { active: boolean; stick: { x: number; y: number }; fire: boolean; zoom: boolean };
  zooming: boolean; cameraFov: number;
  rollCooldown: number; evasionEnergy: number; rollsStarted: number;
  breakActive: boolean; breaksStarted: number; breaksCompleted: number;
  power: { phase: string; index: number }; lastManeuverResult: { reason: string; accepted: boolean; cost: number };
  threat: { tracking: number; locked: number; firing: number; lockBreaks: number; incoming: number };
  enemyShots: number;
};
const snapshot = (page: Page): Promise<FlightSnapshot> => page.evaluate(() =>
  (window as unknown as { __SPACE_DRAGON_DOGFIGHT__: { snapshot(): FlightSnapshot } }).__SPACE_DRAGON_DOGFIGHT__.snapshot());
async function openLab(page: Page) {
  await page.goto('dogfight/');
  await expect(page.locator('#game')).toHaveAttribute('data-rendered', 'true', { timeout: 30_000 });
  await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-state', 'playing');
  await chargeDisplayedWord(page);
}

test('target warnings, finite rolls and a physical break turn stay live during spelling and reset cleanly', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('dogfight/');
  await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).threat.tracking, { timeout: 40_000 }).toBeGreaterThan(0);
  await expect.poll(async () => (await snapshot(page)).threat.locked, { timeout: 40_000 }).toBeGreaterThan(0);
  const threatened = await snapshot(page);
  expect(threatened.power.phase).toBe('charging');
  await page.keyboard.down('q');
  let current = await snapshot(page);
  expect(current.evasionEnergy).toBe(60); expect(current.threat.locked).toBe(0);
  expect(current.threat.lockBreaks).toBe(1); expect(current.rollsStarted).toBe(1);
  await page.keyboard.down('q'); // A repeat never buys another maneuver.
  expect((await snapshot(page)).evasionEnergy).toBe(60);
  await page.keyboard.up('q');
  await expect.poll(async () => (await snapshot(page)).rollsCompleted, { timeout: 40_000 }).toBe(1);
  await expect.poll(async () => (await snapshot(page)).rollCooldown, { timeout: 40_000 }).toBe(0);
  await page.keyboard.press('e');
  expect((await snapshot(page)).evasionEnergy).toBe(20);
  await expect.poll(async () => (await snapshot(page)).rollsCompleted, { timeout: 40_000 }).toBe(2);
  await expect.poll(async () => (await snapshot(page)).rollCooldown, { timeout: 40_000 }).toBe(0);
  await page.keyboard.press('q');
  current = await snapshot(page);
  expect(current.rollsStarted).toBe(2); expect(current.lastManeuverResult.reason).toBe('energy');
  await expect.poll(async () => (await snapshot(page)).evasionEnergy, { timeout: 60_000 }).toBeGreaterThanOrEqual(25);
  const before = await snapshot(page);
  await page.keyboard.down('ArrowRight'); await page.keyboard.down('b');
  current = await snapshot(page);
  expect(current.breakActive).toBe(true); expect(current.breaksStarted).toBe(1);
  expect(current.lastManeuverResult).toMatchObject({ accepted: true, cost: 25 });
  expect(current.power.index).toBe(before.power.index);
  await page.keyboard.press('Escape');
  const paused = await snapshot(page);
  await page.waitForTimeout(250);
  current = await snapshot(page);
  expect(current.position).toEqual(paused.position); expect(current.evasionEnergy).toBe(paused.evasionEnergy);
  await page.keyboard.up('ArrowRight'); await page.keyboard.up('b'); await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).breaksCompleted, { timeout: 40_000 }).toBe(1);
  current = await snapshot(page);
  expect(Math.hypot(...current.forward.map((value, i) => value - before.forward[i]))).toBeGreaterThan(.7);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Restart encounter', exact: false }).click();
  current = await snapshot(page);
  expect(current.evasionEnergy).toBe(100); expect(current.rollsStarted).toBe(0);
  expect(current.breaksStarted).toBe(0); expect(current.threat.lockBreaks).toBe(0);
  expect(errors).toEqual([]);
});

test('WADZ moves the actual firing target independently; arrows steer and both rolls complete', async ({ page }) => {
  test.setTimeout(150_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await openLab(page);
  await page.keyboard.down('d');
  await expect.poll(async () => (await snapshot(page)).aim.x, { timeout: 15_000 }).toBeGreaterThan(.35);
  await page.keyboard.up('d');
  const aimed = await snapshot(page);
  expect(aimed.forward).toEqual([0, 0, -1]);
  await page.keyboard.down('w');
  await expect.poll(async () => (await snapshot(page)).aim.y).toBeGreaterThan(.15);
  await page.keyboard.up('w');
  const crosshair = await page.locator('#reticle').boundingBox();
  expect(crosshair!.x + crosshair!.width / 2).toBeGreaterThan(1440 * .65);
  expect(crosshair!.y + crosshair!.height / 2).toBeLessThan(1000 * .45);
  // Mouse input now owns the reticle in both modes. Aim-only mode keeps the
  // independent keyboard-aim test from turning the dragon while firing.
  await page.keyboard.press('m');
  await page.mouse.move(crosshair!.x + crosshair!.width / 2, crosshair!.y + crosshair!.height / 2);
  await page.mouse.down({ button: 'left' });
  await expect.poll(async () => (await snapshot(page)).shots).toBeGreaterThan(1);
  await page.mouse.up({ button: 'left' });
  const fired = await snapshot(page);
  expect(fired.lastShotDirection![0]).toBeGreaterThan(.1);
  expect(fired.forward).toEqual([0, 0, -1]);
  const aimBeforeTurn = fired.aim.x;
  await page.keyboard.down('ArrowLeft');
  await expect.poll(async () => (await snapshot(page)).forward[0]).toBeLessThan(-.1);
  await page.keyboard.up('ArrowLeft');
  expect((await snapshot(page)).aim.x).toBe(aimBeforeTurn);
  await page.keyboard.press('x');
  await expect.poll(async () => (await snapshot(page)).aim.x).toBe(0);
  await page.keyboard.down('q');
  await expect.poll(async () => (await snapshot(page)).rollActive).toBe(true);
  await expect.poll(async () => (await snapshot(page)).rollsCompleted, { timeout: 40_000 }).toBe(1);
  // Keep holding through the cooldown: only a new press may request another roll.
  const elapsed = (await snapshot(page)).elapsed;
  await expect.poll(async () => (await snapshot(page)).elapsed, { timeout: 40_000 }).toBeGreaterThan(elapsed + 1);
  expect((await snapshot(page)).rollsCompleted).toBe(1);
  await page.keyboard.up('q');
  await page.keyboard.press('e');
  await expect.poll(async () => (await snapshot(page)).rollsCompleted, { timeout: 40_000 }).toBe(2);
  expect((await snapshot(page)).rollAngle).toBe(0);
  expect(errors).toEqual([]);
});

test('mouse steers, left button fires, right button zooms; pause and focus loss clear all input', async ({ page }) => {
  test.setTimeout(150_000);
  await openLab(page);
  await page.mouse.move(1050, 350);
  await expect.poll(async () => (await snapshot(page)).forward[0]).toBeGreaterThan(.1);
  expect((await snapshot(page)).aim.x).toBeCloseTo(1050 / 1440 * 2 - 1, 6);
  expect((await snapshot(page)).aim.y).toBeCloseTo(1 - 350 / 1000 * 2, 6);
  const reticle = await page.locator('#reticle').boundingBox();
  expect(reticle!.x + reticle!.width / 2).toBeCloseTo(1050, 1);
  expect(reticle!.y + reticle!.height / 2).toBeCloseTo(350, 1);
  await page.mouse.down({ button: 'left' });
  await expect.poll(async () => (await snapshot(page)).shots).toBeGreaterThan(0);
  await page.mouse.down({ button: 'right' });
  await expect.poll(async () => (await snapshot(page)).cameraFov).toBeLessThan(48);
  await page.keyboard.press('Escape');
  const paused = await snapshot(page);
  expect(paused.state).toBe('paused');
  expect(paused.mouse.fire).toBe(false); expect(paused.mouse.zoom).toBe(false);
  expect(paused.mouse.active).toBe(false); expect(paused.keys).toEqual([]);
  await page.mouse.up({ button: 'left' }); await page.mouse.up({ button: 'right' });
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot(page)).cameraFov).toBeGreaterThan(58);
  expect((await snapshot(page)).shots).toBe(paused.shots);
  await page.mouse.move(400, 500);
  await expect.poll(async () => (await snapshot(page)).mouse.active).toBe(true);
  await page.keyboard.press('ArrowUp');
  expect((await snapshot(page)).mouse.active).toBe(false);
  await page.mouse.move(800, 400); await page.mouse.down({ button: 'left' });
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const blurred = await snapshot(page);
  expect(blurred.state).toBe('paused'); expect(blurred.mouse.fire).toBe(false);
  expect(blurred.mouse.zoom).toBe(false); expect(blurred.mouse.active).toBe(false);
  await page.mouse.up();
  await page.getByRole('button', { name: 'Restart encounter', exact: false }).click();
  const retry = await snapshot(page);
  expect(retry.alive).toBe(3); expect(retry.energy).toBe(100); expect(retry.rollsCompleted).toBe(0);
  expect(retry.shots).toBe(0); expect(retry.aim.x).toBe(0);
  await page.keyboard.press('Escape');
  const frozen = await snapshot(page);
  await page.mouse.move(1300, 150); await page.keyboard.press('w');
  expect((await snapshot(page)).position).toEqual(frozen.position);
});

test('home launcher, retry, reload and return preserve existing checkpoints; assets stay local', async ({ page, baseURL }) => {
  test.setTimeout(150_000);
  const requests: string[] = [], failures: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  await page.goto('./');
  await page.getByRole('button', { name: 'Play quietly', exact: true }).click();
  await page.keyboard.press('Space');
  const saved = await page.evaluate(() => ({ ...localStorage }));
  expect(Object.keys(saved)).toContain('space-dragon.checkpoint.v2');
  await page.getByRole('link', { name: 'Dogfight Lab' }).click();
  await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Restart encounter', exact: false }).click();
  await page.reload();
  await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
  expect((await snapshot(page)).state).toBe('ready');
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(saved);
  await page.getByRole('link', { name: 'Back to Space Dragon' }).click();
  await expect(page.locator('#begin-screen')).toBeVisible();
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(saved);
  expect(requests.filter(url => new URL(url).origin !== new URL(baseURL!).origin)).toEqual([]);
  expect(failures).toEqual([]);
  expect(requests.filter(url => /assets\/dogfight\/.+\.glb/.test(url))).toHaveLength(4);
});

test('a missing model shows a usable retry and return link', async ({ page }) => {
  // Exercise the active dragon's failure path across versioned candidates.
  await page.route('**/assets/dogfight/models/dragon*.glb', route => route.abort());
  await page.goto('dogfight/');
  await expect(page.locator('body')).toHaveAttribute('data-state', 'error', { timeout: 30_000 });
  await expect(page.getByRole('link', { name: 'Reload flight lab' })).toBeVisible();
  await page.getByRole('link', { name: 'Return home', exact: true }).click();
  await expect(page.locator('#begin-screen')).toBeVisible();
});
