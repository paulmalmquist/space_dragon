using System;
using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class PerfectRollTests
    {
        DogfightTuning tuning;
        [SetUp] public void SetUp()
        {
            tuning = ScriptableObject.CreateInstance<DogfightTuning>();
            tuning.EnablePerfectRoll = true;
            tuning.PerfectRollWindow = .4f; tuning.PerfectRollRadius = 3.3f;
            tuning.PerfectRollSlowSeconds = .35f; tuning.PerfectRollTimeScale = .4f;
        }
        [TearDown] public void TearDown() => UnityEngine.Object.DestroyImmediate(tuning);

        static void Advance(FlightState flight, float seconds)
        {
            int steps = Mathf.CeilToInt(seconds * 120);
            for (int i = 0; i < steps; i++) flight.Tick(seconds / steps, default);
        }
        static void FinishRollAndCooldown(FlightState flight)
        {
            // Existing flight starts its full cooldown on the frame which ends
            // the roll. A combined duration+cooldown split into arbitrary frame
            // lengths can finish the roll one frame late and still be cooling.
            Advance(flight, flight.Tuning.RollDuration);
            Assert.That(flight.RollActive, Is.False, "The complete roll phase must finish before its recovery phase.");
            Advance(flight, flight.Tuning.RollCooldown + .001f);
            Assert.That(flight.RollCooldown, Is.Zero.Within(.000001f));
        }
        PerfectRollThreat Incoming(FlightState flight, int id, float contactSeconds, float life = 2) =>
            new PerfectRollThreat(id, flight.Position + Vector3.forward * (tuning.PerfectRollRadius + 100 * contactSeconds),
                flight.Velocity - Vector3.forward * 100, life);

        [TestCase(-1)] [TestCase(1)]
        public void AcceptedImminentRollRefundsOnceAndProtectsOnlyTriggeringThreats(int direction)
        {
            var flight = new FlightState(); var state = new PerfectRollState(tuning);
            var threats = new[] { Incoming(flight, 1, .2f), Incoming(flight, 2, .3f), Incoming(flight, 3, .5f),
                new PerfectRollThreat(4, new Vector3(3.4f, 0, 20), flight.Velocity - Vector3.forward * 100, 2) };
            Assert.That(state.TryRoll(flight, direction, threats), Is.True);
            Assert.That(flight.RollSerial, Is.EqualTo(1)); Assert.That(flight.RollActive, Is.True);
            Assert.That(flight.EvasionEnergy, Is.EqualTo(100)); Assert.That(state.Serial, Is.EqualTo(1));
            Assert.That(state.HarmlessCount, Is.EqualTo(2)); Assert.That(state.IsHarmless(1) && state.IsHarmless(2), Is.True);
            Assert.That(state.IsHarmless(3) || state.IsHarmless(4), Is.False);
            Assert.That(state.SlowRemaining, Is.EqualTo(.35f));
            Assert.That(state.TryRoll(flight, -direction, threats), Is.False);
            Assert.That(state.Serial, Is.EqualTo(1)); Assert.That(flight.EvasionEnergy, Is.EqualTo(100));
        }

        [TestCase(.4f, 2f, true)]
        [TestCase(.401f, 2f, false)]
        [TestCase(.3f, .2f, false)]
        [TestCase(.2f, .3f, true)]
        public void PredictionUsesTheWindowAndTheRemainingProjectileLifetime(float contact, float life, bool perfect)
        {
            var flight = new FlightState(); var state = new PerfectRollState(tuning);
            Assert.That(state.TryRoll(flight, 1, new[] { Incoming(flight, 7, contact, life) }), Is.True);
            Assert.That(state.IsHarmless(7), Is.EqualTo(perfect));
            Assert.That(flight.EvasionEnergy, Is.EqualTo(perfect ? 100 : 60));
        }

        [Test]
        public void PredictionUsesRelativeThreeDimensionalMotionAndTheExactPlayerSphere()
        {
            var flight = new FlightState(); var state = new PerfectRollState(tuning);
            var threats = new[] {
                new PerfectRollThreat(1, new Vector3(20, 0, 0), flight.Velocity + Vector3.left * 100, 2),
                new PerfectRollThreat(2, new Vector3(0, 20, 0), flight.Velocity + Vector3.down * 100, 2),
                new PerfectRollThreat(3, new Vector3(0, 0, 14.1f), Vector3.zero, 2),
                new PerfectRollThreat(4, new Vector3(0, 0, 10), flight.Velocity, 2),
                new PerfectRollThreat(5, new Vector3(0, 0, 10), flight.Velocity + Vector3.forward * 100, 2),
                new PerfectRollThreat(6, new Vector3(4, 0, 20), flight.Velocity - Vector3.forward * 100, 2),
                new PerfectRollThreat(7, new Vector3(3.3f, 0, 20), flight.Velocity - Vector3.forward * 100, 2) };
            state.TryRoll(flight, 1, threats);
            foreach (int id in new[] { 1, 2, 3, 7 }) Assert.That(state.IsHarmless(id), Is.True, "Threat " + id);
            foreach (int id in new[] { 4, 5, 6 }) Assert.That(state.IsHarmless(id), Is.False, "Threat " + id);
        }

        [Test]
        public void RefundUsesTheAcceptedRollCostWithoutRefillingOtherMissingEnergy()
        {
            var flight = new FlightState(new FlightTuning { RollCost = 27 });
            var state = new PerfectRollState(tuning);
            Assert.That(flight.RequestBreak(1), Is.True);
            Advance(flight, flight.Tuning.BreakDuration + flight.Tuning.BreakCooldown + .001f);
            Assert.That(flight.EvasionEnergy, Is.EqualTo(75).Within(.001));
            Assert.That(state.TryRoll(flight, 1, new[] { Incoming(flight, 1, .1f) }), Is.True);
            Assert.That(flight.EvasionEnergy, Is.EqualTo(75).Within(.001));
            Assert.That(state.Serial, Is.EqualTo(1));
        }

        [Test]
        public void AnAlreadyConsumedProjectileCannotPayForAnotherRoll()
        {
            var flight = new FlightState(); var state = new PerfectRollState(tuning);
            state.TryRoll(flight, 1, new[] { Incoming(flight, 1, .2f), Incoming(flight, 1, .2f) });
            Assert.That(state.HarmlessCount, Is.EqualTo(1)); Assert.That(state.Serial, Is.EqualTo(1));
            FinishRollAndCooldown(flight);
            Assert.That(state.TryRoll(flight, -1, new[] { Incoming(flight, 1, .2f) }), Is.True);
            Assert.That(state.Serial, Is.EqualTo(1)); Assert.That(flight.EvasionEnergy, Is.EqualTo(60).Within(.001));
            Assert.That(state.IsHarmless(1), Is.True, "Protection lasts until encounter reset, not the slow-motion timer.");
        }

        [Test]
        public void InvalidRejectedCooldownAndUnaffordableRollsNeverGrantProtectionOrRefunds()
        {
            var flight = new FlightState(); var state = new PerfectRollState(tuning);
            Assert.That(state.TryRoll(flight, 0, new[] { Incoming(flight, 1, .1f) }), Is.False);
            Assert.That(flight.EvasionEnergy, Is.EqualTo(100));
            Assert.That(state.TryRoll(flight, 1, null), Is.True);
            Assert.That(state.TryRoll(flight, 1, new[] { Incoming(flight, 1, .1f) }), Is.False);
            Advance(flight, flight.Tuning.RollDuration);
            Assert.That(state.TryRoll(flight, 1, new[] { Incoming(flight, 1, .1f) }), Is.False);
            Advance(flight, flight.Tuning.RollCooldown + .001f);
            Assert.That(state.TryRoll(flight, 1, null), Is.True);
            FinishRollAndCooldown(flight);
            Assert.That(state.TryRoll(flight, 1, new[] { Incoming(flight, 1, .1f) }), Is.False);
            Assert.That(flight.LastManeuverRejection, Is.EqualTo("energy"));
            Assert.That(flight.EvasionEnergy, Is.EqualTo(20).Within(.001));
            Assert.That(state.Serial, Is.Zero); Assert.That(state.HarmlessCount, Is.Zero); Assert.That(state.SlowRemaining, Is.Zero);
        }

        [Test]
        public void DisabledFeatureIsTheExistingFlightPathWithoutARewardOrSlowdown()
        {
            tuning.EnablePerfectRoll = false;
            var flight = new FlightState(); var baseline = new FlightState(); var state = new PerfectRollState(tuning);
            Assert.That(state.TryRoll(flight, -1, new[] { Incoming(flight, 1, .1f) }), Is.EqualTo(baseline.RequestRoll(-1)));
            for (int i = 0; i < 360; i++)
            {
                var input = new FlightInput(new Vector2(Mathf.Sin(i * .05f), .2f), .1f, i > 240);
                flight.Tick(1f / 120, input); baseline.Tick(1f / 120, input); state.Tick(1f / 120);
                Assert.That(flight.Position, Is.EqualTo(baseline.Position)); Assert.That(flight.Rotation, Is.EqualTo(baseline.Rotation));
                Assert.That(flight.RollAngle, Is.EqualTo(baseline.RollAngle)); Assert.That(flight.EvasionEnergy, Is.EqualTo(baseline.EvasionEnergy));
                Assert.That(flight.BoostEnergy, Is.EqualTo(baseline.BoostEnergy));
            }
            Assert.That(state.Serial, Is.Zero); Assert.That(state.HarmlessCount, Is.Zero); Assert.That(state.SlowRemaining, Is.Zero);
        }

        [Test]
        public void PauseAndClearEndSlowMotionButResetAloneClearsConsumedThreats()
        {
            var flight = new FlightState(); var state = new PerfectRollState(tuning);
            state.TryRoll(flight, 1, new[] { Incoming(flight, 1, .1f) });
            state.Tick(.1f); Assert.That(state.SlowRemaining, Is.EqualTo(.25f).Within(.000001));
            foreach (float dt in new[] { 0, -1, float.NaN, float.PositiveInfinity }) state.Tick(dt);
            Assert.That(state.SlowRemaining, Is.EqualTo(.25f).Within(.000001));
            state.Pause(); Assert.That(state.SlowRemaining, Is.Zero); Assert.That(state.IsHarmless(1), Is.True);
            state.ClearSlowMotion(); state.Tick(20); Assert.That(state.Serial, Is.EqualTo(1));
            state.Reset(); flight.Reset();
            Assert.That(state.Serial, Is.Zero); Assert.That(state.HarmlessCount, Is.Zero); Assert.That(state.SlowRemaining, Is.Zero);
            state.TryRoll(flight, 1, new[] { Incoming(flight, 1, .1f) });
            state.Tick(.175f); state.Tick(.175f);
            Assert.That(state.SlowRemaining, Is.Zero.Within(.000001)); Assert.That(state.Serial, Is.EqualTo(1));
        }

        [Test]
        public void InvalidOrExpiredThreatDataDoesNotTurnAnOrdinaryRollIntoAReward()
        {
            var flight = new FlightState(); var state = new PerfectRollState(tuning);
            var threats = new[] {
                Incoming(flight, -1, .1f), Incoming(flight, 2, .1f, 0), Incoming(flight, 3, .1f, float.NaN),
                new PerfectRollThreat(4, new Vector3(float.NaN, 0, 0), Vector3.zero, 1),
                new PerfectRollThreat(5, Vector3.zero, new Vector3(float.PositiveInfinity, 0, 0), 1) };
            Assert.That(state.TryRoll(flight, 1, threats), Is.True);
            Assert.That(state.Serial, Is.Zero); Assert.That(flight.EvasionEnergy, Is.EqualTo(60));
            Assert.Throws<ArgumentNullException>(() => new PerfectRollState(null));
            Assert.Throws<ArgumentNullException>(() => state.TryRoll(null, 1, threats));
        }
    }
}
