"""Prepare a separate measured Oscar game candidate; execute only by the Blender owner.

Open the immutable imported master, then --python this_file.py -- --output NEW.blend
--report NEW.json --texture-output NEW_DIRECTORY. No export/promotion/network calls.
"""
import argparse
import array
import hashlib
import json
import math
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from oscar_dragon_intake import (file_hash, texture_candidates, tile_offset, input_socket,
                                mesh_signature, rig_report, action_report, matrix_rows, bounds_for)

COLLECTION = "Oscar Dragon - Game Candidate v001"
RIG = "OscarGameRig"
ROOT = "OscarAssetRoot"


def set_frame(scene, frame):
    scene.frame_set(math.floor(frame), subframe=frame - math.floor(frame))


def new_action(bpy, rig, name, samples, times):
    from bpy_extras.anim_utils import action_ensure_channelbag_for_slot
    if bpy.data.actions.get(name):
        raise RuntimeError("Preserve existing action and choose a fresh candidate: " + name)
    action = bpy.data.actions.new(name)
    slot = action.slots.new("OBJECT", "OscarGameRig")
    bag = action_ensure_channelbag_for_slot(action, slot)
    for bone_name in samples[0]:
        for path, length, offset in [("location", 3, 0), ("rotation_quaternion", 4, 3), ("scale", 3, 7)]:
            data_path = rig.pose.bones[bone_name].path_from_id(path)
            for component in range(length):
                curve = bag.fcurves.new(data_path, index=component, group_name=bone_name)
                curve.keyframe_points.add(len(times))
                co = array.array("f", (number for index, time in enumerate(times)
                                      for number in (time, samples[index][bone_name][offset + component])))
                curve.keyframe_points.foreach_set("co", co)
                for point in curve.keyframe_points:
                    point.interpolation = "LINEAR"
                curve.update()
    action.use_fake_user = True
    return action


def assign(rig, action):
    rig.animation_data_create()
    rig.animation_data.action = action
    rig.animation_data.action_slot = action.slots[0]


def positions(bpy, obj):
    import numpy as np
    graph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(graph)
    mesh = evaluated.to_mesh(preserve_all_data_layers=False, depsgraph=graph)
    try:
        coordinates = np.empty(len(mesh.vertices) * 3, dtype=np.float32)
        mesh.vertices.foreach_get("co", coordinates)
        coordinates = coordinates.reshape((-1, 3))
        world = np.array(evaluated.matrix_world, dtype=np.float64)
        return coordinates @ world[:3, :3].T + world[:3, 3]
    finally:
        evaluated.to_mesh_clear()


def compare_deformation(bpy, scene, pairs, normalization, frames):
    import numpy as np
    matrix = np.array(normalization, dtype=np.float64)
    results = []
    for frame in frames:
        set_frame(scene, frame)
        maximum, squared, count, chunks, per_mesh = 0.0, 0.0, 0, [], []
        for source, candidate in pairs:
            reference = positions(bpy, source)
            reference = reference @ matrix[:3, :3].T + matrix[:3, 3]
            actual = positions(bpy, candidate)
            if reference.shape != actual.shape:
                raise RuntimeError("Topology changed during deformation comparison: " + source.name)
            errors = np.linalg.norm(reference - actual, axis=1)
            maximum = max(maximum, float(errors.max(initial=0)))
            squared += float(np.sum(errors * errors))
            count += len(errors)
            chunks.append(errors)
            per_mesh.append({"mesh": source.name, "maxMetres": float(errors.max(initial=0)),
                             "p95Metres": float(np.percentile(errors, 95)),
                             "rmsMetres": float(np.sqrt(np.mean(errors * errors)))})
        all_errors = np.concatenate(chunks)
        results.append({"sourceFrame": frame, "verticesCompared": count,
                        "maxMetres": maximum, "rmsMetres": math.sqrt(squared / count),
                        "p95Metres": float(np.percentile(all_errors, 95)),
                        "p99Metres": float(np.percentile(all_errors, 99)),
                        "worstMesh": max(per_mesh, key=lambda row: row["maxMetres"])["mesh"], "perMesh": per_mesh})
    return results


def prepare_weights(meshes, bones, limit=0):
    trimmed, maximum, minimum_retained_sum = 0, 0, 1.0
    candidate_maximum, max_source_sum_error = 0, 0.0
    for obj in meshes:
        groups = {group.index: group for group in obj.vertex_groups}
        for vertex in obj.data.vertices:
            weights = [(assignment.group, assignment.weight) for assignment in vertex.groups
                       if assignment.weight > 0 and groups[assignment.group].name in bones]
            weights.sort(key=lambda pair: (-pair[1], pair[0]))
            maximum = max(maximum, len(weights))
            if not weights:
                raise RuntimeError("Unweighted candidate vertex: " + obj.name + ":" + str(vertex.index))
            selected = weights[:limit] if limit else weights
            total = sum(weight for _, weight in selected)
            original_total = sum(weight for _, weight in weights)
            max_source_sum_error = max(max_source_sum_error, abs(original_total - 1))
            minimum_retained_sum = min(minimum_retained_sum, total / original_total)
            trimmed += len(selected) < len(weights)
            candidate_maximum = max(candidate_maximum, len(selected))
            # Clear tiny/zero assignments too; exporter never performs an implicit trim.
            for group_index in [assignment.group for assignment in vertex.groups]:
                groups[group_index].remove([vertex.index])
            for group, weight in selected:
                groups[group].add([vertex.index], weight / total, "REPLACE")
    return {"method": ("Preserve every positive source bone assignment and renormalize sum1; no influence reduction"
                       if not limit else "Explicit largest requested positive bone weights, stable tie order, renormalized sum1"),
            "requestedWeightLimit": limit, "retainedAllPositiveAssignments": not limit,
            "verticesTrimmed": trimmed, "originalMaximumInfluences": maximum,
            "maximumCandidateInfluences": candidate_maximum, "minimumFractionRetainedBeforeNormalization": minimum_retained_sum,
            "maximumSourceWeightSumDeviationFromOne": max_source_sum_error}


def verify_texture_sources(imported, texture_dir, material_names):
    """Pin resolved maps and missing-channel fallbacks to the imported master.

    Basenames permit relocating the unchanged source package. Material/channel
    assignments and content hashes still have to match the import receipt.
    """
    remaps = {}
    for row in imported.get("materialRemaps", []):
        name = row["sourceMaterial"]
        if name in remaps:
            raise RuntimeError("Duplicate source material in import receipt: " + name)
        remaps[name] = row
    verified = {}
    for source_name in sorted(set(material_names)):
        lookup = "CUERNOS_1036.001" if source_name == "CUERPO_.002" else source_name
        if lookup not in remaps:
            raise RuntimeError("Material has no pinned import mapping: " + lookup)
        _, paths = texture_candidates(texture_dir, lookup)
        expected = remaps[lookup]["maps"]
        for channel, source_path in paths.items():
            pin = expected.get(channel)
            if (source_path is None) != (pin is None):
                raise RuntimeError("Source map/fallback changed since import: " + lookup + " / " + channel)
            if source_path is None:
                continue
            filename = str(pin["path"]).replace("\\", "/").rsplit("/", 1)[-1]
            if source_path.name != filename:
                raise RuntimeError("Source map filename changed since import: " + lookup + " / " + channel)
            key = source_path.resolve()
            actual = verified.get(key) or file_hash(key)
            if actual != pin["sha256"]:
                raise RuntimeError("Source texture hash differs from pinned import: " + str(source_path))
            verified[key] = actual
    if not verified:
        raise RuntimeError("No pinned source texture maps resolved")
    return verified


def resized_image(bpy, source_path, size, channel, folder, cache, records, source_pins):
    key = (str(source_path), size, channel)
    if key in cache:
        return cache[key]
    expected_hash = source_pins.get(source_path.resolve())
    if not expected_hash or file_hash(source_path) != expected_hash:
        raise RuntimeError("Source texture changed after preflight: " + str(source_path))
    image = bpy.data.images.load(str(source_path), check_existing=False)
    image.name = "OscarGame_" + source_path.stem + "_" + str(size)
    image.colorspace_settings.name = "sRGB" if channel in {"BaseColor", "Emissive"} else "Non-Color"
    image.scale(size, size)
    if file_hash(source_path) != expected_hash:
        raise RuntimeError("Source texture changed while resizing: " + str(source_path))
    destination = folder / (image.name.replace(" ", "_") + ".png")
    if destination.exists():
        raise FileExistsError(destination)
    image.filepath_raw = str(destination)
    image.file_format = "PNG"
    image.save()
    image.pack()
    records.append({"source": str(source_path), "sourceSha256": expected_hash,
                    "output": str(destination), "sha256": file_hash(destination),
                    "bytes": destination.stat().st_size, "size": [size, size], "channel": channel,
                    "colorSpace": image.colorspace_settings.name})
    cache[key] = image
    return image


def game_material(bpy, material, size, texture_dir, folder, cache, records, source_pins):
    import numpy as np
    source_name = material.get("sourceMaterialName", material.name)
    # Inference only: the six-triangle leftover uses UV1036; only a horn map
    # family for that tile was supplied. Surface proximity is reported below.
    lookup_name = "CUERNOS_1036.001" if source_name == "CUERPO_.002" else source_name
    semantics, paths = texture_candidates(texture_dir, lookup_name)
    result = bpy.data.materials.new("OscarGame_" + source_name + "_" + str(size))
    result.use_nodes = True
    result["sourceMaterialName"] = source_name
    result["sourceTile"] = semantics["udimTile"] or 1001
    nodes, links = result.node_tree.nodes, result.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    input_socket(shader, "Base Color").default_value = material.diffuse_color
    input_socket(shader, "Metallic").default_value = 1
    input_socket(shader, "Roughness").default_value = 1
    input_socket(shader, "Emission Color", "Emission").default_value = (0, 0, 0, 1)
    if shader.inputs.get("Emission Strength") is not None:
        shader.inputs["Emission Strength"].default_value = 1 if paths["Emissive"] else 0
    uv = nodes.new("ShaderNodeUVMap")
    uv.uv_map = "OscarGameUV"
    report = {"sourceMaterial": source_name, "material": result.name, "mapLookup": lookup_name,
              "size": size, "sourceTile": semantics["udimTile"], "missingChannels": []}
    if source_name == "CUERPO_.002":
        report["mappingInference"] = {"status": "REQUIRES_VISUAL_REVIEW", "basis": "ActualUV tile1036 and only supplied matching family CUERNOS; tile alone does not prove intended surface treatment"}
    resized = {}
    for channel, path in paths.items():
        if path:
            resized[channel] = resized_image(bpy, path, size, channel, folder, cache, records, source_pins)
        else:
            report["missingChannels"].append(channel)
    for channel in ("BaseColor", "Normal", "Emissive"):
        if channel not in resized:
            continue
        node = nodes.new("ShaderNodeTexImage")
        node.image = resized[channel]
        node.extension = "EXTEND"
        links.new(uv.outputs["UV"], node.inputs["Vector"])
        if channel == "Normal":
            normal = nodes.new("ShaderNodeNormalMap")
            normal.space = "TANGENT"
            normal.uv_map = "OscarGameUV"
            links.new(node.outputs["Color"], normal.inputs["Color"])
            links.new(normal.outputs["Normal"], shader.inputs["Normal"])
        else:
            links.new(node.outputs["Color"], input_socket(shader, *(('Base Color',) if channel == 'BaseColor' else ('Emission Color', 'Emission'))))
    orm = np.ones((size * size, 4), dtype=np.float32)
    for channel, column, fallback in [("Roughness", 1, .6), ("Metallic", 2, 0.0)]:
        if channel in resized:
            pixels = np.empty(size * size * 4, dtype=np.float32)
            resized[channel].pixels.foreach_get(pixels)
            orm[:, column] = pixels.reshape((-1, 4))[:, 0]
        else:
            orm[:, column] = fallback
    packed = bpy.data.images.new("OscarGame_" + source_name + "_ORM_" + str(size), width=size, height=size, alpha=True)
    packed.colorspace_settings.name = "Non-Color"
    packed.pixels.foreach_set(orm.ravel())
    path = folder / (packed.name + ".png")
    packed.filepath_raw = str(path)
    packed.file_format = "PNG"
    packed.save()
    packed.pack()
    records.append({"output": str(path), "sha256": file_hash(path), "bytes": path.stat().st_size,
                    "size": [size, size], "channel": "ORM", "colorSpace": "Non-Color",
                    "packing": "R=1 (no supplied AO), G=roughness or .6, B=metallic or0; alpha1"})
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = packed
    links.new(uv.outputs["UV"], texture.inputs["Vector"])
    separate = nodes.new("ShaderNodeSeparateColor")
    separate.mode = "RGB"
    links.new(texture.outputs["Color"], separate.inputs["Color"])
    links.new(separate.outputs["Green"], shader.inputs["Roughness"])
    links.new(separate.outputs["Blue"], shader.inputs["Metallic"])
    group = bpy.data.node_groups.get("glTF Material Output")
    if group is None:
        group = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
        group.interface.new_socket(name="Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
        group.nodes.new("NodeGroupInput")
    ao = nodes.new("ShaderNodeGroup")
    ao.node_tree = group
    if ao.inputs.get("Occlusion") is None:
        raise RuntimeError("Existing glTF material group lacks Occlusion")
    links.new(separate.outputs["Red"], ao.inputs["Occlusion"])
    return result, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--import-receipt", type=Path, required=True)
    parser.add_argument("--texture-output", type=Path, required=True)
    parser.add_argument("--textures", type=Path, default=Path(r"C:\Projects\space_dragon\free-dragon-character-3d-by-oscar-creativo\textures"))
    parser.add_argument("--wingspan", type=float, default=10.8)
    parser.add_argument("--reference-frame", type=float, default=1.0)
    parser.add_argument("--glide-frame", type=float, default=1.0)
    parser.add_argument("--head-texture-size", type=int, default=1024)
    parser.add_argument("--body-texture-size", type=int, default=512)
    parser.add_argument("--max-deformation-error", type=float, default=.001)
    parser.add_argument("--weight-limit", type=int, choices=(0, 4), default=0,
                        help="0 preserves all supplied influences;4 is only for explicitly measured comparison candidates")
    parser.add_argument("--weight-max-error", type=float, default=.001)
    parser.add_argument("--weight-p95-error", type=float, default=.001)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    if args.weight_limit == 0 and (args.weight_max_error > .001 or args.weight_p95_error > .001):
        raise ValueError("Full-weight preservation requires the1mm deformation gate; do not loosen it")
    import bpy
    from mathutils import Matrix, Vector, Quaternion
    source_path = Path(bpy.data.filepath).resolve()
    output, receipt_path, textures_out = args.output.resolve(), args.report.resolve(), args.texture_output.resolve()
    if not source_path.is_file() or output == source_path or any(p.exists() for p in [output, receipt_path, textures_out]):
        raise RuntimeError("Open the source master and choose fresh output/report/texture-directory paths")
    if bpy.data.collections.get(COLLECTION):
        raise RuntimeError("A game candidate already exists; preserve it")
    source_hash = file_hash(source_path)
    imported = json.loads(args.import_receipt.read_bytes())
    if (imported.get("result") != "IMPORTED_AND_STRUCTURALLY_INSPECTED"
            or Path(imported["output"]).resolve() != source_path or imported["outputSha256"] != source_hash
            or not all(imported["preservation"].values())):
        raise RuntimeError("Opened master does not match a passing pinned v001 import receipt")
    scene = bpy.context.scene
    if abs(scene.render.fps / scene.render.fps_base - 30) > 1e-6:
        raise RuntimeError("Source timeline must be30fps; do not silently retime the supplied motion")
    source_rig = bpy.data.objects.get("rig")
    if not source_rig or source_rig.type != "ARMATURE":
        raise RuntimeError("Expected imported rig")
    source_meshes = sorted([obj for obj in scene.objects if obj.type == "MESH" and obj.name != "taclb_tier_1"
                            and any(m.type == "ARMATURE" and m.object == source_rig for m in obj.modifiers)], key=lambda obj: obj.name)
    if len(source_meshes) != 26:
        raise RuntimeError("Pinned source should contain26 skinned dragon meshes; inspect before changing intake")
    source_material_names = [slot.material.get("sourceMaterialName", slot.material.name)
                             for obj in source_meshes for slot in obj.material_slots if slot.material]
    # Complete this read-only preflight before cloning, resizing or writing output.
    source_pins = verify_texture_sources(imported, args.textures, source_material_names)
    if any(b.constraints for b in source_rig.pose.bones) or source_rig.constraints:
        raise RuntimeError("Unexpected imported constraints require evaluated-matrix bake, not an unreviewed prune")
    source_action = source_rig.animation_data.action
    original_actions = action_report(source_action)
    # Source object TRS is constant. Keep it as static node transforms; bone motion remains full TRS.
    for channel in original_actions["channels"]:
        if not channel["dataPath"].startswith('pose.bones[') and channel['valueRange'] and abs(channel['valueRange'][1]-channel['valueRange'][0]) > 1e-6:
            raise RuntimeError("Animated armature object transform needs an explicit root-motion decision")
    signatures = {obj.name: mesh_signature(obj) for obj in source_meshes}
    original_rig = rig_report(source_rig, source_meshes)
    # Full preservation uses strictly-positive source weights, without an epsilon
    # that could silently discard a small but authored influence/ancestor.
    weighted_names = set()
    for obj in source_meshes:
        groups = {group.index: group.name for group in obj.vertex_groups}
        for vertex in obj.data.vertices:
            for assignment in vertex.groups:
                if assignment.weight > 0:
                    name = groups[assignment.group]
                    if name not in source_rig.data.bones:
                        raise RuntimeError("Positive source weight references a missing bone: " + name)
                    weighted_names.add(name)
    keep = set(weighted_names)
    for name in weighted_names:
        bone = source_rig.data.bones[name].parent
        while bone:
            keep.add(bone.name)
            bone = bone.parent
    frame_start, frame_end = source_action.frame_range
    if abs(frame_start) > 1e-6 or abs(frame_end - 154) > 1e-6:
        raise RuntimeError("Review unexpected source action timing")
    set_frame(scene, args.reference_frame)
    reference_bounds = bounds_for(bpy, source_meshes)
    scale = args.wingspan / reference_bounds["size"][0]
    center = source_rig.matrix_world @ source_rig.data.bones["root.x"].head_local
    normalization = Matrix.Scale(scale, 4) @ Matrix.Translation(-center)
    coll = bpy.data.collections.new(COLLECTION)
    scene.collection.children.link(coll)
    asset_root = bpy.data.objects.new(ROOT, None)
    coll.objects.link(asset_root)
    asset_root.matrix_world = normalization
    rig = source_rig.copy()
    rig.data = source_rig.data.copy()
    rig.name = RIG
    coll.objects.link(rig)
    rig.animation_data_clear()
    rig.parent = asset_root
    rig.matrix_parent_inverse = Matrix.Identity(4)
    rig.matrix_basis = source_rig.matrix_world.copy()
    pairs = []
    for old in source_meshes:
        obj = old.copy()
        obj.data = old.data.copy()
        obj.name = "OscarGame_" + old.name
        coll.objects.link(obj)
        obj.animation_data_clear()
        obj.parent = rig
        obj.matrix_parent_inverse = old.matrix_parent_inverse.copy()
        obj.matrix_basis = old.matrix_basis.copy()
        obj.hide_set(False)
        obj.hide_render = False
        for modifier in obj.modifiers:
            if modifier.type == "ARMATURE":
                modifier.object = rig
        pairs.append((old, obj))
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    for bone in list(rig.data.edit_bones):
        if bone.name not in keep:
            rig.data.edit_bones.remove(bone)
    bpy.ops.object.mode_set(mode="OBJECT")
    for bone in rig.pose.bones:
        bone.rotation_mode = "QUATERNION"
    samples, previous = [], {}
    frames = list(range(155))
    for frame in frames:
        set_frame(scene, frame)
        sample = {}
        for name in sorted(keep):
            location, rotation, bone_scale = source_rig.pose.bones[name].matrix_basis.decompose()
            if name in previous and previous[name].dot(rotation) < 0:
                rotation.negate()
            previous[name] = rotation.copy()
            sample[name] = [*location, *rotation, *bone_scale]
        samples.append(sample)
    flight = new_action(bpy, rig, "Flight", samples, frames)
    glide_index = round(args.glide_frame)
    if abs(glide_index - args.glide_frame) > 1e-6 or not 0 <= glide_index <= 154:
        raise RuntimeError("This initial held glide must select an integer authored frame0..154")
    glide = new_action(bpy, rig, "Glide", [samples[glide_index], samples[glide_index]], [0, 30])
    boost = new_action(bpy, rig, "Boost", samples, [frame / 1.15 for frame in frames])
    assign(rig, flight)
    bpy.context.view_layer.update()
    comparison_frames = [0, 19.25, 38.5, 57.75, 77, 96.25, 115.5, 134.75, 154]
    deformation = compare_deformation(bpy, scene, pairs, normalization, comparison_frames)
    if max(row["maxMetres"] for row in deformation) > args.max_deformation_error:
        raise RuntimeError("Rig reduction/bake deformation exceeded threshold: " + json.dumps(deformation))
    weight_reduction = prepare_weights([obj for old, obj in pairs], keep, args.weight_limit)
    weight_deformation = compare_deformation(bpy, scene, pairs, normalization, comparison_frames)
    weight_pass = all(row["maxMetres"] <= args.weight_max_error and row["p95Metres"] <= args.weight_p95_error for row in weight_deformation)
    weight_reduction.update({"checks": weight_deformation, "gate": "PASS" if weight_pass else "REQUIRES_REVIEW",
                             "maxAllowedMetres": args.weight_max_error, "p95AllowedMetres": args.weight_p95_error,
                             "worstFrame": max(weight_deformation, key=lambda row: row["maxMetres"])["sourceFrame"],
                             "scope": "Compared against untouched source full-weight deformation after normalized coordinates. Passing numerical gate still needs visual review."})
    textures_out.mkdir(parents=True)
    maps, material_records, cache, replacements = [], [], {}, {}
    for old, obj in pairs:
        # Head priority is derived from actual weights as well as explicit facial parts.
        head_groups = {g.index for g in old.vertex_groups if any(term in g.name for term in ["head", "jaw", "skull", "neck", "tong", "eye", "nose", "chin", "cheek", "ear"])}
        head_vertices = sum(any(g.group in head_groups and g.weight > .2 for g in v.groups) for v in old.data.vertices)
        size = args.head_texture_size if head_vertices > len(old.data.vertices) * .25 else args.body_texture_size
        layer = obj.data.uv_layers.active
        if not layer or len(obj.material_slots) != 1:
            raise RuntimeError("Unexpected UV/material layout: " + old.name)
        layer.name = "OscarGameUV"
        material = old.material_slots[0].material
        source_name = material.get("sourceMaterialName", material.name)
        lookup = "CUERNOS_1036.001" if source_name == "CUERPO_.002" else source_name
        semantics, _ = texture_candidates(args.textures, lookup)
        offset = tile_offset(semantics["udimTile"])
        for loop in layer.data:
            loop.uv.x -= offset[0]
            loop.uv.y -= offset[1]
        key = (material, size)
        if key not in replacements:
            replacements[key], row = game_material(bpy, material, size, args.textures, textures_out, cache, maps, source_pins)
            row["headPriority"] = size == args.head_texture_size
            material_records.append(row)
        obj.data.materials.clear()
        obj.data.materials.append(replacements[key])
    set_frame(scene, 0)
    rig.data.pose_position = "REST"
    bpy.context.view_layer.update()
    game_meshes = [obj for old, obj in pairs]
    rest_bounds = bounds_for(bpy, game_meshes)
    ambiguous_context = []
    for old, obj in pairs:
        material_name = old.material_slots[0].material.get("sourceMaterialName", "")
        if material_name != "CUERPO_.002":
            continue
        import numpy as np
        tiny = positions(bpy, obj)
        near = []
        for other_old, other_obj in pairs:
            if other_obj == obj:
                continue
            other = positions(bpy, other_obj)
            distance = min(float(np.linalg.norm(other - point, axis=1).min()) for point in tiny)
            near.append({"object": other_old.name, "nearestVertexDistanceMetres": distance})
        obj.data.calc_loop_triangles()
        ambiguous_context.append({"sourceObject": old.name, "vertices": len(obj.data.vertices),
                                  "triangles": len(obj.data.loop_triangles), "restCentroidMetres": tiny.mean(axis=0).tolist(),
                                  "closestSurfaces": sorted(near, key=lambda item: item["nearestVertexDistanceMetres"])[:5],
                                  "status": "1036 horn-family mapping remains an inference requiring actual surface review"})
    def bone_point(name, tail=False):
        bone = rig.data.bones[name]
        return rig.matrix_world @ (bone.tail_local if tail else bone.head_local)
    def front_center(name):
        import numpy as np
        points = positions(bpy, next(obj for old, obj in pairs if old.name == name))
        front = points[:, 1].min()
        band = max(.015, (points[:, 1].max() - front) * .12)
        return Vector(np.mean(points[points[:, 1] <= front + band], axis=0))
    muzzle = (front_center("DIENTES_ARRIBA") + front_center("DIENTES_ABAJO")) * .5
    muzzle.y -= .07
    socket_specs = {"socket_muzzle": ("head.x", muzzle),
                    "socket_wing_l": ("hand.l", bone_point("hand.l", True)),
                    "socket_wing_r": ("hand.r", bone_point("hand.r", True)),
                    "socket_thruster_l": ("root.x", bone_point("thigh_stretch.l")),
                    "socket_thruster_r": ("root.x", bone_point("thigh_stretch.r")),
                    "socket_target": ("root.x", bone_point("root.x")),
                    "socket_camera": ("root.x", bone_point("root.x") + Vector((0, .1, .2))),
                    "socket_ground": ("root.x", Vector((0, 0, rest_bounds["min"][2])))}
    sockets = []
    for name, (bone_name, position) in socket_specs.items():
        obj = bpy.data.objects.new(name, None)
        coll.objects.link(obj)
        obj.empty_display_size = .12
        obj.parent = rig
        obj.parent_type = "BONE"
        obj.parent_bone = bone_name
        bpy.context.view_layer.update()
        obj.matrix_world = Matrix.Translation(position)
        bpy.context.view_layer.update()
        sockets.append({"name": name, "parent": bone_name, "blenderRestPosition": list(obj.matrix_world.translation)})
    jaw_world = rig.matrix_world @ rig.data.bones["jawbone.x"].matrix_local
    jaw_axis = (jaw_world.to_3x3().inverted() @ Vector((1, 0, 0))).normalized()
    rig.data.pose_position = "POSE"
    jaw_checks, passing_signs = [], {-1, 1}
    for pose in ("REST", "REFERENCE_FRAME"):
        if pose == "REST":
            rig.animation_data.action = None
            for bone in rig.pose.bones:
                bone.matrix_basis = Matrix.Identity(4)
        else:
            assign(rig, flight)
            set_frame(scene, args.reference_frame)
        bpy.context.view_layer.update()
        jaw = rig.pose.bones["jawbone.x"]
        base_rotation = jaw.rotation_quaternion.copy()
        for sign in (-1, 1):
            samples_for_sign = []
            for radians in (0, -.16, -.32):
                jaw.rotation_quaternion = base_rotation @ Quaternion(jaw_axis, radians * sign)
                bpy.context.view_layer.update()
                samples_for_sign.append({"inputRadians": radians, "tipBlenderWorld": list(rig.matrix_world @ jaw.tail)})
            z = [sample["tipBlenderWorld"][2] for sample in samples_for_sign]
            down = z[1] < z[0] - 1e-6 and z[2] < z[1] - 1e-6
            if not down:
                passing_signs.discard(sign)
            jaw_checks.append({"pose": pose, "multiplier": sign, "tipMovesDownMonotonically": down,
                               "samples": samples_for_sign})
            jaw.rotation_quaternion = base_rotation
        bpy.context.view_layer.update()
    if len(passing_signs) != 1:
        raise RuntimeError("No unambiguous jaw multiplier opens down in both rest and reference pose: " + json.dumps(jaw_checks))
    jaw_sign = passing_signs.pop()
    assign(rig, flight)
    set_frame(scene, args.reference_frame)
    source_preserved = signatures == {obj.name: mesh_signature(obj) for obj in source_meshes}
    source_preserved = source_preserved and original_actions == action_report(source_action)
    if not source_preserved or file_hash(source_path) != source_hash:
        raise RuntimeError("Protected imported source changed")
    report = {"schemaVersion": 1, "result": "GAME_CANDIDATE_PREPARED", "source": str(source_path), "sourceSha256": source_hash,
              "output": str(output), "collection": COLLECTION, "rig": RIG, "assetRoot": ROOT,
              "importReceipt": str(args.import_receipt.resolve()), "importReceiptSha256": file_hash(args.import_receipt),
              "framesPerSecond": scene.render.fps / scene.render.fps_base,
              "textureSourceVerification": {"uniqueFiles": len(source_pins),
                        "method": "Material/channel filenames and SHA256 pinned to import receipt; missing-channel fallbacks unchanged; hashes rechecked around each resize"},
              "rigProfile": "oscar-creativo-flight", "sourceGeometryUnchanged": True,
              "sourceActionUnchanged": True, "sourceFileUnchanged": True,
              "normalization": {"referenceFrame": args.reference_frame, "referencePoseSpan": reference_bounds["size"][0],
                                "targetPoseWingspan": args.wingspan, "scale": scale, "centerBlenderWorld": list(center),
                                "matrixBlender": matrix_rows(normalization), "forward": "-Y", "up": "+Z"},
              "skeleton": {"originalBones": len(source_rig.data.bones), "weightedBones": sorted(weighted_names),
                           "retainedBones": sorted(keep), "retainedCount": len(keep), "method": "Positive-weight bones plus complete ancestor closure; same rest/hierarchy; full local TRS sampled30Hz"},
              "deformationChecks": deformation, "maxAllowedDeformationMetres": args.max_deformation_error,
              "weightReduction": weight_reduction,
              "materials": material_records, "textures": maps, "sockets": sockets, "restBoundsBlender": rest_bounds,
              "ambiguousMaterialContext": ambiguous_context,
              "contactHeightBlender": rest_bounds["min"][2], "jawReview": {"bone": "jawbone.x", "localAxisBlender": list(jaw_axis),
                        "jawScale": jaw_sign, "inputRangeRadians": [-.5, 0], "checks": jaw_checks,
                        "restWorldMatrixBlender": matrix_rows(jaw_world), "gate": "PASS",
                        "scope": "Multiplier selected only after measured tipZ decreases at0,-.16,-.32 input in rest and reference pose; surface/feel review pending"},
              "clipDerivations": {"Flight": {"sourceAction": source_action.name, "durationSeconds": 154/30},
                                  "Glide": {"heldSourceFrame": glide_index, "durationSeconds": 1, "derived": True},
                                  "Boost": {"source": "Flight", "speed": 1.15, "durationSeconds": 154/30/1.15, "derived": True}},
              "modifications": ["Separate candidate normalized to requested reference-pose span and centered on source root.x rest", "Presentation rock omitted from candidate; original source retained", "Unused nonancestor bones removed after weighted hierarchy audit; retained motion baked fullTRS at30Hz and deformation checked", ("All positive source skin influences retained and renormalized; full-weight deformation compared at1mm gate" if args.weight_limit == 0 else "Game-only skin weights explicitly reduced to largest four and renormalized, with source deformation error recorded"), "Cloned UVs moved into0..1; supplied maps resized by head-weight priority, ORM packed with neutral AO", "CUERPO_.002 uses inferred horn tile1036; nearest-surface context recorded and visual review remains required", "Derived held Glide and1.15x Boost clips; measured attachment sockets added"],
              "limitations": ["No export/runtime promotion performed", "No geometry reduction, draw-call consolidation or LOD yet", "Source texture handedness and neutral missing-map constants remain review items", "Muzzle, jaw overlay, glide pose and normal/emission response require visual review", "Full influence sets require verified Unity import/restoration; glTFast default first-set handling alone is insufficient"]}
    asset_root["assetId"] = "oscar-dragon-v001"
    asset_root["rigProfile"] = report["rigProfile"]
    if not weight_pass:
        report["result"] = "GAME_CANDIDATE_REQUIRES_WEIGHT_REVIEW"
    # Review source stays recoverable in its original collections; show only candidate.
    for obj in source_meshes + [source_rig]:
        obj.hide_set(True)
        obj.hide_render = True
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output), check_existing=False, relative_remap=False, compress=False)
    report["outputSha256"] = file_hash(output)
    report["outputBytes"] = output.stat().st_size
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    with receipt_path.open("x", encoding="utf8") as stream:
        json.dump(report, stream, indent=2)
        stream.write("\n")
    print(json.dumps({"result": report["result"], "output": str(output), "report": str(receipt_path), "retainedBones": len(keep)}))


if __name__ == "__main__":
    main()
