"""Create heavier, headroom-controlled Dogfight cues from licensed local originals.

No downloads or external generation. Originals/v001 cues are immutable. Outputs
are fresh v002 game derivatives; changed existing outputs abort before any writes.
The audition reel is a technical mix preview, not a claim of human listening.
"""
import hashlib, io, json, math, shutil, subprocess, wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/source/local/audio/sonniss-gdc-2026'
OUT = ROOT / 'assets/game/local/audio/dogfight-v002'
META = ROOT / 'assets/source/audio/sonniss-gdc-2026/dogfight-cues-v002.json'
REVIEW = ROOT / 'artifacts/audio/dogfight-v002'
RATE = 48000
CATALOG = json.loads((ROOT/'assets/source/audio/sonniss-gdc-2026/catalog.json').read_text())['files']
FFMPEG = shutil.which('ffmpeg')

def sha(data): return hashlib.sha256(data).hexdigest()
def original(fragment):
    found = [x for x in CATALOG if fragment in x['path'] and x['path'].endswith('.wav')]
    if len(found) != 1: raise ValueError(('Ambiguous source',fragment,len(found)))
    item = found[0]; path = SOURCE/item['path']
    if sha(path.read_bytes()) != item['sha256']: raise ValueError('Original changed: '+str(path))
    return path,item

def decode(fragment, pitch=1, highpass=35, lowpass=13000, bass=0, seconds=12):
    path, item = original(fragment)
    filters = f'aresample={RATE},asetrate={int(RATE*pitch)},aresample={RATE},highpass=f={highpass},lowpass=f={lowpass}'
    if bass: filters += f',equalizer=f=130:t=o:w=1.4:g={bass}'
    command = [FFMPEG,'-hide_banner','-loglevel','error','-i',str(path),'-t',str(seconds),'-af',filters,'-ac','2','-ar',str(RATE),'-f','f32le','pipe:1']
    data = np.frombuffer(subprocess.check_output(command),dtype='<f4').astype(np.float64).reshape(-1,2)
    # Find the first sustained audible onset; filename-based selection is not an audition.
    block = 480; count = len(data)//block
    rms = np.sqrt(np.mean(data[:count*block].reshape(count,block,2)**2,axis=(1,2)))
    threshold = max(float(rms.max())*.055, .00015)
    indices = np.flatnonzero((rms[:-2]>threshold)&(rms[1:-1]>threshold)&(rms[2:]>threshold))
    offset = max(0,int(indices[0])*block-240) if len(indices) else 0
    data = data[offset:]
    record = dict(source=path.relative_to(ROOT).as_posix(),source_sha256=item['sha256'],filters=filters,
                  decoded_onset_seconds=offset/RATE,selection='first sustained 30ms onset above5.5% maximum block RMS')
    return data,record

def fit(data, duration, start=0):
    count = round(duration*RATE); begin = round(start*RATE)
    result = np.zeros((count,2)); portion = data[begin:begin+count]
    result[:len(portion)] = portion; return result

def match_rms(data,target=.16):
    value = np.sqrt(np.mean(data**2)); return data * (target/max(float(value),1e-8))

def fades(data, attack=.008, release=.12):
    result=data.copy(); a=min(len(result),round(attack*RATE)); r=min(len(result),round(release*RATE))
    if a: result[:a] *= np.linspace(0,1,a)[:,None]
    if r: result[-r:] *= np.linspace(1,0,r)[:,None]
    return result

def master(data, rms_target, loop=False):
    # Mild soft saturation controls peaks without flattening the full envelope.
    data = match_rms(data,rms_target)
    data = np.tanh(data*1.25)/1.25
    data -= np.mean(data,axis=0)
    peak=float(np.max(np.abs(data)))
    data *= min(1,.53/max(peak,1e-9)) # conservative sample ceiling about-5.5dBFS
    return data if loop else fades(data,.004,.055)

def wav_bytes(data):
    stream=io.BytesIO()
    with wave.open(stream,'wb') as file:
        file.setnchannels(2);file.setsampwidth(2);file.setframerate(RATE)
        file.writeframes(np.round(np.clip(data,-.999,.999)*32767).astype('<i2').tobytes())
    return stream.getvalue()

def measure(data, encoded):
    process=subprocess.run([FFMPEG,'-hide_banner','-i','pipe:0','-af','loudnorm=I=-18:TP=-3:LRA=9:print_format=json','-f','null','-'],input=encoded,capture_output=True,check=True)
    text=process.stderr.decode(errors='replace'); info=json.loads(text[text.rfind('{'):text.rfind('}')+1])
    peak=float(np.max(np.abs(data))); rms=float(np.sqrt(np.mean(data**2)))
    # FFT energy shares are descriptive, not a psychoacoustic loudness measurement.
    mono=np.mean(data,axis=1); spectrum=np.abs(np.fft.rfft(mono))**2; freq=np.fft.rfftfreq(len(mono),1/RATE)
    energy=float(np.sum(spectrum)); band=lambda lo,hi:float(np.sum(spectrum[(freq>=lo)&(freq<hi)]))/max(energy,1e-20)
    return dict(duration_seconds=len(data)/RATE,sample_peak_dbfs=20*math.log10(max(peak,1e-10)),rms_dbfs=20*math.log10(max(rms,1e-10)),
        integrated_lufs=info['input_i'],true_peak_dbtp=info['input_tp'],crest_db=20*math.log10(max(peak,1e-10)/max(rms,1e-10)),
        clipped_samples=int(np.count_nonzero(np.abs(data)>=1)),low_band_energy_40_250=band(40,250),presence_band_energy_1000_5000=band(1000,5000),
        endpoint_delta=float(np.max(np.abs(data[-1]-data[0]))),dc_offset=float(np.max(np.abs(np.mean(data,axis=0)))))

def main():
    if not FFMPEG: raise RuntimeError('Local FFmpeg is required; no download attempted')
    outputs={}; records=[]; arrays={}
    def add(name,data,sources,recipe,loop=False):
        body=wav_bytes(data);metrics=measure(data,body)
        if metrics['clipped_samples'] or float(metrics['true_peak_dbtp']) > -3: raise RuntimeError('Cue exceeds headroom target: '+name)
        destination=OUT/(name+'-v002.wav');outputs[destination]=body;arrays[name]=data
        records.append(dict(id=name,path=destination.relative_to(ROOT).as_posix(),bytes=len(body),sha256=sha(body),format='stereo48kHzPCM16',
            sources=sources,recipe=recipe,loop=loop,measurements=metrics,human_review='NOT AUDITIONED'))

    dino,ds=decode('Large Herbivore Roar 01',pitch=.78,lowpass=10500,bass=2)
    growl,gs=decode('Creature Werewolf Growl Menacing',pitch=.72,lowpass=6000,bass=2)
    roar=fades(match_rms(fit(dino,2.25),.15)*.8+match_rms(fit(growl,2.25),.15)*.42,.015,.24)
    add('dragon-roar',master(roar,.20),[ds,gs],'2.25s pitched dinosaur body plus low werewolf chest layer; fast onset,240ms release; no spoken voice')

    fire,fs=decode('Whoosh Fire Deep Growl Monster',pitch=.84,lowpass=14000,bass=1)
    burn,bs=decode('Loop Elements Fire Crackling',pitch=.9,lowpass=12500,seconds=5)
    beam=fades(match_rms(fit(fire,1.1),.18)*.83+match_rms(fit(burn,1.1,start=.4),.13)*.38,.012,.10)
    add('fire-breath',master(beam,.22),[fs,bs],'1.1s deep combustion body plus crackle; aligns with existing1.1s beam;100ms release')

    impact,ins=decode('Colossal Impacts/Impact Cut Sweep.wav',pitch=.78,lowpass=14000,bass=2)
    debris,debs=decode('Colossal Impacts/Woosh Debris.wav',pitch=.85,lowpass=11000)
    blast=fades(match_rms(fit(impact,2.4),.18)*.9+match_rms(fit(debris,2.4),.14)*.34,.003,.35)
    add('machine-blast',master(blast,.20),[ins,debs],'2.4s colossal impact plus debris tail; replaces the small cartoon explosion source')

    metal,ms=decode('Metal Hit Thud Thump Low Ring Geofon',pitch=.86,highpass=45,lowpass=11000,bass=1)
    hit=fades(match_rms(fit(metal,.9),.16)*.9+match_rms(fit(impact,.9),.13)*.28,.002,.16)
    add('metal-impact',master(hit,.18),[ms,ins],'0.9s resonant recorded metal with broad impact body; no new collision timing')

    air,ars=decode('AEROJet_Blast Off Clean',pitch=.9,highpass=45,lowpass=12500,seconds=10)
    reactor,rs=decode('Loop Ship Reactor Synth Layer Layered Saw Buzz',pitch=.82,highpass=40,lowpass=1700,seconds=8)
    loop=match_rms(fit(air,4.2,start=.65),.13)*.85+match_rms(fit(reactor,4.2,start=1),.11)*.22
    n=round(.2*RATE); blend=np.linspace(0,1,n)[:,None]
    loop=np.concatenate((loop[n:-n],loop[-n:]*(1-blend)+loop[:n]*blend))
    add('jet-surge',master(loop,.15,loop=True),[ars,rs],'4.0s stable propulsion layer with200ms wrap crossfade; no repeated blast-off onset',True)

    metadata=dict(schema_version=2,license_url='https://sonniss.com/gdc-bundle-license/',
        license_evidence='Preserved local Sonniss GDC2026 bundled license; no new original redistribution or external generation',
        ffmpeg=subprocess.check_output([FFMPEG,'-version'],text=True).splitlines()[0],files=records,
        scope='Local game derivatives and audition; human tonal/comfort acceptance and actual Unity playback remain separate')
    outputs[META]=(json.dumps(metadata,indent=2)+'\n').encode()
    # Headroom stress preview: repeated weapon/impact plus roar/beam and boost bed.
    silence=np.zeros((round(.65*RATE),2));reel=[]
    for name in ['dragon-roar','fire-breath','machine-blast','metal-impact','jet-surge']:reel += [arrays[name],silence]
    outputs[REVIEW/'cue-audition-v002.wav']=wav_bytes(np.concatenate(reel))
    outputs[REVIEW/'cue-order.txt']=b'dragon-roar, fire-breath, machine-blast, metal-impact, jet-surge; 0.65 seconds between cues. Human listening NOT VERIFIED.\n'
    outputs[REVIEW/'measurements.json']=(json.dumps(metadata,indent=2)+'\n').encode()
    # Preflight all generated files before writing any; never change original/v001 data.
    missing=[]
    for destination,body in outputs.items():
        if destination.exists():
            if destination.read_bytes()!=body: raise RuntimeError('Generated output differs; preserve it and use a new version: '+str(destination))
        else: missing.append((destination,body))
    for destination,body in missing:
        destination.parent.mkdir(parents=True,exist_ok=True)
        with destination.open('xb') as handle:handle.write(body)
    print(json.dumps(dict(cues=len(records),bytes=sum(x['bytes'] for x in records),files=records),indent=2))

if __name__=='__main__': main()
