"""Export the reviewed v002 mechanical dragon without editing its source.

Run with Blender's background Python. A raw selected-object GLB, optimized
working .blend, optimized GLB and detailed local receipt are separate outputs.
Rigid render geometry is batched, while named bone-following pivot nodes retain
the component contract. Flexible meshes remain independently skinned.
"""
import collections
import hashlib
import json
import math
from pathlib import Path
import struct
import sys

import bpy
from mathutils import Matrix, Quaternion, Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / 'assets/source/local/spacecraft/space-dragon-spacecraft'
SOURCE = SOURCE_DIR / 'Space Dragon Spacecraft-v002.blend'
EXPORT_DIR = ROOT / 'assets/game/local/spacecraft/space-dragon-spacecraft'
RAW = EXPORT_DIR / 'dragon-mechanical-v002-raw.glb'
OPTIMIZED_BLEND = SOURCE_DIR / 'Space Dragon Spacecraft-v002-game.blend'
OPTIMIZED = EXPORT_DIR / 'dragon-mechanical-v002.glb'
RECEIPT = EXPORT_DIR / 'dragon-mechanical-v002-export.json'
EXPECTED_HASH = '5214e4c82053d41d42bc55062353b998cc59a2a2c76d294d88a39665690439dc'
EXPECTED_BONES = ['Root', 'Wing_L', 'Wing_R', 'Jaw', 'Tail_0', 'Tail_1', 'Tail_2', 'Tail_3', 'Tail_4']


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rows(matrix):
    return [list(row) for row in matrix]


def matrix_error(a, b):
    return max(abs(a[r][c] - b[r][c]) for r in range(4) for c in range(4))


def visible_meshes(scene):
    return [o for o in scene.objects if o.type == 'MESH' and not o.hide_render
            and not any('Review Studio' in c.name or 'Original Organic' in c.name for c in o.users_collection)]


def used_bones(obj):
    names = {group.index: group.name for group in obj.vertex_groups}
    return sorted({names[group.group] for vertex in obj.data.vertices for group in vertex.groups if group.weight > 1e-6})


def select_objects(objects):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.hide_set(False)
        obj.select_set(True)
    bpy.context.view_layer.objects.active = next((o for o in objects if o.type == 'ARMATURE'), objects[0])


def glb_summary(path):
    data = path.read_bytes()
    assert data[:4] == b'glTF'
    length, kind = struct.unpack_from('<II', data, 12)
    assert kind == 0x4E4F534A
    gltf = json.loads(data[20:20 + length])
    primitives = sum(len(m.get('primitives', [])) for m in gltf.get('meshes', []))
    triangles = sum(gltf['accessors'][p.get('indices', p['attributes']['POSITION'])]['count'] // 3
                    for m in gltf.get('meshes', []) for p in m['primitives'] if p.get('mode', 4) == 4)
    return {'path': str(path.relative_to(ROOT)).replace('\\', '/'), 'bytes': len(data), 'sha256': digest(path),
            'nodes': len(gltf.get('nodes', [])), 'meshes': len(gltf.get('meshes', [])), 'primitives': primitives,
            'triangles': triangles, 'skins': len(gltf.get('skins', [])), 'images': len(gltf.get('images', [])),
            'materials': [{'name': m.get('name'), 'pbr': m.get('pbrMetallicRoughness'),
                           'emissive': m.get('emissiveFactor'), 'extensions': m.get('extensions', {})}
                          for m in gltf.get('materials', [])],
            'extensionsUsed': gltf.get('extensionsUsed', []), 'extensionsRequired': gltf.get('extensionsRequired', []),
            'animations': len(gltf.get('animations', []))}, gltf


def normalize_exported_pivots(path, raw_path):
    """Correct Blender's bone-parented-empty head/tail offset in glTF only.

    The .blend markers already have exact source world matrices. Blender 5.2's
    exporter interprets their bone parenting with a tail offset, so derive node
    locals from the independently exported source rest worlds instead. Meshes,
    bones, inverse binds and binary geometry are never touched.
    """
    data = path.read_bytes()
    _, gltf = glb_summary(path)
    _, raw = glb_summary(raw_path)

    def world_matrices(document):
        parents = {child: index for index, node in enumerate(document['nodes']) for child in node.get('children', [])}
        cache = {}
        def world(index):
            if index in cache:
                return cache[index]
            node = document['nodes'][index]
            if 'matrix' in node:
                values = node['matrix']
                local = Matrix([[values[column * 4 + row] for column in range(4)] for row in range(4)])
            else:
                q = node.get('rotation', [0, 0, 0, 1])
                local = Matrix.LocRotScale(Vector(node.get('translation', [0, 0, 0])),
                                          Quaternion((q[3], q[0], q[1], q[2])),
                                          Vector(node.get('scale', [1, 1, 1])))
            result = world(parents[index]) @ local if index in parents else local
            cache[index] = result
            return result
        return parents, world

    raw_names = {node['name']: index for index, node in enumerate(raw['nodes']) if 'mesh' in node}
    parents, current_world = world_matrices(gltf)
    _, raw_world = world_matrices(raw)
    corrected = 0
    before_error = 0
    for index, node in enumerate(gltf['nodes']):
        name = node.get('name')
        if name == 'socket_muzzle':
            desired = Matrix.Translation((0, .5, -3.66))
        elif name in raw_names and 'mesh' not in node:
            desired = raw_world(raw_names[name])
        else:
            continue
        before_error = max(before_error, matrix_error(current_world(index), desired))
        parent_world = current_world(parents[index]) if index in parents else Matrix.Identity(4)
        local = parent_world.inverted() @ desired
        location, rotation, scale = local.decompose()
        for field in ['matrix', 'translation', 'rotation', 'scale']:
            node.pop(field, None)
        node['translation'] = list(location)
        node['rotation'] = [rotation.x, rotation.y, rotation.z, rotation.w]
        node['scale'] = list(scale)
        corrected += 1
    assert corrected == 700
    gltf.setdefault('asset', {}).setdefault('extras', {})['pivotNormalization'] = 'bone-parented-empty-source-rest-world-v1'
    encoded = json.dumps(gltf, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    encoded += b' ' * (-len(encoded) % 4)
    old_json_length = struct.unpack_from('<I', data, 12)[0]
    remainder = data[20 + old_json_length:]
    normalized = struct.pack('<4sII', b'glTF', 2, 20 + len(encoded) + len(remainder))
    normalized += struct.pack('<II', len(encoded), 0x4E4F534A) + encoded + remainder
    path.write_bytes(normalized)
    return {'nodes': corrected, 'maxExporterRestOffsetBeforeCorrection': before_error,
            'scope': 'Named pivot/socket node TRS only; raw reference worlds, bone hierarchy, mesh geometry and inverse bind matrices unchanged.'}


def export(path, objects):
    select_objects(objects)
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True,
                             export_cameras=False, export_lights=False, export_animations=False,
                             export_skins=True, export_def_bones=False, export_leaf_bone=False,
                             export_rest_position_armature=True, export_apply=True,
                             export_yup=True, export_extras=True, export_materials='EXPORT',
                             export_unused_images=False, export_unused_textures=False,
                             export_hierarchy_flatten_bones=False, export_hierarchy_flatten_objs=False,
                             export_armature_object_remove=False, export_shared_accessors=True,
                             export_draco_mesh_compression_enable=False, export_meshopt_compression_enable=False)


def bounds(objects):
    dep = bpy.context.evaluated_depsgraph_get()
    coordinates = []
    for obj in objects:
        evaluated = obj.evaluated_get(dep)
        coordinates.extend(evaluated.matrix_world @ Vector(corner) for corner in evaluated.bound_box)
    return {'min': [min(p[axis] for p in coordinates) for axis in range(3)],
            'max': [max(p[axis] for p in coordinates) for axis in range(3)]}


def sample_vertex(obj):
    dep = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(dep)
    return evaluated.matrix_world @ evaluated.data.vertices[0].co


def make_muzzle(rig, collection):
    marker = bpy.data.objects.new('socket_muzzle', None)
    collection.objects.link(marker)
    marker.parent = rig
    marker.parent_type = 'BONE'
    marker.parent_bone = 'Root'
    bpy.context.view_layer.update()
    marker.matrix_world = Matrix.Translation((0, 3.66, .50))
    marker['role'] = 'mechanical_dragon_muzzle'
    marker['bone'] = 'Root'
    return marker


def main():
    assert digest(SOURCE) == EXPECTED_HASH, 'Reviewed source changed; inspect new source before export.'
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    for path in [RAW, OPTIMIZED_BLEND, OPTIMIZED, RECEIPT]:
        assert not path.exists(), f'Refusing to overwrite an existing candidate: {path}'
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE), use_scripts=False)
    scene = bpy.context.scene
    scene.frame_set(1)
    rig = bpy.data.objects['SpaceDragonRig']
    assert list(rig.data.bones.keys()) == EXPECTED_BONES
    for bone in rig.pose.bones:
        bone.matrix_basis.identity()
    bpy.context.view_layer.update()
    skeleton = {b.name: rows(b.matrix_local) for b in rig.data.bones}
    objects = visible_meshes(scene)
    assert len(objects) == 706
    originals = {o.name: {'matrix': rows(o.matrix_world), 'bones': used_bones(o),
                           'vertices': len(o.data.vertices), 'materials': [m.name for m in o.data.materials if m]}
                 for o in objects}
    initial_bounds = bounds(objects)
    source_exclusions = [o.name for o in scene.objects if o.type == 'MESH' and o not in objects]
    raw_selection = [rig, *objects]
    export(RAW, raw_selection)
    raw_summary, raw_gltf = glb_summary(RAW)
    print('RAW_EXPORTED', json.dumps(raw_summary), flush=True)

    # The file loaded here is disposable process-local state. Preserve it to a
    # fresh working file before changing anything; the reviewed source is never saved.
    bpy.ops.wm.save_as_mainfile(filepath=str(OPTIMIZED_BLEND))
    optimized_collection = bpy.data.collections.new('Mechanical Game Export v002')
    scene.collection.children.link(optimized_collection)
    batches = collections.defaultdict(lambda: {'verts': [], 'faces': [], 'normals': [], 'uvs': [], 'smooth': [], 'components': []})
    flexible = []
    component_nodes = []
    bevel_reductions = []
    # Evaluate bevel/thickness in rest pose, not the armature. Armature weights
    # are recreated on each rigid render batch; flexible source weights stay intact.
    for obj in objects:
        name = obj.name
        original = originals[name]
        if len(original['bones']) != 1 or len(obj.data.materials) != 1:
            flexible.append(obj)
            obj['sourceComponentName'] = name
            continue
        bone = original['bones'][0]
        material = obj.data.materials[0]
        key = (bone, material.name)
        for modifier in obj.modifiers:
            if modifier.type == 'ARMATURE':
                modifier.show_viewport = False
            elif modifier.type == 'BEVEL' and modifier.segments > 1 and max(obj.dimensions) < .8:
                bevel_reductions.append(name)
                modifier.segments = 1
        bpy.context.view_layer.update()
        dep = bpy.context.evaluated_depsgraph_get()
        evaluated = obj.evaluated_get(dep)
        mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=dep)
        mesh.calc_loop_triangles()
        batch = batches[key]
        start_vertex, start_face = len(batch['verts']), len(batch['faces'])
        world = obj.matrix_world.copy()
        normal_matrix = world.inverted_safe().transposed().to_3x3()
        batch['verts'].extend(tuple(world @ v.co) for v in mesh.vertices)
        for polygon in mesh.polygons:
            batch['faces'].append(tuple(start_vertex + index for index in polygon.vertices))
            batch['smooth'].append(polygon.use_smooth)
            normal = (normal_matrix @ polygon.normal).normalized()
            drop = max(range(3), key=lambda axis: abs(normal[axis]))
            axes = [axis for axis in range(3) if axis != drop]
            for loop_index in polygon.loop_indices:
                loop = mesh.loops[loop_index]
                corner_normal = (normal_matrix @ mesh.corner_normals[loop_index].vector).normalized()
                batch['normals'].append(tuple(corner_normal))
                position = world @ mesh.vertices[loop.vertex_index].co
                batch['uvs'].append((position[axes[0]], position[axes[1]]))
        batch['components'].append(name)
        evaluated.to_mesh_clear()
        # Keep every exact source component name and pivot as a true transform
        # attached to its articulation bone, not only a name in documentation.
        obj.name = '__SOURCE_ONLY__' + name
        marker = bpy.data.objects.new(name, None)
        optimized_collection.objects.link(marker)
        marker.parent = rig
        marker.parent_type = 'BONE'
        marker.parent_bone = bone
        bpy.context.view_layer.update()
        marker.matrix_world = world
        marker['sourceComponentName'] = name
        marker['sourceBone'] = bone
        marker['sourceRestMatrixBlenderRowMajor'] = [value for row in original['matrix'] for value in row]
        marker['renderBatch'] = f'SDG_{bone}_{material.name}'
        marker['batchVertexStart'] = start_vertex
        marker['batchVertexCount'] = len(batch['verts']) - start_vertex
        marker['batchFaceStart'] = start_face
        marker['batchFaceCount'] = len(batch['faces']) - start_face
        component_nodes.append(marker)
        obj.hide_render = True
        obj.hide_set(True)

    render_batches = []
    for (bone, material_name), batch in sorted(batches.items()):
        mesh = bpy.data.meshes.new(f'SDG_{bone}_{material_name}')
        mesh.from_pydata(batch['verts'], [], batch['faces'])
        mesh.update()
        for polygon, smooth in zip(mesh.polygons, batch['smooth']):
            polygon.use_smooth = smooth
        mesh.normals_split_custom_set(batch['normals'])
        uv = mesh.uv_layers.new(name='RuntimeBoxUV')
        for corner, coordinates in zip(uv.data, batch['uvs']):
            corner.uv = coordinates
        mesh.materials.append(bpy.data.materials[material_name])
        obj = bpy.data.objects.new(f'SDG_{bone}_{material_name}', mesh)
        optimized_collection.objects.link(obj)
        obj.parent = rig
        group = obj.vertex_groups.new(name=bone)
        group.add(list(range(len(mesh.vertices))), 1, 'REPLACE')
        modifier = obj.modifiers.new('Preserved dragon articulation', 'ARMATURE')
        modifier.object = rig
        obj['batchBone'] = bone
        obj['sourceComponents'] = batch['components']
        obj['surfaceKind'] = 'mechanical'
        render_batches.append(obj)

    material_report = []
    used_materials = {m for obj in [*render_batches, *flexible] for m in obj.data.materials if m}
    for material in sorted(used_materials, key=lambda m: m.name):
        principled = next(node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
        for socket_name in ['Roughness', 'Normal']:
            for link in list(principled.inputs[socket_name].links):
                material.node_tree.links.remove(link)
        material_report.append({'name': material.name,
                                'baseColor': list(principled.inputs['Base Color'].default_value),
                                'metallic': principled.inputs['Metallic'].default_value,
                                'roughness': principled.inputs['Roughness'].default_value,
                                'emission': list(principled.inputs['Emission Color'].default_value),
                                'emissionStrength': principled.inputs['Emission Strength'].default_value})
    muzzle = make_muzzle(rig, optimized_collection)
    rig['assetId'] = 'space-dragon-spacecraft-mechanical-v002'
    rig['surfaceKind'] = 'mechanical'
    scene['export_candidate'] = 'mechanical-v002-optimized'
    bpy.context.view_layer.update()
    pivot_error = max(matrix_error(node.matrix_world, Matrix(originals[node.name]['matrix'])) for node in component_nodes)
    assert pivot_error < 1e-5, ('Rest pivots differ', pivot_error)
    assert skeleton == {bone.name: rows(bone.matrix_local) for bone in rig.data.bones}
    pose_errors = {}
    for bone_name in EXPECTED_BONES:
        pose = rig.pose.bones[bone_name]
        pose.rotation_mode = 'QUATERNION'
        pose.rotation_quaternion = Quaternion((1, 0, 0), .3)
        bpy.context.view_layer.update()
        errors = []
        transform = rig.matrix_world @ pose.matrix @ rig.data.bones[bone_name].matrix_local.inverted() @ rig.matrix_world.inverted()
        for node in component_nodes:
            if node['sourceBone'] != bone_name:
                continue
            expected = transform @ Matrix(originals[node.name]['matrix'])
            errors.append(matrix_error(node.matrix_world, expected))
        pose_errors[bone_name] = max(errors, default=0)
        assert pose_errors[bone_name] < 1e-5, (bone_name, pose_errors[bone_name])
        pose.matrix_basis.identity()
        bpy.context.view_layer.update()
    optimized_bounds = bounds([*render_batches, *flexible])
    assert max(abs(initial_bounds[key][axis] - optimized_bounds[key][axis]) for key in ['min', 'max'] for axis in range(3)) < .02
    objects_to_export = [rig, *render_batches, *flexible, *component_nodes, muzzle]
    select_objects(objects_to_export)
    bpy.ops.wm.save_as_mainfile(filepath=str(OPTIMIZED_BLEND))
    export(OPTIMIZED, objects_to_export)
    pivot_normalization = normalize_exported_pivots(OPTIMIZED, RAW)
    optimized_summary, optimized_gltf = glb_summary(OPTIMIZED)
    names = {node.get('name') for node in optimized_gltf.get('nodes', [])}
    assert set(originals).issubset(names), 'Missing component node names after export.'
    assert set(EXPECTED_BONES).issubset(names)
    assert 'socket_muzzle' in names
    assert not any('Review Studio' in (name or '') or '__SOURCE_ONLY__' in (name or '') for name in names)
    assert len(optimized_gltf.get('images', [])) == 0
    assert len(optimized_gltf.get('materials', [])) == 8
    assert digest(SOURCE) == EXPECTED_HASH, 'Original reviewed source changed.'
    receipt = {'assetId': 'space-dragon-spacecraft-mechanical-v002', 'blender': bpy.app.version_string,
               'source': str(SOURCE.relative_to(ROOT)).replace('\\', '/'), 'sourceBytes': SOURCE.stat().st_size,
               'sourceSha256': EXPECTED_HASH, 'optimizedBlend': str(OPTIMIZED_BLEND.relative_to(ROOT)).replace('\\', '/'),
               'optimizedBlendSha256': digest(OPTIMIZED_BLEND), 'raw': raw_summary, 'optimized': optimized_summary,
               'bones': skeleton, 'boneRestTransformsUnchanged': True,
               'sourceVisibleMeshes': len(objects), 'rigidComponentNodes': len(component_nodes),
               'renderBatches': len(render_batches), 'flexibleMeshes': [o.name for o in flexible],
               'componentRestPivotMaxError': pivot_error, 'componentPoseMaxErrors': pose_errors,
               'gltfPivotNormalization': pivot_normalization,
               'sourceBoundsBlender': initial_bounds, 'optimizedBoundsBlender': optimized_bounds,
               'bevelSegmentsReducedTwoToOne': bevel_reductions, 'materials': material_report,
               'excludedSourceMeshNames': source_exclusions, 'components': originals,
               'muzzleBlender': [0, 3.66, .5], 'muzzleGLTF': [0, .5, -3.66],
               'optimization': 'Rigid geometry batched by bone/material; exact component pivot nodes follow their source bones. Flexible meshes remain individually skinned. Small (<.8m maximum dimension) hardware bevel segments 2→1. Box UVs provide runtime grain equivalents. No decoder compression.',
               'limitations': 'Batched rigid parts retain transform/pivot nodes, not independent mesh drawables. Raw GLB and reviewed source retain individual geometry for future assembly exports. Procedural noise is replaced by material constants plus optional runtime detail. No final art/release/device-performance approval.'}
    RECEIPT.write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    print('OPTIMIZED_EXPORTED', json.dumps(optimized_summary), flush=True)
    print('RECEIPT', str(RECEIPT), flush=True)


def export_red_candidate():
    """Apply the later owner palette override to a separate optimized copy."""
    red_blend = SOURCE_DIR / 'Space Dragon Spacecraft-v002-game-red-v001.blend'
    red_glb = EXPORT_DIR / 'dragon-mechanical-red-v001.glb'
    red_receipt = EXPORT_DIR / 'dragon-mechanical-red-v001-export.json'
    for path in [red_blend, red_glb, red_receipt]:
        assert not path.exists(), f'Refusing to overwrite an existing candidate: {path}'
    assert digest(SOURCE) == EXPECTED_HASH
    blue_hash = digest(OPTIMIZED_BLEND)
    receipt = json.loads(RECEIPT.read_text(encoding='utf-8'))
    bpy.ops.wm.open_mainfile(filepath=str(OPTIMIZED_BLEND), use_scripts=False)
    rig = bpy.data.objects['SpaceDragonRig']
    palette = {
        'SDM_Petrol blue armor': (.34, .022, .015),
        'SDM_Oxide red armor': (.25, .012, .008),
        'SDM_Red composite wing panels': (.24, .012, .016),
        'SDM_Graphite mechanisms': (.045, .004, .004),
        'SDM_Machined titanium': (.22, .035, .025),
        'SDM_Heat stained bronze': (.16, .018, .009),
    }
    for name, color in palette.items():
        material = bpy.data.materials[name]
        principled = next(node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
        material['sourcePalette'] = 'mechanical-v002-blue-steel'
        material['sourceBaseColor'] = list(principled.inputs['Base Color'].default_value)
        material['runtimePalette'] = 'red-v001'
        material.diffuse_color = (*color, 1)
        principled.inputs['Base Color'].default_value = (*color, 1)
    rig['assetId'] = 'space-dragon-spacecraft-mechanical-red-v001'
    rig['runtimePalette'] = 'red-v001'
    rig['sourcePalette'] = 'mechanical-v002-blue-steel'
    bpy.context.scene['export_candidate'] = 'mechanical-red-v001-optimized'
    component_nodes = [bpy.data.objects[name] for name, info in receipt['components'].items()
                       if len(info['bones']) == 1 and bpy.data.objects[name].type == 'EMPTY']
    render_objects = visible_meshes(bpy.context.scene)
    muzzle = bpy.data.objects['socket_muzzle']
    selection = [rig, *render_objects, *component_nodes, muzzle]
    select_objects(selection)
    bpy.ops.wm.save_as_mainfile(filepath=str(red_blend))
    export(red_glb, selection)
    pivot_normalization = normalize_exported_pivots(red_glb, RAW)
    summary, gltf = glb_summary(red_glb)
    assert summary['primitives'] == receipt['optimized']['primitives']
    assert summary['triangles'] == receipt['optimized']['triangles']
    names = {node.get('name') for node in gltf['nodes']}
    assert set(receipt['components']).issubset(names)
    assert set(EXPECTED_BONES).issubset(names)
    for material in gltf['materials']:
        color = material.get('pbrMetallicRoughness', {}).get('baseColorFactor', [1, 1, 1, 1])
        if material['name'] in palette:
            assert color[0] > color[1] * 3 and color[0] > color[2] * 3, material['name']
        else:
            assert material.get('emissiveFactor', [0, 0, 0])[0] == 1
    assert receipt['bones'] == {b.name: rows(b.matrix_local) for b in rig.data.bones}
    assert digest(SOURCE) == EXPECTED_HASH and digest(OPTIMIZED_BLEND) == blue_hash
    receipt.update({'assetId': 'space-dragon-spacecraft-mechanical-red-v001',
                    'sourcePalette': 'mechanical-v002-blue-steel', 'runtimePalette': 'red-v001',
                    'ownerPaletteOverride': 'ok make the whole dragon red instead',
                    'blueOptimizedBaseline': receipt['optimized'],
                    'optimized': summary,
                    'optimizedBlend': str(red_blend.relative_to(ROOT)).replace('\\', '/'),
                    'optimizedBlendSha256': digest(red_blend),
                    'redPaletteLinear': {name: list(value) for name, value in palette.items()},
                    'paletteChangeOnly': True})
    receipt['gltfPivotNormalization'] = pivot_normalization
    red_receipt.write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    print('RED_OPTIMIZED_EXPORTED', json.dumps(summary), flush=True)
    print('RED_RECEIPT', str(red_receipt), flush=True)


if __name__ == '__main__':
    if '--normalize-existing-pivots' in sys.argv:
        import shutil
        for path, receipt_path in [(OPTIMIZED, RECEIPT),
                                   (EXPORT_DIR / 'dragon-mechanical-red-v001.glb', EXPORT_DIR / 'dragon-mechanical-red-v001-export.json')]:
            backup = path.with_name(path.stem + '-exporter-unadjusted.glb')
            assert not backup.exists(), backup
            shutil.copyfile(path, backup)
            result = normalize_exported_pivots(path, RAW)
            info = json.loads(receipt_path.read_text(encoding='utf-8'))
            info['optimized'] = glb_summary(path)[0]
            info['gltfPivotNormalization'] = result
            if 'blueOptimizedBaseline' in info:
                info['blueOptimizedBaseline'] = glb_summary(OPTIMIZED)[0]
            receipt_path.write_text(json.dumps(info, indent=2), encoding='utf-8')
            print('PIVOTS_NORMALIZED', path.name, json.dumps(result), flush=True)
    elif '--red-palette' in sys.argv:
        export_red_candidate()
    else:
        main()
