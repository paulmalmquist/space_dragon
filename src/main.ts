import './style.css';
import { createFirstContact } from './game/scene';
import { loadCheckpoint, saveCheckpoint } from './game/checkpoint';
import { FAMILY, TOWN_ROUTE, initialCheckpoint, rewards, storyCard, transition } from './game/firstContact';
import type { Action } from './game/firstContact';
import { createNarration } from './game/narration';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="masthead">
    <a class="wordmark" href="./" aria-label="Space Dragon home"><span class="mark">✧</span> SPACE DRAGON</a>
    <span class="build-label">FIRST CONTACT <span class="build-dot"></span> DEVELOPMENT BUILD</span>
    ${import.meta.env.DEV ? '<button class="quiet" id="notebook-open">Idea notebook ↗</button>' : ''}
  </header>
  <main>
    <section class="intro"><p class="eyebrow">AN ORDINARY EVENING. AN EXTRAORDINARY ARRIVAL.</p>
      <h1>It starts with a signal.</h1>
      <p class="intro-copy">A family. An interrupted message. Something waiting in the backyard.</p>
    </section>
    <section class="play-area" aria-label="First Contact prototype">
      <canvas id="game" aria-label="3D view of the living-room computer and backyard arrival" tabindex="0"></canvas>
      <div class="scene-label"><span class="live-dot"></span> <span id="location">HOME / LIVING ROOM</span></div>
      <div class="scene-hint">Tab to choose · Enter to help · H to hear</div>
      <div class="story-panel" aria-live="polite"><p class="eyebrow" id="chapter">01 / THE SIGNAL</p><h2 id="story-title"></h2>
        <p id="story-copy"></p><p id="instruction"></p>
        <fieldset id="story-controls" aria-label="Story controls">
          <button class="primary" id="action"></button>
          <div class="support-actions"><button class="quiet" id="hear">Hear instruction · H</button>
            <button class="quiet" id="hint" hidden>Show me</button><button class="quiet" id="help" hidden>Help together</button>
            <button class="quiet" id="skip" hidden>Skip demonstrations</button></div>
        </fieldset>
        <p id="feedback" role="status"></p>
      </div>
      <p id="render-error" class="render-error" role="alert" hidden></p>
    </section>
    <section id="family" class="family-strip" aria-label="Family suits" hidden></section>
    <section id="briefing" class="briefing" aria-labelledby="briefing-title" hidden>
      <div class="briefing-heading"><div><p class="eyebrow">THE ADVENTURE AHEAD</p><h2 id="briefing-title">Build the dragon on Earth.</h2></div>
        <span class="archive-badge">◇ First signal archived</span></div>
      <p>The scattered parts belong to a design that already exists. Recover them together, one expedition at a time.</p>
      <ol class="town-route">${TOWN_ROUTE.map(([title, place, part], index) => `<li ${index === 0 ? 'class="next-mission"' : ''}><span class="route-number">${String(index + 1).padStart(2, '0')}</span><div><h3>${title}</h3><p>${place} · ${part}</p></div><span class="route-state">${index === 0 ? 'NEXT CHAPTER' : 'LATER'}</span></li>`).join('')}</ol>
      <p class="prototype-note">First Contact ends here. Town missions are planned chapters, not playable locations in this build.</p>
      <details><summary>The larger journey</summary><p>Three acts: build on Earth, travel from world to world, and make the final landing on Viera. Along the way, the worlds help compose the SOS. The detailed route and cast remain in development.</p></details>
    </section>
    <div class="access-controls"><button class="quiet" id="pause" aria-pressed="false">Pause</button>
      <label><input type="checkbox" id="reduced-motion"> Reduce motion</label><span id="voice-status" role="status"></span></div>
    <div class="below-scene"><p id="save-status" role="status" aria-live="polite"></p><button id="restart" class="quiet">Start again</button></div>
    <footer><span>A small playable foundation. Models, lighting, and story staging are provisional.</span><span>PAUL · MARIA · LUKE · LUNA · LYLA</span></footer>
  </main>
  ${import.meta.env.DEV ? `<dialog id="notebook" aria-labelledby="notebook-title"><form id="idea-form">
    <div class="dialog-top"><p class="eyebrow">YOUR IDEAS, IN ANY ORDER</p><button type="button" id="notebook-close" class="quiet">Close</button></div>
    <h2 id="notebook-title">What are you imagining?</h2><p>Story, a look, a sound, a change of mind. A sentence is enough.</p>
    <label for="thought">Your thought</label><textarea id="thought" name="thought" rows="7" maxlength="12000" required placeholder="Maybe the pod should sound like…"></textarea>
    <button class="primary" type="submit">Save idea</button><p id="idea-status" role="status" aria-live="polite"></p>
    <p class="notebook-note">Saved in this repo’s idea inbox. Ask your agent to process the inbox when you want the project updated.</p>
  </form></dialog>` : ''}
`;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const loaded = loadCheckpoint();
let checkpoint = loaded.checkpoint;
let view: ReturnType<typeof createFirstContact> | undefined;
try {
  view = createFirstContact($<HTMLCanvasElement>('game'));
} catch {
  $('render-error').hidden = false;
  $('render-error').textContent = 'The 3D view could not start. Try a browser with WebGL enabled. The story controls still work.';
}
const narration = createNarration(message => { $('voice-status').textContent = message; });
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
$<HTMLInputElement>('reduced-motion').checked = motionPreference.matches;
let manuallyPaused = false;
let notebookOpen = false;
let inputReady = true;
let settleTimer: ReturnType<typeof setTimeout> | undefined;
const paused = () => manuallyPaused || document.hidden || notebookOpen;
let pendingAction: Action;
function dispatch(action: Action) {
  if (paused() || !inputReady) return;
  const next = transition(checkpoint, action);
  if (next === checkpoint) return;
  narration.stop();
  $('voice-status').textContent = '';
  const feedback = action.type === 'demonstrate' ? FAMILY.find(member => member.id === action.character)!.result
    : action.type === 'hint' ? 'Find the diamond ◇. You can scan it yourself, or choose Help together.'
    : action.type === 'scan' ? 'Signal saved. Everyone helped. The town map is ready.' : '';
  checkpoint = next;
  $('save-status').textContent = saveCheckpoint(checkpoint);
  render();
  $('feedback').textContent = feedback;
  // The card can change height. Ignore a second click landing on a different
  // control under the same pointer (including Skip), as well as held input.
  inputReady = false;
  const focusedControl = document.activeElement as HTMLElement | null;
  syncPause();
  settleTimer = setTimeout(() => {
    inputReady = true; syncPause();
    if (!paused() && document.activeElement === document.body && focusedControl?.closest('#story-controls')) {
      if (!focusedControl.hidden && !(focusedControl as HTMLButtonElement).disabled) focusedControl.focus();
      else if (checkpoint.step !== 'map') $('action').focus();
    }
  }, 350);
}
function render() {
  const text = storyCard(checkpoint);
  $('chapter').textContent = text.chapter;
  $('location').textContent = text.location;
  $('story-title').textContent = text.title;
  $('story-copy').textContent = text.copy;
  $('instruction').textContent = text.prompt;
  const action = $<HTMLButtonElement>('action');
  action.textContent = text.action;
  action.disabled = checkpoint.step === 'map';
  action.classList.toggle('scan-target', checkpoint.step === 'scan');
  action.classList.toggle('hint-target', checkpoint.step === 'scan' && checkpoint.scanHelp);
  pendingAction = checkpoint.step === 'suits' ? { type: 'demonstrate', character: FAMILY[checkpoint.demonstrated]!.id }
    : checkpoint.step === 'scan' ? { type: 'scan', assisted: false } : { type: 'advance', from: checkpoint.step };
  $('skip').hidden = checkpoint.step !== 'suits';
  $('hint').hidden = checkpoint.step !== 'scan';
  $('help').hidden = checkpoint.step !== 'scan';
  $('briefing').hidden = checkpoint.step !== 'map';
  $('family').hidden = rewards(checkpoint).length === 0;
  $('family').innerHTML = FAMILY.map((member, index) => `<div class="family-card ${checkpoint.step === 'suits' && index === checkpoint.demonstrated ? 'active' : ''}" style="--suit-color:${member.color}">
    <span class="suit-glyph" aria-hidden="true">${member.glyph}</span><div><strong>${member.name}</strong><span>${member.role}</span></div><span class="suit-check" aria-label="Suit available">✓</span></div>`).join('');
  view?.setState(checkpoint);
}
function syncPause() {
  view?.setPaused(paused());
  $<HTMLFieldSetElement>('story-controls').disabled = paused() || !inputReady;
  $('pause').textContent = manuallyPaused ? 'Resume' : 'Pause';
  $('pause').setAttribute('aria-pressed', String(manuallyPaused));
  if (paused()) narration.stop();
}
$('save-status').textContent = loaded.notice || 'Your adventure saves on this device.';
$('action').addEventListener('click', event => { if (event.detail <= 1) dispatch(pendingAction); });
$('skip').addEventListener('click', () => { dispatch({ type: 'skip-demonstrations' }); $('action').focus(); });
$('hint').addEventListener('click', () => dispatch({ type: 'hint' }));
$('help').addEventListener('click', () => { dispatch({ type: 'scan', assisted: true }); $('briefing-title').setAttribute('tabindex', '-1'); $('briefing-title').focus(); });
$('hear').addEventListener('click', () => { if (!paused()) narration.speak(storyCard(checkpoint).prompt); });
window.addEventListener('keydown', event => {
  if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement || notebookOpen) return;
  if (event.repeat && ['Enter', ' ', 'h', 'H'].includes(event.key)) { event.preventDefault(); return; }
  if (event.key.toLowerCase() === 'h' && !event.ctrlKey && !event.metaKey && !event.altKey && !paused()) {
    event.preventDefault(); narration.speak(storyCard(checkpoint).prompt);
  }
});
$('pause').addEventListener('click', () => { manuallyPaused = !manuallyPaused; syncPause(); });
document.addEventListener('visibilitychange', syncPause);
window.addEventListener('blur', () => narration.stop());
$<HTMLInputElement>('reduced-motion').addEventListener('change', event => view?.setReducedMotion((event.target as HTMLInputElement).checked));
$('restart').addEventListener('click', () => {
  if (checkpoint.step !== 'computer' && !window.confirm('Start First Contact again? Your current checkpoint will be replaced.')) return;
  narration.stop();
  const previous = checkpoint;
  clearTimeout(settleTimer);
  inputReady = true;
  checkpoint = initialCheckpoint();
  manuallyPaused = false;
  $('save-status').textContent = saveCheckpoint(checkpoint, previous);
  $('feedback').textContent = '';
  $('voice-status').textContent = '';
  render(); syncPause(); $('action').focus();
});
render();
view?.setReducedMotion(motionPreference.matches);
syncPause();

if (import.meta.env.DEV) {
  Object.defineProperty(window, '__SPACE_DRAGON__', { value: Object.freeze({
    snapshot: () => ({ ...view?.snapshot(), checkpoint: { ...checkpoint }, rewards: rewards(checkpoint), paused: paused() }),
  }), configurable: true });
  const notebook = $<HTMLDialogElement>('notebook');
  const thought = $<HTMLTextAreaElement>('thought');
  let draft = '';
  try { draft = localStorage.getItem('space-dragon.idea-draft') ?? ''; } catch { /* optional draft recovery */ }
  thought.value = draft;
  thought.addEventListener('input', () => { try { localStorage.setItem('space-dragon.idea-draft', thought.value); } catch { /* keep text in form */ } });
  $('notebook-open').addEventListener('click', () => { notebookOpen = true; syncPause(); notebook.showModal(); });
  notebook.addEventListener('close', () => { notebookOpen = false; syncPause(); });
  $('notebook-close').addEventListener('click', () => notebook.close());
  $('idea-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = document.querySelector<HTMLButtonElement>('#idea-form button[type="submit"]')!;
    const submittedThought = thought.value;
    button.disabled = true;
    $('idea-status').textContent = 'Saving…';
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}__ideas`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ thought: submittedThought }),
      });
      const result = await response.json() as { id?: string; error?: string };
      if (!response.ok) throw new Error(result.error || 'Could not save this idea.');
      $('idea-status').textContent = `Saved to your idea inbox. ${result.id}`;
      if (thought.value === submittedThought) {
        thought.value = '';
        try { localStorage.removeItem('space-dragon.idea-draft'); } catch { /* optional */ }
      }
    } catch (error) {
      $('idea-status').textContent = error instanceof Error ? error.message : 'Could not save. Your text is still here.';
    } finally { button.disabled = false; }
  });
}
window.addEventListener('pagehide', event => {
  narration.stop(); clearTimeout(settleTimer); inputReady = true;
  if (!event.persisted) view?.dispose();
});
window.addEventListener('pageshow', syncPause);
