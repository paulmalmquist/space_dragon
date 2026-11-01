using NUnit.Framework;

namespace SpaceDragon.LaunchLab.Tests
{
    public sealed class LaunchSessionTests
    {
        private static void Advance(LaunchSession session, double seconds)
        {
            for (int i = 0; i < seconds * 100; i++) session.Tick(0.01);
        }

        [Test]
        public void NormalAndSkippedRunsReachOneIdenticalReadyHandoff()
        {
            foreach (bool skip in new[] { false, true })
            {
                var state = new LaunchSession();
                int run = state.Begin(LaunchMode.InEngine);
                state.MarkLaunchReady(run);
                if (skip) { state.RequestSkip(); state.RequestSkip(); } else Advance(state, 12.1);
                Assert.That(state.TryCompleteHandoff(), Is.False, "Destination readiness is independent of completion.");
                state.MarkDestinationReady(run);
                Assert.That(state.TryCompleteHandoff(), Is.True);
                Assert.That(state.TryCompleteHandoff(), Is.False);
                Assert.That(state.HandoffCount, Is.EqualTo(1));
                Assert.That(state.SequenceTime, Is.EqualTo(12));
                Assert.That(state.ControlsReady, Is.False);
                state.ObserveNeutralInput(false);
                Assert.That(state.ControlsReady, Is.False);
                state.ObserveNeutralInput(true);
                Assert.That(state.ControlsReady, Is.True);
            }
        }

        [Test]
        public void SkipDuringPreparationAndPauseWaitsForReadinessAndDeliberateResume()
        {
            var state = new LaunchSession();
            int run = state.Begin(LaunchMode.BlenderURL);
            state.SetPaused(true);
            state.RequestSkip();
            state.MarkDestinationReady(run);
            state.MarkLaunchReady(run);
            Advance(state, 60);
            Assert.That(state.Phase, Is.EqualTo(LaunchPhase.Handoff));
            Assert.That(state.TryCompleteHandoff(), Is.False);
            state.SetPaused(false);
            Assert.That(state.TryCompleteHandoff(), Is.True);
        }

        [Test]
        public void HybridRequiresFirstFrameThenUsesLiveEnding()
        {
            var state = new LaunchSession();
            int run = state.Begin(LaunchMode.BlenderURL);
            state.MarkLaunchReady(run); state.MarkDestinationReady(run); state.MarkVideoPrepared(run);
            Advance(state, 3.1);
            Assert.That(state.Phase, Is.EqualTo(LaunchPhase.PreparingVideo));
            Assert.That(state.WantsVideoPlayback, Is.True);
            state.ObserveVideoFrame(run, 0.1);
            state.ObserveVideoTime(run, 6.9);
            Assert.That(state.Phase, Is.EqualTo(LaunchPhase.PlayingVideo));
            state.CompleteVideo(run);
            Assert.That(state.SequenceTime, Is.EqualTo(10));
            Assert.That(state.TryCompleteHandoff(), Is.False);
            Advance(state, 2.1);
            Assert.That(state.TryCompleteHandoff(), Is.True);
        }

        [Test]
        public void FailedAndStalledVideosFallBackWithoutUnlockingFlight()
        {
            foreach (bool began in new[] { false, true })
            {
                var state = new LaunchSession();
                int run = state.Begin(LaunchMode.AIURL);
                state.MarkLaunchReady(run); state.MarkVideoPrepared(run);
                Advance(state, 3.1);
                if (began) state.ObserveVideoFrame(run, 1);
                Advance(state, 6.1);
                Assert.That(state.VideoFallback, Is.True);
                Assert.That(state.Phase, Is.EqualTo(LaunchPhase.Timeline));
                Assert.That(state.HandoffCount, Is.Zero);
            }
        }

        [Test]
        public void OldCallbacksAndPausedMediaCannotAdvanceANewRun()
        {
            var state = new LaunchSession();
            int old = state.Begin(LaunchMode.BlenderURL);
            int current = state.Begin(LaunchMode.AIURL);
            state.MarkLaunchReady(old); state.MarkDestinationReady(old); state.FailVideo(old, "late");
            Assert.That(state.Phase, Is.EqualTo(LaunchPhase.Preparing));
            Assert.That(state.DestinationReady, Is.False);
            Assert.That(state.VideoFallback, Is.False);
            state.MarkLaunchReady(current); state.MarkVideoPrepared(current);
            Advance(state, 3.1);
            state.SetPaused(true);
            state.ObserveVideoFrame(current, 6);
            Advance(state, 60);
            Assert.That(state.SequenceTime, Is.EqualTo(3));
            Assert.That(state.VideoFirstFrame, Is.False);
            state.SetPaused(false);
            state.ObserveVideoFrame(current, 0);
            Assert.That(state.Phase, Is.EqualTo(LaunchPhase.PlayingVideo));
            state.Exit();
            state.CompleteVideo(current);
            Assert.That(state.Phase, Is.EqualTo(LaunchPhase.Exited));
        }

        [Test]
        public void MissingDestinationHasBoundedRecoveryAndReloadIsNewSession()
        {
            var state = new LaunchSession();
            state.Begin(LaunchMode.InEngine); state.RequestSkip();
            Advance(state, 20.2);
            Assert.That(state.Phase, Is.EqualTo(LaunchPhase.Failed));
            Assert.That(state.ControlsReady, Is.False);
            var reloaded = new LaunchSession();
            Assert.That(reloaded.Phase, Is.EqualTo(LaunchPhase.Idle));
            Assert.That(reloaded.HandoffCount, Is.Zero);
        }

        [Test]
        public void EndCallbackDuringPauseWaitsAndRepeatedCompletionCannotRepeatHandoff()
        {
            var state = new LaunchSession();
            int run = state.Begin(LaunchMode.BlenderURL);
            state.MarkLaunchReady(run); state.MarkDestinationReady(run); state.MarkVideoPrepared(run);
            Advance(state, 3.1);
            state.ObserveVideoFrame(run, 2);
            state.SetPaused(true);
            state.CompleteVideo(run);
            Assert.That(state.SequenceTime, Is.EqualTo(5));
            Assert.That(state.Phase, Is.EqualTo(LaunchPhase.PlayingVideo));
            state.SetPaused(false);
            state.Tick(0.01);
            Assert.That(state.SequenceTime, Is.GreaterThanOrEqualTo(10));
            state.RequestSkip();
            Assert.That(state.TryCompleteHandoff(), Is.True);
            state.CompleteVideo(run); state.MarkVideoPrepared(run); state.RequestSkip();
            Assert.That(state.HandoffCount, Is.EqualTo(1));
            Assert.That(state.Phase, Is.EqualTo(LaunchPhase.Flight));
        }

        [Test]
        public void MediaClockAtOrBeyondEndEntersLiveEndingBeforeLateEndCallback()
        {
            foreach (double mediaEnd in new[] { 7.0, 7.2 })
            {
                var state = new LaunchSession();
                int run = state.Begin(LaunchMode.BlenderURL);
                state.MarkLaunchReady(run); state.MarkDestinationReady(run); state.MarkVideoPrepared(run);
                Advance(state, 3.1);
                state.ObserveVideoFrame(run, 0.1);
                state.ObserveVideoTime(run, 6.9);
                state.ObserveVideoTime(run, mediaEnd);
                Assert.That(state.Phase, Is.EqualTo(LaunchPhase.Timeline), "Media polling can reach the end before loopPointReached.");
                Assert.That(state.SequenceTime, Is.EqualTo(10));
                Assert.That(state.VideoFallback, Is.False);
                state.CompleteVideo(run);
                Assert.That(state.TryCompleteHandoff(), Is.False, "The protected live ending must still run.");
                Advance(state, 2.1);
                Assert.That(state.TryCompleteHandoff(), Is.True);
                state.CompleteVideo(run);
                Assert.That(state.TryCompleteHandoff(), Is.False);
                Assert.That(state.HandoffCount, Is.EqualTo(1));
            }
        }
    }
}
