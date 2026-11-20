using System;
using System.Collections.Generic;
using UnityEngine;

namespace SpaceDragon.Dogfight
{
    /// <summary>A live hostile bolt or seeking missile supplied by the encounter.
    /// IDs are unique until encounter reset; caller excludes friendly/nonseeking projectiles.</summary>
    public readonly struct PerfectRollThreat
    {
        public readonly int Id;
        public readonly Vector3 Position, Velocity;
        public readonly float RemainingLife;
        public PerfectRollThreat(int id, Vector3 position, Vector3 velocity, float remainingLife)
        { Id = id; Position = position; Velocity = velocity; RemainingLife = remainingLife; }
    }

    /// <summary>Accepted-roll timing, one refund and narrow projectile protection.
    /// Predicts current relative motion against the configured player sphere; no scene,
    /// rendering, damage or global time-scale ownership. Pause clears feedback time only.</summary>
    public sealed class PerfectRollState
    {
        readonly DogfightTuning tuning;
        readonly HashSet<int> harmless = new HashSet<int>();
        double slowRemaining;
        public int Serial { get; private set; }
        public float SlowRemaining => (float)slowRemaining;
        public int HarmlessCount => harmless.Count;

        public PerfectRollState(DogfightTuning tuning)
        { this.tuning = tuning != null ? tuning : throw new ArgumentNullException(nameof(tuning)); }

        /// <summary>Returns roll acceptance, whether ordinary or perfect. A new Serial
        /// identifies one perfect-roll reward/effect. Request once per fresh input edge.
        /// Threat samples must describe the instant before the encounter advances movement.</summary>
        public bool TryRoll(FlightState flight, int direction, IReadOnlyList<PerfectRollThreat> threats)
        {
            if (flight == null) throw new ArgumentNullException(nameof(flight));
            if (!flight.RequestRoll(direction)) return false;
            if (!tuning.EnablePerfectRoll || threats == null) return true;
            float window = tuning.PerfectRollWindow, radius = tuning.PerfectRollRadius;
            if (!FlightState.Finite(window) || !FlightState.Finite(radius) || window <= 0 || radius <= 0) return true;

            bool perfect = false;
            for (int i = 0; i < threats.Count; i++)
            {
                var threat = threats[i];
                if (threat.Id < 0 || harmless.Contains(threat.Id) || !Finite(threat.Position) || !Finite(threat.Velocity) ||
                    !FlightState.Finite(threat.RemainingLife) || threat.RemainingLife <= 0) continue;
                double horizon = Math.Min(window, threat.RemainingLife);
                if (!Intersects(threat, flight.Position, flight.Velocity, radius, horizon)) continue;
                harmless.Add(threat.Id);
                perfect = true;
            }
            if (perfect)
            {
                flight.AddEvasion(flight.Tuning.RollCost);
                Serial++;
                slowRemaining = FlightState.Finite(tuning.PerfectRollSlowSeconds) ? Math.Max(0, tuning.PerfectRollSlowSeconds) : 0;
            }
            return true;
        }

        public bool IsHarmless(int threatId) => harmless.Contains(threatId);

        /// <summary>Advance with real encounter seconds, before optional slow-motion scaling.
        /// The paused encounter does not call this; Pause also removes any pending slowdown.</summary>
        public void Tick(float realDt)
        {
            if (!FlightState.Finite(realDt) || realDt <= 0) return;
            slowRemaining = Math.Max(0, slowRemaining - realDt);
        }
        public void ClearSlowMotion() => slowRemaining = 0;
        public void Pause() => ClearSlowMotion();
        public void Reset() { harmless.Clear(); Serial = 0; slowRemaining = 0; }

        static bool Finite(Vector3 value) => FlightState.Finite(value.x) && FlightState.Finite(value.y) && FlightState.Finite(value.z);

        static bool Intersects(PerfectRollThreat threat, Vector3 playerPosition, Vector3 playerVelocity, double radius, double horizon)
        {
            // Relative swept segment: |offset + relativeVelocity*t| <= radius,
            // for 0 <= t <= min(window, projectile life). Double coefficients
            // avoid float cancellation/overflow in a fast, nearly tangent pass.
            double x = (double)threat.Position.x - playerPosition.x;
            double y = (double)threat.Position.y - playerPosition.y;
            double z = (double)threat.Position.z - playerPosition.z;
            double vx = (double)threat.Velocity.x - playerVelocity.x;
            double vy = (double)threat.Velocity.y - playerVelocity.y;
            double vz = (double)threat.Velocity.z - playerVelocity.z;
            double c = x * x + y * y + z * z - radius * radius;
            if (c <= 0) return true;
            double a = vx * vx + vy * vy + vz * vz;
            double b = x * vx + y * vy + z * vz;
            if (a <= 0 || b >= 0) return false;
            double discriminant = b * b - a * c;
            if (discriminant < 0) return false;
            // Equivalent to (-b - sqrt(discriminant))/a without subtracting
            // two nearly equal large values when the threat is close to contact.
            double contactTime = c / (-b + Math.Sqrt(discriminant));
            return contactTime >= 0 && contactTime <= horizon;
        }
    }
}
