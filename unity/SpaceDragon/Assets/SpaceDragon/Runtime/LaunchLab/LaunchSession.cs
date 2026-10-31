using System;

namespace SpaceDragon.LaunchLab
{
    public enum LaunchMode { InEngine, BlenderURL, AIURL }
    public enum LaunchPhase { Idle, Preparing, Timeline, PreparingVideo, PlayingVideo, Handoff, Flight, Failed, Exited }

    /// <summary>Transient rehearsal state. No renderer, storage, campaign state or rewards.</summary>
    public sealed class LaunchSession
    {
        public const double Duration = 12;
        public const double VideoStart = 3;
        public const double VideoEnd = 10;
        public const double PrepareTimeout = 20;
        public const double VideoWaitTimeout = 6;
        public int Generation { get; private set; }
        public LaunchPhase Phase { get; private set; } = LaunchPhase.Idle;
        public LaunchMode Mode { get; private set; }
        public bool Paused { get; private set; }
        public double SequenceTime { get; private set; }
        public bool DestinationReady { get; private set; }
        public bool VideoPrepared { get; private set; }
        public bool VideoFirstFrame { get; private set; }
        public bool VideoFallback { get; private set; }
        public double MediaTime { get; private set; }
        public string Notice { get; private set; } = "Choose a launch rehearsal.";
        public int HandoffCount { get; private set; }
        public bool ControlsReady => Phase == LaunchPhase.Flight && !Paused && !inputBlocked;
        public bool WantsVideoPlayback => Phase == LaunchPhase.PreparingVideo && VideoPrepared && !Paused;
        private bool inputBlocked = true;
        private double waitingSeconds;
        private double sinceVideoProgress;
        private bool videoEndedWhilePaused;

        public int Begin(LaunchMode mode)
        {
            Generation++;
            Mode = mode;
            Phase = LaunchPhase.Preparing;
            Paused = false;
            SequenceTime = 0;
            DestinationReady = VideoPrepared = VideoFirstFrame = VideoFallback = false;
            MediaTime = waitingSeconds = sinceVideoProgress = 0;
            HandoffCount = 0;
            inputBlocked = true;
            videoEndedWhilePaused = false;
            Notice = "Preparing the dragon and destination.";
            return Generation;
        }

        private bool Current(int generation) => generation == Generation && Phase != LaunchPhase.Exited && Phase != LaunchPhase.Idle;
        private bool VideoRelevant => Mode != LaunchMode.InEngine && !VideoFallback && SequenceTime < VideoEnd &&
            Phase != LaunchPhase.Handoff && Phase != LaunchPhase.Flight && Phase != LaunchPhase.Failed;

        public void MarkLaunchReady(int generation)
        {
            if (!Current(generation) || Phase != LaunchPhase.Preparing) return;
            Phase = LaunchPhase.Timeline;
            waitingSeconds = 0;
            if (!VideoFallback) Notice = "Launch rehearsal.";
        }

        public void MarkDestinationReady(int generation)
        {
            if (Current(generation)) DestinationReady = true;
        }

        public void MarkVideoPrepared(int generation)
        {
            if (Current(generation) && VideoRelevant) VideoPrepared = true;
        }

        public void ObserveVideoFrame(int generation, double mediaTime)
        {
            if (!Current(generation) || !VideoRelevant || Paused ||
                (Phase != LaunchPhase.PreparingVideo && Phase != LaunchPhase.PlayingVideo)) return;
            VideoFirstFrame = true;
            Phase = LaunchPhase.PlayingVideo;
            waitingSeconds = 0;
            ObserveVideoTime(generation, mediaTime);
        }

        public void ObserveVideoTime(int generation, double mediaTime)
        {
            if (!Current(generation) || Phase != LaunchPhase.PlayingVideo || Paused || !Finite(mediaTime) || mediaTime < 0) return;
            if (mediaTime > MediaTime + 0.005) sinceVideoProgress = 0;
            MediaTime = Math.Max(MediaTime, mediaTime);
            // Complete before moving the sequence clock past VideoRelevant's active range.
            // Browser media polling can observe the end before loopPointReached arrives.
            if (MediaTime >= VideoEnd - VideoStart) { CompleteVideo(generation); return; }
            // Media timing is observational. The last frame is not used as a world pose.
            SequenceTime = VideoStart + MediaTime;
        }

        public void CompleteVideo(int generation)
        {
            if (!Current(generation) || !VideoRelevant || Phase != LaunchPhase.PlayingVideo) return;
            if (Paused) { videoEndedWhilePaused = true; return; }
            SequenceTime = VideoEnd;
            Phase = LaunchPhase.Timeline;
            waitingSeconds = 0;
            Notice = "Returning to the live dragon.";
        }

        public void FailVideo(int generation, string reason)
        {
            if (!Current(generation) || !VideoRelevant) return;
            VideoFallback = true;
            Notice = "Video unavailable; continuing the original launch. " + reason;
            if (Phase == LaunchPhase.PreparingVideo || Phase == LaunchPhase.PlayingVideo) Phase = LaunchPhase.Timeline;
            waitingSeconds = sinceVideoProgress = 0;
        }

        public void Tick(double seconds)
        {
            if (Paused || !Finite(seconds) || seconds <= 0) return;
            if (videoEndedWhilePaused)
            {
                videoEndedWhilePaused = false;
                CompleteVideo(Generation);
            }
            // The caller excludes focus suspension; cap catch-up after a delayed render.
            seconds = Math.Min(seconds, 0.1);
            switch (Phase)
            {
                case LaunchPhase.Preparing:
                case LaunchPhase.Handoff:
                    waitingSeconds += seconds;
                    if (waitingSeconds >= PrepareTimeout && (Phase != LaunchPhase.Handoff || !DestinationReady))
                        Fail(Generation, "The live scene did not become ready. Retry or return to the menu.");
                    break;
                case LaunchPhase.PreparingVideo:
                    waitingSeconds += seconds;
                    if (waitingSeconds >= VideoWaitTimeout) FailVideo(Generation, "No playable first frame arrived.");
                    break;
                case LaunchPhase.PlayingVideo:
                    sinceVideoProgress += seconds;
                    if (sinceVideoProgress >= VideoWaitTimeout) FailVideo(Generation, "Playback stopped advancing.");
                    break;
                case LaunchPhase.Timeline:
                    SequenceTime = Math.Min(Duration, SequenceTime + seconds);
                    if (Mode != LaunchMode.InEngine && !VideoFallback && !VideoFirstFrame && SequenceTime >= VideoStart)
                    {
                        SequenceTime = VideoStart;
                        Phase = LaunchPhase.PreparingVideo;
                        waitingSeconds = 0;
                    }
                    else if (SequenceTime >= Duration) EnterHandoff();
                    break;
            }
        }

        public void RequestSkip()
        {
            if (Phase == LaunchPhase.Idle || Phase == LaunchPhase.Flight || Phase == LaunchPhase.Failed || Phase == LaunchPhase.Exited) return;
            SequenceTime = Duration;
            EnterHandoff();
        }

        private void EnterHandoff()
        {
            if (Phase != LaunchPhase.Handoff) waitingSeconds = 0;
            Phase = LaunchPhase.Handoff;
            Notice = DestinationReady ? "Returning control." : "Preparing safe flight…";
        }

        public bool TryCompleteHandoff()
        {
            if (Phase != LaunchPhase.Handoff || Paused || !DestinationReady) return false;
            HandoffCount++;
            Phase = LaunchPhase.Flight;
            inputBlocked = true;
            Notice = "Release held controls, then steer.";
            return true;
        }

        public void ObserveNeutralInput(bool neutral)
        {
            if (Phase == LaunchPhase.Flight && !Paused && neutral) inputBlocked = false;
        }

        public void SetPaused(bool paused)
        {
            if (Phase == LaunchPhase.Idle || Phase == LaunchPhase.Exited) return;
            Paused = paused;
            inputBlocked = true;
        }

        public void Fail(int generation, string reason)
        {
            if (!Current(generation)) return;
            Phase = LaunchPhase.Failed;
            inputBlocked = true;
            Notice = reason;
        }

        public void Exit()
        {
            Generation++;
            Phase = LaunchPhase.Exited;
            Paused = false;
            inputBlocked = true;
        }

        private static bool Finite(double value) => !double.IsNaN(value) && !double.IsInfinity(value);
    }
}
