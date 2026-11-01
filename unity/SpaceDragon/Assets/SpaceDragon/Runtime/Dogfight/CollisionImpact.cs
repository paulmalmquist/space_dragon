using System;
using UnityEngine;

namespace SpaceDragon.Dogfight
{
    public readonly struct CollisionImpactResult
    {
        public bool Fatal { get; }
        public float Damage { get; }
        public float Speed { get; }
        public float NormalSpeed { get; }
        public Vector3 DeflectedVelocity { get; }
        public CollisionImpactResult(bool fatal, float damage, float speed, float normalSpeed, Vector3 deflectedVelocity)
        { Fatal = fatal; Damage = damage; Speed = speed; NormalSpeed = normalSpeed; DeflectedVelocity = deflectedVelocity; }
    }

    /// <summary>Legacy Dogfight impact response. Scene owns swept contact and independent sphere geometry.</summary>
    public static class CollisionImpact
    {
        public static CollisionImpactResult Evaluate(Vector3 velocity, Vector3 outwardNormal, float hull = 100)
        {
            if (!Finite(velocity) || !Finite(outwardNormal) || !FlightState.Finite(hull) ||
                outwardNormal.sqrMagnitude <= 1e-12f || !FlightState.Finite(outwardNormal.sqrMagnitude) || !FlightState.Finite(velocity.magnitude))
                throw new ArgumentException("Impact requires finite velocity, nonzero finite normal and finite hull.");
            var normal = outwardNormal.normalized;
            float speed = velocity.magnitude, signed = Vector3.Dot(velocity, normal);
            float normalSpeed = Mathf.Max(0, -signed);
            // JavaScript Math.round rounds positive half values upwards;
            // Mathf.RoundToInt uses ties-to-even and would change graze thresholds.
            float grazeDamage = Mathf.Floor(12 + Mathf.Clamp01(normalSpeed / 65) * 23 + .5f);
            float remainingHull = Mathf.Max(0, hull);
            bool fatal = normalSpeed >= 65 || remainingHull <= grazeDamage;
            float damage = fatal ? Mathf.Max(remainingHull, grazeDamage) : grazeDamage;
            var deflected = (velocity - normal * signed) * .82f + normal * Mathf.Max(6, normalSpeed * .35f);
            return new CollisionImpactResult(fatal, damage, speed, normalSpeed, deflected);
        }
        static bool Finite(Vector3 value) => FlightState.Finite(value.x) && FlightState.Finite(value.y) && FlightState.Finite(value.z);
    }
}
