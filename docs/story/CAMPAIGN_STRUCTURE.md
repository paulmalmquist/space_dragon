# Campaign structure — Earth, four planets, then Viera

**Updated:** October 30, 2026 · **Tracking:** SD-034 (mission party), SD-035 (campaign).

**CONFIRMED structure:** Earth equips the family and builds the dragon. The dragon then carries them through four planets with five missions each, followed by the fifth and final planet, Viera, with five missions. The family moves to Viera. There are **25 off-Earth missions**, plus the Earth opening whose mission count is **OPEN**.

**CONFIRMED mission party:** at most **three family members** in a mission. The player directly controls one; one autonomous sidekick has a sidekick button. An optional third autonomous support member is a **PROPOSED interpretation**, not a confirmed additional button or control scheme.

This file and [the owner decision](../decisions/2026-10-30-campaign-and-mission-party.md) own these constraints when older treatments differ. Names, mission content and lore remain at their individual authority levels. The current room/yard prototype does not implement the campaign or sidekick system; [project status](../project/STATUS.md) owns actual implementation evidence.

## The story spine

| Act | Confirmed outcome | Count and boundary |
| --- | --- | --- |
| I — Earth | Begin at the living-room computer, receive the backyard equipment and suits, recover parts and assemble the existing dragon design, then choose to answer the SOS. | Earth mission count is OPEN. Earth is the opening, outside the five-planet off-Earth count. |
| II — Four planets | Travel by dragon, explore each planet through five missions, and continue along the linear route. Dogfights interrupt travel. | Four planets × five missions = 20 missions. |
| III — Viera | Reach the fifth and final planet, complete five missions, and establish the family's new home there. | Five Viera missions. `V1-M5` ends with the family settling on Viera. |

The rescue equipment was deliberately sent and reached this family accidentally. They were not preselected and did not invent the dragon. The adventure explores planets in other universes; the original SOS still comes from another universe. Universe crossing remains distinct from ordinary fast flight. Exact assignments of planets to universes and additional crossing points are **OPEN**. A planet is not automatically a separate universe.

The route remains linear: finish a planet's five missions, travel onward, then enter the next planet's sequence. Travel may contain dogfights and other already proposed flight encounters. **PROPOSED count handling:** between-planet dogfights are travel encounters and do not automatically replace one of the five planet missions. A later design must explicitly identify a flight encounter as a numbered mission before counting it that way.

## The 25 stable mission slots

These are planning IDs, not existing runtime checkpoints or learning-challenge IDs. Keep the IDs stable when titles and planet names are selected. Every slot's mission content is **OPEN**; the final settlement outcome is confirmed.

| Planet | Name authority | Mission 1 | Mission 2 | Mission 3 | Mission 4 | Mission 5 |
| --- | --- | --- | --- | --- | --- | --- |
| First | **PROPOSED:** Market Moon | `P1-M1` — OPEN | `P1-M2` — OPEN | `P1-M3` — OPEN | `P1-M4` — OPEN | `P1-M5` — OPEN |
| Second | **PROPOSED:** Hatchery | `P2-M1` — OPEN | `P2-M2` — OPEN | `P2-M3` — OPEN | `P2-M4` — OPEN | `P2-M5` — OPEN |
| Third | **PROPOSED:** Climbing Spires | `P3-M1` — OPEN | `P3-M2` — OPEN | `P3-M3` — OPEN | `P3-M4` — OPEN | `P3-M5` — OPEN |
| Fourth | **PROPOSED:** Forge Ring | `P4-M1` — OPEN | `P4-M2` — OPEN | `P4-M3` — OPEN | `P4-M4` — OPEN | `P4-M5` — OPEN |
| Fifth and final | **CONFIRMED:** Viera | `V1-M1` — OPEN | `V1-M2` — OPEN | `V1-M3` — OPEN | `V1-M4` — OPEN | `V1-M5` — settlement; mission details OPEN |

Market, Hatchery, Spires and Forge are the current [Act II treatment's](ACT_II_ANSWER_THE_CALL.md) proposed names/order, not newly confirmed destinations. The [Act III treatment](ACT_III_THE_ROAD_TO_VIERA.md) supplies Viera ideas to adapt into its five slots. Existing script scene IDs remain references to draft scenes; do not assume one old scene equals one new mission.

**Optional planning aid — PROPOSED:** vary a planet's five slots around arrival/discovery, exploration/learning, suit-assisted traversal, a rescue/action challenge and a local payoff. This is a flexible way to distribute existing ideas, not five mandatory activity types or 25 approved quest outlines. Viera's fifth slot closes with settlement rather than departure to another planet.

## The mission party

Paul, Maria, Luke, Luna and Lyla remain the five-person family cast. The active mission roster contains at most three of them; the cap does not remove anyone from the campaign or from the family's move to Viera.

| Role | Authority | Boundary |
| --- | --- | --- |
| Controlled member | CONFIRMED | Exactly one family member receives direct player control at a time. |
| Sidekick | CONFIRMED | Largely autonomous, with one sidekick button for the player's request. Exact assistance and button mapping are OPEN. |
| Third member, if used | PROPOSED interpretation | Autonomous support within the three-member cap. No extra support button is confirmed. |

Do not require all five family members to perform a playable puzzle, combo or rescue in one mission. Adapt older five-suit set pieces to the selected roster; preserve everyone's story importance across missions. Party selection, swaps, support behavior and where nonactive family members are staged remain **OPEN**. The cap is not an authorization to invent a forced split-party system or leave a child alone in a sad/scary sequence.

Dragon flight retains **one pilot and no crew-role minigames**. Do not use flight, a cinematic or a background contributor as an undocumented exception to the mission cap. Review the staging of existing full-family scenes when adapting them.

Learner identity, selected avatar and action assistance remain separate under [the interaction contracts](../gameplay/INTERACTION_CONTRACTS.md) and [learning rules](../learning/LEARNING_RULES.md). A sidekick's help cannot fabricate independent learning mastery, and repeated assistance cannot duplicate a story reward. Autonomous companions do not require multiplayer or a backend.

## Reconcile older drafts without adding planets

- The six-world/Stillheart [source proposal](PLANET_MISSIONS_AND_SOS_COMPOSITION.md) remains preserved as an input. Its extra worlds, selectable middle group and ending do not override the confirmed five-planet route and Viera settlement.
- Whisperwood and Tideglass can be considered as settings or mission ideas within the fixed slots. That reuse is **PROPOSED** and does not create a sixth planet.
- The Waystation, Drift, additional beacons and similar [overview](ACTS_II_III_THE_ROAD_TO_VIERA.md) settings can become mission locations or travel encounters if useful. They do not automatically become additional campaign planets.
- Earlier one-set-piece-per-world scripts need expansion or redistribution into five mission slots each. Existing five-family-member interactions need adaptation to the party cap; they do not receive an automatic exception.
- Earlier finale/coda language that makes Earth the family's final home is superseded by moving to Viera. Whether the family later visits Earth, and how a return route is presented, remains OPEN.

No new canon mission, named character assignment, power or lore explanation follows merely from giving it a slot.

## Continue from a fresh chat

Read this file, [the decision](../decisions/2026-10-30-campaign-and-mission-party.md), [status](../project/STATUS.md), [the idea inbox](../../ideas/INBOX.md) and [the current milestone](../plans/CURRENT_MILESTONE.md). Preserve the fixed counts, linear route, Viera settlement and party cap while routing new ideas into the existing slots.

Story order is not implementation order. Select one authorized increment, record its roster and slot when relevant, then update its state/save rules and evidence. The 25 slots are a campaign plan, not a claim that those missions, planets, sidekick controls or final art have been built.
