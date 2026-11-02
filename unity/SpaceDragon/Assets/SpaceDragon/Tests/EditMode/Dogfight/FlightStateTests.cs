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

        [TestCase(-1, false)] [TestCase(1, false)]
        [TestCase(-1, true)] [TestCase(1, true)]
        public void IndependentBankLeavesSteeringPathSpeedAndResourcesExactlyUnchanged(int direction, bool heldBreak)
        {
            var baseline = new FlightState(); var tilted = new FlightState();
            for (int frame = 0; frame < 120; frame++)
            {
                var steer = new Vector2(frame < 60 ? .65f : -.4f, .3f);
                var input = new FlightInput(steer, .1f, !heldBreak, heldBreak);
                baseline.Tick(1f / 60, input);
                input.IndependentBankRadians = direction * 65 * Mathf.Deg2Rad;
                tilted.Tick(1f / 60, input);
                Assert.That(tilted.Position, Is.EqualTo(baseline.Position));
                Assert.That(tilted.Velocity, Is.EqualTo(baseline.Velocity));
                Assert.That(tilted.Rotation, Is.EqualTo(baseline.Rotation));
                Assert.That(tilted.YawRate, Is.EqualTo(baseline.YawRate));
                Assert.That(tilted.PitchRate, Is.EqualTo(baseline.PitchRate));
                Assert.That(tilted.Speed, Is.EqualTo(baseline.Speed));
                Assert.That(tilted.BoostEnergy, Is.EqualTo(baseline.BoostEnergy));
                Assert.That(tilted.EvasionEnergy, Is.EqualTo(baseline.EvasionEnergy));
            }
            Assert.That(tilted.Bank, Is.EqualTo(direction * 65 * Mathf.Deg2Rad).Within(.0001));
            Assert.That(tilted.Bank, Is.Not.EqualTo(baseline.Bank));
            Assert.That(tilted.RollSerial, Is.Zero);
        }

        [TestCase(-1)] [TestCase(1)]
        public void IndependentBankHoldsAndReleasesThroughExistingSmoothing(int direction)
        {
            const float dt = 1f / 60;
            var flight = new FlightState();
            float target = direction * 65 * Mathf.Deg2Rad;
            var input = new FlightInput(Vector2.zero, independentBankRadians: target);
            flight.Tick(dt, input);
            Assert.That(flight.Bank, Is.EqualTo(target * (1 - Mathf.Exp(-flight.Tuning.BankResponse * dt))).Within(.000001));
            Assert.That(Mathf.Abs(flight.Bank), Is.LessThan(Mathf.Abs(target)));
            Advance(flight, 2, input);
            Assert.That(flight.Bank, Is.EqualTo(target).Within(.0001));
            float heldBank = flight.Bank;
            flight.Tick(dt, default);
            Assert.That(flight.Bank, Is.EqualTo(heldBank * Mathf.Exp(-flight.Tuning.BankResponse * dt)).Within(.000001));
            Assert.That(Mathf.Abs(flight.Bank), Is.GreaterThan(0));
            Advance(flight, 2);
            Assert.That(flight.Bank, Is.Zero.Within(.0001));
            Assert.That(flight.Forward, Is.EqualTo(Vector3.forward));
            Assert.That(flight.Position.x, Is.Zero); Assert.That(flight.Position.y, Is.Zero);
        }

        [TestCase(-1)] [TestCase(1)]
        public void IndependentBankIsIgnoredThroughoutAnExistingFullRoll(int direction)
        {
            var baseline = new FlightState(); var tilted = new FlightState();
            var entry = new FlightInput(new Vector2(.5f, .1f));
            Advance(baseline, .4f, entry); Advance(tilted, .4f, entry);
            Assert.That(baseline.RequestRoll(direction), Is.True);
            Assert.That(tilted.RequestRoll(direction), Is.True);
            int frame = 0;
            while (baseline.RollActive && frame++ < 300)
            {
                var input = new FlightInput(new Vector2(-.4f, -.2f));
                baseline.Tick(1f / 120, input);
                input.IndependentBankRadians = -direction * 65 * Mathf.Deg2Rad;
                tilted.Tick(1f / 120, input);
                Assert.That(tilted.Bank, Is.EqualTo(baseline.Bank));
                Assert.That(tilted.RollAngle, Is.EqualTo(baseline.RollAngle));
                Assert.That(tilted.RollOffset, Is.EqualTo(baseline.RollOffset));
                Assert.That(tilted.Position, Is.EqualTo(baseline.Position));
                Assert.That(tilted.Rotation, Is.EqualTo(baseline.Rotation));
                Assert.That(tilted.RollActive, Is.EqualTo(baseline.RollActive));
                Assert.That(tilted.EvasionEnergy, Is.EqualTo(baseline.EvasionEnergy));
            }
            Assert.That(tilted.RollsCompleted, Is.EqualTo(1));
            Assert.That(tilted.RollAngle, Is.Zero); Assert.That(tilted.RollOffset, Is.EqualTo(Vector3.zero));
        }

        [Test]
        public void ZeroAndInvalidIndependentBankKeepTheExistingAutomaticBank()
        {
            foreach (float bank in new[] { 0, float.NaN, float.PositiveInfinity, float.NegativeInfinity })
            {
                var baseline = new FlightState(); var fallback = new FlightState();
                for (int frame = 0; frame < 120; frame++)
                {
                    var input = new FlightInput(new Vector2(.6f, .2f), breakHeld: frame > 60);
                    baseline.Tick(1f / 60, input);
                    input.IndependentBankRadians = bank;
                    fallback.Tick(1f / 60, input);
                    Assert.That(fallback.Bank, Is.EqualTo(baseline.Bank));
                    Assert.That(fallback.Position, Is.EqualTo(baseline.Position));
                    Assert.That(fallback.Rotation, Is.EqualTo(baseline.Rotation));
                }
                Assert.That(fallback.Bank, Is.LessThan(0));
            }
        }

        [TestCase(-1)] [TestCase(1)]
        public void IndependentBankClampsFiniteExtremeInputToNinetyDegrees(int direction)
        {
            var flight = new FlightState();
            Advance(flight, 3, new FlightInput(Vector2.zero, independentBankRadians: direction * float.MaxValue));
            Assert.That(flight.Bank, Is.EqualTo(direction * Mathf.PI * .5f).Within(.00001));
            Assert.That(Mathf.Abs(flight.Bank), Is.LessThanOrEqualTo(Mathf.PI * .5f));
            Assert.That(flight.Rotation, Is.EqualTo(Quaternion.identity));
            Assert.That(flight.EvasionEnergy, Is.EqualTo(flight.Tuning.EvasionCapacity));
        }

        [Test]
        public void IndependentBankDoesNotAdvanceDuringPauseAndResetClearsItsTilt()
        {
            var flight = new FlightState();
            var input = new FlightInput(Vector2.zero, independentBankRadians: 65 * Mathf.Deg2Rad);
            Advance(flight, .5f, input);
            float bank = flight.Bank; Vector3 position = flight.Position;
            foreach (float dt in new[] { 0, -1, float.NaN, float.PositiveInfinity }) flight.Tick(dt, input);
            Assert.That(flight.Bank, Is.EqualTo(bank)); Assert.That(flight.Position, Is.EqualTo(position));
            flight.Reset();
            Assert.That(flight.Bank, Is.Zero); Assert.That(flight.RollAngle, Is.Zero);
            Assert.That(flight.Rotation, Is.EqualTo(Quaternion.identity));
            flight.Tick(1f / 60, default);
            Assert.That(flight.Bank, Is.Zero, "Reset must not retain a previous adapter's held tilt request.");
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
            Assert.That(flight.Position.y, Is.EqualTo(2.4f).Within(.002)); Assert.That(Mathf.Abs(flight.RollAngle), Is.GreaterThan(3));
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
        public void TimedBreakEndsInsideTheTickAndCreditsItsIdleRemainder()
        {
            var flight = new FlightState(new FlightTuning { BreakDuration = .004f });
            Assert.That(flight.RequestBreak(1), Is.True);
            flight.Tick(.01f, default);
            Assert.That(flight.BreakActive, Is.False);
            Assert.That(flight.BreaksCompleted, Is.EqualTo(1));
            Assert.That(flight.BreakCooldown, Is.EqualTo(.5f - .006f).Within(.00001));
            Assert.That(flight.Speed, Is.EqualTo(54 - 90 * .004f + 36 * .006f).Within(.00001),
                "Only the active 4 ms may brake; normal acceleration resumes for the remaining 6 ms.");
            Advance(flight, 1.794f);
            Assert.That(flight.EvasionEnergy, Is.EqualTo(75).Within(.002));
            Advance(flight, .25f);
            Assert.That(flight.EvasionEnergy, Is.EqualTo(79.5f).Within(.002));
        }

        [Test]
        public void HeldBreakExhaustionEndsPoweredSteeringAtItsExactEnergyBoundary()
        {
            var tuning = new FlightTuning { EvasionCapacity = 100, BreakCost = 99.88f };
            var flight = new FlightState(tuning);
            float activeSeconds = (tuning.EvasionCapacity - tuning.BreakCost) / tuning.HeldBreakDrainPerSecond;
            flight.Tick(.01f, new FlightInput(Vector2.right, 0, false, true));
            Assert.That(flight.BreakActive, Is.False); Assert.That(flight.EvasionEnergy, Is.Zero);
            Assert.That(flight.BreaksCompleted, Is.EqualTo(1));
            Assert.That(flight.BreakCooldown, Is.EqualTo(.5f - (.01f - activeSeconds)).Within(.00001));
            Assert.That(flight.Speed, Is.EqualTo(54 - 90 * activeSeconds + 36 * (.01f - activeSeconds)).Within(.00001));
            Advance(flight, 4, new FlightInput(Vector2.right, 0, false, true));
            Assert.That(flight.EvasionEnergy, Is.Zero); Assert.That(flight.BreakSerial, Is.EqualTo(1));
        }

        [TestCase(-1)] [TestCase(1)]
        public void RollHasOneSmoothRevolutionWithStableEntryBankAndBoundedPhysicalMotion(int direction)
        {
            const float dt = 1f / 120;
            var flight = new FlightState();
            Advance(flight, .6f, new FlightInput(new Vector2(-direction, 0)));
            float bank = flight.Bank;
            Assert.That(flight.RequestRoll(direction), Is.True);
            float lastAngle = 0, maximumRate = 0, firstRate = 0, finalRate = 0;
            float accumulatedDegrees = 0;
            Quaternion previous = Quaternion.AngleAxis(bank * Mathf.Rad2Deg, Vector3.forward);
            int frame = 0;
            while (flight.RollActive && frame++ < 300)
            {
                flight.Tick(dt, new FlightInput(new Vector2(direction, .2f)));
                float angle = flight.RollActive ? -direction * flight.RollAngle : 2 * Mathf.PI;
                float rate = (angle - lastAngle) / dt;
                Assert.That(rate, Is.GreaterThanOrEqualTo(-.00001f), "No reverse spin during bank/steer changes.");
                Assert.That(flight.Bank, Is.EqualTo(bank).Within(.000001f));
                maximumRate = Mathf.Max(maximumRate, rate);
                if (frame == 1) firstRate = rate;
                if (!flight.RollActive) finalRate = rate;
                var rotation = Quaternion.AngleAxis((flight.Bank + flight.RollAngle) * Mathf.Rad2Deg, Vector3.forward);
                float stepDegrees = Quaternion.Angle(previous, rotation);
                Assert.That(stepDegrees, Is.LessThan(3), "End wrap must be an equivalent orientation, not a snap.");
                accumulatedDegrees += stepDegrees;
                Assert.That(flight.RollOffset.magnitude, Is.LessThanOrEqualTo(2.401f));
                previous = rotation; lastAngle = angle;
            }
            Assert.That(flight.RollsCompleted, Is.EqualTo(1));
            Assert.That(accumulatedDegrees, Is.EqualTo(360).Within(1));
            Assert.That(maximumRate, Is.LessThan(6));
            Assert.That(firstRate, Is.LessThan(.02)); Assert.That(finalRate, Is.LessThan(.02));
            Assert.That(flight.EvasionEnergy, Is.EqualTo(60).Within(.001));
        }

        [TestCase(-1)] [TestCase(1)]
        public void HoldingBreakKeepsSteeringLiveAndTurnsMoreSharplyUntilRelease(int direction)
        {
            var flight = new FlightState(); var ordinary = new FlightState();
            var held = new FlightInput(new Vector2(direction, 0), 0, true, true);
            Advance(flight, .45f, held);
            Advance(ordinary, .45f, new FlightInput(new Vector2(direction, 0)));
            Assert.That(flight.HeldBreakActive, Is.True);
            Assert.That(flight.BreakSerial, Is.EqualTo(1));
            Assert.That(Vector3.Angle(flight.Forward, Vector3.forward), Is.GreaterThan(Vector3.Angle(ordinary.Forward, Vector3.forward) + 30));
            Assert.That(flight.Speed, Is.EqualTo(54 * .58f).Within(.001));
            Assert.That(flight.Boosting, Is.False); Assert.That(flight.BoostEnergy, Is.EqualTo(4.5f));
            Assert.That(flight.EvasionEnergy, Is.EqualTo(100 - 25 - .45f * 30).Within(.002));
            Advance(flight, .35f, new FlightInput(new Vector2(-direction, .5f), 0, false, true));
            Assert.That(flight.YawRate * direction, Is.LessThan(0), "Holding B must accept a new steering direction.");
            Assert.That(flight.PitchRate, Is.GreaterThan(1));
            Assert.That(flight.BreakSerial, Is.EqualTo(1)); Assert.That(flight.RollSerial, Is.Zero);
            Advance(flight, .1f);
            Assert.That(flight.BreakActive, Is.False); Assert.That(flight.BreaksCompleted, Is.EqualTo(1));
            Assert.That(flight.Speed, Is.GreaterThan(54 * .58f));
            Assert.That(flight.BreakCooldown, Is.GreaterThan(0));
        }

        [Test]
        public void HeldBreakExhaustionRequiresReleaseAndDoesNotRechargeOrRetriggerWhileHeld()
        {
            var flight = new FlightState(); var held = new FlightInput(Vector2.zero, 0, false, true);
            Advance(flight, 3, held);
            Assert.That(flight.BreakActive, Is.False); Assert.That(flight.EvasionEnergy, Is.Zero);
            Assert.That(flight.BreakSerial, Is.EqualTo(1)); Assert.That(flight.BreaksCompleted, Is.EqualTo(1));
            Assert.That(flight.Forward, Is.EqualTo(Vector3.forward), "A neutral hold brakes without choosing a turn for the pilot.");
            Advance(flight, 8, held);
            Assert.That(flight.EvasionEnergy, Is.Zero); Assert.That(flight.BreakSerial, Is.EqualTo(1));
            Advance(flight, flight.Tuning.EvasionRechargeDelay);
            Assert.That(flight.EvasionEnergy, Is.Zero.Within(.002));
            Advance(flight, 2);
            Assert.That(flight.EvasionEnergy, Is.EqualTo(36).Within(.002));
            flight.Tick(1f / 60, held);
            Assert.That(flight.HeldBreakActive, Is.True); Assert.That(flight.BreakSerial, Is.EqualTo(2));
            Assert.That(flight.EvasionEnergy, Is.LessThan(11));
        }

        [Test]
        public void CancelledHeldBreakKeepsItsCostAndNeedsAReleasedButtonBeforeRestart()
        {
            var flight = new FlightState(); var held = new FlightInput(Vector2.right, 0, false, true);
            Advance(flight, .25f, held); float paidEnergy = flight.EvasionEnergy;
            flight.CancelHeldBreak();
            Assert.That(flight.BreakActive, Is.False); Assert.That(flight.BreaksCompleted, Is.Zero);
            Assert.That(flight.EvasionEnergy, Is.EqualTo(paidEnergy));
            foreach (float dt in new[] { 0, -1, float.NaN }) flight.Tick(dt, held);
            Assert.That(flight.EvasionEnergy, Is.EqualTo(paidEnergy));
            Advance(flight, 1, held);
            Assert.That(flight.BreakSerial, Is.EqualTo(1)); Assert.That(flight.BreakActive, Is.False);
            flight.Tick(1f / 60, default); flight.Tick(1f / 60, held);
            Assert.That(flight.BreakSerial, Is.EqualTo(2)); Assert.That(flight.HeldBreakActive, Is.True);
            flight.Reset(); Advance(flight, .1f, held);
            Assert.That(flight.BreakSerial, Is.EqualTo(1)); Assert.That(flight.EvasionEnergy, Is.EqualTo(72).Within(.001));
        }

        [Test]
        public void HeldBreakUsesTheSameResourceAndHeadingAtThirtyAndOneHundredTwentyHz()
        {
            var slow = new FlightState(); var fast = new FlightState();
            var held = new FlightInput(new Vector2(.7f, -.3f), 0, false, true);
            Advance(slow, 1.2f, held, 30); Advance(fast, 1.2f, held, 120);
            Assert.That(Vector3.Distance(slow.Position, fast.Position), Is.LessThan(.02));
            Assert.That(Vector3.Angle(slow.Forward, fast.Forward), Is.LessThan(.02));
            Assert.That(slow.EvasionEnergy, Is.EqualTo(39).Within(.003));
            Assert.That(slow.EvasionEnergy, Is.EqualTo(fast.EvasionEnergy).Within(.003));
            Assert.That(slow.BreakElapsed, Is.EqualTo(1.2f).Within(.001));
            Advance(slow, 1.8f); Advance(fast, 1.8f);
            Assert.That(slow.EvasionEnergy, Is.EqualTo(fast.EvasionEnergy).Within(.003));
        }

        [Test]
        public void EvasionRewardsAreBoundedAndDoNotChangeManeuverOrBoostState()
        {
            var flight = new FlightState(); flight.RequestRoll(1);
            flight.AddEvasion(15);
            Assert.That(flight.EvasionEnergy, Is.EqualTo(75)); Assert.That(flight.RollActive, Is.True);
            Assert.That(flight.RollSerial, Is.EqualTo(1)); Assert.That(flight.BoostEnergy, Is.EqualTo(4.5f));
            foreach (float amount in new[] { 0, -15, float.NaN, float.PositiveInfinity }) flight.AddEvasion(amount);
            Assert.That(flight.EvasionEnergy, Is.EqualTo(75));
            flight.AddEvasion(float.MaxValue); Assert.That(flight.EvasionEnergy, Is.EqualTo(100));
            Advance(flight, flight.Tuning.RollDuration);
            Assert.That(flight.RequestRoll(1), Is.False, "A resource reward must not clear maneuver cooldown.");
        }

        [Test]
        public void BoostRefillClearsExhaustionWithoutChangingSpeedEvasionOrInput()
        {
            var flight = new FlightState(); Advance(flight, 4.6f, new FlightInput(Vector2.zero, 0, true));
            Assert.That(flight.BoostLocked, Is.True);
            float speed = flight.Speed;
            flight.RefillBoost(); flight.RefillBoost();
            Assert.That(flight.BoostEnergy, Is.EqualTo(flight.Tuning.BoostCapacity)); Assert.That(flight.BoostLocked, Is.False);
            Assert.That(flight.Speed, Is.EqualTo(speed)); Assert.That(flight.EvasionEnergy, Is.EqualTo(100));
            Assert.That(flight.Boosting, Is.False, "Only fresh live input should decide whether to spend the refill.");
            flight.Tick(1f / 60, new FlightInput(Vector2.zero, 0, true));
            Assert.That(flight.Boosting, Is.True); Assert.That(flight.BoostEnergy, Is.LessThan(flight.Tuning.BoostCapacity));
        }

        [Test]
        public void DefaultSpeedMultiplierPreservesFlightExactlyAndInvalidMultiplierDoesNotCorruptState()
        {
            var baseline = new FlightState(); var explicitDefault = new FlightState(); var invalid = new FlightState();
            for (int frame = 0; frame < 240; frame++)
            {
                if (frame == 30) { baseline.RequestRoll(1); explicitDefault.RequestRoll(1); invalid.RequestRoll(1); }
                var input = new FlightInput(new Vector2(.2f, -.1f), .1f, frame > 180);
                baseline.Tick(1f / 60, input); explicitDefault.Tick(1f / 60, input, speedMultiplier: 1);
                invalid.Tick(1f / 60, input, speedMultiplier: float.NaN);
                Assert.That(explicitDefault.Position, Is.EqualTo(baseline.Position)); Assert.That(invalid.Position, Is.EqualTo(baseline.Position));
                Assert.That(explicitDefault.Speed, Is.EqualTo(baseline.Speed)); Assert.That(explicitDefault.BoostEnergy, Is.EqualTo(baseline.BoostEnergy));
            }
        }

        [Test]
        public void LatchMultiplierReducesActualTravelWithoutChangingThrottleAndReleaseRestoresIt()
        {
            var flight = new FlightState();
            for (int frame = 0; frame < 120; frame++)
                flight.Tick(1f / 60, new FlightInput(Vector2.zero, 0, true), boostAllowed: false, speedMultiplier: .7f);
            Assert.That(flight.Speed, Is.EqualTo(54 * .7f).Within(.001));
            Assert.That(flight.Velocity.magnitude, Is.EqualTo(54 * .7f).Within(.01));
            Assert.That(flight.CruiseSpeed, Is.EqualTo(54)); Assert.That(flight.Boosting, Is.False);
            Assert.That(flight.BoostEnergy, Is.EqualTo(4.5f)); Assert.That(flight.EvasionEnergy, Is.EqualTo(100));
            for (int frame = 0; frame < 60; frame++) flight.Tick(1f / 60, default);
            Assert.That(flight.Speed, Is.EqualTo(54).Within(.001));
            flight.Tick(1f / 60, new FlightInput(Vector2.zero, 0, true));
            Assert.That(flight.Boosting, Is.True);
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
