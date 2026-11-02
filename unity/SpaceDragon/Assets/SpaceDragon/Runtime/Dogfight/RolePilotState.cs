using System;
using UnityEngine;

namespace SpaceDragon.Dogfight
{
    /// <summary>Role movement around the unchanged Fighter pilot. The wrapper owns one
    /// role.Tick per live step and role.Reset on restart; adapters must not tick it again.
    /// Only Grappler may close and latch. Position/Velocity here, not Pilot's hidden
    /// standoff position, are authoritative for Grappler targeting and salvage.</summary>
    public sealed class RolePilotState
    {
        readonly EnemyRoleState role;
        readonly DogfightTuning tuning;
        readonly int formationSlot;
        Vector3 position, velocity, playerAnchor, stunDirection;
        Quaternion rotation;
        bool wasStunned;

        public EnemyPilot Pilot { get; }
        bool Grappler => role.Role == EnemyRole.Grappler;
        public Vector3 Position => Grappler ? position : Pilot.Position;
        public Vector3 Velocity => Grappler ? velocity : Pilot.Velocity;
        public Quaternion Rotation => Grappler ? rotation : Pilot.Rotation;
        public Vector3 Forward => Rotation * Vector3.forward;
        public float TargetProgress => Grappler ? 0 : Pilot.TargetProgress;
        public bool Locked => !Grappler && Pilot.Locked;

        public RolePilotState(int formationSlot, EnemyRoleState role, DogfightTuning tuning)
        {
            if (formationSlot < 0) throw new ArgumentOutOfRangeException(nameof(formationSlot));
            this.formationSlot = formationSlot;
            this.role = role ?? throw new ArgumentNullException(nameof(role));
            this.tuning = tuning ?? throw new ArgumentNullException(nameof(tuning));
            var settings = new EnemyPilotTuning();
            if (role.Role == EnemyRole.Racer)
            {
                Positive(tuning.RacerStrafeSpeed, nameof(tuning.RacerStrafeSpeed));
                Positive(tuning.RacerStationSpeed, nameof(tuning.RacerStationSpeed));
                Nonnegative(tuning.RacerStrafeWidth, nameof(tuning.RacerStrafeWidth));
                settings.StrafeWidth = tuning.RacerStrafeWidth;
                settings.StationSpeed = tuning.RacerStationSpeed;
                // Reuse the legacy response model with the selected phase multiplier.
                settings.StationGain *= tuning.RacerStrafeSpeed;
                settings.StationResponse *= tuning.RacerStrafeSpeed;
                settings.StationAcceleration *= tuning.RacerStrafeSpeed;
            }
            else if (role.Role == EnemyRole.Gunship)
            {
                Positive(tuning.GunshipStationSpeed, nameof(tuning.GunshipStationSpeed));
                settings.StationSpeed = tuning.GunshipStationSpeed;
            }
            else if (Grappler)
            {
                Positive(tuning.GrapplerCloseSpeed, nameof(tuning.GrapplerCloseSpeed));
                Nonnegative(tuning.GrapplerStunDriftSpeed, nameof(tuning.GrapplerStunDriftSpeed));
                if (!Finite(tuning.GrapplerLatchOffset)) throw new ArgumentException("Grappler attachment offset must be finite.");
            }
            Pilot = new EnemyPilot(formationSlot, settings);
            Reset();
        }

        public void Reset(Vector3 playerPosition = default)
        {
            Pilot.Reset(playerPosition); role.Reset();
            position = Pilot.Position; velocity = Pilot.Velocity; rotation = Pilot.Rotation;
            playerAnchor = playerPosition; stunDirection = Vector3.zero; wasStunned = false;
        }

        public EnemyShot? Tick(float dt, float elapsed, FlightState player)
        {
            if (player == null) throw new ArgumentNullException(nameof(player));
            if (!FlightState.Finite(dt) || dt <= 0) return null;
            if (!Grappler)
            {
                role.Tick(Mathf.Min(dt, Pilot.Tuning.MaxStep));
                // Fighter delegates its exact input, timing, random-free phase and shots.
                // The flag-off EnemyRoleState becomes Fighter before construction.
                float phase = role.Role == EnemyRole.Racer ? elapsed * tuning.RacerStrafeSpeed : elapsed;
                return Pilot.Tick(dt, phase, player, !role.Dead);
            }
            if (role.Dead) { velocity = Vector3.zero; return null; }
            dt = Mathf.Min(dt, Pilot.Tuning.MaxStep);
            Vector3 previous = position;
            Vector3 anchor = player.Position - player.RollOffset;
            position += Vector3.ClampMagnitude(anchor - playerAnchor, Pilot.Tuning.TravelSpeedLimit * dt);
            playerAnchor = anchor;
            if (role.Stunned)
            {
                if (!wasStunned)
                {
                    Vector3 outward = position - player.Position;
                    stunDirection = outward.sqrMagnitude > 0 ? outward.normalized : player.Rotation * Vector3.right;
                }
                float stunnedTime = Mathf.Min(dt, role.StunRemaining);
                position += stunDirection * tuning.GrapplerStunDriftSpeed * stunnedTime;
                role.Tick(stunnedTime);
                // Crossing the end of stun consumes only its actual time; approaching
                // and latching are forbidden for the stunned part of this same step.
                if (dt > stunnedTime) Approach(dt - stunnedTime, player);
            }
            else Approach(dt, player);
            wasStunned = role.Stunned;
            Vector3 facing = player.Position - position;
            if (facing.sqrMagnitude > 0)
                rotation = Quaternion.RotateTowards(rotation, Quaternion.FromToRotation(Vector3.forward, facing.normalized),
                    Pilot.Tuning.TurnRate * dt * Mathf.Rad2Deg);
            velocity = (position - previous) / dt;
            // Grappler's attack is its readable approach/latch, never unseen gunfire
            // emitted by the unused legacy standoff pilot behind it.
            return null;
        }

        void Approach(float dt, FlightState player)
        {
            Vector3 offset = tuning.GrapplerLatchOffset;
            offset.x = Mathf.Abs(offset.x) * (formationSlot % 2 == 0 ? -1 : 1);
            Vector3 attachment = player.Position + player.Rotation * offset;
            position = Vector3.MoveTowards(position, attachment, tuning.GrapplerCloseSpeed * dt);
            if (!role.Latched) role.TryLatch(Vector3.Distance(position, player.Position));
            role.Tick(dt);
        }

        static bool Finite(Vector3 v) => FlightState.Finite(v.x) && FlightState.Finite(v.y) && FlightState.Finite(v.z);
        static void Nonnegative(float value, string name)
        { if (!FlightState.Finite(value) || value < 0) throw new ArgumentOutOfRangeException(name); }
        static void Positive(float value, string name)
        { if (!FlightState.Finite(value) || value <= 0) throw new ArgumentOutOfRangeException(name); }
    }
}
