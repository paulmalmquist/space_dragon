# Script — A3-04 to A3-08: Landfall, Farport and the Rest Garden

**Status:** PROPOSED draft, following [Act III](../ACT_III_THE_ROAD_TO_VIERA.md) Movements 3–4 (Landfall, Farport, then Listen → Shelter → Home Note) and the [music doc](../MUSIC_EMPATHY_AND_PACING.md). Conventions follow [First Contact](A1-00_FIRST_CONTACT.md).  
**Moved from:** `A2-07_THE_SILENT_CENTER.md` (October 30, 2026). The beats are the same; the setting is now Farport on planet Viera, the Caller is present in person, and the Elder Dragon is the Lanemother.  
**Resumes from:** the Battle of the Mooring Ring (A3-03, not yet scripted).

**Rules for this whole script:**
- **The family stays together** throughout. No child is alone, and no parent is absent.
- **Sad, not scary.** The low point is lonely and tired, never frightening.
- **No failure, no game over, no resets.** Feedback is responsive, never punitive.
- **The most emotional moment (A3-08) is the least demanding to play.**
- **Nothing attacks the Hush. Ever.**

---

## A3-04 — Landfall (the low point)

**[PLAY]** Flight down from the Mooring Ring toward Farport, with the four woken dragons in formation. **[MUSIC]** The full song, brave and bright, but tired after the battle.

As they descend, the formation **thins**. One by one the star-dragons slow, then hang back at the edge of the grey: this deep in the Quiet they would fall asleep again.

> CALLER (from the storage bay, yawning): "They can't come any closer. It's thickest here. It's… home."

**[CINE]** The color drains away. The music's layers **drop out one by one**: the drums, the choir, the strings. Then **the dragon itself goes quiet.**

It isn't a breakdown. Its living material is **falling asleep**, like the dragons it was made from. It glides down gently onto a wide landing field between rows of moored, sleeping ships, curls up, and **closes its eyes**.

> LUKE: "…Dragon?"
>
> LUNA: "Wake up. Wake UP."

Nothing. Its chest still glows faintly. It's breathing, slowly.

**[PLAY]** Maria's **Healing Pulse** on the dragon. It keeps breathing softly, but it doesn't wake.

> MARIA (quietly): "I can keep it safe. I can't wake it up by myself."

**[CINE]** The family climbs down. Their suits' glows are dim and their footsteps are muffled. Behind them, the Caller climbs out of the storage bay holding the neighbor's hand, eyes drooping. **It's very far from home.** The toddlers are tired. Lyla sits down.

> LYLA: "I want to go home."
>
> LUNA: (crying a little)
>
> CALLER (sitting down too, very sleepy): "This *is* home. It's just… so quiet."

**[PLAY]** A **short walk**, about a minute. Movement eases and slows, the music is almost nothing, and **control never stops**. The family stays in a close cluster around whoever is controlled, and nobody can wander off.

**[CINE]** Maria stops. She kneels and gathers everyone close, the Caller and the neighbor too.

> MARIA: "Everybody stay together."

*It's her line from the first night in the backyard.*

> MARIA: "Lyla. Do you still have home in there?"

**[PLAY]** **Lyla's Holo Replay**, from the archive. The prompt says "Lyla, play something from home." The player picks a card, or it picks one automatically, and there are no wrong choices:
- an install-party moment (the baker neighbor, the Builder Bugs' dance);
- the street cheering at the first flight;
- the family theme from the living room.

**[CINE]** The recording plays. It's **the only real music in the scene.** **[MUSIC]** The family theme, small and tinny from Lyla's visor, then **the family's instruments rejoin one at a time**: Paul's brass, Maria's cello, Luke's strings, Luna's marimba, Lyla's celesta. **Color pushes back** around them in a small warm circle. The Caller's eyes open wide.

> PAUL: "That's us."
>
> LUKE: "We're loud enough."
>
> CALLER (awake again, amazed): "Your home has a *sound*."

**[STATE]** `warm_circle = true`. The circle moves with the family and grows as Farport wakes. The Caller stays awake inside it. **[SAVE cp_a3_landfall]**

---

## A3-05 — Farport on foot

**[PLAY]** Walk **together, inside the circle**, through Farport in a fixed order. Each district restored by sound widens the circle and wakes a few locals.

*Design note:* if the BOOKMARKED Line Leader system exists by then, this walk is its natural home: one leader, everyone close. It must not need split parties. Otherwise it's a guided walk with explorable edges.

### Outfitters' Row

Rows of workshops, each with an outfitter asleep at the bench mid-fitting. The family's noise wakes them one at a time, and each one blinks, sees the suits, and gets to work.

> OUTFITTER (placeholder, waking): "…Fair lanes. Who made *these*? They're half asleep. Hold still."

- **[PLAY]** One **Farport upgrade** per suit, fitted on the spot, enough to go deeper into the Quiet. Draft upgrades are in the [overview](../ACTS_II_III_THE_ROAD_TO_VIERA.md) § Suits to powers. One extra slot per suit stays open.
- **[PLAY] Learning: Pattern Fit** (`pattern_repeat`, proposed ID). Repeat a short color-and-shape pattern to tune each upgrade. Untimed, with the usual hint ladder, and assisted completion fits the same upgrade.
- **[CINE]** Back on the landing field, the Dragonwrights fit **Scale Armor** to the sleeping dragon. It sighs in its sleep.

**[STATE]** `farport_upgrades = true` → **[SAVE cp_a3_outfitters]**

### The Departure Halls

A giant terminal. Travelers are asleep mid-goodbye, arms half raised to wave. Suitcases float a few inches off the floor. The big departure board flickers, stuck.

The Caller walks slowly down the rows, looking at every face.

> CALLER (quietly): "Mine would be here somewhere. They were always leaving."

- **[PLAY] Learning: The Big Board** (`letter_matching`, matching only). The way to the Roosts is gate "R." The board shows each gate as a letter beside a picture; the player finds the gate whose letter matches the one the Core shows. Assisted completion opens the same gate.
- The family doesn't find the Caller's family here. Not yet.

### The Roosts

Star-dragon nests, empty and cold, spiraling down into a sunken garden. At the bottom, in the dark, something huge is softly glowing.

> LUKE: "It's the shy cloud. From the first day."

**[SAVE cp_a3_roosts]**

---

## A3-06 — Listen (understanding)

**[CINE]** **The Rest Garden.** Overgrown benches, a dry fountain, paths nobody has walked in years. At its heart, a vast, soft, cloud-like shape is curled around something enormous and sleeping: **the Lanemother**. The shape is **the Hush**. It has its "hands" pressed over its "ears." It isn't attacking. It's **hiding**. **[MUSIC]** A very low, breathy drone, felt more than heard (optional controller rumble).

> LYLA: "It's the *sad* one."

**[PLAY]** The **habit**. The family does what has worked everywhere: **they get loud**. The game offers the Roar prompt and shouting, as it always has.
- If the player does it, the Hush **curls tighter**, the Quiet thickens, and the warm circle **shrinks a little**.
- **Nothing is lost.** The circle can't vanish, and it grows back.
- If the player doesn't, a family member tries it anyway: LUKE: "HELLOOO—", and the Hush flinches.

> PAUL (quietly): "…Stop. Stop. It's making it worse."
>
> LUKE: "But loud is *good* here."
>
> MARIA: "Not for everybody."

### Lyla's Listen

**[PLAY]** **Lyla's Scan** on the Hush. The prompt says "Lyla, can you hear what it hears?"

**[CINE]** For a few seconds, **the player hears the universe through the Hush's ears**:
- every song from every world at once;
- every traveler's engine on every lane, coming and going, never stopping;
- the Market Moon's roar, the spires' chord, the forge's hammering, the bells;
- **the dragons the family woke**, all of it, far too loud, overlapping, with no space anywhere.

It peaks, and then it **cuts to the Hush's silence.**

**[MUSIC]** The loudest moment in the game, then total silence. **This is the reserved stinger.**

> LYLA (taking off her visor, eyes wide): "…It's *too much*."

**The Caller's story returns.** Lyla's archive automatically plays the bedtime story card: *"The Hush keeps the rests…"*

> PAUL (putting it together): "It *is* the rest. The quiet between the notes. And the song stopped leaving room for it."
>
> CALLER (looking around the empty garden): "We never stopped. Everybody kept going. Nobody came home. Nobody sat *here*."
>
> LUKE (very small): "…And we woke up more dragons."

### The neighbor steps forward

**[CINE]** NEIGHBOR has walked all the way from the dragon with the family, saying nothing, still holding the Caller's hand. Now she lets go, steps out of the warm circle into the grey, slowly, and **sits down on an old bench next to the Hush.**

> NEIGHBOR: "I know that feeling."
>
> *(beat)*
>
> NEIGHBOR: "Sometimes everything is too loud. And nobody asks if you're okay."

**[MUSIC]** **Her theme, the waltz, very slow and soft.** The Hush's low drone **harmonizes** with it. It's the first sign that it's listening.

> LUNA (whispering): "It likes her song."

### How to say hello

**[PLAY]** **Gesture choices.** Pick how the family approaches, using picture icons with spoken labels. **Every choice is kind, and every choice works.** Each gets its own small reaction from the Hush.

| Gesture | Hush reaction |
| --- | --- |
| *Sit down* | It shifts, making room on the bench |
| *Wave hello* | One "hand" lifts slightly off one "ear" |
| *Hum softly* | Its drone wobbles, like a hum back |
| *Give it space* | It peeks out at them |

The loud option already happened, and that was the lesson.

**[STATE]** `hush_listened = true` → **[SAVE cp_a3_listen]**

---

## A3-07 — Shelter (protection)

**[CINE]** The Hush **uncovers one ear**, and the noise **rushes in**. Bright, noisy **echoes** of every song and every engine stream down into the garden like a crowd all talking at once: flapping, ringing, bouncing shapes of sound. They pour toward the Hush, and it starts to curl back up.

> MARIA: "It's too much again. We have to help it."
>
> LUKE: "Help it how?"
>
> PAUL: "Keep the noise off it. Just for a bit. Long enough to breathe."

**[PLAY]** **Shelter**, the final big use of the on-foot system before powers. **Every suit, every Farport upgrade and every alley-oop is used to protect.** Nothing is attacked, and the echoes are bundles of noise that get **tucked away**.

| Who | How they shelter |
| --- | --- |
| **Maria** | The Family Shield over the Hush, a purple dome that softens the noise (Shield Sails make it garden-sized) |
| **Luna** | Goo **muffles** echoes. They hit it, go *blorp*, and fall silent. It's wonderful soundproofing. |
| **Luke** | Tethers high echoes out of the air, Web Dive bundling several |
| **Paul** | Braces a wall: Heavy Lift on fallen benches and planters to build a sound barrier |
| **Lyla** | Records each echo into the archive, "putting it away for later." *Ding*, and it's gone. |
| **Alley-oops** | Reach the high-flying echoes. For example, Bubble Bounce Luke into a Web Dive on a cluster, or a Holo Pad launch for Luna's Goo Bomb muffling a whole swarm. |

- **Each echo tucked away** lets a little color back, and the Hush **uncurls more**.
- **Failure moves forward:** an echo that reaches the Hush makes it flinch and thins the music. **Nothing resets, nobody is bonked**, and echoes never target the family.
- **The phase ends when the Hush is calm,** not when a counter is perfect. On easier assist levels, fewer echoes come.
- **Five Together** is available: the chain alley-oop ends in a **Shield Drop** instead of a Meteor Slam, a giant dome of quiet.
- **[MUSIC]** Building, warm and protective. The family's instruments play softly, with no percussion.

**[CINE]** The last echo, tucked away. The Hush **lowers both hands.** It looks at them for the first time: soft, enormous, with two pale gentle lights for eyes.

> LYLA: "Hi."
>
> THE HUSH: *(a sound too low to hear. Lyla's visor shows the slow ripple. Lyla smiles.)*
>
> LYLA: "It said hi."

**[STATE]** `hush_sheltered = true` → **[SAVE cp_a3_shelter]**

---

## A3-08 — The Home Note (the song)

**[CINE]** Calm. The Lanemother sleeps on, curled under the Hush. Far above, on the landing field, the family's dragon sleeps too. **[MUSIC]** Silence, but a warm silence: the rest.

> MARIA: "The song needs room. A quiet place in it."
>
> PAUL: "So let's play it gently. With room."

**[PLAY]** **Each family member plays one soft note.**
- The choices are each family member's instrument, showing a few notes as glowing shapes. **All of them harmonize**, so **there are no wrong notes.**
- One tap per person, in any order, or **one tap for everyone** at the highest assist level. **Untimed.**
- After each note there's **a rest**, a beat of quiet, and the Hush's drone fills it.

**Feedback, never failure:** button-mashing or shouting makes the Hush curl slightly and the music thin. It reopens as soon as things calm down.

**[CINE]** Then the SOS plays **one last time**, gently, all seven notes, **with rests between them**, ending on its question.

*sol … mi … la … sol … fa … re … ti …*

It hangs there, the question.

> CALLER: "That's where it always stops. I sang it a thousand times. We never knew the end."
>
> LUKE: "Because it's *ours*."

**[PLAY]** **Sing the home note.** One tap from the player. Every family member, the Caller and the neighbor too, sings the same note together: **home**. The tonic, the resolution.
- Prompt: "Let's finish it. Together."
- **[HINT 3]** It happens on its own after a moment. This beat must never be missable.

**[CINE]** **The melody resolves.** **[MUSIC]** All seven notes, the rests, and **home**. Then every part the worlds gave along the way joins in, one after another: the Market Moon's rhythm, the Hatchery's harmony, the Spires' lead, the Forge's accents, the Waystation band's bass and the Drift convoy's countermelody (SD-020). The answer is complete. The family's chord from Five Together finally **resolves** for the first time in the game.

### The payoff

- **Up on the landing field, their dragon wakes first,** and it's **the loudest**: a huge joyful roar that rolls down into the garden. Then it stops, takes a breath, and **rests**. It's learned. It glides down into the garden and lands beside them.
- **The Lanemother wakes.** She lifts her enormous head, looks at the family's small dragon, and lowers her head to it.
- **Color floods outward** from the garden, across Farport, up through the Mooring Ring and out along every lane. The Market Moon, the Hatchery, the Spires and the Forge flash in the distant sky.
- **The woken dragons answer in chorus**, and now **the song has rests in it**.
- **The Hush settles** into the pauses, a soft, quiet place the music flows *around*. It isn't defeated or destroyed. It's **given back its place.** It rests a "hand" on the neighbor's shoulder for a moment.

> NEIGHBOR (not looking at anyone, eyes wet): "…Well. That's very nice."
>
> LUNA: "You *helped*."
>
> NEIGHBOR: "I sat down. Anyone can sit down."
>
> MARIA: "Not everyone does."

> LYLA: "Why us?"
>
> PAUL: "Nobody chose us, Lyla. We heard them. And we chose to help."

**[STATE]** `home_note_sung = true`, `quiet_lifted = true`, `lanemother_awake = true` → **[SAVE cp_a3_home_note]**

**Next:** [The Final Landing](A3-09_THE_FINAL_LANDING.md).
