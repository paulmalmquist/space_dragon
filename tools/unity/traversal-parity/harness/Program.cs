using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Reflection;
using System.Text.Json;
using SpaceDragon.Traversal;

// Compares the Unity project's engine-independent traversal core with golden output
// exported from the TypeScript reference. No Unity Editor, browser or renderer runs here.
internal static class Program
{
    private static readonly List<string> Failures = new List<string>();
    private static double maxDifference;
    private static long assertions;

    private static void Check(bool condition, string message)
    {
        assertions++;
        if (!condition && Failures.Count < 40) Failures.Add(message);
    }

    private static void Near(double actual, double expected, string label, double tolerance)
    {
        assertions++;
        double difference = Math.Abs(actual - expected);
        if (double.IsNaN(difference)) difference = double.PositiveInfinity;
        if (difference > maxDifference && !double.IsInfinity(difference)) maxDifference = difference;
        if (difference > tolerance + Math.Abs(expected) * 1e-9 && Failures.Count < 40)
            Failures.Add(label + ": expected " + expected.ToString("R", CultureInfo.InvariantCulture) + " but was " + actual.ToString("R", CultureInfo.InvariantCulture));
    }

    private static int Main(string[] args)
    {
        string fixturePath = Path.Combine(AppContext.BaseDirectory, "traversal-fixtures-v001.json");
        string reportPath = null;
        double tolerance = 1e-7;
        for (int index = 0; index < args.Length - 1; index++)
        {
            if (args[index] == "--fixtures") fixturePath = args[index + 1];
            if (args[index] == "--report") reportPath = args[index + 1];
        }
        using var document = JsonDocument.Parse(File.ReadAllText(fixturePath));
        var root = document.RootElement;
        var world = HomeBlockData.Create();
        var tuning = TraversalTuning.Default;

        Check(root.GetProperty("schemaVersion").GetInt32() == 1, "fixture schema version");
        Check(root.GetProperty("worldId").GetString() == world.id, "world id");
        Check(root.GetProperty("sourceFingerprint").GetString() == HomeBlockData.SourceFingerprint, "generated C# level data and fixtures come from different TypeScript sources");
        Near(root.GetProperty("step").GetDouble(), TraversalTuning.Step, "fixed step", 0);
        var counts = root.GetProperty("counts");
        Check(counts.GetProperty("solids").GetInt32() == world.solids.Length, "solid count");
        Check(counts.GetProperty("anchors").GetInt32() == world.anchors.Length, "anchor count");
        Check(counts.GetProperty("sparks").GetInt32() == world.sparks.Length, "spark count");
        Check(counts.GetProperty("recoveries").GetInt32() == world.recoveries.Length, "recovery count");
        Check(counts.GetProperty("water").GetInt32() == world.water.Length, "water zone count");

        // Every tuning value the reference exports must exist in C# with the same number.
        int tuningValues = 0;
        foreach (var property in root.GetProperty("tuning").EnumerateObject())
        {
            var field = typeof(TraversalTuning).GetField(property.Name, BindingFlags.Public | BindingFlags.Instance);
            Check(field != null, "C# tuning is missing " + property.Name);
            if (field == null) continue;
            Near((double)field.GetValue(tuning), property.Value.GetDouble(), "tuning." + property.Name, 0);
            tuningValues++;
        }
        Check(tuningValues == typeof(TraversalTuning).GetFields(BindingFlags.Public | BindingFlags.Instance).Length, "C# tuning has values the reference does not export");

        var numbers = new List<FieldInfo>();
        foreach (var name in root.GetProperty("stateNumbers").EnumerateArray())
        {
            var field = typeof(HeroState).GetField(name.GetString());
            Check(field != null, "C# hero state is missing " + name.GetString());
            numbers.Add(field);
        }

        int scenarioCount = 0, steps = 0, samplesCompared = 0;
        foreach (var scenario in root.GetProperty("scenarios").EnumerateArray())
        {
            string name = scenario.GetProperty("name").GetString();
            var start = scenario.GetProperty("start");
            double? startHeight = start.TryGetProperty("y", out var startY) ? startY.GetDouble() : (double?)null;
            var hero = HeroSimulation.Create(world, start.GetProperty("x").GetDouble(), start.GetProperty("z").GetDouble(), start.GetProperty("yaw").GetDouble(), startHeight);
            var input = new HeroInput();
            var samples = scenario.GetProperty("samples");
            var events = scenario.GetProperty("events");
            int sampleEvery = scenario.GetProperty("sampleEvery").GetInt32();
            int sampleIndex = 0, eventIndex = 0, step = 0;
            foreach (var segment in scenario.GetProperty("segments").EnumerateArray())
            {
                if (segment.TryGetProperty("moveX", out var moveX)) input.moveX = moveX.GetDouble();
                if (segment.TryGetProperty("moveZ", out var moveZ)) input.moveZ = moveZ.GetDouble();
                if (segment.TryGetProperty("jump", out var jump)) input.jump = jump.GetBoolean();
                if (segment.TryGetProperty("power", out var power)) input.power = power.GetBoolean();
                int count = segment.GetProperty("steps").GetInt32();
                for (int index = 0; index < count; index++)
                {
                    var before = hero;
                    hero = HeroSimulation.Step(world, hero, input);
                    Check(!ReferenceEquals(before, hero), name + ": a step must return a new state");
                    step++;
                    if (hero.events != HeroEvent.None)
                    {
                        bool matches = eventIndex < events.GetArrayLength() && events[eventIndex][0].GetInt32() == step && events[eventIndex][1].GetInt32() == (int)hero.events;
                        Check(matches, name + " step " + step + ": unexpected events " + hero.events);
                        eventIndex++;
                    }
                    if (step % sampleEvery == 0) { Compare(name, samples[sampleIndex++], step, hero, numbers, tolerance); samplesCompared++; }
                }
            }
            Compare(name, samples[sampleIndex++], step, hero, numbers, tolerance); samplesCompared++;
            Check(sampleIndex == samples.GetArrayLength(), name + ": sample count");
            Check(eventIndex == events.GetArrayLength(), name + ": event count " + eventIndex + " of " + events.GetArrayLength());
            Check(step == scenario.GetProperty("steps").GetInt32(), name + ": step count");
            scenarioCount++; steps += step;
        }

        int queries = 0;
        foreach (var query in root.GetProperty("anchorQueries").EnumerateArray())
        {
            var probe = HeroSimulation.Create(world, 4, -8, 0);
            probe.x = query.GetProperty("x").GetDouble(); probe.y = query.GetProperty("y").GetDouble(); probe.z = query.GetProperty("z").GetDouble(); probe.mode = HeroMode.Air;
            var anchor = HeroSimulation.SelectAnchor(world, probe, query.GetProperty("dirX").GetDouble(), query.GetProperty("dirZ").GetDouble(), query.GetProperty("exclude").GetString());
            Check((anchor == null ? "" : anchor.id) == query.GetProperty("expected").GetString(), "anchor query " + queries + ": chose " + (anchor == null ? "none" : anchor.id));
            queries++;
        }
        foreach (var query in root.GetProperty("supportQueries").EnumerateArray())
        {
            var support = TraversalGeometry.SupportAt(world, query.GetProperty("x").GetDouble(), query.GetProperty("z").GetDouble(), query.GetProperty("feet").GetDouble(), query.GetProperty("reach").GetDouble());
            Near(support.height, query.GetProperty("height").GetDouble(), "support height " + queries, tolerance);
            Check(support.id == query.GetProperty("id").GetString(), "support id " + queries + ": " + support.id);
            Near(support.bounce, query.GetProperty("bounce").GetDouble(), "support bounce " + queries, 0);
            queries++;
        }
        foreach (var query in root.GetProperty("standableQueries").EnumerateArray())
        {
            bool standable = TraversalGeometry.IsStandable(world, query.GetProperty("x").GetDouble(), query.GetProperty("z").GetDouble(), tuning);
            Check(standable == query.GetProperty("expected").GetBoolean(), "standable query " + queries);
            queries++;
        }
        foreach (var query in root.GetProperty("boomQueries").EnumerateArray())
        {
            var f = query.GetProperty("focus"); var d = query.GetProperty("desired");
            double clear = TraversalGeometry.ClipBoom(world, f[0].GetDouble(), f[1].GetDouble(), f[2].GetDouble(), d[0].GetDouble(), d[1].GetDouble(), d[2].GetDouble(), query.GetProperty("cutaway").GetBoolean());
            Near(clear, query.GetProperty("expected").GetDouble(), "camera boom " + queries, tolerance);
            queries++;
        }

        // Contract checks that do not depend on the fixtures.
        var still = HeroSimulation.Create(world, world.spawn.x, world.spawn.z, world.spawn.yaw);
        Check(ReferenceEquals(HeroSimulation.Step(world, still, new HeroInput { moveX = 1 }, 0), still), "zero time returns the same state");
        Check(ReferenceEquals(HeroSimulation.Step(world, still, new HeroInput { moveX = 1 }, double.NaN), still), "invalid time returns the same state");
        var collected = new HashSet<string>();
        var atSpark = HeroSimulation.Create(world, 4, -8, 0);
        atSpark.x = world.sparks[0].x; atSpark.y = world.sparks[0].y - PracticeSparks.HeroCenter; atSpark.z = world.sparks[0].z;
        Check(PracticeSparks.Collect(world, atSpark, collected) && collected.Count == 1, "a touched spark is awarded");
        Check(!PracticeSparks.Collect(world, atSpark, collected) && collected.Count == 1, "a held spark is never awarded twice");

        var report = new Dictionary<string, object>
        {
            ["passed"] = Failures.Count == 0, ["world"] = world.id, ["sourceFingerprint"] = HomeBlockData.SourceFingerprint,
            ["scenarios"] = scenarioCount, ["steps"] = steps, ["samplesCompared"] = samplesCompared, ["queries"] = queries,
            ["tuningValues"] = tuningValues, ["assertions"] = assertions, ["tolerance"] = tolerance,
            ["maximumDifference"] = maxDifference, ["failures"] = Failures,
        };
        string json = JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true });
        Console.WriteLine(json);
        if (reportPath != null) { Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(reportPath))); File.WriteAllText(reportPath, json + "\n"); }
        return Failures.Count == 0 ? 0 : 1;
    }

    private static void Compare(string scenario, JsonElement sample, int step, HeroState hero, List<FieldInfo> numbers, double tolerance)
    {
        string label = scenario + " step " + step;
        Check(sample[0].GetInt32() == step, label + ": sample is for step " + sample[0].GetInt32());
        int column = 1;
        foreach (var field in numbers)
        {
            if (field != null) Near((double)field.GetValue(hero), sample[column].GetDouble(), label + " " + field.Name, tolerance);
            column++;
        }
        Check(hero.mode.ToString().ToLowerInvariant() == sample[column++].GetString(), label + ": mode " + hero.mode);
        Check(hero.groundId == sample[column++].GetString(), label + ": groundId " + hero.groundId);
        Check(hero.tetherId == sample[column++].GetString(), label + ": tetherId " + hero.tetherId);
        Check(hero.lastAnchorId == sample[column++].GetString(), label + ": lastAnchorId " + hero.lastAnchorId);
        Check(hero.jumpHeld == (sample[column++].GetInt32() == 1), label + ": jumpHeld");
        Check(hero.powerHeld == (sample[column++].GetInt32() == 1), label + ": powerHeld");
        Check(hero.hopAvailable == (sample[column++].GetInt32() == 1), label + ": hopAvailable");
        Check(hero.cutEligible == (sample[column++].GetInt32() == 1), label + ": cutEligible");
    }
}
