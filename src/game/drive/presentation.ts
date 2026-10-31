import { DRIVE_STEP } from './config.ts';
import { MINIVAN_DRIVER_EYE } from './minivan-config.ts';

/** A visual sample only. Never pass this pose back into driving or save logic. */
export interface DrivePresentationPose { x: number; z: number; yaw: number; speed: number }
export interface DrivePoseSample extends DrivePresentationPose { elapsedSeconds: number }
export interface DrivePresentationOptions { paused?: boolean; snap?: boolean }
export interface DriveCameraPoint { x: number; y: number; z: number }

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const angleDelta = (to: number, from: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const copyPose = (pose: Readonly<DrivePresentationPose>): DrivePresentationPose =>
  ({ x: pose.x, z: pose.z, yaw: pose.yaw, speed: pose.speed });

/** Interpolate the two most recent fixed ticks, with one tick of visual latency.
 * Callers reset their previous sample on deliberate reset, resume or inspection.
 * Discontinuity checks also catch automatic recovery without sliding across town.
 */
export function interpolateDrivePose(previous: Readonly<DrivePoseSample>, current: Readonly<DrivePoseSample>,
  alpha: number, options: Readonly<DrivePresentationOptions> = {}): DrivePresentationPose {
  const elapsed = current.elapsedSeconds - previous.elapsedSeconds;
  const travel = Math.hypot(current.x - previous.x, current.z - previous.z);
  const maximumTravel = Math.max(2, Math.max(Math.abs(previous.speed), Math.abs(current.speed)) * DRIVE_STEP * 2 + .5);
  const angle = angleDelta(current.yaw, previous.yaw);
  if (options.paused || options.snap || elapsed <= 0 || elapsed > DRIVE_STEP * 1.5 ||
    travel > maximumTravel || Math.abs(angle) > .5) return copyPose(current);
  const amount = Number.isFinite(alpha) ? clamp(alpha, 0, 1) : 1;
  return {
    x: previous.x + (current.x - previous.x) * amount,
    z: previous.z + (current.z - previous.z) * amount,
    yaw: previous.yaw + angle * amount,
    speed: previous.speed + (current.speed - previous.speed) * amount,
  };
}

/** Damping acts on visual steering only, never on semantic input or car handling. */
export function smoothDriveSteering(previous: number, desired: number, dt: number, paused = false): number {
  if (paused) return previous;
  const elapsed = Number.isFinite(dt) ? clamp(dt, 0, .1) : 0;
  const target = Number.isFinite(desired) ? clamp(desired, -1, 1) : 0;
  return previous + (target - previous) * (1 - Math.exp(-elapsed * 14));
}

/** Camera and body use the identical displayed pose. Only local framing/look may
 * ease; independently damping world position makes the car swim at uneven FPS.
 */
export function driveCameraFrame(pose: Readonly<DrivePresentationPose>, mode: 'chase' | 'dashboard',
  lookYaw = 0, lookPitch = 0, chaseDistance = 8.2): { position: DriveCameraPoint; target: DriveCameraPoint } {
  const forwardX = Math.sin(pose.yaw); const forwardZ = Math.cos(pose.yaw);
  const dashboard = mode === 'dashboard';
  const position = dashboard ? {
    x: pose.x + Math.cos(pose.yaw) * MINIVAN_DRIVER_EYE.x + forwardX * MINIVAN_DRIVER_EYE.z,
    y: MINIVAN_DRIVER_EYE.y,
    z: pose.z - Math.sin(pose.yaw) * MINIVAN_DRIVER_EYE.x + forwardZ * MINIVAN_DRIVER_EYE.z,
  } : { x: pose.x - forwardX * chaseDistance, y: 3.55, z: pose.z - forwardZ * chaseDistance };
  const heading = pose.yaw + lookYaw;
  const reach = dashboard ? 20 : chaseDistance + 8;
  return { position, target: {
    x: position.x + Math.sin(heading) * reach,
    y: dashboard ? position.y + Math.tan(lookPitch - .035) * 20 : 1.05 + lookPitch * 5,
    z: position.z + Math.cos(heading) * reach,
  } };
}
