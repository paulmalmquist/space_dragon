import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { DriveState, DriveInput } from '../src/game/drive/simulation.ts';
import { ROUTE, lanePoseAt } from '../src/game/drive/route.ts';

interface DriveDebug {
  snapshot(): { state: DriveState; controls: DriveInput; paused: boolean; camera: string; localHouse: boolean; frameMs: number[]; metrics: object };
  advance(input: DriveInput, steps: number): void;
}
const snapshot = (page: Page) => page.evaluate(() => (window as unknown as { __TOWN_DRIVE__: DriveDebug }).__TOWN_DRIVE__.snapshot());
async function begin(page: Page) {
  await page.goto('drive/');
  await expect(page.locator('#drive-canvas')).toHaveAttribute('data-rendered', 'true');
  await page.locator('#begin').click();
  await expect(page.locator('#welcome')).toBeHidden();
  await page.locator('#drive-canvas').focus();
}

test('drive loads directly; keyboard accelerates, camera/map work, reset and pause release held input', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await begin(page);
  const initial = await snapshot(page);
  expect(initial.localHouse).toBe(false);
  await page.keyboard.down('w');
  await expect.poll(async () => (await snapshot(page)).state.x).toBeLessThan(initial.state.x - 1);
  await page.keyboard.press('Escape');
  await expect(page.locator('#paused')).toBeVisible();
  const stopped = await snapshot(page);
  await page.waitForTimeout(200);
  expect((await snapshot(page)).state.x).toBe(stopped.state.x);
  await page.keyboard.up('w');
  await page.locator('#resume').click();
  await page.waitForTimeout(200);
  expect((await snapshot(page)).state.speed).toBe(0);
  await page.keyboard.press('c'); expect((await snapshot(page)).camera).toBe('dashboard');
  await page.keyboard.press('m'); await expect(page.locator('#map')).toHaveClass(/expanded/);
  await page.keyboard.press('r');
  expect((await snapshot(page)).state.x).toBeCloseTo(ROUTE.spawn.x);
  await page.keyboard.down('w');
  await expect.poll(async () => (await snapshot(page)).state.speed).toBeGreaterThan(.3);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect((await snapshot(page)).paused).toBe(true);
  await page.keyboard.up('w'); await page.locator('#resume').click();
  await page.waitForTimeout(200); expect((await snapshot(page)).state.speed).toBe(0);
  expect(errors).toEqual([]);
});

test('semantic throttle reaches first gate, saves once and reloads there without touching Earth saves', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('earth-test-seeded')) {
      localStorage.setItem('space-dragon.checkpoint.v2', 'retained-earth-fixture');
      localStorage.setItem('space-dragon.exploration.v1', 'retained-walking-fixture');
      localStorage.setItem('earth-test-seeded', 'yes');
    }
  });
  await begin(page);
  await page.evaluate(() => (window as unknown as { __TOWN_DRIVE__: DriveDebug }).__TOWN_DRIVE__.advance({ throttle: 1, brake: 0, steer: 0, handbrake: false }, 650));
  const reached = await snapshot(page);
  expect(reached.state.checkpointId).toBe('leg-1'); expect(reached.state.visited).toEqual(['home', 'leg-1']);
  const bytes = await page.evaluate(() => localStorage.getItem('space-dragon.drive.v1'));
  await page.keyboard.press('r');
  expect(await page.evaluate(() => localStorage.getItem('space-dragon.drive.v1'))).toBe(bytes);
  await page.reload(); await expect(page.locator('#drive-canvas')).toHaveAttribute('data-rendered', 'true');
  const restored = await snapshot(page);
  expect(restored.state.checkpointId).toBe('leg-1');
  expect(restored.state.x).toBeCloseTo(ROUTE.checkpoints[1].x);
  expect(restored.state.yaw).toBeCloseTo(ROUTE.checkpoints[1].yaw);
  expect(await page.evaluate(() => localStorage.getItem('space-dragon.checkpoint.v2'))).toBe('retained-earth-fixture');
  expect(await page.evaluate(() => localStorage.getItem('space-dragon.exploration.v1'))).toBe('retained-walking-fixture');
});

test('standard controller triggers are proportional, Options pauses and held controls require release', async ({ page }) => {
  await page.addInitScript(() => {
    const mock = { id: 'DualSense standard test', index: 0, connected: true, mapping: 'standard', axes: [0,0,0,0], buttons: Array.from({ length: 17 }, () => ({ value: 0, pressed: false, touched: false })) };
    Object.assign(window, { drivePad: mock });
    Object.defineProperty(navigator, 'getGamepads', { value: () => [mock] });
  });
  await begin(page);
  const frames = () => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await frames();
  const button = async (index: number, value: number) => page.evaluate(({ index, value }) => {
    const pad = (window as unknown as { drivePad: { buttons: { value: number; pressed: boolean }[] } }).drivePad;
    pad.buttons[index].value = value; pad.buttons[index].pressed = value > .5;
  }, { index, value });
  await button(7, .25);
  await expect.poll(async () => (await snapshot(page)).controls.throttle).toBe(.25);
  await expect.poll(async () => (await snapshot(page)).state.speed).toBeGreaterThan(.1);
  await button(7, 0); await frames();
  const gentle = (await snapshot(page)).state.speed;
  expect(gentle).toBeGreaterThan(0);
  await page.keyboard.press('r'); await frames();
  await button(7, 1);
  await expect.poll(async () => (await snapshot(page)).controls.throttle).toBe(1);
  await expect.poll(async () => (await snapshot(page)).state.speed).toBeGreaterThan(gentle * 2);
  await button(9, 1); await expect(page.locator('#paused')).toBeVisible();
  await button(9, 0); await page.locator('#resume').click();
  await page.waitForTimeout(250); expect((await snapshot(page)).state.speed).toBe(0);
  await button(7, 0); await frames(); await button(7, .5);
  await expect.poll(async () => (await snapshot(page)).controls.throttle).toBe(.5);
  await expect.poll(async () => (await snapshot(page)).state.speed).toBeGreaterThan(.3);
});

test('F2 tuning pauses safely; private references cannot be fetched from the fixture server', async ({ page, request }) => {
  await page.goto('drive/');
  await expect(page.locator('#drive-canvas')).toHaveAttribute('data-rendered', 'true');
  await page.locator('#assist').check(); await page.locator('#begin').click();
  await page.keyboard.press('F2');
  await expect(page.locator('#tuning')).toBeVisible(); expect((await snapshot(page)).paused).toBe(true);
  await expect(page.locator('#tune-assist')).toBeChecked();
  await page.locator('#tune-assist').uncheck();
  await page.keyboard.press('Escape');
  await expect(page.locator('#tuning')).toBeHidden(); expect((await snapshot(page)).state.assist).toBe(false);
  expect((await request.get('__drive-layout', { headers: { referer: 'http://127.0.0.1:5175/space-dragon/drive/' } })).status()).toBe(404);
  for (const source of ['assets/reference/videos/IMG_5753.MOV', 'assets/reference/local/environments/house-interior/house-layout.json']) {
    const response = await request.get(`../${source}`); expect([403,404]).toContain(response.status());
  }
});

test('unavailable storage never reports a checkpoint as saved', async ({ page }) => {
  await page.addInitScript(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith('space-dragon.drive.')) throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
      set.call(this, key, value);
    };
  });
  await begin(page);
  await page.evaluate(() => (window as unknown as { __TOWN_DRIVE__: DriveDebug }).__TOWN_DRIVE__.advance({ throttle: 1, brake: 0, steer: 0, handbrake: false }, 650));
  await expect(page.locator('#toast')).toContainText('Storage is unavailable or full');
  await expect(page.locator('#toast')).not.toContainText('Checkpoint saved');
  expect((await snapshot(page)).state.checkpointId).toBe('leg-1');
});

test('rendered route streams all four legs and completes once using steering and throttle inputs', async ({ page }) => {
  test.setTimeout(120_000);
  await begin(page);
  let result = await snapshot(page);
  const chunks = new Set<number>();
  for (let frame = 0; frame < 2000 && !result.state.completed; frame++) {
    const car = result.state;
    const target = lanePoseAt(car.routeS + 8 + Math.abs(car.speed) * .55);
    const delta = Math.atan2(target.x - car.x, target.z - car.z) - car.yaw;
    const error = Math.atan2(Math.sin(delta), Math.cos(delta));
    const input = { throttle: car.speed < 20 ? 1 : 0, brake: car.speed > 21 ? .3 : 0,
      steer: Math.max(-1, Math.min(1, error * 2.8)), handbrake: false };
    await page.evaluate(input => (window as unknown as { __TOWN_DRIVE__: DriveDebug }).__TOWN_DRIVE__.advance(input, 12), input);
    // Allow the renderer to rebuild/dispose nearby chunks throughout the driven journey.
    if (frame % 10 === 0) await page.waitForTimeout(16);
    result = await snapshot(page);
    chunks.add((result.metrics as { loadedChunks: number }).loadedChunks);
  }
  expect(result.state.completed, `Stopped at ${result.state.routeS}`).toBe(true);
  expect(result.state.visited).toEqual(['home', 'leg-1', 'leg-2', 'leg-3', 'leg-4']);
  expect(chunks.size).toBeGreaterThan(1);
  await expect(page.locator('#toast')).toContainText('Back home');
  await page.reload(); await expect(page.locator('#drive-canvas')).toHaveAttribute('data-rendered', 'true');
  expect((await snapshot(page)).state.completed).toBe(true);
  expect((await snapshot(page)).state.checkpointId).toBe('home');
});
