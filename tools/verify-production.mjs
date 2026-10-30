// Read-only verification of the built app; uses a separate preview server and browser profile.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { writeFile, readdir, readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4177', '--strictPort'], { stdio: 'ignore' });
let browser;
try {
  const url = 'http://127.0.0.1:4177/space-dragon/';
  let ready = false;
  for (let i=0; i<50; i++) {
    try { if ((await fetch(url)).ok) { ready=true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(ready, 'preview server must start');
  browser = await chromium.launch({ executablePath: process.env.SPACE_DRAGON_BROWSER_PATH, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  assert.equal(await page.locator('#notebook-open').count(),0);
  assert.equal(await page.evaluate(() => '__SPACE_DRAGON__' in window),false);
  for(const name of ['Follow the signal','Investigate the pod','Discover the suits','Skip demonstrations','Help together']) await page.getByRole('button',{name}).click();
  await page.getByRole('heading',{name:'Build the dragon on Earth.'}).waitFor();
  await page.reload();
  await page.getByRole('button',{name:'First Contact complete'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'First Contact complete'}).isDisabled(),true);
  assert.equal((await fetch(`${url}__ideas`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({thought:'must not write'})})).status,404);
  const files = await readdir('dist',{recursive:true});
  assert(!files.some(f=>/\.(jpeg|jpg|blend|md|wav|mp3)$/i.test(f)), 'no source/reference media in output');
  for(const file of files.filter(f=>/\.(js|html|css)$/.test(f))) {
    const content=await readFile(`dist/${file}`,'utf8');
    assert(!content.includes('__SPACE_DRAGON__'), 'development observation API absent');
    assert(!content.includes('IMG_3277'), 'family reference not bundled');
  }
  assert.deepEqual(errors,[]);
  const receipt={passed:true,browser:await browser.version(),route:url,checks:['production full assisted path','checkpoint reload','no notebook or dev state API','notebook POST 404','artifact inventory','no page errors'],files:files.filter(f=>/\./.test(f))};
  await mkdir('artifacts', {recursive:true});
  await writeFile('artifacts/production-check.json',JSON.stringify(receipt,null,2));
  console.log(JSON.stringify({...receipt,files:receipt.files.length}));
} finally { await browser?.close();server.kill(); }
