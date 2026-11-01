import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const url = process.env.SPACE_DRAGON_UNITY_URL || 'http://127.0.0.1:5194/space-dragon-unity/';
if (!['localhost','127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Use the local candidate server.');
const output = path.resolve(process.argv[2] || 'artifacts/unity/browser');
await mkdir(output, { recursive:true });
const fallback = process.env.SPACE_DRAGON_FORCE_WEBGL === '1';
// Chromium's GPU-service feature switch leaves WebGL hardware rendering available.
// https://chromium.googlesource.com/chromium/src/+/refs/heads/main/gpu/config/gpu_finch_features.cc
const browser = await chromium.launch({ channel:'chrome', headless:true, args:fallback ? ['--disable-features=WebGPUService'] : [] });
const report = { browser:browser.version(), forceWebGL:fallback, samples:[], errors:[], externalRequests:[],
  scope:'Native Chrome short static-camera samples and actual keyboard flow. Memory domains are labeled separately; no process/GPU VRAM or sustained performance claim.' };
try {
  const page = await browser.newPage({ viewport:{width:1366,height:900},deviceScaleFactor:1 });
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  const transfers=[];const pendingTransfers=[];
  page.on('requestfinished',request=>{
    if(!request.url().startsWith(new URL(url).origin+'/'))return;
    pendingTransfers.push((async()=>{
      const sizes=await request.sizes();
      const response=await request.response();
      transfers.push({path:new URL(request.url()).pathname,contentEncoding:await response?.headerValue('content-encoding') || 'identity',encodedBodyBytes:sizes.responseBodySize,transferBytes:sizes.responseBodySize+sizes.responseHeadersSize});
    })());
  });
  page.on('pageerror',error=>report.errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
  page.on('request',request=>{if(/^https?:/.test(request.url()) && new URL(request.url()).origin!==new URL(url).origin)report.externalRequests.push(request.url());});
  const snapshot=()=>page.evaluate(()=>window.__SPACE_DRAGON_UNITY__.snapshot());
  const send=(method,value)=>page.evaluate(({method,value})=>window.__SPACE_DRAGON_UNITY__.send(method,value),{method,value});
  await page.goto(url);
  await page.waitForFunction(()=>window.__SPACE_DRAGON_UNITY__?.latestSnapshot?.ready && window.__SPACE_DRAGON_UNITY__.latestSnapshot.controlsReady, null, { timeout:180000 });
  report.initial=await snapshot();
  report.webgpuAdapterAvailable=await page.evaluate(async()=>Boolean(navigator.gpu && await navigator.gpu.requestAdapter()));
  await Promise.all(pendingTransfers);
  report.network={scope:'Initial browser load through controls readiness, including the HTML document. Fresh context with HTTP cache disabled; actual HTTP encoding recorded per response. OS and driver caches are not cleared.',
    encodedBodyBytes:transfers.reduce((sum,entry)=>sum+entry.encodedBodyBytes,0),transferBytes:transfers.reduce((sum,entry)=>sum+entry.transferBytes,0),resources:[...transfers]};
  if(fallback) { expect(report.webgpuAdapterAvailable).toBe(false);expect(report.initial.performance.graphicsApi).toBe('OpenGLES3'); }
  for(const shot of ['home','arrival','reveal']){
    await send('SetPausedFromString','false');
    await send('SetBenchmarkMode',shot);
    await page.waitForTimeout(1200);
    await send('ResetMeasurement');
    await page.waitForTimeout(10000);
    const measured=await snapshot();
    expect(measured.paused).toBe(false);
    expect(measured.ready).toBe(true);
    expect(measured.reflectionReady).toBe(true);
    expect(measured.performance.frames.sampleCount).toBeGreaterThan(30);
    expect(measured.podRewardCount).toBe(0);
    report.samples.push({shot,measurement:measured});
    await page.locator('#unity-canvas').screenshot({path:path.join(output,`${shot}.png`)});
  }
  await send('SetBenchmarkMode','play');
  await page.locator('#unity-canvas').focus();
  await expect.poll(async()=>{const state=await snapshot();return state.controlsReady && !state.benchmarkMode;}).toBe(true);
  const initialPosition=(await snapshot()).playerPosition;
  await page.keyboard.down('w');
  try { await expect.poll(async()=>(await snapshot()).nearPod,{timeout:8000,intervals:[200]}).toBe(true); }
  finally { await page.keyboard.up('w'); }
  const moved=await snapshot();
  expect(Math.hypot(moved.playerPosition.x-initialPosition.x,moved.playerPosition.z-initialPosition.z)).toBeGreaterThan(0.5);
  await page.keyboard.press('Space');
  await expect.poll(async()=>(await snapshot()).podRewardCount).toBe(1);
  await page.waitForTimeout(1000);
  await page.locator('#unity-canvas').screenshot({path:path.join(output,'pod-open-play.png')});
  for(let i=0;i<3;i++)await page.keyboard.press('Space');
  expect((await snapshot()).podRewardCount).toBe(1);
  await page.keyboard.press('Escape');
  await expect.poll(async()=>(await snapshot()).paused).toBe(true);
  const pausedPosition=(await snapshot()).playerPosition;
  await page.keyboard.down('w');await page.waitForTimeout(500);await page.keyboard.up('w');
  expect((await snapshot()).playerPosition).toEqual(pausedPosition);
  await page.keyboard.press('Escape');
  await expect.poll(async()=>(await snapshot()).paused).toBe(false);
  await send('ReplayReveal');
  await expect.poll(async()=>(await snapshot()).controlsReady).toBe(false);
  await send('SkipReveal');
  await expect.poll(async()=>(await snapshot()).controlsReady).toBe(true);
  expect((await snapshot()).podRewardCount).toBe(1);
  await page.reload();
  await page.waitForFunction(()=>window.__SPACE_DRAGON_UNITY__?.latestSnapshot?.ready && window.__SPACE_DRAGON_UNITY__.latestSnapshot.controlsReady, null, { timeout:180000 });
  report.restored=await snapshot();
  expect(report.restored.podRewardCount).toBe(1);
  expect(report.restored.podOpened).toBe(true);
  expect(report.errors).toEqual([]);expect(report.externalRequests).toEqual([]);
  report.result='PASS';
} catch(error){
  report.result='FAIL';report.failure=String(error);
  const page=browser.contexts()[0]?.pages()[0];
  if(page){
    report.lastSnapshot=await page.evaluate(()=>window.__SPACE_DRAGON_UNITY__?.snapshot()).catch(()=>null);
    await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});
  }
  throw error;
}
finally {await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
