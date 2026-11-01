/** Manual rendering budgets; these are settings, not measured hardware claims. */
export type VisualQuality = 'low' | 'balanced' | 'high' | 'cinematic';

export interface VisualQualityProfile {
  readonly label: string;
  readonly maxPixelRatio: number;
  readonly maxRenderPixels: number;
  readonly shadowMapSize: number;
  readonly bloom: boolean;
  readonly samples: number;
  readonly targetFrameMs: number;
}

export const VISUAL_QUALITY_PRESETS: Readonly<Record<VisualQuality, Readonly<VisualQualityProfile>>> = Object.freeze({
  low: Object.freeze({ label: 'Low', maxPixelRatio: 0.75, maxRenderPixels: 1280 * 720, shadowMapSize: 256, bloom: false, samples: 1, targetFrameMs: 1000 / 30 }),
  balanced: Object.freeze({ label: 'Balanced', maxPixelRatio: 1, maxRenderPixels: 1600 * 900, shadowMapSize: 512, bloom: false, samples: 1, targetFrameMs: 1000 / 30 }),
  high: Object.freeze({ label: 'High', maxPixelRatio: 1.5, maxRenderPixels: 1920 * 1080, shadowMapSize: 1024, bloom: true, samples: 1, targetFrameMs: 1000 / 60 }),
  cinematic: Object.freeze({ label: 'Cinematic', maxPixelRatio: 2, maxRenderPixels: 2560 * 1440, shadowMapSize: 2048, bloom: true, samples: 2, targetFrameMs: 1000 / 30 }),
});

export function isVisualQuality(value: unknown): value is VisualQuality {
  return typeof value === 'string' && Object.hasOwn(VISUAL_QUALITY_PRESETS, value);
}

/** Babylon scaling is reciprocal CSS-pixel density, independent of the device DPR. */
export function resolveRenderScale(quality: VisualQuality, cssWidth: number, cssHeight: number, devicePixelRatio: number) {
  const profile = VISUAL_QUALITY_PRESETS[quality];
  const width = Number.isFinite(cssWidth) && cssWidth > 0 ? cssWidth : 1;
  const height = Number.isFinite(cssHeight) && cssHeight > 0 ? cssHeight : 1;
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const pixelRatio = Math.min(dpr, profile.maxPixelRatio, Math.sqrt(profile.maxRenderPixels / (width * height)));
  return {
    pixelRatio,
    hardwareScalingLevel: 1 / pixelRatio,
    width: Math.max(1, Math.floor(width * pixelRatio)),
    height: Math.max(1, Math.floor(height * pixelRatio)),
  };
}
