import * as THREE from 'three';
import { CONFIG } from '../config.js';

// The enemy observes actual motion, never pressed keys or a temporary immunity flag.
export class EnemyTargeting {
  constructor() { this.reset(); }
  reset() {
    this.progress = 0; this.telegraph = 0; this.holdoff = 0; this.shotWarning = 0; this.eligible = false;
    this.motion = 0; this.previousVelocity = null; this.previousForward = null;
    this.predictedVelocity = new THREE.Vector3();
  }
  breakLock() {
    this.progress = 0; this.telegraph = 0; this.shotWarning = 0; this.eligible = false;
    this.holdoff = CONFIG.enemy.trackingHoldoff;
  }
  update(dt, player, eligible) {
    if (!(dt > 0) || !Number.isFinite(dt)) return;
    const c = CONFIG.enemy;
    this.eligible = eligible;
    const acceleration = this.previousVelocity ? player.velocity.distanceTo(this.previousVelocity) / dt : 0;
    const angularRate = this.previousForward ? player.forward.angleTo(this.previousForward) / dt : 0;
    const motion = THREE.MathUtils.clamp(acceleration / 42 + angularRate / .95, 0, 1);
    this.motion = THREE.MathUtils.lerp(this.motion, motion, 1 - Math.exp(-7 * dt));
    if (!this.previousVelocity) this.predictedVelocity.copy(player.velocity);
    else this.predictedVelocity.lerp(player.velocity, 1 - Math.exp(-2.4 * dt));
    this.previousVelocity ??= new THREE.Vector3(); this.previousVelocity.copy(player.velocity);
    this.previousForward ??= new THREE.Vector3(); this.previousForward.copy(player.forward);
    this.shotWarning = Math.max(0, this.shotWarning - dt);
    this.holdoff = Math.max(0, this.holdoff - dt);
    if (this.holdoff > 0) { this.progress = 0; this.telegraph = 0; this.eligible = false; return; }
    if (!eligible) { this.progress = Math.max(0, this.progress - dt * c.trackingLose); this.telegraph = 0; return; }
    const gain = (1 - this.motion) / c.trackingAcquire - this.motion * c.trackingLose;
    this.progress = THREE.MathUtils.clamp(this.progress + gain * dt, 0, 1);
    // A jinking target is still shot at, but the unsettled solution has wider dispersion.
    this.telegraph += dt;
  }
  get locked() { return this.progress >= .8 && this.holdoff <= 0; }
  get canFire() { return this.eligible && this.telegraph >= CONFIG.enemy.fireTelegraph && this.holdoff <= 0; }
  get firing() { return this.shotWarning > 0; }
  noteShot() { this.shotWarning = .45; }
  aim(origin, player, elapsed, id) {
    const delta = player.position.clone().sub(origin), velocity = this.predictedVelocity;
    const speed = CONFIG.enemy.projectileSpeed;
    // Solve interception for steady flight. A changing velocity leaves this estimate behind.
    const a = velocity.lengthSq() - speed * speed, b = 2 * delta.dot(velocity), c = delta.lengthSq();
    const discriminant = b * b - 4 * a * c;
    let time = delta.length() / speed;
    if (Math.abs(a) > 1e-8 && discriminant >= 0) {
      const root = Math.sqrt(discriminant), candidates = [(-b - root) / (2 * a), (-b + root) / (2 * a)].filter(t => t > 0);
      if (candidates.length) time = Math.min(...candidates);
    }
    const target = player.position.clone().addScaledVector(velocity, Math.min(time, CONFIG.enemy.projectileLife));
    const spread = .6 + (1 - this.progress) * 14;
    target.addScaledVector(player.up, Math.sin(elapsed * 3.7 + id * 2.3) * spread);
    const side = player.forward.clone().cross(player.up).normalize();
    target.addScaledVector(side, Math.cos(elapsed * 2.9 + id * 1.7) * spread);
    return target.sub(origin).normalize();
  }
}
