using System;
using System.Collections.Generic;
using NUnit.Framework;

namespace SpaceDragon.Traversal.Tests
{
    /// <summary>
    /// Engine-free behavior checks for the on-foot traversal core. They use only NUnit and the
    /// core assembly, so the same source runs in Unity EditMode and under `dotnet test`.
    /// Golden parity with the TypeScript reference is checked by tools/unity/traversal-parity.
    /// </summary>
    public sealed class TraversalCoreTests
    {
        private const double Step = TraversalTuning.Step;
        private TraversalWorld world;
        private TraversalTuning T;

        [SetUp]
        public void CreateWorld() { world = HomeBlockData.Create(); T = TraversalTuning.Default; }

        private HeroState Play(HeroState hero, double seconds, double moveX = 0, double moveZ = 0, bool jump = false, bool power = false, Action<HeroState> visit = null)
        {
            var input = new HeroInput { moveX = moveX, moveZ = moveZ, jump = jump, power = power };
            int steps = (int)Math.Round(seconds / Step);
            for (int index = 0; index < steps; index++) { hero = HeroSimulation.Step(world, hero, input); visit?.Invoke(hero); }
            return hero;
        }

        private HeroState At(double x, double z, double yaw = 0, double? height = null) => HeroSimulation.Create(world, x, z, yaw, height);

        [Test]
        public void GeneratedLevelIsWellFormed()
        {
            Assert.That(world.id, Is.EqualTo("home-block-v001"));
            Assert.That(world.sparks.Length, Is.EqualTo(12));
            var ids = new HashSet<string>();
            foreach (var solid in world.solids)
            {
                Assert.That(ids.Add(solid.id), Is.True, "duplicate solid " + solid.id);
                Assert.That(solid.minX < solid.maxX && solid.minZ < solid.maxZ && solid.minY < solid.maxY, Is.True, "degenerate " + solid.id);
            }
            foreach (var anchor in world.anchors)
                Assert.That(anchor.y - anchor.floor, Is.GreaterThanOrEqualTo(T.handHeight + T.swingClearance + T.ropeMin - 1e-9), anchor.id + " leaves room to hang");
            Assert.That(TraversalGeometry.IsStandable(world, world.spawn.x, world.spawn.z, T), Is.True);
            foreach (var spot in world.recoveries) Assert.That(TraversalGeometry.IsStandable(world, spot.x, spot.z, T), Is.True, spot.id);
            Assert.That(TraversalGeometry.IsStandable(world, -4, 1, T), Is.False, "inside the desk");
            Assert.That(TraversalGeometry.IsStandable(world, 30, 10, T), Is.False, "in the lake");
            Assert.That(TraversalGeometry.IsStandable(world, 28, 0, T), Is.True, "on the dock");
        }

        [Test]
        public void StepsArePureAndRepeatable()
        {
            var hero = At(4, -8);
            Assert.That(HeroSimulation.Step(world, hero, new HeroInput { moveX = 1 }, 0), Is.SameAs(hero));
            Assert.That(HeroSimulation.Step(world, hero, new HeroInput { moveX = 1 }, double.NaN), Is.SameAs(hero));
            var first = Play(Play(At(4, -8), 0.4, moveX: 1, power: true), 0.3, moveX: 1, power: true, jump: true);
            var second = Play(Play(At(4, -8), 0.4, moveX: 1, power: true), 0.3, moveX: 1, power: true, jump: true);
            Assert.That(hero.x, Is.EqualTo(4), "the input state is never mutated");
            Assert.That(second.x, Is.EqualTo(first.x)); Assert.That(second.y, Is.EqualTo(first.y)); Assert.That(second.vy, Is.EqualTo(first.vy));
        }

        [Test]
        public void RunningSprintingAndStopping()
        {
            Assert.That(Play(At(4, -8), 1, moveX: 1).vx, Is.EqualTo(T.runSpeed).Within(1e-9));
            Assert.That(Play(At(4, -8), 1, moveX: 1, power: true).vx, Is.EqualTo(T.sprintSpeed).Within(1e-9));
            var diagonal = Play(At(-26, -20), 1, moveX: 1, moveZ: 1);
            Assert.That(Math.Sqrt(diagonal.vx * diagonal.vx + diagonal.vz * diagonal.vz), Is.EqualTo(T.runSpeed).Within(1e-9));
            var running = Play(At(4, -8), 1, moveX: 1);
            var stopped = Play(running, 0.2);
            Assert.That(stopped.vx, Is.EqualTo(0));
            Assert.That(stopped.x - running.x, Is.LessThan(0.3));
        }

        [Test]
        public void WallsBlockAndTheDoorwayIsOpen()
        {
            Assert.That(Play(At(-2, 2), 3, moveX: 1).x, Is.EqualTo(-0.6 - T.radius).Within(1e-6), "east wall");
            var outside = Play(At(-2, 0), 1.2, moveX: 1);
            Assert.That(outside.x, Is.GreaterThan(1.5), "walked out through the doorway");
            Assert.That(outside.y, Is.EqualTo(0.06).Within(1e-9), "stepped down to the patio");
            Assert.That(Play(At(1, 0), 3, moveX: 1).x, Is.EqualTo(2.65 - T.radius).Within(1e-6), "the pod is solid");
            Assert.That(Play(At(9, -3), 3, moveX: 1).x, Is.EqualTo(9.9 - T.radius).Within(1e-6), "the fence is solid");
            Assert.That(Play(At(9, 0.4), 1, moveX: 1).x, Is.GreaterThan(11), "the gate is open");
        }

        [Test]
        public void JumpHeightFollowsTheHeldKeyAndOneHopIsAllowed()
        {
            double tap = 0, held = 0, hopped = 0;
            var hero = Play(At(4, -8), 0.05, jump: true, visit: state => tap = Math.Max(tap, state.y));
            Play(hero, 1.5, visit: state => tap = Math.Max(tap, state.y));
            Play(At(4, -8), 1.5, jump: true, visit: state => held = Math.Max(held, state.y));
            Assert.That(tap, Is.InRange(0.8, 1.1));
            Assert.That(held, Is.InRange(1.6, 1.75));
            hero = Play(At(4, -8), 0.35, jump: true, visit: state => hopped = Math.Max(hopped, state.y));
            hero = Play(hero, 0.05, visit: state => hopped = Math.Max(hopped, state.y));
            hero = Play(hero, 0.1, jump: true, visit: state => hopped = Math.Max(hopped, state.y));
            Assert.That(hero.hopAvailable, Is.False);
            hero = Play(hero, 0.1, visit: state => hopped = Math.Max(hopped, state.y));
            hero = Play(hero, 0.1, jump: true, visit: state => hopped = Math.Max(hopped, state.y));
            hero = Play(hero, 2, visit: state => hopped = Math.Max(hopped, state.y));
            Assert.That(hopped, Is.InRange(3.2, 3.6), "a jump plus exactly one hop");
            Assert.That(hero.mode, Is.EqualTo(HeroMode.Ground));
            Assert.That(hero.hopAvailable, Is.True, "landing restores the hop");
        }

        [Test]
        public void TrampolineLaunchesWithoutAKeyPress()
        {
            int bounces = 0; double peak = 0;
            var hero = Play(At(5.4, 3.1), 0.5, moveX: 1, visit: state => { if ((state.events & HeroEvent.Bounce) != 0) bounces++; peak = Math.Max(peak, state.y); });
            hero = Play(hero, 0.6, visit: state => { if ((state.events & HeroEvent.Bounce) != 0) bounces++; peak = Math.Max(peak, state.y); });
            Assert.That(bounces, Is.EqualTo(1));
            Assert.That(peak, Is.GreaterThan(4.2));
            Assert.That(hero.cutEligible, Is.False, "a bounce is never cut short by a released key");
        }

        [Test]
        public void SwingKeepsTheRopeTautThenLetsGoOnRelease()
        {
            var anchor = world.FindAnchor("palm-dock");
            bool attached = false; double lowest = double.PositiveInfinity;
            Action<HeroState> watch = state =>
            {
                if ((state.events & HeroEvent.Attach) != 0 && !attached) { attached = true; Assert.That(state.tetherId, Is.EqualTo("palm-dock")); }
                if (state.mode != HeroMode.Swing || state.tetherId != "palm-dock") return;
                lowest = Math.Min(lowest, state.y);
                double dx = state.x - anchor.x, dy = state.y + T.handHeight - anchor.y, dz = state.z - anchor.z;
                Assert.That(Math.Sqrt(dx * dx + dy * dy + dz * dz), Is.LessThanOrEqualTo(state.ropeLength + 1e-6), "the hand never passes the end of the rope");
            };
            var hero = Play(At(7.4, 0.4), 0.1, moveX: 1, power: true, visit: watch);
            hero = Play(hero, 0.3, moveX: 1, power: true, jump: true, visit: watch);
            hero = Play(hero, 0.5, moveX: 1, power: true, visit: watch);
            Assert.That(attached, Is.True);
            Assert.That(hero.mode, Is.EqualTo(HeroMode.Swing));
            Assert.That(lowest, Is.GreaterThan(anchor.floor + T.swingClearance - 0.35));
            var dropped = HeroSimulation.Step(world, hero, new HeroInput { moveX = 1 });
            Assert.That((dropped.events & HeroEvent.Release) != 0, Is.True);
            Assert.That(dropped.mode, Is.EqualTo(HeroMode.Air));
            var leapt = HeroSimulation.Step(world, hero, new HeroInput { moveX = 1, jump = true, power = true });
            Assert.That(leapt.vy, Is.GreaterThanOrEqualTo(dropped.vy + 2), "jumping off adds lift");
            Assert.That(Play(At(10.5, 0.4), 1, power: true).tetherId, Is.EqualTo(""), "suit power on the ground only sprints");
        }

        [Test]
        public void PerchAnchorSetsTheHeroDownOnTheRoof()
        {
            var hero = Play(At(5.2, 3.1), 0.52, moveX: 1);
            var attaches = new List<string>();
            hero = Play(hero, 2.2, moveX: -1, power: true, visit: state => { if ((state.events & HeroEvent.Attach) != 0) attaches.Add(state.tetherId); });
            Assert.That(attaches, Is.EqualTo(new[] { "roof-mast" }));
            Assert.That(hero.mode, Is.EqualTo(HeroMode.Ground));
            Assert.That(hero.groundId, Does.StartWith("home-roof-"));
            Assert.That(hero.y, Is.GreaterThan(4));
        }

        [Test]
        public void LakeIsASafetyCatchNeverAFailState()
        {
            bool caught = false, recovered = false;
            var hero = Play(At(15, 8), 1.2, moveX: 1, visit: state => { caught |= (state.events & HeroEvent.Catch) != 0; recovered |= (state.events & HeroEvent.Recover) != 0; });
            hero = Play(hero, 2, visit: state => { caught |= (state.events & HeroEvent.Catch) != 0; recovered |= (state.events & HeroEvent.Recover) != 0; });
            Assert.That(caught && recovered, Is.True);
            Assert.That(hero.mode, Is.EqualTo(HeroMode.Ground));
            Assert.That(hero.y, Is.GreaterThanOrEqualTo(0));
            var diver = Play(Play(At(39, 0), 1.5, moveX: 1, power: true), 2.5);
            Assert.That(diver.groundId, Is.EqualTo("dock-end"), "falling off the dock recovers on the dock");
        }

        [Test]
        public void PausingCancelsGroundMotionOnly()
        {
            var settled = HeroSimulation.Settle(Play(At(4, -8), 0.5, moveX: 1, power: true));
            Assert.That(settled.vx, Is.EqualTo(0)); Assert.That(settled.powerHeld, Is.False);
            var airborne = Play(At(4, -8), 0.2, moveX: 1, jump: true);
            Assert.That(HeroSimulation.Settle(airborne).vy, Is.EqualTo(airborne.vy), "a fall continues after a pause");
        }

        [Test]
        public void PracticeSparksAreAwardedExactlyOnce()
        {
            var collected = new HashSet<string>();
            var hero = At(4, -8);
            Assert.That(PracticeSparks.Collect(world, hero, collected), Is.False);
            var spark = world.sparks[1];
            hero.x = spark.x; hero.y = spark.y - PracticeSparks.HeroCenter; hero.z = spark.z;
            Assert.That(PracticeSparks.Collect(world, hero, collected), Is.True);
            Assert.That(PracticeSparks.Collect(world, hero, collected), Is.False, "never awarded twice");
            Assert.That(collected, Is.EquivalentTo(new[] { spark.id }));
        }

        [Test]
        public void CameraBoomRespectsWallsCutawayAndTrunks()
        {
            Assert.That(TraversalGeometry.ClipBoom(world, -2, 1.4, 0, -9, 1.4, 0, false), Is.InRange(0.6, 0.8));
            Assert.That(TraversalGeometry.ClipBoom(world, -2, 1.4, 0, -9, 3.4, 0, true), Is.EqualTo(1), "indoors the camera may rise above the cut walls");
            Assert.That(TraversalGeometry.ClipBoom(world, -2, 1.4, 0, -9, 3.4, 0, false), Is.LessThan(1));
            Assert.That(TraversalGeometry.ClipBoom(world, 12.6, 2, 1, 12.6, 2, 6, false), Is.EqualTo(1), "a palm trunk does not pull the camera in");
        }
    }
}
