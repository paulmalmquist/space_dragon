"""Add fitted, removable mechanical armor to the preserved Oscar game source.

Run in the live Blender owner session. Original game/source meshes, weights,
materials and actions are never changed. Export is a separate single skinned
mesh; named editable components remain in their own hidden recovery collection.
For MCP execution, supply this script's __file__ in the exec globals, or set
SPACE_DRAGON_REPO explicitly. Outputs stay beside the open source/in that repo.
"""
import bpy
import bmesh
import hashlib
import json
import math
import os
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

repo_override = os.environ.get('SPACE_DRAGON_REPO')
if repo_override:
    REPO = Path(repo_override).resolve()
elif '__file__' in globals():
    REPO = Path(__file__).resolve().parents[1]
else:
    raise RuntimeError('Supply the authoring script __file__ or SPACE_DRAGON_REPO; do not guess a checkout.')
if not (REPO / 'tools' / 'build_oscar_mechanical_addon.py').is_file():
    raise RuntimeError('SPACE_DRAGON_REPO must resolve to the intended Space Dragon checkout.')
SOURCE = Path(bpy.data.filepath).resolve().parent
OUTPUT = SOURCE / 'Oscar Dragon-v009-mechanical-light.blend'
EXPORT = REPO / 'assets/game/local/spacecraft/oscar-dragon/mechanical-v004'
EDITABLE = 'Oscar Mechanical - Editable v004'
GAME = 'Oscar Mechanical - Game v004'


def main():
    if OUTPUT.exists() or bpy.data.collections.get(EDITABLE) or EXPORT.exists():
        raise RuntimeError('Preserve previous candidates; use a fresh version before rerunning.')
    rig = bpy.data.objects['OscarGameRig']
    base = bpy.data.collections['Oscar Dragon - Game Candidate v001']
    old_path = Path(bpy.data.filepath)
    if old_path.name != 'Oscar Dragon-v003-game-fullweights.blend':
        raise RuntimeError('Expected the preserved full-weight Oscar source.')
    original_hash = hashlib.sha256(old_path.read_bytes()).hexdigest()
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT))
    old_pose, old_frame = rig.data.pose_position, bpy.context.scene.frame_current
    rig.data.pose_position = 'REST'
    bpy.context.view_layer.update()
    coll = bpy.data.collections.new(EDITABLE)
    bpy.context.scene.collection.children.link(coll)
    game_coll = bpy.data.collections.new(GAME)
    bpy.context.scene.collection.children.link(game_coll)

    # Rest-space surface queries fit the armor to the actual imported anatomy.
    vertices, faces, influence, source_weights = [], [], [], []
    for obj in base.objects:
        if obj.type != 'MESH' or 'EYE_' in obj.name or 'DIENTES' in obj.name or 'LENGUA' in obj.name:
            continue
        start = len(vertices)
        vertices.extend(obj.matrix_world @ v.co for v in obj.data.vertices)
        groups = {g.index: g.name for g in obj.vertex_groups}
        for v in obj.data.vertices:
            row = [(a.weight, groups[a.group]) for a in v.groups if a.weight > 0]
            influence.append(max(row)[1] if row else 'root.x')
            source_weights.append(sorted(row, reverse=True)[:4])
        faces.extend(tuple(start+i for i in p.vertices) for p in obj.data.polygons)
    surface = BVHTree.FromPolygons(vertices, faces)
    nearest = KDTree(len(vertices))
    for i, point in enumerate(vertices): nearest.insert(point, i)
    nearest.balance()
    components = []

    def material(name, color, metal, rough, emission=None):
        mat = bpy.data.materials.new('OscarMech.' + name)
        mat.use_nodes = True
        shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        shader.inputs['Base Color'].default_value = (*color, 1)
        shader.inputs['Metallic'].default_value = metal
        shader.inputs['Roughness'].default_value = rough
        if emission:
            shader.inputs['Emission Color'].default_value = (*emission, 1)
            shader.inputs['Emission Strength'].default_value = 1.0
        mat.diffuse_color = (*color, 1)
        return mat

    gun = material('Gunmetal', (.04,.05,.065), .65, .42)
    red = material('CrimsonPaint', (.12,.008,.014), .10, .42)
    steel = material('MachinedEdges', (.3,.33,.36), .9, .29)
    energy = material('AmberReactor', (.32,.025,.002), .05, .36, (.8,.11,.008))

    def make(name, points, polygons, mat, bone, bevel=.008):
        mesh = bpy.data.meshes.new(name + '.Mesh')
        mesh.from_pydata(points, [], polygons); mesh.update()
        bm = bmesh.new(); bm.from_mesh(mesh); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(mesh); bm.free()
        obj = bpy.data.objects.new('OscarMech.' + name, mesh); coll.objects.link(obj)
        mesh.materials.append(mat)
        # Identity world geometry and original armature scale/rest are preserved.
        obj.parent = rig; obj.matrix_world = Matrix.Identity(4)
        group = obj.vertex_groups.new(name=bone); group.add(list(range(len(points))), 1, 'REPLACE')
        if bevel:
            mod = obj.modifiers.new('Manufactured edge bevel', 'BEVEL'); mod.width = bevel; mod.segments = 2
        mod = obj.modifiers.new('Original Oscar articulation', 'ARMATURE'); mod.object = rig
        obj['component_id'] = name; obj['attachment_bone'] = bone
        components.append(obj)
        return obj

    def hit(x,y):
        location, normal, face, distance = surface.ray_cast(Vector((x,y,3.5)), Vector((0,0,-1)), 7)
        if location is None: raise RuntimeError('Armor fit ray missed source at ' + str((x,y)))
        return location, influence[faces[face][0]]

    outline = [(-.38,-.5),(.38,-.5),(.5,-.28),(.43,.34),(0,.52),(-.43,.34),(-.5,-.28)]
    def plate(name,x,y,w,l,mat,bone=None,lift=.025):
        center, found_bone = hit(x,y); bone = bone or found_bone
        # Dense concentric shell follows the real surface at its center as well
        # as its boundary. Thin segmented composite armor uses transferred body
        # weights; rigid joint collars below continue to use one actual bone.
        center.z += lift; top=[center]; count=len(outline); rings=4
        for ring_index in range(1,rings+1):
            t=ring_index/rings
            for u,v in outline:
                p,_=hit(x+u*w*t,y+v*l*t); p.z+=lift; top.append(p)
        top_faces=[(0,1+i,1+(i+1)%count) for i in range(count)]
        for ring_index in range(rings-1):
            a=1+ring_index*count; b=a+count
            top_faces.extend((a+i,b+i,b+(i+1)%count,a+(i+1)%count) for i in range(count))
        n=len(top); points=[list(p) for p in top]+[list(p-Vector((0,0,.022))) for p in top]
        polygons=top_faces+[tuple(n+j for j in reversed(f)) for f in top_faces]
        a=1+(rings-1)*count
        polygons.extend((a+i,a+(i+1)%count,a+(i+1)%count+n,a+i+n) for i in range(count))
        obj=make(name,points,polygons,mat,bone,.004)
        obj.vertex_groups.clear()
        for vertex in obj.data.vertices:
            _, source_index, _=nearest.find(vertex.co-Vector((0,0,lift)))
            row=source_weights[source_index]; total=sum(weight for weight,_ in row)
            for weight, group_name in row:
                group=obj.vertex_groups.get(group_name) or obj.vertex_groups.new(name=group_name)
                group.add([vertex.index],weight/total,'REPLACE')
        obj['attachment_bone']='Surface-weighted segmented shell (maximum4)'
        return obj

    # Paired saddle plates leave the original dorsal spine and moving gaps open.
    for index,(y,w,l) in enumerate([(-.43,.30,.31),(-.10,.38,.33),(.24,.36,.33),(.57,.29,.29)]):
        if index < 2: continue # Preserve neck/forward spines; no fins cut through them.
        for side in (-1,1):
            x=side*(.19 if index<3 else .16)
            plate(f'Dorsal.{index}.{side}',x,y,w,l,gun)
            if index in (0,2): plate(f'DorsalInset.{index}.{side}',x,y,w*.68,l*.64,red,lift=.060)

    def bone_point(name,t):
        b=rig.data.bones[name]
        return rig.matrix_world @ b.head_local.lerp(b.tail_local,t)

    def ring(name,center,axis,radius,width,mat,bone):
        axis=axis.normalized(); u=axis.cross(Vector((0,0,1)))
        if u.length<.01: u=axis.cross(Vector((0,1,0)))
        u.normalize(); v=axis.cross(u).normalized()
        points=[]; count=16
        for inner in (False,True):
            rr=radius-(.022 if inner else 0)
            for end in (-.5,.5):
                points.extend(list(center+axis*width*end+(u*math.cos(i*math.tau/count)+v*math.sin(i*math.tau/count))*rr) for i in range(count))
        polygons=[]
        for i in range(count):
            j=(i+1)%count
            polygons.extend([(i,j,j+count,i+count),(i+count*2,i+count*3,j+count*3,j+count*2),
                (i,i+count*2,j+count*2,j),(i+count,j+count,j+count*3,i+count*3)])
        return make(name,points,polygons,mat,bone,.004)

    for side in ('l','r'):
        for label,bone,t,radius in [('WingDrive','arm_stretch.'+side,.32,.165),('ElbowDrive','forearm_stretch.'+side,.22,.105)]:
            center=bone_point(bone,t); axis=bone_point(bone,1)-bone_point(bone,0)
            ring(label+'.'+side,center,axis,radius,.10,gun,bone)
            for edge in (-1,1): ring(label+'.Edge.'+side+str(edge),center+axis.normalized()*.046*edge,axis,radius+.008,.018,steel,bone)
    for index,bone in enumerate(['c_tail_00.x','c_tail_01.x','c_tail_02.x']):
        center=bone_point(bone,.28); axis=bone_point(bone,1)-bone_point(bone,0)
        ring('TailCollar.'+str(index),center,axis,[.22,.15,.11][index],.08,gun,bone)
    for side in (-1,1):
        center=Vector((side*.155,-1.31,.64)); axis=Vector((side,0,0))
        ring('JawHinge.'+str(side),center,axis,.065,.036,gun,'head.x')
        ring('JawHinge.Trim.'+str(side),center+axis*.022,axis,.049,.013,steel,'head.x')

    # Small orange vents and beveled housings on the visible rear saddle.
    for side in (-1,1):
        for i in range(3):
            plate(f'CoolingVent.{side}.{i}',side*.20,.17+i*.065,.075,.018,energy,lift=.085)

    # Evaluate bevels in rest space once; keep source parts editable and named.
    copies=[]
    for obj in components:
        clone=obj.copy(); clone.data=obj.data.copy(); game_coll.objects.link(clone)
        for mod in list(clone.modifiers):
            if mod.type=='ARMATURE': clone.modifiers.remove(mod)
        bpy.context.view_layer.update()
        bpy.ops.object.select_all(action='DESELECT'); clone.select_set(True); bpy.context.view_layer.objects.active=clone
        with bpy.context.temp_override(object=clone, active_object=clone, selected_objects=[clone], selected_editable_objects=[clone]):
            for mod in list(clone.modifiers): bpy.ops.object.modifier_apply(modifier=mod.name)
        copies.append(clone)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in copies: obj.select_set(True)
    bpy.context.view_layer.objects.active=copies[0]; bpy.context.view_layer.update()
    with bpy.context.temp_override(object=copies[0], active_object=copies[0], selected_objects=copies, selected_editable_objects=copies):
        bpy.ops.object.join()
    game=copies[0]; game.name='OscarMechanical.v004.FittedArmor'; game.data.name='OscarMechanical.v004.FittedArmor.Mesh'
    # Bevel interpolation can combine nearby assignments. Bound only this NEW
    # accessory mesh to four positive weights, never the original Oscar body.
    for vertex in game.data.vertices:
        row=sorted([(a.weight,a.group) for a in vertex.groups if a.weight>.0001],reverse=True)[:4]
        for assignment in list(vertex.groups): game.vertex_groups[assignment.group].remove([vertex.index])
        total=sum(weight for weight,_ in row)
        for weight,index in row: game.vertex_groups[index].add([vertex.index],weight/total,'REPLACE')
    mod=game.modifiers.new('Original Oscar articulation','ARMATURE'); mod.object=rig
    for polygon in game.data.polygons: polygon.use_smooth=True
    # Intentional sharp manufactured bevels rather than smoothing across plate planes.
    game.data.set_sharp_from_angle(angle=math.radians(40))
    for obj in components: obj.hide_set(True); obj.hide_render=True
    coll.hide_render=True
    rig.data.pose_position=old_pose; bpy.context.scene.frame_set(old_frame)
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT'); game.select_set(True); bpy.context.view_layer.objects.active=game
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT))
    EXPORT.mkdir(parents=True)
    target=EXPORT/'dragon-oscar-mechanical-v004.glb'
    bpy.ops.object.select_all(action='DESELECT')
    for obj in (game,rig,bpy.data.objects['OscarAssetRoot']): obj.select_set(True)
    selected=[game,rig,bpy.data.objects['OscarAssetRoot']]
    with bpy.context.temp_override(window=bpy.context.window_manager.windows[0],object=game,active_object=game,selected_objects=selected,selected_editable_objects=selected):
        bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,use_active_scene=True,
            export_cameras=False,export_lights=False,export_animations=False,export_skins=True,export_all_influences=True,
            export_def_bones=False,export_leaf_bone=False,export_rest_position_armature=True,export_apply=True,
            export_yup=True,export_extras=True,export_materials='EXPORT',export_unused_images=False,
            export_hierarchy_flatten_bones=False,export_hierarchy_flatten_objs=False,export_armature_object_remove=False)
    triangles=sum(len(p.vertices)-2 for p in game.data.polygons)
    report={'schemaVersion':1,'assetId':'oscar-mechanical-v004','source':str(OUTPUT),'sourceSha256':hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
        'original':str(old_path),'originalSha256':original_hash,'originalUnchanged':hashlib.sha256(old_path.read_bytes()).hexdigest()==original_hash,
        'output':str(target),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'bytes':target.stat().st_size,
        'triangles':triangles,'materials':[m.name for m in game.data.materials],'components':[{'name':o.name,'bone':o['attachment_bone']} for o in components],
        'sourceBones':len(rig.data.bones),'maximumInfluences':4,'animationPolicy':'Remap surface-weighted shells and rigid collars to original Oscar rig; no duplicate animator or rest change.',
        'verification':'Exported, visual and Unity validation pending; not owner approved.'}
    (EXPORT/'export-receipt.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:report[k] for k in ['source','output','sha256','bytes','triangles','sourceBones','originalUnchanged']}))


if __name__=='__main__': main()
