import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ASTEROID_FIELD, createAsteroidGeometry, createAsteroidTextures, createAsteroidField } from '../src/prototypes/dogfight/assets/asteroids.js';
import { createEnvironment } from '../src/prototypes/dogfight/assets/environment.js';

test('asteroid geometry is seeded, excavated and fractured with finite normals and usable UVs', () => {
  const a = createAsteroidGeometry(19, 6), b = createAsteroidGeometry(19, 6), other = createAsteroidGeometry(20, 6);
  assert.deepEqual(a.attributes.position.array, b.attributes.position.array);
  assert.notDeepEqual(a.attributes.position.array, other.attributes.position.array);
  assert.equal(a.attributes.position.count / 3, 980);
  assert.equal(a.userData.rock.craters, 14); assert.equal(a.userData.rock.fracturePlanes, 14);
  assert.ok(a.userData.rock.outerRadius - a.userData.rock.innerRadius > .25);
  assert.ok([...a.attributes.position.array, ...a.attributes.normal.array, ...a.attributes.uv.array].every(Number.isFinite));
  assert.ok(a.userData.rock.innerRadius > 0); assert.ok(a.userData.rock.innerRadius < a.userData.rock.outerRadius);
  [a, b, other].forEach(g => g.dispose());
});

test('PBR asteroid textures contain mineral variation, roughness and actual normal relief', () => {
  const textures = createAsteroidTextures(64);
  assert.equal(textures.map.colorSpace, THREE.SRGBColorSpace);
  assert.equal(textures.normalMap.colorSpace, THREE.NoColorSpace);
  assert.ok(new Set(textures.map.image.data).size > 40);
  assert.ok(new Set(textures.roughnessMap.image.data).size > 20);
  assert.ok(textures.normalMap.image.data.some((value, i) => i % 4 < 2 && Math.abs(value - 128) > 10));
  Object.values(textures).forEach(t => t.dispose());
});

test('all solid rocks have stable visible mesh centers and conservative bounded colliders with a safe initial corridor', () => {
  const field = createAsteroidField(new THREE.Scene());
  assert.equal(field.colliders.length, ASTEROID_FIELD.count);
  assert.equal(new Set(field.colliders.map(c => c.id)).size, ASTEROID_FIELD.count);
  for (const [index, collider] of field.colliders.entries()) {
    assert.equal(collider.center, field.rocks[index].lod.position);
    assert.ok(collider.radius > 0 && collider.radius < collider.surfaceRadius);
    assert.ok(collider.center.length() - collider.surfaceRadius > ASTEROID_FIELD.safeRadius);
    assert.ok(Math.hypot(collider.center.x, collider.center.y) - collider.surfaceRadius >= 39);
  }
  const before = field.colliders.map(c => c.center.toArray());
  field.update(new THREE.Vector3(20, 8, -100));
  assert.deepEqual(field.colliders.map(c => c.center.toArray()), before, 'nearby geometry must not follow the camera/player');
  assert.deepEqual(field.root.position.toArray(), [0, 0, 0]); field.dispose();
});

test('field recycling is bounded and cannot spawn inside the pilot; reset is deterministic', () => {
  const field = createAsteroidField(new THREE.Scene()), second = createAsteroidField(new THREE.Scene());
  const initial = field.colliders.map(c => c.center.toArray());
  assert.deepEqual(initial, second.colliders.map(c => c.center.toArray()));
  const pilot = new THREE.Vector3(5000, -200, 6000);
  field.update(pilot); second.update(pilot);
  for (const collider of field.colliders) assert.ok(collider.center.distanceTo(pilot) - collider.surfaceRadius > 800);
  assert.deepEqual(field.colliders.map(c => c.center.toArray()), second.colliders.map(c => c.center.toArray()));
  assert.equal(field.colliders.length, 24); assert.equal(field.snapshot().distantFragments, 640);
  field.reset(); assert.deepEqual(field.colliders.map(c => c.center.toArray()), initial);
  field.dispose(); second.dispose();
});

test('LOD and fragment triangle workload stays explicitly bounded and snapshots cannot mutate the field', () => {
  const field = createAsteroidField(new THREE.Scene()), report = field.snapshot();
  assert.equal(report.maxHeroHighTriangles, 21160);
  assert.equal(report.mediumTrianglesPerRock, 980); assert.equal(report.lowTrianglesPerRock, 180);
  assert.equal(report.distantTriangles, 12800);
  report.colliders[0].center[0] = 999999;
  assert.notEqual(field.snapshot().colliders[0].center[0], 999999);
  assert.equal(field.rocks.filter(r => r.lod.levels.some(level => level.object.geometry.userData.rock.detail === 22)).length, 2);
  field.dispose();
});

test('environment keeps solid asteroids in world space independently of sky parallax', () => {
  const scene = new THREE.Scene(), loader = { load() { return new THREE.Texture(); } };
  const environment = createEnvironment(scene, loader);
  const before = environment.asteroids.colliders.map(c => c.center.toArray());
  environment.update(new THREE.Vector3(0, 0, -150));
  assert.deepEqual(environment.asteroids.colliders.map(c => c.center.toArray()), before);
  environment.reset(); assert.deepEqual(environment.asteroids.colliders.map(c => c.center.toArray()), before);
  environment.dispose();
});

test('asteroid field disposal releases each shared geometry/material/texture once and is idempotent', () => {
  const scene = new THREE.Scene(), field = createAsteroidField(scene), geometries = new Set(), materials = new Set(), textures = new Set();
  field.root.traverse(o => {
    if (o.geometry) geometries.add(o.geometry);
    if (o.material) { materials.add(o.material); for (const value of Object.values(o.material)) if (value?.isTexture) textures.add(value); }
  });
  let releasedGeometry = 0, releasedMaterial = 0, releasedTexture = 0;
  geometries.forEach(g => g.addEventListener('dispose', () => releasedGeometry++));
  materials.forEach(m => m.addEventListener('dispose', () => releasedMaterial++));
  textures.forEach(t => t.addEventListener('dispose', () => releasedTexture++));
  field.dispose(); field.dispose();
  assert.equal(releasedGeometry, geometries.size); assert.equal(releasedMaterial, materials.size); assert.equal(releasedTexture, textures.size);
  assert.equal(field.root.parent, null);
});
