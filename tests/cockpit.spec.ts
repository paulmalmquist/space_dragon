import { test, expect, type Page } from '@playwright/test';

type RadarContact = { id: number; x: number; y: number; distance: number; altitudeMeters: number; locked: boolean; hostileLocked: boolean; firing: boolean };
type CockpitSnapshot = {
  state: string; forward: number[]; shots: number; rollsStarted: number; radar: RadarContact[];
  speed: number; cameraFov: number; reducedMotion: boolean;
  audio: { muted: boolean; paused: boolean; contextState: string; engineActive: boolean; activeVoices: number; pendingTimers: number; maxVoices: number; counters: Record<string, number>; samplesLoaded: number; sampleErrors: number; sampleCounters: Record<string, number> };
};
const state = (page: Page): Promise<CockpitSnapshot> => page.evaluate(() =>
  (window as unknown as { __SPACE_DRAGON_DOGFIGHT__: { snapshot(): CockpitSnapshot } }).__SPACE_DRAGON_DOGFIGHT__.snapshot());

test('cockpit radar follows real steering and opt-in flight audio stops on pause, mute and retry', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const sampleRequests: string[] = [];
  page.on('request', request => { if (request.url().includes('/assets/audio/sonniss-gdc-2026/')) sampleRequests.push(request.url()); });
  await page.goto('dogfight/');
  await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
  await expect(page.locator('#radar-scope')).toBeVisible();
  await expect(page.locator('#radar-scope')).toHaveAttribute('data-contacts', '3');
  const ready = await state(page);
  expect(ready.audio.muted).toBe(true); expect(ready.audio.contextState).toBe('uninitialized');
  expect(ready.audio.engineActive).toBe(false); expect(ready.audio.activeVoices).toBe(0);
  expect(sampleRequests).toEqual([]);
  await page.keyboard.press('Enter');

  // Read presentation and state atomically, before another animation frame can
  // move the targets. The DOM uses a separate ID namespace from aiming markers.
  const plotted = await page.evaluate(() => {
    const snapshot = (window as unknown as { __SPACE_DRAGON_DOGFIGHT__: { snapshot(): CockpitSnapshot } }).__SPACE_DRAGON_DOGFIGHT__.snapshot();
    const dots = [...document.querySelectorAll<SVGGElement>('#radar-contacts .radar-contact')].map(node => ({
      id: Number(node.dataset.radarId), x: Number(node.dataset.x), y: Number(node.dataset.y), visible: node.style.display !== 'none',
    }));
    return { contacts: snapshot.radar, dots };
  });
  expect(plotted.contacts).toHaveLength(3);
  for (const contact of plotted.contacts) {
    const dot = plotted.dots.find(candidate => candidate.id === contact.id)!;
    expect(dot.visible).toBe(true); expect(dot.x).toBeCloseTo(contact.x, 5); expect(dot.y).toBeCloseTo(contact.y, 5);
  }
  const beforeTurn = await state(page);
  await page.keyboard.down('ArrowLeft');
  await expect.poll(async () => (await state(page)).forward[0], { timeout: 20_000 }).toBeLessThan(-.15);
  await page.keyboard.up('ArrowLeft');
  const turned = await state(page);
  expect(turned.radar.some(contact => {
    const before = beforeTurn.radar.find(candidate => candidate.id === contact.id)!;
    return Math.hypot(contact.x - before.x, contact.y - before.y) > .02;
  })).toBe(true);
  expect(turned.audio.muted).toBe(true); expect(turned.audio.contextState).toBe('uninitialized');
  await page.keyboard.press('Escape');
  const pausedRadar = (await state(page)).radar;
  await page.waitForTimeout(180);
  expect((await state(page)).radar).toEqual(pausedRadar);
  await page.keyboard.press('Enter');

  await page.getByRole('button', { name: 'Sound off', exact: true }).click();
  await expect.poll(async () => (await state(page)).audio.contextState, { timeout: 20_000 }).toBe('running');
  await expect.poll(async () => (await state(page)).audio.engineActive, { timeout: 20_000 }).toBe(true);
  await expect.poll(async () => (await state(page)).audio.samplesLoaded).toBe(5);
  expect((await state(page)).audio.sampleErrors).toBe(0);
  expect(sampleRequests).toHaveLength(5);
  await page.keyboard.down('Shift');
  await expect.poll(async () => (await state(page)).audio.sampleCounters.boost || 0).toBeGreaterThan(0);
  await page.keyboard.up('Shift');
  const audible = await state(page);
  expect(audible.audio.muted).toBe(false); expect(audible.audio.maxVoices).toBeLessThanOrEqual(24);
  expect(audible.audio.activeVoices).toBeLessThanOrEqual(audible.audio.maxVoices);
  await page.mouse.move(720, 500);
  await page.mouse.down({ button: 'left' });
  await expect.poll(async () => (await state(page)).shots, { timeout: 20_000 }).toBeGreaterThan(audible.shots);
  await page.mouse.up({ button: 'left' });
  expect((await state(page)).audio.counters.fire).toBeGreaterThan(audible.audio.counters.fire || 0);
  const rolls = (await state(page)).audio.counters.roll || 0;
  await page.keyboard.press('q');
  const rolled = await state(page);
  expect(rolled.rollsStarted).toBe(1); expect(rolled.audio.counters.roll).toBe(rolls + 1);
  expect(rolled.audio.activeVoices).toBeLessThanOrEqual(rolled.audio.maxVoices);
  await page.keyboard.press('Escape');
  const pausedAudio = (await state(page)).audio;
  expect(pausedAudio.engineActive).toBe(false); expect(pausedAudio.activeVoices).toBe(0); expect(pausedAudio.pendingTimers).toBe(0);

  await page.getByRole('button', { name: 'Sound on', exact: true }).click();
  expect((await state(page)).audio.muted).toBe(true);
  await page.getByRole('button', { name: 'Resume flight', exact: false }).click();
  const resumed = await state(page);
  expect(resumed.audio.engineActive).toBe(false); expect(resumed.audio.activeVoices).toBe(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Restart encounter', exact: false }).click();
  const retry = await state(page);
  expect(retry.radar).toHaveLength(3); expect(retry.rollsStarted).toBe(0);
  expect(retry.audio.muted).toBe(true); expect(retry.audio.engineActive).toBe(false); expect(retry.audio.activeVoices).toBe(0);
  await expect(page.locator('#radar-scope')).toHaveAttribute('data-contacts', '3');
  expect(errors).toEqual([]);
});

test('accelerating stretches camera perspective, RMB wins, and reduced motion holds a steady lens', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('dogfight/');
  await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
  await page.keyboard.press('Enter');
  const baseFov = (await state(page)).cameraFov;
  await page.keyboard.down('r');
  await expect.poll(async () => (await state(page)).speed, { timeout: 30_000 }).toBeGreaterThan(80);
  await expect.poll(async () => (await state(page)).cameraFov, { timeout: 30_000 }).toBeGreaterThan(baseFov + 3);
  await page.keyboard.up('r');
  await page.keyboard.down('Shift');
  await expect.poll(async () => (await state(page)).speed, { timeout: 30_000 }).toBeGreaterThan(125);
  await expect.poll(async () => (await state(page)).cameraFov, { timeout: 30_000 }).toBeGreaterThan(69);
  await page.mouse.move(720, 500); await page.mouse.down({ button: 'right' });
  await expect.poll(async () => (await state(page)).cameraFov, { timeout: 30_000 }).toBeLessThan(45);
  await page.mouse.up({ button: 'right' });
  await expect.poll(async () => (await state(page)).cameraFov, { timeout: 30_000 }).toBeGreaterThan(69);
  await page.locator('#reduce-motion').check();
  // A fresh press remains explicit even if settings input clears held controls.
  await page.keyboard.up('Shift'); await page.keyboard.down('Shift');
  await expect.poll(async () => (await state(page)).cameraFov, { timeout: 30_000 }).toBe(61);
  // The reduced lens settles immediately; speed still needs to accelerate
  // after the settings control releases input. Observe both independently.
  await expect.poll(async () => (await state(page)).speed, { timeout: 30_000 }).toBeGreaterThan(125);
  const reduced = await state(page);
  expect(reduced.reducedMotion).toBe(true); expect(reduced.speed).toBeGreaterThan(125);
  await page.mouse.move(720, 500); await page.mouse.down({ button: 'right' });
  await expect.poll(async () => (await state(page)).cameraFov, { timeout: 30_000 }).toBe(40);
  await page.mouse.up({ button: 'right' }); await page.keyboard.up('Shift');
  await expect.poll(async () => (await state(page)).cameraFov, { timeout: 30_000 }).toBe(61);
  expect(errors).toEqual([]);
});
