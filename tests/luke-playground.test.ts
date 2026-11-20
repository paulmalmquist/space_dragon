import assert from 'node:assert/strict';
import test from 'node:test';
import { HOME_BLOCK } from '../src/game/traversal/home-block.ts';
import { LUKE_PLAYGROUND, PLAYSET, PLAYSET_SPARKS } from '../src/game/traversal/luke-playground.ts';
import { createHero, selectAnchor, stepHero } from '../src/game/traversal/hero.ts';
import type { HeroState } from '../src/game/traversal/hero.ts';
import { TUNING } from '../src/game/traversal/tuning.ts';
import { isStandable, supportAt } from '../src/game/traversal/world.ts';
import { penetration, play } from './helpers/traversal.ts';

const world = LUKE_PLAYGROUND;
const near = (hero: HeroState, spark: { x: number; y: number; z: number }) => Math.hypot(hero.x - spark.x, hero.y + 0.9 - spark.y, hero.z - spark.z);

test("Luke's Playground extends the home block without changing it", () => {
  assert.equal(world.id, 'luke-playground-v001');
  assert.equal(world.solids.length, HOME_BLOCK.solids.length + 4);
  assert.equal(world.anchors.length, HOME_BLOCK.anchors.length + 1);
  assert.equal(world.sparks.length, 14);
  assert.deepEqual(world.solids.slice(0, HOME_BLOCK.solids.length), HOME_BLOCK.solids);
  assert.deepEqual(world.spawn, HOME_BLOCK.spawn);
  for (const list of [world.solids, world.anchors, world.sparks]) assert.equal(new Set(list.map(item => item.id)).size, list.length, 'ids are unique');
  // The playset keeps clear of the things already in the yard.
  const overlaps = (a: { minX: number; maxX: number; minZ: number; maxZ: number }, b: { minX: number; maxX: number; minZ: number; maxZ: number }) =>
    a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
  const added = world.solids.slice(HOME_BLOCK.solids.length);
  for (const piece of added) for (const other of HOME_BLOCK.solids) {
    if (other.kind === 'roof') continue;
    assert.ok(!overlaps(piece, other), `${piece.id} overlaps ${other.id}`);
  }
  // The spawn is still indoors and the straight path from the door to the gate is open.
  assert.ok(isStandable(world, world.spawn.x, world.spawn.z, TUNING.radius, TUNING.stepHeight, TUNING.height, TUNING.placeReach));
  for (let x = 0.2; x <= 9.6; x += 0.2) assert.ok(supportAt(world, x, 1, 0.3, 0).height <= 0.07, `gate path clear at ${x}`);
});

test('the ramp climbs to the tower, the tower spark is within reach and the slide runs down to the grass', () => {
  let hero = createHero(world, { x: 0.15, z: -4, yaw: Math.PI / 2 });
  assert.ok(hero.y < 0.1);
  let worst = 0;
  hero = play(hero, [{ seconds: 0.75, moveX: 1 }], world, state => { worst = Math.max(worst, penetration(state, world).depth); });
  hero = play(hero, [{ seconds: 0.5, moveX: 0 }], world);
  assert.equal(hero.mode, 'ground');
  assert.equal(hero.groundId, 'playset-deck');
  assert.ok(Math.abs(hero.y - PLAYSET.deck.top) < 1e-6, `on the deck at ${hero.y}`);
  assert.ok(near(hero, PLAYSET_SPARKS[0]) < 1.5, 'tower spark reachable from the deck');
  hero = play(hero, [{ seconds: 1.4, moveX: 1 }, { seconds: 0.4, moveX: 0 }], world, state => { worst = Math.max(worst, penetration(state, world).depth); });
  assert.equal(hero.mode, 'ground');
  assert.ok(hero.x > PLAYSET.slide.maxX - 0.6 && hero.y < 0.2, `off the slide at (${hero.x}, ${hero.y})`);
  assert.ok(worst < 0.02, `never inside a solid: ${worst}`);
});

test('the ramp and deck are solid from the side and from below', () => {
  // Half-way up, the ramp's flank is a wall for someone on the grass.
  let hero = createHero(world, { x: 1.8, z: -2.6, yaw: Math.PI });
  hero = play(hero, [{ seconds: 1.2, moveZ: -1 }], world);
  assert.ok(hero.z > PLAYSET.ramp.maxZ + TUNING.radius - 0.02 && hero.y < 0.1, `stopped beside the ramp at z=${hero.z}`);
  // Nobody fits beneath the deck.
  hero = createHero(world, { x: 3.5, z: -2.4, yaw: Math.PI });
  hero = play(hero, [{ seconds: 1.2, moveZ: -1 }], world);
  assert.ok(hero.z > PLAYSET.deck.maxZ + TUNING.radius - 0.02, `stopped at the deck edge at z=${hero.z}`);
});

test('the monkey bars carry a runner on top and let a walker pass beneath', () => {
  const middle = (PLAYSET.bars.minZ + PLAYSET.bars.maxZ) / 2;
  let hero = createHero(world, { x: 5.4, z: middle, yaw: Math.PI / 2, y: PLAYSET.bars.top });
  assert.equal(hero.groundId, 'playset-bars');
  hero = play(hero, [{ seconds: 0.45, moveX: 1 }, { seconds: 0.3, moveX: 0 }], world);
  assert.equal(hero.groundId, 'playset-bars');
  assert.ok(Math.abs(hero.y - PLAYSET.bars.top) < 1e-6);
  assert.ok(near({ ...hero, x: PLAYSET_SPARKS[1].x }, PLAYSET_SPARKS[1]) < 1.5, 'bar spark reachable from the top');
  let under = createHero(world, { x: 6.6, z: -1.2, yaw: Math.PI });
  under = play(under, [{ seconds: 0.9, moveZ: -1 }, { seconds: 0.3, moveZ: 0 }], world);
  assert.ok(under.z < PLAYSET.bars.minZ && under.y < 0.1, `walked beneath to z=${under.z}`);
  // A jump from the tower, steered at the middle of the bars, lands on them.
  let leap = createHero(world, { x: 3.9, z: -3.5, yaw: Math.PI / 4, y: PLAYSET.deck.top });
  const target = { x: 5.9, z: middle };
  for (let step = 0; step < 120 * 3; step++) {
    const dx = target.x - leap.x, dz = target.z - leap.z, distance = Math.hypot(dx, dz);
    const scale = distance > 0.2 ? Math.min(1, distance) / distance : 0;
    leap = stepHero(world, leap, { moveX: dx * scale, moveZ: dz * scale, jump: step > 6 && step < 40, power: false });
  }
  assert.equal(leap.groundId, 'playset-bars', `landed on ${leap.groundId} at (${leap.x}, ${leap.y}, ${leap.z})`);
});

test('the mast is a perch that sets the hero down on the tower', () => {
  const airborne: HeroState = { ...createHero(world, { x: 0.6, z: -1.6, yaw: 2.2 }), y: 2.2, mode: 'air', vx: 3, vz: -3, airTime: 0.4 };
  const candidate = selectAnchor(world, airborne, Math.SQRT1_2, -Math.SQRT1_2, '');
  assert.equal(candidate?.id, 'playset-mast');
  let hero = airborne;
  const visited = new Set<string>();
  for (let step = 0; step < 120 * 6 && !(hero.mode === 'ground' && step > 30); step++) {
    hero = stepHero(world, hero, { moveX: 0.7, moveZ: -0.7, jump: false, power: true });
    if (hero.tetherId) visited.add(hero.tetherId);
  }
  assert.ok(visited.has('playset-mast'), 'tethered to the mast');
  assert.equal(hero.groundId, 'playset-deck', `set down on ${hero.groundId} at (${hero.x}, ${hero.y}, ${hero.z})`);
});
