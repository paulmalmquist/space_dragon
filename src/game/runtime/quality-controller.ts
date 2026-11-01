import type { Engine } from '@babylonjs/core/Engines/engine';
import { isVisualQuality, resolveRenderScale, VISUAL_QUALITY_PRESETS } from './quality.ts';
import type { VisualQuality } from './quality.ts';

/** Rendering-only controller: no campaign, exploration, learner or storage writes. */
export function createRenderQualityController(engine: Engine, canvas: HTMLCanvasElement, initial: VisualQuality = 'balanced') {
  let quality = isVisualQuality(initial) ? initial : 'balanced';
  // This controller owns density, including browser zoom/device changes on resize.
  engine.adaptToDeviceRatio = false;
  const resize = () => {
    const scale = resolveRenderScale(quality, canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio);
    engine.setHardwareScalingLevel(scale.hardwareScalingLevel);
  };
  resize();
  return {
    get quality() { return quality; },
    get profile() { return VISUAL_QUALITY_PRESETS[quality]; },
    resize,
    setQuality(value: VisualQuality) {
      if (isVisualQuality(value)) quality = value;
      resize();
      return VISUAL_QUALITY_PRESETS[quality];
    },
    snapshot: () => ({
      quality,
      mode: 'manual' as const,
      targetFrameMs: VISUAL_QUALITY_PRESETS[quality].targetFrameMs,
      maxPixelRatio: VISUAL_QUALITY_PRESETS[quality].maxPixelRatio,
      maxRenderPixels: VISUAL_QUALITY_PRESETS[quality].maxRenderPixels,
      pixelRatio: 1 / engine.getHardwareScalingLevel(),
      hardwareScalingLevel: engine.getHardwareScalingLevel(),
      width: engine.getRenderWidth(true),
      height: engine.getRenderHeight(true),
    }),
  };
}
