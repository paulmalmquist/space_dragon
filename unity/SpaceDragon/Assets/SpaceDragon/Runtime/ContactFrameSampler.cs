using System;

namespace SpaceDragon.FirstContact
{
    [Serializable]
    public sealed class ContactFrameStatistics
    {
        public string measurement = "Unity Update wall-clock frame intervals; not GPU time";
        public int sampleCount;
        public int windowSize;
        public int warmupRemaining;
        public bool paused;
        public double elapsedMs;
        public double meanFrameMs;
        public double medianFrameMs;
        public double p95FrameMs;
        public double maxFrameMs;
        public double estimatedFps;
        public int spikesAbove50Ms;
    }

    public sealed class ContactFrameSampler
    {
        private readonly double[] values;
        private readonly int initialWarmup;
        private int count;
        private int next;
        private int warmup;
        private double previous = double.NaN;
        private bool paused;

        public ContactFrameSampler(int capacity = 300, int warmupFrames = 60)
        {
            values = new double[Math.Max(1, capacity)];
            initialWarmup = Math.Max(0, warmupFrames);
            warmup = initialWarmup;
        }

        public void Record(double timestampSeconds)
        {
            if (paused || double.IsNaN(timestampSeconds) || double.IsInfinity(timestampSeconds)) return;
            if (!double.IsNaN(previous) && timestampSeconds <= previous) return;
            double prior = previous;
            previous = timestampSeconds;
            if (double.IsNaN(prior)) return;
            if (warmup > 0) { warmup--; return; }
            values[next] = (timestampSeconds - prior) * 1000;
            next = (next + 1) % values.Length;
            count = Math.Min(count + 1, values.Length);
        }

        public void Reset()
        {
            count = next = 0;
            previous = double.NaN;
            warmup = initialWarmup;
        }

        public void SetPaused(bool value)
        {
            if (paused == value) return;
            paused = value;
            previous = double.NaN;
            if (!value) warmup = Math.Min(5, initialWarmup);
        }

        public ContactFrameStatistics Snapshot()
        {
            var sorted = new double[count];
            Array.Copy(values, sorted, count);
            Array.Sort(sorted);
            var result = new ContactFrameStatistics { sampleCount = count, windowSize = values.Length, warmupRemaining = warmup, paused = paused };
            if (count == 0) return result;
            foreach (double value in sorted)
            {
                result.elapsedMs += value;
                if (value > 50) result.spikesAbove50Ms++;
            }
            result.meanFrameMs = result.elapsedMs / count;
            result.medianFrameMs = (sorted[(count - 1) / 2] + sorted[count / 2]) / 2;
            result.p95FrameMs = sorted[(int)Math.Ceiling(count * 0.95) - 1];
            result.maxFrameMs = sorted[count - 1];
            result.estimatedFps = 1000 / result.meanFrameMs;
            return result;
        }
    }
}
