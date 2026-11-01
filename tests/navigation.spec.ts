import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { EXPLORATION_SAVE_KEY } from '../src/game/exploration-save.ts';
import { createInitialState, nextAction, transition } from '../src/game/state.ts';
import type { ExplorationState } from '../src/game/navigation.ts';

interface NavigationSnapshot {
  state: ExplorationState;
  target: { id: string; label: string } | null;
  enabled: boolean;
  cameraYaw: number;
  cameraPosition: { x: number; y: number; z: number };
  focusPosition: { x: number; y: number; z: number };
  cameraClipped: boolean;
  moving: boolean;
}
interface Snapshot { navigation: NavigationSnapshot; paused: boolean; }
const snapshot = (page: Page) => page.evaluate(() =>
  (window as unknown as { __SPACE_DRAGON__: { snapshot(): Snapshot } }).__SPACE_DRAGON__.snapshot());
const navigation = async (page: Page) => (await snapshot(page)).navigation;
const storySaveKey = 'space-dragon.checkpoint.v2';

async function begin(page: Page, keyboardStart = false) {
  await page.goto('./');
  if (keyboardStart) await page.keyboard.press('Enter');
  else await page.locator('#begin-explore').click();
  await expect(page.locator('body')).toHaveAttribute('data-mode', 'exploration');
  await expect(page.locator('#game')).toHaveAttribute('data-rendered', 'true');
  await page.locator('#game').focus();
  await expect.poll(async () => (await navigation(page)).enabled).toBe(true);
}

/** Travel by real keyboard input; no mutation/teleport debug API is used. Camera yaw stays zero. */
async function walkAxis(page: Page, axis: 'x' | 'z', destination: number) {
  const initial = (await navigation(page)).state.player[axis];
  const direction = Math.sign(destination - initial);
  if (Math.abs(destination - initial) <= 0.14) return;
  const key = axis === 'x' ? (direction > 0 ? 'd' : 'a') : (direction > 0 ? 'w' : 's');
  await page.keyboard.down(key);
  try {
    // Software-rendered CI advances capped simulation frames more slowly than wall time.
    // Keep the spatial assertion and real held key; allow the observed movement to finish.
    const coordinate = expect.poll(async () => (await navigation(page)).state.player[axis], {
      message: `Holding ${key}: move ${axis} from ${initial.toFixed(3)} toward ${destination}`,
      timeout: 20_000, intervals: [30, 50, 80],
    });
    if (direction > 0) await coordinate.toBeGreaterThanOrEqual(destination - 0.14);
    else await coordinate.toBeLessThanOrEqual(destination + 0.14);
  } finally { await page.keyboard.up(key); }
}

async function expectStopped(page: Page, before?: ExplorationState['player']) {
  const initial = before ?? (await navigation(page)).state.player;
  await page.waitForTimeout(250);
  const after = (await navigation(page)).state.player;
  expect(Math.hypot(after.x - initial.x, after.z - initial.z)).toBeLessThan(0.03);
}

test('third-person movement stops at a wall and passes through the actual doorway', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await begin(page, true);
  const initial = await navigation(page);
  expect(initial.state.player).toMatchObject({ x: -2, z: -1.5 });
  expect(initial.target).toBeNull();
  await page.keyboard.press('Space');
  expect((await navigation(page)).state.collected).toEqual([]);
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'living-room');

  // The solid east wall blocks this route until the player lines up with its opening.
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await navigation(page)).state.player.x, { timeout: 5_000 }).toBeGreaterThan(-1.05);
  await page.waitForTimeout(350);
  await page.keyboard.up('ArrowRight');
  const atWall = await navigation(page);
  expect(atWall.state.player.x).toBeLessThanOrEqual(-0.87);
  expect(atWall.state.player.z).toBeCloseTo(-1.5, 2);
  // The visible cutaway wall is low; the camera can see over it while feet stay blocked.
  expect(atWall.cameraPosition.y).toBeGreaterThan(1.5);
  expect(Math.hypot(
    atWall.cameraPosition.x - atWall.focusPosition.x,
    atWall.cameraPosition.y - atWall.focusPosition.y,
    atWall.cameraPosition.z - atWall.focusPosition.z,
  )).toBeLessThanOrEqual(3.9);

  await walkAxis(page, 'z', 0);
  await walkAxis(page, 'x', 1.25);
  const outside = await navigation(page);
  expect(outside.state.player.x).toBeGreaterThan(1);
  expect(outside.cameraPosition.x).toBeGreaterThan(initial.cameraPosition.x + 1);
  await expect.poll(async () => {
    const value = await navigation(page);
    return Math.abs(value.focusPosition.x - value.state.player.x);
  }).toBeLessThan(0.2);
  const yaw = outside.cameraYaw;
  await page.keyboard.press('q');
  await expect.poll(async () => (await navigation(page)).cameraYaw).not.toBe(yaw);
  await page.locator('#reduce-motion').check();
  await page.locator('#game').focus();
  expect((await navigation(page)).state.collected).toEqual([]);
  expect(errors).toEqual([]);
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/navigation-doorway.png', fullPage: true });
});

test('nearby actions and one practice pickup persist independently of the story checkpoint', async ({ page }) => {
  // This route includes two scene loads and a screenshot; hosted SwiftShader needs more
  // time than the short interaction cases. This remains a behavior test, not an FPS gate.
  test.setTimeout(90_000);
  const story = JSON.stringify(createInitialState());
  await page.addInitScript(({ key, value }) => {
    if (!sessionStorage.getItem('navigation-story-seeded')) {
      localStorage.setItem(key, value);
      sessionStorage.setItem('navigation-story-seeded', 'true');
    }
  }, { key: storySaveKey, value: story });
  await begin(page);
  // Leave clearance in front of the desk while crossing the room.
  await walkAxis(page, 'z', -0.5);
  await walkAxis(page, 'x', -3.9);
  await expect.poll(async () => (await navigation(page)).target?.id).toBe('computer');
  await expect(page.locator('#nav-target')).toContainText('computer');
  await page.keyboard.press('Enter');
  await expect(page.locator('#nav-message')).toContainText('signal');
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'living-room');

  await walkAxis(page, 'x', 1.8);
  await expect.poll(async () => (await navigation(page)).target?.id).toBe('pod');
  await page.keyboard.press('Space');
  await expect(page.locator('#nav-message')).toContainText('opens');
  // Go around the pod rather than through its solid hull.
  await walkAxis(page, 'z', -2.8);
  await walkAxis(page, 'x', 5.7);
  await expect.poll(async () => (await navigation(page)).target?.id).toBe('training-module');
  await page.keyboard.press('Enter');
  await expect(page.locator('#nav-inventory')).toHaveAttribute('data-count', '1');
  await expect(page.locator('#nav-message')).toContainText('collected');
  for (let press = 0; press < 3; press++) await page.keyboard.press('Space');
  expect((await navigation(page)).state.collected).toEqual(['training-module']);
  const beforeReload = (await navigation(page)).state;
  expect(await page.evaluate(key => localStorage.getItem(key), storySaveKey)).toBe(story);
  const saved = JSON.parse((await page.evaluate(key => localStorage.getItem(key), EXPLORATION_SAVE_KEY))!);
  expect(saved.collected).toEqual(['training-module']);
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/navigation-pickup.png', fullPage: true });
  await page.reload();
  await page.locator('#begin-explore').click();
  await expect(page.locator('#nav-inventory')).toHaveAttribute('data-count', '1');
  const restored = await navigation(page);
  expect(restored.state).toEqual(beforeReload);
  expect(restored.target?.id).not.toBe('training-module');
  expect(await page.evaluate(key => localStorage.getItem(key), storySaveKey)).toBe(story);
  await page.locator('#mode-story').click();
  await expect(page.locator('body')).toHaveAttribute('data-mode', 'story');
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'living-room');
  await page.locator('#mode-explore').click();
  expect((await navigation(page)).state.collected).toEqual(['training-module']);
  await writeFile('artifacts/navigation-browser-state.json', JSON.stringify({
    renderer: 'Chromium / SwiftShader; not a device performance result', beforeReload, restored,
  }, null, 2));
});

test('pause, focus loss and notebook typing release movement without a stuck key', async ({ page }) => {
  const initialStory = createInitialState();
  const story = JSON.stringify(transition(initialStory, nextAction(initialStory)));
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: storySaveKey, value: story });
  await begin(page);
  await page.keyboard.press('F1');
  await expect(page.locator('#nav-message')).toContainText('doorway');
  expect(await page.evaluate(key => localStorage.getItem(key), storySaveKey)).toBe(story);
  await page.keyboard.down('w');
  await expect.poll(async () => (await navigation(page)).state.player.z).toBeGreaterThan(-1.3);
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).toHaveAttribute('data-paused', 'true');
  await page.keyboard.up('w');
  await expectStopped(page);
  await page.locator('#resume').click();
  await expectStopped(page);
  await page.locator('#game').focus();
  await page.keyboard.down('w');
  const beforeBlur = (await navigation(page)).state.player.z;
  await expect.poll(async () => (await navigation(page)).state.player.z).toBeGreaterThan(beforeBlur + 0.1);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('body')).toHaveAttribute('data-paused', 'true');
  await page.keyboard.up('w');
  await expectStopped(page);
  await page.keyboard.press('Space');
  await expect(page.locator('body')).toHaveAttribute('data-paused', 'false');
  await expectStopped(page);

  await page.keyboard.down('d');
  await page.getByRole('button', { name: 'Idea notebook' }).click();
  const frozen = (await navigation(page)).state.player;
  await page.keyboard.up('d');
  await page.getByLabel('Your thought').fill('Synthetic movement isolation: wasd and arrows belong here.');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await page.keyboard.press('Enter');
  await expectStopped(page, frozen);
  await page.locator('#notebook-close').click();
  await expectStopped(page, frozen);
  await page.locator('#game').focus();
  const beforeNewKey = (await navigation(page)).state.player.x;
  await page.keyboard.down('a');
  await expect.poll(async () => (await navigation(page)).state.player.x).toBeLessThan(beforeNewKey - 0.1);
  await page.keyboard.up('a');
});

test('delayed notebook close notifications preserve fresh movement and a reopened notebook', async ({ page }) => {
  await begin(page);
  // Delay only the native notification, not the real button, Escape key,
  // dialog open state or game clock. CI exposed this notification arriving
  // after a fresh movement key. Replaying twice also checks idempotence.
  const closeEvents = await page.evaluateHandle(() => {
    const dialog = document.querySelector<HTMLDialogElement>('#notebook')!;
    const pending: Event[] = [];
    let forwarding = false;
    const capture = (event: Event) => {
      if (forwarding) return;
      event.stopImmediatePropagation(); pending.push(event);
    };
    dialog.addEventListener('close', capture, true);
    return {
      count: () => pending.length,
      release: () => {
        forwarding = true;
        try { for (const event of pending.splice(0)) { dialog.dispatchEvent(event); dialog.dispatchEvent(event); } }
        finally { forwarding = false; }
      },
      dispose: () => dialog.removeEventListener('close', capture, true),
    };
  });
  const notebook = page.locator('#notebook');
  const open = () => page.getByRole('button', { name: 'Idea notebook' }).click();
  const queued = () => expect.poll(() => closeEvents.evaluate(queue => queue.count())).toBe(1);
  const scenePaused = () => page.evaluate(() =>
    (window as unknown as { __SPACE_DRAGON__: { snapshot(): { performance: { paused: boolean } } } }).__SPACE_DRAGON__.snapshot().performance.paused);
  try {
    // Both explicit close and Escape must resume before the queued notification.
    for (const method of ['button', 'escape'] as const) {
      await open();
      if (method === 'button') await page.locator('#notebook-close').click();
      else await page.keyboard.press('Escape');
      await expect(notebook).not.toBeVisible();
      await queued();
      expect(await scenePaused()).toBe(false);
      await expect(page.locator('#game')).toBeFocused();
      // Walk along the open corridor at x=-2, away from furniture. Both
      // measured segments need clearance even on a slow browser round-trip.
      const direction = method === 'button' ? 1 : -1;
      const key = direction > 0 ? 'w' : 's';
      const moved = (from: number) => expect.poll(async () =>
        direction * ((await navigation(page)).state.player.z - from)).toBeGreaterThan(0.1);
      const beforeKey = (await navigation(page)).state.player.z;
      await page.keyboard.down(key);
      try {
        await moved(beforeKey);
        const beforeNotification = (await navigation(page)).state.player.z;
        await closeEvents.evaluate(queue => queue.release());
        await moved(beforeNotification);
      } finally { await page.keyboard.up(key); }
      await expectStopped(page);
    }

    // An old Escape close event must not resume/reset a new notebook session.
    await open();
    await page.keyboard.press('Escape');
    await expect(notebook).not.toBeVisible();
    await queued();
    await open();
    const frozen = (await navigation(page)).state.player;
    await closeEvents.evaluate(queue => queue.release());
    await expect(notebook).toBeVisible();
    expect(await scenePaused()).toBe(true);
    await page.getByLabel('Your thought').fill('Synthetic queued-close isolation: wasd');
    await expectStopped(page, frozen);
    await page.locator('#notebook-close').click();
    await queued();
    await closeEvents.evaluate(queue => queue.release());
    expect(await scenePaused()).toBe(false);
    await expect(page.locator('#game')).toBeFocused();
  } finally {
    await closeEvents.evaluate(queue => queue.dispose());
    await closeEvents.dispose();
  }
});

test('an unsafe saved pose recovers at the entrance while retaining the collected practice module', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify({
    version: 1, player: { x: 3.5, z: 0, yaw: 0 }, collected: ['training-module'],
  })), EXPLORATION_SAVE_KEY);
  await begin(page);
  expect((await navigation(page)).state.player).toEqual({ x: -2, z: -1.5, yaw: 0 });
  await expect(page.locator('#nav-inventory')).toHaveAttribute('data-count', '1');
  await expect(page.locator('#save-status')).toContainText('unsafe');
});
