/** Small, deterministic navigation sandbox. Story progression remains in state.ts. */
export interface PlayerPosition { x: number; z: number; yaw: number; }
export interface Point3 { x: number; y: number; z: number; }
export interface MovementInput { forward: number; right: number; paused?: boolean; }
export interface Collider {
  id: string;
  minX: number; maxX: number; minZ: number; maxZ: number;
  minY: number; maxY: number;
}
export const PLAYER_RADIUS = 0.28;
export const MOVE_SPEED = 3.2;
export const MAX_FRAME_SECONDS = 0.05;
export const DEFAULT_SPAWN: Readonly<PlayerPosition> = Object.freeze({ x: -2, z: -1.5, yaw: 0 });
export const WORLD_BOUNDS = Object.freeze({ minX: -7.5, maxX: 10, minZ: -5.2, maxZ: 5.2 });

/** These dimensions also drive scene geometry and camera occlusion proxies. */
export const WORLD_COLLIDERS: readonly Collider[] = Object.freeze([
  { id: 'house-west', minX: -7.6, maxX: -7.4, minZ: -3.1, maxZ: 3.1, minY: 0, maxY: 3.5 },
  { id: 'house-north', minX: -7.6, maxX: -0.4, minZ: 2.9, maxZ: 3.1, minY: 0, maxY: 3.5 },
  { id: 'house-south', minX: -7.6, maxX: -0.4, minZ: -3.1, maxZ: -2.9, minY: 0, maxY: 3.5 },
  { id: 'house-east-north', minX: -0.6, maxX: -0.4, minZ: 1, maxZ: 3.1, minY: 0, maxY: 3.5 },
  { id: 'house-east-south', minX: -0.6, maxX: -0.4, minZ: -3.1, maxZ: -1, minY: 0, maxY: 3.5 },
  { id: 'yard-north', minX: -0.6, maxX: 10.1, minZ: 5.1, maxZ: 5.3, minY: 0, maxY: 1.4 },
  { id: 'yard-south', minX: -0.6, maxX: 10.1, minZ: -5.3, maxZ: -5.1, minY: 0, maxY: 1.4 },
  { id: 'yard-east', minX: 9.9, maxX: 10.1, minZ: -5.3, maxZ: 5.3, minY: 0, maxY: 1.4 },
  { id: 'yard-west-north', minX: -0.6, maxX: -0.4, minZ: 3.1, maxZ: 5.3, minY: 0, maxY: 1.4 },
  { id: 'yard-west-south', minX: -0.6, maxX: -0.4, minZ: -5.3, maxZ: -3.1, minY: 0, maxY: 1.4 },
  { id: 'computer-desk', minX: -5.3, maxX: -2.7, minZ: 0.45, maxZ: 1.55, minY: 0, maxY: 1.2 },
  { id: 'sofa', minX: -6, maxX: -3.2, minZ: -2.35, maxZ: -1.25, minY: 0, maxY: 1.1 },
  { id: 'pod', minX: 2.65, maxX: 4.35, minZ: -0.85, maxZ: 0.85, minY: 0, maxY: 2.2 },
].map((collider) => Object.freeze(collider)));

export type InteractionId = 'computer' | 'pod' | 'training-module';
export type CollectibleId = 'training-module';
export interface InteractionTarget {
  id: InteractionId; label: string; prompt: string;
  x: number; z: number; radius: number; approachMaxZ?: number;
}
export const INTERACTION_TARGETS: readonly InteractionTarget[] = Object.freeze([
  Object.freeze({ id: 'computer', label: 'Living-room computer', prompt: 'Replay the signal', x: -4, z: 1, radius: 1.8, approachMaxZ: 0.3 } as const),
  Object.freeze({ id: 'pod', label: 'Backyard pod', prompt: 'Open the pod', x: 3.5, z: 0, radius: 2 } as const),
  Object.freeze({ id: 'training-module', label: 'Practice module', prompt: 'Pick up the practice module', x: 6, z: -2.8, radius: 1.2 } as const),
]);

export interface ExplorationState { version: 1; player: PlayerPosition; collected: CollectibleId[]; }
export interface InteractionResult {
  state: ExplorationState;
  status: 'success' | 'already-collected' | 'out-of-range' | 'unknown-target';
  notice: string;
}

function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function clamp(value: number, low: number, high: number): number { return Math.max(low, Math.min(high, value)); }
function validPosition(value: unknown): value is PlayerPosition {
  return typeof value === 'object' && value !== null && 'x' in value && 'z' in value && 'yaw' in value &&
    finite(value.x) && finite(value.z) && finite(value.yaw);
}

/** Circle footprint against solid rectangles; tangency is allowed for smooth wall sliding. */
export function isWalkablePosition(position: Pick<PlayerPosition, 'x' | 'z'>, colliders: readonly Collider[] = WORLD_COLLIDERS): boolean {
  const { x, z } = position;
  if (!finite(x) || !finite(z) || x < WORLD_BOUNDS.minX + PLAYER_RADIUS || x > WORLD_BOUNDS.maxX - PLAYER_RADIUS ||
      z < WORLD_BOUNDS.minZ + PLAYER_RADIUS || z > WORLD_BOUNDS.maxZ - PLAYER_RADIUS) return false;
  if (x < -0.5 && (z < -3 || z > 3)) return false;
  return colliders.every((box) => {
    const dx = x - clamp(x, box.minX, box.maxX);
    const dz = z - clamp(z, box.minZ, box.maxZ);
    return dx * dx + dz * dz >= PLAYER_RADIUS * PLAYER_RADIUS - 1e-10;
  });
}

/** Camera-relative movement: yaw 0 faces +z, right is +x. No Babylon or DOM dependency. */
export function movePlayer(
  position: PlayerPosition, input: MovementInput, cameraYaw: number, deltaSeconds: number,
  colliders: readonly Collider[] = WORLD_COLLIDERS,
): PlayerPosition {
  if (!validPosition(position) || !isWalkablePosition(position, colliders)) return { ...DEFAULT_SPAWN };
  if (input.paused || !finite(deltaSeconds) || deltaSeconds <= 0 || !finite(cameraYaw)) return position;
  let forward = finite(input.forward) ? clamp(input.forward, -1, 1) : 0;
  let right = finite(input.right) ? clamp(input.right, -1, 1) : 0;
  const magnitude = Math.hypot(forward, right);
  if (!magnitude) return position;
  if (magnitude > 1) { forward /= magnitude; right /= magnitude; }
  const distance = MOVE_SPEED * Math.min(deltaSeconds, MAX_FRAME_SECONDS);
  const dx = (Math.sin(cameraYaw) * forward + Math.cos(cameraYaw) * right) * distance;
  const dz = (Math.cos(cameraYaw) * forward - Math.sin(cameraYaw) * right) * distance;
  // A step shorter than the radius cannot jump through a thin wall, even after tab suspension.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (PLAYER_RADIUS / 4)));
  let x = position.x;
  let z = position.z;
  for (let step = 0; step < steps; step++) {
    if (isWalkablePosition({ x: x + dx / steps, z }, colliders)) x += dx / steps;
    if (isWalkablePosition({ x, z: z + dz / steps }, colliders)) z += dz / steps;
  }
  if (x === position.x && z === position.z) return position;
  return { x, z, yaw: Math.atan2(dx, dz) };
}

export function createExplorationState(): ExplorationState {
  return { version: 1, player: { ...DEFAULT_SPAWN }, collected: [] };
}

export function copyExplorationState(state: ExplorationState): ExplorationState {
  return { version: 1, player: { x: state.player.x, z: state.player.z, yaw: state.player.yaw }, collected: [...state.collected] };
}

/** Schema validation includes a safe spawn, not only JSON field types. */
export function isExplorationState(value: unknown): value is ExplorationState {
  if (typeof value !== 'object' || value === null || !('version' in value) || value.version !== 1 ||
      !('player' in value) || !validPosition(value.player) || !isWalkablePosition(value.player) ||
      !('collected' in value) || !Array.isArray(value.collected)) return false;
  return value.collected.length === 0 || (value.collected.length === 1 && value.collected[0] === 'training-module');
}

/** Preserve valid inventory when a changed/corrupt saved pose needs a safe spawn. */
export function recoverExplorationState(value: unknown): ExplorationState | null {
  if (typeof value !== 'object' || value === null || !('version' in value) || value.version !== 1 ||
      !('player' in value) || !('collected' in value) || !Array.isArray(value.collected) ||
      (value.collected.length !== 0 && (value.collected.length !== 1 || value.collected[0] !== 'training-module'))) return null;
  if (isExplorationState(value)) return copyExplorationState(value);
  return { version: 1, player: { ...DEFAULT_SPAWN }, collected: [...value.collected] as CollectibleId[] };
}

export function moveExploration(state: ExplorationState, input: MovementInput, cameraYaw: number, deltaSeconds: number): ExplorationState {
  const player = movePlayer(state.player, input, cameraYaw, deltaSeconds);
  return player === state.player ? state : { ...state, player };
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

/** Validate semantic actions at the authoritative state boundary, never at animation completion. */
export function interact(state: ExplorationState, targetId: string): InteractionResult {
  const target = INTERACTION_TARGETS.find((candidate) => candidate.id === targetId);
  if (!target) return { state, status: 'unknown-target', notice: 'That object is not available in this practice space.' };
  if (!withinReach(state, target)) return { state, status: 'out-of-range', notice: 'Move a little closer to use this object.' };
  if (target.id === 'training-module') {
    if (state.collected.includes(target.id)) return { state, status: 'already-collected', notice: 'You already have this practice module.' };
    return {
      state: { ...state, collected: [...state.collected, target.id] }, status: 'success',
      notice: 'Practice module collected! This tests picking up and saving an object; it is not a story dragon part.',
    };
  }
  return { state, status: 'success', notice: target.id === 'computer' ? 'The computer replays the interrupted signal.' : 'The practice pod opens. The story checkpoint is unchanged.' };
}

/** Shorten a camera boom against height-aware proxies without changing player movement/state. */
export function clipCameraPosition(focus: Point3, desired: Point3, colliders: readonly Collider[] = WORLD_COLLIDERS, clearance = 0.15): Point3 {
  let nearest = 1;
  const padding = finite(clearance) ? Math.max(0, clearance) : 0.15;
  for (const box of colliders) {
    let enter = 0;
    let leave = 1;
    for (const [axis, min, max] of [
      ['x', box.minX - padding, box.maxX + padding],
      ['y', box.minY - padding, box.maxY + padding],
      ['z', box.minZ - padding, box.maxZ + padding],
    ] as const) {
      const delta = desired[axis] - focus[axis];
      if (Math.abs(delta) < 1e-10) {
        if (focus[axis] < min || focus[axis] > max) { enter = Infinity; break; }
      } else {
        const first = (min - focus[axis]) / delta;
        const second = (max - focus[axis]) / delta;
        enter = Math.max(enter, Math.min(first, second));
        leave = Math.min(leave, Math.max(first, second));
      }
    }
    if (enter <= leave && enter >= 0 && enter <= nearest) nearest = Math.max(0, enter - 0.01);
  }
  return {
    x: focus.x + (desired.x - focus.x) * nearest,
    y: focus.y + (desired.y - focus.y) * nearest,
    z: focus.z + (desired.z - focus.z) * nearest,
  };
}
