import { HOME_BLOCK } from '../../src/game/traversal/home-block.ts';
import { createHero, HERO_EVENT, stepHero } from '../../src/game/traversal/hero.ts';
import type { HeroInput, HeroState } from '../../src/game/traversal/hero.ts';
import { TRAVERSAL_STEP, TUNING } from '../../src/game/traversal/tuning.ts';
import { topAt } from '../../src/game/traversal/world.ts';
import type { TraversalWorld } from '../../src/game/traversal/world.ts';
import { collectSparks, createExplorationState } from '../../src/game/navigation.ts';

export const STEP = TRAVERSAL_STEP;
export interface Segment extends Partial<HeroInput> { seconds: number; }

/** Hold each segment's input for its duration at the fixed step. */
export function play(hero: HeroState, segments: Segment[], world: TraversalWorld = HOME_BLOCK, visit?: (hero: HeroState, time: number) => void): HeroState {
  let time = 0;
  let input: HeroInput = { moveX: 0, moveZ: 0, jump: false, power: false };
  for (const segment of segments) {
    const { seconds, ...change } = segment;
    input = { ...input, ...change };
    const steps = Math.round(seconds / STEP);
    for (let index = 0; index < steps; index++) {
      hero = stepHero(world, hero, input);
      time += STEP;
      visit?.(hero, time);
    }
  }
  return hero;
}

export function eventNames(events: number): string[] {
  return Object.entries(HERO_EVENT).filter(([, bit]) => events & bit).map(([name]) => name);
}

/**
 * Deepest overlap between the hero's body and any solid it cannot stand on or pass under.
 * Zero (within tolerance) means the body is nowhere inside the level.
 */
export function penetration(hero: HeroState, world: TraversalWorld = HOME_BLOCK): { depth: number; id: string } {
  let depth = 0;
  let id = '';
  for (const solid of world.solids) {
    const cx = Math.max(solid.minX, Math.min(solid.maxX, hero.x));
    const cz = Math.max(solid.minZ, Math.min(solid.maxZ, hero.z));
    const distance = Math.hypot(hero.x - cx, hero.z - cz);
    if (distance >= TUNING.radius) continue;
    if (hero.y + TUNING.stepHeight >= topAt(solid, cx, cz) || hero.y + TUNING.height <= solid.minY) continue;
    if (TUNING.radius - distance > depth) { depth = TUNING.radius - distance; id = solid.id; }
  }
  return { depth, id };
}

export interface Waypoint { x: number; z: number; r?: number; jump?: boolean; hold?: number; power?: boolean; }
export interface Flight { hero: HeroState; reached: boolean; index: number; seconds: number; events: string[]; catches: number; sparks: string[]; maxSpeed: number; maxHeight: number; }

/**
 * A simple pilot: steer at the next waypoint, hold suit power and press jump where asked.
 * It reads only what a player sees (its own position) and never writes a pose.
 */
export function fly(start: { x: number; z: number; yaw: number; y?: number }, route: Waypoint[], seconds = 40, world: TraversalWorld = HOME_BLOCK): Flight {
  let hero = createHero(world, start);
  let exploration = createExplorationState();
  let time = 0;
  let index = 0;
  let jumpUntil = -1;
  let catches = 0;
  let maxSpeed = 0;
  let maxHeight = hero.y;
  const events: string[] = [];
  while (time < seconds && index < route.length) {
    const target = route[index];
    const dx = target.x - hero.x;
    const dz = target.z - hero.z;
    const distance = Math.hypot(dx, dz);
    if (distance < (target.r ?? 2)) {
      if (target.jump) jumpUntil = time + (target.hold ?? 0.3);
      index++;
      continue;
    }
    hero = stepHero(world, hero, { moveX: dx / distance, moveZ: dz / distance, jump: time < jumpUntil, power: target.power ?? true });
    time += STEP;
    exploration = collectSparks(exploration, hero, world);
    maxSpeed = Math.max(maxSpeed, Math.hypot(hero.vx, hero.vy, hero.vz));
    maxHeight = Math.max(maxHeight, hero.y);
    if (hero.events & HERO_EVENT.catch) catches++;
    for (const name of eventNames(hero.events)) events.push(name === 'attach' ? `attach:${hero.tetherId}` : name === 'land' ? `land:${hero.groundId}` : name);
  }
  return { hero, reached: index >= route.length, index, seconds: time, events, catches, sparks: exploration.collected, maxSpeed, maxHeight };
}
