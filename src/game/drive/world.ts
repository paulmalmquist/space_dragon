import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Color3, Color4, Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Material } from '@babylonjs/core/Materials/material';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { createDriveMaterials, createDriveSky } from './materials';
import { createDriveCar } from './car';
import { createDriveVegetation } from './vegetation';
import { createRoadsideDevelopment, roadsideUseAt } from './development';
import { createPedestrianPopulation, pedestrianPosesAt } from './pedestrians';
import { createPedestrianVisuals } from './pedestrian-visuals';
import { createTrafficVisuals } from './traffic-visuals';
import type { TrafficVisualVehicle } from './traffic-visuals';
import { TRAFFIC_SIGNALS, signalPhase, nearbyTraffic, trafficPose, trafficCollisionProxies } from './traffic';
import type { TrafficState, TrafficSignalPhase } from './traffic';
import type { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import '@babylonjs/core/Meshes/thinInstanceMesh';
// Eager shader registration keeps the separate lab entry ready on its first render.
import '@babylonjs/core/Shaders/default.vertex';
import '@babylonjs/core/Shaders/default.fragment';
import '@babylonjs/core/Shaders/color.vertex';
import '@babylonjs/core/Shaders/color.fragment';
import { ROUTE, pointAtDistance, nearestRoutePoint } from './route';
import type { RouteSample, RouteSection } from './route';
import type { DriveState } from './simulation';
import { createDriveCamera } from './camera';
import type { DriveCameraPose } from './camera';
import { FICTIONAL_HOUSE } from './house';
import { NEIGHBORHOOD } from './neighborhood';
import { neighborhoodWaterContains, neighborhoodContextRoadContains } from './neighborhood-context';
import { createNeighborhoodScenery } from './neighborhood-world';
import { createDriveJunctionWorld } from './junction-world';
import { junctionRoadContains, junctionInteriorContains } from './junctions';
import type { HouseLayout } from './house';

interface Obstacle { id: string; x: number; z: number; radius: number }
interface Chunk { index: number; from: number; to: number; x: number; z: number; root?: TransformNode; obstacles: Obstacle[]; parkedCars?: TrafficVisualVehicle[]; vegetation?: { dispose(): void }; disposeExtras?: () => void }
interface InstanceBatch { mesh: Mesh; matrices: number[] }
type Shape = 'box' | 'trunk' | 'crown';
type Plant = { kind: 'palm' | 'canopy' | 'hedge'; x: number; z: number; height?: number; yaw?: number; seed?: number };

const CHUNK_LENGTH = 100;
const LOAD_DISTANCE = 310;
const UNLOAD_DISTANCE = 390;
const random = (seed: number) => { const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453123; return v - Math.floor(v); };
const offset = (sample: RouteSample, distance: number, y = 0) => new Vector3(sample.x + Math.cos(sample.yaw) * distance, y, sample.z - Math.sin(sample.yaw) * distance);
const roadHalfWidth = (section: RouteSection) => section.lanes * section.laneWidth + section.medianWidth / 2;

/** Streamed environment with approved reference layout, scanned surfaces and detailed assets. */
export async function createDriveWorld(canvas: HTMLCanvasElement, options: { houseLayout?: HouseLayout; reducedMotion?: boolean } = {}) {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, powerPreference: 'high-performance' });
  engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.5));
  const scene = new Scene(engine);
  let disposeCameraAfterFailure: (() => void) | undefined;
  try {
  scene.clearColor = new Color4(0.63, 0.79, 0.88, 1);
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogStart = 210;
  scene.fogEnd = 420;
  scene.fogColor = new Color3(0.72, 0.77, 0.79);
  scene.ambientColor = new Color3(0.14, 0.16, 0.14);
  scene.skipPointerMovePicking = true;
  const skyLight = new HemisphericLight('drive.sky-light', new Vector3(0.1, 1, 0.2), scene);
  skyLight.intensity = 0.18;
  skyLight.groundColor = new Color3(0.28, 0.31, 0.21);
  const sun = new DirectionalLight('drive.sun', new Vector3(-0.55, -0.85, -0.38), scene);
  sun.intensity = 2.1;
  sun.diffuse = new Color3(1, 0.95, 0.84);
  const cameraRig = createDriveCamera(scene, canvas, options.reducedMotion);
  disposeCameraAfterFailure = () => cameraRig.dispose();
  const palette = createDriveMaterials(scene);
  const development = createRoadsideDevelopment(scene, palette);
  const { asphalt, concrete, curb, white, yellow, medianGrass, terrainGrass,
    pole, metal, wall, terracotta, storefront, glass, teal, dark, signalGreen } = palette;
  const sky = createDriveSky(scene);
  const vegetation = await createDriveVegetation(scene);
  const shadows = new ShadowGenerator(1024, sun);
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = ShadowGenerator.QUALITY_LOW;
  shadows.bias = 0.0003;
  shadows.normalBias = 0.035;
  shadows.frustumEdgeFalloff = 0.12;
  sun.autoUpdateExtends = false;
  sun.shadowFrustumSize = 110;
  sun.shadowMinZ = 1; sun.shadowMaxZ = 240;
  const ground = MeshBuilder.CreateGround('drive.terrain', { width: 6000, height: 6000, subdivisions: 1 }, scene);
  ground.material = terrainGrass;
  ground.receiveShadows = true;
  ground.position.y = -0.07;
  ground.isPickable = false;
  const sceneryRoot = new TransformNode('drive.nearby-road-chunks', scene);
  const chunks: Chunk[] = [];
  for (const span of ROUTE.visibleRoadSpans) for (let from = span.fromS; from < span.toS; from += CHUNK_LENGTH) {
    const to = Math.min(from + CHUNK_LENGTH, span.toS);
    const mid = pointAtDistance((from + to) / 2);
    chunks.push({ index:chunks.length, from, to, x: mid.x, z: mid.z, obstacles: [] });
  }
  const staticObstacles: Obstacle[] = [];
  const obstacles: Obstacle[] = [];
  // Closely spaced perimeter circles match solid block footprints without a physics engine.
  // These are bounded by loaded chunks; the 1 m car radius closes the gaps between proxies.
  function blockFootprint(target: Obstacle[], id: string, x: number, z: number, width: number, depth: number, yaw = 0) {
    const point = (localX: number, localZ: number, suffix: string) => target.push({
      id: `${id}.${suffix}`, x: x + Math.cos(yaw) * localX + Math.sin(yaw) * localZ,
      z: z - Math.sin(yaw) * localX + Math.cos(yaw) * localZ, radius: 0.55,
    });
    const across = Math.ceil(width / 2);
    const along = Math.ceil(depth / 2);
    for (let i = 0; i <= across; i++) for (const side of [-1, 1]) point(-width / 2 + width * i / across, side * depth / 2, `x.${i}.${side}`);
    for (let i = 1; i < along; i++) for (const side of [-1, 1]) point(side * width / 2, -depth / 2 + depth * i / along, `z.${i}.${side}`);
  }
  const junctions = TRAFFIC_SIGNALS;
  const signalLights = new Map<number, {id:string;s:number;phase:TrafficSignalPhase;material:PBRMaterial}[]>();
  const signalStates: Record<string, TrafficSignalPhase> = {};
  const trafficVisuals = createTrafficVisuals(scene);
  const roadJunctions = createDriveJunctionWorld(scene, palette);
  const pedestrianPopulation = createPedestrianPopulation();
  const pedestrianVisuals = createPedestrianVisuals(scene);
  const streetMaterials = new Map<string, StandardMaterial>();
  const streetTextures: DynamicTexture[] = [];
  function streetMaterial(label: string) {
    let material = streetMaterials.get(label); if (material) return material;
    const texture = new DynamicTexture(`drive.street-name.${label}`, {width:1024,height:192},scene,true);
    const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;ctx.fillStyle='#16583c';ctx.fillRect(0,0,1024,192);
    ctx.strokeStyle='#d9e9d8';ctx.lineWidth=5;ctx.strokeRect(10,10,1004,172);
    ctx.font='600 76px Arial';ctx.textAlign='center';ctx.fillStyle='#fffdf1';ctx.fillText(label,512,123);texture.update();
    material = new StandardMaterial(`drive.street-name-material.${label}`,scene);
    material.diffuseTexture=texture;material.specularColor.setAll(.02);material.emissiveColor.setAll(.24);
    streetMaterials.set(label,material);streetTextures.push(texture);return material;
  }
  const parkedCars: TrafficVisualVehicle[] = ROUTE.sections.filter(section => !section.invented && section.character!=='neighborhood').flatMap((section,index) => {
    const centreS = section.startS + (section.endS-section.startS)*0.55;
    return [-7,0,7].map((along,i) => {
      const p=pointAtDistance(centreS+along);const at=offset(p,roadHalfWidth(section)+9.3);
      return {id:`parked.${section.id}.${i}`,x:at.x,z:at.z,yaw:p.yaw,kind:i===2?'suv':'sedan',colorIndex:(index*3+i+2)%8,braking:false,direction:1};
    });
  });

  function source(name: string, shape: Shape, mat: Material, parent: TransformNode) {
    let mesh: Mesh;
    if (shape === 'trunk') mesh = MeshBuilder.CreateCylinder(name, { height: 1, diameterTop: 0.75, diameterBottom: 1, tessellation: 12 }, scene);
    else if (shape === 'crown') mesh = MeshBuilder.CreateSphere(name, { diameter: 1, segments: 10 }, scene);
    else mesh = MeshBuilder.CreateBox(name, { size: 1 }, scene);
    mesh.material = mat;
    mesh.parent = parent;
    mesh.isPickable = false;
    return mesh;
  }

  function buildChunk(chunk: Chunk) {
    const root = new TransformNode(`drive.chunk.${chunk.index}`, scene);
    root.parent = sceneryRoot;
    chunk.root = root;
    const batches = new Map<string, InstanceBatch>();
    const plants: Plant[] = [];
    const lights: {id:string;s:number;phase:TrafficSignalPhase;material:PBRMaterial}[]=[];
    signalLights.set(chunk.index,lights);
    chunk.disposeExtras=()=>{for(const light of lights){light.material.dispose();delete signalStates[light.id];}signalLights.delete(chunk.index);};
    function add(shape: Shape, mat: Material, p: Vector3, scale: Vector3, yaw = 0, pitch = 0) {
      const key = `${shape}.${mat.name}`;
      let batch = batches.get(key);
      if (!batch) { batch = { mesh: source(`${root.name}.${key}`, shape, mat, root), matrices: [] }; batches.set(key, batch); }
      batch.matrices.push(...Matrix.Compose(scale, Quaternion.RotationYawPitchRoll(yaw, pitch, 0), p).toArray());
    }
    function palm(p: Vector3, seed: number, height = 7) {
      plants.push({ kind: 'palm', x: p.x, z: p.z, height: height + random(seed) * 2, yaw: seed, seed });
      chunk.obstacles.push({ id: `palm.${seed}`, x: p.x, z: p.z, radius: 0.32 });
    }
    const samples: RouteSample[] = [];
    for (let s = chunk.from; s < chunk.to; s += chunk.from<70?1:5) samples.push(pointAtDistance(s));
    samples.push(pointAtDistance(Math.min(chunk.to,ROUTE.length-0.00001)));
    function sampleRuns(keep:(p:RouteSample)=>boolean){
      const runs:RouteSample[][]=[];let run:RouteSample[]=[];
      for(let i=1;i<samples.length;i++){
        if(keep(pointAtDistance((samples[i-1].s+samples[i].s)/2))){if(!run.length)run.push(samples[i-1]);run.push(samples[i]);}
        else if(run.length){runs.push(run);run=[];}
      }
      if(run.length)runs.push(run);return runs;
    }
    function ribbon(name: string, mat: Material, bounds: (p: RouteSample) => [number, number], y: number, keep:(p:RouteSample)=>boolean=()=>true) {
      for(const [part,run]of sampleRuns(keep).entries()){
      const paths = [run.map(p => offset(p, bounds(p)[0], y)), run.map(p => offset(p, bounds(p)[1], y))];
      const mesh = MeshBuilder.CreateRibbon(`${root.name}.${name}.${part}`, { pathArray: paths, sideOrientation: Mesh.DOUBLESIDE }, scene);
      // A constant real-world texel scale avoids stretching a whole scan over 100 m.
      const uv = paths.flatMap((_, side) => run.flatMap(p => [bounds(p)[side] / 4, p.s / 4]));
      mesh.setVerticesData(VertexBuffer.UVKind, uv.concat(uv));
      mesh.material = mat;
      mesh.parent = root;
      mesh.isPickable = false;
      mesh.receiveShadows = true;
      mesh.freezeWorldMatrix();
      }
    }
    const sectionAt = (p: RouteSample) => ROUTE.sections[p.sectionIndex]!;
    const halfAt = (p: RouteSample) => roadHalfWidth(sectionAt(p));
    function vergeClear(p:RouteSample,side:number){
      if(junctionInteriorContains(p.x,p.z)) return false;
      const verge = offset(p, side * (halfAt(p) + 3.2));
      if(neighborhoodWaterContains(verge.x,verge.z,1) || neighborhoodContextRoadContains(verge.x,verge.z,.5)) return false;
      if(NEIGHBORHOOD.junctions.some(junction=>Math.hypot(p.x-junction.x,p.z-junction.z)<13))return false;
      const at=offset(p,side*(halfAt(p)+1.5)),[a,b]=NEIGHBORHOOD.home.driveway.points;
      const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((at.x-a.x)*dx+(at.z-a.z)*dz)/(dx*dx+dz*dz)));
      return Math.hypot(at.x-a.x-dx*t,at.z-a.z-dz*t)>NEIGHBORHOOD.home.driveway.width*.58;
    }
    ribbon('road', asphalt, p => [-halfAt(p), halfAt(p)], 0.014);
    for (const side of [-1, 1]) {
      ribbon(`verge.${side}`, medianGrass, p => { const h = halfAt(p); return side === 1 ? [h, h + 5.2] : [-h - 5.2, -h]; }, 0.025,p=>vergeClear(p,side));
      ribbon(`curb.${side}`, curb, p => { const h = halfAt(p); return side === 1 ? [h, h + 0.25] : [-h - 0.25, -h]; }, 0.15,p=>vergeClear(p,side));
      ribbon(`sidewalk.${side}`, concrete, p => { const h = halfAt(p); const w = sectionAt(p).sidewalkWidth; return side === 1 ? [h + 3.2, h + 3.2 + w] : [-h - 3.2 - w, -h - 3.2]; }, 0.12,p=>vergeClear(p,side));
      ribbon(`edge-line.${side}`, white, p => { const h = halfAt(p) - 0.55; return [side * h - 0.075, side * h + 0.075]; }, 0.026,p=>!junctionInteriorContains(p.x,p.z));
      ribbon(`gutter.${side}`, concrete, p => { const h = halfAt(p); return side === 1 ? [h - 0.38, h] : [-h, -h + 0.38]; }, 0.018,p=>!junctionInteriorContains(p.x,p.z));
      for(const run of sampleRuns(p=>vergeClear(p,side))){
      const edge = run.map(p => offset(p, side * halfAt(p), 0.15));
      const foot = run.map(p => offset(p, side * halfAt(p), 0.02));
      const riser = MeshBuilder.CreateRibbon(`${root.name}.curb-riser.${side}`, {pathArray:[edge,foot],sideOrientation:Mesh.DOUBLESIDE},scene);
      riser.material = curb; riser.parent = root; riser.receiveShadows = true; riser.isPickable = false;
      }

    }
    const medianSamples = samples.filter(p => sectionAt(p).medianWidth > 0.2);
    if (medianSamples.length > 1) {
      const medianClear=(p:RouteSample)=>sectionAt(p).medianWidth>.2 && !junctionInteriorContains(p.x,p.z) && !ROUTE.turns.some(turn=>p.s>(turn.approachS??turn.s-27)-8 && p.s<(turn.exitS??turn.s+27)+8);
      ribbon('median', medianGrass, p => { const w = sectionAt(p).medianWidth; return [-w / 2, w / 2]; }, 0.115,medianClear);
      for (const side of [-1, 1]) ribbon(`median-edge.${side}`, yellow, p => { const d = sectionAt(p).medianWidth / 2 + 0.12; return [side * d - 0.07, side * d + 0.07]; }, 0.13,medianClear);
    }
    for (let s = Math.ceil(chunk.from / 12) * 12; s < chunk.to; s += 12) {
      const p = pointAtDistance(s);
      if (junctionInteriorContains(p.x,p.z)) continue;
      const section = sectionAt(p);
      for (const side of [-1, 1]) for (let lane = 1; lane < section.lanes; lane++) {
        add('box', white, offset(p, side * (section.medianWidth / 2 + lane * section.laneWidth), 0.03), new Vector3(0.14, 0.015, 4.5), p.yaw);
      }
      if (section.medianWidth < 0.2 && !NEIGHBORHOOD.junctions.some(junction=>Math.hypot(p.x-junction.x,p.z-junction.z)<13)) {
        for(const shift of section.character==='neighborhood'?[-.12,.12]:[0]) add('box', yellow, offset(p, shift, 0.03), new Vector3(0.10, 0.015, section.character==='neighborhood'?12.05:6), p.yaw);
      }
      // Small embedded road reflectors, spaced along the carriageway.
      for (const side of [-1, 1]) add('box', white, offset(p, side * (section.medianWidth / 2 + 0.18), 0.04), new Vector3(0.09, 0.025, 0.16), p.yaw);
    }
    for (let s = Math.ceil(chunk.from / 24) * 24; s < chunk.to; s += 24) {
      const p = pointAtDistance(s);
      const section = sectionAt(p);
      const h = halfAt(p);
      const nearTurn = junctions.some(c => Math.abs(c.s - s) < 35) || ROUTE.turns.some(c => Math.abs(c.s - s) < 40);
      // Local compare-v001: the second leg has a denser palm rhythm and smaller median shrubs.
      const medianPalmSpacing = section.id === 'leg-2' ? 24 : 48;
      if (section.medianWidth > 3 && !nearTurn && s % medianPalmSpacing === 0) palm(offset(p, 0), s, 7.5);
      if (section.medianWidth > 3 && !nearTurn && s % medianPalmSpacing !== 0) plants.push({kind: 'hedge', x:p.x,z:p.z,height:0.75,yaw:p.yaw,seed:s});
      const woodedEdge = section.character === 'canopy' || section.character === 'walls';
      const edgeDensity = Math.max(woodedEdge ? 0.8 : 0.3, section.landscapingDensity);
      const roadsidePalmShare = woodedEdge ? 0.2 : 0.55;
      for (const side of [-1, 1]) {
        const location = offset(p, side * (h + 9 + random(s + side) * 6));
        // A verge beside this route sample can be another road at a T-junction.
        // Check the whole physical route before placing a solid trunk there.
        const nearestRoad=nearestRoutePoint(location.x,location.z);
        const clearOfRoad=nearestRoad.distance-roadHalfWidth(ROUTE.sections[nearestRoad.sectionIndex])>1.6 && !junctionRoadContains(location.x,location.z,2)
          && !neighborhoodWaterContains(location.x,location.z,2) && !neighborhoodContextRoadContains(location.x,location.z,2);
        if (clearOfRoad && random(s + side * 2) < edgeDensity) {
          if (random(s + side * 3) < roadsidePalmShare) palm(location, s + side, 7);
          else {
            plants.push({ kind:'canopy', x:location.x,z:location.z,height:9 + random(s)*3,yaw:s,seed:s });
            chunk.obstacles.push({ id: `tree.${s}.${side}`, x: location.x, z: location.z, radius: 0.4 });
          }
        }
        if (!section.invented && !nearTurn && roadsideUseAt(s,side)==='walled') {
          add('box', wall, offset(p, side * (h + 11), 1.05), new Vector3(0.35, 2.1, 24.2), p.yaw);
          add('box', curb, offset(p, side * (h + 11), 2.17), new Vector3(0.48, 0.16, 24.2), p.yaw);
          add('box', storefront, offset(p, side * (h + 11), 1.2), new Vector3(0.75, 2.4, 0.75), p.yaw);
          for (const shift of [-7, 7]) {
            const at = offset(pointAtDistance(s + shift), side * (h + 9.8));
            plants.push({kind:'hedge',x:at.x,z:at.z,height:1.2,yaw:p.yaw,seed:s+shift+side});
          }
          // Irregular second tree layer gives the suburban edge depth beyond the wall.
          if (s % 48 === 0) {
            const at = offset(p, side * (h + 25));
            plants.push({kind:'canopy',x:at.x,z:at.z,height:11 + random(s+side)*3,yaw:s+side,seed:s+side});
          }
          for (let along = -10; along <= 10; along += 2.5) {
            const at = offset(p, side * (h + 11));
            chunk.obstacles.push({ id: `wall.${s}.${side}.${along}`, x: at.x + Math.sin(p.yaw) * along, z: at.z + Math.cos(p.yaw) * along, radius: 0.5 });
          }
        }
      }
    }
    for (let s = Math.ceil(chunk.from / 4) * 4; s < chunk.to; s += 4) {
      const p = pointAtDistance(s); const section = sectionAt(p); const h = halfAt(p);
      if (junctionInteriorContains(p.x,p.z)) continue;
      for (const side of [-1,1]) {
        add('box', dark, offset(p,side*(h+3.2+section.sidewalkWidth/2),0.124),new Vector3(section.sidewalkWidth,0.004,0.018),p.yaw);
        if (s % 40 === 0) {
          add('box', dark, offset(p,side*(h-0.2),0.024),new Vector3(0.32,0.01,0.65),p.yaw);
          for (let slot=-2;slot<=2;slot++) {
            const grate = offset(p,side*(h-0.2),0.032); grate.x += Math.sin(p.yaw)*slot*0.11; grate.z += Math.cos(p.yaw)*slot*0.11;
            add('box',metal,grate,new Vector3(0.3,0.018,0.035),p.yaw);
          }
        }
      }
    }
    // Street lighting, drainage furniture and waiting areas give the verge human scale.
    for (let s = Math.ceil(chunk.from / 72) * 72; s < chunk.to; s += 72) {
      const p = pointAtDistance(s); const section = sectionAt(p); const h = halfAt(p);
      if (section.invented || section.character==='neighborhood' || junctions.some(j => Math.abs(j.s-s)<25)) continue;
      const at = offset(p,-h-2.6,4.1);
      if(neighborhoodWaterContains(at.x,at.z,2) || neighborhoodContextRoadContains(at.x,at.z,1)) continue;
      add('trunk',metal,at,new Vector3(0.18,8.2,0.18));
      add('box',metal,offset(p,-h-1.4,8.15),new Vector3(2.5,0.12,0.18),p.yaw);
      add('box',dark,offset(p,-h-0.28,8.12),new Vector3(0.65,0.16,0.34),p.yaw);
      add('box',white,offset(p,-h-0.28,8.025),new Vector3(0.54,0.025,0.27),p.yaw);
      add('box',metal,offset(p,-h-2.6,0.2),new Vector3(0.4,0.4,0.4),p.yaw);
      chunk.obstacles.push({id:`lamp.${s}`,x:at.x,z:at.z,radius:0.24});
      // Roadside utility cabinets and orange fire hydrants.
      if(s%144===0){
        add('box',pole,offset(p,h+5.7,0.65),new Vector3(0.8,1.3,0.48),p.yaw);
        add('box',metal,offset(p,h+5.7,1.32),new Vector3(0.86,0.05,0.54),p.yaw);
        const hydrant=offset(p,-h-1.8,0.4);
        add('trunk',terracotta,hydrant,new Vector3(0.25,0.8,0.25));
        add('crown',terracotta,new Vector3(hydrant.x,0.84,hydrant.z),new Vector3(0.3,0.2,0.3));
        add('box',metal,new Vector3(hydrant.x,0.58,hydrant.z),new Vector3(0.48,0.16,0.18),p.yaw);
      }
    }
    for (const section of ROUTE.sections.filter(section => !section.invented && section.character!=='neighborhood')) {
      const stopS = section.startS + Math.min(120,(section.endS-section.startS)*0.55);
      if(stopS<chunk.from || stopS>=chunk.to)continue;
      const p=pointAtDistance(stopS), h=halfAt(p), shelterAt=h+6.3;
      const shelterPosition = offset(p,shelterAt);
      if(neighborhoodWaterContains(shelterPosition.x,shelterPosition.z,4) || neighborhoodContextRoadContains(shelterPosition.x,shelterPosition.z,3)) continue;
      const local = (across:number,along:number,y:number) => {
        const at=offset(p,shelterAt+across,y);at.x+=Math.sin(p.yaw)*along;at.z+=Math.cos(p.yaw)*along;return at;
      };
      add('box',concrete,local(0,0,0.1),new Vector3(2.8,0.2,5.4),p.yaw);
      const shelter=local(0,0,0);blockFootprint(chunk.obstacles,`shelter.${section.id}`,shelter.x,shelter.z,2,4,p.yaw);
      for(const along of [-1.9,1.9])for(const across of [-0.75,0.75])add('trunk',metal,local(across,along,1.4),new Vector3(0.07,2.6,0.07));
      add('box',metal,local(0,0,2.8),new Vector3(2.1,0.16,4.6),p.yaw);
      add('box',glass,local(0.83,0,1.55),new Vector3(0.035,2.3,3.8),p.yaw);
      // Timber bench slats, back and discrete support legs.
      for(let slat=0;slat<4;slat++)add('box',terracotta,local(0.04+slat*0.12,0,0.62),new Vector3(0.095,0.055,2.8),p.yaw);
      for(let slat=0;slat<3;slat++)add('box',terracotta,local(0.57,0,0.83+slat*0.12),new Vector3(0.055,0.09,2.8),p.yaw);
      for(const along of [-1,1])add('box',metal,local(0.25,along,0.35),new Vector3(0.45,0.55,0.07),p.yaw);
      add('trunk',dark,local(-0.1,2.65,0.55),new Vector3(0.52,0.85,0.52));
      add('trunk',metal,local(-0.1,2.65,0.99),new Vector3(0.57,0.07,0.57));
      add('trunk',metal,local(-1.4,-2.3,1.45),new Vector3(0.06,2.9,0.06));
      add('box',teal,local(-1.4,-2.3,2.68),new Vector3(0.035,0.55,0.5),p.yaw);
      // The icon is deliberately recognizable without a reading task.
      add('box',white,local(-1.43,-2.3,2.71),new Vector3(0.02,0.25,0.32),p.yaw);
      for(const wheelZ of [-0.1,0.1]) add('crown',dark,local(-1.45,-2.3+wheelZ,2.55),new Vector3(0.035,0.06,0.06),p.yaw);
    }
    const poleDistances: number[] = [];
    for (const section of ROUTE.sections) {
      if (section.invented || section.character==='neighborhood') continue;
      const first = section.startS + Math.ceil((Math.max(chunk.from, section.startS) - section.startS) / section.poleSpacing) * section.poleSpacing;
      for (let s = first; s < Math.min(chunk.to, section.endS); s += section.poleSpacing) poleDistances.push(s);
    }
    for (const s of poleDistances) {
      const p = pointAtDistance(s);
      const section = sectionAt(p);
      if (section.invented || section.character==='neighborhood') continue;
      const h = halfAt(p);
      const post = offset(p, h + 6.2, 6.4);
      if (junctionRoadContains(post.x,post.z,1)) continue;
      if (neighborhoodWaterContains(post.x,post.z,1) || neighborhoodContextRoadContains(post.x,post.z,1)) continue;
      add('trunk', pole, post, new Vector3(0.35, 12.8, 0.35));
      add('box', pole, new Vector3(post.x, 11.4, post.z), new Vector3(3, 0.15, 0.18), p.yaw);
      chunk.obstacles.push({ id: `pole.${s}`, x: post.x, z: post.z, radius: 0.5 });
      for (const side of [-1,1]) {
        const at = offset(p,h+6.2+side,11.7);
        add('trunk',white,at,new Vector3(0.18,0.4,0.18));
        add('box',metal,offset(p,h+6.2,6.6),new Vector3(0.45,0.1,0.45));
      }
      const next = pointAtDistance(Math.min(s + section.poleSpacing, section.endS - 0.1));
      const nextSection = sectionAt(next);
      const end = offset(next, roadHalfWidth(nextSection) + 6.2, 11.7);
      for (const shift of [-1, 1]) {
        const startWire = new Vector3(post.x + Math.cos(p.yaw) * shift, 11.7, post.z - Math.sin(p.yaw) * shift);
        const endWire = new Vector3(end.x + Math.cos(next.yaw) * shift, 11.7, end.z - Math.sin(next.yaw) * shift);
        const wirePoints = Array.from({length:13}, (_, i) => { const t=i/12; const at=Vector3.Lerp(startWire,endWire,t); at.y -= Math.sin(t*Math.PI)*0.7; return at; });
        const wire = MeshBuilder.CreateLines(`${root.name}.wire.${s}.${shift}`, { points: wirePoints }, scene);
        wire.color = new Color3(0.22, 0.29, 0.28); wire.parent = root; wire.isPickable = false;
      }
    }
    for (const section of ROUTE.sections.filter(section=>!section.invented && section.character!=='neighborhood')) {
      const parkingS=section.startS+(section.endS-section.startS)*0.55;
      if(parkingS<chunk.from||parkingS>=chunk.to)continue;
      const p=pointAtDistance(parkingS), h=halfAt(p);
      add('box',asphalt,offset(p,h+9.3,0.025),new Vector3(6.5,0.05,24),p.yaw);
      add('box',concrete,offset(p,h+3.3,0.027),new Vector3(7,0.055,4.8),p.yaw);
      for(const along of [-10.5,-3.5,3.5,10.5]) {
        const at=offset(p,h+9.3,0.057);at.x+=Math.sin(p.yaw)*along;at.z+=Math.cos(p.yaw)*along;
        add('box',white,at,new Vector3(5.4,0.01,0.11),p.yaw);
      }
    }
    for (const checkpoint of junctions) {
      if (checkpoint.s < chunk.from || checkpoint.s >= chunk.to || checkpoint.s < 80) continue;
      const p = pointAtDistance(checkpoint.s);
      const h = halfAt(p);
      const lensMaterials = (['red','amber','green'] as const).map(phase=>{
        const material=signalGreen.clone(`${root.name}.signal.${checkpoint.id}.${phase}`)!;
        lights.push({id:checkpoint.id,s:checkpoint.s,phase,material});return material;
      });
      // Overhead signal assemblies and a marked pedestrian crossing.
      for (const side of [-1, 1]) {
        add('trunk', metal, offset(p, side * (h + 1.1), 3.5), new Vector3(0.22, 7, 0.22));
        add('box', metal, offset(p, side * h / 2, 7), new Vector3(h + 2, 0.2, 0.2), p.yaw);
        for (let lane = 0; lane < sectionAt(p).lanes; lane++) {
          const d = side * (sectionAt(p).medianWidth / 2 + (lane + 0.5) * sectionAt(p).laneWidth);
          add('box', dark, offset(p, d, 6.36), new Vector3(0.52, 1.33, 0.35), p.yaw);
          for(let lens=0;lens<3;lens++)add('crown',lensMaterials[lens],offset(p,d,6.73-lens*0.37),new Vector3(0.29,0.29,0.39),p.yaw);
        }
      }
      const cross = pointAtDistance(Math.max(0, checkpoint.s - 8));
      for (let d = -h + 0.8; d < h; d += 1.5) add('box', white, offset(cross, d, 0.035), new Vector3(0.65, 0.02, 4), p.yaw);
      const turn = ROUTE.turns.find(candidate=>Math.abs(candidate.s-checkpoint.s)<80);
      const nameSection = turn ? ROUTE.sections[turn.toSection] : sectionAt(p);
      const label = checkpoint.streetName ?? (nameSection.invented ? ROUTE.sections.find(section=>!section.invented)!.label : nameSection.label);
      for(const side of [-1,1]){
        const signAt=offset(p,side*(h*.55),7.75);
        add('box',metal,new Vector3(signAt.x,7.33,signAt.z),new Vector3(.10,.7,.10),p.yaw);
        const sign=MeshBuilder.CreatePlane(`${root.name}.street-sign.${label}.${side}`,{width:5,height:.94,sideOrientation:Mesh.FRONTSIDE},scene);
        sign.position.copyFrom(signAt);sign.rotation.y=p.yaw+(side===1?Math.PI:0);sign.material=streetMaterial(label);sign.parent=root;sign.isPickable=false;
        sign.metadata={streetName:label};sign.addLODLevel(250,null);
      }
    }
    for (const batch of batches.values()) {
      batch.mesh.thinInstanceSetBuffer('matrix', new Float32Array(batch.matrices), 16, true);
      batch.mesh.thinInstanceRefreshBoundingInfo();
      batch.mesh.receiveShadows = true;
      // Paint, pavement and grass batches lie on the ground. They receive cast
      // shadows but need no second draw into the shadow map themselves.
      batch.mesh.metadata={roadsideBatch:true,castShadow:![asphalt,concrete,curb,white,yellow,medianGrass,terrainGrass].includes(batch.mesh.material as PBRMaterial)};
      batch.mesh.freezeWorldMatrix();
    }
    const builtDevelopment = development.buildChunk(root, chunk.from, chunk.to);
    plants.push(...builtDevelopment.plants);
    chunk.vegetation = vegetation.addToChunk(root, plants, shadows);
    chunk.obstacles.push(...builtDevelopment.obstacles);
    chunk.parkedCars = builtDevelopment.parkedCars;
  }

  const neighborhood = createNeighborhoodScenery(scene,palette,options.houseLayout ?? FICTIONAL_HOUSE,development,streetMaterial);
  const homeRoot = neighborhood.root;
  const homeObstacles = neighborhood.obstacles;

  const carRig = createDriveCar(scene);
  const car = carRig.root;
  // A soft local occlusion footprint anchors the tires/body between shadow-map texels.
  const contactTexture = new DynamicTexture('drive.car.occlusion', {width:128,height:128},scene,false);
  const context = contactTexture.getContext();
  const gradient = context.createRadialGradient(64,64,20,64,64,64);
  gradient.addColorStop(0,'rgba(0,0,0,0.5)'); gradient.addColorStop(0.55,'rgba(0,0,0,0.3)'); gradient.addColorStop(1,'rgba(0,0,0,0)');
  context.fillStyle=gradient;context.fillRect(0,0,128,128);contactTexture.hasAlpha=true;contactTexture.update();
  const contactMaterial = new StandardMaterial('drive.car.occlusion-material',scene);
  contactMaterial.diffuseTexture=contactTexture;contactMaterial.useAlphaFromDiffuseTexture=true;contactMaterial.disableLighting=true;contactMaterial.emissiveColor.set(1,1,1);
  const contact = MeshBuilder.CreateGround('drive.car.occlusion-footprint',{width:2.6,height:5.2},scene);
  contact.material=contactMaterial;contact.position.y=0.035;contact.parent=car;contact.isPickable=false;

  const homeVegetation = vegetation.addToChunk(homeRoot, neighborhood.plants, shadows);
  for (const mesh of homeRoot.getChildMeshes()) mesh.receiveShadows = true;
  const [skyLoaded] = await Promise.all([sky.ready, carRig.ready, pedestrianVisuals.ready]);
  if (!skyLoaded) throw new Error('The daylight environment could not load');

  let lastStreamX = Number.POSITIVE_INFINITY;
  let lastStreamZ = Number.POSITIVE_INFINITY;
  let disposed = false;
  let neighborhoodEnabled = true;
  function stream(x: number, z: number) {
    if (Math.hypot(x - lastStreamX, z - lastStreamZ) < 22) return;
    lastStreamX = x; lastStreamZ = z;
    let changed = false;
    for (const chunk of chunks) {
      const distance = Math.hypot(chunk.x - x, chunk.z - z);
      if (!chunk.root && distance < LOAD_DISTANCE) { buildChunk(chunk); changed = true; }
      else if (chunk.root && distance > UNLOAD_DISTANCE) { chunk.vegetation?.dispose(); chunk.vegetation = undefined; chunk.disposeExtras?.(); chunk.root.dispose(); chunk.root = undefined; chunk.obstacles.length = 0; chunk.parkedCars = undefined; changed = true; }
    }
    const nearNeighborhood = Math.min(Math.hypot(x-NEIGHBORHOOD.culdesac.x,z-NEIGHBORHOOD.culdesac.z),Math.hypot(x-NEIGHBORHOOD.gate.x,z-NEIGHBORHOOD.gate.z)) < 300;
    if (changed || nearNeighborhood!==neighborhoodEnabled) { staticObstacles.length = 0; if (nearNeighborhood) staticObstacles.push(...homeObstacles); for (const chunk of chunks) if (chunk.root) staticObstacles.push(...chunk.obstacles); }
    neighborhoodEnabled=nearNeighborhood;homeRoot.setEnabled(nearNeighborhood);
    // Shadow rendering follows the car and excludes distant streamed scenery.
    const plantCasters = (shadows.getShadowMap()!.renderList ?? []).filter(mesh => mesh.name.startsWith('drive.vegetation.') && !mesh.isDisposed());
    shadows.getShadowMap()!.renderList = [...plantCasters, ...scene.meshes.filter(mesh => {
      if (mesh.name.startsWith('drive.traffic.') || mesh.name.startsWith('drive.pedestrian.') || mesh.name.startsWith('drive.vegetation.') || mesh.getTotalVertices() === 0 || !mesh.isEnabled() || !mesh.isVisible || mesh.name.includes('terrain') || mesh.name.includes('sky') || mesh.name.includes('occlusion') || mesh.name.includes('.road') || mesh.name.includes('source')) return false;
      if (mesh.name.startsWith('drive.junction.')) return false;
      if (mesh.metadata?.development && !mesh.metadata.castShadow) return false;
      if (mesh.metadata?.neighborhood && !mesh.metadata.castShadow) return false;
      if (mesh.metadata?.roadsideBatch && !mesh.metadata.castShadow) return false;
      if (/clear-front-glazing|rear-privacy-glazing/.test(mesh.material?.name??'')) return false;
      const bounds = mesh.getBoundingInfo().boundingSphere;
      return Vector3.DistanceSquared(bounds.centerWorld, new Vector3(x, 0, z)) < (65 + Math.min(bounds.radiusWorld, 20)) ** 2;
    })];
  }
  function setTraffic(traffic:TrafficState,player:DriveState) {
    obstacles.length=0;obstacles.push(...staticObstacles,...trafficCollisionProxies(traffic,player.x,player.z));
    for (const obstacle of roadJunctions.obstacles) if (Math.hypot(obstacle.x-player.x,obstacle.z-player.z)<65) obstacles.push(obstacle);
    for(const parked of [...parkedCars,...neighborhood.parkedCars,...chunks.flatMap(chunk=>chunk.parkedCars??[])])if(Math.hypot(parked.x-player.x,parked.z-player.z)<45)for(const along of [-1.1,0,1.1])obstacles.push({id:parked.id,x:parked.x+Math.sin(parked.yaw)*along,z:parked.z+Math.cos(parked.yaw)*along,radius:0.9});
  }
  return {
    engine, scene, car, cameraRig, obstacles, setTraffic, setHomeCutaway:neighborhood.setCutaway,
    update(state: DriveState, delta: number, traffic?: TrafficState, driver?: {steer:number;brake:number;throttle:number;paused?:boolean}, renderPose: DriveCameraPose = state) {
      if (disposed) return;
      car.position.set(renderPose.x, 0, renderPose.z);
      car.rotation.y = renderPose.yaw;
      car.computeWorldMatrix(true);
      stream(state.x, state.z);
      roadJunctions.update(state);
      development.update(state);
      vegetation.update(state);
      pedestrianVisuals.update(pedestrianPosesAt(state.elapsedSeconds,pedestrianPopulation),state);
      if(traffic){
        setTraffic(traffic,state);
        const vehicles=nearbyTraffic(traffic,state.x,state.z,350).map(vehicle=>({...vehicle,...trafficPose(vehicle)}));
        trafficVisuals.update([...vehicles,...parkedCars,...neighborhood.parkedCars,...chunks.flatMap(chunk=>chunk.parkedCars??[])],state);
        const shadowMap=shadows.getShadowMap()!;
        shadowMap.renderList=[...(shadowMap.renderList??[]).filter(mesh=>!mesh.name.startsWith('drive.traffic.')&&!mesh.name.startsWith('drive.pedestrian.')&&!mesh.name.startsWith('drive.junction.')&&!mesh.isDisposed()),...trafficVisuals.shadowMeshes,...pedestrianVisuals.shadowMeshes,...roadJunctions.shadowMeshes];
      }
      for(const lights of signalLights.values())for(const light of lights){
        const signal=TRAFFIC_SIGNALS.find(signal=>signal.id===light.id)!;
        const phase=signalPhase(signal,traffic?.elapsedSeconds ?? state.elapsedSeconds);signalStates[light.id]=phase;
        const color=Color3.FromHexString(light.phase==='red'?'#ff3924':light.phase==='amber'?'#ffc444':'#52e786').toLinearSpace();
        light.material.albedoColor=color.scale(phase===light.phase?0.8:0.035);
        light.material.emissiveColor=color.scale(phase===light.phase?1.1:0);
      }
      carRig.update(renderPose.speed, delta, driver?.steer??0, {brake:driver?.brake??0,throttle:driver?.throttle??0,paused:driver?.paused??false});
      carRig.setCabinView(cameraRig.mode==='dashboard');
      sun.position.set(renderPose.x + 66, 102, renderPose.z + 45.6);
      cameraRig.update(renderPose, delta);
    },
    render() { if (!disposed) scene.render(); },
    resize() { engine.resize(); },
    metrics() { return { junctions:roadJunctions.metrics(),neighborhood:neighborhood.metrics(),pedestrians:pedestrianVisuals.metrics(),development:development.metrics(),streetNames:[...streetMaterials.keys()],traffic:trafficVisuals.metrics(), signals:{...signalStates}, vegetation: vegetation.metrics(), loadedChunks: chunks.filter(c => c.root).length, totalChunks: chunks.length, meshes: scene.meshes.length, fps: engine.getFps(), camera: cameraRig.mode,
      carPosition: car.position.asArray(), carYaw: car.rotation.y,
      cameraPosition: cameraRig.camera.position.asArray(), cameraDirection: cameraRig.camera.getDirection(Vector3.Forward()).asArray(), activeMeshes: scene.getActiveMeshes().length }; },
    dispose() { if (disposed) return; disposed = true; cameraRig.dispose(); roadJunctions.dispose(); trafficVisuals.dispose(); pedestrianVisuals.dispose();homeVegetation.dispose(); vegetation.dispose(); development.dispose(); carRig.dispose(); neighborhood.dispose(); shadows.dispose(); streetMaterials.forEach(material=>material.dispose(false,false));streetTextures.forEach(texture=>texture.dispose());palette.dispose(); sky.dispose(); scene.dispose(); engine.dispose(); },
  };
  } catch (error) {
    disposeCameraAfterFailure?.();
    scene.dispose();
    engine.dispose();
    throw error;
  }
}
