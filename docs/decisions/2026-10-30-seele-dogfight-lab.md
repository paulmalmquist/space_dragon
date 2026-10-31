# Seele dogfight as a bounded local lab

**Date:** October 30, 2026 · **Status:** authorized local implementation choice · **Tracking:** SD-036–SD-037.

## Request and evidence

The owner asked to practice moving the supplied Seele dogfight into this project and making meaningful changes: barrel rolls, independent aiming, arrows to steer and W/A/D/Z to aim. The same increment adds the owner's follow-up: “add the ability to use the mouse to fly also. left button fires and right button zooms”. The exact requests are preserved in [the inbox](../../ideas/INBOX.md). Editable JavaScript, Three.js flight/combat/camera systems, a rigged dragon, drones and local scenery textures are present at `assets/reference/seele/dragon_dogfight/`. The compiled HTML alone lacks companion bundles; the editable source is the migration baseline.

## Decision and scope

Adapt a working copy in `src/prototypes/dogfight/`, reached at `/space-dragon/dogfight/` from the main workspace. Use the existing root Vite build and lockfile, with Three.js pinned to the export's `0.180.0`. Preserve its materials, animation, chase camera and scenery for this representative experiment; changing those while evaluating controls would add an unrelated porting task. The Earth slice retains Babylon/TypeScript. Each page loads one renderer and owns its own input, animation loop and cleanup; full-page navigation separates them.

This is a prototype-lab boundary, not a general two-engine game architecture or a decision that Three.js should replace Babylon. A Babylon port and a broader renderer refactor remain alternatives to compare after this slice gives useful playtest evidence. Before flight becomes a campaign mission, choose the shared scene/runtime boundary and add validated checkpoint/reward transitions. Do not add backend services to connect this experiment.

The lab uses one pilot, disables drones nonlethally, and has an encounter-only reset. It writes no story, exploration, inventory or learning progress and awards no campaign rewards. First Contact v2 and exploration v1 saves remain authoritative and unchanged. Reloading the lab intentionally starts a new encounter. Prototype names and the rig are candidates, not canon or approval of the dragon's final recoverable-component design.

## Controls and lifecycle

Arrows or mouse steer; W/A/D/Z move the aiming target up/left/right/down independently. Left mouse button fires and right mouse button zooms while held. The initial mouse implementation uses screen-relative position, a center deadzone and automatic switching between mouse movement and arrow presses; those are reversible control-feel choices. Canvas mouse controls must not activate from menu UI. Q/E start left/right barrel rolls, and X recenters aim. Those two bindings are reversible engineering choices. Space also fires, Shift boosts, R/F adjusts cruise speed and Escape pauses. The visible reticle, shot direction and aim assistance must use the same aim state. Roll presentation keeps a stable chase-camera horizon; reduced-motion behavior and actual comfort require review.

The page must offer explicit launch, retry, sound controls and a return to the main game. Pause, focus loss and navigation release held keys, mouse fire and zoom; resume requires fresh control input. Only selected runtime models/textures enter the asset manifest; original `.blend` files and raw exports stay out of the built game. Development observation is read-only and absent from production.

## Intake, rights and recovery

Use the existing `seeles-assets/incoming/` folder for future downloads, preserving companion files. The owner's current path is also an accepted ignored intake location; moving or deleting the original is unnecessary. Inventory/checksum the original, copy reviewed source to the working area, and record provenance and local changes in [the receipt](../reports/2026-10-30-seele-dogfight.md). Dependency licenses do not establish rights for every generated asset. This request authorizes local import and editing, not public asset approval or deployment.

Rollback is to remove the lab entry/link, working code, selected runtime assets and added dependency together. The original delivery and existing saves remain available. Verification status belongs to the receipt; file existence and the export's earlier test claims are not a pass here.
