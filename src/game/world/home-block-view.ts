import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Vector3 } from '@babylonjs/core/Maths/math';
import type { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import type { Material } from '@babylonjs/core/Materials/material';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import type { Scene } from '@babylonjs/core/scene';
import { createKit, glowMaterial, softDotTexture, spriteMaterial } from './kit';
import type { Group, Kit } from './kit';
import { addScenery } from './scenery';
import {
  BACKDROP_HOUSES, CARS, DOCK, DOCK_MAST, FENCES, FENCE_HEIGHT, GARAGE, GATE, HEDGES, HOME_BLOCK, HOME_FLOOR, HOUSES, LAMPS,
  PILINGS, POLES, ROOF_MASTS, ROOF_THICKNESS, SANDBAR, SHORE_X, TRAMPOLINE,
} from '../traversal/home-block';
import type { HouseSpec } from '../traversal/home-block';
import { CUTAWAY_HEIGHT } from '../traversal/world';

type MaterialFactory = (name: string, color: string, emissive?: string, roughness?: number, metallic?: number) => PBRMaterial;
type SurfaceFactory = (value: PBRMaterial, source: string, repeatU: number, repeatV?: number) => void;

const WALL_TINT: Record<HouseSpec['palette'], string> = { home: '#d9d2c2', coral: '#d8b3a0', sand: '#d6c7a4', sage: '#b9c4ae', sky: '#b4c3cf' };
const ROOF_TINT: Record<HouseSpec['palette'], string> = { home: '#7a4a3c', coral: '#5c6166', sand: '#80503e', sage: '#6b4a40', sky: '#565d66' };

/**
 * Renders the practice home block from the same specs that define its collision.
 * Presentation only: nothing here grants progress or moves the hero.
 */
export function createHomeBlockView(scene: Scene, material: MaterialFactory, surface: SurfaceFactory, shadows: ShadowGenerator) {
  const kit = createKit(scene);
  const warmDot = softDotTexture(scene, 'block.warm-dot', [255, 196, 128]);
  const moonDot = softDotTexture(scene, 'block.moon-dot', [150, 190, 235]);
  const textured = (name: string, color: string, source: string, roughness = 0.9) => {
    const value = material(name, color, undefined, roughness);
    // World-scale UVs are baked into the geometry, so every surface repeats once per unit.
    surface(value, source, 1);
    return value;
  };
  const M = {
    grass: material('block.grass', '#8fa57c', undefined, 1),
    asphalt: textured('block.asphalt', '#8c9096', 'asphalt', 0.92),
    concrete: textured('block.concrete', '#b9bdb9', 'concrete', 0.94),
    wood: textured('block.wood', '#b08b68', 'wood', 0.78),
    deck: textured('block.deck', '#8d7861', 'wood', 0.85),
    floor: textured('block.floor', '#c1a181', 'wood', 0.72),
    fence: textured('block.fence', '#a5a39a', 'wood', 0.9),
    trim: material('block.trim', '#e4ddcc', undefined, 0.7),
    dark: material('block.dark-metal', '#1b242d', undefined, 0.5, 0.45),
    cut: material('block.section-cut', '#141a22', undefined, 1),
    glass: material('block.glass', '#1a2c3a', undefined, 0.12, 0.3),
    sand: material('block.sand', '#cdbd95', undefined, 1),
    stone: material('block.stone', '#7d8482', undefined, 0.95),
    gold: material('block.warm-wood', '#cbaa80', undefined, 0.62),
    sofa: material('block.sofa', '#4e6771', undefined, 0.95),
    rug: material('block.rug', '#7a4f52', undefined, 1),
    garage: material('block.garage-door', '#cfd3d2', undefined, 0.6, 0.2),
    rubber: material('block.rubber', '#15181c', undefined, 0.9),
    paint: material('block.road-paint', '#c9b56a', undefined, 0.8),
  };
  surface(M.grass, 'grass', 34, 34);
  const walls = Object.fromEntries(Object.entries(WALL_TINT).map(([palette, color]) => [palette, textured(`block.wall.${palette}`, color, 'plaster', 0.96)])) as Record<HouseSpec['palette'], PBRMaterial>;
  const roofs = Object.fromEntries(Object.entries(ROOF_TINT).map(([palette, color]) => [palette, material(`block.roof.${palette}`, color, undefined, 0.82)])) as Record<HouseSpec['palette'], PBRMaterial>;
  const G = {
    windowWarm: glowMaterial(scene, 'block.window-warm', '#ffc98a', 1.25),
    windowCool: glowMaterial(scene, 'block.window-cool', '#9fd8ff', 0.75),
    lamp: glowMaterial(scene, 'block.lamp', '#ffe2b0', 1.5, { fog: false }),
    cyan: glowMaterial(scene, 'block.cyan', '#63d9ff', 1.7),
    tail: glowMaterial(scene, 'block.tail-light', '#ff4a3a', 1.1),
    screen: glowMaterial(scene, 'block.screen', '#8fe6ff', 0.85),
  };
  const pool = spriteMaterial(scene, 'block.light-pool', warmDot, 0.5, true);
  pool.zOffset = -2;
  const pools: Mesh[] = [];
  const lightPool = (x: number, y: number, z: number, radius: number) => {
    const disc = MeshBuilder.CreateDisc(`block.pool.${pools.length}`, { radius, tessellation: 20 }, scene);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(x, y + 0.03, z);
    pools.push(disc);
  };

  // ---------- Ground, street and shore ----------
  const lawn = MeshBuilder.CreateGround('block.lawn', { width: 160, height: 150 }, scene);
  lawn.position.set(SHORE_X - 80, 0, 0);
  lawn.material = M.grass; lawn.receiveShadows = true; lawn.isPickable = false; lawn.freezeWorldMatrix();
  kit.extent(-30, -22, -0.2, 0.015, -75, 75, M.asphalt, 'world', 3, false);
  for (const x of [-31.6, -22]) kit.extent(x, x + 1.6, -0.2, 0.06, -75, 75, M.concrete, 'world', 1.6, false);
  for (let z = -72; z < 72; z += 6) kit.extent(-26.08, -25.92, 0, 0.02, z, z + 2.6, M.paint, 'world', 2, false);
  for (const z of [3.6, 15.5, -20.5]) kit.extent(-22, -17.5, -0.1, 0.035, z, z + 4, M.concrete, 'world', 2, false);
  kit.extent(-20.4, -17.5, -0.1, 0.03, 0.2, 1.2, M.concrete, 'world', 1, false);
  // Seawall, lake bed and far shore.
  kit.extent(SHORE_X - 0.18, SHORE_X + 0.14, -1.6, 0.05, -75, 75, M.concrete, 'world', 1.2, false);
  kit.extent(SHORE_X, 170, -1.7, -1.5, -110, 110, M.sand, 'world', 6, false);

  // ---------- Houses ----------
  function windowOn(group: Group, axis: 'x' | 'z', at: number, along: number, y: number, width: number, height: number, face: 1 | -1, lit: Material) {
    const depth = 0.05;
    if (axis === 'z') {
      kit.box([width + 0.16, height + 0.16, depth], [along, y, at + face * 0.02], M.trim, group, 2, false);
      kit.box([width, height, depth], [along, y, at + face * 0.045], lit, group, 2, false);
      kit.box([0.05, height, depth], [along, y, at + face * 0.06], M.trim, group, 2, false);
    } else {
      kit.box([depth, height + 0.16, width + 0.16], [at + face * 0.02, y, along], M.trim, group, 2, false);
      kit.box([depth, height, width], [at + face * 0.045, y, along], lit, group, 2, false);
      kit.box([depth, height, 0.05], [at + face * 0.06, y, along], M.trim, group, 2, false);
    }
  }
  function roof(house: HouseSpec, group: Group, tint: Material) {
    const o = house.overhang;
    const base = house.wall + ROOF_THICKNESS;
    const alongX = house.ridgeAxis === 'x';
    const low = alongX ? house.minZ : house.minX;
    const high = alongX ? house.maxZ : house.maxX;
    const mid = (low + high) / 2;
    const pitch = (house.ridge - base) / (mid - low);
    const edge = base - o * pitch;
    const run = mid - (low - o);
    const length = Math.sqrt(run * run + (house.ridge - edge) * (house.ridge - edge));
    const angle = Math.atan2(house.ridge - edge, run);
    const ridgeLength = (alongX ? house.maxX - house.minX : house.maxZ - house.minZ) + o * 2;
    const ridgeCenter = alongX ? (house.minX + house.maxX) / 2 : (house.minZ + house.maxZ) / 2;
    for (const side of [-1, 1] as const) {
      const slab = MeshBuilder.CreateBox(`block.roof.${house.id}.${side}`, alongX
        ? { width: ridgeLength, height: ROOF_THICKNESS, depth: length + 0.05 }
        : { width: length + 0.05, height: ROOF_THICKNESS, depth: ridgeLength }, scene);
      const across = mid + side * run / 2;
      const offsetDown = ROOF_THICKNESS / 2;
      const y = (edge + house.ridge) / 2 - Math.cos(angle) * offsetDown;
      const shift = side * Math.sin(angle) * offsetDown;
      if (alongX) { slab.position.set(ridgeCenter, y, across - shift); slab.rotation.x = side * angle; }
      else { slab.position.set(across - shift, y, ridgeCenter); slab.rotation.z = -side * angle; }
      kit.add(slab, tint, group);
      // Fascia board along each eave.
      if (alongX) kit.box([ridgeLength, 0.16, 0.05], [ridgeCenter, edge - 0.09, mid + side * (run + 0.01)], M.trim, group, 2, false);
      else kit.box([0.05, 0.16, ridgeLength], [mid + side * (run + 0.01), edge - 0.09, ridgeCenter], M.trim, group, 2, false);
    }
    // Ridge cap and the two gable ends.
    if (alongX) kit.box([ridgeLength, 0.09, 0.3], [ridgeCenter, house.ridge + 0.01, mid], M.dark, group, 2, false);
    else kit.box([0.3, 0.09, ridgeLength], [mid, house.ridge + 0.01, ridgeCenter], M.dark, group, 2, false);
    const peak = house.ridge - ROOF_THICKNESS;
    for (const end of alongX ? [house.minX, house.maxX] : [house.minZ, house.maxZ]) {
      kit.polygon(alongX
        ? [new Vector3(end, house.wall, low), new Vector3(end, house.wall, high), new Vector3(end, peak, mid)]
        : [new Vector3(low, house.wall, end), new Vector3(high, house.wall, end), new Vector3(mid, peak, end)], walls[house.palette], group);
    }
  }
  /** A closed neighbouring house: walls, roof, windows and a garage door toward the street. */
  function closedHouse(house: HouseSpec, seed: number, streetSide: 'west' | 'east' | 'north' | 'south') {
    kit.extent(house.minX, house.maxX, 0, house.wall, house.minZ, house.maxZ, walls[house.palette], 'world', 2);
    kit.extent(house.minX - 0.04, house.maxX + 0.04, 0, 0.32, house.minZ - 0.04, house.maxZ + 0.04, M.stone, 'world', 2, false);
    roof(house, 'world', roofs[house.palette]);
    let state = seed;
    const lit = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296 < 0.55 ? (state & 8 ? G.windowWarm : G.windowCool) : M.glass; };
    for (let x = house.minX + 2; x < house.maxX - 1.2; x += 3.4) {
      windowOn('world', 'z', house.minZ, x, 1.55, 1.3, 1.15, -1, lit());
      windowOn('world', 'z', house.maxZ, x, 1.55, 1.3, 1.15, 1, lit());
    }
    for (let z = house.minZ + 2.2; z < house.maxZ - 1.2; z += 3.6) {
      windowOn('world', 'x', house.minX, z, 1.55, 1.3, 1.15, -1, streetSide === 'west' && z < house.minZ + 6 ? M.glass : lit());
      windowOn('world', 'x', house.maxX, z, 1.55, 1.3, 1.15, 1, lit());
    }
    if (streetSide === 'west') {
      kit.box([0.06, 2.2, 3.4], [house.minX - 0.04, 1.1, house.minZ + 3.4], M.garage, 'world', 2, false);
      for (let row = 0; row < 4; row++) kit.box([0.03, 0.03, 3.4], [house.minX - 0.08, 0.5 + row * 0.5, house.minZ + 3.4], M.dark, 'world', 2, false);
      kit.box([0.07, 2.05, 0.95], [house.minX - 0.04, 1.03, house.maxZ - 2], M.dark, 'world', 2, false);
      kit.box([0.12, 0.2, 0.2], [house.minX - 0.1, 2.35, house.maxZ - 2], G.lamp, 'world', 2, false);
      lightPool(house.minX - 1.4, 0, house.maxZ - 2, 2.6);
    }
  }
  for (const [index, house] of HOUSES.slice(1).entries()) closedHouse(house, 77 + index * 31, 'west');
  for (const [index, house] of BACKDROP_HOUSES.entries()) closedHouse(house, 311 + index * 17, house.minX < -36 ? 'east' : 'north');

  // The player's house: a full exterior, and a section cut while the player is indoors.
  const home = HOUSES[0];
  const homeWall = walls.home;
  const split = (minX: number, maxX: number, minZ: number, maxZ: number, top = home.wall) => {
    kit.extent(minX, maxX, 0, CUTAWAY_HEIGHT, minZ, maxZ, homeWall, 'home-lower', 2);
    kit.extent(minX, maxX, CUTAWAY_HEIGHT, top, minZ, maxZ, homeWall, 'home-upper', 2);
  };
  split(home.minX, -7.4, home.minZ - 0.1, home.maxZ + 0.1);
  split(-7.6, -0.4, 2.9, home.maxZ + 0.1);
  split(-7.6, -0.4, -3.1, -2.9);
  split(-0.6, -0.4, -3.1, -1);
  split(-0.6, -0.4, 1, 2.9);
  kit.extent(-0.64, -0.36, 2.42, home.wall, -1, 1, M.trim, 'home-upper', 2);
  for (const z of [-1.04, 1.04]) kit.extent(-0.66, -0.34, HOME_FLOOR, 2.44, z - 0.06, z + 0.06, M.trim, 'home-upper', 2);
  kit.extent(-7.5, -0.5, -0.3, HOME_FLOOR, -3, 3, M.floor, 'home-lower', 1.4, false);
  kit.extent(-0.78, -0.22, -0.3, HOME_FLOOR + 0.012, -0.95, 0.95, M.gold, 'home-lower', 2, false);
  kit.extent(-5.6, -2.2, HOME_FLOOR, HOME_FLOOR + 0.012, -1.3, 0.3, M.rug, 'home-lower', 2, false);
  kit.extent(-7.5, -0.5, 2.5, 2.584, -3, 3, M.trim, 'home-upper', 2, false);
  roof(home, 'home-upper', roofs.home);
  // Furniture: collision matches `computer-desk` and `sofa` in the traversal data.
  const F = HOME_FLOOR;
  kit.box([2.6, 0.12, 1.1], [-4, F + 1.12, 1], M.gold, 'home-lower');
  for (const x of [-5.1, -2.9]) kit.box([0.12, 1.06, 0.9], [x, F + 0.53, 1], M.dark, 'home-lower');
  kit.box([1.7, 1.02, 0.1], [-4, F + 1.78, 1.36], M.dark, 'home-lower');
  kit.box([0.16, 0.34, 0.16], [-4, F + 1.3, 1.34], M.dark, 'home-lower');
  kit.box([1, 0.05, 0.34], [-4, F + 1.21, 0.72], M.dark, 'home-lower');
  kit.box([2.8, 0.5, 1.1], [-4.6, F + 0.35, -1.8], M.sofa, 'home-lower');
  kit.box([2.8, 0.75, 0.28], [-4.6, F + 0.67, -2.21], M.sofa, 'home-lower');
  for (const x of [-5.89, -3.31]) kit.box([0.22, 0.42, 1.08], [x, F + 0.72, -1.8], M.sofa, 'home-lower');
  for (const x of [-5.2, -4.05]) kit.box([0.86, 0.14, 0.72], [x, F + 0.66, -1.72], M.trim, 'home-lower');
  kit.box([0.05, 1.7, 0.05], [-7.05, F + 0.85, 2.5], M.dark, 'home-lower', 2, false);
  kit.box([0.34, 0.28, 0.34], [-7.05, F + 1.8, 2.5], G.lamp, 'home-lower', 2, false);
  kit.box([0.5, 0.9, 0.5], [-7, F + 0.45, -2.5], M.gold, 'home-lower');
  kit.sphere([0.9, 1.1, 0.9], [-7, F + 1.4, -2.5], material('block.houseplant', '#4d7350', undefined, 1), 'home-lower', 6);
  // Windows and doors on the exterior faces.
  for (const x of [-6, -3.9, -1.9]) windowOn('home-upper', 'z', -3.1, x, 1.6, 1.4, 1.2, -1, G.windowWarm);
  for (const x of [-15.2, -12, -9]) windowOn('home-upper', 'z', -3.1, x, 1.6, 1.3, 1.15, -1, x === -12 ? G.windowCool : M.glass);
  for (const x of [-15.2, -11.8, -8.4, -4.6]) windowOn('home-upper', 'z', 9.1, x, 1.6, 1.3, 1.15, 1, x === -8.4 ? G.windowWarm : M.glass);
  windowOn('home-upper', 'x', -0.4, 5.8, 1.6, 1.5, 1.2, 1, G.windowWarm);
  windowOn('home-upper', 'x', -0.4, 7.9, 1.6, 0.8, 1.2, 1, M.glass);
  kit.box([0.06, 2.2, 3.6], [-17.54, 1.1, 5.6], M.garage, 'home-upper', 2, false);
  for (let row = 0; row < 4; row++) kit.box([0.03, 0.03, 3.6], [-17.58, 0.5 + row * 0.5, 5.6], M.dark, 'home-upper', 2, false);
  kit.box([0.07, 2.05, 0.95], [-17.54, 1.03, 0.7], M.dark, 'home-upper', 2, false);
  kit.box([0.12, 0.2, 0.2], [-17.6, 2.35, 0.7], G.lamp, 'home-upper', 2, false);
  kit.box([0.12, 0.2, 0.2], [-0.3, 2.3, 1.5], G.lamp, 'home-upper', 2, false);
  lightPool(-18.8, 0, 0.7, 2.8); lightPool(0.9, 0.06, 0.6, 2.6);

  // ---------- Yard ----------
  kit.extent(-0.5, 2.7, -0.2, 0.06, -1.5, 1.5, M.concrete, 'world', 1.2, false);
  for (let index = 0; index < 5; index++) kit.box([0.62, 0.05, 0.9], [1.3 + index * 1.2, 0.012, -2.75], M.stone, 'world', 2, false);
  for (let index = 0; index < 5; index++) kit.box([0.9, 0.05, 0.62], [5.4 + index * 0.92, 0.012, 0.4 + (index % 2) * 0.12], M.stone, 'world', 2, false);
  for (const fence of FENCES) {
    const alongX = fence.maxX - fence.minX > fence.maxZ - fence.minZ;
    const cx = (fence.minX + fence.maxX) / 2;
    const cz = (fence.minZ + fence.maxZ) / 2;
    const length = alongX ? fence.maxX - fence.minX : fence.maxZ - fence.minZ;
    kit.box(alongX ? [length, FENCE_HEIGHT - 0.12, 0.05] : [0.05, FENCE_HEIGHT - 0.12, length], [cx, (FENCE_HEIGHT - 0.12) / 2 + 0.06, cz], M.fence, 'world', 0.9);
    kit.box(alongX ? [length, 0.07, 0.14] : [0.14, 0.07, length], [cx, FENCE_HEIGHT - 0.035, cz], M.trim, 'world', 2, false);
    for (let offset = 0; offset <= length + 0.01; offset += length / Math.max(1, Math.round(length / 1.7))) {
      const px = alongX ? fence.minX + offset : cx;
      const pz = alongX ? cz : fence.minZ + offset;
      kit.box([0.13, FENCE_HEIGHT, 0.13], [px, FENCE_HEIGHT / 2, pz], M.trim, 'world', 2, false);
    }
  }
  for (const z of [GATE.minZ - 0.08, GATE.maxZ + 0.08]) {
    kit.box([0.2, 1.75, 0.2], [GATE.x, 0.875, z], M.trim, 'world');
    kit.box([0.16, 0.16, 0.16], [GATE.x, 1.84, z], G.lamp, 'world', 2, false);
  }
  const gateLeaf = MeshBuilder.CreateBox('block.gate-leaf', { width: 1.5, height: 1.15, depth: 0.05 }, scene);
  gateLeaf.position.set(GATE.x + 0.62, 0.66, GATE.maxZ + 0.62); gateLeaf.rotation.y = -0.95;
  kit.add(gateLeaf, M.fence);
  lightPool(GATE.x + 0.4, 0, (GATE.minZ + GATE.maxZ) / 2, 2.4);
  // Garage, trampoline and the practice plinth.
  kit.extent(GARAGE.minX, GARAGE.maxX, 0, GARAGE.top - 0.12, GARAGE.minZ, GARAGE.maxZ, homeWall, 'world', 2);
  kit.extent(GARAGE.minX - 0.15, GARAGE.maxX + 0.15, GARAGE.top - 0.12, GARAGE.top, GARAGE.minZ - 0.15, GARAGE.maxZ + 0.15, M.dark, 'world', 2);
  kit.box([2.9, 2.3, 0.06], [(GARAGE.minX + GARAGE.maxX) / 2, 1.15, GARAGE.minZ - 0.04], M.garage, 'world', 2, false);
  for (let row = 0; row < 4; row++) kit.box([2.9, 0.03, 0.03], [(GARAGE.minX + GARAGE.maxX) / 2, 0.5 + row * 0.5, GARAGE.minZ - 0.08], M.dark, 'world', 2, false);
  const tx = (TRAMPOLINE.minX + TRAMPOLINE.maxX) / 2;
  const tz = (TRAMPOLINE.minZ + TRAMPOLINE.maxZ) / 2;
  const tr = (TRAMPOLINE.maxX - TRAMPOLINE.minX) / 2;
  const frame = MeshBuilder.CreateTorus('block.trampoline-frame', { diameter: tr * 2 - 0.1, thickness: 0.11, tessellation: 28 }, scene);
  frame.position.set(tx, TRAMPOLINE.top - 0.03, tz);
  kit.add(frame, M.dark);
  for (let leg = 0; leg < 6; leg++) {
    const a = leg / 6 * Math.PI * 2;
    kit.cylinder(TRAMPOLINE.top - 0.05, 0.06, 0.06, [tx + Math.cos(a) * (tr - 0.08), (TRAMPOLINE.top - 0.05) / 2, tz + Math.sin(a) * (tr - 0.08)], M.dark, 'world', 6);
  }
  kit.extent(TRAMPOLINE.minX - 0.55, TRAMPOLINE.minX, 0, 0.34, 2.7, 3.5, M.wood, 'world', 0.8);
  kit.box([0.85, 0.1, 0.85], [6, 0.05, -2.8], M.dark, 'world', 2, false);

  // ---------- Dock, sandbar and lake posts ----------
  const ramp = MeshBuilder.CreateBox('block.dock-ramp', { width: Math.hypot(DOCK.minX - DOCK.rampStart, DOCK.deck) + 0.04, height: 0.1, depth: DOCK.halfWidth * 2 }, scene);
  ramp.position.set((DOCK.rampStart + DOCK.minX) / 2, DOCK.deck / 2 - 0.05, 0);
  ramp.rotation.z = Math.atan2(DOCK.deck, DOCK.minX - DOCK.rampStart);
  kit.add(ramp, M.deck);
  kit.extent(DOCK.minX, DOCK.maxX, DOCK.deck - 0.12, DOCK.deck, -DOCK.halfWidth, DOCK.halfWidth, M.deck, 'world', 1.1);
  kit.extent(DOCK.maxX, DOCK.endMaxX, DOCK.deck - 0.12, DOCK.deck, -DOCK.endHalfWidth, DOCK.endHalfWidth, M.deck, 'world', 1.1);
  for (let x = DOCK.minX + 1; x <= DOCK.endMaxX; x += 3.4) {
    const half = x > DOCK.maxX ? DOCK.endHalfWidth : DOCK.halfWidth;
    for (const z of [-half + 0.1, half - 0.1]) kit.cylinder(2.4, 0.26, 0.3, [x, -0.6, z], M.wood, 'world', 8);
  }
  kit.sphere([SANDBAR.maxX - SANDBAR.minX + 1.4, 1.5, SANDBAR.maxZ - SANDBAR.minZ + 1.4], [(SANDBAR.minX + SANDBAR.maxX) / 2, SANDBAR.top - 0.76, (SANDBAR.minZ + SANDBAR.maxZ) / 2], M.sand, 'world', 12, false);
  kit.extent(SANDBAR.minX + 0.3, SANDBAR.maxX - 0.3, -1.4, SANDBAR.top - 0.005, SANDBAR.minZ + 0.3, SANDBAR.maxZ - 0.3, M.sand, 'world', 3, false);
  const armTo = (fromX: number, fromY: number, fromZ: number, toX: number, toY: number, toZ: number, thickness: number, tint: Material) => {
    const length = Math.hypot(toX - fromX, toY - fromY, toZ - fromZ);
    const arm = MeshBuilder.CreateBox(`block.arm.${fromX}.${fromZ}`, { width: thickness, height: thickness, depth: length }, scene);
    arm.position.set((fromX + toX) / 2, (fromY + toY) / 2, (fromZ + toZ) / 2);
    arm.lookAt(new Vector3(toX, toY, toZ));
    kit.add(arm, tint, 'world', false);
  };
  for (const lamp of LAMPS) {
    const base = lamp.floor > 0 ? -1.4 : 0;
    kit.cylinder(lamp.height - base, 0.13, 0.2, [lamp.x, (lamp.height + base) / 2, lamp.z], M.dark, 'world', 8);
    armTo(lamp.x, lamp.height - 0.1, lamp.z, lamp.x + lamp.armX, lamp.height - 0.1, lamp.z + lamp.armZ, 0.1, M.dark);
    kit.box([0.5, 0.14, 0.5], [lamp.x + lamp.armX, lamp.height - 0.24, lamp.z + lamp.armZ], G.lamp, 'world', 2, false);
    lightPool(lamp.x + lamp.armX, lamp.floor, lamp.z + lamp.armZ, lamp.floor > 0 ? DOCK.halfWidth - 0.1 : 4.4);
  }
  kit.cylinder(DOCK_MAST.height - DOCK.deck, 0.14, 0.22, [DOCK_MAST.postX, (DOCK_MAST.height + DOCK.deck) / 2, DOCK_MAST.postZ], M.dark, 'world', 8);
  armTo(DOCK_MAST.postX, DOCK_MAST.height - 0.1, DOCK_MAST.postZ, DOCK_MAST.x, DOCK_MAST.height - 0.1, DOCK_MAST.z, 0.1, M.dark);
  kit.box([0.4, 0.14, 0.4], [DOCK_MAST.x, DOCK_MAST.height - 0.26, DOCK_MAST.z], G.lamp, 'world', 2, false);
  lightPool(DOCK_MAST.x, DOCK.deck, DOCK_MAST.z, 2.8);
  for (const piling of PILINGS) {
    kit.cylinder(piling.height + 1.5, 0.36, 0.5, [piling.x, (piling.height - 1.5) / 2, piling.z], M.wood, 'world', 8);
    armTo(piling.x, piling.height - 0.15, piling.z, piling.x + piling.armX, piling.height - 0.15, piling.z + piling.armZ, 0.16, M.wood);
    kit.box([0.22, 0.22, 0.22], [piling.x, piling.height + 0.12, piling.z], G.lamp, 'world', 2, false);
  }
  for (const mast of ROOF_MASTS) {
    kit.cylinder(mast.height - mast.ridge + 0.1, 0.05, 0.08, [mast.x, (mast.height + mast.ridge) / 2, mast.z], M.dark, mast.home ? 'home-upper' : 'world', 6, false);
    kit.box([0.9, 0.04, 0.04], [mast.x, mast.height - 0.5, mast.z], M.dark, mast.home ? 'home-upper' : 'world', 2, false);
  }

  // ---------- Street furniture ----------
  for (const pole of POLES) {
    kit.cylinder(pole.height, 0.2, 0.3, [pole.x, pole.height / 2, pole.z], M.wood, 'world', 8);
    kit.box([Math.abs(pole.armX) * 2 + 0.6, 0.14, 0.14], [pole.x, pole.height - 0.3, pole.z], M.wood, 'world', 2, false);
    kit.box([0.5, 0.6, 0.4], [pole.x + 0.25, pole.height - 1.3, pole.z], M.dark, 'world', 2, false);
  }
  for (let index = 0; index < POLES.length - 1; index++) {
    const a = POLES[index];
    const b = POLES[index + 1];
    for (const side of [-1, 1]) {
      const x = a.x + side * 2.2;
      const wire = MeshBuilder.CreateTube(`block.wire.${index}.${side}`, { path: [0, 0.25, 0.5, 0.75, 1].map(t =>
        new Vector3(x, a.height - 0.22 - Math.sin(Math.PI * t) * 0.55, a.z + (b.z - a.z) * t)), radius: 0.018, tessellation: 4 }, scene);
      kit.add(wire, M.rubber, 'world', false);
    }
  }
  for (const car of CARS) {
    const alongX = car.maxX - car.minX > car.maxZ - car.minZ;
    const paint = material(`block.paint.${car.id}`, car.color, undefined, 0.32, 0.55);
    const cx = (car.minX + car.maxX) / 2;
    const cz = (car.minZ + car.maxZ) / 2;
    const length = alongX ? car.maxX - car.minX : car.maxZ - car.minZ;
    const width = alongX ? car.maxZ - car.minZ : car.maxX - car.minX;
    const size = (l: number, h: number, w: number): [number, number, number] => alongX ? [l, h, w] : [w, h, l];
    const at = (along: number, y: number, across: number): [number, number, number] => alongX ? [cx + along, y, cz + across] : [cx + across, y, cz + along];
    kit.box(size(length, 0.62, width), at(0, 0.62, 0), paint);
    kit.box(size(length * 0.5, 0.52, width * 0.86), at(-length * 0.04, 1.19, 0), M.glass);
    kit.box(size(length * 0.52, 0.05, width * 0.9), at(-length * 0.04, 1.47, 0), paint, 'world', 2, false);
    for (const along of [-length * 0.31, length * 0.31]) for (const across of [-width / 2 + 0.08, width / 2 - 0.08]) {
      const wheel = MeshBuilder.CreateCylinder(`block.wheel.${car.id}.${along}.${across}`, { height: 0.24, diameter: 0.66, tessellation: 14 }, scene);
      wheel.rotation.set(alongX ? Math.PI / 2 : 0, 0, alongX ? 0 : Math.PI / 2);
      const p = at(along, 0.33, across);
      wheel.position.set(p[0], p[1], p[2]);
      kit.add(wheel, M.rubber, 'world', false);
    }
    for (const across of [-width / 2 + 0.25, width / 2 - 0.25]) {
      kit.box(size(0.05, 0.14, 0.34), at(-length / 2 - 0.01, 0.78, across), G.tail, 'world', 2, false);
      kit.box(size(0.05, 0.14, 0.34), at(length / 2 + 0.01, 0.74, across), G.windowCool, 'world', 2, false);
    }
  }
  for (const z of [1.9, 13.4, -11]) {
    kit.box([0.1, 1.1, 0.1], [-20.9, 0.55, z], M.wood, 'world', 2, false);
    kit.box([0.5, 0.26, 0.24], [-21, 1.2, z], M.dark, 'world', 2, false);
  }

  const scenery = addScenery(scene, kit, { material, surface, M, G, warmDot, lightPool, hedges: HEDGES });
  const { merged, casters } = kit.finish();
  for (const mesh of casters) shadows.addShadowCaster(mesh);
  const pools$ = Mesh.MergeMeshes(pools, true, true);
  if (pools$) { pools$.name = 'block.light-pools'; pools$.material = pool; pools$.isPickable = false; pools$.freezeWorldMatrix(); }

  // Section-cut caps are only drawn while the player's house is open.
  const capKit: Kit = createKit(scene);
  for (const [minX, maxX, minZ, maxZ] of [[home.minX, -7.4, home.minZ - 0.1, home.maxZ + 0.1], [-7.6, -0.4, 2.9, home.maxZ + 0.1], [-7.6, -0.4, -3.1, -2.9], [-0.6, -0.4, -3.1, -1], [-0.6, -0.4, 1, 2.9]]) {
    capKit.extent(minX, maxX, CUTAWAY_HEIGHT, CUTAWAY_HEIGHT + 0.02, minZ, maxZ, M.cut, 'world', 2, false);
  }
  const caps = capKit.finish().merged.world;

  // ---------- Animated or state-driven pieces ----------
  const mat = MeshBuilder.CreateDisc('block.trampoline-mat', { radius: tr - 0.12, tessellation: 28 }, scene);
  mat.rotation.x = Math.PI / 2; mat.position.set(tx, TRAMPOLINE.top - 0.02, tz);
  mat.material = M.rubber; mat.receiveShadows = true; mat.isPickable = false;
  const padGlow = MeshBuilder.CreateTorus('block.trampoline-glow', { diameter: tr * 2 + 0.16, thickness: 0.05, tessellation: 32 }, scene);
  padGlow.position.set(tx, TRAMPOLINE.top - 0.02, tz);
  padGlow.material = glowMaterial(scene, 'block.pad-glow', '#7dffd0', 1.1);
  padGlow.isPickable = false;
  const screen = MeshBuilder.CreateBox('computer.signal-screen', { width: 1.5, height: 0.84, depth: 0.03 }, scene);
  screen.position.set(-4, F + 1.78, 1.3); screen.material = G.screen; screen.isPickable = false;
  const water = MeshBuilder.CreateGround('block.water', { width: 170, height: 230 }, scene);
  water.position.set(SHORE_X + 85, HOME_BLOCK.water[0].surface, 0);
  const waterMaterial = material('block.water', '#061a28', undefined, 0.16, 0.1);
  waterMaterial.alpha = 0.95;
  waterMaterial.environmentIntensity = 0.4;
  water.material = waterMaterial; water.isPickable = false; water.receiveShadows = true;
  // Moon glitter: a long additive streak on the lake toward the moon.
  const glitter = MeshBuilder.CreateGround('block.moon-glitter', { width: 14, height: 110 }, scene);
  glitter.position.set(SHORE_X + 52, HOME_BLOCK.water[0].surface + 0.02, -24);
  glitter.rotation.y = -1.13;
  glitter.material = spriteMaterial(scene, 'block.moon-glitter', moonDot, 0.2, true); glitter.isPickable = false;

  let cutaway = false;
  let pulse = 0;
  const applyCutaway = () => {
    for (const mesh of merged['home-upper']) mesh.setEnabled(!cutaway);
    for (const mesh of caps) mesh.setEnabled(cutaway);
  };
  applyCutaway();
  return {
    screen,
    get cutaway() { return cutaway; },
    setCutaway(value: boolean) { if (value !== cutaway) { cutaway = value; applyCutaway(); } },
    pulseTrampoline() { pulse = 1; },
    update(dt: number, elapsed: number, reducedMotion: boolean) {
      pulse = Math.max(0, pulse - dt * 2.4);
      const dip = reducedMotion ? 0 : Math.sin(pulse * Math.PI) * 0.22;
      mat.position.y = TRAMPOLINE.top - 0.02 - dip;
      padGlow.scaling.setAll(1 + (reducedMotion ? 0 : pulse * 0.12 + Math.sin(elapsed * 2.2) * 0.012));
      scenery.update(dt, elapsed, reducedMotion);
    },
    counts: () => ({ merged: merged.world.length + merged['home-lower'].length + merged['home-upper'].length, casters: casters.length }),
    dispose() { warmDot.dispose(); moonDot.dispose(); scenery.dispose(); },
  };
}
export type HomeBlockView = ReturnType<typeof createHomeBlockView>;
