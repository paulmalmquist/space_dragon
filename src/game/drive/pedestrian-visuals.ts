import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import { registerBuiltInLoaders } from '@babylonjs/loaders/dynamic';
import { BakedVertexAnimationManager } from '@babylonjs/core/BakedVertexAnimation/bakedVertexAnimationManager';
import { VertexAnimationBaker } from '@babylonjs/core/BakedVertexAnimation/vertexAnimationBaker';
import { BoundingInfo } from '@babylonjs/core/Culling/boundingInfo';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import { Quaternion, Vector3, Vector4 } from '@babylonjs/core/Maths/math';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import type { Scene } from '@babylonjs/core/scene';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import type { PedestrianPose } from './pedestrians';
import '@babylonjs/core/Meshes/instancedMesh';

const FRAME_COUNT = 60;
const DETAIL_DISTANCE = 60;
const CULL_DISTANCE = 140;
const MAX_VISIBLE = 12;
interface Actor { root: TransformNode; parts: InstancedMesh[]; pose: PedestrianPose; distance: number; frame: number }
interface Template { parts: Mesh[]; manager: BakedVertexAnimationManager; triangles: number; footHeights: number[]; animationBytes: number }

/** MIT Rocketbox clothed adults, real skeletal walk clips, and shared GPU animation.
 * No running AnimationGroup or wall-clock observer can move a paused pedestrian.
 */
export function createPedestrianVisuals(scene: Scene) {
  registerBuiltInLoaders();
  const base = new URL(`${import.meta.env.BASE_URL}assets/drive/pedestrians/`, window.location.href).href;
  const containers: AssetContainer[] = [];
  const templates: Template[] = [];
  const actors = new Map<string, Actor>();
  const shadows: InstancedMesh[] = [];
  let disposed = false;
  let population = 0;
  let elapsedSeconds = 0;
  let loaded = false;

  const ready = Promise.all(['adult-female', 'adult-male'].map(async name => {
    const container = await LoadAssetContainerAsync(`${base}${name}.glb`, scene);
    if (disposed || scene.isDisposed) { container.dispose(); throw new Error('Scene closed during pedestrian load.'); }
    containers.push(container);
    container.addAllToScene();
    const parts = container.meshes.filter((mesh): mesh is Mesh => mesh instanceof Mesh && mesh.getTotalVertices() > 0);
    const skeleton = parts.find(mesh => mesh.skeleton)?.skeleton;
    const walk = container.animationGroups.find(group => group.name === 'walk');
    if (!skeleton || !walk || !parts.length) throw new Error(`Pedestrian ${name} has no rigged walk.`);
    container.animationGroups.forEach(group => group.stop());

    // Sample 60 poses once without rendering or advancing the game clock. All
    // actors then share this ~300KB matrix texture and their original geometry.
    const matricesPerFrame = (skeleton.bones.length + 1) * 16;
    const data = new Float32Array(matricesPerFrame * FRAME_COUNT);
    const footHeights: number[] = [];
    const partTransforms = parts.map(part => part.computeWorldMatrix(true).clone());
    for (let frame = 0; frame < FRAME_COUNT; frame++) {
      const keyframe = walk.from + (walk.to - walk.from) * frame / FRAME_COUNT;
      for (const channel of walk.targetedAnimations) {
        const target = channel.target as TransformNode;
        const value = channel.animation.evaluate(keyframe);
        const property = channel.animation.targetProperty;
        if (property === 'position') target.position.copyFrom(value as Vector3);
        else if (property === 'scaling') target.scaling.copyFrom(value as Vector3);
        else if (property === 'rotationQuaternion') target.rotationQuaternion = (value as Quaternion).clone();
      }
      skeleton.prepare(true);
      data.set(skeleton.getTransformMatrices(parts[0]), frame * matricesPerFrame);
      let floor = Infinity;
      for (let p = 0; p < parts.length; p++) {
        const positions = parts[p].getPositionData(true, false)!;
        const m = partTransforms[p].m;
        for (let v = 0; v < positions.length; v += 3) {
          floor = Math.min(floor, positions[v] * m[1] + positions[v + 1] * m[5] + positions[v + 2] * m[9] + m[13]);
        }
      }
      footHeights.push(floor);
    }
    const manager = new BakedVertexAnimationManager(scene);
    manager.texture = new VertexAnimationBaker(scene, skeleton).textureFromBakedVertexData(data);
    // Select frames explicitly through per-instance offsets. A frozen pose array
    // therefore also freezes limbs, including while the renderer keeps drawing.
    manager.time = 0;
    manager.setAnimationParameters(0, FRAME_COUNT - 1, 0, 0);
    for (const part of parts) {
      part.name = `drive.pedestrian.source.${name}.${part.name}`;
      part.isVisible = false; part.isPickable = false; part.receiveShadows = true;
      part.bakedVertexAnimationManager = manager;
      part.registerInstancedBuffer('bakedVertexAnimationSettingsInstanced', 4);
      part.instancedBuffers.bakedVertexAnimationSettingsInstanced = new Vector4(0, FRAME_COUNT - 1, 0, 0);
      // The original bind-pose bounds are too shallow for a forward step.
      part.setBoundingInfo(new BoundingInfo(new Vector3(-.8, -.12, -.8), new Vector3(.8, 2.05, .8)));
      if (part.material instanceof PBRMaterial) {
        part.material.metallic = 0; part.material.roughness = .82;
        part.material.environmentIntensity = .8;
        part.material.backFaceCulling = false; part.material.twoSidedLighting = true;
        part.material.enableSpecularAntiAliasing = true;
        if (part.material.albedoTexture?.hasAlpha) {
          part.material.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHATEST;
          part.material.alphaCutOff = .45;
        }
      }
    }
    return { parts, manager, footHeights, animationBytes: data.byteLength,
      triangles: parts.reduce((sum, mesh) => sum + mesh.getTotalIndices() / 3, 0) };
  })).then(values => { templates.push(...values); loaded = true; });

  function remove(actor: Actor) { actor.root.dispose(); }
  function create(pose: PedestrianPose): Actor {
    const root = new TransformNode(`drive.pedestrian.${pose.id}`, scene);
    const parts = templates[pose.appearance].parts.map(source => {
      const instance = source.createInstance(`drive.pedestrian.${pose.id}.${source.name}`);
      const scale = new Vector3(); const rotation = new Quaternion(); const position = new Vector3();
      source.computeWorldMatrix(true).decompose(scale, rotation, position);
      instance.parent = root;
      instance.position.copyFrom(position); instance.scaling.copyFrom(scale); instance.rotationQuaternion = rotation;
      instance.isVisible = true; instance.isPickable = false;
      instance.instancedBuffers.bakedVertexAnimationSettingsInstanced = new Vector4(0, FRAME_COUNT - 1, 0, 0);
      instance.metadata = { pedestrianId: pose.id, appearance: pose.appearance, sidewalkOnly: true };
      return instance;
    });
    return { root, parts, pose, distance: 0, frame: 0 };
  }
  return {
    ready,
    get shadowMeshes() { return shadows; },
    update(poses: readonly PedestrianPose[], player: { x: number; z: number }) {
      population = poses.length;
      elapsedSeconds = poses[0]?.elapsedSeconds ?? 0;
      if (!loaded || disposed) return;
      const visible = poses.map(pose => ({ pose, distance: Math.hypot(pose.x - player.x, pose.z - player.z) }))
        .filter(item => item.distance <= CULL_DISTANCE).sort((a, b) => a.distance - b.distance).slice(0, MAX_VISIBLE);
      const wanted = new Set(visible.map(item => item.pose.id));
      for (const [id, actor] of actors) if (!wanted.has(id)) { remove(actor); actors.delete(id); }
      shadows.length = 0;
      let shadowActors = 0;
      for (const { pose, distance } of visible) {
        let actor = actors.get(pose.id);
        if (!actor) { actor = create(pose); actors.set(pose.id, actor); }
        actor.pose = pose; actor.distance = distance;
        actor.root.rotation.y = pose.yaw;
        actor.root.scaling.setAll(pose.heightScale);
        const stride = distance < DETAIL_DISTANCE ? 1 : 3;
        actor.frame = Math.floor(pose.walkPhase * FRAME_COUNT / stride) * stride;
        // Keep the planted shoe on the actual sidewalk surface, including each
        // variant's slightly different body proportions and heel geometry.
        const floor = templates[pose.appearance].footHeights[actor.frame];
        actor.root.position.set(pose.x, .12 - floor * pose.heightScale, pose.z);
        for (const part of actor.parts) {
          (part.instancedBuffers.bakedVertexAnimationSettingsInstanced as Vector4).z = actor.frame;
        }
        if (distance < 25 && shadowActors < 2) { shadows.push(...actor.parts); shadowActors++; }
      }
    },
    metrics() {
      const active = [...actors.values()];
      return { loaded, population, elapsedSeconds, renderedPedestrians: active.length,
        nearPedestrians: active.filter(actor => actor.distance < DETAIL_DISTANCE).length,
        farPedestrians: active.filter(actor => actor.distance >= DETAIL_DISTANCE).length,
        instances: active.reduce((sum, actor) => sum + actor.parts.length, 0),
        sourceTriangles: templates.map(template => template.triangles), animationFrames: FRAME_COUNT,
        animationTextureBytes: templates.reduce((sum, template) => sum + template.animationBytes, 0),
        pedestrians: active.map(actor => ({ ...actor.pose, animationFrame: actor.frame,
          footHeight: .12, distance: actor.distance, lod: actor.distance < DETAIL_DISTANCE ? 'near' : 'far' })) };
    },
    dispose() {
      disposed = true; actors.forEach(remove); actors.clear(); shadows.length = 0;
      templates.forEach(template => template.manager.dispose(true));
      containers.forEach(container => container.dispose());
    },
  };
}
