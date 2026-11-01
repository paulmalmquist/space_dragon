# Violet v007 body bake helper

`bake_violet_dragon.py` is a file-only helper prepared for the sole Blender writer. Python syntax checking passes; Blender execution and material/export/player results require their own evidence. It installs nothing and does not start Blender, save a `.blend`, export or promote an asset.

Before using it:

1. Preserve earlier source versions, prepare a separate v007 working file and save it. Keep the editable source separate from a duplicated game mesh in **`Violet Dragon v007 - game candidate`**. The chosen mesh must be linked only to that collection.
2. Prepare the game mesh and its skinning, then unwrap an active UV atlas with non-overlapping islands inside 0–1. Allocate detail deliberately, especially for the head. The helper rejects missing/collapsed/out-of-range UVs and **aggregate eligible-face UV area below 0.01** (less than 1% of a unit atlas). It records face count, summed UV area and approximate pixel-area units (`area × resolution²`). This is not unique pixel coverage: overlapping faces can inflate the sum. It does **not** prove non-overlap or consistent texel density. The guard addresses the observed 0.000036-area failure; use face-selection mode and clear stale vertex/edge selections before selecting and repacking skin faces.
3. Bake in the intended rest/bind configuration. Keep all four passes on the same saved source, geometry, UVs, pose, materials and settings. A changed source/fingerprint requires a fresh output directory; do not edit a receipt to bypass the guard.
4. Use an output folder specific to this candidate and mesh. The default 2048 resolution is an initial bake setting, not an approved runtime texture budget. Samples default to 16 on CPU; inspect noise and measure the result before selecting final settings.

Inside the existing owner-controlled Blender session, load the helper module and call:

```python
import sys
sys.path.insert(0, r'C:\Projects\space_dragon\tools')
import bake_violet_dragon

args = [
    '--object', 'REPLACE_WITH_ACTUAL_GAME_MESH_NAME',
    '--output-dir', r'C:\Projects\space_dragon\assets\game\local\spacecraft\space-dragon-spacecraft\violet-v007\body-bakes',
    '--resolution', '2048', '--samples', '16', '--margin', '12',
]
bake_violet_dragon.main(args + ['--pass', 'base-color'])
```

Run the same call with `normal`, `roughness`, and `ao`, separately if needed. `all` performs all four and finalizes, but per-pass calls keep long operations bounded. A separate background invocation is possible with Blender's `--python ... -- ...` arguments only when the root has exclusive Blender ownership; this guide does not authorize a concurrent writer.

Each pass uses an isolated temporary copy of the target mesh and copied materials. The selected object's weights, modifiers and source shaders remain intact; the temporary copies are removed afterward. Other mesh objects are temporarily hidden from the bake and restored, so AO captures this candidate's self-occlusion, not studio floors or hidden source meshes. Base color uses Diffuse **Color only**, without lighting/AO. Tangent normal captures the current procedural bump on the game mesh; this is **not** a selected-to-active high-to-low bake. Roughness and AO remain separate images.

Materials whose names/roles identify membrane, iris/eye or mouth, plus emissive or transmissive materials, are excluded from body-atlas replacement. Their faces bake to a discarded separate image. `--preserve-material SUBSTRING` adds exclusions. These materials remain a separate glTF-parity task; no membrane scattering, eye emission or mouth-shader fidelity is implied.

For a separately combined membrane mesh, explicitly use `--include-material membrane`, a separate `wing-bakes` output folder, `--resolution 1024` and a unique `--material-name SD080_Violet_v007_Baked_Membrane`. Repeat that exact argument list for its four passes and finalize. This permits only matching membrane/transmissive roles into the atlas; eye/emissive/mouth and explicit preserve rules still win. The include/preserve settings are part of the recorded fingerprint. Body defaults remain unchanged. Save the prepared body and wing meshes together before either bake set; do not save a changing source between passes and expect the old fingerprint to remain valid.

The membrane atlas preserves baked color, tangent bump and roughness but deliberately approximates the source as **opaque, double-sided core PBR**. Subsurface scattering, transmission and sheen are not flattened into base color or claimed to survive. Inspect the wing result in Unity and document that approximation. The default body atlas remains 2048; both sizes are initial candidates subject to actual image/performance review.

After inspecting all four images:

```python
bake_violet_dragon.main(args + ['--pass', 'finalize'])
```

Finalize creates an explicit opaque, double-sided Principled material with sRGB base color, Non-Color tangent normal, and Non-Color ORM: **R = AO, G = roughness, B = zero metallic**. AO stays separate from base color and connects through the exporter's `glTF Material Output` group. The candidate mesh becomes single-user if it was shared; effective material assignments are transferred into **mesh DATA slots**, then eligible slots receive the atlas. Editable-source mesh/shader data and protected materials remain intact. This is deliberate: the actual v007 `export_apply` export ignored object-level overrides and initially exported old procedural materials. Do not restore object-only overrides or infer export parity from viewport appearance. Source subsurface, transmission, coat and sheen responses are not reproduced by this core atlas. Save the candidate explicitly after review; the helper never saves the scene.

`bake-receipt.json` records the actual source/fingerprint, Blender version, completed image bytes/SHA-256, settings and timings. Existing passes are reused only when both inputs and bytes match. An interrupted output without a successful receipt is preserved and requires a fresh directory. Finalization is intentionally guarded against rebuilding over an existing atlas material; reopening the preserved procedural candidate is the recovery path.

The UV allocation fields/guard were added after the successful v007 r3 bakes. Earlier receipts are preserved as evidence of the helper version that executed them; they are not backfilled or silently rewritten. The additional identity fields deliberately require a new output directory for future runs against older fingerprints.

Before export/promotion, inspect atlas seams and normal direction, verify special materials separately, save and reopen the candidate, validate the GLB and inspect the actual Unity material/animation result. Texture existence and syntax compilation are not that verification.

The [Blender bake API](https://docs.blender.org/api/current/bpy.ops.object.html#bpy.ops.object.bake) documents image-node targets and tangent-normal passes. The [Blender glTF material guide](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html#materials) documents the image/Principled and separate occlusion arrangement used here.
