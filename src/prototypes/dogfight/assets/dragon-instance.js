import * as THREE from 'three';
import { ACTIVE_DRAGON, inspectDragon } from './dragon-model.js';
import { DRAGON_COLLISION } from '../systems/collision-shapes.js';

export const DRAGON_COORDINATES = Object.freeze({ units: 'metres', metresPerUnit: 1,
  forward: Object.freeze([0, 0, -1]), up: Object.freeze([0, 1, 0]), scale: 1,
  origin: 'authored rig reference; never recentered from bounds' });

export const DRAGON_ATTACHMENTS = Object.freeze({
  mouth: 'socket_muzzle', wingLeft: 'socket_wing_l', wingRight: 'socket_wing_r',
  thrusterLeft: 'socket_thruster_l', thrusterRight: 'socket_thruster_r',
  target: 'socket_target', camera: 'socket_camera', ground: 'socket_ground',
});

// Loading remains owned by the existing LoadingManager/GLTFLoader. This adapter
// only establishes transform ownership and resolves authored attachment nodes.
export function createDragonInstance(gltf, asset = ACTIVE_DRAGON) {
  const model = gltf.scene;
  const info = inspectDragon(model, asset);
  const root = new THREE.Group(); root.name = 'DragonGameplayRoot';
  const visual = new THREE.Group(); visual.name = 'DragonVisualMotion';
  root.add(visual); visual.add(model);
  const attachments = {}, fallbackAttachments = [];
  const fallback = { mouth: asset.muzzle, wingLeft: [-5, .3, .8], wingRight: [5, .3, .8],
    thrusterLeft: [-.55, .2, 1.7], thrusterRight: [.55, .2, 1.7],
    target: [0, 0, 0], camera: [0, 0, 0], ground: [0, info.bounds.min[1], 0] };
  for (const [role, name] of Object.entries(DRAGON_ATTACHMENTS)) {
    let node = model.getObjectByName(name);
    if (!node) {
      if (asset.attachmentContract === 1) throw new Error(`Dragon asset missing required attachment ${name}`);
      node = new THREE.Object3D(); node.name = name;
      node.position.fromArray(fallback[role]); model.add(node); fallbackAttachments.push(role);
    }
    attachments[role] = node;
  }
  root.updateMatrixWorld(true);
  function worldAttachment(role, target = new THREE.Vector3()) {
    if (!attachments[role]) throw new RangeError(`Unknown dragon attachment: ${role}`);
    attachments[role].updateWorldMatrix(true, false);
    return attachments[role].getWorldPosition(target);
  }
  function localAttachment(role, target = new THREE.Vector3()) {
    visual.updateWorldMatrix(true, false);
    return visual.worldToLocal(worldAttachment(role, target));
  }
  const groundY = localAttachment('ground').y;
  if (!Number.isFinite(groundY)) throw new Error('Dragon contact height is not finite');
  return { root, visual, model, attachments, info, clips: gltf.animations || [],
    coordinates: DRAGON_COORDINATES, groundY, contactHeight: -groundY,
    localAttachment, worldAttachment,
    sync(flight) {
      root.position.copy(flight.position); root.quaternion.copy(flight.orientation);
      visual.rotation.set(0, 0, flight.bank + flight.rollAngle);
      visual.position.set(0, Number.isFinite(flight.visualLift) ? flight.visualLift : 0, 0);
      visual.updateWorldMatrix(true, false);
      // Pure gameplay math gets a value, never a render node. Fire and glow use
      // the same current socket, including a future animated upper-head joint.
      flight.muzzleOffset ??= new THREE.Vector3();
      flight.muzzleOffset.copy(localAttachment('mouth'));
      flight.cameraAnchorOffset ??= new THREE.Vector3();
      flight.cameraAnchorOffset.copy(localAttachment('camera'));
    },
    snapshot() {
      return { coordinates: DRAGON_COORDINATES, groundY, contactHeight: -groundY,
        rootName: root.name, visualName: visual.name, collision: DRAGON_COLLISION,
        fallbackAttachments: [...fallbackAttachments],
        attachments: Object.fromEntries(Object.entries(attachments).map(([role, node]) => [role,
          { name: node.name, parent: node.parent?.name || '', local: localAttachment(role).toArray(), world: worldAttachment(role).toArray() }])) };
    },
  };
}
