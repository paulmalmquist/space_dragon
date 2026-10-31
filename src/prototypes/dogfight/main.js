import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CONFIG } from './config.js';
import { createEnvironment } from './assets/environment.js';
import { prepareCombatMaterials } from './assets/surface-materials.js';
import { ACTIVE_DRAGON } from './assets/dragon-model.js';
import { createDragonInstance } from './assets/dragon-instance.js';
import { auditRenderer } from './assets/render-audit.js';
import { sceneSamplesForRenderer } from './assets/render-settings.js';
import { dragonCollisionRadius } from './systems/collision-shapes.js';
import { Effects } from './assets/effects.js';
import { Audio } from './assets/audio.js';
import { LockBreath } from './assets/lock-breath.js';
import { CrashEffects } from './assets/crash-effects.js';
import { DragonAnimation } from './animation/dragon.js';
import { Flight } from './systems/flight.js';
import { Aim, mouthPosition } from './systems/aim.js';
import { pointerStick } from './systems/pointer.js';
import { ChaseCamera } from './systems/camera.js';
import { EnemySquad } from './systems/enemies.js';
import { Combat } from './systems/combat.js';
import { BreathPower, BREATH_CONFIG, RESERVED_FLIGHT_CODES } from './systems/breath-power.js';
import { CrashSequence, sweepAsteroidImpact, evaluateImpact } from './systems/crash.js';
import { HUD } from './ui/hud.js';
import './style.css';

const $ = id => document.getElementById(id);
const assetBase = `${import.meta.env.BASE_URL}assets/dogfight/`;

// This lab owns only transient encounter state. It never writes campaign saves.
class DogfightLab {
  constructor() {
    this.keys = new Set(); this.state = 'loading'; this.ready = false; this.disposed = false;
    this.events = new AbortController(); this.frameId = 0; this.contextLost = false;
    this.mouse = { active: false, stick: { x: 0, y: 0 }, fire: false, zoom: false };
    this.zooming = false;
    this.mouseMode = 'flight';
    this.power = new BreathPower();
    this.crash = new CrashSequence(); this.crashOrigin = new THREE.Vector3();
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    $('reduce-motion').checked = this.reducedMotion;
    this.audio = new Audio();
    window.addEventListener('pagehide', event => {
      this.pause();
      if (!event.persisted) this.dispose();
    }, { signal: this.events.signal });
    window.addEventListener('pageshow', () => this.pause(), { signal: this.events.signal });
  }
  async initialize() {
    const startedAt = performance.now();
    const canvas = $('game');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, CONFIG.visuals.maxPixelRatio));
    this.renderer.setSize(innerWidth, innerHeight); this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = CONFIG.visuals.exposure;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Count the complete scene/shadow/postprocessing frame, rather than only
    // EffectComposer's final full-screen triangle.
    this.renderer.info.autoReset = false;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, innerWidth / innerHeight, .1, 35000);
    // Canvas MSAA does not cover EffectComposer's offscreen scene. Antialias
    // the HDR scene target before bloom and the single tone/output conversion.
    const sceneTarget = new THREE.WebGLRenderTarget(innerWidth, innerHeight, {
      type: THREE.HalfFloatType, samples: sceneSamplesForRenderer(this.renderer, CONFIG.visuals.sceneSamples),
    });
    this.composer = new EffectComposer(this.renderer, sceneTarget);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .34, .5, .85);
    // Audit found 3,845,184 bytes of unused depth storage at 1366x768.
    // Bloom only draws full-screen quads; retain depth on both scene targets.
    for (const target of [this.bloom.renderTargetBright, ...this.bloom.renderTargetsHorizontal, ...this.bloom.renderTargetsVertical]) {
      target.depthBuffer = false;
    }
    this.composer.addPass(this.bloom); this.composer.addPass(new OutputPass());
    const manager = new THREE.LoadingManager();
    const failedAssets = [];
    const assetsReady = new Promise(resolve => { manager.onLoad = resolve; });
    manager.onError = asset => failedAssets.push(asset);
    manager.onProgress = (_, loaded, total) => {
      $('loading-fill').style.width = `${loaded / total * 100}%`;
      $('loading-status').textContent = `Calibrating wings & signals… ${loaded} / ${total}`;
    };
    const textures = new THREE.TextureLoader(manager); this.environment = createEnvironment(this.scene, textures);
    const loader = new GLTFLoader(manager);
    const modelStartedAt = performance.now();
    const [dragonGLTF, droneGLTF] = await Promise.all([
      loader.loadAsync(`${assetBase}models/${ACTIVE_DRAGON.filename}`), loader.loadAsync(`${assetBase}models/drone.glb`)
    ]);
    await assetsReady;
    this.loadMetrics = { modelFetchAndParseMs: performance.now() - modelStartedAt };
    if (this.disposed) return;
    if (failedAssets.length) throw new Error(`Missing local assets: ${failedAssets.join(', ')}`);
    this.dragonInstance = createDragonInstance(dragonGLTF);
    this.modelInfo = this.dragonInstance.info;
    this.surfacePass = prepareCombatMaterials(this.renderer, this.scene, dragonGLTF.scene, droneGLTF.scene, { dragonKind: ACTIVE_DRAGON.kind });
    this.dragonRoot = this.dragonInstance.root; this.dragonVisual = this.dragonInstance.visual; this.dragon = this.dragonInstance.model;
    this.scene.add(this.dragonRoot);
    this.animation = new DragonAnimation(this.dragon, dragonGLTF.animations);
    this.mouthGlow = new THREE.Mesh(new THREE.SphereGeometry(.65, 20, 12), new THREE.MeshBasicMaterial({ color: 0xff6818, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.muzzleOffset = this.dragonInstance.localAttachment('mouth'); this.dragonInstance.attachments.mouth.add(this.mouthGlow);
    this.mouthLight = new THREE.PointLight(0xff7c24, 0, 16, 2); this.dragonInstance.attachments.mouth.add(this.mouthLight);
    this.flight = new Flight(); this.aim = new Aim(); this.chaseCamera = new ChaseCamera(this.camera);
    this.flight.muzzleOffset = this.muzzleOffset.clone(); this.flight.visualLift = 0;
    this.effects = new Effects(this.scene); this.squad = new EnemySquad(this.scene, droneGLTF.scene); this.hud = new HUD(this.squad);
    this.combat = new Combat(this.scene, this.effects, this.audio, this.squad,
      (_, disabled) => this.hud.hit(disabled), amount => this.damage(amount), drone => {
        this.hud.message(`${drone.name} DISABLED`);
        if (this.squad.alive.length === 0) this.finish('victory');
      });
    this.breathVisual = new LockBreath(this.scene);
    this.crashEffects = new CrashEffects(this.scene);
    this.bindInput(); this.reset('ready');
    $('loading-status').textContent = 'Warming up starlight…';
    const compileStartedAt = performance.now();
    // Prepare the instanced fire/debris shader variants during loading, before
    // the first attack or crash. These presentations cannot mutate combat.
    this.breathVisual.start({ id: 0, targetIds: [this.squad.drones[0].id], elapsed: 1,
      windupDuration: .65, beamDuration: 1.1, duration: 1.75 }, this.flight, this.squad);
    this.crashEffects.start({ position: this.flight.position, orientation: this.flight.orientation, velocity: this.flight.velocity });
    await this.renderer.compileAsync(this.scene, this.camera);
    this.breathVisual.clear(); this.crashEffects.clear();
    if (this.disposed) return;
    this.loadMetrics.compileMs = performance.now() - compileStartedAt;
    this.loadMetrics.readyMs = performance.now() - startedAt;
    this.ready = true; canvas.dataset.ready = 'true'; canvas.dataset.assetLoaded = 'true'; canvas.dataset.model = ACTIVE_DRAGON.id; $('loading').hidden = true;
    if (import.meta.env.DEV) Object.defineProperty(window, '__SPACE_DRAGON_DOGFIGHT__', {
      configurable: true, value: Object.freeze({ snapshot: () => this.snapshot(), rendererAudit: () => this.rendererAudit() })
    });
    let last = performance.now();
    const frame = now => {
      if (this.disposed) return;
      const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
      if (!this.contextLost) {
        this.renderer.info.reset(); this.update(dt); this.composer.render(); canvas.dataset.rendered = 'true';
      }
      this.frameId = requestAnimationFrame(frame);
    };
    this.frameId = requestAnimationFrame(frame);
    $('resume').focus({ preventScroll: true });
  }
  listen(target, event, callback) { target.addEventListener(event, callback, { signal: this.events.signal }); }
  bindInput() {
    this.listen(this.renderer.domElement, 'webglcontextlost', event => {
      event.preventDefault(); this.contextLost = true; this.pause();
      $('loading').hidden = false;
      $('loading-status').textContent = 'Restoring the flight display. The encounter is paused…';
    });
    this.listen(this.renderer.domElement, 'webglcontextrestored', () => {
      this.contextLost = false; if (this.ready) $('loading').hidden = true;
    });
    const codes = new Set(RESERVED_FLIGHT_CODES);
    this.listen(window, 'keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (!codes.has(event.code) && !/^Key[A-Z]$/.test(event.code)) return;
      // Preserve ordinary Enter/Space activation of focused buttons and links.
      if (['Enter', 'Space'].includes(event.code) && event.target.closest('button,a')) return;
      event.preventDefault();
      if (event.code === 'Escape') { if (!event.repeat) this.togglePause(); return; }
      if (event.code === 'Enter') { if (!event.repeat && ['ready', 'paused'].includes(this.state)) this.resume(); return; }
      if (event.code === 'KeyM') { if (!event.repeat) this.toggleMouseMode(); return; }
      if (this.state !== 'playing') return;
      if (event.code === 'F1') { if (!event.repeat) this.helpCharge(); return; }
      if (this.power.snapshot().phase === 'charging' && !codes.has(event.code)) {
        const result = this.power.pressLetter(event.code, { repeat: event.repeat });
        if (result.completed) this.hud.message('BREATH CHARGED · AIM AT A SHIP');
        else if (result.reason === 'wrong-letter') this.hud.message(`Try ${this.power.snapshot().expectedLetter}. Take your time.`);
        this.hud.update(0, this);
        return;
      }
      // Held controls already live in `keys`; auto-repeat must not resurrect
      // a key cleared by pause or a mouse-mode switch.
      if (event.repeat) return;
      if (event.code === 'Space') { if (!event.repeat) this.fireBreath(); return; }
      if (!codes.has(event.code)) return;
      if (event.code.startsWith('Arrow')) { this.mouse.active = false; this.mouse.stick = { x: 0, y: 0 }; }
      if (event.code === 'KeyQ' || event.code === 'KeyE') {
        if (!this.keys.has(event.code)) this.maneuver('roll', event.code === 'KeyQ' ? -1 : 1);
      }
      if (event.code === 'KeyB' && !this.keys.has(event.code)) {
        const direction = this.keys.has('ArrowRight') ? 1 : this.keys.has('ArrowLeft') ? -1 :
          this.mouseMode === 'flight' && this.mouse.active && Math.abs(this.mouse.stick.x) > .1 ? Math.sign(this.mouse.stick.x) : undefined;
        this.maneuver('break', direction);
      }
      if (event.code === 'KeyX' && !event.repeat) this.aim.reset();
      this.keys.add(event.code);
    });
    this.listen(window, 'keyup', event => { this.keys.delete(event.code); });
    const canvas = this.renderer.domElement;
    const pointMouse = event => {
      this.aim.setPointer(event.clientX, event.clientY, innerWidth, innerHeight);
      this.aim.update(0, new Set(), this.camera, this.flight);
      if (this.mouseMode === 'aim') {
        this.mouse.active = false; this.mouse.stick = { x: 0, y: 0 };
        return;
      }
      this.mouse.stick = pointerStick(event.clientX, event.clientY, innerWidth, innerHeight);
      this.mouse.active = true;
      $('flight-cursor').style.left = `${event.clientX}px`;
      $('flight-cursor').style.top = `${event.clientY}px`;
    };
    this.listen(canvas, 'pointermove', event => {
      if (this.state === 'playing' && event.pointerType === 'mouse') pointMouse(event);
    });
    this.listen(canvas, 'pointerdown', event => {
      if (this.state !== 'playing' || event.pointerType !== 'mouse' || ![0, 2].includes(event.button)) return;
      canvas.focus({ preventScroll: true }); pointMouse(event);
      this.pointerId = event.pointerId; canvas.setPointerCapture(event.pointerId);
    });
    // Mouse chords emit mousedown for each button, but pointerdown only for the
    // first. Track buttons here so firing and zooming can be held together.
    this.listen(canvas, 'mousedown', event => {
      if (this.state !== 'playing' || ![0, 2].includes(event.button)) return;
      event.preventDefault(); canvas.focus({ preventScroll: true }); pointMouse(event);
      if (event.button === 0) this.mouse.fire = true;
      if (event.button === 2) this.mouse.zoom = this.zooming = true;
    });
    const releaseMouseButton = event => {
      if (event.button === 0) this.mouse.fire = false;
      if (event.button === 2) this.mouse.zoom = this.zooming = false;
      if (!this.mouse.fire && !this.mouse.zoom && event.pointerId !== undefined && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    this.listen(window, 'pointerup', releaseMouseButton);
    this.listen(window, 'mouseup', releaseMouseButton);
    this.listen(canvas, 'pointercancel', () => this.clearMouse());
    this.listen(canvas, 'lostpointercapture', () => this.clearMouse());
    this.listen(canvas, 'pointerleave', event => { if (!canvas.hasPointerCapture(event.pointerId)) this.clearMouse(); });
    this.listen(canvas, 'contextmenu', event => event.preventDefault());
    this.listen(window, 'blur', () => this.pause());
    this.listen(document, 'visibilitychange', () => { if (document.hidden) this.pause(); });
    this.listen($('pause-button'), 'click', () => this.togglePause());
    this.listen($('resume'), 'click', () => this.resume());
    this.listen($('restart'), 'click', () => { this.reset('playing'); this.audio.unlock(); $('game').focus({ preventScroll: true }); });
    this.listen($('mouse-mode'), 'click', () => this.toggleMouseMode());
    this.listen($('charge-help'), 'click', () => this.helpCharge());
    this.listen($('sound'), 'click', () => {
      this.audio.setMuted(!this.audio.muted); this.audio.unlock(); this.syncSettings();
      this.breathAudioStage = null;
      if (this.state === 'playing') $('game').focus({ preventScroll: true });
    });
    this.listen($('reduce-motion'), 'change', () => {
      this.reducedMotion = $('reduce-motion').checked; this.syncSettings();
      if (this.state === 'playing') $('game').focus({ preventScroll: true });
    });
    this.listen(window, 'resize', () => {
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, CONFIG.visuals.maxPixelRatio));
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.renderer.setSize(innerWidth, innerHeight); this.composer.setSize(innerWidth, innerHeight);
      this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
      this.aim.update(0, this.keys, this.camera, this.flight); this.hud.update(0, this);
    });
    this.syncSettings();
  }
  syncSettings() {
    $('sound').textContent = this.audio.muted ? 'Sound off' : 'Sound on';
    $('sound').setAttribute('aria-pressed', String(!this.audio.muted));
    document.body.classList.toggle('less-motion', this.reducedMotion);
    $('mouse-mode').textContent = this.mouseMode === 'flight' ? 'Mouse: fly + aim · M' : 'Mouse: aim only · M';
    $('mouse-mode').setAttribute('aria-pressed', String(this.mouseMode === 'aim'));
    document.body.dataset.mouseMode = this.mouseMode;
  }
  toggleMouseMode() {
    this.keys.clear(); this.clearMouse(); this.mouseMode = this.mouseMode === 'flight' ? 'aim' : 'flight';
    this.syncSettings();
    if (this.ready) this.hud.update(0, this);
    if (this.state === 'playing') $('game').focus({ preventScroll: true });
  }
  helpCharge() {
    if (this.state !== 'playing' || !this.power.assist()) return;
    this.hud.message('CHARGED TOGETHER · AIM AT A SHIP');
    this.hud.update(0, this); $('game').focus({ preventScroll: true });
  }
  maneuver(type, direction) {
    const accepted = type === 'roll' ? this.flight.requestRoll(direction) : this.flight.requestBreak(direction);
    if (accepted) {
      if (type === 'roll') this.squad.breakLocks();
      if (type === 'roll') this.audio.roll(direction);
      else this.audio.breakTurn(direction);
      this.hud.message(type === 'roll' ? 'LOCKS BROKEN · KEEP MOVING' : 'BREAK TURN · CHANGE YOUR FLIGHT PATH');
    } else {
      this.hud.message(this.flight.lastManeuverResult?.reason === 'energy' ? 'EVASION ENERGY LOW · RECHARGING' : 'MANEUVER NOT READY');
    }
    this.updateThreat(); this.hud.update(0, this);
  }
  updateThreat() {
    this.threat = { ...this.squad.threatSnapshot(this.flight), incoming: this.combat.incoming };
    const level = this.threat.firing ? 3 : this.threat.locked ? 2 : this.threat.tracking ? 1 : 0;
    if (this.state === 'playing' && level > this.lastThreatLevel) this.audio.warning(['', 'tracking', 'locked', 'incoming'][level]);
    this.lastThreatLevel = level;
  }
  fireBreath() {
    this.power.update(0, this.lockCandidates());
    const fired = this.power.requestFire();
    if (!fired.fired) {
      this.hud.message(fired.reason === 'burst-active' ? 'LOCK BREATH ALREADY FIRING' : this.power.snapshot().phase === 'charging' ? 'FINISH THE POWER WORD FIRST' : 'HOLD THE RETICLE OVER A SHIP TO LOCK');
      return;
    }
    this.keys.delete('Space'); this.fireGlow = .2;
    this.breathVisual.start(fired.burst, this.flight, this.squad);
    this.breathAudioStage = null; this.syncBreathAudio(fired.burst);
    this.hud.message('REACTOR WIND-UP · KEEP DODGING');
  }
  syncBreathAudio(burst) {
    const signature = burst ? `${burst.id}:${burst.stage}` : null;
    if (signature === this.breathAudioStage) return;
    this.audio.stopBreath(); this.breathAudioStage = signature;
    if (burst?.stage === 'windup') this.audio.roar();
    else if (burst?.stage === 'beam') { this.audio.breath(); this.hud.message('FIRE BEAM · TARGET TRACKING'); }
  }
  lockCandidates() {
    return this.squad.drones.map(drone => {
      const projected = drone.position.clone().project(this.camera);
      const local = drone.position.clone().sub(this.camera.position).applyQuaternion(this.camera.quaternion.clone().invert());
      const distance = drone.position.distanceTo(this.flight.position);
      return { id: drone.id, dead: drone.dead, distance, eligible: !drone.dead && local.z < 0 && Math.abs(projected.x) < .95 && Math.abs(projected.y) < .95 && distance <= BREATH_CONFIG.range,
        error: Math.hypot(projected.x - this.aim.x, projected.y - this.aim.y) };
    });
  }
  clearMouse() {
    this.mouse.active = false; this.mouse.stick = { x: 0, y: 0 }; this.mouse.fire = false; this.mouse.zoom = false; this.zooming = false;
    const canvas = this.renderer?.domElement;
    document.body.dataset.zooming = 'false';
    if (canvas) canvas.dataset.firing = 'false';
    $('flight-cursor').hidden = true;
    if (canvas && this.pointerId !== undefined && canvas.hasPointerCapture(this.pointerId)) canvas.releasePointerCapture(this.pointerId);
    this.pointerId = undefined;
  }
  reset(state = 'playing') {
    this.audio.clearTones();
    this.clearMouse();
    this.keys.clear(); this.state = state; this.elapsed = 0; this.energy = CONFIG.dragon.wingEnergy;
    this.invulnerability = 0; this.fireGlow = 0; this.lastThreatLevel = 0; this.acceleration = 0;
    this.rockGuard = 0; this.rockGuardId = null; this.rockContacts = 0; this.lastImpact = null; this.asteroidWarning = null; this.pausedState = null; this.breathAudioStage = null;
    this.crash.reset(); this.crashEffects.clear(); this.dragonRoot.visible = true;
    this.power.reset(); this.breathVisual.clear(); this.flight.reset(); this.aim.reset(); this.squad.reset(); this.combat.reset(); this.effects.clear(); this.animation.reset(); this.hud.reset();
    this.updateThreat();
    this.dragonRoot.position.copy(this.flight.position); this.dragonRoot.quaternion.copy(this.flight.orientation);
    this.dragonVisual.rotation.set(0, 0, 0); this.dragonVisual.position.set(0, 0, 0);
    this.animation.update(0, 0, false, false, 0); this.flight.visualLift = 0; this.mouthGlow.material.opacity = 0; this.mouthLight.intensity = 0;
    this.dragonInstance.sync(this.flight);
    this.chaseCamera.update(1, this.flight, true); this.aim.update(0, this.keys, this.camera, this.flight);
    this.environment.asteroids?.reset(); this.environment.update(this.flight.position); this.hud.showOverlay(state); this.hud.update(0, this);
    document.body.dataset.state = state;
  }
  pause() {
    this.keys.clear();
    this.clearMouse();
    this.audio.clearTones();
    this.breathAudioStage = null;
    if (['playing', 'crashing'].includes(this.state)) { this.pausedState = this.state; this.state = 'paused'; this.hud.showOverlay(this.state); }
    this.audio.update(this.flight?.speed || 0, false, true);
    document.body.dataset.state = this.state;
  }
  resume() {
    if (!this.ready || this.contextLost || !['paused', 'ready'].includes(this.state)) return;
    this.keys.clear(); this.state = this.pausedState || 'playing'; this.pausedState = null;
    this.hud.showOverlay(this.state); document.body.dataset.state = this.state;
    this.clearMouse();
    this.audio.unlock(); this.audio.update(this.flight.speed, false, this.state !== 'playing');
    $('game').focus({ preventScroll: true });
  }
  togglePause() {
    if (['playing', 'crashing'].includes(this.state)) { this.pause(); $('resume').focus({ preventScroll: true }); }
    else this.resume();
  }
  damage(amount) {
    if (this.state !== 'playing' || this.invulnerability > 0) return false;
    this.energy = Math.max(0, this.energy - amount); this.invulnerability = CONFIG.dragon.invulnerability;
    this.hud.hurt(); this.audio.hurt();
    if (!this.energy) this.beginCrash('hull');
    return true;
  }
  collideAsteroids(previousPosition) {
    const colliders = this.environment.asteroids?.colliders || [];
    this.asteroidWarning = null;
    for (const rock of colliders) {
      const relative = rock.center.clone().sub(this.flight.position), ahead = relative.dot(this.flight.forward);
      const lateral = Math.sqrt(Math.max(0, relative.lengthSq() - ahead * ahead));
      const clearance = ahead - rock.radius - dragonCollisionRadius();
      if (ahead > 0 && lateral < rock.radius + 12 && clearance < this.flight.speed * 2.2 &&
        (!this.asteroidWarning || clearance < this.asteroidWarning.clearance)) this.asteroidWarning = { id: rock.id, clearance: Math.max(0, clearance) };
    }
    const impact = sweepAsteroidImpact(previousPosition, this.flight.position,
      colliders.filter(rock => !(this.rockGuard > 0 && rock.id === this.rockGuardId)));
    if (!impact) return;
    const result = evaluateImpact(this.flight.velocity, impact.normal, this.energy);
    this.rockGuard = .8; this.rockGuardId = impact.id; this.rockContacts++;
    this.lastImpact = { colliderId: impact.id, speed: result.speed, normalSpeed: result.normalSpeed, damage: result.damage, fatal: result.fatal };
    // The conservative solid core is inside an irregular visible rock. Resolve
    // the hull outside its outer bound so neither a graze nor the crash camera
    // becomes buried in the rendered surface.
    const surfaceRadius = Math.max(impact.radius, colliders.find(rock => rock.id === impact.id)?.surfaceRadius ?? impact.radius);
    const contact = impact.center.clone().addScaledVector(impact.normal, surfaceRadius);
    this.flight.position.copy(contact).addScaledVector(impact.normal, dragonCollisionRadius() + 1.5);
    this.energy = Math.max(0, this.energy - result.damage); this.hud.hurt();
    if (result.fatal) {
      const wreckVelocity = this.flight.velocity.clone().reflect(impact.normal).multiplyScalar(.35);
      this.flight.rollOffset.set(0, 0, 0);
      this.beginCrash('asteroid', contact, impact.id, wreckVelocity); return;
    }
    this.effects.burst(contact, 'amber', false); this.audio.hurt();
    this.flight.velocity.copy(result.deflectedVelocity); this.flight.cruiseVelocity.copy(result.deflectedVelocity);
    this.flight.speed = Math.max(CONFIG.flight.minSpeed, result.deflectedVelocity.length());
    this.flight.orientation.setFromUnitVectors(new THREE.Vector3(0, 0, -1), result.deflectedVelocity.clone().normalize());
    this.flight.forward.set(0, 0, -1).applyQuaternion(this.flight.orientation); this.flight.up.set(0, 1, 0).applyQuaternion(this.flight.orientation);
    this.flight.rollOffset.set(0, 0, 0); this.flight.rollActive = false; this.flight.rollAngle = 0;
    this.hud.message('ARMOR GRAZE · HULL DAMAGED · PULL CLEAR');
  }
  beginCrash(cause, contactPoint = this.flight.position, colliderId = null, wreckVelocity = this.flight.velocity) {
    if (this.state !== 'playing' || !this.crash.begin({ cause, point: contactPoint, velocity: wreckVelocity, reducedMotion: this.reducedMotion, colliderId })) return;
    this.state = 'crashing'; this.energy = 0; this.keys.clear(); this.clearMouse(); this.flight.boosting = false;
    this.power.cancelBurst(); this.breathVisual.clear(); this.breathAudioStage = null;
    this.fireGlow = 0; this.mouthGlow.material.opacity = 0; this.mouthLight.intensity = 0;
    this.crashOrigin.copy(this.flight.position);
    this.crashEffects.start({ position: this.flight.position, orientation: this.flight.orientation, velocity: wreckVelocity, reducedMotion: this.reducedMotion });
    if (cause === 'asteroid') {
      this.chaseCamera.update(1, this.flight, true);
      if (this.reducedMotion) { this.camera.fov = CONFIG.camera.fov; this.camera.updateProjectionMatrix(); }
    }
    this.audio.update(0, false, true); this.audio.crash();
    this.hud.message(cause === 'asteroid' ? 'IMPACT · ARMOR RUPTURE' : 'HULL BREACH · REACTOR FAILURE');
    this.hud.showOverlay('crashing'); document.body.dataset.state = this.state;
  }
  finish(state) {
    if (this.state !== 'playing' && !(this.state === 'crashing' && state === 'recovery')) return;
    this.state = state; this.keys.clear(); this.clearMouse(); document.body.dataset.state = state;
    this.power.cancelBurst(); this.breathVisual.clear();
    this.hud.showOverlay(state, { elapsed: this.elapsed, disabled: CONFIG.enemy.count - this.squad.alive.length, accuracy: this.combat.shots ? Math.min(100, Math.round(this.combat.hits / this.combat.shots * 100)) : 0 });
    this.syncBreathAudio(null); this.audio.update(0, false, true);
    if (state === 'victory') this.audio.victory();
    $('restart').focus({ preventScroll: true });
  }
  update(dt) {
    const phaseBefore = this.power.snapshot().phase;
    if (this.state === 'playing') {
      this.elapsed += dt; this.invulnerability = Math.max(0, this.invulnerability - dt); this.rockGuard = Math.max(0, this.rockGuard - dt);
      const previousSpeed = this.flight.speed;
      const previousPosition = this.flight.position.clone();
      this.flight.update(dt, this.keys, this.mouseMode === 'flight' && this.mouse.active ? this.mouse.stick : { x: 0, y: 0 });
      this.acceleration = dt > 0 ? (this.flight.speed - previousSpeed) / dt : 0;
      this.environment.update(this.flight.position);
      this.collideAsteroids(previousPosition);
    }
    if (this.state === 'playing') {
      // Resolve the current visual pose before aim/projectile origins. The
      // authored upper muzzle follows the same bank, roll and body lift.
      this.animation.update(this.elapsed, this.flight.bank, this.flight.boosting, this.mouse.fire, this.flight.yawRate, this.power.snapshot().burst);
      this.flight.visualLift = this.reducedMotion ? 0 : this.animation.motionState.bodyLift;
      this.dragonInstance.sync(this.flight);
      this.chaseCamera.update(dt, this.flight, false, this.zooming);
      if (this.reducedMotion) { this.camera.fov = this.zooming ? CONFIG.camera.zoomFov : CONFIG.camera.fov; this.camera.updateProjectionMatrix(); }
      this.aim.update(dt, this.keys, this.camera, this.flight);
      this.squad.update(dt, this.flight, this.elapsed, (position, direction) => this.combat.spawn(position, direction, CONFIG.enemy.projectileSpeed, true));
      if (phaseBefore !== 'burst' && this.mouse.fire && this.combat.fire(this.flight, this.aim.direction)) this.fireGlow = 1;
      this.combat.update(dt, this.flight); this.effects.update(dt);
      // A fatal ordinary projectile may have started a crash above. Its
      // cancelled windup/beam cannot deal a same-frame posthumous hit.
      const outcome = this.state === 'playing' ? this.power.update(dt, this.lockCandidates()) : { impacts: [] };
      for (const impact of outcome.impacts) this.combat.strikeLocked(impact.targetIds, impact.burstId);
      const power = this.power.snapshot();
      this.syncBreathAudio(power.burst);
      this.breathVisual.update(power.burst, this.flight, this.squad, this.reducedMotion);
      if (!power.burst) this.breathVisual.clear();
      this.fireGlow = power.burst?.stage === 'windup' ? .2 + power.burst.progress * .8 : power.phase === 'burst' ? 1 : Math.max(0, this.fireGlow - dt * 4);
      this.mouthGlow.material.opacity = this.fireGlow * .9; this.mouthGlow.scale.setScalar(.8 + this.fireGlow * .8); this.mouthLight.intensity = this.fireGlow * 14;
      this.environment.update(this.flight.position);
      this.updateThreat();
    }
    if (this.state === 'crashing') {
      const outcome = this.crash.update(dt), crash = this.crash.snapshot();
      this.crashEffects.update(dt, crash); this.effects.update(dt);
      this.flight.position.copy(this.crashOrigin).add(new THREE.Vector3(...crash.pose.offset));
      this.dragonRoot.position.copy(this.flight.position); this.dragonRoot.quaternion.copy(this.flight.orientation);
      this.dragonRoot.visible = crash.pose.modelVisible;
      this.dragonVisual.position.set(0, 0, 0); this.dragonVisual.rotation.set(crash.pose.pitch, 0, crash.pose.roll);
      if (!crash.reducedMotion) this.chaseCamera.update(dt, this.flight);
      this.environment.update(this.flight.position);
      if (outcome.recovery) this.finish('recovery');
    }
    this.audio.update(this.flight.speed, this.flight.boosting, this.state !== 'playing', {
      turn: this.flight.yawRate, acceleration: this.state === 'playing' ? this.acceleration : 0,
    });
    this.hud.update(['playing', 'crashing'].includes(this.state) ? dt : 0, this);
  }
  snapshot() {
    return {
      state: this.state, elapsed: this.elapsed, energy: this.energy, keys: [...this.keys],
      position: this.flight.position.toArray(), forward: this.flight.forward.toArray(), bank: this.flight.bank,
      orientation: this.flight.orientation.toArray(), velocity: this.flight.velocity.toArray(),
      turnRates: { yaw: this.flight.yawRate, pitch: this.flight.pitchRate },
      aim: { x: this.aim.x, y: this.aim.y, direction: this.aim.direction.toArray(), point: this.aim.point.toArray() },
      rollAngle: this.flight.rollAngle, rollActive: this.flight.rollActive, rollsCompleted: this.flight.rollsCompleted,
      rollCooldown: this.flight.rollCooldown, speed: this.flight.speed, boost: this.flight.boost, shots: this.combat.shots,
      evasionEnergy: this.flight.evasionEnergy, evasionMax: this.flight.evasionMax,
      rollsStarted: this.flight.rollsStarted, breakActive: this.flight.breakActive,
      breaksStarted: this.flight.breaksStarted, breaksCompleted: this.flight.breaksCompleted,
      lastManeuverResult: this.flight.lastManeuverResult ? { ...this.flight.lastManeuverResult } : null,
      threat: this.threat, enemyHits: this.combat.enemyHits,
      lastShotDirection: this.combat.lastShotDirection?.toArray() || null,
      alive: this.squad.alive.length, health: this.squad.drones.map(drone => drone.health),
      reducedMotion: this.reducedMotion, soundEnabled: !this.audio.muted,
      mouse: { active: this.mouse.active, stick: { ...this.mouse.stick }, fire: this.mouse.fire, zoom: this.mouse.zoom },
      zooming: this.zooming, cameraFov: this.camera.fov, mouseMode: this.mouseMode,
      flightAcceleration: this.acceleration,
      power: this.power.snapshot(), spellHeld: false,
      enemyShots: this.combat.enemyShots, targetPositions: this.squad.drones.map(drone => drone.position.toArray()),
      breathShots: this.combat.breathShots, breathHits: this.combat.breathHits,
      wingMotion: { ...this.animation.motionState },
      animation: this.animation.snapshot?.() || { mode: 'procedural-fallback' },
      assetContract: this.dragonInstance.snapshot(),
      model: { ...this.modelInfo, muzzle: [...this.modelInfo.muzzle] },
      muzzle: { world: mouthPosition(this.flight).toArray(),
        visualWorld: this.mouthGlow.getWorldPosition(new THREE.Vector3()).toArray(),
        alignmentError: mouthPosition(this.flight).distanceTo(this.mouthGlow.getWorldPosition(new THREE.Vector3())) },
      loading: { ...this.loadMetrics },
      articulation: Object.fromEntries(Object.entries(this.animation.bones).map(([name, { bone }]) => [name, bone.quaternion.toArray()])),
      surfaces: { ...this.surfacePass.report },
      effects: { active: this.effects.items.length },
      asteroids: this.environment.asteroids?.snapshot() || null,
      collision: { contacts: this.rockContacts, lastImpact: this.lastImpact ? { ...this.lastImpact } : null },
      asteroidWarning: this.asteroidWarning ? { ...this.asteroidWarning } : null,
      crash: this.crash.snapshot(), crashEffects: this.crashEffects.snapshot(),
      breathVisual: { active: this.breathVisual.root.visible, stage: this.power.snapshot().burst?.stage || null,
        paths: this.breathVisual.paths.map(path => ({ id: path.id, beamVisible: path.shell.visible, tip: path.tip.position.toArray() })) },
      radar: (this.hud.radarSnapshot || []).map(contact => ({ ...contact })),
      audio: this.audio.snapshot(),
      renderer: { ...this.renderer.info.render }, rendererMemory: { ...this.renderer.info.memory }, ready: this.ready
    };
  }
  rendererAudit() {
    return auditRenderer({ renderer: this.renderer, scene: this.scene, camera: this.camera,
      composer: this.composer, assetRoot: this.dragon,
      extraRenderTargets: this.surfacePass?.reflectionTarget ? [this.surfacePass.reflectionTarget] : [] });
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.keys.clear(); this.clearMouse(); cancelAnimationFrame(this.frameId); this.events.abort(); this.audio.dispose();
    this.animation?.dispose?.(); this.breathVisual?.dispose(); this.crashEffects?.dispose(); this.combat?.reset(); this.effects?.dispose();
    // The field owns shared LOD/instancing resources. Remove/dispose it before
    // the generic traversal so those buffers and textures are released once.
    this.environment?.dispose?.();
    const geometries = new Set(), materials = new Set(), textures = new Set(), skeletons = new Set();
    this.scene?.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.skeleton) skeletons.add(object.skeleton);
      for (const material of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []) {
        materials.add(material); for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
    if (this.scene?.background?.isTexture) textures.add(this.scene.background);
    for (const texture of textures) if (!this.surfacePass?.ownedTextures.has(texture)) texture.dispose();
    for (const material of materials) if (!this.surfacePass?.ownedMaterials.has(material)) material.dispose();
    for (const geometry of geometries) geometry.dispose();
    // Shared glTF skins own GPU bone textures outside material texture slots.
    for (const skeleton of skeletons) skeleton.dispose();
    this.surfacePass?.dispose();
    this.composer?.passes.forEach(pass => pass.dispose?.()); this.composer?.dispose(); this.renderer?.dispose();
    if (import.meta.env.DEV) delete window.__SPACE_DRAGON_DOGFIGHT__;
  }
}
const game = new DogfightLab();
game.initialize().catch(error => {
  console.error('Dogfight Lab initialization failed:', error);
  $('loading-status').textContent = `Unable to initialize this encounter: ${error.message}.`;
  $('loading-recovery').hidden = false; document.body.dataset.state = 'error';
  game.dispose();
});
