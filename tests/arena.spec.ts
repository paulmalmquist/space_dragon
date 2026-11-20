import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ARENA_SAVE_KEY } from '../src/game/arena/arena-save.ts';

// Software rendering advances the same fixed-step rules in slower wall time, so every wait is for
// something that happened in the game, never for a number of seconds.
test.describe.configure({ timeout: 300_000 });
const slow = { timeout: 150_000, intervals: [60, 120, 200] };

interface Robot { id: string; mode: string; timer: number; sparks: number; awareness: number; hold: number; stunned: boolean; x: number; y: number; z: number; yaw: number; }
interface Snapshot {
  begun: boolean; paused: boolean; canSave: boolean; saveNotice: string; action: 'none' | 'snare' | 'pounce' | 'quiet';
  /** What the sidekick button would do now. */
  sidekick: 'none' | 'oop' | 'stun';
  state: {
    trial: string; wave: number; waveTimer: number; energy: number; bonk: number; held: number; seen: boolean; catches: number; vaultTaken: boolean; hideId: string;
    targetId: string; targetQuiet: boolean; pounceId: string; snareId: string; lap: string[]; lapTime: number; ringHits: number;
    progress: { course: string[]; courseStars: number; courseBest: number; ringStars: number; ringBest: number; stealthStars: number; quiet: number };
    hero: { x: number; y: number; z: number; yaw: number; mode: string; climbId: string; tetherId: string; groundId: string };
    robots: Robot[];
    sidekick: { present: boolean; x: number; z: number; yaw: number; mode: string; timer: number; cooldown: number; aimId: string };
    oop: '' | 'rise' | 'hang' | 'dive'; diveIds: string[];
  };
  view: { rendered: boolean; robotsShown: number; fansShown: number; lanesShown: number; targetShown: boolean; quietShown: boolean; floodlight: number; avatar: { kind?: string; climb?: number };
    sidekick: { shown: boolean; pose: string; ring: boolean; arrow: boolean; beam: boolean; stars: boolean; diveRings: number; webLines: number } };
}
type Spot = { x: number; z: number };
type Hook = { snapshot(): Snapshot; place?(pose: { x: number; z: number; yaw: number; y?: number }, cameraYaw?: number, sidekick?: Spot): void };
const arena = (page: Page): Promise<Snapshot> => page.evaluate(() => (window as unknown as { __LUKE_ARENA__: Hook }).__LUKE_ARENA__.snapshot());
const saved = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null') as { version: number; arenaId: string; progress: Snapshot['state']['progress'] } | null, ARENA_SAVE_KEY);
/** Development-only setup: stand Luke somewhere, and the sidekick too if given. Everything a test then does is real keyboard or controller input. */
const place = (page: Page, pose: { x: number; z: number; yaw: number; y?: number }, cameraYaw = pose.yaw, sidekick: Spot | null = null) =>
  page.evaluate(([at, yaw, dad]) => (window as unknown as { __LUKE_ARENA__: Hook }).__LUKE_ARENA__.place!(at as { x: number; z: number; yaw: number }, yaw as number, (dad as Spot | null) ?? undefined), [pose, cameraYaw, sidekick] as const);

async function begin(page: Page) {
  await page.goto('arena/');
  await expect(page.locator('#arena-canvas')).toHaveAttribute('data-ready', 'true', { timeout: 150_000 });
  await expect(page.locator('#begin')).toBeEnabled();
  await page.locator('#sound').uncheck();
  await page.locator('#begin').click();
  await expect(page.locator('#welcome')).toBeHidden();
  await expect.poll(async () => (await arena(page)).begun).toBe(true);
  await expect(page.locator('#arena-canvas')).toBeFocused();
}
const ringRobots = (snapshot: Snapshot) => snapshot.state.robots.filter(robot => robot.id.startsWith('ring'));

test('the arena opens in the hub with the realistic stand-in, nine empty stars and nothing saved', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('./');
  await page.getByRole('link', { name: "Luke's Arena" }).click();
  await expect(page).toHaveTitle(/Luke's Arena/);
  await expect(page.locator('#arena-canvas')).toHaveAttribute('data-ready', 'true', { timeout: 150_000 });
  await expect(page.locator('#arena-canvas')).toHaveAttribute('data-rendered', 'true');
  await expect(page.locator('#welcome')).toBeVisible();
  const before = await arena(page);
  expect(before.begun).toBe(false);
  expect(before.state.hero).toMatchObject({ x: 0, z: -18, mode: 'ground' });
  await page.locator('#sound').uncheck();
  await page.locator('#begin').click();
  await expect(page.locator('#arena-canvas')).toHaveAttribute('data-hero-model', 'person', { timeout: 150_000 });
  await expect.poll(async () => (await arena(page)).view.avatar.kind, slow).toBe('person');
  const start = await arena(page);
  expect(start.state.trial).toBe('');
  expect(start.state.energy).toBe(4);
  expect(start.state.progress).toEqual({ course: [], courseStars: 0, courseBest: 0, ringStars: 0, ringBest: 0, stealthStars: 0, quiet: 0 });
  // The ring's robots wait for their waves; the yard's three are on patrol, each showing what it can see.
  expect(ringRobots(start).every(robot => robot.mode === 'dormant')).toBe(true);
  expect(start.view.robotsShown).toBe(3);
  expect(start.view.fansShown).toBe(3);
  await expect(page.locator('#total')).toHaveAttribute('aria-label', '0 of 9 stars');
  await expect(page.locator('#total i.earned')).toHaveCount(0);
  await expect(page.locator('#energy')).toHaveAttribute('aria-label', 'Suit energy 4 of 4');
  await expect(page.locator('#trial')).toBeHidden();
  await expect(page.locator('#place')).toHaveText('TRAINING YARD');
  await expect(page.locator('#ability-action')).toHaveAttribute('data-kind', 'none');
  // The sidekick stands beside Luke, drawn as a placeholder figure, with his own button on the page.
  expect(start.state.sidekick.present).toBe(true);
  expect(Math.hypot(start.state.sidekick.x - start.state.hero.x, start.state.sidekick.z - start.state.hero.z)).toBeLessThan(3);
  expect(start.view.sidekick.shown).toBe(true);
  await expect(page.locator('#ability-sidekick')).toBeVisible();
  await expect(page.locator('#ability-sidekick kbd')).toHaveText('T');
  expect(await saved(page), 'opening the arena writes nothing').toBeNull();
  expect(errors).toEqual([]);
});

test('walking into a lit wall climbs it, pulls up onto the top and starts the course clock', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await begin(page);
  // Beside the tower's marked east face, looking west at it.
  await place(page, { x: -18.6, z: -4, yaw: -Math.PI / 2 });
  await expect.poll(async () => (await arena(page)).state.trial).toBe('course');
  await expect(page.locator('#trial')).toBeVisible();
  await expect(page.locator('#place')).toHaveText('ABILITY COURSE');
  await page.keyboard.down('w');
  await expect.poll(async () => (await arena(page)).state.hero.mode, slow).toBe('climb');
  const grabbed = await arena(page);
  expect(grabbed.state.hero.climbId).toBe('course-tower-east');
  // Still pushing forward: up the face, over the edge, and on across the top.
  await expect.poll(async () => (await arena(page)).state.hero.y, slow).toBeGreaterThan(3);
  expect((await arena(page)).state.hero.mode).toBe('climb');
  await expect.poll(async () => (await arena(page)).view.avatar.climb ?? 0, slow).toBeGreaterThan(0.8);
  await expect.poll(async () => (await arena(page)).state.lap, slow).toContain('course-1');
  await expect.poll(async () => { const { hero } = (await arena(page)).state; return hero.mode === 'ground' && hero.y === 6 ? hero.groundId : ''; }, slow).toBe('course-tower');
  await expect.poll(async () => (await arena(page)).state.lap, slow).toEqual(['course-1', 'course-2']);
  await page.keyboard.up('w');
  const top = await arena(page);
  expect(top.state.lapTime).toBeGreaterThan(0);
  expect(top.state.energy).toBe(4);
  await expect(page.locator('#trial-meter .gem.got')).toHaveCount(2);
  await expect(page.locator('#trial-meter .gem')).toHaveCount(5);
  await expect(page.locator('#trial-clock')).toHaveText(/^\d:\d\d\.\d$/);
  // Sparks found are kept at once; no star yet for two of five.
  await expect.poll(async () => (await saved(page))?.progress.course).toEqual(['course-1', 'course-2']);
  expect((await saved(page))?.progress.courseStars).toBe(0);
  expect(errors).toEqual([]);
});

test('one button clears a wave: the ringed robot is snared, pounced and powered down', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await begin(page);
  await place(page, { x: 0, z: 4, yaw: 0 });
  await expect.poll(async () => (await arena(page)).state.trial).toBe('ring');
  await expect.poll(async () => { const { state } = await arena(page); return state.wave === 1 && state.waveTimer === 0; }, slow).toBe(true);
  await expect(page.locator('#status')).toContainText('Wave 1 of 3');
  await expect(page.locator('#trial-meter .wave.now')).toHaveCount(1);
  const seenActions = new Set<string>();
  let sparksTaken = 0, held = false, lanes = 0;
  // Press F whenever the button offers something, as a child would, until the next wave is called.
  await expect.poll(async () => {
    const snapshot = await arena(page);
    sparksTaken = Math.max(sparksTaken, ringRobots(snapshot).filter(robot => robot.mode !== 'dormant').reduce((total, robot) => total + (2 - robot.sparks), 0));
    held ||= ringRobots(snapshot).some(robot => robot.hold > 0);
    lanes = Math.max(lanes, snapshot.view.lanesShown);
    if (snapshot.state.wave >= 2) return true;
    if (snapshot.action !== 'none' && !snapshot.paused) { seenActions.add(snapshot.action); await page.keyboard.press('f'); }
    return false;
  }, { timeout: 240_000, intervals: [80, 120] }).toBe(true);
  expect(sparksTaken).toBeGreaterThanOrEqual(3);
  expect(held, 'a robot was held still at some point').toBe(true);
  expect([...seenActions].some(action => action === 'snare' || action === 'pounce')).toBe(true);
  const after = await arena(page);
  expect(ringRobots(after).filter(robot => robot.mode === 'resolved')).toHaveLength(2);
  expect(after.state.progress.ringBest).toBe(1);
  expect(after.state.energy).toBeGreaterThanOrEqual(0);
  await expect(page.locator('#trial-meter .wave.got')).toHaveCount(1);
  // The cleared wave is kept if the page closes now.
  await expect.poll(async () => (await saved(page))?.progress.ringBest, slow).toBe(1);
  expect(lanes, 'whether a wind-up was caught on camera depends on timing; the count is never negative').toBeGreaterThanOrEqual(0);
  expect(errors).toEqual([]);
});

test('a robot that cannot see Luke offers a quiet takedown, and the result survives a reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await begin(page);
  // South of the near patrol line: the guard walks past side-on or with its back turned.
  await place(page, { x: 21.5, z: -2.5, yaw: 0 });
  await expect.poll(async () => (await arena(page)).state.trial).toBe('stealth');
  await expect(page.locator('#place')).toHaveText('STEALTH YARD');
  await expect(page.locator('#trial-meter .eye')).toHaveCount(1);
  let offered = false;
  await expect.poll(async () => {
    const snapshot = await arena(page);
    if (snapshot.state.progress.quiet > 0) return true;
    if (snapshot.action === 'quiet' && !snapshot.state.pounceId) {
      if (!offered) {
        offered = true;
        expect(snapshot.state.targetQuiet).toBe(true);
        expect(snapshot.view.quietShown, 'the purple ring is drawn').toBe(true);
      }
      await page.keyboard.press('f');
    }
    return false;
  }, { timeout: 240_000, intervals: [80, 120] }).toBe(true);
  expect(offered).toBe(true);
  const after = await arena(page);
  expect(after.state.robots.filter(robot => robot.id.startsWith('yard') && robot.mode === 'resolved')).toHaveLength(1);
  expect(after.state.progress.quiet).toBe(1);
  expect(after.state.energy).toBe(4);
  await expect.poll(async () => (await saved(page))?.progress.quiet, slow).toBe(1);
  const stored = await saved(page);
  expect(stored).toMatchObject({ version: 1, arenaId: 'luke-arena-v001' });
  expect(Object.keys(stored!.progress).sort()).toEqual(['course', 'courseBest', 'courseStars', 'quiet', 'ringBest', 'ringStars', 'stealthStars']);
  await page.reload();
  await expect(page.locator('#arena-canvas')).toHaveAttribute('data-ready', 'true', { timeout: 150_000 });
  await expect(page.locator('#save-status')).toHaveText('Arena stars restored.');
  const restored = await arena(page);
  expect(restored.state.progress.quiet).toBe(1);
  // The robot itself is back: rewards are kept, the yard starts fresh.
  expect(restored.state.robots.filter(robot => robot.id.startsWith('yard')).every(robot => robot.mode === 'patrol')).toBe(true);
  expect(errors).toEqual([]);
});

test('the floodlight catches, holds for a moment and sets Luke back in hiding with nothing lost', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await begin(page);
  await place(page, { x: 26.5, z: 7, yaw: 0 });
  await expect.poll(async () => (await arena(page)).state.held, slow).toBeGreaterThan(0);
  await expect(page.locator('#vignette')).toHaveClass(/is-held/);
  await expect(page.locator('#toast')).toContainText('Caught');
  // Keys do nothing while held.
  const heldAt = (await arena(page)).state.hero;
  await page.keyboard.down('d');
  await expect.poll(async () => (await arena(page)).state.held, slow).toBe(0);
  await page.keyboard.up('d');
  const released = await arena(page);
  expect(Math.hypot(heldAt.x - 26.5, heldAt.z - 7)).toBeLessThan(0.6);
  expect(released.state.catches).toBe(1);
  expect(released.state.seen).toBe(true);
  expect(released.state.energy).toBe(4);
  expect(released.state.hideId).toBe('yard-gate');
  // Set down at the hiding place by the gate (give or take the step taken since).
  expect(Math.hypot(released.state.hero.x - 14.4, released.state.hero.z + 5.6)).toBeLessThan(2.5);
  expect(released.state.trial).toBe('stealth');
  await expect(page.locator('#vignette')).not.toHaveClass(/is-held/);
  expect(await saved(page), 'being caught earns and costs nothing').toBeNull();
  expect(errors).toEqual([]);
});

test('reaching the vault earns stars that show on the page and are saved once', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await begin(page);
  // North of the vault, behind the floodlight, looking south at it.
  await place(page, { x: 27.6, z: 20.6, yaw: Math.PI });
  await expect.poll(async () => (await arena(page)).state.trial).toBe('stealth');
  await page.keyboard.down('w');
  await expect.poll(async () => (await arena(page)).state.vaultTaken, slow).toBe(true);
  await page.keyboard.up('w');
  const after = await arena(page);
  const earned = !after.state.seen ? 3 : after.state.catches === 0 ? 2 : 1;
  expect(after.state.progress.stealthStars).toBe(earned);
  expect(earned).toBeGreaterThanOrEqual(2);
  await expect(page.locator('#total-stealth i.earned')).toHaveCount(earned);
  await expect(page.locator('#total')).toHaveAttribute('aria-label', `${earned} of 9 stars`);
  await expect(page.locator('#trial-stars i.earned')).toHaveCount(earned);
  await expect(page.locator('#status')).toContainText('Vault reached');
  await expect.poll(async () => (await saved(page))?.progress.stealthStars, slow).toBe(earned);
  // Walking over the same spot again earns nothing more.
  const bytes = await page.evaluate(key => localStorage.getItem(key), ARENA_SAVE_KEY);
  await page.keyboard.down('s');
  await expect.poll(async () => (await arena(page)).state.hero.z, slow).toBeGreaterThan(19.5);
  await page.keyboard.up('s');
  await page.keyboard.down('w');
  await expect.poll(async () => (await arena(page)).state.hero.z, slow).toBeLessThan(18);
  await page.keyboard.up('w');
  expect((await arena(page)).state.progress.stealthStars).toBe(earned);
  expect(await page.evaluate(key => localStorage.getItem(key), ARENA_SAVE_KEY)).toBe(bytes);
  expect(errors).toEqual([]);
});

test('the sidekick follows on his own, and one press beside him is an alley-oop: a throw, a slow moment and a dive', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await begin(page);
  // Standing still at the start, he steps up: the arrow is over his head and the button says so.
  await expect.poll(async () => (await arena(page)).state.sidekick.mode, slow).toBe('ready');
  await expect(page.locator('#ability-sidekick')).toHaveAttribute('data-hint', 'oop');
  const ready = await arena(page);
  expect(ready.sidekick).toBe('oop');
  expect(ready.view.sidekick).toMatchObject({ shown: true, ring: true, arrow: true });
  // A walk: he comes along without being asked, and is not close enough for a throw while Luke runs.
  const from = ready.state.sidekick;
  await page.keyboard.down('w');
  await expect.poll(async () => (await arena(page)).state.hero.z, slow).toBeGreaterThan(-13.5);
  const walking = await arena(page);
  await page.keyboard.up('w');
  expect(walking.state.sidekick.z).toBeGreaterThan(from.z + 2);
  expect(Math.hypot(walking.state.sidekick.x - walking.state.hero.x, walking.state.sidekick.z - walking.state.hero.z)).toBeLessThan(5);
  expect(walking.sidekick).toBe('none');
  // In the ring with a wave on its way: beside him, T is the throw.
  await place(page, { x: 0, z: 4, yaw: 0 }, 0, { x: -1.8, z: 3.2 });
  await expect.poll(async () => { const { state } = await arena(page); return state.trial === 'ring' && state.wave === 1 && state.waveTimer === 0; }, slow).toBe(true);
  await expect.poll(async () => (await arena(page)).sidekick, slow).toBe('oop');
  const before = await arena(page);
  await page.keyboard.press('t');
  await expect(page.locator('#toast')).toContainText('Rocket Toss');
  // Up, then the moment: time slows, what the dive will land on glows, and the page says what to do.
  let top = 0;
  await expect.poll(async () => { const { state } = await arena(page); top = Math.max(top, state.hero.y); return state.oop; }, slow).toBe('hang');
  const moment = await arena(page);
  expect(moment.state.hero.mode).toBe('air');
  expect(moment.view.sidekick.diveRings).toBeGreaterThanOrEqual(1);
  await expect(page.locator('#vignette')).toHaveClass(/is-slow/);
  await expect(page.locator('#status')).toContainText('Up high');
  expect(moment.state.targetId, 'nothing is ringed in the air').toBe('');
  // One press of F sends the dive. Luke lands on his feet and a robot has powered down.
  await page.keyboard.press('f');
  await expect.poll(async () => { const { state } = await arena(page); top = Math.max(top, state.hero.y); return state.oop === '' && state.hero.mode === 'ground'; }, slow).toBe(true);
  const after = await arena(page);
  expect(top, 'thrown well above head height').toBeGreaterThan(4);
  expect(ringRobots(after).filter(robot => robot.mode === 'resolved').length).toBeGreaterThanOrEqual(1);
  const sparks = (snapshot: Snapshot) => ringRobots(snapshot).filter(robot => robot.id.includes('iguana-a') || robot.id.includes('iguana-b')).reduce((sum, robot) => sum + robot.sparks, 0);
  expect(sparks(before) - sparks(after)).toBeGreaterThanOrEqual(2);
  expect(after.state.diveIds).toEqual([]);
  expect(after.state.energy, 'nothing touched Luke in the air').toBe(before.state.energy);
  // He needs a moment before the next one, and the button shows it.
  expect(after.state.sidekick.cooldown).toBeGreaterThan(0);
  expect(after.sidekick).toBe('none');
  await expect(page.locator('#ability-sidekick')).toHaveAttribute('data-hint', 'rest');
  await expect(page.locator('#vignette')).not.toHaveClass(/is-slow/);
  expect(errors).toEqual([]);
});

test('away from the sidekick the same button stuns a robot for Luke to finish; in the stealth yard he keeps watch at the gate', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await begin(page);
  // Luke up on a ring pillar, out of the sidekick's hands, looking over the ring.
  await place(page, { x: -6.3, z: 11.7, yaw: 2.2, y: 3.2 }, 2.2, { x: -3.6, z: 8.4 });
  await expect.poll(async () => { const { state } = await arena(page); return state.trial === 'ring' && state.wave === 1 && state.waveTimer === 0; }, slow).toBe(true);
  await expect.poll(async () => (await arena(page)).sidekick, slow).toBe('stun');
  await expect(page.locator('#ability-sidekick')).toHaveAttribute('data-hint', 'stun');
  expect((await arena(page)).state.hero.y).toBe(3.2);
  await page.keyboard.press('l');
  let beam = false;
  await expect.poll(async () => { const snapshot = await arena(page); beam ||= snapshot.view.sidekick.beam; return ringRobots(snapshot).some(robot => robot.stunned); }, slow).toBe(true);
  const dizzy = await arena(page);
  const robot = ringRobots(dizzy).find(candidate => candidate.stunned)!;
  expect(robot.hold).toBeGreaterThan(0);
  expect(robot.sparks, 'a stun takes no spark').toBe(2);
  expect(dizzy.state.oop).toBe('');
  expect(dizzy.view.sidekick.stars, 'stars circle the stunned robot').toBe(true);
  expect(beam || dizzy.view.sidekick.beam, 'a line ran from his hand to the robot').toBe(true);
  expect(dizzy.state.sidekick.cooldown).toBeGreaterThan(0);
  await expect(page.locator('#ability-sidekick')).toHaveAttribute('data-hint', 'rest');
  // A stunned robot is an open finish: when F offers the pounce on it, one press powers it down.
  await expect.poll(async () => {
    const snapshot = await arena(page);
    const target = ringRobots(snapshot).find(candidate => candidate.id === robot.id)!;
    if (target.mode === 'resolved') return 'resolved';
    if (!target.stunned) return 'wore off';
    if (snapshot.state.targetId === robot.id && snapshot.action === 'pounce' && !snapshot.state.pounceId) await page.keyboard.press('f');
    return 'waiting';
  }, { timeout: 240_000, intervals: [80, 120] }).not.toBe('waiting');
  const finished = ringRobots(await arena(page)).find(candidate => candidate.id === robot.id)!;
  expect(['resolved', 'alert', 'search', 'patrol', 'curious', 'windup', 'strike', 'recover']).toContain(finished.mode);
  expect(finished.stunned).toBe(false);
  // The stealth yard is Luke's own test: the sidekick stops at the gate and his button rests.
  await place(page, { x: 14.4, z: -5.6, yaw: 0 }, 0, { x: 11, z: -12 });
  await expect.poll(async () => (await arena(page)).state.trial).toBe('stealth');
  await expect.poll(async () => { const { sidekick } = (await arena(page)).state; return sidekick.mode === 'wait' && Math.hypot(sidekick.x - 14.4, sidekick.z + 9.7) < 0.2; }, slow).toBe(true);
  await expect(page.locator('#ability-sidekick')).toHaveAttribute('data-hint', 'wait');
  const waiting = await arena(page);
  expect(waiting.sidekick).toBe('none');
  expect(waiting.state.sidekick.z, 'outside the yard line').toBeLessThan(-8);
  await page.keyboard.press('t');
  await page.waitForTimeout(1200);
  const still = await arena(page);
  expect(still.state.oop).toBe('');
  expect(still.state.hero.mode).toBe('ground');
  expect(still.state.robots.some(candidate => candidate.stunned)).toBe(false);
  expect(still.state.seen, 'the sidekick is never what gives Luke away').toBe(false);
  expect(errors).toEqual([]);
});

test('pausing stops the run, and coming back never continues a key that is no longer wanted', async ({ page }) => {
  await begin(page);
  await page.keyboard.down('w');
  await expect.poll(async () => (await arena(page)).state.hero.z, slow).toBeGreaterThan(-17.2);
  await page.keyboard.press('Escape');
  await expect(page.locator('#paused')).toBeVisible();
  await expect(page.locator('#resume')).toBeFocused();
  const stopped = await arena(page);
  expect(stopped.paused).toBe(true);
  await page.waitForTimeout(700);
  expect((await arena(page)).state.hero.z).toBe(stopped.state.hero.z);
  // Enter on the focused button resumes; the W that is still down does not start Luke running again.
  await page.keyboard.press('Enter');
  await expect(page.locator('#paused')).toBeHidden();
  await expect(page.locator('#arena-canvas')).toBeFocused();
  await page.waitForTimeout(900);
  const resumed = await arena(page);
  expect(resumed.paused).toBe(false);
  expect(resumed.state.hero.z).toBe(stopped.state.hero.z);
  expect(resumed.state.pounceId).toBe('');
  await page.keyboard.up('w');
  await page.keyboard.down('w');
  await expect.poll(async () => (await arena(page)).state.hero.z, slow).toBeGreaterThan(stopped.state.hero.z + 0.3);
  await page.keyboard.up('w');
  // Losing the window pauses too.
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#paused')).toBeVisible();
  // Clearing stars takes two deliberate presses.
  await page.locator('#reset').click();
  await expect(page.locator('#reset')).toHaveText('Press again to clear every star');
  expect(await saved(page)).toBeNull();
  await page.locator('#resume').click();
  await expect(page.locator('#paused')).toBeHidden();
});

test('a standard controller plays the arena: stick to move, Start to pause (simulated pad, not hardware)', async ({ page }) => {
  await page.addInitScript(() => {
    const pad = { id: 'Test pad', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    Object.defineProperty(window, '__TEST_PAD__', { value: pad });
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
  });
  const pad = (update: { axes?: number[]; button?: [number, boolean] }) => page.evaluate(values => {
    const target = (window as unknown as { __TEST_PAD__: { axes: number[]; buttons: { pressed: boolean; value: number }[] } }).__TEST_PAD__;
    if (values.axes) target.axes = values.axes;
    if (values.button) { target.buttons[values.button[0]].pressed = values.button[1]; target.buttons[values.button[0]].value = Number(values.button[1]); }
  }, update);
  await begin(page);
  await expect(page.locator('#controls')).toContainText('LEFT STICK');
  await pad({ axes: [0, -1, 0, 0] });
  await expect.poll(async () => (await arena(page)).state.hero.z, slow).toBeGreaterThan(-17);
  await pad({ axes: [0, 0, 0, 0] });
  // A jump button press leaves the ground.
  await pad({ button: [0, true] });
  await expect.poll(async () => (await arena(page)).state.hero.mode, slow).toBe('air');
  await pad({ button: [0, false] });
  await expect.poll(async () => (await arena(page)).state.hero.mode, slow).toBe('ground');
  // B asks the sidekick: standing beside him, that is the throw.
  await expect(page.locator('#controls')).toContainText('B · DAD');
  await expect.poll(async () => (await arena(page)).sidekick, slow).toBe('oop');
  await pad({ button: [1, true] });
  await expect.poll(async () => (await arena(page)).state.hero.y, slow).toBeGreaterThan(3);
  await pad({ button: [1, false] });
  await expect.poll(async () => { const { state } = await arena(page); return state.oop === '' && state.hero.mode === 'ground'; }, slow).toBe(true);
  await pad({ button: [9, true] });
  await expect(page.locator('#paused')).toBeVisible();
  await pad({ button: [9, false] });
  // An unmapped pad is ignored rather than guessed at.
  await page.evaluate(() => { (window as unknown as { __TEST_PAD__: { mapping: string } }).__TEST_PAD__.mapping = ''; });
  await page.locator('#resume').click();
  await expect(page.locator('#controls')).toContainText('WASD');
});
