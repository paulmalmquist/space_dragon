import type { Anchor, Recovery, Solid, SparkSpot, TraversalWorld, WaterZone } from './world.ts';

/**
 * The practice home block: a generic, fictional house, yard, lake edge and street.
 * It is not the owner's property, a mapped place or a story mission. High-level specs
 * below drive both collision (derived solids/anchors) and rendering.
 */
export interface HouseSpec {
  id: string;
  minX: number; maxX: number; minZ: number; maxZ: number;
  wall: number; ridge: number;
  /** The ridge line runs along this axis. */
  ridgeAxis: 'x' | 'z';
  overhang: number;
  palette: 'home' | 'coral' | 'sand' | 'sage' | 'sky';
  /** Player house: the living room is carved out separately. */
  home?: boolean;
}
export interface LampSpec { id: string; x: number; z: number; height: number; armX: number; armZ: number; floor: number; }
export interface PalmSpec { id: string; x: number; z: number; height: number; leanX: number; leanZ: number; anchor: boolean; }
export interface PoleSpec { id: string; x: number; z: number; height: number; armX: number; armZ: number; }
export interface PilingSpec { id: string; x: number; z: number; height: number; armX: number; armZ: number; }
export interface TreeSpec { id: string; x: number; z: number; height: number; crown: number; limbX: number; limbZ: number; }
export interface CarSpec { id: string; minX: number; maxX: number; minZ: number; maxZ: number; color: string; }
export interface FenceSpec { id: string; minX: number; maxX: number; minZ: number; maxZ: number; }
export interface HedgeSpec { id: string; minX: number; maxX: number; minZ: number; maxZ: number; height: number; }

export const ROOF_THICKNESS = 0.14;
export const HOME_FLOOR = 0.15;
export const FENCE_HEIGHT = 1.4;

export const HOUSES: readonly HouseSpec[] = Object.freeze([
  { id: 'home', minX: -17.5, maxX: -0.5, minZ: -3, maxZ: 9, wall: 2.8, ridge: 5.1, ridgeAxis: 'x', overhang: 0.6, palette: 'home', home: true },
  { id: 'north-house', minX: -16, maxX: -2, minZ: 14, maxZ: 24, wall: 2.8, ridge: 4.9, ridgeAxis: 'x', overhang: 0.6, palette: 'coral' },
  { id: 'south-house', minX: -16, maxX: -2, minZ: -22, maxZ: -12, wall: 2.8, ridge: 4.9, ridgeAxis: 'x', overhang: 0.6, palette: 'sage' },
]);

/** Scenery beyond the play bounds: rendered, never collided with. */
export const BACKDROP_HOUSES: readonly HouseSpec[] = Object.freeze([
  { id: 'far-west-a', minX: -52, maxX: -40, minZ: -27, maxZ: -15, wall: 2.8, ridge: 4.8, ridgeAxis: 'z', overhang: 0.6, palette: 'sand' },
  { id: 'far-west-b', minX: -52, maxX: -40, minZ: -8, maxZ: 6, wall: 2.8, ridge: 5, ridgeAxis: 'z', overhang: 0.6, palette: 'sky' },
  { id: 'far-west-c', minX: -52, maxX: -40, minZ: 13, maxZ: 26, wall: 2.8, ridge: 4.8, ridgeAxis: 'z', overhang: 0.6, palette: 'coral' },
  { id: 'far-north', minX: -16, maxX: -3, minZ: 37, maxZ: 47, wall: 2.8, ridge: 4.8, ridgeAxis: 'x', overhang: 0.6, palette: 'sand' },
  { id: 'far-south', minX: -16, maxX: -3, minZ: -47, maxZ: -37, wall: 2.8, ridge: 4.8, ridgeAxis: 'x', overhang: 0.6, palette: 'sky' },
]);

export const LAMPS: readonly LampSpec[] = Object.freeze([
  { id: 'dock-lamp-1', x: 22, z: 2.35, height: 8.6, armX: 0, armZ: -2.35, floor: 0.55 },
  { id: 'dock-lamp-2', x: 28.5, z: -2.35, height: 8.6, armX: 0, armZ: 2.35, floor: 0.55 },
  { id: 'dock-lamp-3', x: 35, z: 2.35, height: 8.6, armX: 0, armZ: -2.35, floor: 0.55 },
  { id: 'street-lamp-n', x: -21.3, z: 8, height: 8.8, armX: -2.4, armZ: 0, floor: 0 },
  { id: 'street-lamp-s', x: -21.3, z: -8, height: 8.8, armX: -2.4, armZ: 0, floor: 0 },
]);

export const POLES: readonly PoleSpec[] = Object.freeze([
  { id: 'pole-north', x: -21.3, z: 16, height: 10.4, armX: -2.3, armZ: 0 },
  { id: 'pole-mid', x: -21.3, z: 0, height: 10.4, armX: -2.3, armZ: 0 },
  { id: 'pole-south', x: -21.3, z: -16, height: 10.4, armX: -2.3, armZ: 0 },
]);

export const PALMS: readonly PalmSpec[] = Object.freeze([
  // Trunks stand clear of the swing line; the leaning crown carries the anchor.
  { id: 'palm-dock', x: 12.6, z: 3.4, height: 9.6, leanX: 0.3, leanZ: -3, anchor: true },
  { id: 'palm-shore-south', x: 13.6, z: -9.2, height: 9.4, leanX: -1.9, leanZ: 0.3, anchor: true },
  { id: 'palm-shore-far-south', x: 13.2, z: -20, height: 9.8, leanX: -1.4, leanZ: 2.4, anchor: true },
  { id: 'palm-shore-north', x: 13.2, z: 25, height: 9.8, leanX: -0.6, leanZ: -2.6, anchor: true },
  { id: 'palm-sandbar', x: 24.2, z: 27, height: 9.6, leanX: -0.2, leanZ: -2.6, anchor: true },
  { id: 'palm-front-a', x: -19.2, z: -4.5, height: 8.6, leanX: 0.5, leanZ: 0.3, anchor: false },
  { id: 'palm-front-b', x: -19, z: 11.6, height: 8.2, leanX: 0.4, leanZ: -0.4, anchor: false },
  { id: 'palm-yard', x: 8.9, z: -4.2, height: 7.2, leanX: -0.5, leanZ: 0.4, anchor: false },
  { id: 'palm-north-lot', x: 9.5, z: 28.2, height: 8.8, leanX: 0.3, leanZ: -0.5, anchor: false },
  { id: 'palm-south-lot', x: 9.5, z: -27, height: 8.8, leanX: 0.3, leanZ: 0.5, anchor: false },
]);

/** Broad shade trees between the lake and the neighbouring roofs; a long limb carries the anchor. */
export const TREES: readonly TreeSpec[] = Object.freeze([
  { id: 'oak-north', x: 4.6, z: 19.2, height: 10.2, crown: 4.6, limbX: 0, limbZ: 2 },
  { id: 'oak-south', x: 4.6, z: -15.2, height: 10.2, crown: 4.6, limbX: 0, limbZ: -2 },
]);

/** Old mooring posts in the lake; each crossarm reaches toward the swing line. */
export const PILINGS: readonly PilingSpec[] = Object.freeze([
  { id: 'piling-1', x: 42.5, z: 8.5, height: 9, armX: -2.1, armZ: 0 },
  { id: 'piling-2', x: 39.3, z: 17.9, height: 9.3, armX: -1.7, armZ: -1.3 },
  { id: 'piling-3', x: 32.5, z: 24.5, height: 9.3, armX: -0.9, armZ: -2 },
]);

export const CARS: readonly CarSpec[] = Object.freeze([
  { id: 'car-driveway', minX: -22.6, maxX: -18.2, minZ: 4.5, maxZ: 6.4, color: '#7d8a93' },
  { id: 'car-street', minX: -29.3, maxX: -27.4, minZ: -13.4, maxZ: -9, color: '#8c3b33' },
]);

export const FENCES: readonly FenceSpec[] = Object.freeze([
  { id: 'yard-north', minX: -0.4, maxX: 10.1, minZ: 5.1, maxZ: 5.3 },
  { id: 'yard-south', minX: -0.6, maxX: 10.1, minZ: -5.3, maxZ: -5.1 },
  // The east fence leaves a gate in line with the dock.
  { id: 'yard-east-north', minX: 9.9, maxX: 10.1, minZ: 1.2, maxZ: 5.3 },
  { id: 'yard-east-south', minX: 9.9, maxX: 10.1, minZ: -5.3, maxZ: -0.4 },
  { id: 'yard-west-south', minX: -0.6, maxX: -0.4, minZ: -5.3, maxZ: -3.1 },
]);

export const HEDGES: readonly HedgeSpec[] = Object.freeze([
  { id: 'hedge-north-lot', minX: -17, maxX: 9, minZ: 11.2, maxZ: 12, height: 1.1 },
  { id: 'hedge-south-lot', minX: -17, maxX: 9, minZ: -10.4, maxZ: -9.6, height: 1.1 },
  { id: 'hedge-far-north', minX: -20, maxX: 15, minZ: 30.6, maxZ: 31.6, height: 1.6 },
  { id: 'hedge-far-south', minX: -20, maxX: 15, minZ: -31.6, maxZ: -30.6, height: 1.6 },
  { id: 'hedge-far-west', minX: -35.6, maxX: -34.6, minZ: -31, maxZ: 31, height: 1.6 },
]);

export const DOCK = Object.freeze({ minX: 17, maxX: 35, halfWidth: 2, deck: 0.55, rampStart: 15.2, endMaxX: 41, endHalfWidth: 3.6 });
export const SANDBAR = Object.freeze({ minX: 20.5, maxX: 27.5, minZ: 20.5, maxZ: 27.8, top: 0.2 });
export const TRAMPOLINE = Object.freeze({ minX: 6.6, maxX: 8.8, minZ: 2, maxZ: 4.2, top: 0.68, bounce: 13.5 });
export const GATE = Object.freeze({ x: 10, minZ: -0.4, maxZ: 1.2 });
export const GARAGE = Object.freeze({ minX: 5.7, maxX: 9.7, minZ: 5.7, maxZ: 8.5, top: 3.3 });
/** Weather masts on the ridges: perch anchors that set the hero down on each roof. */
export interface MastSpec { id: string; x: number; z: number; height: number; ridge: number; home?: boolean; }
export const ROOF_MASTS: readonly MastSpec[] = Object.freeze([
  { id: 'roof-mast', x: -2.6, z: 3, height: 8.4, ridge: 5.1, home: true },
  { id: 'north-roof-mast', x: -13.4, z: 19, height: 8.2, ridge: 4.9 },
  { id: 'south-roof-mast', x: -13.4, z: -17, height: 8.2, ridge: 4.9 },
]);
export const DOCK_MAST = Object.freeze({ x: 38.2, z: 0, height: 9.4, postX: 40.4, postZ: -3 });
export const SHORE_X = 17;

const WORLD_BOUNDS = Object.freeze({ minX: -36, maxX: 48, minZ: -32, maxZ: 32 });

function box(id: string, kind: Solid['kind'], minX: number, maxX: number, minZ: number, maxZ: number, minY: number, maxY: number, extra: Partial<Solid> = {}): Solid {
  return Object.freeze({ id, kind, minX, maxX, minZ, maxZ, minY, maxY, ...extra });
}

/** Two planar prisms meeting at the ridge; gable ends are the prisms' vertical faces. */
export function roofSolids(house: HouseSpec): Solid[] {
  const o = house.overhang;
  const base = house.wall + ROOF_THICKNESS;
  const across = house.ridgeAxis === 'x' ? 'z' : 'x';
  const low = across === 'z' ? house.minZ : house.minX;
  const high = across === 'z' ? house.maxZ : house.maxX;
  const mid = (low + high) / 2;
  const pitch = (house.ridge - base) / (mid - low);
  const edge = base - o * pitch;
  const minY = edge - ROOF_THICKNESS;
  const along = house.ridgeAxis === 'x'
    ? { minX: house.minX - o, maxX: house.maxX + o }
    : { minZ: house.minZ - o, maxZ: house.maxZ + o };
  const first = across === 'z' ? { ...along, minZ: low - o, maxZ: mid } : { ...along, minX: low - o, maxX: mid };
  const second = across === 'z' ? { ...along, minZ: mid, maxZ: high + o } : { ...along, minX: mid, maxX: high + o };
  return [
    Object.freeze({ id: `${house.id}-roof-a`, kind: 'roof', minY, maxY: house.ridge, slope: { axis: across, atMin: edge, atMax: house.ridge }, house: house.home, ...first } as Solid),
    Object.freeze({ id: `${house.id}-roof-b`, kind: 'roof', minY, maxY: house.ridge, slope: { axis: across, atMin: house.ridge, atMax: edge }, house: house.home, ...second } as Solid),
  ];
}

function buildSolids(): Solid[] {
  const solids: Solid[] = [];
  const home = HOUSES[0];
  // Living room: a floor slab, the wings as solid mass, an east wall with the wide doorway.
  solids.push(box('home-floor', 'floor', -7.5, -0.5, -3, 3, -0.3, HOME_FLOOR, { house: true }));
  solids.push(box('house-west', 'block', home.minX, -7.4, home.minZ - 0.1, home.maxZ + 0.1, 0, home.wall, { house: true }));
  solids.push(box('house-north', 'block', -7.6, -0.4, 2.9, home.maxZ + 0.1, 0, home.wall, { house: true }));
  solids.push(box('house-south', 'wall', -7.6, -0.4, -3.1, -2.9, 0, home.wall, { house: true }));
  solids.push(box('house-east-south', 'wall', -0.6, -0.4, -3.1, -1, 0, home.wall, { house: true }));
  solids.push(box('house-east-north', 'wall', -0.6, -0.4, 1, 2.9, 0, home.wall, { house: true }));
  solids.push(box('door-header', 'wall', -0.625, -0.375, -1, 1, 2.42, home.wall, { house: true }));
  solids.push(box('computer-desk', 'prop', -5.3, -2.7, 0.45, 1.55, HOME_FLOOR, 1.33, { house: true }));
  solids.push(box('sofa', 'prop', -6, -3.2, -2.35, -1.25, HOME_FLOOR, 1.2, { house: true }));
  solids.push(...roofSolids(home));
  for (const house of HOUSES.slice(1)) {
    solids.push(box(`${house.id}-walls`, 'block', house.minX, house.maxX, house.minZ, house.maxZ, 0, house.wall));
    solids.push(...roofSolids(house));
  }
  solids.push(box('patio', 'floor', -0.5, 2.7, -1.5, 1.5, -0.2, 0.06));
  solids.push(box('pod', 'prop', 2.65, 4.35, -0.85, 0.85, 0, 2.2));
  for (const fence of FENCES) solids.push(box(fence.id, 'fence', fence.minX, fence.maxX, fence.minZ, fence.maxZ, 0, FENCE_HEIGHT));
  solids.push(box('garage', 'block', GARAGE.minX, GARAGE.maxX, GARAGE.minZ, GARAGE.maxZ, 0, GARAGE.top));
  solids.push(box('trampoline-step', 'prop', TRAMPOLINE.minX - 0.55, TRAMPOLINE.minX, 2.7, 3.5, 0, 0.34));
  solids.push(box('trampoline', 'prop', TRAMPOLINE.minX, TRAMPOLINE.maxX, TRAMPOLINE.minZ, TRAMPOLINE.maxZ, 0.3, TRAMPOLINE.top, { bounce: TRAMPOLINE.bounce }));
  // Dock: a ramp from the shore, the long deck and a wider end platform.
  solids.push(Object.freeze({ id: 'dock-ramp', kind: 'deck', minX: DOCK.rampStart, maxX: DOCK.minX, minZ: -DOCK.halfWidth, maxZ: DOCK.halfWidth,
    minY: -0.2, maxY: DOCK.deck, slope: { axis: 'x', atMin: 0, atMax: DOCK.deck } } as Solid));
  solids.push(box('dock', 'deck', DOCK.minX, DOCK.maxX, -DOCK.halfWidth, DOCK.halfWidth, DOCK.deck - 0.25, DOCK.deck));
  solids.push(box('dock-end', 'deck', DOCK.maxX, DOCK.endMaxX, -DOCK.endHalfWidth, DOCK.endHalfWidth, DOCK.deck - 0.25, DOCK.deck));
  solids.push(box('sandbar', 'deck', SANDBAR.minX, SANDBAR.maxX, SANDBAR.minZ, SANDBAR.maxZ, -1.5, SANDBAR.top));
  for (const hedge of HEDGES) solids.push(box(hedge.id, 'prop', hedge.minX, hedge.maxX, hedge.minZ, hedge.maxZ, 0, hedge.height));
  for (const car of CARS) solids.push(box(car.id, 'prop', car.minX, car.maxX, car.minZ, car.maxZ, 0, 1.45));
  for (const lamp of LAMPS) solids.push(box(`${lamp.id}-post`, 'trunk', lamp.x - 0.12, lamp.x + 0.12, lamp.z - 0.12, lamp.z + 0.12, lamp.floor > 0 ? -1.5 : 0, lamp.height));
  for (const pole of POLES) solids.push(box(`${pole.id}-post`, 'trunk', pole.x - 0.16, pole.x + 0.16, pole.z - 0.16, pole.z + 0.16, 0, pole.height));
  for (const palm of PALMS) solids.push(box(`${palm.id}-trunk`, 'trunk', palm.x - 0.22, palm.x + 0.22, palm.z - 0.22, palm.z + 0.22, 0, palm.height - 1.6));
  for (const tree of TREES) solids.push(box(`${tree.id}-trunk`, 'trunk', tree.x - 0.4, tree.x + 0.4, tree.z - 0.4, tree.z + 0.4, 0, tree.height - tree.crown));
  for (const piling of PILINGS) solids.push(box(`${piling.id}-post`, 'trunk', piling.x - 0.25, piling.x + 0.25, piling.z - 0.25, piling.z + 0.25, -1.5, piling.height));
  solids.push(box('dock-mast-post', 'trunk', DOCK_MAST.postX - 0.14, DOCK_MAST.postX + 0.14, DOCK_MAST.postZ - 0.14, DOCK_MAST.postZ + 0.14, DOCK.deck, DOCK_MAST.height));
  return solids;
}

function buildAnchors(): Anchor[] {
  const anchors: Anchor[] = [];
  const add = (id: string, x: number, y: number, z: number, floor: number, perch = false) => anchors.push(Object.freeze({ id, x, y, z, floor, perch }));
  for (const mast of ROOF_MASTS) add(mast.id, mast.x, mast.height, mast.z, mast.ridge, true);
  for (const palm of PALMS) if (palm.anchor) add(palm.id, palm.x + palm.leanX, palm.height, palm.z + palm.leanZ, palm.id === 'palm-sandbar' ? SANDBAR.top : 0);
  for (const lamp of LAMPS) add(lamp.id, lamp.x + lamp.armX, lamp.height - 0.2, lamp.z + lamp.armZ, lamp.floor);
  add('dock-mast', DOCK_MAST.x, DOCK_MAST.height, DOCK_MAST.z, DOCK.deck, true);
  for (const piling of PILINGS) add(piling.id, piling.x + piling.armX, piling.height - 0.2, piling.z + piling.armZ, 0);
  for (const pole of POLES) add(pole.id, pole.x + pole.armX, pole.height - 0.3, pole.z + pole.armZ, 0);
  for (const tree of TREES) add(tree.id, tree.x + tree.limbX, tree.height - 0.6, tree.z + tree.limbZ, 0);
  return anchors;
}

/** Where the safety catch may set the hero down when that is nearer than the last footing. */
const RECOVERIES: readonly Recovery[] = Object.freeze([
  { id: 'dock-start', x: 19, y: DOCK.deck, z: 0, yaw: Math.PI / 2 },
  { id: 'dock-middle', x: 28, y: DOCK.deck, z: 0, yaw: Math.PI / 2 },
  { id: 'dock-end', x: 38, y: DOCK.deck, z: 0, yaw: Math.PI / 2 },
  { id: 'sandbar', x: 24, y: SANDBAR.top, z: 23.6, yaw: -Math.PI / 2 },
  { id: 'shore-north', x: 14.6, y: 0, z: 22, yaw: -Math.PI / 2 },
  { id: 'shore-middle', x: 14.4, y: 0, z: -4, yaw: -Math.PI / 2 },
  { id: 'shore-south', x: 14.6, y: 0, z: -16, yaw: -Math.PI / 2 },
].map(spot => Object.freeze(spot)));

/**
 * Practice sparks. Each can be reached more than one way: several by walking, others by
 * the trampoline, a hop to a roof or a tether swing. They are practice items, not story parts.
 */
export const SPARKS: readonly SparkSpot[] = Object.freeze([
  { id: 'spark-01', x: 12.2, y: 1.15, z: -6 },
  { id: 'spark-02', x: 7.7, y: 4.3, z: 3.1 },
  { id: 'spark-03', x: 7.7, y: 4.5, z: 7.1 },
  { id: 'spark-04', x: -6, y: 6.2, z: 3 },
  { id: 'spark-05', x: 24, y: 1.25, z: 23.6 },
  { id: 'spark-06', x: -19.4, y: 1.15, z: 1.4 },
  { id: 'spark-07', x: -23.7, y: 2.3, z: 8 },
  { id: 'spark-08', x: -9, y: 6, z: -17 },
  { id: 'spark-09', x: 12.9, y: 2.3, z: 0.4 },
  { id: 'spark-10', x: 38.2, y: 1.6, z: -1.6 },
  { id: 'spark-11', x: 40.4, y: 2.2, z: 8.5 },
  { id: 'spark-12', x: -9, y: 6, z: 19 },
].map(spark => Object.freeze(spark)));

const WATER: readonly WaterZone[] = Object.freeze([
  Object.freeze({ id: 'lake', minX: SHORE_X, maxX: 60, minZ: -40, maxZ: 40, surface: -0.25, bed: -1.4 }),
]);

export const HOME_BLOCK: TraversalWorld = Object.freeze({
  id: 'home-block-v001',
  bounds: WORLD_BOUNDS,
  solids: Object.freeze(buildSolids()),
  anchors: Object.freeze(buildAnchors()),
  water: WATER,
  sparks: SPARKS,
  recoveries: RECOVERIES,
  spawn: Object.freeze({ x: -2, z: -1.5, yaw: 0 }),
});
