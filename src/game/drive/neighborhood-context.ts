import source from './neighborhood-context-source.json' with { type: 'json' };
import { NEIGHBORHOOD } from './neighborhood.ts';
import { ROUTE, nearestRoutePoint } from './route.ts';
import { junctionRoadContains } from './junctions.ts';

export interface ContextPoint { x:number; z:number }
export interface ContextRoad { id:number; name:string; width:number; role:string; points:ContextPoint[] }
export interface ContextLot extends ContextPoint { yaw:number; seed:number; side:number; driveLength:number; compact:boolean; estimated:true; roadId:number }
const latitudeMetres=111132,longitudeMetres=111320*Math.cos(source.origin.latitude*Math.PI/180);
export function projectNeighborhoodPoint([latitude,longitude]:readonly number[]):ContextPoint {
  return{x:(longitude-source.origin.longitude)*longitudeMetres,z:(latitude-source.origin.latitude)*latitudeMetres};
}
const bounds=source.contextBounds;
export function neighborhoodContextOwnsLand(x:number,z:number):boolean {
  return x>=bounds.minX && x<=bounds.maxX && z>=bounds.minZ && z<=bounds.maxZ;
}
export function pointSegmentDistance(point:ContextPoint,a:ContextPoint,b:ContextPoint):number {
  const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.z-a.z)*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(point.x-a.x-t*dx,point.z-a.z-t*dz);
}
function polygonBounds(points:readonly ContextPoint[]){
  return{minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minZ:Math.min(...points.map(p=>p.z)),maxZ:Math.max(...points.map(p=>p.z))};
}
export function pointInNeighborhoodPolygon(point:ContextPoint,points:readonly ContextPoint[]):boolean {
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j];
    if((a.z>point.z)!==(b.z>point.z) && point.x<(b.x-a.x)*(point.z-a.z)/(b.z-a.z)+a.x)inside=!inside;
  }
  return inside;
}
const waters=source.waters.map(water=>{
  const points=water.points.map(projectNeighborhoodPoint);points.pop(); // OSM repeats the closed first node.
  return{id:water.id,label:water.label,points,bounds:polygonBounds(points)};
});
const roads:ContextRoad[]=source.roads.map(road=>({id:road.id,name:road.name,width:road.widthEstimate,role:road.role,points:road.points.map(projectNeighborhoodPoint)}));
// The main collector lives in the route source, while the context source owns its neighbors.
roads.push({id:774605908,name:NEIGHBORHOOD.streets[2].label,width:7,role:'route-context',points:NEIGHBORHOOD.centerlines.terrace});
const segments=roads.flatMap(road=>road.points.slice(1).map((b,i)=>({a:road.points[i],b,width:road.width,roadId:road.id})));
const courts=roads.filter(road=>road.role==='context'&&/Court|Terrace/.test(road.name)).flatMap(road=>[0,road.points.length-1].flatMap(index=>{
  const at=road.points[index],previous=road.points[index===0?1:index-1];
  if(!neighborhoodContextOwnsLand(at.x,at.z)||nearestRoutePoint(at.x,at.z).distance<12)return [];
  if(segments.some(segment=>segment.roadId!==road.id&&pointSegmentDistance(at,segment.a,segment.b)<.6))return [];
  return[{...at,roadId:road.id,radius:8,entryYaw:Math.atan2(previous.x-at.x,previous.z-at.z),estimatedRadius:true}];
}));

/** Exact mapped water with a caller-selected dry-bank setback, in local metres. */
export function neighborhoodWaterContains(x:number,z:number,margin=0):boolean {
  const point={x,z};
  return waters.some(water=>{
    const b=water.bounds;if(x<b.minX-margin||x>b.maxX+margin||z<b.minZ-margin||z>b.maxZ+margin)return false;
    return pointInNeighborhoodPolygon(point,water.points) || water.points.some((a,i)=>pointSegmentDistance(point,a,water.points[(i+1)%water.points.length])<=margin);
  });
}
/** Includes source roads beyond the playable route; callers keep plants/lots out of them. */
export function neighborhoodContextRoadContains(x:number,z:number,margin=0):boolean {
  if(x<bounds.minX-margin||x>bounds.maxX+margin||z<bounds.minZ-margin||z>bounds.maxZ+margin)return false;
  return segments.some(segment=>pointSegmentDistance({x,z},segment.a,segment.b)<segment.width/2+margin)
    || courts.some(court=>Math.hypot(x-court.x,z-court.z)<court.radius+margin);
}

function estimatedLots():ContextLot[]{
  const lots:ContextLot[]=[];
  // These are deliberately estimated buildings, not extracted parcels or mapped footprints.
  // Tight 24m frontages and an 18m centre setback fit the actual residential street spacing.
  for(const road of roads){
    if(road.role==='inbound-gate'||road.name==='Winston Trails Boulevard')continue;
    let travelled=0,next=17;
    for(let index=1;index<road.points.length;index++){
      const a=road.points[index-1],b=road.points[index],length=Math.hypot(b.x-a.x,b.z-a.z),yaw=Math.atan2(b.x-a.x,b.z-a.z);
      while(next<travelled+length){
        const t=(next-travelled)/length,p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
        for(const side of [-1,1]){
          const setback=road.width/2+15,site={x:p.x+Math.cos(yaw)*side*setback,z:p.z-Math.sin(yaw)*side*setback};
          if(!neighborhoodContextOwnsLand(site.x,site.z)||site.z<-254||Math.hypot(site.x,site.z)<34)continue;
          if(neighborhoodWaterContains(site.x,site.z,20)||neighborhoodContextRoadContains(site.x,site.z,12.5)||junctionRoadContains(site.x,site.z,13))continue;
          if(Math.hypot(site.x-NEIGHBORHOOD.gate.x,site.z-NEIGHBORHOOD.gate.z)<29)continue;
          const near=nearestRoutePoint(site.x,site.z),section=ROUTE.sections[near.sectionIndex];
          if(near.distance<section.lanes*section.laneWidth+section.medianWidth/2+13||near.distance>215)continue;
          if(lots.some(lot=>Math.hypot(lot.x-site.x,lot.z-site.z)<24))continue;
          lots.push({...site,yaw:yaw+side*Math.PI/2,seed:road.id+Math.round(next)*7+(side===1?1:2),side,driveLength:7.6,compact:true,estimated:true,roadId:road.id});
        }
        next+=24;
      }
      travelled+=length;
    }
  }
  // Court frontage must be authored separately from line sampling. Keep the shore clear.
  for(const [index,site]of [{x:-27,z:-2,yaw:-Math.PI/2},{x:-17,z:24,yaw:-.55},{x:13,z:28,yaw:.4}].entries()){
    if(!neighborhoodWaterContains(site.x,site.z,18)&&!neighborhoodContextRoadContains(site.x,site.z,12.5)){
      // Authored court frontage wins over generic sampling along the neighboring street.
      for(let i=lots.length-1;i>=0;i--)if(Math.hypot(lots[i].x-site.x,lots[i].z-site.z)<24)lots.splice(i,1);
      // Measured along each estimated garage centreline to the 10.5m court edge;
      // a small overlap prevents a visible grass seam at the rounded pavement.
      lots.push({...site,seed:7101+index,side:-1,driveLength:[11.55,13.4,16.5][index],compact:true,estimated:true,roadId:11227044});
    }
  }
  return lots;
}

/** Simple-ring ear clipping keeps the exact concave lake outline, without a hull/fan shortcut. */
export function triangulateNeighborhoodPolygon(points:readonly ContextPoint[]):number[]{
  const signed=points.reduce((sum,p,i)=>sum+p.x*points[(i+1)%points.length].z-p.z*points[(i+1)%points.length].x,0);
  const remaining=Array.from({length:points.length},(_,i)=>i);if(signed<0)remaining.reverse();
  const indices:number[]=[],cross=(a:ContextPoint,b:ContextPoint,c:ContextPoint)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
  const inside=(p:ContextPoint,a:ContextPoint,b:ContextPoint,c:ContextPoint)=>cross(a,b,p)>=-1e-8&&cross(b,c,p)>=-1e-8&&cross(c,a,p)>=-1e-8;
  let attempts=0;
  while(remaining.length>3 && attempts++<points.length*points.length){
    let clipped=false;
    for(let i=0;i<remaining.length;i++){
      const a=remaining[(i+remaining.length-1)%remaining.length],b=remaining[i],c=remaining[(i+1)%remaining.length];
      if(cross(points[a],points[b],points[c])<=1e-8)continue;
      if(remaining.some(v=>v!==a&&v!==b&&v!==c&&inside(points[v],points[a],points[b],points[c])))continue;
      indices.push(a,c,b);remaining.splice(i,1);clipped=true;break;
    }
    if(!clipped)throw new Error('Invalid simple neighborhood water polygon');
  }
  if(remaining.length===3)indices.push(remaining[0],remaining[2],remaining[1]);
  return indices;
}

export const NEIGHBORHOOD_CONTEXT=Object.freeze({bounds,roads,waters,courts,lots:estimatedLots(),attribution:'© OpenStreetMap contributors · ODbL',attributionUrl:source.attributionUrl,estimatedBuildings:true});
