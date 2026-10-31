import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { makePulse } from '../assets/effects.js';
import { mouthPosition } from './aim.js';
import { dragonCollisionRadius } from './collision-shapes.js';

export function segmentDistanceSq(point, start, end) {
  const line = end.clone().sub(start), length = line.lengthSq();
  const t = length ? THREE.MathUtils.clamp(point.clone().sub(start).dot(line) / length, 0, 1) : 0;
  return point.distanceToSquared(start.clone().addScaledVector(line, t));
}
export function assistedTarget(player, drones, aimDirection = player.forward) {
  let best = null, bestDot = Math.cos(CONFIG.weapon.assistAngle);
  for (const d of drones) {
    if (d.dead) continue;
    const delta = d.position.clone().sub(player.position), range = delta.length();
    const dot = delta.normalize().dot(aimDirection);
    if (range < CONFIG.weapon.assistRange && dot > bestDot) { best = d; bestDot = dot; }
  }
  return best;
}

export class Combat {
  constructor(scene, effects, audio, squad, onHit, onDamage, onDisable) {
    this.scene = scene; this.effects = effects; this.audio = audio; this.squad = squad; this.onHit = onHit; this.onDamage = onDamage; this.onDisable = onDisable;
    this.pulses = []; this.cooldown = 0; this.shots = 0; this.hits = 0; this.enemyShots = 0; this.enemyHits = 0;
    this.lastShotDirection = null;
    this.breathShots = 0; this.breathHits = 0; this.appliedBursts = new Set();
  }
  spawn(position, direction, speed, enemy = false) {
    if (enemy) this.enemyShots++;
    const mesh = makePulse(enemy); mesh.position.copy(position); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    this.scene.add(mesh); this.pulses.push({ mesh, position: mesh.position, previous: position.clone(), velocity: direction.clone().multiplyScalar(speed), enemy, life: enemy ? CONFIG.enemy.projectileLife : CONFIG.weapon.lifetime });
  }
  fire(player, aimDirection = player.forward) {
    if (this.cooldown > 0) return false;
    const target = assistedTarget(player, this.squad.drones, aimDirection);
    const direction = aimDirection.clone().normalize();
    if (target) {
      const leadTime = target.position.distanceTo(player.position) / (CONFIG.weapon.projectileSpeed + player.speed);
      const aim = target.position.clone().addScaledVector(target.velocity, leadTime).sub(player.position).normalize();
      direction.lerp(aim, CONFIG.weapon.assistStrength).normalize();
    }
    const mouth = mouthPosition(player);
    this.lastShotDirection = direction.clone();
    this.spawn(mouth, direction, CONFIG.weapon.projectileSpeed + player.speed);
    this.cooldown = CONFIG.weapon.interval; this.shots++; this.audio.fire(); return true;
  }
  strikeLocked(targetIds, burstId) {
    if (!Number.isSafeInteger(burstId) || burstId < 1 || !Array.isArray(targetIds) || !targetIds.length || this.appliedBursts.has(burstId)) return 0;
    // One immutable target batch per burst, including a replay with changed IDs.
    this.appliedBursts.add(burstId); this.breathShots++;
    let disabledCount = 0;
    for (const id of new Set(targetIds)) {
      const drone = this.squad.drones.find(candidate => candidate.id === id);
      if (!drone || drone.dead) continue;
      const disabled = this.squad.damage(drone, drone.health);
      if (!disabled) continue;
      this.breathHits++; disabledCount++;
      this.effects.burst(drone.position, 'violet', true); this.audio.disable();
      this.onHit(drone, true); this.onDisable(drone);
    }
    return disabledCount;
  }
  remove(index) {
    const pulse = this.pulses[index]; this.scene.remove(pulse.mesh);
    pulse.mesh.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); this.pulses.splice(index, 1);
  }
  update(dt, player) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i]; p.life -= dt; p.previous.copy(p.position); p.position.addScaledVector(p.velocity, dt);
      let hit = false;
      if (p.enemy) {
        const radius = dragonCollisionRadius('enemy-projectile');
        if (segmentDistanceSq(player.position, p.previous, p.position) < radius * radius) {
          this.enemyHits++;
          this.onDamage(CONFIG.enemy.damage); this.effects.burst(p.position, 'amber'); hit = true;
        }
      } else {
        for (const d of this.squad.drones) {
          if (d.dead) continue;
          const radius = CONFIG.enemy.hitRadius + CONFIG.weapon.hitRadius;
          if (segmentDistanceSq(d.position, p.previous, p.position) < radius * radius) {
            this.hits++; const disabled = this.squad.damage(d, CONFIG.weapon.damage);
            this.effects.burst(d.position, disabled ? 'amber' : 'violet', disabled);
            if (disabled) { this.audio.disable(); this.onDisable(d); } else this.audio.hit();
            this.onHit(d, disabled); hit = true; break;
          }
        }
      }
      if (hit || p.life <= 0) this.remove(i);
    }
  }
  get incoming() { return this.pulses.filter(p => p.enemy).length; }
  reset() { for (let i = this.pulses.length - 1; i >= 0; i--) this.remove(i); this.cooldown = 0; this.shots = 0; this.hits = 0; this.enemyShots = 0; this.enemyHits = 0; this.lastShotDirection = null; this.breathShots = 0; this.breathHits = 0; this.appliedBursts.clear(); }
}
