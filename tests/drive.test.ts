import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_DRIVE_CONFIG, DRIVE_STEP, validDriveConfig } from '../src/game/drive/config.ts';
import { ROUTE, HOME_EXIT_SIGNAL_S, NEIGHBORHOOD_ROUTE, lanePoseAt, nearestRoutePoint, pointAtDistance, recommendedSpeedAt, routeLabelAt, validateRoute } from '../src/game/drive/route.ts';
import { NEIGHBORHOOD } from '../src/game/drive/neighborhood.ts';
import { angleDelta, createDriveState, EMPTY_DRIVE_INPUT, resetDrive, stepDrive, updateDriveCheckpoints } from '../src/game/drive/simulation.ts';
import type { DriveInput, DriveState } from '../src/game/drive/simulation.ts';
import { DRIVE_BACKUP_KEY, DRIVE_SAVE_KEY, loadDrive, saveDrive } from '../src/game/drive/checkpoint.ts';
import { sampleDriveController, sampleStandardController } from '../src/game/gamepad.ts';
import type { SaveStorage } from '../src/game/checkpoint.ts';

const forward: DriveInput = { ...EMPTY_DRIVE_INPUT, throttle: 1 };
function run(state: DriveState, input: DriveInput, ticks: number) {
  for (let i = 0; i < ticks; i++) state = stepDrive(state, input);
  return state;
}
class Storage implements SaveStorage {
  values = new Map<string, string>(); writes: string[] = [];
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.writes.push(key); this.values.set(key, value); }
}
function checkpointState(index: number): DriveState {
  const checkpoint = ROUTE.checkpoints[index];
  return resetDrive({ ...createDriveState(), checkpointId: checkpoint.id, visited: ROUTE.checkpoints.slice(0, index + 1).map(item => item.id) });
}
function cruiseState(assist = false): DriveState {
  const pose = lanePoseAt(ROUTE.sections[1].startS + 100);
  return { ...createDriveState(assist), ...pose, routeS: pose.s };
}
function follow(state: DriveState): DriveState {
  const limit = recommendedSpeedAt(state.routeS);
  const target = lanePoseAt(state.routeS + (limit < 12 ? 3 + Math.abs(state.speed) * .35 : 8 + Math.abs(state.speed) * .55));
  const error = angleDelta(Math.atan2(target.x - state.x, target.z - state.z), state.yaw);
  return stepDrive(state, { throttle: state.speed < limit ? 1 : 0, brake: state.speed > limit + .3 ? .5 : 0,
    steer: Math.max(-1, Math.min(1, error * 3)), handbrake: false });
}

test('mapped home exit and compressed arterial loop preserve street sequence, scale and ordered turns', () => {
  assert.deepEqual(validateRoute(), []);
  assert.deepEqual(ROUTE.turns.slice(0, 3).map(turn => turn.direction), ['right', 'left', 'right']);
  assert.deepEqual(ROUTE.turns.filter(turn => turn.reference === 'arterial').map(turn => turn.direction), ['right', 'left', 'left']);
  assert.equal(ROUTE.turns.slice(-2).every(turn => turn.fromSection === 5 && turn.toSection === 5), true, 'Home arrival and bulb turnaround need arrow/chime cues');
  assert.equal(ROUTE.sections.filter(section => !section.invented).length, 5);
  const directions = ROUTE.sections.slice(1, 5).map(section => pointAtDistance((section.startS + section.endS) / 2).yaw);
  [-Math.PI / 2, 0, -Math.PI / 2, Math.PI].forEach((expected, index) => assert.ok(Math.abs(angleDelta(directions[index], expected)) < 0.001));
  assert.ok(ROUTE.expectedCruiseSeconds >= 180 && ROUTE.expectedCruiseSeconds <= 300);
  assert.ok(!ROUTE.sections[0].invented && ROUTE.sections.at(-1)!.invented);
  assert.ok(ROUTE.sections[0].endS > 400 && ROUTE.sections[0].endS < 420);
  assert.deepEqual([0, 80, 240, ROUTE.sections[1].startS + 20].map(routeLabelAt),
    ['Starpass Court', 'Green Island Boulevard', 'Winston Trails South', 'Hypoluxo Road']);
  assert.ok(HOME_EXIT_SIGNAL_S < ROUTE.turns[2].s);
  assert.ok(Math.abs(NEIGHBORHOOD.culdesac.radius - 10.5) < .01);
  assert.ok(Math.cos(ROUTE.spawn.yaw) < -.85 && Math.sin(ROUTE.spawn.yaw) < 0, 'Home faces south-southwest toward the actual street exit');
  assert.deepEqual(ROUTE.checkpoints.map(point => point.id), ['home', 'leg-1', 'leg-2', 'leg-3', 'leg-4']);
  assert.deepEqual(pointAtDistance(ROUTE.length), pointAtDistance(0));
  for (const checkpoint of ROUTE.checkpoints) {
    const nearest = nearestRoutePoint(checkpoint.x, checkpoint.z, checkpoint.s);
    assert.ok(Math.abs(nearest.s - checkpoint.s) < 0.01);
    assert.ok(nearest.signedOffset > 0, 'checkpoint must be on right lane rather than median');
  }
});

test('car fixed-step simulation is deterministic for identical semantic inputs', () => {
  const inputs = Array.from({ length: 800 }, (_, i) => ({ ...forward, steer: i > 450 && i < 510 ? 0.1 : 0, handbrake: i > 550 && i < 590 }));
  const a = inputs.reduce((state, input) => stepDrive(state, input), createDriveState());
  const b = inputs.reduce((state, input) => stepDrive(state, input), createDriveState());
  assert.deepEqual(a, b);
  assert.ok(Math.hypot(a.x - ROUTE.spawn.x, a.z - ROUTE.spawn.z) > 5);
  assert.ok(Math.abs(a.elapsedSeconds - 800 / 60) < 1e-8);
});

test('default acceleration, braking, assist and reverse speed caps match configuration', () => {
  assert.equal(validDriveConfig(DEFAULT_DRIVE_CONFIG), true);
  let state = run(cruiseState(), forward, 360);
  assert.ok(Math.abs(state.speed - 25) < 1e-8);
  state = run(state, { ...EMPTY_DRIVE_INPUT, brake: 1 }, 150);
  assert.ok(Math.abs(state.speed) < 1e-8, '25 m/s braking reaches rest in 2.5 seconds');
  state = run(cruiseState(), { ...EMPTY_DRIVE_INPUT, brake: 1 }, 100);
  assert.equal(state.speed, -6);
  const assisted = run(cruiseState(true), forward, 600);
  assert.equal(assisted.speed, 15);
  const slow = run(cruiseState(), { ...forward, throttle: 0.25 }, 120);
  const full = run(cruiseState(), forward, 120);
  assert.ok(full.speed > slow.speed * 3.9);
});

test('offroad speed is capped to 40 percent, boundaries bonk and stuck reset returns to checkpoint', () => {
  const pose = lanePoseAt(ROUTE.sections[1].startS + 180);
  let offroad: DriveState = { ...createDriveState(), ...pose, routeS: pose.s, z: pose.z + 20, speed: 25, velocityX: -25 };
  offroad = stepDrive(offroad, forward);
  assert.equal(offroad.speed, 10);
  const state = checkpointState(1);
  const wall = [{ id: 'test-wall', x: state.x - 1.6, z: state.z, radius: 1 }];
  let stuck = state;
  let observedReset = false;
  for (let i = 0; i < 250; i++) {
    const previous = stuck;
    stuck = stepDrive(stuck, forward, DEFAULT_DRIVE_CONFIG, wall);
    if (previous.stuckSeconds > 1.9 && stuck.stuckSeconds === 0) { observedReset = true; break; }
  }
  assert.equal(observedReset, true);
  assert.equal(stuck.x, state.x);
  assert.equal(stuck.z, state.z);
  assert.equal(stuck.speed, 0);
});

test('reset preserves progress and assistance while recovering correct checkpoint pose', () => {
  const state = checkpointState(3); state.assist = true;
  const reset = resetDrive({ ...state, x: 10000, z: 10000, yaw: 40, speed: 20, velocityX: 20, stuckSeconds: 5 });
  assert.equal(reset.x, ROUTE.checkpoints[3].x);
  assert.equal(reset.z, ROUTE.checkpoints[3].z);
  assert.equal(reset.yaw, ROUTE.checkpoints[3].yaw);
  assert.equal(reset.speed, 0);
  assert.equal(reset.assist, true);
  assert.deepEqual(reset.visited, state.visited);
});

test('pause freezes all simulation state and invalid input cannot poison the car', () => {
  const state = run(createDriveState(), forward, 60);
  assert.equal(stepDrive(state, { ...forward, paused: true }), state);
  const invalid = stepDrive(state, { throttle: NaN, brake: Infinity, steer: NaN, handbrake: false });
  assert.ok([invalid.x, invalid.z, invalid.speed, invalid.yaw].every(Number.isFinite));
});

test('checkpoint gates reject out-of-order, backward and duplicate triggers; returning home completes once', () => {
  let state = createDriveState();
  for (let index = 1; index < ROUTE.checkpoints.length; index++) {
    const checkpoint = ROUTE.checkpoints[index];
    const previous = { ...state, routeS: checkpoint.s - 0.2 };
    const next = { ...state, ...checkpoint, routeS: checkpoint.s + 0.2, speed: 10 };
    state = updateDriveCheckpoints(previous, next);
    assert.equal(state.checkpointId, checkpoint.id);
    assert.equal(state.visited.length, index + 1);
    const repeated = updateDriveCheckpoints(previous, state);
    assert.deepEqual(repeated.visited, state.visited);
  }
  const home = updateDriveCheckpoints({ ...state, routeS: ROUTE.length - 1 }, { ...state, routeS: 1, speed: 10 });
  assert.equal(home.completed, true);
  assert.equal(home.checkpointId, 'home');
  assert.equal(updateDriveCheckpoints(home, home), home);
  const first = ROUTE.checkpoints[1];
  assert.equal(updateDriveCheckpoints({ ...createDriveState(), routeS: first.s + 1 }, { ...createDriveState(), ...first, routeS: first.s - 1 }).visited.length, 1);
  const skipped = ROUTE.checkpoints[2];
  assert.equal(updateDriveCheckpoints({ ...createDriveState(), routeS: skipped.s - 1 }, { ...createDriveState(), ...skipped, routeS: skipped.s + 1 }).visited.length, 1);
});

test('a simulated driver can follow every turn and finish the loop in the 3-5 minute normal-speed range', () => {
  let state = createDriveState();
  let bonks = 0;
  for (let tick = 0; tick < 60 * 300 && !state.completed; tick++) {
    state = follow(state); if (state.bonkSeconds === .35) bonks++;
  }
  assert.equal(state.completed, true, `stopped at ${state.routeS}, checkpoint ${state.checkpointId}`);
  assert.ok(state.elapsedSeconds > 180 && state.elapsedSeconds < 300);
  assert.equal(state.visited.length, 5);
  assert.equal(bonks, 0, 'Local turns and the real cul-de-sac must be traversable without collision/reset shortcuts');
});

test('the shared Starpass stem retains inbound progress, turns inside the bulb and completes home once', () => {
  const s = NEIGHBORHOOD_ROUTE.bulbStartS - 10;
  const pose = lanePoseAt(s);
  const inbound = nearestRoutePoint(pose.x, pose.z, s);
  const outbound = nearestRoutePoint(pose.x, pose.z, 10);
  assert.equal(inbound.sectionIndex, 5);
  assert.equal(outbound.sectionIndex, 0);
  assert.ok(Math.abs(inbound.s - s) < .01);
  assert.ok(Math.abs(angleDelta(inbound.yaw, outbound.yaw)) > 3);
  let state: DriveState = { ...checkpointState(4), ...pose, routeS: s };
  let sawBulb = false;
  for (let tick = 0; tick < 1800 && !state.completed; tick++) {
    state = follow(state);
    if (state.routeS > NEIGHBORHOOD_ROUTE.bulbStartS + 15 && state.routeS < ROUTE.length - 10) {
      sawBulb = true;
      assert.ok(Math.hypot(state.x, state.z) < NEIGHBORHOOD.culdesac.radius, 'Car stays on the mapped bulb pavement');
    }
  }
  assert.ok(sawBulb && state.completed);
  const storage = new Storage(); saveDrive(state, storage);
  const restored = loadDrive(storage).state;
  assert.ok(restored.completed);
  assert.deepEqual(restored.visited, state.visited);
  assert.equal(restored.x, ROUTE.spawn.x);
  assert.equal(restored.z, ROUTE.spawn.z);
  assert.equal(restored.speed, 0);
  assert.equal(stepDrive(createDriveState(), forward).routeS < 1, true, 'First tick must not jump to the return branch');
});

test('drive saves restore checkpoint only, isolate campaign keys and avoid redundant writes', () => {
  const storage = new Storage(); storage.values.set('space-dragon.checkpoint.v2', 'untouched');
  const state = checkpointState(2); state.assist = true; state.x += 10;
  assert.match(saveDrive(state, storage), /saved/);
  const loaded = loadDrive(storage);
  assert.equal(loaded.state.x, ROUTE.checkpoints[2].x);
  assert.equal(loaded.state.assist, true);
  assert.equal(loaded.state.speed, 0);
  const writes = [...storage.writes];
  saveDrive(state, storage);
  assert.deepEqual(storage.writes, writes);
  assert.equal(storage.getItem('space-dragon.checkpoint.v2'), 'untouched');
  assert.equal(storage.writes.every(key => key.startsWith('space-dragon.drive.')), true);
});

test('corrupt drive saves recover backup read-only and do not overwrite it with corrupt bytes', () => {
  const storage = new Storage();
  saveDrive(checkpointState(1), storage); saveDrive(checkpointState(2), storage);
  const backup = storage.getItem(DRIVE_BACKUP_KEY);
  storage.values.set(DRIVE_SAVE_KEY, '{interrupted');
  const writes = [...storage.writes]; const loaded = loadDrive(storage);
  assert.equal(loaded.state.checkpointId, 'leg-1');
  assert.match(loaded.notice, /Previous/);
  assert.deepEqual(storage.writes, writes);
  saveDrive(loaded.state, storage);
  assert.equal(storage.getItem(DRIVE_BACKUP_KEY), backup);
});

test('future saves, malformed progress and storage failures report honestly without lost checkpoints', () => {
  const storage = new Storage(); const future = '{"version":9,"private":"unchanged"}';
  storage.values.set(DRIVE_SAVE_KEY, future);
  assert.equal(loadDrive(storage).canSave, false);
  assert.match(saveDrive(createDriveState(), storage), /will not replace/);
  assert.equal(storage.getItem(DRIVE_SAVE_KEY), future);
  assert.deepEqual(storage.writes, []);
  assert.match(saveDrive({ ...createDriveState(), visited: ['home', 'leg-4'], checkpointId: 'leg-4' }, storage), /invalid/);
  const malformed = new Storage();
  malformed.values.set(DRIVE_SAVE_KEY, JSON.stringify({ version: 1, routeId: ROUTE.id, assist: false, completed: true, visited: ['home'], checkpointId: 'home' }));
  assert.deepEqual(loadDrive(malformed).state, createDriveState());
  assert.deepEqual(malformed.writes, []);
  const blocked: SaveStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.match(loadDrive(blocked).notice, /could not be read/);
  assert.match(saveDrive(createDriveState(), blocked), /unavailable or full/);
  for (const fail of [DRIVE_SAVE_KEY, DRIVE_BACKUP_KEY]) {
    const target = new Storage(); saveDrive(createDriveState(), target);
    const before = target.getItem(DRIVE_SAVE_KEY);
    const write = target.setItem.bind(target);
    target.setItem = (key, value) => { if (key === fail) throw new Error('quota'); write(key, value); };
    assert.match(saveDrive(checkpointState(1), target), /unavailable or full/);
    assert.equal(target.getItem(DRIVE_SAVE_KEY), before);
  }
});

test('standard gamepad drive mapping preserves analog triggers and prior camera API', () => {
  const pad = { id: 'DualSense', mapping: 'standard' as const, axes: [0.6, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
  pad.buttons[7].value = 0.25; pad.buttons[6].value = 0.7;
  pad.buttons[0].value = 1; pad.buttons[3].value = 1; pad.buttons[5].value = 1; pad.buttons[9].value = 1;
  const sample = sampleDriveController(pad)!;
  assert.equal(sample.throttle, 0.25); assert.equal(sample.brake, 0.7);
  assert.ok(sample.steer > 0 && sample.steer < 0.6);
  assert.equal(sample.handbrake && sample.reset && sample.camera && sample.pause, true);
  assert.ok(sampleStandardController(pad)?.advance);
  assert.equal(sampleDriveController({ ...pad, mapping: '' }), null);
  assert.equal(DRIVE_STEP, 1 / 60);
});
