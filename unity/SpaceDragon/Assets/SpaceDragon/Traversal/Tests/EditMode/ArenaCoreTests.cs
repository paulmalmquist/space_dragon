using System;
using System.Collections.Generic;
using NUnit.Framework;

namespace SpaceDragon.Traversal.Tests
{
    /// <summary>
    /// Engine-free checks for Luke's Arena: the generated level and rules reproduce the TypeScript
    /// reference step for step, rewards only ever grow, and the save is safe. The same source runs
    /// in Unity EditMode and under `dotnet test`.
    /// </summary>
    public sealed class ArenaCoreTests
    {
        private const double Step = TraversalTuning.Step;
        private ArenaLayout layout;

        [SetUp]
        public void CreateLayout() { layout = LukeArenaData.Create(); }

        private static int Steps(double seconds) => (int)Math.Round(seconds / Step);

        private ArenaState Place(ArenaState state, double x, double z, double yaw, double? height = null)
        {
            // One idle step from a fresh pose, as a visit that begins there.
            state.hero = HeroSimulation.Create(layout.world, x, z, yaw, height);
            return state;
        }

        private ArenaState Run(ArenaState state, double seconds, ArenaInput input = default(ArenaInput), Action<ArenaState> visit = null)
        {
            for (int index = 0; index < Steps(seconds); index++) { state = ArenaSimulation.Step(layout, state, input); visit?.Invoke(state); }
            return state;
        }

        [Test]
        public void GeneratedArenaIsWellFormed()
        {
            Assert.AreEqual("luke-arena-v001", layout.world.id);
            Assert.AreEqual(64, LukeArenaData.SourceFingerprint.Length);
            Assert.AreEqual(3, layout.zones.Length);
            Assert.AreEqual(3, layout.waves);
            Assert.AreEqual(4, layout.rules.energyMax);
            Assert.AreEqual(layout.world.solids.Length, layout.blocks.Length);
            Assert.AreEqual(6, layout.world.climbs.Length);
            Assert.AreEqual(5, layout.CourseSparkCount);
            Assert.AreEqual(4, layout.profiles.Length);
            var ids = new HashSet<string>();
            foreach (var robot in layout.robots)
            {
                Assert.IsTrue(ids.Add(robot.id), robot.id);
                Assert.AreEqual(robot.trial, ArenaSimulation.TrialAt(layout, robot.x, robot.z), robot.id + " starts in its own zone");
                foreach (var point in robot.patrol) Assert.AreEqual(robot.trial, ArenaSimulation.TrialAt(layout, point.x, point.z), robot.id + " patrols inside its zone");
                var profile = layout.Profile(robot.kind);
                Assert.IsTrue(profile.windup == 0 || profile.windup >= 1, "every telegraph lasts at least a second");
            }
            Assert.AreEqual(TrialId.None, ArenaSimulation.TrialAt(layout, layout.world.spawn.x, layout.world.spawn.z), "the hub belongs to no trial");
            foreach (var face in layout.world.climbs) Assert.IsTrue(face.facing == 1 || face.facing == -1, face.id);
            var fresh = ArenaSimulation.Create(layout);
            Assert.AreEqual(layout.rules.energyMax, fresh.energy);
            // The sidekick starts beside Luke in the hub, and waits on the hub floor outside the stealth yard.
            Assert.IsNotNull(layout.sidekick);
            Assert.IsTrue(fresh.sidekick.present);
            Assert.AreEqual(TrialId.None, ArenaSimulation.TrialAt(layout, layout.sidekick.x, layout.sidekick.z));
            Assert.IsTrue(ArenaSimulation.SidekickFree(layout, layout.sidekick.x, layout.sidekick.z));
            Assert.AreEqual(1, layout.sidekick.waits.Length);
            Assert.AreEqual(TrialId.Stealth, layout.sidekick.waits[0].trial);
            Assert.AreEqual(TrialId.None, ArenaSimulation.TrialAt(layout, layout.sidekick.waits[0].x, layout.sidekick.waits[0].z));
            Assert.IsTrue(ArenaSimulation.SidekickFree(layout, layout.sidekick.waits[0].x, layout.sidekick.waits[0].z));
            Assert.AreEqual(3, layout.rules.diveCount);
            foreach (var hide in layout.hides)
            {
                var hero = HeroSimulation.Create(layout.world, hide.x, hide.z, hide.yaw);
                foreach (var robot in fresh.robots) if (robot.mode == RobotMode.Patrol) Assert.IsFalse(ArenaSimulation.CanSee(layout, robot, hero), hide.id + " starts hidden from " + robot.id);
            }
        }

        private const ArenaEvent Moments = ArenaEvent.Toss | ArenaEvent.Hang | ArenaEvent.Dive | ArenaEvent.Stun | ArenaEvent.Zip;

        /// <summary>A heading as one smooth number: facing exactly backwards reads the same whether it is stored as +pi or -pi.</summary>
        private static double Heading(double yaw) => Math.Cos(yaw) + 2 * Math.Sin(yaw);

        private static double Hash(RobotState[] robots, Func<RobotState, double> value)
        {
            double total = 0;
            for (int index = 0; index < robots.Length; index++) total += value(robots[index]) * (index + 1);
            return total;
        }

        [Test]
        public void ScriptedRunsPassThroughTheSameMomentsAsTheTypeScriptRules()
        {
            Assert.GreaterOrEqual(LukeArenaData.Probes.Length, 15);
            int marks = 0;
            ArenaEvent reached = ArenaEvent.None;
            var sidekickModes = new HashSet<int>();
            var oopPhases = new HashSet<int>();
            foreach (var probe in LukeArenaData.Probes)
            {
                var state = ArenaSimulation.Create(layout);
                state.hero = HeroSimulation.Create(layout.world, probe.startX, probe.startZ, probe.startYaw, probe.hasStartY ? probe.startY : (double?)null);
                int step = 0, next = 0;
                ArenaEvent events = ArenaEvent.None;
                Action check = () =>
                {
                    var mark = probe.marks[next++];
                    string at = probe.name + " step " + mark.step;
                    Assert.AreEqual(mark.step, step, at);
                    const double tolerance = 1e-8;
                    Assert.AreEqual(mark.heroX, state.hero.x, tolerance, at + " hero x");
                    Assert.AreEqual(mark.heroY, state.hero.y, tolerance, at + " hero y");
                    Assert.AreEqual(mark.heroZ, state.hero.z, tolerance, at + " hero z");
                    Assert.AreEqual(mark.heroYaw, Heading(state.hero.yaw), tolerance, at + " hero heading");
                    Assert.AreEqual(mark.heroMode, (int)state.hero.mode, at + " hero mode");
                    Assert.AreEqual(mark.energy, state.energy, at + " energy");
                    Assert.AreEqual(mark.trial, (int)state.trial, at + " trial");
                    Assert.AreEqual(mark.wave, state.wave, at + " wave");
                    Assert.AreEqual(mark.robotX, Hash(state.robots, robot => robot.x), tolerance, at + " robots x");
                    Assert.AreEqual(mark.robotZ, Hash(state.robots, robot => robot.z), tolerance, at + " robots z");
                    Assert.AreEqual(mark.robotYaw, Hash(state.robots, robot => Heading(robot.yaw)), tolerance, at + " robots heading");
                    Assert.AreEqual(mark.awareness, Hash(state.robots, robot => robot.awareness), tolerance, at + " awareness");
                    Assert.AreEqual(mark.sparks, (int)Hash(state.robots, robot => robot.sparks), at + " sparks");
                    Assert.AreEqual(mark.modes, (int)Hash(state.robots, robot => (int)robot.mode), at + " robot modes");
                    Assert.AreEqual(mark.dadX, state.sidekick.x, tolerance, at + " sidekick x");
                    Assert.AreEqual(mark.dadZ, state.sidekick.z, tolerance, at + " sidekick z");
                    Assert.AreEqual(mark.dadYaw, Heading(state.sidekick.yaw), tolerance, at + " sidekick heading");
                    Assert.AreEqual(mark.dadMode, (int)state.sidekick.mode, at + " sidekick mode");
                    Assert.AreEqual(mark.oop, (int)state.oop, at + " alley-oop phase");
                    Assert.AreEqual(mark.holds, Hash(state.robots, robot => robot.hold), tolerance, at + " holds");
                    Assert.AreEqual(mark.stunned, (int)Hash(state.robots, robot => robot.stunned ? 1 : 0), at + " stunned");
                    Assert.AreEqual(mark.diving, state.diveIds.Length, at + " dive targets");
                    sidekickModes.Add(mark.dadMode); oopPhases.Add(mark.oop);
                    marks++;
                };
                foreach (var segment in probe.segments)
                {
                    var input = new ArenaInput
                    {
                        moveX = segment.moveX, moveZ = segment.moveZ, aimX = segment.aimX, aimZ = segment.aimZ,
                        jump = segment.jump, power = segment.power, action = segment.action, pounce = segment.pounce, sidekick = segment.sidekick,
                    };
                    for (int index = 0; index < segment.steps; index++)
                    {
                        state = ArenaSimulation.Step(layout, state, input);
                        step++; events |= state.events;
                        // Besides once a second, a run is checked at the very step the sidekick does something.
                        if (step % 120 == 0 || (state.events & Moments) != 0) check();
                    }
                }
                // The closing mark, unless the last step was already one.
                if (next == 0 || probe.marks[next - 1].step != step) check();
                Assert.AreEqual(probe.marks.Length, next, probe.name + " marks");
                Assert.AreEqual(probe.events, (int)events, probe.name + " events");
                Assert.AreEqual(probe.courseStars, state.progress.courseStars, probe.name);
                Assert.AreEqual(probe.ringStars, state.progress.ringStars, probe.name);
                Assert.AreEqual(probe.ringBest, state.progress.ringBest, probe.name);
                Assert.AreEqual(probe.stealthStars, state.progress.stealthStars, probe.name);
                Assert.AreEqual(probe.quiet, state.progress.quiet, probe.name);
                Assert.AreEqual(probe.courseBest, state.progress.courseBest, 1e-9, probe.name);
                CollectionAssert.AreEqual(probe.course, state.progress.course, probe.name);
                Assert.AreEqual(probe.catches, state.catches, probe.name);
                Assert.AreEqual(probe.ringHits, state.ringHits, probe.name);
                Assert.AreEqual(probe.seen, state.seen, probe.name);
                Assert.IsTrue(ArenaSimulation.IsValidProgress(layout, state.progress), probe.name + " ends with progress the arena can produce");
                reached |= events;
            }
            Assert.Greater(marks, 300);
            // Between them the runs reach every rule that raises an event, every way the sidekick can stand, and every phase of an alley-oop.
            foreach (ArenaEvent flag in Enum.GetValues(typeof(ArenaEvent))) if (flag != ArenaEvent.None) Assert.IsTrue((reached & flag) != 0, flag + " is covered by a recorded run");
            foreach (SidekickMode mode in Enum.GetValues(typeof(SidekickMode))) Assert.IsTrue(sidekickModes.Contains((int)mode), mode + " is seen at a recorded moment");
            foreach (OopPhase phase in Enum.GetValues(typeof(OopPhase))) Assert.IsTrue(oopPhases.Contains((int)phase), phase + " is seen at a recorded moment");
        }

        [Test]
        public void AStepNeverMutatesItsInputAndIsRepeatable()
        {
            var start = Run(Place(ArenaSimulation.Create(layout), 0, 4, 0), 4, new ArenaInput { moveX = 0.3, moveZ = 0.5 });
            double heroX = start.hero.x, robotX = start.robots[0].x, awareness = start.robots[0].awareness;
            int energy = start.energy, sparks = start.robots[0].sparks;
            var input = new ArenaInput { moveX = 1, moveZ = -1, jump = true, power = true, action = true, aimZ = 1 };
            var once = ArenaSimulation.Step(layout, start, input);
            var twice = ArenaSimulation.Step(layout, start, input);
            Assert.AreEqual(heroX, start.hero.x); Assert.AreEqual(robotX, start.robots[0].x); Assert.AreEqual(awareness, start.robots[0].awareness);
            Assert.AreEqual(energy, start.energy); Assert.AreEqual(sparks, start.robots[0].sparks);
            Assert.AreNotSame(start, once);
            Assert.AreNotSame(start.robots[0], once.robots[0]);
            Assert.AreNotSame(start.progress, once.progress);
            Assert.AreNotSame(start.sidekick, once.sidekick);
            Assert.AreEqual(once.sidekick.x, twice.sidekick.x); Assert.AreEqual(once.sidekick.z, twice.sidekick.z);
            Assert.AreEqual(once.hero.x, twice.hero.x); Assert.AreEqual(once.hero.z, twice.hero.z);
            for (int index = 0; index < once.robots.Length; index++)
            {
                Assert.AreEqual(once.robots[index].x, twice.robots[index].x);
                Assert.AreEqual(once.robots[index].mode, twice.robots[index].mode);
            }
            Assert.AreSame(start, ArenaSimulation.Step(layout, start, input, 0));
            Assert.AreSame(start, ArenaSimulation.Step(layout, start, input, double.NaN));
        }

        [Test]
        public void AQuietTakedownNeedsARobotThatCannotSeeLuke()
        {
            // The near yard guard starts at its post facing east.
            var behind = Run(Place(ArenaSimulation.Create(layout), 14.6, 1.6, Math.PI / 2), Step);
            Assert.AreEqual(TrialId.Stealth, behind.trial);
            Assert.AreEqual("yard-guard-a", behind.targetId);
            Assert.IsTrue(behind.targetQuiet);
            var guard = behind.FindRobot("yard-guard-a");
            Assert.AreEqual(ActionKind.Quiet, ArenaSimulation.ActionFor(layout, behind, guard));
            ArenaEvent events = ArenaEvent.None;
            var pounced = ArenaSimulation.Step(layout, behind, new ArenaInput { action = true, aimX = 1 });
            Assert.AreEqual("yard-guard-a", pounced.pounceId);
            Assert.IsTrue(pounced.pounceQuiet);
            pounced = Run(pounced, 1.2, default(ArenaInput), state => events |= state.events);
            Assert.AreEqual(RobotMode.Resolved, pounced.FindRobot("yard-guard-a").mode);
            Assert.IsTrue((events & ArenaEvent.Quiet) != 0 && (events & ArenaEvent.Resolve) != 0);
            Assert.AreEqual(1, pounced.progress.quiet);
            Assert.IsFalse(pounced.seen, "a quiet takedown is not being seen");

            // In front of it the same press is a snare, and Luke has been noticed.
            var front = Run(Place(ArenaSimulation.Create(layout), 22.5, 1.6, -Math.PI / 2), Step);
            Assert.AreEqual("yard-guard-a", front.targetId);
            Assert.IsFalse(front.targetQuiet);
            Assert.AreEqual(ActionKind.Snare, ArenaSimulation.ActionFor(layout, front, front.FindRobot("yard-guard-a")));
            var snared = ArenaSimulation.Step(layout, front, new ArenaInput { action = true, aimX = -1 });
            Assert.IsTrue((snared.events & ArenaEvent.Snare) != 0 && (snared.events & ArenaEvent.Spotted) != 0);
            Assert.AreEqual(1, snared.FindRobot("yard-guard-a").sparks);
            Assert.IsTrue(snared.seen);
            // Held: the next press pounces to finish, and that is not a quiet takedown.
            Assert.AreEqual(ActionKind.Pounce, ArenaSimulation.ActionFor(layout, snared, snared.FindRobot("yard-guard-a")));
        }

        [Test]
        public void TheSidekickThrowsBesideHimStunsElsewhereAndWaitsAtTheStealthGate()
        {
            // Standing still in the hub: he steps up, and the button offers the throw.
            var hub = Run(ArenaSimulation.Create(layout), 1);
            Assert.AreEqual(SidekickMode.Ready, hub.sidekick.mode);
            Assert.AreEqual(SidekickAsk.Oop, ArenaSimulation.SidekickFor(layout, hub));
            // In the ring with a wave up: one press throws Luke; time slows at the top; the dive powers the nearest robot down, once.
            var ring = Run(Place(ArenaSimulation.Create(layout), 0, 4, 0), layout.rules.waveDelay + 0.5);
            Assert.AreEqual(TrialId.Ring, ring.trial);
            Assert.AreEqual(SidekickAsk.Oop, ArenaSimulation.SidekickFor(layout, ring), "he hopped over and is ready");
            int before = 0;
            foreach (var robot in ring.robots) before += robot.sparks;
            int energy = ring.energy;
            var thrown = ArenaSimulation.Step(layout, ring, new ArenaInput { sidekick = true, aimZ = 1 });
            Assert.IsTrue((thrown.events & ArenaEvent.Toss) != 0);
            Assert.AreEqual(OopPhase.Rise, thrown.oop);
            Assert.AreEqual(SidekickMode.Toss, thrown.sidekick.mode);
            Assert.AreEqual(ActionKind.None, ArenaSimulation.ActionFor(layout, thrown, thrown.robots[0]), "nothing else to press on the way up");
            int hangs = 0, dives = 0, impacts = 0, hits = 0;
            double top = 0;
            var state = thrown;
            for (int index = 0; index < Steps(8) && !(state.oop == OopPhase.None && state.hero.mode == HeroMode.Ground); index++)
            {
                // Mash every button all the way: the result must still be applied once.
                state = ArenaSimulation.Step(layout, state, new ArenaInput { sidekick = index % 2 == 0, action = index % 2 == 0, pounce = index % 3 == 0, jump = index % 2 == 1, power = true, aimZ = 1 });
                if ((state.events & ArenaEvent.Hang) != 0) hangs++;
                if ((state.events & ArenaEvent.Dive) != 0) { dives++; Assert.GreaterOrEqual(state.diveIds.Length, 1); }
                if (state.oop != OopPhase.None && (state.events & ArenaEvent.Hit) != 0) hits++;
                if (state.oop == OopPhase.Dive && (state.events & ArenaEvent.Impact) != 0) impacts++;
                top = Math.Max(top, state.hero.y);
                if (state.oop == OopPhase.None && dives > 0) break;
            }
            Assert.AreEqual(1, hangs); Assert.AreEqual(1, dives); Assert.AreEqual(0, hits);
            Assert.Greater(top, layout.rules.oopApex - 0.2);
            int after = 0, resolved = 0;
            foreach (var robot in state.robots) { after += robot.sparks; if (robot.mode == RobotMode.Resolved) resolved++; }
            Assert.GreaterOrEqual(resolved, 1);
            Assert.GreaterOrEqual(before - after, 2);
            Assert.LessOrEqual(before - after, 2 + (layout.rules.diveCount - 1));
            Assert.AreEqual(energy, state.energy, "nothing touched Luke in the air");
            Assert.AreEqual(0, state.diveIds.Length);
            Assert.Greater(state.sidekick.cooldown, 0);
            Assert.AreEqual(SidekickAsk.None, ArenaSimulation.SidekickFor(layout, state));

            // Away from him the button stuns: a hold with no spark taken, and the action button then pounces to finish.
            var apart = Run(Place(ArenaSimulation.Create(layout), 0, 4, 0), layout.rules.waveDelay + 0.5);
            apart.sidekick.x = -5; apart.sidekick.z = 1; apart.sidekick.mode = SidekickMode.Follow;
            Assert.AreEqual(SidekickAsk.Stun, ArenaSimulation.SidekickFor(layout, apart));
            var target = ArenaSimulation.StunTarget(layout, apart);
            Assert.IsNotNull(target);
            var stunned = ArenaSimulation.Step(layout, apart, new ArenaInput { sidekick = true, aimZ = 1 });
            Assert.IsTrue((stunned.events & ArenaEvent.Stun) != 0);
            var dizzy = stunned.FindRobot(target.id);
            Assert.IsTrue(dizzy.stunned && dizzy.hold > 0 && !dizzy.tethered);
            Assert.AreEqual(layout.Profile(dizzy.kind).sparks, dizzy.sparks);
            Assert.AreEqual(SidekickMode.Stun, stunned.sidekick.mode);
            Assert.AreEqual(target.id, stunned.sidekick.aimId);
            Assert.AreEqual(ActionKind.Pounce, ArenaSimulation.ActionFor(layout, stunned, dizzy));

            // In the stealth yard he keeps watch at the gate and cannot be asked.
            var yard = Run(Place(ArenaSimulation.Create(layout), 14.4, -5.6, 0), 3);
            Assert.AreEqual(TrialId.Stealth, yard.trial);
            Assert.AreEqual(SidekickMode.Wait, yard.sidekick.mode);
            Assert.AreEqual(layout.sidekick.waits[0].x, yard.sidekick.x, 0.05);
            Assert.AreEqual(layout.sidekick.waits[0].z, yard.sidekick.z, 0.05);
            Assert.AreEqual(SidekickAsk.None, ArenaSimulation.SidekickFor(layout, yard));
            var pressed = ArenaSimulation.Step(layout, yard, new ArenaInput { sidekick = true });
            Assert.AreEqual(OopPhase.None, pressed.oop);
            Assert.AreEqual(ArenaEvent.None, pressed.events & (ArenaEvent.Toss | ArenaEvent.Stun));
        }

        [Test]
        public void RewardsOnlyGrowAndImpossibleProgressIsRefused()
        {
            var all = new List<string> { "course-1", "course-2", "course-3", "course-4", "course-5" };
            var slow = new ArenaProgress { course = all, courseStars = 2, courseBest = 61.5, quiet = 1 };
            var fast = new ArenaProgress { course = new List<string>(all), courseStars = 3, courseBest = 33.25, ringStars = 1, ringBest = 3 };
            var merged = ArenaSimulation.MergeProgress(layout, slow, fast);
            Assert.AreEqual(3, merged.courseStars); Assert.AreEqual(33.25, merged.courseBest); Assert.AreEqual(1, merged.ringStars); Assert.AreEqual(1, merged.quiet);
            Assert.AreEqual(61.5, ArenaSimulation.MergeProgress(layout, new ArenaProgress(), slow).courseBest, "no lap never beats a real one");
            var part = ArenaSimulation.MergeProgress(layout, new ArenaProgress { course = new List<string> { "course-4", "course-1" } }, new ArenaProgress { course = new List<string> { "course-2", "nonsense" } });
            CollectionAssert.AreEqual(new[] { "course-1", "course-2", "course-4" }, part.course, "level order, unknown ids dropped");
            foreach (var good in new[] { new ArenaProgress(), slow, fast, merged, part, new ArenaProgress { ringStars = 1, ringBest = 3 }, new ArenaProgress { course = all, courseStars = 1 } })
                Assert.IsTrue(ArenaSimulation.IsValidProgress(layout, good));
            var bad = new[]
            {
                null, new ArenaProgress { course = new List<string> { "course-2", "course-1" } }, new ArenaProgress { course = new List<string> { "course-1", "course-1" } },
                new ArenaProgress { courseStars = 1 }, new ArenaProgress { course = all }, new ArenaProgress { courseBest = 20 }, new ArenaProgress { course = all, courseStars = 2 },
                new ArenaProgress { course = all, courseStars = 3, courseBest = 50 }, new ArenaProgress { course = all, courseStars = 2, courseBest = double.NaN },
                new ArenaProgress { ringStars = 4, ringBest = 3 }, new ArenaProgress { ringStars = 1 }, new ArenaProgress { ringBest = 3 }, new ArenaProgress { stealthStars = -1 }, new ArenaProgress { quiet = -1 },
                new ArenaProgress { course = new List<string> { "course-9" } },
            };
            foreach (var progress in bad) Assert.IsFalse(ArenaSimulation.IsValidProgress(layout, progress));
        }

        [Test]
        public void SessionDeliversEveryPressAndPausesCleanly()
        {
            var session = new ArenaSession(layout);
            Assert.AreEqual(TrialId.None, session.State.trial);
            Assert.AreEqual(0, session.TotalStars);
            // A tap that began and ended between two frames still jumps.
            session.PressJump();
            session.Advance(1.0 / 30, 0, 0, false, false, false, false, 0, 1);
            Assert.IsTrue((session.FrameHeroEvents & HeroEvent.Jump) != 0);
            // Frames longer than the cap run in slow motion rather than tunnelling.
            double before = session.State.hero.airTime;
            session.Advance(5, 0, 0, false, false, false, false, 0, 1);
            Assert.LessOrEqual(session.State.hero.airTime - before, TraversalTuning.MaxFrameSeconds + 1e-9);
            Assert.IsTrue(session.Alpha >= 0 && session.Alpha <= 1);
            // Bad frame times are ignored.
            var same = session.State;
            session.Advance(0, 1, 1, true, true, true, true, 0, 1);
            session.Advance(double.NaN, 1, 1, true, true, true, true, 0, 1);
            session.Advance(double.PositiveInfinity, 1, 1, true, true, true, true, 0, 1);
            Assert.AreSame(same, session.State);
            // A held action button is one press; a latched press arrives as a fresh edge even while held.
            for (int frame = 0; frame < 30; frame++) session.Advance(1.0 / 60, 0, 1, false, false, true, false, 0, 1);
            Assert.IsTrue(session.State.actionHeld);
            session.PressAction();
            session.Advance(1.0 / 60, 0, 1, false, false, true, false, 0, 1);
            session.Settle();
            Assert.IsFalse(session.State.actionHeld);
            Assert.IsFalse(session.State.hero.jumpHeld);
            Assert.AreSame(session.State, session.Previous);
            Assert.AreEqual(ActionKind.None, session.Action, "nothing to act on in the hub");
            Assert.IsFalse(session.ShouldSave);
            // Pausing keeps the sidekick where he is. A tap of his button between two frames still reaches the rules as one press.
            Assert.IsTrue(session.State.sidekick.present);
            var calm = new ArenaSession(layout);
            for (int frame = 0; frame < 90; frame++) calm.Advance(1.0 / 60, 0, 0, false, false, false, false, 0, 1);
            Assert.AreEqual(SidekickAsk.Oop, calm.Sidekick);
            calm.PressSidekick();
            calm.Advance(1.0 / 60, 0, 0, false, false, false, false, 0, 1);
            Assert.IsTrue((calm.FrameEvents & ArenaEvent.Toss) != 0);
            Assert.AreEqual(OopPhase.Rise, calm.State.oop);
            calm.Settle();
            Assert.AreEqual(OopPhase.Rise, calm.State.oop, "a pause does not cancel a throw");
            Assert.IsTrue(calm.State.sidekick.present);
            Assert.IsFalse(calm.State.sidekickHeld);
            Assert.IsFalse(calm.ShouldSave, "a throw earns and stores nothing");
        }

        [Test]
        public void SaveTextRoundTripsMergesAndRespectsANewerBuild()
        {
            var session = new ArenaSession(layout);
            string empty = session.SaveText(null);
            Assert.IsTrue(empty.StartsWith("space-dragon.arena/1\nworld=luke-arena-v001\n", StringComparison.Ordinal));
            Assert.IsFalse(empty.Contains("x="), "stars and counters only: no position, nothing about a learner");
            var earned = new ArenaProgress { course = new List<string> { "course-1", "course-3" }, ringBest = 2, stealthStars = 3, quiet = 4 };
            string text = ArenaSession.Encode(layout, earned);
            var decoded = ArenaSession.Decode(layout, text, out ArenaSaveStatus status);
            Assert.AreEqual(ArenaSaveStatus.Restored, status);
            CollectionAssert.AreEqual(earned.course, decoded.course);
            Assert.AreEqual(3, decoded.stealthStars); Assert.AreEqual(2, decoded.ringBest); Assert.AreEqual(4, decoded.quiet);
            Assert.AreEqual(text, ArenaSession.Encode(layout, decoded), "stable bytes");
            // A fresh session saving over stored stars keeps them.
            Assert.AreEqual(text, new ArenaSession(layout).SaveText(text));
            // Restoring starts a new visit with the stars and the yard as new.
            Assert.AreEqual(ArenaSaveStatus.Restored, session.Restore(text));
            Assert.AreEqual(3, session.TotalStars);
            Assert.AreEqual(layout.rules.energyMax, session.State.energy);
            Assert.IsTrue(session.MayWriteSave);
            // Nothing stored, damaged text, another world and impossible progress all start fresh without throwing.
            Assert.IsNull(ArenaSession.Decode(layout, "", out status)); Assert.AreEqual(ArenaSaveStatus.Fresh, status);
            foreach (string broken in new[] { "garbage", "space-dragon.arena/x\n", "space-dragon.arena/1\nworld=luke-arena-v001\n", text.Replace("luke-arena-v001", "elsewhere"),
                text.Replace("stealthStars=3", "stealthStars=7"), text.Replace("quiet=4", "quiet=4\nquiet=5"), text.Replace("ringBest=2", "ringBest=two"), text.Replace("course=course-1,course-3", "course=course-3,course-1") })
            {
                Assert.IsNull(ArenaSession.Decode(layout, broken, out status), broken);
                Assert.AreEqual(ArenaSaveStatus.Unreadable, status, broken);
                Assert.AreEqual(ArenaSaveStatus.Unreadable, new ArenaSession(layout).Restore(broken));
            }
            // A newer build's save is never read as ours and never overwritten.
            string newer = text.Replace("space-dragon.arena/1", "space-dragon.arena/2");
            Assert.AreEqual(ArenaSaveStatus.Newer, session.Restore(newer));
            Assert.IsFalse(session.MayWriteSave);
            Assert.IsNull(session.SaveText(newer));
            Assert.IsNull(session.ResetText());
            Assert.IsNull(new ArenaSession(layout).SaveText(newer), "even a session that never loaded it leaves it alone");
            // Clearing stars on purpose writes an empty save.
            var clearing = new ArenaSession(layout);
            clearing.Restore(text);
            Assert.AreEqual(empty, clearing.ResetText());
            Assert.AreEqual(0, clearing.TotalStars);
        }

        [Test]
        public void ReachingTheVaultTwiceEarnsItsStarsOnce()
        {
            // North of the vault, behind the floodlight.
            var state = Run(Place(ArenaSimulation.Create(layout), 27.6, 20.6, Math.PI), Step);
            Assert.AreEqual(TrialId.Stealth, state.trial);
            ArenaEvent events = ArenaEvent.None;
            state = Run(state, 1.5, new ArenaInput { moveZ = -1 }, next => events |= next.events);
            Assert.IsTrue(state.vaultTaken);
            Assert.IsTrue((events & ArenaEvent.Star) != 0 && (events & ArenaEvent.Trial) != 0);
            int stars = state.progress.stealthStars;
            Assert.GreaterOrEqual(stars, 2);
            events = ArenaEvent.None;
            state = Run(state, 1, new ArenaInput { moveZ = 1 }, next => events |= next.events);
            state = Run(state, 1.5, new ArenaInput { moveZ = -1 }, next => events |= next.events);
            Assert.AreEqual(stars, state.progress.stealthStars);
            Assert.AreEqual(ArenaEvent.None, events & (ArenaEvent.Star | ArenaEvent.Pickup | ArenaEvent.Trial));
        }
    }
}
