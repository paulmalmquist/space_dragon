import './style.css';
import { createDriveWorld } from './world';
import { parseHouseLayout, FICTIONAL_HOUSE } from './house';
import referenceHouse from './reference-house.json';
import { DEFAULT_DRIVE_CONFIG, DRIVE_STEP, validDriveConfig } from './config';
import type { DriveConfig } from './config';
import { ROUTE, lanePoseAt, nearestRoutePoint, routeLabelAt } from './route';
import { stepDrive, resetDrive, createDriveState } from './simulation';
import type { DriveInput } from './simulation';
import { loadDrive, saveDrive } from './checkpoint';
import { createDriveInput } from './input';
import { createTrafficState, stepTraffic, trafficPose, nearbyTraffic, TRAFFIC_SIGNALS, signalPhase } from './traffic';
import { interpolateDrivePose } from './presentation';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
document.querySelector('#app')!.innerHTML = `<div class="drive-shell">
  <canvas id="drive-canvas" aria-label="Town Drive Lab road and car" tabindex="0"></canvas>
  <header class="drive-top"><a class="drive-brand" href="${import.meta.env.BASE_URL}">✧ SPACE DRAGON</a><div class="drive-title"><h1>Town Drive Lab</h1><p id="route-label">STARPASS COURT</p></div><span class="spacer"></span><button class="drive-button" id="camera">Chase · C</button><button class="drive-button" id="first-person" aria-label="Toggle first-person view" aria-pressed="false">Cabin · V</button><button class="drive-button" id="pause">Ⅱ Pause</button></header>
  <div class="drive-local" id="layout-label">HOME & TOWN · REFERENCE STUDY</div>
  <div class="drive-toast" id="toast" hidden role="status"></div>
  <div class="drive-bottom"><div class="speed-cluster"><div class="speed-reading"><strong id="speed">0</strong><span>MPH</span></div><div class="speed-track"><i id="speed-fill"></i></div><div class="drive-sub" id="gear">READY TO ROLL</div><div class="drive-stamp" id="save-status"></div></div><div class="drive-cue"><span class="arrow" id="turn-arrow" aria-label="Straight ahead">↑</span><div><strong id="turn-distance">—</strong><small id="turn-label">FOLLOW THE ROAD</small></div></div></div>
  <div class="drive-map" id="map" role="img" aria-label="Mapped home exit and compressed road loop"><span class="drive-map-label">THE LOOP · M</span><svg viewBox="-1520 -760 1740 980"><path id="route-path"/><g id="map-checkpoints"></g><path id="map-car" class="car-marker" d="M0 -10L7 7L0 4L-7 7Z"/></svg></div>
  <a class="drive-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
  <div class="drive-controls">WASD / ARROWS · DRIVE &nbsp; Q / E OR DRAG · LOOK &nbsp; V · CABIN &nbsp; R · RESET &nbsp; M · MAP &nbsp; F2 · TUNE</div>
  <div class="drive-overlay" id="welcome"><div class="drive-card"><div class="eyebrow">TOWN DRIVE LAB / 02</div><h2>Take the long<br>way home.</h2><p>Leave Starpass Court through Green Island Boulevard and Green Island Terrace, then turn right onto Hypoluxo. Neighborhoods, shops, walking people and passing traffic line the route.</p><div class="key-row"><kbd>W / ↑ Go</kbd><kbd>S / ↓ Brake + reverse</kbd><kbd>A D / ← → Steer</kbd><kbd>Space Slide</kbd><kbd>Q / E or drag · Look</kbd></div><label id="fresh-start-option" hidden><input type="checkbox" id="fresh-start"> Start a fresh loop from Starpass Court</label><label><input type="checkbox" id="cabin-start"> First person · sit in the driver's seat</label><label><input type="checkbox" id="assist"> Assist · gentler speed and lane guidance</label><label><input type="checkbox" id="sound"> Turn chimes</label><label><input type="checkbox" id="motion"> Less camera motion</label><button class="primary" id="begin">Start driving →</button><p class="small">V switches cabin/chase. C or controller R1 cycles all cameras. Release Q/E or the mouse to look ahead again.</p><p class="small">Controller: R2 go · L2 brake · left stick steer · Cross slide · Triangle reset · Options pause. The main-road loop is compressed; the return and neighboring buildings are representative.</p><p class="small">Neighborhood map: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>.</p></div></div>
  <div class="drive-overlay" id="paused" hidden><div class="drive-card"><div class="eyebrow">TAKE YOUR TIME</div><h2>Parked for a moment.</h2><p id="pause-notice">Release the controls, then carry on.</p><button class="primary" id="resume">Continue driving →</button><button class="drive-button" id="reset">Back to checkpoint · R</button><p class="small" id="checkpoint-label"></p><a class="drive-button" href="${import.meta.env.BASE_URL}">Return to First Contact</a></div></div>
  <aside class="drive-tuning" id="tuning" hidden><h2>Handling · F2</h2><div id="tuning-fields"></div><p class="drive-stamp">Session tuning · no learner profile</p><button class="drive-button" id="close-tuning">Return to road</button></aside>
  <div id="drive-error" class="drive-error" role="alert" hidden></div>
</div>`;

async function launch() {
  const layout = parseHouseLayout(referenceHouse) ?? FICTIONAL_HOUSE;
  const referenceLayout = layout !== FICTIONAL_HOUSE;
  $('layout-label').textContent = 'HOME & TOWN · REFERENCE STUDY';
  const canvas = $<HTMLCanvasElement>('drive-canvas');
  $<HTMLButtonElement>('begin').disabled = true;
  $('begin').textContent = 'Loading the neighborhood…';
  const world = await createDriveWorld(canvas, { houseLayout: layout });
  const loaded = loadDrive();
  let state = loaded.state;
  let previousState = state;
  $('fresh-start-option').hidden = state.checkpointId === 'home' && state.visited.length === 1;
  let traffic = createTrafficState(state.elapsedSeconds);
  world.update(state, 0, traffic);
  world.render();
  await world.scene.whenReadyAsync().catch(error => { world.dispose(); throw error; });
  world.render();
  canvas.dataset.ready = 'true';
  $<HTMLButtonElement>('begin').disabled = false;
  $('begin').textContent = 'Start driving →';
  let paused = true;
  let begun = false;
  let config: DriveConfig = { ...DEFAULT_DRIVE_CONFIG };
  let accumulator = 0;
  let lastTime = performance.now();
  let lastRenderedAt = 0;
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
    paused = value; accumulator = 0; input.release(); world.cameraRig.releaseLook();
    state = { ...state, speed: 0, velocityX: 0, velocityZ: 0 };
    previousState = state;
    $('paused').hidden = !value || !begun;
    if (!value) $('tuning').hidden = true;
    $('pause').textContent = value ? '▶ Continue' : 'Ⅱ Pause';
    $('checkpoint-label').textContent = `Saved stop: ${ROUTE.checkpoints.find(c => c.id === state.checkpointId)?.label ?? 'Home'}`;
    if (!value) canvas.focus();
    if (value && audio) void audio.suspend();
    if (!value && audio && $<HTMLInputElement>('sound').checked) void audio.resume();
  }
  function reset() { state = resetDrive(state); previousState = state; accumulator = 0; input.release(); world.cameraRig.snap(state); notice('Back on the road'); }
  function syncCameraUi() {
    const cabin = world.cameraRig.mode === 'dashboard';
    const label = cabin ? 'First person' : world.cameraRig.mode === 'chase' ? 'Chase' : 'Orbit';
    $('camera').textContent = `${label} · C`;
    $('first-person').setAttribute('aria-pressed', String(cabin));
    $('first-person').textContent = cabin ? 'Chase · V' : 'Cabin · V';
    $<HTMLInputElement>('cabin-start').checked = cabin;
    document.querySelector('.drive-shell')!.classList.toggle('is-cabin', cabin);
  }
  function cycleCamera() { world.cameraRig.cycle(); syncCameraUi(); }
  function firstPerson() { world.cameraRig.setMode(world.cameraRig.mode === 'dashboard' ? 'chase' : 'dashboard'); syncCameraUi(); }
  function tune() {
    if (!begun) return;
    const open = !!$('tuning').hidden;
    $<HTMLInputElement>('tune-assist').checked = state.assist;
    $('tuning').hidden = !open; setPaused(open);
  }
  const input = createDriveInput(window, {
    pause: () => { if (begun) setPaused(!paused); }, reset, camera: cycleCamera, firstPerson,
    map: () => $('map').classList.toggle('expanded'), tuning: tune,
  });
  $('begin').onclick = () => {
    if ($<HTMLInputElement>('fresh-start').checked) { state = createDriveState($<HTMLInputElement>('assist').checked); previousState = state; traffic = createTrafficState(); world.cameraRig.snap(state); }
    world.cameraRig.setMode($<HTMLInputElement>('cabin-start').checked ? 'dashboard' : 'chase'); syncCameraUi();
    begun = true; state = { ...state, assist: $<HTMLInputElement>('assist').checked };
    persist(); $('welcome').hidden = true;
    if ($<HTMLInputElement>('sound').checked) { audio = new AudioContext(); void audio.resume(); }
    setPaused(false);
  };
  $('pause').onclick = () => { if (begun) setPaused(!paused); };
  $('resume').onclick = () => { $('tuning').hidden = true; setPaused(false); };
  $('reset').onclick = reset;
  $('camera').onclick = cycleCamera;
  $('first-person').onclick = firstPerson;
  $<HTMLInputElement>('cabin-start').onchange = event => {
    world.cameraRig.setMode((event.target as HTMLInputElement).checked ? 'dashboard' : 'chase'); syncCameraUi();
  };
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
  const mapX = ROUTE.samples.map(point => point.x); const mapY = ROUTE.samples.map(point => -point.z);
  const mapMinX = Math.min(...mapX) - 80; const mapMinY = Math.min(...mapY) - 80;
  document.querySelector('#map svg')!.setAttribute('viewBox', `${mapMinX} ${mapMinY} ${Math.max(...mapX) - mapMinX + 80} ${Math.max(...mapY) - mapMinY + 80}`);
  $('map-checkpoints').innerHTML = ROUTE.checkpoints.map(point => `<circle cx="${point.x}" cy="${-point.z}" r="14"/>`).join('');
  const onBlur = () => { if (begun) setPaused(true); else input.release(); };
  const onVisibility = () => { if (document.hidden) onBlur(); };
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', world.resize);
  function tick(semantic: DriveInput) {
    const previousCheckpoint = state.checkpointId;
    const completed = state.completed;
    traffic = stepTraffic(traffic, state);
    world.setTraffic(traffic, state);
    previousState = state;
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
    const near = nearestRoutePoint(state.x, state.z, state.routeS);
    $('route-label').textContent = routeLabelAt(near.s).toUpperCase();
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
    snapshot: () => ({ state: { ...state, visited: [...state.visited] }, controls: { ...controls }, paused, begun, camera: world.cameraRig.mode, look: world.cameraRig.look, config: { ...config }, referenceLayout, traffic:{count:traffic.vehicles.length,elapsedSeconds:traffic.elapsedSeconds,vehicles:nearbyTraffic(traffic,state.x,state.z,450).map(vehicle=>({...vehicle,...trafficPose(vehicle)})),signals:TRAFFIC_SIGNALS.map(signal=>({...signal,phase:signalPhase(signal,traffic.elapsedSeconds)}))}, metrics: world.metrics(), frameMs: frames.slice(-600) }),
    ...(import.meta.env.DEV ? {
      scene: world.scene,
      setHomeCutaway: (enabled: boolean) => { world.setHomeCutaway(enabled); world.render(); },
      advance: (semantic: DriveInput, steps: number) => { if (!paused) for (let i = 0; i < Math.min(36000, Math.max(0, steps)); i++) tick(semantic); },
      inspectAt: (s: number, mode: 'chase' | 'dashboard' | 'orbit' = 'dashboard') => {
        const pose = lanePoseAt(s); state = { ...state, ...pose, routeS: pose.s, speed: 0, velocityX: 0, velocityZ: 0 };
        previousState = state; accumulator = 0;
        paused = true; input.release(); world.cameraRig.setMode(mode); syncCameraUi(); world.cameraRig.snap(state); world.update(state, 1, traffic, { ...controls, paused }); world.render();
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
    world.cameraRig.setLookInput(input.look());
    controls = semantic;
    if (begun && !paused) {
      accumulator = Math.min(.1, accumulator + dt);
      while (accumulator >= DRIVE_STEP) { tick(semantic); accumulator -= DRIVE_STEP; }
    } else accumulator = 0;
    // Paused scenes are static; avoid spending a full GPU budget behind menus or another window.
    if (paused && world.cameraRig.mode !== 'orbit' && now - lastRenderedAt < 100) return;
    const presentationDelta = Math.min(.1, (now - lastRenderedAt) / 1000);
    lastRenderedAt = now;
    world.cameraRig.setReducedMotion($<HTMLInputElement>('motion').checked);
    // Only presentation blends adjacent ticks. Collisions, traffic, saves and HUD
    // continue to observe the authoritative fixed-step state above.
    const renderPose = interpolateDrivePose(previousState, state, accumulator / DRIVE_STEP, { paused: paused || !begun });
    world.update(state, presentationDelta, traffic, { ...controls, paused }, renderPose);
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
