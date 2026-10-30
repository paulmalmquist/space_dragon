/** A compressed reference-inspired route with invented connectors; distances are estimates. */
export interface RouteSample { x: number; z: number; yaw: number; s: number; sectionIndex: number; }
export interface RouteSection {
  id: string; label: string; invented: boolean; startS: number; endS: number;
  lanes: number; laneWidth: number; medianWidth: number; curbWidth: number; sidewalkWidth: number;
  landscapingDensity: number; poleSpacing: number; character: 'neighborhood' | 'palms' | 'canopy' | 'shops' | 'walls';
}
export interface RouteCheckpoint extends RouteSample { id: string; label: string; }
export interface RouteTurn { s: number; direction: 'left' | 'right'; fromSection: number; toSection: number; }
export interface NearestRoutePoint extends RouteSample { distance: number; signedOffset: number; }
type Point = { x: number; z: number };
const samples: RouteSample[] = [];
const sections: RouteSection[] = [];
const turns: RouteTurn[] = [];
let position: Point = { x: 0, z: 0 };
let distance = 0;

function add(point: Point, sectionIndex: number) {
  const previous = samples.at(-1);
  const gap = previous ? Math.hypot(point.x - previous.x, point.z - previous.z) : 0;
  if (previous && gap < 0.001) return;
  if (previous) {
    distance += gap;
    previous.yaw = Math.atan2(point.x - previous.x, point.z - previous.z);
  }
  samples.push({ ...point, yaw: previous?.yaw ?? -Math.PI / 2, s: distance, sectionIndex });
  position = point;
}
function line(to: Point, sectionIndex: number) {
  const from = position;
  const steps = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 8);
  for (let i = 1; i <= steps; i++) add({ x: from.x + (to.x - from.x) * i / steps, z: from.z + (to.z - from.z) * i / steps }, sectionIndex);
}
function bend(corner: Point, to: Point, sectionIndex: number) {
  const from = position;
  for (let i = 1; i <= 16; i++) {
    const t = i / 16;
    add({ x: (1 - t) ** 2 * from.x + 2 * (1 - t) * t * corner.x + t * t * to.x,
      z: (1 - t) ** 2 * from.z + 2 * (1 - t) * t * corner.z + t * t * to.z }, sectionIndex);
  }
}
function section(id: string, label: string, character: RouteSection['character'], lanes: number, medianWidth: number, invented = false) {
  sections.push({ id, label, character, invented, lanes, medianWidth, laneWidth: invented ? 3.4 : 3.5,
    curbWidth: 0.3, sidewalkWidth: 2, landscapingDensity: character === 'canopy' ? 0.85 : 0.55,
    poleSpacing: character === 'shops' ? 48 : 65, startS: distance, endS: distance });
}
function finishSection() { sections.at(-1)!.endS = distance; }

add(position, 0);
section('connector', 'Invented neighborhood connector', 'neighborhood', 1, 0, true);
line({ x: -120, z: 0 }, 0); finishSection();
section('leg-1', 'Palm avenue', 'palms', 3, 5);
line({ x: -720, z: 0 }, 1);
const rightStart = distance;
bend({ x: -760, z: 0 }, { x: -760, z: 40 }, 1);
turns.push({ s: (rightStart + distance) / 2, direction: 'right', fromSection: 1, toSection: 2 }); finishSection();
section('leg-2', 'Canopy boulevard', 'canopy', 3, 6);
line({ x: -760, z: 640 }, 2);
const leftOneStart = distance;
bend({ x: -760, z: 680 }, { x: -800, z: 680 }, 2);
turns.push({ s: (leftOneStart + distance) / 2, direction: 'left', fromSection: 2, toSection: 3 }); finishSection();
section('leg-3', 'Market stretch', 'shops', 3, 5);
line({ x: -1400, z: 680 }, 3);
const leftTwoStart = distance;
bend({ x: -1440, z: 680 }, { x: -1440, z: 640 }, 3);
turns.push({ s: (leftTwoStart + distance) / 2, direction: 'left', fromSection: 3, toSection: 4 }); finishSection();
section('leg-4', 'Garden road', 'walls', 2, 4);
line({ x: -1440, z: -100 }, 4);
const returnStart = distance;
bend({ x: -1440, z: -140 }, { x: -1400, z: -140 }, 4);
turns.push({ s: (returnStart + distance) / 2, direction: 'left', fromSection: 4, toSection: 5 }); finishSection();
section('return', 'Invented return connector', 'neighborhood', 1, 0, true);
line({ x: 80, z: -140 }, 5);
const returnNorthStart = distance;
bend({ x: 120, z: -140 }, { x: 120, z: -100 }, 5);
turns.push({ s: (returnNorthStart + distance) / 2, direction: 'left', fromSection: 5, toSection: 5 });
line({ x: 120, z: -40 }, 5);
const returnHomeStart = distance;
bend({ x: 120, z: 0 }, { x: 80, z: 0 }, 5);
turns.push({ s: (returnHomeStart + distance) / 2, direction: 'left', fromSection: 5, toSection: 5 });
line({ x: 0, z: 0 }, 5); finishSection();
samples.at(-1)!.yaw = samples[0].yaw;

export function pointAtDistance(s: number): RouteSample {
  const wrapped = ((s % distance) + distance) % distance;
  // At ~650 samples this binary search also keeps compare capture inexpensive.
  let lo = 0; let hi = samples.length - 1;
  while (lo + 1 < hi) { const mid = (lo + hi) >> 1; if (samples[mid].s <= wrapped) lo = mid; else hi = mid; }
  const a = samples[lo]; const b = samples[hi];
  const t = (wrapped - a.s) / (b.s - a.s || 1);
  const sectionIndex = sections.findIndex(section => wrapped >= section.startS && wrapped < section.endS);
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t,
    yaw: Math.atan2(b.x - a.x, b.z - a.z), s: wrapped, sectionIndex: Math.max(0, sectionIndex) };
}
export function routeDirectionAt(s: number): number { return pointAtDistance(s).yaw; }
export function laneOffset(section: RouteSection): number { return section.medianWidth / 2 + section.laneWidth / 2; }
export function lanePoseAt(s: number): RouteSample {
  const point = pointAtDistance(s); const offset = laneOffset(sections[point.sectionIndex]);
  return { ...point, x: point.x + Math.cos(point.yaw) * offset, z: point.z - Math.sin(point.yaw) * offset };
}
const checkpoints: RouteCheckpoint[] = [
  { ...lanePoseAt(0), id: 'home', label: 'Home driveway' },
  ...sections.slice(1, 5).map(section => ({ ...lanePoseAt(section.startS + 1), id: section.id, label: section.label })),
];
export const ROUTE = Object.freeze({
  id: 'town-drive-v1', length: distance, samples, sections, checkpoints, turns,
  spawn: { x: checkpoints[0].x, z: checkpoints[0].z, yaw: checkpoints[0].yaw },
  // This is a design estimate, not a measured geographic scale. Stops are compressed away.
  estimatedDistanceScale: 0.55, expectedCruiseSeconds: distance / 20,
});

export function nearestRoutePoint(x: number, z: number): NearestRoutePoint {
  let best: NearestRoutePoint = { ...samples[0], distance: Infinity, signedOffset: 0 };
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i]; const b = samples[i + 1]; const dx = b.x - a.x; const dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    const px = a.x + dx * t; const pz = a.z + dz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d >= best.distance) continue;
    const yaw = Math.atan2(dx, dz); const s = a.s + (b.s - a.s) * t;
    const sectionIndex = sections.findIndex(section => s >= section.startS && s < section.endS);
    best = { x: px, z: pz, yaw, s, sectionIndex: Math.max(0, sectionIndex), distance: d,
      signedOffset: (x - px) * Math.cos(yaw) - (z - pz) * Math.sin(yaw) };
  }
  return best;
}

export function validateRoute(): string[] {
  const problems: string[] = [];
  if (Math.hypot(samples[0].x - samples.at(-1)!.x, samples[0].z - samples.at(-1)!.z) > 0.01) problems.push('Route is not a loop');
  if (turns.slice(0, 3).map(turn => turn.direction).join(',') !== 'right,left,left') problems.push('Recorded turn order changed');
  for (const turn of turns) {
    const incoming = pointAtDistance(turn.s - 28).yaw; const outgoing = pointAtDistance(turn.s + 28).yaw;
    const delta = Math.atan2(Math.sin(outgoing - incoming), Math.cos(outgoing - incoming));
    if ((turn.direction === 'right' && delta < 0.5) || (turn.direction === 'left' && delta > -0.5)) problems.push('Turn geometry contradicts its direction');
  }
  for (let i = 1; i < sections.length; i++) if (Math.abs(sections[i].startS - sections[i - 1].endS) > 0.001) problems.push('Section gap');
  for (let i = 1; i < samples.length; i++) if (samples[i].s <= samples[i - 1].s || samples[i].s - samples[i - 1].s > 8.1) problems.push('Sample gap');
  for (const checkpoint of checkpoints) if (!Number.isFinite(checkpoint.x + checkpoint.z + checkpoint.yaw) || checkpoint.s < 0 || checkpoint.s >= distance) problems.push('Invalid checkpoint');
  return problems;
}
