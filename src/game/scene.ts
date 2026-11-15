import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3, Color3, Color4 } from '@babylonjs/core/Maths/math';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { createFirstContactVisuals, addArrivalGroundDetail, VISUAL_SHOTS } from './visual/first-contact-visuals';
import type { VisualShot } from './visual/first-contact-visuals';
import { createRenderQualityController } from './runtime/quality-controller';
import { isVisualQuality } from './runtime/quality';
import type { VisualQuality } from './runtime/quality';
import { createRenderPerformanceMonitor } from './runtime/performance';
import { createInitialState } from './state';
import type { GameState } from './state';
import { loadPodAsset } from './pod-asset';
import { createThirdPersonCamera } from './third-person-camera';
import { collectSparks, copyExplorationState, createExplorationState, nearestInteraction, interact, INTERACTION_TARGETS, savablePose, sparkCount, SPARK_IDS } from './navigation';
import type { ExplorationState, InteractionTarget } from './navigation';
import type { CameraInput } from './gamepad';
import { HOME_BLOCK, HOME_FLOOR, HOUSES } from './traversal/home-block';
import { createHero, HERO_EVENT, selectAnchor, settleHero, stepHero, travelDirection } from './traversal/hero';
import type { HeroMode, HeroState } from './traversal/hero';
import { MAX_FRAME_SECONDS, TRAVERSAL_STEP, TUNING } from './traversal/tuning';
import { supportAt } from './traversal/world';
import { createHomeBlockView } from './world/home-block-view';
import { MOON_DIRECTION } from './world/scenery';
import { createHeroAvatar } from './hero/hero-avatar';
import { createHeroEffects } from './hero/hero-effects';
import { createHeroAudio } from './hero/hero-audio';

export interface NavigationInput { forward: number; right: number; jump?: boolean; power?: boolean }
/** What the page needs to describe the practice run; presentation data, never a save. */
export interface NavigationStatus {
  mode: HeroMode;
  moving: boolean;
  /** Kind of anchor a tether would take now. */
  candidate: 'swing' | 'perch' | null;
  sparks: number;
  totalSparks: number;
  speed: number;
  /** Where the hero is now, for place names; the saved pose can lag behind while airborne. */
  x: number;
  z: number;
}
export interface NavigationSnapshot {
  enabled: boolean;
  state: ExplorationState;
  target: InteractionTarget | null;
  cameraYaw: number;
  cameraPosition: { x: number; y: number; z: number };
  focusPosition: { x: number; y: number; z: number };
  cameraClipped: boolean;
  moving: boolean;
  hero: { x: number; y: number; z: number; vx: number; vy: number; vz: number; mode: HeroMode; groundId: string; tetherId: string; hopAvailable: boolean; speed: number };
  status: NavigationStatus;
  cutaway: boolean;
}
type NavigationListener = (state: ExplorationState, target: InteractionTarget | null, status: NavigationStatus) => void;

export function createFirstContact(canvas: HTMLCanvasElement) {
  const engine = new Engine(canvas, true, { stencil: true }, true);
  const quality = createRenderQualityController(engine, canvas, 'balanced');
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.012, 0.03, 0.058, 1);
  const camera = new ArcRotateCamera('first-contact.camera', -Math.PI / 2.6, 1.05, 12, new Vector3(0, 1, 0), scene);
  camera.lowerRadiusLimit = 5;
  camera.upperRadiusLimit = 20;
  camera.lowerBetaLimit = 0.35;
  camera.upperBetaLimit = 1.45;
  camera.maxZ = 900;
  camera.attachControl(canvas, true);
  camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');
  camera.wheelPrecision = 30;
  const follow = createThirdPersonCamera(scene);
  let cameraAnchor = new Vector3(-3.3, 1.1, 0);
  const cameraPan = new Vector3();
  scene.activeCamera = camera;
  const presentation = createFirstContactVisuals(scene, [camera, follow.camera]);
  presentation.setQuality(quality.profile);
  const performanceMonitor = createRenderPerformanceMonitor(scene, engine, canvas);
  const sky = new HemisphericLight('moonlight', new Vector3(0.2, 1, 0.4), scene);
  sky.intensity = 0.3;
  sky.diffuse = new Color3(0.5, 0.66, 1);
  sky.groundColor = new Color3(0.07, 0.1, 0.12);
  const glow = new PointLight('arrival.light', new Vector3(3.5, 1.5, -0.6), scene);
  glow.diffuse = new Color3(0.18, 0.7, 1);
  glow.intensity = 8;
  glow.falloffType = PointLight.FALLOFF_PHYSICAL;
  glow.range = 8;
  const warm = new PointLight('home.light', new Vector3(-3.6, 2.3, -1.1), scene);
  warm.diffuse = new Color3(1, 0.67, 0.36);
  warm.intensity = 20;
  warm.falloffType = PointLight.FALLOFF_PHYSICAL;
  warm.range = 9;
  const moon = new DirectionalLight('moon.key', MOON_DIRECTION.scale(-1), scene);
  moon.intensity = 1.25;
  moon.diffuse = new Color3(0.68, 0.8, 1);
  // The shadow box follows the action instead of stretching one map over the whole block.
  moon.autoUpdateExtends = false;
  moon.orthoLeft = -26; moon.orthoRight = 26; moon.orthoBottom = -26; moon.orthoTop = 26;
  moon.shadowMinZ = 1; moon.shadowMaxZ = 130;
  const shadows = new ShadowGenerator(quality.profile.shadowMapSize, moon);
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = ShadowGenerator.QUALITY_LOW;
  shadows.darkness = 0.28;
  shadows.bias = 0.0012;
  shadows.normalBias = 0.03;
  // Moonlit shadows move slowly; redrawing the map every other frame halves its cost.
  const shadowMap = shadows.getShadowMap();
  if (shadowMap) shadowMap.refreshRate = 2;
  const aimShadows = (x: number, z: number) => {
    // Whole-metre steps keep shadow edges from crawling as the hero moves.
    const cx = Math.round(x / 2) * 2;
    const cz = Math.round(z / 2) * 2;
    moon.position.set(cx + MOON_DIRECTION.x * 60, MOON_DIRECTION.y * 60, cz + MOON_DIRECTION.z * 60);
  };
  aimShadows(0, 0);
  const material = presentation.material;
  const block = createHomeBlockView(scene, material, presentation.surface, shadows);
  const screen = block.screen;
  const armor = material('pod.armor', '#788c9c', undefined, 0.38, 0.72);
  armor.emissiveColor = new Color3(0.025, 0.045, 0.065);
  const dark = material('pod.joints', '#19232d', undefined, 0.52, 0.4);
  const cyan = material('signal.energy', '#61d9ef', '#63d9ff', 0.27, 0.1);
  cyan.emissiveColor.scaleInPlace(2.1);
  const gold = material('home.warm', '#cbaa80', undefined, 0.62);
  const prop = (name: string, size: [number, number, number], pos: [number, number, number], mat: PBRMaterial) => {
    const mesh = MeshBuilder.CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, scene);
    mesh.position.set(...pos);
    mesh.material = mat;
    mesh.receiveShadows = true;
    mesh.isPickable = false;
    return mesh;
  };
  // Fallback pod, shown only until (or unless) the Blender asset loads.
  const pod = MeshBuilder.CreateCylinder('pod.shell', { height: 2.2, diameterTop: 1.15, diameterBottom: 1.75, tessellation: 8 }, scene);
  pod.position.set(3.5, 1.35, 0);
  pod.scaling.set(1, 1.25, 1);
  pod.material = armor;
  pod.rotation.z = 0.2;
  const ring = MeshBuilder.CreateTorus('pod.energy-ring', { diameter: 2, thickness: 0.065, tessellation: 48 }, scene);
  ring.position.set(3.5, 1.35, 0);
  ring.rotation.z = 0.2;
  ring.material = cyan;
  const beacon = MeshBuilder.CreateCylinder('pod.beacon', { height: 2.4, diameter: 0.045, tessellation: 10 }, scene);
  beacon.position.set(3.5, 3.3, 0);
  beacon.material = cyan;
  const fallbackPanels: Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const panel = prop(`pod.panel.${i}`, [0.55, 0.15, 1.4], [3.5, 0.28, 0], dark);
    fallbackPanels.push(panel);
    panel.rotation.y = i * Math.PI * 2 / 3;
    panel.position.x += Math.sin(panel.rotation.y) * 1.2;
    panel.position.z += Math.cos(panel.rotation.y) * 1.2;
  }
  const projection = MeshBuilder.CreateLines('core.stored-dragon-design', { points: [
    new Vector3(1.4, 2.4, 0), new Vector3(2, 2.8, 0), new Vector3(2.4, 2.6, 0),
    new Vector3(2.8, 3.1, 0), new Vector3(3, 3.5, 0), new Vector3(3.3, 3.3, 0),
    new Vector3(2.8, 3.1, 0), new Vector3(2.4, 2.6, 0), new Vector3(1.4, 3.2, -0.8),
    new Vector3(1.8, 2.6, -0.4), new Vector3(2.4, 2.6, 0), new Vector3(3.2, 3.2, 0.8),
    new Vector3(2.9, 2.6, 0.4),
  ] }, scene);
  projection.color = new Color3(0.3, 0.9, 1);
  projection.position.x = 1;
  const markers = [0, 1, 2].map(index => {
    const mesh = MeshBuilder.CreateBox(`scan.target.${index}`, { size: index === 1 ? 0.2 : 0.12 }, scene);
    mesh.position.set(2.8 + index * 0.7, 0.9, -0.9);
    mesh.rotation.z = index === 1 ? Math.PI / 4 : 0;
    mesh.material = index === 1 ? cyan : gold;
    return mesh;
  });
  addArrivalGroundDetail(scene, material);
  const avatar = createHeroAvatar(scene);
  avatar.shadowCasters().forEach(mesh => shadows.addShadowCaster(mesh));
  avatar.setEnabled(false);
  const effects = createHeroEffects(scene, HOME_BLOCK);
  const audio = createHeroAudio();
  const practiceRoot = prop('practice.module', [0.48, 0.48, 0.48], [6, 0.7, -2.8], gold);
  practiceRoot.rotation.z = Math.PI / 4;
  const practiceCore = prop('practice.module-core', [0.19, 0.19, 0.19], [6, 1.02, -2.8], cyan);
  const navigationMarkers = INTERACTION_TARGETS.map(target => {
    const marker = MeshBuilder.CreateTorus(`navigation.target.${target.id}`, { diameter: target.id === 'training-module' ? 1.15 : 2.5, thickness: 0.045, tessellation: 36 }, scene);
    marker.position.set(target.x, target.id === 'computer' ? HOME_FLOOR + 0.03 : 0.05, target.id === 'computer' ? 0 : target.z);
    marker.material = cyan;
    marker.isPickable = false;
    marker.setEnabled(false);
    return { target, marker };
  });
  practiceRoot.setEnabled(false);
  practiceCore.setEnabled(false);
  presentation.syncGlow();
  let state: GameState = createInitialState();
  let exploration = createExplorationState();
  let hero: HeroState = createHero(HOME_BLOCK, exploration.player);
  let previousHero = hero;
  let accumulator = 0;
  let navigationEnabled = false;
  let navigationInput: Required<NavigationInput> = { forward: 0, right: 0, jump: false, power: false };
  // A press that begins and ends between two rendered frames must still reach the fixed-step hero.
  let pendingJump = false;
  let moving = false;
  let navigationListener: NavigationListener | undefined;
  let lastStatus = '';
  let lastTargetId: string | null = null;
  let candidateId: string | null = null;
  let navigationPodOpen = false;
  let computerSignalUntil = 0;
  let drag: { id: number; x: number; y: number } | undefined;
  let selected = 0;
  let paused = false;
  let soundEnabled = false;
  let visualShot: VisualShot | null = null;
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let podAsset: Awaited<ReturnType<typeof loadPodAsset>> | undefined;
  let assetError = '';
  canvas.dataset.assetLoaded = 'loading';
  void loadPodAsset(scene).then(asset => {
    podAsset = asset;
    asset.root.position.set(3.5, 0.01, 0);
    asset.container.meshes.forEach(mesh => shadows.addShadowCaster(mesh));
    presentation.includeInGlow(asset.container.meshes);
    pod.setEnabled(false);
    ring.setEnabled(false);
    beacon.setEnabled(false);
    fallbackPanels.forEach(panel => panel.setEnabled(false));
    asset.setOpen(navigationEnabled ? navigationPodOpen : !['living-room', 'signal', 'backyard'].includes(state.phase));
    canvas.dataset.assetLoaded = 'true';
    performanceMonitor.reset();
  }).catch(error => {
    assetError = error instanceof Error ? error.message : 'Pod asset failed to load';
    canvas.dataset.assetLoaded = 'false';
    console.error('Pod asset load failed:', assetError);
  });
  let frames = 0;
  let elapsed = 0;
  const frameTimes: number[] = [];
  let rendered = false;
  let visualReadyFrames = 0;
  let savedStoryCamera: { alpha: number; beta: number; radius: number; target: Vector3 } | undefined;
  const home = HOUSES[0];
  const heroIndoors = () => hero.x < -0.3 && hero.x > -7.5 && Math.abs(hero.z) < 3 && hero.y < 2;
  const clearVisualShot = () => {
    if (!visualShot) return;
    visualShot = null;
    if (savedStoryCamera) {
      camera.alpha = savedStoryCamera.alpha;
      camera.beta = savedStoryCamera.beta;
      camera.radius = savedStoryCamera.radius;
      camera.setTarget(savedStoryCamera.target);
      savedStoryCamera = undefined;
    }
    camera.inertialAlphaOffset = camera.inertialBetaOffset = camera.inertialRadiusOffset = 0;
    if (navigationEnabled) { camera.detachControl(); scene.activeCamera = follow.camera; }
    else scene.activeCamera = camera;
    navigationInput = { forward: 0, right: 0, jump: false, power: false };
    performanceMonitor.reset();
  };
  /** Interactions are offered only to a hero standing at ground level beside the object. */
  const currentTarget = () => navigationEnabled && hero.mode === 'ground' && savablePose(hero) ? nearestInteraction(exploration) : null;
  const currentStatus = (): NavigationStatus => {
    const anchor = candidateId ? HOME_BLOCK.anchors.find(candidate => candidate.id === candidateId) : undefined;
    return {
      mode: hero.mode, moving, candidate: anchor ? (anchor.perch ? 'perch' : 'swing') : null,
      sparks: sparkCount(exploration), totalSparks: SPARK_IDS.length, speed: Math.hypot(hero.vx, hero.vy, hero.vz), x: hero.x, z: hero.z,
    };
  };
  const emitNavigation = () => navigationListener?.(copyExplorationState(exploration), currentTarget(), currentStatus());
  const refreshNavigationProps = () => {
    const hasModule = exploration.collected.includes('training-module');
    practiceRoot.setEnabled(navigationEnabled && !hasModule);
    practiceCore.setEnabled(navigationEnabled && !hasModule);
    const nearest = currentTarget();
    for (const { target, marker } of navigationMarkers) marker.setEnabled(nearest?.id === target.id);
  };
  const subject = (events = 0) => {
    const alpha = Math.max(0, Math.min(1, accumulator / TRAVERSAL_STEP));
    // A safety catch or reset teleports between steps; never draw the hero sliding across the map.
    const jump = Math.abs(hero.x - previousHero.x) + Math.abs(hero.y - previousHero.y) + Math.abs(hero.z - previousHero.z) > 2;
    const from = jump ? hero : previousHero;
    return { hero, events, cutaway: block.cutaway,
      x: from.x + (hero.x - from.x) * alpha, y: from.y + (hero.y - from.y) * alpha, z: from.z + (hero.z - from.z) * alpha };
  };
  const placeHero = (pose: { x: number; z: number; yaw: number; y?: number }) => {
    hero = createHero(HOME_BLOCK, pose);
    previousHero = hero;
    accumulator = 0;
    pendingJump = false;
    candidateId = null;
    block.setCutaway(navigationEnabled ? heroIndoors() && hero.x < -0.5 : block.cutaway);
    follow.recenter(hero);
    follow.update(subject(), 0, reducedMotion, true);
    avatar.update({ ...subject(), anchor: null }, 0, reducedMotion, true);
  };
  const getNavigationSnapshot = (): NavigationSnapshot => {
    const value = follow.snapshot();
    return {
      enabled: navigationEnabled, state: copyExplorationState(exploration), target: currentTarget(),
      cameraYaw: value.yaw, cameraPosition: value.position, focusPosition: value.focus, cameraClipped: value.clipped, moving,
      hero: { x: hero.x, y: hero.y, z: hero.z, vx: hero.vx, vy: hero.vy, vz: hero.vz, mode: hero.mode, groundId: hero.groundId,
        tetherId: hero.tetherId, hopAvailable: hero.hopAvailable, speed: Math.hypot(hero.vx, hero.vy, hero.vz) },
      status: currentStatus(), cutaway: block.cutaway,
    };
  };
  const pointerDown = (event: PointerEvent) => {
    if (!navigationEnabled || visualShot || paused || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
    canvas.focus({ preventScroll: true });
  };
  const pointerMove = (event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId || !navigationEnabled || visualShot || paused) return;
    follow.rotate((event.clientX - drag.x) * 0.007, (event.clientY - drag.y) * 0.005);
    drag.x = event.clientX;
    drag.y = event.clientY;
  };
  const pointerUp = (event: PointerEvent) => {
    if (drag?.id !== event.pointerId) return;
    drag = undefined;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  const cancelDrag = () => {
    const id = drag?.id;
    drag = undefined;
    if (id !== undefined && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  };
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);
  canvas.addEventListener('lostpointercapture', pointerUp);
  scene.onBeforeRenderObservable.add(() => {
    const delta = Math.min(engine.getDeltaTime(), MAX_FRAME_SECONDS * 1000);
    const dt = delta / 1000;
    elapsed += dt;
    const still = reducedMotion || visualShot !== null;
    if (navigationEnabled && !visualShot) {
      accumulator += dt;
      let events = 0;
      const before = exploration;
      const wasMoving = moving;
      while (accumulator >= TRAVERSAL_STEP) {
        const yaw = follow.yaw;
        const { forward, right } = navigationInput;
        previousHero = hero;
        // Deliver a latched press as a real edge: let go for one step if still held, then press.
        let jump = navigationInput.jump;
        if (pendingJump) {
          if (hero.jumpHeld) jump = false;
          else { jump = true; pendingJump = false; }
        }
        hero = stepHero(HOME_BLOCK, hero, {
          moveX: Math.sin(yaw) * forward + Math.cos(yaw) * right,
          moveZ: Math.cos(yaw) * forward - Math.sin(yaw) * right,
          jump, power: navigationInput.power,
        });
        events |= hero.events;
        exploration = collectSparks(exploration, hero);
        accumulator -= TRAVERSAL_STEP;
      }
      const pose = savablePose(hero);
      if (pose && (pose.x !== exploration.player.x || pose.z !== exploration.player.z || pose.yaw !== exploration.player.yaw)) exploration = { ...exploration, player: pose };
      moving = Math.hypot(hero.vx, hero.vz) > 0.05 || hero.mode !== 'ground';
      if (exploration.collected.length !== before.collected.length) audio.chime(sparkCount(exploration) === SPARK_IDS.length);
      // Offer a tether target while airborne, or on the ground while sprinting on suit power.
      const aiming = hero.mode === 'air' || (hero.mode === 'ground' && navigationInput.power && Math.hypot(hero.vx, hero.vz) > 3);
      if (aiming) {
        const dir = travelDirection(hero, hero.vx, hero.vz);
        const probe = hero.mode === 'ground' ? { ...hero, y: hero.y + 1.2 } : hero;
        candidateId = selectAnchor(HOME_BLOCK, probe, dir.x, dir.z, hero.lastAnchorAge < TUNING.tetherForget ? hero.lastAnchorId : '')?.id ?? null;
      } else candidateId = null;
      // Hysteresis at the doorway keeps the roof from flickering on the threshold.
      block.setCutaway(heroIndoors() && (block.cutaway ? hero.x < -0.3 : hero.x < -0.8));
      effects.setAnchorVisible('roof-mast', !block.cutaway);
      const view = subject(events);
      const anchor = hero.tetherId ? HOME_BLOCK.anchors.find(candidate => candidate.id === hero.tetherId) ?? null : null;
      avatar.update({ ...view, anchor }, dt, reducedMotion);
      follow.update(view, dt, reducedMotion);
      effects.update({ ...view, anchor, hand: avatar.handPosition(), candidateId,
        floor: supportAt(HOME_BLOCK, view.x, view.z, view.y + 0.05, 0).height, collected: exploration.collected }, dt, reducedMotion);
      audio.update(hero, events, dt);
      if (events & HERO_EVENT.bounce) block.pulseTrampoline();
      aimShadows(view.x, view.z);
      refreshNavigationProps();
      const status = currentStatus();
      const signature = `${status.mode}|${status.candidate}|${status.sparks}`;
      const targetId = currentTarget()?.id ?? null;
      if (exploration !== before || wasMoving !== moving || signature !== lastStatus || targetId !== lastTargetId) {
        lastStatus = signature; lastTargetId = targetId;
        emitNavigation();
      }
      practiceRoot.rotation.y = reducedMotion ? 0 : elapsed * 0.7;
      practiceCore.position.y = reducedMotion ? 1.02 : 1.02 + Math.sin(elapsed * 2) * 0.06;
    } else {
      // Story and review cameras look into the living room through the section cut.
      const position = camera.position;
      const inside = position.x > home.minX - 1.5 && position.x < home.maxX + 1.5 && position.z > home.minZ - 1.5 && position.z < home.maxZ + 1.5 && position.y < home.ridge + 1;
      block.setCutaway(camera.target.x < -0.5 || inside);
      aimShadows(camera.target.x, camera.target.z);
    }
    block.update(dt, elapsed, still);
    ring.rotation.y = still ? 0 : elapsed * 0.35;
    glow.intensity = 8 + (still ? 0 : Math.sin(elapsed * 2) * 0.35);
    screen.scaling.x = (navigationEnabled ? elapsed < computerSignalUntil : state.phase === 'signal') && !still ? 1 + Math.sin(elapsed * 7) * 0.035 : 1;
    markers.forEach((marker, index) => {
      marker.isVisible = !navigationEnabled && state.phase === 'scan';
      marker.scaling.setAll(index === selected ? 1.7 + (still ? 0 : Math.sin(elapsed * 3) * 0.1) : 1);
    });
    projection.isVisible = !navigationEnabled && ['scan', 'archive', 'map'].includes(state.phase);
    projection.alpha = still ? 0.8 : 0.7 + Math.sin(elapsed * 3) * 0.12;
    frames++;
    frameTimes.push(engine.getDeltaTime());
    if (frameTimes.length > 120) frameTimes.shift();
  });
  scene.onAfterRenderObservable.add(() => {
    const ready = !!podAsset && presentation.snapshot().environment !== 'loading' && scene.isReady();
    visualReadyFrames = ready ? visualReadyFrames + 1 : 0;
    canvas.dataset.visualReady = String(visualReadyFrames >= 3);
  });
  scene.onAfterRenderObservable.addOnce(() => { rendered = true; canvas.dataset.rendered = 'true'; });
  engine.runRenderLoop(() => { if (!paused) scene.render(); });
  const resize = () => { quality.resize(); engine.resize(); performanceMonitor.reset(); };
  window.addEventListener('resize', resize);
  return {
    setStoryState(value: GameState, target = 0) {
      const changedPhase = value.phase !== state.phase;
      if (changedPhase) clearVisualShot();
      state = value;
      selected = target;
      const atHome = ['living-room', 'signal'].includes(state.phase);
      cameraAnchor = atHome ? new Vector3(-3.3, 1.1, 0) : new Vector3(3.5, 1.1, 0);
      if (changedPhase) cameraPan.setAll(0);
      if (!visualShot) {
        camera.setTarget(cameraAnchor.add(cameraPan));
        camera.radius = atHome ? 11 : 7;
        if (changedPhase) { camera.alpha = -Math.PI / 2.6; camera.beta = 1.05; }
      }
      if (!navigationEnabled) podAsset?.setOpen(!['living-room', 'signal', 'backyard'].includes(state.phase));
    },
    setNavigationEnabled(value: boolean) {
      clearVisualShot();
      navigationEnabled = value;
      navigationInput = { forward: 0, right: 0, jump: false, power: false };
      moving = false;
      cancelDrag();
      avatar.setEnabled(value);
      effects.setEnabled(value);
      audio.setEnabled(value && soundEnabled);
      if (value) {
        camera.detachControl();
        scene.activeCamera = follow.camera;
        placeHero(exploration.player);
      } else {
        scene.activeCamera = camera;
        camera.attachControl(canvas, true);
      }
      podAsset?.setOpen(value ? navigationPodOpen : !['living-room', 'signal', 'backyard'].includes(state.phase));
      refreshNavigationProps();
      emitNavigation();
    },
    setExplorationState(value: ExplorationState) {
      exploration = copyExplorationState(value);
      navigationInput = { forward: 0, right: 0, jump: false, power: false };
      moving = false;
      placeHero(exploration.player);
      refreshNavigationProps();
      emitNavigation();
    },
    setNavigationInput(value: NavigationInput) {
      navigationInput = navigationEnabled && !visualShot && !paused
        ? { forward: value.forward, right: value.right, jump: value.jump === true, power: value.power === true }
        : { forward: 0, right: 0, jump: false, power: false };
    },
    /** Latch one jump press so a quick tap or a slow frame can never swallow it. */
    pressNavigationJump() { if (navigationEnabled && !visualShot && !paused) pendingJump = true; },
    rotateNavigationCamera(deltaYaw: number, deltaPitch = 0) { if (navigationEnabled && !visualShot && !paused) follow.rotate(deltaYaw, deltaPitch); },
    recenterNavigationCamera() { if (navigationEnabled) follow.recenter(hero); },
    /** The interaction a context key would perform now, or null when the key should jump instead. */
    navigationTarget: currentTarget,
    interactNavigation() {
      const target = currentTarget();
      const result = interact(exploration, navigationEnabled && !visualShot && !paused ? target?.id ?? '' : '');
      exploration = result.state;
      if (result.status === 'success' && target?.id === 'pod') { navigationPodOpen = true; podAsset?.setOpen(true); }
      if (result.status === 'success' && target?.id === 'computer') computerSignalUntil = elapsed + 4;
      refreshNavigationProps();
      emitNavigation();
      return { ...result, state: copyExplorationState(result.state) };
    },
    onNavigationUpdate(listener: NavigationListener) {
      navigationListener = listener;
      emitNavigation();
      return () => { if (navigationListener === listener) navigationListener = undefined; };
    },
    getNavigationSnapshot,
    /** Development review only: stand the hero somewhere to inspect the art. Never used by play or saves. */
    reviewPose(pose: { x: number; z: number; yaw: number; y?: number }, cameraYaw?: number, cameraPitch = 0) {
      if (!navigationEnabled) return;
      placeHero(pose);
      if (cameraYaw !== undefined) { follow.rotate(cameraYaw - follow.yaw, cameraPitch); follow.update(subject(), 0, reducedMotion, true); }
    },
    setSoundEnabled(value: boolean) { soundEnabled = value; audio.setEnabled(value && navigationEnabled); },
    setVisualQuality(value: VisualQuality) {
      if (!isVisualQuality(value)) return;
      const profile = quality.setQuality(value);
      presentation.setQuality(profile);
      shadows.mapSize = profile.shadowMapSize;
      shadows.filteringQuality = value === 'low' || value === 'balanced' ? ShadowGenerator.QUALITY_LOW : ShadowGenerator.QUALITY_MEDIUM;
      visualReadyFrames = 0;
      canvas.dataset.visualReady = 'false';
      performanceMonitor.reset();
    },
    setVisualShot(value: VisualShot | null) {
      if (value === null) { clearVisualShot(); return; }
      if (navigationEnabled) return;
      if (!Object.hasOwn(VISUAL_SHOTS, value)) return;
      if (!visualShot) savedStoryCamera = { alpha: camera.alpha, beta: camera.beta, radius: camera.radius, target: camera.target.clone() };
      visualShot = value;
      navigationInput = { forward: 0, right: 0, jump: false, power: false };
      moving = false;
      cancelDrag();
      const shot = VISUAL_SHOTS[value];
      scene.activeCamera = camera;
      camera.setTarget(shot.target);
      camera.alpha = shot.alpha;
      camera.beta = shot.beta;
      camera.radius = shot.radius;
      camera.inertialAlphaOffset = camera.inertialBetaOffset = camera.inertialRadiusOffset = 0;
      camera.attachControl(canvas, true);
      visualReadyFrames = 0;
      canvas.dataset.visualReady = 'false';
      performanceMonitor.reset();
    },
    resetPerformanceSample() { performanceMonitor.reset(); },
    setReducedMotion(value: boolean) { reducedMotion = value; },
    setPaused(value: boolean) {
      paused = value;
      performanceMonitor.setPaused(value);
      audio.setPaused(value);
      if (value) {
        navigationInput = { forward: 0, right: 0, jump: false, power: false };
        pendingJump = false;
        cancelDrag();
        // Returning must not continue a run the player is no longer holding.
        hero = settleHero(hero); previousHero = hero; accumulator = 0;
        moving = hero.mode !== 'ground';
      }
    },
    point(key: string) {
      if (paused) return;
      if (key === 'ArrowLeft') camera.alpha -= 0.12;
      if (key === 'ArrowRight') camera.alpha += 0.12;
      if (key === 'ArrowUp') camera.beta = Math.max(0.35, camera.beta - 0.08);
      if (key === 'ArrowDown') camera.beta = Math.min(1.45, camera.beta + 0.08);
    },
    controlCamera(input: CameraInput, deltaSeconds: number) {
      if (paused || navigationEnabled || visualShot || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
      const dt = Math.min(deltaSeconds, 0.05);
      camera.alpha += input.lookX * 1.8 * dt;
      camera.beta = Math.max(0.35, Math.min(1.45, camera.beta + input.lookY * 1.25 * dt));
      camera.radius = Math.max(5, Math.min(20, camera.radius - input.zoom * 5 * dt));
      if (input.panX || input.panY) {
        const rightAngle = camera.alpha + Math.PI / 2, speed = 3 * dt;
        cameraPan.x += (Math.cos(rightAngle) * input.panX + Math.cos(camera.alpha) * input.panY) * speed;
        cameraPan.z += (Math.sin(rightAngle) * input.panX + Math.sin(camera.alpha) * input.panY) * speed;
        const distance = cameraPan.length();
        if (distance > 2.5) cameraPan.scaleInPlace(2.5 / distance);
        camera.target.copyFrom(cameraAnchor.add(cameraPan));
      }
    },
    snapshot: () => ({
      rendered, scene: 'first-contact', phase: state.phase, frames, paused, reducedMotion,
      pod: podAsset?.metrics ?? { loaded: false, error: assetError },
      meanFrameMs: frameTimes.length ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length : 0,
      meshes: scene.meshes.length, activeMeshes: scene.getActiveMeshes().length,
      triangles: scene.meshes.reduce((total, mesh) => total + mesh.getTotalIndices(), 0) / 3,
      renderer: `WebGL ${engine.webGLVersion}`,
      visual: { ...presentation.snapshot(), ...quality.snapshot(), shot: visualShot, ready: visualReadyFrames >= 3,
        camera: { alpha: camera.alpha, beta: camera.beta, radius: camera.radius, target: camera.target.asArray() } },
      performance: performanceMonitor.snapshot(quality.profile.targetFrameMs),
      navigation: getNavigationSnapshot(),
      world: { ...block.counts(), effects: effects.snapshot(), audio: audio.snapshot(), avatar: avatar.snapshot() },
      camera: { alpha: camera.alpha, beta: camera.beta, radius: camera.radius,
        target: { x: camera.target.x, y: camera.target.y, z: camera.target.z } },
    }),
    dispose() {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', pointerUp);
      canvas.removeEventListener('lostpointercapture', pointerUp);
      navigationListener = undefined;
      audio.dispose(); effects.dispose(); block.dispose();
      performanceMonitor.dispose(); presentation.dispose();
      podAsset?.dispose(); scene.dispose(); engine.dispose();
    },
  };
}
