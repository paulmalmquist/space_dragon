import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3, Color3, Color4 } from '@babylonjs/core/Maths/math';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { FAMILY, initialCheckpoint } from './firstContact';
import type { Checkpoint } from './firstContact';

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
  // Low-detail stand-ins, not family likeness assets. Neutral colors remain neutral
  // where the owner has not selected a palette (especially Lyla).
  const family = FAMILY.map((member, index) => {
    const suit = material(`suit.${member.id}`, member.color);
    const body = MeshBuilder.CreateCapsule(`family.${member.id}`, { height: index < 2 ? 1.5 : 1.05, radius: index === 0 ? 0.28 : 0.21, tessellation: 12 }, scene);
    body.position.set(0.3 + index * 1.08, index < 2 ? 0.8 : 0.57, -2.2);
    body.material = suit;
    const visor = box(`family.${member.id}.visor`, [index < 2 ? 0.34 : 0.28, 0.12, 0.06], [body.position.x, index < 2 ? 1.3 : 0.9, -2.42], dark);
    const badge = MeshBuilder.CreateTorus(`family.${member.id}.base`, { diameter: 0.72, thickness: 0.025, tessellation: 24 }, scene);
    badge.position.set(body.position.x, 0.03, -2.2);
    badge.material = suit;
    return { body, visor, badge, suit };
  });
  const fallenPanel = box('interaction.fallen-panel', [2.5, 0.16, 1], [2.5, 2.2, 0], wallMat);
  fallenPanel.rotation.z = 0.18;
  const antenna = box('interaction.antenna', [1.2, 0.12, 0.18], [3.5, 3.5, 0], cyan);
  const rail = box('interaction.stuck-rail', [1.4, 0.13, 0.55], [2.5, 0.1, -0.9], armor);
  const goo = MeshBuilder.CreateSphere('interaction.goo', { diameter: 1, segments: 12 }, scene);
  goo.scaling.set(1.6, 0.07, 0.65);
  goo.position.set(2.5, 0.02, -0.9);
  goo.material = material('goo.pink', '#e58dbb', '#54263f');
  const pulse = MeshBuilder.CreateTorus('interaction.healing-pulse', { diameter: 5.5, thickness: 0.06, tessellation: 48 }, scene);
  pulse.position.set(2.5, 0.08, -1);
  pulse.material = material('healing.purple', '#bc8ee9', '#6b388f');
  const tether = MeshBuilder.CreateLines('interaction.tether', { points: [new Vector3(2.46, 0.9, -2.2), new Vector3(3.5, 2.9, 0)] }, scene);
  tether.color = new Color3(0.83, 0.91, 1);
  const signal = MeshBuilder.CreatePolyhedron('archive.signal', { type: 1, size: 0.36 }, scene);
  signal.position.set(2.5, 3.5, 0);
  signal.material = cyan;
  // An incomplete schematic floats above the pod; it is never a physical dragon.
  const line = (points: number[][]) => points.map(p => new Vector3(p[0]!, p[1]!, p[2]!));
  const design = MeshBuilder.CreateLineSystem('pod.stored-dragon-design', { lines: [
    line([[0,0,0],[0,0.5,0],[0.15,1,0],[0.6,1.15,0],[0.7,0.95,0],[0.25,0.85,0]]),
    line([[0,0.5,0],[-1.3,1,0.2],[-2.1,0.5,0.3],[-1.3,0.65,0.2],[-0.4,0.3,0]]),
    line([[0,0.5,0],[1.4,0.9,0.5],[2.1,0.3,0.7],[1.4,0.5,0.5]]),
    line([[0,0,0],[-0.25,-0.5,0],[-1.2,-0.7,0.2],[-1.6,-0.3,0.3]]),
  ] }, scene);
  design.position.set(2.5, 4, 1.1);
  design.color = new Color3(0.32, 0.82, 0.93);
  let state: Checkpoint = initialCheckpoint();
  let paused = false;
  let reducedMotion = false;
  const applyProgress = (blend: number) => {
    const count = state.demonstrated;
    fallenPanel.position.x += ((count >= 1 ? 5.5 : 2.5) - fallenPanel.position.x) * blend;
    fallenPanel.position.y += ((count >= 1 ? 0.25 : 2.2) - fallenPanel.position.y) * blend;
    antenna.position.y += ((count >= 3 ? 2.9 : 3.5) - antenna.position.y) * blend;
    rail.position.x += ((count >= 4 ? 3.6 : 2.5) - rail.position.x) * blend;
  };
  let frames = 0;
  let elapsed = 0;
  const frameTimes: number[] = [];
  let rendered = false;
  scene.onBeforeRenderObservable.add(() => {
    const delta = Math.min(engine.getDeltaTime(), 50);
    if (!paused && !reducedMotion) { elapsed += delta / 1000; applyProgress(Math.min(1, delta / 100)); }
    ring.rotation.y = elapsed * 0.35;
    glow.intensity = (state.step === 'pod' ? 2.4 : 1.6) + Math.sin(elapsed * 2) * 0.25;
    screen.scaling.x = state.step === 'computer' ? 1 + Math.sin(elapsed * 7) * 0.015 : 1;
    signal.rotation.y = elapsed * 0.35;
    pulse.scaling.setAll(1 + Math.sin(elapsed * 1.5) * 0.03);
    frames++;
    frameTimes.push(delta);
    if (frameTimes.length > 120) frameTimes.shift();
  });
  scene.onAfterRenderObservable.addOnce(() => { rendered = true; });
  engine.runRenderLoop(() => scene.render());
  const resize = () => engine.resize();
  window.addEventListener('resize', resize);
  return {
    setState(value: Checkpoint) {
      const changedLocation = value.step !== state.step;
      const reset = value.demonstrated < state.demonstrated;
      state = value;
      const equipped = ['suits', 'scan', 'map'].includes(state.step);
      family.forEach(({ body, visor, badge, suit }, index) => {
        body.setEnabled(equipped); visor.setEnabled(equipped); badge.setEnabled(equipped);
        suit.emissiveColor = Color3.FromHexString(FAMILY[index]!.color).scale(state.step === 'suits' && state.demonstrated === index ? 0.55 : 0.12);
      });
      fallenPanel.setEnabled(equipped);
      antenna.setEnabled(equipped);
      rail.setEnabled(equipped);
      pulse.setEnabled(equipped && state.demonstrated >= 2);
      tether.setEnabled(equipped && state.demonstrated >= 3);
      goo.setEnabled(equipped && state.demonstrated >= 4);
      signal.setEnabled(state.step === 'scan' || state.step === 'map');
      design.setEnabled(['pod', 'suits', 'scan', 'map'].includes(state.step));
      if (reducedMotion || reset) applyProgress(1);
      if (changedLocation || value.step === 'computer') {
        camera.setTarget(value.step === 'computer' ? new Vector3(-3.3, 1.1, 0) : new Vector3(1.2, 2, 0));
        camera.radius = value.step === 'computer' ? 11 : equipped ? 12 : 10;
      }
    },
    setPaused(value: boolean) {
      paused = value;
      if (value) {
        camera.detachControl();
        camera.inertialAlphaOffset = camera.inertialBetaOffset = camera.inertialRadiusOffset = 0;
        camera.inertialPanningX = camera.inertialPanningY = 0;
      } else camera.attachControl(canvas, true);
    },
    setReducedMotion(value: boolean) { reducedMotion = value; if (value) { elapsed = 0; applyProgress(1); } },
    snapshot: () => ({
      rendered, scene: 'first-contact', step: state.step, frames, paused, reducedMotion, animationTime: elapsed,
      props: { panelX: fallenPanel.position.x, tether: tether.isEnabled(), goo: goo.isEnabled(), signal: signal.isEnabled() },
      meanFrameMs: frameTimes.length ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length : 0,
      meshes: scene.meshes.length, activeMeshes: scene.getActiveMeshes().length,
      triangles: scene.meshes.reduce((total, mesh) => total + mesh.getTotalIndices(), 0) / 3,
      renderer: `WebGL ${engine.webGLVersion}`,
    }),
    dispose() { window.removeEventListener('resize', resize); scene.dispose(); engine.dispose(); },
  };
}
