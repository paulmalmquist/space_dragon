import { HERO_EVENT } from '../traversal/hero';
import type { HeroState } from '../traversal/hero';

/**
 * Synthesised traversal sounds. Opt-in with the page's sound toggle, bounded in voices,
 * silent while paused and built from oscillators and noise: no recordings or asset files.
 */
export function createHeroAudio() {
  let context: AudioContext | undefined;
  let master: GainNode | undefined;
  let noise: AudioBuffer | undefined;
  let wind: { gain: GainNode; filter: BiquadFilterNode; source: AudioBufferSourceNode } | undefined;
  let enabled = false;
  let paused = false;
  let voices = 0;
  let stepClock = 0;
  let played = 0;
  const MAX_VOICES = 10;

  function ensure(): AudioContext | undefined {
    if (context) return context;
    const Constructor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) return undefined;
    try {
      context = new Constructor();
      master = context.createGain();
      master.gain.value = 0.55;
      master.connect(context.destination);
      noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const data = noise.getChannelData(0);
      let seed = 4711;
      for (let index = 0; index < data.length; index++) { seed = (seed * 1664525 + 1013904223) >>> 0; data[index] = seed / 2147483648 - 1; }
    } catch { context = undefined; }
    return context;
  }
  function voice(build: (ctx: AudioContext, out: GainNode, now: number) => number) {
    const ctx = ensure();
    if (!ctx || !master || !enabled || paused || voices >= MAX_VOICES) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const out = ctx.createGain();
    out.connect(master);
    voices++; played++;
    const duration = build(ctx, out, ctx.currentTime);
    window.setTimeout(() => { voices--; try { out.disconnect(); } catch { /* already released */ } }, duration * 1000 + 80);
  }
  function tone(from: number, to: number, seconds: number, level: number, type: OscillatorType = 'sine', delay = 0) {
    voice((ctx, out, now) => {
      const oscillator = ctx.createOscillator();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(from, now + delay);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + delay + seconds);
      out.gain.setValueAtTime(0.0001, now + delay);
      out.gain.exponentialRampToValueAtTime(level, now + delay + 0.012);
      out.gain.exponentialRampToValueAtTime(0.0001, now + delay + seconds);
      oscillator.connect(out);
      oscillator.start(now + delay); oscillator.stop(now + delay + seconds + 0.02);
      return delay + seconds;
    });
  }
  function hiss(seconds: number, level: number, frequency: number, q = 0.8, type: BiquadFilterType = 'bandpass') {
    voice((ctx, out, now) => {
      if (!noise) return 0;
      const source = ctx.createBufferSource();
      source.buffer = noise;
      const filter = ctx.createBiquadFilter();
      filter.type = type; filter.frequency.value = frequency; filter.Q.value = q;
      out.gain.setValueAtTime(level, now);
      out.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
      source.connect(filter); filter.connect(out);
      source.start(now, (played * 0.137) % 0.8, seconds + 0.02);
      return seconds;
    });
  }
  function setWind(level: number, frequency: number) {
    const ctx = context;
    if (!ctx || !master || !noise) return;
    if (!wind) {
      if (level <= 0.001) return;
      const source = ctx.createBufferSource();
      source.buffer = noise; source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass'; filter.Q.value = 0.6;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      source.connect(filter); filter.connect(gain); gain.connect(master);
      source.start();
      wind = { gain, filter, source };
    }
    wind.gain.gain.setTargetAtTime(level, ctx.currentTime, 0.12);
    wind.filter.frequency.setTargetAtTime(frequency, ctx.currentTime, 0.12);
  }

  return {
    setEnabled(value: boolean) {
      enabled = value;
      if (value) ensure(); else setWind(0, 500);
    },
    setPaused(value: boolean) { paused = value; if (value) setWind(0, 500); },
    /** React to one rendered frame's hero events and motion. */
    update(hero: HeroState, events: number, dt: number) {
      if (!enabled || paused) return;
      if (events & HERO_EVENT.jump) { tone(230, 430, 0.13, 0.07); hiss(0.1, 0.03, 1800); }
      if (events & HERO_EVENT.hop) { hiss(0.3, 0.11, 2400, 0.5, 'highpass'); tone(170, 80, 0.26, 0.09, 'triangle'); }
      if (events & HERO_EVENT.bounce) { tone(150, 520, 0.22, 0.1); tone(520, 300, 0.2, 0.05, 'sine', 0.2); }
      if (events & HERO_EVENT.attach) { tone(820, 1650, 0.08, 0.07, 'triangle'); hiss(0.07, 0.05, 5200, 2); }
      if (events & HERO_EVENT.release) hiss(0.22, 0.05, 900, 0.5);
      if (events & HERO_EVENT.land) { tone(120, 46, 0.17, Math.min(0.2, 0.05 + hero.impact * 0.008)); hiss(0.12, Math.min(0.08, 0.02 + hero.impact * 0.003), 420); }
      if (events & HERO_EVENT.catch) { tone(700, 330, 0.3, 0.07, 'triangle'); }
      if (events & HERO_EVENT.recover) { tone(330, 660, 0.22, 0.06, 'triangle'); }
      const speed = Math.hypot(hero.vx, hero.vy, hero.vz);
      if (hero.mode === 'ground' && speed > 1) {
        stepClock -= dt;
        if (stepClock <= 0) { stepClock = Math.max(0.2, 0.36 - speed * 0.014); hiss(0.05, 0.035, 260 + (played % 3) * 40, 1.2); }
      } else stepClock = 0.08;
      setWind(Math.max(0, Math.min(0.11, (speed - 6) * 0.011)), 380 + speed * 55);
    },
    /** Two rising notes for a practice spark; three when the last one is found. */
    chime(complete: boolean) {
      tone(880, 884, 0.2, 0.07, 'triangle');
      tone(1320, 1326, 0.28, 0.07, 'triangle', 0.09);
      if (complete) tone(1760, 1768, 0.5, 0.08, 'triangle', 0.2);
    },
    snapshot: () => ({ enabled, paused, played, voices, context: context?.state ?? 'none' }),
    dispose() {
      enabled = false;
      try { wind?.source.stop(); } catch { /* not started */ }
      void context?.close().catch(() => {});
      context = undefined; wind = undefined;
    },
  };
}
export type HeroAudio = ReturnType<typeof createHeroAudio>;
