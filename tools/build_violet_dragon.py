"""SD-080: fresh living-dragon reference sculpt. Run only in the saved owner-Undo scene.

Preserves every prior source object. This changes anatomy and has its own rig;
it is NOT a drop-in replacement for the mechanical nine-bone game contract.
"""
import bpy, math, random, json, hashlib, sys
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'tools'))
from violet_dragon_geometry import loft, bezier_tube, leaf_scale, batch_scales, curved_scale_rows
from violet_dragon_materials import create_materials

DEST = ROOT/'assets/source/local/spacecraft/space-dragon-spacecraft/Space Dragon-v006-violet-reference.blend'
OUT = ROOT/'artifacts/blender/violet-dragon-v006'
COLLECTION = 'Violet Dragon v006 - living reference'

def smooth_path(points, radii, steps=5):
    pts=[Vector(p) for p in points]; rs=[Vector((r,r) if isinstance(r,(int,float)) else r) for r in radii]
    result=[]; sizes=[]
    for i in range(len(pts)-1):
        a,b,c,d=pts[max(0,i-1)],pts[i],pts[i+1],pts[min(len(pts)-1,i+2)]
        for j in range(steps):
            t=j/steps
            result.append(tuple(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)))
            sizes.append(tuple(rs[i].lerp(rs[i+1],t)))
    return result+[tuple(pts[-1])],sizes+[tuple(rs[-1])]

def main():
    if DEST.exists() or bpy.data.collections.get(COLLECTION):
        raise RuntimeError('Preserve v006; choose a fresh revision instead of rerunning.')
    recovery=DEST.parent/'Space Dragon Spacecraft-v005-owner-undo-SD080.blend'
    if not recovery.exists(): raise RuntimeError('Save owner Undo recovery before changing anything.')
    # New working file first. Historical source bytes remain untouched.
    bpy.ops.wm.save_as_mainfile(filepath=str(DEST))
    scene=bpy.context.scene
    for obj in list(scene.objects): obj.hide_set(True); obj.hide_render=True
    coll=bpy.data.collections.new(COLLECTION);scene.collection.children.link(coll)
    studio=bpy.data.collections.new('Violet v006 review studio - not for export');scene.collection.children.link(studio)
    coords=bpy.data.objects.new('VD6 material coordinates',None);coll.objects.link(coords)
    mats=create_materials(texture_object=coords)
    meshes=[]; bindings={}; paths={}
    def keep(obj,bone='Root'):
        meshes.append(obj);bindings[obj.name]=bone
        obj['candidate']='SD080 living reference v006';return obj
    def tube(name,pts,rs,mat='scale_mid',bone='Root',sides=24,steps=5,up=(0,0,1)):
        p,r=smooth_path(pts,rs,steps);paths[name]=(p,r,up)
        return keep(loft('VD6 '+name,p,r,mats[mat],coll,sides=sides,up=up),bone)
    def horn(name,pts,r=.12,mat='horn',bone='Head'):
        return keep(bezier_tube('VD6 '+name,pts,r,0,mats[mat],coll,samples=18,sides=12,taper=1.15),bone)
    def scales(pathname,name,bone='Root',around=26,length=.23,mat='scale_mid',angles=(0,math.tau)):
        p,r,u=paths[pathname]
        obj=keep(curved_scale_rows('VD6 '+name,p,r,mats[mat],coll,count_around=around,scale_length=length,
            rise=.035,thickness=.009,width_overlap=1.14,tip_direction=-1,angle_range=angles,up=u),bone)
        obj.data.materials.append(mats['scale_dark']);obj.data.materials.append(mats['scale_light'])
        rng=random.Random(71)
        for start in range(0,len(obj.data.polygons),19):
            value=rng.random();index=1 if value<.17 else 2 if value>.89 else 0
            for poly in list(obj.data.polygons)[start:start+19]:poly.material_index=index
        return obj

    # Continuous organic masses with a narrow waist and a deep, load-bearing chest.
    tube('Thorax',[ (0,-1.48,.9),(0,-1.0,1.12),(0,-.3,1.42),(0,.28,1.62),(0,.67,1.7)],
         [(.26,.35),(.60,.73),(.85,.96),(.83,1.0),(.49,.70)],steps=7)
    tube('Curved neck',[(0,.35,1.55),(0,.32,2.2),(0,.48,2.85),(0,.82,3.35),(0,1.18,3.64)],
         [(.55,.56),(.51,.48),(.40,.40),(.34,.33),(.34,.31)],bone='Neck',steps=7,up=(0,-1,0))
    tube('Predatory skull',[(0,.91,3.65),(0,1.33,3.78),(0,1.75,3.74),(0,2.18,3.62),(0,2.64,3.57),(0,2.83,3.57)],
         [(.27,.27),(.49,.37),(.46,.30),(.32,.21),(.24,.14),(.16,.10)],bone='Head',steps=5)
    tube('Lower jaw',[(0,1.24,3.38),(0,1.62,3.22),(0,2.13,3.18),(0,2.65,3.26),(0,2.8,3.3)],
         [(.30,.18),(.36,.16),(.29,.12),(.20,.09),(.12,.045)],bone='Jaw',steps=4)
    tube('Mouth cavity',[(0,1.48,3.40),(0,2.05,3.40),(0,2.68,3.43)],[(.30,.055),(.265,.05),(.15,.025)],'mouth','Head',20,4)
    tube('Tongue',[(0,1.56,3.34),(0,2.02,3.31),(0,2.55,3.35)],[(.18,.045),(.18,.045),(.07,.015)],'mouth','Jaw',20,4)
    scales('Thorax','Body shingle scales',around=34,length=.26)
    scales('Curved neck','Neck overlapping scales',bone='Neck',around=26,length=.25)
    scales('Predatory skull','Small facial scales',bone='Head',around=24,length=.13)
    scales('Lower jaw','Mandible scales',bone='Jaw',around=20,length=.14)

    # Broad ventral scutes graduate from chest to throat, rather than uniform noise.
    plates=[]
    for i in range(13):
        z=.55+i*.245
        if z<2.35: y=.97-(z-1.55)**2*.11; width=.86-.14*abs(z-1.5)
        else: y=.83+(z-2.35)*.43; width=.64-(z-2.35)*.13
        plates.append(dict(center=(0,y,z),tangent=(0,-.10,-1),normal=(0,1,.08),width=width,length=.42,rise=.065,thickness=.018))
    keep(batch_scales('VD6 Lilac ventral scutes',plates,mats['ventral'],coll),'Neck')
    # Strong brow hides the eye socket; iris remains small and alive.
    for sign in [-1,1]:
        s=lambda x:sign*x
        tube('Recessed eye socket '+str(sign),[(s(.40),1.38,3.88),(s(.485),1.56,3.88),(s(.40),1.78,3.83)],
             [(.06,.055),(.09,.07),(.025,.025)],'mouth','Head',20,5)
        tube('Violet slit eye '+str(sign),[(s(.466),1.43,3.89),(s(.52),1.56,3.9),(s(.446),1.7,3.86)],
             [(.009,.018),(.025,.049),(.005,.008)],'eye','Head',16,4)
        horn('Armored brow '+str(sign),[(s(.27),1.88,3.98),(s(.56),1.6,4.02),(s(.60),1.19,4.05),(s(.58),.91,4.18)],.13,'scale_dark')
        horn('Swept crown horn '+str(sign),[(s(.40),1.13,4.0),(s(.71),.67,4.55),(s(.91),-.16,4.65),(s(.70),-.56,5.0)],.19)
        horn('Outer crown spur '+str(sign),[(s(.48),1.30,3.9),(s(.83),.93,4.07),(s(1.02),.40,4.20),(s(.98),.12,4.48)],.12,'scale_dark')
        horn('Cheek swept blade '+str(sign),[(s(.44),1.30,3.61),(s(.75),1.02,3.64),(s(.90),.67,3.74),(s(1.05),.40,3.93)],.14,'scale_dark')
        horn('Lower cheek spur '+str(sign),[(s(.39),1.40,3.40),(s(.56),1.20,3.20),(s(.70),.86,3.18),(s(.81),.67,3.28)],.10,'scale_mid')
        tube('Nostril '+str(sign),[(s(.18),2.45,3.70),(s(.225),2.58,3.65)],[(.032,.018),(.034,.022)],'mouth','Head',12,5)
        for i in range(10):
            y=1.71+i*.103;x=.30-i*.014
            size=.20 if i in [1,4] else .13
            horn('Upper tooth %s %s'%(sign,i),[(s(x),y,3.43),(s(x*.96),y+.015,3.43-size*.4),(s(x*.84),y+.045,3.43-size*.8),(s(x*.72),y+.055,3.43-size)],.035,'teeth','Head')
            horn('Lower tooth %s %s'%(sign,i),[(s(x*.94),y,3.30),(s(x*.9),y+.01,3.34),(s(x*.82),y+.04,3.40),(s(x*.72),y+.05,3.41)],.027,'teeth','Jaw')
    # Purposeful crest follows neck/back silhouette with graduated lengths.
    for i in range(10):
        z=2.0+i*.215;y=-.15+max(0,z-2.8)*.25;length=.38+.18*math.sin(i/9*math.pi)
        horn('Neck crest %02d'%i,[(0,y,z),(0,y-.15,z+.12),(0,y-length,z+.22),(0,y-length-.12,z+.38)],.11,'scale_dark','Neck')
        for sign in [-1,1]:
            x=sign*(.49-.018*i)
            horn('Neck side blade %s %02d'%(sign,i),[(x,y+.12,z),(x*1.25,y-.10,z+.05),(x*1.4,y-.31,z+.16),(x*1.5,y-.43,z+.26)],.075,'scale_mid','Neck')
    for i in range(7):
        y=.4-i*.29;z=2.45-max(0,-y)*.45
        horn('Dorsal crest %02d'%i,[(0,y,z),(0,y-.12,z+.2),(0,y-.38,z+.38),(0,y-.52,z+.48)],.13,'scale_dark','Root')

    # Four weight-bearing limbs, splayed toes and hooked keratin claws.
    for sign in [-1,1]:
        for rear in [False,True]:
            label=('Hind' if rear else 'Fore')+('_L' if sign<0 else '_R')
            if rear: pts=[(sign*.62,-.92,1.20),(sign*1.07,-1.02,.78),(sign*.97,-.49,.40),(sign*1.03,-.68,.20)];rs=[(.43,.45),(.39,.44),(.22,.23),(.23,.15)]
            else: pts=[(sign*.61,.37,1.82),(sign*.98,.43,1.08),(sign*.83,1.01,.51),(sign*.92,1.22,.20)];rs=[(.34,.38),(.27,.33),(.19,.25),(.23,.14)]
            tube(label+' limb',pts,rs,bone=label,sides=24,steps=7)
            scales(label+' limb',label+' limb scales',bone=label,around=18,length=.19)
            end=Vector(pts[-1])
            for toe in range(4):
                x=end.x+(toe-1.5)*.16;y=end.y+.13;z=.17
                tube(label+' toe '+str(toe),[(x,y,z),(x+(toe-1.5)*.055,y+.30,.12),(x+(toe-1.5)*.07,y+.47,.12)],[(.10,.085),(.085,.065),(.047,.05)],bone=label,sides=14,steps=4)
                horn(label+' claw '+str(toe),[(x+(toe-1.5)*.07,y+.43,.14),(x+(toe-1.5)*.07,y+.62,.19),(x+(toe-1.5)*.08,y+.75,.07),(x+(toe-1.5)*.08,y+.77,.015)],.067,'horn',label)

    tailp=[(0,-1.20,1.02),(.15,-1.9,.74),(.40,-2.6,.49),(.82,-3.3,.30),(1.5,-3.95,.22),(2.25,-4.25,.31),(2.75,-4.0,.59),(2.82,-3.55,.88)]
    tailr=[(.40,.38),(.30,.28),(.22,.21),(.17,.17),(.12,.13),(.085,.095),(.05,.055),(0,0)]
    tube('Long counterbalanced tail',tailp,tailr,bone='Tail_0',sides=24,steps=6)
    scales('Long counterbalanced tail','Tail shingle scales',bone='Tail_0',around=18,length=.16)
    for i,p in enumerate(tailp[:-1]):
        x,y,z=p;r=tailr[i][1]
        horn('Tail crest %02d'%i,[(x,y,z+r),(x,y-.1,z+r+.10),(x+.03,y-.3,z+r+.22),(x+.07,y-.42,z+r+.23)],.085*(1-i*.10),'scale_dark','Tail_0')

    # Bat-wing architecture: wrist, five fingers, scalloped tissue panels and veins.
    for sign in [-1,1]:
        bone='Wing_L' if sign<0 else 'Wing_R';s=lambda x:sign*x
        root=Vector((s(.72),-.12,2.03));wrist=Vector((s(3.20),.12,3.65))
        tube(bone+' upper arm',[root,(s(1.72),-.18,2.65),(s(2.48),-.05,3.22),wrist],[(.25,.27),(.20,.20),(.15,.15),(.14,.14)],bone=bone,sides=24,steps=6)
        scales(bone+' upper arm',bone+' shoulder scales',bone=bone,around=15,length=.18)
        tips=[Vector((s(5.15),.65,4.65)),Vector((s(5.55),-1.02,3.30)),Vector((s(4.40),-2.12,2.16)),Vector((s(2.80),-2.28,1.32)),Vector((s(1.12),-1.42,1.23))]
        for i,tip in enumerate(tips):
            mid=wrist.lerp(tip,.48)+Vector((0,.16,.22))
            tube(bone+' finger '+str(i),[wrist,mid,tip],[(.105,.105),(.075,.08),(.018,.018)],'scale_dark',bone,16,7)
            horn(bone+' hooked tip '+str(i),[tip,tip+Vector((s(.18),.01,.16)),tip+Vector((s(.30),-.02,.08)),tip+Vector((s(.32),-.08,-.12))],.065,'horn',bone)
        verts=[];faces=[];uvs=[];steps=20
        for panel in range(len(tips)-1):
            a,b=tips[panel],tips[panel+1];start=len(verts)
            for row in range(steps+1):
                u=row/steps
                for column in range(steps+1):
                    v=column/steps
                    edge=a.lerp(b,v).lerp(wrist,.20*math.sin(v*math.pi))
                    p=wrist.lerp(edge,u);p.z-=.23*math.sin(math.pi*u)*math.sin(math.pi*v)
                    verts.append(tuple(p));uvs.append((panel/4+v/4,u))
            for row in range(steps):
                for column in range(steps):
                    k=start+row*(steps+1)+column
                    face=(k,k+1,k+steps+2,k+steps+1)
                    faces.append(face if sign>0 else tuple(reversed(face)))
            # Three restrained veins per panel, following the same tissue surface.
            for v in [.25,.5,.75]:
                edge=a.lerp(b,v).lerp(wrist,.20*math.sin(v*math.pi))
                line=[]
                for u in [.12,.35,.6,.84,.99]:
                    p=wrist.lerp(edge,u);p.z-=.23*math.sin(math.pi*u)*math.sin(math.pi*v)-.008;line.append(p)
                tube(bone+' membrane vein %s %s'%(panel,v),line,[.018,.016,.013,.009,.003],'scale_dark',bone,8,3)
        mesh=bpy.data.meshes.new(bone+' membrane');mesh.from_pydata(verts,[],faces);mesh.update()
        obj=bpy.data.objects.new('VD6 '+bone+' living membrane',mesh);coll.objects.link(obj);mesh.materials.append(mats['membrane'])
        uv=mesh.uv_layers.new(name='MembraneUV')
        for poly in mesh.polygons:
            poly.use_smooth=True
            for li in poly.loop_indices:uv.data[li].uv=uvs[mesh.loops[li].vertex_index]
        thick=obj.modifiers.new('Living tissue thickness','SOLIDIFY');thick.thickness=.012;thick.offset=0
        keep(obj,bone)

    # Own source rig. Old SpaceDragonRig, markers and every prior mesh stay hidden intact.
    arm=bpy.data.armatures.new('VioletDragonRig.v006');rig=bpy.data.objects.new('VioletDragonRig.v006',arm);coll.objects.link(rig)
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
    bpy.ops.object.mode_set(mode='EDIT')
    def bone(name,head,tail,parent=None):
        b=arm.edit_bones.new(name);b.head=head;b.tail=tail
        if parent:b.parent=arm.edit_bones[parent]
    bone('Root',(0,0,.3),(0,0,1.5))
    bone('Neck',(0,.30,1.5),(0,.82,3.35),'Root')
    bone('Head',(0,.82,3.35),(0,2.4,3.57),'Neck')
    bone('Jaw',(0,1.24,3.38),(0,2.7,3.26),'Head')
    for sign in [-1,1]:
        side='_L' if sign<0 else '_R'
        bone('Wing'+side,(sign*.72,-.12,2.03),(sign*3.2,.12,3.65),'Root')
        bone('Fore'+side,(sign*.61,.37,1.82),(sign*.92,1.22,.20),'Root')
        bone('Hind'+side,(sign*.62,-.92,1.20),(sign*1.03,-.68,.20),'Root')
    for i in range(5):bone('Tail_'+str(i),tailp[i],tailp[i+1],'Root' if i==0 else 'Tail_'+str(i-1))
    bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=False
    for obj in meshes:
        obj.parent=rig
        group=obj.vertex_groups.new(name=bindings[obj.name]);group.add(list(range(len(obj.data.vertices))),1,'REPLACE')
        mod=obj.modifiers.new('Violet source rig','ARMATURE');mod.object=rig
    rig['contract']='New 15-bone organic source rig; NOT mechanical game parity. Detailed weighting, flight/land transitions and export need their own validation.'
    scene['selectedArtDirection']='SD080 living purple dragon reference; replaces mechanical styling for next art candidate.'
    # Neutral studio and an actual inspectable saved camera, never a baked backdrop.
    def area(name,pos,power,color,size):
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size
        obj=bpy.data.objects.new(name,data);studio.objects.link(obj);obj.location=pos;obj.rotation_euler=(Vector((0,.1,2.2))-obj.location).to_track_quat('-Z','Y').to_euler();return obj
    area('VD6 broad soft key',(5,6,8),1700,(1,.86,.75),6)
    area('VD6 cool rim',(-5,-3,7),2100,(.64,.70,1),5)
    area('VD6 neutral fill',(-4,5,3),900,(.82,.86,1),5)
    camera=bpy.data.cameras.new('VD6 review camera');cam=bpy.data.objects.new('VD6 review camera',camera);studio.objects.link(cam)
    cam.location=(10,13,7);target=Vector((0,-.4,2.1));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();camera.lens=48
    scene.camera=cam;scene.render.resolution_x=1500;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('VD6 neutral studio');scene.world.use_nodes=True
    bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs['Color'].default_value=(.055,.065,.085,1);bg.inputs['Strength'].default_value=.5
    scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
    for screen in bpy.data.screens:
        for area_ui in screen.areas:
            if area_ui.type=='VIEW_3D':
                space=area_ui.spaces.active;space.shading.type='MATERIAL';space.overlay.show_overlays=False
                space.region_3d.view_location=target;space.region_3d.view_distance=14
                space.region_3d.view_rotation=cam.rotation_euler.to_quaternion();space.region_3d.view_perspective='PERSP'
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
    scene.frame_set(1);OUT.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(DEST))
    tri=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
    report={'source':str(DEST),'sourceSha256':hashlib.sha256(DEST.read_bytes()).hexdigest(),'sourceBytes':DEST.stat().st_size,'meshObjects':len(meshes),'baseTrianglesBeforeModifiers':tri,
        'bones':[b.name for b in arm.bones],'materials':list(mats),'ownerUndoRecovery':str(recovery),'scope':'Blender organic reference candidate; new anatomy/rig. Game export, detailed deformation and runtime NOT VERIFIED.'}
    (OUT/'source-receipt.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))

if __name__=='__main__':main()
