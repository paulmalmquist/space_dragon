# VR-ready architecture, without building VR — SD-078

**Date:** October 31, 2026 · **Authority:** CONFIRMED owner request to design for VR compatibility now and add a VR-ready requirement to the Unity development standards; the three play modes are BOOKMARKED; cockpit-first sequencing, PC-VR-first and the platform path are PROPOSED; the requirement details are engineering choices. **Work state:** planned; standard recorded. Full owner wording is in [the inbox](../../ideas/INBOX.md).

## Decision

Adopt the [VR readiness standard](../engineering/VR_READINESS.md) for new and ported Unity gameplay, camera, input, UI, shader and cinematic work. It keeps a future VR rig additive: simulation never reads the view, cameras sit under a mode-owned rig, seats have named eye anchors at metre scale, input goes through semantic actions, HUD is a view model with replaceable presenters, view motion is listed in a comfort register, cinematics never take over the head, shaders stay stereo-safe, and VR performance needs its own evidence.

Do not build VR now. Add no XR package, OpenXR setting, rig scene or headset build to the shared Unity project, and no WebXR to the browser labs. A seated VR cockpit dogfight is the proposed first prototype, gated on Unity dragon/flight/combat parity, an owner-selected headset and PC, and agreement from the shared Unity project's owning channel.

## Rationale

VR depends on boundaries the project already wants: authoritative state separate from presentation, semantic input and metre-scale assets. Writing new Unity code to these rules costs little. Retrofitting camera-coupled aiming, screen-only HUD, device polling and camera-driven cinematics later costs a lot. The cockpit gives a stable visual frame and reuses dogfight mechanics with the least change, so it is the lowest-risk first step. On-foot locomotion, falling and swinging are the highest comfort risk and come last.

## Contradictions and their practical effect

- **Engine record.** The owner's message says "our move from Three.js to Unity". On `main`, the Earth slice is Babylon, only the Dogfight Lab is Three.js, and no Unity decision is committed. Concurrent unmerged branches cite an SD-072 Unity engine direction and record SD-074 (Town Drive in the shared `unity/SpaceDragon` project). *Effect:* this standard targets that shared Unity project as the forward runtime, does not edit it, and treats the browser labs as references. Reconcile wording when SD-072 merges.
- **WebXR.** Babylon and Three.js support WebXR natively; Unity does not directly support XR on its Web platform. *Effect:* with Unity, VR ships as a native build and the browser build stays flat. No WebXR work goes into the browser labs, and no community WebXR exporter is adopted without an owner request.
- **Controller.** The message pairs traditional mode with a PlayStation controller. *Effect:* the [keyboard-first decision](2026-10-29-keyboard-first-input.md) stands; pads remain supported through [SD-070](2026-10-30-playstation-controller.md), and XR controllers would become additional bindings.
- **"Luke's web-slinging".** Tether and swinging powers exist only in PROPOSED treatments. *Effect:* the comfort register lists the motion without promoting the power to canon.
- **Live spelling.** The learning rules forbid decoding while dodging, except the owner's [SD-041 exception](2026-10-30-live-spelling-flight.md) for Dogfight word charges. *Effect:* SD-041 holds in VR. A VR prototype adds a cockpit-space letter presentation and an adult comfort and legibility review; any change to SD-041 is the owner's decision.
- **"Operate weapons" from the cockpit.** *Effect:* the single pilot flies and fires; no gunner or crew role is introduced ([SD-011](2026-10-29-alley-oops-and-jet-flight.md)).
- **PC upgrade.** [SD-023](../project/IDEA_LEDGER.md) recorded no replacement computer planned. *Effect:* a PC VR GPU upgrade is an owner purchase decision; the flat-screen Lenovo/Chrome target (SD-008) is unchanged.
- **Children and headsets.** Meta's guidance sets a minimum age of 10 and does not recommend headsets for younger children; the repository records no player ages. *Effect:* the prototype gate requires checking each player against the chosen headset's guidance, with adults testing first.

## Scope and superseded guidance

Supersedes nothing. Adds a review standard for Unity work. Changes no canon, save, learner record, input decision, story order, hosting or deployment. Purchases, headset selection and any XR package addition remain separate owner-approved steps.

## Verification receipt

- **Artifact:** documentation-only change on `claude/vr-ready-architecture`, based on `origin/main@5121e1d`.
- **Pre-allocation check:** ledgers on `main` and every remote branch were read. SD-072–SD-076 are cited by concurrent branches; the newest (`feat/town-drive-lab@2448669`) lists next unused as SD-078. This record takes SD-078; next unused is SD-079.
- **Checks:** recorded in the [ledger row](../project/IDEA_LEDGER.md) and the pull request: `python3 tools/check_foundation.py`, the Python unit suite, `python3 tools/verify_family_references.py` and `git diff --check`.
- **Not run:** `npm run check`, because no TypeScript, runtime or asset changed. No Unity Editor, C# build, OpenXR runtime or headset was used. All VR behavior is **NOT TESTED**.
- **Next action:** apply the review checklist to the next Unity camera, input, HUD or flight change; revisit the prototype trigger when Unity dragon flight and combat reach parity.
