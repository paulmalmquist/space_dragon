# Town Drive reference vegetation v004 — editable r05 source

Stable asset ID: `town-drive-reference-v004`. This directory preserves the selected
Blender 5.2.1 LTS source for `royal-palm`, `fan-palm` and `clipped-hedge`, with separate
`LOD0` and `LOD1` children, metre-scale geometry, materials and packed textures.

`town-drive-reference-v004-r05.blend` is **12,914,122 bytes**, SHA-256
`d37a5081929c84aa66ec872399c40f6ccb963c330799b6bbb8707fa11983d6ac`.
It is a byte-identical copy of the preserved ignored authoring source at
`assets/source/local/town-drive/reference-v004/r05/town-drive-reference-v004-r05.blend`.
The repository's existing `*.blend` Git LFS rule applies.

The original geometry was authored in Blender from observations in the owner's
`IMG_5754.MOV`: pale trunks and drooping pinnate crowns at 00:35/00:45, rounded fan
crowns and brown lower fronds at 04:15/04:30/06:00, and dense clipped hedges at
02:15–03:00. These are visual shape references, not botanical species claims or
photogrammetry. r05 changes distant foliage density while preserving r04 near
geometry byte-for-byte.

## Materials and rights

- [Palm Tree Bark](https://polyhaven.com/a/palm_tree_bark): photography by Dimitrios
  Savva, processing by Rico Cilliers. The original color, normal and roughness maps
  are photographic; the paler royal trunk color is a derivative with reduced contrast.
- [Island Tree 02](https://polyhaven.com/a/island_tree_02): scanning/processing by
  Rob Tuytel, cleanup/processing by Rico Cilliers. Hedge leaves and branches reuse
  these photographic color, normal and ARM maps; the source leaf mask is packed
  into a derived RGBA leaf texture.
- Both source sets are [CC0-1.0](https://polyhaven.com/license). Powered by Poly Haven.
- Palm leaflet color/vein textures and all new geometry are original authored work.
  The palm leaf atlas is procedural, **not a photographic scan**.

Before promotion, all ten licensed source-file hashes and the authoring recipe
hash were checked against the frozen receipt. The recipe loads only those licensed
maps and its authored/derived texture files, then packs every file-backed image.
The source contains an authored review ground, lights and camera; it contains no
video frames, personal images or reference boards. The selected runtime exports
exclude that review studio. No external generator or personal-media upload was used.

## Editing and regeneration

Open the packed source in Blender 5.2.1 or later and save edits to a new numbered
revision. The studio offsets the three asset roots for review; game exports need
one asset at its ground origin and its two named LOD children, without `REVIEW_ONLY`
objects. Blender uses Z up; the existing glTF exports use Y up.

The [authoring recipe](../../../../tools/blender/build-town-drive-reference-v004.py)
has SHA-256 `dc63e4584a5cebe78a641da5f8bd9ef6f6e82aa880a9fce67dd615bb3cd58880`.
Run it from the repository root in a separate background process, using a new
revision such as `r06` and a local library containing the licensed files listed in
the receipt. It refuses to overwrite existing revision directories.

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --disable-autoexec --threads 4 --python tools/blender/build-town-drive-reference-v004.py -- --repo . --source-library C:/Projects/space_dragon --revision r06
```

`--lod-review-only` reduces review rendering to the far variants; it still exports
both LODs. It is not needed to edit this self-contained packed source.

## Verification and runtime handoff

The r05 source reopened successfully; all three GLBs reimported with matching
geometry/bounds and usable images. Export validators reported zero errors and
warnings, with two unused-tangent informational notices per palm. The frozen
source receipt's older “no infos” wording is superseded by this correction and the
[verification report](../../../../docs/reports/2026-11-01-town-drive-reference-road-assets.md).

The tracked [runtime provenance](../../../../unity/SpaceDragon/Assets/SpaceDragon/TownDrive/Art/v004/source-receipt.json)
records texture authors, source hashes and export settings. The measured
[runtime manifest](../../../../unity/SpaceDragon/Assets/SpaceDragon/TownDrive/Art/v004/reference-art.json)
records the selected GLB hashes, dimensions and LOD triangle counts. Unity/player
verification is recorded separately in the report. These are reviewed candidates;
human art-quality and photorealism approval remain open.
