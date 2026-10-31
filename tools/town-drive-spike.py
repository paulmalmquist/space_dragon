"""Bounded CPU SfM spike with conservative foreground masks, local authoring outputs.

Run with the isolated Python environment documented in the local spike receipt.
Black pixels are excluded both from inputs and COLMAP feature extraction masks.
Local output routing is a workflow choice; SD-052 removed the prior Town Drive
publication restriction. This helper never uploads or modifies source videos.
"""
from pathlib import Path
import argparse
import json
import subprocess
import time
from PIL import Image, ImageDraw
import pycolmap


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--start', type=float, required=True)
    parser.add_argument('--duration', type=float, required=True)
    parser.add_argument('--profile', choices=['house','road'], required=True)
    args=parser.parse_args()
    root=Path(__file__).resolve().parents[1]
    output=args.output.resolve()
    if not output.is_relative_to((root/'assets/reference/local').resolve()):
        parser.error('Outputs must stay in ignored assets/reference/local')
    if output.exists():
        parser.error('Use a new output directory; never overwrite evidence')
    if not 0<args.duration<=45:
        parser.error('Spike clips must be at most 45 seconds')
    started=time.monotonic()
    images=output/'images'; masks=output/'masks'; sparse=output/'sparse'
    for directory in [images,masks,sparse]: directory.mkdir(parents=True)
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-n',
                    '-ss',str(args.start),'-i',str(args.source.resolve()),'-t',str(args.duration),
                    '-map','0:v:0','-vf','fps=2,scale=720:-2','-q:v','2',str(images/'frame-%04d.jpg')],check=True)
    names=sorted(images.glob('*.jpg'))
    for i,path in enumerate(names):
        img=Image.open(path).convert('RGB')
        width,height=img.size
        mask=Image.new('L',img.size,255)
        draw=ImageDraw.Draw(mask)
        if args.profile=='road':
            # Rear-view mirror/visor, entire dashboard/driver region, traffic corridor.
            draw.rectangle((0,0,width,int(height*.18)),fill=0)
            draw.rectangle((0,int(height*.50),width,height),fill=0)
            draw.rectangle((int(width*.28),int(height*.34),int(width*.80),int(height*.50)),fill=0)
        elif i<14:
            # Conservative region containing framed personal imagery during initial dining-room pan.
            draw.rectangle((int(width*.43),0,width,int(height*.72)),fill=0)
        black=Image.new('RGB',img.size,(0,0,0))
        Image.composite(img,black,mask).save(path,quality=94)
        mask.save(masks/(path.name+'.png'))
    reader=pycolmap.ImageReaderOptions(camera_model='SIMPLE_RADIAL',mask_path=masks)
    extraction=pycolmap.FeatureExtractionOptions(num_threads=4,max_image_size=1280,use_gpu=False)
    extraction.sift.max_num_features=4096
    database=output/'database.db'
    pycolmap.extract_features(database,images,camera_mode=pycolmap.CameraMode.SINGLE,
                             reader_options=reader,extraction_options=extraction,device=pycolmap.Device.cpu)
    pairing=pycolmap.SequentialPairingOptions(overlap=8,loop_detection=False)
    matching=pycolmap.FeatureMatchingOptions(num_threads=4,use_gpu=False)
    pycolmap.match_sequential(database,matching_options=matching,pairing_options=pairing,device=pycolmap.Device.cpu)
    options=pycolmap.IncrementalPipelineOptions(num_threads=4,min_model_size=6,max_num_models=5)
    models=pycolmap.incremental_mapping(database,images,sparse,options=options)
    stats=[]
    for model_id,model in models.items():
        model.export_PLY(output/f'model-{model_id}.ply')
        stats.append({'model_id':model_id,'registered_frames':model.num_reg_images(),
                      'points3D':model.num_points3D(),'mean_reprojection_error':model.compute_mean_reprojection_error(),
                      'registered_fraction':model.num_reg_images()/len(names),
                      'ply_bytes':(output/f'model-{model_id}.ply').stat().st_size})
    receipt={'tool':'pycolmap','version':pycolmap.__version__,'device':'CPU',
             'start_seconds':args.start,'duration_seconds':args.duration,'input_frames':len(names),
             'elapsed_seconds':round(time.monotonic()-started,2),'models':stats,
             'mask':args.profile,'caveat':'Sparse SfM only, no metric scale, no mesh/splat or drivable geometry claim.'}
    (output/'result.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
    print(json.dumps(receipt))


if __name__=='__main__':main()
