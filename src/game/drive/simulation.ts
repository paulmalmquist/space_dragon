import { DEFAULT_DRIVE_CONFIG, DRIVE_STEP } from './config.ts';
import type { DriveConfig } from './config.ts';
import { ROUTE, laneOffset, nearestRoutePoint, pointAtDistance } from './route.ts';

export interface DriveInput { throttle: number; brake: number; steer: number; handbrake: boolean; paused?: boolean; }
export const EMPTY_DRIVE_INPUT: Readonly<DriveInput> = Object.freeze({ throttle: 0, brake: 0, steer: 0, handbrake: false });
export interface DriveState {
  x: number; z: number; yaw: number; speed: number; velocityX: number; velocityZ: number;
  routeS: number; checkpointId: string; visited: string[]; completed: boolean; assist: boolean;
  stuckSeconds: number; bonkSeconds: number; elapsedSeconds: number;
}
export interface DriveObstacle { id: string; x: number; z: number; radius: number; }
const clamp = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, value));
const clean = (value: number, lo: number, hi: number) => Number.isFinite(value) ? clamp(value, lo, hi) : 0;
export function angleDelta(to: number, from: number): number { return Math.atan2(Math.sin(to - from), Math.cos(to - from)); }

export function createDriveState(assist = false): DriveState {
  return { ...ROUTE.spawn, speed: 0, velocityX: 0, velocityZ: 0, routeS: 0,
    checkpointId: 'home', visited: ['home'], completed: false, assist,
    stuckSeconds: 0, bonkSeconds: 0, elapsedSeconds: 0 };
}
export function resetDrive(state: DriveState): DriveState {
  const checkpoint = ROUTE.checkpoints.find(item => item.id === state.checkpointId) ?? ROUTE.checkpoints[0];
  return { ...state, x: checkpoint.x, z: checkpoint.z, yaw: checkpoint.yaw, routeS: checkpoint.s,
    speed: 0, velocityX: 0, velocityZ: 0, stuckSeconds: 0, bonkSeconds: 0 };
}

/** Idempotent ordered gates. No animation, audio or rendering callback awards progress. */
export function updateDriveCheckpoints(previous: DriveState, next: DriveState): DriveState {
  if (next.completed) return next;
  const expected = ROUTE.checkpoints[next.visited.length];
  if (expected) {
    const forwardCrossing = previous.routeS <= expected.s && next.routeS >= expected.s && next.routeS - previous.routeS < 12;
    const nearby = Math.hypot(next.x - expected.x, next.z - expected.z) < 11;
    if (forwardCrossing && nearby && Math.abs(angleDelta(next.yaw, expected.yaw)) < Math.PI / 2) {
      return { ...next, checkpointId: expected.id, visited: [...next.visited, expected.id] };
    }
  } else if (previous.routeS > ROUTE.length - 15 && next.routeS < 15 && next.speed > 0) {
    return { ...next, checkpointId: 'home', completed: true };
  }
  return next;
}

/** Exactly one 60 Hz tick. Presentation bounds catch-up; this function never reads wall time. */
export function stepDrive(
  state: DriveState, input: DriveInput, config: Readonly<DriveConfig> = DEFAULT_DRIVE_CONFIG,
  obstacles: readonly DriveObstacle[] = [],
): DriveState {
  if (input.paused) return state;
  if (![state.x, state.z, state.yaw, state.speed].every(Number.isFinite)) return resetDrive(state);
  const dt = DRIVE_STEP;
  const road = nearestRoutePoint(state.x, state.z, state.routeS);
  const section = ROUTE.sections[road.sectionIndex];
  const halfRoad = section.lanes * section.laneWidth + section.medianWidth / 2;
  const offroad = road.distance > halfRoad;
  const throttle = clean(input.throttle, 0, 1); const brake = clean(input.brake, 0, 1);
  let steer = clean(input.steer, -1, 1);
  const topSpeed = state.assist ? Math.min(config.topSpeed, config.assistTopSpeed) : config.topSpeed;
  const cap = topSpeed * (offroad ? config.offroadMultiplier : 1);
  let speed = state.speed;
  if (throttle > 0) speed += (speed < -0.05 ? config.braking : config.acceleration) * throttle * dt;
  if (brake > 0) {
    if (speed > 0) speed = Math.max(0, speed - config.braking * brake * dt);
    else speed -= config.acceleration * brake * dt;
  }
  if (throttle === 0 && brake === 0) speed *= Math.exp(-0.22 * dt);
  if (input.handbrake) speed *= Math.exp(-1.0 * dt);
  speed = clamp(speed, -config.reverseSpeed * (offroad ? config.offroadMultiplier : 1), cap);

  if (state.assist && speed > 0.1) {
    const lookahead = pointAtDistance(road.s + 10 + speed * 0.5);
    // Do not aim through the curb of a narrow connector before its wider junction.
    const targetOffset = Math.min(laneOffset(section), laneOffset(ROUTE.sections[lookahead.sectionIndex]));
    const targetX = lookahead.x + Math.cos(lookahead.yaw) * targetOffset;
    const targetZ = lookahead.z - Math.sin(lookahead.yaw) * targetOffset;
    const correction = angleDelta(Math.atan2(targetX - state.x, targetZ - state.z), state.yaw);
    // Assist is a nudge: the driver can still override it with full steering.
    steer = clamp(steer + clamp(correction * config.assistStrength, -0.55, 0.55), -1, 1);
    const lateral = Math.sin(angleDelta(state.yaw, road.yaw)) * speed;
    if (road.distance > halfRoad - 0.9 && road.signedOffset * lateral > 0) speed = Math.max(0, speed - config.braking * 2 * dt);
  }
  const sensitivity = 1 - (1 - config.highSpeedSteering) * clamp(Math.abs(speed) / config.topSpeed, 0, 1);
  const turnScale = Math.min(1, Math.abs(speed) / 3) * Math.sign(speed);
  const yaw = state.yaw + steer * config.steeringRate * sensitivity * turnScale * dt;
  const grip = 1 - Math.exp(-(input.handbrake ? config.handbrakeGrip : config.grip) * dt);
  let velocityX = state.velocityX + (Math.sin(yaw) * speed - state.velocityX) * grip;
  let velocityZ = state.velocityZ + (Math.cos(yaw) * speed - state.velocityZ) * grip;
  let x = state.x + velocityX * dt; let z = state.z + velocityZ * dt;
  let nearest = nearestRoutePoint(x, z, road.s);
  const nextSection = ROUTE.sections[nearest.sectionIndex];
  const nextHalfRoad = nextSection.lanes * nextSection.laneWidth + nextSection.medianWidth / 2;
  let bonked = false;
  const corridor = nextHalfRoad + config.corridorMargin;
  if (nearest.distance > corridor) {
    const scale = corridor / nearest.distance;
    x = nearest.x + (x - nearest.x) * scale; z = nearest.z + (z - nearest.z) * scale;
    bonked = true;
  }
  // Raised median is interrupted at turns and checkpoint intersections.
  const inIntersection = ROUTE.turns.some(turn => Math.abs(nearest.s - turn.s) < 38) ||
    ROUTE.checkpoints.some(checkpoint => Math.abs(nearest.s - checkpoint.s) < 18);
  const medianLimit = nextSection.medianWidth / 2 + 0.85;
  if (nextSection.medianWidth > 0 && !inIntersection && Math.abs(nearest.signedOffset) < medianLimit) {
    const side = road.signedOffset < 0 ? -1 : 1;
    x = nearest.x + Math.cos(nearest.yaw) * medianLimit * side;
    z = nearest.z - Math.sin(nearest.yaw) * medianLimit * side;
    bonked = true;
  }
  for (const obstacle of obstacles) {
    const dx = x - obstacle.x; const dz = z - obstacle.z; const length = Math.hypot(dx, dz);
    if (length >= obstacle.radius + 1) continue;
    const radius = obstacle.radius + 1;
    x = obstacle.x + (length > 0.001 ? dx / length : 1) * radius;
    z = obstacle.z + (length > 0.001 ? dz / length : 0) * radius;
    bonked = true;
  }
  if (bonked) { speed *= 0.35; velocityX *= 0.2; velocityZ *= 0.2; }
  nearest = nearestRoutePoint(x, z, nearest.s);
  const stuckSeconds = (throttle > 0.25 || brake > 0.25) && (bonked || Math.abs(speed) < 0.35)
    ? state.stuckSeconds + dt : 0;
  const next: DriveState = { ...state, x, z, yaw, speed, velocityX, velocityZ, routeS: nearest.s,
    stuckSeconds, bonkSeconds: bonked ? 0.35 : Math.max(0, state.bonkSeconds - dt), elapsedSeconds: state.elapsedSeconds + dt };
  if (stuckSeconds >= config.stuckResetSeconds) return resetDrive(next);
  return updateDriveCheckpoints(state, next);
}
