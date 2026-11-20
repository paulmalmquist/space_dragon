import { TRAVERSAL_STEP, TUNING } from './tuning.ts';
import type { TraversalTuning } from './tuning.ts';
import { ceilingAt, clamp, finite, pointInSolid, supportAt, topAt, waterAt } from './world.ts';
import type { Anchor, ClimbSurface, Recovery, TraversalWorld } from './world.ts';

/**
 * Authoritative on-foot hero: momentum running, a held-height jump, one thruster hop,
 * tether swings on marked anchors, climbing on marked faces and a safety catch instead of
 * any fail state.
 * Pure and fixed-step: no renderer, DOM, storage or wall clock. Presentation observes it.
 */
export type HeroMode = 'ground' | 'air' | 'swing' | 'catch' | 'climb';

/** One-step notifications for effects and sound. They never own progress. */
export const HERO_EVENT = Object.freeze({ jump: 1, hop: 2, attach: 4, release: 8, land: 16, bounce: 32, catch: 64, recover: 128, climb: 256, mantle: 512 });

export interface HeroState {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  /** Facing; zero looks toward +z. */
  yaw: number;
  mode: HeroMode;
  groundId: string;
  groundTime: number;
  airTime: number;
  coyote: number;
  jumpBuffer: number;
  jumpHeld: boolean;
  powerHeld: boolean;
  hopAvailable: boolean;
  /** A released jump key may shorten only an ordinary jump, never a hop, bounce or swing launch. */
  cutEligible: boolean;
  tetherId: string;
  ropeLength: number;
  ropeTarget: number;
  swingTime: number;
  /** Unit ground direction from the hero to the anchor at the moment of attaching. */
  swingDirX: number; swingDirZ: number;
  tetherCooldown: number;
  lastAnchorId: string;
  lastAnchorAge: number;
  catchTime: number;
  catchX: number; catchY: number; catchZ: number;
  safeX: number; safeY: number; safeZ: number; safeYaw: number;
  impact: number;
  events: number;
  /** The marked face being climbed, or an empty string. */
  climbId: string;
  /** Time before a face can be grabbed again after jumping off one. */
  climbCooldown: number;
}

export interface HeroInput {
  /** World-space intent on the ground plane, magnitude at most one. */
  moveX: number;
  moveZ: number;
  jump: boolean;
  /** Suit power: sprint on the ground, tether in the air. */
  power: boolean;
}

export const IDLE_INPUT: Readonly<HeroInput> = Object.freeze({ moveX: 0, moveZ: 0, jump: false, power: false });

function wrapAngle(angle: number): number { return Math.atan2(Math.sin(angle), Math.cos(angle)); }
function anchorById(world: TraversalWorld, id: string): Anchor | null {
  for (const anchor of world.anchors) if (anchor.id === id) return anchor;
  return null;
}

/**
 * Stand the hero on the surface under a pose. Without a height the search starts at the
 * ground, so decks and floors are found but walls and roofs are not mistaken for footing.
 */
export function createHero(world: TraversalWorld, pose: { x: number; z: number; yaw: number; y?: number } = world.spawn, tuning: TraversalTuning = TUNING): HeroState {
  const x = finite(pose.x) ? pose.x : world.spawn.x;
  const z = finite(pose.z) ? pose.z : world.spawn.z;
  const yaw = finite(pose.yaw) ? pose.yaw : world.spawn.yaw;
  const support = supportAt(world, x, z, finite(pose.y) ? pose.y : 0, tuning.placeReach);
  return {
    x, y: support.height, z, vx: 0, vy: 0, vz: 0, yaw,
    mode: 'ground', groundId: support.id, groundTime: tuning.safeDelay, airTime: 0, coyote: tuning.coyote, jumpBuffer: 0,
    jumpHeld: false, powerHeld: false, hopAvailable: true, cutEligible: false,
    tetherId: '', ropeLength: 0, ropeTarget: 0, swingTime: 0, swingDirX: 0, swingDirZ: 1, tetherCooldown: 0, lastAnchorId: '', lastAnchorAge: 0,
    catchTime: 0, catchX: x, catchY: support.height, catchZ: z,
    safeX: x, safeY: support.height, safeZ: z, safeYaw: yaw, impact: 0, events: 0,
    climbId: '', climbCooldown: 0,
  };
}

/** Direction the hero means to travel: stick first, then momentum, then facing. */
export function travelDirection(state: HeroState, moveX: number, moveZ: number): { x: number; z: number } {
  const magnitude = Math.sqrt(moveX * moveX + moveZ * moveZ);
  if (magnitude > 0.2) return { x: moveX / magnitude, z: moveZ / magnitude };
  const speed = Math.sqrt(state.vx * state.vx + state.vz * state.vz);
  if (speed > 1.5) return { x: state.vx / speed, z: state.vz / speed };
  return { x: Math.sin(state.yaw), z: Math.cos(state.yaw) };
}

/** A rope may pass trunks and posts (anchors hang from them) but not walls, roofs or props. */
export function tetherSight(world: TraversalWorld, x: number, y: number, z: number, anchor: Anchor, tuning: TraversalTuning = TUNING): boolean {
  const dx = anchor.x - x;
  const dy = anchor.y - y;
  const dz = anchor.z - z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const samples = Math.max(1, Math.ceil(distance / tuning.tetherSightStep));
  for (let index = 1; index < samples; index++) {
    const t = index / samples;
    const px = x + dx * t;
    const py = y + dy * t;
    const pz = z + dz * t;
    for (const solid of world.solids) if (solid.kind !== 'trunk' && pointInSolid(solid, px, py, pz)) return false;
  }
  return true;
}

/**
 * The anchor a tether would take now, or null. Deterministic: ties keep world order.
 * Anchors must be above the hand, in range, in sight and not behind the direction of travel.
 */
export function selectAnchor(world: TraversalWorld, state: HeroState, dirX: number, dirZ: number, excludeId = '', tuning: TraversalTuning = TUNING): Anchor | null {
  const handY = state.y + tuning.handHeight;
  const rejected: string[] = [];
  for (;;) {
    let best: Anchor | null = null;
    let bestScore = -Infinity;
    for (const anchor of world.anchors) {
      if (anchor.id === excludeId || rejected.includes(anchor.id)) continue;
      const dx = anchor.x - state.x;
      const dz = anchor.z - state.z;
      const dy = anchor.y - handY;
      if (dy < tuning.tetherMinRise) continue;
      const flat = Math.sqrt(dx * dx + dz * dz);
      const distance = Math.sqrt(flat * flat + dy * dy);
      if (distance > tuning.tetherRange) continue;
      const align = flat > 1e-6 ? (dx * dirX + dz * dirZ) / flat : 0.3;
      if (align < tuning.tetherMinAlign) continue;
      // Near anchors swing well; far ones need a long reel, and one directly overhead barely swings.
      const reach = flat > tuning.tetherIdeal ? (flat - tuning.tetherIdeal) / tuning.tetherIdeal : (tuning.tetherIdeal - flat) / (tuning.tetherIdeal * 3);
      const score = align * 2.2 - reach - (flat < 2 ? (2 - flat) * 0.5 : 0) - (dy > 9 ? (dy - 9) * 0.1 : 0);
      if (score > bestScore) { bestScore = score; best = anchor; }
    }
    if (!best || tetherSight(world, state.x, handY, state.z, best, tuning)) return best;
    rejected.push(best.id);
  }
}

/** Circle footprint against prisms: slide along walls, pass under roofs, step onto low tops. */
function slide(world: TraversalWorld, hero: HeroState, targetX: number, targetZ: number, reach: number, T: TraversalTuning): void {
  let x = targetX;
  let z = targetZ;
  const R = T.radius;
  for (let pass = 0; pass < 2; pass++) {
    for (const solid of world.solids) {
      if (x < solid.minX - R || x > solid.maxX + R || z < solid.minZ - R || z > solid.maxZ + R) continue;
      if (hero.y + T.height <= solid.minY) continue;
      const cx = clamp(x, solid.minX, solid.maxX);
      const cz = clamp(z, solid.minZ, solid.maxZ);
      if (hero.y + reach >= topAt(solid, cx, cz)) continue;
      const dx = x - cx;
      const dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= R * R) continue;
      let nx = 0;
      let nz = 0;
      if (d2 > 1e-12) {
        const d = Math.sqrt(d2);
        nx = dx / d; nz = dz / d;
        x = cx + nx * R; z = cz + nz * R;
      } else {
        const left = x - solid.minX;
        const right = solid.maxX - x;
        const near = z - solid.minZ;
        const far = solid.maxZ - z;
        const least = Math.min(left, right, near, far);
        if (least === left) { nx = -1; x = solid.minX - R; }
        else if (least === right) { nx = 1; x = solid.maxX + R; }
        else if (least === near) { nz = -1; z = solid.minZ - R; }
        else { nz = 1; z = solid.maxZ + R; }
      }
      const into = hero.vx * nx + hero.vz * nz;
      if (into < 0) { hero.vx -= into * nx; hero.vz -= into * nz; }
    }
  }
  const b = world.bounds;
  if (x < b.minX + R) { x = b.minX + R; if (hero.vx < 0) hero.vx = 0; }
  if (x > b.maxX - R) { x = b.maxX - R; if (hero.vx > 0) hero.vx = 0; }
  if (z < b.minZ + R) { z = b.minZ + R; if (hero.vz < 0) hero.vz = 0; }
  if (z > b.maxZ - R) { z = b.maxZ - R; if (hero.vz > 0) hero.vz = 0; }
  hero.x = x; hero.z = z;
}

/** Vertical resolution. Returns true while the feet rest on a surface. */
function settle(world: TraversalWorld, hero: HeroState, targetY: number, grounded: boolean, T: TraversalTuning): boolean {
  const feet = hero.y;
  const support = supportAt(world, hero.x, hero.z, feet, (grounded ? T.stepHeight : T.airStepHeight) + 1e-9, T.edgeGrace);
  let y = targetY;
  if (hero.vy > 0) {
    const ceiling = ceilingAt(world, hero.x, hero.z, feet + T.height, T.radius - 0.02);
    if (y + T.height > ceiling) { y = ceiling - T.height; hero.vy = 0; }
  }
  const resting = hero.vy <= 0 && (y <= support.height || (grounded && y - support.height <= T.stepDown));
  if (!resting) { hero.y = y; return false; }
  hero.y = support.height;
  if (support.bounce > 0) {
    hero.vy = support.bounce; hero.hopAvailable = true; hero.cutEligible = false;
    hero.groundId = ''; hero.events |= HERO_EVENT.bounce;
    return false;
  }
  if (!grounded) { hero.events |= HERO_EVENT.land; hero.impact = -hero.vy; }
  hero.vy = 0; hero.groundId = support.id;
  return true;
}

/** Sub-stepped so a fast body cannot cross a thin wall or miss a landing. */
function moveBody(world: TraversalWorld, hero: HeroState, dt: number, grounded: boolean, T: TraversalTuning): boolean {
  const speed = Math.sqrt(hero.vx * hero.vx + hero.vy * hero.vy + hero.vz * hero.vz);
  const steps = Math.max(1, Math.ceil(speed * dt / T.maxMove));
  const sub = dt / steps;
  let resting = grounded;
  for (let index = 0; index < steps; index++) {
    slide(world, hero, hero.x + hero.vx * sub, hero.z + hero.vz * sub, resting ? T.stepHeight : T.airStepHeight, T);
    resting = settle(world, hero, hero.y + hero.vy * sub, resting, T);
  }
  return resting;
}

function limitSpeed(hero: HeroState, limit: number): void {
  const speed = Math.sqrt(hero.vx * hero.vx + hero.vy * hero.vy + hero.vz * hero.vz);
  if (speed > limit) { const scale = limit / speed; hero.vx *= scale; hero.vy *= scale; hero.vz *= scale; }
}

function face(hero: HeroState, moveX: number, moveZ: number, magnitude: number, dt: number, T: TraversalTuning): void {
  const flat = Math.sqrt(hero.vx * hero.vx + hero.vz * hero.vz);
  let target = hero.yaw;
  if (flat > 0.4) target = Math.atan2(hero.vx, hero.vz);
  else if (magnitude > 0.1) target = Math.atan2(moveX, moveZ);
  const turn = T.turnRate * dt;
  const delta = wrapAngle(target - hero.yaw);
  // Leave a settled facing untouched: re-wrapping an unchanged angle adds rounding noise each step.
  if (Math.abs(delta) > 1e-9) hero.yaw = wrapAngle(hero.yaw + clamp(delta, -turn, turn));
}

function release(hero: HeroState, jumpOff: boolean, T: TraversalTuning): void {
  hero.lastAnchorId = hero.tetherId; hero.lastAnchorAge = 0;
  hero.tetherId = ''; hero.mode = 'air'; hero.tetherCooldown = T.tetherRechain;
  hero.vx *= T.releaseBoost; hero.vz *= T.releaseBoost;
  if (jumpOff) hero.vy = Math.max(hero.vy, 0) + T.jumpOffLift;
  else if (hero.vy > -2) hero.vy += T.releaseLift;
  hero.hopAvailable = true; hero.cutEligible = false;
  hero.events |= HERO_EVENT.release;
}

/** Nearest of the last place the hero stood and the authored recovery spots. */
function nearestRecovery(world: TraversalWorld, hero: HeroState): Recovery | null {
  let best: Recovery | null = null;
  let bestD2 = (hero.safeX - hero.x) * (hero.safeX - hero.x) + (hero.safeZ - hero.z) * (hero.safeZ - hero.z);
  for (const spot of world.recoveries) {
    const d2 = (spot.x - hero.x) * (spot.x - hero.x) + (spot.z - hero.z) * (spot.z - hero.z);
    if (d2 < bestD2) { bestD2 = d2; best = spot; }
  }
  return best;
}

function beginCatch(world: TraversalWorld, hero: HeroState): void {
  const spot = nearestRecovery(world, hero);
  if (spot) { hero.safeX = spot.x; hero.safeY = spot.y; hero.safeZ = spot.z; hero.safeYaw = spot.yaw; }
  hero.mode = 'catch'; hero.catchTime = 0;
  hero.catchX = hero.x; hero.catchY = hero.y; hero.catchZ = hero.z;
  hero.vx = 0; hero.vy = 0; hero.vz = 0;
  hero.tetherId = ''; hero.groundId = '';
  hero.events |= HERO_EVENT.catch;
}

function stepCatch(world: TraversalWorld, hero: HeroState, dt: number, T: TraversalTuning): void {
  hero.catchTime += dt;
  const span = Math.sqrt((hero.safeX - hero.catchX) * (hero.safeX - hero.catchX) + (hero.safeZ - hero.catchZ) * (hero.safeZ - hero.catchZ));
  const u = Math.min(1, hero.catchTime / clamp(span / T.catchSpeed, T.catchDuration, T.catchMaxDuration));
  const ease = u * u * (3 - 2 * u);
  hero.x = hero.catchX + (hero.safeX - hero.catchX) * ease;
  hero.z = hero.catchZ + (hero.safeZ - hero.catchZ) * ease;
  hero.y = hero.catchY + (hero.safeY - hero.catchY) * ease + Math.sin(Math.PI * u) * T.catchArc;
  hero.airTime += dt;
  if (u < 1) return;
  hero.x = hero.safeX; hero.y = hero.safeY; hero.z = hero.safeZ; hero.yaw = hero.safeYaw;
  hero.mode = 'ground'; hero.groundId = supportAt(world, hero.x, hero.z, hero.y, T.stepHeight, T.edgeGrace).id;
  hero.groundTime = 0; hero.airTime = 0; hero.coyote = T.coyote; hero.hopAvailable = true;
  hero.events |= HERO_EVENT.recover;
}

function stepSwing(world: TraversalWorld, hero: HeroState, moveX: number, moveZ: number, magnitude: number, jumpPressed: boolean, power: boolean, dt: number, T: TraversalTuning): void {
  const anchor = anchorById(world, hero.tetherId);
  if (!anchor) { release(hero, false, T); return; }
  const previousVy = hero.vy;
  hero.swingTime += dt; hero.airTime += dt; hero.coyote = 0;
  // Reel toward a rope that keeps the bottom of the arc clear, easing out near the target.
  if (hero.ropeLength > hero.ropeTarget) {
    hero.ropeLength = Math.max(hero.ropeTarget, hero.ropeLength - Math.min(T.reelRate, (hero.ropeLength - hero.ropeTarget) * 5 + 0.6) * dt);
  }
  hero.vy += T.swingGravity * dt;
  if (anchor.perch) {
    // A perch draws the hero in: drive toward it and bleed the sideways orbit.
    const toX = anchor.x - hero.x;
    const toZ = anchor.z - hero.z;
    const flatTo = Math.sqrt(toX * toX + toZ * toZ);
    if (flatTo > 1e-6) {
      const ux = toX / flatTo;
      const uz = toZ / flatTo;
      const side = hero.vx * -uz + hero.vz * ux;
      const damp = Math.min(1, T.perchSideDamp * dt);
      hero.vx -= -uz * side * damp; hero.vz -= ux * side * damp;
      hero.vx += ux * T.swingPump * dt; hero.vz += uz * T.swingPump * dt;
    }
  } else {
    // Keep the arc in the plane it began in so it passes under the anchor, then pump along
    // the stick (or current travel when only the tether is held) with limited sideways steer.
    const sx = hero.swingDirX;
    const sz = hero.swingDirZ;
    if ((hero.x - anchor.x) * sx + (hero.z - anchor.z) * sz < 0) {
      const side = hero.vx * -sz + hero.vz * sx;
      const damp = Math.min(1, T.swingSideDamp * dt);
      hero.vx -= -sz * side * damp; hero.vz -= sx * side * damp;
    }
    const drive = travelDirection(hero, moveX, moveZ);
    const strength = (magnitude > 0.2 ? magnitude : 1) * T.swingPump * dt;
    const along = drive.x * sx + drive.z * sz;
    const lateral = (drive.x * -sz + drive.z * sx) * T.swingSteer;
    hero.vx += (sx * along - sz * lateral) * strength;
    hero.vz += (sz * along + sx * lateral) * strength;
  }
  limitSpeed(hero, T.swingMaxSpeed);
  if (moveBody(world, hero, dt, false, T)) {
    hero.lastAnchorId = hero.tetherId; hero.lastAnchorAge = 0;
    hero.tetherId = ''; hero.mode = 'ground'; hero.groundTime = 0; hero.airTime = 0;
    hero.hopAvailable = true; hero.coyote = T.coyote;
    return;
  }
  let rx = hero.x - anchor.x;
  let ry = hero.y + T.handHeight - anchor.y;
  let rz = hero.z - anchor.z;
  const distance = Math.sqrt(rx * rx + ry * ry + rz * rz);
  let taut = false;
  if (distance > hero.ropeLength && distance > 1e-9) {
    taut = true;
    rx /= distance; ry /= distance; rz /= distance;
    const excess = distance - hero.ropeLength;
    hero.x -= rx * excess; hero.y -= ry * excess; hero.z -= rz * excess;
    const outward = hero.vx * rx + hero.vy * ry + hero.vz * rz;
    if (outward > 0) { hero.vx -= outward * rx; hero.vy -= outward * ry; hero.vz -= outward * rz; }
    // The rope must never pull the body into a wall or an eave.
    slide(world, hero, hero.x, hero.z, T.airStepHeight, T);
  }
  face(hero, moveX, moveZ, magnitude, dt, T);
  if (jumpPressed) { release(hero, true, T); return; }
  if (!power) { release(hero, false, T); return; }
  if (hero.swingTime < T.swingMinTime) return;
  // Automatic launch on the far side of the arc, while there is still speed to carry.
  const awayX = hero.x - anchor.x;
  const awayZ = hero.z - anchor.z;
  // Only the far side counts: a hero who attached while drifting away must swing back first.
  const leaving = awayX * hero.swingDirX + awayZ * hero.swingDirZ > 0 && awayX * hero.vx + awayZ * hero.vz > 0;
  const flat = Math.sqrt(awayX * awayX + awayZ * awayZ);
  const below = anchor.y - (hero.y + T.handHeight);
  const speed = Math.sqrt(hero.vx * hero.vx + hero.vy * hero.vy + hero.vz * hero.vz);
  if (anchor.perch && flat < T.perchRadius) {
    // Arrived: shed the swing's speed and drop onto the surface below the perch.
    release(hero, false, T);
    hero.vx *= T.perchCarry; hero.vz *= T.perchCarry; hero.vy = Math.min(hero.vy, 0);
    return;
  }
  if (taut && leaving && hero.vy > 0 && flat > below * T.releaseSpread) { release(hero, false, T); return; }
  if (leaving && previousVy > 0 && hero.vy <= 0) { release(hero, false, T); return; }
  if (hero.swingTime >= T.swingMaxTime || (hero.swingTime >= T.swingStallTime && speed < T.swingStallSpeed)) release(hero, false, T);
}

function stepFree(world: TraversalWorld, hero: HeroState, moveX: number, moveZ: number, magnitude: number,
  jumpPressed: boolean, jumpHeld: boolean, power: boolean, powerPressed: boolean, dt: number, T: TraversalTuning): void {
  let grounded = hero.mode === 'ground';
  if (grounded) {
    const target = magnitude * (power ? T.sprintSpeed : T.runSpeed);
    const wantX = magnitude > 0 ? moveX / magnitude * target : 0;
    const wantZ = magnitude > 0 ? moveZ / magnitude * target : 0;
    const dvx = wantX - hero.vx;
    const dvz = wantZ - hero.vz;
    const gap = Math.sqrt(dvx * dvx + dvz * dvz);
    const change = (magnitude > 0 ? T.groundAccel : T.groundBrake) * dt;
    if (gap <= change) { hero.vx = wantX; hero.vz = wantZ; }
    else { hero.vx += dvx / gap * change; hero.vz += dvz / gap * change; }
    hero.vy = 0;
  } else {
    const before = Math.sqrt(hero.vx * hero.vx + hero.vz * hero.vz);
    if (magnitude > 0) {
      hero.vx += moveX * T.airAccel * dt;
      hero.vz += moveZ * T.airAccel * dt;
      // Steering is free; gaining speed beyond what the hero carried is not.
      const limit = Math.max(before, T.airSpeed);
      const after = Math.sqrt(hero.vx * hero.vx + hero.vz * hero.vz);
      if (after > limit) { hero.vx *= limit / after; hero.vz *= limit / after; }
    } else {
      const drag = Math.max(0, 1 - T.airDrag * dt);
      hero.vx *= drag; hero.vz *= drag;
    }
  }
  let jumped = false;
  if (hero.jumpBuffer > 0 && (grounded || hero.coyote > 0)) {
    hero.vy = T.jumpSpeed; grounded = false; hero.mode = 'air'; hero.groundId = '';
    hero.coyote = 0; hero.jumpBuffer = 0; hero.cutEligible = true; hero.airTime = 0;
    hero.events |= HERO_EVENT.jump; jumped = true;
  } else if (!grounded && jumpPressed && hero.hopAvailable) {
    hero.vy = T.hopSpeed; hero.hopAvailable = false; hero.jumpBuffer = 0; hero.cutEligible = false;
    if (magnitude > 0) { hero.vx += moveX / magnitude * T.hopPush; hero.vz += moveZ / magnitude * T.hopPush; }
    hero.events |= HERO_EVENT.hop; jumped = true;
  }
  if (!grounded && !jumped && power && hero.tetherCooldown <= 0 && (powerPressed || hero.airTime >= T.tetherMinAir)) {
    const dir = travelDirection(hero, moveX, moveZ);
    const anchor = selectAnchor(world, hero, dir.x, dir.z, hero.lastAnchorAge < T.tetherForget ? hero.lastAnchorId : '', T);
    if (anchor) {
      const dx = hero.x - anchor.x;
      const dy = hero.y + T.handHeight - anchor.y;
      const dz = hero.z - anchor.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      hero.tetherId = anchor.id; hero.mode = 'swing'; hero.swingTime = 0;
      const flat = Math.sqrt(dx * dx + dz * dz);
      hero.swingDirX = flat > 1e-6 ? -dx / flat : dir.x;
      hero.swingDirZ = flat > 1e-6 ? -dz / flat : dir.z;
      hero.ropeLength = distance;
      hero.ropeTarget = Math.min(distance, clamp(anchor.y - T.handHeight - anchor.floor - T.swingClearance, T.ropeMin, T.ropeMax));
      hero.hopAvailable = true; hero.cutEligible = false;
      hero.events |= HERO_EVENT.attach;
      return;
    }
  }
  if (!grounded) {
    const gravity = hero.vy > 0 ? (hero.cutEligible && !jumpHeld ? T.gravityCut : T.gravityRise) : T.gravityFall;
    hero.vy = Math.max(-T.terminal, hero.vy + gravity * dt);
  }
  limitSpeed(hero, T.maxSpeed);
  const resting = moveBody(world, hero, dt, grounded, T);
  face(hero, moveX, moveZ, magnitude, dt, T);
  if (resting) {
    if (hero.mode !== 'ground') { hero.groundTime = 0; hero.hopAvailable = true; }
    hero.mode = 'ground'; hero.groundTime += dt; hero.airTime = 0; hero.coyote = T.coyote; hero.cutEligible = false;
  } else {
    if (hero.mode === 'ground') { hero.groundId = ''; hero.airTime = 0; }
    hero.mode = 'air'; hero.groundTime = 0; hero.airTime += dt;
    hero.coyote = Math.max(0, hero.coyote - dt);
  }
}

function climbById(world: TraversalWorld, id: string): ClimbSurface | null {
  if (world.climbs) for (const surface of world.climbs) if (surface.id === id) return surface;
  return null;
}

/** True when a standing body at these feet overlaps no solid it could not step onto. */
function bodyFits(world: TraversalWorld, x: number, z: number, feet: number, T: TraversalTuning): boolean {
  for (const solid of world.solids) {
    const cx = clamp(x, solid.minX, solid.maxX);
    const cz = clamp(z, solid.minZ, solid.maxZ);
    const dx = x - cx;
    const dz = z - cz;
    if (dx * dx + dz * dz >= T.radius * T.radius - 1e-10) continue;
    if (topAt(solid, cx, cz) <= feet + T.stepHeight || solid.minY >= feet + T.height) continue;
    return false;
  }
  return true;
}

/**
 * Spider Climb: walking into a marked face grabs it. Nothing else in the level is climbable.
 * Returns true when the hero attached this step.
 */
function tryClimb(world: TraversalWorld, hero: HeroState, moveX: number, moveZ: number, magnitude: number, T: TraversalTuning): boolean {
  if (!world.climbs || hero.climbCooldown > 0 || magnitude <= 0 || (hero.mode !== 'ground' && hero.mode !== 'air')) return false;
  for (const surface of world.climbs) {
    const alongX = surface.axis === 'z';
    const out = ((alongX ? hero.z : hero.x) - surface.at) * surface.facing;
    if (out < -1e-6 || out > T.radius + T.climbReach) continue;
    const along = alongX ? hero.x : hero.z;
    if (along < surface.min + T.radius || along > surface.max - T.radius) continue;
    if (hero.y < surface.minY - 0.05 || hero.y > surface.maxY - 0.02) continue;
    // Pushing toward the wall is what asks for the climb.
    if (-(alongX ? moveZ : moveX) * surface.facing < T.climbPush) continue;
    if (alongX) hero.z = surface.at + surface.facing * T.radius; else hero.x = surface.at + surface.facing * T.radius;
    hero.mode = 'climb'; hero.climbId = surface.id;
    hero.vx = 0; hero.vy = 0; hero.vz = 0;
    hero.yaw = alongX ? (surface.facing > 0 ? Math.PI : 0) : (surface.facing > 0 ? -Math.PI / 2 : Math.PI / 2);
    hero.groundId = ''; hero.tetherId = ''; hero.jumpBuffer = 0; hero.cutEligible = false; hero.hopAvailable = true;
    hero.airTime = 0; hero.groundTime = 0; hero.coyote = 0;
    hero.events |= HERO_EVENT.climb;
    return true;
  }
  return false;
}

/**
 * On a marked face: pushing toward the wall climbs, pulling away descends, sideways shuffles.
 * Jump springs off; the top mantles onto the surface behind the edge when a body fits there.
 */
function stepClimb(world: TraversalWorld, hero: HeroState, moveX: number, moveZ: number, jumpPressed: boolean, dt: number, T: TraversalTuning): void {
  const surface = climbById(world, hero.climbId);
  if (!surface) { hero.mode = 'air'; hero.climbId = ''; return; }
  const alongX = surface.axis === 'z';
  const nx = alongX ? 0 : surface.facing;
  const nz = alongX ? surface.facing : 0;
  const into = -(moveX * nx + moveZ * nz);
  // The stick is a world-space intent, so its part along the wall shuffles the same way in the world.
  const side = alongX ? moveX : moveZ;
  hero.vx = 0; hero.vy = 0; hero.vz = 0;
  hero.airTime = 0; hero.groundTime = 0; hero.coyote = 0;
  if (jumpPressed) {
    hero.mode = 'air'; hero.climbId = ''; hero.climbCooldown = T.climbCooldown;
    hero.vx = nx * T.wallJumpOut + (alongX ? side * 2 : 0); hero.vz = nz * T.wallJumpOut + (alongX ? 0 : side * 2); hero.vy = T.wallJumpUp;
    hero.hopAvailable = true; hero.cutEligible = false; hero.jumpBuffer = 0;
    hero.yaw = Math.atan2(nx, nz);
    hero.events |= HERO_EVENT.jump;
    return;
  }
  const was = alongX ? hero.x : hero.z;
  const fromY = hero.y;
  const along = clamp(was + side * T.climbSide * dt, surface.min + T.radius, surface.max - T.radius);
  if (alongX) hero.x = along; else hero.z = along;
  let y = hero.y + (into > 0 ? into * T.climbSpeed : into * T.climbDown) * dt;
  if (into < 0) {
    // Stepping off at the foot of the wall.
    const floor = supportAt(world, hero.x, hero.z, hero.y, T.stepHeight);
    if (y <= floor.height) {
      hero.y = floor.height; hero.mode = 'ground'; hero.groundId = floor.id; hero.climbId = '';
      hero.coyote = T.coyote; hero.climbCooldown = T.climbCooldown;
      return;
    }
    if (y < surface.minY) y = surface.minY;
  }
  const hold = surface.maxY - T.climbTop;
  if (y >= hold) {
    if (into > 0.2) {
      const topX = hero.x - nx * (T.radius + T.mantleInset);
      const topZ = hero.z - nz * (T.radius + T.mantleInset);
      const top = supportAt(world, topX, topZ, surface.maxY, T.stepHeight);
      if (top.height >= surface.maxY - T.stepHeight && top.bounce <= 0 && bodyFits(world, topX, topZ, top.height, T)) {
        hero.x = topX; hero.z = topZ; hero.y = top.height;
        hero.mode = 'ground'; hero.groundId = top.id; hero.climbId = '';
        hero.coyote = T.coyote; hero.hopAvailable = true;
        hero.events |= HERO_EVENT.mantle;
        return;
      }
    }
    y = hold;
  }
  hero.y = y;
  // Report the real motion on the wall; every way off the wall sets its own velocity above.
  hero.vy = (y - fromY) / dt;
  if (alongX) hero.vx = (along - was) / dt; else hero.vz = (along - was) / dt;
}

/** Advance one fixed step. The input state is never mutated. */
export function stepHero(world: TraversalWorld, state: HeroState, input: HeroInput, dt: number = TRAVERSAL_STEP, tuning: TraversalTuning = TUNING): HeroState {
  if (!finite(dt) || dt <= 0) return state;
  const T = tuning;
  const hero: HeroState = { ...state, events: 0, impact: 0 };
  let moveX = finite(input.moveX) ? input.moveX : 0;
  let moveZ = finite(input.moveZ) ? input.moveZ : 0;
  let magnitude = Math.sqrt(moveX * moveX + moveZ * moveZ);
  if (magnitude > 1) { moveX /= magnitude; moveZ /= magnitude; magnitude = 1; }
  const jumpHeld = input.jump === true;
  const power = input.power === true;
  const jumpPressed = jumpHeld && !state.jumpHeld;
  const powerPressed = power && !state.powerHeld;
  hero.jumpHeld = jumpHeld; hero.powerHeld = power;
  hero.jumpBuffer = jumpPressed ? T.jumpBuffer : Math.max(0, state.jumpBuffer - dt);
  hero.tetherCooldown = Math.max(0, state.tetherCooldown - dt);
  hero.climbCooldown = Math.max(0, state.climbCooldown - dt);
  hero.lastAnchorAge = state.lastAnchorAge + dt;
  if (hero.mode === 'catch') { stepCatch(world, hero, dt, T); return hero; }
  if (hero.mode === 'climb') stepClimb(world, hero, moveX, moveZ, jumpPressed, dt, T);
  else if (hero.mode === 'swing') stepSwing(world, hero, moveX, moveZ, magnitude, jumpPressed, power, dt, T);
  else {
    stepFree(world, hero, moveX, moveZ, magnitude, jumpPressed, jumpHeld, power, powerPressed, dt, T);
    tryClimb(world, hero, moveX, moveZ, magnitude, T);
  }
  const zone = waterAt(world, hero.x, hero.z);
  if ((zone && hero.y < T.catchDepth) || hero.y < -6 || !finite(hero.x) || !finite(hero.y) || !finite(hero.z)) {
    if (!finite(hero.x) || !finite(hero.y) || !finite(hero.z)) { hero.x = hero.safeX; hero.y = hero.safeY; hero.z = hero.safeZ; }
    beginCatch(world, hero);
  } else if (hero.mode === 'ground' && hero.groundTime >= T.safeDelay && hero.y > T.catchDepth) {
    hero.safeX = hero.x; hero.safeY = hero.y; hero.safeZ = hero.z; hero.safeYaw = hero.yaw;
  }
  return hero;
}

/** Cancel motion a paused or refocused player did not ask for; height and tether are kept. */
export function settleHero(state: HeroState): HeroState {
  if (state.mode !== 'ground') return { ...state, jumpHeld: false, powerHeld: false, jumpBuffer: 0 };
  return { ...state, vx: 0, vy: 0, vz: 0, jumpHeld: false, powerHeld: false, jumpBuffer: 0 };
}
