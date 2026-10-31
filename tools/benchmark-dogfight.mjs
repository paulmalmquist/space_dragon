// Short actual-game sample on installed Chrome. It is not a sustained frame-rate
// guarantee; keep original and candidate samples and note concurrent workload.
import { chromium, expect } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const output = process.argv[2] || 'artifacts/dogfight-benchmark';
const url = process.env.SPACE_DRAGON_REVIEW_URL || 'http://127.0.0.1:5173/space-dragon/';
if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Benchmark requires local development server.');
await mkdir(path.dirname(output), { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const started = performance.now();
  await page.goto(new URL('dogfight/', url).href);
  await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true', { timeout: 60000 });
  const readyMs = performance.now() - started;
  const initial = await page.evaluate(() => window.__SPACE_DRAGON_DOGFIGHT__.snapshot());
  await page.getByRole('button', { name: /Launch flight/i }).click();
  await expect.poll(() => page.evaluate(() => window.__SPACE_DRAGON_DOGFIGHT__.snapshot().state)).toBe('playing');
  await page.waitForTimeout(800);
  const sample = await page.evaluate(() => new Promise(resolve => {
    const intervals = []; let previous, start;
    function frame(now) {
      start ??= now;
      if (previous !== undefined) intervals.push(now - previous);
      previous = now;
      if (now - start < 10000) return requestAnimationFrame(frame);
      const sorted = [...intervals].sort((a, b) => a - b);
      const meanMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const canvas = document.querySelector('#game'), gl = canvas.getContext('webgl2');
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      resolve({ durationMs: now - start, frames: intervals.length, meanMs,
        p95Ms: sorted[Math.floor(sorted.length * .95)], estimatedFps: 1000 / meanMs,
        canvasPixels: [canvas.width, canvas.height], devicePixelRatio: window.devicePixelRatio,
        renderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        state: window.__SPACE_DRAGON_DOGFIGHT__.snapshot() });
    }
    requestAnimationFrame(frame);
  }));
  expect(sample.state.state).toBe('playing');
  // Inventory traversal is deliberately outside the timed frame sample.
  const rendererAudit = await page.evaluate(() => window.__SPACE_DRAGON_DOGFIGHT__.rendererAudit?.() ?? null);
  await page.screenshot({ path: `${output}.png` });
  await page.keyboard.press('Escape');
  const result = { browser: browser.version(), viewport: [1366, 768], readyMs, initial, sample, rendererAudit, errors,
    scope: '10 seconds of idle live combat on installed Chrome headless; hardware renderer reported, sound default off. Not a sustained or human quality pass.' };
  await writeFile(`${output}.json`, JSON.stringify(result, null, 2));
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ output, model: initial.model, readyMs, loading: initial.loading,
    sample: { meanMs: sample.meanMs, p95Ms: sample.p95Ms, fps: sample.estimatedFps, draw: sample.state.renderer, renderer: sample.renderer }, errors }));
} finally { await browser.close(); }
