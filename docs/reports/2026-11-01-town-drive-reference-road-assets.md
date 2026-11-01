# Town Drive reference road paint and Blender assets â€” November 1, 2026

## Scope and baseline

[Owner direction](../decisions/2026-11-01-town-drive-reference-road-assets.md), continuing SD-052/074 after PR #33. Review branch `feat/town-drive-reference-v004`, main baseline `cda0c2d261c57920f87b86c68e07022d2f2917a6`. Existing Unity project remains `C:/Projects/space_dragon/unity/SpaceDragon`; the other channel's shared Blender scene remains untouched. New plants are authored in an isolated Blender process with versioned sources.

This increment corrects the road-paint presentation and integrates three reference-informed Blender plant families. It does not redraw the authoritative route or claim a surveyed neighborhood reconstruction. The v003 player is frozen under `artifacts/unity-town-drive-art-v004/before/player`; its data SHA is `eefd9c12b2ff38ef9f62afac5f92bd5aba78f290b81f2ab99217cf370437bd06`.

## Reference inspection

Both supplied movies were probed locally. IMG_5753 is a 99.836667-second house/interior/backyard reference; IMG_5754 is the 459.861667-second drive. Timeline samples cover both entire durations, with denser five-second extraction on the outbound neighborhood and full-resolution review of key markings and vegetation. This is sampled frame analysis, not a claim that every frame was watched continuously. Source movies and extracted boards remain outside game assets.

- IMG_5753 SHA256: `7d51cd29d27ad7e1be8d12930b12a2a8797364f984561a8fd4f0ecbe0662e75e`.
- IMG_5754 SHA256: `e71ecd70c1c6591a607d1c99960a2e0a4aa3e3d79174fa16e6e69b1222e064b0`.
- Both are coded 1920Ã—1080 with -90Â° rotation, displayed 1080Ã—1920. ffmpeg 9.0.1; complete extraction receipt and sheets under `artifacts/unity-town-drive-art-v004/reference` in the live root.

## Markings: observed evidence and confidence

| Reference time | What is visible | Implementation implication | Confidence/location boundary |
| --- | --- | --- | --- |
| 00:10â€“00:20 | Residential house fronts, driveways, smooth curb/gutter, a stop control, and visible road with no continuous yellow or white edge marking. The 00:15 navigation display says Green Island Blvd 150 ft. | Remove the universal double-yellow and white roadside painting from the court/ordinary residential section. Retain separate stop control as warranted. | High for the visible pavement; court identity follows owner route and navigation. The filmed view does not establish every meter of the cul-de-sac. |
| 00:25â€“00:30 | The immediate residential/collector approach remains largely bare asphalt. Image focus is soft. | Do not extrapolate highway lane paint along the whole collector. | Medium; use the clearer next frame for junction-specific rules. |
| **00:35** | A small planted splitter island at the next stop-controlled junction; a short **double-yellow taper** runs into its tip. Pavement around it is wet and otherwise largely unmarked. Both feather and fan palm crowns are visible. | Preserve/add localized approach paint at the Green Islandâ€“Winston Trails junction. **Do not remove every yellow marking just because the court is unmarked.** | High visual confidence. Junction association follows owner path and 00:45/00:50 navigation. |
| 00:50â€“01:05 | Yellow guide/center paint begins after the turn, becoming clear double yellow at the gate approach. Narrow island, white perimeter fence, barrier booms, posts and small control housing. | Retain smooth connected yellow paint on the actual gate approach. Maintain consistent line width and an ordinary road curve instead of short raised line blocks. | High visible marking confidence; 00:50 navigation explicitly says Winston Trails S. |
| 01:10â€“01:20 | Splitter/hedge edge carries yellow paint; a white transverse stop line is visible toward the exit. | Stop paint ends at junction geometry; it does not continue across the mouth as a universal centerline. | High for paint presence; exact local dimensions must be estimated. |
| 02:15â€“03:00 | After turning onto Hypoluxo, white dashed same-direction lane dividers and a solid white outer edge. Raised curb/gutter/sidewalk beyond. | Use continuous smooth strip geometry with proper dash spacing. Do not use double yellow between same-direction lanes. | High; street association is supported by owner route, turn sequence and later navigation. |
| 04:15 / 06:00 | Later divided arterial: single yellow stripe on the median curb edge, white dashed lane dividers, planted raised median. | Yellow belongs at the median boundary; its broad curvature is intentional. A wobbly segmented mesh is not. | High visual confidence. Later road names are route-sequence/navigation associations, not a new geographic survey. |

The initial low-resolution interpretation of 00:15â€“00:45 as all unmarked was corrected after inspecting 00:35 full resolution. The short island taper is important; use this table rather than the earlier provisional statement.

## Highest-impact Blender asset directions

1. **Two distinct, dense palm crown families.** The frames at 00:35 / 00:45 show tall pale smooth trunks with layered drooping feather fronds; those at 04:15 / 06:00 show compact, full fan crowns with rougher brown-gray trunks and hanging older foliage. The baseline's thin, sparse crowns do not reproduce the opaque mass or drooping lower silhouette. Aim for coherent crown volume, overlapping leaves, green-to-olive variation, trunk texture and size variation; retain nearby/medium/far LODs.
2. **Continuous clipped broadleaf hedges.** 00:50 and especially 02:15â€“03:00 show long dense hedge walls, with small leaf texture and slight top irregularity, dark undergrowth and taller broadleaf canopy behind them. These read as layered neighborhood landscaping, not separated low fern clusters. Reusable straight/end/corner segments, controlled variation and distance LODs would make immediate roadside improvement.
3. **Rounded curb/gutter and driveway-mouth kit.** 00:15 shows a continuous smooth curb radius and pale concrete apron; 02:15 shows dark gutter seams and standing water. Current hard rectangular flat sidewalk edges and detached apron slabs look synthetic. A rounded/mountable curb profile, gutter channel, expansion joints and merged driveway transition would improve near-camera scale. This can be a subsequent geometry pass if palms/hedges fill this increment.

Asset silhouette should be judged in the actual driver view before adding more geometry. 00:35 is the best single palm reference; 02:15 is the strongest hedge/road-edge reference; 04:15 is the strongest fan-palm/median reference.

## Other grounded realism ideas, prioritized after this increment

- **Wet pavement variation**: 00:35, 01:05, 02:15 and 04:45 show reflections, puddles, damp gutter bands and tire tracks. A mostly uniform dry road in the current scene cannot resemble this filmed lighting. Use restrained spatial roughness/darkening and shallow reflectivity variation, rather than uniform mirror gloss. A dry-day scene can remain legitimate but should not be represented as matching the recorded weather.
- **Mature broadleaf canopy and deeper planting layers**: 00:15 and 02:15 show larger irregular crowns and overlapping foliage, often obscuring building edges. This is a larger silhouette deficit than missing tiny props.
- **Varied house massing**: 00:10 clearly juxtaposes a two-story pale house and a one-story cream house with different roof layouts. Repeating one bungalow silhouette everywhere remains conspicuous even with good stucco texture. Prioritize a few correctly scaled massing variants and driveway/carport setback differences.
- **Driveway/yard details grounded in the film**: 00:10â€“00:15 shows gray concrete and pink/red paver aprons, white decorative mailbox posts, thin curved bed borders, trimmed lawn strips, low palms and planting beds. Avoid scattering unrelated roadside props or ubiquitous rail fences where the film instead shows hedges/open frontage.
- **Gate identity**: 01:05 shows white fencing/posts, small gate equipment, red-white booms and yellow protective posts. These are more characteristic than generic heavy roadblocks; preserve owner-requested police/barricade closures only where they serve the controlled route.
- **Cabin shape**: 00:00 clearly shows a physical vertical gear-button stack and center controls; the filmed dashboard has integrated displays and broad molded surfaces. A later Odyssey-style dashboard/center-stack asset should copy broad proportions and physical control groups before adding more artificial screen detail.

## Implementation and verification

### Road presentation and runtime status

Road paint is implemented as thin, miter-joined ribbons on the observed marked spans; inappropriate court/residential paint is removed from visible presentation. Original source meshes and route data remain recoverable. The Blender candidates below are authored and export-verified. The final shared-mesh, EditorOnly-stripped candidate passes the 14-case scene suite, an actual WebGPU player run, forced WebGL2 fallback, real-tab focus recovery and a complete driven lap with reload. Three earlier browser failures remain recorded below. These technical passes do not establish photorealistic completion or human art approval.

### Blender authoring iterations

The authoring agent used isolated background **Blender 5.2.1 LTS** processes with four CPU threads and `--factory-startup --disable-autoexec`; the shared interactive Blender scene was not edited. The tracked recipe is `tools/blender/build-town-drive-reference-v004.py`. Each `r01`â€“`r05` source/export revision is preserved under the art checkout's ignored `assets/source/local/town-drive/reference-v004/` and `assets/game/local/town-drive/reference-v004/` directories.

- **r01 â€” rejected preview.** The fan crown read as horizontal tiers, the feather crown remained sparse, and an RGBA packing error made the hedge texture black. Its initial hedge shader also exported alpha BLEND. Original outputs/logs and completed renders remain; none was promoted.
- **r02 â€” corrected textures, unfinished silhouette.** Packed the photographic leaf mask correctly and authored an explicit alpha comparison node recognized by the installed exporter as MASK. More pinnate leaflets improved crown density, but the fan still had two separated masses and an exposed middle band.
- **r03 â€” intermediate shape pass.** Distributed fan directions continuously, added more split drooping tips and used the licensed brown branch maps for hedge wood. Actual renders still showed an exposed fan band; the enlarged distant hedge leaves also extended below the ground tolerance. These were corrected before selection.
- **r04 â€” accepted near-view candidate for Unity comparison.** Shorter fan petioles and overlapping inner surfaces close the broad gap; the oldest lower fans use warm brown/olive coloration. The royal-style trunk uses a paler, lower-contrast derivative of the bark scan with subdued normal strength. Ground placement was corrected. Source and reopened-export renders were inspected by the author and root. The full-frame far-LOD view exposed excessive foliage loss, so r04 distant geometry was not selected unchanged.
- **r05 â€” selected frozen candidate.** Increased distant royal/fan foliage and hedge coverage while preserving every near-LOD position, normal, tangent, UV and index component byte/count/type from r04. The fan retains 32 distant fronds; the royal uses 20 fronds with broader proxy leaflets; the hedge has 400 distant leaf cards. The actual far render shows better retained mass. Broad distant leaf shapes remain a deliberate simplification, to be judged at their Unity transition distances.

### Selected files, metrics and provenance

Selected directory: `C:/Projects/space_dragon_town_art/assets/game/local/town-drive/reference-v004/r05`. `source-receipt.json` records the source texture hashes, authors/licenses, recipe hash, source version, export metrics and agent inspection boundary. Its references were checked against the exact frozen model, source and recipe bytes.

| GLB | Near / far triangles | Bytes | SHA256 |
| --- | --- | --- | --- |
| `royal-palm-v004.glb` | 8,864 / 2,192 | 6,339,472 | `c0fd3c14c26784b1e589979e8d112e097f11905227810217df7fd7bc54c8390f` |
| `fan-palm-v004.glb` | 8,592 / 1,548 | 6,477,064 | `d1427d4929c5f2b396537ae945ce13214beedd18fa8c97c678f7eff4a9e0d293` |
| `clipped-hedge-v004.glb` | 4,452 / 1,136 | 4,224,816 | `70ae41f6ebce2087e4d384ea91c614392f2c5418bbbb5eed680913478a285e3d` |

Each family has two named LOD roots and two mesh/material slots per LOD: `RoyalPalm.LOD0/LOD1`, `FanPalm.LOD0/LOD1`, and `ClippedHedge.LOD0/LOD1`. Units are metres, with Blender Z-up converted by the standard exporter to glTF Y-up. Ground pivots are within 0.03 m; near source heights are approximately 8.78 m, 7.54 m and 1.54 m respectively. Unity placement/scaling and rendering workload are measured separately; these are asset geometry counts, not frame timing.

The recoverable source is `assets/source/local/town-drive/reference-v004/r05/town-drive-reference-v004-r05.blend`, **12,914,122 bytes**, SHA256 `d37a5081929c84aa66ec872399c40f6ccb963c330799b6bbb8707fa11983d6ac`. A byte-identical, packed editable copy and README are tracked under `assets/source/town-drive/reference-v004/`, separately from runtime assets. The copy includes only authored/CC0 maps and the isolated review studio; selected-object GLBs exclude that studio, cameras, lights, source footage and reference boards. There are no animation clips or armatures in these static assets.

The geometry is original Blender-authored trunk, frond, branch and leaf construction informed by the supplied footage. Bark and hedge leaf/branch surfaces reuse the existing **CC0** [Palm Tree Bark](https://polyhaven.com/a/palm_tree_bark) scan by Dimitrios Savva/Rico Cilliers and [Island Tree 02](https://polyhaven.com/a/island_tree_02) maps by Rob Tuytel/Rico Cilliers. The royal bark is a pale scan derivative; hedge alpha is packed into its photographic leaf texture. Palm leaflet color/vein patterns are original procedural textures, **not photographic scans**. The [Poly Haven license](https://polyhaven.com/license), source paths/hashes and modification notes are retained. Powered by Poly Haven. No new paid asset, provider upload or external generator was used.

### Export verification and observed appearance

| Check | Result and scope |
| --- | --- |
| glTF validation | PASS for all three selected GLBs; zero errors/warnings/hints. Each palm has two informational `UNUSED_MESH_TANGENT` entries for surfaces without a normal map; hedge has no infos. Logs: candidate `validate-royal.log`, `validate-fan.log`, `validate-hedge.log`. |
| Embedded resources / alpha | PASS: all images and buffers embedded, no external resource URI, camera or animation. Hedge foliage uses MASK with cutoff 0.42; other surfaces are OPAQUE. Foliage is double-sided. |
| Near preservation | PASS: `near-parity.json` compares every near geometry accessor component byte/count/type exactly between accepted r04 and selected r05. |
| Source/export reopening | PASS in Blender 5.2.1: reopen saved source and all selected GLBs; both LOD counts and bounds agree within 0.0001 m, ground pivots meet 0.03 m tolerance, and all textures actually bound to imported meshes decode. Candidate `reopen-verification.json` owns the results. |
| Recipe/source identity | PASS: source-receipt hashes match all three frozen GLBs, the recoverable r05 `.blend` and the tracked authoring script. Python syntax check passes. |
| Agent appearance inspection | Actual source and reimported-export renders show denser foliage, distinct pale/rough palm trunks, a rounded fan crown with older brown fronds, and photographic hedge leaves. This is agent inspection for Unity comparison, not human photorealism approval. |

The first r04 reopen harness inspected all image datablocks, including unused source images, and failed that overly broad assertion after geometry/bounds had passed. The retained corrected harness checks decoded textures bound to the imported game meshes; r04 and the changed r05 exports pass. No r04 model or tolerance was changed to obtain the corrected r04 harness pass; r05 separately contains the documented distant-geometry improvement. Logs remain under `assets/source/local/town-drive/reference-v004/` in the art checkout.

Accepted near renders are under `r04/review`; selected far and reimported-GLB renders are under `r05/review`. Close views still reveal authored fan/feather leaf structure, and the distant models intentionally use broader simplified leaves. Source and export renders do not verify Unity appearance, collision clearance, LOD transitions or performance. Actual scene, browser and driven-lap evidence is recorded below; visual judgments remain separate from those technical results.

## Unity integration evidence

### Initial baked candidate â€” rejected in browser

Setup succeeded in the existing Unity 6000.6.7f1 project (`Setup-20261101-193637-028.log`). The scene contains **77 feather palms, 85 fan palms, 207 replacement hedges and 40 additional hedge modules** along five existing Hypoluxo walls. The derivative uses 70 spatial LOD groups, 286 renderers and five shared materials: **2,512,492 near / 580,956 far triangles** across all placements. Those totals are world inventory, not simultaneously visible geometry. Cell bounds affect the actual LOD transitions; nominal 65/180 m hedge and 120/420 m palm distances are not exact per-plant transition guarantees.

All 1,302 original vegetation parts remain recoverable; 855 replaced parts and the previous v003 crown root are inactive. The original route and manifest hashes remain `4c5eba111e226ffd53daf5dfe7ca68274eb1b643d58fb4c6955e863e401c47ff` and `a68bdc42688ac6746ce3f7addf184d0c95d958c2e3026a5e06ad8f8ffaa788bc`. Palm crown proportions use uniform normalization before applying the original placement transform; positions and authoritative obstacles are unchanged. New wall hedges clear mapped road/sidewalk envelopes by at least **9.4624 m**.

The road override hides 1,677 original stripe renderers and creates **569 strokes in 36 batches / 13,560 triangles**. It preserves original source geometry, stop bars and crosswalks. The mitered ribbons join at shared endpoints and do not repeat overlapping raised boxes. Marking extents remain reference-informed estimates on the preserved route.

Two initial Setup failures are retained:

- `Setup-20261101-192828-410.log`: thicker replacement bark extended an existing context-road overlap by about 45 mm. The corrected code narrows only the bark of the two explicitly identified pre-existing overlap anchors; crown/height/position and the strict 5 mm no-growth guard remain unchanged. These existing context-road placements are not represented as newly cleared geometry.
- `Setup-20261101-193431-714.log`: matching the old visible wall material found no infill anchors because the earlier surface pass renamed that material. Selection now resolves the immutable source manifestâ€™s exact Hypoluxo wall ancestor and validates all five instance dimensions. The count and placement requirements remain strict.

The initial persisted scene passed **14/14 EditMode acceptance tests** (`scene-tests-20261101-193837-628.xml`): original integration/materials/cabin checks plus connected-paint geometry/source preservation, exact original vegetation anchors, source-wall infill identity, textured LODs, measured triangle budgets and bounded road clearance. Those Setup and TestScene wrappers detected no changed shared ProjectSettings/Packages bytes.

Repository checks: `npm run check` passes **251 unit tests, TypeScript/Vite build, 54 development-browser cases, nine production-browser cases and 18 reference checks**. Development/preview ports 5266/4268 use isolated fixture data. Foundation checks pass; Python reports 49 passed and two host-dependent skips of 51 cases. Logs are in the art checkout's `artifacts/unity-town-drive-art-v004/{npm-check,python-check}.log`. These retained-prototype checks do not establish Unity gameplay.

The first browser build succeeded (`BuildWeb-20261101-194008-186.log`, native build 557.43 s), but **actual WebGPU launch failed before the first frame**. Its baked world meshes duplicated each plantâ€™s vertex payload: player data 315,323,488 bytes, total build 417,323,641 bytes. The 512 MiB Web heap refused a 568,070,144-byte allocation while deserializing mesh vertex data. This candidate is **REJECTED**, despite its 14 passing scene tests. Failure evidence: `after-matched/runs/2026-11-01T19-53-21-146Z/report.json`; archived artifact `failed-baked/player`. The known-working frozen v003 player was restored to the live review URL during the correction.

### Shared-mesh candidate â€” rejected in browser

The correction reuses source GLB meshes across placements instead of serializing duplicated world meshes. It preserves authored detail; this first correction attempted to retain the original 512 MiB heap boundary. Corrected Setup passed (`Setup-20261101-195855-847.log`), and the revised persisted-scene suite passed 14/14 (`scene-tests-20261101-200038-956.xml`). It verified 409 non-static plant LODGroups, 1,636 renderers referencing exactly 12 imported GLB mesh subassets, five shared materials and 26,784 unique source triangles. Per-placement geometry totals and all three asset hashes are unchanged. The memory saving comes from shared mesh references; actual GPU draw-call instancing is not assumed because the existing URP SRP Batcher remains enabled. The shared-mesh player also built successfully (`BuildWeb-20261101-200141-940.log`, native build 243.21 s) and reduced data to 156,608,687 bytes, total 258,608,840 bytes, but Chrome still failed scene startup within 512 MiB (`after-matched/runs/2026-11-01T20-08-59-090Z/report.json`). This second failure occurred during scene-object remapping; the candidate is **REJECTED**. Its artifact is retained under `failed-shared/player`; v003 was restored during correction.

### Shared meshes with EditorOnly exclusions â€” rejected in browser

The next correction excludes superseded presentation from player builds with Unity's built-in `EditorOnly` tag: original inactive paint leaves, replaced plant roots, v003 foliage and vegetation construction templates. All remain in the editable scene and imported sources. Strict component/reference tests protect colliders, scripts, active vegetation and runtime traffic/pedestrian templates. The exclusion revision passed 14/14 scene checks (`scene-tests-20261101-201640-518.xml`) and built successfully (`BuildWeb-20261101-201743-444.log`, 233.93 s) with 143,336,462-byte data and 245,336,615-byte total output. Actual startup still exceeded 512 MiB (`after-matched/runs/2026-11-01T20-24-36-701Z/report.json`); this candidate is **REJECTED** and preserved under `failed-stripped/player`.

### Final shared-mesh candidate â€” technical verification passed

After removing duplicated meshes and unused rollback content, startup still failed within the 512 MiB heap ceiling. The final Town Drive WebGL candidate retains those corrections and temporarily sets the maximum to **1024 MiB**, keeping the shared **128 MiB initial allocation and geometric growth policy**. Its `finally` block restores the prior maximum and template; the existing pipeline scope restores renderer settings. `final-heap-setting-check.json` confirms the generated framework maximum is **1,073,741,824 bytes** and the workspace returns to **128 MiB initial / 512 MiB maximum**. This is a Town Drive build ceiling, not a preallocation or measured usage claim.

The final build succeeded in the existing Unity 6000.6.7f1 project: `artifacts/unity-town-drive-scene/BuildWeb-20261101-202810-421.log`, native build **77.28 s**, total **245,334,944 bytes**. `TownDriveWeb.data` is **143,334,789 bytes**, SHA256 `1c1d0dbb9b0a958749956d7c3b504e5bbf1ac341a9b9340b333fe5d1c1d7c215`. This is a **Development / StrictMode review build**, with semantic review hooks explicitly recorded in its receipt. The final geometry and build-exclusion revision passed **14/14 EditMode scene checks** in `scene-tests-20261101-201640-518.xml`; the subsequent ceiling-only change also passed a full Editor-source offline compile against installed Unity assemblies. The final build reran Setup successfully. Regeneration also normalizes existing material serialization: 133 built-in queue-control fields, ten surface-consistent RenderType tags, five residential tint aliases synchronized to their unchanged base colors, and the existing rear-view material name. No shared ProjectSettings or Packages changes are included.

The final scene receipt confirms **409 individual plant LODGroups, 1,636 non-static renderers, 12 shared imported mesh subassets and five materials**. Its **26,784 unique source triangles** are reused across the unchanged inventory of 77 feather palms, 85 fan palms, 207 replacement hedges and 40 wall-row modules; total placed geometry remains **2,512,492 near / 580,956 far triangles**, not all simultaneously visible. Original anchors, the two explicitly bounded pre-existing context-road overlaps, source hashes and the minimum **9.4624 m** infill road-envelope clearance remain unchanged. The 855 original replaced plant parts and v003 crown root remain inactive and EditorOnly; source vegetation templates and superseded paint are likewise excluded from the player but retained in the Editor. Active source canopy, traffic and pedestrian templates remain included. Per-plant LODs now use nominal hedge 65/180 m and palm 120/420 m settings; camera field of view and LOD bias still affect actual transitions.

### Actual browser checks and complete lap

All run paths below are under the live checkout's `artifacts/unity-town-drive-art-v004/`; each contains its actual `report.json` and screenshots. Tests used installed **Chrome 156.0.8078.76**, a **1280Ã—720** viewport at device scale 1, and the reported **AMD Radeon (TM) Graphics / ANGLE Direct3D11** device. Normal interaction cases use real keyboard events in isolated browser contexts.

| Actual run | Result | Evidence path and scope |
| --- | --- | --- |
| Frozen v003 baseline | **6/6 PASS** | `baseline-current/runs/2026-11-01T20-32-16-584Z`; startup, keyboard drive/steer/brake, pause, cabin/look, reset, checkpoint save/reload. |
| Final v004 WebGPU | **6/6 PASS** | `after-matched/runs/2026-11-01T20-33-02-745Z`; same six interaction cases and warmup sequence. |
| Forced WebGL2 fallback | **6/6 PASS** | `fallback-isolated/runs/2026-11-01T20-33-51-112Z`; the player reports `OpenGLES3` / WebGL 2.0, including the cabin rear-view path. |
| Real-tab focus recovery | **1/1 PASS** | `focus/runs/2026-11-01T20-34-51-252Z`; observed focus/visibility loss pauses player and ambient time, return stays paused, deliberate resume suppresses held throttle until neutral, and fresh throttle recovers. No synthetic focus event or runtime pause command. |
| Final v004 full lap and reload | **7/7 PASS** | `after-lap/runs/2026-11-01T20-36-26-375Z`, completed **20:44:01.263Z**. Includes the six normal cases plus the complete route using bounded semantic throttle/brake/steering input to the existing fixed-step simulation; it does not set pose, checkpoints or time. |

The complete lap took **420.181 wall seconds / 414.083 simulated seconds**, reached all five checkpoint IDs (`home`, `leg-1`, `leg-2`, `leg-3`, `leg-4`), completed and reloaded successfully at home with completion retained. The trace records **zero contact snapshots**. Both traffic and pedestrian systems remained present at **64 cars / 40 walkers**. This is an automated fixed-step lap with semantic controls, not a claim of a human manually driving every turn. Every listed completed report records zero page errors, console errors and external requests; the normal, fallback and lap reports also record zero failed requests.

### Matched timing and memory observations

The baseline and final WebGPU runs were consecutive and used the same browser, reported graphics device, viewport, interaction script and warmup sequence. Each short run has an `isolation-1.json` report recording no observed competing Unity/compiler/automated-browser jobs during two-second process polls. This monitor does not exclude ordinary desktop activity or establish exclusive GPU ownership. The warmed home chase comparison returns to the same spawn pose. Cabin measurements occur after the same keyboard sequence at nearby, not bit-identical, driven poses. Timing values are the last **240 Unity Update wall intervals** in each warmed window, not GPU timings, a complete-route average or an endurance benchmark.

| Measurement | Frozen v003 WebGPU | Final v004 WebGPU | Final v004 forced WebGL2 |
| --- | ---: | ---: | ---: |
| Warmed home chase mean / p95, ms | **24.23 / 29** | **21.65 / 26** | **19.00 / 25** |
| Warmed cabin mean / p95, ms | **23.73 / 29** | **23.27 / 25** | **20.08 / 27** |
| Sampled WASM linear-memory capacity, MiB | **458.875** | **646.875** | **646.875** |
| Player data file, bytes | **112,132,209** | **143,334,789** | Same final player |
| Configured initial / maximum heap, MiB | **128 / 512** | **128 / 1024** | **128 / 1024** |

The new candidate's short measured frame windows are comparable to or lower than the baseline; this single sequence does not establish a sustained performance improvement. Its sampled WASM capacity is **188 MiB higher**, and the player data grows by **31,202,580 bytes**. Sharing geometry and stripping unused rollback content fixed duplicated payload costs; they did not make the added art free.

The verifier reads the exported `Module.HEAPU32` buffer through a data-property descriptor. `linearMemorySamples` records **646.875 MiB / 678,297,600 bytes** at scene-ready, warmed cabin and warmed chase after reload, plus the end of the normal/fallback runs and completed-lap reload. The baseline's corresponding samples are **458.875 MiB / 481,165,312 bytes**. These are discrete observations of allocated WebAssembly linear-memory capacity, **not live allocation totals, a continuously sampled peak, JavaScript/GPU memory or total process memory**. Older snapshot `browser.wasmHeapAllocatedBytes` fields remain null; the dedicated `linearMemorySamples` entries are the measured evidence. The final heap-setting check separately verifies the configured ceiling and restored workspace settings.

## Actual player visual inspection

The root and an independent road-art reviewer inspected the actual final player screenshots, including the stationary chase/cabin/look views and driven Green Island, local taper, Winston, gate, Hypoluxo, Jog, Lantana and Hagen Ranch views. The root also inspected the close fan crown at checkpoint 3. These are rendered-player observations; scene tests alone do not establish appearance.

- Ordinary Green Island pavement is visibly unmarked. The short local double-yellow approach ends before the junction mouth; the Winston pair reads as a connected flat ribbon. Straight arterial single-yellow median boundaries and white lane dashes no longer have the old repeated-box wobble or raised paint shadows. The yellow reads somewhat orange/ochre under the current lighting.
- Royal-style crowns now have visibly layered drooping foliage and pale textured trunks; fan crowns have substantially more volume and distinct rougher bark/older foliage. No missing-texture magenta or newly visible vegetation in the driving lanes appeared in the inspected views. Existing traffic, pedestrians, cabin look and live rear view remain visible.
- Hedge clumps have stronger leaf-edged volume than the old sparse patches. Forward route shots show portions of wall planting but do not closely establish every one of the forty added modules. Their identities and clearance are separately covered by scene evidence.
- This is **an incremental visual improvement, not photorealistic completion**. Palm crowns remain too dark, repeated silhouettes are conspicuous, near pointed leaf geometry is angular and some hedge leaves read as flat coarse pieces. Existing broad bare verges, repetitive lawns/house fronts, simplified ponds/gutters and dark smooth cabin forms remain.
- The screenshot named `route-splitter-approach` identifies a review location, not a reconstructed planted splitter: the retained T geometry is still simplified compared with the 00:35 film frame. The gate image is partly blocked by an oncoming van, so that frame cannot establish unobstructed gate-paint continuity. Road placement/proportions remain estimates on the preserved route.

Local review: `C:/Projects/space_dragon/artifacts/unity/town-drive-art-v004-review.html`. The gallery contains twelve before/after pairs (four stationary and eight driven), the additional after-only local taper three local reference frames and two supplemental hedge views: **30 image references**, all checked present. Driven poses are approximate and include post-capture telemetry; cabin captures can differ slightly in position/yaw. The timing table uses the separately isolated short reports, not the full-lap screenshot runs. It shows the timing run IDs and final player-data hash; exact report paths are recorded above.

Supplemental side inspection: `hedge-side/runs/2026-11-01T20-48-26-748Z/report.json` and `hedge-right-side.png`. The same final player was driven from home for 69.758 seconds to route S620.368, then held with neutral controls/handbrake and viewed using E. Both screenshot-boundary speeds stay within 0.01 m/s (millimetres of residual drift). Source IDs `infill.1.0`–`infill.1.7` identify the new row in front of original wall `Primitive_i1`, center (-379.422, -269.500). Root and independent review see continuous dense planting, lawn/sidewalk separation and no obvious seams or floating sections; dark, uniform leaf cards remain visible. No contact snapshots or browser/request errors were recorded. This is a supplemental visual observation, not a new performance benchmark. The earlier failed capture remains under the 20:46:04 run: its brake-at-zero hold reversed the car; the corrected neutral/handbrake run is the evidence used.

## Boundaries

IMPLEMENTED, VERIFIED, agent visual inspection and human REVIEWED/APPROVED FOR RELEASE remain separate. House footprints/widths, vegetation placement and compressed outer route remain estimates. No claim of exact botanical species, photorealistic completion, sustained frame rate, controller testing or production deployment follows from the asset files or compilation.
