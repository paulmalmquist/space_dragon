import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSurfaceDetail, refineModelMaterials } from '../src/prototypes/dogfight/assets/surface-materials.js';
import { createEffectTexture, Effects, makePulse } from '../src/prototypes/dogfight/assets/effects.js';

test('procedural effect textures have transparent borders and soft nonbinary alpha', () => {
  for (const kind of ['glow', 'fire', 'smoke']) {
    const texture = createEffectTexture(kind, 32), pixels = texture.image.data;
    assert.equal(pixels[3], 0);
    assert.ok(pixels[(16 * 32 + 16) * 4 + 3] > 100);
    const alpha = [...pixels].filter((_, i) => i % 4 === 3);
    assert.ok(new Set(alpha).size > 30);
    assert.ok(alpha.some(value => value > 0 && value < 50));
    texture.dispose();
  }
});

test('surface finish preserves UV texture and material identity while separating skin, membranes and metal', () => {
  const details = { scales: createSurfaceDetail('scales', 32), membrane: createSurfaceDetail('membrane', 32), metal: createSurfaceDetail('metal', 32) };
  const model = new THREE.Group(), map = new THREE.Texture();
  const source = new THREE.MeshStandardMaterial({ map }); source.name = 'Amethyst scales';
  const wing = new THREE.MeshStandardMaterial(); wing.name = 'Iridescent violet wing membrane';
  const geometry = new THREE.SphereGeometry(1, 8, 6);
  const skinMesh = new THREE.Mesh(geometry, source), wingMesh = new THREE.Mesh(geometry, wing);
  model.add(skinMesh, wingMesh);
  const originals = refineModelMaterials(model, details);
  assert.equal(skinMesh.geometry, geometry); assert.equal(skinMesh.material.name, source.name);
  assert.equal(skinMesh.material.map, map); assert.equal(skinMesh.material.isMeshPhysicalMaterial, true);
  assert.equal(skinMesh.material.normalMap, details.scales.normal);
  assert.equal(wingMesh.material.normalMap, details.membrane.normal);
  assert.ok(skinMesh.material.roughness > .6); assert.equal(wingMesh.material.metalness, 0);
  assert.ok(wingMesh.material.sheen > 0); assert.equal(skinMesh.castShadow, true);
  const drone = new THREE.Group(), hull = new THREE.MeshStandardMaterial(); hull.name = 'Drone ceramic gunmetal';
  drone.add(new THREE.Mesh(geometry, hull));
  const droneMaterials = refineModelMaterials(drone, details, 'drone');
  const finish = drone.children[0].material;
  assert.ok(finish.metalness > .7); assert.equal(finish.normalMap, details.metal.normal);
  // EnemySquad clones materials for hit feedback. The physical clone must work.
  const clone = finish.clone(); assert.equal(clone.name, hull.name); assert.equal(clone.normalMap, details.metal.normal);
  clone.emissive.set(0xc6a5ff); assert.notEqual(clone.emissive.getHex(), finish.emissive.getHex());
  clone.dispose();
  for (const replacements of [originals, droneMaterials]) for (const [original, material] of replacements) { original.dispose(); material.dispose(); }
  for (const detail of Object.values(details)) { detail.normal.dispose(); detail.roughness.dispose(); }
  map.dispose(); geometry.dispose();
});

test('bursts are bounded, expire, reuse pooled resources and clear without residual flashes', () => {
  const scene = new THREE.Scene(), effects = new Effects(scene), position = new THREE.Vector3(10, 2, -80);
  effects.burst(position, 'amber', true);
  assert.ok(effects.items.some(item => item.type === 'smoke'));
  assert.ok(effects.items.some(item => item.type === 'sparks'));
  assert.ok(effects.items.some(item => item.type === 'debris'));
  assert.ok(effects.flashes.some(flash => flash.light.intensity > 0));
  effects.update(.2);
  assert.ok(effects.items.filter(item => item.type === 'smoke').some(item => item.mesh.material.opacity > 0));
  effects.update(4); assert.equal(effects.items.length, 0);
  const pooledMaterialCount = effects.spriteMaterials.size;
  effects.burst(position, 'violet', true); effects.clear();
  assert.equal(effects.spriteMaterials.size, pooledMaterialCount);
  for (let i = 0; i < 80; i++) effects.burst(position, 'amber', true);
  assert.ok(effects.items.length <= 144); assert.ok(effects.sparkBatches.size <= 8);
  effects.clear(); assert.equal(effects.items.length, 0);
  assert.ok(effects.flashes.every(flash => flash.light.intensity === 0));
  effects.dispose(); effects.dispose(); assert.equal(scene.children.length, 0);
});

test('ordinary plasma remains a local z-axis tracer, with a transparent halo', () => {
  const pulse = makePulse(true);
  assert.equal(pulse.children.length, 2);
  assert.ok(pulse.children[0].scale.z > pulse.children[0].scale.x * 4);
  assert.ok(pulse.children[1].material.opacity < .2);
  pulse.traverse(object => { if (object.isMesh) { object.geometry.dispose(); object.material.dispose(); } });
});
