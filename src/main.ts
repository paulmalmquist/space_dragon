import './style.css';
import { createFirstContact } from './game/scene';
import { createInitialState, nextAction, transition, SUIT_ORDER } from './game/state';
import type { StoryAction } from './game/state';
import { loadCheckpoint, saveCheckpoint } from './game/checkpoint';
import { storyContent, hintPrompt, SUIT_CARDS } from './game/first-contact-content';
import { createNarrator } from './game/narrator';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="masthead">
    <a class="wordmark" href="./" aria-label="Space Dragon home"><span class="mark">✧</span> SPACE DRAGON</a>
    <span class="build-label">FIRST CONTACT <span class="build-dot"></span> PLAYABLE DRAFT</span>
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
      <div id="begin-screen" class="screen-overlay"><div class="welcome"><span class="welcome-symbol" aria-hidden="true">✧</span><p class="eyebrow">LET’S PLAY TOGETHER</p><h2>Ready, family?</h2>
        <p>Listen, look, and press a big key.<br>We can help whenever you need it.</p>
        <button class="primary" id="begin-sound"><span>▶</span> Start adventure with sound</button><button class="quiet" id="begin-quiet">Play quietly</button>
        <p class="voice-label">Placeholder computer narrator · no family recordings</p></div></div>
      <div id="pause-screen" class="screen-overlay" hidden><div class="welcome"><span class="welcome-symbol">Ⅱ</span><h2>We’ll wait for you.</h2><p>Everything stays right here.</p><button class="primary" id="resume">▶ Continue together</button></div></div>
      <p id="render-error" class="render-error" role="alert" hidden></p>
    </section>
    <div class="below-scene"><div><p id="save-status" role="status"></p><p id="narrator-status" role="status"></p></div>
      <div class="settings"><label><input id="reduce-motion" type="checkbox"> Less motion</label><button id="restart" class="quiet">Start again</button></div></div>
    <footer><span>Draft scene and suit silhouettes. Lyla’s final color is open.</span><span>ARROWS · POINT &nbsp; SPACE / ENTER · ACTION &nbsp; H · LISTEN &nbsp; F1 · HELP &nbsp; ESC · PAUSE</span></footer>
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
let hintTimer: ReturnType<typeof setTimeout> | undefined;
let currentPrompt = '';
let view: ReturnType<typeof createFirstContact> | undefined;
const narrator = createNarrator(message => { $('narrator-status').textContent = message; });
try { view = createFirstContact($<HTMLCanvasElement>('game')); }
catch { $('render-error').hidden = false; $('render-error').textContent = 'The 3D view could not start. Try Chrome with WebGL enabled. The story controls still work.'; }
const motion = $<HTMLInputElement>('reduce-motion');
motion.checked = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function setMotion() { document.body.classList.toggle('less-motion', motion.checked); view?.setReducedMotion(motion.checked); }
motion.addEventListener('change', setMotion);
setMotion();

function say(prompt: string) { currentPrompt = prompt; $('spoken-caption').textContent = prompt; narrator.say(prompt); }
function soundButton() {
  $('sound-state').textContent = narrator.isEnabled() ? 'Sound on' : 'Sound off';
  $('sound').setAttribute('aria-label', `Turn narrator sound ${narrator.isEnabled() ? 'off' : 'on'}`);
}
function scheduleHint() {
  clearTimeout(hintTimer);
  if (!started || paused || !['signal', 'scan'].includes(state.phase) || state.hintLevel === 3 || document.querySelector('dialog[open]')) return;
  const check = () => {
    if (narrator.isSpeaking()) { hintTimer = setTimeout(check, 1000); return; }
    apply({ type: 'help', from: state.phase });
  };
  hintTimer = setTimeout(check, 12_000);
}
function render(announce = true) {
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
  if (state.phase === 'map') { say(storyContent(state).prompt); return; }
  if (state.phase === 'scan' && selectedTarget !== 1 && state.hintLevel < 3) {
    say('That panel is resting. Look for the shimmering diamond. Use the arrows to point, then press Space or Enter. We can help with F1.'); scheduleHint(); return;
  }
  apply(nextAction(state));
}
function setPaused(value: boolean) {
  if (!started) return;
  paused = value; $('pause-screen').hidden = !paused; document.body.dataset.paused = String(paused);
  clearTimeout(hintTimer); view?.setPaused(paused); narrator.stop();
  if (!paused) { $('action').focus({ preventScroll: true }); say(currentPrompt); scheduleHint(); }
}
function begin(withSound: boolean) {
  started = true; $('begin-screen').hidden = true; narrator.setEnabled(withSound); soundButton();
  $('action').focus({ preventScroll: true }); render();
}
function repeatPrompt() { narrator.setEnabled(true); soundButton(); if (!started) begin(true); else if (!paused) { say(currentPrompt); $('action').focus({ preventScroll: true }); } }
$('save-status').textContent = loaded.notice || 'Progress saves on this device.';
$('begin-sound').addEventListener('click', () => begin(true));
$('begin-quiet').addEventListener('click', () => begin(false));
$('action').addEventListener('click', event => { if (event.detail < 2) action(); });
$('repeat').addEventListener('click', repeatPrompt);
$('help').addEventListener('click', () => { if (started && !paused) { apply({ type: 'help', from: state.phase }); $('action').focus({ preventScroll: true }); } });
$('pause').addEventListener('click', () => setPaused(true));
$('resume').addEventListener('click', () => setPaused(false));
$('sound').addEventListener('click', () => { narrator.setEnabled(!narrator.isEnabled()); soundButton(); if (started && !paused) { if (narrator.isEnabled()) say(currentPrompt); $('action').focus({ preventScroll: true }); } });
$('restart').addEventListener('click', () => {
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
  if (event.key === 'F1' || event.key === '?') { event.preventDefault(); if (started) apply({ type: 'help', from: state.phase }); return; }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
    event.preventDefault();
    if (started && state.phase === 'scan') { selectedTarget = (selectedTarget + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? 2 : 1)) % 3; render(false); }
    else view?.point(event.key);
    return;
  }
  if ([' ', 'Enter'].includes(event.key)) {
    if (target.closest('button') && !target.closest('[data-target]') && !['action', 'game', 'begin-sound'].includes(target.id)) return;
    event.preventDefault(); if (!started) begin(true); else action();
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
window.addEventListener('blur', () => setPaused(true));
render(false);
if (import.meta.env.DEV) {
  Object.defineProperty(window, '__SPACE_DRAGON__', { value: Object.freeze({
    snapshot: () => ({ ...view?.snapshot(), state: JSON.parse(JSON.stringify(state)), selectedTarget, paused, started, speechEnabled: narrator.isEnabled() }),
  }), configurable: true });
  void import('./ui/notebook').then(({ connectNotebook }) => connectNotebook(() => {
    clearTimeout(hintTimer); narrator.stop(); view?.setPaused(true);
  }, () => { view?.setPaused(paused); if (started && !paused) $('action').focus({ preventScroll: true }); scheduleHint(); }));
}
window.addEventListener('pagehide', event => { if (!event.persisted) { clearTimeout(hintTimer); narrator.dispose(); view?.dispose(); } });
