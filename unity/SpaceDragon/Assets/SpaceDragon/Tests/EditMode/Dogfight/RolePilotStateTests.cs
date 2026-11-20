using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class RolePilotStateTests
    {
        DogfightTuning tuning;
        const float Step = 1f / 60;
        [SetUp] public void SetUp() { tuning = ScriptableObject.CreateInstance<DogfightTuning>(); tuning.EnableEnemyRoles = true; }
        [TearDown] public void TearDown() => Object.DestroyImmediate(tuning);

        [TestCase(0)] [TestCase(1)] [TestCase(2)]
        public void FighterDelegatesEveryPoseTargetingAndShotToTheUnchangedPilot(int slot)
        {
            var flight = new FlightState(); var role = new EnemyRoleState(EnemyRole.Fighter, tuning);
            var wrapper = new RolePilotState(slot, role, tuning); var baseline = new EnemyPilot(slot);
            for (int frame = 1; frame <= 1200; frame++)
            {
                if (frame == 120) Assert.That(flight.RequestRoll(1), Is.True);
                var input = frame > 300 && frame < 450 ? new FlightInput(new Vector2(.4f, -.2f), 0, true) : default;
                flight.Tick(Step, input);
                var expected = baseline.Tick(Step, frame * Step, flight);
                var actual = wrapper.Tick(Step, frame * Step, flight);
                Assert.That(wrapper.Position, Is.EqualTo(baseline.Position)); Assert.That(wrapper.Velocity, Is.EqualTo(baseline.Velocity));
                Assert.That(wrapper.Rotation, Is.EqualTo(baseline.Rotation)); Assert.That(wrapper.TargetProgress, Is.EqualTo(baseline.TargetProgress));
                Assert.That(wrapper.Locked, Is.EqualTo(baseline.Locked)); Assert.That(actual.HasValue, Is.EqualTo(expected.HasValue));
                if (actual.HasValue)
                {
                    Assert.That(actual.Value.Origin, Is.EqualTo(expected.Value.Origin)); Assert.That(actual.Value.Direction, Is.EqualTo(expected.Value.Direction));
                    Assert.That(actual.Value.Serial, Is.EqualTo(expected.Value.Serial)); Assert.That(actual.Value.EnemyId, Is.EqualTo(expected.Value.EnemyId));
                }
            }
        }

        [TestCase(EnemyRole.Racer)] [TestCase(EnemyRole.Grappler)] [TestCase(EnemyRole.Gunship)]
        public void DisabledRolesUseExactFighterMotion(EnemyRole requested)
        {
            tuning.EnableEnemyRoles = false;
            var role = new EnemyRoleState(requested, tuning); var wrapper = new RolePilotState(0, role, tuning);
            var baseline = new EnemyPilot(0); var player = new FlightState();
            for (int frame = 1; frame <= 180; frame++)
            {
                player.Tick(Step, default); baseline.Tick(Step, frame * Step, player); wrapper.Tick(Step, frame * Step, player);
                Assert.That(wrapper.Position, Is.EqualTo(baseline.Position)); Assert.That(wrapper.TargetProgress, Is.EqualTo(baseline.TargetProgress));
                Assert.That(wrapper.Pilot.ShotSerial, Is.EqualTo(baseline.ShotSerial));
            }
            Assert.That(role.Latched || role.ShieldIntact, Is.False);
        }

        [Test]
        public void RacerStrafesMoreQuicklyWhileGunshipKeepsSlowStandoff()
        {
            var player = new FlightState();
            var racer = new RolePilotState(0, new EnemyRoleState(EnemyRole.Racer, tuning), tuning);
            var gunship = new RolePilotState(1, new EnemyRoleState(EnemyRole.Gunship, tuning), tuning);
            float maximumRacerRelativeSpeed = 0, minX = float.MaxValue, maxX = float.MinValue;
            for (int frame = 1; frame <= 1800; frame++)
            {
                player.Tick(Step, default); racer.Tick(Step, frame * Step, player); gunship.Tick(Step, frame * Step, player);
                maximumRacerRelativeSpeed = Mathf.Max(maximumRacerRelativeSpeed, racer.Pilot.RelativeVelocity.magnitude);
                minX = Mathf.Min(minX, racer.Position.x); maxX = Mathf.Max(maxX, racer.Position.x);
                Assert.That(racer.Pilot.RelativeVelocity.magnitude, Is.LessThanOrEqualTo(tuning.RacerStationSpeed + .001f));
                Assert.That(gunship.Pilot.RelativeVelocity.magnitude, Is.LessThanOrEqualTo(tuning.GunshipStationSpeed + .001f));
                Assert.That((racer.Position - player.Position).z, Is.GreaterThan(220));
                Assert.That((gunship.Position - player.Position).z, Is.GreaterThan(220));
            }
            Assert.That(maximumRacerRelativeSpeed, Is.GreaterThan(40));
            Assert.That(maxX - minX, Is.GreaterThan(80));
            Assert.That(racer.Pilot.ShotSerial, Is.GreaterThan(0)); Assert.That(gunship.Pilot.ShotSerial, Is.GreaterThan(0));
        }

        [Test]
        public void GrapplerApproachesLatchesAndRollStunsItWithoutTeleportingOrGhostShots()
        {
            var player = new FlightState(); var role = new EnemyRoleState(EnemyRole.Grappler, tuning);
            var wrapper = new RolePilotState(0, role, tuning);
            int frame = 0;
            while (!role.Latched && frame++ < 600)
            {
                Vector3 before = wrapper.Position; player.Tick(Step, default);
                Assert.That(wrapper.Tick(Step, frame * Step, player), Is.Null);
                Assert.That(Vector3.Distance(before, wrapper.Position), Is.LessThanOrEqualTo((54 + tuning.GrapplerCloseSpeed) * Step + .001f));
            }
            Assert.That(role.Latched, Is.True); Assert.That(role.CanBoost, Is.False);
            for (int i = 0; i < 60; i++)
            { player.Tick(Step, default, boostAllowed: role.CanBoost, speedMultiplier: role.SpeedMultiplier); wrapper.Tick(Step, ++frame * Step, player); }
            Vector3 mount = player.Rotation * new Vector3(-Mathf.Abs(tuning.GrapplerLatchOffset.x), tuning.GrapplerLatchOffset.y, tuning.GrapplerLatchOffset.z);
            Assert.That(Vector3.Distance(wrapper.Position - player.Position, mount), Is.LessThan(.001));
            Assert.That(player.Speed, Is.EqualTo(54 * .7f).Within(.001));
            Assert.That(player.RequestRoll(1), Is.True); Assert.That(role.ShakeOff(), Is.True);
            float stunStartDistance = Vector3.Distance(wrapper.Position, player.Position);
            for (int i = 0; i < 100; i++)
            {
                player.Tick(Step, default); wrapper.Tick(Step, ++frame * Step, player);
                Assert.That(role.Latched, Is.False); Assert.That(role.Stunned, Is.True);
                Assert.That(wrapper.Locked, Is.False); Assert.That(wrapper.TargetProgress, Is.Zero);
            }
            Assert.That(Vector3.Distance(wrapper.Position, player.Position), Is.GreaterThan(stunStartDistance + 20));
            Assert.That(role.StunRemaining, Is.EqualTo(2 - 100 * Step).Within(.00001));
            wrapper.Reset(); Assert.That(role.Stunned || role.Latched, Is.False);
            Assert.That(wrapper.Position, Is.EqualTo(wrapper.Pilot.StationOffset));
        }

        [Test]
        public void GrapplerPauseDeathAndResetCannotAdvanceOrRetainAttachment()
        {
            var player = new FlightState(); var role = new EnemyRoleState(EnemyRole.Grappler, tuning);
            var wrapper = new RolePilotState(2, role, tuning); role.TryLatch(0); role.ShakeOff();
            Vector3 position = wrapper.Position;
            foreach (float dt in new[] { 0, -1, float.NaN, float.PositiveInfinity }) Assert.That(wrapper.Tick(dt, 90, player), Is.Null);
            Assert.That(wrapper.Position, Is.EqualTo(position)); Assert.That(role.StunRemaining, Is.EqualTo(2));
            role.ApplyDamage(WeaponKind.Primary, 999); wrapper.Tick(Step, Step, player);
            Assert.That(wrapper.Position, Is.EqualTo(position)); Assert.That(wrapper.Velocity, Is.EqualTo(Vector3.zero));
            wrapper.Reset(new Vector3(10, 20, 30));
            Assert.That(wrapper.Position, Is.EqualTo(new Vector3(10, 20, 30) + wrapper.Pilot.StationOffset));
            Assert.That(role.Dead || role.Latched || role.Stunned, Is.False);
        }
    }
}
