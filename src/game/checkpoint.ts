import { initialCheckpoint, validateCheckpoint } from './firstContact';
import type { Checkpoint } from './firstContact';
export type { Checkpoint, Step } from './firstContact';
export const SAVE_KEY = 'space-dragon.checkpoint.v2';
export const LEGACY_SAVE_KEY = 'space-dragon.checkpoint.v1';
export const RECOVERY_KEY = 'space-dragon.checkpoint.before-restart';

export function loadCheckpoint(): { checkpoint: Checkpoint; notice: string } {
  try {
    const current = localStorage.getItem(SAVE_KEY);
    const raw = current ?? localStorage.getItem(LEGACY_SAVE_KEY);
    if (!raw) return { checkpoint: initialCheckpoint(), notice: '' };
    const value: unknown = JSON.parse(raw);
    const checkpoint = validateCheckpoint(value);
    if (checkpoint) return { checkpoint, notice: 'Your checkpoint is restored.' };
    if (current === null && value && typeof value === 'object' && 'version' in value && value.version === 1 &&
        'step' in value && typeof value.step === 'string' && ['computer', 'backyard', 'pod'].includes(value.step)) {
      return { checkpoint: { ...initialCheckpoint(), step: value.step as 'computer' | 'backyard' | 'pod' },
        notice: 'Your checkpoint is restored. The new suit sequence continues from here.' };
    }
    return { checkpoint: initialCheckpoint(), notice: 'This checkpoint is from a different build. Starting First Contact again.' };
  } catch {
    return { checkpoint: initialCheckpoint(), notice: 'The checkpoint could not be read. You can still play.' };
  }
}

export function saveCheckpoint(checkpoint: Checkpoint, beforeRestart?: Checkpoint): string {
  try {
    if (beforeRestart) localStorage.setItem(RECOVERY_KEY, JSON.stringify(beforeRestart));
    localStorage.setItem(SAVE_KEY, JSON.stringify(checkpoint));
    return 'Checkpoint saved on this device.';
  } catch { return 'Browser storage is unavailable. Progress will last for this visit.'; }
}
