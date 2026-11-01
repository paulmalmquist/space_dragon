"""Import and inspect the immutable Oscar Creativo FBX in a fresh background Blender.

Run with Blender --background --factory-startup --python this_file.py -- --help.
This first phase does not normalize, retarget, reduce, export or promote an asset.
Original geometry, UVs, weights, hierarchy, actions and imported materials survive.
Only explicit material copies, collection organization and inspection metadata are
added. No network calls or external processes are made by this helper.
"""

import argparse
import array
import datetime
import hashlib
import json
import math
from pathlib import Path
import re
import struct
import sys


SOURCE_SHA256 = "5995203e4c99d683be82ce7157f6e3e40341f56d8de46ba9578f6d47123d8ea4"
SOURCE_URL = "https://sketchfab.com/3d-models/free-dragon-character-3d-by-oscar-creativo-443971c0f42a49e5bedc0bfe2b544407"
CHANNELS = ("BaseColor", "Normal", "Metallic", "Roughness", "Emissive")


def file_hash(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def material_semantics(name):
    """Preserve author naming. Explicit families handle truncated tooth/eye filenames."""
    name = re.sub(r"\.\d{3}$", "", name)
    match = re.search(r"(10\d\d)", name)
    tile = int(match.group(1)) if match else None
    if name.startswith("CUERPO"):
        family = "CUERPO" if tile else None
    elif name.startswith("CUERNOS"):
        family = "CUERNOS"
    elif name.startswith("EYE_DRAGIO2"):
        family = "EYE_DRAGIO2"
    elif name.startswith("EYE_DRAGIO"):
        family = "EYE_DRAGIO1"
    elif name.startswith("DIENTES_ABAJO"):
        family = "DIENTES_ABAJO"
    elif name.startswith("DIENTES_ARRIBA"):
        family = "DIENTES_ARRIBA"
    elif name.startswith("LENGUA1"):
        family = "LENGUA1"
    else:
        family = None
    return {"family": family, "udimTile": tile, "presentation": name == "MI_taclb"}


def texture_candidates(texture_dir, name):
    semantics = material_semantics(name)
    files = sorted(p for p in Path(texture_dir).iterdir() if p.is_file())
    result = {}
    for channel in CHANNELS:
        if semantics["presentation"]:
            candidates = [p for p in files if p.name.startswith("Rocky_Sand_") and p.stem.endswith("_" + channel)]
        elif semantics["family"]:
            prefix = "DRAGON_FINAL_BAJA_" + semantics["family"] + "_" + channel
            candidates = [p for p in files if p.name.startswith(prefix)
                          and (semantics["family"] not in {"CUERPO", "CUERNOS"}
                               or p.name.endswith("." + str(semantics["udimTile"]) + ".png"))]
        else:
            candidates = []
        if len(candidates) > 1:
            raise ValueError("Ambiguous supplied map for " + name + " / " + channel)
        result[channel] = candidates[0] if candidates else None
    return semantics, result


def tile_offset(tile):
    return ((tile - 1001) % 10, (tile - 1001) // 10, 0) if tile is not None else (0, 0, 0)


def matrix_rows(matrix):
    return [[float(value) for value in row] for row in matrix]


def curves_of(action):
    """Blender 4.4+/5.x layered actions, with a legacy-action fallback."""
    seen = set()
    for layer in getattr(action, "layers", ()):
        for strip in layer.strips:
            # Same read-only slot lookup used by installed Blender 5.2 anim_utils.
            bags = [strip.channelbag(slot) for slot in action.slots] if hasattr(strip, "channelbag") else []
            for bag in (bag for bag in bags if bag is not None):
                for curve in bag.fcurves:
                    pointer = curve.as_pointer()
                    if pointer not in seen:
                        seen.add(pointer)
                        yield curve
    if not seen:
        for curve in getattr(action, "fcurves", ()):
            yield curve


def action_report(action):
    channels = []
    for curve in curves_of(action):
        points = curve.keyframe_points
        raw = array.array("f", [0]) * (len(points) * 2)
        points.foreach_get("co", raw)
        channels.append({"dataPath": curve.data_path, "arrayIndex": curve.array_index,
                         "keys": len(points), "frameRange": [min(raw[::2]), max(raw[::2])] if raw else None,
                         "valueRange": [min(raw[1::2]), max(raw[1::2])] if raw else None,
                         "keyCoordinatesSha256": hashlib.sha256(raw.tobytes()).hexdigest()})
    return {"name": action.name, "frameRange": list(action.frame_range), "channels": channels,
            "slots": [{"identifier": slot.identifier, "targetIdType": slot.target_id_type}
                      for slot in getattr(action, "slots", ())]}


def mesh_signature(obj):
    """Material slots are intentionally excluded; geometry, UVs and skin data are not."""
    mesh = obj.data
    digest = hashlib.sha256()
    for collection, attribute, count, kind in [
        (mesh.vertices, "co", len(mesh.vertices) * 3, "f"),
        (mesh.loops, "vertex_index", len(mesh.loops), "i"),
        (mesh.polygons, "loop_total", len(mesh.polygons), "i"),
    ]:
        values = array.array(kind, [0]) * count
        collection.foreach_get(attribute, values)
        digest.update(values.tobytes())
    for layer in mesh.uv_layers:
        digest.update(layer.name.encode())
        values = array.array("f", [0]) * (len(layer.data) * 2)
        layer.data.foreach_get("uv", values)
        digest.update(values.tobytes())
    for group in obj.vertex_groups:
        digest.update(group.name.encode())
    for vertex in mesh.vertices:
        for group in vertex.groups:
            digest.update(struct.pack("<iif", vertex.index, group.group, group.weight))
    return digest.hexdigest()


def rig_report(rig, meshes):
    weights = {}
    influence_counts = {}
    for obj in meshes:
        if not any(mod.type == "ARMATURE" and mod.object == rig for mod in obj.modifiers):
            continue
        groups = {group.index: group.name for group in obj.vertex_groups}
        for vertex in obj.data.vertices:
            positive = 0
            for assignment in vertex.groups:
                name = groups[assignment.group]
                if assignment.weight > 1e-8 and name in rig.data.bones:
                    weights[name] = weights.get(name, 0) + 1
                    positive += 1
            influence_counts[positive] = influence_counts.get(positive, 0) + 1
    bones = [{"name": bone.name, "parent": bone.parent.name if bone.parent else None,
              "useDeform": bone.use_deform, "headLocal": list(bone.head_local), "tailLocal": list(bone.tail_local),
              "matrixLocal": matrix_rows(bone.matrix_local), "positiveWeightEntries": weights.get(bone.name, 0)}
             for bone in rig.data.bones]
    needed = set(weights)
    for name in list(needed):
        bone = rig.data.bones[name].parent
        while bone:
            needed.add(bone.name)
            bone = bone.parent
    return {"name": rig.name, "matrixWorld": matrix_rows(rig.matrix_world), "bones": bones,
            "weightedBones": sorted(weights), "weightedBonesAndAncestors": sorted(needed),
            "vertexInfluenceHistogram": influence_counts,
            "activeAction": rig.animation_data.action.name if rig.animation_data and rig.animation_data.action else None,
            "posePosition": rig.data.pose_position,
            "importedConstraints": sum(len(b.constraints) for b in rig.pose.bones),
            "scope": "No bones pruned. Weighted control-named bones and ancestors remain intact."}


def bounds_for(bpy, meshes):
    graph = bpy.context.evaluated_depsgraph_get()
    total_min, total_max, entries = [math.inf] * 3, [-math.inf] * 3, []
    for obj in meshes:
        evaluated = obj.evaluated_get(graph)
        mesh = evaluated.to_mesh(preserve_all_data_layers=False, depsgraph=graph)
        try:
            low, high = [math.inf] * 3, [-math.inf] * 3
            for vertex in mesh.vertices:
                point = evaluated.matrix_world @ vertex.co
                for axis in range(3):
                    if not math.isfinite(point[axis]):
                        raise ValueError("Nonfinite evaluated position: " + obj.name)
                    low[axis] = min(low[axis], point[axis])
                    high[axis] = max(high[axis], point[axis])
            mesh.calc_loop_triangles()
            entries.append({"object": obj.name, "min": low, "max": high,
                            "vertices": len(mesh.vertices), "triangles": len(mesh.loop_triangles)})
            for axis in range(3):
                total_min[axis] = min(total_min[axis], low[axis])
                total_max[axis] = max(total_max[axis], high[axis])
        finally:
            evaluated.to_mesh_clear()
    return {"min": total_min, "max": total_max,
            "size": [total_max[i] - total_min[i] for i in range(3)], "objects": entries}


def material_usage(meshes):
    usage = {}
    for obj in meshes:
        uv = obj.data.uv_layers.active
        for index, slot in enumerate(obj.material_slots):
            if not slot.material:
                continue
            tiles = set()
            if uv:
                for polygon in obj.data.polygons:
                    if polygon.material_index == index:
                        for loop in polygon.loop_indices:
                            xy = uv.data[loop].uv
                            tiles.add(1001 + math.floor(xy.x) + 10 * math.floor(xy.y))
            usage.setdefault(slot.material, []).append({"object": obj.name, "slot": index,
                                                        "activeUv": uv.name if uv else None, "observedTiles": sorted(tiles)})
    return usage


def input_socket(node, *names):
    for name in names:
        if node.inputs.get(name) is not None:
            return node.inputs[name]
    raise RuntimeError("Required Principled input unavailable: " + "/".join(names))


def remap_material(bpy, original, usage, texture_dir, loaded_images, pack):
    semantics, maps = texture_candidates(texture_dir, original.name)
    original.use_fake_user = True
    material = original.copy()
    material.name = "Oscar baseline - " + original.name
    material["sourceMaterialName"] = original.name
    material["intakeStatus"] = "Explicit supplied texture remap; appearance unreviewed"
    material.use_nodes = True
    nodes, links = material.node_tree.nodes, material.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    output.location = (740, 0)
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader.location = (430, 0)
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    # Documented neutral constants are placeholders for absent channels, not art.
    base = list(original.diffuse_color)
    input_socket(shader, "Base Color").default_value = base
    input_socket(shader, "Metallic").default_value = 0.0
    input_socket(shader, "Roughness").default_value = 0.6
    input_socket(shader, "Alpha").default_value = 1.0
    input_socket(shader, "Emission Color", "Emission").default_value = (0, 0, 0, 1)
    strength = shader.inputs.get("Emission Strength")
    if strength is not None:
        strength.default_value = 1.0 if maps["Emissive"] else 0.0
    uv = nodes.new("ShaderNodeTexCoord")
    uv.location = (-850, 50)
    subtract = nodes.new("ShaderNodeVectorMath")
    subtract.operation = "SUBTRACT"
    subtract.inputs[1].default_value = tile_offset(semantics["udimTile"])
    subtract.location = (-640, 50)
    links.new(uv.outputs["UV"], subtract.inputs[0])
    report = {"sourceMaterial": original.name, "newMaterial": material.name, "usage": usage,
              "semantics": semantics, "uvShaderOffset": list(tile_offset(semantics["udimTile"])),
              "meshUvDataChanged": False, "maps": {}, "fallbacks": {}, "reviewNotes": []}
    if semantics["udimTile"] and any(item["observedTiles"] != [semantics["udimTile"]] for item in usage):
        raise RuntimeError("Material tile does not match actual mesh UVs: " + original.name)
    for index, channel in enumerate(CHANNELS):
        path = maps[channel]
        if path is None:
            fallback = {"BaseColor": base, "Normal": "Unmodified mesh normal; no normal map",
                        "Metallic": 0.0, "Roughness": 0.6, "Emissive": [0, 0, 0]}[channel]
            report["fallbacks"][channel] = {"value": fallback, "reason": "No uniquely mapped supplied file"}
            continue
        path = path.resolve()
        color_space = "sRGB" if channel in {"BaseColor", "Emissive"} else "Non-Color"
        key = (str(path), color_space)
        if key not in loaded_images:
            image = bpy.data.images.load(str(path), check_existing=False)
            image.colorspace_settings.name = color_space
            if not image.size[0] or not image.size[1]:
                raise RuntimeError("Image failed to load: " + str(path))
            if pack:
                image.pack()
            loaded_images[key] = image
        image = loaded_images[key]
        texture = nodes.new("ShaderNodeTexImage")
        texture.label = channel + " / supplied original"
        texture.image = image
        texture.extension = "REPEAT" if semantics["presentation"] else "EXTEND"
        texture.location = (-360, 250 - 230 * index)
        links.new(subtract.outputs["Vector"], texture.inputs["Vector"])
        if channel == "Normal":
            normal = nodes.new("ShaderNodeNormalMap")
            normal.space = "TANGENT"
            normal.inputs["Strength"].default_value = 1.0
            normal.location = (160, -270)
            links.new(texture.outputs["Color"], normal.inputs["Color"])
            links.new(normal.outputs["Normal"], input_socket(shader, "Normal"))
            report["reviewNotes"].append("Tangent normal uses supplied RGB without green-channel flip; handedness requires visual review.")
        else:
            socket = {"BaseColor": ("Base Color",), "Metallic": ("Metallic",), "Roughness": ("Roughness",),
                      "Emissive": ("Emission Color", "Emission")}[channel]
            links.new(texture.outputs["Color"], input_socket(shader, *socket))
        report["maps"][channel] = {"path": str(path), "sha256": file_hash(path), "bytes": path.stat().st_size,
                                   "image": image.name, "size": list(image.size), "colorSpace": color_space,
                                   "packed": image.packed_file is not None}
    report["reviewNotes"].append("Emission remains separate from bloom. Opaque baseline; no unrequested transparency or art recolor.")
    return material, report


def parse_args(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-fbx", type=Path, required=True)
    parser.add_argument("--textures", type=Path)
    parser.add_argument("--output", type=Path, required=True, help="Fresh versioned .blend master; existing files are refused")
    parser.add_argument("--report", type=Path, required=True, help="Fresh JSON measurement receipt")
    parser.add_argument("--expected-sha256", default=SOURCE_SHA256)
    parser.add_argument("--pack-textures", action="store_true", help="Pack only explicitly remapped images into the new master")
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv if argv is not None else sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    source, output, receipt_path = args.source_fbx.resolve(), args.output.resolve(), args.report.resolve()
    texture_dir = (args.textures or source.parent.parent / "textures").resolve()
    if output.exists() or receipt_path.exists():
        raise FileExistsError("Preserve the previous master/receipt. Choose fresh versioned output and report paths.")
    if output.suffix.lower() != ".blend" or receipt_path.suffix.lower() != ".json":
        raise ValueError("Output must be .blend and report must be .json")
    if not source.is_file() or not texture_dir.is_dir():
        raise FileNotFoundError("Source FBX and texture folder are both required")
    source_hash = file_hash(source)
    if source_hash != args.expected_sha256:
        raise ValueError("Source hash differs from the explicitly selected immutable FBX")
    import bpy
    if not bpy.app.background or bpy.data.filepath:
        raise RuntimeError("Run only in fresh background Blender with --factory-startup. Do not run against a live/open master.")
    report = {"schemaVersion": 1, "result": "RUNNING", "startedAtUtc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
              "blenderVersion": bpy.app.version_string, "sourceFbx": str(source), "sourceSha256": source_hash,
              "sourceBytes": source.stat().st_size, "textureDirectory": str(texture_dir), "output": str(output),
              "scope": "IMPORT + INSPECT ONLY. No normalization, retargeting, mesh/bone reduction, export or game promotion.",
              "provenance": {"creator": "OSCAR CREATIVO", "source": SOURCE_URL,
                             "license": "https://creativecommons.org/licenses/by/4.0/", "licenseSnapshotStoredSeparately": True},
              "preservedExistingScenes": [scene.name for scene in bpy.data.scenes]}
    try:
        scene = bpy.data.scenes.new("Oscar Dragon - Imported Baseline")
        if bpy.context.window is None:
            raise RuntimeError("Background Blender has no window context for isolated scene import")
        bpy.context.window.scene = scene
        source_collection = bpy.data.collections.new("Oscar Dragon - Preserved Imported Baseline")
        scene.collection.children.link(source_collection)
        bpy.context.view_layer.active_layer_collection = bpy.context.view_layer.layer_collection.children[source_collection.name]
        before_objects, before_actions = set(bpy.data.objects), set(bpy.data.actions)
        options = {"filepath": str(source), "use_manual_orientation": False, "global_scale": 1.0,
                   "bake_space_transform": False, "use_custom_normals": True, "use_image_search": False,
                   "use_anim": True, "anim_offset": 0.0, "ignore_leaf_bones": False,
                   "force_connect_children": False, "automatic_bone_orientation": False,
                   "use_custom_props": True, "use_subsurf": False}
        bpy.ops.import_scene.fbx(**options)
        imported = sorted(set(bpy.data.objects) - before_objects, key=lambda obj: obj.name)
        actions = sorted(set(bpy.data.actions) - before_actions, key=lambda action: action.name)
        meshes = [obj for obj in imported if obj.type == "MESH"]
        rigs = [obj for obj in imported if obj.type == "ARMATURE"]
        if not meshes or not rigs:
            raise RuntimeError("Import did not produce both meshes and an armature")
        report["importOptions"] = options
        report["sceneUnits"] = {"system": scene.unit_settings.system, "scaleLength": scene.unit_settings.scale_length,
                                "lengthUnit": scene.unit_settings.length_unit, "fps": scene.render.fps,
                                "fpsBase": scene.render.fps_base,
                                "interpretation": "Imported Blender-space units and source transforms are measured, not normalized to gameplay metres."}
        original_frame, original_subframe = scene.frame_current, scene.frame_subframe
        scene.frame_set(original_frame, subframe=original_subframe)
        bpy.context.view_layer.update()
        signatures_before = {obj.name: mesh_signature(obj) for obj in meshes}
        rig_before = [rig_report(rig, meshes) for rig in rigs]
        actions_before = [action_report(action) for action in actions]
        if not actions_before or not any(action["channels"] for action in actions_before):
            raise RuntimeError("The selected animated source imported no readable action channels")
        report["rigs"] = rig_before
        report["actions"] = actions_before
        report["objects"] = [{"name": obj.name, "type": obj.type, "parent": obj.parent.name if obj.parent else None,
                              "parentType": obj.parent_type, "parentBone": obj.parent_bone,
                              "matrixWorld": matrix_rows(obj.matrix_world), "matrixLocal": matrix_rows(obj.matrix_local),
                              "modifiers": [{"name": mod.name, "type": mod.type} for mod in obj.modifiers]}
                             for obj in imported]
        report["initialPoseBounds"] = bounds_for(bpy, meshes)
        report["sourceGeometryComparison"] = {
            "verifiedFbxVertices": 114029, "verifiedFbxTriangles": 224407, "verifiedFbxMeshes": 27,
            "importedVertices": sum(len(obj.data.vertices) for obj in meshes),
            "importedEvaluatedTriangles": sum(item["triangles"] for item in report["initialPoseBounds"]["objects"]),
            "importedMeshes": len(meshes),
            "scope": "Recorded comparison for the pinned source; imported topology is not silently repaired or reduced."}
        pose_modes = {rig: rig.data.pose_position for rig in rigs}
        try:
            for rig in rigs:
                rig.data.pose_position = "REST"
            bpy.context.view_layer.update()
            report["restBoundsWithAllMeshes"] = bounds_for(bpy, meshes)
        finally:
            for rig, mode in pose_modes.items():
                rig.data.pose_position = mode
            bpy.context.view_layer.update()
        frame_ranges = [a["frameRange"] for a in actions_before if a["channels"]]
        if frame_ranges:
            start, end = min(f[0] for f in frame_ranges), max(f[1] for f in frame_ranges)
            frames = sorted({start, start + (end - start) * .25, (start + end) * .5, start + (end - start) * .75, end})
            samples = []
            try:
                for frame in frames:
                    scene.frame_set(math.floor(frame), subframe=frame - math.floor(frame))
                    samples.append({"frame": frame, "seconds": frame * scene.render.fps_base / scene.render.fps,
                                    "bounds": bounds_for(bpy, meshes)})
            finally:
                scene.frame_set(original_frame, subframe=original_subframe)
            report["poseFrameBounds"] = samples
        usage = material_usage(meshes)
        loaded_images, replacements, material_reports = {}, {}, []
        for original, users in sorted(usage.items(), key=lambda item: item[0].name):
            replacement, material_record = remap_material(bpy, original, users, texture_dir, loaded_images, args.pack_textures)
            replacements[original] = replacement
            material_reports.append(material_record)
        for obj in meshes:
            for slot in obj.material_slots:
                if slot.material in replacements:
                    slot.material = replacements[slot.material]
        report["materialRemaps"] = material_reports
        report["originalMaterialsPreservedWithFakeUser"] = sorted(material.name for material in replacements)
        # Keep suspected presentation scenery recoverable until actual review.
        # Exact object + original material signature prevents guessing by silhouette.
        presentation = [obj for obj in meshes if obj.name == "taclb_tier_1"
                        and any(slot.material and slot.material.get("sourceMaterialName") == "MI_taclb" for slot in obj.material_slots)]
        presentation_collection = bpy.data.collections.new("Oscar Dragon - Presentation Candidate (review before export)")
        scene.collection.children.link(presentation_collection)
        for obj in presentation:
            for collection in list(obj.users_collection):
                collection.objects.unlink(obj)
            presentation_collection.objects.link(obj)
            obj.hide_set(True)
            obj.hide_render = True
            obj["intakeClassification"] = "Suspected supplied presentation prop; retained; visual confirmation pending"
        report["presentationCandidates"] = {"objects": [obj.name for obj in presentation], "deleted": False,
                                            "hiddenForInspection": True, "exportExclusionApproved": False}
        report["dragonCandidateBoundsAtInitialFrame"] = bounds_for(bpy, [obj for obj in meshes if obj not in presentation])
        report["preservation"] = {"meshGeometryUvSkinIdentical": signatures_before == {obj.name: mesh_signature(obj) for obj in meshes},
                                  "boneRestAndWeightsIdentical": rig_before == [rig_report(rig, meshes) for rig in rigs],
                                  "animationChannelsIdentical": actions_before == [action_report(action) for action in actions],
                                  "sourceFbxUnchanged": file_hash(source) == source_hash}
        if not all(report["preservation"].values()):
            raise RuntimeError("Import inspection changed protected geometry, rig, animation or source data")
        report["limitations"] = ["No visual/pose review or gameplay integration performed by this helper.",
                                 "Imported FBX constraints may differ from the artist's editable authoring rig.",
                                 "Texture normal handedness, eye response, missing channels and presentation prop require visual review.",
                                 "No change to source proportions, root transforms, collision dimensions or runtime budgets has been selected."]
        scene["intakeSourceSha256"] = source_hash
        scene["intakeScope"] = report["scope"]
        output.parent.mkdir(parents=True, exist_ok=True)
        if output.exists():
            raise FileExistsError("Output appeared during import; refusing to overwrite another writer")
        bpy.ops.wm.save_as_mainfile(filepath=str(output), check_existing=False, relative_remap=False, compress=False)
        report["outputBytes"] = output.stat().st_size
        report["outputSha256"] = file_hash(output)
        report["result"] = "IMPORTED_AND_STRUCTURALLY_INSPECTED"
    except Exception as error:
        report["result"] = "FAILED"
        report["error"] = type(error).__name__ + ": " + str(error)
        raise
    finally:
        report["finishedAtUtc"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        receipt_path.parent.mkdir(parents=True, exist_ok=True)
        with receipt_path.open("x", encoding="utf8", newline="\n") as stream:
            json.dump(report, stream, indent=2)
            stream.write("\n")
        print(json.dumps({"result": report["result"], "report": str(receipt_path), "output": str(output)}))


if __name__ == "__main__":
    main()
