import reference from './neighborhood-source.json' with { type: 'json' };

export interface NeighborhoodPoint { x: number; z: number }
export interface NeighborhoodPose extends NeighborhoodPoint { yaw: number }
const latitudeMetres = 111132;
const longitudeMetres = 111320 * Math.cos(reference.origin.latitude * Math.PI / 180);
function mapped(id: number): NeighborhoodPoint[] {
  return reference.ways.find(way => way.id === id)!.points.map(([latitude, longitude]) => ({
    x: (longitude - reference.origin.longitude) * longitudeMetres,
    z: (latitude - reference.origin.latitude) * latitudeMetres,
  }));
}
const starpass = mapped(11227044);
const greenIsland = mapped(11205953);
const terrace = mapped(774605908);
const exitLanes = [...mapped(774605910), ...mapped(774612523).slice(1)];
const heading = (a: NeighborhoodPoint, b: NeighborhoodPoint) => Math.atan2(b.x - a.x, b.z - a.z);

/** Public street evidence is mapped at approximately 1:1 metres, x east/z north.
 * Building/driveway anchors are estimates: no parcel or roof survey is claimed.
 */
export const NEIGHBORHOOD = Object.freeze({
  attribution: '© OpenStreetMap contributors · ODbL',
  attributionUrl: reference.attributionUrl,
  sourceWayIds: reference.ways.map(way => way.id),
  culdesac: { x: 0, z: 0, radius: 10.5, outline: starpass.slice(1) },
  home: { x: 18, z: -15, yaw: Math.PI / 2, approximate: true,
    garage: { x: 18, z: -25, yaw: Math.PI / 2, width: 7, depth: 8,
      door: { x: 13.95, z: -25 } },
    driveway: { width: 6, points: [{ x: 13.95, z: -25 }, { x: -7.2, z: -23 }] } },
  start: { ...starpass[1], yaw: heading(starpass[1], starpass[0]) },
  gate: { ...exitLanes[2], yaw: heading(exitLanes[1], exitLanes[3]), approximate: true },
  junctions: [
    { id: 'starpass-green-island', ...starpass[0], from: 'Starpass Court', to: 'Green Island Boulevard', turn: 'right' as const },
    { id: 'green-island-terrace', ...greenIsland[0], from: 'Green Island Boulevard', to: 'Green Island Terrace', turn: 'left' as const },
    { id: 'terrace-hypoluxo', ...exitLanes.at(-1)!, from: 'Green Island Terrace', to: 'Hypoluxo Road', turn: 'right' as const },
  ],
  streets: [
    { id: 'starpass', label: 'Starpass Court', points: [starpass[1], starpass[0]] },
    { id: 'green-island', label: 'Green Island Boulevard', points: greenIsland },
    { id: 'terrace', label: 'Green Island Terrace', points: [...terrace].reverse() },
  ],
  // Untouched reference polylines are useful for context roads and authored turns.
  centerlines: { starpass, greenIsland, terrace, exitLanes },
  sceneryExclusions: [
    { x: 0, z: 0, radius: 52 },
    { x: exitLanes[2].x, z: exitLanes[2].z, radius: 24 },
  ],
});
