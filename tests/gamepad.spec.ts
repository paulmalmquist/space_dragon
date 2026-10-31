import { test, expect, type Page } from '@playwright/test';

type MockPad = {
  id: string; index: number; connected: boolean; mapping: string;
  axes: number[]; buttons: { pressed: boolean; value: number }[];
};
type Snapshot = {
  rendered: boolean; state: { phase: string }; paused: boolean; mode: string;
  controller: { kind: string; armed: boolean; advanceHeld: boolean };
  exploration: { player: { x: number; z: number } };
  navigation: { cameraYaw: number; moving: boolean };
  camera: { alpha: number; radius: number; target: { x: number; z: number } };
};
const snapshot = (page: Page) => page.evaluate(() =>
  (window as unknown as { __SPACE_DRAGON__: { snapshot(): Snapshot } }).__SPACE_DRAGON__.snapshot());

async function installMockPad(page: Page, mapping = 'standard') {
  await page.addInitScript(initialMapping => {
    const pad = {
      id: 'DualSense Wireless Controller (Vendor: 054c)', index: 0, connected: true, mapping: initialMapping,
      axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    };
    Object.defineProperty(window, '__TEST_CONTROLLER__', { value: pad });
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
  }, mapping);
}
async function updatePad(page: Page, update: { cross?: boolean; axes?: number[]; mapping?: string; connected?: boolean; r2?: number }) {
  await page.evaluate(values => {
    const pad = (window as unknown as { __TEST_CONTROLLER__: MockPad }).__TEST_CONTROLLER__;
    if (values.cross !== undefined) { pad.buttons[0].value = Number(values.cross); pad.buttons[0].pressed = values.cross; }
    if (values.axes) pad.axes = values.axes;
    if (values.mapping !== undefined) pad.mapping = values.mapping;
    if (values.connected !== undefined) pad.connected = values.connected;
    if (values.r2 !== undefined) pad.buttons[7].value = values.r2;
  }, update);
}
async function release(page: Page) {
  await updatePad(page, { cross: false, axes: [0, 0, 0, 0], r2: 0 });
  await expect.poll(async () => (await snapshot(page)).controller.advanceHeld).toBe(false);
  await expect.poll(async () => (await snapshot(page)).controller.armed).toBe(true);
}

test('PlayStation-standard mapping advances current story once per press and controls the 3D camera', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await installMockPad(page); await page.goto('./');
  await expect(page.locator('#controller-status')).toContainText('Controller connected');
  await expect.poll(async () => (await snapshot(page)).controller.kind).toBe('playstation');
  await page.locator('#begin-quiet').click();
  await expect.poll(async () => (await snapshot(page)).rendered).toBe(true);
  await release(page);
  const before = (await snapshot(page)).camera;
  await updatePad(page, { axes: [.6, -.7, .7, 0], r2: 1 });
  await expect.poll(async () => (await snapshot(page)).camera.radius).toBeLessThan(before.radius - .05);
  await release(page);
  const after = (await snapshot(page)).camera;
  expect(after.alpha).not.toBe(before.alpha);
  expect(Math.abs(after.target.x - before.target.x) + Math.abs(after.target.z - before.target.z)).toBeGreaterThan(0);
  await updatePad(page, { cross: true });
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'signal');
  await page.waitForTimeout(160);
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'signal');
  await release(page); await updatePad(page, { cross: true });
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'backyard');
  expect(errors).toEqual([]);
});

test('unmapped controllers are not guessed and unplugging keeps the current keyboard story path', async ({ page }) => {
  await installMockPad(page, ''); await page.goto('./'); await page.locator('#begin-quiet').click();
  await expect(page.locator('#controller-status')).toContainText('no standard mapping');
  await updatePad(page, { cross: true }); await page.waitForTimeout(120);
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'living-room');
  await updatePad(page, { cross: false, mapping: 'standard' });
  await expect(page.locator('#controller-status')).toContainText('Controller connected');
  await updatePad(page, { connected: false });
  await expect(page.locator('#controller-status')).toContainText('Plug in');
  await page.locator('#action').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'signal');
});

test('controller actions stay isolated from the notebook and a held button must be released afterward', async ({ page }) => {
  await installMockPad(page); await page.goto('./'); await page.locator('#begin-quiet').click();
  await expect(page.locator('#controller-status')).toContainText('Controller connected');
  await page.getByRole('button', { name: 'Idea notebook' }).click();
  await updatePad(page, { cross: true });
  await expect.poll(async () => (await snapshot(page)).controller.advanceHeld).toBe(true);
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'living-room');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.waitForTimeout(160);
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'living-room');
  await release(page); await updatePad(page, { cross: true });
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'signal');
});

test('controller walking uses the existing avatar and releases held movement around pause and disconnect', async ({ page }) => {
  await installMockPad(page); await page.goto('./');
  await expect(page.locator('#controller-status')).toContainText('Controller connected');
  await release(page); await updatePad(page, { cross: true });
  await expect(page.locator('body')).toHaveAttribute('data-mode', 'exploration');
  await release(page);
  const before = await snapshot(page);
  await updatePad(page, { axes: [0, -.65, .5, 0] });
  await expect.poll(async () => {
    const next = await snapshot(page);
    return Math.hypot(next.exploration.player.x - before.exploration.player.x, next.exploration.player.z - before.exploration.player.z);
  }).toBeGreaterThan(.05);
  expect((await snapshot(page)).navigation.cameraYaw).not.toBe(before.navigation.cameraYaw);
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).toHaveAttribute('data-paused', 'true');
  await page.locator('#resume').click();
  const stopped = (await snapshot(page)).exploration.player;
  await page.waitForTimeout(200);
  expect((await snapshot(page)).exploration.player).toEqual(stopped);
  await release(page); await updatePad(page, { axes: [.7, 0, 0, 0] });
  await expect.poll(async () => (await snapshot(page)).navigation.moving).toBe(true);
  await updatePad(page, { connected: false });
  await expect(page.locator('#controller-status')).toContainText('Plug in');
  await expect.poll(async () => (await snapshot(page)).navigation.moving).toBe(false);
  await page.keyboard.down('d');
  await expect.poll(async () => (await snapshot(page)).navigation.moving).toBe(true);
  await page.keyboard.up('d');
});
