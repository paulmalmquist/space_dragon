/**
 * Engine-independent traversal geometry: axis-aligned prisms with an optional planar top,
 * tether anchors and water. Rendering reads this data; it never owns collision.
 */
export type SolidKind = 'wall' | 'block' | 'roof' | 'fence' | 'prop' | 'deck' | 'floor' | 'trunk';

export interface Solid {
  id: string;
  kind: SolidKind;
  minX: number; maxX: number;
  minZ: number; maxZ: number;
  minY: number;
  /** Flat top height. With `slope`, this is the highest edge. */
  maxY: number;
  /** Planar top: heights at the min and max edge of `axis`. */
  slope?: { axis: 'x' | 'z'; atMin: number; atMax: number };
  /** Upward launch speed applied on landing (trampoline). */
  bounce?: number;
  /** Solids of the player's own house: rendering and the camera treat them as a cutaway indoors. */
  house?: boolean;
}

export interface Anchor {
  id: string;
  x: number; y: number; z: number;
  /** Height of the surface below the swing; keeps the bottom of the arc clear. */
  floor: number;
  /** A destination: the tether lets go under it so the hero drops onto the surface below. */
  perch: boolean;
}

/** An authored safe standing spot used by the safety catch. */
export interface Recovery { id: string; x: number; y: number; z: number; yaw: number; }

export interface WaterZone { id: string; minX: number; maxX: number; minZ: number; maxZ: number; surface: number; bed: number; }
export interface WorldBounds { minX: number; maxX: number; minZ: number; maxZ: number; }
export interface SparkSpot { id: string; x: number; y: number; z: number; }

/**
 * A marked wall face the hero can climb (Spider Climb). Only authored faces are climbable.
 * `axis` is the horizontal axis the wall faces along; the climbable side looks toward
 * positive `axis` when `facing` is 1 and toward negative when it is -1.
 */
export interface ClimbSurface {
  id: string;
  axis: 'x' | 'z';
  /** Coordinate of the wall plane on `axis`. */
  at: number;
  facing: 1 | -1;
  /** Extent along the other horizontal axis. */
  min: number; max: number;
  minY: number;
  /** Top of the wall. The hero mantles onto the surface behind it when there is room. */
  maxY: number;
}

export interface TraversalWorld {
  id: string;
  bounds: WorldBounds;
  solids: readonly Solid[];
  anchors: readonly Anchor[];
  water: readonly WaterZone[];
  sparks: readonly SparkSpot[];
  recoveries: readonly Recovery[];
  spawn: { x: number; z: number; yaw: number };
  /** Optional: worlds without climbable faces simply omit it. */
  climbs?: readonly ClimbSurface[];
}

export function clamp(value: number, low: number, high: number): number { return value < low ? low : value > high ? high : value; }
export function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }

/** Top surface height at the closest point of the footprint. */
export function topAt(solid: Solid, x: number, z: number): number {
  if (!solid.slope) return solid.maxY;
  const low = solid.slope.axis === 'x' ? solid.minX : solid.minZ;
  const high = solid.slope.axis === 'x' ? solid.maxX : solid.maxZ;
  const span = high - low;
  if (span <= 0) return solid.maxY;
  const t = clamp(((solid.slope.axis === 'x' ? x : z) - low) / span, 0, 1);
  return solid.slope.atMin + (solid.slope.atMax - solid.slope.atMin) * t;
}

export function waterAt(world: TraversalWorld, x: number, z: number): WaterZone | null {
  for (const zone of world.water) if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ) return zone;
  return null;
}

/** Bare ground height, before solids: dry land is zero and the lake bed lies below its surface. */
export function terrainAt(world: TraversalWorld, x: number, z: number): number {
  const zone = waterAt(world, x, z);
  return zone ? zone.bed : 0;
}

export interface Support { height: number; id: string; bounce: number; }

/**
 * Highest standable surface under a point that the feet can reach from `feet`
 * (within `reach` above them). Solids that are taller are walls, not floors.
 */
export function supportAt(world: TraversalWorld, x: number, z: number, feet: number, reach: number, grace = 0): Support {
  let height = terrainAt(world, x, z);
  let id = 'terrain';
  let bounce = 0;
  for (const solid of world.solids) {
    if (x < solid.minX - grace || x > solid.maxX + grace || z < solid.minZ - grace || z > solid.maxZ + grace) continue;
    const top = topAt(solid, x, z);
    if (top > feet + reach || top <= height) continue;
    height = top; id = solid.id; bounce = solid.bounce ?? 0;
  }
  return { height, id, bounce };
}

/**
 * Lowest underside above the head within `reach` of a point; Infinity when the sky is open.
 * The reach covers the body's rim so a head meets an overhang instead of sliding into its side.
 */
export function ceilingAt(world: TraversalWorld, x: number, z: number, head: number, reach = 0): number {
  let ceiling = Infinity;
  for (const solid of world.solids) {
    if (x < solid.minX - reach || x > solid.maxX + reach || z < solid.minZ - reach || z > solid.maxZ + reach) continue;
    if (solid.minY >= head - 0.05 && solid.minY < ceiling) ceiling = solid.minY;
  }
  return ceiling;
}

/** True when a point lies inside a solid's volume grown by `padding`. Used for the camera boom. */
export function pointInSolid(solid: Solid, x: number, y: number, z: number, padding = 0): boolean {
  if (x < solid.minX - padding || x > solid.maxX + padding || z < solid.minZ - padding || z > solid.maxZ + padding) return false;
  return y >= solid.minY - padding && y <= topAt(solid, x, z) + padding;
}

/**
 * A standing pose is safe when inside the bounds, on dry footing near ground level
 * (a lawn, floor or deck, never a roof, bounce pad or lake bed) and clear of every
 * solid that would block a person there.
 */
export function isStandable(world: TraversalWorld, x: number, z: number, radius: number, stepHeight: number, height: number, placeReach: number): boolean {
  if (!finite(x) || !finite(z)) return false;
  const b = world.bounds;
  if (x < b.minX + radius || x > b.maxX - radius || z < b.minZ + radius || z > b.maxZ - radius) return false;
  const support = supportAt(world, x, z, 0, placeReach);
  if (support.bounce > 0 || (support.id === 'terrain' && waterAt(world, x, z))) return false;
  const feet = support.height;
  for (const solid of world.solids) {
    const cx = clamp(x, solid.minX, solid.maxX);
    const cz = clamp(z, solid.minZ, solid.maxZ);
    const dx = x - cx;
    const dz = z - cz;
    if (dx * dx + dz * dz >= radius * radius - 1e-10) continue;
    if (topAt(solid, cx, cz) <= feet + stepHeight) continue; // a floor or step we stand on
    if (solid.minY >= feet + height) continue; // overhead: a roof or a door header
    return false;
  }
  return true;
}

/** Height at which the player's house is drawn cut open while they are indoors. */
export const CUTAWAY_HEIGHT = 0.8;

/**
 * Fraction of a camera boom from `focus` toward `desired` that stays outside solids.
 * Thin trunks are ignored; with `cutaway`, the player's house only blocks below the cut.
 */
export function clipBoom(world: TraversalWorld, focus: { x: number; y: number; z: number }, desired: { x: number; y: number; z: number },
  cutaway: boolean, padding = 0.18, samples = 24): number {
  const dx = desired.x - focus.x;
  const dy = desired.y - focus.y;
  const dz = desired.z - focus.z;
  const blocked = (t: number): boolean => {
    const x = focus.x + dx * t;
    const y = focus.y + dy * t;
    const z = focus.z + dz * t;
    for (const solid of world.solids) {
      if (solid.kind === 'trunk') continue;
      if (cutaway && solid.house) {
        if (solid.minY > CUTAWAY_HEIGHT || y > CUTAWAY_HEIGHT + padding) continue;
      }
      if (pointInSolid(solid, x, y, z, padding)) return true;
    }
    return false;
  };
  let clear = 0;
  for (let index = 1; index <= samples; index++) {
    const t = index / samples;
    if (blocked(t)) {
      // Refine between the last clear sample and the first blocked one.
      let low = clear;
      let high = t;
      for (let pass = 0; pass < 5; pass++) {
        const mid = (low + high) / 2;
        if (blocked(mid)) high = mid; else low = mid;
      }
      return low;
    }
    clear = t;
  }
  return 1;
}
