import { test, expect } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import { chargeDisplayedWord } from './helpers/dogfight';

test('built dogfight launches directly with local models; mouse fires and zooms without development hooks', async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  const errors: string[] = [], failures: string[] = [], external: string[] = [];
  const origin = new URL(baseURL!).origin;
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
  page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== origin) external.push(request.url()); });
  await page.goto('dogfight/?qa');
  await expect(page.locator('#game')).toHaveAttribute('data-rendered', 'true', { timeout: 30_000 });
  await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');
  expect(await page.evaluate(() => '__SPACE_DRAGON_DOGFIGHT__' in window || '__spaceDragonQA' in window)).toBe(false);
  await expect(page.locator('#tactical-radar')).toBeVisible();
  await expect(page.locator('#radar-scope')).toHaveAttribute('data-contacts', '3');
  const soundResponses: number[] = [];
  page.on('response', response => { if (response.url().includes('/assets/audio/sonniss-gdc-2026/')) soundResponses.push(response.status()); });
  await page.getByRole('button', { name: 'Sound off', exact: true }).click();
  await expect.poll(() => soundResponses.length).toBe(5);
  expect(soundResponses).toEqual([200, 200, 200, 200, 200]);
  await page.locator('#game').focus();
  await page.keyboard.press('Enter');
  await chargeDisplayedWord(page);
  await expect(page.locator('#threat-warning')).toBeVisible();
  await expect(page.locator('#threat-title')).toContainText(/ENEMY TRACKING|ENEMY TARGET LOCK|INCOMING FIRE/);
  await page.mouse.move(720, 500);
  await page.mouse.down({ button: 'right' });
  await expect(page.locator('body')).toHaveAttribute('data-zooming', 'true');
  await page.mouse.down({ button: 'left' });
  await expect(page.locator('#game')).toHaveAttribute('data-firing', 'true');
  await page.mouse.up({ button: 'left' }); await page.mouse.up({ button: 'right' });
  await page.keyboard.press('e');
  await expect(page.locator('#roll-status')).toContainText('ROLLING');
  await expect(page.locator('#evasion-status')).toContainText('60%');
  await expect(page.locator('#roll-status')).not.toContainText('ROLLING', { timeout: 40_000 });
  await expect(page.locator('#roll-status')).toContainText('B + STEER BREAK', { timeout: 15_000 });
  await page.keyboard.down('ArrowRight');
  await page.keyboard.press('b');
  await expect(page.locator('body')).toHaveAttribute('data-break-active', 'true');
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).toHaveAttribute('data-state', 'paused');
  await page.getByRole('link', { name: 'Back to Space Dragon' }).click();
  await expect(page.locator('#begin-screen')).toBeVisible();
  expect(errors).toEqual([]); expect(failures).toEqual([]); expect(external).toEqual([]);
});

test('built flight includes no mutable QA code, original reference or editable sources', async () => {
  const files = await readdir('dist', { recursive: true });
  const scripts = await Promise.all(files.filter(file => /\.(?:js|html)$/.test(file)).map(file => readFile(`dist/${file}`, 'utf8')));
  const runtime = scripts.join('\n');
  expect(runtime).not.toContain('__SPACE_DRAGON_DOGFIGHT__');
  expect(runtime).not.toContain('__spaceDragonQA');
  expect(runtime).not.toContain('runAcceptance');
  expect(files.filter(file => /(?:^|[\\/])(?:reference|source|ideas|seeles-assets)(?:[\\/]|$)|\.(?:blend\d?|zip)$|(?:^|[\\/])qa\.js$/i.test(file))).toEqual([]);
  // The browser entry remains independently loadable; Babylon is not loaded by flight.
  expect(await readFile('dist/dogfight/index.html', 'utf8')).toContain('Dogfight Lab');
});

test('built power word acquires one ship and Space resolves one targeted breath', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('dogfight/');
  await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
  await page.keyboard.press('Enter');
  const word = await chargeDisplayedWord(page); await page.keyboard.press('m');
  await expect(page.locator('body')).toHaveAttribute('data-power-phase', 'ready');
  await expect.poll(async () => {
    const count = await page.locator('body').getAttribute('data-locked-count');
    if (count === '1') return count;
    const box = await page.locator('.target-marker:not(.offscreen)').first().boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    return '0';
  }, { timeout: 30_000, intervals: [50, 100, 100] }).toBe('1');
  const lockedId = await page.locator('.target-marker.hard-locked').getAttribute('data-target-id');
  await page.keyboard.down('Space');
  await expect(page.locator('body')).toHaveAttribute('data-power-phase', 'burst');
  // The 1.75-second game clock advances in bounded steps under software
  // rendering. Allow wall time for the new windup and sustained beam.
  await expect(page.locator('body')).toHaveAttribute('data-breath-impacts', '1', { timeout: 60_000 });
  await expect(page.locator('body')).toHaveAttribute('data-breath-fired', '1');
  await expect(page.locator(`[data-target-id="${lockedId}"]`)).toBeHidden();
  await expect(page.locator('#enemy-count')).toHaveText('2');
  await expect(page.locator('#radar-scope')).toHaveAttribute('data-contacts', '2');
  await expect(page.locator(`[data-radar-id="${lockedId}"]`)).toBeHidden();
  await expect(page.locator('#power-letter')).toHaveText(/^[A-Z]$/);
  await expect(page.locator('#word-slots')).toHaveAttribute('aria-label', 'Word progress: blank blank blank blank');
  const nextLetter = await page.locator('#power-letter').textContent();
  expect(nextLetter).toBeTruthy(); expect(word).toHaveLength(4);
  await page.keyboard.up('Space');
});
