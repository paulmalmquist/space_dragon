using System;
using UnityEngine;

namespace SpaceDragon.Dogfight
{
    /// <summary>
    /// Presentation-only camera response to impacts: a short shake and a small lens punch.
    /// It holds no rule. It cannot move the ship, change aim, damage, reward or time. The
    /// encounter adds these offsets to the rendered camera after the chase camera has settled
    /// and removes them before the next simulation step reads the camera.
    /// Offsets come from an internal clock, never from Random, so a run can be repeated.
    /// Reduced motion and the EnableImpactCamera switch both give exactly zero.
    /// </summary>
    public sealed class CameraImpactState
    {
        const float LongestStep = .1f, RestingLens = .01f;
        readonly DogfightTuning tuning;
        float clock, lens, floor;

        /// <summary>0 at rest, 1 at the strongest impact. Shake strength is its square.</summary>
        public float Trauma { get; private set; }
        /// <summary>Camera-local metres: x right, y up. Depth is never shaken.</summary>
        public Vector3 PositionOffset { get; private set; }
        /// <summary>Degrees: x pitch, y yaw, z roll.</summary>
        public Vector3 EulerOffset { get; private set; }
        /// <summary>Degrees added to the chase lens. Positive widens.</summary>
        public float FieldOfViewOffset => lens;
        /// <summary>Counts accepted impacts and punches, for tests and the QA snapshot.</summary>
        public int Serial { get; private set; }
        public bool AtRest => Trauma <= 0 && lens == 0 && floor <= 0;
        /// <summary>False means every offset is exactly zero and the chase camera can be used as it is.</summary>
        public bool HasOffset => PositionOffset.x != 0 || PositionOffset.y != 0 ||
            EulerOffset.x != 0 || EulerOffset.y != 0 || EulerOffset.z != 0 || lens != 0;
        bool Enabled => tuning.EnableImpactCamera;

        public CameraImpactState(DogfightTuning tuning)
        {
            this.tuning = tuning ?? throw new ArgumentNullException(nameof(tuning));
            if (!NonNegative(tuning.ImpactCameraDecayPerSecond) || !NonNegative(tuning.ImpactCameraMaxMetres) ||
                !NonNegative(tuning.ImpactCameraMaxDegrees) || !NonNegative(tuning.ImpactCameraMaxRollDegrees) ||
                !NonNegative(tuning.ImpactCameraFrequency) || !NonNegative(tuning.ImpactCameraLensPunchMax) ||
                !NonNegative(tuning.ImpactCameraLensRecovery))
                throw new ArgumentException("Impact camera tuning requires finite, nonnegative values.", nameof(tuning));
        }

        /// <summary>Adds to the shake. Amounts stack up to 1. Ignored when switched off.</summary>
        public void AddTrauma(float amount)
        {
            if (!Enabled || !Finite(amount) || amount <= 0) return;
            Trauma = Mathf.Min(1, Trauma + amount);
            Serial++;
        }

        /// <summary>Keeps the shake at least this strong for the next step: a held rumble.</summary>
        public void Hold(float minimum)
        {
            if (!Enabled || !Finite(minimum) || minimum <= 0) return;
            floor = Mathf.Max(floor, Mathf.Min(1, minimum));
        }

        /// <summary>Nudges the lens by this many degrees. It then recovers on its own.</summary>
        public void Punch(float degrees)
        {
            if (!Enabled || !Finite(degrees) || degrees == 0) return;
            float limit = tuning.ImpactCameraLensPunchMax;
            lens = Mathf.Clamp(lens + degrees, -limit, limit);
            Serial++;
        }

        /// <summary>
        /// Advances by the encounter's own step. A zero step holds the current pose, so a
        /// freeze-frame stays frozen. Reduced motion clears everything, even on a zero step.
        /// </summary>
        public void Tick(float dt, bool reducedMotion)
        {
            if (!Finite(dt) || dt < 0) return;
            if (!Enabled || reducedMotion) { Clear(); return; }
            if (dt == 0) return;
            dt = Mathf.Min(dt, LongestStep);
            if (floor > Trauma) Trauma = floor;
            floor = 0;
            clock += dt;
            float shake = Trauma * Trauma, phase = clock * tuning.ImpactCameraFrequency;
            PositionOffset = new Vector3(Wave(phase, 1f, 2.31f, 0f), Wave(phase, 1.27f, 1.93f, 1.9f), 0) *
                (tuning.ImpactCameraMaxMetres * shake);
            EulerOffset = new Vector3(
                Wave(phase, .91f, 2.67f, 4.1f) * tuning.ImpactCameraMaxDegrees,
                Wave(phase, 1.13f, 2.09f, 2.6f) * tuning.ImpactCameraMaxDegrees,
                Wave(phase, .83f, 1.71f, 5.3f) * tuning.ImpactCameraMaxRollDegrees) * shake;
            Trauma = Mathf.Max(0, Trauma - tuning.ImpactCameraDecayPerSecond * dt);
            lens *= Mathf.Exp(-tuning.ImpactCameraLensRecovery * dt);
            if (Mathf.Abs(lens) < RestingLens) lens = 0;
        }

        /// <summary>Pause, Restart and reduced motion: back to rest at once.</summary>
        public void Clear()
        {
            Trauma = 0; lens = 0; floor = 0; clock = 0;
            PositionOffset = Vector3.zero; EulerOffset = Vector3.zero;
        }

        /// <summary>Restart: back to rest and forget the count as well.</summary>
        public void Reset() { Clear(); Serial = 0; }

        /// <summary>1 at or inside <paramref name="near"/>, 0 at or beyond <paramref name="far"/>, smooth between.</summary>
        public static float DistanceFalloff(float distance, float near, float far)
        {
            if (!Finite(distance) || !Finite(near) || !Finite(far) || distance < 0) return 0;
            if (far <= near) return distance <= near ? 1 : 0;
            float t = Mathf.Clamp01((far - distance) / (far - near));
            return t * t * (3 - 2 * t);
        }

        // Two unrelated sine rates per axis, so the motion never visibly repeats within one shake.
        static float Wave(float phase, float first, float second, float offset) =>
            .62f * Mathf.Sin(phase * first + offset) + .38f * Mathf.Sin(phase * second + offset * 1.7f);
        static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
        static bool NonNegative(float value) => Finite(value) && value >= 0;
    }
}
