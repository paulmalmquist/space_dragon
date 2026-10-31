import * as THREE from 'three';
import { CONFIG } from '../config.js';
const forwardAxis = new THREE.Vector3(0, 0, -1);
const upAxis = new THREE.Vector3(0, 1, 0);
const tempQ = new THREE.Quaternion();
const tempE = new THREE.Euler(0, 0, 0, 'YXZ');
export const damp = (current, target, response, dt) => THREE.MathUtils.lerp(current, target, 1 - Math.exp(-response * dt));

export class Flight {
  constructor() {
    this.position = new THREE.Vector3(); this.orientation = new THREE.Quaternion(); this.velocity = new THREE.Vector3();
    this.cruiseVelocity = new THREE.Vector3(); this.forward = new THREE.Vector3(); this.up = new THREE.Vector3();
    this.rollBasis = new THREE.Quaternion(); this.rollOffset = new THREE.Vector3(); this.reset();
  }
  reset() {
    this.position.set(0, 0, 0); this.orientation.identity(); this.velocity.set(0, 0, -CONFIG.flight.cruiseSpeed);
    this.cruiseVelocity.copy(this.velocity);
    this.forward.set(0, 0, -1); this.up.set(0, 1, 0); this.speed = CONFIG.flight.cruiseSpeed; this.cruiseSpeed = this.speed;
    this.yawRate = 0; this.pitchRate = 0; this.bank = 0; this.boost = CONFIG.boost.capacity; this.boosting = false; this.boostLocked = false; this.rechargeDelay = 0;
    this.rollActive = false; this.rollAngle = 0; this.rollElapsed = 0; this.rollDirection = 0;
    this.rollCooldown = 0; this.rollsStarted = 0; this.rollSerial = 0; this.rollsCompleted = 0; this.rollOffset.set(0, 0, 0); this.rollBasis.identity();
    this.breakActive = false; this.breakElapsed = 0; this.breakDirection = 0; this.breakCooldown = 0;
    this.breaksStarted = 0; this.breakSerial = 0; this.breaksCompleted = 0; this.maneuverSerial = 0;
    this.evasionMax = CONFIG.evasion.capacity; this.evasionEnergy = this.evasionMax; this.evasionRechargeDelay = 0;
    this.lastManeuverResult = null;
  }
  acceptManeuver(type, direction, cost) {
    const reason = ![-1, 1].includes(direction) ? 'invalid-direction'
      : this.rollActive || this.breakActive ? 'busy'
        : this.rollCooldown > 0 || this.breakCooldown > 0 ? 'cooldown'
          : this.evasionEnergy < cost ? 'energy' : null;
    this.lastManeuverResult = { accepted: !reason, type, reason, cost };
    if (reason) return false;
    this.evasionEnergy -= cost; this.evasionRechargeDelay = CONFIG.evasion.rechargeDelay; this.maneuverSerial++;
    return true;
  }
  // Input owns the press edge: holding Q/E must not enqueue repeated rolls.
  requestRoll(direction) {
    if (!this.acceptManeuver('roll', direction, CONFIG.evasion.rollCost)) return false;
    this.rollActive = true; this.rollElapsed = 0; this.rollDirection = direction;
    this.rollsStarted++; this.rollSerial++;
    this.rollBasis.copy(this.orientation); this.rollOffset.set(0, 0, 0); return true;
  }
  // A break turn trades speed and energy for a hard physical heading change.
  // It does not delete incoming shots, grant immunity or directly clear locks.
  requestBreak(direction = -Math.sign(this.bank) || -1) {
    if (!this.acceptManeuver('break', direction, CONFIG.evasion.breakCost)) return false;
    this.breakActive = true; this.breakElapsed = 0; this.breakDirection = direction;
    this.breaksStarted++; this.breakSerial++; return true;
  }
  updateEvasion(dt) {
    const remaining = this.rollActive ? CONFIG.roll.duration - this.rollElapsed
      : this.breakActive ? CONFIG.breakTurn.duration - this.breakElapsed : 0;
    const activeTime = Math.min(dt, Math.max(0, remaining));
    if (activeTime > 0) this.evasionRechargeDelay = CONFIG.evasion.rechargeDelay;
    const idleTime = dt - activeTime;
    const waiting = Math.min(idleTime, this.evasionRechargeDelay);
    this.evasionRechargeDelay = Math.max(0, this.evasionRechargeDelay - idleTime);
    this.evasionEnergy = Math.min(this.evasionMax, this.evasionEnergy + (idleTime - waiting) * CONFIG.evasion.rechargeRate);
  }
  updateBreak(dt) {
    if (!this.breakActive) { this.breakCooldown = Math.max(0, this.breakCooldown - dt); return; }
    this.breakElapsed = Math.min(CONFIG.breakTurn.duration, this.breakElapsed + dt);
    if (CONFIG.breakTurn.duration - this.breakElapsed < 1e-10) this.breakElapsed = CONFIG.breakTurn.duration;
    if (this.breakElapsed === CONFIG.breakTurn.duration) {
      this.breakActive = false; this.breakCooldown = CONFIG.breakTurn.cooldown; this.breaksCompleted++;
    }
  }
  updateRoll(dt) {
    if (!this.rollActive) { this.rollCooldown = Math.max(0, this.rollCooldown - dt); return; }
    this.rollElapsed = Math.min(CONFIG.roll.duration, this.rollElapsed + dt);
    if (CONFIG.roll.duration - this.rollElapsed < 1e-10) this.rollElapsed = CONFIG.roll.duration;
    const t = this.rollElapsed / CONFIG.roll.duration;
    const eased = t * t * t * (10 + t * (-15 + t * 6));
    const angle = eased * Math.PI * 2;
    this.rollAngle = -this.rollDirection * angle;
    // One small corkscrew around the travel axis. The ending offset is exactly
    // zero; steering orientation remains independent, keeping the camera level.
    const offset = t === 1 ? new THREE.Vector3() : new THREE.Vector3(
      this.rollDirection * CONFIG.roll.radius * Math.sin(angle),
      CONFIG.roll.radius * (1 - Math.cos(angle)), 0,
    ).applyQuaternion(this.rollBasis);
    const delta = offset.clone().sub(this.rollOffset);
    this.position.add(delta);
    if (dt > 0) this.velocity.addScaledVector(delta, 1 / dt);
    this.rollOffset.copy(offset);
    if (t === 1) {
      this.rollActive = false; this.rollAngle = 0; this.rollCooldown = CONFIG.roll.cooldown; this.rollsCompleted++;
    }
  }
  update(dt, keys, stick = { x: 0, y: 0 }) {
    if (!(dt > 0) || !Number.isFinite(dt)) return;
    // Hard turns need finer integration than ordinary cruising. Limit the work
    // to the remaining maneuver, so a delayed frame cannot create an unbounded
    // catch-up loop or a different dodge path on a slower display.
    if (this.breakActive && dt > 1 / 120 + 1e-10) {
      const maneuverTime = Math.min(dt, CONFIG.breakTurn.duration - this.breakElapsed);
      const slices = Math.max(1, Math.ceil(maneuverTime * 120));
      for (let i = 0; i < slices; i++) this.update(maneuverTime / slices, keys, stick);
      if (dt > maneuverTime) this.update(dt - maneuverTime, keys, stick);
      return;
    }
    this.updateEvasion(dt);
    const c = CONFIG.flight, b = CONFIG.boost;
    const breaking = this.breakActive, turn = CONFIG.breakTurn;
    const stickX = Number.isFinite(stick.x) ? THREE.MathUtils.clamp(stick.x, -1, 1) : 0;
    const stickY = Number.isFinite(stick.y) ? THREE.MathUtils.clamp(stick.y, -1, 1) : 0;
    const steer = keys.has('ArrowLeft') || keys.has('ArrowRight')
      ? Number(keys.has('ArrowLeft')) - Number(keys.has('ArrowRight')) : -stickX;
    const pitch = keys.has('ArrowUp') || keys.has('ArrowDown')
      ? Number(keys.has('ArrowUp')) - Number(keys.has('ArrowDown')) : stickY;
    this.cruiseSpeed = THREE.MathUtils.clamp(this.cruiseSpeed + (Number(keys.has('KeyR')) - Number(keys.has('KeyF'))) * c.throttleRate * dt, c.minSpeed, c.maxSpeed);
    if (this.boostLocked && this.boost >= b.restartThreshold) this.boostLocked = false;
    this.boosting = !breaking && (keys.has('ShiftLeft') || keys.has('ShiftRight')) && this.boost > 0 && !this.boostLocked;
    if (this.boosting) {
      this.boost = Math.max(0, this.boost - dt); this.rechargeDelay = b.rechargeDelay;
      if (this.boost === 0) this.boostLocked = true;
    } else { this.rechargeDelay = Math.max(0, this.rechargeDelay - dt); if (!this.rechargeDelay) this.boost = Math.min(b.capacity, this.boost + b.rechargeRate * dt); }
    const desiredSpeed = breaking ? Math.max(c.minSpeed, this.cruiseSpeed * turn.speedFactor) : this.boosting ? b.speed : this.cruiseSpeed;
    this.speed += THREE.MathUtils.clamp(desiredSpeed - this.speed, -(breaking ? turn.deceleration : c.acceleration) * dt, c.acceleration * dt);
    const yawTarget = breaking ? -this.breakDirection * c.turnRate * turn.turnMultiplier : steer * c.turnRate * (this.boosting ? .75 : 1);
    const yawResponse = breaking ? turn.steeringResponse : c.steeringResponse;
    this.yawRate = damp(this.yawRate, yawTarget, yawResponse, dt);
    this.pitchRate = damp(this.pitchRate, pitch * c.pitchRate, c.steeringResponse, dt);
    tempQ.setFromEuler(tempE.set(this.pitchRate * dt, this.yawRate * dt, 0)); this.orientation.multiply(tempQ).normalize();
    this.forward.copy(forwardAxis).applyQuaternion(this.orientation); this.up.copy(upAxis).applyQuaternion(this.orientation);
    const desired = this.forward.clone().multiplyScalar(this.speed);
    this.cruiseVelocity.lerp(desired, 1 - Math.exp(-(breaking ? turn.momentumResponse : c.momentumResponse) * dt));
    this.velocity.copy(this.cruiseVelocity); this.position.addScaledVector(this.cruiseVelocity, dt);
    this.bank = damp(this.bank, breaking ? -this.breakDirection * turn.bankAngle : steer * c.bankAngle, c.bankResponse, dt);
    this.updateRoll(dt);
    this.updateBreak(dt);
  }
}
