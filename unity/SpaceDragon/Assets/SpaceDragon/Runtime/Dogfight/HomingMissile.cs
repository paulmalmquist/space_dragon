using System;
using UnityEngine;

namespace SpaceDragon.Dogfight
{
    /// <summary>
    /// Pure limited-turn flight for friendly or hostile missiles. +Z is forward.
    /// The scene must test PreviousPosition→Position against scenery and target collision shapes
    /// after every Step (including the expiry step), resolve the nearest impact, then Expire.
    /// This class never teleports to a target, applies damage, or guarantees an impact.
    /// </summary>
    public sealed class HomingMissile
    {
        readonly float speed, turnRadians, lifetime, leadSeconds;
        public Vector3 PreviousPosition { get; private set; }
        public Vector3 Position { get; private set; }
        public Vector3 Forward { get; private set; }
        public Vector3 Velocity => Forward * speed;
        public float Age { get; private set; }
        public bool Alive { get; private set; } = true;

        public HomingMissile(Vector3 position, Vector3 forward, DogfightTuning tuning)
        {
            if (tuning == null) throw new ArgumentNullException(nameof(tuning));
            if (!TacticalState.Finite(position) || !TacticalState.Finite(forward)) throw new ArgumentException("Missile pose must be finite");
            PreviousPosition = Position = position;
            Forward = forward.sqrMagnitude > .000001f ? forward.normalized : Vector3.forward;
            speed = Mathf.Max(1, tuning.MissileSpeed);
            turnRadians = Mathf.Max(0, tuning.MissileTurnDegreesPerSecond) * Mathf.Deg2Rad;
            lifetime = Mathf.Max(.01f, tuning.MissileLifetimeSeconds);
            leadSeconds = Mathf.Max(0, tuning.MissileTargetLeadSeconds);
        }

        public void Step(float dt, Vector3 targetPosition, Vector3 targetVelocity = default)
        {
            PreviousPosition = Position;
            if (!Alive || !TacticalState.Finite(dt) || dt <= 0) return;
            float remaining = Mathf.Min(dt, lifetime - Age);
            bool targetValid = TacticalState.Finite(targetPosition) && TacticalState.Finite(targetVelocity);
            // Bounded integration avoids turn jumps on a long frame; no target-position snap.
            while (remaining > .000001f)
            {
                float step = Mathf.Min(remaining, 1f / 120f);
                if (targetValid)
                {
                    Vector3 desired = targetPosition + targetVelocity * leadSeconds - Position;
                    if (desired.sqrMagnitude > .000001f)
                        Forward = Vector3.RotateTowards(Forward, desired.normalized, turnRadians * step, 0).normalized;
                }
                Position += Forward * speed * step;
                Age += step;
                remaining -= step;
            }
            if (Age >= lifetime - .00001f) { Age = lifetime; Alive = false; }
        }

        public void Expire() { Alive = false; }
    }
}
