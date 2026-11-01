import { Color3, Color4, Vector3 } from '@babylonjs/core/Maths/math';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { CubeTexture } from '@babylonjs/core/Materials/Textures/cubeTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { Camera } from '@babylonjs/core/Cameras/camera';
import type { VisualQualityProfile } from '../runtime/quality';

/** Reuses manifest-listed CC0 surfaces/IBL. No CDN, private reference or new export. */
export function createFirstContactVisuals(scene: Scene, cameras: Camera[]) {
  const assetRoot = `${import.meta.env.BASE_URL}assets/drive/`;
  const textures: Texture[] = [];
  const materials: PBRMaterial[] = [];
  let environmentStatus = 'loading';
  const environment = new CubeTexture(`${assetRoot}sky/daylight-512.env`, scene, {
    prefiltered: true, createPolynomials: false,
    onLoad: () => { environmentStatus = 'ready'; },
    onError: () => { environmentStatus = 'unavailable'; },
  });
  // Existing photographed daylight is subdued for this provisional night treatment.
  // A dedicated night capture remains an art task; this is not a new HDR source.
  environment.rotationY = 4.71;
  scene.environmentTexture = environment;
  scene.environmentIntensity = 0.32;
  scene.clearColor = new Color4(0.018, 0.032, 0.053, 1);
  scene.fogMode = 3; // Scene.FOGMODE_LINEAR, bounded beyond all nearby interactions.
  scene.fogStart = 11;
  scene.fogEnd = 38;
  scene.fogColor = new Color3(0.025, 0.048, 0.07);
  const image = scene.imageProcessingConfiguration;
  image.toneMappingEnabled = true;
  image.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  image.exposure = 1.42;
  image.contrast = 1.12;
  const pipeline = new DefaultRenderingPipeline('first-contact.presentation', true, scene, cameras);
  pipeline.bloomThreshold = 1.1;
  pipeline.bloomWeight = 0.15;
  pipeline.bloomKernel = 32;
  pipeline.bloomScale = 0.5;
  pipeline.fxaaEnabled = true;
  pipeline.depthOfFieldEnabled = false;
  pipeline.chromaticAberrationEnabled = false;
  pipeline.grainEnabled = false;

  function material(name: string, color: string, emissive?: string, roughness = 0.8, metallic = 0) {
    const value = new PBRMaterial(name, scene);
    value.albedoColor = Color3.FromHexString(color).toLinearSpace();
    value.metallic = metallic;
    value.roughness = roughness;
    value.maxSimultaneousLights = 4;
    if (emissive) value.emissiveColor = Color3.FromHexString(emissive).toLinearSpace();
    materials.push(value);
    return value;
  }
  function surface(value: PBRMaterial, source: string, repeatU: number, repeatV = repeatU) {
    const texture = (channel: string) => {
      const map = new Texture(`${assetRoot}materials/${source}-${channel}.webp`, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE);
      map.gammaSpace = channel === 'albedo';
      map.uScale = repeatU;
      map.vScale = repeatV;
      map.anisotropicFilteringLevel = 4;
      textures.push(map);
      return map;
    };
    value.albedoTexture = texture('albedo');
    value.bumpTexture = texture('normal');
    value.bumpTexture.level = 0.35;
    value.metallicTexture = texture('roughness');
    value.useRoughnessFromMetallicTextureAlpha = false;
    value.useRoughnessFromMetallicTextureGreen = true;
    value.useMetallnessFromMetallicTextureBlue = false;
    value.useAmbientOcclusionFromMetallicTextureRed = false;
  }
  return {
    material, surface,
    setQuality(profile: VisualQualityProfile) {
      pipeline.bloomEnabled = profile.bloom;
      pipeline.samples = profile.samples;
    },
    snapshot: () => ({
      preset: 'home-night', environment: environmentStatus,
      environmentSource: 'manifest:assets/drive/sky/daylight-512.env (subdued daylight IBL)',
      pbrMaterials: materials.length,
      postProcessing: { toneMapping: 'ACES', exposure: image.exposure, bloom: pipeline.bloomEnabled, samples: pipeline.samples, depthOfField: false },
    }),
    dispose() { pipeline.dispose(); environment.dispose(); textures.forEach(texture => texture.dispose()); },
  };
}

/** Deterministic, batched foreground detail with no new collision or gameplay state. */
export function addArrivalGroundDetail(scene: Scene, material: (name: string, color: string, emissive?: string, roughness?: number, metallic?: number) => PBRMaterial) {
  const grass = material('yard.grass-blades', '#657d4c', undefined, 1);
  grass.backFaceCulling = false;
  grass.twoSidedLighting = true;
  const blades: Mesh[] = [];
  let seed = 731;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 250; i++) {
    const x = 0.2 + random() * 9.2;
    const z = -4.8 + random() * 9.6;
    // Keep the patio, interaction path, practice pickup and pod skirt readable.
    if ((x < 2.8 && Math.abs(z) < 1.7) || Math.abs(z + 2.7) < 0.6 || Math.hypot(x - 3.5, z) < 1.65) continue;
    const height = 0.08 + random() * 0.2;
    const blade = MeshBuilder.CreateCylinder(`yard.grass-blade.${i}`, { height, diameterTop: 0, diameterBottom: 0.035, tessellation: 3 }, scene);
    blade.position.set(x, -0.1 + height / 2, z);
    blade.rotation.set((random() - 0.5) * 0.5, random() * Math.PI, (random() - 0.5) * 0.5);
    blade.material = grass;
    blades.push(blade);
  }
  const merged = Mesh.MergeMeshes(blades, true, true);
  if (merged) { merged.name = 'yard.batched-grass'; merged.receiveShadows = true; merged.isPickable = false; }
  const soil = material('arrival.disturbed-soil', '#34312a', undefined, 1);
  const landing = MeshBuilder.CreateDisc('arrival.landing-mark', { radius: 1.5, tessellation: 64 }, scene);
  landing.rotation.x = Math.PI / 2;
  landing.position.set(3.5, -0.094, 0);
  landing.material = soil;
  landing.receiveShadows = true;
  landing.isPickable = false;
  const stone = material('arrival.scattered-stone', '#686d65', undefined, 0.95);
  const stones: Mesh[] = [];
  for (let i = 0; i < 30; i++) {
    const angle = random() * Math.PI * 2;
    const distance = 1.1 + random() * 0.65;
    const pebble = MeshBuilder.CreateIcoSphere(`arrival.stone.${i}`, { radius: 0.045 + random() * 0.07, subdivisions: 1 }, scene);
    pebble.position.set(3.5 + Math.cos(angle) * distance, -0.065, Math.sin(angle) * distance);
    pebble.scaling.set(1.3, 0.6, 1);
    pebble.rotation.y = angle;
    pebble.material = stone;
    stones.push(pebble);
  }
  const mergedStones = Mesh.MergeMeshes(stones, true, true);
  if (mergedStones) { mergedStones.name = 'arrival.batched-stones'; mergedStones.receiveShadows = true; mergedStones.isPickable = false; }
}

export type VisualShot = 'home' | 'arrival' | 'reveal';
export const VISUAL_SHOTS = {
  home: { alpha: -Math.PI / 2.6, beta: 1.05, radius: 11, target: new Vector3(-3.3, 1.1, 0) },
  arrival: { alpha: -Math.PI / 2.6, beta: 1.05, radius: 7, target: new Vector3(3.5, 1.1, 0) },
  reveal: { alpha: -Math.PI / 2.2, beta: 1.2, radius: 5, target: new Vector3(3.5, 1.25, 0) },
} as const;
