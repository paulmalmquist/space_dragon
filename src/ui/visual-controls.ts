import type { createFirstContact } from '../game/scene';

type View = ReturnType<typeof createFirstContact>;
type Quality = Parameters<View['setVisualQuality']>[0];
const qualityKey = 'space-dragon.visual-quality.v1';
const qualities: Quality[] = ['low', 'balanced', 'high', 'cinematic'];

/** Graphics preferences have their own storage key, outside every gameplay save. */
export function connectVisualControls(view?: View) {
  const select = document.querySelector<HTMLSelectElement>('#visual-quality')!;
  let quality: Quality = 'balanced';
  try {
    const saved = localStorage.getItem(qualityKey);
    if (qualities.includes(saved as Quality)) quality = saved as Quality;
  } catch { /* Graphics remain usable when storage is unavailable. */ }
  select.value = quality;
  select.disabled = !view;
  view?.setVisualQuality(quality);
  const changeQuality = () => {
    const next = select.value as Quality;
    if (!qualities.includes(next)) return;
    view?.setVisualQuality(next);
    try { localStorage.setItem(qualityKey, next); } catch { /* Session-only setting. */ }
  };
  select.addEventListener('change', changeQuality);
  let cleanupReview = () => {};
  if (import.meta.env.DEV && view) {
    const panel = document.createElement('details');
    panel.id = 'visual-review';
    panel.className = 'visual-review';
    panel.innerHTML = `<summary>Visual review</summary><div class="visual-review-controls">
      <label>Camera <select id="visual-shot" aria-label="Review camera"><option value="">Player camera</option><option value="home">Home</option><option value="arrival">Arrival</option><option value="reveal">Pod detail</option></select></label>
      <label><input type="checkbox" id="performance-visible"> Performance overlay</label>
      <button class="quiet" id="performance-reset">New sample</button><button class="quiet" id="performance-download">Save measurements</button>
      </div><p>Fixed views only frame the current scene. Walk mode keeps its follow camera. Measurements describe this browser session.</p>`;
    document.querySelector('.below-scene')!.after(panel);
    const overlay = document.createElement('pre');
    overlay.id = 'performance-overlay';
    overlay.className = 'performance-overlay';
    overlay.hidden = true;
    document.querySelector('#play-area')!.append(overlay);
    const shot = panel.querySelector<HTMLSelectElement>('#visual-shot')!;
    const visible = panel.querySelector<HTMLInputElement>('#performance-visible')!;
    shot.addEventListener('change', () => view.setVisualShot((shot.value || null) as Parameters<View['setVisualShot']>[0]));
    visible.addEventListener('change', () => { overlay.hidden = !visible.checked; });
    panel.querySelector('#performance-reset')!.addEventListener('click', () => view.resetPerformanceSample());
    panel.querySelector('#performance-download')!.addEventListener('click', () => {
      const snapshot = view.snapshot();
      const record = { capturedAt: new Date().toISOString(), browser: navigator.userAgent,
        scope: 'Local browser measurements; not a sustained-performance or human visual approval.',
        visual: snapshot.visual, performance: snapshot.performance, pod: snapshot.pod };
      const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'space-dragon-visual-measurements.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    const timer = setInterval(() => {
      const snapshot = view.snapshot();
      shot.disabled = snapshot.navigation.enabled;
      shot.value = snapshot.visual.shot ?? '';
      if (!visible.checked) return;
      const perf = snapshot.performance;
      const ms = (value: number) => `${value.toFixed(1)} ms`;
      overlay.textContent = [
        `${snapshot.visual.quality.toUpperCase()} · ${perf.paused ? 'PAUSED' : perf.warmupRemaining ? 'WARMING UP' : `${perf.estimatedFps.toFixed(1)} fps`}`,
        `Median ${ms(perf.medianFrameMs)} · p95 ${ms(perf.p95FrameMs)}`,
        `Max ${ms(perf.maxFrameMs)} · spikes >50 ms: ${perf.spikeCount}`,
        `${perf.drawCalls} draws · ${perf.activeMeshes} active meshes`,
        `${perf.renderWidth} × ${perf.renderHeight} · ${perf.effectivePixelRatio.toFixed(2)}× CSS`,
        `${perf.sampleCount} rolling frames · target ${ms(perf.targetFrameMs)}`,
      ].join('\n');
    }, 500);
    cleanupReview = () => { clearInterval(timer); panel.remove(); overlay.remove(); };
  }
  return () => { select.removeEventListener('change', changeQuality); cleanupReview(); };
}
