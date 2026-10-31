import { test, expect as baseExpect, type Page } from '@playwright/test';
import { chargeDisplayedWord } from './helpers/dogfight';
const expect = baseExpect.configure({ timeout: 15_000 });

type Snapshot = {
  state: string; position: number[]; forward: number[]; health: number[]; energy: number; elapsed: number; keys: string[];
  aim: { x: number; y: number }; mouseMode: string; mouse: { fire: boolean; zoom: boolean; active: boolean };
  power: { phase: string; index: number; word: string; assisted: boolean; lockedIds: number[];
    burstsFired: number; burstsResolved: number; burst: { elapsed: number; targetIds: number[]; stage: string } | null };
  breathVisual: { paths: { beamVisible: boolean }[] };
  breathHits: number; enemyShots: number; targetPositions: number[][]; shots: number;
};
const state = (page: Page): Promise<Snapshot> => page.evaluate(() =>
  (window as unknown as { __SPACE_DRAGON_DOGFIGHT__: { snapshot(): Snapshot } }).__SPACE_DRAGON_DOGFIGHT__.snapshot());
async function launch(page: Page) {
  await page.goto('dogfight/');
  await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-spell-held', 'false');
}
async function aimForLock(page: Page) {
  await expect.poll(async () => {
    const locked = (await state(page)).power.lockedIds;
    if (locked.length) return locked.length;
    const marker = page.locator('.target-marker:not(.offscreen)').first();
    const box = await marker.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    return 0;
  }, { timeout: 30_000, intervals: [50, 100, 100, 100] }).toBe(1);
}

test('one letter at a time charges, dwell locks, Space animates one exact impact and the next word begins', async ({ page }) => {
  test.setTimeout(150_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await launch(page);
  const word = (await state(page)).power.word;
  await expect(page.locator('#power-letter')).toHaveText(word[0]);
  await page.keyboard.press('v'); // Unbound and absent from the word pool; B is the break maneuver.
  expect((await state(page)).power.index).toBe(0);
  await page.keyboard.press(word[0].toLowerCase());
  await expect(page.locator('#power-letter')).toHaveText(word[1]);
  await page.keyboard.press('Escape'); await page.keyboard.press(word[1].toLowerCase());
  expect((await state(page)).power.index).toBe(1);
  await page.keyboard.press('Enter');
  await page.keyboard.press('m');
  // Aim away from all ships first: firing without a lock cannot spend charge.
  await page.mouse.move(1250, 220);
  await page.keyboard.type(word.slice(1).toLowerCase());
  await expect(page.locator('body')).toHaveAttribute('data-power-phase', 'ready');
  await page.keyboard.press('Space');
  expect((await state(page)).power.burstsFired).toBe(0);
  expect((await state(page)).power.phase).toBe('ready');
  await aimForLock(page);
  const locked = await state(page), targetId = locked.power.lockedIds[0];
  expect(locked.power.lockedIds).toHaveLength(1);
  await expect(page.locator(`[data-target-id="${targetId}"]`)).toHaveAttribute('data-locked', 'true');
  await page.keyboard.down('Space');
  await expect(page.locator('body')).toHaveAttribute('data-power-phase', 'burst');
  const winding = await state(page);
  expect(winding.power.burst?.stage).toBe('windup');
  expect(winding.breathVisual.paths.every(path => !path.beamVisible)).toBe(true);
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await state(page)).elapsed, { intervals: [20, 30, 50] }).toBeGreaterThan(winding.elapsed + .12);
  const movingWindup = await state(page);
  expect(movingWindup.position).not.toEqual(winding.position); expect(movingWindup.keys).toContain('ArrowRight');
  expect(movingWindup.breathHits).toBe(0);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Escape');
  const paused = await state(page);
  await page.waitForTimeout(200); // A paused burst clock must stay frozen across rendered frames.
  expect((await state(page)).power.burst).toEqual(paused.power.burst);
  expect((await state(page)).health).toEqual(paused.health);
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-breath-stage', 'beam');
  await expect.poll(async () => (await state(page)).breathVisual.paths.some(path => path.beamVisible), { intervals: [20, 30, 50] }).toBe(true);
  await expect.poll(async () => (await state(page)).power.burstsResolved, { timeout: 30_000 }).toBe(1);
  const impact = await state(page);
  expect(impact.health[targetId]).toBe(0);
  expect(impact.health.filter((_, index) => index !== targetId)).toEqual([216, 216]);
  expect(impact.breathHits).toBe(1); expect(impact.power.burstsFired).toBe(1);
  await expect(page.locator('#radar-scope')).toHaveAttribute('data-contacts', '2');
  await expect(page.locator(`[data-radar-id="${targetId}"]`)).toBeHidden();
  expect(impact.power.word).not.toBe(word); expect(impact.power.index).toBe(0);
  expect(impact.power.lockedIds).toEqual([]);
  await expect(page.locator('#power-letter')).toHaveText(impact.power.word[0]);
  await page.keyboard.up('Space');
  await page.keyboard.press('Space');
  expect((await state(page)).power.burstsFired).toBe(1);
  expect(errors).toEqual([]);
});

test('spelling keeps flight, enemy attacks and damage active; letters and help preserve pilot input', async ({ page }) => {
  test.setTimeout(150_000);
  await launch(page);
  const initial = await state(page);
  const word = initial.power.word;
  await expect.poll(async () => (await state(page)).elapsed, { timeout: 15_000 }).toBeGreaterThan(initial.elapsed + .4);
  const moving = await state(page);
  expect(moving.position[2]).toBeLessThan(initial.position[2] - 10);
  expect(moving.targetPositions).not.toEqual(initial.targetPositions);
  expect(moving.power.phase).toBe('charging'); expect(moving.power.index).toBe(0);
  await expect.poll(async () => (await state(page)).enemyShots, { timeout: 20_000 }).toBeGreaterThan(0);
  // Straight flight does not receive spelling immunity: real enemy projectiles can hit.
  await expect.poll(async () => (await state(page)).energy, { timeout: 30_000 }).toBeLessThan(100);
  expect((await state(page)).power.index).toBe(0);
  await page.keyboard.down('d');
  await expect.poll(async () => (await state(page)).aim.x).toBeGreaterThan(.2);
  await page.keyboard.up('d');
  expect((await state(page)).power.index).toBe(0); // Flight/aim bindings are never spelling answers.
  await page.mouse.move(720, 500); await page.mouse.down({ button: 'left' });
  await expect.poll(async () => (await state(page)).shots).toBeGreaterThan(0);
  await page.mouse.up({ button: 'left' });
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await state(page)).forward[0]).toBeGreaterThan(.1);
  await page.keyboard.press(word[0].toLowerCase());
  expect((await state(page)).power.index).toBe(1);
  expect((await state(page)).keys).toContain('ArrowRight');
  await page.keyboard.type(word.slice(1).toLowerCase());
  expect((await state(page)).power.phase).toBe('ready');
  expect((await state(page)).keys).toContain('ArrowRight');
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Restart encounter', exact: false }).click();
  await page.keyboard.down('ArrowLeft'); await page.keyboard.press('F1');
  expect((await state(page)).power.assisted).toBe(true);
  expect((await state(page)).keys).toContain('ArrowLeft');
  await page.keyboard.up('ArrowLeft');
});

test('mouse mode changes target or flight independently and switching releases held fire and zoom', async ({ page }) => {
  test.setTimeout(60_000);
  await launch(page); await chargeDisplayedWord(page);
  await page.keyboard.press('m');
  await expect(page.locator('body')).toHaveAttribute('data-mouse-mode', 'aim');
  await page.mouse.move(1100, 350);
  await expect.poll(async () => (await state(page)).aim.x).toBeGreaterThan(.5);
  expect((await state(page)).forward).toEqual([0, 0, -1]);
  await page.mouse.move(1400, 930);
  const edgeReticle = await page.locator('#reticle').boundingBox();
  expect(edgeReticle!.x + edgeReticle!.width / 2).toBeCloseTo(1400, 1);
  expect(edgeReticle!.y + edgeReticle!.height / 2).toBeCloseTo(930, 1);
  await page.mouse.move(1100, 350);
  const aimX = (await state(page)).aim.x;
  await page.keyboard.down('ArrowLeft');
  await expect.poll(async () => (await state(page)).forward[0]).toBeLessThan(-.1);
  await page.keyboard.up('ArrowLeft');
  expect((await state(page)).aim.x).toBe(aimX);
  await page.mouse.down({ button: 'left' }); await page.mouse.down({ button: 'right' });
  await page.keyboard.press('m');
  const switched = await state(page);
  expect(switched.mouseMode).toBe('flight'); expect(switched.mouse.fire).toBe(false);
  expect(switched.mouse.zoom).toBe(false); expect(switched.mouse.active).toBe(false);
  await page.mouse.up({ button: 'left' }); await page.mouse.up({ button: 'right' });
  await page.mouse.move(1050, 500);
  await expect.poll(async () => (await state(page)).forward[0], { timeout: 15_000 }).toBeGreaterThan(switched.forward[0] + .1);
  expect((await state(page)).aim.x).toBeCloseTo(1050 / 1440 * 2 - 1, 6);
  expect((await state(page)).aim.y).toBeCloseTo(0, 6);
  await page.getByRole('button', { name: 'Mouse: fly', exact: false }).click();
  expect((await state(page)).mouseMode).toBe('aim');
  await page.keyboard.down('ArrowUp');
  expect((await state(page)).keys).toContain('ArrowUp');
  await page.keyboard.press('m');
  await page.keyboard.down('ArrowUp'); // Same held key emits repeat; it must not resurrect cleared input.
  expect((await state(page)).keys).not.toContain('ArrowUp');
  await page.keyboard.up('ArrowUp');
});

test('partial word survives pause; reload and retry reset it; help charges with an assistance flag', async ({ page }) => {
  await launch(page); await page.keyboard.type((await state(page)).power.word.slice(0, 2).toLowerCase());
  await page.keyboard.press('Escape');
  await page.keyboard.press('F1'); expect((await state(page)).power.index).toBe(2);
  await page.keyboard.press('Enter'); expect((await state(page)).power.index).toBe(2);
  await page.reload();
  await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
  expect((await state(page)).power.index).toBe(0);
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Help together', exact: false }).click();
  expect((await state(page)).power.phase).toBe('ready'); expect((await state(page)).power.assisted).toBe(true);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Restart encounter', exact: false }).click();
  expect((await state(page)).power.phase).toBe('charging');
  expect((await state(page)).power.assisted).toBe(false); expect((await state(page)).power.burstsFired).toBe(0);
});
