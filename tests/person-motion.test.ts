import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  GRIP_BONE, HEAD_BONE, LAND_LEG_BONES, LOCOMOTION, MOTION, POSES, TETHER_ARMS,
  climbReach, crouchDrop, locomotionWeights, strideCyclesPerSecond,
} from '../src/game/hero/person-motion.ts';

interface ClipReport { id: string; durationSeconds: number; naturalSpeedMetresPerSecond: number; loopClosureDegrees: number; channels: number; legRatio: number; }
interface Provenance {
  license: string; likeness: string; upstreamCommit: string;
  outputs: { target: string; joints: number; triangles: number; blendShapes: string[]; jointNames: string[]; clips: ClipReport[]; files: { file: string; bytes: number; sha256: string }[] }[];
}
const provenance = async (folder: string) => JSON.parse(await readFile(`${folder}/PROVENANCE.json`, 'utf8')) as Provenance;
const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

test('loop weights always sum to one and hand over at each natural speed', () => {
  for (let speed = 0; speed <= 12; speed += 0.05) {
    const weights = locomotionWeights(speed);
    assert.ok(Math.abs(sum(weights) - 1) < 1e-9, `weights at ${speed}`);
    assert.ok(weights.every(weight => weight >= 0 && weight <= 1));
    assert.ok(weights.filter(weight => weight > 0).length <= 2, 'at most two adjacent loops blend');
  }
  LOCOMOTION.forEach((clip, index) => assert.equal(locomotionWeights(clip.speed)[index], 1, `${clip.id} alone at its own speed`));
  assert.deepEqual(locomotionWeights(0), [1, 0, 0, 0]);
  assert.deepEqual(locomotionWeights(40), [0, 0, 0, 1]);
  assert.deepEqual(locomotionWeights(Number.NaN), [1, 0, 0, 0]);
  assert.deepEqual(locomotionWeights(-3), [1, 0, 0, 0]);
  // Weights are continuous: a tiny change in speed never jumps a loop in or out.
  for (let speed = 0.01; speed <= 6; speed += 0.01) {
    const before = locomotionWeights(speed - 0.01), after = locomotionWeights(speed);
    assert.ok(before.every((weight, index) => Math.abs(weight - after[index]) < 0.02), `continuous near ${speed}`);
  }
});

test('the stride matches ground speed inside a comfortable band', () => {
  for (const clip of LOCOMOTION.slice(1)) {
    const cycles = strideCyclesPerSecond(locomotionWeights(clip.speed), clip.speed);
    assert.ok(Math.abs(cycles - 1 / clip.duration) < 1e-9, `${clip.id} plays at its authored rate at its natural speed`);
  }
  assert.equal(strideCyclesPerSecond([1, 0, 0, 0], 0), 0, 'standing still does not stride');
  const sprint = LOCOMOTION[3];
  const fast = strideCyclesPerSecond(locomotionWeights(30), 30);
  assert.ok(Math.abs(fast - MOTION.maxStrideRate / sprint.duration) < 1e-9, 'legs never blur past the cap');
  const slow = strideCyclesPerSecond([0, 0, 0, 1], 0.1);
  assert.ok(Math.abs(slow - MOTION.minStrideRate / sprint.duration) < 1e-9);
  // The game's run speed sits on the sprint loop without sliding.
  assert.ok(Math.abs(4.6 / sprint.speed - 1) < 0.01);
});

test('the landing crouch lowers the hips by exactly what the bent legs give up', () => {
  assert.equal(crouchDrop(0), 0);
  assert.equal(crouchDrop(-1), 0);
  const full = MOTION.legLength * (1 - Math.cos(MOTION.landBend * Math.PI / 180));
  assert.ok(Math.abs(crouchDrop(1) - full) < 1e-12);
  assert.equal(crouchDrop(4), crouchDrop(1));
  assert.ok(crouchDrop(0.5) > 0 && crouchDrop(0.5) < full);
  // Thigh, calf and foot multipliers cancel so the sole stays level.
  const land = POSES.find(pose => pose.id === 'land')!;
  for (const side of ['R', 'L']) {
    const net = sum(land.turns.filter(item => item.bone.startsWith(`Bip01 ${side} `) && LAND_LEG_BONES.includes(item.bone)).map(item => item.degrees));
    assert.equal(net, 0, `${side} leg turns cancel`);
  }
});

test('motion numbers and bones match the shipped hero model in both runtimes', async () => {
  const folders = ['public/assets/playground/hero', 'unity/SpaceDragon/Assets/SpaceDragon/Playground/Imported/Characters'];
  const records = await Promise.all(folders.map(provenance));
  assert.deepEqual(records[0], records[1], 'browser and Unity copies carry the same provenance');
  const record = records[0];
  assert.equal(record.license, 'MIT');
  assert.match(record.likeness, /No owner photo/);
  assert.match(record.upstreamCommit, /^[0-9a-f]{40}$/);
  assert.deepEqual(record.outputs.map(output => output.target).sort(), ['browser', 'unity']);
  for (const output of record.outputs) {
    // Plain glTF files only: the model must not depend on Git LFS to reach a checkout.
    assert.ok(output.files.some(file => file.file === 'playground-kid.gltf'));
    assert.ok(output.files.every(file => /^playground-kid[a-z-]*\.(gltf|bin|png)$/.test(file.file) && /^[0-9a-f]{64}$/.test(file.sha256) && file.bytes > 0));
    assert.equal(output.joints, 80);
    assert.equal(output.triangles, 6660);
    assert.deepEqual(output.clips.map(clip => clip.id), LOCOMOTION.map(clip => clip.id));
    output.clips.forEach((clip, index) => {
      assert.equal(clip.naturalSpeedMetresPerSecond, LOCOMOTION[index].speed, `${clip.id} speed`);
      assert.equal(clip.durationSeconds, LOCOMOTION[index].duration, `${clip.id} duration`);
      assert.ok(clip.loopClosureDegrees < 1, `${clip.id} closes its loop`);
      assert.ok(clip.channels >= 40);
    });
    const joints = new Set(output.jointNames);
    const used = [GRIP_BONE, HEAD_BONE, ...LAND_LEG_BONES, ...TETHER_ARMS.flatMap(arm => [arm.bone, arm.tip]), ...POSES.flatMap(pose => pose.turns.map(item => item.bone))];
    for (const bone of used) assert.ok(joints.has(bone), `${bone} exists in the rig`);
    for (const suffix of ['EyeBlinkLeft', 'EyeBlinkRight', 'MouthSmileLeft', 'MouthSmileRight', 'JawOpen', 'EyeWideLeft', 'EyeWideRight', 'BrowInnerUp'])
      assert.ok(output.blendShapes.some(name => name.endsWith(suffix)), `${suffix} blend shape`);
  }
  // Each pose lists a parent before its child so world-space turns compose predictably.
  const order = ['Spine1', 'Head', 'Thigh', 'Calf', 'Foot', 'UpperArm', 'Forearm'];
  for (const pose of POSES) for (const side of ['R ', 'L ']) {
    const chain = pose.turns.filter(item => item.bone.includes(` ${side}`)).map(item => order.indexOf(item.bone.split(' ').at(-1)!));
    const legs = chain.filter(index => index >= 2 && index <= 4), arm = chain.filter(index => index >= 5);
    assert.deepEqual(legs, [...legs].sort((a, b) => a - b), `${pose.id} ${side}leg order`);
    assert.deepEqual(arm, [...arm].sort((a, b) => a - b), `${pose.id} ${side}arm order`);
  }
});

test('climbing cross-fades two mirrored reaches that always add up to a whole pose', () => {
  const left = POSES.find(pose => pose.id === 'climbLeft')!, right = POSES.find(pose => pose.id === 'climbRight')!;
  assert.equal(left.turns.length, right.turns.length);
  left.turns.forEach((item, index) => {
    const twin = right.turns[index];
    assert.equal(twin.bone, item.bone.replace(/^Bip01 ([LR]) /, (_match, side: string) => `Bip01 ${side === 'L' ? 'R' : 'L'} `));
    assert.equal(twin.axis, item.axis);
    assert.equal(twin.degrees, item.axis === 'x' ? item.degrees : -item.degrees, `${item.bone} ${item.axis} mirrors`);
  });
  // One hand is always the high one.
  const high = (pose: typeof left, side: string) => pose.turns.find(item => item.bone === `Bip01 ${side} UpperArm` && item.axis === 'x')!.degrees;
  assert.ok(high(left, 'L') < high(left, 'R') && high(right, 'R') < high(right, 'L'));
  for (let phase = -1; phase <= 3; phase += 0.01) {
    const [a, b] = climbReach(phase);
    assert.ok(a >= 0 && a <= 1 && Math.abs(a + b - 1) < 1e-12);
  }
  assert.deepEqual(climbReach(0), [0.5, 0.5]);
  assert.ok(climbReach(0.25)[0] > 0.999 && climbReach(0.75)[1] > 0.999, 'each reach is held fully once per cycle');
  assert.deepEqual(climbReach(Number.NaN), [0.5, 0.5]);
  assert.ok(MOTION.dizzyCrouch > 0 && MOTION.dizzyCrouch <= 1 && MOTION.climbCyclesPerMetre > 0);
});
