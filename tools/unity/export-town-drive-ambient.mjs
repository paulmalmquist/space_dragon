import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROUTE, lanePoseAt } from '../../src/game/drive/route.ts';
import { createTrafficState, stepTraffic, trafficPose, trafficCollisionProxies, TRAFFIC_SIGNALS, signalPhase, advanceTrafficS } from '../../src/game/drive/traffic.ts';
import { createPedestrianPopulation, pedestrianPosesAt } from '../../src/game/drive/pedestrians.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const select=(o,keys)=>Object.fromEntries(keys.map(k=>[k,o[k]]));
const vehicleKeys=['id','kind','s','speed','cruiseSpeed','direction','lane','colorIndex','braking'];
const poseKeys=['x','z','yaw','s','sectionIndex'];
const personKeys=['id','sectionIndex','side','appearance','startS','endS','speed','phaseDistance','heightScale'];
const pedestrianPoseKeys=['id','appearance','side','sectionIndex','x','z','yaw','walkPhase','heightScale','speed'];
const fixture={schemaVersion:1,routeId:ROUTE.id,tolerance:1e-7,sourceHashes:[],signals:[],advances:[],trafficRuns:[],population:createPedestrianPopulation().map(p=>select(p,personKeys)),pedestrians:[]};
for(const name of ['traffic','pedestrians','route']){const p=`src/game/drive/${name}.ts`;fixture.sourceHashes.push({path:p,sha256:createHash('sha256').update((await readFile(path.join(root,p),'utf8')).replaceAll('\r\n','\n')).digest('hex')});}
for(const time of [-1,0,1,19.99,20,22.99,23,30.99,31,61.5,301])for(const signal of TRAFFIC_SIGNALS)fixture.signals.push({id:signal.id,time,phase:signalPhase(signal,time)});
for(const s of [0,100,ROUTE.sections[0].endS,1000,3000,ROUTE.length-1])for(const metres of [-200,-1,0,1,100,5000])fixture.advances.push({s,metres,expected:advanceTrafficS(s,metres)});
for(const kind of ['away','on-lane','opposite-lane']){
 let state=createTrafficState(0,64);const run={name:kind,frames:[]};
 for(let tick=0;tick<=1200;tick++){
  const p=lanePoseAt(800+tick*.12),player={x:kind==='away'?10000:p.x,z:kind==='away'?10000:p.z,yaw:p.yaw+(kind==='opposite-lane'?Math.PI:0),speed:kind==='away'?0:7.2,elapsedSeconds:tick/60,routeS:p.s};
  state=stepTraffic(state,player);
  const frame={player};
  if(tick%120===0){frame.vehicles=state.vehicles.map(v=>select(v,vehicleKeys));frame.poses=state.vehicles.map(v=>select(trafficPose(v),poseKeys));frame.proxies=trafficCollisionProxies(state,player.x,player.z);}
  run.frames.push(frame);
 }
 fixture.trafficRuns.push(run);
}
for(const time of [-1,0,.01,1,10,20,100,1000])fixture.pedestrians.push({time,poses:pedestrianPosesAt(time).map(p=>select(p,pedestrianPoseKeys))});
const file=path.join(root,'unity/SpaceDragon/Assets/SpaceDragon/TownDrive/Tests/EditMode/Fixtures/town-drive-ambient-v001.json');
const bytes=JSON.stringify(fixture)+'\n';
if(process.argv.includes('--verify')){if(await readFile(file,'utf8')!==bytes)throw new Error('Ambient oracle drift');}
else await writeFile(file,bytes);
console.log(JSON.stringify({path:file,bytes:Buffer.byteLength(bytes),sha256:createHash('sha256').update(bytes).digest('hex'),trafficRuns:fixture.trafficRuns.length,trafficFrames:fixture.trafficRuns.reduce((n,r)=>n+r.frames.length,0),pedestrianFrames:fixture.pedestrians.length}));
