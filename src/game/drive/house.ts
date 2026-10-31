import { Color3, Vector3 } from '@babylonjs/core/Maths/math';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import fictional from './fictional-house.json';

export interface HouseRoom { id: string; x: number; z: number; width: number; depth: number; floorColor?: string }
export interface HouseWall { x: number; z: number; width: number; depth: number; height?: number }
export interface HouseFurniture { kind: 'sofa' | 'table' | 'desk' | 'bed' | 'cabinet'; x: number; z: number; width: number; depth: number; rotation?: number }
export interface HouseOpening { x: number; z: number; width: number; orientation: 'x' | 'z'; label?: string }
export interface HouseLayout { version: 1; label: string; rooms: HouseRoom[]; walls: HouseWall[]; furniture: HouseFurniture[]; openings: HouseOpening[] }

const finite = (v: unknown, limit = 100): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= limit;
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const size = (v: unknown) => finite(v, 50) && v > 0;
const position = (v: Record<string, unknown>) => finite(v.x) && finite(v.z);

/** The only local house boundary. Reject arbitrary/unbounded JSON before allocating meshes. */
export function parseHouseLayout(value: unknown): HouseLayout | null {
  if (!record(value) || value.version !== 1 || typeof value.label !== 'string' || value.label.length > 120) return null;
  for (const key of ['rooms', 'walls', 'furniture', 'openings']) if (!Array.isArray(value[key]) || value[key].length > 150) return null;
  if (!(value.rooms as unknown[]).length) return null;
  if (!(value.rooms as unknown[]).every(v => record(v) && position(v) && size(v.width) && size(v.depth) && typeof v.id === 'string' && v.id.length < 80 && (v.floorColor === undefined || typeof v.floorColor === 'string' && /^#[\da-f]{6}$/i.test(v.floorColor)))) return null;
  if (!(value.walls as unknown[]).every(v => record(v) && position(v) && size(v.width) && size(v.depth) && (v.height === undefined || size(v.height)))) return null;
  if (!(value.furniture as unknown[]).every(v => record(v) && position(v) && size(v.width) && size(v.depth) && ['sofa', 'table', 'desk', 'bed', 'cabinet'].includes(String(v.kind)) && (v.rotation === undefined || finite(v.rotation, Math.PI * 2)))) return null;
  if (!(value.openings as unknown[]).every(v => record(v) && position(v) && size(v.width) && ['x', 'z'].includes(String(v.orientation)) && (v.label === undefined || typeof v.label === 'string' && v.label.length < 80))) return null;
  return structuredClone(value) as unknown as HouseLayout;
}

export const FICTIONAL_HOUSE = parseHouseLayout(fictional)!;

/** Editable reference-layout cutaway with original furnishings and licensed material maps. */
export function buildHouse(scene: Scene, layout: HouseLayout) {
  const root = new TransformNode('drive.house.dollhouse', scene);
  const materials: PBRMaterial[] = [];
  const textures: Texture[] = [];
  const meshes: Mesh[] = [];
  function material(name: string, color: string, roughness = .75, metallic = 0) {
    const m = new PBRMaterial(`drive.house.${name}`, scene);
    m.albedoColor = Color3.FromHexString(color).toLinearSpace();
    m.roughness = roughness; m.metallic = metallic; m.environmentIntensity = .75;
    m.backFaceCulling = false; m.twoSidedLighting = true; materials.push(m);
    return m;
  }
  function maps(mat: PBRMaterial, source: string, repeat = 1) {
    const map = (kind: string) => {
      const texture = new Texture(`${import.meta.env.BASE_URL}assets/drive/materials/${source}-${kind}.webp`, scene, false, true);
      texture.gammaSpace = kind === 'albedo'; texture.uScale = repeat; texture.vScale = repeat;
      texture.anisotropicFilteringLevel = 8; textures.push(texture); return texture;
    };
    mat.albedoTexture = map('albedo'); mat.bumpTexture = map('normal'); mat.bumpTexture.level = .35;
    mat.metallicTexture = map('roughness'); mat.useRoughnessFromMetallicTextureAlpha = false;
    mat.useRoughnessFromMetallicTextureGreen = true; mat.useMetallnessFromMetallicTextureBlue = false;
    return mat;
  }
  const plaster = maps(material('warm-plaster', '#f6f1e7'), 'plaster', 1.5);
  const trim = material('painted-wood-trim', '#f8f4e9', .42);
  const wood = maps(material('oak-veneer', '#e4c9aa', .48), 'wood');
  const floorWood = maps(material('oak-floor', '#d5b58f', .56), 'wood', 3);
  const cloth = maps(material('upholstery-linen', '#d5cdbd', .92), 'fabric', 2.5);
  const cushion = maps(material('accent-cushions', '#73918b', .95), 'fabric', 1.3);
  const black = material('soft-black', '#20272a', .65);
  const metal = material('brushed-metal', '#bbc2bf', .3, .9);
  const darkWood = material('dark-wood', '#45372f', .55);
  const stone = maps(material('stone-counter', '#e5dfd3', .32), 'concrete', 1.5);
  const patio = maps(material('patio-pavers', '#d6d1c5', .88), 'concrete', 3);
  const grout = material('tile-grout', '#92958e', .95);
  const ceramic = material('white-ceramic', '#f4f1e6', .24);
  const screen = material('computer-display', '#1a3941', .18);
  screen.emissiveColor = Color3.FromHexString('#296879').toLinearSpace().scale(.45);
  const glass = material('sliding-door-glass', '#b3d0d4', .08, .03);
  glass.alpha = .27; glass.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
  glass.environmentIntensity = 1.2;
  function attach(mesh: Mesh, mat: PBRMaterial, parent: TransformNode = root) {
    mesh.material = mat; mesh.parent = parent; mesh.isPickable = false; mesh.receiveShadows = true;
    meshes.push(mesh); return mesh;
  }
  function box(name: string, x: number, y: number, z: number, w: number, h: number, d: number, mat: PBRMaterial, parent: TransformNode = root) {
    const mesh = MeshBuilder.CreateBox(`drive.house.${name}`, { width: w, height: h, depth: d }, scene);
    mesh.position.set(x, y, z); return attach(mesh, mat, parent);
  }
  function softBox(name: string, x: number, y: number, z: number, w: number, h: number, d: number, radius: number, mat: PBRMaterial, parent: TransformNode = root) {
    const positions: number[] = []; const normals: number[] = []; const indices: number[] = []; const uvs: number[] = [];
    const half = [w / 2, h / 2, d / 2]; const r = Math.min(radius, ...half);
    const faces = [[0, 1, 2, 1], [0, 2, 1, -1], [1, 2, 0, 1], [1, 0, 2, -1], [2, 0, 1, 1], [2, 1, 0, -1]];
    for (const [axis, ua, va, sign] of faces) {
      const start = positions.length / 3; const n = 4;
      for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
        const p = [0, 0, 0]; p[axis] = sign * half[axis]; p[ua] = (i / n * 2 - 1) * half[ua]; p[va] = (j / n * 2 - 1) * half[va];
        const inner = p.map((v, k) => Math.max(-half[k] + r, Math.min(half[k] - r, v)));
        const normal = new Vector3(p[0] - inner[0], p[1] - inner[1], p[2] - inner[2]).normalize();
        positions.push(inner[0] + normal.x * r, inner[1] + normal.y * r, inner[2] + normal.z * r);
        normals.push(normal.x, normal.y, normal.z); uvs.push(i / n, j / n);
      }
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = start + j * (n + 1) + i; const b = a + n + 1; indices.push(a, b, a + 1, a + 1, b, b + 1); }
    }
    const data = new VertexData(); data.positions = positions; data.normals = normals; data.indices = indices; data.uvs = uvs;
    const mesh = new Mesh(`drive.house.${name}`, scene); data.applyToMesh(mesh); mesh.position.set(x, y, z); return attach(mesh, mat, parent);
  }
  function tube(name: string, points: Vector3[], radius: number, mat: PBRMaterial, parent: TransformNode = root) {
    return attach(MeshBuilder.CreateTube(`drive.house.${name}`, { path: points, radius, tessellation: 6, cap: Mesh.CAP_ALL }, scene), mat, parent);
  }
  function leg(name: string, x: number, z: number, top: number, parent: TransformNode, mat = darkWood) {
    const mesh = MeshBuilder.CreateCylinder(`drive.house.${name}`, { height: top - .25, diameterTop: .055, diameterBottom: .035, tessellation: 8 }, scene);
    mesh.position.set(x, (top + .25) / 2, z); attach(mesh, mat, parent);
  }
  for (const room of layout.rooms) {
    const outdoor = /patio|terrace|garden/.test(room.id);
    box(`foundation.${room.id}`, room.x, .11, room.z, room.width, .22, room.depth, stone);
    box(`floor.${room.id}`, room.x, .235, room.z, room.width, .03, room.depth, outdoor ? patio : floorWood);
    if (outdoor) {
      for (let x = -room.width / 2; x < room.width / 2; x += .6) box('paver-joint', room.x + x, .253, room.z, .006, .003, room.depth, grout);
      for (let z = -room.depth / 2; z < room.depth / 2; z += .6) box('paver-joint', room.x, .253, room.z + z, room.width, .003, .006, grout);
    } else {
      for (let x = -room.width / 2; x < room.width / 2; x += .22) box('plank-joint', room.x + x, .253, room.z, .0025, .002, room.depth, darkWood);
      for (let i = 0; i < Math.ceil(room.width / .22); i++) for (let z = -room.depth / 2 + (i % 3) * .48; z < room.depth / 2; z += 1.45)
        box('plank-end', room.x - room.width / 2 + i * .22 + .11, .253, room.z + z, Math.min(.22, room.width - i * .22), .002, .0025, darkWood);
    }
  }
  const minZ = Math.min(...layout.rooms.map(room => room.z - room.depth / 2));
  const maxX = Math.max(...layout.rooms.map(room => room.x + room.width / 2));
  // Near-side walls are deliberately cut away; rear walls retain actual estimated height.
  for (const [i, wall] of layout.walls.entries()) {
    const alongX = wall.width >= wall.depth;
    const nearSide = alongX ? wall.z < minZ + .7 : wall.x > maxX - .7;
    const h = nearSide ? Math.min(wall.height ?? 2.6, .92) : Math.min(wall.height ?? 2.6, 2.8);
    const length = alongX ? wall.width : wall.depth; const centre = alongX ? wall.x : wall.z;
    let intervals: [number, number][] = [[centre - length / 2, centre + length / 2]];
    const openings = layout.openings.filter(opening => opening.orientation === (alongX ? 'x' : 'z') && Math.abs(alongX ? opening.z - wall.z : opening.x - wall.x) < .3);
    for (const opening of openings) {
      const mid = alongX ? opening.x : opening.z; const a = mid - opening.width / 2; const b = mid + opening.width / 2;
      intervals = intervals.flatMap(([lo, hi]) => b <= lo || a >= hi ? [[lo, hi] as [number, number]] : [lo < a ? [lo, a] as [number, number] : null, hi > b ? [b, hi] as [number, number] : null].filter((v): v is [number, number] => v !== null));
      if (h > 2.2 && b > centre - length / 2 && a < centre + length / 2) {
        box(`door-header.${i}`, alongX ? mid : wall.x, 2.2 + (h - 2.2) / 2 + .25, alongX ? wall.z : mid, alongX ? opening.width : wall.width, h - 2.2, alongX ? wall.depth : opening.width, plaster);
      }
    }
    for (const [lo, hi] of intervals) {
      const x = alongX ? (lo + hi) / 2 : wall.x; const z = alongX ? wall.z : (lo + hi) / 2;
      const w = alongX ? hi - lo : wall.width; const d = alongX ? wall.depth : hi - lo;
      box(`wall.${i}`, x, h / 2 + .25, z, w, h, d, plaster);
      box(`wall-cap.${i}`, x, h + .27, z, w + .025, .045, d + .025, trim);
      box(`baseboard.${i}`, x, .31, z, w + .028, .12, d + .028, trim);
      if (h > 2) box(`crown-moulding.${i}`, x, h + .19, z, w + .07, .09, d + .07, trim);
    }
  }
  for (const [i, opening] of layout.openings.entries()) {
    const alongX = opening.orientation === 'x';
    for (const side of [-1, 1]) box(`door-jamb.${i}.${side}`, opening.x + (alongX ? side * opening.width / 2 : 0), 1.34, opening.z + (!alongX ? side * opening.width / 2 : 0), .095, 2.18, .095, trim);
    box(`lintel.${i}`, opening.x, 2.48, opening.z, alongX ? opening.width + .12 : .12, .12, alongX ? .12 : opening.width + .12, trim);
    box(`threshold.${i}`, opening.x, .26, opening.z, alongX ? opening.width : .18, .025, alongX ? .18 : opening.width, stone);
    if (/glaz|backyard|patio/i.test(opening.label ?? '') && alongX) {
      for (const side of [-1, 1]) {
        const x = opening.x + side * opening.width / 4;
        box(`slider-pane.${i}.${side}`, x, 1.34, opening.z, opening.width / 2 - .07, 2.08, .016, glass);
        box(`slider-stile.${i}.${side}`, opening.x + side * .025, 1.34, opening.z + side * .02, .04, 2.1, .06, metal);
        tube(`slider-handle.${i}.${side}`, [new Vector3(opening.x + side * .11, 1.15, opening.z - .06), new Vector3(opening.x + side * .11, 1.38, opening.z - .06)], .012, black);
      }
      box(`slider-track.${i}`, opening.x, .275, opening.z, opening.width, .03, .10, metal);
    }
  }
  for (const [i, furniture] of layout.furniture.entries()) {
    const group = new TransformNode(`drive.house.furniture.${i}`, scene); group.parent = root;
    group.position.set(furniture.x, 0, furniture.z); group.rotation.y = furniture.rotation ?? 0;
    const { kind } = furniture;
    let width = furniture.width; let depth = furniture.depth;
    if ((kind === 'sofa' || kind === 'cabinet') && depth > width) { [width, depth] = [depth, width]; group.rotation.y += Math.PI / 2; }
    if (kind === 'sofa') {
      for (const side of [-1, 1]) for (const end of [-1, 1]) leg('sofa-foot', side * (width / 2 - .12), end * (depth / 2 - .13), .43, group);
      softBox(`sofa-base.${i}`, 0, .5, 0, width, .22, depth, .075, cloth, group);
      const count = Math.max(1, Math.round(width / .75)); const seatWidth = (width - .26) / count;
      for (let k = 0; k < count; k++) {
        const x = -width / 2 + .13 + seatWidth * (k + .5);
        softBox(`seat-cushion.${i}.${k}`, x, .67, -.05, seatWidth - .025, .16, depth * .72, .065, cloth, group);
        const back = softBox(`back-cushion.${i}.${k}`, x, .94, depth * .33, seatWidth - .022, .49, .19, .075, cloth, group); back.rotation.x = -.1;
        tube(`upholstery-piping.${i}.${k}`, [new Vector3(x - seatWidth / 2 + .045, .725, -depth * .35), new Vector3(x + seatWidth / 2 - .045, .725, -depth * .35)], .004, darkWood, group);
      }
      for (const side of [-1, 1]) {
        softBox(`sofa-arm.${i}.${side}`, side * (width / 2 - .085), .75, 0, .17, .45, depth, .075, cloth, group);
        const pillow = softBox(`throw-pillow.${i}.${side}`, side * (width / 2 - .32), .93, depth * .10, .34, .35, .13, .075, cushion, group); pillow.rotation.z = side * .2; pillow.rotation.x = -.1;
      }
    }
    if (kind === 'table' || kind === 'desk') {
      const top = kind === 'table' ? .99 : 1.0;
      softBox(`table-top.${i}`, 0, top, 0, width, .075, depth, .025, wood, group);
      for (const side of [-1, 1]) for (const end of [-1, 1]) leg(`table-leg.${i}`, side * (width / 2 - .12), end * (depth / 2 - .12), top - .04, group);
      if (kind === 'table' && width > 1) {
        for (const side of [-1, 1]) for (const end of [-1, 1]) {
          const x = side * (width / 2 + .30); const z = end * depth * .27;
          softBox(`dining-chair-seat.${i}`, x, .70, z, .43, .085, .46, .035, cloth, group);
          softBox(`dining-chair-back.${i}`, x + side * .18, 1.02, z, .06, .54, .43, .025, wood, group);
          for (const a of [-1, 1]) for (const b of [-1, 1]) leg(`chair-leg.${i}`, x + a * .16, z + b * .17, .66, group);
        }
        const bowl = MeshBuilder.CreateSphere(`drive.house.table-bowl.${i}`, { diameter: .33, segments: 12 }, scene); bowl.scaling.y = .28; bowl.position.set(0, 1.085, 0); attach(bowl, ceramic, group);
      }
    }
    if (kind === 'desk') {
      softBox(`monitor-frame.${i}`, 0, 1.40, .12, Math.min(width * .7, .82), .45, .04, .018, black, group);
      box(`monitor-screen.${i}`, 0, 1.40, .095, Math.min(width * .7, .82) - .035, .41, .005, screen, group);
      box(`monitor-stand.${i}`, 0, 1.115, .13, .055, .22, .055, metal, group);
      softBox(`monitor-base.${i}`, 0, 1.047, .12, .25, .02, .16, .008, metal, group);
      softBox(`keyboard.${i}`, -.08, 1.051, -.16, .40, .025, .14, .012, black, group);
      for (let row = 0; row < 4; row++) for (let key = 0; key < 12; key++) box('keyboard-key', -.26 + key * .032, 1.067, -.21 + row * .032, .025, .008, .024, trim, group);
      softBox(`mouse.${i}`, .28, 1.065, -.16, .062, .035, .10, .02, black, group);
      softBox(`office-chair-seat.${i}`, 0, .75, -.72, .48, .10, .48, .055, black, group);
      softBox(`office-chair-back.${i}`, 0, 1.06, -.94, .46, .53, .07, .035, black, group);
      leg('chair-column', 0, -.72, .72, group, metal);
      for (let spoke = 0; spoke < 5; spoke++) { const a = spoke * Math.PI * 2 / 5; tube('chair-base', [new Vector3(0, .30, -.72), new Vector3(Math.cos(a) * .28, .30, -.72 + Math.sin(a) * .28)], .018, black, group); }
    }
    if (kind === 'cabinet') {
      box(`cabinet-case.${i}`, 0, .68, 0, width, .84, depth, trim, group);
      box(`cabinet-toe-kick.${i}`, 0, .32, -.012, width - .08, .14, depth - .03, darkWood, group);
      softBox(`countertop.${i}`, 0, 1.127, 0, width + .035, .055, depth + .055, .012, stone, group);
      const doors = Math.max(1, Math.round(width / .50)); const span = width / doors;
      for (let door = 0; door < doors; door++) {
        const x = -width / 2 + span * (door + .5);
        box(`cabinet-door.${i}.${door}`, x, .76, -depth / 2 - .014, span - .025, .67, .025, wood, group);
        tube('cabinet-pull', [new Vector3(x + span * .28, .76, -depth / 2 - .045), new Vector3(x + span * .28, .92, -depth / 2 - .045)], .009, metal, group);
      }
      if (furniture.x > 3 && width > 2.2) {
        softBox('sink-rim', 0, 1.16, 0, .57, .035, .43, .035, metal, group);
        softBox('sink-basin', 0, 1.172, 0, .48, .015, .35, .035, black, group);
        tube('gooseneck-faucet', [new Vector3(.08, 1.15, .23), new Vector3(.08, 1.40, .23), new Vector3(.08, 1.48, .16), new Vector3(.08, 1.45, .03)], .018, metal, group);
      }
    }
    if (kind === 'bed') {
      softBox(`bed-frame.${i}`, 0, .49, 0, width, .29, depth, .04, wood, group);
      softBox(`mattress.${i}`, 0, .72, 0, width - .06, .22, depth - .06, .065, cloth, group);
      softBox(`bed-cover.${i}`, 0, .84, -.18, width - .02, .06, depth * .69, .025, cushion, group);
      for (const side of [-1, 1]) softBox(`bed-pillow.${i}.${side}`, side * width * .23, .89, depth * .32, width * .4, .14, .42, .07, cloth, group);
    }
  }
  // All furniture is static. Merge by material so detail does not become hundreds of draw calls.
  const groups = new Map<PBRMaterial, Mesh[]>();
  for (const mesh of meshes) { const mat = mesh.material as PBRMaterial; const group = groups.get(mat) ?? []; group.push(mesh); groups.set(mat, group); }
  for (const [mat, group] of groups) {
    const merged = group.length === 1 ? group[0] : Mesh.MergeMeshes(group, true, true)!;
    // Singletons retain their furniture parent; merged meshes already bake its transform.
    if (group.length > 1) merged.parent = root;
    merged.name = `drive.house.batch.${mat.name}`; merged.material = mat; merged.isPickable = false; merged.receiveShadows = true;
  }
  root.position.set(-14, 0, 13);
  return { root, dispose() { root.dispose(); for (const m of materials) m.dispose(false, false); for (const texture of textures) texture.dispose(); } };
}
