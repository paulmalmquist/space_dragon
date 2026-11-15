import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { EXPLORATION_SAVE_KEY } from '../src/game/exploration-save.ts';
import type { NavigationSnapshot } from '../src/game/scene.ts';

// Software rendering advances the same fixed-step simulation in slower wall time.
test.describe.configure({ timeout: 150_000 });
const slow = { timeout: 60_000, intervals: [40, 80, 120] };

const navigation = (page: Page): Promise<NavigationSnapshot> => page.evaluate(() =>
  (window as unknown as { __SPACE_DRAGON__: { snapshot(): { navigation: NavigationSnapshot } } }).__SPACE_DRAGON__.snapshot().navigation);
const saved = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null') as { version: number; collected: string[] } | null, EXPLORATION_SAVE_KEY);

/** Start from an ordinary saved ground pose; every movement afterward is real keyboard input. */
async function beginAt(page: Page, pose: { x: number; z: number; yaw: number }, collected: string[] = []) {
  await page.addInitScript(({ key, value }) => {
    if (sessionStorage.getItem('traversal-seeded')) return;
    localStorage.setItem(key, value);
    sessionStorage.setItem('traversal-seeded', 'true');
  }, { key: EXPLORATION_SAVE_KEY, value: JSON.stringify({ version: 2, player: pose, collected }) });
  await page.goto('./');
  await page.locator('#begin-explore').click();
  await expect(page.locator('body')).toHaveAttribute('data-mode', 'exploration');
  await expect(page.locator('#game')).toHaveAttribute('data-rendered', 'true');
  await page.locator('#game').focus();
  await expect.poll(async () => (await navigation(page)).enabled).toBe(true);
  const start = await navigation(page);
  expect(start.state.player).toEqual(pose);
  expect(start.hero.mode).toBe('ground');
}

test('Space jumps, a second press hops higher, and the hero lands where it stood', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await beginAt(page, { x: 5, z: -3.5, yaw: 0 });
  await page.keyboard.down('Space');
  await expect.poll(async () => (await navigation(page)).hero.y, slow).toBeGreaterThan(1);
  expect((await navigation(page)).hero.mode).toBe('air');
  await page.keyboard.up('Space');
  await page.keyboard.down('Space');
  await expect.poll(async () => (await navigation(page)).hero.y, slow).toBeGreaterThan(2.2);
  expect((await navigation(page)).hero.hopAvailable).toBe(false);
  await page.keyboard.up('Space');
  await expect.poll(async () => (await navigation(page)).hero.mode, slow).toBe('ground');
  const landed = await navigation(page);
  expect(landed.hero.y).toBeLessThan(0.05);
  expect(landed.hero.hopAvailable).toBe(true);
  expect(Math.hypot(landed.hero.x - 5, landed.hero.z + 3.5)).toBeLessThan(0.05);
  expect(landed.state.collected).toEqual([]);
  expect(errors).toEqual([]);
});

test('beside the pod Space uses it instead of jumping', async ({ page }) => {
  await beginAt(page, { x: 1.8, z: 0, yaw: 0 });
  await expect.poll(async () => (await navigation(page)).target?.id).toBe('pod');
  await expect(page.locator('#nav-target')).toHaveAttribute('data-state', 'use');
  await page.keyboard.press('Space');
  await expect(page.locator('#nav-message')).toContainText('opens');
  const after = await navigation(page);
  expect(after.hero.mode).toBe('ground');
  expect(after.hero.y).toBeLessThan(0.1);
  await page.keyboard.press('f');
  await expect(page.locator('#nav-message')).toContainText('opens');
});

test('the trampoline launches a walker into a practice spark that survives reload exactly once', async ({ page }) => {
  await beginAt(page, { x: 5.3, z: 3.1, yaw: 0 });
  await expect(page.locator('#nav-sparks')).toHaveAttribute('data-count', '0');
  await page.keyboard.down('d');
  try {
    await expect.poll(async () => (await navigation(page)).hero.y, slow).toBeGreaterThan(2.5);
  } finally { await page.keyboard.up('d'); }
  await expect(page.locator('#nav-sparks')).toHaveAttribute('data-count', '1', { timeout: 60_000 });
  await expect(page.locator('#nav-message')).toContainText('Practice spark 1 of 12');
  // The reward is durable as soon as it is earned, before the hero has even landed.
  expect((await saved(page))?.collected).toEqual(['spark-02']);
  await expect.poll(async () => (await navigation(page)).hero.mode, slow).toBe('ground');
  await page.reload();
  await page.locator('#begin-explore').click();
  await expect(page.locator('#nav-sparks')).toHaveAttribute('data-count', '1');
  expect((await navigation(page)).state.collected).toEqual(['spark-02']);
  expect((await saved(page))?.version).toBe(2);
});

test('a sprint jump on suit power swings from the palm, finds its spark and lets go on release', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await beginAt(page, { x: 5, z: 0.4, yaw: Math.PI / 2 });
  // The camera starts behind the hero, so W runs east through the gate toward the dock.
  await page.keyboard.down('Shift');
  await page.keyboard.down('w');
  try {
    await expect.poll(async () => (await navigation(page)).hero.x, slow).toBeGreaterThan(7.4);
    expect((await navigation(page)).hero.mode).toBe('ground');
    await page.keyboard.down('Space');
    await expect.poll(async () => (await navigation(page)).hero.mode, slow).toBe('swing');
    const swinging = await navigation(page);
    expect(swinging.hero.tetherId).toBe('palm-dock');
    await expect(page.locator('#nav-target')).toHaveAttribute('data-state', 'swing');
    await expect.poll(async () => (await navigation(page)).state.collected, slow).toContain('spark-09');
  } finally {
    await page.keyboard.up('Space');
    await page.keyboard.up('Shift');
    await page.keyboard.up('w');
  }
  // Without suit power the tether lets go; the hero comes to rest on footing, never in the lake.
  await expect.poll(async () => (await navigation(page)).hero.tetherId, slow).toBe('');
  await expect.poll(async () => (await navigation(page)).hero.mode, { ...slow, timeout: 90_000 }).toBe('ground');
  const rest = await navigation(page);
  expect(rest.hero.y).toBeGreaterThan(-0.3);
  expect((await saved(page))?.collected).toContain('spark-09');
  expect(errors).toEqual([]);
});

test('walking into the lake is caught and set back on the shore with nothing lost', async ({ page }) => {
  await beginAt(page, { x: 15, z: 8, yaw: Math.PI / 2 }, ['training-module', 'spark-02']);
  await page.keyboard.down('w');
  try {
    await expect.poll(async () => (await navigation(page)).hero.mode, slow).toBe('catch');
  } finally { await page.keyboard.up('w'); }
  await expect.poll(async () => (await navigation(page)).hero.mode, slow).toBe('ground');
  const back = await navigation(page);
  expect(back.hero.x).toBeLessThan(17);
  expect(back.hero.y).toBeGreaterThanOrEqual(0);
  expect(back.state.collected).toEqual(['training-module', 'spark-02']);
  await expect(page.locator('#nav-inventory')).toHaveAttribute('data-count', '1');
});
