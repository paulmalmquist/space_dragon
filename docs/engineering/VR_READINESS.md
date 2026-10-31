# VR readiness standard — SD-078

October 31, 2026 · **Authority:** CONFIRMED owner request to design for VR compatibility now without building VR. The three play modes are BOOKMARKED; cockpit-first sequencing and the platform path are PROPOSED; the rules R1–R12 are engineering choices made under that request. **Work state:** planned. This standard is recorded; there is no XR code, package, setting or headset build. [Decision](../decisions/2026-10-31-vr-ready-architecture.md) · [owner wording](../../ideas/INBOX.md).

**Scope:** new or ported gameplay, camera, input, UI, shader and cinematic work in the shared Unity project, following the Unity engine direction (SD-072) that concurrent channels are applying, e.g. [SD-074 Town Drive](https://github.com/paulmalmquist/space_dragon/blob/feat/unity-town-drive-foundation/docs/decisions/2026-10-31-unity-town-drive-foundation.md) on its unmerged branch. The Babylon and Three.js browser labs stay as behavior/rollback references. Do not add WebXR to them.

## Three ways to play (BOOKMARKED)

| Mode | What the player does | Current status |
| --- | --- | --- |
| Traditional | Third-person on a monitor. Keyboard stays primary ([input decision](../decisions/2026-10-29-keyboard-first-input.md)); PlayStation and other standard pads are supported ([SD-070](../decisions/2026-10-30-playstation-controller.md)). | The only mode in scope. |
| VR cockpit | Seated in the dragon's pilot seat, looking around the cockpit, flying and firing. One pilot and no crew roles ([SD-011](../decisions/2026-10-29-alley-oops-and-jet-flight.md)). | Proposed first VR prototype once the trigger below is met. |
| Full VR adventure | Leave the dragon, explore planets, use powers, interact and fight on foot. | Later. Needs its own locomotion and comfort design. |

All modes share one campaign, one save, one learner profile and the same rules. A mode is a choice of presentation, input bindings and comfort settings. It is never a separate game, save or difficulty.

## What "VR-ready" means now

**Not now:** XR packages in the shared project's manifest, OpenXR/XR Plug-in Management settings, an XR rig scene, headset builds, or a WebXR path. These wait for the prototype trigger and coordination with the channel that owns the shared Unity project's packages and settings.

**Now:** write new code so that adding a VR rig later only adds code and leaves gameplay alone. The rules below are cheap now and expensive to retrofit.

## Requirements

**R1 — Simulation never reads the view.** Flight, aiming, targeting, collision, damage and rewards take semantic actions and gameplay frames (the dragon's gameplay root, `socket_muzzle`, `socket_target`) as input. They never read `Camera.main`, a camera transform, screen coordinates or viewport size. Aim is a world-space ray from an *aim source*: the mouse or reticle now, a head or controller ray later. SD-040 lock-on dwell consumes that ray. This extends the existing [architecture boundary](ARCHITECTURE.md) that presentation owns the camera.

**R2 — One camera rig per mode; gameplay moves only the rig root.** Cameras sit under a presentation-owned rig root. Gameplay may place the rig root. It never writes a camera's local pose, field of view or projection. In VR the headset owns head pose and field of view, so chase smoothing, right-button aim zoom, the [SD-045 acceleration lens](../decisions/2026-10-30-acceleration-camera-sound.md), camera shake, and visual roll/bob are rig effects that a mode can replace or turn off. Resolve the active camera through the rig, not by global tag.

**R3 — Named seat and eye anchors at true scale.** Keep 1 unit = 1 m, +Y up, and real proportions for people, seats and controls; a headset exposes scale errors that a monitor hides. Every occupiable vehicle or mount has a named eye anchor separate from its chase anchor. The minivan already has one (driver eye at vehicle-local (−0.46, 1.42, 0.42) m in the Town Drive handoff). When the dragon cockpit is modeled, add a pilot-eye attachment through the [asset contract's](DRAGON_ASSET_CONTRACT.md) versioned attachment list. Do not repurpose `socket_camera`, which is the chase anchor, and do not rename the existing eight attachments.

**R4 — Input through actions, never devices.** Use Input System action maps with semantic actions: steer, aim, look, fire, breath, roll, break turn, boost, letter submitted, interact, sidekick, pause. Gameplay never polls `Keyboard.current` or `Gamepad.current`. Keyboard bindings come first; gamepad and future XR-controller bindings are additional bindings on the same actions. Keep *look*, *aim* and *steer* distinct, because in VR they come from the head, a hand and a stick. SD-040/041 letter entry is a "letter submitted" action, so VR can later supply a cockpit panel or controller method.

**R5 — UI is a view model plus a presenter.** HUD state lives in a view model read from game state: evasion, boost, wing energy, threat warnings, radar contacts, word-charge letters, lock state, prompts and help. A screen-space canvas is one presenter. A world-space cockpit presenter must be possible without changing game state, and the [SD-044 relative radar](../decisions/2026-10-30-dogfight-cockpit.md) is a natural cockpit instrument. Do not put essential information only in screen corners or post-processing. In VR, never head-lock text; size it by viewing angle. Pause, help and menus must work without a mouse cursor.

**R6 — Register comfort-sensitive motion.** Any feature that moves the player's view in a way their body does not feel gets a row in the register below, with its flat-screen behavior and candidate VR treatments. Add the row when the feature is built. Treatments are chosen by headset playtest, not now.

**R7 — Cinematics never take over the head.** Timeline or cinematic cameras drive flat views. In VR, a cinematic becomes a fade, staging around the seated player, or a virtual screen. Every cinematic has skip and a per-mode presentation choice. Never rotate or teleport the rig without a fade. Pre-rendered footage, including [SD-038](CINEMATIC_TRANSITIONS.md) shots and the Google Vids exports routed by concurrent SD-076, plays on a virtual screen in VR.

**R8 — Rendering stays stereo-safe and scalable.** Prefer URP Shader Graph, which supports single-pass instanced stereo automatically. Hand-written shaders must use Unity's XR stereo-instancing macros; unmodified shaders render to only one eye. Keep screen-space motion blur, heavy depth of field, chromatic aberration, lens distortion and film grain as quality-tier toggles, and never rely on them for readability. Expose shadows, reflection probes, post-processing, render scale, LOD bias and foliage density as tiers that a VR tier can lower. Keep the Windows player able to run on DirectX 11/12, the only desktop graphics APIs Unity tests for XR.

**R9 — VR needs its own frame-budget evidence.** VR targets 72–90 Hz or higher, about 13.9–11.1 ms for both eyes, and dropped frames cause discomfort. Flat 60 fps evidence (16.7 ms, one view) does not transfer. Record VR measurements per named headset, PC and scene. Make no VR performance claim without one.

**R10 — Directional audio is world-positioned.** Threat, lock and direction cues come from 3D-positioned sources or cockpit locations. Do not use 2D stereo panning that assumes the head faces forward. Music and menu sounds may stay 2D.

**R11 — Keep settings separate.** VR comfort options (vignette, snap or smooth turn, seated height, roll reduction, caption placement) belong with device and action-assistance settings, separate from the learner profile and the selected avatar. A mode never changes learning records, rewards, mission rules or immunity.

**R12 — Learning rules and SD-041 hold in every mode.** [Learning rules](../learning/LEARNING_RULES.md) apply unchanged. The [SD-041 exception](../decisions/2026-10-30-live-spelling-flight.md) keeps flight, enemy fire and dodging active during Dogfight word charges: no automatic pause, autopilot or immunity in VR either. A VR prototype places the letters in cockpit space at legible size and needs a separate adult comfort and legibility review before it is called ready. If that review finds the combination uncomfortable, the owner decides; an agent does not override SD-041.

## Comfort register

| Feature (source) | Flat-screen behavior | Candidate VR treatments |
| --- | --- | --- |
| Q/E corkscrew rolls (SD-037/043) | Dragon and chase view roll | Cockpit frame as a fixed reference; optional roll-rate reduction; vignette |
| B hard break turn (SD-043) | Braking banked turn | Vignette at high yaw rate; cockpit reference |
| Boost and acceleration lens (SD-045) | Bounded camera perspective change plus sound | No field-of-view change; sound, particles and cockpit instrument response |
| Chase-camera lag and smoothing | Third-person follow | Not used in the cockpit; any third-person VR view uses a stable, rigidly attached comfort camera |
| Hits and camera shake | View shake | Cockpit or HUD flash and controller haptics; the head never shakes |
| Crash tumble and destruction view (asteroids crash) | Tumbling chase view | Fade to black or a fixed external viewpoint; never tumble the head |
| Launch and cutscenes (SD-038) | Camera handoff | Fade, staging around the seated player, or virtual screen (R7) |
| On-foot running, jumping, falling, alley-oops (SD-011) | Third-person movement | Later: teleport or dash, smooth locomotion with vignette, snap turn |
| Luke's tether or web swinging (PROPOSED power in [planet draft](../story/PLANET_MISSIONS_AND_SOS_COMPOSITION.md)) | Not built | Highest risk; needs dedicated design before the VR adventure. Listing it here does not make the power canon |
| Town Drive minivan (SD-046) | Chase or cabin view | Seated cabin eye exists; hold the view still on reset and fade between views |

## Platform path (PROPOSED)

- **Native, not browser, for VR.** Unity does not directly support XR on its Web platform. Community WebXR exporters exist but would be an unreviewed third-party dependency, so this standard does not adopt one. Revisit only on owner request. The browser build stays flat.
- **Unity OpenXR.** Use the general OpenXR plug-in for SteamVR and other OpenXR runtimes, and Unity OpenXR: Meta for Quest. Do not use the older Oculus package, which is deprecated in Unity 6.5 and later. Use the XR Interaction Toolkit for the rig when the prototype starts. Pin versions then, not now.
- **PC VR first.** The cinematic look the owner wants points to a tethered Windows build (Quest via Link or Air Link, or SteamVR). A standalone Quest build is Android with mobile-class budgets and needs its own quality tier; decide it separately. A faster PC does not change how a standalone headset performs.
- **Hardware is the owner's call.** The current Lenovo/Chrome target has no VR measurement. PC VR needs a GPU that meets the chosen headset maker's PC VR requirements. Buying hardware is a purchase decision outside agent authority and does not change the flat-screen target (SD-008, SD-023).
- **Players' ages.** Meta's health and safety guidance sets a minimum age of 10 and does not recommend headsets for younger or smaller children. Check every player against the chosen headset's age and fit guidance before use. The repository records no ages; agents must not infer them. Adults test first.

## Prototype trigger — VR cockpit dogfight (PROPOSED)

Start only when all of these hold:

1. The Unity dragon has a stable gameplay root and named attachments, equivalent to the current asset contract.
2. Unity flight and combat (evasion, word-charge lock, breath) have parity tests and an owner feel review on a flat screen.
3. The owner names a target headset and a VR-capable PC or standalone target.
4. The owner of the shared Unity project agrees to add the XR packages and settings.

**Scope:** seated, one encounter, a placeholder cockpit, head look, keyboard or gamepad flight and fire, world-space HUD/radar/word prompt, fade on crash, basic comfort settings, and flat mode unchanged.

**Exit evidence:** a named headset and PC; sustained frame-time measurements; an adult comfort session with stop criteria; letter legibility; flat-mode regression checks. The full VR adventure follows only after on-foot gameplay exists in Unity and has its own locomotion design.

## Review checklist

Use this for Unity changes that touch camera, input, UI, shaders, cinematics or view motion. Passing it means the code was reviewed against the standard. It is not VR verification.

- [ ] No gameplay reads of `Camera.main`, camera transforms, screen space or viewport size (R1).
- [ ] Camera effects live on the rig and can be disabled per mode (R2).
- [ ] New occupiable seats have named eye anchors at metre scale (R3).
- [ ] Input goes through semantic actions; no device polling in gameplay (R4).
- [ ] HUD reads a view model; essential information is not screen-corner-only or post-processing-only (R5).
- [ ] New view motion has a comfort-register row (R6).
- [ ] Cinematics have skip and never take over the head pose (R7).
- [ ] Custom shaders support single-pass instanced stereo, or Shader Graph is used (R8).
- [ ] Comfort settings stay separate from the learner profile and avatar (R11).

## Evidence boundary

**NOT TESTED:** any headset, OpenXR runtime, stereo rendering, VR frame rate, comfort, controller bindings or child suitability. Existing flat-screen browser and C# evidence says nothing about VR.

## Sources

- Unity 6000.6 manual, [XR packages](https://docs.unity.com/en-us/engine/6000.6/manual/xr/support/support-packages.md): no direct XR support on the Web platform; community WebXR projects; OpenXR, Unity OpenXR: Meta and Oculus package deprecation.
- Unity 6000.6 manual, [stereo rendering](https://docs.unity.com/en-us/engine/6000.6/manual/xr/graphics/stereo-rendering/single-pass-stereo-rendering.md): single-pass instanced and Multiview, custom shader changes, Shader Graph support, DirectX 11/12 for desktop XR.
- Meta, [Quest safety center](https://www.meta.com/quest/safety-center/): minimum age, supervision and fit guidance.
