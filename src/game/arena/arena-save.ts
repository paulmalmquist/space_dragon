import type { SaveStorage } from '../checkpoint.ts';
import { ARENA_LAYOUT, emptyProgress, isArenaProgress, mergeProgress } from './arena.ts';
import type { ArenaLayout, ArenaProgress } from './arena.ts';

// The arena keeps its own small save: stars, practice sparks and counters. It never touches
// First Contact, the practice space or the drive, and it holds nothing about a learner.
export const ARENA_SAVE_KEY = 'space-dragon.arena.v1';
export const ARENA_BACKUP_KEY = 'space-dragon.arena.v1.backup';
export const ARENA_SAVE_VERSION = 1;
interface ArenaSave { version: 1; arenaId: string; progress: ArenaProgress; }
export interface LoadedArena { progress: ArenaProgress; notice: string; canSave: boolean; }

function parsed(raw: string | null): unknown { try { return raw ? JSON.parse(raw) : null; } catch { return null; } }
function future(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'version' in value && typeof value.version === 'number' && value.version > ARENA_SAVE_VERSION;
}
function valid(layout: ArenaLayout, value: unknown): value is ArenaSave {
  if (typeof value !== 'object' || value === null) return false;
  const save = value as Partial<ArenaSave>;
  return save.version === ARENA_SAVE_VERSION && save.arenaId === layout.world.id && isArenaProgress(layout, save.progress);
}
const copy = (progress: ArenaProgress): ArenaProgress => ({ ...progress, course: [...progress.course] });

/** Reading never writes. A newer build's save is left alone and this visit will not replace it. */
export function loadArena(storage?: SaveStorage, layout: ArenaLayout = ARENA_LAYOUT): LoadedArena {
  const initial = emptyProgress();
  try {
    const target = storage ?? globalThis.localStorage;
    const raw = target.getItem(ARENA_SAVE_KEY);
    const primary = parsed(raw);
    if (future(primary)) return { progress: initial, canSave: false, notice: 'Arena stars from a newer build are preserved. This visit will not replace them.' };
    if (valid(layout, primary)) return { progress: copy(primary.progress), canSave: true, notice: 'Arena stars restored.' };
    const backup = parsed(target.getItem(ARENA_BACKUP_KEY));
    if (valid(layout, backup)) return { progress: copy(backup.progress), canSave: true, notice: 'The latest arena save could not be read. The previous one is restored.' };
    return { progress: initial, canSave: true, notice: raw ? 'The arena save could not be read. Its bytes are kept until a new star is earned.' : '' };
  } catch {
    return { progress: initial, canSave: true, notice: 'Browser storage could not be read. Stars last for this visit.' };
  }
}

/**
 * Saving merges with whatever is already stored, so a star earned in another tab or an earlier
 * visit is never taken away, and saving the same thing twice writes nothing.
 */
export function saveArena(progress: ArenaProgress, storage?: SaveStorage, layout: ArenaLayout = ARENA_LAYOUT): string {
  if (!isArenaProgress(layout, progress)) return 'This arena progress is invalid and was not saved.';
  try {
    const target = storage ?? globalThis.localStorage;
    const raw = target.getItem(ARENA_SAVE_KEY);
    const previous = parsed(raw);
    if (future(previous)) return 'Arena stars from a newer build are preserved. This visit will not replace them.';
    const stored = valid(layout, previous) ? previous.progress : null;
    const merged = stored ? mergeProgress(layout, stored, progress) : copy(progress);
    const next: ArenaSave = { version: ARENA_SAVE_VERSION, arenaId: layout.world.id, progress: merged };
    const serialized = JSON.stringify(next);
    if (raw === serialized) return 'Arena stars saved on this device.';
    if (raw && stored) target.setItem(ARENA_BACKUP_KEY, raw);
    target.setItem(ARENA_SAVE_KEY, serialized);
    return 'Arena stars saved on this device.';
  } catch {
    return 'Browser storage is unavailable or full. Stars last for this visit; the previous save is preserved.';
  }
}

/**
 * Start the stars over, on purpose. The earlier save is kept as the backup, and a save from
 * a newer build is still left alone.
 */
export function resetArena(storage?: SaveStorage, layout: ArenaLayout = ARENA_LAYOUT): string {
  try {
    const target = storage ?? globalThis.localStorage;
    const raw = target.getItem(ARENA_SAVE_KEY);
    const previous = parsed(raw);
    if (future(previous)) return 'Arena stars from a newer build are preserved. This visit will not replace them.';
    if (raw && valid(layout, previous)) target.setItem(ARENA_BACKUP_KEY, raw);
    const next: ArenaSave = { version: ARENA_SAVE_VERSION, arenaId: layout.world.id, progress: emptyProgress() };
    target.setItem(ARENA_SAVE_KEY, JSON.stringify(next));
    return 'Arena stars cleared on this device.';
  } catch {
    return 'Browser storage is unavailable. Nothing was cleared.';
  }
}
