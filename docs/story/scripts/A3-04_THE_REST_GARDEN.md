# Script — A3-04 to A3-08: Landfall, Farport and the Rest Garden

**Status:** PROPOSED draft, following [Act III](../ACT_III_THE_ROAD_TO_VIERA.md) Movements 3–4 (Landfall, Farport, then Listen → Shelter → Heartnote), the [villain arc](../VILLAIN_ARC.md) and the [music doc](../MUSIC_EMPATHY_AND_PACING.md). Conventions follow [First Contact](A1-00_FIRST_CONTACT.md).  
**History:** moved from `A2-07_THE_SILENT_CENTER.md` on October 30, 2026, then revised the same day for Morrow. The neighbor is with Morrow until A3-06. Translation beats were removed later the same day: the game is in English ([language](../LANGUAGE_AND_TRANSLATION.md)).  
**Resumes from:** the Battle of the Mooring Ring (A3-03, not yet scripted). The Sweeper has just been re-tuned.

**Rules for this whole script:**
- **The family stays together** throughout. No child is alone, and no parent is absent.
- **Mythic, not graphic.** The low point is lonely and tired; the Garden is awe-filled and frightening for moments, never cruel, and every frightening beat resolves quickly.
- **No failure, no game over, no resets.** Feedback is responsive, never punitive.
- **The most emotional moment (A3-08) is the least demanding to play.**
- **Nothing attacks the Hush. Ever.** And nothing in this script attacks Morrow either: the family breaks his note with a song.

---

## A3-04 — Landfall (the low point)

**[PLAY]** Flight down from the Mooring Ring toward Farport, with the four woken dragons in formation. The Sweeper, re-tuned, hums politely behind them. **[MUSIC]** The full song, brave and bright, but tired after the battle. Under it, louder than ever, the held note.

As they descend, the formation **thins**. One by one the star-dragons slow, then hang back at the edge of the grey: this deep in the Quiet they would be held again.

> CALLER (from the storage bay, yawning): "They can't come. Too close. Too… loud-quiet. It's… home."
>
> CORE: "Home. Danger. Stay… together." *(It's managing only a word at a time now.)*

**[CINE]** The color drains away. The music's layers **drop out one by one**: the drums, the choir, the strings. Then a voice fills the cockpit, warm and close. It isn't speaking to the family.

> MORROW: "Brother."
>
> *(beat)*
>
> MORROW: "You came home."

**[CINE]** The dragon shudders. It was built in his likeness, from his own kind's scales, and it hears him. Its wingbeats slow. It glides down gently onto a wide landing field between rows of moored, held ships, curls up, and **closes its eyes**. In its chest, the Core's light goes out.

> LUKE: "…Dragon?"
>
> LUNA: "Wake up. Wake UP."

Nothing. Its chest still glows faintly. It's breathing, slowly.

**[PLAY]** Maria's **Healing Pulse** on the dragon. It keeps breathing softly, but it doesn't wake.

> MARIA (quietly): "I can keep it safe. I can't wake it up by myself."

**[CINE]** The family climbs down. Their suits' glows are dim and their footsteps are muffled. The Caller climbs out of the storage bay, eyes drooping, and takes Maria's hand. The robot iguana stays on Luna's shoulder, looking toward the city. **It's very far from home**, and the Bridge is gone. The toddlers are tired. Lyla sits down.

> LYLA: "I want to go home."
>
> LUNA: (crying a little)
>
> LUKE: "We can't. She took it."
>
> CALLER (sitting down too, very sleepy): "This *is* home. Mine. It's just… so quiet."

**[PLAY]** A **short walk**, about a minute. Movement eases and slows, the music is almost nothing, and **control never stops**. The family stays in a close cluster around whoever is controlled, and nobody can wander off.

**[CINE]** Maria stops. She kneels and gathers everyone close, the Caller too.

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
>
> CALLER (standing up, very serious): "Then I'm staying right next to it." *(to Luke)* "*Fair lanes.*"
>
> LUKE: "Fair lanes."

**[STATE]** `warm_circle = true`. The circle moves with the family and grows as Farport wakes. The Caller stays awake inside it. **[SAVE cp_a3_landfall]**

---

## A3-05 — Farport on foot

**[PLAY]** Walk **together, inside the circle**, through Farport in a fixed order. Each district restored by sound widens the circle and wakes a few locals. Every sign is in plain English with a picture beside it, so nobody has to read to find the way.

*Design note:* if the BOOKMARKED Line Leader system exists by then, this walk is its natural home: one leader, everyone close. It must not need split parties. Otherwise it's a guided walk with explorable edges.

### Outfitters' Row

Rows of workshops, each with an outfitter held at the bench mid-fitting. The family's noise wakes them one at a time, and each one blinks, sees the suits, and gets to work.

> OUTFITTER (placeholder, waking, squinting at the suits): "Fair lanes. Who made these? They're half asleep. Hold still."

- **[PLAY]** One **Farport upgrade** per suit, fitted on the spot, enough to go deeper into the Quiet. Draft upgrades are in the [overview](../ACTS_II_III_THE_ROAD_TO_VIERA.md) § Suits to powers. One extra slot per suit stays open.
- **[PLAY] Learning: Pattern Fit** (`pattern_repeat`, proposed ID). Repeat a short color-and-shape pattern to tune each upgrade. Untimed, with the usual hint ladder, and assisted completion fits the same upgrade.
- **[CINE]** Back on the landing field, the Dragonwrights fit **Scale Armor** to the still dragon. It sighs in its sleep. One of them looks at its face for a long time, then at the sky, and doesn't say anything.

**[STATE]** `farport_upgrades = true` → **[SAVE cp_a3_outfitters]**

### The Departure Halls

A giant terminal. Travelers are held mid-goodbye, arms half raised to wave. Children are held mid-hug at the gates. Suitcases float a few inches off the floor. The big departure board flickers, stuck. **[MUSIC]** Nothing but the held note, and very faint, the ghost of a thousand goodbyes.

> PAUL (quietly): "He stopped everyone right as they were leaving."
>
> MARIA: "Because he couldn't stand watching them go."

The Caller walks slowly down the rows, looking at every face.

> CALLER (quietly): "Mine would be here somewhere. They were always leaving."

**[PLAY] Morrow's gaze.** A slow sweep of gold light moves through the halls, the way a lighthouse beam crosses water. The family slips from pillar to pillar, behind suitcases and held crowds, in a hide-and-seek section like the grocery's.
- **Caught means held**, for a moment: the family member freezes mid-step, glowing gold, until another family member reaches them. Maria's touch frees anyone instantly.
- **No failure.** Nothing resets; the gaze just moves on. On easier assist levels it moves slower and pauses longer.
- **[MUSIC]** As the gaze passes, the held note swells; when it moves away, the family's instruments creep back in.

- **[PLAY] Learning: The Big Board.** The way to the Roosts is gate "R." The board shows each gate as a big letter beside a picture and a short word. The girls find the gate whose letter matches the one the Caller shows (`letter_matching`, matching only); Luke can read the gate's word instead (`word_decoding`). Assisted completion opens the same gate.
- The family doesn't find the Caller's family here. Not yet.

### The Roosts

Star-dragon nests, empty and cold, spiraling down into a sunken garden. At the bottom, in the dark, something enormous is glowing gold.

At the garden gate, old words are cut into the stone, worn almost smooth.

> LUKE (reading slowly, with help): "Always… rest… before you go." *(beat)* "Always… come… home."
>
> CALLER (very quietly): "We used to say that. Every trip. We just… stopped."

**[SAVE cp_a3_roosts]**

---

## A3-06 — Listen (understanding)

**[CINE]** **The Rest Garden.** Overgrown benches, a dry fountain, paths nobody has walked in years. At its heart, coiled over a cracked stone seal like a sleeping sun, is **Morrow**. **[MUSIC]** The held note, enormous now, felt in the chest (optional controller rumble).

He is bigger than anything the family has ever seen. Tarnished gold, cracked with black. His eyes are closed. In his throat, something burns like a trapped star: the Heartnote.

Curled against his side, held still and glowing faintly, is a dragon even older and larger: **the Lanemother**. He is holding his own mother.

Pressed beneath his coils, hands over its ears, is a vast, soft, cloud-like shape: **the Hush**. It isn't hiding anymore. It's **trapped**.

And beside his great head, in her lawn chair, perfectly still and perfectly peaceful, with the Bridge in her lap, sits **the neighbor**.

> LUNA (whispering): "...Neighbor?"
>
> LYLA: "It's the *sad* one." *(pointing at the Hush)*

**[PLAY]** The **habit**. The family does what has worked everywhere: **they get loud**. The game offers the Roar prompt and shouting, as it always has.
- If the player does it, Morrow's note simply **swallows** it. The Hush curls tighter, and the warm circle **shrinks a little**.
- **Nothing is lost.** The circle can't vanish, and it grows back.
- If the player doesn't, a family member tries it anyway: LUKE: "HELLOOO—", and the sound just stops in the air, as if it hit a wall.

> PAUL (quietly): "…Stop. It doesn't work on him."
>
> LUKE: "But loud is *good* here."
>
> MARIA: "Not this time."

### Lyla's Listen

**[PLAY]** **Lyla's Scan** on the Hush. The prompt says "Lyla, can you hear what it hears?"

**[CINE]** For a few seconds, **the player hears what the Hush hears**:
- **his note**, endless, pressing down from every side, never stopping, never changing;
- and under it, very small, a breath: the Hush trying to make a rest, a single pause, and the note filling it before it can start. Again. And again.

It peaks, and then Lyla pulls off her visor.

**[MUSIC]** This is the reserved stinger: the held note at full weight, then Lyla's celesta, alone.

> LYLA (eyes wide): "…It can't *breathe*."

**The Old Song returns.** Lyla's archive plays the Caller's story card on its own: *"…She gave him the only thing that can end a held note. She gave him a rest."*

> PAUL (putting it together): "The Hush is the rest. That's what held him before. And he's squashing it."
>
> CALLER (looking around the empty garden): "We stopped resting. Nobody sat here. That's how he got out. We *forgot*."

### The neighbor turns

**[CINE]** The neighbor's eyes open. She's held, but she chose to be, so she can still hear. She's been hearing it the whole time.

> NEIGHBOR (not moving, barely a whisper): "It's crying."
>
> *(beat)*
>
> NEIGHBOR: "It's been crying this whole time."
>
> MARIA (gently): "Are you okay?"

*(It's the question nobody asked her in Act I.)*

> NEIGHBOR: "This was supposed to feel like peace."
>
> *(beat)*
>
> NEIGHBOR: "This isn't quiet. This is just… holding on."

**[CINE]** She **stands up**, out of his hold, slowly, the same way she sat down in it: by choosing. The gold light slides off her like water. Morrow's eyelid **twitches**. **[MUSIC]** Her theme, the waltz, very slow and soft, the first sound in the garden his note doesn't swallow.

She folds her lawn chair, carries it across the grass, and sets it down beside the Hush instead. She sits.

> NEIGHBOR: "I know that feeling."
>
> *(beat)*
>
> NEIGHBOR: "Sometimes everything is too loud. And sometimes it's too *still*. And nobody asks if you're okay."

**[MUSIC]** The Hush's low drone **harmonizes** with her waltz. It's the first sign that it's listening.

> LUNA (whispering): "It likes her song."

### How to say hello

**[PLAY]** **Gesture choices.** Pick how the family approaches the Hush, using picture icons with spoken labels. **Every choice is kind, and every choice works.** Each gets its own small reaction from the Hush.

| Gesture | Hush reaction |
| --- | --- |
| *Sit down* | It shifts, making room on the bench |
| *Wave hello* | One "hand" lifts slightly off one "ear" |
| *Hum softly* | Its drone wobbles, like a hum back |
| *Give it space* | It peeks out at them |

**[STATE]** `hush_listened = true`, `neighbor_returned = true` → **[SAVE cp_a3_listen]**

---

## A3-07 — Shelter (protection)

**[CINE]** The Hush **uncovers one ear**. Morrow's coils tighten. Without opening his eyes, he lets out **shards of his note**: bright, hard, ringing splinters of gold that fly at the Hush to press it back down.

> MARIA: "He's pushing it back under. We have to help it."
>
> LUKE: "Help it how?"
>
> PAUL: "Keep the note off it. Just long enough to breathe."

**[PLAY]** **Shelter**, the biggest use of the on-foot system before powers. **Every suit, every Farport upgrade and every alley-oop is used to protect.** Nothing is attacked, and the shards are bundles of sound that get **tucked away**.

| Who | How they shelter |
| --- | --- |
| **Maria** | The Family Shield over the Hush, a purple dome that softens the note (Shield Sails make it garden-sized) |
| **Luna** | Goo **muffles** shards. They hit it, go *blorp*, and fall silent. It's wonderful soundproofing. |
| **Luke** | Tethers high shards out of the air, Web Dive bundling several |
| **Paul** | Braces a wall: Heavy Lift on fallen benches and planters to build a sound barrier |
| **Lyla** | Records each shard into the archive, "putting it away for later." *Ding*, and it's gone. |
| **Alley-oops** | Reach the high-flying shards. For example, Bubble Bounce Luke into a Web Dive on a cluster, or a Holo Pad launch for Luna's Goo Bomb muffling a whole swarm. |
| **The neighbor** | Stays in her chair beside the Hush, one hand on it, humming her waltz. |

- **Each shard tucked away** lets a little color back, and the Hush **uncurls more**. Morrow's coils loosen a little each time.
- **Failure moves forward:** a shard that reaches the Hush makes it flinch and thins the music. **Nothing resets, nobody is bonked**, and shards never target the family.
- **The phase ends when the Hush is calm,** not when a counter is perfect. On easier assist levels, fewer shards come.
- **Five Together** is available: the chain alley-oop ends in a **Shield Drop** instead of a Meteor Slam, a giant dome of quiet.
- **[MUSIC]** Building, warm and protective. The family's instruments play softly, with no percussion, against the held note.

**[CINE]** The last shard, tucked away. The Hush **lowers both hands.** It looks at them for the first time: soft, enormous, with two pale gentle lights for eyes.

> LYLA: "Hi."
>
> THE HUSH: *(a sound too low to hear. Lyla's visor shows a picture: a small open space, like a breath. Lyla smiles.)*
>
> LYLA: "It said thank you."

**[CINE]** The neighbor reaches into her lap and holds out the **Bridge**. She offers it to Luna.

> NEIGHBOR: "I believe this is yours."
>
> *(beat)*
>
> NEIGHBOR: "This still doesn't mean I approve of the dragon."
>
> LUNA (hugging her leg): "Hi, friend."

**[STATE]** `hush_sheltered = true`, `bridge_recovered = true` → **[SAVE cp_a3_shelter]**

---

## A3-08 — The Heartnote (the song)

**[CINE]** Calm, for a moment. The Hush is uncurled, listening. Morrow is still coiled, still holding, eyes still closed. The Lanemother is still held. Far above, on the landing field, the family's dragon sleeps. **[MUSIC]** The held note, and in a few places now, tiny gaps where the Hush is breathing.

> MARIA: "His note never stops. It needs a rest in it."
>
> PAUL: "So let's play it gently. With room."

**[PLAY]** **Each family member plays one soft note.**
- The choices are each family member's instrument, showing a few notes as glowing shapes. **All of them harmonize**, so **there are no wrong notes.**
- One tap per person, in any order, or **one tap for everyone** at the highest assist level. **Untimed.**
- After each note there's **a rest**, a beat of quiet, and the Hush's drone fills it. Each time, Morrow's held note **wavers**.

**Feedback, never failure:** button-mashing or shouting makes the Hush curl slightly and the music thin. It reopens as soon as things calm down.

**[CINE]** Then the SOS plays **one last time**, gently, all seven notes, **with rests between them**, ending on its question.

*sol … mi … la … sol … fa … re … ti …*

It hangs there, the question. And underneath it, Morrow's note, the answer he stole and won't give back.

> CALLER: "That's where it always stops. I sang it a thousand times. We never knew the end."
>
> LUKE: "Because it's *ours*."

**[PLAY]** **Sing the Heartnote.** One tap from the player. Every family member, the Caller and the neighbor too, sings the same note together: **Earth's Heartnote**, the note their own songs come home to. A note Morrow doesn't own.
- Prompt: "Let's finish it. Together."
- **[HINT 3]** It happens on its own after a moment. This beat must never be missable.

Then, after it, the most important beat in the game: **a rest.** One full beat of nothing. The Hush **rises** into it, enormous and soft.

**[CINE]** **A held note can't survive a rest.** Morrow's note **breaks**: not with a crash, with a gasp, like someone who has been holding their breath for a thousand years letting it go all at once. **[MUSIC]** All seven notes, the rest, and **home**. Then every part the worlds gave along the way joins in, one after another: the Market Moon's rhythm, the Hatchery's harmony, the Spires' lead, the Forge's accents, the Waystation band's bass and the Drift convoy's countermelody (SD-020). The answer is complete. The family's chord from Five Together finally **resolves** for the first time in the game.

### The payoff

- **The universe resumes mid-sentence.** Across Farport, held travelers blink and finish what they were saying. In the Departure Halls, a hundred goodbyes complete at once.
- **Up on the landing field, their dragon wakes first,** and it's **the loudest**: a huge joyful roar that rolls down into the garden. Then it stops, takes a breath, and **rests**. It's learned. It glides down into the garden and lands beside them. In its chest, the Core flickers back on.
- **The Lanemother wakes.** She lifts her enormous head, sees the family's small dragon, and lowers her head to it.
- **Color floods outward** from the garden, across Farport, up through the Mooring Ring and out along every lane. The Market Moon, the Hatchery, the Spires and the Forge flash in the distant sky.
- **The Hush settles** into the pauses, a soft, quiet place the music flows *around*. It rests a "hand" on the neighbor's shoulder for a moment.

> NEIGHBOR (not looking at anyone, eyes wet): "…Well. That's very nice."
>
> LUNA: "You *helped*."
>
> NEIGHBOR: "I sat down. Anyone can sit down."
>
> MARIA: "Not everyone gets back up."

> LYLA: "Why us?"
>
> PAUL: "Nobody chose us, Lyla. We heard them. And we chose to help."

**[CINE]** And then, in the middle of the garden, for the first time in the whole game, **Morrow opens his eyes.** They're gold, and enormous, and very, very sad. **[MUSIC]** Silence. Not the Quiet. Real silence, the kind that comes before something.

> MORROW (very quietly): "...No."

**[STATE]** `heartnote_sung = true`, `quiet_lifted = true`, `lanemother_awake = true`, `morrow_awake = true` → **[SAVE cp_a3_heartnote]**

**Next:** [The Last Hold and the Final Landing](A3-09_THE_FINAL_LANDING.md).
