"""Controlled local launch animatic from the original Blender master and shared Unity path.

Run in a separate Blender background process; never modifies the live Editor or source.
Prepare saves a new versioned .blend. Rendering reopens it and samples the shared clock.
"""
import argparse, hashlib, json, math, sys, time
from pathlib import Path
import bpy
from mathutils import Vector, Quaternion

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/source/local/spacecraft/space-dragon-spacecraft/Space Dragon Spacecraft-v004-flight.blend'
CONTRACT = ROOT / 'unity/SpaceDragon/Assets/SpaceDragon/LaunchLab/launch-choreography-v001.json'
DEST = ROOT / 'assets/source/local/cinematics/launch-v003/launch-v003.blend'
OUT = ROOT / 'assets/game/local/cinematics/launch-v003'
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def position(value): return Vector((value['x'],value['z'],value['y']))
def point(obj, target): obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
def material(name, color, metal=0, rough=.6):
    mat=bpy.data.materials.new(name);mat.use_nodes=True
    node=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    node.inputs['Base Color'].default_value=(*color,1);node.inputs['Metallic'].default_value=metal;node.inputs['Roughness'].default_value=rough
    return mat
def cube(name, loc, scale, mat):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);obj=bpy.context.object;obj.name=name;obj.scale=scale;obj.data.materials.append(mat);return obj
def prepare(contract):
    if DEST.exists(): raise RuntimeError('Versioned launch source exists; render it, or select a new version for revisions.')
    source_hash=digest(SOURCE)
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE),use_scripts=False)
    scene=bpy.context.scene;rig=bpy.data.objects['SpaceDragonRig'];col=bpy.data.collections['Game Candidate - optimized v001']
    visible=set(col.all_objects)
    for obj in bpy.data.objects: obj.hide_render=obj not in visible
    root=bpy.data.objects.new('LaunchMotion',None);scene.collection.objects.link(root)
    # Parent only roots; preserve the original hierarchy, pivots, meshes and bones.
    parents=set()
    for obj in list(col.objects)+[rig]:
        ancestor=obj
        while ancestor.parent:ancestor=ancestor.parent
        parents.add(ancestor)
    for obj in parents:
        matrix=obj.matrix_world.copy();obj.parent=root;obj.matrix_world=matrix
    root.rotation_mode='QUATERNION'
    rig.animation_data_create();rig.animation_data.action=None
    for track in rig.animation_data.nla_tracks: track.mute=True
    track=rig.animation_data.nla_tracks.new();track.name='Launch Flight loop'
    strip=track.strips.new('Flight',1,bpy.data.actions['Flight']);strip.action_frame_start=1;strip.action_frame_end=31;strip.repeat=12
    camdata=bpy.data.cameras.new('LaunchCamera');cam=bpy.data.objects.new('LaunchCamera',camdata);scene.collection.objects.link(cam);scene.camera=cam
    camdata.sensor_fit='VERTICAL';camdata.sensor_height=24;camdata.clip_end=2000
    for sample in contract['frames']:
        frame=round(sample['time']*30)+1;root.location=position(sample['position']);q=sample['rotation'];root.rotation_quaternion=Quaternion((q['w'],-q['x'],-q['z'],-q['y']))
        root.keyframe_insert(data_path='location',frame=frame);root.keyframe_insert(data_path='rotation_quaternion',frame=frame)
        cam.location=position(sample['cameraPosition']);point(cam,position(sample['cameraTarget']));camdata.lens=12/math.tan(math.radians(sample['cameraFov'])/2)
        cam.keyframe_insert(data_path='location',frame=frame);cam.keyframe_insert(data_path='rotation_euler',frame=frame);camdata.keyframe_insert(data_path='lens',frame=frame)
    # Dense samples use linear tangents, exactly as the shared interchange contract.
    for datablock in (root,cam,camdata):
        action=datablock.animation_data.action
        for layer in action.layers:
            for strip in layer.strips:
                for slot in action.slots:
                    bag=strip.channelbag(slot,ensure=False)
                    if bag:
                        for curve in bag.fcurves:
                            for key in curve.keyframe_points:key.interpolation='LINEAR'
    concrete=material('Launch concrete',(.23,.27,.31),.05,.8)
    grass=material('Distant ground',(.055,.09,.085),0,.95)
    cube('Launch ground',(0,0,-.35),(10000,10000,.4),grass)
    cube('Launch apron',(0,0,-.1),(32,32,.2),concrete)
    ring=material('Launch markings',(.65,.73,.78),.1,.5)
    for x in (-10,10):cube('Apron line',(x,0,.015),(.12,24,.03),ring)
    sun_data=bpy.data.lights.new('Launch Sun','SUN');sun_data.energy=3;sun_data.angle=math.radians(2);sun_data.color=(1,.84,.65)
    sun=bpy.data.objects.new('Launch Sun',sun_data);scene.collection.objects.link(sun);sun.rotation_euler=(math.radians(28),math.radians(-20),math.radians(-35))
    fill_data=bpy.data.lights.new('Dragon cool fill','AREA');fill_data.energy=1100;fill_data.color=(.42,.64,1);fill_data.shape='DISK';fill_data.size=9
    fill=bpy.data.objects.new('Dragon cool fill',fill_data);scene.collection.objects.link(fill);fill.parent=root;fill.location=(7,5,9);point(fill,(0,0,0))
    world=bpy.data.worlds.new('Launch atmosphere');scene.world=world;world.use_nodes=True
    bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs['Color'].default_value=(.025,.055,.12,1);bg.inputs['Strength'].default_value=.4
    # Bounded procedural cloud layer: original local geometry/material, no reference images.
    cloud=bpy.data.materials.new('Launch cloud volume');cloud.use_nodes=True;nodes=cloud.node_tree.nodes;nodes.clear()
    output=nodes.new('ShaderNodeOutputMaterial');volume=nodes.new('ShaderNodeVolumePrincipled');volume.inputs['Color'].default_value=(.73,.84,.95,1)
    noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=5;noise.inputs['Detail'].default_value=3
    ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.42;ramp.color_ramp.elements[0].color=(0,0,0,1);ramp.color_ramp.elements[1].position=.68;ramp.color_ramp.elements[1].color=(.035,.035,.035,1)
    cloud.node_tree.links.new(noise.outputs['Fac'],ramp.inputs[0]);cloud.node_tree.links.new(ramp.outputs['Color'],volume.inputs['Density']);cloud.node_tree.links.new(volume.outputs['Volume'],output.inputs['Volume'])
    cube('Cloud layer',(0,95,65),(280,330,54),cloud)
    scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100;scene.render.fps=30
    scene.frame_start=1;scene.frame_end=361;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
    scene.view_settings.view_transform='AgX';scene.view_settings.look='None';scene.view_settings.exposure=0
    scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True;scene.cycles.max_bounces=4;scene.cycles.volume_bounces=0;scene.render.use_persistent_data=True
    scene['source_contract_sha256']=digest(CONTRACT);scene['master_source_sha256']=source_hash
    scene.frame_set(91);DEST.parent.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(DEST))
    assert digest(SOURCE)==source_hash
    receipt={'source':str(SOURCE.relative_to(ROOT)),'sourceSha256':source_hash,'sourceUnchanged':True,'blend':str(DEST.relative_to(ROOT)),'blendSha256':digest(DEST),'contractSha256':digest(CONTRACT),'clip':{'start':3,'end':10,'seconds':7,'fps':30},'blender':bpy.app.version_string,'assetStatus':'LOCAL ANIMATIC; no AI enhancement or final visual approval'}
    (OUT/'source-receipt.json').write_text(json.dumps(receipt,indent=2))
    print('LAUNCH_SOURCE_READY',json.dumps(receipt),flush=True)
def render(args):
    bpy.ops.wm.open_mainfile(filepath=str(DEST),use_scripts=False)
    scene=bpy.context.scene
    if scene.get('source_contract_sha256')!=digest(CONTRACT):raise RuntimeError('Choreography changed; review and version the Blender source.')
    scene.render.engine=args.engine;scene.render.resolution_percentage=args.percent
    if args.engine=='CYCLES':scene.cycles.samples=args.samples
    elif hasattr(scene,'eevee') and hasattr(scene.eevee,'taa_render_samples'):scene.eevee.taa_render_samples=args.samples
    folder=OUT/(args.label or args.engine.lower());folder.mkdir(parents=True,exist_ok=True)
    times=[]
    for frame in range(args.start,args.end+1):
        target=folder/f'{frame:04d}.png'
        if target.exists():continue
        scene.frame_set(frame);scene.render.filepath=str(target);started=time.monotonic();bpy.ops.render.render(write_still=True);times.append(time.monotonic()-started)
        print('LAUNCH_FRAME',frame,round(times[-1],2),flush=True)
    samples=scene.cycles.samples if args.engine=='CYCLES' else getattr(getattr(scene,'eevee',None),'taa_render_samples',None)
    (folder/'render-receipt.json').write_text(json.dumps({'engine':args.engine,'samples':samples,'width':round(scene.render.resolution_x*args.percent/100),'height':round(scene.render.resolution_y*args.percent/100),'startFrame':args.start,'endFrame':args.end,'renderSeconds':times,'blendSha256':digest(DEST),'contractSha256':digest(CONTRACT)},indent=2))
parser=argparse.ArgumentParser();parser.add_argument('--prepare',action='store_true');parser.add_argument('--engine',default='CYCLES');parser.add_argument('--start',type=int,default=91);parser.add_argument('--end',type=int,default=91);parser.add_argument('--percent',type=int,default=100);parser.add_argument('--samples',type=int,default=12);parser.add_argument('--label')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []);contract=json.loads(CONTRACT.read_text())
if args.prepare:prepare(contract)
else:render(args)
