# Script — A2-03 to A2-07: Waking the Worlds and the Lane to Viera

**Status:** PROPOSED draft, following [Act II](../ACT_II_ANSWER_THE_CALL.md) Movements 3–4, the [music doc](../MUSIC_EMPATHY_AND_PACING.md) §3 (introducing the Hush) and §5 (variety), and the [combat system](../../gameplay/COMBAT_SYSTEM.md) §6–7. Conventions follow [First Contact](A1-00_FIRST_CONTACT.md).  
**Order:** linearity is confirmed by [owner decision](../../decisions/2026-10-29-three-acts-linear-and-viera.md); Market Moon → Hatchery → Climbing Spires → Forge Ring is the proposed named route. [The current campaign](../CAMPAIGN_STRUCTURE.md) requires five missions per planet and at most three family members per active mission. This older set-piece script needs expansion/restaging into those slots before its next-world unlocks are implemented. Waking-count beats remain proposal material, not evidence that all five missions on a planet are written.
**Lane levels:** the flight between worlds is drafted in the [Acts II & III overview](../ACTS_II_III_THE_ROAD_TO_VIERA.md) § Flight between planets. Their scripts are not written yet.

## The shape of every world (same shape, new surprise)

1. **The lane in.** A flight level along the newly lit song-lane: the Gravel Run, the Fog, the hatchling escort and Shardstorm, or the Sweeper Picket.
2. **Arrival.** Grey and muffled. **Sound paints color**, and the first big noise restores the landing zone. Each restored zone wakes a few locals.
3. **The problem.** The world's sleeping community and its **sleeping star-dragon**, often with the Sweeper's Tidy-bots or drones making it worse.
4. **The set piece**, featuring one or two family members.
5. **Learning.** In most worlds, at a safe standing point.
6. **The encounter.** On foot or in the air.
7. **Waking the dragon.** It sheds a **scale gift** for the featured family members, and the world's lane-book stamp goes in.
8. **The Hush seed** for that world.
9. **Camp aboard the dragon** for the waking beat. The Caller and the neighbor ride in the storage bay, so the beat happens wherever the family camps. Then the next lane lights up.

## Waking beats (by number of dragons awake)

| Awake | The Caller's theme gains | The Core teaches (archive glyph card) | The neighbor's clipboard | The Quiet |
| --- | --- | --- | --- | --- |
| **1** | Soft strings under the whistle | Glyph for **"hello"** | NEIGHBOR writes "Too loud." Luke reads it to her, wrongly, on purpose. | Lantern Rock's light grows behind them, and the lane to the Hatchery lights |
| **2** | + a hand drum | Glyph for **"friend"** | "Still too loud. But colorful." | Color reaches the space between the worlds |
| **3** | + a choir hum | Glyph for **"home"**. The Caller traces it with a finger. | She stops writing and just watches. | Viera, at the end of every lane, shows on the star map as a dark spot |
| **4** | + full orchestra; the Caller sings with backing for the first time | Glyph for **"rest"**. The Core: "This one… is old." | She leaves the clipboard on the Forge's windowsill. | **The last lane lights up, to Viera** → [The Lane to Viera](#a2-07--the-lane-to-viera-act-ii-ending) |

**Glyph cards** are optional `letter_matching` practice. The Core shows each sender glyph beside a familiar letter. Matching them is recorded as matching only, never as letter-name recognition ([learning rules](../../learning/LEARNING_RULES.md)).

**Wingmen.** Every woken dragon joins the family's flights in **formation** afterward ("Break left!"). At four awake, the family flies with a whole flock.

---

## A2-03 — The Market Moon (Paul and Luna)

| | |
| --- | --- |
| Feel | Noisy, joyful chaos, once it's restored |
| Set piece | Righting the giant stalls, a goo-slide crate rush, a cart race through the bazaar |
| Learning | `a2w1_stall_glyphs_v1`, `letter_matching` |
| Encounter | **Hush-moths**, plus the neighbor's **leftover autopilot drones** with moths riding them |
| Dragon | **The Market Dragon**, heavy and gold, curled around the central clock tower |

**Arrival.** A small moon covered in a bazaar frozen mid-trade. Awnings droop, merchants sleep standing up mid-haggle with their fingers raised, and the whole moon is **spinning slowly off course**.

**[PLAY] The set piece:**
- **Paul's Heavy Lift** rights the toppled stalls. Each one that's upright again rings a bell, and that sound restores color in a burst.
- **Luna's Slip 'n Slide** sends crates of spilled fruit sliding back into their stalls.
- **Optional alley-oop:** Pink Cannonball onto a stuck awning pops it back up.

**[PLAY] Learning: stall glyphs** (`letter_matching`). Each stall has a glyph sign. The Core shows a glyph-and-letter card, and the player finds the stall with the **identical** glyph to restart its music box. The hint ladder applies, and assisted completion gives the same result.

**[PLAY] Encounter.** **Hush-moths** (Swarm) dim the colors back down. Noise scatters them, so Goo Bomb splashes, Meteor Slam bells and shouting all work. Then **the neighbor's drones** zip in, still on autopilot from Act I, with moths riding them like ponies. Behind them, **Tidy-bots** from the Sweeper trundle between the stalls, bagging sleeping merchants' wares as "debris." A Splat or a slip sends them spinning, and they drop what they took.

> NEIGHBOR (over the radio, mortified): "Those are MINE. I am so sorry. Again."

The **ex-henchman robot iguana** scampers up onto a drone and switches it off by hand: its first act as a helper. It looks back at the family, very proud of itself. *Beep.*

**[PLAY] Race.** A cart race through the restored bazaar to ring the central clock tower's bell. Clear start and finish, steering assistance, no reading.

**Waking.** The bell rings, and the whole bazaar roars back to life in a wave of noise and color. The merchants finish their haggling mid-sentence. **The Market Dragon** uncurls from the tower, shakes off grey dust, and bellows. **[MUSIC]** Brass and drums.

**Neighbor gag:** she immediately starts haggling with a merchant over a hat. She wins.

**Hush seed.** As the celebration peaks, Lyla's visor catches it: far away, at the edge of the sky, **the Hush flinches**, curling up as if the noise hurt.

> LYLA (quietly): "Why it sad?"

Nobody else sees.

**[STATE]** `dragon_market_awake = true` → waking beat (by count) → **[SAVE cp_a2_w_market]**

---

## A2-04 — The Hatchery Nebula (Maria and Lyla)

| | |
| --- | --- |
| Feel | **Quiet and tender.** The soundtrack is a lullaby, and loud isn't the point here. |
| Set piece | Warming eggs and hatching them with their heartbeat-songs |
| Learning | `a2w2_count_hatchlings_v1`, `counting_objects` |
| Encounter | A few gentle Hush-moths |
| Sortie | **Hatchling escort** |
| Dragon | **The Hatchery Dragon**, a mother dragon asleep around her nest |
| Emotional midpoint | **The passenger finds its family** |

**Arrival.** A soft pink-and-violet nebula, faded to grey. Floating nests hold big glowing eggs, **going cold**. The keepers are asleep on their nests. **[MUSIC]** Maria's cello alone, the softest cue in the game.

> MARIA: "Shh. Everybody — gentle voices here."

*Variety rule:* this world **inverts** "loud is good." It's quiet care, which foreshadows the climax.

**[PLAY] The set piece:**
- **Maria's Healing Pulse** warms each egg, and its glow returns.
- **Lyla's Scan** records each egg's **faint heartbeat-song**, and her **Holo Replay** plays it back louder. The egg wobbles… and *hatches*. Each hatchling sounds its own note.
- **[PLAY] Learning: count the hatchlings** (`counting_objects`). "How many hatchlings in this nest? Tap each one!" Each tap gets a counting chime. The quantities are small (1–5). There's no wrong answer that matters: a miscount just replays the count with the hatchlings glowing one by one.

**The reunion (emotional midpoint).** At the biggest nest, the passenger, in Luna's arms the whole time, **goes still**, then *sings*. From the nest, **a small group of creatures just like it** sing back.

**[CINE]** The passenger leaps from Luna's arms into the nest. It's a tumble of happy chirps. It comes back to Luna once, nuzzles her, and returns to its family. **[MUSIC]** The SOS played as a lullaby, with the passenger's family humming it in harmony.

> LUNA (trying not to cry): "…It's home."
>
> MARIA (hugging her): "You took such good care of it. That's why it got home."

**[STATE]** `passenger_reunited = true`. *(It stays here. It returns with the hatchlings for the Great Launch in [Act III](A3-09_THE_FINAL_LANDING.md), with a keepsake.)*

**Neighbor gag:** NEIGHBOR is caught **knitting a tiny scarf** for a cold egg. She denies it furiously. The egg is wearing the scarf.

**[PLAY] Sortie: hatchling escort.** The hatchlings follow the dragon in a little flock to the Hatchery Dragon's nest. Gentle Hush-moths drift in, and then a pair of the Sweeper's **Hooks** dive at the flock, trying to box the hatchlings up as "loose cargo." A barrel roll shakes off any that latch onto the dragon, and the Breath Cannon scatters the rest. Losing a hatchling just means it waits and rejoins, with no failure.

**Waking.** The hatchlings and the family hum together, softly, and **the Hatchery Dragon wakes gently**. It's the only dragon that wakes to a lullaby. She looks at the family's dragon and **nuzzles it** like one of her own.

**Hush seed.** The hatchlings sleep best in one particular patch of the nebula, where the grey is softest.

> MARIA (noticing): "It was keeping them calm. Whatever passed through here."
>
> LYLA (visor): a slow, enormous ripple, far away.

**[STATE]** `dragon_hatchery_awake = true` → waking beat → **[SAVE cp_a2_w_hatchery]**

---

## A2-05 — The Climbing Spires (Luke)

| | |
| --- | --- |
| Feel | Vertical and musical |
| Set piece | Climbing crystal towers and re-striking their resonators |
| Learning | `a2w3_resonator_pattern_v1`, `pattern_repeat` (proposed skill ID) |
| Encounter | **Still Guardian** (Elite). It wakes up friendly. |
| Optional | A **rhythm sortie** through the spires |
| Dragon | **The Spire Dragon**, long and thin, wrapped around the tallest spire |

**Arrival.** A forest of **crystal spires**, each one a giant tuning fork, all humming *out of tune* under the grey. The top of the tallest spire is above the Quiet. Luke looks up.

> LUKE: "Dad. DAD. I'm climbing *that*."
>
> PAUL: "…Yeah. You are."

**[PLAY] The set piece:** Luke's **Spider Climb** up the spires with **Tether Sling** between them. Alley-oops (Rocket Toss, Sling Shield) help the family follow. At each spire's crown is a **resonator**.

**[PLAY] Learning: resonator patterns** (`pattern_repeat`, proposed ID, needs review).
- The resonator plays a short pattern of 2–4 tones, each with its **own shape light**.
- Luke repeats it by tapping the matching shapes. A correct pattern rings the spire **in tune**, and color floods it.
- **Untimed.** Hints: replay the pattern, slow it down, light each next shape, then a joint action.
- Optional on-beat sparkle, never required.

**[PLAY] Encounter: the Still Guardian.**
- A huge crystal guardian sleepwalks across the bridge between two spires, confusedly "defending" it.
- It's slow and telegraphs big arm sweeps.
- Lyla's Sky Scan (via any alley-oop) **Exposes** a muffled "ear" crystal on its head. An alley-oop finisher on it…
- …**wakes it up.** It blinks, chimes an apology, and **kneels to make a bridge** for the family. It's an ally now.

> LUKE: "It was just sleepwalking!"
>
> MARIA: "Like you after a big day."

**Optional rhythm sortie:** fly the dragon through the spires as they ring. Hitting each ring on the beat adds harmony. Never required.

**Waking.** With every spire in tune, the forest plays one enormous chord. **The Spire Dragon** unwinds from the tallest spire and sings back. Now the song can be **heard across worlds**.

**Hush seed.** At the top, where it's quietest, Lyla records **the Hush's sigh**: a sound too low to hear, shown in her visor as a slow ripple that makes the spires shiver.

**The Barge.** From the very top, Luke spots a long line of lights crawling across the dark: the Sweeper's Barge, towing a chain of sleeping ships.

> LUKE: "Dad. Something's taking all the ships."
>
> CALLER (on the radio, very quiet): "…It's the lane-keeper. It's supposed to clear rocks."

> LYLA: "It's… breathing."

**[STATE]** `dragon_spire_awake = true` → waking beat → **[SAVE cp_a2_w_spires]**

---

## A2-06 — The Forge Ring (Paul, then everyone)

| | |
| --- | --- |
| Feel | **Action** |
| Set piece | A five-suit teamwork set piece in the shipyard, then a **strike run** |
| Learning | None graded: a pure-action world, by design |
| Encounter | **Sleepwalking Sentries** (air, automated) |
| Upgrade | **Song-breath** |
| Dragon | **The Forge Dragon**, an old smith-dragon asleep at the great anvil |
| Discovery | **The original blueprints**: older than the family, with five seats drawn in |

**Arrival.** A great ring-shaped shipyard in orbit around a dim star: workshops, cranes and half-built things. **This is where the family's dragon was designed.** The dragon itself recognizes it: it hums and pulls toward the main hangar.

**[PLAY] The set piece: the jammed beacon.** The shipyard's great beacon is jammed, and Hush-moths swarm it.
- Lyla Exposes the jam.
- Luna unsticks the gears.
- Luke tethers the swinging crane arms still.
- Maria shields everyone from the sparks.
- Paul Knit Repairs the beacon's cracked core.

It's the Act II echo of Act I's Five Together, and the order is flexible. **Five Together** is available as the finisher.

**The blueprints (discovery).** In the hangar, Lyla scans the walls. *Ding.* **Old blueprints** of a mechanical dragon appear, *their* dragon. The plans are old, the glow is faded, and **five seats are drawn in.**

> PAUL: "They designed this long before any of us were born."
>
> LUKE: "So it wasn't for *us*?"
>
> CALLER (over the radio): "It was for whoever came."
>
> MARIA: "And we came."

**A second blueprint (Hush seed):** a picture of **the song itself**. One drawing shows music with **gaps** in it, little rests. The newer drawing next to it has **no gaps at all**. Kids see "a song with spaces" and "a song without." Parents get the meaning.

> LYLA (pointing at the gaps): "Why holes?"
>
> CALLER (quietly): "…Those used to be there."

**A third blueprint (Sweeper seed):** on the next wall, a huge, blocky machine with a scoop for a face and the travelers' mark on its side. Lyla scans it. *Ding.*

> LYLA: "Robot."
>
> CALLER (over the radio): "The lane-keeper. They built it here too. It clears rocks out of the lanes so nobody bumps into anything."
>
> PAUL: "Then why is it taking ships?"
>
> CORE (reading the old glyphs on the plan): "Its rule. 'Anything that does not move… is debris.'"
>
> MARIA (slowly): "And right now, nothing moves."

**Song-breath unlocks.** The Forge's anvil retunes the dragon's breath, and it now **sings the SOS motif**, restoring color as it fires.

**[PLAY] Sortie: strike run.** A trench-run-style dive along the ring to disable **Sleepwalking Sentries**, automated interceptors running haywire in the Quiet. Disabled sentries **wake up friendly**, blink, and fly in escort.

**Waking.** **The Forge Dragon** wakes at the anvil, sees the family's dragon, and **taps it once on the head with its tail**, like a proud grandparent.

**[STATE]** `dragon_forge_awake = true`, `ability_song_breath = true` → waking beat (4) → **[SAVE cp_a2_w_forge]**

---

## A2-07 — The Lane to Viera (Act II ending)

| | |
| --- | --- |
| Feel | A quiet turn after the biggest action of the act |
| Reveal | Viera, ringed with sleeping ships, and the Barge heading for it |
| Hearth beat | A night in the Forge's hangar |
| Choice | Keep going |

**[CINE]** With four dragons awake, the Forge's **great beacon** fires. Its beam doesn't stop at the next world. It runs on and on, and the **last lane** lights up, longer than all the others, all the way to the end of the star map. **[MUSIC]** The Caller's theme with full orchestra, then one held, unresolved chord.

The star map zooms in on the end of the lane: **Viera**, dark, ringed by thousands of sleeping ships moored side by side like boats in a harbor. A long line of moving lights crawls toward them: the Barge.

> CALLER (stepping out of the storage bay to look, for a long time): "…That's home."
>
> LUKE: "And the robot's going to tidy it."

**[CINE]** That night, the family camps in the Forge's hangar, under the old blueprints. The kids are wrapped in blankets. The Caller opens their lane book to the first page, which is still empty, and shows Luke.

> CALLER: "You get your first mark when you come home from your first voyage. That's the rule."
>
> LUKE: "So you have to go home."
>
> CALLER: "I *have* to go home."

**[CINE]** Paul sits down with the kids. **[MUSIC]** The family theme on solo guitar.

> PAUL: "We said we'd wake the dragons. We did. Nobody asked us to go any farther."
>
> MARIA: "So it's up to us."
>
> LYLA (already climbing into her seat): "Go."
>
> LUNA: "GO!"

**[PLAY]** The same kind of choice as Act I: a hand on the Core from each family member. There is no "no." Waiting only means a night's sleep, and the morning offers it again.

**[CINE]** Morning. The dragon sits on the Forge's launch rail, the four star-dragons in formation behind it. Ahead, the long lane glows toward a dark world. **Cut.**

**[STATE]** `lane_viera_lit = true`, `act2_complete = true` → **[SAVE cp_act2_complete]**

**Next:** Act III, [The Road to Viera](../ACT_III_THE_ROAD_TO_VIERA.md). The lane and waypoint scripts (A3-00 to A3-03) are not written yet; the next written script is [The Rest Garden](A3-04_THE_REST_GARDEN.md).
