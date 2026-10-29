# Music, Empathy and Pacing

**Date:** October 29, 2026  
**Status:** PROPOSED design for owner review. It is informed by [owner-supplied research](../research/2026-10-29-empathy-music-pacing.md), whose citations are unverified. Nothing here is canon.  
**Builds on:** [Act I refinements](ACT_I_CRITIQUE_AND_REFINEMENTS.md) (the SOS melody), [Act II](ACT_II_ANSWER_THE_CALL.md) (the Quiet and the Hush, with its climax revised alongside this document), the [suit reveals](SUIT_REVEALS_AND_STARTING_ABILITIES.md) and the [combat system](../gameplay/COMBAT_SYSTEM.md).

## 1. What the research changes

| Research recommendation | What this design does with it |
| --- | --- |
| A nonviolent climax built on understanding and care | **Adopted.** The Act II climax is rewritten as three phases, *Listen → Shelter → Home Note* ([Act II](ACT_II_ANSWER_THE_CALL.md), Movement 5). |
| Make the "antagonist" someone before the climax, with a name, personality and backstory | **Adopted.** The Hush gets lore and is introduced gradually across Act II (§3). |
| Music as a mechanic, not only a soundtrack | **Adopted for story mechanics** (restoration and the climax). **On-beat play is optional:** a bonus only, never required (§2.6), because the players are very young and on a keyboard. |
| Dynamic music to guide emotion | **Adopted:** adaptive music states (§2.4), and character themes that change as the characters do (§2.3). |
| Repeat the SOS with a new presentation each time | **Adopted** (§2.5). |
| Climax pitch matching, where wrong or loud notes cause dissonance | **Adapted.** There are no wrong notes. Loudness gets *responsive feedback* (the Hush curls a little) that never fails and never resets. Pass/fail pitch matching would contradict the [learning rules](../learning/LEARNING_RULES.md) and frustrate a three-year-old. |
| Vary missions with a physics puzzle, stealth and a timed mini-game | **Adapted** (§5). Physics puzzles: yes. Stealth becomes **hide-and-seek** with no "caught" failure. The timer becomes a **countdown that waits for you**. |
| Fail-forward peril | **Adopted,** consistent with the existing rules (§6). |
| Alternate challenge and relief | **Adopted:** a beat map with a **hearth beat** (a short, warm, low-intensity scene, usually at home) after each intense stretch (§4). |

---

## 2. The song system

### 2.1 The SOS melody and the home note

- **Seven notes, one for each piece.** Six modules plus the Bridge. This replaces the earlier "five to seven notes."
- **Every scale note except home.** The melody uses the notes of a major scale *other than the first one*, the tonic. In music, the tonic is the note a tune feels "at home" on. The melody **ends on the seventh note** (the "leading tone"), which in music sounds like it's leaning toward home and can't get there.
- **Why it's missing (proposed lore):** the senders left the home note out on purpose. An answer has to come from whoever answers.
- **The payoff:** at the end of Act II, the family sings the home note and the melody resolves. "We chose to help" becomes something you *hear* (§ Act II A2-10).
- **Placeholder contour, not a composition:** *sol – mi – la – sol – fa – re – ti … (do)*. A composer may rearrange it, as long as it stays hummable by a three-year-old, never uses the home note, and ends unresolved. Test it by whether the kids hum it unprompted.
- **Optional learning echo:** the seven notes plus home make a full do–re–mi scale. It can appear as an optional music toy in the archive. Not tested and never graded.

### 2.2 The family's instruments

Every family member has an instrument **voice**. Every action their suit performs sounds in that voice, **tuned to the key of the current music**, so even button-mashing sounds musical. This is how "the family's noise is the superpower" becomes audible.

| Who | Voice | Character |
| --- | --- | --- |
| **Paul** | Warm brass: horn and tuba | Big, low, steady |
| **Maria** | Cello and a soft hum | Warm, comforting |
| **Luke** | Plucked strings and xylophone, quick runs | Agile, bright |
| **Luna** | Marimba with bubbly "pop" synths | Bouncy, squelchy, funny |
| **Lyla** | Celesta and music-box chimes (her archive "ding") | Curious, sparkly |
| **The dragon** | A deep horn-like roar that is actually a sung note | In Act II, Song-breath sings the SOS motif |

- **Alley-oops are duets:** the setter's voice plays on the launch and the finisher's voice answers on the landing, always a pleasing interval.
- **Five Together is a chord:** all five voices together. **Until the end of Act II the chord never resolves to home.** After the climax, Five Together resolves. It's a subtle post-game payoff that most adults will notice and most kids will feel.

### 2.3 Themes that change as the characters change

| Theme | Sound | How it transforms |
| --- | --- | --- |
| **Family / home** | Acoustic guitar and piano, warm | Opens the game in the living room. It's the "home recording" at the Act II low point, and after Act II it includes the home note. |
| **SOS** | Starts as a broken music box | Grows one instrument per install (§2.5). |
| **The neighbor** | A comic swamp march: banjo, accordion, washboard, oompah tuba | Louder and sillier with each scheme. **When she hands over the Bridge it slows into a gentle waltz.** In the Act II climax it plays softly alongside the Hush's drone. Her change of heart is told in music. |
| **The Hush** | A very low, breathy drone, felt more than heard (optional controller rumble) | Ends as a warm sustained pad under the restored song: the "rest." |
| **The Caller** | A lone, hoarse whistle singing the SOS | Gains backing instruments as worlds wake. |
| **The Quiet** | Not music: a muffling filter over everything | Pulls back as color returns. |

### 2.4 Adaptive music states

Music is built from layers (stems) that fade in and out with **game state**. This keeps presentation separate from state, per the [architecture](../engineering/ARCHITECTURE.md).

| State | Music behavior |
| --- | --- |
| Home | Family theme, full and warm |
| Town exploration | A bright variation with light percussion |
| Neighbor interference | Her march crashes in over the town music (a comedy cue) |
| On-foot fight | Tempo up and percussion. Each family member's voice layers in as they act. |
| Dogfight | Driving percussion plus the dragon horn. Lock-on tones are tuned to the key. |
| Quiet zone | A muffling filter, with layers dropping out one by one. **The family's instruments stay clear,** because they carry their own sound. |
| Restoration | Layers return in sync with the color ripple |
| Low point | Near silence, then only the home recording playing in the scene, then family instruments rejoin one at a time |
| Climax | Silence → the Hush heard through its own ears → the neighbor-and-Hush duet → the full SOS → the home note |

**Transition rule:** change on musical boundaries with crossfades. **Sudden stingers are reserved** for moments that matter: the crash, the dragon that won't wake, the Listen beat. The research's point is that a sudden shift signals importance, so it shouldn't be spent cheaply.

### 2.5 Repetition with variation: the SOS grows

The SOS plays after every install, so it never sounds the same twice. Each layer is added by **install count**, which keeps it consistent with Act I's any-order missions.

| Installs | Presentation |
| --- | --- |
| 0 (arrival) | A broken music box: one clear note in static |
| 1 | Music box, two notes |
| 2 | + celesta |
| 3 | + marimba |
| 4 | + plucked strings |
| 5 | + cello |
| 6 | + brass: six notes, then it stops one short (the "won't wake" beat) |
| 7 (Bridge) | Full arrangement with the dragon horn. Seven notes, ending on its question. |
| Act II end | Seven notes plus **home** |

### 2.6 Optional on-beat play

Inspired by rhythm games, but **never required**:
- Actions that land on the beat earn a small sparkle and a little extra Family Spark.
- Off-beat actions work exactly the same and are never penalized.
- **Beat indicator:** the emblem pulses in time, and an optional soft click can be turned on in settings.
- **Act II "rhythm sortie" (optional):** a dogfight where bandit waves arrive in time with the music, and on-beat Breath Cannon fire adds harmony.

### 2.7 Sound must also be seen

Sound is a mechanic, so **every meaningful sound has a visual equivalent:**
- Ripples radiate from each sound source, using that family member's color *and* shape.
- The Quiet is a visible haze, and the Hush's sigh is a slow visible ripple.
- Threat warnings are a HUD arrow, and every voice line is captioned.

A player who is hard of hearing, or playing muted, can finish everything. Music, effects and voice have separate volume controls, and there's a mono option.

**Production:** authored music only, with no generative-music service (per AGENTS.md: no new external generators). Keep the number of stems small. The composer is OPEN. All of this is NOT TESTED.

---

## 3. The Hush, made someone before the climax

### What it is (proposed lore)

The Hush is **the rest in the song**: the living pause between notes, where things catch their breath and hatchlings sleep. For a long time the star-dragons sang without ever stopping. *Why* is OPEN; one option is a celebration that never ended. With no rests left, the Hush was squeezed until it couldn't bear it, and it pulled silence over everything. It was overwhelm, not malice.

### Personality

It's shy, gentle and enormous, and a little embarrassed by its size. It collects quiet things: drifting dust that looks like snowfall, and sleeping creatures that nestle against it. When it's overwhelmed it **covers its ears**, a reaction young kids know from their own experience of "too loud."

### Introducing it across Act II

| Where | What the player sees |
| --- | --- |
| A2-01 Arrival | Far on the horizon, a huge soft shape drifts away when Luke yells "HELLO?" |
| A2-02 The Caller | An old bedtime story: *"The Hush keeps the rests."* It goes into the archive and can be replayed. |
| Market Moon | The loudest world, so the Hush's trail is strongest here. After the joyful restoration, Lyla's visor shows the Hush flinching far away. Helping has a cost, set up gently. |
| Hatchery | Hatchlings sleep best where the Hush passed. Maria: *"It was keeping them calm."* |
| Climbing Spires | Lyla records the Hush's sigh, a sound too low to hear that her visor shows as a slow ripple. |
| Forge Ring | Old blueprints show the song drawn *with gaps* (rests). Newer ones have none. For kids it's a picture of a song with spaces versus one without, and parents get the meaning. |

### The neighbor's parallel

Her garden was her quiet place. The Bridge wrecked it, and then a giant dragon project started next door. Her overreaction is still the joke, but underneath it she's the person in the story who most understands the Hush. Keep this fictional and kind.

---

## 4. Emotional beat map

Intensity runs from **1 (cozy)** to **5 (peak)**. The rules:
- Never put two intensity-4 beats back to back without a relief beat between them.
- Every Act I mission ends at home with a hearth beat (a short, warm scene).
- Spooky moments are capped at "a bit spooky" and resolved within about a minute.
- **The most emotional moment (A2-10) is the least demanding to play.**

### Act I

| Beat | Feeling | Intensity | Music | Relief after |
| --- | --- | --- | --- | --- |
| A1-00 Living room | Cozy, then curious | 1 → 2 | Family theme, then the broken music box | — |
| A1-01 Crash and Core | Wonder, a bit spooky | 3 | Stinger, then the Core's hum | Suit reveals |
| A1-02 Suit reveals | Joy, comedy | 2–3 | Each family member's instrument introduced | — |
| Five Together (first time) | Teamwork | 2 | All five voices, an unresolved chord | Map reveal |
| Missions 1–6 | Fun, momentum | 2–4 | Town, the neighbor's march, fights | **A hearth beat after each:** the install party |
| Mission 6 alligator | Biggest action so far | 4 | Full fight music | The dragon's body stands |
| "It won't wake" | Surprise, a little sad | 3 | The SOS stops a note short; stinger | The Core points across the street |
| Across the street | Comedy, then empathy | 4 → 2 | The march at its loudest, then the waltz | Her line |
| A1-07 Assembly | Awe | 4 | Full SOS arrangement plus the dragon horn | — |
| A1-08 The decision | Quiet, family | 2 | A soft solo SOS ending on its question | The lift-off swell |

### Act II

| Beat | Feeling | Intensity | Music | Relief after |
| --- | --- | --- | --- | --- |
| A2-00 The Crossing | Thrill | 4 | Driving flight music, then the inverted shimmer | Arrival |
| A2-01 Arrival in the Quiet | Eerie, then delight | 2 | The Quiet filter. Luke's "HELLO?" brings the instruments back. | — |
| A2-02 The Caller | Tender | 1–2 | The Caller's lone whistle | — |
| The worlds | Adventure | 3–4 | World themes and restoration | Hearth beats: camp at the beacon, the hatchlings |
| The passenger's reunion (Hatchery) | Joy and a little bittersweet; the emotional midpoint | 2 | The creature hums the SOS with the family | — |
| A2-07 Low point | Lonely and tired: **sad, not scary** | 2 | Near silence, then the home recording | Walking forward together |
| A2-08 Listen | Surprise, understanding | 3 | Noise heard through the Hush's ears, then silence, then the duet | — |
| A2-09 Shelter | Protective action | 4 | Building | — |
| A2-10 The Home Note | Catharsis | 5 emotionally, 1 to play | The full SOS, then the home note | The Encore |
| Encore flight | Joy | 3 | The full song, now with rests | — |
| Coda | Home, warmth | 1 | The family theme, with the home note | — |

---

## 5. Variety: same shape, new surprise

The research warns against monotony. For very young players, a **predictable frame** also helps them know what to do next, though that's a design assumption: the research didn't cover ages 3–5. So keep the **frame** identical every time: map → go → set piece → bring it home → install party. Vary the **middle**.

### Act I missions

| Mission | Core verb | Set piece | Adapted from the research |
| --- | --- | --- | --- |
| 1. Preschool | Sort | Find the "space blocks" among the classroom blocks, then an iguana chase | Matching and sorting |
| 2. Luke's school | Climb | An obstacle-course climb up to the gym roof | Vertical traversal |
| 3. Warehouse store | Lift | **A physics puzzle:** stack pallets into a ramp to reach the wedged pod, then race it home on a cart | Physics puzzle ✓ |
| 4. Grocery | Care and seek | **Hide-and-seek:** the shy passenger creature hides around the store, and Maria's Soothe and a gentle approach coax it out. Being spotted just makes it hide somewhere new: no "caught," no failure. | Stealth → hide-and-seek |
| 5. Big-box store | Chase | A parking-lot chase against robot iguanas and mosquito drones | Action variety |
| 6. Rocket facility | Test | **A launch countdown that holds whenever the player needs it.** "Countdown holding!" is real launch language. Then the alligator ambush. | Timed mini-game → a countdown that waits |
| The Bridge | Empathy | A boss fight that ends in kindness | Nonviolent resolution |

### Act II worlds

| World | Feel | Set piece |
| --- | --- | --- |
| Market Moon | Noisy, joyful chaos | Restoration in waves of returning sound, plus a cart race |
| Hatchery Nebula | Quiet, care, a lullaby soundtrack | Warming eggs and hatching them with heartbeat-songs |
| Climbing Spires | Vertical and musical | Climbing and re-tuning the resonators (optional on-beat play) |
| Forge Ring | Action | A five-suit set piece plus a strike sortie |

The sortie types vary the same way: dogfight, intercept, escort, strike run, ring run, formation flight, and the Encore.

---

## 6. Peril and fail-forward (the consolidated rules)

- **Threats are cartoon nuisances.** Zaps tickle and robots tip over. The family's only "hurt" reaction is being a little dizzy.
- **Failure nudges forward.** A bonked family member is revived. The dragon tumbles and rights itself. A puzzle resets only its last step. Collected items are never lost ([combat system](../gameplay/COMBAT_SYSTEM.md)).
- **Spooky moments are short,** and a parent character is always nearby.
- **The family is never separated during sad or scary beats.** No child is alone at the low point. This is a design caution for very young players, not a research finding.
- **Sad is not scary.** The low point is lonely and tired, and its fix comes from within the family (the home recording).
- **The neighbor is never humiliated.** The comedy comes from her overreaction, not from her being mocked.

---

## 7. Open questions and next research

- **Ages 3–5:** how much sadness, peril, and sleep-as-stakes these players handle. The cheapest evidence is a short playtest with your own kids.
- **Perspective-taking:** will the *Listen* beat land with a three- or five-year-old? Prototype just that moment, in sound only, and watch them.
- **Repetition** in preschool media specifically, plus children seeing themselves as characters and learning by teaching. These were in the original brief and the research didn't cover them.
- **Decisions for you:**
  - Adopt the seven-note melody and the missing home note.
  - Adopt the Hush as "the rest."
  - Approve the neighbor's musical arc.
  - Keep the three-phase climax, or pick one of the research's single variants instead.
- **Verify the research's citations** before quoting them publicly.
