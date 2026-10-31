import { chromium, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

if (process.platform !== 'win32') throw new Error('This measurement requires Windows process counters.');
const execFileAsync = promisify(execFile);
const output = path.resolve(process.argv[2] || 'artifacts/unity/browser-memory.json');
const targets = [
  { app: 'babylon', url: process.env.SPACE_DRAGON_BABYLON_URL || 'http://127.0.0.1:4191/space-dragon/' },
  { app: 'unity', url: process.env.SPACE_DRAGON_UNITY_URL || 'http://127.0.0.1:5194/space-dragon-unity/' },
];
for (const target of targets) if (!['localhost', '127.0.0.1'].includes(new URL(target.url).hostname)) throw new Error('Use local production candidates.');
const report = {
  capturedAt: new Date().toISOString(), samples: [],
  scope: 'Sequential, fresh installed-Chrome instances. After readiness and three seconds in the arrival view, measure only PIDs reported by that instance’s browser CDP session.',
  viewport: [1366, 900], requestedCanvasCss: [1280, 720], deviceScaleFactor: 1, settleSeconds: 3,
  definitions: {
    privateCommittedBytes: 'Sum of refreshed Get-Process.PrivateMemorySize64 (Windows Private Bytes / commit size). Includes private committed pages whether resident or paged out.',
    privateResidentWorkingSetBytes: 'Sum of Win32_PerfFormattedData_PerfProc_Process.WorkingSetPrivate. Counts resident private pages; shared resident pages are excluded.',
    ownership: 'CDP SystemInfo.getProcessInfo lists the connected browser process, its RenderProcessHosts and its BrowserChildProcessHosts. Only PIDs present both before and after the counter query are eligible.',
  },
  limitations: [
    'These figures include browser, renderer and service-process overhead; they are not game-only memory.',
    'Private committed and private resident values overlap. Do not add them, or add JavaScript/WASM/Unity heap readings to them.',
    'No shared-RSS sum, GPU VRAM, system-wide usage, peak usage, leak test or sustained-performance claim is made.',
    'The GPU-service process is included when CDP reports it, but its CPU-side private memory is not a VRAM measurement.',
    'Helpers not exposed by CDP are outside the reported process set. Other Chrome instances, Node, PowerShell and the local servers are excluded.',
    'Counter reads cover a short interval, not an atomic instant. OS memory pressure and cache state can change resident values.',
  ],
  sources: [
    'https://chromedevtools.github.io/devtools-protocol/tot/SystemInfo/#method-getProcessInfo',
    'https://chromium.googlesource.com/chromium/src/+/d0a8b6b6069cd4353153bd039098d4df55daeb24/content/browser/devtools/protocol/system_info_handler.cc',
    'https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.privatememorysize64',
    'https://learn.microsoft.com/en-us/windows/win32/memory/memory-performance-information',
    'https://learn.microsoft.com/en-us/windows/win32/wmisdk/accessing-wmi-preinstalled-performance-classes',
  ],
};

async function windowsCounters(pids) {
  if (!pids.length || pids.some(pid => !Number.isSafeInteger(pid) || pid <= 0)) throw new Error('Invalid CDP process IDs.');
  // Only validated integers enter this script; URLs, paths and document content never become PowerShell code.
  const script = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$taskProcessIds = @(${pids.join(',')})
$queryStarted = [DateTime]::UtcNow.ToString('O')
$counterByProcess = @{}
$counterError = $null
try {
  $filter = ($taskProcessIds | ForEach-Object { 'IDProcess = ' + $_ }) -join ' OR '
  Get-CimInstance -ClassName Win32_PerfFormattedData_PerfProc_Process -Filter $filter | ForEach-Object { $counterByProcess[[int]$_.IDProcess] = $_ }
} catch { $counterError = $_.Exception.Message }
$rows = @(foreach ($taskProcessId in $taskProcessIds) {
  try {
    $taskProcess = Get-Process -Id $taskProcessId -ErrorAction Stop
    $taskProcess.Refresh()
    if ($taskProcess.ProcessName -ne 'chrome') { throw 'CDP PID no longer identifies the launched Chrome executable.' }
    $counter = $counterByProcess[$taskProcessId]
    $resident = $null
    if ($null -ne $counter -and $null -ne $counter.PSObject.Properties['WorkingSetPrivate']) { $resident = [long]$counter.WorkingSetPrivate }
    [pscustomobject]@{ pid=$taskProcessId; processName=$taskProcess.ProcessName; processStartedUtc=$taskProcess.StartTime.ToUniversalTime().ToString('O'); sampledAtUtc=[DateTime]::UtcNow.ToString('O'); privateCommittedBytes=[long]$taskProcess.PrivateMemorySize64; privateResidentWorkingSetBytes=$resident; error=$null }
  } catch {
    [pscustomobject]@{ pid=$taskProcessId; privateCommittedBytes=$null; privateResidentWorkingSetBytes=$null; error=$_.Exception.Message }
  }
})
[pscustomobject]@{ queryStartedUtc=$queryStarted; queryFinishedUtc=[DateTime]::UtcNow.ToString('O'); counterError=$counterError; rows=$rows } | ConvertTo-Json -Depth 5 -Compress
`;
  const executable = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
  const { stdout } = await execFileAsync(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
    { windowsHide: true, timeout: 45000, maxBuffer: 1024 * 1024, encoding: 'utf8' });
  return JSON.parse(stdout.trim().replace(/^\uFEFF/, ''));
}

async function measure(target) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const sample = { app: target.app, url: target.url, browser: browser.version(), errors: [], externalRequests: [] };
  report.samples.push(sample);
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
    const page = await context.newPage();
    const pageCdp = await context.newCDPSession(page);
    await pageCdp.send('Network.enable');
    await pageCdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    page.on('pageerror', error => sample.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') sample.errors.push(message.text()); });
    page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(target.url).origin) sample.externalRequests.push(request.url()); });
    await page.addInitScript(({ app }) => {
      if (app === 'babylon') localStorage.setItem('space-dragon.visual-quality.v1', 'high');
      const observer = new MutationObserver(install);
      function install() {
        if (!document.documentElement || document.getElementById('process-memory-size')) return;
        const style = document.createElement('style'); style.id = 'process-memory-size';
        style.textContent = app === 'babylon'
          ? 'main{max-width:1280px!important;padding:0!important}#play-area{width:1280px!important;height:720px!important;border:0!important}#game{width:1280px!important;height:720px!important;border:0!important}'
          : '#unity-canvas{width:1280px!important;height:720px!important;aspect-ratio:auto!important;border:0!important}';
        document.documentElement.append(style); observer.disconnect();
      }
      observer.observe(document, { childList: true, subtree: true }); install();
    }, { app: target.app });
    await page.goto(target.url);
    if (target.app === 'babylon') {
      await expect(page.locator('#visual-quality')).toHaveValue('high');
      await page.locator('#begin-quiet').click();
      await expect(page.locator('#game')).toHaveAttribute('data-visual-ready', 'true', { timeout: 90000 });
      await page.locator('#action').click(); await page.locator('#action').click();
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'backyard');
    } else {
      await page.waitForFunction(() => window.__SPACE_DRAGON_UNITY__?.latestSnapshot?.ready && window.__SPACE_DRAGON_UNITY__.latestSnapshot.controlsReady, null, { timeout: 180000 });
      await page.evaluate(() => { window.__SPACE_DRAGON_UNITY__.send('SetPausedFromString', 'false'); window.__SPACE_DRAGON_UNITY__.send('SetBenchmarkMode', 'arrival'); });
      await page.waitForFunction(() => window.__SPACE_DRAGON_UNITY__?.latestSnapshot?.benchmarkShot === 'arrival');
    }
    sample.readyAtUtc = new Date().toISOString();
    await page.waitForTimeout(3000);
    sample.view = await page.evaluate(({ app }) => {
      const canvas = document.querySelector(app === 'babylon' ? '#game' : '#unity-canvas');
      let renderer, graphicsApi, ready, paused, quality;
      if (app === 'babylon') {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        const ext = gl?.getExtension('WEBGL_debug_renderer_info');
        renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER);
        graphicsApi = gl?.getParameter(gl.VERSION); ready = canvas.dataset.visualReady === 'true';
        paused = document.body.dataset.paused === 'true'; quality = document.querySelector('#visual-quality').value;
      } else {
        const state = window.__SPACE_DRAGON_UNITY__.snapshot();
        renderer = state.performance.renderer; graphicsApi = state.performance.graphicsApi; ready = state.ready; paused = state.paused;
        quality = 'Generated Unity candidate settings';
      }
      return { capturedAtUtc: new Date().toISOString(), view: 'arrival', renderer, graphicsApi, ready, paused, quality,
        canvasCss: [canvas.clientWidth, canvas.clientHeight], renderPixels: [canvas.width, canvas.height], devicePixelRatio,
        viewport: [innerWidth, innerHeight] };
    }, { app: target.app });
    expect(sample.view.ready).toBe(true); expect(sample.view.paused).toBe(false);
    expect(sample.view.canvasCss).toEqual([1280, 720]); expect(sample.view.renderPixels).toEqual([1280, 720]);
    const browserCdp = await browser.newBrowserCDPSession();
    const before = (await browserCdp.send('SystemInfo.getProcessInfo')).processInfo;
    const pids = [...new Set(before.map(process => process.id))];
    if (before.filter(process => process.type === 'browser').length !== 1) throw new Error('Expected exactly one owned browser process.');
    const counters = await windowsCounters(pids);
    const after = (await browserCdp.send('SystemInfo.getProcessInfo')).processInfo;
    const afterIds = new Set(after.map(process => process.id));
    sample.processQuery = { startedAtUtc: counters.queryStartedUtc, finishedAtUtc: counters.queryFinishedUtc,
      counterError: counters.counterError, addedPids: after.filter(process => !pids.includes(process.id)).map(process => process.id),
      removedPids: pids.filter(pid => !afterIds.has(pid)) };
    sample.processes = before.map(process => {
      const row = counters.rows.find(value => value.pid === process.id);
      return { pid: process.id, role: process.type, cpuSecondsAtDiscovery: process.cpuTime, retainedInOwnerList: afterIds.has(process.id), ...row };
    });
    const stable = !sample.processQuery.addedPids.length && !sample.processQuery.removedPids.length;
    const totals = {};
    for (const metric of ['privateCommittedBytes', 'privateResidentWorkingSetBytes']) {
      const available = sample.processes.filter(process => process.retainedInOwnerList && !process.error && typeof process[metric] === 'number' && process[metric] >= 0);
      const complete = stable && available.length === pids.length;
      totals[metric] = complete ? available.reduce((sum, process) => sum + process[metric], 0) : null;
      totals[`${metric}Complete`] = complete;
      totals[`${metric}MeasuredProcesses`] = available.length;
    }
    sample.totals = { ...totals, processCount: pids.length };
    expect(sample.errors).toEqual([]); expect(sample.externalRequests).toEqual([]);
    sample.result = totals.privateCommittedBytesComplete && totals.privateResidentWorkingSetBytesComplete ? 'PASS: private process memory recorded' : 'PARTIAL: process churn or an unavailable counter; no complete sum claimed';
  } catch (error) { sample.result = 'FAIL'; sample.failure = String(error); }
  finally { await browser.close(); }
}

await mkdir(path.dirname(output), { recursive: true });
try {
  for (const target of targets) await measure(target);
  report.result = report.samples.every(sample => sample.result.startsWith('PASS')) ? 'PASS' : 'INCOMPLETE';
} finally { await writeFile(output, JSON.stringify(report, null, 2)); }
console.log(`Wrote ${output}: ${report.result}`);
if (report.result !== 'PASS') process.exitCode = 1;
