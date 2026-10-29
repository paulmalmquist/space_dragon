# Script — Mission 1: Space Blocks (the preschool, Assembly Module)

**Status:** PROPOSED draft production script. It follows [First Contact](A1-00_FIRST_CONTACT.md) and uses the same tags and conventions.  
**Sources:**
- [Act I refinements](../ACT_I_CRITIQUE_AND_REFINEMENTS.md) §4: mission 1 is fixed, featuring Luna and Lyla.
- [Combat system](../../gameplay/COMBAT_SYSTEM.md) §4 and §8: this mission unlocks the Goo Ramp and Holo Pad launches, all five finishers and the Slide and Spy alley-oop.
- [Learning rules](../../learning/LEARNING_RULES.md): the challenge contract below.
- [Music doc](../MUSIC_EMPATHY_AND_PACING.md): cues.

This is the "single town retrieval and return-home reveal" that the [current milestone](../../plans/CURRENT_MILESTONE.md) lists as the next increment after First Contact. It is **not** authorized to build yet.

**Fictionalization (required):**
- The preschool is generic: no real name, signage, layout or access routes.
- It's **Saturday**, so the school is closed and **no other children are present**. That avoids depicting or identifying anyone else's kids.
- TEACHER is fictional.

## Mission at a glance

| | |
| --- | --- |
| Featured | **Luna and Lyla.** Everyone comes along. |
| Verb | **Sort.** Then the first chase and the first alley-oop. |
| Component | `component_assembly`, awarded once |
| Learning | `a1m1_space_blocks_v1`, shape matching (optional to do well, never blocks progress) |
| Unlocks | Goo Ramp and Holo Pad launches, all five finishers, Slide and Spy, Builder Bugs |
| Neighbor beat | A robot iguana runs home through her garage flap |
| SOS | Install 1: the music box plays **the first note** |
| Length target | About 8–12 minutes of play. A design goal, not an estimate. |

---

## M1-0 — Saturday Plan

**[SAVE cp_a1_03_map]** (resumed from First Contact)

**[CINE]** Morning in the living room, with the planning station on. The preschool's icon is pulsing. **[MUSIC]** A bright variation of the family theme.

> LUKE: "Why does *their* school go first?"
>
> PAUL: "Closest signal, bud. Yours is next."
>
> LUKE: "…Fine. But I'm climbing something."
>
> LYLA: "Our school! Our school!"

**[PLAY]** Tap the preschool icon.
- **Prompt:** "Where's the closest signal?"
- **[HINT 1]** The icon bounces. **[HINT 2]** LUNA: "That one! With the swing!" **[HINT 3]** Luna and Lyla tap it together.

**[CINE]** A transition: the family walks down the street, suits retracted into glowing wrist cuffs, and neighbors wave from their driveways. A short travel montage replaces free walking.

At the preschool gate, TEACHER (fictional) is waiting with a ring of keys and a coffee.

> TEACHER: "I came in to water the plants and the block bin was *glowing*. I thought, I know exactly which family to call."
>
> MARIA: "…Thank you?"

**[STATE]** `mission_preschool_started = true` → **[SAVE cp_a1_m1_arrived]**

## M1-1 — The Glowing Block Bin

**[CINE]** The classroom: small chairs, a reading rug and a big block bin glowing from inside. **[MUSIC]** A curious version of the town theme. A faint hum comes from the bin, the same hum as the Core's.

Lyla runs straight to it.

> LYLA: "Why it glow?"

**[PLAY]** Lyla's Scan on the bin.
- **Prompt:** "Lyla, can you scan the blocks?"
- **Feedback:** *ding*. In her visor, **some blocks shimmer**: they're pieces of the Assembly Module, which broke apart when it landed and got mixed in with the toy blocks. A frame on the rug lights up with **empty shaped slots**.
- **[HINT 1/2/3]** as in First Contact.

> PAUL: "It came apart and hid with the toys. Smart little machine."
>
> LUNA: "It's *our* blocks now."
>
> MARIA: "We'll borrow them back."

## M1-2 — Space Blocks (learning challenge)

**[PLAY]** Put each shimmering block into the slot it fits. **[MUSIC]** A gentle loop. Each correct placement adds a celesta note, and wrong placements make no sound.

### Challenge contract: `a1m1_space_blocks_v1`

| Field | Value |
| --- | --- |
| ID / version | `a1m1_space_blocks_v1` / 1 |
| Practice skill | `shape_matching`: matching a visible shape to an identical outline. This is **not** recorded as shape-*name* recognition. |
| Prerequisite assumptions | Can move a selection and press one key, or a parent's hand can help. No reading. |
| Stimulus | 4 shimmering blocks (circle, square, triangle, star) and 4 outlined slots on the frame. A fifth slot, shaped like the symbol, stays empty. That's the missing piece for M1-3. |
| Prompt (spoken, replayable) | "Find the block that fits this shape." The current slot glows and its outline traces itself. |
| Answer handling | Select a block, then a slot. A match clicks in with a sparkle. A non-match **gently floats back** with a soft "boop" and no other consequence. |
| Hint sequence | 1: replay the audio and trace the outline. 2: reduce the choices, so non-matching blocks dim. 3: the matching block wiggles. 4: a **joint action**, where Luna and Lyla carry it in together on one tap. |
| Assisted completion | After hint 4, or on adult help/skip in the pause menu, the block goes in. The story reward is identical. |
| Replay / cancel | Replayable from the archive afterward for fun, with no reward. Cancelling returns to the classroom with placements kept. Interruption keeps placements. |
| Story reward | The Assembly Module re-forms 4/5, and the symbol slot stays empty. The story always advances. |
| Observation | For each slot: `{challenge_id, skill: "shape_matching", stimulus, result, assistance[], independent}`. Assisted results stay assisted. A timeout or a stray key is not a wrong answer. Fictional learner IDs only, in any test data. |

There's **no timer**. Order doesn't matter.

**Optional variant (adult setting, later):** shape-name prompts ("Find the **triangle**") are recorded as a separate skill and only when that setting is on. Not part of v1.

### Stuck cubby (Luna's Unstick)

The frame needs to slide into the cubby wall to lock, but **the cubby door is jammed**: it rattles, with the wobble-lines icon.

**[PLAY]** Luna's Unstick.
- **Prompt:** "Luna, can your goo help the stuck door?"
- **Feedback:** a squelch, then a *POP!* The door swings open and the frame clicks in.

> LUNA: "I did a pop!"

**[STATE]** `m1_blocks_sorted = true` → **[SAVE cp_a1_m1_blocks]**

## M1-3 — The Thief

**[CINE]** The open window. The last piece, shaped like the symbol, sits glowing on the sill. Before anyone reaches it, **a robot iguana** pops up, grabs the piece in its mouth, and scrambles out into the playground. **[MUSIC]** **The neighbor's swamp march** crashes in for the first time: banjo, washboard, oompah. **[SFX]** A tinny hiss.

> LUKE: "IGUANA!"

Outside, on the playground fence, sits **a real iguana** sunbathing. It blinks slowly.

> LUKE (pointing): "There's two!"
>
> MARIA: "That one's a *real* iguana. We leave real ones alone. The shiny one is a robot."
>
> LYLA (scanning the real one): *ding*. "Why… sleepy?"
>
> MARIA: "He's just warming up in the sun."

*Design note:* real animals are never fought ([combat system](../../gameplay/COMBAT_SYSTEM.md) §2). Lyla's archive gets a friendly "real iguana" card.

## M1-4 — Playground Chase (first encounter and first alley-oop)

**[PLAY]** The playground: a climbing structure with a tube slide on top, a sandbox and swings. The robot iguana (2 sparks, Standard) has vanished. **It never attacks.** It only hides and runs. This first encounter can't bonk anyone.

### Step 1: Find it (alley-oop tutorial: Slide and Spy)

The robot iguana is hiding somewhere on the high structure, out of sight.

> LUNA: "Lyla! Want a ride?"

Luna's portrait shows the **cupped-hands icon** with the up-arrow, and she lays a **Goo Ramp** up the climbing structure.

**[PLAY]** Tandem: Slide and Spy.
- **Keys:** Enter (Kid Keys) / L / Xbox Y.
- **Prompt (spoken):** "Ride the goo ramp!"
- **The alley-oop plays out:**
  - Lyla zooms up the ramp. **[MUSIC]** A marimba "whoosh" answered by a celesta.
  - Slow motion at the top: the tube slide glows.
  - The player taps Action, or the finish auto-targets after the slow motion. Lyla does a **Sky Scan**.
  - *Ding-ding*. The robot iguana shows up inside the tube slide, Exposed, with its eye icon and target ring.
  - Soft landing and a pose.
- **[HINT 1]** Luna's portrait bounces. **[HINT 2]** LUNA: "Push Enter, Lyla!" (the key glyph is shown). **[HINT 3]** It launches on its own, a joint action.

> LYLA (landing): "Found you!"

### Step 2: Slip it

The robot iguana bolts out of the slide.

**[PLAY]** Splat (Luna, Action) on the ground in front of it.
- It hits the goo, **spins out** (Slipped), slides into the sandbox, and loses a spark.
- **Prompt:** "Make it slip!" Auto-aim is very generous: tapping near it counts.

### Step 3: Stop it

**[PLAY]** Any family member's Action on the slipped robot iguana. The companions set it up, and the player gets the finish.
- The last spark goes. It powers down with a **sad little "boop,"** tips onto its back, legs paddling, and **drops the symbol piece**. Then it rights itself and scuttles off toward home.

**[CINE]** All the commotion startles the **real iguana** on the fence. It puffs up and bobs its head. Maria crouches nearby, and her **Soothe** (passive, the first time it's shown) settles it. It flattens back down into the sun and closes its eyes.

> MARIA: "You're okay. We're going."

**[STATE]** `m1_piece_recovered = true`. Unlocks granted once: `launch_goo_ramp`, `launch_holo_pad`, `finishers_all`, `oop_slide_and_spy` → **[SAVE cp_a1_m1_chase]**

> PAUL: "Nice work, team."
>
> LUKE: "I didn't even get to climb."
>
> PAUL: "Next time. Promise."

**Optional:** an **oop spot** (a glowing up-arrow) by the climbing structure lets the family boost each other up to the top of the slide just for fun. It's a teaching moment for traversal alley-oops, and nothing is required.

## M1-5 — A Clue

**[PLAY]** Lyla's Scan on the spot where the robot iguana fell.
- *Ding*. A tiny part fell off it: **a little garden-gnome badge**. Lyla gets an archive card.

> LYLA: "Why gnome?"
>
> MARIA (looking toward home): "…Hm."

It's a seed for the neighbor's garden (Act I refinements §5), and nobody says it out loud yet.

**[CINE]** TEACHER waves goodbye. The family walks home, with the Assembly Module floating beside Paul, glowing and humming.

## M1-6 — Across the Street

**[CINE]** The cul-de-sac. NEIGHBOR is at her mailbox in gardening gloves. **[MUSIC]** A quiet, suspicious few notes of her march.

The robot iguana (the same one, slightly gooey) dashes across the street and **through the little pet flap in her garage door**. *Flap-flap.*

Everyone looks at her. She looks at the garage, then at them.

> NEIGHBOR: "I have no idea what that was."
>
> PAUL: "Mm-hm."
>
> NEIGHBOR (eyeing the glowing module): "And *what* is *that*?"
>
> LUNA (proudly): "Space blocks!"

She goes inside. The march gives one indignant tuba note.

*Tone rule:* her overreaction is the joke. She's never humiliated or mocked for her age or appearance.

## M1-7 — Install Party (hearth beat)

**[CINE]** The backyard. The Core sits on its blanket, and the dragon hologram flickers above it. **[MUSIC]** The family theme.

The Assembly Module drifts toward the Core, and **the two reach for each other**: ribbons of living material stretch out, touch and knit together. A reunion, not a bolt-on.

Then the Core gives the module's power to something new: a swarm of tiny **Builder Bugs** unfolds from the module. They're thumb-sized helper bots with little legs and lights. They form a line, salute, and start tidying the landing mark.

> LUKE: "It made *bugs*!"
>
> LYLA: *ding, ding, ding, ding*. She's recording every single one.

**[STATE]** `component_assembly` is awarded **once** (idempotent: replay, skip or reload cannot award it again). `install_count = 1`, `sos_notes_restored = 1`, `builder_bugs_unlocked = true`.

**The SOS plays (install 1):** a **music box**, and for the first time, **one clear note** rings out through the static. The hologram's assembly section lights up solid. Everyone goes quiet to listen.

> MARIA (softly): "It's a song."

**The Core's first word.** The Core chirps, then tries:

> CORE: "Lu… na."
>
> LUNA (gasping): "It said ME!"
>
> LYLA: "Say Lyla!"
>
> CORE: "Ly… ly… *ding*." (It copies her archive sound.)
>
> LYLA: (delighted giggle)

BAKER NEIGHBOR leans over the fence with a plate.

> BAKER NEIGHBOR: "I saw the glowing from my kitchen and thought, this family needs cookies."

The cookies are star-shaped. This is the start of the running gag, and they get more elaborate every install.

**[CINE]** Fade on the Builder Bugs napping in a pile on top of the Core, which hums its one note.

**[SAVE cp_a1_m1_complete]**. The mission is complete, and the map now shows the other signals as available, in any order.

---

## Production notes

- **Assets:** this needs one classroom (generic), one playground and the cul-de-sac. A placeholder art set is fine if it's labeled.
- **Encounter is harmless:** the first robot iguana can't hurt anyone. Bonk and revive are introduced in a later mission.
- **Reading:** none required. The map, prompts and archive cards are pictures with spoken labels.
- **Learning data:** observations are local only, and never real child records in fixtures or source control (AGENTS.md).
- **Testing status:** NOT TESTED. When built, check the [interaction contracts](../../gameplay/INTERACTION_CONTRACTS.md) minimum tests:
  - recover, reload and return;
  - a double-triggered pickup;
  - a skipped install;
  - using all the hints;
  - an avatar switch;
  - pause and resume.
