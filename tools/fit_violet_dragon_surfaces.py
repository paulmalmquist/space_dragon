"""Local source-only seam correction after examining the actual close-up."""
import bpy,json,hashlib,math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1]

def main():
    rig=bpy.data.objects['VioletDragonRig.v006'];c=bpy.data.collections['Violet Dragon v006 - living reference']
    if rig.get('SD080_surface_fit'):raise RuntimeError('Preserve already-fitted candidate')
    def tree(name):
        o=bpy.data.objects[name];return BVHTree.FromPolygons([v.co for v in o.data.vertices],[p.vertices[:] for p in o.data.polygons])
    body=tree('VD6 Thorax');neck=tree('VD6 Curved neck');head=tree('VD6 Predatory skull')
    def nearest(trees,point):return min((t.find_nearest(point) for t in trees),key=lambda r:r[3])
    mappings={'Body shingle scales':['Thorax'],'Neck overlapping scales':['Curved neck'],'Small facial scales':['Predatory skull'],
       'Mandible scales':['Lower jaw'],'Tail shingle scales':['Long counterbalanced tail'],'Fitted throat scutes':['Thorax','Curved neck']}
    for side in ['L','R']:
        for limb in ['Fore','Hind']:mappings[f'{limb}_{side} limb scales']=[f'{limb}_{side} limb']
        mappings[f'Wing_{side} shoulder scales']=[f'Wing_{side} upper arm']
    fitted=0
    for objname,bases in mappings.items():
        obj=bpy.data.objects['VD6 '+objname];trees=[tree('VD6 '+n) for n in bases]
        for v in obj.data.vertices:
            hit,n,_,d=nearest(trees,v.co);n=n.normalized()
            # The six original rim vertices and six bevel vertices sit close to
            # the skin; only the centre carries a shallow raised organic keel.
            i=v.index%19;offset=.010 if i<6 else .015 if i<12 else .023 if i==12 else .005
            v.co=hit+n*offset
        obj.data.update();fitted+=1
    seated=[]
    for obj in c.objects:
        if obj.type!='MESH' or obj.hide_render:continue
        name=obj.name
        if any(x in name for x in ['Neck crest','Neck side blade']):trees=[neck]
        elif 'Dorsal crest' in name:trees=[body]
        elif any(x in name for x in ['Swept crown horn','Outer crown spur','Cheek swept blade','Lower cheek spur','Armored brow','Cheek crest root','Nasal ridge']):trees=[head,neck]
        else:continue
        # loft emits one ring at a time; derive the initial ring via UV V=0.
        uv=obj.data.uv_layers.active
        ring=set()
        if uv:
            for loop in obj.data.loops:
                if uv.data[loop.index].uv.y<1e-6:ring.add(loop.vertex_index)
        if len(ring)<3:continue
        center=sum((obj.data.vertices[i].co for i in ring),Vector())/len(ring)
        hit,n,_,distance=nearest(trees,center);delta=hit-n.normalized()*.065-center
        length=max((v.co-center).length for v in obj.data.vertices)
        for v in obj.data.vertices:
            ratio=min(1,(v.co-center).length/max(.01,length*.55));v.co+=delta*((1-ratio)**2)
        obj.data.update();seated.append({'object':name,'rootShift':delta.length})
    # The muzzle end was an obvious pipe cap. Round its central fan forward,
    # retaining a beak-like nose and the separately defined nostril pockets.
    skull=bpy.data.objects['VD6 Predatory skull'];maxy=max(v.co.y for v in skull.data.vertices)
    front=[v for v in skull.data.vertices if v.co.y>maxy-.025]
    if front:
        center=sum((v.co for v in front),Vector())/len(front)
        for v in front:
            radial=math.sqrt(((v.co.x-center.x)/.14)**2+((v.co.z-center.z)/.10)**2)
            v.co.y+=.13*max(0,1-radial*radial);v.co.z+=.018*max(0,1-radial)
    # Source expression: a smaller iris sits inside the recessed socket.
    for sign in [-1,1]:
        eye=bpy.data.objects['VD6 Violet slit eye '+str(sign)]
        center=sum((v.co for v in eye.data.vertices),Vector())/len(eye.data.vertices)
        for v in eye.data.vertices:v.co=center+(v.co-center)*.72;v.co.x-=sign*.028
    rig['SD080_surface_fit']=True
    out=ROOT/'artifacts/blender/violet-dragon-v006'
    (out/'surface-fit-receipt.json').write_text(json.dumps({'fittedScaleGroups':fitted,'seatedHornRoots':seated,'scope':'Observed source seam correction; not deformation or game validation'},indent=2)+'\n')
    bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
    p=Path(bpy.data.filepath);receipt=json.loads((out/'final-source-receipt.json').read_text());receipt.update(sourceSha256=hashlib.sha256(p.read_bytes()).hexdigest(),sourceBytes=p.stat().st_size)
    (out/'final-source-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print('Fitted',fitted,'scale groups and',len(seated),'horn roots',receipt)

if __name__=='__main__':main()
