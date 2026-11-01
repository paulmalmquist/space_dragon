using System;
using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class EnemyRoleStateTests
    {
        DogfightTuning tuning;
        [SetUp] public void SetUp() { tuning = ScriptableObject.CreateInstance<DogfightTuning>(); }
        [TearDown] public void TearDown() { UnityEngine.Object.DestroyImmediate(tuning); }
        EnemyRoleState Enemy(EnemyRole role) => new EnemyRoleState(role, tuning);

        [Test] public void FighterRetains216HealthAndOrdinaryDamage()
        {
            var enemy = Enemy(EnemyRole.Fighter);
            Assert.That(enemy.MaximumHealth, Is.EqualTo(216));
            Assert.That(enemy.ApplyDamage(WeaponKind.Primary, 8).AppliedDamage, Is.EqualTo(8));
            Assert.That(enemy.Health, Is.EqualTo(208)); Assert.That(enemy.ShieldIntact, Is.False);
            Assert.That(enemy.TryLatch(0), Is.False); Assert.That(enemy.SpeedMultiplier, Is.EqualTo(1));
        }

        [TestCase(.001f)] [TestCase(65f)] [TestCase(120f)]
        public void RacerIsDestroyedByOneGuidedMissileRegardlessOfDamageTuning(float missileDamage)
        {
            var enemy = Enemy(EnemyRole.Racer);
            Assert.That(enemy.ApplyDamage(WeaponKind.Missile, missileDamage).DisabledNow, Is.True);
        }

        [TestCase(WeaponKind.Primary)] [TestCase(WeaponKind.Missile)] [TestCase(WeaponKind.Wingman)]
        public void GunshipFrontBlocksOrdinaryWeaponsButRearAllowsDamage(WeaponKind weapon)
        {
            var enemy = Enemy(EnemyRole.Gunship);
            var blocked = enemy.ApplyDamage(weapon, 10, Vector3.forward, Vector3.forward);
            Assert.That(blocked.Blocked, Is.True); Assert.That(blocked.AppliedDamage, Is.Zero);
            Assert.That(enemy.Health, Is.EqualTo(enemy.MaximumHealth));
            Assert.That(enemy.ApplyDamage(weapon, 10, Vector3.back, Vector3.forward).AppliedDamage, Is.EqualTo(10));
        }

        [Test] public void ShieldUsesFullLocal3dForwardAndConfiguredArc()
        {
            var enemy = Enemy(EnemyRole.Gunship);
            Assert.That(enemy.IsFrontAttack(Vector3.up, Vector3.up), Is.True);
            Assert.That(enemy.IsFrontAttack(Vector3.down, Vector3.up), Is.False);
            Assert.That(enemy.IsFrontAttack(Quaternion.AngleAxis(tuning.GunshipShieldHalfAngleDegrees, Vector3.up) * Vector3.forward, Vector3.forward), Is.True);
            Assert.That(enemy.IsFrontAttack(Quaternion.AngleAxis(tuning.GunshipShieldHalfAngleDegrees + 1, Vector3.up) * Vector3.forward, Vector3.forward), Is.False);
            Assert.That(enemy.IsFrontAttack(Vector3.zero, Vector3.forward), Is.True);
            Assert.That(enemy.IsFrontAttack(new Vector3(float.NaN, 0, 0), Vector3.forward), Is.True);
        }

        [Test] public void FirstBreathBreaksShieldAndSecondDisablesExactlyOnce()
        {
            var enemy = Enemy(EnemyRole.Gunship);
            var first = enemy.ApplyDamage(WeaponKind.Breath, 999);
            Assert.That(first.ShieldBroken, Is.True); Assert.That(first.DisabledNow, Is.False);
            Assert.That(first.AppliedDamage, Is.Zero); Assert.That(enemy.Health, Is.EqualTo(enemy.MaximumHealth));
            Assert.That(enemy.ApplyDamage(WeaponKind.Breath, 999).DisabledNow, Is.True);
            foreach (WeaponKind weapon in Enum.GetValues(typeof(WeaponKind)))
            {
                var repeated = enemy.ApplyDamage(weapon, 999);
                Assert.That(repeated.DisabledNow, Is.False); Assert.That(repeated.AppliedDamage, Is.Zero);
                Assert.That(repeated.ShieldBroken, Is.False);
            }
        }

        [Test] public void WingmanCannotFinishShieldedGunshipAndFinisherRequiresBrokenShield()
        {
            var enemy = Enemy(EnemyRole.Gunship);
            enemy.ApplyDamage(WeaponKind.Wingman, 999, false);
            Assert.That(enemy.Health, Is.EqualTo(1)); Assert.That(enemy.Dead, Is.False);
            Assert.That(enemy.ApplyDamage(WeaponKind.Wingman, 999, false).DisabledNow, Is.False);
            Assert.That(enemy.ApplyDamage(WeaponKind.Finisher, 999, false).Blocked, Is.True);
            enemy.ApplyDamage(WeaponKind.Breath, 999);
            Assert.That(enemy.ApplyDamage(WeaponKind.Finisher, 999).DisabledNow, Is.True);
        }

        [Test] public void AreaDamageCanBypassDirectionalShieldAndDisableOnce()
        {
            var enemy = Enemy(EnemyRole.Gunship);
            Assert.That(enemy.ApplyDamage(WeaponKind.Environment, 999).DisabledNow, Is.True);
            Assert.That(enemy.ApplyDamage(WeaponKind.Environment, 999).DisabledNow, Is.False);
        }

        [Test] public void GrapplerLatchDebuffAndAcceptedRollStunResetSafely()
        {
            var enemy = Enemy(EnemyRole.Grappler);
            Assert.That(enemy.TryLatch(tuning.GrapplerLatchRange + 1), Is.False);
            Assert.That(enemy.TryLatch(tuning.GrapplerLatchRange), Is.True);
            Assert.That(enemy.TryLatch(0), Is.False); Assert.That(enemy.CanBoost, Is.False);
            Assert.That(enemy.SpeedMultiplier, Is.EqualTo(.7f));
            Assert.That(enemy.ShakeOff(), Is.True); Assert.That(enemy.ShakeOff(), Is.False);
            Assert.That(enemy.CanBoost, Is.True); Assert.That(enemy.SpeedMultiplier, Is.EqualTo(1));
            Assert.That(enemy.TryLatch(0), Is.False);
            enemy.Tick(tuning.GrapplerStunSeconds - .01f); Assert.That(enemy.TryLatch(0), Is.False);
            enemy.Tick(.01f); Assert.That(enemy.TryLatch(0), Is.True);
            enemy.Reset(); Assert.That(enemy.Latched, Is.False); Assert.That(enemy.StunRemaining, Is.Zero);
            Assert.That(enemy.CanBoost, Is.True); Assert.That(enemy.Health, Is.EqualTo(enemy.MaximumHealth));
        }

        [Test] public void DisabledGrapplerCannotKeepItsDebuffOrRelatch()
        {
            var enemy = Enemy(EnemyRole.Grappler); enemy.TryLatch(0);
            enemy.ApplyDamage(WeaponKind.Primary, 999);
            Assert.That(enemy.Latched, Is.False); Assert.That(enemy.CanBoost, Is.True);
            Assert.That(enemy.TryLatch(0), Is.False); Assert.That(enemy.ShakeOff(), Is.False);
        }

        [Test] public void PauseAndInvalidInputsCannotSpendHealthShieldOrStun()
        {
            var gunship = Enemy(EnemyRole.Gunship);
            foreach (float amount in new[] { 0, -1, float.NaN, float.PositiveInfinity })
                Assert.That(gunship.ApplyDamage(WeaponKind.Breath, amount).ShieldBroken, Is.False);
            var grappler = Enemy(EnemyRole.Grappler); grappler.TryLatch(0); grappler.ShakeOff();
            foreach (float dt in new[] { 0, -1, float.NaN, float.PositiveInfinity }) grappler.Tick(dt);
            Assert.That(grappler.StunRemaining, Is.EqualTo(tuning.GrapplerStunSeconds));
            grappler.Reset(); Assert.That(grappler.TryLatch(float.NaN), Is.False);
            Assert.That(grappler.TryLatch(-1), Is.False);
            gunship.ApplyDamage(WeaponKind.Breath, 999); gunship.ApplyDamage(WeaponKind.Primary, 999); gunship.Reset();
            Assert.That(gunship.ShieldIntact, Is.True); Assert.That(gunship.Health, Is.EqualTo(gunship.MaximumHealth));
        }

        [Test] public void RoleFlagOffIsLegacyFighterAndWaveDataIsIndependent()
        {
            tuning.EnableEnemyRoles = false;
            foreach (EnemyRole role in Enum.GetValues(typeof(EnemyRole)))
            {
                var enemy = Enemy(role);
                Assert.That(enemy.Role, Is.EqualTo(EnemyRole.Fighter)); Assert.That(enemy.MaximumHealth, Is.EqualTo(216));
                Assert.That(enemy.ShieldIntact, Is.False); Assert.That(enemy.TryLatch(0), Is.False);
            }
            var waves = DogfightWaveList.CreateDefault(); waves[0].Roles[0] = EnemyRole.Gunship;
            Assert.That(DogfightWaveList.CreateDefault()[0].Roles[0], Is.EqualTo(EnemyRole.Fighter));
        }

        [Test] public void EveryRequestedWaveCanBeWonUsingRealAssistedWordCharging()
        {
            var waves = DogfightWaveList.CreateDefault();
            var expected = new[] {
                new[] { EnemyRole.Fighter, EnemyRole.Fighter, EnemyRole.Fighter },
                new[] { EnemyRole.Fighter, EnemyRole.Fighter, EnemyRole.Grappler },
                new[] { EnemyRole.Fighter, EnemyRole.Racer, EnemyRole.Racer },
                new[] { EnemyRole.Gunship, EnemyRole.Fighter, EnemyRole.Fighter }
            };
            Assert.That(waves.Length, Is.EqualTo(expected.Length));
            for (int wave = 0; wave < waves.Length; wave++)
            {
                CollectionAssert.AreEqual(expected[wave], waves[wave].Roles);
                var breath = new BreathState(seed: 41 + wave);
                int disabled = 0;
                for (int id = 0; id < waves[wave].Roles.Length; id++)
                {
                    var enemy = Enemy(waves[wave].Roles[id]);
                    for (int attack = 0; !enemy.Dead && attack < 3; attack++)
                    {
                        Assert.That(breath.Assist(), Is.True); Assert.That(breath.Assisted, Is.True);
                        var target = new[] { new BreathCandidate(id, 200, 0) };
                        for (int tick = 0; tick < 70; tick++) breath.Tick(.01f, target);
                        Assert.That(breath.RequestFire(), Is.True); Assert.That(breath.RequestFire(), Is.False);
                        int impacts = 0;
                        for (int tick = 0; tick < 180; tick++)
                        {
                            var impact = breath.Tick(.01f, target);
                            if (!impact.HasValue) continue;
                            impacts++; CollectionAssert.AreEqual(new[] { id }, impact.Value.TargetIds);
                            if (enemy.ApplyDamage(WeaponKind.Breath, 999).DisabledNow) disabled++;
                        }
                        Assert.That(impacts, Is.EqualTo(1));
                    }
                    Assert.That(enemy.Dead, Is.True, $"Wave {wave + 1}, {enemy.Role} must be winnable with F1.");
                }
                Assert.That(disabled, Is.EqualTo(waves[wave].Roles.Length));
            }
        }
    }
}
