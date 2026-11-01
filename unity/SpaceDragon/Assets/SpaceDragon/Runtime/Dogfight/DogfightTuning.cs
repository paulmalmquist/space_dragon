using UnityEngine;

namespace SpaceDragon.Dogfight
{
    /// <summary>Encounter tuning only. No campaign rewards or saves are stored here.</summary>
    [CreateAssetMenu(menuName = "Space Dragon/Dogfight/Tactical tuning", fileName = "DogfightTuning")]
    public sealed class DogfightTuning : ScriptableObject
    {
        [Header("Combat upgrades — lab switches, all optional")]
        public bool EnablePerfectRoll = true, EnableEnemyRoles = true, EnableClawFinisher = true,
            EnableWingman = true, EnableRockWeapons = true, EnableMultiTargetBreath = true,
            EnableRepairCode = true, EnableComeback = true;
        [HideInInspector] public int CombatSchema;

        [Header("Perfect roll")]
        public float PerfectRollWindow = .4f, PerfectRollRadius = 3.3f,
            PerfectRollSlowSeconds = .35f, PerfectRollTimeScale = .4f;
        public float PerfectRollVisualSeconds = .35f, PerfectRollOpacity = .32f, PerfectRollFlareSpeed = 18f;
        public float PerfectRollOutlineWidth = .045f, PerfectRollFlareWidth = .035f, PerfectRollFlareLength = .65f;
        [Header("Enemy roles — placeholder rules")]
        public float FighterHealth = 216f, RacerHealth = 60f, GrapplerHealth = 180f, GunshipHealth = 300f;
        public float GunshipShieldHalfAngleDegrees = 70f, GrapplerLatchRange = 18f,
            GrapplerSpeedMultiplier = .7f, GrapplerStunSeconds = 2f;
        public float RacerStrafeWidth = 150f, RacerStrafeSpeed = 2.4f, RacerAssistMultiplier = .15f,
            RacerStationSpeed = 110f, GrapplerCloseSpeed = 95f, GunshipStationSpeed = 8f;
        public float WaveDelaySeconds = 2f;
        [Header("Claw finisher")]
        public float FinisherHealthFraction = .25f, FinisherRange = 30f, FinisherConeDegrees = 40f,
            FinisherFreezeSeconds = .15f, FinisherEvasionReward = 15f;
        [Header("Wingman")]
        public float WingmanRunSeconds = 4f, WingmanCooldownSeconds = 20f, WingmanDamagePerSecond = 18f,
            WingmanWarningRise = .22f, WingmanWarningCooldown = 8f, WingmanFormationDistance = 22f;
        public float WingmanShieldedHullFloor = 1f;
        [Header("Scenery weapons")]
        public int GasPocketCount = 4;
        public float RockShotNearRange = 160f, RockShotEvasionReward = 15f,
            GasEnemyRadius = 120f, GasPlayerRadius = 40f, GasEnemyDamage = 240f, GasPlayerDamage = 30f;
        [Header("Word and repair upgrades")]
        public int BreathTargetCapacity = 3, RepairCodeLength = 3, RepairSumMaximum = 5;
        public float RepairBonusRemainingMultiplier = .5f;
        [Header("One comeback per encounter")]
        public float ComebackSeconds = 5f, ComebackHull = 30f, ComebackProtectionSeconds = 2f;

        /// <summary>Runs once for old serialized assets; subsequent setup preserves owner overrides.</summary>
        public bool EnsureCombatDefaults()
        {
            if (CombatSchema >= 1) return false;
            EnablePerfectRoll = EnableEnemyRoles = EnableClawFinisher = EnableWingman =
                EnableRockWeapons = EnableMultiTargetBreath = EnableRepairCode = EnableComeback = true;
            CombatSchema = 1;
            return true;
        }

        [Header("Systems and localized damage")]
        [Min(1)] public float MaxSystemHealth = 100f;
        [Range(0, 1)] public float LocalizedHullShare = .35f;
        [Range(.1f, 1)] public float MinimumBoostMultiplier = .65f;
        [Min(0)] public float CautionHealth = 65f;
        [Min(0)] public float CriticalHealth = 30f;
        [Min(0)] public float HullImminentHealth = 15f;

        [Header("Limited field repairs")]
        [Min(0)] public int MaximumRepairs = 3;
        [Min(0)] public int StartingSalvage = 1;
        [Min(1)] public int SalvageCapacity = 3;
        [Min(.01f)] public float RepairSeconds = 4f;
        [Min(0)] public float RepairAmount = 35f;
        [Min(.01f)] public float RepairInterruptDamage = 12f;

        [Header("Missile charges and tracking")]
        [Min(1)] public int MaximumMissileCharges = 2;
        [Min(.01f)] public float RechargeSecondsHealthy = 15f;
        [Min(.01f)] public float RechargeSecondsDamaged = 30f;
        [Min(.01f)] public float AcquireSecondsHealthy = 1.5f;
        [Min(.01f)] public float AcquireSecondsDamaged = 2.1f;
        [Min(0)] public float LockGraceSeconds = .2f;
        [Min(1)] public float LockRange = 850f;
        [Range(1, 90)] public float LockConeDegrees = 14f;

        [Header("Limited-turn missile motion")]
        [Min(1)] public float MissileSpeed = 220f;
        [Min(0)] public float MissileTurnDegreesPerSecond = 55f;
        [Min(.01f)] public float MissileLifetimeSeconds = 8f;
        [Min(0)] public float MissileDamage = 65f;
        [Min(0)] public float MissileTargetLeadSeconds = .25f;

        [Header("Recoverable salvage")]
        [Min(1)] public int MaximumActiveSalvage = 6;
        [Min(0)] public float SalvagePickupRadius = 18f;
        [Range(0, 1)] public float SalvageVelocityInheritance = .3f;
        [Min(0)] public float SalvageDrag = 1.1f;
        [Min(0)] public float SalvageDriftSpeed = 2f;
    }
}
