using System;

namespace SpaceDragon.FirstContact
{
    public enum ContactPhase { Reveal, Play }
    public enum PodInteractionResult { Opened, AlreadyOpened, OutOfReach, Unavailable }

    [Serializable]
    public sealed class FirstContactCheckpoint
    {
        public int schemaVersion = 1;
        public bool podOpened;
        public int podRewardCount;
        public bool hasPosition;
        public float playerX;
        public float playerY;
        public float playerZ;
    }

    /// <summary>Authoritative candidate state. Presentation, input, storage and engine objects are absent.</summary>
    public sealed class FirstContactProgress
    {
        public const float RevealDurationSeconds = 3f;
        public ContactPhase Phase { get; private set; } = ContactPhase.Reveal;
        public bool Paused { get; private set; }
        public bool PodOpened { get; private set; }
        public int PodRewardCount => PodOpened ? 1 : 0;
        public float RevealSeconds { get; private set; }
        public float RevealFraction => Math.Min(1f, RevealSeconds / RevealDurationSeconds);

        public static bool IsValidCheckpoint(FirstContactCheckpoint checkpoint)
        {
            if (checkpoint == null || checkpoint.schemaVersion != 1) return false;
            if (checkpoint.podRewardCount != (checkpoint.podOpened ? 1 : 0)) return false;
            return !checkpoint.hasPosition ||
                (Finite(checkpoint.playerX) && Finite(checkpoint.playerY) && Finite(checkpoint.playerZ) &&
                 Math.Abs(checkpoint.playerX) <= 30 && Math.Abs(checkpoint.playerZ) <= 30 &&
                 checkpoint.playerY >= -2 && checkpoint.playerY <= 12);
        }

        private static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);

        public static FirstContactProgress Restore(FirstContactCheckpoint checkpoint)
        {
            if (!IsValidCheckpoint(checkpoint)) throw new ArgumentException("Invalid candidate checkpoint.", nameof(checkpoint));
            return new FirstContactProgress { PodOpened = checkpoint.podOpened };
        }

        public FirstContactCheckpoint CreateCheckpoint() => new FirstContactCheckpoint
        {
            podOpened = PodOpened,
            podRewardCount = PodRewardCount
        };

        public void SetPaused(bool paused) => Paused = paused;

        public void AdvanceReveal(float seconds)
        {
            if (Paused || Phase != ContactPhase.Reveal || !Finite(seconds) || seconds <= 0) return;
            RevealSeconds = Math.Min(RevealDurationSeconds, RevealSeconds + seconds);
            if (RevealSeconds >= RevealDurationSeconds) Phase = ContactPhase.Play;
        }

        public void SkipReveal()
        {
            if (Paused) return;
            RevealSeconds = RevealDurationSeconds;
            Phase = ContactPhase.Play;
        }

        public void ReplayReveal()
        {
            RevealSeconds = 0;
            Phase = ContactPhase.Reveal;
        }

        public PodInteractionResult TryOpenPod(bool inReach)
        {
            if (Paused || Phase != ContactPhase.Play) return PodInteractionResult.Unavailable;
            if (!inReach) return PodInteractionResult.OutOfReach;
            if (PodOpened) return PodInteractionResult.AlreadyOpened;
            PodOpened = true;
            return PodInteractionResult.Opened;
        }
    }
}
