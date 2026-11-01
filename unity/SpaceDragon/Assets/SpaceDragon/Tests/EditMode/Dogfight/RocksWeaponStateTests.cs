using System;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class RocksWeaponStateTests
    {
        DogfightTuning tuning;
        [SetUp] public void SetUp() { tuning = ScriptableObject.CreateInstance<DogfightTuning>(); tuning.EnableRockWeapons = true; }
        [TearDown] public void TearDown() => UnityEngine.Object.DestroyImmediate(tuning);
        RocksWeaponState NewState()
        {
            var state = new RocksWeaponState(tuning);
            state.Reset(new[] { new RockPocket("rock-2", new Vector3(20, 10, -30)), new RockPocket("rock-7", new Vector3(-50, 40, 200)) });
            return state;
        }

        [Test]
        public void EachExistingPocketDetonatesOnceWithTheConfiguredDamageAndPosition()
        {
            var state = NewState();
            var blast = state.TryDetonate("rock-2"); Assert.That(blast.HasValue, Is.True);
            Assert.That(blast.Value.Id, Is.EqualTo("rock-2")); Assert.That(blast.Value.Position, Is.EqualTo(new Vector3(20, 10, -30)));
            Assert.That(blast.Value.EnemyRadius, Is.EqualTo(tuning.GasEnemyRadius)); Assert.That(blast.Value.PlayerRadius, Is.EqualTo(tuning.GasPlayerRadius));
            Assert.That(blast.Value.EnemyDamage, Is.EqualTo(tuning.GasEnemyDamage)); Assert.That(blast.Value.PlayerDamage, Is.EqualTo(tuning.GasPlayerDamage));
            Assert.That(state.Pockets[0].Detonated, Is.True); Assert.That(state.Pockets[1].Detonated, Is.False);
            Assert.That(state.TryDetonate("rock-2").HasValue, Is.False);
            Assert.That(state.TryDetonate("rock-7").HasValue, Is.True);
            Assert.That(state.TryDetonate("missing").HasValue, Is.False);
            Assert.That(state.TryDetonate(null).HasValue, Is.False);
        }

        [TestCase(119.99f, true, false)] [TestCase(120f, true, false)] [TestCase(120.01f, false, false)]
        [TestCase(39.99f, true, true)] [TestCase(40f, true, true)] [TestCase(40.01f, true, false)]
        public void GasBlastUsesIndependentEnemyAndPlayerRadiiInThreeDimensions(float distance, bool enemy, bool player)
        {
            var blast = NewState().TryDetonate("rock-2").Value;
            foreach (var axis in new[] { Vector3.right, Vector3.up, Vector3.forward })
            {
                Vector3 position = blast.Position + axis * distance;
                Assert.That(blast.ContainsEnemy(position), Is.EqualTo(enemy));
                Assert.That(blast.ContainsPlayer(position), Is.EqualTo(player));
            }
            Assert.That(blast.ContainsEnemy(new Vector3(float.NaN, 0, 0)), Is.False);
            Assert.That(blast.ContainsPlayer(new Vector3(0, float.PositiveInfinity, 0)), Is.False);
        }

        [Test]
        public void RockShotAwardsOneNearbyImpactAndCannotReplayAnOldDistantExplosion()
        {
            var state = NewState();
            Assert.That(state.TryRockShot(1, new Vector3(160, 0, 0), Vector3.zero), Is.True);
            Assert.That(state.TryRockShot(1, Vector3.zero, Vector3.zero), Is.False);
            Assert.That(state.TryRockShot(2, new Vector3(0, 160.01f, 0), Vector3.zero), Is.False);
            Assert.That(state.TryRockShot(2, Vector3.zero, Vector3.zero), Is.False, "One exploded missile cannot be reconsidered after the player moves.");
            Assert.That(state.TryRockShot(3, new Vector3(0, 0, 159.99f), Vector3.zero), Is.True);
            Assert.That(state.TryRockShot(-1, Vector3.zero, Vector3.zero), Is.False);
            Assert.That(state.TryRockShot(4, new Vector3(float.NaN, 0, 0), Vector3.zero), Is.False);
            Assert.That(state.TryRockShot(4, Vector3.zero, Vector3.zero), Is.True, "Malformed samples do not consume a valid event ID.");
        }

        [Test]
        public void FlagOffProducesNoDetonationOrResourceAuthorization()
        {
            var state = NewState(); tuning.EnableRockWeapons = false;
            Assert.That(state.TryDetonate("rock-2").HasValue, Is.False);
            Assert.That(state.TryRockShot(1, Vector3.zero, Vector3.zero), Is.False);
            Assert.That(state.Pockets[0].Detonated, Is.False);
            tuning.EnableRockWeapons = true;
            Assert.That(state.TryDetonate("rock-2").HasValue, Is.True);
            Assert.That(state.TryRockShot(1, Vector3.zero, Vector3.zero), Is.True);
        }

        [Test]
        public void RestartRestoresPocketAvailabilityWithNewActualPositionsAndResetsMissileDeduplication()
        {
            var state = NewState(); state.TryDetonate("rock-2"); state.TryRockShot(1, Vector3.zero, Vector3.zero);
            var positions = new[] { new RockPocket("rock-2", new Vector3(500, -20, 80)) };
            state.Reset(positions);
            positions[0] = new RockPocket("changed-outside", Vector3.zero);
            Assert.That(state.Pockets.Count, Is.EqualTo(1)); Assert.That(state.Pockets[0].Detonated, Is.False);
            Assert.That(state.TryDetonate("rock-2").Value.Position, Is.EqualTo(new Vector3(500, -20, 80)));
            Assert.That(state.TryDetonate("rock-7").HasValue, Is.False);
            Assert.That(state.TryRockShot(1, Vector3.zero, Vector3.zero), Is.True);
            state.Reset(state.Pockets);
            Assert.That(state.Pockets[0].Detonated, Is.False, "The state's immutable snapshots may seed a fresh restart.");
            state.Reset(null); Assert.That(state.Pockets.Count, Is.Zero);
        }

        [Test]
        public void SnapshotCollectionIsReadOnlyAndInvalidResetIsAtomic()
        {
            var state = NewState(); state.TryDetonate("rock-2"); state.TryRockShot(1, Vector3.zero, Vector3.zero);
            Assert.Throws<NotSupportedException>(() => ((IList<RockPocket>)state.Pockets)[0] = new RockPocket("other", Vector3.zero));
            Assert.Throws<ArgumentException>(() => state.Reset(new[] { new RockPocket("duplicate", Vector3.zero), new RockPocket("duplicate", Vector3.one) }));
            Assert.Throws<ArgumentException>(() => state.Reset(new[] { new RockPocket("", Vector3.zero) }));
            Assert.Throws<ArgumentException>(() => state.Reset(new[] { new RockPocket("bad", new Vector3(float.PositiveInfinity, 0, 0)) }));
            Assert.That(state.Pockets.Count, Is.EqualTo(2)); Assert.That(state.Pockets[0].Detonated, Is.True);
            Assert.That(state.TryRockShot(1, Vector3.zero, Vector3.zero), Is.False);
        }

        [Test]
        public void DetonationSnapshotsKeepTheirCommittedValuesWhenTuningChanges()
        {
            var state = NewState(); tuning.GasEnemyRadius = 70; tuning.GasPlayerRadius = 12;
            tuning.GasEnemyDamage = 80; tuning.GasPlayerDamage = 5;
            var blast = state.TryDetonate("rock-2").Value;
            tuning.GasEnemyRadius = 1; tuning.GasPlayerDamage = 999;
            Assert.That(blast.EnemyRadius, Is.EqualTo(70)); Assert.That(blast.PlayerRadius, Is.EqualTo(12));
            Assert.That(blast.EnemyDamage, Is.EqualTo(80)); Assert.That(blast.PlayerDamage, Is.EqualTo(5));
        }

        [Test]
        public void InvalidTuningCannotCommitAnExplosionOrConsumeItsPocket()
        {
            Assert.Throws<ArgumentNullException>(() => new RocksWeaponState(null));
            var state = NewState(); tuning.GasEnemyDamage = float.NaN;
            Assert.Throws<ArgumentException>(() => new RocksWeaponState(tuning));
            Assert.That(state.TryDetonate("rock-2").HasValue, Is.False);
            Assert.That(state.Pockets[0].Detonated, Is.False);
            tuning.GasEnemyDamage = 240; tuning.RockShotNearRange = float.NaN;
            Assert.That(state.TryRockShot(1, Vector3.zero, Vector3.zero), Is.False);
        }
    }
}
