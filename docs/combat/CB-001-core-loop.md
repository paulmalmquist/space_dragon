# CB-001 - Core combat loop

**Authority:** PROPOSED. **Maturity:** SPECIFIED. **Gameplay evidence:** NOT TESTED.

## Player outcome and hypothesis

Read a threat, choose attack/guard/parry/dodge, create an opening, exploit it, and reposition. One enemy should be worth fighting again before we add loot, crowds or elaborate art. This is a design hypothesis, not a measured result.

## Proposed contract

Semantic actions share one rules layer across input devices. Character movement and dragon flight have separate controllers but reuse attack IDs, defense outcomes, suit-energy/spark/posture changes, counter opportunities and combat events where appropriate. Do not force identical animations, reach, inertia or cameras.

Each action has startup, active and recovery phases with an explicit cancel policy. Recovery is not freely cancellable unless the move allows it. Buffer only a documented legal next action; an expired input must not fire later. Prototype a 120 ms action buffer, distinct from the parry window.

For each eligible contact, resolve one outcome: evade, parry, block or hit. Reject invalid/resolved targets and duplicate contacts before resolution. Unblockable/unparryable flags and facing rules are explicit. A strike/hit-group/target key prevents multi-collider damage duplication; intentional multi-hit attacks use distinct hit groups.

Keep state changes authoritative within the local simulation. Animation completion must not independently apply damage or grant rewards. Pause, effects toggles and rendering frequency must not invent extra actions.

The precision lab below is separate from the existing two-character, one-tandem family slice. Simple assisted story play must not require light/heavy combos, held guard or timed parries. Use harmless robot targets and keep the existing bonk/revive semantics.

## Smallest experiment

One placeholder character, one enemy, one arena, light/heavy attack, dodge, guard and parry. A debug overlay shows action phase, input timestamp, contact outcome and enemy posture. Start without progression, family AI, a boss, networking or polished models.

After three short bouts, ask an adult tester which threats they recognized, why damage occurred, and whether they want another bout. Record their actual answers and attempted alternatives. A proposed exit gate is an average readability/responsiveness rating of at least 4/5 across three adult testers; this is formative feedback, not statistical proof of fun.

## Failure signs

Mashing wins as reliably as deliberate play; parry is the only viable strategy; recovery feels unresponsive; or testers cannot explain why they were hit. Simplify and retune before adding content.

## Test specifications

Cases in the [registry](../../tests/combat_cases.json): CB-001-T01, CB-001-T02, CB-001-T03, CB-001-T04.
These cases are not executed by the notebook checker.

## Evidence and next revision

Record build/commit, tuning values, exact case IDs, input/device, observed results, failures and recording/log locations in a verification receipt. Human judgment remains separate from rule-test results. Revise this note after the smallest experiment; do not silently mark it accepted.

**2026-10-28 / v0.1:** initial hypothesis and test specification. No gameplay implemented or tested.
