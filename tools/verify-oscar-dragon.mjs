// Oscar Creativo candidate validation. Identity comes from this export, never
// from the mechanical/violet skeleton. No Blender, Unity, network or mutations.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {Matrix4, Quaternion, Vector3} from 'three';
import sharp from 'sharp';

export const OSCAR_PROFILE = 'oscar-creativo-flight';
export const OSCAR_SOCKETS = ['muzzle', 'wing_l', 'wing_r', 'thruster_l', 'thruster_r',
  'target', 'camera', 'ground'].map(name => `socket_${name}`);
const hash = data => createHash('sha256').update(data).digest('hex');
const finite = values => Array.from(values).every(Number.isFinite);
const canonicalNumbers = value => typeof value === 'number' ? (value === 0 ? 0 : value)
  : Array.isArray(value) ? value.map(canonicalNumbers)
  : value && Object.getPrototypeOf(value) === Object.prototype ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, canonicalNumbers(item)])) : value;
// JSON serializes -0 as 0. Canonicalize before comparing live measurements with
// saved contracts, without changing the serialized asset/receipt identity.
const rounded = values => Array.from(values, value => { const result=Number(value.toFixed(8)); return result === 0 ? 0 : result; });
const integer = value => Number.isSafeInteger(value) && value >= 0;
const arrayHash = values => hash(Buffer.from(JSON.stringify(Array.from(values))));

export function parseOscarGlb(bytes) {
  assert(bytes.length >= 28 && bytes.toString('ascii', 0, 4) === 'glTF', 'Expected GLB');
  assert.equal(bytes.readUInt32LE(4), 2, 'Expected GLB version 2');
  assert.equal(bytes.readUInt32LE(8), bytes.length, 'GLB byte length mismatch');
  let gltf, bin;
  for (let offset = 12; offset < bytes.length;) {
    assert(offset + 8 <= bytes.length, 'Truncated chunk header');
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    assert(length % 4 === 0 && offset + 8 + length <= bytes.length, 'Invalid chunk length');
    if (type === 0x4e4f534a) {
      assert(!gltf && offset === 12, 'Expected one leading JSON chunk');
      gltf = JSON.parse(bytes.toString('utf8', offset + 8, offset + 8 + length));
    } else if (type === 0x004e4942) {
      assert(gltf && !bin, 'Expected one BIN chunk following JSON');
      bin = bytes.subarray(offset + 8, offset + 8 + length);
    } else assert.fail('Unexpected GLB chunk');
    offset += 8 + length;
  }
  assert(gltf && bin && gltf.asset?.version === '2.0', 'Expected self-contained glTF 2.0');
  assert.equal(gltf.buffers?.length, 1, 'Expected one embedded buffer');
  const buffer = gltf.buffers[0];
  assert(!buffer.uri && integer(buffer.byteLength) && buffer.byteLength > 0, 'Invalid embedded buffer declaration');
  assert(buffer.byteLength <= bin.length && bin.length - buffer.byteLength < 4, 'BIN length/padding differs from declared buffer');
  assert(!(gltf.extensionsRequired?.length), 'A required extension/decoder needs explicit runtime review');
  for (const view of gltf.bufferViews ?? []) {
    const offset = view.byteOffset ?? 0;
    assert(view.buffer === 0 && integer(offset) && integer(view.byteLength) && view.byteLength > 0 &&
      offset + view.byteLength <= buffer.byteLength, 'Buffer view escapes embedded BIN');
    if (view.byteStride !== undefined) assert(integer(view.byteStride) && view.byteStride >= 4 && view.byteStride <= 252 && view.byteStride % 4 === 0, 'Invalid vertex byte stride');
  }
  const componentBytes = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4};
  const elements = {SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16};
  for (const accessor of gltf.accessors ?? []) {
    assert(!accessor.sparse, 'Sparse accessors need a separate import/identity policy');
    const view = gltf.bufferViews?.[accessor.bufferView], component = componentBytes[accessor.componentType];
    assert(view && component && elements[accessor.type] && integer(accessor.count) && accessor.count > 0, 'Invalid accessor declaration');
    const columns = accessor.type.startsWith('MAT') ? Number(accessor.type.at(-1)) : 1;
    const width = columns > 1 ? columns * Math.ceil(columns * component / 4) * 4 : elements[accessor.type] * component;
    const stride = view.byteStride ?? width, offset = accessor.byteOffset ?? 0;
    assert(integer(offset) && offset % component === 0 && stride >= width &&
      offset + (accessor.count - 1) * stride + width <= view.byteLength, 'Accessor escapes its declared buffer view');
  }
  for (const node of gltf.nodes ?? []) {
    if (node.matrix) {
      assert(node.matrix.length === 16 && finite(node.matrix) && !node.translation && !node.rotation && !node.scale, 'Invalid mixed matrix/TRS transform');
      const matrix = new Matrix4().fromArray(node.matrix), translation = new Vector3(), rotation = new Quaternion(), scale = new Vector3();
      matrix.decompose(translation, rotation, scale);
      const recomposed = new Matrix4().compose(translation, rotation, scale);
      assert(scale.toArray().every(v => Number.isFinite(v) && Math.abs(v) > 1e-8) &&
        matrix.elements.every((v, i) => Math.abs(v - recomposed.elements[i]) < .00001), 'Sheared/singular local matrices cannot be reproduced by Unity TRS');
    } else {
      for (const [key, count] of [['translation', 3], ['rotation', 4], ['scale', 3]])
        if (node[key]) assert(node[key].length === count && finite(node[key]), `Invalid node ${key}`);
      if (node.rotation) assert(Math.abs(Math.hypot(...node.rotation) - 1) < .002, 'Non-unit node rotation');
      if (node.scale) assert(node.scale.every(v => Math.abs(v) > 1e-8), 'Singular local scale');
    }
  }
  for (const image of gltf.images ?? []) {
    assert(!image.uri && integer(image.bufferView) && gltf.bufferViews?.[image.bufferView], 'Every image must have a valid embedded buffer view');
    assert(['image/png', 'image/jpeg'].includes(image.mimeType), 'Texture decoder must be explicitly supported');
  }
  return gltf;
}

function skinSets(primitive) {
  const semanticSets = primitive.listSemantics().filter(name => /^(JOINTS|WEIGHTS)_\d+$/.test(name));
  const indices = [...new Set(semanticSets.map(name => Number(name.split('_')[1])))].sort((a,b) => a-b);
  assert(indices.length && indices.every((value,index) => value === index), 'Skin attribute sets must be contiguous from zero');
  return indices.map(index => {
    const joints = primitive.getAttribute(`JOINTS_${index}`), weights = primitive.getAttribute(`WEIGHTS_${index}`);
    assert(joints?.getType() === 'VEC4' && weights?.getType() === 'VEC4', `Missing paired skin set ${index}`);
    assert(!joints.getNormalized(), 'Joint indices must not be normalized');
    return {joints, weights};
  });
}
function influencesAt(sets, index) {
  const influences = [];
  for (const set of sets) {
    const weights = set.weights.getElement(index, []), joints = set.joints.getElement(index, []);
    for (let component=0; component<4; component++) if (weights[component] > 0)
      influences.push({joint: joints[component], weight: weights[component]});
  }
  return influences;
}
function binarySkinSidecar(root, skin, setsByPrimitive, sourceSha256) {
  const jointNames = skin.listJoints().map(joint => joint.getName());
  const chunks = []; let byteLength = 0;
  function array(values, type) {
    const padding = (4-byteLength%4)%4;
    if(padding){chunks.push(Buffer.alloc(padding));byteLength+=padding;}
    const sizes={float32:4,uint32:4,uint16:2,uint8:1}, output=Buffer.alloc(values.length*sizes[type]);
    values.forEach((value,index)=>{
      const offset=index*sizes[type];
      if(type==='float32')output.writeFloatLE(value,offset);
      else if(type==='uint32')output.writeUInt32LE(value,offset);
      else if(type==='uint16')output.writeUInt16LE(value,offset);
      else output.writeUInt8(value,offset);
    });
    const descriptor={byteOffset:byteLength,count:values.length,componentType:{float32:5126,uint32:5125,uint16:5123,uint8:5121}[type]}; chunks.push(output);byteLength+=output.length;
    return descriptor;
  }
  const meshes=[];
  for(const node of root.listNodes().filter(node=>node.getMesh())) {
    const mesh=node.getMesh(); assert.equal(mesh.listPrimitives().length,1,'Full-weight Unity restoration currently requires one primitive per mesh');
    const primitive=mesh.listPrimitives()[0], position=primitive.getAttribute('POSITION'), normal=primitive.getAttribute('NORMAL'), uv=primitive.getAttribute('TEXCOORD_0');
    assert(uv?.getType()==='VEC2' && uv.getCount()===position.getCount(),'Full-weight vertex mapping requires TEXCOORD_0');
    const bonesPerVertex=[], jointIndices=[], weights=[];
    for(let vertex=0;vertex<position.getCount();vertex++) {
      const influences=influencesAt(setsByPrimitive.get(primitive),vertex).sort((a,b)=>b.weight-a.weight || a.joint-b.joint);
      assert(influences.length>0 && influences.length<=255,'Unity bones-per-vertex byte overflow');
      bonesPerVertex.push(influences.length);
      for(const influence of influences){assert(influence.joint<=65535,'Joint index exceeds uint16');jointIndices.push(influence.joint);weights.push(influence.weight);}
    }
    const indices=primitive.getIndices()?.getArray() ?? Uint32Array.from({length:position.getCount()},(_,index)=>index);
    meshes.push({nodeName:node.getName(),meshName:mesh.getName(),primitiveIndex:0,vertexCount:position.getCount(),texcoordSet:0,
      positions:array(position.getArray(),'float32'),normals:array(Array.from({length:normal.getCount()},(_,index)=>normal.getElement(index,[])).flat(),'float32'),texcoords:array(Array.from({length:uv.getCount()},(_,index)=>uv.getElement(index,[])).flat(),'float32'),
      bonesPerVertex:array(bonesPerVertex,'uint8'),jointIndices:array(jointIndices,'uint16'),weights:array(weights,'float32'),
      indices:array(indices,'uint32')});
  }
  const binary=Buffer.concat(chunks), inverseBindMatrices=Array.from(skin.getInverseBindMatrices().getArray());
  return {binary,metadata:{schemaVersion:1,sourceSha256,binary:{file:'oscar-fullweights-v001.bytes',sha256:hash(binary),bytes:binary.length},
    encoding:'Little-endian scalar arrays; GLB vertex/joint order. glTF coordinates and unflipped TEXCOORD_0.',jointNames,inverseBindMatrices,meshes}};
}
function measuredPoseSamples(root, skin, setsByPrimitive) {
  const clip=root.listAnimations().find(clip=>clip.getName()==='Flight');
  const duration=Math.max(...clip.listChannels().map(channel=>channel.getSampler().getInput().getArray().at(-1)));
  const nodes=root.listNodes(), rest=nodes.map(node=>({node,t:node.getTranslation(),r:node.getRotation(),s:node.getScale()}));
  const restore=()=>{for(const entry of rest)entry.node.setTranslation(entry.t).setRotation(entry.r).setScale(entry.s);};
  const samples=[];
  try {
    for(const timeSeconds of [0,duration/8,duration/2,duration]) {
      restore();
      for(const channel of clip.listChannels()) {
        const sampler=channel.getSampler(),times=sampler.getInput().getArray(),output=sampler.getOutput();
        let low=0,high=times.length-1;
        if(timeSeconds>=times[high])low=high;
        else {while(high-low>1){const middle=(low+high)>>1;if(times[middle]<=timeSeconds)low=middle;else high=middle;}}
        const a=output.getElement(low,[]),b=output.getElement(high,[]);
        const fraction=high===low || sampler.getInterpolation()==='STEP' ? 0 : Math.max(0,Math.min(1,(timeSeconds-times[low])/(times[high]-times[low])));
        const node=channel.getTargetNode(),target=channel.getTargetPath();
        const values=target==='rotation' ? new Quaternion().fromArray(a).slerp(new Quaternion().fromArray(b),fraction).toArray() : a.map((value,index)=>value+(b[index]-value)*fraction);
        if(target==='translation')node.setTranslation(values);else if(target==='rotation')node.setRotation(values);else node.setScale(values);
      }
      const matrices=skin.listJoints().map((joint,index)=>new Matrix4().fromArray(joint.getWorldMatrix()).multiply(new Matrix4().fromArray(skin.getInverseBindMatrices().getElement(index,[]))));
      const meshes=[];
      for(const node of nodes.filter(node=>node.getMesh())) {
        const primitive=node.getMesh().listPrimitives()[0],positions=primitive.getAttribute('POSITION'),count=Math.min(128,positions.getCount());
        const vertexIndices=Array.from({length:count},(_,index)=>count===1?0:Math.round(index*(positions.getCount()-1)/(count-1))),sampled=[];
        for(const index of vertexIndices) {
          const position=positions.getElement(index,[]),result=new Vector3();
          for(const influence of influencesAt(setsByPrimitive.get(primitive),index))result.addScaledVector(new Vector3(...position).applyMatrix4(matrices[influence.joint]),influence.weight);
          sampled.push(...rounded(result.toArray()));
        }
        meshes.push({nodeName:node.getName(),vertexIndices,positions:sampled});
      }
      samples.push({clip:'Flight',timeSeconds,space:'gltf-scene-world',meshes});
    }
  } finally {restore();}
  return samples;
}

/** Structural/source identity check; appearance and deformation need actual play. */
export async function verifyOscarDragon(candidate, expected = null, {includeSkinSidecar = false} = {}) {
  const bytes = await readFile(candidate), raw = parseOscarGlb(bytes), metadata = raw.asset.extras;
  assert.equal(metadata?.assetContractVersion, 1, 'Oscar export metadata required');
  assert.equal(metadata.rigProfile, OSCAR_PROFILE);
  assert.equal(metadata.forwardAxis, '+Z');
  assert.equal(metadata.upAxis, '+Y');
  assert.equal(metadata.metersPerUnit, 1);
  assert.equal(metadata.authoredPresentation, true, 'Authored surfaces must not receive mechanical overlays');
  assert.equal(metadata.weightLimit, 0, 'Lossy influence reduction is not approved for Oscar');
  assert.equal(metadata.fullSourceInfluencesPreserved, true, 'Full positive source influences must be preserved');
  const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(new Uint8Array(bytes));
  const root = doc.getRoot(), nodes = root.listNodes(), named = new Map(nodes.map(node => [node.getName(), node]));
  assert.equal(root.listScenes().length, 1, 'Expected one exported candidate scene');
  assert.equal(root.listCameras().length, 0, 'Review cameras must not be exported');
  assert(nodes.length && nodes.every(node => node.getName()) && named.size === nodes.length, 'Node names must be stable, nonempty and unique');
  assert(!nodes.some(node => /review studio|not for export|owner.undo|taclb_tier|MI_taclb|Rocky_Sand/i.test(node.getName())), 'Reference/presentation scenery leaked into candidate');
  for (const node of nodes) {
    assert(!node.getExtension('KHR_lights_punctual'), 'Review lights must not be exported');
    assert(finite(node.getWorldMatrix()), `Non-finite transform: ${node.getName()}`);
  }
  assert.equal(root.listSkins().length, 1, 'Expected one measured Oscar skin');
  const skin = root.listSkins()[0], joints = skin.listJoints(), boneNames = joints.map(node => node.getName());
  assert(joints.length > 0 && new Set(boneNames).size === joints.length, 'Invalid exported joint names');
  const jointSet = new Set(joints), inverseBind = skin.getInverseBindMatrices();
  assert(inverseBind?.getType() === 'MAT4' && inverseBind.getCount() === joints.length, 'One inverse bind per exported joint is required');
  const jointMatrices = joints.map((joint, index) => {
    const bind = new Matrix4().fromArray(inverseBind.getElement(index, []));
    assert(finite(bind.elements) && Math.abs(bind.determinant()) > 1e-12, `Singular/nonfinite inverse bind: ${joint.getName()}`);
    return new Matrix4().fromArray(joint.getWorldMatrix()).multiply(bind);
  });
  let inverseBindResidual = 0;
  for (const matrix of jointMatrices) for (let i = 0; i < 16; i++)
    inverseBindResidual = Math.max(inverseBindResidual, Math.abs(matrix.elements[i] - jointMatrices[0].elements[i]));
  assert(inverseBindResidual < .0005, `Inconsistent exported rest/inverse binds (${inverseBindResidual})`);
  const sockets = OSCAR_SOCKETS.map(name => {
    const node = named.get(name); assert(node && !node.getMesh() && !node.getSkin(), `Missing or renderable socket: ${name}`);
    let ancestor = node.getParentNode();
    while (ancestor && !jointSet.has(ancestor)) ancestor = ancestor.getParentNode();
    assert(ancestor, `Socket must follow the measured skeleton: ${name}`);
    return {name, parent: node.getParentNode()?.getName() ?? null,
      position: rounded(node.getWorldTranslation()), worldMatrix: rounded(node.getWorldMatrix())};
  });
  assert(sockets.find(socket => socket.name === 'socket_muzzle').position[2] >
    sockets.find(socket => socket.name === 'socket_target').position[2], 'Muzzle must be ahead of body target in +Z');
  let triangles = 0, vertices = 0, primitives = 0, instanceTriangles = 0, maxWeightResidual = 0, maxInfluencesPerVertex = 0, maxSkinAttributeSets = 0, minimumPositiveWeight = Infinity;
  const setsByPrimitive = new Map();
  const meshTriangles = new Map(), bounds = {min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity]};
  for (const mesh of root.listMeshes()) {
    let count = 0;
    assert.equal(mesh.listPrimitives().length, 1, 'Full-weight Unity restoration requires one primitive per mesh');
    for (const primitive of mesh.listPrimitives()) {
      assert.equal(primitive.getMode(), 4, 'Only triangle primitives are supported'); primitives++;
      assert.equal(primitive.listTargets().length, 0, 'Morph targets need explicit sidecar pose support');
      const position = primitive.getAttribute('POSITION'), normal = primitive.getAttribute('NORMAL');
      const sets=skinSets(primitive); setsByPrimitive.set(primitive,sets); maxSkinAttributeSets=Math.max(maxSkinAttributeSets,sets.length);
      assert(position?.getType() === 'VEC3' && normal?.getType() === 'VEC3', `${mesh.getName()}: missing vertex attributes`);
      assert(position.getCount() > 0 && [normal, ...sets.flatMap(set=>[set.weights,set.joints])].every(a => a.getCount() === position.getCount()), 'Vertex attribute counts differ');
      const indexed = primitive.getIndices(), triangleIndices = indexed?.getCount() ?? position.getCount();
      assert(triangleIndices > 0 && triangleIndices % 3 === 0, 'Triangle index count invalid');
      if (indexed) for (const index of indexed.getArray()) assert(integer(index) && index < position.getCount(), 'Triangle index outside vertex buffer');
      count += triangleIndices / 3; vertices += position.getCount();
      for (let i = 0; i < position.getCount(); i++) {
        const p = position.getElement(i, []), n = normal.getElement(i, []); let sum=0, count=0; const positiveJoints=new Set();
        assert(finite(p) && finite(n) && Math.abs(Math.hypot(...n) - 1) < .02, `${mesh.getName()}: invalid position/normal`);
        for(const set of sets) {
          const w=set.weights.getElement(i,[]), j=set.joints.getElement(i,[]);
          assert(finite(w) && w.every(v=>v>=0 && v<=1), `${mesh.getName()}: invalid skin weights`);
          assert(j.every(v=>integer(v) && v<joints.length), `${mesh.getName()}: invalid joint index`);
          sum+=w.reduce((a,b)=>a+b,0); count+=w.filter(v=>v>0).length;
          for(let component=0;component<4;component++)if(w[component]>0){
            assert(!positiveJoints.has(j[component]), `${mesh.getName()}: duplicate positive joint influence`);positiveJoints.add(j[component]);
            minimumPositiveWeight=Math.min(minimumPositiveWeight,w[component]);
          }
        }
        const residual=Math.abs(sum-1);maxWeightResidual=Math.max(maxWeightResidual,residual);maxInfluencesPerVertex=Math.max(maxInfluencesPerVertex,count);
        assert(count>0 && count<=255 && residual<.0002, `${mesh.getName()}: invalid total normalized skin weights`);
      }
      const material = primitive.getMaterial(); assert(material, 'Primitive needs an authored material');
      for (const [getTexture, getInfo] of [['getBaseColorTexture', 'getBaseColorTextureInfo'], ['getNormalTexture', 'getNormalTextureInfo'],
        ['getMetallicRoughnessTexture', 'getMetallicRoughnessTextureInfo'], ['getOcclusionTexture', 'getOcclusionTextureInfo'], ['getEmissiveTexture', 'getEmissiveTextureInfo']]) {
        if (!material[getTexture]()) continue;
        const uv = primitive.getAttribute(`TEXCOORD_${material[getInfo]().getTexCoord()}`);
        assert(uv?.getType() === 'VEC2' && uv.getCount() === position.getCount() && finite(uv.getArray()), 'Mapped material needs a complete finite UV set');
      }
      if (material.getNormalTexture()) {
        const tangents = primitive.getAttribute('TANGENT');
        assert(tangents?.getType() === 'VEC4' && tangents.getCount() === position.getCount(), 'Normal mapped geometry needs matching tangents');
        for (let i = 0; i < tangents.getCount(); i++) {
          const t = tangents.getElement(i, []);
          assert(finite(t) && Math.abs(Math.hypot(...t.slice(0, 3)) - 1) < .02 && Math.abs(Math.abs(t[3]) - 1) < .001, 'Invalid normal tangent basis');
        }
      }
      if (material.getOcclusionTexture()) assert.notEqual(material.getOcclusionTexture(), material.getBaseColorTexture(), 'AO must stay separate from base color');
    }
    meshTriangles.set(mesh, count); triangles += count;
  }
  assert(triangles > 0 && Number.isInteger(triangles), 'No export geometry');
  for (const node of nodes.filter(node => node.getMesh())) {
    assert.equal(node.getSkin(), skin, `Unskinned/noncandidate mesh: ${node.getName()}`);
    instanceTriangles += meshTriangles.get(node.getMesh());
    for (const primitive of node.getMesh().listPrimitives()) {
      const positions = primitive.getAttribute('POSITION'), sets=setsByPrimitive.get(primitive);
      for (let i = 0; i < positions.getCount(); i++) {
        const p = positions.getElement(i, []), result = new Vector3();
        for(const influence of influencesAt(sets,i)) result.addScaledVector(new Vector3(...p).applyMatrix4(jointMatrices[influence.joint]),influence.weight);
        result.toArray().forEach((value, axis) => {bounds.min[axis] = Math.min(bounds.min[axis], value); bounds.max[axis] = Math.max(bounds.max[axis], value);});
      }
    }
  }
  bounds.min = rounded(bounds.min); bounds.max = rounded(bounds.max);
  bounds.size = rounded(bounds.max.map((v, i) => v - bounds.min[i]));
  assert(bounds.size.every(v => Number.isFinite(v) && v > 0), 'Invalid nonzero 3D rest bounds');
  assert.deepEqual(root.listAnimations().map(clip => clip.getName()).sort(), ['Boost', 'Flight', 'Glide']);
  const clips = root.listAnimations().map(clip => {
    const addressed = new Set(), channels = clip.listChannels(); let duration = 0;
    assert(channels.length, `Empty clip: ${clip.getName()}`);
    const measuredChannels = channels.map(channel => {
      const node = channel.getTargetNode(), name = node?.getName(), targetPath = channel.getTargetPath();
      assert(jointSet.has(node), `Only measured joints may animate: ${name}`);
      assert(['translation', 'rotation', 'scale'].includes(targetPath), 'Unsupported animation path');
      const key = `${name}/${targetPath}`; assert(!addressed.has(key), `Duplicate channel: ${key}`); addressed.add(key);
      const sampler = channel.getSampler(); assert(sampler && ['LINEAR', 'STEP'].includes(sampler.getInterpolation()), 'Animation must use sampled LINEAR/STEP channels');
      const input = sampler.getInput(), output = sampler.getOutput(), times = input?.getArray();
      assert(input?.getType() === 'SCALAR' && times?.length >= 2 && finite(times) && times[0] === 0 && times.at(-1) > 0 && times.at(-1) <= 120, 'Invalid animation sample times');
      for (let i = 1; i < times.length; i++) assert(times[i] > times[i - 1], 'Animation times must increase');
      assert(output?.getCount() === times.length && output.getType() === (targetPath === 'rotation' ? 'VEC4' : 'VEC3') && finite(output.getArray()), 'Invalid animation output');
      for (let i = 0; i < output.getCount(); i++) {
        const values = output.getElement(i, []);
        if (targetPath === 'rotation') assert(Math.abs(Math.hypot(...values) - 1) < .002, `Invalid quaternion: ${key}`);
        if (targetPath === 'scale') assert(values.every(v => Math.abs(v) > 1e-8), `Singular animated scale: ${key}`);
      }
      const start = output.getElement(0, []), end = output.getElement(output.getCount() - 1, []);
      const loopResidual = targetPath === 'rotation' ? 2 * Math.acos(Math.min(1, Math.abs(start.reduce((s, v, i) => s + v * end[i], 0)))) : Math.hypot(...end.map((v, i) => v - start[i]));
      duration = Math.max(duration, times.at(-1));
      return {bone: name, path: targetPath, samples: times.length, duration: times.at(-1), interpolation: sampler.getInterpolation(),
        sampleSha256: arrayHash(output.getArray()), timeSha256: arrayHash(times), loopResidual};
    });
    return {name: clip.getName(), durationSeconds: duration, channels: measuredChannels};
  });
  const materials = root.listMaterials().map(material => {
    assert(material.getName(), 'Surface materials need stable names');
    for (const factor of [material.getMetallicFactor(), material.getRoughnessFactor()]) assert(Number.isFinite(factor) && factor >= 0 && factor <= 1, 'PBR factor outside 0..1');
    assert(finite(material.getBaseColorFactor()) && material.getBaseColorFactor().every(v => v >= 0 && v <= 1), 'Invalid base color');
    assert(finite(material.getEmissiveFactor()) && material.getEmissiveFactor().every(v => v >= 0), 'Invalid emissive color');
    return {name: material.getName(), baseColorFactor: material.getBaseColorFactor(), metallicFactor: material.getMetallicFactor(), roughnessFactor: material.getRoughnessFactor(),
      baseColorTexture: !!material.getBaseColorTexture(), normalTexture: !!material.getNormalTexture(), roughnessTexture: !!material.getMetallicRoughnessTexture(),
      occlusionTexture: !!material.getOcclusionTexture(), emissiveTexture: !!material.getEmissiveTexture(), emissiveFactor: material.getEmissiveFactor(),
      doubleSided: material.getDoubleSided(), alphaMode: material.getAlphaMode()};
  });
  assert(new Set(materials.map(m => m.name)).size === materials.length, 'Material names must be unique');
  const textures = [];
  for (const texture of root.listTextures()) {
    const image = texture.getImage(); assert(image?.length, 'Missing texture image');
    const info = await sharp(image, {limitInputPixels: 268402689}).metadata();
    const size = texture.getSize();
    assert(info.width > 0 && info.height > 0 && size?.[0] === info.width && size?.[1] === info.height, 'Embedded texture dimensions disagree');
    assert(['png', 'jpeg'].includes(info.format), 'Unreviewed texture format');
    textures.push({name: texture.getName(), size: [info.width, info.height], mimeType: texture.getMimeType(), bytes: image.length, sha256: hash(image)});
  }
  assert.equal(metadata.maximumInfluences, maxInfluencesPerVertex, 'Measured maximum influences differ from full-weight source metadata');
  const measured = canonicalNumbers({result: 'PASS', candidate, sha256: hash(bytes), bytes: bytes.length, rigProfile: OSCAR_PROFILE,
    meshes: root.listMeshes().length, meshInstances: nodes.filter(node => node.getMesh()).length, primitives, triangles, instanceTriangles, vertices,
    bones: boneNames, boneRest: joints.map(joint => ({name: joint.getName(), parent: joint.getParentNode()?.getName() ?? null,
      worldMatrix: rounded(joint.getWorldMatrix()), translation: rounded(joint.getTranslation()), rotation: rounded(joint.getRotation()), scale: rounded(joint.getScale())})),
    inverseBindSha256: arrayHash(inverseBind.getArray()), inverseBindResidual, maxWeightResidual, maxInfluencesPerVertex, maxSkinAttributeSets, minimumPositiveWeight, bounds, sockets,
    contactY: sockets.find(socket => socket.name === 'socket_ground').position[1], clips, materials, textures,
    extensionsUsed: raw.extensionsUsed ?? [], estimatedTextureRgbaBytes: textures.reduce((sum, texture) => sum + texture.size[0] * texture.size[1] * 4, 0),
    textureMemoryMethod: 'RGBA8 uncompressed level-zero estimate only; Unity format, duplication, mipmaps and actual VRAM are not measured.',
    limitations: ['Structural validation is not deformation, material appearance, performance, human approval or release verification.', 'Authored animation loop residuals are reported; visual blending/loop quality requires actual player review.']});
  if (expected) {
    for (const key of ['sha256', 'bytes', 'rigProfile', 'triangles', 'instanceTriangles', 'meshes', 'primitives', 'inverseBindSha256', 'maxInfluencesPerVertex', 'maxSkinAttributeSets'])
      assert.equal(measured[key], expected[key], `Oscar identity changed: ${key}`);
    for (const key of ['bones', 'boneRest', 'bounds', 'sockets', 'clips', 'materials', 'textures']) assert.deepEqual(measured[key], expected[key], `Oscar contract changed: ${key}`);
  }
  if(includeSkinSidecar) {
    measured.skinSidecar=binarySkinSidecar(root,skin,setsByPrimitive,measured.sha256);
    measured.skinSidecar.metadata.poseSamples=measuredPoseSamples(root,skin,setsByPrimitive);
    measured.skinSidecar.metadata=canonicalNumbers(measured.skinSidecar.metadata);
    measured.skinSidecar.metadata.poseSampleMethod='Actual GLB sampled LINEAR/STEP TRS and all joint weights; four Flight times and up to128 evenly spaced vertices per mesh. Expected positions are glTF scene world, before Unity X mirror.';
    measured.skinSidecar.metadata.poseToleranceMetres=.001;
  }
  return measured;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [candidate, expectedPath, ...extra] = process.argv.slice(2);
  assert(candidate && !extra.length, 'Usage: node tools/verify-oscar-dragon.mjs <candidate.glb> [oscar-contract-v001.json]');
  const expected = expectedPath ? JSON.parse(await readFile(expectedPath, 'utf8')) : null;
  console.log(JSON.stringify(await verifyOscarDragon(candidate, expected), null, 2));
}
