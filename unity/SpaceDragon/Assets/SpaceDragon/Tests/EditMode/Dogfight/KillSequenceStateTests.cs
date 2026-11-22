using System;
using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class KillSequenceStateTests
    {
        const float Step = 1f / 60;
        DogfightTuning tuning;
        KillSequenceState kill;
        [SetUp] public void SetUp() { tuning = ScriptableObject.CreateInstance<DogfightTuning>(); kill = new KillSequenceState(tuning); }
        [TearDown] public void TearDown() { UnityEngine.Object.DestroyImmediate(tuning); }
        float Total => tuning.KillFlashSeconds + tuning.KillBreakupSeconds + tuning.KillBlastSeconds + tuning.KillEmberSeconds;

        [Test] public void IdleUntilBegunAndTickingIdleDoesNothing()
        {
            kill.Tick(1, false);
            Assert.That(kill.Active, Is.False); Assert.That(kill.Stage, Is.EqualTo(KillStage.Idle));
            Assert.That(kill.HullVisible, Is.False); Assert.That(kill.TakeBlast(), Is.False);
        }

        [Test] public void StagesRunInOrderAndTheHullShowsOnlyBeforeTheBlast()
        {
            kill.Begin(Vector3.zero, Vector3.zero, 0, false);
            Assert.That(kill.Stage, Is.EqualTo(KillStage.Flash)); Assert.That(kill.HullVisible, Is.True);
            KillStage previous = KillStage.Flash; float blastSeenAt = -1;
            for (float t = Step; kill.Active; t += Step)
            {
                kill.Tick(Step, false);
                if (!kill.Active) break;
                Assert.That((int)kill.Stage, Is.GreaterThanOrEqualTo((int)previous), "Stages never run backwards.");
                Assert.That(kill.HullVisible, Is.EqualTo(kill.Stage == KillStage.Flash || kill.Stage == KillStage.Breakup));
                if (kill.Stage == KillStage.Blast && blastSeenAt < 0) blastSeenAt = t;
                previous = kill.Stage;
            }
            Assert.That(previous, Is.EqualTo(KillStage.Embers));
            Assert.That(blastSeenAt, Is.EqualTo(tuning.KillFlashSeconds + tuning.KillBreakupSeconds).Within(Step * 1.5f));
            Assert.That(kill.Stage, Is.EqualTo(KillStage.Idle)); Assert.That(kill.HullVisible, Is.False);
        }

        [Test] public void WholeSequenceFitsInsideTheWaveDelay()
        {
            Assert.That(Total, Is.LessThan(tuning.WaveDelaySeconds),
                "The next wave replaces enemy visuals; a kill sequence must be over before then.");
        }

        [Test] public void BlastCueIsOwedExactlyOnceAndOnlyWhenTheBlastIsReached()
        {
            kill.Begin(Vector3.zero, Vector3.zero, 0, false);
            int blasts = 0; float owedAt = -1;
            for (int i = 1; i <= 400; i++) { kill.Tick(Step, false); if (kill.TakeBlast()) { blasts++; owedAt = i * Step; } }
            Assert.That(blasts, Is.EqualTo(1)); Assert.That(kill.TakeBlast(), Is.False);
            Assert.That(owedAt, Is.EqualTo(tuning.KillFlashSeconds + tuning.KillBreakupSeconds).Within(Step * 1.5f),
                "The explosion is heard when the wreck goes, not when the last shot lands.");
        }

        [TestCase(.25f)] [TestCase(.5f)] [TestCase(5f)]
        public void LongFramesStillOweTheBlastExactlyOnce(float step)
        {
            kill.Begin(Vector3.zero, Vector3.zero, 0, false);
            int blasts = 0;
            for (int i = 0; i < 40; i++) { kill.Tick(step, false); if (kill.TakeBlast()) blasts++; }
            Assert.That(blasts, Is.EqualTo(1), "A hitch that skips a stage must not drop or repeat the cue.");
            Assert.That(kill.Active, Is.False);
        }

        [Test] public void WreckDriftsAlongItsOwnVelocitySlowsAndStopsAtTheBlast()
        {
            var velocity = new Vector3(40, 0, 10);
            kill.Begin(new Vector3(5, 6, 7), velocity, 0, false);
            Vector3 atBlast = Vector3.zero; float lastStepLength = float.MaxValue; Vector3 previous = kill.Position;
            while (kill.Active && kill.HullVisible)
            {
                kill.Tick(Step, false);
                if (!kill.HullVisible) break;
                float length = Vector3.Distance(kill.Position, previous);
                Assert.That(length, Is.LessThanOrEqualTo(lastStepLength + 1e-4f), "Drag only ever slows the wreck.");
                Assert.That(Vector3.Dot((kill.Position - previous).normalized, velocity.normalized), Is.GreaterThan(.999f));
                lastStepLength = length; previous = kill.Position;
            }
            atBlast = kill.Position;
            float travelled = Vector3.Distance(atBlast, new Vector3(5, 6, 7));
            Assert.That(travelled, Is.GreaterThan(5)); Assert.That(travelled, Is.LessThan(velocity.magnitude * (tuning.KillFlashSeconds + tuning.KillBreakupSeconds) + .01f));
            for (int i = 0; i < 20 && kill.Active; i++) { kill.Tick(Step, false); if (kill.Active) Assert.That(kill.Position, Is.EqualTo(atBlast), "The blast stays where the wreck ended."); }
        }

        [Test] public void HullSwellsThenShrinksAndTumblesOnlyWhileShown()
        {
            kill.Begin(Vector3.zero, Vector3.zero, 3, false);
            float largest = 0, smallest = 10; Vector3 spinAtBlast = Vector3.zero; bool hidden = false;
            while (kill.Active)
            {
                kill.Tick(Step, false);
                if (kill.HullVisible) { largest = Mathf.Max(largest, kill.HullScale); smallest = Mathf.Min(smallest, kill.HullScale); }
                else if (kill.Active && !hidden) { hidden = true; spinAtBlast = kill.SpinEuler; }
                else if (kill.Active) Assert.That(kill.SpinEuler, Is.EqualTo(spinAtBlast), "Nothing tumbles once the hull is gone.");
            }
            Assert.That(largest, Is.EqualTo(tuning.KillHullSwell).Within(.03f));
            Assert.That(smallest, Is.EqualTo(tuning.KillHullShrink).Within(.03f));
            Assert.That(spinAtBlast.magnitude, Is.GreaterThan(30), "The wreck visibly tumbles before it goes.");
        }

        [Test] public void VariantChangesOnlyTheTumbleDirection()
        {
            var other = new KillSequenceState(tuning);
            kill.Begin(Vector3.one, Vector3.forward * 20, 0, false); other.Begin(Vector3.one, Vector3.forward * 20, 7, false);
            for (int i = 0; i < 12; i++) { kill.Tick(Step, false); other.Tick(Step, false); }
            Assert.That(other.Position, Is.EqualTo(kill.Position)); Assert.That(other.HullScale, Is.EqualTo(kill.HullScale));
            Assert.That(other.SpinEuler, Is.EqualTo(-kill.SpinEuler));
        }

        [Test] public void ShockwaveOnlyGrowsStaysWithinItsRadiusAndFadesOut()
        {
            kill.Begin(Vector3.zero, Vector3.zero, 0, false);
            float previousRadius = 0, previousOpacity = 2; bool sawRing = false;
            while (kill.Active)
            {
                kill.Tick(Step, false);
                if (!kill.Active) break;
                Assert.That(kill.RingOpacity, Is.InRange(0f, 1f)); Assert.That(kill.FlashOpacity, Is.InRange(0f, 1f));
                Assert.That(kill.RingRadius, Is.InRange(0f, tuning.KillRingRadius + .001f));
                if (kill.Stage == KillStage.Flash || kill.Stage == KillStage.Breakup) { Assert.That(kill.RingRadius, Is.Zero); continue; }
                sawRing = true;
                Assert.That(kill.RingRadius, Is.GreaterThanOrEqualTo(previousRadius));
                Assert.That(kill.RingOpacity, Is.LessThanOrEqualTo(previousOpacity));
                previousRadius = kill.RingRadius; previousOpacity = kill.RingOpacity;
            }
            Assert.That(sawRing, Is.True); Assert.That(previousRadius, Is.GreaterThan(tuning.KillRingRadius * .95f));
            Assert.That(previousOpacity, Is.LessThan(.05f)); Assert.That(kill.RingRadius, Is.Zero); Assert.That(kill.RingOpacity, Is.Zero);
        }

        [Test] public void ShardsFlyOutFromTheBlastShortenAndFade()
        {
            kill.Begin(Vector3.zero, Vector3.zero, 0, false);
            float previousDistance = 0, previousOpacity = 2, previousLength = 100; bool saw = false;
            while (kill.Active)
            {
                kill.Tick(Step, false);
                if (!kill.Active) break;
                if (kill.HullVisible) { Assert.That(kill.ShardOpacity, Is.Zero, "Nothing flies off while the hull is whole."); continue; }
                saw = true;
                Assert.That(kill.ShardDistance, Is.GreaterThanOrEqualTo(previousDistance));
                Assert.That(kill.ShardOpacity, Is.LessThanOrEqualTo(previousOpacity)); Assert.That(kill.ShardOpacity, Is.InRange(0f, 1f));
                Assert.That(kill.ShardLength, Is.LessThanOrEqualTo(previousLength)); Assert.That(kill.ShardLength, Is.GreaterThan(0));
                previousDistance = kill.ShardDistance; previousOpacity = kill.ShardOpacity; previousLength = kill.ShardLength;
            }
            Assert.That(saw, Is.True);
            Assert.That(previousDistance, Is.EqualTo(tuning.KillRingRadius * tuning.KillShardReach).Within(1f), "Shards stay inside the shockwave.");
            Assert.That(tuning.KillShardLength, Is.GreaterThanOrEqualTo(1), "Debris is sized in metres so it can be seen at combat range.");
        }

        [Test] public void ReducedMotionHidesTheHullAtOnceWithAStillRingAndNoShards()
        {
            var start = new Vector3(3, 4, 5);
            kill.Begin(start, new Vector3(80, 0, 0), 5, true);
            Assert.That(kill.HullVisible, Is.False); Assert.That(kill.Stage, Is.EqualTo(KillStage.Blast));
            Assert.That(kill.TakeBlast(), Is.True, "With reduced motion the explosion cue is immediate, as before this pass.");
            float radius = kill.RingRadius; Assert.That(radius, Is.EqualTo(tuning.KillRingRadius * .3f).Within(.001f));
            float seconds = 0;
            while (kill.Active)
            {
                kill.Tick(Step, true); seconds += Step;
                if (!kill.Active) break;
                Assert.That(kill.HullVisible, Is.False); Assert.That(kill.Position, Is.EqualTo(start), "Nothing drifts.");
                Assert.That(kill.SpinEuler, Is.EqualTo(Vector3.zero)); Assert.That(kill.HullScale, Is.EqualTo(1));
                Assert.That(kill.RingRadius, Is.EqualTo(radius), "The ring does not move.");
                Assert.That(kill.FlashOpacity, Is.Zero); Assert.That(kill.ShardOpacity, Is.Zero);
            }
            Assert.That(seconds, Is.EqualTo(tuning.KillBlastSeconds + tuning.KillEmberSeconds).Within(Step * 1.5f));
            Assert.That(kill.TakeBlast(), Is.False);
        }

        [Test] public void TurningReducedMotionOnMidBreakupSkipsStraightToTheStillRing()
        {
            kill.Begin(Vector3.zero, new Vector3(30, 0, 0), 0, false);
            for (int i = 0; i < 10; i++) kill.Tick(Step, false);
            Assert.That(kill.Stage, Is.EqualTo(KillStage.Breakup)); Assert.That(kill.TakeBlast(), Is.False);
            Vector3 where = kill.Position;
            kill.Tick(Step, true);
            Assert.That(kill.HullVisible, Is.False); Assert.That(kill.TakeBlast(), Is.True); Assert.That(kill.TakeBlast(), Is.False);
            Assert.That(kill.Position, Is.EqualTo(where)); Assert.That(kill.RingRadius, Is.EqualTo(tuning.KillRingRadius * .3f).Within(.001f));
            Assert.That(kill.ShardOpacity, Is.Zero);
        }

        [Test] public void TurningReducedMotionOnAfterTheBlastDoesNotRepeatTheCue()
        {
            kill.Begin(Vector3.zero, Vector3.zero, 0, false);
            for (int i = 0; i < 40; i++) kill.Tick(Step, false);
            Assert.That(kill.Stage, Is.EqualTo(KillStage.Blast)); Assert.That(kill.TakeBlast(), Is.True);
            kill.Tick(Step, true);
            Assert.That(kill.TakeBlast(), Is.False); Assert.That(kill.ShardOpacity, Is.Zero);
            Assert.That(kill.RingRadius, Is.EqualTo(tuning.KillRingRadius * .3f).Within(.001f));
        }

        [Test] public void GasBlastStartsAtTheBlastWithItsOwnRadiusAndOwesNoCue()
        {
            kill.BeginBlast(new Vector3(1, 2, 3), 120, 2, false);
            Assert.That(kill.Active, Is.True); Assert.That(kill.Stage, Is.EqualTo(KillStage.Blast)); Assert.That(kill.HullVisible, Is.False);
            Assert.That(kill.TakeBlast(), Is.False, "The gas pocket has already played its own explosion.");
            float largest = 0, seconds = 0;
            while (kill.Active) { kill.Tick(Step, false); seconds += Step; largest = Mathf.Max(largest, kill.RingRadius); Assert.That(kill.HullVisible, Is.False); if (kill.Active) Assert.That(kill.Position, Is.EqualTo(new Vector3(1, 2, 3))); }
            Assert.That(largest, Is.EqualTo(120).Within(3f), "The ring shows how far the blast really reaches.");
            Assert.That(seconds, Is.EqualTo(tuning.KillBlastSeconds + tuning.KillEmberSeconds).Within(Step * 1.5f));
            Assert.That(kill.TakeBlast(), Is.False); Assert.That(kill.Serial, Is.EqualTo(1));
            kill.BeginBlast(Vector3.zero, 120, 0, true);
            Assert.That(kill.RingRadius, Is.EqualTo(36).Within(.001f)); Assert.That(kill.ShardOpacity, Is.Zero);
        }

        [Test] public void ClearDropsAnOwedCueAndBeginStartsCleanly()
        {
            kill.Begin(Vector3.zero, Vector3.zero, 0, false);
            for (int i = 0; i < 40; i++) kill.Tick(Step, false);
            kill.Clear();
            Assert.That(kill.Active, Is.False); Assert.That(kill.TakeBlast(), Is.False);
            Assert.That(kill.Serial, Is.EqualTo(1), "Clear keeps the count.");
            kill.Begin(Vector3.one, Vector3.zero, 0, false);
            Assert.That(kill.Serial, Is.EqualTo(2)); Assert.That(kill.Age, Is.Zero); Assert.That(kill.Stage, Is.EqualTo(KillStage.Flash));
            kill.Reset(); Assert.That(kill.Serial, Is.Zero); Assert.That(kill.Active, Is.False);
        }

        [Test] public void BeginningAgainMidSequenceRestartsWithoutLeakingTheOldBlast()
        {
            kill.Begin(Vector3.zero, Vector3.zero, 0, false);
            for (int i = 0; i < 20; i++) kill.Tick(Step, false);
            kill.Begin(Vector3.one * 9, Vector3.zero, 0, false);
            int blasts = 0;
            for (int i = 0; i < 400; i++) { kill.Tick(Step, false); if (kill.TakeBlast()) blasts++; }
            Assert.That(blasts, Is.EqualTo(1));
        }

        [TestCase(0f)] [TestCase(-1f)] [TestCase(float.NaN)] [TestCase(float.PositiveInfinity)]
        public void FrozenOrInvalidStepHoldsTheSequence(float dt)
        {
            kill.Begin(Vector3.zero, new Vector3(10, 0, 0), 0, false);
            for (int i = 0; i < 8; i++) kill.Tick(Step, false);
            float age = kill.Age; Vector3 position = kill.Position;
            kill.Tick(dt, false);
            Assert.That(kill.Age, Is.EqualTo(age)); Assert.That(kill.Position, Is.EqualTo(position)); Assert.That(kill.TakeBlast(), Is.False);
        }

        [Test] public void ZeroLengthTimelineStillOwesItsBlastOnce()
        {
            tuning.KillFlashSeconds = tuning.KillBreakupSeconds = tuning.KillBlastSeconds = tuning.KillEmberSeconds = 0;
            kill.Begin(Vector3.zero, Vector3.zero, 0, false);
            int blasts = 0;
            for (int i = 0; i < 3; i++) { kill.Tick(Step, false); if (kill.TakeBlast()) blasts++; }
            Assert.That(kill.Active, Is.False); Assert.That(blasts, Is.EqualTo(1));
        }

        [Test] public void RejectsNonFiniteInputsAndTuning()
        {
            Assert.Throws<ArgumentNullException>(() => new KillSequenceState(null));
            Assert.Throws<ArgumentException>(() => kill.Begin(new Vector3(float.NaN, 0, 0), Vector3.zero, 0, false));
            Assert.Throws<ArgumentException>(() => kill.Begin(Vector3.zero, new Vector3(0, float.PositiveInfinity, 0), 0, false));
            Assert.That(kill.Active, Is.False, "A rejected start leaves nothing running.");
            tuning.KillBlastSeconds = float.NaN; Assert.Throws<ArgumentException>(() => new KillSequenceState(tuning));
            tuning.KillBlastSeconds = .3f; tuning.KillShardLength = -1; Assert.Throws<ArgumentException>(() => new KillSequenceState(tuning));
            Assert.Throws<ArgumentException>(() => kill.BeginBlast(Vector3.zero, float.NaN, 0, false));
            Assert.Throws<ArgumentException>(() => kill.BeginBlast(Vector3.zero, -5, 0, false));
        }
    }
}
