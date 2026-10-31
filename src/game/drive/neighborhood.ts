import reference from './neighborhood-source.json' with { type: 'json' };
import contextReference from './neighborhood-context-source.json' with { type: 'json' };

export interface NeighborhoodPoint { x: number; z: number }
export interface NeighborhoodPose extends NeighborhoodPoint { yaw: number }
const latitudeMetres = 111132;
const longitudeMetres = 111320 * Math.cos(reference.origin.latitude * Math.PI / 180);
const projected = ([latitude, longitude]: readonly number[]): NeighborhoodPoint => ({
  x: (longitude - reference.origin.longitude) * longitudeMetres,
  z: (latitude - reference.origin.latitude) * latitudeMetres,
});
function mapped(id: number): NeighborhoodPoint[] {
  return reference.ways.find(way => way.id === id)!.points.map(projected);
}
const starpass = mapped(11227044);
const greenIsland = mapped(11205953);
const winstonSouth = mapped(774605908);
const exitLanes = [...mapped(774605910), ...mapped(774612523).slice(1)];
const heading = (a: NeighborhoodPoint, b: NeighborhoodPoint) => Math.atan2(b.x - a.x, b.z - a.z);
const length = (points: readonly NeighborhoodPoint[]) => points.slice(1).reduce((sum, point, i) =>
  sum + Math.hypot(point.x - points[i].x, point.z - points[i].z), 0);
const crossSection = contextReference.arterialCrossSection;
const northCarriageway = projected(crossSection.northCarriageway.point);
const southCarriageway = projected(crossSection.southCarriageway.point);
const hypoluxoCenter = { x: (northCarriageway.x + southCarriageway.x) / 2, z: (northCarriageway.z + southCarriageway.z) / 2 };
const halfCarriagewaySeparation = length([northCarriageway, hypoluxoCenter]);

/** Preserve the source spelling in neighborhood-source.json. The owner-supplied
 * Google Maps screenshots correct the displayed collector name, not its scale.
 * Legacy terrace IDs remain stable for existing route/junction integrations.
 */
export const NEIGHBORHOOD_LABEL_OVERRIDES = Object.freeze([{
  wayIds: [774605908, 774605910, 774612523], sourceName: 'Green Island Terrace',
  displayName: 'Winston Trails South', authority: 'Owner correction and supplied Google Maps screenshots, 2026-10-31',
}]);
export const NEIGHBORHOOD_REFERENCE_METRICS = Object.freeze({
  bulbCenterToJunction: Math.hypot(starpass[0].x, starpass[0].z),
  stemMouthToJunction: length([starpass[1], starpass[0]]),
  greenIslandToWinston: length(greenIsland.slice(0, 7)),
  winstonToNorthCarriageway: length(winstonSouth.slice(0, 6)) + length(exitLanes),
  northCarriagewayToRoadCenter: halfCarriagewaySeparation,
  winstonToCombinedRoadCenter: length(winstonSouth.slice(0, 6)) + length(exitLanes) + halfCarriagewaySeparation,
});

/** Public street evidence is mapped at approximately 1:1 metres, x east/z north.
 * Building/driveway anchors are estimates: no parcel or roof survey is claimed.
 */
export const NEIGHBORHOOD = Object.freeze({
  attribution: '© OpenStreetMap contributors · ODbL',
  attributionUrl: reference.attributionUrl,
  sourceWayIds: reference.ways.map(way => way.id),
  labelOverrides: NEIGHBORHOOD_LABEL_OVERRIDES,
  referenceMetrics: NEIGHBORHOOD_REFERENCE_METRICS,
  // The gate way ends at the westbound carriageway, not the middle of the
  // entire divided road. Lane/curb widths remain explicit authored estimates.
  hypoluxo: { center: hypoluxoCenter, northCarriageway, southCarriageway,
    sourceNodeIds: [crossSection.northCarriageway.nodeId, crossSection.southCarriageway.nodeId],
    connectorWayId: crossSection.connectorWayId },
  culdesac: { x: 0, z: 0, radius: 10.5, outline: starpass.slice(1) },
  home: { x: 18, z: -15, yaw: Math.PI / 2, approximate: true,
    garage: { x: 18, z: -25, yaw: Math.PI / 2, width: 7, depth: 8,
      door: { x: 13.95, z: -25 } },
    driveway: { width: 6, points: [{ x: 13.95, z: -25 }, { x: -7.2, z: -23 }] } },
  start: { ...starpass[1], yaw: heading(starpass[1], starpass[0]) },
  gate: { ...exitLanes[2], yaw: heading(exitLanes[1], exitLanes[3]), approximate: true },
  junctions: [
    { id: 'starpass-green-island', ...starpass[0], from: 'Starpass Court', to: 'Green Island Boulevard', turn: 'right' as const },
    { id: 'green-island-terrace', ...greenIsland[0], from: 'Green Island Boulevard', to: 'Winston Trails South', turn: 'left' as const },
    { id: 'terrace-hypoluxo', ...hypoluxoCenter, from: 'Winston Trails South', to: 'Hypoluxo Road', turn: 'right' as const },
  ],
  streets: [
    { id: 'starpass', label: 'Starpass Court', points: [starpass[1], starpass[0]] },
    { id: 'green-island', label: 'Green Island Boulevard', points: greenIsland },
    { id: 'terrace', label: 'Winston Trails South', points: [...winstonSouth].reverse() },
  ],
  // Untouched reference polylines are useful for context roads and authored turns.
  centerlines: { starpass, greenIsland, winstonSouth, terrace: winstonSouth, exitLanes },
  sceneryExclusions: [
    { x: 0, z: 0, radius: 52 },
    { x: exitLanes[2].x, z: exitLanes[2].z, radius: 24 },
  ],
});
