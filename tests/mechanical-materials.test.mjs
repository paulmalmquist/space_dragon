import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSurfaceDetail, refineModelMaterials, describeMechanicalMaterials, prepareCombatMaterials } from '../src/prototypes/dogfight/assets/surface-materials.js';

const sourcePalette = [
  ['Petrol blue armor', [.035, .125, .19], .78, .31],
  ['Machined titanium', [.27, .34, .37], .9, .25],
  ['Graphite mechanisms', [.022, .031, .037], .82, .35],
  ['Oxide red armor', [.32, .047, .027], .64, .4],
  ['Red composite wing panels', [.19, .027, .024], .36, .48],
  ['Heat stained bronze', [.3, .15, .055], .82, .3],
  ['Amber reactor light', [1, .095, .008], .2, .23, 5],
  ['Eye hot core', [1, .55, .12], .1, .23, 9],
];
function materialFrom([name, color, metalness, roughness, emission = 0]) {
  const material = new THREE.MeshStandardMaterial({ metalness, roughness });
  material.name = `SDM_${name}`; material.color.setRGB(...color);
  if (emission) { material.emissive.copy(material.color); material.emissiveIntensity = emission; }
  return material;
}
function detailSet() { return { scales: createSurfaceDetail('scales', 16), membrane: createSurfaceDetail('membrane', 16), metal: createSurfaceDetail('metal', 16) }; }
function dispose(details, replacements, geometries = []) {
  for (const [original, material] of replacements) { original.dispose(); material.dispose(); }
  for (const detail of Object.values(details)) { detail.normal.dispose(); detail.roughness.dispose(); }
  geometries.forEach(geometry => geometry.dispose());
}

test('mechanical treatment preserves the eight author PBR colors, metals and orange emission', () => {
  const details = detailSet(), model = new THREE.Group(), geometry = new THREE.BoxGeometry();
  const originals = sourcePalette.map(materialFrom);
  for (const original of originals) model.add(new THREE.Mesh(geometry, original));
  const before = originals.map(material => ({ color: material.color.toArray(), metalness: material.metalness, roughness: material.roughness,
    emissive: material.emissive.toArray(), intensity: material.emissiveIntensity, normal: material.normalMap }));
  const replacements = refineModelMaterials(model, details, 'mechanical');
  assert.equal(replacements.size, 8);
  model.children.forEach((mesh, index) => {
    const actual = mesh.material, expected = before[index];
    assert.notEqual(actual, originals[index]); assert.equal(actual.name, originals[index].name);
    assert.deepEqual(actual.color.toArray(), expected.color); assert.equal(actual.metalness, expected.metalness);
    assert.equal(actual.roughness, expected.roughness); assert.deepEqual(actual.emissive.toArray(), expected.emissive);
    assert.equal(actual.emissiveIntensity, expected.intensity); assert.equal(mesh.geometry, geometry);
    assert.equal(originals[index].normalMap, expected.normal);
    if (index >= 6) assert.equal(actual.normalMap, null);
  });
  assert.equal(model.children[0].material.normalMap, details.metal.normal);
  assert.equal(model.children[4].material.normalMap, details.membrane.normal);
  // Runtime roughness is not multiplied by a new map or recolored purple.
  assert.equal(model.children[0].material.roughnessMap, null);
  assert.equal(model.children[0].material.normalScale.x, .12);
  dispose(details, replacements, [geometry]);
});

test('the authored red game palette keeps crimson hardware and orange eyes without runtime recoloring', () => {
  const details = detailSet(), model = new THREE.Group(), geometry = new THREE.BoxGeometry();
  const redColors = [[.38, .018, .012], [.28, .025, .018], [.075, .003, .004], [.32, .047, .027], [.19, .027, .024], [.21, .012, .01]];
  const originals = sourcePalette.map((entry, index) => materialFrom(index < 6 ? [entry[0], redColors[index], ...entry.slice(2)] : entry));
  originals.forEach(original => model.add(new THREE.Mesh(geometry, original)));
  const replacements = refineModelMaterials(model, details, 'mechanical');
  const report = describeMechanicalMaterials(replacements);
  model.children.forEach((mesh, index) => {
    assert.deepEqual(mesh.material.color.toArray(), originals[index].color.toArray());
    assert.equal(mesh.material.metalness, originals[index].metalness);
    assert.equal(mesh.material.roughness, originals[index].roughness);
    assert.deepEqual(report[index].color, originals[index].color.toArray());
    if (index < 6) assert.ok(mesh.material.color.r > mesh.material.color.g * 5 && mesh.material.color.r > mesh.material.color.b * 5);
  });
  assert.deepEqual(model.children[6].material.emissive.toArray(), [1, .095, .008]);
  assert.equal(model.children[6].material.emissiveIntensity, 5);
  assert.deepEqual(model.children[7].material.emissive.toArray(), [1, .55, .12]);
  assert.equal(model.children[7].material.emissiveIntensity, 9);
  dispose(details, replacements, [geometry]);
});

test('imported texture, Physical extensions and author normal scale survive mechanical refinement', () => {
  const details = detailSet(), geometry = new THREE.BoxGeometry(), model = new THREE.Group();
  const map = new THREE.Texture(), normal = new THREE.Texture(), roughness = new THREE.Texture(), emission = new THREE.Texture();
  const original = new THREE.MeshPhysicalMaterial({ map, normalMap: normal, roughnessMap: roughness, emissiveMap: emission,
    clearcoat: .37, clearcoatRoughness: .21, transmission: .14, opacity: .8, transparent: true, side: THREE.DoubleSide });
  original.name = 'SDM_Petrol blue armor'; original.normalScale.set(.27, .31);
  model.add(new THREE.Mesh(geometry, original));
  const replacements = refineModelMaterials(model, details, 'mechanical'), refined = model.children[0].material;
  assert.equal(refined.isMeshPhysicalMaterial, true);
  assert.equal(refined.map, map); assert.equal(refined.normalMap, normal); assert.equal(refined.roughnessMap, roughness); assert.equal(refined.emissiveMap, emission);
  for (const key of ['clearcoat', 'clearcoatRoughness', 'transmission', 'opacity', 'transparent', 'side']) assert.equal(refined[key], original[key]);
  assert.deepEqual(refined.normalScale.toArray(), [.27, .31]); assert.equal(refined.userData.runtimeDetailKind, 'imported');
  dispose(details, replacements, [geometry]); [map, normal, roughness, emission].forEach(texture => texture.dispose());
});

test('baked benchmark keeps separate AO, linear data maps and intentionally quiet painted surfaces', () => {
  const details = detailSet(), geometry = new THREE.BoxGeometry(), model = new THREE.Group();
  const base = new THREE.Texture(), ao = new THREE.Texture(), normal = new THREE.Texture(), orm = new THREE.Texture();
  base.name = 'benchmark-base'; base.colorSpace = THREE.SRGBColorSpace;
  ao.name = 'benchmark-ao'; ao.channel = 0; ao.image = { width: 1024, height: 1024 };
  normal.name = 'benchmark-normal'; orm.name = 'benchmark-roughness-metallic';
  const original = new THREE.MeshStandardMaterial({ map: base, aoMap: ao, aoMapIntensity: .75,
    normalMap: normal, roughnessMap: orm, metalnessMap: orm, metalness: .03, roughness: .44 });
  original.name = 'SDC_Dark painted armor'; original.userData.authoredSurface = true;
  const quiet = new THREE.MeshStandardMaterial({ roughness: .5, metalness: .02 });
  quiet.name = 'SDC_Quiet crimson paint'; quiet.userData.authoredSurface = true;
  model.add(new THREE.Mesh(geometry, original), new THREE.Mesh(geometry, quiet));
  const replacements = refineModelMaterials(model, details, 'mechanical');
  const baked = replacements.get(original), clean = replacements.get(quiet);
  for (const key of ['map', 'aoMap', 'normalMap', 'roughnessMap', 'metalnessMap']) assert.equal(baked[key], original[key]);
  assert.notEqual(baked.aoMap, baked.map); assert.equal(baked.aoMapIntensity, .75);
  assert.equal(baked.map.colorSpace, THREE.SRGBColorSpace); assert.equal(baked.aoMap.colorSpace, THREE.NoColorSpace);
  assert.equal(baked.aoMap.channel, 0); assert.equal(baked.metalness, .03);
  assert.equal(clean.normalMap, null, 'authored quiet surfaces must not acquire blanket metal noise');
  const report = describeMechanicalMaterials(replacements);
  assert.equal(report[0].textures.occlusion.name, 'benchmark-ao');
  assert.deepEqual(report[0].textures.occlusion.size, [1024, 1024]);
  assert.equal(report[0].textures.baseColor.name, 'benchmark-base');
  assert.equal(report[0].authoredSurface, true); assert.equal(report[1].normalDetail, 'authored-smooth');
  assert.equal(Object.isFrozen(report[0].textures), true);
  dispose(details, replacements, [geometry]); [base, ao, normal, orm].forEach(texture => texture.dispose());
});

test('mixed UV coverage shares one material without assigning invalid UV detail or altering component transforms', () => {
  const details = detailSet(), model = new THREE.Group(), geometry = new THREE.BoxGeometry(), unmapped = geometry.clone(); unmapped.deleteAttribute('uv');
  const original = materialFrom(sourcePalette[0]);
  for (let i = 0; i < 36; i++) {
    const mesh = new THREE.Mesh(i ? geometry : unmapped, original);
    mesh.name = `preserved_component_${i}`; mesh.position.set(i, .3, -i); mesh.updateMatrix(); model.add(mesh);
  }
  const before = model.children.map(mesh => ({ name: mesh.name, matrix: mesh.matrix.toArray() }));
  const replacements = refineModelMaterials(model, details, 'mechanical'); assert.equal(replacements.size, 1);
  const refined = replacements.get(original); assert.equal(refined.normalMap, null);
  model.children.forEach((mesh, index) => {
    assert.equal(mesh.material, refined); assert.deepEqual(mesh.matrix.toArray(), before[index].matrix); assert.equal(mesh.name, before[index].name);
    assert.equal(mesh.castShadow, true); assert.equal(mesh.receiveShadow, true);
  });
  dispose(details, replacements, [geometry, unmapped]);
});

test('mechanical palette diagnostics are immutable snapshots with authored eye brightness', () => {
  const details = detailSet(), geometry = new THREE.BoxGeometry(), model = new THREE.Group();
  model.add(new THREE.Mesh(geometry, materialFrom(sourcePalette[6])), new THREE.Mesh(geometry, materialFrom(sourcePalette[7])));
  const replacements = refineModelMaterials(model, details, 'mechanical'), report = describeMechanicalMaterials(replacements);
  assert.equal(report.length, 2); assert.equal(report[0].emissiveIntensity, 5); assert.equal(report[1].emissiveIntensity, 9);
  assert.deepEqual(report[0].emissive, [1, .095, .008]); assert.deepEqual(report[1].emissive, [1, .55, .12]);
  assert.equal(Object.isFrozen(report), true); assert.equal(Object.isFrozen(report[0]), true); assert.equal(Object.isFrozen(report[0].color), true);
  assert.throws(() => { report[0].color[0] = 0; }, TypeError);
  assert.equal(model.children[0].material.color.r, 1);
  dispose(details, replacements, [geometry]);
});

test('unknown material mode fails before allocating a rendering pass; legacy and drone branches remain available', () => {
  assert.throws(() => prepareCombatMaterials(null, null, null, null, { dragonKind: 'mechanicla' }), RangeError);
  const model = new THREE.Group(), details = detailSet(), geometry = new THREE.BoxGeometry(), original = new THREE.MeshStandardMaterial();
  original.name = 'Iridescent violet wing membrane'; model.add(new THREE.Mesh(geometry, original));
  assert.throws(() => refineModelMaterials(model, details, 'unknown'), RangeError);
  const replacements = refineModelMaterials(model, details);
  assert.equal(model.children[0].material.normalMap, details.membrane.normal); assert.ok(model.children[0].material.sheen > 0);
  dispose(details, replacements, [geometry]);
});
