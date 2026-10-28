# Space Dragon — Family photo references

**Prepared:** October 28, 2026. **Count:** 18 photos. **Use:** visual references for Blender/MCP character design, not runtime game textures.

**Import:** The complete 18-photo collection is now present in the repository. See the publication decision below for the verified GitHub commit receipt.

## Start here

Open `index.html` locally to browse all references. `manifest.json` contains scene descriptions, dimensions, checksums, processing verification, and the user-confirmed subject label. `photos/` contains the cleaned copies at their supplied resolution.

See [Blender character handoff](../../../docs/BLENDER_CHARACTER_HANDOFF.md) and [publication authorization](../../../docs/decisions/2026-10-28-family-photo-references.md).

## Processing

EXIF, XMP, IPTC/Photoshop, comments, and other non-rendering application metadata were removed. ICC color profiles and rendering-related JPEG information were retained. No image was resized, recompressed, retouched, or cropped. Every cleaned image was decoded and checked against its original: dimensions, mode, and pixel bytes match. The original conversation uploads were not modified.

Metadata removal does not remove details visible in the photographs, such as clothing text, background people, or recognizable surroundings. No faces or backgrounds have been blurred.

## Names and subject selection

The user explicitly identified the **viewer-left child in `IMG_3277.jpeg`, wearing the pink strawberry-print shirt, as Lyla**. This is the confirmed identity anchor in this pack.

The prior assistant assigned the viewer-right child in that image to Luna, but that assignment was not independently confirmed by the user. Do not treat it as an additional user-approved label. Other photos are indexed by scene and filename, not by inferred identity. Do not assume that every person in a group photo is one of the five crew members. Do not match identities across photos by face recognition.

Unresolved labels do not block suit blockouts or reference-board setup. Keep those references unassigned until the owner supplies the necessary labels.

## Publication boundary

The owner explicitly requested uploading these photos to `paulmalmquist/space_dragon` for Blender MCP design. The repository was verified public during preparation. This narrow authorization supersedes the earlier blanket instruction to exclude source photos **only for the 18 files listed in the manifest**.

Do not place this folder under a web framework's `public/` directory or automatically include it in a game build. A reference folder inside a public repository is still publicly accessible. Upload authorization does not approve unrelated photos, external AI-service uploads, face-recognition datasets, voice cloning, or deployment of a family-likeness game. Do not apply an open-source code license to these photos by assumption.

## Verification

From the repository or extracted package root:

```sh
python3 tools/verify_family_references.py
```

The tool verifies the expected inventory, file sizes, SHA-256 values, and Git blob hashes. Pixel-preservation checks were performed when this package was prepared; originals are intentionally not duplicated here.
