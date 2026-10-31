# Local development

Paul can use chat, [the inbox](../ideas/INBOX.md), or the notebook opened by `Start Space Dragon.cmd`. Agents own the commands below. See [AGENTS.md](../AGENTS.md) and [current status](project/STATUS.md) first.

## Reproduce the workspace

Node 24 LTS and Python 3.10+ are required. On this Windows machine both are already present.

```powershell
npm.cmd ci
npm.cmd run browser:install
npm.cmd run doctor
npm.cmd start
```

The server binds to this computer at `http://127.0.0.1:5173/space-dragon/`. Stop it with Ctrl+C. The launcher performs `npm ci` if its Vite dependency is missing. If port 5173 is already in use, use that running workspace or stop it before starting another. It will not silently switch ports.

The optional Windows media-tool setup is `powershell -NoProfile -ExecutionPolicy Bypass -File tools/setup-tools.ps1`. See [toolchain](TOOLCHAIN.md) for user-local installs, checksums, platform requirements, and optional art applications.

## Verify a change

```powershell
npm.cmd run check
```

This runs pure TypeScript state/save unit tests, type-checks, builds, runs development and production browser flows, and verifies all 18 family-photo references. `npm.cmd test` runs development browser checks; `npm.cmd run test:production` uses the built preview; `npm.cmd run test:unit` needs no browser. Development tests launch their own server on port 5175 and write notebook captures to ignored `artifacts/test-inbox.md`; they must never reuse the real notebook server or modify `ideas/INBOX.md`. Production tests launch a separate preview on port 4177.

Browser checks exercise actual WebGL rendering with Chromium/SwiftShader, checkpoint completion/reload/reset, malformed and unsupported saves, unavailable storage, idea persistence/error recovery, origin rejection, source-reference serving restrictions, and a narrow touch viewport. Screenshots, retained failure traces, and a development state sample are written under ignored `artifacts/`. SwiftShader timing and viewport emulation are not physical-device GPU results.

For a production artifact, run `npm.cmd run build`, then `npm.cmd run preview` and open `http://127.0.0.1:4173/space-dragon/`. The notebook button and file-writing endpoint are development-only. `dist/` is an isolated static game build; it does not contain the idea inbox, reference photos, or editable sources. Do not copy the repo root to a public web directory.

## Runtime layout

| Path | Responsibility |
| --- | --- |
| `src/main.ts` | Guided First Contact UI and development notebook |
| `src/game/scene.ts` | Small Babylon scene and rendering lifecycle |
| `src/game/checkpoint.ts` | Versioned local save validation and recovery |
| `dogfight/index.html` / `src/prototypes/dogfight/` | Isolated editable Seele Dogfight Lab, with its own Three.js lifecycle |
| `tools/dev-idea-inbox.ts` | Loopback/origin-checked development append endpoint |
| `vite.config.ts` | `/space-dragon/` base path, private-source deny rules, isolated test inbox |
| `public/` | Explicitly promoted browser assets only |
| `assets/` | Source/reference/candidate workspace; not an automatic runtime directory |

The home environment and suit silhouettes are provisional. The pod now uses an actual Blender GLB with ETC1S KTX2 texture, articulated lid, same-origin decoders and an explicit [runtime manifest](../public/assets/manifest.json). See [the pod receipt](reports/2026-10-29-pod-asset.md). Full physics, character controllers, follower AI, final audio production, backend services, and account systems are deferred until their gameplay needs are concrete.

During development, `window.__SPACE_DRAGON__.snapshot()` returns the current step, checkpoint, frame sample, mesh/triangle counts, and WebGL version. This is an observation interface, not a remote control or a performance acceptance result. It is absent from production builds.

## Seele Dogfight Lab

Open **Dogfight Lab** from the main workspace or go directly to `http://127.0.0.1:5173/space-dragon/dogfight/`. The root install/build serves both pages. This lab retains the supplied Three.js renderer; navigating between it and the Babylon Earth slice loads only one game at a time. It starts at a launch/control screen. [The import decision](decisions/2026-10-30-seele-dogfight-lab.md) explains the boundary; [the receipt](reports/2026-10-30-seele-dogfight.md) records actual verification.

| Keys | Action |
| --- | --- |
| Arrow keys | Steer the dragon: up/down pitch, left/right bank and turn |
| Mouse position | In flight mode, steer relative to the screen center/deadzone and point the reticle under the cursor. In aim mode, move the reticle without turning the dragon. |
| M / mouse-mode button | Toggle Mouse flies / Mouse aims; arrows still steer in either mode |
| Left mouse button | Hold to fire plasma |
| Right mouse button | Hold to zoom; release to restore the normal view |
| W / A / D / Z | Move the aiming target up / left / right / down independently |
| X | Recenter aim |
| Q / E | Left / right barrel roll; costs 40 evasion and shakes enemy target locks |
| B + steering direction | Hard break turn with braking; costs 25 evasion, changes heading/velocity to spoil enemy prediction |
| Space | Press once to launch charged breath at a confirmed lock; LMB retains ordinary plasma |
| Displayed letter | Press the pulsing letter to fill the next word slot; no auto-repeat, deadline or wrong-key penalty |
| F1 / Help together | Complete the charge with assistance |
| Shift | Hold to boost |
| R / F | Increase / decrease cruise speed |
| Escape | Pause / resume and show controls |

**SD-041 live-spelling update:** [the owner correction](decisions/2026-10-30-live-spelling-flight.md) supersedes the spelling pause in SD-040; see [its receipt](reports/2026-10-30-live-spelling-flight.md) for verification status. Spell **LION, PINK, COIN, KING or SONG** one shown letter at a time. SD-042 shuffles their order, so no opening word is guaranteed. Flight, steering, enemies, projectiles and normal combat damage continue while spelling, so the pilot must dodge. There is no spelling autopilot, freeze or immunity. Correct letters, word completion and F1/help preserve held pilot controls; wrong letters add no separate damage or progress reset. Once charged, place the reticle on a visible ship within 650 m for about 0.65 seconds; its ring fills and becomes LOCKED. Press Space for the targeted breath. Looking away retains a valid lock; out-of-view/range grace is about 1.2 seconds, and dwelling on a new target replaces a single lock. Timings/radius are tuning choices. The first capacity is one; later earned upgrades are not implemented.

**SD-042 visual/feel pass:** [the polish receipt](reports/2026-10-30-dogfight-polish.md) owns checks for the closer camera, irregular flap/glide rhythm, cursor-following aim in flight mode, shuffled word order and improved material/explosion rendering. A steady wing beat is visual posing, not autopilot; live dodging remains required. Mouse aiming reaches the viewport edges; W/A/D/Z can still adjust aim, and the next mouse movement places it under the pointer. Existing models remain candidates awaiting human art review.

**SD-043 evasion:** [the decision](decisions/2026-10-30-dogfight-evasion.md) and [receipt](reports/2026-10-30-dogfight-evasion.md) cover the still closer view, hostile tracking/lock/fire warnings and increased pressure. Straight, steady flight gives drones a better firing solution; vary direction and speed to spoil prediction. Q/E shakes their locks; B + steer brakes into a hard banked turn. Both use the gold 100-point EVASION pool (roll 40, break 25), which recharges after a delay. Boost keeps its own pool, and WING ENERGY remains health. Maneuvers do not delete airborne shots or grant immunity. Watch the orange warning and direction cue; the green reticle still means your own charged-breath lock. B is reserved from spelling. Actual verification status is recorded in the receipt; human difficulty/feel remains separate.

Mouse flight/aim and buttons apply to the flight canvas, not menu controls. W/A/D/Z aim independently in either mode. Matching the displayed letters is `letter_matching`, not independent word decoding or mastery; no learner records are written. Pause, focus loss and returning to the main game release held keyboard/mouse controls and zoom. Sound can be toggled; reduced-motion presentation is available. Retry/reload starts a new lab encounter. The lab awards no campaign rewards and does not write First Contact, exploration or learning progress. Its development observation API is read-only and excluded from production.

For future raw exports, use `seeles-assets/incoming/<prototype-name>/` (the existing folder is spelled **seeles-assets**). Keep companion files together. The owner's current `assets/reference/seele/dragon_dogfight/` delivery is an accepted ignored local intake path and remains unchanged. Editable migrated code belongs under `src/`, with only reviewed runtime payloads in `public/assets/`; never serve a raw reference folder. See [Seele intake](../seeles-assets/README.md).

## Third-person exploration

**Walk around** starts a separate practice mode; First Contact remains selectable. WASD/arrows move, Space/Enter interacts nearby, left-drag or Q/E orbits, R recenters and Escape pauses. A provisional articulated person walks through the open doorway into a fenced yard. Walls, desk, sofa, pod and boundaries block walking; the low cutaway walls let the camera see the person. The garage is a backdrop, not an accessible interior.

`src/game/navigation.ts` owns position, collision/sliding, proximity and once-only practice collection; `src/game/exploration-save.ts` validates and recovers its independent save. The scene presents state and emits updates; the UI persists movement boundaries and periodic progress. The exploration key is `space-dragon.exploration.v1`, with a `.backup` predecessor. The prototype pickup is not a story reward. First Contact saves remain untouched by exploration/reset.

`tests/navigation.test.ts` adds pure navigation/persistence cases, `tests/navigation.spec.ts` drives real movement and interactions, and `tests/navigation.production.spec.ts` checks the built mode without developer APIs. Both Playwright configs include the new tests, so the existing GitHub game job exercises them. The debug snapshot's `navigation` field exposes state, nearby target, camera/focus positions and movement; it offers no teleport setter. See [the navigation decision](decisions/2026-10-29-third-person-navigation.md) and [future video guide](REFERENCE_HOME_VIDEO.md).

Save schema v2 lives in `space-dragon.checkpoint.v2`, with its last valid predecessor at `space-dragon.checkpoint.v2.backup`. It holds script phase, ordered suit IDs, validated flags, hint/scan-assistance state and the checkpoint ID. [state.ts](../src/game/state.ts) is authoritative and has no DOM/renderer/storage dependency; [checkpoint.ts](../src/game/checkpoint.ts) owns validation/migration/recovery. V1 saves at `space-dragon.checkpoint.v1` are upgraded conservatively and retained. Future-version saves are preserved until deliberate reset; unavailable/quota-limited storage falls back to the current visit with an honest notice. Notebook drafts use a separate key and remain in the form when a write fails. There is no cloud synchronization or learning assessment.

Restarting a progressed sequence requires confirmation; cancel preserves the current checkpoint. Keyboard is the confirmed first input. The automated narrow touch check is extra layout/input evidence, not a change to the owner's deferred-touch decision or a physical-device support claim.

Choose Start with sound for the browser's placeholder computer narrator, or Play quietly. Arrows point; Space/Enter acts; H replays speech; F1/? advances the hint ladder; Escape pauses. Blur/tab loss also pauses. Less motion follows the system preference and can be toggled. The final hint points out the target and makes one Action complete together. Narration is captioned, no family voice is cloned, and no microphone is used. Check actual audibility on the named Lenovo/Chrome target with [the family playtest sheet](PLAYTEST_FIRST_CONTACT.md).

## Integration still to resolve

Keep the `/space-dragon` URL prefix. This is a standalone local client, not a replacement homepage. The public host currently returns unexpected content and the game route was 404 during inspection; the website's actual source, routing, deployment, and Railway services remain unidentified. Audit them before integrating. Keep frontend engine decisions separate from the host UI framework; Babylon does not require replacing an existing site framework.


**SD-044 cockpit presentation:** [the scope](decisions/2026-10-30-dogfight-cockpit.md) and [receipt](reports/2026-10-30-dogfight-cockpit.md) cover the compact cockpit instruments and read-only radar. The radar is head-up relative to the dragon (forward at top, aft at bottom), with contact numbers, +/- flight-plane elevation cues, and rim arrows for contacts beyond the 800 m scope. Exact range/elevation is available in each contact's accessible description. Disabled bogeys disappear; your breath lock and hostile targeting/firing have separate states. The third-person camera and key bindings are retained. Sound remains opt-in via Sound on: local layered plasma/fire-breath/impact/explosion and maneuver effects sit over speed/boost/turn-responsive flight sound. Mute, pause, retry and leaving the lab clean up audio; intensity still requires a human listening/comfort review.


**SD-045 acceleration feel:** [the owner clarification](decisions/2026-10-30-acceleration-camera-sound.md) replaces speed-star trails with camera perspective and acceleration-responsive engine/airflow sound. R/F changes actual cruise speed; Shift supplies the existing finite boost. The lens widens smoothly with actual speed (61 degrees at cruise, 66 at normal top speed, up to 74 in boost). The close camera follows a stable travel-axis anchor, so speed does not add unintended trailing distance and barrel-roll corkscrews do not shake the view. Held RMB still takes priority at 40 degrees. Reduced motion fixes the lens at 61/40; ordinary environmental stars remain. [The combined receipt](reports/2026-10-30-dogfight-cockpit.md) records final technical evidence, separate from human sound/comfort review.


## Town Drive Lab — SD-046

Run `npm.cmd start`, then open `/space-dragon/drive/` (or use the Town Drive Lab link). The home entry and First Contact remain available. Keyboard: W/arrows throttle, S/down brake/reverse, A/D or left/right steer, Space handbrake, C camera, R checkpoint reset, M map, Esc pause, F2 handling. Standard mapped controller: R2 throttle, L2 brake/reverse, left stick steer, Cross handbrake, Triangle reset, R1 camera, Options pause. Physical-pad support remains NOT TESTED.

Chase, dashboard and orbit modes are available. Choose Assist, optional turn chimes and less camera motion before starting; F2 pauses to adjust session handling and Assist. Saves use only `space-dragon.drive.v1` and its backup. Completing the loop sets one completion flag; no campaign or learner rewards are granted.

Development, CI and production use the approved estimated `src/game/drive/reference-house.json`. [SD-052](decisions/2026-10-30-town-drive-detail-override.md) removes the Town Drive privacy/publication rule and additional real-layout approval gate. Runtime materials/models are versioned under `public/assets/drive/` and listed in the asset manifest. Large source videos and intermediate comparisons remain in local storage for workflow reasons.

With a dev server on5182 and the local reference anchors present, run `node tools/town-drive-compare.mjs --url http://127.0.0.1:5182/space-dragon/drive/ --every 250`. It creates a new local-only HTML comparison folder; no frames load in the game. `tools/town-drive-reference.py` and `tools/town-drive-spike.py` reject existing output folders and destinations outside `assets/reference/local/`; the latter requires the isolated PyCOLMAP environment documented in the local spike receipt.

Town Drive now includes 64 ambient vehicles with sedan/SUV/van variants, 12 parked vehicles, traffic lights and roadside furniture under SD-055. NPC traffic uses the player simulation clock and freezes while paused. It is encounter scenery, not saved campaign progress. The Start button waits for the scene shaders/textures to be ready.

SD-057 adds real route labels (Hypoluxo, Jog, Lantana and Hagen Ranch), sidewalk walkers, developed side views and a white Odyssey-inspired minivan. Select **First person** before starting or press **V** / the **Cabin** button to toggle driver-seat and chase views. **C** / controller R1 still cycles all three cameras. Hold **Q/E** or drag the scene to look left/right; releasing returns forward. Look input never steers the car. The cabin view uses its modeled instruments and keeps the larger HUD speed panel out of their way. Source geometry, asset provenance and measured limitations are recorded in the [receipt](reports/2026-10-30-town-drive-lived-in-streets.md).

SD-058 replaces the outbound connector with the mapped Starpass Court → Green Island Boulevard → Green Island Terrace → right onto Hypoluxo approach. The cul-de-sac remains a dead end; the invented return rejoins its existing mouth. Arterial distances and neighboring parcels remain representative. Road attribution is visible in the lab. If an older checkpoint is restored, select **Start a fresh loop from Starpass Court** before starting to review the home exit. The house displays an estimated exterior by default; development inspection can explicitly call `__TOWN_DRIVE__.setHomeCutaway(true)` to view the preserved reference interior.

## Dragon asset pipeline — SD-060, retaining the earlier art candidates

The local Dogfight Lab now loads `assets/dogfight/models/dragon-flight-v003.glb`. [The pipeline contract](engineering/DRAGON_ASSET_CONTRACT.md) documents the stable gameplay root, metre scale, forward/contact conventions, independent collision, eight named sockets and blended Blender Flight/Glide/Boost loops. [The current receipt](reports/2026-10-30-dragon-asset-pipeline.md) owns renderer audits, actual checks, matching screenshots and performance/resource estimates. This export preserves SD-059's gunmetal/crimson geometry, nine-bone skin, all historical component pivots and baked maps; it adds authored motion and attachments. Cinematic v002, blue/red sources and the original organic GLB remain for rollback. Human art approval and whole-body remodeling remain separate.

[SD-051](decisions/2026-10-30-dogfight-enemy-standoff.md) additionally requests steadier enemy targets with gentle player-relative standoff instead of pursuit/flybys. Incoming fire, motion-dependent tracking, damage, word charge, evasion energy and save boundaries remain. Exact movement tuning and actual integration results belong to the receipt; these notes do not claim final visual, difficulty, audio or device-performance approval.


The model selection boundary is `src/prototypes/dogfight/assets/dragon-model.js`: `ACTIVE_DRAGON = FLIGHT_DRAGON` selects flight v003. `CINEMATIC_DRAGON`, `MECHANICAL_DRAGON` and `LEGACY_DRAGON` retain the previous cinematic, red and organic models. Older models receive explicit attachment/procedural-animation fallbacks. A local rollback changes that one selection and reruns relevant checks; it is not a new game mode or save migration.

While the development server is running, open `http://127.0.0.1:5173/space-dragon/tools/dragon-inspector/index.html?asset=dragon-flight-v003.glb`. Orbit/zoom the neutral studio, switch to the actual flight environment, preview animation and show attachment/contact markers. This local tool is excluded from the production build. Capture matched Blender/browser views with:

```powershell
node tools/capture-dragon-pipeline.mjs dragon-flight-v003.glb assets/game/local/spacecraft/space-dragon-spacecraft/flight-v003/references.json artifacts/dragon-pipeline-review
node tools/benchmark-dogfight.mjs artifacts/dragon-pipeline-performance
```

The runtime audit reports complete-frame counters, actual canvas size, color/shadow/AA settings and estimated texture/render-target storage; it does not expose measured driver VRAM or GPU timing. For installed-Chrome checks, set `SPACE_DRAGON_NATIVE_CHROME=1` locally with an isolated `SPACE_DRAGON_TEST_PORT`/`SPACE_DRAGON_PREVIEW_PORT`. CI retains its default Chromium/SwiftShader configuration; never reuse the real notebook server.


## Current Dogfight expansion — SD-053/054

The owner's later cinematic direction adds detailed solid asteroids/collisions and graphic mechanical crash/loss recovery, plus a charged Space-bar windup/roar/fire beam. [Crash/environment scope](decisions/2026-10-30-asteroids-mechanical-crash.md), [attack scope](decisions/2026-10-30-charged-breath-windup-roar.md) and [verification](reports/2026-10-30-asteroids-crash-breath.md) own this increment. The frozen local candidate passes 178 units/build, fourteen installed-Chrome development and seven production cases across the documented initial/retry runs. The standard check wrapper stops at occupied 5175 after unit/build success; native fixture 5185 and production 4177 supply the scoped browser evidence. Keep active flight/dodging during the 0.65 s windup + 1.1 s beam, opt-in sound, normal pause/retry, reduced motion and all campaign/learning/save boundaries. Mechanical crash FX last 3 s (0.8 s reduced motion), then recovery/retry; effects concern machine damage, not family injury/death lore. Human quality/comfort and sustained performance remain open.
