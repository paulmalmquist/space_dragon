# Ideas — put anything here

Write below in whatever order it occurs to you. Plain text is enough. You can also send ideas in chat or use the local prototype's idea notebook. Notebook entries receive a `NOTE-...` capture ID; agents connect them to `SD-###` tracking IDs when they process the inbox.

## New thoughts

<!-- Add your next thought here. No form required. -->

## Captured and connected

### October 29, 2026 — a project that accepts unordered ideas

Source: owner's IDE request.

> “create a structure in this repo for me to input ideas and have agents know what to adjust along the way. i dont want to think too much about the technical details but rather feed ideas out of order sometimes.”

Receipt: **SD-001** · CONFIRMED · Implemented as this inbox, [agent instructions](../AGENTS.md), [ledger](../docs/project/IDEA_LEDGER.md), [vision](../docs/project/VISION.md), [roadmap](../docs/project/ROADMAP.md), and [status](../docs/project/STATUS.md). Future agents maintain those files as ideas arrive.

### October 29, 2026 — visual ambition and browser delivery

Source: owner's supplied technology discussion, introduced as what they want.

> “rich, close to AAA style as possible but runable on browser with railway backend”

Receipt: **SD-002** · CONFIRMED direction · Routed to [vision](../docs/project/VISION.md). Actual fidelity, target devices, graphics budgets, and backend scope still need evidence. This is an ambition, not a claim of current AAA quality or a working Railway service.

### October 29, 2026 — prepare the foundation

Source: owner's IDE request.

> “please install anything you think would help and create anything you think we need to get started”

Receipt: **SD-003** · CONFIRMED authorization · Local tooling and the small browser foundation are verified; completion evidence and remaining limits are in [status](../docs/project/STATUS.md). Routine implementation choices can proceed under this instruction.

### October 29, 2026 — supplied production recommendations

Source: the recommended technology setup pasted by the owner. These are recommendations to evaluate, not independently confirmed story decisions.

- **SD-004:** Babylon.js + TypeScript, Blender-to-GLB, WebGL2 baseline, browser observation, and local checkpoints before cloud services. Local engine/checkpoint/browser/tooling foundation verified under SD-003; first reviewed real GLB remains SD-006.
- **SD-005:** First Contact as a compact first slice: living-room computer → interrupted signal → backyard pod → one satisfying interaction → saved checkpoint. PROPOSED production sequence adopted for local foundation work; final playable quality remains to be reviewed.
- **SD-006:** One reviewed pilot character, proposed as Lyla because her reference is labeled, and one finished pod/component through the real browser asset pipeline. PROPOSED art milestone; final character and asset are not delivered.
- **SD-007:** A compact visual board, annotated motion/camera clips, dragon assembly views, photo labels, and sound direction. PROPOSED preparation; useful inputs can arrive incrementally.
- **SD-008:** Test named real devices and controls, then set graphics budgets. The concurrent [owner decision](../docs/decisions/2026-10-29-keyboard-first-input.md) confirms keyboard first, Xbox only if it works with no setup, and touch deferred. Named player devices and performance remain OPEN; current development-machine inventory is only one data point.
- **SD-009:** Railway save synchronization and asset hosting when the first prototype establishes a need. PROPOSED later work; account state, cost, authentication, and site integration remain unverified.

Receipt: linked entries are in [the ledger](../docs/project/IDEA_LEDGER.md). Paid art software, subscriptions, generated likeness uploads, additional infrastructure, and an entire game production are not prerequisites for this local setup.

### October 29, 2026 — three acts, linear, ending on Viera

Source: owner, in a Claude chat in the Space Dragon project.

> “Read the current state of the repo and start to make a plan to fill in narrative holes .
> We are staying linear but we have a large 3d world or set of worlds. I’d like 3 major acts where the first is on earth and then the dragon allows us to move from planet to planet.”

> “Final landing place is on planet viera where everyone is space travelers”

Receipt: **SD-014** (linear, large worlds, three acts) and **SD-015** (Viera as the final landing) · CONFIRMED direction · Recorded in [the decision](../docs/decisions/2026-10-29-three-acts-linear-and-viera.md). The assistant's [three-act plan](../docs/story/THREE_ACT_PLAN.md) lists the narrative holes this opens.

### October 29, 2026 — fill the holes: upgrades to powers, dogfights between planets

Source: owner, same chat.

> “Ok start filling those narrative holes please. Be creative .
>
> Leave room for suit upgrades and powers when we get to viera. At the start it’s just suit upgrades but then it’s power by the ends
>
> Dragon needs dog fights en route to planets and navigating asteroid Fields etc. feel free ro borrow from something that would be at home in Star Wars and starfield”

> “Can you put those in my space_dragon repo”

Receipt: **SD-016** (suit upgrades, then powers by the end) and **SD-017** (dogfights and asteroid fields between planets) · CONFIRMED direction, details PROPOSED · Recorded in [the decision](../docs/decisions/2026-10-29-three-acts-linear-and-viera.md). **SD-018** · PROPOSED · The assistant's fills are in [Acts II & III: The Road to Viera](../docs/story/ACTS_II_III_THE_ROAD_TO_VIERA.md), awaiting owner review. The last message authorized adding both documents to this repo.

### October 30, 2026 — puzzles that follow the kids' curriculum

Source: owner, Space Dragon chat.

> “We also need to plan puzzles that coincide with my kids curriculum”

> “The girls are learning to recognize numbers and letters and Luke is learning addition/subtraction and how to read”

Receipt: **SD-027** · CONFIRMED curriculum focus; puzzle designs and skill IDs PROPOSED · [Curriculum puzzle plan](../docs/learning/CURRICULUM_PUZZLE_PLAN.md) gives every learning stop in Acts I–III a numbers-and-letters track and a math-and-reading track, driven by a parent's local This Week list. SD-019 to SD-026 were skipped because concurrent draft branches already use them. Next: the owner's current letter, number, word and math lists, then one implemented template inside the first built town mission.

Owner request on the same day, “Go ahead and rewrite”, authorized the Act II/III rewrite merged in PR #16 (SD-018).

### October 30, 2026 — Seele intake and early refactoring

Source: owner, Space Dragon chat, after discussing exported assets and continued refinement with coding agents.

> Shall I make a folder in the repo called “seeles assets” and put instructions for migration

> At the beginning, we may want to refactor the repo around the more refined 3d environments and assets if it’s easier

Receipt: **SD-028** · CONFIRMED intake direction and conditional refactor evaluation; the actual migration/engine choice remains OPEN until an export is inspected. [Seele intake and migration](../seeles-assets/README.md) provides a local drop folder and agent procedure. It compares asset import, scene-layer replacement, and broader refactoring before implementation, while reusing the existing asset workflow. No paid generation, asset import, engine change, or deployment is claimed.

### October 30, 2026 — House interior video reference

Source: owner, Space Dragon chat, with uploaded `IMG_5753.mp4`.

> Put this video in a folder and label it house interior. It’s reference for 3d environment of initial house

Receipt: **SD-029** · CONFIRMED label and reference purpose · [House interior](../assets/reference/environments/house-interior/README.md) records the original, the saved `house-interior.mp4`, the ignored local authoring path, source checksum, and initial inspection. The video was organized in the owner's files and copied unchanged into the local reference workspace. Next: consult it when building the opening environment. A finished house model, a measured scan, a Seele upload, and public-video publication are not established by this intake.

### October 30, 2026 — Car driving video reference

Source: owner, Space Dragon chat; `IMG_5754.mp4` arrived after the initial labeling request.

> Label this video car driving West on Hypoluxo north on jog West on Lantana south on Hagen Ranch

> Ok is this saved in repo

Receipt: **SD-030** · CONFIRMED route label · [Car driving source and receipt](../assets/reference/environments/car-driving/README.md) records the saved video, source checksum and metadata, sampled-frame observations, and retrieval instructions. The notes are tracked in Git; the original MP4 is saved separately in the owner's `Space Dragon/Car driving/` files. The route is the owner's label, not an independently verified GPS track. Next: retrieve the source when exterior-environment work needs it; no road model or runtime change is claimed.

### October 30, 2026 — a villain, and the reason for the SOS

Source: owner, Space Dragon chat.

> “We need a villain arc, the reason for the SOS. Not kiddy please, this can be biblical or DC studios level”

Receipt: **SD-031** · CONFIRMED direction (a villain exists, causes the SOS, mythic tone); identity and lore PROPOSED · [Decision](../docs/decisions/2026-10-30-villain-is-the-reason-for-the-sos.md) and [villain treatment](../docs/story/VILLAIN_ARC.md): Morrow, the Lanemother's firstborn, holds the home note and has stopped the universe. Next: owner review, then integrate the beats listed in the treatment's §10 into the acts and scripts.

### October 30, 2026 — Morrow approved, rename the home note, translation

Source: owner, Space Dragon chat, in reply to the villain treatment.

> “Yes I like it. “Home note” should be called something else.
> We need: a way to translate language”

Receipt: **SD-032** · CONFIRMED Morrow and his arc as presented; "home note" retired, replacement **the Heartnote** PROPOSED · [Decision update](../docs/decisions/2026-10-30-villain-is-the-reason-for-the-sos.md); Morrow integrated across the acts and scripts. **SD-033** · CONFIRMED need; design PROPOSED · [Translation decision](../docs/decisions/2026-10-30-translation.md) and [language and translation](../docs/story/LANGUAGE_AND_TRANSLATION.md). Next: owner reaction to the Heartnote name and the translation design.

### October 30, 2026 — the suits translate

Source: owner, Space Dragon chat.

> “The suits can translate”

Receipt: **SD-034** · CONFIRMED · [Translation decision update](../docs/decisions/2026-10-30-translation.md) and [language and translation](../docs/story/LANGUAGE_AND_TRANSLATION.md): the suits replace the Core as the translator. Proposed details: they translate both ways, singing the family's words in Vieran in each wearer's instrument voice; they translate what they hear, not what they see, so the kids still decode writing in the Glyph Book; near Viera they drop words and the Caller fills the gaps; the neighbor's robot iguana translates for her. Scripts updated.

### October 30, 2026 — just English, with the suits as the hand-wave

Source: owner, Space Dragon chat.

> “The game just needs to be in English with the suit core hand waiving why we can understand”

Receipt: **SD-037** · CONFIRMED · Supersedes the translation details from SD-033 and SD-034. [Decision update](../docs/decisions/2026-10-30-translation.md) and [language](../docs/story/LANGUAGE_AND_TRANSLATION.md): everything is in English; the suits, made from the same living material as the Core, are why the family understands everyone, said once at Lantern Rock. The sung language, mistranslations, Glyph Book, dropped words and gift of tongues are retired, and glyph puzzles became plain English letters, numbers and words. SD-035 and SD-036 were skipped because draft PR #13 uses them.

