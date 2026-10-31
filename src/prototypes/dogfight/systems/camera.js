import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { damp } from './flight.js';

// Lens perspective follows actual speed, including ordinary R acceleration.
// It never stretches scene geometry, and merely holding boost while stationary
// cannot fake a speed effect. The slight setback keeps the chase framing clear.
export function cameraSpeedProfile(speed) {
  const c = CONFIG.camera, cruise = CONFIG.flight.cruiseSpeed, fast = CONFIG.flight.maxSpeed;
  const actual = Number.isFinite(speed) ? speed : cruise;
  const normalWeight = THREE.MathUtils.clamp((actual - cruise) / (fast - cruise), 0, 1);
  const boostWeight = THREE.MathUtils.clamp((actual - fast) / (CONFIG.boost.speed - fast), 0, 1);
  return {
    fov: c.fov + (c.fastFov - c.fov) * normalWeight + (c.boostFov - c.fastFov) * boostWeight,
    setback: c.fastSetback * normalWeight + (c.boostSetback - c.fastSetback) * boostWeight,
  };
}
export class ChaseCamera {
  constructor(camera) {
    this.camera = camera; this.look = new THREE.Vector3(); this.targetUp = new THREE.Vector3(0, 1, 0);
    this.previousAnchor = new THREE.Vector3(); this.hasAnchor = false;
  }
  update(dt, flight, snap = false, zooming = false) {
    const c = CONFIG.camera, elapsed = Number.isFinite(dt) && dt > 0 ? dt : 0;
    const anchor = flight.position.clone();
    // Authored camera socket is expressed in the stable gameplay frame; never
    // inherit the render-only barrel roll or flap bob. Current socket is zero.
    if (flight.cameraAnchorOffset) anchor.add(flight.cameraAnchorOffset.clone().applyQuaternion(flight.orientation));
    if (flight.rollOffset && ['x', 'y', 'z'].every(axis => Number.isFinite(flight.rollOffset[axis]))) anchor.sub(flight.rollOffset);
    // Carry the camera's reference frame with the dragon before damping the
    // relative chase pose. World-position damping would add speed/response to
    // the trailing distance, making the dragon shrink as it accelerated.
    // Follow the roll's travel axis, not the body's corkscrew offset, so a roll
    // remains visible without shaking the cockpit or spinning the horizon.
    if (!snap && elapsed > 0 && this.hasAnchor) {
      const translation = anchor.clone().sub(this.previousAnchor);
      this.camera.position.add(translation); this.look.add(translation);
    }
    if (snap || elapsed > 0 || !this.hasAnchor) {
      this.previousAnchor.copy(anchor); this.hasAnchor = true;
    }
    const alpha = snap ? 1 : 1 - Math.exp(-c.followResponse * elapsed);
    const speed = cameraSpeedProfile(flight.speed);
    const offset = new THREE.Vector3(0, c.height, c.distance + speed.setback).applyQuaternion(flight.orientation);
    this.camera.position.lerp(anchor.clone().add(offset), alpha);
    const look = new THREE.Vector3(0, c.lookHeight, -c.lookAhead).applyQuaternion(flight.orientation).add(anchor);
    this.look.lerp(look, snap ? 1 : 1 - Math.exp(-c.aimResponse * elapsed));
    this.targetUp.lerp(flight.up, alpha).normalize(); this.camera.up.copy(this.targetUp); this.camera.lookAt(this.look);
    const targetFov = zooming ? c.zoomFov : speed.fov;
    const currentFov = Number.isFinite(this.camera.fov) ? THREE.MathUtils.clamp(this.camera.fov, c.zoomFov, c.boostFov) : c.fov;
    this.camera.fov = snap ? targetFov : damp(currentFov, targetFov, c.zoomResponse, elapsed);
    this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
  }
}
