import { createHero, HERO_EVENT, IDLE_INPUT, stepHero } from '../traversal/hero.ts';
import type { HeroState } from '../traversal/hero.ts';
import { TRAVERSAL_STEP, TUNING } from '../traversal/tuning.ts';
import { clamp, finite, pointInSolid } from '../traversal/world.ts';
import type { TraversalWorld } from '../traversal/world.ts';
import { HIDE_SPOTS, LUKE_ARENA, PICKUPS, RING_WAVES, ROBOTS, ZONES } from './arena-world.ts';
import type { HideSpot, Pickup, RobotKind, RobotSpec, TrialId, Zone } from './arena-world.ts';

/**
 * Luke's Arena rules: robots with sparks and telegraphed moves, Tether Snare, Spider Pounce,
 * suit energy, and stealth by sight cones, cover and height. Pure and fixed-step, like the
 * hero it wraps: no renderer, storage or clock. Nobody is hurt and nothing can be lost:
 * robots power down, Luke gets bonked or held for a moment, and every reward is kept.
 * A lab for trying abilities, not a story mission. Numbers are PROPOSED and tunable.
 */
export interface ArenaLayout {
  world: TraversalWorld;
  robots: readonly RobotSpec[];
  pickups: readonly Pickup[];
  zones: readonly Zone[];
  hides: readonly HideSpot[];
  waves: number;
}
export const ARENA_LAYOUT: ArenaLayout = Object.freeze({ world: LUKE_ARENA, robots: ROBOTS, pickups: PICKUPS, zones: ZONES, hides: HIDE_SPOTS, waves: RING_WAVES });

export const ARENA = Object.freeze({
  energyMax: 4,
  /** After a hit Luke cannot be hit again for this long. */
  mercy: 1.2,
  bonkSeconds: 1.6,
  holdSeconds: 1.4,
  snareRange: 7.5,
  snareSeconds: 4,
  snareCooldown: 1.3,
  snareBreak: 12,
  pounceRange: 8.5,
  pounceSpeed: 12,
  pounceMin: 0.28,
  pounceMax: 0.7,
  pounceArc: 1.3,
  pounceCooldown: 1.2,
  pounceBounce: 8.2,
  pouncePin: 1.3,
  /** Below this awareness a robot has not noticed Luke; if it also cannot see him, a pounce is a quiet takedown. */
  unaware: 0.4,
  /** Ground robots do not look up: feet this far above them are out of sight. */
  sightAbove: 1.9,
  feel: 1.1,
  awareNear: 2.4,
  awareFar: 0.6,
  awareDecay: 0.4,
  awareGrace: 0.5,
  curiousSeconds: 2.2,
  searchSeconds: 2.6,
  loseSightSeconds: 3,
  noiseRange: 6,
  sprintNoiseSpeed: 6,
  landNoiseImpact: 10,
  pickupRadius: 1.5,
  heroCentre: 0.9,
  hideRadius: 1.3,
  waveDelay: 1.6,
  knockback: 5.5,
  knockUp: 4.2,
  /** Each catch on one attempt keeps the floodlight dark a little longer, up to this many steps of help. */
  catchHelpSeconds: 1.5,
  catchHelpMax: 4,
  /** A whole lap of the course inside these times earns the second and third star. */
  courseSilver: 75,
  courseGold: 40,
  /** After a finished lap the practice sparks come back this much later. */
  lapRest: 2.5,
  /** A trial ends only after Luke has stayed outside its floor this long; a swing over the line does not count. */
  leaveSeconds: 0.6,
});

export interface RobotProfile {
  sparks: number; large: boolean; radius: number; height: number; eye: number; hover: number;
  walk: number; chase: number; turn: number; sight: number; cone: number; hear: number;
  attackRange: number; windup: number; strikeSpeed: number; strikeDistance: number; recover: number; hit: number;
}
/** Every telegraph lasts at least a second. Sight cones are half-angles in radians. */
export const ROBOT_PROFILES: Readonly<Record<RobotKind, RobotProfile>> = Object.freeze({
  iguana: Object.freeze({ sparks: 2, large: false, radius: 0.45, height: 0.7, eye: 0.5, hover: 0, walk: 1.5, chase: 3.1, turn: 4, sight: 9, cone: 0.61, hear: 6,
    attackRange: 1.9, windup: 1, strikeSpeed: 9, strikeDistance: 2.4, recover: 1.3, hit: 0.75 }),
  drone: Object.freeze({ sparks: 1, large: false, radius: 0.3, height: 0.4, eye: 0, hover: 2.6, walk: 2, chase: 4, turn: 5, sight: 8, cone: Math.PI, hear: 0,
    attackRange: 5.5, windup: 1.1, strikeSpeed: 10, strikeDistance: 8, recover: 1.6, hit: 0.7 }),
  mower: Object.freeze({ sparks: 2, large: true, radius: 0.7, height: 0.9, eye: 0.6, hover: 0, walk: 1.2, chase: 2, turn: 1.6, sight: 12, cone: 0.7, hear: 7,
    attackRange: 9, windup: 1.2, strikeSpeed: 9.5, strikeDistance: 11, recover: 2, hit: 1 }),
  // A floodlight on a post. It never moves or strikes: its gaze catches and holds.
  sentry: Object.freeze({ sparks: 2, large: false, radius: 0.4, height: 2.2, eye: 2, hover: 0, walk: 0, chase: 0, turn: 0, sight: 10, cone: 0.38, hear: 0,
    attackRange: 0, windup: 0, strikeSpeed: 0, strikeDistance: 0, recover: 2.6, hit: 0 }),
});

export type RobotMode = 'dormant' | 'patrol' | 'curious' | 'alert' | 'windup' | 'strike' | 'recover' | 'search' | 'resolved';

export interface RobotState {
  id: string;
  kind: RobotKind;
  x: number; y: number; z: number;
  yaw: number;
  sparks: number;
  mode: RobotMode;
  /** Seconds left in the current mode where the mode is timed. */
  timer: number;
  awareness: number;
  unseen: number;
  lastSeenX: number; lastSeenZ: number;
  patrolIndex: number;
  patrolWait: number;
  sweepDir: number;
  /** Seconds left held still by a snare or a pin; while positive the robot cannot act. */
  hold: number;
  /** True when the hold is a tether line rather than a pin. */
  tethered: boolean;
  strikeX: number; strikeY: number; strikeZ: number;
  travelled: number;
}

export const ARENA_EVENT = Object.freeze({
  snare: 1, pounce: 2, impact: 4, resolve: 8, quiet: 16, hit: 32, bonk: 64, revive: 128,
  caught: 256, release: 512, spotted: 1024, wave: 2048, pickup: 4096, trial: 8192, bounce: 16384, star: 32768,
});

/**
 * What a visit can add to, and never take away. Each trial has three stars: the first for
 * finishing, the others for finishing well. Nothing here records how a learner is doing.
 */
export interface ArenaProgress {
  /** Practice sparks collected at least once, in level order. */
  course: string[];
  /** One star for every spark, two for a whole lap inside the silver time, three inside the gold time. */
  courseStars: number;
  /** Fastest whole lap in seconds, or 0 before the first one. */
  courseBest: number;
  /** One star for clearing every wave, two without being bonked, three without being hit. */
  ringStars: number;
  /** Highest wave cleared. */
  ringBest: number;
  /** One star for reaching the vault, two without being caught, three without being noticed. */
  stealthStars: number;
  /** Quiet takedowns, counted for fun. */
  quiet: number;
}
export const STAR_MAX = 3;

export interface ArenaState {
  hero: HeroState;
  robots: RobotState[];
  energy: number;
  mercy: number;
  bonk: number;
  held: number;
  snareCooldown: number;
  pounceCooldown: number;
  actionHeld: boolean;
  pounceHeld: boolean;
  /** Robot Luke is leaping at, or an empty string. */
  pounceId: string;
  pounceTime: number;
  pounceDuration: number;
  pounceFromX: number; pounceFromY: number; pounceFromZ: number;
  pounceQuiet: boolean;
  /** Robot a tether line is drawn to, or an empty string. */
  snareId: string;
  /** Robot the next action would aim at, or an empty string. */
  targetId: string;
  /** True when a pounce on that robot right now would be a quiet takedown. */
  targetQuiet: boolean;
  trial: TrialId | '';
  /** Seconds Luke has been off the current trial's floor. */
  away: number;
  /** Practice sparks collected on this lap of the course, and the seconds since its first one. */
  lap: string[];
  lapTime: number;
  lapRest: number;
  wave: number;
  waveTimer: number;
  /** Hits and bonks taken since this run at the ring began. */
  ringHits: number;
  ringBonks: number;
  /** Whether anything in the stealth yard noticed Luke on this attempt. */
  seen: boolean;
  /** Times the floodlight has caught Luke on this attempt; each one buys a longer dark spell. */
  catches: number;
  vaultTaken: boolean;
  hideId: string;
  progress: ArenaProgress;
  events: number;
}

export interface ArenaInput {
  moveX: number; moveZ: number;
  jump: boolean; power: boolean;
  /** The one-button action: pounce when that would count, otherwise snare. */
  action: boolean;
  /** Always pounce. */
  pounce: boolean;
  /** Camera heading on the ground plane; guides which robot is targeted. Zero means use Luke's facing. */
  aimX: number; aimZ: number;
}
export const ARENA_IDLE: Readonly<ArenaInput> = Object.freeze({ moveX: 0, moveZ: 0, jump: false, power: false, action: false, pounce: false, aimX: 0, aimZ: 0 });

export function emptyProgress(): ArenaProgress {
  return { course: [], courseStars: 0, courseBest: 0, ringStars: 0, ringBest: 0, stealthStars: 0, quiet: 0 };
}

function freshRobot(spec: RobotSpec): RobotState {
  const profile = ROBOT_PROFILES[spec.kind];
  return {
    id: spec.id, kind: spec.kind, x: spec.x, y: profile.hover, z: spec.z, yaw: spec.yaw, sparks: profile.sparks,
    mode: spec.wave > 0 ? 'dormant' : 'patrol', timer: 0, awareness: 0, unseen: 0, lastSeenX: spec.x, lastSeenZ: spec.z,
    patrolIndex: 0, patrolWait: 0, sweepDir: 1, hold: 0, tethered: false, strikeX: 0, strikeY: 0, strikeZ: 1, travelled: 0,
  };
}

export function createArena(layout: ArenaLayout = ARENA_LAYOUT, progress: ArenaProgress = emptyProgress()): ArenaState {
  return {
    hero: createHero(layout.world), robots: layout.robots.map(freshRobot), energy: ARENA.energyMax, mercy: 0, bonk: 0, held: 0,
    snareCooldown: 0, pounceCooldown: 0, actionHeld: false, pounceHeld: false,
    pounceId: '', pounceTime: 0, pounceDuration: 0, pounceFromX: 0, pounceFromY: 0, pounceFromZ: 0, pounceQuiet: false,
    snareId: '', targetId: '', targetQuiet: false, trial: '', away: 0, lap: [], lapTime: 0, lapRest: 0, wave: 0, waveTimer: 0, ringHits: 0, ringBonks: 0, seen: false, catches: 0, vaultTaken: false, hideId: layout.hides[0]?.id ?? '',
    progress: { ...progress, course: [...progress.course] }, events: 0,
  };
}

const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const specOf = (layout: ArenaLayout, id: string): RobotSpec => layout.robots.find(spec => spec.id === id)!;
const zoneOfTrial = (layout: ArenaLayout, trial: TrialId): Zone => layout.zones.find(zone => zone.id === trial)!;
function trialAt(layout: ArenaLayout, x: number, z: number): TrialId | '' {
  for (const zone of layout.zones) if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ) return zone.id;
  return '';
}

/** True when nothing solid lies on the straight line between two points. */
export function sightLine(world: TraversalWorld, x: number, y: number, z: number, toX: number, toY: number, toZ: number): boolean {
  const dx = toX - x, dy = toY - y, dz = toZ - z;
  const samples = Math.max(2, Math.ceil(Math.sqrt(dx * dx + dy * dy + dz * dz) / 0.4));
  for (let index = 1; index < samples; index++) {
    const t = index / samples;
    for (const solid of world.solids) if (solid.kind !== 'trunk' && pointInSolid(solid, x + dx * t, y + dy * t, z + dz * t)) return false;
  }
  return true;
}

/**
 * Stealth in one rule: a robot sees Luke when he is inside its range and cone, not above
 * its line of sight, and no cover stands between them. Drones sense all round.
 */
export function canSee(world: TraversalWorld, robot: RobotState, hero: HeroState): boolean {
  const profile = ROBOT_PROFILES[robot.kind];
  const dx = hero.x - robot.x, dz = hero.z - robot.z;
  const flat = Math.sqrt(dx * dx + dz * dz);
  if (flat > profile.sight) return false;
  if (robot.kind !== 'drone') {
    if (hero.y - robot.y > ARENA.sightAbove) return false;
    // Close enough to bump into: noticed whichever way it faces.
    const felt = flat < ARENA.feel;
    if (!felt && flat > 1e-6 && (dx * Math.sin(robot.yaw) + dz * Math.cos(robot.yaw)) / flat < Math.cos(profile.cone)) return false;
  }
  return sightLine(world, robot.x, robot.y + profile.eye, robot.z, hero.x, hero.y + ARENA.heroCentre, hero.z);
}

/** A robot that a pounce finishes in the open: held still, or recovering from its own attack. */
export function isVulnerable(robot: RobotState): boolean {
  return robot.hold > 0 || robot.mode === 'recover';
}
/**
 * The stealth opening: the robot has not noticed Luke and cannot see him at this moment, so he
 * is behind it, above it or coming out of cover. A pounce now is a quiet takedown. Walking up
 * to its face and mashing the button is not.
 */
export function quietOpening(world: TraversalWorld, robot: RobotState, hero: HeroState): boolean {
  return robot.hold <= 0 && robot.awareness < ARENA.unaware && !canSee(world, robot, hero);
}
const inPlay = (robot: RobotState) => robot.mode !== 'dormant' && robot.mode !== 'resolved';

/** The robot an action would aim at: near, roughly ahead, in sight, with a bias toward easy finishes. */
export function pickTarget(layout: ArenaLayout, state: ArenaState, aimX = 0, aimZ = 0): string {
  const hero = state.hero;
  let dirX = aimX, dirZ = aimZ;
  const aim = Math.sqrt(dirX * dirX + dirZ * dirZ);
  if (aim > 1e-6) { dirX /= aim; dirZ /= aim; } else { dirX = Math.sin(hero.yaw); dirZ = Math.cos(hero.yaw); }
  let best = '';
  let bestScore = -Infinity;
  for (let index = 0; index < state.robots.length; index++) {
    const robot = state.robots[index];
    // Only the robots of the trial Luke is standing in are part of the game.
    if (!inPlay(robot) || layout.robots[index].trial !== state.trial) continue;
    const profile = ROBOT_PROFILES[robot.kind];
    const dx = robot.x - hero.x, dz = robot.z - hero.z, dy = robot.y + profile.height * 0.5 - (hero.y + ARENA.heroCentre);
    const flat = Math.sqrt(dx * dx + dz * dz);
    const distance = Math.sqrt(flat * flat + dy * dy);
    if (distance > ARENA.pounceRange) continue;
    const align = flat > 1e-6 ? (dx * dirX + dz * dirZ) / flat : 1;
    if (align < -0.25 && distance > 3) continue;
    if (!sightLine(layout.world, hero.x, hero.y + ARENA.heroCentre, hero.z, robot.x, robot.y + profile.height * 0.5, robot.z)) continue;
    const score = -distance - (1 - align) * 3 + (isVulnerable(robot) || quietOpening(layout.world, robot, hero) ? 1.5 : 0);
    if (score > bestScore) { bestScore = score; best = robot.id; }
  }
  return best;
}

export type ActionKind = 'none' | 'snare' | 'pounce' | 'quiet';
/** What the one-button action would do to a robot right now. The rules and the on-screen hint both ask here. */
export function actionFor(layout: ArenaLayout, state: ArenaState, robot: RobotState | undefined): ActionKind {
  if (!robot || state.bonk > 0 || state.held > 0 || state.pounceId || state.hero.mode === 'catch') return 'none';
  const hero = state.hero;
  const dx = robot.x - hero.x, dy = robot.y - hero.y, dz = robot.z - hero.z;
  const canPounce = state.pounceCooldown <= 0;
  const canSnare = state.snareCooldown <= 0 && robot.hold <= 0 && Math.sqrt(dx * dx + dy * dy + dz * dz) <= ARENA.snareRange;
  if (canPounce && quietOpening(layout.world, robot, hero)) return 'quiet';
  if (canPounce && isVulnerable(robot)) return 'pounce';
  return canSnare ? 'snare' : canPounce ? 'pounce' : 'none';
}

function resolve(state: ArenaState, robot: RobotState, quiet: boolean): void {
  robot.sparks = 0; robot.mode = 'resolved'; robot.hold = 0; robot.tethered = false; robot.awareness = 0;
  state.events |= ARENA_EVENT.resolve;
  if (quiet) { state.progress.quiet += 1; state.events |= ARENA_EVENT.quiet; }
  if (state.snareId === robot.id) state.snareId = '';
}

/** Something loud happened here: nearby robots that can hear turn to look. */
function noise(state: ArenaState, x: number, z: number): void {
  for (const robot of state.robots) {
    if (!inPlay(robot) || robot.hold > 0) continue;
    const hear = ROBOT_PROFILES[robot.kind].hear;
    const dx = x - robot.x, dz = z - robot.z;
    if (hear <= 0 || dx * dx + dz * dz > hear * hear) continue;
    robot.lastSeenX = x; robot.lastSeenZ = z;
    if (robot.awareness < 0.45) robot.awareness = 0.45;
    if (robot.mode === 'patrol' || robot.mode === 'search') { robot.mode = 'curious'; robot.timer = ARENA.curiousSeconds; }
  }
}

function markSeen(layout: ArenaLayout, state: ArenaState, robot: RobotState): void {
  state.events |= ARENA_EVENT.spotted;
  if (specOf(layout, robot.id).trial === 'stealth') state.seen = true;
}

function snare(layout: ArenaLayout, state: ArenaState, robot: RobotState): void {
  state.snareCooldown = ARENA.snareCooldown;
  state.events |= ARENA_EVENT.snare;
  robot.sparks -= 1;
  if (robot.sparks <= 0) { resolve(state, robot, false); return; }
  robot.hold = ARENA.snareSeconds; robot.tethered = true;
  if (robot.awareness < 1) { robot.awareness = 1; markSeen(layout, state, robot); }
  robot.lastSeenX = state.hero.x; robot.lastSeenZ = state.hero.z;
  if (robot.kind !== 'sentry') robot.mode = 'alert';
  state.snareId = robot.id;
}

function startPounce(layout: ArenaLayout, state: ArenaState, robot: RobotState): void {
  const hero = state.hero;
  const profile = ROBOT_PROFILES[robot.kind];
  const dx = robot.x - hero.x, dy = robot.y + profile.height - hero.y, dz = robot.z - hero.z;
  state.pounceId = robot.id; state.pounceTime = 0;
  state.pounceDuration = clamp(Math.sqrt(dx * dx + dy * dy + dz * dz) / ARENA.pounceSpeed, ARENA.pounceMin, ARENA.pounceMax);
  state.pounceFromX = hero.x; state.pounceFromY = hero.y; state.pounceFromZ = hero.z;
  state.pounceQuiet = quietOpening(layout.world, robot, hero);
  state.pounceCooldown = ARENA.pounceCooldown;
  state.events |= ARENA_EVENT.pounce;
}

/** Luke rides an authored arc that follows the robot, so the leap always lands. */
function stepPounce(layout: ArenaLayout, state: ArenaState, dt: number): void {
  const robot = state.robots.find(candidate => candidate.id === state.pounceId);
  const hero = state.hero;
  if (!robot || !inPlay(robot)) {
    state.pounceId = '';
    state.hero = { ...hero, mode: 'air', groundId: '', climbId: '', tetherId: '', hopAvailable: true, cutEligible: false };
    return;
  }
  const profile = ROBOT_PROFILES[robot.kind];
  state.pounceTime += dt;
  const u = Math.min(1, state.pounceTime / state.pounceDuration);
  const toX = robot.x, toY = robot.y + profile.height, toZ = robot.z;
  const x = state.pounceFromX + (toX - state.pounceFromX) * u;
  const z = state.pounceFromZ + (toZ - state.pounceFromZ) * u;
  const y = state.pounceFromY + (toY - state.pounceFromY) * u + ARENA.pounceArc * 4 * u * (1 - u);
  const flatX = toX - state.pounceFromX, flatZ = toZ - state.pounceFromZ;
  const flat = Math.sqrt(flatX * flatX + flatZ * flatZ);
  const yaw = flat > 1e-6 ? Math.atan2(flatX, flatZ) : hero.yaw;
  const next: HeroState = { ...hero, x, y, z, yaw, vx: (x - hero.x) / dt, vy: (y - hero.y) / dt, vz: (z - hero.z) / dt,
    mode: 'air', groundId: '', climbId: '', tetherId: '', airTime: hero.airTime + dt, events: 0, impact: 0 };
  if (u < 1) { state.hero = next; return; }

  // Landing. Small robots are pinned or finished; a big one is a springboard.
  const finishing = state.pounceQuiet || robot.hold > 0 || robot.mode === 'recover';
  state.events |= ARENA_EVENT.impact | ARENA_EVENT.bounce;
  if (profile.large) {
    if (finishing) { robot.sparks -= 1; if (robot.sparks <= 0) resolve(state, robot, state.pounceQuiet); }
  } else if (finishing) {
    resolve(state, robot, state.pounceQuiet);
  } else {
    robot.sparks -= 1;
    if (robot.sparks <= 0) resolve(state, robot, false);
    else { robot.hold = ARENA.pouncePin; robot.tethered = false; }
  }
  if (inPlay(robot) && robot.awareness < 1) { robot.awareness = 1; markSeen(layout, state, robot); }
  if (!state.pounceQuiet) noise(state, x, z);
  const away = flat > 1e-6 ? -1.6 / flat : 0;
  state.hero = { ...next, vx: flatX * away, vz: flatZ * away, vy: ARENA.pounceBounce, hopAvailable: true, cutEligible: false };
  state.mercy = Math.max(state.mercy, 0.5);
  state.pounceId = '';
}

function turnToward(robot: RobotState, yaw: number, rate: number, dt: number): number {
  const delta = wrap(yaw - robot.yaw);
  if (Math.abs(delta) > 1e-9) robot.yaw = wrap(robot.yaw + clamp(delta, -rate * dt, rate * dt));
  return Math.abs(delta);
}

/** Move a robot's footprint, sliding around solids and staying inside its own zone. Returns true when blocked. */
function shove(world: TraversalWorld, zone: Zone, robot: RobotState, profile: RobotProfile, nextX: number, nextZ: number): boolean {
  let x = nextX, z = nextZ, blocked = false;
  const R = profile.radius;
  for (const solid of world.solids) {
    if (robot.y >= solid.maxY - 0.05 || robot.y + profile.height <= solid.minY) continue;
    const cx = clamp(x, solid.minX, solid.maxX), cz = clamp(z, solid.minZ, solid.maxZ);
    const dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= R * R) continue;
    blocked = true;
    if (d2 > 1e-12) { const d = Math.sqrt(d2); x = cx + dx / d * R; z = cz + dz / d * R; continue; }
    const left = x - solid.minX, right = solid.maxX - x, near = z - solid.minZ, far = solid.maxZ - z;
    const least = Math.min(left, right, near, far);
    if (least === left) x = solid.minX - R; else if (least === right) x = solid.maxX + R; else if (least === near) z = solid.minZ - R; else z = solid.maxZ + R;
  }
  const inX = clamp(x, zone.minX + R, zone.maxX - R), inZ = clamp(z, zone.minZ + R, zone.maxZ - R);
  if (inX !== x || inZ !== z) blocked = true;
  robot.x = inX; robot.z = inZ;
  return blocked;
}

/** Walk toward a point. Returns the distance still to go. */
function approach(world: TraversalWorld, zone: Zone, robot: RobotState, profile: RobotProfile, x: number, z: number, speed: number, dt: number): number {
  const dx = x - robot.x, dz = z - robot.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  if (distance < 1e-6) return 0;
  turnToward(robot, Math.atan2(dx, dz), profile.turn, dt);
  const step = Math.min(distance, speed * dt);
  shove(world, zone, robot, profile, robot.x + dx / distance * step, robot.z + dz / distance * step);
  return distance - step;
}

function patrol(world: TraversalWorld, zone: Zone, spec: RobotSpec, robot: RobotState, profile: RobotProfile, dt: number): void {
  if (robot.kind === 'sentry') {
    // The gaze swings back and forth between its two limits.
    const span = wrap(spec.sweepTo - spec.sweepFrom);
    const middle = spec.sweepFrom + span / 2;
    let offset = wrap(robot.yaw - middle) + robot.sweepDir * spec.sweepRate * dt;
    if (offset > span / 2) { offset = span / 2; robot.sweepDir = -1; }
    if (offset < -span / 2) { offset = -span / 2; robot.sweepDir = 1; }
    robot.yaw = wrap(middle + offset);
    return;
  }
  if (spec.patrol.length === 0) {
    if (approach(world, zone, robot, profile, spec.x, spec.z, profile.walk, dt) < 0.05) turnToward(robot, spec.yaw, profile.turn, dt);
    return;
  }
  if (robot.patrolWait > 0) { robot.patrolWait -= dt; return; }
  const point = spec.patrol[robot.patrolIndex % spec.patrol.length];
  if (approach(world, zone, robot, profile, point.x, point.z, profile.walk, dt) < 0.2) {
    robot.patrolWait = point.wait;
    robot.patrolIndex = (robot.patrolIndex + 1) % spec.patrol.length;
  }
}

function hitLuke(state: ArenaState, robot: RobotState, dirX: number, dirZ: number): void {
  if (state.mercy > 0 || state.bonk > 0 || state.held > 0 || state.pounceId) return;
  state.energy -= 1; state.mercy = ARENA.mercy; state.events |= ARENA_EVENT.hit;
  if (state.trial === 'ring') state.ringHits += 1;
  const length = Math.sqrt(dirX * dirX + dirZ * dirZ);
  const kx = length > 1e-6 ? dirX / length : Math.sin(robot.yaw), kz = length > 1e-6 ? dirZ / length : Math.cos(robot.yaw);
  state.hero = { ...state.hero, vx: kx * ARENA.knockback, vz: kz * ARENA.knockback, vy: ARENA.knockUp,
    mode: 'air', groundId: '', climbId: '', tetherId: '', hopAvailable: true, cutEligible: false };
  if (state.energy > 0) return;
  // Bonked: dizzy for a moment. Robots lose interest and drift home; every spark already won stays won.
  state.energy = 0; state.bonk = ARENA.bonkSeconds; state.events |= ARENA_EVENT.bonk;
  if (state.trial === 'ring') state.ringBonks += 1;
  for (const other of state.robots) {
    if (!inPlay(other)) continue;
    other.awareness = 0; other.unseen = 0;
    if (other.mode !== 'recover' || other.kind !== 'sentry') { other.mode = 'patrol'; other.timer = 0; }
  }
}

function stepRobot(layout: ArenaLayout, state: ArenaState, robot: RobotState, targetable: boolean, dt: number): void {
  const spec = specOf(layout, robot.id);
  const profile = ROBOT_PROFILES[robot.kind];
  const zone = zoneOfTrial(layout, spec.trial);
  const world = layout.world;
  const hero = state.hero;
  if (robot.hold > 0) {
    robot.hold -= dt;
    const dx = hero.x - robot.x, dz = hero.z - robot.z;
    if (robot.hold <= 0 || (robot.tethered && dx * dx + dz * dz > ARENA.snareBreak * ARENA.snareBreak)) {
      robot.hold = 0; robot.tethered = false;
      if (state.snareId === robot.id) state.snareId = '';
      if (robot.kind !== 'sentry') robot.mode = 'alert';
    }
    return;
  }
  // Perception.
  const visible = targetable && canSee(world, robot, hero);
  if (visible) {
    const dx = hero.x - robot.x, dz = hero.z - robot.z;
    const near = clamp(Math.sqrt(dx * dx + dz * dz) / profile.sight, 0, 1);
    robot.awareness = Math.min(1, robot.awareness + (ARENA.awareNear + (ARENA.awareFar - ARENA.awareNear) * near) * dt);
    robot.unseen = 0; robot.lastSeenX = hero.x; robot.lastSeenZ = hero.z;
  } else {
    robot.unseen += dt;
    if (robot.unseen > ARENA.awareGrace) robot.awareness = Math.max(0, robot.awareness - ARENA.awareDecay * (targetable ? 1 : 4) * dt);
  }
  if (robot.kind === 'drone') robot.y = Math.min(profile.hover, robot.y + (robot.mode === 'strike' ? 0 : 2.5 * dt));

  switch (robot.mode) {
    case 'patrol':
      if (robot.awareness >= 1) { robot.mode = 'alert'; markSeen(layout, state, robot); break; }
      if (robot.awareness >= ARENA.unaware) { robot.mode = 'curious'; robot.timer = ARENA.curiousSeconds; break; }
      patrol(world, zone, spec, robot, profile, dt);
      break;
    case 'curious':
      if (robot.kind !== 'sentry') turnToward(robot, Math.atan2(robot.lastSeenX - robot.x, robot.lastSeenZ - robot.z), profile.turn, dt);
      if (robot.awareness >= 1) { robot.mode = 'alert'; markSeen(layout, state, robot); break; }
      robot.timer = visible ? ARENA.curiousSeconds : robot.timer - dt;
      if (robot.timer <= 0 && robot.awareness < ARENA.unaware) robot.mode = 'patrol';
      break;
    case 'alert': {
      if (robot.kind === 'sentry') {
        // The floodlight's catch: Luke is held for a moment and set down out of sight. Nothing is lost.
        if (targetable && !state.pounceId) {
          state.held = ARENA.holdSeconds; state.seen = true; state.catches += 1; state.events |= ARENA_EVENT.caught;
          state.hero = { ...hero, vx: 0, vy: 0, vz: 0 };
        }
        // No wall to get stuck on: every catch leaves the light dark for longer.
        robot.mode = 'recover'; robot.awareness = 0;
        robot.timer = profile.recover + Math.min(state.catches, ARENA.catchHelpMax) * ARENA.catchHelpSeconds;
        break;
      }
      if (!visible && robot.unseen >= ARENA.loseSightSeconds) { robot.mode = 'search'; robot.timer = ARENA.searchSeconds; break; }
      const dx = hero.x - robot.x, dz = hero.z - robot.z;
      const flat = Math.sqrt(dx * dx + dz * dz);
      if (robot.kind === 'mower') {
        // A mow-bot lines up, then charges straight.
        const off = turnToward(robot, Math.atan2(robot.lastSeenX - robot.x, robot.lastSeenZ - robot.z), profile.turn, dt);
        if (visible && off < 0.2 && flat <= profile.attackRange) { robot.mode = 'windup'; robot.timer = profile.windup; }
        break;
      }
      if (visible && flat <= profile.attackRange) { robot.mode = 'windup'; robot.timer = profile.windup; break; }
      approach(world, zone, robot, profile, robot.lastSeenX, robot.lastSeenZ, profile.chase, dt);
      break;
    }
    case 'windup': {
      // The telegraph. The robot tracks Luke for the first part, then commits to where he was.
      robot.timer -= dt;
      if (robot.timer > profile.windup * 0.4) {
        if (robot.kind !== 'mower') turnToward(robot, Math.atan2(hero.x - robot.x, hero.z - robot.z), profile.turn, dt);
        robot.strikeX = hero.x; robot.strikeY = hero.y + ARENA.heroCentre; robot.strikeZ = hero.z;
      }
      if (robot.timer > 0) break;
      robot.mode = 'strike'; robot.travelled = 0;
      if (robot.kind === 'drone') {
        const dx = robot.strikeX - robot.x, dy = robot.strikeY - robot.y, dz = robot.strikeZ - robot.z;
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        robot.strikeX = dx / length; robot.strikeY = dy / length; robot.strikeZ = dz / length;
        robot.timer = length;
      } else {
        robot.strikeX = Math.sin(robot.yaw); robot.strikeY = 0; robot.strikeZ = Math.cos(robot.yaw);
        robot.timer = profile.strikeDistance;
      }
      break;
    }
    case 'strike': {
      const step = profile.strikeSpeed * dt;
      let blocked = false;
      if (robot.kind === 'drone') {
        robot.y = Math.max(0.3, robot.y + robot.strikeY * step);
        blocked = shove(world, zone, robot, profile, robot.x + robot.strikeX * step, robot.z + robot.strikeZ * step);
      } else {
        blocked = shove(world, zone, robot, profile, robot.x + robot.strikeX * step, robot.z + robot.strikeZ * step);
      }
      robot.travelled += step;
      const dx = hero.x - robot.x, dz = hero.z - robot.z;
      const reach = profile.hit + TUNING.radius;
      const overlapping = dx * dx + dz * dz < reach * reach && hero.y < robot.y + profile.height + 0.3 && hero.y + TUNING.height > robot.y;
      if (overlapping && targetable) hitLuke(state, robot, robot.strikeX, robot.strikeZ);
      if (blocked || robot.travelled >= robot.timer || (overlapping && targetable)) {
        robot.mode = 'recover';
        // A mow-bot that runs into something stalls for longer.
        robot.timer = profile.recover + (blocked && robot.kind === 'mower' ? 1 : 0);
      }
      break;
    }
    case 'recover':
      robot.timer -= dt;
      if (robot.timer > 0) break;
      robot.mode = robot.kind === 'sentry' ? 'patrol' : robot.awareness >= ARENA.unaware && targetable ? 'alert' : 'search';
      robot.timer = ARENA.searchSeconds;
      break;
    case 'search':
      if (robot.awareness >= 1) { robot.mode = 'alert'; break; }
      {
        // Look around where Luke was last seen. A place it cannot reach is given up on a little later.
        const arrived = robot.kind === 'mower' || approach(world, zone, robot, profile, robot.lastSeenX, robot.lastSeenZ, profile.walk * 1.4, dt) < 0.4;
        robot.timer -= arrived ? dt : dt * 0.35;
      }
      if (robot.timer <= 0) { robot.mode = 'patrol'; robot.awareness = 0; }
      break;
    default:
      break;
  }
}

function enterTrial(layout: ArenaLayout, state: ArenaState, trial: TrialId | ''): void {
  // Leaving: whatever was chasing loses interest and goes home.
  for (const robot of state.robots) {
    if (!inPlay(robot)) continue;
    if (specOf(layout, robot.id).trial === state.trial) { robot.awareness = 0; robot.hold = 0; robot.tethered = false; if (robot.mode !== 'patrol') { robot.mode = 'patrol'; robot.timer = 0; } }
  }
  state.snareId = '';
  state.trial = trial;
  if (trial === 'ring') {
    // A finished or never-started ring begins again at wave one; an unfinished wave carries on.
    if (state.wave < 1 || state.wave > layout.waves) {
      state.wave = 1; state.ringHits = 0; state.ringBonks = 0;
      for (let index = 0; index < state.robots.length; index++) if (layout.robots[index].trial === 'ring') state.robots[index] = freshRobot(layout.robots[index]);
    }
    state.waveTimer = ARENA.waveDelay;
  } else if (trial === 'course') {
    // Each visit starts a new lap with every practice spark back in place.
    state.lap = []; state.lapTime = 0; state.lapRest = 0;
  } else if (trial === 'stealth') {
    // Each visit is a fresh attempt. Robots still on patrol carry on from where they are; the ones powered down are back at their posts.
    for (let index = 0; index < state.robots.length; index++) {
      if (layout.robots[index].trial === 'stealth' && state.robots[index].mode === 'resolved') state.robots[index] = freshRobot(layout.robots[index]);
    }
    state.seen = false; state.catches = 0; state.vaultTaken = false; state.hideId = layout.hides[0]?.id ?? '';
  }
}

type StarKey = 'courseStars' | 'ringStars' | 'stealthStars';
/** Stars only ever go up, and the event fires only when they do. */
function award(state: ArenaState, key: StarKey, stars: number): void {
  if (stars <= state.progress[key]) return;
  state.progress[key] = stars; state.events |= ARENA_EVENT.star;
}

function stepTrials(layout: ArenaLayout, state: ArenaState, dt: number): void {
  const hero = state.hero;
  const here = state.held > 0 ? state.trial : trialAt(layout, hero.x, hero.z);
  if (here === state.trial) state.away = 0;
  else if (here !== '') { state.away = 0; enterTrial(layout, state, here); }
  else {
    // Out on the hub floor. A swing or a stumble over the line ends nothing; staying out does.
    state.away += dt;
    if (state.away >= ARENA.leaveSeconds) { state.away = 0; enterTrial(layout, state, ''); }
  }

  if (state.trial === 'ring' && state.wave >= 1 && state.wave <= layout.waves) {
    const wave = state.robots.filter((_robot, index) => layout.robots[index].trial === 'ring' && layout.robots[index].wave === state.wave);
    if (state.waveTimer > 0) {
      state.waveTimer -= dt;
      if (state.waveTimer <= 0) {
        state.waveTimer = 0;
        let started = false;
        for (const robot of wave) if (robot.mode === 'dormant') { robot.mode = 'alert'; robot.awareness = 1; robot.lastSeenX = hero.x; robot.lastSeenZ = hero.z; started = true; }
        if (started) state.events |= ARENA_EVENT.wave;
      }
    } else if (wave.every(robot => robot.mode === 'resolved')) {
      state.progress.ringBest = Math.max(state.progress.ringBest, state.wave);
      state.wave += 1;
      if (state.wave > layout.waves) { state.events |= ARENA_EVENT.trial; award(state, 'ringStars', state.ringBonks > 0 ? 1 : state.ringHits > 0 ? 2 : 3); }
      else state.waveTimer = ARENA.waveDelay;
    }
  }

  // The course clock runs from the first spark of a lap; a finished lap rests, then the sparks come back.
  if (state.trial === 'course') {
    if (state.lapRest > 0) {
      state.lapRest -= dt;
      if (state.lapRest <= 0) {
        // The sparks come back once Luke has stepped clear of them, so standing on the last one never starts the clock.
        const reach = ARENA.pickupRadius * ARENA.pickupRadius;
        const touching = layout.pickups.some(item => item.trial === 'course' &&
          (item.x - hero.x) ** 2 + (item.y - hero.y - ARENA.heroCentre) ** 2 + (item.z - hero.z) ** 2 <= reach);
        if (touching) state.lapRest = dt; else { state.lapRest = 0; state.lap = []; state.lapTime = 0; }
      }
    } else if (state.lap.length > 0) state.lapTime += dt;
  }

  // Pickups: practice sparks on the course and the vault spark in the yard.
  const cx = hero.x, cy = hero.y + ARENA.heroCentre, cz = hero.z;
  for (const pickup of layout.pickups) {
    if (pickup.trial !== state.trial) continue;
    const dx = pickup.x - cx, dy = pickup.y - cy, dz = pickup.z - cz;
    if (dx * dx + dy * dy + dz * dz > ARENA.pickupRadius * ARENA.pickupRadius) continue;
    if (pickup.trial === 'course') {
      if (state.lapRest > 0 || state.lap.includes(pickup.id)) continue;
      state.lap = [...state.lap, pickup.id];
      state.events |= ARENA_EVENT.pickup;
      // Kept in level order so a save never depends on the route taken.
      if (!state.progress.course.includes(pickup.id)) state.progress.course = layout.pickups.filter(item => item.trial === 'course' && (item.id === pickup.id || state.progress.course.includes(item.id))).map(item => item.id);
      const total = layout.pickups.filter(item => item.trial === 'course').length;
      // Every spark found once is the first star, however many visits it takes.
      if (state.progress.course.length === total) award(state, 'courseStars', 1);
      if (state.lap.length === total) {
        state.events |= ARENA_EVENT.trial;
        award(state, 'courseStars', state.lapTime <= ARENA.courseGold ? 3 : state.lapTime <= ARENA.courseSilver ? 2 : 1);
        if (state.progress.courseBest === 0 || state.lapTime < state.progress.courseBest) state.progress.courseBest = state.lapTime;
        state.lapRest = ARENA.lapRest;
      }
    } else if (pickup.trial === 'stealth' && !state.vaultTaken) {
      state.vaultTaken = true;
      state.events |= ARENA_EVENT.pickup | ARENA_EVENT.trial;
      award(state, 'stealthStars', !state.seen ? 3 : state.catches === 0 ? 2 : 1);
    }
  }

  // The last hiding place Luke stood in, unseen: where a catch sets him back down.
  if (state.trial === 'stealth' && hero.mode === 'ground') {
    for (const hide of layout.hides) {
      const dx = hide.x - hero.x, dz = hide.z - hero.z;
      if (dx * dx + dz * dz <= ARENA.hideRadius * ARENA.hideRadius && !state.robots.some(robot => inPlay(robot) && robot.awareness >= ARENA.unaware)) state.hideId = hide.id;
    }
  }
}

/** Advance one fixed step. The input state is never mutated. */
export function stepArena(previous: ArenaState, input: ArenaInput, dt: number = TRAVERSAL_STEP, layout: ArenaLayout = ARENA_LAYOUT): ArenaState {
  if (!finite(dt) || dt <= 0) return previous;
  const state: ArenaState = { ...previous, robots: previous.robots.map(robot => ({ ...robot })),
    progress: { ...previous.progress, course: [...previous.progress.course] }, events: 0 };
  const world = layout.world;
  state.mercy = Math.max(0, state.mercy - dt);
  state.snareCooldown = Math.max(0, state.snareCooldown - dt);
  state.pounceCooldown = Math.max(0, state.pounceCooldown - dt);
  const actionPressed = input.action === true && !previous.actionHeld;
  const pouncePressed = input.pounce === true && !previous.pounceHeld;
  state.actionHeld = input.action === true; state.pounceHeld = input.pounce === true;

  if (state.bonk > 0) {
    // Dizzy: the body settles on its own and no robot bothers it.
    state.hero = stepHero(world, state.hero, IDLE_INPUT, dt);
    state.bonk -= dt;
    if (state.bonk <= 0) { state.bonk = 0; state.energy = ARENA.energyMax; state.mercy = ARENA.mercy; state.events |= ARENA_EVENT.revive; }
  } else if (state.held > 0) {
    state.held -= dt;
    if (state.held <= 0) {
      const hide = layout.hides.find(spot => spot.id === state.hideId) ?? layout.hides[0];
      state.held = 0; state.mercy = ARENA.mercy; state.events |= ARENA_EVENT.release;
      state.hero = hide ? createHero(world, hide) : createHero(world);
    }
  } else if (state.pounceId) {
    stepPounce(layout, state, dt);
  } else {
    state.hero = stepHero(world, state.hero, { moveX: input.moveX, moveZ: input.moveZ, jump: input.jump, power: input.power }, dt);
    const hero = state.hero;
    // Noise carries: a sprint or a heavy landing turns nearby heads.
    const planar = Math.sqrt(hero.vx * hero.vx + hero.vz * hero.vz);
    if ((hero.mode === 'ground' && hero.powerHeld && planar > ARENA.sprintNoiseSpeed) || ((hero.events & HERO_EVENT.land) !== 0 && hero.impact > ARENA.landNoiseImpact)) noise(state, hero.x, hero.z);
    if ((actionPressed || pouncePressed) && hero.mode !== 'catch') {
      const targetId = pickTarget(layout, state, input.aimX, input.aimZ);
      const robot = state.robots.find(candidate => candidate.id === targetId);
      if (robot) {
        // The pounce button always leaps when it can; the one-button action picks what counts most.
        const choice = pouncePressed ? (state.pounceCooldown <= 0 ? 'pounce' : 'none') : actionFor(layout, state, robot);
        if (choice === 'snare') snare(layout, state, robot);
        else if (choice !== 'none') startPounce(layout, state, robot);
      }
    }
  }

  // Robots notice and bother Luke only inside their own trial: stepping out of a zone is always safe.
  const targetable = state.bonk <= 0 && state.held <= 0;
  for (let index = 0; index < state.robots.length; index++) {
    const robot = state.robots[index];
    if (inPlay(robot)) stepRobot(layout, state, robot, targetable && layout.robots[index].trial === state.trial, dt);
  }
  stepTrials(layout, state, dt);
  state.targetId = targetable && !state.pounceId ? pickTarget(layout, state, input.aimX, input.aimZ) : '';
  const aimed = state.targetId ? state.robots.find(robot => robot.id === state.targetId) : undefined;
  state.targetQuiet = aimed !== undefined && quietOpening(world, aimed, state.hero);
  if (state.snareId && !state.robots.some(robot => robot.id === state.snareId && robot.hold > 0 && robot.tethered)) state.snareId = '';
  return state;
}

/** Merge stored progress with a run's progress. Rewards only ever accumulate. */
export function mergeProgress(layout: ArenaLayout, a: ArenaProgress, b: ArenaProgress): ArenaProgress {
  const course = layout.pickups.filter(item => item.trial === 'course' && (a.course.includes(item.id) || b.course.includes(item.id))).map(item => item.id);
  const best = a.courseBest > 0 && b.courseBest > 0 ? Math.min(a.courseBest, b.courseBest) : Math.max(a.courseBest, b.courseBest);
  return {
    course, courseStars: Math.max(a.courseStars, b.courseStars), courseBest: best,
    ringStars: Math.max(a.ringStars, b.ringStars), ringBest: Math.max(a.ringBest, b.ringBest),
    stealthStars: Math.max(a.stealthStars, b.stealthStars), quiet: Math.max(a.quiet, b.quiet),
  };
}

const wholeBetween = (value: unknown, least: number, most: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= least && value <= most;

/** True for progress this layout could really have produced: nothing unknown, out of order or self-contradicting. */
export function isArenaProgress(layout: ArenaLayout, value: unknown): value is ArenaProgress {
  if (typeof value !== 'object' || value === null) return false;
  const progress = value as Partial<ArenaProgress>;
  const sparks = layout.pickups.filter(item => item.trial === 'course').map(item => item.id);
  if (!Array.isArray(progress.course) || !progress.course.every(id => typeof id === 'string')) return false;
  if (progress.course.join('|') !== sparks.filter(id => (progress.course as string[]).includes(id)).join('|')) return false;
  if (!wholeBetween(progress.courseStars, 0, STAR_MAX) || !wholeBetween(progress.ringStars, 0, STAR_MAX) || !wholeBetween(progress.stealthStars, 0, STAR_MAX)) return false;
  if (!wholeBetween(progress.ringBest, 0, layout.waves) || !wholeBetween(progress.quiet, 0, 1_000_000)) return false;
  if (typeof progress.courseBest !== 'number' || !finite(progress.courseBest) || progress.courseBest < 0) return false;
  if ((progress.course.length === sparks.length) !== (progress.courseStars >= 1)) return false;
  if ((progress.courseBest > 0) && progress.courseStars < 1) return false;
  if (progress.courseStars >= 2 && !(progress.courseBest > 0 && progress.courseBest <= ARENA.courseSilver)) return false;
  if (progress.courseStars >= 3 && progress.courseBest > ARENA.courseGold) return false;
  return (progress.ringBest === layout.waves) === (progress.ringStars >= 1);
}
