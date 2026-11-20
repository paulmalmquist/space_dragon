using System;
using System.Collections.Generic;
using NUnit.Framework;

namespace SpaceDragon.Traversal.Tests
{
    /// <summary>
    /// Engine-free checks for Luke's Playground: the generated level reproduces the TypeScript
    /// reference, the session loop is deterministic and its rewards and saves are safe. The same
    /// source runs in Unity EditMode and under `dotnet test`.
    /// </summary>
    public sealed class PlaygroundCoreTests
    {
        private const double Step = TraversalTuning.Step;
        private TraversalWorld world;

        [SetUp]
        public void CreateWorld() { world = LukePlaygroundData.Create(); }

        [Test]
        public void GeneratedLevelExtendsTheHomeBlock()
        {
            var block = HomeBlockData.Create();
            Assert.AreEqual("luke-playground-v001", world.id);
            Assert.AreEqual(block.solids.Length + 4, world.solids.Length);
            Assert.AreEqual(block.anchors.Length + 1, world.anchors.Length);
            Assert.AreEqual(14, world.sparks.Length);
            for (int index = 0; index < block.solids.Length; index++) Assert.AreEqual(block.solids[index].id, world.solids[index].id);
            var ids = new HashSet<string>();
            foreach (var solid in world.solids) Assert.IsTrue(ids.Add(solid.id), solid.id);
            Assert.IsNotNull(world.FindAnchor("playset-mast"));
            Assert.IsTrue(world.FindAnchor("playset-mast").perch);
            Assert.AreEqual(64, LukePlaygroundData.SourceFingerprint.Length);
        }

        [Test]
        public void ScriptedProbesEndWhereTheTypeScriptReferenceEnds()
        {
            Assert.GreaterOrEqual(LukePlaygroundData.Probes.Length, 4);
            foreach (var probe in LukePlaygroundData.Probes)
            {
                var hero = HeroSimulation.Create(world, probe.startX, probe.startZ, probe.startYaw, probe.hasStartY ? probe.startY : (double?)null);
                var collected = new HashSet<string>();
                var tethers = new List<string>();
                HeroEvent events = HeroEvent.None;
                foreach (var segment in probe.segments)
                {
                    var input = new HeroInput { moveX = segment.moveX, moveZ = segment.moveZ, jump = segment.jump, power = segment.power };
                    for (int step = 0; step < segment.steps; step++)
                    {
                        hero = HeroSimulation.Step(world, hero, input);
                        events |= hero.events;
                        if (hero.tetherId.Length > 0 && !tethers.Contains(hero.tetherId)) tethers.Add(hero.tetherId);
                        PracticeSparks.Collect(world, hero, collected);
                    }
                }
                const double tolerance = 1e-9;
                Assert.AreEqual(probe.endX, hero.x, tolerance, probe.name + " x");
                Assert.AreEqual(probe.endY, hero.y, tolerance, probe.name + " y");
                Assert.AreEqual(probe.endZ, hero.z, tolerance, probe.name + " z");
                Assert.AreEqual(probe.endVx, hero.vx, tolerance, probe.name + " vx");
                Assert.AreEqual(probe.endVy, hero.vy, tolerance, probe.name + " vy");
                Assert.AreEqual(probe.endVz, hero.vz, tolerance, probe.name + " vz");
                Assert.AreEqual(probe.endYaw, hero.yaw, tolerance, probe.name + " yaw");
                Assert.AreEqual(probe.endMode, hero.mode, probe.name + " mode");
                Assert.AreEqual(probe.endGroundId, hero.groundId, probe.name + " ground");
                Assert.AreEqual(probe.events, (int)events, probe.name + " events");
                CollectionAssert.AreEqual(probe.tethers, tethers, probe.name + " tethers");
                var found = new List<string>();
                foreach (var spark in world.sparks) if (collected.Contains(spark.id)) found.Add(spark.id);
                var expected = new List<string>(probe.collected);
                expected.Sort(StringComparer.Ordinal); found.Sort(StringComparer.Ordinal);
                CollectionAssert.AreEqual(expected, found, probe.name + " sparks");
            }
        }

        [Test]
        public void MotionRulesReproduceTheReferenceSamples()
        {
            var weights = new double[PersonMotion.ClipCount];
            foreach (var sample in PersonMotionData.Samples)
            {
                PersonMotion.LocomotionWeights(sample.speed, weights);
                Assert.AreEqual(sample.idle, weights[0], 1e-12, "idle at " + sample.speed);
                Assert.AreEqual(sample.walk, weights[1], 1e-12, "walk at " + sample.speed);
                Assert.AreEqual(sample.run, weights[2], 1e-12, "run at " + sample.speed);
                Assert.AreEqual(sample.sprint, weights[3], 1e-12, "sprint at " + sample.speed);
                Assert.AreEqual(sample.stride, PersonMotion.StrideCyclesPerSecond(weights, sample.speed), 1e-12, "stride at " + sample.speed);
            }
            for (int index = 0; index < PersonMotionData.CrouchEnvelopes.Length; index++)
                Assert.AreEqual(PersonMotionData.CrouchDrops[index], PersonMotion.CrouchDrop(PersonMotionData.CrouchEnvelopes[index]), 1e-12);
            PersonMotion.LocomotionWeights(double.NaN, weights);
            Assert.AreEqual(1, weights[0]);
            PersonMotion.LocomotionWeights(-4, weights);
            Assert.AreEqual(1, weights[0]);
            Assert.Throws<ArgumentException>(() => PersonMotion.LocomotionWeights(1, new double[2]));
            Assert.AreEqual(4, PersonMotionData.ClipIds.Length);
            Assert.AreEqual(7, PersonMotionData.Poses.Length);
            CollectionAssert.AreEqual(new[] { "rise", "fall", "swing", "land", "climbLeft", "climbRight", "dizzy" }, Array.ConvertAll(PersonMotionData.Poses, pose => pose.id));
            for (int index = 0; index < PersonMotionData.ClimbPhases.Length; index++)
                Assert.AreEqual(PersonMotionData.ClimbLeftWeights[index], PersonMotion.ClimbLeftWeight(PersonMotionData.ClimbPhases[index]), 1e-12);
            Assert.AreEqual(0.5, PersonMotion.ClimbLeftWeight(double.NaN));
            foreach (var pose in PersonMotionData.Poses) foreach (var turn in pose.turns)
            {
                StringAssert.StartsWith("Bip01 ", turn.bone);
                Assert.IsTrue(turn.axis == 'x' || turn.axis == 'y' || turn.axis == 'z');
            }
        }

        [Test]
        public void TheSameSecondsGiveTheSameHeroHoweverFramesAreSliced()
        {
            PlaygroundSession Run(double frame)
            {
                var session = new PlaygroundSession(world);
                int frames = (int)Math.Round(1.5 / frame);
                for (int index = 0; index < frames; index++) session.Advance(frame, 0, 1, false, false);
                return session;
            }
            var coarse = Run(1.0 / 30);
            var fine = Run(1.0 / 120);
            Assert.AreEqual(fine.Hero.x, coarse.Hero.x, 1e-9);
            Assert.AreEqual(fine.Hero.z, coarse.Hero.z, 1e-9);
            Assert.Greater(fine.Hero.z, world.spawn.z + 1);
            // A long frame is capped: the hero moves in slow motion instead of tunnelling.
            var stalled = new PlaygroundSession(world);
            stalled.Advance(5, 0, 1, false, false);
            Assert.Less(stalled.Hero.z - world.spawn.z, 0.3);
            // Unusable time changes nothing.
            var before = stalled.Hero;
            stalled.Advance(double.NaN, 1, 1, true, true);
            stalled.Advance(-1, 1, 1, true, true);
            stalled.Advance(double.PositiveInfinity, 1, 1, true, true);
            Assert.AreSame(before, stalled.Hero);
            Assert.GreaterOrEqual(stalled.Alpha, 0);
            Assert.LessOrEqual(stalled.Alpha, 1);
        }

        [Test]
        public void AQuickTapBetweenSlowFramesStillJumpsExactlyOnce()
        {
            var session = new PlaygroundSession(world);
            session.Place(4.5, -1.5, 0);
            session.PressJump();
            HeroEvent seen = HeroEvent.None;
            int jumps = 0;
            for (int frame = 0; frame < 90; frame++)
            {
                session.Advance(1.0 / 30, 0, 0, false, false);
                if ((session.FrameEvents & HeroEvent.Jump) != 0) jumps++;
                seen |= session.FrameEvents;
            }
            Assert.AreEqual(1, jumps);
            Assert.IsTrue((seen & HeroEvent.Land) != 0);
            Assert.AreEqual(HeroMode.Ground, session.Hero.mode);
            // A press while the key is still held is delivered as a fresh edge after one released step.
            session.Advance(1.0 / 30, 0, 0, true, false);
            for (int frame = 0; frame < 60; frame++) session.Advance(1.0 / 30, 0, 0, true, false);
            Assert.AreEqual(HeroMode.Ground, session.Hero.mode);
            session.PressJump();
            jumps = 0;
            for (int frame = 0; frame < 20; frame++) { session.Advance(1.0 / 30, 0, 0, true, false); if ((session.FrameEvents & HeroEvent.Jump) != 0) jumps++; }
            Assert.AreEqual(1, jumps);
        }

        [Test]
        public void SparksAreCollectedOnceAndSurviveASaveRoundTrip()
        {
            var session = new PlaygroundSession(world);
            session.Place(0.15, -4, Math.PI / 2);
            bool found = false;
            for (int frame = 0; frame < 150; frame++) { session.Advance(1.0 / 60, 1, 0, false, false); found |= session.FoundSpark; }
            Assert.IsTrue(found);
            Assert.IsTrue(session.IsCollected("spark-13"));
            int count = session.SparkCount;
            // Standing in the same place never awards it again.
            for (int frame = 0; frame < 60; frame++) { session.Advance(1.0 / 60, 0, 0, false, false); Assert.IsFalse(session.FoundSpark); }
            Assert.AreEqual(count, session.SparkCount);

            string text = PlaygroundSession.Encode(session.Snapshot());
            var reloaded = new PlaygroundSession(world);
            Assert.AreEqual(PlaygroundSaveStatus.Restored, reloaded.Restore(text));
            Assert.AreEqual(count, reloaded.SparkCount);
            Assert.IsTrue(reloaded.IsCollected("spark-13"));
            // Restoring twice, or restoring the reloaded snapshot, changes nothing.
            Assert.AreEqual(text, PlaygroundSession.Encode(reloaded.Snapshot()));
            reloaded.Restore(text);
            Assert.AreEqual(count, reloaded.SparkCount);
            reloaded.Reset();
            Assert.AreEqual(0, reloaded.SparkCount);
            Assert.AreEqual(world.spawn.x, reloaded.Hero.x, 1e-12);
        }

        [Test]
        public void OnlyAPlaceAReloadCanReturnToIsSaved()
        {
            var session = new PlaygroundSession(world);
            var ground = session.Snapshot();
            Assert.AreEqual(world.spawn.x, ground.x, 1e-12);
            // On the tower deck a reload would start on the grass below, so the last good ground pose is kept.
            session.Place(3.5, -4, 0, 1.6);
            Assert.AreEqual("playset-deck", session.Hero.groundId);
            var raised = session.Snapshot(ground);
            Assert.AreEqual(ground.x, raised.x, 1e-12);
            Assert.AreEqual(ground.z, raised.z, 1e-12);
            // In the air nothing new is stored either.
            session.Place(4.5, -1.5, 0);
            session.PressJump();
            session.Advance(1.0 / 30, 0, 0, false, false);
            session.Advance(1.0 / 30, 0, 0, false, false);
            Assert.AreEqual(HeroMode.Air, session.Hero.mode);
            Assert.AreEqual(world.spawn.z, session.Snapshot().z, 1e-12);
            Assert.AreEqual(ground.z, session.Snapshot(ground).z, 1e-12);
        }

        [Test]
        public void DamagedForeignAndNewerSavesAreHandledSafely()
        {
            var session = new PlaygroundSession(world);
            Assert.AreEqual(PlaygroundSaveStatus.Fresh, session.Restore(""));
            Assert.AreEqual(PlaygroundSaveStatus.Fresh, session.Restore(null));
            Assert.AreEqual(PlaygroundSaveStatus.Unreadable, session.Restore("{\"version\":2}"));
            Assert.AreEqual(PlaygroundSaveStatus.Unreadable, session.Restore(PlaygroundSession.SaveHeader + "/0\nworld=" + world.id + "\n"));
            Assert.AreEqual(PlaygroundSaveStatus.Unreadable, session.Restore(PlaygroundSession.SaveHeader + "/1\nworld=some-other-level\nx=0\nz=0\nyaw=0\ncollected=spark-01\n"));
            Assert.AreEqual(0, session.SparkCount);
            Assert.IsTrue(session.MayWriteSave);

            // Unknown sparks and duplicates are dropped; a position inside a wall falls back to the spawn.
            string odd = PlaygroundSession.SaveHeader + "/1\nworld=" + world.id + "\nx=-0.5\nz=-2\nyaw=0\ncollected=spark-02,spark-02,not-a-spark,spark-14\n";
            Assert.AreEqual(PlaygroundSaveStatus.RecoveredPosition, session.Restore(odd));
            Assert.AreEqual(2, session.SparkCount);
            Assert.AreEqual(world.spawn.x, session.Hero.x, 1e-12);
            string broken = PlaygroundSession.SaveHeader + "/1\nworld=" + world.id + "\nx=abc\nz=NaN\ncollected=spark-05\n";
            Assert.AreEqual(PlaygroundSaveStatus.RecoveredPosition, session.Restore(broken));
            Assert.AreEqual(1, session.SparkCount);

            // A newer build's data is never overwritten by this one.
            Assert.AreEqual(PlaygroundSaveStatus.Newer, session.Restore(PlaygroundSession.SaveHeader + "/9\nworld=" + world.id + "\nfuture=1\n"));
            Assert.IsFalse(session.MayWriteSave);
            Assert.AreEqual(0, session.SparkCount);
            session.Reset();
            Assert.IsTrue(session.MayWriteSave);

            // Numbers are written in a culture-independent form that reads back exactly.
            var save = new PlaygroundSave { world = world.id, x = 1.0 / 3, z = -2.5e-7, yaw = Math.PI, collected = new[] { "spark-01" } };
            var read = PlaygroundSession.Decode(PlaygroundSession.Encode(save), out var status);
            Assert.AreEqual(PlaygroundSaveStatus.Restored, status);
            Assert.AreEqual(save.x, read.x);
            Assert.AreEqual(save.z, read.z);
            Assert.AreEqual(save.yaw, read.yaw);
            Assert.Throws<ArgumentNullException>(() => PlaygroundSession.Encode(null));
        }

        [Test]
        public void AHeroAtRestIsBitStable()
        {
            foreach (double yaw in new[] { 0, 0.1404878048780487, -2.9, Math.PI, 1e-12 })
            {
                var hero = HeroSimulation.Create(world, -2, -1.5, yaw);
                double x = hero.x, y = hero.y, z = hero.z, facing = hero.yaw;
                for (int step = 0; step < 600; step++) hero = HeroSimulation.Step(world, hero, new HeroInput());
                Assert.AreEqual(x, hero.x); Assert.AreEqual(y, hero.y); Assert.AreEqual(z, hero.z);
                Assert.AreEqual(facing, hero.yaw, "idle facing from " + yaw);
            }
            var session = new PlaygroundSession(world);
            for (int frame = 0; frame < 30; frame++) session.Advance(1.0 / 60, 1, 0, false, false);
            for (int frame = 0; frame < 60; frame++) session.Advance(1.0 / 60, 0, 0, false, false);
            string settled = PlaygroundSession.Encode(session.Snapshot());
            for (int frame = 0; frame < 120; frame++) session.Advance(1.0 / 60, 0, 0, false, false);
            Assert.AreEqual(settled, PlaygroundSession.Encode(session.Snapshot()), "a resting hero saves the same text every time");
            Assert.AreEqual(world.spawn.z, session.Hero.z, "walking straight picks up no sideways travel");
        }

        [Test]
        public void ATetherTargetIsOfferedOnlyWhenOneCouldBeTaken()
        {
            var session = new PlaygroundSession(world);
            session.Advance(1.0 / 60, 0, 0, false, false);
            Assert.AreEqual("", session.CandidateAnchorId);
            session.Place(4.9, 0.4, Math.PI / 2);
            string seen = "";
            for (int frame = 0; frame < 90 && seen.Length == 0; frame++) { session.Advance(1.0 / 60, 1, 0, false, true); seen = session.CandidateAnchorId; }
            Assert.IsNotEmpty(seen);
            Assert.IsNotNull(world.FindAnchor(seen));
            session.Settle();
            Assert.AreEqual(0, session.Hero.vx);
        }
    }
}
