import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3 } from '@babylonjs/core/Maths/math';
import type { Scene } from '@babylonjs/core/scene';

export type DriveCameraMode = 'chase' | 'dashboard' | 'orbit';
export interface DriveCameraPose { x: number; z: number; yaw: number; speed: number }

export function createDriveCamera(scene: Scene, canvas: HTMLCanvasElement, reducedMotion = false) {
  const follow = new FreeCamera('drive.camera.follow', new Vector3(10, 5, 0), scene);
  follow.inputs.clear();
  follow.minZ = 0.08;
  follow.maxZ = 620;
  const orbit = new ArcRotateCamera('drive.camera.orbit', -Math.PI / 2, 0.65, 25, new Vector3(), scene);
  orbit.lowerRadiusLimit = 5;
  orbit.upperRadiusLimit = 120;
  orbit.lowerBetaLimit = 0.15;
  orbit.upperBetaLimit = 1.48;
  orbit.minZ = 0.15;
  orbit.maxZ = 620;
  orbit.panningSensibility = 0;
  orbit.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');
  let mode: DriveCameraMode = 'chase';
  let initialized = false;
  const target = new Vector3();
  scene.activeCamera = follow;
  function setMode(next: DriveCameraMode) {
    mode = next;
    initialized = false;
    orbit.detachControl();
    if (mode === 'orbit') { scene.activeCamera = orbit; orbit.attachControl(canvas, true); }
    else scene.activeCamera = follow;
  }
  function update(pose: DriveCameraPose, dt: number, snap = false) {
    const forwardX = Math.sin(pose.yaw);
    const forwardZ = Math.cos(pose.yaw);
    const speed = Math.min(1, Math.abs(pose.speed) / 25);
    if (mode === 'orbit') { orbit.target.set(pose.x, 0.6, pose.z); return; }
    const dashboard = mode === 'dashboard';
    const distance = dashboard ? -0.35 : 7.5 + (reducedMotion ? 0 : speed * 1.4);
    const height = dashboard ? 1.37 : 3.55;
    const desired = new Vector3(pose.x - forwardX * distance, height, pose.z - forwardZ * distance);
    const look = new Vector3(pose.x + forwardX * (dashboard ? 20 : 8), dashboard ? 1.34 : 1.05, pose.z + forwardZ * (dashboard ? 20 : 8));
    const weight = dashboard || snap || !initialized ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) * 7);
    Vector3.LerpToRef(follow.position, desired, weight, follow.position);
    Vector3.LerpToRef(target, look, weight, target);
    follow.fov = dashboard ? 1.05 : 0.88 + (reducedMotion ? 0 : speed * 0.08);
    follow.setTarget(target);
    initialized = true;
  }
  return {
    get mode() { return mode; },
    get camera() { return mode === 'orbit' ? orbit : follow; },
    setReducedMotion(value: boolean) { reducedMotion = value; },
    setMode,
    cycle() { setMode(mode === 'chase' ? 'dashboard' : mode === 'dashboard' ? 'orbit' : 'chase'); return mode; },
    update,
    snap(pose: DriveCameraPose) { update(pose, 0, true); },
    dispose() { orbit.detachControl(); orbit.dispose(); follow.dispose(); },
  };
}
