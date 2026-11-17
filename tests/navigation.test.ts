import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  collectSparks, copyExplorationState, createExplorationState, DEFAULT_SPAWN, COLLECTIBLE_ORDER,
  interact, INTERACTION_TARGETS, isExplorationState, isWalkablePosition, migrateExplorationState,
  nearestInteraction, recoverExplorationState, savablePose, SPARK_IDS, sparkCount,
} from '../src/game/navigation.ts';
import type { ExplorationState } from '../src/game/navigation.ts';
import { EXPLORATION_BACKUP_KEY, EXPLORATION_SAVE_KEY, loadExploration, saveExploration } from '../src/game/exploration-save.ts';
import { LEGACY_SAVE_KEY, SAVE_KEY } from '../src/game/checkpoint.ts';
import type { SaveStorage } from '../src/game/checkpoint.ts';
import { HOME_BLOCK } from '../src/game/traversal/home-block.ts';
import { createHero } from '../src/game/traversal/hero.ts';
import { play } from './helpers/traversal.ts';

// Movement, collision, jumping and tether behavior are covered by traversal.test.ts.
class MemoryStorage implements SaveStorage {
  data = new Map<string, string>();
  writes: string[] = [];
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.writes.push(key); this.data.set(key, value); }
}
function at(x: number, z: number): ExplorationState { return { version: 2, player: { x, z, yaw: 0 }, collected: [] }; }

test('default spawn is clear, saveable, and independent copies do not share inventory/player objects', () => {
  const state = createExplorationState();
  assert.deepEqual(state.player, DEFAULT_SPAWN);
  assert.equal(isWalkablePosition(state.player), true);
  assert.equal(isExplorationState(state), true);
  const copied = copyExplorationState(state);
  assert.notStrictEqual(copied.player, state.player);
  assert.notStrictEqual(copied.collected, state.collected);
  copied.player.x = 8;
  copied.collected.push('training-module');
  assert.deepEqual(state, createExplorationState());
});

test('nearby targeting is deterministic, requires a safe position, and approaches the computer from its front', () => {
  assert.equal(nearestInteraction(at(-4, 0))?.id, 'computer');
  assert.equal(nearestInteraction(at(-4, 2))?.id, undefined);
  assert.equal(nearestInteraction(at(2, 0))?.id, 'pod');
  assert.equal(nearestInteraction(at(6, -2.2))?.id, 'training-module');
  assert.equal(nearestInteraction(at(-4, 1)), null, 'Unsafe pose inside the desk offered an action');
  assert.equal(nearestInteraction(createExplorationState()), null);
  for (let count = 0; count < 5; count++) assert.equal(nearestInteraction(at(2, 0)), INTERACTION_TARGETS[1]);
});

test('semantic interactions reject distant/unknown actions; computer/pod replay never changes story or inventory', () => {
  const initial = createExplorationState();
  for (const id of ['computer', 'pod', 'training-module']) {
    const denied = interact(initial, id);
    assert.equal(denied.status, 'out-of-range');
    assert.strictEqual(denied.state, initial);
  }
  assert.equal(interact(initial, 'invented-reward').status, 'unknown-target');
  assert.equal(interact(at(12.2, -6), 'spark-01').status, 'unknown-target', 'sparks are touched, never claimed by an action');
  for (const [id, state] of [['computer', at(-4, 0)], ['pod', at(2, 0)]] as const) {
    const result = interact(state, id);
    assert.equal(result.status, 'success');
    assert.strictEqual(result.state, state);
    assert.deepEqual(result.state.collected, []);
    assert.equal('phase' in result.state, false);
  }
});

test('practice pickup is awarded once immediately, before presentation; leaving/re-entering/reload cannot duplicate it', () => {
  const storage = new MemoryStorage();
  const initial = at(6, -2.2);
  const picked = interact(initial, 'training-module');
  assert.equal(picked.status, 'success');
  assert.deepEqual(initial.collected, [], 'Pickup mutated its input');
  assert.deepEqual(picked.state.collected, ['training-module']);
  assert.match(picked.notice, /not a story dragon part/);
  assert.equal(nearestInteraction(picked.state), null);
  const repeat = interact(picked.state, 'training-module');
  assert.equal(repeat.status, 'already-collected');
  assert.strictEqual(repeat.state, picked.state);
  saveExploration({ ...picked.state, player: { x: 7, z: 0, yaw: 0 } }, storage);
  const restored = loadExploration(storage).state;
  restored.player = { ...initial.player };
  assert.equal(interact(restored, 'training-module').status, 'already-collected');
  assert.deepEqual(restored.collected, ['training-module']);
});

test('practice sparks are awarded once by touch, in canonical order, and survive a reload', () => {
  assert.equal(SPARK_IDS.length, 12);
  assert.deepEqual(COLLECTIBLE_ORDER.slice(0, 2), ['training-module', 'spark-01']);
  const spots = new Map(HOME_BLOCK.sparks.map(spark => [spark.id, spark]));
  const touching = (id: string) => { const spark = spots.get(id)!; return { x: spark.x, y: spark.y - 0.9, z: spark.z }; };
  const start = at(6, -2.2);
  assert.strictEqual(collectSparks(start, { x: 6, y: 0, z: -2.2 }), start, 'nothing nearby returns the same state');
  const first = collectSparks(start, touching('spark-09'));
  assert.deepEqual(first.collected, ['spark-09']);
  assert.deepEqual(start.collected, [], 'collection never mutates its input');
  assert.strictEqual(collectSparks(first, touching('spark-09')), first, 'a held spark is never awarded twice');
  const second = interact(collectSparks(first, touching('spark-02')), 'training-module').state;
  assert.deepEqual(second.collected, ['training-module', 'spark-02', 'spark-09'], 'saved order is canonical, not pickup order');
  assert.equal(sparkCount(second), 2);
  assert.equal(isExplorationState(second), true);
  // Just outside the pickup radius is not a touch.
  const spark = spots.get('spark-01')!;
  assert.strictEqual(collectSparks(start, { x: spark.x + 1.6, y: spark.y - 0.9, z: spark.z }), start);
  const storage = new MemoryStorage();
  assert.match(saveExploration(second, storage), /saved on this device/);
  const loaded = loadExploration(storage).state;
  assert.deepEqual(loaded, second);
  assert.strictEqual(collectSparks(loaded, touching('spark-02')), loaded);
  let all = start;
  for (const id of SPARK_IDS) all = collectSparks(all, touching(id));
  assert.equal(sparkCount(all), 12);
  assert.equal(isExplorationState(all), true);
});

test('only a grounded pose at ground level is worth saving', () => {
  const standing = createHero(HOME_BLOCK, { x: 6, z: -2.2, yaw: 0.5 });
  assert.deepEqual(savablePose(standing), { x: 6, z: -2.2, yaw: 0.5 });
  assert.deepEqual(savablePose(createHero(HOME_BLOCK, { x: 28, z: 0, yaw: 0 })), { x: 28, z: 0, yaw: 0 }, 'the dock is safe footing');
  const jumping = play(standing, [{ seconds: 0.2, jump: true }]);
  assert.equal(savablePose(jumping), null, 'airborne');
  const roof = createHero(HOME_BLOCK, { x: -9, z: 1, yaw: 0, y: 6 });
  assert.ok(roof.y > 4);
  assert.equal(savablePose(roof), null, 'a rooftop is not restored after a reload');
});

test('strict exploration validation rejects impossible/duplicate inventory and unsafe or coercible poses', () => {
  const state = createExplorationState();
  for (const value of [
    null, [], {}, { ...state, version: '2' }, { ...state, version: 1 }, { ...state, player: { x: '-2', z: 0, yaw: 0 } },
    { ...state, player: { x: -4, z: 1, yaw: 0 } }, { ...state, player: { x: 200, z: 0, yaw: 0 } },
    { ...state, player: { x: -2, z: 0, yaw: Infinity } }, { ...state, player: null }, { ...state, player: { x: 30, z: 12, yaw: 0 } },
    { ...state, collected: ['training-module', 'training-module'] }, { ...state, collected: ['dragon-wing'] },
    { ...state, collected: ['spark-02', 'training-module'] }, { ...state, collected: ['spark-13'] },
    { ...state, collected: new Array(1) }, { ...state, collected: [7] },
  ]) assert.equal(isExplorationState(value), false, JSON.stringify(value));
});

test('version 1 saves upgrade in memory with their pose and module; nothing else is invented', () => {
  const legacy = { version: 1, player: { x: 4.5, z: -2.8, yaw: 0.3 }, collected: ['training-module'] };
  assert.deepEqual(migrateExplorationState(legacy), { version: 2, player: { x: 4.5, z: -2.8, yaw: 0.3 }, collected: ['training-module'] });
  assert.equal(migrateExplorationState({ ...legacy, collected: ['spark-01'] }), null, 'version 1 never held sparks');
  assert.equal(migrateExplorationState({ ...legacy, player: { x: 3.5, z: 0, yaw: 0 } }), null, 'an unsafe pose is recovered, not migrated');
  assert.equal(migrateExplorationState(createExplorationState()), null, 'current saves are not legacy saves');
  assert.deepEqual(recoverExplorationState({ ...legacy, player: { x: 3.5, z: 0, yaw: 0 } }), { version: 2, player: { ...DEFAULT_SPAWN }, collected: ['training-module'] });
  const storage = new MemoryStorage();
  const raw = JSON.stringify(legacy);
  storage.data.set(EXPLORATION_SAVE_KEY, raw);
  const loaded = loadExploration(storage);
  assert.equal(loaded.canSave, true);
  assert.match(loaded.notice, /restored/);
  assert.equal(loaded.state.version, 2);
  assert.deepEqual(loaded.state.collected, ['training-module']);
  assert.deepEqual(storage.writes, [], 'loading migrates in memory only');
  assert.equal(storage.getItem(EXPLORATION_SAVE_KEY), raw);
  assert.match(saveExploration(loaded.state, storage), /saved on this device/);
  assert.equal(storage.getItem(EXPLORATION_BACKUP_KEY), raw, 'the original version 1 bytes are kept as the backup');
  assert.equal(JSON.parse(storage.getItem(EXPLORATION_SAVE_KEY)!).version, 2);
});

test('exploration saves/reloads independently and leaves First Contact v1/v2 bytes untouched', () => {
  const storage = new MemoryStorage();
  storage.data.set(SAVE_KEY, '{"version":2,"private":"original-bytes"}');
  storage.data.set(LEGACY_SAVE_KEY, '{"version":1,"step":"pod"}');
  const original = [...storage.data];
  const state = interact(at(6, -2.2), 'training-module').state;
  assert.match(saveExploration(state, storage), /saved on this device/);
  const writes = [...storage.writes];
  const loaded = loadExploration(storage);
  assert.deepEqual(loaded.state, state);
  assert.deepEqual(storage.writes, writes, 'Loading must be read-only');
  for (const [key, raw] of original) assert.equal(storage.getItem(key), raw);
  assert.equal(storage.writes.every((key) => key.startsWith('space-dragon.exploration.')), true);
  saveExploration(state, storage);
  assert.deepEqual(storage.writes, writes, 'Unchanged saves should not keep writing');
});

test('unsafe/nonfinite saved pose recovers at the entrance while retaining earned practice items', () => {
  for (const version of [1, 2]) {
    for (const player of [{ x: -4, z: 1, yaw: 0 }, { x: 200, z: 0, yaw: 0 }, { x: null, z: 0, yaw: 0 }]) {
      const storage = new MemoryStorage();
      const collected = version === 1 ? ['training-module'] : ['training-module', 'spark-03'];
      const raw = JSON.stringify({ version, player, collected });
      storage.data.set(EXPLORATION_SAVE_KEY, raw);
      const loaded = loadExploration(storage);
      assert.deepEqual(loaded.state.player, DEFAULT_SPAWN);
      assert.deepEqual(loaded.state.collected, collected);
      assert.match(loaded.notice, /unsafe/);
      assert.equal(storage.getItem(EXPLORATION_SAVE_KEY), raw);
      assert.deepEqual(storage.writes, []);
    }
  }
});

test('corrupt primary recovers a previous valid save and does not overwrite its backup with corrupt bytes', () => {
  const storage = new MemoryStorage();
  const previous = createExplorationState();
  saveExploration(previous, storage);
  saveExploration(at(6, -2.2), storage);
  assert.deepEqual(JSON.parse(storage.getItem(EXPLORATION_BACKUP_KEY)!), previous);
  storage.data.set(EXPLORATION_SAVE_KEY, '{interrupted');
  const writes = [...storage.writes];
  const loaded = loadExploration(storage);
  assert.deepEqual(loaded.state, previous);
  assert.match(loaded.notice, /previous practice save/);
  assert.deepEqual(storage.writes, writes);
  saveExploration(loaded.state, storage);
  assert.deepEqual(JSON.parse(storage.getItem(EXPLORATION_BACKUP_KEY)!), previous);
});

test('unknown future exploration saves are protected until explicit reset and retained as recovery bytes', () => {
  const storage = new MemoryStorage();
  const raw = '{"version":8,"future":"keep-me"}';
  storage.data.set(EXPLORATION_SAVE_KEY, raw);
  assert.equal(loadExploration(storage).canSave, false);
  assert.match(saveExploration(createExplorationState(), storage), /will not replace/);
  assert.equal(storage.getItem(EXPLORATION_SAVE_KEY), raw);
  assert.deepEqual(storage.writes, []);
  assert.match(saveExploration(createExplorationState(), storage, { allowOverwriteUnsupported: true }), /saved/);
  assert.equal(storage.getItem(EXPLORATION_BACKUP_KEY), raw);
});

test('blocked reads, primary quota failure and backup failure preserve saved progress and report honestly', () => {
  const blocked: SaveStorage = { getItem() { throw new Error('Blocked'); }, setItem() { throw new Error('Blocked'); } };
  assert.match(loadExploration(blocked).notice, /could not be read/);
  assert.match(saveExploration(createExplorationState(), blocked), /unavailable or full/);
  for (const failureKey of [EXPLORATION_SAVE_KEY, EXPLORATION_BACKUP_KEY]) {
    const storage = new MemoryStorage();
    const original = JSON.stringify(createExplorationState());
    storage.data.set(EXPLORATION_SAVE_KEY, original);
    const write = storage.setItem.bind(storage);
    storage.setItem = (key, value) => { if (key === failureKey) throw new Error('Quota exceeded'); write(key, value); };
    assert.match(saveExploration(at(6, -2.2), storage), /unavailable or full/);
    assert.equal(storage.getItem(EXPLORATION_SAVE_KEY), original);
  }
});

test('invalid inventory/corrupt save never fabricates progress; invalid state cannot be saved', () => {
  for (const raw of ['{broken', '{"version":1,"player":{},"collected":["dragon-wing"]}', '{"version":1}', '{"version":2,"player":{"x":-2,"z":-1.5,"yaw":0},"collected":["spark-99"]}']) {
    const storage = new MemoryStorage();
    storage.data.set(EXPLORATION_SAVE_KEY, raw);
    const loaded = loadExploration(storage);
    assert.deepEqual(loaded.state, createExplorationState());
    assert.match(loaded.notice, /could not be read/);
    assert.deepEqual(storage.writes, []);
    assert.equal(storage.getItem(EXPLORATION_SAVE_KEY), raw);
  }
  const storage = new MemoryStorage();
  assert.match(saveExploration({ ...createExplorationState(), player: { x: -4, z: 1, yaw: 0 } }, storage), /invalid and was not saved/);
  assert.deepEqual(storage.writes, []);
});
