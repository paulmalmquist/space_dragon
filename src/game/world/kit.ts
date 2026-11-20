import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Vector3, Vector4, Color3, Color4 } from '@babylonjs/core/Maths/math';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Material } from '@babylonjs/core/Materials/material';
import type { Scene } from '@babylonjs/core/scene';

/**
 * Small construction kit for the practice block. Static pieces are collected per
 * material and group, then merged so the scene stays a handful of draw calls.
 */
export type Group = 'world' | 'home-lower' | 'home-upper';
interface Entry { mesh: Mesh; material: Material; group: Group; shadow: boolean; }

export function createKit(scene: Scene) {
  const entries: Entry[] = [];
  let serial = 0;
  const add = (mesh: Mesh, material: Material, group: Group = 'world', shadow = true) => {
    mesh.material = material;
    entries.push({ mesh, material, group, shadow });
    return mesh;
  };
  /** Box with world-scale UVs: one texture repeat every `tile` metres on every face. */
  function box(size: [number, number, number], center: [number, number, number], material: Material, group: Group = 'world', tile = 2, shadow = true) {
    const [w, h, d] = size;
    const side = new Vector4(0, 0, d / tile, h / tile);
    const front = new Vector4(0, 0, w / tile, h / tile);
    const top = new Vector4(0, 0, w / tile, d / tile);
    const mesh = MeshBuilder.CreateBox(`kit.box.${serial++}`, { width: w, height: h, depth: d, faceUV: [front, front, side, side, top, top], wrap: true }, scene);
    mesh.position.set(center[0], center[1], center[2]);
    return add(mesh, material, group, shadow);
  }
  /** Box given by its extents, the form the collision data uses. */
  function extent(minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number, material: Material, group: Group = 'world', tile = 2, shadow = true) {
    return box([maxX - minX, maxY - minY, maxZ - minZ], [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2], material, group, tile, shadow);
  }
  function cylinder(height: number, top: number, bottom: number, center: [number, number, number], material: Material, group: Group = 'world', tessellation = 10, shadow = true) {
    const mesh = MeshBuilder.CreateCylinder(`kit.cylinder.${serial++}`, { height, diameterTop: top, diameterBottom: bottom, tessellation }, scene);
    mesh.position.set(center[0], center[1], center[2]);
    return add(mesh, material, group, shadow);
  }
  function sphere(diameter: [number, number, number], center: [number, number, number], material: Material, group: Group = 'world', segments = 8, shadow = true) {
    const mesh = MeshBuilder.CreateSphere(`kit.sphere.${serial++}`, { diameterX: diameter[0], diameterY: diameter[1], diameterZ: diameter[2], segments }, scene);
    mesh.position.set(center[0], center[1], center[2]);
    return add(mesh, material, group, shadow);
  }
  /** Flat polygon from points in order, lit from both sides; used for gable ends. */
  function polygon(points: Vector3[], material: Material, group: Group = 'world', tile = 2) {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const origin = points[0];
    const u = points[1].subtract(origin).normalize();
    const normal = Vector3.Cross(u, points[2].subtract(origin)).normalize();
    const v = Vector3.Cross(normal, u);
    for (const point of points) {
      positions.push(point.x, point.y, point.z);
      const local = point.subtract(origin);
      uvs.push(Vector3.Dot(local, u) / tile, Vector3.Dot(local, v) / tile);
    }
    for (let index = 1; index < points.length - 1; index++) indices.push(0, index, index + 1, 0, index + 1, index);
    const normals: number[] = [];
    VertexData.ComputeNormals(positions, indices, normals);
    const data = new VertexData();
    data.positions = positions; data.indices = indices; data.normals = normals; data.uvs = uvs;
    const mesh = new Mesh(`kit.polygon.${serial++}`, scene);
    data.applyToMesh(mesh);
    return add(mesh, material, group, true);
  }
  /**
   * Merge everything added so far: one mesh per material and group. A merged mesh casts
   * shadows when most of its pieces asked to, so thin trim and lights stay out of the shadow pass.
   */
  function finish() {
    const merged: Record<Group, Mesh[]> = { world: [], 'home-lower': [], 'home-upper': [] };
    const casters: Mesh[] = [];
    const keys = new Map<string, Entry[]>();
    for (const entry of entries) {
      const key = `${entry.group}|${entry.material.uniqueId}`;
      const list = keys.get(key);
      if (list) list.push(entry); else keys.set(key, [entry]);
    }
    for (const [key, list] of keys) {
      const { group, material } = list[0];
      const mesh = list.length > 1 ? Mesh.MergeMeshes(list.map(entry => entry.mesh), true, true) : list[0].mesh;
      if (!mesh) continue;
      mesh.name = `block.${group}.${material.name}.${key}`;
      mesh.material = material;
      mesh.receiveShadows = true;
      mesh.isPickable = false;
      mesh.freezeWorldMatrix();
      merged[group].push(mesh);
      if (list.filter(entry => entry.shadow).length * 2 > list.length) casters.push(mesh);
    }
    entries.length = 0;
    return { merged, casters };
  }
  return { add, box, extent, cylinder, sphere, polygon, finish };
}
export type Kit = ReturnType<typeof createKit>;

/** Unlit emissive material for lights, glows and sky elements. Fog can be turned off for beacons. */
export function glowMaterial(scene: Scene, name: string, color: string, intensity = 1, options: { fog?: boolean; alpha?: number; additive?: boolean } = {}) {
  const material = new StandardMaterial(name, scene);
  material.disableLighting = true;
  material.emissiveColor = Color3.FromHexString(color).scale(intensity);
  material.diffuseColor = Color3.Black();
  material.specularColor = Color3.Black();
  material.fogEnabled = options.fog ?? true;
  if (options.alpha !== undefined) material.alpha = options.alpha;
  if (options.additive) { material.alphaMode = 1; material.disableDepthWrite = true; material.backFaceCulling = false; } // Engine.ALPHA_ADD
  return material;
}

/**
 * Soft round sprite drawn at runtime; no image asset is needed. The tint lives in the
 * texture because a standard material adds, rather than multiplies, its emissive texture.
 */
export function softDotTexture(scene: Scene, name: string, rgb: [number, number, number] = [255, 255, 255], size = 64) {
  const texture = new DynamicTexture(name, { width: size, height: size }, scene, false);
  const context = texture.getContext();
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  const tint = (alpha: number) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
  gradient.addColorStop(0, tint(1));
  gradient.addColorStop(0.3, tint(0.5));
  gradient.addColorStop(0.65, tint(0.14));
  gradient.addColorStop(1, tint(0));
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  texture.hasAlpha = true;
  texture.update(false);
  return texture;
}

/** Additive sprite material: light that never darkens what is behind it. */
export function spriteMaterial(scene: Scene, name: string, texture: DynamicTexture, level = 1, fog = false) {
  const material = new StandardMaterial(name, scene);
  material.disableLighting = true;
  material.diffuseColor = Color3.Black(); material.specularColor = Color3.Black(); material.emissiveColor = Color3.Black();
  material.emissiveTexture = texture; material.opacityTexture = texture;
  texture.level = level;
  material.alphaMode = 1; // Engine.ALPHA_ADD
  material.disableDepthWrite = true; material.backFaceCulling = false; material.fogEnabled = fog;
  return material;
}

export function color4(hex: string, alpha = 1) { const c = Color3.FromHexString(hex); return new Color4(c.r, c.g, c.b, alpha); }
