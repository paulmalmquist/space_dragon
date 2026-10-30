import { ROUTE, nearestRoutePoint, pointAtDistance } from './route.ts';
import type { RouteSample } from './route.ts';
import type { DriveObstacle } from './simulation.ts';

/** Ambient traffic has no save, campaign, rendering or wall-clock dependency. */
export interface PlayerDriveState { x: number; z: number; yaw: number; speed: number; elapsedSeconds: number; }
export interface TrafficVehicle {
  id: string; s: number; direction: 1 | -1; lane: number; speed: number; cruiseSpeed: number;
  braking: boolean; kind: 'sedan' | 'suv' | 'van'; colorIndex: number;
}
export interface TrafficState { vehicles: readonly TrafficVehicle[]; elapsedSeconds: number; accumulatorSeconds: number; }
export interface TrafficSignal { id: string; s: number; offsetSeconds: number; }
export type TrafficSignalPhase = 'green' | 'amber' | 'red';

const STEP = 1 / 30;
const ACCELERATION = 2.2;
const BRAKING = 5.5;
const FOLLOW_GAP = 7.6; // Two 4.4 m cars plus a 3.2 m bumper gap, measured centre-to-centre.
const STOP_OFFSET = 12; // Vehicle centre remains before the crossing at junction minus 8 m.
const mod = (value: number, period = ROUTE.length) => ((value % period) + period) % period;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const ahead = (from: number, to: number, direction: 1 | -1) => mod((to - from) * direction);

export const TRAFFIC_SIGNALS: readonly TrafficSignal[] = Object.freeze([
  ...ROUTE.checkpoints.filter(point => point.s >= 80).map(point => ({ id: `traffic-signal.${point.id}`, s: point.s })),
  { id: 'traffic-signal.canopy-midpoint', s: ROUTE.sections.find(section => section.id === 'leg-2')!.startS + 180 },
].sort((a, b) => a.s - b.s).map((signal, index) => Object.freeze({ ...signal, offsetSeconds: index * 5 })));

/** Both route directions share green; red represents the cross street's turn. */
export function signalPhase(signal: TrafficSignal, elapsedSeconds: number): TrafficSignalPhase {
  const phase = mod((Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0) + signal.offsetSeconds, 31);
  return phase < 20 ? 'green' : phase < 23 ? 'amber' : 'red';
}

function sectionOffset(sectionIndex: number, lane: number) {
  const section = ROUTE.sections[sectionIndex];
  return section.medianWidth / 2 + (clamp(lane, 0, section.lanes - 1) + 0.5) * section.laneWidth;
}

function laneOffsetAt(s: number, lane: number): number {
  const wrapped = mod(s);
  const point = pointAtDistance(wrapped);
  // The road changes width at its section boundary. Finish narrowing on the wide
  // approach, and expand only after entering a wider road; centred blends cross curbs.
  for (let index = 1; index < ROUTE.sections.length; index++) {
    const delta = wrapped - ROUTE.sections[index].startS;
    const before = sectionOffset(index - 1, lane);
    const after = sectionOffset(index, lane);
    if (Math.abs(delta) >= 72 || before === after) continue;
    const t = clamp(after < before ? (delta + 72) / 72 : delta / 72, 0, 1);
    const eased = t * t * (3 - 2 * t);
    return before * (1 - eased) + after * eased;
  }
  return sectionOffset(point.sectionIndex, lane);
}

function positionAt(s: number, direction: 1 | -1, lane: number): RouteSample {
  const point = pointAtDistance(s);
  // The route is sampled as short chords; average the tangent to keep offset lanes continuous.
  const before = pointAtDistance(s - 4); const after = pointAtDistance(s + 4);
  const yaw = Math.atan2(after.x - before.x, after.z - before.z);
  const offset = laneOffsetAt(s, lane) * direction;
  return { ...point, x: point.x + Math.cos(yaw) * offset, z: point.z - Math.sin(yaw) * offset };
}

export function trafficPose(vehicle: TrafficVehicle): RouteSample {
  const point = positionAt(vehicle.s, vehicle.direction, vehicle.lane);
  const before = positionAt(vehicle.s - vehicle.direction * 0.8, vehicle.direction, vehicle.lane);
  const after = positionAt(vehicle.s + vehicle.direction * 0.8, vehicle.direction, vehicle.lane);
  return { ...point, yaw: Math.atan2(after.x - before.x, after.z - before.z) };
}

export function createTrafficState(elapsedSeconds = 0, count = 64): TrafficState {
  const total = Number.isFinite(count) ? Math.round(clamp(count, 0, 96)) : 64;
  const realStart = ROUTE.sections[1].startS;
  const realEnd = ROUTE.sections[4].endS;
  const realCount = Math.round(total * 0.78);
  const connectorCount = total - realCount;
  const realLength = realEnd - realStart;
  const connectorLength = ROUTE.length - realLength;
  const vehicles = Array.from({ length: total }, (_, index): TrafficVehicle => {
    const direction = index % 2 === 0 ? 1 : -1;
    const jitter = Math.sin(index * 12.9898 + 4.2) * 6;
    const s = index < realCount
      ? realStart + (index + 0.5) * realLength / Math.max(1, realCount) + jitter
      : mod(realEnd + (index - realCount + 0.5) * connectorLength / Math.max(1, connectorCount) + jitter);
    const cruiseSpeed = 12 + (index * 7 % 9) * 0.5;
    return {
      id: `traffic.${String(index).padStart(3, '0')}`, s, direction,
      // Keep the player's inside lane mostly available; right-hand outer lanes carry more traffic.
      lane: direction === 1 ? (index % 10 === 0 ? 0 : 1 + Math.floor(index / 2) % 2) : Math.floor(index / 2) % 3,
      speed: pointAtDistance(s).sectionIndex === 5 ? 8 : cruiseSpeed, cruiseSpeed,
      braking: false, kind: index % 7 === 0 ? 'van' : index % 3 === 0 ? 'suv' : 'sedan', colorIndex: index % 8,
    };
  });
  return { vehicles, elapsedSeconds: Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0, accumulatorSeconds: 0 };
}

function tick(vehicles: readonly TrafficVehicle[], player: PlayerDriveState, elapsedSeconds: number): TrafficVehicle[] {
  const playerRoad = nearestRoutePoint(player.x, player.z);
  const playerOnRoad = playerRoad.distance < 20;
  return vehicles.map(vehicle => {
    const point = pointAtDistance(vehicle.s);
    const lookahead = pointAtDistance(vehicle.s + vehicle.direction * 28);
    const section = ROUTE.sections[point.sectionIndex];
    let targetSpeed = Math.min(vehicle.cruiseSpeed, section.invented ? 9 : 16);
    if (Math.cos(lookahead.yaw - point.yaw) < 0.91) targetSpeed = Math.min(targetSpeed, 7.5);
    let maxTravel = Infinity;
    let blocked = false;
    function limitForGap(gap: number, leaderSpeed: number) {
      gap = Math.max(0, gap);
      maxTravel = Math.min(maxTravel, gap);
      targetSpeed = Math.min(targetSpeed, Math.sqrt(leaderSpeed ** 2 + 2 * BRAKING * gap), leaderSpeed + gap / 1.4);
      if (gap < 0.25 && leaderSpeed < 0.1) targetSpeed = 0;
      if (targetSpeed < 0.25) blocked = true;
    }
    for (const signal of TRAFFIC_SIGNALS) {
      const phase = signalPhase(signal, elapsedSeconds);
      if (phase === 'green') continue;
      const gap = ahead(vehicle.s, signal.s - vehicle.direction * STOP_OFFSET, vehicle.direction);
      if (gap > 90) continue;
      // On amber, continue only when already too close for comfortable braking.
      if (phase === 'amber' && gap < vehicle.speed ** 2 / (2 * BRAKING) + 2) continue;
      limitForGap(gap, 0);
    }
    for (const leader of vehicles) {
      if (leader.id === vehicle.id || leader.direction !== vehicle.direction) continue;
      const gap = ahead(vehicle.s, leader.s, vehicle.direction);
      if (gap > 110) continue;
      // Compare the lane at the leader's position, so merging lanes begin yielding early.
      if (Math.abs(laneOffsetAt(leader.s, vehicle.lane) - laneOffsetAt(leader.s, leader.lane)) > 2.15) continue;
      limitForGap(gap - FOLLOW_GAP, leader.speed);
    }
    if (playerOnRoad) {
      const gap = ahead(vehicle.s, playerRoad.s, vehicle.direction);
      const carOffset = laneOffsetAt(playerRoad.s, vehicle.lane) * vehicle.direction;
      if (gap < 100 && Math.abs(playerRoad.signedOffset - carOffset) < 2.25) {
        const playerSpeed = Math.max(0, player.speed * Math.cos(player.yaw - playerRoad.yaw) * vehicle.direction);
        limitForGap(gap - FOLLOW_GAP, playerSpeed);
      }
    }
    let speed = vehicle.speed + clamp(targetSpeed - vehicle.speed, -BRAKING * STEP, ACCELERATION * STEP);
    speed = Math.max(0, speed);
    let travel = speed * STEP;
    if (travel > maxTravel) { travel = maxTravel; speed = 0; blocked = true; }
    return { ...vehicle, s: mod(vehicle.s + travel * vehicle.direction), speed,
      braking: speed < vehicle.speed - 0.02 || (speed < 0.25 && blocked) };
  });
}

/** Fixed 30 Hz traffic, advanced only by the player's authoritative simulation clock. */
export function stepTraffic(state: TrafficState, player: PlayerDriveState): TrafficState {
  if (![player.elapsedSeconds, player.x, player.z, player.yaw, player.speed].every(Number.isFinite)) return state;
  const elapsed = player.elapsedSeconds - state.elapsedSeconds;
  if (elapsed === 0) return state;
  // Loading/seeking a clock never creates a large surprise jump; ordinary 60 Hz ticks are exact.
  if (elapsed < 0 || elapsed > 2) return { ...state, elapsedSeconds: player.elapsedSeconds, accumulatorSeconds: 0 };
  const accumulated = state.accumulatorSeconds + elapsed;
  const steps = Math.floor((accumulated + 1e-9) / STEP);
  let vehicles = state.vehicles;
  const startTime = state.elapsedSeconds - state.accumulatorSeconds;
  for (let index = 0; index < steps; index++) vehicles = tick(vehicles, player, startTime + (index + 1) * STEP);
  return { vehicles, elapsedSeconds: player.elapsedSeconds, accumulatorSeconds: Math.max(0, accumulated - steps * STEP) };
}

export function nearbyTraffic(state: TrafficState, x: number, z: number, radius = 400): TrafficVehicle[] {
  return state.vehicles.filter(vehicle => {
    const point = trafficPose(vehicle);
    return Math.hypot(point.x - x, point.z - z) <= radius;
  });
}

/** Narrow 1.8×4 m footprint, compatible with the player's forgiving circle collision solver. */
export function trafficCollisionProxies(state: TrafficState, x: number, z: number, radius = 45): DriveObstacle[] {
  return nearbyTraffic(state, x, z, radius).flatMap(vehicle => {
    const pose = trafficPose(vehicle);
    return [-1.1, 0, 1.1].map((along, index) => ({ id: `${vehicle.id}.body.${index}`,
      x: pose.x + Math.sin(pose.yaw) * along, z: pose.z + Math.cos(pose.yaw) * along, radius: 0.9 }));
  });
}
