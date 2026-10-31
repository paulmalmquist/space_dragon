"""Build the five selected game cues from filed originals using local FFmpeg."""
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/source/local/audio/sonniss-gdc-2026'
DEST = ROOT / 'public/assets/audio/sonniss-gdc-2026'
SELECTION = [
    ('dragon-roar', '*Large Herbivore Roar*', .8),
    ('fire-breath', 'FIREWhsh_Whoosh Fire Deep Growl*', 1.15),
    ('machine-blast', 'EXPLDsgn_Explosion Small Blast Enemy*', 1.7),
    ('metal-impact', 'DSGNImpt_Metal Hit Thud Thump*', .48),
    ('jet-surge', 'AEROJet_Blast Off Clean*', .7),
]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        raise SystemExit('FFmpeg is required; no downloads performed.')
    DEST.mkdir(parents=True, exist_ok=True)
    records = []
    for name, pattern, duration in SELECTION:
        matches = list(SOURCE.rglob(pattern + '.wav'))
        if len(matches) != 1:
            raise SystemExit(f'Expected one original for {pattern}, got {len(matches)}')
        original = matches[0]
        target = DEST / f'{name}-v001.wav'
        filters = (f'silenceremove=start_periods=1:start_duration=0.005:start_threshold=-45dB,'
                   f'apad=pad_dur={duration},atrim=duration={duration},asetpts=PTS-STARTPTS,'
                   f'loudnorm=I=-20:TP=-3:LRA=7,aresample=24000,'
                   f'afade=t=in:d=0.004,afade=t=out:st={duration-.06}:d=0.06')
        args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', str(original),
                '-map_metadata', '-1', '-af', filters, '-ac', '1', '-ar', '24000', '-c:a', 'pcm_s16le', str(target)]
        subprocess.run([ffmpeg, *args], check=True)
        records.append(dict(id=name, source=original.relative_to(ROOT).as_posix(), source_sha256=sha(original),
                            path=target.relative_to(ROOT / 'public').as_posix(), bytes=target.stat().st_size,
                            sha256=sha(target), duration_seconds=duration, filters=filters,
                            format='mono 24 kHz PCM s16le WAV', human_review='NOT AUDITIONED'))
    report = dict(schema_version=1, ffmpeg=subprocess.check_output([ffmpeg, '-version'], text=True).splitlines()[0],
                  license_url='https://sonniss.com/gdc-bundle-license/', files=records)
    metadata = ROOT / 'assets/source/audio/sonniss-gdc-2026'
    metadata.mkdir(parents=True, exist_ok=True)
    (metadata / 'game-cues.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    # Re-read the shared manifest immediately before appending our own entry.
    manifest_path = ROOT / 'public/assets/manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    asset = dict(id='sonniss-dogfight-audio', version='v001', status='local game mix; human listening pending',
                 runtimePath=records[0]['path'], provenance='Sonniss GDC 2026; five edited recordings, see assets/source/audio/sonniss-gdc-2026/game-cues.json',
                 publication='Owner-authorized local game use; no standalone bank distribution or deployment.',
                 files=[{k: record[k] for k in ('path', 'bytes', 'sha256')} for record in records])
    manifest['assets'] = [entry for entry in manifest['assets'] if entry['id'] != asset['id']] + [asset]
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(dict(cues=len(records), runtime_bytes=sum(r['bytes'] for r in records), files=records), indent=2))


if __name__ == '__main__':
    main()
