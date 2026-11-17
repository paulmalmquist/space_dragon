import type { Anchor, ClimbSurface, Recovery, Solid, TraversalWorld } from '../traversal/world.ts';

/**
 * Luke's Arena: a fictional training yard for trying Luke's abilities and stealth. It is a
 * lab, not a story mission or a real place. One world holds three trials side by side:
 * an ability course (west), a battle ring (centre) and a stealth yard (east).
 * Collision, drawing and the Unity export all read these same specs.
 */
export type TrialId = 'course' | 'ring' | 'stealth';
export type RobotKind = 'iguana' | 'drone' | 'mower' | 'sentry';

export interface Zone { id: TrialId; minX: number; maxX: number; minZ: number; maxZ: number; }
export interface Waypoint { x: number; z: number; wait: number; }
export interface RobotSpec {
  id: string;
  kind: RobotKind;
  trial: TrialId;
  /** Battle ring wave, starting at 1. Zero means always present in its trial. */
  wave: number;
  x: number; z: number; yaw: number;
  patrol: readonly Waypoint[];
  /** Sentry only: the gaze swings between these headings (radians) at `sweepRate`. */
  sweepFrom: number; sweepTo: number; sweepRate: number;
}
export interface Pickup { id: string; trial: TrialId; x: number; y: number; z: number; }
export interface HideSpot { id: string; x: number; z: number; yaw: number; }
export interface BlockSpec { id: string; minX: number; maxX: number; minZ: number; maxZ: number; top: number; look: 'tower' | 'crate' | 'wall' | 'pillar'; }
export interface SidekickWait { trial: TrialId; x: number; z: number; yaw: number; }
/**
 * The mission sidekick: mostly on his own, with one button to ask for help. He keeps to the
 * ground. In a trial listed under `waits` he stays at that spot outside its floor instead of
 * following Luke in.
 */
export interface SidekickSpec { id: string; x: number; z: number; yaw: number; waits: readonly SidekickWait[]; }

const block = (id: string, minX: number, maxX: number, minZ: number, maxZ: number, top: number, look: BlockSpec['look']): BlockSpec =>
  Object.freeze({ id, minX, maxX, minZ, maxZ, top, look });

/** Everything solid in the yard. Tops are flat; nothing here slopes. */
export const BLOCKS: readonly BlockSpec[] = Object.freeze([
  // Ability course.
  block('course-tower', -24, -20, -6, -2, 6, 'tower'),
  block('course-ledge', -24, -20, 6, 10, 6, 'tower'),
  block('chimney-west', -16, -14, 4, 8, 8, 'tower'),
  block('chimney-east', -11.8, -9.8, 4, 8, 8, 'tower'),
  block('course-crate', -28, -26, 13, 15, 1.5, 'crate'),
  // Battle ring.
  block('ring-pillar-west', -7, -5.6, 11, 12.4, 3.2, 'pillar'),
  block('ring-pillar-east', 5.6, 7, 11, 12.4, 3.2, 'pillar'),
  // Stealth yard.
  block('yard-catwalk', 12.2, 13.4, -2, 16, 4.4, 'wall'),
  block('yard-crate-1', 15, 17, -1, 0.2, 1.3, 'crate'),
  block('yard-crate-2', 20, 21.6, 3, 5, 1.3, 'crate'),
  block('yard-crate-3', 16, 18, 8, 9.4, 1.3, 'crate'),
  block('yard-crate-4', 23, 25, 10, 11.4, 1.3, 'crate'),
]);

const climb = (id: string, axis: 'x' | 'z', at: number, facing: 1 | -1, min: number, max: number, maxY: number): ClimbSurface =>
  Object.freeze({ id, axis, at, facing, min, max, minY: 0, maxY });

/** Marked faces. Spider Climb works on these and nowhere else. */
export const CLIMBS: readonly ClimbSurface[] = Object.freeze([
  climb('course-tower-east', 'x', -20, 1, -6, -2, 6),
  climb('chimney-west-face', 'x', -14, 1, 4, 8, 8),
  climb('chimney-east-face', 'x', -11.8, -1, 4, 8, 8),
  climb('ring-pillar-west-south', 'z', 11, -1, -7, -5.6, 3.2),
  climb('ring-pillar-east-south', 'z', 11, -1, 5.6, 7, 3.2),
  climb('yard-catwalk-east', 'x', 13.4, 1, -2, 1.4, 4.4),
]);

const anchor = (id: string, x: number, y: number, z: number, floor: number, perch: boolean): Anchor => Object.freeze({ id, x, y, z, floor, perch });
export const ANCHORS: readonly Anchor[] = Object.freeze([
  // A zip from the tower top to the ledge across the gap.
  anchor('course-perch', -22, 12, 8, 6, true),
  // Over the middle of the ring: a way to swing clear of a charge.
  anchor('ring-anchor', 0, 9.5, 6, 0, false),
  // From the catwalk, a swing that passes behind the floodlight to the vault.
  anchor('yard-anchor', 20.5, 12, 16.6, 0, false),
]);

/** Each trial's floor runs to the arena's outer walls, so the only way out is toward the hub. */
export const ZONES: readonly Zone[] = Object.freeze([
  Object.freeze({ id: 'course', minX: -32, maxX: -8.6, minZ: -10, maxZ: 24 }),
  Object.freeze({ id: 'ring', minX: -8.4, maxX: 8.4, minZ: -3, maxZ: 24 }),
  Object.freeze({ id: 'stealth', minX: 11.4, maxX: 32, minZ: -8, maxZ: 24 }),
] as const);

const robot = (id: string, kind: RobotKind, trial: TrialId, wave: number, x: number, z: number, yaw: number, patrol: [number, number, number][] = [], sweep: [number, number, number] = [0, 0, 0]): RobotSpec =>
  Object.freeze({ id, kind, trial, wave, x, z, yaw, patrol: Object.freeze(patrol.map(([px, pz, wait]) => Object.freeze({ x: px, z: pz, wait }))),
    sweepFrom: sweep[0], sweepTo: sweep[1], sweepRate: sweep[2] });

export const ROBOTS: readonly RobotSpec[] = Object.freeze([
  // Ring wave 1: two robo-iguanas.
  robot('ring-iguana-a', 'iguana', 'ring', 1, -4, 10, Math.PI),
  robot('ring-iguana-b', 'iguana', 'ring', 1, 4, 10, Math.PI),
  // Wave 2: three mosquito drones and an iguana underneath them.
  robot('ring-drone-a', 'drone', 'ring', 2, -5, 12, Math.PI),
  robot('ring-drone-b', 'drone', 'ring', 2, 0, 14, Math.PI),
  robot('ring-drone-c', 'drone', 'ring', 2, 5, 12, Math.PI),
  robot('ring-iguana-c', 'iguana', 'ring', 2, 0, 9, Math.PI),
  // Wave 3: a mow-bot with two iguanas and a drone.
  robot('ring-mower', 'mower', 'ring', 3, 0, 13, Math.PI),
  robot('ring-iguana-d', 'iguana', 'ring', 3, -5, 8, Math.PI),
  robot('ring-iguana-e', 'iguana', 'ring', 3, 5, 8, Math.PI),
  robot('ring-drone-d', 'drone', 'ring', 3, 0, 5, Math.PI),
  // Stealth yard: two patrols and a floodlight watching the open ground before the vault.
  robot('yard-guard-a', 'iguana', 'stealth', 0, 18.5, 1.6, Math.PI / 2, [[26.5, 1.6, 1.6], [18.5, 1.6, 1.6]]),
  robot('yard-guard-b', 'iguana', 'stealth', 0, 19, 12.5, Math.PI, [[19, 6.5, 1.2], [22.4, 7.4, 0.6], [22.4, 13, 1.2], [19, 12.5, 0.6]]),
  robot('yard-floodlight', 'sentry', 'stealth', 0, 26.5, 13, Math.PI, [], [Math.PI - 0.95, Math.PI + 0.75, 0.5]),
]);

export const PICKUPS: readonly Pickup[] = Object.freeze([
  Object.freeze({ id: 'course-1', trial: 'course', x: -19.4, y: 3.2, z: -4 }),
  Object.freeze({ id: 'course-2', trial: 'course', x: -22, y: 7.2, z: -4 }),
  Object.freeze({ id: 'course-3', trial: 'course', x: -22, y: 7.2, z: 8 }),
  Object.freeze({ id: 'course-4', trial: 'course', x: -10.8, y: 9.2, z: 6 }),
  Object.freeze({ id: 'course-5', trial: 'course', x: -27, y: 2.7, z: 14 }),
  Object.freeze({ id: 'vault', trial: 'stealth', x: 27.4, y: 1.2, z: 17.4 }),
] as const);

/** Where the floodlight sets Luke back down after catching him: always somewhere out of sight. */
export const HIDE_SPOTS: readonly HideSpot[] = Object.freeze([
  Object.freeze({ id: 'yard-gate', x: 14.4, z: -5.6, yaw: 0 }),
  Object.freeze({ id: 'behind-crate-3', x: 17, z: 10.2, yaw: 0 }),
  Object.freeze({ id: 'behind-crate-4', x: 24, z: 9.2, yaw: 0 }),
]);

/**
 * Dad, as a placeholder figure. He starts beside Luke and follows him through the hub, the
 * course and the ring. Stealth is Luke's own test, so there he keeps watch at the gate.
 */
export const SIDEKICK: SidekickSpec = Object.freeze({
  id: 'dad', x: -1.7, z: -19.4, yaw: 0,
  waits: Object.freeze([Object.freeze({ trial: 'stealth', x: 14.4, z: -9.7, yaw: 0 })] as const),
});

const BOUNDS = Object.freeze({ minX: -32, maxX: 32, minZ: -24, maxZ: 24 });
const SPAWN = Object.freeze({ x: 0, z: -18, yaw: 0 });
const RECOVERIES: readonly Recovery[] = Object.freeze([Object.freeze({ id: 'hub', x: SPAWN.x, y: 0, z: SPAWN.z, yaw: SPAWN.yaw })]);

export const LUKE_ARENA: TraversalWorld = Object.freeze({
  id: 'luke-arena-v001',
  bounds: BOUNDS,
  solids: Object.freeze(BLOCKS.map(spec => Object.freeze({ id: spec.id, kind: 'block', minX: spec.minX, maxX: spec.maxX, minZ: spec.minZ, maxZ: spec.maxZ, minY: 0, maxY: spec.top } as Solid))),
  anchors: ANCHORS,
  water: Object.freeze([]),
  sparks: Object.freeze([]),
  recoveries: RECOVERIES,
  spawn: SPAWN,
  climbs: CLIMBS,
});

export function zoneAt(x: number, z: number): TrialId | '' {
  for (const zone of ZONES) if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ) return zone.id;
  return '';
}
export function zoneOf(trial: TrialId): Zone {
  for (const zone of ZONES) if (zone.id === trial) return zone;
  throw new Error(`Unknown trial ${trial}`);
}
export const RING_WAVES = ROBOTS.reduce((most, spec) => Math.max(most, spec.trial === 'ring' ? spec.wave : 0), 0);
