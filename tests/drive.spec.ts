import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { DriveState, DriveInput } from '../src/game/drive/simulation.ts';
import { ROUTE } from '../src/game/drive/route.ts';

// Detailed PBR assets compile slowly under the suite's software renderer. Keep
// gameplay assertions unchanged, but start input only after the scene is ready.
test.describe.configure({ timeout: 120_000 });
test.use({ viewport: { width: 960, height: 640 } });
const motionTimeout = 30_000;

interface DriveDebug {
  snapshot(): { state: DriveState; controls: DriveInput; paused: boolean; camera: string; referenceLayout: boolean; frameMs: number[]; metrics: object;
    traffic: { elapsedSeconds: number; vehicles: { id: string; x: number; z: number; yaw: number; s: number; speed: number; direction: 1 | -1 }[];
      signals: { s: number; phase: 'green' | 'amber' | 'red' }[] } };
  advance(input: DriveInput, steps: number): void;
}
const snapshot = (page: Page) => page.evaluate(() => (window as unknown as { __TOWN_DRIVE__: DriveDebug }).__TOWN_DRIVE__.snapshot());
async function ready(page: Page) {
  await expect(page.locator('#drive-canvas')).toHaveAttribute('data-ready', 'true', { timeout: 90_000 });
  await expect(page.locator('#drive-canvas')).toHaveAttribute('data-rendered', 'true');
  await expect(page.locator('#begin')).toBeEnabled();
}
async function begin(page: Page) {
  await page.goto('drive/');
  await ready(page);
  await page.locator('#begin').click();
  await expect(page.locator('#welcome')).toBeHidden();
  await page.locator('#drive-canvas').focus();
}

test('drive loads directly; keyboard accelerates, camera/map work, reset and pause release held input', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await begin(page);
  const initial = await snapshot(page);
  expect(initial.referenceLayout).toBe(true);
  await page.keyboard.down('w');
  await expect.poll(async () => (await snapshot(page)).state.x, { timeout: motionTimeout }).toBeLessThan(initial.state.x - 1);
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
  await expect.poll(async () => (await snapshot(page)).state.speed, { timeout: motionTimeout }).toBeGreaterThan(.3);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect((await snapshot(page)).paused).toBe(true);
  await page.keyboard.up('w'); await page.locator('#resume').click();
  await page.waitForTimeout(200); expect((await snapshot(page)).state.speed).toBe(0);
  expect(errors).toEqual([]);
});

test('semantic throttle reaches first gate, saves once and reloads there without touching Earth saves', async ({ page }) => {
  // This case builds the full scene twice, including a fresh reload.
  test.setTimeout(240_000);
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
  await page.reload(); await ready(page);
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
  await expect.poll(async () => (await snapshot(page)).controls.throttle, { timeout: motionTimeout }).toBe(.25);
  await expect.poll(async () => (await snapshot(page)).state.speed, { timeout: motionTimeout }).toBeGreaterThan(.1);
  await button(7, 0); await frames();
  const gentle = (await snapshot(page)).state.speed;
  expect(gentle).toBeGreaterThan(0);
  await page.keyboard.press('r'); await frames();
  await button(7, 1);
  await expect.poll(async () => (await snapshot(page)).controls.throttle, { timeout: motionTimeout }).toBe(1);
  await expect.poll(async () => (await snapshot(page)).state.speed, { timeout: motionTimeout }).toBeGreaterThan(gentle * 2);
  await button(9, 1); await expect(page.locator('#paused')).toBeVisible();
  await button(9, 0); await page.locator('#resume').click();
  await page.waitForTimeout(250); expect((await snapshot(page)).state.speed).toBe(0);
  await button(7, 0); await frames(); await button(7, .5);
  await expect.poll(async () => (await snapshot(page)).controls.throttle, { timeout: motionTimeout }).toBe(.5);
  await expect.poll(async () => (await snapshot(page)).state.speed, { timeout: motionTimeout }).toBeGreaterThan(.3);
});

test('F2 tuning pauses safely and the reference house is active', async ({ page }) => {
  await page.goto('drive/');
  await ready(page);
  await page.locator('#assist').check(); await page.locator('#begin').click();
  await page.keyboard.press('F2');
  await expect(page.locator('#tuning')).toBeVisible(); expect((await snapshot(page)).paused).toBe(true);
  await expect(page.locator('#tune-assist')).toBeChecked();
  await page.locator('#tune-assist').uncheck();
  await page.keyboard.press('Escape');
  await expect(page.locator('#tuning')).toBeHidden(); expect((await snapshot(page)).state.assist).toBe(false);
  expect((await snapshot(page)).referenceLayout).toBe(true);
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
  test.setTimeout(300_000);
  await begin(page);
  const journey = await page.evaluate(async () => {
    const { ROUTE, lanePoseAt } = await import(new URL('../src/game/drive/route.ts', document.baseURI).href) as typeof import('../src/game/drive/route.ts');
    const debug = (window as unknown as { __TOWN_DRIVE__: DriveDebug }).__TOWN_DRIVE__;
    let result = debug.snapshot();
    const chunks = new Set<number>([(result.metrics as { loadedChunks: number }).loadedChunks]);
    let followedTraffic = false;
    let obeyedSignal = false;
    let lastRendered = result.state;
    let renderedFrames = 0;
    for (let frame = 0; frame < 4000 && !result.state.completed; frame++) {
      const car = result.state;
      const target = lanePoseAt(car.routeS + 8 + Math.abs(car.speed) * .55);
      const delta = Math.atan2(target.x - car.x, target.z - car.z) - car.yaw;
      const error = Math.atan2(Math.sin(delta), Math.cos(delta));
      let desiredSpeed = 20;
      for (const vehicle of result.traffic.vehicles) {
        if (vehicle.direction !== 1) continue;
        const dx = vehicle.x - car.x; const dz = vehicle.z - car.z;
        const gap = dx * Math.sin(car.yaw) + dz * Math.cos(car.yaw);
        const lateral = Math.abs(dx * Math.cos(car.yaw) - dz * Math.sin(car.yaw));
        if (gap <= 0 || gap > 70 || lateral > 2.7) continue;
        const safeSpeed = Math.max(0, vehicle.speed + (gap - 10 - car.speed * .6) * .6);
        if (safeSpeed < desiredSpeed) { desiredSpeed = safeSpeed; followedTraffic = true; }
      }
      for (const signal of result.traffic.signals) {
        if (signal.phase === 'green') continue;
        const distance = (signal.s - 14 - car.routeS + ROUTE.length) % ROUTE.length;
        if (distance > 90) continue;
        if (signal.phase === 'amber' && distance < car.speed * car.speed / 12 + 2) continue;
        desiredSpeed = Math.min(desiredSpeed, Math.sqrt(10 * Math.max(0, distance - 2)));
        obeyedSignal = true;
      }
      const input = { throttle: car.speed < desiredSpeed - .2 ? 1 : 0,
        brake: car.speed > .3 ? Math.min(1, Math.max(0, (car.speed - desiredSpeed) / 2.5)) : 0,
        steer: Math.max(-1, Math.min(1, error * 2.8)), handbrake: desiredSpeed < .3 && car.speed < .5 };
      debug.advance(input, 12);
      result = debug.snapshot();
      // A real frame every 60m or 5 simulated seconds streams each 100m chunk well
      // inside the 310m loaded corridor. Collision/traffic still update every tick.
      if (Math.hypot(result.state.x - lastRendered.x, result.state.z - lastRendered.z) >= 60 ||
        result.state.elapsedSeconds - lastRendered.elapsedSeconds >= 5) {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        result = debug.snapshot(); lastRendered = result.state; renderedFrames++;
        chunks.add((result.metrics as { loadedChunks: number }).loadedChunks);
      }
    }
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    result = debug.snapshot(); renderedFrames++;
    chunks.add((result.metrics as { loadedChunks: number }).loadedChunks);
    return { result, chunks: [...chunks], followedTraffic, obeyedSignal, renderedFrames };
  });
  const { result, followedTraffic, obeyedSignal } = journey;
  await test.info().attach('traffic-route-summary', { contentType: 'application/json', body: JSON.stringify({
    completed: result.state.completed, elapsedSeconds: result.state.elapsedSeconds, routeS: result.state.routeS,
    checkpoints: result.state.visited, chunkCounts: journey.chunks, followedTraffic, obeyedSignal, renderedFrames: journey.renderedFrames,
  }) });
  expect(result.state.completed, `Stopped at ${result.state.routeS}`).toBe(true);
  expect(result.state.visited).toEqual(['home', 'leg-1', 'leg-2', 'leg-3', 'leg-4']);
  expect(journey.chunks.length).toBeGreaterThan(1);
  expect(followedTraffic).toBe(true);
  expect(obeyedSignal).toBe(true);
  await expect(page.locator('#toast')).toContainText('Back home');
  await page.reload(); await ready(page);
  expect((await snapshot(page)).state.completed).toBe(true);
  expect((await snapshot(page)).state.checkpointId).toBe('home');
});
