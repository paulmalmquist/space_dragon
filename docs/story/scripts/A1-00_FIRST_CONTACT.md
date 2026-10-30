# Script — A1-00 to A1-03: First Contact

**Status:** PROPOSED draft production script. Dialogue, cues and IDs are placeholders.  
**Sources:**
- [Act I](../ACT_I_BUILD_THE_DRAGON.md): canon beats and the canon draft lines, marked ★.
- [Suit reveals](../SUIT_REVEALS_AND_STARTING_ABILITIES.md): the full reveal beats, which aren't repeated here.
- [Music, empathy and pacing](../MUSIC_EMPATHY_AND_PACING.md): the music cues.
- [Interaction contracts](../../gameplay/INTERACTION_CONTRACTS.md): interaction and checkpoint rules.

## Conventions

| Tag | Meaning |
| --- | --- |
| **[CINE]** | Non-interactive. Skippable after the first viewing. Skipping gives the same state as watching. |
| **[PLAY]** | Interactive. It has a spoken prompt, replayable with H on the keyboard or the View button on an Xbox controller, and a hint ladder. |
| **[HINT 1/2/3]** | 1: the target pulses brighter. 2: a family member says the prompt aloud. 3: the family does it together on one tap (an assisted completion that **advances the story the same way**). |
| **[MUSIC]** / **[SFX]** | Cues from the music doc. |
| **[STATE]** | A game-state change, applied once and guarded against repeats. |
| **[SAVE id]** | A durable checkpoint, written after the preceding state changes. |
| **(SD-M1)** | A beat inside the proposed First Contact milestone. |

**Voices:** every line is a placeholder for voice casting. There is **no voice cloning**, and family voices need separate approval (v0.1). Every line is captioned. No line requires reading.

## SD-M1 coverage

| M1 check | Where it's met |
| --- | --- |
| M1-01: Act I opening, no invented dragon | A1-00a/b. The dragon appears only as the Core's own stored design. |
| M1-02: a clear action from the interruption to the backyard | A1-00c "Go see!" (one action and a transition) |
| M1-03: one pod interaction with spoken help | A1-02f, Lyla's Scan (the SD-M1 playable) |
| M1-04: suits introduced without five models or tutorials | A1-02 in its short form: portraits and placeholder flourishes |
| M1-05: checkpoint resume, no duplicate reward | `cp_a1_01_backyard`, `cp_a1_02_suits`, `cp_a1_03_map` |

---

## A1-00a — Launch Night (SD-M1)

**[SAVE cp_a1_00_living_room]** New game.

**[CINE]** The living room in the evening, warm lamplight. **[MUSIC]** The family theme on acoustic guitar and piano.

Paul and Luke are at the computer watching a livestream of a rocket launch (fictional company and vehicle). Maria is on the couch with Luna. Lyla is on the rug building a wobbly tower of blocks, which plants the blocks motif for mission 1.

The stream shows a countdown with big numbers and a voice.

> STREAM VOICE: "T-minus ten…"
>
> LUKE: "Everybody count!"

**[PLAY, optional, never recorded]** The kids count down with the stream. The player can tap Action on each number for a little cheer. It's participation only, with no learning observation. Skip it and the count just continues.

> FAMILY (overlapping): "…five, four, three—"

At **T-minus 3** the stream freezes. The numbers stutter.

## A1-00b — The Signal (SD-M1)

**[SFX]** The speakers make an unfamiliar sound: **a hum inside the static**, almost a tune. No clear notes yet. **[MUSIC]** All music cuts. This is the first stinger.

**[CINE]** A broken image fills the screen: an indistinct voice, an unknown place under a strange sky, and **the symbol**, a simple traceable shape, pulsing. Nobody here opened this.

> ★ LUKE: "What's that?"
>
> ★ PAUL: "I don't know. I didn't open it."
>
> LYLA (from the rug, pointing): "Why?"
>
> MARIA: "Paul…?"

The image breaks up and the screen goes dark. **[SFX]** But the hum doesn't stop. For a few seconds, from speakers that are no longer playing anything, **one low note** goes on, perfectly steady. Then it's gone. *(This is Morrow's note, the Long Note. Nobody in the family knows that yet. See the [villain arc](../VILLAIN_ARC.md).)*

> MARIA: "...Did you turn it off?"
>
> PAUL: "It's off."

Through the window behind them, **a bright streak** crosses the night sky. **[SFX]** A deep *whump* comes from the backyard, and the floor buzzes a little. Lyla's block tower falls over.

> LUNA: "Uh-oh."

**[STATE]** `a1_signal_seen = true`

## A1-00c — Go See! (SD-M1)

**[PLAY]** The back door glows.
- **Prompt (spoken):** "Something landed in the backyard. Let's go see — together!"
- **Action:** any Action press, or moving toward the door. A transition replaces free walking (M1-02).
- **[HINT 1]** The door pulses. **[HINT 2]** Maria: "Stay close, everyone. Let's go look." **[HINT 3]** The family takes hands and walks out together.

**[STATE]** `a1_backyard_reached = true` → **[SAVE cp_a1_01_backyard]**

---

## A1-01 — Something in the Backyard (SD-M1)

**[CINE]** The backyard at night, with the porch light on. **[MUSIC]** A low, curious drone (the Core's hum, still faint).

A **shallow landing mark** on the grass glows faintly. The sprinkler line is cracked, and a puddle is spreading. A small pod, about the size of a big cooler, sits in the mark. **A section of fence has fallen flat on top of it.** It's spectacular but not a disaster: no fire, no smashed house, nobody hurt. The pod's seams glow with the symbol, and it's **warm**, breathing faintly.

> ★ MARIA: "Everybody stay together."
>
> LUKE: "It's *glowing*."

The suit reveals start here.

## A1-02 — Five Suits (full in the suit doc; production cues here)

Run each reveal from [suit reveals](../SUIT_REVEALS_AND_STARTING_ABILITIES.md) §2–6 in this order. Each is a **[CINE]** of 15–25 seconds, or a 3–5 second flourish in the short form. **In SD-M1, each reveal can be a portrait card plus a placeholder flourish** (M1-04).

| Order | Reveal | Trigger in the scene | Line to keep | Music |
| --- | --- | --- | --- | --- |
| 1 | **Paul** | He lifts the fence panel off the pod. | PAUL: "Okay. That's new." / LUKE: "DAD. You're IRON—" / PAUL: "Let's not say it yet." | Paul's brass enters |
| 2 | **Maria** | The Core cracks open with a hiss, Luna is startled, and Maria shields her. | LUNA: "Mama, you're purple!" | Maria's cello |
| 3 | **Luke** | He climbs the playset to watch more streaks split toward town, then slips and is caught. | LUKE: "I have *extra arms*." … "I saw where they went. Lots of places. One went by my school." | Luke's plucked strings |
| 4 | **Luna** | She stomps the sprinkler puddle, it turns to goo, and she slides into the Core and wakes it. | LUNA: "AGAIN!" … *pats the Core* "It's singing." | Luna's marimba. The Core's hum steadies into a soft, almost-tune (no SOS notes restored yet) |
| 5 | **Lyla** | The awake Core projects a glitching half-dragon. Lyla points and asks "why?" until her visor drops. | LYLA: "Why Daddy?" *ding* / PAUL: "…Okay, I guess I'm in the archive now." | Lyla's celesta |

**[STATE]** after each reveal: `suit_paul`, `suit_maria`, `suit_luke`, `suit_luna` and `suit_lyla` are granted **once each**. A replay from the archive grants nothing.

**Projection rule:** the hologram is the Core's **own stored design**, half a mechanical dragon with gaps where pieces are missing. Nobody in the family drew it or designed it (canon).

## A1-02f — Five Together (SD-M1 playable)

**[CINE]** The projection keeps breaking up. The Core chirps urgently and flashes five spots on its body.

**Full build:** play suit doc §7's five steps (Luna unsticks, Paul lifts and knits, Luke tethers the antenna, Maria shields the surge, Lyla scans).

**SD-M1 build:** steps 1–4 play as one short **[CINE]** (about 15 seconds), and **step 5 is the playable**:

**[PLAY] Steady the Core** (`a1_pod_scan_v1`)
- **Target:** the flickering projection, shimmering, with a shape icon (the shimmer) and a rising tone.
- **Prompt (spoken):** "The Core is trying to show us something. Lyla, can you scan it?" The player taps Action at the shimmer. Any avatar works, and Lyla performs the scan.
- **[HINT 1]** The shimmer pulses brighter and the tone rises. **[HINT 2]** LYLA: "Ooh! Look-look!" and she points. **[HINT 3]** Everyone points together on one tap, and the scan happens.
- **Feedback:** *ding*. The projection steadies, and Lyla's first archive card appears with **a picture of the symbol** and the Core's hum.
- **No failure.** There are no wrong answers, and repeated taps do nothing extra once it's done.

**[STATE]** `core_awake = true`, `sos_notes_restored = 0`, `archive_card_symbol = true`, `suits_complete = true` → **[SAVE cp_a1_02_suits]**

**[CINE]** Steadied, the Core projects a second image over the dragon: **a map**, *their* town, with glowing symbols scattered across it. **[MUSIC]** All five family instruments play a chord that **doesn't resolve**.

> LUKE: "That's… our town."

**[CINE]** End of SD-M1 content. The full build continues to A1-03.

---

## A1-03 — A Different Kind of Map

**[CINE]** The living room. The Core sits on a blanket by the back door, connected to the computer by a ribbon of its own light. The computer screen is now a **planning station** showing the town map with symbol icons: no text labels, just pictures of places the kids recognize.

**[MUSIC]** The family theme returns, gentler, with the Core humming under it.

> LUKE: "There's one by my school!"
>
> ★ MARIA: "And that one's somewhere we already go."
>
> ★ PAUL: "Looks like we've got a different kind of shopping list."
>
> LYLA (pointing at a picture of a little building with a swing): "Our school!"
>
> LUNA: "MINE!"

Their preschool's icon pulses brightest. It's the closest signal. Mission 1 is always first.

**[STATE]** `map_revealed = true`, `mission_preschool_available = true` → **[SAVE cp_a1_03_map]**

## A1-03b — Goodnight, Core (hearth beat)

**[CINE]** Bedtime. Paul carries Lyla, who is already asleep, mid-"why." Luke wants to sleep in his suit, and his suit folds back into a wrist cuff, glowing softly.

On the way past the back door, Luna stops at the Core.

> LUNA (whispering): "Night-night."

The Core hums back at her, softer. **[MUSIC]** A music-box version of the family theme. Fade out.

**Next:** [Mission 1 — Space Blocks](A1-04-M1_SPACE_BLOCKS.md), the next morning.

---

## Production notes

- **Fictionalization:** the rocket company, launch vehicle and stream are fictional, and no real logos are used. The backyard is generic, with no real address details (v0.1 privacy rules).
- **Skip and replay:** skipping any **[CINE]** above applies its **[STATE]** lines exactly once. Replaying from the archive applies none.
- **Reading:** nothing in this script requires reading. The map uses pictures, and all prompts are spoken.
- **Testing status:** NOT TESTED. Use the [verification receipt](../../templates/VERIFICATION_RECEIPT.md) when this is built.
