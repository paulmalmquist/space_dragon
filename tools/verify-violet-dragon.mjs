// Organic asset validation. This intentionally never compares mechanical rests,
// inverse binds, component counts, proportions, materials or clip sample bytes.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {Matrix4, Vector3} from 'three';
import sharp from 'sharp';

export const VIOLET_BONES = ['Root', 'Neck', 'Head', 'Jaw', 'Wing_L', 'Wing_R',
  'Fore_L', 'Fore_R', 'Hind_L', 'Hind_R', 'Tail_0', 'Tail_1', 'Tail_2', 'Tail_3', 'Tail_4'];
export const VIOLET_SOCKETS = ['muzzle', 'wing_l', 'wing_r', 'thruster_l', 'thruster_r',
  'target', 'camera', 'ground'].map(name => `socket_${name}`);
const hash = data => createHash('sha256').update(data).digest('hex');
const finite = values => Array.from(values).every(Number.isFinite);
const rounded = values => Array.from(values, value => Number(value.toFixed(8)));
const parentOf = name => name === 'Head' ? 'Neck' : name === 'Jaw' ? 'Head'
  : /^Tail_[1-4]$/.test(name) ? `Tail_${Number(name.at(-1)) - 1}` : 'Root';

export function parseEmbeddedGlb(bytes) {
  assert(bytes.length >= 28 && bytes.toString('ascii', 0, 4) === 'glTF', 'Expected GLB');
  assert.equal(bytes.readUInt32LE(4), 2, 'Expected GLB version 2');
  assert.equal(bytes.readUInt32LE(8), bytes.length, 'GLB byte length mismatch');
  let json, binaryChunks = 0;
  for (let offset = 12; offset < bytes.length;) {
    assert(offset + 8 <= bytes.length, 'Truncated chunk header');
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    assert(length % 4 === 0 && offset + 8 + length <= bytes.length, 'Invalid chunk length');
    if (type === 0x4e4f534a) {
      assert(!json && offset === 12, 'Expected one leading JSON chunk');
      json = JSON.parse(bytes.toString('utf8', offset + 8, offset + 8 + length));
    } else if (type === 0x004e4942) binaryChunks++;
    else assert.fail('Unexpected GLB chunk');
    offset += 8 + length;
  }
  assert(json && binaryChunks === 1, 'Expected self-contained JSON/BIN GLB');
  assert.equal(json.buffers?.length, 1);
  assert(!json.buffers[0].uri, 'External mesh buffer is not allowed');
  assert((json.images ?? []).every(image => image.bufferView !== undefined && !image.uri), 'Images must be embedded');
  assert(!(json.extensionsRequired?.length), 'A new required decoder needs separate runtime review');
  return json;
}

/** Structural validation only. expected pins this organic candidate's own identity. */
export async function verifyVioletDragon(candidate, expected = null) {
  const bytes = await readFile(candidate), raw = parseEmbeddedGlb(bytes);
  const metadata = raw.asset?.extras;
  assert.equal(metadata?.assetContractVersion, 2, 'Organic contract metadata required');
  assert.equal(metadata.rigProfile, 'violet-organic-15');
  assert.equal(metadata.forwardAxis, '-Z');
  assert.equal(metadata.upAxis, '+Y');
  assert.equal(metadata.metersPerUnit, 1);
  assert.equal(metadata.authoredPresentation, true, 'Disable generated mechanical overlays for this model');
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const document = await io.readBinary(new Uint8Array(bytes)), root = document.getRoot();
  assert.equal(root.listScenes().length, 1, 'Expected one export scene');
  assert.equal(root.listCameras().length, 0, 'Review cameras must stay in Blender');
  const nodes = root.listNodes(), named = new Map(nodes.map(node => [node.getName(), node]));
  assert(nodes.every(node => node.getName()), 'Exported nodes need stable names');
  assert.equal(named.size, nodes.length, 'Exported node names must be unique');
  assert(!nodes.some(node => /review studio|not for export|first.pass.*preserved|owner.undo|SpaceDragonRig$|original organic/i.test(node.getName())), 'Source/recovery data leaked');
  assert(!nodes.some(node => node.getExtension('KHR_lights_punctual')), 'Review lights must stay in Blender');
  for (const node of nodes) assert(finite(node.getWorldMatrix()), `Non-finite transform: ${node.getName()}`);
  assert.equal(root.listSkins().length, 1, 'Expected the new organic skin only');
  const skin = root.listSkins()[0], joints = skin.listJoints();
  assert.deepEqual(joints.map(node => node.getName()).sort(), [...VIOLET_BONES].sort(), 'Expected the organic 15-bone rig');
  for (const name of VIOLET_BONES.filter(name => name !== 'Root'))
    assert.equal(named.get(name).getParentNode()?.getName(), parentOf(name), `Unexpected bone hierarchy: ${name}`);
  const inverseBind = skin.getInverseBindMatrices();
  assert(inverseBind && inverseBind.getType() === 'MAT4' && inverseBind.getCount() === 15, 'Expected 15 inverse bind matrices');
  const jointMatrices = joints.map((joint, index) => {
    const bind = new Matrix4().fromArray(inverseBind.getElement(index, []));
    assert(finite(bind.elements) && Math.abs(bind.determinant()) > 1e-12, `Invalid inverse bind: ${joint.getName()}`);
    return new Matrix4().fromArray(joint.getWorldMatrix()).multiply(bind);
  });
  // At exported bind pose, all J_world * inverseBind products share the same
  // bind-shape matrix. A freshly changed rig is valid; an inconsistent skin is not.
  let inverseBindResidual = 0;
  for (const matrix of jointMatrices) for (let i = 0; i < 16; i++)
    inverseBindResidual = Math.max(inverseBindResidual, Math.abs(matrix.elements[i] - jointMatrices[0].elements[i]));
  assert(inverseBindResidual < .0005, `Export is not in a consistent rest/bind pose (${inverseBindResidual})`);

  const socketParents = {socket_muzzle: ['Head', 'Jaw'], socket_wing_l: ['Wing_L'], socket_wing_r: ['Wing_R'],
    socket_thruster_l: ['Root'], socket_thruster_r: ['Root'], socket_target: ['Root'], socket_camera: ['Root'], socket_ground: ['Root']};
  const sockets = VIOLET_SOCKETS.map(name => {
    const node = named.get(name); assert(node, `Missing attachment ${name}`);
    const parent = node.getParentNode()?.getName();
    assert(socketParents[name].includes(parent), `${name} must follow ${socketParents[name].join(' or ')}`);
    assert(!node.getMesh(), `${name} must be an attachment transform`);
    return {name, parent, position: rounded(node.getWorldTranslation()), worldMatrix: rounded(node.getWorldMatrix())};
  });
  const muzzle = sockets.find(socket => socket.name === 'socket_muzzle');
  const target = sockets.find(socket => socket.name === 'socket_target');
  assert(muzzle.position[2] < target.position[2], 'Muzzle must face source -Z ahead of the body target');

  let triangles = 0, vertices = 0, primitives = 0, instanceTriangles = 0;
  const bounds = {min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity]};
  const meshTriangles = new Map();
  for (const mesh of root.listMeshes()) {
    let meshCount = 0;
    for (const primitive of mesh.listPrimitives()) {
      assert.equal(primitive.getMode(), 4, 'Game candidate must use triangle primitives');
      primitives++;
      const positions = primitive.getAttribute('POSITION'), normals = primitive.getAttribute('NORMAL');
      const weights = primitive.getAttribute('WEIGHTS_0'), indices = primitive.getAttribute('JOINTS_0');
      assert(positions && normals && weights && indices, `${mesh.getName()}: missing positions/normals/skinning`);
      assert(weights.getCount() === positions.getCount() && normals.getCount() === positions.getCount() && indices.getCount() === positions.getCount());
      assert.equal(weights.getElementSize(), 4); assert.equal(indices.getElementSize(), 4);
      assert(!primitive.getAttribute('JOINTS_1') && !primitive.getAttribute('WEIGHTS_1'), 'More than four influences needs an explicit Unity import policy');
      vertices += positions.getCount();
      const count = primitive.getIndices()?.getCount() ?? positions.getCount();
      assert(count % 3 === 0); meshCount += count / 3;
      if (primitive.getIndices()) for (const index of primitive.getIndices().getArray()) assert(index < positions.getCount());
      for (let i = 0; i < positions.getCount(); i++) {
        const p = positions.getElement(i, []), n = normals.getElement(i, []);
        const w = weights.getElement(i, []), j = indices.getElement(i, []);
        assert(finite(p) && finite(n) && Math.abs(Math.hypot(...n) - 1) < .02, `${mesh.getName()}: invalid position/normal`);
        assert(finite(w) && w.every(value => value >= 0) && Math.abs(w.reduce((a, b) => a + b, 0) - 1) < .0002, `${mesh.getName()}: invalid normalized weights`);
        assert(j.every(value => Number.isInteger(value) && value >= 0 && value < joints.length), `${mesh.getName()}: invalid joint index`);
      }
      const material = primitive.getMaterial(); assert(material, `${mesh.getName()}: no surface material`);
      const mapped = material.getBaseColorTexture() || material.getMetallicRoughnessTexture() || material.getNormalTexture() || material.getOcclusionTexture();
      if (mapped) assert(primitive.getAttribute('TEXCOORD_0'), `${mesh.getName()}: mapped surface needs UVs`);
      if (material.getNormalTexture()) {
        const tangents = primitive.getAttribute('TANGENT'); assert(tangents, `${mesh.getName()}: normal map needs tangent basis`);
        for (let i = 0; i < tangents.getCount(); i++) {
          const tangent = tangents.getElement(i, []);
          assert(finite(tangent) && Math.abs(Math.hypot(...tangent.slice(0, 3)) - 1) < .02 && Math.abs(Math.abs(tangent[3]) - 1) < .001, `${mesh.getName()}: invalid tangent`);
        }
      }
      if (material.getOcclusionTexture()) assert.notEqual(material.getOcclusionTexture(), material.getBaseColorTexture(), 'AO must remain separate from base color');
    }
    meshTriangles.set(mesh, meshCount); triangles += meshCount;
  }
  assert(triangles > 0 && Number.isInteger(triangles));
  for (const node of nodes.filter(node => node.getMesh())) {
    assert.equal(node.getSkin(), skin, `Unbound visible mesh: ${node.getName()}`);
    instanceTriangles += meshTriangles.get(node.getMesh());
    for (const primitive of node.getMesh().listPrimitives()) {
      const positions = primitive.getAttribute('POSITION'), weights = primitive.getAttribute('WEIGHTS_0'), indices = primitive.getAttribute('JOINTS_0');
      for (let i = 0; i < positions.getCount(); i++) {
        const p = positions.getElement(i, []), w = weights.getElement(i, []), j = indices.getElement(i, []);
        const result = new Vector3();
        for (let k = 0; k < 4; k++) if (w[k]) result.addScaledVector(new Vector3(...p).applyMatrix4(jointMatrices[j[k]]), w[k]);
        result.toArray().forEach((value, axis) => {bounds.min[axis] = Math.min(bounds.min[axis], value); bounds.max[axis] = Math.max(bounds.max[axis], value);});
      }
    }
  }
  bounds.min = rounded(bounds.min); bounds.max = rounded(bounds.max);
  bounds.size = rounded(bounds.max.map((value, axis) => value - bounds.min[axis]));
  assert(bounds.size.every(value => Number.isFinite(value) && value > 0), 'Invalid organic rest bounds');

  assert.deepEqual(root.listAnimations().map(clip => clip.getName()).sort(), ['Boost', 'Flight', 'Glide']);
  const clips = root.listAnimations().map(clip => {
    const channels = clip.listChannels(), animated = new Set(); let duration = 0;
    assert(channels.length > 0);
    const entries = channels.map(channel => {
      const name = channel.getTargetNode()?.getName();
      assert(VIOLET_BONES.includes(name) && !['Root', 'Jaw'].includes(name), `Gameplay/unknown animation target: ${name}`);
      assert(!animated.has(name), `Duplicate rotation channel: ${name}`); animated.add(name);
      assert.equal(channel.getTargetPath(), 'rotation', 'Clips must not move or scale gameplay transforms');
      const sampler = channel.getSampler();
      assert(['LINEAR', 'STEP'].includes(sampler.getInterpolation()), 'Cubic animation needs separate sampled-pose validation');
      const times = sampler.getInput().getArray(), rotations = sampler.getOutput();
      assert(finite(times) && times.length >= 2 && times[0] === 0 && times.at(-1) > 0 && times.at(-1) <= 60);
      for (let i = 1; i < times.length; i++) assert(times[i] > times[i - 1], 'Animation times must increase');
      assert(rotations.getType() === 'VEC4' && rotations.getCount() === times.length);
      for (let i = 0; i < rotations.getCount(); i++) {
        const quaternion = rotations.getElement(i, []);
        assert(finite(quaternion) && Math.abs(Math.hypot(...quaternion) - 1) < .002, `Invalid quaternion: ${name}`);
      }
      const start = rotations.getElement(0, []), end = rotations.getElement(rotations.getCount() - 1, []);
      assert(Math.abs(start.reduce((sum, value, i) => sum + value * end[i], 0)) > .999, `Loop discontinuity: ${clip.getName()}/${name}`);
      duration = Math.max(duration, times.at(-1));
      return {bone: name, samples: times.length, duration: times.at(-1)};
    });
    assert(animated.has('Wing_L') && animated.has('Wing_R'), `Both wings must be authored in ${clip.getName()}`);
    assert(entries.every(entry => Math.abs(entry.duration - duration) < .0001), `Inconsistent channel duration in ${clip.getName()}`);
    return {name: clip.getName(), durationSeconds: duration, channels: entries};
  });
  const materials = [], metallicMaps = new Map();
  for (const material of root.listMaterials()) {
    const factor = material.getMetallicFactor(), map = material.getMetallicRoughnessTexture();
    assert(Number.isFinite(factor) && factor >= 0 && factor <= 1, 'Invalid metallic factor');
    let metallicTextureMaximum = 1;
    if (map) {
      if (!metallicMaps.has(map)) {
        assert(['image/png', 'image/jpeg'].includes(map.getMimeType()), 'Organic packed metallic map requires a supported local decoder');
        const {data, info} = await sharp(map.getImage()).ensureAlpha().raw().toBuffer({resolveWithObject: true});
        assert.equal(info.channels, 4);
        let maximum = 0;
        for (let i = 2; i < data.length; i += 4) maximum = Math.max(maximum, data[i]);
        metallicMaps.set(map, maximum / 255);
      }
      metallicTextureMaximum = metallicMaps.get(map);
    }
    const effectiveMetallicMaximum = factor * metallicTextureMaximum;
    assert(effectiveMetallicMaximum <= .1, `Organic surface unexpectedly metallic after packed-blue modulation: ${material.getName()}`);
    materials.push({name: material.getName(), metallicFactor: factor, metallicTextureMaximum, effectiveMetallicMaximum, roughnessFactor: material.getRoughnessFactor(),
      baseColorTexture: !!material.getBaseColorTexture(), normalTexture: !!material.getNormalTexture(),
      roughnessTexture: !!material.getMetallicRoughnessTexture(), occlusionTexture: !!material.getOcclusionTexture(),
      emissiveFactor: material.getEmissiveFactor(), doubleSided: material.getDoubleSided(), alphaMode: material.getAlphaMode()});
  }
  const textures = root.listTextures().map(texture => ({name: texture.getName(), size: texture.getSize(), bytes: texture.getImage()?.length ?? 0}));
  const limitations = ['Structural verification is not a deformation, appearance, performance or release approval.'];
  if (!materials.some(material => material.normalTexture)) limitations.push('No exported normal maps: procedural source detail is not established in the game.');
  if (!materials.some(material => material.occlusionTexture)) limitations.push('No separate baked AO maps in this candidate.');
  const measured = {result: 'PASS', candidate, sha256: hash(bytes), bytes: bytes.length, rigProfile: metadata.rigProfile,
    meshes: root.listMeshes().length, meshInstances: nodes.filter(node => node.getMesh()).length, primitives, triangles, instanceTriangles, vertices,
    bones: VIOLET_BONES, boneRest: joints.map(joint => ({name: joint.getName(), parent: joint.getParentNode()?.getName() ?? null, worldMatrix: rounded(joint.getWorldMatrix())})),
    inverseBindSha256: hash(Buffer.from(JSON.stringify(Array.from(inverseBind.getArray())))), inverseBindResidual, bounds,
    sockets, contactY: sockets.find(socket => socket.name === 'socket_ground').position[1], clips, materials, textures,
    estimatedTextureRgbaBytes: textures.reduce((sum, texture) => sum + (texture.size ? texture.size[0] * texture.size[1] * 4 : 0), 0),
    textureMemoryMethod: 'RGBA8 uncompressed level-zero estimate; Unity format, duplication and mipmaps are not measured.', limitations};
  if (expected) {
    for (const field of ['sha256', 'bytes', 'triangles', 'rigProfile']) assert.equal(measured[field], expected[field], `Organic identity changed: ${field}`);
    for (const field of ['bounds', 'sockets', 'clips', 'boneRest']) if (expected[field]) assert.deepEqual(measured[field], expected[field], `Organic structure changed: ${field}`);
  }
  return measured;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [candidate, contractPath, ...extra] = process.argv.slice(2);
  assert(candidate && !extra.length, 'Usage: node tools/verify-violet-dragon.mjs <candidate.glb> [measured-contract.json]');
  const expected = contractPath ? JSON.parse(await readFile(contractPath, 'utf8')) : null;
  console.log(JSON.stringify(await verifyVioletDragon(candidate, expected), null, 2));
}
