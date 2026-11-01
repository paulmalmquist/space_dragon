"""Export the owner-authored heroic v005 game collection without editing its source.

Blender supplies new geometry/materials. Preserved v003 rest pivots, sockets and
rotation-only clips remain authoritative. Never exports source/review collections.
Run with Blender --background --python-exit-code 1 --python tools/export_heroic_dragon.py.
"""
import bpy, copy, hashlib, json, struct, sys, subprocess
from pathlib import Path
from mathutils import Matrix, Quaternion, Vector

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from asset_output_guard import assert_generated_output
SOURCE = ROOT / 'assets/source/local/spacecraft/space-dragon-spacecraft/Space Dragon Spacecraft-v005-heroic.blend'
BASE = ROOT / 'public/assets/dogfight/models/dragon-flight-v003.glb'
OUT = ROOT / 'assets/game/local/spacecraft/space-dragon-spacecraft/heroic-v005'
RAW = OUT / 'dragon-heroic-v005-raw.glb'
FINAL = OUT / 'dragon-heroic-v005.glb'
RECEIPT = OUT / 'export-receipt.json'
COLLECTION = 'Game Candidate - heroic v005'
BONES = ['Root', 'Wing_L', 'Wing_R', 'Jaw', *['Tail_' + str(i) for i in range(5)]]
SOCKETS = ['socket_' + s for s in ['muzzle', 'wing_l', 'wing_r', 'thruster_l', 'thruster_r', 'target', 'camera', 'ground']]

def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def read_glb(path):
    data = path.read_bytes()
    assert data[:4] == b'glTF' and struct.unpack_from('<I', data, 8)[0] == len(data)
    size = struct.unpack_from('<I', data, 12)[0]; end = 20 + size
    return json.loads(data[20:end]), data[end+8:]
def write_glb(path, doc, binary):
    binary += b'\0' * (-len(binary) % 4); doc['buffers'][0]['byteLength'] = len(binary)
    blob = json.dumps(doc, separators=(',', ':')).encode(); blob += b' ' * (-len(blob) % 4)
    path.write_bytes(struct.pack('<4sII', b'glTF', 2, 28+len(blob)+len(binary)) + struct.pack('<II',len(blob),0x4e4f534a) + blob + struct.pack('<II',len(binary),0x004e4942) + binary)
def worlds(doc):
    parents = {child: i for i, node in enumerate(doc['nodes']) for child in node.get('children', [])}
    cache = {}
    def world(index):
        if index in cache: return cache[index]
        n = doc['nodes'][index]
        if 'matrix' in n:
            a = n['matrix']; local = Matrix([[a[c*4+r] for c in range(4)] for r in range(4)])
        else:
            q = n.get('rotation', [0,0,0,1]); local = Matrix.LocRotScale(Vector(n.get('translation',[0,0,0])), Quaternion((q[3],q[0],q[1],q[2])), Vector(n.get('scale',[1,1,1])))
        cache[index] = (world(parents[index]) if index in parents else Matrix.Identity(4)) @ local
        return cache[index]
    return parents, world
def repair_tangents(doc, binary):
    """Repair only undefined exporter bases; preserve all valid authored tangents.

    Collapsed atlas UV corners can produce zero vectors. Reconstruct from
    adjacent UV derivatives, with a stable orthogonal basis only when undefined.
    """
    data = bytearray(binary); repairs = []
    def rows(index):
        a = doc['accessors'][index]; v = doc['bufferViews'][a['bufferView']]
        size = {'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
        fmt = {5121:'B',5123:'H',5125:'I',5126:'f'}[a['componentType']]
        width = struct.calcsize('<'+fmt*size); stride = v.get('byteStride',width)
        offset = v.get('byteOffset',0)+a.get('byteOffset',0)
        return [struct.unpack_from('<'+fmt*size,data,offset+i*stride) for i in range(a['count'])], offset, stride
    for mesh in doc['meshes']:
        for primitive in mesh['primitives']:
            material = doc['materials'][primitive['material']]
            if not material.get('normalTexture'): continue
            attrs = primitive['attributes']; assert 'TANGENT' in attrs, ('Mapped mesh missing tangent export',mesh['name'])
            tangents, offset, stride = rows(attrs['TANGENT'])
            invalid = [i for i,t in enumerate(tangents) if Vector(t[:3]).length < .9]
            if not invalid: continue
            positions,_,_ = rows(attrs['POSITION']); normals,_,_ = rows(attrs['NORMAL']); uv,_,_ = rows(attrs['TEXCOORD_0'])
            indices = [a[0] for a in rows(primitive['indices'])[0]]
            sums = [Vector((0,0,0)) for _ in positions]
            for i in range(0,len(indices),3):
                a,b,c = indices[i:i+3]
                du1,dv1 = uv[b][0]-uv[a][0],uv[b][1]-uv[a][1]
                du2,dv2 = uv[c][0]-uv[a][0],uv[c][1]-uv[a][1]
                determinant = du1*dv2-du2*dv1
                if abs(determinant)<1e-12: continue
                direction = ((Vector(positions[b])-Vector(positions[a]))*dv2-(Vector(positions[c])-Vector(positions[a]))*dv1)/determinant
                for vertex in [a,b,c]: sums[vertex]+=direction
            fallback = 0
            for index in invalid:
                n = Vector(normals[index]).normalized(); t = sums[index]-n*n.dot(sums[index])
                if t.length<1e-8:
                    axis = Vector((1,0,0)) if abs(n.x)<.7 else Vector((0,1,0))
                    t = axis-n*n.dot(axis); fallback+=1
                t.normalize(); sign = -1.0 if tangents[index][3]<0 else 1.0
                struct.pack_into('<ffff',data,offset+index*stride,t.x,t.y,t.z,sign)
            repairs.append({'mesh':mesh['name'],'invalidTangentsRepaired':len(invalid),'collapsedUvFallback':fallback})
    return bytes(data), repairs
def normalize_and_carry():
    doc, binary = read_glb(RAW); old, old_binary = read_glb(BASE)
    names = {}
    for i, n in enumerate(doc['nodes']):
        if n.get('name') in names: raise RuntimeError('Duplicate exported node: ' + n['name'])
        names[n.get('name')] = i
    old_names = {n.get('name'): i for i, n in enumerate(old['nodes'])}
    parents, world = worlds(doc); _, old_world = worlds(old)
    for name in BONES:
        assert name in names, ('Missing rest bone', name)
        assert max(abs(a-b) for r1,r2 in zip(world(names[name]),old_world(old_names[name])) for a,b in zip(r1,r2)) < 1e-6, ('Rest bone changed', name)
    markers = [n['name'] for n in old['nodes'] if n.get('extras',{}).get('sourceComponentName')]
    # v003 includes 706 original markers plus the SD-059 head/shoulder markers.
    assert len(markers) >= 706
    for name in [*markers, *SOCKETS]:
        index = names[name]; node = doc['nodes'][index]
        assert 'mesh' not in node, ('Preserved pivot unexpectedly has render geometry', name)
        parent = parents.get(index)
        local = (world(parent).inverted() if parent is not None else Matrix.Identity(4)) @ old_world(old_names[name])
        t, q, s = local.decompose()
        for key in ['matrix','translation','rotation','scale']: node.pop(key, None)
        node.update(translation=list(t),rotation=[q.x,q.y,q.z,q.w],scale=list(s))
        # Keep provenance metadata for original component markers/attachments.
        node.setdefault('extras',{}).update(old['nodes'][old_names[name]].get('extras',{}))
    accessor_map, view_map = {}, {}
    def accessor(index):
        nonlocal binary
        if index in accessor_map: return accessor_map[index]
        item = copy.deepcopy(old['accessors'][index]); assert 'sparse' not in item
        vi = item['bufferView']
        if vi not in view_map:
            view = copy.deepcopy(old['bufferViews'][vi]); offset = view.get('byteOffset',0)
            binary += b'\0' * (-len(binary) % 4)
            view['byteOffset'] = len(binary); view['buffer'] = 0
            binary += old_binary[offset:offset+view['byteLength']]
            view_map[vi] = len(doc['bufferViews']); doc['bufferViews'].append(view)
        item['bufferView'] = view_map[vi]
        accessor_map[index] = len(doc['accessors']); doc['accessors'].append(item)
        return accessor_map[index]
    doc['animations'] = []
    for prior in old['animations']:
        animation = copy.deepcopy(prior)
        for channel in animation['channels']: channel['target']['node'] = names[old['nodes'][channel['target']['node']]['name']]
        for sampler in animation['samplers']:
            sampler['input'] = accessor(sampler['input']); sampler['output'] = accessor(sampler['output'])
        doc['animations'].append(animation)
    doc['asset'].setdefault('extras',{}).update(old['asset']['extras'])
    doc['asset']['extras'].update(assetId='space-dragon-heroic-v005', source=SOURCE.name, sourceSha256=digest(SOURCE), authoredArmor=True,
        animationSource='Exact v003 Blender-authored clips carried forward by bone name', animationBaselineSha256=digest(BASE),
        pivotNormalization=str(len(markers)) + ' source component markers and eight sockets from preserved v003 rest worlds')
    binary, repairs = repair_tangents(doc,binary)
    write_glb(FINAL, doc, binary)
    return doc, len(markers), repairs

def main():
    assert_generated_output(RAW, RECEIPT, 'rawSha256'); assert_generated_output(FINAL, RECEIPT, 'sha256')
    source_hash, baseline_hash = digest(SOURCE), digest(BASE); OUT.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE), use_scripts=False)
    rig = bpy.data.objects['SpaceDragonRig']; collection = bpy.data.collections[COLLECTION]
    rest = {b.name:[list(row) for row in b.matrix_local] for b in rig.data.bones}
    assert list(rest) == BONES
    render = [o for o in collection.all_objects if o.type == 'MESH' and not o.hide_render]
    markers = [o for o in collection.all_objects if o.type == 'EMPTY' and (o.get('sourceComponentName') or o.name in SOCKETS)]
    assert render and len({o.name for o in markers if o.get('sourceComponentName')}) >= 706
    assert all(any(o.name == s for o in markers) for s in SOCKETS)
    if rig.animation_data: rig.animation_data.action = None
    for bone in rig.pose.bones: bone.matrix_basis = Matrix.Identity(4)
    bpy.context.scene.frame_set(1)
    rig.data.pose_position = 'REST'
    bpy.ops.object.select_all(action='DESELECT')
    collection.hide_viewport = False; collection.hide_render = False
    for o in [rig,*render,*markers]: o.hide_set(False); o.select_set(True)
    bpy.context.view_layer.objects.active = rig; bpy.context.view_layer.update()
    bpy.ops.export_scene.gltf(filepath=str(RAW), export_format='GLB', use_selection=True,
        export_cameras=False, export_lights=False, export_animations=False, export_skins=True,
        export_def_bones=False, export_leaf_bone=False, export_rest_position_armature=True,
        export_apply=True, export_yup=True, export_extras=True, export_materials='EXPORT',
        export_unused_images=False, export_unused_textures=False, export_hierarchy_flatten_bones=False,
        export_hierarchy_flatten_objs=False, export_armature_object_remove=False, export_shared_accessors=True,
        export_tangents=True, export_draco_mesh_compression_enable=False, export_meshopt_compression_enable=False)
    assert rest == {b.name:[list(row) for row in b.matrix_local] for b in rig.data.bones}
    doc, count, tangent_repairs = normalize_and_carry()
    summary = {'assetId':'space-dragon-heroic-v005','blender':bpy.app.version_string,'source':str(SOURCE),'sourceSha256':source_hash,
        'sourceUnchanged':digest(SOURCE)==source_hash,'baseline':str(BASE),'baselineUnchanged':digest(BASE)==baseline_hash,
        'baselineSha256':baseline_hash,'raw':str(RAW),'rawSha256':digest(RAW),'output':str(FINAL),'sha256':digest(FINAL),
        'bytes':FINAL.stat().st_size,'meshes':len(doc['meshes']),'materials':len(doc['materials']),
        'triangles':sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives']),
        'normalizedOriginalPivots':count,'sockets':SOCKETS,'restBones':rest,'clips':[a['name'] for a in doc['animations']], 'tangentRepairs':tangent_repairs,
        'scope':'Fresh selected geometry; exact reviewed clip data and rest markers. File verifier/browser review required.'}
    RECEIPT.write_text(json.dumps(summary,indent=2))
    subprocess.run(['node',str(ROOT/'tools/optimize-heroic-dragon.mjs')],cwd=str(ROOT),check=True)
    print('HEROIC_EXPORT_READY',RECEIPT.read_text(),flush=True)
if __name__ == '__main__': main()
