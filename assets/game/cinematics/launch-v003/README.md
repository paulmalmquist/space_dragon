# Launch v003 reviewed playback media

These selected derivatives are byte-for-byte copies of the Blender animatic exercised in the [SD-073 Unity browser proof](../../../../docs/reports/2026-10-31-unity-launch-cinematic.md). They are technically verified review media, with provisional scenery and lighting; they are not final art or approved for release.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `launch-blender-720.mp4` | 1,275,797 | `542ff59ed9bd9a0cb320c062fd4d478c20f33b3161ce9db855b91c7ca6caac0d` |
| `launch-blender-540.mp4` | 546,296 | `0ed7fde72747b4e46ae3364d6d9648215378fceba735b85ccf4b0e534e651c60` |

Both are seven seconds, 30 fps, H.264/yuv420p, with no embedded audio. The unchanged `video-receipt.json` preserves original source, frame and derivative hashes and its historical local-candidate scope. The master geometry, choreography and eight-sample Eevee rendering came from Blender; no Google Vids or AI-enhanced export is represented here.

Run `git lfs pull`, then `node tools/unity/prepare-launch-video.mjs` from the repository root. Default verification and `--copy-build web` / `--copy-build windows` use this tracked package, so playback builds do not need local Blender masters or frames. Those originals remain under ignored `assets/source/local/cinematics/` and `assets/game/local/cinematics/`; optional `--encode` writes only local candidates and does not promote them here.

Future cinematic authoring follows [Google Vids with manual exports (SD-076)](../../../../docs/decisions/2026-10-31-google-vids-manual-exports.md). Preserve each new original, review its derivatives and playback/handoff behavior, and promote deliberately. This package retains the existing Blender provenance.
