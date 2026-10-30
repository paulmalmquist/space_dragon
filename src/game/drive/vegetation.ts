import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import { registerBuiltInLoaders } from '@babylonjs/loaders/dynamic';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import type { Scene } from '@babylonjs/core/scene';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';

export type DriveVegetationKind = 'palm' | 'canopy' | 'hedge';
export interface DriveVegetationPlacement {
  kind: DriveVegetationKind; x: number; z: number; y?: number; height?: number; yaw?: number; seed?: number;
}
interface VegetationGroup {
  kind: DriveVegetationKind; x: number; z: number; instances: InstancedMesh[]; shadows?: ShadowGenerator; casting: boolean; disposed: boolean;
}
const random = (seed: number) => { const n = Math.sin(seed * 127.1 + 67.3) * 43758.5453; return n - Math.floor(n); };
const SOURCE_HEIGHT: Record<DriveVegetationKind, number> = { palm: 12, canopy: 3.406606, hedge: 0.856941 };
const DETAIL_DISTANCE: Record<DriveVegetationKind, number> = { palm: 95, canopy: 72, hedge: 48 };
const SHADOW_DISTANCE = 55;

/** Real CC0 textured plant geometry, local delivery, per-instance LOD and bounded nearby shadows. */
export async function createDriveVegetation(scene: Scene) {
  registerBuiltInLoaders();
  const base = new URL(`${import.meta.env.BASE_URL}assets/drive/vegetation/`, window.location.href).href;
  const kinds: DriveVegetationKind[] = ['palm', 'canopy', 'hedge'];
  const containers = await Promise.all(kinds.map(kind => LoadAssetContainerAsync(`${base}${kind}.glb`, scene)));
  if (scene.isDisposed) { containers.forEach(container => container.dispose()); throw new Error('Scene closed during vegetation load.'); }
  const templates = new Map<DriveVegetationKind, Mesh[]>();
  const sourceCounts: Record<string, { near: number; far: number }> = {};
  for (let i = 0; i < kinds.length; i++) {
    const kind = kinds[i]; const container = containers[i];
    container.addAllToScene();
    const geometry = container.meshes.filter((mesh): mesh is Mesh => mesh instanceof Mesh && mesh.getTotalVertices() > 0);
    // Bake glTF conversion/node transforms once, so all instances share a ground-level origin.
    const transforms = new Map(geometry.map(mesh => [mesh, mesh.computeWorldMatrix(true).clone()]));
    for (const mesh of geometry) {
      mesh.makeGeometryUnique();
      mesh.bakeTransformIntoVertices(transforms.get(mesh)!);
      mesh.parent = null;
      mesh.position.setAll(0); mesh.scaling.setAll(1); mesh.rotation.setAll(0); mesh.rotationQuaternion = null;
      mesh.refreshBoundingInfo();
      mesh.isVisible = false; mesh.isPickable = false; mesh.receiveShadows = true;
      if (mesh.material instanceof PBRMaterial) {
        mesh.material.backFaceCulling = false;
        mesh.material.twoSidedLighting = true;
        mesh.material.environmentIntensity = 0.8;
        if (/leaves|shrub/i.test(mesh.material.name)) {
          mesh.material.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHATEST;
          mesh.material.alphaCutOff = 0.4;
          mesh.material.metallicTexture = null;
          mesh.material.metallic = 0;
          mesh.material.roughness = 0.9;
          mesh.material.metallicF0Factor = 0.35;
          mesh.material.enableSpecularAntiAliasing = true;
          if (mesh.material.bumpTexture) mesh.material.bumpTexture.level = 0.22;
          if (mesh.material.albedoTexture) mesh.material.albedoTexture.hasAlpha = true;
          mesh.material.subSurface.isTranslucencyEnabled = true;
          mesh.material.subSurface.translucencyIntensity = 0.25;
          mesh.material.subSurface.useAlbedoToTintTranslucency = true;
          mesh.material.subSurface.tintColor.set(0.35, 0.6, 0.18);
          mesh.material.subSurface.minimumThickness = 0;
          mesh.material.subSurface.maximumThickness = 0.03;
        }
      }
    }
    const near = geometry.filter(mesh => mesh.name.includes('.near.'));
    const far = geometry.filter(mesh => mesh.name.includes('.far.'));
    for (const mesh of near) {
      const low = far.find(candidate => candidate.name === mesh.name.replace('.near.', '.far.'));
      if (low) mesh.addLODLevel(DETAIL_DISTANCE[kind], low);
      mesh.addLODLevel(390, null);
    }
    if (!near.length) throw new Error(`Vegetation asset ${kind} has no near geometry.`);
    templates.set(kind, near);
    sourceCounts[kind] = { near: near.reduce((n, mesh) => n + mesh.getTotalIndices() / 3, 0), far: far.reduce((n, mesh) => n + mesh.getTotalIndices() / 3, 0) };
  }
  const groups = new Set<VegetationGroup>();
  let serial = 0;
  let lastShadowUpdate = -Infinity;
  const viewerPosition = { x: 0, z: 0 };
  let disposed = false;

  function addToChunk(parent: TransformNode, placements: DriveVegetationPlacement[], shadows?: ShadowGenerator) {
    const chunkGroups: VegetationGroup[] = [];
    for (const placement of placements) {
      const group: VegetationGroup = { kind: placement.kind, x: placement.x, z: placement.z, instances: [], shadows, casting: false, disposed: false };
      const seed = placement.seed ?? serial;
      const height = placement.height ?? (placement.kind === 'palm' ? 10 : placement.kind === 'canopy' ? 8 : 1.45);
      const yaw = placement.yaw ?? random(seed) * Math.PI * 2;
      const count = 1;
      for (let branch = 0; branch < count; branch++) {
        for (const template of templates.get(placement.kind)!) {
          const instance = template.createInstance(`drive.vegetation.${placement.kind}.${serial++}`);
          instance.parent = parent;
          instance.position.set(placement.x, placement.y ?? 0, placement.z);
          instance.rotation.y = yaw;
          if (placement.kind === 'hedge') {
            // Dense low canopy variation reuses the actual coastal-tree leaf distribution and photographs.
            const scale = height / SOURCE_HEIGHT.hedge;
            const spread = 0.9 + random(seed + 19) * 0.2;
            instance.scaling.set(scale * spread, scale, scale * spread);
            instance.rotation.y += random(seed + branch) * 0.2;
          } else {
            const scale = height / SOURCE_HEIGHT[placement.kind];
            const spread = 0.92 + random(seed + 4) * 0.16;
            instance.scaling.set(scale * spread, scale, scale * spread);
            if (placement.kind === 'palm' && /foliage|leaf/i.test(template.material?.name ?? '')) {
              instance.scaling.x *= 1.25; instance.scaling.z *= 1.25;
            }
          }
          instance.isVisible = true; instance.isPickable = false; instance.receiveShadows = true;
          instance.freezeWorldMatrix();
          group.instances.push(instance);
        }
      }
      groups.add(group); chunkGroups.push(group);
    }
    let chunkDisposed = false;
    const dispose = () => {
      if (chunkDisposed) return; chunkDisposed = true;
      for (const group of chunkGroups) {
        group.disposed = true;
        for (const instance of group.instances) {
          if (group.casting) group.shadows?.removeShadowCaster(instance, false);
          if (!instance.isDisposed()) instance.dispose();
        }
        groups.delete(group);
      }
    };
    parent.onDisposeObservable.addOnce(dispose);
    return { dispose };
  }

  function update(cameraPosition: { x: number; z: number }) {
    viewerPosition.x = cameraPosition.x; viewerPosition.z = cameraPosition.z;
    const now = performance.now();
    if (now - lastShadowUpdate < 200) return;
    lastShadowUpdate = now;
    for (const group of groups) {
      if (!group.shadows || group.disposed) continue;
      const casting = Math.hypot(group.x - cameraPosition.x, group.z - cameraPosition.z) < SHADOW_DISTANCE;
      if (casting === group.casting) continue;
      group.casting = casting;
      for (const instance of group.instances) {
        if (casting) group.shadows.addShadowCaster(instance, false);
        else group.shadows.removeShadowCaster(instance, false);
      }
    }
  }
  return {
    addToChunk, update,
    metrics() {
      const byKind = Object.fromEntries(kinds.map(kind => [kind, { plants: 0, near: 0, far: 0, beyondCull: 0, shadowPlants: 0 }]));
      let estimatedMainTriangles = 0; let estimatedShadowTriangles = 0;
      for (const group of groups) {
        const distance = Math.hypot(group.x - viewerPosition.x, group.z - viewerPosition.z);
        const lod = distance < DETAIL_DISTANCE[group.kind] ? 'near' : 'far';
        const counts = byKind[group.kind]; counts.plants++;
        if (distance >= 390) counts.beyondCull++;
        else { counts[lod]++; estimatedMainTriangles += sourceCounts[group.kind][lod]; }
        if (group.casting) { counts.shadowPlants++; estimatedShadowTriangles += sourceCounts[group.kind][lod]; }
      }
      return { loaded: true, models: kinds.length, sourceTriangles: sourceCounts, byKind,
      estimatedMainTriangles, estimatedShadowTriangles, triangleEstimateScope: 'Loaded plants within distance limits before camera-frustum culling',
      plants: groups.size, instances: [...groups].reduce((n, group) => n + group.instances.length, 0),
      shadowInstances: [...groups].filter(group => group.casting).reduce((n, group) => n + group.instances.length, 0) }; },
    dispose() { if (disposed) return; disposed = true; for (const group of groups) for (const instance of group.instances) { group.shadows?.removeShadowCaster(instance, false); if (!instance.isDisposed()) instance.dispose(); } groups.clear(); containers.forEach(container => container.dispose()); },
  };
}
