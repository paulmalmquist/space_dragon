# Recent story integration — October 29, 2026

**Status:** source reconciliation and implementation guide. Owner directions remain CONFIRMED; new names, dialogue, missions and lore remain PROPOSED. The current coding request authorizes a reversible playable increment, not blanket canon approval.

## Sources read

- Current `main` at `4bcfd8d`: [three-act decision](../decisions/2026-10-29-three-acts-linear-and-viera.md), [three-act plan](THREE_ACT_PLAN.md), [Road to Viera](ACTS_II_III_THE_ROAD_TO_VIERA.md), [Act I](ACT_I_BUILD_THE_DRAGON.md), and [suit reveals](SUIT_REVEALS_AND_STARTING_ABILITIES.md).
- Full current [New Characters and Story Beats](https://chatgpt.com/library?file_id=libfile_b548e0e9e6648191957fd846444206a3&account_id=personal), October 29. Read all 157 lines; this resolves the missing-source warning around the root `new characters` stub. The summary below preserves the proposed roles; this document is not a verbatim copy of the attachment.
- Full current [Planet Missions and the Growing SOS](https://chatgpt.com/library?file_id=libfile_a56c5d26184c8191bce0a213c62ae776&account_id=personal), October 29. Read all 329 lines. User direction: planet-to-planet missions composing the SOS. Detailed route, musical choices and lore are proposed.
- Owner, current chat: “Continue coding based on the recent updates to the story”.

## Working continuity

| Topic | Rule for development |
| --- | --- |
| Opening | Computer → backyard arrival → supplied suits → town retrievals → assemble an existing dragon design. The family was in range, not preselected. |
| Campaign | Linear, three acts; Earth first; final landing on planet Viera. The owner's explicit structure takes precedence over assistant draft alternatives. |
| Powers | Start with equipment and modest contextual abilities. Leave later upgrade and endgame power slots unimplemented. |
| SOS | Understand the initial rescue call before leaving Earth. On later worlds, collaborate with inhabitants to compose its larger answering arrangement. No hidden master recording to collect. |
| Player control | Sequential contextual contributions in the opening. Later one Line Leader and one dragon pilot; no simultaneous five-person controls or crew-role minigames. |
| Ending | The older attachment's Stillheart finale and Earth closing scene cannot silently replace Viera. The proposed Viera treatment offers a location for the listen/shelter/home-note climax. An Earth epilogue remains optional writing, not the final landing. |
| Middle worlds | The attachment suggests selectable worlds and adds Whisperwood/Tideglass. Keep these as candidate additions; do not implement branching or expand the current fixed route automatically. |
| Opposition | Rook and the Sweeper have different sources and purposes. Do not rename one into the other, combine their arcs or add two complete enemy systems without a later scope decision. |
| Suit colors | Maria purple; Luna pink. Lyla's palette stays OPEN. Gray stand-ins are implementation placeholders, not palette decisions. |

## Cast now available from the source

| Proposed character | Role and arc | Dependency |
| --- | --- | --- |
| Mox | Small six-footed passenger, folding ears, glowing tail, perfect sound mimicry. Mischief with Luna; Lyla records a dictionary of his chirps. Three soft notes and a click eventually lead to his mother at the Hatchery. He continues voluntarily after a safe reunion. | Rescue during the grocery mission; establish his call before the reunion. |
| Tavi | The child who sent the SOS, keeping the Last Beacon alive from atop a stack of books. Luke's friend and friendly rival. He catches a drifting platform; she identifies the anchor that can hold it. | Last Beacon precedes the Spires. Her exact relationship to the Vieran Caller/Lantern Rock treatment remains proposed. |
| Captain Nera | Four-armed courier with a battered ship full of unfinished relief deliveries. Initially favors evacuation; the family's teamwork persuades her to help reopen the routes. Later coordinates rescue transport. | Meet at Market Moon before her convoy and fleet support. |
| Rook | Bird-helmeted guardian with shield-wings and a locking staff. His protection order becomes containment. He is evaded or restrained, not destroyed. The family returns to rescue him at the Forge; he reconsiders protection. | First containment encounter at the Spires must precede his Forge rescue. |
| Hush clue | Mox imitates a shuddering breath. Lyla compares recordings from different worlds; Maria recognizes distress. | Multiple observed recordings before the comparison. Never make the Hush secretly malicious. |

## Composing through missions

The attachment's proposed contributions are: Market Moon rhythm; Whisperwood bass; Spires lead melody; Hatchery harmony; Tideglass countermelody; Forge accents and broadcast; the finale adds rests and a home note. Local people keep their own music. Players choose compatible variations, not correct answers. The original SOS remains recognizable.

Use environmental actions and rescues to introduce each part, with visual cues as well as sound. No microphone, singing requirement, music reading, rhythm gate, or timing delay on combat. A later optional song constellation can replay or feature a world's voice. Revisited worlds stay restored; no deterioration chores.

These are future content and audio requirements. This increment does not invent a final melody, ship an audio workstation, or claim those worlds are playable.

## Implemented increment

[First Contact](scripts/A1-00_FIRST_CONTACT.md) is the next dependency in the actual runtime. Extend its pod endpoint through:

1. Five suits supplied together, with a short contextual demonstration per family member and a skip route.
2. A direct or assisted Lyla scan, with visible instruction and optional replayable local-device speech.
3. A unique symbol archive reward, a saved town-map briefing and the first proposed mission, Space Blocks.

This is staging of existing proposed beats under the current coding authorization. It does not implement the later powers, approve cast lore, turn equipment demonstrations into mastery tests, or begin the full town mission. The map previews the linear six-stop retrieval treatment and clearly labels unbuilt destinations.
