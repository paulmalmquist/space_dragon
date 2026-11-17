import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3, Quaternion } from '@babylonjs/core/Maths/math';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { SpotLight } from '@babylonjs/core/Lights/spotLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import '@babylonjs/core/Particles/particleSystemComponent';
import type { Material } from '@babylonjs/core/Materials/material';
import { createFirstContactVisuals } from '../visual/first-contact-visuals';
import { createRenderQualityController } from '../runtime/quality-controller';
import { createThirdPersonCamera } from '../third-person-camera';
import { createKit, color4, glowMaterial, softDotTexture, spriteMaterial } from '../world/kit';
import { createHeroAvatar } from '../hero/hero-avatar';
import { loadPersonAvatar } from '../hero/person-avatar';
import type { PersonAvatar } from '../hero/person-avatar';
import { createHeroEffects } from '../hero/hero-effects';
import { HERO_EVENT } from '../traversal/hero';
import { TRAVERSAL_STEP, TUNING } from '../traversal/tuning';
import { supportAt } from '../traversal/world';
import { ARENA, ARENA_EVENT, ARENA_LAYOUT, ROBOT_PROFILES, STAR_MAX, diveTargets } from './arena';
import type { ArenaProgress, ArenaState } from './arena';
import { createSidekickFigure } from './sidekick-figure';
import { ANCHORS, BLOCKS, CLIMBS, HIDE_SPOTS, LUKE_ARENA, PICKUPS, ROBOTS, ZONES } from './arena-world';
import type { RobotSpec, TrialId } from './arena-world';

/** What one rendered frame shows: two fixed steps to blend between and what happened since the last frame. */
export interface ArenaFrame {
  state: ArenaState;
  previous: ArenaState;
  /** 0 to 1 between the previous step and the current one. */
  alpha: number;
  events: number;
  heroEvents: number;
  /** Anchor a tether would take now. */
  candidateId: string | null;
}

const TRIAL_COLOR: Record<TrialId, string> = { course: '#49e3c2', ring: '#ffb454', stealth: '#a98bff' };
const EYE = { calm: '#63d9ff', curious: '#ffd45a', alert: '#ff5a4a', held: '#8ff3ff', off: '#20262c' } as const;
type EyeKey = keyof typeof EYE;
const FAN_RAYS = 22;
const FLOOD_INTENSITY = 260;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

/**
 * Draws Luke's Arena from the same data that drives its rules. Presentation only: it reads
 * arena states and never changes them, and nothing here grants a reward.
 */
export function createArenaView(canvas: HTMLCanvasElement) {
  const engine = new Engine(canvas, true, { stencil: true }, true);
  const quality = createRenderQualityController(engine, canvas, 'balanced');
  const scene = new Scene(engine);
  const follow = createThirdPersonCamera(scene, LUKE_ARENA, { distance: 5.6, pitch: 0.5 });
  scene.activeCamera = follow.camera;
  const presentation = createFirstContactVisuals(scene, [follow.camera]);
  presentation.setQuality(quality.profile);
  // A lit training yard at night: a little brighter and clearer than the street outside.
  scene.environmentIntensity = 0.42;
  scene.fogDensity = 0.007;

  const sky = new HemisphericLight('arena.sky', new Vector3(0.2, 1, 0.3), scene);
  sky.intensity = 0.42;
  sky.diffuse = new Color3(0.58, 0.7, 1);
  sky.groundColor = new Color3(0.09, 0.11, 0.14);
  const keyDirection = new Vector3(0.55, 0.62, -0.5).normalize();
  const key = new DirectionalLight('arena.key', keyDirection.scale(-1), scene);
  key.intensity = 1.5;
  key.diffuse = new Color3(0.86, 0.9, 1);
  key.autoUpdateExtends = false;
  key.orthoLeft = -24; key.orthoRight = 24; key.orthoBottom = -24; key.orthoTop = 24;
  key.shadowMinZ = 1; key.shadowMaxZ = 130;
  const shadows = new ShadowGenerator(quality.profile.shadowMapSize, key);
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = ShadowGenerator.QUALITY_LOW;
  shadows.darkness = 0.3;
  shadows.bias = 0.0012;
  shadows.normalBias = 0.03;
  const aimShadows = (x: number, z: number) => {
    key.position.set(Math.round(x / 2) * 2 + keyDirection.x * 60, keyDirection.y * 60, Math.round(z / 2) * 2 + keyDirection.z * 60);
  };
  aimShadows(0, 0);

  // ---------- Materials ----------
  const { material, surface } = presentation;
  const textured = (name: string, color: string, source: string, roughness: number) => {
    const value = material(name, color, undefined, roughness);
    surface(value, source, 1);
    return value;
  };
  const M = {
    deck: textured('arena.deck', '#8d9296', 'concrete', 0.95),
    course: material('arena.pad-course', '#31524f', undefined, 0.97),
    ring: textured('arena.pad-ring', '#a08d6c', 'concrete', 0.96),
    yard: textured('arena.pad-yard', '#62666c', 'asphalt', 0.94),
    tower: textured('arena.tower', '#c8c1b2', 'plaster', 0.95),
    crate: textured('arena.crate', '#a9825c', 'wood', 0.8),
    pillar: textured('arena.pillar', '#aeb2b0', 'concrete', 0.93),
    metal: material('arena.metal', '#27323c', undefined, 0.5, 0.55),
    panel: material('arena.climb-panel', '#1d3a44', undefined, 0.75, 0.2),
    shell: material('arena.robot-shell', '#7fae8c', undefined, 0.45, 0.4),
    shellDark: material('arena.robot-dark', '#1c2429', undefined, 0.55, 0.5),
    mower: material('arena.robot-mower', '#b0563a', undefined, 0.5, 0.45),
    drone: material('arena.robot-drone', '#8b96a3', undefined, 0.35, 0.7),
  };
  const G = {
    hold: glowMaterial(scene, 'arena.hold', '#49e3c2', 1.25),
    trim: glowMaterial(scene, 'arena.trim', '#9fd8ff', 0.42),
    course: glowMaterial(scene, 'arena.line-course', TRIAL_COLOR.course, 1.05),
    ring: glowMaterial(scene, 'arena.line-ring', TRIAL_COLOR.ring, 1.05),
    stealth: glowMaterial(scene, 'arena.line-stealth', TRIAL_COLOR.stealth, 1.15),
    pip: glowMaterial(scene, 'arena.pip', '#ffe9a8', 1.7, { fog: false }),
    pipSpent: glowMaterial(scene, 'arena.pip-spent', '#39424a', 0.6, { fog: false }),
    gem: glowMaterial(scene, 'arena.gem', '#ffe9a8', 1.7, { fog: false }),
    gemTaken: glowMaterial(scene, 'arena.gem-taken', '#6b6a5a', 0.5, { fog: false, alpha: 0.35 }),
    wrap: glowMaterial(scene, 'arena.wrap', '#8ff3ff', 1.6, { fog: false }),
    star: glowMaterial(scene, 'arena.dizzy-star', '#ffd45a', 1.8, { fog: false }),
    target: glowMaterial(scene, 'arena.target', '#f4fbff', 1.05, { fog: false }),
    quiet: glowMaterial(scene, 'arena.target-quiet', '#9a63ff', 1.15, { fog: false }),
    lane: glowMaterial(scene, 'arena.lane', '#ff4a3a', 1.5, { fog: false, alpha: 0.75, additive: true }),
    hide: glowMaterial(scene, 'arena.hide', '#6f8dff', 0.55, { fog: false, alpha: 0.22, additive: true }),
    hideEdge: glowMaterial(scene, 'arena.hide-edge', '#8aa2ff', 1.1, { fog: false }),
    catchBeam: glowMaterial(scene, 'arena.catch-beam', '#fff3c4', 1.3, { fog: false, alpha: 0.4, additive: true }),
    oop: glowMaterial(scene, 'arena.oop', '#ffb347', 1.35, { fog: false }),
    dive: glowMaterial(scene, 'arena.dive', '#ffe9a8', 1.7, { fog: false }),
    web: glowMaterial(scene, 'arena.web', '#8ff3ff', 1.5, { fog: false }),
    stunBeam: glowMaterial(scene, 'arena.stun-beam', '#ffb347', 1.6, { fog: false, alpha: 0.7, additive: true }),
  };
  const eyeMaterials = Object.fromEntries((Object.keys(EYE) as EyeKey[]).map(name => [name, glowMaterial(scene, `arena.eye-${name}`, EYE[name], name === 'off' ? 0.5 : 2, { fog: false })])) as Record<EyeKey, StandardMaterial>;
  const fanMaterials = Object.fromEntries((['calm', 'curious', 'alert'] as const).map(name => {
    const value = glowMaterial(scene, `arena.fan-${name}`, EYE[name], 0.9, { fog: false, alpha: 0.2, additive: true });
    value.zOffset = -2;
    return [name, value];
  })) as Record<'calm' | 'curious' | 'alert', StandardMaterial>;
  G.lane.zOffset = -3; G.hide.zOffset = -2;
  const glowing: Mesh[] = [];
  const lit = <T extends Mesh>(mesh: T): T => { glowing.push(mesh); mesh.isPickable = false; return mesh; };

  // ---------- The yard: floor, trial pads, walls, blocks, marked faces, masts ----------
  const kit = createKit(scene);
  const { bounds } = LUKE_ARENA;
  kit.extent(bounds.minX - 8, bounds.maxX + 8, -0.6, 0, bounds.minZ - 8, bounds.maxZ + 8, M.deck, 'world', 3, false);
  const padMaterial: Record<TrialId, Material> = { course: M.course, ring: M.ring, stealth: M.yard };
  const lineMaterial: Record<TrialId, Material> = { course: G.course, ring: G.ring, stealth: G.stealth };
  for (const zone of ZONES) {
    kit.extent(zone.minX, zone.maxX, 0, 0.014, zone.minZ, zone.maxZ, padMaterial[zone.id], 'world', 3, false);
    // A bright line on the two sides that face the hub and the neighbours: step over it to start, step back to stop.
    const line = lineMaterial[zone.id];
    kit.extent(zone.minX, zone.maxX, 0.014, 0.05, zone.minZ - 0.07, zone.minZ + 0.07, line, 'world', 2, false);
    if (zone.minX > bounds.minX) kit.extent(zone.minX - 0.07, zone.minX + 0.07, 0.014, 0.05, zone.minZ, zone.maxZ, line, 'world', 2, false);
    if (zone.maxX < bounds.maxX) kit.extent(zone.maxX - 0.07, zone.maxX + 0.07, 0.014, 0.05, zone.minZ, zone.maxZ, line, 'world', 2, false);
  }
  // Perimeter wall with a lit coping.
  const wall = 3.2, thick = 0.5;
  for (const [minX, maxX, minZ, maxZ] of [
    [bounds.minX - thick, bounds.maxX + thick, bounds.minZ - thick, bounds.minZ], [bounds.minX - thick, bounds.maxX + thick, bounds.maxZ, bounds.maxZ + thick],
    [bounds.minX - thick, bounds.minX, bounds.minZ, bounds.maxZ], [bounds.maxX, bounds.maxX + thick, bounds.minZ, bounds.maxZ],
  ]) {
    kit.extent(minX, maxX, 0, wall, minZ, maxZ, M.metal);
    kit.extent(minX, maxX, wall, wall + 0.06, minZ, maxZ, G.trim, 'world', 2, false);
  }
  const blockMaterial: Record<string, Material> = { tower: M.tower, crate: M.crate, wall: M.metal, pillar: M.pillar };
  for (const block of BLOCKS) {
    kit.extent(block.minX, block.maxX, 0, block.top, block.minZ, block.maxZ, blockMaterial[block.look], 'world', block.look === 'crate' ? 1.4 : 2);
    if (block.look !== 'crate') {
      // A thin cap and a line of light mark every edge Luke can stand on.
      kit.extent(block.minX - 0.05, block.maxX + 0.05, block.top - 0.12, block.top, block.minZ - 0.05, block.maxZ + 0.05, M.metal);
      kit.extent(block.minX - 0.06, block.maxX + 0.06, block.top - 0.05, block.top - 0.02, block.minZ - 0.06, block.maxZ + 0.06, G.trim, 'world', 2, false);
    } else {
      for (const y of [0.18, block.top - 0.18]) kit.extent(block.minX - 0.03, block.maxX + 0.03, y - 0.05, y + 0.05, block.minZ - 0.03, block.maxZ + 0.03, M.metal);
    }
  }
  // Marked faces: a dark grip panel studded with lit hand-holds. Spider Climb works here and nowhere else.
  for (const face of CLIMBS) {
    const out = face.facing * 0.03;
    const place = (along: number, y: number, width: number, height: number, depth: number, value: Material, shadow = false) => {
      if (face.axis === 'x') kit.box([depth, height, width], [face.at + out + face.facing * depth / 2, y, along], value, 'world', 2, shadow);
      else kit.box([width, height, depth], [along, y, face.at + out + face.facing * depth / 2], value, 'world', 2, shadow);
    };
    const span = face.max - face.min, rise = face.maxY - face.minY;
    place((face.min + face.max) / 2, face.minY + rise / 2, span - 0.24, rise - 0.2, 0.04, M.panel);
    const columns = Math.max(2, Math.round(span / 0.62));
    for (let row = 0; row * 0.56 + 0.5 < rise - 0.2; row++) {
      for (let column = 0; column < columns; column++) {
        const along = face.min + (column + 0.5 + (row % 2 ? 0.22 : -0.22)) * span / columns;
        if (along < face.min + 0.25 || along > face.max - 0.25) continue;
        place(along, face.minY + 0.5 + row * 0.56, 0.2, 0.07, 0.09, G.hold);
      }
    }
  }
  // Masts and a gantry for the tether rings to hang from.
  const mast = (x: number, z: number, base: number, top: number) => kit.cylinder(top - base, 0.14, 0.2, [x, (base + top) / 2, z], M.metal, 'world', 8);
  const beam = (fromX: number, fromZ: number, toX: number, toZ: number, y: number) =>
    kit.extent(Math.min(fromX, toX) - 0.07, Math.max(fromX, toX) + 0.07, y - 0.07, y + 0.07, Math.min(fromZ, toZ) - 0.07, Math.max(fromZ, toZ) + 0.07, M.metal);
  const [perch, ringAnchor, yardAnchor] = ANCHORS;
  mast(perch.x - 1.7, perch.z + 1.7, 6, perch.y + 0.3); beam(perch.x - 1.7, perch.z + 1.7, perch.x, perch.z + 1.7, perch.y + 0.3); beam(perch.x, perch.z, perch.x, perch.z + 1.7, perch.y + 0.3);
  const ringZone = ZONES.find(zone => zone.id === 'ring')!;
  mast(ringZone.minX + 0.3, ringAnchor.z, 0, ringAnchor.y + 0.3); mast(ringZone.maxX - 0.3, ringAnchor.z, 0, ringAnchor.y + 0.3);
  beam(ringZone.minX + 0.3, ringAnchor.z, ringZone.maxX - 0.3, ringAnchor.z, ringAnchor.y + 0.3);
  mast(yardAnchor.x, bounds.maxZ - 0.4, 0, yardAnchor.y + 0.3); beam(yardAnchor.x, yardAnchor.z, yardAnchor.x, bounds.maxZ - 0.4, yardAnchor.y + 0.3);
  // The vault spark sits on a small plinth.
  const vault = PICKUPS.find(pickup => pickup.trial === 'stealth')!;
  kit.cylinder(0.5, 0.9, 1.1, [vault.x, 0.25, vault.z], M.metal, 'world', 10);
  kit.cylinder(0.04, 0.96, 0.96, [vault.x, 0.52, vault.z], G.stealth, 'world', 18, false);
  const built = kit.finish();
  for (const mesh of built.casters) shadows.addShadowCaster(mesh);
  for (const mesh of built.merged.world) if (/arena\.(hold|trim|line-)/.test(mesh.material?.name ?? '') || /arena\.(tower|crate|pillar|metal)/.test(mesh.material?.name ?? '')) glowing.push(mesh);

  // ---------- Gate signs painted on the hub floor: a picture for each trial and its three stars; nothing to read ----------
  const signs = ZONES.map(zone => {
    const texture = new DynamicTexture(`arena.sign.${zone.id}`, { width: 256, height: 320 }, scene, true);
    texture.hasAlpha = true;
    const value = new StandardMaterial(`arena.sign.${zone.id}`, scene);
    value.disableLighting = true; value.emissiveTexture = texture; value.opacityTexture = texture;
    value.diffuseColor = Color3.Black(); value.specularColor = Color3.Black(); value.fogEnabled = false; value.zOffset = -2;
    const plane = MeshBuilder.CreatePlane(`arena.sign.${zone.id}`, { width: 3.2, height: 4 }, scene);
    plane.material = value; plane.isPickable = false;
    // Flat on the floor just outside the line, top edge toward the trial: always in the chase camera's view and never in its way.
    plane.rotation.x = Math.PI / 2;
    plane.position.set((zone.minX + zone.maxX) / 2, 0.03, zone.minZ - 2.7);
    return { zone, texture, plane, drawn: -1 };
  });
  function star(context: CanvasRenderingContext2D, cx: number, cy: number, radius: number, filled: boolean) {
    context.beginPath();
    for (let point = 0; point < 10; point++) {
      const reach = point % 2 ? radius * 0.45 : radius, angle = -Math.PI / 2 + point * Math.PI / 5;
      context[point ? 'lineTo' : 'moveTo'](cx + Math.cos(angle) * reach, cy + Math.sin(angle) * reach);
    }
    context.closePath();
    context.lineWidth = 5; context.strokeStyle = '#ffd45a'; context.stroke();
    if (filled) { context.fillStyle = '#ffd45a'; context.fill(); }
  }
  function drawSign(sign: (typeof signs)[number], stars: number) {
    if (sign.drawn === stars) return;
    sign.drawn = stars;
    const context = sign.texture.getContext() as CanvasRenderingContext2D;
    const color = TRIAL_COLOR[sign.zone.id];
    context.clearRect(0, 0, 256, 320);
    context.fillStyle = 'rgba(8,14,22,0.55)';
    context.beginPath(); context.roundRect(6, 6, 244, 308, 26); context.fill();
    context.lineWidth = 6; context.strokeStyle = color; context.stroke();
    context.lineCap = 'round'; context.lineJoin = 'round'; context.lineWidth = 14; context.fillStyle = color;
    if (sign.zone.id === 'course') {
      // Up the wall: a hand-hold ladder and an arrow.
      for (const y of [176, 132, 88]) { context.beginPath(); context.moveTo(92, y); context.lineTo(128, y - 30); context.lineTo(164, y); context.stroke(); }
    } else if (sign.zone.id === 'ring') {
      // A robot face with a spark over it.
      context.beginPath(); context.roundRect(70, 78, 116, 96, 20); context.stroke();
      context.beginPath(); context.arc(104, 124, 11, 0, Math.PI * 2); context.arc(152, 124, 11, 0, Math.PI * 2); context.fill();
      context.beginPath(); context.moveTo(128, 78); context.lineTo(128, 50); context.stroke();
    } else {
      // An eye with a line through it: do not be seen.
      context.beginPath(); context.moveTo(56, 122); context.quadraticCurveTo(128, 56, 200, 122); context.quadraticCurveTo(128, 188, 56, 122); context.stroke();
      context.beginPath(); context.arc(128, 122, 18, 0, Math.PI * 2); context.fill();
      context.beginPath(); context.moveTo(70, 180); context.lineTo(186, 64); context.stroke();
    }
    for (let index = 0; index < STAR_MAX; index++) star(context, 62 + index * 66, 252, 26, index < stars);
    sign.texture.update();
  }

  // ---------- Practice sparks, the vault spark and hiding places ----------
  const dot = softDotTexture(scene, 'arena.soft-dot');
  const goldDot = softDotTexture(scene, 'arena.gold-dot', [255, 214, 130]);
  const gemSource = MeshBuilder.CreatePolyhedron('arena.gem', { type: 1, size: 0.2 }, scene);
  gemSource.setEnabled(false);
  const haloMaterial = spriteMaterial(scene, 'arena.gem-halo', goldDot, 0.55);
  const gems = PICKUPS.map((pickup, index) => {
    const gem = lit(gemSource.clone(`arena.gem.${pickup.id}`));
    gem.setEnabled(true); gem.material = G.gem;
    gem.position.set(pickup.x, pickup.y, pickup.z);
    gem.scaling.set(1, 1.45, 1).scaleInPlace(pickup.trial === 'stealth' ? 1.5 : 1);
    const halo = MeshBuilder.CreatePlane(`arena.gem-halo.${pickup.id}`, { size: pickup.trial === 'stealth' ? 2.8 : 1.9 }, scene);
    halo.material = haloMaterial; halo.billboardMode = Mesh.BILLBOARDMODE_ALL; halo.isPickable = false;
    halo.position.copyFrom(gem.position);
    return { pickup, gem, halo, phase: index * 0.7, taken: false };
  });
  const hides = HIDE_SPOTS.map(spot => {
    const disc = MeshBuilder.CreateDisc(`arena.hide.${spot.id}`, { radius: ARENA.hideRadius, tessellation: 28 }, scene);
    disc.rotation.x = Math.PI / 2; disc.position.set(spot.x, 0.03, spot.z);
    disc.material = G.hide; disc.isPickable = false; disc.visibility = 0.5;
    const edge = lit(MeshBuilder.CreateTorus(`arena.hide-edge.${spot.id}`, { diameter: ARENA.hideRadius * 2, thickness: 0.05, tessellation: 36 }, scene));
    edge.position.set(spot.x, 0.04, spot.z); edge.material = G.hideEdge; edge.visibility = 0.5;
    return { spot, disc, edge };
  });

  // ---------- Robots ----------
  const markTexture = (name: string, glyph: string, color: string) => {
    const texture = new DynamicTexture(name, { width: 128, height: 128 }, scene, true);
    texture.hasAlpha = true;
    const context = texture.getContext() as CanvasRenderingContext2D;
    context.clearRect(0, 0, 128, 128);
    context.font = 'bold 112px system-ui, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
    context.lineWidth = 10; context.strokeStyle = 'rgba(6,10,16,0.9)'; context.strokeText(glyph, 64, 70);
    context.fillStyle = color; context.fillText(glyph, 64, 70);
    texture.update();
    const value = new StandardMaterial(name, scene);
    value.disableLighting = true; value.emissiveTexture = texture; value.opacityTexture = texture;
    value.diffuseColor = Color3.Black(); value.specularColor = Color3.Black(); value.fogEnabled = false; value.backFaceCulling = false;
    return value;
  };
  const curiousMark = markTexture('arena.mark-curious', '?', EYE.curious);
  const alertMark = markTexture('arena.mark-alert', '!', EYE.alert);
  const part = (mesh: Mesh, parent: TransformNode, value: Material, x: number, y: number, z: number, cast = true) => {
    mesh.parent = parent; mesh.position.set(x, y, z); mesh.material = value; mesh.isPickable = false; mesh.receiveShadows = true;
    if (cast) shadows.addShadowCaster(mesh);
    return mesh;
  };
  const box = (name: string, w: number, h: number, d: number) => MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
  const fanPositions = () => new Float32Array((FAN_RAYS + 2) * 3);

  function buildRobot(spec: RobotSpec) {
    const profile = ROBOT_PROFILES[spec.kind];
    const id = `arena.robot.${spec.id}`;
    const root = new TransformNode(id, scene);
    const body = new TransformNode(`${id}.body`, scene);
    body.parent = root;
    const spinners: { node: TransformNode; axis: 'x' | 'y'; rate: number }[] = [];
    const legs: TransformNode[] = [];
    let tail: TransformNode | null = null;
    let eye: Mesh;
    if (spec.kind === 'iguana') {
      part(MeshBuilder.CreateSphere(`${id}.torso`, { diameterX: 0.56, diameterY: 0.36, diameterZ: 1.08, segments: 10 }, scene), body, M.shell, 0, 0.42, 0);
      part(box(`${id}.head`, 0.36, 0.25, 0.38), body, M.shell, 0, 0.5, 0.62);
      for (let index = 0; index < 3; index++) part(box(`${id}.spine.${index}`, 0.05, 0.12, 0.16), body, M.shellDark, 0, 0.63, -0.28 + index * 0.26, false);
      eye = part(box(`${id}.eye`, 0.3, 0.07, 0.05), body, eyeMaterials.calm, 0, 0.55, 0.81, false);
      tail = new TransformNode(`${id}.tail`, scene); tail.parent = body; tail.position.set(0, 0.4, -0.45);
      const taper = part(MeshBuilder.CreateCylinder(`${id}.tail-mesh`, { height: 0.85, diameterTop: 0.04, diameterBottom: 0.24, tessellation: 8 }, scene), tail, M.shell, 0, 0, -0.42);
      taper.rotation.x = -Math.PI / 2;
      for (const [x, z] of [[0.3, 0.3], [-0.3, 0.3], [0.3, -0.3], [-0.3, -0.3]]) {
        const hip = new TransformNode(`${id}.hip`, scene); hip.parent = body; hip.position.set(x, 0.32, z);
        part(box(`${id}.leg`, 0.11, 0.32, 0.13), hip, M.shellDark, 0, -0.16, 0);
        legs.push(hip);
      }
    } else if (spec.kind === 'drone') {
      part(MeshBuilder.CreateSphere(`${id}.shell`, { diameterX: 0.5, diameterY: 0.32, diameterZ: 0.5, segments: 10 }, scene), body, M.drone, 0, 0.2, 0);
      eye = part(MeshBuilder.CreateSphere(`${id}.eye`, { diameter: 0.17, segments: 8 }, scene), body, eyeMaterials.calm, 0, 0.18, 0.22, false);
      for (const x of [-0.32, 0.32]) {
        part(box(`${id}.arm`, 0.2, 0.04, 0.06), body, M.shellDark, x * 0.75, 0.28, 0, false);
        const rotor = new TransformNode(`${id}.rotor`, scene); rotor.parent = body; rotor.position.set(x, 0.34, 0);
        part(box(`${id}.blade`, 0.44, 0.015, 0.06), rotor, M.shellDark, 0, 0, 0, false);
        spinners.push({ node: rotor, axis: 'y', rate: 38 });
      }
    } else if (spec.kind === 'mower') {
      part(box(`${id}.deck`, 1.14, 0.46, 1.34), body, M.mower, 0, 0.46, 0);
      part(box(`${id}.cowl`, 0.8, 0.26, 0.72), body, M.shellDark, 0, 0.8, -0.1);
      part(box(`${id}.bumper`, 1.2, 0.12, 0.12), body, M.shellDark, 0, 0.3, 0.7);
      eye = part(box(`${id}.eye`, 0.62, 0.09, 0.05), body, eyeMaterials.calm, 0, 0.6, 0.69, false);
      const drum = new TransformNode(`${id}.drum`, scene); drum.parent = body; drum.position.set(0, 0.2, 0.78);
      const blade = part(MeshBuilder.CreateCylinder(`${id}.blade`, { height: 1.04, diameter: 0.3, tessellation: 6 }, scene), drum, M.drone, 0, 0, 0);
      blade.rotation.z = Math.PI / 2;
      spinners.push({ node: drum, axis: 'x', rate: 6 });
      for (const [x, z] of [[0.6, 0.42], [-0.6, 0.42], [0.6, -0.42], [-0.6, -0.42]]) {
        const wheel = part(MeshBuilder.CreateCylinder(`${id}.wheel`, { height: 0.14, diameter: 0.42, tessellation: 12 }, scene), body, M.shellDark, x, 0.21, z);
        wheel.rotation.z = Math.PI / 2;
      }
    } else {
      part(MeshBuilder.CreateCylinder(`${id}.base`, { height: 0.14, diameter: 0.8, tessellation: 12 }, scene), body, M.metal, 0, 0.07, 0);
      part(MeshBuilder.CreateCylinder(`${id}.post`, { height: 1.9, diameter: 0.16, tessellation: 8 }, scene), body, M.metal, 0, 1, 0);
      const housing = part(box(`${id}.lamp`, 0.4, 0.32, 0.52), body, M.shellDark, 0, 2.05, 0.12);
      housing.rotation.x = 0.3;
      eye = part(MeshBuilder.CreateCylinder(`${id}.lens`, { height: 0.04, diameter: 0.28, tessellation: 14 }, scene), body, eyeMaterials.calm, 0, 1.97, 0.38, false);
      eye.rotation.x = Math.PI / 2 + 0.3;
    }
    lit(eye);
    // Sparks left, as pips over its head.
    const top = profile.height + (spec.kind === 'sentry' ? 0.45 : 0.5);
    const pips = Array.from({ length: profile.sparks }, (_unused, index) => {
      const pip = lit(MeshBuilder.CreateSphere(`${id}.pip.${index}`, { diameter: 0.14, segments: 6 }, scene));
      pip.parent = root; pip.position.set((index - (profile.sparks - 1) / 2) * 0.22, top, 0); pip.material = G.pip;
      return pip;
    });
    const mark = MeshBuilder.CreatePlane(`${id}.mark`, { size: 0.62 }, scene);
    mark.parent = root; mark.position.set(0, top + 0.5, 0); mark.billboardMode = Mesh.BILLBOARDMODE_ALL; mark.isPickable = false; mark.material = curiousMark; mark.setEnabled(false);
    const wrapRing = lit(MeshBuilder.CreateTorus(`${id}.wrap`, { diameter: profile.radius * 2 + 0.5, thickness: 0.06, tessellation: 22 }, scene));
    wrapRing.parent = root; wrapRing.position.y = profile.height * 0.5; wrapRing.material = G.wrap; wrapRing.setEnabled(false);
    // What it can see right now, drawn on the floor and cut off by cover.
    let fan: Mesh | null = null;
    const positions = fanPositions();
    if (spec.kind !== 'drone') {
      fan = new Mesh(`${id}.fan`, scene);
      const data = new VertexData();
      const indices: number[] = [];
      for (let ray = 1; ray <= FAN_RAYS; ray++) indices.push(0, ray + 1, ray);
      data.positions = Array.from(positions); data.indices = indices; data.normals = Array.from({ length: positions.length }, (_unused, index) => (index % 3 === 1 ? 1 : 0));
      data.applyToMesh(fan, true);
      fan.material = fanMaterials.calm; fan.isPickable = false; fan.alwaysSelectAsActiveMesh = true; fan.setEnabled(false);
    }
    // Where its attack will go: shown for the whole wind-up.
    const lane = spec.kind === 'sentry' ? null : spec.kind === 'drone'
      ? MeshBuilder.CreateDisc(`${id}.lane`, { radius: profile.hit + TUNING.radius, tessellation: 24 }, scene)
      : MeshBuilder.CreatePlane(`${id}.lane`, { width: (profile.hit + TUNING.radius) * 2, height: profile.strikeDistance }, scene);
    if (lane) { lane.rotation.x = Math.PI / 2; lane.material = G.lane; lane.isPickable = false; lane.setEnabled(false); }
    return { spec, profile, root, body, eye, pips, mark, wrap: wrapRing, fan, positions, lane, spinners, legs, tail,
      shown: 0, walked: 0, down: 0, eyeKey: 'calm' as EyeKey, fanKey: 'calm' as 'calm' | 'curious' | 'alert', lastSparks: profile.sparks };
  }
  const robots = ROBOTS.map(buildRobot);
  for (const robot of robots) robot.root.setEnabled(false);

  // The floodlight is a real light: the yard is bright where it looks and dark while it rests.
  const flood = robots.find(robot => robot.spec.kind === 'sentry') ?? null;
  const spot = flood ? new SpotLight('arena.floodlight', new Vector3(flood.spec.x, 2, flood.spec.z), new Vector3(0, -0.3, -1), ROBOT_PROFILES.sentry.cone * 2.1, 4, scene) : null;
  if (spot) { spot.diffuse = new Color3(1, 0.95, 0.8); spot.intensity = 0; spot.range = ROBOT_PROFILES.sentry.sight * 1.6; }
  const catchBeam = MeshBuilder.CreateCylinder('arena.catch-beam', { height: 1, diameterTop: 0.9, diameterBottom: 0.16, tessellation: 12 }, scene);
  catchBeam.material = G.catchBeam; catchBeam.isPickable = false; catchBeam.rotationQuaternion = new Quaternion(); catchBeam.setEnabled(false);

  // ---------- Target marker, dizzy stars, bursts ----------
  const target = lit(MeshBuilder.CreateTorus('arena.target', { diameter: 1, thickness: 0.045, tessellation: 30 }, scene));
  target.material = G.target; target.billboardMode = Mesh.BILLBOARDMODE_ALL; target.setEnabled(false);
  const targetInner = lit(MeshBuilder.CreateTorus('arena.target-inner', { diameter: 0.62, thickness: 0.05, tessellation: 24 }, scene));
  targetInner.material = G.quiet; targetInner.billboardMode = Mesh.BILLBOARDMODE_ALL; targetInner.setEnabled(false);
  const dizzyStars = Array.from({ length: 3 }, (_unused, index) => {
    const value = lit(MeshBuilder.CreatePolyhedron(`arena.dizzy.${index}`, { type: 1, size: 0.07 }, scene));
    value.material = G.star; value.setEnabled(false);
    return value;
  });
  function burst(name: string, color: string, fade: string, size: [number, number], power: [number, number]) {
    const system = new ParticleSystem(name, 220, scene);
    system.particleTexture = dot;
    system.emitter = new Vector3();
    system.minEmitBox = new Vector3(-0.2, -0.1, -0.2); system.maxEmitBox = new Vector3(0.2, 0.2, 0.2);
    system.color1 = color4(color, 0.95); system.color2 = color4(color, 0.8); system.colorDead = color4(fade, 0);
    system.minSize = size[0]; system.maxSize = size[1];
    system.minLifeTime = 0.3; system.maxLifeTime = 0.85;
    system.gravity = new Vector3(0, -3, 0);
    system.direction1 = new Vector3(-1, 0.4, -1); system.direction2 = new Vector3(1, 1.6, 1);
    system.minEmitPower = power[0]; system.maxEmitPower = power[1];
    system.emitRate = 0; system.manualEmitCount = 0;
    system.blendMode = ParticleSystem.BLENDMODE_ADD;
    system.updateSpeed = 1 / 60;
    system.start();
    return system;
  }
  const sparkBurst = burst('arena.spark-burst', '#ffe9a8', '#ff9a3a', [0.06, 0.18], [1.6, 5]);
  const zapBurst = burst('arena.zap-burst', '#8ff3ff', '#3a7dff', [0.05, 0.15], [1.2, 3.6]);
  const emit = (system: ParticleSystem, x: number, y: number, z: number, count: number) => { (system.emitter as Vector3).set(x, y, z); system.manualEmitCount += count; };

  // ---------- Hero ----------
  const proxy = createHeroAvatar(scene);
  let person: PersonAvatar | null = null;
  let avatar: Pick<PersonAvatar, 'update' | 'handPosition' | 'setEnabled'> & { snapshot(): object } = proxy;
  proxy.shadowCasters().forEach(mesh => shadows.addShadowCaster(mesh));
  const effects = createHeroEffects(scene, LUKE_ARENA);
  effects.setEnabled(true);
  canvas.dataset.heroModel = 'loading';
  void loadPersonAvatar(scene).then(loaded => {
    person = loaded;
    proxy.shadowCasters().forEach(mesh => shadows.removeShadowCaster(mesh));
    proxy.setEnabled(false);
    loaded.shadowCasters().forEach(mesh => shadows.addShadowCaster(mesh));
    presentation.includeInGlow(loaded.meshes);
    avatar = loaded;
    canvas.dataset.heroModel = 'person';
  }).catch(error => {
    console.error('The realistic hero model did not load; the suited proxy stays in use.', error);
    canvas.dataset.heroModel = 'proxy';
  });

  // ---------- The sidekick: a placeholder figure, the ring to stand in for a throw, his stun, and the dive ----------
  const dad = createSidekickFigure(scene);
  dad.shadowCasters().forEach(mesh => shadows.addShadowCaster(mesh));
  dad.setEnabled(false);
  const oopRing = lit(MeshBuilder.CreateTorus('arena.oop-ring', { diameter: ARENA.oopReach * 2, thickness: 0.07, tessellation: 48 }, scene));
  oopRing.material = G.oop; oopRing.setEnabled(false);
  // An up arrow over his head: "throw me". A picture, so nothing needs reading.
  const arrowTexture = new DynamicTexture('arena.oop-arrow', { width: 128, height: 128 }, scene, true);
  arrowTexture.hasAlpha = true;
  {
    const context = arrowTexture.getContext() as CanvasRenderingContext2D;
    context.clearRect(0, 0, 128, 128);
    context.beginPath();
    for (const [x, y] of [[64, 10], [114, 62], [84, 62], [84, 118], [44, 118], [44, 62], [14, 62]]) context.lineTo(x, y);
    context.closePath();
    context.lineJoin = 'round'; context.lineWidth = 10; context.strokeStyle = 'rgba(6,10,16,0.9)'; context.stroke();
    context.fillStyle = '#ffb347'; context.fill();
    arrowTexture.update();
  }
  const arrowMaterial = new StandardMaterial('arena.oop-arrow', scene);
  arrowMaterial.disableLighting = true; arrowMaterial.emissiveTexture = arrowTexture; arrowMaterial.opacityTexture = arrowTexture;
  arrowMaterial.diffuseColor = Color3.Black(); arrowMaterial.specularColor = Color3.Black(); arrowMaterial.fogEnabled = false; arrowMaterial.backFaceCulling = false;
  const oopArrow = MeshBuilder.CreatePlane('arena.oop-arrow', { size: 0.9 }, scene);
  oopArrow.billboardMode = Mesh.BILLBOARDMODE_ALL; oopArrow.isPickable = false; oopArrow.material = arrowMaterial; oopArrow.setEnabled(false);
  const line = (name: string, diameter: number, value: Material) => {
    const mesh = lit(MeshBuilder.CreateCylinder(name, { height: 1, diameter, tessellation: 8 }, scene));
    mesh.material = value; mesh.rotationQuaternion = new Quaternion(); mesh.setEnabled(false);
    return mesh;
  };
  const stunBeam = line('arena.stun-beam', 0.1, G.stunBeam);
  const stunStars = Array.from({ length: 3 }, (_unused, index) => {
    const value = lit(MeshBuilder.CreatePolyhedron(`arena.stun-star.${index}`, { type: 1, size: 0.08 }, scene));
    value.material = G.star; value.setEnabled(false);
    return value;
  });
  // What a dive will land on glows while time is slow; lines run to each as Luke comes down.
  const diveRings = Array.from({ length: ARENA.diveCount }, (_unused, index) => {
    const ring = lit(MeshBuilder.CreateTorus(`arena.dive-ring.${index}`, { diameter: 1, thickness: 0.07, tessellation: 30 }, scene));
    ring.material = G.dive; ring.billboardMode = Mesh.BILLBOARDMODE_ALL; ring.setEnabled(false);
    return ring;
  });
  const webLines = Array.from({ length: ARENA.diveCount }, (_unused, index) => line(`arena.web-line.${index}`, 0.035, G.web));
  presentation.includeInGlow(dad.meshes);
  presentation.includeInGlow(glowing);
  presentation.syncGlow();

  // Distance along a flat ray to the first block, for the sight fans.
  function reach(x: number, z: number, dirX: number, dirZ: number, limit: number, eyeHeight: number) {
    let best = limit;
    for (const solid of LUKE_ARENA.solids) {
      if (solid.maxY <= eyeHeight || solid.kind === 'trunk') continue;
      const tx1 = (solid.minX - x) / dirX, tx2 = (solid.maxX - x) / dirX;
      const tz1 = (solid.minZ - z) / dirZ, tz2 = (solid.maxZ - z) / dirZ;
      const near = Math.max(Math.min(tx1, tx2), Math.min(tz1, tz2)), far = Math.min(Math.max(tx1, tx2), Math.max(tz1, tz2));
      if (far >= Math.max(near, 0) && near > 0 && near < best) best = near;
    }
    return best;
  }

  let elapsed = 0;
  let rendered = false;
  let lastProgress = '';
  let lifted = 0;
  let oopLook = 0;
  const up = Vector3.Up(), direction = new Vector3();
  /** Lay a unit-length cylinder between two points. */
  const stretch = (mesh: Mesh, from: { x: number; y: number; z: number }, toX: number, toY: number, toZ: number) => {
    direction.set(toX - from.x, toY - from.y, toZ - from.z);
    const length = Math.max(0.01, direction.length());
    direction.scaleInPlace(1 / length);
    Quaternion.FromUnitVectorsToRef(up, direction, mesh.rotationQuaternion!);
    mesh.position.set(from.x + direction.x * length / 2, from.y + direction.y * length / 2, from.z + direction.z * length / 2);
    mesh.scaling.y = length;
  };

  function update(frame: ArenaFrame, dt: number, reducedMotion: boolean, snap = false) {
    const { state, previous, events } = frame;
    elapsed += dt;
    const { hero } = state;
    const teleported = Math.abs(hero.x - previous.hero.x) + Math.abs(hero.y - previous.hero.y) + Math.abs(hero.z - previous.hero.z) > 2;
    const from = teleported || snap ? hero : previous.hero;
    const alpha = Math.max(0, Math.min(1, frame.alpha));
    // Held by the floodlight: lifted a little off the ground.
    lifted = snap ? 0 : lerp(lifted, state.held > 0 ? 1 : 0, 1 - Math.exp(-8 * dt));
    const view = { hero, events: frame.heroEvents, cutaway: false,
      x: lerp(from.x, hero.x, alpha), y: lerp(from.y, hero.y, alpha) + lifted * 0.45, z: lerp(from.z, hero.z, alpha) };

    // ----- Robots -----
    const snared = state.snareId ? state.robots.find(robot => robot.id === state.snareId) ?? null : null;
    let reachPoint: { x: number; y: number; z: number } | null = null;
    for (let index = 0; index < robots.length; index++) {
      const entry = robots[index], now = state.robots[index], before = previous.robots[index];
      const { profile, spec } = entry;
      const active = now.mode !== 'dormant' && now.mode !== 'resolved';
      // Power up when its wave starts; slump, then sink away, when it powers down.
      entry.down = now.mode === 'resolved' ? entry.down + dt : 0;
      const wanted = active ? 1 : now.mode === 'resolved' && entry.down < 1.6 ? 1 : 0;
      entry.shown = snap ? wanted : lerp(entry.shown, wanted, 1 - Math.exp(-(wanted ? 9 : 5) * dt));
      const visible = entry.shown > 0.02;
      entry.root.setEnabled(visible);
      if (entry.fan) entry.fan.setEnabled(false);
      if (entry.lane) entry.lane.setEnabled(false);
      if (!visible) continue;
      const jumped = Math.abs(now.x - before.x) + Math.abs(now.z - before.z) > 2;
      const x = jumped || snap ? now.x : lerp(before.x, now.x, alpha), z = jumped || snap ? now.z : lerp(before.z, now.z, alpha);
      const y = jumped || snap ? now.y : lerp(before.y, now.y, alpha);
      const yaw = jumped || snap ? now.yaw : before.yaw + wrap(now.yaw - before.yaw) * alpha;
      // One fixed step of travel, turned back into metres per rendered frame.
      if (!jumped) entry.walked += Math.hypot(now.x - before.x, now.z - before.z) / TRAVERSAL_STEP * dt;
      const slump = Math.min(1, entry.down * 2.5);
      entry.root.position.set(x, y - (now.mode === 'resolved' ? Math.max(0, entry.down - 0.9) * 1.4 : 0), z);
      entry.root.rotation.y = yaw;
      entry.root.scaling.setAll(Math.max(0.05, entry.shown));
      const windup = now.mode === 'windup' ? 1 - Math.max(0, now.timer) / profile.windup : 0;
      const shake = reducedMotion ? 0 : (now.hold > 0 ? 0.015 : windup * 0.03) * Math.sin(elapsed * 60);
      // Body language: rear back to wind up, stretch into the strike, droop while recovering.
      const pitch = now.mode === 'windup' ? -0.28 * windup : now.mode === 'strike' ? 0.22 : now.mode === 'recover' ? 0.16 : 0;
      entry.body.rotation.set(spec.kind === 'sentry' ? 0 : pitch + slump * 0.5, 0, shake * 4 + slump * (spec.kind === 'drone' ? 1.2 : 0.35));
      entry.body.position.set(shake, spec.kind === 'drone' && !reducedMotion && active ? Math.sin(elapsed * 3 + index) * 0.06 : 0, 0);
      entry.body.scaling.y = 1 - slump * (spec.kind === 'sentry' ? 0 : 0.35);
      for (const spinner of entry.spinners) {
        const rate = active && now.hold <= 0 ? spinner.rate * (spec.kind === 'mower' ? 1 + windup * 9 + (now.mode === 'strike' ? 9 : 0) : 1) : 0;
        if (!reducedMotion || spec.kind === 'drone') spinner.node.rotation[spinner.axis] += rate * dt;
      }
      for (let leg = 0; leg < entry.legs.length; leg++) entry.legs[leg].rotation.x = active ? Math.sin(entry.walked * 7 + (leg === 0 || leg === 3 ? 0 : Math.PI)) * 0.55 : 0;
      if (entry.tail) entry.tail.rotation.y = active && !reducedMotion ? Math.sin(elapsed * (now.mode === 'alert' ? 7 : 2.4) + index) * 0.4 : 0;

      const eyeKey: EyeKey = !active ? 'off' : now.hold > 0 ? 'held' : now.mode === 'recover' ? (Math.sin(elapsed * 12) > 0 || reducedMotion ? 'off' : 'calm')
        : now.awareness >= 1 || now.mode === 'alert' || now.mode === 'windup' || now.mode === 'strike' ? 'alert' : now.awareness >= ARENA.unaware || now.mode === 'curious' || now.mode === 'search' ? 'curious' : 'calm';
      if (eyeKey !== entry.eyeKey) { entry.eyeKey = eyeKey; entry.eye.material = eyeMaterials[eyeKey]; }
      entry.pips.forEach((pip, pipIndex) => { pip.material = pipIndex < now.sparks ? G.pip : G.pipSpent; pip.setEnabled(active); });
      if (now.sparks < entry.lastSparks) emit(now.sparks > 0 ? zapBurst : sparkBurst, x, y + profile.height * 0.6, z, reducedMotion ? 10 : now.sparks > 0 ? 26 : 60);
      entry.lastSparks = now.sparks;
      const marked = active && now.hold <= 0 && (eyeKey === 'alert' || eyeKey === 'curious') && now.mode !== 'windup' && now.mode !== 'strike';
      entry.mark.setEnabled(marked);
      if (marked) { entry.mark.material = eyeKey === 'alert' ? alertMark : curiousMark; entry.mark.scaling.setAll(reducedMotion ? 1 : 1 + Math.sin(elapsed * 9) * 0.08); }
      entry.wrap.setEnabled(active && now.hold > 0);
      if (now.hold > 0) { entry.wrap.rotation.y = elapsed * 6; entry.wrap.scaling.setAll(now.tethered ? 1 : 0.8); }
      if (snared === now) reachPoint = { x, y: y + profile.height * 0.55, z };

      // Sight on the floor, for robots that are still looking rather than fighting.
      const looking = active && now.hold <= 0 && (now.mode === 'patrol' || now.mode === 'curious' || now.mode === 'search');
      if (entry.fan && looking) {
        const positions = entry.positions, eyeHeight = profile.eye;
        positions[0] = x; positions[1] = 0.06; positions[2] = z;
        for (let ray = 0; ray <= FAN_RAYS; ray++) {
          const angle = yaw - profile.cone + (ray / FAN_RAYS) * profile.cone * 2;
          const dirX = Math.sin(angle) || 1e-9, dirZ = Math.cos(angle) || 1e-9;
          const length = reach(now.x, now.z, dirX, dirZ, profile.sight, eyeHeight);
          positions[(ray + 1) * 3] = x + dirX * length; positions[(ray + 1) * 3 + 1] = 0.06; positions[(ray + 1) * 3 + 2] = z + dirZ * length;
        }
        entry.fan.updateVerticesData(VertexBuffer.PositionKind, positions);
        const fanKey = eyeKey === 'alert' ? 'alert' : eyeKey === 'curious' ? 'curious' : 'calm';
        if (fanKey !== entry.fanKey) { entry.fanKey = fanKey; entry.fan.material = fanMaterials[fanKey]; }
        entry.fan.visibility = 0.55 + now.awareness * 0.45;
        entry.fan.setEnabled(true);
      }
      // The telegraph: a lane or a landing spot that fills in as the wind-up runs out.
      if (entry.lane && (now.mode === 'windup' || now.mode === 'strike')) {
        const committed = now.mode === 'strike' || now.timer <= profile.windup * 0.4;
        entry.lane.visibility = committed ? (reducedMotion ? 0.95 : 0.75 + Math.sin(elapsed * 30) * 0.2) : 0.25 + windup * 0.5;
        if (spec.kind === 'drone') {
          // The dive's landing spot: where Luke was when it committed. While striking, the stored value is a direction.
          if (now.mode === 'windup') entry.lane.position.set(now.strikeX, 0.05, now.strikeZ);
        } else {
          entry.lane.position.set(x + Math.sin(yaw) * profile.strikeDistance / 2, 0.05, z + Math.cos(yaw) * profile.strikeDistance / 2);
          entry.lane.rotation.y = yaw;
        }
        entry.lane.setEnabled(true);
      }
    }

    // ----- Sidekick -----
    const buddy = state.sidekick, buddyBefore = previous.sidekick;
    dad.setEnabled(buddy.present);
    const aimedAt = buddy.present && buddy.aimId ? robots.find(robot => robot.spec.id === buddy.aimId) : undefined;
    const offered = buddy.present && buddy.mode === 'ready';
    // He can be asked: the ring is faint. Luke is standing in it: the ring is bright and the arrow is up.
    const listening = buddy.present && buddy.cooldown <= 0 && buddy.timer <= 0 && buddy.mode !== 'wait' && state.bonk <= 0 && state.held <= 0 && state.oop === '';
    oopRing.setEnabled(listening); oopArrow.setEnabled(offered); stunBeam.setEnabled(Boolean(aimedAt));
    if (buddy.present) {
      const hopped = Math.abs(buddy.x - buddyBefore.x) + Math.abs(buddy.z - buddyBefore.z) > 1.5;
      const bx = hopped || snap ? buddy.x : lerp(buddyBefore.x, buddy.x, alpha), bz = hopped || snap ? buddy.z : lerp(buddyBefore.z, buddy.z, alpha);
      const byaw = hopped || snap ? buddy.yaw : buddyBefore.yaw + wrap(buddy.yaw - buddyBefore.yaw) * alpha;
      const speed = hopped || snap ? 0 : Math.hypot(buddy.x - buddyBefore.x, buddy.z - buddyBefore.z) / TRAVERSAL_STEP;
      dad.update({ x: bx, z: bz, yaw: byaw, speed, mode: buddy.mode }, dt, reducedMotion, snap || hopped);
      if (events & ARENA_EVENT.zip) emit(zapBurst, buddy.x, 1, buddy.z, reducedMotion ? 8 : 36);
      if (listening) { oopRing.position.set(bx, 0.05, bz); oopRing.visibility = offered ? (reducedMotion ? 0.95 : 0.78 + Math.sin(elapsed * 7) * 0.2) : 0.3; }
      if (offered) { oopArrow.position.set(bx, 2.4 + (reducedMotion ? 0 : Math.sin(elapsed * 5) * 0.09), bz); oopArrow.scaling.setAll(reducedMotion ? 1 : 1 + Math.sin(elapsed * 7) * 0.06); }
      if (aimedAt) {
        const at = aimedAt.root.position, middle = aimedAt.profile.height * 0.55;
        stretch(stunBeam, dad.handPosition(), at.x, at.y + middle, at.z);
        if (events & ARENA_EVENT.stun) emit(sparkBurst, at.x, at.y + middle, at.z, reducedMotion ? 8 : 26);
      }
    }
    // Dizzy stars circle a stunned robot until it wears off.
    const dazed = robots[state.robots.findIndex(robot => robot.stunned)];
    stunStars.forEach((value, index) => {
      value.setEnabled(Boolean(dazed));
      if (!dazed) return;
      const angle = (reducedMotion ? 0 : elapsed * 4.5) + index * Math.PI * 2 / 3, at = dazed.root.position;
      value.position.set(at.x + Math.cos(angle) * (dazed.profile.radius + 0.25), at.y + dazed.profile.height + 0.35, at.z + Math.sin(angle) * (dazed.profile.radius + 0.25));
    });
    // The alley-oop: what the dive will land on glows during the slow moment and until Luke comes down.
    const diving = state.oop === 'hang' ? diveTargets(ARENA_LAYOUT, state).map(robot => robot.id) : state.oop === 'dive' ? state.diveIds : [];
    diveRings.forEach((ring, index) => {
      const entry = diving[index] ? robots.find(robot => robot.spec.id === diving[index]) : undefined;
      ring.setEnabled(Boolean(entry));
      if (!entry) return;
      ring.position.copyFrom(entry.root.position); ring.position.y += entry.profile.height * 0.5;
      ring.scaling.setAll((entry.profile.radius * 2 + (index === 0 ? 1.2 : 0.85)) * (reducedMotion ? 1 : 1 + Math.sin(elapsed * 11 + index) * 0.07));
    });
    if (state.oop === 'dive') reachPoint = { x: state.oopToX, y: state.oopToY - 0.15, z: state.oopToZ };

    // ----- Floodlight -----
    if (flood && spot) {
      const now = state.robots[robots.indexOf(flood)];
      const on = now.mode !== 'resolved' && now.mode !== 'recover' && now.hold <= 0;
      spot.intensity = lerp(spot.intensity, on ? FLOOD_INTENSITY : 0, 1 - Math.exp(-10 * dt));
      spot.direction.set(Math.sin(now.yaw), -0.3, Math.cos(now.yaw)).normalize();
      spot.diffuse.set(1, lerp(0.95, 0.5, now.awareness), lerp(0.8, 0.4, now.awareness));
      catchBeam.setEnabled(state.held > 0);
      if (state.held > 0) {
        direction.set(view.x - flood.spec.x, view.y + 0.9 - 2, view.z - flood.spec.z);
        const length = direction.length();
        Quaternion.FromUnitVectorsToRef(up, direction.normalize(), catchBeam.rotationQuaternion!);
        catchBeam.position.set(flood.spec.x + direction.x * length / 2, 2 + direction.y * length / 2, flood.spec.z + direction.z * length / 2);
        catchBeam.scaling.y = length;
      }
    }

    // ----- Hero, camera, tether and snare lines -----
    const anchor = hero.tetherId ? LUKE_ARENA.anchors.find(candidate => candidate.id === hero.tetherId) ?? null : null;
    avatar.update({ ...view, anchor, dizzy: state.bonk > 0 ? 1 : 0, lifted, reach: anchor ? null : reachPoint }, dt, reducedMotion, snap);
    // During an alley-oop the camera backs off and looks between Luke and the floor, so the robots below stay in the picture.
    oopLook = snap ? 0 : lerp(oopLook, state.oop !== '' ? 1 : 0, 1 - Math.exp(-6 * dt));
    follow.update({ ...view, y: view.y * (1 - 0.55 * oopLook), pull: 3.4 * oopLook }, dt, reducedMotion, snap);
    // The snare is drawn with the same line as the tether, and shoots out the same way.
    effects.update({ ...view, events: view.events | (events & ARENA_EVENT.snare ? HERO_EVENT.attach : 0), anchor: anchor ?? reachPoint, hand: avatar.handPosition(), candidateId: frame.candidateId,
      floor: supportAt(LUKE_ARENA, view.x, view.z, view.y + 0.05, 0).height, collected: [] }, dt, reducedMotion);
    aimShadows(view.x, view.z);
    if (events & ARENA_EVENT.impact) emit(state.pounceQuiet || events & ARENA_EVENT.quiet ? zapBurst : sparkBurst, view.x, view.y + 0.3, view.z, reducedMotion ? 8 : 30);
    if (events & ARENA_EVENT.hit) emit(sparkBurst, view.x, view.y + 1, view.z, reducedMotion ? 6 : 22);
    if (events & ARENA_EVENT.toss) emit(sparkBurst, view.x, view.y + 0.2, view.z, reducedMotion ? 8 : 40);
    // Lines from Luke's hand to the other robots the dive lands on; the first has the tether line itself.
    webLines.forEach((web, index) => {
      const entry = state.oop === 'dive' && index > 0 && state.diveIds[index] ? robots.find(robot => robot.spec.id === state.diveIds[index]) : undefined;
      web.setEnabled(Boolean(entry));
      if (entry) stretch(web, avatar.handPosition(), entry.root.position.x, entry.root.position.y + entry.profile.height * 0.55, entry.root.position.z);
    });
    if (events & (ARENA_EVENT.pickup | ARENA_EVENT.star)) { emit(sparkBurst, view.x, view.y + 1, view.z, reducedMotion ? 10 : 44); person?.celebrate(); }
    dizzyStars.forEach((value, index) => {
      value.setEnabled(state.bonk > 0);
      const angle = (reducedMotion ? 0 : elapsed * 4.5) + index * Math.PI * 2 / 3;
      value.position.set(view.x + Math.cos(angle) * 0.32, view.y + 1.5, view.z + Math.sin(angle) * 0.32);
    });

    // ----- Target marker -----
    const aimed = state.targetId ? robots.find(robot => robot.spec.id === state.targetId) : undefined;
    target.setEnabled(Boolean(aimed));
    targetInner.setEnabled(Boolean(aimed) && state.targetQuiet);
    if (aimed) {
      const size = aimed.profile.radius * 2 + 0.7;
      target.position.copyFrom(aimed.root.position); target.position.y += aimed.profile.height * 0.5;
      target.scaling.setAll(size * (reducedMotion ? 1 : 1 + Math.sin(elapsed * 6) * 0.05));
      target.material = state.targetQuiet ? G.quiet : G.target;
      targetInner.position.copyFrom(target.position);
      targetInner.scaling.setAll(size * (reducedMotion ? 1 : 0.9 + Math.sin(elapsed * 9) * 0.12));
    }

    // ----- Sparks, hiding places, signs -----
    for (const entry of gems) {
      const taken = entry.pickup.trial === 'course' ? state.trial === 'course' && state.lap.includes(entry.pickup.id) : state.vaultTaken && state.trial === 'stealth';
      if (taken !== entry.taken) { entry.taken = taken; entry.gem.material = taken ? G.gemTaken : G.gem; entry.halo.setEnabled(!taken); }
      entry.gem.rotation.y = reducedMotion ? entry.phase : elapsed * 1.6 + entry.phase;
      entry.gem.position.y = entry.pickup.y + (reducedMotion ? 0 : Math.sin(elapsed * 2 + entry.phase) * 0.12);
    }
    for (const entry of hides) {
      const current = state.trial === 'stealth' && state.hideId === entry.spot.id;
      entry.disc.visibility = current ? 0.9 : 0.35; entry.edge.visibility = current ? 1 : 0.4;
    }
    const progress = `${state.progress.courseStars}|${state.progress.ringStars}|${state.progress.stealthStars}`;
    if (progress !== lastProgress) { lastProgress = progress; showProgress(state.progress); }
  }
  function showProgress(progress: ArenaProgress) {
    const stars: Record<TrialId, number> = { course: progress.courseStars, ring: progress.ringStars, stealth: progress.stealthStars };
    for (const sign of signs) drawSign(sign, stars[sign.zone.id]);
  }
  showProgress({ course: [], courseStars: 0, courseBest: 0, ringStars: 0, ringBest: 0, stealthStars: 0, quiet: 0 });

  scene.onAfterRenderObservable.addOnce(() => { rendered = true; canvas.dataset.rendered = 'true'; });
  const resize = () => { quality.resize(); engine.resize(); };
  return {
    engine, scene, follow,
    update,
    render: () => scene.render(),
    resize,
    snapshot: () => ({
      rendered, meshes: scene.meshes.length, activeMeshes: scene.getActiveMeshes().length,
      robotsShown: robots.filter(robot => robot.root.isEnabled()).length, fansShown: robots.filter(robot => robot.fan?.isEnabled()).length,
      lanesShown: robots.filter(robot => robot.lane?.isEnabled()).length, targetShown: target.isEnabled(), quietShown: targetInner.isEnabled(),
      floodlight: spot ? Math.round(spot.intensity) : 0, avatar: avatar.snapshot(), effects: effects.snapshot(),
      sidekick: { shown: dad.root.isEnabled(), ...dad.snapshot(), ring: oopRing.isEnabled(), arrow: oopArrow.isEnabled(), beam: stunBeam.isEnabled(), stars: stunStars[0].isEnabled(),
        diveRings: diveRings.filter(ring => ring.isEnabled()).length, webLines: webLines.filter(web => web.isEnabled()).length },
      camera: follow.snapshot(), visual: { ...presentation.snapshot(), ...quality.snapshot() },
    }),
    dispose() {
      sparkBurst.dispose(); zapBurst.dispose(); dot.dispose(); goldDot.dispose();
      effects.dispose(); presentation.dispose(); scene.dispose(); engine.dispose();
    },
  };
}
export type ArenaView = ReturnType<typeof createArenaView>;
