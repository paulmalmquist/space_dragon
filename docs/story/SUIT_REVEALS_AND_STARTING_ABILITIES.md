# Suit Reveals and Starting Abilities

**Date:** October 28, 2026  
**Status:** PROPOSED scene and ability treatment for owner review. It expands Act I scene A1-02 "Five suits".  
**Authority:** [Act I](ACT_I_BUILD_THE_DRAGON.md) remains canon. This document builds on the [Act I refinements](ACT_I_CRITIQUE_AND_REFINEMENTS.md): suits that form around a helpful action (§3.3), and the owner's idea that the material is alive (§3.4, pending confirmation as canon).

## Canon this document must keep

| Fixed | Source |
| --- | --- |
| The suits come from the backyard arrival. The family didn't own them before, and the children don't earn their defining powers through tests. | Act I §A1-02 |
| Paul: Iron Man-inspired powered armor. Luke: Iron Spider-inspired suit. Maria: purple, the healer. Luna: pink, goo that makes enemies slip. Lyla: gathers and stores information. | v0.1 C08–C10, Act I |
| **Lyla's suit color is OPEN.** | AGENTS.md, Act I |
| Each person's introductory contribution: Paul moves a heavy panel and repairs a connection. Luke reaches a high fitting with limbs and a tether. Maria protects the group during a power test and restores suit energy. Luna frees a stuck mechanism. Lyla scans the Core and records signal fragments. | Act I §A1-02 table |
| Retractable helmets keep faces recognizable. The reveals are brief, and there are no five long tutorials. | Act I §A1-02 |
| The suits are original Space Dragon designs, inspired by the listed armors but not copies of film or game models. | [Blender handoff](../BLENDER_CHARACTER_HANDOFF.md) |

Every visual detail, palette (apart from purple and pink), ability name, number and order below is **PROPOSED**.

---

## 1. Scene overview: A1-02 "Five suits"

The backyard, moments after the Builder Core lands. The reveals form a **chain of cause and effect**: each one creates the moment that triggers the next. That makes five reveals feel like one scene.

```
Panel falls on pod → PAUL lifts it          → Core cracks open with a hiss
Hiss startles Luna → MARIA holds her         → calm; the Core begins to hum
Streaks overhead   → LUKE climbs the playset → he sees where they went
Luna, brave again  → LUNA stomps the puddle  → she slides to the Core; her touch wakes it
The Core projects  → LYLA asks "why?"        → her visor records everything → the town map (A1-03)
                   → FIVE TOGETHER: the first joint interaction opens the map
```

**Two versions of each reveal:**

- **Full** (first time): a 15–25 second cinematic. Skippable after it has been seen once, per the [interaction contracts](../gameplay/INTERACTION_CONTRACTS.md).
- **Short** (replay or skip): a 3–5 second "suit up" flourish, used whenever the suit is deployed later.

**State rule:** each reveal grants a suit **once**, by stable ID (`suit_paul`, `suit_maria`, `suit_luke`, `suit_luna`, `suit_lyla`). Skipping a reveal gives the same state as watching it. Replaying it from the archive grants nothing new.

**Living material throughout (pending confirmation):** the suits don't come out of a box. The Core sends out a ribbon of glowing, warm material that *reaches toward* each person while they're helping. It only joins them when they touch it. It never grabs.

### Shared suit language (all five)

- **Material:** living starmetal (name OPEN). Smooth, segmented plates with a faint slow pulse of light in the seams, like breathing. It's warm to the touch and hums the SOS melody softly when the wearer is happy.
- **Emblem:** the Core's symbol, the simple traceable shape from refinement §3.1, on every chest. It glows when the suit is active.
- **Helmet:** folds up from the collar in segments, like a flower closing, and folds back in under a second. Helmets are **down by default** in story scenes, so faces show. They come up for hazards, flight and combat.
- **Retracted state:** when the suit isn't needed, it shrinks to a **cuff** on the wrist, like a bracelet that pulses gently. This solves "do they wear suits to the store?" Suiting up is a tap on the cuff.
- **Mood glow:** the seam light brightens when the wearer is excited and dims when they're sleepy. This is **presentation only**, never health or progress state.
- **Kids' proportions:** the suits fit the kids' real bodies. No muscle sculpting and no adult silhouettes on children.

---

## 2. Paul — A1-02a "Heavy Lifting"

### The moment

The pod's landing knocked a section of the backyard fence flat on top of it. The Core underneath is flickering and sparking weakly. The kids want to run to it. Paul says "Wait. Let me get this off first," and grabs the edge of the panel.

### Reveal beats (full version)

1. Paul strains. The panel is heavier than it looks, since it's wedged.
2. A ribbon of light slides from the pod's seam and touches the back of his **bare hand**. He pauses and looks at it. It waits, pulsing.
3. He keeps lifting. The light flows up his hand and forearm and *forms plates*: knuckles, gauntlet, forearm. The panel gets lighter.
4. The armor builds outward from the arms: shoulders, chest plate (the emblem lights), torso, legs, boots. Each plate *clicks* into place with a deep, satisfying sound, like a heavy drawer closing.
5. He lifts the panel overhead with one arm, surprised, and sets it gently aside.
6. He looks down at himself. The helmet hasn't formed. Only his face shows his reaction.

**Draft dialogue:**

> Paul: "Okay. That's new."
>
> Luke: "DAD. You're IRON—"
>
> Paul: "Let's not say it yet."

The cut-off line is a running gag: someone always starts to name a famous suit and gets interrupted. It's a wink that also avoids naming the inspiration on screen.

### The suit

| Aspect | Proposed design |
| --- | --- |
| Silhouette | The bulkiest of the five: broad shoulders, heavy gauntlets and solid boots. It reads as *strong and protective*, not aggressive. |
| Palette | Red, graphite and gold is the v0.1 candidate. Not locked. |
| Living-material touch | The gauntlet plates overlap like scales and flex when he grips. When damaged, cracks glow and slowly knit shut. |
| Signature details | A bright chest emblem, boot thrusters with a soft blue glow, and forearm vents that breathe out warm air when he lifts. |
| Helmet | A full faceplate. Comes up for hazards and flight. |
| Sound | Deep clicks, a low hum and a "whump" when thrusters fire. |

### Starting abilities

| Ability | What it does | How it's triggered | Limits | First use |
| --- | --- | --- | --- | --- |
| **Heavy Lift** | Lift, carry or brace a **marked** heavy object: panels, pods, crates, doors. | Context action on an object with a heavy-lift marker (a glowing handle outline). Hold-free: tap to grab, tap to set down. | Only marked objects, which keeps it readable. Paul moves slowly while carrying. He can't throw at enemies (yet). | Lifting the fence panel (this scene). |
| **Knit Repair** | Lay a gauntlet on a damaged connection, and the living material knits it back together. Healing, not welding. | Context action on a repair marker (a sparking seam). It completes automatically after a short animation. **No button holding.** | Works only on marked damage to living material or machines. It can't repair people (that's Maria). | Repairing the Core's broken connection in "Five Together" (§7). |
| **Thruster Hop** | A short boot-thruster boost up onto a ledge or across a small gap. | Jump at a hop marker, with an assisted arc that lands automatically. | Not free flight. Flight comes later. | Mission 1 or later; not needed in the backyard. |

**Later, not at start:** *Dragon Punch* (v0.1 proposal), a rocket-assisted strike that breaks marked cracked barriers or pushes an armored robot back. It unlocks during the Act I missions, for example after the Power Module.

**Boundary:** Paul's strength can't replace scanning or agility. He can hold the door once someone else finds the mechanism (v0.1).

---

## 3. Maria — A1-02b "Everybody Stay Together"

### The moment

With the panel off, the Core **cracks open with a sharp hiss** and a burst of light. Luna, who has edged closest, is startled and starts to cry. Maria scoops her up and pulls the other kids behind her. "Everybody stay together."

### Reveal beats (full version)

1. Maria holds Luna close and turns her own back to the light, *shielding*.
2. The ribbon of light arrives and hovers, waiting. Luna, curious through her tears, reaches out and touches it, and **Maria lets her**. Maria's hand is on Luna's back.
3. The light flows through Luna's hand *without staying*. It passes through Luna to Maria. A soft purple glow wraps them **both**, like a bubble, and Luna stops crying. She's staring at the glow.
4. The bubble gently fades and settles onto Maria as a suit: rounded shoulder guards, a fitted purple bodysuit, and violet-white lights along her arms that pulse slowly, like a heartbeat.
5. Two small **support drones** unfold from her shoulder guards (v0.1 proposal) and circle the family once, checking them like curious birds.
6. Maria sets Luna down. Luna is fine and now very interested in the Core again.

**Draft dialogue:**

> Luna: "Mama, you're purple!"
>
> Maria: "I'm purple. Are you okay?"
>
> Luna: *nods, already walking toward the pod*
>
> Maria: "...Stay together *means you too*, Luna."

### The suit

| Aspect | Proposed design |
| --- | --- |
| Silhouette | Rounded and protective. Smooth curves, nothing spiky. Reads as *safe to stand next to*. |
| Palette | **Purple (confirmed)** with violet-white light seams (proposed). |
| Living-material touch | The plates are soft and layered like petals. When she heals, the light flows *outward* from her heart to her hands. |
| Signature details | Two support drones (small, round, bird-like) that drift toward whoever needs help. |
| Helmet | A clear visor with a light purple tint, so her face stays very visible. Comes up only for big hazards. |
| Sound | Warm chimes and a soft rising tone when healing lands. |

### Starting abilities

| Ability | What it does | How it's triggered | Limits | First use |
| --- | --- | --- | --- | --- |
| **Healing Pulse** | Restores a nearby family member, **a suit's energy** (canon: "restore suit energy"), a creature or a plant. | **Routine healing is automatic** when appropriate, carried out by her drones (v0.1). A deliberate pulse is a context action on a glowing "needs help" target. | A forgiving cooldown, with no scarce medical supplies (v0.1). Doesn't revive machines (that's Paul's repair). | Restoring the suits' energy after the power test in "Five Together" (§7). |
| **Family Shield** | A temporary purple dome that protects everyone inside from a clearly signaled hazard. | A deliberate action with a clear on-screen prompt when a hazard telegraphs. It lasts a few seconds and stays up a little longer for slower players (an assistance setting). | One dome at a time. Protects but doesn't attack. | Protecting the group during the Core's power surge in "Five Together" (§7). |
| **Soothe** (passive) | Scared animals and creatures calm down near her: frightened iguanas (real ones), the Act I passenger creature and later the hatchlings. | Automatic within range. | It doesn't stop robots, which are the neighbor's machines. | Mission 1's iguana, which is scared rather than evil. |

**Boundary:** Maria shouldn't be a full-time healing chore (v0.1). The player who controls her contributes actively, and her support keeps running in the background.

---

## 4. Luke — A1-02c "Where Did They Go?"

### The moment

As the Core hums, **more streaks** split off overhead and arc toward town. Luke wants to see where they're going, so he runs to the backyard playset and climbs to the top of the slide tower, then onto the rail. He reaches out too far and slips.

### Reveal beats (full version)

1. Luke climbs fast, pointing at the sky. "There's more! They're going—"
2. He leans out and loses his grip. A short, sharp moment of falling. (Mild peril, resolved within a second.)
3. **Four mechanical limbs** snap out from a ribbon of light at his back and *catch* the rail. He's hanging upside down, dangling, and grinning.
4. The suit forms from the limbs inward: back plate, arms, legs, chest emblem. The limbs flex like they're testing themselves, then fold neatly behind him.
5. A thin glowing **tether** shoots from his wrist to the house roof, and he lowers himself gently to the grass. The tether retracts with a zip.
6. He lands, looks at his hands and at the limbs over his shoulders, and turns to his dad very slowly.

**Draft dialogue:**

> Luke: "Dad. Dad. DAD. I have *extra arms*."
>
> Paul: "I see that."
>
> Luke: "I'm like Spider—"
>
> Paul: "Not yet!"
>
> Luke: "...I saw where they went. Lots of places. One went by my school."

His last line plants the town map and his school mission (A1-03).

### The suit

| Aspect | Proposed design |
| --- | --- |
| Silhouette | Light and sleek, with **four retractable mechanical limbs** (v0.1 proposal) folded behind the shoulders. **Child proportions** are preserved, with no adult muscle shape. |
| Palette | Red and blue armor with metallic gold limbs is the v0.1 candidate. Not locked. |
| Living-material touch | The limbs move a little *on their own*, like curious antennae. They twitch toward interesting things, which is a gentle hint system. |
| Signature details | Wrist tether emitters, a narrow eye-shaped visor and a chest emblem. |
| Helmet | Full mask with large eye lenses. Comes up for climbing sequences and combat, and goes down when he talks to people. |
| Sound | Quick metallic ticks, a "thwip" for the tether and a whirring flex for the limbs. |

### Starting abilities

| Ability | What it does | How it's triggered | Limits | First use |
| --- | --- | --- | --- | --- |
| **Spider Climb** | Climb **marked** surfaces: walls, poles, shelves, playground towers. | Walk into a climb surface (a faint web pattern) and he attaches automatically. Moving up and down works with the same move control. | Only authored climb surfaces, with no unrestricted wall-crawling (v0.1). He can't carry heavy objects while climbing. | Climbing the playset (this scene). |
| **Tether** | Zip a glowing line to a marked anchor to cross a gap, lower down or pull a light object closer. | Context action on a tether anchor (a ring marker). The arc and landing are assisted. | Light objects only. Doesn't pull enemies (yet). | Reaching the Core's high fitting in "Five Together" (§7). |
| **Safety Catch** (passive) | If Luke misses a jump or falls, the limbs grab the nearest ledge or set him down gently. **No restart.** | Automatic. | Can't be turned into a free-flight exploit. It only catches. | The reveal itself (this scene). |

**Later, not at start:** *Spider Pounce* (v0.1 proposal), a forgiving leap that briefly pins a small robot or bounces off a large one.

**Boundary:** when Luke reaches a switch, the route opens for the rest of the party. He must never leave the others stranded on the wrong side (v0.1).

---

## 5. Luna — A1-02d "Splash"

### The moment

Everyone's calmer now. Luna, done with being scared, marches toward the Core with great determination and goes straight through the sprinkler puddle the landing created. She stomps in it on purpose, because it's a puddle.

### Reveal beats (full version)

1. Luna stomps. Splash. She stomps again, laughing.
2. The ribbon of light touches the puddle where she's standing. The water turns **bright pink and bubbly** around her boots.
3. Her next stomp sends her **sliding**. She whooshes across the wet grass in a long, happy slide straight up to the Core, laughing the whole way.
4. The pink goo climbs up her like a wave and settles into a suit: rounded pink plates, a visible **bubbling reservoir** on her back that gurgles like a happy tummy (v0.1 proposal), and little wrist nozzles.
5. She bumps into the Core and puts both hands on it to stop herself.
6. **The Core wakes up.** Its lights steady, its hum becomes a tune (the first notes of the SOS melody) and its "face" turns toward her. This is Luna's hero beat: *she* woke it up, just by being herself.

**Draft dialogue:**

> Luna: "AGAIN!"
>
> Maria: "Luna, is it... okay?"
>
> Luna: *pats the Core* "It's singing."

### The suit

| Aspect | Proposed design |
| --- | --- |
| Silhouette | Small, round and bouncy. Rounded plates and a back reservoir that's visible from every angle. |
| Palette | **Pink (confirmed)**. The goo shows its effect through **animation, sound and surface markings**, never color alone (v0.1). |
| Living-material touch | The reservoir bubbles faster when she's excited and burps when it refills, which is a guaranteed laugh. |
| Signature details | Wrist nozzles and boots that grip normally unless she *chooses* to slide (v0.1). |
| Helmet | A round bubble helmet with her face fully visible. Comes up only for combat. |
| Sound | Squelches, pops and a long "wheee" slide sound. |

### Starting abilities

| Ability | What it does | How it's triggered | Limits | First use |
| --- | --- | --- | --- | --- |
| **Splat** | Shoot a goo blob that makes a **slippery patch**. Charging enemies and robots slide past and spin out, which is funny and harmless. | Aim at the floor or an enemy and tap. **Generous auto-aim** for a three-year-old: tapping near a target is enough. | A few active patches at a time, which clear predictably. They never trap family members, never cover the whole screen and never block required routes (v0.1). | Mission 1's iguana chase (patching the floor so it slides into a corner). |
| **Unstick** | Goo on a stuck mechanism (jammed hinge, seized latch, rusted wheel) loosens it with a satisfying *pop*. | Context action on a stuck marker (a rattling, wobbling object). | Only marked stuck objects. | Freeing the Core's stuck panel in "Five Together" (§7). This is Luna's canon introductory contribution. |
| **Slip 'n Slide** | Lay a slide lane that the whole family can zoom down. It's fast travel, and fun. | Deliberate action at a slide-start marker, then everyone slides along the authored path. | Only at authored slopes and paths, at first. | The reveal itself (this scene). Playable from mission 1. |

**Later, not at start:** *sticky bubble goo* (v0.1 proposal), which traps small enemies in a bubble.

**Boundary:** ordinary goo never traps the family or blocks a required route.

---

## 6. Lyla — A1-02e "Why?"

### The moment

The awakened Core projects a flickering hologram: half of a mechanical dragon, glitching. Everyone stares. Lyla, at the edge of the group, has been asking "why?" about *everything* since the crash. Why is it shiny? Why is it singing? Why is it a dragon? She points at each part of the hologram in turn and keeps asking.

### Reveal beats (full version)

1. Lyla points at the hologram's symbol. "Why's that?" At the streaks in the sky. "Why?" At the dragon. "Why?"
2. The ribbon of light curls toward her, *curious about her curiosity*, and touches her pointing finger.
3. A **visor** slides down over her eyes, transparent so her face is clearly visible. Small shapes appear in it, with the symbol at the center.
4. The suit forms quietly around her: sleek and neat, with a small **scanner companion** (v0.1 proposal) that pops out of her shoulder and hovers next to her like a firefly.
5. She points at the symbol again, and this time her visor *catches* it. A little "ding," and a picture of the symbol appears in a floating card beside her: **her first archive entry**.
6. She points at the Core, the dragon hologram, the sky and her family, ding ding ding ding. She's recording everything. She turns and points at Paul.

**Draft dialogue:**

> Lyla: "Why?"
>
> *ding*
>
> Lyla: *points at Paul* "Why Daddy?"
>
> *ding — a card of Paul in his armor appears*
>
> Paul: "...Okay, I guess I'm in the archive now."

### The suit

| Aspect | Proposed design |
| --- | --- |
| Silhouette | Small, tidy and neat. Fewer plates than the others, with a smooth outline. It reads as *clever* rather than strong. |
| Palette | **OPEN.** Use a neutral placeholder (pearl or silver) marked provisional, per the Blender handoff. Teal and silver is only a candidate. **One story option, for the owner to decide:** her suit shimmers through colors and hasn't "settled" yet, so a color choice can come later in the story or as an in-game choice. |
| Living-material touch | The visor has an iris-like ring that widens when she sees something new. |
| Signature details | A scanner companion (a firefly-sized drone) and floating picture cards for recorded discoveries. |
| Helmet | The visor *is* most of her helmet. A full helmet comes up only for hazards. |
| Sound | Soft dings, page-flip sounds and a gentle "ooh" chime for new discoveries. |

### Starting abilities

| Ability | What it does | How it's triggered | Limits | First use |
| --- | --- | --- | --- | --- |
| **Record** (passive) | Nearby discoveries are saved to the **Family Archive** automatically, as picture cards with short narration. | Automatic. | Records only what the family has actually encountered. **It can't reveal what hasn't been recovered** (Act I §A1-05). | The reveal itself (this scene). |
| **Scan** | Point to reveal something hidden: a mechanism, a pattern, a hidden route, a weak point or the **mood of the living material** (sleepy, scared, happy). | Context action, tapping something with a faint shimmer. Results appear as **pictures and sound, not text** (v0.1 and the learning rules). | Only authored scan targets. Not a free "solve everything" button. | Scanning the Core in "Five Together" (§7). This is Lyla's canon introductory contribution. |
| **Holo Replay** | Project something already in the archive, such as a symbol sequence, an outline or a recorded sound, to help solve a problem. | Choose a card from her archive at a replay target. | Starts with **authored replay targets only** (v0.1). Can replay only what's been recorded. | Replaying the first SOS fragment for the family (§7). |

**Hero beat:** as proposed in the Act I refinements, Lyla is the one who plays the complete SOS at the end of Act I. Her archive is how the family remembers the whole journey.

---

## 7. A1-02f "Five Together": the first joint interaction

The scene that proves the suits work as a team, and the **first playable interaction**. It is the "one supported pod interaction" in SD-M1 (M1-03). It uses each suit's **exact canon introductory contribution**.

**Situation:** the Core is awake, but its projection keeps glitching. It shows half a dragon and then breaks up. It needs to steady itself to show the map. It chirps and points at five places on its own body.

| Step | Who | What | Ability |
| --- | --- | --- | --- |
| 1 | **Luna** | A side panel is jammed shut. Goo, *pop*, and it opens. | Unstick |
| 2 | **Paul** | Behind the panel is a heavy power cell that's out of place. He lifts it and seats it, then knits the cracked connection beside it. | Heavy Lift + Knit Repair |
| 3 | **Luke** | A fitting at the top of the Core's antenna is bent and out of reach. He tethers up and straightens it. | Tether |
| 4 | **Maria** | The Core powers up with a **telegraphed surge**: lights flash and a rising tone plays. She raises the Family Shield, then restores everyone's suit energy. | Family Shield + Healing Pulse |
| 5 | **Lyla** | The projection steadies. She scans it, records the **first SOS fragment** and the **town map**, and replays the fragment for everyone. | Scan + Record + Holo Replay |

**Result:** the town map appears, with glowing symbols at familiar places. This leads straight into A1-03.

### How it plays

- **Order is flexible.** Steps 1–3 can happen in any order. Step 4 follows them, and step 5 comes last.
- **The player taps the glowing target**, and the right family member does the action, so the player doesn't need to switch characters. This is the contextual-assist model from the [interaction contracts](../gameplay/INTERACTION_CONTRACTS.md), and it isn't the Line Leader system.
- A child playing as *any* family member can do the whole scene, with the assigned suits stepping in to act. The avatar choice changes who's highlighted, not what has to be done.
- **No fail state.** If nothing happens for a while, the Core chirps and the next target pulses brighter (hint 1). Then a family member suggests it out loud (hint 2). Then the family does it together on one tap (assisted completion). Assisted completion **advances the scene the same way**.
- **Checkpoint:** saved after the map appears. Reloading mid-scene resumes with completed steps still completed. No step can be awarded twice.

### SD-M1 minimum version

SD-M1 must introduce the suits "without requiring five finished models or five tutorials" (M1-04), so the smallest acceptable build can use:

- Short reveals as **2D portraits or simple placeholder animations**, labeled as placeholders.
- **One** playable target, for example Luna's Unstick or Lyla's Scan. The other four steps play automatically in a short cinematic.
- All five suit IDs granted once at the end of the scene.

The full treatment above is the target, not a requirement for the first build.

---

## 8. Ability summary (starting kit)

| | Exploration | Support / defense | Passive | Later unlock (not at start) |
| --- | --- | --- | --- | --- |
| **Paul** | Heavy Lift, Thruster Hop | Knit Repair | — | Dragon Punch |
| **Maria** | — | Healing Pulse, Family Shield | Soothe, drones' auto-heal | (open) |
| **Luke** | Spider Climb, Tether | — | Safety Catch | Spider Pounce |
| **Luna** | Slip 'n Slide, Unstick | Splat (enemy slip) | — | Sticky bubble goo |
| **Lyla** | Scan, Holo Replay | — | Record | (open) |

How these abilities combine in fights, including tandem attacks and the dragon's crew stations: [combat system](../gameplay/COMBAT_SYSTEM.md).

## 9. Control and accessibility rules (all suits)

- **One move control, one context action and one suit ability.** Abilities fire on marked targets. No combos, no button holding and no rapid tapping (v0.1 and the quality rules).
- Every ability target has its own **shape icon and sound**, not just a color: a handle for lifting, a web for climbing, a ring for the tether, wobble lines for stuck objects, a shimmer for scanning and a heart for "needs help".
- **Ability assistance settings** (auto-aim strength, longer shield duration, slower hazards) are separate from the learner profile and the selected avatar.
- **No ability needs reading.** Scan results, archive cards and prompts are pictures with optional narration.
- Using an ability never costs a learning answer, and a learning challenge never takes away an ability.

## 10. Open decisions

- Confirm or adjust the living-material reveal (it depends on the owner's idea being confirmed as canon).
- The reveal order. This document proposes Paul, Maria, Luke, Luna, Lyla, which follows the cause-and-effect chain.
- Whether Luna touching the light during Maria's reveal works for you, or whether Maria's suit should form on its own.
- **Lyla's suit color**, including whether "the color hasn't settled yet" should be a story element.
- Ability names. All are working titles, and the kids could name some.
- Exact palettes for Paul and Luke. Whether suits retract to a wrist cuff.
- The "Iron… / Spider… / Not yet!" gag: keep it, or avoid any reference to the inspirations on screen.
