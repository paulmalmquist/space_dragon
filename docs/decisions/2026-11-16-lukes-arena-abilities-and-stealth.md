# Luke's Arena: a lab for his abilities, and stealth — SD-093

November 16, 2026. **CONFIRMED direction / browser reference IMPLEMENTED and VERIFIED for the named software-rendered checks; Unity IMPLEMENTED, NOT TESTED.** Rules and numbers are PROPOSED. No canon changed.

> Ok what's next for improvement towards a playable game? Luke's battle arena testing his abilities and stealth needs work

## What the owner asked

1. What comes next on the way to a playable game. The answer is in the [roadmap](../project/ROADMAP.md).
2. A **battle arena for Luke that tests his abilities**.
3. **Stealth needs work.**

Nothing for an arena or for stealth existed in the repository: no enemies on foot, no abilities beyond run, jump and tether, no sight or cover rules. "Needs work" was therefore read as "build it properly", not "retune something that exists".

## How it was interpreted

**Luke's Arena** is a third lab beside Town Drive and Dogfight: one fictional training yard with three trials side by side, entered by stepping over a glowing line and left by stepping back out.

| Trial | What it tests | Three stars |
| --- | --- | --- |
| Ability course | Spider Climb on marked walls, pulling up onto a top, zipping to a perch ring, squeezing up a chimney, a hop onto a crate | every spark found (over any number of visits) · a whole lap inside the silver time · inside the gold time |
| Battle ring | Three waves of robots: Tether Snare, Spider Pounce, reading a telegraph and stepping aside | cleared · cleared without being bonked · cleared without being hit |
| Stealth yard | Reaching a vault past two patrols and a sweeping floodlight | reached · reached without being caught · reached without being noticed |

It is a place to try abilities, not a story mission, and it is not the school "M1-4 Playground Chase".

### Where the rules come from

They implement, in a small form, the PROPOSED [combat design](../gameplay/COMBAT_SYSTEM.md). This lab does not approve that design; it makes part of it playable so it can be judged.

- **Nobody gets hurt and nothing can be lost.** Robots have one or two sparks here (the design allows up to three) and power down with a sad boop. Luke has four points of suit energy; at zero he is bonked for 1.6 seconds, robots lose interest, and he is back at full energy. There is no game over, no fail state and no lost progress.
- **Nothing needs reading.** Every attack is announced for at least a second by the robot's pose, a red lane on the floor and a rising tone. Stars, pips and icons carry the meaning; the text on screen is for adults.
- **One button is enough.** `F` does what counts most to the ringed robot: a quiet pounce if it cannot see Luke, a pounce if it is held or recovering, otherwise a snare. `G` always pounces.
- **Luke's abilities** are the ones the combat design gives him: Spider Climb (marked surfaces only), the tether, and Spider Pounce. Tether Snare is the tether's "Tethered" status used on a robot: held for four seconds and one spark removed.
- **Robots** are the Act I roster: Robo-Iguanas (2 sparks, lunge), Mosquito Drones (1 spark, dive), a Mow-Bot (2 sparks, revs then charges straight, large, so a pounce bounces off it unless it is held or stalled). The Sprinkler Turret is not in the lab.

### Stealth, in one rule

A robot sees Luke only when he is **in range, inside its cone, not above its eye line, and with no cover between them**. What each robot can see is drawn on the floor and is cut off by crates, so the picture and the rule are the same thing.

- Being seen fills a robot's awareness: a look (blue), then curious (yellow, a `?` over its head in the browser), then alert (red, `!`). A glance that breaks off fades away and was never "being seen".
- Sprinting close by and heavy landings are heard. Walking is silent.
- **A quiet takedown needs a robot that has not noticed Luke and cannot see him at that moment**: from behind, from above or out of cover. The target ring turns purple when it is on offer. Walking up to a robot's face and pressing the button is a snare, and Luke has been noticed.
- **The floodlight** uses the shape of the story's "caught means held for a moment … no failure; the gaze moves on": it holds Luke for 1.4 seconds, sets him down at the last hiding place he stood in unnoticed, and goes dark. Each catch on one attempt keeps it dark longer, so nobody can be stuck.
- Robots notice and bother Luke only inside their own trial. Stepping out is always safe.

## What is PROPOSED, CONFIRMED and OPEN

- CONFIRMED by the owner: an arena that tests Luke's abilities, and stealth, are wanted.
- PROPOSED (agent choices for review): the three-trial layout, every number, the star conditions, the robot looks, the HUD, the sounds, key bindings (`F`/`J`/Enter action, `G`/`K` pounce; X/B and Y on a controller).
- OPEN, not decided here: when Luke unlocks Spider Pounce in the story (the combat design lists it as a later unlock; the lab offers it from the start so it can be tried), how these rules meet sidekicks and alley-oops, whether stealth appears in story missions, and Luke's suit design. The stand-in is still the generic licensed child from [SD-088](2026-11-15-unity-native-lukes-playground.md), never a likeness.

## Engineering choices (routine, reversible)

- The rules are one pure fixed-step function (`src/game/arena/arena.ts`) wrapping the existing hero. Rendering, sound and saving read its state and never write it.
- **Spider Climb was added to the shared hero** (`mode: 'climb'`, marked faces listed in the level). Levels without marked faces behave exactly as before; the home block and Luke's Playground have none yet.
- The save holds stars, sparks found, best lap, best wave and a count of quiet takedowns. It holds nothing about a learner. Saving merges with what is stored, so a star is never taken away; a save from a newer build is left untouched; clearing stars takes two deliberate presses and keeps the old save as a backup.
- TypeScript stays the source of truth. `tools/unity/export-arena.mjs` writes the level, the rules' numbers and eleven recorded runs to C#; the hand-written C# port must pass through the same moments.
- The Unity arena is a second generated scene in the existing project (`Space Dragon > Luke's Arena > Generate scene`), sharing the playground's pipeline, helpers and hero. No second project, no handwritten scene files, no edits to the First Contact, Dogfight or Town Drive generators.

## Relation to the combat notebook

The [combat notebook](../combat/README.md) lists 43 specified cases, all NOT TESTED. This lab is the first runnable code near them, on real simulation code rather than a mock. Its tests overlap several cases in spirit (wind-up, commitment and recovery in CB-005-T02; replay determinism in CB-005-T04; targets that clear when hidden or gone in CB-006-T03; rewards kept and no hits while bonked in CB-008-T07/T08). **None was executed as specified** (the cases assume parries, several family members or phases the lab does not have), so the registry is unchanged and still records no passes. Connecting cases one by one is a later, separate step.

## Boundaries

- Nothing was run in Unity. The scene generator, materials (including the see-through sight fans), the spotlight and the HUD are untested until someone runs the [runbook](../engineering/UNITY_PLAYGROUND_HANDOFF.md).
- Browser checks ran under software rendering at roughly three frames a second, which says nothing about hardware performance, feel or difficulty. No person has played it; tuning needs a child and an adult with a real controller or keyboard.
- No purchase, hosting change, deployment, new external generator, likeness or voice is part of this work.
