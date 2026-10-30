/**
 * Build the Town Drive CC0 vegetation LODs from the unchanged, ignored downloads.
 * Inputs and license/source URLs: public/assets/drive/vegetation/PROVENANCE.json.
 * Uses installed glTF Transform 4.5.1, meshoptimizer and sharp; no Blender/cloud service.
 * Run from repo root: node tools/prepare-drive-vegetation.mjs
 * Optional: VEGETATION_ONLY=palm|canopy|hedge to rebuild one candidate.
 */
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {center,flatten,join,weld,simplifyPrimitive,prune,dedup,cloneDocument,mergeDocuments,getBounds,unpartition} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
import {mkdir,readFile,writeFile} from 'node:fs/promises';

// Preserve the spatial leaf distribution instead of globally decimating disconnected botanical islands.
// Fit one photographic alpha card to each original connected component using its UV/position covariance.
function leafCards(document, primitive, stride=1, enlargement=1) {
 const xyz=primitive.getAttribute('POSITION').getArray(), uv=primitive.getAttribute('TEXCOORD_0').getArray(), indices=primitive.getIndices().getArray();
 const count=xyz.length/3,parent=Int32Array.from({length:count},(_,i)=>i);
 const find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x]}return x};
 for(let i=0;i<indices.length;i+=3){const a=find(indices[i]);parent[find(indices[i+1])]=a;parent[find(indices[i+2])]=a}
 const components=new Map();for(let i=0;i<count;i++){const a=find(i);if(!components.has(a))components.set(a,[]);components.get(a).push(i)}
 const positions=[],normals=[],texcoords=[],triangles=[];let componentIndex=0;
 for(const vertices of components.values()){
  if(componentIndex++%stride!==0)continue;
  let u0=0,v0=0;const center=[0,0,0];let minU=Infinity,maxU=-Infinity,minV=Infinity,maxV=-Infinity;
  for(const i of vertices){const u=uv[i*2],v=uv[i*2+1];u0+=u;v0+=v;minU=Math.min(minU,u);maxU=Math.max(maxU,u);minV=Math.min(minV,v);maxV=Math.max(maxV,v);for(let k=0;k<3;k++)center[k]+=xyz[i*3+k]}
  u0/=vertices.length;v0/=vertices.length;for(let k=0;k<3;k++)center[k]/=vertices.length;
  const spanU=Math.max(1e-7,maxU-minU),spanV=Math.max(1e-7,maxV-minV);let uu=0,vv=0,uvv=0;const up=[0,0,0],vp=[0,0,0];
  for(const i of vertices){const u=(uv[i*2]-u0)/spanU,v=(uv[i*2+1]-v0)/spanV;uu+=u*u;vv+=v*v;uvv+=u*v;for(let k=0;k<3;k++){up[k]+=u*(xyz[i*3+k]-center[k]);vp[k]+=v*(xyz[i*3+k]-center[k])}}
  const det=uu*vv-uvv*uvv;if(Math.abs(det)<1e-10)continue;
  const a=up.map((n,k)=>(n*vv-vp[k]*uvv)/det),b=vp.map((n,k)=>(n*uu-up[k]*uvv)/det);
  const normal=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];const len=Math.hypot(...normal);if(len<1e-9)continue;for(let k=0;k<3;k++)normal[k]/=len;
  const base=positions.length/3;
  for(const [u,v]of[[minU,minV],[maxU,minV],[maxU,maxV],[minU,maxV]]){for(let k=0;k<3;k++)positions.push(center[k]+enlargement*(a[k]*(u-u0)/spanU+b[k]*(v-v0)/spanV));texcoords.push(u,v);normals.push(...normal)}
  triangles.push(base,base+1,base+2,base,base+2,base+3);
 }
 const buffer=document.getRoot().listBuffers()[0];
 for(const semantic of primitive.listSemantics())primitive.setAttribute(semantic,null);
 primitive.setAttribute('POSITION',document.createAccessor().setType('VEC3').setArray(new Float32Array(positions)).setBuffer(buffer));
 primitive.setAttribute('NORMAL',document.createAccessor().setType('VEC3').setArray(new Float32Array(normals)).setBuffer(buffer));
 primitive.setAttribute('TEXCOORD_0',document.createAccessor().setType('VEC2').setArray(new Float32Array(texcoords)).setBuffer(buffer));
 primitive.setIndices(document.createAccessor().setType('SCALAR').setArray(new Uint32Array(triangles)).setBuffer(buffer));
 console.log('leaf cards',components.size,'->',triangles.length/6,'stride',stride);
}

const root='assets/source/local/town-drive/vegetation-v001';
const out='public/assets/drive/vegetation';await mkdir(out,{recursive:true});
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);await MeshoptSimplifier.ready;
for(const spec of [
 {id:'palm',file:'mature-date-palm-tree.glb',near:.5,far:.12},
 {id:'canopy',file:'island_tree_02/island_tree_02.gltf',alpha:'island_tree_02/alpha.png',match:'leaves',near:.045,far:.008,leafNear:[2,1.45],leafFar:[6,2.1]},
 {id:'hedge',file:'island_tree_02/island_tree_02.gltf',alpha:'island_tree_02/alpha.png',match:'leaves',near:.012,far:.002,leafNear:[6,2.2],leafFar:[18,3.7]}
]){
 if(process.env.VEGETATION_ONLY && process.env.VEGETATION_ONLY!==spec.id)continue;
 const doc=await io.read(root+'/'+spec.file);
 if(spec.id==='hedge'){
  for(const mesh of doc.getRoot().listMeshes())for(const primitive of [...mesh.listPrimitives()])if(!/leaves/.test(primitive.getMaterial().getName()))mesh.removePrimitive(primitive);
  for(const node of doc.getRoot().listNodes())if(node.getMesh())node.setScale([.8,.4,.8]);
  await doc.transform(prune());
 }
 const alphaTex=new Set();
 if(spec.alpha){
  for(const mat of doc.getRoot().listMaterials())if(mat.getName().includes(spec.match)){
   const tex=mat.getBaseColorTexture();if(!tex)continue;
   const {width,height}=await sharp(tex.getImage()).metadata();
   const alpha=await sharp(await readFile(root+'/'+spec.alpha)).resize(width,height).greyscale().raw().toBuffer();
   const rgba=await sharp(tex.getImage()).removeAlpha().joinChannel(alpha,{raw:{width,height,channels:1}}).png().toBuffer();
   tex.setImage(rgba).setMimeType('image/png');alphaTex.add(tex);mat.setAlphaMode('MASK').setAlphaCutoff(.4).setDoubleSided(true);
  }
 }
 for(const tex of doc.getRoot().listTextures()){
  const image=sharp(tex.getImage()).resize({width:1024,height:1024,fit:'inside',withoutEnlargement:true});
  if(alphaTex.has(tex))tex.setImage(await image.png({compressionLevel:9}).toBuffer()).setMimeType('image/png');
  else tex.setImage(await image.jpeg({quality:86}).toBuffer()).setMimeType('image/jpeg');
 }
 await doc.transform(center({pivot:'below'}),flatten(),join(),weld(),dedup());
 const original=getBounds(doc.getRoot().getDefaultScene());
 const near=cloneDocument(doc),far=cloneDocument(doc);
 for(const [lod,farLevel]of[[near,false],[far,true]]){
  for(const mesh of lod.getRoot().listMeshes())for(const primitive of mesh.listPrimitives()){
   if(spec.id==='canopy' && /leaves/.test(primitive.getMaterial().getName()) || spec.id==='hedge') {
    const [stride,enlargement]=farLevel?spec.leafFar:spec.leafNear;
    leafCards(lod,primitive,stride,enlargement);
   }
   else simplifyPrimitive(primitive,{simplifier:MeshoptSimplifier,ratio:farLevel?spec.far:spec.near,error:farLevel?.12:.05});
  }
  await lod.transform(prune());
 }
 function name(d,level){for(const [i,node] of d.getRoot().listNodes().entries())if(node.getMesh()){node.setName(spec.id+'.'+level+'.'+i);node.getMesh().setName(spec.id+'.'+level+'.'+i)}}
 name(near,'near');name(far,'far');
 const triangles=d=>d.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((a,p)=>a+(p.getIndices()?.getCount()??0)/3,0),0);
 const metrics={id:spec.id,sourceTriangles:triangles(doc),nearTriangles:triangles(near),farTriangles:triangles(far),bounds:original};
 const map=mergeDocuments(near,far);const scene=near.getRoot().getDefaultScene();for(const child of map.get(far.getRoot().getDefaultScene()).listChildren())scene.addChild(child);
 await near.transform(dedup(),prune(),unpartition());
 await io.write(out+'/'+spec.id+'.glb',near);await writeFile(root+'/'+spec.id+'-metrics.json',JSON.stringify(metrics,null,2));console.log(JSON.stringify(metrics));
}
