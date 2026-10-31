import test from 'node:test';
import assert from 'node:assert/strict';
import { Audio, AUDIO_MIX, SOUND_PROFILES } from '../src/prototypes/dogfight/assets/audio.js';

class Param {
  constructor(value = 0) { this.value = value; this.events = []; }
  cancelScheduledValues(time) { this.events.push(['cancel', time]); }
  setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]); }
  setTargetAtTime(value, time, constant) { this.value = value; this.events.push(['target', value, time, constant]); }
  exponentialRampToValueAtTime(value, time) { assert.ok(value > 0); this.value = value; this.events.push(['ramp', value, time]); }
}
class GraphNode {
  constructor(ctx, kind) {
    this.ctx = ctx; this.kind = kind; this.outputs = []; this.disconnected = false;
    for (const name of ['gain', 'frequency', 'Q', 'pan', 'threshold', 'knee', 'ratio', 'attack', 'release']) this[name] = new Param();
    ctx.nodes.push(this);
  }
  connect(node) { this.outputs.push(node); return node; }
  disconnect() { this.outputs = []; this.disconnected = true; }
}
class Source extends GraphNode {
  start(when = this.ctx.currentTime) { assert.equal(this.started, undefined); this.started = when; this.ctx.sources.add(this); }
  stop(when = this.ctx.currentTime) {
    this.ends = when;
    if (when <= this.ctx.currentTime) this.finish();
  }
  finish() { if (this.ended) return; this.ended = true; this.ctx.sources.delete(this); this.onended?.(); }
}
class Context {
  constructor() { this.nodes = []; this.sources = new Set(); this.currentTime = 0; this.sampleRate = 8000; this.state = 'running'; this.buffers = []; this.destination = new GraphNode(this, 'destination'); }
  createGain() { return new GraphNode(this, 'gain'); }
  createDynamicsCompressor() { return new GraphNode(this, 'compressor'); }
  createWaveShaper() { return new GraphNode(this, 'ceiling'); }
  createBiquadFilter() { return new GraphNode(this, 'filter'); }
  createStereoPanner() { return new GraphNode(this, 'pan'); }
  createOscillator() { return new Source(this, 'oscillator'); }
  createBufferSource() { return new Source(this, 'noise'); }
  createBuffer(channels, length, sampleRate) {
    const data = new Float32Array(length), buffer = { channels, length, sampleRate, getChannelData: () => data };
    this.buffers.push(buffer); return buffer;
  }
  advance(seconds) { this.currentTime += seconds; for (const source of [...this.sources]) if (source.ends <= this.currentTime) source.finish(); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}
function activeAudio() {
  const ctx = new Context(), audio = new Audio({ contextFactory: () => ctx });
  audio.setMuted(false); audio.unlock(); audio.update(54, false, false);
  return { ctx, audio };
}

test('recordings load only on opt-in, never replay stale cues and share voice cleanup', async () => {
  const ctx = new Context(); ctx.decodeAudioData = () => {};
  const pending = []; let loads = 0;
  const audio = new Audio({ contextFactory: () => ctx, sampleLoader: () => {
    loads++; return new Promise(resolve => pending.push(resolve));
  } });
  audio.unlock(); assert.equal(loads, 0);
  audio.setMuted(false); audio.unlock(); audio.update(54, false, false);
  audio.roar(); audio.update(0, false, true); ctx.advance(.02);
  assert.equal(loads, 5);
  pending.forEach(resolve => resolve({ duration: 2 })); await audio.sampleLoads;
  assert.equal(audio.snapshot().samplesLoaded, 5);
  assert.equal(audio.voices.size, 0); assert.deepEqual(audio.snapshot().sampleCounters, {});
  audio.update(54, false, false); audio.roar(); audio.breath();
  assert.equal(audio.snapshot().sampleCounters.roar, 1);
  assert.equal([...audio.voices].filter(v => v.source.buffer?.duration === 2).length, 2);
  audio.stopBreath(); ctx.advance(.02); assert.equal(audio.voices.size, 0);
  for (let i = 0; i < 60; i++) audio.crash();
  assert.ok(audio.voices.size <= AUDIO_MIX.maxVoices);
  audio.setMuted(true); ctx.advance(.02); assert.equal(ctx.sources.size, 0);
  audio.setMuted(false); audio.unlock(); assert.equal(loads, 5);
  audio.dispose(); assert.equal(ctx.sources.size, 0); assert.equal(audio.samples.size, 0);
});

test('missing recordings retain synthesis and disposed loads cannot repopulate buffers', async () => {
  const ctx = new Context(); ctx.decodeAudioData = () => {};
  const audio = new Audio({ contextFactory: () => ctx, sampleLoader: async () => { throw new Error('404'); } });
  audio.setMuted(false); audio.unlock(); audio.update(54, false, false); await audio.sampleLoads;
  assert.equal(audio.snapshot().sampleErrors, 5); assert.equal(audio.roar(), true);
  assert.equal(audio.snapshot().sampleCounters.roar, undefined); audio.dispose();
  const other = new Context(); other.decodeAudioData = () => {};
  const pending = [];
  const delayed = new Audio({ contextFactory: () => other, sampleLoader: (_ctx, _file, signal) => {
    pending.push({ signal }); return new Promise(resolve => { pending.at(-1).resolve = resolve; });
  } });
  delayed.setMuted(false); delayed.unlock(); delayed.dispose();
  pending.forEach(({ signal, resolve }) => { assert.equal(signal.aborted, true); resolve({ duration: 2 }); });
  await delayed.sampleLoads; assert.equal(delayed.samples.size, 0); assert.equal(other.sources.size, 0);
});

test('sound stays opt-in; unavailable audio fails quietly without a graph or timer', () => {
  let created = 0;
  const audio = new Audio({ contextFactory: () => { created++; throw new Error('unavailable'); } });
  audio.unlock(); audio.fire(); audio.breath(); audio.victory();
  assert.equal(created, 0); assert.equal(audio.snapshot().contextState, 'uninitialized');
  audio.setMuted(false); audio.unlock();
  assert.equal(created, 1); assert.equal(audio.muted, true); assert.equal(audio.voices.size, 0); assert.equal(audio.timers.size, 0);
  audio.dispose(); audio.unlock(); assert.equal(created, 1);
});

test('layered profiles mix reusable noise and body through compressor, gain and soft ceiling', () => {
  const { ctx, audio } = activeAudio();
  for (const name of ['fire', 'breath', 'hurt', 'disable', 'roll', 'break']) {
    assert.ok(SOUND_PROFILES[name].some(layer => layer.kind === 'noise'));
    assert.ok(SOUND_PROFILES[name].some(layer => layer.kind !== 'noise'));
    assert.ok(SOUND_PROFILES[name].some(layer => layer.start >= 1000), name + ' needs audible midrange texture');
  }
  audio.fire(); audio.breath(); audio.disable();
  assert.equal(ctx.buffers.length, 1);
  assert.ok([...audio.voices].filter(v => v.source.kind === 'noise').every(v => v.source.buffer === audio.noiseBuffer));
  assert.deepEqual(audio.compressor.outputs, [audio.master]);
  assert.deepEqual(audio.master.outputs, [audio.ceiling]); assert.deepEqual(audio.ceiling.outputs, [ctx.destination]);
  assert.ok(audio.compressor.ratio.value >= 12); assert.ok(audio.compressor.attack.value <= .005);
  assert.ok(Math.max(...audio.ceiling.curve) < .9); assert.ok(Math.min(...audio.ceiling.curve) > -.9);
  assert.ok(audio.master.gain.events.some(event => event[0] === 'target'));
  assert.equal(audio.snapshot().counters.breath, 1); audio.dispose();
});

test('rapid effects keep active and releasing sources bounded and clean every node on disposal', () => {
  const { ctx, audio } = activeAudio();
  for (let i = 0; i < 120; i++) { audio.fire(); audio.disable(); audio.warning('incoming'); }
  const snapshot = audio.snapshot();
  assert.ok(snapshot.activeVoices <= AUDIO_MIX.maxVoices); assert.ok(snapshot.releaseVoices <= AUDIO_MIX.maxReleases);
  assert.ok(ctx.sources.size <= AUDIO_MIX.maxVoices + AUDIO_MIX.maxReleases + 3);
  assert.equal(snapshot.pendingTimers, 0); assert.equal(snapshot.counters.fire, 120);
  audio.dispose(); assert.equal(ctx.sources.size, 0); assert.equal(ctx.state, 'closed');
  assert.equal(audio.voices.size, 0); assert.equal(audio.beds.size, 0); assert.equal(audio.releasing.size, 0);
  assert.ok(ctx.nodes.filter(node => node.kind !== 'destination').every(node => node.disconnected));
  audio.dispose(); assert.equal(audio.snapshot().disposed, true);
});

test('pause and mute cancel transients and continuous sound; resume never duplicates the bed', () => {
  const { ctx, audio } = activeAudio();
  audio.breath(); audio.update(148, true, false, { turn: 1 });
  assert.equal(audio.snapshot().engineActive, true); assert.equal(audio.snapshot().bedSources, 3);
  assert.equal(audio.snapshot().counters.boost, 1);
  for (let i = 0; i < 10; i++) { audio.unlock(); audio.update(148, true, false); }
  assert.equal(audio.snapshot().bedSources, 3); assert.equal(audio.snapshot().counters.boost, 1);
  audio.update(0, false, true); assert.equal(audio.snapshot().activeVoices, 0); assert.equal(audio.snapshot().engineActive, false);
  assert.equal(audio.fire(), false); ctx.advance(.02); assert.equal(ctx.sources.size, 0);
  audio.update(54, false, false); assert.equal(audio.snapshot().bedSources, 3);
  audio.roll(-1); assert.equal(audio.snapshot().counters.roll, 1);
  audio.setMuted(true); assert.equal(audio.snapshot().engineActive, false); assert.equal(audio.snapshot().activeVoices, 0);
  assert.equal(audio.breakTurn(1), false); ctx.advance(.02); assert.equal(ctx.sources.size, 0);
  for (let i = 0; i < 20; i++) { audio.setMuted(false); audio.unlock(); audio.update(54, false, false); audio.update(0, false, true); }
  ctx.advance(.02); assert.equal(ctx.sources.size, 0); audio.dispose();
});

test('victory uses the audio clock while paused; an explicit clear or mute cancels the entire tail', () => {
  const { ctx, audio } = activeAudio();
  audio.update(0, false, true); ctx.advance(.02);
  assert.equal(audio.victory(), true); assert.equal(audio.voices.size, SOUND_PROFILES.victory.length);
  const events = [...audio.voices].map(v => v.source.started - ctx.currentTime);
  assert.ok(events.includes(.48)); assert.equal(audio.timers.size, 0);
  audio.update(0, false, true); assert.equal(audio.voices.size, SOUND_PROFILES.victory.length);
  audio.clearTones(); ctx.advance(.02); assert.equal(ctx.sources.size, 0);
  audio.victory(); audio.setMuted(true); ctx.advance(.02); assert.equal(ctx.sources.size, 0);
  audio.dispose();
});

test('maneuver spatial cues, warning identities and snapshot copies stay independent', () => {
  const { audio } = activeAudio();
  audio.roll(-1); audio.breakTurn(1); audio.warning('tracking'); audio.warning('locked'); audio.warning('incoming');
  const panners = [...audio.voices].flatMap(v => v.nodes).filter(n => n.kind === 'pan');
  assert.ok(panners.some(p => p.pan.value < 0)); assert.ok(panners.some(p => p.pan.value > 0));
  const snapshot = audio.snapshot();
  for (const key of ['roll', 'break', 'warning-tracking', 'warning-locked', 'warning-incoming']) assert.equal(snapshot.counters[key], 1);
  snapshot.counters.roll = 99; assert.equal(audio.snapshot().counters.roll, 1);
  audio.dispose();
});

test('actual acceleration adds intake pressure and one surge throughout a held speed increase', () => {
  const { ctx, audio } = activeAudio();
  const steady = { pitch: audio.engine.frequency.value, intake: audio.filter.frequency.value, wind: audio.windGain.gain.value };
  audio.update(54, false, false, { acceleration: 22 });
  assert.ok(audio.snapshot().accelerationPressure > .6);
  assert.ok(audio.engine.frequency.value > steady.pitch); assert.ok(audio.filter.frequency.value > steady.intake);
  assert.ok(audio.windGain.gain.value > steady.wind); assert.equal(audio.snapshot().counters.acceleration, 1);
  for (let frame = 0; frame < 180; frame++) {
    ctx.advance(1 / 60); audio.update(54 + frame / 10, false, false, { acceleration: 22 });
  }
  assert.equal(audio.snapshot().counters.acceleration, 1);
  assert.equal(audio.snapshot().bedSources, 3); assert.equal(audio.snapshot().pendingTimers, 0);
  audio.update(72, false, false, { acceleration: 0 }); assert.equal(audio.snapshot().accelerationPressure, 0);
  audio.update(72, false, false, { acceleration: 22 }); assert.equal(audio.snapshot().counters.acceleration, 2);
  audio.dispose();
});

test('roar and sustained breath cancel as a group without stopping unrelated voices or engine beds', () => {
  const { ctx, audio } = activeAudio();
  assert.equal(audio.roar(), true); audio.breath(); audio.warning('tracking');
  assert.ok([...audio.voices].some(v => v.group === 'roar'));
  audio.stopBreath(); ctx.advance(.02);
  assert.ok([...audio.voices].every(v => !['roar', 'breath'].includes(v.group)));
  assert.ok([...audio.voices].some(v => v.group === 'warning-tracking'));
  assert.equal(audio.beds.size, 3); assert.equal(audio.snapshot().counters.roar, 1);
  audio.dispose(); assert.equal(ctx.sources.size, 0);
});

test('acceleration ignores braking and invalid data, respects cooldown and resets on pause or mute', () => {
  const { ctx, audio } = activeAudio();
  for (const acceleration of [NaN, Infinity, -30, 0]) {
    audio.update(54, false, false, { acceleration }); assert.equal(audio.snapshot().accelerationPressure, 0);
  }
  assert.equal(audio.snapshot().counters.acceleration, undefined);
  audio.update(55, true, false, { acceleration: 36 });
  assert.equal(audio.snapshot().counters.boost, 1); assert.equal(audio.snapshot().counters.acceleration, undefined);
  audio.update(55, false, false, { acceleration: 0 });
  audio.update(55, false, false, { acceleration: 36 }); assert.equal(audio.snapshot().counters.acceleration, 1);
  ctx.advance(.2); audio.update(55, false, false, { acceleration: 0 });
  audio.update(55, false, false, { acceleration: 36 }); assert.equal(audio.snapshot().counters.acceleration, 1);
  ctx.advance(1.3); audio.update(55, false, false, { acceleration: 36 });
  assert.equal(audio.snapshot().counters.acceleration, 1); // Holding acceleration does not retrigger when cooldown expires.
  audio.update(0, false, true, { acceleration: 36 }); assert.equal(audio.snapshot().accelerationPressure, 0);
  ctx.advance(.02); assert.equal(ctx.sources.size, 0);
  audio.update(55, false, false, { acceleration: 0 });
  const pitch = audio.engine.frequency.value;
  audio.update(55, false, false, { acceleration: 0, zooming: true }); assert.equal(audio.engine.frequency.value, pitch);
  audio.update(55, false, false, { acceleration: 22 }); assert.equal(audio.snapshot().counters.acceleration, 2);
  audio.setMuted(true); assert.equal(audio.snapshot().accelerationPressure, 0);
  ctx.advance(.02); assert.equal(ctx.sources.size, 0); audio.dispose();
});
