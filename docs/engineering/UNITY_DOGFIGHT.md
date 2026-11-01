# Unity Dogfight encounter

**Current organic Unity integration — SD-080:** the selected violet-v007 asset is technically verified in the final GPUBatched-configured Development build with 11 Chrome cases per WebGPU/WebGL2. [Current source/player receipt](../reports/2026-10-31-purple-organic-dragon.md), [independent 15-bone asset contract](DRAGON_ASSET_CONTRACT.md#organic-v007-measured-source-and-unity-contract), [current intake/selection commands](UNITY_DOGFIGHT_HANDOFF.md#current-organic-v007-handoff). Isolated 1366×768 samples are 58.1 fps WebGPU / 24.3 fps WebGL2; fallback below 30 fps is a known limit. Owner appearance approval remains open. Preserve v005 as rollback; the mechanical-specific instructions below are historical and do not override the current organic contract.

SD-075 implements the playable encounter in the existing Unity project. SD-078 now selects the additive heroic v005 dragon and near-orbit presentation; [its receipt/gallery](../reports/2026-10-31-near-orbit-heroic-dragon.md) records the final tested artifact and limits. The browser Three.js lab remains a rollback reference. This scene does not read or write campaign checkpoints, inventory, learner records or PlayerPrefs.

## Build and play locally

From the repository root, with licensed Unity 6000.6.7f1 and Web Build Support installed:

```powershell
npm run unity:dogfight:prepare
node tools/unity/prepare-heroic-dragon.mjs
node tools/unity/prepare-dogfight-audio-v002.mjs
npm run unity:dogfight:setup
npm run unity:dogfight:test
npm run unity:dogfight:build
npm run unity:dogfight
```

Open `http://127.0.0.1:5207/space-dragon-dogfight/`. Restart the preview server after a new build to refresh its compressed asset cache. Run `npm run unity:dogfight:verify` against that server for reproducible Chrome checks. The runner refuses a second Editor using the project; finish another channel's current build first. All output stays local. The build receipt and player checks, rather than scene existence, determine verification.

The heroic preparation step reads the ignored local v005 export on its first intake. A checkout with the prepared runtime files can instead run `node tools/unity/prepare-heroic-dragon.mjs --verify`; no ignored Blender source is required for that verification. The runner verifies both original and additive heroic receipts before Editor work.

The generated scene is `Assets/SpaceDragon/Dogfight/Generated/Dogfight.unity`. Inspector tuning lives at `Generated/DogfightTuning.asset` and on the DogfightEncounter component. Setup preserves an existing tuning asset. The build temporarily selects its pipeline/settings, then restores the shared project settings. Generated scene edits should be expressed in its dedicated builder for reproducibility.

## Controls

| Action | Input |
|---|---|
| Steer | Arrows or mouse |
| Independent target | W/A/D/Z; mouse in either mode follows pointer |
| Mouse flight / aim-only | M |
| Recenter target | X |
| Throttle up/down | R / F |
| Boost | Shift, finite energy |
| Barrel roll / evasive turn | Q/E / hold B while steering; finite evasion energy |
| Twin wing lasers / camera zoom | Left / right mouse; lasers hit immediately |
| Guided missile | Enter or middle mouse, after a clear sustained lock |
| Word-charged breath | Space after spelling and breath target lock |
| Assisted word charge | F1, no independent mastery recorded |
| Field repair | Hold Tab, choose 1 hull / 2 propulsion / 3 weapons or click |
| Pause / options | Escape |

The four-letter bank avoids flight/action letter bindings. Spelling never stops flight, enemies or incoming fire. Sound is opt-in through the pause menu. Reduced motion holds the flight FOV steady and retains explicit right-mouse zoom. Pausing or losing focus suspends encounter time; held fire/boost require release before rearming.

## State and collision

`FlightState`, `BreathState`, `EnemyPilot`, `TacticalState`, `SalvageField` and `HomingMissile` own authoritative encounter behavior. `DogfightEncounter` adapts actual input, collision facts, target visibility and scene transforms. HUD, animation, effects and audio observe state.

The stable gameplay root uses metres, +Z forward and +Y up. A single Y180 source-basis adapter beneath VisualMotion converts the GLB's -Z forward. Imported rest transforms, nine bones and named sockets are preserved. Source contact height is -0.66502684m; no ground controller uses it in space. Player collision is a 3.3m gameplay sphere; asteroids use layer-8 sphere colliders, independently of their fractured render meshes. Swept projectile tests resolve the nearest scenery/target intersection. Animated armor and wings do not alter gameplay collision.

Real exported Flight/Glide/Boost clips are sampled into cached poses with blended transitions. Root motion is disabled. Visual bank/roll and authored wing/tail poses stay separate from root steering. Jaw and mouth effects use the preserved articulated jaw and `socket_muzzle`. Target, camera, wing and thruster sockets remain available.

## Tactical rules

- Hull reaching zero disables the dragon. Propulsion damage reduces boost bonus while preserving ordinary speed/steering. Weapons damage slows lock acquisition and missile recharge.
- A repair restores 35 points to one damaged system over four seconds. Start with one salvage; carry at most three; complete at most three repairs per encounter. Cost is committed only on success. A substantial hit interrupts without spending. Repairing permits maneuvering and ordinary fire/breath, but disables boost and missile launch.
- Each disabled bogey drops one recoverable item. Up to six remain, oldest evicted first. Wreck velocity decays toward a gentle drift; pickup radius is 18m. Full inventory leaves the item. Pickup never restores repair activations.
- Two guided-missile charges refill sequentially, 15 seconds each with intact weapons. A lock requires 1.5 seconds of sustained in-range, in-cone, unobstructed tracking; small visibility loss gets a 0.2-second grace. The launch still requires current clear visibility. Limited turn rate and actual collision let missiles miss or hit scenery. Rolls break hostile seekers into ballistic flight; they do not delete projectiles or grant immunity.
- Warning priority is imminent hull failure, incoming guided missile, critical system, caution. Alarm cadence is centralized; damage does not stack continuous alarm loops.
- Restart clears damage, patches, salvage, repair uses, charges/timers, locks, projectiles, word state, enemies and fixture changes. Encounter victory leaves flight active for salvage collection.

## Assets, presentation and evidence

The preparation script copies ten unique selected existing assets plus an identical visible-sky copy, checks pinned hashes and refuses to overwrite a different candidate. It derives material contracts from GLB JSON, including emissive-strength factors. Original sources and prior runtime exports are unchanged. That initial SD-075 candidate added four runtime accent meshes (416 triangles). SD-078 disables that overlay for the authored heroic export, avoiding duplicate armor. Maintenance drones, damaged scales, smoke and sparks remain procedural prototype effects.

The build retains glTF shader variants and corrects unsupported emission-strength multiplication without flattening material identity. The final actual-player checks verify gunmetal/crimson appearance, imported emission settings, animation and camera framing; the [receipt](../reports/2026-10-31-unity-dogfight.md) records the measurements and visual limits. Scene configuration and measured settings are in the generated setup receipt.

The current development player exposes `QaFixture` for repeatable conditions; release exclusion requires separate validation (Unity6.6 deprecates the current build conditional). Browser acceptance must identify these fixtures separately from natural flight. `RequestSnapshot` is read-only and reports state, rendering counters, actual dimensions, graphics device, frame intervals and Unity's allocated texture-memory estimate. The texture estimate includes Unity allocation and is not a precise VRAM reading. Browser frame intervals are not GPU timings. Human sound/comfort/art acceptance and sustained hardware performance remain distinct gates.


## Environment art continuation

SD-077 records owner approval of current gameplay feel and the first scenery pass. `Editor/Dogfight/DogfightEnvironmentArt.cs` generates local PBR rock maps, gas-giant texture and decorative rings during Setup; Generated/EnvironmentArt holds derivatives. It changes no colliders or combat rules. [Receipt and review gallery](../reports/2026-10-31-dogfight-environment-art.md) identify the tested player, asset hashes, remaining aliasing/geometry limits and performance.

## Active dragon: heroic v005 (SD-078)

The historical SD-078 build selected `Imported/dragon-heroic-v005.glb` (now explicit rollback; SD-080 selects organic v007): **13,072,136 bytes / 90,630 triangles / 45 meshes / ten materials / five 1K maps**, SHA-256 `94f17d2c3f0026364aeffd7d5ceb0876f9f8e9c65ed66067c82f27260116fa60`. `asset-receipt-v003.json` and `heroic-contract-v005.json` add this candidate while preserving earlier receipts, material contracts and v003 rollback. Original nine rest bones/inverse binds, 901 pivots, eight sockets and three authored clips are preserved. Source is the separate `Space Dragon Spacecraft-v005-heroic.blend` with original comparison and editable/game collections; do not regenerate over owner edits.

The scoped importer explicitly selects the pinned glTFast URP generator before importing Dogfight GLBs and restores shared pipeline state afterwards. Final WebGPU/WebGL2 appearance checks pass with gunmetal/crimson membranes and no missing/pink materials. The [receipt](../reports/2026-10-31-near-orbit-heroic-dragon.md) retains the first import failure, fix, build identity, 69 tests, both 11-case player runs and performance limits. Near-orbit atmosphere follows camera translation, keeping an 800 m apparent deck altitude; it is not traversable terrain/atmospheric physics. Old rings are hidden and narrow sky seam artifacts remain documented.

## Current camera and audio follow-on (SD-079/081)

At the SD-079/081 checkpoint, the tested player used mechanical v005 and organic v006 was a source-only study. SD-080 now separately verifies the current organic v007 player; the following measurements/settings retain that earlier checkpoint. Cruise chase distance is 9.8 m, height 3.55 m and look height 1.2 m; visual wing stroke/glide cadence and rim lighting are revised without scaling gameplay/collision. [Screen-presence receipt](../reports/2026-10-31-dragon-screen-presence.md).

Five layered licensed Sonniss v002 cues are selected through additive `audio-receipt-v002.json`; `node tools/unity/prepare-dogfight-audio-v002.mjs --verify` checks already prepared imports without rewriting prior cue/model receipts. Dedicated roar/beam voices, warning ducking and bounded headroom complement the new derivatives. Final build, 69 tests and 11 Chrome cases per backend pass, including v002 binding assertions and sound-enabled breath. [Audio receipt/audition](../reports/2026-10-31-dogfight-heavier-audio.md). Human mix/comfort, sustained performance and organic game integration remain unverified.
