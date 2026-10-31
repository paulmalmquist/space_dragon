"""Inventory local Sonniss originals without modifying them (Python standard library)."""
import csv
import hashlib
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/source/local/audio/sonniss-gdc-2026'
OUTPUT = ROOT / 'assets/source/audio/sonniss-gdc-2026'


def digest(path):
    sha = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            sha.update(block)
    return sha.hexdigest()


def wav_info(path):
    with path.open('rb') as stream:
        header = stream.read(12)
        if header[:4] != b'RIFF' or header[8:] != b'WAVE':
            raise ValueError(f'Unsupported WAV: {path}')
        fmt = None
        data_size = None
        while chunk := stream.read(8):
            kind, size = struct.unpack('<4sI', chunk)
            if kind == b'fmt ':
                fmt = struct.unpack('<HHIIHH', stream.read(16))
                stream.seek(size - 16 + size % 2, 1)
            else:
                if kind == b'data':
                    data_size = size
                stream.seek(size + size % 2, 1)
        if fmt is None or data_size is None:
            raise ValueError(f'Missing WAV chunks: {path}')
        codec, channels, rate, byte_rate, _, bits = fmt
        return dict(channels=channels, sample_rate=rate, bits=bits,
                    duration_seconds=round(data_size / byte_rate, 6), format_tag=codec)


def suggested_uses(name):
    text = name.lower()
    rules = {
        'flight': ('air designed', 'wind', 'whoosh', 'woosh', 'quadcopter'),
        'combat': ('impact', 'metal', 'explosion', 'ice,', 'fire'),
        'dragon': ('dinosaur', 'creature', 'bestiae', 'roar'),
        'town-drive': ('car ', 'cars', 'motorcycle', 'traffic', 'pass-by', 'urban'),
        'earth-ambience': ('garden', 'nature', 'coast', 'park', 'rain', 'crowd', 'restaurant'),
        'ui-suits-pod': (' ui', 'interface', 'feedback', 'mechanism', 'robot', 'glitch', 'magic'),
    }
    return ';'.join(key for key, words in rules.items() if any(w in text for w in words)) or 'audition-unassigned'


def main():
    banks = sorted(SOURCE.glob('Sonniss.com-GDC2026-GameAudioBundle*of5'))
    if len(banks) != 5:
        raise SystemExit('Expected five filed banks; no catalog written.')
    rows, totals = [], []
    for bank in banks:
        files = sorted(p for p in bank.rglob('*') if p.is_file())
        totals.append(dict(bank=bank.name, files=len(files), wav_files=sum(p.suffix.lower() == '.wav' for p in files), bytes=sum(p.stat().st_size for p in files)))
        for path in files:
            relative = path.relative_to(SOURCE)
            row = dict(path=relative.as_posix(), bytes=path.stat().st_size, sha256=digest(path))
            if path.suffix.lower() == '.wav':
                row.update(wav_info(path))
                row.update(library=relative.parts[1], suggested_uses=suggested_uses(str(relative)), review='NOT AUDITIONED')
            rows.append(row)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / 'catalog.json').write_text(json.dumps(dict(schema_version=1, source_root=SOURCE.relative_to(ROOT).as_posix(), banks=totals, files=rows), indent=2) + '\n', encoding='utf-8')
    audio = [r for r in rows if 'duration_seconds' in r]
    with (OUTPUT / 'catalog.csv').open('w', newline='', encoding='utf-8') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(audio[0]))
        writer.writeheader()
        writer.writerows(audio)
    print(json.dumps(dict(files=len(rows), wav_files=len(audio), bytes=sum(r['bytes'] for r in rows), hours=sum(r['duration_seconds'] for r in audio) / 3600, banks=totals), indent=2))


if __name__ == '__main__':
    main()
