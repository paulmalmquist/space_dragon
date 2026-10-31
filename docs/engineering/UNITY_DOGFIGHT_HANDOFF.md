# Unity dragon and Dogfight handoff

**Direction:** [SD-072](../decisions/2026-10-31-unity-channel-alignment.md), October 31, 2026. **Status:** inspected handoff; Unity dragon import, flight and combat are NOT IMPLEMENTED here.

Use `unity/SpaceDragon` and its pinned packages. Coordinate with the active Unity project writer before changing imports, scene/build entry points or starting an Editor. Its existing First Contact setup regenerates and builds only its own scene; the flight/inspection scene must be separate and explicitly included when ready.

## Existing inputs

- Active export: [dragon-flight-v003.glb](../../public/assets/dogfight/models/dragon-flight-v003.glb), **9,653,504 bytes**, SHA-256 `1446d3c3c9606a61ad8d871473ce5b1242107c0a6d52b59c795102adb74f853c`.
- Source contract and evidence: [dragon asset contract](DRAGON_ASSET_CONTRACT.md), [pipeline receipt](../reports/2026-10-30-dragon-asset-pipeline.md). Preserve the versioned Blender sources, material maps, component names, pivots and rollback exports.
- Behavior reference: `src/prototypes/dogfight/systems/` and its existing unit/browser tests. Presentation reference: `animation/dragon.js`, `wing-cadence.js`, `assets/lock-breath.js`, `effects.js` and `crash-effects.js`.
- Expected GLB structure: **41 meshes / 81,991 triangles**, nine bones, eight sockets, ten materials and two embedded 1024-pixel PNG maps. `Flight`, `Glide` and `Boost` are one-second clips with seven rotation-only channels each. Count actual Unity skinned renderers/submeshes separately from source mesh counts.

## First increment: Unity asset parity

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
