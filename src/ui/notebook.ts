/** Development-only notebook. Original user text is appended by the Vite plugin. */
export function connectNotebook(onOpen: () => void, onClose: () => void) {
  const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const notebook = get<HTMLDialogElement>('notebook');
  const thought = get<HTMLTextAreaElement>('thought');
  try { thought.value = localStorage.getItem('space-dragon.idea-draft') ?? ''; } catch { /* optional draft recovery */ }
  thought.addEventListener('input', () => { try { localStorage.setItem('space-dragon.idea-draft', thought.value); } catch { /* text remains in form */ } });
  get('notebook-open').addEventListener('click', () => { onOpen(); notebook.showModal(); });
  get('notebook-close').addEventListener('click', () => notebook.close());
  notebook.addEventListener('close', onClose);
  get('idea-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = document.querySelector<HTMLButtonElement>('#idea-form button[type="submit"]')!;
    const submittedThought = thought.value;
    button.disabled = true;
    get('idea-status').textContent = 'Saving…';
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}__ideas`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ thought: submittedThought }),
      });
      const result = await response.json() as { id?: string; error?: string };
      if (!response.ok) throw new Error(result.error || 'Could not save this idea.');
      get('idea-status').textContent = `Saved to your idea inbox. ${result.id}`;
      if (thought.value === submittedThought) {
        thought.value = '';
        try { localStorage.removeItem('space-dragon.idea-draft'); } catch { /* optional */ }
      }
    } catch (error) {
      get('idea-status').textContent = error instanceof Error ? error.message : 'Could not save. Your text is still here.';
    } finally { button.disabled = false; }
  });
}
