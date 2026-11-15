/**
 * Engine-free motion rules for the realistic hero stand-in: which locomotion loops play at a
 * given ground speed, how fast the stride advances, and the procedural poses layered on top
 * while jumping, falling, swinging and landing. Babylon and Unity both read these numbers;
 * tools/unity/export-traversal.mjs writes the C# copy.
 *
 * Presentation only. Nothing here reads or writes game state.
 */
export interface LocomotionClip {
  id: 'idle' | 'walk' | 'run' | 'sprint';
  /** Ground speed in metres per second at which the in-place loop does not slide. */
  speed: number;
  /** Loop length in seconds. */
  duration: number;
}

/** Mirrors PROVENANCE.json beside playground-kid.gltf; a unit test guards the copy. */
export const LOCOMOTION: readonly LocomotionClip[] = Object.freeze([
  Object.freeze({ id: 'idle', speed: 0, duration: 11.6667 }),
  Object.freeze({ id: 'walk', speed: 0.799, duration: 1.2 }),
  Object.freeze({ id: 'run', speed: 2.275, duration: 0.7333 }),
  Object.freeze({ id: 'sprint', speed: 4.613, duration: 0.6 }),
] as const);

export const MOTION = Object.freeze({
  /** Legs never cycle faster than this multiple of the authored loop; faster travel glides slightly. */
  maxStrideRate: 1.45,
  minStrideRate: 0.55,
  /** How quickly loop weights follow the speed, per second. */
  blendRate: 9,
  airBlendRate: 12,
  swingBlendRate: 10,
  /** Landing crouch: peak knee bend in degrees and how fast it recovers (per second). */
  landBend: 40,
  landRecover: 3.6,
  /** Thigh plus calf length of the stand-in, metres; sets how far the hips drop in a crouch. */
  legLength: 0.6286,
  blinkSeconds: 0.14,
  blinkEvery: [2.4, 5.6] as readonly [number, number],
});

/**
 * Weights for [idle, walk, run, sprint] at a planar ground speed. Adjacent loops cross-fade
 * linearly between their natural speeds; above the sprint speed only the sprint loop plays.
 */
export function locomotionWeights(speed: number): [number, number, number, number] {
  const weights: [number, number, number, number] = [0, 0, 0, 0];
  const value = Number.isFinite(speed) ? Math.max(0, speed) : 0;
  const last = LOCOMOTION.length - 1;
  if (value >= LOCOMOTION[last].speed) { weights[last] = 1; return weights; }
  for (let index = 0; index < last; index++) {
    const low = LOCOMOTION[index].speed, high = LOCOMOTION[index + 1].speed;
    if (value >= low && value < high) {
      const blend = (value - low) / (high - low);
      weights[index] = 1 - blend;
      weights[index + 1] = blend;
      break;
    }
  }
  return weights;
}

/**
 * Stride cycles per second for the blended locomotion loops (idle excluded). The playback
 * rate follows the real ground speed inside a comfortable band so feet neither skate nor blur.
 */
export function strideCyclesPerSecond(weights: readonly number[], speed: number): number {
  let total = 0, natural = 0, duration = 0;
  for (let index = 1; index < LOCOMOTION.length; index++) {
    total += weights[index];
    natural += weights[index] * LOCOMOTION[index].speed;
    duration += weights[index] * LOCOMOTION[index].duration;
  }
  if (total <= 1e-6) return 0;
  natural /= total; duration /= total;
  const rate = Math.min(MOTION.maxStrideRate, Math.max(MOTION.minStrideRate, Math.max(0, speed) / natural));
  return rate / duration;
}

/** Character-space axes: x is the hero's right, y is up, z is the way the hero faces. */
export type PoseAxis = 'x' | 'y' | 'z';
/**
 * One world-aligned rotation applied to a bone after the base loops. Angles are degrees and
 * follow v' = q v q*: about +x a hanging limb swings backward and an upright spine leans
 * forward; about +z a hanging limb swings toward the hero's right.
 */
export interface PoseTurn { bone: string; axis: PoseAxis; degrees: number; }
export interface Pose { id: 'rise' | 'fall' | 'swing' | 'land'; turns: readonly PoseTurn[]; }

const turn = (bone: string, axis: PoseAxis, degrees: number): PoseTurn => Object.freeze({ bone: `Bip01 ${bone}`, axis, degrees });

/** Parents are listed before their children so each turn sees its parent's final pose. */
export const POSES: readonly Pose[] = Object.freeze([
  Object.freeze({ id: 'rise', turns: Object.freeze([
    turn('Spine1', 'x', -5), turn('Head', 'x', -8),
    turn('R Thigh', 'x', -62), turn('R Calf', 'x', 82),
    turn('L Thigh', 'x', 8), turn('L Calf', 'x', 20),
    turn('L UpperArm', 'x', -84), turn('L UpperArm', 'z', -10), turn('L Forearm', 'x', -28),
    turn('R UpperArm', 'x', 24), turn('R UpperArm', 'z', 16), turn('R Forearm', 'x', -40),
  ]) }),
  Object.freeze({ id: 'fall', turns: Object.freeze([
    turn('Spine1', 'x', 7), turn('Head', 'x', 8),
    turn('R Thigh', 'x', -30), turn('R Thigh', 'z', 7), turn('R Calf', 'x', 44),
    turn('L Thigh', 'x', -16), turn('L Thigh', 'z', -9), turn('L Calf', 'x', 30),
    turn('R UpperArm', 'z', 64), turn('R UpperArm', 'x', -16), turn('R Forearm', 'x', -22),
    turn('L UpperArm', 'z', -64), turn('L UpperArm', 'x', -16), turn('L Forearm', 'x', -22),
  ]) }),
  // Arms are aimed at the tether anchor by the runtime; this pose only tucks the legs.
  Object.freeze({ id: 'swing', turns: Object.freeze([
    turn('Head', 'x', -12),
    turn('R Thigh', 'x', -50), turn('R Calf', 'x', 68),
    turn('L Thigh', 'x', -30), turn('L Calf', 'x', 54),
  ]) }),
  // Scaled by the landing envelope; the runtime lowers the hips by the matching amount.
  Object.freeze({ id: 'land', turns: Object.freeze([
    turn('Spine1', 'x', 18),
    turn('R Thigh', 'x', -1), turn('R Calf', 'x', 2), turn('R Foot', 'x', -1),
    turn('L Thigh', 'x', -1), turn('L Calf', 'x', 2), turn('L Foot', 'x', -1),
    turn('R UpperArm', 'z', 14), turn('R UpperArm', 'x', 10),
    turn('L UpperArm', 'z', -14), turn('L UpperArm', 'x', 10),
  ]) }),
] as const);

/** Leg turns in the land pose are unit multipliers of MOTION.landBend; the rest are degrees. */
export const LAND_LEG_BONES: readonly string[] = Object.freeze(['Thigh', 'Calf', 'Foot'].flatMap(part => [`Bip01 R ${part}`, `Bip01 L ${part}`]));

/** How far the hips drop for a landing envelope in [0, 1]; keeps the feet planted. */
export function crouchDrop(envelope: number): number {
  const bend = Math.max(0, Math.min(1, envelope)) * MOTION.landBend * Math.PI / 180;
  return MOTION.legLength * (1 - Math.cos(bend));
}

/** Bones that reach for the tether, parent first, with the joint that marks each bone's far end. */
export const TETHER_ARMS: readonly { bone: string; tip: string; weight: number }[] = Object.freeze([
  Object.freeze({ bone: 'Bip01 R UpperArm', tip: 'Bip01 R Forearm', weight: 1 }),
  Object.freeze({ bone: 'Bip01 R Forearm', tip: 'Bip01 R Hand', weight: 1 }),
  Object.freeze({ bone: 'Bip01 L UpperArm', tip: 'Bip01 L Forearm', weight: 0.92 }),
  Object.freeze({ bone: 'Bip01 L Forearm', tip: 'Bip01 L Hand', weight: 0.86 }),
]);
export const GRIP_BONE = 'Bip01 R Finger2';
export const HEAD_BONE = 'Bip01 Head';
