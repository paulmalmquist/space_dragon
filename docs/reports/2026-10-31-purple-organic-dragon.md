# Purple organic-dragon candidate — SD-080

**IMPLEMENTED / technically VERIFIED for bounded organic v007 integration.** The owner's “continue then” now leads to a refined Blender source, corrected bakes, versioned export and actual Unity player. Final build and both 11-case Chrome suites pass. Isolated 1366×768 samples are **58.1 fps WebGPU / 24.3 fps WebGL2**; the fallback is below the 30 fps target. [Source/player gallery](../../artifacts/blender/violet-dragon-v007/index.html). Owner appearance approval, further sculpt/feet/wing polish and fallback LOD/performance remain open. The complete repository QA retry passes on installed Chrome; earlier interrupted software-rendered evidence remains retained. Earlier source studies, failures and intermediate builds below remain historical evidence.

## Preserved first-source checkpoint (v006)

**First organic source candidate IMPLEMENTED and visually inspected in Blender; game-ready export, deformation/animation and player integration NOT VERIFIED.** Owner, October 31:

> i hit undo in blender.
> make it look like that please.

The attached chat reference depicts an organic-looking purple dragon with a powerful chest, long curved neck, predatory head/swept horns, scales, violet wing membranes and claws. [Decision](../decisions/2026-10-31-purple-organic-dragon.md); [inbox](../../ideas/INBOX.md). No local image path, download, source author/license or use as a runtime texture is assumed.

This supersedes mechanical styling for the next candidate. The owner Undo/replacement request means the prior mechanical result is not accepted as the selected forward art. SD-078's verified v005 source/export/player remain untouched historical evidence and rollback. SD-079's closer, more menacing framing intent can continue where compatible; its new build evidence remains separate.

Root is the sole Blender writer. Actual post-Undo inspection found 1,690 live meshes rather than the earlier 1,842; the new heroic collections were absent and the older mechanical base was visible. Before edits, `copy=True` saved a separate recovery file:

`assets/source/local/spacecraft/space-dragon-spacecraft/Space Dragon Spacecraft-v005-owner-undo-SD080.blend`

The new source now exists at:

`assets/source/local/spacecraft/space-dragon-spacecraft/Space Dragon-v006-violet-reference.blend`

Final source-receipt identity: **72,253,277 bytes**, SHA-256 **`f190a5f1450798390e88a5336848b1749def807418e32dc43b542c137b81e140`**. The source/gallery generator independently checks these file bytes against `artifacts/blender/violet-dragon-v006/final-source-receipt.json` before labeling the gallery current. This is a source sculpt, not an optimized game mesh.

| Source measurement | Result |
| --- | --- |
| Visible meshes | **194** |
| Base triangles before modifiers | **273,416** — evaluated/render count may be higher |
| New rig | **15 bones**, `VioletDragonRig.v006` |
| New collection | `Violet Dragon v006 - living reference` |
| Review collection | `Violet v006 review studio - not for export` |

New bones are Root, Neck, Head, Jaw, Wing_L/R, Fore_L/R, Hind_L/R and Tail_0–Tail_4. This changes anatomy and is **not a drop-in replacement for the old nine-bone mechanical game contract**. The old `SpaceDragonRig`, source meshes and markers remain hidden intact. Do not claim the old Jaw rest transform or clip bindings are preserved by this new rig. Weighting/deformation, sockets, authored flight clips, optimization, UV/bakes and organic GLB export remain unvalidated/unimplemented for runtime promotion.

The new source depicts an organic purple-scaled body, long raised neck, swept horns, claws and violet membranes. A first refinement flattened overlapping scutes, fitted ventral plates to the chest, connected inner wing patagium, sharpened brow/nasal construction, narrowed teeth and deepened the amethyst palette. The visible leg/chest/facial anatomy remains stylized and needs further deliberate sculpture; this is not a reference-quality match or approved cinematic asset. The final independent review notes faceted lip/muzzle transitions, a flat wedge-like eye rather than an integrated socket, remaining horn collars, repeated checker-like scale flow, an incomplete continuous ventral throat run and immature wing/limb transitions. The fit pass reduced floating construction but did not finish those anatomical issues.

`tools/build_violet_dragon.py`, `tools/refine_violet_dragon.py`, `tools/fit_violet_dragon_surfaces.py`, `tools/violet_dragon_geometry.py` and `tools/violet_dragon_materials.py` are the source helpers. Existing versions/collections are guarded against blind reruns. The original post-Undo recovery and `Space Dragon-v006-first-shape-preserved.blend` are retained; intermediate source/refinement receipts preserve prior hashes rather than replacing them with the final source identity.

A subsequent head close-up exposed floating horn roots and flat throat tiles. The surface-fit pass seats **36 horn roots**, projects **12 scale/scute groups** to actual body/head surfaces, rounds the nose cap and reduces the iris. `surface-fit-receipt.json` records the fit changes. The earlier reviewed source identity was `0457579b7424a1ff61b7d1b264d40637115778dc9ab773cf67b86eed5b6d8a12`, 72,252,973 bytes; the identity above is the later fitted source with unchanged mesh/triangle/bone counts. Four fitted-source full/front/side/head renders are now available, and the local gallery has been regenerated against the matching source hash. Root inspected the latest head view and observed improved fitting gaps; the independent [final source-art assessment](../../artifacts/blender/violet-dragon-v006/art-review.md) now covers all four matching-source views. It retains the earlier review separately and finds that source-game promotion should remain on hold. This correction does not validate skin weighting, animation or a game export.

[Local violet source gallery](../../artifacts/blender/violet-dragon-v006/index.html) compares the first shape, refinement and current source views with selected owner-video frames. Root actually inspected `first-shape-review.png`, `refined-full.png` and `violet-full-body.png`; the records agent also inspected the current full-body PNG. The regenerated gallery now includes all four fitted-source views alongside preserved first/refined iterations. Source appearance remains an early study; gallery availability is not game-ready or cinematic-quality acceptance. The source and video images have different viewpoints/lighting and are not matched-angle or quality-equivalence evidence.

**Runtime boundary:** Unity continues to use the last verified mechanical v005 export while SD-079 closer camera/cadence and SD-081 heavier audio are built/tested separately. This does not reapply the Blender Undo, select mechanical art as the forward direction, or promote the organic source. No organic model is claimed in the current player.

SD-081 adds better/heavier sound work; SD-082 names `gemini_generated_video_c520671c.mp4` for flying/fire-breath reference. The clip was found at repo root and five extracted frames inspected; [reference receipt](2026-10-31-purple-dragon-motion-reference.md). Observed tucked-foot flight, forward neck extension, throat warm-up and broad orange jet inform the candidate; reference use is not publication/runtime-audio permission.

## Checks

| Check | Status | Evidence / limits |
| --- | --- | --- |
| Owner direction and supersession recorded | RECORDED | Exact wording and reference description; no new art result approved. |
| Post-Undo Blender inspection and recovery save | OBSERVED / preserved | Root inspected the actual live post-Undo state and saved the separate `v005-owner-undo-SD080.blend` copy before editing; details above. No new organic source/export success claimed. |
| First organic source/collections and visual inspection | IMPLEMENTED / source views inspected | v006 identity/counts and preserved iterations above. Still a stylized source candidate; no owner art approval or game-ready claim. |
| Organic game export, UV/bakes, rig deformation, sockets and authored clips | NOT VERIFIED / not promoted | New 15-bone anatomy needs its own candidate contract; the old nine-bone assertions do not transfer. |
| Organic Unity build, appearance and interactions | NOT TESTED | No organic GLB/player promotion at the first-source checkpoint. Separate camera/audio work passed its own Web build and both browser suites using prior mechanical v005; that evidence is not an organic promotion. |
| Performance/resource measurements | PENDING | Named device/viewport and artifact identity required. |
| Foundation and scoped whitespace checks | PASS | Documentation only; not source/player verification. |

## Source-gallery checks

`node --check tools/violet-dragon-gallery.mjs` and `node tools/violet-dragon-gallery.mjs` pass. The generator verifies the current source bytes/hash, reads actual local PNGs, and writes `artifacts/blender/violet-dragon-v006/index.html`. It performs no image edits/external fetches and does not replace the SD-078 gallery. New source-view PNGs matching `violet-*.png` can be added, then the gallery regenerated after updating the measured source receipt if the source changed.

## Review and recovery

New organic artwork remains unreviewed by the owner. The reference selects appearance, not biological/story origins or new combat/collision/save rules. Preserve post-Undo recovery and historical source/runtime exports. No purchase, external generation/upload, deployment, commit or push is included. Next useful work is anatomical refinement, then an optimized, baked and deformation-tested game candidate with explicit new rig/socket/clip validation. Complete that separate export/player evidence before claiming integration or game-ready quality.

## October 31 continuation — refinement to player

**CONFIRMED continuation; final bounded verification recorded below.** Exact owner wording: “continue then”. This extends the existing art task; no new ID is allocated. Starting checkout is `feat/town-drive-lab@b89a0fc887ee60a57eac9f5aaad8e2ef588ca3d2` with ongoing Dogfight and concurrent changes preserved. Root is the sole live Blender and Unity writer; this record does not imply a second Editor/build session.

The bounded continuation addresses the face/eye/horn-root construction, wing structure and scale flow identified above, prepares a flight pose and optimized versioned export, and tests the organic candidate in the actual Unity player. Existing controls, combat, spelling/dodging, collision and save boundaries remain the baseline. Export only intended artwork/rig/attachments, excluding reference and review collections. No new external service/upload or deployment is involved.

### v007 source and game preparation checkpoint

The root writer created `Space Dragon-v007-violet-flight.blend`, preserving `Space Dragon-v006-live-before-v007.blend`. The initial v007 source receipt records 183 visible meshes / 252,432 source triangles / 103,483,362 bytes at SHA-256 `7daafd1b41f371d69e171a8cc552688743c4aea7fdafc8fb536b9a29bf267bf1`. That is an intermediate source checkpoint, not the later baked/exported artifact. `artifacts/blender/violet-dragon-v007/face-receipt.json` records continuous orbital skull/mandible forms, recessed eyes/eyelids/nasal pockets, deeper mouth/palate/gums and revised teeth; earlier facial components remain hidden for recovery. Geometry creation does not establish the final appearance or jaw deformation.

`artifacts/blender/violet-dragon-v007/game-preparation.json` records a later working-source SHA-256 `3a5b30d8748d383e2fe76bfe1e45b7fd62ebf17ff50f1cd33ec0805d74ed41ff`, two prepared mesh groups (`VioletGameBody`, `VioletGameWings`), **263,480 triangles**, a separate **15-bone** organic contract, eight attachment markers and three authored actions. These are prepared candidate measurements, not GLB draw calls or a performance result. The intermediate actions carry `.001` suffixes, and wing/thruster socket suffixes are uppercase; export/runtime adapters must resolve those explicitly and verify the final names. No old nine-bone binding assertion transfers automatically.

The file-only [bake helper guide](../../tools/BAKE_VIOLET_DRAGON.md) defines separate 2048 body and 1024 membrane bake candidates, each with its own receipt/fingerprint. Diffuse color-only, tangent self-bump normal, roughness and AO are separate passes; ORM packs AO/roughness/zero metallic. Eye/emission/mouth remain protected. Explicit membrane inclusion approximates it as opaque, double-sided core PBR; transmission/subsurface/sheens are not reproduced. Separate combined-mesh AO omits body/wing mutual occlusion. Bake outputs and final materials need inspection and actual glTF/Unity checks; UV validity alone does not prove non-overlap or equal texel density. No helper starts Blender or saves/exports the scene.

### Completed bake passes and first corrected export checkpoint

The root writer executed all body **2048×2048** and membrane **1024×1024** passes and finalized their materials. Actual sizes, SHA-256 values and per-pass durations are recorded in `assets/game/local/spacecraft/space-dragon-spacecraft/violet-v007/body-bakes/bake-receipt.json` and the adjacent `wing-bakes/bake-receipt.json`. Both retain separate base-color, tangent-normal, roughness, AO and packed ORM PNGs; export uses the base-color/normal/ORM triplet for each surface family. These are procedural self-bakes, not high-to-low sculpt detail or guaranteed source scattering parity.

The first membrane bake exposed **64 collapsed or near-zero-area wingtip/cap faces**. Root removed those candidate-only faces before rebaking; the game geometry is now **263,352 triangles**, superseding the 263,480 preparation count. Earlier source geometry remains available. A later export inspection found that `export_apply` ignored the object-level material overrides and emitted old procedural materials despite the Blender viewport assignment. That first export did not pass material parity. Root corrected only the game mesh's DATA material slots, consolidated slots and triangulated before exporting again. The helper now makes shared candidate mesh data single-user and assigns DATA slots for future finalization; existing source shaders and earlier receipts remain intact.

The corrected, **pre-optimization** export checkpoint is:

| Artifact | Recorded result |
| --- | --- |
| Source | `Space Dragon-v007-violet-flight.blend`, SHA-256 `d4b0e423fc4194a66fe1e5f365a5b0b115ac48b5f467472dc5c51a1564e590ce`; exporter records source unchanged |
| GLB | `assets/game/local/spacecraft/space-dragon-spacecraft/violet-v007/dragon-violet-v007.glb` |
| GLB identity at this checkpoint | **35,876,048 bytes**, SHA-256 `9587681b83ac50d4d7bdc7c01d74f6f916d5520b712a62fbb21b3d0da1e62e42` |
| Structure | **2 meshes / 263,352 triangles / 5 materials / 6 texture maps**; separate 15-bone organic rig |
| Canonical clip names | `Boost`, `Flight`, `Glide`; the intermediate `.001` action suffixes are resolved in export |
| Tangent correction | **30 invalid tangents repaired**, zero collapsed-UV fallback repairs in the corrected export receipt |
| Current verification boundary | Organic structural check reported passing by root; optimization, full validator evidence and actual Unity import/player checks remain separate |

`assets/game/local/spacecraft/space-dragon-spacecraft/violet-v007/export-receipt.json` owns the export identity. A later optimized artifact must receive its own measurements/hash; do not treat this checkpoint's bytes as a final shipped size. The source/exclusion/material corrections above do not establish appearance, animation quality, effect alignment or runtime performance.

### Visual bake failure and UV allocation correction

Actual inspection subsequently found white/black triangles bleeding into the first body atlas appearance. Moving small separate scales, teeth and keratin to explicit PBR constants and rebaking only continuous skin initially made the result worse: `body-bakes-r2` had large dark/light patches. Those completed file passes were **not a visual pass**. The records agent inspected the r2 base-color PNG and found an almost entirely black atlas with only tiny purple islands; it is retained as failed evidence.

Root traced the cause to Blender selection mode: setting polygon selection while vertex-selection mode remained active left thousands of tiny geometric scales selected during unwrap. Their packing margin reduced continuous-skin UV area to approximately **0.000036**. Root explicitly switched to face-selection mode, cleared vertex/edge selection, selected only **23,710 continuous-skin faces**, and re-unwrapped. Measured skin UV area became approximately **0.4704**. The bake helper's per-slot copies did not alter polygon indices; its nonzero/in-range UV checks had correctly not proved useful texel allocation or non-overlap.

After the completed r3 bakes, the helper gained a future-run guard: sum eligible-face UV area and record face count plus `area × resolution²` pixel-area estimate; refuse aggregate area below **0.01** with explicit unwrap/selection diagnostics. Overlap can inflate the sum, so this is not non-overlap or unique-pixel coverage evidence. Syntax/whitespace checks pass; the new guard was not used retroactively to generate the completed bakes. Earlier receipts/fingerprints remain unchanged.

Root also seated eight horn roots by adjusting **73 vertices per root** in source and candidate while preserving the tips/caps. Small geometric scales/teeth/keratin now retain separate PBR constants, reducing atlas demand. At that checkpoint a third skin bake (`r3`) followed the selection/UV repair. The resulting identities and checks are recorded in the next sections; the earlier d4b0/958768 export checkpoint is historical, not the final repaired candidate.

### Corrected r3 source views and optimized candidate

The third skin bake completed in `body-bakes-r3` with **23,710 continuous-skin faces** at 2048 resolution; original 1024 membrane bakes remain. Root inspected `head-final.png`, `chase-final.png` and `flight-final.png`, and the records agent independently viewed all three. The earlier broad black/white head-atlas defects are gone and crown roots are seated. The head remains smooth/stylized compared with the reference. The current rear chase render also retains two conspicuously pale circular cap-like surfaces at the rear feet/claw bases; do not label those remaining details finished merely because the large bake failure was fixed.

[The separate v007 gallery](../../artifacts/blender/violet-dragon-v007/index.html) presents those actual views, the preserved v006 head/body study and local reference frames. It verifies current source/GLB file hashes and stores image identities in `gallery-receipt.json`. Earlier and reference cameras differ; this is not a matched-angle rendering comparison. No external requests or image edits occur, and raw reference video remains a local link only. `node --check tools/violet-flight-gallery.mjs` and `node tools/violet-flight-gallery.mjs` pass; this does not verify Unity appearance.

The already-open [Dogfight art review page](../../artifacts/unity/dogfight-art-review.html) now has a prominent link to the v007 gallery. Its earlier SD-077 player screenshots and claims remain unchanged below the new link; no old evidence is relabeled as the organic candidate.

| Current corrected artifact | Recorded result |
| --- | --- |
| v007 source | **151,756,773 bytes**, SHA-256 `4f0c14cead3303d68ee18e4e0070f102f5ec0320c145c778ee7b616db05a1870` |
| Corrected unwelded export | **37,364,876 bytes**, SHA-256 `07c5d8be03f7dedebddfdc8a3d135b09f08e35345f2c5d5f6a7edee3ee2b69e8`; preserved as `dragon-violet-v007-unwelded-07c5d8be03f7.glb` |
| Optimized `dragon-violet-v007.glb` | **36,615,112 bytes**, SHA-256 `0df6f9fdb1d33e5142ffd4e05de83c55664a69a17277c801a6e96f509453eaff` |
| Final export structure | **263,352 triangles / 2 meshes / 12 primitives and materials / 6 maps / 15 bones / 8 sockets / 3 clips** |
| Optimizer evidence | **749,764 bytes saved (2.01%)**; corner attributes, image bytes, node transforms/hierarchy and retained animation samples/targets unchanged. Removes unused animation samplers/orphan accessors; no geometry/detail reduction claimed. |
| Khronos validator | **0 errors / 2 warnings / 76 informational messages**. Warnings are non-root skinned mesh nodes; informational messages include 10 unused tangents, 58 unused objects and eight empty socket nodes. Not a zero-warning result. |

Optimization evidence is in `optimization-verification.json`; `khronos-validation.json` names the same optimized hash. The per-primitive vertex sum changes because shared accessors were counted repeatedly; actual unique position vertices stay **361,614** and unique attribute bytes stay **24,589,752**. Do not report the old 3,851,534 sum as unique source vertices or infer a large polygon reduction. These are export/storage checks, not frame-time or visual-fidelity evidence. At this export checkpoint Unity import/play had not yet been checked; the subsequent player evidence follows.

### Historical CPU-build checkpoint — retained failure and measurements

The first organic Development Web build **succeeded** at `2026-11-01T01:07:49.8576820Z`: **148,461,285 bytes / 304.98 seconds**, Unity `6000.6.7f1`, GLB `0df6f9…eaff`, project settings restored. Log: `artifacts/unity/dogfight-web-20261101-010159-719-17708.log`. This player used CPU skinning. The subsequent GPUBatched-configured build is recorded below; these checks remain evidence for this earlier artifact, not its successor.

Root inspected all three actual Unity captures (`blender-neutral`, `front`, `side`) from `artifacts/unity/violet-inspection/runs/2026-11-01T01-09-17-364Z/report.json`. [Separate visual-review note](../../artifacts/unity/violet-inspection/visual-review.md) records matching body/silhouette/rig arrangement, stronger/hotter highlights on head/horns, brighter wing tops/darker undersides, edge/small-scale specular aliasing and the absent Blender studio floor. The full-flight camera is matched, while lighting is not equivalent. Raw capture report remains unchanged; file existence is not substituted for review.

The first WebGPU encounter run (`artifacts/unity/violet-playtest/runs/2026-11-01T01-10-46-773Z/report.json`) passed **11/11** cases with zero console/page/failed/external requests and an unchanged scoped localStorage sentinel. Plasma, windup, beam and core-beam origin checks measured **0 m** error from the imported mouth socket. Root inspected natural flight and the screenshot named `breath-windup.png`; it actually depicts the beam after simulation advanced during capture, so its filename is not proof of the earlier windup frame.

The initial forced-WebGL2 run (`artifacts/unity/violet-playtest-webgl2/runs/2026-11-01T01-14-12-309Z/report.json`) is retained as **10/11 PASS / one FAIL**. The visible-beam wait timed out after blocking screenshot capture advanced past the attack; its last snapshot already recorded one attack fired and resolved. Root corrected the external harness capture timing. This is not evidence for changing combat timing or erasing the failed run; its later corrected rerun is recorded separately below.

| CPU-build natural-flight checkpoint | Mean / p95 interval | Frames | Last-frame draws / triangles | Unity texture counter |
| --- | --- | ---: | --- | --- |
| WebGPU | 34.464 / 54.000 ms | 293 | 370 / 920,962 | 1.169 MiB — known undercount |
| WebGL2 (suite later failed capture wait) | 55.317 / 73.000 ms | 183 | 231 / 819,348 | 144.756 MiB |

Installed Chrome `156.0.8078.76` / AMD ANGLE, 1366×768. Gzip response bodies total **58,597,675 bytes** per run. These short wall-clock samples occurred while `npm check` ran concurrently; they are not an isolated performance benchmark, GPU timing or exact driver VRAM. CPU skinning is a suspected cost motivating the next build, not a proven isolated explanation of all slowdown. Report the subsequent artifact and rerun separately before final verification.

### Current GPUBatched-configured build — first samples under concurrent workload

The next Development build **succeeded** at `2026-11-01T01:24:33.8193339Z`: **148,461,303 bytes / 164.9648655 seconds**, same organic GLB `0df6f9…eaff`. Log: `artifacts/unity/dogfight-web-20261101-011920-174-36176.log`. The build receipt records `configuredMeshDeformation: GPUBatched`, original/restored project setting `CPU`, and `settingsRestored: true`. This proves the requested build configuration; actual backend execution/fallback and performance need player evidence, not inference from the setting alone.

`artifacts/unity/violet-gpu-skinning-playtest/runs/2026-11-01T01-25-22-561Z/report.json` passes **11/11 WebGPU cases**, zero console/page/request/external errors, unchanged scoped localStorage, and zero measured mouth-origin error for plasma, windup, outer/core beam. The sample is **18.636 ms mean / 28.999 ms p95 / 539 frames**, last-frame **368 draws / 918,564 triangles**, **1.169 MiB** undercounted texture API value, **58,597,684 gzip response-body bytes**. This run still overlapped the repository-wide npm workload; it is not the final isolated benchmark. Subsequent forced-WebGL2 and isolated results are recorded in the final verification section.

The broader `npm check` was explicitly interrupted after **27 completed development browser cases: 25 PASS / two FAIL**, under concurrent workload, with frame-starvation symptoms observed. Its unit/build portions completed successfully, but **the full npm command did not pass**. `artifacts/violet-contract-audit/npm-check-interrupted.json` records the scoped interruption at `2026-11-01T01:30:14.1894501Z`; copies of both failures/traces remain in `artifacts/violet-contract-audit/legacy-failures-under-load/`. The failed cases concern First Contact keyboard checkpoints and Town Drive moving-minivan focus/pause/reset. Root is rerunning applicable legacy checks without competing work using the repository-supported installed-Chrome option. Keep failure/retry outcomes and final Unity performance separate. Removing the competing work and selecting installed Chrome also changes the rendering backend; an eventual pass does not isolate the earlier cause or establish a software-rendered CI pass. No blanket repository pass is claimed at this checkpoint.

### Final player verification and isolated performance

The current Development player is the **2026-11-01T01:24:33.8193339Z** build above, using organic GLB **0df6f9…eaff** and configured `GPUBatched`, with original project `CPU` setting restored. Current tested source HEAD is `b89a0fc887ee60a57eac9f5aaad8e2ef588ca3d2` on `feat/town-drive-lab`, with uncommitted local changes preserved. No deployment or push occurred.

- **WebGPU: 11/11 PASS**, `artifacts/unity/violet-gpu-skinning-playtest/runs/2026-11-01T01-25-22-561Z/report.json`.
- **Forced WebGL2: 11/11 PASS**, `artifacts/unity/violet-gpu-skinning-webgl2/runs/2026-11-01T01-28-28-074Z/report.json`.
- Both full runs report zero console/page/request/external errors, unchanged scoped localStorage, and **0 m** error for plasma, windup, outer/core-beam origins against the actual imported mouth socket. Flight/aim modes, boost/zoom, evasion, live spelling, breath, missiles, salvage, repairs, collision/recovery and pause/restart are covered by named cases.
- Root inspected the current WebGPU `natural-flight.png` and `breath-attack.png`; the latter visibly captures the actual beam. Root also inspected all three **final-build neutral views** (`blender-neutral`, `front`, `side`) from `artifacts/unity/violet-final-inspection/runs/2026-11-01T01-42-53-909Z/report.json` alongside source `flight-final.png`. [Final observed comparison](../../artifacts/unity/violet-final-inspection/visual-review.md) records matching silhouette/pose/camera, intact purple materials/horns and no exploded mesh, plus hotter/shinier Unity head/horns, brighter membrane side/dark undersides, small-scale specular aliasing and the absent source studio floor. Smooth/stylized face, repetitive scales and cap-like feet remain art limits. Raw capture report is unchanged; zero browser errors/failures/external requests and `{}` storage before/after apply to that isolated inspection. The earlier CPU neutral comparison remains historical evidence.
- **Final exact-code EditMode: 74/74 PASS**, zero failures/skips, **0.3584109 seconds**, `artifacts/unity/dogfight-editmode-20261101-014202-708-15624.xml`; log `dogfight-test-20261101-014202-708-15624.log`. This fresh run includes the final telemetry/GPUBatched code. The earlier `dogfight-editmode-20261101-005654-235-33452.xml` also passed 74/74 but preceded those changes and remains historical evidence.

After stopping the competing npm workload, separate performance-only runs each passed their one natural-flight case. They are additional measurements, not substitutes for the full suites:

| Backend / isolated run | Mean / p95 frame interval | Approx. fps | Frames | Last-frame draws / triangles | Unity texture counter |
| --- | --- | ---: | ---: | --- | --- |
| WebGPU, `violet-isolated-webgpu/runs/2026-11-01T01-31-56-833Z/report.json` | **17.207 / 21.000 ms** | **58.115** | 584 | **359 / 676,554** | **1.169 MiB**, undercount |
| WebGL2, `violet-isolated-webgl2/runs/2026-11-01T01-32-22-260Z/report.json` | **41.184 / 63.000 ms** | **24.281** | 245 | **317 / 891,612** | **144.756 MiB**, scene allocation counter |

Paths above are relative to `artifacts/unity/`. Installed **Chrome 156.0.8078.76 / AMD ANGLE**, actual **1366×768** canvas. Both isolated runs report zero browser errors/failures/external requests and unchanged scoped storage. Gzip response bodies total **58,597,684 bytes**. These are short wall-clock intervals, not GPU timings, exact VRAM or endurance results. Scene/camera and rendered triangle counts differ across samples; no single cause of the backend difference is established. `GPUBatched` configuration is not proof of the actual skinning execution path or absence of fallback.

**WebGL2 falls below the proposed 30 fps reduced-quality target.** The functional suite passes, but fallback performance does not meet that target. The next useful technical work is measured LOD/rendering-cost reduction, followed by another isolated sample; do not hide this limitation behind the WebGPU result. The next art work concerns the visible foot caps, wing/limb transitions and remaining smooth/stylized facial construction. Owner quality approval, human sound/comfort, physical controller/mobile coverage and sustained performance remain open.

### Complete installed-Chrome repository QA retry

The isolated `npm.cmd run check` with the repository-supported `SPACE_DRAGON_NATIVE_CHROME=1` option **exited 0**. Log: `artifacts/violet-contract-audit/npm-check-native-isolated.log`. **237 unit tests, build, 49 development browser cases, nine production browser cases and all 18 reference inventory/hash checks pass.** The earlier failing Town Drive case passes as development case18 and First Contact keyboard checkpoints pass as case21. Reference checks are inventory/hash checks, not likeness or publication approval.

The interrupted prior run remains recorded above. This retry used installed Chrome and removed competing workload; both backend and workload conditions changed. Its success does not isolate the earlier failure cause or establish a SwiftShader/software-rendered CI pass. It completes the named local target-browser QA, separately from the Unity player's full suites and isolated performance samples.

| Continuation check | Final scoped result | Evidence / remaining limitation |
| --- | --- | --- |
| Refined source/recovery and bake correction | IMPLEMENTED / inspected | v007 source and repaired views recorded; Undo/v006/mechanical rollback preserved. Owner art approval open. |
| Organic export and intake | VERIFIED structurally, with validator warnings | 263,352 triangles, 2 meshes, 12 materials, 6 maps, independent 15-bone profile, canonical clips/eight sockets; exact hashes above. |
| Final exact-code EditMode checks | PASS 74/74 | Fresh 01:42 XML above; zero failures/skips, 0.3584109 seconds. Separate from actual player observation. |
| Actual Unity materials/framing | FINAL BUILD OBSERVED | Final 01:42 neutral three-view comparison plus current flight/beam screenshots; source camera/silhouette intact, hotter highlights, aliasing and source foot/face limits remain. |
| Flight, combat, animation/effects and recovery | VERIFIED for named cases | Both final 11-case suites pass; zero measured mouth-origin error; saves scoped and unchanged. |
| Device/resource measurements | MEASURED; fallback target missed | Separate isolated samples above; WebGL2 24.3 fps is below 30 fps target. |
| Broad repository npm checks | PASS on installed Chrome | Complete isolated retry exits 0: 237 units, build, 49 development, nine production and 18 reference inventory/hash checks. Earlier interrupted software-rendered run and failures remain retained; no software-CI pass inferred. |
| Owner appearance/release approval | NOT APPROVED | Continuation authorized work; technical checks do not approve final art or deployment. |
