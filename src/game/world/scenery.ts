import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Vector3, Color3 } from '@babylonjs/core/Maths/math';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import type { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import type { Material } from '@babylonjs/core/Materials/material';
import type { Scene } from '@babylonjs/core/scene';
import { softDotTexture, spriteMaterial } from './kit';
import type { Kit } from './kit';
import { PALMS, TREES } from '../traversal/home-block';
import type { HedgeSpec } from '../traversal/home-block';

/** Direction from the block toward the moon; the key light shines the opposite way. */
export const MOON_DIRECTION = new Vector3(0.82, 0.4, -0.3).normalize();

interface SceneryOptions {
  material: (name: string, color: string, emissive?: string, roughness?: number, metallic?: number) => PBRMaterial;
  surface: (value: PBRMaterial, source: string, repeatU: number, repeatV?: number) => void;
  M: Record<string, Material>;
  G: Record<string, Material>;
  warmDot: DynamicTexture;
  lightPool: (x: number, y: number, z: number, radius: number) => void;
  hedges: readonly HedgeSpec[];
}

/** Vegetation, distant lights and the night sky. Deterministic; no gameplay state. */
export function addScenery(scene: Scene, kit: Kit, options: SceneryOptions) {
  const { material, surface, M } = options;
  let seed = 9173;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const bark = material('block.bark', '#6f5a47', undefined, 0.95);
  surface(bark, 'bark', 1);
  const frond = material('block.palm-frond', '#3f6a45', undefined, 0.85);
  frond.backFaceCulling = false; frond.twoSidedLighting = true;
  const leaf = material('block.leaf', '#35573c', undefined, 1);
  const hedgeMaterial = material('block.hedge', '#3a5a3d', undefined, 1);

  // ---------- Palms: a leaning trunk and a crown of drooping fronds ----------
  for (const palm of PALMS) {
    const top = new Vector3(palm.x + palm.leanX, palm.height - 0.5, palm.z + palm.leanZ);
    const base = new Vector3(palm.x, 0, palm.z);
    const bend = new Vector3(palm.x, palm.height * 0.62, palm.z);
    const path: Vector3[] = [];
    for (let index = 0; index <= 8; index++) {
      const t = index / 8;
      path.push(base.scale((1 - t) * (1 - t)).add(bend.scale(2 * t * (1 - t))).add(top.scale(t * t)));
    }
    const trunk = MeshBuilder.CreateTube(`block.palm-trunk.${palm.id}`, { path, tessellation: 8, radiusFunction: (index: number) => 0.24 - index * 0.012 }, scene);
    kit.add(trunk, bark);
    const count = 11;
    for (let index = 0; index < count; index++) {
      const angle = index / count * Math.PI * 2 + random() * 0.4;
      const length = 3 + random() * 0.9;
      const droop = 1.5 + random() * 1.1;
      const lift = 0.5 + random() * 0.5;
      const dir = new Vector3(Math.cos(angle), 0, Math.sin(angle));
      const side = new Vector3(-dir.z, 0, dir.x);
      const left: Vector3[] = [];
      const right: Vector3[] = [];
      for (let step = 0; step <= 6; step++) {
        const t = step / 6;
        const center = top.add(dir.scale(length * t)).add(new Vector3(0, lift * Math.sin(t * Math.PI * 0.6) - droop * t * t, 0));
        const width = 0.52 * Math.sin(Math.PI * (0.12 + t * 0.88));
        left.push(center.add(side.scale(width)).add(new Vector3(0, -0.14 * width, 0)));
        right.push(center.subtract(side.scale(width)).add(new Vector3(0, -0.14 * width, 0)));
      }
      const blade = MeshBuilder.CreateRibbon(`block.palm-frond.${palm.id}.${index}`, { pathArray: [left, right], sideOrientation: Mesh.DOUBLESIDE }, scene);
      kit.add(blade, frond, 'world', index % 3 === 0);
    }
    kit.sphere([0.75, 0.6, 0.75], [top.x, top.y - 0.1, top.z], bark, 'world', 6, false);
  }

  // ---------- Shade trees: trunk, a long limb for the anchor and a blobby crown ----------
  for (const tree of TREES) {
    const trunkTop = tree.height - tree.crown;
    kit.cylinder(trunkTop + 1, 0.55, 0.85, [tree.x, (trunkTop + 1) / 2, tree.z], bark, 'world', 10);
    const limb = MeshBuilder.CreateTube(`block.oak-limb.${tree.id}`, { path: [
      new Vector3(tree.x, trunkTop + 0.4, tree.z),
      new Vector3(tree.x + tree.limbX * 0.5, tree.height - 1.2, tree.z + tree.limbZ * 0.5),
      new Vector3(tree.x + tree.limbX * 1.25, tree.height - 0.55, tree.z + tree.limbZ * 1.25),
    ], radius: 0.2, tessellation: 7 }, scene);
    kit.add(limb, bark);
    for (let index = 0; index < 7; index++) {
      const angle = index / 7 * Math.PI * 2;
      const radius = index === 0 ? 0 : tree.crown * 0.55;
      const size = tree.crown * (index === 0 ? 1.25 : 0.85 + random() * 0.3);
      kit.sphere([size * 1.25, size * 0.9, size * 1.25], [tree.x + Math.cos(angle) * radius, tree.height + 0.4 + (index === 0 ? 0.9 : random() * 0.8), tree.z + Math.sin(angle) * radius], leaf, 'world', 6);
    }
  }

  // ---------- Hedges and shrubs ----------
  for (const hedge of options.hedges) {
    kit.extent(hedge.minX, hedge.maxX, 0, hedge.height, hedge.minZ, hedge.maxZ, hedgeMaterial, 'world', 2);
    const alongX = hedge.maxX - hedge.minX > hedge.maxZ - hedge.minZ;
    const length = alongX ? hedge.maxX - hedge.minX : hedge.maxZ - hedge.minZ;
    // Rounded tops only on the two lot hedges the player runs beside.
    if (hedge.height > 1.3) continue;
    for (let offset = 0.8; offset < length; offset += 2.3 + random() * 0.7) {
      const x = alongX ? hedge.minX + offset : (hedge.minX + hedge.maxX) / 2;
      const z = alongX ? (hedge.minZ + hedge.maxZ) / 2 : hedge.minZ + offset;
      kit.sphere([1.9, 0.7, 1.3], [x, hedge.height - 0.05, z], hedgeMaterial, 'world', 3, false);
    }
  }
  for (const [x, z, size] of [[-1.6, -4.1, 1.1], [-4.4, -4, 1.3], [-9.8, -3.9, 1.2], [-13.2, -4, 1], [-18.3, -1.6, 1.1], [-18.3, 2.6, 0.9], [-18.2, 8.2, 1.1],
    [0.3, 4.4, 0.9], [9.2, 4.5, 0.8], [0.4, -4.4, 0.9], [11.2, 5.5, 1.2], [11.4, -7.6, 1.1], [-17, 13.2, 1.1], [-17, -11.2, 1.1], [1, 13.4, 1.2], [1, -11.4, 1.2]] as const) {
    kit.sphere([size * 1.5, size, size * 1.5], [x, size * 0.42, z], hedgeMaterial, 'world', 4, false);
  }
  // Reeds along the seawall soften the straight shoreline.
  const reed = material('block.reed', '#5d7a4c', undefined, 1);
  for (let index = 0; index < 26; index++) {
    const z = -30 + random() * 60;
    if (Math.abs(z) < 3.2) continue;
    kit.cylinder(0.9 + random() * 0.8, 0, 0.07, [17.25 + random() * 0.6, 0.25 + random() * 0.2, z], reed, 'world', 4, false);
  }

  // ---------- Far lights: a town across the lake and street lights down the road ----------
  // One merged mesh of fixed sprites: they are too distant for billboarding to matter.
  const far: Mesh[] = [];
  const spark = (x: number, y: number, z: number, size: number, facing: number) => {
    const plane = MeshBuilder.CreatePlane(`block.far-light.${far.length}`, { size, sideOrientation: Mesh.DOUBLESIDE }, scene);
    plane.position.set(x, y, z);
    plane.rotation.y = facing;
    far.push(plane);
  };
  for (let index = 0; index < 54; index++) spark(150 + random() * 14, 1.6 + random() * 5, -105 + index * 4 + random() * 2, 2.2 + random() * 2.2, Math.PI / 2);
  for (const z of [-70, -54, -38, 38, 54, 70]) spark(-23.6, 8.3, z, 2.6, 0);
  const farDot = softDotTexture(scene, 'block.far-dot', [255, 206, 150], 32);
  const farLights = Mesh.MergeMeshes(far, true, true);
  if (farLights) { farLights.name = 'block.far-lights'; farLights.material = spriteMaterial(scene, 'block.far-lights', farDot, 0.9); farLights.isPickable = false; farLights.freezeWorldMatrix(); }
  kit.extent(148, 150, -1.5, 3.2, -110, 110, M.cut, 'world', 4, false);

  // ---------- Sky: gradient dome, stars, moon and the occasional falling light ----------
  const dome = MeshBuilder.CreateSphere('sky.dome', { diameter: 760, segments: 20, sideOrientation: Mesh.BACKSIDE }, scene);
  const positions = dome.getVerticesData(VertexBuffer.PositionKind)!;
  const colors: number[] = [];
  const horizon = Color3.FromHexString('#1b3a55').toLinearSpace();
  const middle = Color3.FromHexString('#0a1a31').toLinearSpace();
  const zenith = Color3.FromHexString('#030814').toLinearSpace();
  for (let index = 0; index < positions.length; index += 3) {
    const height = Math.max(0, positions[index + 1] / 380);
    const lower = Math.min(1, height / 0.28);
    const upper = Math.min(1, Math.max(0, (height - 0.28) / 0.72));
    const tint = Color3.Lerp(Color3.Lerp(horizon, middle, lower), zenith, upper);
    colors.push(tint.r, tint.g, tint.b, 1);
  }
  dome.setVerticesData(VertexBuffer.ColorKind, colors);
  const skyMaterial = new StandardMaterial('sky.gradient', scene);
  skyMaterial.disableLighting = true; skyMaterial.emissiveColor = Color3.White(); skyMaterial.fogEnabled = false;
  skyMaterial.backFaceCulling = true;
  dome.material = skyMaterial; dome.isPickable = false; dome.infiniteDistance = true; dome.applyFog = false;

  const starPositions: number[] = [];
  const starColors: number[] = [];
  for (let index = 0; index < 900; index++) {
    const u = random() * Math.PI * 2;
    const v = Math.acos(random() * 0.94 + 0.05);
    const r = 365;
    starPositions.push(Math.sin(v) * Math.cos(u) * r, Math.cos(v) * r, Math.sin(v) * Math.sin(u) * r);
    const brightness = 0.35 + random() * random() * 0.75;
    const warm = random();
    starColors.push(brightness * (0.85 + warm * 0.15), brightness * 0.92, brightness * (1 - warm * 0.18), 1);
  }
  const stars = new Mesh('sky.stars', scene);
  const starData = new VertexData();
  starData.positions = starPositions; starData.colors = starColors;
  starData.indices = starPositions.map((_, index) => index).filter(index => index % 3 === 0).map(index => index / 3);
  starData.applyToMesh(stars);
  const starMaterial = new StandardMaterial('sky.stars', scene);
  starMaterial.disableLighting = true; starMaterial.emissiveColor = Color3.White(); starMaterial.fogEnabled = false;
  starMaterial.pointsCloud = true; starMaterial.pointSize = 1.8;
  stars.material = starMaterial; stars.isPickable = false; stars.infiniteDistance = true; stars.alwaysSelectAsActiveMesh = true;

  const moonTexture = new DynamicTexture('sky.moon', { width: 256, height: 256 }, scene, true);
  const context = moonTexture.getContext();
  const halo = context.createRadialGradient(128, 128, 30, 128, 128, 128);
  halo.addColorStop(0, 'rgba(210,228,255,0.55)'); halo.addColorStop(0.3, 'rgba(150,185,235,0.16)'); halo.addColorStop(1, 'rgba(120,160,220,0)');
  context.fillStyle = halo; context.fillRect(0, 0, 256, 256);
  context.fillStyle = '#eef3ff'; context.beginPath(); context.arc(128, 128, 34, 0, Math.PI * 2); context.fill();
  context.fillStyle = 'rgba(160,175,205,0.5)';
  for (const [x, y, r] of [[118, 118, 8], [140, 134, 6], [126, 142, 4], [142, 114, 5], [112, 136, 3]]) { context.beginPath(); context.arc(x, y, r, 0, Math.PI * 2); context.fill(); }
  moonTexture.hasAlpha = true; moonTexture.update(false);
  const moon = MeshBuilder.CreatePlane('sky.moon', { size: 120 }, scene);
  moon.position.copyFrom(MOON_DIRECTION.scale(340));
  moon.billboardMode = Mesh.BILLBOARDMODE_ALL;
  const moonMaterial = new StandardMaterial('sky.moon', scene);
  moonMaterial.disableLighting = true; moonMaterial.emissiveTexture = moonTexture; moonMaterial.opacityTexture = moonTexture;
  moonMaterial.fogEnabled = false; moonMaterial.disableDepthWrite = true;
  moon.material = moonMaterial; moon.isPickable = false; moon.infiniteDistance = true;

  // Falling lights echo the story's streaks toward town. They are decoration only.
  const streakDot = softDotTexture(scene, 'sky.streak-dot', [150, 240, 255], 32);
  const streakMaterial = spriteMaterial(scene, 'sky.streak', streakDot, 0.9);
  const streaks = [0, 1, 2].map(index => {
    const plane = MeshBuilder.CreatePlane(`sky.streak.${index}`, { width: 46, height: 2.2 }, scene);
    plane.material = streakMaterial; plane.isPickable = false; plane.setEnabled(false);
    return { plane, life: 0, wait: 3 + index * 4.5, from: new Vector3(), to: new Vector3() };
  });

  return {
    update(dt: number, _elapsed: number, reducedMotion: boolean) {
      for (const streak of streaks) {
        if (reducedMotion) { streak.plane.setEnabled(false); streak.life = 0; continue; }
        if (streak.life <= 0) {
          streak.wait -= dt;
          if (streak.wait > 0) continue;
          const angle = random() * Math.PI * 2;
          streak.from.set(Math.cos(angle) * 250, 190 + random() * 60, Math.sin(angle) * 250);
          streak.to.set(streak.from.x - 120 - random() * 60, streak.from.y - 110, streak.from.z + (random() - 0.5) * 120);
          streak.life = 1; streak.wait = 7 + random() * 9;
          streak.plane.setEnabled(true);
        }
        streak.life -= dt / 1.25;
        const t = 1 - Math.max(0, streak.life);
        Vector3.LerpToRef(streak.from, streak.to, t, streak.plane.position);
        streak.plane.lookAt(streak.to);
        streak.plane.rotate(Vector3.Up(), Math.PI / 2);
        streak.plane.visibility = Math.sin(Math.PI * t);
        if (streak.life <= 0) streak.plane.setEnabled(false);
      }
    },
    dispose() { moonTexture.dispose(); farDot.dispose(); streakDot.dispose(); },
  };
}
