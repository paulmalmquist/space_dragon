import test from 'node:test';
import assert from 'node:assert/strict';
import { DRIVE_STEP } from '../src/game/drive/config.ts';
import { MINIVAN_DRIVER_EYE } from '../src/game/drive/minivan-config.ts';
import { driveCameraFrame, interpolateDrivePose, smoothDriveSteering } from '../src/game/drive/presentation.ts';
import type { DrivePoseSample } from '../src/game/drive/presentation.ts';

const near = (actual: number, expected: number, message = '') => assert.ok(Math.abs(actual - expected) < 1e-8,
  `${message}: expected ${expected}, got ${actual}`);
const poseAt = (time: number): DrivePoseSample => ({ x: time * 12, z: time * -5,
  yaw: .2 + time * .3, speed: 13, elapsedSeconds: time });

function renderCadence(cadence: readonly number[], duration = 2) {
  let current = Object.freeze(poseAt(0)); let previous = current;
  let accumulator = 0; let clock = 0; let frame = 0; let ticks = 0;
  const frames: { at: number; pose: ReturnType<typeof interpolateDrivePose> }[] = [];
  while (clock < duration - 1e-10) {
    const delta = Math.min(cadence[frame++ % cadence.length], duration - clock);
    clock += delta; accumulator += delta;
    while (accumulator + 1e-12 >= DRIVE_STEP) {
      previous = current; current = Object.freeze(poseAt(++ticks * DRIVE_STEP)); accumulator -= DRIVE_STEP;
    }
    frames.push({ at: clock, pose: interpolateDrivePose(previous, current, accumulator / DRIVE_STEP) });
  }
  return { current, frames, ticks };
}

test('30/60/144Hz and uneven render cadence sample continuous fixed-tick movement without changing simulation', () => {
  for (const cadence of [[1 / 30], [1 / 60], [1 / 144], [1 / 200, 1 / 35, 1 / 100, 1 / 47]]) {
    const run = renderCadence(cadence);
    assert.equal(run.ticks, 120);
    assert.deepEqual(run.current, poseAt(2));
    for (const frame of run.frames) {
      const displayedTime = Math.max(0, frame.at - DRIVE_STEP);
      const expected = poseAt(displayedTime);
      near(frame.pose.x, expected.x, 'continuous x'); near(frame.pose.z, expected.z, 'continuous z');
      near(frame.pose.yaw, expected.yaw, 'continuous heading');
    }
    for (let index = 1; index < run.frames.length; index++) {
      const a = run.frames[index - 1]; const b = run.frames[index];
      if (a.at <= DRIVE_STEP) continue;
      near((b.pose.x - a.pose.x) / (b.at - a.at), 12, 'no held-frame/stair-step speed');
    }
  }
});

test('heading crosses the wrap by the short arc and interpolation cannot extrapolate', () => {
  const previous = Object.freeze({ ...poseAt(0), yaw: Math.PI - .02 });
  const current = Object.freeze({ ...poseAt(DRIVE_STEP), yaw: -Math.PI + .02 });
  near(interpolateDrivePose(previous, current, .5).yaw, Math.PI);
  near(interpolateDrivePose(previous, current, -10).x, previous.x);
  near(interpolateDrivePose(previous, current, 10).x, current.x);
  near(interpolateDrivePose(previous, current, NaN).x, current.x);
  assert.deepEqual(previous, { ...poseAt(0), yaw: Math.PI - .02 });
  assert.deepEqual(current, { ...poseAt(DRIVE_STEP), yaw: -Math.PI + .02 });
});

test('reset, teleport, clock discontinuity and pause snap instead of sweeping through the world', () => {
  const previous = Object.freeze(poseAt(1));
  const ordinary = Object.freeze(poseAt(1 + DRIVE_STEP));
  const destination = { x: ordinary.x, z: ordinary.z, yaw: ordinary.yaw, speed: ordinary.speed };
  assert.deepEqual(interpolateDrivePose(previous, ordinary, .2, { snap: true }), destination);
  assert.deepEqual(interpolateDrivePose(previous, ordinary, .2, { paused: true }), destination);
  for (const changed of [
    { ...ordinary, x: 900, z: -1200 },
    { ...ordinary, yaw: ordinary.yaw + Math.PI },
    { ...ordinary, elapsedSeconds: 0 },
    { ...ordinary, elapsedSeconds: previous.elapsedSeconds },
    { ...ordinary, elapsedSeconds: previous.elapsedSeconds + 1 },
  ]) {
    const expected = { x: changed.x, z: changed.z, yaw: changed.yaw, speed: changed.speed };
    for (const alpha of [0, .3, 1]) assert.deepEqual(interpolateDrivePose(previous, changed, alpha), expected);
  }
  // The caller rebases previous=current on resume; a zero-tick frame cannot move backwards.
  const resumed = Object.freeze({ ...ordinary, speed: 0 });
  assert.deepEqual(interpolateDrivePose(resumed, resumed, 0), { ...destination, speed: 0 });
});

test('cabin eye and chase attachment remain rigid to the same rendered body at every cadence', () => {
  for (const cadence of [[1 / 30], [1 / 60], [1 / 144], [1 / 29, 1 / 160, 1 / 90]]) {
    for (const { pose } of renderCadence(cadence).frames) {
      const cabin = driveCameraFrame(pose, 'dashboard', .8, -.12);
      const dx = cabin.position.x - pose.x; const dz = cabin.position.z - pose.z;
      near(dx * Math.cos(pose.yaw) - dz * Math.sin(pose.yaw), MINIVAN_DRIVER_EYE.x, 'eye local x');
      near(dx * Math.sin(pose.yaw) + dz * Math.cos(pose.yaw), MINIVAN_DRIVER_EYE.z, 'eye local z');
      near(cabin.position.y, MINIVAN_DRIVER_EYE.y, 'no eye bob');
      assert.deepEqual(cabin.position, driveCameraFrame(pose, 'dashboard', -.8, .2).position, 'look turns the head without detaching the eye');
      const chase = driveCameraFrame(pose, 'chase', 0, 0, 9.1);
      near(Math.hypot(chase.position.x - pose.x, chase.position.z - pose.z), 9.1, 'no separate camera translation lag');
      near((pose.x - chase.position.x) * Math.cos(pose.yaw) - (pose.z - chase.position.z) * Math.sin(pose.yaw), 0);
    }
  }
});

test('visual steering eases consistently across frame rates, stays bounded and freezes on pause', () => {
  for (const hz of [30, 60, 144]) {
    let displayed = 0;
    for (let frame = 0; frame < hz; frame++) {
      const next = smoothDriveSteering(displayed, 1, 1 / hz);
      assert.ok(next >= displayed && next < 1); displayed = next;
    }
    near(displayed, 1 - Math.exp(-14));
    assert.equal(smoothDriveSteering(displayed, -1, .1, true), displayed);
    assert.equal(smoothDriveSteering(displayed, -1, -1), displayed);
    assert.equal(smoothDriveSteering(displayed, -1, NaN), displayed);
  }
  near(smoothDriveSteering(0, 8, .1), smoothDriveSteering(0, 1, .1));
});
