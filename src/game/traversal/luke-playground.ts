import type { Anchor, Solid, SparkSpot, TraversalWorld } from './world.ts';
import { HOME_BLOCK } from './home-block.ts';

/**
 * Luke's Playground: the practice home block plus a backyard playset. The story has Luke
 * climb the playset's slide tower; here it is a generic climbing frame, not a real yard.
 * The Unity scene is generated from this world. The browser slice keeps the plain block.
 *
 * Everything sits in the south strip of the back yard, clear of the patio, the pod, the
 * gate line to the dock and the yard palm.
 */
export const PLAYSET = Object.freeze({
  /** Cleated climbing ramp rising east to the tower deck. */
  ramp: Object.freeze({ minX: 0.5, maxX: 2.7, minZ: -4.7, maxZ: -3.3 }),
  deck: Object.freeze({ minX: 2.7, maxX: 4.3, minZ: -4.8, maxZ: -3.2, top: 1.6, thickness: 0.14 }),
  /** Slide running east from the deck to the grass. */
  slide: Object.freeze({ minX: 4.3, maxX: 7.2, minZ: -4.45, maxZ: -3.55, foot: 0.12 }),
  /** Monkey bars: a ladder laid flat that the hero can run along or walk beneath. */
  bars: Object.freeze({ minX: 4.9, maxX: 8.3, minZ: -2.65, maxZ: -1.95, top: 2.5, thickness: 0.14 }),
  /** Flag mast above the deck: a perch anchor that sets the hero down on the tower. */
  mast: Object.freeze({ x: 3.5, z: -4, height: 5.2 }),
  /** Drawn only; shallow enough to walk through. */
  sandbox: Object.freeze({ minX: 0.5, maxX: 2.3, minZ: -2.9, maxZ: -1.9, height: 0.16 }),
});

const solid = (value: Solid): Solid => Object.freeze(value);
const PLAYSET_SOLIDS: readonly Solid[] = Object.freeze([
  solid({ id: 'playset-ramp', kind: 'deck', ...PLAYSET.ramp, minY: -0.2, maxY: PLAYSET.deck.top, slope: { axis: 'x', atMin: 0, atMax: PLAYSET.deck.top } }),
  solid({ id: 'playset-deck', kind: 'deck', minX: PLAYSET.deck.minX, maxX: PLAYSET.deck.maxX, minZ: PLAYSET.deck.minZ, maxZ: PLAYSET.deck.maxZ,
    minY: PLAYSET.deck.top - PLAYSET.deck.thickness, maxY: PLAYSET.deck.top }),
  solid({ id: 'playset-slide', kind: 'deck', minX: PLAYSET.slide.minX, maxX: PLAYSET.slide.maxX, minZ: PLAYSET.slide.minZ, maxZ: PLAYSET.slide.maxZ,
    minY: -0.2, maxY: PLAYSET.deck.top, slope: { axis: 'x', atMin: PLAYSET.deck.top, atMax: PLAYSET.slide.foot } }),
  solid({ id: 'playset-bars', kind: 'deck', minX: PLAYSET.bars.minX, maxX: PLAYSET.bars.maxX, minZ: PLAYSET.bars.minZ, maxZ: PLAYSET.bars.maxZ,
    minY: PLAYSET.bars.top - PLAYSET.bars.thickness, maxY: PLAYSET.bars.top }),
]);

const PLAYSET_ANCHORS: readonly Anchor[] = Object.freeze([
  Object.freeze({ id: 'playset-mast', x: PLAYSET.mast.x, y: PLAYSET.mast.height, z: PLAYSET.mast.z, floor: PLAYSET.deck.top, perch: true }),
]);

/** Two more practice sparks: one on the tower, one above the monkey bars. */
export const PLAYSET_SPARKS: readonly SparkSpot[] = Object.freeze([
  Object.freeze({ id: 'spark-13', x: 3.5, y: 2.75, z: -4 }),
  Object.freeze({ id: 'spark-14', x: 6.6, y: 3.7, z: -2.3 }),
]);

export const LUKE_PLAYGROUND: TraversalWorld = Object.freeze({
  ...HOME_BLOCK,
  id: 'luke-playground-v001',
  solids: Object.freeze([...HOME_BLOCK.solids, ...PLAYSET_SOLIDS]),
  anchors: Object.freeze([...HOME_BLOCK.anchors, ...PLAYSET_ANCHORS]),
  sparks: Object.freeze([...HOME_BLOCK.sparks, ...PLAYSET_SPARKS]),
});
