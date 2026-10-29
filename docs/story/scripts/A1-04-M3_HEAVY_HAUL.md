# Script — Mission 3: Heavy Haul (the warehouse store, Power Module)

**Status:** PROPOSED draft. Conventions follow [First Contact](A1-00_FIRST_CONTACT.md), and count-based content is in [install parties](A1-05_INSTALL_PARTIES.md). Playable 2nd–5th.  
**Fictionalization:** a fictional warehouse-club store (Costco-inspired per Act I, but **no real name or logo**). It's open, with background shoppers who are generic, unnamed and never close-up. A fictional STORE MANAGER appears.

| | |
| --- | --- |
| Featured | **Paul** |
| Verb | **Lift / haul** |
| Component | `component_power` |
| Learning | `a1m3_power_cells_v1`, counting objects (`counting_objects`, a proposed skill ID) |
| Enemy debut | **Mow-Bot** |
| Unlocks | **Power Toss** launch, **Rocket Toss** and **Pink Cannonball** alley-oops, **Dragon Punch** |
| Home change | **The Core glows at night**, and the street notices |

---

## M3-0 — Aisle 40-Something

**[CINE]** Inside the giant store: towering shelves and pallets stacked to the ceiling. The signal leads to the back, where a pod is **wedged high between two pallet racks**, humming. **[MUSIC]** The town theme, now bouncy, with a forklift-beep rhythm.

> STORE MANAGER (fictional, very calm): "It's been up there since Thursday. We put a cone under it."
>
> LUNA (pointing at the cone): "Cone!"
>
> PAUL: "I'll get it down."

## M3-1 — Build the Ramp (a physics puzzle)

The pod is too high to reach and too heavy for anyone but Paul, and Paul can't climb the racks.

**[PLAY]** A physics puzzle: **stack pallets into a ramp** up to the pod.
- Paul's **Heavy Lift** carries marked pallets, and each has a glowing handle outline.
- Pallets snap to big, forgiving ramp slots, and the outlines glow when one is close enough.
- **No wrong order.** A pallet in the wrong slot is gently nudged to the nearest right one.
- The companions help: Luke tethers loose boxes out of the way, and Luna's goo slides a pallet across the floor to Paul.
- **Optional alley-oop:** an oop spot at the ramp's top lets the family Power Toss each other up (Paul's launch).

**[STATE]** Unlock: `launch_power_toss`.

## M3-2 — Power Cells (learning challenge)

Paul eases the pod down. It opens, and its **energy cells** have spilled onto a pallet: glowing, chunky cylinders. The module has a ring of sockets.

**[PLAY]** Put the right number of cells in.

### Challenge contract: `a1m3_power_cells_v1`

| Field | Value |
| --- | --- |
| Practice skill | `counting_objects` (proposed skill ID; needs parent/educator review before any claims): counting small tangible quantities, 1–5. |
| Stimulus | Each socket ring shows a number of **dots** (1 to 5) *and* plays that many chimes. The player places that many cells. |
| Prompt (spoken) | "This one needs three cells. Can you count them in?" The number is spoken *and* shown as dots. |
| Answer handling | Each placed cell lights one dot with a counting chime ("one… two… three!"). Too many: the extra cell bounces out with a giggle. The socket glows when it's full. |
| Hints | 1: replay the count, and the dots pulse in sequence. 2: empty dots glow brighter. 3: Paul counts aloud while the player places. 4: **joint action**, where the family counts and places together. |
| Assisted completion | The sockets fill, with the same reward. |
| Observation | Per ring, the target quantity, the result, assistance, and independent yes/no. A bounce-out isn't scored as a failure on its own. |

**[CINE]** The module powers up with a deep **thrum**, and every light in the aisle flickers. **[SFX]** A big satisfying power-up chord.

## M3-3 — Mow-Bot in Aisle 12

**[CINE]** A **Mow-Bot** (the neighbor's lawnmower robot) bursts out from behind the garden-supply pallets, revving. It's after the module. **[MUSIC]** The neighbor's march with a lawnmower motor in the rhythm.

> LUKE: "Is that a LAWNMOWER?"

**[PLAY]** The encounter: 1 Mow-Bot (Standard, 2 sparks) plus 2 robot iguanas.
- **Mow-Bot telegraph:** it revs its engine before every straight-line charge.
- **Teaching moment:** Luna's Splat in its path makes it **spin out comically**, and the grass catcher pops off.
- **Dragon Punch unlocks** mid-fight: Paul's suit gauntlets glow, and a spoken prompt says "Paul, your gauntlet's charged — try your suit power!" A rocket-assisted punch knocks the Stunned Mow-Bot onto its side.
- **Marquee alley-oop suggested:** **Rocket Toss** (Paul → Luke). "Throw me, Dad!" Luke flies along his own tether into a Web Dive that pins both iguanas.
- **Optional marquee:** **Pink Cannonball** (Paul → Luna) shows up if the player is near Luna.
- **Resolution:** the Mow-Bot sputters and stalls, and the iguanas scuttle. The STORE MANAGER calmly puts a cone over the Mow-Bot.

**[STATE]** Unlocks: `ability_dragon_punch`, `oop_rocket_toss`, `oop_pink_cannonball`.

## M3-4 — The Cart Race Home (race)

The module is too heavy to carry far, even for Paul, so it rides home on a **flatbed cart**.

**[PLAY]** Race: push the cart home through the parking lot and down the neighborhood streets.
- **Clear start and finish:** the start is a horn, and the finish is the cul-de-sac with cheering neighbors.
- **Steering assistance** is set by the action-assistance level, never by learning level. Leaving the route gently nudges you back.
- **Hazards:** a sprinkler arc, a rolling ball from a neighbor's yard, the robot iguanas trying to jump on. Bumping them off is a big cartoon *boing*.
- **No reading while steering.** No timer to fail. A "best time" sparkle is optional and never shown as a ranking between siblings.
- **TRUCK NEIGHBOR** pulls up for the last stretch: "Hop on, I'll take it from here!" The cart rides the trailer the final block. It's a supportive-neighborhood beat ([Act I refinements](../ACT_I_CRITIQUE_AND_REFINEMENTS.md) §4.4).

**[STATE]** `component_power` is awarded once, on arrival home.

## M3-5 — Home: Install Party

Run the [install party](A1-05_INSTALL_PARTIES.md) for the current count.

**Module demo:** the Power Module docks, and the Core **lights up fully** for the first time. It's bright enough to light the whole backyard.

**[CINE]** That night, the Core keeps glowing softly. Up and down the cul-de-sac, porch lights flick on and neighbors peek out of windows.

> MARIA (at the window): "Well. Everyone knows now."

Across the street, one upstairs blind snaps shut. **[MUSIC]** One indignant tuba note.

**[STATE]** `core_glows_at_night = true` → **[SAVE cp_a1_m3_complete]**
