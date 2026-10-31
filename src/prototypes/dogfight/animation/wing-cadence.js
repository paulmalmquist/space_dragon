// Visual rhythm only. A seeded schedule makes irregular flaps reproducible at
// every rendering frame rate; sampling never changes flight or encounter state.
function generator(seed) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}
const smooth = value => value * value * (3 - 2 * value);

export class WingCadence {
  constructor(seed = 8147) { this.seed = seed; this.reset(); }
  reset() { this.random = generator(this.seed); this.segments = []; this.duration = 0; }
  appendGroup() {
    const strokes = 2 + Math.floor(this.random() * 3);
    for (let index = 0; index < strokes; index++) {
      const duration = .84 + this.random() * .51;
      this.segments.push({ mode: 'flap', start: this.duration, duration,
        amplitude: .16 + this.random() * .09, downstroke: .34 + this.random() * .12 });
      this.duration += duration;
    }
    const duration = .42 + this.random() * 1.08;
    this.segments.push({ mode: 'glide', start: this.duration, duration, amplitude: 0 });
    this.duration += duration;
  }
  sample(time) {
    time = Number.isFinite(time) ? Math.max(0, time) : 0;
    while (time >= this.duration) this.appendGroup();
    // Long encounters keep an inexpensive, deterministic schedule. Binary
    // search also lets capture tools revisit an earlier frame without drift.
    let low = 0, high = this.segments.length - 1;
    while (low < high) {
      const middle = (low + high) >>> 1, segment = this.segments[middle];
      if (time >= segment.start + segment.duration) low = middle + 1;
      else high = middle;
    }
    const segment = this.segments[low];
    const phase = Math.min(1, (time - segment.start) / segment.duration);
    if (segment.mode === 'glide') return { mode: 'glide', flap: 0, amplitude: 0, phase, duration: segment.duration };
    // Unequal downstroke/recovery timing, with zero angular velocity at each
    // endpoint, lets a real steady-wing beat join the next stroke smoothly.
    const cycle = phase < segment.downstroke ? .5 * smooth(phase / segment.downstroke)
      : .5 + .5 * smooth((phase - segment.downstroke) / (1 - segment.downstroke));
    return { mode: 'flap', flap: Math.sin(cycle * Math.PI * 2) * segment.amplitude,
      amplitude: segment.amplitude, phase, duration: segment.duration };
  }
}
