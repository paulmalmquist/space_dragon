"""Local-only video inventory and timestamped contact sheets; never modifies sources."""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
from PIL import Image, ImageDraw


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--interval', type=int, default=5)
    args = parser.parse_args()
    if args.interval < 1:
        parser.error('Interval must be a positive whole number of seconds')
    root = Path(__file__).resolve().parents[1]
    output = args.output.resolve()
    allowed = (root / 'assets/reference/local').resolve()
    if not output.is_relative_to(allowed):
        parser.error('Output must stay under ignored assets/reference/local/')
    if output.exists():
        parser.error('Choose a new output directory; existing evidence is never overwritten')
    source = args.source.resolve(strict=True)
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'format=duration,size:stream=codec_name,width,height,r_frame_rate:stream_side_data=rotation',
        '-of', 'json', str(source)], text=True))
    output.mkdir(parents=True)
    frames = output / 'frames'
    frames.mkdir()
    duration = float(probe['format']['duration'])
    entries = []
    for i, second in enumerate(range(0, int(duration), int(args.interval))):
        name = f'frame-{second:04d}s.jpg'
        target = frames / name
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-n','-ss',str(second),
                        '-i',str(source),'-map','0:v:0','-frames:v','1','-vf','scale=432:-2',
                        '-q:v','3',str(target)], check=True)
        entries.append({'time':second,'file':f'frames/{name}'})
    # Twenty samples per sheet retain inspectable portrait frames.
    for page in range((len(entries)+19)//20):
        subset = entries[page*20:(page+1)*20]
        sheet = Image.new('RGB',(5*216,4*408),(22,27,34))
        draw = ImageDraw.Draw(sheet)
        for i,entry in enumerate(subset):
            img=Image.open(output/entry['file']).resize((216,384))
            x,y=(i%5)*216,(i//5)*408
            sheet.paste(img,(x,y+24))
            draw.text((x+6,y+5),f"{entry['time']//60:02d}:{entry['time']%60:02d}",fill='white')
        sheet.save(output/f'contact-sheet-{page+1:02d}.jpg',quality=92)
    sha=hashlib.file_digest(source.open('rb'),'sha256').hexdigest()
    receipt={'source':str(source.relative_to(root)), 'bytes':source.stat().st_size,'sha256':sha,
             'probe':probe,'frames':entries,'interval_seconds':args.interval,
             'handling':'Authoring output stored locally. SD-052 permits reviewed Town Drive reference-derived runtime assets without an additional privacy approval. Do not infer identities; this tool does not upload sources.'}
    (output/'receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
    print(json.dumps({'output':str(output),'frames':len(entries),'sha256':sha}))


if __name__ == '__main__':
    main()
