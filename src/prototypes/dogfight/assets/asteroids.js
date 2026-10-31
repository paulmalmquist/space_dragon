import * as THREE from 'three';

// Original runtime-authored rocks. These are solid meshes with conservative
// world colliders, not scans or billboard sprites. The distant grit is scenery.
export const ASTEROID_FIELD = Object.freeze({ seed: 0x5d054, count: 24, fragments: 640, recycleDistance: 2200, safeRadius: 220 });
export const seededRandom = seed => {
  let state = seed >>> 0;
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
};
const clamp = THREE.MathUtils.clamp;
const hash = (x, y, z, seed = 0) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2147483647) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const smooth = t => t * t * (3 - 2 * t);
function noise(x, y, z, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), u = smooth(x - ix), v = smooth(y - iy), w = smooth(z - iz);
  const lerp = THREE.MathUtils.lerp;
  return lerp(lerp(lerp(hash(ix, iy, iz, seed), hash(ix + 1, iy, iz, seed), u), lerp(hash(ix, iy + 1, iz, seed), hash(ix + 1, iy + 1, iz, seed), u), v),
    lerp(lerp(hash(ix, iy, iz + 1, seed), hash(ix + 1, iy, iz + 1, seed), u), lerp(hash(ix, iy + 1, iz + 1, seed), hash(ix + 1, iy + 1, iz + 1, seed), u), v), w);
}

export function createAsteroidGeometry(seed, detail = 6) {
  const rng = seededRandom(seed), geometry = new THREE.IcosahedronGeometry(1, detail);
  const craters = Array.from({ length: 14 }, () => ({ direction: new THREE.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize(), size: .10 + rng() * .22, depth: .055 + rng() * .13 }));
  const fractures = Array.from({ length: 14 }, () => ({ normal: new THREE.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize(), limit: .68 + rng() * .36 }));
  const axis = new THREE.Vector3(1.03 + rng() * .26, .70 + rng() * .24, .84 + rng() * .22);
  const position = geometry.attributes.position, colors = [], cuts = [], direction = new THREE.Vector3(), p = new THREE.Vector3();
  let innerRadius = Infinity, outerRadius = 0;
  for (let i = 0; i < position.count; i++) {
    direction.fromBufferAttribute(position, i).normalize();
    const x = direction.x + 2.13, y = direction.y - 1.7, z = direction.z + .59;
    const broad = noise(x * 2.4, y * 2.4, z * 2.4, seed) - .5;
    const ridged = 1 - Math.abs(noise(x * 6.2, y * 6.2, z * 6.2, seed + 7) * 2 - 1);
    const chips = noise(x * 17, y * 17, z * 17, seed + 13) - .5;
    let radius = 1.03 + broad * .35 + (ridged - .55) * .21 + chips * .045;
    let craterShade = 0;
    for (const crater of craters) {
      const distance = Math.acos(clamp(direction.dot(crater.direction), -1, 1)) / crater.size;
      const bowl = Math.exp(-distance * distance * 2.4), rim = Math.exp(-Math.pow((distance - .97) * 6.2, 2));
      radius += -crater.depth * bowl + crater.depth * .28 * rim;
      craterShade += bowl * .15;
    }
    p.copy(direction).multiply(axis);
    let cut = -1;
    for (let j = 0; j < fractures.length; j++) {
      const fracture = fractures[j], denominator = p.dot(fracture.normal);
      if (denominator > 0 && fracture.limit / denominator < radius) { radius = fracture.limit / denominator; cut = j; }
    }
    p.multiplyScalar(radius); if (p.length() > 1.33) p.setLength(1.33); cuts.push(cut);
    position.setXYZ(i, p.x, p.y, p.z);
    const length = p.length(); innerRadius = Math.min(innerRadius, length); outerRadius = Math.max(outerRadius, length);
    const mineral = noise(p.x * 7 + 1, p.y * 7, p.z * 7, seed + 31);
    const shade = clamp(.71 + broad * .36 + mineral * .22 - craterShade, .38, 1.08);
    colors.push(shade * .96, shade, shade * 1.02);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  // Blend normals only at matching positions. Fracture-plane relief remains
  // geometric; micro-pits come from the material normal rather than more tris.
  geometry.computeVertexNormals();
  const averaged = new Map(), normal = geometry.attributes.normal;
  for (let i = 0; i < position.count; i++) {
    const key = `${position.getX(i).toFixed(5)},${position.getY(i).toFixed(5)},${position.getZ(i).toFixed(5)}`;
    const value = averaged.get(key) || new THREE.Vector3(); value.add(new THREE.Vector3().fromBufferAttribute(normal, i)); averaged.set(key, value);
  }
  for (let i = 0; i < position.count; i++) {
    const key = `${position.getX(i).toFixed(5)},${position.getY(i).toFixed(5)},${position.getZ(i).toFixed(5)}`;
    const value = averaged.get(key).normalize(); normal.setXYZ(i, value.x, value.y, value.z);
  }
  // Keep the large freshly broken faces flat instead of smoothing them into
  // rubbery lobes. Bowl walls and chipped transition edges retain fine relief.
  for (let i = 0; i < position.count; i += 3) if (cuts[i] >= 0 && cuts[i] === cuts[i + 1] && cuts[i] === cuts[i + 2]) {
    const n = fractures[cuts[i]].normal;
    for (let k = 0; k < 3; k++) normal.setXYZ(i + k, n.x, n.y, n.z);
  }
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  geometry.userData.rock = { seed, detail, triangles: position.count / 3, innerRadius: innerRadius * .82, outerRadius, craters: craters.length, fracturePlanes: fractures.length };
  return geometry;
}

export function createAsteroidTextures(size = 256) {
  const color = new Uint8Array(size * size * 4), roughness = new Uint8Array(size * size * 4), normal = new Uint8Array(size * size * 4), height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    // Irregular mineral/grit variation, without repeated wavy bands.
    const stone = noise(x / size * 8 + 7, y / size * 8 - 3, 1.7, 61);
    const seams = noise(x / size * 23, y / size * 23, 3.1, 73);
    const seam = Math.abs(seams - .5) < .025 ? -.13 : 0;
    const grit = hash(x, y, 0, 0x5354), pit = grit > .975 ? -.21 : 0;
    height[y * size + x] = stone + (grit - .5) * .12 + seam + pit;
    const i = (y * size + x) * 4, value = clamp(72 + stone * 47 + (grit - .5) * 23 + seam * 80, 42, 137);
    color.set([value * .97, value, value * 1.025, 255], i);
    const r = clamp(230 + grit * 25 - pit * 25, 0, 255); roughness.set([r, r, r, 255], i);
  }
  const sample = (x, y) => height[((y + size) % size) * size + (x + size) % size];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (sample(x + 1, y) - sample(x - 1, y)) * 1.65, dy = (sample(x, y + 1) - sample(x, y - 1)) * 1.65;
    const length = Math.sqrt(dx * dx + dy * dy + 1), i = (y * size + x) * 4;
    normal.set([128 - dx / length * 127, 128 - dy / length * 127, 128 + 127 / length, 255], i);
  }
  const make = (pixels, name, srgb = false) => {
    const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat); texture.name = `original-asteroid-${name}-v001`;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(4, 4); texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter; texture.anisotropy = 4;
    if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true; return texture;
  };
  return { map: make(color, 'mineral-albedo', true), roughnessMap: make(roughness, 'roughness'), normalMap: make(normal, 'pitted-normal') };
}

export function createPlanetTexture(width = 512, height = 256) {
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const longitude = x / width * Math.PI * 2, latitude = y / height * Math.PI - Math.PI / 2;
    const nx = Math.cos(longitude) * Math.cos(latitude), ny = Math.sin(latitude), nz = Math.sin(longitude) * Math.cos(latitude);
    const continent = noise(nx * 3.5 + 4, ny * 3.5 - 1, nz * 3.5 + 7, 277) * .65 + noise(nx * 8, ny * 8, nz * 8, 283) * .35;
    const terrain = noise(nx * 32, ny * 32, nz * 32, 307);
    const clouds = Math.pow(clamp((noise(nx * 10 + .7, ny * 10, nz * 10, 331) * .7 + noise(nx * 27, ny * 27, nz * 27, 337) * .3 - .49) * 3.2, 0, 1), 1.25);
    const land = continent > .49;
    const color = land ? [63 + terrain * 55, 61 + terrain * 49, 48 + terrain * 43] : [19 + terrain * 12, 40 + terrain * 19, 53 + terrain * 28];
    const ice = clamp((Math.abs(ny) - .88) * 6, 0, 1), haze = Math.max(clouds * .8, ice);
    const i = (y * width + x) * 4;
    pixels.set([color[0] * (1 - haze) + 210 * haze, color[1] * (1 - haze) + 215 * haze, color[2] * (1 - haze) + 216 * haze, 255], i);
  }
  const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat);
  texture.name = 'original-terrain-cloud-planet-v001'; texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping; texture.generateMipmaps = true; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter; texture.needsUpdate = true;
  return texture;
}

function initialLayout(seed) {
  const rng = seededRandom(seed), result = [[76, 26, -310, 27], [-105, -48, -420, 36], [155, 95, -560, 49], [-182, 76, -740, 42], [55, -85, -330, 22], [-62, 68, -620, 28]];
  while (result.length < ASTEROID_FIELD.count) {
    const side = rng() < .5 ? -1 : 1;
    result.push([side * (66 + rng() * 260), (rng() < .5 ? -1 : 1) * (28 + rng() * 175), -480 - rng() * 1250, 18 + rng() * 40]);
  }
  return result;
}

export function createAsteroidField(scene, { seed = ASTEROID_FIELD.seed } = {}) {
  const root = new THREE.Group(); root.name = 'Solid Asteroid Field v001'; scene.add(root);
  const textures = createAsteroidTextures(), material = new THREE.MeshStandardMaterial({ ...textures, roughness: 1, metalness: .015, vertexColors: true, envMapIntensity: .16 });
  material.name = 'Original fractured charcoal silicate PBR v001'; material.normalScale.set(.85, .85);
  const variants = Array.from({ length: 3 }, (_, i) => ({ high: i < 2 ? createAsteroidGeometry(seed + i * 73, 22) : null,
    medium: createAsteroidGeometry(seed + i * 73, 6), low: createAsteroidGeometry(seed + i * 73, 2) }));
  const layout = initialLayout(seed), colliders = [], rocks = [];
  layout.forEach(([x, y, z, scale], index) => {
    const variant = variants[index % variants.length], lod = new THREE.LOD(), rng = seededRandom(seed + index * 119);
    lod.name = `asteroid-${index}`;
    if (variant.high && index < 2) lod.addLevel(new THREE.Mesh(variant.high, material), 0);
    lod.addLevel(new THREE.Mesh(variant.medium, material), variant.high && index < 2 ? 360 : 0);
    lod.addLevel(new THREE.Mesh(variant.low, material), 800);
    lod.position.set(x, y, z); lod.scale.setScalar(scale); lod.rotation.set(rng() * 6, rng() * 6, rng() * 6); root.add(lod);
    for (const level of lod.levels) { level.object.receiveShadow = true; level.object.castShadow = index < 2; }
    const geometries = [variant.high, variant.medium, variant.low].filter(Boolean);
    const radius = Math.min(...geometries.map(g => g.userData.rock.innerRadius)) * scale;
    const surfaceRadius = Math.max(...geometries.map(g => g.userData.rock.outerRadius)) * scale;
    if (Math.hypot(lod.position.x, lod.position.y) < surfaceRadius + 40) lod.position.x = Math.sign(x) * (surfaceRadius + 40);
    const collider = { id: lod.name, center: lod.position, radius, surfaceRadius };
    colliders.push(collider); rocks.push({ lod, collider, initial: lod.position.clone(), generation: 0 });
  });
  const fragmentGeometry = createAsteroidGeometry(seed + 701, 0), fragmentMaterial = material.clone();
  fragmentMaterial.normalMap = null; fragmentMaterial.roughnessMap = null; fragmentMaterial.map = null; fragmentMaterial.roughness = .98; fragmentMaterial.color.setRGB(.20, .21, .22);
  const fragments = new THREE.InstancedMesh(fragmentGeometry, fragmentMaterial, ASTEROID_FIELD.fragments);
  fragments.name = 'Distant noncolliding asteroid fragments'; fragments.frustumCulled = false; root.add(fragments);
  const fragmentRecords = [], matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), scaleVector = new THREE.Vector3(), euler = new THREE.Euler();
  const sampleAround = (origin, rng, minimum, maximum) => {
    const direction = new THREE.Vector3(rng() * 2 - 1, (rng() * 2 - 1) * .65, rng() * 2 - 1).normalize();
    return direction.multiplyScalar(minimum + rng() * (maximum - minimum)).add(origin);
  };
  function setFragment(index, position, rng) {
    const scale = .7 + rng() * 6.2; quaternion.setFromEuler(euler.set(rng() * 6, rng() * 6, rng() * 6)); scaleVector.setScalar(scale);
    matrix.compose(position, quaternion, scaleVector); fragments.setMatrixAt(index, matrix);
  }
  for (let i = 0; i < ASTEROID_FIELD.fragments; i++) {
    const rng = seededRandom(seed + i * 173 + 901), position = sampleAround(new THREE.Vector3(), rng, 1450, 3400);
    fragmentRecords.push({ position, generation: 0 }); setFragment(i, position, rng);
  }
  fragments.instanceMatrix.needsUpdate = true;
  const lastPlayer = new THREE.Vector3(); let disposed = false;
  return {
    colliders, rocks, root,
    update(playerPosition) {
      if (disposed) return;
      lastPlayer.copy(playerPosition);
      for (let index = 0; index < rocks.length; index++) {
        const rock = rocks[index];
        if (rock.collider.center.distanceToSquared(playerPosition) > ASTEROID_FIELD.recycleDistance ** 2) {
          const rng = seededRandom(seed + index * 953 + ++rock.generation * 7777);
          rock.collider.center.copy(sampleAround(playerPosition, rng, 950, 1700));
        }
      }
      let changed = false;
      fragmentRecords.forEach((record, index) => {
        const distance = record.position.distanceToSquared(playerPosition);
        if (distance < 850 ** 2 || distance > 4300 ** 2) {
          const rng = seededRandom(seed + index * 173 + ++record.generation * 31337);
          record.position.copy(sampleAround(playerPosition, rng, 1600, 3300)); setFragment(index, record.position, rng); changed = true;
        }
      });
      if (changed) fragments.instanceMatrix.needsUpdate = true;
    },
    reset() {
      rocks.forEach(rock => { rock.lod.position.copy(rock.initial); rock.generation = 0; });
      fragmentRecords.forEach((record, index) => {
        const rng = seededRandom(seed + index * 173 + 901); record.position.copy(sampleAround(new THREE.Vector3(), rng, 1450, 3400)); record.generation = 0; setFragment(index, record.position, rng);
      });
      fragments.instanceMatrix.needsUpdate = true; lastPlayer.set(0, 0, 0);
    },
    snapshot() {
      return { source: 'original procedural fractured silicate v001', interactive: colliders.length, distantFragments: ASTEROID_FIELD.fragments,
        maxHeroHighTriangles: 2 * variants[0].high.userData.rock.triangles,
        mediumTrianglesPerRock: variants[0].medium.userData.rock.triangles, lowTrianglesPerRock: variants[0].low.userData.rock.triangles,
        distantTriangles: fragmentGeometry.userData.rock.triangles * ASTEROID_FIELD.fragments,
        colliders: [...colliders].sort((a, b) => a.center.distanceToSquared(lastPlayer) - b.center.distanceToSquared(lastPlayer)).slice(0, 6).map(c => ({ id: c.id, center: c.center.toArray(), radius: c.radius, surfaceRadius: c.surfaceRadius })),
        rule: 'world-static until beyond2200m; core colliders inside visible surfaces; distant fragments are noncolliding scenery' };
    },
    dispose() {
      if (disposed) return; disposed = true; scene.remove(root);
      for (const variant of variants) for (const geometry of Object.values(variant)) geometry?.dispose();
      fragmentGeometry.dispose(); fragmentMaterial.dispose(); material.dispose(); Object.values(textures).forEach(t => t.dispose());
    },
  };
}
