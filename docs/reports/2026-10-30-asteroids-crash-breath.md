# Asteroid, mechanical crash and charged-breath verification — October 30, 2026

## Scope

- **SD-053:** richer cinematic presentation, detailed solid asteroids/collisions and graphic mechanical crash/loss feedback. [Decision](../decisions/2026-10-30-asteroids-mechanical-crash.md).
- **SD-054:** wind up the Space-bar charged attack, add a strong local roar and direct a fire beam. [Decision](../decisions/2026-10-30-charged-breath-windup-roar.md).
- Base branch/commit: `feat/town-drive-lab`, `1495dedfa3a9ddb33f1d51b8ad6166400ba68a17`, with existing uncommitted Dogfight/Town Drive edits preserved. No deployment/push/merge is included.
- Pre-expansion baseline: [mechanical red integration, SD-049/050/051](2026-10-30-mechanical-dragon-integration.md), with 148 logic tests, build, installed-Chrome asset/play observations and twelve distinct development cases passing across the initial run/retry. Eight production cases had not completed before this new scope; those results are not a final expanded pass.
- The blue Blender source and old organic runtime remain unchanged. The active red GLB is `dragon-mechanical-red-v001.glb`, 5,285,276 bytes, SHA-256 `5812435c9ac760ab8efb2d3c4b2f597fc8a6a9a1e0331ae907049dd8ffbbd9a7`.
- Expected changed scope: local procedural asteroid/environment/lighting and colliders, authoritative graze/crash/loss sequence, mechanical FX, charged-breath timeline/beam/audio, input/pause/recovery integration and relevant tests/docs. No family gore/injury/death, new campaign lore, backend or external generators/publication.

## Checks

| Check or exact command | Result | Evidence and limitation |
| --- | --- | --- |
| Solid asteroid geometry/placement/LOD and collision representation | PASS for named source/native checks | Seven source-level cases pass in `artifacts/asteroid-unit-final.log`; native flow loads the new field and actual boosted contacts are checked below. Procedural geometry/texture provenance and measured payloads are recorded below; no new public binary assets. Human realism review remains separate. |
| Graze, fatal collision/fire loss, repeated triggers and mechanical destruction/recovery | PASS for named source/native cases | Two post-preference crash cases pass in 47.9 s, including outer clearance, fixed 61-degree reduced-motion lens and paused-stage captures; mechanically tumbling dragon/fire/debris were visually inspected clear of the rock. Separate actual enemy-fire hull loss/recovery/retry passes; details below. Source-level graze/guard cases are in the 178-unit result. |
| Windup/roar/fire beam, one charge/impact and active flight/dodging | PASS in frozen native flow | Actual steering through windup/beam, charge/impact once-only behavior and roar/beam events pass in `artifacts/asteroids-native-playtest-final.log` / `asteroids-playtest.json`. Digital audio output is checked separately below; human audibility/quality remains untested. |
| Pause/interruption/retry/reload and save boundaries | PASS for named native/production flows | Final crash-specific input/recovery and fourteen distinct native development cases pass, with seven final production cases passing across initial runs/retries. Actual hull-loss retry also leaves saves unchanged. |
| `npm.cmd run test:unit` | PASS | 178 current-repository tests pass on the final camera/preference candidate; `artifacts/asteroids-final-candidate-unit.log` (9.237 s). Earlier `asteroids-final-unit.log` and the interim 161-case run are separate checkpoints. |
| `npm.cmd run build` | PASS | Final camera/preference candidate builds in 3.99 s, `artifacts/asteroids-final-candidate-build.log`; the aggregate wrapper later builds it again in 20.90 s with the same `dogfight-tOVmiXK0.js`. Final hashes are below. The existing large-chunk notice remains a packaging warning, not an appearance/performance approval. |
| `node tools/verify_mechanical_dragon.mjs` | PASS | `artifacts/asteroids-dragon-contract.log`; retained red GLB/component/bone/weight/pivot contract remains valid. |
| Final development browser regressions | PASS across final runs/retries | Fourteen distinct development cases pass in installed Chrome/headless on isolated fixture port 5185, using `artifacts/native-crash.config.ts`: two crash cases, eight initially passing cases and four successful retries. See exact disposition/logs below; no clean aggregate initial run is claimed. The concurrent Town Drive workflow on 5175 is preserved. |
| Final production browser regressions | PASS across final run/retry | Default SwiftShader preview on 4177: six initially passing cases plus the isolated Earth keyboard-to-map retry establish seven distinct passes against the final artifact. Exact failure/retry scope and logs are below; no clean initial run is claimed. |
| Post-test-edit TypeScript check | PASS | `artifacts/asteroids-final-test-typecheck.log`; test configuration/assertion repairs remain type-correct. |
| `npm.cmd run check` aggregate wrapper | BLOCKED, exit 1 | `artifacts/asteroids-repository-check.log`: its 178 unit tests and build pass, then Playwright refuses already-occupied `http://127.0.0.1:5175/space-dragon/`. The concurrent Town workflow is preserved; no port reuse, process kill or configuration weakening. Scoped fourteen-case native and seven-case production evidence uses isolated 5185/4177. This is not an aggregate wrapper pass. |
| Named-device size/render/frame/loading sample | MEASURED; no sustained/60-fps pass | Chrome 156/AMD at 1366 × 768: 469 frames in ten seconds, 21.3226 ms mean, 33.5 ms p95, about 46.90 fps. Whole-frame counters: 200 calls, 268,962 triangles, 5,200 points and 16 lines. Model parse 125 ms, shader compile 934.3 ms, application initialization 2,814.8 ms, external navigation-to-ready 6,322.8 ms. See scope below. |
| `python tools/check_foundation.py` | PASS for final records | `artifacts/asteroids-final-docs-foundation.log`; structure/links/skill mirrors only. Earlier current-expansion check retained as `asteroids-crash-foundation.log`. |
| `python -m unittest discover -s tests -p 'test_*.py' -v` | PASS | 41 tests run in 5.949 s, two Windows symlink-privilege skips; `artifacts/asteroids-final-docs-python.log`. Not gameplay evidence. |
| `python tools/verify_family_references.py` | PASS | All 18 reference images match sizes/checksums/inventory; `artifacts/asteroids-final-docs-photo.log`. No new likeness/publication approval. |
| Current public source/manifest inventory | PASS at inspection | Four entries / 49 unique declared files exactly match public asset paths and all declared public sizes/hashes; public and built manifest bytes match. The concurrent Drive entry is preserved. Final production checks remain separate. |
| Human intensity/realism/comfort/audio/difficulty, endurance and other devices | NOT TESTED | Not established by code, screenshots or digital audio checks. |

## Current implementation choices

Exact final production and test-check commands (PowerShell output redirection):

```powershell
npx.cmd playwright test --config playwright.production.config.ts tests/dogfight.production.spec.ts tests/production.spec.ts *> artifacts/asteroids-final-candidate-production.log
npx.cmd playwright test --config playwright.production.config.ts tests/production.spec.ts --grep 'built First Contact' *> artifacts/asteroids-final-earth-production-recheck.log
npm.cmd run typecheck *> artifacts/asteroids-final-test-typecheck.log
npm.cmd run check *> artifacts/asteroids-repository-check.log
```

Exact native development commands use installed Chrome 156.0.8078.76 with `channel: 'chrome'`, headless mode and no SwiftShader launch flags. The isolated Vite config is `artifacts/vite-native-crash.config.ts`, base URL is port 5185 and cache is `node_modules/.vite-native-crash-5185`; the concurrent Town server on 5175 is not reused and the real idea notebook is untouched:

```powershell
npx.cmd playwright test --config artifacts/native-crash.config.ts tests/asteroid-crash.spec.ts *> artifacts/native-crash-final-browser.log
npx.cmd playwright test --config artifacts/native-crash.config.ts tests/dogfight.spec.ts tests/word-lock.spec.ts tests/cockpit.spec.ts tests/mechanical.spec.ts *> artifacts/native-dogfight-frozen-browser.log
npx.cmd playwright test --config artifacts/native-crash.config.ts tests/dogfight.spec.ts --grep "WADZ moves" *> artifacts/native-dogfight-wadz-retry.log
npx.cmd playwright test --config artifacts/native-crash.config.ts tests/cockpit.spec.ts tests/dogfight.spec.ts tests/mechanical.spec.ts --grep "accelerating stretches|home launcher|red mechanical" *> artifacts/native-dogfight-three-recheck.log
```

The charged attack uses an authoritative 0.65-second windup plus 1.1-second beam, with one end impact at 1.75 seconds. Flight/dodging/enemy fire remain active throughout. Fatal crash/loss cancels the pending attack without charge refund or target reward; roar/beam audio can be canceled selectively rather than stopping an otherwise active flight bed. Orange fire/charge glow, jaw motion and original local layered roar are presentation. Thirty-one targeted logic tests passed during development; the later 178-case frozen unit, native and production results above supersede that subset for the expanded candidate.

Swept asteroid contact is wired to graze damage/deflection and fatal loss: graze damage ranges from 12–35; normal impact speed at least 65 m/s, or remaining hull no greater than collision damage, is fatal. A mechanical-debris sequence lasts three seconds, reduced to 0.8 seconds under reduced motion, then enters the existing recovery flow. Normal pause/resume freezes/restores that clock; retry clears the sequence and restores the encounter without changing campaign saves. These tested implementation choices remain reviewable numeric difficulty values, not owner-approved tuning.

An interim full unit run passed 161 cases with build success before the separately reported seven asteroid tests were added (`artifacts/asteroids-interim-unit.log` / `asteroids-interim-build.log`). The initial 31-case charged-attack/audio subset is retained in `artifacts/breath-windup-unit.log`. A subsequent native interaction flow reached the end of its control checks but observed a homepage favicon 404 (`artifacts/asteroids-mechanical-playtest.log`); the page's data-icon fix was applied and the later clean rerun is recorded below. This does not establish a failed model/control result, and the earlier baseline's clean native pass is not substituted for the final expanded flow.

## Expanded native baseline and final loss checks

The expanded baseline command is `node artifacts/asteroids-playtest.mjs`, with clean result in `artifacts/asteroids-native-playtest-final.log` / `asteroids-playtest.json`: installed Chrome 156.0.8078.76, 1366 × 768, AMD/ANGLE Direct3D11, no page/console errors and no external HTTP requests. It precedes the later crash-camera/preference corrections, which have their own final checks below. The actual red model reports nine bones, 43 meshes and 82,348 triangles. Mouse flight/aim, LMB plasma, both completed rolls, RMB, flap/glide, tail/jaw movement, muzzle alignment, windup steering, beam/impact, pause/retry/reload and returning home pass. Muzzle alignment is within floating-point zero. The earlier favicon request is fixed and this flow is clean.

Another intermediate native harness expected exactly one beam sound event, but it had deliberately paused after the beam started. Resume correctly restarts the sound, yielding a second voice event while charge consumption and target damage remain once-only. The harness expectation was corrected; this is not a duplicate attack/impact. Earlier logs are retained rather than rewriting them as clean runs.

Two native crash state/input cases passed initially, but reviewing their screenshots exposed a real presentation defect: a conservative 13.75 m collision core inside an approximately 30.55 m visual rock allowed the dragon/camera to penetrate the rock before the destruction view, obscuring tumbling and wreckage. That state/input pass is not a visual pass. The correction moves the impact presentation hull outside `surfaceRadius + 3.3 + 1.5` m, reflects fatal wreck drift outward, clears roll offset and snaps a stable chase camera. The first corrected build passes (`artifacts/asteroids-camera-final-build.log`, `dogfight-eBElWir5.js`); final native/visual outcomes on the subsequent preference-corrected candidate are recorded below. This is presentation placement rather than a larger collider or a hidden dodge immunity.

The first production run passed six of seven cases; the charged-breath case reached windup/beam but exhausted a 30-second wall-time wait under heavy software-rendering/parallel desktop load before 1.75 seconds of simulated attack time completed. The retry increases the wait to 60 seconds and case budget to 180 seconds without weakening impact, charge or timing assertions. That one-case retry passes in 1.3 minutes, making seven distinct pre-camera-correction production passes across the initial/retry runs. All seven then pass against the first corrected build in 2.9 minutes (`artifacts/asteroids-camera-production-final.log`), including Earth keyboard/save, asset hashes and public-source boundaries. The first run is retained as a timeout rather than reported as a clean pass.

Review found one further reduced-motion camera branch issue: crashing during boost could retain a 74-degree lens despite the preference's fixed 61-degree lens. The final correction restores 61 degrees in that branch and labels the failed reticle `SPACECRAFT LOST`. Final unit/build, two native crash checks (including FOV/outer clearance and paused stage capture), twelve other development cases and seven production cases are rerun against this last frozen candidate; the earlier build is not substituted for its identity.

The two final native crash cases pass in 47.9 seconds on the corrected source (`artifacts/native-crash-final-browser.log`). They explicitly check the 61-degree reduced-motion lens and outer visual clearance, and capture Escape-paused tumble at 1.248 simulated seconds / 11.005 m surface clearance and wreckage at 1.898 seconds / 12.364 m. Browser screenshots `artifacts/mechanical-crash-tumble.png` and `mechanical-crash-wreckage.png` were reviewed: the mechanically tumbling dragon and fire/debris remain visible outside the rock. Only the pause card's CSS was hidden for the captures; these establish the actual paused 3D stages, not live HUD behavior. The earlier occluded captures remain as `mechanical-crash-tumble-occluded.png` and `mechanical-crash-wreckage-occluded.png`.

On the exact final `dogfight-tOVmiXK0.js` build, the next seven-case production run passes all three Dogfight cases plus the notebook-endpoint/source-exclusion/public-asset-hash checks, but the Earth keyboard-to-map case hits its 45-second whole-case timeout (`artifacts/asteroids-final-candidate-production.log`: six pass, one fail, 4.0 minutes). Its isolated retry passes in 24.6 seconds (39.6 seconds including setup; `artifacts/asteroids-final-earth-production-recheck.log`). These establish seven distinct production passes against the exact final build across the initial six and one retry; there is no clean initial seven-case run claim. The earlier seven-case pass precedes the reduced-motion correction and is not substituted for this final evidence.

The final-source twelve-case native development run initially passes eight and fails four (`artifacts/native-dogfight-frozen-browser.log`, six minutes). The W/A/D/Z test passes unchanged in isolation in 22 seconds (29.5 seconds including setup; `artifacts/native-dogfight-wadz-retry.log`); the initial inspection delay under CPU contention had let active incoming fire exhaust hull, and gameplay is not paused or made immune to accommodate the test. Three other rechecks address a hardcoded origin when using isolated port 5185, sampling glide mode/pose atomically, and waiting for the post-settings flight speed. They all pass in 48.2 seconds (`artifacts/native-dogfight-three-recheck.log`), preserving the same gameplay assertions rather than changing combat or assistance rules. With the two final crash cases, fourteen distinct development cases have observed passing runs across this initial run/retries. There is no clean aggregate fourteen-case run claim. Original failure traces/screenshots remain in `artifacts/native-dogfight-initial-failure-evidence.zip`. The Earth production whole-case budget is raised from 45 to 120 seconds without assertion changes; the isolated retry follows the native work to reduce contention.

`node artifacts/hull-loss-playtest.mjs` passes against the final source in installed Chrome 156 at 1366 × 768 (`artifacts/hull-loss-playtest.log` / JSON). Straight idle flight receives actual enemy projectiles until hull reaches zero at 22.5951 simulated seconds, with cause `hull`, zero asteroid contacts, 56 debris pieces, automatic recovery and a retry restoring 100 hull; saves remain unchanged and no page errors occur. No QA mutation or teleport induces this loss. The sample reports 45 enemy shots and 43 projectile contacts; contacts include normal invulnerability-guard rejections, not 43 separate seven-point damage applications. Normal damage guards remain active, without added spelling/flight immunity.

`node artifacts/breath-audio-render.mjs` uses the actual local synthesis, Web Audio compressor and soft output ceiling in a 48 kHz `OfflineAudioContext`. Results in `artifacts/breath-audio-render.log` / JSON:

| Signal | Normalized RMS | Peak | Frames |
| --- | ---: | ---: | ---: |
| Roar | 0.228494 | 0.561560 | 21,600 |
| Beam | 0.269501 | 0.546321 | 36,000 |
| Tail after completion | 0 | 0 | 7,200 |

This establishes nonzero bounded digital signal and a silent tail in the tested rendering, not speaker loudness, human timbre/comfort or an audio-quality approval. Sound remains opt-in and locally generated; no family voices or external recordings are used.

The ten-second idle live-combat frame sample in the expanded native baseline is approximately 46.90 fps and remains below a 60-fps goal. It precedes the final crash-camera branch corrections and is not an endurance, mobile or human control result. The earlier 36.6-fps sample is a different scene/run; changes in scene cost and uncontrolled desktop conditions prevent a precise causal A/B improvement claim. Whole-frame render counters include scene/shadows/postprocessing; no last-postpass-only one-draw statistic is used.

## Procedural asteroid candidate

The frozen `src/prototypes/dogfight/assets/asteroids.js` candidate supplies 24 solid, world-static collidable rocks; two nearby hero LODs use 10,580 triangles each below 360 m, with 980/180-triangle mid/far versions. Hero refinement is capped at 21,160 triangles. A separate one-call instanced field of 640 decorative 20-triangle fragments adds 12,800 triangles; these far fragments are scenery, not implied collision hazards.

The refined candidate uses fourteen crater bowls and fourteen fracture planes per seeded variant, hard fracture-cap normals, ridge/chip displacement and charcoal albedo with 0.9–1 roughness/lower environment reflection. This supersedes the initial seven-plane appearance pass; triangle/LOD counts are unchanged. Three original procedural 256 × 256 RGBA rock PBR data textures occupy 786,432 bytes of base CPU pixels. A new original 512 × 256 terrain/ocean/cloud planet map replaces the old striped planet presentation, adding 524,288 bytes, for 1,310,720 base CPU texture bytes. Nominal RGBA8 storage with generated mips is approximately 1,747,624 bytes (about 1.67 MiB), excluding driver/runtime overhead; this is a computed payload estimate, not measured VRAM allocation. Asteroid attribute/instance array payload totals approximately 3,296,080 bytes, with an equivalent GPU upload payload before allocation overhead. No scans, downloaded asteroid models, reference-image textures or new public binary files are introduced; this work needs no additional manifest file declaration. Geometry/texture generation provenance is local code rather than an external asset license claim.

Conservative core colliders sit inside visual bounds, with a surface radius for grazes. Placement provides a 220 m initial safe zone and a 40 m straight-corridor parameter. Rocks recycle only beyond 2,200 m and are repositioned 950–1,700 m away; reset is deterministic. The solid field is separate from the following sky. Nebula/ring brightness and distant celestial tessellation are restrained to support readable lighting and cost.

`node --test tests/asteroids.test.mjs` passes seven targeted logic cases after both the initial and refined appearance pass (`artifacts/asteroid-unit.log` and `asteroid-unit-final.log`). These geometry/placement/LOD checks are source-level evidence; actual browser crash appearance/contact, combined performance sampling and final regressions are recorded separately above. Human realism/comfort and sustained performance remain untested.

## Final artifact identity

Closing inspection at 18:59:48 EDT retains branch `feat/town-drive-lab`, HEAD `1495dedfa3a9ddb33f1d51b8ad6166400ba68a17`, with the prior uncommitted Dogfight/Town work preserved. The completed aggregate wrapper emitted the same final Dogfight bundle. Full file-level evidence is in `artifacts/asteroids-final-artifacts.json`; source/rollback hashes match the baseline:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `dist/dogfight/index.html` | 8,742 | `5bfd357e671a12cdc403a4d752e5a130acdbcbaeb0e831cdee8bc019e4f829e6` |
| `dist/assets/dogfight-tOVmiXK0.js` | 734,319 | `81e12f8bf89268cb495f9e78ee8348b612d374a4371389de734f0dd1d385b8b3` |
| `dist/assets/dogfight-D2ok6vNP.css` | 24,698 | `896dd0b76ccb3b2dee4ad01dfbc2f59b58f285cb0a6fe65dd4e12749cddf6b1d` |
| Public/built `dragon-mechanical-red-v001.glb` | 5,285,276 | `5812435c9ac760ab8efb2d3c4b2f597fc8a6a9a1e0331ae907049dd8ffbbd9a7` |
| Public/built `assets/manifest.json` | 15,763 | `cabbd86c4f61962cc3e10412dbb80ab39ef97d295fb238f45e96574fc04bd150` |
| Preserved public `dragon.glb` rollback | 1,525,544 | `4d38601d5bd8022efce27aa6df26f36d4e8173189612a82022f5f1be62e5cec2` |
| Preserved source `Space Dragon Spacecraft-v002.blend` | 11,971,962 | `5214e4c82053d41d42bc55062353b998cc59a2a2c76d294d88a39665690439dc` |

## Review and release

**IMPLEMENTED and technically VERIFIED for the named local scope:** 178 units, build, fourteen distinct installed-Chrome development cases and seven production cases pass across the documented initial/retry runs, with actual collision/hull-loss recovery and digital audio checks. The standard `npm.cmd run check` wrapper is **BLOCKED** at occupied port 5175; its build/unit stages pass and scoped browser evidence uses separate ports. No aggregate wrapper pass is claimed.

Authoritative state, normal pause/retry/return, active flight during charged-attack windup, opt-in sound, reduced motion and existing campaign/learning/save boundaries are retained. Human visual/feel/difficulty/audio/comfort review, sustained 60-fps/endurance and other-device testing remain **NOT TESTED**; this does not establish AAA or final photorealistic quality. Next: review this local candidate in Chrome on the Lenovo and record the desired visual/comfort/tuning changes, then optimize against a controlled hardware benchmark. Public-release/deployment approval: **NOT GRANTED**. No commit, push, merge or deployment was performed for this integration.

Collision scope is the dragon hull against conservative asteroid cores/surface grazes, not triangle-exact physics. Far fragments remain decorative. Crash pieces are visual debris rather than authored cuts that split the actual dragon mesh. Drones and projectiles do not collide with the rocks, and rock occlusion does not block target locking in this increment; existing combat behavior is preserved. This is an original local procedural art/gameplay candidate, with final realism, human comfort and AAA quality review still open.
