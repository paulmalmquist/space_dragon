# Script — Mission 6: Countdown (the fictional rocket facility, Propulsion Module)

**Status:** PROPOSED draft. Conventions follow [First Contact](A1-00_FIRST_CONTACT.md), and count-based content is in [install parties](A1-05_INSTALL_PARTIES.md). **Always the 6th install:** it unlocks after missions 2–5.  
**Fictionalization (required):**
- A **fictional** rocket company and test site, inspired by Paul's work but with no real name, logo, layout, vehicle or procedures.
- **No restricted operations** are depicted. Everything happens at a fictional **visitor test area** with an old, retired test stand.
- All coworkers are fictional. No workplace recording or upload is implied.

| | |
| --- | --- |
| Featured | **Paul**, then **everyone** |
| Verb | **Test / launch** |
| Component | `component_propulsion` |
| Learning | None graded. An optional countdown is participation only, like the opening. |
| Boss | **Armored Alligator**, the first full five-suit set piece |
| Unlocks | The **Five Together** chain alley-oop |
| Home change | The dragon's **body stands complete**, and then it doesn't wake |
| Callback | The opening's countdown froze at T-minus 3. This one reaches **zero**. |

---

## M6-0 — Take Your Family to Work Day

**[CINE]** Morning at the fictional test site: open scrubland, a visitor center, and in the distance an old, rust-streaked **retired test stand**. The signal comes from *on top of it*. **[MUSIC]** The town theme, reworked with a ticking pulse.

A fictional TEST DIRECTOR meets them at the visitor gate.

> TEST DIRECTOR: "Paul. Your… pod… landed on the old stand. It's been trying to *start itself* all week."
>
> LUKE: "Dad, this is where you WORK?"
>
> PAUL: "A version of it. Stay with Mama."

## M6-1 — The Test Buggy (vehicle challenge)

**[PLAY]** A short, assisted drive: take the site's test buggy (fictional) from the visitor area out to the stand along a dirt track.
- Steering assistance follows the action-assistance setting. Leaving the track nudges you back.
- **No timer, and no reading while driving.**
- Builder Bugs (unlocked in mission 1) ride on the hood, cheering.

*Act I canon calls for "a small test sequence and vehicle challenge."* This is the vehicle half.

## M6-2 — The Test Sequence

At the stand, the Propulsion Module is clamped into the old fittings, **half-firing**: sputtering, coughing sparks, too weak to lift and too strong to touch. It's trying to test itself and failing.

> PAUL: "It needs a proper test. Full sequence. I know how to do that."

**[PLAY]** The test sequence. The family brings it up to a clean, safe firing, one station at a time. Each station has an icon and a spoken prompt:
1. **Paul, Knit Repair:** reconnect the cracked fuel line (living material knitting).
2. **Luke, Tether:** climb the stand and straighten the bent nozzle guide.
3. **Luna, Unstick:** goo the seized valve wheel until it *pops*.
4. **Lyla, Scan:** confirm everything's green on her visor (icons, not words).
5. **Maria, Family Shield:** a dome over the family for the firing.

**Order is flexible for steps 1–4.** Same hint ladder as always.

### The countdown that holds

**[CINE]** The TEST DIRECTOR (on a fictional radio): "Ready for count. On your call, Paul."

> PAUL: "Everybody count."
>
> LUKE (a flicker of memory): "Like the night it started."

**[PLAY, optional, never recorded]** Count down with the family: T-minus 10… The player taps Action on each number for a cheer.

**The rule from the research, adapted:** the countdown **holds whenever the player needs it.** If a step is undone or a child wanders off, the radio says *"Hold, hold, hold. Countdown holding!"* with a friendly beep. It resumes when ready. You **can't fail** a countdown.

> FAMILY: "…five, four, **three**—"

**[MUSIC]** A beat of silence at "three". This is where the opening froze. Then—

> FAMILY: "—two, one… **ZERO!**"

**[CINE]** A clean, roaring test firing. The module glows white-blue, and the old stand shakes off a century of rust-dust. **[MUSIC]** A huge brass chord. Paul's instrument leads.

> LUKE: "WE GOT TO ZERO!"
>
> PAUL (grinning): "We got to zero."

## M6-3 — Ambush at the Stand (boss)

**[CINE]** The ground rumbles. Out of a drainage culvert under the stand rises **the Armored Alligator**: plated, robotic, the neighbor's biggest machine yet. It goes straight for the module. **[MUSIC]** The neighbor's march at full brass, now heavy and stomping. (It's still comic, never menacing.)

> LUNA: "BIG lizard!"
>
> MARIA: "Everybody together. We've practiced this."

**[PLAY]** The boss: Armored Alligator (Elite). It's the first fight that uses **everyone**. Each phase teaches one teamwork pattern. **Phase progress is saved.** A full-family bonk resumes the current phase ([combat system](../../gameplay/COMBAT_SYSTEM.md) §7).

| Phase | Teaches | What happens |
| --- | --- | --- |
| 1: Overshoot | Slip it | It wags its tail slowly (telegraph), then charges in a long straight line. **Luna's goo** makes it overshoot, slide past and crash into a sand berm, and it's Stunned. |
| 2: Find the core | Expose it | While it's stunned, its back plates part for a moment. **Lyla's Sky Scan** (launched by anyone) Exposes the glowing core inside, with the eye icon and target ring. |
| 3: Finish together | An alley-oop finish | **Luke** reaches the core, Web Dive pinning it. **Maria** shields the family as it thrashes. **Paul** holds the stand's damaged access gate open, so nobody's trapped. Then any alley-oop finisher on the Exposed core powers it down. (This is the v0.1 example, rebuilt with alley-oops.) |

**Five Together unlocks** when Family Spark fills during phase 3, with a spoken prompt: "Everybody together!"
- **The chain alley-oop:** Lyla's Holo Pad → Maria's bubble → Luke's sling → Luna's goo ramp → Paul's Meteor Slam.
- If it's used, the alligator loses its phase at once.

**Resolution:** the Armored Alligator rolls onto its back, legs paddling, and powers down with a long, sad *boooop*. Its tail flops. It isn't hurt, just off.

**Clue (if `clue_symbol_in_iguana` is set):** Lyla scans the alligator's core. The **same symbol glows inside, brighter than in the iguanas**. LYLA: "*Lots* of our sparkle." MARIA: "She's got a big piece."

**[STATE]** Unlock: `oop_five_together`. `component_propulsion` is awarded once.

## M6-4 — Home: Install Party (count 6)

Run the [install party](A1-05_INSTALL_PARTIES.md) for **count 6**.

**[CINE]** Every module is docked. The Builder Bugs swarm, and the living material **grows**: ribs, spine, legs and folded wings rise over the backyard until **the dragon's full body stands in the cul-de-sac.** The whole street comes out. The BAKER NEIGHBOR arrives with a dragon-shaped cake. **[MUSIC]** The SOS swells: six notes, brass and everything—

—and **stops one note short.**

The dragon's eyes flicker… and go dark.

> LUKE: "…Why isn't it waking up?"

**[STATE]** `install_count = 6`, `sos_notes_restored = 6`, `dragon_body_complete = true`, `dragon_awake = false` → **[SAVE cp_a1_m6_complete]**

→ Continue directly into [Across the Street](A1-06B_ACROSS_THE_STREET.md).
