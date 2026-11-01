import type { Engine } from '@babylonjs/core/Engines/engine';
import type { Scene } from '@babylonjs/core/scene';
import { SceneInstrumentation } from '@babylonjs/core/Instrumentation/sceneInstrumentation';
import { createFrameSampler } from './frame-sampler.ts';
import type { FrameSampleOptions } from './frame-sampler.ts';

/** Wall-clock rendered-frame cadence, not GPU time or a hardware certification. */
export function createRenderPerformanceMonitor(scene: Scene, engine: Engine, canvas: HTMLCanvasElement, options: FrameSampleOptions = {}) {
  const sampler = createFrameSampler(options);
  const instrumentation = new SceneInstrumentation(scene);
  let drawCalls = 0;
  let activeMeshes = 0;
  let activeIndices = 0;
  const observer = scene.onAfterRenderObservable.add(() => {
    sampler.recordFrame(performance.now());
    drawCalls = instrumentation.drawCallsCounter.current;
    activeMeshes = scene.getActiveMeshes().length;
    activeIndices = scene.getActiveIndices();
  });
  return {
    reset: () => sampler.reset(),
    setPaused: (value: boolean) => sampler.setPaused(value),
    snapshot: (targetFrameMs = 1000 / 30) => ({
      ...sampler.snapshot(targetFrameMs),
      measurement: 'rendered-frame wall-clock intervals' as const,
      drawCalls,
      activeMeshes,
      activeIndices,
      renderWidth: engine.getRenderWidth(true),
      renderHeight: engine.getRenderHeight(true),
      cssWidth: canvas.clientWidth,
      cssHeight: canvas.clientHeight,
      devicePixelRatio: window.devicePixelRatio,
      effectivePixelRatio: 1 / engine.getHardwareScalingLevel(),
      hardwareScalingLevel: engine.getHardwareScalingLevel(),
    }),
    dispose() {
      scene.onAfterRenderObservable.remove(observer);
      instrumentation.dispose();
    },
  };
}
