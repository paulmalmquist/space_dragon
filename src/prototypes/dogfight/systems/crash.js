import * as THREE from 'three';
import { dragonCollisionRadius } from './collision-shapes.js';

export const CRASH_TIMING = Object.freeze({ duration: 3, reducedDuration: .8, modelBreakup: 1.75 });
const finiteVector = vector => vector && ['x', 'y', 'z'].every(axis => Number.isFinite(vector[axis]));
const copyVector = (vector, fallback = new THREE.Vector3()) => finiteVector(vector) ? new THREE.Vector3(vector.x, vector.y, vector.z) : fallback.clone();

// Swept ship-center collision against the rock's solid core, expanded by hull
// radius. It reports the first contact and never moves either participant.
export function sweepAsteroidImpact(start, end, colliders, shipRadius = dragonCollisionRadius()) {
  if (!finiteVector(start) || !finiteVector(end)) return null;
  if (!Number.isFinite(shipRadius) || shipRadius < 0) throw new RangeError('Hull radius must be finite and nonnegative.');
  const direction = copyVector(end).sub(start), a = direction.lengthSq();
  let earliest = null;
  for (const collider of colliders || []) {
    if (!finiteVector(collider?.center) || !Number.isFinite(collider.radius) || collider.radius <= 0) continue;
    const radius = collider.radius + shipRadius, relative = copyVector(start).sub(collider.center), c = relative.lengthSq() - radius * radius;
    let t;
    if (c <= 0) t = 0;
    else {
      if (a <= 1e-12) continue;
      const b = relative.dot(direction), discriminant = b * b - a * c;
      if (discriminant < 0) continue;
      t = (-b - Math.sqrt(discriminant)) / a;
      if (t < 0 || t > 1) continue;
    }
    if (earliest && t >= earliest.t) continue;
    const point = copyVector(start).addScaledVector(direction, t), center = copyVector(collider.center);
    const normal = point.clone().sub(center);
    if (normal.lengthSq() > 1e-12) normal.normalize();
    else if (a > 1e-12) normal.copy(direction).negate().normalize();
    else normal.set(0, 1, 0);
    earliest = { id: collider.id, t, point, center, normal, radius: collider.radius, combinedRadius: radius,
      contactPoint: center.clone().addScaledVector(normal, collider.radius),
      safePosition: center.clone().addScaledVector(normal, radius + .05) };
  }
  return earliest;
}

export function evaluateImpact(velocity, normal, hull = 100) {
  if (!finiteVector(velocity) || !finiteVector(normal) || normal.lengthSq?.() === 0 || !Number.isFinite(hull)) throw new TypeError('Impact requires finite velocity, normal and hull.');
  const incoming = copyVector(velocity), outward = copyVector(normal);
  if (outward.lengthSq() <= 1e-12) throw new TypeError('Impact normal cannot be zero.');
  outward.normalize();
  const speed = incoming.length(), signed = incoming.dot(outward), normalSpeed = Math.max(0, -signed);
  const grazeDamage = Math.round(12 + THREE.MathUtils.clamp(normalSpeed / 65, 0, 1) * 23);
  const remainingHull = Math.max(0, hull), fatal = normalSpeed >= 65 || remainingHull <= grazeDamage;
  const damage = fatal ? Math.max(remainingHull, grazeDamage) : grazeDamage;
  const tangential = incoming.clone().addScaledVector(outward, -signed).multiplyScalar(.82);
  const deflectedVelocity = tangential.addScaledVector(outward, Math.max(6, normalSpeed * .35));
  return { fatal, damage, speed, normalSpeed, deflectedVelocity };
}

// This clock owns only the encounter's machine-loss sequence. Rendering may
// observe its pose, but cannot finish the sequence or replay its recovery event.
export class CrashSequence {
  constructor() { this.nextId = 1; this.reset(); }
  reset() {
    this.active = false; this.started = false; this.elapsed = 0; this.duration = CRASH_TIMING.duration;
    this.id = 0; this.cause = null; this.colliderId = null; this.reducedMotion = false; this.recoveryEmitted = false;
    this.point = new THREE.Vector3(); this.velocity = new THREE.Vector3();
  }
  begin({ cause = 'collision', point, velocity, reducedMotion = false, colliderId = null } = {}) {
    if (this.started) return false;
    this.started = true; this.active = true; this.id = this.nextId++;
    this.cause = String(cause); this.colliderId = colliderId;
    this.point.copy(copyVector(point)); this.velocity.copy(copyVector(velocity));
    this.reducedMotion = Boolean(reducedMotion); this.duration = this.reducedMotion ? CRASH_TIMING.reducedDuration : CRASH_TIMING.duration;
    return true;
  }
  update(dt) {
    const events = [];
    if (!this.active || !(dt > 0) || !Number.isFinite(dt)) return { events, recovery: false };
    this.elapsed = Math.min(this.duration, this.elapsed + dt);
    if (this.duration - this.elapsed < 1e-10) this.elapsed = this.duration;
    if (this.elapsed === this.duration) {
      this.active = false;
      if (!this.recoveryEmitted) {
        this.recoveryEmitted = true; events.push({ type: 'recover', id: this.id, cause: this.cause });
      }
    }
    return { events, recovery: events.length > 0 };
  }
  snapshot() {
    const elapsed = this.elapsed, progress = this.started ? elapsed / this.duration : 0;
    const recovered = this.started && !this.active;
    const stage = !this.started ? 'idle' : recovered ? 'recovery' : this.reducedMotion ?
      elapsed < .16 ? 'impact' : elapsed < .45 ? 'rupture' : 'wreckage' :
      elapsed < .2 ? 'impact' : elapsed < .85 ? 'rupture' : elapsed < CRASH_TIMING.modelBreakup ? 'tumble' : 'wreckage';
    const direction = this.velocity.clone(); if (direction.lengthSq()) direction.normalize();
    const drift = this.reducedMotion ? 0 : 9 * (1 - Math.exp(-elapsed * .9));
    const offset = direction.multiplyScalar(drift);
    if (!this.reducedMotion) offset.y -= Math.sin(Math.min(1, progress) * Math.PI * .5) * 2.5;
    const modelVisible = this.started && this.active && elapsed < (this.reducedMotion ? .35 : CRASH_TIMING.modelBreakup);
    return { active: this.active, started: this.started, id: this.id, cause: this.cause, colliderId: this.colliderId,
      elapsed, duration: this.duration, progress, stage, reducedMotion: this.reducedMotion,
      point: this.point.toArray(), velocity: this.velocity.toArray(),
      pose: { offset: offset.toArray(), roll: this.reducedMotion ? 0 : elapsed * 1.6 + elapsed * elapsed * 1.4,
        pitch: this.reducedMotion ? 0 : -.25 * elapsed + .32 * elapsed * elapsed, modelVisible, opacity: modelVisible ? 1 : 0 } };
  }
}
