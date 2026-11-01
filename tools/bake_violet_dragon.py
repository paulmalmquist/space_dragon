"""Bake the prepared SD-080 v007 game mesh; never run against editable source.

Run inside the root-owned Blender process (or an exclusive background process):
  main(['--object', 'VD7 Game Body', '--output-dir', '/absolute/new/bakes',
        '--pass', 'base-color'])
Repeat with normal, roughness, ao, then finalize. ``all`` performs those steps.
The prepared v007 .blend must already be saved. This helper never saves a blend,
exports, changes weights/rigs, or touches the source material node trees. Finalize
changes only eligible material slots on the explicitly named game object.

Body UVs must be non-overlapping, inside 0..1, with an appropriate bake margin.
Bake in the intended bind/rest configuration. Tangent normals capture procedural
bump on this mesh, NOT a high-to-low projection. Source meshes/review geometry
are hidden from the temporary bake; AO measures this candidate's self-occlusion.
Eye/emissive, membrane/transmissive and mouth materials are retained by default.
--include-material explicitly permits matching membrane/transmissive roles to
be baked to opaque, double-sided core PBR; eye/emission/mouth stay protected.
Subsurface/transmission remain an approximation requiring actual glTF review.

API references: https://docs.blender.org/api/current/bpy.ops.object.html#bpy.ops.object.bake
https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html#materials
"""

import argparse
from array import array
from contextlib import contextmanager
import hashlib
import json
import math
from pathlib import Path
import sys
import time

import bpy


OWNER = 'SD080_violet_v007_body_bakes_v001'
COLLECTION = 'Violet Dragon v007 - game candidate'
PASSES = ('base-color', 'normal', 'roughness', 'ao')
FILES = {name: 'violet-body-' + name + '.png' for name in PASSES}
FILES['orm'] = 'violet-body-orm.png'


def _sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def _json(path, value):
    pending = path.with_suffix(path.suffix + '.pending')
    pending.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')
    pending.replace(path)


def _special(material, extra, include):
    label = (material.name + ' ' + str(material.get('surfaceRole', ''))).lower()
    if any(word in label for word in ('iris', 'eye', 'mouth', *extra)):
        return True
    if not material.use_nodes:
        raise RuntimeError('Body material needs a node tree: ' + material.name)
    principled = [n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED']
    if len(principled) != 1:
        raise RuntimeError('Expected one Principled shader: ' + material.name)
    shader = principled[0]
    emission = shader.inputs.get('Emission Strength')
    color = shader.inputs.get('Emission Color')
    transmission = shader.inputs.get('Transmission Weight')
    emissive = bool(emission and (emission.is_linked or emission.default_value > 0)
                    and color and (color.is_linked or max(color.default_value[:3]) > 0))
    if emissive:
        return True
    membrane_or_transmissive = ('membrane' in label or bool(
        transmission and (transmission.is_linked or transmission.default_value > 0)))
    return membrane_or_transmissive and not any(word in label for word in include)


def _material_signature(material):
    result = {'name': material.name, 'nodes': [], 'links': []}
    if not material.use_nodes:
        return result
    for node in material.node_tree.nodes:
        values = {}
        for socket in node.inputs:
            if hasattr(socket, 'default_value'):
                value = socket.default_value
                if isinstance(value, (float, int, str, bool)):
                    values[socket.identifier] = value
                elif hasattr(value, '__iter__'):
                    values[socket.identifier] = list(value)
        item = {'name': node.name, 'type': node.bl_idname, 'inputs': values}
        if hasattr(node, 'color_ramp'):
            item['ramp'] = [(e.position, list(e.color)) for e in node.color_ramp.elements]
        if hasattr(node, 'operation'):
            item['operation'] = node.operation
        result['nodes'].append(item)
    result['links'] = sorted((l.from_node.name, l.from_socket.identifier,
                              l.to_node.name, l.to_socket.identifier)
                             for l in material.node_tree.links)
    return result


def _inspect(args):
    source = Path(bpy.data.filepath)
    if not source.is_file() or 'v007' not in source.name.lower():
        raise RuntimeError('Save a separate v007 working .blend before baking.')
    collection = bpy.data.collections.get(COLLECTION)
    obj = bpy.data.objects.get(args.object)
    if collection is None or obj is None or obj.type != 'MESH' or obj.name not in collection.all_objects:
        raise RuntimeError('Object must be a mesh inside ' + COLLECTION)
    if any(c != collection for c in obj.users_collection):
        raise RuntimeError('Use a separate object linked only to the game-candidate collection, not an editable-source object.')
    if bpy.context.mode != 'OBJECT':
        raise RuntimeError('Switch to Object mode before baking.')
    uv = obj.data.uv_layers.get(args.uv_map) if args.uv_map else obj.data.uv_layers.active
    if uv is None:
        raise RuntimeError('Prepare a non-overlapping active UV layer first.')
    if not obj.material_slots or any(slot.material is None for slot in obj.material_slots):
        raise RuntimeError('Every candidate material slot needs a material.')
    if any(not all(math.isfinite(x) and -1e-5 <= x <= 1.00001 for x in loop.uv) for loop in uv.data):
        raise RuntimeError('The body atlas UVs must remain in 0..1.')
    eligible = [i for i, slot in enumerate(obj.material_slots)
                if not _special(slot.material, tuple(x.lower() for x in args.preserve_material),
                                tuple(x.lower() for x in args.include_material))]
    if not eligible:
        raise RuntimeError('No eligible body material slots; special surfaces remain separate.')
    if any(obj.material_slots[i].material.get('generatedBy') == OWNER for i in eligible):
        raise RuntimeError('This object is already finalized; reopen the preserved procedural game candidate.')
    used = [p for p in obj.data.polygons if p.material_index in eligible]
    if not used:
        raise RuntimeError('Eligible materials have no faces.')
    zero_area = 0
    eligible_uv_area = 0.0
    for poly in used:
        points = [uv.data[i].uv for i in poly.loop_indices]
        area = abs(sum(a.x * b.y - b.x * a.y for a, b in zip(points, points[1:] + points[:1]))) * .5
        zero_area += area < 1e-12
        eligible_uv_area += area
    if zero_area:
        raise RuntimeError(f'{zero_area} body faces have collapsed UVs; repair before baking.')
    if eligible_uv_area < .01:
        raise RuntimeError(
            f'Eligible faces occupy aggregate UV area {eligible_uv_area:.8f} '
            f'({eligible_uv_area * 100:.4f}% of a unit atlas; '
            f'about {eligible_uv_area * args.resolution ** 2:,.1f} pixel-area units). '
            'Less than 1% is not a usable allocation for this candidate. '
            'Inspect unwrap and selection: use face-selection mode, clear stale '
            'vertex/edge selections, then select only the intended faces and repack. '
            'This area sum does not detect overlap; overlapping faces can inflate it.')
    geometry = hashlib.sha256()
    for vertex in obj.data.vertices:
        geometry.update(repr(tuple(vertex.co)).encode())
    for poly in obj.data.polygons:
        geometry.update(repr((tuple(poly.vertices), poly.material_index)).encode())
    for loop in uv.data:
        geometry.update(repr(tuple(loop.uv)).encode())
    identity = {
        'sourcePath': str(source), 'sourceSha256': _sha(source),
        'object': obj.name, 'collection': COLLECTION, 'uvLayer': uv.name,
        'geometryUvSha256': geometry.hexdigest(), 'resolution': args.resolution,
        'samples': args.samples, 'margin': args.margin,
        'eligibleFaceCount': len(used),
        'eligibleFaceUvArea': eligible_uv_area,
        'eligibleFaceUvPixelAreaEstimate': eligible_uv_area * args.resolution ** 2,
        'uvAreaMethod': 'Sum of absolute polygon UV areas; multiplied by resolution squared for pixel-area estimate. Overlaps can inflate this sum; not unique pixel coverage or non-overlap proof.',
        'includeMaterial': args.include_material, 'preserveMaterial': args.preserve_material,
        'bodySlots': eligible, 'preservedSlots': [i for i in range(len(obj.material_slots)) if i not in eligible],
        'materials': [_material_signature(slot.material) for slot in obj.material_slots],
        'worldMatrix': [list(row) for row in obj.matrix_world],
        'armaturePose': {mod.object.name: {b.name: [list(row) for row in b.matrix]
                         for b in mod.object.pose.bones} for mod in obj.modifiers
                         if mod.type == 'ARMATURE' and mod.object is not None},
    }
    identity['fingerprint'] = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
    return obj, uv.name, eligible, identity


def _load_receipt(output, identity):
    output.mkdir(parents=True, exist_ok=True)
    path = output / 'bake-receipt.json'
    if path.exists():
        receipt = json.loads(path.read_text(encoding='utf-8'))
        if receipt.get('generatedBy') != OWNER or receipt.get('identity', {}).get('fingerprint') != identity['fingerprint']:
            raise RuntimeError('Bake folder belongs to a different source/UV/settings; select a fresh output directory.')
        for record in receipt.get('images', {}).values():
            file = output / record['file']
            if not file.is_file() or _sha(file) != record['sha256']:
                raise RuntimeError('Preserving modified/missing bake: ' + str(file))
    else:
        if any((output / name).exists() for name in FILES.values()):
            raise RuntimeError('Existing textures lack a matching receipt; select a fresh directory.')
        receipt = {'generatedBy': OWNER, 'blender': bpy.app.version_string,
                   'identity': identity, 'images': {}, 'finalized': False,
                   'scope': 'Self-bake of prepared game mesh. No high-to-low detail projection; no player validation.',
                   'limitations': ['UV overlap/texel density needs visual review.',
                                  'Eye/emissive/mouth remain separate; membrane/transmission retained unless explicitly included.',
                                  'Included membrane is opaque double-sided core PBR; subsurface/transmission are not reproduced.',
                                  'AO stays separate from base color; organic metallic channel is zero.',
                                  'Source subsurface/coat/sheens are not reproduced by the core body atlas.']}
        _json(path, receipt)
    return receipt


@contextmanager
def _bake_copy(obj, uv_name, body_slots, image, sink, samples):
    scene = bpy.context.scene
    selected = list(bpy.context.selected_objects)
    active = bpy.context.view_layer.objects.active
    visible = {other: other.hide_render for other in scene.objects if other.type == 'MESH'}
    engine, device, old_samples = scene.render.engine, scene.cycles.device, scene.cycles.samples
    old_bake = {name: getattr(scene.render.bake, name) for name in
                ('use_pass_direct', 'use_pass_indirect', 'use_pass_color', 'use_selected_to_active',
                 'use_clear', 'margin', 'normal_space', 'normal_r', 'normal_g', 'normal_b', 'target')}
    copies, temporary = [], None
    try:
        temporary = obj.copy()
        temporary.data = obj.data.copy()
        temporary.name = '__SD080_BAKE_TEMP__'
        scene.collection.objects.link(temporary)
        temporary.hide_render = False
        temporary.hide_viewport = False
        temporary.hide_set(False)
        temporary.data.uv_layers.active = temporary.data.uv_layers[uv_name]
        temporary.data.uv_layers[uv_name].active_render = True
        for other in visible:
            other.hide_render = True
        for slot in temporary.material_slots:
            slot.link = 'DATA'
        for index, source_slot in enumerate(obj.material_slots):
            material = source_slot.material.copy()
            copies.append(material)
            temporary.data.materials[index] = material
            nodes = material.node_tree.nodes
            for node in nodes:
                node.select = False
            target = nodes.new('ShaderNodeTexImage')
            target.name = '__SD080_BAKE_TARGET__'
            target.image = image if index in body_slots else sink
            target.select = True
            nodes.active = target
        bpy.ops.object.select_all(action='DESELECT')
        temporary.select_set(True)
        bpy.context.view_layer.objects.active = temporary
        scene.render.engine = 'CYCLES'
        scene.cycles.device = 'CPU'
        scene.cycles.samples = samples
        bpy.context.view_layer.update()
        yield temporary
    finally:
        if temporary is not None:
            mesh = temporary.data
            bpy.data.objects.remove(temporary, do_unlink=True)
            bpy.data.meshes.remove(mesh)
        for material in copies:
            if material.users == 0:
                bpy.data.materials.remove(material)
        for other, hidden in visible.items():
            other.hide_render = hidden
        scene.render.engine, scene.cycles.device, scene.cycles.samples = engine, device, old_samples
        for name, value in old_bake.items():
            setattr(scene.render.bake, name, value)
        bpy.ops.object.select_all(action='DESELECT')
        for other in selected:
            other.select_set(True)
        bpy.context.view_layer.objects.active = active
        bpy.context.view_layer.update()


def _new_image(name, size, color_space):
    image = bpy.data.images.new(name, width=size, height=size, alpha=False, float_buffer=False)
    image.colorspace_settings.name = color_space
    return image


def _record_image(image, name, output, receipt, elapsed=None):
    file = output / FILES[name]
    if file.exists():
        raise RuntimeError('Refusing to overwrite an existing bake image: ' + str(file))
    image.filepath_raw = str(file)
    image.file_format = 'PNG'
    image.save()
    record = {'file': file.name, 'bytes': file.stat().st_size, 'sha256': _sha(file),
              'width': image.size[0], 'height': image.size[1],
              'colorSpace': image.colorspace_settings.name}
    if elapsed is not None:
        record['seconds'] = elapsed
    receipt['images'][name] = record
    _json(output / 'bake-receipt.json', receipt)
    print(json.dumps({'baked': name, **record}), flush=True)


def _bake_pass(name, obj, uv, slots, args, output, receipt):
    if name in receipt['images']:
        print('Verified existing pass: ' + name, flush=True)
        return
    if (output / FILES[name]).exists():
        raise RuntimeError('Unreceipted pass exists; preserve it and use a new directory.')
    space = 'sRGB' if name == 'base-color' else 'Non-Color'
    image = _new_image('__SD080_' + name, args.resolution, space)
    sink = _new_image('__SD080_preserved_slots', args.resolution, space)
    started = time.perf_counter()
    try:
        with _bake_copy(obj, uv, slots, image, sink, args.samples):
            bake_type = {'base-color': 'DIFFUSE', 'normal': 'NORMAL', 'roughness': 'ROUGHNESS', 'ao': 'AO'}[name]
            kwargs = dict(type=bake_type, target='IMAGE_TEXTURES', use_selected_to_active=False,
                          use_clear=True, margin=args.margin, uv_layer=uv)
            if name == 'base-color':
                kwargs['pass_filter'] = {'COLOR'}
            if name == 'normal':
                kwargs.update(normal_space='TANGENT', normal_r='POS_X', normal_g='POS_Y', normal_b='POS_Z')
            status = bpy.ops.object.bake(**kwargs)
            if 'FINISHED' not in status:
                raise RuntimeError('Bake did not finish: ' + repr(status))
        _record_image(image, name, output, receipt, time.perf_counter() - started)
    finally:
        bpy.data.images.remove(image)
        bpy.data.images.remove(sink)


def _load_image(output, record):
    image = bpy.data.images.load(str(output / record['file']), check_existing=False)
    image.colorspace_settings.name = record['colorSpace']
    return image


def _pack_orm(args, output, receipt):
    if 'orm' in receipt['images']:
        return
    ao = _load_image(output, receipt['images']['ao'])
    rough = _load_image(output, receipt['images']['roughness'])
    image = _new_image('__SD080_ORM', args.resolution, 'Non-Color')
    try:
        count = args.resolution * args.resolution
        pixels = array('f', [0]) * (count * 4)
        values = array('f', [0]) * (count * 4)
        ao.pixels.foreach_get(values)
        pixels[0::4] = values[0::4]
        rough.pixels.foreach_get(values)
        pixels[1::4] = values[0::4]
        pixels[3::4] = array('f', [1]) * count
        image.pixels.foreach_set(pixels)
        image.update()
        _record_image(image, 'orm', output, receipt)
    finally:
        bpy.data.images.remove(ao)
        bpy.data.images.remove(rough)
        bpy.data.images.remove(image)


def _finalize(obj, uv, slots, args, output, receipt):
    missing = [name for name in PASSES if name not in receipt['images']]
    if missing:
        raise RuntimeError('Finish passes before finalizing: ' + ', '.join(missing))
    _pack_orm(args, output, receipt)
    if bpy.data.materials.get(args.material_name) is not None:
        raise RuntimeError('Preserving existing material; choose a fresh --material-name.')
    material = bpy.data.materials.new(args.material_name)
    material.use_nodes = True
    material.use_backface_culling = False
    material['generatedBy'] = OWNER
    material['bakeFingerprint'] = receipt['identity']['fingerprint']
    material['requiresBakeForGame'] = False
    material['surfaceRole'] = 'Baked organic atlas'
    material['includedMaterialRoles'] = json.dumps(args.include_material)
    material['membraneApproximation'] = 'Opaque double-sided core PBR; no subsurface or transmission'
    nodes, links = material.node_tree.nodes, material.node_tree.links
    nodes.clear()
    shader = nodes.new('ShaderNodeBsdfPrincipled')
    shader.location = (420, 100)
    shader.inputs['Metallic'].default_value = 0
    output_node = nodes.new('ShaderNodeOutputMaterial')
    output_node.location = (720, 100)
    links.new(shader.outputs['BSDF'], output_node.inputs['Surface'])
    uv_node = nodes.new('ShaderNodeUVMap')
    uv_node.uv_map = uv
    uv_node.location = (-820, 160)
    textures = {}
    for index, name in enumerate(('base-color', 'normal', 'orm')):
        node = nodes.new('ShaderNodeTexImage')
        node.name = 'Body ' + name
        node.location = (-600, 360 - index * 300)
        node.image = _load_image(output, receipt['images'][name])
        links.new(uv_node.outputs['UV'], node.inputs['Vector'])
        textures[name] = node
    links.new(textures['base-color'].outputs['Color'], shader.inputs['Base Color'])
    normal = nodes.new('ShaderNodeNormalMap')
    normal.space = 'TANGENT'
    normal.uv_map = uv
    normal.location = (100, -100)
    links.new(textures['normal'].outputs['Color'], normal.inputs['Color'])
    links.new(normal.outputs['Normal'], shader.inputs['Normal'])
    channels = nodes.new('ShaderNodeSeparateColor')
    channels.mode = 'RGB'
    channels.location = (-200, -340)
    links.new(textures['orm'].outputs['Color'], channels.inputs['Color'])
    links.new(channels.outputs['Green'], shader.inputs['Roughness'])
    links.new(channels.outputs['Blue'], shader.inputs['Metallic'])
    # Exporter discovers this group by exact name; reuse only a compatible group.
    group = bpy.data.node_groups.get('glTF Material Output')
    if group is None:
        group = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
        group.interface.new_socket(name='Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
        group.nodes.new('NodeGroupInput')
    ao_node = nodes.new('ShaderNodeGroup')
    ao_node.node_tree = group
    ao_node.location = (110, -380)
    if 'Occlusion' not in ao_node.inputs:
        raise RuntimeError('Existing glTF Material Output group lacks Occlusion; preserve it and resolve before finalize.')
    links.new(channels.outputs['Red'], ao_node.inputs['Occlusion'])
    # export_apply can read mesh material datablocks instead of object overrides.
    # Make only this game mesh single-user, preserve every effective special slot,
    # then write DATA slots. Never mutate shared editable-source mesh materials.
    old_mesh_name = obj.data.name
    mesh_was_shared = obj.data.users > 1
    effective_materials = [slot.material for slot in obj.material_slots]
    if mesh_was_shared:
        obj.data = obj.data.copy()
        obj.data.name = old_mesh_name + ' - baked game copy'
    for index, effective in enumerate(effective_materials):
        obj.data.materials[index] = effective
        obj.material_slots[index].link = 'DATA'
    for slot_index in slots:
        obj.data.materials[slot_index] = material
    receipt['finalized'] = True
    receipt['material'] = material.name
    receipt['assignedBodySlots'] = slots
    receipt['opaqueDoubleSided'] = True
    receipt['materialSlotMode'] = 'DATA'
    receipt['copiedSharedGameMesh'] = mesh_was_shared
    receipt['priorMeshName'] = old_mesh_name
    receipt['finalMeshName'] = obj.data.name
    receipt['blendSavedByHelper'] = False
    _json(output / 'bake-receipt.json', receipt)
    print('Finalized body slots only. Save the candidate explicitly after visual review.', flush=True)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--object', required=True, help='One prepared game mesh, never an editable source object')
    parser.add_argument('--output-dir', required=True, type=Path)
    parser.add_argument('--pass', dest='bake_pass', choices=(*PASSES, 'finalize', 'all'), default='all')
    parser.add_argument('--resolution', type=int, default=2048)
    parser.add_argument('--samples', type=int, default=16)
    parser.add_argument('--margin', type=int, default=12)
    parser.add_argument('--uv-map', default='')
    parser.add_argument('--preserve-material', action='append', default=[], help='Additional case-insensitive name/role substring to keep separate')
    parser.add_argument('--include-material', action='append', default=[],
                        help='Explicit name/role substring allowing membrane/transmission into the opaque atlas; never overrides eye/emission/mouth or preserve-material')
    parser.add_argument('--material-name', default='SD080_Violet_v007_Baked_Body')
    args = parser.parse_args(argv)
    if any(not word.strip() for word in (*args.include_material, *args.preserve_material)):
        parser.error('Material role substrings must not be empty.')
    if not 128 <= args.resolution <= 8192 or not 1 <= args.samples <= 128 or not 0 <= args.margin <= 128:
        parser.error('Use resolution128..8192, samples1..128 and margin0..128.')
    obj, uv, slots, identity = _inspect(args)
    output = args.output_dir.resolve()
    receipt = _load_receipt(output, identity)
    for name in PASSES if args.bake_pass == 'all' else (() if args.bake_pass == 'finalize' else (args.bake_pass,)):
        _bake_pass(name, obj, uv, slots, args, output, receipt)
    if args.bake_pass in ('all', 'finalize'):
        _finalize(obj, uv, slots, args, output, receipt)
    return receipt


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
