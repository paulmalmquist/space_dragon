// Use supported HDR sample counts within the measured budget. A GPU that only
// offers a larger count falls back to zero instead of silently doubling cost.
export function chooseSceneSamples(supported, requested = 2, maximum = Infinity) {
  if (!Number.isFinite(requested) || requested < 2) return 0;
  return Math.max(0, ...Array.from(supported || []).filter(value =>
    Number.isInteger(value) && value >= 2 && value <= requested && value <= maximum));
}

export function sceneSamplesForRenderer(renderer, requested) {
  const context = renderer.getContext();
  try {
    return chooseSceneSamples(context.getInternalformatParameter(context.RENDERBUFFER, context.RGBA16F, context.SAMPLES),
      requested, renderer.capabilities.maxSamples);
  } catch { return 0; }
}
