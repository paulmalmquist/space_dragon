using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class WingmanStateTests
    {
        DogfightTuning tuning;
        WingmanState state;
        [SetUp] public void SetUp() { tuning = ScriptableObject.CreateInstance<DogfightTuning>(); state = new WingmanState(tuning); }
        [TearDown] public void TearDown() { Object.DestroyImmediate(tuning); }

        [Test] public void ValidLockedTargetWinsOtherwiseNearestLivingTargetWithStableTie()
        {
            var candidates = new[] {
                new WingmanCandidate("dead", Vector3.zero, false),
                new WingmanCandidate("b", Vector3.right * 10),
                new WingmanCandidate("a", Vector3.left * 10),
                new WingmanCandidate("locked", Vector3.forward * 100),
                new WingmanCandidate("invalid", new Vector3(float.NaN, 0, 0))
            };
            Assert.That(WingmanState.SelectTarget("locked", candidates, Vector3.zero), Is.EqualTo("locked"));
            Assert.That(WingmanState.SelectTarget("dead", candidates, Vector3.zero), Is.EqualTo("a"));
            Assert.That(WingmanState.SelectTarget("missing", candidates, Vector3.zero), Is.EqualTo("a"));
            Assert.That(WingmanState.SelectTarget("", null, Vector3.zero), Is.Empty);
        }

        [Test] public void FourSecondRunHasBoundedDamageAndTwentySecondActivationCooldown()
        {
            Assert.That(state.TrySend("bogey"), Is.True); Assert.That(state.TrySend("other"), Is.False);
            float damage = 0;
            for (int i = 0; i < 40; i++) damage += state.Tick(.1f)?.Damage ?? 0;
            Assert.That(damage, Is.EqualTo(tuning.WingmanDamagePerSecond * tuning.WingmanRunSeconds).Within(.001));
            Assert.That(state.Running, Is.False); Assert.That(state.TargetId, Is.Empty);
            Assert.That(state.CooldownRemaining, Is.EqualTo(16).Within(.001));
            Assert.That(state.Tick(15.9f), Is.Null); Assert.That(state.TrySend("other"), Is.False);
            state.Tick(.1f); Assert.That(state.TrySend("other"), Is.True); Assert.That(state.RunsSent, Is.EqualTo(2));
        }

        [Test] public void DamageIsIndependentOfTickPartitionAndDoesNotExceedRunBoundary()
        {
            var other = new WingmanState(tuning); state.TrySend("x"); other.TrySend("x");
            float whole = state.Tick(20).Value.Damage, parts = 0;
            for (int i = 0; i < 2000; i++) parts += other.Tick(.01f)?.Damage ?? 0;
            Assert.That(parts, Is.EqualTo(whole).Within(.002)); Assert.That(state.Ready, Is.True);
            Assert.That(other.Ready, Is.True); Assert.That(state.Tick(1), Is.Null);
        }

        [Test] public void LostTargetCancelsWithoutDamageOrSilentRetargetAndKeepsCooldown()
        {
            state.TrySend("lost"); var first = state.Tick(1);
            Assert.That(first.Value.TargetId, Is.EqualTo("lost"));
            Assert.That(state.Tick(.5f, false), Is.Null); Assert.That(state.Running, Is.False);
            Assert.That(state.Tick(1, true), Is.Null); Assert.That(state.TrySend("new"), Is.False);
            Assert.That(state.CooldownRemaining, Is.EqualTo(17.5f));
        }

        [Test] public void ShieldedGunshipCannotBeFinishedByAFullWingmanRun()
        {
            var gunship = new EnemyRoleState(EnemyRole.Gunship, tuning);
            gunship.ApplyDamage(WeaponKind.Primary, gunship.MaximumHealth - 5, false);
            state.TrySend("gunship"); var hit = state.Tick(tuning.WingmanRunSeconds);
            var outcome = gunship.ApplyDamage(WeaponKind.Wingman, hit.Value.Damage, false);
            Assert.That(outcome.DisabledNow, Is.False); Assert.That(gunship.ShieldIntact, Is.True);
            Assert.That(gunship.Health, Is.EqualTo(tuning.WingmanShieldedHullFloor));
        }

        [Test] public void SharpTrackingRiseWarnsOnceAndSteadyTrackingDoesNotSpam()
        {
            Assert.That(state.ObserveTracking(0, .1f), Is.False);
            Assert.That(state.ObserveTracking(.1f, .1f), Is.False);
            Assert.That(state.ObserveTracking(.2f, .1f), Is.False);
            Assert.That(state.ObserveTracking(.3f, .1f), Is.True);
            Assert.That(state.ObserveTracking(.8f, .1f), Is.False);
            for (int i = 0; i < 100; i++) Assert.That(state.ObserveTracking(.8f, .1f), Is.False);
            state.ObserveTracking(0, .1f);
            Assert.That(state.ObserveTracking(.3f, .1f), Is.True);
        }

        [Test] public void SlowTrackingRiseNeverMeetsSharpRiseWindow()
        {
            state.ObserveTracking(0, .1f);
            for (int i = 1; i <= 50; i++) Assert.That(state.ObserveTracking(i * .01f, .1f), Is.False);
        }

        [Test] public void PauseInvalidInputFlagAndRestartCannotLeakTimerOrAttack()
        {
            Assert.That(state.TrySend(" "), Is.False); Assert.That(state.Ready, Is.True);
            state.TrySend("x");
            foreach (float dt in new[] { 0, -1, float.NaN, float.PositiveInfinity }) Assert.That(state.Tick(dt), Is.Null);
            Assert.That(state.RunRemaining, Is.EqualTo(tuning.WingmanRunSeconds));
            Assert.That(state.CooldownRemaining, Is.EqualTo(tuning.WingmanCooldownSeconds));
            state.ObserveTracking(0, .1f);
            Assert.That(state.ObserveTracking(.5f, 0), Is.False);
            Assert.That(state.ObserveTracking(float.NaN, .1f), Is.False);
            state.Reset(); Assert.That(state.Ready, Is.True); Assert.That(state.RunsSent, Is.Zero);
            Assert.That(state.TargetId, Is.Empty); Assert.That(state.WarningCooldownRemaining, Is.Zero);
            Assert.That(state.Tick(100), Is.Null);
            tuning.EnableWingman = false; Assert.That(state.TrySend("x"), Is.False);
            Assert.That(state.ObserveTracking(1, 1), Is.False);
            tuning.EnableWingman = true; state.TrySend("x"); tuning.EnableWingman = false;
            Assert.That(state.Tick(1), Is.Null); Assert.That(state.Running, Is.False);
        }
    }
}
