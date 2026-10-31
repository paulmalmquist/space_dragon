import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Flight } from '../src/prototypes/dogfight/systems/flight.js';
import { Combat } from '../src/prototypes/dogfight/systems/combat.js';
import { CONFIG } from '../src/prototypes/dogfight/config.js';

function step(flight, duration, keys = [], fps = 60) {
  const frames = Math.ceil(duration * fps);
  for (let i = 0; i < frames; i++) flight.update(duration / frames, new Set(keys));
}
const near = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);

test('rolls spend evasion once; invalid, repeated and conflicting requests spend nothing', () => {
  const flight = new Flight();
  assert.equal(flight.requestRoll(0), false);
  assert.equal(flight.lastManeuverResult.reason, 'invalid-direction');
  assert.equal(flight.evasionEnergy, 100);
  assert.equal(flight.requestRoll(-1), true);
  assert.equal(flight.evasionEnergy, 60);
  assert.equal(flight.rollsStarted, 1); assert.equal(flight.rollSerial, 1); assert.equal(flight.maneuverSerial, 1);
  assert.deepEqual(flight.lastManeuverResult, { accepted: true, type: 'roll', reason: null, cost: 40 });
  assert.equal(flight.requestRoll(1), false); assert.equal(flight.requestBreak(1), false);
  assert.equal(flight.lastManeuverResult.reason, 'busy');
  assert.equal(flight.evasionEnergy, 60); assert.equal(flight.maneuverSerial, 1);
  step(flight, CONFIG.roll.duration);
  assert.equal(flight.requestBreak(1), false); assert.equal(flight.lastManeuverResult.reason, 'cooldown');
});

test('two consecutive rolls exhaust the affordable roll budget; a third is rejected without movement', () => {
  const flight = new Flight();
  assert.equal(flight.requestRoll(-1), true);
  step(flight, CONFIG.roll.duration); step(flight, CONFIG.roll.cooldown + .001);
  assert.equal(flight.requestRoll(1), true);
  step(flight, CONFIG.roll.duration); step(flight, CONFIG.roll.cooldown + .001);
  const position = flight.position.clone();
  assert.equal(flight.evasionEnergy, 20); assert.equal(flight.rollsStarted, 2); assert.equal(flight.rollsCompleted, 2);
  assert.equal(flight.requestRoll(-1), false);
  assert.equal(flight.lastManeuverResult.reason, 'energy');
  assert.equal(flight.rollActive, false); assert.equal(flight.rollSerial, 2);
  assert.equal(flight.position.distanceTo(position), 0);
});

test('evasion only recharges after the completed maneuver and its idle delay', () => {
  const flight = new Flight(); flight.requestRoll(1);
  step(flight, CONFIG.roll.duration / 2); assert.equal(flight.evasionEnergy, 60);
  step(flight, CONFIG.roll.duration / 2); assert.equal(flight.evasionEnergy, 60);
  step(flight, CONFIG.evasion.rechargeDelay); near(flight.evasionEnergy, 60);
  step(flight, 1); near(flight.evasionEnergy, 78);
  step(flight, 10); assert.equal(flight.evasionEnergy, flight.evasionMax);
});

test('boost and evasion have independent budgets; break braking takes priority over boost', () => {
  const flight = new Flight(); flight.boost = 0;
  assert.equal(flight.requestBreak(-1), true); assert.equal(flight.evasionEnergy, 75);
  step(flight, CONFIG.breakTurn.duration); step(flight, CONFIG.breakTurn.cooldown + .001);
  flight.evasionEnergy = 0; flight.boost = CONFIG.boost.capacity;
  step(flight, .25, ['ShiftLeft']);
  assert.equal(flight.boosting, true); assert.ok(flight.boost < CONFIG.boost.capacity);
  assert.equal(flight.requestBreak(1), false); assert.equal(flight.lastManeuverResult.reason, 'energy');
  flight.evasionEnergy = 100; assert.equal(flight.requestBreak(1), true);
  const boostBefore = flight.boost; step(flight, .1, ['ShiftLeft']);
  assert.equal(flight.boosting, false); near(flight.boost, boostBefore);
});

test('a break turn creates a real hard lateral heading change and loses speed without teleporting', () => {
  for (const direction of [-1, 1]) {
    const flight = new Flight(), ordinary = new Flight();
    const before = flight.position.clone(); assert.equal(flight.requestBreak(direction), true);
    assert.equal(flight.position.distanceTo(before), 0);
    const key = direction === -1 ? 'ArrowLeft' : 'ArrowRight';
    step(flight, CONFIG.breakTurn.duration, [key]); step(ordinary, CONFIG.breakTurn.duration, [key]);
    assert.equal(flight.breakActive, false); assert.equal(flight.breaksCompleted, 1);
    assert.equal(flight.breaksStarted, 1); assert.equal(flight.breakSerial, 1); assert.equal(flight.rollSerial, 0);
    assert.ok(flight.position.x * direction > 15);
    assert.ok(flight.forward.angleTo(new THREE.Vector3(0, 0, -1)) > ordinary.forward.angleTo(new THREE.Vector3(0, 0, -1)) + .8);
    near(flight.speed, CONFIG.flight.cruiseSpeed * CONFIG.breakTurn.speedFactor);
    assert.ok(flight.speed < ordinary.speed); assert.ok(flight.position.length() < CONFIG.flight.cruiseSpeed * CONFIG.breakTurn.duration);
    assert.ok(Math.abs(flight.bank) > 1.3);
    assert.deepEqual(flight.up.toArray(), [0, 1, 0]);
  }
});

test('default break direction follows the current bank, or turns left from neutral', () => {
  const neutral = new Flight(); assert.equal(neutral.requestBreak(), true); assert.equal(neutral.breakDirection, -1);
  const right = new Flight(); step(right, .2, ['ArrowRight']);
  assert.equal(right.requestBreak(), true); assert.equal(right.breakDirection, 1);
  assert.equal(right.requestRoll(-1), false); assert.equal(right.evasionEnergy, 75);
});

test('a break turn grants no collision immunity; a shot on the physical path still hits', () => {
  const flight = new Flight(); flight.requestBreak(-1);
  let damage = 0;
  const combat = new Combat(new THREE.Scene(), { burst() {} }, { hit() {} }, { drones: [] }, () => {}, () => { damage++; }, () => {});
  combat.spawn(flight.position, new THREE.Vector3(0, 0, -1), 0, true);
  combat.update(.01, flight);
  assert.equal(damage, 1); assert.equal(combat.pulses.length, 0);
  combat.reset();
});

test('break travel and resource timing remain consistent at 30 and 120 fps', () => {
  const flights = [30, 120].map(fps => {
    const flight = new Flight(); flight.requestBreak(1);
    step(flight, CONFIG.breakTurn.duration, [], fps);
    const turn = { position: flight.position.clone(), forward: flight.forward.clone() };
    step(flight, CONFIG.evasion.rechargeDelay + 1, [], fps);
    return { flight, turn };
  });
  assert.equal(flights[0].flight.breaksCompleted, 1); assert.equal(flights[1].flight.breaksCompleted, 1);
  assert.ok(flights[0].turn.forward.angleTo(flights[1].turn.forward) < .002);
  assert.ok(flights[0].turn.position.distanceTo(flights[1].turn.position) < .1);
  near(flights[0].flight.evasionEnergy, flights[1].flight.evasionEnergy);
  near(flights[0].flight.evasionEnergy, 93);
});

test('zero simulation time freezes a maneuver and resource timers; reset restores the encounter', () => {
  const flight = new Flight(); flight.requestBreak(1); step(flight, .2);
  const snapshot = [flight.breakElapsed, flight.evasionEnergy, flight.evasionRechargeDelay, flight.position.toArray(), flight.orientation.toArray()];
  flight.update(0, new Set(['ShiftLeft', 'ArrowUp'])); flight.update(NaN, new Set());
  assert.deepEqual([flight.breakElapsed, flight.evasionEnergy, flight.evasionRechargeDelay, flight.position.toArray(), flight.orientation.toArray()], snapshot);
  flight.reset();
  assert.equal(flight.breakActive, false); assert.equal(flight.breakElapsed, 0); assert.equal(flight.breakCooldown, 0);
  assert.equal(flight.breaksStarted, 0); assert.equal(flight.breaksCompleted, 0); assert.equal(flight.breakSerial, 0);
  assert.equal(flight.rollsStarted, 0); assert.equal(flight.rollsCompleted, 0); assert.equal(flight.rollSerial, 0); assert.equal(flight.maneuverSerial, 0);
  assert.equal(flight.evasionEnergy, 100); assert.equal(flight.evasionMax, 100); assert.equal(flight.evasionRechargeDelay, 0);
  assert.equal(flight.lastManeuverResult, null); assert.deepEqual(flight.position.toArray(), [0, 0, 0]);
});
