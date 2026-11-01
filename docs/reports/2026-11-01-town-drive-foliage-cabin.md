# Town Drive foliage, facades and cabin — November 1, 2026

## Scope and artifact

Owner wording: “continue with photorealism”; [SD-074 continuation](../decisions/2026-11-01-town-drive-foliage-cabin.md). Branch `feat/town-drive-foliage-cabin`, based on main merge `cba76b4c4543a25e54da76728b24e845afdc8fbc` (PR #32). The only Editor/build project remains `C:/Projects/space_dragon/unity/SpaceDragon`; the clean art checkout holds the proposed scoped commit. Other channels' shared working files remain independently owned.

Replace wire-like palm crowns at the existing anchors, add residential facade/roof relief on the existing 83 house footprints, and improve cabin microstructure plus a live rear-camera-style mirror. Original mapped route, GLBs, collision proxies, driving/pedestrian/traffic state and save rules remain unchanged. Generated original art is reproducible C# geometry/textures; new external sources or personal media were not required.

## Implementation boundaries

- Palm art: 162 existing palms; retain all 1,302 source vegetation parts, including original hidden palm leaves for rollback, active trunks and fruit. Generated authoring receipt: 127,008 near + 18,144 far triangles, 70 renderers in 35 spatial cells. Source near-leaf instancing represented about 2.875 million triangles; these counts are not measured frame timing.
- Residential art: raised garage panels, beveled window surrounds/shutters, porch trim, gutters/downspouts and rounded hip-roof ridge caps. Generated authoring receipt: 83 facades, 498 frames, 832 panels, 1,497 ridge-cap segments, 52,334 triangles and 65 renderers in 14 cells. No new colliders; source transforms/meshes guarded during generation.
- Cabin: five material treatments use original procedural leather/plastic/textile grain with physical UV scale and source-preserving mesh derivatives. Dashboard, upholstery and headliner have distinct roughness/tints. These are generated material patterns, not photographic scans.
- Rear view: one 320×86 live rear-camera feed, at most six requests per second, only in visible active cabin view. It observes the same rendered player/NPC world, with camera beyond the rear body, horizontal image flip, no shadows/postprocessing/HDR/MSAA. It neither advances simulation nor changes the shared renderer. Source mirror and side-mirror treatment remain. This is a camera-style rear view, not a physically accurate optical reflection.

## Evidence

| Check | Result | Boundary |
| --- | --- | --- |
| Authoring/API preflight | PASS, bounded | Foliage, residential and mirror source/tests compiled against installed Unity assemblies with no warnings/errors. Actual Editor tests/player rendering are separate. |
| Python repository tests | PASS, bounded | Foundation checker; 51 cases, 49 pass and two host symlink cases skipped. |
| Unchanged source inputs | PASS | 146 imported scene files; nine v002 scanned maps; frozen original route export reproduces the same 764 samples, 5 checkpoints, 11 closures, route SHA `4c5eba111e226ffd53daf5dfe7ca68274eb1b643d58fb4c6955e863e401c47ff`. The known test-only fingerprint drift is handled with the original source checkout, without changing the route baseline. |
| Scene generation | PASS | `BuildWeb-20261101-152309-009.log` setup receipt at 15:27:12 UTC; new art receipts confirm 162 palms / 70 renderers, 83 facades / 65 renderers, and ten cabin renderers / five materials. Shared settings restored; original route/source inventory retained. |
| Unity Web build | PASS | `BuildWeb-20261101-152309-009.log`: Development review player, 214,127,512 bytes, reported player-build duration 1,010.165 s (setup/import extra). |
| Initial ten scene tests | FAIL: 3/10 | `scene-tests-20261101-154422-321.xml` in the live project artifacts. The new cabin test reopened the scene in Single mode, destroying cached fixture nodes; subsequent tests reported missing references. Product build remained intact. |
| Corrected ten scene tests | PASS: 10/10 | `scene-tests-20261101-154542-579.xml` in the art-checkout artifacts; cabin test reuses the fixture-owned persisted scene. No contract/tolerance or player change was made to obtain the pass. |
| Actual player functional checks | PASS: 6/6 per backend | WebGPU `after/runs/2026-11-01T15-47-40-434Z/report.json`; forced WebGL2 `fallback/runs/2026-11-01T15-51-10-020Z/report.json`. Mirror captures are live and rate-bounded; pause/chase stop captures. Driving/cabin-look/reset/durable-save reload pass. |
| Actual focus loss | PASS: 1/1 | `focus/runs/2026-11-01T15-53-36-449Z/report.json`, actual tab activation and fresh neutral input recovery. |
| Initial frame samples | CONTAMINATED | The Luke channel started a separate Unity build at 15:46:29 UTC, with native compiler work throughout these first browser runs. The ~64 ms cabin / ~70 ms chase WebGPU samples are preserved but cannot establish a visual-pass regression. |
| Matched WebGPU repeat | PASS: 6/6 each | Frozen v002 `baseline-current/runs/2026-11-01T16-05-45-115Z/report.json`, then v003 `after-matched/runs/2026-11-01T16-06-30-795Z/report.json`. No known competing Unity/compiler/browser-verification jobs observed at two-second polls; ordinary desktop activity is not excluded. |
| Additional isolated fallback timing | NOT RUN | Another channel began Unity BuildWeb at 16:07:50 UTC; cancelled the optional waiting repeat. The existing same-artifact six-case WebGL2 functional pass and upright mirror inspection stand; no fresh uncontended fallback timing is claimed. |
| Retained browser checks | PASS | Full `npm run check`: 251 unit tests, TypeScript/Vite build, 54 development cases (17.3 min), nine production cases (2.1 min), 18 reference checks. Isolated fixture/preview ports 5265/4267; compilation was concurrent, so these durations are not performance samples. Log: `artifacts/unity-town-drive-art-v003/npm-check.log` in the art checkout. |

## Reproduction

Run the guarded `BuildWeb -ReviewBuild` and `TestScene` commands in [the scene workflow](../engineering/UNITY_TOWN_DRIVE_SCENE.md) with exclusive Editor ownership. The ten scene tests include original integration, surface/garden, two palm checks, residential and cabin/source/mirror-shape acceptance. `node tools/unity/verify-town-drive.mjs artifacts/unity-town-drive-art-v003/after` checks actual controls, mirrored scene rendering readiness and capture counters, pause/chase suppression, cabin look, reset and durable-save reload. Use `SPACE_DRAGON_TOWN_DRIVE_WEBGL2=1` for a separate fallback run. The existing focus verifier covers actual tab loss.

`node tools/unity/review-town-drive-art.mjs artifacts/unity-town-drive-art-v003/baseline-current/report.json artifacts/unity-town-drive-art-v003/after-matched/report.json v003` builds an observed before/after gallery. Gallery: `C:/Projects/space_dragon/artifacts/unity/town-drive-art-v003-review.html`, eight observed images with four paired views. The prior player is frozen under `artifacts/unity-town-drive-art-v003/before/player`; it remains the rollback artifact. Existing v002 source provenance and scan license apply without modification.

## Short performance comparison

The consecutive v002/v003 samples use installed Chrome, the same 1280×720 viewport, AMD Radeon integrated graphics/ANGLE D3D11 through Unity WebGPU, and 240 rendered Update intervals per window. The v002 harness comes from `c87b1a6`, with only its frozen build root and an added cabin sampling window changed. The v003 player is unchanged from the built/functional-tested artifact.

| Window | v002 mean / p95 | v003 mean / p95 | Observed mean change |
| --- | --- | --- | --- |
| Stationary chase after reload | 26.96 / 35 ms | 28.18 / 39 ms | +1.22 ms, +4.5% |
| Cabin, live rear view in v003 | 24.72 / 30 ms | 26.16 / 36 ms | +1.45 ms, +5.8% |

The last cabin mirror submission measured 4 ms of CPU wall time, at at most six requests/second; it is not a GPU timing or an average cost. These short windows support accepting this bounded visual increment with a modest observed increase, not a sustained frame-rate claim. An earlier v003-only monitored run (`after-isolated/runs/2026-11-01T15-55-39-966Z`) passed six cases but measured 40.91 ms chase / 44.68 ms cabin despite no known competing jobs; retain that variability rather than infer a stable hardware result. Its first wrapper falsely reported failure because Windows returned a null process exit code after the passing report. The wrapper was corrected to retain the process handle and validate a fresh PASS report; no product/test assertion changed.

## Verification status

IMPLEMENTED: the scoped v003 presentation changes. VERIFIED: the named local build, ten scene cases, two-backend player behavior and repository checks. Agent visual inspection: complete for chase and cabin forward/left/right views, with limits below. Human REVIEWED / APPROVED FOR RELEASE: not established.

## Limits

Human visual/comfort and release approval remain open. Frame samples are Update wall intervals, not GPU timings or endurance results; mirror request duration is CPU wall time. Prior WebGL2 fallback was about 20 fps. The existing asynchronous PlayerPrefs immediate-reload window remains documented in the prior receipt; the observer waits for an actual completed write and does not force synchronization. This art pass does not fix storage semantics. Physical controller, touch, audio, native Windows play and full-loop rerun are not inferred. No production deployment.

## Observed appearance and artifact identity

Implementing and independent agents inspected actual chase, driver-forward, side-look and fallback screenshots. Garage panels, window surrounds and fascia now produce visible relief; palm fronds read greener and less wire-like. The live rear view shows an upright rear street/sky image on both backends, with no missing/magenta material failure. Cabin grain is subtle, and the instruments stay readable.

Remaining visible limits: palms still have sparse procedural silhouettes, the lawns are flat, house silhouettes repeat, passenger-side upholstery stays dark, and side mirrors remain environment-shaded. The pre-existing support stem crosses part of the live rear-view image; it was preserved with the original cabin geometry. This is an incremental improvement, not photorealistic completion or owner approval.

- Web data SHA256: `eefd9c12b2ff38ef9f62afac5f92bd5aba78f290b81f2ab99217cf370437bd06`, 112,132,209 bytes.
- Web WASM SHA256: `bbd79467ed4079f3b6ad640be94e18489ad487d0a79d115b52ce4754c400afd6`, 101,187,360 bytes.
- Original scene manifest and v002 scan provenance remain `a68bdc42688ac6746ce3f7addf184d0c95d958c2e3026a5e06ad8f8ffaa788bc` / `89731b4bf52d98bc0a1e550a5552330992776c08085f38febe88a8e8cf525ade`.

Build and first failed scene-test logs are under the live root's `artifacts/unity-town-drive-scene`; corrected ten-test logs and npm log are under the art checkout. Player evidence remains under the live root's `artifacts/unity-town-drive-art-v003`. The tested build remained frozen while the other channel used its separate output path. Generated task files were copied read-only with stable-byte checks; source/Editor writes waited for ownership.
