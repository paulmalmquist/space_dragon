import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Meshes/instancedMesh';
import { Vector3, Quaternion, Color4 } from '@babylonjs/core/Maths/math';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import '@babylonjs/core/Particles/particleSystemComponent';
import type { Scene } from '@babylonjs/core/scene';
import { glowMaterial, softDotTexture, spriteMaterial } from '../world/kit';
import { HERO_EVENT } from '../traversal/hero';
import type { HeroState } from '../traversal/hero';
import type { TraversalWorld } from '../traversal/world';

export interface EffectsFrame {
  hero: HeroState;
  x: number; y: number; z: number;
  events: number;
  hand: Vector3;
  anchor: { x: number; y: number; z: number } | null;
  /** Anchor a tether would take now; shown as a brighter ring. */
  candidateId: string | null;
  /** Height of the surface under the hero, for the ground glow. */
  floor: number;
  collected: readonly string[];
}

/** Tether line, anchor rings, practice sparks, ground glow and particles. Presentation only. */
export function createHeroEffects(scene: Scene, world: TraversalWorld) {
  const dot = softDotTexture(scene, 'hero.soft-dot');
  const goldDot = softDotTexture(scene, 'hero.gold-dot', [255, 214, 130]);
  const suitDot = softDotTexture(scene, 'hero.suit-dot', [110, 232, 242]);
  const up = Vector3.Up();
  const direction = new Vector3();
  const rotation = new Quaternion();

  // Tether: a bright core inside a soft additive sheath.
  const core = MeshBuilder.CreateCylinder('hero.tether-core', { height: 1, diameter: 0.035, tessellation: 6 }, scene);
  core.material = glowMaterial(scene, 'hero.tether-core', '#d8fbff', 2.2, { fog: false });
  const sheath = MeshBuilder.CreateCylinder('hero.tether-sheath', { height: 1, diameter: 0.14, tessellation: 8 }, scene);
  sheath.material = glowMaterial(scene, 'hero.tether-sheath', '#4fd8f5', 0.9, { fog: false, alpha: 0.32, additive: true });
  for (const mesh of [core, sheath]) { mesh.isPickable = false; mesh.rotationQuaternion = new Quaternion(); mesh.setEnabled(false); }
  let tetherGrow = 0;

  // Anchor rings: cyan for swings, gold double ring for perches that set the hero down.
  const ringMaterial = glowMaterial(scene, 'hero.anchor-ring', '#63d9ff', 1.1, { fog: false });
  const perchMaterial = glowMaterial(scene, 'hero.perch-ring', '#ffd27a', 1.15, { fog: false });
  const ring = MeshBuilder.CreateTorus('hero.anchor-ring', { diameter: 0.62, thickness: 0.05, tessellation: 20 }, scene);
  ring.material = ringMaterial; ring.isPickable = false; ring.setEnabled(false);
  const perch = MeshBuilder.CreateTorus('hero.perch-ring', { diameter: 0.86, thickness: 0.05, tessellation: 20 }, scene);
  perch.material = perchMaterial; perch.isPickable = false; perch.setEnabled(false);
  const rings = world.anchors.map(anchor => {
    const instance = (anchor.perch ? perch : ring).createInstance(`hero.ring.${anchor.id}`);
    instance.position.set(anchor.x, anchor.y, anchor.z);
    instance.isPickable = false;
    const inner = anchor.perch ? ring.createInstance(`hero.ring-inner.${anchor.id}`) : null;
    if (inner) { inner.position.copyFrom(instance.position); inner.scaling.setAll(0.7); inner.isPickable = false; }
    return { anchor, instance, inner };
  });
  const reticle = MeshBuilder.CreateTorus('hero.anchor-reticle', { diameter: 1.25, thickness: 0.07, tessellation: 28 }, scene);
  reticle.material = glowMaterial(scene, 'hero.anchor-reticle', '#eaffff', 1.8, { fog: false });
  reticle.isPickable = false; reticle.setEnabled(false);

  // Practice sparks: a turning diamond inside a soft halo.
  const sparkMaterial = glowMaterial(scene, 'hero.spark', '#ffe9a8', 1.7, { fog: false });
  const sparkSource = MeshBuilder.CreatePolyhedron('hero.spark', { type: 1, size: 0.19 }, scene);
  sparkSource.material = sparkMaterial; sparkSource.isPickable = false; sparkSource.setEnabled(false);
  const haloMaterial = spriteMaterial(scene, 'hero.spark-halo', goldDot, 0.55);
  const haloSource = MeshBuilder.CreatePlane('hero.spark-halo', { size: 1.9 }, scene);
  haloSource.material = haloMaterial; haloSource.isPickable = false; haloSource.billboardMode = Mesh.BILLBOARDMODE_ALL; haloSource.setEnabled(false);
  const sparks = world.sparks.map((spot, index) => {
    const gem = sparkSource.createInstance(`hero.spark.${spot.id}`);
    gem.position.set(spot.x, spot.y, spot.z); gem.scaling.set(1, 1.45, 1); gem.isPickable = false;
    const halo = haloSource.createInstance(`hero.spark-halo.${spot.id}`);
    halo.position.copyFrom(gem.position); halo.billboardMode = Mesh.BILLBOARDMODE_ALL; halo.isPickable = false;
    return { spot, gem, halo, phase: index * 0.7, shown: true };
  });

  // A pool of suit light on the ground doubles as a landing cue.
  const groundGlow = MeshBuilder.CreateDisc('hero.ground-glow', { radius: 1.5, tessellation: 24 }, scene);
  groundGlow.rotation.x = Math.PI / 2;
  const groundMaterial = spriteMaterial(scene, 'hero.ground-glow', suitDot, 0.3, true);
  groundMaterial.zOffset = -3;
  groundGlow.material = groundMaterial; groundGlow.isPickable = false; groundGlow.setEnabled(false);

  function particles(name: string, capacity: number, color: Color4, fade: Color4, size: [number, number], life: [number, number], gravity: number, power: [number, number], additive: boolean) {
    const system = new ParticleSystem(name, capacity, scene);
    system.particleTexture = dot;
    system.emitter = new Vector3();
    system.minEmitBox = new Vector3(-0.15, 0, -0.15); system.maxEmitBox = new Vector3(0.15, 0.1, 0.15);
    system.color1 = color; system.color2 = color; system.colorDead = fade;
    system.minSize = size[0]; system.maxSize = size[1];
    system.minLifeTime = life[0]; system.maxLifeTime = life[1];
    system.gravity = new Vector3(0, gravity, 0);
    system.direction1 = new Vector3(-1, 0.5, -1); system.direction2 = new Vector3(1, 1.4, 1);
    system.minEmitPower = power[0]; system.maxEmitPower = power[1];
    system.emitRate = 0; system.manualEmitCount = 0;
    system.blendMode = additive ? ParticleSystem.BLENDMODE_ADD : ParticleSystem.BLENDMODE_STANDARD;
    system.updateSpeed = 1 / 60;
    system.start();
    return system;
  }
  const dust = particles('hero.dust', 120, new Color4(0.2, 0.25, 0.3, 0.2), new Color4(0.16, 0.2, 0.25, 0), [0.14, 0.4], [0.3, 0.7], -0.6, [0.6, 1.9], false);
  const glitter = particles('hero.glitter', 160, new Color4(1, 0.86, 0.5, 0.9), new Color4(1, 0.6, 0.2, 0), [0.05, 0.14], [0.35, 0.9], -2.2, [1.4, 4.4], true);
  const flame = particles('hero.flame', 120, new Color4(0.45, 0.9, 1, 0.9), new Color4(0.15, 0.4, 1, 0), [0.08, 0.24], [0.14, 0.36], 1.5, [1, 2.6], true);
  flame.direction1 = new Vector3(-0.5, -2.4, -0.5); flame.direction2 = new Vector3(0.5, -1.2, 0.5);
  const emit = (system: ParticleSystem, x: number, y: number, z: number, count: number) => {
    (system.emitter as Vector3).set(x, y, z);
    system.manualEmitCount += count;
  };

  let enabled = false;
  let elapsed = 0;
  let known: string[] = [];
  function setEnabled(value: boolean) {
    enabled = value;
    for (const { instance, inner } of rings) { instance.setEnabled(value); inner?.setEnabled(value); }
    for (const spark of sparks) { spark.gem.setEnabled(value && spark.shown); spark.halo.setEnabled(value && spark.shown); }
    if (!value) { core.setEnabled(false); sheath.setEnabled(false); reticle.setEnabled(false); groundGlow.setEnabled(false); }
  }
  setEnabled(false);

  return {
    setEnabled,
    /** Show or hide the ring of an anchor whose support is hidden (the home roof while indoors). */
    setAnchorVisible(id: string, visible: boolean) {
      const entry = rings.find(candidate => candidate.anchor.id === id);
      if (entry) { entry.instance.setEnabled(enabled && visible); entry.inner?.setEnabled(enabled && visible); }
    },
    update(frame: EffectsFrame, dt: number, reducedMotion: boolean) {
      if (!enabled) return;
      elapsed += dt;
      const { hero, events } = frame;
      // Tether line from hand to anchor, drawn out quickly on attach.
      if (events & HERO_EVENT.attach) tetherGrow = 0;
      if (frame.anchor) {
        tetherGrow = Math.min(1, tetherGrow + dt * 9);
        direction.set(frame.anchor.x - frame.hand.x, frame.anchor.y - frame.hand.y, frame.anchor.z - frame.hand.z);
        const length = direction.length() * tetherGrow;
        if (length > 0.01) {
          direction.normalize();
          Quaternion.FromUnitVectorsToRef(up, direction, rotation);
          for (const mesh of [core, sheath]) {
            mesh.setEnabled(true);
            mesh.position.set(frame.hand.x + direction.x * length / 2, frame.hand.y + direction.y * length / 2, frame.hand.z + direction.z * length / 2);
            mesh.scaling.y = length;
            mesh.rotationQuaternion!.copyFrom(rotation);
          }
          sheath.scaling.x = sheath.scaling.z = reducedMotion ? 1 : 1 + Math.sin(elapsed * 24) * 0.18;
        }
      } else { core.setEnabled(false); sheath.setEnabled(false); }
      // Candidate anchor reticle.
      const candidate = frame.candidateId ? rings.find(entry => entry.anchor.id === frame.candidateId) : undefined;
      reticle.setEnabled(Boolean(candidate));
      if (candidate) {
        reticle.position.copyFrom(candidate.instance.position);
        reticle.scaling.setAll(reducedMotion ? 1 : 1 + Math.sin(elapsed * 7) * 0.12);
        reticle.rotation.y = reducedMotion ? 0 : elapsed * 1.8;
      }
      const breathe = reducedMotion ? 1 : 1 + Math.sin(elapsed * 2.4) * 0.06;
      for (const { instance } of rings) instance.scaling.setAll(breathe);
      // Sparks: hide collected ones; celebrate a new pickup once.
      for (const spark of sparks) {
        const collected = frame.collected.includes(spark.spot.id);
        if (collected && spark.shown) {
          spark.shown = false; spark.gem.setEnabled(false); spark.halo.setEnabled(false);
          if (known.length || frame.collected.length === 1) emit(glitter, spark.spot.x, spark.spot.y, spark.spot.z, reducedMotion ? 8 : 36);
        } else if (!collected && !spark.shown) { spark.shown = true; spark.gem.setEnabled(true); spark.halo.setEnabled(true); }
        if (spark.shown) {
          spark.gem.rotation.y = reducedMotion ? spark.phase : elapsed * 1.6 + spark.phase;
          spark.gem.position.y = spark.spot.y + (reducedMotion ? 0 : Math.sin(elapsed * 2 + spark.phase) * 0.12);
          spark.halo.scaling.setAll(reducedMotion ? 1 : 1 + Math.sin(elapsed * 3 + spark.phase) * 0.1);
        }
      }
      known = [...frame.collected];
      // Ground glow fades with height.
      const height = Math.max(0, frame.y - frame.floor);
      const strength = Math.max(0, 1 - height / 7);
      groundGlow.setEnabled(strength > 0.02 && hero.mode !== 'catch');
      groundGlow.position.set(frame.x, frame.floor + 0.04, frame.z);
      groundGlow.scaling.setAll(0.8 + height * 0.22);
      groundGlow.visibility = 0.25 + strength * 0.5;
      // Particles on moments that matter.
      const scale = reducedMotion ? 0.3 : 1;
      if (events & HERO_EVENT.land) emit(dust, frame.x, frame.y + 0.05, frame.z, Math.round(Math.min(26, 6 + hero.impact) * scale));
      if (events & HERO_EVENT.jump) emit(dust, frame.x, frame.y + 0.05, frame.z, Math.round(5 * scale));
      if (events & (HERO_EVENT.hop | HERO_EVENT.bounce)) emit(flame, frame.x, frame.y + 0.9, frame.z, Math.round(26 * scale));
      if (events & HERO_EVENT.attach && frame.anchor) emit(glitter, frame.anchor.x, frame.anchor.y, frame.anchor.z, Math.round(12 * scale));
      if (events & (HERO_EVENT.catch | HERO_EVENT.recover)) emit(glitter, frame.x, frame.y + 0.9, frame.z, Math.round(24 * scale));
      if (hero.mode === 'ground' && hero.powerHeld && !reducedMotion && Math.hypot(hero.vx, hero.vz) > 6.5 && Math.random() < dt * 14) emit(dust, frame.x, frame.y + 0.04, frame.z, 1);
    },
    snapshot: () => ({ tether: core.isEnabled(), reticle: reticle.isEnabled(), sparksShown: sparks.filter(spark => spark.shown).length, rings: rings.length }),
    dispose() { for (const system of [dust, glitter, flame]) system.dispose(); dot.dispose(); goldDot.dispose(); suitDot.dispose(); },
  };
}
export type HeroEffects = ReturnType<typeof createHeroEffects>;
