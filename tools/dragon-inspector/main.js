import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { ACTIVE_DRAGON } from '../../src/prototypes/dogfight/assets/dragon-model.js';
import { createDragonInstance, DRAGON_ATTACHMENTS } from '../../src/prototypes/dogfight/assets/dragon-instance.js';
import { DragonAnimation } from '../../src/prototypes/dogfight/animation/dragon.js';
import { prepareCombatMaterials } from '../../src/prototypes/dogfight/assets/surface-materials.js';
import { createEnvironment } from '../../src/prototypes/dogfight/assets/environment.js';
import { auditRenderer } from '../../src/prototypes/dogfight/assets/render-audit.js';

const $ = id => document.getElementById(id), base = import.meta.env.BASE_URL;
const query = new URLSearchParams(location.search), filename = query.get('asset') ?? ACTIVE_DRAGON.filename;
if (!/^[\w-]+\.glb$/.test(filename)) throw new Error('Choose a local versioned GLB filename.');
const defaults = {
  viewport: [1440, 1000], fov: 43,
  cameras: { front: { position: [0, 2, -13], target: [0, .3, -.2] }, side: { position: [13, 2.7, 0], target: [0, .3, -.2] },
    full: { position: [6.8, 3.8, -8.4], target: [0, .2, .4] }, head: { position: [3.5, 2.05, -6.5], target: [0, .6, -2.3] } },
  world: { color: [.18, .18, .18], strength: .35 },
  lights: [
    { name: 'key', position: [-4, 7, -7], target: [0, .4, -1], size: [7, 5], neutralPower: 1500, cinematicPower: 2200, neutralColor: [1, 1, 1], cinematicColor: [1, .7, .45] },
    { name: 'fill', position: [5, 4, -2], target: [0, .4, -1], size: [5, 5], neutralPower: 450, cinematicPower: 180, neutralColor: [1, 1, 1], cinematicColor: [1, 1, 1] },
    { name: 'rim', position: [5, 4, 3], target: [0, .4, -1], size: [4, 4], neutralPower: 1200, cinematicPower: 1800, neutralColor: [1, 1, 1], cinematicColor: [.55, .72, 1] },
  ],
};

async function initialize() {
  RectAreaLightUniformsLib.init();
  const renderer = new THREE.WebGLRenderer({ canvas: $('inspection'), antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight); renderer.outputColorSpace = THREE.SRGBColorSpace;
  const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, .05, 35000);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
  const studio = new THREE.Scene(), flight = new THREE.Scene();
  let scene = studio, reference = defaults, reflection;
  const manager = new THREE.LoadingManager(), failures = [];
  const assetsReady = new Promise(resolve => { manager.onLoad = resolve; });
  manager.onError = path => failures.push(path);
  const environment = createEnvironment(flight, new THREE.TextureLoader(manager)); environment.update(new THREE.Vector3());
  const gltf = await new GLTFLoader(manager).loadAsync(`${base}assets/dogfight/models/${filename}`);
  await assetsReady;
  if (failures.length) throw new Error(`Missing local assets: ${failures.join(', ')}`);
  const instance = createDragonInstance(gltf, { ...ACTIVE_DRAGON, filename });
  const surfaces = prepareCombatMaterials(renderer, flight, instance.model, new THREE.Group(), { dragonKind: 'mechanical' });
  const animation = new DragonAnimation(instance.model, gltf.animations);
  studio.add(instance.root);
  const lamps = [], helpers = new THREE.Group();
  const ground = new THREE.GridHelper(16, 16, 0x97a4b4, 0x4d5865);
  ground.position.y = instance.localAttachment('ground').y;
  ground.visible = false; studio.add(ground);
  const sockets = new Map();
  // Markers are a presentation aid, not collider or weapon geometry.
  for (const [role, name] of Object.entries(DRAGON_ATTACHMENTS)) {
    const marker = new THREE.AxesHelper(.4); marker.name = name; helpers.add(marker); sockets.set(role, marker);
  }
  helpers.visible = false; studio.add(helpers);
  let mode = 'rest', time = 0, previous = performance.now(), auditTime = 0, capture = false;

  function configureReference(config = defaults) {
    reference = config;
    for (const lamp of lamps) studio.remove(lamp); lamps.length = 0;
    for (const spec of reference.lights) {
      const light = new THREE.RectAreaLight(); light.name = spec.name; light.position.set(...spec.position);
      light.width = spec.size[0]; light.height = spec.size[1]; light.lookAt(...spec.target); lamps.push(light); studio.add(light);
    }
    const world = new THREE.Scene(); world.background = new THREE.Color(...reference.world.color).multiplyScalar(reference.world.strength);
    const generator = new THREE.PMREMGenerator(renderer); const nextReflection = generator.fromScene(world, 0, .1, 100, { size: 128 });
    generator.dispose(); reflection?.dispose(); reflection = nextReflection;
    studio.background = world.background.clone(); studio.environment = reflection.texture; studio.environmentIntensity = 1;
    applyView($('view').value); applyLighting($('lighting').value);
  }
  function applyView(view) {
    const pose = reference.cameras[view]; camera.fov = reference.fov; camera.position.set(...pose.position);
    controls.target.set(...pose.target); camera.lookAt(controls.target); camera.updateProjectionMatrix(); controls.update();
  }
  function applyLighting(lighting) {
    const neutral = lighting === 'neutral';
    for (let i = 0; i < lamps.length; i++) {
      const spec = reference.lights[i], lamp = lamps[i];
      lamp.color.setRGB(...spec[neutral ? 'neutralColor' : 'cinematicColor']);
      // Blender power to Three radiance is an approximation, recorded in the
      // comparison receipt. Matching poses does not imply identical renderers.
      lamp.intensity = spec[neutral ? 'neutralPower' : 'cinematicPower'] / (spec.size[0] * spec.size[1] * Math.PI);
    }
    renderer.toneMapping = scene === flight || !neutral ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    renderer.toneMappingExposure = scene === flight ? 1.1 : 1;
  }
  function applyScene(name) {
    scene = name === 'flight' ? flight : studio; scene.add(instance.root, helpers);
    ground.visible = scene === studio && $('ground').checked;
    $('lighting').disabled = name === 'flight'; applyLighting($('lighting').value);
  }
  function setAnimation(value) {
    mode = value; time = 0; animation.reset();
  }
  function updateHelpers() {
    for (const [name, marker] of sockets) marker.position.copy(instance.worldAttachment(name));
  }
  const audit = () => auditRenderer({ renderer, scene, camera, assetRoot: instance.model,
    extraRenderTargets: scene === studio ? [reflection] : surfaces.reflectionTarget ? [surfaces.reflectionTarget] : [] });
  const render = () => { updateHelpers(); renderer.render(scene, camera); };
  configureReference();
  $('scene').addEventListener('change', () => applyScene($('scene').value));
  $('view').addEventListener('change', () => applyView($('view').value));
  $('lighting').addEventListener('change', () => applyLighting($('lighting').value));
  $('animation').addEventListener('change', () => setAnimation($('animation').value));
  $('sockets').addEventListener('change', () => { helpers.visible = $('sockets').checked; });
  $('ground').addEventListener('change', () => { ground.visible = scene === studio && $('ground').checked; });
  window.addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
  function frame(now) {
    const dt = Math.min(.05, Math.max(0, (now - previous) / 1000)); previous = now;
    if (!capture) {
      if (mode !== 'rest') { time += dt; animation.update(time, 0, mode === 'boost', mode === 'fire', 0, mode === 'beam' ? { stage: 'beam', progress: .5 } : null); }
      controls.update(); render();
      if (now - auditTime > 1000) { $('audit').textContent = JSON.stringify(audit(), null, 2); auditTime = now; }
    }
    requestAnimationFrame(frame);
  }
  window.dragonInspector = Object.freeze({
    configureReference,
    capture({ view = 'full', lighting = 'neutral', environment = 'neutral', animationState = 'rest' } = {}) {
      capture = true; document.body.classList.add('capture');
      helpers.visible = false; ground.visible = false; controls.enableDamping = false;
      applyScene(environment); applyLighting(lighting); applyView(view); setAnimation(animationState);
      if (animationState !== 'rest') animation.update(.8, 0, animationState === 'boost', animationState === 'fire', 0, animationState === 'beam' ? { stage: 'beam', progress: .5 } : null);
      instance.root.updateMatrixWorld(true); render();
      return { filename, view, lighting, environment, animationState, audit: audit(), instance: instance.snapshot() };
    },
    resume() { capture = false; controls.enableDamping = true; document.body.classList.remove('capture'); },
    snapshot: () => ({ filename, audit: audit(), instance: instance.snapshot(), clips: gltf.animations.map(clip => ({ name: clip.name, duration: clip.duration })), failures }),
  });
  $('status').textContent = `${filename} · ${gltf.animations.length} clips · rest pose comparison`;
  document.body.dataset.ready = 'true'; requestAnimationFrame(frame);
}
initialize().catch(error => { console.error(error); $('status').textContent = error.message; document.body.dataset.ready = 'error'; });
