# Unity dragon and Dogfight handoff

**Selected baseline — SD-086, implemented and technically verified:** [the selected Oscar Creativo dragon](../decisions/2026-11-01-oscar-dragon-baseline.md) has a preserved Blender source, full-weight preparation, corrected GLB and verified additive intake. Full-weight Unity readback and corrected sampled pose/setup checks now pass; the first uncompressed Web candidate built but failed Chrome startup OOM. The BC7 revision now passes Editor setup, 86 tests and Web build at unchanged image dimensions/mips; actual Chrome passes all 11 gameplay cases on WebGPU and WebGL2. All six matched neutral views are REVIEWED: shapes/rest pose align, while Unity is lighter/shinier and chest colors differ. This verifies the bounded baseline integration; complete material parity, total driver memory and owner quality/release approval remain open. Keep the current v007/v005 sources, receipts and player rollback. Validation/intake tools measure the actual exported skin, full translation/rotation/scale clips, inverse binds, textures and eight sockets, then emit `oscar-contract-v001.json`, `material-contract-v005.json`, source/provenance/NOTICE files and additive `asset-receipt-v005.json` chained to v004. The measured contract is metre-scale +Z forward/+Y up with zero basis yaw, a measured Oscar rig and explicit jaw/damage attachment mappings; no old bone count is imposed. The first four-influence reduction failed its deformation gate; preserve all original influences. Intake also emits Editor-only `oscar-fullweights-v001.json`/`.bytes` with exact attributes/binds/weights and four sampled Flight poses. Unity mapping/readback/BakeMesh parity passes before generated meshes are saved; both tested player paths report full weights and BC7 textures, with measured short-run performance in the receipt. The runtime NOTICE must be included with the player. [Current evidence](../reports/2026-11-01-oscar-dragon-baseline.md). Structural tooling or intake success does not establish deformation, visual quality or playability.

**Organic candidate — SD-080:** [the owner's purple organic direction after Blender Undo](../decisions/2026-10-31-purple-organic-dragon.md) now has a v007 source, independent 15-bone flight bind, exported clips/materials and additive Unity intake. Export/intake and bounded Unity integration checks pass. The GPUBatched-configured player passed **11/11 cases on WebGPU and 11/11 on WebGL2**, with separate isolated measurements below. WebGL2 remains below the 30 fps fallback target; final art and release approval are not established. The separate isolated native-Chrome repository checks pass as recorded below. Verification is specific to v007, not inherited from v005. [Current source/export receipt](../reports/2026-10-31-purple-organic-dragon.md), [organic asset contract](DRAGON_ASSET_CONTRACT.md#organic-v007-measured-source-and-unity-contract).

**Preserved verified rollback — SD-078:** the heroic v005 player and near-orbit scenery retain their [receipt/gallery](../reports/2026-10-31-near-orbit-heroic-dragon.md). The new selection code can choose organic v007 for the next build; always read the served build receipt to establish which asset is actually running. The v003 details below remain the historical migration baseline, not organic constraints.

**SD-075 follow-through:** the standalone Unity Dogfight port and tactical encounter are now locally verified. Use [the current guide](UNITY_DOGFIGHT.md) and [receipt](../reports/2026-10-31-unity-dogfight.md); retain the baseline below for provenance and future campaign/launch integration.

**Direction:** [SD-072](../decisions/2026-10-31-unity-channel-alignment.md), October 31, 2026. **Historical status before SD-075:** this was an inspected handoff, not an implemented Unity port; later SD-075/078 evidence above supersedes that work state.

Use `unity/SpaceDragon` and its pinned packages. Coordinate with the active Unity project writer before changing imports, scene/build entry points or starting an Editor. Keep the existing Dogfight setup/build separate from First Contact; the development inspection mode derives its isolated scene from the selected Dogfight asset.

## Preserved organic v007 handoff

The additive `asset-receipt-v004.json` chains the earlier v003 intake. `violet-contract-v007.json`, `violet-export-receipt-v007.json` and `material-contract-v004.json` live in `Assets/SpaceDragon/Dogfight/`; the imported GLB is `Imported/dragon-violet-v007.glb`, SHA-256 `0df6f9fdb1d33e5142ffd4e05de83c55664a69a17277c801a6e96f509453eaff`, **36,615,112 bytes**. Preserve the old files and receipts. The exact source, hashes, bounds and eight socket points are in the [profile contract](DRAGON_ASSET_CONTRACT.md#organic-v007-measured-source-and-unity-contract).

- **Independent anatomy:** `violet-organic-15` has `Root`, `Neck`, `Head`, `Jaw`, `Wing_L/R`, `Fore_L/R`, `Hind_L/R` and `Tail_0`–`Tail_4`. Its flight rest and inverse binds intentionally differ from the mechanical nine-bone rig. Import validation compares its own measured hierarchy, matrices, skin and rest bounds; never impose v005's 901 pivots, nine rests or inverse-bind hash on this asset.
- **Measured geometry/materials:** 2 GLB meshes, 12 primitives/materials, 263,352 triangles and 361,614 unique position vertices. Three 2048² skin maps and three 1024² membrane maps provide base color, normal and ORM. All surfaces have metallic factor zero; individual scales/keratin/teeth also use constant PBR surfaces. Read actual imported renderer/submesh counts and frame cost separately. Opaque double-sided membrane approximates Blender transmission/subsurface.
- **Coordinates/contact:** authored metres, source -Z nose/+Y up; glTFast X conversion followed by one explicit Y180 visual basis supplies gameplay +Z. The source preparation's 0.82 scale is already baked. Retain unit gameplay scale and the 3.3 m gameplay sphere. Organic contact Y is -1.22348906 m; do not use the old -0.6650268435 m mechanical value or infer a finished landing pose from the flight-bind marker.
- **Attachments:** retain all eight lowercase names: `socket_muzzle`, `socket_wing_l/r`, `socket_thruster_l/r`, `socket_target`, `socket_camera`, `socket_ground`. The organic muzzle is parented to **Head**, wings to their respective Wing bones, all remaining markers to Root. Resolve the live muzzle transform for every fire effect/projectile; camera tracking remains outside visual banking/roll.
- **Animation:** Flight/Glide are 1.6 s and Boost 1.2 s, each with 13 rotation-only bone channels. Root is movement-owned and Jaw attack-owned. The runtime samples imported clips and blends with irregular visual cadence; it does not assume one-second organic clips. Organic mode requires all clips, disables procedural armor and mechanical wing/tail offsets, and does not substitute the old rig as a silent animation fallback.

`DogfightProject.SelectedAsset` and `tools/unity/run-dogfight.ps1` agree on selection: with no override, `asset-receipt-v005.json` selects Oscar, then v004 selects violet, otherwise heroic. An incomplete/corrupt selected intake fails validation. Explicit `SPACE_DRAGON_DOGFIGHT_ASSET=oscar-v001`, `violet-v007` or `heroic-v005` requires its prepared intake; the latter two preserve rollback. This selects the next setup/build and does not change an already served player.

```powershell
node tools/unity/prepare-violet-dragon.mjs --verify
$env:SPACE_DRAGON_DOGFIGHT_ASSET = 'violet-v007'
powershell -NoProfile -ExecutionPolicy Bypass -File tools/unity/run-dogfight.ps1 -Action setup
# Run test, then web through the same exclusive-Editor runner when available.
# Rollback uses: $env:SPACE_DRAGON_DOGFIGHT_ASSET = 'heroic-v005'
# Restore automatic selection with: Remove-Item Env:SPACE_DRAGON_DOGFIGHT_ASSET
```

The profile-aware checks are implemented in `DogfightProject`, `DragonPresentation` and the additive intake tools. Their source existence is not an Editor/build/browser pass. Record each execution and served `build-receipt.json` separately. Movement, combat, spelling while dodging, saves and damage rules retain their existing boundaries.

The fresh exact-final-code EditMode run passed **74/74 tests, zero skipped**: [result XML](../../artifacts/unity/dogfight-editmode-20261101-014202-708-15624.xml), [Editor log](../../artifacts/unity/dogfight-test-20261101-014202-708-15624.log). Earlier result files remain historical evidence.

## Development asset inspection

`DogfightAssetInspection.cs` adds an explicit development-build URL mode after scene load, before the encounter starts:

```text
http://127.0.0.1:5207/space-dragon-dogfight/?inspect=dragon&inspectionview=blender-neutral
```

`inspectionview` also accepts `front`, `side` and `rear`. The mode clones the selected imported model at unit scale/identity orientation, disables its animation, creates an isolated neutral scene and unloads/deactivates the encounter roots. It runs no combat or saves. Normal Dogfight startup remains unchanged when the query is absent.

The default comparison uses a 50 mm camera with a 36×24 mm sensor, source Blender position `(10,12,6)`, target `(0,0,0.1)`, and **1200×800** captures. Unity maps that position to `(-10,6,-12)`, target `(0,0.1,0)`; the inspection clone deliberately omits gameplay's Y180 basis. Neutral reflection, directional key/fill/rim and disabled gameplay sky/fog/postprocessing expose material and geometry differences. Lighting is an approximation, not Cycles/AgX parity. The local snapshot bridge reports the mode, view, camera, dimensions, renderer/model counts and frame intervals; those are not GPU time or measured VRAM. The [actual three-view capture](../../artifacts/unity/violet-inspection/runs/2026-11-01T01-09-17-364Z/report.json) and [review note](../../artifacts/unity/violet-inspection/visual-review.md) preserve the CPU-configured player comparison: silhouette/rig arrangement match, but head/horn highlights, wing lighting, small-scale aliasing and the missing studio floor remain visible differences. This visual evidence does not prove backend skinning execution or cinematic-reference fidelity.

**Current capture:** [2026-11-01T01-42-53-909Z](../../artifacts/unity/violet-final-inspection/runs/2026-11-01T01-42-53-909Z/report.json) uses the GPUBatched-configured `2026-11-01T01:24:33.8193339Z` build. All three matched/front/side PNGs and the source `flight-final.png` were actually reviewed; the geometry is intact, while Unity head/horn/membrane highlights remain hotter than Blender. Page/console error arrays are empty and storage is unchanged. The harness's capture-only label remains distinct from the separate visual review; neither is owner art approval. Preserve the earlier CPU checkpoint above.

## Mesh-deformation audit — verified player candidate

The observed `ProjectSettings.asset` contains `gpuSkinning: 0` and `meshDeformation: 0`: CPU configuration. The new `DogfightProject.ConfigureMeshDeformation()` requests the supported `PlayerSettings.meshDeformation` API with `MeshDeformation.GPUBatched`; it does not merely change the legacy boolean. This is scoped to the generated Dogfight setup/build transaction. `BuildSettingsSnapshot.Restore()` restores the original mesh-deformation setting alongside the other project settings and checks that restoration succeeded.

Unity's [gpuSkinning API documentation](https://docs.unity.com/en-us/engine/6000.6/script-reference/unityeditor/playersettings/gpuskinning) maps false to CPU and true to GPUBatched; its [WebGPU feature documentation](https://docs.unity.com/en-us/engine/6000.5/manual/platform-specific/webgl/develop/graphics/web-gpu/features) lists GPU skinning support. These justify testing the candidate, not assuming actual execution or an automatic speed improvement. Verify WebGPU and WebGL2 separately, including fallback, deformation, bounds, effects and combat behavior.

For a CPU comparison/rollback build, set `$env:SPACE_DRAGON_DOGFIGHT_SKINNING = 'cpu'` before the exclusive Dogfight runner. Remove that environment variable to request GPUBatched. This is independent of `SPACE_DRAGON_DOGFIGHT_ASSET`, which selects organic/mechanical art. Other nonempty skinning values fail explicitly.

The setup receipt records `configuredMeshDeformation`. Each new build receipt records **configured**, **original** and **restored** mesh-deformation values plus `settingsRestored` and a scope warning. A successful build with `configuredMeshDeformation: "GPUBatched"` proves the requested player setting, not actual GPU skinning or absence of fallback. A CPU value remaining in the shared project after the job is expected when the original setting was CPU. The Development build at `2026-11-01T01:24:33.8193339Z` succeeded: **148,461,303 bytes**, **164.9648655 s**, the same v007 GLB hash, configured GPUBatched, original/restored CPU and `settingsRestored: true`. The earlier CPU-configured player is preserved at `unity/SpaceDragon/Builds/DogfightWeb-v007-CPU-20261101-010749/`; neither environment override changes that retained artifact.

Retain the preliminary CPU-configured player evidence without treating it as the new build's result:

- [Actual Chrome WebGPU run, 2026-11-01T01-10-46-773Z](../../artifacts/unity/violet-playtest/runs/2026-11-01T01-10-46-773Z/report.json): **11/11 cases passed** against organic SHA `0df6f9fd…453eaff`.
- [Actual Chrome WebGL2 run, 2026-11-01T01-14-12-309Z](../../artifacts/unity/violet-playtest-webgl2/runs/2026-11-01T01-14-12-309Z/report.json): **10/11 cases passed**; the beam-observation check failed after screenshot timing consumed the brief phase, while the attack resolved once. The later harness and GPUBatched-configured runs pass below; this original failed run remains unchanged.
- Approximate **34 ms WebGPU / 55 ms WebGL2** frame samples were collected while legacy tests were active concurrently. They are **not an isolated CPU baseline**, a GPU-skinning speedup measurement, or GPU execution time. They are retained as observations only; use the separate isolated runs below for the current candidate.


The final configured player passed both actual installed-Chrome suites on the Lenovo/AMD Radeon graphics device:

| Player verification | Result |
| --- | --- |
| [WebGPU, 2026-11-01T01-25-22-561Z](../../artifacts/unity/violet-gpu-skinning-playtest/runs/2026-11-01T01-25-22-561Z/report.json) | **11/11 PASS** |
| [WebGL2/OpenGLES3, 2026-11-01T01-28-28-074Z](../../artifacts/unity/violet-gpu-skinning-webgl2/runs/2026-11-01T01-28-28-074Z/report.json) | **11/11 PASS** |

These cover live controls/aim modes, evasion/pause, missiles/plasma/salvage/recharge, localized damage and limited repairs, warning/roll behavior, active spelling through windup/beam, collision/loss/restart and save isolation. Development fixtures arrange selected conditions; the real simulation resolves actions. A passing behavioral suite is not proof of physical-controller coverage, human audio/comfort approval or a release-player fixture audit.

Separate **1366×768 natural-flight** measurements ran with one browser and no competing tests. The window is roughly ten seconds; no quiet/target/damage fixture is applied:

| Isolated run | Mean frame | p95 frame | Samples | Reciprocal-mean rate |
| --- | --- | --- | --- | --- |
| [WebGPU, 2026-11-01T01-31-56-833Z](../../artifacts/unity/violet-isolated-webgpu/runs/2026-11-01T01-31-56-833Z/report.json) | **17.207 ms** | **21.000 ms** | 584 | about **58.12 fps** |
| [WebGL2, 2026-11-01T01-32-22-260Z](../../artifacts/unity/violet-isolated-webgl2/runs/2026-11-01T01-32-22-260Z/report.json) | **41.184 ms** | **63.000 ms** | 245 | about **24.28 fps** |

These are Unity Update wall-clock intervals, not GPU timer queries, endurance results or a controlled CPU-versus-GPU skinning A/B. The WebGPU texture-allocation counter remains an undercount and is not VRAM evidence. **WebGL2 is below the 30 fps fallback target**: the next work is measured mesh LOD and backend profiling, not a declaration that the release/performance gate passed. The separate isolated native-Chrome `npm run check` completed with exit 0: **237 unit tests, TypeScript/Vite build, 49 development browser tests, 9 production browser tests and 18 photo-inventory checks passed**. [Full native-check log](../../artifacts/violet-contract-audit/npm-check-native-isolated.log). These repository checks cover the retained browser foundations; they are separate from the Unity results above. The [earlier interrupted SwiftShader run](../../artifacts/violet-contract-audit/npm-check.log), including its one-frame Drive sampling failure, remains failed/incomplete evidence. Native success is not a software-rendered CI pass and does not prove resource contention caused the earlier failure.

## Historical v003 migration inputs

- Historical baseline export: [dragon-flight-v003.glb](../../public/assets/dogfight/models/dragon-flight-v003.glb), **9,653,504 bytes**, SHA-256 `1446d3c3c9606a61ad8d871473ce5b1242107c0a6d52b59c795102adb74f853c`.
- Source contract and evidence: [dragon asset contract](DRAGON_ASSET_CONTRACT.md), [pipeline receipt](../reports/2026-10-30-dragon-asset-pipeline.md). Preserve the versioned Blender sources, material maps, component names, pivots and rollback exports.
- Behavior reference: `src/prototypes/dogfight/systems/` and its existing unit/browser tests. Presentation reference: `animation/dragon.js`, `wing-cadence.js`, `assets/lock-breath.js`, `effects.js` and `crash-effects.js`.
- Historical v003 GLB structure: **41 meshes / 81,991 triangles**, nine bones, eight sockets, ten materials and two embedded 1024-pixel PNG maps. `Flight`, `Glide` and `Boost` are one-second clips with seven rotation-only channels each. These counts do not apply to organic v007. Count actual Unity skinned renderers/submeshes separately from source mesh counts.

## Historical mechanical increment: Unity asset parity

The following numbered requirements preserve the v003/v005 migration evidence and rollback. Mechanical color, nine-bone preservation, contact coordinates and clip counts are profile-specific; use the organic contract above for v007. General import, gameplay and evidence boundaries still apply.

1. Prepare a separate versioned import and hash/provenance receipt from the unchanged GLB. Follow the current candidate's non-overwrite preparation pattern; do not overwrite its pod receipt or imported assets.
2. Retain a stable metre-scale gameplay root, +Y up and separate visual banking/bobbing. Keep the **3.3-metre gameplay sphere** independent of animated bounds. Source ground/contact Y is **-0.6650268435**. Document the actual imported origin, contact height and adapter before adding flight.
3. Verify handedness once. Installed glTFast `NodeExtension.cs` maps translation to `(-x,y,z)` and quaternion to `(x,-y,-z,w)`; its animation jobs apply the same conversion. The source nose remains **-Z**, whereas Unity `Transform.forward` is +Z. Use an explicit documented gameplay-forward/visual adapter and test it on the imported model. Do not recenter from animated bounds, apply a second mirror or relabel authored Left/Right nodes from coordinate sign. Resolve all effect and camera sockets through imported transforms.
4. Preserve `Root`, `Wing_L`, `Wing_R`, `Jaw`, and `Tail_0`–`Tail_4`. The pod currently uses supported Mecanim import; do not select glTFast's removed Playables import mode. Verify imported binding paths, converted rest poses, looping clips and partial/missing-channel handling. Clips must not move the authoritative root, resize collision or award damage/rewards.
5. Audit materials in the real URP player. Preserve gunmetal/crimson paint, normal maps, packed data channels, membrane response and orange emission. The current importer supports clearcoat but its shader can be stripped or unavailable in a build. Verify the actual clearcoat shader and normal-map scaling, not only Inspector values. glTF roughness packing is not URP smoothness packing.
6. Apply unsupported `KHR_materials_emissive_strength` through the existing immutable-clone pattern in `PodMaterialParity.cs`: reset the generated clone from its imported source before applying correction. The dragon energy factor `[1,0.085,0.009]` × strength approximately `3.2` yields approximately `[3.2,0.272,0.0288]` in linear space before bloom. Read exact source values; never multiply an already corrected clone repeatedly.
7. Create neutral front/side/three-quarter views and a representative chase-camera scene. Match existing Blender/browser reference framing. Check full-wing skinned bounds and frustum exit/reentry; verify no disappearing or frozen sections. Record actual frame intervals, draw calls, triangles, texture/resource estimates and build/transfer sizes with measurement methods.

Run EditMode checks for names/clips/material correction/coordinate invariants, then inspect the actual Web build with the existing browser harness. Verify WebGPU and WebGL2 separately when exercised. Pod tests and First Contact frame samples do not establish dragon parity.

## Behavior to carry forward

Port pure rules to C# using the existing deterministic tests as parity cases. Keep semantic input, authoritative encounter state and presentation separate. Preserve:

- Arrow/mouse flight, W/A/D/Z independent aim, mouse flight/aim toggle, left-button fire, held right-button zoom, boost, finite-energy rolls and break-turn evasion.
- Randomized four-letter charge prompts with **active flight, incoming fire and dodging throughout spelling**. Keep assistance flags; no automatic spelling pause or immunity.
- Reticle dwell, initial one-target capacity, Space windup/roar/fire beam and exactly one damage resolution per attack. Repeated Space, target loss, pause and replay must not duplicate impact.
- Enemy standoff, radar relationships, asteroid collision, mechanical crash/recovery, reduced motion and retry boundaries.
- Irregular flap/glide holds, interrupted Flight/Boost/Glide blends, additive banking/tail movement and combat-controlled jaw. Pause freezes time/weights; restart restores initial state without duplicate animation actions. Wait on simulated time in automated blend checks.
- Consistent mouth glow, plasma and charged-beam origin through rolls and banking; visual motion must not roll the stable camera tracking frame. Missing required sockets must be reported clearly.
- Input/audio release on pause, focus loss and mode changes. Keyboard/mouse remains the verified reference; new controller coverage needs its own checks.
- Encounter-only state. The current lab grants no campaign rewards and writes no campaign/learner saves. Keep Unity candidate state isolated and existing browser saves intact until an explicit, tested migration exists.

Keep the original lab until the Unity browser build demonstrates loading, flight/aiming, ordinary fire, charge/lock/breath, rolls/glides, collision/recovery and pause/retry/save isolation. Record screenshots and measured results in a Unity-specific receipt. Physical controllers, sustained performance and human art/feel approval remain separate.
