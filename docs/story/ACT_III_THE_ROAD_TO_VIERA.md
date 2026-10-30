# Space Dragon — Act III: The Road to Viera (proposal)

**Date:** October 30, 2026  
**Status:** PROPOSED narrative treatment for owner review. Not CONFIRMED canon, not current implementation scope. All names are placeholders. The final landing on Viera, suit upgrades becoming powers by the end, and dogfights and asteroid fields between planets are CONFIRMED owner direction ([decision](../decisions/2026-10-29-three-acts-linear-and-viera.md)); how this act delivers them is proposed.  
**Builds on:** [Act II](ACT_II_ANSWER_THE_CALL.md) and the [Acts II & III overview](ACTS_II_III_THE_ROAD_TO_VIERA.md). The low point and the Listen → Shelter → Home Note climax were drafted for Act II and have moved here, set on Viera.  
**Scripts:** [Landfall and the Rest Garden](scripts/A3-04_THE_REST_GARDEN.md) and [The Final Landing](scripts/A3-09_THE_FINAL_LANDING.md). The lane and waypoint scripts (A3-00 to A3-03) are not written yet.

## 1. What Act III must do

- **Land on Viera, for good.** The game's final landing is on Viera, a planet where everyone is a space traveler.
- **Resolve the Quiet** with understanding, not force. Nothing attacks the Hush.
- **Turn upgrades into powers.** Suits get their biggest upgrade on arrival in Farport, then each family member gains one power by the end.
- **Keep the flying big.** Dogfights, an asteroid field, an interdiction ambush, a capital-ship trench run and a fleet battle.
- **Keep Act I's promise of a way home.** The family can always get back to Earth.
- **Keep the rules:** the family stays together, sad is never scary, nobody dies, help never blocks the story, and no reading at speed.
- **Finish every arc:** the Caller's first voyage, the neighbor's quiet, the Sweeper's rule, the dragon's choice.

> **Logline (proposed):** The last lane runs to Viera, and the family races a tidy-minded robot there to save a planet of sleeping travelers. When their own dragon falls asleep on the landing field, they cross the silent spaceport on foot to the Rest Garden, where the Hush is hiding. They give it back its place in the song, Viera wakes, and a sky full of ships takes off at once.

---

## 2. Viera

Viera's lore is drafted in the [overview](ACTS_II_III_THE_ROAD_TO_VIERA.md) § Viera, the lanes and the Quiet. In short:

- Every Vieran is a traveler with a **lane book** of marks from the worlds they've reached. Greeting: "Fair lanes!" Farewell: "Light your way home."
- **Farport**, the capital, is a spaceport city: landing fields, Outfitters' Row, the Departure Halls, the dragon Roosts and, at its heart, the **Rest Garden**.
- **The Mooring Ring** circles the planet with thousands of docked ships.
- **The Lanemother**, the oldest star-dragon, sang the first lane. She sleeps in the Rest Garden.
- **Why the Quiet happened:** the Vierans loved traveling so much they stopped coming home to rest, and the dragons sang the lanes nonstop. The Hush, the rest in the song, had no room left. It covered its ears and pulled a silence over everything, starting here. Nobody meant it.

Viera is the largest world in the game. Farport is crossed in a fixed order, but each district is wide enough to explore, wake and stamp.

---

## 3. Cast in Act III

| Character | Act III role |
| --- | --- |
| **The Caller** | On their first voyage. Deep in Viera's Quiet they start to doze, so they stay inside the family's sound and hold the neighbor's hand. They give the Sweeper its missing rule. Reunited with their family in Farport; first mark at the final landing. |
| **The neighbor** | Tries to file a complaint with the Sweeper's depot foreman, who adores her clipboard. In the Rest Garden she sits down beside the Hush first. Her folding chair stays on Viera. |
| **The robot iguana** | Talks the Sweeper down, machine to machine. |
| **The passenger** | Returns from the Hatchery with the hatchlings to fly in the Great Launch. Gives the kids a keepsake. |
| **The Core** | Farport is where it was designed. It reads the departure boards and translates the outfitters. Whether it stays on Viera is OPEN. |
| **The dragon** | Falls asleep at Landfall. Wakes first at the home note, loudest, then rests. Gains Lane Wings. At the end, among its makers and its kind, it chooses the family. |
| **The Hush** | Met at last, curled around the sleeping Lanemother. Listened to, sheltered, and given back its place. |
| **The Lanemother** | Wakes at the home note. Sings a permanent lane to Earth as thanks. That lane is the way home. |
| **The Sweeper** | Fought at its depot, in the Drift and over the Mooring Ring. Panics at the Great Launch. Re-tuned into Farport's harbor tug. |
| **The four star-dragons** | Wingmen on every flight. They tow rescued ships in the Drift and hang back at the edge of Viera's deep Quiet. |

Open role slots for the missing character file (SD-013): a fleet captain on the Mooring Ring, a Waystation mechanic, an outfitter, a Sweeper drone that switches sides early, and the Caller's family. No names are assigned.

---

## 4. Structure

Act III in six movements, in a fixed order.

### Movement 1 — The Long Lane (A3-00 → A3-02)

**A3-00 The Snag Net.** Mid-jump, the Sweeper's interdictor net yanks the dragon out of light speed. Dogfight the guard drones and cut the net's four anchors to break free. *Feel:* being pulled out of hyperspace into an ambush.

**A3-01 The Waystation.** A ringed moon that used to be the travelers' rest stop: a big mess hall, hangars and a house band asleep mid-song. The Sweeper has made it its depot, with sleeping ships stacked like a junkyard.
- On foot, the family's instruments wake the house band, and the level's music comes back with them.
- Free the stacked ships, then beat **the Crane**, the depot's foreman bot (on-foot boss, 2–3 phases, slip–expose–alley-oop).
- The neighbor tries to file a complaint with the Crane. The Crane loves her clipboard and files it, very carefully, in a crate.
- The dragon learns **Tow-line**. The exit flight tows freed ships out through the hangar.
- Learning stop: **Dock Match** (`shape_matching`).

**A3-02 The Drift.** A huge asteroid field around Viera's moon, full of ships that tumbled when their pilots fell asleep.
- Thread the field. Dock with sleeping ships, and wake their pilots in short on-foot boarding scenes.
- The star-dragons tow the rescued ships in a growing convoy behind you.
- Learning stop: **Count Them Home** (`counting_objects`), at a safe docking pause.

### Movement 2 — Battle of the Mooring Ring (A3-03)

Squadron dogfights above Viera, then a trench run along the Barge to disable its grapple arms. Freed ships drift back to their moorings, and the convoy docks beside them. The Barge limps away into the clouds.

The dragon gave everything. Its glow is dim, and its wings beat slower.

*Pacing:* the biggest action yet (intensity 4), followed straight away by the act's quietest stretch.

### Movement 3 — Landfall and Farport (A3-04 → A3-05)

**A3-04 Landfall (the low point).** The star-dragons hang back at the edge of Viera's deep Quiet; they would fall asleep again. The family's dragon goes on alone, and **falls asleep**, gliding down onto a Farport landing field among the moored ships and curling up.
- **It isn't a breakdown.** Its living material is falling asleep, like the dragons it was made from. Maria can keep it breathing softly, but she can't wake it alone.
- **The stakes are personal.** The family isn't only saving strangers. Their own dragon, the friend they grew in the cul-de-sac, needs waking.
- **Gentle, not scary.** The family is together, the toddlers are tired, it's very far from home. The Caller starts to doze.
- **Maria's beat:** *"Everybody stay together."* Lyla plays a recording **from home**, and the home sound pushes color back in a warm circle. They walk on inside it. The Caller stays awake inside the circle.
- **Pacing:** about a minute of slow walking before the recording, control never stops, and no one is ever separated.

**A3-05 Farport on foot.** The biggest world in the game, crossed in a fixed order inside the warm circle, which grows as districts wake.
- **Outfitters' Row:** the family wakes the outfitters with sound, and each suit gets its big **Farport upgrade**, enough to go deeper into the Quiet. Meanwhile the Dragonwrights armor the sleeping dragon (Scale Armor). Learning stop: **Pattern Fit** (`pattern_repeat`).
- **The Departure Halls:** a giant terminal of travelers asleep mid-goodbye, suitcases floating. The Caller looks for their family on every face. Learning stop: **The Big Board** (`letter_matching`, matching only).
- **The Roosts:** star-dragon nests, empty and cold, and the path down to the center.
- **The Rest Garden:** overgrown and empty. Something huge is softly glowing.

*Design note:* the warm-circle walk is the natural home for the BOOKMARKED Line Leader system: one leader, everyone close. It **must not** require split parties. Without Line Leader it works as a guided walk.

### Movement 4 — The Rest Garden (A3-06 → A3-08)

The climax has **three phases, Listen, Shelter and Home Note**, each with a different verb. None of them is an attack. They come from the [research](../research/2026-10-29-empathy-music-pacing.md) and are detailed in [music, empathy and pacing](MUSIC_EMPATHY_AND_PACING.md).

**A3-06 Listen (understanding).**
- In the Rest Garden, curled around the sleeping Lanemother, is **the Hush**: enormous, soft, cloud-like, with its "hands" over its "ears." It isn't attacking. It's *hiding*.
- **The family does what worked all through Act II: they get loud.** The Hush curls tighter, the Quiet thickens and color drains. The game lets the player try this. It simply doesn't work, and nothing is lost. This is the turn.
- **Lyla's Listen:** her visor lets the family **hear what the Hush hears**: every song from every world at once, every traveler's engine on every lane, *including the dragons the family woke*. Far too loud. Then the Hush's silence.
- **The Caller explains** from the old bedtime story: the Hush keeps the rests. And the Caller understands the rest themselves: *"We never stopped. Nobody came home. Nobody sat here."*
- **The neighbor steps forward.** *"I know that feeling."* She sits down next to it. Sometimes everything is too loud, and nobody asks if you're okay. Her waltz plays slow and soft, and the Hush's drone harmonizes with it.
- **Gesture choices, with no reading:** *sit down*, *wave hello*, *hum softly*, *give it space*. Every choice is kind, and every choice works.

**A3-07 Shelter (protection).**
- The Hush uncovers one ear, and the noise rushes in: bright **echoes** of every song and every engine. The dragons the family woke are part of it. The answer is balance, not silence and not noise.
- **The family protects the Hush.** Nobody attacks. Maria shields, Luna's goo muffles, Luke tethers, Paul braces a wall, Lyla records each echo into the archive "for later," and alley-oops reach the high ones. The Farport upgrades get their first real use here.
- **Failure moves the story forward.** An echo that reaches the Hush only makes it flinch. The phase ends when the Hush is calm, not when a counter is perfect.

**A3-08 The Home Note (song).**
- Each family member plays one soft note; **there are no wrong notes**. Untimed, one tap each, or one tap for everyone.
- The SOS plays one last time, all seven notes with rests, ending on its question. The Caller, in person: *"That's where it always stops. We never knew the end."* Luke: *"Because it's ours."*
- **The family sings the home note**, joined by the neighbor and the Caller. The melody resolves.
- **Payoff:** the family's dragon wakes first, loudest, then rests. **The Lanemother wakes** and lowers her head to it. Color floods out from Viera along every lane. The song now **includes rests**, and the Hush settles into the pauses: not defeated, given back its place.
- *This is the payoff of the whole three-act arc.* The SOS was a call, and the family's note is the answer. **They weren't chosen. They chose to help, and the help was something only they could add.**

### Movement 5 — Your Own Note and the Great Launch (A3-09 → A3-10)

**A3-09 Your Own Note.** As Viera wakes, each suit's living material hears its wearer's own note and blooms. The upgrades fuse into **one power each** (drafts in the [overview](ACTS_II_III_THE_ROAD_TO_VIERA.md) § Suits to powers). The Lanemother gives the dragon **Lane Wings**. Five Together becomes **Five Powers**, and its chord resolves to the home note for the first time.

**A3-10 The Great Launch.** Every traveler on Viera wakes at once and takes off: a sky full of ships, all moving. The Sweeper's rule flips from *anything that doesn't move is debris* to *too much is moving!*, and it rises out of the clouds to clear the sky.
- **Phase 1, in the air:** the dragon leads the four star-dragons, the hatchlings and the whole traveler fleet against the Sweeper's last swarm.
- **Phase 2, on its deck:** the dragon lands on the Sweeper's back, and the family uses their new powers to reach its core.
- **Phase 3, the re-tune:** the robot iguana talks to it first. Lyla plays it the rest from the song. The Caller gives it the rule it was missing: *some things that are still are only resting.* It powers down gently.

This is the last action beat of the game and its loudest celebration. It's a joyful battle, with every friend the family made flying beside them.

### Movement 6 — The Final Landing (A3-11)

- **Formation home.** The dragon leads the whole fleet down to Farport. It's the victory lap: no enemies, formation calls, every ring adding an instrument.
- **Lane books.** On the landing field, every family member's book gets Viera's mark. The Caller's family finds them, and the Caller gets their very first mark, because they came home from their first voyage.
- **The dragon chooses.** It's home among its makers and its kind, and it could stay. It looks at the star-dragons, at the Lanemother, then at the family, and lowers its wing.
- **The neighbor's chair** stays in the Rest Garden. Vierans start sitting in it. *"Still not approving the dragon."*
- **The way home.** The Lanemother sings a permanent lane to Earth as thanks. The family can go home whenever they like, and come back.
- **Closing image:** Farport at night, travelers resting in the Rest Garden for the first time in ages, the family on a blanket, the dragon curled around them, and in the sky the lane home to Earth glowing steady. When the dragon hums, faraway voices hum back.

**Post-credits:** the cul-de-sac block party, some time later. A small Vieran ship lands on the street. It's the Caller, on their second voyage, carrying a cake-sized gift for the baker neighbor.

**Post-game (proposed):** the lanes stay open. Free travel between every world, Earth included, with lane-book stamps left to find. This reconciles with v0.1's canon C02, "explores the universe," only after the SOS is answered, which keeps Act I's rule against a sightseeing campaign before it.

---

## 5. Theme check

| Act | Question | Answer |
| --- | --- | --- |
| I | Will we help? | **Yes.** We weren't chosen, but we choose to. |
| II | *How* do we help? | By making noise where it's needed, waking one world at a time, and choosing again when the job gets bigger. |
| III | Where do travelers belong? | Home. Not by being the loudest, but by listening, by bringing home with you, and by being kind even to the thing that caused the problem. A planet of travelers learns to rest, and a family who had never traveled becomes travelers who still have a home. |

---

## 6. Gameplay vocabulary for Act III (proposed)

| Element | Notes |
| --- | --- |
| **Lane levels** | Snag Net (interdiction ambush), Waystation exit (tow through a hangar), the Drift (asteroid field, docking), Mooring Ring (dogfight plus capital-ship trench run), the Great Launch (fleet battle), Formation home (victory lap). One pilot, no crew roles. |
| **Tow-line** | Dragon upgrade from the Waystation: tow ships, or yank a gunship's shield off. |
| **Docking and boarding** | Short on-foot scenes inside sleeping ships in the Drift. |
| **The warm circle** | The home recording's circle of color at Landfall. It moves with the family and grows as Farport's districts wake. |
| **Farport upgrades** | One big upgrade per suit from Outfitters' Row, plus Scale Armor for the dragon. One extra slot per suit stays open on purpose. |
| **Powers** | One per family member at A3-09, first used in the Great Launch. They always switch off, helmets always open, and the suit never controls its wearer. |
| **Five Powers** | Five Together's final form. Its chord resolves to the home note. |
| **The Sweeper** | Final boss in three phases, ending in a re-tune, never destruction. |
| **The Hush** | **Not a fight.** Listen → Shelter → Home Note. Nothing attacks it. |

---

## 7. Learning in Act III (proposed, follows [learning rules](../learning/LEARNING_RULES.md))

| Where | Activity | Skill (proposed ID) |
| --- | --- | --- |
| Waystation | **Dock Match:** match each ship's badge shape to its docking bay | `shape_matching` |
| The Drift | **Count Them Home:** count the rescued ships joining the convoy, small quantities | `counting_objects` |
| Outfitters' Row | **Pattern Fit:** repeat a color-and-shape pattern to tune an upgrade | `pattern_repeat` |
| Departure Halls | **The Big Board:** find the gate by matching the letter shown beside its picture | `letter_matching` (matching only) |
| Rest Garden | **The Home Note:** creative, no right answer | — |

Each is paused and untimed, has an assisted path, and gives the same story reward. None happen during flight. No power replaces or gates a learning challenge.

---

## 8. Open decisions

- Whether the game ends on Viera with a post-credits scene at home, or flies home as its last scene.
- Viera's lore: lane books, Farport, the Rest Garden, and the travelers' forgotten rest as the cause of the Quiet.
- The Sweeper as the final boss, and whether the Great Launch should follow the Home Note or come before it.
- Whether the Caller starts to doze at Landfall.
- The final powers and upgrades per family member (drafts only).
- Whether the Core stays on Viera.
- The Hush's look, and whether the Lanemother is the same character as the Act II drafts' Elder Dragon.
- All names, and the roles from the missing character file.

## 9. Production boundaries

- **Nothing here is current scope.** Act III depends on flight, large-world walking, boarding scenes and possibly Line Leader, none of which exist.
- Viera can shrink for production: Farport's districts can collapse to two (Outfitters' Row and the Rest Garden) without changing the story.
- No multiplayer, backend or new external service is implied. Every new character is a scripted scene character.
- All names are placeholders. The neighbor must stay fictional per existing rules.
