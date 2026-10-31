import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3 } from '@babylonjs/core/Maths/math';
import type { Scene } from '@babylonjs/core/scene';
import { driveCameraFrame } from './presentation';

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
  let framedSpeed = 0;
  const target = new Vector3();
  let lookInput = 0;
  let lookYaw = 0;
  let lookPitch = 0;
  let dragYaw = 0;
  let dragPitch = 0;
  let dragPointer: number | null = null;
  let pointerX = 0;
  let pointerY = 0;
  const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
  const stopLooking = () => {
    if (dragPointer !== null && canvas.hasPointerCapture(dragPointer)) canvas.releasePointerCapture(dragPointer);
    dragPointer = null; dragYaw = 0; dragPitch = 0; lookInput = 0;
  };
  const pointerDown = (event: PointerEvent) => {
    if (mode === 'orbit' || event.button !== 0) return;
    dragPointer = event.pointerId; pointerX = event.clientX; pointerY = event.clientY;
    canvas.setPointerCapture(event.pointerId); canvas.focus();
  };
  const pointerMove = (event: PointerEvent) => {
    if (event.pointerId !== dragPointer) return;
    dragYaw = clamp(dragYaw + (event.clientX - pointerX) * .006, -1.72, 1.72);
    dragPitch = clamp(dragPitch - (event.clientY - pointerY) * .004, -.55, .35);
    pointerX = event.clientX; pointerY = event.clientY;
  };
  const pointerUp = (event: PointerEvent) => { if (event.pointerId === dragPointer) stopLooking(); };
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);
  window.addEventListener('blur', stopLooking);
  scene.activeCamera = follow;
  function setMode(next: DriveCameraMode) {
    mode = next;
    initialized = false;
    stopLooking(); lookYaw = 0; lookPitch = 0;
    orbit.detachControl();
    if (mode === 'orbit') { scene.activeCamera = orbit; orbit.attachControl(canvas, true); }
    else scene.activeCamera = follow;
  }
  function update(pose: DriveCameraPose, dt: number, snap = false) {
    const elapsed = Number.isFinite(dt) ? clamp(dt, 0, .1) : 0;
    const speed = Math.min(1, Math.abs(pose.speed) / 25);
    if (mode === 'orbit') { orbit.target.set(pose.x, 0.6, pose.z); return; }
    const dashboard = mode === 'dashboard';
    const lookWeight = snap ? 1 : 1 - Math.exp(-elapsed * 14);
    lookYaw += (clamp(lookInput * 1.48 + dragYaw, -1.72, 1.72) - lookYaw) * lookWeight;
    lookPitch += (dragPitch - lookPitch) * lookWeight;
    framedSpeed += (speed - framedSpeed) * (snap || !initialized ? 1 : 1 - Math.exp(-elapsed * 7));
    const distance = 8.2 + (reducedMotion ? 0 : framedSpeed * 1.4);
    const frame = driveCameraFrame(pose, dashboard ? 'dashboard' : 'chase', lookYaw, lookPitch, distance);
    // The same interpolated pose anchors both the car and camera. Damping local
    // distance/FOV above keeps acceleration gentle without a second position lag.
    follow.position.set(frame.position.x, frame.position.y, frame.position.z);
    target.set(frame.target.x, frame.target.y, frame.target.z);
    follow.fov = dashboard ? 1.12 : 0.88 + (reducedMotion ? 0 : framedSpeed * 0.08);
    follow.setTarget(target);
    initialized = true;
  }
  return {
    get mode() { return mode; },
    get camera() { return mode === 'orbit' ? orbit : follow; },
    get look() { return { yaw: lookYaw, pitch: lookPitch }; },
    setLookInput(value: number) { lookInput = clamp(value, -1, 1); },
    releaseLook: stopLooking,
    setReducedMotion(value: boolean) { reducedMotion = value; },
    setMode,
    cycle() { setMode(mode === 'chase' ? 'dashboard' : mode === 'dashboard' ? 'orbit' : 'chase'); return mode; },
    update,
    snap(pose: DriveCameraPose) { update(pose, 0, true); },
    dispose() {
      stopLooking(); canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', pointerUp);
      window.removeEventListener('blur', stopLooking); orbit.detachControl(); orbit.dispose(); follow.dispose();
    },
  };
}
