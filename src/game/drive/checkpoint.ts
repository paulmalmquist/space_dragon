import type { SaveStorage } from '../checkpoint.ts';
import { ROUTE } from './route.ts';
import { createDriveState, resetDrive } from './simulation.ts';
import type { DriveState } from './simulation.ts';

export const DRIVE_SAVE_KEY = 'space-dragon.drive.v1';
export const DRIVE_BACKUP_KEY = 'space-dragon.drive.v1.backup';
interface DriveSave { version: 1; routeId: string; checkpointId: string; visited: string[]; completed: boolean; assist: boolean; }
function parsed(raw: string | null): unknown { try { return raw ? JSON.parse(raw) : null; } catch { return null; } }
function future(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'version' in value && typeof value.version === 'number' && value.version > 1;
}
function valid(value: unknown): value is DriveSave {
  if (typeof value !== 'object' || value === null) return false;
  const save = value as Partial<DriveSave>;
  if (save.version !== 1 || save.routeId !== ROUTE.id || typeof save.assist !== 'boolean' || typeof save.completed !== 'boolean' ||
    !Array.isArray(save.visited) || save.visited.length < 1 || save.visited.length > ROUTE.checkpoints.length) return false;
  if (!save.visited.every((id, index) => id === ROUTE.checkpoints[index].id)) return false;
  return save.completed ? save.visited.length === ROUTE.checkpoints.length && save.checkpointId === 'home' : save.checkpointId === save.visited.at(-1);
}
function snapshot(state: DriveState): DriveSave {
  return { version: 1, routeId: ROUTE.id, checkpointId: state.checkpointId,
    visited: [...state.visited], completed: state.completed, assist: state.assist };
}
function restore(save: DriveSave): DriveState {
  return resetDrive({ ...createDriveState(save.assist), checkpointId: save.checkpointId,
    visited: [...save.visited], completed: save.completed });
}
export function loadDrive(storage?: SaveStorage): { state: DriveState; notice: string; canSave: boolean } {
  const initial = createDriveState();
  try {
    const target = storage ?? globalThis.localStorage;
    const raw = target.getItem(DRIVE_SAVE_KEY); const primary = parsed(raw);
    if (future(primary)) return { state: initial, canSave: false, notice: 'A newer drive save is preserved. This visit will not replace it.' };
    if (valid(primary)) return { state: restore(primary), canSave: true, notice: 'Drive checkpoint restored.' };
    const backup = parsed(target.getItem(DRIVE_BACKUP_KEY));
    if (valid(backup)) return { state: restore(backup), canSave: true, notice: 'Previous drive checkpoint restored; the latest save could not be read.' };
    return { state: initial, canSave: true, notice: raw ? 'Drive save could not be read. Original bytes are preserved until the next checkpoint.' : '' };
  } catch { return { state: initial, canSave: true, notice: 'Browser storage could not be read. You can drive for this visit.' }; }
}
export function saveDrive(state: DriveState, storage?: SaveStorage): string {
  const next = snapshot(state);
  if (!valid(next)) return 'Drive checkpoint is invalid and was not saved.';
  try {
    const target = storage ?? globalThis.localStorage;
    const raw = target.getItem(DRIVE_SAVE_KEY); const previous = parsed(raw);
    if (future(previous)) return 'A newer drive save is preserved. This visit will not replace it.';
    const serialized = JSON.stringify(next);
    if (raw === serialized) return 'Drive checkpoint saved on this device.';
    if (raw && valid(previous)) target.setItem(DRIVE_BACKUP_KEY, raw);
    target.setItem(DRIVE_SAVE_KEY, serialized);
    return 'Drive checkpoint saved on this device.';
  } catch { return 'Storage is unavailable or full. Progress lasts for this visit; the previous checkpoint is preserved.'; }
}
