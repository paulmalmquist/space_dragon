# CB-005 - Enemy intent, crowd fairness and bosses

**Authority:** PROPOSED. **Maturity:** SPECIFIED. **Gameplay evidence:** NOT TESTED.

## Player outcome and hypothesis

Difficulty should come from reading and prioritizing threats, not being hit by an unreadable pile of simultaneous attacks.

## Proposed contract

Enemies declare telegraph, commitment, active contact and recovery phases. Track the target during the permitted wind-up only; test an explicit commitment point rather than unavoidable late homing. A small encounter director grants attack permissions. Begin with one high-threat attack token, then compare two; this cap is a test profile, not a permanent crowd rule.

Every token must be returned on completion, cancellation, resolution and despawn. Idle permission must not deadlock the encounter. Offscreen high-threat attacks require a sufficiently early directional warning or must be delayed/repositioned. Warnings cannot rely solely on color or written text.

Vary enemy roles: pressure, ranged disruption and a punishable heavy attack. Boss phases add clearly introduced constraints and weak-point opportunities instead of only increasing health. Seed random choices for reproducible debugging; do not make enemy decisions read the player's future input.

## Smallest experiment

One melee, one ranged and one heavy enemy in a small arena. Compare one-token and two-token profiles. Include a recorded approach from behind, interrupted wind-up and enemy resolution while holding permission. A boss remains a subsequent experiment after this encounter is readable.

## Failure signs

Unavoidable simultaneous hits, attacks without visible/audible intent, permanent idle enemies, input-reading reactions, or additional sparks or phases used as a substitute for interesting choices.

## Test specifications

Cases in the [registry](../../tests/combat_cases.json): CB-005-T01, CB-005-T02, CB-005-T03, CB-005-T04.
These cases are not executed by the notebook checker.

## Evidence and next revision

Record build/commit, tuning values, exact case IDs, input/device, observed results, failures and recording/log locations in a verification receipt. Human judgment remains separate from rule-test results. Revise this note after the smallest experiment; do not silently mark it accepted.

**2026-10-28 / v0.1:** initial hypothesis and test specification. No gameplay implemented or tested.
