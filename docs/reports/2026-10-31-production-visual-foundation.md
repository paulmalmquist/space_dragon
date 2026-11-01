# Production visual foundation verification

Date: October 31, 2026. **IMPLEMENTED and technically VERIFIED for the named checks and short native-renderer samples below.** Human art review and the full polished-opening/sustained-performance exit remain open.

## Scope and artifact

- **Authorization:** SD-061 / SD-VIS-001, the owner's supplied [AAA visual plan](../../ideas/INBOX.md), reconciled in [the decision](../decisions/2026-10-31-production-visual-foundation.md) and [implementation plan](../plans/PRODUCTION_VISUAL_FOUNDATION.md).
- **Repository:** `feat/town-drive-lab`; initial HEAD `a4277da7b546f3294ce2018771669b34831a07d0`, then concurrent HEAD `deedd01528b3e8d22c0af3bedba9a79436f80be7`. This task did not create that commit, stage the pre-existing work, push or deploy. Extensive existing Dragon/Town work was present; later concurrent Town changes are not evidence for this increment.
- **Changed runtime:** `src/game/scene.ts`, `src/game/runtime/{frame-sampler,performance,quality,quality-controller}.ts`, `src/game/visual/first-contact-visuals.ts`, `src/ui/visual-controls.ts`, `src/style.css`; existing UI entry wiring and First Contact tests are retained. `tools/capture-visual-foundation.mjs` provides reproducible screenshots/measurement output. Vite source denial and production checks were subsequently extended for the new Unity project.
- **Environment:** Windows on the existing Lenovo 82XM / Ryzen 7 5825U / integrated AMD Radeon target; Babylon 9.33.0, TypeScript 7.0.2, Vite 8.3.5, Node 24 and installed Chrome. The named machine does not make every automated sample a GPU benchmark; actual renderer evidence must accompany measurements.

## Implemented result

First Contact now has manual Low/Balanced/High/Cinematic presets, Home/Arrival/Pod-detail review cameras, an opt-in performance overlay, sample reset and downloadable measurement data. The frame sampler reports a bounded rolling window, median/p95/max wall-clock intervals, spikes, actual render dimensions and draw calls. It excludes warmup and explicit pause gaps; it does not claim GPU execution time or total graphics memory. Quality preference storage is separate from story/exploration saves.

The generic room/yard uses existing manifest-listed CC0 albedo/normal/roughness surfaces, a subdued prefiltered environment, directional moonlight, a warm practical and cyan pod light, shadows, fog, ACES grading and quality-dependent bloom. The existing original Blender rescue-pod v002 remains the real asset: **463,644 bytes, 38 meshes, 6,376 triangles, five materials, one KTX2 texture and `pod_open`**, with self-hosted decoding. Its original [Blender/export receipt](2026-10-29-pod-asset.md) remains the source evidence; this task did not produce a new pod model or approve final art.

Review cameras only frame the current story state. Story actions restore normal framing; walking retains its follow camera. Visual changes do not grant rewards, advance story, change learner records or migrate saves. The isolated Three.js labs remain intact.

## Completed checks and limitations

| Exact command or procedure | Result | Evidence and limit |
| --- | --- | --- |
| `$env:SPACE_DRAGON_TEST_PORT='5192'; $env:SPACE_DRAGON_PREVIEW_PORT='4192'; $env:SPACE_DRAGON_NATIVE_CHROME='1'; npm.cmd run check *> artifacts/visual-foundation/check.log` | PASS on the recorded artifact | **214 unit tests**, TypeScript/production build, **46 development** and **nine production** browser cases, **18 photo inventory/hash checks**. [Full local log](../../artifacts/visual-foundation/check.log). This pass predates the later Unity source-denial addition; focused final checks below cover that addition. |
| New visual unit cases in `tests/visual-foundation.test.mjs` | PASS in that wrapper | Percentiles/window rollover, real long stalls, warmup/pause/invalid time handling and finite render-density bounds. They verify measurement/control logic, not hardware speed. |
| New `tests/visual-foundation.spec.ts` browser flows | PASS in that wrapper | All four quality settings and review views preserve saves/rewards; overlay/counters, pause/resume/reset, subsequent suit progression, reload preference/checkpoint, invalid preference fallback and actual walking after review all pass. No external requests/page errors in the scoped visual flow. |
| Retained First Contact, navigation, Dogfight/Town and production checks | PASS in that wrapper | Existing keyboard progression/help, durable map, walking/pickup, lab boundaries and manifest/source packaging are covered by their named cases. Passing the suite does not establish human usability, controller hardware or newly integrated campaign progression. |
| `python tools/check_foundation.py` | PASS | [Retained final log](../../artifacts/visual-foundation/foundation-completion.log): foundation structure and skill mirrors. Does not test gameplay or agent behavior. |
| `python -m unittest discover -s tests -p 'test_*.py' -q` | PASS, with host skips | [Retained final log](../../artifacts/visual-foundation/python-completion.log): 45 tests run, two skipped. |
| Local before/after image inspection | REVIEWED by agent; technical visual evidence only | [Before Arrival](../../artifacts/visual-foundation/before/arrival.png) and [After Arrival Balanced](../../artifacts/visual-foundation/after/arrival-balanced.png) show the same pod/yard framing with surface detail, brighter metal reflections and changed lighting. Room/yard geometry remains visibly provisional. This is not a human final-quality approval. |
| `node tools/capture-visual-foundation.mjs artifacts/visual-foundation` against the isolated localhost 5191 fixture | PASS on clean final run | [Measurement JSON](../../artifacts/visual-foundation/measurements.json), [capture log](../../artifacts/visual-foundation/capture-final.log) and [comparison gallery](../../artifacts/visual-foundation/index.html) contain all six samples/views, source hashes and actual AMD renderer identity, with zero page/console errors or external requests. The earlier incomplete attempt captured the welcome overlay as High arrival; its outputs were replaced by this successful clean rerun, not used as evidence. |
| Focused development source-boundary test after Unity denial; `npm.cmd run build` | PASS | [Source-boundary log](../../artifacts/visual-foundation/source-boundary-check.log): the one selected notebook/source-denial case passes, including 403 for Unity source. [Final build log](../../artifacts/visual-foundation/build-completion.log): typecheck/build passes. |
| Final targeted production First Contact and source-export cases after that build | PASS, two cases in 12 s | [Production completion log](../../artifacts/visual-foundation/production-completion.log): actual built keyboard First Contact/durable map and exclusion of Unity/source/private references/development observation API pass. This targeted rerun supplements the earlier full nine-case production suite. |

## Measured native-renderer result

Installed Chrome **156.0.8078.76**, headless automation on Windows, reported **ANGLE AMD Radeon (TM) Graphics (0x000015E7), Direct3D11**, at a **1366 × 768** browser viewport and **1255 × 658** CSS canvas, DPR 1. Each static view ran for ten seconds; the table represents its last 300 post-warmup frame intervals, approximately five seconds. No sample recorded an interval above 50 ms. These are short observed hardware-renderer samples, not sustained gameplay or 1080p/1440p acceptance.

| View / quality | Render pixels / density | Median / p95 / max ms | Estimated fps | Draw calls |
| --- | --- | --- | --- | --- |
| Home / Balanced | 1255 × 658 / 1.0 | 16.7 / 18.8 / 33.4 | 59.40 | 96 |
| Arrival / Low | 941 × 493 / 0.75 | 16.6 / 18.7 / 33.6 | 59.62 | 96 |
| Arrival / Balanced | 1255 × 658 / 1.0 | 16.7 / 18.3 / 32.9 | 59.80 | 96 |
| Arrival / High | 1255 × 658 / 1.0 | 16.6 / 18.9 / 34.8 | 59.43 | 100 |
| Arrival / Cinematic | 1255 × 658 / 1.0 | 16.7 / 17.4 / 19.1 | 60.00 | 100 |
| Pod detail / Balanced | 1255 × 658 / 1.0 | 16.7 / 17.4 / 33.5 | 59.59 | 94 |

High/Cinematic remain at density 1 on this DPR-1 display; they change shadow/postprocessing settings, not measured pixel dimensions here. The numerical ordering within these near-vsync short samples is not evidence that Cinematic is faster than High. The pod's observed local load/decode interval was **1,727.3 ms**. Cumulative development-session transfer was **24,525,851 bytes**, explicitly including Vite modules; it must not be reported as production initial-download size.

The measured `src/game/scene.ts` SHA-256 is `f40084b17e89f07ee19434ac4ad6dacd1cbe5e61c4c4402baf81d2850868d23b`; the visual module is `f0ad8298eddeef941244f0ba6904b561b4da233987fe6c1b58a51e1789357480`. Full measured-file hashes and raw per-sample counters are retained in the JSON. Pod SHA-256 remains `8095da18e8be0ced6d01db0c8ef2387d1eb7303ab3fa49303803398c7fcc360e`.

SD-083 additionally records [matched 1280 × 720 High captures](../../artifacts/unity/babylon/measurements.json) and [final production loading](../../artifacts/unity/babylon-production-load.json). Production initial encoded body bytes are **7,145,098**, including observed decoder requests and per-response gzip/identity encoding, rather than the Vite-session total above. Its DOM-observed first render/asset-ready/visual-ready events are **1,478.2 / 2,743.8 / 3,716.6 ms**; optional JS heap is **34,824,868 bytes**, not total process/GPU memory. [The comparison receipt](2026-10-31-unity-production-candidate.md) documents separate process-memory measurements, readiness/workload differences and the absence of a measured engine-quality winner. Later SD-072 selects Unity for forward production; this Babylon result remains a reference and rollback.

## Visual acceptance still open

The capture harness uses the actual reported renderer and records viewport/canvas dimensions, quality, sample duration/window, asset loads and source hashes. Its development-session transfer total includes Vite modules and is explicitly **not** a production download measurement. Samples retain up to 300 intervals after warmup; the requested run duration differs from the measured rolling-window duration.

The clean gallery and named-device samples establish the bounded technical proof. The full polished-opening milestone still needs human judgment of materials/lighting, further art production and a representative sustained gameplay run. A stronger gaming computer, physical PlayStation/Xbox device, actual audible narration and the family usability session remain NOT TESTED for this increment.

## Review and release

- **Implemented:** bounded Babylon visual foundation, review controls and performance instrumentation around an existing genuine Blender asset.
- **Verified:** the named completed logic/build/browser/photo/foundation checks, fresh development source boundary, final build/two targeted production checks and six short AMD-renderer samples.
- **Human review:** NOT REVIEWED. No claim of GTA V/AAA equivalence, photorealism, final family likeness or completed actual-house reconstruction.
- **Recovery:** revert only this increment's presentation/instrumentation/UI changes if needed; retain existing saves, pod source/runtime and prior Dragon/Town work. No destructive reset or blanket staging was used by this task.
- **Release:** NOT APPROVED FOR RELEASE. No push, remote CI run, site integration, Railway setup or deployment performed by this task. SD-083's Unity evaluation and [SD-072 forward direction](../decisions/2026-10-31-unity-channel-alignment.md) preserve this baseline as a reference/rollback; they do not establish completed migration or human quality approval.
