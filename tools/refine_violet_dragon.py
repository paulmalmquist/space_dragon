"""Second observed SD-080 sculpt pass: flatten scutes, fit throat, connect wing roots."""
import bpy,sys,math,json,hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from violet_dragon_geometry import batch_scales,bezier_tube

def main():
    scene=bpy.context.scene;rig=bpy.data.objects['VioletDragonRig.v006']
    if rig.get('SD080_refined'):raise RuntimeError('Already refined. Preserve this sculpt.')
    coll=bpy.data.collections['Violet Dragon v006 - living reference']
    # Keep the first complete candidate available without altering previous sources.
    backup=Path(bpy.data.filepath).with_name('Space Dragon-v006-first-shape-preserved.blend')
    if backup.exists():raise RuntimeError('First-shape preservation already exists')
    bpy.ops.wm.save_as_mainfile(filepath=str(backup),copy=True)
    mats={m.get('surfaceRole'):m for m in bpy.data.materials if m.name.startswith('SD080_')}
    mid=bpy.data.materials['SD080_Violet_Scale amethyst'];dark=bpy.data.materials['SD080_Violet_Scale dark plum']
    ventral=bpy.data.materials['SD080_Violet_Ventral lilac plates'];membrane=bpy.data.materials['SD080_Violet_Violet living membrane']
    for mat in [m for m in bpy.data.materials if m.name.startswith('SD080_')]:
        if any(x in mat.name for x in ['Scale','Ventral']):
            factor=.38 if 'Scale' in mat.name else .34
            for node in mat.node_tree.nodes:
                if node.type=='VALTORGB':
                    # Only color ramps; roughness/height ramps have no purple hue.
                    for e in node.color_ramp.elements:
                        r,g,b,a=e.color
                        if b>g*1.1 and r>g*1.1:e.color=(r*factor,g*factor,b*factor,a)
            mat.diffuse_color=tuple(c*factor for c in mat.diffuse_color[:3])+(1,)
    for obj in coll.objects:
        if obj.type!='MESH' or not obj.get('scale_count') or obj.name=='VD6 Lilac ventral scutes':continue
        vs=obj.data.vertices
        # Physical contours remain, but no bead-like pillow bulges.
        for start in range(0,len(vs),19):
            anchor=sum((vs[start+i].co for i in range(6)),Vector())/6
            normal=(vs[start+12].co-anchor).normalized()
            for i in range(19):
                v=vs[start+i];height=(v.co-anchor).dot(normal)
                if height>0:v.co-=normal*height*.78
        for poly in obj.data.polygons:
            if poly.index%19%3==0:poly.use_smooth=False
        obj.data.update()
    # Rebuild only our throat scutes against the actual chest/neck surfaces.
    trees=[]
    for name in ['VD6 Thorax','VD6 Curved neck']:
        o=bpy.data.objects[name];trees.append(BVHTree.FromPolygons([v.co for v in o.data.vertices],[p.vertices[:] for p in o.data.polygons]))
    plates=[]
    for i in range(14):
        z=.57+i*.225;hits=[]
        for tree in trees:
            hit=tree.ray_cast(Vector((0,5,z)),Vector((0,-1,0)),10)
            if hit[0] is not None:hits.append(hit)
        if not hits:continue
        point,normal,_,_=min(hits,key=lambda h:h[3]);normal=normal.normalized()
        if normal.y<0:normal=-normal
        width=.83-.14*abs(z-1.5) if z<2.2 else .62-(z-2.2)*.12
        plates.append(dict(center=point+normal*.012,tangent=(0,0,-1),normal=normal,width=width,length=.36,rise=.018,thickness=.008))
    old=bpy.data.objects['VD6 Lilac ventral scutes'];old.name='VD6 first-pass throat scutes - preserved';old.hide_set(True);old.hide_render=True
    new=batch_scales('VD6 Fitted throat scutes',plates,ventral,coll)
    def bind(obj,bone):
        obj.parent=rig;g=obj.vertex_groups.new(name=bone);g.add(list(range(len(obj.data.vertices))),1,'REPLACE');m=obj.modifiers.new('Violet source rig','ARMATURE');m.object=rig
    bind(new,'Neck')
    for sign in [-1,1]:
        bone='Wing_L' if sign<0 else 'Wing_R';s=lambda x:sign*x
        # An inner patagium joins wrist to chest/waist; the original fan alone
        # incorrectly left the long upper arm disconnected from its tissue.
        a=Vector((s(3.20),.12,3.65));b=Vector((s(1.12),-1.42,1.23));c=Vector((s(.66),-.24,1.82))
        verts=[];faces=[];n=24
        for row in range(n+1):
            u=row/n
            edge=b.lerp(c,u)
            for col in range(n+1):
                v=col/n;p=a.lerp(edge,v);p.z-=.12*math.sin(math.pi*u)*math.sin(math.pi*v);verts.append(tuple(p))
        for row in range(n):
            for col in range(n):
                k=row*(n+1)+col;face=(k,k+1,k+n+2,k+n+1);faces.append(face if sign>0 else tuple(reversed(face)))
        mesh=bpy.data.meshes.new(bone+' inner patagium');mesh.from_pydata(verts,[],faces);mesh.update()
        obj=bpy.data.objects.new('VD6 '+bone+' inner patagium',mesh);coll.objects.link(obj);mesh.materials.append(membrane)
        for p in mesh.polygons:p.use_smooth=True
        mod=obj.modifiers.new('Living tissue thickness','SOLIDIFY');mod.thickness=.012;mod.offset=0;bind(obj,bone)
        eye=bpy.data.objects['VD6 Violet slit eye '+str(sign)]
        for v in eye.data.vertices:v.co.x+=sign*.09;v.co.z+=.01
        # Larger cheek-root lobes blend the horns into the skull rather than
        # leaving floating antlers. A low nasal crest sharpens the profile.
        obj=bezier_tube('VD6 Nasal ridge '+str(sign),[(s(.12),2.56,3.72),(s(.17),2.17,3.91),(s(.22),1.87,4.02),(s(.12),1.57,4.16)],.075,0,dark,coll,samples=16,sides=10);bind(obj,'Head')
        obj=bezier_tube('VD6 Cheek crest root '+str(sign),[(s(.36),1.68,3.72),(s(.59),1.34,3.87),(s(.66),1.03,3.96),(s(.72),.72,4.08)],.15,0,mid,coll,samples=16,sides=12);bind(obj,'Head')
    # Narrower teeth avoid the uniform bright zipper of the first pass.
    for o in coll.objects:
        if o.type=='MESH' and 'tooth' in o.name:
            center=sum((v.co for v in o.data.vertices),Vector())/len(o.data.vertices)
            for v in o.data.vertices:v.co=center+(v.co-center)*.72
    rig['SD080_refined']=True
    scene.render.engine='BLENDER_EEVEE'
    scene.camera.data.lens=48
    bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
    out=ROOT/'artifacts/blender/violet-dragon-v006'
    scene.render.filepath=str(out/'refined-full.png');bpy.ops.render.render(write_still=True)
    report={'source':bpy.data.filepath,'sourceSha256':hashlib.sha256(Path(bpy.data.filepath).read_bytes()).hexdigest(),'sourceBytes':Path(bpy.data.filepath).stat().st_size,
      'refinements':['Flatter overlapping organic scutes','Chest-fitted throat plates','Connected inner wing patagium','Visible violet eyes and sharper nasal/brow construction','Narrower teeth','Deeper amethyst palette'],
      'scope':'Blender source review only; organic anatomy has a separate unvalidated deformation/export contract.'}
    (out/'refinement-receipt.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))

if __name__=='__main__':main()
