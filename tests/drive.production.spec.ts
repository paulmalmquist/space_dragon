import { test, expect } from '@playwright/test';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

test.use({ viewport: { width: 960, height: 640 } });

test('drive production entry uses the approved reference house without raw source-video payloads', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('drive/');
  await expect(page.locator('#drive-canvas')).toHaveAttribute('data-ready', 'true', { timeout: 90_000 });
  await expect(page.locator('#drive-canvas')).toHaveAttribute('data-rendered', 'true');
  await expect(page.locator('#begin')).toBeEnabled();
  await expect(page.locator('#layout-label')).toHaveText('HOME & TOWN · REFERENCE STUDY');
  await page.locator('#begin').click(); await page.keyboard.down('w');
  await expect.poll(() => page.locator('#speed').innerText(), { timeout: 30_000 }).not.toBe('0');
  await page.keyboard.up('w'); await page.keyboard.press('Escape');
  await expect(page.locator('#paused')).toBeVisible();
  await page.locator('#resume').click();
  await page.keyboard.press('v');
  await expect(page.locator('#first-person')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#camera')).toHaveText('First person · C');
  await page.keyboard.press('v');
  await expect(page.locator('#first-person')).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
  async function inspect(folder: string): Promise<void> {
    for (const item of await readdir(folder, { withFileTypes: true })) {
      const path = join(folder, item.name);
      if (item.isDirectory()) { await inspect(path); continue; }
      expect(path).not.toMatch(/contact-sheet|notes-v001|\.mov$|\.mp4$|\.ply$|\.splat$|\.spz$/i);
      if (/\.(?:js|html|json|css)$/.test(path)) expect(await readFile(path, 'utf8')).not.toMatch(/__drive-layout|assets\/reference\/local/);
    }
  }
  await inspect('dist');
  await page.getByRole('link', { name: 'Return to First Contact' }).click();
  await expect(page.locator('#begin-explore')).toBeVisible();
});
