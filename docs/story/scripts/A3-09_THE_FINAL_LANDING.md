# Script — A3-09 to A3-11: Your Own Note, the Great Launch and the Final Landing

**Status:** PROPOSED draft, following [Act III](../ACT_III_THE_ROAD_TO_VIERA.md) Movements 5–6 and the [music doc](../MUSIC_EMPATHY_AND_PACING.md). Conventions follow [First Contact](A1-00_FIRST_CONTACT.md).  
**Rewritten from:** `A2-11_ENCORE_AND_HOME.md` (October 30, 2026). The Encore, the goodbyes, the dragon's choice and the block party carry over. The game now ends on Viera, and the block party becomes the post-credits scene.  
**Resumes from:** `cp_a3_home_note` ([The Rest Garden](A3-04_THE_REST_GARDEN.md)).

| | |
| --- | --- |
| Powers | **Your Own Note**: each suit's upgrades fuse into one power |
| Final battle | **The Great Launch**: the Sweeper, in three phases, ending in a re-tune |
| Flight | **Formation home**: a victory lap leading the whole fleet down |
| Choice | **The dragon chooses** the family, on its makers' world |
| Ending | **The final landing** on Viera; the lane home to Earth |
| After | Post-credits at the cul-de-sac block party, then the post-game |

---

## A3-09 — Your Own Note

**[CINE]** The Rest Garden, glowing now. The Lanemother is awake, the Hush rests in the pauses, and the family's dragon is curled beside them. As the song washes through Farport, each suit **hums**. It isn't the SOS. It's a single note, a different one for each of them.

> LYLA: "My suit's singing."
>
> CALLER: "That's *your* note. The scale's been listening to you the whole way."

**[CINE]** One by one, each suit **blooms**: the living material opens like petals, glows in its wearer's color, and settles back, changed. The scale gifts and the Farport upgrade fuse into **one power** each. Each reveal is under ten seconds. **[MUSIC]** Each family member's motif plays on their instrument, blends, and **morphs into its synth voice** (owner direction, PR #15 / SD-022): brass, cello, strings, marimba and celesta, one after another, each turning to synth, then all together. The motifs stay recognizable.

| Who | Power (draft) | Reveal moment |
| --- | --- | --- |
| **Paul** | **Anchor:** hold anything still | A falling lantern stops in midair, then settles gently to the ground |
| **Maria** | **Sanctuary:** a dome where everyone heals and anything asleep wakes gently | The garden's sleeping birds wake inside her dome and sing |
| **Luke** | **Lane Weaver:** lines of light that become rails and bridges | A glowing rail arcs up to the Roosts, and he rides it down |
| **Luna** | **Splashdown:** a wave of pink goo the family surfs | She surfs the dry fountain full of goo, shrieking with joy |
| **Lyla** | **Echo:** replay any family member's power once | She copies Luna's wave and surfs right after her |

*Draft powers are in the [overview](../ACTS_II_III_THE_ROAD_TO_VIERA.md) § Suits to powers and stay placeholders. Guardrails: every power switches off on request, helmets always open, and the suit never controls its wearer.*

**[CINE]** The Lanemother breathes on the family's dragon. Its wings shimmer: **Lane Wings**, short blink-jumps.

**[PLAY]** **Five Powers.** Five Together's final form, tried once on a harmless target (a big overgrown hedge, which becomes a perfectly trimmed dragon topiary). The chord **resolves to the home note**.

**[STATE]** `powers_awakened = true`, `ability_lane_wings = true` → **[SAVE cp_a3_powers]**

---

## A3-10 — The Great Launch

**[CINE]** A rumble from the city. Then another. All across Farport, travelers wake up mid-goodbye, mid-step, mid-sentence, and do what Vierans do: **they go.** Ships lift off the landing fields. The Mooring Ring unclamps. Within a minute the sky over Viera is **full of ships**, all moving at once.

> LUKE: "Whoa. *Everybody's* leaving?"
>
> CALLER: "That's… just what we do."

**[SFX]** A deep mechanical groan from the clouds. Something enormous rises out of them, trailing broken grapple arms: **the Sweeper**.

> THE SWEEPER (cheerful, booming): "TOO MUCH IS MOVING. CLEARING ALL LANES. TIDYING!"

Its rule has flipped. Everything used to be too still. Now everything is too busy. It starts scooping launching ships out of the sky.

> PAUL: "Everybody in. One more."

### Phase 1 — In the air

**[PLAY]** Dogfight, at the chosen tier. The dragon leads **every friend the family made** as wingmen: the four star-dragons, the hatchlings (with the passenger riding in front), the woken Waystation ships and the Drift convoy. Against them, the Sweeper's last swarm of Sweeps, Gnats and Hooks.
- **Lane Wings** blink the dragon past grapple arms.
- **Formation calls:** "Break left!" "Climb!" Missing a call has no penalty.
- Each freed ship joins the fleet behind you.
- **[MUSIC]** The completed answer with rests, every world's part woven in, and the family's new synth voices leading over the dragon horn.

### Phase 2 — On its deck

**[CINE]** The dragon lands on the Sweeper's broad back. The family jumps down.

**[PLAY]** On foot, with the new powers. A short, joyful boss phase on a moving deck:
- Paul's **Anchor** holds a swinging grapple arm still.
- Luke's **Lane Weaver** rails the family across a gap.
- Luna's **Splashdown** surfs everyone down a long ramp, and Lyla's **Echo** copies it for a second wave.
- Maria's **Sanctuary** keeps everyone safe while they reach the core hatch.

Phase progress is saved, and a full-family bonk resumes at the start of this phase.

### Phase 3 — The re-tune

**[CINE]** The core: a single bright eye in a small round room, blinking very fast. Before anyone moves, the **robot iguana** trots forward and sits in front of it.

> ROBOT IGUANA: *(a long, gentle beep)*
>
> THE SWEEPER (a little quieter): "…EVERYTHING IS MOVING. EVERYTHING WAS STILL. THERE IS NO RIGHT AMOUNT."

**[PLAY]** **Lyla's Holo Replay**: the rest from the song, a beat of warm quiet. The Sweeper's eye slows down.

> CALLER (stepping up, small but steady): "There's a rule you never got. *Some things that are still are only resting.*"
>
> THE SWEEPER: "…ONLY RESTING."
>
> CALLER: "And when they're moving, they're going somewhere. You don't tidy them. You help them get there."

**[CINE]** The Sweeper's eye slows to a calm blink. It powers down gently, settles into the clouds, and lets go of every ship it was holding. They float free and drift home. A moment later, it powers back up, very politely.

> THE SWEEPER: "…HARBOR TUG, REPORTING. WHERE WOULD YOU LIKE TO GO?"

**[STATE]** `sweeper_retuned = true` → **[SAVE cp_a3_great_launch]**

---

## A3-11 — The Final Landing

### A3-11a — Formation Home (the victory lap)

**[PLAY]** Flight. The dragon leads **the whole fleet** down to Farport: the star-dragons, the Lanemother gliding at the head, the hatchlings, thousands of traveler ships, and the Sweeper at the back, towing anyone who needs a hand.
- **A ring run with no enemies**, through the Mooring Ring, between the Roosts, low over the Departure Halls.
- Each ring passed adds the family's instruments, in key. Formation calls are light and fun, and missing one has no penalty.
- **[MUSIC]** The full song with rests and the home note. This is the fighter-jet system's victory lap.

Skipping the flight leads straight to A3-11b with the same state.

### A3-11b — Fair Lanes (the homecoming)

**[CINE]** The main landing field, packed with travelers. **[MUSIC]** The Caller's theme, now with a whole crowd singing it.

A pair of travelers pushes through the crowd, then runs. It's **the Caller's family**.

> CALLER (running): "I went somewhere! I went *really far*!"

They hug for a long time. Then the Caller's parent takes out an ink stamp and opens the Caller's lane book to the first page.

> CALLER'S PARENT (placeholder): "First voyage. And you came home."

*Stamp.* The Caller's very first mark: Viera's.

**[PLAY]** **Lane books.** One by one, each family member holds out their book: Earth on the first page, then every world they reached, then **Viera** stamped on the last. Bonus stamps from optional discoveries shine on the margins. *Ding.*

> LUKE (flipping through his): "We've been *everywhere*."
>
> LUNA: "Again!"

**The passenger** flies down with the hatchlings and gives the kids a **keepsake**: a small glowing scale that **hums the home note** when you hold it.

> LUNA (holding it to her ear): "It's singing *our* note."

### A3-11c — The Dragon Chooses

**[CINE]** The family walks back to their dragon. The star-dragons gather around it, and the Lanemother lowers her head beside it. On the edge of the field, the Forge's shipwrights who first drew its blueprints have come to look at it. It's one of them, made from their scales, on the world that made it. It could stay.

> CALLER: "It can stay, if it wants. Or go with you. It's its choice. Nobody gets to make it for the dragon."

The dragon looks at the star-dragons. It looks at the Lanemother, who lowers her head: *it's up to you*. It looks at the family.

Then it **lowers its wing** to the ground, like a ramp, for them to climb aboard.

> LUKE: "It picked us."
>
> MARIA: "It picked us back."

*This mirrors the family's own choice in Act I: nobody was chosen, and everyone chose.*

**[STATE]** `dragon_chose_family = true`

### A3-11d — The Resting Chair

**[CINE]** The Rest Garden, now full of people for the first time in ages. NEIGHBOR unfolds her **lawn chair** next to the Hush's favorite bench, sits down, and closes her eyes. A Vieran traveler watches, puzzled, then carefully sits on the bench beside her. Then another. Soon there's a whole row of travelers, just sitting.

> TRAVELER (placeholder, whispering): "What are we doing?"
>
> NEIGHBOR (eyes still closed): "Nothing. That's the point."

The Hush drifts down and leaves **a small, perfectly quiet pebble** in her lap. When she holds it, everything around her goes softly quiet for a moment.

> NEIGHBOR: "…*Oh*. Oh, that's lovely."

When the family turns to leave, she folds up her clipboard but leaves the chair.

> NEIGHBOR: "It's staying. They need it more than I do."
>
> *(beat)*
>
> NEIGHBOR: "Still not approving the dragon."

### A3-11e — The Lane Home

**[CINE]** The Lanemother rises over Farport and sings. Not the SOS: a new song, long and steady. A **lane** of light unrolls from Viera's sky, out past the Mooring Ring, across the dark, toward a tiny blue dot.

> CALLER: "She's singing you a lane. To *your* home. It'll always be there."
>
> PAUL: "So we can go home…"
>
> CALLER: "…and come back. Fair lanes, both ways."

This keeps Act I's promise of a way home. **[STATE]** `lane_to_earth = true`

### A3-11f — Closing Image

**[CINE]** Night on Viera. The family is on a blanket in the Rest Garden, kids half-asleep, with the dragon curled around them like a cat. Travelers rest on the benches for the first time in a very long time. The Sweeper hums softly in the harbor. **[MUSIC]** The music-box family theme, now with the home note.

Overhead, the **lane home to Earth** glows steady among the stars.

The dragon hums the SOS, softly, all seven notes, then rests, then home.

And from far, far away, down the lane, **faint voices hum back.**

**Cut to black.**

**[STATE]** `act3_complete = true` → **[SAVE cp_act3_complete]**

---

## Post-credits — Block Party

**[CINE]** The cul-de-sac at dusk, some time later. The dragon is curled around the house. The family is home for the weekend, and **the whole neighborhood is out**:
- BAKER NEIGHBOR with **the biggest cake yet**, shaped like the family riding the dragon.
- TRUCK NEIGHBOR: "Lawn's mowed!"
- TOOLS NEIGHBOR: "Back in my day… no. Nothing in my day was like this."
- TEACHER: "Did you bring me a picture?" Lyla gives her an archive card. *Ding.*

**[MUSIC]** The **family theme, with the home note**.

A **small Vieran ship** comes down the lane of light and lands softly on the street. The hatch opens. It's **the Caller**, on their second voyage, holding a gift wrapped in Vieran cloth: a cake-sized pastry for the baker neighbor.

> CALLER: "Fair lanes!"
>
> LUNA (running): "You came!"

Across the street, NEIGHBOR is on her porch in a brand-new lawn chair. She raises a hand, briefly. On her windowsill: the Hush's quiet pebble, next to a repaired birdbath and a single star-shaped cookie.

> NEIGHBOR: "…Goodnight."

**Cut to black.**

---

## After the ending (the post-game, proposed)

- **The lanes stay open.** Free travel between every world, Earth and Viera included, with lane-book stamps left to find. This reconciles with v0.1's canon C02, "explores the universe," as a **post-game mode** that only arrives after the SOS has been answered. That keeps Act I's rule: no sightseeing campaign between assembly and answering.
- **Five Powers resolves** to the home note everywhere ([music doc](../MUSIC_EMPATHY_AND_PACING.md) §2.2).
- **Wingmen** can be called on flights: the star-dragons, the hatchlings, or the Sweeper as a very slow tow.
- **Open hooks** (OPEN): a second power per family member; another call from another universe; the Hush visiting Earth for some peace and quiet *in the neighbor's garden*.
