import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DragonAnimation } from '../src/prototypes/dogfight/animation/dragon.js';
import { DRAGON_BONES } from '../src/prototypes/dogfight/assets/dragon-model.js';

function rig() {
  const model = new THREE.Group(); model.name = 'Model'; model.position.set(5, 7, 9);
  for (const name of DRAGON_BONES) {
    const bone = new THREE.Bone(); bone.name = name;
    // Non-identity rest angles expose clips incorrectly treated as deltas.
    bone.quaternion.setFromEuler(new THREE.Euler(.12, -.07, .05));
    bone.position.set(0, name === 'Root' ? 2 : 1, 0); model.add(bone);
  }
  return model;
}
function quaternionTrack(model, name, poses, times = [0, .25, .5, .75, 1]) {
  const bone = model.getObjectByName(name);
  return new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, poses.flatMap(pose =>
    bone.quaternion.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...pose))).toArray()));
}
function clips(model) {
  return ['Flight', 'Glide', 'Boost'].map(name => {
    const boost = name === 'Boost', amplitude = name === 'Glide' ? 0 : boost ? .236 : .2;
    const sweep = boost ? .245 : .025, tracks = [];
    for (const [wing, sign] of [['Wing_L', -1], ['Wing_R', 1]]) {
      tracks.push(quaternionTrack(model, wing, [0, 1, 0, -1, 0].map(stroke => [0, sign * sweep, sign * (.13 + stroke * amplitude)])));
    }
    for (let index = 0; index < 5; index++) tracks.push(quaternionTrack(model, `Tail_${index}`,
      [0, 1, 0, -1, 0].map(stroke => [stroke * .035, stroke * .07, 0])));
    return new THREE.AnimationClip(name, 1, tracks);
  });
}
const angleNear = (left, right, tolerance = 1e-6) => assert.ok(left.angleTo(right) < tolerance,
  `quaternion angle ${left.angleTo(right)} exceeds ${tolerance}`);
const poseSnapshot = animation => Object.fromEntries(Object.entries(animation.bones).map(([name, { bone }]) => [name, bone.quaternion.toArray()]));

test('exported flight clips blend through an actual mixer and an interrupted transition preserves its current pose', () => {
  const model = rig(), animation = new DragonAnimation(model, clips(model));
  assert.ok(animation.mixer instanceof THREE.AnimationMixer);
  animation.update(.1, .2, false, false, .3);
  assert.equal(animation.snapshot().mode, 'exported-clips');
  assert.deepEqual(animation.snapshot().clips, ['Flight', 'Glide', 'Boost']);
  animation.update(.15, .2, true, false, .3);
  const blended = animation.snapshot();
  assert.equal(blended.state, 'Boost');
  assert.ok(blended.weights.Flight > 0 && blended.weights.Boost > 0 && blended.weights.Boost < 1);
  assert.ok(Math.abs(Object.values(blended.weights).reduce((sum, weight) => sum + weight, 0) - 1) < 1e-12);
  const pose = poseSnapshot(animation), weights = blended.weights;
  animation.update(.15, .2, false, false, .3);
  assert.deepEqual(poseSnapshot(animation), pose, 'changing requested state without elapsed time must not pop the pose');
  assert.deepEqual(animation.snapshot().weights, weights);
  animation.update(.2, .2, false, false, .3);
  assert.ok(animation.snapshot().weights.Flight > weights.Flight);
  animation.dispose();
});

test('irregular cadence selects an authored steady glide while boost remains a distinct blended state', () => {
  const model = rig(), animation = new DragonAnimation(model, clips(model));
  animation.cadence.sample(10);
  const glide = animation.cadence.segments.find(segment => segment.mode === 'glide');
  animation.update(glide.start + .1, 0, false, false, 0);
  assert.equal(animation.snapshot().state, 'Glide');
  const left = animation.bones.Wing_L.bone.quaternion.clone();
  animation.update(glide.start + .2, 0, false, false, 0);
  angleNear(animation.bones.Wing_L.bone.quaternion, left, 1e-5);
  animation.update(glide.start + .25, 0, true, false, 0);
  assert.equal(animation.snapshot().state, 'Boost');
  assert.ok(animation.snapshot().weights.Boost > 0);
  assert.equal(animation.motionState.mode, 'glide', 'boost must retain the established steady-wing beats');
  animation.dispose();
});

test('partial clips retain their authored channel and use procedural motion for missing channels and states', () => {
  const model = rig(), reference = rig();
  const partial = new THREE.AnimationClip('Flight', 1, [quaternionTrack(model, 'Wing_L', [[0, -.025, -.6]], [0])]);
  const animation = new DragonAnimation(model, [partial]), fallback = new DragonAnimation(reference);
  animation.update(.31, .4, false, false, .2); fallback.update(.31, .4, false, false, .2);
  assert.ok(animation.bones.Wing_L.bone.quaternion.angleTo(fallback.bones.Wing_L.bone.quaternion) > .05);
  angleNear(animation.bones.Wing_R.bone.quaternion, fallback.bones.Wing_R.bone.quaternion, .001);
  angleNear(animation.bones.Tail_2.bone.quaternion, fallback.bones.Tail_2.bone.quaternion, .001);
  assert.deepEqual(animation.snapshot().missingClips, ['Glide', 'Boost']);
  assert.ok(animation.snapshot().partialClips.Flight.includes('Tail_2'));
  animation.update(1.5, 0, true, false, 0);
  assert.equal(animation.snapshot().state, 'Boost');
  assert.ok(animation.snapshot().weights.Procedural > .99);
  assert.ok(animation.bones.Wing_L.bone.quaternion.angleTo(animation.bones.Wing_L.rest) > .01);
  animation.dispose(); fallback.dispose();
});

test('imported root, translation, scale and jaw channels cannot override gameplay transforms or combat jaw', () => {
  const model = rig(), sources = clips(model), originalPosition = model.position.clone();
  sources[0].tracks.push(
    new THREE.VectorKeyframeTrack('Model.position', [0, 1], [0, 0, 0, 500, 500, 500]),
    new THREE.VectorKeyframeTrack('Root.position', [0, 1], [0, 0, 0, 500, 500, 500]),
    quaternionTrack(model, 'Root', [[1, 1, 1]], [0]),
    quaternionTrack(model, 'Jaw', [[1, 1, 1]], [0]),
    new THREE.VectorKeyframeTrack('Wing_L.scale', [0, 1], [1, 1, 1, 4, 4, 4]),
  );
  const sourceJSON = JSON.stringify(THREE.AnimationClip.toJSON(sources[0]));
  const animation = new DragonAnimation(model, sources), root = model.getObjectByName('Root');
  const originalRootPosition = root.position.clone(), originalRootQuaternion = root.quaternion.clone();
  animation.update(.25, 0, false, true, 0);
  assert.equal(model.position.distanceTo(originalPosition), 0);
  assert.equal(root.position.distanceTo(originalRootPosition), 0); angleNear(root.quaternion, originalRootQuaternion);
  assert.deepEqual(model.getObjectByName('Wing_L').scale.toArray(), [1, 1, 1]);
  assert.equal(animation.snapshot().ignoredTracks.length, 5);
  const expectedJaw = animation.bones.Jaw.rest.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-.17, 0, 0)));
  angleNear(animation.bones.Jaw.bone.quaternion, expectedJaw);
  assert.equal(JSON.stringify(THREE.AnimationClip.toJSON(sources[0])), sourceJSON, 'source clips must remain unchanged');
  animation.dispose();
});

test('weapon poses follow the authoritative windup/beam timeline and frozen time does not advance clips', () => {
  const model = rig(), animation = new DragonAnimation(model, clips(model));
  animation.update(.2, .3, true, false, -.4, { stage: 'windup', progress: .5 });
  const expected = animation.bones.Jaw.rest.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-.21, 0, 0)));
  angleNear(animation.bones.Jaw.bone.quaternion, expected);
  assert.equal(animation.snapshot().jaw, 'windup');
  const before = poseSnapshot(animation), weights = animation.snapshot().weights;
  animation.update(.2, .3, true, false, -.4, { stage: 'windup', progress: .5 });
  assert.deepEqual(poseSnapshot(animation), before); assert.deepEqual(animation.snapshot().weights, weights);
  animation.update(.3, .3, true, false, -.4, { stage: 'beam', progress: .1 });
  expected.copy(animation.bones.Jaw.rest).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-.32, 0, 0)));
  angleNear(animation.bones.Jaw.bone.quaternion, expected);
  assert.equal(animation.snapshot().jaw, 'beam');
  animation.update(.4, .3, false, false, -.4);
  assert.equal(animation.snapshot().jaw, 'idle');
  animation.dispose();
});

test('reset, retry and disposal release mixer actions without changing the original rig or another instance', () => {
  const firstModel = rig(), secondModel = rig();
  const animation = new DragonAnimation(firstModel, clips(firstModel)), other = new DragonAnimation(secondModel, clips(secondModel));
  animation.update(.3, .4, true, true, .2); animation.reset();
  for (const { bone, rest } of Object.values(animation.bones)) angleNear(bone.quaternion, rest);
  assert.equal(animation.motionClock, 0); assert.equal(animation.snapshot().transitions, 0);
  assert.equal(animation.snapshot().weights.Flight, 1);
  animation.update(.2, 0, false, false, 0); other.update(.2, 0, false, false, 0);
  assert.deepEqual(poseSnapshot(animation), poseSnapshot(other));
  animation.dispose(); animation.dispose();
  assert.equal(animation.mixer.stats.actions.inUse, 0); assert.equal(animation.mixer.stats.bindings.inUse, 0);
  const stopped = poseSnapshot(animation); animation.update(.8, 1, true, true, 1);
  assert.deepEqual(poseSnapshot(animation), stopped);
  other.update(.8, 0, false, false, 0); assert.equal(other.snapshot().disposed, false);
  other.dispose();
});

test('actual Blender flight GLB supplies seamless clips that deform the retained skin without gameplay root motion', async () => {
  const bytes = await readFile(process.env.DRAGON_CLIP_TEST_ASSET || 'public/assets/dogfight/models/dragon-flight-v003.glb');
  // This Node check inspects real skin/clip bytes, not browser texture decoding.
  const loader = new GLTFLoader();
  loader.register(() => ({ name: 'ANIMATION_TEST_TEXTURE_STUB', loadTexture: () => Promise.resolve(new THREE.Texture()) }));
  const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  assert.deepEqual(gltf.animations.map(clip => clip.name).sort(), ['Boost', 'Flight', 'Glide']);
  for (const clip of gltf.animations) {
    assert.equal(clip.duration, 1); assert.equal(clip.tracks.length, 7);
    for (const track of clip.tracks) {
      assert.match(track.name, /^(Wing_[LR]|Tail_[0-4])\.quaternion$/);
      const first = new THREE.Quaternion().fromArray(track.values, 0).normalize();
      const last = new THREE.Quaternion().fromArray(track.values, track.values.length - 4).normalize();
      angleNear(first, last, .0001);
      if (clip.name === 'Glide' && track.name.startsWith('Wing_')) {
        for (let index = 0; index < track.values.length; index += 4) angleNear(first, new THREE.Quaternion().fromArray(track.values, index).normalize(), .0001);
      }
    }
  }
  const model = gltf.scene, animation = new DragonAnimation(model, gltf.animations);
  assert.equal(animation.snapshot().mode, 'exported-clips'); assert.deepEqual(animation.snapshot().ignoredTracks, []);
  assert.ok(Object.values(animation.snapshot().partialClips).every(missing => missing.length === 0));
  const root = model.getObjectByName('Root'), rootPosition = root.position.clone(), rootQuaternion = root.quaternion.clone();
  const probes = Object.fromEntries(DRAGON_BONES.filter(name => name !== 'Root').map(name => [name, []]));
  model.updateMatrixWorld(true);
  model.traverse(mesh => {
    if (!mesh.isSkinnedMesh) return;
    mesh.skeleton.update();
    const joints = mesh.geometry.attributes.skinIndex, weights = mesh.geometry.attributes.skinWeight;
    for (let index = 0; index < joints.count; index++) for (let slot = 0; slot < 4; slot++) {
      const name = mesh.skeleton.bones[joints.getComponent(index, slot)]?.name;
      if (!probes[name] || probes[name].length >= 8 || weights.getComponent(index, slot) < .99) continue;
      probes[name].push({ mesh, index, rest: mesh.getVertexPosition(index, new THREE.Vector3()).clone() });
    }
  });
  animation.update(.31, .2, true, true, .4, { stage: 'beam', progress: .2 });
  model.updateMatrixWorld(true); model.traverse(mesh => { if (mesh.isSkinnedMesh) mesh.skeleton.update(); });
  for (const [name, samples] of Object.entries(probes)) {
    assert.ok(samples.length > 0, `no retained ${name} skin`);
    assert.ok(samples.some(({ mesh, index, rest }) => mesh.getVertexPosition(index, new THREE.Vector3()).distanceTo(rest) > .001), `${name} skin did not move`);
  }
  assert.equal(root.position.distanceTo(rootPosition), 0); angleNear(root.quaternion, rootQuaternion);
  assert.ok(animation.snapshot().weights.Boost > .8);
  animation.dispose();
});
