import { Color3, Color4, Vector3 } from '@babylonjs/core/Maths/math';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { CubeTexture } from '@babylonjs/core/Materials/Textures/cubeTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
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
  scene.clearColor = new Color4(0.012, 0.03, 0.058, 1);
  scene.fogMode = 2; // Scene.FOGMODE_EXP2: night haze deepens with distance across the block.
  scene.fogDensity = 0.0105;
  scene.fogColor = new Color3(0.03, 0.062, 0.1);
  const image = scene.imageProcessingConfiguration;
  image.toneMappingEnabled = true;
  image.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  image.exposure = 1.5;
  image.contrast = 1.14;
  const pipeline = new DefaultRenderingPipeline('first-contact.presentation', true, scene, cameras);
  pipeline.bloomThreshold = 1.1;
  pipeline.bloomWeight = 0.15;
  pipeline.bloomKernel = 32;
  pipeline.bloomScale = 0.5;
  pipeline.fxaaEnabled = true;
  pipeline.depthOfFieldEnabled = false;
  pipeline.chromaticAberrationEnabled = false;
  pipeline.grainEnabled = false;
  // Halo for lamps, windows, suit seams and the tether. Created on demand per quality tier.
  let glow: GlowLayer | undefined;
  // Only meshes that carry light join the halo pass, plus the big walls and roofs that must hide
  // lights behind them. Sky, additive sprites and decals already read as light, and drawing every
  // prop into the pass would double the frame's geometry.
  const glows = (mesh: { name: string; material: { name: string } | null }) =>
    /^(block\.(window|lamp|cyan|tail|screen|pad-glow|wall\.|roof\.|fence|garage-door)|hero\.(seam-light|thruster|tether-core|anchor-|perch-|spark$)|signal\.energy)/.test(mesh.material?.name ?? '') ||
    /^(navigation\.target|practice\.module-core|pod\.(energy|beacon))/.test(mesh.name);
  const included = new Set<number>();
  const extra = new Set<number>();
  const syncGlow = () => {
    if (!glow) return;
    for (const mesh of scene.meshes) {
      if (included.has(mesh.uniqueId) || !(glows(mesh) || extra.has(mesh.uniqueId))) continue;
      glow.addIncludedOnlyMesh(mesh as Mesh);
      included.add(mesh.uniqueId);
    }
  };
  const setGlow = (enabled: boolean) => {
    if (enabled && !glow) {
      glow = new GlowLayer('first-contact.glow', scene, { mainTextureRatio: 0.3, blurKernelSize: 24 });
      glow.intensity = 0.55;
      included.clear();
      syncGlow();
    } else if (!enabled && glow) { glow.dispose(); glow = undefined; }
  };

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
    /** Call after building or loading meshes so new light-carrying meshes join the halo. */
    syncGlow,
    /** Loaded assets whose own materials carry light (the pod's energy seams). */
    includeInGlow(meshes: readonly { uniqueId: number }[]) { for (const mesh of meshes) extra.add(mesh.uniqueId); syncGlow(); },
    setQuality(profile: VisualQualityProfile) {
      pipeline.bloomEnabled = profile.bloom;
      pipeline.samples = profile.samples;
      setGlow(profile.glow);
    },
    snapshot: () => ({
      preset: 'home-night', environment: environmentStatus,
      environmentSource: 'manifest:assets/drive/sky/daylight-512.env (subdued daylight IBL)',
      pbrMaterials: materials.length,
      postProcessing: { toneMapping: 'ACES', exposure: image.exposure, bloom: pipeline.bloomEnabled, glow: Boolean(glow), samples: pipeline.samples, depthOfField: false },
    }),
    dispose() { glow?.dispose(); pipeline.dispose(); environment.dispose(); textures.forEach(texture => texture.dispose()); },
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
    // Keep the patio, paths, practice pickup, trampoline and pod skirt readable.
    if ((x < 2.8 && Math.abs(z) < 1.7) || Math.abs(z + 2.7) < 0.6 || Math.hypot(x - 3.5, z) < 1.65) continue;
    if ((x > 4.9 && Math.abs(z - 0.45) < 0.75) || (x > 5.9 && x < 9 && z > 1.8 && z < 4.4)) continue;
    const height = 0.08 + random() * 0.2;
    const blade = MeshBuilder.CreateCylinder(`yard.grass-blade.${i}`, { height, diameterTop: 0, diameterBottom: 0.035, tessellation: 3 }, scene);
    blade.position.set(x, height / 2, z);
    blade.rotation.set((random() - 0.5) * 0.5, random() * Math.PI, (random() - 0.5) * 0.5);
    blade.material = grass;
    blades.push(blade);
  }
  const merged = Mesh.MergeMeshes(blades, true, true);
  if (merged) { merged.name = 'yard.batched-grass'; merged.receiveShadows = true; merged.isPickable = false; }
  const soil = material('arrival.disturbed-soil', '#34312a', undefined, 1);
  const landing = MeshBuilder.CreateDisc('arrival.landing-mark', { radius: 1.5, tessellation: 64 }, scene);
  landing.rotation.x = Math.PI / 2;
  landing.position.set(3.5, 0.012, 0);
  landing.material = soil;
  landing.receiveShadows = true;
  landing.isPickable = false;
  const stone = material('arrival.scattered-stone', '#686d65', undefined, 0.95);
  const stones: Mesh[] = [];
  for (let i = 0; i < 30; i++) {
    const angle = random() * Math.PI * 2;
    const distance = 1.1 + random() * 0.65;
    const pebble = MeshBuilder.CreateIcoSphere(`arrival.stone.${i}`, { radius: 0.045 + random() * 0.07, subdivisions: 1 }, scene);
    pebble.position.set(3.5 + Math.cos(angle) * distance, 0.035, Math.sin(angle) * distance);
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
