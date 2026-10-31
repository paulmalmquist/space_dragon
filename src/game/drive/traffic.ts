import { ROUTE, HOME_EXIT_SIGNAL_S, nearestRoutePoint, pointAtDistance } from './route.ts';
import type { RouteSample } from './route.ts';
import type { DriveObstacle } from './simulation.ts';

/** Ambient traffic has no save, campaign, rendering or wall-clock dependency. */
export interface PlayerDriveState { x: number; z: number; yaw: number; speed: number; elapsedSeconds: number; routeS?: number; }
export interface TrafficVehicle {
  id: string; s: number; direction: 1 | -1; lane: number; speed: number; cruiseSpeed: number;
  braking: boolean; kind: 'sedan' | 'suv' | 'van'; colorIndex: number;
}
export interface TrafficState { vehicles: readonly TrafficVehicle[]; elapsedSeconds: number; accumulatorSeconds: number; }
export interface TrafficSignal { id: string; s: number; offsetSeconds: number; streetName: string; }
export type TrafficSignalPhase = 'green' | 'amber' | 'red';

const STEP = 1 / 30;
const ACCELERATION = 2.2;
const BRAKING = 5.5;
const FOLLOW_GAP = 7.6; // Two 4.4 m cars plus a 3.2 m bumper gap, measured centre-to-centre.
const STOP_OFFSET = 12; // Vehicle centre remains before the crossing at junction minus 8 m.
const mod = (value: number, period = ROUTE.length) => ((value % period) + period) % period;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
// NPCs circulate straight through Green Island instead of duplicating the player's
// out/back dead-end branch. Public s remains a player-route coordinate; metre gaps
// and movement use this shorter physical circuit, including its continuous bridge.
const bridge=ROUTE.trafficBridge;
const mainLength=bridge.fromS-bridge.toS;
const skippedLength=ROUTE.length-mainLength;
const bridgeSegments=bridge.points.slice(1).map((b,index)=> {
  const a=bridge.points[index];return {a,b,length:Math.hypot(b.x-a.x,b.z-a.z),start:0,yaw:Math.atan2(b.x-a.x,b.z-a.z)};
});
let measuredBridgeLength=0;
for(const segment of bridgeSegments){segment.start=measuredBridgeLength;measuredBridgeLength+=segment.length;}
export const TRAFFIC_CIRCUIT_LENGTH=mainLength+measuredBridgeLength;
const onBridge=(s:number)=> {const value=mod(s);return value>=bridge.fromS||value<bridge.toS;};
function trafficDistanceAt(s:number) {
  const value=mod(s);return onBridge(value)?mainLength+mod(value-bridge.fromS)/skippedLength*measuredBridgeLength:value-bridge.toS;
}
function routeDistanceAt(s:number) {
  const value=mod(s,TRAFFIC_CIRCUIT_LENGTH);
  return value<mainLength?bridge.toS+value:mod(bridge.fromS+(value-mainLength)/measuredBridgeLength*skippedLength);
}
/** Advance real travelled metres while retaining route-compatible public coordinates. */
export function advanceTrafficS(s:number,metres:number):number{return routeDistanceAt(trafficDistanceAt(s)+metres);}
function trafficCenterAt(s:number):RouteSample {
  const value=mod(s);if(!onBridge(value))return pointAtDistance(value);
  const d=trafficDistanceAt(value)-mainLength;
  const segment=bridgeSegments.find(item=>d<item.start+item.length)??bridgeSegments.at(-1)!;
  const t=clamp((d-segment.start)/segment.length,0,1);
  return {x:segment.a.x+(segment.b.x-segment.a.x)*t,z:segment.a.z+(segment.b.z-segment.a.z)*t,
    yaw:segment.yaw,s:value,sectionIndex:0};
}
const ahead=(from:number,to:number,direction:1|-1)=>mod((trafficDistanceAt(to)-trafficDistanceAt(from))*direction,TRAFFIC_CIRCUIT_LENGTH);

export const TRAFFIC_SIGNALS: readonly TrafficSignal[] = Object.freeze([
  ...ROUTE.checkpoints.slice(1).map((checkpoint,index)=> {
    const sectionIndex=index+1;
    const turn=ROUTE.turns.find(item=>item.toSection===sectionIndex&&item.fromSection!==sectionIndex);
    return {id:`traffic-signal.${checkpoint.id}`,s:sectionIndex===1?HOME_EXIT_SIGNAL_S:(turn?.s??checkpoint.s)-30,
      streetName:ROUTE.sections[sectionIndex].label};
  }),
  {id:'traffic-signal.canopy-midpoint',s:ROUTE.sections.find(section=>section.id==='leg-2')!.startS+180,streetName:ROUTE.sections[2].label},
].sort((a,b)=>a.s-b.s).map((signal,index)=>Object.freeze({...signal,offsetSeconds:index*5})));

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
  const point = trafficCenterAt(wrapped);
  if (onBridge(wrapped)) return sectionOffset(0,lane);
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
  const point = trafficCenterAt(s);
  // The route is sampled as short chords; average the tangent to keep offset lanes continuous.
  const before = trafficCenterAt(advanceTrafficS(s,-4)); const after = trafficCenterAt(advanceTrafficS(s,4));
  const yaw = Math.atan2(after.x - before.x, after.z - before.z);
  const offset = laneOffsetAt(s, lane) * direction;
  return { ...point, x: point.x + Math.cos(yaw) * offset, z: point.z - Math.sin(yaw) * offset };
}

// Physics updates replace vehicles, while rendering and collision queries reuse
// them several times in a frame. Retain the sampled curve only for that identity
// and pose input; explicit keys also support callers editing a diagnostic vehicle.
const poseCache = new WeakMap<TrafficVehicle, { s: number; direction: number; lane: number; pose: RouteSample }>();
function cachedTrafficPose(vehicle: TrafficVehicle): RouteSample {
  const cached = poseCache.get(vehicle);
  if (cached && cached.s === vehicle.s && cached.direction === vehicle.direction && cached.lane === vehicle.lane) return cached.pose;
  const point = positionAt(vehicle.s, vehicle.direction, vehicle.lane);
  const before = positionAt(advanceTrafficS(vehicle.s,-vehicle.direction * 0.8), vehicle.direction, vehicle.lane);
  const after = positionAt(advanceTrafficS(vehicle.s,vehicle.direction * 0.8), vehicle.direction, vehicle.lane);
  const pose = { ...point, yaw: Math.atan2(after.x - before.x, after.z - before.z) };
  poseCache.set(vehicle, { s: vehicle.s, direction: vehicle.direction, lane: vehicle.lane, pose });
  return pose;
}

export function trafficPose(vehicle: TrafficVehicle): RouteSample {
  // Keep the cache private even when a caller adjusts its returned presentation pose.
  return { ...cachedTrafficPose(vehicle) };
}

export function createTrafficState(elapsedSeconds = 0, count = 64): TrafficState {
  const total = Number.isFinite(count) ? Math.round(clamp(count, 0, 96)) : 64;
  const realStart = ROUTE.sections[1].startS;
  const realEnd = ROUTE.sections[4].endS;
  const realCount = Math.round(total * 0.78);
  const connectorCount = total - realCount;
  const realLength = realEnd - realStart;
  const connectorLength = TRAFFIC_CIRCUIT_LENGTH - realLength;
  const vehicles = Array.from({ length: total }, (_, index): TrafficVehicle => {
    const direction = index % 2 === 0 ? 1 : -1;
    const jitter = Math.sin(index * 12.9898 + 4.2) * 6;
    const s = index < realCount
      ? realStart + (index + 0.5) * realLength / Math.max(1, realCount) + jitter
      : advanceTrafficS(realEnd,(index - realCount + 0.5) * connectorLength / Math.max(1, connectorCount) + jitter);
    const cruiseSpeed = 12 + (index * 7 % 9) * 0.5;
    return {
      id: `traffic.${String(index).padStart(3, '0')}`, s, direction,
      // Keep the player's inside lane mostly available; right-hand outer lanes carry more traffic.
      lane: direction === 1 ? (index % 10 === 0 ? 0 : 1 + Math.floor(index / 2) % 2) : Math.floor(index / 2) % 3,
      speed: ROUTE.sections[trafficCenterAt(s).sectionIndex].character === 'neighborhood' ? 8 : cruiseSpeed, cruiseSpeed,
      braking: false, kind: index % 7 === 0 ? 'van' : index % 3 === 0 ? 'suv' : 'sedan', colorIndex: index % 8,
    };
  });
  return { vehicles, elapsedSeconds: Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0, accumulatorSeconds: 0 };
}

function tick(vehicles: readonly TrafficVehicle[], player: PlayerDriveState, elapsedSeconds: number): TrafficVehicle[] {
  let playerRoad=nearestRoutePoint(player.x,player.z,player.routeS);
  if(onBridge(playerRoad.s)) {
    let best=Infinity;
    for(const segment of bridgeSegments) {
      const dx=segment.b.x-segment.a.x,dz=segment.b.z-segment.a.z;
      const t=clamp(((player.x-segment.a.x)*dx+(player.z-segment.a.z)*dz)/(segment.length**2),0,1);
      const x=segment.a.x+dx*t,z=segment.a.z+dz*t,distance=Math.hypot(player.x-x,player.z-z);
      if(distance>=best)continue;best=distance;
      playerRoad={x,z,yaw:segment.yaw,s:routeDistanceAt(mainLength+segment.start+t*segment.length),sectionIndex:0,distance,
        signedOffset:(player.x-x)*Math.cos(segment.yaw)-(player.z-z)*Math.sin(segment.yaw)};
    }
  }
  const playerSection=ROUTE.sections[playerRoad.sectionIndex];
  const playerOnRoad=playerRoad.distance<playerSection.lanes*playerSection.laneWidth+playerSection.medianWidth/2+1.5;
  return vehicles.map(vehicle => {
    const point = trafficCenterAt(vehicle.s);
    const lookahead = trafficCenterAt(advanceTrafficS(vehicle.s,vehicle.direction * 28));
    const section = ROUTE.sections[point.sectionIndex];
    let targetSpeed = Math.min(vehicle.cruiseSpeed, section.character === 'neighborhood' ? 9 : 16);
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
    return { ...vehicle, s: travel>0?advanceTrafficS(vehicle.s,travel * vehicle.direction):vehicle.s, speed,
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
    const point = cachedTrafficPose(vehicle);
    return Math.hypot(point.x - x, point.z - z) <= radius;
  });
}

/** Narrow 1.8×4 m footprint, compatible with the player's forgiving circle collision solver. */
export function trafficCollisionProxies(state: TrafficState, x: number, z: number, radius = 45): DriveObstacle[] {
  return nearbyTraffic(state, x, z, radius).flatMap(vehicle => {
    const pose = cachedTrafficPose(vehicle);
    return [-1.1, 0, 1.1].map((along, index) => ({ id: `${vehicle.id}.body.${index}`,
      x: pose.x + Math.sin(pose.yaw) * along, z: pose.z + Math.cos(pose.yaw) * along, radius: 0.9 }));
  });
}
