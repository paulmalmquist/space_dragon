import { test, expect, type Page } from '@playwright/test';

type Collider = { id: string; center: number[]; radius: number; surfaceRadius: number };
type CrashSnapshot = {
  state: string; position: number[]; forward: number[]; orientation: number[]; velocity: number[]; speed: number;
  energy: number; keys: string[]; reducedMotion: boolean; cameraFov: number; turnRates: { yaw: number; pitch: number };
  asteroids: { interactive: number; colliders: Collider[] };
  collision: { contacts: number; lastImpact: { colliderId: string; fatal: boolean; normalSpeed: number } | null };
  crash: { active: boolean; started: boolean; id: number; cause: string | null; colliderId: string | null; elapsed: number; duration: number;
    stage: string; pose: { offset: number[]; roll: number; pitch: number; modelVisible: boolean } };
  crashEffects: { active: boolean; debris: number; armorPlates: number; struts: number; particles: number; bursts: number; reducedMotion: boolean };
};
const state = (page: Page): Promise<CrashSnapshot> => page.evaluate(() =>
  (window as unknown as { __SPACE_DRAGON_DOGFIGHT__: { snapshot(): CrashSnapshot } }).__SPACE_DRAGON_DOGFIGHT__.snapshot());
const clearance = (current: CrashSnapshot, target: Collider) => Math.hypot(...current.position.map((value, index) => value - target.center[index])) - target.surfaceRadius;

function stickCoordinate(value: number) {
  const magnitude = Math.min(.8, Math.abs(value));
  return magnitude < .003 ? 0 : Math.sign(value) * (.1 + .8 * magnitude);
}

function localVector(vector: number[], orientation: number[]) {
  const [vx, vy, vz] = vector, [qx, qy, qz, qw] = orientation;
  // Conjugate of the observed unit orientation: world vector -> ship frame.
  const x = -qx, y = -qy, z = -qz;
  const tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx);
  return [vx + qw * tx + y * tz - z * ty, vy + qw * ty + z * tx - x * tz, vz + qw * tz + x * ty - y * tx];
}
const clampStick = (value: number) => Math.max(-.8, Math.min(.8, value));

// Closed-loop pilot input, never a state setter: observe the ship/rock, then
// move the real mouse flight stick. Rate damping avoids steering past the rock.
async function flyIntoAsteroid(page: Page): Promise<{ target: Collider; impact: CrashSnapshot }> {
  const initial = await state(page);
  const target = initial.asteroids.colliders.find(collider => collider.id === 'asteroid-0');
  expect(target, 'the deterministic off-axis solid asteroid exists').toBeTruthy();
  const center = target!.center;
  const viewport = page.viewportSize()!;
  await page.keyboard.down('ShiftLeft');
  const deadline = Date.now() + 150_000;
  try {
    while (Date.now() < deadline) {
      const current = await state(page);
      if (current.state === 'crashing') return { target: target!, impact: current };
      expect(current.state, 'the pilot remains in live flight until a real impact').toBe('playing');
      const relative = localVector(center.map((value, index) => value - current.position[index]), current.orientation);
      const velocity = localVector(current.velocity, current.orientation);
      const yaw = Math.atan2(relative[0], -relative[2]), pitch = Math.atan2(relative[1], Math.hypot(relative[0], relative[2]));
      const horizontal = clampStick(yaw * 2.4 + current.turnRates.yaw * .45 - velocity[0] / Math.max(26, current.speed) * .8);
      const vertical = clampStick(pitch * 2.5 - current.turnRates.pitch * .4 - velocity[1] / Math.max(26, current.speed) * .7);
      await page.mouse.move((.5 + stickCoordinate(horizontal) * .5) * viewport.width, (.5 - stickCoordinate(vertical) * .5) * viewport.height);
      await page.waitForTimeout(60);
    }
  } finally { await page.keyboard.up('ShiftLeft'); }
  throw new Error('Real mouse/boost steering did not reach the solid asteroid before the timeout.');
}

async function launch(page: Page) {
  await page.goto('dogfight/');
  await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-state', 'playing');
}

async function captureCrashStage(page: Page, stage: string, target: Collider, filename: string) {
  await expect.poll(async () => {
    const current = await state(page); expect(clearance(current, target)).toBeGreaterThanOrEqual(3.3);
    return current.crash.stage;
  }, { timeout: 60_000 }).toBe(stage);
  // Actual pause prevents a slow screenshot from capturing a later stage. The
  // screenshot-only stylesheet suppresses the pause card, not simulation state.
  await page.keyboard.press('Escape');
  const held = await state(page); expect(held.state).toBe('paused'); expect(held.crash.stage).toBe(stage);
  await page.screenshot({ path: filename, style: '#overlay { visibility: hidden !important; }' });
  console.log(`Paused mechanical crash capture: ${stage}, elapsed=${held.crash.elapsed.toFixed(3)}, surface clearance=${clearance(held, target).toFixed(3)}m`);
  await page.getByRole('button', { name: 'Resume flight', exact: false }).click();
  await expect(page.locator('body')).toHaveAttribute('data-state', 'crashing');
}

test('a real boosted asteroid collision plays mechanical destruction, pauses, recovers and retries without changing saves', async ({ page }) => {
  test.setTimeout(360_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await launch(page);
  const saved = await page.evaluate(() => ({ ...localStorage }));
  const { target, impact } = await flyIntoAsteroid(page);
  expect(impact.collision.contacts).toBe(1); expect(impact.collision.lastImpact?.colliderId).toBe(target.id);
  expect(impact.collision.lastImpact?.fatal).toBe(true); expect(impact.collision.lastImpact!.normalSpeed).toBeGreaterThanOrEqual(65);
  expect(impact.crash.cause).toBe('asteroid'); expect(impact.crash.colliderId).toBe(target.id);
  expect(impact.crash.duration).toBe(3); expect(impact.crashEffects.armorPlates).toBe(40); expect(impact.crashEffects.struts).toBe(16);
  expect(impact.crashEffects.particles).toBeGreaterThan(0); expect(impact.energy).toBe(0);
  expect(clearance(impact, target)).toBeGreaterThanOrEqual(3.3);
  await expect(page.locator('#overlay')).toBeHidden();
  await expect(page.locator('#combat-message')).toContainText(/IMPACT|RUPTURE/);
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).toHaveAttribute('data-state', 'paused');
  const paused = await state(page); await page.waitForTimeout(220);
  expect((await state(page)).crash).toEqual(paused.crash);
  expect((await state(page)).crashEffects).toEqual(paused.crashEffects);
  expect((await state(page)).position).toEqual(paused.position);
  await page.getByRole('button', { name: 'Resume flight', exact: false }).click();
  await expect(page.locator('body')).toHaveAttribute('data-state', 'crashing');
  await captureCrashStage(page, 'tumble', target, 'artifacts/mechanical-crash-tumble.png');
  await captureCrashStage(page, 'wreckage', target, 'artifacts/mechanical-crash-wreckage.png');
  expect((await state(page)).crash.pose.modelVisible).toBe(false);
  expect(clearance(await state(page), target)).toBeGreaterThanOrEqual(3.3);
  await expect(page.locator('body')).toHaveAttribute('data-state', 'recovery', { timeout: 60_000 });
  const recovered = await state(page); expect(recovered.crash.elapsed).toBe(3); expect(recovered.crash.active).toBe(false);
  await page.waitForTimeout(150); expect((await state(page)).crash.id).toBe(recovered.crash.id);
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(saved);
  await page.getByRole('button', { name: 'Fly again', exact: false }).click();
  const retry = await state(page); expect(retry.state).toBe('playing'); expect(retry.energy).toBe(100);
  expect(retry.collision.contacts).toBe(0); expect(retry.crash.started).toBe(false); expect(retry.crashEffects.debris).toBe(0);
  expect(retry.keys).toEqual([]); expect(retry.asteroids.colliders.find(collider => collider.id === target.id)?.center).toEqual(target.center);
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(saved);
  expect(errors).toEqual([]);
});

test('reduced motion retains a short non-spinning collision sequence before recovery', async ({ page }) => {
  test.setTimeout(300_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await launch(page); expect((await state(page)).reducedMotion).toBe(true);
  const { target, impact } = await flyIntoAsteroid(page);
  expect(clearance(impact, target)).toBeGreaterThanOrEqual(3.3);
  expect(impact.crash.duration).toBe(.8); expect(impact.crashEffects.reducedMotion).toBe(true);
  expect(impact.cameraFov).toBe(61);
  expect(impact.crashEffects.debris).toBe(9); expect(impact.crashEffects.bursts).toBe(1);
  expect(impact.crash.pose.roll).toBe(0); expect(impact.crash.pose.pitch).toBe(0);
  expect(impact.crash.pose.offset.every(value => value === 0)).toBe(true);
  await expect(page.locator('body')).toHaveAttribute('data-state', 'recovery', { timeout: 40_000 });
  expect((await state(page)).crash.elapsed).toBe(.8);
});
