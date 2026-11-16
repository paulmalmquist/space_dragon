# Luke's Playground and Luke's Arena — Unity runbook (SD-088, SD-089)

Status: **IMPLEMENTED; Unity import, play and builds NOT TESTED**, for both scenes. Written in cloud sessions with no Unity Editor. Read the [playground decision](../decisions/2026-11-15-unity-native-lukes-playground.md) and the [arena decision](../decisions/2026-11-16-lukes-arena-abilities-and-stealth.md) first. The arena has [its own section](#lukes-arena-sd-089) below; generate the playground first, because the arena reuses its pipeline and hero. Coordinate exclusive Editor ownership as for every other channel in `unity/SpaceDragon`.

## Run it (Windows, pinned Unity 6000.6.7f1)

From the repository root, with no other Editor open on this project:

```powershell
git lfs pull                      # the shared pod and sky assets; the hero itself is not in LFS
npm run unity:playground:verify   # hero files, generated C# and .meta files match their sources
npm run unity:playground:setup    # generates the scene; writes unity/SpaceDragon/Builds/playground-setup-receipt.json
npm run unity:playground:test     # 30 engine-free tests inside Unity EditMode (playground, hero and arena rules)
npm run unity:playground:windows  # native player in unity/SpaceDragon/Builds/Playground/Windows
npm run unity:playground:play     # starts that player
```

With the Editor already open instead: **Space Dragon > Luke's Playground > Generate scene**, then press Play. `npm run unity:playground:web` builds an optional Web player.

The base render pipeline asset `Assets/SpaceDragon/Generated/FirstContactURP.asset` must exist (it is committed). Nothing outside `Assets/SpaceDragon/Playground/Generated` is written.

## Controls

| Action | Keyboard / mouse | Controller |
| --- | --- | --- |
| Move | WASD or arrows | Left stick |
| Jump; press again in the air for a thruster hop | Space | A / Cross |
| Sprint on the ground; tether while airborne | Shift | Either trigger |
| Look | Click to capture the mouse, or hold right button; Q / E | Right stick |
| Recenter the camera | R | Right stick press |
| Pause, controls, reset practice | Escape or P | Start |

There is no fail state. Falling in the lake triggers a safety catch back to solid ground.

## What to check first, and what to do if it fails

1. **Console after setup.** Expect `SPACE_DRAGON_PLAYGROUND_SETUP_OK`. Open the receipt: `heroBones` should be 52, `clipFrames` four non-zero numbers, `heroHeight` about 1.43, `heroLeftIsOnTheLeft` true, and `notes` empty.
2. **The stand-in.** In the Scene view he should stand in the living room, upright, facing +z, textured. If he is untextured or pink, the hero materials did not bind: check that the eight PNG files beside `playground-kid.gltf` imported.
3. **Animation.** In Play mode he should idle, then run when moved. If he slides in a rigid pose, `PersonAvatar` logged which bone or loop it could not bind.
4. **Notes in the receipt** name anything the generator tolerated, such as a missing glTFast setting or a rig that imported mirrored.

Likely first-run problems, most probable first:

- A glTFast import detail differs from what the generator expects (animation clip names, where clip paths are rooted, blend-shape names). `BakeClips` throws with the names it found.
- A URP volume or material property was renamed in this Editor version. The generator uses only calls already proven by `FirstContactProject` and `TownDrivePipeline`, plus `Vignette` and `ColorAdjustments.saturation`.
- Lighting balance. It was designed, not seen: expect to tune `BuildLighting`, lamp intensities and `postExposure`.

Record what actually happened with the [verification template](../templates/VERIFICATION_RECEIPT.md). Do not mark the scene verified from this document.

## How it is put together

| Piece | Where | Notes |
| --- | --- | --- |
| Level, scenery, motion data | `Traversal/Core/LukePlaygroundData.cs`, `HomeBlockScenery.cs`, `PersonMotionData.cs` | Generated: `npm run unity:playground:export`. Edit the TypeScript, never these files. |
| Rules | `Traversal/Core/PlaygroundSession.cs`, `HeroSimulation.cs`, `PersonMotion.cs` | Engine-free; `npm run unity:playground:coretest` runs them with dotnet. |
| Hero | `Playground/Imported/Characters/` | Generic MIT Rocketbox child; `PROVENANCE.json`; rebuild with `npm run unity:playground:hero` from the ignored local intake. Not a family likeness. |
| Runtime | `Playground/Runtime/` | `PlaygroundGame` (input, camera, HUD, saves, cues), `PersonAvatar` (baked loops plus procedural poses), `PersonFollower`. |
| Generator | `Playground/Editor/` | `LukePlaygroundProject.Setup`, `BuildWindows`, `BuildWeb`. All drawing is derived from the level data; nothing has a collider. |
| Compile check | `tools/unity/playground-compile` | `npm run unity:playground:compile`. Public 2021 reference assemblies and stubs: language errors only. |

Saves use PlayerPrefs key `space-dragon.playground.v1` with a backup key. Sparks are saved the moment they are found; a newer build's save is never overwritten.

## The same stand-in in First Contact's living room

Open the First Contact scene, select `Player.proxy-no-family-likeness`, and run **Space Dragon > Luke's Playground > Dress the selected player as the stand-in**. It adds the stand-in as a follower and hides the capsule's renderer; that scene's generator and state are untouched. Review, then save or discard. Folding this into `FirstContactProject` is a follow-up for whoever owns that generator, after the stand-in has been seen.

## Luke's Arena (SD-089)

A second generated scene in the same project: an ability course, a three-wave battle ring and a stealth yard. It shares the playground's render pipeline, hero stand-in and helpers, and writes only `Playground/Generated/LukeArena.unity`, `ArenaSpark.asset` and `Arena-*` materials.

```powershell
npm run unity:playground:verify   # also checks the generated arena C#
npm run unity:arena:setup         # generates the scene; writes unity/SpaceDragon/Builds/arena-setup-receipt.json
npm run unity:playground:test     # the same EditMode run covers the arena rules
npm run unity:arena:windows       # native player in unity/SpaceDragon/Builds/Arena/Windows
npm run unity:arena:play
```

With the Editor open: **Space Dragon > Luke's Arena > Generate scene**, then Play. `npm run unity:arena:web` builds an optional Web player.

| Action | Keyboard / mouse | Controller |
| --- | --- | --- |
| Move, jump, sprint / tether, look, recenter, pause | as in the playground | as in the playground; bumpers also sprint |
| Climb | walk into a wall with lit hand-holds; push toward it to go up, away to come down; Space jumps off | the same with the stick and A / Cross |
| The one-button action: quiet pounce, pounce or snare, whichever counts | F, J or Enter | X / Square or B / Circle |
| Always pounce | G or K | Y / Triangle |

Step over a glowing line to start a trial and back out to stop. There is no fail state: robots power down, Luke is bonked for a moment or set back in hiding, and stars only ever go up.

What to check first:

1. **Console after setup.** Expect `SPACE_DRAGON_ARENA_SETUP_OK`. The receipt should list 12 solids, 6 climbs, 3 anchors, 13 robots and 6 pickups.
2. **The yard at rest.** Three robots patrol the stealth yard (east). Each ground robot should show a **see-through** fan on the floor for what it can see, cut off behind crates. If the fans are solid or missing, the `Sheer` materials in `LukeArenaScene.cs` did not become transparent in this URP version: that helper sets the surface type by hand and is the least certain call in the generator.
3. **The floodlight.** A real spotlight sweeps the ground before the vault and goes dark for a few seconds after catching Luke. Its intensity (60) was chosen blind.
4. **The ring.** Walk north from the start into the middle zone. Two robots rise after a moment; a red lane on the floor shows each lunge for a full second before it lands. `F` at the ringed robot.
5. **The course.** Walk into the lit wall on the west tower. Luke should grab it, climb with alternating reaches and pull up onto the top.
6. **The HUD** is plain immediate-mode text in built-in fonts: `*` earned star, `o` still possible this try, `-` out of reach.

| Piece | Where | Notes |
| --- | --- | --- |
| Level, numbers, recorded runs | `Traversal/Core/LukeArenaData.cs` | Generated: `npm run unity:arena:export`. Edit `src/game/arena/`, never this file. |
| Rules | `Traversal/Core/ArenaSimulation.cs`, `ArenaSession.cs`, `ArenaTypes.cs`; climb in `HeroSimulation.cs` | Engine-free; `npm run unity:playground:coretest` replays 11 runs recorded from TypeScript. |
| Runtime | `Playground/Runtime/ArenaGame.cs` | Input, camera, robots, sight fans, telegraphs, HUD, saves, cues. Builds its moving parts from primitives at Start. |
| Generator | `Playground/Editor/LukeArenaScene.cs` | `LukePlaygroundProject.SetupArena`, `BuildArenaWindows`, `BuildArenaWeb`. |

Saves use PlayerPrefs key `space-dragon.arena.v1` with a backup key: stars, sparks found, best lap, best wave and a count of quiet takedowns. Nothing about a learner.

## Not done

- No Unity run of any kind; no device or performance measurement.
- No story mission, family party or sidekick. Spider Climb, Tether Snare and Spider Pounce exist in the arena only; mechanical limbs do not exist.
- No swings on the swing set, no marked climbing faces in the playground itself, no ambient audio.
- The arena's robots are primitives, not authored models, and nothing in it has been tuned by play.
- No likeness-grade character. See the decision for what that would require.
