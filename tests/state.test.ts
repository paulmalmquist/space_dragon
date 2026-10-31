import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, copyGameState, isGameState, nextAction, PHASES, SUIT_ORDER, transition } from '../src/game/state.ts';
import type { GameState, Phase, StoryAction } from '../src/game/state.ts';
import { BACKUP_SAVE_KEY, LEGACY_SAVE_KEY, loadCheckpoint, migrateLegacyCheckpoint, SAVE_KEY, saveCheckpoint } from '../src/game/checkpoint.ts';
import type { SaveStorage } from '../src/game/checkpoint.ts';

function reach(phase: Phase): GameState {
  let state = createInitialState();
  for (let count = 0; state.phase !== phase && count < 15; count++) state = transition(state, nextAction(state));
  assert.equal(state.phase, phase, `Could not reach ${phase}`);
  return state;
}

class MemoryStorage implements SaveStorage {
  data = new Map<string, string>();
  writes: string[] = [];
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.writes.push(key); this.data.set(key, value); }
}

test('follows the script checkpoints with unique, ordered suit rewards and no restored SOS notes', () => {
  let state = createInitialState();
  assert.equal(state.checkpointId, 'cp_a1_00_living_room');
  assert.deepEqual(state.suits, []);
  state = transition(state, nextAction(state));
  assert.equal(state.phase, 'signal');
  assert.equal(state.flags.signalSeen, true);
  state = transition(state, nextAction(state));
  assert.equal(state.phase, 'backyard');
  assert.equal(state.checkpointId, 'cp_a1_01_backyard');
  state = transition(state, nextAction(state));
  assert.equal(state.phase, 'suits');
  for (const [index] of SUIT_ORDER.entries()) {
    const before = JSON.stringify(state);
    const intent = nextAction(state);
    const next = transition(state, intent);
    assert.equal(JSON.stringify(state), before, 'Transition mutated its input');
    assert.deepEqual(next.suits, SUIT_ORDER.slice(0, index + 1));
    assert.strictEqual(transition(next, intent), next, 'A repeated captured suit event advanced another card');
    state = next;
  }
  assert.equal(state.phase, 'scan');
  assert.equal(state.flags.archiveCardSymbol, false);
  assert.equal(state.flags.coreAwake, true);
  assert.equal(state.scanAssisted, false);
  state = transition(state, nextAction(state));
  assert.equal(state.phase, 'archive');
  assert.equal(state.flags.archiveCardSymbol, true);
  assert.equal(state.checkpointId, 'cp_a1_02_suits');
  state = transition(state, nextAction(state));
  assert.equal(state.phase, 'map');
  assert.equal(state.checkpointId, 'cp_a1_03_map');
  assert.equal(state.flags.missionPreschoolAvailable, true);
  assert.equal(new Set(state.suits).size, 5);
  assert.strictEqual(transition(state, nextAction(state)), state);
  assert.equal('sosNotesRestored' in state, false, 'The scan must not invent recovered SOS notes');
});

test('rejects stale phase actions, out-of-order suit rewards, and repeated scans', () => {
  const initial = createInitialState();
  assert.strictEqual(transition(initial, { type: 'scan', from: 'scan' }), initial);
  const suits = reach('suits');
  assert.strictEqual(transition(suits, { type: 'next', from: 'suits', suit: 'lyla' }), suits);
  assert.strictEqual(transition(suits, { type: 'next', from: 'suits' }), suits);
  assert.strictEqual(transition(suits, { type: 'next', from: 'backyard' }), suits);
  const scan = reach('scan');
  const result = transition(scan, { type: 'scan', from: 'scan' });
  assert.strictEqual(transition(result, { type: 'scan', from: 'scan' }), result);
  assert.strictEqual(transition(result, { type: 'next', from: 'suits', suit: 'lyla' }), result);
});

test('replay never awards or rewinds progress; cinematic skip has the normal outcome', () => {
  for (const phase of PHASES) {
    const state = reach(phase);
    assert.strictEqual(transition(state, { type: 'replay' }), state);
    if (phase !== 'scan' && phase !== 'map') {
      const action = nextAction(state) as Extract<StoryAction, { type: 'next' | 'skip' }>;
      assert.deepEqual(transition(state, { ...action, type: 'skip' }), transition(state, action));
    }
  }
  const skippedScan = transition(reach('scan'), { type: 'skip', from: 'scan' });
  assert.equal(skippedScan.phase, 'archive');
  assert.equal(skippedScan.scanAssisted, true);
  assert.equal(skippedScan.flags.archiveCardSymbol, true);
});

test('hint ladder never blocks progress; one Action completes together at level 3', () => {
  let scan = reach('scan');
  for (const level of [1, 2, 3]) {
    scan = transition(scan, { type: 'help', from: 'scan' });
    assert.equal(scan.hintLevel, level);
    assert.equal(scan.phase, 'scan');
    assert.equal(scan.flags.archiveCardSymbol, false);
  }
  assert.strictEqual(transition(scan, { type: 'help', from: 'scan' }), scan);
  const assisted = transition(scan, nextAction(scan));
  const independent = transition(reach('scan'), nextAction(reach('scan')));
  assert.equal(assisted.phase, 'archive');
  assert.equal(assisted.scanAssisted, true);
  assert.equal(independent.scanAssisted, false);
  assert.deepEqual(assisted.suits, independent.suits);
  assert.deepEqual(assisted.flags, independent.flags);
  assert.equal('mastery' in assisted, false);
  assert.equal('learner' in assisted, false);
  const oneHint = transition(reach('scan'), { type: 'help', from: 'scan' });
  assert.equal(transition(oneHint, nextAction(oneHint)).scanAssisted, true);
});

test('door help caps at 3; cinematic help is ignored; phase changes reset the ladder', () => {
  let signal = reach('signal');
  for (let count = 0; count < 5; count++) signal = transition(signal, { type: 'help', from: 'signal' });
  assert.equal(signal.hintLevel, 3);
  assert.equal(signal.phase, 'signal');
  const backyard = transition(signal, nextAction(signal));
  assert.equal(backyard.phase, 'backyard');
  assert.equal(backyard.hintLevel, 0);
  assert.strictEqual(transition(backyard, { type: 'help', from: 'backyard' }), backyard);
});

test('every reachable checkpoint validates, including interruption between each suit card', () => {
  let state = createInitialState();
  const storage = new MemoryStorage();
  for (let count = 0; count < 12; count++) {
    assert.equal(isGameState(state), true, JSON.stringify(state));
    assert.match(saveCheckpoint(state, storage), /saved on this device/);
    const restored = loadCheckpoint(storage);
    assert.deepEqual(restored.state, state);
    assert.notStrictEqual(restored.state, state);
    assert.notStrictEqual(restored.state.suits, state.suits);
    state = transition(restored.state, nextAction(restored.state));
  }
});

test('strict validation rejects impossible progress, coercible types, and duplicate/holey rewards', () => {
  const valid = reach('scan');
  const invalid: unknown[] = [
    null, [], {}, { ...valid, version: '2' }, { ...valid, phase: ['scan'] },
    { ...valid, hintLevel: '0' }, { ...valid, hintLevel: 4 }, { ...valid, hintLevel: -1 },
    { ...valid, hintLevel: 0.5 }, { ...valid, scanAssisted: 'false' },
    { ...valid, flags: { ...valid.flags, coreAwake: 1 } },
    { ...valid, flags: { ...valid.flags, archiveCardSymbol: true } },
    { ...valid, suits: ['paul', 'paul', 'luke', 'luna', 'lyla'] },
    { ...valid, suits: ['maria', 'paul', 'luke', 'luna', 'lyla'] },
    { ...valid, suits: new Array(5) }, { ...valid, checkpointId: 'cp_a1_03_map' },
    { ...createInitialState(), phase: 'map' }, { ...reach('suits'), suits: [...SUIT_ORDER] },
    { ...reach('archive'), hintLevel: 1 }, { ...createInitialState(), scanAssisted: true },
  ];
  for (const value of invalid) assert.equal(isGameState(value), false, JSON.stringify(value));
  const extra = { ...valid, unknown: 'discard me', flags: { ...valid.flags, unknown: true } };
  assert.equal(isGameState(extra), true);
  assert.equal('unknown' in copyGameState(extra), false);
  assert.equal('unknown' in copyGameState(extra).flags, false);
});

for (const [step, phase] of [['computer', 'signal'], ['backyard', 'backyard'], ['pod', 'suits']] as const) {
  test(`migrates legacy ${step} to ${phase}, preserving the v1 source and granting no unseen suits`, () => {
    const storage = new MemoryStorage();
    const raw = JSON.stringify({ version: 1, step });
    storage.data.set(LEGACY_SAVE_KEY, raw);
    const result = loadCheckpoint(storage);
    assert.equal(result.state.phase, phase);
    assert.deepEqual(result.state.suits, []);
    assert.equal(isGameState(result.state), true);
    assert.match(result.notice, /upgraded/);
    assert.deepEqual(storage.writes, [], 'Loading/migration must not write storage');
    assert.match(saveCheckpoint(result.state, storage), /saved/);
    assert.equal(storage.getItem(LEGACY_SAVE_KEY), raw);
    assert.equal(JSON.parse(storage.getItem(SAVE_KEY)!).version, 2);
  });
}

test('malformed or invalid legacy input is not coerced into a reward', () => {
  for (const value of [null, [], {}, { version: 1, step: ['pod'] }, { version: '1', step: 'pod' }, { version: 1, step: 'elsewhere' }]) {
    assert.equal(migrateLegacyCheckpoint(value), null);
  }
  const storage = new MemoryStorage();
  storage.data.set(LEGACY_SAVE_KEY, '{broken');
  assert.equal(loadCheckpoint(storage).state.phase, 'living-room');
  assert.match(loadCheckpoint(storage).notice, /could not be read/);
  assert.equal(storage.getItem(LEGACY_SAVE_KEY), '{broken');
});

test('valid v2 takes precedence over legacy input and discards unknown schema fields', () => {
  const storage = new MemoryStorage();
  const state = reach('map');
  storage.data.set(SAVE_KEY, JSON.stringify({ ...state, extra: 'untrusted' }));
  storage.data.set(LEGACY_SAVE_KEY, JSON.stringify({ version: 1, step: 'computer' }));
  const loaded = loadCheckpoint(storage);
  assert.deepEqual(loaded.state, state);
  assert.equal('extra' in loaded.state, false);
  assert.deepEqual(storage.writes, []);
});

test('corrupt primary restores a valid previous checkpoint without overwriting either source', () => {
  const storage = new MemoryStorage();
  const previous = reach('backyard');
  saveCheckpoint(previous, storage);
  saveCheckpoint(reach('scan'), storage);
  assert.deepEqual(JSON.parse(storage.getItem(BACKUP_SAVE_KEY)!), previous);
  storage.data.set(SAVE_KEY, '{interrupted-write');
  const writes = [...storage.writes];
  const recovered = loadCheckpoint(storage);
  assert.deepEqual(recovered.state, previous);
  assert.match(recovered.notice, /previous checkpoint is restored/);
  assert.equal(storage.getItem(SAVE_KEY), '{interrupted-write');
  assert.deepEqual(storage.writes, writes);
  saveCheckpoint(recovered.state, storage);
  assert.deepEqual(JSON.parse(storage.getItem(BACKUP_SAVE_KEY)!), previous, 'Corrupt primary replaced the good backup');
});

test('unknown future saves are preserved until an explicit confirmed new game', () => {
  const storage = new MemoryStorage();
  const future = JSON.stringify({ version: 9, phase: 'unwritten-future', futureProgress: ['keep'] });
  storage.data.set(SAVE_KEY, future);
  storage.data.set(BACKUP_SAVE_KEY, JSON.stringify(reach('backyard')));
  const loaded = loadCheckpoint(storage);
  assert.equal(loaded.canSave, false);
  assert.equal(loaded.state.phase, 'living-room');
  assert.match(loaded.notice, /newer build/);
  assert.deepEqual(storage.writes, []);
  assert.match(saveCheckpoint(reach('signal'), storage), /will not replace/);
  assert.equal(storage.getItem(SAVE_KEY), future);
  assert.match(saveCheckpoint(createInitialState(), storage, { allowOverwriteUnsupported: true }), /saved/);
  assert.equal(storage.getItem(BACKUP_SAVE_KEY), future, 'Explicit reset must retain the future save bytes');
  assert.equal(JSON.parse(storage.getItem(SAVE_KEY)!).version, 2);
});

test('failed backup, primary, or blocked reads preserve durable progress and report failure honestly', () => {
  const original = reach('backyard');
  for (const failureKey of [BACKUP_SAVE_KEY, SAVE_KEY]) {
    const storage = new MemoryStorage();
    storage.data.set(SAVE_KEY, JSON.stringify(original));
    const originalSet = storage.setItem.bind(storage);
    storage.setItem = (key, value) => { if (key === failureKey) throw new Error('Quota exceeded'); originalSet(key, value); };
    assert.match(saveCheckpoint(reach('scan'), storage), /unavailable or full/);
    assert.deepEqual(JSON.parse(storage.getItem(SAVE_KEY)!), original);
    assert.deepEqual(loadCheckpoint(storage).state, original);
  }
  const blocked: SaveStorage = { getItem() { throw new Error('Storage blocked'); }, setItem() { throw new Error('Storage blocked'); } };
  assert.equal(loadCheckpoint(blocked).state.phase, 'living-room');
  assert.match(loadCheckpoint(blocked).notice, /could not be read/);
  assert.match(saveCheckpoint(createInitialState(), blocked), /unavailable or full/);
});

test('invalid/corrupt saves restart with a notice, not a silent success or fabricated reward', () => {
  for (const raw of ['{broken', '{"version":2,"phase":"map"}', '{"version":2,"phase":["signal"]}']) {
    const storage = new MemoryStorage();
    storage.data.set(SAVE_KEY, raw);
    const loaded = loadCheckpoint(storage);
    assert.deepEqual(loaded.state, createInitialState());
    assert.match(loaded.notice, /could not be read/);
    assert.equal(storage.getItem(SAVE_KEY), raw);
    assert.deepEqual(storage.writes, []);
  }
  const storage = new MemoryStorage();
  assert.match(saveCheckpoint({ ...reach('map'), suits: [] }, storage), /invalid and was not saved/);
  assert.deepEqual(storage.writes, []);
});

test('same-state saves are idempotent and reset preserves the previous valid checkpoint', () => {
  const storage = new MemoryStorage();
  const progressed = reach('map');
  saveCheckpoint(progressed, storage);
  const writes = [...storage.writes];
  saveCheckpoint(progressed, storage);
  assert.deepEqual(storage.writes, writes);
  saveCheckpoint(createInitialState(), storage);
  assert.deepEqual(JSON.parse(storage.getItem(BACKUP_SAVE_KEY)!), progressed);
  assert.deepEqual(loadCheckpoint(storage).state, createInitialState());
});
