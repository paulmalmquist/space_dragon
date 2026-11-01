using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class ComebackStateTests
    {
        DogfightTuning tuning;
        ComebackState state;
        [SetUp] public void SetUp() { tuning = ScriptableObject.CreateInstance<DogfightTuning>(); state = new ComebackState(tuning); }
        [TearDown] public void TearDown() { Object.DestroyImmediate(tuning); }

        [Test] public void SongUsesNoReservedFlightOrWingmanKeys()
        {
            Assert.That(ComebackState.Word, Is.EqualTo("SONG"));
            foreach (char letter in ComebackState.Word) Assert.That(BreathState.IsReservedLetter(letter), Is.False);
            Assert.That(ComebackState.Word, Does.Not.Contain("T"));
        }

        [Test] public void FreshSongSucceedsOnceWithTwoSecondsOfProtection()
        {
            Assert.That(state.TryBegin(), Is.True); Assert.That(state.Remaining, Is.EqualTo(5));
            foreach (char letter in "SON") Assert.That(state.PressLetter(letter), Is.False);
            Assert.That(state.PressLetter('G'), Is.True); Assert.That(state.SucceededSerial, Is.EqualTo(1));
            Assert.That(state.Active, Is.False); Assert.That(state.Used, Is.True); Assert.That(state.Assisted, Is.False);
            Assert.That(state.ProtectionRemaining, Is.EqualTo(2)); Assert.That(state.Protected, Is.True);
            Assert.That(state.PressLetter('G'), Is.False); Assert.That(state.Assist(), Is.False);
            state.Tick(1.99f); Assert.That(state.Protected, Is.True); state.Tick(.01f); Assert.That(state.Protected, Is.False);
            Assert.That(state.SucceededSerial, Is.EqualTo(1));
        }

        [Test] public void WrongAndHeldLettersDoNotAdvanceOrExtendTheDeadline()
        {
            state.TryBegin(); state.Tick(1);
            Assert.That(state.PressLetter('O'), Is.False); Assert.That(state.PressLetter('S', repeat: true), Is.False);
            Assert.That(state.LetterIndex, Is.Zero); Assert.That(state.ExpectedLetter, Is.EqualTo('S'));
            Assert.That(state.Remaining, Is.EqualTo(4));
            state.PressLetter('s'); Assert.That(state.LetterIndex, Is.EqualTo(1));
            state.PressLetter('S'); Assert.That(state.LetterIndex, Is.EqualTo(1));
            Assert.That(state.TryBegin(), Is.False); Assert.That(state.Remaining, Is.EqualTo(4)); Assert.That(state.Failed, Is.False);
        }

        [Test] public void AssistedSuccessIsExplicitAndCannotGrantAnotherRecovery()
        {
            state.TryBegin(); state.PressLetter('S'); Assert.That(state.Assist(), Is.True);
            Assert.That(state.Assisted, Is.True); Assert.That(state.LetterIndex, Is.EqualTo(4));
            Assert.That(state.Assist(), Is.False); Assert.That(state.SucceededSerial, Is.EqualTo(1));
            Assert.That(state.TryBegin(), Is.False); Assert.That(state.Failed, Is.True);
            Assert.That(state.Active, Is.False); Assert.That(state.Protected, Is.False);
        }

        [Test] public void TimeoutRejectsLateFinalLetterAndF1AndSecondFailure()
        {
            state.TryBegin(); foreach (char letter in "SON") state.PressLetter(letter);
            state.Tick(5);
            Assert.That(state.TimedOut, Is.True); Assert.That(state.Failed, Is.True); Assert.That(state.Active, Is.False);
            Assert.That(state.PressLetter('G'), Is.False); Assert.That(state.Assist(), Is.False);
            Assert.That(state.SucceededSerial, Is.Zero); Assert.That(state.TryBegin(), Is.False);
        }

        [TestCase(30)] [TestCase(120)]
        public void DeadlineAndProtectionAreStableAcrossFrameRates(int fps)
        {
            state.TryBegin();
            for (int i = 0; i < fps * 5; i++) state.Tick(1f / fps);
            Assert.That(state.TimedOut, Is.True);
            state.Reset(); state.TryBegin(); state.Assist();
            for (int i = 0; i < fps * 2; i++) state.Tick(1f / fps);
            Assert.That(state.Protected, Is.False); Assert.That(state.SucceededSerial, Is.EqualTo(1));
        }

        [Test] public void PauseInvalidTimeRestartAndDisabledFlagCannotLeakState()
        {
            tuning.EnableComeback = false; Assert.That(state.TryBegin(), Is.False); Assert.That(state.Used, Is.False);
            tuning.EnableComeback = true; state.TryBegin(); state.PressLetter('S');
            foreach (float dt in new[] { 0, -1, float.NaN, float.PositiveInfinity }) state.Tick(dt);
            Assert.That(state.Remaining, Is.EqualTo(5)); Assert.That(state.LetterIndex, Is.EqualTo(1));
            state.Reset(); Assert.That(state.Used, Is.False); Assert.That(state.Active, Is.False);
            Assert.That(state.Assisted, Is.False); Assert.That(state.Failed, Is.False); Assert.That(state.TimedOut, Is.False);
            Assert.That(state.LetterIndex, Is.Zero); Assert.That(state.SucceededSerial, Is.Zero); Assert.That(state.ExpectedLetter, Is.Null);
            Assert.That(state.Remaining + state.ProtectionRemaining, Is.Zero); Assert.That(state.TryBegin(), Is.True);
        }

        [Test] public void RecoveryPromptNeverMutatesSeparateBreathChargeOrHealth()
        {
            var breath = new BreathState(seed: 41); breath.Assist();
            var before = breath.Snapshot(); var tactics = new TacticalState(tuning); tactics.ApplyDamage(DragonSystem.Hull, 100);
            state.TryBegin(); state.Assist();
            var after = breath.Snapshot();
            Assert.That(after.Word, Is.EqualTo(before.Word)); Assert.That(after.Phase, Is.EqualTo(before.Phase));
            Assert.That(after.LetterIndex, Is.EqualTo(before.LetterIndex)); Assert.That(after.Assisted, Is.EqualTo(before.Assisted));
            Assert.That(after.BurstsFired, Is.EqualTo(before.BurstsFired)); Assert.That(tactics.Hull, Is.Zero,
                "The adapter must explicitly commit the one observed recovery; the prompt never heals directly.");
        }
    }
}
