import test from 'node:test';
import assert from 'node:assert/strict';
import reference from '../src/game/drive/neighborhood-source.json' with { type: 'json' };
import { NEIGHBORHOOD, NEIGHBORHOOD_REFERENCE_METRICS } from '../src/game/drive/neighborhood.ts';
import { ROUTE, NEIGHBORHOOD_ROUTE, lanePoseAt, pointAtDistance, routeLabelAt } from '../src/game/drive/route.ts';
import { DRIVE_JUNCTIONS, JUNCTION_CLOSURES } from '../src/game/drive/junctions.ts';

type Point = { x: number; z: number };
function distanceToPolyline(point: Point, line: readonly Point[]): number {
  let result = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]; const b = line[i]; const dx = b.x - a.x; const dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz)));
    result = Math.min(result, Math.hypot(point.x - a.x - dx * t, point.z - a.z - dz * t));
  }
  return result;
}

test('mapped home proportions retain measured metres and distinguish bulb centre from stem mouth', () => {
  // Independent audit measurements from the retained public latitude/longitude
  // evidence. Screenshot pixel ratios have no scale bar and do not justify zooming the world.
  const measured = NEIGHBORHOOD_REFERENCE_METRICS;
  assert.ok(Math.abs(measured.bulbCenterToJunction - 42.32) < .25);
  assert.ok(Math.abs(measured.stemMouthToJunction - 31.02) < .25);
  assert.ok(Math.abs(measured.greenIslandToWinston - 134.07) < .5);
  assert.ok(Math.abs(measured.winstonToNorthCarriageway - 235.12) < .5);
  assert.ok(Math.abs(measured.northCarriagewayToRoadCenter - 8.44985) < .01);
  assert.ok(Math.abs(measured.winstonToCombinedRoadCenter - 243.57) < .5);
  assert.ok(measured.greenIslandToWinston / measured.bulbCenterToJunction > 3);
  assert.ok(measured.greenIslandToWinston / measured.bulbCenterToJunction < 3.4);
  assert.ok(measured.winstonToNorthCarriageway / measured.bulbCenterToJunction > 5.2);
  assert.ok(measured.winstonToNorthCarriageway / measured.bulbCenterToJunction < 5.8);
  assert.equal(NEIGHBORHOOD.culdesac.radius, 10.5);
  assert.equal(ROUTE.sections[0].lanes * ROUTE.sections[0].laneWidth * 2, 7);
  assert.ok(ROUTE.sections[0].endS > 403 && ROUTE.sections[0].endS < 415);
  assert.ok(NEIGHBORHOOD.start.x > NEIGHBORHOOD.junctions[0].x && NEIGHBORHOOD.start.z > NEIGHBORHOOD.junctions[0].z,
    'Starpass bulb remains northeast of its Green Island junction');
  for (let s = 0; s < ROUTE.turns[0].approachS!; s += .25) {
    assert.ok(distanceToPolyline(pointAtDistance(s), [NEIGHBORHOOD.start, NEIGHBORHOOD.junctions[0]]) < .001,
      'Departure must be straight down the actual stem until the right turn');
  }
});

test('the combined Hypoluxo road is centred between its actual directional carriageways', () => {
  const { center, northCarriageway, southCarriageway } = NEIGHBORHOOD.hypoluxo;
  assert.ok(Math.abs(center.x - -137.81442) < .01 && Math.abs(center.z - -293.49961) < .01);
  assert.ok(Math.abs(northCarriageway.z - -285.05358) < .01);
  assert.ok(Math.abs(southCarriageway.z - -301.94564) < .01);
  assert.ok(Math.hypot(northCarriageway.x - center.x, northCarriageway.z - center.z) > 8.4);
  assert.ok(Math.hypot(northCarriageway.x - center.x, northCarriageway.z - center.z) < 8.5);
  assert.equal(NEIGHBORHOOD.junctions[2].x, center.x);
  assert.equal(NEIGHBORHOOD.junctions[2].z, center.z);
  const onHypoluxo = pointAtDistance(ROUTE.sections[1].startS + 100);
  assert.ok(Math.abs(onHypoluxo.z - center.z) < .001);
  assert.ok(Math.abs(NEIGHBORHOOD.centerlines.exitLanes.at(-1)!.z - northCarriageway.z) < .001,
    'Raw gate source endpoint stays on the north carriageway');
});

test('Winston Trails South display correction preserves raw source labels and stable route IDs', () => {
  const override = NEIGHBORHOOD.labelOverrides[0];
  assert.equal(override.displayName, 'Winston Trails South');
  assert.equal(override.sourceName, 'Green Island Terrace');
  for (const id of override.wayIds) assert.equal(reference.ways.find(way => way.id === id)?.name, 'Green Island Terrace');
  assert.match(override.authority, /Owner.*Google Maps/);
  assert.equal(routeLabelAt(240), 'Winston Trails South');
  assert.equal(NEIGHBORHOOD.junctions[1].to, 'Winston Trails South');
  assert.equal(NEIGHBORHOOD.junctions[2].from, 'Winston Trails South');
  assert.ok(DRIVE_JUNCTIONS.slice(1, 3).every(junction => junction.label.includes('Winston Trails South')));
  assert.equal(ROUTE.id, 'town-drive-v1');
  assert.deepEqual(ROUTE.checkpoints.map(checkpoint => checkpoint.id), ['home', 'leg-1', 'leg-2', 'leg-3', 'leg-4']);
  assert.deepEqual(ROUTE.turns.slice(0, 3).map(turn => turn.id), ['starpass-green-island', 'green-island-terrace', 'terrace-hypoluxo']);
  assert.equal(JUNCTION_CLOSURES.length, 11);
  assert.deepEqual(JUNCTION_CLOSURES.slice(0, 7).map(closure => closure.id), [
    'closure.green-island-terrace.north', 'closure.terrace-hypoluxo.east',
    'closure.hypoluxo-jog.straight', 'closure.hypoluxo-jog.opposite',
    'closure.jog-lantana.straight', 'closure.jog-lantana.opposite', 'closure.lantana-hagen.straight',
  ]);
});

test('collector and gate approach stay in the mapped drivable corridor instead of cutting across the split', () => {
  const source = [...NEIGHBORHOOD.centerlines.winstonSouth.slice(0, 6).reverse(), ...NEIGHBORHOOD.centerlines.exitLanes.slice(1)];
  const from = ROUTE.turns[1].exitS!; const to = ROUTE.turns[2].approachS!;
  for (let s = from; s < to; s += .25) {
    assert.ok(distanceToPolyline(pointAtDistance(s), source) < 1, `centreline leaves mapped corridor at ${s}`);
    // The minivan and its one-metre collision envelope fit the seven-metre road.
    assert.ok(distanceToPolyline(lanePoseAt(s), source) + 1 < 3.5, `driver footprint leaves mapped road at ${s}`);
  }
  const atGate = pointAtDistance(NEIGHBORHOOD_ROUTE.gateS);
  assert.ok(Math.hypot(atGate.x - NEIGHBORHOOD.gate.x, atGate.z - NEIGHBORHOOD.gate.z) < .001);
  assert.ok(NEIGHBORHOOD_ROUTE.gateS < ROUTE.turns[2].approachS!);
  assert.equal(ROUTE.turns[2].direction, 'right');
});

test('correcting the gate preserves the physical Green Island traffic bridge and shared court return', () => {
  const bridge = ROUTE.trafficBridge;
  assert.ok(Math.abs(bridge.length - 32.5916) < .01);
  assert.ok(Math.abs(bridge.points[0].x - -.79647) < .01);
  assert.ok(Math.abs(bridge.points.at(-1)!.x - -31.660) < .01);
  assert.equal(ROUTE.sections.at(-1)!.id, 'return');
  assert.equal(ROUTE.sections.at(-1)!.invented, true);
  const inbound = ROUTE.turns.find(turn => turn.id === 'return-starpass')!;
  const home = pointAtDistance(ROUTE.length);
  assert.equal(inbound.direction, 'right');
  assert.ok(Math.hypot(home.x - NEIGHBORHOOD.start.x, home.z - NEIGHBORHOOD.start.z) < .001);
  assert.equal(ROUTE.visibleRoadSpans.at(-1)!.toS, inbound.approachS);
});
