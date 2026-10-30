import { Color3 } from '@babylonjs/core/Maths/math';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
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

/** No textures, personal labels, media paths or observations are read here. */
export function buildHouse(scene: Scene, layout: HouseLayout) {
  const root = new TransformNode('drive.house.dollhouse', scene);
  root.position.set(-14, 0, 13);
  const materials: StandardMaterial[] = [];
  function material(name: string, color: string) {
    const m = new StandardMaterial(`drive.house.${name}`, scene);
    m.diffuseColor = Color3.FromHexString(color);
    m.specularColor.set(0.05, 0.05, 0.05);
    materials.push(m);
    return m;
  }
  const plaster = material('warm-plaster', '#eee0c5');
  const trim = material('teal-trim', '#437e78');
  const wood = material('wood', '#a4774f');
  const cloth = material('cloth', '#667e91');
  const screen = material('screen', '#224e59');
  screen.emissiveColor = Color3.FromHexString('#246775').scale(0.3);
  const carpet = material('carpet', '#bdad87');
  function box(name: string, x: number, y: number, z: number, w: number, h: number, d: number, mat: StandardMaterial, rotation = 0) {
    const mesh = MeshBuilder.CreateBox(`drive.house.${name}`, { width: w, height: h, depth: d }, scene);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotation;
    mesh.material = mat;
    mesh.parent = root;
    mesh.isPickable = false;
    return mesh;
  }
  for (const room of layout.rooms) {
    box(`floor.${room.id}`, room.x, 0.12, room.z, room.width, 0.24, room.depth, room.floorColor ? material(`floor.${room.id}`, room.floorColor) : carpet);
  }
  // Cutaway wall height makes the connected rooms and computer readable from the car.
  for (const [i, wall] of layout.walls.entries()) {
    const h = Math.min(wall.height ?? 1.18, 1.4);
    box(`wall.${i}`, wall.x, h / 2 + 0.24, wall.z, wall.width, h, wall.depth, plaster);
    box(`wall-cap.${i}`, wall.x, h + 0.28, wall.z, wall.width + 0.045, 0.09, wall.depth + 0.045, trim);
  }
  for (const [i, opening] of layout.openings.entries()) {
    const alongX = opening.orientation === 'x';
    for (const side of [-1, 1]) box(`opening.${i}.${side}`, opening.x + (alongX ? side * opening.width / 2 : 0), 1.28, opening.z + (!alongX ? side * opening.width / 2 : 0), 0.12, 2.08, 0.12, trim);
    box(`lintel.${i}`, opening.x, 2.36, opening.z, alongX ? opening.width + 0.12 : 0.12, 0.14, alongX ? 0.12 : opening.width + 0.12, trim);
  }
  for (const [i, furniture] of layout.furniture.entries()) {
    const { x, z, width, depth, kind, rotation = 0 } = furniture;
    const height = kind === 'bed' ? 0.5 : kind === 'sofa' ? 0.6 : 0.83;
    box(`furniture.${i}.${kind}`, x, height / 2 + 0.25, z, width, height, depth, kind === 'sofa' || kind === 'bed' ? cloth : wood, rotation);
    if (kind === 'sofa') box(`sofa-back.${i}`, x, 1, z + depth * 0.38, width, 0.7, 0.2, cloth, rotation);
    if (kind === 'desk') {
      box(`computer.${i}`, x, 1.4, z + 0.1, Math.min(width * 0.7, 0.9), 0.55, 0.07, screen, rotation);
      box(`computer-stand.${i}`, x, 1.1, z + 0.1, 0.1, 0.35, 0.12, trim, rotation);
      box(`chair.${i}`, x, 0.61, z - 0.8, 0.65, 0.25, 0.65, cloth, rotation);
    }
  }
  return { root, dispose() { root.dispose(); for (const m of materials) m.dispose(); } };
}
