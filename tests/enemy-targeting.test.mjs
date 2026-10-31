import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { EnemyTargeting } from '../src/prototypes/dogfight/systems/enemy-targeting.js';
import { EnemySquad } from '../src/prototypes/dogfight/systems/enemies.js';
import { Combat } from '../src/prototypes/dogfight/systems/combat.js';
import { Flight } from '../src/prototypes/dogfight/systems/flight.js';
import { CONFIG } from '../src/prototypes/dogfight/config.js';

function track(flight, targeting, seconds, keys = [], fps = 60) {
  const frames = Math.ceil(seconds * fps), dt = seconds / frames;
  for (let i = 0; i < frames; i++) { flight.update(dt, new Set(keys)); targeting.update(dt, flight, true); }
}
function combatFor(squad, onDamage = () => {}) {
  return new Combat(new THREE.Scene(), { burst() {} }, { fire() {}, hit() {}, disable() {} }, squad, () => {}, onDamage, () => {});
}

test('steady motion builds a telegraphed firing solution before accurate enemy fire', () => {
  const flight = new Flight(), targeting = new EnemyTargeting();
  track(flight, targeting, .6);
  assert.equal(targeting.canFire, false); assert.ok(targeting.progress > .5);
  track(flight, targeting, .6);
  assert.equal(targeting.locked, true); assert.equal(targeting.canFire, true);
  assert.ok(targeting.telegraph >= CONFIG.enemy.fireTelegraph);
  assert.equal(targeting.motion, 0);
});

test('real turning degrades tracking; cancelling arrow inputs cannot fool targeting', () => {
  const steady = new EnemyTargeting(), turning = new EnemyTargeting(), opposed = new EnemyTargeting();
  track(new Flight(), steady, 2);
  track(new Flight(), turning, 2, ['ArrowLeft']);
  track(new Flight(), opposed, 2, ['ArrowLeft', 'ArrowRight']);
  assert.equal(steady.progress, 1); assert.equal(opposed.progress, 1);
  assert.ok(turning.progress < .1); assert.ok(turning.motion > .9);
  assert.equal(turning.locked, false);
  assert.equal(turning.canFire, true, 'motion spoils accuracy but does not stop suppressing fire');
});

test('a moving target retains the tracking warning before inaccurate fire starts', () => {
  const flight = new Flight(), squad = new EnemySquad(new THREE.Scene(), new THREE.Group());
  const targeting = squad.drones[0].targeting;
  track(flight, targeting, .6, ['ArrowLeft']);
  assert.equal(targeting.progress, 0); assert.equal(targeting.eligible, true);
  assert.equal(targeting.canFire, false, 'the observation telegraph has not completed');
  const threat = squad.threatSnapshot();
  assert.equal(threat.tracking, 1); assert.equal(threat.locked, 0); assert.equal(threat.firing, 0);
  assert.equal(threat.threats[0].id, 0); assert.equal(threat.threats[0].progress, 0);
});

test('an accepted roll breaks targeting and queued fire without deleting airborne rounds or immunity', () => {
  const flight = new Flight(), squad = new EnemySquad(new THREE.Scene(), new THREE.Group());
  const d = squad.drones[0]; track(flight, d.targeting, 1.3); d.burstRemaining = 2;
  const combat = combatFor(squad);
  combat.spawn(flight.position.clone().add(new THREE.Vector3(0, 0, -2)), new THREE.Vector3(0, 0, 1), 210, true);
  assert.equal(combat.incoming, 1); assert.equal(flight.requestRoll(1), true); squad.breakLocks();
  assert.equal(d.targeting.progress, 0); assert.equal(d.burstRemaining, 0); assert.equal(squad.lockBreaks, 1);
  assert.equal(combat.incoming, 1);
  d.targeting.update(.6, flight, true); assert.equal(d.targeting.progress, 0);
  d.targeting.update(.5, flight, true); assert.equal(d.targeting.canFire, false);
  combat.update(.01, flight); assert.equal(combat.enemyHits, 1); assert.equal(combat.incoming, 0);
  squad.reset(); assert.equal(squad.lockBreaks, 0); assert.equal(d.targeting.holdoff, 0);
});

test('a physical sharp break dodges a ballistic lead that hits unchanged straight flight', () => {
  function run(breakTurn) {
    const flight = new Flight(), targeting = new EnemyTargeting();
    track(flight, targeting, 1.3);
    const squad = { drones: [] }, combat = combatFor(squad);
    const origin = flight.position.clone().add(new THREE.Vector3(0, 0, -180));
    combat.spawn(origin, targeting.aim(origin, flight, 0, 0), CONFIG.enemy.projectileSpeed, true);
    for (let frame = 0; frame < 180; frame++) {
      if (breakTurn && frame === 6) assert.equal(flight.requestBreak(1), true);
      flight.update(1 / 60, new Set()); combat.update(1 / 60, flight);
    }
    return { hits: combat.enemyHits, x: flight.position.x };
  }
  assert.ok(run(false).hits > 0);
  const dodged = run(true); assert.equal(dodged.hits, 0); assert.ok(Math.abs(dodged.x) > 30);
});

test('squad maintains higher burst pressure, reports locks and resets all threats', () => {
  const flight = new Flight(), squad = new EnemySquad(new THREE.Scene(), new THREE.Group());
  const shots = [], seen = [];
  for (let frame = 0; frame < 1200; frame++) {
    flight.update(1 / 60, new Set());
    squad.update(1 / 60, flight, frame / 60, (position, direction) => shots.push({ time: frame / 60, position, direction }));
    seen.push(squad.threatSnapshot());
  }
  assert.ok(shots.length >= 18, `only ${shots.length} shots in 20 seconds`);
  assert.ok(shots[0].time >= CONFIG.enemy.fireTelegraph);
  assert.ok(seen.some(s => s.locked > 0)); assert.ok(seen.some(s => s.firing > 0));
  assert.ok(seen.some(s => s.threats.some(t => t.position.length === 3)));
  squad.reset(); assert.deepEqual(squad.threatSnapshot().threats, []);
});

test('live projectile simulation punishes steady flight more than continuous movement while keeping incoming fire', () => {
  function encounter(moving) {
    const flight = new Flight(), squad = new EnemySquad(new THREE.Scene(), new THREE.Group()), combat = combatFor(squad);
    for (let frame = 0; frame < 1200; frame++) {
      flight.update(1 / 60, new Set(moving ? ['ArrowLeft'] : []));
      squad.update(1 / 60, flight, frame / 60, (position, direction) => combat.spawn(position, direction, CONFIG.enemy.projectileSpeed, true));
      combat.update(1 / 60, flight);
    }
    const result = { shots: combat.enemyShots, hits: combat.enemyHits }; combat.reset(); return result;
  }
  const steady = encounter(false), moving = encounter(true);
  assert.ok(steady.hits > moving.hits * 3, JSON.stringify({ steady, moving }));
  assert.ok(moving.shots >= 15, 'moving does not turn off incoming fire');
});

test('targeting respects paused time, obstruction and frame cadence', () => {
  const values = [30, 60, 120].map(fps => {
    const flight = new Flight(), targeting = new EnemyTargeting(); track(flight, targeting, .9, [], fps);
    const before = targeting.progress; targeting.update(0, flight, true); assert.equal(targeting.progress, before);
    targeting.update(.5, flight, false); assert.equal(targeting.progress, 0); assert.equal(targeting.telegraph, 0);
    targeting.reset(); track(flight, targeting, .9, [], fps); return targeting.progress;
  });
  assert.ok(Math.max(...values) - Math.min(...values) < .001);
});
