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
import { Mesh } from '@babylonjs/core/Meshes/mesh';
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
import { createPlayerAvatar } from './player-avatar';
import { createThirdPersonCamera } from './third-person-camera';
import { copyExplorationState, createExplorationState, moveExploration, nearestInteraction, interact, INTERACTION_TARGETS } from './navigation';
import type { ExplorationState, InteractionTarget } from './navigation';
import type { CameraInput } from './gamepad';

export interface NavigationInput { forward: number; right: number }
export interface NavigationSnapshot {
  enabled: boolean;
  state: ExplorationState;
  target: InteractionTarget | null;
  cameraYaw: number;
  cameraPosition: { x: number; y: number; z: number };
  focusPosition: { x: number; y: number; z: number };
  cameraClipped: boolean;
  moving: boolean;
}

export function createFirstContact(canvas: HTMLCanvasElement) {
  const engine = new Engine(canvas, true, { stencil: true }, true);
  const quality = createRenderQualityController(engine, canvas, 'balanced');
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.025, 0.047, 0.085, 1);
  const camera = new ArcRotateCamera('first-contact.camera', -Math.PI / 2.6, 1.05, 12, new Vector3(0, 1, 0), scene);
  camera.lowerRadiusLimit = 5;
  camera.upperRadiusLimit = 20;
  camera.lowerBetaLimit = 0.35;
  camera.upperBetaLimit = 1.45;
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
  sky.intensity = 0.24;
  sky.diffuse = new Color3(0.52, 0.67, 1);
  sky.groundColor = new Color3(0.09, 0.12, 0.13);
  const glow = new PointLight('arrival.light', new Vector3(3.5, 1.4, -0.6), scene);
  glow.diffuse = new Color3(0.18, 0.7, 1);
  glow.intensity = 8;
  glow.falloffType = PointLight.FALLOFF_PHYSICAL;
  glow.range = 8;
  const warm = new PointLight('home.light', new Vector3(-3.6, 2.8, -1.1), scene);
  warm.diffuse = new Color3(1, 0.67, 0.36);
  warm.intensity = 22;
  warm.falloffType = PointLight.FALLOFF_PHYSICAL;
  warm.range = 9;
  const moon = new DirectionalLight('moon.key', new Vector3(-0.4, -1, 0.3), scene);
  moon.position.set(0, 10, -6);
  moon.intensity = 1.1;
  moon.diffuse = new Color3(0.7, 0.82, 1);
  const shadows = new ShadowGenerator(quality.profile.shadowMapSize, moon);
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = ShadowGenerator.QUALITY_LOW;
  shadows.darkness = 0.2;
  shadows.bias = 0.0005;
  shadows.normalBias = 0.02;
  moon.shadowMinZ = 0.5;
  moon.shadowMaxZ = 35;
  const material = presentation.material;
  const groundMat = material('yard.grass', '#b8caaa', undefined, 1);
  const floorMat = material('home.floor', '#c1a181', undefined, 0.72);
  const wallMat = material('home.wall', '#acb5af', undefined, 0.96);
  presentation.surface(groundMat, 'grass', 12, 9);
  presentation.surface(floorMat, 'wood', 3, 2);
  presentation.surface(wallMat, 'plaster', 1);
  const armor = material('pod.armor', '#788c9c', undefined, 0.38, 0.72);
  armor.emissiveColor = new Color3(0.025, 0.045, 0.065);
  const dark = material('pod.joints', '#19232d', undefined, 0.52, 0.4);
  const cyan = material('signal.energy', '#61d9ef', '#63d9ff', 0.27, 0.1);
  cyan.emissiveColor.scaleInPlace(2.1);
  const gold = material('home.warm', '#cbaa80', undefined, 0.62);
  const patioMat = material('yard.patio', '#a7aeac', undefined, 0.94);
  presentation.surface(patioMat, 'concrete', 2);
  const trim = material('home.trim', '#d1c6af');
  const sofaMat = material('home.sofa-fabric', '#4e6771');
  const glass = material('home.window', '#305f72', '#133848', 0.18, 0.25);
  const staticBoxes: Mesh[] = [];
  const box = (name: string, size: [number, number, number], pos: [number, number, number], mat: PBRMaterial) => {
    const mesh = MeshBuilder.CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, scene);
    mesh.position.set(...pos);
    mesh.material = mat;
    mesh.receiveShadows = true;
    staticBoxes.push(mesh);
    return mesh;
  };
  box('yard.ground', [28, 0.2, 22], [0, -0.2, 0], groundMat);
  box('home.floor', [7, 0.16, 6], [-4, 0, 0], floorMat);
  // Dollhouse cutaway: the boundary remains solid, while low walls keep the person visible.
  box('home.back-wall.cutaway', [7, 0.65, 0.2], [-4, 0.325, 3], wallMat);
  box('home.front-wall.cutaway', [7, 0.65, 0.2], [-4, 0.325, -3], wallMat);
  box('home.side-wall.cutaway', [0.2, 0.65, 6], [-7.5, 0.325, 0], wallMat);
  for (const z of [-2, 2]) {
    box(`home.yard-wall.${z}`, [0.2, 0.65, 2], [-0.5, 0.325, z], wallMat);
    box(`door.jamb.${z}`, [0.22, 2.6, 0.15], [-0.5, 1.3, z / 2], trim);
  }
  box('door.header', [0.25, 0.18, 2.15], [-0.5, 2.65, 0], trim);
  box('door.threshold', [0.55, 0.04, 1.85], [-0.5, 0.09, 0], gold);
  box('yard.patio', [3.2, 0.08, 3], [1.1, -0.07, 0], patioMat);
  for (let i = 0; i < 5; i++) box(`yard.path.${i}`, [0.6, 0.045, 0.9], [1.4 + i * 1.25, -0.08, -2.7], patioMat);
  for (let i = 0; i < 10; i++) box(`floor.plank.${i}`, [0.025, 0.003, 5.8], [-7.2 + i * 0.66, 0.082, 0], gold);
  box('computer.desk', [2.6, 0.18, 1.1], [-4, 1.1, 1], gold);
  for (const x of [-5, -3]) box(`desk.leg.${x}`, [0.12, 1.1, 0.8], [x, 0.55, 1], dark);
  box('computer.display-frame', [1.6, 1, 0.14], [-4, 1.8, 1.3], dark);
  const screen = box('computer.signal-screen', [1.4, 0.8, 0.03], [-4, 1.8, 1.21], cyan);
  box('computer.stand', [0.16, 0.45, 0.18], [-4, 1.3, 1.3], dark);
  box('computer.keyboard', [1, 0.06, 0.35], [-4, 1.23, 0.7], dark);
  box('home.sofa', [2.8, 0.6, 1.1], [-4.6, 0.4, -1.8], sofaMat);
  box('home.sofa-back', [2.8, 0.9, 0.28], [-4.6, 0.8, -2.22], sofaMat);
  for (const x of [-5.85, -3.35]) box(`home.sofa-arm.${x}`, [0.22, 0.4, 1.05], [x, 0.8, -1.8], sofaMat);
  for (const x of [-5.2, -4.1]) box(`home.sofa-cushion.${x}`, [0.72, 0.12, 0.7], [x, 0.73, -1.62], trim);
  for (const z of [-5.2, 5.2]) {
    for (let i = 0; i < 15; i++) box(`fence.${z}.${i}`, [0.59, 1.4, 0.12], [0 + i * 0.69, 0.6, z], wallMat);
    for (const y of [0.3, 1]) box(`fence.rail.${z}.${y}`, [10.7, 0.12, 0.15], [4.7, y, z], trim);
  }
  for (let i = 0; i < 15; i++) box(`fence.east.${i}`, [0.12, 1.4, 0.59], [10, 0.6, -4.8 + i * 0.69], wallMat);
  for (const z of [-4.1, 4.1]) box(`fence.west.${z}`, [0.12, 1.4, 2.15], [-0.5, 0.6, z], wallMat);
  // Generic background garage. Real home footage has not been supplied or used.
  box('garage.background', [4, 3.4, 2.8], [7.7, 1.6, 7.1], wallMat);
  box('garage.door', [3, 2.5, 0.06], [7.7, 1.16, 5.66], trim);
  for (let i = 0; i < 7; i++) box(`garage.door-slat.${i}`, [3, 0.025, 0.075], [7.7, 0.15 + i * 0.36, 5.62], wallMat);
  box('garage.window', [1.5, 0.32, 0.08], [7.7, 2, 5.58], glass);
  box('garage.roof', [4.5, 0.2, 3.3], [7.7, 3.36, 7.1], dark);
  const lamp = material('home.lamp-shade', '#f7d5a2', '#ffcf85', 0.65);
  box('home.practical-lamp', [0.38, 0.3, 0.38], [-3.6, 2.7, -1.1], lamp);
  box('home.lamp-stem', [0.05, 2.4, 0.05], [-3.6, 1.2, -1.1], dark);
  const pod = MeshBuilder.CreateCylinder('pod.shell', { height: 2.2, diameterTop: 1.15, diameterBottom: 1.75, tessellation: 8 }, scene);
  pod.position.set(3.5, 1.25, 0);
  pod.scaling.set(1, 1.25, 1);
  pod.material = armor;
  pod.rotation.z = 0.2;
  const ring = MeshBuilder.CreateTorus('pod.energy-ring', { diameter: 2, thickness: 0.065, tessellation: 48 }, scene);
  ring.position.set(3.5, 1.25, 0);
  ring.rotation.z = 0.2;
  ring.material = cyan;
  const beacon = MeshBuilder.CreateCylinder('pod.beacon', { height: 2.4, diameter: 0.045, tessellation: 10 }, scene);
  beacon.position.set(3.5, 3.2, 0);
  beacon.material = cyan;
  const fallbackPanels: Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const panel = box(`pod.panel.${i}`, [0.55, 0.15, 1.4], [3.5, 0.18, 0], dark);
    fallbackPanels.push(panel);
    panel.rotation.y = i * Math.PI * 2 / 3;
    panel.position.x += Math.sin(panel.rotation.y) * 1.2;
    panel.position.z += Math.cos(panel.rotation.y) * 1.2;
  }
  const projection = MeshBuilder.CreateLines('core.stored-dragon-design', { points: [
    new Vector3(1.4, 2.3, 0), new Vector3(2, 2.7, 0), new Vector3(2.4, 2.5, 0),
    new Vector3(2.8, 3, 0), new Vector3(3, 3.4, 0), new Vector3(3.3, 3.2, 0),
    new Vector3(2.8, 3, 0), new Vector3(2.4, 2.5, 0), new Vector3(1.4, 3.1, -0.8),
    new Vector3(1.8, 2.5, -0.4), new Vector3(2.4, 2.5, 0), new Vector3(3.2, 3.1, 0.8),
    new Vector3(2.9, 2.5, 0.4),
  ] }, scene);
  projection.color = new Color3(0.3, 0.9, 1);
  projection.position.x = 1;
  const markers = [0, 1, 2].map(index => {
    const mesh = MeshBuilder.CreateBox(`scan.target.${index}`, { size: index === 1 ? 0.2 : 0.12 }, scene);
    mesh.position.set(2.8 + index * 0.7, 0.8, -0.9);
    mesh.rotation.z = index === 1 ? Math.PI / 4 : 0;
    mesh.material = index === 1 ? cyan : gold;
    return mesh;
  });
  // Furniture and fencing are static. Batch by material; retain individually controlled props.
  for (const mat of [groundMat, floorMat, wallMat, armor, dark, cyan, gold, patioMat, trim, sofaMat, glass, lamp]) {
    const batch = staticBoxes.filter(mesh => mesh.material === mat && mesh !== screen && !fallbackPanels.includes(mesh));
    if (batch.length < 2) continue;
    const merged = Mesh.MergeMeshes(batch, true, true);
    if (merged) {
      merged.name = `environment.${mat.name}`;
      merged.receiveShadows = true;
      merged.isPickable = false;
      if (mat !== groundMat && mat !== floorMat && mat !== patioMat) shadows.addShadowCaster(merged);
    }
  }
  addArrivalGroundDetail(scene, material);
  const avatar = createPlayerAvatar(scene);
  avatar.meshes.forEach(mesh => shadows.addShadowCaster(mesh));
  avatar.setEnabled(false);
  const practiceRoot = box('practice.module', [0.48, 0.48, 0.48], [6, 0.6, -2.8], gold);
  practiceRoot.rotation.z = Math.PI / 4;
  const practiceCore = box('practice.module-core', [0.19, 0.19, 0.19], [6, 0.92, -2.8], cyan);
  const practicePlinth = box('practice.module-plinth', [0.85, 0.12, 0.85], [6, -0.02, -2.8], dark);
  const navigationMarkers = INTERACTION_TARGETS.map(target => {
    const marker = MeshBuilder.CreateTorus(`navigation.target.${target.id}`, { diameter: target.id === 'training-module' ? 1.15 : 2.5, thickness: 0.045, tessellation: 36 }, scene);
    marker.position.set(target.x, target.id === 'computer' ? 0.105 : -0.045, target.id === 'computer' ? 0 : target.z);
    marker.material = cyan;
    marker.isPickable = false;
    marker.setEnabled(false);
    return { target, marker };
  });
  practiceRoot.setEnabled(false);
  practiceCore.setEnabled(false);
  practicePlinth.setEnabled(false);
  let state: GameState = createInitialState();
  let exploration = createExplorationState();
  let navigationEnabled = false;
  let navigationInput: NavigationInput = { forward: 0, right: 0 };
  let moving = false;
  let navigationListener: ((state: ExplorationState, target: InteractionTarget | null) => void) | undefined;
  let navigationPodOpen = false;
  let computerSignalUntil = 0;
  let drag: { id: number; x: number; y: number } | undefined;
  let selected = 0;
  let paused = false;
  let visualShot: VisualShot | null = null;
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let podAsset: Awaited<ReturnType<typeof loadPodAsset>> | undefined;
  let assetError = '';
  canvas.dataset.assetLoaded = 'loading';
  void loadPodAsset(scene).then(asset => {
    podAsset = asset;
    asset.root.position.set(3.5, -0.09, 0);
    asset.container.meshes.forEach(mesh => shadows.addShadowCaster(mesh));
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
    navigationInput = { forward: 0, right: 0 };
    performanceMonitor.reset();
  };
  const emitNavigation = () => navigationListener?.(copyExplorationState(exploration), nearestInteraction(exploration));
  const refreshNavigationProps = () => {
    const hasModule = exploration.collected.includes('training-module');
    practiceRoot.setEnabled(navigationEnabled && !hasModule);
    practiceCore.setEnabled(navigationEnabled && !hasModule);
    practicePlinth.setEnabled(navigationEnabled);
    const nearest = navigationEnabled ? nearestInteraction(exploration) : null;
    for (const { target, marker } of navigationMarkers) marker.setEnabled(nearest?.id === target.id);
  };
  const getNavigationSnapshot = (): NavigationSnapshot => {
    const value = follow.snapshot();
    return {
      enabled: navigationEnabled, state: copyExplorationState(exploration), target: nearestInteraction(exploration),
      cameraYaw: value.yaw, cameraPosition: value.position, focusPosition: value.focus, cameraClipped: value.clipped, moving,
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
    const delta = Math.min(engine.getDeltaTime(), 50);
    const dt = delta / 1000;
    elapsed += delta / 1000;
    if (navigationEnabled && !visualShot) {
      const previous = exploration;
      exploration = moveExploration(exploration, navigationInput, follow.yaw, dt);
      const speed = Math.hypot(exploration.player.x - previous.player.x, exploration.player.z - previous.player.z) / Math.max(dt, 0.001);
      const wasMoving = moving;
      moving = speed > 0.05;
      avatar.update(exploration.player, speed, dt, reducedMotion);
      follow.update(exploration.player, dt);
      refreshNavigationProps();
      if (exploration !== previous || wasMoving !== moving) emitNavigation();
      practiceRoot.rotation.y = reducedMotion ? 0 : elapsed * 0.7;
      practiceCore.position.y = reducedMotion ? 0.92 : 0.92 + Math.sin(elapsed * 2) * 0.06;
    }
    const still = reducedMotion || visualShot !== null;
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
      const home = ['living-room', 'signal'].includes(state.phase);
      cameraAnchor = home ? new Vector3(-3.3, 1.1, 0) : new Vector3(3.5, 1.1, 0);
      if (changedPhase) cameraPan.setAll(0);
      if (!visualShot) {
        camera.setTarget(cameraAnchor.add(cameraPan));
        camera.radius = home ? 11 : 7;
        if (changedPhase) { camera.alpha = -Math.PI / 2.6; camera.beta = 1.05; }
      }
      if (!navigationEnabled) podAsset?.setOpen(!['living-room', 'signal', 'backyard'].includes(state.phase));
    },
    setNavigationEnabled(value: boolean) {
      clearVisualShot();
      navigationEnabled = value;
      navigationInput = { forward: 0, right: 0 };
      moving = false;
      cancelDrag();
      avatar.setEnabled(value);
      if (value) {
        camera.detachControl();
        scene.activeCamera = follow.camera;
        follow.recenter(exploration.player);
        follow.update(exploration.player, 0, true);
        avatar.update(exploration.player, 0, 0, reducedMotion, true);
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
      navigationInput = { forward: 0, right: 0 };
      moving = false;
      follow.recenter(exploration.player);
      follow.update(exploration.player, 0, true);
      avatar.update(exploration.player, 0, 0, reducedMotion, true);
      refreshNavigationProps();
      emitNavigation();
    },
    setNavigationInput(value: NavigationInput) { navigationInput = navigationEnabled && !visualShot && !paused ? { ...value } : { forward: 0, right: 0 }; },
    rotateNavigationCamera(deltaYaw: number, deltaPitch = 0) { if (navigationEnabled && !visualShot && !paused) follow.rotate(deltaYaw, deltaPitch); },
    recenterNavigationCamera() { if (navigationEnabled) follow.recenter(exploration.player); },
    interactNavigation() {
      const target = nearestInteraction(exploration);
      const result = interact(exploration, navigationEnabled && !visualShot && !paused ? target?.id ?? '' : '');
      exploration = result.state;
      if (result.status === 'success' && target?.id === 'pod') { navigationPodOpen = true; podAsset?.setOpen(true); }
      if (result.status === 'success' && target?.id === 'computer') computerSignalUntil = elapsed + 4;
      refreshNavigationProps();
      emitNavigation();
      return { ...result, state: copyExplorationState(result.state) };
    },
    onNavigationUpdate(listener: (state: ExplorationState, target: InteractionTarget | null) => void) {
      navigationListener = listener;
      emitNavigation();
      return () => { if (navigationListener === listener) navigationListener = undefined; };
    },
    getNavigationSnapshot,
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
      navigationInput = { forward: 0, right: 0 };
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
      if (value) { navigationInput = { forward: 0, right: 0 }; cancelDrag(); moving = false; }
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
      performanceMonitor.dispose(); presentation.dispose();
      podAsset?.dispose(); scene.dispose(); engine.dispose();
    },
  };
}
