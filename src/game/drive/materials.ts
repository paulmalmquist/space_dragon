import type { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { BackgroundMaterial } from '@babylonjs/core/Materials/Background/backgroundMaterial';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { CubeTexture } from '@babylonjs/core/Materials/Textures/cubeTexture';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import '@babylonjs/core/Shaders/pbr.vertex';
import '@babylonjs/core/Shaders/pbr.fragment';
import '@babylonjs/core/Shaders/background.vertex';
import '@babylonjs/core/Shaders/background.fragment';

const assetRoot = `${import.meta.env.BASE_URL}assets/drive/`;

/** Scanned CC0 surfaces. Ribbon UVs use metres / 4; map scales recover source size. */
export function createDriveMaterials(scene: Scene) {
  const ownedMaterials: PBRMaterial[] = [];
  const textures = new Map<string, Texture>();
  function texture(name: string, map: string, repeat = 1) {
    const key = `${name}-${map}:${repeat}`;
    const cached = textures.get(key);
    if (cached) return cached;
    const value = new Texture(`${assetRoot}materials/${name}-${map}.webp`, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE);
    value.gammaSpace = map === 'albedo';
    value.wrapU = value.wrapV = Texture.WRAP_ADDRESSMODE;
    value.uScale = value.vScale = repeat;
    value.anisotropicFilteringLevel = 8;
    textures.set(key, value);
    return value;
  }
  function solid(name: string, color: string, roughness = 0.75, metallic = 0) {
    const material = new PBRMaterial(`drive.pbr.${name}`, scene);
    material.albedoColor = Color3.FromHexString(color).toLinearSpace();
    material.roughness = roughness;
    material.metallic = metallic;
    material.environmentIntensity = 0.8;
    ownedMaterials.push(material);
    return material;
  }
  function scanned(name: string, source: string, repeat: number, roughness = 0.85, tint = '#ffffff') {
    const material = solid(name, tint, roughness);
    material.albedoTexture = texture(source, 'albedo', repeat);
    material.bumpTexture = texture(source, 'normal', repeat);
    material.bumpTexture.level = source === 'asphalt' ? 0.58 : source === 'grass' ? 0.38 : 0.5;
    material.invertNormalMapX = false;
    material.invertNormalMapY = false;
    material.metallicTexture = texture(source, 'roughness', repeat);
    material.useRoughnessFromMetallicTextureAlpha = false;
    material.useRoughnessFromMetallicTextureGreen = true;
    material.useMetallnessFromMetallicTextureBlue = false;
    material.useAmbientOcclusionFromMetallicTextureRed = false;
    return material;
  }

  // Ground sources cover approximately 2.0–2.5 metres per tile (see provenance).
  const asphalt = scanned('asphalt', 'asphalt', 4 / 2.08, 0.79, '#bccee4');
  asphalt.clearCoat.isEnabled = true;
  asphalt.clearCoat.intensity = 0.16;
  asphalt.clearCoat.roughness = 0.26;
  const wet = scanned('wet-asphalt', 'asphalt', 4 / 2.08, 0.35, '#9ebad8');
  wet.clearCoat.isEnabled = true;
  wet.clearCoat.intensity = 0.65;
  wet.clearCoat.roughness = 0.14;
  const concrete = scanned('concrete', 'concrete', 2, 0.92, '#f3f0e6');
  const curb = scanned('curb', 'concrete', 1, 0.88, '#ffffff');
  const grass = scanned('grass', 'grass', 4 / 2.51, 1, '#aae599');
  const medianGrass = scanned('median-grass', 'grass', 4 / 2.51, 1, '#a8e095');
  // The large terrain plane has normalized 0..1 UVs, unlike metre-based ribbons.
  const terrainGrass = scanned('terrain-grass', 'grass', 6000 / 2.51, 1, '#a4d794');
  const wall = scanned('boundary-wall', 'plaster', 1, 0.94, '#e3dfd4');
  const storefront = scanned('storefront', 'plaster', 1, 0.92, '#f0e7d3');
  const trunk = scanned('palm-bark', 'bark', 1, 0.92, '#e0d7c0');
  // Unit-height trunk source meshes stretch to ~7m. Preserve natural bark rings.
  for (const map of ['albedo', 'normal', 'roughness']) texture('bark', map).vScale = 5;
  const white = solid('paint-white', '#e8e5dc', 0.57);
  const yellow = solid('paint-yellow', '#e6ba43', 0.56);
  const hedge = solid('hedge', '#35532b', 1);
  const leaves = solid('palm-leaves', '#425d2d', 0.84);
  leaves.backFaceCulling = false;
  leaves.twoSidedLighting = true;
  const treeLeaves = solid('tree-leaves', '#3d5d31', 0.9);
  treeLeaves.backFaceCulling = false;
  treeLeaves.twoSidedLighting = true;
  const pole = scanned('utility-pole', 'concrete', 1, 0.88, '#c7c4b8');
  const metal = solid('metal', '#87969c', 0.38, 0.9);
  const terracotta = solid('terracotta', '#a86443', 0.9);
  const glass = solid('architectural-glass', '#708c96', 0.12, 0.35);
  glass.environmentIntensity = 1.1;
  glass.clearCoat.isEnabled = true;
  glass.clearCoat.intensity = 1;
  glass.clearCoat.roughness = 0.05;
  const teal = solid('car-paint', '#2e7579', 0.27, 0.62);
  teal.clearCoat.isEnabled = true;
  teal.clearCoat.intensity = 1;
  teal.clearCoat.roughness = 0.12;
  const dark = solid('rubber', '#202323', 0.92);
  const signalGreen = solid('signal-green', '#9bc762', 0.3);
  signalGreen.emissiveColor.set(0.2, 0.8, 0.09);
  const rearLight = solid('rear-light', '#c93e25', 0.23);
  rearLight.emissiveColor.set(0.36, 0.02, 0.008);

  return { asphalt, wet, concrete, curb, white, yellow, grass, medianGrass, terrainGrass,
    hedge, leaves, treeLeaves, trunk, bark: trunk, pole, metal, metals: metal, wall,
    terracotta, storefront, glass, teal, paint: teal, dark, signalGreen, rearLight,
    dispose() {
      for (const material of ownedMaterials) material.dispose(false, false);
      for (const value of textures.values()) value.dispose();
    },
  };
}

/** A real photographed partly-cloudy sky, also used for PBR lighting/reflections. */
export function createDriveSky(scene: Scene) {
  let settle!: (loaded: boolean) => void;
  const ready = new Promise<boolean>(resolve => { settle = resolve; });
  // Same prefiltered-data path as CreateFromPrefilteredData, with explicit load/error callbacks.
  const environment = new CubeTexture(`${assetRoot}sky/daylight-512.env`, scene, {
    prefiltered: true, createPolynomials: false, onLoad: () => settle(true), onError: () => settle(false),
  });
  environment.rotationY = 4.71;
  scene.environmentTexture = environment;
  scene.environmentIntensity = 0.6;
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  scene.imageProcessingConfiguration.exposure = 2;
  scene.imageProcessingConfiguration.contrast = 1.13;
  const sky = MeshBuilder.CreateBox('drive.photographic-sky', { size: 800 }, scene);
  sky.infiniteDistance = true;
  sky.isPickable = false;
  sky.applyFog = false;
  const background = new BackgroundMaterial('drive.photographic-sky-material', scene);
  background.backFaceCulling = false;
  background.reflectionTexture = environment.clone();
  // HDRCubeTexture.clone() did not copy its rotation; preserve that existing sky orientation.
  (background.reflectionTexture as CubeTexture).rotationY = 0;
  background.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
  background.reflectionBlur = 0;
  background.enableNoise = true;
  sky.material = background;
  return { sky, environment, ready, dispose() {
    sky.dispose(); background.reflectionTexture?.dispose(); background.dispose(); environment.dispose();
  } };
}
