# Script — A2-07 to A2-10: The Silent Center and the Home Note

**Status:** PROPOSED draft, following [Act II](../ACT_II_ANSWER_THE_CALL.md) Movements 4–5 (Listen → Shelter → Home Note) and the [music doc](../MUSIC_EMPATHY_AND_PACING.md). Conventions follow [First Contact](A1-00_FIRST_CONTACT.md).  
**Unlocks when:** four dragons are awake ([Waking the Worlds](A2-03_WAKING_THE_WORLDS.md)).

**Rules for this whole script:**
- **The family stays together** throughout. No child is alone, and no parent is absent.
- **Sad, not scary.** The low point is lonely and tired, never frightening.
- **No failure, no game over, no resets.** Feedback is responsive, never punitive.
- **The most emotional moment (A2-10) is the least demanding to play.**
- **Nothing attacks the Hush. Ever.**

---

## A2-07 — The Silent Center (the low point)

**[PLAY]** Flight toward the center with the four woken dragons in formation. **[MUSIC]** The full song, brave and bright.

As they get closer, the formation **thins**. One by one the star-dragons slow, then hang back at the edge of the grey: they can't go further without falling asleep again.

> CALLER (radio, fading): "This is as far as we can go. Only you can—"

The radio goes to static, then silence.

**[CINE]** The color drains away. The music's layers **drop out one by one**: the drums, the choir, the strings. Then **the dragon itself goes quiet.**

It isn't a breakdown. Its living material is **falling asleep**, like the dragons it was made from. It glides down gently onto a dark, smooth plain, curls up, and **closes its eyes**.

> LUKE: "…Dragon?"
>
> LUNA: "Wake up. Wake UP."

Nothing. Its chest still glows faintly. It's breathing, slowly.

**[PLAY]** Maria's **Healing Pulse** on the dragon. It keeps breathing softly, but it doesn't wake.

> MARIA (quietly): "I can keep it safe. I can't wake it up by myself."

**[CINE]** The family climbs down onto the dark plain. Their suits' glows are dim and their footsteps are muffled. **It's very far from home.** The toddlers are tired. Lyla sits down.

> LYLA: "I want to go home."
>
> LUNA: (crying a little)

**[PLAY]** A **short walk**, about a minute. Movement eases and slows, the music is almost nothing, and **control never stops**. The family stays in a close cluster around whoever is controlled, and nobody can wander off.

**[CINE]** Maria stops. She kneels and gathers everyone close.

> MARIA: "Everybody stay together."

*It's her line from the first night in the backyard.*

> MARIA: "Lyla. Do you still have home in there?"

**[PLAY]** **Lyla's Holo Replay**, from the archive. The prompt says "Lyla, play something from home." The player picks a card, or it picks one automatically, and there are no wrong choices:
- an install-party moment (the baker neighbor, the Builder Bugs' dance);
- the street cheering at the first flight;
- the family theme from the living room.

**[CINE]** The recording plays. It's **the only real music in the scene.** **[MUSIC]** The family theme, small and tinny from Lyla's visor, then **the family's instruments rejoin one at a time**: Paul's brass, Maria's cello, Luke's strings, Luna's marimba, Lyla's celesta. **Color pushes back** around them in a small warm circle.

> PAUL: "That's us."
>
> LUKE: "We're loud enough."

**[PLAY]** Walk forward **together, inside the circle**. It moves with them. Ahead, in the dark, something huge is softly glowing.

*Design note:* if the BOOKMARKED Line Leader system exists by then, this walk is its natural home: one leader, everyone close. It must not need split parties. Otherwise it's a guided walk.

**[SAVE cp_a2_low_point]**

---

## A2-08 — Listen (understanding)

**[CINE]** At the center, a vast, soft, cloud-like shape is curled around something enormous and sleeping: **the Elder Dragon**. The shape is **the Hush**. It has its "hands" pressed over its "ears." It isn't attacking. It's **hiding**. **[MUSIC]** A very low, breathy drone, felt more than heard (optional controller rumble).

> LUKE: "It's the shy cloud. From the first day."
>
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
- the Market Moon's roar, the spires' chord, the forge's hammering, the bells;
- **the dragons the family woke**, all of it, far too loud, overlapping, with no space anywhere.

It peaks, and then it **cuts to the Hush's silence.**

**[MUSIC]** The loudest moment in the game, then total silence. **This is the reserved stinger.**

> LYLA (taking off her visor, eyes wide): "…It's *too much*."

**The Caller's story returns.** Lyla's archive automatically plays the bedtime story card: *"The Hush keeps the rests…"*

> PAUL (putting it together): "It *is* the rest. The quiet between the notes. And the song stopped leaving room for it."
>
> LUKE (very small): "…And we woke up more dragons."

### The neighbor steps forward

**[CINE]** NEIGHBOR has walked all the way from the dragon with the family, saying nothing. Now she steps out of the warm circle into the grey, slowly, and **sits down next to the Hush.**

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
| *Sit down* | It shifts, making room |
| *Wave hello* | One "hand" lifts slightly off one "ear" |
| *Hum softly* | Its drone wobbles, like a hum back |
| *Give it space* | It peeks out at them |

The loud option already happened, and that was the lesson.

**[STATE]** `hush_listened = true` → **[SAVE cp_a2_listen]**

---

## A2-09 — Shelter (protection)

**[CINE]** The Hush **uncovers one ear**, and the noise **rushes in**. Bright, noisy **echoes** of every song stream in from every world like a crowd all talking at once: flapping, ringing, bouncing shapes of sound. They pour toward the Hush, and it starts to curl back up.

> MARIA: "It's too much again. We have to help it."
>
> LUKE: "Help it how?"
>
> PAUL: "Keep the noise off it. Just for a bit. Long enough to breathe."

**[PLAY]** **Shelter**, the final use of the on-foot system. **Every suit and every alley-oop is used to protect.** Nothing is attacked, and the echoes are bundles of noise that get **tucked away**.

| Who | How they shelter |
| --- | --- |
| **Maria** | The Family Shield over the Hush, a purple dome that softens the noise |
| **Luna** | Goo **muffles** echoes. They hit it, go *blorp*, and fall silent. It's wonderful soundproofing. |
| **Luke** | Tethers high echoes out of the air, Web Dive bundling several |
| **Paul** | Braces a wall: Heavy Lift on drifting rocks to build a sound barrier |
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

**[STATE]** `hush_sheltered = true` → **[SAVE cp_a2_shelter]**

---

## A2-10 — The Home Note (the song)

**[CINE]** Calm. The family's dragon is curled nearby, and so is the Elder Dragon. The Hush is uncurled, listening. **[MUSIC]** Silence, but a warm silence: the rest.

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

> CALLER (radio, crackling back into range): "That's where it always stops. We never knew the end."
>
> LUKE: "Because it's *ours*."

**[PLAY]** **Sing the home note.** One tap from the player. Every family member, and the neighbor too, sings the same note together: **home**. The tonic, the resolution.
- Prompt: "Let's finish it. Together."
- **[HINT 3]** It happens on its own after a moment. This beat must never be missable.

**[CINE]** **The melody resolves.** **[MUSIC]** All seven notes, the rests, and **home**. The family's chord from Five Together finally **resolves** for the first time in the game.

### The payoff

- **Their dragon wakes first,** and it's **the loudest**: a huge joyful roar. Then it stops, takes a breath, and **rests**. It's learned.
- **The Elder Dragon wakes.** It lifts its enormous head, looks at the family's small dragon, and lowers its head to it.
- **Color floods outward** from the center through every world. The Market Moon, the Hatchery, the Spires and the Forge all light up, seen as distant flashes.
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

**[STATE]** `home_note_sung = true`, `quiet_lifted = true`, `elder_dragon_awake = true` → **[SAVE cp_a2_home_note]**

**Next:** [Encore and Home](A2-11_ENCORE_AND_HOME.md).
