# Mechanical Space Dragon integration verification — October 30, 2026

## Scope

**Historical boundary:** this report is the verified local asset/native/development baseline for SD-049/050/051. The owner expanded the task before the pending production suite to detailed asteroids/mechanical crash (SD-053) and Space-bar windup/roar/beam (SD-054). [The new receipt](2026-10-30-asteroids-crash-breath.md) owns that expanded implementation and its final checks; no earlier result is presented as a pass of the later scope. The concurrent Town Drive realism override owns SD-052.

- **SD-049:** integrate the existing mechanical spacecraft candidate into the Dogfight Lab locally, without redesign. [Decision](../decisions/2026-10-30-mechanical-dragon-integration.md); source-only [SD-048 receipt](2026-10-30-mechanical-dragon.md).
- **SD-050 owner override:** [make the whole dragon red](../decisions/2026-10-30-red-mechanical-dragon.md). The active game candidate is now `dragon-mechanical-red-v001.glb`: red/crimson armor, wings and hardware, with orange emission retained as an integration choice. The supplied blue v002 source remains unchanged; no shape/rig redesign is authorized by this palette change.
- **SD-051 owner steering:** [steadier enemy standoff](../decisions/2026-10-30-dogfight-enemy-standoff.md) replaces pursuit/ramming motion with gentler relative target movement. Tracking/fire, health/damage, charging, evasion and saves stay unchanged; logic and actual play verification remain required.
- Base branch/commit at inspection: `feat/town-drive-lab`, `1495dedfa3a9ddb33f1d51b8ad6166400ba68a17`. Existing Dogfight/Town Drive edits were already present and are preserved. No commit, push or deployment is part of this task.
- Source: ignored `assets/source/local/spacecraft/space-dragon-spacecraft/Space Dragon Spacecraft-v002.blend`, 11,971,962 bytes, SHA-256 `5214e4c82053d41d42bc55062353b998cc59a2a2c76d294d88a39665690439dc`.
- Recovery source v001: 5,284,691 bytes, SHA-256 `0c20980f9515837400b1d6563c8ab11933f7c84648958254bd8689f88a016c14`.
- Previous runtime retained: `public/assets/dogfight/models/dragon.glb`, 1,525,544 bytes, SHA-256 `4d38601d5bd8022efce27aa6df26f36d4e8173189612a82022f5f1be62e5cec2`.
- Changed scope: separate optimized export/script, new versioned runtime GLB, material/model/muzzle integration, relevant tests, asset manifest and project records; SD-051 additionally refines enemy movement. Source review images, original artwork, family references and Town Drive content are outside the runtime export.

## Export candidate and preservation

Blender 5.2.1 LTS produced a separate selected raw export and optimized working copy. Rigid geometry is grouped into 36 bone/material render batches; 699 original rigid component names remain as named bone-following pivot nodes. Seven flexible meshes remain independently skinned. All 706 intended component names/pivots and all nine bones are retained. The optimized red working source is ignored `assets/source/local/spacecraft/space-dragon-spacecraft/Space Dragon Spacecraft-v002-game-red-v001.blend` (21,112,866 bytes); this authoring/recovery size is not a download measurement.

Small hardware bevels below 0.8 m maximum dimension use one segment instead of two. The candidate's overall rest bounds match the source. Blender-space pivot comparisons are within approximately `4.77e-7` meters across the sample bone poses. The independent final-file comparison reports exact rest pivot equality after normalization and identical inverse-bind arrays; these structural checks still require actual browser animation review.

| Stage | Bytes | Meshes / render primitives | Triangles | SHA-256 |
| --- | ---: | ---: | ---: | --- |
| Selected raw blue export, retained locally | 6,745,196 | 706 / 706 | 135,780 | `ed71fb563906f768bba5a53928c0874ef2d9f7621890c652db26be6eb652a9a3` |
| Final red runtime candidate | 5,285,276 | 43 / 43 | 82,348 | `5812435c9ac760ab8efb2d3c4b2f597fc8a6a9a1e0331ae907049dd8ffbbd9a7` |

Final runtime: `public/assets/dogfight/models/dragon-mechanical-red-v001.glb`. It has 753 nodes, one skin with nine joints, eight materials and zero embedded images/textures or baked clips. Existing runtime bone animation supplies wing/jaw/tail motion. `KHR_materials_emissive_strength` is used but not required; no new texture/geometry decoder is needed. Geometry is reduced by about 39.35% and render primitives by about 93.91% relative to the selected raw candidate. It remains larger than the old 1,525,544-byte organic runtime model; no old-versus-new performance conclusion follows from file size alone.

Hidden organic recovery objects and the review studio are excluded. Zero embedded images means source/reference photos and the packed original texture are absent from the GLB. Blender-only procedural shading is represented by material constants and optional shared runtime grain/detail rather than a claim that every Blender node was baked exactly. The six nonemissive material families use varied red/crimson finishes; the two original orange emissive families retain strengths 5 and 9. Original material names remain identifiers, including the historically named blue armor material, despite its owner-authorized red value.

The retained local export receipt is `assets/game/local/spacecraft/space-dragon-spacecraft/dragon-mechanical-red-v001-export.json`. Reproducible tools are `tools/export_mechanical_dragon.py` and `tools/verify_mechanical_dragon.mjs`. Export logs include a pre-normalization red artifact; the final runtime hash above identifies the promoted file. No earlier log has been rewritten to imply a different original export.

The first independent export comparison failed its pivot contract (`artifacts/mechanical-red-contract.log`). A corrective normalization aligns 699 rigid pivot nodes plus the muzzle socket with their source rest transforms without changing render geometry, bone transforms or inverse-bind data. Pre-normalization `-exporter-unadjusted.glb` copies remain local. The corrected comparison passes with maximum final rest-pivot error zero (`artifacts/mechanical-red-contract-final.log`); the current export script applies that normalization to fresh runs. This is a real retained failure/correction, not a validator-only completion claim.

Important optimization limitation: the rigid component identities are preserved as transform/pivot nodes, not independently toggleable render meshes. The retained raw GLB and editable sources preserve individual geometry for future assembly/reveal exports. The current Dogfight integration does not claim an implemented assembly system.

## Export commands and artifacts

Commands executed from the repository root, with PowerShell output redirected using `*>` to the named logs:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python tools/export_mechanical_dragon.py
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python tools/export_mechanical_dragon.py -- --red-palette
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python tools/export_mechanical_dragon.py -- --normalize-existing-pivots
node tools/verify_mechanical_dragon.mjs
npx.cmd --no-install gltf-transform validate assets/game/local/spacecraft/space-dragon-spacecraft/dragon-mechanical-v002-raw.glb
npx.cmd --no-install gltf-transform validate assets/game/local/spacecraft/space-dragon-spacecraft/dragon-mechanical-red-v001.glb
node tools/asset-inspect.mjs assets/game/local/spacecraft/space-dragon-spacecraft/dragon-mechanical-red-v001.glb
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python artifacts/mechanical_game_reopen.py
```

Logs: `artifacts/mechanical-export.log`, `mechanical-red-export.log`, `mechanical-pivot-normalize.log`, `mechanical-red-contract-final.log`, `mechanical-raw-validate.log`, `mechanical-red-validate.log` and `mechanical-red-inspect.json`. The red export log's pre-normalization file is 5,311,612 bytes with SHA-256 `c809635cbe2fe3247c16872e8de3f4f6e3dd1176ef335f9749021375147a64eb`; the final promoted hash/size above supersede that intermediate candidate.

The optimized red `.blend` was also reopened in a separate background Blender process and rendered: `artifacts/mechanical-red-reopen.log`, local `dragon-mechanical-red-v001-reopen.json`, and `Space Dragon Spacecraft-v002-game-red-v001-review.png` beside the source. It contains 43 visible meshes, all 706 component identities and unchanged nine-bone rest transforms. Sample posed render-vertex maximum displacements were approximately 0.619394 m for each wing, 0.428518 m for the jaw and 0.266793 m for Tail_3. The independent file verifier additionally checks the 36 rigid batches' full weights, identical POSITION/JOINTS/WEIGHTS data for the seven flexible meshes, and identical rest geometry bounds. This is source/export articulation evidence, not a substitute for in-game animation review.

## Checks

| Check or exact command | Result | Evidence and limitation |
| --- | --- | --- |
| Source and rollback file inventory | PASS | Actual sizes/SHA-256 values above match the source-art receipt. The blue v002 source and old runtime GLB were rechecked unchanged after final export/manifest promotion; v001 is retained as the baselined recovery source. |
| Separate export optimization and bone/component preservation | PASS | Export/independent file checks retain all 706 component names, exact final rest pivots, nine bone rest transforms/inverse-bind arrays and the muzzle socket. Hidden source recovery/studio objects excluded. `artifacts/mechanical-export.log`, `mechanical-red-export.log` and the local export JSON. Actual browser articulation remains separate. |
| Optimized red source reopen, render and weighted pose checks | PASS | Separate background Blender reopened the final source and produced the local red review image. Actual weighted render vertices move under wing, jaw and tail poses; exact final GLB weight/flexible-data/rest-bound checks pass. `artifacts/mechanical-red-reopen.log`, local reopen JSON and final contract log. Human art approval remains separate. |
| `gltf-transform validate` on raw and final red exports | PASS with warnings/information | Zero errors. Final red has 43 `NODE_SKINNED_MESH_NON_ROOT` warnings (all 43 skinned meshes) and 43 unused-UV information entries; raw has 706 corresponding non-root warnings. UVs are deliberately retained for runtime grain. `artifacts/mechanical-raw-validate.log` and `mechanical-red-validate.log`; format conformance is not appearance/performance approval. |
| Public asset manifest/path/hash/node inventory | PASS for public files | New final red GLB is active; old organic GLB remains rollback. All 22 declared files have unique paths, exact public sizes/hashes and the expected GLB nodes. `NOTICE.md` provenance header reflects the added local revision, while the Three.js license text is preserved. Built-output comparison remains pending production checks. |
| Owner-updated red palette, orange eye emission and procedural-detail handling | PASS for agent browser inspection | Actual GLB rendered in installed Chrome using the runtime material/animation code: red/crimson surfaces, orange emission, teeth and articulated jaw were inspected. `artifacts/mechanical-browser-views-recheck.log`, `mechanical-browser-views.json` and head/top/three-quarter/jaw PNGs. Authored red-game-export color/PBR factors and original orange emission are preserved; the blue source colors are deliberately superseded by SD-050. Unsupported Blender roughness noise is flattened to constants matching authored roughness, with restrained shared UV normal grain as an approximation rather than an exact procedural bake. Four small runtime-generated detail textures are used; the zero-image GLB needs no KTX/decoder path. Blue v002 remains unchanged. Human approval remains separate. |
| `npm.cmd run test:unit` | PASS | 148 tests, zero failures; `artifacts/mechanical-final-unit.log`, exit 0. Covers retained state/control/combat and new asset/material/AI logic. |
| `npm.cmd run build` | PASS, including final configuration rebuild | TypeScript/build pass, exit 0; `artifacts/mechanical-build.log` and `mechanical-final-build.log`. The later rebuild retains the same Dogfight HTML/JS/CSS/GLB hashes below. Existing bundle-size/timing advisories are not compilation failures; compilation is not gameplay/performance approval. |
| First affected development browser run | INTERMEDIATE FAIL | Twelve cases: 10 passed / 2 failed in 9.5 minutes, `artifacts/mechanical-browser.log`. The mechanical case was interrupted by a concurrent Vite restart/review HTML reload; the word-to-breath case reached the acquisition wall timeout. Corrections and final targeted rerun are described below. |
| Final targeted development browser rerun | PASS | Both affected cases pass in 1.5 minutes; `artifacts/mechanical-browser-recheck.log`. Combined with the initial ten passing cases, all twelve distinct affected development cases have passing evidence. This is not a claim that the first run was clean. |
| Production browser/asset regressions | NOT TESTED to completion | Production checks remain pending; native/development evidence is not substituted for built-output verification. |
| `node artifacts/mechanical-playtest.mjs` | PASS | Installed Chrome 156.0.8078.76, 1366 × 768; `artifacts/mechanical-playtest.log` / JSON. Actual loading, camera framing, flap/glide, both completed rolls, jaw/tail movement, pointer/keyboard aim, plasma, charged breath, pause mid-burst, retry/reload and return home passed with zero page/console errors or external HTTP requests. This is headless input/observation evidence, not human suitability. |
| New muzzle/effect/projectile alignment | PASS | Runtime socket `[0, 0.5, -3.6600000858]` in model space. Actual transformed visual/combat origin difference was zero at rest and approximately `7.11e-15` m during firing (floating-point precision). Ordinary fire and charged breath both exercised the new muzzle. |
| Steadier enemy movement without disabling incoming fire/tracking/damage | PASS for native observation and logic checks | Sampled live-combat contact ranges were approximately 283.44, 392.85 and 489.41 m; hostiles stayed at standoff while fire and ordinary damage continued during incomplete spelling. The simulation/cadence comparison below remains separate from human difficulty review. |
| Download size, loading and frame/render sample | MEASURED; no sustained/60-fps pass | Final GLB is 5,285,276 bytes. Model fetch+parse 150.6 ms; shader compile 878.4 ms; application initialization 2,579.5 ms; external navigation-to-ready observation 5,428.2 ms. Ten-second idle live-combat sample: 366 frames, 27.322 ms mean, 49.9 ms p95, about 36.6 fps. Full-frame counters: 186 calls / 309,626 triangles including shadows/postprocessing. See scope below. |
| `python tools/check_foundation.py` | PASS after export/manifest and owner-steering records | `artifacts/mechanical-integration-foundation.log`; validates structure/links/skill mirrors, not gameplay. A final summary recheck will follow runtime results. |
| `python -m unittest discover -s tests -p 'test_*.py' -v` | PASS | 41 tests run with two Windows symlink-privilege skips; `artifacts/mechanical-integration-python.log`. Does not verify game behavior. |
| `python tools/verify_family_references.py` | PASS | All 18 reference sizes/checksums/inventory match; `artifacts/mechanical-integration-photo.log`. This is not new likeness/publication approval. |
| Human appearance/comfort/audio review, endurance and public release | NOT TESTED | Not established by compilation, format validation or screenshots. |

## Standoff fire tuning evidence

Enemy standoff keeps targets in range and facing the player more often than the earlier pursuit/flyby cycle. The first standoff implementation retained the 1.35-second firing interval and unintentionally increased uptime. Deterministic 20-second logic simulations included the real 0.65-second damage guard:

Current station offsets are 260, 360 and 460 m forward with lateral/vertical separation. The formation carries ordinary player travel while relative correction is limited to 20 m/s and 24 m/s², with gentle 28 m lateral / 12 m vertical drift, a 220 m avoidance radius and 150 m minimum-separation target. Facing remains independent of hover movement. These are reversible implementation choices, not new story geography or owner-approved numeric difficulty targets.

| Configuration | Shots / raw projectile contacts at 20 seconds | Health / outcome |
| --- | ---: | --- |
| Previous pursuit/flyby movement | 42 / 39 | 44 at 10 s; 23 at 20 s |
| Intermediate standoff, 1.35 s interval | 115 / 108 | Dragon depleted at 14.38 s |
| Tuned standoff, 4.4 s interval | 42 / 37 | 58 at 10 s; 9 at 20 s, still active |

The final interval compensates for removed flyby downtime. Three-shot bursts, 0.75-second telegraph, seven-point damage and 0.65-second guard remain. Contacts are measured before the damage guard and are not the same as health-loss events. The intermediate excessive-pressure result is retained as a tuning failure/correction. These are deterministic logic measurements, not device timing, real-player outcomes or approval that the new difficulty exactly equals the old behavior. Actual browser interaction and human difficulty review remain separate.

## Browser appearance and performance scope

The installed browser was Chrome 156.0.8078.76 on the Lenovo development laptop at 1366 × 768. WebGL reported `ANGLE (AMD, AMD Radeon (TM) Graphics (0x000015E7) Direct3D11 vs_5_0 ps_5_0, D3D11)`. The ten-second idle sample kept live enemies/fire/spelling active; it did not establish endurance, thermal stability, mobile performance or human control feel. The approximately 36.6 fps sample does not meet a 60-fps desktop goal and must not be presented as such.

The counter-enabled previous-model comparison sampled 510 frames in ten seconds, approximately 51 fps. An earlier previous-model baseline was around 20 fps before full-frame counter instrumentation, showing run-to-run variability. These runs do not isolate desktop load, warm-up/caching or other environmental effects and are not a controlled same-load A/B benchmark; they identify a cost/performance concern rather than a precise causal percentage. The earlier last-postpass-only one-draw counter was inadequate; the runtime now resets Three.js rendering statistics once per complete frame so the recorded 186 calls and 309,626 triangles include the shadow/scene/post passes.

The browser asset-view harness uses the actual exported GLB plus the runtime material and animation modules for front/head/top/jaw inspection. Its first log contains a favicon HTTP 404, corrected with an explicit harness favicon response; `mechanical-browser-views-recheck.log` records the subsequent clean pass. This was a harness request issue, not a failed model load. Full gameplay is covered by the separate actual-input playtest, not inferred from these isolated review renders.

Further performance work should use repeated same-device scenarios and profiling before changing geometry/material fidelity; retained sources/raw GLBs make such comparisons reversible. Human art/comfort/difficulty review and a longer playthrough remain open even after technical regression checks pass.

## Regression interruption and recovery

The first 12-case development run passed ten cases and failed the mechanical-articulation and word-to-breath cases. Live Vite logs show concurrent `vite.config.ts` / `tools/dev-drive-layout.ts` changes restarting the server around 18:10:17–31, followed by generated `.tools/drive-material-preview.html` reload around 18:10:33, overlapping the mechanical case. Dogfight runtime source had been frozen before that run. Concurrent Town Drive work was preserved; no reset or rollback erased it. The configuration now ignores generated `artifacts/`, `.tools/` and local reference/source/game outputs for server watching, while retaining the existing driving entries/cache configuration.

The word case hit a 15-second wall-clock acquisition wait under software rendering. Installed Chrome had already completed the same interaction. The retry extends that wait to 30 seconds and keeps the same single-target lock and 0.65-second gameplay dwell requirement; no lock/damage/learning assertion is weakened. Final command: `npx.cmd playwright test tests/mechanical.spec.ts tests/word-lock.spec.ts --grep 'red mechanical|one letter at a time'`, log `artifacts/mechanical-browser-recheck.log`: **two passed in 1.5 minutes**. All twelve distinct development cases now have passing evidence across the initial run and targeted retry; the initial failure record remains. This history distinguishes test-environment interruption and wall timing from the earlier real export-pivot and fire-uptime corrections.

## Built candidate identity

The successful build currently under browser regression has these identities; they do not identify a deployed release:

| Built path | Bytes | SHA-256 |
| --- | ---: | --- |
| `dist/dogfight/index.html` | 8,742 | `b4100de7ccfd9e1cc3f1943da0bde269b57db7f4c1dcad38587c40327f8b44e1` |
| `dist/assets/dogfight-NEAE8uF8.js` | 680,483 | `495970aabd4ef7955be14840e9d09455be2a178cb722a50c8d2e84077e32d5aa` |
| `dist/assets/dogfight-D2ok6vNP.css` | 24,698 | `896dd0b76ccb3b2dee4ad01dfbc2f59b58f285cb0a6fe65dd4e12749cddf6b1d` |
| `dist/assets/dogfight/models/dragon-mechanical-red-v001.glb` | 5,285,276 | `5812435c9ac760ab8efb2d3c4b2f597fc8a6a9a1e0331ae907049dd8ffbbd9a7` |

## Review and release

**IMPLEMENTED and technically VERIFIED for the named pre-expansion local asset/native/development scope:** red mechanical model integration, preserved rig/components, updated muzzle/materials and gentler standoff have passing export, 148-unit/build, native Chrome and twelve-distinct-development evidence. Production/global allowlist checks had not completed before the owner's expanded SD-053/054 work. This is not release approval or a final expanded-game check. Retained original sources and runtime GLB provide rollback; normal pause/retry/return remain. No new personal media, external generation/upload, hosting service or backend is introduced by this baseline.

Human final-art review: **NOT REVIEWED**. Public-release/deployment approval: **NOT GRANTED**. The owner's explicit local integration request authorizes the versioned game candidate and browser review, not publication. Baseline exported/build identities, actual observations and limitations are recorded above; the later asteroid/crash/breath candidate must be identified and checked separately.
