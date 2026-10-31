import * as THREE from 'three';

const MAX_ITEMS = 144;
const MAX_SPARK_BATCHES = 8;
const fract = value => value - Math.floor(value);
const noise = (x, y, seed) => fract(Math.sin(x * 127.1 + y * 311.7 + seed * 13.3) * 43758.5453123);
const smoothNoise = (x, y, seed) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = fract(x), fy = fract(y);
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(noise(ix, iy, seed), noise(ix + 1, iy, seed), sx),
    THREE.MathUtils.lerp(noise(ix, iy + 1, seed), noise(ix + 1, iy + 1, seed), sx), sy);
};

// Original local texture data: soft turbulent edges rather than opaque spheres.
// The maps are shared by bounded particle pools, never loaded from a service.
export function createEffectTexture(kind, size = 128) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const px = (x + .5) / size * 2 - 1, py = (y + .5) / size * 2 - 1;
    const turbulence = smoothNoise(x / 19, y / 19, 3) * .55 + smoothNoise(x / 8, y / 8, 7) * .3 + smoothNoise(x / 3, y / 3, 11) * .15;
    const radius = Math.hypot(px, py), index = (y * size + x) * 4;
    const angle = Math.atan2(py, px);
    // Noncircular lobes have room to feather out inside the transparent border.
    // Each pooled sprite rotates independently, breaking up a round shield look.
    const edge = kind === 'glow' ? 1 : .77 + Math.sin(angle * 3 + .7) * .105 + Math.sin(angle * 7 - 1.2) * .055 + (turbulence - .5) * .05;
    const radial = Math.max(0, 1 - radius / edge);
    const alpha = kind === 'smoke' ? Math.pow(radial, .75) * (.4 + turbulence * .6) : Math.pow(radial, 1.65) * (.6 + turbulence * .4);
    const hot = Math.pow(radial, .45);
    if (kind === 'fire') data.set([255, Math.round(70 + hot * 185), Math.round(12 + hot * hot * 205), Math.round(alpha * 255)], index);
    else {
      const shade = kind === 'smoke' ? Math.round(150 + turbulence * 90) : 255;
      data.set([shade, shade, shade, Math.round(alpha * 255)], index);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.name = `authored-${kind}-particle`; texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true; texture.needsUpdate = true; return texture;
}

export class Effects {
  constructor(scene) {
    this.scene = scene; this.items = [];
    this.spritePools = new Map(); this.spriteMaterials = new Set(); this.sparkPools = []; this.sparkBatches = new Set();
    this.textures = { glow: createEffectTexture('glow'), fire: createEffectTexture('fire'), smoke: createEffectTexture('smoke') };
    this.sparkGeometry = new THREE.TetrahedronGeometry(.24, 0);
    this.ringGeometry = new THREE.SphereGeometry(1, 32, 16);
    this.materials = {
      debris: new THREE.MeshStandardMaterial({ color: 0x50545b, metalness: .78, roughness: .46 }),
      wave: new THREE.ShaderMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
        uniforms: { opacity: { value: 0 } },
        vertexShader: 'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
        fragmentShader: 'varying vec3 n;varying vec3 v;uniform float opacity;void main(){float edge=pow(1.-abs(dot(normalize(n),normalize(v))),12.);gl_FragColor=vec4(1.,.65,.29,edge*opacity);}' })
    };
    this.waveMaterials = new Set();
    this.flashes = Array.from({ length: 2 }, () => {
      const light = new THREE.PointLight(0xffc58a, 0, 100, 2); scene.add(light); return { light, life: 0, max: .18 };
    });
    this.disposed = false;
  }
  sprite(texture, blending) {
    const key = `${texture.name}:${blending}`;
    if (!this.spritePools.has(key)) this.spritePools.set(key, []);
    const pool = this.spritePools.get(key);
    let mesh = pool.pop();
    if (!mesh) {
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, blending, depthWrite: false, toneMapped: blending !== THREE.AdditiveBlending });
      this.spriteMaterials.add(material); mesh = new THREE.Sprite(material);
    }
    mesh.material.opacity = 1; mesh.material.color.set(0xffffff); mesh.material.rotation = Math.random() * Math.PI * 2;
    return { mesh, poolKey: key };
  }
  add(item) {
    while (this.items.length >= MAX_ITEMS) this.remove(0);
    this.items.push(item); this.scene.add(item.mesh);
  }
  puff(position, type, life, startSize, endSize, speed, color = 0xffffff, direction = null) {
    const texture = this.textures[type === 'smoke' ? 'smoke' : type === 'fire' ? 'fire' : 'glow'];
    const sprite = this.sprite(texture, type === 'smoke' ? THREE.NormalBlending : THREE.AdditiveBlending);
    sprite.mesh.position.copy(position); sprite.mesh.material.color.set(color);
    sprite.mesh.scale.setScalar(startSize);
    this.add({ ...sprite, type, life, max: life, startSize, endSize, spin: (Math.random() - .5) * .35,
      vel: direction ? direction.clone().multiplyScalar(speed) : new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).multiplyScalar(speed) });
  }
  sparkBatch(position, big) {
    if (this.sparkBatches.size >= MAX_SPARK_BATCHES && !this.sparkPools.length) {
      const oldest = this.items.findIndex(item => item.type === 'sparks'); if (oldest >= 0) this.remove(oldest);
    }
    let batch = this.sparkPools.pop();
    if (!batch) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(32 * 6), 3).setUsage(THREE.DynamicDrawUsage));
      const material = new THREE.LineBasicMaterial({ color: 0xffd29b, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const mesh = new THREE.LineSegments(geometry, material); mesh.frustumCulled = false;
      batch = { mesh, particles: Array.from({ length: 32 }, () => ({ position: new THREE.Vector3(), velocity: new THREE.Vector3() })) };
      this.sparkBatches.add(batch);
    }
    const count = big ? 32 : 8, life = big ? 1.15 : .34;
    batch.mesh.geometry.setDrawRange(0, count * 2); batch.mesh.material.opacity = 1;
    for (let i = 0; i < count; i++) {
      const particle = batch.particles[i]; particle.position.copy(position);
      particle.velocity.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(big ? 18 + Math.random() * 42 : 10 + Math.random() * 18);
    }
    this.add({ type: 'sparks', mesh: batch.mesh, batch, count, life, max: life });
  }
  burst(position, kind = 'violet', big = false) {
    if (this.disposed) return;
    this.puff(position, 'flash', big ? .23 : .12, big ? 7 : 1.3, big ? 27 : 4, 0, big ? 0xffebd0 : kind === 'violet' ? 0xded0ff : 0xffd1a1);
    this.sparkBatch(position, big);
    if (big) {
      const plume = new THREE.Vector3(Math.random() - .5, Math.random() - .25, Math.random() - .5).normalize();
      const offset = new THREE.Vector3(), direction = new THREE.Vector3();
      for (let i = 0; i < 5; i++) {
        direction.copy(plume).multiplyScalar(.8).add(new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)).normalize();
        offset.copy(position).addScaledVector(direction, 1.5 + Math.random() * 4);
        this.puff(offset, 'fire', .48 + Math.random() * .4, 3 + Math.random() * 4, 12 + Math.random() * 11, 10 + Math.random() * 10, 0xffffff, direction);
      }
      for (let i = 0; i < 8; i++) {
        direction.copy(plume).multiplyScalar(.65).add(new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)).normalize();
        offset.copy(position).addScaledVector(direction, 2 + Math.random() * 6);
        this.puff(offset, 'smoke', 1.7 + Math.random() * 1.1, 4 + Math.random() * 4, 15 + Math.random() * 12, 6 + Math.random() * 5, 0x726760, direction);
      }
      for (let i = 0; i < 6; i++) {
        const mesh = new THREE.Mesh(this.sparkGeometry, this.materials.debris); mesh.position.copy(position);
        mesh.scale.set(1 + Math.random() * 2, .4 + Math.random(), 1 + Math.random());
        this.add({ mesh, type: 'debris', life: 1.6, max: 1.6,
          vel: new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(16 + Math.random() * 28),
          spin: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6) });
      }
      const material = this.materials.wave.clone(); this.waveMaterials.add(material);
      const mesh = new THREE.Mesh(this.ringGeometry, material); mesh.position.copy(position);
      this.add({ mesh, type: 'wave', life: .42, max: .42 });
      const flash = this.flashes.reduce((a, b) => a.life < b.life ? a : b);
      flash.life = flash.max; flash.light.position.copy(position); flash.light.intensity = 1000;
    } else {
      this.puff(position, 'smoke', .45, .6, 3, 2, 0x5c5661);
    }
  }
  update(dt) {
    if (!Number.isFinite(dt) || dt < 0 || this.disposed) return;
    for (const flash of this.flashes) { flash.life = Math.max(0, flash.life - dt); flash.light.intensity = 1000 * Math.pow(flash.life / flash.max, 3); }
    for (let i = this.items.length - 1; i >= 0; i--) {
      const particle = this.items[i]; particle.life -= dt;
      if (particle.life <= 0) { this.remove(i); continue; }
      const age = 1 - particle.life / particle.max;
      if (particle.type === 'sparks') {
        const positions = particle.mesh.geometry.attributes.position;
        for (let j = 0; j < particle.count; j++) {
          const spark = particle.batch.particles[j]; spark.position.addScaledVector(spark.velocity, dt);
          positions.setXYZ(j * 2, spark.position.x, spark.position.y, spark.position.z);
          positions.setXYZ(j * 2 + 1, spark.position.x - spark.velocity.x * .035, spark.position.y - spark.velocity.y * .035, spark.position.z - spark.velocity.z * .035);
        }
        positions.needsUpdate = true; particle.mesh.material.opacity = 1 - age;
      } else if (particle.type === 'wave') {
        particle.mesh.scale.setScalar(2 + age * 38); particle.mesh.material.uniforms.opacity.value = (1 - age) * .025;
      } else {
        particle.mesh.position.addScaledVector(particle.vel, dt);
        if (particle.type === 'debris') {
          particle.mesh.rotation.x += particle.spin.x * dt; particle.mesh.rotation.y += particle.spin.y * dt; particle.mesh.rotation.z += particle.spin.z * dt;
        } else {
          const size = THREE.MathUtils.lerp(particle.startSize, particle.endSize, Math.sqrt(age)); particle.mesh.scale.setScalar(size);
          particle.mesh.material.rotation += particle.spin * dt;
          particle.mesh.material.opacity = particle.type === 'smoke' ? Math.sin(Math.PI * age) * .6 : Math.pow(1 - age, 1.6);
        }
      }
    }
  }
  remove(index) {
    const particle = this.items[index]; this.scene.remove(particle.mesh); this.items.splice(index, 1);
    if (particle.poolKey) this.spritePools.get(particle.poolKey).push(particle.mesh);
    else if (particle.type === 'sparks') this.sparkPools.push(particle.batch);
    else if (particle.type === 'wave') { this.waveMaterials.delete(particle.mesh.material); particle.mesh.material.dispose(); }
  }
  clear() { while (this.items.length) this.remove(this.items.length - 1); for (const flash of this.flashes) { flash.life = 0; flash.light.intensity = 0; } }
  dispose() {
    if (this.disposed) return; this.clear(); this.disposed = true;
    for (const flash of this.flashes) this.scene.remove(flash.light);
    this.sparkGeometry.dispose(); this.ringGeometry.dispose();
    for (const material of Object.values(this.materials)) material.dispose();
    for (const material of this.spriteMaterials) material.dispose();
    for (const batch of this.sparkBatches) { batch.mesh.geometry.dispose(); batch.mesh.material.dispose(); }
    for (const texture of Object.values(this.textures)) texture.dispose();
    this.spritePools.clear(); this.spriteMaterials.clear(); this.sparkPools.length = 0; this.sparkBatches.clear();
  }
}

export function makePulse(enemy = false) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(enemy ? .25 : .32, 10, 6), new THREE.MeshBasicMaterial({ color: enemy ? 0xffefd3 : 0xf0f5ff, toneMapped: false }));
  core.scale.set(.5, .5, 4); g.add(core);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(enemy ? .6 : .8, 10, 6), new THREE.MeshBasicMaterial({ color: enemy ? 0xff8b38 : 0xa777ef, transparent: true, opacity: .15, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  shell.scale.set(.65, .65, 3.2); g.add(shell);
  return g;
}

export class FlightStreaks {
  constructor(scene) {
    this.positions = new Float32Array(90 * 6); this.dust = [];
    for (let i = 0; i < 90; i++) this.dust.push(new THREE.Vector3((Math.random() * 2 - 1) * 100, (Math.random() * 2 - 1) * 70, -Math.random() * 350));
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xc2b4f3, transparent: true, opacity: .15, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.lines.frustumCulled = false; scene.add(this.lines);
  }
  update(dt, player) {
    this.lines.position.copy(player.position); this.lines.quaternion.copy(player.orientation);
    this.lines.material.opacity = player.boosting ? .45 : .14;
    const length = player.boosting ? 7 : .6;
    this.dust.forEach((p, i) => {
      p.z += player.speed * dt;
      if (p.z > 15) { p.z = -300 - Math.random() * 80; p.x = (Math.random() * 2 - 1) * 100; p.y = (Math.random() * 2 - 1) * 70; }
      this.positions.set([p.x, p.y, p.z, p.x, p.y, p.z + length], i * 6);
    });
    this.lines.geometry.attributes.position.needsUpdate = true;
  }
}
