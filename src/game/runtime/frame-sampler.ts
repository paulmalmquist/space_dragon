export interface FrameSampleOptions {
  windowSize?: number;
  warmupFrames?: number;
}

/** Observed frame intervals include real stalls; only explicit pauses/warmup are omitted. */
export function createFrameSampler({ windowSize = 300, warmupFrames = 60 }: FrameSampleOptions = {}) {
  const capacity = Math.max(1, Math.floor(Number.isFinite(windowSize) ? windowSize : 300));
  const initialWarmup = Math.max(0, Math.floor(Number.isFinite(warmupFrames) ? warmupFrames : 60));
  const samples: number[] = [];
  let previousTime: number | undefined;
  let warmupRemaining = initialWarmup;
  let paused = false;
  return {
    recordFrame(nowMs: number) {
      if (paused || !Number.isFinite(nowMs)) return;
      const previous = previousTime;
      if (previous !== undefined && nowMs <= previous) return;
      previousTime = nowMs;
      if (previous === undefined) return;
      if (warmupRemaining > 0) { warmupRemaining--; return; }
      samples.push(nowMs - previous);
      if (samples.length > capacity) samples.shift();
    },
    reset() {
      samples.length = 0;
      previousTime = undefined;
      warmupRemaining = initialWarmup;
    },
    setPaused(value: boolean) {
      if (value === paused) return;
      paused = value;
      previousTime = undefined;
      // Exclude a small resumption window, while retaining the preceding measured window.
      if (!value) warmupRemaining = Math.min(5, initialWarmup);
    },
    snapshot(targetFrameMs = 1000 / 30) {
      const sorted = [...samples].sort((a, b) => a - b);
      const count = sorted.length;
      const elapsedMs = sorted.reduce((sum, value) => sum + value, 0);
      const meanFrameMs = count ? elapsedMs / count : 0;
      return {
        sampleCount: count,
        windowSize: capacity,
        warmupRemaining,
        paused,
        elapsedMs,
        meanFrameMs,
        medianFrameMs: count ? (sorted[Math.floor((count - 1) / 2)] + sorted[Math.floor(count / 2)]) / 2 : 0,
        p95FrameMs: count ? sorted[Math.ceil(count * 0.95) - 1] : 0,
        maxFrameMs: count ? sorted[count - 1] : 0,
        estimatedFps: meanFrameMs ? 1000 / meanFrameMs : 0,
        // Keep the explicit 50 ms threshold in every capture, not just the UI label.
        spikeThresholdMs: 50,
        spikeCount: samples.filter(value => value > 50).length,
        targetFrameMs,
        overBudgetCount: samples.filter(value => value > targetFrameMs).length,
      };
    },
  };
}
