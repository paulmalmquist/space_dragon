import { pointAtDistance, ROUTE, SAFE_PEDESTRIAN_SPANS } from './route.ts';

export interface Pedestrian {
  id: string;
  sectionIndex: number;
  side: 1 | -1;
  startS: number;
  endS: number;
  speed: number;
  phaseDistance: number;
  appearance: 0 | 1;
  heightScale: number;
}
export interface PedestrianPose {
  id: string; x: number; z: number; yaw: number; s: number; sectionIndex: number;
  side: 1 | -1; walkPhase: number; moving: boolean; speed: number;
  appearance: 0 | 1; heightScale: number; elapsedSeconds: number;
}

/** Their complete walking footprint stays inside the two-metre sidewalk. */
export const PEDESTRIAN_TURN_RADIUS = .34;
export const PEDESTRIAN_BODY_RADIUS = .29;
const STRIDE_METRES = 1.5;
const ALLOCATION = [4, 8, 8, 8, 6, 6];
const wrap = (value: number, period: number) => ((value % period) + period) % period;

/** Fixed, anonymous adults. No wall clock, randomness, save data, or collision actors. */
export function createPedestrianPopulation(count = 40): Pedestrian[] {
  const population: Pedestrian[] = [];
  const limit = Math.max(0, Math.min(40, Math.floor(Number.isFinite(count) ? count : 40)));
  for (const section of ROUTE.sections) {
    const sectionIndex = ROUTE.sections.indexOf(section);
    const perSide = ALLOCATION[sectionIndex] / 2;
    // Walk only straight sidewalks. Junction bends, the driveway and lane tapers
    // are deliberately excluded; nobody crosses a driving lane to change blocks.
    const spans = SAFE_PEDESTRIAN_SPANS.filter(span => span.sectionIndex === sectionIndex);
    for (let slot = 0; slot < perSide; slot++) for (const side of [1, -1] as const) {
      const serial = population.length;
      const spanIndex = slot % spans.length;
      const span = spans[spanIndex];
      const slotsInSpan = Math.ceil((perSide - spanIndex) / spans.length);
      const spanSlot = Math.floor(slot / spans.length);
      const slotLength = (span.toS - span.fromS) / slotsInSpan;
      const length = Math.min(82, slotLength - 8);
      const startS = span.fromS + spanSlot * slotLength + (slotLength - length) / 2;
      const pathLength = 2 * length + 2 * Math.PI * PEDESTRIAN_TURN_RADIUS;
      population.push({ id: `walker.${section.id}.${slot}.${side === 1 ? 'right' : 'left'}`,
        sectionIndex, side, startS, endS: startS + length,
        speed: 1.12 + (serial * 7 % 6) * .055,
        phaseDistance: wrap(serial * 37.19 + (side === -1 ? length : 0), pathLength),
        appearance: (serial + slot) % 2 as 0 | 1, heightScale: .96 + (serial % 5) * .02 });
    }
  }
  // A smaller requested population is spread over the entire route.
  return limit === 40 ? population : Array.from({ length: limit }, (_, index) => population[Math.floor(index * 40 / limit)]);
}

const DEFAULT_POPULATION = createPedestrianPopulation();

/** Absolute-time, distance-driven walking on narrow, rounded sidewalk patrols.
 * Rendering can sample this at any cadence, including a frozen elapsed time.
 */
export function pedestrianPosesAt(elapsedSeconds: number, population: readonly Pedestrian[] = DEFAULT_POPULATION): PedestrianPose[] {
  const time = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
  const radius = PEDESTRIAN_TURN_RADIUS;
  return population.map(person => {
    const length = person.endS - person.startS;
    const arc = Math.PI * radius;
    const distance = time * person.speed + person.phaseDistance;
    let t = wrap(distance, 2 * length + 2 * arc);
    let along = 0; let lateral = 0; let heading = 0;
    if (t < length) { along = t; lateral = radius; }
    else if ((t -= length) < arc) {
      const angle = t / radius;
      along = length + radius * Math.sin(angle); lateral = radius * Math.cos(angle); heading = -angle;
    } else if ((t -= arc) < length) { along = length - t; lateral = -radius; heading = Math.PI; }
    else {
      const angle = (t - length) / radius;
      along = -radius * Math.sin(angle); lateral = -radius * Math.cos(angle); heading = Math.PI - angle;
    }
    const road = pointAtDistance(person.startS + along);
    const section = ROUTE.sections[person.sectionIndex];
    const roadHalf = section.lanes * section.laneWidth + section.medianWidth / 2;
    const offset = person.side * (roadHalf + 3.2 + section.sidewalkWidth / 2) + lateral;
    return { id: person.id, x: road.x + Math.cos(road.yaw) * offset,
      z: road.z - Math.sin(road.yaw) * offset, yaw: road.yaw + heading,
      s: road.s, sectionIndex: person.sectionIndex, side: person.side,
      walkPhase: wrap(distance / STRIDE_METRES, 1), moving: true, speed: person.speed,
      appearance: person.appearance, heightScale: person.heightScale, elapsedSeconds: time };
  });
}
