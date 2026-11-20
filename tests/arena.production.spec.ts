import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.use({ viewport: { width: 960, height: 640 } });

test("the built arena loads, plays from real keys and carries no development tools", async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('arena/');
  await expect(page.locator('#arena-canvas')).toHaveAttribute('data-ready', 'true', { timeout: 150_000 });
  await expect(page.locator('#arena-canvas')).toHaveAttribute('data-rendered', 'true');
  await expect(page.locator('#begin')).toBeEnabled();
  const hook = await page.evaluate(() => Object.keys((window as unknown as { __LUKE_ARENA__: object }).__LUKE_ARENA__));
  expect(hook, 'no placement or scene access in the shipped page').toEqual(['snapshot']);
  await page.locator('#sound').uncheck();
  await page.locator('#begin').click();
  type Built = { __LUKE_ARENA__: { snapshot(): { sidekick: string; state: { oop: string; hero: { y: number; z: number; mode: string } } } } };
  const z = () => page.evaluate(() => (window as unknown as Built).__LUKE_ARENA__.snapshot().state.hero.z);
  // The sidekick is in the shipped page too: beside him, a real press of T throws Luke, and he lands on his feet.
  await expect(page.locator('#ability-sidekick')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as Built).__LUKE_ARENA__.snapshot().sidekick), { timeout: 120_000 }).toBe('oop');
  await page.keyboard.press('t');
  await expect.poll(() => page.evaluate(() => (window as unknown as Built).__LUKE_ARENA__.snapshot().state.hero.y), { timeout: 120_000 }).toBeGreaterThan(3);
  await expect.poll(() => page.evaluate(() => { const { state } = (window as unknown as Built).__LUKE_ARENA__.snapshot(); return state.oop === '' && state.hero.mode === 'ground'; }), { timeout: 120_000 }).toBe(true);
  await page.keyboard.down('w');
  const landed = await z();
  await expect.poll(z, { timeout: 120_000 }).toBeGreaterThan(landed + 1);
  await page.keyboard.up('w');
  await page.keyboard.press('Escape');
  await expect(page.locator('#paused')).toBeVisible();
  await page.locator('#resume').click();
  await expect(page.locator('#paused')).toBeHidden();
  await expect(page.locator('#arena-canvas')).toHaveAttribute('data-hero-model', 'person', { timeout: 150_000 });
  expect(errors).toEqual([]);
  expect(await readFile('dist/arena/index.html', 'utf8')).toContain("Luke's Arena");
  await page.getByRole('link', { name: '✧ SPACE DRAGON' }).click();
  await expect(page.locator('#begin-explore')).toBeVisible();
});
