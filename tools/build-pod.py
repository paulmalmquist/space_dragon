"""Build a provisional rescue pod in a NEW headless Blender scene.

Run only with Blender --background --factory-startup --python tools/build-pod.py.
The output version must not already exist; no live scene or earlier source is edited.
No downloaded assets, likenesses, reference photographs or external services are used.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import random
import sys

import bpy
from mathutils import Vector


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", default="v001")
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])


def main():
    if not bpy.app.background or bpy.data.filepath:
        raise RuntimeError("Use a NEW --background --factory-startup Blender process, never a live/loaded scene.")
    args = arguments()
    if not args.version.startswith("v") or not args.version[1:].isdigit():
        raise ValueError("Use a simple version such as v001.")
    repo = Path(__file__).resolve().parents[1]
    source = repo / "assets/source/local/props/pod" / args.version
    export = repo / "assets/game/local/props/pod" / args.version
    if source.exists() or export.exists():
        raise FileExistsError("Choose a new version; this script preserves previous assets.")
    source.mkdir(parents=True)
    export.mkdir(parents=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1
    scene.render.fps = 24
    scene.frame_start, scene.frame_end = 1, 37
    collection = bpy.data.collections.new("EXPORT_rescue_pod")
    scene.collection.children.link(collection)
    root = bpy.data.objects.new("pod_root", None)
    collection.objects.link(root)
    root["asset_id"] = "rescue-pod"
    root["design_status"] = "provisional original design; not approved final art"

    image = bpy.data.images.new("pod_shell_albedo", width=256, height=256, alpha=False)
    rng = random.Random(20429)
    pixels = []
    for y in range(256):
        for x in range(256):
            grain = rng.uniform(-0.018, 0.018)
            seam = -0.085 if x % 64 in (0, 1) else 0
            brushed = 0.012 * math.sin(y * 1.8)
            value = 0.56 + grain + seam + brushed
            pixels.extend((value * .87, value * .96, value, 1))
    image.pixels.foreach_set(pixels)
    image.filepath_raw = str(source / "pod-shell-albedo.png")
    image.file_format = 'PNG'
    image.save()
    image.pack()

    def material(name, color, metallic, roughness, emission=None, textured=False):
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        bsdf.inputs['Base Color'].default_value = (*color, 1)
        bsdf.inputs['Metallic'].default_value = metallic
        bsdf.inputs['Roughness'].default_value = roughness
        if textured:
            texture = mat.node_tree.nodes.new('ShaderNodeTexImage')
            texture.image = image
            mat.node_tree.links.new(texture.outputs['Color'], bsdf.inputs['Base Color'])
        if emission:
            bsdf.inputs['Emission Color'].default_value = (*emission, 1)
            bsdf.inputs['Emission Strength'].default_value = 2.2
        return mat

    shell = material('pod_shell_ceramic_metal', (.5, .58, .63), .65, .32, textured=True)
    dark = material('pod_joint_graphite', (.025, .045, .065), .55, .43)
    edge = material('pod_edge_titanium', (.28, .36, .4), .8, .24)
    amber = material('pod_safety_amber', (.92, .36, .075), .3, .35)
    energy = material('pod_energy_cyan', (.08, .7, .85), .05, .25, (.06, .67, .84))

    def attach(obj, name, mat=None, parent=root):
        obj.name = name
        for old in list(obj.users_collection):
            old.objects.unlink(obj)
        collection.objects.link(obj)
        if mat:
            obj.data.materials.append(mat)
        if parent:
            bpy.context.view_layer.update()
            world = obj.matrix_world.copy()
            obj.parent = parent
            obj.matrix_world = world
        return obj

    def box(name, dimensions, location, mat, bevel=.045, parent=root, rotation=None):
        bpy.ops.mesh.primitive_cube_add(size=1, location=location)
        obj = bpy.context.object
        obj.dimensions = dimensions
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        if rotation:
            obj.rotation_euler = rotation
        if bevel:
            mod = obj.modifiers.new('manufactured_edge', 'BEVEL')
            mod.width, mod.segments = bevel, 3
            mod.affect = 'EDGES'
        return attach(obj, name, mat, parent)

    def cylinder(name, radius, depth, location, mat, rotation=(math.pi / 2, 0, 0), parent=root):
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=radius, depth=depth, location=location, rotation=rotation)
        return attach(bpy.context.object, name, mat, parent)

    box('pod_chassis', (2.0, 1.18, .84), (0, 0, .62), dark, .12)
    box('pod_body', (1.9, 1.1, .68), (0, 0, .66), shell, .10)
    box('pod_lower_bumper', (2.06, 1.23, .16), (0, 0, .29), edge, .065)
    box('pod_energy_seam', (1.94, 1.14, .045), (0, 0, 1.015), energy, .045)
    for x in (-.83, .83):
        for y in (-.47, .47):
            box(f'pod_foot_{x}_{y}', (.3, .3, .23), (x, y, .115), dark, .04)
            box(f'pod_corner_rail_{x}_{y}', (.17, .18, .77), (x * 1.08, y * 1.12, .65), edge, .035)
        box(f'pod_front_latch_{x}', (.16, .11, .32), (x, -.61, .85), amber, .025)
    for x in (-.57, .57):
        box(f'pod_front_panel_{x}', (.68, .045, .38), (x, -.565, .66), shell, .035)
        for dx in (-.23, .23):
            cylinder(f'pod_fastener_{x}_{dx}', .032, .017, (x + dx, -.601, .66), dark)
    box('pod_front_status', (.30, .055, .13), (0, -.59, .73), dark, .02)
    for x in (-.075, 0, .075):
        box(f'pod_status_lamp_{x}', (.035, .015, .045), (x, -.625, .73), energy, .009)
    for x in (-1, 1):
        box(f'pod_side_recess_{x}', (.035, .52, .28), (x * .975, 0, .65), dark, .035)
        box(f'pod_side_handle_{x}', (.07, .38, .065), (x * 1.03, 0, .72), edge, .02)

    hinge = bpy.data.objects.new('hinge_pod_lid', None)
    collection.objects.link(hinge)
    hinge.parent = root
    hinge.location = (0, .51, 1.045)
    hinge['role'] = 'articulated lid pivot; do not merge or flatten'
    box('pod_lid', (2.0, 1.18, .22), (0, 0, 1.16), shell, .075, hinge)
    box('pod_lid_inset', (1.22, .75, .035), (0, -.035, 1.29), dark, .045, hinge)
    for x in (-.76, .76):
        box(f'pod_lid_rail_{x}', (.085, .9, .035), (x, 0, 1.29), edge, .02, hinge)
    for angle in (math.pi / 4, -math.pi / 4):
        for sign in (-1, 1):
            # A simple non-letter symbol, not a decided alien alphabet.
            px = sign * .115
            py = -.035 + (.115 if angle > 0 else -.115)
            box(f'pod_symbol_{angle}_{sign}', (.035, .34, .025), (px, py, 1.32), energy, .012, hinge, (0, 0, angle * sign))
    cylinder('pod_hinge_left', .085, .25, (-.64, .53, 1.06), edge, (0, math.pi / 2, 0))
    cylinder('pod_hinge_right', .085, .25, (.64, .53, 1.06), edge, (0, math.pi / 2, 0))

    hinge.rotation_euler.x = 0
    hinge.keyframe_insert('rotation_euler', frame=1)
    hinge.rotation_euler.x = -math.radians(62)
    hinge.keyframe_insert('rotation_euler', frame=37)
    if hinge.animation_data and hinge.animation_data.action:
        hinge.animation_data.action.name = 'pod_open'
    scene.frame_set(1)

    bpy.ops.object.select_all(action='DESELECT')
    for obj in collection.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    glb = export / f'rescue-pod-{args.version}.glb'
    bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', use_selection=True,
                              export_animations=True, export_apply=True, export_yup=True,
                              export_cameras=False, export_lights=False, export_extras=True)

    # Review scene is local and is not included in the selected-object export.
    world = bpy.data.worlds.new('review_world')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes.get('Background').inputs['Color'].default_value = (.045, .065, .10, 1)
    world.node_tree.nodes.get('Background').inputs['Strength'].default_value = .45
    def area(name, loc, power, size, color):
        light = bpy.data.lights.new(name, 'AREA')
        light.energy, light.shape, light.size, light.color = power, 'DISK', size, color
        obj = bpy.data.objects.new(name, light)
        scene.collection.objects.link(obj)
        obj.location = loc
        obj.rotation_euler = (Vector((0, 0, .6)) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    area('review_key', (2, -3, 4), 700, 4, (1, .88, .72))
    area('review_fill', (-3, -1, 2), 400, 3, (.54, .75, 1))
    area('review_rim', (0, 3, 3), 850, 3, (.35, .78, 1))
    camera_data = bpy.data.cameras.new('review_camera')
    camera = bpy.data.objects.new('review_camera', camera_data)
    scene.collection.objects.link(camera)
    camera.location = (3.3, -4.2, 3.0)
    camera.rotation_euler = (Vector((0, 0, .64)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = 3.6
    scene.camera = camera
    scene.render.resolution_x = scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    try:
        scene.render.engine = 'CYCLES'
        scene.cycles.samples = 24
    except TypeError as exc:
        raise RuntimeError(f'Installed render engine options: {exc}') from exc
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = str(source / 'review-three-quarter.png')
    blend = source / f'rescue-pod-{args.version}.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    bpy.ops.render.render(write_still=True)
    triangle_count = sum(len(poly.vertices) - 2 for obj in collection.objects if obj.type == 'MESH' for poly in obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.polygons)
    corners = [obj.matrix_world @ Vector(corner) for obj in collection.objects if obj.type == 'MESH' for corner in obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).bound_box]
    dimensions = [round(max(point[i] for point in corners) - min(point[i] for point in corners), 4) for i in range(3)]
    receipt = {
        'asset_id': 'rescue-pod', 'version': args.version, 'status': 'provisional original asset; human art review pending',
        'blender_version': bpy.app.version_string, 'source': str(blend.relative_to(repo)),
        'export': str(glb.relative_to(repo)), 'export_bytes': glb.stat().st_size,
        'export_sha256': hashlib.sha256(glb.read_bytes()).hexdigest(),
        'units': 'meters', 'dimensions_blender_xyz_m': dimensions,
        'mesh_objects': sum(obj.type == 'MESH' for obj in collection.objects),
        'evaluated_triangles': triangle_count, 'material_count': len(bpy.data.materials),
        'texture_count': 1, 'texture_dimensions': [256, 256],
        'animation': 'pod_open', 'retained_nodes': ['pod_root', 'hinge_pod_lid', 'pod_lid'],
        'references': [], 'external_assets': [],
        'provenance': 'Locally authored parametric geometry and seeded procedural texture. No photo, likeness, uploaded reference or generator.'
    }
    (source / 'source-receipt.json').write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    print('POD_BUILD_RESULT ' + json.dumps(receipt))


if __name__ == '__main__':
    main()
