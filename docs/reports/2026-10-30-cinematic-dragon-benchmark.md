# Cinematic dragon first-section benchmark — verification receipt

Date: October 30, 2026. State: **IMPLEMENTED and technically VERIFIED for the named local asset/browser checks; full repository wrapper FAIL**. This receipt records the new SD-059 candidate only; earlier red-model and asteroid/audio checks are historical baselines, not verification of the new asset. Intermediate results below identify their own files and are not transferred to the final export. Human art/comfort approval and release approval remain separate.

## Scope

- Authorization: [SD-059](../decisions/2026-10-30-cinematic-dragon-benchmark.md), head/neck/one-shoulder first, preserving originals and testing the export before extending the whole body.
- Base: `feat/town-drive-lab`, `9e7de19572b90f14d09da90a0e3e08fe1bcdd78a`, with existing uncommitted Dogfight, Town Drive and Sonniss work. During verification, a concurrent owner commit moved HEAD to `a4277da7b546f3294ce2018771669b34831a07d0` ("Map Starpass home exit and add minivan cabin and lived-in streets"). This task's Dogfight work remains uncommitted; no reset, commit, push or deployment was performed for it. Tested file identities below distinguish the dirty runtime from HEAD alone.
- Source baseline: `assets/source/local/spacecraft/space-dragon-spacecraft/Space Dragon Spacecraft-v002.blend`; retain the red game derivative and existing versioned/legacy runtime assets too.
- Target: this Lenovo laptop with installed Chrome. Live Blender MCP preflight reports Blender 5.2.1 LTS, addon 1.8/protocol 15, telemetry off, with the supplied v002 open and dirty. That session was preserved in a recoverable copy before a separate background build; final candidate identities and runtime sample are below.

## Preserved baseline at preflight

These bytes and SHA-256 values were re-read from disk for this task using PowerShell `Get-Item` and `Get-FileHash -Algorithm SHA256`; they match the previous receipts. They identify the originals to preserve, not a new upgrade export. A first shell formatting attempt failed to parse before reading files; the corrected read-only command returned the values below.

| Existing file | Bytes | SHA-256 |
| --- | ---: | --- |
| `Space Dragon Spacecraft-v002.blend` | 11,971,962 | `5214e4c82053d41d42bc55062353b998cc59a2a2a2c76d294d88a39665690439dc` |
| `Space Dragon Spacecraft-v002-game-red-v001.blend` | 21,112,866 | `6d9e30333d5cc8401081f0a569e9c5e8c494e7063bde2de9f314baca88958f99` |
| `public/assets/dogfight/models/dragon-mechanical-red-v001.glb` | 5,285,276 | `5812435c9ac760ab8efb2d3c4b2f597fc8a6a9a1e0331ae907049dd8ffbbd9a7` |
| `public/assets/dogfight/models/dragon.glb` | 1,525,544 | `4d38601d5bd8022efce27aa6df26f36d4e8173189612a82022f5f1be62e5cec2` |

The two Blender files are under `assets/source/local/spacecraft/space-dragon-spacecraft/`. The [prior asset receipt](2026-10-30-mechanical-dragon-integration.md) records the red candidate at 82,348 triangles, 43 mesh primitives, eight materials and zero embedded texture images, against 135,780 triangles/706 visible source meshes. Those are historical structural measurements until independently rechecked in this pass.

Current code inspection of `src/prototypes/dogfight/config.js` confirms chase distance 11.5 m, height 4.2 m, look-ahead 42 m, base FOV 61°, held aiming FOV 40°, fast/boost FOV 66°/74°, DPR cap 1.6 and exposure 1.1. These are configured values; projected-pixel and runtime observations are separately identified below. Existing `DRAGON_BONES` are `Root`, `Wing_L`, `Wing_R`, `Jaw`, and `Tail_0`–`Tail_4`; no neck/leg joint is declared by that runtime contract. Report static clearance separately from motion that is actually exercised.

`artifacts/cinematic-camera-baseline.mjs` projects actual vertices from the retained raw mechanical GLB through the runtime `ChaseCamera`, at 1366 × 768 and render pixel ratio 1. `artifacts/cinematic-camera-baseline.json` records the complete section membership and bounds. This is **mathematical screen coverage in the rest pose**, including occluded vertices, not a GPU timing or visibility measurement.

| Baseline section | Distance to camera at section center | Cruise coverage, FOV 61° | Held RMB coverage, FOV 40° |
| --- | ---: | ---: | ---: |
| Head | 14.67 m | 62 × 59 px | 101 × 95 px |
| Neck | 13.38 m | 57 × 68 px | 91 × 110 px |
| Left shoulder | 12.70 m | 45 × 33 px | 73 × 53 px |
| Whole dragon | 11.17 m | 561 × 272 px | 908 × 441 px |

These projected scales justify starting with a 1024-square atlas for the first section, allocating greater density to the head, rather than defaulting to a 4K texture. This is a **chosen trial budget**, to be checked for close-up quality, mip behavior and cost after baking/export; it is not proof that the final asset meets a performance target. The left shoulder is the routine implementation choice for the requested one-shoulder benchmark.

## First source and game candidate — intermediate evidence

The dirty live Blender session was saved to `Space Dragon Spacecraft-v002-live-recovery-SD059.blend` before background work. `artifacts/cinematic-live-recovery-comparison.json` compares 747 mesh datablocks and reports identical geometry, transforms, visibility, material assignments, bone rest transforms and Principled constants against the saved original. The preserved baseline hashes above remain unchanged.

New sources under `assets/source/local/spacecraft/space-dragon-spacecraft/`:

- `Space Dragon Spacecraft-v003-silhouette.blend`: primary-form checkpoint. `assets/game/local/spacecraft/space-dragon-spacecraft/cinematic-v001/stage1-front.png`, `stage1-side.png` and `stage1-three-quarter.png` were shown before fine detail.
- `Space Dragon Spacecraft-v003-cinematic.blend`: detailed source with 687 visible meshes and 189,556 evaluated triangles at first reopen. Its separate `Original v002 - comparison only`, `Cinematic Upgrade - head neck left shoulder` and `Retained Body - unchanged geometry` collections preserve comparison and bounded edit scope; the review studio and organic recovery geometry remain separate.
- `Space Dragon Spacecraft-v003-game-v001.blend`: intermediate optimized source with `Game Candidate - optimized v001`, 41 visible render meshes and 82,020 triangles at first reopen. Source reopen evidence is retained in `artifacts/cinematic-source-reopen.log`. The corrected game source is v002, identified separately below; this v001 source remains a local comparison.

The upgrade adds layered predatory brow/cheek/skull armor, swept-back integrated horns, a deeper toothed articulated jaw, rotary jaw mechanisms, overlapping neck armor and a layered left shoulder. Body geometry outside the selected section is retained while its palette adopts the new material family. Six authored surface roles become ten glTF material instances where textured first-section and retained-body versions differ: dark paint, crimson paint, directional metal, flexible graphite joints, structured crimson membrane and restrained internal energy. Dark paint is nonblack and mostly nonmetallic; runtime material handling preserves authored normal/AO/roughness maps and intentionally quiet paint rather than overlaying generic grain.

The 1024-square section UV layout gives the head **1.5× linear UV density** relative to other selected surfaces. Real Cycles selected-to-active bakes use matched exploded source/game pairs for high-to-low normals, preventing adjacent plates from projecting onto each other. The pairs are restored to the assembled position for a separate AO bake; roughness is also baked. Source working images remain separate; the first GLB embeds one normal PNG and one combined AO/roughness data PNG. AO is sampled independently from base color; no reference image or old `dragon_scales.png` is exported. Exported geometry has no new required decoder or baked animation clips; the retained nine-bone runtime animation remains responsible for movement.

First optimized export was 9,712,088 bytes (`840bea8d4c435d61a29020d65a4bff8e2032a38cd865b6953c142e43af344eba`). A lossless glTF Transform weld merged only bitwise-identical vertices, without quantization, simplification or node pruning, yielding the first promoted candidate:

| Intermediate runtime candidate | Value |
| --- | --- |
| Path | `public/assets/dogfight/models/dragon-cinematic-benchmark-v001.glb` |
| Bytes / SHA-256 | 7,952,852 / `03b8f52a3245838c87d3fd12cee782e0a7fc0c165bbf59240b83fb4717d7a4a4` |
| Geometry | 41 primitives, 82,020 triangles, 953 nodes |
| Skeleton / component contract | Nine joints, identical inverse-bind matrices, all 706 prior component pivots retained, maximum measured pivot error 0 |
| Materials / images | Ten material instances from six roles; two embedded 1024 × 1024 PNG data maps |

`artifacts/cinematic-weld-verification.json` independently passes that artifact's contract. It is **not the final texture-corrected identity**. `ACTIVE_DRAGON` selects the cinematic descriptor; retained mechanical-red and legacy-organic descriptors/files provide rollback. The material pass marks authored surfaces so no automatic procedural detail overwrites their exported maps.

## Corrections found through inspection

The first articulation audit exposed shoulder/wing intersections and jaw-servo placement issues. Those were corrected before the first promoted candidate. `artifacts/cinematic-articulation-audit.json` now records zero tested triangle-edge crossings across seven named wing poses plus a 51-pose envelope sweep, comparing the selected shoulder surfaces with 434 Root-bound meshes; twenty lower-jaw meshes also have no tested crossings at idle, ordinary-fire and beam poses. Rotary servo axis offsets remain at floating-point scale (maximum approximately `5.9e-8` m).

This is a sampled triangle-edge audit, not a proof against every collision: coplanar contact, complete containment and intentional hinge overlaps are excluded. The envelope is conservative, not a claim every simultaneous angle is reachable. No independent neck bone exists, so neck bending and landing/leg articulation remain **NOT TESTED** rather than inferred from plate spacing.

Browser comparison then exposed visible lower-jaw normal/tangent artifacts. The corrected v002 authoring pass triangulates the game mesh before UV unwrapping/baking and exports matching explicit MikkTSpace tangents. Actual renderer A/B inspection also showed exaggerated, undersampled bevel reflections on painted surfaces; restrained normal amplitudes were applied to the painted materials. The corrected artifacts and pipeline changes are identified below; intermediate checks do not establish the final export's verification.

The comparison harness `tools/review-dragon.mjs` uses the actual Dogfight GLTF loader, material treatment and bone animation in an isolated browser scene. It now supplies thirteen views per model, including front/side/full/head/shoulder/jaw plus normal-off/AO-off diagnostics; neutral and cinematic lighting use a 7 × 5 soft rectangular key and runtime PMREM reflections, with no bloom. The 26-image comparison completed without browser errors and made the defect visible; error-free image capture is not appearance acceptance or actual gameplay verification.

## Intermediate installed-Chrome sample

`tools/benchmark-dogfight.mjs` sampled actual live combat with the initial promoted candidate and a fresh red rollback under the same 1366 × 768, DPR 1 setup. Chrome was 156.0.8078.76 using `ANGLE (AMD, AMD Radeon (TM) Graphics (0x000015E7) Direct3D11 vs_5_0 ps_5_0, D3D11)`. The candidate run loaded without page/console errors and produced the values below in `artifacts/cinematic-upgrade-game.json`; the paired baseline is `artifacts/cinematic-baseline-game.json`.

| Ten-second run | Mean frame interval | p95 | Estimated fps |
| --- | ---: | ---: | ---: |
| Fresh retained red model | 16.891 ms | 17.1 ms | 59.20 |
| First cinematic candidate | 17.181 ms | 17.1 ms | 58.20 |

The candidate sampled 583 frames across 10,016.6 ms and took approximately 5,452 ms from navigation to observed ready. Its final sampled whole-frame counters were 194 calls and 268,502 triangles, including other scene/shadow/postprocessing work; the counters are not dragon-only cost. This is a short, comparatively simple idle-flight combat sample under variable desktop load, **not sustained 60 fps, a complete gameplay benchmark or final-art evidence**. The corrected export's separate final sample follows below.

## Corrected v002 artifact — frozen for final checks

The active runtime descriptor is `space-dragon-cinematic-benchmark-v002`, loading `public/assets/dogfight/models/dragon-cinematic-benchmark-v002.glb`. It matches the preferred local `assets/game/local/spacecraft/space-dragon-spacecraft/cinematic-v002/dragon-cinematic-benchmark-weld-v002.glb` byte for byte. The rejected cinematic v001 public copy was removed only after confirming its matching local SHA-256; it remains locally available for diagnosis. The older red mechanical and organic runtime files remain unchanged and available for rollback.

| Final candidate artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| Runtime / preferred welded v002 GLB | 9,642,948 | `4d1a735cd2c20daa1941626f4522f41ebfc768b014020923e1db6495eb1684a5` |
| Detailed source `Space Dragon Spacecraft-v003-cinematic.blend` | 21,735,490 | `3185e276fa30f7963cb802724a26ac0507bc0b4a71d0d1490256ec5ca1a4d67f` |
| Game source `Space Dragon Spacecraft-v003-game-v002.blend` | 44,531,772 | `e12827d3dd89ad5903e4ab2462e403fa3c6e87b8723eb19f6bc27f4121f22fae` |

The Blender sources remain under `assets/source/local/spacecraft/space-dragon-spacecraft/`. Final export has **41 primitives, 81,991 triangles**, nine joints, 706 retained historical component pivots and two embedded 1024-square PNG maps (normal plus packed AO/roughness). `artifacts/cinematic-final-file-verification.json` independently passes finite/normalized weights, UV/map/tangent structure, exact inverse-bind equality and zero maximum pivot error. Source/game files were reopened and the final export metadata updated.

Twelve mapped primitives export explicit matching MikkTSpace tangents. Post-export weld cleanup removes 29 repeated-index zero-area triangles and repairs 84 zero tangent vectors: 82 reconstructed from adjacent valid UV derivatives, two collapsed-UV cases using a stable orthogonal fallback. No component nodes are pruned, no geometry quantization or external decoder is introduced, and texture images are not recompressed. The resulting triangle count is 29 lower than the intermediate candidate, not evidence of a new broad decimation.

Dark paint uses normal scale 0.18, crimson paint 0.22 and mapped exposed metal 0.72, selected after actual browser normal-on/off comparison. This preserves fine response while avoiding the exaggerated bevel response seen on the first export. The prepaint candidate remains local; final tuning changes material constants only, with its binary geometry/texture chunk unchanged. Baked AO remains separate from base color; emission does not depend on bloom.

The final frozen-export validator reports zero errors, 41 non-root skinned-mesh warnings and 29 unused-UV informational entries (`artifacts/cinematic-final-gltf-validate.log`). No invalid/generated tangent or degenerate-triangle issues remain. `artifacts/cinematic-final-public-verification.json` independently verifies the actual public copy. The original blue/red source files and red/organic GLBs were rehashed after the new export; all four original hashes remain unchanged.

The first v002 gameplay benchmark attempt stopped because it observed `ready` instead of `playing`, and produced **no valid frame-rate measurement**. Development reload was a possible explanation, not an established cause. The harness now clicks the real Launch control and requires `playing` before sampling. The successful fresh sample is recorded separately below rather than reusing the intermediate frame rate.

## Final browser review, playthrough and measured cost

The final comparison is `artifacts/cinematic-delivery-review/index.html`, with 28 images (fourteen per model) using the same camera/lighting setups for red rollback and corrected cinematic v002. It contains neutral/cinematic front, side, full-body, head and shoulder views plus jaw, normal-off, AO-off and subtle-paint diagnostics. The shoulder camera was corrected to show the actual upgraded left side, and all delivery views were regenerated. The receipt reports zero browser errors; head, full-body and left-shoulder images were visually inspected in the actual browser material path. This is agent visual review, **not owner approval**, and does not claim the image exactly matches the supplied cinematic reference. `tools/review-dragon.mjs` and `tools/templates/dragon-review.html` reproduce the local comparison gallery.

`artifacts/cinematic-delivery-performance.json` is the final independent ten-second gameplay sample: installed Chrome 156.0.8078.76, AMD Radeon integrated graphics through ANGLE/D3D11 (`0x000015E7`), 1366 × 768 viewport and canvas, DPR 1. It observes actual `playing` state before timing. No SwiftShader or emulated-device result is presented as this native measurement.

| Final v002 measurement | Observed value |
| --- | ---: |
| Sample duration / frames | 10,016.4 ms / 601 |
| Mean / p95 frame interval | 16.66622 ms / 17.0 ms |
| Estimated frame rate | 60.0016 fps |
| Model fetch and parse | 142.9 ms |
| Shader compile | 652.7 ms |
| Application ready | 2,316.9 ms |
| Navigation to externally observed ready | 4,665.4 ms |
| Sampled whole-frame render work | 194 calls / 268,444 triangles / 5,200 points |

The fresh retained-red comparison sampled 198 calls/269,158 triangles and about 59.20 fps. These short runs under variable desktop load **do not establish a causal speed improvement or sustained 60-fps performance**. They do establish that this local candidate can run near the target in the named scene/sample. File size is 9,642,948 bytes; loaded texture/resource counts and timings remain distinct from actual GPU memory, which was not measured.

The actual-input playthrough is separate from that timing run: `artifacts/cinematic-final-playtest.mjs`, its JSON and log. It verifies mouse flight with cursor-aligned aim, mouse aim-only mode, LMB firing with jaw movement, both Q/E rolls, glide and tail motion, RMB zoom, four letter presses to charge, target-lock acquisition, Sound on, Space windup/roar, continued ArrowRight movement during windup, sustained beam and exactly one impact. Pause freezes articulation and attack progress and releases audio; resume completes the same attack. Restart restores three targets and 100 health; reload returns to ready and the return link opens the homepage. Two completed rolls and one breath hit were observed across the exercised phases. Muzzle alignment error during firing was approximately `7.1e-15` m, below the `1e-5` assertion. Zero unexpected page/console errors or external HTTP requests were observed. Audible speaker quality, physical comfort and human difficulty were not tested by those Web Audio/control observations.

The runtime manifest now registers the cinematic v002 identity, size, count and two-map evidence, marks the red mechanical candidate as rollback and retains the organic fallback. Built Dogfight model output contains the cinematic, red, organic and drone models; rejected cinematic v001 and private Blender/review/recovery sources are excluded. The full repository check finished with an error exit after **191 units/build passed and 40 of 43 development browser cases passed**. Its three failures are retained below; there is no all-project pass.

## Full-suite failures and targeted follow-up

`npm.cmd run check` exited 1, with its 43-case development browser stage taking approximately 35 minutes. `artifacts/cinematic-repository-check.log` preserves the complete run; failure traces/error contexts were archived under `artifacts/cinematic-fullcheck-development-results/` before any retry. Because this command chains stages, it did **not** reach production tests or its final photo-verification command. The separately executed 18-photo check remains valid and separately identified.

1. **Dogfight W/A/D/Z and rolls**, `tests/dogfight.spec.ts:79`: the 15-second wall-clock roll-completion assertion expired after the simulation advanced approximately 1.00 of the required 1.05 seconds; health was 100 and state remained playing. The three simulation-progress waits were changed from 15 to 40 seconds; the isolated retry using the same default SwiftShader path **passed** (1.3-minute case, 1.4-minute run) in `artifacts/cinematic-wadz-swiftshader-retry.log`. This changes test patience, not flight/roll duration, combat resources or game behavior. The initial failure remains recorded.
2. **Town Drive complete route**, `tests/drive.spec.ts:230`: the controller loop exhausted its approximately 8.3-minute attempt at route position `3943.307499612134`; `completed` was false. This is a failed completion assertion, **not merely a wall-clock timeout**. Town behavior/code is unchanged by this task; the failure remains open for its owning workstream.
3. **Earth First Contact keyboard checkpoints**, `tests/first-contact.spec.ts:57`: the whole-test 45-second timeout expired after reaching the map and reloading/clicking `#begin-quiet`, while awaiting the restored map phase. That failed run does **not** establish successful post-reload checkpoint restoration. An **unchanged isolated default-SwiftShader rerun passed** in 17.1 seconds/21.3 seconds total (`artifacts/cinematic-earth-retry.log`), with no Earth code or test edits. The successful rerun is separate evidence; the original failure remains recorded.

The same development run passed normal/reduced-motion asteroid crash/retry cases, the final cinematic model/material/flight case (42 seconds with the default software renderer), cockpit and mouse flows, all four word-lock cases including active combat/damage during spelling, and the other named controls/save-isolation checks. With the WADZ and unchanged Earth retries, **42 of 43 distinct development cases pass across the full run and targeted retries**. `artifacts/cinematic-fullcheck-summary.json` records the initial run, both retries, selected production results and artifact hashes, with separate execution logs retained. Seven original failure-evidence files are archived. This is not a clean full-suite pass; **Town route completion remains open**.

A separate Playwright suite in `space_dragon_drive_city_review` on port 5195 was observed during the run, alongside roughly 1.82 GB free of 14.51 GB memory. That is evidence of concurrent load, **not proof that all failures were caused by contention**. No unrelated process was terminated. A fresh build incorporated concurrent Town manifest assets unchanged, then seven relevant production cases ran on isolated installed-Chrome preview port 4179.

The native production run initially passed six of seven cases in 29.9 seconds (`artifacts/cinematic-production-native.log`). The Dogfight launch test failed because its external-request audit treated the configured local port 4179 as external. The audit now derives its allowed origin from Playwright `baseURL`; the unchanged runtime passed the isolated launch retry in 8.7 seconds/11.1 seconds total (`artifacts/cinematic-production-native-retry.log`). **All seven distinct selected production cases pass across the initial run and retry**, not in one clean aggregate run. These cover direct Dogfight launch/mouse fire/zoom/local audio, no mutable QA or editable/source assets, a real word/lock/Space breath, built First Contact durable-map keyboard flow, absent notebook write endpoint, excluded private references/development API, and exact runtime manifest/file hashes with real GLB bytes. The passing native production Earth flow does not erase the separate default-SwiftShader development timeout.

Final build identities: public and dist `assets/manifest.json` both SHA-256 `ac0cdc023b6970777cd5b27f2f214998cb44af60d00118e422e8fd0348548b78`; public and dist active dragon GLB both `4d1a735cd2c20daa1941626f4522f41ebfc768b014020923e1db6495eb1684a5`; built `dogfight-DDv6Cpws.js` SHA-256 `fc2f143061069e9c10fc32aa2bbb3efb0e92b2261d9e3b10a6478ce54988b68d`.

## Checks

| Check or exact command | Result | Evidence and limitation |
| --- | --- | --- |
| `git status --short --branch`; `git rev-parse HEAD` | PASS | Existing changes inspected before edits; base/current concurrent HEAD distinguished above. Dogfight changes remain local/uncommitted. |
| Read-only baseline/final `Get-Item` / `Get-FileHash -Algorithm SHA256` | PASS | Four originals match historical bytes/hashes at preflight and after final source/export work. |
| Final `python tools/check_foundation.py` after project/receipt updates | PASS | `artifacts/cinematic-final-foundation.log`: structure, local links and skill mirrors only; does not test gameplay, artwork or agent behavior. Final `git diff --check` also passes, with line-ending normalization warnings only. |
| Baseline vertex projection through runtime `ChaseCamera` | PASS for mathematical coverage | `artifacts/cinematic-camera-baseline.json`; dimensions/distances above inform the first atlas budget. No occlusion, new-geometry or hardware-performance claim. |
| `tools/review-dragon.mjs` harness smoke using red candidate as both inputs | PASS for harness only | Twenty-two fixed-camera images, zero browser errors; same loader, runtime materials and bone animation, neutral/cinematic lighting without bloom. This checks the comparison tool, not the new benchmark's appearance or gameplay. |
| New source preservation, collections, reopen and rig/pivot comparison | PASS | Live recovery/source comparisons and source/game reopen; corrected final public-file contract separately confirms retained rig/component pivots. |
| Stage-one front/side/three-quarter views before fine detail | PASS | Actual `cinematic-v001/stage1-*.png` images delivered before detailed work. Human appearance approval remains separate. |
| Intermediate neutral/cinematic original-vs-candidate comparisons | DEFECT FOUND, subsequently corrected | Twenty-six actual browser views, zero page/console errors. Lower-jaw normal/tangent issue identified; v002 correction and final inspection are recorded separately. |
| Intermediate GLB inventory, UV/bake/material-channel and structural contract | PASS for intermediate artifact | `artifacts/cinematic-weld-verification.json`; candidate `03b8…` above. Does not substitute for the separately recorded corrected v002 contract. |
| Corrected v002 source reopen and independent final GLB contract | PASS | Frozen identity `4d1a…` above; `artifacts/cinematic-final-file-verification.json` verifies preserved pivots/bind matrices, finite weights, mapped UVs/images and explicit tangents. |
| Final frozen v002 glTF validation | PASS | `artifacts/cinematic-final-gltf-validate.log`: zero errors, 41 non-root-skin warnings, 29 unused-UV infos; no generated/invalid tangent or degenerate-triangle diagnostic. |
| Public v002 contract, manifest/build model inventory and preserved originals | PASS for inspected files | `artifacts/cinematic-final-public-verification.json`; active/public identity matches the preferred local artifact, four originals unchanged, rejected cinematic v001 excluded. Full production allowlist test is still separate. |
| Sampled wing/shoulder and jaw geometry audit | PASS with stated limits | `artifacts/cinematic-articulation-audit.json`; initial crossings/servo defects corrected. Fifty-eight wing poses and three jaw poses; no independent neck/landing-motion coverage. |
| Focused asset/material unit tests | PASS on first candidate | Twelve tests in `artifacts/cinematic-runtime-tests.log`, covering rollback, new authored maps, material preservation and muzzle/pose behavior. Final-export rerun is recorded separately below. |
| `npx.cmd tsc --noEmit` | PASS | `artifacts/cinematic-runtime-typecheck.log`; does not verify appearance or gameplay. |
| Focused installed-Chrome tests using `artifacts/native-crash.config.ts` | PASS on first candidate | Two cases in `artifacts/cinematic-runtime-browser.log`, 16.3 s: cinematic skin/maps under actual flight/fire/roll/glide and forced-missing-model recovery. Decoded 1024-square normal/AO images, jaw and muzzle checks included. The deliberate missing-model console failure is expected by that recovery test. Final-export rerun is recorded separately below. |
| Final `node --test tests/mechanical-dragon.test.mjs tests/mechanical-materials.test.mjs` | PASS | Twelve tests against frozen v002; `artifacts/cinematic-final-runtime-tests.log`. Authored dark/crimson normal amplitudes survive runtime material treatment; red/organic rollback remains. |
| Final focused installed-Chrome asset/recovery flow | PASS | Two cases, 19.3 s, `artifacts/cinematic-final-runtime-browser.log`: frozen v002 decoded maps and actual flight/fire/roll/glide/pause/muzzle behavior; deliberately missing model displays retry/return. Complete remaining gameplay/performance suite is separate. |
| Final installed-Chrome actual-input playthrough | PASS | `artifacts/cinematic-final-playtest.json`/log; mouse flight/aim modes, ordinary fire/jaw, two rolls, glide/tail, RMB, real letter charge/lock, windup with steering, roar/beam/once-only hit, pause/resume, retry/reload/home return, zero errors/external requests. Complete automated keyboard/save/crash suite remains separately identified. |
| Final original-vs-candidate visual comparison | PASS for agent inspection, NOT owner approval | `artifacts/cinematic-delivery-review/receipt.json`, 28 actual browser images, zero errors; neutral/cinematic and normal/AO/paint diagnostics. |
| Final native size/load/frame sample | MEASURED | `artifacts/cinematic-delivery-performance.json`: 10.0164 s, approximately 60.00 fps, named hardware/resolution above. First failed ready-state attempt is retained; no sustained/cross-device/causal-improvement claim. |
| `python -m unittest discover -s tests -p 'test_*.py' -v` | PASS with skips | `artifacts/cinematic-python-tests.log`: 41 tests, two Windows symlink-privilege skips. |
| `python tools/verify_family_references.py` | PASS | All 18 inventory/hash checks reported; no new likeness approval. |
| Full `npm.cmd run check` on final candidate | FAIL (exit 1) | 191 units/build PASS; 40/43 development cases PASS in 35.0 m. WADZ roll wait, Town route-completion assertion and First Contact whole-test timeout failed as detailed above. Production/photo tail was not reached; independent photo check is separate. Log/traces retained. |
| Isolated default-SwiftShader WADZ rerun after longer simulation-progress waits | PASS | `artifacts/cinematic-wadz-swiftshader-retry.log`: one case passes in 1.3 m/1.4 m total. Only three test waits change from 15 to 40 s; original failure is retained. Combined evidence is 41/43 distinct development cases, not a clean aggregate pass. |
| Unchanged isolated default-SwiftShader First Contact rerun | PASS | `artifacts/cinematic-earth-retry.log`: 17.1 s case/21.3 s total, exit 0; no Earth code/test edits. Combined final development evidence is 42/43 distinct cases across the full run and retries. Town route completion remains failed; the original wrapper is not reclassified. |
| Fresh built-output relevant production checks on isolated native Chrome | PASS across initial run and targeted retry | `artifacts/cinematic-production-native.log`: six pass/one audit-origin failure; configured-origin test correction and isolated launch retry pass in `artifacts/cinematic-production-native-retry.log`. Seven distinct selected cases pass, including source exclusions and exact public/dist manifest allowlist. Does not change full-wrapper failure or verify unrelated Town production flows. |
| Final TypeScript check | PASS | `artifacts/cinematic-final-typecheck.log`; final test-only wait/origin corrections included. |

## Review and release

- Implemented and technically verified outcome: separate detailed/optimized first-section candidate, authored baked channels, preserved original collections/rollback, active local loader/material integration and review tooling. Corrected v002 passes the named asset, gameplay and selected production checks; the broad wrapper remains failed with its original failures retained. No final whole-body artwork, continuous neck/leg animation or sustained-performance claim is made.
- Human appearance/comfort/audio review: **NOT REVIEWED**.
- Approved for release: **NO**. Local integration is authorized; production deployment is not requested.
- Recovery: retain blue source, red source/export and original organic runtime model. Switch `ACTIVE_DRAGON` in `src/prototypes/dogfight/assets/dragon-model.js` to `MECHANICAL_DRAGON` for the red baseline or `LEGACY_DRAGON` for the organic baseline; the versioned files/descriptors remain. Rejected cinematic v001 and prepaint v002 stay local for comparison, outside the runtime manifest.
- Remaining limits: Town Drive full-route completion is still a failing broader-project check. Human appearance/comfort/audio, sustained performance, other physical devices and continuous neck/leg articulation remain unverified. This first benchmark does not yet match the supplied reference's photorealism or establish GTA V equivalence.
- Next useful action: owner reviews the local comparison gallery and Dogfight result, then uses that feedback to choose the next head/material refinement or extension to the rest of the body. Whole-body geometry remains deliberately outside this completed first-section increment.
