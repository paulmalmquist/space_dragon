"""Bake the reviewed SD-059 section and export a separately optimized candidate.

1024 atlas is based on measured 62-101px gameplay head and ~400px close review.
Selected-to-active Cycles normal bake transfers four-segment bevels and source
surface detail to one-segment game edges. AO is baked separately, never color.
"""
import bpy, json, math, hashlib, collections, struct, sys
from pathlib import Path
from mathutils import Matrix, Vector, Quaternion
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import export_mechanical_dragon as common
SD=ROOT/'assets/source/local/spacecraft/space-dragon-spacecraft'
BASE_OUT=ROOT/'assets/game/local/spacecraft/space-dragon-spacecraft/cinematic-v001'
REVISION=sys.argv[sys.argv.index('--revision')+1] if '--revision' in sys.argv else 'v001'
OUT=BASE_OUT if REVISION=='v001' else BASE_OUT.parent/('cinematic-'+REVISION)
SOURCE=SD/'Space Dragon Spacecraft-v003-cinematic.blend'
GAME=SD/('Space Dragon Spacecraft-v003-game-'+REVISION+'.blend')
RAW=OUT/('dragon-cinematic-benchmark-raw-'+REVISION+'.glb')
FINAL=OUT/('dragon-cinematic-benchmark-'+REVISION+'.glb')
def select(objects,active=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects: o.hide_set(False); o.select_set(True)
    bpy.context.view_layer.objects.active=active or objects[0]
def move(o,col):
    for c in list(o.users_collection): c.objects.unlink(o)
    col.objects.link(o)
def baked_image(name,noncolor=True):
    img=bpy.data.images.new(name,1024,1024,alpha=False); img.colorspace_settings.name='Non-Color' if noncolor else 'sRGB'
    return img
def image_target(obj,img):
    for mat in obj.data.materials:
        nt=mat.node_tree
        n=next((n for n in nt.nodes if n.type=='TEX_IMAGE' and n.label=='Bake target'),None) or nt.nodes.new('ShaderNodeTexImage')
        n.label='Bake target'; n.image=img; nt.nodes.active=n
def save_image(img):
    img.filepath_raw=str(OUT/(img.name+'.png')); img.file_format='PNG'; img.save(); img.pack()
def apply_except_armature(o):
    select([o])
    for mod in list(o.modifiers):
        if mod.type=='ARMATURE': o.modifiers.remove(mod)
        elif mod.type=='BEVEL': mod.segments=1; bpy.ops.object.modifier_apply(modifier=mod.name)
        else: bpy.ops.object.modifier_apply(modifier=mod.name)

def normalize(path,reference_paths,desired_blender):
    def doc(p):
        data=p.read_bytes(); n=struct.unpack_from('<I',data,12)[0]; return data,json.loads(data[20:20+n])
    def worlds(g):
        parents={c:i for i,n in enumerate(g['nodes']) for c in n.get('children',[])}; cache={}
        def world(i):
            if i in cache:return cache[i]
            n=g['nodes'][i]
            if 'matrix' in n: v=n['matrix']; mat=Matrix([[v[c*4+r] for c in range(4)] for r in range(4)])
            else:
                q=n.get('rotation',[0,0,0,1]); mat=Matrix.LocRotScale(Vector(n.get('translation',[0,0,0])),Quaternion((q[3],q[0],q[1],q[2])),Vector(n.get('scale',[1,1,1])))
            cache[i]=world(parents[i])@mat if i in parents else mat; return cache[i]
        return parents,world
    desired={}
    for p in reference_paths:
        _,g=doc(p); _,world=worlds(g)
        for i,n in enumerate(g['nodes']):
            if 'name' in n and 'mesh' in n: desired[n['name']]=world(i)
    desired['socket_muzzle']=Matrix.Translation((0,.5,-3.66))
    data,g=doc(path); parents,world=worlds(g); count=0
    for i,n in enumerate(g['nodes']):
        if n.get('name') not in desired or 'mesh' in n: continue
        par=world(parents[i]) if i in parents else Matrix.Identity(4); loc=par.inverted()@desired[n['name']]; t,r,s=loc.decompose()
        for k in ['matrix','translation','rotation','scale']: n.pop(k,None)
        n.update(translation=list(t),rotation=[r.x,r.y,r.z,r.w],scale=list(s)); count+=1
    g['asset'].setdefault('extras',{})['pivotNormalization']='SD059 source-rest-world'
    js=json.dumps(g,separators=(',',':')).encode(); js+=b' '*(-len(js)%4); oldn=struct.unpack_from('<I',data,12)[0]; tail=data[20+oldn:]
    path.write_bytes(struct.pack('<4sII',b'glTF',2,20+len(js)+len(tail))+struct.pack('<II',len(js),0x4e4f534a)+js+tail)
    return count

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE),use_scripts=False)
    scene=bpy.context.scene; rig=bpy.data.objects['SpaceDragonRig']
    highcol=bpy.data.collections['Cinematic Upgrade - head neck left shoulder']; bodycol=bpy.data.collections['Retained Body - unchanged geometry']
    high=list(highcol.objects); body=[o for o in bodycol.objects if o.type=='MESH']
    gamecol=bpy.data.collections.new('Game Candidate - optimized v001'); scene.collection.children.link(gamecol)
    skeleton={b.name:[list(r) for r in b.matrix_local] for b in rig.data.bones}
    source_hightris=0
    deps=bpy.context.evaluated_depsgraph_get()
    for o in high:
        ev=o.evaluated_get(deps); mesh=ev.to_mesh(); mesh.calc_loop_triangles(); source_hightris+=len(mesh.loop_triangles); ev.to_mesh_clear()
    # Keep exact new source component names/rest pivots via raw export before batching.
    common.export(RAW,[rig,*body,*high])
    print('RAW_READY',flush=True)
    lows=[]
    for o in high:
        cp=o.copy(); cp.data=o.data.copy(); cp.name='LOW_'+o.name; gamecol.objects.link(cp); cp['sourceName']=o.name
        for mod in cp.modifiers:
            if mod.type=='ARMATURE':mod.show_viewport=False
            elif mod.type=='BEVEL':mod.segments=1
        # Freeze the exact topology used by the bake. Rebuilding nonplanar
        # ngons later can choose different diagonals and change tangent frames.
        tri=cp.modifiers.new('Stable bake and game triangles','TRIANGULATE')
        if hasattr(tri,'keep_custom_normals'):tri.keep_custom_normals=True
        lows.append(cp)
    bpy.context.view_layer.update(); deps=bpy.context.evaluated_depsgraph_get()
    evaluated_meshes=[bpy.data.meshes.new_from_object(o.evaluated_get(deps),preserve_all_data_layers=True,depsgraph=deps) for o in lows]
    for o,me in zip(lows,evaluated_meshes):o.data=me;o.modifiers.clear()
    print('LOW_MESHES_READY',len(lows),flush=True)
    select(lows)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.005,area_weight=.15)
    bpy.ops.uv.average_islands_scale()
    bpy.ops.object.mode_set(mode='OBJECT')
    # Equal world-area density first; head receives 1.5x linear UV allocation.
    for o in lows:
        if o.get('detailRegion')=='head':
            for loop in o.data.uv_layers.active.data: loop.uv*=1.5
    select(lows); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.pack_islands(margin=.008,rotate=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    # Explode matched high/low pairs for NORMAL ONLY: adjacent plates and tiny
    # collars must not project the neighbor's normal into this component.
    offsets=[]
    for index,(hi,lo) in enumerate(zip(high,lows)):
        offset=Vector(((index%16)*6.,(index//16)*6.,0)); offsets.append(offset)
        attr=lo.data.attributes.new('sd059_bake_part','INT','POINT')
        attr.data.foreach_set('value',[index]*len(lo.data.vertices))
        hi.location+=offset;lo.location+=offset
    bpy.context.view_layer.update()
    # Keep all region weights while joining into a bake target, avoiding duplicated UV ranges.
    select(lows); bpy.ops.object.join(); low=bpy.context.object; low.name='SD3_AtlasBakeTarget'
    low.parent=rig
    # Copies of the source material become the atlas set; the original source remains procedural.
    for slot in low.material_slots:
        cp=slot.material.copy(); cp.name=slot.material.name+'_Atlas'; slot.material=cp
    scene.render.engine='CYCLES'; scene.cycles.samples=16; scene.cycles.use_denoising=False
    scene.render.bake.use_selected_to_active=True; scene.render.bake.cage_extrusion=.015; scene.render.bake.max_ray_distance=.05; scene.render.bake.margin=8
    normal=baked_image('SD059_section_normal'); image_target(low,normal)
    select([*high,low],low)
    bpy.ops.object.bake(type='NORMAL',use_clear=True)
    save_image(normal); print('NORMAL_BAKED',flush=True)
    # Restore exact assembled coordinates before AO, roughness and export.
    part=low.data.attributes['sd059_bake_part']
    for vertex,entry in zip(low.data.vertices,part.data):vertex.co-=offsets[entry.value]
    low.data.attributes.remove(part)
    for hi,offset in zip(high,offsets):hi.location-=offset
    low.data.update();bpy.context.view_layer.update()
    # Separate AO bake against the game geometry, with the high duplicate hidden.
    for o in high: o.hide_render=True
    ao=baked_image('SD059_section_ao'); image_target(low,ao); select([low]); scene.render.bake.use_selected_to_active=False
    bpy.ops.object.bake(type='AO',use_clear=True); save_image(ao); print('AO_BAKED',flush=True)
    rough=baked_image('SD059_section_roughness'); image_target(low,rough)
    bpy.ops.object.bake(type='ROUGHNESS',use_clear=True); save_image(rough); print('ROUGHNESS_BAKED',flush=True)
    # Exporter-recognized node group stores AO without darkening base color.
    group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree')
    group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
    for mat in low.data.materials:
        nt=mat.node_tree; p=next(n for n in nt.nodes if n.type=='BSDF_PRINCIPLED')
        for sock in ['Normal','Roughness']:
            for link in list(p.inputs[sock].links):nt.links.remove(link)
        n=nt.nodes.new('ShaderNodeTexImage'); n.image=normal; nm=nt.nodes.new('ShaderNodeNormalMap')
        # Paint keeps a quiet surface at the measured gameplay texel density;
        # geometric bevels carry the silhouette, while metal retains stronger grain.
        nm.inputs['Strength'].default_value=.22 if 'Crimson painted' in mat.name else .18 if 'Dark painted' in mat.name else .72
        nt.links.new(n.outputs['Color'],nm.inputs['Color']); nt.links.new(nm.outputs['Normal'],p.inputs['Normal'])
        rr=nt.nodes.new('ShaderNodeTexImage'); rr.image=rough; nt.links.new(rr.outputs['Color'],p.inputs['Roughness'])
        a=nt.nodes.new('ShaderNodeTexImage'); a.image=ao; gn=nt.nodes.new('ShaderNodeGroup'); gn.node_tree=group; nt.links.new(a.outputs['Color'],gn.inputs['Occlusion'])
        mat['authoredSurface']=True; mat['atlasSize']=1024; mat['normalSource']='Cycles selected-to-active source bevel/surface bake'; mat['aoSeparate']=True
    # Bake target has a mix of Root/Jaw/Wing_L weights. Split by material and bone
    # during batch collection below; all source names continue as transform markers.
    components=json.loads((BASE_OUT/'source-components.json').read_text())
    new_components={o.name:{'world':[list(r) for r in o.matrix_world],'bone':[g.name for g in o.vertex_groups]} for o in high}
    original_names=set(components)
    batches=collections.defaultdict(lambda:{'verts':[],'faces':[],'normals':[],'uvs':[],'smooth':[],'components':[]})
    flexible=[]
    for obj in [*body,low]:
        if obj!=low and (len(common.used_bones(obj))!=1 or len(obj.data.materials)!=1):continue
        for mod in obj.modifiers:
            if mod.type=='ARMATURE':mod.show_viewport=False
            elif mod.type=='BEVEL' and mod.segments>1 and max(obj.dimensions)<.8:mod.segments=1
    bpy.context.view_layer.update(); dep=bpy.context.evaluated_depsgraph_get()
    for obj in [*body,low]:
        bones=common.used_bones(obj)
        if obj!=low and (len(bones)!=1 or len(obj.data.materials)!=1):
            flexible.append(obj); move(obj,gamecol); continue
        ev=obj.evaluated_get(dep); mesh=ev.to_mesh(preserve_all_data_layers=True,depsgraph=dep)
        world=obj.matrix_world; nm=world.inverted_safe().transposed().to_3x3(); uv=mesh.uv_layers.active
        vgroups={g.index:g.name for g in obj.vertex_groups}
        for face in mesh.polygons:
            bone=bones[0] if obj!=low else vgroups[mesh.vertices[face.vertices[0]].groups[0].group]
            mat=obj.data.materials[face.material_index]; key=(bone,mat.name); batch=batches[key]
            start=len(batch['verts']); batch['faces'].append(tuple(range(start,start+len(face.vertices)))); batch['smooth'].append(face.use_smooth)
            for li in face.loop_indices:
                loop=mesh.loops[li]; pos=world@mesh.vertices[loop.vertex_index].co; batch['verts'].append(tuple(pos)); batch['normals'].append(tuple((nm@mesh.corner_normals[li].vector).normalized()))
                if obj==low:batch['uvs'].append(tuple(uv.data[li].uv))
                else:
                    no=(nm@face.normal).normalized(); drop=max(range(3),key=lambda a:abs(no[a])); axes=[a for a in range(3) if a!=drop]; batch['uvs'].append((pos[axes[0]],pos[axes[1]]))
            if obj.name not in batch['components']:batch['components'].append(obj.name)
        ev.to_mesh_clear()
    for obj in [*body,low]:
        if obj not in flexible:obj.hide_render=True;obj.hide_set(True)
    print('BATCH_DATA_READY',len(batches),flush=True)
    render=[]
    for (bone,matname),batch in sorted(batches.items()):
        name='SDG3_'+bone+'_'+matname; mesh=bpy.data.meshes.new(name); mesh.from_pydata(batch['verts'],[],batch['faces']); mesh.update()
        for face,smooth in zip(mesh.polygons,batch['smooth']):face.use_smooth=smooth
        mesh.normals_split_custom_set(batch['normals']); uv=mesh.uv_layers.new(name='SectionAtlas' if matname.endswith('_Atlas') else 'BodySurfaceUV')
        for loop,co in zip(uv.data,batch['uvs']):loop.uv=co
        mesh.materials.append(bpy.data.materials[matname]); obj=bpy.data.objects.new(name,mesh); gamecol.objects.link(obj); obj.parent=rig
        g=obj.vertex_groups.new(name=bone); g.add(list(range(len(mesh.vertices))),1,'REPLACE'); a=obj.modifiers.new('Preserved articulation','ARMATURE');a.object=rig
        obj['sourceComponents']=batch['components']; render.append(obj)
    # Pure PBR constants for unchanged body; procedural source survives in original/source.
    atlas_materials={mat for mat in low.data.materials}
    for mat in {m for o in [*render,*flexible] for m in o.data.materials if m} - atlas_materials:
        p=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        for socket in ['Normal','Roughness']:
            for link in list(p.inputs[socket].links):mat.node_tree.links.remove(link)
    nodes=[]
    for name,info in {**components,**new_components}.items():
        old=bpy.data.objects.get(name)
        if old in flexible:continue
        if old:old.name='SOURCE_ONLY_'+name
        node=bpy.data.objects.new(name,None); gamecol.objects.link(node); node.parent=rig; node.parent_type='BONE'
        node.parent_bone=info['bone'][0] if len(info['bone'])==1 else 'Root'
        node['sourceComponentName']=name; node['sourceRestMatrixBlenderRowMajor']=[v for row in info['world'] for v in row]; nodes.append(node)
    bpy.context.view_layer.update()
    for node in nodes:
        values=node['sourceRestMatrixBlenderRowMajor'];node.matrix_world=Matrix([values[i*4:i*4+4] for i in range(4)])
    muzzle=common.make_muzzle(rig,gamecol)
    rig['assetId']='space-dragon-cinematic-benchmark-'+REVISION; rig['surfaceKind']='mechanical'; rig['benchmarkScope']='Head neck left shoulder; body geometry retained'
    assert skeleton=={b.name:[list(r) for r in b.matrix_local] for b in rig.data.bones}
    for o in high:o.hide_render=True;o.hide_set(True)
    low.hide_render=True;low.hide_set(True)
    bpy.context.view_layer.update()
    export_objects=[rig,*render,*flexible,*nodes,muzzle]
    select(export_objects)
    bpy.ops.wm.save_as_mainfile(filepath=str(GAME))
    common.select_objects(export_objects)
    bpy.ops.export_scene.gltf(filepath=str(FINAL),export_format='GLB',use_selection=True,
        export_cameras=False,export_lights=False,export_animations=False,export_skins=True,
        export_def_bones=False,export_leaf_bone=False,export_rest_position_armature=True,
        export_apply=True,export_yup=True,export_extras=True,export_materials='EXPORT',
        export_unused_images=False,export_unused_textures=False,
        export_hierarchy_flatten_bones=False,export_hierarchy_flatten_objs=False,
        export_armature_object_remove=False,export_shared_accessors=True,export_tangents=True,
        export_draco_mesh_compression_enable=False,export_meshopt_compression_enable=False)
    count=normalize(FINAL,[ROOT/'assets/game/local/spacecraft/space-dragon-spacecraft/dragon-mechanical-v002-raw.glb',RAW],{})
    summary,gltf=common.glb_summary(FINAL)
    report={'assetId':'space-dragon-cinematic-benchmark-'+REVISION,'blender':bpy.app.version_string,'source':str(SOURCE),'sourceSha256':common.digest(SOURCE),'sourceHighSectionTriangles':source_hightris,'gameBlend':str(GAME),'gameBlendSha256':common.digest(GAME),'raw':common.glb_summary(RAW)[0],'optimized':summary,'sourceBones':skeleton,'oldNamesPreserved':original_names.issubset({n.get('name') for n in gltf['nodes']}),'markerCount':len(nodes),'normalizedPivots':count,'gameRenderBatches':len(render),'flexibleMeshes':[o.name for o in flexible],'atlas':{'resolution':1024,'headLinearAllocation':1.5,'normal':'Cycles selected-to-active matched exploded pairs, source bevels and procedural microscopic response; cage .015m/ray .05m; restored before AO','ao':'Cycles AO separate from base color','roughness':'Cycles roughness bake','images':[normal.name,ao.name,rough.name]},'scope':'Head, neck, left shoulder. No independent neck bone. Body geometry retained; palette updated.'}
    (OUT/'export-receipt.json').write_text(json.dumps(report,indent=2)); print('EXPORT_READY',json.dumps(summary),flush=True)

if __name__=='__main__': main()
