# Combat System — on foot and in the dragon

**Date:** October 28, 2026  
**Status:** PROPOSED design for owner review. Not implemented and not current scope: [the current milestone](../plans/CURRENT_MILESTONE.md) explicitly excludes complete combat systems from SD-M1. Treat this as the target the first combat prototype is built toward.  
**Builds on:** [suit reveals and starting abilities](../story/SUIT_REVEALS_AND_STARTING_ABILITIES.md), the [interaction contracts](INTERACTION_CONTRACTS.md), the [learning rules](../learning/LEARNING_RULES.md), the [architecture](../engineering/ARCHITECTURE.md), and the [Act I](../story/ACT_I_BUILD_THE_DRAGON.md) / [Act II](../story/ACT_II_ANSWER_THE_CALL.md) story docs.

## 1. Design goals

1. **Depth comes from combinations, not execution.** A three-year-old can win by tapping glowing things. A parent can play smart by setting up tandems. Neither needs fast fingers.
2. **Every combat verb is also an exploration verb.** Goo, tether, lift, scan and shield do the same thing in a fight as in a puzzle, so there's nothing extra to learn.
3. **Tandem attacks are the heart of it.** One suit sets up a state on an enemy, and a second suit cashes it in. The family is stronger together *mechanically*, not just thematically.
4. **Nobody gets hurt and nobody "dies."** Enemies slip, get captured, get disarmed, power down, get calmed or run away (Act I §6). Family members get **bonked**, never injured.
5. **There is never a game over in story fights.** Losing costs a few seconds, never progress.
6. **Combat never requires reading,** and learning never happens mid-fight (learning rules).
7. **It's single-player first.** Family members not under player control act as **companion assists**, which needs no network or backend. Local couch co-op is OPEN (§10).

---

## 2. The shared status system

Every suit applies one main **status**. A status is a visible state on an enemy that other suits can exploit. This is the foundation that tandems build on.

| Status | Applied by | What it does | Readable cue (never color alone) |
| --- | --- | --- | --- |
| **Slipped** | Luna (Splat) | The enemy slides and can't steer or stop. Chargers spin out. | Pink puddle under the enemy, a wobble animation, a squelch sound and a spiral icon. |
| **Tethered** | Luke (Tether / Pounce) | The enemy is held by a glowing line and can be pulled or pinned briefly. | A visible line, a taut "twang" sound and a hook icon. |
| **Stunned** | Paul (Dragon Punch, Slam) | The enemy is knocked dizzy and stops acting. | Circling stars, a bell "bong" and a star icon. |
| **Exposed** | Lyla (Scan) | The enemy's weak point lights up, and the next hit there disables it at once. | A bright target ring on one spot, a rising "ding" and an eye icon. |
| **Bubbled** | Maria (Family Shield, reshaped) | The enemy is enclosed in a shield bubble and floats helplessly. | A purple translucent sphere, a soft "bwomp" and a bubble icon. |

**Rules:**
- A status lasts a **few seconds** (tunable, and longer on easier assist settings). When it applies there's a big, clear effect, and a gentle blink warns before it ends.
- An enemy can carry **one status at a time**, plus Exposed, which stacks with anything. This keeps the screen readable.
- A status alone **does not defeat** a standard enemy. It sets one up. Small swarm enemies are the exception: one action resolves them.
- Status is **game state**. Animations and effects only show it, per the [architecture](../engineering/ARCHITECTURE.md).

### How enemies are defeated ("resolutions")

Enemies have no health bars. Each enemy has **1–3 sparks**, small glowing pips over its head that show how close it is to resolving. An action removes a spark. A tandem removes all of them, or several from a group. With zero sparks, the enemy **resolves** in a way that suits it:

| Enemy type | Resolution |
| --- | --- |
| Robots (the neighbor's swamp tech) | Powers down with a sad "boop", tips over, drops what it stole and scuttles home. |
| Fantasy creatures (Act II) | Calms down, wakes up, flutters away or becomes friendly. |
| Real animals | **Never fought.** They're soothed or avoided, and Maria's Soothe handles them (suit reveals §3). |

---

## 3. On-foot combat (individuals)

### Controls

| Input | Touch (proposed) | Keyboard (proposed) | Function |
| --- | --- | --- | --- |
| Move | Left-thumb pad | WASD / arrows | Move, with auto-targeting of the nearest relevant enemy. |
| **Action** | Big button | Space / J | The suit's basic move against the current target (goo blob, tether, punch, scan, pulse). |
| **Suit power** | Second button | K | The suit's special: Family Shield, Slip 'n Slide, Dragon Punch and so on. A clear cooldown ring shows when it's ready again. |
| **Tandem** | Pulsing family portrait, which appears only when available | L | Triggers the suggested tandem (§4). |
| Switch avatar | Tap a portrait in the corner | 1–5 | Change who you control. Cooldowns and statuses **persist**, per the interaction contracts. |

Three buttons plus movement. There are no combos, no held buttons and no rapid tapping. Touch targets are large and spaced apart.

### The companions

The four family members you aren't controlling follow and help (**companion assists**). This is scripted, local behavior and it's *not* the Line Leader system, which stays BOOKMARKED.

- They use their **Action** on enemies near you at a **slow, readable pace**. They mostly *set up* statuses so the player gets to finish them, which keeps the player the hero.
- They **don't** use big suit powers on their own, except Maria's auto-shield against a telegraphed hit when the assist setting is on.
- They **never** take a tandem away from the player. A tandem fires only when the player taps it.
- In encounter arenas they stay within a short distance of the player and teleport back if stuck. No family member is ever lost (v0.1 invariant).

### Bonked, not beaten

- Each family member has **suit energy**, shown as a ring around their portrait, never as hearts or blood.
- At zero they're **bonked**: they sit down dizzy inside a little purple bubble for about 3 seconds. Then Maria's drones revive them automatically at partial energy. Maria herself is revived by any family member walking over to her.
- If **everyone** is bonked at once, which should be rare, the screen does a gentle "family huddle" fade. The encounter resumes from the start of its current phase, with all collected items, removed sparks and resolved enemies kept. The game then offers (spoken, not text-only) to turn up assistance. **Nothing is ever lost.**

### Enemy anatomy

Every enemy is defined by:

| Field | Meaning |
| --- | --- |
| **Telegraph** | What it does before it acts, such as a wind-up, a glow or a sound. Always at least about a second of warning, and longer on easier settings. |
| **Behavior** | Simple, readable patterns: charge, hover, steal, swarm, guard. |
| **Weak to** | Which status sets it up best. Any status works, but this one gives a bonus. |
| **Sparks** | 1 for swarm, 2 for standard, 3 for elite. Bosses use phases instead. |
| **Resolution** | How it leaves the fight (§2). |

---

## 4. Tandem attacks

A **tandem** is a short, flashy two-person move (about 1.5–3 seconds) that cashes in a status. When the controlled character's target has a status that pairs with another nearby family member, that partner's portrait **pulses** with a two-face icon. Tapping it plays the tandem.

**Rules:**
- **One tap.** No timing or button sequence is required. For older players, an *optional* timing flourish (tapping again at the shine) adds a cosmetic sparkle and a bit of Family Spark (§5), and never anything required.
- **Tandems always succeed** once triggered.
- **They resolve the target fully**, or remove several sparks from a group.
- **They can't be spammed:** each pair has a short shared cooldown after use.
- **Skipping or reducing the animation** (a reduced-motion setting) gives the identical result. The outcome is computed first and the animation plays it back (the interaction contracts' "cinematics are not the database").
- The game **suggests** the best tandem for the situation. On a higher assist level it suggests more often and holds the prompt longer.

### All ten family pairs

| # | Pair | Name (working) | Setup status | What happens | Best against |
| --- | --- | --- | --- | --- | --- |
| 1 | **Luna + Lyla** | **Decoy Slide** | — (no setup) | Lyla projects a harmless holo decoy (a robot-shaped treat, or a hologram of the neighbor yelling "Over here!"). Enemies chase it straight onto Luna's goo and slide into a pile. | Groups and swarms. **The easiest tandem**, designed for the two three-year-olds. |
| 2 | **Luke + Lyla** | **Net Catch** | Exposed | Lyla tags every enemy in view. Luke fires a branching tether net that catches all the tagged ones at once, and they dangle in a bundle. | Swarms, especially flying mosquito drones. |
| 3 | **Paul + Luna** | **Splash Slam** | Slipped | Paul ground-pounds the goo puddle. The splash wave sends every slipped enemy bowling into each other, *strike!* | Groups standing on goo. |
| 4 | **Paul + Luke** | **Rocket Toss** | Tethered | Paul throws Luke like a rocket. Luke flies along his own tether, bounces off the target and lands in a pose. | A single tough enemy, and out-of-reach or flying targets. |
| 5 | **Maria + Luna** | **Bubble Bath** | Bubbled | Maria's bubble fills with Luna's foamy goo, and the enemy is gently **captured** in a pink bubble that floats away. | Thieves (it captures the stolen item too). A completely non-violent capture. |
| 6 | **Maria + Lyla** | **Lullaby** | — (no setup) | Lyla replays a recorded calming sound and Maria's Soothe amplifies it. Creatures calm and wander off, and robots go to "sleep mode." | Animal-like and Act II creatures, and Hush-moths. |
| 7 | **Maria + Luke** | **Bubble Toss** | Bubbled | Luke tethers Maria's bubble and swings it like a hammer, bowling down other enemies before it pops harmlessly far away. | Clearing a path. Mixed groups. |
| 8 | **Luke + Luna** | **Slingshot Slide** | Slipped (a lane) | Luke anchors a tether while Luna lays a slide lane. Luna slingshots down it, bumping every enemy in the lane over. | Lines of enemies, corridors, guards. |
| 9 | **Paul + Lyla** | **Lights Out** | Exposed | Lyla's scan locks on the weak point and Paul lands one precise Dragon Punch on it. The machine powers down instantly. | Armored elites (the alligator's core). |
| 10 | **Paul + Maria** | **Guardian Charge** | — (no setup) | Maria shields Paul and Paul charges in the shield, pushing everything in front of them back into a heap. | Breaking through a wall of enemies, and rescuing a bonked family member. |

Every family member appears in exactly four pairs. Three tandems (1, 6, 10) need **no setup**. They're always reachable, so a struggling player always has a big move available.

### The five-person finisher: "Five Together"

The name is reused from the first joint scene in the suit reveals. When the **Family Spark** meter (§5) is full, all five portraits glow. Tapping triggers a short cinematic: the family links up and forms the shape of the Core's emblem in light, and every enemy on screen resolves. Bosses lose one phase.

- Before the dragon exists in Act I, it forms the emblem. After the dragon is complete, the dragon's silhouette roars in light behind them.

---

## 5. Family Spark (the team meter)

A shared meter shown as the Core's emblem filling with light.

- **It fills from helping:** applying a status (a little), tandems (a lot), reviving a bonked family member, Maria healing someone, and switching characters to set up a tandem.
- **It never drains** from being hit, bonked or slow. Failure never takes anything away.
- **When full,** it enables Five Together. It refills over the course of a fight, so roughly one Five Together per standard encounter.
- It isn't saved between encounters. Each fight starts fresh, which avoids hoarding and confusing state.

---

## 6. Dragon combat (in space and in the sky)

### Flight model

Assisted third-person chase camera, per v0.1. Dragon fights take place in **bounded arenas or guided corridors**: auto-forward flight along a path with free steering within a wide lane (like a gentle, forgiving rail shooter). Free-roam dogfighting is out at first.

| Input | Function |
| --- | --- |
| Move | Steer within the lane. Auto-leveling and gentle collision bumps, never crashes. |
| **Breath** | The dragon's main attack, aimed automatically at the nearest target in front. Act I: **energy breath** (v0.1). Act II upgrade: **Song-breath** (Forge Ring), which also restores color. |
| **Boost** | A short speed burst that also *barrels through* small enemies. |
| **Crew portraits** (five buttons, or one "crew" button that cycles) | Trigger a family member's **dragon station** ability (below). |

### Crew stations: each suit powers part of the dragon

The suits link into the dragon's five seats, which shows the living material and the five seats working together. Each family member operates the dragon version of their own suit ability, so the system has nothing new to learn.

| Seat | Dragon ability | What it does | Status applied |
| --- | --- | --- | --- |
| **Paul** (engines and claws) | **Claw Strike** | The dragon lunges and swipes with its claws or tail. A heavy hit. | Stunned |
| **Luke** (tail and grapple) | **Tail Grapple** | Grab an enemy, debris or an asteroid with the tail tether, and pull or swing it. | Tethered |
| **Maria** (wings and life support) | **Wing Shield** | Wings fold forward into a glowing barrier that blocks a telegraphed attack and slowly repairs the dragon. | — (shield) / Bubbled on contact |
| **Luna** (breath mixing) | **Slick Cloud** | The dragon breathes a pink goo cloud. Enemy ships and drones in it spin out and drift. | Slipped |
| **Lyla** (sensors) | **Star Scan** | A sensor pulse that marks every enemy and reveals weak points and hidden routes. | Exposed |

- Station abilities have **cooldowns** shown as rings on the portraits.
- When the player isn't triggering them, crew members do the **obvious helpful thing** at a slow pace: Maria shields telegraphed big hits (assist setting) and Lyla scans when new enemies appear. The player can always do it first.
- This layout also suits a possible **co-pilot** arrangement later (§10): one child flies while another taps crew portraits.

### Dragon tandems

The same idea as on foot: one station sets up a status and another cashes it in. The game suggests them with paired portraits.

| Stations | Name (working) | Effect |
| --- | --- | --- |
| Lyla + Paul | **Weak-Point Dive** | Star Scan reveals a weak point, then a Claw Strike dive disables the target instantly. |
| Luke + Paul | **Asteroid Pitch** | Tail Grapple catches a drifting rock and Claw Strike throws it into an enemy formation. |
| Luna + Maria | **Goo Storm** | A Slick Cloud is blown outward by a wing gust, and every enemy in range spins out. |
| Maria + Lyla | **Mirror Wing** | The Wing Shield shows Lyla's holo decoy, and enemies attack the decoy dragon instead. |
| Luke + Luna | **Spin-Out Sling** | Tail Grapple hooks a slipped enemy and whips it into the others like a bowling ball. |

**Dragon finisher, "Five-Seat Roar":** with Family Spark full, all five seats light up and the dragon roars. Every enemy on screen resolves. In Act II this is also the story's main weapon against the Quiet, because sound brings things back.

### Bonked, dragon edition

The dragon has **wing energy**. At zero it doesn't crash. It tumbles gently, Maria's station automatically reboots it, and flight resumes after a couple of seconds at the start of the current wave, with progress kept.

---

## 7. Enemy rosters

### Act I: the neighbor's swamp tech (all robots, on foot)

| Enemy | Tier | Telegraph / behavior | Weak to | Resolution | First appears |
| --- | --- | --- | --- | --- | --- |
| **Mosquito Drones** | Swarm, 1 spark | They whine louder before diving. They interrupt Lyla's scans and drain a little suit energy (v0.1). | Exposed (Net Catch), Family Shield reflects | Drops, buzzes sadly and flies home. | Mission 5 (big-box store) |
| **Robo-Iguanas** | Standard, 2 sparks | Climbers. A little "hiss" before they grab. They steal parts and then run. | Slipped, Tethered | Tips over, drops the loot and scuttles back across the street. | Mission 1 (preschool). The real iguana in that mission is soothed, never fought. |
| **Mow-Bot** (lawn-equipment robot) | Standard, 2 sparks | Revs its engine before charging in a straight line. | Slipped (spins out comically) | Sputters, stalls and the grass catcher pops off. | Mission 3 (warehouse store) |
| **Flamingo Decoys** | Trick, 1 spark | Fake flamingos hide a real robot among them. They do nothing until you get near. | Exposed (Lyla spots the real one) | The fake flamingos fall over, and the real one pops out with a "boing." | Mission 4 (grocery) |
| **Sprinkler Turret** | Standard, 2 sparks, static | Ticks before spraying water arcs that push the family back. | Bubbled (shield blocks), Tethered (pull it around) | Fizzles into a harmless dribble. | Mission 4 or 5 |
| **Armored Alligator** | Elite or boss | A slow tail wag, then a long, clearly telegraphed charge. Armor protects its core. | Slipped → Exposed → Lights Out (the v0.1 example) | Rolls onto its back, legs paddling, and powers down. | Mission 6 (rocket facility). Upgraded for the Bridge fight. |
| *Later Florida additions* (v0.1) | — | Python grappler (grabs a family member, and a partner frees them), airboat raider (vehicle fights). | — | — | Only if a mission needs them. |

### Act II: creatures of the Quiet (fantasy, never "evil")

| Enemy | Tier | Behavior | Weak to | Resolution |
| --- | --- | --- | --- | --- |
| **Hush-moths** | Swarm, 1 spark | Grey fluttering things that soak up sound. Nearby colors dim. | Any noise: Lullaby, breath, Five-Seat Roar | Flutter off in a puff of returning color. |
| **Dimmer Clouds** | Standard, 2 sparks, also in space | Moth clouds that block vision and dim the dragon's lights. | Slipped (Slick Cloud scatters them), Song-breath | Disperse into sparkles. |
| **Still Guardians** | Elite, 3 sparks | Old crystal guardians sleepwalking in the Quiet, confusedly defending their worlds. Slow and huge. | Exposed (a muffled "ear" crystal), then a tandem | **They wake up.** They blink, apologize in chimes and become allies who open the way. |
| **The neighbor's leftover drones** (option) | Swarm or standard | Her mosquito drones followed the dragon through the crossing on autopilot, and now the Quiet's moths are riding them. | As in Act I | As in Act I. A comedy callback, and she's mortified. |
| **The Hush** | **Not a fight** | — | — | The climax is an empathy scene, not combat ([Act II](../story/ACT_II_ANSWER_THE_CALL.md) §5). The game should make clear that fighting it doesn't work. |

### Space and sky encounters

| Encounter | Where | Content |
| --- | --- | --- |
| **Flight test** (training) | Act I finale or "Not yet" free play | Builder Bug target drones teach Breath, Boost and one station at a time. No failure. |
| **Drone swarm chase** | Act I finale (optional) | The neighbor's last mosquito fleet chases the dragon's first flight around the neighborhood sky. A lighthearted send-off. |
| **Dimmer fields** | Act II, between worlds | Fly through moth clouds and restore color with Song-breath. |
| **Sleepwalking sentries** | Act II, the Forge Ring | Automated defense engines running haywire in the Quiet. Weak-Point Dive set pieces. |

### Bosses (structure)

Each boss has **2–3 phases**, and each phase teaches or needs one tandem pattern. Between phases there's a short breather with no enemies. Phase progress is **saved**, so a full-family bonk never sends the player back to phase one. Example, the Act I Bridge fight with the upgraded Armored Alligator:

1. **Phase 1: Slip it.** It charges, and Luna's goo makes it overshoot into a wall. It becomes Stunned.
2. **Phase 2: Find the glow.** The armor opens briefly when it's stunned. Lyla scans the glowing Bridge piece inside.
3. **Phase 3: Lights Out.** Paul + Lyla tandem. It powers down, and the story continues with the empathy beat (Act I refinements §5).

---

## 8. Unlock schedule

New tandems arrive at a steady pace, one or two per mission, so each fight adds something.

| Act I mission | Unlocks | Why there |
| --- | --- | --- |
| Backyard ("Five Together" scene) | Basic Actions for all five suits | Suit reveals |
| 1. Preschool | **Decoy Slide** (Luna + Lyla) | It's the girls' mission. Their tandem comes first. |
| 2. Luke's school | **Net Catch** (Luke + Lyla) | Luke's mission |
| 3. Warehouse store | **Splash Slam** (Paul + Luna), **Rocket Toss** (Paul + Luke), Dragon Punch | Paul's mission |
| 4. Grocery | **Bubble Bath** (Maria + Luna), **Lullaby** (Maria + Lyla) | Maria's mission |
| 5. Big-box store | **Bubble Toss** (Maria + Luke), **Slingshot Slide** (Luke + Luna), Spider Pounce | Chase and slip mission |
| 6. Rocket facility | **Lights Out** (Paul + Lyla), **Guardian Charge** (Paul + Maria), **Five Together** finisher | The first full-teamwork set piece |
| Act I finale | Dragon flight, Breath, Boost, all five crew stations | The dragon is complete |
| Act II worlds | Dragon tandems (one or two per world), Song-breath, Five-Seat Roar | Act II progression |

Because missions 2–5 can be played in any order (Act I refinements §4.1), every tandem should be **useful but never required** for a mission other than the one that introduces it.

---

## 9. Assistance, accessibility and the learning boundary

**Action-assistance settings,** kept separate from the learner profile and the selected avatar per the interaction contracts:

| Setting | Effect |
| --- | --- |
| Auto-aim strength | How generously actions snap to targets. Very high by default for young players. |
| Telegraph time | How long enemies wind up. |
| Status duration | How long statuses last. |
| Auto-shield | Maria shields telegraphed big hits automatically. |
| Tandem suggestion | How often and how long the tandem prompt appears. |
| Enemy count | Fewer enemies per wave. |
| Reduced motion and shake | Shorter, calmer tandem animations with the same results. |

**Presets** (names OPEN): *Cuddle* (maximum help), *Adventure* (default), *Hero* (for parents). The setting can be changed any time without penalty. It never changes story outcomes, rewards or learner records.

**Learning boundary:**
- No letters, words or counting questions **inside** combat.
- Learning moments happen **at safe points**: before a fight (an optional "scan the robot" pattern puzzle that gives a small Family Spark head start) or after it.
- A wrong answer never weakens the family or strengthens an enemy.

**Feel and fairness:**
- Enemies **never attack a bonked or reviving family member**.
- No more than a few enemies act at the same time. The rest "wait their turn" visibly, bouncing on the spot.
- Every hazard shows its shape icon and sound, and color is never the only cue.

---

## 10. Open decisions

- **Local co-op.** A second player on the same device, such as a parent controlling a second family member or a child tapping crew portraits, fits this design naturally. It's **not** currently approved, and it must never require a network.
- Final tandem names (the kids could name them), the Family Spark name and visuals, and the preset names.
- Whether the neighbor's hologram in Decoy Slide is too much, or just right.
- Whether real-animal moments (soothing, never fighting) need any extra handling.
- Spark counts and status durations, which should be set by playtesting with the actual players, not decided in advance.
- Whether dragon combat ever goes free-roam, or stays in corridors and arenas.

## 11. Engineering contract (when implemented)

**Content definitions** (data, not code):

- `StatusDefinition`: id, duration, stacking rule, cue references.
- `AbilityDefinition`: already in v0.1. Adds the status applied, the target tags and the station mapping.
- `TandemDefinition`: id, the two member IDs, a required status (or none), effect, cooldown, cinematic reference and reduced-motion reference.
- `EnemyDefinition`: id, tier, sparks, telegraph timings, behavior reference, weakness, resolution reference.
- `EncounterDefinition`: id, waves and phases, checkpoint boundaries, rewards.

**Invariants:**

- Combat state (statuses, sparks, cooldowns, energy, Family Spark) lives in **game state**. Presentation only observes it.
- A tandem's result is **applied once** when it's triggered. The animation plays back the result, and skipping, reduced motion or interruption give the same result.
- Switching avatar, opening the pause menu or reloading **cannot reset** cooldowns or duplicate rewards (interaction contracts).
- Encounter rewards, such as a recovered component, are awarded once, by stable ID, and survive a reload mid-fight.
- Pause freezes all combat timers and releases held inputs.
- A full-family bonk restores the **phase** start state and keeps everything already earned.

**Minimum tests:**

- Each tandem resolves once, including under a double-tap.
- Statuses expire on schedule and pause correctly.
- A full-family bonk keeps phase progress and rewards.
- An avatar switch keeps cooldowns.
- Reduced motion produces the same result.
- Enemies never target a bonked character.
- Reloading mid-fight doesn't duplicate rewards.

## 12. Suggested first combat prototype (not authorized yet)

The smallest slice that proves the system is fun:

- One small arena, such as the backyard or a parking lot.
- **Two** playable family members, for example Luna and Lyla or Paul and Luna, with companion assists.
- Two enemy types: **robo-iguanas** and **mosquito drones**.
- Statuses: **Slipped** and **Exposed**.
- **One** tandem: **Decoy Slide** (no setup) or **Splash Slam** (setup).
- Bonk and revive, no game over, one assist preset.
- Test it with the actual players. Watch whether a three-year-old finds the tandem prompt without help, and whether the five-year-old wants more.

Record results with the [verification receipt](../templates/VERIFICATION_RECEIPT.md). Expand to more suits and tandems only after this slice is fun.
