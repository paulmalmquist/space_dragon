"""Small Blender geometry helpers for the living-dragon source candidate.

Importing this module does not read or modify a Blender scene. Every creation
function requires the caller's destination collection and returns a new object;
it never deletes, renames, reparents, rigs, or edits an existing object/material.
Coordinates are Blender metres: X lateral, +Y forward, +Z up.

Primary API:
    loft(name, centers, radii, material, collection, sides=12, ...)
    bezier_tube(name, control_points, radius_start, radius_end,
                material, collection, samples=12, sides=8, ...)
    leaf_scale(name, center, tangent, normal, width, length, rise, thickness,
               material, collection)
    batch_scales(name, placements, material, collection)
    curved_scale_rows(name, centers, radii, material, collection, ...)

Loft radii accept a scalar or (lateral width radius, section-height radius).
Supply one radius pair per centre, or one scalar for the entire path. A zero
radius at either end makes a single tip vertex instead of a degenerate ring.
Scale tips point along `tangent`, and their domed face points along `normal`.
Each default six-sided leaf is a closed 19-polygon / 34-triangle mesh with a
real bevel contour and a pointed tip; no subdivision/bevel modifier is added.
"""

import math

import bpy
from mathutils import Matrix, Quaternion, Vector


_EPS = 1e-8


def _vector(value):
    vector = Vector(value)
    if len(vector) != 3 or not all(math.isfinite(component) for component in vector):
        raise ValueError("Expected a finite three-dimensional vector")
    return vector


def _radius(value):
    if isinstance(value, (int, float)):
        result = (float(value), float(value))
    else:
        if len(value) != 2:
            raise ValueError("Each radius must be a scalar or a width/height pair")
        result = (float(value[0]), float(value[1]))
    if not all(math.isfinite(component) and component >= 0 for component in result):
        raise ValueError("Radii must be finite and nonnegative")
    if (result[0] <= _EPS) != (result[1] <= _EPS):
        raise ValueError("A point tip must have both radii zero; flat zero-width rings are invalid")
    return result


def _radii(values, count):
    if isinstance(values, (int, float)):
        return [_radius(values)] * count
    values = list(values)
    if len(values) != count:
        raise ValueError("Supply one radius scalar/pair for each centre")
    result = [_radius(value) for value in values]
    if any(radius[0] <= _EPS for radius in result[1:-1]):
        raise ValueError("Only the first or last loft centre may be a point tip")
    return result


def _path_frames(centers, up=(0, 0, 1)):
    """Parallel-transport width/height frames; avoids arbitrary twist per ring."""
    points = [_vector(point) for point in centers]
    if len(points) < 2:
        raise ValueError("A loft path needs at least two distinct centres")
    directions = []
    for first, second in zip(points, points[1:]):
        delta = second - first
        if delta.length <= _EPS:
            raise ValueError("Consecutive loft centres must be distinct")
        directions.append(delta.normalized())
    tangents = [directions[0]]
    for previous, following in zip(directions, directions[1:]):
        blended = previous + following
        if blended.length <= _EPS:
            raise ValueError("A loft cannot reverse exactly through itself at one centre")
        tangents.append(blended.normalized())
    tangents.append(directions[-1])
    seed = _vector(up)
    if seed.length <= _EPS:
        raise ValueError("Section up vector cannot be zero")
    seed.normalize()
    if abs(seed.dot(tangents[0])) > .98:
        seed = Vector((0, -1, 0))
        if abs(seed.dot(tangents[0])) > .98:
            seed = Vector((1, 0, 0))
    right = tangents[0].cross(seed).normalized()
    height = right.cross(tangents[0]).normalized()
    frames = [(right.copy(), height.copy(), tangents[0].copy())]
    for previous, tangent in zip(tangents, tangents[1:]):
        if previous.dot(tangent) < -.9999:
            rotation = Quaternion(right, math.pi)
        else:
            rotation = previous.rotation_difference(tangent)
        right = rotation @ right
        right -= tangent * right.dot(tangent)
        right.normalize()
        height = right.cross(tangent).normalized()
        frames.append((right.copy(), height.copy(), tangent.copy()))
    return points, frames


def _mesh_object(name, vertices, faces, material, collection, uv_faces=None, smooth=None):
    if collection is None:
        raise ValueError("An explicit destination collection is required")
    if not vertices or not faces:
        raise ValueError("Refusing to create an empty geometry object")
    mesh = bpy.data.meshes.new(name + ".Mesh")
    try:
        mesh.from_pydata(vertices, [], faces)
        mesh.update(calc_edges=True)
        if uv_faces is not None:
            if len(uv_faces) != len(mesh.polygons):
                raise ValueError("UV face count differs from polygon count")
            layer = mesh.uv_layers.new(name="UVMap")
            for polygon, coordinates in zip(mesh.polygons, uv_faces):
                if len(coordinates) != polygon.loop_total:
                    raise ValueError("UV corner count differs from polygon corner count")
                for loop_index, coordinate in zip(polygon.loop_indices, coordinates):
                    layer.data[loop_index].uv = coordinate
        materials = list(material) if isinstance(material, (tuple, list)) else [material]
        for entry in materials:
            if entry is not None:
                mesh.materials.append(entry)
        for index, polygon in enumerate(mesh.polygons):
            polygon.use_smooth = True if smooth is None else bool(smooth[index])
        obj = bpy.data.objects.new(name, mesh)
        collection.objects.link(obj)
        return obj
    except Exception:
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)
        raise


def loft(name, centers, radii, material, collection, sides=12, caps=True,
         uv_scale=(1, 1), up=(0, 0, 1)):
    """Create a smooth, triangulated elliptical loft with transported frames.

    A +Y straight path has its width on X and section height on Z. A vertical
    path uses width on X and depth on Y. Curved frames transport continuously.
    UV U goes around the section, V follows normalized cumulative path length.
    Caps are flat shaded; longitudinal faces are smooth. Object origin is zero
    so all supplied centres remain at their explicit source-space coordinates.
    """
    if int(sides) != sides or sides < 3:
        raise ValueError("Loft sides must be an integer of at least three")
    sides = int(sides)
    points, frames = _path_frames(centers, up)
    sections = _radii(radii, len(points))
    if all(radius[0] <= _EPS for radius in sections):
        raise ValueError("A loft needs at least one nonzero section")
    distances = [0.0]
    for previous, current in zip(points, points[1:]):
        distances.append(distances[-1] + (current - previous).length)
    total_length = distances[-1]
    vertices, rings, faces, uv_faces, smooth = [], [], [], [], []
    for center, frame, radius in zip(points, frames, sections):
        right, height, _ = frame
        ring = []
        if radius[0] <= _EPS:
            ring.append(len(vertices)); vertices.append(tuple(center))
        else:
            for side in range(sides):
                angle = side * math.tau / sides
                ring.append(len(vertices))
                vertices.append(tuple(center + right * (math.cos(angle) * radius[0])
                                      + height * (math.sin(angle) * radius[1])))
        rings.append(ring)
    def add(face, coordinates, shaded=True):
        faces.append(face); uv_faces.append(coordinates); smooth.append(shaded)
    for section in range(len(points) - 1):
        start, end = rings[section], rings[section + 1]
        v0, v1 = (distances[section] / total_length * uv_scale[1],
                  distances[section + 1] / total_length * uv_scale[1])
        for side in range(sides):
            following = (side + 1) % sides
            u0, u1 = side / sides * uv_scale[0], (side + 1) / sides * uv_scale[0]
            if len(start) == 1:
                add((start[0], end[side], end[following]), (((u0 + u1) / 2, v0), (u0, v1), (u1, v1)))
            elif len(end) == 1:
                add((start[side], end[0], start[following]), ((u0, v0), ((u0 + u1) / 2, v1), (u1, v0)))
            else:
                add((start[side], end[side], start[following]), ((u0, v0), (u0, v1), (u1, v0)))
                add((start[following], end[side], end[following]), ((u1, v0), (u0, v1), (u1, v1)))
    if caps:
        for index, is_start in ((0, True), (len(rings) - 1, False)):
            ring = rings[index]
            if len(ring) == 1:
                continue
            center_index = len(vertices); vertices.append(tuple(points[index]))
            for side in range(sides):
                following = (side + 1) % sides
                first, second = (side, following) if is_start else (following, side)
                uv_first = (.5 + math.cos(first * math.tau / sides) * .5,
                            .5 + math.sin(first * math.tau / sides) * .5)
                uv_second = (.5 + math.cos(second * math.tau / sides) * .5,
                             .5 + math.sin(second * math.tau / sides) * .5)
                add((center_index, ring[first], ring[second]), ((.5, .5), uv_first, uv_second), False)
    return _mesh_object(name, vertices, faces, material, collection, uv_faces, smooth)


def bezier_tube(name, control_points, radius_start, radius_end, material, collection,
                samples=12, sides=8, taper=1.3, up=(0, 0, 1)):
    """A curved horn/tube from four cubic Bezier controls; zero end radius is a point."""
    controls = [_vector(point) for point in control_points]
    if len(controls) != 4:
        raise ValueError("A cubic Bezier tube requires exactly four control points")
    if int(samples) != samples or samples < 2 or not math.isfinite(taper) or taper <= 0:
        raise ValueError("Use at least two samples and a positive finite taper")
    start, end = _radius(radius_start), _radius(radius_end)
    points, radii = [], []
    for index in range(int(samples)):
        t = index / (samples - 1); s = 1 - t
        points.append(controls[0] * (s ** 3) + controls[1] * (3 * s * s * t)
                      + controls[2] * (3 * s * t * t) + controls[3] * (t ** 3))
        amount = (1 - t) ** taper
        radii.append(tuple(end[axis] + (start[axis] - end[axis]) * amount for axis in range(2)))
    return loft(name, points, radii, material, collection, sides=sides, up=up)


def _leaf_geometry(width, length, rise, thickness):
    if not all(math.isfinite(value) and value > 0 for value in (width, length, rise, thickness)):
        raise ValueError("Scale width, length, rise and thickness must be positive and finite")
    # Clockwise viewed from above; point is +Y and the attachment root is −Y.
    outline = [(0, .6), (.48, .16), (.5, -.25), (0, -.4), (-.5, -.25), (-.48, .16)]
    vertices = [(x * width, y * length, 0) for x, y in outline]
    vertices += [(x * width * .80, y * length * .80, rise * .42) for x, y in outline]
    vertices.append((0, -.025 * length, rise))
    vertices += [(x * width, y * length, -thickness) for x, y in outline]
    faces, smooth = [], []
    for index in range(6):
        following = (index + 1) % 6
        faces.append((12, 6 + following, 6 + index)); smooth.append(True)
        faces.append((index, 6 + index, 6 + following, following)); smooth.append(True)
        faces.append((index, following, 13 + following, 13 + index)); smooth.append(False)
    faces.append(tuple(range(13, 19))); smooth.append(False)
    uv_faces = [[(vertices[index][0] / width + .5, vertices[index][1] / length + .4)
                 for index in face] for face in faces]
    return vertices, faces, uv_faces, smooth


def _surface_frame(tangent, normal):
    normal = _vector(normal)
    if normal.length <= _EPS:
        raise ValueError("Scale normal cannot be zero")
    normal.normalize()
    direction = _vector(tangent)
    direction -= normal * direction.dot(normal)
    if direction.length <= _EPS:
        raise ValueError("Scale tangent must have a component along the surface")
    direction.normalize()
    right = direction.cross(normal).normalized()
    return right, direction, normal


def leaf_scale(name, center, tangent, normal, width, length, rise, thickness, material, collection):
    """Place one domed, solid leaf scale with its origin at the surface anchor."""
    vertices, faces, uv_faces, smooth = _leaf_geometry(width, length, rise, thickness)
    obj = _mesh_object(name, vertices, faces, material, collection, uv_faces, smooth)
    right, direction, outward = _surface_frame(tangent, normal)
    matrix = Matrix((right, direction, outward)).transposed().to_4x4()
    matrix.translation = _vector(center)
    obj.matrix_world = matrix
    return obj


def batch_scales(name, placements, material, collection):
    """Combine curved scale placements into one object, retaining one material list.

    Each placement is a dict containing center/tangent/normal/width/length/rise/
    thickness. Optional material_index selects a supplied material-list slot.
    Geometry is source-space with object origin zero; caller can weight this
    batch to a desired rig bone without a temporary join/operator/context step.
    """
    vertices, faces, uv_faces, smooth, material_indices = [], [], [], [], []
    for placement in placements:
        anchor = _vector(placement["center"])
        right, direction, normal = _surface_frame(placement["tangent"], placement["normal"])
        local, local_faces, local_uv, local_smooth = _leaf_geometry(
            placement["width"], placement["length"], placement["rise"], placement["thickness"])
        offset = len(vertices)
        vertices.extend(tuple(anchor + right * x + direction * y + normal * z) for x, y, z in local)
        faces.extend(tuple(offset + index for index in face) for face in local_faces)
        uv_faces.extend(local_uv); smooth.extend(local_smooth)
        material_indices.extend([int(placement.get("material_index", 0))] * len(local_faces))
    obj = _mesh_object(name, vertices, faces, material, collection, uv_faces, smooth)
    for polygon, material_index in zip(obj.data.polygons, material_indices):
        if material_index < 0 or material_index >= max(1, len(obj.data.materials)):
            raise ValueError("Scale material_index exceeds the supplied material list")
        polygon.material_index = material_index
    obj["scale_count"] = len(material_indices) // 19
    obj["source_polygons_per_scale"] = 19
    obj["triangles_per_scale"] = 34
    return obj


def curved_scale_rows(name, centers, radii, material, collection, count_around=12,
                      scale_length=.20, rise=.025, thickness=.007, width_overlap=1.08,
                      tip_direction=-1, angle_range=(0, math.tau), up=(0, 0, 1)):
    """Staggered leaf rows following an elliptical neck/chest surface.

    Each supplied centre is a row. Point tips are skipped. `angle_range` can
    select only a chest/front or back arc; full wraps stagger alternate rows.
    Default scale tips point backward along the path (toward the lower row).
    """
    if int(count_around) != count_around or count_around < 3:
        raise ValueError("Use at least three scale positions per circumference")
    if tip_direction not in (-1, 1):
        raise ValueError("tip_direction must be -1 or +1")
    points, frames = _path_frames(centers, up)
    sections = _radii(radii, len(points))
    placements = []
    for row, (center, frame, radius) in enumerate(zip(points, frames, sections)):
        a, b = radius
        if a <= _EPS:
            continue
        right, height, path_tangent = frame
        h = ((a - b) / (a + b)) ** 2
        circumference = math.pi * (a + b) * (1 + 3 * h / (10 + math.sqrt(4 - 3 * h)))
        width = circumference / count_around * width_overlap
        for index in range(int(count_around)):
            angle = (index + .5 * (row % 2)) / count_around * math.tau
            if not angle_range[0] <= angle <= angle_range[1]:
                continue
            outward = (right * (math.cos(angle) / a) + height * (math.sin(angle) / b)).normalized()
            anchor = center + right * (math.cos(angle) * a) + height * (math.sin(angle) * b)
            placements.append(dict(center=anchor, tangent=path_tangent * tip_direction, normal=outward,
                                   width=width, length=scale_length, rise=rise, thickness=thickness))
    return batch_scales(name, placements, material, collection)
