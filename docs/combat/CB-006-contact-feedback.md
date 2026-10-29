# CB-006 - Hit detection, targeting, camera and impact

**Authority:** PROPOSED. **Maturity:** SPECIFIED. **Gameplay evidence:** NOT TESTED.

## Player outcome and hypothesis

The visible contact, simulation result and feedback should agree. Strong effects cannot compensate for uncertain hit rules.

## Proposed contract

Use stable attack/hit-group/target IDs and a single resolution order. Sweeps or equivalent continuous queries cover fast movement between simulation steps. Pose samples used for gameplay must have a documented relationship to animation; cosmetic trails are not hitboxes. Explicitly test multi-part dragon contact and intentional multi-hit moves.

Camera lock-on is assistance, not authorization for damage. Select valid candidates, handle occlusion and removal, and avoid snapping to distant/offscreen targets without a deliberate policy. Preserve player control and view of immediate threats. Decide what happens when terrain obstructs the camera rather than allowing it to sit inside geometry.

Emit one semantic outcome event for VFX, audio, UI and optional haptics. Prototype brief local impact emphasis; do not freeze authoritative timers through a render-only hit-stop effect. Define any intentional simulation-time slowdown separately and test it. Reduced motion can disable shake/FOV pulses without changing collision or parry timing.

## Smallest experiment

A slow attack, a fast projectile, a deliberate two-hit move, an overlapping hurtbox target and a camera-obstructing wall. Run with effects on and off. A recording plus event overlay must explain every hit and defense.

## Failure signs

Visible misses damage the player, trails hit after an attack has ended, duplicated sparks represent duplicated damage, lock-on selects through a wall unintentionally, or turning off shake changes success.

## Test specifications

Cases in the [registry](../../tests/combat_cases.json): CB-006-T01, CB-006-T02, CB-006-T03, CB-006-T04.
These cases are not executed by the notebook checker.

## Evidence and next revision

Record build/commit, tuning values, exact case IDs, input/device, observed results, failures and recording/log locations in a verification receipt. Human judgment remains separate from rule-test results. Revise this note after the smallest experiment; do not silently mark it accepted.

**2026-10-28 / v0.1:** initial hypothesis and test specification. No gameplay implemented or tested.
