using System;
using UnityEngine;

namespace SpaceDragon.Dogfight
{
    public enum EnemyRole { Fighter, Racer, Grappler, Gunship }
    public enum WeaponKind { Primary, Missile, Breath, Wingman, Environment, Finisher }

    public readonly struct EnemyDamageResult
    {
        public readonly float AppliedDamage;
        public readonly bool Blocked, ShieldBroken, DisabledNow;
        public EnemyDamageResult(float damage, bool blocked = false, bool shieldBroken = false, bool disabledNow = false)
        { AppliedDamage = damage; Blocked = blocked; ShieldBroken = shieldBroken; DisabledNow = disabledNow; }
    }

    /// <summary>Encounter-only health, directional shield and grappler attachment rules.
    /// No movement, scene references, audio, rewards or salvage originate here. The adapter
    /// observes DisabledNow once and uses its existing idempotent salvage transaction.</summary>
    public sealed class EnemyRoleState
    {
        readonly DogfightTuning tuning;
        double stunRemaining;
        public EnemyRole Role { get; }
        public float MaximumHealth { get; }
        public float Health { get; private set; }
        public bool Dead => Health <= 0;
        public bool ShieldIntact { get; private set; }
        public bool Latched { get; private set; }
        public float StunRemaining => (float)stunRemaining;
        public bool Stunned => stunRemaining > 0;
        public bool CanBoost => !Latched;
        public float SpeedMultiplier => Latched ? Mathf.Clamp01(tuning.GrapplerSpeedMultiplier) : 1;
        public string Hint => Role == EnemyRole.Racer ? "Fast racer. Guided missile wins." :
            Role == EnemyRole.Grappler ? "Clinging grappler. Roll it off." :
            Role == EnemyRole.Gunship ? "Front shield. Breath breaks it." : "Steady fighter. Shoot with lasers.";

        public EnemyRoleState(EnemyRole role, DogfightTuning tuning)
        {
            this.tuning = tuning ?? throw new ArgumentNullException(nameof(tuning));
            if (!Enum.IsDefined(typeof(EnemyRole), role)) throw new ArgumentOutOfRangeException(nameof(role));
            Role = tuning.EnableEnemyRoles ? role : EnemyRole.Fighter;
            MaximumHealth = Role == EnemyRole.Racer ? tuning.RacerHealth : Role == EnemyRole.Grappler ? tuning.GrapplerHealth :
                Role == EnemyRole.Gunship ? tuning.GunshipHealth : tuning.FighterHealth;
            if (!Finite(MaximumHealth) || MaximumHealth <= 0 || !Finite(tuning.GrapplerSpeedMultiplier) ||
                !Finite(tuning.GrapplerStunSeconds) || tuning.GrapplerStunSeconds < 0 ||
                !Finite(tuning.GrapplerLatchRange) || tuning.GrapplerLatchRange < 0 ||
                !Finite(tuning.WingmanShieldedHullFloor) || tuning.WingmanShieldedHullFloor <= 0 ||
                !Finite(tuning.GunshipShieldHalfAngleDegrees))
                throw new ArgumentException("Enemy role tuning requires finite positive health and valid latch/shield values.", nameof(tuning));
            Reset();
        }

        public void Reset()
        { Health = MaximumHealth; ShieldIntact = Role == EnemyRole.Gunship; Latched = false; stunRemaining = 0; }

        /// <summary>towardAttacker points FROM the enemy TO the attack's origin, not along
        /// projectile velocity. Invalid directions conservatively count as the shield front.</summary>
        public bool IsFrontAttack(Vector3 towardAttacker, Vector3 enemyForward)
        {
            if (!Finite(towardAttacker) || !Finite(enemyForward) || towardAttacker.sqrMagnitude < 1e-10f || enemyForward.sqrMagnitude < 1e-10f)
                return true;
            float threshold = Mathf.Cos(Mathf.Clamp(tuning.GunshipShieldHalfAngleDegrees, 0, 180) * Mathf.Deg2Rad);
            return Vector3.Dot(towardAttacker.normalized, enemyForward.normalized) + .000001f >= threshold;
        }

        public EnemyDamageResult ApplyDamage(WeaponKind weapon, float amount, Vector3 towardAttacker, Vector3 enemyForward)
            => ApplyDamage(weapon, amount, IsFrontAttack(towardAttacker, enemyForward));

        public EnemyDamageResult ApplyDamage(WeaponKind weapon, float amount, bool fromFront = true)
        {
            if ((uint)weapon > (uint)WeaponKind.Finisher) throw new ArgumentOutOfRangeException(nameof(weapon));
            if (Dead || !Finite(amount) || amount <= 0) return default;
            // The Racer's single obvious answer survives later damage/health tuning.
            if (Role == EnemyRole.Racer && weapon == WeaponKind.Missile) amount = Health;
            if (ShieldIntact)
            {
                // A first breath spends the shield, not the hull. A subsequent attack
                // can finish the heavy. This keeps the answer readable and repeatable.
                if (weapon == WeaponKind.Breath)
                { ShieldIntact = false; return new EnemyDamageResult(0, shieldBroken: true); }
                if (weapon == WeaponKind.Finisher || (fromFront &&
                    (weapon == WeaponKind.Primary || weapon == WeaponKind.Missile || weapon == WeaponKind.Wingman)))
                    return new EnemyDamageResult(0, blocked: true);
                // A strafing ally may chip the unprotected rear but cannot finish a
                // shielded Gunship. Area damage bypasses a directional front shield.
                if (weapon == WeaponKind.Wingman)
                    amount = Mathf.Min(amount, Mathf.Max(0, Health - Mathf.Min(MaximumHealth, tuning.WingmanShieldedHullFloor)));
            }
            float applied = Mathf.Min(Health, amount);
            Health -= applied;
            if (Dead) { Latched = false; stunRemaining = 0; }
            return new EnemyDamageResult(applied, blocked: applied <= 0, disabledNow: Dead);
        }

        public bool TryLatch(float distance)
        {
            if (Role != EnemyRole.Grappler || Dead || Latched || Stunned || !Finite(distance) || distance < 0 || distance > tuning.GrapplerLatchRange)
                return false;
            Latched = true; return true;
        }

        /// <summary>Call only for an accepted player roll; rejected rolls grant no escape.</summary>
        public bool ShakeOff()
        {
            if (!Latched || Dead) return false;
            Latched = false; stunRemaining = tuning.GrapplerStunSeconds; return true;
        }

        public void Tick(float dt)
        {
            if (!Finite(dt) || dt <= 0 || Dead) return;
            stunRemaining = Math.Max(0, stunRemaining - dt);
            if (stunRemaining < 1e-7) stunRemaining = 0;
        }
        static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
        static bool Finite(Vector3 value) => Finite(value.x) && Finite(value.y) && Finite(value.z);
    }

    [Serializable]
    public sealed class EnemyWaveDefinition
    {
        public EnemyRole[] Roles;
        public EnemyWaveDefinition(params EnemyRole[] roles) { Roles = (EnemyRole[])roles.Clone(); }
    }

    /// <summary>Data, not a spawn loop. Each call returns independent editable wave data.
    /// The adapter gives every spawned enemy a unique encounter ID across all waves.</summary>
    public static class DogfightWaveList
    {
        public static EnemyWaveDefinition[] CreateDefault() => new[]
        {
            new EnemyWaveDefinition(EnemyRole.Fighter, EnemyRole.Fighter, EnemyRole.Fighter),
            new EnemyWaveDefinition(EnemyRole.Fighter, EnemyRole.Fighter, EnemyRole.Grappler),
            new EnemyWaveDefinition(EnemyRole.Fighter, EnemyRole.Racer, EnemyRole.Racer),
            new EnemyWaveDefinition(EnemyRole.Gunship, EnemyRole.Fighter, EnemyRole.Fighter)
        };
    }
}
