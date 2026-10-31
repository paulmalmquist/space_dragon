import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math';
import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { PlayerPosition } from './navigation';

/** Original articulated proxy. It represents a player, not an approved family likeness. */
export function createPlayerAvatar(scene: Scene) {
  const root = new TransformNode('player.original-proxy', scene);
  const body = new TransformNode('player.body', scene);
  body.parent = root;
  const meshes: AbstractMesh[] = [];
  const material = (name: string, color: string, glow = false) => {
    const value = new StandardMaterial(name, scene);
    value.diffuseColor = Color3.FromHexString(color);
    value.specularColor = new Color3(0.3, 0.35, 0.4);
    if (glow) value.emissiveColor = value.diffuseColor.scale(0.45);
    return value;
  };
  const suit = material('player.proxy.suit', '#a4b6b5');
  const joints = material('player.proxy.joints', '#263b4b');
  const face = material('player.proxy.face', '#d6bba0');
  const hair = material('player.proxy.hair', '#4d4540');
  const accent = material('player.proxy.trim', '#6de0de', true);
  const eyes = material('player.proxy.eyes', '#16232f');
  function box(name: string, width: number, height: number, depth: number, x: number, y: number, z: number, mat: StandardMaterial, parent = body) {
    const mesh = MeshBuilder.CreateBox(`player.${name}`, { width, height, depth }, scene);
    mesh.parent = parent;
    mesh.position.set(x, y, z);
    mesh.material = mat;
    mesh.isPickable = false;
    meshes.push(mesh);
    return mesh;
  }
  function joint(name: string, x: number, y: number, z: number, parent = body) {
    const node = new TransformNode(`player.${name}`, scene);
    node.parent = parent;
    node.position.set(x, y, z);
    return node;
  }
  box('pelvis', 0.38, 0.21, 0.25, 0, 0.79, 0, joints);
  box('torso', 0.48, 0.43, 0.28, 0, 1.1, 0, suit);
  box('chest-panel', 0.25, 0.19, 0.035, 0, 1.16, 0.153, joints);
  box('chest-light', 0.13, 0.035, 0.04, 0, 1.18, 0.18, accent);
  box('backpack', 0.27, 0.3, 0.14, 0, 1.12, -0.2, joints);
  box('backpack-light', 0.04, 0.17, 0.025, 0, 1.14, -0.28, accent);
  box('neck', 0.13, 0.13, 0.13, 0, 1.37, 0, joints);
  const head = MeshBuilder.CreateSphere('player.head', { diameter: 0.35, segments: 12 }, scene);
  head.parent = body;
  head.position.set(0, 1.56, 0.01);
  head.scaling.set(0.9, 1.06, 0.91);
  head.material = face;
  head.isPickable = false;
  meshes.push(head);
  box('hair', 0.3, 0.1, 0.26, 0, 1.71, -0.015, hair);
  for (const x of [-0.062, 0.062]) box(`eye.${x}`, 0.035, 0.043, 0.02, x, 1.58, 0.16, eyes);
  box('nose', 0.045, 0.055, 0.045, 0, 1.52, 0.177, face);
  const leftArm = joint('arm.left', -0.31, 1.27, 0);
  const rightArm = joint('arm.right', 0.31, 1.27, 0);
  const leftElbow = joint('elbow.left', 0, -0.28, 0, leftArm);
  const rightElbow = joint('elbow.right', 0, -0.28, 0, rightArm);
  for (const [name, arm, elbow] of [['left', leftArm, leftElbow], ['right', rightArm, rightElbow]] as const) {
    box(`upper-arm.${name}`, 0.16, 0.27, 0.19, 0, -0.13, 0, suit, arm);
    box(`forearm.${name}`, 0.14, 0.25, 0.17, 0, -0.13, 0, joints, elbow);
    box(`glove.${name}`, 0.15, 0.13, 0.17, 0, -0.29, 0, suit, elbow);
  }
  const leftLeg = joint('leg.left', -0.115, 0.75, 0);
  const rightLeg = joint('leg.right', 0.115, 0.75, 0);
  const leftKnee = joint('knee.left', 0, -0.33, 0, leftLeg);
  const rightKnee = joint('knee.right', 0, -0.33, 0, rightLeg);
  for (const [name, leg, knee] of [['left', leftLeg, leftKnee], ['right', rightLeg, rightKnee]] as const) {
    box(`thigh.${name}`, 0.18, 0.33, 0.2, 0, -0.16, 0, suit, leg);
    box(`shin.${name}`, 0.15, 0.3, 0.17, 0, -0.15, 0, suit, knee);
    box(`boot.${name}`, 0.19, 0.13, 0.32, 0, -0.31, 0.06, joints, knee);
  }
  let walkTime = 0;
  let gait = 0;
  let currentYaw = 0;
  return {
    root,
    meshes,
    setEnabled: (enabled: boolean) => root.setEnabled(enabled),
    update(position: PlayerPosition, speed: number, delta: number, reducedMotion: boolean, snap = false) {
      const easing = 1 - Math.exp(-delta * 14);
      const yawDelta = Math.atan2(Math.sin(position.yaw - currentYaw), Math.cos(position.yaw - currentYaw));
      currentYaw = snap ? position.yaw : currentYaw + yawDelta * easing;
      root.position.set(position.x, position.x < -0.5 ? 0.035 : -0.145, position.z);
      root.rotation.y = currentYaw;
      gait += ((speed > 0.05 ? 1 : 0) - gait) * easing;
      walkTime += delta * Math.max(speed, 1) * 3.1;
      const swing = Math.sin(walkTime) * 0.56 * gait;
      leftLeg.rotation.x = swing;
      rightLeg.rotation.x = -swing;
      leftKnee.rotation.x = Math.max(0, -Math.sin(walkTime)) * 0.65 * gait;
      rightKnee.rotation.x = Math.max(0, Math.sin(walkTime)) * 0.65 * gait;
      leftArm.rotation.x = -swing * 0.85;
      rightArm.rotation.x = swing * 0.85;
      leftArm.rotation.z = -0.07;
      rightArm.rotation.z = 0.07;
      leftElbow.rotation.x = rightElbow.rotation.x = -0.13 - gait * 0.12;
      body.position.y = reducedMotion ? 0 : Math.abs(Math.sin(walkTime)) * 0.025 * gait;
      body.rotation.z = reducedMotion ? 0 : Math.sin(walkTime) * 0.025 * gait;
    },
  };
}
