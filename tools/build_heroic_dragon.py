"""SD-078: authored wing/chest/dorsal detail on a fresh v005 Blender source.

Run in the live v004 flight file via MCP. Never overwrites the baseline or a
previous v005. Existing game meshes, rig, maps, actions and markers are retained.
"""
import bpy, math, json, hashlib
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.kdtree import KDTree

ROOT = Path(__file__).resolve().parents[1]
SD = ROOT/'assets/source/local/spacecraft/space-dragon-spacecraft'
OUT = ROOT/'assets/game/local/spacecraft/space-dragon-spacecraft/heroic-v005'
DEST = SD/'Space Dragon Spacecraft-v005-heroic.blend'

def main():
    assert Path(bpy.data.filepath).name == 'Space Dragon Spacecraft-v004-flight.blend'
    assert not DEST.exists(), 'Preserve existing v005; choose a new revision instead.'
    OUT.mkdir(parents=True, exist_ok=True)
    rig = bpy.data.objects['SpaceDragonRig']; scene = bpy.context.scene
    rest = {b.name: [list(row) for row in b.matrix_local] for b in rig.data.bones}
    rig.animation_data.action = None
    for b in rig.pose.bones: b.matrix_basis = Matrix.Identity(4)
    old = bpy.data.collections['Game Candidate - optimized v001']
    old.name = 'Original Flight v004 - comparison only'
    game = bpy.data.collections.new('Game Candidate - heroic v005'); scene.collection.children.link(game)
    detail = bpy.data.collections.new('Heroic Upgrade - editable components'); scene.collection.children.link(detail)
    # Original meshes stay untouched, with copied mesh/material datablocks in the upgrade.
    materials = {}; base = []
    for o in list(old.objects):
        if o.type == 'MESH' and not o.hide_render:
            name = o.name; o.name = 'OriginalV004_' + name
            cp = o.copy(); cp.data = o.data.copy(); cp.name = name; game.objects.link(cp)
            cp.hide_render = False; cp.hide_set(False)
            for slot in cp.material_slots:
                original = slot.material
                if original.name not in materials:
                    mat = original.copy(); mat.name = original.name.replace('SD3_', 'SD5_'); materials[original.name] = mat
                slot.material = materials[original.name]
            base.append(cp)
        elif o.type == 'EMPTY': game.objects.link(o)
    game.objects.link(rig)
    old.hide_render = True; old.hide_viewport = True
    # Existing source/reference collections are preserved but not in the export set.
    for c in bpy.data.collections:
        if c not in [game, detail] and c.name != 'Review Studio - not for export':
            if c != old: c.hide_render = True
    dark = materials['SD3_Dark painted armor']; red = materials['SD3_Crimson painted armor']
    metal = materials['SD3_Exposed directional metal']; joint = materials['SD3_Flexible graphite joints']
    for name, mat in materials.items():
        bs = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        if 'Dark painted' in name: bs.inputs['Base Color'].default_value = (.038,.047,.058,1)
        if 'Exposed directional' in name: bs.inputs['Base Color'].default_value = (.19,.225,.25,1)

    # A real exportable membrane texture set, replacing unsupported procedural nodes.
    size = 1024; v,u = np.mgrid[0:size,0:size].astype(np.float32)/(size-1)
    broad = np.sin(u*17 + np.sin(v*9)*.4)*np.sin(v*21+u*3)
    fibres = np.sin(u*691+np.sin(v*31)*2)*np.sin(v*383+u*4)
    tension = np.sin((v + .035*np.sin(u*18))*149) * (.25 + .75*v)
    h = .003*fibres + .009*tension + .008*broad
    dy,dx = np.gradient(h); nx=-dx*95; ny=-dy*95; nz=np.ones_like(nx)
    norm=np.sqrt(nx*nx+ny*ny+nz*nz)
    def img(name, rgb, noncolor=False):
        image=bpy.data.images.new(name,width=size,height=size,alpha=True)
        image.colorspace_settings.name='Non-Color' if noncolor else 'sRGB'
        rgba=np.ones((size,size,4),dtype=np.float32); rgba[:,:,:3]=rgb
        image.pixels.foreach_set(rgba.ravel()); image.filepath_raw=str(OUT/(name+'.png'))
        image.file_format='PNG'; image.save(); image.pack(); return image
    # Base-color pixels are stored in linear Blender image values and encoded as sRGB PNG.
    color=np.stack([.23*(1+.08*broad+.025*fibres), .012*(1+.1*broad), .024*(1+.07*broad)],axis=-1)
    color_image=img('SD5_membrane_color',color)
    normal_image=img('SD5_membrane_normal',np.stack([nx/norm*.5+.5,ny/norm*.5+.5,nz/norm*.5+.5],axis=-1),True)
    rough=np.clip(.59+.045*broad+.022*fibres,.48,.7)
    rough_image=img('SD5_membrane_roughness',np.stack([rough,rough,rough],axis=-1),True)
    membrane=materials['SD3_Structured crimson membrane']; nt=membrane.node_tree
    bs=next(n for n in nt.nodes if n.type=='BSDF_PRINCIPLED')
    for n in list(nt.nodes):
        if n.type not in ['BSDF_PRINCIPLED','OUTPUT_MATERIAL']: nt.nodes.remove(n)
    for image,socket in [(color_image,'Base Color'),(rough_image,'Roughness')]:
        n=nt.nodes.new('ShaderNodeTexImage'); n.image=image; nt.links.new(n.outputs['Color'],bs.inputs[socket])
    n=nt.nodes.new('ShaderNodeTexImage'); n.image=normal_image; normal=nt.nodes.new('ShaderNodeNormalMap')
    normal.inputs['Strength'].default_value=.55; nt.links.new(n.outputs['Color'],normal.inputs['Color']); nt.links.new(normal.outputs['Normal'],bs.inputs['Normal'])
    bs.inputs['Metallic'].default_value=.015

    created=[]
    def mesh_object(name, verts, faces, mat, bone='Root', weight_source=None):
        me=bpy.data.meshes.new(name); me.from_pydata(verts,[],faces); me.update()
        o=bpy.data.objects.new(name,me); detail.objects.link(o); o.data.materials.append(mat)
        o.parent=rig; o.matrix_parent_inverse=rig.matrix_world.inverted()
        for b in rig.data.bones: o.vertex_groups.new(name=b.name)
        if weight_source:
            src,kd=weight_source
            for i,co in enumerate(verts):
                _,idx,_=kd.find(Vector(co))
                for g in src.data.vertices[idx].groups:
                    o.vertex_groups[src.vertex_groups[g.group].name].add([i],g.weight,'REPLACE')
        else: o.vertex_groups[bone].add(list(range(len(verts))),1,'REPLACE')
        mod=o.modifiers.new('Preserved SpaceDragonRig','ARMATURE'); mod.object=rig
        created.append(o); return o
    def plate(name, center, width, length, thickness, mat, bone='Root', angle=0, weights=None):
        # Tapered hexagonal plate: real thickness and an inset bevel ring catch highlights.
        outline=[(-.5,-.38),(-.32,-.5),(.32,-.5),(.5,-.38),(.42,.37),(0,.5),(-.42,.37)]
        verts=[]; ca,sa=math.cos(angle),math.sin(angle)
        for scale,z in [(1,-thickness/2),(1,thickness*.2),(.91,thickness/2)]:
            for x,y in outline:
                x*=width*scale;y*=length*scale
                verts.append((center[0]+x*ca-y*sa,center[1]+x*sa+y*ca,center[2]+z))
        n=len(outline); faces=[tuple(reversed(range(n))),tuple(range(2*n,3*n))]
        for ring in range(2):
            for j in range(n): faces.append((ring*n+j,ring*n+(j+1)%n,(ring+1)*n+(j+1)%n,(ring+1)*n+j))
        return mesh_object(name,verts,faces,mat,bone,weights)
    def tube(name, path, radius, mat, bone='Root', weights=None):
        verts=[]; sides=8
        for i,p in enumerate(path):
            p=Vector(p); direction=Vector(path[min(i+1,len(path)-1)])-Vector(path[max(i-1,0)])
            direction.normalize(); axis=direction.cross(Vector((0,0,1)))
            if axis.length<.01: axis=direction.cross(Vector((0,1,0)))
            axis.normalize(); other=direction.cross(axis).normalized(); taper=1-.45*i/max(1,len(path)-1)
            for j in range(sides): verts.append(tuple(p+(axis*math.cos(j*math.tau/sides)+other*math.sin(j*math.tau/sides))*radius*taper))
        faces=[]
        for i in range(len(path)-1):
            for j in range(sides): faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
        faces += [tuple(reversed(range(sides))),tuple(range((len(path)-1)*sides,len(path)*sides))]
        o=mesh_object(name,verts,faces,mat,bone,weights)
        for f in o.data.polygons: f.use_smooth=True
        return o

    # Wing structure follows the actual membrane surface and its blended skin weights.
    for side in ['L','R']:
        src=next(o for o in base if o.name=='Wing_'+side+' sculpted membrane')
        kd=KDTree(len(src.data.vertices))
        for vtx in src.data.vertices: kd.insert(src.matrix_world@vtx.co,vtx.index)
        kd.balance(); weights=(src,kd)
        def surface(a,b):
            x=min(49,int(a*50));y=min(11,int(b*12));fx=a*50-x;fy=b*12-y
            def p(i,j):return src.matrix_world@src.data.vertices[i*13+j].co
            return p(x,y).lerp(p(x+1,y),fx).lerp(p(x,y+1).lerp(p(x+1,y+1),fx),fy)+Vector((0,0,.026))
        for j,a in enumerate([.14,.29,.45,.62,.78,.92]):
            path=[surface(a+.016*math.sin(t/18*math.pi),t/18) for t in range(19)]
            tube('SD5_'+side+'_membrane structural rib_'+str(j),path,.026 if j<4 else .019,dark,weights=weights)
            tube('SD5_'+side+'_rib titanium crown_'+str(j),[p+Vector((0,0,.018)) for p in path[:5]],.010,metal,weights=weights)
        for j,a in enumerate([.10,.19,.29,.40,.51,.62,.73,.84,.94]):
            p=surface(a,.045);plate('SD5_'+side+'_leading edge shingle_'+str(j),p,.36,.23,.06,red if j%3==1 else dark,weights=weights)
            tube('SD5_'+side+'_leading edge hinge_'+str(j),[p+Vector((-.12,0,.045)),p+Vector((.12,0,.045))],.018,metal,weights=weights)
        # Tension cable above the scalloped trailing edge; no new collision.
        tube('SD5_'+side+'_membrane tension hem',[surface(t/40,.98) for t in range(1,40)],.014,dark,weights=weights)

    # Chest/shoulder plates are asymmetric in size, symmetric in functional construction.
    for sign in [-1,1]:
        label='L' if sign<0 else 'R'
        for j,(y,z,w,l) in enumerate([(.62,.91,.49,.66),(.20,.88,.54,.67),(-.23,.78,.46,.61)]):
            plate('SD5_'+label+'_overlapping shoulder cowl_'+str(j),(sign*.52,y,z),w,l,.11,dark,angle=sign*-.18)
            plate('SD5_'+label+'_crimson shoulder inset_'+str(j),(sign*.55,y+.025,z+.064),w*.63,l*.7,.045,red,angle=sign*-.18)
        tube('SD5_'+label+'_shoulder hydraulic sleeve',[(sign*.55,.49,.69),(sign*.92,.67,.66)],.075,joint)
        tube('SD5_'+label+'_shoulder piston',[(sign*.76,.60,.69),(sign*1.08,.71,.71)],.035,metal,bone='Wing_'+label)
        for j in range(4):
            plate('SD5_'+label+'_flank heat louver_'+str(j),(sign*.49,-.45-j*.17,.68-j*.023),.18,.10,.035,metal,angle=sign*.45)
    for j in range(8):
        y=1.40-j*.35;z=1.02 if y>.5 else .91+(y-.5)*.12
        plate('SD5_dorsal interlocking shield_'+str(j),(0,y,z),.50 if j<4 else .41,.43,.09,dark)
        plate('SD5_dorsal crimson spine inset_'+str(j),(0,y-.03,z+.055),.19,.31,.034,red)
    # Reinforced taper follows each existing tail bone; no new animation channels.
    for j in range(5):
        original=bpy.data.objects['SDG3_Tail_'+str(j)+'_SD3_Dark painted armor']
        points=[original.matrix_world@v.co for v in original.data.vertices]
        low=Vector([min(p[k] for p in points) for k in range(3)])
        high=Vector([max(p[k] for p in points) for k in range(3)])
        center=(low+high)*.5;center.z=high.z-.018;w=.35-j*.045
        plate('SD5_tail protective crown_'+str(j),center,w,.43,.06,dark,bone='Tail_'+str(j))

    # Keep editable component meshes in source; bake static bevel geometry into batched game meshes.
    batches={}
    for o in created:
        cp=o.copy(); cp.data=o.data.copy(); cp.name='GAME_'+o.name; game.objects.link(cp)
        batches.setdefault(cp.active_material.name,[]).append(cp)
    for matname,objects in batches.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
        o=bpy.context.object;o.name='SD5_Authored_'+matname
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.02)
        bpy.ops.object.mode_set(mode='OBJECT')
        tri=o.modifiers.new('Stable export triangles','TRIANGULATE');bpy.ops.object.modifier_apply(modifier=tri.name)
    detail.hide_render=True;detail.hide_viewport=True
    bpy.context.view_layer.update()
    assert rest == {b.name:[list(row) for row in b.matrix_local] for b in rig.data.bones}
    for o in base:
        if o.type=='MESH' and 'sculpted membrane' in o.name:
            tri=o.modifiers.new('Explicit membrane tangents topology','TRIANGULATE')
    scene['SD078']='Heroic v005: preserved rig/clips/markers, layered shoulders/back, weighted wing ribs, exportable membrane PBR maps'
    scene.frame_set(1);scene.render.resolution_x=1600;scene.render.resolution_y=1100
    bpy.ops.wm.save_as_mainfile(filepath=str(DEST))
    report={'source':str(DEST),'blender':bpy.app.version_string,'originalVisibleMeshes':len(base),'newEditableComponents':len(created),'gameMeshes':sum(o.type=='MESH' for o in game.objects),'materials':list(materials),'boneRestUnchanged':True,'sourceSHA256':hashlib.sha256(DEST.read_bytes()).hexdigest()}
    (OUT/'source-receipt.json').write_text(json.dumps(report,indent=2))
    print('HEROIC_SOURCE_READY',json.dumps(report))

if __name__=='__main__':main()
