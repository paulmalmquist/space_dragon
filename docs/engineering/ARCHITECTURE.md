# Architecture contract

**Status:** development constraints plus a local prototype; full game/site architecture remains in development. See [the October 29 decision](../decisions/2026-10-29-local-foundation.md) and [current status](../project/STATUS.md).
**Inspected baseline:** `82e2610be1a23ad238e9ac67884adc777aa10cbc` (2026-10-28): planning documents, photo references and a reference verifier. No application manifest, game runtime or deployment configuration was present in that tree.

## Verified versus unverified

The target route remains `/space-dragon` on the existing site. A standalone Babylon.js/TypeScript/Vite prototype, exact lockfile, local checkpoints and Playwright flows now exist; Three.js was an earlier proposal, not a runtime being replaced. [Local development](../DEVELOPMENT.md) records the actual commands/modules and [the inventory](../REPO_INVENTORY.md) records machine/public-site evidence. Website source/deployment, Railway services, player devices, Blender MCP connection and real-device performance remain unverified. The development prefix is a local preparation choice, not proof of host-site integration. No reviewed GLB game asset is supplied yet.

## Keep these boundaries even in a small implementation

**October 30 owner direction (SD-028):** evaluate early refactoring around more refined imported environments/assets when that lowers total development effort. [Seele migration](../../seeles-assets/README.md) compares selected asset import, scene-layer replacement, and broader runtime/repo changes against an actual export. Babylon is the current baseline, not a permanent engine constraint. Preserve the behavior contracts below; record consequential architecture changes and update their tests rather than retaining placeholder structure for its own sake. No runtime change has been made by adding this intake process.

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
