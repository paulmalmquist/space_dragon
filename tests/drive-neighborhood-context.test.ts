import { test } from 'node:test';
import assert from 'node:assert/strict';
import source from '../src/game/drive/neighborhood-context-source.json' with { type: 'json' };
import { NEIGHBORHOOD_CONTEXT, neighborhoodWaterContains, neighborhoodContextRoadContains,
  neighborhoodContextOwnsLand, projectNeighborhoodPoint, triangulateNeighborhoodPolygon } from '../src/game/drive/neighborhood-context.ts';
import type { ContextPoint, ContextLot } from '../src/game/drive/neighborhood-context.ts';
import { ROUTE, lanePoseAt } from '../src/game/drive/route.ts';
import { NEIGHBORHOOD } from '../src/game/drive/neighborhood.ts';
import { advanceTrafficS, trafficPose, trafficCollisionProxies, TRAFFIC_CIRCUIT_LENGTH } from '../src/game/drive/traffic.ts';
import type { TrafficVehicle } from '../src/game/drive/traffic.ts';

const cross = (a: ContextPoint, b: ContextPoint, c: ContextPoint) =>
  (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
const polygonArea = (points: readonly ContextPoint[]) => Math.abs(points.reduce((sum, a, i) => {
  const b = points[(i + 1) % points.length]; return sum + a.x * b.z - b.x * a.z;
}, 0)) / 2;
const triangleContains = (p: ContextPoint, a: ContextPoint, b: ContextPoint, c: ContextPoint) => {
  const signs = [cross(a, b, p), cross(b, c, p), cross(c, a, p)];
  return signs.every(value => value >= -1e-8) || signs.every(value => value <= 1e-8);
};
const localPoint = (pose: ContextPoint & { yaw: number }, x: number, z: number) => ({
  x: pose.x + Math.cos(pose.yaw) * x + Math.sin(pose.yaw) * z,
  z: pose.z - Math.sin(pose.yaw) * x + Math.cos(pose.yaw) * z,
});

test('context preserves source coordinate order and measured lake proportions while labeling estimates', () => {
  assert.equal(NEIGHBORHOOD_CONTEXT.waters.length, 4);
  assert.equal(source.roads.length, 25);
  assert.match(source.notes, /Road widths are author estimates/);
  assert.equal(NEIGHBORHOOD_CONTEXT.estimatedBuildings, true);
  for (const original of source.roads) {
    const projected = NEIGHBORHOOD_CONTEXT.roads.find(road => road.id === original.id)!;
    assert.deepEqual(projected.points, original.points.map(projectNeighborhoodPoint));
    assert.equal(projected.name, original.name);
  }
  for (const original of source.waters) {
    assert.deepEqual(original.points[0], original.points.at(-1));
    const projected = NEIGHBORHOOD_CONTEXT.waters.find(water => water.id === original.id)!;
    assert.deepEqual(projected.points, original.points.slice(0, -1).map(projectNeighborhoodPoint));
  }
  // Independent metre measurements from the source review catch silent rescaling.
  for (const [id, width, depth] of [[186588742, 225.3, 183.9], [187968475, 75.8, 170.2], [187968473, 110, 64.2]]) {
    const { bounds } = NEIGHBORHOOD_CONTEXT.waters.find(water => water.id === id)!;
    assert.ok(Math.abs(bounds.maxX - bounds.minX - width) < .1, `lake ${id} width`);
    assert.ok(Math.abs(bounds.maxZ - bounds.minZ - depth) < .1, `lake ${id} depth`);
  }
});

test('triangulation retains concave shore area and does not fill the dry court or missing bays', () => {
  for (const water of NEIGHBORHOOD_CONTEXT.waters) {
    const indices = triangulateNeighborhoodPolygon(water.points);
    assert.equal(indices.length, (water.points.length - 2) * 3);
    let trianglesArea = 0;
    for (let i = 0; i < indices.length; i += 3) {
      const [a, b, c] = indices.slice(i, i + 3).map(index => water.points[index]);
      assert.ok(cross(a, b, c) < 0, `lake ${water.id} has an inverted or degenerate triangle`);
      trianglesArea += Math.abs(cross(a, b, c)) / 2;
      assert.equal(triangleContains(NEIGHBORHOOD.culdesac, a, b, c), false, `lake ${water.id} covers the dry court`);
      assert.equal(triangleContains(NEIGHBORHOOD.home, a, b, c), false, `lake ${water.id} covers the home`);
    }
    assert.ok(Math.abs(trianglesArea - polygonArea(water.points)) < 1e-6, `lake ${water.id} lost its concave area`);
  }
  const bay = [{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 1 }, { x: 1, z: 1 }, { x: 1, z: 4 }, { x: 0, z: 4 }];
  for (const points of [bay, [...bay].reverse()]) {
    const indices = triangulateNeighborhoodPolygon(points); let area = 0;
    for (let i = 0; i < indices.length; i += 3) {
      const [a, b, c] = indices.slice(i, i + 3).map(index => points[index]);
      area += Math.abs(cross(a, b, c)) / 2;
      assert.equal(triangleContains({ x: 2, z: 2 }, a, b, c), false, 'the concave notch became water');
    }
    assert.equal(area, 7);
  }
});

test('mapped wet and dry landmarks match the owner map instead of broad rectangular water', () => {
  for (const [x, z] of [[80, 60], [-195, -75], [-215, -215]]) assert.equal(neighborhoodWaterContains(x, z), true);
  for (const [x, z] of [[0, 0], [18, -15], [-150, -90], [-65, -36]]) assert.equal(neighborhoodWaterContains(x, z), false);
  for (const point of [NEIGHBORHOOD.home, NEIGHBORHOOD.culdesac, NEIGHBORHOOD.gate]) {
    assert.equal(neighborhoodWaterContains(point.x, point.z, 2), false);
  }
});

test('the complete player loop and both directions of every NPC lane stay clear of mapped water', () => {
  for (let s = 0; s < ROUTE.length; s += 1) {
    const pose = lanePoseAt(s);
    assert.equal(neighborhoodWaterContains(pose.x, pose.z, 1.1), false, `player at route ${s}`);
    for (const x of [-1.1, 1.1]) for (const z of [-2.6, 2.6]) {
      const corner = localPoint(pose, x, z);
      assert.equal(neighborhoodWaterContains(corner.x, corner.z), false, `minivan body at route ${s}`);
    }
  }
  for (const direction of [1, -1] as const) for (const lane of [0, 1, 2]) {
    for (let metres = 0; metres < TRAFFIC_CIRCUIT_LENGTH; metres += 1) {
      const s = advanceTrafficS(ROUTE.trafficBridge.toS, metres);
      const vehicle: TrafficVehicle = { id: 'water-clearance', s, direction, lane, speed: 0, cruiseSpeed: 12, braking: false, kind: 'van', colorIndex: 0 };
      const pose = trafficPose(vehicle);
      for (const proxy of trafficCollisionProxies({ vehicles: [vehicle], elapsedSeconds: 0, accumulatorSeconds: 0 }, pose.x, pose.z, 1)) {
        assert.equal(neighborhoodWaterContains(proxy.x, proxy.z, proxy.radius), false, `NPC ${direction}/${lane} at ${s}`);
      }
      for (const x of [-1.2, 1.2]) for (const z of [-2.55, 2.55]) {
        const corner = localPoint(pose, x, z);
        assert.equal(neighborhoodWaterContains(corner.x, corner.z), false, `NPC body ${direction}/${lane} at ${s}`);
      }
    }
  }
});

// Conservative maximum compact roof envelope, including its overhang. This is a
// spatial acceptance bound, not a duplicate of seeded individual building sizes.
const halfWidth = 8.8, halfDepth = 7.05;
function roofOverlap(a: ContextLot, b: ContextLot): boolean {
  const axes = (pose: ContextLot) => [{ x: Math.cos(pose.yaw), z: -Math.sin(pose.yaw) }, { x: Math.sin(pose.yaw), z: Math.cos(pose.yaw) }];
  const aa = axes(a), ba = axes(b), dot = (p: ContextPoint, q: ContextPoint) => p.x * q.x + p.z * q.z;
  return [...aa, ...ba].every(axis => {
    const distance = Math.abs((a.x - b.x) * axis.x + (a.z - b.z) * axis.z);
    const extent = (basis: ContextPoint[]) => halfWidth * Math.abs(dot(basis[0], axis)) + halfDepth * Math.abs(dot(basis[1], axis));
    return distance < extent(aa) + extent(ba);
  });
}

test('estimated compact lots keep their roof footprints on dry banks and off streets without overlapping', () => {
  const lots = NEIGHBORHOOD_CONTEXT.lots;
  assert.ok(lots.length > 40, 'mapped neighborhood lost its residential context');
  for (const [index, lot] of lots.entries()) {
    assert.equal(lot.estimated, true); assert.equal(lot.compact, true);
    assert.equal(neighborhoodContextOwnsLand(lot.x, lot.z), true);
    for (let x = -halfWidth; x <= halfWidth + .001; x += 2.2) for (let z = -halfDepth; z <= halfDepth + .001; z += 2.35) {
      const point = localPoint(lot, x, z);
      assert.equal(neighborhoodWaterContains(point.x, point.z, 2), false, `roof ${lot.seed} reaches a lake bank`);
      assert.equal(neighborhoodContextRoadContains(point.x, point.z, .4), false, `roof ${lot.seed} reaches a street`);
    }
    for (const other of lots.slice(index + 1)) assert.equal(roofOverlap(lot, other), false, `roofs ${lot.seed}/${other.seed} overlap`);
  }
});
