# Town Drive surface and landscape pass — November 1, 2026

## Scope and artifact

Owner request: “continue photorealism”; [SD-074 continuation](../decisions/2026-11-01-town-drive-surface-art.md). Isolated branch `feat/town-drive-photorealism`, based on `origin/main@88bdd532bde0134dd968a8c5a72ab121f6163cdb`. The existing shared `C:/Projects/space_dragon/unity/SpaceDragon` is the only Editor/build project. Its other channels' files remain independently owned.

Correct physical surface mapping, add scanned roof/stucco finishes and low garden planting, and rebalance daylight. Original geometry/road data and gameplay remain unchanged. New source is reproducible C# geometry/material generation plus an offline scan conversion recipe. Original downloads remain outside Unity Assets.

## Checks

| Check | Result | Evidence and boundary |
| --- | --- | --- |
| Prepared surface inputs | PASS | `node tools/unity/prepare-town-drive-art.mjs --verify`: nine native maps; source hashes/authors, physical dimensions and CC0 license recorded in `TownDrive/Art/v002/provenance.json`. |
| Surface/garden Unity API compilation | PASS, bounded | Standalone compilation against installed Unity assemblies, zero warnings/errors; does not establish Editor serialization or player rendering. |
| Unchanged build baseline | PASS: 6/6 | `artifacts/unity-town-drive-art-v002/before/runs/2026-11-01T14-06-51-410Z/report.json`; actual installed Chrome, WebGPU, previous Development Web candidate. |
| Initial new scene generation | PASS | `Setup-20261101-140847-551.log`: 1,192 surface derivatives, 166 beds, 661 broadleaf clumps and 412 grass tufts; 108,892 added triangles in 108 spatially batched renderers, maximum height 0.82481 m, bed-corner road-edge clearance at least 2.86135 m. |
| Frozen route export against current main | FAIL: existing test-only fingerprint drift | Only `tests/drive.spec.ts` differs from the 40 frozen fingerprint inputs, due to main commit `308a32d` waiting for rendered frames. Drive source and native route remain unchanged. |
| Frozen route export using original source checkout | PASS | `node --experimental-strip-types tools/unity/export-town-drive.mjs --source-root C:/Projects/space_dragon_unity_town_scene --output-root C:/Projects/space_dragon_town_art --verify`: same 764 route samples, 5 checkpoints, 11 closures, route SHA `4c5eba111e226ffd53daf5dfe7ca68274eb1b643d58fb4c6955e863e401c47ff`. No tolerance/hash baseline changed. |
| Final Unity Web build | PASS | `BuildWeb-20261101-141832-186.log`; Unity 6000.6.7f1 Development/review build, 201,589,248 bytes, 739.286 s. |
| Final Unity scene tests | PASS: 6/6 | `scene-tests-20261101-143245-057.xml`; persisted geometry/UV/material/plant clearance plus original scene checks. |
| New WebGPU player | PASS: 6/6 | `after/runs/2026-11-01T14-46-53-137Z/report.json`: actual keyboard driving, steering/braking, pause/ambient freeze, cabin and both look directions, reset, checkpoint/setting reload. |
| Actual tab focus loss and neutral-input recovery | PASS: 1/1 | `focus/runs/2026-11-01T14-48-49-468Z/report.json`; actual tab activation and observed focus events, same build. |
| First WebGL2 check | FAIL: 5/6 | `fallback/runs/2026-11-01T14-47-37-497Z/report.json`: immediate reload observed old assist setting. Unity queues PlayerPrefs writes asynchronously; runtime reports saved before IndexedDB durability. Preserved failure, no art/runtime rollback or invented pass. |
| Durable save observer / WebGL2 retry | PASS: 6/6 | `fallback-durable/runs/2026-11-01T14-57-26-914Z/report.json`; read-only observer matched the existing 157-byte PlayerPrefs file, SHA `ea06ca2d76554516c28a3dd988071753414b9f40ce0129fcc01e06b8c7e7a4d2`, after a 314 ms wait. It does not call sync/save or repair storage. This proves completed-write reload, not instantaneous reload safety. |
| Python repository checks | PASS, bounded | Foundation checker; 51 unit cases, 49 pass and two host symlink cases skipped. |
| Browser prototype unit/build checks | PASS | Existing npm run: 251 unit cases and TypeScript/Vite build passed. Development sequence was interrupted after nine passing cases, so the wrapper is not a complete pass; fresh development/production runs recorded below. |
| Retained browser development/production and photo inventory | PASS | Fresh installed-Chrome run: 54 development cases (6.1 min), nine production cases (36.9 s), 18 photo inventory checks; isolated fixture port 5265 and preview port 4267, no real notebook server. `browser-check.log` / `production-check.log` in the review worktree artifacts. |

## Observed visual judgment

**REVIEWED by the implementing and independent review agents; owner approval remains open.** The same-pose home chase view now shows tile rows and material variation instead of flat orange roofs. Driveway/concrete texture scale no longer stretches into long bands. Low planted beds read along house fronts. The white minivan and bright roofs retain more detail under the cooler, less exposed light. The driver dashboard remains readable; left and right windows show houses, road context and planting. There are no missing/magenta materials in the reviewed views.

The result is **not photorealistic completion**. Repeated house silhouettes, broad flat lawns, sparse aliased palm fronds, plain mirror panels and blocky cabin geometry remain visibly synthetic. Passenger-side shade remains dark. The next useful art increment is authored foliage/varied house geometry and cabin/mirror detail, judged in the actual player. Do not use this surface-only pass as a measured reconstruction or owner comfort approval.

Local comparison: `artifacts/unity/town-drive-art-review.html`, generated with `node tools/unity/review-town-drive-art.mjs`. Four actual before/after screenshot pairs include home chase, driver forward, left and right. Home pose matches exactly; cabin poses differ slightly because they follow real keyboard input. Ambient actors can differ in time. Local play: `http://127.0.0.1:5208/space-dragon-town-drive/`.

## Artifact identity and bounded measurements

The final native art binds 324 roof meshes and 207 wall renderers. Surface mapping uses 1,192 derived meshes with unchanged 155,160 source triangles; the garden adds 108,892 triangles in 108 renderers / 27 spatial cells. The 166 beds serve 83 mapped lots, have no colliders, and preserve independent road clearance. New map/mask imports are mipmapped, repeated, normal-aware and compressed. Generated source derivatives/metas remain scene-linked and tracked; original downloaded scans remain under ignored `assets/source/local/town-drive/surface-v002`.

- Art provenance SHA256: `89731b4bf52d98bc0a1e550a5552330992776c08085f38febe88a8e8cf525ade`.
- Unchanged imported-scene manifest SHA256: `a68bdc42688ac6746ce3f7addf184d0c95d958c2e3026a5e06ad8f8ffaa788bc`.
- Web data SHA256: `18113e1ecafbcf9d12361d1700a54abc19bba804b3835e886b1b62b84bc60b08` (99,613,383 bytes).
- Web WASM SHA256: `8c640ac80b3e4b1f084778b698f115a4ba9081dd01eaad8cb66f8702d3f08bd8` (101,167,922 bytes).

Installed Chrome 156.0.8078.76, 1280×720, WebGPU on AMD Radeon(TM) Graphics through ANGLE/D3D11. Same-pose 240-frame stationary Update intervals: before **29.19 ms mean / 36 ms p95**; after **29.13 ms / 35 ms**. This narrow sample shows no meaningful change, roughly 34 fps; it is not GPU timing, 60 fps acceptance, moving-route or sustained performance. The separate forced WebGL2/OpenGLES3 run has **51.10 ms mean / 70 ms p95**, about 20 fps, below 30 fps; it remains a functional fallback with a performance limitation. Its exterior screenshot is also reviewed with no missing/magenta materials. Build size grows from 179,847,913 to 201,589,248 bytes (uncompressed build report). Prior complete-loop evidence remains historical; this art pass does not claim a fresh full lap.

## Reproduction and limits

Use the guarded scene commands in [the workflow](../engineering/UNITY_TOWN_DRIVE_SCENE.md), then run `node tools/unity/verify-town-drive.mjs artifacts/unity-town-drive-art-v002/after`. Set `SPACE_DRAGON_TOWN_DRIVE_WEBGL2=1` for the separate fallback output. `node tools/unity/verify-town-drive-focus.mjs artifacts/unity-town-drive-art-v002/focus` checks actual focus loss independently. All player evidence is under `artifacts/unity-town-drive-art-v002`; build/scene logs are under `artifacts/unity-town-drive-scene`.

The save harness now waits for an actual completed Unity IDBFS write and verifies byte equality in the existing `/idbfs` `FILE_DATA` record before reloading. Its observer is read-only, scoped to a file carrying `space-dragon.unity.drive.v1`, bounded to 30 seconds, and records path/length/SHA/wait duration. The existing product window between “Checkpoint saved” and durable storage remains a known limitation, not fixed by these art changes. No test-triggered synchronization conceals it.

## Art sources and review boundaries

Powered by Poly Haven: [Clay Roof Tiles 02](https://polyhaven.com/a/clay_roof_tiles_02) by Amal Kumar, [Grey Roof Tiles 02](https://polyhaven.com/a/grey_roof_tiles_02) by Rob Tuytel, and [White Stucco](https://polyhaven.com/a/white_stucco) by Amal Kumar. [CC0 license](https://polyhaven.com/license). Native maps retain color/normal direction and pack roughness/AO into explicit URP channels; provenance lists source URLs and SHA256. Runtime performs no provider requests.

Owner photorealism/comfort and release approval are NOT REVIEWED; agent visual review is recorded above. Physical controller, touch, audio, Windows player and sustained performance are NOT TESTED by this pass. No production deployment. Existing prototype and imported source assets remain available for rollback.

The shared Editor guard refused two attempts while the Luke channel owned a job; no process was interrupted. A stable-idle queue then acquired the existing project. This is coordination evidence, not a failed art build.

## Delivery

Scoped source/generated assets and documentation are staged on `feat/town-drive-photorealism`, against main at `88bdd53`. Standing owner push/merge authorization applies. Final remote commit/PR is recorded in the delivery handoff and final response; hosted CI is separate from the passing local checks. The shared working copy retains other channels' uncommitted work and is not reset or switched.
