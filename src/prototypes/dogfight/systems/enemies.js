import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { EnemyTargeting } from './enemy-targeting.js';

const fwd = new THREE.Vector3(0, 0, -1);
export class EnemySquad {
  constructor(scene, model) {
    this.scene = scene; this.drones = []; this.playerAnchor = new THREE.Vector3();
    for (let i = 0; i < CONFIG.enemy.count; i++) {
      const root = new THREE.Group(), mesh = model.clone(true);
      mesh.scale.setScalar(2.6);
      mesh.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.userData.baseEmissive = o.material.emissive?.clone(); o.userData.baseIntensity = o.material.emissiveIntensity; } });
      root.add(mesh); scene.add(root);
      const drone = { id: i, name: `WRAITH ${String(i + 1).padStart(2, '0')}`, root, mesh, position: root.position, orientation: root.quaternion, forward: new THREE.Vector3(), velocity: new THREE.Vector3(), relativeVelocity: new THREE.Vector3(), stationOffset: new THREE.Vector3(), goal: new THREE.Vector3(), targeting: new EnemyTargeting(), burstRemaining: 0, burstTimer: 0, health: 0, phase: 'attack', phaseTime: 0, cooldown: 0, flash: 0, dead: false };
      this.drones.push(drone);
    }
    this.reset();
  }
  reset() {
    this.lockBreaks = 0; this.playerAnchor.set(0, 0, 0);
    const starts = [[-90, 25, -260], [140, -25, -360], [-150, 60, -460]];
    for (const d of this.drones) {
      d.stationOffset.set(...starts[d.id]); d.position.copy(d.stationOffset); d.orientation.identity(); d.orientation.setFromUnitVectors(fwd, d.position.clone().negate().normalize());
      d.forward.copy(fwd).applyQuaternion(d.orientation); d.health = CONFIG.enemy.health; d.phase = 'attack'; d.phaseTime = -d.id * 1.4; d.cooldown = .9 + d.id * .4;
      d.dead = false; d.root.visible = true; d.flash = 0; d.mesh.rotation.set(0, 0, 0); d.mesh.position.set(0, 0, 0); d.goal.copy(d.stationOffset);
      d.velocity.copy(fwd).multiplyScalar(CONFIG.flight.cruiseSpeed); d.relativeVelocity.set(0, 0, 0); this.setFlash(d);
      d.targeting.reset(); d.burstRemaining = 0; d.burstTimer = 0;
    }
  }
  setFlash(d) {
    d.mesh.traverse(o => {
      if (!o.isMesh || !o.material.emissive) return;
      if (d.flash > 0) { o.material.emissive.set(0xc6a5ff); o.material.emissiveIntensity = 2; }
      else { o.material.emissive.copy(o.userData.baseEmissive); o.material.emissiveIntensity = o.userData.baseIntensity; }
    });
  }
  update(dt, player, elapsed, fire) {
    if (!(dt > 0) || !Number.isFinite(dt)) return;
    const c = CONFIG.enemy;
    const time = Number.isFinite(elapsed) ? elapsed : 0;
    // Carry ordinary travel, not the roll corkscrew. Relative steering remains
    // bounded even when the pilot turns and the formation goal swings around.
    const anchor = player.position.clone();
    if (player.rollOffset) anchor.sub(player.rollOffset);
    const travel = anchor.clone().sub(this.playerAnchor).clampLength(0, CONFIG.boost.speed * dt);
    this.playerAnchor.copy(anchor);
    for (const d of this.drones) {
      if (d.dead) continue;
      d.phaseTime += dt; d.cooldown -= dt; d.flash = Math.max(0, d.flash - dt); this.setFlash(d);
      const previous = d.position.clone(); d.position.add(travel);
      const phase = d.id * 2.1;
      const localStation = d.stationOffset.clone();
      localStation.x += Math.sin(time * (.5 + d.id * .055) + phase) * c.strafeWidth;
      localStation.y += Math.sin(time * (.65 + d.id * .035) + phase) * c.strafeHeight;
      d.goal.copy(localStation).applyQuaternion(player.orientation).add(anchor);
      const correction = d.goal.clone().sub(d.position).multiplyScalar(c.stationGain).clampLength(0, c.stationSpeed);
      const outward = d.position.clone().sub(anchor), separation = outward.length();
      if (separation < c.avoidRadius) {
        outward.normalize();
        if (!separation) outward.copy(player.forward).negate();
        const inward = correction.dot(outward);
        if (inward < 0) {
          correction.addScaledVector(outward, -inward);
          // Circle a blocked goal rather than cutting across the dragon.
          const tangent = outward.clone().cross(player.up);
          if (tangent.lengthSq() < .001) tangent.crossVectors(outward, new THREE.Vector3(1, 0, 0));
          if (correction.length() < c.stationSpeed * .5) correction.addScaledVector(tangent.normalize(), (d.id % 2 ? -1 : 1) * c.stationSpeed * .75);
        }
        correction.addScaledVector(outward, Math.max(0, c.minSeparation + 30 - separation));
        correction.clampLength(0, c.stationSpeed);
      }
      const velocityChange = correction.sub(d.relativeVelocity).multiplyScalar(1 - Math.exp(-c.stationResponse * dt)).clampLength(0, c.stationAcceleration * dt);
      d.relativeVelocity.add(velocityChange); d.position.addScaledVector(d.relativeVelocity, dt);
      d.velocity.copy(d.position).sub(previous).multiplyScalar(1 / dt);
      const toPlayer = player.position.clone().sub(d.position), distance = toPlayer.length();
      const facing = distance > .001 ? toPlayer.clone().multiplyScalar(1 / distance) : d.forward;
      const targetQ = new THREE.Quaternion().setFromUnitVectors(fwd, facing);
      d.orientation.rotateTowards(targetQ, c.turnRate * dt);
      d.forward.copy(fwd).applyQuaternion(d.orientation);
      const lateral = d.relativeVelocity.clone().applyQuaternion(d.orientation.clone().invert()).x;
      d.mesh.rotation.z = THREE.MathUtils.lerp(d.mesh.rotation.z, -lateral / c.stationSpeed * .16, 1 - Math.exp(-4 * dt));
      d.mesh.position.y = Math.sin(time * 1.7 + d.id) * .15;
      const eligible = d.phase === 'attack' && distance < c.fireRange && distance > 35 && d.forward.dot(toPlayer.normalize()) > .83;
      d.targeting.update(dt, player, eligible);
      if (!eligible || !d.targeting.canFire) d.burstRemaining = 0;
      if (eligible && d.cooldown <= 0 && d.targeting.canFire && !d.burstRemaining) {
        d.burstRemaining = c.burstCount; d.burstTimer = 0; d.cooldown = c.fireInterval * (1.4 - .4 * d.targeting.progress) + d.id * .17;
      }
      d.burstTimer -= dt;
      if (d.burstRemaining > 0 && d.burstTimer <= 0) {
        const origin = d.position.clone().addScaledVector(d.forward, 4);
        fire(origin, d.targeting.aim(origin, player, time, d.id));
        d.targeting.noteShot(); d.burstRemaining--; d.burstTimer = c.burstSpacing;
      }
    }
  }
  breakLocks() {
    this.lockBreaks++;
    for (const d of this.drones) { d.targeting.breakLock(); d.burstRemaining = 0; }
  }
  threatSnapshot() {
    const threats = this.alive.filter(d => d.targeting.eligible || d.targeting.progress > .01 || d.targeting.firing).map(d => ({ id: d.id, name: d.name, progress: d.targeting.progress, locked: d.targeting.locked, firing: d.targeting.firing, position: d.position.toArray() }));
    return { tracking: threats.length, locked: threats.filter(d => d.locked).length, firing: threats.filter(d => d.firing).length, progress: Math.max(0, ...threats.map(d => d.progress)), steadiness: this.alive.length ? 1 - Math.max(...this.alive.map(d => d.targeting.motion)) : 0, lockBreaks: this.lockBreaks, threats };
  }
  damage(drone, amount) {
    if (drone.dead) return false;
    drone.health = Math.max(0, drone.health - amount); drone.flash = .13;
    if (!drone.health) { drone.dead = true; drone.root.visible = false; return true; }
    return false;
  }
  get alive() { return this.drones.filter(d => !d.dead); }
}
