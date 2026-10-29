# Script — A1-06b: Across the Street (the Bridge)

**Status:** PROPOSED draft, following [Act I refinements](../ACT_I_CRITIQUE_AND_REFINEMENTS.md) §5. Conventions follow [First Contact](A1-00_FIRST_CONTACT.md).  
**Canon guardrails:**
- The neighbor is fictional, with a fictional name and design. Her established brief is a blonde woman in her late fifties.
- **Her overreaction is the joke. Her age, gender and appearance are not.**
- She did **not** cause the inter-universe emergency.
- This scene proposes the Bridge piece as the source of her tech (OPEN in canon).

| | |
| --- | --- |
| Verb | **Empathy** (preceded by a playful boss fight) |
| Component | `component_bridge`, the 7th piece, the one that crosses universes |
| Boss | **Armored Alligator, upgraded**, powered by the Bridge |
| Music | Her march at its loudest → **it slows into a waltz** |
| Payoff | Mission 1's gnome badge. Mission 5's and 6's "our sparkle" clues. Lyla's recording from the first night. |

---

## B-0 — "One More. Here."

**[CINE]** Right after mission 6. The dark dragon stands over the cul-de-sac, and neighbors murmur. The Core, beside the dragon's foot, chirps, then strains to speak:

> CORE: "Not… all. One more. Here."

It turns and **points across the street**, at the neighbor's house.

Everyone turns. NEIGHBOR is on her porch with her arms crossed.

> NEIGHBOR: "Don't look at *me*."

**[PLAY]** Lyla's Scan toward her house.
- *Ding*. Her visor shows **a huge glow in the backyard**, bigger than everything in the iguanas and the alligator. Behind her fence, garden gnomes turn their heads in unison. They're glowing too.

> LYLA: "Gnomes!" *(If mission 1's gnome badge card exists: she holds it up. "Same gnome!")*

## B-1 — Asking

**[CINE]** The family crosses the street together and stops at her front walk. They ask, and nobody accuses.

> PAUL: "We think something of ours landed in your yard. The night it all started."
>
> MARIA: "We'd like to ask for it back. Please."
>
> NEIGHBOR: "*Of yours?* It flattened my roses. It cracked my birdbath. *Nobody* came over to see if *I* was all right. Then you put a *dragon* on the street."
>
> LUKE (quietly, to Maria): "…She's kind of right."

She steps back and claps twice. Every garden gnome on the lawn **turns to face them**. **[MUSIC]** The march kicks in, loud.

> NEIGHBOR: "Absolutely not."

## B-2 — The Backyard Boss (Armored Alligator, upgraded)

**[CINE]** Her backyard: a wrecked garden of flattened roses, a cracked birdbath, and a crater where the Bridge piece fell. The piece now sits glowing inside **the Armored Alligator**, which has been rebuilt with patched plates, a garden-gnome "command unit" riding on its head, and lawn sprinklers on its back. It lumbers out of the shed.

> LUKE: "It's the SAME alligator!"
>
> NEIGHBOR (from the porch): "I fixed it. I'm very handy."

**[PLAY]** The boss, using the [combat system](../../gameplay/COMBAT_SYSTEM.md) §7 example. Phase progress is saved, there's no game over, and nothing that matters gets broken. **The family avoids the remaining flowers.** Hitting a flowerbed has no penalty, but Maria says "Careful of her garden!", and the scoring sparkle favors care.

| Phase | Pattern | What happens |
| --- | --- | --- |
| 1: Slip it | Goo | It charges in a long, telegraphed line. **Luna's goo** makes it overshoot into the compost heap, and it's Stunned. **Gnome minions** (Swarm, 1 spark) waddle in. Splash Slam-style bowling knocks them over, and they lie there blinking. |
| 2: Find the glow | Scan | Its armor opens briefly. **Lyla scans the Bridge piece** glowing inside, and it's Exposed. Its sprinklers fire arcs that are blocked by Maria's shield. |
| 3: Bubble Rocket | Alley-oop | **Maria bubble-bounces Paul** over the armor. **Meteor Slam** lands on the exposed core. The machine powers down with the longest, saddest *boooooop* in the game. |

**Five Together** works here too, with a final phase skip.

**[CINE]** The alligator rolls over, legs paddling. The gnome command unit falls off and lands face-down in the mud. **The Bridge piece slides out of the alligator's chest** onto the grass. It's glowing, and it's the only light in the dark garden.

**The family doesn't grab it.**

## B-3 — Looking After Her

**[CINE]** The fight music cuts out. The garden is quiet. NEIGHBOR is standing at the edge of her crater, looking at the flattened roses. **[MUSIC]** Silence, then one very slow, sad phrase of her march.

**[PLAY]** Three caring actions. They're **all optional and in any order**. Each one moves her a little, and any **one** of them is enough to continue. It's a creative, gentle sequence with no failure.

1. **Maria, Healing Pulse on the garden.**
   - Her healing works on plants too. Purple light spreads, and the roses **stand back up**, blooming.
   - NEIGHBOR (startled): "…Oh."
2. **An apology, from Luna or whichever child is playing.**
   - **[PLAY]** A gesture choice with picture icons and spoken labels: *say sorry*, *give a hug*, *give her a flower*. Every choice is kind and every choice works.
   - LUNA: "Sorry your flowers got squished."
   - NEIGHBOR: "…Well. Thank you."
3. **Lyla, Holo Replay of the first night.**
   - Lyla's archive has the sky she recorded during her suit reveal. She projects it: the streaks splitting overhead, and **one of them falling into this backyard**. Nobody threw it. It just fell.
   - NEIGHBOR (watching it land in her roses): "…It wasn't you."
   - PAUL: "It wasn't anyone. It just fell. We should've come over that night. I'm sorry we didn't."

**[CINE]** Long pause. **[MUSIC]** Her march slows down, the tuba softens, the banjo picks out a gentle three-beat pattern, and **it becomes a waltz.**

She walks over, picks up the Bridge piece, looks at it for a long moment, and **holds it out to Luna**.

> NEIGHBOR: "This doesn't mean I approve of the dragon."
>
> LUNA (taking it): "Okay!"

**[STATE]** `component_bridge` is awarded once. `neighbor_softened = true`. `neighbor_theme = waltz`.

> NEIGHBOR (as they turn to go): "And somebody is fixing my birdbath."
>
> PAUL: "Deal."

*Optional hearth beat:* the Builder Bugs fix her birdbath overnight. In the morning she finds it whole, with a single star-shaped cookie on the rim.

**[SAVE cp_a1_bridge_recovered]**

→ Continue to [Finale: The Answer](A1-07_THE_ANSWER.md).

---

## Writing notes

- **Who won?** Nobody beat her. The fight stopped a machine, and kindness got the piece. The act's climax is about **how** to win, which echoes "we chose to help."
- **Keep her grumpy.** She softens and stays herself. She has a role in Act II (the stowaway).
- **No humiliation.** The mud-faced gnome is the joke, not her.
