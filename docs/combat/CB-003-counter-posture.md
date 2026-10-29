# CB-003 - Posture, counterattacks and recovery

**Authority:** PROPOSED. **Maturity:** SPECIFIED. **Gameplay evidence:** NOT TESTED.

## Player outcome and hypothesis

A successful defense changes the next decision: counterattack, reposition or use an ability. The opening should be obvious and valuable but not an automatic win.

## Proposed contract

Enemy sparks/suit energy and optional posture are separate. This experiment does not replace the existing sparks/status/tandem model or require health bars. Damage, parries and specified abilities can add posture pressure. At a threshold crossing, emit one posture-break event and enter a bounded recovery state; repeated contacts must not repeat rewards or restart the same break indefinitely.

A parry can issue a counter opportunity with a unique ID, eligible target, start and exclusive expiry. Prototype a 600 ms opportunity. It can be consumed once by a legal counter, expires on target invalidation, and is never transferred accidentally to an unrelated target. The ordinary counter and posture-break finisher are distinct actions, not two rewards for the same button press.

Posture decay delay, break duration and boss resistance are OPEN tuning choices. A boss may limit repeated posture breaks, but its rule and feedback must be explicit. Do not silently make a visibly parryable move fail because a boss changed phase. Keep animation and camera feedback synchronized to the simulation event.

## Smallest experiment

One enemy with a visible posture bar, a basic counter and a heavy punish. Compare countering with using the opening to escape. Add no skill tree. Show opportunity expiry and break/recovery state in the debug overlay.

## Failure signs

Counter input executes twice, an opportunity survives a resolved target, the enemy never recovers, or posture is just a second health bar with no effect on decisions.

## Test specifications

Cases in the [registry](../../tests/combat_cases.json): CB-003-T01, CB-003-T02, CB-003-T03, CB-003-T04.
These cases are not executed by the notebook checker.

## Evidence and next revision

Record build/commit, tuning values, exact case IDs, input/device, observed results, failures and recording/log locations in a verification receipt. Human judgment remains separate from rule-test results. Revise this note after the smallest experiment; do not silently mark it accepted.

**2026-10-28 / v0.1:** initial hypothesis and test specification. No gameplay implemented or tested.
