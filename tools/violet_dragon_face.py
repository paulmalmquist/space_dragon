"""Bounded SD080 organic head pass for a separately saved source candidate.

Only the active Blender owner may call ``apply_face_upgrade(collection, rig,
materials, prefix='VD7')``. Importing this module does not inspect or mutate the
scene. No files, poses, bone/rest transforms, unrelated collections or supplied
materials are modified. All geometry is in the original v006 rig coordinates:
X lateral, +Y forward, +Z up. The owner must inspect the resulting source and
jaw deformation before export; this helper does not establish game readiness.
"""

import math

import bpy
from mathutils import Vector

from violet_dragon_geometry import _mesh_object, bezier_tube, loft


OWNER = 'SD080_organic_face_v007'
# y, centre z, half width, upper height, lower height. Zero-radius endpoints
# are shared vertices, avoiding an exposed flat cylinder cap at either muzzle.
_SKULL = (
    (.70, 3.62, 0, 0, 0), (.84, 3.66, .24, .24, .22),
    (1.08, 3.74, .40, .34, .30), (1.37, 3.77, .46, .35, .32),
    (1.65, 3.75, .45, .31, .30), (1.91, 3.67, .37, .28, .24),
    (2.20, 3.60, .29, .24, .16), (2.47, 3.57, .255, .20, .12),
    (2.68, 3.57, .225, .17, .10), (2.82, 3.57, .17, .13, .09),
    (2.92, 3.58, .075, .07, .055), (2.955, 3.58, 0, 0, 0),
)
_JAW = (
    (1.10, 3.40, 0, 0, 0), (1.26, 3.35, .28, .13, .18),
    (1.50, 3.27, .345, .115, .145), (1.85, 3.235, .315, .10, .115),
    (2.20, 3.25, .25, .09, .10), (2.55, 3.29, .20, .075, .08),
    (2.78, 3.325, .14, .06, .065), (2.90, 3.335, .065, .038, .04),
    (2.94, 3.34, 0, 0, 0),
)


def _profile(keys, y):
    """Shape-preserving cubic Hermite interpolation, clamped per interval."""
    y = min(keys[-1][0], max(keys[0][0], y))
    i = next((i for i in range(len(keys)-1) if y <= keys[i+1][0]), len(keys)-2)
    a, b = keys[i], keys[i+1]
    t = (y-a[0])/(b[0]-a[0]); span = b[0]-a[0]
    values = []
    for axis in range(1, 5):
        before, after = keys[max(0, i-1)], keys[min(len(keys)-1, i+2)]
        m0 = (b[axis]-before[axis])/(b[0]-before[0])
        m1 = (after[axis]-a[axis])/(after[0]-a[0])
        value = ((2*t**3-3*t*t+1)*a[axis] + (t**3-2*t*t+t)*span*m0
                 + (-2*t**3+3*t*t)*b[axis] + (t**3-t*t)*span*m1)
        values.append(min(max(a[axis], b[axis]), max(min(a[axis], b[axis]), value)))
    return values


def _gauss(value, centre, width):
    return math.exp(-.5*((value-centre)/width)**2)


def _point(keys, y, angle, skull=False):
    zc, width, top, bottom = _profile(keys, y)
    cosine, sine = math.cos(angle), math.sin(angle)
    # Fold the angle onto the positive-X half to make mirrored anatomy.
    side_angle = math.atan2(sine, abs(cosine))
    radial = 0.0
    if skull and width > 0:
        # The socket is sculpted into the same continuous skin as the brow.
        radial -= .068*_gauss(y, 1.56, .19)*_gauss(side_angle, .37, .23)
        radial += .082*_gauss(y, 1.48, .29)*_gauss(side_angle, .76, .22)
        radial += .030*_gauss(y, 1.48, .30)*_gauss(side_angle, -.14, .25)
        # A quiet keel strengthens the sloping nasal bridge; small recesses
        # replace the old separate black cylinders used as nostrils.
        radial += .038*_gauss(y, 2.23, .38)*_gauss(side_angle, math.pi/2, .30)
        radial -= .027*_gauss(y, 2.62, .070)*_gauss(side_angle, .46, .16)
    return (cosine*(width+radial), y,
            zc+sine*((top if sine >= 0 else bottom)+radial))


def _surface(y, angle):
    point = Vector(_point(_SKULL, y, angle, True))
    forward = Vector(_point(_SKULL, y+.001, angle, True))-Vector(_point(_SKULL, y-.001, angle, True))
    around = Vector(_point(_SKULL, y, angle+.001, True))-Vector(_point(_SKULL, y, angle-.001, True))
    return point, forward.cross(around).normalized()


def _surface_mesh(name, keys, material, collection, skull=False, rings=80, sides=64):
    vertices = [_point(keys, keys[0][0], 0, skull)]
    sections = [[0]]; faces = []; uv_faces = []
    for row in range(1, rings):
        y = keys[0][0]+(keys[-1][0]-keys[0][0])*row/rings
        section = []
        for col in range(sides):
            section.append(len(vertices)); vertices.append(_point(keys, y, col*math.tau/sides, skull))
        sections.append(section)
    sections.append([len(vertices)]); vertices.append(_point(keys, keys[-1][0], 0, skull))
    for row in range(rings):
        a, b = sections[row], sections[row+1]
        v0, v1 = row/rings, (row+1)/rings
        for col in range(sides):
            j = (col+1)%sides; u0, u1 = col/sides, (col+1)/sides
            if len(a) == 1:
                faces.append((a[0], b[col], b[j])); uv_faces.append((((u0+u1)/2,v0),(u0,v1),(u1,v1)))
            elif len(b) == 1:
                faces.append((a[col], b[0], a[j])); uv_faces.append(((u0,v0),((u0+u1)/2,v1),(u1,v0)))
            else:
                faces.extend(((a[col], b[col], a[j]), (a[j], b[col], b[j])))
                uv_faces.extend((((u0,v0),(u0,v1),(u1,v0)), ((u1,v0),(u0,v1),(u1,v1))))
    return _mesh_object(name, vertices, faces, material, collection, uv_faces)


def _ellipsoid(name, center, radii, material, collection, axes=None, segments=32, rings=16):
    center = Vector(center)
    axes = tuple(Vector(a) for a in (axes or ((1,0,0),(0,1,0),(0,0,1))))
    # Elliptical loft around the third axis. Reuse the topological point caps
    # without operators or coincident pole vertices.
    vertices = [tuple(center-axes[2]*radii[2])]; sections = [[0]]
    faces, uvs = [], []
    for row in range(1, rings):
        latitude = -math.pi/2+row*math.pi/rings
        section = []
        for col in range(segments):
            angle = col*math.tau/segments
            point = center + axes[0]*(radii[0]*math.cos(latitude)*math.cos(angle))
            point += axes[1]*(radii[1]*math.cos(latitude)*math.sin(angle))
            point += axes[2]*(radii[2]*math.sin(latitude))
            section.append(len(vertices)); vertices.append(tuple(point))
        sections.append(section)
    sections.append([len(vertices)]); vertices.append(tuple(center+axes[2]*radii[2]))
    for row in range(rings):
        a,b=sections[row],sections[row+1]
        for col in range(segments):
            j=(col+1)%segments;u0,u1=col/segments,(col+1)/segments;v0,v1=row/rings,(row+1)/rings
            if len(a)==1:
                faces.append((a[0],b[j],b[col]));uvs.append((((u0+u1)/2,v0),(u1,v1),(u0,v1)))
            elif len(b)==1:
                faces.append((a[col],a[j],b[0]));uvs.append(((u0,v0),(u1,v0),((u0+u1)/2,v1)))
            else:
                faces.extend(((a[col],a[j],b[col]),(a[j],b[j],b[col])))
                uvs.extend((((u0,v0),(u1,v0),(u0,v1)),((u1,v0),(u1,v1),(u0,v1))))
    return _mesh_object(name,vertices,faces,material,collection,uvs)


def _simple_material(name, color, roughness, coat=0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    shader = material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color,1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = 0
    if shader.inputs.get('Coat Weight'): shader.inputs['Coat Weight'].default_value=coat
    material.diffuse_color=(*color,1);material['generatedBy']=OWNER
    return material


def apply_face_upgrade(collection, rig, materials, prefix='VD7'):
    """Create a review candidate, hide only replaced clone parts, return receipt.

    ``materials`` uses create_materials() keys (scale_mid, scale_dark, mouth,
    teeth, eye). Call once on a fresh collection, before posing. Hidden meshes
    stay recoverable in that collection, including their original weights.
    No crown horns are removed; their seating remains a separate visual check.
    """
    required={'scale_mid','scale_dark','mouth','teeth','eye'}
    if not required.issubset(materials): raise ValueError('Missing material roles: '+str(required-set(materials)))
    if rig.type!='ARMATURE' or not {'Head','Jaw'}.issubset(rig.data.bones.keys()):
        raise ValueError('Expected the original Head/Jaw source bones')
    if any(o.get('generatedBy')==OWNER for o in collection.objects):
        raise RuntimeError('Face pass already exists; preserve it and use a new source revision')
    if any(abs(v)>.00001 for b in rig.pose.bones for v in b.rotation_euler):
        raise ValueError('Apply the face pass before posing the source rig')
    exact={'Predatory skull','Lower jaw','Mouth cavity','Tongue','Small facial scales','Mandible scales'}
    starts=('Recessed eye socket ','Violet slit eye ','Armored brow ','Nostril ',
            'Upper tooth ','Lower tooth ','Nasal ridge ','Cheek crest root ')
    replaced=[]
    for obj in collection.objects:
        if obj.type!='MESH':continue
        label=obj.name.split(' ',1)[1] if obj.name.startswith(('VD6 ','VD7 ')) else ''
        # Blender may append .001 to a duplicated object name.
        if label.rsplit('.',1)[-1].isdigit():label=label.rsplit('.',1)[0]
        if label in exact or label.startswith(starts):replaced.append(obj)
    if not any('Predatory skull' in o.name for o in replaced):
        raise ValueError('No owned VD6/VD7 skull found inside the supplied clone collection')
    created=[]
    def keep(obj,bone='Head'):
        obj.parent=rig
        group=obj.vertex_groups.new(name=bone);group.add(list(range(len(obj.data.vertices))),1,'REPLACE')
        modifier=obj.modifiers.new('Violet source rig','ARMATURE');modifier.object=rig
        obj['generatedBy']=OWNER;obj['sourceBone']=bone;created.append(obj);return obj
    def sphere(label,center,radii,mat,bone='Head',axes=None):
        return keep(_ellipsoid(prefix+' '+label,center,radii,mat,collection,axes),bone)
    def tube(label,points,radii,mat,bone='Head',sides=12):
        return keep(loft(prefix+' '+label,points,radii,mat,collection,sides=sides),bone)
    # Complete new geometry first. A failed call does not hide the existing head.
    skull=keep(_surface_mesh(prefix+' Continuous orbital skull',_SKULL,materials['scale_mid'],collection,True))
    jaw=keep(_surface_mesh(prefix+' Continuous tapered mandible',_JAW,materials['scale_mid'],collection,False,64,48),'Jaw')
    dark=_simple_material(prefix+' Recessed pupil and nostril',(.008,.003,.014),.28,.15)
    sclera=_simple_material(prefix+' Dark violet eyeball',(.026,.008,.045),.20,.28)
    # A real palate and low tongue leave the jaw opening dark and deep; the
    # old cavity tube filled the entire opening like a horizontal cork.
    sphere('Deep mouth throat',(0,1.47,3.39),(.255,.19,.185),materials['mouth'])
    sphere('Upper palate',(0,2.12,3.445),(.242,.63,.035),materials['mouth'])
    sphere('Tongue bed',(0,2.10,3.33),(.19,.55,.027),materials['mouth'],'Jaw')
    for sign in (-1,1):
        angle=.37 if sign>0 else math.pi-.37
        center,normal=_surface(1.56,angle)
        tangent=Vector((0,1,0));tangent=(tangent-normal*tangent.dot(normal)).normalized()
        vertical=normal.cross(tangent).normalized()
        if vertical.z<0:vertical=-vertical;tangent=-tangent
        # Right-handed local axes are critical to outward ellipsoid normals.
        axes=(tangent,vertical,normal)
        eye_center=center+normal*.013
        sphere('Recessed rounded eye '+str(sign),eye_center,(.099,.061,.040),sclera,axes=axes)
        sphere('Small violet iris '+str(sign),eye_center+normal*.035,(.043,.041,.013),materials['eye'],axes=axes)
        sphere('Vertical pupil '+str(sign),eye_center+normal*.047,(.009,.028,.004),dark,axes=axes)
        for upper in (True,False):
            points=[];radii=[]
            for i in range(17):
                t=math.pi*i/16
                # Flush tapered lids: larger upper ridge, quiet lower edge.
                p=eye_center+tangent*(.104*math.cos(t))+vertical*((1 if upper else -1)*.066*math.sin(t))
                p+=normal*(.003+.010*math.sin(t))
                points.append(p);radii.append(.006+(.014 if upper else .009)*math.sin(t))
            tube(('Upper' if upper else 'Lower')+' fitted eyelid '+str(sign),points,radii,materials['scale_dark'],sides=10)
        # Nostril is a small inset oval framed by the continuous nasal skin.
        nasal_angle=.46 if sign>0 else math.pi-.46
        point,n=_surface(2.62,nasal_angle)
        along=Vector((0,1,0));along=(along-n*along.dot(n)).normalized();up=n.cross(along).normalized()
        sphere('Inset nasal pocket '+str(sign),point+n*.002,(.045,.018,.007),dark,axes=(along,up,n))
        # Inlaid gum margins follow actual skin; they do not float above it.
        upper_gum=[];lower_gum=[]
        for i in range(21):
            y=1.67+i*(1.08/20)
            z,w,_,bottom=_profile(_SKULL,y);jz,jw,jtop,_=_profile(_JAW,y)
            upper_gum.append((sign*w*.79,y,z-bottom*.60))
            lower_gum.append((sign*jw*.78,y,jz+jtop*.64))
        tube('Upper recessed gum '+str(sign),upper_gum,[.017]*21,materials['mouth'])
        tube('Lower recessed gum '+str(sign),lower_gum,[.014]*21,materials['mouth'],'Jaw')
        # Fewer teeth, nonuniform spacing/length and staggered lower positions.
        for upper,ys in ((True,(1.75,1.90,2.08,2.25,2.41,2.56,2.69)),
                         (False,(1.81,2.00,2.18,2.35,2.50,2.64))):
            for i,y in enumerate(ys):
                z,w,top,bottom=_profile(_SKULL if upper else _JAW,y)
                x=sign*w*(.79 if upper else .78)
                z+=-bottom*.60 if upper else top*.64
                length=(.105,.077,.089,.070,.064,.053,.041)[i]*(1 if upper else .70)
                direction=-1 if upper else 1
                controls=[(x,y,z+.012*(-direction)),(x*.99,y-.007,z+direction*length*.35),
                          (x*.94,y-.025,z+direction*length*.85),(x*.90,y-.042,z+direction*length)]
                tooth=bezier_tube(prefix+' Recessed '+('upper' if upper else 'lower')+' tooth %s %02d'%(sign,i),
                                  controls,.019 if upper else .014,0,materials['teeth'],collection,samples=10,sides=10)
                keep(tooth,'Head' if upper else 'Jaw')
    for obj in replaced:obj.hide_set(True);obj.hide_render=True;obj['replacedByFacePass']=OWNER
    receipt={'created':[o.name for o in created],'hiddenPreserved':[o.name for o in replaced],
             'trianglesBeforeModifiers':sum(len(p.vertices)-2 for o in created for p in o.data.polygons),
             'boneCountUnchanged':len(rig.data.bones),'sourceSpace':'X lateral, +Y forward, +Z up; original v006 Head/Jaw rest transforms',
             'scope':'Source face geometry only. Owner must inspect neutral views, jaw opening, weights and export before game promotion.'}
    return receipt


def refine_predatory_expression(collection, rig, materials, prefix='VD7'):
    """One observed-expression correction on the helper's existing candidate.

    Reduces the friendly dome/round eye found in face-neutral.png. Creates a
    broad, surface-rooted skin hood rather than another cylindrical brow horn.
    Only this module's meshes in the supplied clone collection are changed.
    """
    from mathutils.bvhtree import BVHTree
    owned={o.name:o for o in collection.objects if o.get('generatedBy')==OWNER}
    def find(label):
        matches=[o for name,o in owned.items() if name==prefix+' '+label or name.startswith(prefix+' '+label+'.')]
        if len(matches)!=1:raise ValueError('Expected one owned face part: '+label)
        return matches[0]
    skull=find('Continuous orbital skull');jaw=find('Continuous tapered mandible')
    if skull.get('predatoryExpressionRefined'):raise RuntimeError('Preserve this expression; do not compound the correction')
    for v in skull.data.vertices:
        x,y,z=v.co
        # Flatten only the high forehead; the orbital surface remains available
        # to seat the skin hood and the existing rig/eye coordinates do not move.
        high=max(0,min(1,(z-3.88)/.20))
        v.co.z-=.115*_gauss(y,1.38,.36)*high
        # Strong cheek plane and quieter upper-side bulge.
        v.co.x*=1-.045*_gauss(y,1.45,.34)*max(0,min(1,(z-3.86)/.15))
        v.co.x+=math.copysign(.022*_gauss(y,1.73,.23)*_gauss(z,3.67,.10),x) if x else 0
        # Narrower central bridge and a defined upward nasal/beak edge, without
        # turning its closed pole back into a flat exposed cap.
        if y>2.16:
            crest=_gauss(x,0,.11)*max(0,min(1,(z-3.59)/.13))
            v.co.z+=.035*_gauss(y,2.54,.30)*crest
        if y>2.76:
            beak=max(0,min(1,(y-2.76)/.18))
            v.co.y+=.045*beak*max(0,min(1,(z-3.55)/.10))
            v.co.z+=.018*beak
    skull.data.update()
    # The white strip was lit external skin on the top of the closed mandible,
    # not missing teeth. Assign its inward-facing region to actual mouth tissue.
    changed={}
    for obj,keys,upper in ((jaw,_JAW,True),(skull,_SKULL,False)):
        obj.data.materials.append(materials['mouth']);slot=len(obj.data.materials)-1;count=0
        for p in obj.data.polygons:
            c=sum((obj.data.vertices[i].co for i in p.vertices),Vector())/len(p.vertices)
            z,w,_,_=_profile(keys,c.y)
            if c.y>1.52 and abs(c.x)<w*.91 and ((c.z>z+.012) if upper else (c.z<z-.035)):
                p.material_index=slot;count+=1
        changed[obj.name]=count
    tree=BVHTree.FromPolygons([v.co for v in skull.data.vertices],[p.vertices[:] for p in skull.data.polygons])
    hoods=[]
    for sign in (-1,1):
        eye=find('Recessed rounded eye '+str(sign))
        center=sum((v.co for v in eye.data.vertices),Vector())/len(eye.data.vertices)
        for label in ('Recessed rounded eye ','Small violet iris ','Vertical pupil ',
                      'Upper fitted eyelid ','Lower fitted eyelid '):
            obj=find(label+str(sign))
            iris=label in ('Small violet iris ','Vertical pupil ')
            for v in obj.data.vertices:
                delta=v.co-center
                delta.y*=.88*(.67 if iris else 1)
                delta.z*=.58*(.80 if iris else 1)
                v.co=center+delta;v.co.x-=sign*.005
            obj.data.update()
        find('Upper fitted eyelid '+str(sign)).hide_set(True)
        find('Upper fitted eyelid '+str(sign)).hide_render=True
        # Y runs along the slanted lid; V runs up into the forehead. Root rays
        # use the actual modified skull, so the upper/side borders sink into it.
        vertices=[];faces=[];uvs=[];rows=18;cols=8
        for backing in (False,True):
            for row in range(rows+1):
                u=row/rows;y=1.56+(u-.5)*.48
                lower=center.z+.009-.17*(y-1.56)
                top_hit=tree.ray_cast(Vector((0,y,6)),Vector((0,0,-1)),6)
                if top_hit[0] is None:raise RuntimeError('Orbital hood found no forehead')
                upper=min(lower+.16,top_hit[0].z-.025)
                if upper<=lower:raise RuntimeError('Orbital hood has no forehead clearance')
                for col in range(cols+1):
                    v=col/cols;z=lower+v*(upper-lower)
                    hit=tree.ray_cast(Vector((sign*3,y,z)),Vector((-sign,0,0)),6)
                    if hit[0] is None:raise RuntimeError('Orbital hood missed skull surface')
                    x=hit[0].x
                    bulge=.075*(math.sin(math.pi*u)**.7)*((1-v)**1.5)-.006
                    vertices.append((x+sign*(bulge-(.012 if backing else 0)),y,z))
        stride=cols+1;sheet=(rows+1)*stride
        for row in range(rows):
            for col in range(cols):
                k=row*stride+col;face=(k,k+stride,k+stride+1,k+1)
                faces.append(face if sign>0 else tuple(reversed(face)))
                reverse=tuple(i+sheet for i in reversed(face))
                faces.append(reverse if sign>0 else tuple(reversed(reverse)))
        border=list(range(stride))+[r*stride+cols for r in range(1,rows+1)]
        border += [rows*stride+c for c in range(cols-1,-1,-1)]
        border += [r*stride for r in range(rows-1,0,-1)]
        for a,b in zip(border,border[1:]+border[:1]):
            face=(a,b,b+sheet,a+sheet);faces.append(face if sign>0 else tuple(reversed(face)))
        for face in faces:
            uvs.append([((vertices[i][1]-1.32)/.48,(vertices[i][2]-center.z+.06)/.25) for i in face])
        hood=_mesh_object(prefix+' Slanted orbital skin hood '+str(sign),vertices,faces,materials['scale_dark'],collection,uvs)
        hood.parent=rig;g=hood.vertex_groups.new(name='Head');g.add(list(range(len(vertices))),1,'REPLACE')
        mod=hood.modifiers.new('Violet source rig','ARMATURE');mod.object=rig
        hood['generatedBy']=OWNER;hood['sourceBone']='Head';hoods.append(hood.name)
    skull['predatoryExpressionRefined']=True
    return {'expressionHoods':hoods,'interiorMaterialFaces':changed,
            'scope':'Observed source expression correction; actual neutral/jaw views still required. No bones or poses changed.'}
