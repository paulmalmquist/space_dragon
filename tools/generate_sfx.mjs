// Original procedural Space Dragon sound bank. No third-party sample recordings.
const SR=32000;
const TRACKS=[["sos_broken_signal",3.2,"sos.broken"],["pod_entry",3.4,"pod.entry"],["pod_impact",2.2,"pod.impact"],["core_activation",2.3,"core.activate"],["hologram_reveal",1.9,"core.hologram"],["suit_assemble",2.1,"suit.assemble"],["paul_pulse",1.6,"paul.pulse"],["maria_heal",2.3,"maria.heal"],["luke_web",1,"luke.web"],["luna_goo",1.5,"luna.goo"],["lyla_scan",1.8,"lyla.scan"],["dragon_awaken",3.5,"dragon.awaken"],["dragon_thruster",3,"dragon.thruster"],["dragon_cruise_loop",4.5,"dragon.cruise"],["combat_parry",0.95,"combat.parry"],["portal_open",3.7,"portal.open"]];
function randgen(id){let s=2166136261;for(const c of id)s=Math.imul(s^c.charCodeAt(0),16777619);return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}
function render(t){
 const [id,d]=t,loop=id==="dragon_cruise_loop",N=Math.round(d*SR),fade=loop?Math.round(.5*SR):0,a=new Float64Array(N+fade),random=randgen(id),tau=2*Math.PI;
 const envelope=(q,d,att,rel)=>{let v=Math.max(0,Math.min(1,q/Math.max(.001,att),(d-q)/Math.max(.001,rel)));return v*v*(3-2*v)};
 function tone(at,len,from,to,g,voice="plain",attack=.01,release=.22,vibrato=0){
  const start=Math.max(0,Math.round(at*SR)),end=Math.min(a.length,Math.round((at+len)*SR));let p=0;
  for(let i=start;i<end;i++){const q=i/SR-at;p+=tau*(from+(to-from)*q/len)*(1+vibrato*Math.sin(tau*5*q))/SR;
   const v=voice==="brass"?Math.sin(p)+.35*Math.sin(2*p)+.14*Math.sin(3*p):voice==="metal"?Math.sin(p)+.31*Math.sin(p*2.76)+.13*Math.sin(p*5.03):voice==="rasp"?Math.sin(p)+.58*Math.sin(2.015*p)+.24*Math.sin(3.042*p):Math.sin(p);
   a[i]+=g*v*envelope(q,len,attack,release);
  }
 }
 function noise(at,len,g,type="air",attack=.02,release=.3,mod=0){
  let x=0,y=0;const start=Math.round(at*SR),end=Math.min(a.length,Math.round((at+len)*SR));
  for(let i=start;i<end;i++){const q=i/SR-at,z=random()*2-1,c=.02+.017*Math.sin(tau*mod*q)**2;x+=(z-x)*c;y+=(x-y)*.005;
   const v=type==="sub"?y*5:type==="high"?z-x:type==="radio"?.4*(z-x)+1.7*(x-y):type==="wet"?x*1.7:x+z*.12;
   const gate=type==="radio"?(Math.sin(tau*14.2*q)>.1?1:.1):1;
   a[i]+=g*v*envelope(q,len,attack,release)*gate;
  }
 }
 function chime(at,f,g,len=.9){const start=Math.round(at*SR),end=Math.min(a.length,Math.round((at+len)*SR));for(let i=start;i<end;i++){const q=i/SR-at;a[i]+=g*(Math.sin(tau*f*q)+.3*Math.sin(tau*f*2.76*q)*Math.exp(-9*q)+.13*Math.sin(tau*f*4.1*q)*Math.exp(-14*q))*Math.exp(-q*3/len)*(1-Math.exp(-q*100));}}
 function hit(at,g){tone(at,.5,90,34,g,"brass",.001,.44);noise(at,.3,g*.6,"high",.001,.23);noise(at,1,g*.4,"sub",.002,.84);}
 function mech(at,g){noise(at,.15,g,"high",.001,.12);tone(at,.27,550,190,g*.7,"rasp",.002,.21);chime(at+.014,880,g*.16,.27);}
 function sweep(at,len,g){noise(at,len,g,"air",len*.27,len*.33,1.7);tone(at,len,150,780,g*.15,"rasp",len*.25,len*.29);}
 switch(id){
 case "sos_broken_signal":
  noise(0,3.15,.3,"radio",.05,.25);tone(.05,3,54,48,.15,"rasp",.37,.36,.013);
  [[.44,330],[1.04,415],[1.56,392],[2.16,494],[2.57,554]].forEach(([time,f])=>{tone(time,.23,f,f*.987,.2,"metal",.006,.12);noise(time,.07,.13,"high",.001,.04)});break;
 case "pod_entry":
  noise(0,3.35,.55,"air",1.3,.51,2);tone(.11,3.1,290,49,.32,"rasp",.85,.43);tone(.61,2.6,990,215,.13,"metal",.63,.35);noise(2.4,.89,.3,"sub",.06,.61);break;
 case "pod_impact":
  hit(.1,1);noise(.11,1.9,.66,"sub",.002,1.65);noise(.11,.78,.47,"air",.001,.63);[.17,.27,.4,.65,.91].forEach(x=>mech(x,.15));tone(.1,2,88,37,.26,"rasp",.01,1.4);break;
 case "core_activation":
  sweep(.08,2.1,.22);tone(.1,2.05,80,165,.29,"rasp",.35,.5);[.41,.77,1.13,1.47,1.82].forEach(x=>mech(x,.12));chime(1.8,660,.24,.45);break;
 case "hologram_reveal":
  sweep(0,1.76,.19);[[.2,660],[.46,990],[.78,1320],[1.08,1760],[1.42,1100]].forEach(([x,f])=>chime(x,f,.18,.64));tone(.35,1.43,245,330,.13,"metal",.37,.41);break;
 case "suit_assemble":
  noise(.05,1.98,.34,"air",.2,.22,9);tone(.11,1.67,185,430,.23,"rasp",.2,.34);[.14,.39,.67,.95,1.24,1.57,1.85].forEach(x=>mech(x,.27));hit(1.92,.3);break;
 case "paul_pulse":
  tone(.06,1.5,83,164,.5,"brass",.05,.78);tone(.13,1.22,175,325,.24,"brass",.06,.62);noise(.09,1.2,.26,"air",.07,.58);hit(.16,.26);break;
 case "maria_heal":
  tone(.04,2.21,164,175,.34,"brass",.35,.75,.008);tone(.22,2.03,246,261,.22,"plain",.37,.7,.009);noise(.12,1.97,.14,"air",.38,.65);[[.56,523],[1,659],[1.44,784],[1.88,1046]].forEach(([x,f])=>chime(x,f,.14,.82));break;
 case "luke_web":
  noise(.02,.46,.59,"high",.001,.41);tone(.03,.9,1480,140,.38,"rasp",.003,.61);tone(.2,.7,220,318,.26,"plain",.002,.52,.04);hit(.18,.12);break;
 case "luna_goo":
  [[.08,116],[.25,89],[.46,153],[.71,113],[1,181]].forEach(([x,f])=>{tone(x,.44,f,f*.48,.28,"plain",.002,.34,.08);noise(x,.17,.18,"wet",.002,.14)});noise(.11,1.34,.32,"air",.05,.61,10);break;
 case "lyla_scan":
  tone(.03,1.48,385,1240,.18,"metal",.03,.54);[[.19,880],[.59,1175],[1.01,1480],[1.39,1760]].forEach(([x,f])=>chime(x,f,.25,.57));noise(.06,1.49,.08,"high",.08,.4);break;
 case "dragon_awaken":
  noise(0,3.42,.58,"sub",.94,.87,2);tone(.06,3.37,39,61,.56,"rasp",.97,.78,.08);tone(.47,2.95,78,98,.33,"brass",.52,.79,.036);noise(1.36,1.96,.32,"air",.2,.82,5);hit(2.74,.39);break;
 case "dragon_thruster":
  noise(.02,2.9,.52,"sub",.12,.26,12);noise(.3,2.65,.49,"air",.42,.29,17);tone(.06,2.85,49,138,.48,"rasp",.27,.35,.017);tone(.52,2.15,124,205,.19,"brass",.23,.33);hit(.24,.37);break;
 case "dragon_cruise_loop":
  tone(0,5,60,60,.41,"rasp",.003,.003,.009);tone(0,5,119,119,.16,"brass",.003,.003);
  noise(0,5,.3,"sub",.003,.003,10);noise(0,5,.1,"air",.003,.003,14);break;
 case "combat_parry":
  mech(.015,.56);chime(.02,1240,.42,.82);chime(.09,1855,.27,.55);tone(.02,.46,251,105,.32,"brass",.001,.36);break;
 case "portal_open":
  sweep(.05,3.57,.49);noise(.23,3.41,.31,"sub",1.1,.75,3);tone(.12,3.34,87,196,.33,"metal",1,.79,.018);[[1.23,440],[1.67,660],[2.16,880],[2.62,1320]].forEach(([x,f])=>chime(x,f,.18,1.1));hit(2.91,.16);break;
 }
 const raw=new Float64Array(a.length),t1=Math.round(.075*SR),t2=Math.round(.182*SR);
 for(let i=0;i<a.length;i++)raw[i]=Math.tanh((a[i]+(i>=t1?a[i-t1]*.11:0)+(i>=t2?a[i-t2]*.065:0))*.94);
 if(loop)for(let i=0;i<fade;i++)raw[i]=raw[i]*(i/fade)+raw[N+i]*(1-i/fade);
 let mean=0,pk=0,rms=0;for(let i=0;i<N;i++)mean+=raw[i];mean/=N;for(let i=0;i<N;i++)pk=Math.max(pk,Math.abs(raw[i]-mean));
 const samples=new Float32Array(N),scale=.86/Math.max(1e-9,pk);for(let i=0;i<N;i++){samples[i]=Math.max(-.98,Math.min(.98,(raw[i]-mean)*scale));rms+=samples[i]*samples[i];}
 return {samples,rms:Math.sqrt(rms/N)};
}
function asWav(samples){
 const b=new Uint8Array(44+samples.length*2),v=new DataView(b.buffer);
 function write(i,s){for(let k=0;k<s.length;k++)b[i+k]=s.charCodeAt(k);}
 write(0,"RIFF");v.setUint32(4,b.length-8,true);write(8,"WAVE");write(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,SR,true);v.setUint32(28,SR*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);write(36,"data");v.setUint32(40,samples.length*2,true);
 for(let i=0;i<samples.length;i++)v.setInt16(44+i*2,Math.round(samples[i]*32767),true);
 return b;
}
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../assets/game/audio/starter');
const mode=process.argv[2]||'--verify';
if(!['--verify','--write'].includes(mode))throw Error('Use --verify or --write');
mkdirSync(dir,{recursive:true});
let failures=0;
for(const cue of TRACKS){
 const bytes=Buffer.from(asWav(render(cue).samples));
 const target=path.join(dir,cue[0]+'.wav');
 const hash=b=>createHash('sha256').update(b).digest('hex');
 if(mode==='--verify'){if(!existsSync(target)||hash(bytes)!==hash(readFileSync(target))){console.error('FAIL',cue[0]);failures++;}else console.log('PASS',cue[0]);}
 else if(existsSync(target)){console.error('Refusing overwrite:',target);failures++;}
 else {writeFileSync(target,bytes);console.log('WROTE',target);}
}
if(failures)process.exitCode=1;
