import { GLTF2Export } from '@babylonjs/serializers/glTF/2.0/glTFSerializer';
import '@babylonjs/serializers/glTF/2.0/Extensions/EXT_mesh_gpu_instancing';
import '@babylonjs/serializers/glTF/2.0/Extensions/KHR_materials_unlit';
import '@babylonjs/serializers/glTF/2.0/Extensions/KHR_materials_clearcoat';
import '@babylonjs/serializers/glTF/2.0/Extensions/KHR_materials_emissive_strength';
import '@babylonjs/serializers/glTF/2.0/Extensions/KHR_texture_transform';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math';
import { createDriveWorld } from '../../src/game/drive/world';
import { createDriveState } from '../../src/game/drive/simulation';
import { ROUTE, pointAtDistance } from '../../src/game/drive/route';
import { NEIGHBORHOOD } from '../../src/game/drive/neighborhood';
import { MINIVAN_DIMENSIONS, MINIVAN_DRIVER_EYE } from '../../src/game/drive/minivan-config';
import { parseHouseLayout, FICTIONAL_HOUSE } from '../../src/game/drive/house';
import referenceHouse from '../../src/game/drive/reference-house.json';

const post=async(path:string,body:BodyInit)=>{
  const response=await fetch(`/space-dragon/__town-export/write?path=${encodeURIComponent(path)}`,{method:'POST',body});
  if(!response.ok)throw new Error(await response.text());return response.json();
};
const vec=(p:{x:number;y:number;z:number})=>({x:p.x,y:p.y,z:p.z});
const quat=(q:{x:number;y:number;z:number;w:number})=>({x:q.x,y:q.y,z:q.z,w:q.w});
const metadataOnly=!!(globalThis as any).__townExportMetadataOnly;
const previousAssets:any[]=metadataOnly?await (await fetch('/space-dragon/__town-export/previous')).json():[];
function lodLevels(mesh:Mesh){
  if(mesh.useLODScreenCoverage)throw new Error(`Review screen-coverage LOD conversion: ${mesh.name}`);
  const levels=mesh.getLODLevels().map(level=>({distance:level.distanceOrScreenCoverage,meshName:level.mesh?.name??''})).sort((a,b)=>a.distance-b.distance);
  for(let i=0;i<levels.length;i++)if(!Number.isFinite(levels[i].distance)||levels[i].distance<=0||(i>0&&levels[i].distance<=levels[i-1].distance))throw new Error(`Invalid distance LOD on ${mesh.name}`);
  return levels;
}
const sceneManifest:any={schemaVersion:1,units:'metres',sourceCoordinates:'left-handed +X east +Y up +Z north; yaw0=+Z',
  exporter:'@babylonjs/serializers 9.33.0',assets:[],vegetationInstances:[],parkedVehicles:[],obstacles:[],
  minivan:{dimensions:MINIVAN_DIMENSIONS,driverEye:MINIVAN_DRIVER_EYE,rootName:'drive.car',forward:{x:0,y:0,z:1},
    wheelSteerPrefix:'drive.car.wheel-steer.',wheelSpinPrefix:'drive.car.wheel-spin.',steeringWheelName:'drive.car.steering-wheel',
    cabinDetailNames:['drive.car.cabin-detail','drive.car.steering-detail'],driverHeadrestName:'drive.car.driver-headrest',
    glazing:{materialName:'drive.car.clear-front-glazing',cabinAlpha:.10,exteriorAlpha:.55,cabinColor:'#c3d2d3',exteriorColor:'#273840'}},
  lod:{palm:[95,170,390],canopy:[72,170,390],hedge:[48,170,390],developmentNear:125,developmentFar:360,trafficNear:75,trafficFar:310},
  anchors:[{name:'TownDrive.Axis.Origin',assetId:'minivan-detailed',scope:'vehicle',position:{x:0,y:0,z:0}},{name:'TownDrive.Axis.East',assetId:'minivan-detailed',scope:'vehicle',position:{x:10,y:0,z:0}},{name:'TownDrive.Axis.North',assetId:'minivan-detailed',scope:'vehicle',position:{x:0,y:0,z:10}}]};
const world=await createDriveWorld(document.querySelector('canvas')!,{houseLayout:parseHouseLayout(referenceHouse)??FICTIONAL_HOUSE,reducedMotion:true});
const scene=world.scene,state=createDriveState(),traffic={vehicles:[],elapsedSeconds:0,accumulatorSeconds:0};
scene.animationGroups.forEach(group=>group.stop());
const exported=new Set<string>(),plants=new Map<string,any>(),parked=new Map<string,any>(),obstacles=new Map<string,any>();
(globalThis as any).__TownExportTrafficInput=(vehicles:any[])=>{for(const vehicle of vehicles)if(vehicle.id.startsWith('parked.'))parked.set(vehicle.id,vehicle);};
function ancestors(node:any){const all:any[]=[];for(let p=node;p;p=p.parent)all.push(p);return all;}
function lineage(node:any,root:any){return node===root||ancestors(node).includes(root);}
function materialFlags(material:any){return{name:material.name,disableDepthWrite:!!material.disableDepthWrite,
  normalScale:material.bumpTexture?.level??1,normalInvertX:!!material.invertNormalMapX,normalInvertY:!!material.invertNormalMapY,
  castShadow:!(/clear-front-glazing|rear-privacy-glazing/.test(material.name)),unlit:!!(material.unlit||material.disableLighting)};}
const flags=new Map<string,any>();
async function exportNodes(id:string,kind:string,roots:any[],options:any={}){
  if(exported.has(id))return;
  const selected=new Set<any>(),parents=new Set<any>();
  for(const root of roots){for(const node of [root,...root.getDescendants(false)]){
    if(options.filter&&!options.filter(node))continue;selected.add(node);
  }}
  for(const node of selected)for(const ancestor of ancestors(node))parents.add(ancestor);
  for(const mesh of scene.meshes)if(selected.has(mesh)&&mesh.material){
    flags.set(mesh.material.name,materialFlags(mesh.material));
    if(mesh instanceof InstancedMesh&&mesh.instancedBuffers?.color)mesh.metadata={...mesh.metadata,exportInstanceColor:mesh.instancedBuffers.color.asArray()};
  }
  const meshes=scene.meshes.filter(mesh=>selected.has(mesh)&&mesh.getTotalVertices()>0);
  for(const node of parents)node.computeWorldMatrix?.(true);
  const requiredNodes=[...selected].filter(node=>node instanceof TransformNode&&!(node instanceof Mesh)&&!(node instanceof InstancedMesh)).map(node=>node.name).sort();
  const nodeState=meshes.map(mesh=>({name:mesh.name,enabled:mesh.isEnabled(),visible:mesh.isVisible,
    materialName:mesh.material?.name??'',castShadow:mesh.metadata?.castShadow!==false,metadata:mesh.metadata??{},
    lods:mesh instanceof Mesh?lodLevels(mesh):[]}));
  const path=`Meshes/${id}.glb`,sourceTriangles=meshes.reduce((n,m)=>n+m.getTotalIndices()/3,0);
  let evidence:any;
  if(metadataOnly){
    const prior=previousAssets.find(asset=>asset.id===id);
    if(!prior||prior.sourceMeshCount!==meshes.length||prior.sourceTriangles!==sourceTriangles)throw new Error(`Geometry changed during metadata-only refresh: ${id}`);
    const {nodeState:oldState,requiredNodes:oldNodes,...unchanged}=prior;evidence=unchanged;
  }else{
    const glb=await GLTF2Export.GLBAsync(scene,id,{exportWithoutWaitingForScene:true,exportUnusedUVs:true,removeNoopRootNodes:false,
    shouldExportNode:node=>parents.has(node),shouldExportAnimation:()=>false,metadataSelector:metadata=>metadata?.development||metadata?.neighborhood||metadata?.junction?metadata:undefined});
    const blob=glb.glTFFiles[Object.keys(glb.glTFFiles).find(name=>name.endsWith('.glb'))!] as Blob;
    if(!blob)throw new Error(`Serializer returned no GLB for ${id}`);
    evidence=await post(path,blob);
  }
  const record={id,kind,path,rootName:roots[0]?.name??'',sourceMeshCount:meshes.length,
    sourceTriangles,requiredNodes,nodeState,...options.meta,...evidence};
  sceneManifest.assets.push(record);exported.add(id);console.log(`EXPORTED ${id} ${record.sourceMeshCount} meshes`);
}
function collectPlacements(){
  for(const mesh of scene.meshes){
    if(!(mesh instanceof InstancedMesh)||!mesh.name.startsWith('drive.vegetation.'))continue;
    const parent=ancestors(mesh).find(node=>/^drive\.chunk\.\d+$/.test(node.name))?.name??'drive.home.neighborhood';
    const source=mesh.sourceMesh,kind=mesh.name.split('.')[2],p=mesh.position;
    const rotation=mesh.rotationQuaternion??Quaternion.FromEulerVector(mesh.rotation),key=[parent,source.name,p.x,p.y,p.z,mesh.scaling.x,mesh.scaling.y,mesh.scaling.z,...rotation.asArray()].join('|');
    plants.set(key,{id:key,assetId:`vegetation-${kind}`,meshName:source.name,parentChunk:parent,position:vec(p),rotationQuaternion:quat(rotation),scale:vec(mesh.scaling),
      lods:lodLevels(source)});
  }
  for(const vehicle of world.metrics().traffic.vehicles)if(vehicle.id.startsWith('parked.'))parked.set(vehicle.id,vehicle);
  for(const obstacle of world.obstacles)if(!obstacle.id.startsWith('traffic.')&&!obstacle.id.startsWith('parked.'))obstacles.set(`${obstacle.id}|${obstacle.x}|${obstacle.z}`,obstacle);
}
// Capture all source plant tiers once after Babylon has baked the original GLB transforms.
for(const kind of ['palm','canopy','hedge']){
  const names=scene.meshes.filter(mesh=>mesh instanceof Mesh&&mesh.getTotalVertices()>0&&new RegExp(`^${kind}\\.`).test(mesh.name));
  if(!names.length)throw new Error(`Missing prepared vegetation template ${kind}`);
  const named=new Set<any>();for(const mesh of names)if(mesh.material&&!named.has(mesh.material)){named.add(mesh.material);mesh.material.name=`drive.export.vegetation.${kind}.${mesh.material.name}.${named.size}`;}
  await exportNodes(`vegetation-${kind}`,'vegetation',names);
}
// Preserve source templates and material/LOD names, not whichever NPCs happen to be nearby.
for(const kind of ['sedan','suv','van']){
  const nodes=scene.meshes.filter(mesh=>mesh.name.startsWith(`drive.traffic.template.${kind}.`));
  await exportNodes(`traffic-${kind}`,'traffic',nodes);
}
world.cameraRig.setMode('dashboard');world.update(state,0,traffic as any,{steer:0,brake:0,throttle:0,paused:true});
world.cameraRig.setMode('chase');world.update(state,0,traffic as any,{steer:0,brake:0,throttle:0,paused:true});
world.car.position.setAll(0);world.car.rotation.setAll(0);world.car.computeWorldMatrix(true);
for(const anchor of sceneManifest.anchors){const node=new TransformNode(anchor.name,scene);node.parent=world.car;node.position.copyFromFloats(anchor.position.x,anchor.position.y,anchor.position.z);}
const eye=new TransformNode('TownDrive.DriverEye',scene);eye.parent=world.car;eye.position.set(MINIVAN_DRIVER_EYE.x,MINIVAN_DRIVER_EYE.y,MINIVAN_DRIVER_EYE.z);
await exportNodes('minivan-detailed','minivan',[world.car]);
sceneManifest.minivan.nodes=sceneManifest.assets.find((asset:any)=>asset.id==='minivan-detailed').requiredNodes;
const home=scene.getTransformNodeByName('drive.home.neighborhood')!;
await exportNodes('home-neighborhood','neighborhood',[home],{filter:(node:any)=>!node.name.startsWith('drive.vegetation.')&&!lineage(node,scene.getTransformNodeByName('drive.house.dollhouse'))});
const interior=scene.getTransformNodeByName('drive.house.dollhouse');if(interior)await exportNodes('home-interior','interior',[interior]);
for(const root of scene.transformNodes.filter(node=>node.name.startsWith('drive.junction.')&&!node.parent))await exportNodes(root.name.replace(/^drive\./,''),'junction',[root]);
const worldAnchors=new TransformNode('TownDrive.WorldAnchors',scene);
for(const [name,position]of [['Spawn',ROUTE.spawn],['GreenIslandWinston',NEIGHBORHOOD.junctions[1]],['GateHypoluxo',NEIGHBORHOOD.hypoluxo.center]] as const){
  const node=new TransformNode(`TownDrive.World.${name}`,scene);node.parent=worldAnchors;node.position.set(position.x,0,position.z);
  sceneManifest.anchors.push({name:node.name,assetId:'terrain',scope:'world',position:{x:position.x,y:0,z:position.z}});
}
await exportNodes('terrain','terrain',[scene.getMeshByName('drive.terrain')!,worldAnchors]);
// Moving an export-only state triggers exactly the original streaming builders. No save/UI is loaded.
for(let s=0;s<ROUTE.length;s+=100){
  const at=pointAtDistance(s);Object.assign(state,{x:at.x,z:at.z,yaw:at.yaw,routeS:s,speed:0,elapsedSeconds:0});
  world.update(state,0,traffic as any,{steer:0,brake:0,throttle:0,paused:true});collectPlacements();
  for(const root of scene.transformNodes.filter(node=>/^drive\.chunk\.\d+$/.test(node.name))){
    const index=Number(root.name.split('.').at(-1));
    await exportNodes(`road-chunk-${String(index).padStart(3,'0')}`,'roadChunk',[root],{filter:(node:any)=>!node.name.startsWith('drive.vegetation.'),meta:{chunkIndex:index,fromS:index*100,toS:Math.min((index+1)*100,ROUTE.visibleRoadSpans[0].toS)}});
  }
}
collectPlacements();
sceneManifest.vegetationInstances=[...plants.values()].sort((a,b)=>a.id.localeCompare(b.id));
sceneManifest.parkedVehicles=[...parked.values()].sort((a,b)=>a.id.localeCompare(b.id));
sceneManifest.obstacles=[...obstacles.values()].sort((a,b)=>a.id.localeCompare(b.id)||a.x-b.x||a.z-b.z);
sceneManifest.materialFlags=[...flags.values()].sort((a,b)=>a.name.localeCompare(b.name));
sceneManifest.metrics=world.metrics();
await post('scene-browser-manifest.json',JSON.stringify(sceneManifest));
world.dispose();(window as any).__townExportDone=true;
