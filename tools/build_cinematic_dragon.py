"""SD-059: staged, source-preserving head/neck/left-shoulder benchmark.

Run with background Blender, -- --stage silhouette|detail. Never edits v002.
All geometry and textures are original local construction; no external images.
"""
import bpy, math, json, sys, hashlib
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parents[1]
SOURCE_DIR=ROOT/'assets/source/local/spacecraft/space-dragon-spacecraft'
OUT=ROOT/'assets/game/local/spacecraft/space-dragon-spacecraft/cinematic-v001'
BASE=SOURCE_DIR/'Space Dragon Spacecraft-v002.blend'
STAGE=SOURCE_DIR/'Space Dragon Spacecraft-v003-silhouette.blend'
FINAL=SOURCE_DIR/'Space Dragon Spacecraft-v003-cinematic.blend'
HASH='5214e4c82053d41d42bc55062353b998cc59a2a2c76d294d88a39665690439dc'

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def collection(name):
    c=bpy.data.collections.new(name); bpy.context.scene.collection.children.link(c); return c
def move(o,c):
    for old in list(o.users_collection): old.objects.unlink(o)
    c.objects.link(o)
def select(objects,active=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects: o.hide_set(False); o.select_set(True)
    bpy.context.view_layer.objects.active=active or objects[0]
def material(name,color,metal,rough,emission=0):
    m=bpy.data.materials.new(name); m.use_nodes=True; m.diffuse_color=(*color,1)
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
    p.inputs['Coat Weight'].default_value=.18 if 'paint' in name else .025
    p.inputs['Coat Roughness'].default_value=.28
    p.inputs['Emission Color'].default_value=(*color,1); p.inputs['Emission Strength'].default_value=emission
    m['authoredSurface']=True; m['surfaceRole']=name.split('_',1)[-1]
    return m
def finish(o,name,mat,bone='Root',bevel=.015,smooth=False):
    o.name='SD3_'+name; move(o,upgrade); o.data.materials.clear(); o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth=smooth
    if bevel:
        b=o.modifiers.new('Source edge machining','BEVEL'); b.width=bevel; b.segments=4
        b.harden_normals=True
        w=o.modifiers.new('Weighted panel normals','WEIGHTED_NORMAL'); w.keep_sharp=True; w.weight=30
    o.parent=rig; g=o.vertex_groups.new(name=bone); g.add(list(range(len(o.data.vertices))),1,'REPLACE')
    a=o.modifiers.new('Preserved articulation','ARMATURE'); a.object=rig
    o['detailRegion']='head' if any(t in name for t in ['skull','snout','brow','eye','cheek','horn','jaw','tooth','mouth','nasal']) else 'neck' if 'neck' in name else 'left-shoulder'
    return o
def mesh(name,verts,faces,mat,bone='Root',bevel=.015,smooth=False):
    m=bpy.data.meshes.new('SD3_'+name); m.from_pydata(verts,[],faces); m.update()
    o=bpy.data.objects.new('SD3_'+name,m); upgrade.objects.link(o); return finish(o,name,mat,bone,bevel,smooth)
def plate(name,points,mat,bone='Root',thickness=.045,bevel=.012):
    # Closed solid wedge: true side walls preserve visible thickness.
    normal=(Vector(points[1])-Vector(points[0])).cross(Vector(points[2])-Vector(points[0])).normalized()
    n=len(points); verts=[tuple(Vector(p)+normal*thickness*.5) for p in points]+[tuple(Vector(p)-normal*thickness*.5) for p in points]
    faces=[tuple(range(n)),tuple(reversed(range(n,2*n)))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,verts,faces,mat,bone,bevel)
def hull(name,rings,mat,bone='Root',bevel=.025):
    vs=[]
    for y,w,b,t in rings:
        h=t-b
        vs.extend([(-w*.68,y,b),(-w,y,b+h*.22),(-w,y,t-h*.26),(-w*.58,y,t),(w*.58,y,t),(w,y,t-h*.26),(w,y,b+h*.22),(w*.68,y,b)])
    fs=[tuple(reversed(range(8))),tuple(range((len(rings)-1)*8,len(rings)*8))]
    fs.extend((j*8+k,j*8+(k+1)%8,(j+1)*8+(k+1)%8,(j+1)*8+k) for j in range(len(rings)-1) for k in range(8))
    return mesh(name,vs,fs,mat,bone,bevel)
def tube(name,points,radii,mat,bone='Root',sides=12,bevel=.005):
    vs=[]
    for i,(point,r) in enumerate(zip(points,radii)):
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        q=tangent.to_track_quat('Z','Y')
        vs.extend(tuple(Vector(point)+q@Vector((r*math.cos(a*math.tau/sides),r*math.sin(a*math.tau/sides),0))) for a in range(sides))
    fs=[tuple(reversed(range(sides))),tuple(range((len(points)-1)*sides,len(points)*sides))]
    fs.extend((j*sides+k,j*sides+(k+1)%sides,(j+1)*sides+(k+1)%sides,(j+1)*sides+k) for j in range(len(points)-1) for k in range(sides))
    return mesh(name,vs,fs,mat,bone,bevel,True)
def rod(name,a,b,r,mat,bone='Root',r2=None,sides=16): return tube(name,[a,b],[r,r if r2 is None else r2],mat,bone,sides)
def look_at(o,p): o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()

def setup():
    global rig,upgrade,original,body,mats
    assert sha(BASE)==HASH
    OUT.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(BASE),use_scripts=False)
    scene=bpy.context.scene; rig=bpy.data.objects['SpaceDragonRig']; scene.frame_set(1)
    for p in rig.pose.bones: p.matrix_basis.identity()
    visible=[o for o in scene.objects if o.type=='MESH' and not o.hide_render]
    original=collection('Original v002 - comparison only'); upgrade=collection('Cinematic Upgrade - head neck left shoulder'); body=collection('Retained Body - unchanged geometry')
    originals={o.name:{'world':[list(r) for r in o.matrix_world],'bone':[g.name for g in o.vertex_groups],'vertices':len(o.data.vertices)} for o in visible}
    (OUT/'source-components.json').write_text(json.dumps(originals,indent=2))
    for o in visible:
        cp=o.copy(); cp.data=o.data.copy(); cp.name='ORIGINAL_'+o.name; original.objects.link(cp); cp.hide_render=True; cp.hide_set(True)
    original.hide_render=True
    mats={
        'paint':material('SD3_Dark painted armor',(.055,.066,.075),.08,.34),
        'crimson':material('SD3_Crimson painted armor',(.24,.012,.021),.06,.32),
        'metal':material('SD3_Exposed directional metal',(.31,.33,.35),.94,.3),
        'rubber':material('SD3_Flexible graphite joints',(.026,.032,.035),0,.7),
        'membrane':material('SD3_Structured crimson membrane',(.15,.009,.017),.02,.57),
        'energy':material('SD3_Internal orange energy',(1,.085,.009),0,.31,3.2),
    }
    matmap={'SDM_Petrol blue armor':'paint','SDM_Oxide red armor':'crimson','SDM_Machined titanium':'metal','SDM_Graphite mechanisms':'rubber','SDM_Heat stained bronze':'metal','SDM_Red composite wing panels':'membrane','SDM_Amber reactor light':'energy','SDM_Eye hot core':'energy'}
    remove_keywords=('neck','cranial','mandibular','snout','cheek','mouth','brow','fang','eye','jaw')
    removed=[]
    for o in visible:
        if any(k in o.name.lower() for k in remove_keywords) or o.name=='SDM_shoulder red shield -1':
            removed.append(o.name); o.hide_render=True; o.hide_set(True); move(o,original)
        else:
            move(o,body)
            for slot in o.material_slots:
                if slot.material and slot.material.name in matmap: slot.material=mats[matmap[slot.material.name]]
    (OUT/'replaced-components.json').write_text(json.dumps(removed,indent=2))
    return scene

def silhouette():
    scene=setup(); p,c,m,r,e=[mats[k] for k in ['paint','crimson','metal','rubber','energy']]
    # A quiet dark inner cranial mass supports individually fitted exterior plates.
    hull('skull pressure case',[(1.80,.33,.57,1.02),(2.12,.54,.55,1.25),(2.48,.48,.57,1.17),(3.10,.31,.57,.91),(3.56,.245,.57,.79)],r,bevel=.035)
    hull('skull crown rear',[(1.78,.29,.92,1.07),(2.03,.49,1.03,1.27),(2.30,.43,1.05,1.25)],p,bevel=.025)
    hull('skull crown forward',[(2.32,.42,.98,1.23),(2.61,.37,.89,1.12),(2.79,.29,.82,1.01)],p,bevel=.023)
    hull('snout dorsal shield',[(2.81,.28,.76,.98),(3.24,.25,.70,.90),(3.53,.22,.63,.81)],p,bevel=.022)
    hull('snout nose cap',[(3.49,.24,.56,.79),(3.61,.23,.55,.74)],m,bevel=.018)
    # Open mouth lining is concave rather than a solid cube occupying the cavity.
    plate('mouth upper thermal lining',[(-.35,2.27,.56),(-.24,3.48,.55),(.24,3.48,.55),(.35,2.27,.56)],r,thickness=.035)
    hull('jaw mandible chassis',[(2.00,.36,.24,.39),(2.40,.40,.12,.28),(3.08,.30,.03,.20),(3.50,.235,.08,.24)],r,'Jaw',.03)
    plate('mouth lower thermal lining',[(-.29,2.25,.33),(.29,2.25,.33),(.22,3.42,.235),(-.22,3.42,.235)],m,'Jaw',.025,.008)
    for s in (-1,1):
        # Heavy brow extends over a deeply inset ocular aperture, narrowing toward snout.
        plate('brow armored overhang '+str(s),[(s*.47,2.08,1.17),(s*.66,2.23,1.15),(s*.57,2.56,1.04),(s*.40,2.77,.96),(s*.43,2.45,1.19)],p,thickness=.08,bevel=.022)
        plate('eye recessed housing '+str(s),[(s*.555,2.17,1.05),(s*.561,2.37,1.04),(s*.484,2.61,.92),(s*.512,2.37,.84),(s*.56,2.16,.9)],r,thickness=.045)
        plate('eye orange slit '+str(s),[(s*.588,2.22,1.005),(s*.565,2.41,.978),(s*.51,2.55,.915),(s*.548,2.34,.914),(s*.585,2.23,.939)],e,thickness=.012,bevel=.004)
        plate('cheek zygomatic upper '+str(s),[(s*.48,1.91,.87),(s*.575,2.11,1.08),(s*.557,2.19,.86),(s*.46,2.52,.66),(s*.50,2.12,.53)],p,thickness=.085,bevel=.024)
        plate('cheek lower cheek guard '+str(s),[(s*.52,2.15,.78),(s*.49,2.52,.65),(s*.43,2.67,.58),(s*.48,2.34,.47),(s*.53,2.13,.49)],c,thickness=.045,bevel=.016)
        for j in range(3):
            y=2.69+j*.285; w=.423-j*.055
            plate('snout lateral plate %d %d'%(s,j),[(s*w,y,.88-j*.045),(s*(w-.05),y+.255,.84-j*.045),(s*(w-.06),y+.255,.575),(s*(w+.01),y,.586)],p,thickness=.05,bevel=.012)
        plate('jaw lower rail '+str(s),[(s*.40,2.12,.34),(s*.435,2.48,.25),(s*.31,3.14,.17),(s*.25,3.48,.23),(s*.25,3.42,.095),(s*.33,3.08,.025),(s*.41,2.40,.11)],p,'Jaw',.07,.023)
        tube('horn swept skull spar '+str(s),[(s*.38,2.02,1.16),(s*.46,1.83,1.38),(s*.58,1.51,1.51),(s*.64,1.15,1.58),(s*.67,.95,1.61)],[.16,.14,.105,.06,.008],p,sides=8,bevel=.013)
        # Purposeful short crown root guards replace triangular spike panels.
        plate('horn crimson root cover '+str(s),[(s*.29,2.07,1.21),(s*.48,1.91,1.41),(s*.57,1.69,1.48),(s*.39,1.87,1.18)],c,thickness=.04,bevel=.014)
        rod('jaw hinge bearing '+str(s),(s*.425,2.10,.36),(s*.61,2.10,.36),.18,m,'Jaw',sides=24)
        rod('jaw hinge center '+str(s),(s*.609,2.10,.36),(s*.635,2.10,.36),.096,p,'Jaw',sides=24)
        for j in range(8):
            y=2.45+j*.132; w=.39-(y-2.45)*.142; length=.17 if j in (0,3) else .12
            tube('tooth upper %d %d'%(s,j),[(s*w,y,.575),(s*(w-.015),y+.018,.51),(s*(w-.03),y+.057,.575-length)],[.038,.029,.002],m,sides=6,bevel=.002)
            tube('tooth lower %d %d'%(s,j),[(s*(w-.025),y+.06,.24),(s*(w-.03),y+.07,.31),(s*(w-.045),y+.10,.36)],[.03,.022,.002],m,'Jaw',sides=6,bevel=.002)
    # Four overlapping neck courses: each has quiet dorsal panel, angled flank, exposed flex cuff.
    rod('neck internal spar',(0,.72,.34),(0,2.02,.70),.22,r,sides=16)
    for j in range(4):
        y=.87+j*.265; z=.55+j*.075; w=.43-j*.025
        hull('neck overlapping dorsal '+str(j),[(y-.15,w,z+.08,z+.37),(y+.09,w*.9,z+.12,z+.40),(y+.17,w*.72,z+.17,z+.36)],p,bevel=.02)
        for s in (-1,1):
            plate('neck lateral shield %d %d'%(j,s),[(s*w,y-.13,z+.24),(s*(w+.06),y-.10,z-.03),(s*(w-.02),y+.16,z+.01),(s*w*.85,y+.18,z+.29)],c if j==0 else p,thickness=.04,bevel=.012)
            rod('neck bearing %d %d'%(j,s),(s*(w-.01),y,z-.045),(s*(w+.08),y,z-.045),.13,m,sides=20)
            rod('neck bearing cap %d %d'%(j,s),(s*(w+.081),y,z-.045),(s*(w+.095),y,z-.045),.085,r,sides=20)
    # Left shoulder only: layered socket surround with clearance around original wing articulation.
    for j in range(3):
        x=.79+j*.25; y=.67+j*.015; z=1.02-j*.075
        plate('left shoulder layered carapace '+str(j),[(-x+.08,y+.25,z-.04),(-x-.16,y+.31,z+.025),(-x-.28,y+.10,z-.02),(-x-.24,y-.25,z-.21),(-x+.055,y-.27,z-.16)],c if j==1 else p,'Wing_L',.07,.024)
    plate('left shoulder socket yoke',[(-.69,.74,.82),(-.80,.97,.94),(-1.12,1.05,.91),(-1.28,.82,.79),(-1.06,.77,.72)],m,'Wing_L',.07,.018)
    scene['benchmarkScope']='Head, neck and left shoulder; retained body geometry only palette adjusted.'
    scene['measurementBasis']='1366x768: head62x59/default and101x95/RMB. One1024sectionatlas, headpriority1.5; no4K.'
    scene['originalSourceHash']=HASH
    bpy.ops.wm.save_as_mainfile(filepath=str(STAGE))
    render_views('stage1',detail=False)

def render_views(prefix,detail=True):
    scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE'
    scene.render.resolution_x=1100; scene.render.resolution_y=820; scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=False
    scene.world.color=(.2,.2,.2)
    bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND'); bg.inputs['Color'].default_value=(.14,.16,.19,1); bg.inputs['Strength'].default_value=.5
    for o in scene.objects:
        if o.type=='LIGHT':
            o.data.color=(1,1,1); o.data.energy=1400 if 'Key' in o.name else 950; o.data.size=5
    cam=scene.camera; cam.data.type='ORTHO'
    scene.view_settings.view_transform='AgX'; scene.view_settings.look='AgX - Medium High Contrast'; scene.view_settings.exposure=0
    views=[('front',(0,9,2.7),(0,1.9,.7),4.15),('side',(8,1.9,2.0),(0,1.9,.65),4.6),('three-quarter',(5.5,6.5,3.8),(0,1.8,.65),4.8)]
    for label,pos,target,scale in views:
        cam.location=pos; look_at(cam,target); cam.data.ortho_scale=scale
        scene.render.filepath=str(OUT/(prefix+'-'+label+'.png')); bpy.ops.render.render(write_still=True)
    print('STAGE_VIEWS_READY',str(OUT),flush=True)

def add_surface_nodes(mat,kind):
    nt=mat.node_tree; p=next(n for n in nt.nodes if n.type=='BSDF_PRINCIPLED')
    tex=nt.nodes.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value=95 if kind!='metal' else 165
    tex.inputs['Detail'].default_value=2; tex.inputs['Roughness'].default_value=.65
    coord=nt.nodes.new('ShaderNodeTexCoord'); mapping=nt.nodes.new('ShaderNodeVectorMath'); mapping.operation='MULTIPLY'
    mapping.inputs[1].default_value=(1,1,1) if kind!='metal' else (1,7,.4)
    nt.links.new(coord.outputs['Generated'],mapping.inputs[0]); nt.links.new(mapping.outputs['Vector'],tex.inputs['Vector'])
    bump=nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.12 if kind!='rubber' else .18; bump.inputs['Distance'].default_value=.0012
    nt.links.new(tex.outputs['Fac'],bump.inputs['Height']); nt.links.new(bump.outputs['Normal'],p.inputs['Normal'])
    ramp=nt.nodes.new('ShaderNodeMapRange'); rough=p.inputs['Roughness'].default_value
    ramp.inputs['To Min'].default_value=rough-.035; ramp.inputs['To Max'].default_value=rough+.045
    nt.links.new(tex.outputs['Fac'],ramp.inputs['Value']); nt.links.new(ramp.outputs[0],p.inputs['Roughness'])

def detail():
    global rig,upgrade,original,body,mats
    bpy.ops.wm.open_mainfile(filepath=str(STAGE),use_scripts=False)
    scene=bpy.context.scene; rig=bpy.data.objects['SpaceDragonRig']
    upgrade=bpy.data.collections['Cinematic Upgrade - head neck left shoulder']; original=bpy.data.collections['Original v002 - comparison only']; body=bpy.data.collections['Retained Body - unchanged geometry']
    names=['Dark painted armor','Crimson painted armor','Exposed directional metal','Flexible graphite joints','Structured crimson membrane','Internal orange energy']
    mats={key:bpy.data.materials['SD3_'+name] for key,name in zip(['paint','crimson','metal','rubber','membrane','energy'],names)}
    p,c,m,r,e=[mats[k] for k in ['paint','crimson','metal','rubber','energy']]
    # Darker paint remains nonzero, with a restrained clearcoat; metal remains distinct.
    paint=next(n for n in p.node_tree.nodes if n.type=='BSDF_PRINCIPLED'); paint.inputs['Base Color'].default_value=(.028,.035,.042,1); p.diffuse_color=(.028,.035,.042,1)
    for key,mat in mats.items():
        if key!='energy': add_surface_nodes(mat,key)
    for s in (-1,1):
        # Narrow layered brow endplates and quiet centerline service cap.
        plate('brow inset crimson blade '+str(s),[(s*.49,2.14,1.186),(s*.59,2.25,1.162),(s*.535,2.47,1.092),(s*.48,2.43,1.14)],c,thickness=.017,bevel=.007)
        # Purposeful rear cheek vents leave the main snout faces quiet.
        for j in range(3):
            y=1.97+j*.075
            plate('cheek cooling slot %d %d'%(s,j),[(s*.53,y,.79),(s*.548,y+.035,.85),(s*.55,y+.066,.78),(s*.527,y+.036,.70)],r,thickness=.014,bevel=.004)
        # Coaxial rotary drive at the EXACT existing Jaw pivot. Stationary outer
        # housing is Root weighted, rotor Jaw weighted, so all angles stay concentric.
        for old in ['jaw hinge bearing ','jaw hinge center ']:
            o=bpy.data.objects['SD3_'+old+str(s)]
            center=sum((v.co for v in o.data.vertices),Vector())/len(o.data.vertices)
            for v in o.data.vertices: v.co.y+=2.1-center.y; v.co.z+=.36-center.z
        rod('jaw rotary servo housing '+str(s),(s*.43,2.10,.36),(s*.63,2.10,.36),.205,r,sides=32)
        rod('jaw rotary servo rim '+str(s),(s*.63,2.10,.36),(s*.652,2.10,.36),.175,m,sides=32)
        rod('jaw rotary servo rotor '+str(s),(s*.653,2.10,.36),(s*.675,2.10,.36),.139,p,'Jaw',sides=24)
        rod('jaw rotary servo key '+str(s),(s*.676,2.10,.36),(s*.687,2.10,.36),.063,m,'Jaw',sides=6)
        for j in range(4):
            a=j*math.pi*.5; y=2.1+math.cos(a)*.155; z=.36+math.sin(a)*.155
            rod('jaw housing captive bolt %d %d'%(s,j),(s*.651,y,z),(s*.663,y,z),.017,m,sides=6)
        for j in range(6):
            yy=2.34+j*.17; w=.39-(yy-2.45)*.142
            # Tooth root sockets give the fangs visible fitted construction.
            rod('tooth upper root %d %d'%(s,j),(s*w,yy,.55),(s*w,yy,.59),.045,r,sides=10)
        for j in range(4):
            y=.87+j*.265; z=.55+j*.075; w=.43-j*.025
            # Cuffs and fixed bolt patterns show articulation without repetitive tiny greebles.
            for k in range(3):
                yy=y+.12+k*.027
                rod('neck flexible cuff %d %d %d'%(s,j,k),(s*(w-.05),yy,z-.045),(s*(w+.075),yy,z-.045),.094 if k==1 else .086,r,sides=16)
            a=(s*(w+.095),y,z-.045)
            rod('neck bearing key %d %d'%(s,j),(a[0],a[1],a[2]),(a[0]+s*.012,a[1],a[2]),.039,m,sides=6)
            if j<3:
                rod('neck parallel piston %d %d'%(s,j),(s*(w+.01),y-.10,z-.13),(s*(w-.01),y+.21,z-.04),.035,r,sides=12)
                rod('neck parallel rod %d %d'%(s,j),(s*(w-.01),y+.12,z-.07),(s*(w-.02),y+.24,z-.03),.019,m,sides=12)
        # Curved energy conduit appears only in the protected lower neck.
        tube('neck protected conduit '+str(s),[(s*.38,.91,.22),(s*.35,1.24,.31),(s*.32,1.60,.40),(s*.31,1.94,.51)],[.018]*4,r,sides=10)
        rod('neck short energy indicator '+str(s),(s*.38,1.01,.24),(s*.37,1.12,.27),.008,e,sides=8)
        # Root band visually integrates horn into skull instead of a bare floating blade.
        tube('horn root machined collar '+str(s),[(s*.38,2.02,1.16),(s*.42,1.91,1.30)],[.165,.151],m,sides=8,bevel=.008)
        for j in range(2):
            x=s*(.45+j*.02); y=2.07-j*.12
            rod('horn captive fastener %d %d'%(s,j),(x,y,1.24+j*.04),(x,y,1.26+j*.04),.025,m,sides=6)
    plate('skull central service hatch',[(-.17,2.36,1.238),(.17,2.36,1.238),(.13,2.62,1.13),(-.13,2.62,1.13)],c,thickness=.018,bevel=.01)
    # Fitted cheek/snout courses: angled stepped overlaps instead of three equal tiles.
    for s in (-1,1):
        for j in range(3):
            o=bpy.data.objects['SD3_snout lateral plate %d %d'%(s,j)]
            center=sum((v.co for v in o.data.vertices),Vector())/len(o.data.vertices)
            for v in o.data.vertices:
                v.co.y += (v.co.z-center.z)*(.22 if j!=1 else -.19)
                v.co.z += (.025 if j==0 else -.015 if j==1 else .0)
                v.co.x += s*(.014 if j==0 else -.004 if j==1 else .007)
        for j in range(4):
            o=bpy.data.objects['SD3_neck lateral shield %d %d'%(j,s)]
            center=sum((v.co for v in o.data.vertices),Vector())/len(o.data.vertices)
            for v in o.data.vertices:
                v.co.y=center.y+(v.co.y-center.y)*.82
                if v.co.z<center.z: v.co.y-=.035
    # Inset spine along the nose breaks its slab response while preserving broad calm planes.
    plate('snout recessed service channel',[(-.055,2.84,.989),(.055,2.84,.989),(.04,3.32,.879),(-.04,3.32,.879)],r,thickness=.012,bevel=.005)
    for j in range(2):
        y=2.96+j*.22
        plate('snout channel bridge '+str(j),[(-.043,y,.962-j*.055),(.043,y,.962-j*.055),(.041,y+.035,.954-j*.055),(-.041,y+.035,.954-j*.055)],m,thickness=.009,bevel=.003)
    # Left shoulder engineering: a rigid outer yoke and ribbed flexible socket visible between plates.
    for j in range(4):
        rod('left shoulder socket rib '+str(j),(-.82-j*.045,.56,.63),(-.82-j*.045,.77,.68),.15,r,'Wing_L',sides=20)
    rod('left shoulder drive casing',(-.78,.46,.68),(-1.32,.66,.79),.075,r,'Wing_L',sides=20)
    rod('left shoulder drive ram',(-1.18,.61,.76),(-1.58,.78,.79),.034,m,'Wing_L',sides=16)
    for j in range(3):
        x=-.81-j*.25; z=1.025-j*.075
        rod('left shoulder hex fastener '+str(j),(x,.87,z),(x,.87,z+.025),.027,m,'Wing_L',sides=6)
    # Measured extreme-flap triangle tests require this outboard clearance.
    # The original shoulder starts at x=-.65; the new carapace covers the upper
    # wing-root arm rather than rotating into the fixed thorax/neck.
    for o in upgrade.objects:
        if o.name.startswith('SD3_left shoulder'):
            for v in o.data.vertices:v.co.x-=.45
    scene['leftShoulderClearanceOffsetM']=-.45
    scene['sourceStage']='Detailed local authoring; one shoulder benchmark only'
    bpy.ops.wm.save_as_mainfile(filepath=str(FINAL))
    render_views('detail-neutral')
    print('DETAIL_SOURCE_READY',str(FINAL),flush=True)

if __name__=='__main__':
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    stage=args[args.index('--stage')+1] if '--stage' in args else 'silhouette'
    if stage=='silhouette': silhouette()
    elif stage=='detail': detail()
    else: raise ValueError('Unknown stage: '+stage)
