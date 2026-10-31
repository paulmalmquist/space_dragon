# SD-073 — Unity launch cinematic and enhanced-video comparison

**Captured:** October 31, 2026 · **Authority:** CONFIRMED bounded implementation request · **Work state:** verified for the bounded local proof. [The receipt](../reports/2026-10-31-unity-launch-cinematic.md) records 21 EditMode tests, source/video/Web build, eleven passing hardware cases per WebGPU/WebGL2 backend and a separate actual headed focus-loss/recovery pass. Earlier failures remain retained. Human visual/audio review, physical controller/native launch coverage and release remain separate. No AI output or final-quality approval is claimed.

[The decision](../decisions/2026-10-31-cinematic-launch-proof.md) selects a separate LaunchLab in the existing Unity project. [The source](../../ideas/2026-10-31-cinematic-launch-source.md) preserves the owner wording. Earlier [cinematic planning](../engineering/CINEMATIC_TRANSITIONS.md) remains the interruption/state reference; its Three.js location, roughly 20-second duration and scoping-only boundary are superseded for this task.

**Latest owner steering — SD-076:** “forget runway for now we will use google vids with manual exports” (October 31). [The workflow decision](../decisions/2026-10-31-google-vids-manual-exports.md) selects Google Vids → manual file export → local inspection/encoding → Unity playback and handoff checks. Runway is parked; do not request reconnection or implement its integration. No Google Vids export has arrived. The earlier “Proceed locally; defer AI enhancement” reply explains the verified Blender/Unity proof below, not a requirement to resume Runway.

## Strategy

| Layer | Role in this proof | Truth and limitation |
| --- | --- | --- |
| Original Blender dragon | Recurring editable geometry, rig, named components/sockets and material intent | Reuse the existing versioned export and preserve its source; enhanced imagery cannot silently redesign it. |
| Unity scene/director | Default cinematic, continuous ending, camera/animation/audio ownership and actual flight control | Must run in the built player. Editor playback or source files alone are insufficient. |
| Blender-authored choreography and original footage | Define the shared flight path, wing/camera poses and enhancement source; capture the fully live Unity alternative separately | Record duration, resolution, frame rate, hashes, camera/quality settings and encode details. An original render is not an AI result. |
| Google Vids manual export | Selected next video-authoring workflow; first file pending | Preserve the manual export and provenance; inspect actual codec/timing and dragon/camera continuity locally. No export or enhanced footage is verified yet. |
| Video playback and fallback | Selected URL/local clip, with a reliable return to the prepared live scene | A URL or finished playback event never supplies game-state authority. Unavailable media takes a useful local route. |

Keep live rendering for repeatable interaction and the final controllable shot. Consider enhanced video for a fixed atmospheric spectacle only when its observed benefit justifies consistency, encode/download and maintenance costs. Do not promise an AI advantage before comparing actual clips.

## Selected 12-second contract

Twelve seconds is the implementation choice within the requested 10–15-second range. Authoring uses a shared 30 fps trajectory; live rendering need not run at 30 fps. Preparation, deliberate pause and buffering can add wall-clock time.

| Authored time | Fully in-engine alternative | Hybrid alternative | Transfer rule |
| --- | --- | --- | --- |
| 0–3 s | Unity lift/wing/thruster and camera choreography | Same Unity opening | Start only when required local actors/materials are ready; suppress gameplay input. |
| 3–10 s | Unity ascent/cloud/horizon choreography | Seven-second URL-served Blender source or actual AI derivative | Prepare video and destination resources; playback failure/skip takes the local route. Preserve source dragon and choreographed direction. |
| 10–12 s | Unity settles toward chase camera/flight | **Protected, unaltered live Unity ending** | Align the real dragon/camera/velocity/animation; return to live rendering before enabling control. |
| After 12 s | Safe playable flight | Same safe playable flight | One guarded transfer, readiness established and stale input cleared. |

AI enhancement is confined to the middle insert. Preserve controlled original boundary frames as needed, then conceal the actual video/live change with cloud, glare or an intentional cut. Browser video is not assumed frame accurate; a deadline or `ended` event alone cannot establish the playable endpoint.

The user's family-boarding and orbital panorama are staging examples. This bounded proof focuses on the existing dragon and a generic launch environment, without producing new family likenesses, selecting a canon launch location or depicting an other-universe crossing.

## Deliverables and production order

1. **Import parity and isolated scene.** Reuse the existing dragon export through a separate import receipt and LaunchLab scene, following the [Unity handoff](../engineering/UNITY_DOGFIGHT_HANDOFF.md). Confirm coordinate conversion, scale, source nose direction, rig, Flight/Glide/Boost clips, sockets and material/emissive meaning. Preserve First Contact and existing generated assets.
2. **12-second Unity sequence.** Reproduce the shared Blender-authored launch/ascent, cloud/horizon transition and settled chase ending under the contract above. Use a generic launch setting and existing permitted assets; do not imply a chosen canonical departure site. Framing and spectacle remain reversible art staging.
3. **Playable continuation.** Hand control to bounded safe flight using the same dragon and camera. Preserve ending pose, velocity, orientation and animation blend; initialize damping before enabling input. This is enough to prove steering after the shot, not a claim that full Dogfight behavior migrated.
4. **Source capture.** Produce and inspect clean Blender footage for the middle insert before dependent external generation; capture the full Unity alternative separately. Keep immutable originals, shared choreography/endpoints, exact render/build/encode metadata and representative first/middle/final frames.
5. **Google Vids manual-export follow-on — planned.** Paul authors/edits the shot in Google Vids and manually exports a file. Preserve that original under versioned local cinematic sources, inspect its actual media properties and continuity, then create separate runtime derivatives as needed. Follow [SD-076](../decisions/2026-10-31-google-vids-manual-exports.md). Do not automate Runway or relabel the existing Blender clip as a new export.
6. **Video-to-live route.** Accept a selected URL-served video (localhost for this proof), prepare it explicitly and preload/prepare the live ending. Handle readiness/playback/error/skip paths and conceal the switch through a motivated cut or cloud. Preserve live 10–12 s before control becomes available. Normal finish, skip and failed optional media converge on the same safe-flight state.
7. **Comparison and evidence.** Show the fully live Unity route and controlled Blender animatic route, plus a recording of each tested playable transition. Record real artifact sizes/load conditions, frame cadence/handoff spikes, input/state results and remaining human/device gaps. A Google Vids comparison can be added when the first manual export is available and reviewed.

Do not run another Editor/build or GPU benchmark while the project owner is using it. The existing First Contact performance results do not validate the new dragon/launch scene.

**Video workflow status:** Google Vids with manual exports is now selected; the first delivered file is pending. Runway's earlier authentication failure is historical, with no reconnect action. No new generated footage or provider capability is established by this choice. Existing media remains the controlled Blender animatic, with its original verification receipt.

## Director and browser delivery responsibilities

The source proposes Timeline/Cinemachine for live shots and a reusable separation of timeline, video, handoff, scene-preload, audio, quality and QA duties. Keep those responsibilities explicit in the small proof without treating a folder or named API as an implementation claim. Preserve original score/SOS motifs, dialogue and sound-effect stems separately; pause/mute/replay must control them with the sequence clock. No new generated voices are needed.

Use URL-based video for the browser and test initial H.264 MP4 decoding on the actual target. Prepare the video before playback; handle autoplay rejection and buffering. Prepare the real destination actors/materials while the insert runs, using asynchronous loading where a separate scene or asset load is required. Embedded VideoClip assets and frame-accurate seeking are not acceptance assumptions. Measure combined video decode and live-scene preparation, not just an isolated video player.

Keep videos on the local static server for this proof. Local 720p and 540p variants are built and decoded in the recorded WebGPU check. CDN delivery remains a future deployment choice informed by measured bytes/decode costs; no Railway API streaming, new CDN or hosting change is required now.

## Handoff and interruption contract

The rehearsal lifecycle has explicit ready/preparing/cinematic/video/handoff/safe-flight states with deliberate pause and recoverable-error paths. Runtime state owns the sequence clock and one guarded handoff. Presentation callbacks request transitions; they cannot independently grant control twice or change campaign truth.

- Load the required dragon/materials/ending scene before launch. Handle timeout/error with visible retry or local fallback; never leave an indefinite black screen.
- Let one owner write dragon/camera transforms per frame. Seed gameplay pose, velocity, bank and camera damping from the authored endpoint and blend animation deliberately.
- Clear held keys, stick/mouse offsets and fire/zoom/roll latches at takeover; require fresh input. A button held to skip must not immediately fire or turn the dragon.
- Pause/blur/hidden-tab stops clocks, relevant audio, video and flight. Resume deliberately without catch-up. Exit/replay cancels stale work and ignores late callbacks from the old run.
- Skip, completion, repeated clicks and media error converge once on the same valid ready endpoint. The optional URL path needs rejected-play, stalled/failed decode and unavailable-network tests; an unready live ending remains an explicit recoverable condition.
- Keep mute, reduced motion and resize/aspect behavior readable. Muted/failed sound cannot block progress; no required reading during ascent or immediate flight.
- Write no campaign, learner, First Contact or exploration saves and grant no items. Replay resets only the rehearsal. This task does not establish real departure checkpoints or a save migration.

## Acceptance evidence

| Area | Evidence required | Current evidence |
| --- | --- | --- |
| Asset parity | Hash/provenance, hierarchy/clip/material checks and actual imported dragon view | Setup passes: 41 meshes, 81,991 triangles, eight sockets, nine bones, three clips; browser screenshots reviewed by agent. Human fidelity review remains open. |
| In-engine cinematic | Built-player 12-second sequence and first/middle/final frames | Web build and actual WebGPU/WebGL2 UI launch/handoff pass; full-session recordings and screenshots retained. |
| Source clip | Playable Blender middle insert and Unity comparison capture, duration/resolution/frame rate and hashes | Original seven-second Eevee insert rendered/encoded; 720p and 540p decode and hand off on both backends. This is a controlled animatic, not AI footage. |
| Google Vids alternative | Actual manually exported file, local media inspection and visual/temporal comparison | PLANNED / NOT TESTED; no file received; existing local proof remains complete |
| Normal control transfer | Final pose/velocity/camera continuity and observed fresh steering | Both backends: zero recorded handoff errors, exact replay state and actual fresh steering pass. |
| Robustness | Skip at multiple phases, replay/double trigger, held input, pause/blur, sound off/reduced motion, video unavailable/stalled/failed | Eleven cases per backend pass, covering keyboard pause/held input, skip/replay, 404/readiness timeout and reduced-motion no-download. Headless focus remains NOT TESTED in those runs; a separate ordinary-headed-Chrome/WebGPU probe passes real blur/hidden pause, deliberate resume and fresh steering. Startup required foregrounding. Audible output is not verified. |
| Save/state isolation | Existing First Contact/browser saves unchanged; exactly one rehearsal handoff | Synthetic existing-save sentinels byte-identical; no observed Web Storage/progress-like IndexedDB writes; one UnityCache metadata write. Scope excludes unobserved worker/native/shutdown paths. |
| Delivery/performance | Actual browser backend/hardware, canvas/quality, load/bytes, sampling window, frame-time distribution and handoff spike | Actual AMD WebGPU/WebGL2 at 1280 × 720; 22,554,289 startup encoded bytes per run and short distributions recorded. Shared desktop applications, recording overhead and spikes prevent an isolated/sustained-performance claim. |
| Human preference | Review of visual improvement, seam visibility, motion comfort and audio | NOT REVIEWED |

Update statuses from executed evidence, not from files or intended commands. The verified local comparison covers the live Unity route and original Blender-video route with reliable control and fallback checks. A future Google Vids export needs separate acceptance; it does not invalidate or retroactively relabel that proof. Runway stays parked. The owner also previously deferred physical PlayStation testing; do not reopen that availability request for this keyboard-first proof.

Full campaign integration, Dragon Dogfight/combat parity, full-family staging, alternate planet landings and broad cinematic tooling remain follow-ons. Revisit them after the bounded handoff and human cinematic review, with their own state/save and asset evidence.
