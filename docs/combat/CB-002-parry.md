# CB-002 - Ground parry and readable defense

**Authority:** PROPOSED. **Maturity:** SPECIFIED. **Gameplay evidence:** NOT TESTED.

## Player outcome and hypothesis

A deliberate timed defense should feel decisive without requiring expert precision from everyone. A held guard is the safer fallback, not an endlessly refreshing perfect parry.

## Proposed contract and experimental tuning

Use simulation time, not rendered frames. The following is an initial test profile, not final balance:

| Rule | Standard profile |
| --- | --- |
| Perfect contact age after accepted guard press | [0,80) ms |
| Ordinary parry contact age | [80,180) ms |
| Guard fallback | At/after 180 ms while held, for blockable attacks and sufficient guard resource |
| Front defense cone | At most 60 degrees from defender forward, including the boundary |
| Earliest new parry press | 300 ms after the previous accepted press |
| Assist experiment | Ordinary window extends to 260 ms; perfect window stays [0,80) |

These values are independent settings, not proof of accessibility. The key must be released before another press can arm a window. Holding, OS key-repeat and taps during the rearm interval must not restart it. No retroactive parry on contacts preceding the accepted input. For this first experiment one press resolves at most one parry, and success does not reset the rearm timer; faster multi-parry chains are a separate proposed revision.

The contact must be parryable, within the facing cone, inside the active window, and use an unconsumed press. Check dodge invulnerability first when valid. An unparryable but blockable strike may fall back to guard; an unblockable/unparryable strike requires evasion. At exactly zero guard resource, holding is not a free block. Grabs, area attacks and sustained beams must explicitly declare their response rules rather than inherit defaults.

Perfect success causes stronger posture pressure and a counter opportunity; ordinary parry also creates an opening. Exact damage/stagger/recovery values remain OPEN. Distinguish outcomes through shape/motion and sound, not color alone. Assistance is selected independently of avatar and learner profile.

This is an opt-in precision profile. Preserve the simple tap/auto-shield alternative, identical story outcomes and recoverable story fights. Test play without any successful parry. Do not add a required stamina meter; the guard-resource mapping to suit energy or a separate internal allowance remains an experiment.

## Smallest experiment

A single enemy alternates a slow parryable strike and a clearly different dodge-required strike. Sweep input-to-contact offsets around every timing boundary. Show press ID, timing age, facing dot product and reason for rejected parries in the debug overlay.

## Failure signs

Holding produces perfect parries; a rear hit is deflected; high frame rate changes success; tapping is better than reading; or the cue and contact disagree. Reject those results before adding combos.

## Test specifications

Cases in the [registry](../../tests/combat_cases.json): CB-002-T01, CB-002-T02, CB-002-T03, CB-002-T04, CB-002-T05, CB-002-T06.
These cases are not executed by the notebook checker.

## Evidence and next revision

Record build/commit, tuning values, exact case IDs, input/device, observed results, failures and recording/log locations in a verification receipt. Human judgment remains separate from rule-test results. Revise this note after the smallest experiment; do not silently mark it accepted.

**2026-10-28 / v0.1:** initial hypothesis and test specification. No gameplay implemented or tested.
