import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math';
import type { Scene } from '@babylonjs/core/scene';
import { HOME_BLOCK } from './traversal/home-block';
import { HERO_EVENT } from './traversal/hero';
import type { HeroState } from './traversal/hero';
import { clipBoom } from './traversal/world';
import type { TraversalWorld } from './traversal/world';

export interface CameraSubject {
  hero: HeroState;
  /** Interpolated feet position. */
  x: number; y: number; z: number;
  events: number;
  /** The player's house is drawn cut open; the boom may rise over its low walls. */
  cutaway: boolean;
}

const BASE_FOV = 1.03;
/** Framing for a lab that needs to see more of the floor around the hero. */
export interface CameraFraming { distance?: number; pitch?: number; }
/**
 * Above an ordinary run (4.6 m/s) and an ordinary jump (5.2 m/s): only sprints, hops, bounces
 * and swings turn the camera. Otherwise a jump while strafing would rotate the view, and with
 * it the meaning of "right", curving the hero.
 */
const FOLLOW_SPEED = 5.6;

/**
 * A damped chase camera. Mouse and keyboard turn it; while the hero runs on suit power,
 * flies or swings it eases behind the direction of travel, widens with speed and never
 * passes through the level. It observes the hero and owns no gameplay state.
 */
export function createThirdPersonCamera(scene: Scene, world: TraversalWorld = HOME_BLOCK, framing: CameraFraming = {}) {
  const BASE_DISTANCE = framing.distance ?? 3.8;
  const BASE_PITCH = framing.pitch ?? 0.39;
  const camera = new FreeCamera('navigation.follow-camera', new Vector3(0, 2.4, -4), scene);
  camera.inputs.clear();
  camera.minZ = 0.08;
  camera.maxZ = 900;
  camera.fov = BASE_FOV;
  let yaw = 0;
  let pitch = BASE_PITCH;
  let distance = BASE_DISTANCE;
  let boom = BASE_DISTANCE;
  let manual = 0;
  let dip = 0;
  let clipped = false;
  let initialized = false;
  const focus = new Vector3();
  const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
  return {
    camera,
    get yaw() { return yaw; },
    rotate(deltaYaw: number, deltaPitch = 0) {
      yaw = wrap(yaw + deltaYaw);
      pitch = Math.max(0.12, Math.min(1.05, pitch + deltaPitch));
      manual = 1.6;
    },
    recenter(player: { yaw: number }) { yaw = player.yaw; pitch = BASE_PITCH; manual = 0; initialized = false; },
    update(subject: CameraSubject, delta: number, reducedMotion: boolean, snap = false) {
      const { hero } = subject;
      const dt = Math.max(0, delta);
      const flat = Math.hypot(hero.vx, hero.vz);
      const speed = Math.hypot(flat, hero.vy);
      const fast = Math.max(0, Math.min(1, (flat - 5) / 9));
      manual = Math.max(0, manual - dt);
      // Ease behind the direction of travel only for deliberate fast movement, so a walk
      // with plain keys keeps a steady frame and camera-relative keys stay predictable.
      const driven = hero.mode !== 'ground' || hero.powerHeld;
      if (driven && manual <= 0 && flat > FOLLOW_SPEED && !snap) {
        const follow = (1.1 + fast * 1.5) * (hero.mode === 'swing' ? 1.25 : 1);
        yaw = wrap(yaw + wrap(Math.atan2(hero.vx, hero.vz) - yaw) * (1 - Math.exp(-follow * dt)));
      }
      if (subject.events & HERO_EVENT.land) dip = Math.min(0.5, hero.impact * 0.02);
      dip = Math.max(0, dip - dt * 1.9);
      const lead = reducedMotion ? 0 : Math.min(1.5, flat * 0.1);
      const target = new Vector3(
        subject.x + (flat > 0.01 ? hero.vx / flat * lead : 0),
        subject.y + 1.4 - (reducedMotion ? 0 : dip),
        subject.z + (flat > 0.01 ? hero.vz / flat * lead : 0));
      if (!initialized || snap) focus.copyFrom(target);
      else {
        const side = 1 - Math.exp(-12 * dt);
        const rise = 1 - Math.exp(-(hero.mode === 'ground' ? 14 : 8) * dt);
        focus.x += (target.x - focus.x) * side;
        focus.z += (target.z - focus.z) * side;
        focus.y += (target.y - focus.y) * rise;
      }
      const wantDistance = BASE_DISTANCE + fast * 1.6 + (hero.mode === 'swing' ? 0.9 : 0);
      distance = !initialized || snap ? wantDistance : distance + (wantDistance - distance) * (1 - Math.exp(-3 * dt));
      // Look slightly up the arc while rising and down while falling fast.
      const tilt = reducedMotion ? 0 : Math.max(-0.14, Math.min(0.2, -hero.vy * 0.008));
      const angle = Math.max(0.1, Math.min(1.1, pitch + tilt));
      const horizontal = Math.cos(angle) * distance;
      const desired = { x: focus.x - Math.sin(yaw) * horizontal, y: focus.y + Math.sin(angle) * distance, z: focus.z - Math.cos(yaw) * horizontal };
      const clear = clipBoom(world, focus, desired, subject.cutaway);
      clipped = clear < 0.999;
      const allowed = Math.max(0.35, distance * clear);
      // Pull in at once, ease back out, so the camera never rests inside a wall.
      boom = !initialized || snap || allowed < boom ? allowed : boom + (allowed - boom) * (1 - Math.exp(-5 * dt));
      const scale = boom / distance;
      camera.position.set(focus.x + (desired.x - focus.x) * scale, focus.y + (desired.y - focus.y) * scale, focus.z + (desired.z - focus.z) * scale);
      camera.setTarget(focus);
      const wantFov = reducedMotion ? BASE_FOV : BASE_FOV + Math.min(0.24, Math.max(0, speed - 5.5) * 0.022);
      camera.fov = !initialized || snap ? wantFov : camera.fov + (wantFov - camera.fov) * (1 - Math.exp(-4 * dt));
      initialized = true;
    },
    snapshot: () => ({ yaw, pitch, clipped, distance: boom, fov: camera.fov, position: { x: camera.position.x, y: camera.position.y, z: camera.position.z }, focus: { x: focus.x, y: focus.y, z: focus.z } }),
  };
}
