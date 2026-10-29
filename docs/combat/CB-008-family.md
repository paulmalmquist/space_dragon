# CB-008 - Family alley-oops, recovery and later Line Leader integration

**Authority:** CONFIRMED alley-oop direction; local assist/timing details PROPOSED; exploration Line Leader BOOKMARKED. **Maturity:** SPECIFIED. **Gameplay evidence:** NOT TESTED.

## Player outcome and hypothesis

Scripted local companions support the confirmed on-foot alley-oop direction: a setter launches a finisher. The detailed launch/finish/assistance mechanics remain proposed. The exploration Line Leader and split-party system remains BOOKMARKED and separate. Neither requires multiplayer. The first four cases below cover later Line Leader integration; the remaining cases preserve the current tandem/recovery proposal.

## Preserved context and proposed contract

Preserve Maria's healing, Luna's slippery goo and Lyla's information-gathering specialty. Use the current suit-reveal document for starting abilities; this notebook does not redefine them. Lyla's color remains OPEN. Any parry-linked team assists below are proposals.

A parry could expose an assist opportunity: Maria helps recovery, Luna disrupts pursuit, or Lyla marks a vulnerability. Define one bounded assist transaction per opportunity and let the player act without a mandatory radial menu. Do not implement all characters before the core duel works.

Exactly one party member owns direct player control at a time. Switching leader must release held actions and stale target/counter references. Followers use bounded catch-up/navigation behavior and cannot duplicate rewards, body-block the leader indefinitely or turn independent learning records into avatar state.

## Baseline family invariants

An alley-oop result is applied once when the finish resolves, by explicit tap or auto-target, not prematurely at launch and not again on animation completion. The proposed one-tap path automatically finishes and lands safely even if the original target disappears. Double-taps, skip/reduced motion and interruption cannot repeat it. Preserve one main status plus Exposed, the setter cooldown rules, and pause freezing combat timers. Bonked/reviving family members are ineligible enemy targets. A full-family bonk keeps earned items, removed sparks and resolved enemies while resuming the current phase; story play has no game over. Avatar switching and reload cannot reset cooldowns or duplicate rewards or Family Spark.

The five setters and five finishers produce 20 distinct ordered pairings, excluding self-launches. Test the shared launch/finish system before bespoke marquee animations. A player may be the setter or the finisher; an optional perfect tap must not become required. Statuses can strengthen a finish but are not mandatory setup. The older named status-pair tandems are superseded by the owner decision.

## Smallest later Line Leader experiment

Two placeholder party members, one leader switch and one assist against the already tested enemy. No split-party world, five finished character rigs or network service. Before implementation, separately authorize this bookmarked increment.

## Failure signs

Both characters respond to movement, AI steals the counter every time, switching grants invulnerability or repeated assists, or companion navigation prevents normal play.

## Test specifications

Cases in the [registry](../../tests/combat_cases.json): CB-008-T01, CB-008-T02, CB-008-T03, CB-008-T04, CB-008-T05, CB-008-T06, CB-008-T07, CB-008-T08, CB-008-T09, CB-008-T10, CB-008-T11.
These cases are not executed by the notebook checker.

## Evidence and next revision

Record build/commit, tuning values, exact case IDs, input/device, observed results, failures and recording/log locations in a verification receipt. Human judgment remains separate from rule-test results. Revise this note after the smallest experiment; do not silently mark it accepted.

**2026-10-28 / v0.1:** initial hypothesis and test specification. No gameplay implemented or tested.
