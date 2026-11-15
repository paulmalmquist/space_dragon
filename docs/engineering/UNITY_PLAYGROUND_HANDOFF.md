# Luke's Playground — Unity runbook (SD-088)

Status: **IMPLEMENTED; Unity import, play and builds NOT TESTED.** Written in a cloud session with no Unity Editor. Read the [decision](../decisions/2026-11-15-unity-native-lukes-playground.md) first. Coordinate exclusive Editor ownership as for every other channel in `unity/SpaceDragon`.

## Run it (Windows, pinned Unity 6000.6.7f1)

From the repository root, with no other Editor open on this project:

```powershell
git lfs pull                      # the shared pod and sky assets; the hero itself is not in LFS
npm run unity:playground:verify   # hero files, generated C# and .meta files match their sources
npm run unity:playground:setup    # generates the scene; writes unity/SpaceDragon/Builds/playground-setup-receipt.json
npm run unity:playground:test     # 22 engine-free tests inside Unity EditMode
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

## Not done

- No Unity run of any kind; no device or performance measurement.
- No story mission, family party, sidekick, or Luke-specific abilities (Spider Climb, mechanical limbs).
- No swings on the swing set, no climbable surfaces beyond the ramp, no ambient audio.
- No likeness-grade character. See the decision for what that would require.
