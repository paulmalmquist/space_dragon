import { test, expect } from '@playwright/test';
import { FAMILY, initialCheckpoint, rewards, transition, validateCheckpoint } from '../src/game/firstContact';
import type { Checkpoint } from '../src/game/firstContact';

const equipped = (): Checkpoint => ({ ...initialCheckpoint(), step: 'suits' });
test('all suits arrive before any demonstration; stale and repeated actions award nothing', () => {
  let state = equipped();
  expect(rewards(state)).toEqual(FAMILY.map(member => `suit_${member.id}`));
  const old = state;
  expect(transition(state, { type: 'demonstrate', character: 'luna' })).toBe(old);
  for (const member of FAMILY) {
    state = transition(state, { type: 'demonstrate', character: member.id });
    expect(transition(state, { type: 'demonstrate', character: member.id })).toBe(state);
    expect(validateCheckpoint(state)).toEqual(state);
  }
  const completed = transition(state, { type: 'scan', assisted: false });
  expect(completed.step).toBe('map');
  expect(rewards(completed)).toHaveLength(6);
  expect(transition(completed, { type: 'scan', assisted: true })).toBe(completed);
  expect(transition(completed, { type: 'advance', from: 'computer' })).toBe(completed);
});

test('skip and all-help paths preserve identical rewards and retain assistance across reload', () => {
  const scanned = transition(transition(equipped(), { type: 'skip-demonstrations' }), { type: 'scan', assisted: true });
  let full = equipped();
  for (const member of FAMILY) full = transition(full, { type: 'demonstrate', character: member.id });
  const hinted = transition(full, { type: 'hint' });
  const loaded = validateCheckpoint(JSON.parse(JSON.stringify(hinted)))!;
  expect(transition(loaded, { type: 'scan', assisted: false }).scan).toBe('assisted');
  const direct = transition(full, { type: 'scan', assisted: false });
  expect(direct.scan).toBe('direct');
  expect(rewards(scanned)).toEqual(rewards(direct));
  expect(new Set(rewards(scanned)).size).toBe(6);
});

test('rejects impossible checkpoint combinations and wrong types', () => {
  for (const patch of [
    { step: 'map' }, { step: 'scan' }, { demonstrated: -1 }, { demonstrated: 5 },
    { demonstrated: 0.5 }, { scanHelp: 'false' }, { scan: ['pending'] }, { step: ['suits'] },
    { step: 'computer', demonstrated: 2 }, { step: 'map', demonstrated: 5, scan: 'direct', scanHelp: true },
    { step: 'map', demonstrated: 5, scan: 'assisted', scanHelp: false },
  ]) expect(validateCheckpoint({ ...equipped(), ...patch })).toBeNull();
});
