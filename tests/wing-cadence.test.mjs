import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { WingCadence } from '../src/prototypes/dogfight/animation/wing-cadence.js';
import { DragonAnimation } from '../src/prototypes/dogfight/animation/dragon.js';

function model() {
  const group = new THREE.Group();
  for (const name of ['Root', 'Wing_L', 'Wing_R', 'Jaw', 'Tail_0', 'Tail_1', 'Tail_2', 'Tail_3', 'Tail_4']) {
    const bone = new THREE.Bone(); bone.name = name; group.add(bone);
  }
  return group;
}
const near = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);

test('wing rhythm includes exact steady holds and varies stroke/hold duration and amplitude', () => {
  const rhythm = new WingCadence(); rhythm.sample(40);
  const strokes = rhythm.segments.filter(segment => segment.mode === 'flap');
  const glides = rhythm.segments.filter(segment => segment.mode === 'glide');
  assert.ok(strokes.length > 10); assert.ok(glides.length > 3);
  assert.ok(new Set(strokes.map(segment => segment.duration)).size > 5);
  assert.ok(new Set(strokes.map(segment => segment.amplitude)).size > 5);
  assert.ok(new Set(glides.map(segment => segment.duration)).size > 3);
  for (const glide of glides) {
    const one = rhythm.sample(glide.start + glide.duration * .2), two = rhythm.sample(glide.start + glide.duration * .8);
    assert.equal(one.mode, 'glide'); assert.equal(one.flap, 0); assert.equal(two.flap, 0);
    assert.ok(glide.duration >= .42); assert.ok(glide.duration <= 1.5);
  }
});

test('flaps meet glides continuously and resampling/reset reproduces the same pose', () => {
  const rhythm = new WingCadence(); rhythm.sample(20);
  for (const segment of rhythm.segments.filter(segment => segment.mode === 'glide')) {
    const before = rhythm.sample(segment.start - 1e-5).flap;
    near(before, 0, 1e-8);
    near(rhythm.sample(segment.start + segment.duration + 1e-5).flap, 0, 1e-8);
  }
  const at = rhythm.sample(13.4); rhythm.sample(60); assert.deepEqual(rhythm.sample(13.4), at);
  rhythm.reset(); assert.deepEqual(rhythm.sample(13.4), at);
});

test('dragon wing posing agrees at 30 and 120 Hz through boost and keeps bank/jaw control', () => {
  const results = [30, 120].map(fps => {
    const animation = new DragonAnimation(model());
    for (let frame = 1; frame <= fps * 4; frame++) {
      const time = frame / fps; animation.update(time, .4, time > 1 && time <= 3, true, .2);
    }
    return animation;
  });
  near(results[0].motionClock, results[1].motionClock, 1e-10);
  near(results[0].motionState.flap, results[1].motionState.flap, 1e-10);
  near(results[0].bones.Wing_L.bone.quaternion.angleTo(results[1].bones.Wing_L.bone.quaternion), 0, 1e-7);
  assert.notEqual(results[0].bones.Jaw.bone.quaternion.w, 1);
  const animation = results[0], position = animation.bones.Root.bone.position.clone();
  animation.reset(); animation.update(0, 0, false, false, 0);
  assert.equal(animation.motionClock, 0); assert.equal(animation.boostWeight, 0);
  assert.deepEqual(animation.bones.Root.bone.position.toArray(), position.toArray());
});
