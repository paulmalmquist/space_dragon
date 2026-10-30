import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Color3, Color4, Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import '@babylonjs/core/Meshes/thinInstanceMesh';
// Eager shader registration keeps the separate lab entry ready on its first render.
import '@babylonjs/core/Shaders/default.vertex';
import '@babylonjs/core/Shaders/default.fragment';
import '@babylonjs/core/Shaders/color.vertex';
import '@babylonjs/core/Shaders/color.fragment';
import { ROUTE, pointAtDistance } from './route';
import type { RouteSample, RouteSection } from './route';
import type { DriveState } from './simulation';
import { createDriveCamera } from './camera';
import { buildHouse, FICTIONAL_HOUSE } from './house';
import type { HouseLayout } from './house';

interface Obstacle { id: string; x: number; z: number; radius: number }
interface Chunk { index: number; from: number; to: number; x: number; z: number; root?: TransformNode; obstacles: Obstacle[] }
interface InstanceBatch { mesh: Mesh; matrices: number[] }
type Shape = 'box' | 'trunk' | 'crown' | 'leaf';

const TAU = Math.PI * 2;
const CHUNK_LENGTH = 100;
const LOAD_DISTANCE = 310;
const UNLOAD_DISTANCE = 390;
const random = (seed: number) => { const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453123; return v - Math.floor(v); };
const offset = (sample: RouteSample, distance: number, y = 0) => new Vector3(sample.x + Math.cos(sample.yaw) * distance, y, sample.z - Math.sin(sample.yaw) * distance);
const roadHalfWidth = (section: RouteSection) => section.lanes * section.laneWidth + section.medianWidth / 2;

/** Entirely procedural/public geometry; private layout is injected explicitly by the dev-only caller. */
export function createDriveWorld(canvas: HTMLCanvasElement, options: { houseLayout?: HouseLayout; reducedMotion?: boolean } = {}) {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, powerPreference: 'high-performance' });
  engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.5));
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.63, 0.79, 0.88, 1);
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogStart = 175;
  scene.fogEnd = 365;
  scene.fogColor = new Color3(0.68, 0.81, 0.85);
  scene.ambientColor = new Color3(0.14, 0.16, 0.14);
  scene.skipPointerMovePicking = true;
  const skyLight = new HemisphericLight('drive.sky-light', new Vector3(0.1, 1, 0.2), scene);
  skyLight.intensity = 0.72;
  skyLight.groundColor = new Color3(0.28, 0.31, 0.21);
  const sun = new DirectionalLight('drive.sun', new Vector3(-0.5, -0.9, 0.35), scene);
  sun.intensity = 0.68;
  sun.diffuse = new Color3(1, 0.95, 0.84);
  const cameraRig = createDriveCamera(scene, canvas, options.reducedMotion);
  const materials = new Map<string, StandardMaterial>();
  function material(key: string, hex: string, specular = 0.03) {
    const existing = materials.get(key);
    if (existing) return existing;
    const m = new StandardMaterial(`drive.material.${key}`, scene);
    m.diffuseColor = Color3.FromHexString(hex);
    m.specularColor.set(specular, specular, specular);
    m.specularPower = 52;
    materials.set(key, m);
    return m;
  }
  const asphalt = material('asphalt', '#52636a', 0.28);
  const wet = material('wet-asphalt', '#667c83', 0.45);
  const concrete = material('concrete', '#c9c7b5');
  const curb = material('curb', '#e1ddd1');
  const white = material('paint-white', '#f1edcf');
  const yellow = material('paint-yellow', '#e2bf58');
  const grass = material('grass', '#77915d');
  const medianGrass = material('median-grass', '#81995e');
  const hedge = material('hedge', '#41664b');
  const leaves = material('palm-leaves', '#426e51');
  leaves.backFaceCulling = false;
  leaves.twoSidedLighting = true;
  const treeLeaves = material('tree-leaves', '#4f7654');
  const trunk = material('trunk', '#9b8d6a');
  const pole = material('pole', '#aca798');
  const metal = material('metal', '#49575a');
  const wall = material('boundary-wall', '#b9ae93');
  const terracotta = material('terracotta', '#b88063');
  const storefront = material('storefront', '#d4c5a4');
  const glass = material('glass', '#50777d', 0.55);
  const teal = material('teal', '#3b8c8c', 0.22);
  const dark = material('rubber', '#273335');
  const signalGreen = material('signal-green', '#a6d586');
  signalGreen.emissiveColor.set(0.3, 0.55, 0.2);
  const rearLight = material('rear-light', '#e58b66');
  rearLight.emissiveColor.set(0.25, 0.06, 0.025);
  const ground = MeshBuilder.CreateGround('drive.terrain', { width: 2200, height: 2200, subdivisions: 1 }, scene);
  ground.material = grass;
  ground.position.y = -0.07;
  ground.isPickable = false;
  const sceneryRoot = new TransformNode('drive.nearby-road-chunks', scene);
  const chunks: Chunk[] = [];
  for (let from = 0, index = 0; from < ROUTE.length; from += CHUNK_LENGTH, index++) {
    const to = Math.min(from + CHUNK_LENGTH, ROUTE.length);
    const mid = pointAtDistance((from + to) / 2);
    chunks.push({ index, from, to, x: mid.x, z: mid.z, obstacles: [] });
  }
  const obstacles: Obstacle[] = [];
  const homeObstacles: Obstacle[] = [];
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
  const junctions = ROUTE.checkpoints.filter(c => c.s >= 80).map(c => ({ s: c.s }));
  const secondLeg = ROUTE.sections.find(s => s.id === 'leg-2');
  // A secondary signal breaks up the long second road leg, as seen in the reference log.
  if (secondLeg) junctions.push({ s: secondLeg.startS + 180 });

  function box(name: string, position: Vector3, size: Vector3, mat: StandardMaterial, parent?: TransformNode, yaw = 0) {
    const mesh = MeshBuilder.CreateBox(name, { width: size.x, height: size.y, depth: size.z }, scene);
    mesh.position.copyFrom(position);
    mesh.rotation.y = yaw;
    mesh.material = mat;
    mesh.isPickable = false;
    if (parent) mesh.parent = parent;
    return mesh;
  }

  function source(name: string, shape: Shape, mat: StandardMaterial, parent: TransformNode) {
    let mesh: Mesh;
    if (shape === 'trunk') mesh = MeshBuilder.CreateCylinder(name, { height: 1, diameterTop: 0.75, diameterBottom: 1, tessellation: 6 }, scene);
    else if (shape === 'crown') mesh = MeshBuilder.CreateSphere(name, { diameter: 1, segments: 4 }, scene);
    else if (shape === 'leaf') {
      mesh = new Mesh(name, scene);
      const data = new VertexData();
      data.positions = [0, 0, 0, -0.65, -0.1, 1.5, 0, -0.65, 3.3, 0.65, -0.1, 1.5, 0, 0.18, 1.3];
      data.indices = [0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4];
      const normals: number[] = [];
      VertexData.ComputeNormals(data.positions, data.indices, normals);
      data.normals = normals;
      data.applyToMesh(mesh);
    } else mesh = MeshBuilder.CreateBox(name, { size: 1 }, scene);
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
    function add(shape: Shape, mat: StandardMaterial, p: Vector3, scale: Vector3, yaw = 0, pitch = 0) {
      const key = `${shape}.${mat.name}`;
      let batch = batches.get(key);
      if (!batch) { batch = { mesh: source(`${root.name}.${key}`, shape, mat, root), matrices: [] }; batches.set(key, batch); }
      batch.matrices.push(...Matrix.Compose(scale, Quaternion.RotationYawPitchRoll(yaw, pitch, 0), p).toArray());
    }
    function palm(p: Vector3, seed: number, height = 7) {
      const h = height + random(seed) * 2;
      add('trunk', trunk, new Vector3(p.x, h / 2, p.z), new Vector3(0.42, h, 0.42));
      for (let k = 0; k < 7; k++) add('leaf', leaves, new Vector3(p.x, h, p.z), new Vector3(1, 1, 1), k * TAU / 7 + seed);
      chunk.obstacles.push({ id: `palm.${seed}`, x: p.x, z: p.z, radius: 0.32 });
    }
    const samples: RouteSample[] = [];
    for (let s = chunk.from; s < chunk.to; s += 5) samples.push(pointAtDistance(s));
    samples.push(pointAtDistance(chunk.to));
    function ribbon(name: string, mat: StandardMaterial, bounds: (p: RouteSample) => [number, number], y: number) {
      const paths = [samples.map(p => offset(p, bounds(p)[0], y)), samples.map(p => offset(p, bounds(p)[1], y))];
      const mesh = MeshBuilder.CreateRibbon(`${root.name}.${name}`, { pathArray: paths, sideOrientation: Mesh.DOUBLESIDE }, scene);
      mesh.material = mat;
      mesh.parent = root;
      mesh.isPickable = false;
      mesh.freezeWorldMatrix();
    }
    const sectionAt = (p: RouteSample) => ROUTE.sections[p.sectionIndex]!;
    const halfAt = (p: RouteSample) => roadHalfWidth(sectionAt(p));
    ribbon('road', asphalt, p => [-halfAt(p), halfAt(p)], 0.014);
    for (const side of [-1, 1]) {
      ribbon(`verge.${side}`, medianGrass, p => { const h = halfAt(p); return side === 1 ? [h, h + 5.2] : [-h - 5.2, -h]; }, 0.025);
      ribbon(`curb.${side}`, curb, p => { const h = halfAt(p); return side === 1 ? [h, h + 0.25] : [-h - 0.25, -h]; }, 0.15);
      ribbon(`sidewalk.${side}`, concrete, p => { const h = halfAt(p); const w = sectionAt(p).sidewalkWidth; return side === 1 ? [h + 3.2, h + 3.2 + w] : [-h - 3.2 - w, -h - 3.2]; }, 0.12);
      ribbon(`edge-line.${side}`, white, p => { const h = halfAt(p) - 0.55; return [side * h - 0.075, side * h + 0.075]; }, 0.026);
    }
    const medianSamples = samples.filter(p => sectionAt(p).medianWidth > 0.2);
    if (medianSamples.length > 1) {
      ribbon('median', medianGrass, p => { const w = sectionAt(p).medianWidth; return [-w / 2, w / 2]; }, 0.115);
      for (const side of [-1, 1]) ribbon(`median-edge.${side}`, yellow, p => { const d = sectionAt(p).medianWidth / 2 + 0.12; return [side * d - 0.07, side * d + 0.07]; }, 0.13);
    }
    for (let s = Math.ceil(chunk.from / 12) * 12; s < chunk.to; s += 12) {
      const p = pointAtDistance(s);
      const section = sectionAt(p);
      for (const side of [-1, 1]) for (let lane = 1; lane < section.lanes; lane++) {
        add('box', white, offset(p, side * (section.medianWidth / 2 + lane * section.laneWidth), 0.03), new Vector3(0.14, 0.015, 4.5), p.yaw);
      }
      if (section.medianWidth < 0.2) add('box', yellow, offset(p, 0, 0.03), new Vector3(0.12, 0.015, 6), p.yaw);
      if (random(s) > 0.68) add('box', wet, offset(p, (random(s + 1) - 0.5) * halfAt(p), 0.025), new Vector3(1.4, 0.004, 4.5), p.yaw);
    }
    for (let s = Math.ceil(chunk.from / 24) * 24; s < chunk.to; s += 24) {
      const p = pointAtDistance(s);
      const section = sectionAt(p);
      const h = halfAt(p);
      const nearTurn = junctions.some(c => Math.abs(c.s - s) < 35) || ROUTE.turns.some(c => Math.abs(c.s - s) < 40);
      // Local compare-v001: the second leg has a denser palm rhythm and smaller median shrubs.
      const medianPalmSpacing = section.id === 'leg-2' ? 24 : 48;
      if (section.medianWidth > 3 && !nearTurn && s % medianPalmSpacing === 0) palm(offset(p, 0), s, 7.5);
      if (section.medianWidth > 3 && !nearTurn && s % medianPalmSpacing !== 0) add('box', hedge, offset(p, 0, 0.42), new Vector3(section.medianWidth * 0.65, 0.6, 4), p.yaw);
      const woodedEdge = section.character === 'canopy' || section.character === 'walls';
      const edgeDensity = Math.max(woodedEdge ? 0.8 : 0.3, section.landscapingDensity);
      const roadsidePalmShare = woodedEdge ? 0.2 : 0.55;
      for (const side of [-1, 1]) {
        const location = offset(p, side * (h + 9 + random(s + side) * 6));
        if (random(s + side * 2) < edgeDensity) {
          if (random(s + side * 3) < roadsidePalmShare) palm(location, s + side, 7);
          else {
            add('trunk', trunk, new Vector3(location.x, 2.4, location.z), new Vector3(0.65, 4.8, 0.65));
            add('crown', treeLeaves, new Vector3(location.x, 6, location.z), new Vector3(8, 6, 8), s);
            chunk.obstacles.push({ id: `tree.${s}.${side}`, x: location.x, z: location.z, radius: 0.4 });
          }
        }
        if (!section.invented && !nearTurn) {
          add('box', wall, offset(p, side * (h + 11), 1.05), new Vector3(0.35, 2.1, 24.2), p.yaw);
          add('box', hedge, offset(p, side * (h + 10), 0.72), new Vector3(1.2, 1.4, 23), p.yaw);
          if (side === -1) add('crown', medianGrass, offset(p, side * (h + 17), 0), new Vector3(15, 3.5, 28), p.yaw);
          for (let along = -10; along <= 10; along += 2.5) {
            const at = offset(p, side * (h + 11));
            chunk.obstacles.push({ id: `wall.${s}.${side}.${along}`, x: at.x + Math.sin(p.yaw) * along, z: at.z + Math.cos(p.yaw) * along, radius: 0.5 });
          }
        }
      }
    }
    const poleDistances: number[] = [];
    for (const section of ROUTE.sections) {
      if (section.invented) continue;
      const first = section.startS + Math.ceil((Math.max(chunk.from, section.startS) - section.startS) / section.poleSpacing) * section.poleSpacing;
      for (let s = first; s < Math.min(chunk.to, section.endS); s += section.poleSpacing) poleDistances.push(s);
    }
    for (const s of poleDistances) {
      const p = pointAtDistance(s);
      const section = sectionAt(p);
      if (section.invented) continue;
      const h = halfAt(p);
      const post = offset(p, h + 6.2, 6.4);
      add('trunk', pole, post, new Vector3(0.35, 12.8, 0.35));
      add('box', pole, new Vector3(post.x, 11.4, post.z), new Vector3(3, 0.15, 0.18), p.yaw);
      chunk.obstacles.push({ id: `pole.${s}`, x: post.x, z: post.z, radius: 0.5 });
      const next = pointAtDistance(Math.min(s + section.poleSpacing, section.endS - 0.1));
      const nextSection = sectionAt(next);
      const end = offset(next, roadHalfWidth(nextSection) + 6.2, 11.7);
      for (const shift of [-1, 1]) {
        const startWire = new Vector3(post.x + Math.cos(p.yaw) * shift, 11.7, post.z - Math.sin(p.yaw) * shift);
        const endWire = new Vector3(end.x + Math.cos(next.yaw) * shift, 11.7, end.z - Math.sin(next.yaw) * shift);
        const midpoint = Vector3.Lerp(startWire, endWire, 0.5); midpoint.y -= 0.7;
        const wire = MeshBuilder.CreateLines(`${root.name}.wire.${s}.${shift}`, { points: [startWire, midpoint, endWire] }, scene);
        wire.color = new Color3(0.22, 0.29, 0.28); wire.parent = root; wire.isPickable = false;
      }
    }
    for (const checkpoint of junctions) {
      if (checkpoint.s < chunk.from || checkpoint.s >= chunk.to || checkpoint.s < 80) continue;
      const p = pointAtDistance(checkpoint.s);
      const h = halfAt(p);
      // Icon-only signals; no names, addresses or business branding.
      for (const side of [-1, 1]) {
        add('trunk', metal, offset(p, side * (h + 1.1), 3.5), new Vector3(0.22, 7, 0.22));
        add('box', metal, offset(p, side * h / 2, 7), new Vector3(h + 2, 0.2, 0.2), p.yaw);
        for (let lane = 0; lane < sectionAt(p).lanes; lane++) {
          const d = side * (sectionAt(p).medianWidth / 2 + (lane + 0.5) * sectionAt(p).laneWidth);
          add('box', metal, offset(p, d, 6.6), new Vector3(0.45, 1, 0.35), p.yaw);
          add('crown', signalGreen, offset(p, d, 6.3), new Vector3(0.3, 0.3, 0.42), p.yaw);
        }
      }
      const cross = pointAtDistance(Math.max(0, checkpoint.s - 8));
      for (let d = -h + 0.8; d < h; d += 1.5) add('box', white, offset(cross, d, 0.035), new Vector3(0.65, 0.02, 4), p.yaw);
      // A low storefront cluster distinguishes the signalized junctions. Detailed trim has a distance LOD.
      const storeAt = offset(p, -h - 32, 3.7);
      const block = box(`${root.name}.shop`, storeAt, new Vector3(31, 7.4, 14), storefront, root, p.yaw);
      blockFootprint(chunk.obstacles, `shop.${checkpoint.s}`, storeAt.x, storeAt.z, 31, 14, p.yaw);
      block.addLODLevel(300, null);
      const frontAt = offset(p, -h - 24.9, 2.6);
      const front = box(`${root.name}.shop.glass`, frontAt, new Vector3(29, 3.9, 0.15), glass, root, p.yaw);
      front.addLODLevel(155, null);
      const awning = box(`${root.name}.shop.awning`, offset(p, -h - 23.9, 5), new Vector3(31, 0.6, 2.6), terracotta, root, p.yaw);
      awning.addLODLevel(220, null);
    }
    for (const batch of batches.values()) {
      batch.mesh.thinInstanceSetBuffer('matrix', new Float32Array(batch.matrices), 16, true);
      batch.mesh.thinInstanceRefreshBoundingInfo();
      batch.mesh.freezeWorldMatrix();
    }
  }

  const homeRoot = new TransformNode('drive.home.neighborhood', scene);
  const culdesac = MeshBuilder.CreateCylinder('drive.home.culdesac', { diameter: 36, height: 0.06, tessellation: 64 }, scene);
  culdesac.position.set(9, 0, 1.7); culdesac.material = asphalt; culdesac.parent = homeRoot;
  box('drive.home.driveway', new Vector3(0, 0.02, 9), new Vector3(8, 0.1, 14), concrete, homeRoot);
  box('drive.home.garage', new Vector3(12, 1.7, 19), new Vector3(7, 3.4, 8), storefront, homeRoot);
  box('drive.home.garage-door', new Vector3(12, 1.5, 14.95), new Vector3(5.5, 2.7, 0.12), teal, homeRoot);
  box('drive.home.garage-roof', new Vector3(12, 3.55, 19), new Vector3(7.5, 0.32, 8.5), terracotta, homeRoot);
  const house = buildHouse(scene, options.houseLayout ?? FICTIONAL_HOUSE);
  house.root.parent = homeRoot;
  for (const [index, boundary] of (options.houseLayout ?? FICTIONAL_HOUSE).walls.entries()) {
    const count = Math.max(1, Math.ceil(Math.max(boundary.width, boundary.depth) / 1.6));
    for (let i = 0; i <= count; i++) homeObstacles.push({
      id: `house-wall.${index}.${i}`,
      x: house.root.position.x + boundary.x + (boundary.width >= boundary.depth ? (i / count - 0.5) * boundary.width : 0),
      z: house.root.position.z + boundary.z + (boundary.depth > boundary.width ? (i / count - 0.5) * boundary.depth : 0),
      radius: 0.22,
    });
  }
  blockFootprint(homeObstacles, 'garage', 12, 19, 7, 8);
  // Fictional neighboring roof silhouettes keep the cul-de-sac legible without copying real property.
  for (const [x, z] of [[18, -21], [36, 28], [-18, -22]]) {
    box(`drive.home.neighbor.${x}`, new Vector3(x, 2, z), new Vector3(11, 4, 9), storefront, homeRoot);
    blockFootprint(homeObstacles, `neighbor.${x}`, x, z, 11, 9);
    const roof = MeshBuilder.CreateCylinder(`drive.home.roof.${x}`, { diameter: 15, height: 3.5, tessellation: 4 }, scene);
    roof.scaling.z = 0.75; roof.rotation.y = Math.PI / 4; roof.position.set(x, 5, z); roof.material = terracotta; roof.parent = homeRoot;
  }

  const car = new TransformNode('drive.car.provisional', scene);
  box('drive.car.body', new Vector3(0, 0.65, 0), new Vector3(1.85, 0.67, 4.1), teal, car);
  box('drive.car.hood', new Vector3(0, 1, 1.15), new Vector3(1.78, 0.2, 1.5), teal, car);
  box('drive.car.cabin', new Vector3(0, 1.27, -0.35), new Vector3(1.55, 0.8, 1.95), glass, car);
  box('drive.car.roof', new Vector3(0, 1.71, -0.35), new Vector3(1.6, 0.12, 1.95), teal, car);
  box('drive.car.bump-front', new Vector3(0, 0.52, 2.08), new Vector3(1.8, 0.2, 0.2), dark, car);
  box('drive.car.bump-back', new Vector3(0, 0.52, -2.08), new Vector3(1.8, 0.2, 0.2), dark, car);
  const wheels: Mesh[] = [];
  for (const side of [-1, 1]) {
    box(`drive.car.headlight.${side}`, new Vector3(side * 0.64, 0.91, 2.07), new Vector3(0.42, 0.2, 0.08), white, car);
    box(`drive.car.taillight.${side}`, new Vector3(side * 0.64, 0.9, -2.07), new Vector3(0.4, 0.18, 0.09), rearLight, car);
    for (const z of [-1.3, 1.25]) {
      const wheel = MeshBuilder.CreateCylinder(`drive.car.wheel.${side}.${z}`, { diameter: 0.74, height: 0.26, tessellation: 12 }, scene);
      wheel.rotation.z = Math.PI / 2; wheel.position.set(side * 0.96, 0.39, z); wheel.material = dark; wheel.parent = car; wheels.push(wheel);
      const hub = MeshBuilder.CreateCylinder(`drive.car.hub.${side}.${z}`, { diameter: 0.38, height: 0.28, tessellation: 8 }, scene);
      hub.rotation.z = Math.PI / 2; hub.position.copyFrom(wheel.position); hub.material = concrete; hub.parent = car;
    }
  }
  const shadowMaterial = material('contact-shadow', '#263d34');
  shadowMaterial.alpha = 0.2;
  const shadow = MeshBuilder.CreateDisc('drive.car.contact-shadow', { radius: 1, tessellation: 20 }, scene);
  shadow.rotation.x = Math.PI / 2; shadow.scaling.set(1.35, 2.7, 1); shadow.position.y = 0.018; shadow.material = shadowMaterial;

  const cloudRoot = new TransformNode('drive.clouds', scene);
  const cloudMaterial = material('cloud', '#eff2e9');
  cloudMaterial.disableLighting = true; cloudMaterial.emissiveColor = new Color3(0.89, 0.92, 0.9);
  for (let i = 0; i < 12; i++) {
    const angle = i * TAU / 12;
    const cloud = MeshBuilder.CreateSphere(`drive.cloud.${i}`, { diameter: 1, segments: 6 }, scene);
    cloud.position.set(Math.cos(angle) * (200 + random(i) * 90), 110 + random(i + 20) * 35, Math.sin(angle) * (200 + random(i) * 90));
    cloud.scaling.set(65 + random(i + 40) * 55, 8 + random(i + 70) * 14, 25 + random(i + 50) * 30);
    cloud.material = cloudMaterial; cloud.parent = cloudRoot; cloud.isPickable = false;
  }

  let lastStreamX = Number.POSITIVE_INFINITY;
  let lastStreamZ = Number.POSITIVE_INFINITY;
  let wheelSpin = 0;
  let disposed = false;
  function stream(x: number, z: number) {
    if (Math.hypot(x - lastStreamX, z - lastStreamZ) < 22) return;
    lastStreamX = x; lastStreamZ = z;
    let changed = false;
    for (const chunk of chunks) {
      const distance = Math.hypot(chunk.x - x, chunk.z - z);
      if (!chunk.root && distance < LOAD_DISTANCE) { buildChunk(chunk); changed = true; }
      else if (chunk.root && distance > UNLOAD_DISTANCE) { chunk.root.dispose(); chunk.root = undefined; chunk.obstacles.length = 0; changed = true; }
    }
    if (changed) { obstacles.length = 0; if (Math.hypot(x, z) < 300) obstacles.push(...homeObstacles); for (const chunk of chunks) if (chunk.root) obstacles.push(...chunk.obstacles); }
    homeRoot.setEnabled(Math.hypot(x, z) < 300);
  }
  return {
    engine, scene, car, cameraRig, obstacles,
    update(state: DriveState, delta: number) {
      if (disposed) return;
      stream(state.x, state.z);
      car.position.set(state.x, state.bonkSeconds > 0 ? Math.sin(state.elapsedSeconds * 34) * 0.025 : 0, state.z);
      car.rotation.y = state.yaw;
      car.setEnabled(cameraRig.mode !== 'dashboard');
      wheelSpin = (wheelSpin + state.speed * delta / 0.37) % TAU;
      for (const wheel of wheels) wheel.rotationQuaternion = Quaternion.RotationAxis(Vector3.Right(), wheelSpin).multiply(Quaternion.RotationAxis(Vector3.Forward(), Math.PI / 2));
      shadow.position.x = state.x; shadow.position.z = state.z; shadow.rotation.z = -state.yaw;
      ground.position.x = state.x; ground.position.z = state.z;
      cloudRoot.position.x = state.x; cloudRoot.position.z = state.z;
      cameraRig.update(state, delta);
    },
    render() { if (!disposed) scene.render(); },
    resize() { engine.resize(); },
    metrics() { return { loadedChunks: chunks.filter(c => c.root).length, totalChunks: chunks.length, meshes: scene.meshes.length, fps: engine.getFps(), camera: cameraRig.mode,
      cameraPosition: cameraRig.camera.position.asArray(), cameraDirection: cameraRig.camera.getDirection(Vector3.Forward()).asArray(), activeMeshes: scene.getActiveMeshes().length }; },
    dispose() { if (disposed) return; disposed = true; cameraRig.dispose(); house.dispose(); scene.dispose(); engine.dispose(); },
  };
}
