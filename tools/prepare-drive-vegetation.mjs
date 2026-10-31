/**
 * Build the Town Drive CC0 vegetation LODs from the unchanged, ignored downloads.
 * Inputs and license/source URLs: public/assets/drive/vegetation/PROVENANCE.json.
 * Uses installed glTF Transform 4.5.1, meshoptimizer and sharp; no Blender/cloud service.
 * Run from repo root: node tools/prepare-drive-vegetation.mjs
 * Optional: VEGETATION_ONLY=palm|canopy|hedge to rebuild one candidate.
 * Distant-only tier: VEGETATION_DISTANT_ONLY=1 node tools/prepare-drive-vegetation.mjs
 * This derives separate 170m+ files from the unchanged approved near/mid GLBs.
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

// Keep complete disconnected palm leaflets, never flatten solid fronds into
// opaque rectangles. Rotate the selection within each block to retain both
// sides of fronds; enlarge selected leaflets around their own centre at distance.
function thinComponents(document, primitive, stride, enlargement) {
 const xyz=primitive.getAttribute('POSITION').getArray(),indices=primitive.getIndices().getArray();
 const count=xyz.length/3,parent=Int32Array.from({length:count},(_,i)=>i);
 const find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x]}return x};
 for(let i=0;i<indices.length;i+=3){const root=find(indices[i]);parent[find(indices[i+1])]=root;parent[find(indices[i+2])]=root}
 const components=new Map();for(let i=0;i<count;i++){const root=find(i);if(!components.has(root))components.set(root,[]);components.get(root).push(i)}
 const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
 for(let i=0;i<count;i++)for(let axis=0;axis<3;axis++){bounds.min[axis]=Math.min(bounds.min[axis],xyz[i*3+axis]);bounds.max[axis]=Math.max(bounds.max[axis],xyz[i*3+axis])}
 const kept=new Set();let number=0;
 for(const [root,vertices] of components){
  const block=Math.floor(number/stride),chosen=(block+Math.floor(block/7))%stride;
  if(number++%stride!==chosen)continue;
  kept.add(root);const center=[0,0,0];
  for(const i of vertices)for(let axis=0;axis<3;axis++)center[axis]+=xyz[i*3+axis]/vertices.length;
  let longest=0;let direction=[0,1,0];
  for(const a of vertices)for(const b of vertices){const d=[xyz[a*3]-xyz[b*3],xyz[a*3+1]-xyz[b*3+1],xyz[a*3+2]-xyz[b*3+2]],length=Math.hypot(...d);if(length>longest){longest=length;direction=d.map(v=>v/length)}}
  // Widen leaflets to restore distant coverage without extending the frond tips
  // (uniform enlargement noticeably changed the palm's crown silhouette).
  const alongScale=1.02,acrossScale=enlargement*enlargement/alongScale;
  const expanded=vertices.map(i=>{const d=[xyz[i*3]-center[0],xyz[i*3+1]-center[1],xyz[i*3+2]-center[2]],along=d.reduce((sum,v,k)=>sum+v*direction[k],0);return d.map((v,k)=>along*direction[k]*alongScale+(v-along*direction[k])*acrossScale)});
  let fit=1;for(const d of expanded)for(let axis=0;axis<3;axis++)if(Math.abs(d[axis])>1e-10)fit=Math.min(fit,((d[axis]>0?bounds.max[axis]:bounds.min[axis])-center[axis])/d[axis]);
  for(let v=0;v<vertices.length;v++)for(let axis=0;axis<3;axis++)xyz[vertices[v]*3+axis]=center[axis]+expanded[v][axis]*fit;
 }
 const retained=[];for(let i=0;i<indices.length;i+=3)if(kept.has(find(indices[i])))retained.push(indices[i],indices[i+1],indices[i+2]);
 primitive.setIndices(document.createAccessor().setType('SCALAR').setArray(new Uint32Array(retained)).setBuffer(document.getRoot().listBuffers()[0]));
 console.log('solid leaflets',components.size,'->',kept.size,'stride',stride);
}

const root='assets/source/local/town-drive/vegetation-v001';
const out='public/assets/drive/vegetation';await mkdir(out,{recursive:true});
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);await MeshoptSimplifier.ready;
if(process.env.VEGETATION_DISTANT_ONLY==='1'){
 for(const id of ['palm','canopy','hedge']){
  if(process.env.VEGETATION_ONLY&&process.env.VEGETATION_ONLY!==id)continue;
  const doc=await io.read(out+'/'+id+'.glb');
  for(const node of [...doc.getRoot().listNodes()])if(node.getMesh()&&!node.getName().includes('.far.'))node.dispose();
  await doc.transform(prune());
  for(const node of [...doc.getRoot().listNodes()]){
   const mesh=node.getMesh();if(!mesh)continue;
   node.setName(node.getName().replace('.far.','.distant.'));mesh.setName(mesh.getName().replace('.far.','.distant.'));
   for(const primitive of [...mesh.listPrimitives()]){
    const name=primitive.getMaterial().getName();
    if(id==='palm'&&name==='Ripe dates'){mesh.removePrimitive(primitive);continue;}
    if(id==='palm'&&/foliage/i.test(name))thinComponents(doc,primitive,4,1.85);
    else if(id==='palm'&&name==='leaf')thinComponents(doc,primitive,3,1.65);
    else if(id==='canopy'&&/leaves/.test(name))leafCards(doc,primitive,5,2.3);
    else if(id==='hedge')leafCards(doc,primitive,4,2.05);
    else simplifyPrimitive(primitive,{simplifier:MeshoptSimplifier,ratio:id==='palm'?.56:.25,error:.2});
   }
   if(!mesh.listPrimitives().length)node.dispose();
  }
  await doc.transform(weld(),prune());
  for(const material of doc.getRoot().listMaterials()){
   material.setNormalTexture(null).setMetallicRoughnessTexture(null).setOcclusionTexture(null).setEmissiveTexture(null);
   material.setMetallicFactor(0).setRoughnessFactor(.95);
   for(const extension of material.listExtensions())extension.dispose();
  }
  await doc.transform(prune());
  for(const texture of doc.getRoot().listTextures()){
   const image=sharp(texture.getImage()).resize({width:512,height:512,fit:'inside',withoutEnlargement:true});
   if(texture.getMimeType()==='image/png')texture.setImage(await image.png({compressionLevel:9}).toBuffer());
   else texture.setImage(await image.jpeg({quality:82}).toBuffer()).setMimeType('image/jpeg');
  }
  await doc.transform(dedup(),prune(),unpartition());
  const triangles=doc.getRoot().listMeshes().reduce((sum,mesh)=>sum+mesh.listPrimitives().reduce((n,p)=>n+p.getIndices().getCount()/3,0),0);
  await io.write(out+'/'+id+'-distant.glb',doc);
  console.log(JSON.stringify({id,lod:'distant',triangles,bounds:getBounds(doc.getRoot().getDefaultScene())}));
 }
 process.exit(0);
}
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
