# Unity direction across channels — SD-072

**Date:** October 31, 2026 · **Authority:** CONFIRMED owner direction · **Work state:** planned migration; guidance and handoff implemented.

Owner wording:

> another channel is upgrading to unity. please follow suit

Align subsequent production work from this channel with **Unity/C# in the existing `unity/SpaceDragon` project**. The active Unity channel owns project setup, renderer configuration, the generated First Contact scene and builds. Coordinate around that work; do not create another Unity project or launch competing Editors against it.

This later instruction supersedes the [earlier candidate-only restriction](2026-10-31-unity-production-candidate.md) for this channel's forward engine direction. Existing comparison measurements retain their scope; choosing Unity does not itself establish better visual quality. Keep the Babylon Earth and Three.js labs executable as behavior references and rollback while features move across.

The next bounded contribution is the [Unity dragon/Dogfight handoff](../engineering/UNITY_DOGFIGHT_HANDOFF.md): reuse the versioned Blender export, prove rig/material/socket parity, then port established flight/combat behavior in controlled increments. Preserve state, save and live-spelling rules.

The inspected project pins Unity 6000.6.7f1, URP 17.6.0, Input System 1.20.1 and glTFast 6.20.0. It contains First Contact with the shared pod, provisional environment/player and isolated interaction state. Its [receipt](../reports/2026-10-31-unity-production-candidate.md) owns current evidence. Dragon/Dogfight gameplay is not yet implemented there.

This alignment changes guidance, not scene/build settings, packages, shared Blender sources, runtime code or saves. Unity import/playtesting must produce its own evidence. No deployment, hosting change or new external service is implied.

[Verification](../reports/2026-10-31-unity-channel-alignment.md) records the read-only inventory, passing foundation/dragon-export checks and untested Unity flight port.

## Concurrent tracking

The active local branch labels the Unity candidate SD-062 and Town follow-ups SD-063/064. Merged `origin/main@5121e1d` already uses SD-062–071 for different incoming records. Preserve both source namespaces until their work is reconciled; do not globally replace IDs in active work. SD-072 is above both allocations and records this new instruction; next available is SD-073.

The completed browser/dragon integration was merged through [PR #24](https://github.com/paulmalmquist/space_dragon/pull/24). This alignment does not reset or switch the other channels' working tree.
