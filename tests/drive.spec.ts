import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { DriveState, DriveInput } from '../src/game/drive/simulation.ts';
import { ROUTE, NEIGHBORHOOD_ROUTE, nearestRoutePoint } from '../src/game/drive/route.ts';
import { DRIVE_JUNCTIONS, JUNCTION_CLOSURES } from '../src/game/drive/junctions.ts';

// Detailed PBR assets compile slowly under the suite's software renderer. Keep
// gameplay assertions unchanged, but start input only after the scene is ready.
test.describe.configure({ timeout: 120_000 });
test.use({ viewport: { width: 960, height: 640 } });
const motionTimeout = 30_000;

interface DriveDebug {
  snapshot(): { state: DriveState; controls: DriveInput; paused: boolean; camera: string; look: { yaw: number; pitch: number }; referenceLayout: boolean; frameMs: number[]; metrics: object;
    traffic: { elapsedSeconds: number; vehicles: { id: string; x: number; z: number; yaw: number; s: number; speed: number; direction: 1 | -1 }[];
      signals: { s: number; phase: 'green' | 'amber' | 'red' }[] } };
  advance(input: DriveInput, steps: number): void;
  inspectAt(s: number, mode?: 'chase' | 'dashboard' | 'orbit'): void;
}
interface PedestrianMetrics {
  loaded: boolean; population: number; renderedPedestrians: number; elapsedSeconds: number;
  pedestrians: { id: string; x: number; z: number; animationFrame: number }[];
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

// Earn the checkpoint through the mapped neighborhood's turns; no pose writes.
async function driveToFirstCheckpoint(page: Page) {
  await page.evaluate(async () => {
    const { lanePoseAt, recommendedSpeedAt } = await import(new URL('../src/game/drive/route.ts', document.baseURI).href) as typeof import('../src/game/drive/route.ts');
    const debug = (window as unknown as { __TOWN_DRIVE__: DriveDebug }).__TOWN_DRIVE__;
    for (let frame = 0; frame < 1000; frame++) {
      const result = debug.snapshot(); const car = result.state;
      if (car.checkpointId === 'leg-1') return;
      const target = lanePoseAt(car.routeS + 3 + Math.abs(car.speed) * .35);
      const delta = Math.atan2(target.x - car.x, target.z - car.z) - car.yaw;
      const error = Math.atan2(Math.sin(delta), Math.cos(delta));
      let desired = recommendedSpeedAt(car.routeS);
      for (const vehicle of result.traffic.vehicles) {
        if (vehicle.direction !== 1) continue;
        const dx = vehicle.x - car.x; const dz = vehicle.z - car.z;
        const gap = dx * Math.sin(car.yaw) + dz * Math.cos(car.yaw);
        const lateral = Math.abs(dx * Math.cos(car.yaw) - dz * Math.sin(car.yaw));
        if (gap > 0 && gap < 35 && lateral < 2.7) desired = Math.min(desired, Math.max(0, vehicle.speed + (gap - 10 - car.speed * .6) * .6));
      }
      debug.advance({ throttle: car.speed < desired - .2 ? 1 : 0,
        brake: car.speed > .3 ? Math.min(1, Math.max(0, (car.speed - desired) / 2.5)) : 0,
        steer: Math.max(-1, Math.min(1, error * 3)), handbrake: desired < .3 && car.speed < .5 }, 12);
      if (frame % 20 === 0) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }
    throw new Error(`Mapped home exit did not reach Hypoluxo: ${JSON.stringify(debug.snapshot().state)}`);
  });
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

test('optional minivan cabin looks both ways, releases on pause and uses the real route name', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('drive/'); await ready(page);
  await page.locator('#cabin-start').check(); await page.locator('#begin').click();
  expect((await snapshot(page)).camera).toBe('dashboard');
  await expect(page.locator('#first-person')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.speed-cluster')).toBeHidden();
  const walkers = async () => ((await snapshot(page)).metrics as { pedestrians: PedestrianMetrics }).pedestrians;
  await expect.poll(async () => (await walkers()).renderedPedestrians, { timeout: motionTimeout }).toBeGreaterThan(0);
  expect((await walkers()).population).toBe(40);
  const originalWalker = (await walkers()).pedestrians[0];
  await expect.poll(async () => {
    const current = (await walkers()).pedestrians.find(person => person.id === originalWalker.id)!;
    return Math.hypot(current.x - originalWalker.x, current.z - originalWalker.z);
  }, { timeout: motionTimeout }).toBeGreaterThan(.08);
  await page.keyboard.down('q');
  await expect.poll(async () => (await snapshot(page)).look.yaw, { timeout: motionTimeout }).toBeLessThan(-1.2);
  expect((await snapshot(page)).controls.steer).toBe(0);
  await page.keyboard.press('Escape'); await page.keyboard.up('q');
  await expect.poll(async () => Math.abs((await snapshot(page)).look.yaw), { timeout: motionTimeout }).toBeLessThan(.05);
  expect((await snapshot(page)).paused).toBe(true);
  const frozenWalkers = (await walkers()).pedestrians;
  await page.waitForTimeout(250);
  expect((await walkers()).pedestrians).toEqual(frozenWalkers);
  await page.locator('#resume').click();
  await page.keyboard.down('e');
  await expect.poll(async () => (await snapshot(page)).look.yaw, { timeout: motionTimeout }).toBeGreaterThan(1.2);
  await page.keyboard.up('e');
  await expect.poll(async () => Math.abs((await snapshot(page)).look.yaw), { timeout: motionTimeout }).toBeLessThan(.05);
  await page.mouse.move(430, 300); await page.mouse.down(); await page.mouse.move(710, 300, { steps: 4 });
  await expect.poll(async () => (await snapshot(page)).look.yaw, { timeout: motionTimeout }).toBeGreaterThan(1);
  await page.mouse.up();
  await expect.poll(async () => Math.abs((await snapshot(page)).look.yaw), { timeout: motionTimeout }).toBeLessThan(.05);
  await page.keyboard.press('v'); expect((await snapshot(page)).camera).toBe('chase');
  await expect(page.locator('#first-person')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.speed-cluster')).toBeVisible();
  const lantana = ROUTE.sections.find(section => section.id === 'leg-3')!;
  await page.evaluate(s => (window as unknown as { __TOWN_DRIVE__: DriveDebug }).__TOWN_DRIVE__.inspectAt(s, 'dashboard'), lantana.startS + 120);
  await expect(page.locator('#route-label')).toHaveText('LANTANA ROAD', { timeout: motionTimeout });
  const development = ((await snapshot(page)).metrics as { development: { leftLots: number; rightLots: number; buildings: number } }).development;
  expect(development.leftLots).toBeGreaterThan(0); expect(development.rightLots).toBeGreaterThan(0);
  expect(development.buildings).toBeGreaterThan(10);
  expect(errors).toEqual([]);
});

test('semantic steering reaches the mapped exit, saves once and reloads there without touching Earth saves', async ({ page }) => {
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
  await driveToFirstCheckpoint(page);
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
  await page.locator('#fresh-start').check(); await page.locator('#begin').click();
  expect((await snapshot(page)).state.checkpointId).toBe('home');
  expect((await snapshot(page)).state.visited).toEqual(['home']);
  expect((await snapshot(page)).state.x).toBeCloseTo(ROUTE.spawn.x);
  expect(await page.evaluate(() => localStorage.getItem('space-dragon.checkpoint.v2'))).toBe('retained-earth-fixture');
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
  await driveToFirstCheckpoint(page);
  await expect(page.locator('#toast')).toContainText('Storage is unavailable or full');
  await expect(page.locator('#toast')).not.toContainText('Checkpoint saved');
  expect((await snapshot(page)).state.checkpointId).toBe('leg-1');
});

test('rendered route streams all four legs and completes once using steering and throttle inputs', async ({ page }) => {
  test.setTimeout(process.env.CI ? 600_000 : 420_000);
  await begin(page);
  const journey = await page.evaluate(async () => {
    const { ROUTE, lanePoseAt, recommendedSpeedAt } = await import(new URL('../src/game/drive/route.ts', document.baseURI).href) as typeof import('../src/game/drive/route.ts');
    const debug = (window as unknown as { __TOWN_DRIVE__: DriveDebug }).__TOWN_DRIVE__;
    let result = debug.snapshot();
    const chunks = new Set<number>([(result.metrics as { loadedChunks: number }).loadedChunks]);
    let followedTraffic = false;
    let obeyedSignal = false;
    let lastRendered = result.state;
    let renderedFrames = 0;
    for (let frame = 0; frame < 4000 && !result.state.completed; frame++) {
      const car = result.state;
      const localSpeed = recommendedSpeedAt(car.routeS);
      const target = lanePoseAt(car.routeS + (localSpeed < 12 ? 3 + Math.abs(car.speed) * .35 : 8 + Math.abs(car.speed) * .55));
      const delta = Math.atan2(target.x - car.x, target.z - car.z) - car.yaw;
      const error = Math.atan2(Math.sin(delta), Math.cos(delta));
      let desiredSpeed = localSpeed;
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
        steer: Math.max(-1, Math.min(1, error * 3)), handbrake: desiredSpeed < .3 && car.speed < .5 };
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

test('moving minivan and camera stay attached through steering, cabin switching, pause and reset', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await begin(page);
  await page.evaluate((s: number) => (window as unknown as { __TOWN_DRIVE__: DriveDebug }).__TOWN_DRIVE__.inspectAt(s, 'chase'), ROUTE.sections[1].startS + 65);
  await page.keyboard.press('Escape'); await page.keyboard.down('w');
  await expect.poll(async () => (await snapshot(page)).state.speed, { timeout: motionTimeout }).toBeGreaterThan(4);
  // Observe completed scene renders, not elapsed wall time: under SwiftShader a
  // 120ms key press can fit entirely between frames. No simulation is advanced
  // by this sampler; keyboard input and the real render loop own every pose.
  const samples = async (simulationSeconds: number, minimumFrames = 6) => page.evaluate(({ simulationSeconds, minimumFrames, timeout }) => {
    type Sample = { x: number; y: number; z: number; bodyY: number; speed: number; yaw: number; elapsedSeconds: number };
    const debug = (window as unknown as { __TOWN_DRIVE__: DriveDebug & {
      scene: { onAfterRenderObservable: { add(callback: () => void): unknown; remove(observer: unknown): void } };
    } }).__TOWN_DRIVE__;
    const data: Sample[] = [];
    const start = debug.snapshot().state.elapsedSeconds;
    return new Promise<Sample[]>((resolve, reject) => {
      const renders = debug.scene.onAfterRenderObservable;
      const observer = renders.add(() => {
        const snap = debug.snapshot();
        const m = snap.metrics as { carPosition: number[]; carYaw: number; cameraPosition: number[] };
        const dx = m.cameraPosition[0] - m.carPosition[0]; const dz = m.cameraPosition[2] - m.carPosition[2];
        data.push({ x: dx * Math.cos(m.carYaw) - dz * Math.sin(m.carYaw),
          y: m.cameraPosition[1] - m.carPosition[1], z: dx * Math.sin(m.carYaw) + dz * Math.cos(m.carYaw),
          bodyY: m.carPosition[1], speed: snap.state.speed, yaw: m.carYaw, elapsedSeconds: snap.state.elapsedSeconds });
        if (data.length >= minimumFrames && snap.state.elapsedSeconds - start >= simulationSeconds) {
          renders.remove(observer); window.clearTimeout(timer); resolve(data);
        }
      });
      const timer = window.setTimeout(() => {
        renders.remove(observer);
        reject(new Error(`Camera sampling timed out: ${data.length}/${minimumFrames} rendered frames, ` +
          `${(data.at(-1)?.elapsedSeconds ?? start) - start}/${simulationSeconds} simulated seconds; last=${JSON.stringify(data.at(-1))}`));
      }, timeout);
    });
  }, { simulationSeconds, minimumFrames, timeout: motionTimeout });
  const chase = await samples(0, 2);
  await page.keyboard.down('d');
  try { chase.push(...await samples(.12, 4)); }
  finally { await page.keyboard.up('d'); }
  expect(chase.length).toBeGreaterThan(3);
  expect(Math.max(...chase.map(p => Math.abs(p.x)))).toBeLessThan(.001);
  expect(Math.max(...chase.map(p => Math.abs(p.y - 3.55)))).toBeLessThan(.001);
  expect(Math.abs(chase.at(-1)!.yaw - chase[0].yaw)).toBeGreaterThan(.01);
  await page.keyboard.press('v');
  const cabin = await samples(1);
  expect(cabin.length).toBeGreaterThan(3);
  for (const pose of cabin) {
    expect(pose.x).toBeCloseTo(-.46, 5); expect(pose.y).toBeCloseTo(1.42, 5); expect(pose.z).toBeCloseTo(.42, 5);
    expect(pose.bodyY).toBe(0);
  }
  await page.keyboard.up('w'); await page.keyboard.press('Escape');
  const parked = await samples(0, 4);
  expect(parked.every(p => p.speed === 0 && p.bodyY === 0)).toBe(true);
  await page.keyboard.press('r');
  const reset = await samples(0, 4);
  expect(reset.every(p => Math.abs(p.x + .46) < .001 && Math.abs(p.z - .42) < .001)).toBe(true);
  expect((await snapshot(page)).state.checkpointId).toBe('home');
  expect(errors).toEqual([]);
});

test('mapped junction arms and police closures stream into the real scene', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await begin(page);
  for (const junction of DRIVE_JUNCTIONS) {
    const observed = await page.evaluate(({ id, s }) => {
      const debug = (window as unknown as { __TOWN_DRIVE__: DriveDebug & {
        scene: { meshes: { name: string; isVisible: boolean; isEnabled(): boolean; getTotalVertices(): number }[] }
      } }).__TOWN_DRIVE__;
      debug.inspectAt(s, 'orbit');
      const metrics = debug.snapshot().metrics as { junctions: {
        junctions: { id: string; visible: boolean; topology: string; arms: { use: string }[] }[];
        closedArms: number; collisionProxies: number;
      } };
      const meshes = debug.scene.meshes;
      return { junction: metrics.junctions.junctions.find(j => j.id === id),
        closedArms: metrics.junctions.closedArms, collisionProxies: metrics.junctions.collisionProxies,
        policeBodies: meshes.filter(mesh => mesh.name.startsWith(`drive.junction.police.closure.${id}.`) &&
          mesh.name.endsWith('.paint') && mesh.isVisible && mesh.isEnabled() && mesh.getTotalVertices() > 0).length,
        pavement: meshes.some(mesh => mesh.name.startsWith(`drive.junction.${id}.batch.`) && mesh.isEnabled() && mesh.getTotalVertices() > 0),
      };
    }, { id: junction.id, s: nearestRoutePoint(junction.x, junction.z).s });
    expect(observed.junction?.visible).toBe(true);
    expect(observed.junction?.topology).toBe(junction.topology);
    expect(observed.junction?.arms.length).toBe(junction.arms.length);
    expect(observed.policeBodies).toBe(JUNCTION_CLOSURES.filter(closure => closure.junctionId === junction.id).length);
    expect(observed.pavement).toBe(true);
    expect(observed.closedArms).toBe(11);
    expect(observed.collisionProxies).toBeGreaterThan(100);
  }
  expect(errors).toEqual([]);
});

test('the gate route uses Winston Trails South and renders the mapped lakes and residential context', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('drive/'); await ready(page);
  await expect(page.locator('#welcome')).toContainText('right onto Green Island Boulevard, then left onto Winston Trails South');
  await page.locator('#begin').click();
  const observed = await page.evaluate(s => {
    const debug = (window as unknown as { __TOWN_DRIVE__: DriveDebug & {
      scene: { meshes: { name: string; metadata?: { streetName?: string; sourceWaterId?: number };
        isEnabled(): boolean; getTotalIndices(): number }[] }
    } }).__TOWN_DRIVE__;
    debug.inspectAt(s, 'dashboard');
    const metrics = debug.snapshot().metrics as { neighborhood: { context: {
      lakes: number; sourceRoads: number; estimatedLots: number; estimatedBuildings: boolean;
    } } };
    return { context: metrics.neighborhood.context,
      lakeMeshes: debug.scene.meshes.filter(mesh => mesh.metadata?.sourceWaterId && mesh.isEnabled() && mesh.getTotalIndices() > 6)
        .map(mesh => mesh.metadata!.sourceWaterId).sort(),
      streetNames: debug.scene.meshes.map(mesh => mesh.metadata?.streetName).filter(Boolean) };
  }, NEIGHBORHOOD_ROUTE.gateS - 65);
  await expect(page.locator('#route-label')).toHaveText('WINSTON TRAILS SOUTH', { timeout: motionTimeout });
  expect(observed.context.lakes).toBe(4);
  expect(observed.context.sourceRoads).toBeGreaterThan(20);
  expect(observed.context.estimatedLots).toBeGreaterThan(40);
  expect(observed.context.estimatedBuildings).toBe(true);
  expect(observed.lakeMeshes).toEqual([186588742, 186588755, 187968473, 187968475]);
  expect(observed.streetNames).toContain('Winston Trails South');
  expect(observed.streetNames).not.toContain('Green Island Terrace');
  expect(errors).toEqual([]);
});
