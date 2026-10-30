import { test, expect } from '@playwright/test';
import { EXPLORATION_SAVE_KEY } from '../src/game/exploration-save.ts';

test('built exploration accepts keyboard movement and saves one nearby pickup without developer APIs', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  // A valid previous visit just outside pickup range keeps this production smoke short.
  await page.addInitScript(key => {
    if (sessionStorage.getItem('production-navigation-seeded')) return;
    localStorage.setItem(key, JSON.stringify({ version: 1, player: { x: 4.5, z: -2.8, yaw: 0 }, collected: [] }));
    sessionStorage.setItem('production-navigation-seeded', 'true');
  }, EXPLORATION_SAVE_KEY);
  await page.goto('./');
  await page.locator('#begin-explore').click();
  await expect(page.locator('body')).toHaveAttribute('data-mode', 'exploration');
  await expect(page.locator('#game')).toHaveAttribute('data-rendered', 'true');
  await expect(page.locator('#game')).toHaveAttribute('data-asset-loaded', 'true', { timeout: 20_000 });
  expect(await page.evaluate(() => typeof (window as unknown as Record<string, unknown>).__SPACE_DRAGON__)).toBe('undefined');
  await expect(page.locator('#nav-inventory')).toHaveAttribute('data-count', '0');
  await page.locator('#game').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#nav-inventory')).toHaveAttribute('data-count', '0');
  await page.keyboard.down('d');
  try { await expect(page.locator('#nav-target')).toContainText('Practice module'); }
  finally { await page.keyboard.up('d'); }
  await page.keyboard.press('Enter');
  await expect(page.locator('#nav-inventory')).toHaveAttribute('data-count', '1');
  await page.keyboard.press('Enter');
  await expect(page.locator('#nav-inventory')).toHaveAttribute('data-count', '1');
  await page.reload();
  await page.locator('#begin-explore').click();
  await expect(page.locator('#nav-inventory')).toHaveAttribute('data-count', '1');
  await expect(page.locator('#save-status')).toContainText('restored');
  expect(errors).toEqual([]);
});
