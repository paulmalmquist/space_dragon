// Encounter-only authoritative state. No renderer, timers, storage or learner data.
export const RESERVED_FLIGHT_CODES = Object.freeze([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyW', 'KeyA', 'KeyD', 'KeyZ', 'KeyQ', 'KeyE', 'KeyB', 'KeyX', 'KeyR', 'KeyF', 'KeyM',
  'ShiftLeft', 'ShiftRight', 'Space', 'Escape', 'Enter', 'F1',
]);
export const WORDS = Object.freeze(['LION', 'PINK', 'COIN', 'KING', 'SONG']);
export const BREATH_CONFIG = Object.freeze({
  range: 650, lockRadius: .12, acquireSeconds: .65, graceSeconds: 1.2,
  windupSeconds: .65, beamSeconds: 1.1, burstSeconds: 1.75, maxStep: .1,
});

export function validateWords(words) {
  if (!Array.isArray(words) || !words.length || new Set(words).size !== words.length || words.some(word =>
    typeof word !== 'string' || !/^[A-Z]{4}$/.test(word) ||
    [...word].some(letter => RESERVED_FLIGHT_CODES.includes(`Key${letter}`)))) {
    throw new TypeError('Breath words must be unique, have four uppercase letters and avoid flight bindings.');
  }
  return true;
}

function capacityValue(capacity) {
  if (!Number.isSafeInteger(capacity) || capacity < 1) throw new TypeError('Lock capacity must be a positive integer.');
  return capacity;
}
const validId = id => (typeof id === 'string' && id.length > 0) || (Number.isSafeInteger(id) && id >= 0);
const copyBurst = burst => burst ? { ...burst, targetIds: [...burst.targetIds],
  stage: burst.elapsed + 1e-9 < burst.windupDuration ? 'windup' : 'beam',
  progress: burst.elapsed < burst.windupDuration ? burst.elapsed / burst.windupDuration :
    Math.min(1, (burst.elapsed - burst.windupDuration) / burst.beamDuration),
} : null;

export class BreathPower {
  constructor({ capacity = 1, words = WORDS, random = Math.random } = {}) {
    validateWords(words);
    if (typeof random !== 'function') throw new TypeError('Word random source must be a function.');
    this.words = Object.freeze([...words]); this.random = random; this.capacity = capacityValue(capacity); this.reset();
  }
  reset() {
    this.lastWord = this.word ?? null; this.wordBag = [];
    this.wordIndex = 0; this.nextBurstId = 1; this.burstsFired = 0; this.burstsResolved = 0;
    this.startWord();
  }
  nextWord() {
    if (!this.wordBag.length) {
      this.wordBag = [...this.words];
      for (let i = this.wordBag.length - 1; i > 0; i--) {
        const random = this.random();
        if (!Number.isFinite(random) || random < 0 || random >= 1) throw new RangeError('Word random values must be in [0, 1).');
        const j = Math.floor(random * (i + 1));
        [this.wordBag[i], this.wordBag[j]] = [this.wordBag[j], this.wordBag[i]];
      }
      // Draw from the end. A refill or retry cannot immediately repeat the
      // previous word, while every word still appears once in each full bag.
      const last = this.wordBag.length - 1;
      if (last > 0 && this.wordBag[last] === this.lastWord) {
        [this.wordBag[0], this.wordBag[last]] = [this.wordBag[last], this.wordBag[0]];
      }
    }
    this.lastWord = this.wordBag.pop();
    return this.lastWord;
  }
  startWord() {
    this.phase = 'charging'; this.word = this.nextWord(); this.index = 0; this.assisted = false;
    this.candidateId = null; this.candidateSeconds = 0; this.locks = []; this.burst = null;
  }
  setCapacity(capacity) {
    this.capacity = capacityValue(capacity);
    if (this.locks.length > capacity) this.locks = this.locks.slice(-capacity);
  }
  pressLetter(code, { repeat = false } = {}) {
    const result = (correct, reason, completed = false) => ({ accepted: correct, correct, completed, reason });
    if (this.phase !== 'charging') return result(false, 'not-charging');
    if (repeat) return result(false, 'repeat');
    if (RESERVED_FLIGHT_CODES.includes(code)) return result(false, 'reserved');
    if (typeof code !== 'string' || !/^Key[A-Z]$/.test(code)) return result(false, 'invalid-key');
    if (code !== `Key${this.word[this.index]}`) return result(false, 'wrong-letter');
    this.index++;
    const completed = this.index === this.word.length;
    if (completed) this.phase = 'ready';
    return result(true, 'correct-letter', completed);
  }
  assist() {
    if (this.phase !== 'charging') return false;
    this.assisted = true; this.index = this.word.length; this.phase = 'ready'; return true;
  }
  // Each input candidate describes a stable ship ID, not a rendering object.
  // `eligible` means alive, visible and in range, regardless of reticle error.
  update(dt, candidates = []) {
    const impacts = [];
    if (!Number.isFinite(dt) || dt < 0) return { impacts, lockedIds: this.lockedIds() };
    dt = Math.min(dt, BREATH_CONFIG.maxStep);
    if (this.phase === 'charging') return { impacts, lockedIds: [] };
    if (this.phase === 'burst') {
      this.burst.elapsed = Math.min(this.burst.duration, this.burst.elapsed + dt);
      if (this.burst.elapsed + 1e-9 >= this.burst.duration) {
        impacts.push({ burstId: this.burst.id, targetIds: [...this.burst.targetIds] });
        this.burstsResolved++; this.wordIndex++; this.startWord();
      }
      return { impacts, lockedIds: this.lockedIds() };
    }
    const ships = new Map();
    for (const candidate of Array.isArray(candidates) ? candidates : []) {
      if (!candidate || !validId(candidate.id) || ships.has(candidate.id)) continue;
      const distance = candidate.distance;
      ships.set(candidate.id, {
        id: candidate.id, dead: candidate.dead === true,
        eligible: candidate.eligible === true && candidate.dead !== true &&
          Number.isFinite(distance) && distance > 0 && distance <= BREATH_CONFIG.range,
        distance, error: candidate.error,
      });
    }
    this.locks = this.locks.filter(lock => {
      const ship = ships.get(lock.id);
      if (ship?.dead) return false;
      lock.invalidFor = ship?.eligible ? 0 : lock.invalidFor + dt;
      return lock.invalidFor + 1e-9 < BREATH_CONFIG.graceSeconds;
    });
    const choices = [...ships.values()].filter(ship => ship.eligible &&
      Number.isFinite(ship.error) && ship.error >= 0 && ship.error <= BREATH_CONFIG.lockRadius);
    choices.sort((a, b) => a.error - b.error || a.distance - b.distance ||
      String(a.id).localeCompare(String(b.id), 'en'));
    const selected = choices[0];
    if (!selected || this.locks.some(lock => lock.id === selected.id)) {
      this.candidateId = null; this.candidateSeconds = 0;
      return { impacts, lockedIds: this.lockedIds() };
    }
    if (this.candidateId !== selected.id) { this.candidateId = selected.id; this.candidateSeconds = 0; }
    this.candidateSeconds += dt;
    if (this.candidateSeconds + 1e-9 >= BREATH_CONFIG.acquireSeconds) {
      if (this.locks.length >= this.capacity) this.locks.shift();
      this.locks.push({ id: selected.id, invalidFor: 0 });
      this.candidateId = null; this.candidateSeconds = 0;
    }
    return { impacts, lockedIds: this.lockedIds() };
  }
  lockedIds() { return this.locks.map(lock => lock.id); }
  requestFire() {
    if (this.phase !== 'ready') return { fired: false, reason: this.phase === 'burst' ? 'burst-active' : 'charging', burst: null };
    if (!this.locks.length) return { fired: false, reason: 'no-lock', burst: null };
    this.burst = { id: this.nextBurstId++, targetIds: this.lockedIds(), elapsed: 0,
      windupDuration: BREATH_CONFIG.windupSeconds, beamDuration: BREATH_CONFIG.beamSeconds, duration: BREATH_CONFIG.burstSeconds };
    this.phase = 'burst'; this.burstsFired++;
    this.candidateId = null; this.candidateSeconds = 0; this.locks = [];
    return { fired: true, reason: 'fired', burst: copyBurst(this.burst) };
  }
  // A destroyed/interrupted ship cannot deliver a delayed hit. Consumed charge
  // is not refunded and cancellation cannot advance the word/reward counters.
  cancelBurst() {
    if (this.phase !== 'burst') return false;
    this.burst = null; this.phase = 'charging'; this.index = 0;
    this.candidateId = null; this.candidateSeconds = 0; this.locks = []; this.assisted = false;
    return true;
  }
  snapshot() {
    return {
      phase: this.phase, word: this.word, wordIndex: this.wordIndex, index: this.index,
      currentLetter: this.word[this.index] || null, expectedLetter: this.word[this.index] || null,
      letters: [...this.word], completedLetters: this.word.slice(0, this.index), assisted: this.assisted,
      capacity: this.capacity, candidateId: this.candidateId,
      lockProgress: Math.min(1, this.candidateSeconds / BREATH_CONFIG.acquireSeconds),
      lockedIds: this.lockedIds(), burst: copyBurst(this.burst),
      burstsFired: this.burstsFired, burstsResolved: this.burstsResolved,
    };
  }
}
