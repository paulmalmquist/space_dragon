# Unity Dogfight encounter

**Current implementation — SD-090:** the existing Oscar dragon-shaped spacecraft now has eight switchable combat upgrades plus independent banking. The preceding `oscar-spacecraft-v002` is the frozen, verified rollback. The new combined build is **IMPLEMENTED; verification is in progress** in [the SD-090 receipt](../reports/2026-11-01-dogfight-combat-upgrades.md). All stage art/roles/ally effects are lab placeholders. [Decision](../decisions/2026-11-01-dogfight-combat-upgrades.md).

This Unity encounter does not read or write campaign checkpoints, inventory, learner records or PlayerPrefs. The Three.js lab, original sources, rig, asset credit and asteroid collision geometry remain unchanged. The [handoff](UNITY_DOGFIGHT_HANDOFF.md) contains the selected Oscar/BC7 and mechanical-addon intake steps; older organic/heroic notes below are historical evidence.

## Build and play locally

From the repository root, with licensed Unity 6000.6.7f1 and Web Build Support installed:

```powershell
$env:SPACE_DRAGON_DOGFIGHT_ASSET = 'oscar-v001'
$env:SPACE_DRAGON_DOGFIGHT_TEXTURES = 'bc7'
npm run unity:dogfight:prepare
node tools/unity/prepare-heroic-dragon.mjs
node tools/unity/prepare-dogfight-audio-v002.mjs
node tools/unity/prepare-oscar-dragon.mjs --verify
node tools/unity/prepare-oscar-mechanical.mjs --verify
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
| Barrel roll / evasive turn | Q/E / hold B while steering; finite evasion energy. A roll within 0.4 s of a predicted hit refunds its cost. |
| Independent bank | Hold right mouse + Q/E; nose and flight path are unchanged by banking |
| Twin wing lasers / camera zoom | Left / right mouse; lasers hit immediately |
| Wingman strafe | T; locked target or nearest living enemy; 20-second cooldown |
| Guided missile | Enter or middle mouse, after a clear sustained lock |
| Word-charged breath | Space after spelling and breath target lock |
| Assisted word charge / comeback | F1, marked assisted; no independent mastery recorded |
| Field repair | Hold Tab, choose 1 hull / 2 propulsion / 3 weapons or click; optional digits speed up remaining work |
| Pause / options | Escape |

The four-letter bank avoids flight/action letter bindings. Spelling never stops flight, enemies or incoming fire. Sound is opt-in through the pause menu. Reduced motion holds the flight FOV steady and retains explicit right-mouse zoom. Pausing or losing focus suspends encounter time; held fire/boost require release before rearming.

### PlayStation controller (SD-089)

The standard Unity Gamepad layout accepts DualShock/DualSense button positions. Physical USB/Bluetooth compatibility, comfort and button reporting remain **NOT TESTED** until the owner's controller playtest. No rumble or adaptive-trigger support is claimed. Keyboard and mouse remain available.

| Action | PlayStation input |
| --- | --- |
| Fly / independent aim / recenter aim | Left stick / right stick / R3 |
| Twin lasers / zoom | R2 / L2 |
| Roll left/right / independent bank | L1/R1 / hold L2 + L1/R1 |
| Boost / sharper evasive turn | Cross / hold Circle while steering |
| Guided missile / charged breath | Square / Triangle |
| Assisted word or SONG / wingman | D-pad Up / Down |
| Throttle down/up | D-pad Left / Right |
| Field repair | Hold Share/Create, then D-pad Left: hull; Up: propulsion; Right: weapons |
| Pause / menu | Options; D-pad Up/Down selects, Cross activates, Circle resumes |
| Restart after defeat | Cross or Options |

Use the controller's Share/Create button (the standard `selectButton`), rather than its touchpad. Ordinary repair completes without the optional keyboard number code. D-pad assistance is marked assisted and does not record mastery. Controller connection/disconnection pauses flight; neutralize controls, then explicitly resume. Release gates also apply after pause, comeback and restart. HUD labels follow the active input. The page pauses on canvas blur, window blur, hidden visibility and page exit; returning focus does not silently resume.

## State and collision

`FlightState`, `BreathState`, `EnemyPilot`, `TacticalState`, `SalvageField` and `HomingMissile` own authoritative encounter behavior. `DogfightEncounter` adapts actual input, collision facts, target visibility and scene transforms. HUD, animation, effects and audio observe state.

The stable gameplay root uses metres, +Z forward and +Y up. The selected asset's measured source-basis adapter sits beneath VisualMotion. Current Oscar uses its normalized +Z profile; historical mechanical candidates use a Y180 correction. Imported rest transforms, full skin weights and named sockets are preserved. The selected contract records contact height; no ground controller uses it in space. Player collision is a 3.3m gameplay sphere; asteroids use layer-8 sphere colliders, independently of their fractured render meshes. Swept projectile tests resolve the nearest scenery/target intersection. Animated armor and wings do not alter gameplay collision.

Real exported Flight/Glide/Boost clips are sampled into cached poses with blended transitions. Root motion is disabled. Visual bank/roll and authored wing/tail poses stay separate from root steering. Jaw and mouth effects use the preserved articulated jaw and `socket_muzzle`. Target, camera, wing and thruster sockets remain available.

## Tactical rules

- With Comeback enabled, the first zero-hull event gives a five-second SONG recovery prompt. Completion or F1 restores 30 hull, grants two seconds of protection and breaks enemy locks. Timeout or a second hull failure disables the dragon. With the flag off, zero hull immediately disables it. Propulsion damage reduces boost bonus while preserving ordinary speed/steering. Weapons damage slows lock acquisition and missile recharge.
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


## SD-090 local combat stages

The lab now introduces four placeholder roles across four waves: Fighters → Grappler → Racers → Gunship. Fighter behavior is preserved. The Racer has lower health and reduced ordinary-weapon assistance; one guided missile destroys it. A Grappler approaches and latches, reducing speed by 30% and disabling boost until an accepted roll shakes it off for two seconds. The Gunship blocks frontal lasers/missiles until one charged breath removes its shield; then ordinary weapons work. F1-assisted charging remains a complete path through every wave. Final victory leaves flight and salvage active. These are lab rules, not changed story canon. Technical verification is recorded separately in the SD-090 receipt.

## Upgrade switches and current rules

`Generated/DogfightTuning.asset` keeps owner tuning across setup. New fields are initialized once and serialized to `Builds/dogfight-combat-tuning.json` for inspection. All eight stage flags start on; independent banking has its own default-on comparison switch. The all-off QA mode disables all nine without changing the saved asset.

| Switch | Behavior |
| --- | --- |
| `EnablePerfectRoll` | A fresh roll within 0.4 s of swept contact refunds its cost; only the qualifying shots miss. |
| `EnableEnemyRoles` | Four waves introduce Fighter, Grappler, Racer, then shielded Gunship. |
| `EnableClawFinisher` | Boost through a wounded, unshielded drone within 30 m / 40° for full boost and 15 evasion. |
| `EnableWingman` | T sends the lab ally for four seconds; 20-second cooldown, occasional tail warning. |
| `EnableRockWeapons` | Nearby hostile-missile/scenery impacts grant 15 evasion; four marked gas pockets blast once. |
| `EnableMultiTargetBreath` | Sweep and dwell on up to three targets; one Space attack delivers one impact per target. |
| `EnableRepairCode` | Optional three-digit Numbers/Sums code halves remaining repair time; Off is available in pause. |
| `EnableComeback` | One five-second SONG or assisted recovery per encounter. |
| `EnableIndependentBank` | Hold RMB + Q/E for independent ship tilt; Q/E alone still roll. |

New ordinary-weapon references to “plasma” mean the existing instantaneous twin wing lasers. No attack travel delay is restored. A shielded Gunship's first breath removes its shield; subsequent attacks damage its hull. All waves can be completed through repeated F1-assisted breath, and new waves retain damage, resources and salvage. A wounded drone displays a shape cue; the finisher's visual lunge never takes control of flight. Gas rocks remain solid after venting. Wingman damage cannot finish a shielded Gunship.

Optional repair codes run while maneuvering and taking damage; a wrong or ignored digit has no penalty or deadline, and the original repair still finishes. The selecting Tab+1/2/3 digit cannot answer the new code on that frame. Numbers is the initial preference, Sums uses answers within five, and Off removes the bonus prompt. Substantial hits still interrupt work without spending resources.

Normal rolls retain finite energy and leave nonqualifying projectiles dangerous. The local slow-motion/freeze feedback never changes global Unity time. Reduced motion removes these effects while preserving rule outcomes at equal simulation time. Pause/focus suspends state and clears transient slowdown; Restart resets all encounter rewards, event guards and one-use recovery.

Verification: `node tools/unity/verify-combat-upgrades.mjs` exercises the new systems. `SPACE_DRAGON_DOGFIGHT_BASELINE=1` with the original verifier separately checks all-off parity. Run both on actual Chrome WebGPU and WebGL2; report human fun, difficulty, comfort, sound and sustained performance separately.
