import { Color3, Color4, Vector3 } from '@babylonjs/core/Maths/math';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import type { Scene } from '@babylonjs/core/scene';
import '@babylonjs/core/Meshes/instancedMesh';

export type TrafficVehicleKind = 'sedan' | 'suv' | 'van';
export interface TrafficVisualVehicle {
  id: string; x: number; z: number; yaw: number; kind: TrafficVehicleKind;
  colorIndex: number; braking: boolean; direction?: 1 | -1; speed?: number;
}
type Part = 'paint' | 'trim' | 'rubber' | 'alloy' | 'glass' | 'headlamp' | 'tail' | 'brake';
interface VisualCar { kind: TrafficVehicleKind; parts: Map<Part, InstancedMesh>; pose: TrafficVisualVehicle; distance: number }
const PAINTS = ['#e6e8e5', '#27323c', '#a5a9ad', '#792629', '#284756', '#b4aa91', '#d8dce2', '#38483a'];
const DETAIL_DISTANCE = 75;
const CULL_DISTANCE = 310;
const MAX_VISIBLE = 28;

/** Original unbranded exterior geometry. Simulation owns all poses, speeds and stopping rules. */
export function createTrafficVisuals(scene: Scene) {
  const materials = new Map<Part, PBRMaterial>();
  function material(part: Part, color: string, metallic: number, roughness: number) {
    const value = new PBRMaterial(`drive.traffic.${part}`, scene);
    value.albedoColor = Color3.FromHexString(color).toLinearSpace();
    value.metallic = metallic; value.roughness = roughness;
    value.environmentIntensity = 1; value.backFaceCulling = false;
    value.twoSidedLighting = true; value.enableSpecularAntiAliasing = true;
    materials.set(part, value); return value;
  }
  const paint = material('paint', '#ffffff', .68, .26);
  paint.clearCoat.isEnabled = true; paint.clearCoat.intensity = 1; paint.clearCoat.roughness = .14;
  material('trim', '#151b20', .12, .47);
  material('rubber', '#141619', .02, .84);
  material('alloy', '#b8c0c5', .92, .23);
  // Opaque reflective glazing avoids transparent sorting and needless modeled interiors on traffic.
  const glass = material('glass', '#172a36', .34, .08);
  glass.clearCoat.isEnabled = true; glass.clearCoat.roughness = .035;
  const headlamp = material('headlamp', '#dce9ed', .42, .17);
  headlamp.emissiveColor.set(.13, .17, .19);
  const tail = material('tail', '#9d1019', .21, .21);
  tail.emissiveColor.set(.10, .001, .002);
  const brake = material('brake', '#fa1822', .05, .23);
  brake.emissiveColor.set(1.8, .015, .025);
  const paints = PAINTS.map(hex => { const c = Color3.FromHexString(hex).toLinearSpace(); return new Color4(c.r, c.g, c.b, 1); });
  const templates = new Map<TrafficVehicleKind, Map<Part, Mesh>>();
  const sources: Mesh[] = [];
  const sourceTriangles: Record<string, { near: number; far: number }> = {};
  let serial = 0;

  function makeCar(kind: TrafficVehicleKind, far: boolean) {
    const groups = new Map<Part, Mesh[]>();
    const suv = kind === 'suv'; const van = kind === 'van';
    const length = van ? 4.95 : suv ? 4.65 : 4.7;
    const width = van ? 1.95 : suv ? 1.93 : 1.85;
    const half = length / 2; const w = width / 2;
    const wheelR = suv || van ? .395 : .36;
    const wheelZ = van ? 1.49 : suv ? 1.38 : 1.40;
    const belt = van ? 1.20 : suv ? 1.12 : 1.02;
    const roofY = van ? 1.98 : suv ? 1.78 : 1.48;
    const frontTop = van ? .78 : .35;
    const frontBase = van ? 1.48 : 1.02;
    const rearTop = van ? -1.92 : suv ? -1.52 : -1.06;
    const rearBase = van ? -2.31 : suv ? -2.09 : -1.90;
    const cabinW = w * (van ? .91 : suv ? .81 : .76);
    const nearName = `${kind}.${far ? 'far' : 'near'}`;
    function add(mesh: Mesh, part: Part) {
      mesh.material = materials.get(part)!; mesh.isPickable = false;
      const list = groups.get(part) ?? []; list.push(mesh); groups.set(part, list); return mesh;
    }
    function surface(name: string, nu: number, nv: number, point: (u: number, v: number) => Vector3, part: Part) {
      const positions: number[] = []; const indices: number[] = []; const normals: number[] = []; const uvs: number[] = [];
      for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
        const p = point(i / nu, j / nv); positions.push(p.x, p.y, p.z); uvs.push(i / nu, j / nv);
      }
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i; const b = a + nu + 1; indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
      VertexData.ComputeNormals(positions, indices, normals);
      const data = new VertexData(); data.positions = positions; data.indices = indices; data.normals = normals; data.uvs = uvs;
      const mesh = new Mesh(`drive.traffic.build.${name}`, scene); data.applyToMesh(mesh); return add(mesh, part);
    }
    function tube(name: string, points: Vector3[], radius: number, part: Part) {
      return add(MeshBuilder.CreateTube(name, { path: points, radius, tessellation: far ? 4 : 6, cap: Mesh.CAP_ALL }, scene), part);
    }
    function box(name: string, x: number, y: number, z: number, dx: number, dy: number, dz: number, part: Part) {
      if (!far && (part === 'headlamp' || part === 'tail')) {
        // Small radius lens corners catch the sky instead of reading as flat rectangular stickers.
        const positions: number[] = []; const normals: number[] = []; const indices: number[] = []; const uvs: number[] = [];
        const halfSize = [dx / 2, dy / 2, dz / 2]; const radius = Math.min(.035, ...halfSize);
        for (const [axis, ua, va, sign] of [[0, 1, 2, 1], [0, 2, 1, -1], [1, 2, 0, 1], [1, 0, 2, -1], [2, 0, 1, 1], [2, 1, 0, -1]]) {
          const start = positions.length / 3; const steps = 4;
          for (let j = 0; j <= steps; j++) for (let i = 0; i <= steps; i++) {
            const p = [0, 0, 0]; p[axis] = sign * halfSize[axis]; p[ua] = (i / steps * 2 - 1) * halfSize[ua]; p[va] = (j / steps * 2 - 1) * halfSize[va];
            const inner = p.map((value, k) => Math.max(-halfSize[k] + radius, Math.min(halfSize[k] - radius, value)));
            const normal = new Vector3(p[0] - inner[0], p[1] - inner[1], p[2] - inner[2]).normalize();
            positions.push(inner[0] + normal.x * radius, inner[1] + normal.y * radius, inner[2] + normal.z * radius);
            normals.push(normal.x, normal.y, normal.z); uvs.push(i / steps, j / steps);
          }
          for (let j = 0; j < steps; j++) for (let i = 0; i < steps; i++) { const a = start + j * (steps + 1) + i; const b = a + steps + 1; indices.push(a, b, a + 1, a + 1, b, b + 1); }
        }
        const data = new VertexData(); data.positions = positions; data.normals = normals; data.indices = indices; data.uvs = uvs;
        const mesh = new Mesh(name, scene); data.applyToMesh(mesh); mesh.position.set(x, y, z); return add(mesh, part);
      }
      const mesh = MeshBuilder.CreateBox(name, { width: dx, height: dy, depth: dz }, scene);
      mesh.position.set(x, y, z); return add(mesh, part);
    }
    const mix = (a: number, b: number, t: number) => a + (b - a) * t;
    function bodyWidth(z: number) { return w * (1 - .095 * Math.pow(Math.abs(z / half), 4)); }
    function deck(z: number) { return belt - .11 * Math.pow(Math.abs(z / half), 2); }
    function arch(z: number) {
      const d = Math.min(Math.abs(z - wheelZ), Math.abs(z + wheelZ)); const r = wheelR + .045;
      return d < r ? wheelR + Math.sqrt(r * r - d * d) : .30;
    }
    surface('hood-trunk', far ? 4 : 12, far ? 16 : 44, (u, v) => {
      const z = mix(-half, half, v); const lateral = u * 2 - 1;
      return new Vector3(lateral * bodyWidth(z), deck(z) - .09 * Math.abs(lateral) ** 3, z);
    }, 'paint');
    for (const side of [-1, 1]) {
      surface('flanks', far ? 32 : 72, far ? 3 : 7, (u, v) => {
        const z = mix(-half, half, u); const y = mix(arch(z), deck(z) - .09, v);
        return new Vector3(side * bodyWidth(z) * (.976 + Math.sin(v * Math.PI) * .024), y, z);
      }, 'paint');
      tube('sill', [new Vector3(side * w * .98, .31, -wheelZ + .45), new Vector3(side * w * .98, .31, wheelZ - .45)], suv || van ? .045 : .025, 'trim');
      for (const z of [-wheelZ, wheelZ]) {
        const archSteps = far ? 8 : 18;
        const points = Array.from({ length: archSteps + 1 }, (_, i) => {
          const angle = Math.PI * i / archSteps; const pz = z + Math.cos(angle) * (wheelR + .045);
          return new Vector3(side * (bodyWidth(pz) + .004), wheelR + Math.sin(angle) * (wheelR + .045), pz);
        });
        tube('arch-lip', points, suv ? .025 : .013, suv ? 'trim' : 'paint');
      }
      const lowFront = new Vector3(side * w * .93, belt, frontBase);
      const lowRear = new Vector3(side * w * .93, belt, rearBase);
      const highFront = new Vector3(side * cabinW, roofY - .02, frontTop);
      const highRear = new Vector3(side * cabinW * .985, roofY - .03, rearTop);
      surface('side-glass', far ? 2 : 10, far ? 1 : 4, (u, v) => {
        const p = Vector3.Lerp(Vector3.Lerp(lowRear, lowFront, u), Vector3.Lerp(highRear, highFront, u), v);
        p.x += side * Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * .016; return p;
      }, 'glass');
      tube('A-pillar', [lowFront, highFront], van ? .055 : .036, 'paint');
      tube('C-pillar', [lowRear, highRear], van ? .085 : .055, 'paint');
      tube('B-pillar', [Vector3.Lerp(lowRear, lowFront, .56), Vector3.Lerp(highRear, highFront, .56)], .035, 'trim');
      tube('window-belt', [lowRear, lowFront], .018, 'alloy');
      tube('roof-side', [highRear, highFront], .032, 'paint');
      if (!far) {
        const seamZ = van ? .22 : -.2;
        tube('door-gap', [new Vector3(side * (bodyWidth(seamZ) + .005), .34, seamZ), new Vector3(side * (bodyWidth(seamZ) + .006), belt - .02, seamZ)], .005, 'trim');
        for (const z of [seamZ + .25, -wheelZ + .42]) box('handle', side * (bodyWidth(z) + .015), belt - .12, z, .025, .024, .16, 'alloy');
        tube('belt-crease', [new Vector3(side * w * .98, belt - .20, -half + .32), new Vector3(side * w * 1.003, belt - .15, .1), new Vector3(side * w * .98, belt - .20, half - .3)], .007, 'paint');
        const mirror = MeshBuilder.CreateSphere('mirror', { diameter: 1, segments: 8 }, scene);
        mirror.scaling.set(.21, .13, .24); mirror.position.set(side * (w + .10), belt + .1, frontBase - .24); add(mirror, 'paint');
        box('mirror-face', side * (w + .1), belt + .1, frontBase - .35, .16, .085, .015, 'glass');
      }
      if (suv || van) tube('roof-rail', [new Vector3(side * cabinW * .85, roofY + .065, rearTop + .14), new Vector3(side * cabinW * .85, roofY + .065, frontTop - .10)], .017, 'alloy');
    }
    surface('roof', far ? 4 : 10, far ? 4 : 12, (u, v) => new Vector3((u * 2 - 1) * cabinW * mix(.985, 1, v), roofY + .035 * Math.sin(u * Math.PI) + .018 * Math.sin(v * Math.PI), mix(rearTop, frontTop, v)), 'paint');
    for (const front of [false, true]) {
      const baseZ = front ? frontBase : rearBase; const topZ = front ? frontTop : rearTop;
      surface('windscreen', far ? 4 : 12, far ? 2 : 6, (u, v) => new Vector3((u * 2 - 1) * mix(w * .93, cabinW, v), mix(belt, roofY - .02, v) + Math.sin(u * Math.PI) * .012, mix(baseZ, topZ, v) + Math.sin(u * Math.PI) * .018), 'glass');
    }
    for (const front of [-1, 1]) {
      surface('bumper', far ? 8 : 18, far ? 2 : 5, (u, v) => {
        const lateral = u * 2 - 1;
        return new Vector3(lateral * w * (.87 + Math.sin(v * Math.PI) * .04), mix(.32, belt - .1, v), front * (half + .035 * Math.sin(v * Math.PI) - .16 * Math.abs(lateral) ** 3));
      }, 'paint');
      box('valance', 0, .36, front * (half + .018), width * .75, .09, .03, 'trim');
      box('blank-number-panel', 0, .57, front * (half + .025), .38, .11, .018, front === 1 ? 'trim' : 'alloy');
    }
    box('grille', 0, belt - .30, half + .03, width * .42, .18, .023, 'trim');
    if (!far) for (let j = 0; j < 3; j++) box('grille-bar', 0, belt - .35 + j * .05, half + .046, width * .38, .009, .012, 'alloy');
    for (const side of [-1, 1]) {
      const lx = side * w * .67; const lampY = belt - .16;
      const head = box('headlight', lx, lampY, half - .016, width * .23, .105, .045, 'headlamp'); head.rotation.y = -side * .14;
      box('headlight-brow', lx, lampY + .067, half - .02, width * .24, .018, .045, 'trim');
      box('tail-lens', lx, lampY, -half + .005, width * .24, van || suv ? .22 : .13, .045, 'tail');
      box('brake-led', lx, lampY + .01, -half - .021, width * .21, .035, .008, 'brake');
    }
    box('centre-stop', 0, roofY - .075, rearTop - .035, .38, .025, .018, 'brake');
    for (const side of [-1, 1]) for (const z of [-wheelZ, wheelZ]) {
      const x = side * w * .94; const steps = far ? 12 : 28;
      surface('tyre', steps, far ? 4 : 8, (u, v) => {
        const axial = (v * 2 - 1) * .115; const radius = wheelR - .04 * Math.abs(v * 2 - 1) ** 4;
        const a = u * Math.PI * 2; return new Vector3(x + axial, wheelR + Math.cos(a) * radius, z + Math.sin(a) * radius);
      }, 'rubber');
      const alloy = MeshBuilder.CreateCylinder('alloy', { diameter: wheelR * 1.35, height: .026, tessellation: far ? 12 : 24 }, scene);
      alloy.rotation.z = Math.PI / 2; alloy.position.set(x + side * .12, wheelR, z); add(alloy, 'trim');
      if (far) {
        const hub = MeshBuilder.CreateCylinder('wheel-face', { diameter: wheelR * 1.08, height: .03, tessellation: 10 }, scene);
        hub.rotation.z = Math.PI / 2; hub.position.set(x + side * .137, wheelR, z); add(hub, 'alloy');
      } else {
        const rim = MeshBuilder.CreateTorus('rim', { diameter: wheelR * 1.35, thickness: .022, tessellation: 28 }, scene);
        rim.rotation.z = Math.PI / 2; rim.position.set(x + side * .143, wheelR, z); add(rim, 'alloy');
        for (let k = 0; k < 5; k++) {
          const a = Math.PI * 2 * k / 5;
          tube('spoke', [new Vector3(x + side * .145, wheelR + Math.cos(a) * .04, z + Math.sin(a) * .04), new Vector3(x + side * .145, wheelR + Math.cos(a + .1) * wheelR * .64, z + Math.sin(a + .1) * wheelR * .64)], .020, 'alloy');
        }
      }
    }
    const result = new Map<Part, Mesh>();
    for (const [part, meshes] of groups) {
      const merged = Mesh.MergeMeshes(meshes, true, true)!;
      merged.name = `drive.traffic.template.${nearName}.${part}`;
      merged.material = materials.get(part)!; merged.isPickable = false; merged.receiveShadows = true;
      merged.isVisible = false;
      if (part === 'paint') { merged.registerInstancedBuffer('color', 4); merged.instancedBuffers.color = new Color4(1, 1, 1, 1); }
      result.set(part, merged); sources.push(merged);
    }
    return result;
  }
  for (const kind of ['sedan', 'suv', 'van'] as const) {
    const near = makeCar(kind, false); const far = makeCar(kind, true);
    for (const [part, mesh] of near) { mesh.addLODLevel(DETAIL_DISTANCE, far.get(part)!); mesh.addLODLevel(CULL_DISTANCE, null); }
    templates.set(kind, near);
    sourceTriangles[kind] = { near: [...near.values()].reduce((sum, mesh) => sum + mesh.getTotalIndices() / 3, 0), far: [...far.values()].reduce((sum, mesh) => sum + mesh.getTotalIndices() / 3, 0) };
  }
  const cars = new Map<string, VisualCar>();
  let shadows: InstancedMesh[] = [];
  let disposed = false;
  function remove(id: string) { const car = cars.get(id); if (!car) return; car.parts.forEach(mesh => mesh.dispose()); cars.delete(id); }
  function update(vehicles: readonly TrafficVisualVehicle[], camera: { x: number; z: number }) {
    if (disposed) return;
    const visible = vehicles.map(pose => ({ pose, distance: Math.hypot(pose.x - camera.x, pose.z - camera.z) }))
      .filter(item => item.distance < CULL_DISTANCE).sort((a, b) => a.distance - b.distance).slice(0, MAX_VISIBLE);
    const ids = new Set(visible.map(item => item.pose.id));
    for (const id of cars.keys()) if (!ids.has(id)) remove(id);
    shadows = [];
    for (const { pose, distance } of visible) {
      let car = cars.get(pose.id);
      if (car && car.kind !== pose.kind) { remove(pose.id); car = undefined; }
      if (!car) {
        const parts = new Map<Part, InstancedMesh>();
        for (const [part, source] of templates.get(pose.kind)!) {
          const instance = source.createInstance(`drive.traffic.${pose.id}.${part}.${serial++}`);
          instance.isVisible = true; instance.isPickable = false; instance.receiveShadows = true;
          parts.set(part, instance);
        }
        car = { kind: pose.kind, parts, pose, distance }; cars.set(pose.id, car);
      }
      car.pose = { ...pose }; car.distance = distance;
      for (const [part, mesh] of car.parts) {
        mesh.position.set(pose.x, .025, pose.z); mesh.rotation.y = pose.yaw;
        mesh.metadata = { trafficId: pose.id, direction: pose.direction, kind: pose.kind };
        mesh.isVisible = part !== 'brake' || pose.braking;
        if (part === 'paint') mesh.instancedBuffers.color = paints[((pose.colorIndex % paints.length) + paints.length) % paints.length];
        if (distance < 85 && (part === 'paint' || part === 'rubber')) shadows.push(mesh);
      }
    }
  }
  return {
    update, ready: Promise.resolve(),
    get shadowMeshes() { return shadows; },
    metrics() { return {
      activeVehicles: cars.size, renderedVehicles: cars.size, nearVehicles: [...cars.values()].filter(car => car.distance < DETAIL_DISTANCE).length,
      farVehicles: [...cars.values()].filter(car => car.distance >= DETAIL_DISTANCE).length,
      instances: [...cars.values()].reduce((sum, car) => sum + car.parts.size, 0), materials: materials.size,
      sourceTriangles, shadowInstances: shadows.length,
      vehicles: [...cars.values()].map(({ pose, distance }) => ({ ...pose, lod: distance < DETAIL_DISTANCE ? 'near' : 'far' })),
    }; },
    dispose() { if (disposed) return; disposed = true; for (const id of cars.keys()) remove(id); sources.forEach(mesh => mesh.dispose()); materials.forEach(value => value.dispose()); shadows = []; },
  };
}
