# Unity Town Drive handoff

October 31, 2026. The existing SD-072 engine alignment selects the shared Unity project. [SD-074 Town Drive foundation](../decisions/2026-10-31-unity-town-drive-foundation.md) applies that direction here, starting with versioned route/context data and pure C# behavior parity. A detailed Unity scene is the next stage, not an outcome established by that foundation.

## Preserve the inspected baseline

- Keep the Babylon Drive Lab executable as the behavior, visual and rollback reference. Do not replace its detailed art with a sparse Unity primitive scene.
- Current derived data: **4,455.219725m** loop; **407.943720m** home exit; **83 estimated context houses**, **4 mapped lakes**, **26 context street ways**, **8 estimated court bulbs**, **10 junctions / 11 closures**. Counts distinguish authored estimates from measured source geometry; they are not surveyed building footprints.
- Route: Starpass Court → right Green Island Boulevard → left Winston Trails South → right Hypoluxo Road, then Jog/Lantana/Hagen and the labeled invented return. Preserve stable section/checkpoint/closure IDs, shared home stem, NPC through-bridge and complete home turnaround.
- Preserve the estimated home exterior, garage/driveway, optional interior cutaway, gate booth/rails/raised arms, source-shaped shores, dense frontage, street signs, crosswalks, police vehicles and barricades.
- The original white minivan is **5.212 × 1.994 × 1.768m**, wheelbase **3m**, tire radius **0.37m**. Driver eye is vehicle-local **(−0.46, 1.42, 0.42)m**, forward **+Z**. Preserve full cabin, glazing, controls, wheel pivots and dashboard sightlines.

## Reusable visual inputs

| Input | Existing source | Port treatment |
| --- | --- | --- |
| Measured streets/water, placements and routing | `src/game/drive/neighborhood*-source.json`, `neighborhood-context.ts`, `route.ts`, `junctions.ts` | Export the derived coordinates, triangle indices, IDs, placements, confidence and collision proxies once; retain OSM provenance/attribution. |
| Detailed roads, homes, shops, gate, signs and closures | `world.ts`, `development.ts`, `neighborhood-world.ts`, `neighborhood-context-world.ts`, `junction-world.ts` | Capture their actual generated vertex/UV/material data into versioned meshes; keep existing spatial batches and distant proxies. These details are currently code-generated, not standalone GLBs. |
| Minivan and NPC cars | `car.ts`, `minivan-config.ts`, `traffic-visuals.ts` | Export the named minivan hierarchy plus shared sedan/SUV/van templates; preserve instanced wheel geometry and cabin detail groups. |
| Vegetation | `public/assets/drive/vegetation/`: 6 GLBs, **10,521,620 bytes** | Reuse existing detailed palm/canopy/hedge geometry and all three LOD tiers. Keep photographed leaf alpha, branch silhouettes and source licenses. |
| Pedestrians | `public/assets/drive/pedestrians/`: 2 GLBs, **2,047,660 bytes** | Reuse the rigged adults and walk clips with the bundled Microsoft/Rocketbox MIT notice. Babylon's baked-animation shader is not a portable Unity animation system. |
| Surfaces/environment | 21 Drive WebP maps, **6,591,486 bytes**; existing Unity `Imported/daylight.hdr` | Reuse existing converted grass/concrete/plaster/wood inputs; prepare missing asphalt/bark/fabric derivatives through the same hash-recorded pipeline. Do not export Babylon's `.env` as a Unity sky. |

Source paths above are under [`src/game/drive`](../../src/game/drive) unless otherwise specified. Retain each asset's `PROVENANCE.json`; keep source videos and Google Maps images in reference storage and export game-ready derivatives through the existing asset pipeline.

## Bounded export and import path

1. Build a local authoring export from a deterministic Drive scene, independent of a user's save. Export each road chunk and context group before streaming unloads it; force the intended geometry available without baking camera-dependent LOD selection. Exclude sky, transient traffic/pedestrians and hidden source duplicates.
2. Export the complete minivan at its origin, temporarily including disabled cabin detail. Keep steering/wheel/camera anchors as named transforms; keep interior/exterior glazing variants explicit. Bake canvas sign/roof/dashboard label textures to PNG. Dynamic gauges, steering, lamps and visibility remain Unity presentation bindings.
3. Use version-matched Babylon serialization or a tested mesh-data writer. `@babylonjs/serializers` is **not installed** in the inspected workspace; adding it is a coordinated authoring-tool change, not a Unity runtime dependency. Babylon supports selective GLB export and instancing, but the chosen export/import path still requires parity checks. [Official exporter documentation](https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/Exporters/glTFExporter.md).
4. Store shared textures/material definitions once. Avoid embedding identical 1K surface maps in every chunk. Keep vegetation/car mesh references plus instance transforms in a placement manifest; recreate native Unity instances and LODGroups instead of flattening every tree into duplicated vertices.
5. Import GLBs through the project's pinned glTFast Editor importer, which creates Unity assets and supports URP materials. Inspect any unsupported extensions before substituting shaders. [Official importer setup](https://github.com/Unity-Technologies/com.unity.cloud.gltfast/blob/main/Packages/com.unity.cloud.gltfast/Documentation~/ProjectSetup.md).
6. Record source hashes, exporter/importer versions, node/material/triangle counts, texture derivations, instance/LOD metadata and exact coordinate anchors. Preserve the original generated export before making Unity-specific derivatives.

## Coordinates and material parity

- Authoritative data uses **metres, +X east, +Y up, +Z north**, yaw zero toward +Z and positive yaw toward +X. Preserve that convention in C# state. glTF is right-handed; Babylon export and Unity import each perform conversions. Test origin/+X/+Z landmarks, winding, normals and minivan front/driver side before applying one documented import-root correction. Never add an unexplained second mirror or rotation.
- Follow the shared Unity channel's `tools/unity/prepare-assets.mjs`: losslessly decode WebP to PNG; albedo imports as sRGB, normal/data maps as linear; set Unity normal-map import explicitly. For URP/Lit dielectric packing use metallic RGB=0 and smoothness alpha=`255 − source roughness green`. Preserve metallic car parts separately.
- Follow `FirstContactProject.ConfigureTextureImports` and its shared-surface setup for tiling and data-space handling. Clone generated material derivatives instead of editing imported glTF subassets.
- The existing importer needs the explicit emissive-strength correction demonstrated by `GltfEmissionParity.cs`: reset from the immutable imported material, then apply source emissive factor × strength once. Reuse the pattern through coordinated shared-code ownership.
- Inspect alpha-clipped, double-sided leaves, tangent-space normals, cabin transparency/depth ordering, glass shadow exclusion, brake lights and reflective water. Babylon translucency, baked pedestrian animation and material flags do not automatically become equivalent URP effects.
- Use the same approved daylight HDR with a Unity sky/reflection capture, then compare exposure, sun direction, fog and tone mapping. Start with bounded shadow range and no continuously refreshed scene reflection. Different renderers do not imply identical pixels or automatically better art.

## C# foundation and later runtime bindings

- Keep route/simulation/traffic/checkpoint rules independent of GameObjects and animation. Port fixed-step behavior against exported parity cases; do not introduce WheelCollider handling changes as an incidental engine migration.
- Preserve pause/blur input release, assist semantics, collision/recovery, idempotent checkpoint completion, elapsed-time traffic signals and pedestrian motion. Keep candidate saves separate; no automatic Babylon-save migration.
- Bind chase/cabin/orbit cameras to the same interpolated presentation pose; verify steering, reset and pause do not detach the camera. Preserve cabin eye, Q/E/drag look and recenter behavior.
- Preserve shared car materials/paint overrides, nearby traffic limits, pedestrian bounds, vegetation LOD/shadow limits and chunk visibility. Use Unity animation/instancing deliberately; remeasure instead of assuming the browser's optimized budgets transfer unchanged.

## Ownership and acceptance

- Use the existing **Unity 6000.6.7f1 / URP 17.6.0 / glTFast 6.20.0** project. Coordinate exclusive Editor/build access with the active LaunchLab writer. Its generator changes shared scene/build settings; do not run parallel setup or rewrite shared packages, pipeline assets or build lists.
- Proposed isolated ownership: `Assets/SpaceDragon/TownDrive/{Data,Imported,Runtime,Editor,Tests,Generated}` and dedicated TownDrive assemblies/tools. A later build names only its own scene/output, preserving First Contact/LaunchLab artifacts. The current foundation does not create that visual scene.
- Foundation acceptance: deterministic export hashes/schema; source metre/shore/junction invariants; pure C# parity for movement, pause/reset, checkpoints and representative collisions. Existing TypeScript checks are reference evidence, not Unity verification.
- Visual acceptance: assert all mapped water/closure/placement counts; compare home/lake, Winston side view, gate T, arterial junction, minivan exterior and cabin views. Verify no road/shore intrusion, missing sign textures, collapsed foliage, omitted cabin detail or changed wheel/camera anchors.
- Gameplay acceptance: actual Unity drive from home through the complete loop and return, both NPC directions, pedestrians, all visible closures, collision recovery, pause/blur/reset and isolated save reload. Unity import or compilation alone cannot establish these results.
- Measure named-hardware WebGPU/WebGL2 and Windows separately when exercised: loading/transfer bytes, memory method, draw calls/triangles, median/p95 frame time and sustained driving. Report untested targets explicitly; retain Babylon until a reviewed Unity replacement passes its own receipt.

Current shared-project commands, import evidence and concurrency constraints are in `unity/SpaceDragon/README.md`, owned by the other Unity channel. Its project setup/packages/renderer are a separate integration prerequisite, not bundled into this task-owned core module. Keep implementation, verification, human visual review and release approval distinct.
