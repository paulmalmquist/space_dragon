# Town Drive map proportions — source review, October 31, 2026

SD-064 source review. The owner's three attached Google Maps views (one wide view and two copies of the same compact view) are primary visual evidence for the requested route and its surrounding land/water relationships. The owner specifies: straight out of the cul-de-sac, right on Green Island, left on Winston Trails, then the Hypoluxo gate. The existing Google Maps web link remained inaccessible to the web tool; no live Google imagery inspection or new browser capture is claimed.

## Route and naming correction

The attached maps label the north/south collector **Winston Trails S**. It meets **Winston Trails Boulevard** at its northern fork and **Hypoluxo Road** at its southern gate. Green Island Boulevard joins from the east between those points. **Starpass Court** is the short cul-de-sac north of Green Island Boulevard, east of Winston Trails S; the owner's home marker is east and slightly south of the bulb. The separate, longer cul-de-sac northwest of Starpass is not the owner's court.

Current OSM ways `774605908`, `774605910`, `774612523`, `774605911` and `774612524` still carry the name “Green Island Terrace.” That conflicts with the supplied Google Maps labeling and owner route description. Use **Winston Trails S** for the game route, gate and collector signs, retaining the OSM IDs and original names in source provenance. This supersedes the collector label in the earlier SD-058/063 source interpretation. The separate western spur `11218716` is also called Green Island Terrace in OSM; it is a distinct road and is not evidence that the collector should retain that name.

## Proportions

The geographic coordinates use the existing local projection: origin 26.575091, -80.133194; X east and Z north; longitude multiplied by `111320 × cos(origin latitude)` and latitude by `111132`. Values below are measurements of this community map, not a survey or a measured roadway-edge model.

| Feature | Source measurement | Visual implication |
| --- | --- | --- |
| Starpass bulb center to Green Island junction | 42.317 m | Short stem; it should not feel like a long residential block. |
| Starpass stem, excluding bulb | 31.015 m | The first OSM segment ends at the south side of the bulb, not its center. |
| Green Island, Starpass junction to Winston junction | 134.071 m | A gently curved westbound run, roughly three times bulb-center-to-junction distance. |
| Winston south run before gate split | 150.368 m | Main north/south collector remains substantially longer than Starpass. |
| Gate lane approach to north Hypoluxo carriageway | 84.753 m | Includes the separated entry/exit approach, not an invented extra bend. |
| Existing raw outbound route from bulb mouth | 400.207 m | Overall scale is broadly consistent with the owner's map. A global stretch/shrink is not supported. |

The wide screenshot visually gives approximately a 1:3:5 relationship for bulb-center-to-Green-Island, Green-Island-to-Winston, and Winston-to-Hypoluxo. The mapped values give approximately **1:3.17:5.56**. These image ratios are coarse because the supplied screenshots have no scale bar; they are corroboration, not calibration.

The previous route's custom gate cubic skipped some mapped collector/exit points. Reusing those source points and smoothing their tangents locally is better supported than globally rescaling the neighborhood. The gate has separate carriageways about 11 m apart near the split: west outbound ways `774605910` + `774612523`, east inbound ways `774612524` + `774605911`. Road widths and the exact guardhouse/barrier position remain authored estimates.

### Divided Hypoluxo cross-section at the gate

The same API response supplies connector way `11218720` between two distinct Hypoluxo carriageway nodes. Gate inbound/outbound ways both meet the **north** node; that point is not the center of the whole divided road.

| Position | Exact source | Latitude, longitude | Local X, Z (m) |
| --- | --- | --- | --- |
| North/westbound carriageway center | Node `99722733`, Hypoluxo ways `82790074` and `774605909`, three lanes | 26.572526, -80.1345757 | -137.5605, -285.0536 |
| South/eastbound carriageway center | Node `2613091820`, Hypoluxo way `1184211810`, three lanes | 26.572374, -80.1345808 | -138.0683, -301.9456 |
| Derived cross-section midpoint | Arithmetic midpoint of those nodes | 26.57245, -80.13457825 | -137.8144, -293.4996 |

The centerline separation is **16.8997 m**, half separation **8.4498 m** in the existing local projection. This supports centering the combined divided-road representation roughly 8.45 m south of the north carriageway node. It does not independently specify median, shoulder, curb or individual lane widths. The compact JSON records these exact nodes, way IDs, source lane counts and derived values in `arterialCrossSection`.

## Surrounding world

The largest recognizability gap is context, not the measured 400 m route length. The supplied Google views show an irregular lake immediately north/northeast/east of the home, two elongated ponds west of Winston Trails S, a green/golf belt beyond those ponds, and closely spaced residential streets east and south of the collector. Empty fields or generic roadside shops in those locations would contradict the supplied view.

| OSM water way | Descriptive identifier, not an official name | Local bounds (m) | Approximate mapped area |
| --- | --- | --- | --- |
| `186588742` | Home neighborhood lake | X -68 to 157; Z -46 to 138 | 14,575 m²; 225.3 × 183.9 m overall |
| `187968475` | West Winston north pond | X -236 to -160; Z -170 to 0 | 7,101 m²; 75.8 × 170.2 m overall |
| `187968473` | West Winston south pond | X -273 to -163; Z -245 to -181 | 5,450 m²; 110.0 × 64.2 m overall |
| `186588755` | Northeast neighborhood lake | X 91 to 261; Z 96 to 616 | 24,724 m²; optional farther context |

The southern street grid includes Green Island Drive, Perdido Bay Terrace, Desert Inn Terrace, Turtle Bay Terrace and Silverado Terrace. The northern context includes the Winston Trails Boulevard fork, Green Island Circle, Eagle Trace Court and the continued Green Island Boulevard around the lake. The home marker supplies a relative placement check, but no parcel boundary or house-footprint measurement; the current house/driveway remains estimated.

## Source artifact and limits

[The compact source artifact](../../src/game/drive/neighborhood-context-source.json) preserves exact, untrimmed public node coordinates for 25 selected road ways and four closed lake outlines. Rendering bounds are separate: core X -320 to 350, Z -320 to 220. Width estimates, descriptive water labels and the owner-authorized Winston display-name override are explicitly marked. Main route centerlines remain in `neighborhood-source.json`. Full-source geometry is retained so culling does not silently distort the outlines.

Source: [official OSM map API response](https://api.openstreetmap.org/api/0.6/map?bbox=-80.138,26.5718,-80.130,26.578), fetched **2026-10-31 14:50:50 UTC**, 824,244 bytes. Raw XML was retained locally under ignored `artifacts/sd064-osm-context.xml`; the compact JSON contains only relevant road/water geometry and provenance, not unrelated address/contact tags. Attribution: **© OpenStreetMap contributors**, [ODbL](https://www.openstreetmap.org/copyright).

Source review establishes map relationships and approximate lengths. It does not establish owner road recognition, driving comfort, measured parcel/road-edge accuracy, or final runtime rendering. Those need the implementation's own checks and visual evidence.
