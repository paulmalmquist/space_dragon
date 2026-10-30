# Decision — Town Drive Lab

Recorded October 30, 2026 · **SD-046**. CONFIRMED: build a drivable environment using the supplied house and drive videos. The lab structure, fictional connectors, car, handling, distances and reference interpretation are **PROPOSED implementation choices**, not new story canon.

## Scope and evidence

The owner's attached Town Drive Lab task authorizes local analysis, a bounded reconstruction spike, implementation, checks and a review PR. Their supplied paths point to two phone originals, rather than the older compressed MP4s. Both originals are intact, 1080 × 1920 after rotation, 30 fps; hashes and full source receipts stay local. Public provenance documents retain the older source receipts separately.

CPU structure-from-motion registered only **16/50 house frames (32%)** and **2/80 road frames (2.5%)**. The house's largest sparse model has 3,638 points; the road's has 33. These fragmented results are a **NO-GO for runtime reconstruction in this increment**. The majority-registration condition for Gaussian training was not met. Sparse points are evidence, not meshes, collision or a usable reconstruction. Details and source citations are in the [verification receipt](../reports/2026-10-30-town-drive-lab.md); private inputs/models remain local.

Use an editable Babylon blockout for the actual deliverable. Keep any future splat a visual-only layer over clean collision. Revisit house reconstruction after a slower, overlapping clip of one room/doorway or a better local solve; revisit road reconstruction only for path/landmark evidence, not a promise of freely drivable geometry.

## Implementation choice

- A separate `/space-dragon/drive/` Vite entry owns one Babylon scene and input/render loop. The existing home entry and First Contact flow are retained. The link opens the lab through full-page navigation.
- Pure fixed 60 Hz car state is separate from rendering. Semantic keyboard/standard-controller inputs, bounded catch-up, focus/pause release, analog trigger/stick values, no Ctrl binding, 25 m/s normal and 15 m/s assist caps. Handling is in one config and F2 edits session values while paused. Assist is independent of learners and avatars.
- The fictional 4,669.4 m loop has an invented neighborhood connector, four reference-inspired legs in west/north/west/south order, right/left/left main turns and an invented return connector. A 20 m/s simulated driver completes it in about 239 seconds. The `.55` distance factor is an **ESTIMATED design assumption**, not a measured geographical conversion. Video waiting time is omitted. The short fourth video leg is extrapolated for playability; the route is not a map or survey.
- Nearby 100 m road chunks are built and unloaded; repeated props use thin instances, distant storefront trim has LOD, and the scene uses procedural surfaces without sampled video textures. Cross-sections, medians, palms, screening walls, utility rhythm and signal shapes follow broad observations. No real street/address/business text appears in the game.
- The provisional car has no canonical driver/model identity. No walking, Act I mission, traffic penalties, damage, game over, multiplayer or backend is added. P1 cosmetic traffic/cycling lights and house splats remain outside this P0.
- Chase, dashboard and debug orbit cameras observe car state. Big arrows, a route minimap, speed readout and optional synthesized chime provide guidance. No reading challenge is attached to driving.
- Ordered leg checkpoints and an idempotent home-completion flag live in state. `space-dragon.drive.v1` has its own validated backup/future-version protections; Earth/learning saves are untouched. R recovers to the last checkpoint without erasing progress.

## Privacy boundary

Originals, contact sheets, masked SfM inputs, sparse models, route observations, comparisons and the real house-derived JSON remain under ignored local folders. `assets/reference/videos/` is now explicitly ignored. Originals are never rewritten or uploaded. No cloud service, purchase or deployment was used.

The tracked house schema ships a **fictional** layout. On the loopback development server only, a fixed-path middleware can return `assets/reference/local/environments/house-interior/house-layout.json`; it rejects foreign origins/hosts and is disabled in isolated tests. No arbitrary path is accepted. Production compilation removes the loader and uses the fictional layout. Reference frames are never requested by game code. The two-level walkthrough and unseen room details are recorded in the private notes; the P0 local dollhouse deliberately covers an estimated downstairs subset, not a measured complete floor plan.

Committing the real house-derived layout/geometry remains **OPEN** and requires the owner's explicit answer. The current review PR contains only the fictional schema/data and procedural kit. The local reference-compare script writes a new ignored HTML sheet, dashboard captures and links to nearest local frames. Matching times/distances are estimates and invented connectors have no footage counterpart.

## Branch reconciliation and source authority

This task began at `3b615b2` on `feat/first-contact-playable`, with substantial uncommitted Dogfight work through local SD-045. `origin/main@96002d7` separately contains the video receipts and controller adapter. Its SD-029/030 mean house/drive references and SD-038 means PlayStation; those IDs have different established meanings on this branch. Preserve those numbers as **incoming provenance**, and use SD-046 for this work. Do not silently reassign existing local entries or merge unrelated story revisions.

The existing controller adapter was recovered from that remote head and extended with a separate drive sample. Its story API is preserved. The source READMEs and controller decision are recovered documents, not evidence that the older MP4s are present here. The requested PR is stacked on `feat/first-contact-playable`; unrelated uncommitted work stays outside its commit. Broader main/story/ID reconciliation belongs to the existing parent PR.

## Recovery

Revert the Town Drive commit to remove its entry/link, drive source, dev middleware and scoped documentation. Keep the private originals and all prior Earth/Dogfight work. Deleting only the drive save keys resets this lab; ordinary R does not. If a private layout is missing/invalid, the fictional fallback remains playable. No public asset promotion or real-layout publication is implied by technical checks.
