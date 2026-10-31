import { Color3, Vector3 } from '@babylonjs/core/Maths/math';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import type { Material } from '@babylonjs/core/Materials/material';
import type { Scene } from '@babylonjs/core/scene';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { createDriveMaterials } from './materials';
import type { TrafficVisualVehicle } from './traffic-visuals';
import type { DriveVegetationPlacement } from './vegetation';
import { ROUTE, pointAtDistance, nearestRoutePoint } from './route';
import { NEIGHBORHOOD } from './neighborhood';
import { junctionRoadContains } from './junctions';
import { neighborhoodContextOwnsLand, neighborhoodContextRoadContains, neighborhoodWaterContains } from './neighborhood-context';

type Palette = ReturnType<typeof createDriveMaterials>;
type Use = 'homes' | 'retail' | 'walled';
type Obstacle = { id: string; x: number; z: number; radius: number };
interface Batch { material: Material; detail: boolean; positions: number[]; normals: number[]; uvs: number[]; indices: number[] }
interface Site { x: number; z: number; yaw: number; seed: number; side?: number; routeS?: number; authored?: boolean; driveLength?: number; compact?:boolean }
const random = (seed: number) => { const n = Math.sin(seed * 63.17 + 341.8) * 9758.543; return n - Math.floor(n); };
const halfRoad = (section: typeof ROUTE.sections[number]) => section.lanes * section.laneWidth + section.medianWidth / 2;

/** A consistent land-use rhythm shared by buildings and the foreground boundary walls. */
export function roadsideUseAt(s: number, side: number): Use {
  const pose=pointAtDistance(s),section = ROUTE.sections[pose.sectionIndex];
  if(neighborhoodContextOwnsLand(pose.x,pose.z))return 'homes';
  if (section.invented || section.character === 'neighborhood') return 'homes';
  const block = Math.floor(s / 100) + (side === 1 ? 1 : 3);
  if (section.character === 'shops') return block % 3 === 0 ? 'homes' : 'retail';
  if (block % 7 === 0) return 'walled';
  return block % (section.character === 'walls' ? 6 : 4) === 1 ? 'retail' : 'homes';
}

/** Original fictional Florida roadside development, batched by material per streamed road chunk. */
export function createRoadsideDevelopment(scene: Scene, palette: Palette) {
  const owned: Material[] = [];
  const textures: DynamicTexture[] = [];
  const shopGlass = palette.glass.clone('drive.development.shop-glazing')!;
  shopGlass.alpha=.5;shopGlass.transparencyMode=PBRMaterial.PBRMATERIAL_ALPHABLEND;
  shopGlass.metallic=.1;shopGlass.roughness=.09;shopGlass.environmentIntensity=.8;
  owned.push(shopGlass);
  const mulch=palette.trunk.clone('drive.development.mulch')!;
  mulch.albedoColor=Color3.FromHexString('#795d45').toLinearSpace();mulch.roughness=1;owned.push(mulch);
  const walls = ['#e9dfca', '#c5d2cd', '#d8c7b6'].map((hex, i) => {
    const material = palette.storefront.clone(`drive.development.stucco.${i}`)!;
    material.albedoColor = Color3.FromHexString(hex).toLinearSpace(); owned.push(material); return material;
  });
  const roofMaterial = palette.terracotta.clone('drive.development.ceramic-roof')!;
  const tile = new DynamicTexture('drive.development.tile-albedo', { width: 512, height: 512 }, scene, true);
  const ctx = tile.getContext();
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const x = col * 64; const y = row * 64; const shade = Math.floor(random(row * 8 + col) * 17);
    const gradient = ctx.createLinearGradient(x, y, x + 64, y);
    gradient.addColorStop(0, `rgb(${109 + shade},${59 + shade},${40 + shade})`);
    gradient.addColorStop(.45, `rgb(${192 + shade},${125 + shade},${82 + shade})`);
    gradient.addColorStop(1, `rgb(${131 + shade},${72 + shade},${48 + shade})`);
    ctx.fillStyle = gradient; ctx.fillRect(x, y, 64, 64);
    ctx.fillStyle = 'rgba(59,34,23,.55)'; ctx.fillRect(x, y + 59, 64, 5);
    ctx.fillStyle = 'rgba(239,188,130,.3)'; ctx.fillRect(x, y + 56, 64, 2);
  }
  tile.update(); tile.wrapU = tile.wrapV = 1; tile.anisotropicFilteringLevel = 4;
  roofMaterial.albedoTexture = tile; roofMaterial.albedoColor = Color3.White(); roofMaterial.roughness = .87;
  owned.push(roofMaterial); textures.push(tile);
  const greyTile = new DynamicTexture('drive.development.grey-tile', {width:512,height:512},scene,true);
  const greyContext=greyTile.getContext();
  for(let row=0;row<8;row++)for(let col=0;col<8;col++){
    const x=col*64,y=row*64,shade=Math.floor(random(row*8+col)*18);
    const gradient=greyContext.createLinearGradient(x,y,x+64,y);
    gradient.addColorStop(0,`rgb(${68+shade},${74+shade},${75+shade})`);gradient.addColorStop(.45,`rgb(${128+shade},${132+shade},${128+shade})`);gradient.addColorStop(1,`rgb(${84+shade},${91+shade},${93+shade})`);
    greyContext.fillStyle=gradient;greyContext.fillRect(x,y,64,64);greyContext.fillStyle='rgba(28,33,35,.5)';greyContext.fillRect(x,y+60,64,4);
  }
  greyTile.update();greyTile.wrapU=greyTile.wrapV=1;greyTile.anisotropicFilteringLevel=4;textures.push(greyTile);
  // Clone the solid source, then share the uploaded canvas texture explicitly: Babylon's
  // DynamicTexture.clone() creates an unuploaded canvas and would keep scene readiness false.
  const greyRoof=palette.terracotta.clone('drive.development.grey-roof')!;greyRoof.albedoTexture=greyTile;greyRoof.albedoColor=Color3.White();
  const paleRoof=palette.terracotta.clone('drive.development.pale-clay-roof')!;paleRoof.albedoTexture=tile;paleRoof.albedoColor.set(1,.84,.71);
  owned.push(greyRoof,paleRoof);const roofMaterials=[roofMaterial,greyRoof,paleRoof];
  const signs = new DynamicTexture('drive.development.shop-sign-atlas', { width: 2048, height: 256 }, scene, true);
  const signContext = signs.getContext() as unknown as CanvasRenderingContext2D;
  const shopNames = ['FRESH MARKET', 'COFFEE', 'PHARMACY', 'FITNESS', 'BAKERY', 'DENTAL', 'CLEANERS', 'FLOWERS'];
  for (let i = 0; i < shopNames.length; i++) {
    const x = i % 4 * 512; const y = Math.floor(i / 4) * 128;
    signContext.fillStyle = ['#2c4c4d', '#3f4c62', '#694b40', '#365a40'][i % 4]; signContext.fillRect(x, y, 512, 128);
    signContext.fillStyle = '#faf2dc'; signContext.font = '600 43px Arial'; signContext.textAlign = 'center';
    signContext.fillText(shopNames[i], x + 256, y + 77);
    signContext.fillRect(x + 48, y + 99, 416, 2);
  }
  signs.update(); const signMaterial = new StandardMaterial('drive.development.shop-signs', scene);
  signMaterial.diffuseTexture = signs; signMaterial.specularColor.setAll(.06); signMaterial.disableLighting=true;signMaterial.emissiveColor.setAll(.85);
  signMaterial.backFaceCulling = false;
  owned.push(signMaterial); textures.push(signs);
  const distantMaterial=new PBRMaterial('drive.development.distant-buildings',scene);
  distantMaterial.albedoColor=Color3.White();distantMaterial.roughness=.94;distantMaterial.metallic=0;distantMaterial.environmentIntensity=.65;
  owned.push(distantMaterial);
  const records = new Set<{ buildings: number; houses: number; shops: number; leftLots: number; rightLots: number; meshes: Mesh[]; parked: number; triangles: number; centres:{x:number;z:number}[];near:boolean;farMesh?:Mesh;proxyTriangles:number }>();

  function buildChunk(parent: TransformNode, from: number, to: number, authoredSites?: Site[]) {
    const batches = new Map<string, Batch>(); const obstacles: Obstacle[] = []; const parkedCars: TrafficVisualVehicle[] = [];const plants:DriveVegetationPlacement[]=[];
    const record = { buildings: 0, houses: 0, shops: 0, leftLots: 0, rightLots: 0, meshes: [] as Mesh[], parked: 0, triangles: 0, centres:[] as {x:number;z:number}[],near:true,farMesh:undefined as Mesh|undefined,proxyTriangles:0 };
    function batch(material: Material, detail = false) {
      const key = `${material.uniqueId}.${detail}`; let found = batches.get(key);
      if (!found) { found = { material, detail, positions: [], normals: [], uvs: [], indices: [] }; batches.set(key, found); } return found;
    }
    function point(site: Site, x: number, y: number, z: number) {
      return new Vector3(site.x + Math.cos(site.yaw) * x + Math.sin(site.yaw) * z, y, site.z - Math.sin(site.yaw) * x + Math.cos(site.yaw) * z);
    }
    function quad(site: Site, corners: number[][], material: Material, detail = false, uv = [0, 0, 1, 1]) {
      const target = batch(material, detail); const base = target.positions.length / 3;
      const points = corners.map(c => point(site, c[0], c[1], c[2]));
      let normal = Vector3.Cross(points[1].subtract(points[0]), points[2].subtract(points[0]));
      if (normal.lengthSquared() < 1e-10) normal = Vector3.Cross(points[1].subtract(points[0]), points[3].subtract(points[0]));
      normal.normalize();
      for (const p of points) { target.positions.push(p.x, p.y, p.z); target.normals.push(normal.x, normal.y, normal.z); }
      target.uvs.push(uv[0], uv[1], uv[2], uv[1], uv[2], uv[3], uv[0], uv[3]);
      // Babylon's left-handed front-face convention is opposite the geometric normal cross product.
      target.indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
    }
    function box(site: Site, x: number, y: number, z: number, w: number, h: number, d: number, material: Material, detail = false) {
      const a = x - w / 2, b = x + w / 2, l = y - h / 2, u = y + h / 2, f = z - d / 2, r = z + d / 2;
      quad(site, [[a,l,f],[a,u,f],[b,u,f],[b,l,f]], material, detail, [0,0,w/3,h/3]);
      quad(site, [[b,l,r],[b,u,r],[a,u,r],[a,l,r]], material, detail, [0,0,w/3,h/3]);
      quad(site, [[a,l,r],[a,u,r],[a,u,f],[a,l,f]], material, detail, [0,0,d/3,h/3]);
      quad(site, [[b,l,f],[b,u,f],[b,u,r],[b,l,r]], material, detail, [0,0,d/3,h/3]);
      quad(site, [[a,u,f],[a,u,r],[b,u,r],[b,u,f]], material, detail, [0,0,w/3,d/3]);
      quad(site, [[a,l,r],[a,l,f],[b,l,f],[b,l,r]], material, detail, [0,0,w/3,d/3]);
    }
    function roof(site: Site, x: number, z: number, w: number, d: number, eave: number, rise: number) {
      const a=x-w/2,b=x+w/2,f=z-d/2,r=z+d/2,ra=x-w*.22,rb=x+w*.22;
      const finish=roofMaterials[Math.floor(random(site.seed+41)*roofMaterials.length)];
      quad(site, [[a,eave,f],[ra,eave+rise,z],[rb,eave+rise,z],[b,eave,f]], finish, false, [0,0,w/2,d/3]);
      quad(site, [[b,eave,r],[rb,eave+rise,z],[ra,eave+rise,z],[a,eave,r]], finish, false, [0,0,w/2,d/3]);
      quad(site, [[a,eave,r],[ra,eave+rise,z],[ra,eave+rise,z],[a,eave,f]], finish, false, [0,0,d/2,rise]);
      quad(site, [[b,eave,f],[rb,eave+rise,z],[rb,eave+rise,z],[b,eave,r]], finish, false, [0,0,d/2,rise]);
      box(site,x,eave-.05,z,w,.17,d,palette.curb);
      box(site,x,eave+rise+.015,z,w*.45,.12,.18,finish,true);
    }
    function window(site: Site, x: number, y: number, front: number, width: number, height: number, shutters = false) {
      box(site,x,y,front,width+.22,height+.23,.14,palette.curb,true);
      box(site,x,y,front-.09,width,height,.035,palette.glass);
      box(site,x,y,front-.12,.055,height,.025,palette.white,true);
      box(site,x,y,front-.12,width,.055,.025,palette.white,true);
      box(site,x,y-height/2-.12,front-.10,width+.37,.12,.30,palette.curb,true);
      if (shutters) for (const side of [-1,1]) {
        box(site,x+side*(width/2+.29),y,front-.05,.34,height,.09,palette.teal,true);
        for(let slat=0;slat<5;slat++)box(site,x+side*(width/2+.29),y-height*.4+slat*height*.2,front-.11,.29,.035,.02,palette.dark,true);
      }
    }
    function safeSite(site: Site, radius: number) {
      if(site.authored) return true;
      // Source-shaped neighborhood lots are built separately; procedural rows must
      // not replace lakes, streets or tightly spaced estimated residential frontage.
      if(neighborhoodContextOwnsLand(site.x,site.z)||neighborhoodWaterContains(site.x,site.z,radius+6)||neighborhoodContextRoadContains(site.x,site.z,radius+4))return false;
      if(junctionRoadContains(site.x,site.z,radius+5)) return false;
      const nearest = nearestRoutePoint(site.x,site.z); const road = ROUTE.sections[nearest.sectionIndex];
      if(site.routeS!==undefined){const gap=Math.abs(nearest.s-site.routeS);if(Math.min(gap,ROUTE.length-gap)>130)return false;}
      for(const centerline of [NEIGHBORHOOD.centerlines.greenIsland,NEIGHBORHOOD.centerlines.terrace])for(let i=1;i<centerline.length;i++){
        const a=centerline[i-1],b=centerline[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((site.x-a.x)*dx+(site.z-a.z)*dz)/(dx*dx+dz*dz)));
        if(Math.hypot(site.x-a.x-dx*t,site.z-a.z-dz*t)<radius+8.5)return false;
      }
      const arterial=NEIGHBORHOOD.junctions[2];
      if(site.x>arterial.x-22-radius && site.x<arterial.x+240+radius && Math.abs(site.z-arterial.z)<radius+18)return false;
      return NEIGHBORHOOD.sceneryExclusions.every(zone=>Math.hypot(site.x-zone.x,site.z-zone.z)>zone.radius+radius) && nearest.distance > halfRoad(road)+radius+5;
    }
    function home(site: Site, simple = false) {
      if (!safeSite(site,12)) return;
      const width=(site.compact?14.8:17)+random(site.seed)*(site.compact?1.7:3),height=3.6+random(site.seed+3)*.8,depth=(site.compact?11.5:13)+random(site.seed+4)*(site.compact?1.5:2);
      const wall=walls[Math.floor(random(site.seed+5)*walls.length)];
      box(site,0,height/2+.14,0,width,height,depth,wall);roof(site,0,0,width+1.1,depth+1.1,height+.24,1.75);
      record.buildings++;record.houses++;
      record.centres.push({x:site.x,z:site.z});
      if(site.side===-1)record.leftLots++;else record.rightLots++;
      if(simple){for(const x of [-width*.3,width*.3])window(site,x,2,-depth/2-.02,2,1.4);return;}
      const front=-depth/2;
      box(site,0,.10,front-2,site.compact?20:27,.16,4.5,palette.grass);
      const garageX=width*.27;
      box(site,garageX,1.55,front-.04,5.4,2.8,.16,[palette.white,palette.curb,walls[1]][Math.floor(random(site.seed+43)*3)]);
      for(let line=0;line<5;line++)box(site,garageX,.4+line*.47,front-.14,5.3,.035,.025,palette.pole,true);
      for(const x of [garageX-2.8,garageX+2.8])box(site,x,1.58,front-.15,.18,3.1,.22,palette.curb,true);
      let driveLength=site.driveLength??19+random(site.seed+7)*4;
      if(!site.authored)for(let along=1;along<=driveLength;along+=.5){
        const at=point(site,garageX,0,front-along),nearest=nearestRoutePoint(at.x,at.z);
        if(nearest.distance<halfRoad(ROUTE.sections[nearest.sectionIndex])+.3){driveLength=along;break;}
      }
      box(site,garageX,.04,front-driveLength/2,5.8,.07,driveLength,palette.concrete);
      for(let j=1;j<4;j++)box(site,garageX,.082,front-driveLength*j/4,5.7,.009,.025,palette.pole,true);
      box(site,-width*.29,.14,front-1.6,5.8,.23,3.2,palette.concrete);
      box(site,-width*.29,3.1,front-1.4,6.3,.23,3.6,roofMaterial);
      for(const x of [-width*.43,-width*.14])box(site,x,1.65,front-2.8,.25,3.1,.25,palette.curb);
      box(site,-width*.27,1.36,front-.06,1.1,2.45,.13,palette.teal);
      box(site,-width*.27,1.72,front-.14,.68,.85,.04,palette.glass,true);
      box(site,-width*.27+.38,1.3,front-.17,.05,.19,.04,palette.metal,true);
      box(site,-width*.27-.8,2.1,front-.17,.18,.35,.12,palette.dark,true);
      box(site,-width*.27-.8,2.1,front-.25,.12,.25,.08,palette.white,true);
      window(site,-width*.03,2.03,front-.06,1.7,1.5,true);
      window(site,-width*.41,2.03,front-.06,1.3,1.5);
      for(const side of [-1,1]){
        const wallPoint=point(site,side*width/2,0,0);
        const sideSite={...site,x:wallPoint.x,z:wallPoint.z,yaw:site.yaw-side*Math.PI/2};
        for(const x of [-3.6,2.9])window(sideSite,x,2.03,-.035,1.8,1.5);
      }
      const walkLength=Math.min(10,driveLength-2);
      box(site,-width*.29,.075,front-2-walkLength/2,1.45,.12,walkLength,palette.concrete);
      for(const [gardenX,gardenWidth]of [[-width*.02,4.7],[-width*.43,2.6]]){
        box(site,gardenX,.105,front-2.4,gardenWidth,.14,1.8,mulch);
        for(const edge of [-1,1])box(site,gardenX,.18,front-2.4+edge*.95,gardenWidth+.18,.16,.12,palette.curb,true);
      }
      if(random(site.seed+31)>.32){const p=point(site,-width*.02,0,front-2.4);plants.push({kind:'hedge',x:p.x,z:p.z,height:.70+random(site.seed+32)*.18,yaw:site.yaw,seed:site.seed+3000});}
      if(random(site.seed+33)>.88){const p=point(site,-width*.52,0,front-7);plants.push({kind:'palm',x:p.x,z:p.z,height:6.4,yaw:site.yaw,seed:site.seed+4000});}
      // Side-lot fences stop behind the public sidewalk and keep its walking corridor open.
      if(random(site.seed+34)>.4){
        const fenceX=-width/2-2.8,begin=front-Math.min(13,driveLength-3),end=depth/2+5,length=end-begin;
        for(let z=begin;z<=end;z+=3.2)box(site,fenceX,.62,z,.14,1.24,.14,palette.curb,true);
        for(const y of [.43,.94])box(site,fenceX,y,(begin+end)/2,.10,.12,length,palette.white,true);
      }
      const serviceX=width/2+1.1;
      box(site,serviceX,.68,2.6,1.2,1.32,1.2,palette.pole,true);box(site,serviceX,1.36,2.6,1.25,.08,1.25,palette.dark,true);
      for(let grille=0;grille<7;grille++)box(site,serviceX-.49+grille*.16,1.414,2.6,.06,.022,1.08,palette.metal,true);
      for(let bin=0;bin<2;bin++){
        box(site,serviceX,.53,front+1.8+bin*.7,.48,.94,.52,bin?palette.teal:palette.dark,true);
        box(site,serviceX,1.03,front+1.8+bin*.7,.53,.08,.59,palette.dark,true);
      }
      // A small fenced backyard, pool and screened patio make orbit/side views spatially complete.
      if(!site.compact&&random(site.seed+8)>.45){
        box(site,-3,.10,depth/2+6,10,.15,8,palette.concrete);
        box(site,-3,.185,depth/2+6,7.7,.035,5.7,palette.glass);
        for(const x of [-8,2])for(const z of [depth/2+2,depth/2+10])box(site,x,1.9,z,.09,3.8,.09,palette.dark,true);
        for(const z of [depth/2+2,depth/2+10])box(site,-3,3.8,z,10,.08,.08,palette.dark,true);
      }
      const mail=point(site,-width*.41,0,front-Math.min(17,driveLength-1));
      const mailbox:Site={x:mail.x,z:mail.z,yaw:site.yaw,seed:site.seed};
      box(mailbox,0,.65,0,.10,1.3,.10,palette.pole,true);box(mailbox,0,1.29,0,.35,.28,.43,palette.dark,true);
      for(const x of [-width*.35,0,width*.35]){const p=point(site,x,0,front);obstacles.push({id:`home.${site.seed}.${x}`,x:p.x,z:p.z,radius:2.7});}
      if(random(site.seed+9)>.65){const car=point(site,garageX,0,front-4.5);parkedCars.push({id:`parked.development.${site.seed}`,x:car.x,z:car.z,yaw:site.yaw+Math.PI,kind:random(site.seed)>.65?'suv':'sedan',colorIndex:Math.floor(random(site.seed+11)*8),braking:false,direction:1,speed:0});}
    }
    function plaza(site: Site) {
      if(!safeSite(site,34))return;
      const width=62,depth=16,height=6.0;
      const exterior=walls[Math.floor(random(site.seed)*3)];
      box(site,0,height/2,depth/2,width,height,.4,exterior);
      for(const side of [-1,1])box(site,side*width/2,height/2,0,.4,height,depth,exterior);
      box(site,0,5,-depth/2,width,2,.4,exterior);
      box(site,0,.08,0,width,.16,depth,palette.concrete);
      box(site,0,height+.14,0,width+1,.35,depth+1,palette.curb);
      box(site,0,height+.5,-depth/2,width+.3,.72,.32,walls[0]);
      box(site,0,.07,-depth/2-3.3,width+3,.13,6.5,palette.concrete);
      box(site,0,.025,-depth/2-16.4,width+5,.05,20,palette.asphalt);
      const bay=width/6;
      for(let i=0;i<6;i++){
        const x=-width/2+bay*(i+.5);
        // Recessed display rooms sit behind reflective glazing, giving side looks real parallax.
        box(site,x,2.1,-depth/2+5,bay-.6,4.2,.25,i%2?walls[2]:palette.dark,true);
        box(site,x,.6,-depth/2+2.8,bay*.53,1.15,.8,walls[0],true);
        for(let shelf=0;shelf<3;shelf++){
          box(site,x,1.0+shelf*.63,-depth/2+4.3,bay*.7,.09,.6,palette.dark,true);
          for(let item=0;item<4;item++)box(site,x+(item-1.5)*1.2,1.26+shelf*.63,-depth/2+4.2,.44,.43,.35,[palette.white,palette.teal,palette.terracotta][(item+shelf+i)%3],true);
        }
        quad(site,[[x-(bay-.75)/2,.425,-depth/2-.045],[x-(bay-.75)/2,3.575,-depth/2-.045],[x+(bay-.75)/2,3.575,-depth/2-.045],[x+(bay-.75)/2,.425,-depth/2-.045]],shopGlass);
        for(const j of [-.5,0,.5])box(site,x+j*(bay-.75),2,-depth/2-.10,.09,3.3,.12,palette.metal,true);
        box(site,x,3.62,-depth/2-.15,bay-.2,.17,.25,palette.curb);
        box(site,x,3.80,-depth/2-1.25,bay-.12,.24,2.45,i%2?palette.teal:roofMaterial);
        for(const side of [-1,1])box(site,x+side*.13,1.55,-depth/2-.16,.035,.72,.06,palette.metal,true);
        const sign=(i+Math.floor(site.seed))%8,tx=sign%4/4,ty=Math.floor(sign/4)/2;
        quad(site,[[x-bay*.37,4.25,-depth/2-.24],[x+bay*.37,4.25,-depth/2-.24],[x+bay*.37,5.55,-depth/2-.24],[x-bay*.37,5.55,-depth/2-.24]],signMaterial,false,[tx,ty,tx+.25,ty+.5]);
        box(site,x-bay/2,2.7,-depth/2-.2,.58,5.4,.65,walls[0]);
        if(i%2===0){box(site,x,height+.6,2,2.7,1.2,2.2,palette.pole,true);box(site,x,height+1.23,2,2.3,.09,1.8,palette.dark,true);}
      }
      // Parking bays and wheel stops use one batch per material, not one mesh per stripe.
      for(let i=0;i<=18;i++){
        const x=-width/2+i*width/18;
        box(site,x,.064,-depth/2-11,.09,.012,5.1,palette.white);
        box(site,x,.064,-depth/2-22,.09,.012,5.1,palette.white);
        if(i<18)box(site,x+1.65,.16,-depth/2-8.9,1.8,.25,.24,palette.curb,true);
      }
      for(const x of [-width*.4,width*.4]){
        box(site,x,.10,-depth/2-17,2.6,.18,3,palette.grass);
        box(site,x,3.5,-depth/2-17,.14,7,.14,palette.metal);
        box(site,x,7,-depth/2-17,1.2,.17,.55,palette.dark);
      }
      for(let i=0;i<3;i++){
        const at=point(site,-22+i*20,0,-depth/2-12);
        parkedCars.push({id:`parked.plaza.${site.seed}.${i}`,x:at.x,z:at.z,yaw:site.yaw,kind:i===1?'suv':'sedan',colorIndex:(site.seed+i*3)%8,braking:false,direction:1,speed:0});
      }
      for(const x of [-25,-15,-5,5,15,25]){const p=point(site,x,0,-depth/2);obstacles.push({id:`plaza.${site.seed}.${x}`,x:p.x,z:p.z,radius:4.8});}
      record.buildings++;record.shops+=6;
      record.centres.push({x:site.x,z:site.z});
      if(site.side===-1)record.leftLots++;else record.rightLots++;
    }
    const mid=pointAtDistance((from+to)/2),section=ROUTE.sections[mid.sectionIndex],h=halfRoad(section);
    const junction=ROUTE.turns.some(turn=>Math.abs(turn.s-mid.s)<80);
    if(authoredSites) for(const site of authoredSites) home({...site,authored:true});
    else if(from>75 && to<ROUTE.length-95){
      for(const side of [-1,1]){
        const use=junction && section.character!=='neighborhood'?'retail':roadsideUseAt(mid.s,side),yaw=mid.yaw+side*Math.PI/2;
        if(use==='retail'){
          const p=pointAtDistance((from+to)/2);plaza({x:p.x+Math.cos(p.yaw)*side*(h+49),z:p.z-Math.sin(p.yaw)*side*(h+49),yaw,seed:Math.floor(mid.s)+side,side,routeS:p.s});
        }else for(let i=0;i<3;i++){
          const p=pointAtDistance(from+17+i*33),setback=h+(section.character==='neighborhood'?24:use==='walled'?35:29)+random(from+i)*3;
          home({x:p.x+Math.cos(p.yaw)*side*setback,z:p.z-Math.sin(p.yaw)*side*setback,yaw:p.yaw+side*Math.PI/2,seed:Math.floor(from)+i*7+(side===1?1:2),side,routeS:p.s,driveLength:section.character==='neighborhood'?16:undefined});
        }
        // A second row of roofs fills the driver's side view beyond the first properties.
        for(let i=0;i<2;i++){
          const p=pointAtDistance(from+25+i*50),setback=h+88;
          home({x:p.x+Math.cos(p.yaw)*side*setback,z:p.z-Math.sin(p.yaw)*side*setback,yaw:p.yaw+side*Math.PI/2,seed:Math.floor(from)+800+i*9+side,side,routeS:p.s},true);
        }
        // Short residential access streets are scenery; the reference driving route stays unchanged.
        if(!junction && section.character!=='neighborhood' && Math.floor(from/100)%3===1){
          const p=pointAtDistance(from+2);const site={x:p.x+Math.cos(p.yaw)*side*(h+44),z:p.z-Math.sin(p.yaw)*side*(h+44),yaw:p.yaw,seed:from};
          if(neighborhoodContextOwnsLand(site.x,site.z))continue;
          box(site,0,.024,0,88,.045,7.8,palette.asphalt);
          for(let lane=-35;lane<40;lane+=10)box(site,lane,.052,0,4,.014,.11,palette.yellow);
          for(const edge of [-1,1])box(site,0,.085,edge*4.8,87,.15,1.7,palette.concrete);
        }
      }
    }
    const distant={positions:[] as number[],normals:[] as number[],colors:[] as number[],indices:[] as number[]};
    for(const [key,data] of batches){
      const mesh=new Mesh(`drive.development.${Math.floor(from)}.${key}`,scene),vertices=new VertexData();
      vertices.positions=data.positions;vertices.normals=data.normals;vertices.uvs=data.uvs;vertices.indices=data.indices;vertices.applyToMesh(mesh);
      mesh.material=data.material;mesh.parent=parent;mesh.isPickable=false;mesh.receiveShadows=true;
      mesh.metadata={development:true,castShadow:!data.detail && (walls.includes(data.material as typeof walls[number]) || roofMaterials.includes(data.material as PBRMaterial))};
      if(data.detail)mesh.addLODLevel(125,null);else mesh.addLODLevel(400,null);
      mesh.freezeWorldMatrix();record.meshes.push(mesh);record.triangles+=data.indices.length/3;
      if(!data.detail){
        // Distant buildings retain every shell, roof, driveway and window silhouette
        // in one draw. Texture/material variation is represented by vertex colour.
        const base=distant.positions.length/3;distant.positions.push(...data.positions);distant.normals.push(...data.normals);
        for(const index of data.indices)distant.indices.push(base+index);
        const material=data.material as PBRMaterial;
        let color=material.albedoColor??Color3.White();
        if(roofMaterials.includes(material))color=Color3.FromHexString(material===greyRoof?'#7d8585':material===paleRoof?'#b99578':'#b8825c').toLinearSpace();
        else if(material===palette.grass)color=Color3.FromHexString('#71824f').toLinearSpace();
        else if(material===palette.glass||material===shopGlass)color=Color3.FromHexString('#66828b').toLinearSpace();
        else if(data.material===signMaterial)color=Color3.FromHexString('#3d655a').toLinearSpace();
        for(let i=0;i<data.positions.length;i+=3)distant.colors.push(color.r,color.g,color.b,1);
      }
    }
    if(distant.indices.length){
      const mesh=new Mesh(`drive.development.${Math.floor(from)}.distant-proxy`,scene),vertices=new VertexData();
      vertices.positions=distant.positions;vertices.normals=distant.normals;vertices.colors=distant.colors;vertices.indices=distant.indices;vertices.applyToMesh(mesh);
      mesh.material=distantMaterial;mesh.parent=parent;mesh.isPickable=false;mesh.receiveShadows=false;mesh.metadata={development:true,castShadow:false,distantProxy:true};
      mesh.addLODLevel(360,null);mesh.freezeWorldMatrix();mesh.setEnabled(false);record.farMesh=mesh;record.proxyTriangles=distant.indices.length/3;
    }
    record.parked=parkedCars.length;records.add(record);parent.onDisposeObservable.addOnce(()=>records.delete(record));
    return { obstacles, parkedCars, plants };
  }
  return { buildChunk, buildLots(parent:TransformNode,sites:Site[]){return buildChunk(parent,-100,-1,sites);},exteriorMaterials:{wall:walls[0],roof:roofMaterial},
    update(player:{x:number;z:number}){
      for(const record of records){
        const threshold=record.near?142:125;
        const near=record.centres.some(site=>(site.x-player.x)**2+(site.z-player.z)**2<threshold**2);
        if(near===record.near)continue;record.near=near;
        for(const mesh of record.meshes)mesh.setEnabled(near);record.farMesh?.setEnabled(!near);
      }
    },
    metrics(){return {chunks:records.size,nearChunks:[...records].filter(r=>r.near).length,farChunks:[...records].filter(r=>!r.near).length,enabledMeshes:[...records].reduce((n,r)=>n+(r.near?r.meshes.length:r.farMesh?1:0),0),proxyTriangles:[...records].reduce((n,r)=>n+(!r.near?r.proxyTriangles:0),0),buildings:[...records].reduce((n,r)=>n+r.buildings,0),houses:[...records].reduce((n,r)=>n+r.houses,0),leftLots:[...records].reduce((n,r)=>n+r.leftLots,0),rightLots:[...records].reduce((n,r)=>n+r.rightLots,0),shopfronts:[...records].reduce((n,r)=>n+r.shops,0),meshes:[...records].reduce((n,r)=>n+r.meshes.length,0),triangles:[...records].reduce((n,r)=>n+r.triangles,0),parkedCars:[...records].reduce((n,r)=>n+r.parked,0)};},
    dispose(){records.clear();owned.forEach(material=>material.dispose(false,false));textures.forEach(texture=>texture.dispose());},
  };
}
