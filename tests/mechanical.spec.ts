import { test, expect } from '@playwright/test';
type Snapshot = {
  model: { id: string; meshes: number; triangles: number; bones: string[] };
  muzzle: { alignmentError: number }; shots: number; rollsCompleted: number; rollAngle: number;
  articulation: Record<string, number[]>; power: { index: number; phase: string };
  animation: { mode: string; clips: string[]; ignoredTracks: string[]; weights: Record<string, number>; state: string };
  assetContract: { contactHeight: number; coordinates: { scale: number; forward: number[] }; fallbackAttachments: string[];
    collision: { type: string; radius: number }; attachments: Record<string, { name: string; local: number[]; world: number[] }> };
  wingMotion: { mode: string; flap: number }; position: number[]; targetPositions: number[][];
  elapsed: number; state: string;
  surfaces: { dragonKind: string; mechanicalMaterials: { name: string; color: number[]; metalness: number;
    emissiveIntensity: number; authoredSurface: boolean; normalDetail: string;
    textures: { normal: { size: number[]; colorSpace: string } | null; occlusion: { size: number[]; colorSpace: string } | null } }[] };
};
const state = (page: import('@playwright/test').Page): Promise<Snapshot> => page.evaluate(() =>
  (window as unknown as { __SPACE_DRAGON_DOGFIGHT__: { snapshot(): Snapshot } }).__SPACE_DRAGON_DOGFIGHT__.snapshot());
test('cinematic mechanical skin and baked maps survive live flight, fire, a roll and glide', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('dogfight/');
  await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true', { timeout: 45_000 });
  const initial = await state(page);
  expect(initial.model.id).toBe('space-dragon-flight-v003');
  expect(initial.animation.mode).toBe('exported-clips');
  expect(initial.animation.clips.sort()).toEqual(['Boost', 'Flight', 'Glide']);
  expect(initial.animation.ignoredTracks).toEqual([]);
  expect(initial.assetContract.fallbackAttachments).toEqual([]);
  expect(Object.keys(initial.assetContract.attachments)).toHaveLength(8);
  expect(initial.assetContract.contactHeight).toBeCloseTo(.6650268435, 6);
  expect(initial.assetContract.coordinates.forward).toEqual([0, 0, -1]);
  expect(initial.assetContract.coordinates.scale).toBe(1);
  expect(initial.assetContract.collision.type).toBe('sphere');
  expect(initial.assetContract.collision.radius).toBe(3.3);
  expect(initial.model.meshes).toBe(41); expect(initial.model.triangles).toBe(81991); expect(initial.model.bones).toHaveLength(9);
  expect(initial.surfaces.dragonKind).toBe('mechanical');
  for (const material of initial.surfaces.mechanicalMaterials) {
    expect(material.authoredSurface).toBe(true);
    if (/painted/.test(material.name)) expect(material.metalness).toBeLessThan(.1);
    if (/Crimson|membrane/.test(material.name)) expect(material.color[0]).toBeGreaterThan(material.color[1] * 5);
    if (material.name.endsWith('_Atlas')) {
      expect(material.normalDetail).toBe('imported');
      expect(material.textures.normal?.size).toEqual([1024, 1024]);
      expect(material.textures.occlusion?.size).toEqual([1024, 1024]);
      expect(material.textures.normal?.colorSpace).toBe(''); expect(material.textures.occlusion?.colorSpace).toBe('');
    } else expect(material.normalDetail).toBe('authored-smooth');
  }
  const darkPaint = initial.surfaces.mechanicalMaterials.find(material => material.name === 'SD3_Dark painted armor');
  expect(darkPaint?.color[0]).toBeGreaterThan(0); expect(darkPaint?.color[0]).toBeLessThan(.05);
  const energy = initial.surfaces.mechanicalMaterials.find(material => /Internal orange energy/.test(material.name));
  expect(energy?.emissiveIntensity).toBeGreaterThan(3); expect(energy?.emissiveIntensity).toBeLessThan(4);
  await page.keyboard.press('Enter'); await page.mouse.move(720, 500); await page.mouse.down({ button: 'left' });
  await expect.poll(async () => (await state(page)).shots, { timeout: 20_000 }).toBeGreaterThan(0);
  const firing = await state(page);
  expect(firing.articulation.Jaw).not.toEqual(initial.articulation.Jaw);
  expect(firing.muzzle.alignmentError).toBeLessThan(.00001); expect(firing.power.index).toBe(0);
  expect(firing.assetContract.attachments.wingLeft.world).not.toEqual(initial.assetContract.attachments.wingLeft.world);
  await page.mouse.up({ button: 'left' }); await page.keyboard.press('e');
  await expect.poll(async () => Math.abs((await state(page)).rollAngle), { timeout: 30_000 }).toBeGreaterThan(.5);
  expect((await state(page)).muzzle.alignmentError).toBeLessThan(.00001);
  await expect.poll(async () => (await state(page)).rollsCompleted, { timeout: 40_000 }).toBe(1);
  let glideSample: Snapshot | undefined;
  await expect.poll(async () => {
    const sample = await state(page);
    if (sample.wingMotion.mode === 'glide' && sample.wingMotion.flap === 0) { glideSample = sample; return true; }
    return false;
  }, { timeout: 60_000 }).toBe(true);
  // Keep the observed mode and its pose in one frame across async UI calls.
  const glide = glideSample!;
  expect(glide.wingMotion.flap).toBe(0); expect(glide.articulation.Tail_4).not.toEqual(initial.articulation.Tail_4);
  expect(glide.animation.state).toBe('Glide');
  expect(glide.position).not.toEqual(initial.position); expect(glide.targetPositions).not.toEqual(initial.targetPositions);
  expect(glide.power.phase).toBe('charging'); expect(glide.power.index).toBe(0);
  expect(glide.muzzle.alignmentError).toBeLessThan(.00001);
  await page.keyboard.press('Escape'); const paused = await state(page); await page.waitForTimeout(150);
  expect((await state(page)).articulation).toEqual(paused.articulation); expect(errors).toEqual([]);
});

test('imported boost clips blend through real controls and pause; attachment and render contracts survive reset and resize', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('dogfight/');
  await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true', { timeout: 45_000 });
  const initial = await state(page);
  await page.getByRole('button', { name: /Launch flight/i }).click();
  await page.keyboard.down('Shift');
  await expect.poll(async () => (await state(page)).animation.weights.Boost).toBeGreaterThan(.15);
  const transition = await state(page);
  expect(transition.animation.state).toBe('Boost');
  expect(transition.animation.weights.Boost).toBeLessThan(1);
  expect(Object.values(transition.animation.weights).reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 8);
  expect(transition.position).not.toEqual(initial.position); expect(transition.power.index).toBe(0);
  expect(transition.muzzle.alignmentError).toBeLessThan(.00001);
  for (const component of transition.assetContract.attachments.camera.local) expect(component).toBeCloseTo(0, 8);
  await expect.poll(async () => (await state(page)).animation.weights.Boost).toBeGreaterThan(.8);
  await page.keyboard.press('Escape'); await page.keyboard.up('Shift');
  const paused = await state(page); await page.waitForTimeout(200);
  const held = await state(page);
  expect(held.animation.weights).toEqual(paused.animation.weights);
  expect(held.articulation).toEqual(paused.articulation); expect(held.elapsed).toBe(paused.elapsed);
  await page.getByRole('button', { name: /Resume flight/i }).click();
  await expect.poll(async () => (await state(page)).animation.weights.Boost).toBeLessThan(.2);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Restart encounter/i }).click();
  expect((await state(page)).animation.weights.Boost).toBe(0);
  expect((await state(page)).assetContract.fallbackAttachments).toEqual([]);
  await page.setViewportSize({ width: 1000, height: 720 });
  const readAudit = () => page.evaluate(() => (window as unknown as { __SPACE_DRAGON_DOGFIGHT__: {
    rendererAudit(): { resolution: { css: number[]; drawingBuffer: number[]; pixelRatio: number };
      antialias: { composerSamples: number; supportedRGBA16FSamples?: number[] }; color: { output: string; outputPasses: number } };
  } }).__SPACE_DRAGON_DOGFIGHT__.rendererAudit());
  // Viewport resizing is asynchronous; software rendering may still be
  // completing the old frame when Playwright acknowledges setViewportSize.
  await expect.poll(async () => (await readAudit()).resolution.css, { timeout: 15_000 }).toEqual([1000, 720]);
  const audit = await readAudit();
  expect(audit.resolution.css).toEqual([1000, 720]);
  expect(audit.resolution.drawingBuffer).toEqual([Math.floor(1000 * audit.resolution.pixelRatio), Math.floor(720 * audit.resolution.pixelRatio)]);
  expect(audit.antialias.composerSamples).toBeLessThanOrEqual(2);
  expect(audit.color.output).toBe('srgb'); expect(audit.color.outputPasses).toBe(1);
  expect(errors).toEqual([]);
});
