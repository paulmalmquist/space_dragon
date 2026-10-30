# Combat System — on foot and in the dragon

**Date:** October 28, 2026  
**Status:** PROPOSED design for owner review. Not implemented and not current scope: [the current milestone](../plans/CURRENT_MILESTONE.md) explicitly excludes complete combat systems from SD-M1. Treat this as the target the first combat prototype is built toward.  
**Builds on:** [suit reveals and starting abilities](../story/SUIT_REVEALS_AND_STARTING_ABILITIES.md), the [interaction contracts](INTERACTION_CONTRACTS.md), the [learning rules](../learning/LEARNING_RULES.md), the [architecture](../engineering/ARCHITECTURE.md), and the [Act I](../story/ACT_I_BUILD_THE_DRAGON.md) / [Act II](../story/ACT_II_ANSWER_THE_CALL.md) story docs.

**Companion notebook:** the [combat notebook](../combat/README.md) turns this design into numbered experiments and 43 Given/When/Then test specifications. These include an **optional** precision-parry profile (CB-002) and a pilot-controlled dragon deflection experiment (CB-004). Neither is required for children or for story progress, and neither restores dragon crew roles.

## 1. Design goals

1. **Depth comes from combinations, not execution.** A three-year-old can win by tapping glowing things. A parent can play smart by setting up alley-oops. Neither needs fast fingers.
2. **Every combat verb is also an exploration verb.** Goo, tether, lift, scan and shield do the same thing in a fight as in a puzzle, so there's nothing extra to learn.
3. **Alley-oops are the heart of it.** On foot, one family member launches another into the air for a finishing move (§4). In the air, the dragon flies like a fighter jet with one pilot and the family along for the ride (§6). The family is stronger together *mechanically*, not just thematically.
4. **Nobody gets hurt and nobody "dies."** Enemies slip, get captured, get disarmed, power down, get calmed or run away (Act I §6). Family members get **bonked**, never injured.
5. **There is never a game over in story fights.** Losing costs a few seconds, never progress.
6. **Combat never requires reading,** and learning never happens mid-fight (learning rules).
7. **It's single-player first.** Family members not under player control act as **companion assists**, which needs no network or backend. Local couch co-op is OPEN (§10).

---

## 2. The shared status system

Every suit applies one main **status**. A status is a visible state on an enemy that other suits can exploit. Statuses make alley-oop finishers stronger (§4).

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

**Input decision (October 29, 2026):** **keyboard first**. An Xbox controller is supported only if it works with no setup (see §6 and [the decision](../decisions/2026-10-29-keyboard-first-input.md)). Touch is deferred.

| Function | Keyboard (default) | Kid Keys (also always active) | Xbox controller (if detected) |
| --- | --- | --- | --- |
| Move (auto-targets the nearest relevant enemy) | WASD | Arrow keys | Left stick |
| **Action** (the suit's basic move) | J | **Space** | A |
| **Suit power** (Family Shield, Slip 'n Slide, Dragon Punch… with a cooldown ring) | K | Right Shift | X |
| **Tandem** (alley-oop, §4) | L | **Enter** | Y |
| Answer a companion's "Throw me!" (be the setter) | L | Enter | Y |
| Switch avatar (cooldowns and statuses persist) | 1–5 | Tab (cycles) | LB / RB |
| Hear the prompt again | H | H | View button |
| Pause | Esc / P | Esc | Menu button |

- **Both keyboard layouts work at the same time**, with no setting to change. A parent can use WASD + J/K/L while a child on their lap uses the arrows, Space and Enter.
- **Kid Keys** keep a young player's hands on the biggest keys: arrows to move, Space to act, Enter for the alley-oop. *Optional idea:* icon stickers on those keys that match the on-screen prompts.
- Three actions plus movement, with no combos, no held buttons and no rapid tapping (on foot). On-screen prompts show **the key or button glyph of whichever device was used last**, plus the action's icon. They never show text alone.

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

## 4. Tandems are alley-oops

**Owner direction (October 29, 2026):** a tandem means the family **alley-oops one another** on foot. A **setter** launches a **finisher** into the air, and the finisher lands the big move from above. See [the decision](../decisions/2026-10-29-alley-oops-and-jet-flight.md).

### How an alley-oop plays

1. **Get close to a family member.** When an alley-oop is available, their portrait pulses with an up-arrow icon and the setter visibly gets ready: Paul cups his hands, Maria puffs up a bubble, Luke anchors a tether, Luna lays a ramp, Lyla projects a pad.
2. **Tap Tandem.** The setter launches you, and the camera follows you up.
3. **Slow motion at the top of the arc** (about 1 second, longer on easier assist settings). Targets below glow.
4. **Tap Action, or tap a glowing target, to finish.** If you don't tap, the finisher automatically picks the best target when the slow motion ends. **One tap in total is enough.**
5. **Land** with a soft suit-cushioned landing, a pose and a family high-five sound.

- **An optional "perfect" tap** at the shine at the very top gives a bigger finish and extra Family Spark. It's never required.
- **You're usually the finisher.** Tapping Tandem launches *you*, so the player gets the dunk.
- **You can be the setter too.** Companions sometimes ask for a launch with a voice line and a cupped-hands icon on their portrait, like *"Throw me, Dad!"* or *"Bounce me, Mama!"*. Tapping it launches them, and they finish automatically. A child playing Paul gets to throw their siblings, and a child playing Lyla gets to launch Dad.
- **Anyone can launch anyone.** The living-material suits do the heavy lifting, so a three-year-old launching Dad works, and it's a joke the game leans into.
- **There are no failures.** Launches always land safely. If a target is gone by the top of the arc, the finisher lands an area move anyway.
- **Each setter has a short cooldown** while they catch their breath, so alley-oops can't be spammed but come around often.
- **No setup is needed:** a nearby partner is enough, so a big move is always available to a struggling player. Statuses (§2) make alley-oops *stronger*. A finisher that lands on a matching status resolves that enemy outright.

### Built from parts: five launches × five finishers

All 20 setter/finisher combinations work in both directions for every pair. They're built from **5 launches + 5 finishers** plus shared transitions, not 20 bespoke animations, which keeps production sane. A few marquee combinations get their own animation (below).

**Launches (what the setter does):**

| Setter | Launch | Arc | Character |
| --- | --- | --- | --- |
| **Paul** | **Power Toss**: cupped hands, a heave, and *up you go* | The highest and farthest. Reaches flying targets. | The classic. Kids thrown by Dad. |
| **Maria** | **Bubble Bounce**: a shield bubble becomes a trampoline | Straight up, very high. **The finisher is shielded the whole flight.** | The safest launch, good for cautious players. |
| **Luke** | **Tether Sling**: anchors a tether and slingshots his partner | Long, fast and flat. It can curve around an anchor point to reach odd angles. | For far-away targets. |
| **Luna** | **Goo Ramp**: a pink slide ramp | Low and fast. The finisher slides first, **bowling over ground enemies**, then launches off the lip. | Great against lines of enemies. |
| **Lyla** | **Holo Pad**: a holographic springboard, plus a landing marker | A medium arc that lands **exactly on her marker**: perfect aim. | Precise. The smallest member launches anyone, which is great comedy. |

**Finishers (what the flyer does at the top):**

| Finisher | Move | Effect | Strongest on |
| --- | --- | --- | --- |
| **Paul** | **Meteor Slam**: a ground pound from height | A big shockwave that Stuns everything nearby. Slipped enemies go bowling. | Slipped groups |
| **Luke** | **Web Dive**: tethers several targets on the way down and pins them | Pins several targets, and **snatches stolen items mid-air**. | Exposed targets and thieves |
| **Luna** | **Goo Bomb**: a goo cannonball | A huge splash that makes the whole area Slipped, so enemies spin into each other. | Anything. The easiest, biggest-feeling finisher. |
| **Maria** | **Shield Drop**: lands inside a dome | The dome Bubbles enemies in it, protects the family and **revives bonked members** inside. | Rescues |
| **Lyla** | **Sky Scan**: scans from the top of the arc | **Exposes everything in the area**, including hidden things, and her finish marks targets for instant follow-up. | Elites and bosses |

### Marquee alley-oops (named, with unique animation)

| Setter → Finisher | Name (working) | What makes it special |
| --- | --- | --- |
| Paul → Luke | **Rocket Toss** | Luke rides his own tether out of Dad's throw and flips into a Web Dive. The signature move. |
| Paul → Luna | **Pink Cannonball** | Luna curls into a ball mid-air for a Goo Bomb the size of the arena. |
| Maria → Paul | **Bubble Rocket** | Maria bounces Paul sky-high in a bubble, and his Meteor Slam is the biggest shockwave in the game. |
| Lyla → Paul | **Tiny Launch** | A three-year-old launches Dad with a holo pad. Paul: *"How did you—"* and then Meteor Slam. |
| Luna → Lyla | **Slide and Spy** | The three-year-olds' own move. Lyla zooms up Luna's ramp and Sky Scans everything. **Unlocked first.** |
| Luke → Maria | **Sling Shield** | Luke slings Maria into the middle of trouble, and her Shield Drop rescues everyone there. |

### Alley-oops outside fights

The same move is a **traversal tool**. Marked **oop spots** (a glowing up-arrow on the ground) let the family boost each other onto high ledges, across gaps and up to high switches. It's the same input and the same animation, which serves design goal 2.

### The five-person finisher: "Five Together", the chain alley-oop

When the **Family Spark** meter (§5) is full, all five portraits glow. Tapping it triggers a **chain alley-oop**: Lyla's Holo Pad launches Maria, whose bubble bounces Luke, who slings Luna, who goo-ramps Paul, who comes down with the biggest Meteor Slam of the fight. Every enemy on screen resolves, and a boss loses one phase. After Act I, the dragon's silhouette roars in light behind the landing.

---

## 5. Family Spark (the team meter)

A shared meter shown as the Core's emblem filling with light.

- **It fills from helping:** applying a status (a little), alley-oops (a lot, and more for a "perfect" tap), reviving a bonked family member, Maria healing someone, being the setter for a companion, and in the dragon, hits and close dodges.
- **It never drains** from being hit, bonked or slow. Failure never takes anything away.
- **When full,** it enables Five Together on foot or the Dragon Roar in the dragon. It refills over the course of a fight, so roughly one per standard encounter.
- It isn't saved between encounters. Each fight starts fresh, which avoids hoarding and confusing state.

---

## 6. The dragon: fighter-jet flight and combat

**Owner direction (October 29, 2026):** the dragon flies like a **flight simulator / fighter jet**. See [the decision](../decisions/2026-10-29-alley-oops-and-jet-flight.md).

### Reconciling a jet sim with young pilots

The v0.1 spec said the *first* control scheme should not require independent pitch, yaw, roll, throttle, weapon selection and camera management. That still holds for the **default tier for young pilots**. The full fighter-jet experience comes from **flight-assist tiers**: the same dragon and the same missions with different control layers. A five-year-old and a parent fly the same sortie, and each gets the jet they can handle.

### Flight model

It should feel like a real fighter jet: **speed and energy matter**. Bank to turn, pull to climb, use throttle and afterburner, and fly high-G turns, loops, barrel rolls and split-S reversals. There is **momentum**, and in the hardest tier, stalls.

- **The dragon animates the flight:** wings sweep back at high speed like a swing-wing jet, the tail works as a rudder, and the wings beat for hover and vertical takeoff.
- **In atmosphere** there's lift and gravity. Climbing costs speed, diving gains it, and stalls matter in Ace tier.
- **In space** the flight assist keeps the dragon handling like a jet (like a space sim with flight assist on). Ace tier can turn flight assist off for drifting, Newtonian-lite flight. The living wings "swim" through space visually.
- **Light speed** stays a short, skippable transition between authored locations (v0.1). It isn't flown.

### Flight-assist tiers

| Tier | For | Controls | Assists |
| --- | --- | --- | --- |
| **Cadet** | Young pilots (Luke) | **One stick:** push the way you want to go, and the dragon banks and climbs there by itself. One Breath button (auto-lock) and one Boost button. | Auto-level, auto-throttle, no stalls, **can't hit the ground or buildings** (gentle bounce-up), strong aim assist, slower enemies and optional auto-evade rolls. |
| **Pilot** (default for adults; arcade-jet feel) | Most players | Pitch and roll on the stick, yaw on shoulder buttons, throttle up and down, gun, lock-on seekers, afterburner and countermeasures. | Optional auto-level, a stall warning with gentle recovery, and collision bounce. |
| **Ace** (sim) | Paul, or anyone who wants it | Full control: pitch, roll, yaw, throttle, energy management, stalls, G-limits, manual aim, and optional flight-assist off in space. | Minimal. There's still **no fatal crash** (see Bonked, below). |

The tier is an **action-assistance setting**, kept separate from the learner profile and the selected avatar. It can be changed at any time without penalty.

### Camera and HUD

- **Chase camera** by default. An optional **cockpit view** shows the five-seat cockpit with the family visible around you. An optional horizon-locked camera reduces motion.
- **The HUD is symbolic, so no reading is needed:** a horizon line (and a pitch ladder in Pilot and above), speed and altitude as bars or tapes, target brackets, a lock-on tone, and a warning tone plus a direction arrow for incoming seekers.

### Takeoff and landing

The dragon can hover, so it can **take off vertically from the cul-de-sac** and land on a spot. Cadet tier has guided takeoffs and landings. Pilot and Ace can fly a manual runway-style landing down the street as an optional challenge.

### Weapons and defenses (non-lethal)

**Owner direction (October 29, 2026):** no crew roles in the dragon. One pilot flies and fights, and the kit is a small, standard fighter-jet set.

| System | Jet equivalent | Function |
| --- | --- | --- |
| **Breath Cannon** | Gun | Rapid short-range energy pulses, with aim assist by tier. |
| **Seeker Sparks** | Missiles | Hold the target in the reticle until the lock tone, then fire homing sparks. Cadet locks automatically. |
| **Afterburner** | Afterburner | A burst of speed and a sharper turn. |
| **Flares** | Flares | Pull incoming seekers away. Cadet fires them automatically. |
| **Song-breath** | — | An upgrade (Act II, the Forge Ring) that restores color and scatters the Quiet. |
| **Dragon Roar** | — | The finisher. With Family Spark full, the dragon roars and every bandit on screen powers down. In Act II it's also the story's weapon against the Quiet. |

### The family on board

The whole family rides in the dragon, but **only the pilot has controls**. Everyone else is a passenger: they appear in cockpit view, cheer at hits, gasp at near-misses, and say an occasional flavor line ("Again!"). That's presentation only, with no abilities, buttons or stations. Threat warnings come from the HUD (a tone plus a direction arrow), not from a crew role.

### Sorties (mission types)

| Sortie | Description |
| --- | --- |
| **Dogfight** | Enemy drone fighters that tail, break and evade. Get behind them and lock on. |
| **Intercept** | Catch the thief drone carrying a stolen part before it escapes. |
| **Escort** | Protect a flock of hatchlings or a slow ship. |
| **Strike run** | A trench-run-style dive along the Forge Ring to disable sleepwalking sentry turrets. |
| **Ring and canyon run** | Aerobatics and racing through rings, canyons and restored spires. No enemies. |
| **Formation flight** | Fly in formation with woken star-dragons as wingmen ("break left!"). |
| **Flight school** | Builder Bug target drones and rings. Teaches each tier with no failure. |

### Air enemies (all unmanned)

**No living pilot is ever shot down.** Disabled drones power down, pop a tiny parachute and drift away, which is also funny.

| Enemy | Where | Behavior |
| --- | --- | --- |
| **Mosquito Squadron** | Act I finale | The neighbor's drone fighters. Fast and nimble, they come in pairs and tail you. |
| **Swamp Blimp** | Act I finale boss (option) | The neighbor's airborne command blimp. It launches drones and has weak points Lyla can find. |
| **Leftover autopilot drones** | Act II (option) | Her drones followed the dragon through the crossing, and now Hush-moths are riding them. |
| **Dimmer Clouds** | Act II | A hazard rather than a fighter. They block vision and dim lights, and Song-breath clears them. |
| **Sleepwalking Sentries** | Act II, the Forge Ring | Automated interceptors running haywire in the Quiet. They wake up friendly once disabled. |

### Bonked, dragon edition

The dragon has **wing energy**. At zero it **doesn't crash**: it tumbles, rights itself, and rejoins at the start of the current wave with progress kept. In Cadet tier hitting the ground is impossible. In Pilot and Ace, terrain contact is a bounce that costs some wing energy.

### Flight controls

Keyboard is the primary flight input. Digital keys are made to feel like a stick through **input ramping**: holding a key eases the control surface toward full deflection over about 0.2–0.3 seconds, and releasing eases it back. Tapping gives small corrections. Pitch inversion is a setting.

| Function | Cadet (keyboard) | Pilot / Ace (keyboard) | Xbox controller |
| --- | --- | --- | --- |
| Steer | Arrows or WASD: the dragon banks and climbs toward the pressed direction | W/S pitch, A/D roll, Q/E yaw | Left stick (pitch and roll; direction in Cadet), LB/RB yaw |
| Throttle | Automatic | R / F (up / down) | RT / LT |
| Afterburner | **Shift**: Boost | Shift, held | RT fully pressed (click) or right stick press |
| Breath Cannon (gun) | **Space**: Breath with auto-lock | Space, held for continuous fire | X, held |
| Seeker Sparks (missiles) | Automatic, with Breath | E fires at the current lock (with a lock tone). T cycles targets. | A fires, Y cycles targets |
| Flares | Automatic | X | B |
| Dragon Roar (when Family Spark is full) | **Enter** | Enter | D-pad up |
| Camera (chase / cockpit) | V | V | View button |
| Flight assist off (Ace, space only) | — | Y | Left stick press |
| Pause | Esc | Esc | Menu button |

- **Cadet on keyboard uses the same three big keys as on foot:** arrows, Space and Enter (Roar), plus Shift to boost. A five-year-old can fly with one hand on the arrows and one on Space.
- **Ace tier is where the keyboard's limits show.** Fine analog control is hard with on/off keys. Ramping and a precision modifier help (holding Ctrl halves control rates). An Xbox controller gives the real stick feel when it works. Mouse-aim flight is a possible later option, not part of the plan now.

### Xbox controller: "works out of the gate" rules

- **No setup screen.** Use the browser's standard gamepad layout. If the controller reports the standard layout, it simply works.
- **Wake prompt.** Browsers typically don't reveal a gamepad to a page until a button on it is pressed. When the game starts, a small controller icon and the voice line "Press any button on your controller" appear. It's dismissible and never blocks play.
- **The keyboard always keeps working**, at the same time as the controller.
- **If the controller is unrecognized or non-standard,** ignore it and show a small "keyboard still works" icon. Never block the game on it.
- **If the controller disconnects mid-play,** pause automatically and release held inputs (interaction contracts).
- **Whether it actually works out of the gate is NOT TESTED.** Check it on the real computer, browser and controller before claiming support. Record the result on a [verification receipt](../templates/VERIFICATION_RECEIPT.md).

### Production caution

The flight model is the **riskiest system in the game** to get right. Build it first as the separately labeled **flight prototype** that Act I already permits: Cadet tier plus one Pilot-tier setup, flight school and one small dogfight, **on keyboard**, with Xbox support added if it works out of the gate. The specific computer and browser are still to be named.

## 7. Enemy rosters

### Act I: the neighbor's swamp tech (all robots, on foot)

| Enemy | Tier | Telegraph / behavior | Weak to | Resolution | First appears |
| --- | --- | --- | --- | --- | --- |
| **Mosquito Drones** | Swarm, 1 spark | They whine louder before diving. They interrupt Lyla's scans and drain a little suit energy (v0.1). | Exposed, then a Web Dive alley-oop. Family Shield reflects them. | Drops, buzzes sadly and flies home. | Mission 5 (big-box store) |
| **Robo-Iguanas** | Standard, 2 sparks | Climbers. A little "hiss" before they grab. They steal parts and then run. | Slipped, Tethered | Tips over, drops the loot and scuttles back across the street. | Mission 1 (preschool). The real iguana in that mission is soothed, never fought. |
| **Mow-Bot** (lawn-equipment robot) | Standard, 2 sparks | Revs its engine before charging in a straight line. | Slipped (spins out comically) | Sputters, stalls and the grass catcher pops off. | Mission 3 (warehouse store) |
| **Flamingo Decoys** | Trick, 1 spark | Fake flamingos hide a real robot among them. They do nothing until you get near. | Exposed (Lyla spots the real one) | The fake flamingos fall over, and the real one pops out with a "boing." | Mission 4 (grocery) |
| **Sprinkler Turret** | Standard, 2 sparks, static | Ticks before spraying water arcs that push the family back. | Bubbled (shield blocks), Tethered (pull it around) | Fizzles into a harmless dribble. | Mission 4 or 5 |
| **Armored Alligator** | Elite or boss | A slow tail wag, then a long, clearly telegraphed charge. Armor protects its core. | Slipped → Exposed → an alley-oop finisher on the core (adapted from the v0.1 example) | Rolls onto its back, legs paddling, and powers down. | Mission 6 (rocket facility). Upgraded for the Bridge fight. |
| *Later Florida additions* (v0.1) | — | Python grappler (grabs a family member, and a partner frees them), airboat raider (vehicle fights). | — | — | Only if a mission needs them. |

### Act II: creatures of the Quiet (fantasy, never "evil")

| Enemy | Tier | Behavior | Weak to | Resolution |
| --- | --- | --- | --- | --- |
| **Hush-moths** | Swarm, 1 spark | Grey fluttering things that soak up sound. Nearby colors dim. | Any noise: Song-breath, Goo Bomb splashes, Dragon Roar | Flutter off in a puff of returning color. |
| **Dimmer Clouds** | Standard, 2 sparks, also in space | Moth clouds that block vision and dim the dragon's lights. | Song-breath, Breath Cannon (in the air), and Slipped on foot | Disperse into sparkles. |
| **Still Guardians** | Elite, 3 sparks | Old crystal guardians sleepwalking in the Quiet, confusedly defending their worlds. Slow and huge. | Exposed (a muffled "ear" crystal), then a tandem | **They wake up.** They blink, apologize in chimes and become allies who open the way. |
| **The neighbor's leftover drones** (option) | Swarm or standard | Her mosquito drones followed the dragon through the crossing on autopilot, and now the Quiet's moths are riding them. | As in Act I | As in Act I. A comedy callback, and she's mortified. |
| **The Hush** | **Not a fight** | — | — | The climax is *Listen → Shelter → Heartnote* ([Act III](../story/ACT_III_THE_ROAD_TO_VIERA.md) §4, Movement 4; moved from Act II). In Shelter, suits and alley-oops **protect** the Hush from noisy echoes, which are tucked away rather than defeated. Nothing attacks it. |

### Acts II and III: Morrow and his hands (PROPOSED)

The villain is **Morrow, the Long Note** (owner-approved villain; mechanics PROPOSED). See the [villain arc](../story/VILLAIN_ARC.md). He fits the confirmed rules: unmanned enemy aircraft, no fatal crashes, and every attack against him targets his **hold**, never his body.

| Enemy | Tier | Behavior | Weak to | Resolution |
| --- | --- | --- | --- | --- |
| **The Sweeper's drones** | Swarm to elite, in the air | Sweeps (fighters), Gnats (swarms), Hooks (grapplers), Haulers (shielded gunships), the Snag Net and the Barge, all running Morrow's rewritten rule, "Bring everyone home." | As in the [Acts II & III overview](../story/ACTS_II_III_THE_ROAD_TO_VIERA.md) § Flight between planets | Power down and parachute away. The Sweeper itself is re-tuned at the Mooring Ring. |
| **Holds** | Hazard, air and foot | Gold bands of Morrow's note that freeze a ship, dragon or family member for a few seconds. | Song-breath in the air; Maria's Sanctuary, or any family member's touch, on foot | Shatter. Nothing is lost while held. |
| **Hold-shards** | Swarm, Shelter phase only | Fragments of his note thrown at the Hush, never at the family. | Shield, goo, tether, Heavy Lift barriers, Lyla's Record, alley-oops | Tucked away, as the drafted echoes were. |
| **Morrow's gaze** | Stealth hazard, the Departure Halls | A slow gold sweep. Caught means held for a moment until another family member frees you. | Cover, timing, a family member's touch | No failure; the gaze moves on. |
| **Morrow** | **Final boss, the Last Hold** | Phase 1, the sky: Holds across the fleeing fleet. Phase 2, his back: on foot with the new powers. Phase 3, the choice: no attack at all. | Song-breath and the Heartnote Roar on his Holds; powers on his back | He lets go of the Heartnote and becomes the Lodestar. He is never struck. |

### Space and sky encounters

The sortie types and air enemies are in §6. Where they fall in the story:

| Encounter | Where | Sortie |
| --- | --- | --- |
| **Flight school** | Act I finale, or "Not yet" free play | Builder Bug targets and rings. Each assist tier is taught with no failure. |
| **First dogfight** | Act I finale (optional) | The Mosquito Squadron chases the dragon's first flight over the neighborhood. A lighthearted send-off, with the Swamp Blimp as an optional boss. |
| **Dimmer fields** | Act II, between worlds | A ring and canyon run through moth clouds, restoring color with Song-breath. |
| **Forge Ring** | Act II | A strike run against Sleepwalking Sentries. |
| **Hatchling escort** | Act II, the Hatchery | An escort sortie. |
| **Wingmen** | Act II, after each dragon wakes | Formation flight with the star-dragons. |

### Bosses (structure)

Each boss has **2–3 phases**, and each phase teaches or needs one teamwork pattern. Between phases there's a short breather with no enemies. Phase progress is **saved**, so a full-family bonk never sends the player back to phase one. Example, the Act I Bridge fight with the upgraded Armored Alligator:

1. **Phase 1: Slip it.** It charges, and Luna's goo makes it overshoot into a wall. It becomes Stunned.
2. **Phase 2: Find the glow.** The armor opens briefly when it's stunned. Lyla scans the glowing Bridge piece inside.
3. **Phase 3: Bubble Rocket.** Maria bubble-bounces Paul over the alligator's armor, and his Meteor Slam lands on the exposed core. It powers down, and the story continues with the empathy beat (Act I refinements §5).

---

## 8. Unlock schedule

**All five finishers** are available as soon as the first launch unlocks. **Launches** unlock one per mission, so each mission adds a new way to throw someone.

| Act I mission | Unlocks | Why there |
| --- | --- | --- |
| Backyard ("Five Together" scene) | Basic Actions for all five suits | Suit reveals |
| 1. Preschool | **Goo Ramp** (Luna) and **Holo Pad** (Lyla) launches, all five finishers, and the **Slide and Spy** marquee | It's the girls' mission. Their alley-oop comes first. |
| 2. Luke's school | **Tether Sling** (Luke), **Sling Shield** marquee | Luke's mission |
| 3. Warehouse store | **Power Toss** (Paul), **Rocket Toss** and **Pink Cannonball** marquees, Dragon Punch | Paul's mission |
| 4. Grocery | **Bubble Bounce** (Maria), **Bubble Rocket** marquee | Maria's mission |
| 5. Big-box store | **Tiny Launch** marquee, Spider Pounce, more **oop spots** in traversal | Chase and slip mission |
| 6. Rocket facility | The **Five Together** chain alley-oop | The first full-teamwork set piece |
| Act I finale | **Flight school**, Cadet/Pilot/Ace tiers, Breath Cannon, Seeker Sparks, afterburner, flares, Dragon Roar, and the Mosquito Squadron dogfight | The dragon is complete |
| Act II worlds | Song-breath, wingman formation flight, and new sortie types per world | Act II progression |

Because missions 2–5 can be played in any order (Act I refinements §4.1), **no mission can require a launch from a different mission**. Paul's Power Toss can't be required at the grocery, for example. Required alley-oops in each mission use launches that are guaranteed to be unlocked by then.

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

- **Local co-op.** A second player on the same device, such as a parent controlling a second family member on foot, fits this design naturally. It's **not** currently approved, and it must never require a network.
- Final names for alley-oops, launches and finishers (the kids could name them), the Family Spark name and visuals, and the preset names.
- **Flight:** how deep Ace tier goes (stalls, G-limits, flight-assist off), whether cockpit view ships early, and whether a Cadet-tier child flies solo or on a parent's lap.
- Whether real-animal moments (soothing, never fighting) need any extra handling.
- Spark counts and status durations, which should be set by playtesting with the actual players, not decided in advance.
- Whether the Swamp Blimp boss and the leftover-drones callback are in.

## 11. Engineering contract (when implemented)

**Content definitions** (data, not code):

- `StatusDefinition`: id, duration, stacking rule, cue references.
- `AbilityDefinition`: already in v0.1. Adds the status applied and the target tags.
- `LaunchDefinition`: setter ID, arc profile, slow-motion window, cooldown and animation reference.
- `FinisherDefinition`: finisher ID, effect, area, status bonuses and animation reference.
- `MarqueeOopDefinition`: setter, finisher, override animation and reduced-motion reference.
- `FlightAssistTier`: input mapping, assists enabled, and aim/stall/collision rules. Stored as an action-assistance setting.
- `SortieDefinition`: id, sortie type, waves, airspace bounds and checkpoint boundaries.
- `EnemyDefinition`: id, tier, sparks, telegraph timings, behavior reference, weakness, resolution reference.
- `EncounterDefinition`: id, waves and phases, checkpoint boundaries, rewards.

**Invariants:**

- Combat state (statuses, sparks, cooldowns, energy, Family Spark) lives in **game state**. Presentation only observes it.
- An alley-oop's result is **applied once**, when the finish resolves (by tap or by auto-target). The animation plays back the result, and skipping, reduced motion or interruption give the same result.
- Switching avatar, opening the pause menu or reloading **cannot reset** cooldowns or duplicate rewards (interaction contracts).
- Encounter rewards, such as a recovered component, are awarded once, by stable ID, and survive a reload mid-fight.
- Pause freezes all combat timers and releases held inputs.
- A full-family bonk restores the **phase** start state and keeps everything already earned.

**Minimum tests:**

- Each alley-oop resolves once, including under a double-tap, a pause during slow motion and an avatar switch mid-air.
- Changing flight tier mid-sortie keeps progress, and no tier can crash the dragon fatally.
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
- **One** alley-oop: **Power Toss → Goo Bomb** (Paul launches Luna), or the reverse, plus one oop spot for traversal.
- Bonk and revive, no game over, one assist preset.
- Test it with the actual players. Watch whether a three-year-old finds the alley-oop prompt without help, and whether the five-year-old wants more.

A **separate flight prototype** should prove the fighter-jet feel: Cadet tier and Pilot tier, flight school, and one Mosquito Squadron dogfight **on keyboard**, then with the Xbox controller if it's detected without setup.

Record results with the [verification receipt](../templates/VERIFICATION_RECEIPT.md). Expand to more suits and alley-oops only after this slice is fun.
