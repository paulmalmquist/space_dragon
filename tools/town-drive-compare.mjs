/** Local-only visual comparison. Start Vite separately. Never copies footage into a build. */
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { ROUTE, pointAtDistance } from '../src/game/drive/route.ts';

const args = process.argv.slice(2);
const arg = (name, fallback) => { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; };
const url = new URL(arg('--url', 'http://127.0.0.1:5182/space-dragon/drive/'));
if (url.hostname !== '127.0.0.1') throw new Error('Use the local loopback dev server only.');
const root = resolve('assets/reference/local');
const out = resolve(arg('--out', `assets/reference/local/environments/car-driving/compare-${Date.now()}`));
const localRelative = relative(root, out);
if (!localRelative || localRelative.startsWith('..') || resolve(root, localRelative) !== out) throw new Error('Output must be a new folder under assets/reference/local.');
try { await stat(out); throw new Error('Choose a fresh output folder.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const anchors = JSON.parse(await readFile(resolve(arg('--anchors', 'assets/reference/local/environments/car-driving/compare-anchors.json')), 'utf8'));
const spacing = Number(arg('--every', 250));
if (!Number.isFinite(spacing) || spacing < 50) throw new Error('Use a spacing of at least 50 metres.');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const points = new Map(ROUTE.checkpoints.map(point => [Math.round(point.s), point.label]));
for (let s = spacing; s < ROUTE.length; s += spacing) if (![...points.keys()].some(p => Math.abs(p - s) < 30)) points.set(s, `${s} metres`);
const records = [];
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
try {
  await page.goto(url.href);
  await page.locator('#drive-canvas[data-rendered=true]').waitFor({ timeout: 60000 });
  await page.locator('#begin').click();
  await page.addStyleTag({ content: '#paused,#welcome,.drive-controls,.drive-bottom,.drive-map,.drive-top,.drive-local,.drive-toast{display:none!important}' });
  for (const [s, label] of [...points].sort((a, b) => a[0] - b[0])) {
    const position = pointAtDistance(s);
    const section = ROUTE.sections[position.sectionIndex];
    await page.evaluate(s => window.__TOWN_DRIVE__.inspectAt(s, 'dashboard'), s);
    await page.waitForTimeout(250);
    const gameFile = `game-${String(s).padStart(4, '0')}m.jpg`;
    await page.screenshot({ path: join(out, gameFile), type: 'jpeg', quality: 85 });
    const anchor = anchors.legs.find(leg => leg.id === section.id);
    let reference = null;
    if (anchor) {
      const amount = Math.max(0, Math.min(1, (s - section.startS) / (section.endS - section.startS)));
      const time = anchor.startSeconds + (anchor.endSeconds - anchor.startSeconds) * amount;
      const frame = anchors.frames.reduce((best, frame) => Math.abs(frame.seconds - time) < Math.abs(best.seconds - time) ? frame : best);
      const framePath = resolve(frame.path);
      if (relative(root, framePath).startsWith('..')) throw new Error('Reference frames must stay local.');
      reference = { seconds: frame.seconds, path: relative(out, framePath).replaceAll('\\', '/') };
    }
    records.push({ s, label, section: section.id, game: gameFile, reference, metrics: await page.evaluate(() => window.__TOWN_DRIVE__.snapshot().metrics) });
  }
  await writeFile(join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Town Drive · local reference comparison</title><style>body{font:16px system-ui;background:#132e30;color:#e4eadc;margin:32px}h1{font-size:30px}article{border-top:1px solid #647c70;padding:20px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px}.pair img{width:100%;height:360px;object-fit:contain;background:#0b1e20}small{color:#bfd0bd}</style><h1>Town Drive / reference comparison</h1><p>PRIVATE · local review only. Distance/time alignment is ESTIMATED; stopped queues omitted. Invented connectors have no matching footage. Road widths, medians and landscaping are proposed blockout approximations.</p>${records.map(row => `<article><h2>${escape(row.label)} · ${row.s}m</h2><div class="pair"><div><img src="${row.game}"><p>Game dashboard · ${escape(row.section)}</p></div><div>${row.reference ? `<img src="${escape(row.reference.path)}"><p>Video ${Math.floor(row.reference.seconds / 60)}:${String(row.reference.seconds % 60).padStart(2,'0')} · nearest 5-second frame</p>` : '<p>INVENTED connector. No video equivalent.</p>'}</div></div></article>`).join('')}`);
  await writeFile(join(out, 'comparison.json'), JSON.stringify({ created: new Date().toISOString(), url: url.href, spacing, errors, records }, null, 2));
  console.log(JSON.stringify({ output: out, captures: records.length, paired: records.filter(row => row.reference).length, errors }));
} finally { await browser.close(); }
