import * as THREE from 'three';
import { createAsteroidField, createPlanetTexture } from './asteroids.js';

// Procedural scenery is deterministic and independent of flight/combat.
export function createEnvironment(scene, loader) {
  const base = import.meta.env?.BASE_URL || '/space-dragon/';
  const background = loader.load(`${base}assets/dogfight/textures/nebula.jpg`);
  background.mapping = THREE.EquirectangularReflectionMapping;
  background.colorSpace = THREE.SRGBColorSpace;
  scene.background = background;
  scene.backgroundIntensity = 0.38;
  const space = new THREE.Group();
  scene.add(space);
  const rng = (() => { let s = 983; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  const positions = [], colors = [];
  for (let i = 0; i < 5200; i++) {
    const a = rng() * Math.PI * 2, y = rng() * 2 - 1, r = 13000 + rng() * 7000;
    const xz = Math.sqrt(1 - y * y);
    positions.push(Math.cos(a) * xz * r, y * r, Math.sin(a) * xz * r);
    const c = new THREE.Color().setHSL(0.57 + rng() * 0.18, 0.18, 0.5 + rng() * 0.5);
    colors.push(c.r, c.g, c.b);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  space.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ size: 12, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false })));

  const planetTexture = createPlanetTexture();
  const planet = new THREE.Mesh(new THREE.SphereGeometry(2050, 64, 40), new THREE.MeshStandardMaterial({ map: planetTexture, roughness: .97, metalness: 0, envMapIntensity: .15 }));
  planet.position.set(-5200, -1100, -14500);
  planet.rotation.z = -0.25;
  space.add(planet);
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(2090, 48, 32), new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: 'varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
    fragmentShader: 'varying vec3 n;varying vec3 v;void main(){float f=pow(1.-abs(dot(n,v)),3.);gl_FragColor=vec4(.12,.28,.42,f*.35);}'
  }));
  atmosphere.position.copy(planet.position); space.add(atmosphere);
  const ringGeo = new THREE.RingGeometry(2550, 3550, 128, 4);
  const ring = new THREE.Mesh(ringGeo, new THREE.ShaderMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false,
    vertexShader: 'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 p;void main(){float r=length(p.xy);float a=.095+.05*sin(r*.12)+.03*sin(r*.031);gl_FragColor=vec4(.44,.42,.38,a);}'
  }));
  ring.position.copy(planet.position); ring.rotation.set(1.06, .15, -.28); space.add(ring);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(310, 32, 24), new THREE.MeshStandardMaterial({ color: 0x5c5669, roughness: 1 }));
  moon.position.set(5900, -1900, -14000); space.add(moon);

  // Distant celestial scenery may track the sky origin; solid gameplay rocks
  // live directly in scene world space and never follow the dragon.
  const asteroids = createAsteroidField(scene);
  // Neutral key and restrained fill let surface relief read instead of washing
  // every object with the same purple highlight. Shadow coverage follows the hero.
  scene.add(new THREE.HemisphereLight(0xaab9d4, 0x10121b, .42));
  const key = new THREE.DirectionalLight(0xfff0db, 3.2); key.position.set(-30, 45, -25);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 140 });
  key.shadow.bias = -.00012; key.shadow.normalBias = .025;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x86a9d7, 1.15); rim.position.set(5, 1, 7); scene.add(rim);
  const warm = new THREE.DirectionalLight(0xe8c3a4, .3); warm.position.set(-5, -3, 2); scene.add(warm);
  const keyOffset = new THREE.Vector3(-30, 45, -25);
  return { asteroids, reset() { asteroids.reset(); }, update(playerPosition) {
    space.position.copy(playerPosition).multiplyScalar(.96); planet.rotation.y += .00005;
    asteroids.update(playerPosition);
    key.position.copy(playerPosition).add(keyOffset);
    key.target.position.copy(playerPosition);
  }, dispose() { asteroids.dispose(); key.shadow.dispose(); } };
}
