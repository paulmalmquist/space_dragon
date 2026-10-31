import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Flight } from '../src/prototypes/dogfight/systems/flight.js';
import { EnemySquad } from '../src/prototypes/dogfight/systems/enemies.js';
import { Combat } from '../src/prototypes/dogfight/systems/combat.js';
import { CONFIG } from '../src/prototypes/dogfight/config.js';

const squadFor = () => new EnemySquad(new THREE.Scene(), new THREE.Group());

test('drones hold a gently moving standoff formation instead of making head-on passes', () => {
  const flight = new Flight(), squad = squadFor(), samples = squad.drones.map(() => []);
  let shots = 0;
  for (let frame = 1; frame <= 1200; frame++) {
    flight.update(1 / 60, new Set());
    squad.update(1 / 60, flight, frame / 60, () => { shots++; });
    squad.drones.forEach((drone, index) => {
      const relative = drone.position.clone().sub(flight.position);
      samples[index].push(relative);
      assert.ok(relative.length() > 230 && relative.length() < 550);
      assert.ok(relative.z < -220, 'bogeys stay ahead rather than passing through the dragon');
      assert.ok(drone.velocity.z < 0 && drone.forward.z > 0, 'facing and travel are independent');
      assert.equal(drone.phase, 'attack');
    });
  }
  for (const positions of samples) {
    const lateral = positions.map(position => position.x), heights = positions.map(position => position.y);
    assert.ok(Math.max(...lateral) - Math.min(...lateral) > 15, 'strafing remains visible');
    assert.ok(Math.max(...lateral) - Math.min(...lateral) < 60, 'lateral movement is restrained');
    assert.ok(Math.max(...heights) - Math.min(...heights) < 27);
  }
  assert.ok(shots >= 18, 'station holding does not disable incoming fire');
});

test('rapid turns, boost and evasive maneuvers retain separation with continuous finite travel', () => {
  const flight = new Flight(), squad = squadFor(), dt = 1 / 60;
  let minimum = Infinity;
  for (let frame = 1; frame <= 1800; frame++) {
    const keys = new Set(frame < 220 ? ['ArrowLeft', 'ShiftLeft'] : frame < 500 ? ['ArrowRight', 'ArrowUp'] : frame < 800 ? ['ArrowLeft', 'ArrowDown'] : []);
    if (frame === 120) assert.equal(flight.requestRoll(1), true);
    if (frame === 240) assert.equal(flight.requestBreak(-1), true);
    flight.update(dt, keys);
    const previous = squad.drones.map(drone => drone.position.clone());
    squad.update(dt, flight, frame * dt, () => {});
    squad.drones.forEach((drone, index) => {
      minimum = Math.min(minimum, drone.position.distanceTo(flight.position));
      assert.ok(drone.position.toArray().every(Number.isFinite));
      assert.ok(drone.velocity.toArray().every(Number.isFinite));
      assert.ok(drone.relativeVelocity.length() <= CONFIG.enemy.stationSpeed + 1e-8);
      assert.ok(drone.position.distanceTo(previous[index]) <= (CONFIG.boost.speed + CONFIG.enemy.stationSpeed) * dt + 1e-8);
      const measuredVelocity = drone.position.clone().sub(previous[index]).multiplyScalar(1 / dt);
      assert.ok(measuredVelocity.distanceTo(drone.velocity) < 1e-8);
    });
  }
  assert.ok(minimum > CONFIG.enemy.minSeparation, `closest drone was ${minimum.toFixed(2)}m`);
});

test('formation goals orbit around the dragon after a reversal rather than cutting through it', () => {
  const flight = new Flight(), squad = squadFor();
  let minimum = Infinity;
  for (let frame = 1; frame <= 3600; frame++) {
    flight.update(1 / 60, new Set(frame < 160 ? ['ArrowLeft'] : []));
    squad.update(1 / 60, flight, frame / 60, () => {});
    for (const drone of squad.drones) minimum = Math.min(minimum, drone.position.distanceTo(flight.position));
  }
  assert.ok(minimum > CONFIG.enemy.minSeparation, `reversal separation ${minimum.toFixed(2)}m`);
  for (const drone of squad.drones) {
    const relative = drone.position.clone().sub(flight.position).normalize();
    assert.ok(relative.dot(flight.forward) > .65, 'drones eventually settle in the new forward formation');
  }
});

test('an unexpectedly close drone retreats gradually instead of teleporting to the distance floor', () => {
  const flight = new Flight(), squad = squadFor(), drone = squad.drones[0], dt = 1 / 60;
  drone.position.copy(flight.position).addScaledVector(flight.forward, 140);
  const before = drone.position.clone(); flight.update(dt, new Set()); squad.update(dt, flight, dt, () => {});
  assert.ok(drone.position.distanceTo(before) < (CONFIG.flight.cruiseSpeed + CONFIG.enemy.stationSpeed) * dt);
  assert.ok(drone.position.distanceTo(flight.position) < CONFIG.enemy.minSeparation, 'the floor is a steering goal, not a teleport');
  for (let frame = 2; frame <= 240; frame++) { flight.update(dt, new Set()); squad.update(dt, flight, frame * dt, () => {}); }
  assert.ok(drone.position.distanceTo(flight.position) > 175);
});

test('pause preserves station motion and reset restores its encounter state', () => {
  const flight = new Flight(), squad = squadFor();
  for (let frame = 1; frame <= 120; frame++) { flight.update(1 / 60, new Set(['ArrowRight'])); squad.update(1 / 60, flight, frame / 60, () => {}); }
  squad.damage(squad.drones[1], CONFIG.enemy.health); squad.breakLocks();
  const state = () => JSON.stringify({ anchor: squad.playerAnchor.toArray(), drones: squad.drones.map(drone => ({ position: drone.position.toArray(), velocity: drone.velocity.toArray(), relative: drone.relativeVelocity.toArray(), phaseTime: drone.phaseTime, cooldown: drone.cooldown })) });
  const paused = state(); squad.update(0, flight, 100, () => { throw new Error('paused fire'); }); squad.update(NaN, flight, 100, () => {});
  assert.equal(state(), paused);
  squad.reset();
  assert.equal(squad.alive.length, 3); assert.equal(squad.lockBreaks, 0);
  assert.deepEqual(squad.playerAnchor.toArray(), [0, 0, 0]);
  for (const drone of squad.drones) {
    assert.deepEqual(drone.relativeVelocity.toArray(), [0, 0, 0]); assert.equal(drone.health, CONFIG.enemy.health);
    assert.deepEqual(drone.position.toArray(), drone.stationOffset.toArray()); assert.equal(drone.burstRemaining, 0);
  }
});

test('station steering is consistent at 30 and 120 frames per second', () => {
  const positions = [30, 120].map(fps => {
    const flight = new Flight(), squad = squadFor();
    for (let frame = 1; frame <= fps * 20; frame++) { flight.update(1 / fps, new Set()); squad.update(1 / fps, flight, frame / fps, () => {}); }
    return squad.drones.map(drone => drone.position.clone());
  });
  positions[0].forEach((position, index) => assert.ok(position.distanceTo(positions[1][index]) < .3));
});

test('continuous station holding replaces flyby downtime without tripling guarded incoming damage', () => {
  assert.equal(CONFIG.enemy.damage, 7); assert.equal(CONFIG.dragon.invulnerability, .65);
  assert.equal(CONFIG.enemy.burstCount, 3); assert.equal(CONFIG.enemy.fireTelegraph, .75);
  const flight = new Flight(), squad = squadFor();
  let energy = CONFIG.dragon.wingEnergy, invulnerability = 0, damageEvents = 0;
  const combat = new Combat(new THREE.Scene(), { burst() {} }, { fire() {}, hit() {}, disable() {} }, squad,
    () => {}, amount => {
      // Same damage guard as the playing lab; no spelling/movement immunity.
      if (invulnerability > 0) return;
      energy = Math.max(0, energy - amount); invulnerability = CONFIG.dragon.invulnerability; damageEvents++;
    }, () => {});
  for (let frame = 1; frame <= 1200; frame++) {
    invulnerability = Math.max(0, invulnerability - 1 / 60);
    flight.update(1 / 60, new Set());
    squad.update(1 / 60, flight, frame / 60, (position, direction) => combat.spawn(position, direction, CONFIG.enemy.projectileSpeed, true));
    combat.update(1 / 60, flight);
  }
  assert.ok(combat.enemyShots >= 30 && combat.enemyShots <= 55, `${combat.enemyShots} shots in twenty seconds`);
  assert.ok(damageEvents > 0 && energy < CONFIG.dragon.wingEnergy, 'steady flight still takes ordinary projectile damage');
  assert.ok(energy > 0, 'idle benchmark stays in live flight through twenty seconds');
  assert.ok(combat.enemyHits > damageEvents, 'the existing damage guard still limits repeated contacts');
  combat.reset();
});
