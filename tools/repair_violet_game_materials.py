"""Repair inspected horn seating and reserve the atlas for continuous skin."""
import bpy,math,json
from mathutils import Vector,Matrix
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree
from pathlib import Path

def main():
    obj=bpy.data.objects['VioletGameBody'];mesh=bpy.data.meshes['Violet body material repair']
    if len(mesh.materials)!=10 or any('Baked' in m.name or 'game constant' in m.name for m in mesh.materials):
      raise RuntimeError('Load a separate original procedural recovery mesh first; preserve the completed candidate.')
    obj.data=mesh
    # Recover original material identities from the preserved pre-triangulation
    # candidate. Small separate scales/keratin/teeth use explicit PBR constants;
    # their thousands of tiny UV islands must not bleed into continuous skin.
    adj=[[] for _ in mesh.vertices]
    for e in mesh.edges:
      a,b=e.vertices;adj[a].append(b);adj[b].append(a)
    component=[-1]*len(adj);groups=[]
    for i in range(len(adj)):
      if component[i]>=0:continue
      cid=len(groups);stack=[i];component[i]=cid;group=[]
      while stack:
        v=stack.pop();group.append(v)
        for n in adj[v]:
          if component[n]<0:component[n]=cid;stack.append(n)
      groups.append(group)
    original=list(mesh.materials);constants={}
    for i,mat in enumerate(original):
      cp=mat.copy();cp.name=mat.name+' game constant';bs=next(n for n in cp.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
      base=bs.inputs['Base Color'].default_value[:]
      link=next(iter(bs.inputs['Base Color'].links),None)
      if link and link.from_node.type=='VALTORGB':base=link.from_node.color_ramp.evaluate(.5)[:]
      for socket in bs.inputs:
        for link in list(socket.links):cp.node_tree.links.remove(link)
      bs.inputs['Base Color'].default_value=base;bs.inputs['Metallic'].default_value=0
      bs.inputs['Subsurface Weight'].default_value=0;bs.inputs['Transmission Weight'].default_value=0
      bs.inputs['Roughness'].default_value=.52 if 'keratin' not in mat.name else .38
      if 'iris' in mat.name.lower():bs.inputs['Emission Color'].default_value=(.4,.025,1,1);bs.inputs['Emission Strength'].default_value=1.4
      constants[i]=len(mesh.materials);mesh.materials.append(cp)
    for v in mesh.vertices:v.select=False
    for e in mesh.edges:e.select=False
    bpy.context.scene.tool_settings.mesh_select_mode=(False,False,True)
    skin=[]
    for p in mesh.polygons:
      eligible=len(groups[component[p.vertices[0]]])>=300 and not any(w in original[p.material_index].name.lower() for w in ['mouth','iris','eye','teeth','keratin','pupil'])
      p.select=eligible
      if eligible:skin.append(p.index)
      else:p.material_index=constants[p.material_index]
    # Seat the roots against the revised continuous skull; preserve tip silhouette.
    source=bpy.data.collections['Violet Dragon v007 - refined source'];rig=bpy.data.objects['VioletDragonRig.v007'];flight=bpy.data.objects['VioletFlightRig']
    skull=next(o for o in source.objects if 'Continuous orbital skull' in o.name)
    bvh=BVHTree.FromPolygons([v.co for v in skull.data.vertices],[p.vertices for p in skull.data.polygons])
    kd=KDTree(len(mesh.vertices))
    for v in mesh.vertices:kd.insert(v.co,v.index)
    kd.balance();repairs=[]
    transform=flight.data.bones['Head'].matrix_local@Matrix.Scale(.82,4)@rig.data.bones['Head'].matrix_local.inverted()
    for horn in source.objects:
      if horn.type!='MESH' or horn.hide_render or len(horn.vertex_groups)!=1 or horn.vertex_groups[0].name!='Head' or len(horn.data.vertices)!=206:continue
      # Generated tube uses 12 vertices per first ring; its cap lies there.
      root=sum((v.co for v in horn.data.vertices[:12]),Vector())/12
      hit,normal,_,distance=bvh.find_nearest(root)
      if hit is None:continue
      delta=hit-normal*.14-root
      if delta.length>.85:continue
      matched=0
      for v in horn.data.vertices:
        # Root rows blend over the first 40% of the tube; cap-centre vertex last.
        t=0 if v.index==len(horn.data.vertices)-2 else min(1,v.index/12/6)
        amount=(1-t)**2
        if amount<=0:continue
        before=v.co.copy();_,index,d=kd.find(transform@before)
        if d<.0002:
          mesh.vertices[index].co+=transform.to_3x3()@(delta*amount);matched+=1
        v.co+=delta*amount
      repairs.append({'object':horn.name,'matchedGameVertices':matched,'delta':list(delta)})
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.uv.smart_project(angle_limit=math.radians(68),island_margin=.003,area_weight=.5);bpy.ops.object.mode_set(mode='OBJECT')
    for s in obj.material_slots:s.link='DATA'
    mesh.update();bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
    receipt={'continuousSkinFaces':len(skin),'separateComponents':len(groups),'hornRepairs':repairs,'reason':'Observed atlas color bleed and exposed horn root caps; preserve original failed candidate and rebake skin only.'}
    Path(r'C:\Projects\space_dragon\artifacts\blender\violet-dragon-v007\material-repair.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt))
if __name__=='__main__':main()
