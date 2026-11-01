using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Security.Cryptography;
using System.Text.Json;
using SpaceDragon.TownDrive;

internal static class Program
{
    private static readonly JsonSerializerOptions Json = new JsonSerializerOptions { IncludeFields = true };
    private static int assertions, passed, failed;
    private static double maximumNumericError;
    private static readonly List<string> failures = new List<string>();

    private static int Main(string[] args)
    {
        try
        {
            var options = Arguments(args);
            string dataPath = options.TryGetValue("data", out var dataArgument) ? dataArgument : Path.Combine(AppContext.BaseDirectory, "town-drive-v001.json");
            string fixturePath = options.TryGetValue("fixtures", out var fixtureArgument) ? fixtureArgument : Path.Combine(AppContext.BaseDirectory, "town-drive-fixtures-v001.json");
            string sourceRoot = Assembly.GetExecutingAssembly().GetCustomAttributes<AssemblyMetadataAttribute>()
                .First(attribute => attribute.Key == "TownDriveCoreRoot").Value;
            using var dataDocument = JsonDocument.Parse(File.ReadAllText(dataPath));
            using var fixtureDocument = JsonDocument.Parse(File.ReadAllText(fixturePath));
            var data = Read<TownDriveData>(dataDocument.RootElement);
            var fixtures = fixtureDocument.RootElement;
            var fixtureCounts = new[] { "routeQueries", "nearestQueries", "scenarios", "checkpoints", "resets", "presentations" }
                .ToDictionary(key => key, key => fixtures.GetProperty(key).GetArrayLength());
            var route = new DriveRoute(data.route);
            var simulation = new DriveSimulation(route);
            object fullLap = null;
            Console.WriteLine("Compiled core: " + Path.GetFullPath(sourceRoot));
            Console.WriteLine("Data: " + Path.GetFullPath(dataPath));
            Console.WriteLine("Fixtures: " + Path.GetFullPath(fixturePath));
            Console.WriteLine("Source fingerprint: " + data.sourceFingerprint);
            var timer = Stopwatch.StartNew();

            Run("traffic and pedestrian TypeScript oracle", () =>
            {
                var ambient = AmbientParity.Verify(route, Path.Combine(AppContext.BaseDirectory, "town-drive-ambient-v001.json"));
                assertions += ambient.assertions;
                maximumNumericError = Math.Max(maximumNumericError, ambient.maximumError);
            });

            Run("export schema, fingerprint and stable route identity", () =>
            {
                Require(data.schemaVersion == 1 && fixtures.GetProperty("schemaVersion").GetInt32() == 1, "Unsupported export/fixture schema.");
                Require(!string.IsNullOrEmpty(data.sourceFingerprint) && data.sourceFingerprint.Length == 64, "Missing SHA-256 source fingerprint.");
                Require(data.sourceFingerprint == fixtures.GetProperty("sourceFingerprint").GetString(), "Fixtures and world data came from different TypeScript sources.");
                Require(data.routeId == data.route.id && data.routeId == "town-drive-v1", "Stable route ID changed.");
                Require(data.sourceHashes != null && data.sourceHashes.Length > 0, "Source hash inventory is missing.");
                Require(data.config.IsValid(), "Exported handling values are invalid.");
                Require(data.route.checkpoints.Select(checkpoint => checkpoint.id).SequenceEqual(new[] { "home", "leg-1", "leg-2", "leg-3", "leg-4" }), "Checkpoint IDs/order changed.");
                foreach (var count in fixtureCounts) Require(count.Value > 0, "Empty golden fixture group: " + count.Key);
                var scenarioNames = fixtures.GetProperty("scenarios").EnumerateArray().Select(item => item.GetProperty("name").GetString()).ToHashSet();
                foreach (string required in new[] { "home-first-tick-retains-outbound-branch", "accelerate-straight", "assist-cap", "braking", "reverse-cap", "handbrake-turn", "offroad-speed-cap", "soft-corridor-recovery", "raised-median-contact", "closure-green-island-terrace", "closure-green-island-return", "pause-identity" })
                    Require(scenarioNames.Contains(required), "Missing required semantic fixture: " + required);
            });

            Run("TypeScript route samples, lanes, labels and speed recommendations", () =>
            {
                int index = 0;
                foreach (var query in fixtures.GetProperty("routeQueries").EnumerateArray())
                {
                    double s = query.GetProperty("s").GetDouble();
                    EqualJson(query.GetProperty("point"), Element(route.PointAtDistance(s)), $"route[{index}].point");
                    EqualJson(query.GetProperty("lane"), Element(route.LanePoseAt(s)), $"route[{index}].lane");
                    Require(route.LabelAt(s) == query.GetProperty("label").GetString(), $"route[{index}].label");
                    Near(route.RecommendedSpeedAt(s), query.GetProperty("speed").GetDouble(), $"route[{index}].speed");
                    index++;
                }
                Require(index > 5, "Route golden set is too small to establish route parity.");
            });

            Run("TypeScript nearest-road queries and preferred shared-road branches", () =>
            {
                int index = 0, preferred = 0;
                foreach (var query in fixtures.GetProperty("nearestQueries").EnumerateArray())
                {
                    bool hasPreferred = query.GetProperty("hasPreferredS").GetBoolean();
                    double? preferredS = hasPreferred ? query.GetProperty("preferredS").GetDouble() : (double?)null;
                    var actual = route.Nearest(query.GetProperty("x").GetDouble(), query.GetProperty("z").GetDouble(), preferredS);
                    EqualJson(query.GetProperty("expected"), Element(actual), $"nearest[{index++}]");
                    if (hasPreferred) preferred++;
                }
                Require(index > 3 && preferred > 0, "Nearest-road fixtures must exercise preferred progress.");
            });

            Run("TypeScript fixed-step semantic scenarios and deterministic replay", () =>
            {
                foreach (var scenario in fixtures.GetProperty("scenarios").EnumerateArray())
                {
                    string name = scenario.GetProperty("name").GetString();
                    var initial = Read<DriveState>(scenario.GetProperty("initial"));
                    string initialBytes = Serialize(initial);
                    var obstacles = Read<DriveObstacle[]>(scenario.GetProperty("obstacles"));
                    DriveState Execute()
                    {
                        var current = initial;
                        foreach (var step in scenario.GetProperty("steps").EnumerateArray())
                        {
                            var input = Read<DriveInput>(step.GetProperty("input"));
                            int ticks = step.GetProperty("ticks").GetInt32();
                            Require(ticks >= 0 && ticks <= 36000, name + ": unbounded fixture step count.");
                            for (int i = 0; i < ticks; i++) current = simulation.Step(current, input, data.config, obstacles);
                        }
                        return current;
                    }
                    var result = Execute();
                    EqualJson(scenario.GetProperty("expected"), Element(result), "scenario." + name);
                    Require(Serialize(result) == Serialize(Execute()), name + ": identical inputs did not replay identically.");
                    Require(Serialize(initial) == initialBytes, name + ": simulation mutated the initial state.");
                }
            });

            Run("TypeScript ordered checkpoint transition fixtures", () =>
            {
                foreach (var fixture in fixtures.GetProperty("checkpoints").EnumerateArray())
                {
                    var previous = Read<DriveState>(fixture.GetProperty("previous"));
                    var next = Read<DriveState>(fixture.GetProperty("next"));
                    string before = Serialize(previous), after = Serialize(next);
                    EqualJson(fixture.GetProperty("expected"), Element(simulation.UpdateCheckpoints(previous, next)), "checkpoint." + fixture.GetProperty("name").GetString());
                    Require(Serialize(previous) == before && Serialize(next) == after, "Checkpoint update mutated caller-owned state.");
                }
            });

            Run("TypeScript interpolation and discontinuity fixtures", () =>
            {
                foreach (var fixture in fixtures.GetProperty("presentations").EnumerateArray())
                {
                    var previous = Read<DriveState>(fixture.GetProperty("previous"));
                    var current = Read<DriveState>(fixture.GetProperty("current"));
                    var pose = DrivePresentation.Interpolate(previous, current, fixture.GetProperty("alpha").GetDouble(),
                        fixture.GetProperty("paused").GetBoolean(), fixture.GetProperty("snap").GetBoolean());
                    EqualJson(fixture.GetProperty("expected"), Element(pose), "presentation." + fixture.GetProperty("name").GetString());
                }
            });

            Run("TypeScript reset fixtures preserve checkpoint state", () =>
            {
                foreach (var fixture in fixtures.GetProperty("resets").EnumerateArray())
                {
                    var state = Read<DriveState>(fixture.GetProperty("state"));
                    string original = Serialize(state);
                    EqualJson(fixture.GetProperty("expected"), Element(simulation.Reset(state)), "reset." + fixture.GetProperty("name").GetString());
                    Require(Serialize(state) == original, "Reset fixture mutated its input state.");
                }
            });

            Run("positive wrapping at negative and multiple-lap distances", () =>
            {
                foreach (double s in new[] { -route.Length * 3 - 13.25, -route.Length, -1.0, 0, .25, route.Length, route.Length * 4 + 12.5 })
                {
                    var sample = route.PointAtDistance(s);
                    Require(sample.s >= 0 && sample.s < route.Length, "Distance did not wrap to the positive route interval.");
                    EqualJson(Element(sample), Element(route.PointAtDistance(s + route.Length * 5)), "multi-lap sample");
                    Require(route.LabelAt(s) == route.LabelAt(s + route.Length * 5), "Label wrapping differs from route wrapping.");
                }
            });

            Run("pause, sanitization, acceleration, reverse and assistance caps", () =>
            {
                var initial = At(simulation, route.LanePoseAt(data.route.sections[1].startS + 100));
                var paused = initial.Clone(); paused.speed = 8; paused.elapsedSeconds = 12;
                string pausedBeforeStep = Serialize(paused);
                var frozen = simulation.Step(paused, new DriveInput { throttle = 1, steer = 1, paused = true });
                Require(ReferenceEquals(paused, frozen), "Paused step replaced authoritative state.");
                Require(pausedBeforeStep == Serialize(frozen), "Pause advanced state.");
                var sanitized = simulation.Step(initial, new DriveInput { throttle = double.NaN, brake = double.PositiveInfinity, steer = double.NaN });
                Require(new[] { sanitized.x, sanitized.z, sanitized.yaw, sanitized.speed }.All(Finite), "Nonfinite input poisoned state.");
                EqualJson(Element(simulation.Step(initial, new DriveInput())), Element(sanitized), "invalid inputs behave as neutral controls");
                var fast = Advance(simulation, initial, new DriveInput { throttle = 1 }, 360);
                Near(fast.speed, 25, "six-second acceleration cap");
                Near(Advance(simulation, fast, new DriveInput { brake = 1 }, 150).speed, 0, "braking to rest");
                Near(Advance(simulation, initial, new DriveInput { brake = 1 }, 100).speed, -6, "reverse cap");
                var assisted = initial.Clone(); assisted.assist = true;
                Near(Advance(simulation, assisted, new DriveInput { throttle = 1 }, 600).speed, 15, "assistance cap");
            });

            Run("checkpoint order, duplicates, wrong heading and single completion", () =>
            {
                var state = simulation.CreateState();
                for (int i = 1; i < data.route.checkpoints.Length; i++)
                {
                    var checkpoint = data.route.checkpoints[i];
                    var before = state.Clone(); before.routeS = checkpoint.s - .2;
                    var after = state.Clone(); after.x = checkpoint.x; after.z = checkpoint.z; after.yaw = checkpoint.yaw;
                    after.routeS = checkpoint.s + .2; after.speed = 10;
                    var wrongHeading = after.Clone(); wrongHeading.yaw += Math.PI;
                    Require(simulation.UpdateCheckpoints(before, wrongHeading).visited.Length == i, "Wrong heading awarded a checkpoint.");
                    var reverseBefore = before.Clone(); reverseBefore.routeS = checkpoint.s + 1;
                    Require(simulation.UpdateCheckpoints(reverseBefore, after).visited.Length == i, "Backward crossing awarded a checkpoint.");
                    state = simulation.UpdateCheckpoints(before, after);
                    Require(state.checkpointId == checkpoint.id && state.visited.Length == i + 1, "Ordered checkpoint was not awarded.");
                    Require(simulation.UpdateCheckpoints(before, state).visited.SequenceEqual(state.visited), "Repeated trigger duplicated progress.");
                }
                var nearHome = state.Clone(); nearHome.routeS = route.Length - 1;
                var returned = state.Clone(); returned.routeS = 1; returned.speed = 5;
                var complete = simulation.UpdateCheckpoints(nearHome, returned);
                Require(complete.completed && complete.checkpointId == "home", "Valid return did not complete the loop.");
                Require(ReferenceEquals(complete, simulation.UpdateCheckpoints(nearHome, complete)), "Completion was awarded twice.");
                var fresh = simulation.CreateState();
                Require(!fresh.completed && fresh.visited.SequenceEqual(new[] { "home" }), "Replay inherited completed progress.");
                var late = fresh.Clone(); var finalGate = data.route.checkpoints[4];
                late.x = finalGate.x; late.z = finalGate.z; late.yaw = finalGate.yaw; late.routeS = finalGate.s;
                var lateBefore = fresh.Clone(); lateBefore.routeS = finalGate.s - 1;
                Require(simulation.UpdateCheckpoints(lateBefore, late).visited.Length == 1, "Out-of-order gate skipped required checkpoints.");
            });

            Run("reset and serialized state restoration preserve progress without aliasing", () =>
            {
                var state = simulation.CreateState(true); state.checkpointId = "leg-3";
                state.visited = new[] { "home", "leg-1", "leg-2", "leg-3" }; state.elapsedSeconds = 97;
                state.x = 10000; state.z = -10000; state.speed = 20; state.velocityX = 20; state.stuckSeconds = 8;
                string original = Serialize(state);
                var restored = simulation.Reset(Read<DriveState>(Element(state)));
                var checkpoint = data.route.checkpoints[3];
                Near(restored.x, checkpoint.x, "reset x"); Near(restored.z, checkpoint.z, "reset z"); Near(restored.yaw, checkpoint.yaw, "reset yaw");
                Near(restored.speed, 0, "reset speed"); Near(restored.elapsedSeconds, 97, "reset elapsed");
                Require(restored.assist && restored.visited.SequenceEqual(state.visited), "Reset changed progress or assistance.");
                restored.visited[0] = "changed-copy";
                Require(Serialize(state) == original, "Clone/reset aliased the caller's visited array.");
            });

            Run("shared display pose stays continuous at 30, 60, 144 Hz and uneven cadence", () =>
            {
                foreach (var cadence in new[] { new[] { 1.0 / 30 }, new[] { 1.0 / 60 }, new[] { 1.0 / 144 }, new[] { 1.0 / 200, 1.0 / 35, 1.0 / 100, 1.0 / 47 } })
                {
                    double clock = 0, accumulator = 0; int frame = 0, ticks = 0;
                    var current = SyntheticPose(0); var previous = current;
                    while (clock < 2 - 1e-10)
                    {
                        double delta = Math.Min(cadence[frame++ % cadence.Length], 2 - clock); clock += delta; accumulator += delta;
                        while (accumulator + 1e-12 >= DriveSimulation.StepSeconds)
                        { previous = current; current = SyntheticPose(++ticks * DriveSimulation.StepSeconds); accumulator -= DriveSimulation.StepSeconds; }
                        var displayed = DrivePresentation.Interpolate(previous, current, accumulator / DriveSimulation.StepSeconds);
                        var expected = SyntheticPose(Math.Max(0, clock - DriveSimulation.StepSeconds));
                        Near(displayed.x, expected.x, "cadence x"); Near(displayed.z, expected.z, "cadence z"); Near(displayed.yaw, expected.yaw, "cadence yaw");
                    }
                    Require(ticks == 120, "Rendering cadence changed authoritative tick count.");
                }
                var a = SyntheticPose(0); var b = SyntheticPose(DriveSimulation.StepSeconds); a.yaw = Math.PI - .02; b.yaw = -Math.PI + .02;
                Near(DrivePresentation.Interpolate(a, b, .5).yaw, Math.PI, "heading shortest arc");
                Near(DrivePresentation.Interpolate(a, b, double.NaN).x, b.x, "invalid alpha snap");
                EqualJson(Element(b.Pose()), Element(DrivePresentation.Interpolate(a, b, .3, true)), "paused display");
            });

            Run("semantic full lap with every closure proxy, shared return and home bulb", () =>
            {
                Require(data.closureObstacles != null && data.closureObstacles.Length == 278, "Full-lap test must include all 278 exported closure proxies.");
                var state = simulation.CreateState();
                var orderedIds = data.route.checkpoints.Select(checkpoint => checkpoint.id).ToArray();
                bool sawReturn = false, sawBulb = false;
                int ticks = 0, contacts = 0;
                double maximumStepDistance = 0;
                // This driver only emits semantic controls. It never writes a
                // pose, route progress, checkpoint or velocity into game state.
                while (ticks < 60 * 300 && !state.completed)
                {
                    double limit = route.RecommendedSpeedAt(state.routeS);
                    double lookahead = limit < 12 ? 3 + Math.Abs(state.speed) * .35 : 8 + Math.Abs(state.speed) * .55;
                    var target = route.LanePoseAt(state.routeS + lookahead);
                    double desiredHeading = Math.Atan2(target.x - state.x, target.z - state.z);
                    double error = Math.Atan2(Math.Sin(desiredHeading - state.yaw), Math.Cos(desiredHeading - state.yaw));
                    var input = new DriveInput {
                        throttle = state.speed < limit ? 1 : 0,
                        brake = state.speed > limit + .3 ? .5 : 0,
                        steer = Math.Max(-1, Math.Min(1, error * 3))
                    };
                    var previous = state;
                    state = simulation.Step(state, input, data.config, data.closureObstacles);
                    ticks++;
                    Require(new[] { state.x, state.z, state.yaw, state.speed, state.velocityX, state.velocityZ, state.routeS, state.elapsedSeconds }.All(Finite), "Nonfinite state during full lap at tick " + ticks);
                    Require(state.visited.SequenceEqual(orderedIds.Take(state.visited.Length)), "Out-of-order checkpoint during full lap at tick " + ticks);
                    double dx = state.x - previous.x, dz = state.z - previous.z;
                    maximumStepDistance = Math.Max(maximumStepDistance, Math.Sqrt(dx * dx + dz * dz));
                    if (state.bonkSeconds > 0) contacts++;
                    if (state.routeS > data.route.returnMappedStartS && state.routeS < data.route.bulbStartS) sawReturn = true;
                    if (state.routeS > data.route.bulbStartS + 15 && state.routeS < route.Length - 10)
                    {
                        sawBulb = true;
                        Require(Math.Sqrt(state.x * state.x + state.z * state.z) < 10.5, "Driver left the home bulb pavement at tick " + ticks);
                    }
                }
                fullLap = new { ticks, simulatedSeconds = state.elapsedSeconds, completed = state.completed,
                    contactTicks = contacts, sawReturn, sawBulb, maximumStepDistance, closureProxyCount = data.closureObstacles.Length,
                    checkpointId = state.checkpointId, visited = state.visited };
                Require(state.completed, "Semantic driver failed to finish within 300 seconds; stopped at route distance " + state.routeS);
                Require(state.visited.SequenceEqual(orderedIds) && state.checkpointId == "home", "Full lap did not finish the ordered checkpoint sequence at home.");
                Require(sawReturn && sawBulb, "Full lap skipped the mapped shared return or home bulb.");
                Require(contacts == 0, "Full lap contacted an obstacle, median or corridor boundary.");
                Require(maximumStepDistance <= data.config.topSpeed * DriveSimulation.StepSeconds + 1e-7, "Full lap contained a reset/teleport instead of continuous driving.");
                Require(state.elapsedSeconds >= 180 && state.elapsedSeconds <= 300, "Full-lap duration is outside the expected 180–300 second driving interval.");
                Near(state.elapsedSeconds, ticks * DriveSimulation.StepSeconds, "full-lap fixed-step elapsed time");
            });

            timer.Stop();
            var result = new { passed, failed, assertions, maximumNumericError, elapsedMilliseconds = timer.Elapsed.TotalMilliseconds,
                sourceFingerprint = data.sourceFingerprint, compiledCoreRoot = Path.GetFullPath(sourceRoot), fixtureCounts, fullLap,
                dataSha256 = FileHash(dataPath), fixturesSha256 = FileHash(fixturePath), failures };
            string resultJson = JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true });
            Console.WriteLine(resultJson);
            if (options.TryGetValue("report", out var reportPath))
            { Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(reportPath))); File.WriteAllText(reportPath, resultJson + Environment.NewLine); }
            return failed == 0 ? 0 : 1;
        }
        catch (Exception error) { Console.Error.WriteLine("Harness setup failed: " + error); return 2; }
    }

    private static Dictionary<string, string> Arguments(string[] args)
    {
        var result = new Dictionary<string, string>();
        for (int i = 0; i < args.Length; i += 2)
        {
            if (i + 1 >= args.Length || !new[] { "--data", "--fixtures", "--report" }.Contains(args[i]))
                throw new ArgumentException("Arguments: [--data path] [--fixtures path] [--report path].");
            result.Add(args[i].Substring(2), args[i + 1]);
        }
        return result;
    }
    private static DriveState At(DriveSimulation simulation, RouteSample pose)
    { var state = simulation.CreateState(); state.x = pose.x; state.z = pose.z; state.yaw = pose.yaw; state.routeS = pose.s; return state; }
    private static DriveState Advance(DriveSimulation simulation, DriveState state, DriveInput input, int ticks)
    { for (int i = 0; i < ticks; i++) state = simulation.Step(state, input); return state; }
    private static DriveState SyntheticPose(double time) => new DriveState { x = time * 12, z = time * -5, yaw = .2 + time * .3, speed = 13, elapsedSeconds = time, checkpointId = "home", visited = new[] { "home" } };
    private static string Serialize<T>(T value) => JsonSerializer.Serialize(value, Json);
    private static string FileHash(string path) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path))).ToLowerInvariant();
    private static JsonElement Element<T>(T value) => JsonSerializer.SerializeToElement(value, Json);
    private static T Read<T>(JsonElement value) => JsonSerializer.Deserialize<T>(value.GetRawText(), Json);
    private static bool Finite(double value) => !double.IsNaN(value) && !double.IsInfinity(value);
    private static void Run(string name, Action test)
    {
        try { test(); passed++; Console.WriteLine("PASS " + name); }
        catch (Exception error) { failed++; failures.Add(name + ": " + error.Message); Console.Error.WriteLine("FAIL " + name + ": " + error.Message); }
    }
    private static void Require(bool condition, string message)
    { assertions++; if (!condition) throw new InvalidOperationException(message); }
    private static void Near(double actual, double expected, string field)
    {
        double error = Math.Abs(actual - expected); maximumNumericError = Math.Max(maximumNumericError, error);
        Require(Finite(actual) && Finite(expected) && error <= 1e-7 + Math.Abs(expected) * 1e-10,
            $"{field}: expected {expected:R}, got {actual:R}, difference {error:R}");
    }
    private static void EqualJson(JsonElement expected, JsonElement actual, string field)
    {
        Require(expected.ValueKind == actual.ValueKind, field + ": JSON type differs.");
        switch (expected.ValueKind)
        {
            case JsonValueKind.Object:
                foreach (var property in expected.EnumerateObject())
                { Require(actual.TryGetProperty(property.Name, out var member), field + "." + property.Name + ": missing field."); EqualJson(property.Value, member, field + "." + property.Name); }
                break;
            case JsonValueKind.Array:
                Require(expected.GetArrayLength() == actual.GetArrayLength(), field + ": array length differs.");
                for (int i = 0; i < expected.GetArrayLength(); i++) EqualJson(expected[i], actual[i], field + "[" + i + "]");
                break;
            case JsonValueKind.Number: Near(actual.GetDouble(), expected.GetDouble(), field); break;
            case JsonValueKind.String: Require(expected.GetString() == actual.GetString(), field + ": string differs."); break;
            case JsonValueKind.True:
            case JsonValueKind.False: Require(expected.GetBoolean() == actual.GetBoolean(), field + ": boolean differs."); break;
            case JsonValueKind.Null: break;
            default: throw new InvalidOperationException(field + ": unsupported JSON kind.");
        }
    }
}
