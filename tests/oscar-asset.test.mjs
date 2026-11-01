// Small independent glTF fixtures exercise the asset validator without local
// masters, Unity, Blender, a browser, network access or committed binary files.
import assert from 'node:assert/strict';
import {after, before, test} from 'node:test';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {Document, NodeIO, Accessor} from '@gltf-transform/core';
import sharp from 'sharp';
import {verifyOscarDragon, parseOscarGlb, OSCAR_SOCKETS} from '../tools/verify-oscar-dragon.mjs';

const temporaryParent = path.resolve(os.tmpdir());
const prefix = 'space-dragon-oscar-unit-';
let directory, validBytes, fullBytes, validFile, fullFile, measured;

function mutateGlb(bytes, change){
 const gltf=JSON.parse(Buffer.from(bytes).subarray(20,20+Buffer.from(bytes).readUInt32LE(12)).toString());
 const oldJson=Buffer.from(bytes).readUInt32LE(12),tail=Buffer.from(bytes).subarray(20+oldJson);
 change(gltf);
 const body=Buffer.from(JSON.stringify(gltf)); const padded=Buffer.alloc(Math.ceil(body.length/4)*4,32);body.copy(padded);
 const out=Buffer.alloc(20+padded.length+tail.length);out.write('glTF');out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);
 out.writeUInt32LE(padded.length,12);out.writeUInt32LE(0x4e4f534a,16);padded.copy(out,20);tail.copy(out,20+padded.length);return out;
}
async function makeFixture(weight=1,full=false){
 const d=new Document(),b=d.createBuffer(),scene=d.createScene('candidate'),root=d.createNode('root.x'),jaw=d.createNode('jawbone.x');
 scene.addChild(root);root.addChild(jaw);const extra=full?Array.from({length:3},(_,i)=>d.createNode('extra'+i)):[];for(const bone of extra)root.addChild(bone);
 for(const name of OSCAR_SOCKETS){const n=d.createNode(name);if(name==='socket_muzzle')n.setTranslation([0,0,2]);root.addChild(n);}
 const acc=(name,type,array)=>d.createAccessor(name,b).setType(type).setArray(array);
 const pos=acc('positions',Accessor.Type.VEC3,new Float32Array([0,0,0,1,0,0,0,1,0,0,0,1]));
 const norm=acc('normal',Accessor.Type.VEC3,new Float32Array([0,0,1,0,0,1,0,0,1,0,0,1]));
 const weights=acc('weights',Accessor.Type.VEC4,new Float32Array(full?Array(16).fill(.2*weight):[weight,0,0,0,weight,0,0,0,weight,0,0,0,weight,0,0,0]));
 const joints=acc('joints',Accessor.Type.VEC4,new Uint16Array(full?Array.from({length:16},(_,i)=>i%4):16));
 const inds=acc('indices',Accessor.Type.SCALAR,new Uint16Array([0,2,1,0,1,3,0,3,2,1,2,3]));
 const uvs=acc('uv',Accessor.Type.VEC2,new Float32Array([0,0,1,0,0,1,1,1]));
 const tangent=acc('tangent',Accessor.Type.VEC4,new Float32Array([1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1]));
 const image=await sharp({create:{width:4,height:4,channels:4,background:{r:128,g:128,b:255,alpha:1}}}).png().toBuffer();
 const texture=d.createTexture('fixture-map').setImage(image).setMimeType('image/png');
 const mat=d.createMaterial('fixture-surface').setMetallicFactor(0).setRoughnessFactor(.5).setBaseColorTexture(texture).setNormalTexture(texture);
 const primitive=d.createPrimitive().setAttribute('POSITION',pos).setAttribute('NORMAL',norm).setAttribute('WEIGHTS_0',weights).setAttribute('JOINTS_0',joints).setAttribute('TEXCOORD_0',uvs).setAttribute('TANGENT',tangent).setIndices(inds).setMaterial(mat);
 if(full)primitive.setAttribute('JOINTS_1',acc('joints1',Accessor.Type.VEC4,new Uint16Array([4,0,0,0,4,0,0,0,4,0,0,0,4,0,0,0]))).setAttribute('WEIGHTS_1',acc('weights1',Accessor.Type.VEC4,new Float32Array([.2*weight,0,0,0,.2*weight,0,0,0,.2*weight,0,0,0,.2*weight,0,0,0])));
 const mesh=d.createMesh('fixture-mesh').addPrimitive(primitive);
 const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
 const skin=d.createSkin('fixture-skin');for(const bone of [root,jaw,...extra])skin.addJoint(bone);skin.setInverseBindMatrices(acc('binds',Accessor.Type.MAT4,new Float32Array(Array.from({length:2+extra.length},()=>identity).flat())));
 scene.addChild(d.createNode('fixture-render').setMesh(mesh).setSkin(skin));
 for(const name of ['Flight','Glide','Boost']){
  const clip=d.createAnimation(name),times=acc(name+'times',Accessor.Type.SCALAR,new Float32Array([0,1]));
  for(const [channel,type,values] of [['rotation',Accessor.Type.VEC4,[0,0,0,1,0,0,0,1]],['translation',Accessor.Type.VEC3,[0,0,0,0,.1,0]],['scale',Accessor.Type.VEC3,[1,1,1,1,1,1]]]){
   const outputValues=full&&channel==='rotation'?[0,0,0,1,0,0,Math.SQRT1_2,Math.SQRT1_2]:full&&channel==='scale'?[1,1,1,1.1,1,1]:values;
   const sampler=d.createAnimationSampler().setInput(times).setOutput(acc(name+channel,type,new Float32Array(outputValues))).setInterpolation('LINEAR');
   clip.addSampler(sampler).addChannel(d.createAnimationChannel().setTargetNode(jaw).setTargetPath(channel).setSampler(sampler));
  }
 }
 return mutateGlb(await new NodeIO().writeBinary(d),g=>{g.asset.extras={assetContractVersion:1,rigProfile:'oscar-creativo-flight',forwardAxis:'+Z',upAxis:'+Y',metersPerUnit:1,authoredPresentation:true,weightLimit:0,maximumInfluences:full?5:1,fullSourceInfluencesPreserved:true};});
}

before(async () => {
  directory = await mkdtemp(path.join(temporaryParent, prefix));
  [validBytes, fullBytes] = await Promise.all([makeFixture(), makeFixture(1, true)]);
  validFile = await save('valid.glb', validBytes);
  fullFile = await save('fullweights.glb', fullBytes);
  measured = await verifyOscarDragon(validFile);
});

after(async () => {
  if (!directory) return;
  // Verify the resolved target is our unique fixture directory before removal.
  const resolved = path.resolve(directory);
  assert.equal(path.dirname(resolved), temporaryParent);
  assert(path.basename(resolved).startsWith(prefix));
  await rm(resolved, {recursive: true, force: true});
});

async function save(name, bytes) {
  assert.equal(path.basename(name), name);
  const file = path.join(directory, name);
  await writeFile(file, bytes);
  return file;
}

test('Oscar accepts a small embedded, skinned, full-TRS candidate', () => {
  assert.equal(measured.triangles, 4);
  assert.equal(measured.bones.length, 2);
  assert.deepEqual(measured.textures[0].size, [4, 4]);
  assert(measured.textures[0].bytes > 0);
  assert.deepEqual(measured.clips[0].channels.map(channel => channel.path), ['rotation', 'translation', 'scale']);
});

test('Oscar rejects external image references', () => {
  const bytes = mutateGlb(validBytes, gltf => { gltf.images[0].uri = 'https://example.invalid/map.png'; });
  assert.throws(() => parseOscarGlb(bytes), /embedded buffer view/);
});

test('Oscar rejects a declared buffer extending beyond the BIN chunk', () => {
  const bytes = mutateGlb(validBytes, gltf => { gltf.buffers[0].byteLength += 16; });
  assert.throws(() => parseOscarGlb(bytes), /BIN length/);
});

test('Oscar rejects an embedded image range outside its buffer', () => {
  const bytes = mutateGlb(validBytes, gltf => { gltf.bufferViews[gltf.images[0].bufferView].byteLength = 999999; });
  assert.throws(() => parseOscarGlb(bytes), /Buffer view escapes/);
});

test('Oscar rejects truncated accessor payloads before decoding', () => {
  const bytes = mutateGlb(validBytes, gltf => { gltf.accessors[0].count = 999999; });
  assert.throws(() => parseOscarGlb(bytes), /Accessor escapes/);
});

test('Oscar rejects local shear that Unity TRS cannot reproduce', () => {
  const bytes = mutateGlb(validBytes, gltf => {
    gltf.nodes[0].matrix = [1, 0, 0, 0, .5, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    delete gltf.nodes[0].translation;
    delete gltf.nodes[0].rotation;
    delete gltf.nodes[0].scale;
  });
  assert.throws(() => parseOscarGlb(bytes), /Sheared/);
});

test('Oscar rejects unreviewed required decoder dependencies', () => {
  const bytes = mutateGlb(validBytes, gltf => { gltf.extensionsRequired = ['KHR_draco_mesh_compression']; });
  assert.throws(() => parseOscarGlb(bytes), /required extension/);
});

test('Oscar rejects unnormalized single-set skin weights', async () => {
  const file = await save('invalid-weights.glb', await makeFixture(.5));
  await assert.rejects(() => verifyOscarDragon(file), /normalized skin weights/);
});

test('Oscar measurements survive the saved JSON contract roundtrip', async () => {
  const stored = JSON.parse(JSON.stringify(measured));
  await verifyOscarDragon(validFile, stored);
});

test('Oscar canonicalizes a tiny negative transform that rounds to zero', async () => {
  const bytes = mutateGlb(validBytes, gltf => {
    gltf.nodes.find(node => node.name === 'root.x').translation = [-1e-12, 0, 0];
  });
  const file = await save('negative-zero.glb', bytes);
  const result = await verifyOscarDragon(file, null, {includeSkinSidecar: true});
  assert.equal(result.boneRest[0].translation[0], 0);
  assert(!Object.is(result.boneRest[0].translation[0], -0));
  const {skinSidecar, ...contract} = result;
  await verifyOscarDragon(file, JSON.parse(JSON.stringify(contract)));
  assert.deepEqual(skinSidecar.metadata, JSON.parse(JSON.stringify(skinSidecar.metadata)));
});

test('Oscar rejects a saved contract whose measured rest was changed', async () => {
  const expected = structuredClone(measured);
  expected.boneRest[0].worldMatrix[0] = 2;
  await assert.rejects(() => verifyOscarDragon(validFile, expected), /boneRest/);
});

test('Oscar keeps five influences and independently correct full-TRS pose expectations', async () => {
  const result = await verifyOscarDragon(fullFile, null, {includeSkinSidecar: true});
  assert.equal(result.maxInfluencesPerVertex, 5);
  assert.equal(result.maxSkinAttributeSets, 2);
  const {binary, metadata} = result.skinSidecar;
  const mesh = metadata.meshes[0];
  assert.equal(metadata.jointNames.length, 5);
  assert.equal(binary.readUInt8(mesh.bonesPerVertex.byteOffset), 5);
  assert.equal(mesh.jointIndices.count, 20);
  assert.equal(mesh.positions.componentType, 5126);
  assert.equal(mesh.jointIndices.componentType, 5123);
  assert.equal(mesh.indices.componentType, 5125);
  assert.equal(metadata.binary.sha256, createHash('sha256').update(binary).digest('hex'));
  assert.equal(metadata.poseSamples.length, 4);
  // Each bone has weight .2. Only the jaw moves. Its 0.1 m translation
  // contributes .02 m, including at the origin (rotation cannot affect it).
  assert(Math.abs(metadata.poseSamples[1].meshes[0].positions[1] - .0025) < 1e-7);
  const end = metadata.poseSamples[3].meshes[0].positions;
  assert(Math.abs(end[1] - .02) < 1e-7);
  // Vertex (1,0,0): four stationary bones leave x=.8. The jaw scales x
  // by1.1, rotates it90deg aroundZ and adds .1 toY: .2*(1.1+.1)=.24.
  assert(Math.abs(end[3] - .8) < 1e-7);
  assert(Math.abs(end[4] - .24) < 1e-7);
});

test('Oscar rejects an unpaired additional influence set', async () => {
  const bytes = mutateGlb(fullBytes, gltf => { delete gltf.meshes[0].primitives[0].attributes.WEIGHTS_1; });
  const file = await save('unpaired-fullweights.glb', bytes);
  await assert.rejects(() => verifyOscarDragon(file), /paired skin set/);
});

test('Oscar validates normalization across every influence set', async () => {
  const file = await save('bad-fullweights-total.glb', await makeFixture(2, true));
  await assert.rejects(() => verifyOscarDragon(file), /total normalized skin weights/);
});
