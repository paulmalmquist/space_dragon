using UnityEngine;

namespace SpaceDragon.Dogfight
{
    /// <summary>Encounter tuning only. No campaign rewards or saves are stored here.</summary>
    [CreateAssetMenu(menuName = "Space Dragon/Dogfight/Tactical tuning", fileName = "DogfightTuning")]
    public sealed class DogfightTuning : ScriptableObject
    {
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
