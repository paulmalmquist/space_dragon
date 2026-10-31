import { NEIGHBORHOOD } from './neighborhood.ts';
import { ROUTE, nearestRoutePoint, pointAtDistance } from './route.ts';

export interface JunctionPoint { x:number; z:number }
export interface JunctionArm {
  id:string; street:string; yaw:number; width:number; medianWidth:number; length:number;
  use:'route'|'traffic-return'|'closed'; existingPavement:boolean;
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
  sources:[
    {id:'hypoluxo-jog',url:'https://api.openstreetmap.org/api/0.6/map?bbox=-80.147,26.5718,-80.145,26.5735',ways:[82790090,255634415,408054527,1184211812,682328908,1413175165]},
    {id:'jog-lantana',url:'https://api.openstreetmap.org/api/0.6/map?bbox=-80.1475,26.5865,-80.1445,26.5900',ways:[219363112,1152922208,958803393,1384230477,134602666,534819596,682328906,682328907]},
    {id:'lantana-hagen',url:'https://api.openstreetmap.org/api/0.6/map?bbox=-80.1610,26.5893,-80.1577,26.5907',ways:[1150213657,1150213658,682328907,1306077971,682328906]},
  ],
});

const halfRoad=(section:typeof ROUTE.sections[number])=>section.lanes*section.laneWidth+section.medianWidth/2;
const heading=(a:JunctionPoint,b:JunctionPoint)=>Math.atan2(b.x-a.x,b.z-a.z);
export const junctionPoint=(origin:JunctionPoint,yaw:number,along:number,across=0):JunctionPoint=>({x:origin.x+Math.sin(yaw)*along+Math.cos(yaw)*across,z:origin.z+Math.cos(yaw)*along-Math.sin(yaw)*across});
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
  {...n.junctions[1],label:'Green Island Boulevard / Green Island Terrace',topology:'t',radius:20,source:'mapped-neighborhood',arms:[
    arm('east','Green Island Boulevard',heading(n.junctions[1],n.centerlines.greenIsland[1]),7,0,'route',true,70),
    arm('south','Green Island Terrace',heading(n.junctions[1],n.centerlines.terrace[4]),7,0,'route',true,70),
    arm('north','Green Island Terrace',heading(n.junctions[1],n.centerlines.terrace[6]),7,0,'closed',true,85),
  ]},
  {...n.junctions[2],label:'Green Island Terrace / Hypoluxo Road',topology:'t',radius:28,source:'mapped-neighborhood',arms:[
    arm('north','Green Island Terrace',heading(n.junctions[2],n.gate),7,0,'route',true,70),
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
export const DRIVE_JUNCTIONS:readonly DriveJunction[]=Object.freeze([...neighborhood,arterial('hypoluxo-jog','cross'),arterial('jog-lantana','cross'),arterial('lantana-hagen','t')]);

/** Road/lot exclusion includes the full width of every added arm, not just its centre. */
export function junctionRoadContains(x:number,z:number,margin=0):boolean{
  return DRIVE_JUNCTIONS.some(junction=>junction.arms.some(arm=>{
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
  const distances:Record<string,number>={'green-island-terrace.north':15.5,'terrace-hypoluxo.east':14,
    'hypoluxo-jog.straight':17.5,'hypoluxo-jog.opposite':17.5,'jog-lantana.straight':18,'jog-lantana.opposite':18,'lantana-hagen.straight':17.5};
  const distance=distances[`${junction.id}.${arm.id}`];
  const at=junctionPoint(junction,arm.yaw,distance),count=Math.ceil(arm.width/3),span=arm.width/count;
  const barricades=Array.from({length:count},(_,i)=>({...junctionPoint(junction,arm.yaw,distance,-arm.width/2+span*(i+.5)),width:span-.08}));
  const policeAt=junctionPoint(junction,arm.yaw,distance+6,arm.width>12?arm.medianWidth/2+(arm.width-arm.medianWidth)/4:0);
  const id=`closure.${junction.id}.${arm.id}`;
  const police={...policeAt,id:`${id}.police`,yaw:arm.yaw+Math.PI/2,kind:index%2?'sedan' as const:'suv' as const};
  const obstacles:JunctionObstacle[]=[];
  for(let across=-arm.width/2+.25;across<arm.width/2;across+=.8)obstacles.push({...junctionPoint(junction,arm.yaw,distance,across),id:`${id}.barrier.${obstacles.length}`,radius:.42});
  for(const along of [-1.45,0,1.45])obstacles.push({...junctionPoint(police,police.yaw,along),id:police.id,radius:1});
  return{...at,id,junctionId:junction.id,armId:arm.id,yaw:arm.yaw,width:arm.width,distance,barricades,police,obstacles};
}
export const JUNCTION_CLOSURES:readonly JunctionClosure[]=Object.freeze(DRIVE_JUNCTIONS.flatMap(junction=>junction.arms.filter(arm=>arm.use==='closed').map((arm,index)=>closure(junction,arm,index))));
export const JUNCTION_OBSTACLES:readonly JunctionObstacle[]=Object.freeze(JUNCTION_CLOSURES.flatMap(closure=>closure.obstacles));
