import './style.css';
import { createFirstContact } from './game/scene';
import { loadCheckpoint, saveCheckpoint } from './game/checkpoint';
import type { Step } from './game/checkpoint';

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
      <div class="scene-hint">Drag to look around · Scroll to move closer</div>
      <div class="story-panel"><p class="eyebrow" id="chapter">01 / THE SIGNAL</p><h2 id="story-title"></h2>
        <p id="story-copy"></p><button class="primary" id="action"></button>
      </div>
      <p id="render-error" class="render-error" role="alert" hidden></p>
    </section>
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
const content: Record<Step, { chapter: string; location: string; title: string; copy: string; action: string }> = {
  computer: { chapter: '01 / THE SIGNAL', location: 'HOME / LIVING ROOM', title: 'That wasn’t on the screen a moment ago.',
    copy: 'The family is gathered by the computer. A broken transmission flickers into view. Then a bright streak passes the window.', action: 'Follow the signal →' },
  backyard: { chapter: '02 / THE ARRIVAL', location: 'HOME / BACKYARD', title: 'Something has landed.',
    copy: 'A strange pod rests in the yard. The same symbol glows on its shell. The family approaches together.', action: 'Investigate the pod →' },
  pod: { chapter: '03 / FIRST CONTACT', location: 'HOME / BACKYARD', title: 'The message is only the beginning.',
    copy: 'The pod responds. An incomplete mechanical dragon appears in its stored design. More signals are scattered across town. There is something here to build—and someone asking for help.', action: 'Checkpoint reached ✓' },
};
function render() {
  const text = content[checkpoint.step];
  $('chapter').textContent = text.chapter;
  $('location').textContent = text.location;
  $('story-title').textContent = text.title;
  $('story-copy').textContent = text.copy;
  const action = $<HTMLButtonElement>('action');
  action.textContent = text.action;
  action.disabled = checkpoint.step === 'pod';
  view?.setStep(checkpoint.step);
}
$('save-status').textContent = loaded.notice || 'Your adventure saves on this device.';
$('action').addEventListener('click', () => {
  checkpoint = { version: 1, step: checkpoint.step === 'computer' ? 'backyard' : 'pod' };
  $('save-status').textContent = saveCheckpoint(checkpoint);
  render();
});
$('restart').addEventListener('click', () => {
  if (checkpoint.step !== 'computer' && !window.confirm('Start First Contact again? Your current checkpoint will be replaced.')) return;
  checkpoint = { version: 1, step: 'computer' };
  $('save-status').textContent = saveCheckpoint(checkpoint);
  render();
});
render();

if (import.meta.env.DEV) {
  Object.defineProperty(window, '__SPACE_DRAGON__', { value: Object.freeze({
    snapshot: () => ({ ...view?.snapshot(), checkpoint: { ...checkpoint } }),
  }), configurable: true });
  const notebook = $<HTMLDialogElement>('notebook');
  const thought = $<HTMLTextAreaElement>('thought');
  let draft = '';
  try { draft = localStorage.getItem('space-dragon.idea-draft') ?? ''; } catch { /* optional draft recovery */ }
  thought.value = draft;
  thought.addEventListener('input', () => { try { localStorage.setItem('space-dragon.idea-draft', thought.value); } catch { /* keep text in form */ } });
  $('notebook-open').addEventListener('click', () => notebook.showModal());
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
window.addEventListener('pagehide', event => { if (!event.persisted) view?.dispose(); });
