# Dragon asset contract

**Current candidate — SD-080, organic v007:** [the owner's purple organic direction after Blender Undo](../decisions/2026-10-31-purple-organic-dragon.md) now has a separate refined source, flight bind, baked game export and additive Unity intake. Its **15-bone `violet-organic-15` profile is independent of the mechanical rest/inverse-bind contract**. Export, lossless optimization, intake and the bounded Unity integration are verified. The GPUBatched-configured player passed **11/11 cases on both WebGPU and WebGL2**. Isolated frame samples averaged **17.207 ms WebGPU / 41.184 ms WebGL2**; the fallback remains below the 30 fps target and this is not release or final-art approval. [Source/export evidence and remaining art limits](../reports/2026-10-31-purple-organic-dragon.md), [skinning audit](UNITY_DOGFIGHT_HANDOFF.md#mesh-deformation-audit--verified-player-candidate).

**Preserved verified rollback — SD-078:** heroic v005 retains its nine rest bones/inverse binds, 901 pivots, eight sockets and three clips. Its [player evidence](../reports/2026-10-31-near-orbit-heroic-dragon.md) remains specific to v005; it is not evidence for organic v007. Prior v003 source/export and the historical Three.js contract remain intact. [Unity selection/build guide](UNITY_DOGFIGHT_HANDOFF.md).

**Unity follow-through — October 31, SD-072:** [the Unity handoff](UNITY_DOGFIGHT_HANDOFF.md) carries versioned assets, articulation and gameplay boundaries into the existing Unity project. The historical sections retain the verified Three.js baseline; the organic section defines the new candidate. Unity coordinates, materials, animation and gameplay parity require their own checks. Preserve source and rollback exports.

SD-060 — confirmed owner request, October 30, 2026; implemented and technically verified for the named local checks on October 31. [The receipt](../reports/2026-10-30-dragon-asset-pipeline.md) owns artifact identities, screenshots, measured results and remaining limits. This contract covers the existing Three.js Dogfight Lab, not an engine migration or campaign integration.

The gameplay controller remains authoritative for movement, orientation, health, collision, attack timing and saves. Blender supplies render geometry, materials, bone animation and attachment nodes. Animation cannot move the gameplay root or grant damage/rewards.

## Organic v007: measured source and Unity contract

The checked-in [violet-contract-v007.json](../../unity/SpaceDragon/Assets/SpaceDragon/Dogfight/violet-contract-v007.json) owns exact transforms, bounds, material declarations and clip samples/counts. [asset-receipt-v004.json](../../unity/SpaceDragon/Assets/SpaceDragon/Dogfight/asset-receipt-v004.json) adds this export and chains the preceding intake; `material-contract-v004.json` and `violet-export-receipt-v007.json` preserve its material and source identities. Do not replace historical receipts or compare this anatomy against mechanical rest matrices.

| Item | Verified export value |
| --- | --- |
| Editable source | `assets/source/local/spacecraft/space-dragon-spacecraft/Space Dragon-v007-violet-flight.blend`; SHA-256 `4f0c14cead3303d68ee18e4e0070f102f5ec0320c145c778ee7b616db05a1870` |
| Runtime intake | `unity/SpaceDragon/Assets/SpaceDragon/Dogfight/Imported/dragon-violet-v007.glb`; **36,615,112 bytes**, SHA-256 `0df6f9fdb1d33e5142ffd4e05de83c55664a69a17277c801a6e96f509453eaff` |
| Geometry | **2 meshes, 12 primitives/materials, 263,352 triangles, 361,614 unique position vertices**; source counts are not measured Unity draw calls |
| Skin | One independently authored flight skin; maximum four normalized influences; 15 bones and its own inverse binds |
| Images | Three 2048² skin maps and three 1024² membrane maps: base color, tangent normal and ORM; AO stays separate from base color |
| Texture estimate | **62,914,560 bytes** RGBA8 level zero only; excludes mipmaps, Unity formats/copies and driver allocation; not measured VRAM |

The 15 bones are `Root`, `Neck`, `Head`, `Jaw`, `Wing_L`, `Wing_R`, `Fore_L`, `Fore_R`, `Hind_L`, `Hind_R`, and `Tail_0`–`Tail_4`. `Head` follows `Neck`, `Jaw` follows `Head`, and each later tail bone follows the preceding tail bone. `Neck`, limbs, wings and `Tail_0` follow `Root`. The source standing rig and recovery collections remain separate from `VioletFlightRig`; the old nine-bone requirement applies only to the mechanical profile.

GLB metadata is `assetContractVersion: 2`, `rigProfile: "violet-organic-15"`, `metersPerUnit: 1`, forward **-Z**, up **+Y**, and `authoredPresentation: true`. The preparation recipe bakes its 0.82 source scale and centre adjustment into the independent flight mesh/rest; **do not apply another 0.82 scale at runtime**. Unity keeps authored metre scale beneath `Dragon.GameplayRoot.+Z-metres` → `Dragon.VisualMotion.bank-roll` → `Dragon.SourceBasis.minusZ-to-plusZ.Y180` → `DragonViolet.v007.Organic`. glTFast mirrors source X once; the single Y180 basis adapts the -Z nose to gameplay +Z. No recentering from animated bounds or second mirror is allowed.

Measured source bounds are `(-5.02985281, -1.22348908, -3.72217935)` to `(5.02985281, 1.63034162, 3.75390165)`. The flight-bind ground marker is **Y = -1.22348906 m**: level placement would put the root 1.22348906 m above that plane. This is metadata for inspection, not proof of a planted landing pose. The gameplay collision remains the independent **3.3 m sphere**; broader wings and different anatomy do not change hit or movement rules.

| Exact socket name | Parent | Source GLB rest point (X, Y, Z), metres |
| --- | --- | --- |
| `socket_muzzle` | `Head` | `(0, -0.25709234, -3.72780929)` |
| `socket_wing_l` | `Wing_L` | `(-3.01304857, 0.58132315, -0.31935879)` |
| `socket_wing_r` | `Wing_R` | `(3.01304857, 0.58132315, -0.31935879)` |
| `socket_thruster_l` | `Root` | `(-0.44999999, 0.04999991, 0.74999993)` |
| `socket_thruster_r` | `Root` | `(0.44999999, 0.04999991, 0.74999993)` |
| `socket_target` | `Root` | `(0, 0.14999992, -0.25000003)` |
| `socket_camera` | `Root` | `(0, 0.44999985, 0.2)` |
| `socket_ground` | `Root` | `(0, -1.22348906, 0.00000003)` |

These are measured model-space points, not parent-local coordinates or hardcoded world-space fire origins. All suffixes are lowercase. The muzzle now follows **Head**, rather than the mechanical Root attachment; plasma, glow and charged breath must use its current imported transform through neck motion, banking and rolls. Camera tracking stays in the stable gameplay frame. Wing/thruster markers do not themselves introduce new effects.

Exported **Flight/Glide are 1.6 s**, **Boost is 1.2 s**, each with 13 looping rotation-only channels. Root and Jaw are excluded: gameplay owns movement and the attack timeline owns jaw opening. `DragonPresentation` samples the actual imported clips for all 15 bones and blends with a 0.18 s response; visual cadence retimes those samples, so clip duration is not a promise of literal runtime stroke duration. Organic playback requires all three authored clips, skips mechanical wing/tail offsets and generated armor, and has no silent mechanical fallback. The bounded player suite covers pause/restart and live muzzle alignment; prolonged deformation, broader device coverage and final art review remain separate.

All twelve exported surfaces are dielectric (`metallicFactor = 0`). Continuous skin and membrane use baked maps; small physical scales/keratin/teeth use explicit PBR constants, while mouth/eye/iris remain separate. Membrane is opaque, double-sided core PBR; Blender subsurface/transmission is not reproduced. Import checks must preserve map bindings, tangent bases, roughness, normal scale and effective iris emission without applying mechanical recoloring. Emission strength is corrected once on generated material clones; bloom is separate.

`tools/verify-violet-dragon.mjs` validates this profile against its own receipt. `tools/optimize-violet-dragon.mjs` retains raw/unwelded exports, removes unused animation sampler data and performs lossless welding while checking exact images, indexed attributes, clips, sockets and transforms. The actual Khronos validator run reports **0 errors, 2 skinned-mesh-parent warnings and 76 informational notices**; these do not establish runtime parity. See the source report for detail. Unity import/build, browser play, matched inspection screenshots and device measurements remain separate gates.

The fresh final-code [Unity EditMode result](../../artifacts/unity/dogfight-editmode-20261101-014202-708-15624.xml) is **74/74 passed, zero skipped**. The [final neutral/front/side capture](../../artifacts/unity/violet-final-inspection/runs/2026-11-01T01-42-53-909Z/report.json) uses the GPUBatched-configured `01:24:33` player and unchanged v007 GLB. All three views and the source flight render were visually reviewed: geometry remains intact, with hotter Unity highlights on the head/horns/membranes. The capture recorded no page/console errors or storage writes. This supersedes the earlier CPU inspection as the current capture pointer; it does not erase that checkpoint or establish final art approval.

### Mesh deformation: verified player candidate, profiling open

The inspected project settings contained `gpuSkinning: 0` and `meshDeformation: 0` (CPU configuration). `DogfightProject` now requests `PlayerSettings.meshDeformation = MeshDeformation.GPUBatched` inside the existing settings-restoration transaction; `SPACE_DRAGON_DOGFIGHT_SKINNING=cpu` selects a CPU comparison/rollback build. Build receipts distinguish `configuredMeshDeformation`, `originalMeshDeformation` and `restoredMeshDeformation`. A restored CPU project setting does not mean the generated player was configured for CPU; read that build's receipt.

Unity documents the legacy false→CPU/true→GPUBatched mapping in [PlayerSettings.gpuSkinning](https://docs.unity.com/en-us/engine/6000.6/script-reference/unityeditor/playersettings/gpuskinning) and lists GPU skinning among its [WebGPU features](https://docs.unity.com/en-us/engine/6000.5/manual/platform-specific/webgl/develop/graphics/web-gpu/features). **A configured setting or observed WebGPU renderer is not proof of actual GPU skinning execution or absence of fallback.** The build at `2026-11-01T01:24:33.8193339Z` succeeded with GPUBatched configured and original/restored CPU settings. Both backend player suites passed 11/11 cases. Isolated 1366×768 natural-flight samples, without competing tests, measured WebGPU **17.207 ms mean / 21.000 ms p95** (about 58.12 fps reciprocal mean) and WebGL2 **41.184 ms mean / 63.000 ms p95** (about 24.28 fps). These are short wall-clock frame samples, not GPU timing or proof of skinning execution. WebGL2 misses the 30 fps fallback target; mesh LOD and backend profiling are the next performance work. Earlier approximately 34 ms / 55 ms samples overlapped legacy tests and cannot establish a CPU/GPU speedup. A separate isolated native-Chrome `npm run check` completed successfully: 237 unit tests, TypeScript/Vite build, 49 development browser tests, 9 production browser tests and 18 reference inventory checks. [Complete log](../../artifacts/violet-contract-audit/npm-check-native-isolated.log). This does not establish a software-rendered CI pass or explain the earlier interrupted SwiftShader failure causally. The [handoff audit](UNITY_DOGFIGHT_HANDOFF.md#mesh-deformation-audit--verified-player-candidate) links the final runs and preserves the earlier failed browser check separately.

## Historical mechanical / Three.js profile

The sections below retain the SD-060/v003 baseline and its later mechanical v005 continuity. Their nine-bone rests, one-second clips, socket positions, contact height, shaders and source-generation commands **do not apply to organic v007**. The [Unity handoff](UNITY_DOGFIGHT_HANDOFF.md) documents current profile selection, rollback and the new development inspection mode.

## Coordinates and ownership

- One glTF unit is one metre. Runtime up is +Y; forward is -Z; right is +X.
- `DragonGameplayRoot` receives the flight position/orientation, with unit scale. Its origin remains the existing rig reference point, not the bounding-box centre.
- `DragonVisualMotion` adds presentation-only bank, roll and flap lift. The imported glTF stays below it with authored scale and rest transforms intact.
- The measured load-bearing talons reach Y = **-0.665026843547821 m** in the rest pose. A level placement puts the gameplay root **0.665026843547821 m above the contact plane**. The contact socket is metadata for inspection/landing alignment, not a new collision or flight constraint; no landing controller is introduced.
- Gameplay uses a fixed 3.3-metre sphere at the controller position; enemy-projectile padding remains one metre. Render mesh, wing pose, visual scale, LOD and texture changes never alter that shape.

## Attachments and animation

The existing `LoadingManager` and `GLTFLoader` in `main.js` load the manifest-listed versioned GLB. `assets/dragon-instance.js` creates the stable hierarchy, validates/resolves attachments and copies values into the controller; gameplay does not keep mesh references. The new asset's `attachmentContract: 1` requires all eight names. Retained older descriptors create explicit fallback points and report them in the inspection snapshot.

| Node | Rest point in model metres (X, Y, Z) | Parent / use |
| --- | --- | --- |
| `socket_muzzle` | `(0, 0.5, -3.66)` | Retained Root attachment; mouth glow/light, plasma and charged-beam origins share its current transform. |
| `socket_wing_l` | `(-4.9, 0.3, 0.4)` | `Wing_L`; moves with the left wing for future wing effects. |
| `socket_wing_r` | `(4.9, 0.3, 0.4)` | `Wing_R`; moves with the right wing for future wing effects. |
| `socket_thruster_l` | `(-0.52, 0.2, 1.25)` | `Root`; reserved left aft effect attachment. |
| `socket_thruster_r` | `(0.52, 0.2, 1.25)` | `Root`; reserved right aft effect attachment. |
| `socket_target` | `(0, 0, 0)` | `Root`; stable target-origin marker. |
| `socket_camera` | `(0, 0, 0)` | `Root`; chase-camera anchor retains the existing position. Camera tracking uses the gameplay frame, excluding visual roll/bob. |
| `socket_ground` | `(0, -0.665026843547821, 0)` | `Root`; measured talon contact plane. |

Points above are model-space rest locations, not the bones' local translations. `localAttachment(role)` and `worldAttachment(role)` resolve the current pose. Wing/thruster markers establish attachment locations; they do not introduce new automatic weapon or effect behavior.

`animation/dragon.js` accepts `(model, gltf.animations)`. Its real `AnimationMixer` selects **Boost** while boosting, otherwise **Glide** during a steady cadence segment, otherwise **Flight**. All three exported loops last one second and contain only two wing/five tail quaternion tracks. Exponential transitions have a 0.18-second response constant and preserve current weights when interrupted. Irregular stroke timing, amplitude and glide holds remain driven by the seeded visual cadence; they do not change flight speed or combat timing.

Bank and tail steering are additive presentation. Jaw pose remains directly tied to ordinary fire and the authoritative windup/beam timeline, so animation completion cannot cause damage. Imported Root, translation, scale and jaw channels are ignored. Missing named clips or individual channels use the procedural fallback. Normal pause advances neither clip time nor blend weights; reset restores the initial pose, and disposal releases mixer actions/bindings.

## Reproducible source and promotion

`tools/export_dragon_flight.py` is the **generation recipe for this candidate**, starting from the retained `Space Dragon Spacecraft-v003-game-v002.blend`; it is not a generic exporter of owner edits made later to v004. It writes a separate `Space Dragon Spacecraft-v004-flight.blend`, authors the clips/sockets, and exports their channels through Blender's glTF exporter. It merges those channels into the approved cinematic v002 GLB while preserving all original node transforms, skin data, geometry and image bytes. It writes `assets/game/local/spacecraft/space-dragon-spacecraft/flight-v003/dragon-flight-v003.glb` plus `export-receipt.json`. It does not alter the live Blender session or prior files.

Before regeneration, `tools/asset_output_guard.py` requires existing source/export/reference outputs to match their recorded hashes. Edited outputs or missing ownership receipts abort without overwriting them. There is no force flag. Preserve owner-edited v004 files and select fresh versioned source/export paths for the next candidate; do not bypass the guard or regenerate over those edits.

From the repo root, using the installed Blender executable:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python-exit-code 1 --python tools/export_dragon_flight.py -- --references
node tools/verify-dragon-flight.mjs assets/game/local/spacecraft/space-dragon-spacecraft/flight-v003/dragon-flight-v003.glb
node tools/verify-cinematic-dragon.mjs assets/game/local/spacecraft/space-dragon-spacecraft/flight-v003/dragon-flight-v003.glb
npx.cmd --no-install gltf-transform validate assets/game/local/spacecraft/space-dragon-spacecraft/flight-v003/dragon-flight-v003.glb
node tools/promote-dragon-flight.mjs
```

Review the receipt before promotion. `tools/promote-dragon-flight.mjs` verifies the candidate, refuses to overwrite a differing versioned target, copies it into `public/assets/dogfight/models/` and updates only its runtime manifest entry/rollback role. `ACTIVE_DRAGON = FLIGHT_DRAGON` selects the new candidate. Preserve the cinematic, red and organic descriptors/files for rollback. Never copy Blender sources, reference scenes or the original photos into runtime output.

## Inspection and renderer contract

The development-only `tools/dragon-inspector/index.html` uses the same loader, asset instance, materials and animation controller. It provides neutral studio and actual flight-environment views, front/side/three-quarter/head cameras, rest/flight/boost/fire/beam animation, socket markers and the contact plane. It is tooling, not another gameplay or save mode.

`tools/capture-dragon-pipeline.mjs` loads the Blender camera/light manifest and captures matching rest-pose browser views. Both sides use the same framing and model, while neutral Standard/no-tone-map and cinematic AgX/ACES are explicitly different color transforms. Blender area-light power converted to Three radiance is approximate; the comparison must describe remaining shading differences rather than imply pixel-identical renderers.

The game retains ACES exposure 1.1, one `OutputPass`, sRGB output, a 1.6 DPR cap, PMREM reflections and its local directional shadow. The audit found that canvas antialiasing alone did not antialias the composer's offscreen scene. The scene target now selects a supported RGBA16F sample count up to two; if the device offers no such count, it falls back to zero instead of selecting a higher-cost count. Report the selected request separately from an unmeasured driver allocation. Bloom's eleven full-screen targets do not require depth storage; the two scene targets retain depth.

`assets/render-audit.js` records actual CSS/drawing-buffer sizes, declared targets/formats/mips, lighting/shadows, color settings and complete-frame counters. Texture estimates deduplicate compatible shared uploads and include render-target/depth/MSAA estimates. They exclude driver overhead, allocation padding, the backbuffer and unreferenced caches; **they are not measured VRAM**. Frame intervals are not GPU timer-query results.

## Verification boundary

Inspect the real loader, material overrides, environment, shadows, effective framebuffer resolution/anti-aliasing and output color conversion before tuning them. Compare matched Blender/browser cameras and record remaining rendering differences. Report frame intervals, complete-frame calls/triangles and estimated texture allocations separately from actual GPU time/VRAM (unavailable without a hardware profiler). Preserve all failed checks and versioned rollback artifacts.
