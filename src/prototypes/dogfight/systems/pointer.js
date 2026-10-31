// A visible cursor acts as a virtual flight stick; no pointer lock is needed.
// A calm center and early edge saturation leave room for ordinary hand movement.
const DEAD_ZONE = .10;
const FULL_DEFLECTION = .90;
function axis(value) {
  const magnitude = Math.max(0, Math.min(1, (Math.abs(value) - DEAD_ZONE) / (FULL_DEFLECTION - DEAD_ZONE)));
  return magnitude === 0 ? 0 : Math.sign(value) * magnitude;
}
export function pointerStick(clientX, clientY, width, height) {
  if (![clientX, clientY, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return { x: 0, y: 0 };
  return { x: axis(clientX / width * 2 - 1), y: axis(1 - clientY / height * 2) };
}
