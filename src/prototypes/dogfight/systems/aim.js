import * as THREE from 'three';
import { CONFIG } from '../config.js';

// Match the visual jaw's local roll before applying the flight orientation.
export function mouthPosition(flight) {
  const offset = flight.muzzleOffset || new THREE.Vector3(0, .52, -3.12);
  return new THREE.Vector3().copy(offset)
    .applyAxisAngle(new THREE.Vector3(0, 0, 1), flight.bank + flight.rollAngle)
    .add(new THREE.Vector3(0, Number.isFinite(flight.visualLift) ? flight.visualLift : 0, 0))
    .applyQuaternion(flight.orientation).add(flight.position);
}

// Screen-relative aim is separate from flight. Release holds the chosen point;
// X returns to the screen center. Moving/rolling the dragon never changes x/y.
export class Aim {
  constructor() { this.direction = new THREE.Vector3(0, 0, -1); this.point = new THREE.Vector3(); this.reset(); }
  reset() { this.x = 0; this.y = 0; this.direction.set(0, 0, -1); this.point.set(0, 0, -CONFIG.aim.distance); }
  setPointer(clientX, clientY, width, height) {
    if (![clientX, clientY, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return;
    this.x = THREE.MathUtils.clamp(clientX / width * 2 - 1, -CONFIG.aim.horizontalLimit, CONFIG.aim.horizontalLimit);
    this.y = THREE.MathUtils.clamp(1 - clientY / height * 2, -CONFIG.aim.verticalLimit, CONFIG.aim.verticalLimit);
  }
  update(dt, keys, camera, flight) {
    let dx = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
    let dy = Number(keys.has('KeyW')) - Number(keys.has('KeyZ'));
    const length = Math.hypot(dx, dy);
    if (length > 1) { dx /= length; dy /= length; }
    this.x = THREE.MathUtils.clamp(this.x + dx * CONFIG.aim.speed * dt, -CONFIG.aim.horizontalLimit, CONFIG.aim.horizontalLimit);
    this.y = THREE.MathUtils.clamp(this.y + dy * CONFIG.aim.speed * dt, -CONFIG.aim.verticalLimit, CONFIG.aim.verticalLimit);
    if (keys.has('KeyX')) { this.x = 0; this.y = 0; }
    this.point.set(this.x, this.y, .5).unproject(camera).sub(camera.position).normalize()
      .multiplyScalar(CONFIG.aim.distance).add(camera.position);
    this.direction.copy(this.point).sub(mouthPosition(flight)).normalize();
  }
}
