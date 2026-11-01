// Additive heroic intake. Retains original v001/v002 receipts, contracts and GLBs.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyHeroicDragon} from '../verify-heroic-dragon.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
process.chdir(root);
const target='unity/SpaceDragon/Assets/SpaceDragon/Dogfight';
const source='assets/game/local/spacecraft/space-dragon-spacecraft/heroic-v005/dragon-heroic-v005.glb';
const imported='Imported/dragon-heroic-v005.glb';
const verify=process.argv.includes('--verify');
if(process.argv.slice(2).some(a=>a!=='--verify'))throw Error('Usage: prepare-heroic-dragon.mjs [--verify]');
const hash=b=>createHash('sha256').update(b).digest('hex');
const json=o=>Buffer.from(JSON.stringify(o,null,2)+'\n');
if(verify){
  // A checkout needs the prepared runtime inputs, not ignored editable/local exports.
  const receipt=JSON.parse(await readFile(`${target}/asset-receipt-v003.json`,'utf8'));
  if(receipt.schemaVersion!==3||receipt.files?.length!==17||receipt.sourceFiles?.length!==12)throw Error('Unexpected heroic intake receipt');
  const absoluteRoot=path.resolve(target);
  for(const file of receipt.files){
    const destination=path.resolve(target,file.destination);
    if(!destination.startsWith(absoluteRoot+path.sep))throw Error('Receipt path escapes Dogfight intake');
    const body=await readFile(destination);
    if(body.length!==file.bytes||hash(body)!==file.sha256)throw Error(`Heroic intake changed: ${file.destination}`);
  }
  const measured=JSON.parse(await readFile(`${target}/heroic-contract-v005.json`,'utf8'));
  const checked=await verifyHeroicDragon(`${target}/${imported}`);
  if(checked.sha256!==measured.sha256||checked.triangles!==measured.triangles||checked.bytes!==measured.bytes)throw Error('Heroic measured identity changed');
  console.log(JSON.stringify({result:'PASS',mode:'verified',candidate:imported,sha256:checked.sha256,bytes:checked.bytes,triangles:checked.triangles,previousReceiptsPreserved:true}));
  process.exit(0);
}
const bytes=await readFile(source), verified=await verifyHeroicDragon(source);
const sourceReceipt=JSON.parse(await readFile(path.join(path.dirname(source),'export-receipt.json'),'utf8'));
if(sourceReceipt.sha256!==hash(bytes)||sourceReceipt.triangles!==verified.triangles)throw Error('Candidate differs from Blender export receipt. Preserve and select a fresh version.');
const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
const previous=JSON.parse(await readFile(`${target}/asset-receipt-v002.json`,'utf8'));
const oldMaterials=JSON.parse(await readFile(`${target}/material-contract.json`,'utf8'));
const models=[{file:path.basename(imported),sha256:verified.sha256,materials:gltf.materials.map((m,index)=>{
  const extension=m.extensions?.KHR_materials_emissive_strength, factor=m.emissiveFactor??[0,0,0], strength=extension?.emissiveStrength??1;
  if(!Number.isFinite(strength)||strength<0||factor.some(v=>!Number.isFinite(v)||v<0))throw Error('Invalid emission');
  return {index,name:m.name??`material_${index}`,hasEmissionStrength:extension!==undefined,sourceFactor:factor,strength,effectiveFactor:factor.map(v=>v*strength),
    clearcoat:m.extensions?.KHR_materials_clearcoat?.clearcoatFactor??0,normalScale:m.normalTexture?.scale??1};
})},oldMaterials.models.find(m=>m.file==='drone.glb')];
if(!models[1])throw Error('Original drone material contract missing');
const output=new Map([[imported,bytes],['material-contract-v003.json',json({schemaVersion:1,note:'Heroic v005 plus unchanged drone. Prior contract remains immutable.',models})],
  ['heroic-contract-v005.json',json({schemaVersion:1,file:path.basename(imported),sha256:verified.sha256,bytes:verified.bytes,triangles:verified.triangles,
    authoredArmor:true,sourceBlend:sourceReceipt.source,sourceSha256:sourceReceipt.sourceSha256,verification:verified})]]);
const receipt={schemaVersion:3,previousReceipt:'asset-receipt-v002.json',scope:'Owner-authorized heroic Blender art; additive Unity candidate, no release approval.',
  sourceFiles:[...previous.sourceFiles,{source,destination:imported,bytes:bytes.length,sha256:hash(bytes)}],
  files:[...previous.files,{destination:'asset-receipt-v002.json',bytes:(await readFile(`${target}/asset-receipt-v002.json`)).length,sha256:hash(await readFile(`${target}/asset-receipt-v002.json`))},
    ...[...output].map(([destination,body])=>({destination,bytes:body.length,sha256:hash(body)}))]};
output.set('asset-receipt-v003.json',json(receipt));
const missing=[];
for(const [name,body] of output){
  const destination=path.join(target,name);
  try{if(!(await readFile(destination)).equals(body))throw Error(`Refusing to overwrite changed heroic intake ${destination}; use a new version.`);}
  catch(error){if(error.code!=='ENOENT'||verify)throw error;missing.push([destination,body]);}
}
for(const [destination,body] of missing){await mkdir(path.dirname(destination),{recursive:true});await writeFile(destination,body,{flag:'wx'});}
console.log(JSON.stringify({result:'PASS',mode:verify?'verified':'prepared',candidate:imported,sha256:verified.sha256,bytes:verified.bytes,triangles:verified.triangles,previousReceiptsPreserved:true}));
