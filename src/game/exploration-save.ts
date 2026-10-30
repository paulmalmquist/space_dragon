import { copyExplorationState, createExplorationState, isExplorationState, recoverExplorationState } from './navigation.ts';
import type { ExplorationState } from './navigation.ts';
import type { SaveStorage } from './checkpoint.ts';

// Independent from First Contact's v1/v2 checkpoints: this is a reversible practice space.
export const EXPLORATION_SAVE_KEY = 'space-dragon.exploration.v1';
export const EXPLORATION_BACKUP_KEY = 'space-dragon.exploration.v1.backup';
export interface LoadedExploration { state: ExplorationState; notice: string; canSave: boolean; }
export interface ExplorationSaveOptions { allowOverwriteUnsupported?: boolean; }

function parsed(raw: string | null): unknown {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function futureVersion(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'version' in value && typeof value.version === 'number' && value.version > 1;
}
function storageOrBrowser(storage?: SaveStorage): SaveStorage { return storage ?? globalThis.localStorage; }

/** Reading does not write, remove, migrate or otherwise touch First Contact saves. */
export function loadExploration(storage?: SaveStorage): LoadedExploration {
  const initial = createExplorationState();
  try {
    const target = storageOrBrowser(storage);
    const raw = target.getItem(EXPLORATION_SAVE_KEY);
    const primary = parsed(raw);
    if (futureVersion(primary)) return {
      state: initial, canSave: false,
      notice: 'This practice save is from a newer build. It is preserved until you explicitly reset this practice space.',
    };
    if (isExplorationState(primary)) return { state: copyExplorationState(primary), canSave: true, notice: 'Your practice position and module are restored.' };
    const recovered = recoverExplorationState(primary);
    if (recovered) return { state: recovered, canSave: true, notice: 'Your saved position was unsafe. You are back at the room entrance; your practice module is preserved.' };
    const backup = parsed(target.getItem(EXPLORATION_BACKUP_KEY));
    const recoveredBackup = recoverExplorationState(backup);
    if (recoveredBackup) return { state: recoveredBackup, canSave: true, notice: 'The latest practice save could not be read. Your previous practice save is restored.' };
    return {
      state: initial, canSave: true,
      notice: raw ? 'The practice save could not be read. Starting at the room entrance; the unread save is preserved until you move or interact.' : '',
    };
  } catch {
    return { state: initial, canSave: true, notice: 'Browser storage could not be read. You can still explore for this visit.' };
  }
}

/** Back up valid progress before replacing it; failed writes never report a durable save. */
export function saveExploration(state: ExplorationState, storage?: SaveStorage, options: ExplorationSaveOptions = {}): string {
  if (!isExplorationState(state)) return 'This practice state is invalid and was not saved.';
  try {
    const target = storageOrBrowser(storage);
    const raw = target.getItem(EXPLORATION_SAVE_KEY);
    const previous = parsed(raw);
    if (futureVersion(previous) && !options.allowOverwriteUnsupported) return 'A practice save from a newer build is preserved. This visit will not replace it.';
    const serialized = JSON.stringify(copyExplorationState(state));
    if (raw === serialized) return 'Practice position and module saved on this device.';
    if (raw && (isExplorationState(previous) || recoverExplorationState(previous) || futureVersion(previous))) target.setItem(EXPLORATION_BACKUP_KEY, raw);
    target.setItem(EXPLORATION_SAVE_KEY, serialized);
    return 'Practice position and module saved on this device.';
  } catch {
    return 'Browser storage is unavailable or full. Practice progress lasts for this visit; the previous save is preserved.';
  }
}
