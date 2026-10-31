# Blender to browser

The first asset milestone is one reviewed model that loads correctly in the actual browser scene. A polished pod or dragon component is a useful candidate; a Lyla pilot character remains the existing character-handoff proposal. This setup does not claim that any final model or rig exists.

## Work locations

Seele also supplies prototype games, starting with dragon dogfighting. [The prototype integration plan](engineering/PROTOTYPE_INTEGRATION.md) and [Seele intake](../seeles-assets/README.md) extend this asset process to source code, controls and mechanics. Keep raw deliveries separate, choose a bounded migration after inspection, and promote reviewed assets through the same source/export/runtime boundaries below.

The existing local `assets/reference/seele/` delivery path is ignored as raw intake, alongside the canonical `seeles-assets/incoming/` drop folder. Preserve files in place while delivery/inspection is ongoing; source references do not become runtime assets or committed dependencies merely by being in the workspace.

Use [assets/source/](../assets/source/README.md) for editable sources, [assets/game/](../assets/game/README.md) for exports, and [assets/reference/](../assets/README.md) for references. New unpublished media starts in the ignored `local/` subfolders described there. These paths replace the uncreated `art/` layout proposed in the earlier Blender handoff. The existing family-photo directory and verification manifest stay where they are.

Store a short receipt beside each candidate: stable asset ID, source `.blend` version, reference IDs, author/license or publication decision, Blender/exporter versions, design-review status, export settings, validation result, and browser-review evidence. A receipt can begin as a few lines; agents maintain the technical details.

## Repeatable production loop

1. Review shape and scale in neutral light, using multiple views. Distinguish proposed design from approved design.
2. Save a versioned editable source before changing the scene. Work in meters with an explicit scale comparison. Keep export collections separate from reference boards, review lights, cameras, and unused experiments.
3. Name meshes, pivots, joints, and clips deliberately. Export only the intended collection to a fresh GLB. glTF uses its own coordinate conventions; review the exported orientation in the browser rather than adding an unexplained second axis conversion.
4. Inventory and validate the original export with the commands below. Resolve missing textures and unexpected extensions before optimizing.
5. Create a separate optimized candidate. Choose transformations for this asset's needs. Compare node names, hierarchy, clips, material appearance, file size, and load behavior before and after.
6. Review in Babylon: scale, camera distances, materials, transparency, normals, shadows, animation transitions, interaction pivots, and assembly states. Save browser screenshots and measured results with the asset receipt.

Blender's exporter supports recognized glTF materials and animations rather than every Blender shader or simulation. Bake or re-create unsupported effects deliberately and compare the result. The [Blender glTF development manual](https://docs.blender.org/manual/en/dev/addons/scene_gltf2.html) describes current export behavior; inspect the installed Blender version's options during the first real export because development documentation can include newer features.

## Commands

From the repository root, with project dependencies installed:

```powershell
node tools/asset-inspect.mjs assets/game/local/props/pod/pod-v001.glb
npx --no-install gltf-transform inspect assets/game/local/props/pod/pod-v001.glb
npx --no-install gltf-transform validate assets/game/local/props/pod/pod-v001.glb
```

`asset-inspect.mjs` prints file size, SHA-256, declared nodes/components, mesh definitions, materials, textures, clips, and required extensions. It rejects malformed GLB headers and chunks and never rewrites the input. It is a structural inventory, not a full glTF validator or renderer. Reported triangle counts describe mesh definitions, so instancing can produce a different rendering workload.

glTF Transform's [CLI reference](https://gltf-transform.dev/cli) describes `inspect` and `validate`. A successful validation result establishes format conformance, not visual quality or a performance budget.

Texture compression can be evaluated later with glTF Transform and Khronos KTX tools:

```powershell
npx --no-install gltf-transform uastc --help
npx --no-install gltf-transform etc1s --help
```

Use fresh output filenames, preserve the original, and compare normal maps, roughness, alpha edges, faces, decals, and emissive details in the actual browser. [Khronos' artist guide](https://github.com/KhronosGroup/3D-Formats-Guidelines/blob/main/subpages/KTXArtistGuide_glTF-Transform.md) explains the quality and size tradeoffs. Test the required browser decoder path before accepting compressed assets.

## Dragon component contract

The family recovers separate parts of an existing dragon design. The asset hierarchy must support that story and its eventual assembly sequence. Suggested technical names reserve clear meaning without approving the final dragon design:

| Example node | Intended role |
| --- | --- |
| `dragon_root` | Entire assembled dragon transform. |
| `component_spine`, `component_wing_left`, `component_wing_right` | Independently recoverable or revealable sections, if adopted in the design. |
| `hinge_wing_left`, `hinge_wing_right` | Articulation pivots at reviewed attachment points. |
| `socket_component_<id>` | Attach/dock location with known orientation. |
| `cockpit_entry`, `seat_paul` | Runtime placement markers if the interior is in scope. |

Keep gameplay-relevant parts independently addressable and preserve transforms, names, sockets, and animation channels across optimization. Avoid indiscriminate mesh joining, flattening, pruning, or instance conversion. Explicitly compare required node IDs after every optimization. Module-to-location assignments, the final component count, dragon layout, and cockpit design remain open creative decisions.

## Quality and measurements

Record file/download size, loaded geometry/material counts, texture dimensions, load duration, frame timing, and device/browser for a representative view. Define budgets after testing the first asset on named target devices. The current desktop's integrated GPU is useful for an early compatibility check, not proof of mobile performance or final AAA fidelity.

Keep original exported geometry and optimized candidates until the browser comparison passes. A passing format validator, screenshot, or successful file load alone is not a finished animation or performance milestone. No asset is deployed by this pipeline.


## Mechanical spacecraft game candidate — SD-049

**Current runtime pipeline — SD-060:** [the dragon contract](engineering/DRAGON_ASSET_CONTRACT.md) specifies metre scale, +Y up/-Z forward, preserved origin, measured talon contact, independent gameplay sphere, eight named attachments and blended Blender clips. `tools/export_dragon_flight.py` writes a new `Space Dragon Spacecraft-v004-flight.blend` and `flight-v003/dragon-flight-v003.glb` without rebaking or changing the approved geometry/skin/maps. `tools/verify-dragon-flight.mjs` checks byte preservation, nodes, sockets and clips; `tools/promote-dragon-flight.mjs` refuses differing version overwrites and updates the explicit runtime manifest. The active `FLIGHT_DRAGON` retains cinematic/red/organic rollback. [The receipt](reports/2026-10-30-dragon-asset-pipeline.md) records final export, actual renderer/animation checks, matching Blender/browser screenshots and measured optimization. Sources and reference images remain outside the game build.

**Later bounded redesign — SD-059:** [the cinematic benchmark](decisions/2026-10-30-cinematic-dragon-benchmark.md) authorizes new gunmetal/crimson head, neck and one-shoulder geometry/materials. It supersedes the all-red/no-redesign limit for that new candidate only. Preserve the blue source, red derivative and old runtime files; use separate original, upgrade and optimized-game collections in a new versioned source. Measure source/export and gameplay camera first; show primary-form views before detail; author UVs and glTF material channels with separate normal/AO, then inspect the actual game before extending the body. [New evidence](reports/2026-10-30-cinematic-dragon-benchmark.md) must identify its own artifacts and checks; the historical baseline below is not new-asset verification.

The local verified SD-059 candidate is now `dragon-cinematic-benchmark-v002.glb` (9,642,948 bytes, 81,991 triangles, two 1024-square baked data maps). Its receipt records the source/game versions, explicit tangent correction, separate AO, all 706 preserved component pivots, unchanged nine-bone rest/bind contract and actual game checks. `tools/review-dragon.mjs` creates reproducible original/candidate browser views and a local gallery. The short native sample and passing scoped checks do not close the broader Town route failure or grant human art/release approval.

The owner has explicitly authorized [local integration of Space Dragon Spacecraft v002](decisions/2026-10-30-mechanical-dragon-integration.md) without redesign. The [source-art receipt](reports/2026-10-30-mechanical-dragon.md) remains source-only evidence; the [integration receipt](reports/2026-10-30-mechanical-dragon-integration.md) owns export/browser results. Keep the v002 source and previous `dragon.glb` unchanged. Export a new versioned GLB through a separate optimized candidate, excluding hidden organic recovery meshes and the review studio. Compare all nine rig bones/rest transforms and required component names/pivots explicitly before promotion. The later [SD-050 red palette override](decisions/2026-10-30-red-mechanical-dragon.md) changes the game candidate to red/crimson finishes with retained orange emission; keep the supplied blue v002 source unchanged. The earlier organic treatment must not recolor the candidate. Actual muzzle placement, articulation, camera, material and runtime-cost checks are required. Local runtime integration does not grant deployment or final art approval.


For Town Drive, [SD-052](decisions/2026-10-30-town-drive-detail-override.md) removes the earlier privacy/publication restriction. The supplied video-derived layout, geometry and textures may be promoted into tracked runtime assets without another approval gate.


## Sound-bank pipeline — SD-056

Full sound banks live in ignored `assets/source/local/audio/<collection>/`; tracked catalogs, cue provenance and processing recipes live in [assets/source/audio/](../assets/source/audio/README.md). The five [Sonniss GDC 2026 banks](../assets/source/audio/sonniss-gdc-2026/README.md) are filed intact. Promote only selected edited cues to `public/assets/audio/<collection>/` with hashes in the runtime manifest. Preserve licenses and original names/bytes; never package the raw bank as a game asset. Audio load failure must fall back safely without replaying old events or changing game state. Human listening review is separate from decoding/hash checks.
