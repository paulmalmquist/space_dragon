# Neighborhood reference log

Owner direction, October 29, 2026: use a compact Winston Trails/Lake Worth setting, with the named stores/schools and a few restaurants; “feel free to log images from google maps.” See [the map plan](NEIGHBORHOOD_MAP.md) and [decision](../decisions/2026-10-29-neighborhood-map.md). Addresses below identify public landmarks, not the owner's home or personal travel records.

## Capture status

**Links logged; images NOT CAPTURED.** On October 29 the browser access host was unavailable. The native Chrome fallback stopped Computer Use because it could not verify the current browser URL. No further UI automation was attempted. A future session can capture the linked views when browser access is available.

Keep images in ignored `assets/reference/local/neighborhood/`, with their source URL, visible attribution/date, capture date and notes. Use a compact set of public exterior/map views that resolves shape, facade, signage, landscaping and relationships between entrances/parking/roads. The game uses authored geometry and materials; reference files stay outside runtime exports.

## Logged sources and intended views

Public addresses were checked against the linked official sources on October 29, 2026. Google Maps links are prepared search links, not a claim that their current map imagery was inspected. Restaurant inclusion is allowed; the three specific picks are agent proposals.

| ID | Place and verified source | Google Maps reference | Capture purpose | Status |
| --- | --- | --- | --- | --- |
| NR-01 | Winston Trails; [HOA](https://winstontrailshoa.com/), 5980 Winston Trails Blvd, Lake Worth (public community office) | [Map](https://www.google.com/maps/search/?api=1&query=Winston+Trails+Lake+Worth+Florida) | Public entrance character, neighborhood road rhythm, palms, water/golf-edge scenery. Home layout awaits the owner's video. | Pending |
| NR-02 | Wellington South Target; [official store](https://www.target.com/sl/wellington-south-store/2065), 5900 State Rd 7, Lake Worth | [Map](https://www.google.com/maps/search/?api=1&query=Target+5900+State+Rd+7+Lake+Worth+FL) | Facade massing/sign placement, entrance, parking rows and shopping-pocket silhouette. | Pending |
| NR-03 | Lake Worth II Home Depot; [official store](https://www.homedepot.com/l/Lake-Worth-II/FL/Lake-Worth/33467/6316), 5750 Jog Rd, Lake Worth | [Map](https://www.google.com/maps/search/?api=1&query=The+Home+Depot+5750+Jog+Rd+Lake+Worth+FL) | Large facade, garden-center outline and relationship to Lantana/Jog shopping plaza. | Pending |
| NR-04 | Lake Worth Christian; [official contact](https://www.lwcs.org/apps/pages/index.jsp?type=d&uREC_ID=577185), 7592 High Ridge Rd, Boynton Beach | [Map](https://www.google.com/maps/search/?api=1&query=Lake+Worth+Christian+School+7592+High+Ridge+Rd+Boynton+Beach+FL) | Public exterior silhouette, recognizable arrival/entry and landscaping. | Pending |
| NR-05 | Manatee Elementary; [official school information](https://mnes.palmbeachschools.org/school-information), 7001 Charleston Shores Blvd, Lake Worth | [Map](https://www.google.com/maps/search/?api=1&query=Manatee+Elementary+7001+Charleston+Shores+Blvd+Lake+Worth+FL) | Public exterior, entry identity and campus massing. | Pending |
| NR-06 | Chili's Lantana; [official location](https://www.chilis.com/locations/us/florida/greenacres/lantana), 5910 Jog Rd, Greenacres | [Map](https://www.google.com/maps/search/?api=1&query=Chilis+5910+Jog+Rd+Greenacres+FL) | Recognizable restaurant exterior for the Lantana/Jog pocket. | Proposed / pending |
| NR-07 | Chipotle; [official location](https://locations.chipotle.com/fl/lake-worth/6177-s-jog-rd), 6177 S Jog Rd, Lake Worth | [Map](https://www.google.com/maps/search/?api=1&query=Chipotle+6177+S+Jog+Rd+Lake+Worth+FL) | Smaller storefront, awning/sign proportions and plaza frontage. | Proposed / pending |
| NR-08 | Chick-fil-A Lake Worth South; [official Florida directory](https://www.chick-fil-a.com/locations/browse/fl), 6275 Lantana Rd, Greenacres | [Map](https://www.google.com/maps/search/?api=1&query=Chick-fil-A+6275+Lantana+Rd+Greenacres+FL) | Freestanding restaurant/drive-through shape and relationship to the shopping pocket. | Proposed / pending |
| NR-09 | Home surroundings and nearby lake; owner-supplied local anchor (SD-026) | Exact query kept in ignored `assets/reference/local/home/OWNER_LOCATION.md` | Surrounding residential street pattern, connection into Winston Trails, lake/shoreline relationship and local scenery. | Census/OSM vicinity reference collected locally; Google imagery pending |

NR-09 evidence: ignored `assets/reference/local/home/vicinity.html` and `vicinity.svg`, source JSON, `geodata-sources.json` and `GEODATA_NOTES.md`. The [US Census Geocoder](https://www.census.gov/data/developers/data-sets/Geocoding-services.html) supplied an approximate address-range point; the public OpenStreetMap map API supplied 366 road ways and 20 water ways after two Overpass endpoints timed out. The map carries [OpenStreetMap attribution](https://www.openstreetmap.org/copyright). Water candidates A–E are unnamed; A is closest to the approximate reference point, not a confirmed identification of the owner's intended lake. This bounded reference omits relation-based water multipolygons and may have incomplete coverage. It is not Google imagery, a surveyed property plan or game geometry.

For each collected image, append its local filename and one concrete modeling use here. Keep proposed in-game road connections labeled as compressed design choices rather than real-world directions. No screenshot or restaurant model is integrated into the current walking scene.
