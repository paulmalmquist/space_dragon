import { copyGameState, createInitialState, isGameState, nextAction, SUIT_ORDER, transition } from './state.ts';
import type { GameState } from './state.ts';

export const SAVE_KEY = 'space-dragon.checkpoint.v2';
export const BACKUP_SAVE_KEY = 'space-dragon.checkpoint.v2.backup';
export const LEGACY_SAVE_KEY = 'space-dragon.checkpoint.v1';
export interface SaveStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; }
export interface LoadedCheckpoint { state: GameState; notice: string; canSave: boolean; }
export interface SaveOptions { allowOverwriteUnsupported?: boolean; }

function storageOrBrowser(storage?: SaveStorage): SaveStorage {
  return storage ?? globalThis.localStorage;
}

function parsed(raw: string | null): unknown {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function futureVersion(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'version' in value &&
    typeof value.version === 'number' && value.version > 2;
}

/** Conservative migration: old pod progress gets the new suit/scan sequence, never unseen rewards. */
export function migrateLegacyCheckpoint(value: unknown): GameState | null {
  if (typeof value !== 'object' || value === null || !('version' in value) || value.version !== 1 ||
      !('step' in value) || typeof value.step !== 'string' || !['computer', 'backyard', 'pod'].includes(value.step)) return null;
  let state = createInitialState();
  state = transition(state, nextAction(state));
  if (value.step !== 'computer') state = transition(state, nextAction(state));
  if (value.step === 'pod') state = transition(state, nextAction(state));
  return state;
}

/** PR #15 used the same v2 key with a different shape in its playable draft. */
function migrateDraftCheckpoint(value: unknown): GameState | null {
  if (typeof value !== 'object' || value === null) return null;
  const { version, step, demonstrated, scan, scanHelp } = value as Record<string, unknown>;
  if (version !== 2 || typeof demonstrated !== 'number' || !Number.isInteger(demonstrated) ||
      typeof scanHelp !== 'boolean') return null;

  const initial = createInitialState();
  const signal = transition(initial, nextAction(initial));
  const backyard = transition(signal, nextAction(signal));
  const firstSuit = transition(backyard, nextAction(backyard));
  const count = SUIT_ORDER.length;
  switch (step) {
    case 'computer':
    case 'backyard':
    case 'pod':
      if (demonstrated !== 0 || scan !== 'pending' || scanHelp) return null;
      return step === 'computer' ? initial : step === 'backyard' ? backyard : firstSuit;
    case 'suits':
      if (demonstrated < 0 || demonstrated >= count || scan !== 'pending' || scanHelp) return null;
      break;
    case 'scan':
      if (demonstrated !== count || scan !== 'pending') return null;
      break;
    case 'map':
      if (demonstrated !== count || scan !== (scanHelp ? 'assisted' : 'direct')) return null;
      break;
    default:
      return null;
  }

  let state = firstSuit;
  for (let i = 0; i < demonstrated; i++) state = transition(state, nextAction(state));
  if (scanHelp) state = transition(state, { type: 'help', from: 'scan' });
  if (step !== 'map') return state;
  const archive = transition(state, nextAction(state));
  return transition(archive, nextAction(archive));
}

/** Reading never writes or removes a save, including during migration/recovery. */
export function loadCheckpoint(storage?: SaveStorage): LoadedCheckpoint {
  const initial = createInitialState();
  try {
    const target = storageOrBrowser(storage);
    const raw = target.getItem(SAVE_KEY);
    const primary = parsed(raw);
    if (futureVersion(primary)) return {
      state: initial, canSave: false,
      notice: 'This checkpoint is from a newer build. It is preserved; start again explicitly to replace it, or use the newer build.',
    };
    if (isGameState(primary)) return { state: copyGameState(primary), notice: 'Your checkpoint is restored.', canSave: true };
    const draft = migrateDraftCheckpoint(primary);
    if (draft) return { state: draft, notice: 'Your First Contact preview checkpoint is restored.', canSave: true };
    const backup = parsed(target.getItem(BACKUP_SAVE_KEY));
    const recovered = isGameState(backup) ? copyGameState(backup) : migrateDraftCheckpoint(backup);
    if (recovered) return { state: recovered, notice: 'The latest checkpoint could not be read. Your previous checkpoint is restored.', canSave: true };
    const legacyRaw = target.getItem(LEGACY_SAVE_KEY);
    const migrated = migrateLegacyCheckpoint(parsed(legacyRaw));
    if (migrated) return {
      state: migrated, canSave: true,
      notice: 'Your earlier checkpoint is upgraded for First Contact. New suit and scan moments are ready; the original save is preserved.',
    };
    return {
      state: initial, canSave: true,
      notice: raw || legacyRaw ? 'The checkpoint could not be read. Starting First Contact again; the unread save is preserved until you make progress.' : '',
    };
  } catch {
    return { state: initial, canSave: true, notice: 'Browser storage could not be read. You can still play for this visit.' };
  }
}

/** Save previous valid progress first. A failed/blocked write never reports success. */
export function saveCheckpoint(state: GameState, storage?: SaveStorage, options: SaveOptions = {}): string {
  if (!isGameState(state)) return 'This checkpoint is invalid and was not saved.';
  try {
    const target = storageOrBrowser(storage);
    const raw = target.getItem(SAVE_KEY);
    const previous = parsed(raw);
    if (futureVersion(previous) && !options.allowOverwriteUnsupported) {
      return 'A checkpoint from a newer build is preserved. This visit will not replace it; choose Start again to begin a new save.';
    }
    const serialized = JSON.stringify(copyGameState(state));
    if (raw === serialized) return 'Checkpoint saved on this device.';
    // Corrupt input must not replace a usable backup. Deliberately replacing a future
    // save or migrating a preview keeps the original bytes as a recovery copy.
    if (raw && (isGameState(previous) || futureVersion(previous) || migrateDraftCheckpoint(previous))) {
      target.setItem(BACKUP_SAVE_KEY, raw);
    }
    target.setItem(SAVE_KEY, serialized);
    return 'Checkpoint saved on this device.';
  } catch {
    return 'Browser storage is unavailable or full. Progress will last for this visit; the previous saved checkpoint is preserved.';
  }
}
