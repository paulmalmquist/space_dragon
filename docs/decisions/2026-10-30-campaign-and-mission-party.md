# Decision — Mission parties and the five-planet campaign

**Recorded:** October 30, 2026 · **Tracking:** SD-034 (party), SD-035 (campaign).

**Status:** CONFIRMED owner direction for the three-member mission cap, one controlled member, an autonomous sidekick with a button, the five-planet mission counts and the family's move to Viera. Optional third-member behavior, mission content and detailed implementation remain proposed or open.

## Source wording

Owner, in the IDE conversation:

> here are some ideas and make sure i can do this from a fresh chat too.
>
> maxium family members in a given mission is 3. you control one and 1 has a sidekick button and largely operates autonomously.
>
> let's lay out the structure of the story as:
> earth, use suits to find parts of dragon
>
> explore planets in other universes by traveling by dragon, interupted by dogfights
>
> 4 planets 5 missions per planet and then 5th and final planet viera where the family moves to
> commit all that structure to the story stuff

Owner's follow-up resolves the final planet's mission count:

> Viera also has five missions

## Decision

1. **At most three family members participate in a mission's active party.** The family cast remains Paul, Maria, Luke, Luna and Lyla.
2. **The player controls one member.** One sidekick largely acts autonomously and has a sidekick button. The exact command/ability and input binding are not selected here.
3. **Earth opens the campaign.** The family uses the suits to find dragon parts and assembles the pre-existing design. The living-room opening, accidental receipt of deliberately sent equipment and other-universe SOS remain intact.
4. **The dragon carries the campaign onward.** Planet exploration and travel interrupted by dogfights follow Earth. The existing single-pilot/no-crew-role direction remains in force.
5. **Four planets have five missions each, then the fifth and final planet is Viera, also with five missions.** That is **25 off-Earth missions**. Earth is the opening and is not counted among those five planets; its mission count remains OPEN.
6. **The family moves to Viera.** The final mission, `V1-M5`, concludes with settlement there. Viera is the new home, not merely a visit followed by a final relocation back to Earth.
7. **Keep three acts and the linear route:** Act I on Earth; Act II across the four pre-Viera planets; Act III on Viera. The [campaign structure](../story/CAMPAIGN_STRUCTURE.md) reserves all 25 stable mission slots and is the concise entry point for a fresh conversation.

## Interpretation and open choices

- **PROPOSED:** when the third party slot is used, it is autonomous support alongside the controlled member and button-driven sidekick. The owner confirmed the cap, not a third control button or mandatory three-member roster.
- **PROPOSED count handling:** dogfights between planets remain travel encounters unless later explicitly designated as a numbered planet mission. Do not automatically subtract them from a planet's five missions.
- **OPEN:** Earth mission count, individual mission names/content, the four planets' final names, exact universe assignments/crossing points, party selection/swaps, sidekick actions, third-member behavior and nonactive family staging.
- **PROPOSED names/order only:** Market Moon, Hatchery, Climbing Spires and Forge Ring remain the existing treatment's candidate route. The owner's count does not independently confirm those names.
- The original SOS still comes from another universe. The number of planets does not imply one separate universe per planet.

## Superseded guidance and practical effects

This decision refines [the prior linear/three-act/Viera direction](2026-10-29-three-acts-linear-and-viera.md): mission count and settlement are now settled, while detailed treatments remain proposals.

- Six-world alternatives, selectable extra planets, or waypoint settings interpreted as additional full planets do not expand the fixed five-planet campaign. Whisperwood, Tideglass, the Waystation or the Drift may supply mission/travel ideas within the fixed structure; such reuse is proposed.
- A single short restoration set piece is no longer the complete mission allocation for each of the four pre-Viera planets. Existing scenes must be mapped or developed into five stable mission slots per planet.
- Earlier five-person playable puzzles, Five Together set pieces and rescue sequences must be adapted to a roster of at most three. Do not silently exempt a mission because an older script uses all five, or introduce remote/offscreen button roles to keep a five-person dependency.
- The whole family remains important across the campaign. Earlier “family stays together” safeguards still guide kind, recoverable staging; they do not require all five as the active party. Do not add forced split-party gameplay or isolate a child to satisfy the cap.
- Earth may remain part of the family's history and a possible later visit, but it is no longer the final home in the ending. Specific return visits and post-credits scenes remain OPEN.

The preserved [planet-missions source](../story/PLANET_MISSIONS_AND_SOS_COMPOSITION.md) stays intact as a proposal, with this decision taking precedence over conflicting counts, selectable order or finale location. Shared composition and other compatible ideas can be developed within the new structure without automatically approving every proposed character, power or lore detail.

## Implementation boundary

These are story and gameplay design constraints, not implemented systems. The current navigation prototype does not yet provide a sidekick button, autonomous mission parties or the 25-mission campaign. [Status](../project/STATUS.md) owns actual evidence; [the current milestone](../plans/CURRENT_MILESTONE.md) owns the selected implementation increment.

When a mission is implemented, validate its roster, semantic sidekick request, safe recovery, learning-assistance record and once-only rewards independently of animation. Keep one-pilot flight, supported keyboard play, local saves and separate learner/avatar/assistance identities. This decision introduces no multiplayer, backend dependency, production deployment or publication approval.
