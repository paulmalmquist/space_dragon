import { CONFIG } from '../config.js';

// Deliberately independent of GLB bounds, wing pose, visual scale or LOD.
// These values retain the existing lab's collision/combat tuning.
export const DRAGON_COLLISION = Object.freeze({ type: 'sphere',
  center: Object.freeze([0, 0, 0]), radius: CONFIG.dragon.hitRadius,
  enemyProjectilePadding: 1, units: 'metres', space: 'gameplay-root' });

export function dragonCollisionRadius(purpose = 'asteroid') {
  if (purpose === 'asteroid') return DRAGON_COLLISION.radius;
  if (purpose === 'enemy-projectile') return DRAGON_COLLISION.radius + DRAGON_COLLISION.enemyProjectilePadding;
  throw new RangeError(`Unknown dragon collision purpose: ${purpose}`);
}
