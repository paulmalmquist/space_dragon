import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRIVE_JUNCTIONS, JUNCTION_CLOSURES, JUNCTION_OBSTACLES, junctionActiveRoadClearance, junctionRoadContains, junctionPoint, junctionArmPoint } from '../src/game/drive/junctions.ts';
import { ROUTE, lanePoseAt, nearestRoutePoint } from '../src/game/drive/route.ts';
import { DEFAULT_DRIVE_CONFIG } from '../src/game/drive/config.ts';
import { advanceTrafficS, trafficPose, trafficCollisionProxies, TRAFFIC_CIRCUIT_LENGTH } from '../src/game/drive/traffic.ts';
import type { TrafficVehicle } from '../src/game/drive/traffic.ts';
import { createDriveState, stepDrive } from '../src/game/drive/simulation.ts';

test('mapped junctions retain the original topology and close every exposed unused neighborhood branch',()=>{
  assert.deepEqual(DRIVE_JUNCTIONS.map(j=>[j.id,j.topology,j.arms.length]),[
    ['starpass-green-island','t',3],['green-island-terrace','t',3],['terrace-hypoluxo','t',3],
    ['hypoluxo-jog','cross',4],['jog-lantana','cross',4],['lantana-hagen','t',3],
    ['green-island-terrace-court','t',3],['green-island-desert-inn','t',3],['green-island-turtle-bay','t',3],
    ['green-island-return','t',3],
  ]);
  assert.ok(DRIVE_JUNCTIONS[0].arms.every(a=>a.use!=='closed'));
  assert.equal(DRIVE_JUNCTIONS[0].arms.find(a=>a.id==='east')!.use,'traffic-return');
  assert.equal(JUNCTION_CLOSURES.length,11);
  assert.ok(!DRIVE_JUNCTIONS.find(junction=>junction.id==='lantana-hagen')!.arms.some(a=>Math.cos(a.yaw)>.9));
  // Compass directions come from the source review, independently of generated arm IDs.
  const closedDirections:Record<string,[number,number][]>={
    'green-island-terrace':[[0,1]],'terrace-hypoluxo':[[1,0]],
    'hypoluxo-jog':[[-1,0],[0,-1]],'jog-lantana':[[0,1],[1,0]],'lantana-hagen':[[-1,0]],
    'green-island-terrace-court':[[0,1]],'green-island-desert-inn':[[-.5,-.8660254]],'green-island-turtle-bay':[[0,-1]],
    'green-island-return':[[.909435,.415845]],
  };
  for(const [id,directions]of Object.entries(closedDirections)){
    const closures=JUNCTION_CLOSURES.filter(closure=>closure.junctionId===id);
    assert.equal(closures.length,directions.length);
    for(const [x,z]of directions)assert.ok(closures.some(closure=>Math.sin(closure.yaw)*x+Math.cos(closure.yaw)*z>.9),`${id} closes the wrong compass arm`);
  }
});

test('the unused Boulevard continuation is blocked on its mapped curve after it separates from the authored return',()=>{
  const junction=DRIVE_JUNCTIONS.find(junction=>junction.id==='green-island-return')!;
  const closure=JUNCTION_CLOSURES.find(closure=>closure.junctionId===junction.id)!;
  assert.ok(Math.hypot(junction.x-119.570251,junction.z+96.018048)<.002);
  assert.equal(junction.arms.filter(arm=>arm.use==='route').length,2);
  assert.equal(junction.arms.find(arm=>arm.use==='closed')!.street,'Green Island Boulevard');
  assert.ok(Math.hypot(closure.x-146.834184,closure.z+89.978350)<.002);
  assert.ok(Math.abs(closure.yaw-1.14192436)<.0001);
  // The curve diverges gradually: an ordinary mouth closure would block the
  // returning driver. This board remains on the real road farther northeast.
  assert.ok(junctionActiveRoadClearance(closure)>5);
  assert.ok(closure.obstacles.every(obstacle=>junctionActiveRoadClearance(obstacle)>obstacle.radius+2));
});

test('new neighborhood closures sit on the actual source branch mouths while the Boulevard remains open',()=>{
  const expected=[
    ['green-island-terrace-court',-86.0189,-37.4515,'Green Island Terrace'],
    ['green-island-desert-inn',18.1197,-56.0105,'Desert Inn Terrace'],
    ['green-island-turtle-bay',77.6559,-89.9058,'Turtle Bay Terrace'],
  ] as const;
  for(const [id,x,z,label]of expected){
    const junction=DRIVE_JUNCTIONS.find(junction=>junction.id===id)!;
    assert.ok(Math.hypot(junction.x-x,junction.z-z)<.02);
    assert.equal(junction.arms.filter(arm=>arm.use==='closed').length,1);
    assert.equal(junction.arms.find(arm=>arm.use==='closed')!.street,label);
    assert.ok(junction.arms.filter(arm=>arm.street==='Green Island Boulevard').every(arm=>arm.use==='route'));
    assert.equal(JUNCTION_CLOSURES.filter(closure=>closure.junctionId===id).length,1);
  }
});

test('visible barricades are reachable before the corridor clamp and leave every active pavement envelope clear',()=>{
  for(const closure of JUNCTION_CLOSURES){
    assert.ok(junctionActiveRoadClearance(closure)<DEFAULT_DRIVE_CONFIG.corridorMargin-2,`${closure.id} must be reachable`);
    assert.ok(closure.barricades.length>=2);
    for(const obstacle of closure.obstacles){
      assert.ok(junctionActiveRoadClearance(obstacle)>obstacle.radius+1.05,`${obstacle.id} intrudes into an active road`);
    }
  }
});

test('the complete player lane including shared return and court turnaround clears blockade collision discs',()=>{
  for(let s=0;s<ROUTE.length;s+=.5){
    const player=lanePoseAt(s);
    for(const obstacle of JUNCTION_OBSTACLES){
      assert.ok(Math.hypot(player.x-obstacle.x,player.z-obstacle.z)>obstacle.radius+1.2,`${obstacle.id} blocks player at ${s}`);
    }
  }
});

test('both NPC directions and all lane indices clear closures with their full body and collision proxies, including every bridge span',()=>{
  // Conservatively encloses the largest current traffic van, mirrors and bumper trim.
  const halfWidth=1.2,halfLength=2.55;
  const bridge=ROUTE.trafficBridge;
  for(const direction of [1,-1] as const)for(const lane of [0,1,2]){
    let bridgeSamples=0;
    const samples:number[]=[];
    for(let metres=0;metres<TRAFFIC_CIRCUIT_LENGTH;metres+=.5)samples.push(advanceTrafficS(bridge.toS,metres));
    // Include exact entry/exit and adjacent tangent samples, independent of the circuit grid.
    for(const seam of [bridge.fromS,bridge.toS])for(const metres of [-4,-.8,0,.8,4])samples.push(advanceTrafficS(seam,metres));
    for(const s of samples){
      if(s>=bridge.fromS||s<bridge.toS)bridgeSamples++;
      const vehicle:TrafficVehicle={id:'clearance-car',s,direction,lane,speed:0,cruiseSpeed:12,braking:false,kind:'van',colorIndex:0};
      const pose=trafficPose(vehicle),sin=Math.sin(pose.yaw),cos=Math.cos(pose.yaw);
      const proxies=trafficCollisionProxies({vehicles:[vehicle],elapsedSeconds:0,accumulatorSeconds:0},pose.x,pose.z,1);
      assert.equal(proxies.length,3);
      for(const obstacle of JUNCTION_OBSTACLES){
        const dx=obstacle.x-pose.x,dz=obstacle.z-pose.z;
        if(Math.hypot(dx,dz)>Math.hypot(halfWidth,halfLength)+obstacle.radius+1)continue;
        const across=Math.max(0,Math.abs(dx*cos-dz*sin)-halfWidth);
        const along=Math.max(0,Math.abs(dx*sin+dz*cos)-halfLength);
        const label=`${obstacle.id}: direction ${direction}, lane ${lane}, s ${s}`;
        assert.ok(Math.hypot(across,along)>obstacle.radius+.3,`visible NPC body overlaps ${label}`);
        for(const proxy of proxies)assert.ok(Math.hypot(proxy.x-obstacle.x,proxy.z-obstacle.z)>proxy.radius+obstacle.radius+.3,`NPC proxy overlaps ${label}`);
      }
    }
    assert.ok(bridgeSamples>=Math.floor(bridge.length/.5),`direction ${direction}, lane ${lane} did not sample the physical bridge spans`);
  }
});

test('each visible closure stops forward driving before the unchanged corridor clamp',()=>{
  for(const closure of JUNCTION_CLOSURES){
    const start=junctionPoint(closure,closure.yaw,-5),road=nearestRoutePoint(start.x,start.z);
    const initial={...createDriveState(),...start,yaw:closure.yaw,routeS:road.s,speed:4,velocityX:Math.sin(closure.yaw)*4,velocityZ:Math.cos(closure.yaw)*4};
    let blocked=initial,control=initial,contact=false,controlBonked=false;
    const forward={throttle:1,brake:0,steer:0,handbrake:false};
    const progress=(p:{x:number;z:number})=>(p.x-closure.x)*Math.sin(closure.yaw)+(p.z-closure.z)*Math.cos(closure.yaw);
    for(let tick=0;tick<90;tick++){
      blocked=stepDrive(blocked,forward,DEFAULT_DRIVE_CONFIG,JUNCTION_OBSTACLES);
      // Stop the control observation just beyond the board. The unchanged
      // corridor is intentionally allowed to stop it farther down the closed arm.
      if(progress(control)<=1){control=stepDrive(control,forward,DEFAULT_DRIVE_CONFIG,[]);controlBonked ||= control.bonkSeconds>0;}
      contact ||= blocked.bonkSeconds>0;
      assert.ok(progress(blocked)<-.5,`${closure.id} allowed the player centre through the visible barrier`);
    }
    assert.ok(contact,`${closure.id} never produced actual collision feedback`);
    assert.ok(blocked.speed<1,`${closure.id} did not stop forward movement`);
    assert.ok(progress(control)>1,`${closure.id} cannot be reached without its collision discs`);
    assert.equal(controlBonked,false,`${closure.id} control hit the corridor or median before the barrier`);
    assert.deepEqual(blocked.visited,['home']);assert.equal(blocked.completed,false);
  }
});

test('road exclusions cover the full added branch width and every physical barricade footprint',()=>{
  for(const junction of DRIVE_JUNCTIONS)for(const arm of junction.arms){
    for(const across of [-arm.width/2,0,arm.width/2]){
      const p=junctionArmPoint(junction,arm,arm.length*.6,across);
      assert.ok(junctionRoadContains(p.x,p.z,.01),`${junction.id}/${arm.id} missing side exclusion`);
    }
  }
  for(const closure of JUNCTION_CLOSURES)for(const obstacle of closure.obstacles)assert.ok(junctionRoadContains(obstacle.x,obstacle.z,1.1));
});
