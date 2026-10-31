import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Flight } from '../src/prototypes/dogfight/systems/flight.js';
import { ChaseCamera, cameraSpeedProfile } from '../src/prototypes/dogfight/systems/camera.js';
import { CONFIG } from '../src/prototypes/dogfight/config.js';

const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
function rig() {
  const flight = new Flight(), camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1.6, .1, 35000);
  const chase = new ChaseCamera(camera); chase.update(0, flight, true);
  return { flight, camera, chase };
}
function update(rig, seconds, keys = [], fps = 60, zoom = false) {
  const frames = Math.ceil(seconds * fps), dt = seconds / frames;
  for (let frame = 0; frame < frames; frame++) { rig.flight.update(dt, new Set(keys)); rig.chase.update(dt, rig.flight, false, zoom); }
}

test('actual R acceleration widens the chase lens without boost or scene stretching', () => {
  const r = rig(); update(r, 2, ['KeyR']);
  assert.equal(r.flight.boosting, false); near(r.flight.speed, CONFIG.flight.maxSpeed);
  assert.ok(r.camera.fov > 65.8 && r.camera.fov <= CONFIG.camera.fastFov);
  near(cameraSpeedProfile(CONFIG.flight.cruiseSpeed).fov, 61);
  near(cameraSpeedProfile(CONFIG.flight.maxSpeed).fov, 66);
  near(cameraSpeedProfile(CONFIG.boost.speed).fov, 74);
});

test('speed lens and setback are smooth at the cruise/boost boundary and always bounded', () => {
  let previous = 0;
  for (let speed = 0; speed <= 250; speed++) {
    const profile = cameraSpeedProfile(speed);
    assert.ok(profile.fov >= 61 && profile.fov <= 74); assert.ok(profile.fov >= previous); previous = profile.fov;
    assert.ok(profile.setback >= 0 && profile.setback <= 2);
  }
  near(cameraSpeedProfile(88).setback, .8); near(cameraSpeedProfile(148).setback, 2);
  assert.ok(Math.abs(cameraSpeedProfile(88 + 1e-6).fov - cameraSpeedProfile(88 - 1e-6).fov) < 1e-5);
  for (const invalid of [NaN, Infinity, -Infinity, undefined]) assert.deepEqual(cameraSpeedProfile(invalid), { fov: 61, setback: 0 });
});

test('RMB zoom overrides the speed lens and releases back to actual speed', () => {
  const r = rig(); r.flight.speed = CONFIG.boost.speed; r.flight.boosting = true;
  for (let frame = 0; frame < 120; frame++) r.chase.update(1 / 60, r.flight, false, true);
  near(r.camera.fov, CONFIG.camera.zoomFov, .001);
  r.chase.update(.02, r.flight); assert.ok(r.camera.fov > CONFIG.camera.zoomFov && r.camera.fov < 74);
  for (let frame = 0; frame < 120; frame++) r.chase.update(1 / 60, r.flight);
  near(r.camera.fov, 74, .001);
  r.flight.boosting = false; r.chase.update(0, r.flight, true);
  near(r.camera.fov, 74); // A boost flag cannot override actual remaining speed.
});

test('decelerating returns smoothly to the base close camera framing', () => {
  const r = rig(); update(r, 3, ['KeyR']);
  const fastFov = r.camera.fov; update(r, 3, ['KeyF']);
  assert.ok(r.flight.speed < CONFIG.flight.cruiseSpeed); assert.ok(r.camera.fov < fastFov);
  near(r.camera.fov, 61, .001);
  r.flight.reset(); r.chase.update(0, r.flight, true);
  near(r.camera.position.y, 4.2); near(r.camera.position.z, 11.5); near(r.camera.fov, 61);
});

test('lens and modest setback easing agree at 30 and 120 Hz', () => {
  const rigs = [30, 120].map(fps => {
    const r = rig(); r.flight.speed = 88;
    for (let frame = 0; frame < fps; frame++) r.chase.update(1 / fps, r.flight);
    return r;
  });
  near(rigs[0].camera.fov, rigs[1].camera.fov);
  near(rigs[0].camera.position.distanceTo(rigs[1].camera.position), 0);
  near(rigs[0].camera.position.z, CONFIG.camera.distance + .8, .001);
});

test('snap/reset and invalid elapsed time cannot corrupt the lens or alter flight state', () => {
  const r = rig(); r.flight.speed = 148;
  const flightBefore = JSON.stringify({ position: r.flight.position, orientation: r.flight.orientation, velocity: r.flight.velocity, speed: r.flight.speed });
  r.chase.update(0, r.flight, true); near(r.camera.fov, 74); near(r.camera.position.z, 13.5);
  const position = r.camera.position.clone(); r.flight.speed = 54;
  for (const dt of [0, -1, NaN, Infinity]) { r.chase.update(dt, r.flight); near(r.camera.fov, 74); near(r.camera.position.distanceTo(position), 0); }
  r.flight.speed = 148;
  assert.equal(JSON.stringify({ position: r.flight.position, orientation: r.flight.orientation, velocity: r.flight.velocity, speed: r.flight.speed }), flightBefore);
  r.camera.fov = NaN; r.flight.speed = NaN; r.chase.update(.1, r.flight); near(r.camera.fov, 61);
  r.flight.reset(); r.chase.update(0, r.flight, true, true); near(r.camera.fov, 40);
  r.chase.update(0, r.flight, true); near(r.camera.fov, 61); near(r.camera.position.z, 11.5);
});

test('world travel adds no speed-dependent chase distance at cruise or boost', () => {
  for (const speed of [54, 148]) {
    const r = rig(); r.flight.speed = speed; r.chase.update(0, r.flight, true);
    const expectedOffset = CONFIG.camera.distance + cameraSpeedProfile(speed).setback;
    for (let frame = 0; frame < 180; frame++) {
      r.flight.position.addScaledVector(r.flight.forward, speed / 60);
      r.chase.update(1 / 60, r.flight);
      const relative = r.camera.position.clone().sub(r.flight.position);
      near(relative.z, expectedOffset); near(relative.y, CONFIG.camera.height);
      near(relative.length(), Math.hypot(expectedOffset, CONFIG.camera.height));
    }
  }
});

test('moving chase framing agrees at 30 and 120 Hz and snap/reset clears old translation', () => {
  const rigs = [30, 120].map(fps => {
    const r = rig(); r.flight.speed = 148; r.chase.update(0, r.flight, true);
    for (let frame = 0; frame < fps * 2; frame++) {
      r.flight.position.addScaledVector(r.flight.forward, 148 / fps);
      r.chase.update(1 / fps, r.flight);
    }
    return r;
  });
  near(rigs[0].camera.position.distanceTo(rigs[1].camera.position), 0);
  for (const r of rigs) {
    r.flight.reset(); r.chase.update(0, r.flight, true);
    near(r.camera.position.z, 11.5); near(r.camera.fov, 61);
    r.flight.position.z -= .9; r.chase.update(1 / 60, r.flight);
    near(r.camera.position.z - r.flight.position.z, 11.5);
  }
});

test('zero elapsed time freezes translation; resuming carries the frame without catch-up drift', () => {
  const r = rig(), original = r.camera.position.clone(), look = r.chase.look.clone();
  r.flight.position.set(20, 0, -100);
  r.chase.update(0, r.flight);
  near(r.camera.position.distanceTo(original), 0); near(r.chase.look.distanceTo(look), 0);
  r.chase.update(1 / 60, r.flight);
  const relative = r.camera.position.clone().sub(r.flight.position);
  near(relative.x, 0); near(relative.z, 11.5); near(relative.y, 4.2);
  r.chase.update(1 / 60, r.flight);
  near(r.camera.position.clone().sub(r.flight.position).distanceTo(relative), 0);
});

test('a real corkscrew stays visible while camera position and horizon follow the stable travel axis', () => {
  const r = rig(), orientation = r.camera.quaternion.clone();
  assert.equal(r.flight.requestRoll(1), true);
  let maximumBodyOffset = 0;
  for (let frame = 0; frame < 90; frame++) {
    r.flight.update(1 / 60, new Set()); r.chase.update(1 / 60, r.flight);
    const anchor = r.flight.position.clone().sub(r.flight.rollOffset);
    const relative = r.camera.position.clone().sub(anchor);
    near(relative.x, 0); near(relative.y, 4.2); near(relative.z, 11.5);
    near(r.camera.quaternion.angleTo(orientation), 0, 1e-7);
    maximumBodyOffset = Math.max(maximumBodyOffset, r.flight.position.distanceTo(anchor));
  }
  assert.ok(maximumBodyOffset > 4); assert.equal(r.flight.rollsCompleted, 1);
  r.flight.reset(); r.chase.update(0, r.flight, true);
  near(r.camera.position.z, 11.5); near(r.chase.previousAnchor.length(), 0);
});
