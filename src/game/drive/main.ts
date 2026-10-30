import './style.css';
import { createDriveWorld } from './world';
import { parseHouseLayout, FICTIONAL_HOUSE } from './house';
import { DEFAULT_DRIVE_CONFIG, DRIVE_STEP, validDriveConfig } from './config';
import type { DriveConfig } from './config';
import { ROUTE, lanePoseAt, nearestRoutePoint } from './route';
import { stepDrive, resetDrive } from './simulation';
import type { DriveInput } from './simulation';
import { loadDrive, saveDrive } from './checkpoint';
import { createDriveInput } from './input';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
document.querySelector('#app')!.innerHTML = `<div class="drive-shell">
  <canvas id="drive-canvas" aria-label="Town Drive Lab road and car" tabindex="0"></canvas>
  <header class="drive-top"><a class="drive-brand" href="${import.meta.env.BASE_URL}">✧ SPACE DRAGON</a><div class="drive-title"><h1>Town Drive Lab</h1><p id="route-label">INVENTED NEIGHBORHOOD CONNECTOR</p></div><span class="spacer"></span><button class="drive-button" id="camera">Chase · C</button><button class="drive-button" id="pause">Ⅱ Pause</button></header>
  <div class="drive-local" id="layout-label">FICTIONAL HOME · EDITABLE BLOCKOUT</div>
  <div class="drive-toast" id="toast" hidden role="status"></div>
  <div class="drive-bottom"><div class="speed-cluster"><div class="speed-reading"><strong id="speed">0</strong><span>MPH</span></div><div class="speed-track"><i id="speed-fill"></i></div><div class="drive-sub" id="gear">READY TO ROLL</div><div class="drive-stamp" id="save-status"></div></div><div class="drive-cue"><span class="arrow" id="turn-arrow" aria-label="Straight ahead">↑</span><div><strong id="turn-distance">—</strong><small id="turn-label">FOLLOW THE ROAD</small></div></div></div>
  <div class="drive-map" id="map" role="img" aria-label="Invented compressed road loop"><span class="drive-map-label">THE LOOP · M</span><svg viewBox="-1520 -760 1740 980"><path id="route-path"/><g id="map-checkpoints"></g><path id="map-car" class="car-marker" d="M0 -10L7 7L0 4L-7 7Z"/></svg></div>
  <div class="drive-controls">WASD / ARROWS · DRIVE &nbsp; SPACE · SLIDE &nbsp; R · RESET &nbsp; M · MAP &nbsp; F2 · TUNE</div>
  <div class="drive-overlay" id="welcome"><div class="drive-card"><div class="eyebrow">TOWN DRIVE LAB / 01</div><h2>Take the long<br>way home.</h2><p>A leafy neighborhood, wide palm-lined roads and three turns. Leave the driveway and follow the arrows back home.</p><div class="key-row"><kbd>W / ↑ Go</kbd><kbd>S / ↓ Brake + reverse</kbd><kbd>A D / ← → Steer</kbd><kbd>Space Slide</kbd></div><label><input type="checkbox" id="assist"> Assist · gentler speed and lane guidance</label><label><input type="checkbox" id="sound"> Turn chimes</label><label><input type="checkbox" id="motion"> Less camera motion</label><button class="primary" id="begin">Start driving →</button><p class="small">Controller: R2 go · L2 brake · left stick steer · Cross slide · Triangle reset · R1 camera · Options pause.</p><p class="small">A reference-inspired prototype. Connectors and distances are invented. No story progress changes.</p></div></div>
  <div class="drive-overlay" id="paused" hidden><div class="drive-card"><div class="eyebrow">TAKE YOUR TIME</div><h2>Parked for a moment.</h2><p id="pause-notice">Release the controls, then carry on.</p><button class="primary" id="resume">Continue driving →</button><button class="drive-button" id="reset">Back to checkpoint · R</button><p class="small" id="checkpoint-label"></p><a class="drive-button" href="${import.meta.env.BASE_URL}">Return to First Contact</a></div></div>
  <aside class="drive-tuning" id="tuning" hidden><h2>Handling · F2</h2><div id="tuning-fields"></div><p class="drive-stamp">Session tuning · no learner profile</p><button class="drive-button" id="close-tuning">Return to road</button></aside>
  <div id="drive-error" class="drive-error" role="alert" hidden></div>
</div>`;

async function launch() {
  let layout = FICTIONAL_HOUSE;
  let localHouse = false;
  if (import.meta.env.DEV) {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}__drive-layout`);
      if (response.ok) {
        const candidate = parseHouseLayout(await response.json());
        if (candidate) { layout = candidate; localHouse = true; }
      }
    } catch { /* Fictional fallback keeps the lab playable without private files. */ }
  }
  $('layout-label').textContent = localHouse ? 'LOCAL HOUSE STUDY · ESTIMATED BLOCKOUT' : 'FICTIONAL HOME · EDITABLE BLOCKOUT';
  const canvas = $<HTMLCanvasElement>('drive-canvas');
  const world = createDriveWorld(canvas, { houseLayout: layout });
  const loaded = loadDrive();
  let state = loaded.state;
  let paused = true;
  let begun = false;
  let config: DriveConfig = { ...DEFAULT_DRIVE_CONFIG };
  let accumulator = 0;
  let lastTime = performance.now();
  let toastUntil = 0;
  let lastChime = -1;
  let audio: AudioContext | null = null;
  let disposed = false;
  let controls: DriveInput = { throttle: 0, brake: 0, steer: 0, handbrake: false };
  const frames: number[] = [];
  $<HTMLInputElement>('assist').checked = state.assist;
  $('save-status').textContent = loaded.notice;
  const notice = (message: string) => { $('toast').textContent = message; $('toast').hidden = false; toastUntil = performance.now() + 3500; };
  function persist() {
    const message = loaded.canSave ? saveDrive(state) : loaded.notice;
    $('save-status').textContent = message;
    return { message, saved: message === 'Drive checkpoint saved on this device.' };
  }
  function setPaused(value: boolean) {
    paused = value; accumulator = 0; input.release();
    state = { ...state, speed: 0, velocityX: 0, velocityZ: 0 };
    $('paused').hidden = !value || !begun;
    if (!value) $('tuning').hidden = true;
    $('pause').textContent = value ? '▶ Continue' : 'Ⅱ Pause';
    $('checkpoint-label').textContent = `Saved stop: ${ROUTE.checkpoints.find(c => c.id === state.checkpointId)?.label ?? 'Home'}`;
    if (!value) canvas.focus();
    if (value && audio) void audio.suspend();
    if (!value && audio && $<HTMLInputElement>('sound').checked) void audio.resume();
  }
  function reset() { state = resetDrive(state); accumulator = 0; input.release(); world.cameraRig.snap(state); notice('Back on the road'); }
  function cycleCamera() { world.cameraRig.cycle(); $('camera').textContent = `${world.cameraRig.mode[0].toUpperCase()}${world.cameraRig.mode.slice(1)} · C`; }
  function tune() {
    if (!begun) return;
    const open = !!$('tuning').hidden;
    $<HTMLInputElement>('tune-assist').checked = state.assist;
    $('tuning').hidden = !open; setPaused(open);
  }
  const input = createDriveInput(window, {
    pause: () => { if (begun) setPaused(!paused); }, reset, camera: cycleCamera,
    map: () => $('map').classList.toggle('expanded'), tuning: tune,
  });
  $('begin').onclick = () => {
    begun = true; state = { ...state, assist: $<HTMLInputElement>('assist').checked };
    persist(); $('welcome').hidden = true;
    if ($<HTMLInputElement>('sound').checked) { audio = new AudioContext(); void audio.resume(); }
    setPaused(false);
  };
  $('pause').onclick = () => { if (begun) setPaused(!paused); };
  $('resume').onclick = () => { $('tuning').hidden = true; setPaused(false); };
  $('reset').onclick = reset;
  $('camera').onclick = cycleCamera;
  $('close-tuning').onclick = () => { $('tuning').hidden = true; setPaused(false); };
  const tunables: [keyof DriveConfig, string, number, number, number][] = [
    ['topSpeed', 'Top speed · m/s', 15, 35, 1], ['acceleration', 'Acceleration · m/s²', 2, 8, .1],
    ['braking', 'Brake · m/s²', 5, 18, .5], ['steeringRate', 'Steering', .5, 2.5, .05],
    ['highSpeedSteering', 'High speed steering', .15, .6, .01], ['grip', 'Grip', 3, 14, .5],
    ['handbrakeGrip', 'Slide grip', .5, 5, .1],
  ];
  $('tuning-fields').innerHTML = tunables.map(([key, label, min, max, step]) => `<label>${label}<output id="value-${key}">${config[key].toFixed(2)}</output><input aria-label="${label}" data-tune="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${config[key]}"></label>`).join('') + '<label>Assist<input id="tune-assist" type="checkbox"></label>';
  $<HTMLInputElement>('tune-assist').checked = state.assist;
  $<HTMLInputElement>('tune-assist').onchange = event => { state = { ...state, assist: (event.target as HTMLInputElement).checked }; persist(); };
  document.querySelectorAll<HTMLInputElement>('[data-tune]').forEach(element => {
    element.oninput = () => {
      const key = element.dataset.tune as keyof DriveConfig;
      const candidate = { ...config, [key]: Number(element.value) };
      if (validDriveConfig(candidate)) { config = candidate; $(`value-${key}`).textContent = config[key].toFixed(2); }
    };
  });
  $('route-path').setAttribute('d', ROUTE.samples.map((point, index) => `${index ? 'L' : 'M'}${point.x},${-point.z}`).join(' '));
  $('map-checkpoints').innerHTML = ROUTE.checkpoints.map(point => `<circle cx="${point.x}" cy="${-point.z}" r="14"/>`).join('');
  const onBlur = () => { if (begun) setPaused(true); else input.release(); };
  const onVisibility = () => { if (document.hidden) onBlur(); };
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', world.resize);
  function tick(semantic: DriveInput) {
    const previousCheckpoint = state.checkpointId;
    const completed = state.completed;
    state = stepDrive(state, semantic, config, world.obstacles);
    if (state.checkpointId !== previousCheckpoint || state.completed !== completed) {
      const saved = persist();
      notice(state.completed && !completed
        ? `⌂ Back home. A lovely little loop.${saved.saved ? '' : ` ${saved.message}`}`
        : saved.saved ? '✓ Checkpoint saved' : saved.message);
    }
  }
  function hud() {
    const mph = Math.abs(state.speed) * 2.23694;
    $('speed').textContent = Math.round(mph).toString();
    $('speed-fill').style.width = `${Math.min(100, mph / (config.topSpeed * 2.23694) * 100)}%`;
    $('gear').textContent = paused ? 'PARKED' : `${state.speed < -0.2 ? 'REVERSE' : state.assist ? 'ASSIST' : 'DRIVE'} · ${state.visited.length - 1} / 4`;
    const near = nearestRoutePoint(state.x, state.z);
    $('route-label').textContent = ROUTE.sections[near.sectionIndex].label.toUpperCase();
    const nextIndex = ROUTE.turns.findIndex(turn => turn.s > near.s + 4);
    const next = ROUTE.turns[nextIndex];
    const turnDistance = next ? next.s - near.s : ROUTE.length - near.s;
    const arrow = next && turnDistance < 160 ? (next.direction === 'right' ? '↱' : '↰') : '↑';
    $('turn-arrow').textContent = arrow;
    $('turn-arrow').setAttribute('aria-label', arrow === '↑' ? 'Straight ahead' : `Turn ${next!.direction}`);
    $('turn-distance').textContent = `${Math.round(turnDistance / 5) * 5} m`;
    $('turn-label').textContent = next && turnDistance < 160 ? 'COMING UP' : next ? 'ENJOY THE DRIVE' : 'BACK TOWARD HOME';
    $('map-car').setAttribute('transform', `translate(${state.x} ${-state.z}) rotate(${state.yaw * 180 / Math.PI}) scale(3)`);
    if (!paused && next && turnDistance < 100 && nextIndex !== lastChime) {
      lastChime = nextIndex;
      if (audio?.state === 'running') {
        const tone = audio.createOscillator(); const gain = audio.createGain(); tone.connect(gain); gain.connect(audio.destination);
        tone.frequency.setValueAtTime(next.direction === 'right' ? 660 : 523.25, audio.currentTime);
        gain.gain.setValueAtTime(.0001, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.07, audio.currentTime + .03);
        gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + .45); tone.start(); tone.stop(audio.currentTime + .5);
        tone.onended = () => { tone.disconnect(); gain.disconnect(); };
      }
    }
    if (performance.now() > toastUntil) $('toast').hidden = true;
  }
  world.cameraRig.snap(state);
  const debug = {
    snapshot: () => ({ state: { ...state, visited: [...state.visited] }, controls: { ...controls }, paused, begun, camera: world.cameraRig.mode, config: { ...config }, localHouse, metrics: world.metrics(), frameMs: frames.slice(-600) }),
    ...(import.meta.env.DEV ? {
      advance: (semantic: DriveInput, steps: number) => { if (!paused) for (let i = 0; i < Math.min(36000, Math.max(0, steps)); i++) tick(semantic); },
      inspectAt: (s: number, mode: 'chase' | 'dashboard' | 'orbit' = 'dashboard') => {
        const pose = lanePoseAt(s); state = { ...state, ...pose, routeS: pose.s, speed: 0, velocityX: 0, velocityZ: 0 };
        paused = true; input.release(); world.cameraRig.setMode(mode); world.cameraRig.snap(state); world.update(state, 1); world.render();
      },
    } : {}),
  };
  Object.assign(window, { __TOWN_DRIVE__: debug });
  world.engine.runRenderLoop(() => {
    if (disposed) return;
    const now = performance.now(); const rawDt = (now - lastTime) / 1000; lastTime = now;
    if (rawDt > 0 && rawDt < 1) { frames.push(rawDt * 1000); if (frames.length > 1800) frames.shift(); }
    const dt = Math.min(.1, rawDt);
    const semantic = input.sample(begun && !paused);
    controls = semantic;
    if (begun && !paused) {
      accumulator = Math.min(.1, accumulator + dt);
      while (accumulator >= DRIVE_STEP) { tick(semantic); accumulator -= DRIVE_STEP; }
    } else accumulator = 0;
    world.cameraRig.setReducedMotion($<HTMLInputElement>('motion').checked);
    world.update(state, dt);
    world.render(); hud(); canvas.dataset.rendered = 'true';
  });
  window.addEventListener('pagehide', () => {
    disposed = true; input.dispose(); world.dispose(); void audio?.close();
    window.removeEventListener('blur', onBlur); window.removeEventListener('resize', world.resize);
    document.removeEventListener('visibilitychange', onVisibility);
  }, { once: true });
}
void launch().catch(error => {
  $('drive-error').hidden = false;
  $('drive-error').textContent = `The drive could not load: ${error instanceof Error ? error.message : 'graphics unavailable'}. Reload to try again.`;
  console.error(error);
});
