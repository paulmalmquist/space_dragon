import assert from 'node:assert/strict';
import test from 'node:test';
import { ARENA_LAYOUT, emptyProgress } from '../src/game/arena/arena.ts';
import type { ArenaProgress } from '../src/game/arena/arena.ts';
import { ARENA_BACKUP_KEY, ARENA_SAVE_KEY, loadArena, resetArena, saveArena } from '../src/game/arena/arena-save.ts';

class MemoryStorage {
  values = new Map<string, string>();
  writes = 0;
  failWrites = false;
  failReads = false;
  getItem(key: string): string | null { if (this.failReads) throw new Error('blocked'); return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { if (this.failWrites) throw new Error('full'); this.writes++; this.values.set(key, value); }
}
const ALL = ['course-1', 'course-2', 'course-3', 'course-4', 'course-5'];
const some: ArenaProgress = { ...emptyProgress(), course: ['course-1', 'course-3'], ringBest: 2, quiet: 3 };
const more: ArenaProgress = { ...emptyProgress(), course: ALL, courseStars: 2, courseBest: 52.5, ringStars: 2, ringBest: 3, stealthStars: 1, quiet: 5 };

test('arena stars round-trip, and saving the same thing twice writes once', () => {
  const storage = new MemoryStorage();
  assert.deepEqual(loadArena(storage), { progress: emptyProgress(), notice: '', canSave: true });
  assert.equal(storage.writes, 0, 'loading never writes');
  assert.match(saveArena(some, storage), /saved/);
  assert.equal(storage.writes, 1);
  assert.match(saveArena(some, storage), /saved/);
  assert.equal(storage.writes, 1, 'an unchanged save is not rewritten');
  const loaded = loadArena(storage);
  assert.deepEqual(loaded.progress, some);
  assert.equal(loaded.canSave, true);
  assert.notEqual(loaded.progress.course, some.course, 'a copy, not the stored array');
  const save = JSON.parse(storage.values.get(ARENA_SAVE_KEY)!);
  assert.deepEqual(Object.keys(save).sort(), ['arenaId', 'progress', 'version']);
  assert.equal(save.arenaId, ARENA_LAYOUT.world.id);
  assert.deepEqual(Object.keys(save.progress).sort(), ['course', 'courseBest', 'courseStars', 'quiet', 'ringBest', 'ringStars', 'stealthStars'], 'stars and counters only: nothing about a learner');
});

test('a save never takes anything away: older, smaller or stale progress merges with what is stored', () => {
  const storage = new MemoryStorage();
  saveArena(more, storage);
  // A second tab that started before those stars were earned saves its own, smaller, progress.
  saveArena({ ...emptyProgress(), course: ['course-2'], stealthStars: 3, quiet: 1 }, storage);
  const merged = loadArena(storage).progress;
  assert.deepEqual(merged, { ...more, stealthStars: 3 });
  // The earlier bytes are kept as a backup when the save changes.
  assert.deepEqual(JSON.parse(storage.values.get(ARENA_BACKUP_KEY)!).progress, more);
  // Saving empty progress over it changes nothing at all.
  const writes = storage.writes;
  saveArena(emptyProgress(), storage);
  assert.equal(storage.writes, writes);
  assert.deepEqual(loadArena(storage).progress, merged);
});

test('unreadable, foreign or impossible saves are never trusted and never destroyed', () => {
  const impossible = [
    'not json', '{"version":1}', JSON.stringify({ version: 1, arenaId: 'another-arena', progress: some }),
    JSON.stringify({ version: 1, arenaId: ARENA_LAYOUT.world.id, progress: { ...some, courseStars: 3 } }),
    JSON.stringify({ version: 1, arenaId: ARENA_LAYOUT.world.id, progress: { ...some, course: ['course-9'] } }),
    JSON.stringify({ version: 0, arenaId: ARENA_LAYOUT.world.id, progress: some }),
  ];
  for (const raw of impossible) {
    const storage = new MemoryStorage();
    storage.values.set(ARENA_SAVE_KEY, raw);
    const loaded = loadArena(storage);
    assert.deepEqual(loaded.progress, emptyProgress(), raw);
    assert.equal(loaded.canSave, true);
    assert.match(loaded.notice, /could not be read/);
    assert.equal(storage.values.get(ARENA_SAVE_KEY), raw, 'bytes untouched by loading');
    assert.equal(storage.writes, 0);
  }
  // A readable backup stands in for a broken primary.
  const storage = new MemoryStorage();
  saveArena(some, storage);
  saveArena(more, storage);
  storage.values.set(ARENA_SAVE_KEY, '{broken');
  const recovered = loadArena(storage);
  assert.deepEqual(recovered.progress, some);
  assert.match(recovered.notice, /previous one is restored/);
  // Invalid progress is refused before it reaches storage.
  const writes = storage.writes;
  assert.match(saveArena({ ...some, ringStars: 2 }, storage), /invalid/);
  assert.match(saveArena({ ...some, quiet: -1 }, storage), /invalid/);
  assert.equal(storage.writes, writes);
});

test('a save from a newer build is preserved and this visit does not replace it', () => {
  const storage = new MemoryStorage();
  const newer = JSON.stringify({ version: 2, arenaId: ARENA_LAYOUT.world.id, progress: more, extra: { medals: 4 } });
  storage.values.set(ARENA_SAVE_KEY, newer);
  const loaded = loadArena(storage);
  assert.equal(loaded.canSave, false);
  assert.deepEqual(loaded.progress, emptyProgress());
  assert.match(loaded.notice, /newer build/);
  assert.match(saveArena(more, storage), /newer build/);
  assert.equal(storage.values.get(ARENA_SAVE_KEY), newer);
  assert.equal(storage.writes, 0);
});

test('blocked or full storage is reported honestly and play carries on', () => {
  const blocked = new MemoryStorage();
  blocked.failReads = true;
  const loaded = loadArena(blocked);
  assert.deepEqual(loaded.progress, emptyProgress());
  assert.match(loaded.notice, /last for this visit/);
  assert.match(saveArena(some, blocked), /unavailable or full/);
  const full = new MemoryStorage();
  saveArena(some, full);
  full.failWrites = true;
  assert.match(saveArena(more, full), /unavailable or full/);
  assert.deepEqual(loadArena(full).progress, some, 'the earlier save survives a failed write');
});

test('starting the stars over is deliberate, keeps the old save as a backup and respects a newer build', () => {
  const storage = new MemoryStorage();
  saveArena(more, storage);
  assert.match(resetArena(storage), /cleared/);
  assert.deepEqual(loadArena(storage).progress, emptyProgress());
  assert.deepEqual(JSON.parse(storage.values.get(ARENA_BACKUP_KEY)!).progress, more, 'the earlier stars are still in the backup');
  // After a reset, new progress saves normally instead of merging the old stars back in.
  saveArena(some, storage);
  assert.deepEqual(loadArena(storage).progress, some);
  const newer = new MemoryStorage();
  const raw = JSON.stringify({ version: 9, arenaId: ARENA_LAYOUT.world.id });
  newer.values.set(ARENA_SAVE_KEY, raw);
  assert.match(resetArena(newer), /newer build/);
  assert.equal(newer.values.get(ARENA_SAVE_KEY), raw);
  const blocked = new MemoryStorage();
  blocked.failReads = true;
  assert.match(resetArena(blocked), /Nothing was cleared/);
});
