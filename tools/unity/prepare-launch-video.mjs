/** Verify/copy reviewed derivatives; optional encoding writes only ignored local candidates. */
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const source=path.join(root,'assets/game/local/cinematics/launch-v003');
const encode=process.argv.includes('--encode');
const copyIndex=process.argv.indexOf('--copy-build');
if(encode&&copyIndex>=0)throw new Error('Encode local candidates and copy reviewed build media in separate commands; encoding never promotes a candidate.');
const runtime=encode?path.join(source,'runtime'):path.join(root,'assets/game/cinematics/launch-v003');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{encoding:'utf8',windowsHide:true,maxBuffer:10*1024*1024});if(r.error||r.status!==0)throw r.error||new Error(r.stderr);return r.stdout};
const receiptPath=path.join(runtime,'video-receipt.json');
if(encode){
  const original=JSON.parse(await readFile(path.join(source,'source-receipt.json'),'utf8'));
  if(hash(await readFile(path.join(root,original.blend)))!==original.blendSha256)throw new Error('Blender choreography source changed; review before encoding.');
  const frames=[];
  for(let n=91;n<=300;n++){const filename=`${String(n).padStart(4,'0')}.png`,data=await readFile(path.join(source,'frames',filename));frames.push({filename,sha256:hash(data),bytes:data.length})}
  await mkdir(runtime,{recursive:true});
  try {await readFile(receiptPath);throw new Error('Encoded receipt already exists. Review it or make a new version; never overwrite an unreviewed edit.')}catch(e){if(e.code!=='ENOENT')throw e}
  const variants=[];
  for(const [height,width]of[[720,1280],[540,960]]){
    const name=`launch-blender-${height}.mp4`,target=path.join(runtime,name);
    run('ffmpeg',['-hide_banner','-loglevel','error','-n','-framerate','30','-start_number','91','-i',path.join(source,'frames','%04d.png'),'-frames:v','210','-vf',`scale=${width}:${height}:flags=lanczos`,'-an','-c:v','libx264','-preset','medium','-crf',height===720?'20':'23','-pix_fmt','yuv420p','-profile:v','high','-level:v','3.1','-movflags','+faststart',target]);
    const probe=JSON.parse(run('ffprobe',['-v','error','-show_streams','-show_format','-of','json',target]));
    if(probe.streams.length!==1||probe.streams[0].codec_name!=='h264'||probe.streams[0].width!==width||probe.streams[0].height!==height||Math.abs(Number(probe.format.duration)-7)>.01)throw new Error('Unexpected video format or duration.');
    const bytes=await readFile(target);variants.push({name,width,height,durationSeconds:7,frames:210,fps:30,codec:'H.264',pixelFormat:'yuv420p',audio:false,bytes:bytes.length,sha256:hash(bytes)});
  }
  await writeFile(receiptPath,JSON.stringify({schemaVersion:1,scope:'LOCAL REVIEW CANDIDATE; original Blender-controlled animatic, AI enhancement deferred by owner; no release approval.',renderEngine:'BLENDER_EEVEE',masterSource:original.source,masterSourceSha256:original.sourceSha256,blend:original.blend,blendSha256:original.blendSha256,contractSha256:original.contractSha256,sequenceStartSeconds:3,sequenceEndSeconds:10,protectedLiveEndingSeconds:[10,12],environmentContinuity:'Shared dragon/camera/trajectory; provisional scenery and lighting differ. Concealed cut plus protected Unity ending, not pixel-perfect matching.',ffmpeg:run('ffmpeg',['-version']).split('\n')[0],frames,variants},null,2)+'\n');
}
const receipt=JSON.parse(await readFile(receiptPath,'utf8'));
for(const variant of receipt.variants){const data=await readFile(path.join(runtime,variant.name));if(hash(data)!==variant.sha256||data.length!==variant.bytes)throw new Error(`Video changed: ${variant.name}`)}
if(copyIndex>=0){
  const kind=process.argv[copyIndex+1];if(!['web','windows'].includes(kind))throw new Error('Expected web or windows.');
  const destination=path.join(root,'unity/SpaceDragon/Builds',kind==='web'?'LaunchWeb':'LaunchWindows','videos');
  await mkdir(destination,{recursive:true});
  for(const variant of receipt.variants)await copyFile(path.join(runtime,variant.name),path.join(destination,variant.name));
  await copyFile(receiptPath,path.join(destination,'video-receipt.json'));
}
console.log(`Verified ${receipt.variants.length} ${encode?'local candidate':'reviewed Blender'} video variants; 7 seconds, H.264, no embedded audio.${encode?' Local encoding does not promote media to the tracked review set.':''}`);
