# Architecture contract

**Status:** development constraints plus a local prototype; full game/site architecture remains in development. See [the October 29 decision](../decisions/2026-10-29-local-foundation.md) and [current status](../project/STATUS.md).
**Inspected baseline:** `82e2610be1a23ad238e9ac67884adc777aa10cbc` (2026-10-28): planning documents, photo references and a reference verifier. No application manifest, game runtime or deployment configuration was present in that tree.

## Verified versus unverified

The target route remains `/space-dragon` on the existing site. A standalone Babylon.js/TypeScript/Vite Earth game, exact lockfile, pure story-state module, v2 checkpoints with migration/recovery, spoken placeholder prompts and Playwright flows now exist. Separate Three.js Dogfight and Babylon Town Drive entries retain the boundaries below. The first pod is an actual Blender GLB/KTX2 candidate with same-origin decoders; the dragon's [asset contract](DRAGON_ASSET_CONTRACT.md) records Blender export, authored clips, attachments and actual browser checks. [Local development](../DEVELOPMENT.md) records commands/modules and [the current decision](../decisions/2026-10-29-first-contact-v2.md) records Earth boundaries. Website deployment and Railway services remain unverified. Blender access and short Lenovo/Chrome measurements are recorded in their receipts; they do not establish ongoing tool availability, sustained performance or human art approval. The development prefix is local preparation, not proof of host-site integration.

## Keep these boundaries even in a small implementation

**SD-037 prototype exception:** the [Dogfight Lab decision](../decisions/2026-10-30-seele-dogfight-lab.md) retains an inspected Seele export's Three.js `0.180.0` in a separate Vite page entry at `/space-dragon/dogfight/`. Full-page navigation keeps one renderer/input loop active; the main Earth slice remains Babylon/TypeScript. The lab owns only transient encounter state, writes no campaign/learning saves and awards no progress. This limited experiment is not a whole-game renderer migration or the eventual campaign-scene architecture. [Its receipt](../reports/2026-10-30-seele-dogfight.md) owns verification and limitations.

**October 30 owner direction (SD-062):** evaluate early refactoring around more refined imported environments/assets when that lowers total development effort. [Seele migration](../../seeles-assets/README.md) compares selected asset import, scene-layer replacement, and broader runtime/repo changes against an actual export. Babylon is the current baseline, not a permanent engine constraint. Preserve the behavior contracts below; record consequential architecture changes and update their tests rather than retaining placeholder structure for its own sake. No runtime change has been made by adding this intake process.

| Area | Owns | Must not own |
| --- | --- | --- |
| Content | Stable mission, component, character and challenge definitions | Rendering objects or network credentials |
| Game state | Objectives, inventory, checkpoint and allowed transitions | Browser DOM, meshes, timers as the sole record of progress |
| Actions | Validated semantic requests such as interact, use ability, pause | Separate game rules for keyboard versus touch |
| Presentation | Scene, camera, UI, animation, effects and audio | Awarding persistent progress only when an animation finishes |
| Persistence adapter | Versioned serialization, validation, recovery and migrations | Silent resets or serialization of live engine objects |
| Optional services | Explicit later server features behind adapters | A mandatory dependency for a single-player prototype |

These are code boundaries, not instructions to create six packages or a general-purpose engine. A small module per responsibility is enough until real use requires more.

## State and content

Use stable IDs (`paul`, `maria`, `luke`, `luna`, `lyla`) independent of display text and asset filenames. Separate story progression from provisional scene/module names. Define a small validated content format when the first mission needs it; do not prebuild an extensive schema platform.

A semantic action updates state through an explicit transition; presentation observes the result. Use an idempotency key or equivalent state guard for unique component rewards. Repeated input, animation replay and checkpoint reload must not duplicate awards. Deterministic logic tests should not require a renderer or live service.

Keep learner-local ID, selected avatar and action difficulty separate. Learning observations are not story locks or clinical assessments. Do not put actual child observations in fixtures, logs or source control.

## Saves and recovery

Start with local persistence only when implementing the approved slice. Use an explicit schema version, validate before loading, and keep recoverable prior data where possible. Test migration, corrupt input, unavailable storage, quota/write failure and an interrupted save. A failed save must display an honest state; never silently report success. New game/reset requires deliberate confirmation and must not destroy the only recovery copy accidentally.

Define exactly when a checkpoint becomes durable and what replaying a scene means. Preserve awarded inventory independently of cinematic completion. See the [interaction contract](../gameplay/INTERACTION_CONTRACTS.md).

## Rendering and input

**Proposed cinematic method - SD-038:** [Cinematic transitions](CINEMATIC_TRANSITIONS.md) scopes a renderer-local director with explicit readiness, single transform/input ownership and a camera/velocity-preserving handoff. Existing full-page Earth/lab navigation permits a concealed cut but cannot preserve live camera/audio continuity. The plan does not select a shared campaign runtime or change current save boundaries; that choice follows a bounded flight-only proof. Skip/replay/interruption retain the existing interaction contract.

Use semantic input actions across supported devices. Separate display frame rate from simulation time; bound catch-up work after tab suspension. Pause/resume must manage held inputs, audio and any timers consistently. Clean up scene resources when leaving them. Avoid allocating persistent listeners on every frame or remount.

Measure real loading size, memory and frame timing on a named device before setting numeric budgets. Record proposed targets separately from results. Reduced motion, replayable voice prompts, visible focus and large controls are design requirements for the first supported inputs; verify their implementation rather than assuming defaults are accessible.

## Integration and assets

Preserve the existing homepage. Verify route and asset base paths, direct URL reload, browser navigation and deployment isolation. Do not add a base-path assumption until the website audit proves the integration strategy.

Build from an explicit runtime-asset manifest/allowlist when assets are first integrated. Source photos, Blender reference boards, private captures and editable art sources are not runtime assets. Inspect the built output, not only source paths. A raw-file checksum scan cannot detect every resized, baked or embedded copy: also inspect textures and export contents.

No backend upgrade, public upload, analytics service, external model-generation provider or deployment is authorized by this document. No credentials in browser code, fixtures or commits. Save/deployment credentials remain server-side if those services are introduced.

## Decision record format

Use `docs/decisions/YYYY-MM-DD-topic.md` for consequential choices: status, owner/request, evidence, decision, alternatives, consequences, rollback, affected files and superseded guidance. Reversible local implementation details need not generate paperwork. Do not reinterpret historical specs as current implementation evidence.


## Town Drive Lab boundary — SD-046

The [drive decision](../decisions/2026-10-30-town-drive-lab.md) adds a separate Babylon entry at `/space-dragon/drive/`, not an Act I mission. Pure fixed-step state owns car motion, ordered leg checkpoints and the idempotent return-home flag. A separate versioned local save preserves the last checkpoint and assistance without touching story, avatar or learner data. Rendering streams procedural road chunks and observes that state. Keyboard and the existing standard gamepad adapter feed the same semantic drive inputs.

The owner-approved estimated house JSON is bundled for development and production. [SD-052](../decisions/2026-10-30-town-drive-detail-override.md) removes the prior privacy/publication rule and dev-only loader. Reference-derived runtime geometry/textures are permitted; promoted assets use the manifest. Offline comparisons remain local working output. [Verification](../reports/2026-10-30-town-drive-lab.md) owns measured results and missing device/human gates.

SD-055 traffic state lives beside the player state in the drive entry and advances through pure `traffic.ts` at fixed 30 Hz, driven by player simulation time. `traffic-visuals.ts` consumes poses only; templates/instances/LOD do not own gameplay state. Nearby vehicle footprint proxies join the existing forgiving collision solver. Rendering and pausing cannot independently advance NPC traffic.

SD-057 pedestrian position and walk phase use the player's elapsed simulation time; paused rendering cannot advance them. Street development streams with the existing road chunks. First-person eye and look offsets, steering wheel/instrument animation and minivan visibility are presentation only; they do not own steering, checkpoints or saved progress. Real route names replace fictional labels while stable section/checkpoint IDs remain unchanged.

SD-058 keeps the mapped court a true dead end. The player route retraces Starpass on return, so simulation/HUD nearest-route queries carry the previous route distance to disambiguate coincident outbound/inbound segments. World rendering draws that pavement once. Ambient traffic has a continuous shorter circuit straight through Green Island Boulevard, excluding the court branch; its physical distances and poses remain separate from player checkpoint progression. Existing saves store stable checkpoint IDs, not old world coordinates. A fresh-start option deliberately begins a new drive at Starpass without touching campaign saves.


**SD-056 sound samples:** Dogfight loads five same-origin edited WAVs only after sound opt-in, caches decoded buffers and layers them through the existing capped voice graph. Missing samples retain synthesis; asynchronous loading never replays a past cue. Sample sources share existing pause/mute/breath-group/disposal cleanup, with abort-on-dispose and no persistent game state. [Library and provenance](../../assets/source/audio/sonniss-gdc-2026/README.md).
