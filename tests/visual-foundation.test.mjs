import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrameSampler } from '../src/game/runtime/frame-sampler.ts';
import { isVisualQuality, resolveRenderScale, VISUAL_QUALITY_PRESETS } from '../src/game/runtime/quality.ts';

test('frame window reports nearest-rank p95 and median without losing genuine long stalls', () => {
  const sampler = createFrameSampler({ windowSize: 20, warmupFrames: 0 });
  let now = 0;
  sampler.recordFrame(now);
  for (const duration of [...Array(18).fill(16), 40, 500]) {
    now += duration;
    sampler.recordFrame(now);
  }
  const measured = sampler.snapshot(1000 / 60);
  assert.equal(measured.sampleCount, 20);
  assert.equal(measured.medianFrameMs, 16);
  assert.equal(measured.p95FrameMs, 40);
  assert.equal(measured.maxFrameMs, 500);
  assert.equal(measured.spikeCount, 1);
  assert.equal(measured.overBudgetCount, 2);
  assert.equal(measured.meanFrameMs, 41.4);
  assert.equal(measured.elapsedMs, 828);
  sampler.recordFrame(now + 10);
  assert.equal(sampler.snapshot().sampleCount, 20);
  assert.equal(sampler.snapshot().meanFrameMs, 41.1);
});

test('warmup, invalid timestamps and explicit pause/resume gaps do not contaminate frame measurements', () => {
  const sampler = createFrameSampler({ warmupFrames: 2 });
  for (const now of [0, 1000, 2000, 2016, NaN, 2016, 2000, 2034]) sampler.recordFrame(now);
  assert.equal(sampler.snapshot().sampleCount, 2);
  assert.equal(sampler.snapshot().medianFrameMs, 17);
  sampler.setPaused(true);
  sampler.recordFrame(12000);
  sampler.setPaused(false);
  for (const now of [20000, 21000, 22000, 22020]) sampler.recordFrame(now);
  assert.equal(sampler.snapshot().sampleCount, 3);
  assert.equal(sampler.snapshot().maxFrameMs, 20);
  sampler.reset();
  assert.equal(sampler.snapshot().sampleCount, 0);
  assert.equal(sampler.snapshot().warmupRemaining, 2);
  assert.equal(sampler.snapshot().p95FrameMs, 0);
});

test('a quality change can start a clean measurement without importing previous pause state', () => {
  const sampler = createFrameSampler({ warmupFrames: 0 });
  sampler.recordFrame(0);
  sampler.recordFrame(17);
  sampler.setPaused(true);
  sampler.reset();
  sampler.recordFrame(1000);
  assert.equal(sampler.snapshot().sampleCount, 0);
  assert.equal(sampler.snapshot().paused, true);
  sampler.setPaused(false);
  sampler.recordFrame(2000);
  sampler.recordFrame(2033);
  assert.equal(sampler.snapshot().meanFrameMs, 33);
});

test('quality names reject inherited object keys and preserve immutable explicit budgets', () => {
  for (const name of ['low', 'balanced', 'high', 'cinematic']) assert.equal(isVisualQuality(name), true);
  for (const name of ['constructor', '__proto__', 'auto', '', null, 2]) assert.equal(isVisualQuality(name), false);
  assert.equal(Object.isFrozen(VISUAL_QUALITY_PRESETS), true);
  assert.equal(Object.isFrozen(VISUAL_QUALITY_PRESETS.high), true);
  assert.equal(VISUAL_QUALITY_PRESETS.balanced.shadowMapSize, 512);
});

test('high-DPI rendering uses reciprocal density and never exceeds quality pixel budgets', () => {
  const balanced = resolveRenderScale('balanced', 1000, 600, 2);
  assert.equal(balanced.hardwareScalingLevel, 1);
  assert.equal(balanced.width, 1000);
  const high = resolveRenderScale('high', 1000, 600, 2);
  assert.equal(high.hardwareScalingLevel, 2 / 3);
  assert.equal(high.width, 1500);
  for (const quality of ['low', 'balanced', 'high', 'cinematic']) {
    const profile = VISUAL_QUALITY_PRESETS[quality];
    for (const [width, height, dpr] of [[3840, 2160, 3], [1366, 768, 1], [375, 800, 3], [0, 0, NaN]]) {
      const scale = resolveRenderScale(quality, width, height, dpr);
      assert.ok(Number.isFinite(scale.hardwareScalingLevel));
      assert.ok(scale.pixelRatio <= profile.maxPixelRatio);
      assert.ok(scale.width * scale.height <= profile.maxRenderPixels);
    }
  }
  assert.equal(resolveRenderScale('cinematic', 800, 600, 1).pixelRatio, 1);
});
