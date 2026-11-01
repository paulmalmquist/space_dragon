using System;
using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class CollisionImpactTests
    {
        [Test]
        public void HeadOnImpactIsFatalAtTheLegacyNormalSpeedThreshold()
        {
            var result = CollisionImpact.Evaluate(Vector3.forward * 65, Vector3.back * 9, 100);
            Assert.That(result.Fatal, Is.True); Assert.That(result.Damage, Is.EqualTo(100));
            Assert.That(result.Speed, Is.EqualTo(65)); Assert.That(result.NormalSpeed, Is.EqualTo(65));
            Assert.That(result.DeflectedVelocity.z, Is.EqualTo(-22.75f).Within(.0001));
            Assert.That(CollisionImpact.Evaluate(Vector3.forward * 64.99f, Vector3.back).Fatal, Is.False);
        }

        [Test]
        public void FastGrazePreservesTangentialMotionAndPushesOutward()
        {
            var incoming = new Vector3(145, -10, 0);
            var result = CollisionImpact.Evaluate(incoming, Vector3.up, 100);
            Assert.That(result.Fatal, Is.False); Assert.That(result.Damage, Is.EqualTo(16));
            Assert.That(result.NormalSpeed, Is.EqualTo(10));
            Assert.That(result.DeflectedVelocity.x, Is.EqualTo(118.9f).Within(.0001));
            Assert.That(result.DeflectedVelocity.y, Is.EqualTo(6));
            Assert.That(CollisionImpact.Evaluate(incoming, Vector3.up, 16).Fatal, Is.True);
            Assert.That(CollisionImpact.Evaluate(incoming, Vector3.up, 0).Damage, Is.EqualTo(16));
        }

        [Test]
        public void MovingAwayStillResolvesEmbeddedContactWithoutInventingIncomingSpeed()
        {
            var result = CollisionImpact.Evaluate(new Vector3(0, 20, 4), Vector3.up);
            Assert.That(result.NormalSpeed, Is.Zero); Assert.That(result.Damage, Is.EqualTo(12));
            Assert.That(result.DeflectedVelocity.y, Is.EqualTo(6)); Assert.That(result.DeflectedVelocity.z, Is.EqualTo(3.28f).Within(.00001));
        }

        [TestCase(true)] [TestCase(false)]
        public void ContactRestoresAnOutsidePoseWithoutRefundOrReapplyingRollOffset(bool roll)
        {
            var state = new FlightState();
            if (roll) state.RequestRoll(1); else state.RequestBreak(1);
            for (int i = 0; i < 15; i++) state.Tick(1f / 60, new FlightInput(Vector2.zero));
            var position = new Vector3(0, 16, 50); // Rock surface plus independent hull clearance supplied by scene.
            var velocity = new Vector3(20, 6, 8);
            float boost = state.BoostEnergy, evasion = state.EvasionEnergy, cruise = state.CruiseSpeed;
            int serial = state.ManeuverSerial;
            state.ResolveContact(position, velocity);
            Assert.That(state.Position, Is.EqualTo(position)); Assert.That(state.Velocity, Is.EqualTo(velocity));
            Assert.That(state.Speed, Is.EqualTo(velocity.magnitude));
            Assert.That(Vector3.Distance(state.Forward, velocity.normalized), Is.LessThan(.00001));
            Assert.That(state.BoostEnergy, Is.EqualTo(boost)); Assert.That(state.EvasionEnergy, Is.EqualTo(evasion));
            Assert.That(state.CruiseSpeed, Is.EqualTo(cruise)); Assert.That(state.ManeuverSerial, Is.EqualTo(serial));
            Assert.That(state.RollsCompleted + state.BreaksCompleted, Is.Zero);
            Assert.That(state.RollActive || state.BreakActive || state.Boosting, Is.False);
            Assert.That(state.RollOffset, Is.EqualTo(Vector3.zero)); Assert.That(state.RollAngle, Is.Zero);
            Assert.That(state.RequestRoll(1), Is.False); // Interrupted maneuver still has its normal cooldown.
            state.Tick(1f / 60, default);
            Assert.That(state.Position.y, Is.GreaterThan(position.y));
            Assert.That(Vector3.Distance(state.Position, position), Is.LessThan(1));
        }

        [Test]
        public void InvalidInputsFailBeforeMutatingFlight()
        {
            Assert.Throws<ArgumentException>(() => CollisionImpact.Evaluate(Vector3.forward, Vector3.zero));
            Assert.Throws<ArgumentException>(() => CollisionImpact.Evaluate(Vector3.forward, Vector3.up, float.NaN));
            Assert.Throws<ArgumentException>(() => CollisionImpact.Evaluate(new Vector3(float.PositiveInfinity, 0, 0), Vector3.up));
            var state = new FlightState(); state.Tick(.05f, default); var before = state.Position;
            Assert.Throws<ArgumentException>(() => state.ResolveContact(new Vector3(0, float.NaN, 0), Vector3.forward));
            Assert.That(state.Position, Is.EqualTo(before));
            state.ResolveContact(Vector3.one, Vector3.zero);
            Assert.That(state.Speed, Is.Zero); Assert.That(state.Forward, Is.EqualTo(Vector3.forward));
        }
    }
}
