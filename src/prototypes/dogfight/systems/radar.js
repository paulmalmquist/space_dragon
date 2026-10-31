import * as THREE from 'three';

export const RADAR_RANGE = 800;
const finiteVector = vector => vector && ['x', 'y', 'z'].every(axis => Number.isFinite(vector[axis]));

// Head-up tactical scope: screen top is the dragon's forward axis, independent
// of chase-camera lag or the visual barrel roll. Altitude is relative to its
// flight plane, not world geography. No encounter state is changed here.
export function projectRadarContact(player, drone, range = RADAR_RANGE) {
  if (!Number.isFinite(range) || range <= 0) throw new RangeError('Radar range must be positive and finite.');
  if (!finiteVector(player?.position) || !finiteVector(drone?.position)) return null;
  const orientation = player.orientation;
  if (!orientation || !['x', 'y', 'z', 'w'].every(axis => Number.isFinite(orientation[axis]))) return null;
  const quaternion = new THREE.Quaternion(orientation.x, orientation.y, orientation.z, orientation.w);
  if (quaternion.lengthSq() < 1e-12) return null;
  const local = new THREE.Vector3(drone.position.x, drone.position.y, drone.position.z)
    .sub(player.position).applyQuaternion(quaternion.normalize().invert());
  const distance = local.length(), planarDistance = Math.hypot(local.x, local.z);
  const outOfRange = distance > range;
  // In-range contacts use planar distance. A contact beyond the full 3D sensor
  // range pins to the rim, with an outward arrow. Directly above/below has no
  // planar bearing, so it stays centered and retains its altitude/range cue.
  const radius = outOfRange ? 1 : Math.min(1, planarDistance / range);
  const hasBearing = planarDistance > 1e-8;
  return {
    id: drone.id, name: drone.name || `Bogey ${drone.id}`,
    x: hasBearing ? local.x / planarDistance * radius : 0,
    y: hasBearing ? local.z / planarDistance * radius : 0,
    distance, altitudeMeters: local.y,
    elevation: Math.abs(local.y) <= 5 ? 0 : Math.sign(local.y),
    bearing: hasBearing ? Math.atan2(local.x, -local.z) : 0,
    outOfRange, hasBearing,
  };
}

export function radarContacts(player, drones, { range = RADAR_RANGE, lockedIds = [], threats = [] } = {}) {
  const locked = new Set(lockedIds), hostile = new Map(threats.map(threat => [threat.id, threat]));
  return drones.filter(drone => !drone.dead).flatMap(drone => {
    const contact = projectRadarContact(player, drone, range);
    if (!contact) return [];
    const threat = hostile.get(drone.id);
    return [{ ...contact, locked: locked.has(drone.id), hostileLocked: Boolean(threat?.locked), firing: Boolean(threat?.firing) }];
  });
}
