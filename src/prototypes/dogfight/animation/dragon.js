import * as THREE from 'three';
import { WingCadence } from './wing-cadence.js';
import { DRAGON_BONES } from '../assets/dragon-model.js';

const CLIP_STATES = Object.freeze(['Flight', 'Glide', 'Boost']);
const CLIP_BONES = Object.freeze(DRAGON_BONES.filter(name => name !== 'Root' && name !== 'Jaw'));
const FALLBACK = 'Procedural';

export class DragonAnimation {
  constructor(model, clips = [], { blendSeconds = .18 } = {}) {
    this.model = model;
    this.bones = {};
    model.traverse(o => {
      if (o.isBone) this.bones[o.name] = { bone: o, rest: o.quaternion.clone() };
      if (o.isMesh) o.frustumCulled = false;
    });
    for (const name of DRAGON_BONES) {
      if (!this.bones[name]) throw new Error(`Dragon skeleton missing ${name}`);
    }
    this.q = new THREE.Quaternion(); this.relative = new THREE.Quaternion(); this.euler = new THREE.Euler();
    this.blendSeconds = Number.isFinite(blendSeconds) ? Math.max(.01, blendSeconds) : .18;
    this.actions = new Map(); this.weights = new Map(); this.dynamicTracks = [];
    this.clipPose = Object.fromEntries(CLIP_BONES.map(name => [name, this.bones[name].rest.clone()]));
    this.fallbackPose = Object.fromEntries(CLIP_BONES.map(name => [name, this.bones[name].rest.clone()]));
    this.ignoredTracks = []; this.partialClips = {}; this.disposed = false;
    this.state = 'Flight'; this.transitions = 0; this.jawState = 'idle';
    this.createClipMixer(clips);
    this.cadence = new WingCadence(); this.motionClock = 0; this.lastTime = 0; this.boostWeight = 0;
    this.motionState = { ...this.cadence.sample(0), bodyLift: 0, boostWeight: 0 };
  }
  createClipMixer(clips) {
    const accepted = [];
    for (const name of CLIP_STATES) {
      const source = clips.find(clip => clip.name === name);
      if (!source || !Number.isFinite(source.duration) || source.duration <= 0) continue;
      const found = new Map();
      for (const track of source.tracks) {
        let binding, bone;
        try {
          binding = THREE.PropertyBinding.parseTrackName(track.name);
          bone = THREE.PropertyBinding.findNode(this.model, binding.nodeName);
        } catch { /* A malformed imported channel is not an instruction to animate the gameplay root. */ }
        if (!bone?.isBone || !CLIP_BONES.includes(bone.name) || binding.propertyName !== 'quaternion' ||
            binding.objectName || binding.propertyIndex || track.ValueTypeName !== 'quaternion' ||
            !track.times.length || track.values.length !== track.times.length * 4 ||
            ![...track.times, ...track.values].every(Number.isFinite) || found.has(bone.name)) {
          this.ignoredTracks.push(`${name}:${track.name}`); continue;
        }
        const copy = track.clone(); copy.name = `${bone.name}.quaternion`; found.set(bone.name, copy);
      }
      // A clip with no supported pose channels is a missing clip, not a static
      // or root-motion replacement for flight. Originals remain unmodified.
      if (!found.size) continue;
      const missing = CLIP_BONES.filter(bone => !found.has(bone));
      this.partialClips[name] = missing;
      for (const bone of missing) found.set(bone, this.proceduralTrack(bone));
      accepted.push(new THREE.AnimationClip(name, source.duration, [...found.values()]));
    }
    if (!accepted.length) return;
    this.mixer = new THREE.AnimationMixer(this.model);
    accepted.push(new THREE.AnimationClip(FALLBACK, 1, CLIP_BONES.map(name => this.proceduralTrack(name))));
    for (const clip of accepted) {
      const action = this.mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity).setEffectiveWeight(0).play();
      this.actions.set(clip.name, action); this.weights.set(clip.name, 0);
    }
    this.weights.set(this.actions.has('Flight') ? 'Flight' : FALLBACK, 1);
  }
  proceduralTrack(name) {
    // One reusable sample is evaluated every frame. This supplies absent
    // channels without dropping a partial clip's other authored animation.
    const track = new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, [0], this.bones[name].rest.toArray());
    this.dynamicTracks.push({ name, track }); return track;
  }
  pose(name, x, y, z, output = this.bones[name].bone.quaternion) {
    const b = this.bones[name];
    this.q.setFromEuler(this.euler.set(x, y, z)); output.copy(b.rest).multiply(this.q);
  }
  additive(name, x, y, z) {
    this.q.setFromEuler(this.euler.set(x, y, z)); this.bones[name].bone.quaternion.multiply(this.q);
  }
  animateClips(dt, motion, time, boost) {
    const state = boost ? 'Boost' : motion.mode === 'glide' ? 'Glide' : 'Flight';
    if (state !== this.state) { this.state = state; this.transitions++; }
    const target = this.actions.has(state) ? state : FALLBACK;
    // Exponential weight blending can be interrupted at any point without
    // restarting a fade from an incorrect full weight. It is frame-rate stable.
    const response = 1 - Math.exp(-dt / this.blendSeconds);
    for (const [name, action] of this.actions) {
      const previous = this.weights.get(name), desired = name === target ? 1 : 0;
      const weight = previous + (desired - previous) * response;
      this.weights.set(name, weight); action.setEffectiveWeight(weight);
      // Flight/Boost share the irregular stroke phase, so transitions do not
      // introduce a second wing beat. Glide has no wing movement. Clips never
      // advance the simulation clock or determine damage/resource timing.
      action.time = name === FALLBACK ? 0 : name === 'Glide' ? (time % action.getClip().duration)
        : motion.mode === 'glide' ? 0 : motion.phase * action.getClip().duration;
    }
    // Current procedural pose was prepared before evaluating the mixer. The
    // dynamic tracks retain it for missing clips and missing bone channels.
    for (const { name, track } of this.dynamicTracks) this.fallbackPose[name].toArray(track.values);
    // PropertyMixer intentionally skips writes when its sampled value has not
    // changed. Restore its last base output before applying the additive bank
    // and turn again, including same-time inspection and pause evaluations.
    for (const name of CLIP_BONES) this.bones[name].bone.quaternion.copy(this.clipPose[name]);
    this.mixer.update(0);
    for (const name of CLIP_BONES) this.clipPose[name].copy(this.bones[name].bone.quaternion);
  }
  update(time, bank, boost, firing, turnRate, breath = null) {
    if (this.disposed) return;
    time = Number.isFinite(time) ? Math.max(0, time) : this.lastTime;
    if (time < this.lastTime) this.reset();
    const dt = Math.max(0, time - this.lastTime), target = boost ? 1 : 0, response = 4;
    // Exact exponential integral keeps a held boost's cadence clock identical
    // at 30/60/120 Hz, while switching boost never jumps a wing pose.
    const decay = Math.exp(-response * dt);
    const integratedBoost = target * dt + (this.boostWeight - target) * (1 - decay) / response;
    this.motionClock += dt + .4 * integratedBoost;
    this.boostWeight = target + (this.boostWeight - target) * decay; this.lastTime = time;
    const motion = this.cadence.sample(this.motionClock);
    const flap = motion.flap * (1 + this.boostWeight * .18);
    const sweep = .025 + this.boostWeight * .22;
    this.motionState = { ...motion, flap, boostWeight: this.boostWeight, bodyLift: flap * .18 };
    const poseFlap = this.mixer && motion.amplitude > 0 ? flap * .2 / motion.amplitude : flap;
    this.pose('Wing_L', 0, -sweep, -.13 - poseFlap, this.mixer ? this.fallbackPose.Wing_L : undefined);
    this.pose('Wing_R', 0, sweep, .13 + poseFlap, this.mixer ? this.fallbackPose.Wing_R : undefined);
    for (let i = 0; i < 5; i++) this.pose(`Tail_${i}`, Math.sin(time * 3 - i * .65) * .035, Math.sin(time * 2.3 - i * .6) * .07, 0,
      this.mixer ? this.fallbackPose[`Tail_${i}`] : undefined);
    if (this.mixer) {
      this.animateClips(dt, motion, time, boost);
      // Exported Flight uses a .20-radian reference stroke. Retain the seeded
      // amplitude variation as well as its irregular timing and steady holds.
      for (const [name, neutral] of [['Wing_L', -.13], ['Wing_R', .13]]) {
        const { bone, rest } = this.bones[name];
        this.relative.copy(rest).invert().multiply(bone.quaternion); this.euler.setFromQuaternion(this.relative, 'XYZ');
        this.pose(name, this.euler.x, this.euler.y, neutral + (this.euler.z - neutral) * (motion.amplitude > 0 ? motion.amplitude / .2 : 1));
      }
    }
    // Bank/turn and the authoritative weapon timeline are additive gameplay
    // presentation. Imported root, translation, scale and jaw channels cannot
    // override movement, the stable contact height or the muzzle contract.
    this.additive('Wing_L', 0, 0, -bank * .13); this.additive('Wing_R', 0, 0, -bank * .13);
    for (let i = 0; i < 5; i++) this.additive(`Tail_${i}`, 0, -turnRate * .055, 0);
    this.jawState = breath?.stage === 'windup' ? 'windup' : breath?.stage === 'beam' ? 'beam' : firing ? 'fire' : 'idle';
    const jaw = breath?.stage === 'windup' ? -.10 - .22 * breath.progress : breath?.stage === 'beam' ? -.32 : firing ? -.17 : -.025;
    this.pose('Jaw', jaw, 0, 0);
  }
  reset() {
    if (this.disposed) return;
    this.mixer?.stopAllAction();
    for (const [name, action] of this.actions) {
      const weight = name === (this.actions.has('Flight') ? 'Flight' : FALLBACK) ? 1 : 0;
      action.reset().setEffectiveWeight(weight).play(); this.weights.set(name, weight);
    }
    if (this.mixer) this.mixer.time = 0;
    for (const { bone, rest } of Object.values(this.bones)) bone.quaternion.copy(rest);
    for (const name of CLIP_BONES) { this.clipPose[name].copy(this.bones[name].rest); this.fallbackPose[name].copy(this.bones[name].rest); }
    this.cadence.reset(); this.motionClock = 0; this.lastTime = 0; this.boostWeight = 0;
    this.state = 'Flight'; this.transitions = 0; this.jawState = 'idle';
    this.motionState = { ...this.cadence.sample(0), bodyLift: 0, boostWeight: 0 };
  }
  snapshot() {
    return { mode: this.mixer ? 'exported-clips' : 'procedural', state: this.mixer ? this.state : this.motionState.mode === 'glide' ? 'Glide' : this.boostWeight > .5 ? 'Boost' : 'Flight',
      clips: [...this.actions.keys()].filter(name => name !== FALLBACK),
      weights: Object.fromEntries(this.weights), missingClips: CLIP_STATES.filter(name => !this.actions.has(name)),
      partialClips: Object.fromEntries(Object.entries(this.partialClips).map(([name, bones]) => [name, [...bones]])),
      ignoredTracks: [...this.ignoredTracks], transitions: this.transitions, blendSeconds: this.blendSeconds,
      jaw: this.jawState, rootMotion: 'ignored; gameplay owns movement', disposed: this.disposed };
  }
  dispose() {
    if (this.disposed) return;
    this.reset(); this.mixer?.stopAllAction(); this.mixer?.uncacheRoot(this.model);
    this.actions.clear(); this.weights.clear(); this.disposed = true;
  }
}
