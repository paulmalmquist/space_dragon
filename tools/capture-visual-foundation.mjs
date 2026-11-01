// Local native-Chrome comparison. Browser rendering is measured, not inferred from viewport size.
import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const url = process.env.SPACE_DRAGON_REVIEW_URL || 'http://127.0.0.1:5191/space-dragon/';
if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Use a local fixture development server.');
const output = path.resolve(process.argv[2] || 'artifacts/visual-foundation');
const seconds = Number(process.env.SPACE_DRAGON_SAMPLE_SECONDS || 10);
const matched = process.env.SPACE_DRAGON_MATCHED_COMPARE === '1';
if (!Number.isFinite(seconds) || seconds < 2 || seconds > 60) throw new Error('Sample duration must be 2–60 seconds.');
await mkdir(path.join(output, 'after'), { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const viewport = matched ? { width:1366, height:900 } : { width:1366, height:768 };
const report = { browser: browser.version(), viewport: [viewport.width, viewport.height], matchedUnityComparison: matched, samples: [], errors: [], externalRequests: [],
  scope: 'Installed Chrome, native renderer reported below, bounded static-camera samples. No sustained gameplay, second-device or human quality approval.' };
try {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(url).origin) report.externalRequests.push(request.url());
  });
  await page.goto(url);
  if (matched) await page.addStyleTag({ content: '#play-area{width:1280px!important;max-width:none!important;height:720px!important;border:0!important;padding:0!important}canvas#game{width:100%!important;height:100%!important}#play-area>:not(canvas){opacity:0!important}' });
  await page.locator('#begin-quiet').click();
  await expect(page.locator('#game')).toHaveAttribute('data-asset-loaded', 'true', { timeout: 60000 });
  await page.locator('#reduce-motion').check();
  await page.locator('#visual-review summary').click();
  for (const shot of ['home', 'arrival', 'reveal']) {
    if (shot === 'arrival') { await page.locator('#action').click(); await page.locator('#action').click(); }
    // Matched engine comparisons keep the pod closed in both renderers;
    // the standalone foundation review also captures its opened story state.
    if (shot === 'reveal' && !matched) await page.locator('#action').click();
    for (const quality of matched ? ['high'] : shot === 'arrival' ? ['low', 'balanced', 'high', 'cinematic'] : ['balanced']) {
      await page.locator('#visual-quality').selectOption(quality);
      await page.locator('#visual-shot').selectOption(shot);
      await page.waitForFunction(() => window.__SPACE_DRAGON__.snapshot().visual.ready);
      await page.locator('#game').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.__SPACE_DRAGON__.resetPerformanceSample());
      await page.waitForTimeout(seconds * 1000);
      const snapshot = await page.evaluate(() => window.__SPACE_DRAGON__.snapshot());
      expect(snapshot.performance.paused).toBe(false);
      expect(snapshot.performance.sampleCount).toBeGreaterThanOrEqual(30);
      expect(snapshot.performance.drawCalls).toBeGreaterThan(0);
      expect(snapshot.performance.renderWidth).toBeGreaterThan(0);
      expect(snapshot.performance.renderHeight).toBeGreaterThan(0);
      const name = `${shot}-${quality}`;
      await page.locator('#game').screenshot({ path: path.join(output, 'after', `${name}.png`) });
      report.samples.push({ shot, quality, runDurationSeconds: seconds, statistics: 'Last up to 300 rendered intervals after 60 warmup intervals; elapsedMs is the actual measured window.', visual: snapshot.visual, performance: snapshot.performance, pod: snapshot.pod });
      console.log(JSON.stringify({ name, performance: snapshot.performance }));
    }
  }
  report.device = await page.evaluate(() => {
    const canvas = document.querySelector('#game');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return { userAgent: navigator.userAgent, devicePixelRatio, hardwareConcurrency: navigator.hardwareConcurrency,
      renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER),
      viewport: [innerWidth, innerHeight], canvasCss: [canvas.clientWidth, canvas.clientHeight] };
  });
  report.network = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource').filter(entry => entry.name.startsWith(location.origin));
    return { scope: 'Development session cumulative resources, including Vite modules; not a production download measurement.',
      transferBytes: resources.reduce((sum, entry) => sum + entry.transferSize, 0),
      decodedBytes: resources.reduce((sum, entry) => sum + entry.decodedBodySize, 0),
      assets: resources.filter(entry => new URL(entry.name).pathname.includes('/assets/')).map(entry => ({ path: new URL(entry.name).pathname, transferBytes: entry.transferSize, decodedBytes: entry.decodedBodySize })) };
  });
  const files = ['src/game/scene.ts', 'src/game/visual/first-contact-visuals.ts', 'src/game/runtime/frame-sampler.ts', 'src/game/runtime/performance.ts', 'src/game/runtime/quality.ts', 'src/game/runtime/quality-controller.ts', 'src/ui/visual-controls.ts', 'src/main.ts', 'public/assets/pod/rescue-pod-v002.glb'];
  report.artifacts = [];
  for (const file of files) {
    const bytes = await readFile(file);
    report.artifacts.push({ path: file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  await writeFile(path.join(output, 'measurements.json'), JSON.stringify(report, null, 2));
  const panels = [];
  const comparisonQuality = matched ? 'high' : 'balanced';
  for (const shot of ['home', 'arrival']) {
    let before = '';
    try { await access(path.join(output, 'before', `${shot}.png`)); before = `<figure><figcaption>Before · ${shot} · same camera</figcaption><img src="before/${shot}.png"></figure>`; } catch { before = '<p>No prior capture supplied.</p>'; }
    panels.push(`<section>${before}<figure><figcaption>After · ${shot} · ${comparisonQuality}</figcaption><img src="after/${shot}-${comparisonQuality}.png"></figure></section>`);
  }
  await writeFile(path.join(output, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Space Dragon visual comparison</title><style>body{background:#08131e;color:#d5e5ed;font:16px system-ui;margin:32px}section{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:10px 0}img{width:100%}figcaption{padding:10px 0}a{color:#8ddcec}small{color:#b5c3d0}</style><h1>First Contact · visual foundation</h1><p>Fixed cameras, reduced motion, ${viewport.width} × ${viewport.height} native Chrome viewport. Provisional artwork, no human approval.</p><p><a href="measurements.json">Measured session</a></p>${panels.join('')}<figure><figcaption>Pod detail · ${comparisonQuality}</figcaption><img src="after/reveal-${comparisonQuality}.png"></figure><section>${(matched ? [] : ['low', 'high', 'cinematic']).map(quality => `<figure><figcaption>Arrival · ${quality}</figcaption><img src="after/arrival-${quality}.png"></figure>`).join('')}</section></html>`);
  expect(report.errors).toEqual([]);
  expect(report.externalRequests).toEqual([]);
} finally { await browser.close(); }
