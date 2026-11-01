# Near-orbit scenery and heroic mechanical dragon — SD-078

## Scope and current status

**IMPLEMENTED and technically VERIFIED for the named local source, export and actual-player checks below.** The final Unity Web build passes all 11 Chrome encounter cases on WebGPU and the same 11 on WebGL2; all 69 EditMode tests pass. Source and final-player screenshots were inspected. New owner art approval, sustained performance and release remain separate. Final WebGL2 screenshot inspection also confirms the visible crimson rib structure, horizon and HUD with no pink or missing materials.

Owner request, October 31: “rocks look better”, followed by the request to move near the planet's atmosphere, add thoughtful detail and update Blender with the agreed intimidating mechanical look. [Decision](../decisions/2026-10-31-near-orbit-dragon-art.md); [verbatim inbox](../../ideas/INBOX.md). The positive rock review and earlier “gameplay is solid” are narrow human feedback. The new dragon/scenery are not yet owner-reviewed or approved for release.

- Starting base: `feat/town-drive-lab@deedd01528b3e8d22c0af3bedba9a79436f80be7`, shared dirty working tree. During this task, another channel committed Google Vids/First Contact/Launch work; final test HEAD is `b89a0fc887ee60a57eac9f5aaad8e2ef588ca3d2`. Dogfight changes remain uncommitted. Final artifact hashes and each test report identify the tested content; preserve concurrent commits rather than restoring the starting HEAD. No Dogfight commit, push or deployment is claimed.
- Live connected Blender **5.2.1 LTS**, with telemetry disabled. Unity target is the existing **6000.6.7f1** project and installed Chrome on the Lenovo/AMD target. Final installed Chrome **156.0.8078.76** reports AMD Radeon (TM) Graphics (0x15E7), ANGLE/D3D11, with actual **WebGPU** and **OpenGLES3** backends. These are headless installed-browser runs, not a human play session.
- Root owns the live Blender write and Unity build. Independent agents own near-orbit scenery, pipeline support and records. No simultaneous Editor or source-file writers are authorized.

## Blender preservation and actual changes

The connected live scene was the older v002 and contained unsaved changes. It was saved separately as `assets/source/local/spacecraft/space-dragon-spacecraft/Space Dragon Spacecraft-v002-live-recovery-SD078.blend` before loading the retained v004 flight source. The original v002/v003/v004 sources and prior runtime exports were not overwritten.

The upgraded editable source is:

`assets/source/local/spacecraft/space-dragon-spacecraft/Space Dragon Spacecraft-v005-heroic.blend`

SHA-256 **`ce7177b05b5c6b8b8f322bcc64c3dafa2c3f5e72c225d114e0db53ce88dbf925`**; measured source size **67,828,193 bytes**. The export receipt confirms source bytes remained unchanged during export. Final live MCP inspection confirms v005 is loaded in Blender; the final source and GLB hashes still match the identities below.

Collections separate recovery/comparison, editable detail and game geometry:

- `Original Flight v004 - comparison only`: the original 41 game meshes remain hidden for comparison, with their mesh/material data preserved.
- `Heroic Upgrade - editable components`: **107** separate editable components, hidden from the game export.
- `Game Candidate - heroic v005`: **45** meshes for the new game candidate, including the consolidated added detail.

The visible upgrade concentrates on chase-camera construction: six weighted supporting ribs per wing, reinforced leading-edge plates and hinges, tension hems, shoulder cowls/pistons/louvers, and deliberate dorsal/tail crowns. Three new **1024×1024** membrane maps provide color, normal and roughness variation; the two earlier first-section atlas maps remain. The palette continues dark gunmetal paint, crimson armor/membranes, exposed metal and restrained orange internal light. No reference photos or externally generated assets are embedded.

Live MCP inspection exposed tail crowns floating over a straight approximation of the curved tail. Their placement was corrected against the existing curved armor bounds before the final source was saved. This is a retained art correction, not a claim that every possible contact/intersection is eliminated.

[The local source/player gallery](../../artifacts/unity/heroic-dragon-review/index.html) is regenerated with `node tools/unity/heroic-art-gallery.mjs`. Source pairs share their Blender camera; Unity headings use different cameras and are not matched to those angles. Gallery performance summaries appear only for actual reports marked PASS. Blender review images include:

| View | Evidence |
| --- | --- |
| Original chase comparison | [blender-original-chase.png](../../artifacts/unity/heroic-dragon-review/blender-original-chase.png) |
| Upgraded chase/rest | [blender-heroic-chase.png](../../artifacts/unity/heroic-dragon-review/blender-heroic-chase.png) |
| Original head comparison | [blender-original-head.png](../../artifacts/unity/heroic-dragon-review/blender-original-head.png) |
| Upgraded head | [blender-heroic-head.png](../../artifacts/unity/heroic-dragon-review/blender-heroic-head.png) |
| Upgraded flap pose | [blender-heroic-flap.png](../../artifacts/unity/heroic-dragon-review/blender-heroic-flap.png) |

These source views were inspected by the agent. Final Unity captures separately verify visible wing/shoulder/spine detail, articulation and gameplay. The Blender images alone do not establish Unity appearance, comprehensive articulation clearance or owner acceptance.

## Export identity and contract

Final optimized candidate:

`assets/game/local/spacecraft/space-dragon-spacecraft/heroic-v005/dragon-heroic-v005.glb`

| Property | Measured result |
| --- | --- |
| File size | **13,072,136 bytes** |
| SHA-256 | **`94f17d2c3f0026364aeffd7d5ceb0876f9f8e9c65ed66067c82f27260116fa60`** |
| Meshes / primitives / materials | **45 / 45 / 10** |
| Triangles / vertices | **90,630 / 141,521** |
| Retained component pivots | **901**, maximum measured error **0** |
| Rig | Root, Wing_L, Wing_R, Jaw, Tail_0–Tail_4; rest transforms and inverse-bind matrices unchanged |
| Sockets | Eight retained muzzle, wing L/R, thruster L/R, target, camera and ground sockets |
| Authored clips | Flight, Glide, Boost; decoded times/quaternion channels byte-identical to the baseline |
| Embedded maps | Five 1024-square maps: two retained atlas maps and three new membrane maps |

The original runtime `dragon-flight-v003.glb` remains **9,653,504 bytes**, SHA-256 `1446d3c3c9606a61ad8d871473ce5b1242107c0a6d52b59c795102adb74f853c`. New geometry adds **8,639 source triangles** relative to its 81,991. Unity's previous runtime-only armor overlay (**416 triangles**) is disabled for the new candidate to avoid duplicating the authored upgrade.

Export retained 84 invalid tangent vectors on six existing material groups. These were repaired, including two collapsed-UV fallback cases, before validation. The pre-repair candidate is retained as `artifacts/heroic-v005-before-tangent-repair.glb`; export logs preserve the correction. Final validation reports **zero errors**, **45 skinned-hierarchy warnings**, plus informational unused-attribute and degenerate-triangle notices. The hierarchy warnings concern skinned meshes under preserved parent nodes; they are not silently discarded. There are four degenerate-triangle notice rows (29 triangles across those rows). These notices do not by themselves prove a visible rendering defect, and actual Unity inspection remains required.

A lossless vertex weld reduced the post-repair candidate from **15,233,820 to 13,072,136 bytes** and **179,205 to 141,521 vertices**, preserving 90,630 triangles, all node transforms/pivots and exact image bytes. No mesh simplification, component pruning, node joining or texture resampling was used. The raw and unwelded candidates remain beside the final export.

Reproducible helpers are `tools/build_heroic_dragon.py`, `tools/export_heroic_dragon.py`, `tools/verify-heroic-dragon.mjs` and `tools/optimize-heroic-dragon.mjs`. The builder refuses to overwrite an existing v005; choose a fresh revision for future source work. The export reads only the named game collection, preserving the source. `tools/unity/prepare-heroic-dragon.mjs` adds the new selected export/contract without deleting prior intake receipts, material contracts or GLBs. New Unity intake is `asset-receipt-v003.json` and `heroic-contract-v005.json`; actual importer/build and browser evidence is recorded below.

## Retained import failure and correction

The first player build stopped at the material gate because glTFast 6.20 had cached the built-in pipeline/default material generator before the temporary Dogfight URP configuration was selected. The failure is preserved above. `DogfightGltfImportScope.cs` now binds only Dogfight GLB imports to their actual URP asset in the import process, resets both pinned package cache hooks, verifies `UniversalRPMaterialGenerator`, then restores prior global pipeline settings. It does not modify package source or silently accept the incompatible shader. The implementation fails explicitly if those pinned private cache hooks change in a future glTFast version. The subsequent intermediate Web build passed. The final build and both browser backends also pass; the failed material-gate run remains recorded rather than being replaced by the success.

## Near-atmosphere presentation

Source geometry is recorded in [near-orbit-source-metrics.json](../../artifacts/unity/near-orbit-source-metrics.json), explicitly marked **SOURCE_GEOMETRY_ONLY_NOT_A_PLAYER_TEST**.

| Source configuration | Value |
| --- | ---: |
| Visual planet radius | 26,000 m |
| Centre relative to camera | (0, -26,800, 0) m |
| Apparent camera altitude / height above shell | 800 m / 592 m |
| Angular radius / upper limb elevation | 75.97° / -14.03° |
| Atmosphere shell thickness | 208 m |
| Horizon sphere mesh | 8,385 vertices / 16,384 triangles |
| Sphere draws / ring rendering | 2 / ring renderer disabled; 1,024 ring triangles retained but not drawn |
| Generated atmosphere/cloud maps | Two 2048×1024 atlases plus one periodic 512×512 detail map |

The first offset-centre proposal (2.43 km apparent altitude) was superseded by the directly-below camera centre above. The scenery anchor follows camera **translation only**, keeping a fixed apparent altitude while allowing real camera rotation around the horizon. The horizon is yaw-invariant, including the owner's heading near 124°. Pitching upward can still look away from it. This is a background composition, not a traversable planet, atmospheric flight model or scientific scattering simulation. No scenery collider or encounter collision shape is changed. The first actual-player heading capture confirmed visibility at 0°, about 124° and about 244°, but review found intrusive thin-gap rings, an overly saturated limb and narrow dark sky artifacts. The final scene hides the old ring renderer, uses a subdued blue-gray atmosphere at density 0.45, and adds seamless periodic cloud detail (48 longitude / 24 latitude repeats, one extra fragment texture read, fading from 4 to 15 km). Channels encode height, tangent slopes and shallow cavity density; no grain octave is added. The shader remains a procedural layered cloud deck, not volumetric weather.

Final heading review `2026-10-31T20-39-17-674Z` confirms a broad lower cloud deck at observed **0.0°, 123.4° and 240.7°**. Heroic ribbed crimson wings and shoulder/spine armor remain visible. Dark HUD backplates improve hull/system, speed/boost and lower-control readability over bright clouds. The captures use an explicit **quiet fixture**, suppressing threats and rock collision; real ArrowRight input turns the dragon, with no injected pose/time or pause. They establish art visibility rather than combat difficulty or natural performance. Narrow dark sky dashes persist; their movement/alignment suggests a panorama UV/mip seam, but that cause is an inference, not a confirmed diagnosis.

## Checks and artifacts

| Check or command | Result | Evidence and limitation |
| --- | --- | --- |
| Actual Blender connection, source preservation and rest/flap inspection | PASS for named source checks | Live Blender 5.2.1 LTS; recovery source retained; final `source-receipt.json` and linked renders. No human art acceptance implied. |
| Blender background export through `tools/export_heroic_dragon.py` | PASS | `artifacts/heroic-export-v005.log`, `artifacts/heroic-export-v005-tangent-fix.log`, final export receipt. Original source/baseline hashes unchanged. |
| `node tools/verify-heroic-dragon.mjs assets/game/local/spacecraft/space-dragon-spacecraft/heroic-v005/dragon-heroic-v005.glb` | PASS | `artifacts/heroic-structural-verification.json`; geometry, maps, exact rest rig, pivots, sockets and clip preservation. Does not establish appearance/performance. |
| `node tools/optimize-heroic-dragon.mjs` | PASS for lossless weld | `artifacts/heroic-weld-verification.json`; byte-identical textures, retained nodes, unchanged triangles. |
| glTF validation of final candidate | PASS with retained warnings/notices | `artifacts/heroic-gltf-validation.txt`: zero errors, hierarchy/unused/degenerate notices described above. |
| Source near-orbit geometry inspection | PASS for source measurements only | `artifacts/unity/near-orbit-source-metrics.json`; not a player test. |
| First Unity Web build | FAIL — retained | `artifacts/unity/dogfight-web-20261031-201803-694-39548.log`: material gate rejected `SD5_Exposed directional metal` using built-in `glTF/PbrMetallicRoughness` instead of the compatible URP clearcoat shader. |
| Scoped glTFast import correction and intermediate Web build | PASS for intermediate build | `artifacts/unity/dogfight-web-20261031-202343-848-36108.log`; created `2026-10-31T20:26:27.6147846Z`, 124.29 seconds, 130,134,329 bytes, shared settings restored. This is the intermediate artifact, superseded by the final build row below. |
| `run-dogfight.ps1 -Action test` | PASS | `artifacts/unity/dogfight-editmode-20261031-202745-802-32612.xml`: 69/69, zero failures/skips, 0.256 seconds test execution. Run after the import fix and before final environment/HUD-only corrections; final actual-player runs additionally exercise those changes. Compilation/tests alone do not verify appearance. |
| `node tools/unity/review-near-orbit.mjs` | CAPTURED / visually inspected, intermediate | `artifacts/unity/near-orbit-review/runs/2026-10-31T20-27-42-073Z/report.json` and `visual-review.md`; 0/120/240 target headings with quiet fixture and real steering. Horizon present; art corrections requested before final acceptance. |
| Final `run-dogfight.ps1 -Action web` | PASS | `artifacts/unity/dogfight-web-20261031-203658-129-38676.log`; created **2026-10-31T20:38:53.1092997Z**, **81.75 s**, **130,416,661 bytes**, shared settings restored. Build receipt SHA-256 `d15b65821dfd40e173283adb5cbeed0e850edde645890587e40d018ab223d622`. |
| Final `node tools/unity/review-near-orbit.mjs` | CAPTURED / agent visually inspected | `artifacts/unity/near-orbit-review/runs/2026-10-31T20-39-17-674Z/report.json` and `visual-review.md`: horizon present at all three headings, intrusive rings removed, atmosphere/cloud/dragon/HUD appearance reviewed. Quiet-fixture scope above. |
| `node tools/unity/verify-dogfight.mjs artifacts/unity/dogfight-heroic-playtest` | PASS | **11/11**, final WebGPU run `2026-10-31T20-39-47-876Z`. Sixteen screenshots; zero console/page/request/external-request errors; isolated localStorage sentinel unchanged. |
| Same verifier with `SPACE_DRAGON_DOGFIGHT_WEBGL2=1`, output `artifacts/unity/dogfight-heroic-playtest-webgl2` | PASS | **11/11**, final OpenGLES3 run `2026-10-31T20-41-57-279Z`. Sixteen screenshots; same zero-error/network and scoped storage results. |
| Final natural-flight measurements | RECORDED | Ten-second actual-player samples below, separate from quiet art captures; no sustained/GPU-time or exact-VRAM claim. |
| `python tools/check_foundation.py` and scoped `git diff --check` after receipt | PASS | Documentation/foundation only; gameplay and agent behavior are not established. |

## Final player measurements and behavior

Both final suites exercise arrows/mouse and mode switching, independent aim, boost/roll/break turn, pause, invalid/valid missile launch, plasma kills and salvage, repair completion/interruption/cap, incoming missile warning/evasion, live spelling, breath windup/beam, physical asteroid collision, loss and full restart. Development fixtures arrange repeatable conditions and are recorded; real input, collision and simulation resolve outcomes. This is not an unassisted difficulty or learner-mastery assessment. Existing encounter-only save boundaries remain; the sentinel verifies the isolated localStorage context, not all storage technologies/origins.

Natural-flight samples are ten seconds after warm-up, using real steering with no quiet/target/damage fixtures, **1366×768 / DPR1 / render scale1 / 2× MSAA**. Only performance-history reset is used. Frame intervals are wall-clock Update measurements, not GPU timings or sustained device guarantees; ordinary desktop load is not controlled.

| Backend | Frames | Mean interval | Approx. fps | p95 | Last-frame draws | Rendered triangles | Unity texture allocation |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| WebGPU | 590 | 16.947 ms | 59.0 | 18.001 ms | 425 | 330,312 | 1.167 MiB |
| WebGL2 | 586 | 17.065 ms | 58.6 | 18.000 ms | 423 | 328,712 | 91.422 MiB |

SD-077's earlier samples were about 58–59 fps with 411 draws and roughly 283,000 rendered triangles. The new environment/dragon renders more geometry while these short samples remain about 59 fps. Different frames, combat visibility and desktop load prevent attributing a precise GPU cost to one feature. Triangle counters include passes/UI rather than just unique asset geometry.

The texture API reports **1.167 MiB on WebGPU versus 91.422 MiB on WebGL2** for the same content. WebGPU undercounts allocations exposed by the other backend; neither is exact driver VRAM. WASM heap introspection remains unavailable. The final complete Development build is **130,416,661 bytes** uncompressed, and each final run observed **43,120,345 gzip response-body bytes**. Earlier SD-077 body bytes were 36,166,955; this comparison includes the complete shared-project artifact, not just one texture. Deployment/CDN/release stripping and sustained performance remain untested.

## Gallery generation

`node --check tools/unity/heroic-art-gallery.mjs` and `node tools/unity/heroic-art-gallery.mjs` pass. The generator reads only existing local review artifacts, validates image paths, writes `artifacts/unity/heroic-dragon-review/index.html`, and does not fetch media, edit images or overwrite the SD-077 gallery. Missing/unfinished player reports stay marked pending; measured summaries require `result: PASS`. Heading captures remain explicitly labeled quiet fixtures. Regenerated after both final reports passed; the gallery links those exact run IDs and the latest heading capture. The prior SD-077 gallery is unchanged.

## Review, recovery and limits

- Owner human review: SD-077 rocks received “look better”; existing gameplay received “solid”. **New dragon, atmospheric composition, audible mix and final art quality remain NOT REVIEWED by the owner.** No AAA-equivalence claim.
- Structural rig/clip preservation and a sampled flap image do not prove all motion poses are collision-free. No new neck/leg bones or landing controller were added.
- No exact VRAM, sustained frame-rate, standalone or controller claim. Source comparisons and final Unity views were inspected, but their camera angles are different. No pixel-identical Blender/URP claim. Cloud detail is procedural, and narrow dark sky seam artifacts remain documented.
- The v002 live recovery, v004 source, comparison collection and prior imported GLBs provide rollback. Select the prior dragon intake and SD-077 scene configuration if the new candidate fails review; do not delete recovery files to roll back.
- No new noise kit, external asset-generation service, source-media upload, campaign/save changes, purchase, deployment, commit or push is included. The requested local source/export/Unity integration is technically verified for the named checks. Next is owner appearance/feel review of this artifact; no further feature work is claimed here.
