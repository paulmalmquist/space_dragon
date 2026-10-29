# Script — Mission 4: The Passenger (the neighborhood grocery, Life-Support Module)

**Status:** PROPOSED draft. Conventions follow [First Contact](A1-00_FIRST_CONTACT.md), and count-based content is in [install parties](A1-05_INSTALL_PARTIES.md). Playable 2nd–5th.  
**Fictionalization:** a fictional neighborhood grocery (Trader Joe's-inspired per Act I, but **no real name or branding**). It's open, with generic background shoppers. A fictional CASHIER appears, wearing a cheerful shirt.

| | |
| --- | --- |
| Featured | **Maria** |
| Verb | **Care and seek** |
| Component | `component_life_support` |
| Learning | `a1m4_produce_sort_v1`, category sorting (`category_sorting`, a proposed skill ID) |
| Enemy debut | **Flamingo Decoys**. A **Sprinkler Turret** is optional. |
| Unlocks | **Bubble Bounce** launch, **Bubble Rocket** alley-oop |
| Home change | **The passenger** comes home |

---

## M4-0 — Something in the Produce

**[CINE]** The grocery: bright, cozy, with hand-drawn-style picture signs (no readable text required). The signal comes from the **produce section**, where a cracked pod sits nestled in the banana display, humming weakly. **[MUSIC]** The town theme with ukulele.

> CASHIER (fictional): "It showed up on the bananas. We've been calling it Kevin."
>
> LUKE: "Its name is Kevin?"
>
> PAUL: "…Probably not."

## M4-1 — Scrambled Controls (learning challenge)

Lyla's Scan **[PLAY]** shows the problem. The Life-Support Module's controls are scrambled, and its little indicator lights have scattered among the produce: glowing fruit-shaped lights mixed into the real fruit. *(Act I canon: "restore scrambled controls through sorting and matching.")*

**[PLAY]** Sort the glowing lights back into the module's matching trays.

### Challenge contract: `a1m4_produce_sort_v1`

| Field | Value |
| --- | --- |
| Practice skill | `category_sorting` (proposed skill ID; needs parent/educator review): grouping by **kind**. Each tray shows one example (an apple, a banana, a grape bunch), and the player puts the matching glowing lights in it. Every kind has a **distinct shape and color** (redundant cues, never color alone). |
| Stimulus | 3 trays and 6 glowing lights, two of each kind. |
| Prompt (spoken) | "Put each light with its family!" The tray's example glows. |
| Answer handling | Match: a chime, and the light snuggles in. Non-match: the light hops back out with a giggle, and nothing else happens. |
| Hints | 1: replay the prompt, and the example pulses. 2: non-matching trays dim. 3: the right tray waves. 4: **joint action**, where Maria and the player sort it together. |
| Assisted completion | The controls restore, with the same reward. |
| Observation | Per light, as in the earlier challenges. |

**[CINE]** The controls restore, and the module unseals with a soft *hiss*… **and something inside moves.**

## M4-2 — Hide-and-Seek

**[CINE]** Inside the module is a **stasis bubble**, and inside that is **a small sleeping creature**: the passenger (design OPEN, kid-sized, with a soft glow). The bubble pops. The creature wakes, sees five giant strangers, panics, and *zips away* into the store.

> LUNA: "Come back!"
>
> MARIA (gently): "It's scared. We don't chase scared things. We find them softly."

**[PLAY]** Hide-and-seek in the store (adapted from the research's stealth suggestion, with **no failure**):
- The passenger hides in a series of spots: the flower buckets, a stack of cereal boxes, under a display table, inside a basket.
- **Find it:** Lyla's Scan shows a small **heartbeat ripple** where it's hiding, a visible equivalent for the sound.
- **Approach softly:** walking calmly near it lets **Maria's Soothe** work. The passenger peeks out and stays.
- **If you rush it,** it just zips to a new hiding spot with a giggle-chirp. **Never "caught," never failed.** After two zips, the next hiding spot is closer and easier.
- **[HINT 2]** MARIA: "Slow and quiet. Let it come to us."
- **Final spot:** it hides in Luna's goo puddle by accident and slides right into Maria's arms.

**[CINE]** Maria holds it. It's weak and its glow is flickering. **[MUSIC]** Maria's cello, very softly.

**[PLAY]** **Healing Pulse** on the passenger (Maria's context action, the heart icon).
- Its glow steadies. It looks up at Maria, then at each family member, and then **it hums**: a few notes of the SOS, faint and wobbly.

> LYLA: "It knows the song!"
>
> MARIA: "It was *in* the message. Somebody sent it home… or away from home."

*Module reveal (Act I canon): the equipment is meant to carry **living passengers**.* This is the emotional heart of Act I's middle: "someone needs help" becomes something the kids can hold.

## M4-3 — Flamingo Trouble

**[CINE]** At the store entrance, **a dozen plastic lawn flamingos** suddenly line the doorway. One of them is ticking. **[MUSIC]** The neighbor's march, played on a toy piano.

**[PLAY]** The encounter: **Flamingo Decoys** (Trick, 1 spark) with one real robot among them, plus an optional **Sprinkler Turret** that has unfolded from a garden-hose display.
- **Teaching moment:** Lyla's Scan **Exposes** the real robot among the fakes.
- **Bubble Bounce unlocks:** "Mama, bounce me!" Maria's shield bubble becomes a trampoline.
- **Marquee:** **Bubble Rocket** (Maria → Paul). Paul goes sky-high in a bubble, then Meteor Slam, and every fake flamingo tips over at once. The real one pops out with a *boing* and flees, flapping.
- The Sprinkler Turret, if present: Maria's shield blocks the water arcs, and Luke tethers it around so it waters the store's flower display instead.

**[STATE]** Unlocks: `launch_bubble_bounce`, `oop_bubble_rocket`.

## M4-4 — The Runaway Cart

**[CINE]** In the commotion, the module (now on a shopping cart) **starts rolling** down the sloped parking lot. *(Act I canon: "recover a runaway delivery cart.")*

**[PLAY]** A short, generous action moment. Luna's **Splat** in front of the cart makes it spin to a gentle stop, or Luke's tether catches it. Either works. If both miss, the cart rolls into a hedge, which is fine. No failure.

**[STATE]** `component_life_support` is awarded once, and `passenger_home = true`.

## M4-5 — Home: Install Party

Run the [install party](A1-05_INSTALL_PARTIES.md) for the current count.

**Module demo:** the Life-Support Module docks, and a soft **bubble of warm air** forms around the Core. It's a demonstration of keeping passengers safe. The passenger floats into it happily and curls up.

**The passenger's hearth beat (this mission always):**
- The kids want to name it. **[PLAY, creative, no right answer]** The player can pick from a few sound-based suggestions or skip, and it keeps a placeholder name. Naming is stored as a **setting**, not canon.
- At bedtime, the passenger refuses to leave the Core. Luna brings it her blanket.

> LUNA: "It's a sleepover."

From now on, **the passenger hums along** at every install party, one beat behind.

**[SAVE cp_a1_m4_complete]**
