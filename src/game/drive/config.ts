/** Reversible P0 handling values. Units are metres, seconds and radians. */
export interface DriveConfig {
  topSpeed: number; acceleration: number; braking: number; reverseSpeed: number;
  steeringRate: number; highSpeedSteering: number; grip: number; handbrakeGrip: number;
  offroadMultiplier: number; assistTopSpeed: number; assistStrength: number;
  corridorMargin: number; stuckResetSeconds: number;
}
export const DRIVE_STEP = 1 / 60;
export const DEFAULT_DRIVE_CONFIG: Readonly<DriveConfig> = Object.freeze({
  topSpeed: 25, acceleration: 25 / 6, braking: 10, reverseSpeed: 6,
  steeringRate: 1.75, highSpeedSteering: 0.3, grip: 8, handbrakeGrip: 1.5,
  offroadMultiplier: 0.4, assistTopSpeed: 15, assistStrength: 1.8,
  corridorMargin: 18, stuckResetSeconds: 2,
});

export function validDriveConfig(config: DriveConfig): boolean {
  return Object.values(config).every(value => Number.isFinite(value) && value > 0) &&
    config.topSpeed <= 40 && config.assistTopSpeed <= config.topSpeed && config.reverseSpeed <= 10 &&
    config.highSpeedSteering <= 1 && config.offroadMultiplier <= 1 && config.corridorMargin <= 40;
}
