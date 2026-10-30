import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clipCameraPosition, copyExplorationState, createExplorationState, DEFAULT_SPAWN,
  interact, INTERACTION_TARGETS, isExplorationState, isWalkablePosition, MAX_FRAME_SECONDS,
  moveExploration, movePlayer, MOVE_SPEED, nearestInteraction, PLAYER_RADIUS, WORLD_COLLIDERS,
} from '../src/game/navigation.ts';
import type { ExplorationState, PlayerPosition } from '../src/game/navigation.ts';
import { EXPLORATION_BACKUP_KEY, EXPLORATION_SAVE_KEY, loadExploration, saveExploration } from '../src/game/exploration-save.ts';
import { LEGACY_SAVE_KEY, SAVE_KEY } from '../src/game/checkpoint.ts';
import type { SaveStorage } from '../src/game/checkpoint.ts';

class MemoryStorage implements SaveStorage {
  data = new Map<string, string>();
  writes: string[] = [];
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.writes.push(key); this.data.set(key, value); }
}
function close(actual: number, expected: number, tolerance = 1e-9) { assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`); }
function at(x: number, z: number): ExplorationState { return { version: 1, player: { x, z, yaw: 0 }, collected: [] }; }
function walk(start: PlayerPosition, forward: number, right: number, frames: number, seconds = 1 / 60): PlayerPosition {
  let position = start;
  for (let index = 0; index < frames; index++) position = movePlayer(position, { forward, right }, 0, seconds);
  return position;
}

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

test('diagonal input has the same speed as one axis and never mutates the input pose', () => {
  const start = { x: 6, z: 0, yaw: 0 };
  const before = JSON.stringify(start);
  const straight = movePlayer(start, { forward: 1, right: 0 }, 0, 1 / 30);
  const diagonal = movePlayer(start, { forward: 1, right: 1 }, 0, 1 / 30);
  close(Math.hypot(diagonal.x - start.x, diagonal.z - start.z), straight.z - start.z);
  close(diagonal.x - start.x, diagonal.z - start.z);
  assert.equal(JSON.stringify(start), before);
});

test('camera yaw controls movement and character facing independently of world axes', () => {
  const moved = movePlayer({ x: 6, z: 0, yaw: 0 }, { forward: 1, right: 0 }, Math.PI / 2, 1 / 30);
  close(moved.x, 6 + MOVE_SPEED / 30);
  close(moved.z, 0);
  close(moved.yaw, Math.PI / 2);
  const right = movePlayer({ x: 6, z: 0, yaw: 0 }, { forward: 0, right: 1 }, Math.PI / 2, 1 / 30);
  close(right.x, 6);
  close(right.z, -MOVE_SPEED / 30);
});

test('30/60/120 Hz movement covers the same distance in an unobstructed second', () => {
  for (const fps of [30, 60, 120]) {
    const moved = walk({ x: 6, z: 0, yaw: 0 }, 1, 0, fps, 1 / fps);
    close(moved.x, 6);
    close(moved.z, MOVE_SPEED);
  }
});

test('tab catch-up is bounded; pause, idle, invalid time and held invalid inputs do not move', () => {
  const start = { x: 6, z: 0, yaw: 0 };
  close(movePlayer(start, { forward: 1, right: 0 }, 0, 300).z, MOVE_SPEED * MAX_FRAME_SECONDS);
  for (const seconds of [0, -1, NaN, Infinity]) assert.strictEqual(movePlayer(start, { forward: 1, right: 0 }, 0, seconds), start);
  assert.strictEqual(movePlayer(start, { forward: 1, right: 0, paused: true }, 0, 1 / 60), start);
  assert.strictEqual(movePlayer(start, { forward: 0, right: 0 }, 0, 1 / 60), start);
  assert.strictEqual(movePlayer(start, { forward: NaN, right: Infinity }, 0, 1 / 60), start);
  const state = at(6, 0);
  assert.strictEqual(moveExploration(state, { forward: 1, right: 0, paused: true }, 0, 1 / 60), state);
});

test('the real doorway permits travel in both directions while its adjoining wall blocks', () => {
  const start = { x: -2, z: 0, yaw: 0 };
  const outside = walk(start, 0, 1, 60);
  close(outside.x, 1.2);
  close(walk(outside, 0, -1, 60).x, start.x);
  const blocked = walk({ x: -2, z: 2, yaw: 0 }, 0, 1, 180);
  assert.ok(blocked.x <= -0.4 - PLAYER_RADIUS);
  assert.equal(isWalkablePosition(blocked), true);
});

test('furniture, the pod and the outer fence are solid and diagonal contact slides along a wall', () => {
  const desk = walk({ x: -4, z: -0.5, yaw: 0 }, 1, 0, 180);
  assert.ok(desk.z <= 0.45 - PLAYER_RADIUS);
  const sofa = walk({ x: -4, z: -0.5, yaw: 0 }, -1, 0, 180);
  assert.ok(sofa.z >= -1.25 + PLAYER_RADIUS);
  const pod = walk({ x: 1, z: 0, yaw: 0 }, 0, 1, 180);
  assert.ok(pod.x <= 2.65 - PLAYER_RADIUS);
  const fence = walk({ x: 8, z: 3, yaw: 0 }, 0, 1, 180);
  assert.ok(fence.x <= 9.9 - PLAYER_RADIUS);
  const sliding = walk({ x: -1.5, z: 1.4, yaw: 0 }, 1, 1, 30);
  assert.ok(sliding.x <= -0.6 - PLAYER_RADIUS);
  assert.ok(sliding.z > 2.1, 'The wall stopped motion parallel to its surface');
  for (const position of [desk, sofa, pod, fence, sliding]) assert.equal(isWalkablePosition(position), true);
});

test('thin walls cannot be crossed by large frames, and invalid starting poses recover safely', () => {
  const thin = [{ id: 'thin', minX: 1.9, maxX: 1.91, minZ: -2, maxZ: 2, minY: 0, maxY: 3 }];
  let player = { x: 1.5, z: 0, yaw: 0 };
  for (let index = 0; index < 60; index++) player = movePlayer(player, { forward: 0, right: 1 }, 0, 10, thin);
  assert.ok(player.x <= 1.9 - PLAYER_RADIUS);
  for (const position of [{ x: -4, z: 1, yaw: 0 }, { x: -20, z: 0, yaw: 0 }, { x: NaN, z: 0, yaw: 0 }]) {
    assert.deepEqual(movePlayer(position, { forward: 1, right: 0 }, 0, 1 / 60), DEFAULT_SPAWN);
  }
});

test('camera boom clips against height-aware proxies without altering the authoritative player', () => {
  const state = createExplorationState();
  const before = JSON.stringify(state);
  const focus = { x: -2, y: 1.2, z: 0 };
  const desired = { x: -9, y: 1.2, z: 0 };
  const clipped = clipCameraPosition(focus, desired);
  assert.ok(clipped.x > -7.4, 'Camera passed through the west wall');
  assert.ok(clipped.x < -6, 'Camera did not reach the wall');
  assert.deepEqual(clipCameraPosition({ ...focus, y: 6 }, { ...desired, y: 6 }), { ...desired, y: 6 });
  assert.equal(JSON.stringify(state), before);
  assert.equal(WORLD_COLLIDERS.find((box) => box.id === 'computer-desk')?.maxY, 1.2);
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

test('strict exploration validation rejects impossible/duplicate inventory and unsafe or coercible poses', () => {
  const state = createExplorationState();
  for (const value of [
    null, [], {}, { ...state, version: '1' }, { ...state, player: { x: '-2', z: 0, yaw: 0 } },
    { ...state, player: { x: -4, z: 1, yaw: 0 } }, { ...state, player: { x: 200, z: 0, yaw: 0 } },
    { ...state, player: { x: -2, z: 0, yaw: Infinity } }, { ...state, player: null },
    { ...state, collected: ['training-module', 'training-module'] }, { ...state, collected: ['dragon-wing'] },
    { ...state, collected: new Array(1) },
  ]) assert.equal(isExplorationState(value), false, JSON.stringify(value));
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

test('unsafe/nonfinite saved pose recovers at the entrance while retaining an earned practice module', () => {
  for (const player of [{ x: -4, z: 1, yaw: 0 }, { x: 200, z: 0, yaw: 0 }, { x: null, z: 0, yaw: 0 }]) {
    const storage = new MemoryStorage();
    const raw = JSON.stringify({ version: 1, player, collected: ['training-module'] });
    storage.data.set(EXPLORATION_SAVE_KEY, raw);
    const loaded = loadExploration(storage);
    assert.deepEqual(loaded.state.player, DEFAULT_SPAWN);
    assert.deepEqual(loaded.state.collected, ['training-module']);
    assert.match(loaded.notice, /unsafe/);
    assert.equal(storage.getItem(EXPLORATION_SAVE_KEY), raw);
    assert.deepEqual(storage.writes, []);
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
  for (const raw of ['{broken', '{"version":1,"player":{},"collected":["dragon-wing"]}', '{"version":1}']) {
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
