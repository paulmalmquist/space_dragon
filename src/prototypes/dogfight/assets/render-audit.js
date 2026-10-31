import * as THREE from 'three';

// These are resource-size estimates, not vendor VRAM counters. Browser/WebGL
// exposes dimensions and formats but not driver padding, residency or overhead.
const channels = format => format === THREE.RedFormat || format === THREE.RedIntegerFormat || format === THREE.DepthFormat ? 1
  : format === THREE.RGFormat || format === THREE.RGIntegerFormat ? 2 : format === THREE.RGBFormat ? 3 : 4;
const componentBytes = type => type === THREE.FloatType || type === THREE.UnsignedIntType || type === THREE.IntType ? 4
  : type === THREE.HalfFloatType || type === THREE.UnsignedShortType || type === THREE.ShortType ? 2 : 1;

export function estimateTextureBytes(texture) {
  const image = Array.isArray(texture.image) ? texture.image[0]?.image ?? texture.image[0] : texture.image;
  let width = image?.width ?? 0, height = image?.height ?? 0;
  const depth = image?.depth ?? 1, faces = texture.isCubeTexture ? 6 : 1;
  if (!width || !height) return { width, height, depth, faces, bytes: 0, known: false, levels: 0 };
  if (texture.isCompressedTexture && texture.mipmaps?.length) return { width, height, depth, faces,
    bytes: texture.mipmaps.reduce((sum, mip) => sum + (mip.data?.byteLength ?? 0), 0) * faces,
    known: true, levels: texture.mipmaps.length, compressed: true };
  let bytesPerPixel = channels(texture.format) * componentBytes(texture.type);
  if (texture.type === THREE.UnsignedInt248Type || texture.format === THREE.DepthStencilFormat || texture.format === THREE.DepthFormat) bytesPerPixel = 4;
  if ([THREE.UnsignedShort4444Type, THREE.UnsignedShort5551Type].includes(texture.type)) bytesPerPixel = 2;
  const mipmaps = texture.generateMipmaps || texture.mipmaps?.length > 1;
  const initialWidth = width, initialHeight = height;
  let pixels = 0, levels = 0;
  do {
    pixels += width * height * depth; levels++;
    if (!mipmaps || width === 1 && height === 1) break;
    width = Math.max(1, Math.floor(width / 2)); height = Math.max(1, Math.floor(height / 2));
  } while (true);
  return { width: initialWidth, height: initialHeight, depth, faces, bytes: pixels * bytesPerPixel * faces,
    known: true, levels, bytesPerPixel, compressed: false };
}

// Mirrors the public inputs used by Three r180 WebGLTextures' source cache;
// texture transform/channel differences do not force another GPU allocation.
const uploadKey = texture => [texture.source?.uuid ?? texture.uuid, texture.wrapS, texture.wrapT, texture.wrapR || 0,
  texture.magFilter, texture.minFilter, texture.anisotropy, texture.internalFormat, texture.format, texture.type,
  texture.generateMipmaps, texture.premultiplyAlpha, texture.flipY, texture.unpackAlignment, texture.colorSpace].join('|');

function collectTextures(root, textures = new Set()) {
  const add = value => { if (value?.isTexture) textures.add(value); };
  add(root?.background); add(root?.environment);
  root?.traverse(object => {
    add(object.skeleton?.boneTexture);
    for (const material of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []) {
      for (const value of Object.values(material)) add(value);
      for (const uniform of Object.values(material.uniforms ?? {})) {
        if (Array.isArray(uniform?.value)) uniform.value.forEach(add); else add(uniform?.value);
      }
    }
  });
  return textures;
}

export function auditTextureMemory(root, { renderTargets = [] } = {}) {
  const targets = new Set(renderTargets.filter(Boolean)), textures = collectTextures(root);
  for (const target of targets) {
    for (const texture of target.textures ?? [target.texture]) if (texture) textures.add(texture);
    if (target.depthTexture) textures.add(target.depthTexture);
  }
  const uploads = new Map(), images = new Map();
  for (const texture of textures) {
    const key = texture.isRenderTargetTexture ? texture.uuid : uploadKey(texture);
    let record = uploads.get(key);
    if (!record) {
      record = { name: texture.name || '(unnamed)', uuid: texture.uuid, source: texture.source?.uuid,
        textureObjects: 0, colorSpace: texture.colorSpace, type: texture.type, format: texture.format,
        renderTarget: texture.isRenderTargetTexture, ...estimateTextureBytes(texture) };
      uploads.set(key, record);
    }
    record.textureObjects++;
    if (!texture.isRenderTargetTexture) {
      const image = texture.source?.data ?? texture.image;
      if (image) { const group = images.get(image) ?? []; group.push(key); images.set(image, group); }
    }
  }
  const allocations = [...uploads.values()];
  let depthRenderbufferBytes = 0, multisampleBytes = 0;
  const targetDetails = [];
  for (const target of targets) {
    const colorBytes = (target.textures ?? [target.texture]).reduce((sum, texture) => sum + estimateTextureBytes(texture).bytes, 0);
    const depthBytes = target.depthBuffer ? target.width * target.height * 4 : 0;
    // A resolved depth texture is already counted among texture allocations.
    if (!target.depthTexture) depthRenderbufferBytes += depthBytes;
    const msaa = Math.max(0, target.samples ?? 0);
    multisampleBytes += msaa * (colorBytes + depthBytes);
    targetDetails.push({ name: target.texture?.name || target.uuid, width: target.width, height: target.height,
      samples: msaa, depthBuffer: target.depthBuffer, stencilBuffer: target.stencilBuffer, colorBytes, depthBytes });
  }
  const textureBytes = allocations.reduce((sum, record) => sum + record.bytes, 0);
  return { scope: 'Estimated declared resources; not measured driver VRAM. Excludes backbuffer, driver overhead, padding and unreferenced caches.',
    textureObjects: textures.size, estimatedTextureAllocations: allocations.length, uniqueSourceImages: images.size,
    sharedImageTextureObjects: [...images.values()].filter(keys => keys.length > 1).length,
    duplicateUploadGroups: [...images.values()].filter(keys => new Set(keys).size > 1).length,
    unknownDimensions: allocations.filter(record => !record.known).length,
    textureBytes, depthRenderbufferBytes, multisampleBytes,
    estimatedTotalBytes: textureBytes + depthRenderbufferBytes + multisampleBytes,
    allocations, renderTargets: targetDetails };
}

export function composerTargets(composer) {
  const targets = new Set([composer?.renderTarget1, composer?.renderTarget2].filter(Boolean));
  for (const pass of composer?.passes ?? []) {
    for (const value of Object.values(pass)) {
      if (value?.isRenderTarget) targets.add(value);
      if (Array.isArray(value)) for (const item of value) if (item?.isRenderTarget) targets.add(item);
    }
  }
  return [...targets];
}

export function auditRenderer({ renderer, scene, camera, composer, assetRoot, extraRenderTargets = [] }) {
  const size = renderer.getSize(new THREE.Vector2()), buffer = renderer.getDrawingBufferSize(new THREE.Vector2());
  const lights = [], shadowTargets = [];
  scene.traverse(object => {
    if (!object.isLight) return;
    lights.push({ name: object.name || object.type, type: object.type, intensity: object.intensity,
      colorLinear: object.color.toArray(), castShadow: object.castShadow,
      shadow: object.castShadow ? { mapSize: object.shadow.mapSize.toArray(), bias: object.shadow.bias,
        normalBias: object.shadow.normalBias, camera: { near: object.shadow.camera.near, far: object.shadow.camera.far,
          left: object.shadow.camera.left, right: object.shadow.camera.right, top: object.shadow.camera.top, bottom: object.shadow.camera.bottom } } : null });
    if (object.shadow?.map) shadowTargets.push(object.shadow.map);
    if (object.shadow?.mapPass) shadowTargets.push(object.shadow.mapPass);
  });
  const context = renderer.getContext();
  const debug = context.getExtension('WEBGL_debug_renderer_info');
  const halfFloatSamples = context.getInternalformatParameter ? [...context.getInternalformatParameter(context.RENDERBUFFER, context.RGBA16F, context.SAMPLES)] : [];
  return { renderer: debug ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER),
    resolution: { css: size.toArray(), drawingBuffer: buffer.toArray(), pixelRatio: renderer.getPixelRatio(),
      devicePixelRatio: globalThis.devicePixelRatio ?? null },
    antialias: { canvas: context.getContextAttributes()?.antialias ?? null,
      composerSamples: composer?.renderTarget1.samples ?? null, maxSamples: renderer.capabilities.maxSamples,
      rgba16fSupportedSamples: halfFloatSamples, actualSceneSamples: null,
      sampleCountNote: 'Composer sample count is requested; driver-selected renderbuffer samples are not directly measured here.',
      effectiveSceneMSAA: composer ? (composer.renderTarget1.samples ?? 0) > 1 : context.getContextAttributes()?.antialias ?? false },
    color: { working: THREE.ColorManagement.workingColorSpace, output: renderer.outputColorSpace,
      toneMapping: renderer.toneMapping, exposure: renderer.toneMappingExposure,
      outputPasses: composer?.passes.filter(pass => pass.constructor.name === 'OutputPass').length ?? 0 },
    shadows: { enabled: renderer.shadowMap.enabled, type: renderer.shadowMap.type },
    camera: { near: camera.near, far: camera.far, fov: camera.fov }, lights,
    render: { ...renderer.info.render }, rendererMemory: { ...renderer.info.memory },
    resources: auditTextureMemory(scene, { renderTargets: [...composerTargets(composer), ...shadowTargets, ...extraRenderTargets] }),
    assetTextures: assetRoot ? auditTextureMemory(assetRoot) : null };
}
