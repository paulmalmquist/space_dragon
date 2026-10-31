import * as THREE from 'three';

export const DRAGON_BONES = Object.freeze(['Root', 'Wing_L', 'Wing_R', 'Jaw', 'Tail_0', 'Tail_1', 'Tail_2', 'Tail_3', 'Tail_4']);
export const LEGACY_DRAGON = Object.freeze({
  id: 'seele-organic-v001', filename: 'dragon.glb', kind: 'dragon',
  muzzle: Object.freeze([0, .52, -3.12]), socket: null,
});
export const MECHANICAL_DRAGON = Object.freeze({
  id: 'space-dragon-spacecraft-mechanical-red-v001', filename: 'dragon-mechanical-red-v001.glb', kind: 'mechanical',
  muzzle: Object.freeze([0, .5, -3.66]), socket: 'socket_muzzle',
});
export const CINEMATIC_DRAGON = Object.freeze({
  id: 'space-dragon-cinematic-benchmark-v002', filename: 'dragon-cinematic-benchmark-v002.glb', kind: 'mechanical',
  muzzle: Object.freeze([0, .5, -3.66]), socket: 'socket_muzzle',
});
export const FLIGHT_DRAGON = Object.freeze({
  id: 'space-dragon-flight-v003', filename: 'dragon-flight-v003.glb', kind: 'mechanical',
  muzzle: Object.freeze([0, .5, -3.66]), socket: 'socket_muzzle', attachmentContract: 1,
});
// Keep the prior cinematic, red mechanical and organic assets for rollback.
export const ACTIVE_DRAGON = FLIGHT_DRAGON;

export function modelMuzzle(model, asset = ACTIVE_DRAGON) {
  if (!asset.socket) return new THREE.Vector3(...asset.muzzle);
  const socket = model.getObjectByName(asset.socket);
  if (!socket) throw new Error(`Dragon asset missing ${asset.socket}`);
  model.updateMatrixWorld(true);
  const point = model.worldToLocal(socket.getWorldPosition(new THREE.Vector3()));
  if (![point.x, point.y, point.z].every(Number.isFinite)) throw new Error('Dragon muzzle is not finite');
  return point;
}

export function inspectDragon(model, asset = ACTIVE_DRAGON) {
  const bones = [], meshes = [], materials = new Set(); let triangles = 0;
  model.traverse(object => {
    if (object.isBone) bones.push(object.name);
    if (!object.isMesh) return;
    meshes.push(object);
    const geometry = object.geometry;
    triangles += (geometry.index?.count ?? geometry.attributes.position?.count ?? 0) / 3;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  const bounds = new THREE.Box3().setFromObject(model, true);
  return { id: asset.id, filename: asset.filename, bones, meshes: meshes.length,
    triangles, materials: materials.size, muzzle: modelMuzzle(model, asset).toArray(),
    bounds: { min: bounds.min.toArray(), max: bounds.max.toArray(), size: bounds.getSize(new THREE.Vector3()).toArray() } };
}
