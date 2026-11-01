// Build a local comparison from observed player screenshots, never mock renders.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const before=JSON.parse(await readFile(path.join(root,process.argv[2]||'artifacts/unity-town-drive-art-v002/before/report.json'),'utf8'));
const after=JSON.parse(await readFile(path.join(root,process.argv[3]||'artifacts/unity-town-drive-art-v002/after/report.json'),'utf8'));
const version=process.argv[4]||'v002';if(!/^v[0-9]{3}$/.test(version))throw Error('Use a version such as v003.');
const sampleBefore=process.argv[5]?JSON.parse(await readFile(path.join(root,process.argv[5]),'utf8')):before;
const sampleAfter=process.argv[6]?JSON.parse(await readFile(path.join(root,process.argv[6]),'utf8')):after;
assert.equal(Boolean(process.argv[5]),Boolean(process.argv[6]),'Provide both separate timing reports.');
const identity=report=>report.artifacts.filter(item=>/\.(data|wasm)$/.test(item.path)).map(item=>[item.path,item.sha256]).sort();
if(process.argv[5]) {
 assert.equal(identity(before).length,2); assert.equal(identity(after).length,2);
 assert.deepEqual(identity(sampleBefore),identity(before),'Before timing must use the frozen before player.');
 assert.deepEqual(identity(sampleAfter),identity(after),'After timing must use the visually inspected player.');
 assert.deepEqual(sampleBefore.viewport,sampleAfter.viewport);
 assert.equal(sampleBefore.warmedStationaryWindow.graphicsDeviceType,sampleAfter.warmedStationaryWindow.graphicsDeviceType);
 assert.equal(sampleBefore.warmedStationaryWindow.graphicsDeviceName,sampleAfter.warmedStationaryWindow.graphicsDeviceName);
}
const timingNote=version==='v004'?(process.argv[5]&&process.argv[6]?'Separate consecutive short runs are shown below; the driven screenshots come from the full-lap runs.':'These full-lap timing samples were not controlled for concurrent workloads; do not infer a performance change from them.'):'Short samples from the observed runs.';
const folder=path.join(root,'artifacts/unity/town-drive-art-'+version);await mkdir(folder,{recursive:true});
const escape=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const titles={v002:'Surface & landscape pass',v003:'Foliage, facades & cabin',v004:'Reference road paint & Blender planting'};
const descriptions={v002:'Scanned roof tiles and stucco, physical texture scale, fuller low planting beds, balanced daylight and shade.',v003:'Fuller palm crowns, facade and garage relief, fine cabin materials and a live rear-camera-style mirror.',v004:'Unmarked residential streets, connected paint at the gate and arterial, and Blender-authored fan palms, feather palms and dense hedges.'};
let references='';
if(version==='v004') {
 const referenceFrames=[['0035','00:35 · short splitter approach and feather palms'],['0135','02:15 · hedge walls and arterial lanes'],['0255','04:15 · dense fan palms and median edge']];
 let figures='';
 for(const [seconds,label] of referenceFrames) {
  const name=`reference-${seconds}.jpg`;
  await copyFile(path.join(root,`artifacts/unity-town-drive-art-v004/reference/detail/IMG_5754-${seconds}s.jpg`),path.join(folder,name));
  figures+=`<figure><img src="town-drive-art-${version}/${name}"><figcaption>${escape(label)}</figcaption></figure>`;
 }
 references=`<section><h2>Observed reference frames</h2><p>Local excerpts from IMG_5754.MOV. The recorded drive is wet; this iteration retains dry-day lighting and pavement.</p><div class="reference">${figures}</div></section>`;
}
let sections='';
const views=[['home-chase','Home / street approach'],['cabin-forward','Driver view'],['cabin-left','Look left'],['cabin-right','Look right']];
if(version==='v004')views.push(['route-green-island','Green Island · residential road'],['route-splitter-approach','Green Island · junction approach'],['route-winston-trails','Winston Trails South'],['route-visitors-gate','Visitors gate'],['route-hypoluxo','Hypoluxo Road'],['route-jog-palms','Jog Road · palms'],['route-lantana','Lantana Road'],['route-hagen-ranch','Hagen Ranch Road']);
for(const [name,label] of views){
 const a=before.screenshots.find(s=>s.name===name),b=after.screenshots.find(s=>s.name===name);if(!a||!b)throw Error('Missing observed screenshot: '+name);
 const samePose=Math.hypot(a.state.x-b.state.x,a.state.z-b.state.z)<.02&&Math.abs(a.state.yaw-b.state.yaw)<.002;
 for(const [label,item] of [['before',a],['after',b]])await copyFile(item.path,path.join(folder,`${name}-${label}.png`));
 sections+=`<section><h2>${label}</h2><p>${samePose?'Same vehicle pose; ambient traffic/animation timing can differ.':'Observed player views; full-lap views use the same bounded driving controller, with no pose teleport. Vehicle poses and ambient timing differ; recorded pose is approximate post-capture telemetry. Compare geometry and materials, not pixel alignment.'}</p><div class="pair"><figure><img src="town-drive-art-${version}/${name}-before.png"><figcaption>Before</figcaption></figure><figure><img src="town-drive-art-${version}/${name}-after.png"><figcaption>After</figcaption></figure></div></section>`;
}
if(version==='v004') {
 const taper=after.screenshots.find(item=>item.name==='route-local-taper');
 if(!taper)throw Error('Missing driven inspection of the short local yellow taper.');
 await copyFile(taper.path,path.join(folder,'route-local-taper-after.png'));
 sections+=`<section><h2>Short local approach · after</h2><p>Additional driven view before the junction, captured to inspect the localized yellow taper. This is an after-only inspection, not a matched pair.</p><figure><img src="town-drive-art-${version}/route-local-taper-after.png"><figcaption>Green Island stop approach · after</figcaption></figure></section>`;
}
if(process.argv[7]) {
 const detail=JSON.parse(await readFile(path.join(root,process.argv[7]),'utf8'));
 assert.equal(detail.result,'CAPTURED');
 assert.deepEqual(identity(detail),identity(after),'Supplemental views must use the visually inspected player.');
 let figures='';
 for(const name of ['hedge-stop-forward','hedge-right-side']) {
  const shot=detail.screenshots.find(item=>item.name===name);assert(shot,'Missing hedge inspection view.');
  assert(Math.abs(shot.beforeCapture.speed)<.01&&Math.abs(shot.state.speed)<.01,'Hedge inspection is stopped within 0.01 m/s.');
  await copyFile(shot.path,path.join(folder,name+'.png'));
  figures+=`<figure><img src="town-drive-art-${version}/${name}.png"><figcaption>${escape(name==='hedge-right-side'?'Look right · added hedge row':'Stopped on Hypoluxo · forward')}</figcaption></figure>`;
 }
 sections+=`<section><h2>Roadside hedge inspection · after</h2><p>Driven from home to the added hedge row, then stopped and looked right using normal cabin controls. This is an after-only inspection of planting beside an existing wall. Dense continuity is improved; foliage remains dark and repetitive.</p><div class="pair">${figures}</div></section>`;
}
function timing(r){const w=r.warmedStationaryWindow;return `${w.meanFrameMs.toFixed(2)} ms mean · ${w.p95FrameMs.toFixed(1)} ms p95 (${w.frameSampleCount} stationary frames)`;}
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Town Drive · ${escape(titles[version]||titles.v002)} review</title><style>body{margin:0;background:#111a1e;color:#e8ece9;font:16px/1.55 system-ui}main{max-width:1800px;margin:auto;padding:32px}h1{font-size:36px;line-height:1.15}h2{margin-top:42px}p{color:#b5c3c4;max-width:1050px}a{color:#b4dba0}.reference{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;max-width:1100px}.reference img{max-height:620px;object-fit:contain}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0;background:#202c31;border-radius:8px;overflow:hidden}img{display:block;width:100%}figcaption{padding:10px 16px}code{overflow-wrap:anywhere}table{border-collapse:collapse}td,th{text-align:left;border-bottom:1px solid #34434a;padding:10px 18px 10px 0}@media(max-width:900px){.pair{grid-template-columns:1fr}main{padding:18px}}</style><main><h1>Town Drive<br>${escape(titles[version]||titles.v002)}</h1><p>Observed Unity player, 1280 × 720. ${escape(descriptions[version]||descriptions.v002)} Original mapped road geometry and gameplay are retained.</p><p><a href="http://127.0.0.1:5208/space-dragon-town-drive/">Open the local playable build</a> · C switches camera · Q/E looks sideways.</p><p>${escape(timingNote)}</p><table><tr><th>Build</th><th>Observed check</th><th>Short frame sample</th></tr><tr><td>Before</td><td>${escape(sampleBefore.result)} · ${escape(sampleBefore.runId)}</td><td>${escape(timing(sampleBefore))}</td></tr><tr><td>After</td><td>${escape(sampleAfter.result)} · ${escape(sampleAfter.runId)}</td><td>${escape(timing(sampleAfter))}</td></tr>${sampleBefore.warmedCabinWindow?`<tr><td>Before · cabin</td><td>240 rendered frames</td><td>${escape(timing({warmedStationaryWindow:sampleBefore.warmedCabinWindow}))}</td></tr>`:''}${sampleAfter.warmedCabinWindow?`<tr><td>After · cabin with live rear view</td><td>240 rendered frames</td><td>${escape(timing({warmedStationaryWindow:sampleAfter.warmedCabinWindow}))}</td></tr>`:''}</table><p>${escape(sampleAfter.warmedStationaryWindow.graphicsDeviceType)} · ${escape(sampleAfter.warmedStationaryWindow.graphicsDeviceName)}. Update wall intervals, not GPU timings or an endurance benchmark. Human visual approval remains open.</p>${references}${sections}<p>Texture sources: <a href="https://polyhaven.com/a/clay_roof_tiles_02">Clay Roof Tiles 02</a>, <a href="https://polyhaven.com/a/grey_roof_tiles_02">Grey Roof Tiles 02</a>, <a href="https://polyhaven.com/a/white_stucco">White Stucco</a>, <a href="https://polyhaven.com/a/palm_tree_bark">Palm Tree Bark</a>, <a href="https://polyhaven.com/a/island_tree_02">Island Tree 02</a> · CC0 · Powered by Poly Haven. Sources and conversion hashes are retained in the module provenance.</p><p>After build data: <code>${escape(after.artifacts.find(a=>a.path.endsWith('.data'))?.sha256)}</code></p></main></html>`;
const target=path.join(root,version==='v002'?'artifacts/unity/town-drive-art-review.html':`artifacts/unity/town-drive-art-${version}-review.html`);await writeFile(target,html);console.log(target);
