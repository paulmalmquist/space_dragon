"""Export selected Oscar candidate and derive exact-time Glide/Boost GLB clips.

Run only by the Blender owner against the saved prepared master. No scene/model
promotion, source save, network calls or subprocesses. Previous files are refused.
"""
import argparse
import bisect
import copy
from contextlib import contextmanager
import hashlib
import inspect
import json
import math
from pathlib import Path
import struct
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from oscar_dragon_intake import file_hash

# Reviewed Blender 5.2 installed extractor. Fail closed on an implementation change;
# review again rather than assuming a private exporter API remains compatible.
BLENDER_52_EXTRACTOR_SHA256 = '43efd7072bb3fb9aad223032f011ec751cbc7fc0f0707ab4f07bee066cfb7fc0'


@contextmanager
def preserve_positive_export_weights():
    """Remove Blender 5.2's implicit epsilon only for this export, then restore it.

    export_all_influences disables the set-count cap, but the installed extractor
    independently drops weights <= 0.0001. This scoped replacement retains every
    positive prepared assignment without changing installed files or mesh data.
    """
    from io_scene_gltf2.blender.exp.primitive_extract import PrimitiveCreator
    method_name = '_PrimitiveCreator__get_bone_data'
    original = getattr(PrimitiveCreator, method_name)
    implementation = inspect.getsource(original)
    implementation_hash = hashlib.sha256(implementation.encode()).hexdigest()
    if implementation_hash != BLENDER_52_EXTRACTOR_SHA256 or tuple(inspect.signature(original).parameters) != ('self',):
        raise RuntimeError('Installed glTF extractor changed; review its influence policy before export')
    audit = {'method': 'Scoped positive-weight extractor; original implementation restored in finally',
             'installedExtractorSha256': implementation_hash,
             'installedDiscardThreshold': .0001, 'candidateDiscardThreshold': 0,
             'meshes': [], 'restored': False}

    def extract(self):
        by_name = {joint.name: index for index, joint in enumerate(self.skin.joints)}
        group_joints = {group.index: by_name.get(group.name) for group in self.blender_vertex_groups}
        rows, smallest, maximum = [], None, 0
        for vertex in self.blender_mesh.vertices:
            row = []
            for assignment in vertex.groups:
                weight = assignment.weight
                if not math.isfinite(weight) or weight < 0:
                    raise RuntimeError('Invalid skin influence during extraction')
                if weight == 0:
                    continue
                joint = group_joints.get(assignment.group)
                if joint is None:
                    raise RuntimeError('Positive skin assignment references an unexported joint')
                row.append((joint, weight))
                smallest = weight if smallest is None else min(smallest, weight)
            if not row:
                raise RuntimeError('Unexpected unweighted candidate vertex during export')
            row.sort(key=lambda pair: (-pair[1], pair[0]))
            rows.append(row)
            maximum = max(maximum, len(row))
        self.need_neutral_bone = False
        self.vert_bones = rows
        self.num_joint_sets = (maximum + 3) // 4
        audit['meshes'].append({'name': self.blender_mesh.name, 'vertices': len(rows),
                                'maximumInfluences': maximum, 'minimumPositiveWeight': smallest})

    setattr(PrimitiveCreator, method_name, extract)
    try:
        yield audit
    finally:
        setattr(PrimitiveCreator, method_name, original)
        audit['restored'] = getattr(PrimitiveCreator, method_name) is original


def accessor_rows(document, binary, index):
    accessor = document['accessors'][index]
    if 'sparse' in accessor:
        raise RuntimeError('Unexpected sparse accessor')
    view = document['bufferViews'][accessor['bufferView']]
    width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[accessor['type']]
    kind = {5121: 'B', 5123: 'H', 5125: 'I', 5126: 'f'}[accessor['componentType']]
    fmt = '<' + kind * width
    stride = view.get('byteStride', struct.calcsize(fmt))
    start = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
    rows = [struct.unpack_from(fmt, binary, start + i * stride) for i in range(accessor['count'])]
    if accessor.get('normalized'):
        divisor = {5121: 255, 5123: 65535}.get(accessor['componentType'])
        if divisor is None:
            raise RuntimeError('Unexpected normalized skin accessor component type')
        rows = [tuple(value / divisor for value in row) for row in rows]
    return rows


def audit_skin_sets(document, binary, expected_maximum):
    """Inspect all sets; a valid first set alone cannot prove complete skinning."""
    instances, maximum, minimum, sum_error = [], 0, None, 0.0
    for node in document['nodes']:
        if 'mesh' not in node:
            continue
        if 'skin' not in node:
            raise RuntimeError('Candidate render mesh is missing its skin')
        skin = document['skins'][node['skin']]
        for primitive_index, primitive in enumerate(document['meshes'][node['mesh']]['primitives']):
            attributes = primitive['attributes']
            joint_sets = sorted(int(key[7:]) for key in attributes if key.startswith('JOINTS_'))
            weight_sets = sorted(int(key[8:]) for key in attributes if key.startswith('WEIGHTS_'))
            if not joint_sets or joint_sets != weight_sets or joint_sets != list(range(len(joint_sets))):
                raise RuntimeError('Skin sets must be paired and contiguous from zero')
            joints = [accessor_rows(document, binary, attributes['JOINTS_' + str(index)]) for index in joint_sets]
            weights = [accessor_rows(document, binary, attributes['WEIGHTS_' + str(index)]) for index in weight_sets]
            count = document['accessors'][attributes['POSITION']]['count']
            if any(len(rows) != count for rows in joints + weights):
                raise RuntimeError('Skin and position accessor counts differ')
            local_maximum = 0
            for vertex in range(count):
                influences, total, positive_joints = 0, 0.0, set()
                for joint_rows, weight_rows in zip(joints, weights):
                    for joint, weight in zip(joint_rows[vertex], weight_rows[vertex]):
                        if not 0 <= joint < len(skin['joints']) or not math.isfinite(weight) or weight < 0:
                            raise RuntimeError('Invalid exported skin joint/weight')
                        if weight > 0:
                            if joint in positive_joints:
                                raise RuntimeError('Duplicate positive joint influence on a vertex')
                            positive_joints.add(joint)
                            influences += 1
                            total += weight
                            minimum = weight if minimum is None else min(minimum, weight)
                if not 1 <= influences <= 255 or abs(total - 1) > 1e-5:
                    raise RuntimeError('Exported aggregate weights are not normalized or exceed Unity byte count')
                local_maximum = max(local_maximum, influences)
                sum_error = max(sum_error, abs(total - 1))
            maximum = max(maximum, local_maximum)
            instances.append({'node': node.get('name'), 'primitive': primitive_index,
                              'sets': joint_sets, 'vertices': count, 'maximumInfluences': local_maximum})
    if not instances or maximum != expected_maximum:
        raise RuntimeError('Export changed the measured maximum influence count: ' + str((maximum, expected_maximum)))
    return {'maximumInfluences': maximum, 'minimumPositiveWeight': minimum,
            'maximumAggregateSumDeviationFromOne': sum_error, 'primitives': instances,
            'method': 'All paired contiguous JOINTS_i/WEIGHTS_i checked against each mesh skin; every positive weight counted'}


def derive_clips(document, binary, held_time, boost_speed):
    from mathutils import Quaternion
    if len(document.get('animations', [])) != 1:
        raise RuntimeError('Active-action export must produce exactly one Flight clip')
    flight = document['animations'][0]
    flight['name'] = 'Flight'
    joints = {i for skin in document.get('skins', []) for i in skin['joints']}
    selected = []
    for channel in flight['channels']:
        sampler = flight['samplers'][channel['sampler']]
        if sampler.get('interpolation', 'LINEAR') not in ('LINEAR', 'STEP'):
            raise RuntimeError('Force-sampled Flight unexpectedly uses cubic interpolation')
        if channel['target']['node'] not in joints:
            values = accessor_rows(document, binary, sampler['output'])
            if any(abs(a - b) > 1e-6 for value in values for a, b in zip(values[0], value)):
                raise RuntimeError('Unexpected animated non-joint node: ' + document['nodes'][channel['target']['node']].get('name', ''))
            continue  # Proven static transforms already live on the exported nodes.
        selected.append(channel)
    flight['channels'] = selected
    if not selected:
        raise RuntimeError('No authored Flight joint channels exported')
    data = bytearray(binary)
    def append(values, kind):
        nonlocal data
        data += b'\0' * (-len(data) % 4)
        start = len(data)
        for row in values:
            data += struct.pack('<' + 'f' * len(row), *row)
        view = len(document['bufferViews'])
        document['bufferViews'].append({'buffer': 0, 'byteOffset': start, 'byteLength': len(data) - start})
        result = {'bufferView': view, 'componentType': 5126, 'count': len(values), 'type': kind}
        if kind == 'SCALAR':
            result.update(min=[min(v[0] for v in values)], max=[max(v[0] for v in values)])
        document['accessors'].append(result)
        return len(document['accessors']) - 1
    glide = {'name': 'Glide', 'samplers': [], 'channels': []}
    boost = {'name': 'Boost', 'samplers': [], 'channels': []}
    glide_time = append([(0,), (1,)], 'SCALAR')
    boost_inputs = {}
    for channel in selected:
        original = flight['samplers'][channel['sampler']]
        times = [row[0] for row in accessor_rows(document, binary, original['input'])]
        values = accessor_rows(document, binary, original['output'])
        index = max(0, min(len(times) - 2, bisect.bisect_right(times, held_time) - 1))
        next_index = min(index + 1, len(times) - 1)
        fraction = 0 if times[next_index] == times[index] else max(0, min(1, (held_time - times[index]) / (times[next_index] - times[index])))
        if original.get('interpolation') == 'STEP':
            fraction = 0
        if channel['target']['path'] == 'rotation':
            a, b = values[index], values[next_index]
            q = Quaternion((a[3], a[0], a[1], a[2])).slerp(Quaternion((b[3], b[0], b[1], b[2])), fraction)
            held = (q.x, q.y, q.z, q.w)
        else:
            held = tuple(a + (b - a) * fraction for a, b in zip(values[index], values[next_index]))
        output_type = document['accessors'][original['output']]['type']
        glide_output = append([held, held], output_type)
        glide['channels'].append({'sampler': len(glide['samplers']), 'target': copy.deepcopy(channel['target'])})
        glide['samplers'].append({'input': glide_time, 'output': glide_output, 'interpolation': 'LINEAR'})
        if original['input'] not in boost_inputs:
            boost_inputs[original['input']] = append([(time / boost_speed,) for time in times], 'SCALAR')
        boost['channels'].append({'sampler': len(boost['samplers']), 'target': copy.deepcopy(channel['target'])})
        boost['samplers'].append({**original, 'input': boost_inputs[original['input']]})
    document['animations'] = [flight, glide, boost]
    return bytes(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preparation', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--receipt', type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    import bpy
    from mathutils import Vector, Matrix
    from prepare_oscar_dragon import COLLECTION, RIG, assign, set_frame
    from export_heroic_dragon import read_glb, write_glb, worlds, repair_tangents
    prepared_bytes = args.preparation.read_bytes()
    prepared = json.loads(prepared_bytes)
    source = Path(bpy.data.filepath).resolve()
    output = args.output.resolve()
    receipt_path = (args.receipt or output.parent / 'export-receipt.json').resolve()
    raw = output.with_name(output.stem + '-raw.glb')
    if any(path.exists() for path in [output, raw, receipt_path]):
        raise FileExistsError('Preserve previous raw/final exports and receipts; choose a fresh version')
    if (prepared['result'] != 'GAME_CANDIDATE_PREPARED' or prepared['weightReduction']['gate'] != 'PASS'
            or prepared['jawReview']['gate'] != 'PASS'):
        raise RuntimeError('Source deformation/weight review gate is not passing; export is blocked')
    source_hash = file_hash(source)
    if source != Path(prepared['output']).resolve() or source_hash != prepared['outputSha256']:
        raise RuntimeError('The opened candidate differs from its preparation receipt')
    collection = bpy.data.collections.get(COLLECTION)
    rig = bpy.data.objects.get(RIG)
    if collection is None or rig is None:
        raise RuntimeError('Prepared candidate collection/rig missing')
    policy = prepared['weightReduction']
    full_weights = policy.get('requestedWeightLimit') == 0
    if full_weights and (not policy.get('retainedAllPositiveAssignments') or policy['verticesTrimmed'] != 0
                         or policy['maxAllowedMetres'] > .001 or policy['p95AllowedMetres'] > .001):
        raise RuntimeError('Full-weight preservation evidence is incomplete or its gate was loosened')
    # The exporter must preserve the explicitly prepared policy, including tiny weights.
    candidate_maximum = 0
    for obj in collection.objects:
        if obj.type != 'MESH':
            continue
        for vertex in obj.data.vertices:
            positive = [group.weight for group in vertex.groups if group.weight > 0]
            candidate_maximum = max(candidate_maximum, len(positive))
            if not 1 <= len(positive) <= 255 or abs(sum(positive) - 1) > 1e-5:
                raise RuntimeError('Candidate weights violate measured full-set normalization')
    if candidate_maximum != policy['maximumCandidateInfluences']:
        raise RuntimeError('Candidate maximum influences differ from preparation receipt')
    assign(rig, bpy.data.actions['Flight'])
    rig.data.pose_position = 'POSE'
    set_frame(bpy.context.scene, 0)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in collection.objects:
        obj.hide_set(False)
        obj.hide_render = False
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    output.parent.mkdir(parents=True, exist_ok=True)
    with preserve_positive_export_weights() as extractor_audit:
        bpy.ops.export_scene.gltf(filepath=str(raw), export_format='GLB', use_selection=True, use_active_scene=True,
        export_cameras=False, export_lights=False, export_animations=True,
        export_animation_mode='ACTIVE_ACTIONS', export_nla_strips_merged_animation_name='Flight',
        export_force_sampling=True, export_frame_range=False, export_frame_step=1,
        export_optimize_animation_size=False, export_optimize_animation_keep_anim_armature=True,
        export_anim_slide_to_zero=True, export_skins=True, export_all_influences=True,
        export_def_bones=False, export_leaf_bone=False, export_rest_position_armature=True,
        export_apply=True, export_yup=True, export_extras=True, export_materials='EXPORT',
        export_unused_images=False, export_unused_textures=False,
        export_hierarchy_flatten_bones=False, export_hierarchy_flatten_objs=False,
        export_armature_object_remove=False, export_shared_accessors=True,
        export_tangents=True, export_draco_mesh_compression_enable=False, export_meshopt_compression_enable=False)
    document, binary = read_glb(raw)
    expected_mesh_nodes = {obj.name for obj in collection.objects if obj.type == 'MESH'}
    actual_mesh_nodes = {node.get('name') for node in document['nodes'] if 'mesh' in node}
    if len(document.get('scenes', [])) != 1 or actual_mesh_nodes != expected_mesh_nodes:
        raise RuntimeError('Export includes another scene or objects outside the selected game collection')
    if not extractor_audit['restored'] or not extractor_audit['meshes']:
        raise RuntimeError('Positive-weight exporter hook was not applied and restored')
    skin_audit = audit_skin_sets(document, binary, candidate_maximum)
    binary = derive_clips(document, binary, prepared['clipDerivations']['Glide']['heldSourceFrame'] / 30, 1.15)
    binary, tangent_repairs = repair_tangents(document, binary)
    document['asset'].setdefault('extras', {}).update({
        'assetId': 'oscar-dragon-v001', 'assetContractVersion': 1, 'rigProfile': 'oscar-creativo-flight',
        'forwardAxis': '+Z', 'upAxis': '+Y', 'metersPerUnit': 1, 'authoredPresentation': True,
        'source': source.name, 'sourceSha256': source_hash,
        'weightLimit': policy.get('requestedWeightLimit', 4), 'maximumInfluences': candidate_maximum,
        'fullSourceInfluencesPreserved': full_weights})
    named = {}
    for index, node in enumerate(document['nodes']):
        name = node.get('name')
        if not name or name in named:
            raise RuntimeError('All exported nodes must have unique names')
        named[name] = index
    required_sockets = ['socket_' + suffix for suffix in ['muzzle', 'wing_l', 'wing_r', 'thruster_l', 'thruster_r', 'target', 'camera', 'ground']]
    if any(name not in named for name in required_sockets):
        raise RuntimeError('Required attachment missing after export')
    parents, world = worlds(document)
    jaw_axis = (world(named['jawbone.x']).to_3x3().inverted() @ Vector((1, 0, 0))).normalized()
    actual_world_axis = (world(named['jawbone.x']).to_3x3() @ jaw_axis).normalized()
    blender_world = Matrix(prepared['jawReview']['restWorldMatrixBlender'])
    blender_world_axis = (blender_world.to_3x3() @ Vector(prepared['jawReview']['localAxisBlender'])).normalized()
    converted_world_axis = Vector((blender_world_axis.x, blender_world_axis.z, -blender_world_axis.y))
    axis_difference = (actual_world_axis - converted_world_axis).length
    if axis_difference > 1e-5:
        raise RuntimeError('Export jaw-local axis does not reproduce the measured Blender hinge direction')
    clips = []
    for clip in document['animations']:
        duration = max(max(row[0] for row in accessor_rows(document, binary, sampler['input'])) for sampler in clip['samplers'])
        clips.append({'name': clip['name'], 'durationSeconds': duration,
                      'channels': [{'bone': document['nodes'][c['target']['node']]['name'], 'path': c['target']['path']} for c in clip['channels']]})
    expected = prepared['clipDerivations']
    if any(abs(clip['durationSeconds'] - expected[clip['name']]['durationSeconds']) > .0001 for clip in clips):
        raise RuntimeError('Exported clip duration differs from recorded derivation')
    write_glb(output, document, binary)
    if file_hash(source) != source_hash:
        raise RuntimeError('Export unexpectedly modified saved source')
    triangles = sum(document['accessors'][p['indices']]['count'] // 3 for mesh in document['meshes'] for p in mesh['primitives'])
    receipt = {'schemaVersion': 1, 'source': str(source), 'sourceSha256': source_hash,
        'sourceUnchanged': True, 'output': str(output), 'sha256': file_hash(output), 'bytes': output.stat().st_size,
        'raw': str(raw), 'rawSha256': file_hash(raw), 'triangles': triangles,
        'preparationReceipt': str(args.preparation.resolve()), 'preparationSha256': file_hash(args.preparation),
        'rigProfile': 'oscar-creativo-flight', 'normalization': prepared['normalization'],
        'coordinateSystem': {'metersPerUnit': 1, 'sourceForward': '+Z', 'sourceUp': '+Y', 'gameplayForward': '+Z', 'sourceBasisYawDegrees': 0},
        'presentation': {'jawBone': 'jawbone.x', 'jawAxis': list(jaw_axis), 'jawScale': prepared['jawReview']['jawScale'],
                         'jawMinRadians': -.5, 'jawMaxRadians': 0, 'sampleRate': 30,
                         'damageSockets': ['socket_target', 'socket_thruster_l', 'socket_muzzle']},
        'clips': clips, 'clipDerivations': prepared['clipDerivations'],
        'jawAxisAudit': {'sourceBlenderLocal': prepared['jawReview']['localAxisBlender'], 'exportGltfLocal': list(jaw_axis),
                        'convertedBlenderWorldAxis': list(converted_world_axis), 'gltfWorldAxis': list(actual_world_axis),
                        'difference': axis_difference, 'jawOpeningChecks': prepared['jawReview']['checks'],
                        'method': 'Derive glTF local axis from actual exported jaw world basis; compare its world direction with Blender hinge transformed +Zup to+Yup'},
        'deformationChecks': prepared['deformationChecks'], 'weightReduction': prepared['weightReduction'],
        'skinExportAudit': skin_audit, 'influenceExtractor': extractor_audit,
        'sockets': [{'name': name, 'parent': document['nodes'][parents[named[name]]]['name'],
                     'worldMatrix': [world(named[name])[r][c] for c in range(4) for r in range(4)]} for name in required_sockets],
        'tangentRepairs': tangent_repairs, 'modifications': prepared['modifications'] + ['Selected glTF export with every positive prepared skin influence across contiguous weight sets; scoped exporter epsilon removed and original method restored', 'FullTRS Flight and exact-time derived Glide/Boost; glTF tangent validation/repair where undefined'],
        'limitations': prepared['limitations'] + ['Export is not Unity deformation/material/performance verification or source-art approval; jaw axis/muzzle remain candidate review items']}
    with receipt_path.open('x', encoding='utf8') as stream:
        json.dump(receipt, stream, indent=2)
        stream.write('\n')
    print(json.dumps({'result': 'EXPORTED_CANDIDATE', 'file': str(output), 'bytes': receipt['bytes'], 'triangles': triangles, 'receipt': str(receipt_path)}))


if __name__ == '__main__':
    main()
