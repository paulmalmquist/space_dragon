"""Prepare bounded Unity planet derivatives from pinned NASA imagery, never at build time.

python tools/prepare_near_orbit_satellite.py --download
python tools/prepare_near_orbit_satellite.py --verify
Requires Pillow and NumPy. Sources remain in ignored assets/source/local/.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import urllib.request

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "assets/source/local/environments/near-orbit-nasa-v001"
OUT = ROOT / "unity/SpaceDragon/Assets/SpaceDragon/Dogfight/Imported/PlanetSatellite-v001"
RECORD = ROOT / "assets/source/environments/near-orbit-nasa-v001"
SOURCES = [
    ("world.200408.3x21600x10800.jpg",
     "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/august/world.200408.3x21600x10800.jpg",
     "926be7253be90a1fd57071a33afbfe7a712a2dfe0d5b5b4602bc5dfbcfdc2c89"),
    ("gebco_08_rev_elev_5400x2700.jpg",
     "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/topography/gebco_08_rev_elev_5400x2700.jpg",
     "97828a87bcb6549a527232455e478c5f9e4556f761b37d620a46446da17593ab"),
    ("cloud_combined_8192.tif",
     "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_8192.tif",
     "d137775d8966ab8d443fd5126dc6e7ad72072bc1ed50555c5818d221735daf0f"),
]
# A 72 x 36 degree source crop provides real local detail without shipping a 21K globe.
# Sphere UVs: u=(longitude+180)/360, v=(90-latitude)/180 (north at v=0).
REGION = (-24.0, 18.0, 48.0, 54.0)  # west, south, east, north
REGION_UV = [156 / 360, 36 / 180, 72 / 360, 36 / 180]
Image.MAX_IMAGE_PIXELS = 260_000_000  # Known, hash-checked 21600x10800 source only.


def digest(path: Path) -> str:
    result = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def crop_region(image: Image.Image) -> Image.Image:
    west, south, east, north = REGION
    w, h = image.size
    return image.crop((round((west + 180) / 360 * w), round((90 - north) / 180 * h),
                       round((east + 180) / 360 * w), round((90 - south) / 180 * h)))


def land_alpha(rgb: np.ndarray) -> np.ndarray:
    # Art-only classification of the cloud-free base map, NOT a scientific land mask.
    # Blue-dominant dark pixels are water; snow and pale land remain land. Antialiased
    # image edges remain soft after resampling. Coastal mixed pixels can be imperfect.
    r, g, b = [rgb[:, :, i].astype(np.float32) / 255 for i in range(3)]
    water = (b > r * 1.07) & (b > g * .95) & (r < .22)
    return np.where(water, 0, 255).astype(np.uint8)


def store(name: str, pixels: np.ndarray, *, srgb: bool) -> dict:
    # Unity texture coordinates start at the image bottom; flip once so mesh v=0
    # samples NASA's northern edge. This flip also applies to packed slope data.
    image = Image.fromarray(pixels).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    path = OUT / (name + ".png")
    image.save(path, optimize=True)
    w, h = image.size
    return {"path": path.relative_to(ROOT).as_posix(), "sha256": digest(path),
            "bytes": path.stat().st_size, "width": w, "height": h,
            "channels": image.mode, "sRGB": srgb,
            "estimatedBC7FullMipBytes": sum(max(1, (w >> mip) + 3 >> 2) *
                max(1, (h >> mip) + 3 >> 2) * 16 for mip in range(max(w, h).bit_length()))}


def generate() -> list[dict]:
    records = []
    with Image.open(RAW / SOURCES[0][0]) as source:
        global_image = source.resize((2048, 1024), Image.Resampling.LANCZOS)
        regional_image = crop_region(source).resize((4096, 2048), Image.Resampling.LANCZOS)
    for name, image in [("earth-global-color-land-v001", global_image),
                        ("earth-regional-color-land-v001", regional_image)]:
        rgb = np.asarray(image.convert("RGB"))
        records.append(store(name, np.dstack((rgb, land_alpha(rgb))), srgb=True))

    with Image.open(RAW / SOURCES[1][0]) as source:
        elevation = np.asarray(crop_region(source.convert("L")).resize(
            (2048, 1024), Image.Resampling.LANCZOS), dtype=np.float32) / 255
    # NASA's 0..6400m height display is compressed to 0..180m for the 26km visual
    # globe; no mesh displacement/collision. Slopes have real geography, no tile folds.
    latitudes = np.linspace(REGION[3], REGION[1], elevation.shape[0])
    spacing_u = 26000 * np.deg2rad(REGION[2] - REGION[0]) / elevation.shape[1] * np.cos(np.deg2rad(latitudes))
    spacing_v = 26000 * np.deg2rad(REGION[3] - REGION[1]) / elevation.shape[0]
    dv, du = np.gradient(elevation * 180)
    du /= spacing_u[:, None]
    dv /= spacing_v
    packed = np.stack((elevation, .5 + du * .5, .5 + dv * .5), axis=2)
    records.append(store("earth-regional-relief-v001", np.uint8(np.clip(packed, 0, 1) * 255), srgb=False))

    with Image.open(RAW / SOURCES[2][0]) as source:
        clouds = np.asarray(source.convert("L").resize((4096, 2048), Image.Resampling.LANCZOS), dtype=np.float32) / 255
    # Separate density and slopes: cloud brightness is an optical-density proxy,
    # not measured cloud height. Gentle finite-difference normals plus macro shadows.
    dv = np.gradient(clouds, axis=0) * 3.2
    du = (np.roll(clouds, -1, axis=1) - np.roll(clouds, 1, axis=1)) * 1.6
    packed = np.stack((clouds, .5 + du * .5, .5 + dv * .5), axis=2)
    records.append(store("earth-cloud-density-slopes-v001", np.uint8(np.clip(packed, 0, 1) * 255), srgb=False))
    return records


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true", help="Download only missing, pinned public NASA inputs")
    parser.add_argument("--verify", action="store_true", help="Verify selected derivatives without raw sources/network")
    args = parser.parse_args()
    manifest_path = RECORD / "provenance.json"
    if args.verify:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        for item in manifest["derivatives"]:
            path = ROOT / item["path"]
            assert digest(path) == item["sha256"], f"Derivative hash changed: {path}"
            with Image.open(path) as image:
                assert list(image.size) == [item["width"], item["height"]]
                assert image.mode == item["channels"]
        print(f"Verified {len(manifest['derivatives'])} planet derivatives; {manifest['derivativeBytes']:,} bytes. Runtime not tested.")
        return
    RAW.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    RECORD.mkdir(parents=True, exist_ok=True)
    source_records = []
    for name, url, sha256 in SOURCES:
        path = RAW / name
        if not path.exists() and args.download:
            urllib.request.urlretrieve(url, path)
        if not path.exists():
            raise FileNotFoundError(f"Missing {path}; rerun with --download.")
        if digest(path) != sha256:
            raise ValueError(f"Source hash mismatch: {path}; refusing changed/partial input.")
        source_records.append({"file": name, "url": url, "sha256": sha256, "bytes": path.stat().st_size})
    derivatives = generate()
    shutil.copyfile(RECORD / "NOTICE.txt", OUT / "planet-satellite-v001-NOTICE.txt")
    manifest = {"id": "near-orbit-nasa-v001", "prepared": "2026-11-01", "authority": "visual backdrop candidate",
                "credit": "NASA Earth Observatory; NASA/GSFC, Reto Stockli (land and clouds); GEBCO (topography)",
                "sourcePages": [
                    "https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/",
                    "https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/topography-bathymetry-maps/",
                    "https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/"],
                "usageGuidance": ["https://science.nasa.gov/earth/faq/", "https://www.nasa.gov/nasa-brand-center/images-and-media/",
                                  "https://www.gebco.net/data-products/gridded-bathymetry/terms-of-use"],
                "sources": source_records, "derivatives": derivatives,
                "noticePath": (OUT / "planet-satellite-v001-NOTICE.txt").relative_to(ROOT).as_posix(),
                "derivativeBytes": sum(x["bytes"] for x in derivatives),
                "estimatedBC7FullMipBytes": sum(x["estimatedBC7FullMipBytes"] for x in derivatives),
                "regionDegreesWestSouthEastNorth": list(REGION), "regionUvMinAndSize": REGION_UV,
                "orientation": "PNG rows flipped for mesh v=0 north. Regional UV has same north-to-south direction. Upward location: 36N 12E; geographic north faces world +Z.",
                "recipe": "Color: Lanczos downsample/crop, RGB unchanged, color-derived land alpha. Relief: GEBCO display height resized; visual height 180m, central differences divided by spherical metre spacing; RGB height/dU/dV. Clouds: 8192 satellite composite resized to 4096, RGB density/dU/dV. All maps have mipmaps in Unity.",
                "limitations": ["Historical Earth images as local art reference, not a canon planet or navigation map.",
                                "Regional color is detailed only inside 72x36 degrees. Globe follows camera translation; no terrain travel, landing or collision.",
                                "Topography source is an 8-bit display JPEG, not scientific elevation. Land mask is color-classified and may misclassify coastal pixels.",
                                "Cloud normals/height are artistic approximations of a 2001/2002 composite, not weather simulation.",
                                "BC7 bytes are analytical payload estimates, not GPU/driver memory or measured frame cost.",
                                "Runtime compression and actual WebGPU/WebGL2 appearance/performance require Unity/browser verification."]}
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"derivativeBytes": manifest["derivativeBytes"], "estimatedBC7FullMipMiB": manifest["estimatedBC7FullMipBytes"] / 2**20,
                      "files": [x["path"] for x in derivatives]}, indent=2))


if __name__ == "__main__":
    main()
