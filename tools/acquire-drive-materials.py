"""Download a small reviewed CC0 Poly Haven material set for the local game.

Powered by Poly Haven. Uses its documented API during authoring only. Runtime
textures are self-hosted and never make API calls. No user media is uploaded.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlparse
import hashlib
import io
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/source/local/drive-materials/v001'
PUBLIC = ROOT / 'public/assets/drive'
ASSETS = {
    'asphalt': 'asphalt_01', 'grass': 'grass_ground',
    'concrete': 'concrete_floor_02', 'plaster': 'painted_plaster_wall',
    'bark': 'palm_tree_bark',
    'wood': 'oak_veneer_01', 'fabric': 'rough_linen',
}
SKY = 'kloofendal_48d_partly_cloudy_puresky'
HEADERS = {'User-Agent': 'SpaceDragon-local-material-acquisition/1.0 (Powered by Poly Haven)'}


def request(url):
    if urlparse(url).hostname not in {'api.polyhaven.com', 'dl.polyhaven.org'}:
        raise ValueError('Only reviewed Poly Haven API/download hosts are allowed')
    with urlopen(Request(url, headers=HEADERS), timeout=60) as response:
        return response.read()


def metadata(asset, kind):
    path = SOURCE / f'{asset}-{kind}.json'
    if path.exists():
        return json.loads(path.read_text())
    data = json.loads(request(f'https://api.polyhaven.com/{kind}/{asset}'))
    path.write_text(json.dumps(data, indent=2))
    return data


def acquire(source, path):
    raw = SOURCE / Path(urlparse(source['url']).path).name
    data = raw.read_bytes() if raw.exists() else request(source['url'])
    if len(data) != source['size']:
        raise ValueError(f'Source byte count differs for {raw.name}')
    # API MD5 strings may omit leading zeroes; compare normalized hex values.
    if hashlib.md5(data).hexdigest().lstrip('0') != source['md5'].lstrip('0'):
        raise ValueError(f'Source checksum differs for {raw.name}')
    if not raw.exists(): raw.write_bytes(data)
    if path.exists(): raise ValueError(f'Refusing to overwrite {path}')
    return data


def main():
    SOURCE.mkdir(parents=True, exist_ok=True)
    (PUBLIC/'materials').mkdir(parents=True, exist_ok=True)
    (PUBLIC/'sky').mkdir(parents=True, exist_ok=True)
    provenance = {'schemaVersion': 1, 'provider': 'Poly Haven', 'credit': 'Powered by Poly Haven',
        'license': 'CC0-1.0', 'licenseUrl': 'https://polyhaven.com/license',
        'apiTerms': 'https://github.com/Poly-Haven/Public-API/blob/master/ToS.md',
        'retrieved': '2026-10-30', 'runtimeNetwork': 'Same-origin local files only; no runtime API dependency',
        'assets': [], 'files': []}
    for name, asset in ASSETS.items():
        files = metadata(asset, 'files'); info = metadata(asset, 'info')
        provenance['assets'].append({'id': asset, 'url': f'https://polyhaven.com/a/{asset}',
            'authors': info.get('authors'), 'sourceDimensionsMillimetres': info.get('dimensions')})
        for output_name, map_name in [('albedo','Diffuse'),('normal','nor_gl'),('roughness','Rough')]:
            source = files[map_name]['1k']['jpg']
            path = PUBLIC/'materials'/f'{name}-{output_name}.webp'
            data = acquire(source, path)
            image = Image.open(io.BytesIO(data)).convert('RGB')
            image.save(path, format='WEBP', quality=94 if output_name=='normal' else 86, method=6)
            provenance['files'].append({'path': str(path.relative_to(ROOT/'public')).replace('\\','/'),
                'asset': asset, 'map': output_name, 'sourceUrl': source['url'],
                'sourceBytes': len(data), 'sourceSha256': hashlib.sha256(data).hexdigest(),
                'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                'dimensions': list(image.size), 'processing': '1K source JPEG re-encoded WebP; no upscaling',
                'colorSpace': 'sRGB' if output_name=='albedo' else 'linear data'})
    files = metadata(SKY, 'files'); info = metadata(SKY, 'info')
    source = files['hdri']['2k']['hdr']; path = PUBLIC/'sky/daylight-2k.hdr'
    data = acquire(source, path); path.write_bytes(data)
    provenance['assets'].append({'id': SKY, 'url': f'https://polyhaven.com/a/{SKY}', 'authors': info.get('authors')})
    provenance['files'].append({'path':'assets/drive/sky/daylight-2k.hdr','asset':SKY,
        'sourceUrl':source['url'],'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),
        'processing':'Unchanged 2K RGBE HDR panorama; Babylon generates a 512px cubemap and PBR harmonics locally'})
    (PUBLIC/'materials/PROVENANCE.json').write_text(json.dumps(provenance,indent=2)+'\n', encoding='utf-8', newline='\n')
    print(json.dumps({'files':len(provenance['files']),'runtimeBytes':sum(f['bytes'] for f in provenance['files']),
        'license':'CC0-1.0','source':'https://polyhaven.com/license'}))


if __name__ == '__main__': main()
