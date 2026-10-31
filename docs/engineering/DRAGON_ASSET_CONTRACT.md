# Dragon asset contract

SD-060 — confirmed owner request, October 30, 2026; implemented and technically verified for the named local checks on October 31. [The receipt](../reports/2026-10-30-dragon-asset-pipeline.md) owns artifact identities, screenshots, measured results and remaining limits. This contract covers the existing Three.js Dogfight Lab, not an engine migration or campaign integration.

The gameplay controller remains authoritative for movement, orientation, health, collision, attack timing and saves. Blender supplies render geometry, materials, bone animation and attachment nodes. Animation cannot move the gameplay root or grant damage/rewards.

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
