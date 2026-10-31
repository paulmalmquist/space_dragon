// Production-only load evidence. No development scene API or simulated renderer is used.
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const url = process.env.SPACE_DRAGON_BABYLON_URL || 'http://127.0.0.1:4191/space-dragon/';
const origin = new URL(url).origin;
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Use a local production preview.');
const output = path.resolve(process.argv[2] || 'artifacts/unity/babylon-production-load.json');
await mkdir(path.dirname(output), { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = {
  capturedAt: new Date().toISOString(), browser: browser.version(), url,
  viewport: [1366, 900], requestedCanvasCss: [1280, 720], deviceScaleFactor: 1, quality: 'high',
  scope: 'Production Babylon First Contact load in installed Chrome. Rendering starts behind the welcome screen; Play quietly starts story controls. These events are not equivalent to Unity player download, shader work, or its three-second intro handoff.',
  cache: 'Fresh isolated browser context; Chromium HTTP cache disabled before navigation; service workers blocked.',
  errors: [], externalRequests: [], networkMeasurementErrors: [],
};
const transfers = [];
const pendingTransfers = [];
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  context.on('request', request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== origin) report.externalRequests.push(request.url());
  });
  context.on('requestfailed', request => report.errors.push(`Request failed: ${request.url()} · ${request.failure()?.errorText ?? 'unknown reason'}`));
  context.on('requestfinished', request => {
    if (!request.url().startsWith(origin + '/')) return;
    const job = (async () => {
      try {
        const sizes = await request.sizes();
        const response = await request.response();
        if (!Number.isFinite(sizes.responseBodySize) || sizes.responseBodySize < 0 || sizes.responseHeadersSize < 0)
          throw new Error('The browser did not provide complete encoded response sizes.');
        transfers.push({ path: new URL(request.url()).pathname, type: request.resourceType(), status: response?.status(), contentEncoding:await response?.headerValue('content-encoding') || 'identity',
          encodedBodyBytes: sizes.responseBodySize, responseHeaderBytes: sizes.responseHeadersSize,
          transferBytes: sizes.responseBodySize + sizes.responseHeadersSize });
      } catch (error) { report.networkMeasurementErrors.push({ path: new URL(request.url()).pathname, error: String(error) }); }
    })();
    pendingTransfers.push(job);
  });
  await page.addInitScript(() => {
    localStorage.setItem('space-dragon.visual-quality.v1', 'high');
    performance.setResourceTimingBufferSize(1000);
    const times = window.__SD_LOAD_OBSERVATION__ = {
      firstRenderMs: null, assetReadyMs: null, visualReadyMs: null, playQuietClickMs: null,
      storyReadyAfterClickMs: null, alreadyReadyAtClick: false,
    };
    const installStyle = () => {
      if (!document.documentElement || document.getElementById('load-measurement-size')) return;
      const style = document.createElement('style');
      style.id = 'load-measurement-size';
      style.textContent = 'main{max-width:1280px!important;padding:0!important}#play-area{width:1280px!important;height:720px!important;max-width:none!important;border:0!important}#game{width:1280px!important;height:720px!important;border:0!important}';
      document.documentElement.append(style);
    };
    const observe = () => {
      installStyle();
      const canvas = document.querySelector('#game');
      if (!canvas) return;
      const now = performance.now();
      if (canvas.dataset.rendered === 'true' && times.firstRenderMs === null) times.firstRenderMs = now;
      if (canvas.dataset.assetLoaded === 'true' && times.assetReadyMs === null) times.assetReadyMs = now;
      if (canvas.dataset.visualReady === 'true' && times.visualReadyMs === null) times.visualReadyMs = now;
      if (times.playQuietClickMs !== null && times.storyReadyAfterClickMs === null &&
          canvas.dataset.rendered === 'true' && canvas.dataset.assetLoaded === 'true' && canvas.dataset.visualReady === 'true')
        times.storyReadyAfterClickMs = now;
      if (times.storyReadyAfterClickMs !== null) observer.disconnect();
    };
    const observer = new MutationObserver(observe);
    observer.observe(document, { subtree: true, childList: true, attributes: true,
      attributeFilter: ['data-rendered', 'data-asset-loaded', 'data-visual-ready'] });
    installStyle();
    document.addEventListener('click', event => {
      if (!(event.target instanceof Element) || !event.target.closest('#begin-quiet') || times.playQuietClickMs !== null) return;
      times.playQuietClickMs = performance.now();
      const canvas = document.querySelector('#game');
      times.alreadyReadyAtClick = canvas?.dataset.rendered === 'true' && canvas?.dataset.assetLoaded === 'true' && canvas?.dataset.visualReady === 'true';
      if (times.alreadyReadyAtClick) times.storyReadyAfterClickMs = times.playQuietClickMs;
      observe();
    }, true);
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#visual-quality')).toHaveValue('high');
  await page.locator('#begin-quiet').click();
  await page.waitForFunction(() => typeof window.__SD_LOAD_OBSERVATION__?.storyReadyAfterClickMs === 'number', null, { timeout: 90000 });
  await expect(page.locator('#begin-screen')).toBeHidden();
  await expect(page.locator('#render-error')).toBeHidden();
  // Finish accounting for the initial local requests without changing their recorded ready timestamps.
  await page.waitForLoadState('networkidle', { timeout: 60000 });
  await Promise.allSettled(pendingTransfers);
  report.measurement = await page.evaluate(() => {
    const canvas = document.querySelector('#game');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const extension = gl?.getExtension('WEBGL_debug_renderer_info');
    const times = window.__SD_LOAD_OBSERVATION__;
    const navigation = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    return {
      timings: { timeOrigin: performance.timeOrigin, navigationToFirstRenderMs: times.firstRenderMs,
        navigationToAssetReadyMs: times.assetReadyMs, navigationToVisualReadyMs: times.visualReadyMs,
        navigationToPlayQuietClickMs: times.playQuietClickMs, navigationToStoryReadyAfterClickMs: times.storyReadyAfterClickMs,
        clickToReadyMs: times.storyReadyAfterClickMs - times.playQuietClickMs, alreadyReadyAtClick: times.alreadyReadyAtClick,
        method: 'performance.now captured by MutationObserver on production canvas readiness attributes and a capturing click listener; already-ready click delay is exactly zero.',
        domContentLoadedMs: navigation?.domContentLoadedEventEnd, loadEventEndMs: navigation?.loadEventEnd },
      device: { userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency,
        devicePixelRatio, canvasCss: [canvas.clientWidth, canvas.clientHeight], canvasRender: [canvas.width, canvas.height],
        renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER),
        vendor: extension ? gl.getParameter(extension.UNMASKED_VENDOR_WEBGL) : gl?.getParameter(gl.VENDOR),
        graphicsVersion: gl?.getParameter(gl.VERSION) },
      memory: { jsHeapUsedBytes: performance.memory?.usedJSHeapSize ?? null,
        wasmHeapAllocatedBytes: null,
        scope: 'Optional Chromium JavaScript heap observation only. No application-owned WASM heap is exposed; decoder WASM, GPU memory and total process memory are not measured.' },
      resourceTiming: { scope: 'Main-document Resource Timing cross-check; worker requests may be absent. Navigation is listed separately.',
        navigationEncodedBodyBytes: navigation?.encodedBodySize ?? null, navigationTransferBytes: navigation?.transferSize ?? null,
        subresourceEncodedBodyBytes: resources.reduce((sum, entry) => sum + entry.encodedBodySize, 0),
        subresourceTransferBytes: resources.reduce((sum, entry) => sum + entry.transferSize, 0) },
      productionDebugApiAbsent: window.__SPACE_DRAGON__ === undefined,
      quality: document.querySelector('#visual-quality').value,
    };
  });
  report.network = { scope: 'Initial browser-context observed local HTTP responses, including the document and decoder requests. Encoded body bytes plus HTTP response-header bytes; excludes TCP/TLS overhead and is not a bandwidth forecast.',
    encodedBodyBytes: transfers.reduce((sum, entry) => sum + entry.encodedBodyBytes, 0),
    transferBytes: transfers.reduce((sum, entry) => sum + entry.transferBytes, 0), resources: transfers };
  expect(report.measurement.productionDebugApiAbsent).toBe(true);
  expect(report.measurement.device.canvasCss).toEqual([1280, 720]);
  expect(report.measurement.device.canvasRender).toEqual([1280, 720]);
  expect(report.measurement.timings.navigationToVisualReadyMs).toBeGreaterThan(0);
  expect(report.measurement.timings.clickToReadyMs).toBeGreaterThanOrEqual(0);
  expect(report.errors).toEqual([]);
  expect(report.externalRequests).toEqual([]);
  expect(report.networkMeasurementErrors).toEqual([]);
  report.result = 'PASS: production load observations recorded';
} catch (error) {
  report.result = 'FAIL'; report.failure = String(error); throw error;
} finally {
  await writeFile(output, JSON.stringify(report, null, 2));
  await browser.close();
}
