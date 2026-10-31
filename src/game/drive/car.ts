import { Color3, Quaternion, Vector3 } from '@babylonjs/core/Maths/math';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import { MINIVAN_DIMENSIONS } from './minivan-config';
import { smoothDriveSteering } from './presentation';
import '@babylonjs/core/Meshes/instancedMesh';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import '@babylonjs/core/Shaders/pbr.vertex';
import '@babylonjs/core/Shaders/pbr.fragment';

export interface DriveCarInstruments { brake?: number; throttle?: number; paused?: boolean }

/** Original Odyssey-inspired minivan; metres, +Z forward. Honda photographs are reference only. */
export function createDriveCar(scene: Scene) {
  const root = new TransformNode('drive.car.detailed', scene);
  root.metadata = { model: 'original-odyssey-inspired-minivan', dimensions: MINIVAN_DIMENSIONS, seats: 8 };
  const materials: PBRMaterial[] = [];
  const textures: Texture[] = [];
  const allMeshes: Mesh[] = [];
  const cabinDetails = new TransformNode('drive.car.cabin-detail', scene);
  cabinDetails.parent = root;
  const cabinDetailGroups = [cabinDetails];
  let buildingCabin = false;
  let cabinActive = false;
  // Body panels and privacy glass conceal these small fittings in exterior views.
  // Seat/headrest silhouettes, door cards, dashboard, console and wheel remain visible.
  const interiorDetail = /^(?:cabin-floor|cargo-load-floor|door-pocket|inside-handle-pocket|inside-chrome-handle|window-switch|speaker-slot|roof-vent|seat-cushion-piping|seat-back-piping|seat-insert-seam|seat-floor-rail|seatbelt-buckle|seatbelt-release|seat-adjustment|dash-double-stitch|glovebox-release|dashboard-vent-slat|dashboard-vent-tab|climate-knob|climate-button|gear-button|engine-start-button|console-lid-stitch|phone-charging-recess|cupholder|cup-well|console-rear-vent|map-light|overhead-switches|visor-vanity-cover|rear-entertainment-folded-screen|pedal|wheel-control-panel|wheel-button|digital-instruments|navigation-screen|climate-display)(?:[.-]|$)/;
  function material(name: string, color: string, metallic: number, roughness: number) {
    const m = new PBRMaterial(`drive.car.${name}`, scene);
    m.albedoColor = Color3.FromHexString(color).toLinearSpace();
    m.metallic = metallic; m.roughness = roughness; m.environmentIntensity = .8;
    m.backFaceCulling = false; m.twoSidedLighting = true;
    materials.push(m); return m;
  }
  const paint = material('pearl-white-paint', '#f3f2ed', .18, .22);
  paint.clearCoat.isEnabled = true; paint.clearCoat.intensity = 1; paint.clearCoat.roughness = .10;
  const chrome = material('satin-aluminium', '#afb5b8', .95, .27);
  const polished = material('polished-alloy', '#dce3e5', 1, .13);
  const black = material('black-trim', '#131719', .05, .46);
  const rubber = material('rubber-sidewall', '#171a1c', .02, .85);
  const treadRubber = material('rubber-tread', '#101315', 0, .96);
  const seam = material('panel-gaps', '#1a1b1c', 0, .8);
  const leather = material('warm-gray-leather', '#9a9286', 0, .72);
  const textile = material('seat-inserts', '#837c73', 0, .93);
  const dash = material('soft-touch-dashboard', '#303136', 0, .88);
  const carpet = material('floor-carpet', '#323334', 0, 1);
  const headliner = material('ivory-headliner', '#c5bfb1', 0, .97);
  const stitching = material('upholstery-stitching', '#c0b8ac', 0, .93);
  for (const m of [leather, textile, dash, carpet, headliner, stitching]) m.environmentIntensity = .36;
  // Existing CC0 linen micro-normal adds restrained upholstery grain; no reference photographs ship.
  for(const [mat,repeat,level] of [[leather,7,.10],[textile,4,.24],[headliner,8,.16]] as const) {
    const normal=new Texture(`${import.meta.env.BASE_URL}assets/drive/materials/fabric-normal.webp`,scene,false,true);
    normal.gammaSpace=false;normal.uScale=normal.vScale=repeat;normal.level=level;normal.anisotropicFilteringLevel=4;
    mat.bumpTexture=normal;textures.push(normal);
  }
  const frosted=material('frosted-cabin-lenses','#d0d1cb',0,.65);frosted.emissiveColor.set(.025,.026,.023);
  const brakeMetal = material('brake-discs', '#444b4d', .80, .53);
  const glass = material('clear-front-glazing', '#c3d2d3', 0, .065);
  glass.alpha = .10; glass.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
  glass.indexOfRefraction = 1.47; glass.environmentIntensity = .38;
  glass.disableDepthWrite = true;
  const glassInteriorColor=glass.albedoColor.clone(),glassExteriorColor=Color3.FromHexString('#273840').toLinearSpace();
  glass.alpha=.55;glass.albedoColor.copyFrom(glassExteriorColor);
  const privacyGlass = material('rear-privacy-glazing', '#192d33', 0, .055);
  privacyGlass.alpha = .92; privacyGlass.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
  privacyGlass.environmentIntensity = .65; privacyGlass.disableDepthWrite = true;
  const mirror = material('mirror-glass', '#a0b0b8', 1, .18); mirror.environmentIntensity = .45;
  const lamp = material('headlight-reflector', '#cdd7de', .75, .15);
  const led = material('daytime-led', '#eef7fb', .15, .18); led.emissiveColor.set(.75,.82,.88);
  const tail = material('tail-lens', '#9f1720', .30, .18); tail.emissiveColor.set(.12,.003,.006);
  const tailLed = material('tail-led', '#ed3132', .15, .19); tailLed.emissiveColor.set(.40,.01,.012);
  const controls = material('control-labels', '#c8d3d7', 0, .68); controls.emissiveColor.set(.045,.055,.06);
  function attach(mesh: Mesh, mat: PBRMaterial, parent: TransformNode = root) {
    if (buildingCabin && interiorDetail.test(mesh.name.replace(/^drive\.car\./, ''))) {
      if (parent === root) parent = cabinDetails;
      else if (parent.name === 'drive.car.steering-wheel') {
        let detail = cabinDetailGroups.find(group => group.parent === parent);
        if (!detail) { detail = new TransformNode('drive.car.steering-detail', scene); detail.parent = parent; cabinDetailGroups.push(detail); }
        parent = detail;
      }
    }
    mesh.material = mat; mesh.parent = parent; mesh.isPickable = false;
    mesh.receiveShadows = true; allMeshes.push(mesh);
    return mesh;
  }
  function surface(name: string, nu: number, nv: number, point: (u: number, v: number) => Vector3, mat: PBRMaterial, parent: TransformNode = root) {
    const positions: number[] = []; const uvs: number[] = []; const indices: number[] = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const p = point(i / nu, j / nv); positions.push(p.x, p.y, p.z); uvs.push(i / nu, j / nv);
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i; const b = a + nu + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const data = new VertexData(); data.positions = positions; data.indices = indices; data.uvs = uvs;
    const normals: number[] = []; VertexData.ComputeNormals(positions, indices, normals); data.normals = normals;
    const mesh = new Mesh(`drive.car.${name}`, scene); data.applyToMesh(mesh);
    return attach(mesh, mat, parent);
  }
  function line(name: string, points: Vector3[], radius: number, mat: PBRMaterial, parent: TransformNode = root) {
    return attach(MeshBuilder.CreateTube(`drive.car.${name}`, { path: points, radius, tessellation: 6, cap: Mesh.CAP_ALL }, scene), mat, parent);
  }
  function roundedBox(name: string, x: number, y: number, z: number, w: number, h: number, d: number, r: number, mat: PBRMaterial, parent: TransformNode = root) {
    const positions: number[] = []; const normals: number[] = []; const indices: number[] = []; const uvs: number[] = [];
    const half = [w / 2, h / 2, d / 2]; const radius = Math.min(r, ...half);
    const faceAxes = [[0, 1, 2, 1], [0, 2, 1, -1], [1, 2, 0, 1], [1, 0, 2, -1], [2, 0, 1, 1], [2, 1, 0, -1]];
    const steps = 4;
    for (const [axis, ua, va, sign] of faceAxes) {
      const start = positions.length / 3;
      for (let j = 0; j <= steps; j++) for (let i = 0; i <= steps; i++) {
        const p = [0, 0, 0]; p[axis] = sign * half[axis]; p[ua] = [-half[ua], -half[ua]+radius, 0, half[ua]-radius, half[ua]][i]; p[va] = [-half[va], -half[va]+radius, 0, half[va]-radius, half[va]][j];
        const inner = p.map((value, k) => Math.max(-half[k] + radius, Math.min(half[k] - radius, value)));
        const n = new Vector3(p[0] - inner[0], p[1] - inner[1], p[2] - inner[2]).normalize();
        positions.push(inner[0] + n.x * radius, inner[1] + n.y * radius, inner[2] + n.z * radius);
        normals.push(n.x, n.y, n.z);
        uvs.push(i / steps, j / steps);
      }
      for (let j = 0; j < steps; j++) for (let i = 0; i < steps; i++) {
        const a = start + j * (steps + 1) + i; const b = a + steps + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const data = new VertexData(); data.positions = positions; data.normals = normals; data.indices = indices; data.uvs = uvs;
    const mesh = new Mesh(`drive.car.${name}`, scene); data.applyToMesh(mesh); mesh.position.set(x, y, z);
    return attach(mesh, mat, parent);
  }
  function cylinder(name: string, x: number, y: number, z: number, diameter: number, depth: number, mat: PBRMaterial, parent: TransformNode = root) {
    const mesh = MeshBuilder.CreateCylinder(`drive.car.${name}`, { height: depth, diameter, tessellation: diameter > .2 ? 32 : diameter > .07 ? 20 : 12 }, scene);
    mesh.rotation.z = Math.PI / 2; mesh.position.set(x, y, z); return attach(mesh, mat, parent);
  }
  function torus(name:string,options:{diameter:number;thickness:number;tessellation:number},targetScene:Scene) {
    const positions:number[]=[],normals:number[]=[],uvs:number[]=[],indices:number[]=[];
    const major=options.tessellation,minor=8,R=options.diameter/2,r=options.thickness/2;
    for(let j=0;j<=minor;j++)for(let i=0;i<=major;i++) {
      const a=i/major*Math.PI*2,b=j/minor*Math.PI*2,c=Math.cos(b),q=Math.sin(b);
      positions.push((R+r*c)*Math.cos(a),r*q,(R+r*c)*Math.sin(a));normals.push(c*Math.cos(a),q,c*Math.sin(a));uvs.push(i/major,j/minor);
    }
    for(let j=0;j<minor;j++)for(let i=0;i<major;i++){const a=j*(major+1)+i,b=a+major+1;indices.push(a,a+1,b,a+1,b+1,b);}
    const data=new VertexData();data.positions=positions;data.normals=normals;data.uvs=uvs;data.indices=indices;
    const mesh=new Mesh(name,targetScene);data.applyToMesh(mesh);return mesh;
  }
  function smallBox(name: string, x: number, y: number, z: number, w: number, h: number, d: number, mat: PBRMaterial) {
    const mesh=MeshBuilder.CreateBox(`drive.car.${name}`,{width:w,height:h,depth:d},scene);
    mesh.position.set(x,y,z);return attach(mesh,mat);
  }
  const blend = (a: number, b: number, t: number) => a + (b - a) * t;
  const profile = [
    [-2.606,0,1.10],[-2.58,.55,1.105],[-2.51,.80,1.115],[-2.40,.955,1.12],[-1.80,.994,1.10],[-1.2,.997,1.02],
    [-.75,.997,1.04],[-.35,.994,1.12],[.50,.988,1.13],[1.45,.971,1.12],[2.15,.954,1.01],[2.40,.94,.93],[2.51,.80,.885],[2.58,.55,.85],[2.606,0,.835],
  ];
  function shape(z: number) {
    let i = 0; while (i < profile.length - 2 && profile[i + 1][0] < z) i++;
    const a = profile[i]; const b = profile[i+1]; const t = Math.max(0, Math.min(1,(z-a[0])/(b[0]-a[0])));
    const e = t*t*(3-2*t); return {width:blend(a[1],b[1],e),top:blend(a[2],b[2],e)};
  }
  function archBottom(z: number) {
    const distance = Math.min(Math.abs(z-1.53),Math.abs(z+1.47));
    return distance < .42 ? .37 + Math.sqrt(.42**2-distance**2) : .285;
  }
  // Hood only: the passenger compartment is hollow, without a horizontal body slab through it.
  surface('sculpted-hood',32,32,(u,v)=> {
    const z=blend(1.47,2.606,v); const s=shape(z); const x=u*2-1;
    return new Vector3(x*s.width,s.top-.075*Math.abs(x)**3+.016*Math.cos(x*Math.PI),z);
  },paint);
  for(const side of [-1,1]) {
    surface(`coachwork-wheel-arches.${side}`,144,12,(u,v)=> {
      const z=blend(-2.606,2.606,u);const s=shape(z);
      return new Vector3(side*s.width*(.965+.035*Math.sin(v*Math.PI/2)),blend(archBottom(z),s.top,v),z);
    },paint);
    surface(`window-shoulder.${side}`,100,4,(u,v)=> {
      const z=blend(-2.51,1.51,u);const s=shape(z);
      const inset=z>1?.10:z<-2?.065:.035;
      return new Vector3(side*(s.width-v*inset),s.top+.01*Math.sin(v*Math.PI),z);
    },paint);
    for(const z of [-1.47,1.53]) {
      const arc=Array.from({length:37},(_,i)=> {
        const a=i*Math.PI/36;const q=z+Math.cos(a)*.423;
        return new Vector3(side*(shape(q).width+.002),.37+Math.sin(a)*.423,q);
      });
      line(`rolled-fender.${side}.${z}`,arc,.016,paint);
      line(`wheel-arch-liner.${side}.${z}`,arc.map(p=>new Vector3(p.x-side*.02,p.y-.014,p.z)),.024,black);
    }
    line(`door-sill.${side}`,[new Vector3(side*.965,.29,-1.01),new Vector3(side*.967,.29,1.08)],.025,black);
    line(`chrome-rocker.${side}`,[new Vector3(side*.984,.32,-1.05),new Vector3(side*.98,.32,1.10)],.011,chrome);
    // Front door plus the long sliding passenger door; seams follow the formed lower body.
    for(const z of [.11,1.40]) line(`front-door-seam.${side}.${z}`,[new Vector3(side*(shape(z).width+.004),shape(z).top,z),new Vector3(side*.988,.85,z),new Vector3(side*.974,.36,z-.035)],.004,seam);
    line(`sliding-door-seam.${side}`,[new Vector3(side*.992,1.04,-1.21),new Vector3(side*1.001,.89,-1.25),new Vector3(side*.997,.78,-1.10),new Vector3(side*.977,.36,-1.04),new Vector3(side*.978,.35,.075)],.0045,seam);
    line(`front-door-lower-gap.${side}`,[new Vector3(side*.975,.35,.10),new Vector3(side*.975,.35,1.12)],.004,seam);
    line(`sliding-track-recess.${side}`,[new Vector3(side*.999,1.005,-.87),new Vector3(side*1.0,1.005,-1.34),new Vector3(side*.955,1.09,-2.40)],.017,black);
    line(`sliding-track-rail.${side}`,[new Vector3(side*1.003,1.008,-1.05),new Vector3(side*1.004,1.008,-1.33),new Vector3(side*.96,1.09,-2.37)],.004,chrome);
    for(const z of [.27,-.25]) {
      roundedBox(`handle-recess.${side}.${z}`,side*.994,1.006,z,.012,.052,.19,.016,seam);
      roundedBox(`chrome-door-handle.${side}.${z}`,side*1.007,1.01,z,.027,.025,.165,.010,chrome);
    }
    line(`lower-door-sculpture.${side}`,Array.from({length:34},(_,i)=> {
      const z=blend(-1.04,1.08,i/33);return new Vector3(side*(shape(z).width*.996),.47+.052*Math.sin(i/33*Math.PI),z);
    }),.0055,chrome);
    line(`hood-shut-line.${side}`,[new Vector3(side*.77,1.126,1.49),new Vector3(side*.78,1.076,1.88),new Vector3(side*.75,.97,2.49)],.004,seam);
    roundedBox(`fuel-flap.${side}`,side*.994,.887,-1.94,.006,.16,.19,.026,paint);
  }
  roundedBox('undertray',0,.285,0,1.72,.12,4.79,.045,black);
  // Bumpers, broad grille, slim LED lamps and lower corner air inlets establish the modern van face.
  for(const front of [-1,1]) {
    const path=Array.from({length:41},(_,i)=> {
      const x=blend(-.84,.84,i/40);let lo=2.3,hi=2.606;
      for(let j=0;j<18;j++){const mid=(lo+hi)/2;if(shape(front*mid).width>Math.abs(x))lo=mid;else hi=mid;}
      return new Vector3(x,.335,front*((lo+hi)/2+.008));
    });
    line(`lower-valance.${front}`,path,.043,black);
  }
  roundedBox('wide-upper-grille',0,.79,2.595,1.22,.18,.06,.055,black);
  for(let i=0;i<4;i++) roundedBox(`grille-horizontal.${i}`,0,.725+i*.041,2.632,1.10,.010,.014,.004,chrome);
  for(let i=0;i<13;i++) roundedBox(`grille-vertical.${i}`,-.51+i*.085,.78,2.635,.007,.13,.015,.002,black);
  line('grille-bright-brow',[new Vector3(-.66,.897,2.571),new Vector3(-.27,.87,2.641),new Vector3(.27,.87,2.641),new Vector3(.66,.897,2.571)],.018,chrome);
  roundedBox('lower-front-intake',0,.48,2.602,1.05,.19,.05,.05,black);
  for(let i=0;i<3;i++) roundedBox(`lower-intake-slats.${i}`,0,.425+i*.048,2.63,.95,.008,.012,.003,chrome);
  roundedBox('front-license-plate',0,.61,2.643,.40,.103,.018,.007,chrome);
  roundedBox('rear-license-inset',0,.877,-2.618,.51,.19,.027,.022,black);
  roundedBox('rear-blank-plate',0,.887,-2.638,.40,.103,.009,.007,chrome);
  line('tailgate-bright-bar',[new Vector3(-.65,1.05,-2.58),new Vector3(0,1.055,-2.639),new Vector3(.65,1.05,-2.58)],.016,chrome);
  line('tailgate-lower-seam',Array.from({length:33},(_,i)=>{const x=blend(-.80,.80,i/32);return new Vector3(x,.54,-2.61+.17*Math.abs(x/.80)**3);}),.004,seam);
  for(const side of [-1,1]) {
    roundedBox(`headlamp-housing.${side}`,side*.719,.86,2.49,.43,.135,.13,.042,black).rotation.y=-side*.16;
    roundedBox(`headlamp-reflector.${side}`,side*.714,.867,2.55,.39,.094,.04,.025,lamp).rotation.y=-side*.16;
    for(let j=0;j<3;j++) roundedBox(`headlamp-projector.${side}.${j}`,side*(.568+j*.105),.87,2.585-j*.019,.072,.053,.025,.021,polished);
    line(`led-eyebrow.${side}`,[new Vector3(side*.51,.916,2.61),new Vector3(side*.76,.924,2.564),new Vector3(side*.905,.89,2.48)],.008,led);
    roundedBox(`corner-intake.${side}`,side*.754,.515,2.50,.24,.23,.055,.055,black).rotation.y=-side*.18;
    roundedBox(`fog-light.${side}`,side*.756,.505,2.54,.16,.025,.018,.009,led);
    roundedBox(`rear-lamp-dark.${side}`,side*.704,1.115,-2.544,.43,.147,.052,.028,black);
    roundedBox(`rear-lamp-lens.${side}`,side*.701,1.12,-2.574,.396,.108,.018,.024,tail);
    line(`rear-light-signature.${side}`,[new Vector3(side*.51,1.155,-2.602),new Vector3(side*.87,1.155,-2.55),new Vector3(side*.958,1.12,-2.37)],.014,tailLed);
    line(`rear-light-return.${side}`,[new Vector3(side*.51,1.085,-2.602),new Vector3(side*.81,1.085,-2.568),new Vector3(side*.87,1.155,-2.55)],.009,tailLed);
    roundedBox(`rear-bumper-reflector.${side}`,side*.76,.42,-2.56,.20,.04,.025,.015,tail);
    for(const z of [-2.58,2.58]) for(const x of [.36,.77]) {
      const sensor=MeshBuilder.CreateSphere(`drive.car.parking-sensor.${side}.${z}.${x}`,{diameter:.026,segments:8},scene);
      sensor.scaling.z=.2;sensor.position.set(side*x,.655,z-Math.sign(z)*Math.max(0,x-.3)*.15);attach(sensor,black);
    }
  }

  // Long cabin shell with the Odyssey-like dropped/lightning beltline and concealed sliding rail.
  surface('crowned-roof',32,46,(u,v)=> {
    const z=blend(-2.25,.75,v);const width=.79+.035*Math.sin(v*Math.PI);const x=u*2-1;
    return new Vector3(x*width,blend(1.695,1.712,v)+.026*Math.sin(v*Math.PI)+.038*(1-x*x),z);
  },paint);
  surface('sunroof-frame',16,18,(u,v)=> {
    const z=blend(-.36,.60,v);const x=(u*2-1)*.57;
    return new Vector3(x,1.720+.055*(1-(x/.81)**2)+.009*Math.sin((z+2.25)/3*Math.PI),z);
  },black);
  surface('closed-sunroof-glass',16,18,(u,v)=> {
    const z=blend(-.33,.57,v);const x=(u*2-1)*.54;
    return new Vector3(x,1.725+.055*(1-(x/.81)**2)+.009*Math.sin((z+2.25)/3*Math.PI),z);
  },privacyGlass);
  surface('windscreen',30,24,(u,v)=>new Vector3((u*2-1)*blend(.87,.79,v),blend(1.12,1.714,v)+blend(.012,.038,v)*Math.sin(u*Math.PI),blend(1.52,.75,v)+.035*Math.sin(u*Math.PI)),glass);
  surface('rear-window',28,20,(u,v)=>new Vector3((u*2-1)*blend(.895,.77,v),blend(1.13,1.69,v)+.008*Math.sin(u*Math.PI),blend(-2.55+.15*Math.abs(u*2-1)**2,-2.25,v)-.008*Math.sin(u*Math.PI)),privacyGlass);
  for(const side of [-1,1]) {
    const a0=new Vector3(side*.875,1.12,1.52),a1=new Vector3(side*.794,1.712,.75);
    const b0=new Vector3(side*.959,1.125,.08),b1=new Vector3(side*.825,1.73,.02);
    const c0=new Vector3(side*.967,1.026,-1.25),c1=new Vector3(side*.817,1.725,-1.22);
    const d0=new Vector3(side*.91,1.13,-2.40),d1=new Vector3(side*.777,1.695,-2.25);
    line(`A-pillar.${side}`,[a0,a1],.040,paint);
    line(`B-pillar.${side}`,[b0,b1],.040,black);
    line(`C-pillar.${side}`,[c0,c1],.041,black);
    line(`D-pillar.${side}`,[d0,d1],.056,paint);
    line(`roof-side-rail.${side}`,[a1,b1,c1,d1],.028,paint);
    line(`roof-rain-gutter.${side}`,[a1,b1,c1,d1].map(p=>p.add(new Vector3(side*.012,.015,0))),.006,black);
    const belt=[a0,b0,new Vector3(side*.967,1.11,-.52),new Vector3(side*.98,1.026,-.95),c0,d0];
    line(`black-window-belt.${side}`,belt,.020,black);
    line(`chrome-window-belt.${side}`,belt.map(p=>p.add(new Vector3(side*.012,-.017,0))),.008,chrome);
    for(const [name,lowA,lowB,highA,highB,mat] of [
      ['front',a0,b0,a1,b1,glass],['sliding',b0,c0,b1,c1,privacyGlass],['quarter',c0,d0,c1,d1,privacyGlass],
    ] as const) surface(`${name}-window.${side}`,24,16,(u,v)=> {
      const lower=Vector3.Lerp(lowA,lowB,.025+u*.95);const upper=Vector3.Lerp(highA,highB,.025+u*.95);
      if(name==='sliding') lower.y=shape(lower.z).top+.006;
      const p=Vector3.Lerp(lower,upper,.035+v*.93);p.x+=side*.009*Math.sin(u*Math.PI)*Math.sin(v*Math.PI);return p;
    },mat);
    // Inner pillar trim is offset into the cabin, not floating in front of the windshield.
    line(`inner-A-pillar.${side}`,[a0.add(new Vector3(-side*.034,0,-.02)),a1.add(new Vector3(-side*.025,-.02,-.025))],.032,headliner);
    line(`inner-B-pillar.${side}`,[b0.add(new Vector3(-side*.04,0,0)),b1.add(new Vector3(-side*.03,-.02,0))],.034,headliner);
    line(`inner-C-pillar.${side}`,[c0.add(new Vector3(-side*.04,0,0)),c1.add(new Vector3(-side*.03,-.02,0))],.033,headliner);
    line(`mirror-arm.${side}`,[new Vector3(side*.90,1.12,1.15),new Vector3(side*1.08,1.18,1.10)],.030,black);
    roundedBox(`mirror-shell.${side}`,side*1.09,1.20,1.05,.25,.16,.26,.065,paint);
    roundedBox(`mirror-face.${side}`,side*1.09,1.20,.925,.208,.117,.012,.036,mirror);
    roundedBox(`mirror-indicator.${side}`,side*1.10,1.175,1.18,.19,.017,.009,.006,led);
  }
  line('windshield-upper-seal',[new Vector3(-.79,1.714,.75),new Vector3(0,1.727,.78),new Vector3(.79,1.714,.75)],.013,black);
  line('windshield-lower-seal',[new Vector3(-.87,1.12,1.52),new Vector3(0,1.136,1.555),new Vector3(.87,1.12,1.52)],.017,black);
  for(const x of [-.40,.34]) {
    line(`wiper-arm.${x}`,[new Vector3(x,1.144,1.53),new Vector3(x+.18,1.18,1.49)],.006,black);
    line(`wiper-blade.${x}`,[new Vector3(x-.20,1.184,1.47),new Vector3(x+.28,1.184,1.47)],.008,black);
  }
  roundedBox('tailgate-roof-spoiler',0,1.704,-2.30,1.61,.07,.29,.025,paint);
  roundedBox('high-stop-light',0,1.684,-2.449,.55,.026,.018,.009,tailLed);
  line('rear-window-wiper',[new Vector3(-.08,1.205,-2.53),new Vector3(.35,1.25,-2.51)],.008,black);
  const antenna=roundedBox('roof-shark-fin',0,1.806,-1.88,.073,.105,.18,.025,paint);antenna.rotation.x=-.25;

  // Eight-seat interior. All furniture is behind the seated eye except the dashboard and controls.
  buildingCabin = true;
  const driverHeadrest = new TransformNode('drive.car.driver-headrest',scene);driverHeadrest.parent=root;
  roundedBox('cabin-floor',0,.371,-.49,1.76,.055,3.79,.022,carpet);
  roundedBox('cargo-load-floor',0,.47,-2.16,1.64,.07,.56,.025,carpet);
  surface('roof-headliner',28,42,(u,v)=> {
    const x=u*2-1; return new Vector3(x*(.775+.028*Math.sin(v*Math.PI)),1.672+.045*(1-x*x),blend(-2.22,.73,v));
  },headliner);
  for(const side of [-1,1]) {
    // Two-tone door cards, padded armrest, pocket, bright release, switches and speaker mesh.
    for(const [name,z,length] of [['front',.72,1.20],['sliding',-.64,1.21],['rear',-1.85,1.01]] as const) {
      const x=side*(name==='rear'?.85:.884);
      roundedBox(`door-card.${side}.${name}`,x,.757,z,.085,.58,length,.045,leather);
      roundedBox(`door-upper-cap.${side}.${name}`,x-side*.006,1.04,z,.098,.10,length-.025,.025,dash);
      roundedBox(`door-armrest.${side}.${name}`,x-side*.055,.83,z,.13,.09,length*.62,.032,leather);
      roundedBox(`door-pocket.${side}.${name}`,x-side*.048,.55,z,.045,.13,length*.69,.025,black);
      line(`door-inlay.${side}.${name}`,[new Vector3(x-side*.052,.944,z-length*.38),new Vector3(x-side*.052,.944,z+length*.38)],.009,chrome);
      if(name!=='rear') {
        roundedBox(`inside-handle-pocket.${side}.${name}`,x-side*.052,.945,z+.23,.018,.055,.15,.015,black);
        roundedBox(`inside-chrome-handle.${side}.${name}`,x-side*.064,.948,z+.24,.022,.020,.11,.009,chrome);
        for(let i=0;i<(name==='front'&&side<0?4:1);i++) roundedBox(`window-switch.${side}.${name}.${i}`,x-side*.07,.887,z+.04-i*.05,.048,.015,.033,.005,black);
      }
      // Grille perforations are geometry merged into one material batch.
      for(let row=0;row<5;row++) for(let col=0;col<7;col++) smallBox(`speaker-slot.${side}.${name}.${row}.${col}`,x-side*.047,.60+row*.015,z+length*.34+col*.014,.006,.004,.007,seam);
    }
    for(const z of [-.42,-1.52]) {
      line(`grab-handle.${side}.${z}`,[new Vector3(side*.76,1.61,z-.085),new Vector3(side*.73,1.58,z-.065),new Vector3(side*.73,1.58,z+.065),new Vector3(side*.76,1.61,z+.085)],.012,headliner);
      line(`rear-seatbelt.${side}.${z}`,[new Vector3(side*.83,1.49,z-.16),new Vector3(side*.72,.76,z+.16),new Vector3(side*.72,.45,z+.19)],.014,black);
    }
    for(const z of [-.83,-1.87]) {
      roundedBox(`roof-vent.${side}.${z}`,side*.59,1.674,z,.14,.018,.11,.015,dash);
      for(let i=0;i<4;i++) roundedBox(`roof-vent-slat.${side}.${z}.${i}`,side*.59,1.661,z-.034+i*.023,.11,.004,.006,.002,chrome);
    }
  }
  const rows = [{z:.37,xs:[-.46,.46],width:.61},{z:-.73,xs:[-.55,0,.55],width:.49},{z:-1.68,xs:[-.53,0,.53],width:.47}];
  rows.forEach((row,rowIndex)=>row.xs.forEach((x,seatIndex)=> {
    const z=row.z,w=row.width; const name=`${rowIndex}.${seatIndex}`;
    roundedBox(`seat-base.${name}`,x,.49,z,w-.08,.19,.49,.045,black);
    roundedBox(`seat-cushion.${name}`,x,.655,z,w,.19,.54,.065,leather);
    roundedBox(`seat-cushion-insert.${name}`,x,.753,z+.005,w*.62,.020,.38,.009,textile);
    const back=roundedBox(`seat-back.${name}`,x,1.00,z-.245,w,.63,.17,.065,leather);back.rotation.x=-.12;
    const insert=roundedBox(`seat-back-insert.${name}`,x,1.0,z-.151,w*.64,.45,.019,.009,textile);insert.rotation.x=-.12;
    const headParent=rowIndex===0&&x<0?driverHeadrest:root;
    roundedBox(`headrest.${name}`,x,1.429,z-.295,w*.57,.215,.145,.055,leather,headParent);
    for(const offset of [-.078,.078]) line(`headrest-post.${name}.${offset}`,[new Vector3(x+offset,1.25,z-.286),new Vector3(x+offset,1.36,z-.286)],.007,chrome,headParent);
    for(const offset of [-w*.34,w*.34]) {
      line(`seat-cushion-piping.${name}.${offset}`,[new Vector3(x+offset,.756,z+.18),new Vector3(x+offset,.766,z-.16)],.0022,stitching);
      line(`seat-back-piping.${name}.${offset}`,[new Vector3(x+offset,.82,z-.136),new Vector3(x+offset,1.20,z-.184)],.0022,stitching);
    }
    for(let i=0;i<5;i++) line(`seat-insert-seam.${name}.${i}`,[new Vector3(x-w*.27,.772,z-.13+i*.065),new Vector3(x+w*.27,.772,z-.13+i*.065)],.0015,leather);
    for(const railX of [-w*.27,w*.27]) roundedBox(`seat-floor-rail.${name}.${railX}`,x+railX,.408,z-.02,.035,.032,.67,.007,chrome);
    roundedBox(`seatbelt-buckle.${name}`,x+w*.47,.744,z-.15,.045,.09,.052,.012,black);
    roundedBox(`seatbelt-release.${name}`,x+w*.47,.792,z-.15,.032,.012,.035,.004,tail);
    if(rowIndex===0) {
      const side=Math.sign(x);
      line(`front-seatbelt.${name}`,[new Vector3(side*.876,1.49,.04),new Vector3(side*.79,.94,.12),new Vector3(side*.80,.50,.18)],.014,black);
      roundedBox(`front-armrest.${name}`,x-side*.30,.91,z-.11,.10,.075,.38,.03,leather);
      roundedBox(`seat-back-pocket.${name}`,x,.88,z-.35,w*.68,.25,.03,.018,textile);
      for(const knobZ of [z+.08,z-.08]) roundedBox(`seat-adjustment.${name}.${knobZ}`,x+side*w*.49,.57,knobZ,.025,.04,.09,.012,chrome);
    }
  }));

  roundedBox('dashboard-main',0,1.025,1.30,1.74,.20,.43,.055,dash);
  roundedBox('dashboard-lower',0,.878,1.26,1.69,.19,.29,.044,leather);
  roundedBox('dashboard-soft-top',0,1.134,1.34,1.70,.045,.36,.018,dash);
  line('dash-bright-inlay',[new Vector3(-.83,1.048,1.073),new Vector3(-.25,1.048,1.073),new Vector3(0,1.02,1.066),new Vector3(.82,1.048,1.073)],.007,chrome);
  line('dash-double-stitch',[new Vector3(-.79,1.143,1.18),new Vector3(-.24,1.143,1.18),new Vector3(.28,1.143,1.18),new Vector3(.79,1.143,1.18)],.0022,stitching);
  roundedBox('glovebox',.50,.89,1.098,.61,.15,.018,.018,leather);
  roundedBox('glovebox-release',.50,.93,1.083,.11,.023,.015,.006,chrome);
  roundedBox('instrument-hood',-.46,1.185,1.25,.52,.16,.30,.045,dash);
  roundedBox('instrument-bezel',-.46,1.159,1.09,.455,.176,.025,.028,black);
  for(const x of [-.76,-.19,.32,.74]) {
    const width=Math.abs(x)<.4?.14:.16;
    roundedBox(`dashboard-vent.${x}`,x,1.075,1.055,width,.061,.026,.012,black);
    for(let i=0;i<4;i++) roundedBox(`dashboard-vent-slat.${x}.${i}`,x,1.054+i*.014,1.037,width-.023,.004,.008,.0015,chrome);
    roundedBox(`dashboard-vent-tab.${x}`,x+.021,1.078,1.028,.017,.012,.01,.003,black);
  }
  roundedBox('center-stack',.075,.921,1.08,.38,.38,.19,.035,dash);
  roundedBox('center-screen-bezel',.075,1.229,1.105,.326,.206,.037,.024,black);
  roundedBox('climate-panel',.075,1.017,.973,.31,.087,.018,.011,black);
  for(const x of [-.045,.197]) {
    const knob=cylinder(`climate-knob.${x}`,x,1.015,.955,.046,.018,chrome);knob.rotation.set(Math.PI/2,0,0);
    roundedBox(`climate-knob-tick.${x}`,x,1.028,.944,.004,.009,.005,.001,controls);
  }
  for(let i=0;i<5;i++) roundedBox(`climate-button.${i}`,-.02+i*.045,.977,.959,.03,.012,.008,.003,black);
  roundedBox('gear-select-panel',-.092,.862,.974,.12,.15,.025,.018,black);
  for(let i=0;i<4;i++) roundedBox(`gear-button.${i}`,-.092,.913-i*.034,.956,.07,.022,.012,.006,i===3?chrome:black);
  roundedBox('engine-start-button',-.225,.982,1.008,.034,.034,.014,.012,chrome);
  roundedBox('center-console',0,.645,.17,.29,.39,1.15,.045,dash);
  roundedBox('console-padded-lid',0,.862,-.115,.28,.058,.54,.025,leather);
  line('console-lid-stitch',[new Vector3(-.115,.894,-.34),new Vector3(-.115,.894,.1),new Vector3(.115,.894,.1),new Vector3(.115,.894,-.34)],.002,stitching);
  roundedBox('phone-charging-recess',0,.848,.58,.235,.018,.21,.018,black);
  for(const z of [.24,.42]) {
    const cup=torus(`drive.car.cupholder.${z}`,{diameter:.106,thickness:.012,tessellation:24},scene);cup.position.set(0,.854,z);attach(cup,chrome);
    const well=MeshBuilder.CreateCylinder(`drive.car.cup-well.${z}`,{diameter:.094,height:.013,tessellation:24},scene);well.position.set(0,.842,z);attach(well,black);
  }
  roundedBox('console-rear-vents',0,.71,-.425,.23,.10,.035,.012,black);
  for(let i=0;i<4;i++) roundedBox(`console-rear-vent-slat.${i}`,0,.678+i*.022,-.448,.19,.004,.009,.0015,chrome);
  roundedBox('overhead-console',0,1.668,.48,.26,.055,.36,.024,headliner);
  for(const x of [-.074,.074]) roundedBox(`map-light.${x}`,x,1.635,.54,.085,.013,.10,.015,frosted);
  roundedBox('overhead-switches',0,1.632,.36,.16,.012,.045,.008,black);
  for(const x of [-.43,.43]) {
    roundedBox(`sun-visor.${x}`,x,1.648,.71,.43,.035,.20,.018,headliner).rotation.x=-.08;
    roundedBox(`visor-vanity-cover.${x}`,x,1.623,.72,.24,.008,.10,.01,headliner);
  }
  roundedBox('rear-entertainment-housing',0,1.672,-.55,.44,.04,.26,.015,dash);
  roundedBox('rear-entertainment-folded-screen',0,1.647,-.55,.39,.012,.21,.009,black);
  line('rearview-mirror-stem',[new Vector3(0,1.67,.82),new Vector3(0,1.55,1.05)],.012,black);
  roundedBox('rearview-mirror',0,1.55,1.046,.28,.09,.035,.023,black);
  roundedBox('rearview-reflector',0,1.55,1.024,.254,.068,.008,.017,mirror);
  for(const x of [-.49,-.32]) roundedBox(`pedal.${x}`,x,.47,1.08,.09,.10,.025,.013,black).rotation.x=-.35;

  const steeringMount=new TransformNode('drive.car.steering-mount',scene);steeringMount.parent=root;steeringMount.position.set(-.46,1.035,.865);steeringMount.rotation.x=-.23;
  const steeringWheel=new TransformNode('drive.car.steering-wheel',scene);steeringWheel.parent=steeringMount;
  const rim=torus('drive.car.leather-steering-rim',{diameter:.365,thickness:.030,tessellation:56},scene);rim.rotation.x=Math.PI/2;attach(rim,dash,steeringWheel);
  roundedBox('steering-airbag',0,-.012,-.006,.154,.117,.055,.033,dash,steeringWheel);
  for(const side of [-1,1]) {
    line(`steering-spoke.${side}`,[new Vector3(side*.05,.005,0),new Vector3(side*.142,.024,0)],.025,dash,steeringWheel);
    line(`steering-spoke-inlay.${side}`,[new Vector3(side*.067,-.013,-.018),new Vector3(side*.141,.008,-.018)],.006,chrome,steeringWheel);
    roundedBox(`wheel-control-panel.${side}`,side*.109,.025,-.024,.057,.032,.007,.006,black,steeringWheel);
    for(let i=0;i<3;i++) roundedBox(`wheel-button.${side}.${i}`,side*.109-.017+i*.017,.025,-.029,.006,.008,.003,.0015,controls,steeringWheel);
    line(`column-stalk.${side}`,[new Vector3(-.46+side*.06,1.035,.95),new Vector3(-.46+side*.20,1.055,.94)],.012,black);
  }
  line('steering-lower-spoke',[new Vector3(0,-.05,0),new Vector3(-.052,-.15,0),new Vector3(0,-.168,0),new Vector3(.052,-.15,0),new Vector3(0,-.05,0)],.012,chrome,steeringWheel);
  line('steering-column',[new Vector3(-.46,1.035,.91),new Vector3(-.46,.97,1.18)],.032,dash);

  function screen(name: string,x: number,y: number,z: number,w: number,h: number,pixels: {width:number;height:number}) {
    const texture=new DynamicTexture(`drive.car.${name}-texture`,pixels,scene,false);textures.push(texture);
    const mat=material(name,'#ffffff',0,.85);mat.unlit=true;mat.albedoTexture=texture;
    const mesh=MeshBuilder.CreatePlane(`drive.car.${name}`,{width:w,height:h},scene);mesh.position.set(x,y,z);attach(mesh,mat);
    return texture;
  }
  const instruments=screen('digital-instruments',-.46,1.16,1.073,.415,.142,{width:768,height:256});
  const navigation=screen('navigation-screen',.075,1.229,1.083,.286,.164,{width:640,height:360});
  const labels=screen('climate-display',.075,1.021,.959,.154,.043,{width:384,height:96});
  const navigationContext=navigation.getContext();
  navigationContext.fillStyle='#172129';navigationContext.fillRect(0,0,640,360);
  navigationContext.fillStyle='#25353d';navigationContext.fillRect(7,46,626,263);
  navigationContext.strokeStyle='#46535b';navigationContext.lineWidth=14;
  for(let i=0;i<7;i++){navigationContext.beginPath();navigationContext.moveTo(60+i*91,50);navigationContext.lineTo(10+i*95,307);navigationContext.stroke();}
  for(let i=0;i<4;i++){navigationContext.beginPath();navigationContext.moveTo(7,86+i*64);navigationContext.lineTo(630,48+i*71);navigationContext.stroke();}
  navigationContext.strokeStyle='#6cbdbf';navigationContext.lineWidth=11;navigationContext.beginPath();navigationContext.moveTo(326,300);navigationContext.lineTo(350,211);navigationContext.lineTo(355,119);navigationContext.lineTo(510,102);navigationContext.stroke();
  navigationContext.fillStyle='#eef7f7';navigationContext.beginPath();navigationContext.moveTo(342,222);navigationContext.lineTo(327,258);navigationContext.lineTo(351,251);navigationContext.lineTo(364,260);navigationContext.fill();
  navigationContext.font='24px sans-serif';navigationContext.fillText('Town Drive',18,31);navigationContext.font='18px sans-serif';navigationContext.fillText('HOME',20,340);navigationContext.fillText('MAP',181,340);navigationContext.fillText('AUDIO',321,340);navigationContext.fillText('SETTINGS',470,340);
  navigationContext.font='17px sans-serif';navigationContext.fillText('Local route',460,31);navigation.update();
  const labelContext=labels.getContext();labelContext.fillStyle='#101b22';labelContext.fillRect(0,0,384,96);labelContext.fillStyle='#d6f0f3';labelContext.font='38px sans-serif';labelContext.fillText('72°   AUTO   72°',12,60);labels.update();
  let lastInstrumentKey='';let displayElapsed=.25;
  function paintInstruments(speed:number,throttle:number,brake:number,paused:boolean) {
    const mph=Math.round(Math.abs(speed)*2.236936);const gear=paused?'P':speed<-.15?'R':'D';
    const rpm=Math.round((.8+Math.min(3.4,Math.abs(speed)*.07)+Math.max(0,throttle)*1.3)*4)/4;
    const key=`${mph}:${gear}:${rpm}:${brake>.1}`;if(key===lastInstrumentKey)return;lastInstrumentKey=key;
    const c=instruments.getContext() as CanvasRenderingContext2D;c.fillStyle='#0c1219';c.fillRect(0,0,768,256);
    c.strokeStyle='#637785';c.lineWidth=2;
    for(const center of [111,657]) {c.beginPath();c.arc(center,140,86,Math.PI*.8,Math.PI*2.2);c.stroke();}
    c.strokeStyle='#d4e8ec';c.lineWidth=3;
    for(let i=0;i<9;i++) {const a=Math.PI*.8+i*Math.PI*1.4/8;for(const center of [111,657]) {c.beginPath();c.moveTo(center+Math.cos(a)*74,140+Math.sin(a)*74);c.lineTo(center+Math.cos(a)*83,140+Math.sin(a)*83);c.stroke();}}
    const needle=Math.PI*.8+Math.min(1,rpm/8)*Math.PI*1.4;c.strokeStyle='#7dd3d6';c.lineWidth=4;c.beginPath();c.moveTo(111,140);c.lineTo(111+Math.cos(needle)*69,140+Math.sin(needle)*69);c.stroke();
    c.fillStyle='#a1bac5';c.font='20px sans-serif';c.textAlign='center';c.fillText('RPM ×1000',111,230);c.fillText('FUEL',657,230);c.fillText('E',596,206);c.fillText('F',719,206);
    c.strokeStyle='#7dd3d6';c.beginPath();c.moveTo(657,140);c.lineTo(694,86);c.stroke();
    c.fillStyle='#eff8ff';c.font='112px sans-serif';c.fillText(String(mph),384,144);c.font='24px sans-serif';c.fillText('mph',384,179);
    c.font='32px sans-serif';c.fillStyle='#d8eaf0';c.fillText(gear,272,219);c.font='20px sans-serif';c.fillText('TOWN DRIVE',426,222);
    c.fillStyle=brake>.1?'#ef7771':'#77c6a4';c.font='17px sans-serif';c.fillText(brake>.1?'BRAKE':'READY',384,33);
    instruments.update();
  }
  paintInstruments(0,0,0,true);
  buildingCabin = false;

  // Merge static detail by material AND parent. Dynamic steering and the driver's headrest
  // retain their own transforms; transparent windows retain their independent sorting bounds.
  const groups=new Map<TransformNode,Map<PBRMaterial,Mesh[]>>();
  for(const mesh of allMeshes) {
    const mat=mesh.material as PBRMaterial;if(mat===glass||mat===privacyGlass)continue;
    const parent=mesh.parent as TransformNode;const byMaterial=groups.get(parent)??new Map<PBRMaterial,Mesh[]>();
    const list=byMaterial.get(mat)??[];list.push(mesh);byMaterial.set(mat,list);groups.set(parent,byMaterial);
  }
  for(const [parent,byMaterial] of groups) for(const [mat,list] of byMaterial) {
    if(list.length<2)continue;
    for(const mesh of list){mesh.parent=null;mesh.computeWorldMatrix(true);}
    const merged=Mesh.MergeMeshes(list,true,true)!;merged.name=`drive.car.batch.${parent.name}.${mat.name}`;
    merged.parent=parent;merged.material=mat;merged.isPickable=false;merged.receiveShadows=true;
  }
  // Shared wheel meshes are hardware instanced across four independently spinning roots.
  const wheels: TransformNode[] = [];
  const spinning: TransformNode[] = [];
  const wheelSources: Mesh[] = [];
  for (const z of [-1.47, 1.53]) for (const side of [-1, 1]) {
    const steerRoot = new TransformNode(`drive.car.wheel-steer.${side}.${z}`, scene);
    steerRoot.parent = root; steerRoot.position.set(side * .855, .37, z); wheels.push(steerRoot);
    const spinRoot = new TransformNode(`drive.car.wheel-spin.${side}.${z}`, scene); spinRoot.parent = steerRoot; spinning.push(spinRoot);
    if (wheelSources.length) {
      for (const source of wheelSources) {
        const instance = source.createInstance(`${source.name}.instance.${side}.${z}`);
        instance.parent = spinRoot; instance.position.copyFrom(source.position); instance.rotation.copyFrom(source.rotation);
        if (source.rotationQuaternion) instance.rotationQuaternion = source.rotationQuaternion.clone();
        instance.scaling.copyFrom(source.scaling); instance.isPickable = false; instance.receiveShadows = true;
      }
      continue;
    }
    const start = allMeshes.length;
    const tyreProfile = [[-.112,.245],[-.125,.29],[-.112,.33],[-.08,.359],[-.04,.366],[.04,.366],[.08,.359],[.112,.33],[.125,.29],[.112,.245],[-.112,.245]];
    surface('tyre-profile', 48, 30, (u, v) => {
      const segment = Math.min(tyreProfile.length - 2, Math.floor(v * (tyreProfile.length - 1)));
      const t = v * (tyreProfile.length - 1) - segment; const a = tyreProfile[segment]; const b = tyreProfile[segment + 1];
      const radius = blend(a[1], b[1], t); const angle = u * Math.PI * 2;
      return new Vector3(blend(a[0], b[0], t), Math.cos(angle) * radius, Math.sin(angle) * radius);
    }, rubber, spinRoot);
    surface('open-alloy-barrel',48,2,(u,v)=>new Vector3(blend(-.09,.09,v),Math.cos(u*Math.PI*2)*.237,Math.sin(u*Math.PI*2)*.237),black,spinRoot);
    cylinder('brake-disc', 0, 0, 0, .405, .11, brakeMetal, spinRoot);
    for (const sideFace of [-1, 1]) {
      const lip = attach(torus(`drive.car.rim-lip.${sideFace}`, { diameter: .477, thickness: .018, tessellation: 48 }, scene), polished, spinRoot);
      lip.rotation.z = Math.PI / 2; lip.position.x = sideFace * .12;
      cylinder(`hub.${sideFace}`, sideFace * .125, 0, 0, .118, .025, polished, spinRoot);
      cylinder(`hub-inset.${sideFace}`, sideFace * .143, 0, 0, .055, .008, black, spinRoot);
      for (let k = 0; k < 5; k++) {
        const angle = k * Math.PI * 2 / 5;
        for (const split of [-1, 1]) {
          const a = angle + split * .10;
          line(`split-spoke.${sideFace}.${k}.${split}`, [new Vector3(sideFace * .13, Math.cos(angle) * .048, Math.sin(angle) * .048), new Vector3(sideFace * .116, Math.cos(a) * .16, Math.sin(a) * .16), new Vector3(sideFace * .12, Math.cos(a + split * .06) * .23, Math.sin(a + split * .06) * .23)], .014, polished, spinRoot);
        }
        cylinder(`lug.${sideFace}.${k}`, sideFace * .143, Math.cos(angle) * .043, Math.sin(angle) * .043, .015, .014, black, spinRoot);
      }
    }
    // Merge repeated tread lugs into one mesh; clones use shared geometry, not hundreds of draw calls.
    const treadParts: Mesh[] = [];
    for (let k = 0; k < 44; k++) for (const sideTread of [-1, 1]) {
      const angle = k * Math.PI * 2 / 44;
      const piece = MeshBuilder.CreateBox(`drive.car.tread-temp`, { width: .075, height: .007, depth: .015 }, scene);
      piece.position.set(sideTread * .046, Math.cos(angle) * .367, Math.sin(angle) * .367);
      piece.rotationQuaternion = Quaternion.RotationAxis(Vector3.Right(), angle).multiply(Quaternion.RotationAxis(Vector3.Up(), sideTread * .35));
      treadParts.push(piece);
    }
    const treadMesh = Mesh.MergeMeshes(treadParts, true, true)!; treadMesh.name = 'drive.car.tyre-tread'; attach(treadMesh, treadRubber, spinRoot);
    // Consolidate stationary wheel components by material before instancing the assembly.
    const candidates = allMeshes.splice(start);
    const grouped = new Map<PBRMaterial, Mesh[]>();
    for (const mesh of candidates) { const key = mesh.material as PBRMaterial; const group = grouped.get(key) ?? []; group.push(mesh); grouped.set(key, group); }
    for (const [mat, meshes] of grouped) {
      // Mesh.MergeMeshes bakes world matrices, so merge at identity wheel parent then restore it.
      for (const mesh of meshes) { mesh.parent = null; mesh.computeWorldMatrix(true); }
      const merged = meshes.length === 1 ? meshes[0] : Mesh.MergeMeshes(meshes, true, true)!;
      merged.name = `drive.car.wheel.${mat.name}`; merged.parent = spinRoot; merged.material = mat;
      merged.isPickable = false; merged.receiveShadows = true; allMeshes.push(merged); wheelSources.push(merged);
    }
  }
  let spin = 0;
  let displayedSteering = 0;
  let disposed = false;
  for (const group of cabinDetailGroups) group.setEnabled(false);
  return {
    root, wheels, ready: Promise.resolve(),
    setCabinView(active: boolean) {
      if (active === cabinActive) return;
      cabinActive = active;
      for (const group of cabinDetailGroups) group.setEnabled(active);
      if (active) displayElapsed = .25;
      driverHeadrest.setEnabled(!active);
      // The low-opacity inside surface preserves the driving sightline; the exterior catches daylight.
      glass.alpha=active?.10:.55;glass.albedoColor.copyFrom(active?glassInteriorColor:glassExteriorColor);
    },
    update(speed: number, dt: number, steer = 0, options: DriveCarInstruments = {}) {
      const elapsed = options.paused ? 0 : Math.min(.1, Math.max(0, dt));
      spin = (spin + speed * elapsed / MINIVAN_DIMENSIONS.tyreRadius) % (Math.PI * 2);
      displayedSteering = smoothDriveSteering(displayedSteering, steer, elapsed, options.paused);
      for (const wheel of spinning) wheel.rotation.x = spin;
      for (const wheel of wheels) wheel.rotation.y = wheel.position.z > 0 ? displayedSteering * .42 : 0;
      steeringWheel.rotation.z = -displayedSteering * 2.25;
      const brake = Math.max(0,Math.min(1,options.brake ?? 0));
      tailLed.emissiveColor.set(.40+brake*.70,.01+brake*.025,.012+brake*.018);
      displayElapsed += elapsed;
      if (cabinActive && (displayElapsed >= .18 || options.paused)) {
        paintInstruments(speed,options.throttle ?? 0,brake,options.paused ?? false);displayElapsed=0;
      }
    },
    dispose() {
      if(disposed)return;disposed=true;
      root.dispose();for(const mat of materials)mat.dispose();for(const texture of textures)texture.dispose();
    },
  };
}
