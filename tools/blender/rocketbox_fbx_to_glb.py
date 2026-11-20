"""Convert one Microsoft Rocketbox FBX (avatar or animation clip) to GLB, unchanged.

Used once per file by the Luke's Playground hero intake; see
tools/prepare-playground-hero.mjs for the retargeting and texture steps.

    python rocketbox_fbx_to_glb.py <input.fbx> <output.glb> [--report <json>]

Runs with Blender's Python module (pip install bpy) or `blender -b -P`. The script only
parses the FBX with Blender's importer and writes a GLB with its exporter; it executes
nothing from the input folder and makes no edits to geometry, rig or animation.
"""
import json
import sys

import bpy


def main() -> None:
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    source, target = args[0], args[1]
    report_path = args[args.index("--report") + 1] if "--report" in args else None

    bpy.ops.wm.read_factory_settings(use_empty=True)
    for module in ("io_scene_fbx", "io_scene_gltf2"):
        try:
            bpy.ops.preferences.addon_enable(module=module)
        except Exception as error:  # noqa: BLE001 - report and continue; core add-ons may already be on.
            print("addon", module, error)

    bpy.ops.import_scene.fbx(
        filepath=source,
        use_anim=True,
        ignore_leaf_bones=False,
        automatic_bone_orientation=False,
        use_image_search=False,
    )

    report = {"source": source, "objects": [], "actions": [], "frame": [0, 0], "fps": 0}
    for obj in bpy.data.objects:
        entry = {
            "name": obj.name,
            "type": obj.type,
            "parent": obj.parent.name if obj.parent else None,
            "scale": [round(v, 6) for v in obj.scale],
            "location": [round(v, 6) for v in obj.location],
        }
        if obj.type == "MESH":
            mesh = obj.data
            entry["vertices"] = len(mesh.vertices)
            entry["polygons"] = len(mesh.polygons)
            entry["materials"] = [slot.material.name if slot.material else None for slot in obj.material_slots]
            entry["shapeKeys"] = len(mesh.shape_keys.key_blocks) if mesh.shape_keys else 0
            entry["dimensions"] = [round(v, 5) for v in obj.dimensions]
        if obj.type == "ARMATURE":
            entry["bones"] = len(obj.data.bones)
        report["objects"].append(entry)

    start, end = None, None
    for action in bpy.data.actions:
        first, last = action.frame_range
        report["actions"].append({"name": action.name, "range": [first, last]})
        start = first if start is None else min(start, first)
        end = last if end is None else max(end, last)
    scene = bpy.context.scene
    if start is not None:
        scene.frame_start = int(start)
        scene.frame_end = int(end)
    report["frame"] = [scene.frame_start, scene.frame_end]
    report["fps"] = scene.render.fps / scene.render.fps_base

    bpy.ops.export_scene.gltf(
        filepath=target,
        export_format="GLB",
        export_animations=True,
        export_skins=True,
        export_morph=True,
        export_yup=True,
        export_apply=False,
        export_force_sampling=True,
        export_optimize_animation_size=False,
        export_anim_single_armature=True,
        export_image_format="NONE",
        export_materials="EXPORT",
        export_def_bones=False,
        export_leaf_bone=False,
    )
    if report_path:
        with open(report_path, "w", encoding="utf-8") as handle:
            json.dump(report, handle, indent=1)
    print("CONVERT_OK", target)


main()
