# Luke's sidekick and the first alley-oop — SD-094

November 17, 2026. **The sidekick and the alley-oop are CONFIRMED concepts; this slice and every detail in it are PROPOSED agent choices. Browser reference IMPLEMENTED and VERIFIED for the named software-rendered checks; Unity IMPLEMENTED, NOT TESTED.** No canon changed.

> What's next

## What was asked, and how it was read

The owner asked what comes next. The answer given in the conversation was the [roadmap](../project/ROADMAP.md)'s order: first see the Unity scenes run on the Lenovo, then put Luke in front of the arena; both need the owner. The agent then took the next step that needs neither, the roadmap's third: **the sidekick**.

**The owner did not ask for a sidekick by name.** This is an agent's routing of an open question, recorded so it can be judged or undone. It is additive: [the receipt](../reports/2026-11-17-lukes-sidekick-and-first-alley-oop.md) says how to remove it.

## What was already decided, and what was chosen here

CONFIRMED by the owner earlier:

- A mission has one controlled member and **one mostly autonomous sidekick with a sidekick button** ([October 30](2026-10-30-campaign-and-mission-party.md)).
- On foot a tandem is an **alley-oop**: one family member launches another, who delivers the finishing move ([October 29](2026-10-29-alley-oops-and-jet-flight.md)).

Those decisions leave open what the button does, where it is bound, how the sidekick moves and who he is. They are settled here **for this lab only**, so the idea can be played and judged:

| Left open | Chosen for the lab | Why |
| --- | --- | --- |
| Who Luke's sidekick is | **Dad.** | The [combat design](../gameplay/COMBAT_SYSTEM.md) names Dad throwing Luke, "Rocket Toss", as the signature move. Change one line of level data to try someone else. |
| How he looks | A helmeted placeholder figure in plain armour. No face, **not a likeness**, not a suit design. | Paul's palette and suit are OPEN. |
| What the one button does | **Beside him, an alley-oop. Anywhere else, a stun.** A ring on the floor around him shows where "beside" is; an arrow over his head shows the throw is on offer. | One button, as everywhere in the arena. |
| His own status | **Stun**: the robot is dizzy and still for 3.2 seconds, with stars round it. **No spark is taken.** | Stunned is Dad's status in the combat design, and its companions "mostly set up so the player gets to finish". A stunned robot is an open finish for Luke's pounce. |
| The alley-oop | Dad throws Luke a little over five metres up, toward the nearest robot. At the top time slows for a second and what the dive will land on glows. Then the **Web Dive**: the nearest robot powers down outright; up to two more in reach lose a spark and are pinned, or power down too if they were already held or stalled. | "A tandem removes all of them, or several from a group." |
| Finishing | **No press is needed.** One press of any action button sends the dive early. | "One tap in total is enough." |
| "Mostly autonomous" | He follows on his own, slides round what is in the way, steps up and gets ready when Luke stops, and **hops to Luke's side** if left far behind or stuck, so nobody is ever lost. He does **not** act on robots unless asked. | Keeps the ring a test of Luke's own abilities, which is what the arena was asked to be. Whether he should step in unasked, as an assist setting, is OPEN. |
| Cooldowns | 3.5 seconds after a stun, 6 after a throw ("catching his breath"). | First guesses. |
| Bindings | **T** or **L**; **B** on a controller. X is now the only action button, so the four face buttons each do one thing. | PROPOSED, like every arena binding. |

### Rules that keep it safe

- **The result of an alley-oop is applied once**, at the instant the dive begins. The dive that follows only plays it back. Mashing every button from the throw to the landing changes nothing.
- **Nothing can hit, bonk or catch Luke** from the throw until he lands, and he lands with a moment of mercy. Throws always land safely.
- **With nothing to land on, the throw is simply a boost**: no slow motion, control straight back, the thruster hop ready. Throw plus hop reaches a six-metre top. This is the design's "alley-oops outside fights".
- **In the stealth yard he keeps watch at the gate** and the button rests. Stealth stays Luke's own test, and the sidekick is never what gives him away. A dive into a watched trial counts as being noticed: nobody dives quietly.
- **Robots ignore him.** They neither see nor strike him. A simplification for the lab; a sidekick with his own suit energy is not built.
- **Nothing new is saved and no star depends on him.** There is no reward to duplicate.
- **Nothing needs reading.** The ring, the arrow, the stars round a stunned robot and the glow on what a dive will hit carry the meaning.

### Not in this slice

Luke as the setter ("Throw me, Dad!" the other way round), the optional "perfect" tap, a third party member, any status besides Stun, the sidekick being bonked or needing help, a bespoke Rocket Toss animation, choosing the sidekick in the game, and sidekicks in the story's missions.

## Engineering choices (routine, reversible)

- The sidekick lives in the same pure fixed-step function as the rest of the arena (`src/game/arena/arena.ts`). Drawing, sound and the page read his state and never write it.
- The throw is real hero physics, so walls and ledges behave; only the short dive is an authored line.
- Slow motion is part of the rules, not a rendering trick: for that second the robots and Luke advance at a fifth of the usual rate.
- TypeScript stays the source of truth. The C# port passes through the same moments as sixteen recorded runs, five of them new, with an extra check at every throw, slow moment, dive, stun and hop.
- The shared chase camera gained one optional request, "pull back", used during a throw so the robots below stay in the picture. Other pages do not pass it.

## Boundaries

- Nothing was run in Unity. The sidekick there is drawn from primitives by code written without an Editor.
- No person has played it. Whether a child finds the ring, wants to stand still for a throw in the middle of a fight, or finds the dive too strong is unknown. The scripted two-player clear of the ring takes 44 seconds: the alley-oop is strong on purpose and is a first guess.
- No purchase, hosting change, deployment, new external tool, likeness or voice is part of this work.

## Update — black and red (November 17, 2026, SD-091)

Later the same day the owner described Dad's armor as black and red, in [the Tunnel Run idea](2026-11-17-tunnel-run-and-dads-flight.md). The placeholder figure was first drawn blue-grey because his palette was OPEN; it now wears black and red in the browser lab and in the Unity runtime's code. It is still a placeholder: helmeted, no face, not a likeness and not a suit design.

## Update — black with red glowing trim, a katana and hand emitters (November 17, 2026, SD-092)

The owner then made it exact: "Always black with red glowing trim", with repulsors and a samurai-style katana as Dad's weapons ([the decision](2026-11-17-dads-armor-and-weapons.md)). The placeholder was redrawn to match in the browser lab and in the Unity runtime's code: black armor, red glowing trim, a sheathed katana across his back and a red emitter in each hand. Nothing in the rules changed. The sword is for show and cannot be drawn; the stun still leaves his open hand as it did before, and now reads as a repulsor. His ring, arrow and stun beam stay amber, because red on the arena floor already means a robot is about to strike. It is still a placeholder: helmeted, no face, not a likeness and not a suit design.
