import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { FAMILY } from '../src/game/firstContact';
import type { Checkpoint } from '../src/game/firstContact';

const key = 'space-dragon.checkpoint.v2';
const snapshot = (page: Page) => page.evaluate(() => (window as unknown as { __SPACE_DRAGON__: { snapshot(): {
  checkpoint: Checkpoint; rewards: string[]; paused: boolean; reducedMotion: boolean; animationTime: number;
  props: { tether: boolean; goo: boolean; panelX: number; signal: boolean };
} } }).__SPACE_DRAGON__.snapshot());
async function startSuits(page: Page) {
  await page.goto('./');
  for (const name of ['Follow the signal', 'Investigate the pod', 'Discover the suits']) {
    await expect(page.getByRole('button', { name })).toBeEnabled();
    await page.getByRole('button', { name }).focus();
    await page.keyboard.press('Enter');
  }
}

test('keyboard suit contributions change the scene; checkpoint every action and finish the map', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await startSuits(page);
  await expect(page.getByRole('region', { name: 'Family suits' })).toBeVisible();
  expect((await snapshot(page)).rewards).toHaveLength(5);
  for (const [index, member] of FAMILY.entries()) {
    await expect(page.getByRole('button', { name: member.action, exact: true })).toBeEnabled();
    await page.getByRole('button', { name: member.action, exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#feedback')).toHaveText(member.result);
    await page.reload();
    expect((await snapshot(page)).checkpoint.demonstrated).toBe(index + 1);
  }
  await expect.poll(async () => (await snapshot(page)).props.panelX).toBeGreaterThan(5.4);
  expect((await snapshot(page)).props).toMatchObject({ tether: true, goo: true, signal: true });
  await page.screenshot({ path: 'artifacts/five-together-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Scan the signal' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Build the dragon on Earth.' })).toBeVisible();
  expect((await snapshot(page)).checkpoint.scan).toBe('direct');
  expect((await snapshot(page)).rewards).toHaveLength(6);
  await page.reload();
  await expect(page.getByRole('button', { name: 'First Contact complete' })).toBeDisabled();
  await expect(page.locator('.next-mission')).toContainText('Space Blocks');
  await page.screenshot({ path: 'artifacts/town-briefing-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('skipping demos and asking for help preserves suits and records an assisted scan', async ({ page }) => {
  await startSuits(page);
  await page.getByRole('button', { name: 'Skip demonstrations' }).click();
  await page.getByRole('button', { name: 'Show me', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Scan the signal' })).toHaveClass(/hint-target/);
  await page.reload();
  expect((await snapshot(page)).checkpoint.scanHelp).toBe(true);
  await page.getByRole('button', { name: 'Scan the signal' }).dblclick();
  expect((await snapshot(page)).checkpoint.scan).toBe('assisted');
  expect(new Set((await snapshot(page)).rewards).size).toBe(6);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Start again' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('space-dragon.checkpoint.before-restart')!).step)).toBe('map');
  await startSuits(page);
  await page.getByRole('button', { name: 'Skip demonstrations' }).click();
  await page.getByRole('button', { name: 'Help together' }).click();
  expect((await snapshot(page)).checkpoint.scan).toBe('assisted');
});

test('pause, held keys, double clicks, notebook and reduced motion never advance hidden actions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startSuits(page);
  expect((await snapshot(page)).reducedMotion).toBe(true);
  await page.getByRole('button', { name: 'Lift the panel' }).dblclick();
  expect((await snapshot(page)).checkpoint.demonstrated).toBe(1);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const before = await snapshot(page);
  await expect(page.getByRole('button', { name: 'Restore energy' })).toBeDisabled();
  await page.keyboard.press('Enter');
  expect((await snapshot(page)).checkpoint).toEqual(before.checkpoint);
  // Enter on Resume resumes without submitting a story action.
  await page.getByRole('button', { name: 'Idea notebook' }).click();
  await page.getByLabel('Your thought').fill('H is an idea, not a story command.');
  expect((await snapshot(page)).paused).toBe(true);
  await page.keyboard.press('Escape');
  expect((await snapshot(page)).checkpoint).toEqual(before.checkpoint);
  await expect(page.getByRole('button', { name: 'Restore energy' })).toBeEnabled();
  await page.getByRole('button', { name: 'Restore energy' }).focus();
  await page.keyboard.down('Enter');
  await page.keyboard.down('Enter');
  await page.keyboard.up('Enter');
  expect((await snapshot(page)).checkpoint.demonstrated).toBe(2);
  expect((await snapshot(page)).animationTime).toBe(0);
});

test('v1 pod save migrates without changing the legacy bytes', async ({ page }) => {
  await page.goto('./');
  const legacy = '{"version":1,"step":"pod"}';
  await page.evaluate(raw => localStorage.setItem('space-dragon.checkpoint.v1', raw), legacy);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Discover the suits' })).toBeEnabled();
  await page.getByRole('button', { name: 'Discover the suits' }).click();
  expect(await page.evaluate(() => localStorage.getItem('space-dragon.checkpoint.v1'))).toBe(legacy);
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).version, key)).toBe(2);
});

test('invalid v2 progress recovers safely and storage failure still allows all-help completion', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(k => localStorage.setItem(k, '{"version":2,"step":"map","demonstrated":0,"scan":"direct","scanHelp":false}'), key);
  await page.reload();
  await expect(page.locator('#save-status')).toContainText('different build');
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Quota'); }; });
  for (const name of ['Follow the signal', 'Investigate the pod', 'Discover the suits', 'Skip demonstrations', 'Help together']) {
    await page.getByRole('button', { name }).click();
  }
  await expect(page.locator('#save-status')).toContainText('storage is unavailable');
  expect((await snapshot(page)).checkpoint.step).toBe('map');
});

test('voice unavailable has a readable fallback and never blocks the scan', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true }); });
  await startSuits(page);
  await page.getByRole('button', { name: 'Skip demonstrations' }).click();
  await page.keyboard.press('h');
  await expect(page.locator('#voice-status')).toContainText('Device voice is unavailable');
  await page.getByRole('button', { name: 'Help together' }).click();
  expect((await snapshot(page)).checkpoint.step).toBe('map');
});

test('narrow layout exposes help, all five suits and the mission briefing without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startSuits(page);
  await page.getByRole('button', { name: 'Skip demonstrations' }).click();
  await page.getByRole('button', { name: 'Help together' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('heading', { name: 'Build the dragon on Earth.' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/town-briefing-narrow.png', fullPage: true });
});

test('replaying local speech cancels the previous prompt and stops on pause and scene change', async ({ page }) => {
  await page.addInitScript(() => {
    const calls = { spoken: [] as string[], cancelled: 0 };
    Object.defineProperty(window, '__voiceTest', { value: calls });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class { constructor(public text: string) {} }, configurable: true });
    Object.defineProperty(window, 'speechSynthesis', { value: {
      getVoices: () => [{ name: 'Remote', lang: 'en-US', localService: false }, { name: 'Local', lang: 'en-US', localService: true }],
      cancel: () => calls.cancelled++,
      speak: (utterance: { text: string; voice: { name: string } }) => { if (utterance.voice.name !== 'Local') throw new Error('Remote voice chosen'); calls.spoken.push(utterance.text); },
    }, configurable: true });
  });
  await page.goto('./');
  await page.getByRole('button', { name: 'Hear instruction' }).click();
  await page.keyboard.press('h');
  const calls = () => page.evaluate(() => (window as unknown as { __voiceTest: { spoken: string[]; cancelled: number } }).__voiceTest);
  expect((await calls()).spoken).toHaveLength(2);
  const count = (await calls()).cancelled;
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.keyboard.press('h');
  expect((await calls()).spoken).toHaveLength(2);
  expect((await calls()).cancelled).toBeGreaterThan(count);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  const beforeScene = (await calls()).cancelled;
  await page.getByRole('button', { name: 'Follow the signal' }).click();
  expect((await calls()).cancelled).toBeGreaterThan(beforeScene);
});

test('tab visibility pauses animation and rejects actions until the page is visible', async ({ page }) => {
  await startSuits(page);
  await expect(page.getByRole('button', { name: 'Lift the panel' })).toBeEnabled();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const before = await snapshot(page);
  await expect(page.getByRole('button', { name: 'Lift the panel' })).toBeDisabled();
  await page.waitForTimeout(100);
  expect((await snapshot(page)).animationTime).toBe(before.animationTime);
  expect((await snapshot(page)).checkpoint).toEqual(before.checkpoint);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.getByRole('button', { name: 'Lift the panel' }).click();
  expect((await snapshot(page)).checkpoint.demonstrated).toBe(1);
});

test('renderer failure leaves the complete assisted story path usable', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: function(this: HTMLCanvasElement, ...args: Parameters<typeof getContext>) {
      if (String(args[0]).includes('webgl')) return null;
      return getContext.apply(this, args);
    } });
  });
  await startSuits(page);
  await expect(page.getByRole('alert')).toContainText('3D view could not start');
  await page.getByRole('button', { name: 'Skip demonstrations' }).click();
  await page.getByRole('button', { name: 'Help together' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'First Contact complete' })).toBeDisabled();
  expect((await snapshot(page)).rewards).toHaveLength(6);
});
