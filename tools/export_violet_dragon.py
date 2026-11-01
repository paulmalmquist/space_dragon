"""Export the separately baked organic game collection; preserve every source rig."""
import bpy, json, struct, hashlib, sys
from pathlib import Path
from mathutils import Matrix
ROOT=Path(r'C:\Projects\space_dragon')
OUT=ROOT/'assets/game/local/spacecraft/space-dragon-spacecraft/violet-v007'
sys.path.insert(0,str(ROOT/'tools'))
from export_heroic_dragon import repair_tangents

def main():
    prior_path=OUT/'export-receipt.json'
    prior=json.loads(prior_path.read_text()) if prior_path.exists() else {}
    for filename,key in [('dragon-violet-v007.glb','sha256'),('dragon-violet-v007-raw.glb','rawSha256')]:
      path=OUT/filename
      if path.exists() and (not prior.get(key) or hashlib.sha256(path.read_bytes()).hexdigest()!=prior[key]):
        raise RuntimeError('Preserve changed/unreceipted export and choose a new version: '+str(path))
    col=bpy.data.collections['Violet Dragon v007 - game candidate'];rig=bpy.data.objects['VioletFlightRig']
    source=Path(bpy.data.filepath);source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
    rig.animation_data.action=None
    for track in rig.animation_data.nla_tracks:track.mute=True
    for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
    rig.data.pose_position='POSE';bpy.context.scene.frame_set(0)
    bpy.ops.object.select_all(action='DESELECT')
    for o in col.objects:o.hide_set(False);o.select_set(True)
    bpy.context.view_layer.objects.active=rig;bpy.context.view_layer.update()
    raw=OUT/'dragon-violet-v007-raw.glb';final=OUT/'dragon-violet-v007.glb'
    bpy.ops.export_scene.gltf(filepath=str(raw),export_format='GLB',use_selection=True,
      export_cameras=False,export_lights=False,export_animations=True,export_animation_mode='ACTIONS',
      export_anim_single_armature=True,export_frame_range=False,export_optimize_animation_size=False,
      export_skins=True,export_def_bones=False,export_leaf_bone=False,export_rest_position_armature=True,
      export_apply=True,export_yup=True,export_extras=True,export_materials='EXPORT',
      export_unused_images=False,export_unused_textures=False,export_hierarchy_flatten_bones=False,
      export_hierarchy_flatten_objs=False,export_armature_object_remove=False,export_shared_accessors=True,
      export_tangents=True,export_draco_mesh_compression_enable=False,export_meshopt_compression_enable=False)
    data=raw.read_bytes();n=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+n]);binary=data[28+n:]
    clips=[]
    for a in doc.get('animations',[]):
      if a['name'] not in ['Flight.001','Glide.001','Boost.001']:continue
      a['name']=a['name'].split('.')[0]
      a['channels']=[c for c in a['channels'] if c['target']['path']=='rotation' and doc['nodes'][c['target']['node']]['name'] not in ['Root','Jaw','VioletFlightRig']]
      clips.append(a)
    assert sorted(a['name'] for a in clips)==['Boost','Flight','Glide'],[a['name'] for a in doc.get('animations',[])]
    doc['animations']=clips
    for node in doc['nodes']:
      if node.get('name','').startswith('socket_'):node['name']=node['name'].split('.')[0]
    for material in doc['materials']:
      # Every organic atlas and special surface is dielectric; ORM blue is zero.
      material.setdefault('pbrMetallicRoughness',{})['metallicFactor']=0
    doc['asset'].setdefault('extras',{}).update(assetId='space-dragon-violet-v007',assetContractVersion=2,
      rigProfile='violet-organic-15',forwardAxis='-Z',upAxis='+Y',metersPerUnit=1,authoredPresentation=True,
      source=source.name,sourceSha256=source_hash,materialApproximation='Core PBR; opaque double-sided membrane; separate per-mesh AO; procedural bump normal bake')
    binary,repairs=repair_tangents(doc,binary)
    doc['buffers'][0]['byteLength']=len(binary);binary+=b'\0'*(-len(binary)%4)
    encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*(-len(encoded)%4)
    final.write_bytes(struct.pack('<4sII',b'glTF',2,28+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary)
    receipt={'source':str(source),'sourceSha256':source_hash,'sourceUnchanged':source_hash==hashlib.sha256(source.read_bytes()).hexdigest(),
      'output':str(final),'sha256':hashlib.sha256(final.read_bytes()).hexdigest(),'bytes':final.stat().st_size,
      'raw':str(raw),'rawSha256':hashlib.sha256(raw.read_bytes()).hexdigest(),
      'triangles':sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives']),
      'materials':len(doc['materials']),'meshes':len(doc['meshes']),'clips':[a['name'] for a in clips],
      'tangentRepairs':repairs,'scope':'Selected organic collection export, independent 15-bone flight rest; validation and Unity review pending.'}
    (OUT/'export-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
if __name__=='__main__':main()
