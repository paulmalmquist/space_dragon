import { SAMPLE_FILES, SAMPLE_CUES, loadSoundSample } from './sound-samples.js';
// Original synthesis with opt-in, same-origin Sonniss layers and synthesis fallback.
// Gains feed a compressor and a bounded soft ceiling, not the speakers directly.
export const AUDIO_MIX = Object.freeze({ master: .72, maxVoices: 24, maxBeds: 6, maxReleases: 6, ceiling: .88, noiseSeconds: 2 });
const layer = (kind, start, end, gain, duration, extras = {}) => Object.freeze({ kind, start, end, gain, duration, ...extras });
export const SOUND_PROFILES = Object.freeze({
  fire: [layer('triangle', 260, 52, .19, .18), layer('noise', 2400, 620, .18, .12, { filter: 'bandpass', q: .8 }), layer('sawtooth', 1180, 190, .045, .075)],
  roar: [layer('sawtooth', 56, 115, .28, .72, { attack: .14, hold: .6 }), layer('triangle', 108, 67, .24, .8, { attack: .08, hold: .6 }), layer('noise', 600, 1650, .32, .75, { filter: 'bandpass', q: 2.4, attack: .14, hold: .7 }), layer('noise', 2400, 850, .16, .65, { filter: 'bandpass', q: 1.8, attack: .1, hold: .7 })],
  breath: [layer('sine', 77, 34, .24, 1.1, { hold: .75 }), layer('noise', 1100, 190, .29, 1.15, { filter: 'lowpass', attack: .045, hold: .8 }), layer('noise', 3100, 650, .14, 1.02, { filter: 'bandpass', delay: .04, attack: .035, hold: .75 }), layer('sawtooth', 170, 62, .09, .95, { hold: .7 }), layer('noise', 5600, 1800, .06, .19, { filter: 'highpass', delay: .035 })],
  hit: [layer('noise', 2500, 750, .19, .13, { filter: 'bandpass' }), layer('sine', 230, 64, .17, .22), layer('triangle', 880, 300, .045, .17)],
  hurt: [layer('sine', 72, 30, .28, .48), layer('noise', 1700, 160, .22, .36, { filter: 'lowpass' }), layer('triangle', 220, 85, .075, .27)],
  crash: [layer('noise', 2800, 120, .38, 1.7, { filter: 'lowpass', attack: .006 }), layer('sine', 70, 22, .3, 1.8), layer('noise', 3600, 450, .2, .7, { filter: 'bandpass' }), layer('noise', 1900, 180, .27, 1.4, { filter: 'lowpass', delay: .55 }), layer('triangle', 130, 30, .17, 1.1, { delay: .55 })],
  disable: [layer('noise', 1700, 120, .34, 1.25, { filter: 'lowpass', attack: .006 }), layer('sine', 61, 23, .3, 1.1), layer('noise', 2500, 500, .2, .43, { filter: 'bandpass' }), layer('triangle', 1130, 270, .06, .55, { delay: .05 }), layer('noise', 4200, 900, .07, .9, { filter: 'highpass', delay: .16, attack: .03 })],
  roll: [layer('noise', 1900, 420, .18, .68, { filter: 'bandpass', attack: .045 }), layer('sine', 125, 64, .085, .54)],
  break: [layer('noise', 1800, 350, .21, .62, { filter: 'lowpass', attack: .025 }), layer('triangle', 110, 43, .13, .42), layer('noise', 3800, 1700, .07, .17, { filter: 'highpass' })],
  boost: [layer('noise', 480, 2400, .16, .7, { filter: 'bandpass', attack: .11 }), layer('sine', 66, 145, .12, .58, { attack: .09 })],
  acceleration: [layer('noise', 550, 2100, .16, .64, { filter: 'bandpass', attack: .08 }), layer('triangle', 80, 155, .1, .52, { attack: .075 })],
  'warning-tracking': [layer('sine', 440, 620, .065, .16)],
  'warning-locked': [layer('triangle', 810, 1010, .065, .19), layer('triangle', 810, 1010, .055, .19, { delay: .22 })],
  'warning-incoming': [layer('square', 1080, 680, .045, .2), layer('sine', 250, 170, .09, .35), layer('triangle', 1080, 820, .065, .22, { delay: .26 })],
  victory: [layer('triangle', 330, 330, .085, .72), layer('triangle', 440, 440, .085, .72, { delay: .14 }), layer('triangle', 554, 554, .085, .72, { delay: .28 }), layer('triangle', 660, 660, .085, .86, { delay: .48 }), layer('sine', 110, 220, .07, .85)],
});
for (const profile of Object.values(SOUND_PROFILES)) Object.freeze(profile);
const smooth = (param, value, now, seconds = .02) => {
  param.cancelScheduledValues(now);
  param.setTargetAtTime(value, now, seconds);
};
const defaultContext = () => new (globalThis.AudioContext || globalThis.window?.AudioContext)();

export class Audio {
  constructor({ contextFactory = defaultContext, sampleLoader = loadSoundSample } = {}) {
    this.createContext = contextFactory; this.ctx = null; this.muted = true; this.paused = true; this.disposed = false;
    this.voices = new Set(); this.beds = new Set(); this.releasing = new Set(); this.timers = new Set(); this.graph = [];
    this.counters = Object.create(null); this.resultUntil = 0; this.engineActive = false; this.wasBoosting = false;
    this.accelerationPressure = 0; this.wasAccelerating = false; this.accelerationAfter = 0;
    this.sampleLoader = sampleLoader; this.samples = new Map(); this.sampleErrors = 0;
    this.sampleLoads = null; this.sampleAbort = new AbortController(); this.sampleCounters = Object.create(null);
  }
  unlock() {
    if (this.muted || this.disposed) return;
    try {
      if (!this.ctx) {
        this.ctx = this.createContext();
        const ctx = this.ctx;
        this.master = ctx.createGain(); this.master.gain.value = 0;
        this.compressor = ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -12; this.compressor.knee.value = 7; this.compressor.ratio.value = 16;
        this.compressor.attack.value = .003; this.compressor.release.value = .18;
        this.ceiling = ctx.createWaveShaper();
        const curve = new Float32Array(2049);
        for (let i = 0; i < curve.length; i++) curve[i] = AUDIO_MIX.ceiling * Math.tanh(1.5 * (i / (curve.length - 1) * 2 - 1));
        this.ceiling.curve = curve; this.ceiling.oversample = '2x';
        this.compressor.connect(this.master); this.master.connect(this.ceiling); this.ceiling.connect(ctx.destination);
        this.graph.push(this.compressor, this.master, this.ceiling);
        this.noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * AUDIO_MIX.noiseSeconds), ctx.sampleRate);
        const samples = this.noiseBuffer.getChannelData(0);
        let seed = 0x51d044, previous = 0;
        for (let i = 0; i < samples.length; i++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          previous = previous * .32 + (seed / 4294967296 * 2 - 1) * .68;
          samples[i] = previous;
        }
      }
      if (this.ctx.state === 'suspended' && this.ctx.resume) void this.ctx.resume().catch(() => {});
      this.loadSamples();
      if (!this.paused) { this.startBeds(); smooth(this.master.gain, AUDIO_MIX.master, this.ctx.currentTime); }
    } catch {
      this.muted = true; this.clearTones(); this.stopBeds();
      if (this.master && this.ctx) this.master.gain.value = 0;
    }
  }
  loadSamples() {
    if (this.sampleLoads || this.disposed || !this.ctx?.decodeAudioData) return;
    const ctx = this.ctx;
    this.sampleLoads = Promise.all(Object.entries(SAMPLE_FILES).map(async ([id, filename]) => {
      try {
        const buffer = await this.sampleLoader(ctx, filename, this.sampleAbort.signal);
        if (!this.disposed) this.samples.set(id, buffer);
      } catch { if (!this.disposed) this.sampleErrors++; }
    }));
    // Loading never replays an old event; only the next live cue uses its buffer.
  }
  setMuted(value) {
    this.muted = Boolean(value);
    if (!this.muted) return;
    this.clearTones(); this.stopBeds(); this.wasBoosting = false;
    if (this.master && this.ctx) smooth(this.master.gain, 0, this.ctx.currentTime, .004);
  }
  release(record, immediate = false) {
    if (record.released && !immediate) return;
    if (!immediate && this.releasing.size >= AUDIO_MIX.maxReleases) this.release(this.releasing.values().next().value, true);
    record.released = true;
    this.voices.delete(record); this.beds.delete(record);
    const now = this.ctx.currentTime;
    if (!immediate) {
      record.gain.gain.cancelScheduledValues(now);
      record.gain.gain.setTargetAtTime(.0001, now, .002);
      this.releasing.add(record);
    }
    try { record.source.stop(immediate ? now : now + .012); } catch {}
    if (immediate) record.finish();
  }
  voice(profile, pan = 0, group = null) {
    const ctx = this.ctx, now = ctx.currentTime, when = now + (profile.delay || 0), end = when + profile.duration;
    while (this.voices.size >= AUDIO_MIX.maxVoices) this.release(this.voices.values().next().value);
    const source = ['noise', 'sample'].includes(profile.kind) ? ctx.createBufferSource() : ctx.createOscillator();
    const gain = ctx.createGain(), nodes = [source, gain];
    let output = source;
    if (profile.kind === 'sample') {
      source.buffer = profile.buffer;
    } else if (profile.kind === 'noise') {
      source.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter(); filter.type = profile.filter || 'lowpass'; filter.Q.value = profile.q || .65;
      filter.frequency.setValueAtTime(profile.start, when); filter.frequency.exponentialRampToValueAtTime(profile.end, end);
      output.connect(filter); output = filter; nodes.push(filter);
    } else {
      source.type = profile.kind; source.frequency.setValueAtTime(profile.start, when); source.frequency.exponentialRampToValueAtTime(profile.end, end);
    }
    output.connect(gain); output = gain;
    if (pan && ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner(); panner.pan.value = pan; output.connect(panner); output = panner; nodes.push(panner);
    }
    output.connect(this.compressor);
    gain.gain.setValueAtTime(.0001, when);
    gain.gain.exponentialRampToValueAtTime(profile.gain, when + Math.min(profile.attack || .004, profile.duration * .4));
    if (profile.hold) gain.gain.setValueAtTime(profile.gain, when + profile.duration * profile.hold);
    gain.gain.exponentialRampToValueAtTime(.0001, end);
    const record = { source, gain, nodes, group, released: false, finish: null };
    record.finish = () => { this.voices.delete(record); this.releasing.delete(record); for (const node of nodes) node.disconnect(); };
    source.onended = record.finish; this.voices.add(record);
    source.start(when); source.stop(end + .015);
  }
  play(name, { pan = 0, allowPaused = false } = {}) {
    if (!this.ctx || this.ctx.state === 'closed' || this.muted || this.disposed || (this.paused && !allowPaused)) return false;
    const profile = SOUND_PROFILES[name]; if (!profile) return false;
    this.counters[name] = (this.counters[name] || 0) + 1;
    const cue = SAMPLE_CUES[name], buffer = cue && this.samples.get(cue.id);
    const boundedPan = Math.max(-.7, Math.min(.7, pan));
    for (const item of profile) this.voice(buffer ? { ...item, gain: item.gain * .45 } : item, boundedPan, name);
    if (buffer) {
      this.voice({ kind: 'sample', buffer, gain: cue.gain, duration: Math.min(cue.duration, buffer.duration), attack: .004, hold: .72 }, boundedPan, name);
      this.sampleCounters[name] = (this.sampleCounters[name] || 0) + 1;
    }
    return true;
  }
  tone(start, end, length, volume, type = 'sine') {
    if (!this.ctx || this.ctx.state === 'closed' || this.muted || this.disposed || this.paused) return;
    this.voice(layer(type, Math.max(1, start), Math.max(1, end), Math.max(.0001, Math.min(.3, volume)), Math.max(.01, Math.min(2, length))));
  }
  fire() { return this.play('fire'); }
  roar() { return this.play('roar'); }
  breath() { return this.play('breath'); }
  stopBreath() { for (const voice of [...this.voices]) if (['roar', 'breath'].includes(voice.group)) this.release(voice); }
  hit() { return this.play('hit'); }
  hurt() { return this.play('hurt'); }
  disable() { return this.play('disable'); }
  roll(direction = 0) { return this.play('roll', { pan: direction * .55 }); }
  breakTurn(direction = 0) { return this.play('break', { pan: direction * .4 }); }
  warning(level) { return this.play('warning-' + level); }
  crash() {
    if (!this.ctx || this.muted || this.disposed) return false;
    this.resultUntil = this.ctx.currentTime + 3;
    smooth(this.master.gain, AUDIO_MIX.master, this.ctx.currentTime, .006);
    return this.play('crash', { allowPaused: true });
  }
  victory() {
    if (!this.ctx || this.muted || this.disposed) return false;
    this.resultUntil = this.ctx.currentTime + 1.4;
    smooth(this.master.gain, AUDIO_MIX.master, this.ctx.currentTime, .01);
    return this.play('victory', { allowPaused: true });
  }
  startBeds() {
    if (this.engineActive || !this.ctx || this.muted || this.disposed || this.paused) return;
    const ctx = this.ctx;
    this.engine = ctx.createOscillator(); this.engine.type = 'sawtooth';
    this.sub = ctx.createOscillator(); this.sub.type = 'triangle';
    this.wind = ctx.createBufferSource(); this.wind.buffer = this.noiseBuffer; this.wind.loop = true;
    this.engineGain = ctx.createGain(); this.subGain = ctx.createGain(); this.windGain = ctx.createGain();
    this.filter = ctx.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.Q.value = .6;
    this.windFilter = ctx.createBiquadFilter(); this.windFilter.type = 'bandpass'; this.windFilter.Q.value = .45;
    this.engine.connect(this.filter); this.filter.connect(this.engineGain); this.engineGain.connect(this.compressor);
    this.sub.connect(this.subGain); this.subGain.connect(this.compressor);
    this.wind.connect(this.windFilter); this.windFilter.connect(this.windGain); this.windGain.connect(this.compressor);
    for (const [source, gain, extras] of [[this.engine, this.engineGain, [this.filter]], [this.sub, this.subGain, []], [this.wind, this.windGain, [this.windFilter]]]) {
      gain.gain.value = 0;
      const nodes = [source, gain, ...extras], record = { source, gain, nodes, released: false, finish: null };
      record.finish = () => { this.beds.delete(record); this.releasing.delete(record); for (const node of nodes) node.disconnect(); };
      source.onended = record.finish;
      while (this.beds.size >= AUDIO_MIX.maxBeds) this.release(this.beds.values().next().value, true);
      this.beds.add(record); source.start();
    }
    this.engineActive = true;
  }
  stopBeds() { for (const record of [...this.beds]) this.release(record); this.engineActive = false; }
  clearTones() {
    this.resultUntil = 0;
    this.accelerationPressure = 0; this.wasAccelerating = false; this.accelerationAfter = 0;
    for (const timer of this.timers) clearTimeout(timer); this.timers.clear();
    for (const record of [...this.voices]) this.release(record);
    if (this.ctx && this.master && (this.muted || this.paused)) smooth(this.master.gain, 0, this.ctx.currentTime, .004);
  }
  update(speed, boosting, paused, { turn = 0, acceleration = 0 } = {}) {
    if (!this.ctx || this.ctx.state === 'closed' || this.disposed) { this.paused = Boolean(paused); this.accelerationPressure = 0; this.wasAccelerating = false; return; }
    const nextPaused = Boolean(paused), now = this.ctx.currentTime;
    if (nextPaused && !this.paused) { this.clearTones(); this.stopBeds(); }
    this.paused = nextPaused;
    if (this.muted || this.paused) {
      this.wasBoosting = false; this.accelerationPressure = 0; this.wasAccelerating = false;
      if (!this.resultUntil || this.resultUntil <= now || this.muted) smooth(this.master.gain, 0, now, .006);
      return;
    }
    this.startBeds(); smooth(this.master.gain, AUDIO_MIX.master, now, .025);
    const velocity = Math.max(0, Math.min(180, Number.isFinite(speed) ? speed : 0));
    const turnWeight = Math.min(1, Math.abs(Number.isFinite(turn) ? turn : 0) / 2);
    const increase = Math.max(0, Math.min(80, Number.isFinite(acceleration) ? acceleration : 0));
    const pressure = this.accelerationPressure = Math.min(1, increase / 36);
    const accelerating = increase > 8;
    smooth(this.engine.frequency, 35 + velocity * .55 + (boosting ? 18 : 0) + pressure * 12, now, .12);
    smooth(this.sub.frequency, 22 + velocity * .22, now, .15);
    smooth(this.filter.frequency, 170 + velocity * 1.4 + (boosting ? 230 : 0) + pressure * 280, now, .1);
    smooth(this.windFilter.frequency, 300 + velocity * 9 + turnWeight * 380 + pressure * 600, now, .16);
    smooth(this.engineGain.gain, (boosting ? .052 : .022) + pressure * .022, now, .12);
    smooth(this.subGain.gain, (boosting ? .038 : .022) + pressure * .012, now, .1);
    smooth(this.windGain.gain, .006 + velocity / 180 * .035 + turnWeight * .012 + pressure * .035, now, .15);
    if (boosting && !this.wasBoosting) this.play('boost');
    // One intake surge at acceleration onset, not a new voice on every frame.
    if (accelerating && !this.wasAccelerating && !boosting && now >= this.accelerationAfter && this.play('acceleration')) this.accelerationAfter = now + 1.2;
    this.wasBoosting = Boolean(boosting);
    this.wasAccelerating = accelerating;
  }
  snapshot() {
    return { muted: this.muted, paused: this.paused, contextState: this.ctx?.state || 'uninitialized', activeVoices: this.voices.size,
      pendingTimers: this.timers.size, engineActive: this.engineActive, bedSources: this.beds.size, releaseVoices: this.releasing.size, maxVoices: AUDIO_MIX.maxVoices,
      master: AUDIO_MIX.master, outputCeiling: AUDIO_MIX.ceiling, profile: 'sonniss-layered-flight-v1', accelerationPressure: this.accelerationPressure,
      samplesLoaded: this.samples.size, sampleErrors: this.sampleErrors, sampleCounters: { ...this.sampleCounters }, counters: { ...this.counters }, disposed: this.disposed };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.clearTones();
    this.sampleAbort.abort(); this.samples.clear();
    for (const record of [...this.beds]) this.release(record, true);
    for (const record of [...this.releasing]) this.release(record, true);
    this.engineActive = false;
    for (const node of this.graph) node.disconnect(); this.graph.length = 0;
    this.noiseBuffer = null;
    if (this.ctx && this.ctx.state !== 'closed' && this.ctx.close) void this.ctx.close().catch(() => {});
  }
}

