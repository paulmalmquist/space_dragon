# Google Vids with manual exports — SD-076

**Date:** October 31, 2026 · **Authority:** CONFIRMED owner direction · **Work state:** planned; guidance recorded. No Google Vids export has been received or tested.

Owner wording:

> forget runway for now we will use google vids with manual exports

Use **Google Vids with manual file exports** for cinematic video authoring. Runway is parked for now. This supersedes SD-073's Runway reconnection/generation follow-on; do not request Runway authentication or build a Runway integration for current work. Revisit that provider only on a later owner instruction.

## File handoff

1. Paul works in Google Vids and manually exports the selected shot. Blender remains the authoritative source for recurring models and authored motion; Unity remains the gameplay world and the default in-engine cinematic path.
2. Preserve the delivered file unchanged in a versioned folder under `assets/source/local/cinematics/`. Record its original filename, export date, source/provenance and SHA-256. A Google Vids project link is not a runtime video asset.
3. Inspect the actual file locally: duration, dimensions, frame rate, codec, audio tracks, first/last frames and continuity with the intended Unity shot. Make separate browser-compatible H.264 MP4 derivatives as needed under `assets/game/local/cinematics/`; do not assume provider export settings or overwrite the original. Keep original score/dialogue stems separately.
4. Integrate the reviewed derivative through Unity's URL-video path. For LaunchLab, retain its live opening and protected live ending, shared dragon/camera/velocity contract, and live fallback. Each new export needs playback, skip/replay, failure and handoff checks before it inherits verification status.

Next useful action: intake and review of the first manually exported file when available. This direction adds no automatic export, connector/API dependency or hosting change. The existing Blender animatic and frozen tested LaunchLab build remain the current evidence; do not relabel them as Google Vids output or AI-enhanced footage.

**Routing:** [inbox](../../ideas/INBOX.md), [ledger](../project/IDEA_LEDGER.md), [asset pipeline](../ASSET_PIPELINE.md). Local SD-074/075 and `origin/main@5121e1d` were checked before allocating SD-076. The local cinematic plan follows this decision; its broader implementation is separate from this workflow commit.

## Verification receipt

- **Pre-commit scope/artifact:** documentation and workflow routing only, based on `feat/town-drive-lab` at `deedd01528b3e8d22c0af3bedba9a79436f80be7`, with concurrent work preserved; no deployment.
- **Checks:** `python tools/check_foundation.py` and scoped `git diff --check` pass. A targeted text audit confirms active guidance parks Runway and points to the manual file workflow.
- **Evidence limits:** no runtime, source footage or tested build changed. Google Vids authoring/export, provider features and new-media Unity playback are NOT TESTED. Existing SD-073 results remain historical evidence for its actual Blender clip.
- **Next action:** receive a manual export, preserve its original bytes, then inspect and validate its Unity handoff under the workflow above.
