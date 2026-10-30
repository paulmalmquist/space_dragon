import { Color3, Quaternion, Vector3 } from '@babylonjs/core/Maths/math';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import type { Scene } from '@babylonjs/core/scene';
import '@babylonjs/core/Meshes/instancedMesh';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import '@babylonjs/core/Shaders/pbr.vertex';
import '@babylonjs/core/Shaders/pbr.fragment';

/** Original unbranded family car, modelled in metres. +Z is forward. No sampled media. */
export function createDriveCar(scene: Scene) {
  const root = new TransformNode('drive.car.detailed', scene);
  const materials: PBRMaterial[] = [];
  const allMeshes: Mesh[] = [];
  function material(name: string, color: string, metallic: number, roughness: number) {
    const m = new PBRMaterial(`drive.car.${name}`, scene);
    m.albedoColor = Color3.FromHexString(color).toLinearSpace();
    m.metallic = metallic; m.roughness = roughness;
    m.environmentIntensity = 1.05;
    m.backFaceCulling = false; m.twoSidedLighting = true;
    materials.push(m);
    return m;
  }
  const paint = material('metallic-petrol-paint', '#387486', 0.78, 0.22);
  paint.clearCoat.isEnabled = true; paint.clearCoat.intensity = 1; paint.clearCoat.roughness = 0.10;
  const paintDark = material('paint-recesses', '#172b32', 0.65, 0.28);
  const chrome = material('satin-aluminium', '#b7bec0', 0.95, 0.21);
  const polished = material('polished-alloy', '#dce3e5', 1, 0.11);
  const black = material('black-trim', '#131719', 0.08, 0.39);
  const rubber = material('rubber-sidewall', '#171a1c', 0.03, 0.76);
  const treadRubber = material('rubber-tread', '#101315', 0.01, 0.94);
  const seam = material('panel-gaps', '#081216', 0.05, 0.72);
  const leather = material('charcoal-leather', '#24282a', 0.0, 0.69);
  const textile = material('seat-inserts', '#333a3b', 0.0, 0.95);
  leather.environmentIntensity = .18; textile.environmentIntensity = .15;
  const brakeMetal = material('brake-discs', '#62696a', 0.88, 0.42);
  const glass = material('smoked-glazing', '#19313a', 0.0, 0.055);
  glass.alpha = 0.91;
  glass.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
  glass.indexOfRefraction = 1.47;
  glass.environmentIntensity = 0.8;
  glass.clearCoat.isEnabled = true; glass.clearCoat.roughness = 0.035;
  const mirror = material('mirror-glass', '#c9d6dc', 1, 0.035);
  const lamp = material('headlight-reflector', '#e4f0f4', 0.65, 0.12);
  lamp.emissiveColor.set(0.14, 0.17, 0.19);
  const led = material('daytime-led', '#ecf8fc', 0.15, 0.18);
  led.emissiveColor.set(0.65, 0.78, 0.88);
  const tail = material('tail-lens', '#9f1720', 0.35, 0.16);
  tail.emissiveColor.set(0.16, 0.004, 0.008);
  const tailLed = material('tail-led', '#ed3132', 0.18, 0.16);
  tailLed.emissiveColor.set(0.52, 0.012, 0.014);
  const display = material('instrument-display', '#0a181e', 0.05, 0.22);
  display.emissiveColor.set(0.02, 0.12, 0.16);

  function attach(mesh: Mesh, mat: PBRMaterial, parent: TransformNode = root) {
    mesh.material = mat; mesh.parent = parent; mesh.isPickable = false;
    mesh.receiveShadows = true; allMeshes.push(mesh);
    return mesh;
  }
  function surface(name: string, nu: number, nv: number, point: (u: number, v: number) => Vector3, mat: PBRMaterial, parent: TransformNode = root) {
    const positions: number[] = []; const uvs: number[] = []; const indices: number[] = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const p = point(i / nu, j / nv); positions.push(p.x, p.y, p.z); uvs.push(i / nu, j / nv);
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i; const b = a + nu + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const data = new VertexData(); data.positions = positions; data.indices = indices; data.uvs = uvs;
    const normals: number[] = []; VertexData.ComputeNormals(positions, indices, normals); data.normals = normals;
    const mesh = new Mesh(`drive.car.${name}`, scene); data.applyToMesh(mesh);
    return attach(mesh, mat, parent);
  }
  function line(name: string, points: Vector3[], radius: number, mat: PBRMaterial, parent: TransformNode = root) {
    return attach(MeshBuilder.CreateTube(`drive.car.${name}`, { path: points, radius, tessellation: 6, cap: Mesh.CAP_ALL }, scene), mat, parent);
  }
  function roundedBox(name: string, x: number, y: number, z: number, w: number, h: number, d: number, r: number, mat: PBRMaterial, parent: TransformNode = root) {
    const positions: number[] = []; const normals: number[] = []; const indices: number[] = []; const uvs: number[] = [];
    const half = [w / 2, h / 2, d / 2]; const radius = Math.min(r, ...half);
    const faceAxes = [[0, 1, 2, 1], [0, 2, 1, -1], [1, 2, 0, 1], [1, 0, 2, -1], [2, 0, 1, 1], [2, 1, 0, -1]];
    const steps = 6;
    for (const [axis, ua, va, sign] of faceAxes) {
      const start = positions.length / 3;
      for (let j = 0; j <= steps; j++) for (let i = 0; i <= steps; i++) {
        const p = [0, 0, 0]; p[axis] = sign * half[axis]; p[ua] = (i / steps * 2 - 1) * half[ua]; p[va] = (j / steps * 2 - 1) * half[va];
        const inner = p.map((value, k) => Math.max(-half[k] + radius, Math.min(half[k] - radius, value)));
        const n = new Vector3(p[0] - inner[0], p[1] - inner[1], p[2] - inner[2]).normalize();
        positions.push(inner[0] + n.x * radius, inner[1] + n.y * radius, inner[2] + n.z * radius);
        normals.push(n.x, n.y, n.z);
        uvs.push(i / steps, j / steps);
      }
      for (let j = 0; j < steps; j++) for (let i = 0; i < steps; i++) {
        const a = start + j * (steps + 1) + i; const b = a + steps + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const data = new VertexData(); data.positions = positions; data.normals = normals; data.indices = indices; data.uvs = uvs;
    const mesh = new Mesh(`drive.car.${name}`, scene); data.applyToMesh(mesh); mesh.position.set(x, y, z);
    return attach(mesh, mat, parent);
  }
  function cylinder(name: string, x: number, y: number, z: number, diameter: number, depth: number, mat: PBRMaterial, parent: TransformNode = root) {
    const mesh = MeshBuilder.CreateCylinder(`drive.car.${name}`, { height: depth, diameter, tessellation: 40 }, scene);
    mesh.rotation.z = Math.PI / 2; mesh.position.set(x, y, z); return attach(mesh, mat, parent);
  }
  const blend = (a: number, b: number, t: number) => a + (b - a) * t;
  const profile = [
    [-2.08, 0.83, 0.80], [-1.94, 0.86, 0.91], [-1.68, 0.91, 1.005],
    [-1.20, 0.925, 1.045], [-0.50, 0.922, 1.07], [0.35, 0.915, 1.065],
    [0.90, 0.914, 1.02], [1.45, 0.913, 0.975], [1.85, 0.855, 0.91], [2.075, 0.83, 0.80],
  ];
  function shape(z: number) {
    const index = Math.max(0, Math.min(profile.length - 2, profile.findIndex(p => p[0] > z) - 1));
    const actual = z >= profile.at(-1)![0] ? profile.length - 2 : index;
    const a = profile[actual]; const b = profile[actual + 1]; const t = Math.max(0, Math.min(1, (z - a[0]) / (b[0] - a[0])));
    const eased = t * t * (3 - 2 * t);
    return { width: blend(a[1], b[1], eased), top: blend(a[2], b[2], eased) };
  }
  function archBottom(z: number) {
    const distance = Math.min(Math.abs(z - 1.245), Math.abs(z + 1.255));
    return distance < 0.415 ? 0.365 + Math.sqrt(0.415 ** 2 - distance ** 2) : 0.295;
  }
  surface('sculpted-coachwork-top', 36, 108, (u, v) => {
    const z = blend(-2.08, 2.075, v); const s = shape(z); const lateral = u * 2 - 1;
    return new Vector3(lateral * s.width, s.top - Math.pow(Math.abs(lateral), 3.5) * 0.105, z);
  }, paint);
  for (const side of [-1, 1]) {
    surface(`wheel-arch-side.${side}`, 100, 12, (u, v) => {
      const z = blend(-2.075, 2.07, u); const s = shape(z); const low = archBottom(z);
      return new Vector3(side * s.width * (0.972 + Math.sin(v * Math.PI) * 0.028), blend(low, s.top - 0.1, v), z);
    }, paint);
    for (const wheelZ of [-1.255, 1.245]) {
      const arch: Vector3[] = []; const lip: Vector3[] = [];
      for (let i = 0; i <= 32; i++) {
        const a = i * Math.PI / 32; const z = wheelZ + Math.cos(a) * 0.417;
        arch.push(new Vector3(side * (shape(z).width + 0.002), 0.365 + Math.sin(a) * 0.417, z));
        lip.push(new Vector3(side * (shape(z).width - 0.018), 0.365 + Math.sin(a) * 0.394, z));
      }
      line(`rolled-fender.${side}.${wheelZ}`, arch, 0.018, paint);
      line(`wheel-well-liner.${side}.${wheelZ}`, lip, 0.029, black);
    }
    line(`shoulder-crease.${side}`, Array.from({ length: 40 }, (_, i) => {
      const z = blend(-1.83, 1.75, i / 39); const s = shape(z);
      return new Vector3(side * (s.width + 0.001), s.top - 0.14, z);
    }), 0.008, paintDark);
    line(`rocker-trim.${side}`, [new Vector3(side * .905, .305, -.79), new Vector3(side * .91, .29, .78)], .025, black);
    for (const seamZ of [-0.34, 0.63]) {
      const z = seamZ; const sideX = side * (shape(z).width + 0.006);
      line(`door-gap.${side}.${z}`, [new Vector3(sideX, 1.025, z), new Vector3(sideX, .89, z + .025), new Vector3(sideX, .46, z), new Vector3(sideX, .335, z - .05)], .005, seam);
    }
    line(`rear-door-gap.${side}`, [new Vector3(side * .915, 1.01, -1.46), new Vector3(side * .924, .88, -1.39), new Vector3(side * .926, .82, -.92), new Vector3(side * .915, .36, -.8)], .005, seam);
    for (const z of [-.91, .1]) {
      roundedBox(`handle-recess.${side}.${z}`, side * .924, .916, z, .018, .055, .19, .018, paintDark);
      roundedBox(`door-handle.${side}.${z}`, side * .938, .925, z, .028, .025, .155, .01, chrome);
    }
  }
  roundedBox('undertray', 0, .315, -.02, 1.47, .14, 3.76, .045, black);
  // Bumper surfaces taper around the curved side coachwork.
  for (const front of [-1, 1]) {
    surface(`bumper.${front}`, 48, 10, (u, v) => {
      const x = (u * 2 - 1) * .875; const edge = Math.abs(x / .875);
      return new Vector3(x, blend(.35, .76 - edge * .07, v), front * (2.075 - Math.pow(edge, 3.2) * .16 + Math.sin(v * Math.PI) * .015));
    }, paint);
    line(`bumper-seam.${front}`, Array.from({ length: 25 }, (_, i) => {
      const x = blend(-.81, .81, i / 24); return new Vector3(x, .74 - Math.abs(x) * .05, front * (2.09 - Math.pow(Math.abs(x / .875), 3.2) * .16));
    }), .006, seam);
    roundedBox(`lower-valance.${front}`, 0, .36, front * 2.035, 1.58, .095, .095, .035, black);
  }
  roundedBox('grille-opening', 0, .595, 2.091, .91, .25, .075, .055, black);
  for (let i = 0; i < 5; i++) roundedBox(`grille-fin.${i}`, 0, .505 + i * .043, 2.137, .81 - Math.abs(i - 2) * .035, .012, .014, .005, chrome);
  roundedBox('front-plate-recess', 0, .405, 2.101, .43, .105, .018, .008, black);
  roundedBox('rear-plate-recess', 0, .595, -2.104, .46, .15, .018, .016, black);
  roundedBox('rear-number-panel-blank', 0, .596, -2.118, .395, .1, .009, .005, chrome);
  for (const side of [-1, 1]) {
    roundedBox(`headlamp-housing.${side}`, side * .59, .80, 1.968, .46, .135, .09, .045, black);
    const lens = roundedBox(`headlamp-lens.${side}`, side * .59, .806, 2.006, .424, .105, .055, .035, lamp);
    lens.rotation.y = -side * .17;
    for (let j = 0; j < 2; j++) {
      const p = MeshBuilder.CreateSphere(`drive.car.projector.${side}.${j}`, { diameter: .075, segments: 12 }, scene);
      p.scaling.z = .5; p.position.set(side * (.50 + j * .15), .816, 2.045); attach(p, polished);
    }
    line(`led-eyebrow.${side}`, [new Vector3(side * .38, .85, 2.048), new Vector3(side * .68, .848, 2.035), new Vector3(side * .78, .816, 2.012)], .008, led);
    roundedBox(`rear-lamp-dark.${side}`, side * .62, .866, -1.987, .48, .17, .09, .05, black);
    roundedBox(`rear-lamp-lens.${side}`, side * .62, .87, -2.027, .443, .135, .045, .035, tail);
    for (const y of [.844, .89]) line(`rear-signature.${side}.${y}`, [new Vector3(side * .405, y, -2.055), new Vector3(side * .73, y, -2.043), new Vector3(side * .82, y + .02, -2.005)], .009, tailLed);
    roundedBox(`rear-reflector.${side}`, side * .67, .405, -2.055, .16, .035, .022, .012, tail);
  }

  // A real open cabin shell: roof, separate pillars, inset glazing and visible seating.
  surface('crowned-roof', 24, 30, (u, v) => {
    const z = blend(-1.22, .13, v); const x = (u * 2 - 1) * blend(.665, .69, v);
    const crown = .055 * (1 - (u * 2 - 1) ** 2);
    return new Vector3(x, 1.49 + Math.sin(v * Math.PI) * .035 + crown, z);
  }, paint);
  surface('windscreen', 24, 18, (u, v) => {
    const width = blend(.798, .666, v); const x = (u * 2 - 1) * width;
    return new Vector3(x, blend(1.035, 1.502, v) + .022 * Math.sin(u * Math.PI), blend(.72, .13, v) + .045 * Math.sin(u * Math.PI));
  }, glass);
  surface('rear-window', 24, 15, (u, v) => {
    const width = blend(.79, .645, v); const x = (u * 2 - 1) * width;
    return new Vector3(x, blend(1.04, 1.497, v) + .012 * Math.sin(u * Math.PI), blend(-1.73, -1.22, v) - .024 * Math.sin(u * Math.PI));
  }, glass);
  for (const side of [-1, 1]) {
    const sill = [new Vector3(side * .808, 1.035, .715), new Vector3(side * .842, 1.06, -.35), new Vector3(side * .804, 1.037, -1.7)];
    line(`window-belt.${side}`, sill, .024, black);
    line(`bright-window-belt.${side}`, sill.map(p => p.add(new Vector3(side * .013, -.012, 0))), .007, chrome);
    const aBottom = new Vector3(side * .809, 1.032, .73); const aTop = new Vector3(side * .683, 1.505, .13);
    const bBottom = new Vector3(side * .839, 1.055, -.35); const bTop = new Vector3(side * .69, 1.53, -.40);
    const cBottom = new Vector3(side * .805, 1.037, -1.72); const cTop = new Vector3(side * .665, 1.50, -1.22);
    line(`A-pillar.${side}`, [aBottom, aTop], .036, paint);
    line(`B-pillar.${side}`, [bBottom, bTop], .038, black);
    line(`C-pillar.${side}`, [cBottom, cTop], .053, paint);
    line(`roof-rail.${side}`, [aTop, bTop, cTop], .027, paint);
    line(`roof-drip-seam.${side}`, [aTop.add(new Vector3(side * .015, .012, 0)), bTop.add(new Vector3(side * .015, .012, 0)), cTop.add(new Vector3(side * .015, .012, 0))], .006, black);
    for (const [name, lowA, lowB, highA, highB] of [
      ['front', aBottom, bBottom, aTop, bTop], ['rear', bBottom, cBottom, bTop, cTop],
    ] as const) {
      surface(`${name}-side-glass.${side}`, 18, 12, (u, v) => {
        const lower = Vector3.Lerp(lowA, lowB, .04 + u * .92);
        const upper = Vector3.Lerp(highA, highB, .04 + u * .92);
        const p = Vector3.Lerp(lower, upper, .06 + v * .88); p.x += side * Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * .012;
        return p;
      }, glass);
    }
    const arm = line(`mirror-arm.${side}`, [new Vector3(side * .81, 1.055, .50), new Vector3(side * 1.02, 1.12, .44)], .027, black);
    arm.receiveShadows = true;
    roundedBox(`mirror-shell.${side}`, side * 1.025, 1.14, .40, .22, .15, .25, .065, paint);
    roundedBox(`mirror-face.${side}`, side * 1.025, 1.143, .285, .18, .105, .018, .038, mirror);
    roundedBox(`mirror-indicator.${side}`, side * 1.035, 1.11, .523, .17, .018, .009, .007, led);
  }
  line('windshield-upper-seal', [new Vector3(-.665, 1.5, .145), new Vector3(0, 1.53, .16), new Vector3(.665, 1.5, .145)], .012, black);
  line('windshield-lower-seal', [new Vector3(-.8, 1.039, .735), new Vector3(0, 1.06, .77), new Vector3(.8, 1.039, .735)], .014, black);
  for (const x of [-.35, .29]) {
    line(`wiper-arm.${x}`, [new Vector3(x, 1.065, .742), new Vector3(x + .20, 1.10, .705)], .007, black);
    line(`wiper-blade.${x}`, [new Vector3(x - .16, 1.114, .69), new Vector3(x + .30, 1.114, .69)], .009, black);
  }
  line('rear-window-wiper', [new Vector3(-.04, 1.09, -1.70), new Vector3(.29, 1.13, -1.655)], .007, black);
  roundedBox('rear-roof-spoiler', 0, 1.487, -1.29, 1.38, .055, .20, .025, paint);
  roundedBox('high-stop-light', 0, 1.482, -1.39, .46, .025, .018, .008, tailLed);
  const antenna = roundedBox('shark-fin', 0, 1.602, -.98, .072, .13, .19, .035, black); antenna.rotation.x = -.25;

  // Interior remains original geometry and is visible from dashboard/orbit cameras.
  roundedBox('dashboard', 0, .955, .43, 1.49, .20, .43, .065, leather);
  roundedBox('dash-top', 0, 1.055, .51, 1.46, .045, .37, .02, black);
  roundedBox('centre-console', 0, .63, -.18, .24, .42, .94, .065, black);
  roundedBox('centre-screen', 0, 1.105, .405, .29, .18, .035, .025, display).rotation.x = .10;
  roundedBox('instrument-hood', -.39, 1.07, .41, .47, .13, .28, .05, black);
  roundedBox('instrument-panel', -.39, 1.09, .27, .37, .105, .014, .025, display);
  for (const x of [-.6, -.21, .28, .62]) {
    roundedBox(`vent.${x}`, x, 1.0, .205, .145, .055, .026, .016, black);
    for (let i = 0; i < 3; i++) roundedBox(`vent-slat.${x}.${i}`, x, .983 + i * .015, .188, .12, .004, .008, .0015, chrome);
  }
  for (const x of [-.405, .405]) for (const z of [-.22, -.99]) {
    roundedBox(`seat-cushion.${x}.${z}`, x, .595, z, .57, .20, .54, .075, leather);
    roundedBox(`seat-insert.${x}.${z}`, x, .706, z, .35, .025, .39, .012, textile);
    const back = roundedBox(`seat-back.${x}.${z}`, x, .93, z - .23, .55, .66, .17, .075, leather); back.rotation.x = -.13;
    roundedBox(`headrest.${x}.${z}`, x, 1.34, z - .29, .30, .22, .135, .06, leather);
    line(`seat-stitch.${x}.${z}`, [new Vector3(x - .19, .72, z + .15), new Vector3(x - .19, .72, z - .13)], .0025, chrome);
  }
  const steeringWheel = attach(MeshBuilder.CreateTorus('drive.car.steering-wheel', { diameter: .34, thickness: .028, tessellation: 40 }, scene), black);
  steeringWheel.rotation.x = Math.PI / 2 - .30; steeringWheel.position.set(-.40, 1.02, .10);
  roundedBox('steering-hub', -.4, 1.02, .105, .14, .11, .06, .035, leather);
  for (const side of [-1, 1]) line(`steering-spoke.${side}`, [new Vector3(-.4 + side * .04, 1.02, .11), new Vector3(-.4 + side * .14, 1.02, .11)], .014, chrome);
  line('steering-column', [new Vector3(-.4, .94, .15), new Vector3(-.4, .86, .39)], .025, black);
  roundedBox('rearview-mirror', 0, 1.42, .40, .24, .075, .035, .02, black);
  roundedBox('rearview-reflector', 0, 1.42, .379, .216, .055, .008, .012, mirror);

  // Body/interior detail is static. Keep glazing separate for correct transparency sorting.
  const bodyGroups = new Map<PBRMaterial, Mesh[]>();
  for (const mesh of allMeshes) {
    const mat = mesh.material as PBRMaterial;
    if (mesh === steeringWheel || mat === glass) continue;
    const group = bodyGroups.get(mat) ?? []; group.push(mesh); bodyGroups.set(mat, group);
  }
  for (const [mat, group] of bodyGroups) {
    if (group.length < 2) continue;
    const merged = Mesh.MergeMeshes(group, true, true)!;
    merged.name = `drive.car.body-batch.${mat.name}`; merged.parent = root;
    merged.material = mat; merged.isPickable = false; merged.receiveShadows = true;
  }

  // Shared wheel meshes are hardware instanced across four independently spinning roots.
  const wheels: TransformNode[] = [];
  const spinning: TransformNode[] = [];
  const wheelSources: Mesh[] = [];
  for (const z of [-1.255, 1.245]) for (const side of [-1, 1]) {
    const steerRoot = new TransformNode(`drive.car.wheel-steer.${side}.${z}`, scene);
    steerRoot.parent = root; steerRoot.position.set(side * .878, .365, z); wheels.push(steerRoot);
    const spinRoot = new TransformNode(`drive.car.wheel-spin.${side}.${z}`, scene); spinRoot.parent = steerRoot; spinning.push(spinRoot);
    if (wheelSources.length) {
      for (const source of wheelSources) {
        const instance = source.createInstance(`${source.name}.instance.${side}.${z}`);
        instance.parent = spinRoot; instance.position.copyFrom(source.position); instance.rotation.copyFrom(source.rotation);
        if (source.rotationQuaternion) instance.rotationQuaternion = source.rotationQuaternion.clone();
        instance.scaling.copyFrom(source.scaling); instance.isPickable = false; instance.receiveShadows = true;
      }
      continue;
    }
    const start = allMeshes.length;
    const tyreProfile = [[-.112,.245],[-.125,.29],[-.112,.33],[-.08,.359],[-.04,.366],[.04,.366],[.08,.359],[.112,.33],[.125,.29],[.112,.245],[-.112,.245]];
    surface('tyre-profile', 48, 30, (u, v) => {
      const segment = Math.min(tyreProfile.length - 2, Math.floor(v * (tyreProfile.length - 1)));
      const t = v * (tyreProfile.length - 1) - segment; const a = tyreProfile[segment]; const b = tyreProfile[segment + 1];
      const radius = blend(a[1], b[1], t); const angle = u * Math.PI * 2;
      return new Vector3(blend(a[0], b[0], t), Math.cos(angle) * radius, Math.sin(angle) * radius);
    }, rubber, spinRoot);
    cylinder('alloy-barrel', 0, 0, 0, .485, .19, chrome, spinRoot);
    cylinder('brake-disc', 0, 0, 0, .405, .11, brakeMetal, spinRoot);
    for (const sideFace of [-1, 1]) {
      const lip = attach(MeshBuilder.CreateTorus(`drive.car.rim-lip.${sideFace}`, { diameter: .477, thickness: .018, tessellation: 48 }, scene), polished, spinRoot);
      lip.rotation.z = Math.PI / 2; lip.position.x = sideFace * .12;
      cylinder(`hub.${sideFace}`, sideFace * .125, 0, 0, .118, .025, polished, spinRoot);
      cylinder(`hub-inset.${sideFace}`, sideFace * .143, 0, 0, .055, .008, black, spinRoot);
      for (let k = 0; k < 5; k++) {
        const angle = k * Math.PI * 2 / 5;
        for (const split of [-1, 1]) {
          const a = angle + split * .10;
          line(`split-spoke.${sideFace}.${k}.${split}`, [new Vector3(sideFace * .13, Math.cos(angle) * .048, Math.sin(angle) * .048), new Vector3(sideFace * .116, Math.cos(a) * .16, Math.sin(a) * .16), new Vector3(sideFace * .12, Math.cos(a + split * .06) * .23, Math.sin(a + split * .06) * .23)], .014, polished, spinRoot);
        }
        cylinder(`lug.${sideFace}.${k}`, sideFace * .143, Math.cos(angle) * .043, Math.sin(angle) * .043, .015, .014, black, spinRoot);
      }
    }
    // Merge repeated tread lugs into one mesh; clones use shared geometry, not hundreds of draw calls.
    const treadParts: Mesh[] = [];
    for (let k = 0; k < 44; k++) for (const sideTread of [-1, 1]) {
      const angle = k * Math.PI * 2 / 44;
      const piece = MeshBuilder.CreateBox(`drive.car.tread-temp`, { width: .075, height: .007, depth: .015 }, scene);
      piece.position.set(sideTread * .046, Math.cos(angle) * .367, Math.sin(angle) * .367);
      piece.rotationQuaternion = Quaternion.RotationAxis(Vector3.Right(), angle).multiply(Quaternion.RotationAxis(Vector3.Up(), sideTread * .35));
      treadParts.push(piece);
    }
    const treadMesh = Mesh.MergeMeshes(treadParts, true, true)!; treadMesh.name = 'drive.car.tyre-tread'; attach(treadMesh, treadRubber, spinRoot);
    // Consolidate stationary wheel components by material before instancing the assembly.
    const candidates = allMeshes.splice(start);
    const grouped = new Map<PBRMaterial, Mesh[]>();
    for (const mesh of candidates) { const key = mesh.material as PBRMaterial; const group = grouped.get(key) ?? []; group.push(mesh); grouped.set(key, group); }
    for (const [mat, meshes] of grouped) {
      // Mesh.MergeMeshes bakes world matrices, so merge at identity wheel parent then restore it.
      for (const mesh of meshes) { mesh.parent = null; mesh.computeWorldMatrix(true); }
      const merged = meshes.length === 1 ? meshes[0] : Mesh.MergeMeshes(meshes, true, true)!;
      merged.name = `drive.car.wheel.${mat.name}`; merged.parent = spinRoot; merged.material = mat;
      merged.isPickable = false; merged.receiveShadows = true; allMeshes.push(merged); wheelSources.push(merged);
    }
  }
  let spin = 0;
  return {
    root, wheels, ready: Promise.resolve(),
    update(speed: number, dt: number, steer = 0) {
      spin = (spin + speed * Math.min(.1, Math.max(0, dt)) / .365) % (Math.PI * 2);
      for (const wheel of spinning) wheel.rotation.x = spin;
      for (const wheel of wheels) wheel.rotation.y = wheel.position.z > 0 ? steer * .42 : 0;
      steeringWheel.rotation.z = -steer * .65;
    },
    dispose() { root.dispose(); for (const mat of materials) mat.dispose(); },
  };
}
