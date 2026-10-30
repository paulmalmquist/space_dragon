import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { DriveInput, DriveState } from '../src/game/drive/simulation.ts';
import type { TrafficSignal, TrafficSignalPhase, TrafficVehicle } from '../src/game/drive/traffic.ts';
import { ROUTE } from '../src/game/drive/route.ts';

test.use({ viewport: { width: 960, height: 640 } });

type VehiclePose = TrafficVehicle & { x: number; z: number; yaw: number };
type Signal = TrafficSignal & { phase: TrafficSignalPhase };
interface TrafficSnapshot {
  state: DriveState;
  paused: boolean;
  traffic: { count: number; elapsedSeconds: number; vehicles: VehiclePose[]; signals: Signal[] };
  metrics: { traffic: { renderedVehicles: number; vehicles: VehiclePose[] }; signals: Record<string, TrafficSignalPhase> };
}
interface TrafficDebug {
  snapshot(): TrafficSnapshot;
  advance(input: DriveInput, steps: number): void;
  inspectAt(s: number, camera: 'chase' | 'dashboard' | 'orbit'): void;
}
const idle = { throttle: 0, brake: 0, steer: 0, handbrake: false };
const snapshot = (page: Page) => page.evaluate(() => (window as unknown as { __TOWN_DRIVE__: TrafficDebug }).__TOWN_DRIVE__.snapshot());
const frame = (page: Page) => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
const advance = (page: Page, steps: number) => page.evaluate(({ input, steps }) => {
  (window as unknown as { __TOWN_DRIVE__: TrafficDebug }).__TOWN_DRIVE__.advance(input, steps);
}, { input: idle, steps });

test('traffic moves in both directions, pauses, stops at signals and preserves recovery checkpoints', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('drive/');
  await expect(page.locator('#drive-canvas')).toHaveAttribute('data-ready', 'true', { timeout: 90_000 });
  await page.locator('#begin').click();
  await expect(page.locator('#welcome')).toBeHidden();
  await frame(page);
  const initial = await snapshot(page);
  expect(initial.traffic.count).toBeGreaterThan(20);
  expect(initial.metrics.traffic.renderedVehicles).toBeGreaterThan(0);
  const directions = new Set(initial.metrics.traffic.vehicles.filter(vehicle => vehicle.id.startsWith('traffic.')).map(vehicle => vehicle.direction));
  expect([...directions].sort()).toEqual([-1, 1]);

  await advance(page, 120);
  await frame(page);
  const moved = await snapshot(page);
  for (const direction of [-1, 1]) {
    const moving = moved.metrics.traffic.vehicles.find(vehicle => {
      const before = initial.metrics.traffic.vehicles.find(item => item.id === vehicle.id);
      return vehicle.direction === direction && before && Math.hypot(vehicle.x - before.x, vehicle.z - before.z) > 2;
    });
    expect(moving, `No rendered vehicle moved in direction ${direction}`).toBeDefined();
  }

  await page.keyboard.press('Escape');
  await expect(page.locator('#paused')).toBeVisible();
  const paused = await snapshot(page);
  await advance(page, 120);
  await page.waitForTimeout(250);
  expect((await snapshot(page)).traffic).toEqual(paused.traffic);
  await page.locator('#resume').click();

  // Catch an actual moving vehicle with normal throttle on the first straight.
  // A bounded semantic batch avoids tying collision coverage to software GPU FPS.
  const collision = await page.evaluate(({ entryS, narrowZ, wideZ }) => {
    const debug = (window as unknown as { __TOWN_DRIVE__: TrafficDebug }).__TOWN_DRIVE__;
    for (let tick = 0; tick < 2400; tick += 6) {
      const car = debug.snapshot().state;
      const lookAhead = 8 + Math.abs(car.speed) * .55;
      const targetZ = car.routeS + lookAhead >= entryS ? wideZ : narrowZ;
      const delta = Math.atan2(-lookAhead, targetZ - car.z) - car.yaw;
      const steer = Math.max(-1, Math.min(1, Math.atan2(Math.sin(delta), Math.cos(delta)) * 2.8));
      debug.advance({ throttle: 1, brake: 0, steer, handbrake: false }, 6);
      const current = debug.snapshot();
      if (current.state.bonkSeconds > 0 && current.traffic.vehicles.some(vehicle =>
        Math.hypot(vehicle.x - current.state.x, vehicle.z - current.state.z) < 6)) return current;
    }
    return null;
  }, { entryS: ROUTE.sections[1].startS, narrowZ: ROUTE.spawn.z, wideZ: ROUTE.checkpoints[1].z });
  expect(collision, 'Throttle never reached a traffic collision on the first straight').not.toBeNull();
  expect(collision!.state.checkpointId).toBe('leg-1');
  expect(collision!.state.speed).toBeLessThan(20);
  expect(collision!.traffic.vehicles.some(vehicle => Math.hypot(vehicle.x - collision!.state.x, vehicle.z - collision!.state.z) < 6)).toBe(true);
  const saved = await page.evaluate(() => localStorage.getItem('space-dragon.drive.v1'));
  await page.keyboard.press('r');
  const restored = await snapshot(page);
  expect(restored.state.x).toBeCloseTo(ROUTE.checkpoints[1].x);
  expect(restored.state.z).toBeCloseTo(ROUTE.checkpoints[1].z);
  expect(restored.state.speed).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem('space-dragon.drive.v1'))).toBe(saved);

  // Inspect the signal presentation without awarding progress or repositioning NPCs.
  const signal = restored.traffic.signals.find(item => item.id.endsWith('canopy-midpoint'))!;
  expect(signal).toBeDefined();
  await page.evaluate(s => (window as unknown as { __TOWN_DRIVE__: TrafficDebug }).__TOWN_DRIVE__.inspectAt(s, 'orbit'), signal.s - 45);
  await page.keyboard.press('Escape');
  const beforeRed = await snapshot(page);
  const cyclePosition = (beforeRed.state.elapsedSeconds + signal.offsetSeconds) % 31;
  const toRed = (28 - cyclePosition + 31) % 31;
  await advance(page, Math.ceil(toRed * 60));
  await frame(page);
  const red = await snapshot(page);
  expect(red.traffic.signals.find(item => item.id === signal.id)!.phase).toBe('red');
  expect(red.metrics.signals[signal.id]).toBe('red');
  const stopped = red.traffic.vehicles.find(vehicle => vehicle.speed < .15 && vehicle.braking &&
    Math.abs(vehicle.s - (signal.s - vehicle.direction * 12)) < 1);
  expect(stopped, 'Expected an NPC stopped before the red signal').toBeDefined();
  expect(red.metrics.traffic.vehicles.find(vehicle => vehicle.id === stopped!.id)?.braking).toBe(true);
  await advance(page, 600);
  await frame(page);
  const green = await snapshot(page);
  expect(green.metrics.signals[signal.id]).toBe('green');
  const departed = green.traffic.vehicles.find(vehicle => vehicle.id === stopped!.id)!;
  expect(departed).toBeDefined();
  expect(departed.speed).toBeGreaterThan(2);
  expect(Math.hypot(departed.x - stopped!.x, departed.z - stopped!.z)).toBeGreaterThan(5);
  expect(await page.evaluate(() => localStorage.getItem('space-dragon.drive.v1'))).toBe(saved);
  await page.reload();
  await expect(page.locator('#drive-canvas')).toHaveAttribute('data-ready', 'true', { timeout: 90_000 });
  expect((await snapshot(page)).state.checkpointId).toBe('leg-1');
  expect((await snapshot(page)).state.visited).toEqual(['home', 'leg-1']);
  expect(errors).toEqual([]);
});
