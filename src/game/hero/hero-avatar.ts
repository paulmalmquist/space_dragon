import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math';
import type { Material } from '@babylonjs/core/Materials/material';
import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { HERO_EVENT } from '../traversal/hero';
import type { HeroState } from '../traversal/hero';
import { TUNING } from '../traversal/tuning';

/** What the avatar needs each frame; it reads the authoritative hero and never writes it. */
export interface AvatarFrame {
  hero: HeroState;
  /** Interpolated feet position for smooth rendering between fixed steps. */
  x: number; y: number; z: number;
  events: number;
  /** World position of the tether anchor while swinging. */
  anchor: { x: number; y: number; z: number } | null;
  /** 0 to 1: reeling after a bonk. Optional stances are honoured by the realistic stand-in only. */
  dizzy?: number;
  /** 0 to 1: lifted off the ground and held still. */
  lifted?: number;
  /** A point the right hand reaches toward, such as a snared robot. */
  reach?: { x: number; y: number; z: number } | null;
}

/**
 * Original practice-suit pilot built from simple rounded parts and animated procedurally.
 * It is a helmeted proxy, not a family likeness or an approved suit design.
 */
export function createHeroAvatar(scene: Scene) {
  const root = new TransformNode('hero.root', scene);
  const body = new TransformNode('hero.body', scene);
  body.parent = root;
  const meshes: AbstractMesh[] = [];
  const pbr = (name: string, color: string, roughness: number, metallic: number) => {
    const value = new PBRMaterial(name, scene);
    value.albedoColor = Color3.FromHexString(color).toLinearSpace();
    value.roughness = roughness; value.metallic = metallic; value.maxSimultaneousLights = 4;
    return value;
  };
  const armor = pbr('hero.armor', '#dfe6ea', 0.34, 0.35);
  const under = pbr('hero.undersuit', '#1d2a36', 0.72, 0.1);
  const visor = pbr('hero.visor', '#0c1b24', 0.12, 0.6);
  visor.emissiveColor = new Color3(0.02, 0.1, 0.13);
  const glow = new StandardMaterial('hero.seam-light', scene);
  glow.disableLighting = true; glow.diffuseColor = Color3.Black(); glow.specularColor = Color3.Black();
  const seamColor = Color3.FromHexString('#6de8f2');
  glow.emissiveColor = seamColor.scale(1.4);
  const thrust = new StandardMaterial('hero.thruster', scene);
  thrust.disableLighting = true; thrust.diffuseColor = Color3.Black(); thrust.specularColor = Color3.Black();
  thrust.emissiveColor = seamColor.scale(0.5);

  function joint(name: string, x: number, y: number, z: number, parent: TransformNode = body) {
    const node = new TransformNode(`hero.${name}`, scene);
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
      merged.name = `hero.mesh.${bone.name}.${material.name}`;
      merged.material = material; merged.parent = bone; merged.isPickable = false;
      meshes.push(merged);
    }
  }
  const capsule = (height: number, top: number, bottom: number, x: number, y: number, z: number) => {
    const mesh = MeshBuilder.CreateCapsule('hero.piece', { height, radiusTop: top, radiusBottom: bottom, tessellation: 9, capSubdivisions: 3 }, scene);
    mesh.position.set(x, y, z);
    return mesh;
  };
  const ball = (dx: number, dy: number, dz: number, x: number, y: number, z: number, segments = 7) => {
    const mesh = MeshBuilder.CreateSphere('hero.piece', { diameterX: dx, diameterY: dy, diameterZ: dz, segments }, scene);
    mesh.position.set(x, y, z);
    return mesh;
  };
  const slab = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const mesh = MeshBuilder.CreateBox('hero.piece', { width: w, height: h, depth: d }, scene);
    mesh.position.set(x, y, z);
    return mesh;
  };
  const band = (diameter: number, thickness: number, x: number, y: number, z: number) => {
    const mesh = MeshBuilder.CreateTorus('hero.piece', { diameter, thickness, tessellation: 10 }, scene);
    mesh.position.set(x, y, z);
    return mesh;
  };

  // Skeleton. Feet rest at the root; +z is forward.
  const hips = joint('hips', 0, 0.94, 0);
  const spine = joint('spine', 0, 0.1, 0, hips);
  const chest = joint('chest', 0, 0.26, 0, spine);
  const head = joint('head', 0, 0.3, 0.01, chest);
  const arms = ([-1, 1] as const).map(side => {
    const shoulder = joint(`shoulder.${side}`, side * 0.215, 0.2, 0, chest);
    const elbow = joint(`elbow.${side}`, 0, -0.29, 0, shoulder);
    return { side, shoulder, elbow };
  });
  const hand = joint('hand.right', 0, -0.3, 0, arms[1].elbow);
  const legs = ([-1, 1] as const).map(side => {
    const hip = joint(`hip.${side}`, side * 0.1, -0.02, 0, hips);
    const knee = joint(`knee.${side}`, 0, -0.45, 0, hip);
    return { side, hip, knee };
  });

  part(hips, [[capsule(0.3, 0.14, 0.13, 0, 0.02, 0), under], [band(0.3, 0.035, 0, 0.1, 0), glow], [slab(0.2, 0.11, 0.2, 0, -0.03, 0.02), armor]]);
  part(spine, [[capsule(0.36, 0.15, 0.13, 0, 0.1, 0), under]]);
  const diamond = MeshBuilder.CreatePolyhedron('hero.piece', { type: 1, size: 0.04 }, scene);
  diamond.position.set(0, 0.1, 0.152); diamond.scaling.set(1, 1.25, 0.35);
  part(chest, [
    [ball(0.42, 0.36, 0.28, 0, 0.08, 0.01), armor], [ball(0.2, 0.17, 0.2, -0.22, 0.2, 0), armor], [ball(0.2, 0.17, 0.2, 0.22, 0.2, 0), armor],
    [slab(0.25, 0.3, 0.13, 0, 0.1, -0.16), under], [slab(0.19, 0.06, 0.05, 0, 0.24, -0.2), armor],
    [capsule(0.12, 0.06, 0.06, 0, 0.27, 0), under], [diamond, glow], [slab(0.012, 0.19, 0.012, -0.1, 0.07, 0.137), glow], [slab(0.012, 0.19, 0.012, 0.1, 0.07, 0.137), glow],
  ]);
  const nozzles = ([-1, 1] as const).map(side => {
    const nozzle = MeshBuilder.CreateCylinder(`hero.nozzle.${side}`, { height: 0.09, diameterTop: 0.075, diameterBottom: 0.05, tessellation: 10 }, scene);
    nozzle.parent = chest; nozzle.position.set(side * 0.07, -0.05, -0.2); nozzle.material = thrust; nozzle.isPickable = false;
    meshes.push(nozzle);
    return nozzle;
  });
  const visorMesh = ball(0.21, 0.13, 0.12, 0, 0.02, 0.085, 8);
  part(head, [[ball(0.27, 0.29, 0.28, 0, 0.02, 0, 10), armor], [visorMesh, visor], [slab(0.012, 0.012, 0.2, 0, 0.165, -0.01), glow], [band(0.2, 0.03, 0, -0.1, 0), under]]);
  for (const { side, shoulder, elbow } of arms) {
    part(shoulder, [[capsule(0.32, 0.068, 0.058, 0, -0.14, 0), armor], [band(0.13, 0.02, 0, -0.26, 0), glow]]);
    part(elbow, [[capsule(0.3, 0.056, 0.048, 0, -0.13, 0), under], [capsule(0.17, 0.062, 0.058, 0, -0.1, 0), armor], [ball(0.11, 0.12, 0.11, 0, -0.3, 0, 6), armor],
      [slab(0.03, 0.03, 0.05, side * 0.045, -0.2, 0.02), glow]]);
  }
  for (const { hip, knee } of legs) {
    part(hip, [[capsule(0.5, 0.09, 0.07, 0, -0.22, 0), armor], [band(0.17, 0.022, 0, -0.38, 0), glow]]);
    part(knee, [[capsule(0.46, 0.068, 0.054, 0, -0.21, 0), under], [capsule(0.26, 0.074, 0.066, 0, -0.14, 0.006), armor],
      [slab(0.115, 0.1, 0.27, 0, -0.44, 0.055), armor], [slab(0.1, 0.02, 0.24, 0, -0.495, 0.055), glow]]);
  }

  // Animation state: everything below is presentation and may be discarded at any time.
  let stride = 0;
  let gait = 0;
  let yaw = 0;
  let lean = 0;
  let roll = 0;
  let squash = 0;
  let flare = 0;
  let swing = 0;
  let airborne = 0;
  let tumble = 0;
  let breath = 0;
  let lastYaw = 0;
  const damp = (current: number, target: number, rate: number, dt: number) => current + (target - current) * (1 - Math.exp(-rate * dt));
  const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

  function update(frame: AvatarFrame, dt: number, reducedMotion: boolean, snap = false) {
    const { hero } = frame;
    const speed = Math.hypot(hero.vx, hero.vz);
    const grounded = hero.mode === 'ground';
    if (snap) { yaw = lastYaw = hero.yaw; gait = lean = roll = squash = flare = swing = airborne = tumble = 0; }
    const turn = dt > 0 ? wrap(hero.yaw - lastYaw) / dt : 0;
    lastYaw = hero.yaw;
    yaw += wrap(hero.yaw - yaw) * (snap ? 1 : 1 - Math.exp(-18 * dt));
    root.position.set(frame.x, frame.y, frame.z);
    root.rotation.y = yaw;
    if (frame.events & HERO_EVENT.land) squash = Math.min(1, 0.35 + hero.impact / 22);
    if (frame.events & (HERO_EVENT.hop | HERO_EVENT.bounce | HERO_EVENT.jump | HERO_EVENT.release)) flare = frame.events & HERO_EVENT.jump ? 0.45 : 1;
    squash = Math.max(0, squash - dt * 4.2);
    flare = Math.max(0, flare - dt * 2.6);
    gait = damp(gait, grounded ? Math.min(1, speed / TUNING.sprintSpeed) : 0, 12, dt);
    swing = damp(swing, hero.mode === 'swing' ? 1 : 0, 10, dt);
    airborne = damp(airborne, hero.mode === 'air' ? 1 : 0, 14, dt);
    tumble = hero.mode === 'catch' ? tumble + dt * 9 : damp(tumble, 0, 12, dt);
    breath += dt;
    if (grounded) stride += speed * dt / (0.62 + 0.36 * gait) * Math.PI;
    const still = reducedMotion ? 0.35 : 1;
    const s = Math.sin(stride);
    const c = Math.cos(stride);
    const run = gait * still;

    // Whole-body attitude: lean into speed and turns, follow the rope while swinging.
    let pitch = run * 0.26;
    let bank = Math.max(-0.35, Math.min(0.35, -turn * 0.035)) * (grounded ? gait : 0.4);
    if (frame.anchor && swing > 0.01) {
      const dx = frame.anchor.x - frame.x;
      const dy = frame.anchor.y - (frame.y + TUNING.handHeight);
      const dz = frame.anchor.z - frame.z;
      const forward = dx * Math.sin(yaw) + dz * Math.cos(yaw);
      const side = dx * Math.cos(yaw) - dz * Math.sin(yaw);
      const up = Math.max(0.5, dy);
      pitch += (Math.atan2(forward, up) * 0.7 - pitch) * swing;
      bank += (-Math.atan2(side, up) * 0.6 - bank) * swing;
    }
    if (airborne > 0.01) pitch += airborne * Math.max(-0.3, Math.min(0.35, -hero.vy * 0.018 + speed * 0.012));
    lean = damp(lean, pitch, 10, dt);
    roll = damp(roll, bank, 9, dt);
    body.rotation.set(reducedMotion ? lean * 0.5 : lean, hero.mode === 'catch' ? tumble : 0, reducedMotion ? 0 : roll);
    const crouch = Math.sin(Math.min(1, squash) * Math.PI) * 0.16 * still;
    const stretch = flare * 0.06 * still;
    body.scaling.set(1 + crouch * 0.35 - stretch * 0.4, 1 - crouch + stretch, 1 + crouch * 0.35 - stretch * 0.4);
    body.position.y = (Math.abs(s) * 0.045 * run) + Math.sin(breath * 1.6) * 0.004 * (1 - gait);

    // Legs: a run cycle on the ground, a tuck in the air, trailing while swinging.
    const tuck = airborne * (hero.vy > 0 ? 0.9 : 0.45) + swing * 0.55;
    for (const { side, hip, knee } of legs) {
      const phase = side * s;
      const lift = Math.max(0, side * c);
      const stridePitch = -phase * (0.55 + 0.45 * gait) * run;
      const airPitch = -(side > 0 ? 0.75 : 0.25) * tuck + swing * 0.5;
      hip.rotation.x = stridePitch * (1 - Math.min(1, airborne + swing)) + airPitch - crouch * 1.5;
      hip.rotation.z = side * 0.03;
      knee.rotation.x = lift * (0.55 + 0.75 * gait) * run * (1 - Math.min(1, airborne + swing)) + (side > 0 ? 1.15 : 0.6) * tuck + crouch * 3 + 0.04;
    }
    // Arms: pump opposite the legs, reach up the rope, spread for balance when falling.
    for (const { side, shoulder, elbow } of arms) {
      const pump = side * s * (0.5 + 0.55 * gait) * run;
      const fall = airborne * (hero.vy > 0 ? -0.5 : -1.25);
      const reach = side > 0 ? -2.85 * swing : 0.5 * swing;
      shoulder.rotation.x = pump * (1 - swing) * (1 - airborne) + fall * 0.55 + reach;
      shoulder.rotation.z = side * (0.09 + airborne * (hero.vy > 0 ? 0.25 : 0.95) + (side > 0 ? 0 : swing * 0.35));
      elbow.rotation.x = -(0.22 + gait * 1.15 * (1 - swing)) * (1 - airborne * 0.6) - (side > 0 ? 0 : swing * 0.9) - Math.sin(breath * 1.6 + side) * 0.02;
    }
    head.rotation.x = -lean * 0.45 + crouch * 0.3;
    head.rotation.y = Math.max(-0.4, Math.min(0.4, turn * 0.04));
    chest.rotation.y = s * 0.1 * run;
    spine.rotation.x = crouch * 0.6;

    // Seam light breathes slowly; thrusters flare on hops and boosts.
    const pulse = 1.15 + Math.sin(breath * 1.9) * 0.2 + flare * 0.9 + swing * 0.3;
    glow.emissiveColor.copyFrom(seamColor).scaleInPlace(pulse);
    thrust.emissiveColor.copyFrom(seamColor).scaleInPlace(0.4 + flare * 3 + (hero.powerHeld && grounded ? gait * 1.6 : 0));
    for (const nozzle of nozzles) nozzle.scaling.y = 1 + flare * 1.6;
  }

  return {
    root, meshes,
    /** Solid suit parts only: thin light strips add shadow passes without a visible shadow. */
    shadowCasters: () => meshes.filter(mesh => mesh.material === armor || mesh.material === under),
    /** World position of the right hand, where the tether leaves the suit. */
    handPosition: () => { hand.computeWorldMatrix(true); return hand.getAbsolutePosition(); },
    setEnabled: (enabled: boolean) => root.setEnabled(enabled),
    update,
    snapshot: () => ({ gait, swing, airborne, squash }),
  };
}
export type HeroAvatar = ReturnType<typeof createHeroAvatar>;
