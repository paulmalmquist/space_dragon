using System;
using UnityEngine;

namespace SpaceDragon.Dogfight
{
    [Serializable]
    public sealed class FlightTuning
    {
        public float MinSpeed = 26, CruiseSpeed = 54, MaxSpeed = 88, ThrottleRate = 22, Acceleration = 36;
        public float TurnRate = 1.28f, PitchRate = 1.05f, SteeringResponse = 6.5f;
        public float BankAngle = 1.02f, BankResponse = 5, MomentumResponse = 5.5f;
        public float BoostSpeed = 148, BoostCapacity = 4.5f, BoostRechargeRate = .58f;
        public float BoostRechargeDelay = 1.3f, BoostRestartThreshold = .9f;
        public float EvasionCapacity = 100, RollCost = 40, BreakCost = 25, EvasionRechargeRate = 18, EvasionRechargeDelay = 1.8f;
        public float RollDuration = 1.05f, RollRadius = 2.6f, RollCooldown = .35f;
        public float BreakDuration = .85f, BreakCooldown = .5f, BreakTurnMultiplier = 2.3f, BreakSpeedFactor = .7f;
        public float BreakBankAngle = 1.45f, BreakSteeringResponse = 12, BreakDeceleration = 90, BreakMomentumResponse = 9;
        public float MaxStep = .1f;

        internal void Validate()
        {
            foreach (var field in typeof(FlightTuning).GetFields())
            {
                float value = (float)field.GetValue(this);
                if (!FlightState.Finite(value) || value < 0) throw new ArgumentOutOfRangeException(field.Name);
            }
            if (MinSpeed <= 0 || CruiseSpeed < MinSpeed || MaxSpeed < CruiseSpeed || BoostSpeed < MaxSpeed ||
                RollDuration <= 0 || BreakDuration <= 0 || MaxStep <= 0 || MaxStep > .25f ||
                BoostCapacity <= 0 || BoostRestartThreshold > BoostCapacity || EvasionCapacity <= 0 ||
                RollCost > EvasionCapacity || BreakCost > EvasionCapacity)
                throw new ArgumentException("Invalid flight speed, timing or resource bounds.");
        }
    }

    [Serializable]
    public struct FlightInput
    {
        public Vector2 Steer; // Right / up. Input adapters decide keyboard versus mouse priority.
        public float Throttle;
        public bool Boost;
        public FlightInput(Vector2 steer, float throttle = 0, bool boost = false)
        { Steer = steer; Throttle = throttle; Boost = boost; }
    }

    /// <summary>Authoritative metre/second flight; +Z forward, +Y up. No scene, save or damage ownership.</summary>
    public sealed class FlightState
    {
        public FlightTuning Tuning { get; }
        public Vector3 Position { get; private set; }
        public Quaternion Rotation { get; private set; }
        public Vector3 Velocity { get; private set; }
        public Vector3 Forward => Rotation * Vector3.forward;
        public Vector3 Up => Rotation * Vector3.up;
        public Vector3 RollOffset { get; private set; }
        public float Speed { get; private set; }
        public float CruiseSpeed { get; private set; }
        public float YawRate { get; private set; } // Radians/sec, positive right.
        public float PitchRate { get; private set; } // Radians/sec, positive up.
        public float Bank { get; private set; } // Radians, visual only.
        public float RollAngle { get; private set; } // Radians, visual only; never applied to Rotation.
        public bool Boosting { get; private set; }
        public bool BoostLocked { get; private set; }
        public float BoostEnergy { get; private set; } // Seconds of boost remaining.
        public float EvasionEnergy { get; private set; }
        public bool RollActive { get; private set; }
        public bool BreakActive { get; private set; }
        public int RollSerial { get; private set; }
        public int RollsCompleted { get; private set; }
        public int BreakSerial { get; private set; }
        public int BreaksCompleted { get; private set; }
        public int ManeuverSerial { get; private set; }
        public float RollElapsed { get; private set; }
        public float BreakElapsed { get; private set; }
        public float RollCooldown { get; private set; }
        public float BreakCooldown { get; private set; }
        public string LastManeuverRejection { get; private set; }
        private Vector3 cruiseVelocity;
        private Quaternion rollBasis;
        private int rollDirection, breakDirection;
        private float rechargeDelay, evasionRechargeDelay;
        private const float Epsilon = .000001f;

        public FlightState(FlightTuning tuning = null) { Tuning = tuning ?? new FlightTuning(); Tuning.Validate(); Reset(); }
        internal static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
        private static float Damp(float current, float target, float response, float dt) => Mathf.Lerp(current, target, 1 - Mathf.Exp(-response * dt));

        public void Reset()
        {
            Position = Vector3.zero; Rotation = Quaternion.identity; Speed = CruiseSpeed = Tuning.CruiseSpeed;
            Velocity = cruiseVelocity = Vector3.forward * Speed; RollOffset = Vector3.zero; rollBasis = Quaternion.identity;
            YawRate = PitchRate = Bank = RollAngle = RollElapsed = BreakElapsed = RollCooldown = BreakCooldown = 0;
            rechargeDelay = evasionRechargeDelay = 0; rollDirection = breakDirection = 0;
            BoostEnergy = Tuning.BoostCapacity; EvasionEnergy = Tuning.EvasionCapacity;
            Boosting = BoostLocked = RollActive = BreakActive = false;
            RollSerial = RollsCompleted = BreakSerial = BreaksCompleted = ManeuverSerial = 0; LastManeuverRejection = null;
        }

        /// <summary>
        /// Scene collision owns the contact point and push-out; flight resumes
        /// from its resolved pose. An interrupted maneuver stays paid and is not
        /// counted as completed. No rollback, reward or resource reset occurs.
        /// </summary>
        public void ResolveContact(Vector3 resolvedPosition, Vector3 deflectedVelocity)
        {
            if (!Finite(resolvedPosition.x) || !Finite(resolvedPosition.y) || !Finite(resolvedPosition.z) ||
                !Finite(deflectedVelocity.x) || !Finite(deflectedVelocity.y) || !Finite(deflectedVelocity.z) ||
                !Finite(deflectedVelocity.magnitude))
                throw new ArgumentException("Resolved collision pose and velocity must be finite.");
            Position = resolvedPosition;
            Velocity = cruiseVelocity = deflectedVelocity;
            Speed = deflectedVelocity.magnitude;
            if (Speed > Epsilon) Rotation = Quaternion.FromToRotation(Vector3.forward, deflectedVelocity / Speed).normalized;
            if (RollActive) RollCooldown = Mathf.Max(RollCooldown, Tuning.RollCooldown);
            if (BreakActive) BreakCooldown = Mathf.Max(BreakCooldown, Tuning.BreakCooldown);
            RollActive = BreakActive = Boosting = false;
            RollOffset = Vector3.zero; RollAngle = Bank = YawRate = PitchRate = RollElapsed = BreakElapsed = 0;
            rollDirection = breakDirection = 0; rollBasis = Rotation;
        }

        private bool AcceptManeuver(int direction, float cost)
        {
            LastManeuverRejection = direction != -1 && direction != 1 ? "invalid-direction" : RollActive || BreakActive ? "busy" :
                RollCooldown > Epsilon || BreakCooldown > Epsilon ? "cooldown" : EvasionEnergy + Epsilon < cost ? "energy" : null;
            if (LastManeuverRejection != null) return false;
            EvasionEnergy = Mathf.Max(0, EvasionEnergy - cost); evasionRechargeDelay = Tuning.EvasionRechargeDelay; ManeuverSerial++;
            return true;
        }
        // The input adapter must call only on a fresh key/button edge.
        public bool RequestRoll(int direction)
        {
            if (!AcceptManeuver(direction, Tuning.RollCost)) return false;
            RollActive = true; RollElapsed = 0; rollDirection = direction; RollSerial++;
            rollBasis = Rotation; RollOffset = Vector3.zero; return true;
        }
        public bool RequestBreak(int direction)
        {
            if (!AcceptManeuver(direction, Tuning.BreakCost)) return false;
            BreakActive = true; BreakElapsed = 0; breakDirection = direction; BreakSerial++; return true;
        }
        public bool RequestBreak() => RequestBreak(Mathf.Abs(Bank) > Epsilon ? -(int)Mathf.Sign(Bank) : -1);

        public void Tick(float dt, FlightInput input, float propulsionBoostMultiplier = 1, bool boostAllowed = true)
        {
            if (!Finite(dt) || dt <= 0) return;
            dt = Mathf.Min(dt, Tuning.MaxStep); // Suspension is not a teleport/catch-up request.
            propulsionBoostMultiplier = Finite(propulsionBoostMultiplier) ? Mathf.Clamp(propulsionBoostMultiplier, 0, 2) : 1;
            TickSegment(dt, input, propulsionBoostMultiplier, boostAllowed);
        }
        private void TickSegment(float dt, FlightInput input, float boostMultiplier, bool boostAllowed)
        {
            if (BreakActive && dt > 1f / 120 + Epsilon)
            {
                float maneuverTime = Mathf.Min(dt, Mathf.Max(0, Tuning.BreakDuration - BreakElapsed));
                int slices = Mathf.Max(1, Mathf.CeilToInt(maneuverTime * 120 - Epsilon));
                for (int i = 0; i < slices; i++) TickSegment(maneuverTime / slices, input, boostMultiplier, boostAllowed);
                if (dt - maneuverTime > Epsilon) TickSegment(dt - maneuverTime, input, boostMultiplier, boostAllowed);
                return;
            }
            UpdateEvasion(dt);
            float steer = Finite(input.Steer.x) ? Mathf.Clamp(input.Steer.x, -1, 1) : 0;
            float pitch = Finite(input.Steer.y) ? Mathf.Clamp(input.Steer.y, -1, 1) : 0;
            float throttle = Finite(input.Throttle) ? Mathf.Clamp(input.Throttle, -1, 1) : 0;
            CruiseSpeed = Mathf.Clamp(CruiseSpeed + throttle * Tuning.ThrottleRate * dt, Tuning.MinSpeed, Tuning.MaxSpeed);
            if (BoostLocked && BoostEnergy >= Tuning.BoostRestartThreshold) BoostLocked = false;
            Boosting = boostAllowed && !BreakActive && input.Boost && BoostEnergy > Epsilon && !BoostLocked;
            if (Boosting)
            {
                BoostEnergy = Mathf.Max(0, BoostEnergy - dt); rechargeDelay = Tuning.BoostRechargeDelay;
                if (BoostEnergy <= Epsilon) { BoostEnergy = 0; BoostLocked = true; }
            }
            else
            {
                rechargeDelay = Mathf.Max(0, rechargeDelay - dt);
                if (rechargeDelay <= Epsilon) BoostEnergy = Mathf.Min(Tuning.BoostCapacity, BoostEnergy + Tuning.BoostRechargeRate * dt);
            }
            float boostSpeed = CruiseSpeed + Mathf.Max(0, Tuning.BoostSpeed - CruiseSpeed) * boostMultiplier;
            float desiredSpeed = BreakActive ? Mathf.Max(Tuning.MinSpeed, CruiseSpeed * Tuning.BreakSpeedFactor) : Boosting ? boostSpeed : CruiseSpeed;
            Speed += Mathf.Clamp(desiredSpeed - Speed, -(BreakActive ? Tuning.BreakDeceleration : Tuning.Acceleration) * dt, Tuning.Acceleration * dt);
            float yawTarget = BreakActive ? breakDirection * Tuning.TurnRate * Tuning.BreakTurnMultiplier : steer * Tuning.TurnRate * (Boosting ? .75f : 1);
            YawRate = Damp(YawRate, yawTarget, BreakActive ? Tuning.BreakSteeringResponse : Tuning.SteeringResponse, dt);
            PitchRate = Damp(PitchRate, pitch * Tuning.PitchRate, Tuning.SteeringResponse, dt);
            // Local Y then X preserves the legacy YXZ integration after the +Z basis conversion.
            Rotation = (Rotation * Quaternion.AngleAxis(YawRate * dt * Mathf.Rad2Deg, Vector3.up) *
                Quaternion.AngleAxis(-PitchRate * dt * Mathf.Rad2Deg, Vector3.right)).normalized;
            Vector3 desired = Forward * Speed;
            cruiseVelocity = Vector3.Lerp(cruiseVelocity, desired, 1 - Mathf.Exp(-(BreakActive ? Tuning.BreakMomentumResponse : Tuning.MomentumResponse) * dt));
            Velocity = cruiseVelocity; Position += cruiseVelocity * dt;
            Bank = Damp(Bank, BreakActive ? -breakDirection * Tuning.BreakBankAngle : -steer * Tuning.BankAngle, Tuning.BankResponse, dt);
            UpdateRoll(dt); UpdateBreak(dt);
        }
        private void UpdateEvasion(float dt)
        {
            float remaining = RollActive ? Tuning.RollDuration - RollElapsed : BreakActive ? Tuning.BreakDuration - BreakElapsed : 0;
            float activeTime = Mathf.Min(dt, Mathf.Max(0, remaining));
            if (activeTime > 0) evasionRechargeDelay = Tuning.EvasionRechargeDelay;
            float idleTime = dt - activeTime, waiting = Mathf.Min(idleTime, evasionRechargeDelay);
            evasionRechargeDelay = Mathf.Max(0, evasionRechargeDelay - idleTime);
            EvasionEnergy = Mathf.Min(Tuning.EvasionCapacity, EvasionEnergy + (idleTime - waiting) * Tuning.EvasionRechargeRate);
        }
        private void UpdateRoll(float dt)
        {
            if (!RollActive) { RollCooldown = Mathf.Max(0, RollCooldown - dt); return; }
            RollElapsed = Mathf.Min(Tuning.RollDuration, RollElapsed + dt);
            if (Tuning.RollDuration - RollElapsed < Epsilon) RollElapsed = Tuning.RollDuration;
            float t = RollElapsed / Tuning.RollDuration, eased = t * t * t * (10 + t * (-15 + t * 6));
            float angle = eased * Mathf.PI * 2; RollAngle = -rollDirection * angle;
            Vector3 offset = t >= 1 ? Vector3.zero : rollBasis * new Vector3(rollDirection * Tuning.RollRadius * Mathf.Sin(angle), Tuning.RollRadius * (1 - Mathf.Cos(angle)), 0);
            Vector3 delta = offset - RollOffset; Position += delta;
            if (dt > 0) Velocity += delta / dt;
            RollOffset = offset;
            if (t >= 1) { RollActive = false; RollAngle = 0; RollCooldown = Tuning.RollCooldown; RollsCompleted++; }
        }
        private void UpdateBreak(float dt)
        {
            if (!BreakActive) { BreakCooldown = Mathf.Max(0, BreakCooldown - dt); return; }
            BreakElapsed = Mathf.Min(Tuning.BreakDuration, BreakElapsed + dt);
            if (Tuning.BreakDuration - BreakElapsed < Epsilon) BreakElapsed = Tuning.BreakDuration;
            if (BreakElapsed >= Tuning.BreakDuration) { BreakActive = false; BreakCooldown = Tuning.BreakCooldown; BreaksCompleted++; }
        }
    }
}
