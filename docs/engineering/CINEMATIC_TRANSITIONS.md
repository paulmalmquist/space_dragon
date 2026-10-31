# Cinematic transitions into gameplay

**Current production direction — October 31:** [SD-076](../decisions/2026-10-31-google-vids-manual-exports.md) selects **Google Vids with manual exports** for subsequent video work; Runway is parked. Inspect/encode each delivered file locally before Unity playback and handoff verification. The existing [SD-073 LaunchLab](../plans/UNITY_LAUNCH_CINEMATIC.md) is technically verified in [its receipt](../reports/2026-10-31-unity-launch-cinematic.md): **12 seconds**, live Unity 0–3 s, controlled Blender-video insert 3–10 s, protected live Unity 10–12 s, then fresh player control; a fully live alternative uses the same choreography. Blender geometry/motion remains authoritative and Unity owns gameplay. This supersedes the historical Three.js/scoping-only/20-second proof below. No Google Vids export is received or verified yet.

The October 30 plan below is retained as **historical proposed architecture and acceptance guidance**. Its interruption, input, state and continuity requirements remain useful; its old implementation location, duration and authorization boundary are not the current assignment.

**Date:** October 30, 2026. **Tracking:** SD-038. **Work state:** planned.
**Authority:** CONFIRMED request to scope cinematic cutscenes blended into gameplay; the method, shot timings and future prototype below are PROPOSED. This document implements no cinematic or campaign transition. [The scope decision](../decisions/2026-10-30-cinematic-transition-scope.md) records the boundary.

## Recommended method

Build the final part of each cinematic in the same runtime, with the same dragon and scene, that the player will control. A short director controls the camera, dragon pose, effects and sound; it then hands them back to gameplay. Use Blender for authored motion and shot planning. Reserve prerecorded Blender footage for occasional expensive establishing shots, with a deliberately matched cut into the real-time scene before control returns.

For the first proof, stage a roughly **20-second launch into the upper atmosphere followed by safe playable flight inside the Three.js Dogfight Lab**. Use its existing provisional dragon, a small launch set and layered clouds. The result should establish whether the transition feels continuous before investing in final dragon art, detailed terrain or family close-ups.

This is an engineering recommendation based on the inspected code and official references below. It does not promise cinematic quality or device performance before a rendered, playable review.

| Approach | Best use here | Main cost or limitation | Recommendation |
| --- | --- | --- | --- |
| Real-time, in-engine cinematic | Takeoff, landings, suit reveals, boss entrances and camera-to-control handoffs | Requires deliberate animation, lighting and browser optimization | Default, especially the final shot before control |
| Prerendered Blender video plus real-time ending | A rare planetary vista or unusually expensive spectacle | Download/decode cost; fixed appearance; matching composition and lighting takes work | Optional after the real-time handoff works |
| Generated video | Mood exploration or an explicitly selected fixed insert | Must evaluate continuity of the dragon, scenery and ending frame for the actual clip | No dependency for this plan; do not assume a clip supplies editable game geometry |
| Remote rendering/streaming | A later response to a demonstrated requirement | New hosting, latency and operating dependencies | Parked; no need demonstrated for this bounded sequence |

## What exists and what must be added

The inspected checkout has Babylon `9.33.0` for Earth and Three.js `0.180.0` for the isolated flight page. These versions come from [package.json](../../package.json), not an upgrade recommendation. The [SD-037 decision](../decisions/2026-10-30-seele-dogfight-lab.md) intentionally separates them with full-page navigation. A page navigation destroys the outgoing live scene; it cannot provide a continuously interpolated camera or uninterrupted audio between those engines.

The flight source already has local GLB loading, bloom/tone mapping, shader warm-up, a procedural dragon rig, damped chase camera, flight state, and input/audio cleanup. Those are implementation observations, not a new playtest pass. It lacks a takeoff director, atmosphere sequence, camera/control handoff and shared campaign checkpoint.

| Existing file | Proposed narrow change when building the proof |
| --- | --- |
| `src/prototypes/dogfight/main.js` | Add an explicit cinematic/preparing/handoff phase and gate combat/input; integrate one director into the existing frame loop |
| `src/prototypes/dogfight/systems/camera.js` | Add a way to seed follow position, look target, up vector and FOV from the cinematic's final camera state |
| `src/prototypes/dogfight/systems/flight.js` | Initialize a safe flight pose and velocity without calling the origin-reset path at handoff |
| `src/prototypes/dogfight/animation/dragon.js` | Assign one owner per animated bone; blend authored launch pose into procedural flight motion |
| `src/prototypes/dogfight/assets/environment.js` | Add a bounded launch backdrop, cloud pass and atmospheric horizon |
| New `src/prototypes/dogfight/cinematics/` modules | One sequence definition plus a small lifecycle director; plain data owns timing/markers, adapters own rendering |

Keep this renderer-local proof encounter-only: no new campaign rewards, learner records or save writes. It is a clearly labeled launch rehearsal, not a way to unlock the canonical dragon before Earth retrieval is complete. The main First Contact and exploration saves remain authoritative.

## Proposed dragon takeoff, shot by shot

Timings are an animatic starting point, not measured results or approved story staging.

| Time | Image and sound | Control and transition purpose |
| --- | --- | --- |
| 0-4 s | Low three-quarter view; wings open, mechanisms settle, engine hum builds, light dust catches the sun | Explicit Launch action starts the sequence after required assets are ready; save/mission validation is separate |
| 4-9 s | Dragon lifts; camera tracks beside it; the small launch set falls away | Scripted ascent; no enemy damage, firing or steering; give lift believable acceleration |
| 9-14 s | Dragon climbs through layered cloud; ground detail disappears | Cloud occlusion allows a local scenery/LOD change and optional origin rebase while retaining one renderer |
| 14-18 s | Cloud opens to a curved horizon and darkening sky; music broadens while wind thins | Settle toward flight's cruise speed and pose; camera arcs toward the chase position |
| 18-21 s | Camera settles behind the same dragon; flight HUD appears; short optional spoken cue, "You're flying" | Match position, orientation, motion, FOV and exposure; transfer ownership once |
| Afterward | A clear, forgiving flight corridor | Fresh steering input works; no immediate combat or reading requirement. Enable the encounter only after a clear ready action |

Convey scale through the changing horizon, clouds, light and sound instead of building a continuous planet-sized terrain. Atmospheric departure is not the other-universe crossing; the [campaign contract](../story/CAMPAIGN_STRUCTURE.md) keeps those distinct. The final dragon design, precise departure location, cockpit/family staging and crossing effect remain OPEN. The sequence introduces no crew-role controls or exception to the three-member active-party cap.

## How the last shot becomes gameplay

1. **Prepare first.** Load/decode required assets, create the flight scene and warm the actual materials/effects before revealing the first shot. Readiness is explicit, not a fixed timeout. Optional scenery can arrive later. If readiness fails, show retry/return instead of an endless cloud or black screen.
2. **Give transforms one owner.** During ascent, the director owns the dragon root and camera. During the handoff, compute cinematic and gameplay target poses, then let a single compositor write the displayed result. The gameplay camera and director must not independently fight over the same transform.
3. **Preserve motion as well as pose.** Initialize flight position, orientation, forward/up vectors, speed, cruise velocity, angular rates and bank from the final authored trajectory, expressed in the flight scene's coordinates. Start with no roll/boost in progress. Match the trajectory's ending velocity to a valid cruise condition; do not teleport or reset to `(0,0,0)` when the HUD appears.
4. **Seed camera damping.** Seed the chase camera's internal `look` and `targetUp`, not just its visible position. Over a proposed 1-2 seconds, interpolate position/FOV and spherically interpolate orientation toward the chase pose, with continuous easing. End with matching motion so the first ordinary camera update cannot snap. Keep the flight render cadence; a cinematic need not force the whole game to 24 fps.
5. **Blend the dragon's pose.** The current procedural animation writes wings, jaw and tail bones every update. A future glTF animation mixer cannot write those bones simultaneously without an explicit blend/ownership rule. Blend from the sampled launch pose into procedural flight, then release the authored action. Preserve required component names and pivots.
6. **Make control clear.** During the camera blend, keep safe automatic flight. At its end, enable full steering once; clear keys, mouse offsets, fire and zoom, and require fresh input. A pointer left at the screen edge must not cause an immediate turn. Fade in the reticle/HUD; delay enemies until the player is ready. Avoid silently weakening their controls during the first controllable seconds.
7. **Carry sound and light through.** Keep one audio context in the local proof. Crossfade the launch rumble into the flight loop and continue the music phrase. Match sky color, sun direction, exposure and dragon materials across the handoff. Reduce cinematic depth of field, shake and other readability costs before steering begins.

The runtime owns the timeline clock and pause state. Avoid independent wall-clock timers that keep firing after blur, skip or teardown. Camera motion is presentation; it never owns inventory or story truth.

## Connecting Earth and flight later

The first proof stays entirely in the flight page. There are two subsequent integration choices, which should be measured after the proof:

- **Keep the existing separate pages:** end the Earth shot under a full-frame cloud/fade, navigate, show a matching static transition image immediately in the destination HTML, then reveal a ready flight shot. This is a concealed cut with an honest loading fallback, not a guaranteed uninterrupted take. Audio must be restarted/crossfaded on the new page and may need a new gesture. Prefetched files can help loading but do not preserve a GPU scene or guarantee readiness.
- **If an uninterrupted Earth-to-flight take is required:** first choose a shared application lifecycle or port the relevant slice into a common renderer. A persistent DOM/audio layer could conceal disposal of one engine and initialization of another while only one renderer is active. That is additional integration work, not something the current lab already supports. Compare it with a narrow Babylon port after reviewing actual flight behavior and assets.

Do not replace the whole game's engine to make this proof. Revisit the shared runtime boundary when a real campaign departure is selected. Keep scene transfer data versioned, finite and validated: transition ID, destination checkpoint ID, authorized dragon/roster IDs, entry pose and presentation settings. Pass no engine objects or learner observations. Never let an arbitrary URL or clip-ended callback grant departure progress.

## Asset and cinematic production

Use the [existing asset pipeline](../ASSET_PIPELINE.md). Keep `.blend` sources in the appropriate `assets/source/local/` area, candidate GLBs/renders in `assets/game/local/`, and references in ignored reference locations. Only reviewed runtime files enter `public/assets/` and its manifest. Do not copy family photos, home footage or Blender reference boards into the runtime export.

Start with the supplied rig as a provisional local candidate. Establish silhouette, scale, wing motion and camera framing in an animatic. Later, author launch/wing-fold clips and camera-rig transforms in Blender; bake constraints into supported object/bone transforms. Export the selected model/rig, named clips and intentional camera rig only. Keep FOV changes, shot markers, sound cues and effect parameters in a small versioned sidecar sequence definition. A GLB does not carry the complete Blender compositor, procedural clouds, physics simulation or every animated property into the browser. Rebuild lighting, atmosphere and post-processing in the actual game, and compare exported framing there.

For cinematic appearance, prioritize a readable dragon silhouette, a coherent sun/rim light, plausible acceleration, foreground/background parallax and carefully timed engine/wing/audio accents. Use inexpensive layered cloud geometry/sprites and a horizon backdrop initially. Avoid stacking expensive blur, volumetrics and large transparent layers before measuring their cost. Match the cinematic and gameplay quality tier so the reveal does not produce an obvious visual downgrade.

**Optional video insert:** render from the same dragon/set where practical and plan the ending composition in the game camera. Match scale, lens/FOV, direction of motion, exposure, sky and aspect-ratio crop. Hide the exact switch with cloud occlusion or a motivated hard cut; a long dissolve can show two mismatched dragons. Return to a short real-time shot before giving control. Choose video encodings/resolution by actual Chrome playback tests; handle rejected `play()`, missing files, stalls and decode errors. Skip must still work. Keep captions/UI outside the encoded picture. Do not download a full cinematic library on initial game load.

Seele can supply a candidate launch set, rig or movement experiment; inspect and adapt its source under [prototype integration](PROTOTYPE_INTEGRATION.md). Blender authors motion; the runtime director handles the handoff. No new external generator, subscription, Railway service or live Blender connection is assumed or required by this plan.

## State, interruption and accessibility contract

For the lab, the lifecycle is `ready -> preparing -> cinematic -> handoff -> safe-flight -> encounter`, with explicit paused and recoverable-error paths. Skip from any cinematic point enters the same safe-flight state as normal completion, once readiness is established. Replay resets only the rehearsal encounter. Exiting cancels pending loads/cues and disposes the sequence's listeners/resources.

For later campaign integration, implement two durable boundaries through the authoritative state/persistence adapter: departure intent after validating completed assembly and the player's choice, then destination-ready after a successful handoff preparation. Write failure is visible and must not masquerade as a successful checkpoint. Retain a recovery checkpoint until the destination is durable. On reload, a pending departure can restart/skip the presentation safely; a completed departure resumes flight. Completion and skip call the same guarded semantic transition; replay cannot award, consume components, or advance the campaign again. This future save work must have its own migration tests.

Escape pauses. Blur/hidden tabs stop the sequence clock, relevant audio and flight, and release held input. Resume is deliberate and never catches up seconds of skipped simulation. Offer a labeled keyboard-accessible Skip action. Reduced motion removes shake, fast orbit and aggressive FOV changes; use a steady chase shot/brief fade to reach the identical safe-flight state. Muted or failed audio cannot block progress. No required reading or timed learning action occurs during ascent or fast flight.

## Smallest useful build and evidence

| Step | Deliverable | Exit evidence |
| --- | --- | --- |
| 1. Mechanical proof | Provisional dragon, simple launch set, cloud/horizon, one director, matched chase handoff, skip/pause/retry | Normal, skip and interrupted runs end in the same valid safe-flight state; fresh input works and existing saves are untouched |
| 2. One polished sequence | Authored lift/wing motion, coherent light, cloud pass, engine sound and music transition | Watch and play the sequence on Lenovo 82XM / Chrome; review framing, audibility, comfort and visible seams |
| 3. Campaign connection | Selected scene boundary, validated departure/destination checkpoints and real prerequisite checks | Reload/save-failure/duplicate-trigger tests; Earth-to-flight playthrough and direct-route recovery |
| 4. Reuse only after proof | Data-driven variants for a landing or another planet | Second sequence reuses the proven lifecycle without duplicating state logic |

The next useful action is Step 1, using the SD-037 control baseline and preserving its checks. It needs no final likeness assets or detailed real-home reconstruction. Final dragon art and a polished neighborhood are dependencies for the final production shot, not the mechanical proof. Full cinematic editor tooling, seamless planet-scale traversal, multiple landing sequences, generated-video production and remote rendering are parked until this proof demonstrates a need.

**Proposed visual target:** maintain the project's 60 fps goal at the selected quality setting, with no visible discontinuity at control transfer. This is NOT MEASURED. Record actual renderer/GPU, viewport and render scale, cold/warm load time, transferred bytes, frame-time distribution and worst handoff hitch, memory/resource trend after repeated replay, and a recording around the transfer. Reduce resolution/effects based on the measured bottleneck; software-rendered tests do not establish AMD performance.

Meaningful acceptance cases when implemented:

- Complete, skip at multiple phases, replay repeatedly, and double-trigger Launch/Skip; exactly one input owner and one final transition.
- Hold steering/fire/zoom/roll through the handoff; no stale control activates. Pause and blur at each phase; resume without a jump or duplicate audio.
- Fail/delay an asset or optional video; retry/return works and no story progress is lost. Exercise context loss and leave/re-enter without live hidden loops.
- Measure camera/dragon pose and velocity immediately around transfer, then visually review it at normal speed. Define numerical tolerances from the selected scene scale.
- Test reduced motion, sound off, resize/aspect changes and lower quality with readable HUD and the same state outcome.
- Run existing unit, development/production browser and asset checks. Add focused state/handoff tests when code exists; do not count this plan as executed coverage.

## Source notes

Official documentation read on October 30, 2026, plus the local source cited above. Current online documentation may differ from the pinned runtime; check the installed APIs when implementing.

- [Three.js AnimationMixer](https://threejs.org/docs/#AnimationMixer): object animation playback, delta-time update, time scaling and seeking. Supports the proposed animation control; it is not a complete cinematic director.
- [Blender glTF 2.0 manual](https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html): cameras and supported object/bone/shape-key animation; export sampling; limits on lighting and other animated properties. Supports the bake/export/runtime-recreation workflow.
- [MDN HTMLMediaElement.play](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play): playback returns a promise and script-initiated playback can be blocked. Supports the optional-video recovery requirements.

The shot design, hybrid recommendation and stage boundaries are project-specific proposals inferred from these capabilities and the inspected architecture. [The planning receipt](../reports/2026-10-30-cinematic-transition-scope.md) records actual checks and missing runtime evidence.
