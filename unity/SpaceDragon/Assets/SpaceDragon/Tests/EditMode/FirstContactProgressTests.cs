using System;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.FirstContact.Tests
{
    public sealed class FirstContactProgressTests
    {
        [Test]
        public void RevealCompletionAndSkipHaveTheSameUnrewardedHandoff()
        {
            var played = new FirstContactProgress();
            var skipped = new FirstContactProgress();
            Assert.That(played.TryOpenPod(true), Is.EqualTo(PodInteractionResult.Unavailable));
            played.AdvanceReveal(FirstContactProgress.RevealDurationSeconds);
            skipped.SkipReveal();
            Assert.That(played.Phase, Is.EqualTo(ContactPhase.Play));
            Assert.That(skipped.Phase, Is.EqualTo(played.Phase));
            Assert.That(played.PodRewardCount, Is.Zero);
            Assert.That(skipped.PodRewardCount, Is.Zero);
        }

        [Test]
        public void ProximityRewardSurvivesRepeatedInputReplayAndReloadOnce()
        {
            var progress = new FirstContactProgress();
            progress.SkipReveal();
            Assert.That(progress.TryOpenPod(false), Is.EqualTo(PodInteractionResult.OutOfReach));
            Assert.That(progress.TryOpenPod(true), Is.EqualTo(PodInteractionResult.Opened));
            Assert.That(progress.TryOpenPod(true), Is.EqualTo(PodInteractionResult.AlreadyOpened));
            progress.ReplayReveal();
            Assert.That(progress.PodRewardCount, Is.EqualTo(1));
            progress.SkipReveal();
            var reloaded = FirstContactProgress.Restore(progress.CreateCheckpoint());
            reloaded.SkipReveal();
            Assert.That(reloaded.TryOpenPod(true), Is.EqualTo(PodInteractionResult.AlreadyOpened));
            Assert.That(reloaded.PodRewardCount, Is.EqualTo(1));
        }

        [Test]
        public void PauseFreezesRevealAndDisallowsInteractionAndSkip()
        {
            var progress = new FirstContactProgress();
            progress.AdvanceReveal(1);
            progress.SetPaused(true);
            progress.AdvanceReveal(20);
            progress.SkipReveal();
            Assert.That(progress.RevealSeconds, Is.EqualTo(1));
            Assert.That(progress.Phase, Is.EqualTo(ContactPhase.Reveal));
            Assert.That(progress.TryOpenPod(true), Is.EqualTo(PodInteractionResult.Unavailable));
            progress.SetPaused(false);
            progress.AdvanceReveal(2);
            Assert.That(progress.Phase, Is.EqualTo(ContactPhase.Play));
            Assert.That(progress.TryOpenPod(true), Is.EqualTo(PodInteractionResult.Opened));
        }

        [Test]
        public void InvalidAndFutureCheckpointsCannotInventOrDuplicateRewards()
        {
            foreach (var checkpoint in new[] {
                new FirstContactCheckpoint { schemaVersion = 2 },
                new FirstContactCheckpoint { podOpened = true, podRewardCount = 0 },
                new FirstContactCheckpoint { podOpened = true, podRewardCount = 2 },
                new FirstContactCheckpoint { hasPosition = true, playerX = float.NaN },
                new FirstContactCheckpoint { hasPosition = true, playerY = -100 },
            })
            {
                Assert.That(FirstContactProgress.IsValidCheckpoint(checkpoint), Is.False);
                Assert.Throws<ArgumentException>(() => FirstContactProgress.Restore(checkpoint));
            }
        }

        private sealed class MemoryStore : IContactPreferenceStore
        {
            public readonly Dictionary<string, string> Values = new Dictionary<string, string>();
            public int Writes;
            public int Flushes;
            public bool FailWrites;
            public bool HasKey(string key) => Values.ContainsKey(key);
            public string Read(string key) => Values[key];
            public void Write(string key, string value)
            {
                if (FailWrites) throw new InvalidOperationException("Synthetic storage failure");
                Values[key] = value; Writes++;
            }
            public void Flush() { Flushes++; }
        }

        [Test]
        public void StorageUsesOnlyTheCandidateKeyAndPreservesUnknownData()
        {
            var store = new MemoryStore();
            store.Values["space-dragon.save.v2"] = "unchanged Babylon fixture";
            var storage = new FirstContactStorage(store);
            var progress = FirstContactProgress.Restore(storage.Load());
            progress.SkipReveal(); progress.TryOpenPod(true);
            Assert.That(storage.Save(progress.CreateCheckpoint()), Is.True);
            Assert.That(store.Values["space-dragon.save.v2"], Is.EqualTo("unchanged Babylon fixture"));
            Assert.That(store.Values.Count, Is.EqualTo(2));
            Assert.That(store.Flushes, Is.EqualTo(1));
            var restored = new FirstContactStorage(store).Load();
            Assert.That(restored.podRewardCount, Is.EqualTo(1));
            Assert.That(restored.podOpened, Is.True);
        }

        [Test]
        public void FutureSaveAndMalformedSaveStayUntouched()
        {
            foreach (string original in new[] { "{\"schemaVersion\":99}", "not json" })
            {
                var store = new MemoryStore();
                store.Values[FirstContactStorage.SaveKey] = original;
                var storage = new FirstContactStorage(store);
                var checkpoint = storage.Load();
                Assert.That(checkpoint.podRewardCount, Is.Zero);
                Assert.That(storage.Save(checkpoint), Is.False);
                Assert.That(store.Values[FirstContactStorage.SaveKey], Is.EqualTo(original));
                Assert.That(store.Writes, Is.Zero);
            }
        }

        [Test]
        public void FailedStorageReportsSessionOnlyWithoutChangingState()
        {
            var store = new MemoryStore { FailWrites = true };
            var storage = new FirstContactStorage(store);
            var progress = FirstContactProgress.Restore(storage.Load());
            progress.SkipReveal(); progress.TryOpenPod(true);
            Assert.That(storage.Save(progress.CreateCheckpoint()), Is.False);
            Assert.That(progress.PodRewardCount, Is.EqualTo(1));
            Assert.That(storage.Notice, Does.Contain("session"));
        }

        [Test]
        public void CheckpointPositionRoundTripsWithTheReward()
        {
            var original = new FirstContactCheckpoint { podOpened = true, podRewardCount = 1, hasPosition = true, playerX = 2.3f, playerY = 0.2f, playerZ = -1.1f };
            var loaded = JsonUtility.FromJson<FirstContactCheckpoint>(JsonUtility.ToJson(original));
            Assert.That(FirstContactProgress.IsValidCheckpoint(loaded), Is.True);
            Assert.That(loaded.playerX, Is.EqualTo(original.playerX));
            Assert.That(loaded.podRewardCount, Is.EqualTo(1));
        }
    }
}
