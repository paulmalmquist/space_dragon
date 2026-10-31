# Car driving — Hypoluxo, Jog, Lantana, Hagen Ranch

**Purpose:** owner-provided driving video for town exterior environment reference in Space Dragon. Use it to study roads, intersections, roadside landscaping, infrastructure, materials, and lighting.

**Owner label:** Car driving — West on Hypoluxo, north on Jog, west on Lantana, south on Hagen Ranch. The route and directions are the owner's description; the sampled footage does not independently verify the complete route.

## Source and availability

- Original upload: `IMG_5754.mp4`, supplied October 30, 2026.
- Organized filename: `car-driving-west-hypoluxo-north-jog-west-lantana-south-hagen-ranch.mp4`.
- Saved source: the owner's `Space Dragon/Car driving/` folder in ChatGPT files.
- Recommended local authoring destination: `assets/reference/local/environments/car-driving/car-driving-west-hypoluxo-north-jog-west-lantana-south-hagen-ranch.mp4`.
- The reference notes and metadata are tracked in this repository. The original video is saved separately and is not distributed by this Git checkout. This note does not establish that a copy exists at the recommended local path.

An agent on another machine needs the owner’s saved video downloaded or attached before inspecting it. Verify its size and SHA-256 against the receipt below, preserve the source bytes, and use a separate directory for extracted frames or other derivatives. The existing root ignore rule covers `assets/reference/local/`.

## Intended use

Sampled frames show daytime driving through a windshield, with broad suburban roads, lane markings, signal-controlled intersections, roadside trees and hedges, utility poles and overhead wires, traffic, wet pavement, and a partly cloudy sky. These observations support visual reference work; they do not establish measured road geometry, a reconstructed map, or dimensions for unseen areas.

Use the visible features when designing a useful town exterior slice. The portrait framing includes the dashboard and rear-view mirror, which limit scene coverage. Keep estimates and invented connections explicit when extending beyond the footage.

Follow [the asset pipeline](../../../../docs/ASSET_PIPELINE.md) for reference, editable-source, and runtime destinations. Consult [Seele intake](../../../../seeles-assets/README.md) when a generated asset or export is actually available. This reference does not select a generation service or create a 3D environment.

The original intake treated source imagery as authoring-only. [SD-052](../../../../docs/decisions/2026-10-30-town-drive-detail-override.md) supersedes that Town Drive publication restriction: reference-derived runtime assets may be promoted without another privacy approval. Large videos and intermediate comparisons remain local for size/workflow reasons. Cloud-service uploads and purchases retain their separate boundaries.

## Intake receipt — SD-030

- Source size: **290,725,664 bytes**.
- SHA-256: `775b616e09569feedd8a390c5896cfba7bc5bd20d3a2c1d81b1004b2959a2bb1`.
- FFprobe metadata: **459.866667 seconds** (approximately 7 minutes 40 seconds), **512 × 910**, **30 fps**.
- **VERIFIED during prior source intake:** saved-source organization, file size, checksum, and video metadata. No current local authoring copy is claimed here.
- **REVIEWED:** sampled frames at **0:30, 2:30, 5:00, and 7:00** for broad subject and reference suitability. No identity inference, route verification, complete scene measurement, or reconstruction was performed.
- **Documentation checks:** `python3 tools/check_foundation.py` passed; all 94 relative links across the six changed Markdown files resolve; whitespace, final newlines, and the existing local-media ignore rule were checked. The commit contains documentation only.
- **NOT TESTED:** runtime import, Blender handoff, browser performance, or a Seele export. No runtime code changed.

Owner wording and routing are recorded in [the inbox](../../../../ideas/INBOX.md) and [idea ledger](../../../../docs/project/IDEA_LEDGER.md).


## October 30 phone-original follow-up — SD-046

The owner supplied higher-resolution `.MOV` originals in ignored `assets/reference/videos/`. They are separate sources from the older MP4 receipts above, with new hashes/metadata in local source receipts. The older MP4 authoring path is absent in this checkout. No source or derivative was promoted during the initial SD-046 capture stage; SD-052 now permits reference-derived runtime assets.

The [Town Drive decision](../../../../docs/decisions/2026-10-30-town-drive-lab.md) records the bounded lab and provenance-ID differences between branches. Timestamped observations, 5-second contact sheets, masks and CPU SfM evidence are in the corresponding `assets/reference/local/environments/` folder. [Verification](../../../../docs/reports/2026-10-30-town-drive-lab.md) distinguishes observed reference evidence from estimated geometry and human approval.
Next: review the local game/video comparison and tune road feel. Road SfM registered 2.5% of frames; use procedural roads with the observed right/left/left turn order and broad road character. Invented connectors and compressed distances are labeled; no real signs/logos are reproduced.


The owner removed the Town Drive privacy/publication rule in [SD-052](../../../../docs/decisions/2026-10-30-town-drive-detail-override.md). Reference-derived runtime assets are permitted without another approval gate.
