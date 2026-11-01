using System;
using System.Collections.Generic;
using UnityEngine;

namespace SpaceDragon.Dogfight
{
    public enum DragonSystem { Hull, Propulsion, Weapons }
    public enum TargetLockState { None, Acquiring, Locked, Recharging }
    public enum TacticalWarning { None, Caution, Critical, IncomingMissile, HullImminent }

    /// <summary>The scene supplies current range, cone, living-target and unobstructed-LOS facts.</summary>
    public struct LockCandidate
    {
        public string Id;
        public bool Alive, InRange, InCone, HasLineOfSight;
        public bool IsValid => !string.IsNullOrEmpty(Id) && Alive && InRange && InCone && HasLineOfSight;
        public LockCandidate(string id, bool alive = true, bool inRange = true,
            bool inCone = true, bool hasLineOfSight = true)
        { Id = id; Alive = alive; InRange = inRange; InCone = inCone; HasLineOfSight = hasLineOfSight; }
    }

    /// <summary>
    /// Authoritative encounter state. Each frame: supply TickLock, resolve hits with ApplyDamage,
    /// then Tick. Hits must be resolved before Tick so an interrupt at the completion boundary wins.
    /// The presentation may observe counters; it must never grant repairs or missile charges itself.
    /// </summary>
    public sealed class TacticalState
    {
        readonly DogfightTuning tuning;
        readonly float[] health = new float[3];
        readonly int[] patches = new int[3];
        double repairElapsed, rechargeProgress, lockProgress, lockLossSeconds;
        string trackingId = "";
        LockCandidate candidate;

        public TacticalState(DogfightTuning tuning)
        { this.tuning = tuning ?? throw new ArgumentNullException(nameof(tuning)); Reset(); }

        public float Hull => health[0];
        public float Propulsion => health[1];
        public float Weapons => health[2];
        public bool IsDestroyed => Hull <= 0;
        public bool IsRepairing { get; private set; }
        public DragonSystem RepairSystem { get; private set; }
        public float RepairProgress => IsRepairing ? Mathf.Clamp01((float)(repairElapsed / RepairDuration)) : 0;
        public int Salvage { get; private set; }
        public int RepairsRemaining { get; private set; }
        public int RepairsCompleted { get; private set; }
        public int RepairsInterrupted { get; private set; }
        public int MissileCharges { get; private set; }
        public int MissilesLaunched { get; private set; }
        public int LocksConfirmed { get; private set; }
        public bool CanBoost => !IsDestroyed && !IsRepairing;
        public bool CanFireMissiles => !IsDestroyed && !IsRepairing && MissileCharges > 0;
        public bool IncomingLockedMissile { get; set; }
        public string LastNotice { get; private set; } = "";
        public float BoostMultiplier => Mathf.Lerp(Mathf.Clamp01(tuning.MinimumBoostMultiplier), 1, Propulsion / MaximumHealth);
        public float RechargeSeconds => Mathf.Max(.01f, Mathf.Lerp(tuning.RechargeSecondsDamaged, tuning.RechargeSecondsHealthy, Weapons / MaximumHealth));
        public float AcquireSeconds => Mathf.Max(.01f, Mathf.Lerp(tuning.AcquireSecondsDamaged, tuning.AcquireSecondsHealthy, Weapons / MaximumHealth));
        public float RechargeProgress => (float)rechargeProgress;
        public float RechargeSecondsRemaining => MissileCharges >= ChargeCapacity ? 0 : (1 - RechargeProgress) * RechargeSeconds;
        public float LockProgress => (float)lockProgress;
        public string TrackingTargetId => trackingId;
        public string LockedTargetId => lockProgress >= 1 ? trackingId : "";
        public bool HasConfirmedLock => !IsDestroyed && lockProgress >= 1 && !string.IsNullOrEmpty(trackingId);
        public TargetLockState LockState => IsDestroyed ? TargetLockState.None : MissileCharges == 0 ? TargetLockState.Recharging :
            HasConfirmedLock ? TargetLockState.Locked : string.IsNullOrEmpty(trackingId) ? TargetLockState.None : TargetLockState.Acquiring;
        public TacticalWarning HighestWarning => Hull <= tuning.HullImminentHealth ? TacticalWarning.HullImminent :
            IncomingLockedMissile ? TacticalWarning.IncomingMissile :
            Mathf.Min(Hull, Propulsion, Weapons) <= tuning.CriticalHealth ? TacticalWarning.Critical :
            Mathf.Min(Hull, Propulsion, Weapons) <= tuning.CautionHealth ? TacticalWarning.Caution : TacticalWarning.None;

        float MaximumHealth => Mathf.Max(1, tuning.MaxSystemHealth);
        float RepairDuration => Mathf.Max(.01f, tuning.RepairSeconds);
        int ChargeCapacity => Mathf.Max(1, tuning.MaximumMissileCharges);
        public float GetHealth(DragonSystem system) => health[SystemIndex(system)];
        public int PatchCount(DragonSystem system) => patches[SystemIndex(system)];

        public void Reset()
        {
            for (int i = 0; i < health.Length; i++) { health[i] = MaximumHealth; patches[i] = 0; }
            Salvage = Mathf.Clamp(tuning.StartingSalvage, 0, Mathf.Max(1, tuning.SalvageCapacity));
            RepairsRemaining = Mathf.Max(0, tuning.MaximumRepairs);
            RepairsCompleted = RepairsInterrupted = MissilesLaunched = LocksConfirmed = 0;
            MissileCharges = ChargeCapacity;
            IsRepairing = IncomingLockedMissile = false;
            RepairSystem = DragonSystem.Hull;
            repairElapsed = rechargeProgress = 0;
            candidate = default;
            ClearLock();
            LastNotice = "";
        }

        public void ApplyDamage(DragonSystem system, float amount)
        {
            int index = SystemIndex(system);
            if (IsDestroyed || !Finite(amount) || amount <= 0) return;
            if (IsRepairing && amount >= Mathf.Max(.01f, tuning.RepairInterruptDamage))
            { CancelRepair(); RepairsInterrupted++; LastNotice = "Repair interrupted — resources retained"; }
            health[index] = Mathf.Max(0, health[index] - amount);
            if (system != DragonSystem.Hull)
                health[0] = Mathf.Max(0, health[0] - amount * Mathf.Clamp01(tuning.LocalizedHullShare));
            if (IsDestroyed) { CancelRepair(); ClearLock(); LastNotice = "Dragon disabled"; }
        }

        public bool TryStartRepair(DragonSystem system)
        {
            int index = SystemIndex(system);
            if (IsDestroyed) return Fail("Dragon disabled");
            if (IsRepairing) return Fail("Repair already in progress");
            if (RepairsRemaining == 0) return Fail("No field repairs remaining");
            if (Salvage == 0) return Fail("Salvage required");
            if (health[index] >= MaximumHealth) return Fail("System already intact");
            IsRepairing = true; RepairSystem = system; repairElapsed = 0; LastNotice = "";
            return true;
        }

        public void CancelRepair() { IsRepairing = false; repairElapsed = 0; }
        public bool PickupSalvage() => AddSalvage();
        public bool AddSalvage(int amount = 1)
        {
            if (IsDestroyed) return Fail("Dragon disabled");
            if (amount <= 0) return false;
            int capacity = Mathf.Max(1, tuning.SalvageCapacity);
            if (Salvage >= capacity) return Fail("Salvage full");
            Salvage += Math.Min(amount, capacity - Salvage);
            LastNotice = "Salvage recovered";
            return true;
        }

        /// <summary>Observation for the next Tick; invalid observations preserve tracking only for the grace interval.</summary>
        public void TickLock(LockCandidate observation) { candidate = observation; }

        public bool TryLaunch(bool validConfirmedTarget)
        {
            if (!validConfirmedTarget || !candidate.IsValid || candidate.Id != trackingId || !HasConfirmedLock)
                return Fail("Confirm a clear target lock");
            if (!CanFireMissiles) return Fail(IsRepairing ? "Missiles unavailable during repair" : "Missiles recharging");
            MissileCharges--; MissilesLaunched++; LastNotice = "";
            return true;
        }

        public void Tick(float dt)
        {
            if (!Finite(dt) || dt <= 0 || IsDestroyed) return;
            double remaining = dt;
            while (remaining > 1e-8)
            {
                double segment = IsRepairing ? Math.Min(remaining, Math.Max(0, RepairDuration - repairElapsed)) : remaining;
                AdvanceTimers((float)segment);
                remaining -= segment;
                if (IsRepairing)
                {
                    repairElapsed += segment;
                    if (repairElapsed + 1e-7 >= RepairDuration)
                    {
                        int index = SystemIndex(RepairSystem);
                        health[index] = Mathf.Min(MaximumHealth, health[index] + Mathf.Max(0, tuning.RepairAmount));
                        Salvage--; RepairsRemaining--; RepairsCompleted++; patches[index]++;
                        CancelRepair(); LastNotice = "Field repair complete";
                    }
                }
            }
        }

        void AdvanceTimers(float dt)
        {
            if (MissileCharges < ChargeCapacity)
            {
                rechargeProgress += dt / (double)RechargeSeconds;
                while (rechargeProgress + 1e-7 >= 1 && MissileCharges < ChargeCapacity)
                { MissileCharges++; rechargeProgress = Math.Max(0, rechargeProgress - 1); }
                if (MissileCharges == ChargeCapacity) rechargeProgress = 0;
            }
            UpdateLock(dt);
        }

        void UpdateLock(float dt)
        {
            if (!candidate.IsValid)
            {
                lockLossSeconds += dt;
                if (lockLossSeconds > Mathf.Max(0, tuning.LockGraceSeconds) + 1e-7) ClearLock();
                return;
            }
            if (candidate.Id != trackingId) { ClearLock(); trackingId = candidate.Id; }
            lockLossSeconds = 0;
            bool wasConfirmed = lockProgress >= 1;
            lockProgress = Math.Min(1, lockProgress + dt / (double)AcquireSeconds);
            if (lockProgress >= 1 - 1e-7) lockProgress = 1;
            if (!wasConfirmed && lockProgress == 1) LocksConfirmed++;
        }

        void ClearLock() { trackingId = ""; lockProgress = lockLossSeconds = 0; }
        bool Fail(string notice) { LastNotice = notice; return false; }
        static int SystemIndex(DragonSystem system)
        {
            int index = (int)system;
            if (index < 0 || index > 2) throw new ArgumentOutOfRangeException(nameof(system));
            return index;
        }
        internal static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
        internal static bool Finite(Vector3 v) => Finite(v.x) && Finite(v.y) && Finite(v.z);
    }

    public sealed class SalvagePiece
    {
        public string Id { get; }
        public Vector3 Position { get; internal set; }
        public Vector3 Velocity { get; internal set; }
        public float Age { get; internal set; }
        internal Vector3 Drift;
        internal SalvagePiece(string id, Vector3 position, Vector3 velocity, float driftSpeed)
        { Id = id; Position = position; Velocity = velocity; Drift = velocity.normalized * driftSpeed; }
    }

    /// <summary>Collectibles are independent of dangerous debris. Reset only when the encounter restarts.</summary>
    public sealed class SalvageField
    {
        readonly DogfightTuning tuning;
        readonly List<SalvagePiece> items = new List<SalvagePiece>();
        readonly HashSet<string> droppedEnemies = new HashSet<string>(StringComparer.Ordinal);
        public IReadOnlyList<SalvagePiece> Items { get; }
        public SalvageField(DogfightTuning tuning)
        { this.tuning = tuning ?? throw new ArgumentNullException(nameof(tuning)); Items = items.AsReadOnly(); }
        public void Reset() { items.Clear(); droppedEnemies.Clear(); }

        public SalvagePiece Drop(string enemyId, Vector3 position, Vector3 wreckVelocity)
        {
            if (string.IsNullOrEmpty(enemyId) || !TacticalState.Finite(position) || !TacticalState.Finite(wreckVelocity) || !droppedEnemies.Add(enemyId)) return null;
            while (items.Count >= Mathf.Max(1, tuning.MaximumActiveSalvage)) items.RemoveAt(0);
            var piece = new SalvagePiece(enemyId, position, wreckVelocity * Mathf.Clamp01(tuning.SalvageVelocityInheritance), Mathf.Max(0, tuning.SalvageDriftSpeed));
            items.Add(piece);
            return piece;
        }

        public void Tick(float dt)
        {
            if (!TacticalState.Finite(dt) || dt <= 0) return;
            float drag = Mathf.Max(0, tuning.SalvageDrag);
            float decay = Mathf.Exp(-drag * dt);
            foreach (var piece in items)
            {
                Vector3 relative = piece.Velocity - piece.Drift;
                piece.Position += piece.Drift * dt + relative * (drag > .00001f ? (1 - decay) / drag : dt);
                piece.Velocity = piece.Drift + relative * decay;
                piece.Age += dt;
            }
        }

        public bool TryPickup(string id, TacticalState state)
        {
            if (state == null) throw new ArgumentNullException(nameof(state));
            int index = items.FindIndex(piece => piece.Id == id);
            if (index < 0 || !state.PickupSalvage()) return false;
            items.RemoveAt(index);
            return true;
        }

        public int PickupWithin(Vector3 playerPosition, TacticalState state)
        {
            if (!TacticalState.Finite(playerPosition)) return 0;
            int collected = 0;
            float radius = Mathf.Max(0, tuning.SalvagePickupRadius);
            for (int i = 0; i < items.Count;)
            {
                if ((items[i].Position - playerPosition).sqrMagnitude <= radius * radius && TryPickup(items[i].Id, state)) collected++;
                else i++;
            }
            return collected;
        }
    }
}
