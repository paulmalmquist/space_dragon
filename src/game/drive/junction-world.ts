import { Color3, Color4, Vector3 } from '@babylonjs/core/Maths/math';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import type { Material } from '@babylonjs/core/Materials/material';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import type { Scene } from '@babylonjs/core/scene';
import type { createDriveMaterials } from './materials';
import { DRIVE_JUNCTIONS, JUNCTION_CLOSURES, JUNCTION_OBSTACLES, junctionPoint } from './junctions';

type Pose={x:number;z:number;yaw:number};
type Batch={material:Material;meshes:Mesh[];caster:boolean;detail:boolean};

/** Original police dressing uses the existing traffic source meshes and material instances.
 * Construct after createTrafficVisuals(); no second vehicle template library is allocated.
 */
export function createDriveJunctionWorld(scene:Scene,palette:ReturnType<typeof createDriveMaterials>){
  const ownMaterials:Material[]=[],textures:DynamicTexture[]=[],roots:TransformNode[]=[],casters:AbstractMesh[]=[];
  const policeParts:{mesh:InstancedMesh;x:number;z:number;caster:boolean}[]=[];
  let disposed=false,viewer={x:0,z:0};
  function color(name:string,hex:string,roughness=.6,metallic=0){
    const material=new PBRMaterial(`drive.junction.${name}`,scene);material.albedoColor=Color3.FromHexString(hex).toLinearSpace();material.roughness=roughness;material.metallic=metallic;ownMaterials.push(material);return material;
  }
  const orange=color('safety-orange','#f37a20'),blackPaint=color('black-paint','#18252d',.28,.4),policeWhite=color('police-white','#f1f1e9',.28,.4);
  policeWhite.clearCoat.isEnabled=true;policeWhite.clearCoat.intensity=.8;policeWhite.clearCoat.roughness=.16;
  const red=color('steady-red-lens','#bc1723',.16,.15),blue=color('steady-blue-lens','#2268bc',.16,.15);
  red.emissiveColor.set(.22,.004,.007);blue.emissiveColor.set(.004,.025,.20);
  const stripes=new DynamicTexture('drive.junction.barricade-stripes',{width:512,height:128},scene,true);
  const stripeContext=stripes.getContext();stripeContext.fillStyle='#f5f1df';stripeContext.fillRect(0,0,512,128);stripeContext.fillStyle='#ee7020';
  for(let x=-128;x<640;x+=130){stripeContext.beginPath();stripeContext.moveTo(x,128);stripeContext.lineTo(x+70,128);stripeContext.lineTo(x+198,0);stripeContext.lineTo(x+128,0);stripeContext.closePath();stripeContext.fill();}
  stripes.update();textures.push(stripes);const stripeMaterial=color('reflective-barricade','#ffffff',.42);stripeMaterial.albedoTexture=stripes;
  function lettering(name:string,text:string,transparent:boolean){
    const texture=new DynamicTexture(`drive.junction.${name}-texture`,{width:1024,height:256},scene,true);
    const ctx=texture.getContext() as unknown as CanvasRenderingContext2D;ctx.clearRect(0,0,1024,256);
    if(!transparent){ctx.fillStyle='#fff9e5';ctx.fillRect(0,0,1024,256);ctx.strokeStyle='#d87524';ctx.lineWidth=16;ctx.strokeRect(8,8,1008,240);}
    ctx.font=`800 ${transparent?170:112}px Arial`;ctx.textAlign='center';ctx.fillStyle='#17262f';ctx.fillText(text,512,transparent?188:169);
    texture.hasAlpha=transparent;texture.update();textures.push(texture);
    const material=new StandardMaterial(`drive.junction.${name}`,scene);material.diffuseTexture=texture;material.useAlphaFromDiffuseTexture=transparent;material.specularColor.setAll(.08);material.emissiveColor.setAll(.25);ownMaterials.push(material);return material;
  }
  const policeLetters=lettering('police-letters','POLICE',true),closedLetters=lettering('closed-letters','ROAD CLOSED',false);
  for(const junction of DRIVE_JUNCTIONS){
    const root=new TransformNode(`drive.junction.${junction.id}`,scene);root.metadata={junctionId:junction.id};roots.push(root);
    const batches=new Map<string,Batch>();
    function collect(mesh:Mesh,material:Material,caster=false,detail=false){
      mesh.material=material;mesh.parent=root;mesh.isPickable=false;mesh.receiveShadows=true;
      const key=`${material.uniqueId}.${caster}.${detail}`;let batch=batches.get(key);if(!batch){batch={material,meshes:[],caster,detail};batches.set(key,batch);}batch.meshes.push(mesh);return mesh;
    }
    function box(name:string,pose:Pose,along:number,across:number,y:number,w:number,h:number,d:number,material:Material,caster=false,detail=false){
      const p=junctionPoint(pose,pose.yaw,along,across),mesh=MeshBuilder.CreateBox(`drive.junction.${name}`,{width:w,height:h,depth:d},scene);
      mesh.position.set(p.x,y,p.z);mesh.rotation.y=pose.yaw;return collect(mesh,material,caster,detail);
    }
    function plane(name:string,pose:Pose,along:number,across:number,y:number,w:number,h:number,material:Material,detail=false){
      const p=junctionPoint(pose,pose.yaw,along,across),mesh=MeshBuilder.CreatePlane(`drive.junction.${name}`,{width:w,height:h},scene);
      mesh.position.set(p.x,y,p.z);mesh.rotation.y=pose.yaw;return collect(mesh,material,false,detail);
    }
    // Reuse mapped neighborhood/context roads. Arterial corners receive their
    // missing arms plus connections to the existing curved player pavement.
    for(const arm of junction.arms){
      const pose={...junction,yaw:arm.yaw},length=arm.existingPavement?Math.min(junction.radius+5,arm.length):arm.length;
      const pavement=box('arm-pavement',pose,length/2,0,.003,arm.width,.04,length,palette.asphalt);
      const positions=pavement.getVerticesData(VertexBuffer.PositionKind)!,uv:number[]=[];
      for(let i=0;i<positions.length;i+=3)uv.push(positions[i]/4,positions[i+2]/4);pavement.setVerticesData(VertexBuffer.UVKind,uv);
      if(junction.source==='mapped-neighborhood')continue;
      const mouth=Math.max(...junction.arms.filter(other=>other!==arm).map(other=>other.width/2))+2;
      const medianStart=Math.max(mouth+5,JUNCTION_CLOSURES.find(closure=>closure.junctionId===junction.id&&closure.armId===arm.id)?.distance??0)+9;
      if(arm.medianWidth>0 && length>medianStart)box('arm-median',pose,(medianStart+length)/2,0,.07,arm.medianWidth,.14,length-medianStart,palette.medianGrass);
      for(const side of [-1,1]){
        box('arm-curb',pose,(mouth+length)/2,side*(arm.width/2+.14),.09,.28,.18,length-mouth,palette.curb);
        box('arm-walk',pose,(mouth+length)/2,side*(arm.width/2+4.1),.065,2,.13,length-mouth,palette.concrete);
        box('arm-edge-line',pose,(mouth+length)/2,side*(arm.width/2-.55),.028,.13,.012,length-mouth,palette.white);
        for(let along=mouth+8;along<length-2;along+=12)for(let lane=arm.medianWidth/2+3.5;lane<arm.width/2-.5;lane+=3.5)box('arm-lane',pose,along,side*lane,.03,.13,.012,4.5,palette.white);
      }
    }
    const apron=MeshBuilder.CreateCylinder(`drive.junction.${junction.id}.apron`,{diameter:Math.max(...junction.arms.map(arm=>arm.width)),height:.028,tessellation:64},scene);
    apron.position.set(junction.x,.008,junction.z);
    const apronPositions=apron.getVerticesData(VertexBuffer.PositionKind)!,apronUV:number[]=[];
    for(let i=0;i<apronPositions.length;i+=3)apronUV.push((apronPositions[i]+junction.x)/4,(apronPositions[i+2]+junction.z)/4);apron.setVerticesData(VertexBuffer.UVKind,apronUV);collect(apron,palette.asphalt);
    for(const closure of JUNCTION_CLOSURES.filter(c=>c.junctionId===junction.id)){
      const pose={...closure,yaw:closure.yaw};
      for(const [index,barricade]of closure.barricades.entries()){
        const p={...barricade,yaw:closure.yaw};
        for(const side of [-1,1]){
          box('barricade-foot',p,0,side*(barricade.width/2-.27),.10,.13,.16,1.0,palette.metal,true);
          box('barricade-upright',p,0,side*(barricade.width/2-.27),.7,.085,1.3,.085,palette.metal,true);
        }
        box('barricade-low-board',p,0,0,.62,barricade.width,.28,.075,stripeMaterial,true);
        box('barricade-high-board',p,0,0,1.17,barricade.width,.38,.075,stripeMaterial,true);
        if(index%2===0){
          const coneAt=junctionPoint(p,p.yaw,-1.2,barricade.width*.35);
          box('cone-base',{...coneAt,yaw:p.yaw},0,0,.045,.43,.09,.43,palette.dark,true);
          const cone=MeshBuilder.CreateCylinder('drive.junction.cone',{height:.62,diameterTop:.065,diameterBottom:.34,tessellation:12},scene);cone.position.set(coneAt.x,.40,coneAt.z);collect(cone,orange,true);
          const band=MeshBuilder.CreateCylinder('drive.junction.cone-reflector',{height:.14,diameterTop:.155,diameterBottom:.217,tessellation:12},scene);band.position.set(coneAt.x,.43,coneAt.z);collect(band,palette.white,true);
        }
      }
      // The central sign faces drivers approaching from the open junction.
      box('closure-sign-board',pose,.05,0,2.03,3.1,.88,.11,palette.white,true);
      plane('closure-sign',pose,-.012,0,2.03,3.0,.76,closedLetters);
      for(const side of [-1,1])box('closure-sign-leg',pose,.08,side*1.12,1.32,.09,1.5,.09,palette.metal,true);
      const vehicle=closure.police,carPose={x:vehicle.x,z:vehicle.z,yaw:vehicle.yaw},suv=vehicle.kind==='suv',roof=suv?1.78:1.48,width=suv?1.93:1.85;
      for(const part of ['paint','trim','rubber','alloy','glass','headlamp','tail']){
        const source=scene.getMeshByName(`drive.traffic.template.${vehicle.kind}.near.${part}`) as Mesh|null;
        if(!source)throw new Error('Create traffic templates before the junction renderer.');
        const instance=source.createInstance(`drive.junction.police.${vehicle.id}.${part}`);instance.parent=root;instance.position.set(vehicle.x,.025,vehicle.z);instance.rotation.y=vehicle.yaw;instance.isVisible=true;instance.isPickable=false;instance.receiveShadows=true;
        instance.metadata={junction:true,policeId:vehicle.id,castShadow:part==='paint'||part==='rubber'};
        if(part==='paint')instance.instancedBuffers.color=new Color4(.015,.023,.03,1);
        instance.freezeWorldMatrix();policeParts.push({mesh:instance,x:vehicle.x,z:vehicle.z,caster:part==='paint'||part==='rubber'});
      }
      for(const side of [-1,1]){
        box('police-door-panel',carPose,-.15,side*(width/2+.008),.84,.027,.55,2.25,policeWhite,true,true);
        const panel=junctionPoint(carPose,carPose.yaw,-.2,side*(width/2+.025));
        plane('police-door-lettering',{...panel,yaw:carPose.yaw-side*Math.PI/2},0,0,.86,1.65,.42,policeLetters,true);
        box('police-pushbar-upright',carPose,2.43,side*.49,.57,.075,.50,.09,palette.metal,true,true);
      }
      for(const y of [.43,.70])box('police-pushbar-cross',carPose,2.46,0,y,1.12,.065,.08,palette.metal,true,true);
      box('police-lightbar-mount',carPose,0,0,roof+.055,1.12,.085,.31,blackPaint,true,true);
      box('police-red-lightbar',carPose,0,-.28,roof+.15,.48,.14,.27,red,false,true);
      box('police-blue-lightbar',carPose,0,.28,roof+.15,.48,.14,.27,blue,false,true);
      box('police-lightbar-cap',carPose,0,0,roof+.235,1.08,.035,.28,palette.metal,false,true);
    }
    for(const [key,batch]of batches){
      const mesh=Mesh.MergeMeshes(batch.meshes,true,true)!;mesh.name=`drive.junction.${junction.id}.batch.${key}`;mesh.material=batch.material;mesh.parent=root;mesh.isPickable=false;mesh.receiveShadows=true;
      mesh.metadata={junction:true,junctionId:junction.id,castShadow:batch.caster};mesh.addLODLevel(batch.detail?160:390,null);mesh.freezeWorldMatrix();
      if(batch.caster)casters.push(mesh);
    }
  }
  function update(player:{x:number;z:number}){
    if(disposed)return;viewer={x:player.x,z:player.z};
    for(let i=0;i<roots.length;i++){const junction=DRIVE_JUNCTIONS[i];roots[i].setEnabled(Math.hypot(junction.x-player.x,junction.z-player.z)<350);}
  }
  return{update,obstacles:JUNCTION_OBSTACLES,
    get shadowMeshes(){return [...casters.filter(mesh=>mesh.isEnabled()&&Vector3.DistanceSquared(mesh.getBoundingInfo().boundingSphere.centerWorld,new Vector3(viewer.x,0,viewer.z))<70**2),...policeParts.filter(p=>p.caster&&p.mesh.isEnabled()&&Math.hypot(p.x-viewer.x,p.z-viewer.z)<70).map(p=>p.mesh)];},
    metrics(){return{junctions:DRIVE_JUNCTIONS.map((j,i)=>({id:j.id,x:j.x,z:j.z,topology:j.topology,arms:j.arms.map(a=>({id:a.id,use:a.use,street:a.street})),visible:roots[i].isEnabled()})),closedArms:JUNCTION_CLOSURES.length,policeVehicles:JUNCTION_CLOSURES.map(c=>({...c.police,junctionId:c.junctionId})),barricades:JUNCTION_CLOSURES.reduce((n,c)=>n+c.barricades.length,0),collisionProxies:JUNCTION_OBSTACLES.length};},
    dispose(){if(disposed)return;disposed=true;for(const root of roots)root.dispose();for(const material of ownMaterials)material.dispose(false,false);for(const texture of textures)texture.dispose();},
  };
}
