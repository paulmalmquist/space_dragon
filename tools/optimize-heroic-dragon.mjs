// Lossless vertex welding only. No prune/join/quantization or image changes.
// Replaces only this generator-owned candidate after verifying its receipt hash;
// retains the complete unwelded export alongside it and refuses changed outputs.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {weld} from '@gltf-transform/functions';
import {verifyHeroicDragon} from './verify-heroic-dragon.mjs';
const folder='assets/game/local/spacecraft/space-dragon-spacecraft/heroic-v005';
const final=`${folder}/dragon-heroic-v005.glb`, receiptPath=`${folder}/export-receipt.json`;
const hash=b=>createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(await readFile(receiptPath,'utf8')), original=await readFile(final);
assert.equal(hash(original),receipt.sha256,'Generated candidate differs from receipt; preserve edits and choose a fresh version');
if(receipt.optimization?.operation==='lossless vertex weld'){
  console.log(JSON.stringify(await verifyHeroicDragon(final)));process.exit(0);
}
async function preserve(path,bytes){
  try{assert((await readFile(path)).equals(bytes),`Refusing to overwrite changed generated output ${path}`);}
  catch(error){if(error.code!=='ENOENT')throw error;await writeFile(path,bytes,{flag:'wx'});}
}
const before=await verifyHeroicDragon(final),io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.read(final);
const textures=doc.getRoot().listTextures().map(t=>({name:t.getName(),bytes:Buffer.from(t.getImage())}));
await doc.transform(weld());
doc.getRoot().listTextures().forEach((t,i)=>{assert.equal(t.getName(),textures[i].name);assert(Buffer.from(t.getImage()).equals(textures[i].bytes),'Weld changed a texture');});
const bytes=Buffer.from(await io.writeBinary(doc)), trial=`${folder}/dragon-heroic-v005-weld-candidate.glb`;
await preserve(trial,bytes);const after=await verifyHeroicDragon(trial);
assert.equal(after.triangles,before.triangles);assert.equal(after.meshes,before.meshes);assert.equal(after.materials,before.materials);
const unwelded=`${folder}/dragon-heroic-v005-unwelded.glb`;await preserve(unwelded,original);
assert.equal(hash(await readFile(final)),receipt.sha256,'Candidate changed during weld');
await writeFile(final,bytes);
Object.assign(receipt,{sha256:after.sha256,bytes:after.bytes,optimization:{operation:'lossless vertex weld',unwelded,unweldedSha256:before.sha256,
  bytesBefore:before.bytes,bytesAfter:after.bytes,verticesBefore:before.vertices,verticesAfter:after.vertices,trianglesUnchanged:after.triangles,
  textures:'byte-identical',nodes:'all retained; no prune or join transforms'}});
await writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({result:'PASS',...receipt.optimization,sha256:after.sha256}));
