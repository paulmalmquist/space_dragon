/**
 * Practice-space exploration state: a safe saved pose, nearby interactions and one-time
 * practice pickups. Movement lives in the pure traversal core; story progression stays in state.ts.
 */
import { HOME_BLOCK } from './traversal/home-block.ts';
import { TUNING } from './traversal/tuning.ts';
import { isStandable, supportAt } from './traversal/world.ts';
import type { TraversalWorld } from './traversal/world.ts';
import type { HeroState } from './traversal/hero.ts';

export interface PlayerPosition { x: number; z: number; yaw: number; }
export const PLAYER_RADIUS = TUNING.radius;
export const DEFAULT_SPAWN: Readonly<PlayerPosition> = Object.freeze({ ...HOME_BLOCK.spawn });
export const EXPLORATION_VERSION = 2;
export const SPARK_RADIUS = 1.5;
/** Hero centre above the feet, used for spark pickups. */
export const HERO_CENTER = 0.9;

export type InteractionId = 'computer' | 'pod' | 'training-module';
export type CollectibleId = string;
export interface InteractionTarget {
  id: InteractionId; label: string; prompt: string;
  x: number; z: number; radius: number; approachMaxZ?: number;
}
export const INTERACTION_TARGETS: readonly InteractionTarget[] = Object.freeze([
  Object.freeze({ id: 'computer', label: 'Living-room computer', prompt: 'Replay the signal', x: -4, z: 1, radius: 1.8, approachMaxZ: 0.3 } as const),
  Object.freeze({ id: 'pod', label: 'Backyard pod', prompt: 'Open the pod', x: 3.5, z: 0, radius: 2 } as const),
  Object.freeze({ id: 'training-module', label: 'Practice module', prompt: 'Pick up the practice module', x: 6, z: -2.8, radius: 1.2 } as const),
]);

export const SPARK_IDS: readonly string[] = Object.freeze(HOME_BLOCK.sparks.map(spark => spark.id));
/** Canonical order keeps saves byte-stable whatever order things were found in. */
export const COLLECTIBLE_ORDER: readonly string[] = Object.freeze(['training-module', ...SPARK_IDS]);

export interface ExplorationState { version: 2; player: PlayerPosition; collected: CollectibleId[]; }
export interface InteractionResult {
  state: ExplorationState;
  status: 'success' | 'already-collected' | 'out-of-range' | 'unknown-target';
  notice: string;
}

function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function validPosition(value: unknown): value is PlayerPosition {
  return typeof value === 'object' && value !== null && 'x' in value && 'z' in value && 'yaw' in value &&
    finite(value.x) && finite(value.z) && finite(value.yaw);
}

/** Known items only, each once, in canonical order. Holes, coercions and inventions are rejected. */
function validCollected(value: unknown, allowed: readonly string[] = COLLECTIBLE_ORDER): value is CollectibleId[] {
  if (!Array.isArray(value)) return false;
  let last = -1;
  for (let index = 0; index < value.length; index++) {
    if (!Object.hasOwn(value, index) || typeof value[index] !== 'string') return false;
    const order = allowed.indexOf(value[index]);
    if (order <= last) return false;
    last = order;
  }
  return true;
}

/** A safe place to stand at ground level: dry, in bounds and clear of walls, furniture and props. */
export function isWalkablePosition(position: Pick<PlayerPosition, 'x' | 'z'>, world: TraversalWorld = HOME_BLOCK): boolean {
  return isStandable(world, position.x, position.z, TUNING.radius, TUNING.stepHeight, TUNING.height, TUNING.placeReach);
}

/** The pose worth saving for a hero, or null while airborne, on a roof or anywhere unsafe to restore. */
export function savablePose(hero: HeroState, world: TraversalWorld = HOME_BLOCK): PlayerPosition | null {
  if (hero.mode !== 'ground' || !isWalkablePosition(hero, world)) return null;
  const footing = supportAt(world, hero.x, hero.z, 0, TUNING.placeReach).height;
  if (Math.abs(hero.y - footing) > 0.02) return null;
  return { x: hero.x, z: hero.z, yaw: hero.yaw };
}

export function createExplorationState(): ExplorationState {
  return { version: 2, player: { ...DEFAULT_SPAWN }, collected: [] };
}

export function copyExplorationState(state: ExplorationState): ExplorationState {
  return { version: 2, player: { x: state.player.x, z: state.player.z, yaw: state.player.yaw }, collected: [...state.collected] };
}

/** Schema validation includes a safe spawn, not only JSON field types. */
export function isExplorationState(value: unknown): value is ExplorationState {
  return typeof value === 'object' && value !== null && 'version' in value && value.version === EXPLORATION_VERSION &&
    'player' in value && validPosition(value.player) && isWalkablePosition(value.player) &&
    'collected' in value && validCollected(value.collected);
}

/**
 * Version 1 saves held the same pose and at most the practice module. Upgrade them
 * in memory; the stored bytes are only replaced by a later successful save.
 */
export function migrateExplorationState(value: unknown): ExplorationState | null {
  if (typeof value !== 'object' || value === null || !('version' in value) || value.version !== 1 ||
      !('player' in value) || !validPosition(value.player) || !isWalkablePosition(value.player) ||
      !('collected' in value) || !validCollected(value.collected, ['training-module'])) return null;
  return { version: 2, player: { x: value.player.x, z: value.player.z, yaw: value.player.yaw }, collected: [...value.collected] };
}

/** Preserve valid inventory when a changed/corrupt saved pose needs a safe spawn. */
export function recoverExplorationState(value: unknown): ExplorationState | null {
  if (typeof value !== 'object' || value === null || !('version' in value) || !('player' in value) || !('collected' in value)) return null;
  const allowed = value.version === 1 ? ['training-module'] : value.version === EXPLORATION_VERSION ? COLLECTIBLE_ORDER : null;
  if (!allowed || !validCollected(value.collected, allowed)) return null;
  if (isExplorationState(value)) return copyExplorationState(value);
  const migrated = migrateExplorationState(value);
  if (migrated) return migrated;
  return { version: 2, player: { ...DEFAULT_SPAWN }, collected: [...value.collected] };
}

function withinReach(state: ExplorationState, target: InteractionTarget): boolean {
  return isWalkablePosition(state.player) && Math.hypot(state.player.x - target.x, state.player.z - target.z) <= target.radius &&
    (target.approachMaxZ === undefined || state.player.z <= target.approachMaxZ);
}

/** Array order breaks equal-distance ties consistently; collected modules disappear as candidates. */
export function nearestInteraction(state: ExplorationState): InteractionTarget | null {
  let nearest: InteractionTarget | null = null;
  let distance = Infinity;
  for (const target of INTERACTION_TARGETS) {
    if (target.id === 'training-module' && state.collected.includes(target.id)) continue;
    const nextDistance = Math.hypot(state.player.x - target.x, state.player.z - target.z);
    if (withinReach(state, target) && nextDistance < distance) { nearest = target; distance = nextDistance; }
  }
  return nearest;
}

function withCollected(state: ExplorationState, id: CollectibleId): ExplorationState {
  const collected = COLLECTIBLE_ORDER.filter(candidate => candidate === id || state.collected.includes(candidate));
  return { ...state, collected };
}

/** Validate semantic actions at the authoritative state boundary, never at animation completion. */
export function interact(state: ExplorationState, targetId: string): InteractionResult {
  const target = INTERACTION_TARGETS.find((candidate) => candidate.id === targetId);
  if (!target) return { state, status: 'unknown-target', notice: 'That object is not available in this practice space.' };
  if (!withinReach(state, target)) return { state, status: 'out-of-range', notice: 'Move a little closer to use this object.' };
  if (target.id === 'training-module') {
    if (state.collected.includes(target.id)) return { state, status: 'already-collected', notice: 'You already have this practice module.' };
    return {
      state: withCollected(state, target.id), status: 'success',
      notice: 'Practice module collected! This tests picking up and saving an object; it is not a story dragon part.',
    };
  }
  return { state, status: 'success', notice: target.id === 'computer' ? 'The computer replays the interrupted signal.' : 'The practice pod opens. The story checkpoint is unchanged.' };
}

/**
 * Award every uncollected practice spark the hero's centre touches. Idempotent: a spark
 * already held is never awarded again, and the same state object returns when nothing changes.
 */
export function collectSparks(state: ExplorationState, hero: Pick<HeroState, 'x' | 'y' | 'z'>, world: TraversalWorld = HOME_BLOCK): ExplorationState {
  let next = state;
  for (const spark of world.sparks) {
    if (next.collected.includes(spark.id)) continue;
    const dx = spark.x - hero.x;
    const dy = spark.y - (hero.y + HERO_CENTER);
    const dz = spark.z - hero.z;
    if (dx * dx + dy * dy + dz * dz <= SPARK_RADIUS * SPARK_RADIUS) next = withCollected(next, spark.id);
  }
  return next;
}

export function sparkCount(state: ExplorationState): number {
  return state.collected.filter(id => SPARK_IDS.includes(id)).length;
}
