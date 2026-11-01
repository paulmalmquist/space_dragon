using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class HomingMissileTests
    {
        DogfightTuning tuning;
        [SetUp] public void SetUp() { tuning = ScriptableObject.CreateInstance<DogfightTuning>(); }
        [TearDown] public void TearDown() { Object.DestroyImmediate(tuning); }

        [Test] public void TurnIsBoundedAndMovementNeverSnapsToTarget()
        {
            var missile = new HomingMissile(Vector3.zero, Vector3.forward, tuning);
            var target = Vector3.right * 1000;
            missile.Step(.1f, target);
            Assert.That(Vector3.Angle(Vector3.forward, missile.Forward), Is.LessThanOrEqualTo(tuning.MissileTurnDegreesPerSecond * .1f + .01f));
            Assert.That(missile.PreviousPosition, Is.EqualTo(Vector3.zero));
            Assert.That(missile.Position.magnitude, Is.LessThanOrEqualTo(tuning.MissileSpeed * .1f + .01f));
            Assert.That(Vector3.Distance(missile.Position, target), Is.GreaterThan(900));
            Vector3 last = missile.Position; missile.Step(.1f, target); Assert.That(missile.PreviousPosition, Is.EqualTo(last));
        }

        [Test] public void AHardCrossingTargetCanEvadeAndMissileExpiresWithoutGuaranteedHit()
        {
            tuning.MissileTurnDegreesPerSecond = 12;
            tuning.MissileLifetimeSeconds = 2;
            var missile = new HomingMissile(Vector3.zero, Vector3.forward, tuning);
            Vector3 target = new Vector3(0, 0, 120), velocity = Vector3.right * 250;
            float closest = float.MaxValue;
            for (int i = 0; i < 240; i++)
            {
                target += velocity / 120; missile.Step(1f / 120, target, velocity);
                closest = Mathf.Min(closest, Vector3.Distance(missile.Position, target));
            }
            Assert.That(closest, Is.GreaterThan(20)); Assert.That(missile.Alive, Is.False);
        }

        [Test] public void NoTurnSettingExposesContinuousSegmentsForSceneCollision()
        {
            tuning.MissileTurnDegreesPerSecond = 0; tuning.MissileSpeed = 100;
            var missile = new HomingMissile(Vector3.zero, Vector3.forward, tuning);
            missile.Step(.1f, Vector3.right * 100);
            Assert.That(missile.Position.z, Is.EqualTo(10).Within(.001f));
            Assert.That(missile.Position.x, Is.Zero.Within(.001f));
            // A scene raycast can see the obstacle at z=5 between the exposed endpoints.
            Assert.That(missile.PreviousPosition.z, Is.LessThan(5)); Assert.That(missile.Position.z, Is.GreaterThan(5));
            missile.Expire(); var stopped = missile.Position; missile.Step(1, Vector3.one);
            Assert.That(missile.Position, Is.EqualTo(stopped)); Assert.That(missile.Alive, Is.False);
        }

        [Test] public void LongStepStopsAtLifetimeAndRejectsInvalidTime()
        {
            tuning.MissileLifetimeSeconds = 1; tuning.MissileSpeed = 100; tuning.MissileTurnDegreesPerSecond = 0;
            var missile = new HomingMissile(Vector3.zero, Vector3.forward, tuning);
            missile.Step(float.NaN, Vector3.forward * 1000); missile.Step(-1, Vector3.zero);
            Assert.That(missile.Position, Is.EqualTo(Vector3.zero)); missile.Step(20, Vector3.forward * 1000);
            Assert.That(missile.Position.z, Is.EqualTo(100).Within(.01f)); Assert.That(missile.Alive, Is.False);
            Assert.That(missile.Age, Is.EqualTo(1).Within(.0001f));
        }
    }
}
