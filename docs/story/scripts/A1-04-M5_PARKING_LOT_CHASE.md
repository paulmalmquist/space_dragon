# Script — Mission 5: Parking Lot Chase (the big-box store, Wing-Control Module)

**Status:** PROPOSED draft. Conventions follow [First Contact](A1-00_FIRST_CONTACT.md), and count-based content is in [install parties](A1-05_INSTALL_PARTIES.md). Playable 2nd–5th.  
**Fictionalization:** a fictional big-box store (Target-inspired per Act I, but **no real name, logo or red bullseye**), seen mostly in its parking lot. Generic background shoppers.  
**Learning:** **none, by design.** This is a pure-action mission. The [learning rules](../../learning/LEARNING_RULES.md) say not to attach a question to every adventure.

| | |
| --- | --- |
| Featured | **Luke and Luna** |
| Verb | **Chase / slip** |
| Component | `component_wing_control` |
| Enemy debut | **Mosquito Drones** |
| Unlocks | **Tiny Launch** alley-oop, **Spider Pounce**, more **oop spots** |
| Clue | Lyla sees **the Core's symbol glowing inside a robot iguana**. That sets up the Bridge. |
| Home change | **The wings flex**, and the neighbor sees it |

---

## M5-0 — Too Late

**[CINE]** The parking lot at golden hour. The signal leads to a cart corral, where a cracked, **empty** pod sits. Scuff marks and tiny iguana footprints lead away.

> LUKE: "Somebody got here first."
>
> PAUL: "Some*thing*."

**[SFX]** A distant whine gets louder. **[MUSIC]** The neighbor's march, but faster, with a buzzing synth.

Across the lot, **three robot iguanas** are dragging the Wing-Control Module toward a van-sized hedge, and above them, **a swarm of mosquito drones** circles.

## M5-1 — The Chase

**[PLAY]** A parking-lot chase in three short legs, each with a clear finish line (a lamppost the iguanas run past).

**Leg 1: Through the cart corrals**
- The iguanas weave through the rows of carts. **Luna's Slip 'n Slide** lays a goo lane down the row, and the family **slides** after them, fast and fun.
- **Spider Pounce unlocks:** Luke leaps onto an iguana and pins it briefly. It's a forgiving leap with big auto-aim.

**Leg 2: The drone swarm**
- **Mosquito Drones** (Swarm, 1 spark) dive at the family. They whine louder before diving (the telegraph), and the ripple icon shows their sound.
- They drain a little suit energy on a hit. Maria's Family Shield reflects them.
- **Alley-oop:** any launch into Luke's **Web Dive** nets several drones out of the air. They drop, buzz sadly and fly home.
- **Optional:** **Net Catch-style play** (Lyla Sky Scan from an oop, then Web Dive) for players who like setting up.

**Leg 3: The getaway**
- The last iguana has the module and is heading for the road. Luna's **Splat** spins it out into the grass, and it drops the module.

**Failure moves forward:** if an iguana reaches a finish lamppost first, the next leg simply starts from there. The final iguana always slows down near the hedge, so the module is always recovered.

## M5-2 — Tiny Launch

**[CINE]** The module is free but stuck on top of the **tall cart-return roof**. Paul is the only one heavy enough to knock it loose with a Meteor Slam, and he can't jump that high.

> LYLA: "Daddy. I launch you."
>
> PAUL: "…You're going to *what*?"

**[PLAY]** Tandem: **Tiny Launch** (Lyla → Paul).
- Lyla projects a **Holo Pad** and a landing marker. Paul steps on doubtfully, and he's launched sky-high.
- **Slow motion:** PAUL (mid-air): "*How did you*—"
- Meteor Slam onto the roof. The module pops loose and floats down into Luna's arms.

> LYLA: (very proud *ding*)

**[STATE]** Unlocks: `ability_spider_pounce`, `oop_tiny_launch`, and more oop spots around town.

## M5-3 — The Clue Inside

The last robot iguana is sitting on its back in the grass, legs paddling, sparks gone. Before it rights itself:

**[PLAY]** Lyla's Scan on the iguana.
- *Ding*. Inside its plastic shell, Lyla's visor shows a glow: **the Core's symbol**. A piece of the same living material is inside the neighbor's robot. Lyla gets an archive card.

> LYLA: "Why it has *our* sparkle?"
>
> MARIA (to Paul, quietly): "Her robots are running on the same stuff."
>
> PAUL: "Then she found a piece too."

The iguana flips over and scuttles off. Nobody chases it.

**[STATE]** `clue_symbol_in_iguana = true` (it pays off in [Across the Street](A1-06B_ACROSS_THE_STREET.md)). `component_wing_control` is awarded once.

## M5-4 — Home: Install Party

Run the [install party](A1-05_INSTALL_PARTIES.md) for the current count.

**Module demo:** the Wing-Control Module docks. The dragon hologram, now wider than the yard, **flexes its wings** for the first time. It's a huge, slow, beautiful sweep, and the hologram's wingtips reach over the fence.

**[CINE]** Across the street, NEIGHBOR is watering her (sad, patchy) garden when the hologram's wingtip passes *right over her head*. She looks up. She drops the hose. This is the canon draft exchange from Act I:

> ★ NEIGHBOR: "Please tell me that is a decoration."
>
> ★ PAUL: "It's a construction preview."
>
> ★ NEIGHBOR: "A preview of what?"

The holographic dragon spreads its wings. **[MUSIC]** A full orchestral swell, then one tiny tuba note.

**[SAVE cp_a1_m5_complete]**
