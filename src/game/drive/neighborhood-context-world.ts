import { Color3, Vector3 } from '@babylonjs/core/Maths/math';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import type { Material } from '@babylonjs/core/Materials/material';
import type { Scene } from '@babylonjs/core/scene';
import type { createDriveMaterials } from './materials';
import type { createRoadsideDevelopment } from './development';
import type { DriveVegetationPlacement } from './vegetation';
import { NEIGHBORHOOD_CONTEXT, neighborhoodContextOwnsLand, neighborhoodContextRoadContains, neighborhoodWaterContains, triangulateNeighborhoodPolygon } from './neighborhood-context';
import { nearestRoutePoint } from './route';
import { junctionInteriorContains } from './junctions';

interface Batch { material:Material; positions:number[];normals:number[];uvs:number[];indices:number[] }
/** Public-map context stays scenery: exact shore/street shapes, estimated original houses. */
export function createNeighborhoodContextWorld(scene:Scene,palette:ReturnType<typeof createDriveMaterials>,development:ReturnType<typeof createRoadsideDevelopment>){
  const root=new TransformNode('drive.home.mapped-context',scene),batches=new Map<string,Batch>(),meshes:Mesh[]=[];
  const plants:DriveVegetationPlacement[]=[],obstacles:{id:string;x:number;z:number;radius:number}[]=[],parkedCars:ReturnType<typeof development.buildLots>['parkedCars']=[];
  const water=new PBRMaterial('drive.neighborhood.lake-water',scene);water.albedoColor=Color3.FromHexString('#527c77').toLinearSpace();water.metallic=.12;water.roughness=.19;water.environmentIntensity=1.0;water.indexOfRefraction=1.333;water.backFaceCulling=false;
  water.clearCoat.isEnabled=true;water.clearCoat.intensity=.55;water.clearCoat.roughness=.12;
  const wave=new DynamicTexture('drive.neighborhood.water-normal',{width:128,height:128},scene,true),ctx=wave.getContext() as unknown as CanvasRenderingContext2D,pixels=ctx.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const i=(y*128+x)*4,nx=Math.sin((x+y*.35)*Math.PI/16)*.10+Math.sin((x-y)*Math.PI/8)*.035,nz=Math.cos((y-x*.23)*Math.PI/8)*.08;
    pixels.data[i]=128+nx*127;pixels.data[i+1]=128+nz*127;pixels.data[i+2]=254;pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);wave.update(false);wave.gammaSpace=false;wave.wrapU=wave.wrapV=1;wave.level=.38;water.bumpTexture=wave;
  const bank=palette.grass.clone('drive.neighborhood.damp-bank')!;bank.albedoColor=Color3.FromHexString('#8a8b59').toLinearSpace();bank.roughness=1;
  function batch(material:Material,x:number,z:number){
    const key=`${Math.floor(x/90)}.${Math.floor(z/90)}.${material.uniqueId}`;let value=batches.get(key);
    if(!value){value={material,positions:[],normals:[],uvs:[],indices:[]};batches.set(key,value);}return value;
  }
  function quad(material:Material,points:Vector3[],keyPoint:Vector3){
    const b=batch(material,keyPoint.x,keyPoint.z),base=b.positions.length/3;
    for(const point of points){b.positions.push(point.x,point.y,point.z);b.normals.push(0,1,0);b.uvs.push(point.x/4,point.z/4);}
    b.indices.push(base,base+2,base+1,base,base+3,base+2);
  }
  function strip(a:{x:number;z:number},b:{x:number;z:number},width:number,material:Material,y:number,offset=0){
    const length=Math.hypot(b.x-a.x,b.z-a.z);if(length<.01)return;
    const nx=(b.z-a.z)/length,nz=-(b.x-a.x)/length;
    const p=(at:{x:number;z:number},side:number)=>new Vector3(at.x+nx*(offset+side*width/2),y,at.z+nz*(offset+side*width/2));
    quad(material,[p(a,-1),p(b,-1),p(b,1),p(a,1)],new Vector3((a.x+b.x)/2,0,(a.z+b.z)/2));
  }
  let roadMetres=0;
  for(const road of NEIGHBORHOOD_CONTEXT.roads){
    for(let i=1;i<road.points.length;i++){
      const a=road.points[i-1],b=road.points[i],length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.ceil(length/4);
      for(let j=0;j<steps;j++){
        const p={x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps},q={x:a.x+(b.x-a.x)*(j+1)/steps,z:a.z+(b.z-a.z)*(j+1)/steps},mid={x:(p.x+q.x)/2,z:(p.z+q.z)/2};
        if(!neighborhoodContextOwnsLand(mid.x,mid.z)||neighborhoodWaterContains(mid.x,mid.z))continue;
        const nearest=nearestRoutePoint(mid.x,mid.z);
        // Reuse road ribbons where the actual source and playable lane already coincide.
        if(nearest.distance<1.0)continue;
        strip(p,q,road.width,palette.asphalt,.023);roadMetres+=length/steps;
        if(junctionInteriorContains(mid.x,mid.z)||nearest.distance<road.width/2+3)continue;
        for(const side of [-1,1]){
          const nx=(b.z-a.z)/length,nz=-(b.x-a.x)/length,offset=side*(road.width/2+.2),edge={x:mid.x+nx*offset,z:mid.z+nz*offset};
          // A cross street never gets a continuous curb/sidewalk drawn through its mouth.
          if(neighborhoodContextRoadContains(edge.x,edge.z,.08))continue;
          strip(p,q,.3,palette.curb,.11,offset);
          const walk=side*(road.width/2+1.65),at={x:mid.x+nx*walk,z:mid.z+nz*walk};
          if(!neighborhoodWaterContains(at.x,at.z,1)&&!neighborhoodContextRoadContains(at.x,at.z,.8))strip(p,q,1.45,palette.concrete,.065,walk);
        }
        if(road.role==='route-context')for(const side of [-1,1])strip(p,q,.10,palette.yellow,.032,side*.11);
      }
    }
  }
  for(const court of NEIGHBORHOOD_CONTEXT.courts){
    const centre=new Vector3(court.x,.024,court.z),steps=40;
    for(let i=0;i<steps;i++){
      const a=i*Math.PI*2/steps,b=(i+1)*Math.PI*2/steps;
      const rim=(angle:number,radius:number,y:number)=>new Vector3(court.x+Math.sin(angle)*radius,y,court.z+Math.cos(angle)*radius);
      quad(palette.asphalt,[centre,rim(a,court.radius,.024),rim(b,court.radius,.024),centre],centre);
      const delta=Math.atan2(Math.sin((a+b)/2-court.entryYaw),Math.cos((a+b)/2-court.entryYaw));
      if(Math.abs(delta)>.52)quad(palette.curb,[rim(a,court.radius,.11),rim(a,court.radius+.3,.11),rim(b,court.radius+.3,.11),rim(b,court.radius,.11)],centre);
    }
  }
  for(const lake of NEIGHBORHOOD_CONTEXT.waters){
    const data=new VertexData(),positions:number[]=[],normals:number[]=[],uvs:number[]=[];
    for(const p of lake.points){positions.push(p.x,.034,p.z);normals.push(0,1,0);uvs.push(p.x/6,p.z/6);}
    data.positions=positions;data.normals=normals;data.uvs=uvs;data.indices=triangulateNeighborhoodPolygon(lake.points);
    const mesh=new Mesh(`drive.home.water.${lake.id}`,scene);data.applyToMesh(mesh);mesh.material=water;mesh.parent=root;mesh.isPickable=false;mesh.receiveShadows=false;mesh.metadata={neighborhood:true,castShadow:false,sourceWaterId:lake.id};mesh.freezeWorldMatrix();meshes.push(mesh);
    for(let i=0;i<lake.points.length;i++)strip(lake.points[i],lake.points[(i+1)%lake.points.length],1.25,bank,.030);
  }
  const lotGroups=new Map<string,typeof NEIGHBORHOOD_CONTEXT.lots>();
  for(const site of NEIGHBORHOOD_CONTEXT.lots){const key=`${Math.floor(site.x/72)}.${Math.floor(site.z/72)}`,group=lotGroups.get(key)??[];group.push(site);lotGroups.set(key,group);}
  for(const [key,sites]of lotGroups){
    const group=new TransformNode(`drive.home.mapped-lots.${key}`,scene);group.parent=root;
    const built=development.buildLots(group,sites);plants.push(...built.plants);obstacles.push(...built.obstacles);parkedCars.push(...built.parkedCars);
  }
  // Sparse mature shade/palms reinforce the road edges while preserving the broad lake views.
  for(const [i,site]of NEIGHBORHOOD_CONTEXT.lots.entries())if(i%6===0){
    const x=site.x+Math.cos(site.yaw)*10.5-Math.sin(site.yaw)*7,z=site.z-Math.sin(site.yaw)*10.5-Math.cos(site.yaw)*7;
    const near=nearestRoutePoint(x,z);
    if(near.distance>9&&!neighborhoodWaterContains(x,z,4)&&!neighborhoodContextRoadContains(x,z,2))plants.push({kind:i%12?'canopy':'palm',x,z,height:i%12?9:7.5,seed:site.seed+9000});
  }
  for(const [key,b]of batches){
    const mesh=new Mesh(`drive.home.context.${key}`,scene),data=new VertexData();data.positions=b.positions;data.normals=b.normals;data.uvs=b.uvs;data.indices=b.indices;data.applyToMesh(mesh);
    mesh.material=b.material;mesh.parent=root;mesh.isPickable=false;mesh.receiveShadows=true;mesh.metadata={neighborhood:true,castShadow:false};mesh.addLODLevel(410,null);mesh.freezeWorldMatrix();meshes.push(mesh);
  }
  const triangles=meshes.reduce((count,mesh)=>count+mesh.getTotalIndices()/3,0);
  return{root,plants,obstacles,parkedCars,
    metrics(){return{sourceRoads:NEIGHBORHOOD_CONTEXT.roads.length,lakes:NEIGHBORHOOD_CONTEXT.waters.length,contextCourts:NEIGHBORHOOD_CONTEXT.courts.length,estimatedLots:NEIGHBORHOOD_CONTEXT.lots.length,lotGroups:lotGroups.size,roadMetres,staticMeshes:meshes.length,staticTriangles:triangles,waterSourceIds:NEIGHBORHOOD_CONTEXT.waters.map(lake=>lake.id),estimatedBuildings:true};},
    dispose(){root.dispose();water.dispose(false,false);wave.dispose();bank.dispose(false,false);},
  };
}
