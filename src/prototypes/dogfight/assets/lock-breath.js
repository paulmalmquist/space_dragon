import * as THREE from 'three';
import { mouthPosition } from '../systems/aim.js';

// Presentation follows the authoritative burst clock. No collision or reward
// callback is attached to the visual; pause and retry cannot award another hit.
export class LockBreath {
  constructor(scene) {
    this.scene = scene; this.root = new THREE.Group(); this.root.name = 'locked_breath';
    this.root.visible = false; scene.add(this.root);
    this.segmentCount = 24; this.paths = [];
    this.geometry = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true);
    this.sphere = new THREE.SphereGeometry(1, 16, 12);
    this.outer = new THREE.ShaderMaterial({
      uniforms: { clock: { value: 0 }, intensity: { value: 1 } }, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: `varying vec3 world; varying vec3 normalWorld; void main() {
        vec4 p=vec4(position,1.); vec3 n=normal;
        #ifdef USE_INSTANCING
          p=instanceMatrix*p; n=mat3(instanceMatrix)*n;
        #endif
        vec4 w=modelMatrix*p; world=w.xyz; normalWorld=normalize(mat3(modelMatrix)*n);
        gl_Position=projectionMatrix*viewMatrix*w;
      }`,
      fragmentShader: `uniform float clock; uniform float intensity; varying vec3 world; varying vec3 normalWorld;
        void main(){
          vec3 p=world*.7; float flow=sin(p.x*2.7+p.y*3.1+p.z*.8-clock*19.);
          flow+=.5*sin(p.x*5.1-p.y*4.7+p.z*1.3+clock*27.);
          float heat=smoothstep(-1.1,1.5,flow);
          float face=abs(dot(normalize(cameraPosition-world),normalize(normalWorld)));
          vec3 fire=mix(vec3(1.,.035,.002),vec3(1.,.64,.065),heat);
          gl_FragColor=vec4(fire*1.8,(.22+.45*heat)*(.35+.65*face)*intensity);
        }`,
    });
    this.inner = new THREE.MeshBasicMaterial({ color: 0xffefb5, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false });
    this.chargeMaterial = new THREE.MeshBasicMaterial({ color: 0xff5814, transparent: true, opacity: .65, blending: THREE.AdditiveBlending, depthWrite: false });
    this.glow = new THREE.Mesh(this.sphere, this.chargeMaterial); this.core = new THREE.Mesh(this.sphere, this.inner);
    this.root.add(this.glow, this.core);
    this.p0 = new THREE.Vector3(); this.p1 = new THREE.Vector3(); this.mid = new THREE.Vector3();
    this.axis = new THREE.Vector3(0, 1, 0); this.direction = new THREE.Vector3(); this.up = new THREE.Vector3();
    this.rotation = new THREE.Quaternion(); this.scale = new THREE.Vector3(); this.matrix = new THREE.Matrix4();
    this.activeId = null;
  }
  start(burst, flight, squad) {
    this.clear(); if (!burst?.targetIds?.length) return;
    this.activeId = burst.id;
    for (const id of burst.targetIds) {
      const target = squad.drones.find(drone => drone.id === id); if (!target) continue;
      const shell = new THREE.InstancedMesh(this.geometry, this.outer, this.segmentCount);
      const core = new THREE.InstancedMesh(this.geometry, this.inner, this.segmentCount);
      shell.instanceMatrix.setUsage(THREE.DynamicDrawUsage); core.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      shell.frustumCulled = false; core.frustumCulled = false;
      const tip = new THREE.Mesh(this.sphere, this.inner);
      this.paths.push({ id, shell, core, tip, lastTarget: target.position.clone() }); this.root.add(shell, core, tip);
    }
    this.root.visible = this.paths.length > 0; this.update(burst, flight, squad);
  }
  update(burst, flight, squad, reducedMotion = false) {
    if (!burst || burst.id !== this.activeId) { this.root.visible = false; return; }
    const windup = burst.windupDuration ?? 0;
    const charging = burst.elapsed < windup;
    const charge = windup ? Math.min(1, burst.elapsed / windup) : 1;
    const beamTime = Math.max(0, burst.elapsed - windup);
    // Reach the selected ship quickly, then hold a continuous fire beam.
    const travel = charging ? 0 : Math.min(1, beamTime / .16);
    this.outer.uniforms.clock.value = reducedMotion ? 0 : burst.elapsed;
    this.outer.uniforms.intensity.value = charging ? 0 : 1;
    const start = mouthPosition(flight);
    this.up.copy(flight.up);
    this.glow.position.copy(start); this.core.position.copy(start);
    const bloom = charging ? .4 + charge * 2.1 : 2.5;
    this.glow.scale.setScalar(bloom); this.core.scale.setScalar(bloom * .38);
    for (const path of this.paths) {
      const target = squad.drones.find(drone => drone.id === path.id);
      if (target) path.lastTarget.copy(target.position);
      const end = path.lastTarget;
      const point = (u, out) => out.copy(start).lerp(end, u).addScaledVector(this.up,
        Math.sin(u * Math.PI) * (reducedMotion ? 1.5 : 5));
      for (let i = 0; i < this.segmentCount; i++) {
        point(i / this.segmentCount * travel, this.p0); point((i + 1) / this.segmentCount * travel, this.p1);
        this.direction.copy(this.p1).sub(this.p0);
        const length = Math.max(.001, this.direction.length());
        this.rotation.setFromUnitVectors(this.axis, this.direction.normalize()); this.mid.copy(this.p0).add(this.p1).multiplyScalar(.5);
        const width = (.8 + Math.sin(i / this.segmentCount * Math.PI) * .6) *
          (reducedMotion ? 1 : 1 + .08 * Math.sin(i * 1.7 + burst.elapsed * 24));
        this.scale.set(width, length, width); this.matrix.compose(this.mid, this.rotation, this.scale); path.shell.setMatrixAt(i, this.matrix);
        this.scale.set(width * .3, length, width * .3); this.matrix.compose(this.mid, this.rotation, this.scale); path.core.setMatrixAt(i, this.matrix);
      }
      path.shell.visible = path.core.visible = travel > .001;
      path.shell.instanceMatrix.needsUpdate = path.core.instanceMatrix.needsUpdate = true;
      point(travel, path.tip.position); path.tip.visible = travel > 0; path.tip.scale.setScalar(travel > 0 ? 2.8 : .01);
    }
  }
  clear() {
    this.root.visible = false; this.activeId = null;
    for (const path of this.paths) {
      this.root.remove(path.shell, path.core, path.tip);
      path.shell.dispose(); path.core.dispose();
    }
    this.paths.length = 0;
  }
  dispose() { this.clear(); this.scene.remove(this.root); this.geometry.dispose(); this.sphere.dispose(); this.outer.dispose(); this.inner.dispose(); this.chargeMaterial.dispose(); }
}
