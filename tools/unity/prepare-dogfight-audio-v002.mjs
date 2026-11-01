// Additive audio intake; never rewrites the model/old audio receipts or WAVs.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const target=path.join(root,'unity/SpaceDragon/Assets/SpaceDragon/Dogfight');
const metadataPath='assets/source/audio/sonniss-gdc-2026/dogfight-cues-v002.json';
const metadataBytes=await readFile(path.join(root,metadataPath));
const metadata=JSON.parse(metadataBytes.toString());
const verify=process.argv.includes('--verify');
if(process.argv.slice(2).some(a=>a!=='--verify'))throw Error('Usage: prepare-dogfight-audio-v002.mjs [--verify]');
const hash=b=>createHash('sha256').update(b).digest('hex');
const ids=['dragon-roar','fire-breath','machine-blast','metal-impact','jet-surge'];
if(metadata.schema_version!==2||metadata.files.length!==5||ids.some(id=>!metadata.files.some(f=>f.id===id)))throw Error('Unexpected v002 cue metadata');
function inspectWav(body){
  if(body.toString('ascii',0,4)!=='RIFF'||body.toString('ascii',8,12)!=='WAVE')throw Error('Expected WAV');
  let format,dataBytes;
  for(let offset=12;offset+8<=body.length;){
    const kind=body.toString('ascii',offset,offset+4),size=body.readUInt32LE(offset+4),start=offset+8;
    if(start+size>body.length)throw Error('Truncated WAV chunk');
    if(kind==='fmt ')format={codec:body.readUInt16LE(start),channels:body.readUInt16LE(start+2),sampleRate:body.readUInt32LE(start+4),bits:body.readUInt16LE(start+14)};
    if(kind==='data')dataBytes=size;
    offset=start+size+(size%2);
  }
  if(format?.codec!==1||format.channels!==2||format.sampleRate!==48000||format.bits!==16||!dataBytes)throw Error('Expected stereo48kHzPCM16');
  return {...format,durationSeconds:dataBytes/(format.channels*format.sampleRate*format.bits/8)};
}
const files=[];const outputs=[];
for(const cue of metadata.files){
  const destination=`Imported/AudioV002/${cue.id}-v002.wav`;
  const source=verify?path.join(target,destination):path.join(root,cue.path);
  const bytes=await readFile(source);
  if(hash(bytes)!==cue.sha256||bytes.length!==cue.bytes)throw Error(`Cue changed: ${cue.id}`);
  const wave=inspectWav(bytes);
  if(Math.abs(wave.durationSeconds-cue.measurements.duration_seconds)>.0001)throw Error('Duration differs from measured cue');
  if(!Number.isFinite(Number(cue.measurements.true_peak_dbtp))||Number(cue.measurements.true_peak_dbtp)>-3||cue.measurements.clipped_samples!==0)throw Error('Cue headroom check failed');
  outputs.push([destination,bytes]);
  files.push({id:cue.id,source:cue.path,destination,sha256:cue.sha256,bytes:cue.bytes,...wave,measurements:cue.measurements});
}
const receipt={schemaVersion:2,scope:'Five heavier layered licensed cues. Separate additive audio intake; model and legacy receipts unchanged.',
  metadata:metadataPath,metadataSha256:hash(metadataBytes),humanReview:'NOT AUDITIONED',files};
outputs.push(['audio-receipt-v002.json',Buffer.from(JSON.stringify(receipt,null,2)+'\n')]);
const missing=[];
for(const [name,body]of outputs){
  const destination=path.join(target,name);
  try{if(!(await readFile(destination)).equals(body))throw Error(`Refusing changed audio intake ${name}; choose a new version.`);}
  catch(error){if(error.code!=='ENOENT'||verify)throw error;missing.push([destination,body]);}
}
for(const[destination,body]of missing){await mkdir(path.dirname(destination),{recursive:true});await writeFile(destination,body,{flag:'wx'});}
console.log(JSON.stringify({result:'PASS',mode:verify?'verified':'prepared',cues:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),receipt:'audio-receipt-v002.json',humanReview:'NOT AUDITIONED'}));
