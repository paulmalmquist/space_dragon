// Structural contract for a geometry-changing heroic candidate, not the old
// byte-identical animation-only contract. Actual Blender/Unity appearance is separate.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const bones = ['Root','Wing_L','Wing_R','Jaw','Tail_0','Tail_1','Tail_2','Tail_3','Tail_4'];
const sockets = ['muzzle','wing_l','wing_r','thruster_l','thruster_r','target','camera','ground'].map(s => `socket_${s}`);
const delta = (a,b) => Math.max(...a.map((v,i) => Math.abs(v-b[i])));
export async function verifyHeroicDragon(candidate, baseline = 'public/assets/dogfight/models/dragon-flight-v003.glb') {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const [next,prior,bytes] = await Promise.all([io.read(candidate),io.read(baseline),readFile(candidate)]);
  const root = next.getRoot(), old = prior.getRoot();
  const named = value => new Map(value.listNodes().map(n => [n.getName(),n]));
  const before = named(old), after = named(root);
  assert.equal(after.size,root.listNodes().length,'Exported node names must be unique.');
  const markers = old.listNodes().filter(n => n.getExtras().sourceComponentName);
  assert(markers.length>=706,'Reference lost original component markers');
  let pivotError = 0;
  for (const node of [...markers,...sockets.map(name => before.get(name)),...bones.map(name => before.get(name))]) {
    const n = after.get(node.getName()); assert(n,`Missing preserved node ${node.getName()}`);
    const error = delta(n.getWorldMatrix(),node.getWorldMatrix()); pivotError = Math.max(pivotError,error);
    assert(error < 1e-5,`Rest world changed: ${node.getName()} (${error})`);
  }
  for (const name of sockets) {
    const node = after.get(name), expected = name === 'socket_wing_l' ? 'Wing_L' : name === 'socket_wing_r' ? 'Wing_R' : 'Root';
    assert.equal(node.getParentNode()?.getName(),expected,`${name} attachment parent changed`);
  }
  assert.equal(root.listSkins().length,1);
  const skin = root.listSkins()[0], referenceSkin = old.listSkins()[0];
  assert.deepEqual(skin.listJoints().map(n=>n.getName()),referenceSkin.listJoints().map(n=>n.getName()));
  assert.deepEqual(skin.getInverseBindMatrices().getArray(),referenceSkin.getInverseBindMatrices().getArray(),'Inverse bind matrices changed');
  assert.deepEqual(root.listAnimations().map(a=>a.getName()).sort(),['Boost','Flight','Glide']);
  for (const clip of root.listAnimations()) {
    const reference = old.listAnimations().find(a=>a.getName()===clip.getName());
    assert.equal(clip.listChannels().length,7);
    for (const channel of clip.listChannels()) {
      const name = channel.getTargetNode().getName();
      assert(bones.includes(name) && !['Root','Jaw'].includes(name)); assert.equal(channel.getTargetPath(),'rotation');
      const source = reference.listChannels().find(c=>c.getTargetNode().getName()===name);
      const sampler = channel.getSampler(), original = source.getSampler();
      assert.equal(sampler.getInterpolation(),original.getInterpolation());
      assert.deepEqual(sampler.getInput().getArray(),original.getInput().getArray(),`${clip.getName()}/${name} timing changed`);
      assert.deepEqual(sampler.getOutput().getArray(),original.getOutput().getArray(),`${clip.getName()}/${name} rotations changed`);
      const times=sampler.getInput().getArray(); assert.equal(times[0],0); assert.equal(times.at(-1),1);
    }
  }
  let triangles=0,vertices=0,primitives=0;
  for (const mesh of root.listMeshes()) for (const primitive of mesh.listPrimitives()) {
    primitives++; const position=primitive.getAttribute('POSITION'), joints=primitive.getAttribute('JOINTS_0'), weights=primitive.getAttribute('WEIGHTS_0');
    assert(joints && weights,`${mesh.getName()}: no rig weights`); vertices+=position.getCount();
    triangles+=(primitive.getIndices()?.getCount()??position.getCount())/3;
    const j=joints.getArray(),w=weights.getArray();
    for(let i=0;i<weights.getCount();i++) {
      let sum=0; for(let k=0;k<4;k++) { const value=w[i*4+k];assert(Number.isFinite(value)&&value>=0);assert(j[i*4+k]>=0&&j[i*4+k]<9);sum+=value; }
      assert(Math.abs(sum-1)<1e-4,`${mesh.getName()}: weights do not sum to one`);
    }
    const material=primitive.getMaterial();
    if(material?.getNormalTexture()) {
      assert(primitive.getAttribute('TEXCOORD_0')&&primitive.getAttribute('TANGENT'),`${mesh.getName()}: normal map requires UV and tangent basis`);
      const t=primitive.getAttribute('TANGENT').getArray();
      for(let i=0;i<t.length;i+=4) assert(t.subarray(i,i+4).every(Number.isFinite)&&Math.hypot(t[i],t[i+1],t[i+2])>.9,`${mesh.getName()}: invalid tangent`);
    }
  }
  const baked=root.listMaterials().filter(m=>m.getNormalTexture()&&m.getOcclusionTexture());assert(baked.length>0,'Retain real baked surface maps');
  for(const material of baked) assert.notEqual(material.getOcclusionTexture(),material.getBaseColorTexture(),'AO must remain separate');
  assert.equal(root.listCameras().length,0);
  assert(!root.listNodes().some(n=>/review studio|source.only|original organic|review camera/i.test(n.getName())),'Source/review data leaked');
  const raw=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  assert(raw.images.every(i=>i.bufferView!==undefined&&i.uri===undefined));assert(!(raw.extensionsRequired?.length),'Unreviewed required decoder');
  const contract=raw.asset.extras;assert.equal(contract.assetContractVersion,1);assert.equal(contract.forwardAxis,'-Z');assert.equal(contract.upAxis,'+Y');assert.equal(contract.metersPerUnit,1);assert.equal(contract.authoredArmor,true);
  return {result:'PASS',candidate,baseline,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,
    meshes:root.listMeshes().length,primitives,triangles,vertices,materials:root.listMaterials().length,preservedComponentPivots:markers.length,maxPivotError:pivotError,
    bones,sockets,clips:['Flight','Glide','Boost'],inverseBindMatrices:'identical',animationChannels:'byte-identical decoded times/quaternions',
    textures:root.listTextures().map(t=>({name:t.getName(),size:t.getSize(),bytes:t.getImage()?.length??0})),
    scope:'Geometry-changing candidate structure, rig, mapped surfaces and original attachments. Not visual/art/performance approval.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
  console.log(JSON.stringify(await verifyHeroicDragon(process.argv[2]||'assets/game/local/spacecraft/space-dragon-spacecraft/heroic-v005/dragon-heroic-v005.glb',process.argv[3]),null,2));
