# Architecture contract

**Status:** development constraints plus a local prototype; full game/site architecture remains in development. See [the October 29 decision](../decisions/2026-10-29-local-foundation.md) and [current status](../project/STATUS.md).
**Inspected baseline:** `82e2610be1a23ad238e9ac67884adc777aa10cbc` (2026-10-28): planning documents, photo references and a reference verifier. No application manifest, game runtime or deployment configuration was present in that tree.

## Verified versus unverified

The target route remains `/space-dragon` on the existing site. A standalone Babylon.js/TypeScript/Vite game, exact lockfile, pure story-state module, v2 checkpoints with migration/recovery, spoken placeholder prompts and Playwright flows now exist; Three.js was an earlier proposal, not a runtime being replaced. The first pod is an actual Blender GLB/KTX2 candidate with a technical browser check and same-origin decoders; human art review remains pending. [Local development](../DEVELOPMENT.md) records commands/modules and [the current decision](../decisions/2026-10-29-first-contact-v2.md) records boundaries. Website source/deployment, Railway services, Blender MCP and real-device performance remain unverified. The selected family-test target is Lenovo 82XM / Chrome / keyboard. The development prefix is local preparation, not proof of host-site integration.

## Keep these boundaries even in a small implementation

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

SD-063 renders the player car and camera from the same interpolation of the two latest 60 Hz states. Only position, heading and displayed speed are interpolated; simulation, route progress, collision, traffic, pedestrians, HUD and saves retain authoritative values. Reset, pause/resume and clock/pose discontinuities snap presentation. Local steering/framing damping cannot change semantic input. Junction closures are static world collision proxies outside required player/NPC lanes; their fictional police/barricade visuals own no campaign or traffic state.

SD-064 retains attributed road/water coordinates separately from estimated development. Pure neighborhood/context modules project the source geometry, derive the divided Hypoluxo midpoint, triangulate concave lake outlines and exclude buildings from water, roads and junctions. Rendering consumes those shapes and batches nearby houses with distance LOD. The owner-supplied Winston Trails South label overrides the conflicting collector source name while preserving provenance and stable route/checkpoint IDs. Additional context branches use the existing static closure contract; they do not create a second simulation or change save authority. Reset synchronously refreshes car and camera presentation from one pose before returning, including while paused rendering is throttled; this does not advance simulation. See the [map-proportions receipt](../reports/2026-10-31-town-drive-map-proportions.md).

SD-074 now implements Town Drive's detailed scene and playable adapters inside the existing shared Unity project. Engine-independent C# state owns driving, checkpoints, traffic/signals and pedestrian motion; `TownDriveSession` advances fixed 60 Hz driving with bounded accumulation. Car and camera consume the same interpolated presentation pose, snapping on pause/reset/discontinuity. Animation, gauges, wheel motion, cabin visibility and LOD cannot award progress. The explicit route TextAsset and managed JSON adapter preserve double-precision route data; it is not a global Resources payload for unrelated scenes.

The authoring exporter captures the existing detailed Babylon geometry into per-chunk/context GLBs plus shared PNGs and a versioned placement/material manifest. Original source counts remain separate from expected glTFast-expanded mesh/triangle counts. Named metre-scale world/vehicle anchors, ascending source LOD distances, imported tangent/UV data and alpha/PBR material handling are checked at the Unity import boundary. The generator creates only Town Drive derivatives/scene objects and reads the shared URP renderer/daylight dependencies; guarded tooling coordinates exclusive access and detects shared-settings changes. See the [implemented workflow](UNITY_TOWN_DRIVE_SCENE.md).

Keyboard and review-driver input feed the same semantic driving rules. Focus/pause releases held input; traffic/pedestrian animation observes simulation time. Checkpoint persistence uses separate `space-dragon.unity.drive.v1`/backup keys, ordered-progress validation and future-version protection, with no automatic browser/campaign save migration. Native-core parity, generated-scene validation, actual player behavior and visual/performance acceptance remain separate evidence in the [active scene receipt](../reports/2026-10-31-unity-town-drive-scene.md). The dedicated Development Web player passed its full route/reload and two-backend checks; human quality, full feature parity and release remain separate. The browser Drive Lab remains available as a reference.
