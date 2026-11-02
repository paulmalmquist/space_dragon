using System;
using System.Collections.Generic;
using UnityEngine;

namespace SpaceDragon.Dogfight
{
    public readonly struct WingLaserTarget
    {
        public readonly int Index;
        public readonly Vector3 Position;
        public readonly float Radius;
        public WingLaserTarget(int index, Vector3 position, float radius = 5)
        { Index = index; Position = position; Radius = radius; }
    }

    public readonly struct WingLaserHit
    {
        public readonly int TargetIndex;
        public readonly Vector3 Endpoint;
        public readonly bool Blocked;
        public WingLaserHit(int targetIndex, Vector3 endpoint, bool blocked)
        { TargetIndex = targetIndex; Endpoint = endpoint; Blocked = blocked; }
    }

    /// <summary>Instant geometric query, independent of visual pulse lifetime or frame time.
    /// Caller supplies the nearest environment distance, resolves BOTH wings, then applies damage.</summary>
    public static class WingLaserQuery
    {
        public const float Range = 650;
        public const float DamagePerWing = 4; // Existing 8-damage cadence retained across a twin volley.
        public static WingLaserHit Resolve(Vector3 origin, Vector3 direction,
            IReadOnlyList<WingLaserTarget> targets, float environmentDistance = Range)
        {
            if (!Finite(origin) || !Finite(direction) || direction.sqrMagnitude < .000001f
                || float.IsNaN(environmentDistance) || float.IsInfinity(environmentDistance))
                throw new ArgumentException("Laser query requires finite origins, direction and obstruction distance.");
            direction.Normalize();
            float limit = Mathf.Clamp(environmentDistance, 0, Range);
            float nearest = limit / Range;
            int hit = -1;
            Vector3 end = origin + direction * Range;
            if (targets != null) foreach (var target in targets)
            {
                if (target.Index < 0 || !Finite(target.Position) || !FlightState.Finite(target.Radius) || target.Radius <= 0) continue;
                if (DogfightEncounter.SegmentSphere(origin, end, target.Position, target.Radius, out float t) && t < nearest)
                { nearest = t; hit = target.Index; }
            }
            return new WingLaserHit(hit, origin + direction * (nearest * Range), hit < 0 && limit < Range);
        }
        static bool Finite(Vector3 p) => FlightState.Finite(p.x) && FlightState.Finite(p.y) && FlightState.Finite(p.z);
    }
}
