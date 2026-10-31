// Capture the live local inspector from the exact Blender camera manifest.
// This tool never uploads models/references or publishes the inspection page.
import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';

const [filename, referencePath, output = 'artifacts/dragon-pipeline-review'] = process.argv.slice(2);
if (!filename || !/^[\w-]+\.glb$/.test(filename) || !referencePath) throw new Error('Usage: node tools/capture-dragon-pipeline.mjs model.glb references.json [output-directory]');
const url = process.env.SPACE_DRAGON_REVIEW_URL || 'http://127.0.0.1:5173/space-dragon/';
if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Use a local development server.');
const reference = JSON.parse(await readFile(referencePath, 'utf8'));
await mkdir(output, { recursive: true });
const viewport = { width: reference.viewport?.[0] ?? reference.width ?? 1440, height: reference.viewport?.[1] ?? reference.height ?? 1000 };
const browser = await chromium.launch({ channel: 'chrome', headless: true }), errors = [], results = [];
try {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(url).origin) errors.push(`External request: ${request.url()}`); });
  const inspectorURL = new URL(`tools/dragon-inspector/index.html?asset=${filename}`, url).href;
  await page.goto(inspectorURL);
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true', { timeout: 60000 });
  await page.evaluate(reference => window.dragonInspector.configureReference(reference), reference);
  for (const [lighting, views] of [['neutral', ['front', 'side', 'full', 'head']], ['cinematic', ['full', 'head']]]) {
    for (const view of views) {
      const name = `${lighting}-${view}`;
      const result = await page.evaluate(options => window.dragonInspector.capture(options), { view, lighting });
      await page.screenshot({ path: path.join(output, `game-${name}.png`) });
      const expected = reference.images?.[name] ?? reference.views?.find(image => image.lighting === lighting && image.view === view)?.file
        ?? reference.renders?.find(image => image.name === name)?.file ?? `blender-${name}.png`;
      const source = path.isAbsolute(expected) ? expected : path.resolve(path.dirname(referencePath), expected);
      await copyFile(source, path.join(output, `blender-${name}.png`));
      results.push({ ...result, gameImage: `game-${name}.png`, blenderImage: `blender-${name}.png`, sourceImage: source });
    }
  }
  for (const view of ['full', 'head']) {
    const result = await page.evaluate(options => window.dragonInspector.capture(options), { view, lighting: 'cinematic', environment: 'flight' });
    await page.screenshot({ path: path.join(output, `flight-${view}.png`) });
    results.push({ ...result, gameImage: `flight-${view}.png` });
  }
  await page.evaluate(() => window.dragonInspector.resume());
  await page.locator('#scene').selectOption('neutral');
  await page.locator('#animation').selectOption('boost');
  await page.locator('#sockets').check();
  await page.locator('#ground').check();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(output, 'interactive-inspector.png') });
  const interactive = await page.evaluate(() => window.dragonInspector.snapshot());
  const receipt = { filename, browser: browser.version(), viewport, inspectorURL, referencePath, reference,
    results, interactive, errors, scope: 'Identical camera/rest geometry and area-light positions. Blender and Three lighting/color transforms differ as documented. Inspection statistics are not flight performance.' };
  await writeFile(path.join(output, 'receipt.json'), JSON.stringify(receipt, null, 2));
  await writeFile(path.join(output, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dragon · Blender / game comparison</title><style>body{background:#151d27;color:#e1e8ee;font:16px system-ui;margin:24px}h1{font-size:24px}label{display:inline-block;margin:0 20px 20px 0}select{font:inherit;padding:6px;background:#243448;color:inherit}main{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}img{width:100%}figcaption{padding:12px;background:#243448}p{max-width:1000px;line-height:1.5}@media(max-width:800px){main{grid-template-columns:1fr}}</style><h1>Space Dragon · Blender and browser</h1><p>Matching cameras and rest pose, with authored glTF materials. Neutral Blender Standard compares with browser sRGB/no tone mapping; cinematic Blender AgX compares with browser ACES. Area-light power conversion is approximate. Blender area-light shadows are not reproduced by Three area lights.</p><label>View <select id="view"><option value="neutral-full">Neutral three-quarter</option><option value="neutral-head">Neutral head</option><option value="neutral-front">Neutral front</option><option value="neutral-side">Neutral side</option><option value="cinematic-full">Cinematic three-quarter</option><option value="cinematic-head">Cinematic head</option></select></label><main><figure><figcaption>Blender reference</figcaption><img id="blender" alt="Blender reference"></figure><figure><figcaption>Game renderer</figcaption><img id="game" alt="Three.js game materials"></figure></main><p><a style="color:#9dceff" href="${inspectorURL}">Open interactive local inspector</a> · <a style="color:#9dceff" href="flight-full.png">Flight environment</a></p><script>const select=document.querySelector('#view');function update(){for(const side of ['blender','game'])document.getElementById(side).src=side+'-'+select.value+'.png'}select.addEventListener('change',update);update();</script></html>`);
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ output, browser: receipt.browser, captures: results.length, errors }));
} finally { await browser.close(); }
