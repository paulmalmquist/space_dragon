"""Local Blender materials for the SD-080 living amethyst dragon.

Import this module from the owner of the Blender scene, then call
``materials = create_materials()``. No scene, mesh, rig, export or file is touched
by importing the module. Only materials bearing this module's ownership marker
are rebuilt. Pass a fresh prefix to retain a previously edited material family.

These are reference/source shaders, not glTF-ready texture assets. Their cell,
grain and roughness detail needs baking for game export. Geometry should carry
the large overlapping scales; the shader supplies restrained smaller detail.
"""

import bpy

OWNER = "SD080_violet_dragon_materials_v001"


def _color(hex_value):
    """Convert an sRGB art swatch into Blender's linear shader input values."""
    text = hex_value.lstrip("#")
    rgb = [int(text[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in rgb) + (1.0,)


def _input(node, name, value, optional=False):
    socket = node.inputs.get(name)
    if socket is None:
        if optional:
            return False
        raise RuntimeError("Unsupported Blender node input: %s.%s" % (node.bl_idname, name))
    socket.default_value = value
    return True


def _node(nodes, kind, name, x, y):
    node = nodes.new(kind)
    node.name = name
    node.label = name
    node.location = (x, y)
    return node


def _material(prefix, role, swatch, roughness):
    name = prefix + "_" + role
    material = bpy.data.materials.get(name)
    if material is not None and material.get("generatedBy") != OWNER:
        raise RuntimeError("Preserving existing unowned material %s; choose a fresh prefix." % name)
    if material is None:
        material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.node_tree.nodes.clear()
    nodes, links = material.node_tree.nodes, material.node_tree.links
    shader = _node(nodes, "ShaderNodeBsdfPrincipled", "Living surface", 520, 120)
    output = _node(nodes, "ShaderNodeOutputMaterial", "Material output", 820, 120)
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    _input(shader, "Base Color", _color(swatch))
    _input(shader, "Metallic", 0.0)
    _input(shader, "Roughness", roughness)
    _input(shader, "IOR", 1.46)
    material.diffuse_color = _color(swatch)
    material.metallic = 0.0
    material.roughness = roughness
    material["generatedBy"] = OWNER
    material["surfaceRole"] = role
    material["requiresBakeForGame"] = True
    material["sourceShaderScope"] = "Procedural reference/source surface; no automatic glTF parity claimed"
    coords = _node(nodes, "ShaderNodeTexCoord", "Component surface coordinates", -1120, 100)
    return material, nodes, links, shader, coords


def _noise(nodes, links, vector, name, scale, x=-900, y=100):
    noise = _node(nodes, "ShaderNodeTexNoise", name, x, y)
    noise.noise_dimensions = "3D"
    _input(noise, "Scale", scale)
    _input(noise, "Detail", 2.2)
    _input(noise, "Roughness", .58)
    links.new(vector, noise.inputs["Vector"])
    return noise


def _ramp(nodes, links, value, name, low, high, x=-500, y=100, positions=(.2, .8)):
    ramp = _node(nodes, "ShaderNodeValToRGB", name, x, y)
    ramp.color_ramp.interpolation = "EASE"
    ramp.color_ramp.elements[0].position = positions[0]
    ramp.color_ramp.elements[0].color = low
    ramp.color_ramp.elements[1].position = positions[1]
    ramp.color_ramp.elements[1].color = high
    links.new(value, ramp.inputs["Fac"])
    return ramp


def _roughness(nodes, links, value, shader, low, high):
    remap = _node(nodes, "ShaderNodeMapRange", "Quiet roughness variation", -160, -80)
    remap.clamp = True
    _input(remap, "From Min", 0.0)
    _input(remap, "From Max", 1.0)
    _input(remap, "To Min", low)
    _input(remap, "To Max", high)
    links.new(value, remap.inputs["Value"])
    links.new(remap.outputs["Result"], shader.inputs["Roughness"])


def _scales(prefix, role, low, high, texture_object):
    material, nodes, links, shader, coords = _material(prefix, role, high, .43)
    if texture_object is not None:
        coords.object = texture_object
    vector = coords.outputs["Object"] if texture_object is not None else coords.outputs["Generated"]
    broad = _noise(nodes, links, vector, "Slow amethyst pigment variation", 4.5, y=340)
    color = _ramp(nodes, links, broad.outputs["Fac"], "Plum to amethyst pigment", _color(low), _color(high), y=340)
    links.new(color.outputs["Color"], shader.inputs["Base Color"])
    cells = _node(nodes, "ShaderNodeTexVoronoi", "Small scale cell boundaries", -890, -50)
    cells.voronoi_dimensions = "3D"
    cells.feature = "DISTANCE_TO_EDGE"
    _input(cells, "Scale", 38.0)
    links.new(vector, cells.inputs["Vector"])
    height = _ramp(nodes, links, cells.outputs["Distance"], "Shallow scale edge relief",
                   (.08, .08, .08, 1), (.7, .7, .7, 1), y=-30, positions=(.015, .10))
    scale_bump = _node(nodes, "ShaderNodeBump", "Subtle scale relief", 10, 180)
    _input(scale_bump, "Strength", .22)
    _input(scale_bump, "Distance", .004)
    links.new(height.outputs["Color"], scale_bump.inputs["Height"])
    grain = _noise(nodes, links, vector, "Fine skin grain", 145, y=-350)
    grain_bump = _node(nodes, "ShaderNodeBump", "Fine grain over scale relief", 290, 150)
    _input(grain_bump, "Strength", .1)
    _input(grain_bump, "Distance", .0006)
    links.new(grain.outputs["Fac"], grain_bump.inputs["Height"])
    links.new(scale_bump.outputs["Normal"], grain_bump.inputs["Normal"])
    links.new(grain_bump.outputs["Normal"], shader.inputs["Normal"])
    _roughness(nodes, links, broad.outputs["Fac"], shader, .35, .49)
    _input(shader, "Subsurface Weight", .035, optional=True)
    _input(shader, "Subsurface Radius", (.35, .12, .3), optional=True)
    _input(shader, "Coat Weight", .035, optional=True)
    _input(shader, "Coat Roughness", .32, optional=True)
    return material


def create_materials(prefix="SD080_Violet", texture_object=None):
    """Return nine named roles, with no mesh/scene/file changes.

    Optional texture_object supplies a common coordinate reference for parts.
    Default generated coordinates work on independent sculpted scale forms.
    Large membrane/scale structure belongs in geometry, not these microtextures.
    """
    materials = {
        "scale_dark": _scales(prefix, "Scale dark plum", "24162F", "443052", texture_object),
        "scale_mid": _scales(prefix, "Scale amethyst", "412951", "72538E", texture_object),
        "scale_light": _scales(prefix, "Scale lilac ridge", "624177", "9B79B2", texture_object),
    }
    for role, label, low, high, roughness in (
        ("ventral", "Ventral lilac plates", "796488", "B5A0C4", .48),
        ("horn", "Near black keratin", "100D18", "34273C", .34),
        ("teeth", "Warm ivory teeth", "B7ABA1", "E5DDD2", .29),
        ("mouth", "Living mouth tissue", "2F0E2B", "692D5D", .31),
    ):
        material, nodes, links, shader, coords = _material(prefix, label, high, roughness)
        noise = _noise(nodes, links, coords.outputs["Generated"], "Natural tissue variation", 8, y=150)
        color = _ramp(nodes, links, noise.outputs["Fac"], "Quiet organic tones", _color(low), _color(high), y=220)
        links.new(color.outputs["Color"], shader.inputs["Base Color"])
        _roughness(nodes, links, noise.outputs["Fac"], shader, roughness - .045, roughness + .055)
        if role in ("mouth", "ventral"):
            _input(shader, "Subsurface Weight", .09 if role == "mouth" else .045, optional=True)
        if role == "horn":
            stretch = _node(nodes, "ShaderNodeVectorMath", "Long keratin growth grain", -1050, -220)
            stretch.operation = "MULTIPLY"
            stretch.inputs[1].default_value = (32, 32, 2)
            links.new(coords.outputs["Generated"], stretch.inputs[0])
            grain = _noise(nodes, links, stretch.outputs["Vector"], "Directional keratin grain", 2, y=-220)
            bump = _node(nodes, "ShaderNodeBump", "Fine keratin ridges", 280, -80)
            _input(bump, "Strength", .16)
            _input(bump, "Distance", .001)
            links.new(grain.outputs["Fac"], bump.inputs["Height"])
            links.new(bump.outputs["Normal"], shader.inputs["Normal"])
        materials[role] = material

    membrane, nodes, links, shader, coords = _material(prefix, "Violet living membrane", "783FA3", .45)
    stretch = _node(nodes, "ShaderNodeVectorMath", "Membrane tension direction", -1050, 100)
    stretch.operation = "MULTIPLY"
    stretch.inputs[1].default_value = (2, 9, 2)
    links.new(coords.outputs["Generated"], stretch.inputs[0])
    noise = _noise(nodes, links, stretch.outputs["Vector"], "Soft tension folds", 3.8, y=200)
    color = _ramp(nodes, links, noise.outputs["Fac"], "Violet membrane depth", _color("432455"), _color("975DB4"), y=240)
    links.new(color.outputs["Color"], shader.inputs["Base Color"])
    bump = _node(nodes, "ShaderNodeBump", "Subtle stretched tissue", 270, -50)
    _input(bump, "Strength", .16)
    _input(bump, "Distance", .002)
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    _roughness(nodes, links, noise.outputs["Fac"], shader, .39, .52)
    _input(shader, "Subsurface Weight", .12, optional=True)
    _input(shader, "Subsurface Radius", (.45, .16, .5), optional=True)
    _input(shader, "Transmission Weight", .10, optional=True)
    _input(shader, "Sheen Weight", .16, optional=True)
    _input(shader, "IOR", 1.38)
    # Opaque alpha: tissue gets softness from scattering/transmission, not glassy
    # transparency or a blend mode that masks anatomy. Requires geometry thickness.
    materials["membrane"] = membrane

    eye, nodes, links, shader, coords = _material(prefix, "Violet iris energy", "BC87EC", .22)
    _input(shader, "Emission Color", _color("A95EE5"))
    _input(shader, "Emission Strength", 1.8)
    _input(shader, "Coat Weight", .16, optional=True)
    eye["requiresBakeForGame"] = False
    eye["emissionNote"] = "Restrained iris emission; bloom is separate renderer presentation"
    materials["eye"] = eye
    return materials
