# Dragon Blender-to-game pipeline — verification receipt

Started October 30, 2026; completed local native verification October 31. **IMPLEMENTED and technically VERIFIED for the named local asset/browser checks.** SD-060 implements the owner's ten-point pipeline request; [the contract](../engineering/DRAGON_ASSET_CONTRACT.md) defines runtime ownership and reproducible commands. This does not extend the whole-body artwork or change engines, campaign progress or save boundaries. Human art/comfort and release approval remain separate.

## Scope and artifact

- Base: `feat/town-drive-lab`, HEAD `a4277da7b546f3294ce2018771669b34831a07d0`, with existing uncommitted Dogfight/Town/Sonniss work preserved. No commit, push or deployment is part of this task.
- Current runtime is Three.js 0.180.0; Earth/Town remain separate Babylon pages. Actual loader/controller/render settings were inspected before changes.
- The new export is `dragon-flight-v003.glb`, 9,653,504 bytes, SHA-256 `1446d3c3c9606a61ad8d871473ce5b1242107c0a6d52b59c795102adb74f853c`. `tools/promote-dragon-flight.mjs` passed verification and copied it to the explicit public runtime path/manifest; the active descriptor is `FLIGHT_DRAGON`. It refuses to overwrite a versioned target whose bytes differ.
- New editable source: `assets/source/local/spacecraft/space-dragon-spacecraft/Space Dragon Spacecraft-v004-flight.blend`, 44,767,417 bytes, SHA-256 `8bb56d5ab099104c5943f92220d015de0a38151debdc57789bc4a75d8da26717`. The separate `Space Dragon Spacecraft-v004-reference.blend` retains the comparison setup, SHA-256 `40892ff61089a612ac10e03c7eb0715788cfc14e17025c0a66147597e584a868`.
- `assets/game/local/spacecraft/space-dragon-spacecraft/flight-v003/export-receipt.json` proves the prior source and cinematic v002 GLB are unchanged. The original 9,337,704 binary bytes are preserved exactly; 4,660 animation bytes and seven new named socket nodes are added. Geometry remains 41 meshes/81,991 triangles, one nine-joint skin and the same two 1024-square material maps. Original component nodes/rest/bind transforms remain.
- Source reopen passes in `artifacts/pipeline-flight-reopen.json`: nine rest bones retained; source/socket position error at most `5.96e-8` m. Structural verification preserves 706 component pivots with zero maximum error and identical inverse binds (`artifacts/pipeline-flight-final-structural.json`). glTF validation reports zero errors, 41 existing non-root-skin warnings and 29 unused-UV information entries (`artifacts/pipeline-flight-final-validate.log`). Live Blender 5.2.1/addon 1.8/protocol 15 was inspected read-only with telemetry off; its original v002 session was not replaced.
- The candidate generator is protected by `tools/asset_output_guard.py`: recorded output hashes must match before regeneration, and edited or unreceipted source/export/reference files cause a safe abort. No force bypass is provided. This recipe starts from v003; it does not automatically export later owner edits in v004. Those edits require a fresh versioned candidate and explicit export review. The guard change leaves all delivered source/model/reference image hashes unchanged.
- Final built Dogfight bundle: `dist/assets/dogfight-Bj7cXDwN.js`, 763,812 bytes, SHA-256 `99abb9a03b9321d45274217e9652c4c9257976e44993946aa1d6998194dd5768`. Public and built manifests both hash to `eb414316ab0824e246fc5a1a4664ec4228881d6e72d118e809950929095cd013`; the source and GLB identities above remain unchanged. Final HEAD remains `a4277da`; task changes are uncommitted.

## Implemented behavior

The retained loading manager loads a new versioned model. `DragonGameplayRoot` holds authoritative flight position/orientation at unit scale; `DragonVisualMotion` holds bank, roll and flap lift. Units are metres, +Y up and -Z forward. The existing origin is retained. Measured talon contact is Y = -0.665026843547821 m; landing alignment metadata does not alter flight.

The existing 3.3-m sphere and one-metre projectile padding are now an explicit collision contract independent of mesh bounds, scale, LOD or wing pose. Mouth effects and projectile/beam origins use the same resolved socket. Named wing, thruster, targeting, camera and ground sockets are available and inspectable; the wing markers follow their bones, while camera tracking excludes visual roll/bob. No new thruster attack or wing-effect behavior is implied.

Blender exports Flight, Glide and Boost loops, each one second with seven quaternion channels. The runtime blends them with a 0.18-second exponential response, retaining irregular flap/glide rhythm, additive bank/tail steering and exact procedural jaw response to ordinary fire/windup/beam. Missing clips/channels fall back; imported root/translation/scale/jaw tracks cannot control gameplay. Reset, interruption, same-time pause evaluation and disposal are covered by focused unit checks.

## Renderer audit and measured optimization

The installed-Chrome baseline used 1366 × 768 CSS and drawing-buffer dimensions, DPR 1, Chrome 156.0.8078.76, ANGLE AMD Radeon Graphics `0x15E7` through D3D11 on this Lenovo. Canvas antialiasing was enabled, but both offscreen composer targets had zero samples. That left scene geometry without scene-target MSAA. The new half-float scene target requests two samples; this GPU reports supported RGBA16F sample counts `[8, 4, 2, 1]`. The driver-selected count is not directly measured.

Color management was already coherent: linear-sRGB working space, ACES exposure 1.1, a single `OutputPass` and sRGB output. Authored glTF normal/AO/roughness and emission survive the runtime material treatment. Reflection PMREM is 128; the hero-following directional key uses a 1024-square PCF-soft shadow with a 48-metre-wide frustum. No resolution/exposure increase or texture rebake was chosen from a screenshot alone.

| Ten-second native sample | Mean frame interval | p95 | Estimated fps | Whole-frame calls / triangles |
| --- | ---: | ---: | ---: | ---: |
| Cinematic v002 baseline, zero composer samples | 16.91959 ms | 17.1 ms | 59.103 | 194 / 268,444 |
| Same v002, two requested samples, before depth removal | 17.00714 ms | 17.1 ms | 58.799 | 194 / 268,444 |
| Final flight v003, two samples and unused bloom depth removed | 16.72220 ms | 17.1 ms | 59.801 | 194 / 268,444 |

Evidence: `artifacts/pipeline-renderer-baseline.json/png/log`, `artifacts/pipeline-msaa2-depth-before.json/png/log` and `artifacts/pipeline-flight-final.json/png/log`. The final sample contains 599 frame intervals, with zero browser errors. Final model fetch/parse was 141.4 ms, shader compilation 571.1 ms and application-ready 2,283.9 ms; externally observed navigation-to-ready was 4,400.2 ms. These short, vsync-limited runs under variable desktop load do not establish a causal speed difference or sustained 60 fps.

The two-sample audit estimated 122,110,820 bytes of declared resources: 54,535,972 texture bytes, 17,218,624 depth-renderbuffer bytes and 50,356,224 multisample bytes. The dragon alone estimates 11,185,832 bytes, including two RGBA 1024-square mip chains and its bone texture. Compatible shared texture uploads were deduplicated; no duplicate-upload groups were found. These are dimension/format estimates, not measured driver VRAM.

The audit identified **3,845,184 bytes of unused depth storage** across eleven bloom targets at this resolution (the earlier arithmetic estimate was 96 bytes high). Depth is disabled on those full-screen targets and retained on the scene targets. The final estimate is **118,265,636 bytes**: unchanged 54,535,972 texture bytes and 50,356,224 multisample bytes, with depth reduced to 13,373,440 bytes. Dragon-only texture estimate remains 11,185,832 bytes and duplicate-upload groups remain zero. This is an observed reduction in declared allocations; an FPS improvement or physical VRAM reduction of exactly this size is not assumed.

## Matched presentation

The new local inspection tool provides neutral and flight environments, matching cameras, animation preview, sockets/contact markers and render diagnostics. `tools/capture-dragon-pipeline.mjs` passed against final flight v003 with zero browser errors. `artifacts/dragon-pipeline-review/index.html` presents six Blender/browser pairs; the directory also contains two flight-environment views and an interactive-tool screenshot, 15 PNGs total. `receipt.json` records camera, settings and resources.

The source references are `flight-v003/blender-neutral-{front,side,full,head}.png` and `blender-cinematic-{full,head}.png`, with `references.json`. Blender uses **Cycles CPU, 64 samples and denoising**, 1440 × 1000, vertical FOV 43°, and the actual rest pose. Browser comparisons match the rest-pose geometry, camera positions/targets/FOV and area-light geometry. Neutral uses Blender Standard versus browser no-tone-map/sRGB; cinematic uses Blender AgX versus browser ACES. Light power converted by `W / (area × π)` is approximate, not a claim of equal radiometric output.

Specific remaining differences observed in the paired screenshots:

- The browser underside, chest, wing roots and claws are brighter/flatter because the comparison's Three area lights do not cast the Cycles contact/reflection shadows. The actual flight scene does retain its directional PCF shadow; that does not reproduce Cycles global illumination.
- Thin cheek/jaw edges and horn highlights remain harsher/more aliased than the denoised 64-sample Blender reference.
- Cinematic browser crimson is more saturated, and its eye glow is more yellow than the AgX salmon/orange response. The intentionally different display transforms and approximate lamp conversion remain visible.
- Geometry and framing match; broad body/wing forms still have the previous benchmark's simplified construction. This pipeline proves the asset transfer, not final photorealism.

These are agent visual observations. Human appearance approval remains separate. Rest-pose comparison images do not establish motion behavior; the input/animation tests below provide that evidence.

## Checks

The first native full wrapper (`artifacts/pipeline-full-check.log`) passed 208 units/build and all 43 development cases, then passed eight of nine production cases. It failed the production asset-manifest audit because the new promotion entry used `runtimeFiles` instead of the manifest's required `files` field. The promotion tool and entry were corrected; the GLB/source bytes are unchanged. Original failure evidence is retained in `artifacts/pipeline-production-initial-failure/`. The verifier additionally checks asset metadata, accessor/buffer-view preservation and attachment parents, with two positive/tamper tests.

The final complete wrapper **exited 0**: **209 unit tests, build, 44/44 development browser cases, 9/9 production cases and 18 photo inventory checks pass** in `artifacts/pipeline-final-check.log`. It includes real Shift-to-Boost clip blending, pause/resume/reset, resize/color/AA contract, skin/socket checks, normal fire, spelling/lock/windup/beam, live dodging, crash/recovery and existing Earth/Town flows. The native Town route completes; this does not relabel the older SD-059 software-renderer failure. No runtime/model edits followed this final full run.

Exact native full-check setup, with fixture and preview ports separate from the real notebook server:

```powershell
$env:SPACE_DRAGON_NATIVE_CHROME = '1'
$env:SPACE_DRAGON_TEST_PORT = '5187'
$env:SPACE_DRAGON_PREVIEW_PORT = '4187'
npm.cmd run check
```

The installed-Chrome opt-in is local; CI retains Chromium/SwiftShader. The separate software Boost/contract case initially failed after its boost/pause/reset assertions: it read the renderer size immediately after `setViewportSize`, before the resize handler reported the requested size (still 1440 × 1000 rather than 1000 × 720). `artifacts/pipeline-software-check.log` and `artifacts/pipeline-software-results/` preserve that failure. The test now polls the actual renderer CSS size for up to 15 seconds before checking its drawing buffer. This is a test-only synchronization change; runtime/model bytes are unchanged. The default-software retry passes in 21.9 seconds / 27.5 seconds total (`artifacts/pipeline-software-retry.log`). That targeted pass does not establish a clean full default-software suite or remote CI run. No deployment was performed.

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Current branch, dirty tree, loader/controller and renderer inspection | PASS | Existing work preserved; scoped code/artifact identities own the result rather than HEAD alone. |
| Blender-authored clips and retained geometry/skin/maps | PASS | `flight-v003/export-receipt.json`, final structural/reopen/validation files above, and verified local promotion. |
| Output-preservation guard unit checks | PASS | Four cases in `artifacts/pipeline-output-guard-tests.log`; modified/missing-receipt outputs are preserved and regeneration is rejected. |
| `node --test tests/dragon-animation-clips.test.mjs tests/wing-cadence.test.mjs tests/mechanical-dragon.test.mjs` | PASS against local candidate | 13 cases in `artifacts/pipeline-animation-tests.log`; test-only `DRAGON_CLIP_TEST_ASSET` points to the local export before promotion. Real exported loops are seamless, glide wings steady, all eight moving-bone skin probes articulate and Root stays fixed. The later ground-socket-only correction leaves animation/geometry bytes unchanged. |
| Same focused animation command against the final public export | PASS | 13 cases in `artifacts/pipeline-animation-public-tests.log`, with the default public path and final `1446…` artifact. |
| `node --test tests/dragon-instance.test.mjs tests/acceleration-camera.test.mjs tests/crash.test.mjs` | PASS | 23 cases in `artifacts/pipeline-root-tests.log`: transform/attachment contract, independent collision and retained camera/crash logic. |
| Initial unit suite / TypeScript / build | PASS, before final capability-selection refinement | 206 unit cases in `artifacts/pipeline-unit-tests.log`; `pipeline-typecheck.log` and `pipeline-build.log`. The final 209-unit full run is separately recorded below. |
| First native `npm.cmd run check` on isolated ports 5187/4187 | FAIL at manifest audit | 208 units/build, 43/43 development and 8/9 production pass. `artifacts/pipeline-full-check.log` plus preserved production failure directory. The `files` schema correction and final rerun are identified separately; the initial result is not relabeled. |
| Strengthened flight verifier positive/tamper checks | PASS | Two cases in `artifacts/pipeline-validator-tests.log`; original binary prefix, metadata and required parent/attachment structure are checked. |
| Python repository checks | PASS with host skips | `artifacts/pipeline-python-tests.log`: 45 tests, two Windows symlink-privilege skips. |
| Final complete native `npm.cmd run check` | PASS, exit 0 | `artifacts/pipeline-final-check.log`: 209 units/build, 44/44 development, 9/9 production and 18 photo inventory checks. Includes actual input-to-result behavior, pause/retry/reload, source/debug exclusions and matching public/dist manifest/asset hashes. |
| Initial default Chromium/SwiftShader Boost/contract browser case | FAIL at resize synchronization | `artifacts/pipeline-software-check.log`, 20.9 s; boost, pause and reset passed before the immediate old-size assertion. Original trace/context retained; test-only polling correction described above. |
| Corrected default Chromium/SwiftShader Boost/contract retry | PASS | `artifacts/pipeline-software-retry.log`, 21.9 s case / 27.5 s total; original failure retained. Actual boost blending, pause/resume/reset and resize/color/attachment contract pass on this separate software path. No software frame-rate claim. |
| Corrected final Boost/contract test on installed Chrome | PASS | `artifacts/pipeline-native-final.log`: 7.3 s case / 9.5 s total. The final test-only resize synchronization change passes both rendering paths; shipped runtime remains the same as the complete passing native run. |
| Final TypeScript, foundation and diff checks | PASS | `artifacts/pipeline-final-typecheck.log`, `artifacts/pipeline-final-foundation.log`; `git diff --check` reports only line-ending normalization warnings. Foundation validates structure/links/skill mirrors, not gameplay. Branch remains `feat/town-drive-lab`, HEAD `a4277da`, with local changes uncommitted. |
| Final Blender/browser matched views and native frame/resource sample | PASS for capture / MEASURED | `artifacts/dragon-pipeline-review/receipt.json`, 15 PNGs and local gallery; `artifacts/pipeline-flight-final.json`. Named hardware, ten-second sample and limitations above. |

## Review and release

- Human appearance/comfort/listening review: **NOT REVIEWED**. No GTA V or reference-level photorealism claim.
- Approved for release: **NO**; this task authorizes local integration and verification only.
- Independent neck/leg animation, landing controller, full-body remodeling, sustained performance and other physical devices remain outside this increment or untested.
- Rollback retains cinematic v002, red mechanical and original organic descriptors/files; switch only the active descriptor and rerun applicable checks.
- No source/reference/photo publication, commit, push or deployment. Prior Town route test failures belong to their original receipts and are not erased by scoped asset checks.
