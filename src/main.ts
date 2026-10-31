import './style.css';
import { createFirstContact } from './game/scene';
import { createInitialState, nextAction, transition, SUIT_ORDER } from './game/state';
import type { StoryAction } from './game/state';
import { loadCheckpoint, saveCheckpoint } from './game/checkpoint';
import { storyContent, hintPrompt, SUIT_CARDS } from './game/first-contact-content';
import { createNarrator } from './game/narrator';
import { copyExplorationState, createExplorationState } from './game/navigation';
import type { InteractionTarget } from './game/navigation';
import { loadExploration, saveExploration } from './game/exploration-save';
import { connectVisualControls } from './ui/visual-controls';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="masthead">
    <a class="wordmark" href="./" aria-label="Space Dragon home"><span class="mark">✧</span> SPACE DRAGON</a>
    <a class="quiet drive-link" href="${import.meta.env.BASE_URL}drive/">Town Drive Lab ↗</a>
    <a class="quiet dogfight-link" href="${import.meta.env.BASE_URL}dogfight/">Dogfight Lab ↗</a>
    <span class="build-label">FIRST CONTACT <span class="build-dot"></span> PLAYABLE DRAFT</span>
    <nav id="play-modes" class="play-modes" aria-label="Choose an adventure" hidden><button class="quiet" id="mode-explore">Walk around</button><button class="quiet" id="mode-story">First Contact</button></nav>
    <button class="quiet" id="sound" aria-label="Turn narrator sound on">♫ <span id="sound-state">Sound off</span></button>
    ${import.meta.env.DEV ? '<button class="quiet" id="notebook-open">Idea notebook ↗</button>' : ''}
  </header>
  <main>
    <section class="intro"><div><p class="eyebrow">AN ORDINARY EVENING. AN EXTRAORDINARY ARRIVAL.</p><h1>Five together.</h1></div>
      <p class="intro-copy">One family. One strange signal.<br>A whole adventure waiting outside.</p></section>
    <section class="play-area" id="play-area" aria-label="First Contact adventure">
      <canvas id="game" aria-label="3D view of the family home and rescue pod" tabindex="0"></canvas>
      <div class="scene-label"><span class="live-dot"></span> <span id="location"></span></div>
      <button class="quiet scene-pause" id="pause" aria-label="Pause adventure">Ⅱ Pause</button>
      <div id="navigation-hud" class="navigation-hud" hidden>
        <p class="eyebrow">HOME · BACKYARD · GARAGE</p><h2>A little room to explore.</h2>
        <p>Visit the computer, open the pod, and find the practice module.</p>
        <p id="nav-inventory" data-count="0">Practice module: 0 / 1</p>
        <p id="nav-message" role="status" aria-live="polite">WASD or arrows to walk. Space or Enter to use a nearby object.</p>
      </div>
      <div id="nav-target" class="nav-target" hidden>Move close to something to interact.</div>
      <div id="world-cue" class="world-cue" aria-hidden="true"><span>◇</span></div>
      <div class="story-panel"><p class="eyebrow" id="chapter"></p><h2 id="story-title"></h2><p id="story-copy"></p>
        <p id="spoken-caption" class="spoken-caption" aria-live="polite"></p>
        <div id="help-ladder" class="help-ladder" aria-label="Help level"><i></i><i></i><i></i><span id="help-message"></span></div>
      </div>
      <div id="suit-card" class="suit-card" aria-label="Suit introduction" hidden></div>
      <div id="scan-targets" class="scan-targets" aria-label="Point Lyla's scanner" hidden>
        <button data-target="0" aria-label="Quiet panel" aria-pressed="true"><span>▰</span></button>
        <button data-target="1" aria-label="Shimmering diamond" aria-pressed="false"><span>◇</span></button>
        <button data-target="2" aria-label="Antenna" aria-pressed="false"><span>⌁</span></button>
      </div>
      <div id="archive-card" class="archive-card" hidden><span class="archive-symbol" aria-hidden="true">◇</span><p>FIRST DISCOVERY</p><h3>The symbol</h3><p id="scan-outcome"></p></div>
      <div id="town-map" class="town-map" role="img" aria-label="A fictional town map with a preschool, shops, and a rocket facility. The preschool is the closest signal." hidden>
        <svg viewBox="0 0 400 300" aria-hidden="true"><path d="M70 70 Q180 20 310 80 L320 230 Q180 280 70 210Z"/><path d="M70 70L310 230M310 80L70 210M190 50L190 250"/></svg>
        <span class="map-node school">⌂<small>Closest signal</small></span><span class="map-node store-one">▦</span><span class="map-node store-two">▤</span><span class="map-node rocket">♧</span><span class="map-node home">⌂</span><div class="map-caption">SPACE BLOCKS IS NEXT</div>
      </div>
      <div id="crew-strip" class="crew-strip" aria-label="Family suit collection"></div>
      <div class="action-bar">
        <button class="round-tool" id="repeat" aria-label="Repeat spoken prompt (H)">♫<small>H · Repeat</small></button>
        <button class="primary" id="action"><span id="action-icon" aria-hidden="true">▶</span><span id="action-text"></span><kbd>SPACE / ENTER</kbd></button>
        <button class="round-tool" id="help" aria-label="More help (F1)">?<small>F1 · Help</small></button>
      </div>
      <div id="begin-screen" class="screen-overlay"><div class="welcome"><span class="welcome-symbol" aria-hidden="true">✧</span><p class="eyebrow">LET’S PLAY TOGETHER</p><h2>Ready to explore?</h2>
        <p>Walk around the home and backyard.<br>Find things, look closer, and see what happens.</p>
        <button class="primary" id="begin-explore"><span>➜</span> Walk around</button>
        <p class="welcome-controls">WASD / arrows · Walk &nbsp; Space / Enter · Interact</p>
        <p class="eyebrow story-choice">OR PLAY THE FIRST CONTACT STORY</p>
        <button class="quiet" id="begin-sound">Start adventure with sound</button><button class="quiet" id="begin-quiet">Play quietly</button>
        <p class="voice-label">Placeholder computer narrator · no family recordings</p></div></div>
      <div id="pause-screen" class="screen-overlay" hidden><div class="welcome"><span class="welcome-symbol">Ⅱ</span><h2>We’ll wait for you.</h2><p>Everything stays right here.</p><button class="primary" id="resume">▶ Continue together</button></div></div>
      <p id="render-error" class="render-error" role="alert" hidden></p>
    </section>
    <div class="below-scene"><div><p id="save-status" role="status"></p><p id="narrator-status" role="status"></p></div>
      <div class="settings"><label>Graphics <select id="visual-quality" aria-label="Graphics quality"><option value="low">Low</option><option value="balanced" selected>Balanced</option><option value="high">High</option><option value="cinematic">Cinematic</option></select></label><label><input id="reduce-motion" type="checkbox"> Less motion</label><button id="restart" class="quiet">Start again</button></div></div>
    <footer><span>Provisional home and character. Future video references will inform this space.</span><span id="controls-legend">ARROWS · POINT &nbsp; SPACE / ENTER · ACTION &nbsp; H · LISTEN &nbsp; F1 · HELP &nbsp; ESC · PAUSE</span></footer>
  </main>
  ${import.meta.env.DEV ? `<dialog id="notebook" aria-labelledby="notebook-title"><form id="idea-form">
    <div class="dialog-top"><p class="eyebrow">YOUR IDEAS, IN ANY ORDER</p><button type="button" id="notebook-close" class="quiet">Close</button></div>
    <h2 id="notebook-title">What are you imagining?</h2><p>Story, a look, a sound, a change of mind. A sentence is enough.</p>
    <label for="thought">Your thought</label><textarea id="thought" name="thought" rows="7" maxlength="12000" required placeholder="Maybe the pod should sound like…"></textarea>
    <button class="primary" type="submit">Save idea</button><p id="idea-status" role="status" aria-live="polite"></p>
    <p class="notebook-note">Saved in this repo’s idea inbox. Ask your agent to process the inbox when you want the project updated.</p></form></dialog>` : ''}`;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const loaded = loadCheckpoint();
let state = loaded.state;
let canSave = loaded.canSave;
let started = false;
let paused = false;
let selectedTarget = 0;
const explorationLoaded = loadExploration();
let explorationState = explorationLoaded.state;
let explorationCanSave = explorationLoaded.canSave;
let navigationMode = false;
let nearbyTarget: InteractionTarget | null = null;
const heldMovementKeys = new Set<string>();
let lastExplorationSave = 0;
let savedExplorationJson = JSON.stringify(explorationState);
let displayedTarget: string | null | undefined;
let hintTimer: ReturnType<typeof setTimeout> | undefined;
let currentPrompt = '';
let view: ReturnType<typeof createFirstContact> | undefined;
const narrator = createNarrator(message => { $('narrator-status').textContent = message; });
try { view = createFirstContact($<HTMLCanvasElement>('game')); }
catch { $('render-error').hidden = false; $('render-error').textContent = 'The 3D view could not start. Try Chrome with WebGL enabled. The story controls still work.'; }
const disposeVisualControls = connectVisualControls(view);
view?.setExplorationState(explorationState);
view?.onNavigationUpdate((next, target) => {
  explorationState = copyExplorationState(next);
  nearbyTarget = target;
  if (!navigationMode || !started) return;
  renderNavigationHud();
  if (!paused && performance.now() - lastExplorationSave > 1500) persistExploration();
});
const motion = $<HTMLInputElement>('reduce-motion');
motion.checked = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function setMotion() { document.body.classList.toggle('less-motion', motion.checked); view?.setReducedMotion(motion.checked); }
motion.addEventListener('change', setMotion);
setMotion();

function say(prompt: string) { currentPrompt = prompt; $('spoken-caption').textContent = prompt; if (navigationMode) $('nav-message').textContent = prompt; narrator.say(prompt); }
function soundButton() {
  $('sound-state').textContent = narrator.isEnabled() ? 'Sound on' : 'Sound off';
  $('sound').setAttribute('aria-label', `Turn narrator sound ${narrator.isEnabled() ? 'off' : 'on'}`);
}
function scheduleHint() {
  clearTimeout(hintTimer);
  if (!started || paused || navigationMode || !['signal', 'scan'].includes(state.phase) || state.hintLevel === 3 || document.querySelector('dialog[open]')) return;
  const check = () => {
    if (narrator.isSpeaking()) { hintTimer = setTimeout(check, 1000); return; }
    apply({ type: 'help', from: state.phase });
  };
  hintTimer = setTimeout(check, 12_000);
}
function render(announce = true) {
  if (navigationMode) { renderNavigationHud(); return; }
  document.body.dataset.mode = 'story';
  $<HTMLButtonElement>('action').disabled = false;
  $('navigation-hud').hidden = true;
  $('nav-target').hidden = true;
  $('mode-story').setAttribute('aria-pressed', 'true');
  $('mode-explore').setAttribute('aria-pressed', 'false');
  $('restart').textContent = 'Start again';
  $('controls-legend').textContent = 'ARROWS · POINT   SPACE / ENTER · ACTION   H · LISTEN   F1 · HELP   ESC · PAUSE';
  const text = storyContent(state);
  document.body.dataset.phase = state.phase;
  document.body.dataset.suitsCount = String(state.suits.length);
  document.body.dataset.paused = String(paused);
  $('chapter').textContent = text.chapter;
  $('location').textContent = text.location;
  $('story-title').textContent = text.title;
  $('story-copy').textContent = text.caption;
  $('action-text').textContent = text.action;
  $('action-icon').textContent = state.hintLevel === 3 ? '✋' : text.icon;
  $('help').hidden = !['signal', 'scan'].includes(state.phase);
  $('help-ladder').hidden = !state.hintLevel;
  $('help-message').textContent = ['', 'Look for the glow', 'A little nudge', 'Let’s do it together'][state.hintLevel];
  document.querySelectorAll<HTMLElement>('#help-ladder i').forEach((dot, index) => dot.classList.toggle('lit', index < state.hintLevel));
  $('world-cue').hidden = !['signal', 'scan'].includes(state.phase);
  $('world-cue').dataset.help = String(state.hintLevel);
  const suitCard = $('suit-card');
  suitCard.hidden = state.phase !== 'suits';
  if (state.phase === 'suits') {
    const card = SUIT_CARDS[SUIT_ORDER[state.suits.length]];
    suitCard.style.setProperty('--suit-color', card.color);
    suitCard.innerHTML = `<p class="eyebrow">${state.suits.length + 1} / FIVE TOGETHER</p><svg viewBox="0 0 180 210" aria-hidden="true"><path class="suit-outline" d="M62 38Q63 9 90 9T118 38L112 65 132 79 151 133 134 145 117 108 112 158 119 198 98 201 90 163 82 201 61 198 68 158 63 108 46 145 29 133 48 79 68 65Z"/><path class="suit-visor" d="M70 35Q90 24 110 35L104 49H76Z"/><path class="suit-line" d="M64 87L90 98 116 87M70 144H110M78 61H102"/></svg><span class="suit-insignia">${card.icon}</span><h3>${card.name}</h3><p>${card.role}</p>`;
  }
  $('scan-targets').hidden = state.phase !== 'scan';
  $('archive-card').hidden = state.phase !== 'archive';
  $('town-map').hidden = state.phase !== 'map';
  $('scan-outcome').textContent = state.scanAssisted ? 'Saved together · everyone helped' : 'Saved in the family archive';
  $('crew-strip').innerHTML = SUIT_ORDER.map(id => `<span class="crew-member ${state.suits.includes(id) ? 'received' : ''}" data-suit="${id}" style="--crew-color:${SUIT_CARDS[id].color}"><b>${SUIT_CARDS[id].icon}</b>${SUIT_CARDS[id].name}<span class="sr-only">${state.suits.includes(id) ? ' suit acquired' : ' suit not yet introduced'}</span></span>`).join('');
  if (state.hintLevel === 3 && state.phase === 'scan') selectedTarget = 1;
  document.querySelectorAll<HTMLButtonElement>('[data-target]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.target) === selectedTarget)));
  view?.setStoryState(state, selectedTarget);
  const prompt = hintPrompt(state);
  if (announce && started && !paused) say(prompt);
  else { currentPrompt = prompt; $('spoken-caption').textContent = prompt; }
  scheduleHint();
}
function apply(intent: StoryAction) {
  const previous = state;
  state = transition(state, intent);
  if (state === previous) return;
  if (previous.phase !== state.phase) selectedTarget = 0;
  if (canSave) $('save-status').textContent = saveCheckpoint(state);
  render();
}
function action() {
  if (!started || paused || document.querySelector('dialog[open]')) return;
  if (navigationMode) {
    if (!nearbyTarget) { say('Walk closer to the computer, pod, or practice module. Then press Space or Enter.'); return; }
    const result = view?.interactNavigation();
    if (result) { explorationState = copyExplorationState(result.state); say(result.notice); persistExploration(); }
    return;
  }
  if (state.phase === 'map') { say(storyContent(state).prompt); return; }
  if (state.phase === 'scan' && selectedTarget !== 1 && state.hintLevel < 3) {
    say('That panel is resting. Look for the shimmering diamond. Use the arrows to point, then press Space or Enter. We can help with F1.'); scheduleHint(); return;
  }
  apply(nextAction(state));
}
function setPaused(value: boolean) {
  if (!started) return;
  clearMovement();
  paused = value; $('pause-screen').hidden = !paused; document.body.dataset.paused = String(paused);
  clearTimeout(hintTimer); view?.setPaused(paused); narrator.stop();
  if (!paused) { (navigationMode ? $('game') : $('action')).focus({ preventScroll: true }); say(currentPrompt); scheduleHint(); }
}
function begin(withSound: boolean) {
  clearMovement();
  if (navigationMode) persistExploration();
  navigationMode = false;
  paused = false;
  $('pause-screen').hidden = true;
  view?.setNavigationEnabled(false);
  view?.setPaused(false);
  started = true; $('begin-screen').hidden = true; narrator.setEnabled(withSound); soundButton();
  $('play-modes').hidden = false;
  $('save-status').textContent = loaded.notice || 'First Contact progress saves on this device.';
  $('action').focus({ preventScroll: true }); render();
}
function persistExploration() {
  if (!explorationCanSave) return;
  const serialized = JSON.stringify(explorationState);
  if (serialized === savedExplorationJson) return;
  lastExplorationSave = performance.now();
  const notice = saveExploration(explorationState);
  $('save-status').textContent = notice;
  if (notice.startsWith('Practice position and module saved')) savedExplorationJson = serialized;
}
function syncMovement() {
  view?.setNavigationInput({
    forward: Number(heldMovementKeys.has('w') || heldMovementKeys.has('arrowup')) - Number(heldMovementKeys.has('s') || heldMovementKeys.has('arrowdown')),
    right: Number(heldMovementKeys.has('d') || heldMovementKeys.has('arrowright')) - Number(heldMovementKeys.has('a') || heldMovementKeys.has('arrowleft')),
  });
}
function clearMovement() { heldMovementKeys.clear(); syncMovement(); if (navigationMode && started) persistExploration(); }
function renderNavigationHud() {
  document.body.dataset.mode = 'exploration';
  document.body.dataset.paused = String(paused);
  $('navigation-hud').hidden = false;
  $('nav-target').hidden = false;
  $('mode-story').setAttribute('aria-pressed', 'false');
  $('mode-explore').setAttribute('aria-pressed', 'true');
  $('location').textContent = explorationState.player.x < -0.5 ? 'HOME · LIVING ROOM' : 'HOME · BACKYARD';
  $('restart').textContent = 'Reset walk';
  $('help').hidden = false;
  $('action-icon').textContent = nearbyTarget ? '✋' : '➜';
  $('action-text').textContent = nearbyTarget?.prompt ?? 'Move closer to interact';
  $<HTMLButtonElement>('action').disabled = !nearbyTarget;
  $('nav-target').textContent = nearbyTarget ? `${nearbyTarget.label} · SPACE / ENTER` : 'Explore the home and backyard';
  const count = explorationState.collected.length;
  $('nav-inventory').dataset.count = String(count);
  $('nav-inventory').textContent = `Practice module: ${count} / 1`;
  $('controls-legend').textContent = 'WASD / ARROWS · WALK   DRAG / Q E · CAMERA   R · RECENTER   SPACE / ENTER · INTERACT   ESC · PAUSE';
  if (displayedTarget !== (nearbyTarget?.id ?? null)) {
    displayedTarget = nearbyTarget?.id ?? null;
    currentPrompt = nearbyTarget ? `${nearbyTarget.prompt}. Press Space or Enter.` : 'Use W A S D or the arrows to walk. Move close to a glowing object, then press Space or Enter. Q and E turn the camera. R brings it back behind you.';
    $('nav-message').textContent = currentPrompt;
    if (nearbyTarget && !paused) narrator.say(currentPrompt);
  }
}
function beginExploration() {
  clearMovement();
  navigationMode = true; started = true; paused = false; displayedTarget = undefined;
  $('begin-screen').hidden = true; $('pause-screen').hidden = true; $('play-modes').hidden = false;
  clearTimeout(hintTimer); narrator.stop();
  $('save-status').textContent = explorationLoaded.notice || 'Your place and practice module save on this device.';
  view?.setExplorationState(explorationState);
  view?.setNavigationEnabled(true);
  view?.setPaused(false);
  renderNavigationHud();
  if (narrator.isEnabled()) say(currentPrompt);
  $('game').focus({ preventScroll: true });
}
function repeatPrompt() { narrator.setEnabled(true); soundButton(); if (!started) beginExploration(); else if (!paused) { say(currentPrompt); (navigationMode ? $('game') : $('action')).focus({ preventScroll: true }); } }
$('save-status').textContent = loaded.notice || 'Progress saves on this device.';
$('begin-explore').addEventListener('click', beginExploration);
$('mode-explore').addEventListener('click', beginExploration);
$('mode-story').addEventListener('click', () => begin(narrator.isEnabled()));
$('begin-sound').addEventListener('click', () => begin(true));
$('begin-quiet').addEventListener('click', () => begin(false));
$('action').addEventListener('click', event => { if (event.detail < 2) action(); });
$('repeat').addEventListener('click', repeatPrompt);
$('help').addEventListener('click', () => { if (started && !paused) { if (navigationMode) say('Walk through the wide doorway to the backyard. The computer, glowing pod, and practice module work when you stand close. Press Space or Enter to interact.'); else apply({ type: 'help', from: state.phase }); (navigationMode ? $('game') : $('action')).focus({ preventScroll: true }); } });
$('pause').addEventListener('click', () => setPaused(true));
$('resume').addEventListener('click', () => setPaused(false));
$('sound').addEventListener('click', () => { narrator.setEnabled(!narrator.isEnabled()); soundButton(); if (started && !paused) { if (narrator.isEnabled()) say(currentPrompt); $('action').focus({ preventScroll: true }); } });
$('restart').addEventListener('click', () => {
  if (navigationMode) {
    if (!window.confirm('Reset this walk? Your practice position and module will start again. First Contact story progress is kept.')) return;
    clearMovement(); explorationState = createExplorationState(); explorationCanSave = true;
    const notice = saveExploration(explorationState, undefined, { allowOverwriteUnsupported: true });
    $('save-status').textContent = notice;
    if (notice.startsWith('Practice position and module saved')) savedExplorationJson = JSON.stringify(explorationState);
    view?.setExplorationState(explorationState);
    if (paused) setPaused(false); renderNavigationHud(); $('game').focus({ preventScroll: true }); return;
  }
  if (!window.confirm('Start First Contact again? Your current checkpoint will be replaced.')) return;
  state = createInitialState(); canSave = true; selectedTarget = 0;
  $('save-status').textContent = saveCheckpoint(state, undefined, { allowOverwriteUnsupported: true }); render();
  if (started) { if (paused) setPaused(false); else $('action').focus({ preventScroll: true }); }
});
document.querySelectorAll<HTMLButtonElement>('[data-target]').forEach(button => button.addEventListener('click', () => {
  if (paused || state.phase !== 'scan') return; selectedTarget = Number(button.dataset.target); render(false); $('action').focus({ preventScroll: true });
}));
document.addEventListener('keydown', event => {
  const target = event.target as HTMLElement;
  if (event.altKey || event.ctrlKey || event.metaKey || target.closest('input,textarea,select,[contenteditable="true"],dialog[open]')) return;
  if (event.repeat) {
    if ([' ', 'Enter', 'F1', '?', 'h', 'H', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) event.preventDefault();
    return;
  }
  if (event.key === 'Escape') { event.preventDefault(); setPaused(!paused); return; }
  if (paused) { if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); setPaused(false); } return; }
  if (event.key === 'h' || event.key === 'H') { event.preventDefault(); repeatPrompt(); return; }
  if (event.key === 'F1' || event.key === '?') { event.preventDefault(); if (started) $('help').click(); return; }
  if (navigationMode && started) {
    const key = event.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      event.preventDefault(); heldMovementKeys.add(key); syncMovement(); return;
    }
    if (key === 'q' || key === 'e') { event.preventDefault(); view?.rotateNavigationCamera(key === 'q' ? -0.22 : 0.22); return; }
    if (key === 'r') { event.preventDefault(); view?.recenterNavigationCamera(); return; }
  }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
    event.preventDefault();
    if (started && state.phase === 'scan') { selectedTarget = (selectedTarget + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? 2 : 1)) % 3; render(false); }
    else view?.point(event.key);
    return;
  }
  if ([' ', 'Enter'].includes(event.key)) {
    if (target.closest('button') && !target.closest('[data-target]') && !['action', 'game', 'begin-sound'].includes(target.id)) return;
    event.preventDefault(); if (!started) { if (target.id === 'begin-sound') begin(true); else beginExploration(); } else action();
  }
});
document.addEventListener('keyup', event => {
  const key = event.key.toLowerCase();
  if (heldMovementKeys.delete(key)) { syncMovement(); persistExploration(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
window.addEventListener('blur', () => setPaused(true));
render(false);
if (import.meta.env.DEV) {
  Object.defineProperty(window, '__SPACE_DRAGON__', { value: Object.freeze({
    snapshot: () => ({ ...view?.snapshot(), state: JSON.parse(JSON.stringify(state)), exploration: copyExplorationState(explorationState), selectedTarget, paused, started, mode: navigationMode ? 'exploration' : 'story', speechEnabled: narrator.isEnabled() }),
    resetPerformanceSample: () => view?.resetPerformanceSample(),
  }), configurable: true });
  void import('./ui/notebook').then(({ connectNotebook }) => connectNotebook(() => {
    clearMovement(); clearTimeout(hintTimer); narrator.stop(); view?.setPaused(true);
  }, () => { clearMovement(); view?.setPaused(paused); if (started && !paused) (navigationMode ? $('game') : $('action')).focus({ preventScroll: true }); scheduleHint(); }));
}
window.addEventListener('pagehide', event => { clearMovement(); if (!event.persisted) { clearTimeout(hintTimer); disposeVisualControls(); narrator.dispose(); view?.dispose(); } });
