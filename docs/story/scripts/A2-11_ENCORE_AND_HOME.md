# Script — A2-11: Encore and Home (Act II coda)

**Status:** PROPOSED draft, following [Act II](../ACT_II_ANSWER_THE_CALL.md) Coda and the [music doc](../MUSIC_EMPATHY_AND_PACING.md). Conventions follow [First Contact](A1-00_FIRST_CONTACT.md).

| | |
| --- | --- |
| Flight | **The Encore**: a victory-lap ring and canyon run with no enemies, in formation with the star-dragons |
| Choice | **The dragon chooses** to stay with the family |
| Return | The way home, **shown and flown** |
| Ending | A block party in the cul-de-sac |
| After | The post-game: an open bridge and a resolved Five Together |

---

## A2-11a — The Encore (optional, recommended)

**[PLAY]** Flight. The dragon carries the **new song, with its rests**, out across every world in **formation with the star-dragons**: the Market Dragon, the Hatchery Dragon and her hatchlings, the Spire Dragon, the Forge Dragon, and the Elder Dragon leading.
- **A ring and canyon run with no enemies:** through the restored bazaar's lanterns, between the ringing spires, past the Hatchery's nests and along the Forge's trench.
- Each ring passed adds the family's instruments, in key. **Song-breath** paints the last grey patches.
- **Formation calls:** "Break left!" "Climb!" A light, fun test of fighter-jet flying with wingmen. Missing a call has no penalty.
- **[MUSIC]** The full song with rests, and the dragon horn as lead. This is **the fighter-jet system's victory lap.**

Skipping the Encore leads straight to A2-11b with the same state.

## A2-11b — Goodbyes at the Beacon

**[CINE]** The beacon tower, bright now. The **Caller** stands with **their family**, awake at last, hugging. **[MUSIC]** The Caller's theme with full orchestra and, finally, *other voices singing with them*.

> CALLER: "You came. You came all this way and you *didn't have to*."
>
> LUKE: "We wanted to."

**The passenger returns** from the Hatchery with its family. It gives the kids a **keepsake**: a small glowing scale that **hums the home note** when you hold it.

> LUNA (holding it to her ear): "It's singing *our* note."

The neighbor gets something too. The Hush, drifting nearby, leaves **a small, perfectly quiet pebble** on her folding chair. When she holds it, everything around her goes softly quiet for a moment.

> NEIGHBOR (testing it, eyes closed): "…*Oh*. Oh, that's lovely."

## A2-11c — The Dragon Chooses

**[CINE]** The family walks back to their dragon. The star-dragons gather around it. It's one of them, made from their scales, and it could stay here with its own kind.

> CALLER: "It can stay, if it wants. Or go with you. It's its choice. Nobody gets to make it for the dragon."

The dragon looks at the star-dragons. It looks at the Elder Dragon, who lowers its head, *it's up to you*. It looks at the family.

Then it **lowers its wing** to the ground, like a ramp, for them to climb aboard.

> LUKE: "It picked us."
>
> MARIA: "It picked us back."

*This mirrors the family's own choice in Act I: nobody was chosen, and everyone chose.*

**[STATE]** `dragon_chose_family = true`

## A2-11d — The Way Home

**[PLAY]** Flight home. **The way back is shown and flown**, which keeps the promise from Act I's full message.
- Take off from the beacon with the star-dragons escorting to the edge.
- **The crossing:** sound reverses, colors invert, a shimmer. It's the same as the way in, so it feels familiar now and not scary.
- **Light speed:** stars stretch into streaks.
- Then **a small blue planet**, then the coastline, then the town, then the street.

**The Bridge stays open.** Behind them, the opening is now a **steady ring of light**, not a fading star. **[STATE]** `bridge_open = true`

## A2-11e — Block Party

**[CINE]** The cul-de-sac at dusk. The dragon lands softly on the street, and **the whole neighborhood is waiting**:
- BAKER NEIGHBOR with **the biggest cake yet**, shaped like the whole family riding the dragon.
- TRUCK NEIGHBOR: "Lawn's mowed!"
- TOOLS NEIGHBOR: "Back in my day… no. Nothing in my day was like this."
- TEACHER, if mission 1 is complete: "Did you bring me a picture?" Lyla gives her an archive card. *Ding.*

**[MUSIC]** The **family theme, with the home note**: the first time the opening theme has sounded complete.

NEIGHBOR climbs out of the storage bay with her folding chair, and her clipboard is long gone. She walks back across the street. At her gate, she stops and turns around.

> NEIGHBOR: "…It's actually very peaceful up there."
>
> *(beat)*
>
> NEIGHBOR: "Still not approving the dragon."
>
> LUNA (waving): "Bye, friend!"
>
> NEIGHBOR (going inside, but the corner of her mouth turns up): "…Goodnight."

Through her window, a moment later: she sets the Hush's quiet pebble on the windowsill **next to a repaired birdbath** and a single star-shaped cookie.

## A2-11f — Closing Image

**[CINE]** Night. The family is on the front lawn on a blanket, kids half-asleep. The dragon is curled around the house like a cat. **[MUSIC]** The music-box family theme, now with the home note.

Overhead, the **opening glows as a steady ring** among the stars.

The dragon hums the SOS, softly, all seven notes, then rests, then home.

And from far, far away, through the ring, **faint voices hum back.**

**Cut to black.**

**[STATE]** `act2_complete = true` → **[SAVE cp_act2_complete]**

---

## After Act II (the post-game, proposed)

- **The Bridge stays open.** This reconciles with v0.1's canon C02, "explores the universe," as a **post-game free-exploration mode** that only arrives after the SOS has been answered. That keeps Act I's rule: no sightseeing campaign between assembly and answering.
- **Five Together now resolves** to the home note, a subtle reward everywhere ([music doc](../MUSIC_EMPATHY_AND_PACING.md) §2.2).
- **Wingmen** can be called on flights: the star-dragons as formation partners.
- **Act III hooks** (OPEN): another call from another universe; the senders visiting the cul-de-sac (the neighbor's horror); the Hush visiting Earth for some peace and quiet *in her garden*.
