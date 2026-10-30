import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE, nearestRoutePoint, pointAtDistance } from '../src/game/drive/route.ts';
import { createTrafficState, nearbyTraffic, signalPhase, stepTraffic, TRAFFIC_SIGNALS, trafficCollisionProxies, trafficPose } from '../src/game/drive/traffic.ts';
import type { PlayerDriveState, TrafficState, TrafficVehicle } from '../src/game/drive/traffic.ts';

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
    const car = vehicle(350, { direction, lane });
    const pose = trafficPose(car); const road = nearestRoutePoint(pose.x, pose.z);
    assert.equal(Math.sign(road.signedOffset), direction);
    assert.ok(Math.cos(pose.yaw - road.yaw) * direction > 0.99);
  }
  const at = pointAtDistance(350);
  const inFront = nearbyTraffic(state, at.x, at.z).filter(car => {
    const pose = trafficPose(car);
    return (pose.x - at.x) * Math.sin(at.yaw) + (pose.z - at.z) * Math.cos(at.yaw) > 0;
  });
  assert.ok(inFront.length >= 6);
  assert.ok(inFront.length <= 12);
});

test('signal locations match world junctions and phase boundaries wrap predictably', () => {
  const expected = [...ROUTE.checkpoints.filter(c => c.s >= 80).map(c => c.s), ROUTE.sections[2].startS + 180].sort((a, b) => a - b);
  assert.deepEqual(TRAFFIC_SIGNALS.map(signal => signal.s), expected);
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
  let state = stateWith([vehicle(300, { id: 'leader', speed: 0, cruiseSpeed: 0 }), vehicle(265, { id: 'follower' })]);
  state = advance(state, 12);
  assert.equal(state.vehicles[0].s, 300);
  assert.ok(state.vehicles[1].s <= 292.5);
  assert.ok(state.vehicles[1].speed < 0.25);
  assert.equal(state.vehicles[1].braking, true);
});

test('player ahead blocks the same lane while an adjacent lane and opposite road remain free', () => {
  const playerPose = trafficPose(vehicle(330));
  const player = { ...playerPose, speed: 0, elapsedSeconds: 0 };
  let state = stateWith([vehicle(295, { id: 'behind' }), vehicle(295, { id: 'adjacent', lane: 1 }), vehicle(360, { id: 'opposite', direction: -1 })]);
  state = advance(state, 10, player);
  assert.ok(state.vehicles[0].s <= 322.5);
  assert.ok(state.vehicles[0].speed < 0.25);
  assert.ok(state.vehicles[1].s > 350);
  assert.ok(state.vehicles[2].s < 300);
});

test('clock pause is exact, substeps are frame-independent, and a clock rewind never moves cars', () => {
  const initial = stateWith([vehicle(350)]);
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
  assert.ok(state.vehicles[0].s < 20);
  assert.ok(state.vehicles[1].s > ROUTE.length - 20);
  for (const car of state.vehicles) {
    const pose = trafficPose(car);
    assert.ok([pose.x, pose.z, pose.yaw].every(Number.isFinite));
    assert.ok(Math.abs(nearestRoutePoint(pose.x, pose.z).signedOffset) < 5);
  }
});

test('every lane transition and loop seam stays inside the curb with continuous poses in both directions', () => {
  for (const section of ROUTE.sections) for (const direction of [1, -1] as const) for (const lane of [0, 1, 2]) {
    const join = section.startS;
    let previous = trafficPose(vehicle(join - 80, { lane, direction }));
    for (let s = join - 79.5; s <= join + 80; s += 0.5) {
      const pose = trafficPose(vehicle(s, { lane, direction }));
      const road = nearestRoutePoint(pose.x, pose.z);
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
  const near = vehicle(350); const far = vehicle(1000, { id: 'far' }); const pose = trafficPose(near);
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
