import { test, expect } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';

const saveKey = 'space-dragon.checkpoint.v1';
test('renders a real 3D scene; complete, reload and restart the checkpoint', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'It starts with a signal.' })).toBeVisible();
  await page.waitForFunction(() => {
    const state = (window as unknown as { __SPACE_DRAGON__: { snapshot(): { rendered: boolean; frames: number } } }).__SPACE_DRAGON__?.snapshot();
    return state?.rendered && state.frames > 5;
  });
  await page.getByRole('button', { name: 'Follow the signal' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Something has landed.' })).toBeVisible();
  await page.getByRole('button', { name: 'Investigate the pod' }).click();
  await expect(page.getByRole('button', { name: 'Discover the suits' })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'The message is only the beginning.' })).toBeVisible();
  await expect(page.locator('#save-status')).toContainText('restored');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Start again' }).click();
  await expect(page.getByRole('button', { name: 'Discover the suits' })).toBeEnabled();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Start again' }).click();
  await expect(page.getByRole('button', { name: 'Follow the signal' })).toBeEnabled();
  expect(errors).toEqual([]);
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/first-contact-desktop.png', fullPage: true });
  const state = await page.evaluate(() => (window as unknown as { __SPACE_DRAGON__: { snapshot(): object } }).__SPACE_DRAGON__.snapshot());
  await writeFile('artifacts/browser-smoke-state.json', JSON.stringify({ automationRenderer: 'Chromium / SwiftShader; not a hardware benchmark', state }, null, 2));
});

for (const raw of ['{broken-json', '{"version":99,"step":"pod"}', '{"version":1,"step":"unknown"}', '{"version":1,"step":["computer"]}']) {
  test(`recovers from invalid checkpoint ${raw}`, async ({ page }) => {
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: saveKey, value: raw });
    await page.goto('./');
    await expect(page.getByRole('button', { name: 'Follow the signal' })).toBeEnabled();
    await expect(page.locator('#save-status')).toContainText(/could not be read|different build/);
    await page.getByRole('button', { name: 'Follow the signal' }).click();
    await expect(page.getByRole('heading', { name: 'Something has landed.' })).toBeVisible();
  });
}

test('storage failure does not stop the story', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('Storage blocked'); }; });
  await page.goto('./');
  await page.getByRole('button', { name: 'Follow the signal' }).click();
  await expect(page.getByRole('heading', { name: 'Something has landed.' })).toBeVisible();
  await expect(page.locator('#save-status')).toContainText('storage is unavailable');
});

test('captures an unordered idea in an isolated test inbox and retains failed drafts', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Idea notebook' }).click();
  const thought = `Test capture ${Date.now()}: maybe the wing clicks before the light comes on.\nI can decide the sound later.`;
  await page.getByLabel('Your thought').fill(thought);
  await page.getByRole('button', { name: 'Save idea', exact: true }).click();
  await expect(page.locator('#idea-status')).toContainText('Saved to your idea inbox. NOTE-');
  expect(await readFile('artifacts/test-inbox.md', 'utf8')).toContain(thought.split('\n').map(line => `> ${line}`).join('\n'));
  const draft = 'Keep this idea if saving fails.';
  await page.getByLabel('Your thought').fill(draft);
  await page.route('**/__ideas', route => route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"Test save failure"}' }));
  await page.getByRole('button', { name: 'Save idea', exact: true }).click();
  await expect(page.locator('#idea-status')).toHaveText('Test save failure');
  await expect(page.getByLabel('Your thought')).toHaveValue(draft);
  await page.reload();
  await page.getByRole('button', { name: 'Idea notebook' }).click();
  await expect(page.getByLabel('Your thought')).toHaveValue(draft);
  await page.unroute('**/__ideas');
  await page.route('**/__ideas', async route => {
    await page.getByLabel('Your thought').fill('A second thought typed while the first is saving.');
    await route.fulfill({ status: 201, contentType: 'application/json', body: '{"id":"NOTE-test-pending"}' });
  });
  await page.getByRole('button', { name: 'Save idea', exact: true }).click();
  await expect(page.locator('#idea-status')).toContainText('NOTE-test-pending');
  await expect(page.getByLabel('Your thought')).toHaveValue('A second thought typed while the first is saving.');
});

test('local idea writes reject cross-site and malformed requests; references stay private to dev source', async ({ request }) => {
  const url = 'http://127.0.0.1:5175/space-dragon/__ideas';
  expect((await request.post(url, { headers: { Origin: 'https://another-site.example' }, data: { thought: 'do not append' } })).status()).toBe(403);
  expect((await request.post(url, { headers: { Origin: 'http://127.0.0.1:5175' }, data: { thought: '   ' } })).status()).toBe(400);
  expect((await request.get('/space-dragon/assets/reference/family/photos/IMG_3277.jpeg')).status()).toBe(403);
});

test('narrow touch layout fits and supports the story interaction', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Follow the signal' }).tap();
  await expect(page.getByRole('heading', { name: 'Something has landed.' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/first-contact-mobile.png', fullPage: true });
});
