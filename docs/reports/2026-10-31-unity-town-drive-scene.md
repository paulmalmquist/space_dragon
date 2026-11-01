# Unity Town Drive detailed scene — October 31, 2026

## Scope and artifact

SD-074 continuation: [owner decision](../decisions/2026-10-31-unity-town-drive-scene.md). Task checkout `C:/Projects/space_dragon_unity_town_scene`, branch `feat/unity-town-drive-scene`, based on merged foundation `b6c82c5c00decf415c530dea822a1d19b101b202`. The shared live Unity project remains `C:/Projects/space_dragon/unity/SpaceDragon`; no competing project or Editor is created. The browser world is the unchanged SD-085 geometry/detail reference.

IMPLEMENTED and technically VERIFIED in the shared local project: generated scene, Development Web build and observed player behavior. Source comparison REVIEWED; human photorealism/comfort and APPROVED FOR RELEASE remain open. The remote target currently contains only the Town Drive module: shared Unity packages/settings, First Contact renderer and daylight HDR remain prerequisites owned by the concurrent Unity channel. This is an additive integration into that project, not a standalone Unity checkout.

## Checks so far

| Check | Result | Evidence and boundary |
| --- | --- | --- |
| Previous foundation's dedicated Unity EditMode tests | FAIL: 11/12 passed | `artifacts/unity-town-drive/editmode-results-20261031-171557-410.xml`; exact distance query `1952.6525972672146` selects a different heading at a polyline sample boundary under Unity. Native .NET oracle had passed. No tolerance was weakened; diagnosis and fix required before scene acceptance. |
| New ambient C# oracle and prior driving checks | PASS: 14 groups / 161,426 assertions | `artifacts/unity-town-drive/ambient-parity-report.json`. Traffic: 3,603 frames in three player configurations, 64 vehicles; eight pedestrian time samples. Ambient maximum difference `4.440892098500626e-16`; existing complete driving lap still passes. |
| Unity core/adapter/runtime tests after precision fix | PASS: 18/18 | Final runtime run: `artifacts/unity-town-drive/editmode-results-20261031-184004-792.xml`, including storage-read recovery protection and opposing-held-key latch cases. Runtime code unchanged by subsequent scene-only corrections. Managed DataContract JSON parsing plus optional DTO fields preserves the route doubles; mathematical simulation and strict tolerances unchanged. |
| Initial browser verifier/server syntax | PASS | `node --check tools/unity/verify-town-drive.mjs`; `node --check tools/unity/serve-town-drive.mjs`. This is syntax only. |
| Attempt to publish diagnostic test during another Editor job | Correctly refused | Process guard prevented concurrent source publication and Editor launch; no other process interrupted. |
| Detailed export inventory | PASS | 64 geometry assets plus two compatible pedestrian rigs, 146 listed files, 1,302 vegetation placements, 157 parked vehicles. Imported-instance inventory: 8,325 mesh components / 1,140,675 triangles before repeated placements/populations. Khronos validation: zero errors; missing tangent warnings are handled by glTFast and checked in imported normal-mapped meshes. Nine converted pedestrian textures are pixel-identical and rig/mesh/animation data is unchanged. Final manifest SHA256 `a68bdc42688ac6746ce3f7addf184d0c95d958c2e3026a5e06ad8f8ffaa788bc`. |
| Existing browser regression wrapper | FAIL: one software-renderer timing assertion | 89 unit tests and build passed; 31/32 development cases passed. The moving-camera test obtained only two frames while requiring more than three in SwiftShader. Original trace remains under `artifacts/test-results/drive-moving-minivan-and-c-8f08b-n-switching-pause-and-reset/`. |
| Failed camera case, installed Chrome retry | PASS: 1/1 | `artifacts/unity-town-drive/native-camera-retry.log`, actual GPU-backed Chrome, 23.9 seconds including startup. Does not erase the original wrapper failure. |
| Existing production browser cases | PASS: 6/6 | `artifacts/unity-town-drive/production-check.log`, installed Chrome. Run separately because the wrapper stopped at its development failure. |
| Foundation / Python / photo inventory | PASS | Foundation checks; 41 Python cases with two existing Windows symlink skips; 18 photo inventory entries. No likeness or human quality inference. |
| Detailed scene setup | PASS | Final `Setup-20261031-185919-595.log`: 64 assets; 1,302 vegetation LOD groups; 157 parked vehicles; two pedestrian rigs/clips; 133 generated material variants, 53 textured. Shared configuration differences empty. |
| Serialized scene acceptance, first run | FAIL: 3/4 passed | `scene-tests-20261031-182001-721.xml`. Geometry/bindings, mapped anchors and complete minivan/cabin passed. Unity's material postprocessor re-enabled glass ShadowCaster after reload; persisted `_CastShadows=0` correction and repeat required. |
| Serialized scene acceptance, after glass fix | PASS: 4/4 | `scene-tests-20261031-182641-482.xml`: complete geometry/bindings, mapped anchors, minivan/cabin, LODs/materials/rigs and persistent transparent shadow exclusion. |
| Final serialized scene acceptance | PASS: 4/4 | `scene-tests-20261031-190002-258.xml`: mapped anchors, full vehicle/cabin, materials/LODs/rigs, seven street-sign texture bindings and all 70 visible non-triangle wires excluded from shadows. |
| Development Web build | PASS | `BuildWeb-20261031-190029-709.log`; Unity 6000.6.7f1, 179,847,913 bytes, 184.4515 seconds. Actual IL2CPP player exercised below. No shared configuration differences. |
| Final WebGPU player, including full drive | PASS: 7/7 | `artifacts/unity-town-drive/scene-browser/runs/2026-10-31T19-06-11-641Z/report.json`. Zero console/page/network errors or external requests. Real keyboard driving, pause, cabin/look, reset, isolated save/reload and semantic-input complete loop. |
| Final WebGL2 fallback player | PASS: 6/6 | `artifacts/unity-town-drive/scene-browser/runs/2026-10-31T20-06-30-432Z/report.json`, actual OpenGLES3 backend; zero console/page/network errors or external requests. Full lap was exercised on WebGPU. |
| Final focus/tab-switch verification | PASS | `artifacts/unity-town-drive/focus-browser/runs/2026-10-31T20-07-28-198Z/report.json`: actual tab blur/visibility pauses player/camera/NPC/signals, return stays paused, held accelerator cannot re-arm until neutral. No synthetic focus events or focus emulation. |
| Browser-reference and native screenshot review | REVIEWED, bounded | `artifacts/unity-town-scene/browser-reference/` and final player screenshots. Detailed T junction/development, cabin and side views retained; sign emission and stronger Unity shadows corrected. Human art approval remains open. |

## Retained failed runs

The first diagnostic run confirmed Unity JsonUtility parsed both the query and nearest knot as `1952.6525972672143`, changing the side of a polyline heading discontinuity. Standalone Unity Mono arithmetic and managed parsing preserved the source value. The first managed-loader Editor attempt failed because `[Serializable]` made absent default fields required (`DrivePose.speed`); explicit optional serialization fields corrected that contract. Runs `171557-410`, `172205-246` and `172529-721` remain in the live project's ignored evidence directory. The subsequent 18-case run passed; no tolerance was relaxed and no expected heading was changed.

Actual Setup failures, in `artifacts/unity-town-drive-scene/`, remain retained:

- `174440-533`: glTFast collapsed the single authored minivan root. Explicit `SceneObjectCreation.Always` preserves that hierarchy.
- `174945-349`: repeated authored development names were treated as globally unique. The importer now validates identical contracts and occurrence counts, then resolves each LOD within its authored hierarchy.
- `180005-734`: rendered bounds included the 2.60 m contact-shadow plane. Exact shadow geometry is validated separately; physical vehicle width is 2.43 m and the original vehicle scale limits remain unchanged.
- `180613-573`: original pedestrian GLBs require unsupported `EXT_texture_webp`. Importer metadata identifies that extension; compatible PNG derivatives must preserve the original rig, animation and mesh data.
- `181015-117`: the existing shared project leaves its global pipeline unset between builds. Town Drive now owns pipeline/renderer derivatives, scopes import/build activation, verifies URP shaders, and restores prior values. Runtime selection follows scene lifetime. Original shared assets remain unchanged.

The original Windows PowerShell runner also rejected unsupported generic method syntax before launching the Editor; byte comparisons now use compatible Base64 equality. Unchanged imported files are cached, with all inventory checks still performed.

The first serialized scene test identified a real persistence issue: URP's material postprocessor reads `_CastShadows`, so changing only the shader-pass flag did not survive reimport. The fix stores `_CastShadows=0`, disables the actual pass and retains renderer shadow exclusion. The test additionally checks the persisted property and every affected scene renderer.

Archival originals now live in `Imported/Sources~`, which Unity excludes from asset import. The 12 source files (12,603,889 bytes) remain unchanged. Relative provenance paths changed; all runtime GLB/PNG bytes remain identical. This prevents unsupported archived WebP files from generating fresh-import errors while retaining exact source recovery.

## Observed final player and visual results

Installed Chrome **156.0.8078.76**, 1280 x 720, AMD Radeon(TM) Graphics through ANGLE/D3D11. WebGPU full drive took **411.6833 simulated seconds / 416.452 wall seconds**, with ordered `home -> leg-1 -> leg-2 -> leg-3 -> leg-4 -> home`, **zero contact snapshots**, and completion restored after reload. The development driver supplied bounded throttle/brake/steering only; pose, time and checkpoints advanced through the real fixed-step simulation. This is an automated drive, not human handling approval.

Both backends exercised actual keyboard acceleration/steering/braking, frozen player/NPC/signals during pause, C cabin switching, Q/E side views, common car/camera reset, dashboard/glazing, assist persistence and checkpoint reload while preserving an unrelated storage sentinel. The scene contains 64 traffic vehicles and 40 pedestrian states, with bounded nearby presentation. Shoe-floor snapshots remain at approximately 0.12 m.

The final warmed stationary 240-frame windows measured **31.4583 ms mean / 42 ms p95** on WebGPU and **32.8083 ms / 60 ms** on OpenGLES3. These are Update wall intervals after reload, not GPU timings or an endurance benchmark. A prior run measured 24.5875/29 ms; do not substitute that favorable sample for final-build evidence. Startup/loading hitches are excluded from these warmed windows. A 60 fps target is not established.

The first full drive (`2026-10-31T18-51-23-339Z`) passed all seven case bodies, took 413.3333 simulated seconds with zero contacts, but its aggregate result was **FAIL** because WebGPU rejected a line-mesh shadow pipeline with nonzero depth bias. The fix preserves all 70 utility-wire renderers/materials/vertices and disables their unsupported non-triangle shadow pass. The final full drive above has no such error; the failed report remains retained.

Seven street-sign materials now use their base texture for emissive modulation with identical UV transforms, matching the inspected Babylon Standard-material behavior; the exported source factors and geometry remain unchanged. The native pipeline uses four-sample MSAA, shadow depth bias 1.5 and normal bias 1. Glass/contact-shadow materials persist shadow exclusions. Minivan shadow striping is reduced, but residual surface/shadow artifacts and thin foliage aliasing remain visible and also occur in the source. Homes remain procedural estimates, mirrors are not live reflections, and this migration does **not** establish photorealistic quality.

The source comparison captured eight images with zero application errors and unchanged source hashes. Matching T junctions and surroundings are present; the native chase camera intentionally uses its own framing. The first cabin-forward screenshot follows a keyboard steering case and is not an exact spawn-camera match. Final screenshots inspected include home chase, cabin side views and checkpoint views. Full cabin mesh/detail is retained; optional house interior remains disabled.

Artifact hashes for the final player (all files listed in both browser reports):

| File | SHA256 |
| --- | --- |
| `Build/TownDriveWeb.data` | `462589528ff24ed09ecc1757debdf1dbfec2fa44620ee227c37627b8e3c1e4ce` |
| `Build/TownDriveWeb.wasm` | `f6ace7c671740137bf79f060f8e0f44a2a704987ded69b878333a318eef864cd` |
| `Build/TownDriveWeb.framework.js` | `f178b2015dc815b35f329aba6886b357fe6ffc35ec7f5c7788ef2505cd383f22` |

The independent focus verifier's first attempt failed on a transient Windows `EBUSY` opening Chrome's DevToolsActivePort file, before loading the app. Bounded ENOENT/EBUSY/EACCES startup retries fixed the launch issue; failed evidence remains retained.

## Acceptance and limits

Preserve the real street labels, corrected gate approach, 4 mapped lake outlines, 83 estimated context lots, 10 junctions/11 closures and the shared home return. Verify geometry/UV/material data from the actual detailed browser world; minivan exterior, cabin, wheel/steering anchors and left/right surroundings must be present. Source estimates remain estimates; Unity does not convert them to surveyed geometry.

Verify actual keyboard acceleration/steering/braking, common car/camera interpolation, chase/cabin/look, reset/pause/focus behavior, traffic/pedestrian simulation and isolated save reload. A full-lap development driver may feed semantic inputs only, with the real fixed-step simulation advancing pose/time/checkpoints; it must not teleport or set completion. Distinguish review-camera placement from a driven route.

Windows standalone player, physical controller, touch, audio, orbit/drag-look and the browser minimap are NOT TESTED or not ported in this increment. The existing browser lab remains available. Shared Unity foundation publication belongs to its concurrent channel; a fresh target-branch checkout alone cannot reproduce this integrated player until those prerequisites are integrated. Record named hardware/backend and frame measurements only when exercised. Human visual quality, photorealism, driving comfort, physical controller, touch and release approval remain separate. Existing browser Drive remains available. No production deployment.
