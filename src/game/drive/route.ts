import { NEIGHBORHOOD } from './neighborhood.ts';
/** Mapped home exit, compressed arterial loop and explicitly invented return. */
export interface RouteSample { x: number; z: number; yaw: number; s: number; sectionIndex: number; }
export interface RouteSection {
  id: string; label: string; invented: boolean; startS: number; endS: number;
  lanes: number; laneWidth: number; medianWidth: number; curbWidth: number; sidewalkWidth: number;
  landscapingDensity: number; poleSpacing: number; character: 'neighborhood' | 'palms' | 'canopy' | 'shops' | 'walls';
}
export interface RouteCheckpoint extends RouteSample { id: string; label: string; }
export interface RouteTurn { s: number; direction: 'left' | 'right'; fromSection: number; toSection: number;
  id?: string; approachS?: number; exitS?: number; radius?: number; reference?: 'home' | 'arterial' | 'invented'; }
export interface RouteStreetSpan { label: string; fromS: number; toS: number; invented: boolean }
export interface PedestrianSafeSpan { sectionIndex: number; fromS: number; toS: number }
export interface NearestRoutePoint extends RouteSample { distance: number; signedOffset: number; }
type Point = { x: number; z: number };
const samples: RouteSample[] = [];
const sections: RouteSection[] = [];
const turns: RouteTurn[] = [];
let position: Point = { x: NEIGHBORHOOD.start.x, z: NEIGHBORHOOD.start.z };
let distance = 0;
const streetSpans: RouteStreetSpan[] = [];

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
function cubic(controlA: Point, controlB: Point, to: Point, sectionIndex: number, steps = 24) {
  const from = position;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps; const u = 1 - t;
    add({ x: u ** 3 * from.x + 3 * u * u * t * controlA.x + 3 * u * t * t * controlB.x + t ** 3 * to.x,
      z: u ** 3 * from.z + 3 * u * u * t * controlA.z + 3 * u * t * t * controlB.z + t ** 3 * to.z }, sectionIndex);
  }
}
function toward(from: Point, to: Point, metres: number): Point {
  const scale = metres / Math.hypot(to.x - from.x, to.z - from.z);
  return { x: from.x + (to.x - from.x) * scale, z: from.z + (to.z - from.z) * scale };
}
function turn(corner: Point, to: Point, fromSection: number, toSection: number,
  direction: RouteTurn['direction'], id: string, radius: number, reference: RouteTurn['reference']) {
  const approachS = distance;
  bend(corner, to, fromSection);
  const value: RouteTurn = { id, s: (approachS + distance) / 2, approachS, exitS: distance,
    direction, fromSection, toSection, radius, reference };
  turns.push(value); return value;
}
function section(id: string, label: string, character: RouteSection['character'], lanes: number, medianWidth: number, invented = false) {
  sections.push({ id, label, character, invented, lanes, medianWidth, laneWidth: invented ? 3.4 : 3.5,
    curbWidth: 0.3, sidewalkWidth: 2, landscapingDensity: character === 'canopy' ? 0.85 : 0.55,
    poleSpacing: character === 'shops' ? 48 : 65, startS: distance, endS: distance });
}
function finishSection() { sections.at(-1)!.endS = distance; }

const { starpass, greenIsland, terrace, exitLanes } = NEIGHBORHOOD.centerlines;
const homeCorner = starpass[0]; const terraceCorner = greenIsland[0]; const arterialCorner = exitLanes.at(-1)!;
add(position, 0);
section('connector', 'Starpass Court · Green Island Boulevard · Green Island Terrace', 'neighborhood', 1, 0);
line(toward(homeCorner, position, 12), 0);
const homeRight = turn(homeCorner, toward(homeCorner, greenIsland[5], 12), 0, 0, 'right', 'starpass-green-island', 8.5, 'home');
line(greenIsland[5], 0);
const trafficBridgeToS = distance;
for (let i = 4; i >= 1; i--) line(greenIsland[i], 0);
line(toward(terraceCorner, greenIsland[1], 14), 0);
const terraceLeft = turn(terraceCorner, toward(terraceCorner, terrace[4], 14), 0, 0, 'left', 'green-island-terrace', 10, 'home');
for (let i = 4; i >= 1; i--) line(terrace[i], 0);
cubic({ x: terrace[1].x, z: terrace[1].z - 25 }, { x: exitLanes[2].x, z: exitLanes[2].z + 24 }, exitLanes[2], 0);
const gateS = distance;
line(toward(arterialCorner, exitLanes[2], 18), 0);
const arterialRight = turn(arterialCorner, { x: arterialCorner.x - 18, z: arterialCorner.z }, 0, 1,
  'right', 'terrace-hypoluxo', 12.7, 'home');
finishSection();
streetSpans.push({ label: 'Starpass Court', fromS: 0, toS: homeRight.s, invented: false },
  { label: 'Green Island Boulevard', fromS: homeRight.s, toS: terraceLeft.s, invented: false },
  { label: 'Green Island Terrace', fromS: terraceLeft.s, toS: arterialRight.s, invented: false });

const hypoluxoZ = arterialCorner.z;
section('leg-1', 'Hypoluxo Road', 'palms', 3, 5);
line({ x: position.x - 450, z: hypoluxoZ }, 1);
const jogX = position.x - 40;
turn({ x: jogX, z: hypoluxoZ }, { x: jogX, z: hypoluxoZ + 40 }, 1, 2, 'right', 'hypoluxo-jog', 28, 'arterial'); finishSection();
section('leg-2', 'Jog Road', 'canopy', 3, 6);
line({ x: jogX, z: position.z + 450 }, 2);
const lantanaZ = position.z + 40;
turn({ x: jogX, z: lantanaZ }, { x: jogX - 40, z: lantanaZ }, 2, 3, 'left', 'jog-lantana', 28, 'arterial'); finishSection();
section('leg-3', 'Lantana Road', 'shops', 3, 5);
line({ x: position.x - 450, z: lantanaZ }, 3);
const hagenX = position.x - 40;
turn({ x: hagenX, z: lantanaZ }, { x: hagenX, z: lantanaZ - 40 }, 3, 4, 'left', 'lantana-hagen', 28, 'arterial'); finishSection();
section('leg-4', 'Hagen Ranch Road', 'walls', 2, 4);
line({ x: hagenX, z: hypoluxoZ - 70 }, 4);
const returnZ = hypoluxoZ - 110;
turn({ x: hagenX, z: returnZ }, { x: hagenX + 40, z: returnZ }, 4, 5, 'left', 'invented-return-east', 28, 'invented'); finishSection();
section('return', 'Invented return connector', 'neighborhood', 1, 0, true);
line({ x: 140, z: returnZ }, 5);
turn({ x: 180, z: returnZ }, { x: 180, z: returnZ + 40 }, 5, 5, 'left', 'invented-return-north', 28, 'invented');
line({ x: 180, z: greenIsland[14].z - 50 }, 5);
turn({ x: 180, z: greenIsland[14].z }, greenIsland[14], 5, 5, 'left', 'return-green-island', 35, 'invented');
const returnMappedStartS = distance;
for (let i = 13; i >= 8; i--) line(greenIsland[i], 5);
const trafficBridgeFromS = distance;
line(toward(homeCorner, greenIsland[8], 12), 5);
const returnHome = turn(homeCorner, toward(homeCorner, starpass[1], 12), 5, 5, 'right', 'return-starpass', 8.5, 'home');
line(starpass[1], 5);
const bulbStartS = distance;
cubic(toward(starpass[1], homeCorner, -5), { x: 6, z: -4 }, { x: 6, z: 0 }, 5);
const bulbTurnStartS = distance;
for (let i = 1; i <= 24; i++) {
  const angle = Math.PI * i / 24;
  add({ x: 6 * Math.cos(angle), z: 6 * Math.sin(angle) }, 5);
}
turns.push({ id: 'starpass-turnaround', s: (bulbTurnStartS + distance) / 2, approachS: bulbTurnStartS, exitS: distance,
  direction: 'left', fromSection: 5, toSection: 5, radius: 6, reference: 'home' });
cubic({ x: -6, z: -4 }, toward(starpass[1], homeCorner, -7), toward(starpass[1], homeCorner, -3), 5);
line(starpass[1], 5);
finishSection();
streetSpans.push({ label: 'Hypoluxo Road', fromS: arterialRight.s, toS: sections[1].endS, invented: false },
  ...sections.slice(2, 5).map(part => ({ label: part.label, fromS: part.startS, toS: part.endS, invented: false })),
  { label: 'Invented return connector', fromS: sections[5].startS, toS: returnMappedStartS, invented: true },
  { label: 'Green Island Boulevard', fromS: returnMappedStartS, toS: returnHome.s, invented: false },
  { label: 'Starpass Court', fromS: returnHome.s, toS: distance, invented: false });
samples.at(-1)!.yaw = samples[0].yaw;

export const HOME_EXIT_SIGNAL_S = arterialRight.approachS! + 4;
export const NEIGHBORHOOD_STREET_SPANS: readonly RouteStreetSpan[] = streetSpans;
export const NEIGHBORHOOD_ROUTE = Object.freeze({ gateS, bulbStartS, returnMappedStartS });

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
export function routeLabelAt(s: number): string {
  const wrapped = ((s % distance) + distance) % distance;
  return streetSpans.find(span => wrapped >= span.fromS && wrapped < span.toS)?.label ?? 'Starpass Court';
}
/** A reference driver speed, not an enforced vehicle cap. Slow before local bends. */
export function recommendedSpeedAt(s: number): number {
  const wrapped = ((s % distance) + distance) % distance;
  if (wrapped >= bulbStartS - 7 || wrapped < 8) return 4.5;
  if (wrapped < sections[0].endS + 16 || wrapped > returnMappedStartS - 25) return 8;
  if (turns.some(cue => cue.reference !== 'home' && wrapped >= cue.approachS! - 25 && wrapped <= cue.exitS! + 8)) return 14;
  return 20;
}
export function laneOffset(section: RouteSection): number { return section.medianWidth / 2 + section.laneWidth / 2; }
export function lanePoseAt(s: number): RouteSample {
  const point = pointAtDistance(s); const offset = laneOffset(sections[point.sectionIndex]);
  return { ...point, x: point.x + Math.cos(point.yaw) * offset, z: point.z - Math.sin(point.yaw) * offset };
}
const checkpoints: RouteCheckpoint[] = [
  { ...lanePoseAt(0), id: 'home', label: 'Home driveway' },
  ...sections.slice(1, 5).map(section => ({ ...lanePoseAt(section.startS + 1), id: section.id, label: section.label })),
];
export const SAFE_PEDESTRIAN_SPANS: readonly PedestrianSafeSpan[] = [
  { sectionIndex: 0, fromS: homeRight.exitS! + 18, toS: terraceLeft.approachS! - 18 },
  { sectionIndex: 0, fromS: terraceLeft.exitS! + 24, toS: gateS - 25 },
  ...sections.slice(1, 5).map((part, index) => ({ sectionIndex: index + 1, fromS: part.startS + 65, toS: part.endS - 100 })),
  { sectionIndex: 5, fromS: sections[5].startS + 65, toS: sections[5].startS + 1150 },
];
const bridgePoints = [greenIsland[8], greenIsland[7], greenIsland[6], greenIsland[5]];
const bridgeLength = bridgePoints.slice(1).reduce((sum, point, i) => sum + Math.hypot(point.x - bridgePoints[i].x, point.z - bridgePoints[i].z), 0);
export const ROUTE = Object.freeze({
  id: 'town-drive-v1', length: distance, samples, sections, checkpoints, turns,
  spawn: { x: checkpoints[0].x, z: checkpoints[0].z, yaw: checkpoints[0].yaw },
  streetSpans: NEIGHBORHOOD_STREET_SPANS,
  safePedestrianSpans: SAFE_PEDESTRIAN_SPANS,
  // World draws the shared stem once, plus the mapped paved bulb. The return's
  // progress path remains present for authoritative arrival and turnaround.
  sharedRoadSpans: [{ fromS: returnHome.approachS!, toS: distance }],
  visibleRoadSpans: [{ fromS: 0, toS: returnHome.approachS! }],
  trafficBridge: { fromS: trafficBridgeFromS, toS: trafficBridgeToS, points: bridgePoints, length: bridgeLength },
  // Home is approximately 1:1; arterial distances and the return remain compressed.
  estimatedDistanceScale: 0.55,
  expectedCruiseSeconds: samples.slice(1).reduce((sum, point, i) => sum + (point.s - samples[i].s) / recommendedSpeedAt(point.s), 0),
});

export function nearestRoutePoint(x: number, z: number, preferredS?: number): NearestRoutePoint {
  let best: NearestRoutePoint = { ...samples[0], distance: Infinity, signedOffset: 0 };
  let local: NearestRoutePoint | undefined;
  let localProgress = Infinity;
  const progressDistance = (s: number) => Math.abs(((s - preferredS! + distance * 1.5) % distance) - distance / 2);
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i]; const b = samples[i + 1]; const dx = b.x - a.x; const dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    const px = a.x + dx * t; const pz = a.z + dz * t;
    const d = Math.hypot(x - px, z - pz);
    const yaw = Math.atan2(dx, dz); const rawS = a.s + (b.s - a.s) * t;
    const s = rawS >= distance - 1e-9 ? 0 : rawS;
    const sectionIndex = sections.findIndex(section => s >= section.startS && s < section.endS);
    const candidate = { x: px, z: pz, yaw, s, sectionIndex: Math.max(0, sectionIndex), distance: d,
      signedOffset: (x - px) * Math.cos(yaw) - (z - pz) * Math.sin(yaw) };
    if (d < best.distance) best = candidate;
    if (preferredS !== undefined && Number.isFinite(preferredS)) {
      const progress = progressDistance(s);
      if (progress < 18 && (!local || d < local.distance - .00001 || (Math.abs(d - local.distance) < .00001 && progress < localProgress))) {
        local = candidate; localProgress = progress;
      }
    }
  }
  // Return traversal shares the exact Starpass centreline in the opposite
  // direction. Stay on the nearby progress branch until it actually joins home.
  return local && local.distance <= best.distance + 3.6 ? local : best;
}

export function validateRoute(): string[] {
  const problems: string[] = [];
  if (Math.hypot(samples[0].x - samples.at(-1)!.x, samples[0].z - samples.at(-1)!.z) > 0.01) problems.push('Route is not a loop');
  if (turns.slice(0, 3).map(turn => turn.direction).join(',') !== 'right,left,right') problems.push('Mapped home-exit turn order changed');
  if (turns.filter(turn => turn.reference === 'arterial').map(turn => turn.direction).join(',') !== 'right,left,left') problems.push('Recorded arterial turn order changed');
  for (const turn of turns) {
    const incoming = pointAtDistance(turn.approachS! + .2).yaw; const outgoing = pointAtDistance(turn.exitS! - .2).yaw;
    const delta = Math.atan2(Math.sin(outgoing - incoming), Math.cos(outgoing - incoming));
    if ((turn.direction === 'right' && delta < 0.5) || (turn.direction === 'left' && delta > -0.5)) problems.push('Turn geometry contradicts its direction');
  }
  for (let i = 1; i < sections.length; i++) if (Math.abs(sections[i].startS - sections[i - 1].endS) > 0.001) problems.push('Section gap');
  for (let i = 1; i < samples.length; i++) if (samples[i].s <= samples[i - 1].s || samples[i].s - samples[i - 1].s > 8.1) problems.push('Sample gap');
  for (const checkpoint of checkpoints) if (!Number.isFinite(checkpoint.x + checkpoint.z + checkpoint.yaw) || checkpoint.s < 0 || checkpoint.s >= distance) problems.push('Invalid checkpoint');
  if (sections[0].endS < 370 || sections[0].endS > 430) problems.push('Mapped home exit is not approximately 400 metres');
  if (sections[0].invented || !sections[5].invented) problems.push('Route provenance labels changed');
  return problems;
}
