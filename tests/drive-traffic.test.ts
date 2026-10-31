import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE, HOME_EXIT_SIGNAL_S, nearestRoutePoint, pointAtDistance } from '../src/game/drive/route.ts';
import { advanceTrafficS, createTrafficState, nearbyTraffic, signalPhase, stepTraffic, TRAFFIC_SIGNALS, trafficCollisionProxies, trafficPose } from '../src/game/drive/traffic.ts';
import type { PlayerDriveState, TrafficState, TrafficVehicle } from '../src/game/drive/traffic.ts';

const straight = ROUTE.sections[1].startS + 200;
const away: PlayerDriveState = { x: 10000, z: 10000, yaw: 0, speed: 0, elapsedSeconds: 0 };
const vehicle = (s: number, overrides: Partial<TrafficVehicle> = {}): TrafficVehicle => ({
  id: 'test-car', s, direction: 1, lane: 0, speed: 14, cruiseSpeed: 14,
  braking: false, kind: 'sedan', colorIndex: 0, ...overrides,
});
const stateWith = (vehicles: TrafficVehicle[], elapsedSeconds = 0): TrafficState => ({ vehicles, elapsedSeconds, accumulatorSeconds: 0 });
function advance(state: TrafficState, seconds: number, player: PlayerDriveState = away) {
  const ticks = Math.round(seconds * 60);
  for (let i = 0; i < ticks; i++) state = stepTraffic(state, { ...player, elapsedSeconds: state.elapsedSeconds + 1 / 60 });
  return state;
}

function trafficRoadAt(pose:{x:number;z:number;s:number}) {
  const s=((pose.s%ROUTE.length)+ROUTE.length)%ROUTE.length;
  const bridge=ROUTE.trafficBridge;
  if(s>=bridge.toS&&s<bridge.fromS)return nearestRoutePoint(pose.x,pose.z,s);
  let best={distance:Infinity,signedOffset:0,sectionIndex:0,yaw:0};
  for(let i=1;i<bridge.points.length;i++) {
    const a=bridge.points[i-1],b=bridge.points[i],dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((pose.x-a.x)*dx+(pose.z-a.z)*dz)/(dx*dx+dz*dz)));
    const x=a.x+dx*t,z=a.z+dz*t,distance=Math.hypot(pose.x-x,pose.z-z),yaw=Math.atan2(dx,dz);
    if(distance<best.distance)best={distance,yaw,sectionIndex:0,signedOffset:(pose.x-x)*Math.cos(yaw)-(pose.z-z)*Math.sin(yaw)};
  }
  return best;
}

test('traffic is deterministic, distributed across every leg and both right-hand carriageways', () => {
  const state = createTrafficState();
  assert.deepEqual(state, createTrafficState());
  assert.equal(state.vehicles.length, 64);
  assert.equal(new Set(state.vehicles.map(car => car.id)).size, 64);
  for (const section of ROUTE.sections.slice(1, 5)) {
    const cars = state.vehicles.filter(car => car.s > section.startS && car.s < section.endS);
    assert.ok(cars.some(car => car.direction === 1));
    assert.ok(cars.some(car => car.direction === -1));
    assert.ok(new Set(cars.map(car => car.lane)).size > 1);
  }
  for (const direction of [1, -1] as const) for (const lane of [0, 1, 2]) {
    const car = vehicle(straight, { direction, lane });
    const pose = trafficPose(car); const road = trafficRoadAt(pose);
    assert.equal(Math.sign(road.signedOffset), direction);
    assert.ok(Math.cos(pose.yaw - road.yaw) * direction > 0.99);
  }
  const at = pointAtDistance(straight);
  const inFront = nearbyTraffic(state, at.x, at.z).filter(car => {
    if(car.s<at.s||car.s>at.s+400)return false;
    const pose = trafficPose(car);
    return (pose.x - at.x) * Math.sin(at.yaw) + (pose.z - at.z) * Math.cos(at.yaw) > 0;
  });
  assert.ok(inFront.length >= 6);
  assert.ok(inFront.length <= 12);
});

test('signal locations match world junctions and phase boundaries wrap predictably', () => {
  const expected = [HOME_EXIT_SIGNAL_S, ...[2,3,4].map(index=>ROUTE.turns.find(turn=>turn.toSection===index&&turn.fromSection!==index)!.s-30), ROUTE.sections[2].startS+180].sort((a,b)=>a-b);
  assert.deepEqual(TRAFFIC_SIGNALS.map(signal => signal.s), expected);
  for(const signal of TRAFFIC_SIGNALS) assert.ok(signal.streetName.length>0,'junction names must be explicit');
  const signal = { ...TRAFFIC_SIGNALS[0], offsetSeconds: 0 };
  assert.equal(signalPhase(signal, 0), 'green');
  assert.equal(signalPhase(signal, 19.999), 'green');
  assert.equal(signalPhase(signal, 20), 'amber');
  assert.equal(signalPhase(signal, 23), 'red');
  assert.equal(signalPhase(signal, 30.999), 'red');
  assert.equal(signalPhase(signal, 31), 'green');
});

test('red signals stop a car before the line in both directions and green releases it', () => {
  const signal = TRAFFIC_SIGNALS[2];
  const redStart = 23 - signal.offsetSeconds + 31;
  for (const direction of [1, -1] as const) {
    const line = signal.s - direction * 12;
    let state = stateWith([vehicle(line - direction * 28, { direction, speed: 10 })], redStart);
    state = advance(state, 7);
    assert.ok(direction * (line - state.vehicles[0].s) >= -1e-6, 'front must stay before the red stop line');
    assert.equal(state.vehicles[0].speed, 0);
    assert.equal(state.vehicles[0].braking, true);
    state = advance(state, 8);
    assert.ok(state.vehicles[0].speed > 3, 'green restarts queued traffic');
    assert.ok(direction * (state.vehicles[0].s - line) > 0);
  }
});

test('traffic queues behind a stationary leader without passing or overlap', () => {
  let state = stateWith([vehicle(straight, { id: 'leader', speed: 0, cruiseSpeed: 0 }), vehicle(straight - 35, { id: 'follower' })]);
  state = advance(state, 12);
  assert.equal(state.vehicles[0].s, straight);
  assert.ok(state.vehicles[1].s <= straight - 7.5);
  assert.ok(state.vehicles[1].speed < 0.25);
  assert.equal(state.vehicles[1].braking, true);
});

test('player ahead blocks the same lane while an adjacent lane and opposite road remain free', () => {
  const playerPose = trafficPose(vehicle(straight + 30));
  const player = { ...playerPose, speed: 0, elapsedSeconds: 0 };
  let state = stateWith([vehicle(straight - 5, { id: 'behind' }), vehicle(straight - 5, { id: 'adjacent', lane: 1 }), vehicle(straight + 60, { id: 'opposite', direction: -1 })]);
  state = advance(state, 10, player);
  assert.ok(state.vehicles[0].s <= straight + 22.5);
  assert.ok(state.vehicles[0].speed < 0.25);
  assert.ok(state.vehicles[1].s > straight + 50);
  assert.ok(state.vehicles[2].s < straight);
});

test('clock pause is exact, substeps are frame-independent, and a clock rewind never moves cars', () => {
  const initial = stateWith([vehicle(straight)]);
  assert.equal(stepTraffic(initial, away), initial);
  const split = advance(initial, 1);
  const batched = stepTraffic(initial, { ...away, elapsedSeconds: 1 });
  assert.ok(Math.abs(split.vehicles[0].s - batched.vehicles[0].s) < 1e-9);
  assert.equal(split.vehicles[0].speed, batched.vehicles[0].speed);
  assert.equal(stepTraffic(split, { ...away, elapsedSeconds: split.elapsedSeconds }), split);
  const rewound = stepTraffic(split, away);
  assert.deepEqual(rewound.vehicles, split.vehicles);
  assert.equal(rewound.elapsedSeconds, 0);
});

test('both directions wrap around the loop without escaping the route', () => {
  const initial = stateWith([vehicle(ROUTE.length - 1, { id: 'forward' }), vehicle(1, { id: 'reverse', direction: -1 })]);
  const state = advance(initial, 1);
  assert.ok(state.vehicles[0].s < ROUTE.trafficBridge.toS+20);
  assert.ok(state.vehicles[1].s > ROUTE.trafficBridge.fromS);
  for (const car of state.vehicles) {
    const pose = trafficPose(car);
    assert.ok([pose.x, pose.z, pose.yaw].every(Number.isFinite));
    assert.ok(Math.abs(trafficRoadAt(pose).signedOffset) < 5);
  }
});

test('every lane transition and loop seam stays inside the curb with continuous poses in both directions', () => {
  for (const section of ROUTE.sections) for (const direction of [1, -1] as const) for (const lane of [0, 1, 2]) {
    const join = section.startS;
    let previous = trafficPose(vehicle(join - 80, { lane, direction }));
    for (let s = join - 79.5; s <= join + 80; s += 0.5) {
      const pose = trafficPose(vehicle(s, { lane, direction }));
      const road = trafficRoadAt(pose);
      const current = ROUTE.sections[road.sectionIndex];
      const halfRoad = current.medianWidth / 2 + current.lanes * current.laneWidth;
      assert.ok(Math.abs(road.signedOffset) + 1 <= halfRoad + 0.05,
        `${section.id}, lane ${lane}, direction ${direction}, distance ${s - join}: car footprint must remain inside curb`);
      assert.ok(Math.hypot(pose.x - previous.x, pose.z - previous.z) < 1.1, 'merge must not jump sideways');
      previous = pose;
    }
  }
});

test('collision proxies stay near the player and use a narrow three-disc car footprint', () => {
  const near = vehicle(straight); const far = vehicle(straight + 500, { id: 'far' }); const pose = trafficPose(near);
  const proxies = trafficCollisionProxies(stateWith([near, far]), pose.x, pose.z);
  assert.equal(proxies.length, 3);
  assert.equal(new Set(proxies.map(proxy => proxy.id)).size, 3);
  for (const proxy of proxies) {
    assert.equal(proxy.radius, 0.9);
    assert.ok(Math.hypot(proxy.x - pose.x, proxy.z - pose.z) <= 1.11);
  }
});

test('a full traffic population keeps circulating through signals and merges without deadlock', () => {
  const initial = createTrafficState();
  const final = advance(initial, 90);
  for (let index = 0; index < final.vehicles.length; index++) {
    const car = final.vehicles[index];
    const progress = ((car.s - initial.vehicles[index].s) * car.direction + ROUTE.length) % ROUTE.length;
    assert.ok(progress > 200, `${car.id} should not remain stuck at a merge or red light`);
    assert.ok(car.s >= 0 && car.s < ROUTE.length);
    assert.ok(Number.isFinite(car.speed) && car.speed >= 0 && car.speed <= 16);
    assert.ok(Object.values(trafficPose(car)).every(Number.isFinite));
  }
});


test('ambient traffic bridges Green Island continuously and never enters the shared dead-end stem',()=> {
  const bridge=ROUTE.trafficBridge;
  for(const direction of [1,-1] as const)for(const lane of [0,1,2]) {
    let s=advanceTrafficS(bridge.fromS,-20),previous=trafficPose(vehicle(s,{direction,lane}));
    for(let metres=.5;metres<bridge.length+40;metres+=.5) {
      s=advanceTrafficS(s,.5);const pose=trafficPose(vehicle(s,{direction,lane}));
      assert.ok(Math.hypot(pose.x-previous.x,pose.z-previous.z)<.85,'bridge poses must advance smoothly in physical metres');
      assert.ok(Math.hypot(pose.x,pose.z)>25,'ambient vehicles must stay out of the cul-de-sac and home stem');
      const road=trafficRoadAt(pose);assert.ok(Math.abs(road.signedOffset)+1<=ROUTE.sections[0].laneWidth+.1);
      previous=pose;
    }
  }
  const midpoint=advanceTrafficS(bridge.fromS,bridge.length/2);
  for(const direction of [1,-1] as const) {
    const car=vehicle(advanceTrafficS(midpoint,-direction*8),{direction,speed:8,cruiseSpeed:8});
    const start=trafficPose(car),end=trafficPose(advance(stateWith([car]),1).vehicles[0]);
    const moved=Math.hypot(end.x-start.x,end.z-start.z);
    assert.ok(moved>7&&moved<9,'bridge must not accelerate NPCs by its compressed route-coordinate scale');
  }
});

test('a player parked in the court does not hold up Green Island traffic',()=> {
  const s=advanceTrafficS(ROUTE.trafficBridge.fromS,2);
  const initial=stateWith([vehicle(s,{speed:8,cruiseSpeed:8})]);
  const home={...ROUTE.spawn,routeS:0,speed:0,elapsedSeconds:0};
  const withPlayer=advance(initial,3,home),withoutPlayer=advance(initial,3);
  assert.deepEqual(withPlayer.vehicles,withoutPlayer.vehicles);
});

test('pose queries remain independent and update for every editable pose input',()=> {
  const car=vehicle(straight),state=stateWith([car]);
  const original=trafficPose(car);
  const changed=trafficPose(car);changed.x=100000;changed.yaw=100;
  assert.deepEqual(trafficPose(car),original,'presentation edits must not corrupt future collision or render queries');
  for(const edit of [()=>{car.s+=25;},()=>{car.lane=2;},()=>{car.direction=-1 as const;}]) {
    edit();const fresh=trafficPose({...car});
    assert.deepEqual(trafficPose(car),fresh);
    assert.equal(nearbyTraffic(state,fresh.x,fresh.z,.01).length,1);
    const proxies=trafficCollisionProxies(state,fresh.x,fresh.z,1);
    assert.equal(proxies.length,3);assert.equal(proxies[1].x,fresh.x);assert.equal(proxies[1].z,fresh.z);
  }
});
