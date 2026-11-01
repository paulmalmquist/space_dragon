"""Build reference-led, metre-scale Town Drive vegetation in isolated Blender.

Run with Blender 5.2 --background --factory-startup --disable-autoexec --python
this-file -- --repo <checkout> --source-library <live-checkout> --revision r01.
Never opens or edits the shared interactive Blender scene. Each revision is new.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from pathlib import Path
import random
import struct
import sys
import zlib

import bpy
from mathutils import Vector


def args():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--repo', type=Path, required=True)
    p.add_argument('--source-library', type=Path, required=True)
    p.add_argument('--revision', required=True)
    p.add_argument('--lod-review-only', action='store_true', help='Render only the changed distant variants; near export remains generated and measured.')
    return p.parse_args(sys.argv[sys.argv.index('--') + 1:])


A = args()
if not A.revision.startswith('r') or not A.revision[1:].isdigit():
    raise ValueError('Use a numbered new revision, for example r01.')
SRC = A.repo / 'assets/source/local/town-drive/reference-v004' / A.revision
OUT = A.repo / 'assets/game/local/town-drive/reference-v004' / A.revision
if SRC.exists() or OUT.exists():
    raise FileExistsError('Choose a new revision; authored sources and exports are immutable.')
SRC.mkdir(parents=True)
OUT.mkdir(parents=True)
(SRC / 'textures').mkdir()
(SRC / 'review').mkdir()

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def png(path, width, height, pixels):
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)
    rows = b''.join(b'\0' + bytes(pixels[y*width*4:(y+1)*width*4]) for y in range(height))
    Path(path).write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width,height,8,6,0,0,0)) + chunk(b'IDAT',zlib.compress(rows,9)) + chunk(b'IEND',b''))


def procedural_leaf_atlas():
    # Authored surface variation, not represented as a photographic scan.
    width,height=256,512
    pixels=[]
    for y in range(height):
        dry=y>=height//2
        t=(y%(height//2))/(height//2-1)
        for x in range(width):
            u=x/(width-1)
            fine=.025*math.sin(u*900)+.013*math.sin(u*1913+t*87)
            veins=.035*math.sin((u*34 + .5*math.sin(t*12))*math.pi)
            middle=.08*math.exp(-((u-.5)/.017)**2)
            tip=.08*t*t
            bases=(.46,.36,.20) if dry else (.37,.48,.20)
            factor=.84+.17*math.sin(t*math.pi)+fine+veins-middle-tip
            pixels.extend([max(0,min(255,round(c*factor*255))) for c in bases]+[255])
    path=SRC/'textures/palm-leaf-original.png';png(path,width,height,pixels)
    return path


def image_copy(path, name):
    target=SRC/'textures'/name
    target.write_bytes(Path(path).read_bytes())
    return target


LIB=A.source_library/'assets/source/local'
bark_root=LIB/'drive-materials/v001'
leaf_root=LIB/'town-drive/vegetation-v001/island_tree_02'
sources=[]
for path in [bark_root/'palm_tree_bark_diff_1k.jpg',bark_root/'palm_tree_bark_nor_gl_1k.jpg',bark_root/'palm_tree_bark_rough_1k.jpg',leaf_root/'textures/island_tree_02_leaves_diff_1k.jpg',leaf_root/'textures/island_tree_02_leaves_nor_gl_1k.jpg',leaf_root/'textures/island_tree_02_leaves_arm_1k.jpg',leaf_root/'textures/island_tree_02_branches_diff_1k.jpg',leaf_root/'textures/island_tree_02_branches_nor_gl_1k.jpg',leaf_root/'textures/island_tree_02_branches_arm_1k.jpg',leaf_root/'alpha.png']:
    if not path.is_file():raise FileNotFoundError(path)
    sources.append({'path':str(path.relative_to(A.source_library)).replace('\\','/'),'sha256':sha(path),'bytes':path.stat().st_size})

# Factory startup contains only Blender's defaults in this isolated process.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
scene.unit_settings.scale_length=1
scene.render.engine='CYCLES'
scene.cycles.samples=16
scene.cycles.use_denoising=True
scene.render.resolution_x=1120
scene.render.resolution_y=840
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX'
scene.world.color=(.45,.5,.55)


def loaded(path, color=True):
    image=bpy.data.images.load(str(path),check_existing=True)
    image.colorspace_settings.name='sRGB' if color else 'Non-Color'
    return image


def material(name, base, normal=None, rough=None, alpha=False, tint=(1,1,1,1), normal_strength=.6):
    mat=bpy.data.materials.new(name);mat.use_nodes=True
    mat.diffuse_color=tint
    mat.use_backface_culling=False
    n=mat.node_tree.nodes;l=mat.node_tree.links
    bs=n.get('Principled BSDF');bs.inputs['Roughness'].default_value=.76
    bs.inputs['Metallic'].default_value=0
    bs.inputs['Specular IOR Level'].default_value=.28
    tex=n.new('ShaderNodeTexImage');tex.image=loaded(base)
    l.new(tex.outputs['Color'],bs.inputs['Base Color'])
    if alpha:
        # Blender 5.2's installed glTF exporter recognizes a comparison node as
        # alpha MASK; a direct alpha link would silently export alpha BLEND.
        clip=n.new('ShaderNodeMath');clip.operation='GREATER_THAN';clip.inputs[1].default_value=.42
        l.new(tex.outputs['Alpha'],clip.inputs[0]);l.new(clip.outputs[0],bs.inputs['Alpha'])
        mat.surface_render_method='DITHERED'
        if hasattr(mat,'alpha_threshold'):mat.alpha_threshold=.42
    if normal:
        tex=n.new('ShaderNodeTexImage');tex.image=loaded(normal,False)
        nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=normal_strength
        l.new(tex.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],bs.inputs['Normal'])
    if rough:
        tex=n.new('ShaderNodeTexImage');tex.image=loaded(rough,False)
        if 'arm' in str(rough):
            separate=n.new('ShaderNodeSeparateColor');l.new(tex.outputs['Color'],separate.inputs[0]);l.new(separate.outputs['Green'],bs.inputs['Roughness'])
        else:l.new(tex.outputs['Color'],bs.inputs['Roughness'])
    return mat


bark=material('TDv004.Palm.ScannedBark',image_copy(bark_root/'palm_tree_bark_diff_1k.jpg','palm-bark-color.jpg'),image_copy(bark_root/'palm_tree_bark_nor_gl_1k.jpg','palm-bark-normal.jpg'),image_copy(bark_root/'palm_tree_bark_rough_1k.jpg','palm-bark-rough.jpg'))
palm_leaf=material('TDv004.Palm.AuthoredLeaf',procedural_leaf_atlas())
# Pack the licensed source mask into an RGBA runtime derivative, with no reference footage.
color=loaded(leaf_root/'textures/island_tree_02_leaves_diff_1k.jpg')
alpha=loaded(leaf_root/'alpha.png',False)
import numpy as np
cp=np.empty(len(color.pixels),dtype=np.float32);color.pixels.foreach_get(cp)
ap=np.empty(len(alpha.pixels),dtype=np.float32);alpha.pixels.foreach_get(ap)
cp[3::4]=ap[0::4]
rgba=np.clip(cp.reshape(color.size[1],color.size[0],4)[::-1]*255+.5,0,255).astype(np.uint8)
png(SRC/'textures/hedge-leaf-color-alpha.png',color.size[0],color.size[1],rgba.reshape(-1).tolist())
print('Photo leaf pixels:',float(cp.max()),float(cp[0::4].mean()),flush=True)
hedge_leaf=material('TDv004.Hedge.PhotoLeaves',SRC/'textures/hedge-leaf-color-alpha.png',image_copy(leaf_root/'textures/island_tree_02_leaves_nor_gl_1k.jpg','hedge-leaf-normal.jpg'),image_copy(leaf_root/'textures/island_tree_02_leaves_arm_1k.jpg','hedge-leaf-arm.jpg'),True)
hedge_bark=material('TDv004.Hedge.ScannedBranches',image_copy(leaf_root/'textures/island_tree_02_branches_diff_1k.jpg','hedge-branch-color.jpg'),image_copy(leaf_root/'textures/island_tree_02_branches_nor_gl_1k.jpg','hedge-branch-normal.jpg'),image_copy(leaf_root/'textures/island_tree_02_branches_arm_1k.jpg','hedge-branch-arm.jpg'))
# Reference 00:35 has pale, smoother royal-style trunks, distinct from rough fan
# palms. Retain the photographic mottling but attenuate its contrast.
royal_photo=loaded(bark_root/'palm_tree_bark_diff_1k.jpg')
rp=np.empty(len(royal_photo.pixels),dtype=np.float32);royal_photo.pixels.foreach_get(rp)
rp=rp.reshape(royal_photo.size[1],royal_photo.size[0],4)
rp[:,:,:3]=rp[:,:,:3]*.42+np.array([.69,.68,.61],dtype=np.float32)*.58
png(SRC/'textures/royal-bark-color.png',royal_photo.size[0],royal_photo.size[1],np.clip(rp[::-1]*255+.5,0,255).astype(np.uint8).reshape(-1).tolist())
royal_bark=material('TDv004.RoyalPalm.PaleScannedBark',SRC/'textures/royal-bark-color.png',SRC/'textures/palm-bark-normal.jpg',None,normal_strength=.18)
royal_bark.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.62


class Mesh:
    def __init__(self):self.v=[];self.f=[];self.uv=[]
    def face(self, points, uv=None):
        i=len(self.v);self.v.extend(points);self.f.append(tuple(range(i,i+len(points))))
        self.uv.append(uv or [(0,0),(1,0),(1,1),(0,1)][:len(points)])
    def tube(self, points, radii, sides=6, uv_scale=1, v_offset=0):
        pts=[Vector(x) for x in points]
        for k in range(len(pts)-1):
            direction=(pts[min(k+1,len(pts)-1)]-pts[max(0,k-1)]).normalized()
            cross=direction.cross(Vector((0,1,0)))
            if cross.length<.01:cross=direction.cross(Vector((1,0,0)))
            cross.normalize();other=direction.cross(cross).normalized()
            for j in range(sides):
                a=j*math.tau/sides;b=(j+1)*math.tau/sides
                p0=pts[k]+radii[k]*(math.cos(a)*cross+math.sin(a)*other)
                p1=pts[k]+radii[k]*(math.cos(b)*cross+math.sin(b)*other)
                p2=pts[k+1]+radii[k+1]*(math.cos(b)*cross+math.sin(b)*other)
                p3=pts[k+1]+radii[k+1]*(math.cos(a)*cross+math.sin(a)*other)
                self.face([p0,p1,p2,p3],[(j/sides,v_offset+k*uv_scale),((j+1)/sides,v_offset+k*uv_scale),((j+1)/sides,v_offset+(k+1)*uv_scale),(j/sides,v_offset+(k+1)*uv_scale)])
    def object(self,name,parent,mat,smooth=False):
        mesh=bpy.data.meshes.new(name+'.Mesh');mesh.from_pydata(self.v,[],self.f);mesh.update()
        layer=mesh.uv_layers.new(name='UVMap')
        for poly,uvs in zip(mesh.polygons,self.uv):
            for loop,uv in zip(poly.loop_indices,uvs):layer.data[loop].uv=uv
            poly.use_smooth=smooth
        if smooth and mat in (palm_leaf,hedge_leaf):
            # Weld identical authored corners before averaging leaf normals. UVs
            # remain per-loop; this softens broad faceting without rounding tips.
            import bmesh
            bm=bmesh.new();bm.from_mesh(mesh)
            bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=0.000001)
            bm.to_mesh(mesh);bm.free();mesh.update()
        obj=bpy.data.objects.new(name,mesh);scene.collection.objects.link(obj);obj.parent=parent;obj.data.materials.append(mat)
        return obj


def empty(name,parent=None):
    obj=bpy.data.objects.new(name,None);scene.collection.objects.link(obj);obj.parent=parent
    return obj


def foliage_uv(dry=False):
    lo,hi=(.03,.47) if dry else (.53,.97)
    return [(0,lo),(.5,lo),(.5,hi),(1,hi)]


def leaflet(mesh,base,tip,across,width,dry=False,fold=.14,compact=False):
    base,tip,across=Vector(base),Vector(tip),Vector(across).normalized()
    middle=base.lerp(tip,.46);ridge=middle+Vector((0,0,width*fold))
    # Folded tapered lanceolate leaf: four triangles, with real silhouette and ridge.
    left=middle-across*width;right=middle+across*width
    lo,hi=(.03,.47) if dry else (.53,.97)
    if compact:
        left.z-=width*fold;right.z-=width*fold
        mesh.face([base,left,tip],[(.5,lo),(0,lo+.19),(.5,hi)])
        mesh.face([base,tip,right],[(.5,lo),(.5,hi),(1,lo+.19)])
        return
    for points,uv in [([base,left,ridge],[(.5,lo),(0,lo+.19),(.5,lo+.19)]),([left,tip,ridge],[(0,lo+.19),(.5,hi),(.5,lo+.19)]),([base,ridge,right],[(.5,lo),(.5,lo+.19),(1,lo+.19)]),([ridge,tip,right],[(.5,lo+.19),(.5,hi),(1,lo+.19)])]:mesh.face(points,uv)


def trunk(mesh,height,royal,far):
    rings=12 if far else 30;sides=10 if far else 18
    pts=[];radii=[]
    for k in range(rings+1):
        t=k/rings;z=height*t
        radius=(.19 + .12*math.exp(-t*23)+.018*math.sin(t*4)) if royal else (.24+.045*(1-t))
        pts.append((.08*math.sin(t*2.5),.035*math.sin(t*4),z));radii.append(radius)
    mesh.tube(pts,radii,sides,uv_scale=height/rings/2.6)


def royal(far):
    root=empty('RoyalPalm.LOD'+str(int(far)))
    wood=Mesh();leaves=Mesh();trunk(wood,6.4,True,far)
    # Crownshaft is a tapered continuous green neck, not a bare stick into fronds.
    leaves.tube([(0,0,6.05),(0,0,6.55),(0,0,6.95)],[.22,.20,.13],8 if far else 14,.15,.54)
    rng=random.Random(416)
    count=20 if far else 28
    for i in range(count):
        angle=i*2.39996323+rng.uniform(-.13,.13)
        radial=Vector((math.cos(angle),math.sin(angle),0));right=Vector((-math.sin(angle),math.cos(angle),0))
        row=i%3;length=(3.8 if row==0 else 3.5 if row==1 else 2.95)*rng.uniform(.92,1.07)
        rise=(.45,1.65,2.35)[row];fall=(2.9,2.2,1.15)[row]
        origin=Vector((0,0,6.65 + row*.10))
        def path(t):return origin+radial*(length*t*.94)+Vector((0,0,rise*math.sin(t*math.pi*.75)-fall*t*t))
        segments=4 if far else 10
        pp=[path(k/segments) for k in range(segments+1)]
        # The petiole shares the leaf atlas; the broadest part stays at the crown.
        leaves.tube(pp,[.028*(1-k/segments)+.004 for k in range(segments+1)],4 if far else 5,.035,.54)
        pairs=16 if far else 44
        for j in range(pairs):
            t=.18+.78*(j+.2)/pairs;base=path(t)
            length_leaf=(.34+.76*math.sin(t*math.pi))*(1-.35*t)
            width=(.265 if far else .093)*(1-.35*t)
            for side in [-1,1]:
                sweep=.18+ .34*t
                tip=base+right*(side*length_leaf)+radial*sweep+Vector((0,0,-(.20+.37*t)*length_leaf))
                # Alternate rows tilt leaflets out of a single flat fern plane.
                tip.z+=.17*math.sin(j*1.7+i)
                if far:
                    across=(radial*.8+Vector((0,0,.2))).normalized()
                    leaves.face([base,base.lerp(tip,.45)-across*width,tip,base.lerp(tip,.45)+across*width],[(.5,.53),(0,.70),(.5,.97),(1,.70)])
                else:leaflet(leaves,base,tip,radial,width,compact=True)
    return root,[wood.object(root.name+'.Trunk',root,royal_bark,True),leaves.object(root.name+'.Crown',root,palm_leaf,True)]


def fan(far):
    root=empty('FanPalm.LOD'+str(int(far)))
    wood=Mesh();leaves=Mesh();trunk(wood,5.4,False,far)
    rng=random.Random(928)
    count=32
    for i in range(count):
        angle=i*2.39996323+rng.uniform(-.12,.12);row=i%4
        radial=Vector((math.cos(angle),math.sin(angle),0));right=Vector((-math.sin(angle),math.cos(angle),0))
        # Continuous distribution avoids artificial stacked crown tiers.
        latitude=1.28-1.95*(i+.5)/count
        rise=latitude+rng.uniform(-.10,.10)
        stalk=(radial*.9+Vector((0,0,rise))).normalized()
        # The fans turn out toward the viewer around the crown. Their plane is
        # not the plane of a horizontal petiole (which produced stacked plates).
        elevation=latitude*.9+.08+rng.uniform(-.16,.16)
        forward=(radial*.42+Vector((0,0,elevation))).normalized()
        normal=right.cross(forward).normalized()
        origin=Vector((0,0,5.70+rng.uniform(-.14,.14)));center=origin+stalk*(.47+rng.uniform(-.09,.09))
        dry=latitude<-.35
        leaves.tube([origin,origin.lerp(center,.5)+Vector((0,0,.10)),center],[.032,.026,.018],3 if far else 5,.08,.04 if dry else .54)
        blades=12 if far else 31
        radius=1.53+rng.uniform(-.13,.13)
        for j in range(blades):
            a=-1.38+2.76*j/blades;b=-1.38+2.76*(j+1)/blades
            mid=(a+b)/2
            def ray(theta,length):return center+(math.cos(theta)*forward+math.sin(theta)*right)*length
            inner0=ray(a,radius*.31);inner1=ray(b,radius*.31)
            fold=ray(mid,radius*.33)+normal*.048
            tip=ray(mid,radius*(1.08+.08*math.sin(j*2.31+i)))+Vector((0,0,-.40-.06*row))
            left=ray(a+.018,radius*.84)+Vector((0,0,-.12-.05*row))
            righttip=ray(b-.018,radius*.84)+Vector((0,0,-.12-.05*row))
            lo=.03 if dry else .53;hi=lo+.44;vm=lo+.19
            if far:
                leaves.face([center,left,tip,righttip],[(.5,lo),(0,hi),(.5,hi),(1,hi)])
            else:
                for points,uv in [([center,inner0,fold],[(.5,lo),(0,vm),(.5,vm)]),([center,fold,inner1],[(.5,lo),(.5,vm),(1,vm)]),([inner0,left,fold],[(0,vm),(0,hi),(.5,vm)]),([left,tip,fold],[(0,hi),(.5,hi),(.5,vm)]),([fold,tip,righttip],[(.5,vm),(.5,hi),(1,hi)]),([fold,righttip,inner1],[(.5,vm),(1,hi),(1,vm)])]:leaves.face(points,uv)
    # A hanging lower skirt is a defining difference from the sparse v003 crown.
    count=6 if far else 13
    for i in range(count):
        angle=i*2.39996323;r=Vector((math.cos(angle),math.sin(angle),0));side=Vector((-math.sin(angle),math.cos(angle),0))
        origin=Vector((0,0,5.45))+r*.20
        end=origin+r*.77+Vector((0,0,-1.55))
        leaves.tube([origin,origin+r*.7+Vector((0,0,-.3)),end],[.03,.021,.01],3,.08)
        blades=7 if far else 13
        for j in range(blades):
            spread=(j/(blades-1)-.5)
            base=origin+r*.65+side*spread*.28+Vector((0,0,-.30))
            tip=end+side*spread*1.1+r*(.20*math.cos(spread*3))+Vector((0,0,.15*math.sin(j*3)))
            if far:leaves.face([base,base.lerp(tip,.4)-side*.065,tip,base.lerp(tip,.4)+side*.065],[(.5,.03),(0,.2),(.5,.47),(1,.2)])
            else:leaflet(leaves,base,tip,side,.05,True)
    # Old leaf bases add broken, irregular texture to the upper fan-palm trunk.
    if not far:
        for i in range(44):
            z=3.6+i*.038;angle=i*2.39996323
            r=Vector((math.cos(angle),math.sin(angle),0));s=Vector((-math.sin(angle),math.cos(angle),0))
            p=r*.26+Vector((0,0,z));wood.face([p-s*.13,p+r*.085+Vector((0,0,.19)),p+s*.13,p+Vector((0,0,-.11))],[(.1,.1),(.2,.3),(.3,.1),(.2,0)])
    return root,[wood.object(root.name+'.Trunk',root,bark,True),leaves.object(root.name+'.Crown',root,palm_leaf,True)]


LEAF_UV=[(.01,.49,.16,1),(.16,.56,.35,1),(.36,.56,.51,1),(.51,.55,.66,1),(.66,.54,.81,1),(.01,.01,.19,.44),(.20,.01,.37,.44),(.39,.01,.57,.44)]


def hedge(far):
    root=empty('ClippedHedge.LOD'+str(int(far)))
    wood=Mesh();leaves=Mesh();rng=random.Random(1289)
    for i in range(7):
        x=-1.22+i*.40;y=rng.uniform(-.20,.20)
        stem=[(x,y,0),(x+.04,y+.04,.40),(x-.08,y-.04,.86),(x+.02,y+.03,1.23)]
        wood.tube(stem,[.037,.030,.018,.005],4 if far else 6,.22)
        for j in range(2 if far else 5):
            z=.29+j*.16;a=rng.random()*math.tau
            wood.tube([(x,y,z),(x+math.cos(a)*.28,y+math.sin(a)*.24,z+.18),(x+math.cos(a)*.43,y+math.sin(a)*.36,z+.24)],[.014,.009,.003],3 if far else 4,.16)
    count=400 if far else 910
    for i in range(count):
        # Evenly cover the softly clipped shell, then populate interior volume.
        face=i%6
        x=rng.uniform(-1.38,1.38);y=rng.uniform(-.43,.43);z=rng.uniform(.28 if far else .20,1.22)
        if face==0:y=-.43+rng.uniform(-.04,.06)
        elif face==1:y=.43+rng.uniform(-.06,.04)
        elif face==2:z=1.21+rng.uniform(-.05,.04)
        elif face==3:x=(-1 if i%2 else 1)*1.37+rng.uniform(-.03,.03)
        base=Vector((x,y,z));angle=rng.random()*math.tau
        length=rng.uniform(.24,.32)*(1.50 if far else 1)
        width=length*rng.uniform(.34,.46)
        direction=Vector((math.cos(angle)*.65,math.sin(angle)*.65,rng.uniform(-.40,.75))).normalized()
        across=direction.cross(Vector((math.cos(angle+.7),math.sin(angle+.7),.8))).normalized()*width
        tip=base+direction*length;mid=base.lerp(tip,.48)
        u0,v0,u1,v1=LEAF_UV[i%len(LEAF_UV)]
        if far:
            leaves.face([base-across,base+across,tip+across,tip-across],[(u0,v0),(u1,v0),(u1,v1),(u0,v1)])
        else:
            ridge=mid+Vector((0,0,.025))
            leaves.face([base-across,base+across,ridge],[(u0,v0),(u1,v0),((u0+u1)/2,(v0+v1)/2)])
            leaves.face([base+across,tip+across,ridge],[(u1,v0),(u1,v1),((u0+u1)/2,(v0+v1)/2)])
            leaves.face([tip+across,tip-across,ridge],[(u1,v1),(u0,v1),((u0+u1)/2,(v0+v1)/2)])
            leaves.face([tip-across,base-across,ridge],[(u0,v1),(u0,v0),((u0+u1)/2,(v0+v1)/2)])
    if far:leaves.v=[Vector((p[0],p[1],max(.03,p[2]))) for p in leaves.v]
    return root,[wood.object(root.name+'.Branches',root,hedge_bark,True),leaves.object(root.name+'.Leaves',root,hedge_leaf,True)]


assets=[]
for asset_id,prefix,builder in [('royal-palm','RoyalPalm',royal),('fan-palm','FanPalm',fan),('clipped-hedge','ClippedHedge',hedge)]:
    container=empty('TownDrive.Reference.'+prefix)
    levels=[]
    for far in [False,True]:
        parent,objects=builder(far);parent.parent=container
        for obj in objects:obj.hide_render=far
        levels.append({'root':parent,'objects':objects})
    assets.append({'id':asset_id,'root':container,'levels':levels})


def bounds(objects):
    pts=[obj.matrix_world@Vector(c) for obj in objects for c in obj.bound_box]
    return {'min':[min(p[i] for p in pts) for i in range(3)],'max':[max(p[i] for p in pts) for i in range(3)]}


def count(objects):
    total=0
    for obj in objects:obj.data.calc_loop_triangles();total+=len(obj.data.loop_triangles)
    return total


receipt={'status':'AUTHORING / EXPORT CANDIDATE; Unity runtime review is separate','blender':bpy.app.version_string,'revision':A.revision,'units':'metres; Blender Z up, GLB +Y up via standard exporter; ground pivot','reference':[{'video':'IMG_5754.MOV','seconds':[35,45],'observation':'Tall pale trunks with dense drooping pinnate crowns.'},{'video':'IMG_5754.MOV','seconds':[255,270,360],'observation':'Dense rounded fan crowns, narrow gray-brown trunk and retained brown lower fronds.'},{'video':'IMG_5754.MOV','seconds':[135,150,165,180],'observation':'Continuous clipped broadleaf hedge masses beside the arterial.'}],'sources':sources,'rights':[{'asset':'Palm Tree Bark','page':'https://polyhaven.com/a/palm_tree_bark','authors':{'Dimitrios Savva':'Photography','Rico Cilliers':'Processing'},'license':'CC0-1.0','licensePage':'https://polyhaven.com/license'},{'asset':'Island Tree 02 leaf atlas','page':'https://polyhaven.com/a/island_tree_02','authors':{'Rob Tuytel':'Scanning, processing','Rico Cilliers':'Cleanup, processing'},'license':'CC0-1.0','licensePage':'https://polyhaven.com/license'}],'modifications':'Original Blender trunk/crown/branch/leaf geometry; reference-led silhouette and trimmed hedge envelope. Existing CC0 scanned bark and broadleaf maps are reused with alpha packed into the leaf texture. Palm leaflet color/vein pattern is original procedural texture, not a photographic scan. No footage/frame/reference board embedded. No animation or armature. Powered by Poly Haven.','assets':[]}


for asset in assets:
    bpy.ops.object.select_all(action='DESELECT')
    objs=[asset['root']]+[lv['root'] for lv in asset['levels']]+[o for lv in asset['levels'] for o in lv['objects']]
    for obj in objs:obj.select_set(True)
    bpy.context.view_layer.objects.active=asset['root']
    bpy.context.view_layer.update()
    target=OUT/(asset['id']+'-v004.glb')
    bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_tangents=True,export_animations=False,export_extras=False)
    receipt['assets'].append({'id':asset['id'],'path':str(target.relative_to(A.repo)).replace('\\','/'),'sha256':sha(target),'bytes':target.stat().st_size,'nodes':[o.name for o in objs],'levels':[{'name':lv['root'].name,'triangles':count(lv['objects']),'meshCount':len(lv['objects']),'boundsBlenderZUp':bounds(lv['objects'])} for lv in asset['levels']]})

# Review studio is only in the recoverable .blend; excluded from selected export.
for index,asset in enumerate(assets):asset['root'].location.x=(-5,4,0)[index]
assets[2]['root'].location.y=-2.0
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.025));ground=bpy.context.object;ground.name='REVIEW_ONLY.Ground'
mat=bpy.data.materials.new('REVIEW_ONLY.Ground');mat.diffuse_color=(.27,.31,.25,1);mat.use_nodes=True;mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.27,.31,.25,1);mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.95;ground.data.materials.append(mat)
bpy.ops.object.light_add(type='AREA',location=(-5,-5,13));key=bpy.context.object;key.name='REVIEW_ONLY.Key';key.data.energy=2300;key.data.shape='DISK';key.data.size=9
key.rotation_euler=(Vector((0,0,4))-key.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='SUN',location=(4,-5,10));sun=bpy.context.object;sun.name='REVIEW_ONLY.Sun';sun.data.energy=2.0;sun.data.angle=.22;sun.rotation_euler=(.5,-.45,-.6)
bpy.ops.object.camera_add(location=(14,-24,10));camera=bpy.context.object;camera.name='REVIEW_ONLY.Camera';scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=19
def view(location,look,scale,target):
    camera.location=location;camera.rotation_euler=(Vector(look)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=scale
    scene.render.filepath=str(SRC/'review'/target);bpy.ops.render.render(write_still=True)
source=SRC/('town-drive-reference-v004-'+A.revision+'.blend')
camera.rotation_euler=(Vector((0,0,4.4))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=18
for image in bpy.data.images:
    if image.source=='FILE':image.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(source))
if A.lod_review_only:
    for asset in assets:
        for level,lv in enumerate(asset['levels']):
            for obj in lv['objects']:obj.hide_render=level==0
    view((14,-24,10),(0,0,4.4),18,'three-assets-far.png')
else:
    view((14,-24,10),(0,0,4.4),18,'three-assets.png')
    view((10,-13,7),(4,0,5.25),8.1,'fan-palm-crown.png')
    view((-12,-15,7),(-5,0,6.1),9.1,'royal-palm-crown.png')
    view((4,-6,3.0),(0,-2,.66),3.8,'hedge-detail.png')
receipt['source']={'path':str(source.relative_to(A.repo)).replace('\\','/'),'sha256':sha(source),'bytes':source.stat().st_size}
receipt['renders']=[str(p.relative_to(A.repo)).replace('\\','/') for p in sorted((SRC/'review').glob('*.png'))]
(OUT/'authoring-receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
(SRC/'authoring-receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
print('TOWN_REFERENCE_EXPORT '+json.dumps(receipt['assets']))
