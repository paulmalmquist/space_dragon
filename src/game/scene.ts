import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3, Color3, Color4 } from '@babylonjs/core/Maths/math';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { createInitialState } from './state';
import type { GameState } from './state';
import { loadPodAsset } from './pod-asset';

export function createFirstContact(canvas: HTMLCanvasElement) {
  const engine = new Engine(canvas, true, { stencil: true }, true);
  engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.5));
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
  const sky = new HemisphericLight('moonlight', new Vector3(0.2, 1, 0.4), scene);
  sky.intensity = 0.65;
  sky.diffuse = new Color3(0.55, 0.7, 1);
  sky.groundColor = new Color3(0.12, 0.2, 0.3);
  const glow = new PointLight('arrival.light', new Vector3(2.5, 2.5, -3), scene);
  glow.diffuse = new Color3(0.25, 0.8, 1);
  glow.intensity = 2;
  glow.range = 12;
  const warm = new PointLight('home.light', new Vector3(-3, 3, 0), scene);
  warm.diffuse = new Color3(1, 0.64, 0.4);
  warm.intensity = 1.4;
  warm.range = 10;
  const material = (name: string, color: string, emissive?: string) => {
    const mat = new StandardMaterial(name, scene);
    mat.diffuseColor = Color3.FromHexString(color);
    mat.specularColor = new Color3(0.22, 0.25, 0.3);
    if (emissive) mat.emissiveColor = Color3.FromHexString(emissive);
    return mat;
  };
  const groundMat = material('yard.grass', '#122b32');
  const floorMat = material('home.floor', '#50454a');
  const wallMat = material('home.wall', '#373d50');
  const armor = material('pod.armor', '#788c9c');
  armor.emissiveColor = new Color3(0.025, 0.045, 0.065);
  const dark = material('pod.joints', '#101b2d');
  const cyan = material('signal.energy', '#61d9ef', '#2589a0');
  const gold = material('home.warm', '#d8aa79', '#493125');
  const box = (name: string, size: [number, number, number], pos: [number, number, number], mat: StandardMaterial) => {
    const mesh = MeshBuilder.CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, scene);
    mesh.position.set(...pos);
    mesh.material = mat;
    return mesh;
  };
  box('yard.ground', [28, 0.2, 22], [0, -0.2, 0], groundMat);
  box('home.floor', [7, 0.16, 6], [-4, 0, 0], floorMat);
  box('home.back-wall', [7, 3.5, 0.2], [-4, 1.75, 3], wallMat);
  box('home.side-wall', [0.2, 3.5, 6], [-7.5, 1.75, 0], wallMat);
  box('computer.desk', [2.6, 0.18, 1.1], [-4, 1.1, 1], gold);
  for (const x of [-5, -3]) box(`desk.leg.${x}`, [0.12, 1.1, 0.8], [x, 0.55, 1], dark);
  box('computer.display-frame', [1.6, 1, 0.14], [-4, 1.8, 1.3], dark);
  const screen = box('computer.signal-screen', [1.4, 0.8, 0.03], [-4, 1.8, 1.21], cyan);
  box('computer.stand', [0.16, 0.45, 0.18], [-4, 1.3, 1.3], dark);
  box('computer.keyboard', [1, 0.06, 0.35], [-4, 1.23, 0.7], dark);
  box('home.sofa', [2.8, 0.6, 1.1], [-4.6, 0.4, -1.8], wallMat);
  box('home.sofa-back', [2.8, 0.9, 0.28], [-4.6, 0.8, -2.3], wallMat);
  for (let i = 0; i < 13; i++) box(`fence.${i}`, [0.9, 1.4, 0.12], [i - 3, 0.6, 5.6], wallMat);
  const pod = MeshBuilder.CreateCylinder('pod.shell', { height: 2.2, diameterTop: 1.15, diameterBottom: 1.75, tessellation: 8 }, scene);
  pod.position.set(2.5, 1.25, 0);
  pod.scaling.set(1, 1.25, 1);
  pod.material = armor;
  pod.rotation.z = 0.2;
  const ring = MeshBuilder.CreateTorus('pod.energy-ring', { diameter: 2, thickness: 0.065, tessellation: 48 }, scene);
  ring.position.set(2.5, 1.25, 0);
  ring.rotation.z = 0.2;
  ring.material = cyan;
  const beacon = MeshBuilder.CreateCylinder('pod.beacon', { height: 2.4, diameter: 0.045, tessellation: 10 }, scene);
  beacon.position.set(2.5, 3.2, 0);
  beacon.material = cyan;
  for (let i = 0; i < 3; i++) {
    const panel = box(`pod.panel.${i}`, [0.55, 0.15, 1.4], [2.5, 0.18, 0], dark);
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
  const markers = [0, 1, 2].map(index => {
    const mesh = MeshBuilder.CreateBox(`scan.target.${index}`, { size: index === 1 ? 0.2 : 0.12 }, scene);
    mesh.position.set(1.8 + index * 0.7, 0.8, -0.9);
    mesh.rotation.z = index === 1 ? Math.PI / 4 : 0;
    mesh.material = index === 1 ? cyan : gold;
    return mesh;
  });
  let state: GameState = createInitialState();
  let selected = 0;
  let paused = false;
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let podAsset: Awaited<ReturnType<typeof loadPodAsset>> | undefined;
  let assetError = '';
  canvas.dataset.assetLoaded = 'loading';
  void loadPodAsset(scene).then(asset => {
    podAsset = asset;
    asset.root.position.set(2.5, 0, 0);
    pod.setEnabled(false);
    ring.setEnabled(false);
    beacon.setEnabled(false);
    asset.setOpen(!['living-room', 'signal', 'backyard'].includes(state.phase));
    canvas.dataset.assetLoaded = 'true';
  }).catch(error => {
    assetError = error instanceof Error ? error.message : 'Pod asset failed to load';
    canvas.dataset.assetLoaded = 'false';
    console.error('Pod asset load failed:', assetError);
  });
  let frames = 0;
  let elapsed = 0;
  const frameTimes: number[] = [];
  let rendered = false;
  scene.onBeforeRenderObservable.add(() => {
    const delta = Math.min(engine.getDeltaTime(), 50);
    elapsed += delta / 1000;
    ring.rotation.y = reducedMotion ? 0 : elapsed * 0.35;
    glow.intensity = 2.1 + (reducedMotion ? 0 : Math.sin(elapsed * 2) * 0.2);
    screen.scaling.x = state.phase === 'signal' && !reducedMotion ? 1 + Math.sin(elapsed * 7) * 0.015 : 1;
    markers.forEach((marker, index) => {
      marker.isVisible = state.phase === 'scan';
      marker.scaling.setAll(index === selected ? 1.7 + (reducedMotion ? 0 : Math.sin(elapsed * 3) * 0.1) : 1);
    });
    projection.isVisible = ['scan', 'archive', 'map'].includes(state.phase);
    projection.alpha = reducedMotion ? 0.8 : 0.7 + Math.sin(elapsed * 3) * 0.12;
    frames++;
    frameTimes.push(engine.getDeltaTime());
    if (frameTimes.length > 120) frameTimes.shift();
  });
  scene.onAfterRenderObservable.addOnce(() => { rendered = true; canvas.dataset.rendered = 'true'; });
  engine.runRenderLoop(() => { if (!paused) scene.render(); });
  const resize = () => engine.resize();
  window.addEventListener('resize', resize);
  return {
    setStoryState(value: GameState, target = 0) {
      const changedPhase = value.phase !== state.phase;
      state = value;
      selected = target;
      const home = ['living-room', 'signal'].includes(state.phase);
      camera.setTarget(home ? new Vector3(-3.3, 1.1, 0) : new Vector3(2.5, 1.1, 0));
      camera.radius = home ? 11 : 7;
      if (changedPhase) { camera.alpha = -Math.PI / 2.6; camera.beta = 1.05; }
      podAsset?.setOpen(!['living-room', 'signal', 'backyard'].includes(state.phase));
    },
    setReducedMotion(value: boolean) { reducedMotion = value; },
    setPaused(value: boolean) { paused = value; },
    point(key: string) {
      if (paused) return;
      if (key === 'ArrowLeft') camera.alpha -= 0.12;
      if (key === 'ArrowRight') camera.alpha += 0.12;
      if (key === 'ArrowUp') camera.beta = Math.max(0.35, camera.beta - 0.08);
      if (key === 'ArrowDown') camera.beta = Math.min(1.45, camera.beta + 0.08);
    },
    snapshot: () => ({
      rendered, scene: 'first-contact', phase: state.phase, frames, paused, reducedMotion,
      pod: podAsset?.metrics ?? { loaded: false, error: assetError },
      meanFrameMs: frameTimes.length ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length : 0,
      meshes: scene.meshes.length, activeMeshes: scene.getActiveMeshes().length,
      triangles: scene.meshes.reduce((total, mesh) => total + mesh.getTotalIndices(), 0) / 3,
      renderer: `WebGL ${engine.webGLVersion}`,
    }),
    dispose() { window.removeEventListener('resize', resize); podAsset?.dispose(); scene.dispose(); engine.dispose(); },
  };
}
