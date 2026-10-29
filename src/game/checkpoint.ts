export const SAVE_KEY = 'space-dragon.checkpoint.v1';
export type Step = 'computer' | 'backyard' | 'pod';
export interface Checkpoint { version: 1; step: Step; }

export function loadCheckpoint(): { checkpoint: Checkpoint; notice: string } {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { checkpoint: { version: 1, step: 'computer' }, notice: '' };
    const value: unknown = JSON.parse(raw);
    if (typeof value === 'object' && value !== null && 'version' in value && value.version === 1 &&
      'step' in value && typeof value.step === 'string' && ['computer', 'backyard', 'pod'].includes(value.step)) {
      return { checkpoint: { version: 1, step: value.step as Step }, notice: 'Your checkpoint is restored.' };
    }
    return { checkpoint: { version: 1, step: 'computer' }, notice: 'This checkpoint is from a different build. Starting First Contact again.' };
  } catch {
    return { checkpoint: { version: 1, step: 'computer' }, notice: 'The checkpoint could not be read. You can still play.' };
  }
}

export function saveCheckpoint(checkpoint: Checkpoint): string {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(checkpoint)); return 'Checkpoint saved on this device.'; }
  catch { return 'Browser storage is unavailable. Progress will last for this visit.'; }
}
