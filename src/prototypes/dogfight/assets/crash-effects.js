import * as THREE from 'three';
import { Effects } from './effects.js';

const PLATES = 40, STRUTS = 16;
const randomDirection = () => new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();

// Cosmetic mechanical destruction only. It has no health, collision, save or
// completion callback and never changes the actual imported model or viewport.
export class CrashEffects {
  constructor(scene) {
    this.scene = scene; this.root = new THREE.Group(); this.root.name = 'mechanical_crash_debris'; scene.add(this.root);
    const plate = new THREE.Shape(); plate.moveTo(-.7, -.35); plate.lineTo(.45, -.4); plate.lineTo(.7, .1); plate.lineTo(.2, .45); plate.lineTo(-.55, .3); plate.closePath();
    this.plateGeometry = new THREE.ExtrudeGeometry(plate, { depth: .065, bevelEnabled: false, steps: 1 });
    this.strutGeometry = new THREE.CylinderGeometry(.045, .085, 1.5, 5, 1);
    this.plateMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: .72, roughness: .43, side: THREE.DoubleSide });
    this.strutMaterial = new THREE.MeshStandardMaterial({ color: 0x302728, metalness: .9, roughness: .6 });
    this.plates = new THREE.InstancedMesh(this.plateGeometry, this.plateMaterial, PLATES);
    this.struts = new THREE.InstancedMesh(this.strutGeometry, this.strutMaterial, STRUTS);
    for (const mesh of [this.plates, this.struts]) { mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; this.root.add(mesh); }
    this.effects = new Effects(scene); this.matrix = new THREE.Matrix4(); this.rotation = new THREE.Quaternion();
    this.origin = new THREE.Vector3(); this.orientation = new THREE.Quaternion(); this.velocity = new THREE.Vector3();
    this.items = []; this.disposed = false; this.clear();
  }
  start({ position, orientation, velocity, reducedMotion = false } = {}) {
    if (this.disposed || this.active) return false;
    this.clear(); this.active = true; this.reducedMotion = Boolean(reducedMotion);
    if (position) this.origin.copy(position); if (orientation) this.orientation.copy(orientation); if (velocity) this.velocity.copy(velocity);
    const counts = this.reducedMotion ? [6, 3] : [PLATES, STRUTS];
    const colors = [0xa81810, 0x8d0d0a, 0x5c0908, 0x250908, 0xb52b1a];
    for (let type = 0; type < counts.length; type++) for (let index = 0; index < counts[type]; index++) {
      const direction = randomDirection();
      const position = new THREE.Vector3((Math.random() - .5) * 4.8, (Math.random() - .5) * 1.3, (Math.random() - .5) * 5.8).applyQuaternion(this.orientation).add(this.origin);
      const speed = this.reducedMotion ? .7 : 6 + Math.random() * 17;
      const travel = direction.multiplyScalar(speed).addScaledVector(this.velocity, this.reducedMotion ? 0 : .055);
      this.items.push({ type, index, position, velocity: travel, rotation: new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3),
        spin: randomDirection().multiplyScalar(this.reducedMotion ? 0 : 2.5 + Math.random() * 6), scale: new THREE.Vector3(.5 + Math.random() * .9, .5 + Math.random() * .9, .5 + Math.random() * .9) });
      if (!type) this.plates.setColorAt(index, new THREE.Color(colors[index % colors.length]));
    }
    this.plates.count = counts[0]; this.struts.count = counts[1];
    if (this.plates.instanceColor) this.plates.instanceColor.needsUpdate = true;
    this.root.visible = true; this.bursts = 1; this.effects.burst(this.origin, 'amber', !this.reducedMotion);
    this.draw(0, 0); return true;
  }
  draw(dt, elapsed) {
    const fade = this.reducedMotion ? 1 : THREE.MathUtils.clamp((3 - elapsed) / .6, 0, 1);
    for (const item of this.items) {
      item.position.addScaledVector(item.velocity, dt); item.velocity.multiplyScalar(Math.exp(-.12 * dt));
      item.rotation.x += item.spin.x * dt; item.rotation.y += item.spin.y * dt; item.rotation.z += item.spin.z * dt;
      this.rotation.setFromEuler(item.rotation); this.matrix.compose(item.position, this.rotation, item.scale.clone().multiplyScalar(fade));
      (item.type ? this.struts : this.plates).setMatrixAt(item.index, this.matrix);
    }
    this.plates.instanceMatrix.needsUpdate = true; this.struts.instanceMatrix.needsUpdate = true;
  }
  update(dt, crashState) {
    if (this.disposed || !this.active || !(dt > 0) || !Number.isFinite(dt)) return;
    const state = typeof crashState?.snapshot === 'function' ? crashState.snapshot() : crashState;
    if (!state?.active) { this.clear(); return; }
    this.elapsed = state.elapsed;
    const position = this.origin.clone().add(new THREE.Vector3(...(state.pose?.offset || [0, 0, 0])));
    if (!this.reducedMotion) {
      if (!this.secondary && state.elapsed >= .55) { this.secondary = true; this.bursts++; this.effects.burst(position, 'amber', true); }
      if (!this.breakup && state.elapsed >= 1.75) { this.breakup = true; this.bursts++; this.effects.burst(position, 'amber', true); }
      this.trailClock += dt;
      if (this.trailClock >= .12) {
        this.trailClock %= .12;
        this.effects.puff(position, 'fire', .5, 1.3, 5, 1.5, 0xffd3a0);
        this.effects.puff(position, 'smoke', 1.5, 2, 9, 2, 0x393235);
      }
    }
    this.draw(dt, state.elapsed); this.effects.update(dt);
  }
  clear() {
    this.active = false; this.elapsed = 0; this.trailClock = 0; this.bursts = 0; this.secondary = false; this.breakup = false;
    this.items.length = 0; this.plates.count = 0; this.struts.count = 0; this.root.visible = false;
    this.origin.set(0, 0, 0); this.orientation.identity(); this.velocity.set(0, 0, 0); this.effects.clear();
  }
  snapshot() {
    return { active: this.active, elapsed: this.elapsed, armorPlates: this.plates.count, struts: this.struts.count,
      debris: this.items.length, particles: this.effects.items.length, bursts: this.bursts,
      reducedMotion: Boolean(this.reducedMotion), disposed: this.disposed };
  }
  dispose() {
    if (this.disposed) return;
    this.clear(); this.disposed = true; this.effects.dispose(); this.scene.remove(this.root);
    this.plates.dispose(); this.struts.dispose();
    this.plateGeometry.dispose(); this.strutGeometry.dispose(); this.plateMaterial.dispose(); this.strutMaterial.dispose();
  }
}
