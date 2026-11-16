import assert from 'node:assert/strict';
import test from 'node:test';
import { createArenaInput, sampleArenaPad } from '../src/game/arena/input.ts';

const pad = (axes: number[], pressed: number[] = [], mapping = 'standard') => ({
  mapping, axes,
  buttons: Array.from({ length: 17 }, (_unused, index) => ({ pressed: pressed.includes(index), touched: false, value: pressed.includes(index) ? 1 : 0 })),
}) as unknown as Pick<Gamepad, 'mapping' | 'axes' | 'buttons'>;

test('a standard controller maps to the same few actions as the keyboard, and nothing else is guessed', () => {
  assert.equal(sampleArenaPad(pad([0, 0, 0, 0], [], '')), null, 'an unmapped pad is left alone');
  const idle = sampleArenaPad(pad([0.1, -0.1, 0.05, 0]))!;
  assert.deepEqual(idle, { forward: 0, right: 0, jump: false, action: false, pounce: false, power: false, lookX: 0, lookY: 0, pause: false }, 'stick drift inside the dead zone is nothing');
  // Stick up is forward; the sticks are rescaled outside the dead zone and never exceed one.
  const run = sampleArenaPad(pad([0, -1, 1, 0]))!;
  assert.equal(run.forward, 1);
  assert.equal(run.right, 0);
  assert.equal(run.lookX, 1);
  const diagonal = sampleArenaPad(pad([1, -1, 0, 0]))!;
  assert.ok(Math.hypot(diagonal.forward, diagonal.right) <= 1 + 1e-9);
  // The d-pad moves too, for small hands.
  assert.deepEqual([sampleArenaPad(pad([0, 0, 0, 0], [12]))!.forward, sampleArenaPad(pad([0, 0, 0, 0], [13]))!.forward, sampleArenaPad(pad([0, 0, 0, 0], [15]))!.right, sampleArenaPad(pad([0, 0, 0, 0], [14]))!.right], [1, -1, 1, -1]);
  assert.equal(sampleArenaPad(pad([0, 0, 0, 0], [0]))!.jump, true);
  for (const button of [1, 2]) assert.equal(sampleArenaPad(pad([0, 0, 0, 0], [button]))!.action, true, 'either face button beside jump is the one-button action');
  assert.equal(sampleArenaPad(pad([0, 0, 0, 0], [3]))!.pounce, true);
  for (const button of [4, 5, 6, 7]) assert.equal(sampleArenaPad(pad([0, 0, 0, 0], [button]))!.power, true, 'any bumper or trigger is suit power');
  assert.equal(sampleArenaPad(pad([0, 0, 0, 0], [9]))!.pause, true);
  assert.equal(sampleArenaPad(pad([Number.NaN, Number.POSITIVE_INFINITY, 0, 0]))!.forward, 0, 'bad axis values are ignored');
});

function harness() {
  const target = new EventTarget();
  const calls: string[] = [];
  const input = createArenaInput(target as unknown as Window, { pause: () => calls.push('pause'), recenter: () => calls.push('recenter'), help: () => calls.push('help') });
  const send = (type: 'keydown' | 'keyup', key: string, extra: Record<string, unknown> = {}) => {
    const event = Object.assign(new Event(type, { cancelable: true }), { key, ...extra });
    target.dispatchEvent(event);
    return event;
  };
  return { input, send, calls };
}

test('keys are held values plus counted presses, so a tap between two slow frames is never lost', () => {
  const { input, send, calls } = harness();
  assert.deepEqual(input.sample(true), { forward: 0, right: 0, jump: false, power: false, action: false, pounce: false, lookX: 0, lookY: 0 });
  // A whole tap of F and of Space between two frames.
  send('keydown', 'f'); send('keyup', 'f');
  send('keydown', ' '); send('keyup', ' ');
  assert.equal(input.sample(true).action, false, 'no longer held');
  assert.deepEqual(input.takePresses(), { jump: 1, action: 1, pounce: 0 });
  assert.deepEqual(input.takePresses(), { jump: 0, action: 0, pounce: 0 }, 'taken once');
  // Held movement, both spellings; opposite keys cancel.
  send('keydown', 'w'); send('keydown', 'ArrowRight'); send('keydown', 'Shift');
  assert.deepEqual([input.sample(true).forward, input.sample(true).right, input.sample(true).power], [1, 1, true]);
  send('keydown', 's');
  assert.equal(input.sample(true).forward, 0);
  send('keyup', 's'); send('keyup', 'w'); send('keyup', 'ArrowRight'); send('keyup', 'Shift');
  // Key repeat is not a new press.
  send('keydown', 'g'); send('keydown', 'g', { repeat: true }); send('keydown', 'k');
  assert.deepEqual(input.takePresses(), { jump: 0, action: 0, pounce: 2 });
  for (const key of ['j', 'Enter', 'F']) send('keydown', key);
  assert.equal(input.takePresses().action, 3, 'F, J and Enter are all the action, in either case');
  // Q and E turn the camera while held.
  send('keydown', 'e');
  assert.equal(input.sample(true).lookX, 1);
  send('keyup', 'e'); send('keydown', 'q');
  assert.equal(input.sample(true).lookX, -1);
  // Page keys call their hooks and never leak into play.
  send('keydown', 'Escape'); send('keydown', 'p'); send('keydown', 'r'); send('keydown', 'h'); send('keydown', 'F1');
  assert.deepEqual(calls, ['pause', 'pause', 'recenter', 'help', 'help']);
  assert.equal(send('keydown', ' ').defaultPrevented, true, 'Space never scrolls the page');
  assert.equal(send('keydown', 'x').defaultPrevented, false, 'unknown keys are left to the browser');
  assert.equal(send('keydown', 'f', { ctrlKey: true }).defaultPrevented, false, 'browser shortcuts are left alone');
});

test('inactive, released or disposed input reads as nothing held', () => {
  const { input, send } = harness();
  send('keydown', 'w'); send('keydown', 'f');
  assert.deepEqual(input.sample(false), { forward: 0, right: 0, jump: false, power: false, action: false, pounce: false, lookX: 0, lookY: 0 }, 'paused: nothing');
  assert.equal(input.sample(true).forward, 1, 'still physically held');
  input.release();
  assert.equal(input.sample(true).forward, 0, 'a pause or blur lets go of everything');
  assert.deepEqual(input.takePresses(), { jump: 0, action: 0, pounce: 0 });
  // Space and Enter on a focused button or link belong to it; the other keys still play.
  class Focused extends EventTarget { closest(selector: string) { return selector.includes('button') ? this : null; } }
  const focused = new Focused();
  const onButton = createArenaInput(focused as unknown as Window, { pause() {}, recenter() {}, help() {} });
  const press = (key: string) => { const event = Object.assign(new Event('keydown', { cancelable: true }), { key }); focused.dispatchEvent(event); return event; };
  assert.equal(press(' ').defaultPrevented, false);
  assert.equal(press('Enter').defaultPrevented, false);
  press('f');
  assert.deepEqual(onButton.takePresses(), { jump: 0, action: 1, pounce: 0 });
  const { input: second, send: sendSecond } = harness();
  sendSecond('keydown', 'd');
  second.dispose();
  sendSecond('keyup', 'd');
  assert.equal(second.sample(true).right, 1, 'a disposed input no longer listens');
  assert.equal(input.controller, false);
});
