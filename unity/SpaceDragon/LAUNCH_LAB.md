# Local launch rehearsal (SD-073)

This separate Unity scene compares a twelve-second live Timeline/Cinemachine launch with a seven-second, URL-served Blender insert. Both finish with the same live dragon and bounded keyboard flight. It does not read or write campaign, First Contact or learner saves. Subsequent video authoring uses [Google Vids with manual exports (SD-076)](../../docs/decisions/2026-10-31-google-vids-manual-exports.md); Runway is parked. No Google Vids export has been received or integrated; the current build still contains the verified Blender animatic.

The [verification receipt](../../docs/reports/2026-10-31-unity-launch-cinematic.md) records 21 EditMode tests, original source/video production, the frozen Web build, eleven actual AMD/Chrome cases per WebGPU/WebGL2 backend and a separate real headed focus-recovery pass. This is a technically verified local proof with visibly provisional scenery/lighting, not final cinematic quality or release approval. Earlier failed and untestable runs remain recorded. The original post-build manifest and later shared-worktree manifest remain distinct because other Unity work continued after this build.

## Reproduce

Run from the repository root with the pinned Unity 6000.6.7f1 Editor and Web Build Support installed:

```powershell
node tools/unity/prepare-launch-assets.mjs --verify
node tools/unity/prepare-launch-video.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File tools/unity/run-launch.ps1 -Action setup
powershell -NoProfile -ExecutionPolicy Bypass -File tools/unity/run-launch.ps1 -Action test
powershell -NoProfile -ExecutionPolicy Bypass -File tools/unity/run-launch.ps1 -Action web
node tools/unity/serve-launch.mjs
```

`--verify` uses the already prepared LaunchLab imported assets and receipt. Video verification and the build wrapper use the selected, tracked derivatives in `assets/game/cinematics/launch-v003/`; run `git lfs pull` after checkout to obtain the MP4/GLB payloads. A checkout build does not require ignored original Blender sources or rendered frames. Run asset intake without `--verify` only when the original local inputs are available and you deliberately intend to refresh prepared derivatives. Preserve the original source and its recorded identity.

Open `http://127.0.0.1:5195/space-dragon-launch/`. Start with **Launch · live Unity** or **Launch · Blender video**. WASD/arrows steer after the handoff; Shift boosts; Escape pauses. Release held controls to resume steering. Replay restores the pre-replay flight pose and velocity. The launch sound is an optional existing licensed jet cue; this proof has no completed score or dialogue mix.

Run `node tools/unity/verify-launch-browser.mjs` only after rendering/building has finished. It uses installed Chrome, records actual backend/device information, preserves timestamped evidence and exercises normal/skip/replay/failure paths. `SPACE_DRAGON_FORCE_WEBGL=1` requests the WebGL2 fallback run. Physical controller and audible-output checks require separate observation.

For actual focus loss, run the separate bounded probe with the same server ready:

```powershell
node tools/unity/verify-launch-focus.mjs
```

This opens a dedicated ordinary Chrome process and attaches to its default CDP context without Playwright's focus overrides. Foreground the game window before readiness if Windows starts it occluded. The recorded pass required one startup activation; subsequent real tab-switch, frozen-pose, deliberate-resume and fresh-steering assertions ran without UI intervention. The final focus probe retains screenshots/events/state snapshots and has no video recorder. The main headless recordings remain the live/video evidence; their own focus entries honestly remain NOT TESTED.

`run-launch.ps1 -Action windows` builds the separate native candidate when requested. Browser verification does not establish native playback behavior. Never run two Editor/build jobs against this project at once.

## Local media

The [reviewed media package](../../assets/game/cinematics/launch-v003/README.md) preserves the exact Blender MP4s and original receipt used in browser verification. Default `prepare-launch-video.mjs` verification and `--copy-build web` / `--copy-build windows` read this tracked package. The source workflow below is optional and requires the ignored local originals; it is unnecessary for a clean-checkout build.

The editable launch source is `assets/source/local/cinematics/launch-v003/launch-v003.blend`. Its original master is the existing `Space Dragon Spacecraft-v004-flight.blend`; neither that master nor the live Blender session is modified. The dense shared path is `Assets/SpaceDragon/LaunchLab/launch-choreography-v001.json`. It fixes root motion, camera, lens, wing-loop phase and the boundaries: live 0–3 s, video 3–10 s, protected live 10–12 s.

`tools/unity/render-launch.py` creates a new versioned source with `--prepare`, or reopens that source to render a selected frame range. It refuses to overwrite an existing version. The production candidate uses an **Eevee animatic**, with separate Cycles look-development stills. It is not an AI-enhanced or final cinematic render. The original model's Flight loop is reused; there is no newly authored skeletal takeoff clip.

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --threads 8 --python tools/unity/render-launch.py -- --engine BLENDER_EEVEE --start 91 --end 300 --percent 100 --samples 8 --label frames
node tools/unity/prepare-launch-video.mjs --encode
```

Encoding requires all 210 source frames, validates seven seconds of H.264/yuv420p with no embedded audio, and produces 720p and 540p candidates under ignored `assets/game/local/cinematics/launch-v003/runtime/`. It preserves source/frame/video hashes, refuses to overwrite an existing encoded receipt and never updates the tracked review package. `--encode` cannot be combined with `--copy-build`; new derivatives require separate playback/handoff review and deliberate promotion. The build wrapper copies only receipt-listed tracked derivatives into `Builds/LaunchWeb/videos/` (or `Builds/LaunchWindows/videos/`); source `.blend` files and reference materials are excluded. Videos are not packed into shared StreamingAssets or the First Contact build. The localhost server supports bounded byte-range requests and sends the correct video MIME type.

The scenery and lighting of the Blender animatic and Unity lab are provisional and differ. Shared choreography and a protected live ending establish the control transition; they do not establish pixel-perfect visual continuity. Production scenery matching, longer Cycles rendering and a complete sound mix remain later art work.

## Technical boundaries

- Timeline controls the root and Cinemachine camera during the shot; flight controls them after one guarded handoff. Setup evaluates actual Timeline samples at 0, 3, 10 and 12 seconds against the shared contract.
- The additive OrbitLab scene must be ready before handing over control. The live dragon remains in the launch scene. Video never awards or unlocks anything.
- URL video is prepared asynchronously. A usable first-frame event and advancing media time are checked separately from preparation. Missing, stalled or blocked media returns to the live path; skip remains available.
- Pause/focus loss freezes sequence and input. Resume requires deliberate input. Callbacks from an obsolete run cannot complete a newer one.
- Reduced motion uses the steady live camera, bypassing encoded camera motion. Video quality changes only the derivative; core flight is the same.
- Web playback is not frame-accurate. The final live section, rather than a video frame index, determines actor pose and control state. See the [Unity 6.6 Web video documentation](https://docs.unity.com/en-us/engine/6000.6/manual/platform-specific/webgl/develop/video).

See [the current plan](../../docs/plans/UNITY_LAUNCH_CINEMATIC.md) and [verification receipt](../../docs/reports/2026-10-31-unity-launch-cinematic.md) for measured results and retained failures. Frame samples were recorded on a shared desktop with other Unity/Blender processes and recording overhead; they are not isolated or sustained-performance benchmarks. Human visual/audio/comfort review, native LaunchLab playback, physical controller coverage and release approval remain separate.
