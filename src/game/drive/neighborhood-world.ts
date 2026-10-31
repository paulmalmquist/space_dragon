import { Vector3 } from '@babylonjs/core/Maths/math';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Material } from '@babylonjs/core/Materials/material';
import type { Scene } from '@babylonjs/core/scene';
import { buildHouse } from './house';
import type { HouseLayout } from './house';
import { NEIGHBORHOOD } from './neighborhood';
import { ROUTE, nearestRoutePoint } from './route';
import { junctionInteriorContains } from './junctions';
import type { createDriveMaterials } from './materials';
import type { createRoadsideDevelopment } from './development';
import type { DriveVegetationPlacement } from './vegetation';

type Obstacle = { id:string;x:number;z:number;radius:number };
type Pose = {x:number;z:number;yaw:number};

/** Original surroundings placed against mapped streets; building anchors remain estimates. */
export function createNeighborhoodScenery(scene:Scene,palette:ReturnType<typeof createDriveMaterials>,layout:HouseLayout,
  development:ReturnType<typeof createRoadsideDevelopment>,streetMaterial:(name:string)=>Material) {
  const root=new TransformNode('drive.home.neighborhood',scene);
  const meshes:Mesh[]=[];const exteriorMeshes:Mesh[]=[];let collection=meshes;let cutaway=false;
  const obstacles:Obstacle[]=[];const plants:DriveVegetationPlacement[]=[];
  const point=(pose:Pose,x:number,y:number,z:number)=>new Vector3(pose.x+Math.cos(pose.yaw)*x+Math.sin(pose.yaw)*z,y,pose.z-Math.sin(pose.yaw)*x+Math.cos(pose.yaw)*z);
  function box(name:string,pose:Pose,x:number,y:number,z:number,w:number,h:number,d:number,material:Material){
    const mesh=MeshBuilder.CreateBox(`drive.home.${name}`,{width:w,height:h,depth:d},scene);
    mesh.position.copyFrom(point(pose,x,y,z));mesh.rotation.y=pose.yaw;mesh.material=material;mesh.parent=root;
    mesh.isPickable=false;mesh.receiveShadows=true;collection.push(mesh);return mesh;
  }
  function footprint(name:string,pose:Pose,w:number,d:number){
    for(let x=-w/2;x<=w/2+.01;x+=Math.min(1.5,w))for(const side of [-1,1]){const p=point(pose,x,0,side*d/2);obstacles.push({id:`${name}.${x}.${side}`,x:p.x,z:p.z,radius:.55});}
    for(let z=-d/2;z<=d/2+.01;z+=Math.min(1.5,d))for(const side of [-1,1]){const p=point(pose,side*w/2,0,z);obstacles.push({id:`${name}.${side}.${z}`,x:p.x,z:p.z,radius:.55});}
  }
  function pavement(name:string,points:readonly {x:number;z:number}[],width:number,material:Material,y=.045){
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],yaw=Math.atan2(b.x-a.x,b.z-a.z);
      box(name,{x:(a.x+b.x)/2,z:(a.z+b.z)/2,yaw},0,y,0,width,.065,Math.hypot(b.x-a.x,b.z-a.z)+.15,material);
    }
  }
  // Public mapped side streets continue beyond the route's turns. Only uncovered spans
  // are drawn, so the return route shares the same physical Boulevard and Court surface.
  for(const [name,centerline]of Object.entries({boulevard:NEIGHBORHOOD.centerlines.greenIsland,terrace:NEIGHBORHOOD.centerlines.terrace})){
    for(let i=1;i<centerline.length;i++){
      const a=centerline[i-1],b=centerline[i],length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.ceil(length/5);
      for(let j=0;j<steps;j++){
        const start={x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps},end={x:a.x+(b.x-a.x)*(j+1)/steps,z:a.z+(b.z-a.z)*(j+1)/steps};
        const center={x:(start.x+end.x)/2,z:(start.z+end.z)/2};if(nearestRoutePoint(center.x,center.z).distance<3)continue;
        const pose={...center,yaw:Math.atan2(b.x-a.x,b.z-a.z)},segment=length/steps+.1;
        box(`context-${name}`,pose,0,.005,0,7,.035,segment,palette.asphalt);
        if(junctionInteriorContains(center.x,center.z))continue;
        for(const side of [-1,1]){
          box(`context-${name}-curb`,pose,side*3.65,.08,0,.28,.16,segment,palette.curb);
          box(`context-${name}-walk`,pose,side*6.9,.065,0,2,.13,segment,palette.concrete);
          box(`context-${name}-centerline`,pose,side*.10,.026,0,.10,.008,segment,palette.yellow);
        }
      }
    }
  }
  pavement('green-island-through-bridge',ROUTE.trafficBridge.points,7,palette.asphalt,.002);
  // Show the public arterial continuing east of the visitors' exit, so this reads
  // as a right turn at a T-junction rather than a residential road bending away.
  const arterial=NEIGHBORHOOD.junctions[2],arterialPose={x:arterial.x+109,z:arterial.z,yaw:Math.PI/2};
  box('hypoluxo-east-context',arterialPose,0,.003,0,26,.045,262,palette.asphalt);
  box('hypoluxo-east-median',{...arterialPose,x:arterial.x+130},0,.07,0,5,.14,220,palette.medianGrass);
  for(const side of [-1,1]){
    for(const [from,to]of side===-1?[[-131,-127],[-91,131]]:[[-131,131]]){
      box('hypoluxo-east-edge',arterialPose,side*12.45,.032,(from+to)/2,.13,.012,to-from,palette.white);
      box('hypoluxo-east-curb',arterialPose,side*13.1,.09,(from+to)/2,.25,.18,to-from,palette.curb);
      box('hypoluxo-east-sidewalk',arterialPose,side*17.2,.065,(from+to)/2,2,.13,to-from,palette.concrete);
    }
    for(let along=-105;along<130;along+=12)for(const lane of [6,9.5])box('hypoluxo-east-lane',arterialPose,side*lane,.033,along,.13,.012,4.5,palette.white);
  }
  const court=NEIGHBORHOOD.culdesac;
  const courtSurface=MeshBuilder.CreateCylinder('drive.home.culdesac',{diameter:court.radius*2,height:.055,tessellation:100},scene);
  courtSurface.position.set(court.x,.001,court.z);courtSurface.material=palette.asphalt;courtSurface.parent=root;courtSurface.receiveShadows=true;courtSurface.isPickable=false;
  courtSurface.metadata={neighborhood:true,castShadow:false};
  const courtPositions=courtSurface.getVerticesData(VertexBuffer.PositionKind)!;const courtUV:number[]=[];
  for(let i=0;i<courtPositions.length;i+=3)courtUV.push(courtPositions[i]/4,courtPositions[i+2]/4);
  courtSurface.setVerticesData(VertexBuffer.UVKind,courtUV);
  // Junction-world owns the connected T aprons; long mapped context streets
  // and the NPC through-bridge remain shared here rather than being duplicated.
  // Leave a true opening where the stem meets the bulb; sidewalks never cross its mouth.
  const mouthYaw=Math.atan2(NEIGHBORHOOD.start.x-court.x,NEIGHBORHOOD.start.z-court.z);
  const paths=[[],[]] as Vector3[][];
  for(let i=0;i<=100;i++){
    const a=mouthYaw+.57+i*(Math.PI*2-1.14)/100;
    for(let edge=0;edge<2;edge++)paths[edge].push(new Vector3(court.x+Math.sin(a)*(court.radius+edge*.35),.13,court.z+Math.cos(a)*(court.radius+edge*.35)));
  }
  const rim=MeshBuilder.CreateRibbon('drive.home.court-curb',{pathArray:paths,sideOrientation:Mesh.DOUBLESIDE},scene);rim.material=palette.curb;rim.parent=root;rim.isPickable=false;rim.receiveShadows=true;rim.metadata={neighborhood:true,castShadow:false};
  const house=buildHouse(scene,layout);house.root.parent=root;house.root.position.set(NEIGHBORHOOD.home.x,0,NEIGHBORHOOD.home.z);house.root.rotation.y=NEIGHBORHOOD.home.yaw;
  house.root.setEnabled(false);
  // The walkthrough supplies an estimated ground floor, not a surveyed exterior.
  // A separately switchable original envelope makes ordinary driving views complete.
  collection=exteriorMeshes;
  const indoorRooms=layout.rooms.filter(room=>!/patio|terrace|garden/.test(room.id));
  const left=Math.min(...indoorRooms.map(room=>room.x-room.width/2))-.16,right=Math.max(...indoorRooms.map(room=>room.x+room.width/2))+.16;
  const front=Math.min(...indoorRooms.map(room=>room.z-room.depth/2))-.16,back=Math.max(...indoorRooms.map(room=>room.z+room.depth/2))+.16;
  const width=right-left,depth=back-front,cx=(left+right)/2,cz=(front+back)/2,housePose=NEIGHBORHOOD.home;
  const exterior=development.exteriorMaterials;
  for(const z of [front,back])box('exterior-wall',housePose,cx,1.73,z,width,3.46,.22,exterior.wall);
  for(const x of [left,right])box('exterior-wall',housePose,x,1.73,cz,.22,3.46,depth,exterior.wall);
  box('exterior-plinth',housePose,cx,.18,cz,width+.15,.25,depth+.15,palette.concrete);
  function window(pose:Pose,x:number,z:number,w=1.8){
    box('exterior-window-frame',pose,x,1.92,z,w+.20,1.73,.14,palette.white);
    box('exterior-window-glass',pose,x,1.92,z-.08,w,1.5,.025,palette.glass);
    box('exterior-window-mullion',pose,x,1.92,z-.11,.055,1.5,.025,palette.curb);
    box('exterior-window-transom',pose,x,1.92,z-.11,w,.055,.025,palette.curb);
    box('exterior-window-sill',pose,x,1.01,z-.08,w+.35,.12,.30,palette.curb);
  }
  const doorX=left+1.55;
  box('exterior-front-door-trim',housePose,doorX,1.43,front-.14,1.36,2.66,.16,palette.curb);
  box('exterior-front-door',housePose,doorX,1.40,front-.24,1.13,2.43,.12,palette.teal);
  box('exterior-front-door-glazing',housePose,doorX,1.82,front-.31,.63,.88,.02,palette.glass);
  box('exterior-entry-handle',housePose,doorX+.39,1.30,front-.32,.045,.21,.04,palette.metal);
  for(const x of [cx+.2,right-1.65])window(housePose,x,front-.14,1.7);
  const backAt=point(housePose,0,0,back+.14),backPose={x:backAt.x,z:backAt.z,yaw:housePose.yaw+Math.PI};
  window(backPose,-cx,0,3.2);
  for(const side of [-1,1]){
    const at=point(housePose,side===1?right+.14:left-.14,0,cz),sidePose={x:at.x,z:at.z,yaw:housePose.yaw-side*Math.PI/2};
    for(const x of [-depth*.25,depth*.25])window(sidePose,x,0,1.55);
  }
  box('exterior-entry-porch',housePose,doorX,.13,front-1.25,3.5,.25,2.6,palette.concrete);
  box('exterior-porch-canopy',housePose,doorX,2.95,front-1.12,3.7,.22,2.8,exterior.roof);
  for(const x of [doorX-1.52,doorX+1.52])box('exterior-porch-column',housePose,x,1.55,front-2.25,.22,2.84,.22,palette.curb);
  // Hip roof with a short ridge, UVs scaled in metres for the shared ceramic map.
  const roofData=new VertexData(),roofPositions:number[]=[],roofNormals:number[]=[],roofUV:number[]=[],roofIndices:number[]=[];
  const a=left-.55,b=right+.55,f=front-.6,r=back+.6,y=3.55,peak=5.15,ra=cx-width*.23,rb=cx+width*.23;
  for(const face of [ [[a,y,f],[ra,peak,cz],[rb,peak,cz],[b,y,f]], [[b,y,r],[rb,peak,cz],[ra,peak,cz],[a,y,r]], [[a,y,r],[ra,peak,cz],[ra,peak,cz],[a,y,f]], [[b,y,f],[rb,peak,cz],[rb,peak,cz],[b,y,r]] ]){
    const base=roofPositions.length/3,points=face.map(p=>point(housePose,p[0],p[1],p[2]));let normal=Vector3.Cross(points[1].subtract(points[0]),points[2].subtract(points[0]));
    if(normal.lengthSquared()<1e-8)normal=Vector3.Cross(points[1].subtract(points[0]),points[3].subtract(points[0]));normal.normalize();
    for(const p of points){roofPositions.push(p.x,p.y,p.z);roofNormals.push(normal.x,normal.y,normal.z);}roofUV.push(0,0,width/2,0,width/2,depth/3,0,depth/3);roofIndices.push(base,base+2,base+1,base,base+3,base+2);
  }
  roofData.positions=roofPositions;roofData.normals=roofNormals;roofData.uvs=roofUV;roofData.indices=roofIndices;
  const roof=new Mesh('drive.home.exterior-hip-roof',scene);roofData.applyToMesh(roof);roof.material=exterior.roof;roof.parent=root;roof.receiveShadows=true;roof.isPickable=false;exteriorMeshes.push(roof);
  box('exterior-fascia',housePose,cx,3.48,cz,width+1.15,.19,depth+1.25,palette.curb);
  box('exterior-ridge',housePose,cx,peak+.04,cz,width*.47,.14,.20,exterior.roof);
  for(const patio of layout.rooms.filter(room=>/patio|terrace/.test(room.id))){
    box('exterior-covered-patio',housePose,patio.x,2.96,patio.z,patio.width+.35,.18,patio.depth+.3,exterior.roof);
    for(const side of [-1,1])box('exterior-patio-column',housePose,patio.x+side*(patio.width/2-.12),1.59,patio.z+patio.depth/2-.12,.18,2.74,.18,palette.curb);
  }
  collection=meshes;
  const shellCenter=point(housePose,cx,0,cz);footprint('home-exterior',{x:shellCenter.x,z:shellCenter.z,yaw:housePose.yaw},width,depth);
  const entryPath=point(housePose,doorX,0,front-2.6);
  pavement('entry-walk',[{x:entryPath.x,z:entryPath.z},{x:NEIGHBORHOOD.home.driveway.points[0].x-3.4,z:NEIGHBORHOOD.home.driveway.points[0].z+2.0}],1.35,palette.concrete,.052);
  for(const [index,wall]of layout.walls.entries()){
    const count=Math.max(1,Math.ceil(Math.max(wall.width,wall.depth)/1.5));
    for(let i=0;i<=count;i++){
      const p=point(NEIGHBORHOOD.home,wall.x+(wall.width>=wall.depth?(i/count-.5)*wall.width:0),0,wall.z+(wall.depth>wall.width?(i/count-.5)*wall.depth:0));
      obstacles.push({id:`house-wall.${index}.${i}`,x:p.x,z:p.z,radius:.22});
    }
  }
  const garage=NEIGHBORHOOD.home.garage;
  box('garage',garage,0,1.7,0,garage.width,3.4,garage.depth,palette.storefront);
  box('garage-door',garage,0,1.5,-garage.depth/2-.08,5.5,2.7,.12,palette.white);
  box('garage-roof',garage,0,3.55,0,garage.width+.6,.3,garage.depth+.6,exterior.roof);
  box('garage-eaves',garage,0,3.36,0,garage.width+.7,.15,garage.depth+.7,palette.curb);
  for(let panel=0;panel<6;panel++)box(`garage-panel.${panel}`,garage,0,.36+panel*.46,-garage.depth/2-.15,5.45,.025,.035,palette.pole);
  for(const side of [-1,1]){
    box(`garage-trim.${side}`,garage,side*2.85,1.6,-garage.depth/2-.17,.18,3,.2,palette.curb);
    box(`garage-lamp.${side}`,garage,side*3.12,2.2,-garage.depth/2-.17,.17,.36,.15,palette.dark);
    box(`garage-lens.${side}`,garage,side*3.12,2.2,-garage.depth/2-.25,.12,.25,.05,palette.white);
  }
  footprint('garage',garage,garage.width,garage.depth);
  pavement('driveway',NEIGHBORHOOD.home.driveway.points,NEIGHBORHOOD.home.driveway.width,palette.concrete);
  const driveA=NEIGHBORHOOD.home.driveway.points[0],driveB=NEIGHBORHOOD.home.driveway.points[1],driveYaw=Math.atan2(driveB.x-driveA.x,driveB.z-driveA.z);
  for(let i=1;i<5;i++)box(`driveway-joint.${i}`,{x:driveA.x+(driveB.x-driveA.x)*i/5,z:driveA.z+(driveB.z-driveA.z)*i/5,yaw:driveYaw},0,.08,0,5.8,.005,.025,palette.pole);
  const builtLots=development.buildLots(root,[
    {x:-28,z:5,yaw:-Math.PI/2,seed:7101,driveLength:11,side:-1},
    {x:-7,z:30,yaw:0,seed:7102,driveLength:12,side:-1},
    {x:24,z:24,yaw:.72,seed:7103,driveLength:14,side:1},
  ]);
  obstacles.push(...builtLots.obstacles);plants.push(...builtLots.plants);
  plants.push({kind:'palm',x:7,z:-14,height:8,seed:7104},{kind:'palm',x:33,z:-26,height:9,seed:7105},
    {kind:'canopy',x:34,z:5,height:11,seed:7106},{kind:'canopy',x:-34,z:26,height:12,seed:7107},
    {kind:'hedge',x:9,z:-9,height:1,seed:7108});
  const gate=NEIGHBORHOOD.gate;
  // The filmed visitors' gate is a modest booth beside a yellow island and white rail fence.
  box('gate-island',gate,-5.25,.12,0,2.9,.24,10,palette.yellow);
  box('gate-island-inset',gate,-5.25,.245,0,2.5,.025,9.6,palette.concrete);
  box('gate-booth-base',gate,-5.25,.77,0,2.25,1.05,3.4,palette.storefront);
  box('gate-booth-back',gate,-6.31,1.8,0,.16,1.25,3.4,palette.storefront);
  box('gate-booth-front-window',gate,-4.1,1.83,0,.035,1.12,2.95,palette.glass);
  for(const z of [-1.5,1.5]){
    box('gate-booth-end-window',gate,-5.25,1.83,z,2.1,1.12,.035,palette.glass);
    for(const x of [-6.35,-4.15])box('gate-booth-pillar',gate,x,1.81,z,.12,1.26,.12,palette.curb);
  }
  box('gate-booth-eaves',gate,-5.25,2.52,0,2.9,.2,4.0,palette.white);
  box('gate-booth-roof',gate,-5.25,2.69,0,2.75,.18,3.85,palette.terracotta);
  const boothAt=point(gate,-5.25,0,0);
  footprint('gate-booth',{x:boothAt.x,z:boothAt.z,yaw:gate.yaw},2.25,3.4);
  for(const side of [-1,1]){
    for(let z=-27;z<=27;z+=3){
      if(Math.abs(z)<6)continue;
      box('gate-fence-post',gate,side*6.8,.72,z,.16,1.44,.16,palette.white);
      for(const y of [.48,1.04])box('gate-fence-rail',gate,side*6.8,y,z+1.5,.10,.13,3.15,palette.white);
    }
    const armX=side*4.25;
    box('gate-arm-motor',gate,armX,.78,-3,.45,1.56,.45,palette.pole);
    // Raised barriers are scenery and leave both lane envelopes open at every game time.
    const pivot=new TransformNode(`drive.home.gate-raised-arm.${side}`,scene);pivot.position.copyFrom(point(gate,armX,1.42,-3));pivot.rotation.y=gate.yaw;pivot.rotation.z=side*.20;pivot.parent=root;
    const arm=MeshBuilder.CreateBox(`drive.home.gate-arm.${side}`,{width:.13,height:4.2,depth:.14},scene);arm.position.y=2.1;arm.material=palette.white;arm.parent=pivot;arm.isPickable=false;arm.receiveShadows=true;
    for(let stripe=0;stripe<7;stripe++){
      const band=MeshBuilder.CreateBox(`drive.home.gate-arm-stripe.${side}.${stripe}`,{width:.14,height:.18,depth:.15},scene);band.position.y=.4+stripe*.55;band.material=palette.terracotta;band.parent=pivot;band.isPickable=false;
    }
    const p=point(gate,side*9,0,13);plants.push({kind:'palm',x:p.x,z:p.z,height:8.2,seed:7200+side});
  }
  for(const [index,junction]of NEIGHBORHOOD.junctions.entries()){
    const approach=index===0?NEIGHBORHOOD.start.yaw:index===1?Math.atan2(junction.x-NEIGHBORHOOD.junctions[0].x,junction.z-NEIGHBORHOOD.junctions[0].z):gate.yaw;
    const p=point({...junction,yaw:approach},6.7,0,-7);
    const post={x:p.x,z:p.z,yaw:approach};box('street-post',post,0,1.95,0,.12,3.9,.12,palette.metal);
    for(const [row,label]of [junction.to,junction.from].entries()){
      for(const side of [-1,1]){
        const sign=MeshBuilder.CreatePlane(`drive.home.street.${label}.${side}`,{width:5.2,height:.98,sideOrientation:Mesh.FRONTSIDE},scene);
        sign.position.set(p.x,3.9+row*1.0,p.z);sign.rotation.y=approach+(side===1?Math.PI:0);sign.material=streetMaterial(label);sign.parent=root;sign.isPickable=false;sign.metadata={streetName:label};
      }
    }
  }
  // Merge the authored static detail into shared-material draws. House batches remain separate.
  const exteriorBatches:Mesh[]=[];
  for(const [label,source]of [['authored',meshes],['exterior',exteriorMeshes]] as const){
    const groups=new Map<Material,Mesh[]>();for(const mesh of source){const group=groups.get(mesh.material!)??[];group.push(mesh);groups.set(mesh.material!,group);}
    for(const [material,group]of groups){const merged=Mesh.MergeMeshes(group,true,true)!;merged.name=`drive.home.${label}.${material.name}`;merged.material=material;merged.parent=root;merged.isPickable=false;merged.receiveShadows=true;merged.metadata={neighborhood:true,castShadow:label==='exterior'||material===palette.storefront||material===palette.terracotta||material===exterior.roof};if(label==='exterior')exteriorBatches.push(merged);}
  }
  return {root,obstacles,plants,parkedCars:builtLots.parkedCars,
    setCutaway(enabled:boolean){cutaway=enabled;house.root.setEnabled(enabled);for(const mesh of exteriorBatches)mesh.setEnabled(!enabled);},
    metrics(){return {culdesac:{x:court.x,z:court.z,radius:court.radius},home:{x:NEIGHBORHOOD.home.x,z:NEIGHBORHOOD.home.z,yaw:NEIGHBORHOOD.home.yaw},gate:{x:gate.x,z:gate.z},garage:NEIGHBORHOOD.home.garage,driveway:NEIGHBORHOOD.home.driveway,approximateBuildingPlacement:true,estimatedExterior:true,cutaway};},
    dispose(){house.dispose();root.dispose();},
  };
}
