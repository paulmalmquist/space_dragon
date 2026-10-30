# House interior

**Purpose:** owner-provided video reference for the initial house's 3D environment in Space Dragon. Use it when designing the opening living-room/computer area and the house-to-backyard transition. The owner assigned the label; no room dimensions or finished geometry are established by this intake.

## Source and availability

- Original upload: `IMG_5753.mp4`, supplied October 30, 2026.
- Organized filename: `house-interior.mp4`.
- Saved source: the owner's `Space Dragon/House interior/` folder in ChatGPT files.
- Local authoring path: `assets/reference/local/environments/house-interior/house-interior.mp4`.
- The video is an ignored local reference, not a file distributed by this Git checkout. An agent on another machine needs the saved video downloaded or attached before inspecting it. Preserve the original bytes and use a separate directory for extracted frames or other derivatives.

## Intended use

Consult the walkthrough for visible room connections, openings, furniture placement, materials, and the feel of the initial house. Use clear overlapping frames when assessing layout; mark unseen areas and estimated dimensions explicitly. A visual reference does not establish a measured floor plan or guarantee an automatic scan.

Begin environment production with a useful opening-scene area. Keep walls, doors, furnishings, the computer, and gameplay interactions editable. Follow the [asset pipeline](../../../../docs/ASSET_PIPELINE.md) and [Seele intake procedure](../../../../seeles-assets/README.md) when generated or captured assets become available. Creating this reference folder does not create a 3D environment or select a reconstruction service.

Keep the video and extracted reference imagery outside the runtime build. This intake records use as an authoring reference; it does not publish the footage in this public repository or send it to Seele or another generation service.

## Intake receipt — SD-029

- Source size: **63,243,077 bytes**.
- SHA-256: `f7ef063b636d802eeb9e15d01c7569c213202f0b2e90a900c08e51e8f0a9e96f`.
- FFprobe metadata: approximately **99.87 seconds**, **512 × 910**, **30 fps**, H.264 video with AAC audio.
- **VERIFIED:** the original was renamed/organized in the owner's files; the local copy matches its SHA-256; metadata was read successfully. Root ignore rules already cover the local reference path.
- **REVIEWED:** sampled frames across the clip for source suitability. No complete scene measurement, reconstruction, photogrammetry alignment, or model generation was performed.
- **Documentation checks:** `python3 tools/check_foundation.py`, changed Markdown links/whitespace, and Git-ignore checks for the raw video and tracked source note passed.
- **NOT TESTED:** runtime import, Blender handoff, browser performance, or a Seele export. No runtime code changed.

Owner wording and routing are preserved in [the inbox](../../../../ideas/INBOX.md) and [idea ledger](../../../../docs/project/IDEA_LEDGER.md).
