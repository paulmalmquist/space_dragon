import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math';
import type { Scene } from '@babylonjs/core/scene';
import { clipCameraPosition, WORLD_COLLIDERS } from './navigation';
import type { PlayerPosition } from './navigation';

/** A damped boom camera. Mouse and keyboard rotate the same camera-relative movement frame. */
export function createThirdPersonCamera(scene: Scene) {
  // Collision matches the visible dollhouse walls. The walking boundary is still full-height.
  const cameraColliders = WORLD_COLLIDERS.map(box => box.id.startsWith('house-') ? { ...box, maxY: 0.65 } : box);
  for (const z of [-1, 1]) cameraColliders.push({ id: `door-post.${z}`, minX: -0.61, maxX: -0.39, minZ: z - 0.075, maxZ: z + 0.075, minY: 0, maxY: 2.6 });
  cameraColliders.push({ id: 'door-header', minX: -0.625, maxX: -0.375, minZ: -1.075, maxZ: 1.075, minY: 2.56, maxY: 2.74 });
  const camera = new FreeCamera('navigation.follow-camera', new Vector3(0, 2.4, -4), scene);
  camera.inputs.clear();
  camera.minZ = 0.045;
  camera.fov = 1.03;
  let yaw = 0;
  let pitch = 0.39;
  const focus = new Vector3();
  let initialized = false;
  let clipped = false;
  return {
    camera,
    get yaw() { return yaw; },
    rotate(deltaYaw: number, deltaPitch = 0) {
      yaw = Math.atan2(Math.sin(yaw + deltaYaw), Math.cos(yaw + deltaYaw));
      pitch = Math.max(0.18, Math.min(0.95, pitch + deltaPitch));
    },
    recenter(player: PlayerPosition) { yaw = player.yaw; pitch = 0.39; initialized = false; },
    update(player: PlayerPosition, delta: number, snap = false) {
      const target = new Vector3(player.x, 1.25, player.z);
      const easing = 1 - Math.exp(-Math.max(0, delta) * 12);
      if (!initialized || snap) focus.copyFrom(target);
      else Vector3.LerpToRef(focus, target, easing, focus);
      const distance = 3.8;
      const horizontal = Math.cos(pitch) * distance;
      const desired = new Vector3(focus.x - Math.sin(yaw) * horizontal, focus.y + Math.sin(pitch) * distance, focus.z - Math.cos(yaw) * horizontal);
      const safe = clipCameraPosition(focus, desired, cameraColliders);
      clipped = Vector3.DistanceSquared(desired, new Vector3(safe.x, safe.y, safe.z)) > 0.001;
      // Clip each frame after smoothing so interpolation cannot carry the camera through a wall.
      const candidate = initialized && !snap ? Vector3.Lerp(camera.position, new Vector3(safe.x, safe.y, safe.z), easing) : new Vector3(safe.x, safe.y, safe.z);
      const final = clipCameraPosition(focus, candidate, cameraColliders);
      camera.position.set(final.x, final.y, final.z);
      camera.setTarget(focus);
      initialized = true;
    },
    snapshot: () => ({ yaw, pitch, clipped, position: { x: camera.position.x, y: camera.position.y, z: camera.position.z }, focus: { x: focus.x, y: focus.y, z: focus.z } }),
  };
}
