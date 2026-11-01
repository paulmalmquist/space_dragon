# Unity Dogfight migration and tactical encounter — SD-075

## Scope and current verification

**IMPLEMENTED and technically VERIFIED locally.** The final Unity Web player passes 11 automated Chrome encounter cases on WebGPU and the same 11 on forced WebGL2, with screenshots reviewed. All 69 EditMode tests and the retained browser regression wrapper pass. This is a development review player, not human art/comfort approval or a production release.

The owner explicitly chose Unity while carrying over Dogfight controls/behavior, then confirmed “yeah lets fully migrate to unity for this pass.” See the [decision](../decisions/2026-10-31-unity-dogfight.md) and [preserved tactical request](../../ideas/2026-10-31-unity-dogfight-source.md). Scope is a separate Dogfight encounter in the existing Unity project. First Contact, Launch and Town Drive retain their own scenes and concurrent ownership. The original Three.js Dogfight remains a rollback/behavior reference. No deployment or campaign migration is included.

- Base: `feat/town-drive-lab`, `deedd01528b3e8d22c0af3bedba9a79436f80be7`. Tested working tree includes uncommitted Dogfight files and concurrent Launch/Town Drive/document changes; it is not a clean committed release artifact.
- Unity **6000.6.7f1**, URP **17.6.0**, glTFast **6.20.0**, Input System **1.20.1**, Test Framework **1.4.6**. Windows local project; owner target remains the Lenovo laptop with Chrome. Observed installed Chrome **156.0.8078.76**, Windows, Lenovo/AMD Radeon (TM) Graphics (0x15E7), ANGLE/D3D11 device string; actual APIs WebGPU and OpenGLES3. Tests are headless browser input on this machine, not a human play session.
- Runtime: `unity/SpaceDragon/Assets/SpaceDragon/Runtime/Dogfight/`; pure state plus scene adapter, presentation, audio and HUD. Tests: `Assets/SpaceDragon/Tests/EditMode/Dogfight/`.
- Editor: `Assets/SpaceDragon/Editor/Dogfight/DogfightProject.cs`. Separate generated scene: `Assets/SpaceDragon/Dogfight/Generated/Dogfight.unity`; imports and derivatives stay in this lab's own folder.
- Tooling: `tools/unity/prepare-dogfight-assets.mjs`, `run-dogfight.ps1`, `serve-dogfight.mjs`, `verify-dogfight.mjs`; own Web template/bridge. No second Unity project or new backend dependency.

## Implemented behavior

| Input | Encounter behavior |
| --- | --- |
| Arrows / mouse | Flight; arrows override mouse steering. `M` toggles mouse flight-and-aim versus mouse aim with arrow flight. Aim follows pointer independently of the dragon. |
| `W/A/D/Z`, `X` | Independent reticle movement; recenter aim. |
| `R/F`, held Shift | Cruise throttle; finite boost. Propulsion damage scales only the boost-speed bonus, down to 65%, preserving cruise and steering. |
| `Q/E`, `B` | Paid physical barrel rolls and break turns, separate evasion energy/cooldowns. Rolls break enemy acquisition and incoming seekers; break turns change actual trajectory without immunity. |
| Left mouse / right mouse | Ordinary plasma / held camera zoom. Acceleration changes camera setback/FOV; stars are not stretched. |
| Four-letter prompts / F1 / Space | Randomized safe word bank; assisted charge; reticle dwell then 0.65-second windup/roar and 1.1-second beam, resolving damage once. Flight, dodging and combat continue during spelling. |
| Enter / middle mouse | Deliberate missile launch after a valid confirmed lock. Invalid launch spends nothing. |
| Hold Tab, then `1/2/3` | Compact Hull/Propulsion/Weapons repair selector; mouse buttons also route through the selector. |
| Escape / focus loss | Manual pause; focus loss pauses and releases combat/boost arming. Restart resets encounter state and transient effects. |

`FlightState`, `BreathState`, `EnemyPilot`, `CollisionImpact`, `TacticalState`, `HomingMissile` and `SalvageField` own rules independently of rendering. The scene adapter supplies actual aim/range/visibility/contact facts. Source animation cannot move the authoritative root, grant damage, consume repairs or change collision size.

Initial tactical tuning is editor-visible:

- Three 100-point systems. Localized propulsion/weapons hits also deal a 35% hull share. Caution/critical/imminent thresholds are 65/30/15; highest warning wins over lower-priority alarms.
- Three repairs per encounter, one initial salvage, capacity three. Each completed repair restores 35 points and costs one part/activation after four seconds. A hit of at least 12 interrupts without spending. Repairs prevent boost and missiles while retaining steering; destroyed dragons cannot be repaired.
- One deduplicated salvage component per disabled bogey, at most six active; 18-metre pickup radius. Inherited velocity decays through drag; full inventory leaves the component available. Extra salvage never replenishes repair activations.
- Two missile charges, sequential 15-second healthy recharge, increasing to 30 seconds with weapon damage. Acquisition grows from 1.5 to 2.1 seconds; 0.2-second interruption grace. Range 850 metres, cone 14 degrees, clear scenery line of sight required. Trajectories turn at most 55 degrees/second and expire after eight seconds; scenery and targets use swept projectile tests. The generated scene sets **120 missile damage**, making two hits sufficient against a 216-health drone; the general ScriptableObject class default remains separately editable.
- Three standoff enemies continue movement, telegraphed tracking and burst pressure. Forty-eight procedural solid asteroids use independent sphere colliders on layer 8. Swept hull collision restores the dragon outside the rock, applies speed/normal-dependent graze or fatal damage, and preserves spent maneuver resources. Normal impact speed at least 65 m/s is fatal; a graze deflects real flight. Loss cancels combat/repair and presents a mechanical wreck/restart sequence, with reduced-motion support.

There are **no campaign, learner, inventory or PlayerPrefs writes** in the Dogfight runtime. Both actual browser runs preserve the isolated localStorage sentinel and other existing entries across the encounter cases. This checks that browser context only; reload persistence, IndexedDB and unrelated origins were not separately audited.

## Asset and presentation evidence

The source export is unchanged: `public/assets/dogfight/models/dragon-flight-v003.glb`, **9,653,504 bytes** (9.65 MB decimal), SHA-256 **`1446d3c3c9606a61ad8d871473ce5b1242107c0a6d52b59c795102adb74f853c`**. Its Blender sources and earlier exports remain available. No new Blender/source-art revision was made in this increment.

The preparer pins and verifies ten original inputs: dragon, drone, nebula, planet, supplied-asset notice and five existing Sonniss WAV cues. Their combined source size is **10,609,560 bytes**; derived material contract and intake receipt are additional. It preflights every destination and refuses to overwrite changed assets or receipts. `asset-receipt.json` and `material-contract.json` are in `Assets/SpaceDragon/Dogfight/`. Audio provenance remains `assets/source/audio/sonniss-gdc-2026/game-cues.json`.

The first actual Unity setup receipt records:

| Imported source property | Measured result |
| --- | --- |
| Renderers / skinned renderers | 41 / 41 |
| Source triangles / materials | 81,991 / 10 |
| Rig | Nine original bones: Root, Jaw, Wing_L/R, Tail_0–4 |
| Attachments | Eight named sockets: muzzle, wing L/R, thruster L/R, target, camera, ground |
| Clips | Flight, Glide and Boost; one second each; seven wing/tail rotation channels, no gameplay-root or Jaw tracks |
| Scale and coordinates | Metres; +Y up, +Z gameplay. Gameplay root → bank/roll visual motion → exactly one Y180 source adapter → unchanged -Z GLB. glTFast already converts handedness. |
| Contact / collision | Source contact Y = -0.6650268435 m; independent 3.3 m gameplay sphere; hostile plasma includes the retained 1 m hit padding. |

Setup checks the source hash, exact bone/socket names, animation bindings/durations, triangle count and muzzle/contact positions. The actual importer selects `Shader Graphs/glTF-pbrMetallicRoughness-Clearcoat` for the dragon. Unsupported emissive-strength extensions are corrected through generated clones reset from immutable imported materials on every Setup: dragon energy **[3.2, 0.272, 0.0288]**, drone reactor approximately **[2.85, 0.78, 0.135]** in linear space. Packed maps and material identity stay intact. The initial receipt used the wrong normal-scale property name and reported 1; the importer itself preserved the values. The corrected audit reads `normalTexture_scale`. The fresh setup receipt generated during the Web build at **16:35:11 UTC** confirms approximately **.18 dark paint, .22 crimson and .72 other atlas materials**; this does not by itself establish a completed Web build.

Runtime presentation samples the actual authored wing/tail clips, blends Flight/Glide/Boost with irregular strokes and steady glide beats, and applies combat Jaw plus steering/bank motion separately. Added detailing is **four combined accent meshes / 416 triangles** using the original gunmetal/crimson materials, with small-detail LOD culling. These additions do not alter the source GLB or replace the whole-body art pipeline. Damage, smoke, sparks, maintenance drones and persistent repair patches are bounded runtime presentation; the particle pool is 48 slots.

The separate pipeline configures linear color, ACES grading, restrained bloom, a filtered nebula cubemap for reflections, warm key/cool rim lighting, 1024-pixel main-light shadows, render scale 1 and 2× MSAA. These are **configured settings**, not measured visual/performance outcomes. Scene references preserve URP Lit/Unlit, including the transparent smoke shader variant. Setup/build restores the prior shared pipeline, player graphics/template and build-scene settings in `finally`; it does not regenerate Launch/First Contact. Web build requests WebGPU with WebGL2 fallback; both paths require actual player evidence.

## Checks and artifacts

Run repository commands from `C:\Projects\space_dragon`. Logs and generated builds are local review artifacts, not deployment evidence.

| Command / check | Result | Evidence and limits |
| --- | --- | --- |
| `node tools/unity/prepare-dogfight-assets.mjs` then `--verify`; `node --check tools/unity/prepare-dogfight-assets.mjs` | PASS | Ten unique hash-pinned source files plus an identical visible-sky copy: eleven imports, 10,709,614 bytes. The immutable v001 intake receipt is retained; v002 records the additional copy. No overwrite or source replacement. |
| `powershell -ExecutionPolicy Bypass -File tools/unity/run-dogfight.ps1 -Action setup` | PASS | `artifacts/unity/dogfight-setup-20261031-162533-681-29112.log`; actual `SPACE_DRAGON_DOGFIGHT_SETUP_OK`. `unity/SpaceDragon/Builds/dogfight-setup-receipt.json` contains import/material metrics. |
| First `run-dogfight.ps1 -Action test` | FAIL — retained | `dogfight-editmode-20261031-162850-380-33200.xml`: 65/66. Salvage velocity assertion expected exactly 30 but observed 30.0000019; a floating-point tolerance was missing. Runtime behavior was not changed to satisfy it. |
| Corrected `run-dogfight.ps1 -Action test` | PASS | `artifacts/unity/dogfight-editmode-20261031-163212-659-36132.xml` and matching test log: **66/66**, zero skipped. Includes 32 flight/breath/enemy/contact cases, tactical/resource/missile/salvage rules, scene collision tests, synthetic animation ownership and warning cadence. Does not substitute for actual imported-clip playback or browser play. |
| `python -m unittest discover -s tests -p 'test_*.py' -v` | PASS | Fresh `artifacts/unity/dogfight-python-tests.log`: 45 tests in 7.238 seconds, two Windows host symlink-privilege skips. Repository tooling checks do not establish Unity gameplay. |
| `node tools/verify-dragon-flight.mjs` | PASS | `artifacts/unity/dogfight-asset-validation.json`: source GLB structure/preservation, 9,653,504 bytes, hash above, 41 meshes / 81,991 triangles / nine joints; original 9,337,704 binary bytes preserved. |
| `python tools/check_foundation.py` | PASS | `artifacts/unity/dogfight-foundation.log`, after this receipt was added. Documentation/foundation only. |
| Final `run-dogfight.ps1 -Action test` after camera correction | PASS | `artifacts/unity/dogfight-editmode-20261031-170528-321-25992.xml`: **69/69**, zero skipped. Three additional camera regressions cover moving-anchor carry, speed/zoom and stable roll tracking. Final HUD tessellation/panel changes are additionally exercised by the final player runs below. |
| Final `run-dogfight.ps1 -Action web` | PASS | `artifacts/unity/dogfight-web-20261031-171843-848-29548.log`; receipt `unity/SpaceDragon/Builds/DogfightWeb/build-receipt.json`, created **2026-10-31T17:20:56.3799145Z**, result Succeeded, 90.04-second incremental build, shared settings restored. |
| Installed-Chrome `npm.cmd run check`, with `SPACE_DRAGON_NATIVE_CHROME=1` | PASS | `artifacts/unity/dogfight-npm-check-native.log`: **237 units**, TypeScript/Vite build, **49 development / nine production** browser cases and **18 photo inventory** checks pass. The earlier software-renderer run was deliberately stopped after seven passes to release memory for Unity; its partial log is retained as `dogfight-npm-check.log`, not called a pass. |
| `node tools/unity/verify-dogfight.mjs` | PASS | Final WebGPU run `artifacts/unity/dogfight-playtest/runs/2026-10-31T17-23-07-299Z/report.json`: **11/11**, sixteen screenshots, no page/console errors, external HTTP requests or request failures; isolated localStorage sentinel unchanged. |
| Same verifier with `SPACE_DRAGON_DOGFIGHT_WEBGL2=1`, output `artifacts/unity/dogfight-playtest-webgl2` | PASS | Final OpenGLES3 run `runs/2026-10-31T17-26-06-507Z/report.json`: **11/11**, sixteen screenshots, same error/network/storage checks. Chrome was launched with the established `--disable-features=WebGPUService` fallback flag. |
| Screenshot review and gallery | REVIEWED, bounded technical appearance | [Local gallery](../../artifacts/unity/dogfight-gallery.html), generated from the final WebGPU report. Reviewed flight/lock, beam and moving repair: crimson wings/gunmetal body, actual mouth beam, stable closer framing, stars, visible damage/patch effects and panel clearance. Source/reference-quality equivalence and human art approval are not established. |
| Windows standalone Dogfight, physical controller, human sound/comfort/appearance | NOT TESTED | Separate coverage from Unity compilation and installed Chrome. |

## Requested encounter demonstrations

All eight requested demonstrations pass in **both** final browser runs. The harness uses browser keyboard/mouse events for flight, aiming, launch, ordinary fire, spelling, Space breath, repair choice and pause. Development fixtures arrange repeatable threats, target placement, damage, supplies and a solid asteroid; fixture use is recorded per case and screenshot. These demonstrations are not an unassisted difficulty/learning assessment.

| Requested demonstration | Observed outcome |
| --- | --- |
| Sustained lock and missile launch | Real target tracking, range/cone/LOS and deliberate Enter/middle-click launch; invalid attempt spends nothing; moving missile resolves actual impact. |
| Defeat and salvage retrieval | Ordinary plasma and guided missiles disable a bogey; one item drops, drifts and is collected through the pickup radius. Full inventory retains the item. |
| Localized damage and warning | Propulsion damage changes the system bar and prioritized warning; sparks/scars/smoke originate around the damaged machinery. |
| Successful moving repair | Tab + selected system starts two maintenance drones; steering remains active, boost/missiles are inhibited, success restores health and commits one salvage/activation plus a patch. |
| Interrupted repair | A real spawned hostile projectile hits during the action; the repair stops with both resources retained. |
| Exhausted three-repair cap | Three successful repairs consume all activations; extra salvage does not restore them or permit a fourth repair. |
| Sequential missile recharge | Both charges are spent and refill sequentially on real simulation time; no clock advancement or forced-charge mutation. |
| Full encounter restart | Health, damage/patches, word state, repair resources, charges/timers, enemies, projectiles and modified fixture rock reset; disabled dragons cannot be repaired. Campaign storage stays separate. |

Additional checks cover arrows/mouse, M modes, independent aim, throttle/boost, rolls/break turn, RMB zoom, pause/release guards, neutral startup, actual 11.5 m steady camera trailing distance, live flight during spelling, windup/beam timing, incoming missile warning/evasion, physical asteroid collision and recovery.

## Measurements and corrections

The final artifact is **112,356,397 bytes** uncompressed. Its build receipt SHA-256 is `bb97fe6be699cbcf61b817ce83eee006af57a67b2da6f447b565ce8c4f7077a4`. The measured cold local HTTP response bodies total **32,565,654 bytes** with gzip, including HTML, loader, framework, data and WASM. Initial browser wrapper readiness was **2.97 seconds** in the final WebGPU run; localhost transfer/compilation is not an internet download or full production startup guarantee. Source/artifact hashes are recorded in each report.

Natural encounter samples use real ArrowRight steering for ten seconds after warm-up, with no quiet/target/damage fixture. Only `resetPerf` clears measurement history. Each final sample contains **595 frames** and survives the encounter. Actual canvas is **1366×768**, DPR1; URP render scale1, 2x MSAA, linear color, ACES, restrained bloom, 1024 shadow map/two cascades, independent sharp sky and filtered reflections. Wall-clock Update intervals are not GPU timings or sustained device benchmarks.

| Backend / revision | Mean frame interval | Approx. fps | p95 interval | Last-frame draws | Last-frame rendered triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
| WebGPU, before HUD reduction | 19.82 ms | 50.4 | 26.00 ms | 514 | 283,674 |
| WebGPU, final | **16.88 ms** | **59.2** | **20.00 ms** | **410** | **282,668** |
| WebGL2, before HUD reduction | 23.66 ms | 42.3 | 33.00 ms | 513 | 282,842 |
| WebGL2, final | **16.86 ms** | **59.3** | **19.00 ms** | **410** | **282,668** |

Triangle counters include rendered passes/GUI, not only unique asset triangles; instantaneous counts change with visibility and pose. HUD radar/lock arcs were unnecessarily dense at their actual pixel size. Reducing segments removes 88 rotated GUI line calls normally and 104 while tracking, with subpixel-to-about-one-pixel curve deviation at this viewport. The final sample reports 104 fewer draws and lower frame intervals. Ten-second observations do not prove an endurance improvement or isolate every system-level timing factor.

Unity's runtime Texture allocation counter reports **1.156 MiB on WebGPU versus 70.376 MiB on WebGL2** for the same content. That backend-dependent accounting is **not comparable driver VRAM**; WebGPU omits allocations this API reports on WebGL2. WASM heap introspection is unavailable in this build and explicitly reports null. Optional JS heap is separately labeled. No exact GPU-memory claim is made.

The GLB remains **9,653,504 bytes / 81,991 triangles / 41 skinned renderers / ten materials / nine bones / eight sockets / three clips**. Its hash remains `1446d3c3c9606a61ad8d871473ce5b1242107c0a6d52b59c795102adb74f853c`. Runtime armor adds **416 triangles across four combined meshes**. The restored starfield adds **10,400 triangles in one draw**, with no lights or shadows. No source geometry or reference collection was exported accidentally.

Retained failures and corrections:

- First tests: 65/66 because exact float comparison expected 30 instead of 30.0000019; corrected tolerance, then 66/66 and later 69/69.
- First browser startup: diagnostics accessed unexported Emscripten `HEAPU8`, aborting the player. The failing run `2026-10-31T16-51-48-133Z` and temporary HTML-patch hashes are retained; both source template and final fresh Unity builds omit the probe. Subsequent actual player runs pass.
- Screenshot review found missing procedural stars, overly blue backlighting and a too-distant camera. Camera world-position damping added approximately speed/response trailing lag; moving-anchor carry and roll-offset subtraction restore the reference behavior without scaling the dragon. Independent sky/reflection assets and neutral fill fix the background/material presentation. Initial cursor states at a canvas edge no longer silently engage mouse flight.
- Final visual/performance review replaced missing font charge marks with drawn slots, improved labels, moved the repair panel off the machinery and reduced unnecessary HUD line calls. The final build contains these corrections.

## Browser and release boundaries

The reviewed player is a **Development build**. `QaFixture` can arrange quiet combat, a moving-relative target, direct initial damage/salvage supplies, incoming projectiles/missiles, asteroid placement or loss. Spending, collision, collection and repair outcomes still traverse runtime rules. Fixture presence is observed; release-player exclusion is **NOT TESTED**. Unity6.6 warns that `DEVELOPMENT_BUILD` conditionals are deprecated (`UAC0009`); address/test the production guard when creating a release build.

Play locally at `http://127.0.0.1:5207/space-dragon-dogfight/` using `npm run unity:dogfight`. Restart the preview server after rebuilding so its compressed asset cache matches the new player. The [build/control guide](../engineering/UNITY_DOGFIGHT.md) and [decision](../decisions/2026-10-31-unity-dogfight.md) support fresh chats without this transcript.

## Review, limitations and recovery

- Human visual quality, audible mix, family usability and sustained Lenovo performance: **NOT REVIEWED**. Source art has not become an approved AAA-quality asset through compilation or added plates.
- Scenery remains an inexpensive procedural asteroid field with an existing nebula/planet and original drone. Smoke, debris, repair drones, impact/crash presentation and synthetic warning/plasma tones are prototype treatments. Existing licensed Sonniss cues are used; no family voice cloning or new external generation.
- Original source/export, color identity, rig and rollback are retained. Remove/select the separate Dogfight generated scene/build to return to the existing browser/Unity labs; no campaign save migration is required.
- No commit, push, new remote CI verification, production deployment or public-release approval is claimed by this receipt. Supplied third-party drone/environment assets retain their existing local-experiment rights limitations.
- Next useful action: owner keyboard/mouse playtest of targeting, repair pressure, sound mix and comfort. Production-quality scenery/drones/VFX, sustained/fullscreen measurements, release packaging/fixture removal and campaign/launch transitions remain separate increments. The requested local encounter migration is complete.
