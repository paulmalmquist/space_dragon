using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class ClawFinisherStateTests
    {
        DogfightTuning tuning;
        ClawFinisherState state;
        [SetUp] public void SetUp() { tuning = ScriptableObject.CreateInstance<DogfightTuning>(); state = new ClawFinisherState(tuning); }
        [TearDown] public void TearDown() { Object.DestroyImmediate(tuning); }
        bool Finish(string id = "w0-e0", float health = 24, float max = 100, bool alive = true, bool shielded = false,
            bool boosting = true, bool reduced = false, float distance = 20, float angle = 0)
            => state.TryFinish(id, alive, shielded, health, max, Vector3.zero, Vector3.forward,
                Quaternion.AngleAxis(angle, Vector3.up) * Vector3.forward * distance, boosting, reduced);

        [Test] public void BoostedWoundedTargetInNoseConeFinishesOnce()
        {
            Assert.That(Finish(), Is.True); Assert.That(state.Serial, Is.EqualTo(1));
            Assert.That(state.LastTargetId, Is.EqualTo("w0-e0")); Assert.That(state.IsFrozen, Is.True);
            Assert.That(Finish(), Is.False); Assert.That(state.Serial, Is.EqualTo(1));
            state.Tick(10); Assert.That(Finish(), Is.False);
            Assert.That(Finish("w1-e0"), Is.True, "Unique IDs across waves identify different enemies.");
        }

        [Test] public void ThresholdIsStrictlyBelowQuarterHealthButGeometryIncludesBoundary()
        {
            Assert.That(Finish(health: 25), Is.False);
            Assert.That(Finish(health: 24.999f, distance: tuning.FinisherRange, angle: tuning.FinisherConeDegrees), Is.True);
        }

        [TestCase(false, false, true)] [TestCase(true, true, true)] [TestCase(true, false, false)]
        public void DeadShieldedOrNonboostingTargetsCannotFinish(bool alive, bool shield, bool boost)
        {
            Assert.That(Finish(alive: alive, shielded: shield, boosting: boost), Is.False);
            Assert.That(state.Serial, Is.Zero); Assert.That(state.IsFrozen, Is.False);
        }

        [Test] public void BehindOutsideRangeOrOutsideConeCannotFinish()
        {
            Assert.That(Finish(distance: tuning.FinisherRange + .01f), Is.False);
            Assert.That(Finish(angle: tuning.FinisherConeDegrees + .1f), Is.False);
            Assert.That(Finish(angle: 180), Is.False); Assert.That(state.Serial, Is.Zero);
        }

        [Test] public void ConeFollowsPitchAndAcceptsCoincidentClosePass()
        {
            Assert.That(state.TryFinish("pitched", true, false, 24, 100,
                Vector3.zero, Vector3.up, Vector3.up * 20, true), Is.True);
            Assert.That(state.TryFinish("wrong-axis", true, false, 24, 100,
                Vector3.zero, Vector3.up, Vector3.forward * 20, true), Is.False);
            Assert.That(Finish("overlap", distance: 0), Is.True);
        }

        [Test] public void FreezeUsesRealTimeAndPauseClearsOnlyPresentationTime()
        {
            Finish(); state.Tick(0); Assert.That(state.FreezeRemaining, Is.EqualTo(tuning.FinisherFreezeSeconds));
            state.Tick(.1f); Assert.That(state.IsFrozen, Is.True);
            state.Tick(.05f); Assert.That(state.IsFrozen, Is.False);
            Finish("other"); state.PauseClearFreeze(); Assert.That(state.IsFrozen, Is.False);
            Assert.That(Finish("other"), Is.False); Assert.That(state.Serial, Is.EqualTo(2));
        }

        [Test] public void ReducedMotionKeepsSameFinishesWithoutFreeze()
        {
            Assert.That(Finish(reduced: true), Is.True); Assert.That(state.Serial, Is.EqualTo(1));
            Assert.That(state.IsFrozen, Is.False); Assert.That(Finish(reduced: true), Is.False);
            state.Reset(); Assert.That(Finish(), Is.True); Assert.That(state.Serial, Is.EqualTo(1));
            Assert.That(state.IsFrozen, Is.True);
        }

        [Test] public void DisabledFeatureInvalidInputAndResetDoNotLeakEvents()
        {
            tuning.EnableClawFinisher = false; Assert.That(Finish(), Is.False); tuning.EnableClawFinisher = true;
            foreach (float health in new[] { 0, -1, float.NaN, float.PositiveInfinity }) Assert.That(Finish(health: health), Is.False);
            Assert.That(Finish(max: 0), Is.False); Assert.That(Finish(id: " "), Is.False);
            Assert.That(Finish(distance: float.NaN), Is.False);
            Assert.That(state.TryFinish("bad-forward", true, false, 24, 100, Vector3.zero, Vector3.zero, Vector3.forward, true), Is.False);
            Finish(); foreach (float dt in new[] { -1, float.NaN, float.PositiveInfinity }) state.Tick(dt);
            Assert.That(state.FreezeRemaining, Is.EqualTo(tuning.FinisherFreezeSeconds));
            state.Reset(); Assert.That(state.Serial, Is.Zero); Assert.That(state.LastTargetId, Is.Null);
            Assert.That(state.IsFrozen, Is.False); Assert.That(Finish(), Is.True);
        }

        [Test] public void AcceptedEventUsesExistingExactlyOnceEnemyAndSalvageRules()
        {
            var enemy = new EnemyRoleState(EnemyRole.Fighter, tuning);
            enemy.ApplyDamage(WeaponKind.Primary, 170);
            var salvage = new SalvageField(tuning);
            int disabled = 0;
            for (int trigger = 0; trigger < 5; trigger++)
            {
                if (!state.TryFinish("enemy", !enemy.Dead, enemy.ShieldIntact, enemy.Health, enemy.MaximumHealth,
                    Vector3.zero, Vector3.forward, Vector3.forward * 20, true)) continue;
                if (enemy.ApplyDamage(WeaponKind.Finisher, enemy.Health).DisabledNow)
                { disabled++; salvage.Drop("enemy", Vector3.forward * 20, Vector3.zero); }
            }
            Assert.That(disabled, Is.EqualTo(1)); Assert.That(salvage.Items.Count, Is.EqualTo(1));
        }
    }
}
