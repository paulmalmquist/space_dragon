# Script — Mission 2: Rooftop Stars (Luke's school, Navigation Module)

**Status:** PROPOSED draft. Tags and conventions follow [First Contact](A1-00_FIRST_CONTACT.md). Install-party content by count is in [install parties](A1-05_INSTALL_PARTIES.md).  
**Order:** playable 2nd–5th. Avoid lines that assume which missions came before, except where they're conditional.  
**Fictionalization:** a generic elementary school seen **from the outside only**: grounds, an outdoor fitness course and the gym roof. No interior layout, real name, signage or access routes. It's Saturday at dusk, with **no other children present**.

| | |
| --- | --- |
| Featured | **Luke**, finally climbing |
| Verb | **Climb** |
| Component | `component_navigation` |
| Learning | `a1m2_trail_flags_v1`, picture matching by default, letter matching as an optional setting |
| Unlocks | **Tether Sling** launch, **Sling Shield** alley-oop |
| Home change | Star map on the planning station, and **the fading star** appears |

---

## M2-0 — The Glow on the Roof

**[CINE]** Dusk outside Luke's school. Faint lights are moving across the gym's high windows from the inside: stars. **[MUSIC]** The town theme with a twinkling layer.

> LUKE: "That's MY school. Something's on the roof!"
>
> MARIA: "We're not going inside. It's closed."
>
> LUKE: "Don't need to go inside. I need to go *up*."

Lyla's Scan **[PLAY]** confirms it: *ding*. The module sits on the gym roof, projecting a star map down through the skylight.

## M2-1 — Trail Flags (learning challenge)

The module's signal has scattered little **light-flags** across the school grounds: by the bike rack, the fitness course, the garden beds and the flagpole. Each flag shows a picture. Following them in order lights the safe path up.

**[PLAY]** Follow the flags.

### Challenge contract: `a1m2_trail_flags_v1`

| Field | Value |
| --- | --- |
| Practice skill | **Default:** `picture_matching` (a proposed skill ID; needs parent/educator review). Luke's visor shows a picture (a star, a moon, a rocket, a sun), and the player picks the flag with the **identical** picture. **Optional setting:** `letter_matching`, where the visor shows a letter and the player picks the flag with the **identical** letter. Recorded as matching, **never** as letter-name recognition. |
| Stimulus | 4 stops, each with 3 flags. One matches the visor. |
| Prompt (spoken) | "Find the flag that matches Luke's visor!" |
| Answer handling | Match: the flag zips its light to the next stop. Non-match: the flag shrugs with a little wiggle, and nothing else happens. |
| Hints | 1: repeat the prompt, and the visor picture pulses. 2: one non-matching flag fades. 3: the matching flag waves. 4: **joint action**, where Luke and the player choose together on one tap. |
| Assisted completion | The path lights the same way, with the same reward. |
| Observation | Per stop, with the stimulus, the result, any assistance, and independent yes/no. A timeout is not wrong. |

**Between stops:** short, playful traversal. There's no reading while moving. Each stop is a safe standing point.

## M2-2 — The Climb (Luke's set piece)

**[PLAY]** Luke's **Spider Climb** up the outdoor fitness course (marked climb surfaces), then the gym wall's drainpipe, then the roof edge.
- **Safety Catch:** if Luke misses a grab, the limbs catch him, with no restart ([suit reveals](../SUIT_REVEALS_AND_STARTING_ABILITIES.md) §4).
- **A gap the family can't climb:** the roof edge sticks out over a planter. **Luke's Tether Sling** unlocks here.

> LUKE: "Mama! I can pull you up. Hold on!"

**[PLAY]** Tandem: **Sling Shield** (Luke → Maria), the first use of Luke's launch.
- Luke anchors and slings Maria up onto the roof. She lands with a **Shield Drop**, and the dome catches the rest of the family as Luke reels them up one at a time. It's a traversal alley-oop, with no enemies.
- **Prompt:** "Luke, sling Mama up!" Keys: Enter / L / Xbox Y.

**[STATE]** Unlocks: `launch_tether_sling`, `oop_sling_shield`.

## M2-3 — Rooftop Iguanas

On the roof, the module is sitting in a puddle of starlight, and **two robot iguanas** are trying to pry it loose. **[MUSIC]** The neighbor's march, sneaking in on pizzicato strings.

**[PLAY]** The encounter: 2 robot iguanas, Standard, 2 sparks each. They're climbers, so they try to scale the AC units.
- **Teaching moment:** Luke's limbs **match their climbing**. When an iguana climbs, Luke can climb after it.
- **Alley-oop suggestion (if Luke is controlled):** a companion asks, "Luke, throw me!" (Tether Sling → their finisher). This is the first time the player can be the **setter**.
- **Resolution:** they tip over, do a sad boop, and scuttle down the drainpipe toward home.

Bonk and revive: these iguanas swat (a small suit-energy tap) but are slow and clearly telegraph it with a little hiss. A bonked member sits dizzy for 3 seconds and Maria's drones revive them ([combat system](../../gameplay/COMBAT_SYSTEM.md) §3). **If this is the player's first time being bonked**, Maria says: "You're okay! Shake it off."

## M2-4 — The Sky in a Box

**[CINE]** Luke lifts the Navigation Module. Its projection swings up off the gym floor and into the **real sky** above them, and for a moment the star map lines up with the actual stars.

Then one point of light appears that **isn't in the real sky**.

> LYLA (visor on): "Why that star?"
>
> LUKE: "That one's new."
>
> PAUL (quietly): "That's where they are. Whoever sent this."

*This is the module-specific reveal: the dragon has a destination* (Act I canon table: "it is not just a vehicle for sightseeing").

**[STATE]** `component_navigation` is awarded once. `fading_star_visible = true`.

## M2-5 — Home: Install Party

Run the [install party](A1-05_INSTALL_PARTIES.md) for the current count.

**Module demo:** the planning station's map zooms out from the town to the neighborhood, then to the sky, and becomes a **star map** with the fading star blinking at its edge. The Builder Bugs (if unlocked) form a tiny constellation on the Core.

**Luke's hearth beat (this mission always):**

> LUKE: "Dad. I climbed my whole school."
>
> PAUL: "You did."
>
> LUKE: "Can I keep the extra arms for school on Monday?"
>
> MARIA: "No."

**[SAVE cp_a1_m2_complete]**
