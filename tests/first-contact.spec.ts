import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createInitialState, nextAction, transition } from '../src/game/state.ts';
import type { GameState, Phase } from '../src/game/state.ts';

const saveKey = 'space-dragon.checkpoint.v2';
const backupKey = 'space-dragon.checkpoint.v2.backup';
const legacyKey = 'space-dragon.checkpoint.v1';
interface Snapshot {
  state: GameState;
  selectedTarget: number;
  paused: boolean;
  started: boolean;
  speechEnabled: boolean;
  rendered: boolean;
  frames: number;
  pod: { loaded: boolean; triangles: number; textureCompression: string; animations: string[] };
}
const snapshot = (page: Page) => page.evaluate(() =>
  (window as unknown as { __SPACE_DRAGON__: { snapshot(): Snapshot } }).__SPACE_DRAGON__.snapshot());
const phase = (page: Page, expected: Phase) => expect(page.locator('body')).toHaveAttribute('data-phase', expected);

async function seedSaves(page: Page, values: Record<string, string>) {
  await page.addInitScript(entries => {
    if (sessionStorage.getItem('synthetic-save-seeded')) return;
    for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
    sessionStorage.setItem('synthetic-save-seeded', 'true');
  }, values);
}
async function begin(page: Page, sound = false) {
  await page.goto('./');
  await page.locator(sound ? '#begin-sound' : '#begin-quiet').click();
  await page.locator('#game').focus();
}
async function reachSuits(page: Page) {
  await begin(page);
  for (const next of ['signal', 'backyard', 'suits'] as const) {
    await page.keyboard.press('Space');
    await phase(page, next);
  }
}
async function revealSuits(page: Page) {
  for (let count = 1; count <= 5; count++) {
    await page.keyboard.press('Space');
    await expect(page.locator('body')).toHaveAttribute('data-suits-count', String(count));
  }
  await phase(page, 'scan');
}
function savedStateAt(target: Phase): GameState {
  let state = createInitialState();
  for (let attempt = 0; state.phase !== target && attempt < 20; attempt++) state = transition(state, nextAction(state));
  if (state.phase !== target) throw new Error(`Cannot construct synthetic ${target} checkpoint`);
  return state;
}

test('renders the compressed pod and completes First Contact with keyboard checkpoints', async ({ page }) => {
  const errors: string[] = [];
  const externalRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).hostname !== '127.0.0.1') externalRequests.push(request.url());
  });
  await begin(page);
  await expect(page.locator('#game')).toHaveAttribute('data-rendered', 'true');
  await expect(page.locator('#game')).toHaveAttribute('data-asset-loaded', 'true', { timeout: 20_000 });
  await phase(page, 'living-room');
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/first-contact-desktop.png', fullPage: true });
  for (const next of ['signal', 'backyard', 'suits'] as const) {
    await page.keyboard.press('Enter');
    await phase(page, next);
  }
  await expect(page.locator('#suit-card')).toContainText('Paul');
  await page.screenshot({ path: 'artifacts/first-contact-suit.png', fullPage: true });
  await revealSuits(page);
  await page.screenshot({ path: 'artifacts/first-contact-scan.png', fullPage: true });
  const before = await snapshot(page);
  expect(before.state.suits).toEqual(['paul', 'maria', 'luke', 'luna', 'lyla']);
  expect(before.pod).toMatchObject({ loaded: true, textureCompression: 'KTX2 ETC1S' });
  expect(before.pod.triangles).toBeGreaterThan(0);
  expect(before.pod.animations).toContain('pod_open');
  const quietPanel = page.getByRole('button', { name: 'Quiet panel', exact: true });
  await quietPanel.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Shimmering diamond', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(quietPanel).toBeFocused();
  await page.keyboard.press('Space');
  await phase(page, 'archive');
  expect((await snapshot(page)).state.scanAssisted).toBe(false);
  await expect(page.locator('#archive-card')).toBeVisible();
  await page.keyboard.press('Enter');
  await phase(page, 'map');
  await expect(page.locator('#town-map')).toBeVisible();
  await page.screenshot({ path: 'artifacts/first-contact-map.png', fullPage: true });
  const complete = (await snapshot(page)).state;
  for (let i = 0; i < 3; i++) await page.keyboard.press('Space');
  expect((await snapshot(page)).state).toEqual(complete);
  await page.reload();
  await page.locator('#begin-quiet').click();
  await phase(page, 'map');
  expect((await snapshot(page)).state).toEqual(complete);
  await expect(page.locator('#save-status')).toContainText('restored');
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('#restart').click();
  await phase(page, 'map');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#restart').click();
  await phase(page, 'living-room');
  expect((await snapshot(page)).state.suits).toEqual([]);
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
  await writeFile('artifacts/browser-smoke-state.json', JSON.stringify({
    automationRenderer: 'Chromium / SwiftShader; not a hardware benchmark', state: before,
  }, null, 2));
});

test('suit introduction resumes midway without skipping or duplicating a suit', async ({ page }) => {
  await reachSuits(page);
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await expect(page.locator('#suit-card')).toContainText('Luke');
  await page.reload();
  await page.locator('#begin-quiet').click();
  await phase(page, 'suits');
  expect((await snapshot(page)).state.suits).toEqual(['paul', 'maria']);
  await expect(page.locator('#suit-card')).toContainText('Luke');
  await page.locator('#game').focus();
  for (const count of [3, 4, 5]) {
    await page.keyboard.press('Enter');
    await expect(page.locator('body')).toHaveAttribute('data-suits-count', String(count));
  }
  await phase(page, 'scan');
});

test('the scan gives gentle feedback, escalates help and completes together without a story lock', async ({ page }) => {
  await reachSuits(page);
  await revealSuits(page);
  await page.keyboard.press('Space');
  await phase(page, 'scan');
  await expect(page.locator('#spoken-caption')).toContainText('That panel is resting');
  expect((await snapshot(page)).state.flags.archiveCardSymbol).toBe(false);
  await page.keyboard.press('F1');
  await expect(page.locator('#help-message')).toHaveText('Look for the glow');
  await page.keyboard.press('F1');
  await expect(page.locator('#help-message')).toHaveText('A little nudge');
  await page.locator('#help').click();
  await expect(page.locator('#help-message')).toHaveText('Let’s do it together');
  await expect(page.locator('#action')).toBeFocused();
  expect((await snapshot(page)).selectedTarget).toBe(1);
  await page.keyboard.press('Space');
  await phase(page, 'archive');
  expect((await snapshot(page)).state.scanAssisted).toBe(true);
  await expect(page.locator('#scan-outcome')).toContainText('everyone helped');
  await page.keyboard.press('Enter');
  await phase(page, 'map');
  expect((await snapshot(page)).state.flags.missionPreschoolAvailable).toBe(true);
});

for (const heldKey of ['Space', 'Enter']) {
test(`automatic help waits while paused; held ${heldKey} and focus loss do not skip scenes`, async ({ page }) => {
  await begin(page);
  await page.locator('#action').focus();
  await page.keyboard.down(heldKey);
  await phase(page, 'signal');
  for (let i = 0; i < 4; i++) await page.keyboard.down(heldKey);
  await page.keyboard.up(heldKey);
  await phase(page, 'signal');
  await page.clock.install();
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).toHaveAttribute('data-paused', 'true');
  await page.clock.fastForward(36_100);
  expect((await snapshot(page)).state.hintLevel).toBe(0);
  await page.keyboard.press('Space');
  await phase(page, 'signal');
  await expect(page.locator('body')).toHaveAttribute('data-paused', 'false');
  await page.clock.fastForward(12_100);
  expect((await snapshot(page)).state.hintLevel).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('body')).toHaveAttribute('data-paused', 'true');
  await page.clock.fastForward(24_100);
  expect((await snapshot(page)).state.hintLevel).toBe(1);
  await page.keyboard.press('Enter');
  await expect(page.locator('body')).toHaveAttribute('data-paused', 'false');
  await phase(page, 'signal');
});
}

test('browser narrator receives the captioned prompts and H repeats them', async ({ page }) => {
  await page.addInitScript(() => {
    const spoken: string[] = [];
    Object.defineProperty(window, '__testSpoken', { value: spoken });
    class Utterance {
      text: string;
      onstart?: () => void;
      onend?: () => void;
      constructor(text: string) { this.text = text; }
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: Utterance });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => [{ lang: 'en-US', localService: true, default: true }],
      cancel() {},
      speak(utterance: Utterance) {
        spoken.push(utterance.text);
        queueMicrotask(() => { utterance.onstart?.(); utterance.onend?.(); });
      },
    } });
  });
  await begin(page, true);
  const spoken = () => page.evaluate(() => (window as unknown as { __testSpoken: string[] }).__testSpoken);
  const initial = await page.locator('#spoken-caption').textContent();
  expect((await spoken()).at(-1)).toBe(initial);
  await expect(page.locator('#narrator-status')).toContainText('Placeholder computer narrator');
  const before = (await spoken()).length;
  await page.keyboard.press('h');
  expect((await spoken()).length).toBe(before + 1);
  expect((await spoken()).at(-1)).toBe(initial);
  await page.keyboard.press('Space');
  await phase(page, 'signal');
  expect((await spoken()).at(-1)).toBe(await page.locator('#spoken-caption').textContent());
  await page.locator('#sound').click();
  await expect(page.locator('#sound-state')).toHaveText('Sound off');
});

test('unavailable browser speech is stated honestly and H never blocks progress', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: undefined }));
  await begin(page, true);
  await expect(page.locator('#narrator-status')).toContainText('Speech unavailable');
  await page.keyboard.press('h');
  await page.keyboard.press('Space');
  await phase(page, 'signal');
  await expect(page.locator('#spoken-caption')).toContainText('go see, together');
});

for (const [step, expected] of [['computer', 'signal'], ['backyard', 'backyard'], ['pod', 'suits']] as const) {
  test(`upgrades legacy ${step} progress without inventing new rewards`, async ({ page }) => {
    const raw = JSON.stringify({ version: 1, step });
    await seedSaves(page, { [legacyKey]: raw });
    await begin(page);
    await phase(page, expected);
    await expect(page.locator('#save-status')).toContainText('upgraded');
    expect((await snapshot(page)).state.suits).toEqual([]);
    await page.keyboard.press('Space');
    expect(await page.evaluate(key => localStorage.getItem(key), legacyKey)).toBe(raw);
    expect(JSON.parse((await page.evaluate(key => localStorage.getItem(key), saveKey))!).version).toBe(2);
  });
}

test('an unreadable primary checkpoint recovers the prior valid backup', async ({ page }) => {
  await seedSaves(page, { [saveKey]: '{broken-json', [backupKey]: JSON.stringify(savedStateAt('backyard')) });
  await begin(page);
  await phase(page, 'backyard');
  await expect(page.locator('#save-status')).toContainText('previous checkpoint is restored');
  await page.keyboard.press('Space');
  await phase(page, 'suits');
  await page.reload();
  await page.locator('#begin-quiet').click();
  await phase(page, 'suits');
});

test('newer save versions are preserved until an explicit reset is confirmed', async ({ page }) => {
  const future = '{"version":99,"futureProgress":"preserve these exact bytes"}';
  await seedSaves(page, { [saveKey]: future });
  await begin(page);
  await expect(page.locator('#save-status')).toContainText('newer build');
  await page.keyboard.press('Space');
  await phase(page, 'signal');
  expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(future);
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('#restart').click();
  expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(future);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#restart').click();
  await phase(page, 'living-room');
  expect(await page.evaluate(key => localStorage.getItem(key), backupKey)).toBe(future);
});

test('malformed progress restarts safely with a clear notice', async ({ page }) => {
  await seedSaves(page, { [saveKey]: '{"version":2,"phase":"scan","suits":[]}' });
  await begin(page);
  await phase(page, 'living-room');
  await expect(page.locator('#save-status')).toContainText('could not be read');
  await page.keyboard.press('Space');
  await phase(page, 'signal');
});

test('blocked storage permits the supported story flow without claiming a durable save', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith('space-dragon.')) throw new DOMException('Storage quota test', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  await begin(page);
  await phase(page, 'living-room');
  await page.keyboard.press('Space');
  await phase(page, 'signal');
  await expect(page.locator('#save-status')).toContainText('storage is unavailable or full');
});

test('notebook preserves drafts, isolates game keys and appends only to the test inbox', async ({ page }) => {
  await begin(page);
  await page.getByRole('button', { name: 'Idea notebook' }).click();
  await expect(page.locator('#notebook')).toBeVisible();
  const thought = `Synthetic capture ${Date.now()}: wing light 🐉.\nA sound idea can come later.`;
  await page.getByLabel('Your thought').fill(thought);
  await page.keyboard.press('Space');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('h');
  await phase(page, 'living-room');
  await page.getByLabel('Your thought').fill(thought);
  await page.getByRole('button', { name: 'Save idea', exact: true }).click();
  await expect(page.locator('#idea-status')).toContainText('Saved to your idea inbox. NOTE-');
  expect(await readFile('artifacts/test-inbox.md', 'utf8')).toContain(thought.split('\n').map(line => `> ${line}`).join('\n'));
  const draft = 'Keep this thought when a write fails.';
  await page.getByLabel('Your thought').fill(draft);
  await page.route('**/__ideas', route => route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"Synthetic write failure"}' }));
  await page.getByRole('button', { name: 'Save idea', exact: true }).click();
  await expect(page.locator('#idea-status')).toHaveText('Synthetic write failure');
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

test('local capture rejects cross-site and malformed writes and denies source references', async ({ request, baseURL }) => {
  const url = new URL('__ideas', baseURL!).href;
  expect((await request.post(url, { headers: { Origin: 'https://another-site.example' }, data: { thought: 'must not append' } })).status()).toBe(403);
  expect((await request.post(url, { headers: { Origin: new URL(baseURL!).origin }, data: { thought: '   ' } })).status()).toBe(400);
  expect((await request.get('/space-dragon/assets/reference/family/photos/IMG_3277.jpeg')).status()).toBe(403);
  expect((await request.get('/space-dragon/unity/SpaceDragon/Assets/SpaceDragon/Runtime/FirstContactExperience.cs')).status()).toBe(403);
});

test('a narrow viewport fits the supplemental touch layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await begin(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('#action').tap();
  await phase(page, 'signal');
  await page.screenshot({ path: 'artifacts/first-contact-mobile.png', fullPage: true });
});
