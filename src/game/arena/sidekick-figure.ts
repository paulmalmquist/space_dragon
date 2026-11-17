import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math';
import type { Material } from '@babylonjs/core/Materials/material';
import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { SidekickMode } from './arena';

/** What the figure needs each frame. It reads the sidekick's state and never writes it. */
export interface SidekickFrame {
  x: number; z: number; yaw: number;
  /** Ground speed in metres a second, for the walk cycle. */
  speed: number;
  mode: SidekickMode;
}

/**
 * The sidekick as a placeholder: a helmeted adult in plain armour, built from simple rounded
 * parts and posed procedurally. He stands in for Dad in the lab. It is not a likeness of
 * anyone and not an approved suit design; there is no face under the visor.
 */
export function createSidekickFigure(scene: Scene) {
  const root = new TransformNode('sidekick.root', scene);
  const body = new TransformNode('sidekick.body', scene);
  body.parent = root;
  const meshes: AbstractMesh[] = [];
  const pbr = (name: string, color: string, roughness: number, metallic: number) => {
    const value = new PBRMaterial(name, scene);
    value.albedoColor = Color3.FromHexString(color).toLinearSpace();
    value.roughness = roughness; value.metallic = metallic; value.maxSimultaneousLights = 4;
    return value;
  };
  const armor = pbr('sidekick.armor', '#3d5871', 0.38, 0.45);
  const under = pbr('sidekick.undersuit', '#151c25', 0.74, 0.1);
  const visor = pbr('sidekick.visor', '#0b1118', 0.12, 0.6);
  visor.emissiveColor = new Color3(0.14, 0.08, 0.02);
  const glow = new StandardMaterial('sidekick.seam-light', scene);
  glow.disableLighting = true; glow.diffuseColor = Color3.Black(); glow.specularColor = Color3.Black();
  const seamColor = Color3.FromHexString('#ffb347');
  glow.emissiveColor = seamColor.scale(1.3);

  function joint(name: string, x: number, y: number, z: number, parent: TransformNode = body) {
    const node = new TransformNode(`sidekick.${name}`, scene);
    node.parent = parent; node.position.set(x, y, z);
    return node;
  }
  /** Build pieces at their local positions, merge per material, then hang them on a bone. */
  function part(bone: TransformNode, pieces: [Mesh, Material][]) {
    const groups = new Map<Material, Mesh[]>();
    for (const [mesh, material] of pieces) { const list = groups.get(material); if (list) list.push(mesh); else groups.set(material, [mesh]); }
    for (const [material, list] of groups) {
      const merged = list.length > 1 ? Mesh.MergeMeshes(list, true, true) : list[0];
      if (!merged) continue;
      merged.name = `sidekick.mesh.${bone.name}.${material.name}`;
      merged.material = material; merged.parent = bone; merged.isPickable = false; merged.receiveShadows = true;
      meshes.push(merged);
    }
  }
  const capsule = (height: number, top: number, bottom: number, x: number, y: number, z: number) => {
    const mesh = MeshBuilder.CreateCapsule('sidekick.piece', { height, radiusTop: top, radiusBottom: bottom, tessellation: 9, capSubdivisions: 3 }, scene);
    mesh.position.set(x, y, z);
    return mesh;
  };
  const ball = (dx: number, dy: number, dz: number, x: number, y: number, z: number, segments = 7) => {
    const mesh = MeshBuilder.CreateSphere('sidekick.piece', { diameterX: dx, diameterY: dy, diameterZ: dz, segments }, scene);
    mesh.position.set(x, y, z);
    return mesh;
  };
  const slab = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const mesh = MeshBuilder.CreateBox('sidekick.piece', { width: w, height: h, depth: d }, scene);
    mesh.position.set(x, y, z);
    return mesh;
  };
  const band = (diameter: number, thickness: number, x: number, y: number, z: number) => {
    const mesh = MeshBuilder.CreateTorus('sidekick.piece', { diameter, thickness, tessellation: 10 }, scene);
    mesh.position.set(x, y, z);
    return mesh;
  };

  // Skeleton of a grown-up, about 1.85 m to the top of the helmet. Feet rest at the root; +z is forward.
  const hips = joint('hips', 0, 1.02, 0);
  const spine = joint('spine', 0, 0.12, 0, hips);
  const chest = joint('chest', 0, 0.3, 0, spine);
  const head = joint('head', 0, 0.33, 0.01, chest);
  const arms = ([-1, 1] as const).map(side => {
    const shoulder = joint(`shoulder.${side}`, side * 0.27, 0.2, 0, chest);
    const elbow = joint(`elbow.${side}`, 0, -0.33, 0, shoulder);
    return { side, shoulder, elbow };
  });
  const hand = joint('hand.right', 0, -0.33, 0, arms[1].elbow);
  const legs = ([-1, 1] as const).map(side => {
    const hip = joint(`hip.${side}`, side * 0.12, -0.02, 0, hips);
    const knee = joint(`knee.${side}`, 0, -0.49, 0, hip);
    return { side, hip, knee };
  });

  part(hips, [[capsule(0.34, 0.17, 0.16, 0, 0.03, 0), under], [band(0.37, 0.04, 0, 0.12, 0), glow], [slab(0.27, 0.13, 0.24, 0, -0.03, 0.02), armor]]);
  part(spine, [[capsule(0.42, 0.18, 0.16, 0, 0.12, 0), under]]);
  part(chest, [
    [ball(0.54, 0.42, 0.34, 0, 0.08, 0.01), armor], [ball(0.27, 0.21, 0.26, -0.28, 0.2, 0), armor], [ball(0.27, 0.21, 0.26, 0.28, 0.2, 0), armor],
    [slab(0.32, 0.34, 0.15, 0, 0.1, -0.19), under], [capsule(0.13, 0.07, 0.07, 0, 0.29, 0), under],
    [ball(0.13, 0.13, 0.05, 0, 0.11, 0.165, 8), glow], [slab(0.016, 0.22, 0.014, -0.13, 0.07, 0.158), glow], [slab(0.016, 0.22, 0.014, 0.13, 0.07, 0.158), glow],
  ]);
  part(head, [[ball(0.29, 0.31, 0.3, 0, 0.03, 0, 10), armor], [ball(0.23, 0.12, 0.13, 0, 0.03, 0.09, 8), visor], [slab(0.25, 0.05, 0.06, 0, -0.09, 0.08), armor], [band(0.22, 0.03, 0, -0.11, 0), under]]);
  for (const { side, shoulder, elbow } of arms) {
    part(shoulder, [[capsule(0.36, 0.085, 0.072, 0, -0.16, 0), armor], [band(0.16, 0.022, 0, -0.3, 0), glow]]);
    part(elbow, [[capsule(0.34, 0.068, 0.058, 0, -0.15, 0), under], [capsule(0.21, 0.078, 0.07, 0, -0.12, 0), armor], [ball(0.14, 0.15, 0.14, 0, -0.34, 0, 6), armor],
      [slab(0.035, 0.035, 0.06, side * 0.055, -0.22, 0.02), glow]]);
  }
  for (const { hip, knee } of legs) {
    part(hip, [[capsule(0.55, 0.11, 0.085, 0, -0.24, 0), armor], [band(0.2, 0.024, 0, -0.42, 0), glow]]);
    part(knee, [[capsule(0.5, 0.08, 0.064, 0, -0.23, 0), under], [capsule(0.3, 0.09, 0.078, 0, -0.16, 0.006), armor],
      [slab(0.135, 0.11, 0.31, 0, -0.475, 0.06), armor], [slab(0.12, 0.022, 0.28, 0, -0.53, 0.06), glow]]);
  }

  // Animation state: presentation only, safe to discard at any time.
  const POSES = ['ready', 'toss', 'stun', 'rest', 'wait'] as const;
  const weight: Record<(typeof POSES)[number], number> = { ready: 0, toss: 0, stun: 0, rest: 0, wait: 0 };
  let stride = 0, gait = 0, yaw = 0, clock = 0, flash = 0;
  let last: SidekickMode = 'follow';
  const damp = (current: number, target: number, rate: number, dt: number) => current + (target - current) * (1 - Math.exp(-rate * dt));
  const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

  function update(frame: SidekickFrame, dt: number, reducedMotion: boolean, snap = false) {
    clock += dt;
    if (snap) { yaw = frame.yaw; gait = 0; for (const name of POSES) weight[name] = frame.mode === name ? 1 : 0; }
    yaw += wrap(frame.yaw - yaw) * (snap ? 1 : 1 - Math.exp(-16 * dt));
    root.position.set(frame.x, 0, frame.z);
    root.rotation.y = yaw;
    for (const name of POSES) weight[name] = damp(weight[name], frame.mode === name ? 1 : 0, name === 'toss' ? 26 : 12, dt);
    // A throw or a stun lights the suit for a moment.
    if (frame.mode !== last && (frame.mode === 'toss' || frame.mode === 'stun')) flash = 1;
    last = frame.mode;
    flash = Math.max(0, flash - dt * 2.4);
    gait = damp(gait, Math.min(1, frame.speed / 6.5), 12, dt);
    stride += frame.speed * dt / (0.78 + 0.34 * gait) * Math.PI;
    const still = reducedMotion ? 0.35 : 1;
    const s = Math.sin(stride), c = Math.cos(stride);
    const run = gait * still;
    const { ready, toss, stun, rest, wait } = weight;
    const posed = Math.min(1, ready + toss + stun + rest + wait);
    const heave = reducedMotion ? 0 : Math.sin(clock * 5.2) * rest;

    const crouch = ready * 0.16 + rest * 0.1 - toss * 0.05;
    body.position.y = Math.abs(s) * 0.05 * run - crouch + (reducedMotion ? 0 : Math.sin(clock * 1.5) * 0.005 * (1 - gait)) + heave * 0.012;
    body.rotation.set(run * 0.2 + ready * 0.16 + rest * 0.44 - toss * 0.2 + heave * 0.03, stun * -0.3, 0);
    for (const { side, hip, knee } of legs) {
      const lift = Math.max(0, side * c);
      hip.rotation.x = -side * s * (0.5 + 0.4 * gait) * run * (1 - posed) - crouch * 2.2 - rest * 0.35 + toss * 0.1;
      hip.rotation.z = side * (0.03 + ready * 0.12 + rest * 0.1);
      knee.rotation.x = lift * (0.5 + 0.7 * gait) * run * (1 - posed) + crouch * 4.2 + rest * 0.2 + 0.04;
    }
    for (const { side, shoulder, elbow } of arms) {
      const right = side > 0;
      const pump = side * s * (0.45 + 0.5 * gait) * run * (1 - posed);
      // Cupped hands low and together; arms flung overhead; one arm straight out; hands on knees; arms folded.
      shoulder.rotation.x = pump + ready * -0.62 + toss * -2.85 + stun * (right ? -1.5 : 0.25) + rest * -0.5 + wait * -0.55;
      shoulder.rotation.z = side * (0.1 - ready * 0.36 - toss * 0.12 + stun * (right ? -0.08 : 0.12) + rest * 0.02 - wait * 0.5);
      elbow.rotation.x = -(0.2 + gait * 0.9) * (1 - posed) + ready * -1.05 + toss * -0.12 + stun * (right ? -0.04 : -0.5) + rest * -0.12 + wait * -1.9;
    }
    head.rotation.x = ready * -0.2 + rest * -0.3 + toss * -0.45;
    head.rotation.y = reducedMotion ? 0 : wait * Math.sin(clock * 0.7) * 0.5;
    chest.rotation.y = s * 0.08 * run * (1 - posed) + stun * 0.3;
    glow.emissiveColor.copyFrom(seamColor).scaleInPlace(1.1 + (reducedMotion ? 0 : Math.sin(clock * 1.9) * 0.15) + ready * (reducedMotion ? 0.5 : 0.5 + Math.sin(clock * 7) * 0.35) + flash * 2.2);
  }

  return {
    root, meshes,
    /** Solid parts only: thin light strips add shadow passes without a visible shadow. */
    shadowCasters: () => meshes.filter(mesh => mesh.material === armor || mesh.material === under),
    /** World position of the right hand, where a stun leaves the suit. */
    handPosition: () => { hand.computeWorldMatrix(true); return hand.getAbsolutePosition(); },
    setEnabled: (enabled: boolean) => root.setEnabled(enabled),
    update,
    snapshot: () => ({ gait, pose: POSES.reduce<SidekickMode>((best, name) => weight[name] > 0.5 ? name : best, 'follow'), flash }),
  };
}
export type SidekickFigure = ReturnType<typeof createSidekickFigure>;
