import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import { registerBuiltInLoaders } from '@babylonjs/loaders/dynamic';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math';
import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { HERO_EVENT } from '../traversal/hero';
import { TUNING } from '../traversal/tuning';
import type { AvatarFrame } from './hero-avatar';
import {
  GRIP_BONE, HEAD_BONE, LAND_LEG_BONES, LOCOMOTION, MOTION, POSES, TETHER_ARMS,
  climbReach, crouchDrop, locomotionWeights, strideCyclesPerSecond,
} from './person-motion';

interface Clip { frames: number; rotations: (Float32Array | undefined)[]; height: Float32Array | null; }

const damp = (current: number, target: number, rate: number, dt: number) => current + (target - current) * (1 - Math.exp(-rate * dt));
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

/**
 * A realistic child stand-in for the hero: a generic licensed Rocketbox model (see
 * public/assets/playground/hero/PROVENANCE.json), never a family likeness. Authored idle,
 * walk, run and sprint loops are blended by ground speed; jumping, falling, swinging and
 * landing are procedural poses layered on top. It reads the authoritative hero and never
 * writes it.
 */
export async function loadPersonAvatar(scene: Scene) {
  registerBuiltInLoaders();
  const url = new URL(`${import.meta.env.BASE_URL}assets/playground/hero/playground-kid.gltf`, window.location.href).href;
  const container = await LoadAssetContainerAsync(url, scene);
  if (scene.isDisposed) { container.dispose(); throw new Error('Scene closed during hero load.'); }
  container.addAllToScene();

  const root = new TransformNode('person.root', scene);
  const body = new TransformNode('person.body', scene);
  body.parent = root;
  const imported = container.meshes.find(mesh => !mesh.parent);
  if (!imported) { container.dispose(); throw new Error('Hero export has no root.'); }
  imported.parent = body;
  const named = new Map<string, TransformNode>();
  for (const node of [...container.transformNodes, ...container.meshes]) if (!named.has(node.name)) named.set(node.name, node);
  const need = (name: string) => {
    const node = named.get(name);
    if (!node) throw new Error(`Hero rig is missing ${name}`);
    if (!node.rotationQuaternion) node.rotationQuaternion = Quaternion.FromEulerVector(node.rotation);
    return node;
  };

  // Read the authored loops once, then let this module own the skeleton every frame.
  const bones: TransformNode[] = [];
  const boneIndex = new Map<TransformNode, number>();
  let hips: TransformNode | null = null;
  const clips: Clip[] = LOCOMOTION.map(spec => {
    const group = container.animationGroups.find(candidate => candidate.name === spec.id);
    if (!group) throw new Error(`Hero export is missing the ${spec.id} loop`);
    const clip: Clip = { frames: 0, rotations: [], height: null };
    for (const item of group.targetedAnimations) {
      const keys = item.animation.getKeys();
      const target = item.target as TransformNode;
      clip.frames = keys.length;
      if (item.animation.targetProperty === 'rotationQuaternion') {
        let index = boneIndex.get(target);
        if (index === undefined) { index = bones.length; bones.push(target); boneIndex.set(target, index); }
        const values = new Float32Array(keys.length * 4);
        keys.forEach((key, frame) => { const q = key.value as Quaternion; values.set([q.x, q.y, q.z, q.w], frame * 4); });
        clip.rotations[index] = values;
      } else if (item.animation.targetProperty === 'position') {
        hips = target;
        clip.height = Float32Array.from(keys, key => (key.value as Vector3).y);
      }
    }
    return clip;
  });
  for (const group of [...container.animationGroups]) group.dispose();
  if (!hips || bones.length < 40) throw new Error('Hero export has no usable skeleton animation.');
  const hipNode: TransformNode = hips;
  const restHips = hipNode.position.clone();
  for (const bone of bones) if (!bone.rotationQuaternion) bone.rotationQuaternion = Quaternion.FromEulerVector(bone.rotation);

  // Parent-first order lets one pass refresh every world matrix after the pose changes.
  const ordered: TransformNode[] = [];
  const subtree = new Map<TransformNode, TransformNode[]>();
  const walk = (node: TransformNode): TransformNode[] => {
    ordered.push(node);
    const list = [node];
    for (const child of node.getChildTransformNodes(true)) list.push(...walk(child));
    subtree.set(node, list);
    return list;
  };
  walk(imported);
  const refresh = (nodes: readonly TransformNode[]) => { for (const node of nodes) node.computeWorldMatrix(true); };

  const meshes: AbstractMesh[] = container.meshes.filter(mesh => mesh.getTotalVertices() > 0);
  for (const mesh of meshes) {
    mesh.alwaysSelectAsActiveMesh = true; // Skinned bounds do not follow the pose.
    mesh.isPickable = false;
    mesh.receiveShadows = true;
    const material = mesh.material as PBRMaterial | null;
    if (material) material.maxSimultaneousLights = 4;
  }
  const morphs = (suffix: string) => meshes.flatMap(mesh => {
    const manager = mesh.morphTargetManager;
    if (!manager) return [];
    return Array.from({ length: manager.numTargets }, (_, index) => manager.getTarget(index)).filter(target => target.name.endsWith(suffix));
  });
  const face = {
    blink: [...morphs('EyeBlinkLeft'), ...morphs('EyeBlinkRight')],
    wide: [...morphs('EyeWideLeft'), ...morphs('EyeWideRight')],
    smile: [...morphs('MouthSmileLeft'), ...morphs('MouthSmileRight')],
    jaw: morphs('JawOpen'),
    brow: morphs('BrowInnerUp'),
  };
  const poses = POSES.map(pose => ({ id: pose.id, turns: pose.turns.map(item => ({ ...item, node: need(item.bone), leg: LAND_LEG_BONES.includes(item.bone) })) }));
  const arms = TETHER_ARMS.map(item => ({ node: need(item.bone), tip: need(item.tip), weight: item.weight }));
  const grip = need(GRIP_BONE);
  const head = need(HEAD_BONE);

  const parentLinear = new Matrix(), parentInverse = new Matrix(), turnMatrix = new Matrix(), local = new Matrix(), scratchA = new Matrix(), scratchB = new Matrix();
  const turnQuaternion = new Quaternion();
  /** Rotate one bone by a world-space quaternion; mirrored or scaled parents are handled exactly. */
  function applyWorld(node: TransformNode, rotation: Quaternion) {
    const parent = node.parent as TransformNode;
    parentLinear.copyFrom(parent.getWorldMatrix()).setTranslationFromFloats(0, 0, 0);
    parentLinear.invertToRef(parentInverse);
    Matrix.FromQuaternionToRef(rotation, turnMatrix);
    Matrix.FromQuaternionToRef(node.rotationQuaternion!, local);
    local.multiplyToRef(parentLinear, scratchA);
    scratchA.multiplyToRef(turnMatrix, scratchB);
    scratchB.multiplyToRef(parentInverse, scratchA);
    Quaternion.FromRotationMatrixToRef(scratchA, node.rotationQuaternion!);
    node.rotationQuaternion!.normalize();
    refresh(subtree.get(node)!);
  }
  const from = new Vector3(), to = new Vector3(), axis = new Vector3();
  function aim(node: TransformNode, tip: TransformNode, target: Vector3, weight: number) {
    const origin = node.getAbsolutePosition();
    tip.getAbsolutePosition().subtractToRef(origin, from);
    target.subtractToRef(origin, to);
    if (from.lengthSquared() < 1e-10 || to.lengthSquared() < 1e-10) return;
    from.normalize(); to.normalize();
    const angle = Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(from, to)))) * weight;
    Vector3.CrossToRef(from, to, axis);
    if (angle < 1e-4 || axis.lengthSquared() < 1e-10) return;
    Quaternion.RotationAxisToRef(axis.normalize(), angle, turnQuaternion);
    applyWorld(node, turnQuaternion);
  }

  // Presentation state only; any of it may be discarded at any time.
  const weights = [1, 0, 0, 0];
  let idleTime = 0, stride = 0, yaw = 0, lastYaw = 0, lean = 0, roll = 0;
  let swing = 0, airborne = 0, rising = 0, squash = 0, joy = 0, awe = 0;
  let climb = 0, climbPhase = 0, dizzy = 0, lifted = 0, reach = 0, sway = 0;
  const reachPoint = new Vector3();
  let blink = 0, nextBlink = 2.2, blinkSeed = 7;
  const anchorPoint = new Vector3(), axes = { x: new Vector3(), y: new Vector3(0, 1, 0), z: new Vector3() };
  const blended = [0, 0, 0, 0];

  function sampleInto(values: Float32Array, frames: number, phase: number, weight: number, first: boolean) {
    const position = Math.max(0, Math.min(1, phase)) * (frames - 1);
    const index = Math.min(frames - 2, Math.floor(position));
    const blend = position - index, a = index * 4, b = a + 4;
    let sign = values[a] * values[b] + values[a + 1] * values[b + 1] + values[a + 2] * values[b + 2] + values[a + 3] * values[b + 3] < 0 ? -1 : 1;
    const x = values[a] + (values[b] * sign - values[a]) * blend, y = values[a + 1] + (values[b + 1] * sign - values[a + 1]) * blend;
    const z = values[a + 2] + (values[b + 2] * sign - values[a + 2]) * blend, w = values[a + 3] + (values[b + 3] * sign - values[a + 3]) * blend;
    sign = first || blended[0] * x + blended[1] * y + blended[2] * z + blended[3] * w >= 0 ? weight : -weight;
    blended[0] += x * sign; blended[1] += y * sign; blended[2] += z * sign; blended[3] += w * sign;
  }

  function update(frame: AvatarFrame, dt: number, reducedMotion: boolean, snap = false) {
    const { hero } = frame;
    const speed = Math.hypot(hero.vx, hero.vz);
    const grounded = hero.mode === 'ground';
    if (snap) { yaw = lastYaw = hero.yaw; lean = roll = swing = airborne = rising = squash = climb = dizzy = lifted = reach = 0; weights.fill(0); weights[0] = 1; }
    const turnRate = dt > 0 ? wrap(hero.yaw - lastYaw) / dt : 0;
    lastYaw = hero.yaw;
    yaw += wrap(hero.yaw - yaw) * (snap ? 1 : 1 - Math.exp(-18 * dt));
    root.position.set(frame.x, frame.y, frame.z);
    root.rotation.y = yaw;

    // Loop weights follow ground speed; in the air the legs settle to the standing loop.
    const wanted = grounded ? locomotionWeights(speed) : [1, 0, 0, 0];
    let total = 0;
    for (let index = 0; index < weights.length; index++) {
      weights[index] = snap ? wanted[index] : damp(weights[index], wanted[index], grounded ? MOTION.blendRate : MOTION.airBlendRate, dt);
      total += weights[index];
    }
    for (let index = 0; index < weights.length; index++) weights[index] /= total;
    idleTime = (idleTime + dt) % LOCOMOTION[0].duration;
    if (grounded) stride = (stride + dt * strideCyclesPerSecond(weights, speed)) % 1;

    if (frame.events & HERO_EVENT.land) squash = Math.min(1, 0.4 + hero.impact / 20);
    squash = Math.max(0, squash - dt * MOTION.landRecover);
    swing = damp(swing, hero.mode === 'swing' ? 1 : 0, MOTION.swingBlendRate, dt);
    airborne = damp(airborne, hero.mode === 'air' || hero.mode === 'catch' ? 1 : 0, MOTION.airBlendRate, dt);
    rising = damp(rising, hero.vy > 0.5 ? 1 : 0, 9, dt);
    climb = damp(climb, hero.mode === 'climb' ? 1 : 0, MOTION.climbBlendRate, dt);
    if (hero.mode === 'climb') climbPhase = (climbPhase + dt * MOTION.climbCyclesPerMetre * Math.hypot(hero.vx, hero.vy, hero.vz)) % 1;
    dizzy = damp(dizzy, Math.max(0, Math.min(1, frame.dizzy ?? 0)), MOTION.stanceBlendRate, dt);
    lifted = damp(lifted, Math.max(0, Math.min(1, frame.lifted ?? 0)), MOTION.stanceBlendRate, dt);
    reach = damp(reach, frame.reach ? 1 : 0, MOTION.stanceBlendRate, dt);
    if (frame.reach) reachPoint.set(frame.reach.x, frame.reach.y, frame.reach.z);
    sway = (sway + dt * MOTION.dizzyRate) % 1;
    const land = Math.max(Math.sin(Math.min(1, squash) * Math.PI * 0.5), dizzy * MOTION.dizzyCrouch);

    // Base pose: weighted blend of the loops, sampled directly from their keys.
    let height = 0;
    for (let clipIndex = 0; clipIndex < clips.length; clipIndex++) {
      const clip = clips[clipIndex], weight = weights[clipIndex];
      if (weight <= 0.001 || !clip.height) continue;
      const position = (clipIndex === 0 ? idleTime / LOCOMOTION[0].duration : stride) * (clip.frames - 1);
      const index = Math.min(clip.frames - 2, Math.floor(position));
      height += weight * (clip.height[index] + (clip.height[index + 1] - clip.height[index]) * (position - index));
    }
    for (let boneAt = 0; boneAt < bones.length; boneAt++) {
      blended[0] = blended[1] = blended[2] = blended[3] = 0;
      let first = true;
      for (let clipIndex = 0; clipIndex < clips.length; clipIndex++) {
        const values = clips[clipIndex].rotations[boneAt];
        if (weights[clipIndex] <= 0.001 || !values) continue;
        sampleInto(values, clips[clipIndex].frames, clipIndex === 0 ? idleTime / LOCOMOTION[0].duration : stride, weights[clipIndex], first);
        first = false;
      }
      const length = Math.hypot(blended[0], blended[1], blended[2], blended[3]);
      if (length > 1e-6) bones[boneAt].rotationQuaternion!.set(blended[0] / length, blended[1] / length, blended[2] / length, blended[3] / length);
    }
    hipNode.position.set(restHips.x, height > 0 ? height : restHips.y, restHips.z);

    // Whole-body attitude: bank into turns, follow the rope while swinging.
    const gait = grounded ? Math.min(1, speed / TUNING.sprintSpeed) : 0;
    let pitch = gait * 0.05;
    let bank = Math.max(-0.3, Math.min(0.3, -turnRate * 0.03)) * (grounded ? gait : 0.4);
    if (frame.anchor && swing > 0.01) {
      const dx = frame.anchor.x - frame.x, dy = frame.anchor.y - (frame.y + TUNING.handHeight), dz = frame.anchor.z - frame.z;
      const forward = dx * Math.sin(yaw) + dz * Math.cos(yaw), side = dx * Math.cos(yaw) - dz * Math.sin(yaw), up = Math.max(0.5, dy);
      pitch += (Math.atan2(forward, up) * 0.75 - pitch) * swing;
      bank += (-Math.atan2(side, up) * 0.6 - bank) * swing;
    }
    if (airborne > 0.01) pitch += airborne * (1 - lifted) * Math.max(-0.25, Math.min(0.3, -hero.vy * 0.014 + speed * 0.01));
    lean = snap ? pitch : damp(lean, pitch, 10, dt);
    roll = snap ? bank : damp(roll, bank, 9, dt);
    const calm = reducedMotion ? 0.5 : 1;
    body.rotation.set(lean * calm, 0, roll * calm);
    body.position.y = -crouchDrop(land);
    refresh(ordered.length ? [root, body, ...ordered] : [root, body]);

    // Procedural poses, strongest last: jump and fall, the tether reach, the landing crouch.
    axes.x.set(Math.cos(yaw), 0, -Math.sin(yaw));
    axes.z.set(Math.sin(yaw), 0, Math.cos(yaw));
    const [reachLeft, reachRight] = climbReach(climbPhase);
    const aloft = Math.max(airborne, lifted), up = rising * (1 - lifted);
    const amount: Record<string, number> = {
      rise: aloft * up * (1 - swing), fall: aloft * (1 - up) * (1 - swing), swing, land,
      climbLeft: climb * reachLeft, climbRight: climb * reachRight, dizzy,
    };
    for (const pose of poses) {
      const weight = amount[pose.id];
      if (weight <= 0.002) continue;
      for (const item of pose.turns) {
        const degrees = pose.id === 'land' && item.leg ? item.degrees * MOTION.landBend : item.degrees;
        Quaternion.RotationAxisToRef(axes[item.axis], degrees * weight * Math.PI / 180, turnQuaternion);
        applyWorld(item.node, turnQuaternion);
      }
    }
    if (frame.anchor && swing > 0.02) {
      anchorPoint.set(frame.anchor.x, frame.anchor.y, frame.anchor.z);
      for (const arm of arms) aim(arm.node, arm.tip, anchorPoint, arm.weight * swing);
    }
    // The right arm points along a snare line; the left stays free for balance.
    const pointing = reach * (1 - swing) * (1 - climb);
    if (pointing > 0.02) for (const arm of arms.slice(0, 2)) aim(arm.node, arm.tip, reachPoint, arm.weight * pointing);
    if (dizzy > 0.02 && !reducedMotion) {
      Quaternion.RotationAxisToRef(axes.z, Math.sin(sway * Math.PI * 2) * MOTION.dizzySway * dizzy * Math.PI / 180, turnQuaternion);
      applyWorld(head, turnQuaternion);
    }

    // Face: blinking, a wide-eyed look at speed, a smile after a pickup.
    nextBlink -= dt;
    if (nextBlink <= 0) {
      blink = MOTION.blinkSeconds;
      blinkSeed = (blinkSeed * 1103515245 + 12345) % 2147483648;
      nextBlink = MOTION.blinkEvery[0] + (blinkSeed / 2147483648) * (MOTION.blinkEvery[1] - MOTION.blinkEvery[0]);
    }
    blink = Math.max(0, blink - dt);
    const lid = Math.sin(Math.min(1, blink / MOTION.blinkSeconds) * Math.PI);
    awe = damp(awe, hero.mode === 'swing' || lifted > 0.5 || (hero.mode === 'air' && Math.abs(hero.vy) > 6) ? 1 : 0, 6, dt);
    joy = Math.max(0, joy - dt * 0.45);
    for (const target of face.blink) target.influence = lid;
    for (const target of face.wide) target.influence = awe * 0.6 * (1 - lid);
    for (const target of face.brow) target.influence = awe * 0.45;
    for (const target of face.jaw) target.influence = awe * 0.16 + Math.min(1, joy) * 0.1;
    for (const target of face.smile) target.influence = Math.min(1, joy) * 0.8 + awe * 0.25;
  }

  return {
    root, meshes,
    shadowCasters: () => meshes,
    /** World position of the right hand, where the tether is held. */
    handPosition: () => grip.getAbsolutePosition(),
    setEnabled: (enabled: boolean) => root.setEnabled(enabled),
    /** A short smile, for example after collecting a practice spark. */
    celebrate: () => { joy = 1.6; },
    update,
    snapshot: () => ({ kind: 'person' as const, gait: 1 - weights[0], swing, airborne, squash, climb, dizzy, lifted, reach, weights: [...weights], bones: bones.length }),
    dispose: () => { container.dispose(); body.dispose(); root.dispose(); },
  };
}
export type PersonAvatar = Awaited<ReturnType<typeof loadPersonAvatar>>;
