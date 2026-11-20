using System;
using System.Collections.Generic;
using UnityEngine;

namespace SpaceDragon.Dogfight
{
    /// <summary>Automatic close-pass eligibility and exact-once finisher events.
    /// Does not move the dragon or grant health/resources. The adapter commits damage,
    /// full boost and evasion on a true result, through existing authoritative states.</summary>
    public sealed class ClawFinisherState
    {
        readonly DogfightTuning tuning;
        readonly HashSet<string> finished = new HashSet<string>(StringComparer.Ordinal);
        double freezeRemaining;
        public int Serial { get; private set; }
        public string LastTargetId { get; private set; }
        public float FreezeRemaining => (float)freezeRemaining;
        public bool IsFrozen => freezeRemaining > 0;

        public ClawFinisherState(DogfightTuning tuning)
        {
            this.tuning = tuning ?? throw new ArgumentNullException(nameof(tuning));
            if (!Finite(tuning.FinisherHealthFraction) || tuning.FinisherHealthFraction < 0 || tuning.FinisherHealthFraction > 1 ||
                !Finite(tuning.FinisherRange) || tuning.FinisherRange < 0 ||
                !Finite(tuning.FinisherConeDegrees) || tuning.FinisherConeDegrees < 0 || tuning.FinisherConeDegrees > 180 ||
                !Finite(tuning.FinisherFreezeSeconds) || tuning.FinisherFreezeSeconds < 0)
                throw new ArgumentException("Finisher tuning requires finite, nonnegative timing/range and valid fraction/cone.", nameof(tuning));
        }

        public bool TryFinish(string targetId, bool alive, bool shielded, float health, float maximumHealth,
            Vector3 playerPosition, Vector3 playerForward, Vector3 targetPosition, bool boosting, bool reducedMotion = false)
        {
            if (!tuning.EnableClawFinisher || !alive || shielded || !boosting || string.IsNullOrWhiteSpace(targetId) ||
                finished.Contains(targetId) || !Finite(health) || !Finite(maximumHealth) || maximumHealth <= 0 ||
                health <= 0 || health / maximumHealth >= tuning.FinisherHealthFraction ||
                !Finite(playerPosition) || !Finite(playerForward) || !Finite(targetPosition) || playerForward.sqrMagnitude < 1e-10f)
                return false;
            Vector3 offset = targetPosition - playerPosition;
            if (offset.sqrMagnitude > tuning.FinisherRange * tuning.FinisherRange) return false;
            // The cone follows the actual 3D nose, including pitch, not world up.
            if (offset.sqrMagnitude > 1e-10f && Vector3.Dot(offset.normalized, playerForward.normalized) + .000001f <
                Mathf.Cos(tuning.FinisherConeDegrees * Mathf.Deg2Rad)) return false;
            finished.Add(targetId); Serial++; LastTargetId = targetId;
            freezeRemaining = reducedMotion ? 0 : tuning.FinisherFreezeSeconds;
            return true;
        }

        /// <summary>Use unscaled encounter wall-step, BEFORE applying the freeze to
        /// simulation time. Feeding a frozen zero simulation dt would never release it.</summary>
        public void Tick(float realDt)
        {
            if (!Finite(realDt) || realDt <= 0) return;
            freezeRemaining = Math.Max(0, freezeRemaining - realDt);
            if (freezeRemaining < 1e-7) freezeRemaining = 0;
        }

        public void PauseClearFreeze() { freezeRemaining = 0; }
        public void Reset() { finished.Clear(); freezeRemaining = 0; Serial = 0; LastTargetId = null; }
        static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
        static bool Finite(Vector3 value) => Finite(value.x) && Finite(value.y) && Finite(value.z);
    }
}
