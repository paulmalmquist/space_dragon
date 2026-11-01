import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { createFirstContact } from '../src/game/scene';

type Snapshot = ReturnType<ReturnType<typeof createFirstContact>['snapshot']>;
const snapshot = (page: Page) => page.evaluate(() =>
  (window as unknown as { __SPACE_DRAGON__: { snapshot(): Snapshot } }).__SPACE_DRAGON__.snapshot());
const saves = (page: Page) => page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key !== 'space-dragon.visual-quality.v1')));

test('quality, fixed cameras and measurements preserve story rewards and resume safely', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).hostname !== '127.0.0.1') external.push(request.url()); });
  await page.goto('./');
  await page.locator('#begin-quiet').click();
  await expect(page.locator('#game')).toHaveAttribute('data-asset-loaded', 'true', { timeout: 30000 });
  await page.locator('#action').click();
  await page.locator('#action').click();
  const saved = await saves(page);
  await page.locator('#visual-review summary').click();
  await page.locator('#reduce-motion').check();
  for (const quality of ['low', 'balanced', 'high', 'cinematic']) {
    await page.locator('#visual-quality').selectOption(quality);
    await page.locator('#visual-shot').selectOption('arrival');
    await expect.poll(async () => (await snapshot(page)).visual.ready, { timeout: 30000 }).toBe(true);
    expect((await snapshot(page)).visual).toMatchObject({ quality, shot: 'arrival' });
    expect(await saves(page)).toEqual(saved);
    expect((await snapshot(page)).performance.renderWidth).toBeGreaterThan(0);
  }
  await page.locator('#visual-quality').selectOption('low');
  await page.locator('#performance-visible').check();
  await expect(page.locator('#performance-overlay')).toBeVisible();
  await expect.poll(async () => (await snapshot(page)).performance.sampleCount, { timeout: 30000 }).toBeGreaterThan(5);
  const measured = (await snapshot(page)).performance;
  expect(measured.p95FrameMs).toBeGreaterThanOrEqual(measured.medianFrameMs);
  expect(measured.drawCalls).toBeGreaterThan(0);
  await page.locator('#pause').click();
  const paused = await snapshot(page);
  await page.waitForTimeout(250);
  expect((await snapshot(page)).frames).toBe(paused.frames);
  await page.locator('#resume').click();
  await page.locator('#performance-reset').click();
  expect((await snapshot(page)).performance.sampleCount).toBeLessThan(5);
  await page.locator('#action').click();
  expect((await snapshot(page)).visual.shot).toBeNull();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'suits');
  await page.reload();
  await expect(page.locator('#visual-quality')).toHaveValue('low');
  await page.locator('#begin-quiet').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'suits');
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('visual review returns to walking and invalid preferences fail safely', async ({ page }) => {
  test.setTimeout(90000);
  await page.addInitScript(() => localStorage.setItem('space-dragon.visual-quality.v1', 'unknown-quality'));
  await page.goto('./');
  await expect(page.locator('#visual-quality')).toHaveValue('balanced');
  await page.locator('#begin-quiet').click();
  await page.locator('#visual-review summary').click();
  await page.locator('#visual-shot').selectOption('reveal');
  const before = await saves(page);
  await page.locator('#mode-explore').click();
  expect((await snapshot(page)).visual.shot).toBeNull();
  await expect(page.locator('#visual-shot')).toBeDisabled();
  const initial = (await snapshot(page)).navigation.state.player;
  await page.locator('#game').focus();
  await page.keyboard.down('w');
  await page.waitForTimeout(500);
  await page.keyboard.up('w');
  const after = (await snapshot(page)).navigation.state.player;
  expect(Math.hypot(after.x - initial.x, after.z - initial.z)).toBeGreaterThan(0.15);
  await page.locator('#visual-quality').selectOption('high');
  expect((await snapshot(page)).navigation.enabled).toBe(true);
  // Walking owns its independent save; visual controls cannot create campaign rewards.
  const afterSaves = await saves(page);
  for (const [key, value] of Object.entries(before)) expect(afterSaves[key]).toBe(value);
});
