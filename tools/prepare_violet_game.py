"""Create an independently weighted flight bind and UV candidate from refined v007."""
import bpy,math,json,hashlib
from pathlib import Path
from mathutils import Vector,Quaternion,Matrix
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/blender/violet-dragon-v007'
NAME='Violet Dragon v007 - game candidate'

def main():
    if bpy.data.collections.get(NAME):raise RuntimeError('Preserve existing game candidate')
    source=bpy.data.collections['Violet Dragon v007 - refined source'];sourceRig=bpy.data.objects['VioletDragonRig.v007']
    col=bpy.data.collections.new(NAME);bpy.context.scene.collection.children.link(col)
    rig=sourceRig.copy();rig.data=sourceRig.data.copy();rig.name='VioletFlightRig';col.objects.link(rig)
    rig.animation_data_clear();rig.hide_set(False);rig.hide_render=False
    objects=[]
    for old in source.objects:
        if old.type!='MESH' or old.hide_render:continue
        obj=old.copy();obj.data=old.data.copy();obj.name='Flight_'+old.name;col.objects.link(obj);obj.parent=rig;obj.hide_set(False);obj.hide_render=False
        for mod in obj.modifiers:
            if mod.type=='ARMATURE':mod.object=rig
        marker=obj.data.attributes.new('HeadPriority','BOOLEAN','FACE')
        priority=any(w in old.name for w in ['skull','mandible','nasal','orbital','eye','iris','pupil','tooth','lip','nostril'])
        for item in marker.data:item.value=priority
        objects.append(obj)
    def swing(name,axis,degrees):
        p=rig.pose.bones[name];local=p.bone.matrix_local.to_3x3().inverted()@Vector(axis)
        p.rotation_mode='QUATERNION';p.rotation_quaternion=Quaternion(local,math.radians(degrees))
    swing('Root',(1,0,0),-8)
    swing('Neck',(1,0,0),-61);swing('Head',(1,0,0),55)
    for side,sign in [('L',-1),('R',1)]:
        swing('Wing_'+side,(0,1,0),sign*29)
        swing('Fore_'+side,(1,0,0),-99);swing('Hind_'+side,(1,0,0),-73)
    bpy.context.view_layer.update()
    headDelta=rig.pose.bones['Head'].matrix@rig.data.bones['Head'].matrix_local.inverted()
    muzzle=headDelta@Vector((0,3.03,3.45))
    # Evaluate and apply only the cloned render deformation, then make that pose
    # the independent organic rest. Original standing source/rig stays intact.
    for obj in objects:
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
        for mod in list(obj.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
    bpy.ops.object.mode_set(mode='POSE');bpy.ops.pose.armature_apply(selected=False);bpy.ops.object.mode_set(mode='OBJECT')
    scale=.82;center=Vector((0,0,1.5))
    for obj in objects:
        for vertex in obj.data.vertices:vertex.co=(vertex.co-center)*scale
        mod=obj.modifiers.new('Organic flight skin','ARMATURE');mod.object=rig
    bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
    for bone in rig.data.edit_bones:
        bone.head=(bone.head-center)*scale;bone.tail=(bone.tail-center)*scale
    bpy.ops.object.mode_set(mode='OBJECT');bpy.context.view_layer.update()
    muzzle=(muzzle-center)*scale
    zmin=min(v.co.z for obj in objects for v in obj.data.vertices)
    socketInfo=[]
    def socket(name,point,bone):
        o=bpy.data.objects.new(name,None);col.objects.link(o);o.empty_display_type='PLAIN_AXES';o.empty_display_size=.12
        o.parent=rig;o.parent_type='BONE';o.parent_bone=bone;bpy.context.view_layer.update();o.matrix_world=Matrix.Translation(point)
        bpy.context.view_layer.update();socketInfo.append({'name':name,'bone':bone,'blenderPosition':list(o.matrix_world.translation)})
    socket('socket_muzzle',muzzle,'Head')
    for side in ['L','R']:socket('socket_wing_'+side,rig.data.bones['Wing_'+side].tail_local,'Wing_'+side)
    socket('socket_thruster_L',(-.45,-.75,.05),'Root');socket('socket_thruster_R',(.45,-.75,.05),'Root')
    socket('socket_target',(0,.25,.15),'Root');socket('socket_camera',(0,-.2,.45),'Root');socket('socket_ground',(0,0,zmin),'Root')
    # One body mesh and one tissue mesh retain per-vertex bone weights. Reduces
    # hundreds of object submissions without discarding authored construction.
    wings=[o for o in objects if any('membrane' in m.name.lower() for m in o.data.materials if m)]
    body=[o for o in objects if o not in wings]
    joined=[]
    for name,parts in [('VioletGameBody',body),('VioletGameWings',wings)]:
        bpy.ops.object.select_all(action='DESELECT')
        for o in parts:o.select_set(True)
        bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();obj=parts[0];obj.name=name;joined.append(obj)
        # Smart islands establish area-based allocation; head islands receive
        # extra area before repacking because the inspected face is a priority.
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(68),island_margin=.002,area_weight=.7)
        bpy.ops.object.mode_set(mode='OBJECT')
        uv=obj.data.uv_layers.active
        marker=obj.data.attributes.get('HeadPriority')
        if name=='VioletGameBody' and marker:
            for p in obj.data.polygons:
                if marker.data[p.index].value:
                    for li in p.loop_indices:uv.data[li].uv*=1.8
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.select_all(action='SELECT')
        bpy.ops.uv.pack_islands(rotate=True,margin=.002)
        bpy.ops.object.mode_set(mode='OBJECT')
    # Exact looping rotation-only clips. Root is movement-owned and Jaw is
    # attack-owned; source layers animate every other organic joint by name.
    moving=['Wing_L','Wing_R','Tail_0','Tail_1','Tail_2','Tail_3','Tail_4','Neck','Head','Fore_L','Fore_R','Hind_L','Hind_R']
    rig.animation_data_create();actions=[];scene=bpy.context.scene;scene.render.fps=30
    for clip,duration in [('Flight',1.6),('Glide',1.6),('Boost',1.2)]:
        action=bpy.data.actions.new(clip);action.name=clip;rig.animation_data.action=action
        frames=round(duration*30)
        for frame in range(frames+1):
            phase=frame/frames;wave=math.sin(phase*math.tau)
            for name in moving:
                bone=rig.pose.bones[name];q=Quaternion((1,0,0,0))
                def rot(axis,radians):
                    local=bone.bone.matrix_local.to_3x3().inverted()@Vector(axis);return Quaternion(local,radians)
                if name.startswith('Wing_'):
                    sign=1 if name.endswith('L') else -1
                    flap=0 if clip=='Glide' else wave*(.36 if clip=='Flight' else .28)
                    sweep=.13 if clip=='Boost' else .025
                    q=rot((0,1,0),sign*flap)@rot((0,0,1),sign*sweep)
                elif name.startswith('Tail_'):
                    i=int(name[-1]);q=rot((0,0,1),math.sin(phase*math.tau-i*.62)*(.035+i*.006))@rot((1,0,0),math.sin(phase*math.tau-i*.4)*.014)
                elif name in ['Neck','Head']:q=rot((1,0,0),wave*(.015 if name=='Neck' else -.011))
                else:q=rot((1,0,0),wave*.012)
                bone.rotation_mode='QUATERNION';bone.rotation_quaternion=q;bone.keyframe_insert('rotation_quaternion',frame=frame,group=name)
        action.use_fake_user=True;actions.append(action)
    rig.animation_data.action=None
    for bone in rig.pose.bones:bone.matrix_basis=Matrix.Identity(4)
    # Explicit NLA tracks each contain one independently named authored clip.
    for action in actions:
        track=rig.animation_data.nla_tracks.new();track.name=action.name;strip=track.strips.new(action.name,0,action);track.mute=True
    scene.frame_start=0;scene.frame_end=48;scene.frame_set(0)
    for o in source.objects:o.hide_set(True);o.hide_render=True
    for o in col.objects:o.hide_set(False);o.hide_render=False
    rig['assetContractVersion']=2;rig['rigProfile']='violet-organic-15';rig['forwardAxis']='-Z';rig['upAxis']='+Y';rig['metersPerUnit']=1;rig['authoredPresentation']=True
    rig['referenceStandingSource']='Violet Dragon v007 - refined source';rig['sourceUniformScale']=scale
    bpy.context.view_layer.update();bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
    receipt={'source':bpy.data.filepath,'sourceSha256':hashlib.sha256(Path(bpy.data.filepath).read_bytes()).hexdigest(),'gameMeshes':[o.name for o in joined],
      'triangles':sum(len(p.vertices)-2 for o in joined for p in o.data.polygons),'sockets':socketInfo,'clips':[(a.name,a.frame_range[:]) for a in actions],
      'scope':'Independent flight bind/UV/clip candidate; material bakes, export and runtime checks pending.'}
    (OUT/'game-preparation.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))

if __name__=='__main__':main()
