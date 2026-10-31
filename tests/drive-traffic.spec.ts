import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { DriveInput, DriveState } from '../src/game/drive/simulation.ts';
import type { TrafficSignal, TrafficSignalPhase, TrafficVehicle } from '../src/game/drive/traffic.ts';
import { ROUTE, pointAtDistance, laneOffset } from '../src/game/drive/route.ts';

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
  // Inspect the first public road so traffic visibility is independent of the home-exit length.
  await page.evaluate(s => (window as unknown as { __TOWN_DRIVE__: TrafficDebug }).__TOWN_DRIVE__.inspectAt(s, 'chase'), ROUTE.sections[1].startS + 100);
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

  // Cross the actual first checkpoint, then catch a moving vehicle using route-relative steering.
  // Starting just before that gate keeps collision coverage separate from the full home-exit journey.
  await page.evaluate(s => (window as unknown as { __TOWN_DRIVE__: TrafficDebug }).__TOWN_DRIVE__.inspectAt(s, 'chase'), ROUTE.checkpoints[1].s - 35);
  await page.keyboard.press('Escape');
  const path = Array.from({ length: Math.ceil(ROUTE.length / 2) + 1 }, (_, index) => {
    const point = pointAtDistance(Math.min(index * 2, ROUTE.length - .001));
    const section = ROUTE.sections[point.sectionIndex];
    return { ...point, offset: laneOffset(section), laneWidth: section.laneWidth, lanes: section.lanes };
  });
  const collision = await page.evaluate(({ path, routeLength, firstEndS }) => {
    const debug = (window as unknown as { __TOWN_DRIVE__: TrafficDebug }).__TOWN_DRIVE__;
    for (let tick = 0; tick < 3600; tick += 6) {
      const before = debug.snapshot(),car=before.state;
      const lookAhead = 8 + Math.abs(car.speed) * .55;
      const targetS = (car.routeS + lookAhead) % routeLength;
      const index = Math.min(path.length-2,Math.floor(targetS/2));
      const a=path[index],b=path[index+1],fraction=(targetS-a.s)/(b.s-a.s||1);
      const current=path[Math.min(path.length-1,Math.floor(car.routeS/2))];
      // Once the checkpoint is earned, enter a real same-direction NPC lane to exercise collision.
      const leader=car.checkpointId==='leg-1'?before.traffic.vehicles.filter(vehicle=>
        vehicle.direction===1&&vehicle.s>car.routeS+3&&vehicle.s<Math.min(firstEndS-65,car.routeS+180)
      ).sort((left,right)=>left.s-right.s)[0]:undefined;
      const lane=leader?Math.min(leader.lane,a.lanes-1,current.lanes-1):0;
      const offset=Math.min(a.offset+lane*a.laneWidth,current.offset+lane*current.laneWidth);
      const x=a.x+(b.x-a.x)*fraction+Math.cos(a.yaw)*offset;
      const z=a.z+(b.z-a.z)*fraction-Math.sin(a.yaw)*offset;
      const delta=Math.atan2(x-car.x,z-car.z)-car.yaw;
      const heading=Math.atan2(Math.sin(delta),Math.cos(delta));
      const steer=Math.max(-1,Math.min(1,heading*2.8));
      const targetSpeed=car.checkpointId==='home'||Math.abs(heading)>.35?8:25;
      debug.advance({ throttle:car.speed<targetSpeed?1:0, brake:car.speed>targetSpeed+1?1:0, steer, handbrake:false },6);
      const result=debug.snapshot();
      if(result.state.checkpointId==='leg-1'&&result.state.bonkSeconds>0&&result.traffic.vehicles.some(vehicle=>
        vehicle.direction===1&&Math.hypot(vehicle.x-result.state.x,vehicle.z-result.state.z)<6))return result;
    }
    return null;
  }, { path, routeLength:ROUTE.length, firstEndS:ROUTE.sections[1].endS });
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
