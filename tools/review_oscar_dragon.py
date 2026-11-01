"""Render a separate Oscar game collection without saving over its Blender master.

Run in background Blender after preparation. The views use the same camera
positions/lens as the Unity inspection profile. Lighting is an approximation,
not a claim of pixel-equivalent rendering or owner approval.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys

import bpy
from mathutils import Matrix, Vector


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True)
    parser.add_argument('--collection', required=True)
    parser.add_argument('--out', required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    source = Path(args.source).resolve()
    output = Path(args.out).resolve()
    if output.exists() and any(output.iterdir()):
        raise RuntimeError('Use a fresh review directory; existing evidence is preserved.')
    output.mkdir(parents=True, exist_ok=True)
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False, use_scripts=False)
    collection = bpy.data.collections.get(args.collection)
    if collection is None:
        raise RuntimeError('Missing explicitly selected game collection: ' + args.collection)
    scene = bpy.data.scenes.new('Oscar neutral inspection - temporary')
    scene.collection.children.link(collection)
    bpy.context.window.scene = scene
    collection.hide_render = False
    collection.hide_viewport = False
    for obj in collection.all_objects:
        obj.hide_render = False
        obj.hide_set(False)
        if obj.type == 'ARMATURE':
            obj.animation_data_clear()
            obj.data.pose_position = 'POSE'
            for bone in obj.pose.bones:
                bone.matrix_basis = Matrix.Identity(4)
    scene.frame_set(0)
    bpy.context.view_layer.update()
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = 'PNG'
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    world = bpy.data.worlds.new('Oscar neutral inspection world')
    world.use_nodes = True
    background = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
    background.inputs['Color'].default_value = (.3, .32, .36, 1)
    background.inputs['Strength'].default_value = .45
    scene.world = world
    for name, position, energy, color in [
        ('Key', (5, 5, 8), 2.1, (1, 1, 1)),
        ('Fill', (-5, 1, 3), .55, (.88, .93, 1)),
        ('Rim', (-1, -6, 5), 1.2, (1, 1, 1)),
    ]:
        light = bpy.data.lights.new('Oscar review ' + name, 'SUN')
        light.energy = energy
        light.color = color
        light.angle = .12
        obj = bpy.data.objects.new(light.name, light)
        scene.collection.objects.link(obj)
        obj.location = position
        obj.rotation_euler = (-obj.location).to_track_quat('-Z', 'Y').to_euler()
    camera = bpy.data.cameras.new('Oscar review 50mm')
    camera.lens = 50
    camera.sensor_width = 36
    camera.sensor_height = 24
    camera.sensor_fit = 'VERTICAL'
    camera.clip_start = .05
    camera.clip_end = 200
    camera_object = bpy.data.objects.new(camera.name, camera)
    scene.collection.objects.link(camera_object)
    scene.camera = camera_object
    views = [('neutral', (10, -12, 6)), ('front', (0, -16, 2)), ('side', (16, 0, 3))]
    report = {'source': str(source), 'sourceSha256': source_hash,
              'collection': args.collection, 'blenderVersion': bpy.app.version_string,
              'renderEngine': scene.render.engine, 'viewTransform': scene.view_settings.view_transform,
              'resolution': [1200, 800], 'pose': 'Imported rest; no actions or pose offsets',
              'camera': {'lensMm': 50, 'sensorMm': [36, 24], 'targetBlender': [0, 0, .1]},
              'scope': 'Matching camera geometry; neutral lighting approximates Unity and is not pixel-equivalent.', 'views': []}
    target = Vector((0, 0, .1))
    for name, position in views:
        camera_object.location = position
        camera_object.rotation_euler = (target - camera_object.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = str(output / (name + '.png'))
        bpy.ops.render.render(write_still=True)
        report['views'].append({'name': name, 'cameraBlender': position,
                                'file': name + '.png', 'sha256': hashlib.sha256((output / (name + '.png')).read_bytes()).hexdigest()})
    report['sourceUnchanged'] = hashlib.sha256(source.read_bytes()).hexdigest() == source_hash
    (output / 'report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
