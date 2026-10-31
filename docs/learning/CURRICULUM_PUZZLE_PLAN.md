# Curriculum puzzle plan

**Date:** October 30, 2026  
**Status:** PROPOSED design. The curriculum focus below is the owner's description (SD-033; incoming `origin/main` SD-027, see [the crosswalk](../decisions/2026-10-30-idea-id-reconciliation.md)) and is CONFIRMED direction. Puzzle designs, skill IDs and levels are proposals. This is not a validated curriculum or assessment; skill IDs and claims need parent/educator review under the [learning rules](LEARNING_RULES.md).
**Source:** owner, Space Dragon chat, October 30, 2026: *"We also need to plan puzzles that coincide with my kids curriculum."* *"The girls are learning to recognize numbers and letters and Luke is learning addition/subtraction and how to read."*

Every learning stop in the game gets **two tracks on the same scene**: a **Find It** track for number and letter recognition, and a **Work It Out** track for addition, subtraction and reading. Which track appears follows the **learner profile** of whoever is playing, not the suit on screen. The story reward is identical either way.

## 1. What each child is working on

| Learner | Working on (owner's words) | Skills practiced (proposed IDs) |
| --- | --- | --- |
| Luna and Lyla (3) | Recognizing numbers and letters | `numeral_matching` → `numeral_name_recognition`; `letter_matching` → `letter_name_recognition`; `counting_objects` and `numeral_quantity_match` as support |
| Luke (5) | Addition and subtraction | `addition_within_5` → `addition_within_10`; `subtraction_within_5` → `subtraction_within_10` |
| Luke (5) | Learning to read | `letter_sound_recognition`; `word_decoding` (CVC words first); `high_frequency_word_recognition` |

Ages are context, not a measured level. A parent sets each learner's starting level (§4) and can change it any time.

The learning rules' distinctions hold: finding an identical letter is `letter_matching`, not recognizing its name. Picking a picture from a spoken word is not decoding. Each puzzle below records only the skill it actually exercises.

## 2. Rules for curriculum puzzles

These sit on top of the [learning rules](LEARNING_RULES.md):

- **Follow the school week.** A parent's **This Week** list (§5) supplies the letters, numbers, words and math range. Puzzles draw from it, so the game practices what school is teaching now.
- **Same scene, same reward.** Both tracks unlock the same module, stall, gate or upgrade. Assisted completion gives the identical reward.
- **Paused and untimed.** Every puzzle happens at a safe standing point. None happen during flight, races or combat.
- **Short.** Three to five items per stop, then back to the adventure. Never a question on every jump.
- **Objects before symbols.** Luke's math starts with things in the story he can see and count (power cells, hatchlings, ships), then adds numerals.
- **Decoding can't be guessed.** In reading puzzles the word is the clue and the pictures are the choices. Wrong choices share letters with the answer (cat, cap, cot), and no picture appears beside the word itself.
- **Hint ladder, never shame.** Hints replay the audio, narrow the choices, model the answer, then do it together. A wrong tap never costs health or blocks the story.
- **Turns, not competition.** When two learners play together, the stop alternates turns. No sibling scores or rankings.

## 3. Three reusable puzzle templates

The whole plan runs on three templates, reskinned per world. That keeps production small and gives the kids a predictable frame.

| Template | Track | What the child does | Example prompt (spoken) |
| --- | --- | --- | --- |
| **Find It** | Numbers and letters | Find the thing marked with a target numeral or letter. Level 1 shows the target to match; level 2 only says it. | "Find the **four**." · "Which crate has the **B**?" |
| **How Many** | Addition and subtraction | Watch a small story action, then pick the total from numeral choices. Objects stay on screen to count. | "Three cells, and two more roll in. How many now?" · "Five apples. The passenger ate two. How many left?" |
| **Read It** | Reading | Read a word (or sound a letter), then pick its picture or path. The Core can sound it out slowly on request. | "Which way says **up**?" · "Pick the picture for **hat**." |

Each template follows the [challenge contract](LEARNING_RULES.md#challenge-contract): stable ID and version, skill, stimulus, prompt, answer handling, hint ladder, assisted route, story reward and observation.

## 4. Levels

A parent sets a starting level per learner and skill. Levels never drop automatically, and one success never marks mastery.

**Numbers (girls)**

1. Match a shown numeral, 1–5
2. Hear a number, find it, 1–5
3. Hear a number, find it, 1–10
4. Match a numeral to a group of objects, 1–10

**Letters (girls)**

1. Match a shown uppercase letter (the letters in their own names are good first targets)
2. Hear a letter name, find it, uppercase
3. Hear a letter name, find it, lowercase
4. Letter sounds, only when school has started them

**Math (Luke)**

1. Add within 5 with objects
2. Subtract within 5 with objects
3. Add and subtract within 10, objects and numerals
4. Numerals only, including "how many more?"

**Reading (Luke)**

1. Letter sounds: hear a sound, find the letter
2. Read a CVC word, pick its picture (distractors share letters)
3. High-frequency words from his school list
4. Two- and three-word phrases, while parked: "go up," "the red ship"

## 5. The This Week list

A parent panel, stored on this device only, never uploaded or committed:

| Field | Example | Default if blank |
| --- | --- | --- |
| Girls' letters | B, L, M | The letters in their names |
| Girls' numbers | 1–5 | 1–5 |
| Luke's math | Add and subtract within 10 | Add within 5 |
| Luke's words | cat, hop, sun, the, go, up | A short starter list of CVC and high-frequency words |
| Luke's letter sounds | m, s, t, a | Off |

Puzzles pick from the list first and fill gaps from the defaults. Changing the list never changes the story or resets progress. Real lists and results are child learning records and stay out of the repository.

## 6. Puzzle map, in play order

Learning stops come from the current scripts and treatments, each given both tracks. Stops marked "pure action" stay that way on purpose.

### Act I — Earth

| Where | Story reason | Find It (numbers and letters) | Work It Out (math and reading) | Template |
| --- | --- | --- | --- | --- |
| Preschool: **Space Blocks** | Find the glowing space blocks among the classroom blocks | Blocks carry letters: find the block with the **B** | Each bin is labeled with a CVC word: read it to sort the blocks (**Read It**) | Find It / Read It |
| Luke's school: **Trail Flags** | Follow the signal's flags up to the roof | Flags show numerals: find the **3**, then the **4** | Flags show short words: follow the flag that says **up** | Find It / Read It |
| Warehouse store: **Power Cells** | Fill the module's sockets | Socket shows a numeral: find the cell with the same numeral, then by name | "Three cells in, two more roll in. How many?" | Find It / How Many |
| Grocery: **Produce Sort** | Restore the scrambled controls | Crates marked with letters: put the apples in the **A** crate | The passenger snacks: "Five apples, it ate two. How many left?" | Find It / How Many |
| Big-box store | Parking Lot Chase | Pure action | Pure action | — |
| Rocket facility: **Countdown** | The launch countdown | Tap each numeral as it's called, 10 to 0 (participation, ungraded) | Same, participation only | — |

### Act II — the Quiet

| Where | Story reason | Find It (numbers and letters) | Work It Out (math and reading) | Template |
| --- | --- | --- | --- | --- |
| Lantern Rock: **lane books** | Stamping Earth's mark | Optional: find your own name's first letter on your book | Optional: read your own name | Find It / Read It |
| Market Moon: **Stall Letters** | Restart each stall's music box | A letter card: find the stall with the same letter | Merchants' price tags: "Two shells and three shells. How many shells?" | Find It / How Many |
| Hatchery: **Count the Hatchlings** | Hatch each egg | Each nest has a numeral: put eggs in until the dots match it | "Five eggs. Two hatched and flew to Mom. How many still in the nest?" | Find It / How Many |
| Climbing Spires: **Resonators** | Re-tune each spire | Resonators marked with letters: strike the **M** | Resonators labeled with words: strike the one that says **hop** | Find It / Read It |
| Forge Ring | Five-suit set piece and trench run | Pure action | Pure action | — |

### Act III — the road to Viera

| Where | Story reason | Find It (numbers and letters) | Work It Out (math and reading) | Template |
| --- | --- | --- | --- | --- |
| Waystation: **Dock Match** | Park freed ships in their bays | Bay numerals: dock the ship with the **3** at bay **3** | Ship names are CVC words: dock "Sun" at the sun bay | Find It / Read It |
| The Drift: **Count Them Home** | The convoy grows | Count the ships, then find the numeral | "Four ships, three more join. How many now?" | Find It / How Many |
| Outfitters' Row: **Pattern Fit** | Tune each suit upgrade | Put the numbered parts in order, 1 to 5 | Read the label word on each part to fit it | Find It / Read It |
| Departure Halls: **The Big Board** | Find the gate to the Roosts | Find gate **R** (match, then by name) | Read the short destination words: find the gate that says **nest** | Find It / Read It |
| Rest Garden: **The Heartnote** | Sing the answer | Creative, no right answer | Creative, no right answer | — |
| Final landing: **lane books** | Every stamp collected | Optional: count your stamps | Optional: read each world's name with the Core's help | — |

Existing challenge contracts (`a1m1_space_blocks_v1`, `a1m2_trail_flags_v1`, `a1m3_power_cells_v1`, `a1m4_produce_sort_v1`, `a2w1_stall_letters_v1`, `a2w2_count_hatchlings_v1`, `a2w3_resonator_pattern_v1`) stay as written. The two-track versions would ship as new versions (`_v2`), so old observations keep their meaning. `a2w1_stall_letters_v1` was proposed as `a2w1_stall_glyphs_v1` until October 30, 2026; it was renamed before anything was implemented, so no observations use the old ID.

### How the puzzles reach the kids off Earth

The game is in English everywhere, including the other universe ([language](../story/LANGUAGE_AND_TRANSLATION.md)). Signs, word cards, stalls, nests, docking bays and departure boards use plain English letters, numbers and words, so each stop can draw directly from the This Week list. Nothing needs decoding first. Spoken help is always available, and help is recorded as assisted.

## 7. What gets recorded

Per the learning rules, each item records the learner ID, challenge ID and version, skill, target, result, the hints used and whether it was independent. Example, with a fictional learner:

```json
{
  "learner": "test_learner_a",
  "challenge_id": "a1m3_power_cells_v2",
  "track": "how_many",
  "skill": "addition_within_5",
  "target": "3+2",
  "result": "completed",
  "assistance": ["objects_highlighted"],
  "independent": false,
  "story_reward_granted": true
}
```

A parent view can show "practiced this week" by skill. It never shows rankings, grades or mastery claims.

## 8. First build step (when authorized)

Build **Find It** and **How Many** once, inside the first town mission that's implemented (Space Blocks or Power Cells), with a hard-coded This Week list. Test independent, wrong, repeated, assisted, skipped and interrupted answers for both tracks before adding the parent panel. This plan doesn't authorize implementation by itself; the [current milestone](../plans/CURRENT_MILESTONE.md) is unchanged.

## 9. Open questions for the owner

- The actual current lists: which letters and numbers the girls are on, and Luke's word list and math range from school. A photo of a weekly newsletter or word list is enough.
- Whether the girls play separately or share turns on one profile each.
- Whether the girls' class has started letter sounds, or only letter names.
- Who reviews the skill IDs and levels: a parent, a teacher, or both.
