import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3, Color3, Color4 } from '@babylonjs/core/Maths/math';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Step } from './checkpoint';

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
  let step: Step = 'computer';
  let frames = 0;
  let elapsed = 0;
  const frameTimes: number[] = [];
  let rendered = false;
  scene.onBeforeRenderObservable.add(() => {
    const delta = engine.getDeltaTime();
    elapsed += delta / 1000;
    ring.rotation.y = elapsed * 0.35;
    glow.intensity = (step === 'pod' ? 2.4 : 1.6) + Math.sin(elapsed * 2) * 0.25;
    screen.scaling.x = step === 'computer' ? 1 + Math.sin(elapsed * 7) * 0.015 : 1;
    frames++;
    frameTimes.push(delta);
    if (frameTimes.length > 120) frameTimes.shift();
  });
  scene.onAfterRenderObservable.addOnce(() => { rendered = true; });
  engine.runRenderLoop(() => scene.render());
  const resize = () => engine.resize();
  window.addEventListener('resize', resize);
  return {
    setStep(value: Step) {
      step = value;
      camera.setTarget(value === 'computer' ? new Vector3(-3.3, 1.1, 0) : new Vector3(2, 1.3, 0));
      camera.radius = value === 'computer' ? 11 : 8;
    },
    snapshot: () => ({
      rendered, scene: 'first-contact', step, frames,
      meanFrameMs: frameTimes.length ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length : 0,
      meshes: scene.meshes.length, activeMeshes: scene.getActiveMeshes().length,
      triangles: scene.meshes.reduce((total, mesh) => total + mesh.getTotalIndices(), 0) / 3,
      renderer: `WebGL ${engine.webGLVersion}`,
    }),
    dispose() { window.removeEventListener('resize', resize); scene.dispose(); engine.dispose(); },
  };
}
