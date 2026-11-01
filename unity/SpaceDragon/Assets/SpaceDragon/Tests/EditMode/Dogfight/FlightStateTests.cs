using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class FlightStateTests
    {
        private static void Advance(FlightState flight, float seconds, FlightInput input = default, int fps = 60, float multiplier = 1, bool boostAllowed = true)
        {
            int count = Mathf.CeilToInt(seconds * fps);
            for (int i = 0; i < count; i++) flight.Tick(seconds / count, input, multiplier, boostAllowed);
        }

        [Test]
        public void CruiseAndSemanticSteeringUseUnityForwardWithoutVisualBankOnTheRoot()
        {
            var flight = new FlightState(); Advance(flight, 1);
            Assert.That(flight.Position.z, Is.EqualTo(54).Within(.001));
            Assert.That(flight.Forward, Is.EqualTo(Vector3.forward));
            Advance(flight, .5f, new FlightInput(new Vector2(1, 1)));
            Assert.That(flight.Forward.x, Is.GreaterThan(0)); Assert.That(flight.Forward.y, Is.GreaterThan(0));
            Assert.That(flight.Bank, Is.LessThan(0)); Assert.That(flight.RollAngle, Is.Zero);
            Assert.That(flight.Rotation.x * flight.Rotation.x + flight.Rotation.y * flight.Rotation.y + flight.Rotation.z * flight.Rotation.z + flight.Rotation.w * flight.Rotation.w, Is.EqualTo(1).Within(.00001));
        }

        [Test]
        public void ThrottleClampsAndBoostUsesASeparateFiniteReservoir()
        {
            var flight = new FlightState(); Advance(flight, 10, new FlightInput(Vector2.zero, -1));
            Assert.That(flight.CruiseSpeed, Is.EqualTo(26));
            Advance(flight, 10, new FlightInput(Vector2.zero, 1)); Assert.That(flight.CruiseSpeed, Is.EqualTo(88));
            flight.Reset(); Advance(flight, 4.6f, new FlightInput(Vector2.zero, 0, true));
            Assert.That(flight.BoostLocked, Is.True); Assert.That(flight.BoostEnergy, Is.Zero.Within(.0001));
            Assert.That(flight.Boosting, Is.False); Assert.That(flight.EvasionEnergy, Is.EqualTo(100));
            Advance(flight, 2); Assert.That(flight.BoostEnergy, Is.LessThan(flight.Tuning.BoostRestartThreshold));
            Advance(flight, 10); Assert.That(flight.BoostEnergy, Is.EqualTo(4.5f));
            Advance(flight, .1f, new FlightInput(Vector2.zero, 0, true)); Assert.That(flight.Boosting, Is.True);
        }

        [Test]
        public void PropulsionScalesOnlyTheBoostBonusAndRepairCanForbidBoost()
        {
            var flight = new FlightState(); Advance(flight, 1, multiplier: .65f);
            Assert.That(flight.Speed, Is.EqualTo(54));
            Advance(flight, 2, new FlightInput(Vector2.zero, 0, true), multiplier: .65f);
            Assert.That(flight.Speed, Is.EqualTo(54 + (148 - 54) * .65f).Within(.001));
            float energy = flight.BoostEnergy;
            Advance(flight, .1f, new FlightInput(Vector2.zero, 0, true), multiplier: .65f, boostAllowed: false);
            Assert.That(flight.Boosting, Is.False); Assert.That(flight.BoostEnergy, Is.EqualTo(energy));
            Assert.That(flight.CruiseSpeed, Is.EqualTo(54));
        }

        [Test]
        public void RollSpendsOnceMovesPhysicallyAndReturnsToTravelAxisWithoutRotatingCameraRoot()
        {
            var flight = new FlightState();
            Assert.That(flight.RequestRoll(0), Is.False); Assert.That(flight.EvasionEnergy, Is.EqualTo(100));
            Assert.That(flight.RequestRoll(1), Is.True); Assert.That(flight.RequestRoll(-1), Is.False); Assert.That(flight.RequestBreak(1), Is.False);
            Assert.That(flight.EvasionEnergy, Is.EqualTo(60)); Assert.That(flight.RollSerial, Is.EqualTo(1));
            Advance(flight, flight.Tuning.RollDuration / 2);
            Assert.That(flight.Position.y, Is.GreaterThan(4)); Assert.That(Mathf.Abs(flight.RollAngle), Is.GreaterThan(3));
            Assert.That(flight.Rotation, Is.EqualTo(Quaternion.identity)); Assert.That(flight.Up, Is.EqualTo(Vector3.up));
            Advance(flight, flight.Tuning.RollDuration / 2);
            Assert.That(flight.RollOffset, Is.EqualTo(Vector3.zero)); Assert.That(flight.Position.y, Is.Zero.Within(.00001));
            Assert.That(flight.RollActive, Is.False); Assert.That(flight.RollsCompleted, Is.EqualTo(1));
            Assert.That(flight.RequestBreak(1), Is.False); Assert.That(flight.LastManeuverRejection, Is.EqualTo("cooldown"));
        }

        [Test]
        public void TwoRollsExhaustAffordableBudgetAndRechargeWaitsUntilAfterManeuver()
        {
            var flight = new FlightState(); flight.RequestRoll(-1);
            Advance(flight, flight.Tuning.RollDuration); Advance(flight, flight.Tuning.RollCooldown + .001f);
            Assert.That(flight.RequestRoll(1), Is.True);
            Advance(flight, flight.Tuning.RollDuration); Advance(flight, flight.Tuning.RollCooldown + .001f);
            Assert.That(flight.EvasionEnergy, Is.EqualTo(20).Within(.001));
            Assert.That(flight.RequestRoll(1), Is.False); Assert.That(flight.LastManeuverRejection, Is.EqualTo("energy"));
            flight.Reset(); flight.RequestRoll(1); Advance(flight, flight.Tuning.RollDuration);
            Advance(flight, flight.Tuning.EvasionRechargeDelay);
            Assert.That(flight.EvasionEnergy, Is.EqualTo(60).Within(.001));
            Advance(flight, 1); Assert.That(flight.EvasionEnergy, Is.EqualTo(78).Within(.002));
        }

        [TestCase(-1)] [TestCase(1)]
        public void BreakTurnTradesSpeedForRealHeadingChangeAndSuppressesBoost(int direction)
        {
            var flight = new FlightState(); var ordinary = new FlightState();
            Assert.That(flight.RequestBreak(direction), Is.True); Assert.That(flight.Position, Is.EqualTo(Vector3.zero));
            var input = new FlightInput(new Vector2(direction, 0), 0, true);
            Advance(flight, flight.Tuning.BreakDuration, input);
            Advance(ordinary, flight.Tuning.BreakDuration, new FlightInput(new Vector2(direction, 0)));
            Assert.That(flight.Position.x * direction, Is.GreaterThan(15));
            Assert.That(Vector3.Angle(flight.Forward, Vector3.forward), Is.GreaterThan(Vector3.Angle(ordinary.Forward, Vector3.forward) + 40));
            Assert.That(flight.Speed, Is.EqualTo(54 * .7f).Within(.001));
            Assert.That(flight.BoostEnergy, Is.EqualTo(4.5f)); Assert.That(flight.Boosting, Is.False);
            Assert.That(flight.EvasionEnergy, Is.EqualTo(75).Within(.001)); Assert.That(flight.BreaksCompleted, Is.EqualTo(1));
            Assert.That(flight.RollSerial, Is.Zero); Assert.That(flight.Up, Is.EqualTo(Vector3.up));
        }

        [Test]
        public void BreakTimingIsConsistentAtThirtyAndOneHundredTwentyHz()
        {
            var slow = new FlightState(); var fast = new FlightState(); slow.RequestBreak(1); fast.RequestBreak(1);
            Advance(slow, .85f, fps: 30); Advance(fast, .85f, fps: 120);
            Assert.That(Vector3.Distance(slow.Position, fast.Position), Is.LessThan(.15));
            Assert.That(Vector3.Angle(slow.Forward, fast.Forward), Is.LessThan(.15));
            Advance(slow, 2.8f, fps: 30); Advance(fast, 2.8f, fps: 120);
            Assert.That(slow.EvasionEnergy, Is.EqualTo(fast.EvasionEnergy).Within(.02));
            Assert.That(slow.EvasionEnergy, Is.EqualTo(93).Within(.02));
        }

        [Test]
        public void InvalidOrPausedTimeDoesNotAdvanceAndResetClearsAllManeuvers()
        {
            var flight = new FlightState(); flight.RequestBreak(1); Advance(flight, .2f);
            var position = flight.Position; float elapsed = flight.BreakElapsed, energy = flight.EvasionEnergy;
            foreach (float dt in new[] { 0, -1, float.NaN, float.PositiveInfinity }) flight.Tick(dt, new FlightInput(Vector2.one, 1, true));
            Assert.That(flight.Position, Is.EqualTo(position)); Assert.That(flight.BreakElapsed, Is.EqualTo(elapsed)); Assert.That(flight.EvasionEnergy, Is.EqualTo(energy));
            flight.Reset(); Assert.That(flight.Position, Is.EqualTo(Vector3.zero)); Assert.That(flight.Rotation, Is.EqualTo(Quaternion.identity));
            Assert.That(flight.BreakActive || flight.RollActive || flight.Boosting, Is.False);
            Assert.That(flight.ManeuverSerial, Is.Zero); Assert.That(flight.EvasionEnergy, Is.EqualTo(100));
            flight.Tick(99, default); Assert.That(flight.Position.z, Is.EqualTo(5.4f).Within(.001));
            flight.Tick(.1f, new FlightInput(new Vector2(float.NaN, float.PositiveInfinity), float.NaN));
            Assert.That(float.IsNaN(flight.Position.x) || float.IsNaN(flight.Speed), Is.False);
        }
    }
}
