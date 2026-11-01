// Additive fitted armor intake. Never rewrites the Oscar body/v005 receipt or a scene.
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {Matrix4, Vector3} from 'three';
import {parseOscarGlb} from '../verify-oscar-dragon.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const target=path.join(root,'unity/SpaceDragon/Assets/SpaceDragon/Dogfight');
const assetId='oscar-mechanical-v004', file='dragon-oscar-mechanical-v004.glb';
const sourceDefault=`assets/game/local/spacecraft/oscar-dragon/mechanical-v004/${file}`;
const imported=`Imported/${file}`, contractName='oscar-mechanical-contract-v004.json';
const exportName='oscar-mechanical-export-receipt-v004.json';
const expectedNode='OscarMechanical.v004.FittedArmor';
const baseFile='Imported/dragon-oscar-v001.glb';
const baseSha='7c9ed83fef05fc1d2b3bf868e44f5893742dad1682d2368c78ca24acd1ed3292';
const baseContractName='oscar-contract-v001.json', baseReceiptName='asset-receipt-v005.json';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const finite=values=>Array.from(values).every(Number.isFinite);
const rounded=values=>Array.from(values,v=>Number(v.toFixed(8))||0);
const options={'source-root':root,'master-root':root,source:sourceDefault,verify:false};
for(let i=2;i<process.argv.length;i++) {
  const arg=process.argv[i];
  if(arg==='--verify')options.verify=true;
  else if(['--source-root','--master-root','--source','--export-receipt','--report-dir'].includes(arg)&&process.argv[i+1])options[arg.slice(2)]=process.argv[++i];
  else throw Error('Usage: prepare-oscar-mechanical.mjs [--verify] [--source-root repository] [--master-root repository] [--source candidate.glb] [--export-receipt receipt.json] [--report-dir ignored-directory]');
}
function contained(base,relative,label) {
  assert(typeof relative==='string'&&relative.length,`${label}: missing path`);
  const result=path.resolve(base,relative),rel=path.relative(base,result);
  assert(rel&&rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel),`${label}: path escapes root`);
  return result;
}
const destination=name=>contained(target,name,'Intake destination');
async function hashFile(filename) {const h=createHash('sha256');for await(const chunk of createReadStream(filename))h.update(chunk);return h.digest('hex');}
async function requireFile(row) {
  const body=await readFile(destination(row.destination));
  assert.equal(body.length,row.bytes,`Pinned length changed: ${row.destination}`);
  assert.equal(hash(body),row.sha256,`Pinned content changed: ${row.destination}`);return body;
}
async function baseline() {
  const body=await readFile(destination(baseFile)), contractBytes=await readFile(destination(baseContractName)), receiptBytes=await readFile(destination(baseReceiptName));
  assert.equal(hash(body),baseSha,'Original Oscar body GLB changed');
  const contract=JSON.parse(contractBytes),receipt=JSON.parse(receiptBytes);
  assert.equal(contract.sha256,baseSha);assert.equal(contract.bones.length,165);assert.equal(receipt.schemaVersion,5);
  assert(receipt.files.some(row=>row.destination===baseFile&&row.sha256===baseSha&&row.bytes===body.length),'v005 must retain the original body');
  return {contract,dependencies:[[baseFile,body],[baseContractName,contractBytes],[baseReceiptName,receiptBytes]]
    .map(([destination,bytes])=>({destination,bytes:bytes.length,sha256:hash(bytes)}))};
}
function compareMatrix(actual,expected,label) {
  assert(actual.length===16&&expected.length===16&&finite(actual)&&finite(expected),`${label}: invalid matrix`);
  const difference=Math.max(...actual.map((v,i)=>Math.abs(v-expected[i])));
  assert(difference<.0001,`${label}: rest/normalization differs (${difference})`);return difference;
}
async function measure(bytes,base) {
  const gltf=parseOscarGlb(bytes);
  for(const key of ['animations','textures','images','cameras'])assert.equal(gltf[key]?.length??0,0,`Accessory cannot contain ${key}`);
  assert(!gltf.extensions?.KHR_lights_punctual,'Accessory cannot contain lights');
  assert.equal(gltf.scenes?.length,1,'Export only the active accessory scene');
  assert.equal(gltf.meshes?.length,1,'Expected one joined accessory mesh');
  assert.equal(gltf.skins?.length,1,'Expected one original rest skeleton');
  assert.equal(gltf.materials?.length,4,'Expected the four authored accessory materials');
  assert(!gltf.extensionsUsed?.length,'This bounded constant-PBR addon needs no extensions/decoders');
  const document=await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(new Uint8Array(bytes));
  const scene=document.getRoot(),nodes=scene.listNodes(),skins=scene.listSkins(),skin=skins[0];
  const names=nodes.map(node=>node.getName());assert(names.every(Boolean)&&new Set(names).size===names.length,'Every node needs a unique name');
  const rendered=nodes.filter(node=>node.getMesh());
  assert.deepEqual(rendered.map(node=>node.getName()),[expectedNode],'Unexpected body/prop/renderer leaked into addon');
  assert(rendered.every(node=>node.getSkin()===skin),'Every addon mesh must use the preserved skin');
  const joints=skin.listJoints(),jointNames=joints.map(node=>node.getName());
  assert.equal(joints.length,165,'Preserve all 165 Oscar joints');
  assert.deepEqual([...jointNames].sort(),[...base.bones].sort(),'Accessory has extra/missing joints');
  const allowed=new Set([...base.bones,'OscarAssetRoot','OscarGameRig',expectedNode]);
  assert(names.every(name=>allowed.has(name)),'Unexpected non-accessory node in export');
  let maxRestDifference=0;
  for(const joint of joints) {
    const original=base.boneRest.find(bone=>bone.name===joint.getName());
    assert.equal(joint.getParentNode()?.getName()??null,original.parent,`Joint parent changed: ${joint.getName()}`);
    maxRestDifference=Math.max(maxRestDifference,compareMatrix(joint.getWorldMatrix(),original.worldMatrix,joint.getName()));
  }
  const inverseBind=skin.getInverseBindMatrices();
  assert(inverseBind?.getType()==='MAT4'&&inverseBind.getCount()===joints.length,'Incomplete inverse binds');
  // The exporter uses model-space inverse joints, identical to the baseline.
  // glTF skin evaluation excludes the skinned mesh-node transform, so comparing
  // jointWorld*inverseBind to that node would incorrectly apply normalization twice.
  assert.deepEqual(jointNames,base.bones,'Inverse-bind identity requires preserved joint order');
  const inverseBindSha256=hash(Buffer.from(JSON.stringify(Array.from(inverseBind.getArray()))));
  assert.equal(inverseBindSha256,base.inverseBindSha256,'Accessory inverse binds changed from the proven baseline');
  const restSkin=joints.map((joint,i)=>new Matrix4().fromArray(joint.getWorldMatrix()).multiply(new Matrix4().fromArray(inverseBind.getElement(i,[]))));
  let inverseBindResidual=0;
  for(const matrix of restSkin)inverseBindResidual=Math.max(inverseBindResidual,compareMatrix(matrix.elements,restSkin[0].elements,'Consistent inverse binds'));
  let triangles=0,vertices=0,positiveInfluences=0,maxInfluencesPerVertex=0,maxWeightResidual=0;
  const usedBones=new Set(),bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
  const mesh=rendered[0].getMesh(),primitives=mesh.listPrimitives();
  for(const primitive of primitives) {
    assert.equal(primitive.getMode(),4,'Only triangle primitives are supported');
    assert(!primitive.listTargets().length,'No morph targets in this fitted armor pass');
    const position=primitive.getAttribute('POSITION'),normal=primitive.getAttribute('NORMAL'),weights=primitive.getAttribute('WEIGHTS_0'),indices=primitive.getAttribute('JOINTS_0');
    assert(position?.getType()==='VEC3'&&normal?.getType()==='VEC3'&&weights?.getType()==='VEC4'&&indices?.getType()==='VEC4','Missing position/normal/skin data');
    assert(!primitive.listSemantics().some(name=>/^(WEIGHTS|JOINTS)_[1-9]/.test(name)),'Only the new armor is bounded to four influences');
    assert(!indices.getNormalized(),'Joint indices cannot be normalized');
    assert(position.getCount()>0&&[normal,weights,indices].every(a=>a.getCount()===position.getCount()),'Vertex counts differ');
    const triangleIndices=primitive.getIndices()?.getArray();
    const count=triangleIndices?.length??position.getCount();assert.equal(count%3,0,'Incomplete triangles');
    if(triangleIndices)assert(Array.from(triangleIndices).every(v=>Number.isInteger(v)&&v>=0&&v<position.getCount()),'Triangle index out of range');
    triangles+=count/3;vertices+=position.getCount();
    assert(primitive.getMaterial(),'Accessory primitive needs an authored material');
    for(let i=0;i<position.getCount();i++) {
      const p=position.getElement(i,[]),n=normal.getElement(i,[]),w=weights.getElement(i,[]),j=indices.getElement(i,[]);
      assert(finite(p)&&finite(n)&&Math.abs(Math.hypot(...n)-1)<.02,'Nonfinite position or invalid normal');
      assert(finite(w)&&w.every(v=>v>=0&&v<=1)&&j.every(v=>Number.isInteger(v)&&v>=0&&v<joints.length),'Invalid skin weights/indices');
      const positives=w.filter(v=>v>0).length,residual=Math.abs(w.reduce((a,b)=>a+b,0)-1);
      maxInfluencesPerVertex=Math.max(maxInfluencesPerVertex,positives);maxWeightResidual=Math.max(maxWeightResidual,residual);
      assert(positives>=1&&positives<=4&&residual<.00001,'Every addon vertex must have1..4 normalized positive influences');
      positiveInfluences+=positives;
      const point=new Vector3(),seen=new Set();
      for(let channel=0;channel<4;channel++)if(w[channel]>0) {
        const joint=j[channel];assert(!seen.has(joint),'Duplicate positive joint');seen.add(joint);usedBones.add(jointNames[joint]);
        point.addScaledVector(new Vector3(...p).applyMatrix4(restSkin[joint]),w[channel]);
      }
      const world=point.toArray();
      world.forEach((v,axis)=>{bounds.min[axis]=Math.min(bounds.min[axis],v);bounds.max[axis]=Math.max(bounds.max[axis],v);});
    }
  }
  assert(triangles>0,'No accessory geometry');
  const materials=scene.listMaterials().map(material=>{
    const name=material.getName(),baseColor=material.getBaseColorFactor(),emission=material.getEmissiveFactor();
    assert(name.startsWith('OscarMech.')&&finite(baseColor)&&baseColor.every(v=>v>=0&&v<=1),'Invalid named accessory base color');
    assert(finite(emission)&&emission.every(v=>v>=0&&v<=1),'Accessory emission strength must remain at most one');
    for(const value of [material.getMetallicFactor(),material.getRoughnessFactor()])assert(Number.isFinite(value)&&value>=0&&value<=1,'Invalid PBR scalar');
    assert.equal(material.getAlphaMode(),'OPAQUE','Unexpected accessory transparency');
    return {name,baseColorFactor:baseColor,metallicFactor:material.getMetallicFactor(),roughnessFactor:material.getRoughnessFactor(),emissiveFactor:emission,doubleSided:material.getDoubleSided()};
  });
  assert.equal(new Set(materials.map(m=>m.name)).size,4,'Accessory materials must have unique names');
  bounds.min=rounded(bounds.min);bounds.max=rounded(bounds.max);bounds.size=rounded(bounds.max.map((v,i)=>v-bounds.min[i]));
  return {file,sha256:hash(bytes),bytes:bytes.length,triangles,vertices,meshes:1,skinnedRenderers:1,primitives:primitives.length,
    materials,materialCount:materials.length,bones:jointNames,boneCount:joints.length,usedBones:[...usedBones].sort(),renderNodes:[expectedNode],
    positiveInfluences,maxInfluencesPerVertex,maxWeightResidual,maxRestDifference,inverseBindSha256,inverseBindResidual,bounds,
    boneRest:joints.map(joint=>({name:joint.getName(),parent:joint.getParentNode()?.getName()??null,worldMatrix:rounded(joint.getWorldMatrix())})),
    animations:0,textures:0,cameras:0,lights:0};
}
function verifyExport(receipt,measured) {
  assert.equal(receipt.assetId,assetId);assert.equal(receipt.sha256,measured.sha256);assert.equal(receipt.bytes,measured.bytes);assert.equal(receipt.triangles,measured.triangles);
  assert.equal(receipt.sourceBones,165);assert.equal(receipt.maximumInfluences,measured.maxInfluencesPerVertex);assert(receipt.maximumInfluences<=4);assert.equal(receipt.originalUnchanged,true);
  assert(/^[a-f0-9]{64}$/.test(receipt.sourceSha256)&&/^[a-f0-9]{64}$/.test(receipt.originalSha256),'Source identities required');
  assert(Array.isArray(receipt.components)&&receipt.components.length&&receipt.components.every(c=>c.name.startsWith('OscarMech.')
    &&(measured.usedBones.includes(c.bone)||c.bone==='Surface-weighted segmented shell (maximum4)')),'Named authored components/binding policies required');
  assert.equal(new Set(receipt.components.map(c=>c.name)).size,receipt.components.length,'Duplicate authored component names');
  assert.deepEqual([...receipt.materials].sort(),measured.materials.map(m=>m.name).sort(),'Authored material inventory differs');
}
async function khronos(bytes) {
  let validator;
  try {validator=await import('gltf-validator');}
  catch(error) {if(error.code==='ERR_MODULE_NOT_FOUND')return {status:'NOT TESTED',reason:'gltf-validator is not installed'};throw error;}
  const api=validator.default??validator;
  const report=await api.validateBytes(new Uint8Array(bytes),{uri:file,maxIssues:1000});
  const folder=contained(root,options['report-dir']??'artifacts/oscar-dragon-intake/mechanical-v004','Validation report');
  assert(path.relative(root,folder).split(path.sep)[0]==='artifacts','Validation reports must stay in ignored artifacts');
  await mkdir(folder,{recursive:true});
  const reportPath=path.join(folder,`khronos-${hash(bytes).slice(0,16)}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
  await writeFile(reportPath,json(report),{flag:'wx'});
  assert.equal(report.issues.numErrors,0,`Khronos validation failed; see ${reportPath}`);
  return {status:'PASS',validatorVersion:report.validatorVersion,numErrors:0,numWarnings:report.issues.numWarnings,numInfos:report.issues.numInfos,
    report:path.relative(root,reportPath).split(path.sep).join('/')};
}
async function optionalSourcePin(row,label) {
  try {assert.equal((await stat(row.path)).size,row.bytes,`${label} length changed`);assert.equal(await hashFile(row.path),row.sha256,`${label} changed`);return 'VERIFIED';}
  catch(error){if(error.code==='ENOENT')return 'NOT AVAILABLE (ignored local source)';throw error;}
}

const base=await baseline();
if(options.verify) {
  const contract=JSON.parse(await readFile(destination(contractName),'utf8'));
  assert.equal(contract.schemaVersion,1);assert.equal(contract.assetId,assetId);assert.equal(contract.baseSha256,baseSha);
  assert.deepEqual(contract.dependencies,base.dependencies,'Pinned original baseline/receipt changed');
  for(const row of contract.files)await requireFile(row);
  assert.deepEqual(contract.files.map(row=>row.destination).sort(),[imported,exportName].sort(),'Accessory output inventory changed');
  const bytes=await readFile(destination(imported)),measured=await measure(bytes,base.contract);
  assert.deepEqual(contract.measurement,measured,'Accessory structural measurements changed');
  for(const [key,value]of Object.entries(measured))assert.deepEqual(contract[key],value,`Top-level measured field changed: ${key}`);
  const receipt=JSON.parse(await readFile(destination(exportName),'utf8'));verifyExport(receipt,measured);
  assert.equal(contract.sourceReceipt,exportName);assert.equal(contract.sourceReceiptSha256,hash(await readFile(destination(exportName))));
  assert.equal(contract.sourceSha256,receipt.sourceSha256);assert.equal(contract.sourceBlend,receipt.source);
  assert.deepEqual(contract.components,receipt.components);assert.equal(contract.componentCount,receipt.components.length);
  const localInputs={};for(const [label,row]of Object.entries(contract.localInputs))localInputs[label]=await optionalSourcePin(row,label);
  const validation=await khronos(bytes);
  console.log(JSON.stringify({result:'PASS',mode:'verified',sha256:measured.sha256,bytes:measured.bytes,triangles:measured.triangles,vertices:measured.vertices,
    skinnedRenderers:measured.skinnedRenderers,materials:measured.materials.length,bones:measured.boneCount,positiveInfluences:measured.positiveInfluences,
    maxInfluencesPerVertex:measured.maxInfluencesPerVertex,validation,localInputs,basePreserved:true,scenePromotion:'NOT PERFORMED'}));
} else {
  const sourceRoot=path.resolve(options['source-root']),masterRoot=path.resolve(options['master-root']);
  const source=contained(sourceRoot,options.source,'Source GLB');
  const receiptPath=contained(sourceRoot,options['export-receipt']??path.join(path.dirname(source),'export-receipt.json'),'Export receipt');
  const bytes=await readFile(source),rawReceipt=await readFile(receiptPath),receipt=JSON.parse(rawReceipt);
  const measured=await measure(bytes,base.contract);verifyExport(receipt,measured);
  const sourceBlend=contained(masterRoot,receipt.source,'Versioned Blender source'),originalBlend=contained(masterRoot,receipt.original,'Preserved Blender baseline');
  assert.equal(await hashFile(sourceBlend),receipt.sourceSha256,'Versioned source changed after export');
  assert.equal(await hashFile(originalBlend),receipt.originalSha256,'Original Blender source changed');
  assert.equal(receipt.originalSha256,base.contract.sourceSha256,'Addon must derive from the measured original full-weight source');
  const validation=await khronos(bytes),portableReceipt=json(receipt);
  const output=new Map([[imported,bytes],[exportName,portableReceipt]]);
  const contract={schemaVersion:1,assetId,baseFile,baseSha256:baseSha,...measured,measurement:measured,
    coordinateSystem:{metersPerUnit:1,sourceForward:'+Z',sourceUp:'+Y',sourceBasisYawDegrees:0},
    sourceReceipt:exportName,sourceReceiptSha256:hash(portableReceipt),sourceBlend:receipt.source,sourceSha256:receipt.sourceSha256,
    componentCount:receipt.components.length,components:receipt.components,dependencies:base.dependencies,
    localInputs:{candidate:{path:source,bytes:bytes.length,sha256:hash(bytes)},exportReceipt:{path:receiptPath,bytes:rawReceipt.length,sha256:hash(rawReceipt)},
      sourceBlend:{path:sourceBlend,bytes:(await stat(sourceBlend)).size,sha256:receipt.sourceSha256},
      originalBlend:{path:originalBlend,bytes:(await stat(originalBlend)).size,sha256:receipt.originalSha256}},
    files:[...output].map(([destination,body])=>({destination,bytes:body.length,sha256:hash(body)})),
    khronos:{...validation,report:undefined},
    scope:'Separate fitted mechanical accessories only, bounded to four influences. Original Oscar mesh, full weights, materials, clips and v005 intake remain unchanged. Unity binding/play/visual approval are separate.'};
  output.set(contractName,json(contract));
  const missing=[];
  for(const [name,body]of output) {
    const out=destination(name);
    try {assert((await readFile(out)).equals(body),`Refusing to overwrite changed intake ${name}; use a fresh version`);}
    catch(error){if(error.code!=='ENOENT')throw error;missing.push([out,body]);}
  }
  for(const [out,body]of missing){await mkdir(path.dirname(out),{recursive:true});await writeFile(out,body,{flag:'wx'});}
  console.log(JSON.stringify({result:'PASS',mode:'prepared',sha256:measured.sha256,bytes:measured.bytes,triangles:measured.triangles,vertices:measured.vertices,
    skinnedRenderers:measured.skinnedRenderers,materials:measured.materials.length,bones:measured.boneCount,validation,basePreserved:true,scenePromotion:'NOT PERFORMED'}));
}
