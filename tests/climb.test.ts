import assert from 'node:assert/strict';
import test from 'node:test';
import { createHero, HERO_EVENT, IDLE_INPUT, stepHero } from '../src/game/traversal/hero.ts';
import type { HeroInput, HeroState } from '../src/game/traversal/hero.ts';
import { HOME_BLOCK } from '../src/game/traversal/home-block.ts';
import { TUNING } from '../src/game/traversal/tuning.ts';
import type { TraversalWorld } from '../src/game/traversal/world.ts';
import { penetration, play } from './helpers/traversal.ts';

/** A 4 m block, 6 m tall, with one marked face on its west side and a thin unmarked wall nearby. */
const WORLD: TraversalWorld = {
  id: 'climb-test', bounds: { minX: -20, maxX: 20, minZ: -20, maxZ: 20 },
  solids: [
    { id: 'tower', kind: 'block', minX: 0, maxX: 4, minZ: 0, maxZ: 4, minY: 0, maxY: 6 },
    { id: 'thin', kind: 'wall', minX: 10, maxX: 10.2, minZ: 0, maxZ: 4, minY: 0, maxY: 5 },
    { id: 'lid', kind: 'block', minX: -6, maxX: -3, minZ: 10, maxZ: 13, minY: 0, maxY: 4 },
    { id: 'lid-roof', kind: 'block', minX: -6, maxX: -3, minZ: 10, maxZ: 13, minY: 4.6, maxY: 5 },
  ],
  anchors: [], water: [], sparks: [], recoveries: [], spawn: { x: -3, z: 2, yaw: Math.PI / 2 },
  climbs: [
    { id: 'tower-west', axis: 'x', at: 0, facing: -1, min: 0, max: 4, minY: 0, maxY: 6 },
    { id: 'tower-south', axis: 'z', at: 0, facing: -1, min: 0, max: 4, minY: 0, maxY: 6 },
    { id: 'thin-west', axis: 'x', at: 10, facing: -1, min: 0, max: 4, minY: 0, maxY: 5 },
    { id: 'lid-east', axis: 'x', at: -3, facing: 1, min: 10, max: 13, minY: 0, maxY: 4 },
  ],
};
const run = (hero: HeroState, seconds: number, input: Partial<HeroInput>, visit?: (hero: HeroState) => void) =>
  play(hero, [{ seconds, moveX: 0, moveZ: 0, jump: false, power: false, ...input }], WORLD, state => visit?.(state));

test('walking into a marked face grabs it; pushing on climbs to the top and mantles onto it', () => {
  let hero = createHero(WORLD, { x: -2, z: 2, yaw: Math.PI / 2 });
  let events = 0;
  let worst = 0;
  hero = run(hero, 0.6, { moveX: 1 }, state => { events |= state.events; worst = Math.max(worst, penetration(state, WORLD).depth); });
  assert.equal(hero.mode, 'climb');
  assert.equal(hero.climbId, 'tower-west');
  assert.ok(events & HERO_EVENT.climb);
  assert.ok(Math.abs(hero.x - -TUNING.radius) < 1e-9, 'held one body radius off the wall');
  assert.ok(hero.y > 0.3, 'already climbing');
  assert.ok(Math.abs(hero.yaw - Math.PI / 2) < 1e-9, 'faces the wall');
  hero = run(hero, 2.2, { moveX: 1 }, state => { events |= state.events; worst = Math.max(worst, penetration(state, WORLD).depth); });
  assert.ok(events & HERO_EVENT.mantle);
  assert.equal(hero.mode, 'ground');
  assert.equal(hero.groundId, 'tower');
  assert.equal(hero.y, 6);
  assert.ok(hero.x > 0.2 && hero.x < 3.8, `standing on the top at x=${hero.x}`);
  assert.ok(worst < 1e-6, `never inside a solid: ${worst}`);
});

test('pulling away climbs down and steps off; sideways shuffles within the marked face', () => {
  let hero = run(createHero(WORLD, { x: -2, z: 2, yaw: 0 }), 1.2, { moveX: 1 });
  assert.equal(hero.mode, 'climb');
  const high = hero.y;
  assert.ok(Math.abs(hero.vy - TUNING.climbSpeed) < 1e-6 && hero.vx === 0 && hero.vz === 0, 'the climb is reported as upward motion, for cameras and animation');
  hero = run(hero, 0.3, { moveX: -1 });
  assert.ok(hero.y < high && hero.mode === 'climb', 'descending');
  assert.ok(Math.abs(hero.vy + TUNING.climbDown) < 1e-6);
  const still = run(hero, 0.2, {});
  assert.deepEqual([still.vx, still.vy, still.vz, still.y], [0, 0, 0, hero.y], 'holding on without input is perfectly still');
  // Sideways: world-space z moves along the face and stops at its edge.
  hero = run(hero, 3, { moveZ: 1 });
  assert.equal(hero.mode, 'climb');
  assert.ok(Math.abs(hero.z - (4 - TUNING.radius)) < 1e-9, `stopped at the edge: ${hero.z}`);
  hero = run(hero, 3, { moveZ: -1 });
  assert.ok(Math.abs(hero.z - TUNING.radius) < 1e-9);
  // All the way down: back on the ground, free to walk away.
  hero = run(hero, 3, { moveX: -1 });
  assert.equal(hero.mode, 'ground');
  assert.ok(hero.y === 0 && hero.x < -1, `walked away to x=${hero.x}`);
  assert.equal(hero.climbId, '');
});

test('holding still on a face stays put; nothing but the marked face is climbable', () => {
  let hero = run(createHero(WORLD, { x: -2, z: 2, yaw: 0 }), 1, { moveX: 1 });
  const held = { x: hero.x, y: hero.y, z: hero.z };
  for (let step = 0; step < 240; step++) hero = stepHero(WORLD, hero, IDLE_INPUT);
  assert.deepEqual({ x: hero.x, y: hero.y, z: hero.z }, held, 'no sliding while resting on the wall');
  assert.equal(hero.mode, 'climb');
  // The east face of the same tower is not marked: the hero just stands against it.
  const east = run(createHero(WORLD, { x: 6, z: 2, yaw: 0 }), 1.5, { moveX: -1 });
  assert.equal(east.mode, 'ground');
  assert.equal(east.y, 0);
  // The home block has no marked faces at all, so its walls never grab.
  let home = createHero(HOME_BLOCK, HOME_BLOCK.spawn);
  for (let step = 0; step < 240; step++) home = stepHero(HOME_BLOCK, home, { moveX: 1, moveZ: 0, jump: false, power: false });
  assert.equal(home.mode, 'ground');
});

test('jump springs off the wall with a hop in hand and cannot instantly re-grab', () => {
  let hero = run(createHero(WORLD, { x: -2, z: 2, yaw: 0 }), 1.2, { moveX: 1 });
  const from = { x: hero.x, y: hero.y };
  hero = stepHero(WORLD, hero, { moveX: 1, moveZ: 0, jump: true, power: false });
  assert.equal(hero.mode, 'air');
  assert.ok(hero.events & HERO_EVENT.jump);
  assert.ok(hero.vx < -4 && hero.vy > 7, 'out and up');
  assert.equal(hero.hopAvailable, true);
  assert.ok(hero.climbCooldown > 0);
  // Still pushing at the wall: the cooldown passes, then the face is grabbed again higher up.
  let regrabbed = false;
  for (let step = 0; step < 240 && !regrabbed; step++) {
    hero = stepHero(WORLD, hero, { moveX: 1, moveZ: 0, jump: true, power: false });
    regrabbed = hero.mode === 'climb';
  }
  assert.ok(regrabbed, 'wall jump then re-grab');
  assert.ok(hero.y > from.y, `higher than before: ${hero.y} > ${from.y}`);
  assert.ok(Math.abs(hero.x - from.x) < 1e-9);
});

test('a jump at the wall grabs it in the air; a face needs a push toward it', () => {
  let hero = createHero(WORLD, { x: -1.2, z: 2, yaw: Math.PI / 2 });
  hero = stepHero(WORLD, hero, { moveX: 1, moveZ: 0, jump: true, power: false });
  let grabbedAt = -1;
  for (let step = 0; step < 120 && grabbedAt < 0; step++) {
    hero = stepHero(WORLD, hero, { moveX: 1, moveZ: 0, jump: true, power: false });
    if (hero.mode === 'climb') grabbedAt = hero.y;
  }
  assert.ok(grabbedAt > 0.4, `grabbed mid-air at ${grabbedAt}`);
  // Sliding along the wall without pushing into it does not grab.
  let passer = createHero(WORLD, { x: -TUNING.radius, z: 0.5, yaw: 0 });
  passer = run(passer, 1.2, { moveZ: 1, moveX: 0.2 });
  assert.equal(passer.mode, 'ground');
  assert.ok(passer.z > 4, `walked the length of the face without grabbing: ${passer.z}`);
});

test('no room on top means hanging at the edge instead of mantling into a ceiling or off a thin wall', () => {
  // A thin wall has no top wide enough to stand on.
  let thin = run(createHero(WORLD, { x: 8, z: 2, yaw: 0 }), 4, { moveX: 1 });
  assert.equal(thin.mode, 'climb');
  assert.ok(Math.abs(thin.y - (5 - TUNING.climbTop)) < 1e-9, `hangs at the top: ${thin.y}`);
  // A low roof over the top leaves no headroom.
  let lid = run(createHero(WORLD, { x: -1.5, z: 11.5, yaw: 0 }), 4, { moveX: -1 });
  assert.equal(lid.mode, 'climb');
  assert.ok(Math.abs(lid.y - (4 - TUNING.climbTop)) < 1e-9, `hangs under the roof: ${lid.y}`);
  // From the hang, a wall jump still gets away.
  lid = stepHero(WORLD, lid, { moveX: 0, moveZ: 0, jump: true, power: false });
  assert.equal(lid.mode, 'air');
});

test('a step on a face never mutates its input and arbitrary input keeps the climber valid', () => {
  const start = run(createHero(WORLD, { x: -2, z: 2, yaw: 0 }), 0.8, { moveX: 1 });
  const frozen = JSON.stringify(start);
  stepHero(WORLD, start, { moveX: -1, moveZ: 1, jump: true, power: true });
  assert.equal(JSON.stringify(start), frozen);
  let seed = 4242;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  let hero = createHero(WORLD, { x: -2, z: 2, yaw: 0 });
  let climbed = 0;
  let worst = 0;
  let input: HeroInput = { ...IDLE_INPUT };
  const starts = [{ x: -1, z: 2, yaw: 0 }, { x: 2, z: -1, yaw: 0 }, { x: 9, z: 2, yaw: 0 }, { x: -2, z: 11.5, yaw: 0 }];
  for (let step = 0; step < 60_000; step++) {
    // Start beside each marked face in turn so the walk keeps meeting them.
    if (step % 1500 === 0) hero = createHero(WORLD, starts[(step / 1500) % starts.length]);
    if (step % 23 === 0) input = { moveX: random() * 2 - 1, moveZ: random() * 2 - 1, jump: random() < 0.25, power: random() < 0.2 };
    hero = stepHero(WORLD, hero, input);
    if (hero.mode === 'climb') {
      climbed++;
      // On the wall the hero reports only its own climbing: never faster than the climb speeds, never away from the face.
      assert.ok(hero.vy <= TUNING.climbSpeed + 1e-6 && hero.vy >= -TUNING.climbDown - 1e-6, `vy ${hero.vy}`);
      assert.ok(Math.hypot(hero.vx, hero.vz) <= TUNING.climbSide + 1e-6, 'shuffle speed');
      assert.ok(hero.vx === 0 || hero.vz === 0, 'no motion through or off the face');
    }
    assert.ok(Number.isFinite(hero.x) && Number.isFinite(hero.y) && Number.isFinite(hero.z));
    assert.ok(hero.y >= -1e-9 && hero.y <= 30, `height ${hero.y}`);
    worst = Math.max(worst, penetration(hero, WORLD).depth);
  }
  assert.ok(climbed > 500, `the walk found the walls: ${climbed}`);
  assert.ok(worst < 0.02, `stayed outside every solid: ${worst}`);
});
