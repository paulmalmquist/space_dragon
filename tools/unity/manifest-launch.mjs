import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const entries=[];
async function collect(relative,kind){
  const directory=path.join(root,relative);
  for(const item of await readdir(directory,{withFileTypes:true})){
    if(item.isSymbolicLink())throw new Error(`Refusing symbolic-link input: ${relative}/${item.name}`);
    const file=`${relative}/${item.name}`;
    if(item.isDirectory())await collect(file,kind);
    else if(item.isFile()){
      const bytes=await readFile(path.join(root,file));
      entries.push({kind,path:file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
    }
  }
}
for(const dir of ['unity/SpaceDragon/Assets','unity/SpaceDragon/Packages','unity/SpaceDragon/ProjectSettings','tools/unity'])await collect(dir,'source');
await collect('unity/SpaceDragon/Builds/LaunchWeb','browser-build');
entries.sort((a,b)=>a.path.localeCompare(b.path));
const baselinePath='artifacts/unity-launch/artifact-manifest.json';
let baseline=null;
try { baseline=JSON.parse(await readFile(path.join(root,baselinePath),'utf8')); }
catch(error) { if(error.code!=='ENOENT')throw error; }
const currentByPath=new Map(entries.map(entry=>[entry.path,entry]));
const changedSinceRecordedBuild=(baseline?.files||[]).filter(entry=>currentByPath.get(entry.path)?.sha256!==entry.sha256).map(entry=>({path:entry.path,kind:entry.kind}));
const manifest={schemaVersion:1,recordedAt:new Date().toISOString(),branch:execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'}).trim(),head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),scope:'Current shared dirty-worktree source and frozen LaunchWeb build identity. Source may include concurrent work after the tested build; this is not a replacement for the recorded post-build snapshot. No release, deployment or clean-commit claim.',baseline:baseline?{path:baselinePath,recordedAt:baseline.recordedAt,buildBytesUnchanged:!changedSinceRecordedBuild.some(entry=>entry.kind==='browser-build'),changedSinceRecordedBuild}:null,files:entries};
await mkdir(path.join(root,'artifacts/unity-launch'),{recursive:true});
const destination=path.join(root,'artifacts/unity-launch/artifact-manifest-current.json');
await writeFile(destination,JSON.stringify(manifest,null,2)+'\n');
for(const entry of manifest.files)if(createHash('sha256').update(await readFile(path.join(root,entry.path))).digest('hex')!==entry.sha256)throw new Error(`Changed during manifest: ${entry.path}`);
console.log(`Recorded and reverified ${entries.length} source/build hashes: ${destination}`);
