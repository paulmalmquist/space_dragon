using System;
using UnityEngine;

namespace SpaceDragon.Dogfight
{
    /// <summary>What the reticle marker says. A larger value outranks a smaller one.</summary>
    public enum HitConfirmKind { None = 0, Blocked = 1, Hit = 2, Kill = 3 }

    /// <summary>
    /// A brief reticle marker that tells the pilot their own shot landed, was stopped by a shield
    /// or finished a target. It is a timer and nothing else: no count, score or meter is kept, and
    /// it never decides whether a shot hit. The encounter reports results it already has.
    /// </summary>
    public sealed class HitConfirmState
    {
        readonly DogfightTuning tuning;
        float duration, remaining;

        public HitConfirmKind Kind { get; private set; }
        /// <summary>Counts accepted reports, for tests and the QA snapshot. Not shown to the player.</summary>
        public int Serial { get; private set; }
        public float Remaining => remaining;
        /// <summary>0 when the marker appears, 1 as it ends.</summary>
        public float Progress => Kind == HitConfirmKind.None || duration <= 0 ? 0 : Mathf.Clamp01(1 - remaining / duration);
        public bool Visible => Kind != HitConfirmKind.None;

        public HitConfirmState(DogfightTuning tuning)
        {
            this.tuning = tuning ?? throw new ArgumentNullException(nameof(tuning));
            if (!NonNegative(tuning.HitConfirmSeconds) || !NonNegative(tuning.HitConfirmKillSeconds) ||
                !NonNegative(tuning.HitConfirmBlockedSeconds))
                throw new ArgumentException("Hit confirmation tuning requires finite, nonnegative durations.", nameof(tuning));
        }

        /// <summary>
        /// Shows a marker. A weaker report never replaces a stronger one that is still showing;
        /// an equal or stronger one restarts the timer. Returns whether the marker changed.
        /// </summary>
        public bool Register(HitConfirmKind kind)
        {
            if (!tuning.EnableHitConfirm || kind == HitConfirmKind.None || !Enum.IsDefined(typeof(HitConfirmKind), kind)) return false;
            float seconds = kind == HitConfirmKind.Kill ? tuning.HitConfirmKillSeconds :
                kind == HitConfirmKind.Blocked ? tuning.HitConfirmBlockedSeconds : tuning.HitConfirmSeconds;
            if (seconds <= 0) return false;
            Serial++;
            if (Kind != HitConfirmKind.None && kind < Kind) return false;
            Kind = kind; duration = remaining = seconds;
            return true;
        }

        public void Tick(float dt)
        {
            if (Kind == HitConfirmKind.None || float.IsNaN(dt) || float.IsInfinity(dt) || dt <= 0) return;
            remaining -= dt;
            if (remaining <= 0) Hide();
        }

        /// <summary>Pause: hide the marker and keep the report count.</summary>
        public void Hide() { Kind = HitConfirmKind.None; duration = remaining = 0; }
        /// <summary>Restart: hide the marker and forget the count.</summary>
        public void Reset() { Hide(); Serial = 0; }

        static bool NonNegative(float value) => !float.IsNaN(value) && !float.IsInfinity(value) && value >= 0;
    }
}
