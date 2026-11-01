# Town Drive junction source review — October 31, 2026

Read-only source review for SD-084. OpenStreetMap road-centerline connections support the topology below; they are community mapping, not a survey of curbs, lane widths or property boundaries. The runtime compresses the arterial loop and invents its return connector. The proposed police vehicles and barricades are fictional gameplay boundaries, not a claim that these public roads are actually closed.

## Mapped home approach

The existing source is `src/game/drive/neighborhood-source.json`, supplemented by the previously captured local `assets/reference/local/home/geodata-osm.json`. Both derive from the [bounded OSM map response](https://api.openstreetmap.org/api/0.6/map?bbox=-80.142,26.567,-80.124,26.583), captured October 30, 2026 at approximately 00:50:23 UTC. The broader local response contains Hypoluxo carriageways omitted from the smaller runtime reference.

| Junction | Mapped connection, latitude/longitude | Source ways and topology | Unused arm in this game |
| --- | --- | --- | --- |
| Starpass Court / Green Island Boulevard | 26.574742, -80.133364 | Starpass `11227044` joins Green Island `11205953`: a T with the court stem to the north and Green Island continuing east/west. | **None.** The player exits west and returns from the east into the court. NPCs travel east/west across the separate Green Island bridge. All three arms must remain open. |
| Green Island Boulevard / Green Island Terrace | 26.574599, -80.134677 | Green Island `11205953` ends at through Terrace `774605908`: a T with an eastern Green Island arm and northern/southern Terrace arms. | Northern Terrace continuation. Keep the east-to-south player turn and its reverse NPC path open. |
| Green Island Terrace / Hypoluxo Road | North carriageway: 26.572526, -80.1345757. South carriageway: 26.572374, -80.1345808. | Terrace exit `774612523` meets westbound Hypoluxo `82790074` / `774605909`. Connector `11218720` reaches eastbound Hypoluxo `1184211810` approximately 17 m south. This is a functional T onto a divided east/west arterial; the median connector is not a fourth neighborhood street extending south. | Eastern Hypoluxo continuation. Keep the north/west turn, reverse NPC movement and their full carriageway turning envelope open. |

## Current arterial corroboration

Three small official OSM API reads on October 31 independently corroborate the arterial topology. Coordinates identify mapped connections, not exact rendered junction centers. Each pair of one-way carriageways belongs to the same named road.

| Junction | Mapped connection, latitude/longitude | Ways demonstrating the approaches | Topology and unused arms |
| --- | --- | --- | --- |
| Hypoluxo Road / Jog Road | 26.5726877, -80.1460128 and 26.5725323, -80.1460223 | Hypoluxo west: `82790090`, `255634415`; east: `408054527`, `1184211812`. Jog continues north/south on `682328908` and `1413175165`. | **Four-way.** Player uses east → north; reverse NPCs use north → east. West and south are unused by the retained loop. |
| Jog Road / Lantana Road | 26.5897417, -80.1473336 and 26.5895657, -80.1474832 | Jog south: `219363112`, `1152922208`; north: `958803393`, `1384230477`. Lantana east: `134602666`, `534819596`; west: `682328906`, `682328907`. | **Four-way.** Player uses south → west; reverse NPCs use west → south. North and east are unused. |
| Lantana Road / Hagen Ranch Road | 26.5900546, -80.1584992 | Hagen `1150213657` and `1150213658` both terminate at Lantana from the south. Lantana continues east on `682328907` and west on `1306077971`; its opposite carriageway is `682328906`. | **T.** No northward Hagen Ranch arm is present in this map response. Player uses east → south; reverse NPCs use south → east. Only west is unused; do not invent a northern street. |

Exact read sources and retrieval times:

- [Hypoluxo / Jog map response](https://api.openstreetmap.org/api/0.6/map?bbox=-80.147,26.5718,-80.145,26.5735), 2026-10-31 14:12:47 UTC.
- [Jog / Lantana map response](https://api.openstreetmap.org/api/0.6/map?bbox=-80.1475,26.5865,-80.1445,26.5900), 2026-10-31 14:13:10 UTC.
- [Lantana / Hagen Ranch map response](https://api.openstreetmap.org/api/0.6/map?bbox=-80.1610,26.5893,-80.1577,26.5907), 2026-10-31 14:13:27 UTC.

The API responses were inspected in memory; no raw response or runtime geometry was written during this review. Source attribution is **© OpenStreetMap contributors**, under [ODbL](https://www.openstreetmap.org/copyright). These reads establish named-road connectivity only; Google Maps imagery and a physical site survey were not used in this review.

## Implementation and verification limits

Place closures beyond the active junction pavement and both directions' swept vehicle paths. A closure must not obstruct the player lane, the opposite NPC lane, the mapped home return or the Green Island NPC bridge. Keep collision proxies aligned with the visible barricades; do not repeat the earlier hidden tree collision at the shared home junction.

Invented return bends are not evidence of additional real intersections. Do not add a fourth arm to a mapped T merely to put a barricade there. Road-arm lengths, compressed positions and decorative police placement remain authored choices. This source review does not establish runtime visual correctness, vehicle clearance or completion of the final driving tests; those belong in the implementation verification receipt.
