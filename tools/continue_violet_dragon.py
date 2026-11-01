"""Preserved v006 -> independent v007 source and weighted organic refinement."""
import bpy,sys,json,hashlib,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools'))
from violet_dragon_face import apply_face_upgrade
SOURCE=ROOT/'assets/source/local/spacecraft/space-dragon-spacecraft'
DEST=SOURCE/'Space Dragon-v007-violet-flight.blend'
OUT=ROOT/'artifacts/blender/violet-dragon-v007'

def main():
    if DEST.exists():raise RuntimeError('Preserve existing v007; choose new revision')
    recovery=SOURCE/'Space Dragon-v006-live-before-v007.blend'
    if recovery.exists():raise RuntimeError('Live recovery already exists')
    bpy.ops.wm.save_as_mainfile(filepath=str(recovery),copy=True)
    old=bpy.data.collections['Violet Dragon v006 - living reference']
    col=bpy.data.collections.new('Violet Dragon v007 - refined source');bpy.context.scene.collection.children.link(col)
    copies={};materials={}
    for obj in old.objects:
        cp=obj.copy()
        if obj.data:cp.data=obj.data.copy()
        cp.name=obj.name.replace('VD6','VD7').replace('v006','v007')
        col.objects.link(cp);copies[obj]=cp;cp.hide_set(obj.hide_get());cp.hide_render=obj.hide_render
        if cp.type=='MESH':
            for i,mat in enumerate(obj.data.materials):
                if mat not in materials:
                    materials[mat]=mat.copy();materials[mat].name=mat.name+'_v007'
                cp.data.materials[i]=materials[mat]
    for oldobj,cp in copies.items():
        if oldobj.parent in copies:cp.parent=copies[oldobj.parent]
        if cp.type=='MESH':
            for mod in cp.modifiers:
                if mod.type=='ARMATURE' and mod.object in copies:mod.object=copies[mod.object]
        oldobj.hide_set(True);oldobj.hide_render=True
    for mat in materials.values():
        if mat.use_nodes:
            for n in mat.node_tree.nodes:
                if n.type=='TEX_COORD' and n.object in copies:n.object=copies[n.object]
    rig=bpy.data.objects['VioletDragonRig.v007'];rig.hide_set(False);rig.hide_render=False
    roles={'scale_dark':'Scale dark plum','scale_mid':'Scale amethyst','scale_light':'Scale lilac ridge','ventral':'Ventral lilac plates',
      'horn':'Near black keratin','membrane':'Violet living membrane','eye':'Violet iris energy','mouth':'Living mouth tissue','teeth':'Warm ivory teeth'}
    mats={role:next(m for m in materials.values() if m.name=='SD080_Violet_'+label+'_v007') for role,label in roles.items()}
    face=apply_face_upgrade(col,rig,mats,prefix='VD7')
    # Blend attachment zones consistently across skin, scales, fins and scutes.
    tailcenters=[(rig.data.bones['Tail_'+str(i)].head_local+rig.data.bones['Tail_'+str(i)].tail_local)*.5 for i in range(5)]
    for obj in col.objects:
        if obj.type!='MESH' or obj.hide_render:continue
        names={g.index:g.name for g in obj.vertex_groups}
        initial={v.index:{names[g.group]:g.weight for g in v.groups if g.group in names} for v in obj.data.vertices}
        for vertex in obj.data.vertices:
            groups=initial[vertex.index];co=vertex.co
            if any(n.startswith('Tail_') for n in groups):
                distances=sorted(((co-p).length,i) for i,p in enumerate(tailcenters))[:2]
                w=[1/max(.03,d)**3 for d,i in distances];total=sum(w)
                weights={'Tail_'+str(distances[j][1]):w[j]/total for j in range(2)}
            elif 'Neck' in groups:
                neck=max(0,min(1,(co.z-1.6)/.55));head=max(0,min(1,(co.z-3.2)/.48))*.65
                weights={'Root':1-neck,'Neck':neck*(1-head),'Head':neck*head}
            elif any(n.startswith('Wing_') for n in groups):
                name=next(n for n in groups if n.startswith('Wing_'));w=max(0,min(1,(abs(co.x)-.6)/.80));weights={'Root':1-w,name:w}
            elif any(n.startswith(('Fore_','Hind_')) for n in groups):
                name=next(n for n in groups if n.startswith(('Fore_','Hind_')));distance=(co-rig.data.bones[name].head_local).length
                w=max(0,min(1,distance/.42));weights={'Root':1-w,name:w}
            else:continue
            for group in obj.vertex_groups:
                try:group.remove([vertex.index])
                except RuntimeError:pass
            for name,weight in weights.items():
                if weight>1e-6:
                    group=obj.vertex_groups.get(name) or obj.vertex_groups.new(name=name);group.add([vertex.index],weight,'REPLACE')
    # Render this continuous head/neck source before converting a separate game rest pose.
    scene=bpy.context.scene;scene['selectedArtDirection']='SD080 living purple v007 refinement and flight candidate'
    for obj in bpy.context.selected_objects:obj.select_set(False)
    rig.select_set(True);bpy.context.view_layer.objects.active=rig
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/'face-receipt.json').write_text(json.dumps(face,indent=2,default=str)+'\n')
    bpy.ops.wm.save_as_mainfile(filepath=str(DEST))
    record={'source':str(DEST),'sourceSha256':hashlib.sha256(DEST.read_bytes()).hexdigest(),'sourceBytes':DEST.stat().st_size,
       'visibleMeshes':sum(o.type=='MESH' and not o.hide_render for o in col.objects),'sourceTriangles':sum(len(p.vertices)-2 for o in col.objects if o.type=='MESH' and not o.hide_render for p in o.data.polygons),
       'recovery':str(recovery),'scope':'Refined organic source; blended neck/wing/limb/tail weights. Deformation/export/player pending.'}
    (OUT/'source-receipt.json').write_text(json.dumps(record,indent=2)+'\n');print(record)

if __name__=='__main__':main()
