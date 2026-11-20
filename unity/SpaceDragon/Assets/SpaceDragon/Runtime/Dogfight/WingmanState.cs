using System;
using System.Collections.Generic;
using UnityEngine;

namespace SpaceDragon.Dogfight
{
    public readonly struct WingmanCandidate
    {
        public readonly string Id;
        public readonly Vector3 Position;
        public readonly bool Alive;
        public WingmanCandidate(string id, Vector3 position, bool alive = true)
        { Id = id; Position = position; Alive = alive; }
    }
    public readonly struct WingmanHit
    {
        public readonly string TargetId;
        public readonly float Damage;
        public WingmanHit(string targetId, float damage) { TargetId = targetId; Damage = damage; }
    }

    /// <summary>Lab ally timing and attack intent only. The adapter supplies current
    /// target existence and resolves returned damage through EnemyRoleState as Wingman.
    /// Formation motion, strafing pose, icon, warning text and opt-in tones observe this state.</summary>
    public sealed class WingmanState
    {
        readonly DogfightTuning tuning;
        double runRemaining, cooldownRemaining, warningCooldown, riseSeconds;
        float previousTracking, trackingBaseline;
        bool hasTracking;
        public string TargetId { get; private set; } = "";
        public bool Running => runRemaining > 0;
        public bool Ready => tuning.EnableWingman && !Running && cooldownRemaining <= 0;
        public float RunRemaining => (float)runRemaining;
        public float CooldownRemaining => (float)cooldownRemaining;
        public float WarningCooldownRemaining => (float)warningCooldown;
        public int RunsSent { get; private set; }

        public WingmanState(DogfightTuning tuning)
        {
            this.tuning = tuning ?? throw new ArgumentNullException(nameof(tuning));
            if (!Finite(tuning.WingmanRunSeconds) || tuning.WingmanRunSeconds <= 0 ||
                !Finite(tuning.WingmanCooldownSeconds) || tuning.WingmanCooldownSeconds < 0 ||
                !Finite(tuning.WingmanDamagePerSecond) || tuning.WingmanDamagePerSecond < 0 ||
                !Finite(tuning.WingmanWarningRise) || tuning.WingmanWarningRise <= 0 ||
                !Finite(tuning.WingmanWarningCooldown) || tuning.WingmanWarningCooldown < 0 ||
                !Finite(tuning.WingmanWarningWindowSeconds) || tuning.WingmanWarningWindowSeconds <= 0)
                throw new ArgumentException("Wingman tuning requires finite, valid durations, damage and warning thresholds.", nameof(tuning));
        }

        public static string SelectTarget(string lockedId, IReadOnlyList<WingmanCandidate> candidates, Vector3 playerPosition)
        {
            if (candidates == null || !Finite(playerPosition)) return "";
            string nearest = ""; float distance = float.PositiveInfinity;
            foreach (var candidate in candidates)
            {
                if (!candidate.Alive || string.IsNullOrWhiteSpace(candidate.Id) || !Finite(candidate.Position)) continue;
                if (!string.IsNullOrEmpty(lockedId) && candidate.Id == lockedId) return candidate.Id;
                float next = (candidate.Position - playerPosition).sqrMagnitude;
                if (next < distance || (next == distance && StringComparer.Ordinal.Compare(candidate.Id, nearest) < 0))
                { nearest = candidate.Id; distance = next; }
            }
            return nearest;
        }

        public bool TrySend(string targetId)
        {
            if (!Ready || string.IsNullOrWhiteSpace(targetId)) return false;
            TargetId = targetId; runRemaining = tuning.WingmanRunSeconds;
            cooldownRemaining = tuning.WingmanCooldownSeconds; RunsSent++; return true;
        }

        /// <summary>Cooldown starts at activation. Damage integrates only the part of
        /// dt inside the run. A lost/dead target cancels immediately without retargeting.</summary>
        public WingmanHit? Tick(float dt, bool targetAlive = true)
        {
            if (!tuning.EnableWingman)
            { CancelRun(); cooldownRemaining = warningCooldown = riseSeconds = 0; hasTracking = false; return null; }
            if (!Finite(dt) || dt <= 0) return null;
            cooldownRemaining = Math.Max(0, cooldownRemaining - dt);
            if (cooldownRemaining < 1e-6) cooldownRemaining = 0;
            if (!Running) return null;
            if (!targetAlive) { CancelRun(); return null; }
            float activeStep = (float)Math.Min(dt, runRemaining);
            string target = TargetId;
            runRemaining = Math.Max(0, runRemaining - dt);
            if (runRemaining < 1e-6) CancelRun();
            float damage = tuning.WingmanDamagePerSecond * activeStep;
            return damage > 0 ? new WingmanHit(target, damage) : (WingmanHit?)null;
        }

        /// <summary>Call once per simulation step, independently of Tick. This method
        /// advances ONLY warning time. A rise must fit inside the configured window;
        /// steady high tracking and slow accumulation never repeatedly call out.</summary>
        public bool ObserveTracking(float value, float dt)
        {
            if (!tuning.EnableWingman || !Finite(value) || !Finite(dt) || dt <= 0) return false;
            value = Mathf.Clamp01(value); warningCooldown = Math.Max(0, warningCooldown - dt);
            if (warningCooldown < 1e-7) warningCooldown = 0;
            if (!hasTracking)
            { hasTracking = true; previousTracking = trackingBaseline = value; riseSeconds = 0; return false; }
            riseSeconds += dt;
            if (value < previousTracking)
            { trackingBaseline = value; riseSeconds = 0; }
            else if (riseSeconds > tuning.WingmanWarningWindowSeconds)
            { trackingBaseline = previousTracking; riseSeconds = dt; }
            previousTracking = value;
            if (warningCooldown > 0 || riseSeconds > tuning.WingmanWarningWindowSeconds ||
                value - trackingBaseline < tuning.WingmanWarningRise) return false;
            warningCooldown = tuning.WingmanWarningCooldown; trackingBaseline = value; riseSeconds = 0;
            return true;
        }

        public void CancelRun() { runRemaining = 0; TargetId = ""; }
        public void Reset()
        {
            CancelRun(); cooldownRemaining = warningCooldown = riseSeconds = 0;
            previousTracking = trackingBaseline = 0; hasTracking = false; RunsSent = 0;
        }
        static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
        static bool Finite(Vector3 value) => Finite(value.x) && Finite(value.y) && Finite(value.z);
    }
}
