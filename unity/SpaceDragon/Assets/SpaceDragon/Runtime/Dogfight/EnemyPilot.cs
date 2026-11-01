using System;
using UnityEngine;

namespace SpaceDragon.Dogfight
{
    [Serializable]
    public sealed class EnemyPilotTuning
    {
        public float StationSpeed = 20, StationGain = .45f, StationResponse = 2.8f, StationAcceleration = 24;
        public float AvoidRadius = 220, MinSeparation = 150, StrafeWidth = 28, StrafeHeight = 12;
        public float TurnRate = 1.45f, FireRange = 650, FireInterval = 4.4f, ProjectileSpeed = 210, ProjectileLife = 4.8f;
        public int BurstCount = 3;
        public float BurstSpacing = .14f, TrackingAcquire = 1.15f, TrackingLose = 2.2f, TrackingHoldoff = 1.2f, FireTelegraph = .75f;
        public float TravelSpeedLimit = 148, MaxStep = .1f;
        internal void Validate()
        {
            foreach (var field in typeof(EnemyPilotTuning).GetFields())
            {
                if (field.FieldType != typeof(float)) continue;
                float value = (float)field.GetValue(this);
                if (!FlightState.Finite(value) || value < 0) throw new ArgumentOutOfRangeException(field.Name);
            }
            if (TrackingAcquire <= 0 || ProjectileSpeed <= 0 || BurstCount < 1 || StationSpeed <= 0 ||
                AvoidRadius <= MinSeparation || FireRange <= 35 || MaxStep <= 0 || MaxStep > .25f)
                throw new ArgumentException("Invalid enemy standoff or targeting bounds.");
        }
    }

    [Serializable]
    public struct EnemyShot
    {
        public int EnemyId, Serial;
        public Vector3 Origin, Direction;
    }

    /// <summary>Standoff pilot and observed-motion targeting. The encounter owns hull, projectiles and damage.</summary>
    public sealed class EnemyPilot
    {
        public int Id { get; }
        public string Name => "WRAITH " + (Id + 1).ToString("00");
        public EnemyPilotTuning Tuning { get; }
        public Vector3 StationOffset { get; }
        public Vector3 Position { get; private set; }
        public Quaternion Rotation { get; private set; }
        public Vector3 Forward => Rotation * Vector3.forward;
        public Vector3 Velocity { get; private set; }
        public Vector3 RelativeVelocity { get; private set; }
        public Vector3 Goal { get; private set; }
        public float TargetProgress { get; private set; }
        public float Motion { get; private set; }
        public bool Eligible { get; private set; }
        public bool Locked => TargetProgress >= .8f && holdoff <= 0;
        public bool Firing => shotWarning > 0;
        public bool CanFire => Eligible && telegraph >= Tuning.FireTelegraph && holdoff <= 0;
        public int BurstRemaining { get; private set; }
        public int ShotSerial { get; private set; }
        public int LockBreaks { get; private set; }
        public float Holdoff => holdoff;
        public float VisualBank { get; private set; } // Radians, presentation-only.
        public float VisualBob { get; private set; }
        private Vector3 playerAnchor, previousVelocity, previousForward, predictedVelocity;
        private bool hasPrevious;
        private int observedRollSerial;
        private float cooldown, burstTimer, holdoff, telegraph, shotWarning;

        public EnemyPilot(int id, Vector3 stationOffset, EnemyPilotTuning tuning = null)
        {
            if (id < 0) throw new ArgumentOutOfRangeException(nameof(id));
            if (!Finite(stationOffset) || stationOffset.sqrMagnitude < .001f) throw new ArgumentException("A finite, nonzero station offset is required.", nameof(stationOffset));
            Id = id; StationOffset = stationOffset; Tuning = tuning ?? new EnemyPilotTuning(); Tuning.Validate(); Reset();
        }
        public EnemyPilot(int id, EnemyPilotTuning tuning = null) : this(id, DefaultStation(id), tuning) { }
        private static Vector3 DefaultStation(int id)
        {
            switch (id % 3) { case 0: return new Vector3(-90, 25, 260); case 1: return new Vector3(140, -25, 360); default: return new Vector3(-150, 60, 460); }
        }
        private static bool Finite(Vector3 value) => FlightState.Finite(value.x) && FlightState.Finite(value.y) && FlightState.Finite(value.z);
        public void Reset(Vector3 playerPosition = default)
        {
            if (!Finite(playerPosition)) throw new ArgumentException("Player anchor is not finite.", nameof(playerPosition));
            playerAnchor = playerPosition; Position = Goal = playerPosition + StationOffset;
            Rotation = Quaternion.FromToRotation(Vector3.forward, -StationOffset.normalized);
            Velocity = Vector3.forward * 54; RelativeVelocity = Vector3.zero;
            previousVelocity = predictedVelocity = previousForward = Vector3.zero; hasPrevious = false;
            TargetProgress = Motion = telegraph = holdoff = shotWarning = burstTimer = VisualBank = VisualBob = 0;
            cooldown = .9f + Id * .4f; BurstRemaining = ShotSerial = LockBreaks = observedRollSerial = 0; Eligible = false;
        }
        public void BreakLock()
        {
            TargetProgress = telegraph = shotWarning = 0; Eligible = false;
            holdoff = Tuning.TrackingHoldoff; BurstRemaining = 0; LockBreaks++;
        }

        public EnemyShot? Tick(float dt, float elapsed, FlightState player, bool alive = true)
        {
            if (player == null) throw new ArgumentNullException(nameof(player));
            if (!FlightState.Finite(dt) || dt <= 0) return null;
            dt = Mathf.Min(dt, Tuning.MaxStep); elapsed = FlightState.Finite(elapsed) ? elapsed : 0;
            if (!alive) { Eligible = false; BurstRemaining = 0; TargetProgress = telegraph = shotWarning = 0; return null; }
            if (player.RollSerial != observedRollSerial)
            {
                if (player.RollSerial > observedRollSerial) BreakLock();
                observedRollSerial = player.RollSerial;
            }
            // Carry ordinary travel, not the corkscrew. The formation never teleports to a new heading.
            Vector3 anchor = player.Position - player.RollOffset;
            Vector3 travel = Vector3.ClampMagnitude(anchor - playerAnchor, Tuning.TravelSpeedLimit * dt); playerAnchor = anchor;
            Vector3 previous = Position; Position += travel; cooldown -= dt;
            float phase = Id * 2.1f;
            Vector3 station = StationOffset;
            station.x += Mathf.Sin(elapsed * (.5f + Id * .055f) + phase) * Tuning.StrafeWidth;
            station.y += Mathf.Sin(elapsed * (.65f + Id * .035f) + phase) * Tuning.StrafeHeight;
            Goal = player.Rotation * station + anchor;
            Vector3 correction = Vector3.ClampMagnitude((Goal - Position) * Tuning.StationGain, Tuning.StationSpeed);
            Vector3 outward = Position - anchor; float separation = outward.magnitude;
            if (separation < Tuning.AvoidRadius)
            {
                outward = separation > .000001f ? outward / separation : -player.Forward;
                float inward = Vector3.Dot(correction, outward);
                if (inward < 0)
                {
                    correction -= outward * inward;
                    // The cross order changes with the legacy -Z -> Unity +Z basis reflection.
                    Vector3 tangent = Vector3.Cross(player.Up, outward);
                    if (tangent.sqrMagnitude < .001f) tangent = Vector3.Cross(Vector3.right, outward);
                    if (correction.magnitude < Tuning.StationSpeed * .5f)
                        correction += tangent.normalized * (Id % 2 != 0 ? -1 : 1) * Tuning.StationSpeed * .75f;
                }
                correction += outward * Mathf.Max(0, Tuning.MinSeparation + 30 - separation);
                correction = Vector3.ClampMagnitude(correction, Tuning.StationSpeed);
            }
            Vector3 velocityChange = Vector3.ClampMagnitude((correction - RelativeVelocity) * (1 - Mathf.Exp(-Tuning.StationResponse * dt)), Tuning.StationAcceleration * dt);
            RelativeVelocity += velocityChange; Position += RelativeVelocity * dt; Velocity = (Position - previous) / dt;
            Vector3 toPlayer = player.Position - Position; float distance = toPlayer.magnitude;
            Vector3 facing = distance > .001f ? toPlayer / distance : Forward;
            Rotation = Quaternion.RotateTowards(Rotation, Quaternion.FromToRotation(Vector3.forward, facing), Tuning.TurnRate * dt * Mathf.Rad2Deg);
            float lateral = (Quaternion.Inverse(Rotation) * RelativeVelocity).x;
            VisualBank = Mathf.Lerp(VisualBank, -lateral / Tuning.StationSpeed * .16f, 1 - Mathf.Exp(-4 * dt));
            VisualBob = Mathf.Sin(elapsed * 1.7f + Id) * .15f;
            bool eligible = distance < Tuning.FireRange && distance > 35 && Vector3.Dot(Forward, facing) > .83f;
            UpdateTargeting(dt, player, eligible);
            if (!eligible || !CanFire) BurstRemaining = 0;
            if (eligible && cooldown <= 0 && CanFire && BurstRemaining == 0)
            {
                BurstRemaining = Tuning.BurstCount; burstTimer = 0;
                cooldown = Tuning.FireInterval * (1.4f - .4f * TargetProgress) + Id * .17f;
            }
            burstTimer -= dt;
            if (BurstRemaining <= 0 || burstTimer > 0) return null;
            Vector3 origin = Position + Forward * 4;
            var shot = new EnemyShot { EnemyId = Id, Serial = ++ShotSerial, Origin = origin, Direction = Aim(origin, player, elapsed) };
            shotWarning = .45f; BurstRemaining--; burstTimer = Tuning.BurstSpacing; return shot;
        }
        private void UpdateTargeting(float dt, FlightState player, bool eligible)
        {
            Eligible = eligible;
            float acceleration = hasPrevious ? Vector3.Distance(player.Velocity, previousVelocity) / dt : 0;
            float angularRate = hasPrevious ? Vector3.Angle(player.Forward, previousForward) * Mathf.Deg2Rad / dt : 0;
            float motion = Mathf.Clamp01(acceleration / 42 + angularRate / .95f);
            Motion = Mathf.Lerp(Motion, motion, 1 - Mathf.Exp(-7 * dt));
            predictedVelocity = hasPrevious ? Vector3.Lerp(predictedVelocity, player.Velocity, 1 - Mathf.Exp(-2.4f * dt)) : player.Velocity;
            previousVelocity = player.Velocity; previousForward = player.Forward; hasPrevious = true;
            shotWarning = Mathf.Max(0, shotWarning - dt); holdoff = Mathf.Max(0, holdoff - dt);
            if (holdoff > 0) { TargetProgress = telegraph = 0; Eligible = false; return; }
            if (!eligible) { TargetProgress = Mathf.Max(0, TargetProgress - dt * Tuning.TrackingLose); telegraph = 0; return; }
            float gain = (1 - Motion) / Tuning.TrackingAcquire - Motion * Tuning.TrackingLose;
            TargetProgress = Mathf.Clamp01(TargetProgress + gain * dt);
            // Moving targets are still attacked; unsettled prediction increases dispersion rather than granting immunity.
            telegraph += dt;
        }
        public Vector3 Aim(Vector3 origin, FlightState player, float elapsed)
        {
            Vector3 delta = player.Position - origin;
            float speed = Tuning.ProjectileSpeed;
            float a = predictedVelocity.sqrMagnitude - speed * speed, b = 2 * Vector3.Dot(delta, predictedVelocity), c = delta.sqrMagnitude;
            float discriminant = b * b - 4 * a * c, time = delta.magnitude / speed;
            if (Mathf.Abs(a) > .00000001f && discriminant >= 0)
            {
                float root = Mathf.Sqrt(discriminant), first = (-b - root) / (2 * a), second = (-b + root) / (2 * a);
                if (first > 0 && second > 0) time = Mathf.Min(first, second);
                else if (first > 0) time = first;
                else if (second > 0) time = second;
            }
            Vector3 target = player.Position + predictedVelocity * Mathf.Min(time, Tuning.ProjectileLife);
            float spread = .6f + (1 - TargetProgress) * 14;
            target += player.Up * Mathf.Sin(elapsed * 3.7f + Id * 2.3f) * spread;
            target += Vector3.Cross(player.Up, player.Forward).normalized * Mathf.Cos(elapsed * 2.9f + Id * 1.7f) * spread;
            Vector3 direction = target - origin;
            return direction.sqrMagnitude > .000001f ? direction.normalized : Forward;
        }
    }
}
