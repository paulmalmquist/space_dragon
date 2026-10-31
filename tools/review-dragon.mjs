// Reproducible local asset presentation using the Dogfight loader, material pass
// and bone animation. This is separate from actual gameplay/performance testing.
import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const [candidate, reference = 'dragon-mechanical-red-v001.glb', output = 'artifacts/cinematic-dragon-review'] = process.argv.slice(2);
if (!candidate || [candidate, reference].some(name => !/^[a-zA-Z0-9_-]+\.glb$/.test(name))) {
  throw new Error('Usage: node tools/review-dragon.mjs candidate.glb [reference.glb] [output-directory]');
}
const url = process.env.SPACE_DRAGON_REVIEW_URL || 'http://127.0.0.1:5173/space-dragon/';
const origin = new URL(url).origin;
if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Review requires a local development server.');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [], results = [];
try {
  for (const [label, filename] of [['reference', reference], ['candidate', candidate]]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    await page.route('**/favicon.ico', route => route.fulfill({ status: 204, body: '' }));
    page.on('pageerror', error => errors.push(`${label}: ${error.message}`));
    page.on('console', message => { if (message.type() === 'error') errors.push(`${label}: ${message.text()}`); });
    page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== origin) errors.push(`External request: ${request.url()}`); });
    await page.goto(new URL('assets/dogfight/NOTICE.md', url).href);
    const measurements = await page.evaluate(async ({ url, filename }) => {
      const surfaceURL = new URL('src/prototypes/dogfight/assets/surface-materials.js', url).href;
      const surfaceSource = await (await fetch(surfaceURL)).text();
      const THREE = await import(surfaceSource.match(/from\s*["']([^"']*three[^"']*)["']/)[1]);
      const mainSource = await (await fetch(new URL('src/prototypes/dogfight/main.js', url))).text();
      const { GLTFLoader } = await import(mainSource.match(/import\s*\{\s*GLTFLoader\s*\}\s*from\s*["']([^"']+)["']/)[1]);
      const { RectAreaLightUniformsLib } = await import(new URL('node_modules/three/examples/jsm/lights/RectAreaLightUniformsLib.js', url).href);
      RectAreaLightUniformsLib.init();
      const { prepareCombatMaterials } = await import(surfaceURL);
      const { DragonAnimation } = await import(new URL('src/prototypes/dogfight/animation/dragon.js', url).href);
      document.body.innerHTML = '<canvas></canvas>';
      document.body.style = 'margin:0;overflow:hidden;background:#20252c';
      const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('canvas'), antialias: true });
      renderer.setSize(1440, 1000); renderer.setPixelRatio(1);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(43, 1.44, .05, 500);
      const hemisphere = new THREE.HemisphereLight(0xf0f3ff, 0x30343b, 1.25);
      const key = new THREE.RectAreaLight(0xfff4e4, 9, 7, 5); key.position.set(-4, 7, -7); key.lookAt(0, .4, -1);
      const rim = new THREE.DirectionalLight(0xbdd5ff, 1.4); rim.position.set(5, 4, 3);
      scene.add(hemisphere, key, rim);
      const started = performance.now();
      const model = (await new GLTFLoader().loadAsync(new URL(`assets/dogfight/models/${filename}`, url).href)).scene;
      const loadMs = performance.now() - started;
      scene.add(model);
      const finish = prepareCombatMaterials(renderer, scene, model, new THREE.Group(), { dragonKind: 'mechanical' });
      const animation = new DragonAnimation(model); animation.update(0, 0, false, false, 0);
      const originalMaps = new Map([...finish.ownedMaterials].map(material => [material, { normal: material.normalMap, ao: material.aoMapIntensity, normalScale: material.normalScale?.clone() }]));
      window.dragonReview = {
        render(view, lighting, jaw = false, diagnostic = 'full') {
          for (const [material, maps] of originalMaps) {
            const normal = diagnostic === 'normal-off' ? null : maps.normal;
            if (normal !== material.normalMap) { material.normalMap = normal; material.needsUpdate = true; }
            material.aoMapIntensity = diagnostic === 'ao-off' ? 0 : maps.ao;
            if (maps.normalScale) {
              material.normalScale.copy(maps.normalScale);
              if (diagnostic === 'paint-subtle' && /painted armor_Atlas/.test(material.name)) {
                const strength = /Crimson/.test(material.name) ? .22 : .18;
                material.normalScale.multiplyScalar(strength / Math.max(Math.abs(maps.normalScale.x), .001));
              }
            }
          }
          const neutral = lighting === 'neutral';
          scene.background = new THREE.Color(neutral ? 0x343a43 : 0x101720);
          renderer.toneMappingExposure = neutral ? 1.12 : 1.0;
          hemisphere.intensity = neutral ? 1.5 : .45;
          key.color.set(neutral ? 0xffffff : 0xffd5ac); key.intensity = neutral ? 9 : 16;
          rim.intensity = neutral ? 1.2 : 2.6;
          scene.environmentIntensity = neutral ? .65 : .8;
          const pose = {
            front: [[0, 2.0, -13], [0, .3, -.2]],
            side: [[13, 2.7, 0], [0, .3, -.2]],
            full: [[6.8, 3.8, -8.4], [0, .2, .4]],
            head: [[3.5, 2.05, -6.5], [0, .6, -2.3]],
            shoulder: [[-4, 2.9, -3.5], [-.7, .6, -1]],
          }[view];
          camera.position.set(...pose[0]); camera.lookAt(...pose[1]);
          animation.reset(); animation.update(jaw ? .6 : 0, 0, false, jaw, 0);
          renderer.render(scene, camera);
          return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, textureCount: renderer.info.memory.textures };
        },
      };
      const gl = renderer.getContext(), debug = gl.getExtension('WEBGL_debug_renderer_info');
      return { filename, loadMs, materials: finish.report.mechanicalMaterials, renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) };
    }, { url, filename });
    measurements.views = [];
    for (const lighting of ['neutral', 'cinematic']) {
      for (const view of ['front', 'side', 'full', 'head', 'shoulder']) {
        const stats = await page.evaluate(({ view, lighting }) => window.dragonReview.render(view, lighting), { view, lighting });
        const file = `${label}-${lighting}-${view}.png`;
        await page.screenshot({ path: path.join(output, file) });
        measurements.views.push({ view, lighting, file, ...stats });
      }
    }
    await page.evaluate(() => window.dragonReview.render('head', 'neutral', true));
    await page.screenshot({ path: path.join(output, `${label}-neutral-jaw.png`) });
    for (const diagnostic of ['normal-off', 'ao-off', 'paint-subtle']) {
      await page.evaluate(diagnostic => window.dragonReview.render('head', 'neutral', false, diagnostic), diagnostic);
      await page.screenshot({ path: path.join(output, `${label}-neutral-head-${diagnostic}.png`) });
    }
    results.push(measurements); await page.close();
  }
  await writeFile(path.join(output, 'receipt.json'), JSON.stringify({ browser: browser.version(), viewport: [1440, 1000], results, errors,
    scope: 'Fixed identical cameras and lighting; real Dogfight loader/materials/animation in isolated browser scene. No bloom. No gameplay or sustained performance claim.' }, null, 2));
  await writeFile(path.join(output, 'index.html'), await readFile(new URL('./templates/dragon-review.html', import.meta.url)));
  if (errors.length) throw new Error(JSON.stringify(errors));
  console.log(JSON.stringify({ output, models: results.map(r => ({ file: r.filename, loadMs: r.loadMs, views: r.views.length + 4 })), errors }));
} finally { await browser.close(); }
