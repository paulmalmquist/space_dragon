import { test, expect, type Page } from '@playwright/test';

type MockPad = {
  id: string;
  index: number;
  connected: boolean;
  mapping: string;
  axes: number[];
  buttons: { pressed: boolean; value: number }[];
};

async function installMockPad(page: Page, mapping = 'standard') {
  await page.addInitScript(initialMapping => {
    const pad = {
      id: 'DualSense Wireless Controller (Vendor: 054c)',
      index: 0,
      connected: true,
      mapping: initialMapping,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    };
    Object.defineProperty(window, '__TEST_CONTROLLER__', { value: pad });
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
  }, mapping);
}

async function updatePad(page: Page, update: { cross?: boolean; axes?: number[]; mapping?: string; connected?: boolean; r2?: number }) {
  await page.evaluate(values => {
    const pad = (window as unknown as { __TEST_CONTROLLER__: MockPad }).__TEST_CONTROLLER__;
    if (values.cross !== undefined) {
      pad.buttons[0].value = Number(values.cross);
      pad.buttons[0].pressed = values.cross;
    }
    if (values.axes) pad.axes = values.axes;
    if (values.mapping !== undefined) pad.mapping = values.mapping;
    if (values.connected !== undefined) pad.connected = values.connected;
    if (values.r2 !== undefined) pad.buttons[7].value = values.r2;
  }, update);
}

test('PlayStation-standard mapping advances exactly once per press and controls the 3D camera', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await installMockPad(page);
  await page.goto('./');
  await expect(page.locator('#controller-status')).toContainText('Controller connected');
  await expect.poll(async () => page.evaluate(() =>
    (window as unknown as { __SPACE_DRAGON__: { snapshot(): { controller: { kind: string } } } }).__SPACE_DRAGON__.snapshot().controller.kind
  )).toBe('playstation');
  await page.waitForFunction(() => (window as unknown as { __SPACE_DRAGON__: { snapshot(): { rendered: boolean } } }).__SPACE_DRAGON__.snapshot().rendered);
  const before = await page.evaluate(() => (window as unknown as {
    __SPACE_DRAGON__: { snapshot(): { camera: { alpha: number; radius: number; target: { x: number; z: number } } } }
  }).__SPACE_DRAGON__.snapshot().camera);
  await updatePad(page, { axes: [0.6, -0.7, 0.7, 0], r2: 1 });
  await page.waitForTimeout(180);
  await updatePad(page, { axes: [0, 0, 0, 0], r2: 0 });
  const after = await page.evaluate(() => (window as unknown as {
    __SPACE_DRAGON__: { snapshot(): { camera: { alpha: number; radius: number; target: { x: number; z: number } } } }
  }).__SPACE_DRAGON__.snapshot().camera);
  expect(after.alpha).not.toBe(before.alpha);
  expect(after.radius).toBeLessThan(before.radius);
  expect(Math.abs(after.target.x - before.target.x) + Math.abs(after.target.z - before.target.z)).toBeGreaterThan(0);

  await updatePad(page, { cross: true });
  await expect(page.getByRole('heading', { name: 'Something has landed.' })).toBeVisible();
  await page.waitForTimeout(120);
  await expect(page.getByRole('heading', { name: 'Something has landed.' })).toBeVisible();
  await updatePad(page, { cross: false });
  await page.waitForTimeout(70);
  await updatePad(page, { cross: true });
  await expect(page.getByRole('heading', { name: 'The message is only the beginning.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Checkpoint reached' })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('unmapped controllers are not guessed, and unplugging falls back without breaking mouse/keyboard', async ({ page }) => {
  await installMockPad(page, '');
  await page.goto('./');
  await expect(page.locator('#controller-status')).toContainText('no standard mapping');
  await updatePad(page, { cross: true });
  await page.waitForTimeout(100);
  await expect(page.getByRole('heading', { name: 'That wasn’t on the screen a moment ago.' })).toBeVisible();
  await updatePad(page, { cross: false, mapping: 'standard' });
  await expect(page.locator('#controller-status')).toContainText('Controller connected');
  await updatePad(page, { connected: false });
  await expect(page.locator('#controller-status')).toContainText('Plug in');
  await page.getByRole('button', { name: 'Follow the signal' }).click();
  await expect(page.getByRole('heading', { name: 'Something has landed.' })).toBeVisible();
});

test('controller actions do not bleed into the idea notebook dialog', async ({ page }) => {
  await installMockPad(page);
  await page.goto('./');
  await expect(page.locator('#controller-status')).toContainText('Controller connected');
  await page.getByRole('button', { name: 'Idea notebook' }).click();
  await updatePad(page, { cross: true });
  await page.waitForTimeout(100);
  await expect(page.getByRole('heading', { name: 'That wasn’t on the screen a moment ago.' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.waitForTimeout(100);
  await expect(page.getByRole('heading', { name: 'That wasn’t on the screen a moment ago.' })).toBeVisible();
  await updatePad(page, { cross: false });
  await page.waitForTimeout(70);
  await updatePad(page, { cross: true });
  await expect(page.getByRole('heading', { name: 'Something has landed.' })).toBeVisible();
});
