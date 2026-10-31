import test from 'node:test';
import assert from 'node:assert/strict';
import { BreathPower, BREATH_CONFIG, WORDS, RESERVED_FLIGHT_CODES, validateWords } from '../src/prototypes/dogfight/systems/breath-power.js';

const ship = (id, overrides = {}) => ({ id, eligible: true, error: .02, distance: 200, ...overrides });
function charge(power) { for (const letter of power.snapshot().word) assert.equal(power.pressLetter(`Key${letter}`).correct, true); }
function advance(power, seconds, candidates = [], fps = 60) {
  const steps = Math.ceil(seconds * fps), impacts = [];
  for (let i = 0; i < steps; i++) impacts.push(...power.update(seconds / steps, candidates).impacts);
  return impacts;
}
function locked(power, id = 1) { charge(power); advance(power, .7, [ship(id)]); return power; }
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
}
function finishWord(power) {
  locked(power); power.requestFire(); advance(power, BREATH_CONFIG.burstSeconds);
}

test('curated four-letter words cannot overlap flight controls or the mouse toggle', () => {
  assert.equal(validateWords(WORDS), true);
  for (const word of WORDS) {
    assert.match(word, /^[A-Z]{4}$/);
    for (const letter of word) assert.equal(RESERVED_FLIGHT_CODES.includes(`Key${letter}`), false);
  }
  for (const invalid of [[], ['CAT'], ['lion'], ['WORD'], ['MOON'], ['BIRD'], ['BULL'], ['LION', 'LION'], [null], null]) {
    assert.throws(() => new BreathPower({ words: invalid }), TypeError);
  }
  for (const invalid of [0, -1, 1.2, NaN, Infinity]) assert.throws(() => new BreathPower({ capacity: invalid }), TypeError);
});

test('one correct nonrepeated letter advances at a time; wrong keys never erase progress', () => {
  const power = new BreathPower();
  const word = power.snapshot().word;
  assert.equal(power.snapshot().currentLetter, word[0]);
  assert.equal(power.pressLetter('KeyW').reason, 'reserved');
  assert.equal(power.pressLetter('KeyB').reason, 'reserved');
  assert.equal(power.pressLetter('l').reason, 'invalid-key');
  assert.equal(power.pressLetter('KeyU').reason, 'wrong-letter');
  assert.equal(power.pressLetter(`Key${word[0]}`, { repeat: true }).reason, 'repeat');
  assert.equal(power.snapshot().index, 0);
  assert.equal(power.pressLetter(`Key${word[0]}`).correct, true);
  assert.equal(power.pressLetter('KeyU').reason, 'wrong-letter');
  assert.equal(power.snapshot().completedLetters, word[0]);
  power.pressLetter(`Key${word[1]}`); power.pressLetter(`Key${word[2]}`);
  assert.equal(power.snapshot().phase, 'charging');
  assert.equal(power.pressLetter(`Key${word[3]}`).completed, true);
  assert.equal(power.snapshot().phase, 'ready'); assert.equal(power.snapshot().assisted, false);
  assert.equal(power.pressLetter(`Key${word[3]}`).reason, 'not-charging');
  assert.equal(power.snapshot().index, 4);
});

test('repeated held keys do not complete repeated-letter words; help charges with assistance', () => {
  const power = new BreathPower({ words: ['NOON'] });
  power.pressLetter('KeyN'); power.pressLetter('KeyO');
  power.pressLetter('KeyO', { repeat: true }); assert.equal(power.snapshot().index, 2);
  power.pressLetter('KeyO'); power.pressLetter('KeyN'); assert.equal(power.snapshot().phase, 'ready');
  power.reset(); assert.equal(power.assist(), true);
  assert.equal(power.snapshot().phase, 'ready'); assert.equal(power.snapshot().assisted, true);
  assert.equal(power.assist(), false); assert.equal(power.snapshot().index, 4);
});

test('charging never acquires targets and firing without a lock preserves a completed word', () => {
  const power = new BreathPower();
  advance(power, 2, [ship(1)]); assert.equal(power.snapshot().lockProgress, 0);
  assert.equal(power.requestFire().reason, 'charging');
  charge(power); assert.equal(power.requestFire().reason, 'no-lock');
  assert.equal(power.snapshot().phase, 'ready'); assert.equal(power.snapshot().index, 4);
});

test('visible in-range reticle dwell is required and a change of candidate restarts it', () => {
  const power = new BreathPower(); charge(power);
  advance(power, 1, [ship(1, { error: .2 }), ship(2, { eligible: false }), ship(3, { distance: 651 })]);
  assert.deepEqual(power.snapshot().lockedIds, []);
  advance(power, .4, [ship(1)]); assert.ok(power.snapshot().lockProgress > .5);
  advance(power, .3, [ship(2)]); assert.deepEqual(power.snapshot().lockedIds, []);
  advance(power, .4, [ship(2)]); assert.deepEqual(power.snapshot().lockedIds, [2]);
  assert.equal(power.snapshot().candidateId, null); assert.equal(power.snapshot().lockProgress, 0);
});

test('a lock survives reticle drift, replaces after a deliberate dwell, and missing targets get grace', () => {
  const power = locked(new BreathPower());
  advance(power, 1, [ship(1, { error: .8 })]); assert.deepEqual(power.snapshot().lockedIds, [1]);
  advance(power, .7, [ship(1, { error: .8 }), ship(2)]); assert.deepEqual(power.snapshot().lockedIds, [2]);
  advance(power, 1, []); assert.deepEqual(power.snapshot().lockedIds, [2]);
  advance(power, .1, [ship(2, { error: .9 })]);
  advance(power, 1, [ship(2, { eligible: false })]); assert.deepEqual(power.snapshot().lockedIds, [2]);
  advance(power, .21, [ship(2, { eligible: false })]); assert.deepEqual(power.snapshot().lockedIds, []);
  assert.equal(power.requestFire().reason, 'no-lock');
});

test('a disabled target drops immediately even at zero simulation time', () => {
  const power = locked(new BreathPower());
  power.update(0, [ship(1, { dead: true })]);
  assert.deepEqual(power.snapshot().lockedIds, []);
  assert.equal(power.requestFire().fired, false); assert.equal(power.snapshot().phase, 'ready');
});

test('nearest reticle target selection is stable and invalid/duplicate candidate data cannot lock', () => {
  const power = new BreathPower(); charge(power);
  advance(power, 1, [null, {}, ship(1, { distance: NaN }), ship(2, { distance: -1 }), ship(3, { error: NaN }), ship(4, { error: -1 })]);
  assert.deepEqual(power.snapshot().lockedIds, []);
  advance(power, .7, [ship(2), ship(1), ship(1)]); assert.deepEqual(power.snapshot().lockedIds, [1]);
  power.reset(); charge(power);
  advance(power, .7, [ship(2, { error: .01 }), ship(1)]); assert.deepEqual(power.snapshot().lockedIds, [2]);
});

test('future capacity supports distinct locks and shrinking capacity keeps the newest selection', () => {
  const power = new BreathPower({ capacity: 3 }); charge(power);
  const candidates = [ship(1), ship(2, { error: .5 }), ship(3, { error: .5 })];
  advance(power, .7, candidates);
  candidates[0].error = .5; candidates[1].error = .01; advance(power, .7, candidates);
  candidates[1].error = .5; candidates[2].error = .01; advance(power, .7, candidates);
  assert.deepEqual(power.snapshot().lockedIds, [1, 2, 3]);
  advance(power, 1, candidates); assert.deepEqual(power.snapshot().lockedIds, [1, 2, 3]);
  power.setCapacity(1); assert.deepEqual(power.snapshot().lockedIds, [3]);
  assert.throws(() => power.setCapacity(0), TypeError);
});

test('Space dispatch is atomic; an impact is resolved once by state time and a fresh word follows', () => {
  const power = locked(new BreathPower());
  const firstWord = power.snapshot().word;
  const fired = power.requestFire(); assert.equal(fired.fired, true); assert.deepEqual(fired.burst.targetIds, [1]);
  assert.equal(power.requestFire().reason, 'burst-active'); assert.equal(power.snapshot().burstsFired, 1);
  fired.burst.targetIds.push(999); fired.burst.elapsed = 999;
  assert.deepEqual(power.snapshot().burst.targetIds, [1]);
  assert.equal(power.snapshot().burst.stage, 'windup');
  assert.deepEqual(advance(power, BREATH_CONFIG.windupSeconds - .05), []);
  assert.equal(power.snapshot().burst.stage, 'windup');
  assert.deepEqual(advance(power, .05), []);
  assert.equal(power.snapshot().burst.stage, 'beam');
  assert.deepEqual(advance(power, BREATH_CONFIG.beamSeconds - .1), []);
  assert.equal(power.snapshot().phase, 'burst');
  const impacts = advance(power, .1);
  assert.deepEqual(impacts, [{ burstId: 1, targetIds: [1] }]);
  assert.equal(power.snapshot().phase, 'charging'); assert.notEqual(power.snapshot().word, firstWord);
  assert.equal(power.snapshot().index, 0); assert.deepEqual(advance(power, 10), []);
  assert.equal(power.snapshot().burstsResolved, 1);
  locked(power, 2); assert.equal(power.requestFire().burst.id, 2);
});

test('pause/no updates preserves state, invalid time cannot advance and tab catchup is bounded', () => {
  const power = locked(new BreathPower()); power.requestFire();
  const before = power.snapshot();
  for (const dt of [-1, NaN, Infinity, undefined]) assert.deepEqual(power.update(dt).impacts, []);
  assert.deepEqual(power.snapshot(), before);
  power.update(999); assert.equal(power.snapshot().burst.elapsed, BREATH_CONFIG.maxStep);
  assert.equal(power.snapshot().phase, 'burst');
  const snapshot = power.snapshot(); snapshot.burst.targetIds.push('not-real'); snapshot.letters.push('!');
  assert.deepEqual(power.snapshot().burst.targetIds, [1]); assert.equal(power.snapshot().letters.length, 4);
});

test('reset cancels a pending burst and discards encounter charge, assistance and locks', () => {
  const power = locked(new BreathPower()); power.requestFire(); advance(power, .3);
  const previousWord = power.snapshot().word;
  power.reset(); assert.ok(WORDS.includes(power.snapshot().word)); assert.notEqual(power.snapshot().word, previousWord); assert.equal(power.snapshot().index, 0);
  assert.equal(power.snapshot().phase, 'charging'); assert.equal(power.snapshot().burst, null);
  assert.equal(power.snapshot().assisted, false); assert.deepEqual(power.snapshot().lockedIds, []);
  assert.deepEqual(advance(power, 1), []); assert.equal(power.snapshot().burstsResolved, 0);
});

test('lock acquisition and burst resolution agree at 30 and 120 Hz', () => {
  const states = [30, 120].map(fps => {
    const power = new BreathPower({ random: seededRandom(7) }); charge(power);
    advance(power, .7, [ship(1)], fps); power.requestFire();
    const impacts = advance(power, BREATH_CONFIG.burstSeconds, [], fps);
    return { snapshot: power.snapshot(), impacts };
  });
  assert.deepEqual(states[0], states[1]);
});

test('shuffle bags contain every word once and never repeat across bag boundaries', () => {
  const power = new BreathPower({ random: seededRandom(42) }), sequence = [];
  for (let i = 0; i < WORDS.length * 4; i++) {
    sequence.push(power.snapshot().word); finishWord(power);
    assert.equal(power.snapshot().wordIndex, i + 1);
  }
  for (let i = 0; i < sequence.length; i += WORDS.length) {
    assert.deepEqual(sequence.slice(i, i + WORDS.length).sort(), [...WORDS].sort());
  }
  for (let i = 1; i < sequence.length; i++) assert.notEqual(sequence[i], sequence[i - 1]);
});

test('injected random sources reproduce order and different seeds change the encounter', () => {
  const collect = seed => {
    const power = new BreathPower({ random: seededRandom(seed) }), sequence = [];
    for (let i = 0; i < WORDS.length * 2; i++) { sequence.push(power.snapshot().word); finishWord(power); }
    return sequence;
  };
  assert.deepEqual(collect(23), collect(23));
  assert.notDeepEqual(collect(23), collect(99));
  assert.notEqual(collect(23)[0], WORDS[0]); // The initial word is not fixed at LION.
});

test('retry reshuffles without repeating the prior word; single-word pools remain usable', () => {
  const power = new BreathPower({ random: seededRandom(2) });
  const before = power.snapshot().word; power.reset();
  assert.notEqual(power.snapshot().word, before);
  const retryBag = [];
  for (let i = 0; i < WORDS.length; i++) { retryBag.push(power.snapshot().word); finishWord(power); }
  assert.deepEqual(retryBag.sort(), [...WORDS].sort());
  const single = new BreathPower({ words: ['NOON'] });
  finishWord(single); assert.equal(single.snapshot().word, 'NOON');
  single.reset(); assert.equal(single.snapshot().word, 'NOON');
});

test('invalid random sources fail clearly instead of corrupting word selection', () => {
  for (const random of [null, 1, 'random']) assert.throws(() => new BreathPower({ random }), TypeError);
  for (const value of [-1, 1, NaN, Infinity]) assert.throws(() => new BreathPower({ random: () => value }), RangeError);
  for (const value of [0, .999999999]) assert.ok(WORDS.includes(new BreathPower({ random: () => value }).snapshot().word));
});

test('a crash cancels windup or beam without a late hit, duplicate consumption or word reward', () => {
  for (const elapsed of [.2, 1]) {
    const power = locked(new BreathPower()); const word = power.snapshot().word;
    power.requestFire(); advance(power, elapsed);
    assert.equal(power.cancelBurst(), true); assert.equal(power.cancelBurst(), false);
    assert.deepEqual(advance(power, 5), []);
    assert.equal(power.snapshot().burstsFired, 1); assert.equal(power.snapshot().burstsResolved, 0);
    assert.equal(power.snapshot().wordIndex, 0); assert.equal(power.snapshot().word, word);
    assert.equal(power.snapshot().index, 0); assert.equal(power.snapshot().burst, null);
  }
});
