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
        public float RollDuration = 1.35f, RollRadius = 1.2f, RollCooldown = .35f;
        public float BreakDuration = .85f, BreakCooldown = .5f, BreakTurnMultiplier = 2.3f, BreakSpeedFactor = .7f;
        public float BreakBankAngle = 1.45f, BreakSteeringResponse = 12, BreakDeceleration = 90, BreakMomentumResponse = 9;
        public float HeldBreakDrainPerSecond = 30, HeldBreakTurnMultiplier = 3, HeldBreakSpeedFactor = .58f, HeldBreakBankAngle = 1.05f;
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
                RollCost > EvasionCapacity || BreakCost > EvasionCapacity || HeldBreakDrainPerSecond <= 0 ||
                BreakSpeedFactor > 1 || HeldBreakSpeedFactor > 1)
                throw new ArgumentException("Invalid flight speed, timing or resource bounds.");
        }
    }

    [Serializable]
    public struct FlightInput
    {
        public Vector2 Steer; // Right / up. Input adapters decide keyboard versus mouse priority.
        public float Throttle;
        public bool Boost;
        public bool BreakHeld; // Hold plus current steering requests a powered evasive turn.
        public FlightInput(Vector2 steer, float throttle = 0, bool boost = false, bool breakHeld = false)
        { Steer = steer; Throttle = throttle; Boost = boost; BreakHeld = breakHeld; }
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
        public bool HeldBreakActive => BreakActive && heldBreakMode;
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
        private bool heldBreakMode, breakButtonHeld, breakExhaustedUntilRelease;
        private float rechargeDelay, evasionRechargeDelay, rollBank;
        private const float Epsilon = .000001f;

        public FlightState(FlightTuning tuning = null) { Tuning = tuning ?? new FlightTuning(); Tuning.Validate(); Reset(); }
        internal static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
        private static float Damp(float current, float target, float response, float dt) => Mathf.Lerp(current, target, 1 - Mathf.Exp(-response * dt));

        public void Reset()
        {
            Position = Vector3.zero; Rotation = Quaternion.identity; Speed = CruiseSpeed = Tuning.CruiseSpeed;
            Velocity = cruiseVelocity = Vector3.forward * Speed; RollOffset = Vector3.zero; rollBasis = Quaternion.identity;
            YawRate = PitchRate = Bank = RollAngle = RollElapsed = BreakElapsed = RollCooldown = BreakCooldown = 0;
            rechargeDelay = evasionRechargeDelay = rollBank = 0; rollDirection = breakDirection = 0;
            BoostEnergy = Tuning.BoostCapacity; EvasionEnergy = Tuning.EvasionCapacity;
            Boosting = BoostLocked = RollActive = BreakActive = false;
            heldBreakMode = breakButtonHeld = breakExhaustedUntilRelease = false;
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
            heldBreakMode = false;
            RollOffset = Vector3.zero; RollAngle = Bank = YawRate = PitchRate = RollElapsed = BreakElapsed = 0;
            rollDirection = breakDirection = 0; rollBank = 0; rollBasis = Rotation;
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
            rollBasis = Rotation; rollBank = Bank; RollOffset = Vector3.zero; return true;
        }
        public bool RequestBreak(int direction)
        {
            if (!AcceptManeuver(direction, Tuning.BreakCost)) return false;
            BreakActive = true; heldBreakMode = false; BreakElapsed = 0; breakDirection = direction; BreakSerial++; return true;
        }
        public bool RequestBreak() => RequestBreak(Mathf.Abs(Bank) > Epsilon ? -(int)Mathf.Sign(Bank) : -1);

        /// <summary>Bounded encounter reward. The granting state owns its once-only guard;
        /// this does not reset maneuver cooldowns, recharge delay or held-button intent.</summary>
        public void AddEvasion(float amount)
        {
            if (!Finite(amount) || amount <= 0) return;
            EvasionEnergy += Mathf.Min(amount, Mathf.Max(0, Tuning.EvasionCapacity - EvasionEnergy));
        }

        /// <summary>Restore the existing boost reservoir without changing speed or input.
        /// A reward can immediately make exhausted boost available on the next live tick.</summary>
        public void RefillBoost()
        {
            BoostEnergy = Tuning.BoostCapacity;
            BoostLocked = false;
            rechargeDelay = 0;
        }

        /// <summary>
        /// Release an interrupted held turn without refunding energy or counting
        /// completion. The physical button must be released before another hold.
        /// Call when focus/pause clears the input adapter, not on every frame.
        /// </summary>
        public void CancelHeldBreak()
        {
            if (!HeldBreakActive) return;
            FinishBreak(false);
            breakButtonHeld = true;
        }

        private void ReadHeldBreak(bool held)
        {
            if (!held)
            {
                if (HeldBreakActive) FinishBreak(true);
                breakExhaustedUntilRelease = false;
            }
            else if (!breakButtonHeld)
            {
                // A neutral hold brakes but does not invent a turn direction.
                // Steering remains live throughout the powered maneuver.
                if (AcceptManeuver(1, Tuning.BreakCost))
                {
                    BreakActive = heldBreakMode = true;
                    BreakElapsed = 0; breakDirection = 0; BreakSerial++;
                }
                else if (LastManeuverRejection == "energy") breakExhaustedUntilRelease = true;
            }
            breakButtonHeld = held;
        }

        public void Tick(float dt, FlightInput input, float propulsionBoostMultiplier = 1, bool boostAllowed = true)
        {
            if (!Finite(dt) || dt <= 0) return;
            dt = Mathf.Min(dt, Tuning.MaxStep); // Suspension is not a teleport/catch-up request.
            ReadHeldBreak(input.BreakHeld);
            propulsionBoostMultiplier = Finite(propulsionBoostMultiplier) ? Mathf.Clamp(propulsionBoostMultiplier, 0, 2) : 1;
            TickSegment(dt, input, propulsionBoostMultiplier, boostAllowed);
        }
        private void TickSegment(float dt, FlightInput input, float boostMultiplier, bool boostAllowed)
        {
            if (BreakActive)
            {
                // End the powered phase at its actual time, before consuming the
                // rest of a render tick. Otherwise FinishBreak resets the delay
                // after UpdateEvasion credited idle time, losing up to a slice
                // of recharge/cooldown (and giving free braking after exhaustion).
                float remaining = HeldBreakActive ? EvasionEnergy / Tuning.HeldBreakDrainPerSecond :
                    Mathf.Max(0, Tuning.BreakDuration - BreakElapsed);
                if (remaining <= 0)
                {
                    if (HeldBreakActive) breakExhaustedUntilRelease = true;
                    FinishBreak(true);
                }
                else if (remaining < dt)
                {
                    TickSegment(remaining, input, boostMultiplier, boostAllowed);
                    TickSegment(dt - remaining, input, boostMultiplier, boostAllowed);
                    return;
                }
            }
            if (BreakActive && dt > 1f / 120 + Epsilon)
            {
                int slices = Mathf.Max(1, Mathf.CeilToInt(dt * 120 - Epsilon));
                for (int i = 0; i < slices; i++) TickSegment(dt / slices, input, boostMultiplier, boostAllowed);
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
            float brakeFactor = HeldBreakActive ? Tuning.HeldBreakSpeedFactor : Tuning.BreakSpeedFactor;
            float desiredSpeed = BreakActive ? Mathf.Max(Tuning.MinSpeed, CruiseSpeed * brakeFactor) : Boosting ? boostSpeed : CruiseSpeed;
            Speed += Mathf.Clamp(desiredSpeed - Speed, -(BreakActive ? Tuning.BreakDeceleration : Tuning.Acceleration) * dt, Tuning.Acceleration * dt);
            float yawTarget = HeldBreakActive ? steer * Tuning.TurnRate * Tuning.HeldBreakTurnMultiplier :
                BreakActive ? breakDirection * Tuning.TurnRate * Tuning.BreakTurnMultiplier : steer * Tuning.TurnRate * (Boosting ? .75f : 1);
            YawRate = Damp(YawRate, yawTarget, BreakActive ? Tuning.BreakSteeringResponse : Tuning.SteeringResponse, dt);
            PitchRate = Damp(PitchRate, pitch * Tuning.PitchRate * (HeldBreakActive ? Tuning.HeldBreakTurnMultiplier : 1),
                HeldBreakActive ? Tuning.BreakSteeringResponse : Tuning.SteeringResponse, dt);
            // Local Y then X preserves the legacy YXZ integration after the +Z basis conversion.
            Rotation = (Rotation * Quaternion.AngleAxis(YawRate * dt * Mathf.Rad2Deg, Vector3.up) *
                Quaternion.AngleAxis(-PitchRate * dt * Mathf.Rad2Deg, Vector3.right)).normalized;
            Vector3 desired = Forward * Speed;
            cruiseVelocity = Vector3.Lerp(cruiseVelocity, desired, 1 - Mathf.Exp(-(BreakActive ? Tuning.BreakMomentumResponse : Tuning.MomentumResponse) * dt));
            Velocity = cruiseVelocity; Position += cruiseVelocity * dt;
            // Hold the entry bank through the revolution. Damping it toward
            // neutral here would briefly reverse a roll's slow entry/exit.
            float bankTarget = HeldBreakActive ? -steer * Tuning.HeldBreakBankAngle :
                BreakActive ? -breakDirection * Tuning.BreakBankAngle : -steer * Tuning.BankAngle;
            Bank = RollActive ? rollBank : Damp(Bank, bankTarget, Tuning.BankResponse, dt);
            UpdateRoll(dt); UpdateBreak(dt);
        }
        private void UpdateEvasion(float dt)
        {
            if (breakExhaustedUntilRelease && breakButtonHeld)
            {
                evasionRechargeDelay = Tuning.EvasionRechargeDelay;
                return;
            }
            float remaining = RollActive ? Tuning.RollDuration - RollElapsed : HeldBreakActive ? dt :
                BreakActive ? Tuning.BreakDuration - BreakElapsed : 0;
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
            float t = RollElapsed / Tuning.RollDuration, eased = RollProgress(t);
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
            if (heldBreakMode)
            {
                BreakElapsed += dt;
                EvasionEnergy = Mathf.Max(0, EvasionEnergy - Tuning.HeldBreakDrainPerSecond * dt);
                if (EvasionEnergy <= Epsilon)
                {
                    EvasionEnergy = 0; breakExhaustedUntilRelease = true;
                    FinishBreak(true);
                }
                return;
            }
            BreakElapsed = Mathf.Min(Tuning.BreakDuration, BreakElapsed + dt);
            if (Tuning.BreakDuration - BreakElapsed < Epsilon) BreakElapsed = Tuning.BreakDuration;
            if (BreakElapsed >= Tuning.BreakDuration) FinishBreak(true);
        }
        private void FinishBreak(bool completed)
        {
            BreakActive = heldBreakMode = false;
            BreakCooldown = Tuning.BreakCooldown;
            evasionRechargeDelay = Tuning.EvasionRechargeDelay;
            if (completed) BreaksCompleted++;
        }
        private static float RollProgress(float t)
        {
            // Integrate cosine velocity ramps over the first/last 20%, leaving
            // a steady middle. Peak rate is only 1.25x the mean (old quintic:
            // 1.875x), with zero velocity and acceleration at both endpoints.
            const float ramp = .2f;
            if (t <= 0) return 0;
            if (t >= 1) return 1;
            if (t < ramp) return (t - ramp / Mathf.PI * Mathf.Sin(Mathf.PI * t / ramp)) * .5f / (1 - ramp);
            if (t > 1 - ramp) return 1 - RollProgress(1 - t);
            return (t - ramp * .5f) / (1 - ramp);
        }
    }
}
