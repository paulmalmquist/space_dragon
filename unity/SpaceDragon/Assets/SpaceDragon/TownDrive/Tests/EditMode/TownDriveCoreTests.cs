using System;
using System.IO;
using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.TownDrive.Tests
{
    [Serializable] public sealed class RouteQueryFixture { public double s, speed; public RouteSample point, lane; public string label; }
    [Serializable] public sealed class NearestQueryFixture { public double x, z, preferredS; public bool hasPreferredS; public NearestRoutePoint expected; }
    [Serializable] public sealed class InputStepFixture { public DriveInput input; public int ticks; }
    [Serializable] public sealed class ScenarioFixture { public string name; public DriveState initial, expected; public InputStepFixture[] steps; public DriveObstacle[] obstacles; }
    [Serializable] public sealed class CheckpointFixture { public string name; public DriveState previous, next, expected; }
    [Serializable] public sealed class ResetFixture { public string name; public DriveState state, expected; }
    [Serializable] public sealed class PresentationFixture { public string name; public DriveState previous, current; public double alpha; public bool paused, snap; public DrivePose expected; }
    [Serializable] public sealed class TownDriveFixtures
    {
        public int schemaVersion;
        public string sourceFingerprint;
        public double tolerance;
        public RouteQueryFixture[] routeQueries;
        public NearestQueryFixture[] nearestQueries;
        public ScenarioFixture[] scenarios;
        public CheckpointFixture[] checkpoints;
        public ResetFixture[] resets;
        public PresentationFixture[] presentations;
    }

    public sealed class TownDriveCoreTests
    {
        private const string Fingerprint = "ebfd1afb10cbe59c88c0bd0143e5e4a77a15dec5d8f09c5628b38041317286da";
        private const double Tolerance = 1e-7;
        private TownDriveData data;
        private TownDriveFixtures fixtures;
        private DriveRoute route;
        private DriveSimulation simulation;

        [SetUp]
        public void LoadFrozenReferenceData()
        {
            var directory = Path.Combine(Application.dataPath, "SpaceDragon", "TownDrive");
            data = JsonUtility.FromJson<TownDriveData>(File.ReadAllText(Path.Combine(directory, "Data", "town-drive-v001.json")));
            fixtures = JsonUtility.FromJson<TownDriveFixtures>(File.ReadAllText(Path.Combine(directory, "Tests", "EditMode", "Fixtures", "town-drive-fixtures-v001.json")));
            route = new DriveRoute(data.route); simulation = new DriveSimulation(route);
        }

        [Test]
        public void FrozenExportRetainsCorrectedGeographyAndCompatibilityIds()
        {
            Assert.That(data.schemaVersion, Is.EqualTo(1)); Assert.That(fixtures.schemaVersion, Is.EqualTo(1));
            Assert.That(data.sourceFingerprint, Is.EqualTo(Fingerprint)); Assert.That(fixtures.sourceFingerprint, Is.EqualTo(Fingerprint));
            Assert.That(data.sourceHashes.Length, Is.EqualTo(40)); Assert.That(data.routeId, Is.EqualTo("town-drive-v1"));
            Assert.That(data.route.id, Is.EqualTo(data.routeId)); Assert.That(data.route.samples.Length, Is.EqualTo(764));
            Assert.That(data.route.sections.Length, Is.EqualTo(6)); Assert.That(data.route.checkpoints.Length, Is.EqualTo(5));
            Near(route.Length, 4455.219725393398, "mapped route length");
            Near(data.route.sections[0].endS, 407.9437201393233, "home exit to combined carriageway centre");
            Assert.That(data.route.turns[0].direction, Is.EqualTo("right")); Assert.That(data.route.turns[1].direction, Is.EqualTo("left")); Assert.That(data.route.turns[2].direction, Is.EqualTo("right"));
            Assert.That(route.LabelAt(240), Is.EqualTo("Winston Trails South"));
            Assert.That(data.closureObstacles.Length, Is.EqualTo(278)); Assert.That(data.config.IsValid(), Is.True);
            Assert.That(data.attribution, Does.Contain("OpenStreetMap"));
        }

        [Test]
        public void EveryExportedDistanceAndLaneQueryMatchesTheTypeScriptOracle()
        {
            Assert.That(fixtures.routeQueries.Length, Is.GreaterThan(150));
            foreach (var query in fixtures.routeQueries)
            {
                Sample(route.PointAtDistance(query.s), query.point, "point " + query.s);
                Sample(route.LanePoseAt(query.s), query.lane, "lane " + query.s);
                Assert.That(route.LabelAt(query.s), Is.EqualTo(query.label)); Near(route.RecommendedSpeedAt(query.s), query.speed, "recommended speed");
            }
        }

        [Test]
        public void NearestQueriesPreservePreferredProgressAtTheSharedCourtStem()
        {
            Assert.That(fixtures.nearestQueries.Length, Is.GreaterThan(200));
            foreach (var query in fixtures.nearestQueries)
            {
                var actual = route.Nearest(query.x, query.z, query.hasPreferredS ? query.preferredS : (double?)null);
                Near(actual.x, query.expected.x, "nearest x"); Near(actual.z, query.expected.z, "nearest z");
                Near(actual.s, query.expected.s, "nearest s"); Near(actual.yaw, query.expected.yaw, "nearest yaw");
                Near(actual.distance, query.expected.distance, "nearest distance"); Near(actual.signedOffset, query.expected.signedOffset, "nearest offset");
                Assert.That(actual.sectionIndex, Is.EqualTo(query.expected.sectionIndex));
            }
            double inboundS = data.route.bulbStartS - 10; var point = route.LanePoseAt(inboundS);
            var inbound = route.Nearest(point.x, point.z, inboundS); var outbound = route.Nearest(point.x, point.z, 10);
            Assert.That(inbound.sectionIndex, Is.EqualTo(5)); Assert.That(outbound.sectionIndex, Is.Zero);
            Assert.That(Math.Abs(Angle(inbound.yaw, outbound.yaw)), Is.GreaterThan(3));
            Assert.That(simulation.Step(simulation.CreateState(), new DriveInput { throttle = 1 }).routeS, Is.LessThan(1));
        }

        [Test]
        public void SemanticReplayMatchesReferenceForCapsAssistBrakingSlidesContactAndPause()
        {
            foreach (var scenario in fixtures.scenarios)
            {
                string before = JsonUtility.ToJson(scenario.initial);
                var state = scenario.initial;
                foreach (var step in scenario.steps) for (int tick = 0; tick < step.ticks; tick++) state = simulation.Step(state, step.input, data.config, scenario.obstacles);
                State(state, scenario.expected, scenario.name);
                Assert.That(JsonUtility.ToJson(scenario.initial), Is.EqualTo(before), "Replay mutated initial state: " + scenario.name);
            }
        }

        [Test]
        public void OrderedCheckpointsRejectSkippedBackwardRepeatedAndWrongHeadingTriggers()
        {
            foreach (var fixture in fixtures.checkpoints)
            {
                string before = JsonUtility.ToJson(fixture.next);
                State(simulation.UpdateCheckpoints(fixture.previous, fixture.next), fixture.expected, fixture.name);
                Assert.That(JsonUtility.ToJson(fixture.next), Is.EqualTo(before));
            }
        }

        [Test]
        public void ResetPreservesProgressAndClockButClearsMotionAndRecoversOnlyToCheckpoint()
        {
            foreach (var fixture in fixtures.resets)
            {
                string before = JsonUtility.ToJson(fixture.state);
                var restored = simulation.Reset(fixture.state); State(restored, fixture.expected, fixture.name);
                Assert.That(JsonUtility.ToJson(fixture.state), Is.EqualTo(before));
                Assert.That(restored.visited, Is.Not.SameAs(fixture.state.visited));
            }
            var running = simulation.CreateState(); running.elapsedSeconds = 22; running.speed = 12;
            Assert.That(simulation.Step(running, new DriveInput { paused = true }), Is.SameAs(running));
        }

        [Test]
        public void InterpolationMatchesWrapPauseTeleportAndClockDiscontinuityReference()
        {
            foreach (var fixture in fixtures.presentations)
            {
                string before = JsonUtility.ToJson(fixture.current);
                var pose = DrivePresentation.Interpolate(fixture.previous, fixture.current, fixture.alpha, fixture.paused, fixture.snap);
                Near(pose.x, fixture.expected.x, fixture.name); Near(pose.z, fixture.expected.z, fixture.name);
                Near(pose.yaw, fixture.expected.yaw, fixture.name); Near(pose.speed, fixture.expected.speed, fixture.name);
                Assert.That(JsonUtility.ToJson(fixture.current), Is.EqualTo(before));
            }
        }

        [Test]
        public void UnevenThirtySixtyAnd144HzPresentationKeepsOneContinuousDisplayedPose()
        {
            foreach (var schedule in new[] { new[] { 1.0 / 30 }, new[] { 1.0 / 60 }, new[] { 1.0 / 144 }, new[] { .007, .028, .011, .019 } })
            {
                double elapsed = 0;
                for (int frame = 0; frame < 500; frame++)
                {
                    elapsed += schedule[frame % schedule.Length]; int tick = (int)Math.Floor(elapsed / DriveSimulation.StepSeconds);
                    if (tick < 1) continue;
                    var previous = LinearState((tick - 1) * DriveSimulation.StepSeconds); var current = LinearState(tick * DriveSimulation.StepSeconds);
                    double alpha = (elapsed - tick * DriveSimulation.StepSeconds) / DriveSimulation.StepSeconds;
                    var displayed = DrivePresentation.Interpolate(previous, current, alpha);
                    double displayedTime = elapsed - DriveSimulation.StepSeconds;
                    Near(displayed.x, displayedTime * 12, "continuous x"); Near(displayed.z, displayedTime * 3, "continuous z"); Near(displayed.yaw, displayedTime * .02, "continuous heading");
                }
            }
        }

        [Test]
        public void ARealSemanticDriverCompletesTheEntireCurveAndSharedBulbWithoutBonks()
        {
            var state = simulation.CreateState(); int contacts = 0; bool sawReturn = false, sawBulb = false;
            for (int tick = 0; tick < 60 * 300 && !state.completed; tick++)
            {
                double limit = route.RecommendedSpeedAt(state.routeS);
                var target = route.LanePoseAt(state.routeS + (limit < 12 ? 3 + Math.Abs(state.speed) * .35 : 8 + Math.Abs(state.speed) * .55));
                double error = Angle(Math.Atan2(target.x - state.x, target.z - state.z), state.yaw);
                var input = new DriveInput { throttle = state.speed < limit ? 1 : 0, brake = state.speed > limit + .3 ? .5 : 0, steer = Math.Max(-1, Math.Min(1, error * 3)) };
                state = simulation.Step(state, input, data.config, data.closureObstacles);
                if (state.bonkSeconds == .35) contacts++;
                if (state.routeS > data.route.returnMappedStartS && state.routeS < data.route.bulbStartS) sawReturn = true;
                if (state.routeS > data.route.bulbStartS + 15 && state.routeS < route.Length - 10)
                { sawBulb = true; Assert.That(Math.Sqrt(state.x * state.x + state.z * state.z), Is.LessThan(10.5)); }
            }
            Assert.That(state.completed, Is.True, "Stopped at " + state.routeS); Assert.That(contacts, Is.Zero);
            Assert.That(sawReturn && sawBulb, Is.True); Assert.That(state.elapsedSeconds, Is.InRange(180, 300));
            Assert.That(state.visited, Is.EqualTo(new[] { "home", "leg-1", "leg-2", "leg-3", "leg-4" }));
            Assert.That(state.checkpointId, Is.EqualTo("home"));
            var reset = simulation.Reset(state); Assert.That(reset.completed, Is.True); Near(reset.x, route.Data.spawn.x, "completed reset x");
            Assert.That(simulation.UpdateCheckpoints(state, state), Is.SameAs(state));
        }

        [Test]
        public void InvalidInputAndRouteDataCannotIntroduceNonFiniteDrivingState()
        {
            var state = simulation.Step(simulation.CreateState(), new DriveInput { throttle = double.NaN, steer = double.NaN, brake = double.PositiveInfinity });
            Assert.That(double.IsNaN(state.x) || double.IsNaN(state.z) || double.IsNaN(state.speed), Is.False);
            var badRoute = JsonUtility.FromJson<TownDriveData>(JsonUtility.ToJson(data)).route;
            badRoute.samples[3].s = badRoute.samples[2].s; Assert.Throws<ArgumentException>(() => new DriveRoute(badRoute));
            var config = new DriveConfig { topSpeed = double.NaN }; Assert.That(config.IsValid(), Is.False);
            Assert.That(DrivePresentation.SmoothSteering(.2, 1, .1, true), Is.EqualTo(.2));
        }

        private static DriveState LinearState(double time) => new DriveState { x = time * 12, z = time * 3, yaw = time * .02, speed = 12, elapsedSeconds = time };
        private static double Angle(double to, double from) => Math.Atan2(Math.Sin(to - from), Math.Cos(to - from));
        private static void Near(double actual, double expected, string label) => Assert.That(actual, Is.EqualTo(expected).Within(Tolerance), label);
        private static void Sample(RouteSample actual, RouteSample expected, string label)
        { Near(actual.x, expected.x, label); Near(actual.z, expected.z, label); Near(actual.yaw, expected.yaw, label); Near(actual.s, expected.s, label); Assert.That(actual.sectionIndex, Is.EqualTo(expected.sectionIndex)); }
        private static void State(DriveState actual, DriveState expected, string label)
        {
            Near(actual.x, expected.x, label + ".x"); Near(actual.z, expected.z, label + ".z"); Near(actual.yaw, expected.yaw, label + ".yaw"); Near(actual.speed, expected.speed, label + ".speed");
            Near(actual.velocityX, expected.velocityX, label + ".velocityX"); Near(actual.velocityZ, expected.velocityZ, label + ".velocityZ"); Near(actual.routeS, expected.routeS, label + ".routeS");
            Near(actual.stuckSeconds, expected.stuckSeconds, label + ".stuckSeconds"); Near(actual.bonkSeconds, expected.bonkSeconds, label + ".bonkSeconds"); Near(actual.elapsedSeconds, expected.elapsedSeconds, label + ".elapsedSeconds");
            Assert.That(actual.checkpointId, Is.EqualTo(expected.checkpointId), label); Assert.That(actual.visited, Is.EqualTo(expected.visited), label);
            Assert.That(actual.completed, Is.EqualTo(expected.completed), label); Assert.That(actual.assist, Is.EqualTo(expected.assist), label);
        }
    }
}
