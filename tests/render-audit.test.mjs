import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { estimateTextureBytes, auditTextureMemory, composerTargets, auditRenderer } from '../src/prototypes/dogfight/assets/render-audit.js';

test('texture budgets account for complete NPOT mip chains, type and cube faces', () => {
  const map = new THREE.DataTexture(new Uint8Array(5 * 3 * 4), 5, 3);
  map.generateMipmaps = true;
  assert.equal(estimateTextureBytes(map).bytes, (15 + 2 + 1) * 4);
  map.type = THREE.HalfFloatType;
  assert.equal(estimateTextureBytes(map).bytes, 18 * 8);
  const cube = new THREE.CubeTexture(Array.from({ length: 6 }, () => ({ width: 2, height: 2 })));
  cube.generateMipmaps = false;
  assert.equal(estimateTextureBytes(cube).bytes, 2 * 2 * 4 * 6);
});

test('shared ORM channels and cloned textures count one source upload until sampler differs', () => {
  const image = { width: 4, height: 4 }, map = new THREE.Texture(image); map.generateMipmaps = false;
  const ao = map.clone(); ao.channel = 1;
  const scene = new THREE.Scene();
  const material = new THREE.MeshStandardMaterial({ aoMap: ao, roughnessMap: map, metalnessMap: map });
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(), material));
  let result = auditTextureMemory(scene);
  assert.equal(result.textureObjects, 2); assert.equal(result.uniqueSourceImages, 1);
  assert.equal(result.estimatedTextureAllocations, 1); assert.equal(result.textureBytes, 64);
  ao.wrapS = THREE.RepeatWrapping;
  result = auditTextureMemory(scene);
  assert.equal(result.estimatedTextureAllocations, 2); assert.equal(result.duplicateUploadGroups, 1);
  assert.equal(result.textureBytes, 128);
});

test('composer estimates include resolved color, depth and multisample storage without target duplication', () => {
  const scene = new THREE.Scene(), a = new THREE.WebGLRenderTarget(10, 20, { type: THREE.HalfFloatType, samples: 2 });
  const b = a.clone(); b.samples = 0; b.depthBuffer = false;
  const bloom = new THREE.WebGLRenderTarget(5, 10, { depthBuffer: false });
  scene.environment = a.texture;
  const targets = composerTargets({ renderTarget1: a, renderTarget2: b, passes: [{ renderTargetsHorizontal: [bloom, a] }] });
  assert.equal(targets.length, 3);
  const result = auditTextureMemory(scene, { renderTargets: targets });
  assert.equal(result.textureBytes, 2 * 10 * 20 * 8 + 5 * 10 * 4);
  assert.equal(result.depthRenderbufferBytes, 10 * 20 * 4);
  assert.equal(result.multisampleBytes, 2 * (10 * 20 * 8 + 10 * 20 * 4));
  assert.equal(result.estimatedTextureAllocations, 3);
});

test('unknown dimensions stay unknown instead of inventing a memory measurement', () => {
  assert.equal(estimateTextureBytes(new THREE.Texture()).known, false);
});

test('single-sample composer rendering is not reported as multisample anti-aliasing', () => {
  const context = { getExtension: () => null, getParameter: () => 'test-only fake renderer', getContextAttributes: () => ({ antialias: true }),
    getInternalformatParameter: () => new Int32Array([4, 2, 1]) };
  const renderer = { getContext: () => context, getSize: vector => vector.set(100, 50), getDrawingBufferSize: vector => vector.set(100, 50),
    getPixelRatio: () => 1, capabilities: { maxSamples: 4 }, shadowMap: { enabled: false }, info: { render: {}, memory: {} } };
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(), target = new THREE.WebGLRenderTarget(100, 50);
  const composer = { renderTarget1: target, passes: [] };
  for (const samples of [0, 1, 2]) {
    target.samples = samples;
    const result = auditRenderer({ renderer, scene, camera, composer });
    assert.equal(result.antialias.effectiveSceneMSAA, samples > 1);
    assert.equal(result.antialias.actualSceneSamples, null);
    assert.deepEqual(result.antialias.rgba16fSupportedSamples, [4, 2, 1]);
  }
});
