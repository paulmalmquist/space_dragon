"""Enrich the approved dragon with Blender-authored clips and named sockets.

Run with Blender --background --python tools/export_dragon_flight.py.
This never changes the live session or existing source/export. Animation data
comes from Blender's glTF exporter; its channels are merged into the reviewed
GLB so its verified geometry, baked maps, skin and component pivots stay exact.
Use --references to additionally render matching reference views.

Generation-only recipe: rebuilds v004 from the immutable v003 baseline. It is
NOT an exporter for owner edits made to v004. Existing generated sources,
exports and the reference companion must match their receipts before a rerun.
For new artist edits, preserve them under a new version and update the source/
output paths as a separate reviewed export; this script has no force flag.
"""
import bpy, copy, hashlib, json, math, struct, sys
from pathlib import Path
from mathutils import Euler, Matrix, Quaternion, Vector

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from asset_output_guard import assert_generated_output
SOURCE_DIR = ROOT / 'assets/source/local/spacecraft/space-dragon-spacecraft'
SOURCE = SOURCE_DIR / 'Space Dragon Spacecraft-v003-game-v002.blend'
GAME = SOURCE_DIR / 'Space Dragon Spacecraft-v004-flight.blend'
BASE = ROOT / 'public/assets/dogfight/models/dragon-cinematic-benchmark-v002.glb'
OUT = ROOT / 'assets/game/local/spacecraft/space-dragon-spacecraft/flight-v003'
FINAL = OUT / 'dragon-flight-v003.glb'
CLIP_GLTF = OUT / 'dragon-flight-animation-export.glb'
REFERENCE_BLEND = SOURCE_DIR / 'Space Dragon Spacecraft-v004-reference.blend'
BONES = ['Root', 'Wing_L', 'Wing_R', 'Jaw', *['Tail_' + str(i) for i in range(5)]]

def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def read_glb(path):
    data = path.read_bytes(); size = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20+size]); off = 20 + size
    binary = data[off+8:off+8+struct.unpack_from('<I',data,off)[0]]
    return doc, binary
def write_glb(path, doc, binary):
    binary += b'\0' * (-len(binary) % 4)
    doc['buffers'][0]['byteLength'] = len(binary)
    blob = json.dumps(doc,separators=(',',':')).encode(); blob += b' ' * (-len(blob)%4)
    path.write_bytes(struct.pack('<4sII',b'glTF',2,28+len(blob)+len(binary))+
        struct.pack('<II',len(blob),0x4E4F534A)+blob+struct.pack('<II',len(binary),0x004E4942)+binary)
def node_worlds(doc):
    parents = {c:i for i,n in enumerate(doc['nodes']) for c in n.get('children',[])}
    cache = {}
    def world(i):
        if i in cache: return cache[i]
        n=doc['nodes'][i]
        if 'matrix' in n:
            v=n['matrix']; local=Matrix([[v[c*4+r] for c in range(4)] for r in range(4)])
        else:
            q=n.get('rotation',[0,0,0,1]); local=Matrix.LocRotScale(Vector(n.get('translation',[0,0,0])),Quaternion((q[3],q[0],q[1],q[2])),Vector(n.get('scale',[1,1,1])))
        cache[i]=(world(parents[i]) if i in parents else Matrix.Identity(4))@local
        return cache[i]
    return world
def gltf_to_blender(point): return Vector((point[0],-point[2],point[1]))

def author_actions(rig):
    rig.animation_data_clear(); rig.animation_data_create()
    for name in ['Flight','Glide','Boost']:
        old=bpy.data.actions.get(name)
        if old: bpy.data.actions.remove(old)
        action=bpy.data.actions.new(name); action.use_fake_user=True
        rig.animation_data.action=action
        for frame in range(1,32):
            phase=(frame-1)/30
            x=phase/.4 if phase<.4 else (phase-.4)/.6
            smooth=x*x*(3-2*x)
            cycle=.5*smooth if phase<.4 else .5+.5*smooth
            flap=0 if name=='Glide' else math.sin(cycle*math.tau)*(.236 if name=='Boost' else .20)
            sweep=.245 if name=='Boost' else .025
            poses={'Wing_L':(0,-sweep,-.13-flap),'Wing_R':(0,sweep,.13+flap)}
            for i in range(5):
                poses['Tail_'+str(i)]=(math.sin(phase*math.tau-i*.65)*.035,math.sin(phase*math.tau-i*.6)*.07,0)
            for bone,rot in poses.items():
                pb=rig.pose.bones[bone]; pb.rotation_mode='QUATERNION'; pb.rotation_quaternion=Euler(rot,'XYZ').to_quaternion()
                pb.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=bone)
        # Exact 1-second loops, no root motion and no jaw combat ownership.
        action.use_frame_range=True; action.frame_start=1; action.frame_end=31
        for slot in action.slots:
            for layer in action.layers:
                for strip in layer.strips:
                    bag=strip.channelbag(slot,ensure=False)
                    if bag:
                        for curve in bag.fcurves:
                            for point in curve.keyframe_points: point.interpolation='LINEAR'
        action['purpose']='Presentation only; no root translation, collision or combat events'
    rig.animation_data.action=None
    for pb in rig.pose.bones: pb.matrix_basis=Matrix.Identity(4)

def merge_export(sockets):
    doc,binary=read_glb(BASE); exported,anim_binary=read_glb(CLIP_GLTF)
    original_binary=binary; names={n.get('name'):i for i,n in enumerate(doc['nodes'])}
    original_nodes=copy.deepcopy(doc['nodes'])
    assert len(doc['skins'][0]['joints'])==9
    # Original muzzle is already valid; append only new named points.
    world=node_worlds(doc)
    for name,info in sockets.items():
        if name in names: continue
        parent=names[info['bone']]; local=world(parent).inverted()@Matrix.Translation(info['position'])
        t,q,s=local.decompose(); node={'name':name,'translation':list(t),'rotation':[q.x,q.y,q.z,q.w],'scale':list(s),
            'extras':{'attachmentRole':info['role'],'assetContractVersion':1}}
        idx=len(doc['nodes']); doc['nodes'].append(node); doc['nodes'][parent].setdefault('children',[]).append(idx)
    doc['animations']=[]; accessor_map={}; view_map={}
    def accessor(index, time=False):
        nonlocal binary
        if index in accessor_map:return accessor_map[index]
        acc=copy.deepcopy(exported['accessors'][index]); assert 'sparse' not in acc
        vi=acc['bufferView']
        if vi not in view_map:
            view=copy.deepcopy(exported['bufferViews'][vi]); start=view.get('byteOffset',0)
            binary+=b'\0'*(-len(binary)%4); view['byteOffset']=len(binary); view['buffer']=0
            binary+=anim_binary[start:start+view['byteLength']]
            view_map[vi]=len(doc['bufferViews']); doc['bufferViews'].append(view)
        acc['bufferView']=view_map[vi]
        if time:
            view=doc['bufferViews'][acc['bufferView']];assert acc['componentType']==5126 and acc['type']=='SCALAR' and view.get('byteStride',4)==4
            start=view['byteOffset']+acc.get('byteOffset',0);values=list(struct.unpack_from('<'+'f'*acc['count'],binary,start));offset=values[0]
            values=[v-offset for v in values]
            # The exporter timestamps source frame1 at1/30s; clips start at0.
            if abs(values[-1]-1)<1e-6:values[-1]=1.0
            binary=binary[:start]+struct.pack('<'+'f'*len(values),*values)+binary[start+len(values)*4:]
            acc['min']=[min(values)];acc['max']=[max(values)]
        accessor_map[index]=len(doc['accessors']); doc['accessors'].append(acc)
        return accessor_map[index]
    for animation in exported.get('animations',[]):
        result={'name':animation['name'],'channels':[],'samplers':[]}
        for channel in animation['channels']:
            name=exported['nodes'][channel['target']['node']].get('name')
            if name not in ['Wing_L','Wing_R',*['Tail_'+str(i) for i in range(5)]] or channel['target']['path']!='rotation':continue
            sample=animation['samplers'][channel['sampler']]
            result['channels'].append({'sampler':len(result['samplers']),'target':{'node':names[name],'path':'rotation'}})
            result['samplers'].append({'input':accessor(sample['input'],time=True),'output':accessor(sample['output']),'interpolation':sample.get('interpolation','LINEAR')})
        assert len(result['channels'])==7,(animation['name'],len(result['channels']))
        doc['animations'].append(result)
    assert sorted(a['name'] for a in doc['animations'])==['Boost','Flight','Glide']
    for i,node in enumerate(original_nodes):
        current=copy.deepcopy(doc['nodes'][i]); current['children']=[c for c in current.get('children',[]) if c<len(original_nodes)]
        if not current['children']:current.pop('children')
        assert current==node, ('Changed original node',i,node['name'])
    assert binary[:len(original_binary)]==original_binary
    doc['asset'].setdefault('extras',{}).update({'assetId':'space-dragon-flight-v003','assetContractVersion':1,
        'units':'meters','metersPerUnit':1,'upAxis':'+Y','forwardAxis':'-Z','scale':1,
        'groundContactY':sockets['socket_ground']['position'][1],
        'rootMotion':'none; authoritative gameplay root owns movement',
        'source':'Space Dragon Spacecraft-v004-flight.blend','geometryBaselineSha256':digest(BASE),
        'animationSource':'Blender5.2 glTF action export; seven quaternion-only channels per clip'})
    write_glb(FINAL,doc,binary)
    return doc,{'bytes':FINAL.stat().st_size,'sha256':digest(FINAL),'originalBinaryBytesPreserved':len(original_binary),'addedAnimationBytes':len(binary)-len(original_binary),
        'originalNodes':len(original_nodes),'nodes':len(doc['nodes']),'meshes':len(doc['meshes']),
        'triangles':sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives']),
        'animations':[{'name':a['name'],'channels':len(a['channels']),'duration':doc['accessors'][a['samplers'][0]['input']]['max'][0]} for a in doc['animations']]}

def make_references(rig,render_objects):
    scene=bpy.context.scene
    if scene.render.engine=='CYCLES':
        scene.cycles.samples=64;scene.cycles.use_denoising=True
    for pb in rig.pose.bones:pb.matrix_basis=Matrix.Identity(4)
    rig.animation_data.action=None
    scene.frame_set(1)
    for o in scene.objects:
        if o.type in {'MESH','LIGHT'}:o.hide_render=o not in render_objects
    col=bpy.data.collections.new('Pipeline Reference Studio - not for export');scene.collection.children.link(col)
    data=bpy.data.cameras.new('PipelineCamera'); cam=bpy.data.objects.new('PipelineCamera',data);col.objects.link(cam);scene.camera=cam
    scene.render.resolution_x=1440;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
    data.type='PERSP';data.sensor_fit='VERTICAL';data.sensor_height=24;data.lens=12/math.tan(math.radians(43)/2)
    scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
    world=bpy.data.worlds.new('Pipeline uniform reference environment');scene.world=world;world.use_nodes=True
    bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs['Color'].default_value=(.18,.18,.18,1);bg.inputs['Strength'].default_value=.35
    lights=[{'name':'key','position':[-4,7,-7],'target':[0,.4,-1],'size':[7,5],'neutralPowerW':1500,'cinematicPowerW':2200,'cinematicColor':[1,.7,.45]},
        {'name':'fill','position':[5,4,-2],'target':[0,.4,-1],'size':[5,5],'neutralPowerW':450,'cinematicPowerW':180,'cinematicColor':[1,1,1]},
        {'name':'rim','position':[5,4,3],'target':[0,.4,-1],'size':[4,4],'neutralPowerW':1200,'cinematicPowerW':1800,'cinematicColor':[.55,.72,1]}]
    def point(o,position,target):o.location=gltf_to_blender(position);o.rotation_euler=(gltf_to_blender(target)-o.location).to_track_quat('-Z','Y').to_euler()
    lamp_objects=[]
    for l in lights:
        ld=bpy.data.lights.new('Pipeline '+l['name'],'AREA');ld.shape='RECTANGLE';ld.size=l['size'][0];ld.size_y=l['size'][1]
        ob=bpy.data.objects.new(ld.name,ld);col.objects.link(ob);point(ob,l['position'],l['target']);lamp_objects.append(ob)
    cameras={'front':{'position':[0,2,-13],'target':[0,.3,-.2]},'side':{'position':[13,2.7,0],'target':[0,.3,-.2]},
        'full':{'position':[6.8,3.8,-8.4],'target':[0,.2,.4]},'head':{'position':[3.5,2.05,-6.5],'target':[0,.6,-2.3]}}
    manifest={'contractVersion':1,'source':str(GAME.relative_to(ROOT)).replace('\\','/'),'sourceSha256':digest(GAME),
        'model':'dragon-flight-v003.glb','modelSha256':digest(FINAL),
        'referenceBlendSha256':digest(REFERENCE_BLEND) if REFERENCE_BLEND.exists() else None,
        'coordinateSystem':'glTF Y-up -Z-forward meters',
        'width':1440,'height':1000,'verticalFovDegrees':43,'viewport':[1440,1000],'fov':43,'pose':'Rest; all bone matrix_basis identity, no clip or procedural overlay',
        'renderer':scene.render.engine,'samples':scene.cycles.samples if scene.render.engine=='CYCLES' else None,
        'denoising':scene.cycles.use_denoising if scene.render.engine=='CYCLES' else None,
        'renderDevice':scene.cycles.device if scene.render.engine=='CYCLES' else 'GPU',
        'world':{'linearColor':[.18,.18,.18],'color':[.18,.18,.18],'strength':.35},'lights':lights,'cameras':cameras,
        'colorManagement':{'neutral':'Standard / None / exposure0 / gamma1 / sRGB','cinematic':'AgX / None / exposure0 / gamma1 / sRGB'},'views':[]}
    for light in lights:
        light['neutralPower']=light['neutralPowerW'];light['cinematicPower']=light['cinematicPowerW'];light['neutralColor']=[1,1,1]
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/'references.json').write_text(json.dumps(manifest,indent=2))
    for style,views in [('neutral',['front','side','full','head']),('cinematic',['full','head'])]:
        scene.view_settings.view_transform='Standard' if style=='neutral' else 'AgX';scene.view_settings.look='None';scene.view_settings.exposure=0;scene.view_settings.gamma=1
        for l,ob in zip(lights,lamp_objects):ob.data.energy=l[style+'PowerW'];ob.data.color=(1,1,1) if style=='neutral' else l['cinematicColor']
        for view in views:
            point(cam,**cameras[view]);filename=f'blender-{style}-{view}.png';scene.render.filepath=str(OUT/filename)
            bpy.ops.render.render(write_still=True)
            manifest['views'].append({'view':view,'lighting':style,'file':filename})
            print('REFERENCE_READY',filename,flush=True)
    (OUT/'references.json').write_text(json.dumps(manifest,indent=2))
    return manifest

def main():
    # Run every preservation check before mkdir, rendering or save operations.
    # Reference refreshes read the generated game source, so protect it too.
    assert_generated_output(GAME,OUT/'export-receipt.json','gameSourceSha256')
    assert_generated_output(FINAL,OUT/'export-receipt.json','sha256')
    if '--references' in sys.argv or '--references-only' in sys.argv:
        assert_generated_output(REFERENCE_BLEND,OUT/'references.json','referenceBlendSha256')
    OUT.mkdir(parents=True,exist_ok=True); baseline_hash=digest(BASE); source_hash=digest(SOURCE)
    if '--references-only' in sys.argv:
        bpy.ops.wm.open_mainfile(filepath=str(GAME),use_scripts=False)
        rig=bpy.data.objects['SpaceDragonRig'];col=bpy.data.collections['Game Candidate - optimized v001']
        manifest=make_references(rig,[o for o in col.objects if o.type=='MESH' and not o.hide_render])
        bpy.ops.wm.save_as_mainfile(filepath=str(REFERENCE_BLEND))
        manifest['referenceBlendSha256']=digest(REFERENCE_BLEND)
        (OUT/'references.json').write_text(json.dumps(manifest,indent=2))
        return
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE),use_scripts=False)
    scene=bpy.context.scene;rig=bpy.data.objects['SpaceDragonRig'];col=bpy.data.collections['Game Candidate - optimized v001']
    render_objects=[o for o in col.objects if o.type=='MESH' and not o.hide_render]
    bones={b.name:[list(row) for row in b.matrix_local] for b in rig.data.bones}
    assert list(bones)==BONES
    # Measure the load-bearing soles AND retained metal talons, not wing claws.
    dep=bpy.context.evaluated_depsgraph_get();foot_min=[];contact_geometry=[]
    for o in bpy.data.objects:
        if o.type=='MESH' and ('SDM_foot ' in o.name or 'Ivory talon' in o.name):
            ev=o.evaluated_get(dep);mesh=ev.to_mesh();heights=[(o.matrix_world@v.co).z for v in mesh.vertices];foot_min.extend(heights);ev.to_mesh_clear()
            contact_geometry.append({'name':o.name,'minimumYInGame':min(heights)})
    contact=min(foot_min);assert -.8<contact<-.5
    sockets={'socket_muzzle':{'bone':'Root','position':[0,.5,-3.66],'role':'upper muzzle / fire origin'},
        'socket_wing_l':{'bone':'Wing_L','position':[-4.9,.3,.4],'role':'left wingtip effects'},
        'socket_wing_r':{'bone':'Wing_R','position':[4.9,.3,.4],'role':'right wingtip effects'},
        'socket_thruster_l':{'bone':'Root','position':[-.52,.2,1.25],'role':'left aft thruster'},
        'socket_thruster_r':{'bone':'Root','position':[.52,.2,1.25],'role':'right aft thruster'},
        'socket_target':{'bone':'Root','position':[0,0,0],'role':'stable targeting origin; render motion optional'},
        'socket_camera':{'bone':'Root','position':[0,0,0],'role':'stable camera anchor; render motion optional'},
        'socket_ground':{'bone':'Root','position':[0,contact,0],'role':'rest foot contact plane; does not shift flight origin'}}
    for name,info in sockets.items():
        ob=bpy.data.objects.get(name)
        if ob:continue
        ob=bpy.data.objects.new(name,None);col.objects.link(ob);ob.parent=rig;ob.parent_type='BONE';ob.parent_bone=info['bone'];bpy.context.view_layer.update()
        ob.matrix_world=Matrix.Translation(gltf_to_blender(info['position']));ob.empty_display_size=.15
        ob['attachmentRole']=info['role'];ob['assetContractVersion']=1
    author_actions(rig);scene.render.fps=30;scene.frame_start=1;scene.frame_end=31;scene.frame_set(1)
    for pb in rig.pose.bones:pb.matrix_basis=Matrix.Identity(4)
    rig['assetId']='space-dragon-flight-v003';rig['assetContractVersion']=1;rig['units']='meters';rig['glTFForward']='-Z';rig['groundContactY']=contact
    assert bones=={b.name:[list(row) for row in b.matrix_local] for b in rig.data.bones}
    bpy.ops.wm.save_as_mainfile(filepath=str(GAME))
    bpy.ops.object.select_all(action='DESELECT');rig.hide_set(False);rig.select_set(True);bpy.context.view_layer.objects.active=rig
    kwargs={'filepath':str(CLIP_GLTF),'export_format':'GLB','use_selection':True,'export_cameras':False,'export_lights':False,
        'export_animations':True,'export_animation_mode':'ACTIONS','export_force_sampling':True,'export_frame_range':False,
        'export_anim_single_armature':True,'export_skins':True,'export_def_bones':False,'export_leaf_bone':False,
        'export_rest_position_armature':True,'export_yup':True,'export_extras':True,'export_armature_object_remove':False}
    supported=bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
    bpy.ops.export_scene.gltf(**{k:v for k,v in kwargs.items() if k in supported})
    doc,summary=merge_export(sockets)
    report={'blender':bpy.app.version_string,'source':str(SOURCE),'sourceHashBefore':source_hash,'sourceUnchanged':digest(SOURCE)==source_hash,
        'gameSource':str(GAME),'gameSourceSha256':digest(GAME),'baseline':str(BASE),'baselineHashBefore':baseline_hash,'baselineUnchanged':digest(BASE)==baseline_hash,
        'output':str(FINAL),'assetContractVersion':1,'sockets':sockets,'contactMeasurement':contact_geometry,'restBones':bones,**summary}
    (OUT/'export-receipt.json').write_text(json.dumps(report,indent=2));print('EXPORT_READY',json.dumps(summary),flush=True)
    if '--references' in sys.argv:
        manifest=make_references(rig,render_objects)
        # Save reference cameras separately; export source remains animation-ready.
        bpy.ops.wm.save_as_mainfile(filepath=str(REFERENCE_BLEND))
        manifest['referenceBlendSha256']=digest(REFERENCE_BLEND)
        (OUT/'references.json').write_text(json.dumps(manifest,indent=2))
if __name__=='__main__':main()
