/** Local authoring export only. Never opens Unity or reads a player's save. */
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { readFile,writeFile,mkdir,readdir,stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { expectedImportedCounts } from './export-town-drive-scene.counts.mjs';
import { prepareUnityPedestrians, verifyPedestrianConversion } from './export-town-drive-scene.pedestrians.mjs';
const root=process.cwd(),out=path.join(root,'unity/SpaceDragon/Assets/SpaceDragon/TownDrive/Imported');
const args=process.argv.slice(2),value=name=>args[args.indexOf(name)+1],port=Number(args.includes('--port')?value('--port'):5281);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex'),files=new Map(),materials=new Map();
async function put(relative,bytes){const target=path.resolve(out,relative);if(!target.startsWith(out+path.sep))throw new Error('Export path outside Imported');await mkdir(path.dirname(target),{recursive:true});await writeFile(target,bytes);files.set(relative,{path:relative,bytes:bytes.length,sha256:digest(bytes)});}
function verifyLods(manifest){for(const item of [...manifest.vegetationInstances,...manifest.assets.flatMap(a=>a.nodeState)]){const levels=item.lods??[];for(let i=0;i<levels.length;i++)if(!Number.isFinite(levels[i].distance)||levels[i].distance<=0||(i>0&&levels[i].distance<=levels[i-1].distance))throw new Error(`Invalid ascending LODs: ${item.id??item.name}`);}}
async function verify(){const m=JSON.parse(await readFile(path.join(out,'town-drive-scene-v001.json'),'utf8'));for(const f of m.files){const b=await readFile(path.join(out,f.path));if(b.length!==f.bytes||digest(b)!==f.sha256)throw new Error(`Export differs: ${f.path}`);}for(const a of m.assets){const counts=expectedImportedCounts(readGlb(await readFile(path.join(out,a.path))).json);for(const [key,value]of Object.entries(counts))if(a[key]!==value)throw new Error(`Import count differs: ${a.id}.${key}`);}for(const a of m.pedestrianAssets??[]){const source=await readFile(path.join(out,a.sourcePath)),derived=await readFile(path.join(out,a.path));if(digest(source)!==a.sourceSha256||digest(derived)!==a.sha256)throw new Error(`Pedestrian source/derivative differs: ${a.id}`);await verifyPedestrianConversion(source,derived);}verifyLods(m);console.log(`Verified ${m.files.length} files, ascending LODs and expanded import counts; ${m.assets.length} geometry assets; ${m.pedestrianAssets?.length??0} compatible pedestrian rigs; ${m.vegetationInstances.length} vegetation parts`);}
if(args.includes('--verify')){await verify();process.exit(0);}
if(args.includes('--refresh-counts')){const target=path.join(out,'town-drive-scene-v001.json'),m=JSON.parse(await readFile(target,'utf8'));for(const a of m.assets)Object.assign(a,expectedImportedCounts(readGlb(await readFile(path.join(out,a.path))).json));await writeFile(target,JSON.stringify(m,null,2)+'\n');await verify();process.exit(0);}
if(args.includes('--refresh-pedestrians')){const target=path.join(out,'town-drive-scene-v001.json'),m=JSON.parse(await readFile(target,'utf8'));for(const f of m.files)files.set(f.path,f);m.pedestrianAssets=await prepareUnityPedestrians(out,put);m.files=[...files.values()].sort((a,b)=>a.path.localeCompare(b.path));await writeFile(target,JSON.stringify(m,null,2)+'\n');await verify();process.exit(0);}
const metadataOnly=args.includes('--refresh-metadata');
const previousManifest=metadataOnly?JSON.parse(await readFile(path.join(out,'town-drive-scene-v001.json'),'utf8')):null;
if(previousManifest)for(const input of previousManifest.inputs)if(digest(await readFile(path.join(root,input.path)))!==input.sha256)throw new Error(`Source changed; full export required: ${input.path}`);
const align=n=>(n+3)&~3;
function readGlb(bytes){if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2)throw new Error('Expected GLB2');const jsonLength=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8'));const binHeader=20+jsonLength;return{json,bin:bytes.subarray(binHeader+8,binHeader+8+bytes.readUInt32LE(binHeader))};}
function writeGlb(json,bin){const raw=Buffer.from(JSON.stringify(json)),js=Buffer.alloc(align(raw.length),32);raw.copy(js);const binary=Buffer.alloc(align(bin.length));bin.copy(binary);const result=Buffer.alloc(12+8+js.length+8+binary.length);result.writeUInt32LE(0x46546c67,0);result.writeUInt32LE(2,4);result.writeUInt32LE(result.length,8);result.writeUInt32LE(js.length,12);result.writeUInt32LE(0x4e4f534a,16);js.copy(result,20);result.writeUInt32LE(binary.length,20+js.length);result.writeUInt32LE(0x004e4942,24+js.length);binary.copy(result,28+js.length);return result;}
async function processGlb(relative,bytes){
  const {json,bin}=readGlb(bytes),imageViews=new Set(),texturePaths=[];
  // Babylon's custom instance tint is not a standard glTF material attribute.
  // Bake static police-paint overrides into a shared derivative, preserving the source template.
  const tinted=new Map();
  for(const node of json.nodes??[])if(node.mesh!==undefined&&node.extras?.exportInstanceColor){
    const tint=node.extras.exportInstanceColor,original=json.meshes[node.mesh],clone={...original,primitives:original.primitives.map(primitive=>({...primitive}))};
    for(const primitive of clone.primitives){
      const key=`${primitive.material}:${tint.join(',')}`;
      if(!tinted.has(key)){
        const material=structuredClone(json.materials[primitive.material]),base=material.pbrMetallicRoughness?.baseColorFactor??[1,1,1,1];
        material.name=`${material.name}.instance-${digest(Buffer.from(tint.join(','))).slice(0,8)}`;
        material.pbrMetallicRoughness={...material.pbrMetallicRoughness,baseColorFactor:base.map((v,i)=>v*tint[i])};
        tinted.set(key,json.materials.length);json.materials.push(material);
      }
      primitive.material=tinted.get(key);
    }
    node.mesh=json.meshes.length;json.meshes.push(clone);
  }
  for(const image of json.images??[]){
    if(image.bufferView===undefined)throw new Error('Unexpected external image from Babylon export');
    const view=json.bufferViews[image.bufferView],data=bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);
    const png=await sharp(data).png().toBuffer(),file=`Textures/${digest(png).slice(0,24)}.png`;if(!files.has(file))await put(file,png);
    texturePaths.push(file);imageViews.add(image.bufferView);delete image.bufferView;image.uri=`../${file}`;image.mimeType='image/png';
  }
  const remap=new Map(),views=[],parts=[];let offset=0;
  for(const [index,view]of (json.bufferViews??[]).entries())if(!imageViews.has(index)){
    const data=bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength),part=Buffer.alloc(align(data.length));data.copy(part);parts.push(part);
    remap.set(index,views.length);views.push({...view,buffer:0,byteOffset:offset});offset+=part.length;
  }
  for(const accessor of json.accessors??[]){if(accessor.bufferView!==undefined)accessor.bufferView=remap.get(accessor.bufferView);if(accessor.sparse){accessor.sparse.indices.bufferView=remap.get(accessor.sparse.indices.bufferView);accessor.sparse.values.bufferView=remap.get(accessor.sparse.values.bufferView);}}
  json.bufferViews=views;json.buffers=[{byteLength:offset}];
  const texture=(slot,info)=>{if(!info)return null;const t=json.textures[info.index],transform=info.extensions?.KHR_texture_transform??{};return{slot,path:texturePaths[t.source],uScale:transform.scale?.[0]??1,vScale:transform.scale?.[1]??1,uOffset:transform.offset?.[0]??0,vOffset:transform.offset?.[1]??0,rotation:transform.rotation??0,texCoord:transform.texCoord??info.texCoord??0,normalScale:info.scale??1};};
  for(const material of json.materials??[]){
    const pbr=material.pbrMetallicRoughness??{},color=pbr.baseColorFactor??[1,1,1,1],emission=material.emissiveFactor??[0,0,0];
    const textures=[texture('baseColor',pbr.baseColorTexture),texture('metallicRoughness',pbr.metallicRoughnessTexture),texture('normal',material.normalTexture),texture('emissive',material.emissiveTexture),texture('occlusion',material.occlusionTexture)].filter(Boolean);
    const record={name:material.name,baseColor:{r:color[0],g:color[1],b:color[2],a:color[3]},metallic:pbr.metallicFactor??1,roughness:pbr.roughnessFactor??1,
      emissiveFactor:{r:emission[0],g:emission[1],b:emission[2]},emissiveStrength:material.extensions?.KHR_materials_emissive_strength?.emissiveStrength??1,
      alphaMode:material.alphaMode??'OPAQUE',alphaCutoff:material.alphaCutoff??.5,doubleSided:!!material.doubleSided,unlit:!!material.extensions?.KHR_materials_unlit,textures};
    const mr=textures.find(t=>t.slot==='metallicRoughness');
    if(mr){
      const {data,info}=await sharp(await readFile(path.join(out,mr.path))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      for(let i=0;i<data.length;i+=4){const metal=Math.round(data[i+2]*record.metallic),smooth=Math.round(255-data[i+1]*record.roughness);data[i]=data[i+1]=data[i+2]=metal;data[i+3]=smooth;}
      const packed=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer(),file=`Textures/${digest(packed).slice(0,24)}-metallic-smoothness.png`;if(!files.has(file))await put(file,packed);
      record.textures.push({...mr,slot:'metallicSmoothness',path:file});
    }
    const previous=materials.get(record.name);if(previous&&JSON.stringify(previous)!==JSON.stringify(record))throw new Error(`Non-deterministic duplicate material ${record.name}`);
    materials.set(record.name,record);
  }
  const compact=writeGlb(json,Buffer.concat(parts));await put(relative,compact);
  return{bytes:compact.length,sha256:digest(compact),gltfMeshes:json.meshes?.length??0,gltfNodes:json.nodes?.length??0,...expectedImportedCounts(json),materialNames:(json.materials??[]).map(m=>m.name),externalTextureCount:json.images?.length??0,extensionsUsed:json.extensionsUsed??[]};
}
async function collectBody(request){const parts=[];for await(const part of request){parts.push(part);if(parts.reduce((n,p)=>n+p.length,0)>200*1024*1024)throw new Error('Export upload exceeds200MB');}return Buffer.concat(parts);}
let browserManifest;
const server=await createServer({root,configFile:false,base:'/space-dragon/',publicDir:path.join(root,'public'),cacheDir:path.join(root,'node_modules/.vite-town-export'),
  optimizeDeps:{noDiscovery:true,include:[]},
  server:{host:'127.0.0.1',port,strictPort:true,fs:{strict:true,allow:[root],deny:['**/.git/**','**/.env*','**/assets/reference/**','**/assets/source/**','**/ideas/**']}},
  plugins:[{name:'town-drive-authoring-readback',enforce:'pre',transform(code,id){
    if(!id.replaceAll('\\','/').endsWith('/src/game/drive/traffic-visuals.ts'))return;
    const needle='function update(vehicles: readonly TrafficVisualVehicle[], camera: { x: number; z: number }) {';
    if(!code.includes(needle))throw new Error('Traffic authoring readback hook no longer matches source');
    return code.replace(needle,needle+' (globalThis as any).__TownExportTrafficInput?.(vehicles);');
  }},{name:'town-drive-authoring-export',configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
    const url=new URL(req.url,'http://127.0.0.1'),requestPath=url.pathname.replace(/^\/space-dragon\//,'/');
    if(requestPath==='/__town-export'&&req.method==='GET'){res.setHeader('Content-Type','text/html');res.end(`<!doctype html><canvas width="384" height="256"></canvas><script>globalThis.__townExportMetadataOnly=${metadataOnly}</script><script type="module" src="/space-dragon/tools/unity/export-town-drive-scene.browser.ts"></script>`);return;}
    if(requestPath==='/__town-export/previous'&&req.method==='GET'&&previousManifest){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(previousManifest.assets));return;}
    if(requestPath!=='/__town-export/write'||req.method!=='POST')return next();
    try{const relative=url.searchParams.get('path');if(!relative||relative.includes('..')||!/^Meshes\/[\w.-]+\.glb$|^scene-browser-manifest\.json$/.test(relative))throw new Error('Invalid export destination');
      const body=await collectBody(req);let result;
      if(relative.endsWith('.glb')){if(metadataOnly)throw new Error('Geometry writes forbidden during metadata refresh');result=await processGlb(relative,body);}else{browserManifest=JSON.parse(body.toString('utf8'));result={accepted:true};}
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));
    }catch(error){res.statusCode=500;res.end(error.stack);}
  });}}]});
await server.listen();let browser;
try{
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  const page=await browser.newPage({viewport:{width:512,height:384}}),errors=[];let rejectPage;
  const pageFailure=new Promise((_,reject)=>{rejectPage=reject;});
  page.on('pageerror',error=>{errors.push(error.message);console.error('PAGE ERROR',error.message);rejectPage(error);});page.on('console',message=>{if(message.type()==='error'||message.text().startsWith('EXPORTED'))console.log(message.text());});
  const response=await page.goto(`http://127.0.0.1:${port}/space-dragon/__town-export`);if(response.status()!==200)throw new Error(`Authoringpage HTTP${response.status()}`);
  await Promise.race([page.waitForFunction(()=>window.__townExportDone===true,{},{timeout:900000}),pageFailure]);
  if(errors.length||!browserManifest)throw new Error(`Export failed: ${errors.join('; ')}`);
  if(metadataOnly){
    const manifest={...previousManifest,...browserManifest};delete manifest.materialFlags;
    if(manifest.assets.length!==previousManifest.assets.length||manifest.vegetationInstances.length!==previousManifest.vegetationInstances.length)throw new Error('Metadata refresh changed asset or vegetation counts');
    if(JSON.stringify(manifest.pedestrianAssets)!==JSON.stringify(previousManifest.pedestrianAssets)||JSON.stringify(manifest.files)!==JSON.stringify(previousManifest.files))throw new Error('Metadata refresh must preserve compatible pedestrian derivatives and file inventory');
    verifyLods(manifest);await writeFile(path.join(out,'town-drive-scene-v001.json'),JSON.stringify(manifest,null,2)+'\n');await verify();
    console.log('Metadata-only refresh complete; geometry, materials and file hashes unchanged.');
  }else{
  for(const directory of ['vegetation','pedestrians','materials'])for(const name of (await readdir(path.join(root,'public/assets/drive',directory))).sort()){
    if(!/\.(glb|json|txt)$/.test(name))continue;await put(`Sources~/${directory}/${name}`,await readFile(path.join(root,'public/assets/drive',directory,name)));
  }
  const pedestrianAssets=await prepareUnityPedestrians(out,put);
  const sourceFiles=['world','development','neighborhood-world','neighborhood-context-world','neighborhood-context','route','junctions','junction-world','car','traffic-visuals','vegetation','pedestrian-visuals','materials','house'].map(name=>`src/game/drive/${name}.ts`);
  const inputs=[];for(const file of sourceFiles){const data=await readFile(path.join(root,file));inputs.push({path:file,sha256:digest(data),bytes:data.length});}
  const flags=new Map(browserManifest.materialFlags.map(record=>[record.name,record]));
  const manifest={...browserManifest,pedestrianAssets,sourceRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),inputs,
    materialDelivery:'GLB geometry plus external shared PNGs; original glTF PBR and UV transforms retained; metallicSmoothness is an additional URP derivative',
    materials:[...materials.values()].map(record=>({...record,...flags.get(record.name)})).sort((a,b)=>a.name.localeCompare(b.name)),files:[...files.values()].sort((a,b)=>a.path.localeCompare(b.path))};
  delete manifest.materialFlags;await put('town-drive-scene-v001.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));
  console.log(JSON.stringify({assets:manifest.assets.length,files:manifest.files.length,materials:manifest.materials.length,vegetationParts:manifest.vegetationInstances.length,parked:manifest.parkedVehicles.length,obstacles:manifest.obstacles.length,bytes:manifest.files.reduce((n,f)=>n+f.bytes,0)},null,2));
  }
}finally{await browser?.close();await server.close();}
