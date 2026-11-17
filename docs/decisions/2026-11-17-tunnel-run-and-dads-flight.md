# The Tunnel Run: Dad leaves the dragon and flies the tunnel himself — SD-091

November 17, 2026. **OWNER IDEA, captured and routed. BOOKMARKED: wanted, not scheduled. Nothing of the set piece is built.** The beats and Dad's black-and-red armor are the owner's words. Where it goes in the story, how it plays and everything inferred below are PROPOSED or OPEN. No canon was changed except to record the owner's own statement about Dad's armor.

> Here's an idea
>
> Cinematic: “The Tunnel Run”
>
> The dragon races toward a narrow enemy tunnel at tremendous speed. It's too large to fit.
>
> Dad makes a split-second decision.
>
> Ejection: Dad launches out of the dragon, barrel-rolling through the air at full speed.
>
> Transformation: His black-and-red armor ignites its personal flight thrusters.
>
> Transition: The camera follows Dad seamlessly from cinematic into playable third-person flight.
>
> Combat: He rockets into the tunnel, dodging obstacles and engaging smaller enemy targets.
>
> Inspiration: The Death Star trench run from Star Wars: Episode IV, with Iron Man-style flight mechanics.
>
> Gameplay opportunity: Seamless switching between dragon-scale space combat and individual high-speed flight.

## What is new in it

1. **A place the dragon cannot go.** Every flight level drafted so far is flown by the dragon.
2. **Dad flying on his own.** No document gave any family member sustained flight; Dad's kit has a Thruster Hop.
3. **A cinematic that hands control from a vehicle to a person**, at speed, without a cut.
4. **Two scales of flying in one level**: dragon-sized fights and person-sized flight.
5. **Dad's armor is black and red.** His palette was OPEN until now.

## Where it meets what already exists

| Already in the project | Authority | What it means for the Tunnel Run |
| --- | --- | --- |
| Two dragon trench runs are drafted: the **Forge strike run** in Act II and the run along **the Barge** in Act III ([road to Viera](../story/ACTS_II_III_THE_ROAD_TO_VIERA.md), [combat design](../gameplay/COMBAT_SYSTEM.md) §6). | PROPOSED treatments | This is not a duplicate: in those the dragon flies the trench. The Tunnel Run can be the owner's version of either one. **PROPOSED placement: the Forge Ring**, where the drafts already feature Dad ("Paul, then everyone"). The Barge is the alternative. **OPEN** for the owner. |
| **One pilot, no crew roles.** Everyone else in the dragon is a passenger, for show only ([October 29](2026-10-29-alley-oops-and-jet-flight.md)). | CONFIRMED | This is the first time a family member does something of their own during a flight level. **PROPOSED reading that keeps the rule:** there is still one set of controls. At the tunnel mouth the cinematic passes them from the dragon to Dad; nobody else is given a job, a button or a station. What the dragon does while Dad is inside, and who was flying it, are **OPEN**. |
| Swapping the controlled character is not decided ([combat design](../gameplay/COMBAT_SYSTEM.md) §10). | OPEN | "Seamless switching" can mean two things. **Switching at authored moments** (eject here, picked up there) fits everything above and is the PROPOSED default. **Switching whenever the player likes, mid-fight,** is a new system that changes the one-pilot rule and needs an owner decision first. |
| No living pilot is ever shot down; the dragon never crashes fatally; nothing can be lost. | CONFIRMED safeguards; PROPOSED flight rules | They apply to Dad as they do to the dragon. PROPOSED: the tunnel has **no fail state**. A wall is a bump, a shower of sparks and lost speed. Targets are unmanned turrets and drones that power down. |
| No reading while steering at speed ([learning rules](../learning/LEARNING_RULES.md)). | CONFIRMED safeguard | No word, spelling or reading prompt inside the tunnel. The live-spelling exception (SD-041) belongs to the Dogfight Lab's word-charge only. |
| The method for a cinematic that becomes play ([transitions](../engineering/CINEMATIC_TRANSITIONS.md), SD-038), and one verified proof of it, the 12-second launch into flight (SD-073, on the Lenovo). | Method PROPOSED; launch proof technically VERIFIED | Reuse it. The last shot is real-time in the game's own scene; position, heading and speed are matched before control returns; skip, pause and reduced motion reach the same playable state. New here: the subject changes from a dragon to a person many times smaller, so the camera has to close in as it hands over. |
| Flight-assist tiers: Cadet, Pilot, Ace ([combat design](../gameplay/COMBAT_SYSTEM.md) §6). | PROPOSED | PROPOSED: Dad's flight uses the same tier setting and the same steer, aim and fire controls as the dragon, so nobody relearns the controller in the middle of a set piece. In Cadet he cannot hit the walls at all. |
| Dad's abilities: Heavy Lift, Thruster Hop, Knit Repair, later Dragon Punch ([suit reveals](../story/SUIT_REVEALS_AND_STARTING_ABILITIES.md) §8). | PROPOSED | Flight thrusters join the "later" column as the owner's idea. "Transformation" suggests this scene is where the hop becomes flight. When and how he earns it is **OPEN**. |
| Paul's palette. | Was OPEN | **Black and red, in the owner's words.** The suit's design is still OPEN. The placeholder sidekick in Luke's Arena now wears those colors. *Made exact later the same day: always black with red glowing trim ([SD-092](2026-11-17-dads-armor-and-weapons.md)).* |
| Original presentation only: no film or comic names, marks, designs or music. | Practice recorded under SD-087 | The trench and the armored flyer are inspirations for a feeling. The tunnel, the armor, the enemies, the shots and the sound are to be the game's own. |
| At most three family members active in a mission; flight is no exception to that cap ([campaign](../story/CAMPAIGN_STRUCTURE.md)). | CONFIRMED | Unaffected: only Dad is active in the tunnel. How the rest of the family is shown while he is gone is staging, OPEN. |

## What was done now

- The idea is in [the inbox](../../ideas/INBOX.md) as written and in [the ledger](../project/IDEA_LEDGER.md) as SD-091.
- Pointers were added where it will be looked for: the combat design's list of flight levels, the road-to-Viera lane table, the transitions method, Dad's ability and palette lines, the roadmap and status.
- **Dad's placeholder in Luke's Arena is now black and red** in the browser lab and in the Unity runtime's code. That is the one thing in the idea that could be acted on today without building anything new.

## What was not done, and why

**The set piece is not built.** It is parked, for these reasons:

- It belongs to the Unity flight scenes, which were built and verified on the Lenovo. This cloud session has no Unity Editor, and the project asks for one writer at a time there.
- It needs three things that do not exist: a person-sized flight controller, a tunnel to fly, and a handoff from dragon to person. The launch cinematic proves a handoff from cinematic to dragon only.
- Three layers of on-foot work on this branch have still never been opened in Unity or played by anyone. Adding a fourth pillar on top would raise that debt, not the game.

**Revisit when** the owner says to build it, or when the Unity flight scenes are next being extended.

**The first slice worth building then** (PROPOSED, about thirty seconds of play): the verified Dogfight dragon flies at a gate it cannot fit through; Dad ejects; the chase camera closes from dragon to Dad with speed and heading matched; a short, straight, forgiving tunnel is flown with the existing steer, aim and fire controls and no fail state; at the far end the dragon picks him up. *Proof: normal, skipped and paused runs all arrive in the same playable state; fresh input works; a person says whether it feels continuous.*

## Questions only the owner can answer

1. **Where does it go?** The Forge Ring strike run, which the drafts already give to Dad, or the Barge near the end?
2. **Who flies the dragon when Dad jumps?** It holds off on its own, or someone takes over? The rule today is one pilot and no jobs for anyone else.
3. **Is the switch a scripted moment, or free?** Eject here and get picked up there, or change between dragon and Dad at will in any fight? The second changes the one-pilot rule.
4. **Is black and red Dad's armor everywhere**, or only how it looks in this scene? It was taken as everywhere. **Answered the same day: always.** See the update below.

## Update — the fourth question is answered (November 17, 2026, SD-092)

The owner replied: "Always black with red glowing trim (think iron man with a Darth Vader theme)", and added Dad's weapons: "repulsors and samurai style katana with a red light saber on the ground." [The record of that decision](2026-11-17-dads-armor-and-weapons.md) holds the wording, what it supersedes and what is still open. For this set piece it means the armor that ignites is black with red glowing trim, and PROPOSED that his weapon in the tunnel is the repulsors, with the katana kept for the ground. Questions 1 to 3 above are still open, and the set piece is still parked.

## Boundaries

No scene, level, cinematic, flight code, save or campaign slot was added. No purchase, hosting change, deployment, new external generator, likeness or voice is part of this record.
