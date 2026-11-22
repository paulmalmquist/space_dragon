using System;
using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class HitConfirmStateTests
    {
        DogfightTuning tuning;
        HitConfirmState marker;
        [SetUp] public void SetUp() { tuning = ScriptableObject.CreateInstance<DogfightTuning>(); marker = new HitConfirmState(tuning); }
        [TearDown] public void TearDown() { UnityEngine.Object.DestroyImmediate(tuning); }

        [Test] public void NothingShowsUntilAShotIsReported()
        {
            marker.Tick(1);
            Assert.That(marker.Visible, Is.False); Assert.That(marker.Kind, Is.EqualTo(HitConfirmKind.None));
            Assert.That(marker.Progress, Is.Zero); Assert.That(marker.Serial, Is.Zero);
        }

        [Test] public void HitShowsBrieflyThenClearsItself()
        {
            Assert.That(marker.Register(HitConfirmKind.Hit), Is.True);
            Assert.That(marker.Visible, Is.True); Assert.That(marker.Progress, Is.Zero);
            marker.Tick(tuning.HitConfirmSeconds * .5f);
            Assert.That(marker.Kind, Is.EqualTo(HitConfirmKind.Hit)); Assert.That(marker.Progress, Is.EqualTo(.5f).Within(.001f));
            marker.Tick(tuning.HitConfirmSeconds);
            Assert.That(marker.Visible, Is.False); Assert.That(marker.Remaining, Is.Zero); Assert.That(marker.Serial, Is.EqualTo(1));
        }

        [Test] public void EachKindUsesItsOwnDuration()
        {
            marker.Register(HitConfirmKind.Blocked); Assert.That(marker.Remaining, Is.EqualTo(tuning.HitConfirmBlockedSeconds));
            marker.Hide(); marker.Register(HitConfirmKind.Hit); Assert.That(marker.Remaining, Is.EqualTo(tuning.HitConfirmSeconds));
            marker.Hide(); marker.Register(HitConfirmKind.Kill); Assert.That(marker.Remaining, Is.EqualTo(tuning.HitConfirmKillSeconds));
            Assert.That(tuning.HitConfirmKillSeconds, Is.GreaterThan(tuning.HitConfirmSeconds), "A kill reads longer than an ordinary hit.");
        }

        [Test] public void StrongerReportReplacesWeakerButNeverTheReverse()
        {
            marker.Register(HitConfirmKind.Blocked);
            Assert.That(marker.Register(HitConfirmKind.Hit), Is.True); Assert.That(marker.Kind, Is.EqualTo(HitConfirmKind.Hit));
            Assert.That(marker.Register(HitConfirmKind.Kill), Is.True); Assert.That(marker.Kind, Is.EqualTo(HitConfirmKind.Kill));
            float remaining = marker.Remaining;
            Assert.That(marker.Register(HitConfirmKind.Hit), Is.False); Assert.That(marker.Register(HitConfirmKind.Blocked), Is.False);
            Assert.That(marker.Kind, Is.EqualTo(HitConfirmKind.Kill)); Assert.That(marker.Remaining, Is.EqualTo(remaining));
            Assert.That(marker.Serial, Is.EqualTo(5), "Every accepted report is counted, shown or not.");
        }

        [Test] public void RepeatedHitsRestartTheTimerSoSteadyFirePulses()
        {
            marker.Register(HitConfirmKind.Hit); marker.Tick(tuning.HitConfirmSeconds * .8f);
            Assert.That(marker.Register(HitConfirmKind.Hit), Is.True);
            Assert.That(marker.Remaining, Is.EqualTo(tuning.HitConfirmSeconds)); Assert.That(marker.Progress, Is.Zero);
        }

        [Test] public void AfterAKillMarkerEndsAnOrdinaryHitShowsAgain()
        {
            marker.Register(HitConfirmKind.Kill); marker.Tick(tuning.HitConfirmKillSeconds + .01f);
            Assert.That(marker.Visible, Is.False);
            Assert.That(marker.Register(HitConfirmKind.Hit), Is.True); Assert.That(marker.Kind, Is.EqualTo(HitConfirmKind.Hit));
        }

        [Test] public void SwitchedOffShowsAndCountsNothing()
        {
            tuning.EnableHitConfirm = false;
            Assert.That(marker.Register(HitConfirmKind.Kill), Is.False);
            Assert.That(marker.Visible, Is.False); Assert.That(marker.Serial, Is.Zero);
        }

        [Test] public void NoneAndUnknownKindsAreIgnored()
        {
            Assert.That(marker.Register(HitConfirmKind.None), Is.False);
            Assert.That(marker.Register((HitConfirmKind)42), Is.False);
            Assert.That(marker.Visible, Is.False); Assert.That(marker.Serial, Is.Zero);
        }

        [TestCase(0f)] [TestCase(-1f)] [TestCase(float.NaN)] [TestCase(float.PositiveInfinity)]
        public void FrozenOrInvalidStepKeepsTheMarker(float dt)
        {
            marker.Register(HitConfirmKind.Hit); float remaining = marker.Remaining;
            marker.Tick(dt);
            Assert.That(marker.Kind, Is.EqualTo(HitConfirmKind.Hit)); Assert.That(marker.Remaining, Is.EqualTo(remaining));
        }

        [Test] public void HideKeepsTheCountAndResetForgetsIt()
        {
            marker.Register(HitConfirmKind.Hit); marker.Register(HitConfirmKind.Kill);
            marker.Hide();
            Assert.That(marker.Visible, Is.False); Assert.That(marker.Serial, Is.EqualTo(2));
            marker.Register(HitConfirmKind.Hit); marker.Reset();
            Assert.That(marker.Visible, Is.False); Assert.That(marker.Serial, Is.Zero); Assert.That(marker.Progress, Is.Zero);
        }

        [Test] public void ZeroDurationMeansThatKindIsNeverShown()
        {
            tuning.HitConfirmBlockedSeconds = 0;
            Assert.That(marker.Register(HitConfirmKind.Blocked), Is.False); Assert.That(marker.Visible, Is.False);
            Assert.That(marker.Register(HitConfirmKind.Hit), Is.True);
        }

        [Test] public void RejectsMissingOrNonFiniteTuning()
        {
            Assert.Throws<ArgumentNullException>(() => new HitConfirmState(null));
            tuning.HitConfirmSeconds = float.NaN; Assert.Throws<ArgumentException>(() => new HitConfirmState(tuning));
            tuning.HitConfirmSeconds = .1f; tuning.HitConfirmKillSeconds = -1; Assert.Throws<ArgumentException>(() => new HitConfirmState(tuning));
        }
    }
}
