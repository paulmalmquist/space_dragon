import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import { KhronosTextureContainer2 } from '@babylonjs/core/Misc/khronosTextureContainer2';
import { registerBuiltInLoaders } from '@babylonjs/loaders/dynamic';
import type { Scene } from '@babylonjs/core/scene';

/** A review candidate, not approved final art. All decoder traffic stays on this origin. */
export async function loadPodAsset(scene: Scene) {
  registerBuiltInLoaders();
  const rootUrl = new URL(`${import.meta.env.BASE_URL}assets/pod/`, window.location.href).href;
  const decoder = `${rootUrl}decoder/`;
  KhronosTextureContainer2.URLConfig = {
    jsDecoderModule: `${decoder}babylon.ktx2Decoder.js`,
    wasmUASTCToASTC: `${decoder}uastc_astc.wasm`,
    wasmUASTCToBC7: `${decoder}uastc_bc7.wasm`,
    wasmUASTCToRGBA_UNORM: `${decoder}uastc_rgba8_unorm_v2.wasm`,
    wasmUASTCToRGBA_SRGB: `${decoder}uastc_rgba8_srgb_v2.wasm`,
    wasmUASTCToR8_UNORM: `${decoder}uastc_r8_unorm.wasm`,
    wasmUASTCToRG8_UNORM: `${decoder}uastc_rg8_unorm.wasm`,
    jsMSCTranscoder: `${decoder}msc_basis_transcoder.js`,
    wasmMSCTranscoder: `${decoder}msc_basis_transcoder.wasm`,
    wasmZSTDDecoder: `${decoder}zstddec.wasm`,
  };
  KhronosTextureContainer2.DefaultNumWorkers = 1;
  const started = performance.now();
  const container = await LoadAssetContainerAsync(`${rootUrl}rescue-pod-v002.glb`, scene);
  if (scene.isDisposed) { container.dispose(); throw new Error('Scene closed during asset load.'); }
  container.addAllToScene();
  for (const group of container.animationGroups) group.stop();
  const root = container.meshes.find(mesh => !mesh.parent);
  if (!root) { container.dispose(); throw new Error('Pod export has no root.'); }
  const animation = container.animationGroups.find(group => group.name === 'pod_open');
  const metrics = Object.freeze({
    assetId: 'rescue-pod', version: 'v002',
    loaded: true, loadMs: performance.now() - started,
    bytes: 463644, textureCompression: 'KTX2 ETC1S',
    meshes: container.meshes.filter(mesh => mesh.getTotalVertices() > 0).length,
    triangles: container.meshes.reduce((sum, mesh) => sum + mesh.getTotalIndices() / 3, 0),
    materials: container.materials.length, textures: container.textures.length,
    animations: container.animationGroups.map(group => group.name),
    nodes: [...container.transformNodes, ...container.meshes].map(node => node.name),
    status: 'provisional original design; human art review pending',
  });
  return {
    root, container, metrics,
    setOpen(open: boolean) {
      if (animation) {
        animation.start(false, 1);
        animation.goToFrame(open ? animation.to : animation.from);
        animation.pause();
      }
    },
    dispose() { container.dispose(); },
  };
}
