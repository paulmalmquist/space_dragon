import { test, expect } from '@playwright/test';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

test('drive production entry runs with fictional home and no private-reference loader or media', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('drive/');
  await expect(page.locator('#drive-canvas')).toHaveAttribute('data-rendered', 'true');
  await expect(page.locator('#layout-label')).toHaveText('FICTIONAL HOME · EDITABLE BLOCKOUT');
  await page.locator('#begin').click(); await page.keyboard.down('w');
  await expect.poll(() => page.locator('#speed').innerText()).not.toBe('0');
  await page.keyboard.up('w'); await page.keyboard.press('Escape');
  await expect(page.locator('#paused')).toBeVisible();
  expect(errors).toEqual([]);
  async function inspect(folder: string): Promise<void> {
    for (const item of await readdir(folder, { withFileTypes: true })) {
      const path = join(folder, item.name);
      if (item.isDirectory()) { await inspect(path); continue; }
      expect(path).not.toMatch(/IMG_575[34]|house-layout|contact-sheet|notes-v001|\.mov$|\.mp4$|\.ply$|\.splat$|\.spz$/i);
      if (/\.(?:js|html|json|css)$/.test(path)) expect(await readFile(path, 'utf8')).not.toMatch(/__drive-layout|assets\/reference\/local|IMG_575[34]|house-layout\.json/);
    }
  }
  await inspect('dist');
  await page.getByRole('link', { name: 'Return to First Contact' }).click();
  await expect(page.locator('#begin-explore')).toBeVisible();
});
