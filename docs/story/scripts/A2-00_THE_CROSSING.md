# Script — A2-00 to A2-02: The Crossing, Arrival and the Last Beacon

**Status:** PROPOSED draft, following [Act II](../ACT_II_ANSWER_THE_CALL.md) Movements 1–2 and the [music doc](../MUSIC_EMPATHY_AND_PACING.md). Conventions follow [First Contact](A1-00_FIRST_CONTACT.md).  
**Resumes from:** `cp_act2_start` ([The Answer](A1-07_THE_ANSWER.md)).

| | |
| --- | --- |
| Flight | First sortie in space: an orbit climb and a ring run, then the **light-speed** transition, then the **crossing** |
| Reveal | **The stowaway** |
| New world rule | **Sound paints color** |
| New cast | **The Caller** (design and name OPEN) |
| Seeds | The Hush on the horizon, and the bedtime story "The Hush keeps the rests" |

---

## A2-00a — Up and Out

**[PLAY]** Flight, at the chosen tier ([combat system](../../gameplay/COMBAT_SYSTEM.md) §6). The dragon climbs from the coastline through the clouds into black, starry space. **[MUSIC]** The family theme becomes a driving flight cue with the dragon horn.
- **Ring run:** the Core projects **guide rings** leading toward the opening, now a steady ring of light far ahead. Flying through them builds speed. Missing one just means the next ring appears closer. No failure.
- **In space,** flight assist keeps the dragon handling like a jet. Ace tier can switch it off.

> LUKE: "We're in SPACE."
>
> LUNA (pressed against the cockpit glass): "Stars!"
>
> LYLA: *ding ding ding ding ding*

## A2-00b — Light Speed

**[CINE]** A short, **skippable** transition. The Core says "Hold on," and the stars stretch into streaks. The family is pushed back into their seats, and everyone laughs. **[MUSIC]** A rising whoosh into a held chord.

*Continuity rule:* this is **light speed**, the fast travel the dragon always had. It gets them *to* the opening. It does **not** cross universes.

## A2-00c — The Crossing

**[CINE]** At the ring. The Bridge in the dragon's chest glows. The Core says: "Bridge. Now."

The crossing **looks and sounds different from light speed**:
- **Sound briefly plays backward.** The family's own gasp un-gasps.
- **Colors invert** for a heartbeat. Purple goes green and pink goes teal.
- **A shimmer** ripples through everything like passing through the surface of water.

**[PLAY]** One simple input: "Steady!" Hold Up in Cadet, or keep the nose in the ring at Pilot and Ace. It **can't fail**. Drifting out of the ring gently pulls the dragon back.

## A2-00d — The Stowaway

**[SFX]** Mid-shimmer, a **BANG** from the storage bay behind the seats. Then a muffled "Ow."

Everyone turns. Luke unbuckles, floats back, and opens the hatch.

Inside, wedged between the supply tin and the spare Builder Bugs: **NEIGHBOR**, sitting in a **folding lawn chair**, holding a **clipboard**, wearing her gardening hat. In her lap is **a slightly gooey robot iguana**, the one from mission 1, with its garden-gnome badge still on.

> LUKE: "…Hi?"
>
> NEIGHBOR (adjusting her hat): "I am here to file a formal complaint with whoever is in charge of this dragon."
>
> PAUL: "…That's me?"
>
> NEIGHBOR: "Then I'll wait for someone more senior."
>
> CORE: "Hello."
>
> NEIGHBOR: "…The *box* talks?"
>
> MARIA (sighing, already reaching for a spare blanket): "Are you okay? Do you need anything?"
>
> NEIGHBOR (caught off guard): "…A seatbelt would be nice."

> LUKE (pointing at the iguana): "That's the one that stole our block!"
>
> NEIGHBOR: "He's reformed. Mostly."
>
> ROBOT IGUANA: *(a small, guilty beep)*

**[STATE]** `neighbor_aboard = true`. She rides in the storage bay with a seatbelt rigged by the Builder Bugs. She's a scripted scene character, not a follower or a playable character ([Act II](../ACT_II_ANSWER_THE_CALL.md) §4). The robot iguana becomes the family's **ex-henchman helper**. It's a scripted helper that fetches small items in scenes, and the living material inside it recognizes home. It's not a follower system. **[SAVE cp_a2_crossed]**

---

## A2-01 — Arrival in the Quiet

**[CINE]** The other side. A vast sky, but **washed out**: grey-blue, muted, as if everything were under thick glass. Floating worlds drift in the distance, dim. **[MUSIC]** **The Quiet** isn't music at all. It's a heavy muffling filter, and even the dragon horn comes out flat.

The dragon tries to roar. It comes out as a muffled *hmph*.

> LUNA (whispering): "Why is it so quiet?"
>
> LYLA (visor flickering): "Why… grey?"
>
> PAUL: "Something's wrong here."

Luke presses his face to the glass, takes a huge breath, and **yells**:

> LUKE: "HELLOOOOO?"

**[CINE]** Around the dragon, **color ripples outward** from his voice: a sphere of blue sky, gold starlight and green on the nearest floating rock. The ripple **stays**. **[MUSIC]** Luke's plucked strings ring out *clear*, the first unmuffled sound.

> MARIA: "…Do that again."
>
> EVERYONE (yelling): "HELLOOOOO!"

The ripple grows. The kids are in heaven.

> LUKE: "So being loud is GOOD here?!"
>
> NEIGHBOR (from the storage bay, hands over her ears): "Oh, *wonderful*."

**[PLAY]** Teaching moment: **sound paints color**. Fly a short loop and use the Breath Cannon, the Boost and Dragon Roar (if Family Spark is full). Each sound pushes color back out, and the restored area **stays restored**. That's visible, saved progress ([music doc](../MUSIC_EMPATHY_AND_PACING.md) §2.4).

### The Hush, first glimpse

**[CINE]** Far on the horizon, at the edge of the color the family has made, **a huge soft shape** drifts like a cloud with a body. As Luke yells again, it **pulls away** and fades into the grey. Only Lyla's visor catches it, as a slow ripple.

> LYLA: "Why it go away?"
>
> MARIA: "Maybe it's shy."

**[STATE]** `hush_glimpse_1 = true` → **[SAVE cp_a2_arrived]**

---

## A2-02 — The Last Beacon

**[CINE]** The passenger, riding on Luna's lap, suddenly **sits bolt upright** and points. It's humming the SOS, louder than ever. Ahead, on a lonely floating rock, stands **a tall, thin tower like a lighthouse**, its beam pulsing *exactly in time with the SOS*. It's the only light out here that isn't the family's.

> MARIA: "That's where the message is coming from."

**[PLAY]** A short flight to the beacon, then a hover landing (guided in Cadet).

### Meeting the Caller

**[CINE]** Inside the tower, at the top, beside a great glowing crystal: **the CALLER**, small (about Luke's size, in spirit at least), wrapped in a scarf, **singing the SOS** in a hoarse, worn-out voice, over and over. They haven't stopped in a very long time.

They turn, see five people and a dragon at the window… and **stop singing**. The silence is huge.

The Caller sways, and their eyes start to droop. Then Luna squeals "HI!", and the Caller blinks wide awake. **The family's noise is holding the Quiet back now.** For the first time in ages, the Caller can rest their voice.

> CALLER (voice cracking, through the Core's translation): "…Someone came?"
>
> PAUL: "We heard you."
>
> CALLER (looking at Luna and Lyla): "You're… small."
>
> LUKE: "We're five! Well — I'm five. They're three."
>
> CALLER: (a cracked laugh, then tears, then more laughing)

**[MUSIC]** **The Caller's theme**: a lone, hoarse whistle singing the SOS. It will gain instruments as worlds wake.

### What happened

**[CINE]** The Caller explains, with the Core translating in short sentences and the crystal projecting pictures. There's no reading, and the pictures carry it all:
- **"Our worlds run on song."** The star-dragons sing lanes between the worlds, and ships ride them like currents. The music keeps everything bright and moving.
- **"Where I'm from, everybody travels."** Pictures of Viera: a planet ringed with ships, and people always leaving. *"Everybody except me. I'm not old enough yet."*
- **"Then came the Quiet."** Color drained, songs stopped, and everyone fell into a deep, glowing sleep. That includes the star-dragons, and the Caller's own family, somewhere on Viera.
- **"Anyone here falls asleep. Even me, if I stop singing."** That's why the Caller never stopped.
- **"So the shipwrights built a dragon like theirs,"** from their shed scales, the living material. "And sent it to **anyone who could still hear.**" Not to anyone in particular, just *anyone*.
- **"Please. Wake the dragons. If they sing again, the lanes light up, and the song comes back."**

> LYLA (pointing at the family's dragon, then at a picture of a sleeping star-dragon): "Same!"
>
> CALLER: "Yours is made from theirs. They're family."

### The star map and the lane books

**[CINE]** The crystal shows the **star map**: worlds strung together by lanes, every lane dark except one, glowing faintly toward a small moon. At the far end of all of them sits one dark world.

> CALLER: "That's Viera. Home. Every lane goes there in the end." *(pointing at the one glowing lane)* "And that one's the only way that's still open."

The Caller digs in a drawer and comes back with **five small books**, empty.

> CALLER: "Lane books. Every traveler has one. You get a mark for every world you reach." *(stamping the first page of each)* "That's your home's mark. You've already been somewhere!"
>
> LUKE: "What's in yours?"
>
> CALLER (showing it, empty): "…Nothing yet."

**[STATE]** `caller_met = true`, `lane_books = true`, `lane_market_lit = true`. The objective is now **follow the lit lane and wake the star-dragons**, one world at a time.

### The complaint

> NEIGHBOR (stepping forward with her clipboard): "Excuse me. Are you in charge here?"
>
> CALLER: "…I'm the only one awake?"
>
> NEIGHBOR: "Then I'd like to file a complaint."
>
> CALLER (to the Core): "What is a complaint?"
>
> NEIGHBOR: "It's — when something is bothering you, and you tell someone, so it can be fixed."
>
> CALLER (thinking): "…So, a song about something you don't like?"
>
> NEIGHBOR (pause): "…Yes. Actually. That's exactly what it is."

She puts the clipboard down. It's the first crack in her armor.

### The bedtime story (Hush seed)

**[CINE]** That night, in the tower. The kids are curled up on blankets, and the Caller finally rests their voice while the family hums the SOS for them in turns (**[PLAY, optional]**: the player can hum along by tapping on the beat).

The Caller tells a bedtime story, an old one, with pictures in the crystal:

> CALLER: "A long time ago, every song had little spaces in it. Rests. Quiet places to catch your breath. *The Hush keeps the rests,* the grown-ups used to say. And when the dragons got tired, they'd sleep in the Hush's quiet, and wake up ready to sing again."
>
> LUKE (sleepy): "What happened to the Hush?"
>
> CALLER: "…I don't know. It's just a story."

Lyla's visor, half-closed, records it. *Ding.* It goes into the archive and can be replayed.

**[STATE]** `story_hush_keeps_rests = true`

### The first voyage

**[CINE]** Morning. The family packs up. The Caller stands at the lighthouse door, watching, and doesn't sing. They notice they don't need to: the family's noise is enough to keep them awake.

> CALLER (very quietly): "…Can I come?"
>
> MARIA: "Of course you can."
>
> NEIGHBOR (from the storage bay, patting the spot beside her chair): "There's room back here. Bring a blanket. It's *loud* in front."

The Caller climbs into the storage bay. It's their first voyage.

**[STATE]** `caller_aboard = true` → **[SAVE cp_a2_beacon]**

**Next:** [Waking the Worlds](A2-03_WAKING_THE_WORLDS.md).
