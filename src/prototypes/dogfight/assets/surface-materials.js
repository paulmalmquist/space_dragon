import * as THREE from 'three';

// Runtime-authored detail only: original glTF meshes, UVs, skin and maps remain
// intact. No reference photographs or external texture service are involved.
const fract = value => value - Math.floor(value);
const noise = (x, y, seed) => fract(Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123);
const clamp = THREE.MathUtils.clamp;

export function createSurfaceDetail(kind, size = kind === 'scales' ? 256 : 128) {
  const heights = new Float32Array(size * size);
  const roughness = new Uint8Array(size * size * 4);
  const normal = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const grain = noise(x, y, 13);
    let height, rough;
    if (kind === 'scales') {
      const row = Math.floor(y / 20), sx = fract(x / 22 + (row % 2) * .5) * 2 - 1;
      const sy = fract(y / 20) * 2 - 1, radius = Math.sqrt(sx * sx + sy * sy * .72);
      const plate = Math.pow(Math.max(0, 1 - radius), .45);
      height = .22 + plate * .58 + Math.exp(-sx * sx * 32) * plate * .08 + (grain - .5) * .055;
      rough = .73 + grain * .16 - plate * .10;
    } else if (kind === 'membrane') {
      const fibre = Math.sin(x * .47 + Math.sin(y * .11) * 1.8) * .028;
      const vein = Math.pow(Math.max(0, Math.cos(x * .13 + y * .045)), 22) * .075;
      height = .5 + fibre + vein + (grain - .5) * .025;
      rough = .76 + grain * .17;
    } else {
      const brush = noise(0, y, 31) * .026 + Math.sin(y * 2.4) * .008;
      const seam = x % 64 < 1 || y % 64 < 1 ? -.045 : 0;
      height = .5 + brush + seam + (grain - .5) * .009;
      rough = .66 + noise(0, y, 4) * .17 + grain * .08;
    }
    heights[y * size + x] = height;
    const index = (y * size + x) * 4, value = Math.round(clamp(rough, 0, 1) * 255);
    roughness.set([value, value, value, 255], index);
  }
  const strength = kind === 'scales' ? 2.8 : kind === 'membrane' ? 2.2 : 1.4;
  const sample = (x, y) => heights[((y + size) % size) * size + (x + size) % size];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (sample(x + 1, y) - sample(x - 1, y)) * strength;
    const dy = (sample(x, y + 1) - sample(x, y - 1)) * strength;
    const length = Math.sqrt(dx * dx + dy * dy + 1), index = (y * size + x) * 4;
    normal.set([Math.round((-.5 * dx / length + .5) * 255), Math.round((-.5 * dy / length + .5) * 255), Math.round((.5 / length + .5) * 255), 255], index);
  }
  const texture = (pixels, suffix) => {
    const map = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
    map.name = `authored-${kind}-${suffix}`; map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.magFilter = THREE.LinearFilter; map.minFilter = THREE.LinearMipmapLinearFilter;
    map.generateMipmaps = true; map.repeat.set(kind === 'scales' ? 2 : 3, kind === 'metal' ? 3 : 2);
    map.needsUpdate = true; return map;
  };
  return { normal: texture(normal, 'normal'), roughness: texture(roughness, 'roughness') };
}

export function refineModelMaterials(model, details, kind = 'dragon') {
  if (!['dragon', 'mechanical', 'drone'].includes(kind)) throw new RangeError(`Unknown surface treatment: ${kind}`);
  const replacements = new Map();
  // A shared material may span meshes with different UV coverage after export.
  // Only add UV detail when every user can display it; never replace author maps.
  const uvCoverage = new Map();
  if (kind === 'mechanical') model.traverse(object => {
    if (!object.isMesh) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      uvCoverage.set(material, (uvCoverage.get(material) ?? true) && Boolean(object.geometry?.getAttribute('uv')));
    }
  });
  model.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = true; object.receiveShadow = true;
    const convert = original => {
      if (replacements.has(original)) return replacements.get(original);
      if (kind === 'mechanical') {
        // glTF PBR values are the source of truth for the mechanical candidate.
        // Keep Physical extensions, emission strengths, textures and sidedness.
        const material = original.clone();
        const emitting = material.emissiveIntensity > 0 && material.emissive &&
          material.emissive.r + material.emissive.g + material.emissive.b > 0;
        // Authored benchmark surfaces may intentionally be smooth. Do not add
        // procedural grain merely because that material has no normal map.
        const authoredSurface = material.userData.authoredSurface === true;
        let detailKind = material.normalMap ? 'imported' : authoredSurface ? 'authored-smooth' : 'none';
        if (material.isMeshStandardMaterial && !authoredSurface && !material.normalMap && !emitting && uvCoverage.get(original)) {
          const composite = /composite wing/i.test(material.name);
          const detail = composite ? details.membrane : details.metal;
          if (detail?.normal) {
            material.normalMap = detail.normal;
            material.normalScale.set(composite ? .10 : .12, composite ? .10 : .12);
            detailKind = composite ? 'membrane' : 'metal';
          }
        }
        material.userData.surfacePass = 'dogfight-mechanical-v3';
        material.userData.runtimeDetailKind = detailKind;
        replacements.set(original, material); return material;
      }
      const material = new THREE.MeshPhysicalMaterial();
      THREE.MeshStandardMaterial.prototype.copy.call(material, original);
      material.defines = { STANDARD: '', PHYSICAL: '' };
      material.name = original.name; material.envMapIntensity = .8;
      material.metalness = 0; material.roughness = .68;
      material.clearcoat = .08; material.clearcoatRoughness = .55;
      const name = material.name.toLowerCase();
      let detail = details.scales;
      if (kind === 'drone') {
        detail = details.metal;
        material.color.set(name.includes('silver') ? 0x9ca4ad : name.includes('black') ? 0x1c222a : 0x515d69);
        material.metalness = name.includes('black') ? .45 : .82;
        material.roughness = name.includes('silver') ? .36 : .5;
        material.clearcoat = name.includes('ceramic') ? .18 : .04;
        material.normalScale.set(.3, .3);
        if (name.includes('reactor')) {
          material.color.set(0xb7521c); material.emissive.set(0xff7629);
          material.emissiveIntensity = 1.3; material.metalness = .25; material.roughness = .3;
        }
      } else if (name.includes('membrane')) {
        detail = details.membrane; material.color.set(0x675064); material.roughness = .76;
        material.sheen = .35; material.sheenColor.set(0x8d7183); material.sheenRoughness = .8;
        material.clearcoat = .025; material.normalScale.set(.65, .65);
      } else if (name.includes('ribs')) {
        detail = details.membrane; material.color.set(0x332735); material.roughness = .72;
        material.normalScale.set(.4, .4);
      } else if (name.includes('horn')) {
        detail = details.membrane; material.color.set(0xc3b6a1); material.roughness = .46;
        material.normalScale.set(.18, .18); material.clearcoat = .12;
      } else if (name.includes('eyes')) {
        material.color.set(0x9186a5); material.emissive.set(0x9575b6);
        material.emissiveIntensity = 1.15; material.roughness = .22; material.clearcoat = .3;
        detail = null;
      } else if (name.includes('belly')) {
        material.color.set(0x9a8193); material.roughness = .7; material.normalScale.set(.45, .45);
      } else {
        // Existing scale albedo remains recognizable, with a restrained finish.
        material.color.set(0xd3c6cf); material.roughness = .76; material.normalScale.set(.8, .8);
      }
      if (detail) { material.normalMap = detail.normal; material.roughnessMap = detail.roughness; }
      material.userData.surfacePass = 'dogfight-material-v1';
      replacements.set(original, material); return material;
    };
    object.material = Array.isArray(object.material) ? object.material.map(convert) : convert(object.material);
  });
  return replacements;
}

export function describeMechanicalMaterials(replacements) {
  const texture = map => map ? Object.freeze({ name: map.name, channel: map.channel,
    colorSpace: map.colorSpace,
    size: Object.freeze([map.image?.width ?? null, map.image?.height ?? null]) }) : null;
  return Object.freeze([...replacements.values()].map(material => Object.freeze({
    name: material.name,
    color: Object.freeze(material.color.toArray()),
    metalness: material.metalness, roughness: material.roughness,
    emissive: Object.freeze(material.emissive?.toArray() || [0, 0, 0]),
    emissiveIntensity: material.emissiveIntensity ?? 0,
    opacity: material.opacity, side: material.side,
    normalDetail: material.userData.runtimeDetailKind,
    authoredSurface: material.userData.authoredSurface === true,
    occlusionStrength: material.aoMapIntensity,
    textures: Object.freeze({ baseColor: texture(material.map), normal: texture(material.normalMap),
      occlusion: texture(material.aoMap), roughness: texture(material.roughnessMap),
      metallic: texture(material.metalnessMap), emission: texture(material.emissiveMap) }),
  })));
}

function studioEnvironment(renderer) {
  const lighting = new THREE.Scene(); lighting.background = new THREE.Color(.008, .01, .016);
  const geometry = new THREE.PlaneGeometry(1, 1), materials = [];
  const panel = (position, scale, color) => {
    const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }); materials.push(material);
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...position); mesh.scale.set(...scale, 1);
    mesh.lookAt(0, 0, 0); lighting.add(mesh);
  };
  panel([-6, 8, -4], [8, 5], new THREE.Color(3.4, 3.2, 3.0));
  panel([7, 1, 5], [3, 7], new THREE.Color(1.2, 1.55, 2.1));
  panel([-3, -4, 4], [5, 2], new THREE.Color(.6, .44, .3));
  const generator = new THREE.PMREMGenerator(renderer);
  const result = generator.fromScene(lighting, .07, .1, 30, { size: 128 });
  generator.dispose(); geometry.dispose(); materials.forEach(material => material.dispose());
  return result;
}

export function prepareCombatMaterials(renderer, scene, dragon, drone, { dragonKind = 'dragon' } = {}) {
  if (!['dragon', 'mechanical'].includes(dragonKind)) throw new RangeError(`Unknown dragon surface treatment: ${dragonKind}`);
  const details = { ...(dragonKind === 'dragon' ? { scales: createSurfaceDetail('scales') } : {}),
    membrane: createSurfaceDetail('membrane'), metal: createSurfaceDetail('metal') };
  const dragonMaterials = refineModelMaterials(dragon, details, dragonKind);
  const droneMaterials = refineModelMaterials(drone, details, 'drone');
  const oldEnvironment = scene.environment, oldIntensity = scene.environmentIntensity;
  const reflection = studioEnvironment(renderer); scene.environment = reflection.texture; scene.environmentIntensity = .65;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const ownedMaterials = new Set([...dragonMaterials.values(), ...droneMaterials.values()]);
  const ownedTextures = new Set([reflection.texture, ...Object.values(details).flatMap(detail => [detail.normal, detail.roughness])]);
  let disposed = false;
  return {
    reflectionTarget: reflection,
    ownedMaterials, ownedTextures,
    report: { dragonKind, dragonMaterials: dragonMaterials.size, droneMaterials: droneMaterials.size, proceduralTextureCount: Object.values(details).length * 2,
      reflectionSize: 128,
      finish: dragonKind === 'mechanical' ? 'source mechanical PBR with restrained UV metal/composite normal detail' : 'scale relief, fibrous membranes, ivory and brushed metal',
      geometryReauthored: false, materialPassOnly: true,
      mechanicalMaterials: dragonKind === 'mechanical' ? describeMechanicalMaterials(dragonMaterials) : Object.freeze([]) },
    dispose() {
      if (disposed) return; disposed = true;
      if (scene.environment === reflection.texture) { scene.environment = oldEnvironment; scene.environmentIntensity = oldIntensity; }
      reflection.dispose();
      for (const detail of Object.values(details)) { detail.normal.dispose(); detail.roughness.dispose(); }
      for (const map of [dragonMaterials, droneMaterials]) for (const [original, material] of map) { original.dispose(); material.dispose(); }
    },
  };
}
