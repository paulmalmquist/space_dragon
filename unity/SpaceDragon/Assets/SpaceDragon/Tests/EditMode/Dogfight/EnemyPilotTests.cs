using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class EnemyPilotTests
    {
        private const float Step = 1f / 60;
        private static void Track(FlightState flight, EnemyPilot enemy, float seconds, FlightInput input = default, float startTime = 0)
        {
            int count = Mathf.CeilToInt(seconds * 60);
            for (int frame = 1; frame <= count; frame++)
            {
                flight.Tick(seconds / count, input);
                enemy.Tick(seconds / count, startTime + frame * seconds / count, flight);
            }
        }

        [Test]
        public void SteadyFlightTelegraphsBeforeAccurateBurstFireAndMotionDegradesTracking()
        {
            var flight = new FlightState(); var enemy = new EnemyPilot(0);
            Track(flight, enemy, .6f);
            Assert.That(enemy.CanFire, Is.False); Assert.That(enemy.TargetProgress, Is.GreaterThan(.5)); Assert.That(enemy.ShotSerial, Is.Zero);
            Track(flight, enemy, .7f, startTime: .6f);
            Assert.That(enemy.Locked, Is.True); Assert.That(enemy.ShotSerial, Is.GreaterThan(0));
            Assert.That(enemy.Motion, Is.LessThan(.001));
            var turning = new FlightState(); var turningEnemy = new EnemyPilot(0);
            Track(turning, turningEnemy, 2, new FlightInput(new Vector2(-1, 0)));
            Assert.That(turningEnemy.Motion, Is.GreaterThan(.9)); Assert.That(turningEnemy.TargetProgress, Is.LessThan(.1));
            Assert.That(turningEnemy.Locked, Is.False);
        }

        [Test]
        public void StandoffStaysAheadWithRestrainedStrafingAndContinuousIncomingFire()
        {
            var flight = new FlightState(); var enemies = new[] { new EnemyPilot(0), new EnemyPilot(1), new EnemyPilot(2) };
            var minimumX = new[] { float.MaxValue, float.MaxValue, float.MaxValue };
            var maximumX = new[] { float.MinValue, float.MinValue, float.MinValue };
            int shots = 0; float firstShotTime = -1; bool locked = false, firing = false;
            for (int frame = 1; frame <= 1200; frame++)
            {
                flight.Tick(Step, default);
                for (int index = 0; index < enemies.Length; index++)
                {
                    var enemy = enemies[index]; var shot = enemy.Tick(Step, frame * Step, flight);
                    if (shot.HasValue)
                    {
                        shots++; if (firstShotTime < 0) firstShotTime = frame * Step;
                        Assert.That(shot.Value.Direction.magnitude, Is.EqualTo(1).Within(.00001));
                        Assert.That(shot.Value.Serial, Is.EqualTo(enemy.ShotSerial)); Assert.That(shot.Value.EnemyId, Is.EqualTo(index));
                    }
                    locked |= enemy.Locked; firing |= enemy.Firing;
                    Vector3 relative = enemy.Position - flight.Position;
                    Assert.That(relative.magnitude, Is.InRange(230, 550)); Assert.That(relative.z, Is.GreaterThan(220));
                    Assert.That(enemy.Velocity.z, Is.GreaterThan(0)); Assert.That(enemy.Forward.z, Is.LessThan(0));
                    minimumX[index] = Mathf.Min(minimumX[index], relative.x); maximumX[index] = Mathf.Max(maximumX[index], relative.x);
                }
            }
            Assert.That(shots, Is.GreaterThanOrEqualTo(18)); Assert.That(firstShotTime, Is.GreaterThanOrEqualTo(.75f));
            Assert.That(locked && firing, Is.True);
            for (int i = 0; i < enemies.Length; i++) Assert.That(maximumX[i] - minimumX[i], Is.InRange(15, 60));
        }

        [Test]
        public void AnAcceptedRollClearsQueuedFireOnceAndEnforcesTrackingHoldoff()
        {
            var flight = new FlightState(); var enemy = new EnemyPilot(0); Track(flight, enemy, 1.3f);
            Assert.That(enemy.Locked, Is.True); int shots = enemy.ShotSerial;
            Assert.That(flight.RequestRoll(1), Is.True); flight.Tick(Step, default);
            Assert.That(enemy.Tick(Step, 1.3f + Step, flight), Is.Null);
            Assert.That(enemy.TargetProgress, Is.Zero); Assert.That(enemy.BurstRemaining, Is.Zero); Assert.That(enemy.LockBreaks, Is.EqualTo(1));
            Track(flight, enemy, 1, startTime: 1.3f + Step);
            Assert.That(enemy.ShotSerial, Is.EqualTo(shots)); Assert.That(enemy.LockBreaks, Is.EqualTo(1));
            Assert.That(enemy.Locked || enemy.CanFire, Is.False);
        }

        [Test]
        public void BreakTurnEscapesAnExistingBallisticLeadWithoutGrantingImmunityOrClearingLockSerial()
        {
            bool Run(bool dodge)
            {
                var flight = new FlightState(); var enemy = new EnemyPilot(0); Track(flight, enemy, 1.3f);
                Vector3 bullet = flight.Position + Vector3.forward * 180;
                Vector3 direction = enemy.Aim(bullet, flight, 0);
                for (int frame = 0; frame < 180; frame++)
                {
                    if (dodge && frame == 6) Assert.That(flight.RequestBreak(1), Is.True);
                    Vector3 before = bullet - flight.Position;
                    flight.Tick(Step, default); bullet += direction * enemy.Tuning.ProjectileSpeed * Step;
                    Vector3 after = bullet - flight.Position, delta = after - before;
                    float t = delta.sqrMagnitude > 0 ? Mathf.Clamp01(-Vector3.Dot(before, delta) / delta.sqrMagnitude) : 0;
                    // The same independent 3.3m gameplay sphere plus 1m enemy-projectile padding.
                    if ((before + delta * t).magnitude < 4.3f) return true;
                }
                Assert.That(enemy.LockBreaks, Is.Zero); return false;
            }
            Assert.That(Run(false), Is.True); Assert.That(Run(true), Is.False);
        }

        [Test]
        public void RapidTurnsBoostAndEvasionStaySeparatedWithContinuousBoundedTravel()
        {
            var flight = new FlightState(); var enemies = new[] { new EnemyPilot(0), new EnemyPilot(1), new EnemyPilot(2) };
            float minimum = float.MaxValue;
            for (int frame = 1; frame <= 1800; frame++)
            {
                var input = frame < 220 ? new FlightInput(new Vector2(-1, 0), 0, true) :
                    frame < 500 ? new FlightInput(new Vector2(1, 1)) : frame < 800 ? new FlightInput(new Vector2(-1, -1)) : default;
                if (frame == 120) Assert.That(flight.RequestRoll(1), Is.True);
                if (frame == 240) Assert.That(flight.RequestBreak(-1), Is.True);
                flight.Tick(Step, input);
                foreach (var enemy in enemies)
                {
                    Vector3 before = enemy.Position; enemy.Tick(Step, frame * Step, flight);
                    minimum = Mathf.Min(minimum, Vector3.Distance(enemy.Position, flight.Position));
                    Assert.That(enemy.RelativeVelocity.magnitude, Is.LessThanOrEqualTo(20.001f));
                    Assert.That(Vector3.Distance(enemy.Position, before), Is.LessThanOrEqualTo((148 + 20) * Step + .001f));
                    Assert.That(Vector3.Distance((enemy.Position - before) / Step, enemy.Velocity), Is.LessThan(.001));
                    Assert.That(float.IsNaN(enemy.Position.x), Is.False);
                }
            }
            Assert.That(minimum, Is.GreaterThan(150), "Formation steering must not cut through the dragon.");
        }

        [Test]
        public void ATooCloseStationRetreatsGraduallyInsteadOfTeleportingToTheDistanceFloor()
        {
            var flight = new FlightState(); var enemy = new EnemyPilot(0, new Vector3(0, 0, 140));
            Vector3 before = enemy.Position; flight.Tick(Step, default); enemy.Tick(Step, Step, flight);
            Assert.That(Vector3.Distance(enemy.Position, before), Is.LessThan((54 + 20) * Step));
            Assert.That(Vector3.Distance(enemy.Position, flight.Position), Is.LessThan(150));
            Track(flight, enemy, 4, startTime: Step);
            Assert.That(Vector3.Distance(enemy.Position, flight.Position), Is.GreaterThan(160));
        }

        [Test]
        public void PausedTimeAndDestroyedEnemyCannotFireAndResetRestoresTheEncounter()
        {
            var flight = new FlightState(); var enemy = new EnemyPilot(0); Track(flight, enemy, 1.3f);
            Vector3 position = enemy.Position; int serial = enemy.ShotSerial; float progress = enemy.TargetProgress;
            foreach (float dt in new[] { 0, -1, float.NaN, float.PositiveInfinity }) Assert.That(enemy.Tick(dt, 50, flight), Is.Null);
            Assert.That(enemy.Position, Is.EqualTo(position)); Assert.That(enemy.ShotSerial, Is.EqualTo(serial)); Assert.That(enemy.TargetProgress, Is.EqualTo(progress));
            Assert.That(enemy.Tick(.1f, 50, flight, false), Is.Null); Assert.That(enemy.Position, Is.EqualTo(position));
            Assert.That(enemy.BurstRemaining, Is.Zero); Assert.That(enemy.Locked || enemy.Firing || enemy.Eligible, Is.False);
            enemy.Reset(); Assert.That(enemy.Position, Is.EqualTo(enemy.StationOffset)); Assert.That(enemy.RelativeVelocity, Is.EqualTo(Vector3.zero));
            Assert.That(enemy.ShotSerial, Is.Zero); Assert.That(enemy.LockBreaks, Is.Zero);
        }

        [Test]
        public void StationTravelIsComparableAtThirtyAndOneHundredTwentyHz()
        {
            Vector3 Run(int fps)
            {
                var flight = new FlightState(); var enemy = new EnemyPilot(1);
                for (int frame = 1; frame <= fps * 20; frame++) { flight.Tick(1f / fps, default); enemy.Tick(1f / fps, (float)frame / fps, flight); }
                return enemy.Position;
            }
            Assert.That(Vector3.Distance(Run(30), Run(120)), Is.LessThan(.35));
        }
    }
}
