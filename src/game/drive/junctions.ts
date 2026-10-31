import { NEIGHBORHOOD } from './neighborhood.ts';
import { ROUTE, nearestRoutePoint, pointAtDistance } from './route.ts';
import contextReference from './neighborhood-context-source.json' with { type: 'json' };

export interface JunctionPoint { x:number; z:number }
export interface JunctionArm {
  id:string; street:string; yaw:number; width:number; medianWidth:number; length:number;
  use:'route'|'traffic-return'|'closed'; existingPavement:boolean;
  /** Existing mapped curves can diverge slowly from the active route. */
  centerline?:readonly JunctionPoint[];
}
export interface DriveJunction extends JunctionPoint {
  id:string; label:string; topology:'t'|'cross'; radius:number; arms:JunctionArm[];
  source:'mapped-neighborhood'|'mapped-topology-compressed-position';
}
export interface JunctionObstacle extends JunctionPoint {id:string;radius:number}
export interface JunctionClosure extends JunctionPoint {
  id:string; junctionId:string; armId:string; yaw:number; width:number; distance:number;
  barricades:({width:number}&JunctionPoint)[];
  police:{id:string;x:number;z:number;yaw:number;kind:'suv'|'sedan'};
  obstacles:JunctionObstacle[];
}

/** Public OSM topology, not survey geometry; closures are fictional game boundaries. */
export const JUNCTION_SOURCES = Object.freeze({
  checkedAt:'2026-10-31T14:13:27Z',attribution:'© OpenStreetMap contributors · ODbL',
  neighborhoodBranchSource: 'neighborhood-context-source.json',
  neighborhoodBranchWayIds: [11218716, 11229247, 11228918, 11205953],
  returnJoin: 'The authored return joins mapped Green Island Boulevard; the unused mapped continuation is closed.',
  sources:[
    {id:'hypoluxo-jog',url:'https://api.openstreetmap.org/api/0.6/map?bbox=-80.147,26.5718,-80.145,26.5735',ways:[82790090,255634415,408054527,1184211812,682328908,1413175165]},
    {id:'jog-lantana',url:'https://api.openstreetmap.org/api/0.6/map?bbox=-80.1475,26.5865,-80.1445,26.5900',ways:[219363112,1152922208,958803393,1384230477,134602666,534819596,682328906,682328907]},
    {id:'lantana-hagen',url:'https://api.openstreetmap.org/api/0.6/map?bbox=-80.1610,26.5893,-80.1577,26.5907',ways:[1150213657,1150213658,682328907,1306077971,682328906]},
  ],
});

const halfRoad=(section:typeof ROUTE.sections[number])=>section.lanes*section.laneWidth+section.medianWidth/2;
const heading=(a:JunctionPoint,b:JunctionPoint)=>Math.atan2(b.x-a.x,b.z-a.z);
export const junctionPoint=(origin:JunctionPoint,yaw:number,along:number,across=0):JunctionPoint=>({x:origin.x+Math.sin(yaw)*along+Math.cos(yaw)*across,z:origin.z+Math.cos(yaw)*along-Math.sin(yaw)*across});
/** Sample physical metres along a mapped arm, retaining the local road tangent. */
export function junctionArmPoint(junction:JunctionPoint,arm:JunctionArm,along:number,across=0):JunctionPoint&{yaw:number}{
  if(arm.centerline){
    let remaining=along;
    for(let i=1;i<arm.centerline.length;i++){
      const a=arm.centerline[i-1],b=arm.centerline[i],length=Math.hypot(b.x-a.x,b.z-a.z),yaw=heading(a,b);
      if(remaining<=length||i===arm.centerline.length-1)return{...junctionPoint(a,yaw,remaining,across),yaw};
      remaining-=length;
    }
  }
  return{...junctionPoint(junction,arm.yaw,along,across),yaw:arm.yaw};
}
function arm(id:string,street:string,yaw:number,width:number,medianWidth:number,use:JunctionArm['use'],existingPavement:boolean,length=90):JunctionArm{
  return{id,street,yaw,width,medianWidth,use,existingPavement,length};
}
const n=NEIGHBORHOOD;
const neighborhood:DriveJunction[]=[
  {...n.junctions[0],label:'Starpass Court / Green Island Boulevard',topology:'t',radius:18,source:'mapped-neighborhood',arms:[
    arm('court','Starpass Court',heading(n.junctions[0],n.start),7,0,'route',true,28),
    arm('west','Green Island Boulevard',heading(n.junctions[0],n.centerlines.greenIsland[5]),7,0,'route',true,65),
    arm('east','Green Island Boulevard',heading(n.junctions[0],n.centerlines.greenIsland[7]),7,0,'traffic-return',true,65),
  ]},
  {...n.junctions[1],label:'Green Island Boulevard / Winston Trails South',topology:'t',radius:20,source:'mapped-neighborhood',arms:[
    arm('east','Green Island Boulevard',heading(n.junctions[1],n.centerlines.greenIsland[1]),7,0,'route',true,70),
    arm('south','Winston Trails South',heading(n.junctions[1],n.centerlines.winstonSouth[4]),7,0,'route',true,70),
    arm('north','Winston Trails South',heading(n.junctions[1],n.centerlines.winstonSouth[6]),7,0,'closed',true,85),
  ]},
  {...n.junctions[2],label:'Winston Trails South / Hypoluxo Road',topology:'t',radius:28,source:'mapped-neighborhood',arms:[
    arm('north','Winston Trails South',heading(n.junctions[2],n.gate),7,0,'route',true,70),
    arm('west','Hypoluxo Road',-Math.PI/2,26,5,'route',true,85),
    arm('east','Hypoluxo Road',Math.PI/2,26,5,'closed',true,100),
  ]},
];
function arterial(id:string,topology:'t'|'cross'):DriveJunction{
  const turn=ROUTE.turns.find(turn=>turn.id===id)!;
  const incoming=pointAtDistance(turn.approachS!-.01),outgoing=pointAtDistance(turn.exitS!+.01);
  const a={x:Math.sin(incoming.yaw),z:Math.cos(incoming.yaw)},b={x:Math.sin(outgoing.yaw),z:Math.cos(outgoing.yaw)};
  const dx=outgoing.x-incoming.x,dz=outgoing.z-incoming.z,det=a.x*b.z-a.z*b.x,t=(dx*b.z-dz*b.x)/det;
  const center={x:incoming.x+a.x*t,z:incoming.z+a.z*t};
  const from=ROUTE.sections[turn.fromSection],to=ROUTE.sections[turn.toSection];
  const arms=[arm('incoming',from.label,incoming.yaw+Math.PI,halfRoad(from)*2,from.medianWidth,'route',true),
    arm('outgoing',to.label,outgoing.yaw,halfRoad(to)*2,to.medianWidth,'route',true),
    arm('straight',from.label,incoming.yaw,halfRoad(from)*2,from.medianWidth,'closed',false,90)];
  if(topology==='cross')arms.push(arm('opposite',to.label,outgoing.yaw+Math.PI,halfRoad(to)*2,to.medianWidth,'closed',false,90));
  return{...center,id,label:`${from.label} / ${to.label}`,topology,radius:44,source:'mapped-topology-compressed-position',arms};
}
function mappedBranch(id:string,wayId:number,greenIslandIndex:number,atStart:boolean):DriveJunction {
  const way=contextReference.roads.find(road=>road.id===wayId)!;
  const longitudeMetres=111320*Math.cos(contextReference.origin.latitude*Math.PI/180);
  const points=way.points.map(([latitude,longitude])=>({
    x:(longitude-contextReference.origin.longitude)*longitudeMetres,
    z:(latitude-contextReference.origin.latitude)*111132,
  }));
  const center=atStart?points[0]:points.at(-1)!;
  const towardBranch=atStart?points[1]:points.at(-2)!;
  return {...center,id,label:`Green Island Boulevard / ${way.name}`,topology:'t',radius:12,source:'mapped-neighborhood',arms:[
    arm('west','Green Island Boulevard',heading(center,n.centerlines.greenIsland[greenIslandIndex-1]),7,0,'route',true,48),
    arm('east','Green Island Boulevard',heading(center,n.centerlines.greenIsland[greenIslandIndex+1]),7,0,'route',true,48),
    arm('side-street',way.name,heading(center,towardBranch),7,0,'closed',true,45),
  ]};
}
function mappedReturnContinuation():DriveJunction{
  const way=contextReference.roads.find(road=>road.id===11205953)!;
  const longitudeMetres=111320*Math.cos(contextReference.origin.latitude*Math.PI/180);
  const points=way.points.slice(14,20).map(([latitude,longitude])=>({
    x:(longitude-contextReference.origin.longitude)*longitudeMetres,
    z:(latitude-contextReference.origin.latitude)*111132,
  }));
  const center=points[0],turn=ROUTE.turns.find(turn=>turn.id==='return-green-island')!;
  const continuation=arm('continuation',way.name,heading(center,points[1]),7,0,'closed',true,45);
  continuation.centerline=points;
  // This junction is where the authored return joins a mapped road, not a
  // claim that a corresponding third road exists in the source geography.
  return{...center,id:'green-island-return',label:'Green Island Boulevard / Invented return connector',topology:'t',radius:12,source:'mapped-neighborhood',arms:[
    arm('west',way.name,heading(center,n.centerlines.greenIsland[13]),7,0,'route',true,48),
    arm('return','Invented return connector',heading(center,pointAtDistance(turn.exitS!-30)),6.8,0,'route',true,48),
    continuation,
  ]};
}
export const DRIVE_JUNCTIONS:readonly DriveJunction[]=Object.freeze([
  ...neighborhood,arterial('hypoluxo-jog','cross'),arterial('jog-lantana','cross'),arterial('lantana-hagen','t'),
  mappedBranch('green-island-terrace-court',11218716,1,true),
  mappedBranch('green-island-desert-inn',11229247,9,false),
  mappedBranch('green-island-turtle-bay',11228918,11,false),
  mappedReturnContinuation(),
]);

/** Road/lot exclusion includes the full width of every added arm, not just its centre. */
export function junctionRoadContains(x:number,z:number,margin=0):boolean{
  return DRIVE_JUNCTIONS.some(junction=>junction.arms.some(arm=>{
    if(arm.centerline){
      let traversed=0;
      for(let i=1;i<arm.centerline.length&&traversed<arm.length;i++){
        const a=arm.centerline[i-1],b=arm.centerline[i],yaw=heading(a,b),length=Math.min(Math.hypot(b.x-a.x,b.z-a.z),arm.length-traversed);
        const dx=x-a.x,dz=z-a.z,along=dx*Math.sin(yaw)+dz*Math.cos(yaw),across=dx*Math.cos(yaw)-dz*Math.sin(yaw);
        if(along>=-margin&&along<=length+margin&&Math.abs(across)<=arm.width/2+margin)return true;
        traversed+=length;
      }
      return false;
    }
    const dx=x-junction.x,dz=z-junction.z,along=dx*Math.sin(arm.yaw)+dz*Math.cos(arm.yaw),across=dx*Math.cos(arm.yaw)-dz*Math.sin(arm.yaw);
    return along>=-margin && along<=arm.length+margin && Math.abs(across)<=arm.width/2+margin;
  }));
}
/** Suppress old curved median/edge decorations here; retain the paved driving path. */
export function junctionInteriorContains(x:number,z:number,margin=0):boolean{
  return DRIVE_JUNCTIONS.some(junction=>Math.hypot(x-junction.x,z-junction.z)<junction.radius+margin);
}
export function junctionActiveRoadClearance(point:JunctionPoint):number{
  const road=nearestRoutePoint(point.x,point.z);return road.distance-halfRoad(ROUTE.sections[road.sectionIndex]);
}
function closure(junction:DriveJunction,arm:JunctionArm,index:number):JunctionClosure{
  // The old corridor clamp remains unchanged. Put the visible barrier inside
  // that envelope, while every board stays outside all active lane envelopes.
  // These offsets are regression-checked against route geometry; do not run a
  // multi-million-query placement search during application module loading.
  const distances:Record<string,number>={'green-island-terrace.north':15.5,'terrace-hypoluxo.east':6,
    'hypoluxo-jog.straight':17.5,'hypoluxo-jog.opposite':17.5,'jog-lantana.straight':18,'jog-lantana.opposite':18,'lantana-hagen.straight':17.5,
    'green-island-terrace-court.side-street':15,'green-island-desert-inn.side-street':15,'green-island-turtle-bay.side-street':15,
    'green-island-return.continuation':28};
  const distance=distances[`${junction.id}.${arm.id}`];
  const at=junctionArmPoint(junction,arm,distance),count=Math.ceil(arm.width/3),span=arm.width/count;
  const barricades=Array.from({length:count},(_,i)=>({...junctionArmPoint(junction,arm,distance,-arm.width/2+span*(i+.5)),width:span-.08}));
  const policeAt=junctionArmPoint(junction,arm,distance+6,arm.width>12?arm.medianWidth/2+(arm.width-arm.medianWidth)/4:0);
  const id=`closure.${junction.id}.${arm.id}`;
  const police={...policeAt,id:`${id}.police`,yaw:policeAt.yaw+Math.PI/2,kind:index%2?'sedan' as const:'suv' as const};
  const obstacles:JunctionObstacle[]=[];
  for(let across=-arm.width/2+.25;across<arm.width/2;across+=.8)obstacles.push({...junctionArmPoint(junction,arm,distance,across),id:`${id}.barrier.${obstacles.length}`,radius:.42});
  for(const along of [-1.45,0,1.45])obstacles.push({...junctionPoint(police,police.yaw,along),id:police.id,radius:1});
  return{...at,id,junctionId:junction.id,armId:arm.id,yaw:at.yaw,width:arm.width,distance,barricades,police,obstacles};
}
export const JUNCTION_CLOSURES:readonly JunctionClosure[]=Object.freeze(DRIVE_JUNCTIONS.flatMap(junction=>junction.arms.filter(arm=>arm.use==='closed').map((arm,index)=>closure(junction,arm,index))));
export const JUNCTION_OBSTACLES:readonly JunctionObstacle[]=Object.freeze(JUNCTION_CLOSURES.flatMap(closure=>closure.obstacles));
