using System;
using System.Collections.Generic;
using NUnit.Framework;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class BreathStateTests
    {
        private static List<BreathImpact> Advance(BreathState breath, float seconds, BreathCandidate[] candidates = null, int fps = 60)
        {
            var impacts = new List<BreathImpact>(); int count = (int)Math.Ceiling(seconds * fps);
            for (int i = 0; i < count; i++) { var impact = breath.Tick(seconds / count, candidates); if (impact.HasValue) impacts.Add(impact.Value); }
            return impacts;
        }
        private static void Charge(BreathState breath) { foreach (char letter in breath.Word) Assert.That(breath.PressLetter(letter), Is.True); }
        private static BreathCandidate Ship(int id, float error = .03f, bool eligible = true, bool dead = false) => new BreathCandidate(id, 200, error, eligible, dead);
        private static void Lock(BreathState breath, int id = 1) { Charge(breath); Advance(breath, .7f, new[] { Ship(id) }); }
        private static void Finish(BreathState breath) { Lock(breath); Assert.That(breath.RequestFire(), Is.True); Assert.That(Advance(breath, 1.75f).Count, Is.EqualTo(1)); }

        [Test]
        public void TypingRequiresFreshCorrectSafeLettersAndHelpIsExplicit()
        {
            var breath = new BreathState(words: new[] { "LION" });
            Assert.That(breath.PressLetter('W'), Is.False); Assert.That(breath.LastInputReason, Is.EqualTo("reserved"));
            Assert.That(breath.PressLetter('P'), Is.False); Assert.That(breath.PressLetter('L', true), Is.False);
            Assert.That(breath.LetterIndex, Is.Zero); Assert.That(breath.RequestFire(), Is.False);
            Assert.That(breath.PressLetter("KeyL"), Is.True); Assert.That(breath.ExpectedLetter, Is.EqualTo('I'));
            Assert.That(breath.Assist(), Is.True); Assert.That(breath.Assisted, Is.True);
            Assert.That(breath.LetterIndex, Is.EqualTo(4)); Assert.That(breath.Phase, Is.EqualTo(BreathPhase.Ready));
            Assert.That(breath.RequestFire(), Is.False); Assert.That(breath.LastFireReason, Is.EqualTo("no-lock"));
            Assert.That(breath.Assist(), Is.False);
            Assert.Throws<ArgumentException>(() => new BreathState(words: new[] { "WORD" }));
            Assert.Throws<ArgumentException>(() => new BreathState(words: new[] { "LION", "LION" }));
            Assert.Throws<ArgumentOutOfRangeException>(() => new BreathState(0));
        }

        [Test]
        public void DwellMustStayOnOneCandidateAndExistingLockSurvivesReticleDrift()
        {
            var breath = new BreathState(seed: 7); Charge(breath);
            Advance(breath, .4f, new[] { Ship(1) }); Assert.That(breath.LockProgress, Is.GreaterThan(.5));
            Advance(breath, .3f, new[] { Ship(2) }); Assert.That(breath.LockedIds, Is.Empty);
            Advance(breath, .4f, new[] { Ship(2) }); CollectionAssert.AreEqual(new[] { 2 }, breath.LockedIds);
            Advance(breath, 1, new[] { Ship(2, .9f) }); CollectionAssert.AreEqual(new[] { 2 }, breath.LockedIds);
            Advance(breath, .7f, new[] { Ship(2, .9f), Ship(3) }); CollectionAssert.AreEqual(new[] { 3 }, breath.LockedIds);
        }

        [Test]
        public void LostTargetsHaveGraceButDeadTargetsDropImmediatelyEvenAtZeroTime()
        {
            var breath = new BreathState(); Lock(breath);
            Advance(breath, 1); CollectionAssert.AreEqual(new[] { 1 }, breath.LockedIds);
            Advance(breath, .1f, new[] { Ship(1, .9f) });
            Advance(breath, 1, new[] { Ship(1, eligible: false) }); Assert.That(breath.LockedIds.Length, Is.EqualTo(1));
            Advance(breath, .21f, new[] { Ship(1, eligible: false) }); Assert.That(breath.LockedIds, Is.Empty);
            Advance(breath, .7f, new[] { Ship(1) }); breath.Tick(0, new[] { Ship(1, dead: true) });
            Assert.That(breath.LockedIds, Is.Empty); Assert.That(breath.RequestFire(), Is.False);
        }

        [Test]
        public void CandidateValidationTieBreakingAndCapacityAreStable()
        {
            var breath = new BreathState(3); Charge(breath);
            Advance(breath, 1, new[] { new BreathCandidate(-1, 100, 0), new BreathCandidate(1, float.NaN, 0), Ship(2, float.NaN), Ship(3, -1), new BreathCandidate(4, 900, 0) });
            Assert.That(breath.LockedIds, Is.Empty);
            Advance(breath, .7f, new[] { Ship(2), Ship(1), Ship(1) }); CollectionAssert.AreEqual(new[] { 1 }, breath.LockedIds);
            Advance(breath, .7f, new[] { Ship(1, .5f), Ship(2), Ship(3, .5f) });
            Advance(breath, .7f, new[] { Ship(1, .5f), Ship(2, .5f), Ship(3) });
            CollectionAssert.AreEqual(new[] { 1, 2, 3 }, breath.LockedIds);
            breath.SetCapacity(1); CollectionAssert.AreEqual(new[] { 3 }, breath.LockedIds);
        }

        [Test]
        public void WindupThenBeamResolveExactlyOnceFromStateTimeWithImmutableTargetSnapshot()
        {
            var breath = new BreathState(seed: 4); Lock(breath); string word = breath.Word;
            Assert.That(breath.RequestFire(), Is.True); Assert.That(breath.RequestFire(), Is.False);
            var external = breath.Burst; external.Elapsed = 999; external.TargetIds[0] = 999;
            Assert.That(breath.Burst.Elapsed, Is.Zero); CollectionAssert.AreEqual(new[] { 1 }, breath.Burst.TargetIds);
            Assert.That(Advance(breath, .6f), Is.Empty); Assert.That(breath.Burst.Stage, Is.EqualTo("windup"));
            Assert.That(Advance(breath, .05f), Is.Empty); Assert.That(breath.Burst.Stage, Is.EqualTo("beam"));
            Assert.That(Advance(breath, 1), Is.Empty); Assert.That(breath.Phase, Is.EqualTo(BreathPhase.Burst));
            var impacts = Advance(breath, .1f); Assert.That(impacts.Count, Is.EqualTo(1));
            Assert.That(impacts[0].BurstId, Is.EqualTo(1)); CollectionAssert.AreEqual(new[] { 1 }, impacts[0].TargetIds);
            Assert.That(breath.Word, Is.Not.EqualTo(word)); Assert.That(breath.BurstsResolved, Is.EqualTo(1));
            Assert.That(Advance(breath, 10), Is.Empty); Assert.That(breath.BurstsFired, Is.EqualTo(1));
            Lock(breath, 2); breath.RequestFire(); Assert.That(breath.Burst.Id, Is.EqualTo(2));
        }

        [Test]
        public void PauseInvalidTimeCancellationAndRetryNeverDeliverDelayedHits()
        {
            var breath = new BreathState(); Lock(breath); breath.RequestFire();
            foreach (float dt in new[] { 0, -1, float.NaN, float.PositiveInfinity }) Assert.That(breath.Tick(dt), Is.Null);
            Assert.That(breath.Burst.Elapsed, Is.Zero); breath.Tick(999); Assert.That(breath.Burst.Elapsed, Is.EqualTo(.1f));
            string word = breath.Word; Assert.That(breath.CancelBurst(), Is.True); Assert.That(breath.CancelBurst(), Is.False);
            Assert.That(Advance(breath, 5), Is.Empty); Assert.That(breath.WordIndex, Is.Zero); Assert.That(breath.Word, Is.EqualTo(word));
            Assert.That(breath.BurstsResolved, Is.Zero); Assert.That(breath.LetterIndex, Is.Zero);
            Lock(breath); breath.RequestFire(); breath.Reset();
            Assert.That(breath.Word, Is.Not.EqualTo(word)); Assert.That(breath.Burst, Is.Null);
            Assert.That(breath.Assisted, Is.False); Assert.That(breath.LockedIds, Is.Empty); Assert.That(breath.BurstsFired, Is.Zero);
        }

        [TestCase(30)] [TestCase(120)]
        public void DwellAndImpactAgreeAcrossFrameRates(int fps)
        {
            var breath = new BreathState(seed: 8); Charge(breath);
            Advance(breath, .65f, new[] { Ship(1) }, fps); Assert.That(breath.LockedIds.Length, Is.EqualTo(1));
            breath.RequestFire(); var impacts = Advance(breath, 1.75f, fps: fps);
            Assert.That(impacts.Count, Is.EqualTo(1)); Assert.That(breath.WordIndex, Is.EqualTo(1)); Assert.That(breath.Phase, Is.EqualTo(BreathPhase.Charging));
        }

        [Test]
        public void SeededShuffleBagsVisitEveryWordAndDoNotRepeatAtBoundaries()
        {
            var first = new BreathState(seed: 42); var second = new BreathState(seed: 42);
            var bank = new[] { "LION", "PINK", "COIN", "KING", "SONG" }; string previous = null;
            for (int cycle = 0; cycle < 3; cycle++)
            {
                var words = new List<string>();
                for (int i = 0; i < 5; i++)
                {
                    Assert.That(first.Word, Is.EqualTo(second.Word)); Assert.That(first.Word, Is.Not.EqualTo(previous));
                    previous = first.Word; words.Add(first.Word); Finish(first); Finish(second);
                }
                CollectionAssert.AreEquivalent(bank, words);
            }
        }
    }
}
