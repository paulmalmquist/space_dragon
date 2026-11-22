# November 20 — continuing the Dogfight line: a feel and clarity pass (SD-095)

## What the owner asked

On November 20 the owner wrote:

> Continue codex's progress as it ran out of tokens trying to make my game more AAA. Can you find the branch and sense where we were headed? You can merge any in flight work or just checkout the same branch. Whatever you think is best

**CONFIRMED:** continue the Unity Dogfight line and use judgment about branches.
**The agent's choice, not asked for by name:** which increment to build. Every number in it is a starting guess.

## Where the Dogfight line stood

The line is `feat/dogfight-combat-upgrades`, [PR #35](https://github.com/paulmalmquist/space_dragon/pull/35), fourteen commits from November 1. It was closed out in good order: nothing half-written, all nine switches in use, hosted checks green. Nothing later from Codex is on GitHub. Whether the Lenovo holds later unpushed work cannot be seen from a cloud session.

Its own records name three kinds of unfinished business.

1. **Two things only the owner can do.** The physical PlayStation and family playtest, and a look at the spacecraft pass on the Lenovo. Neither is recorded as done.
2. **The owner's art requests that the receipts say are only partly met.** The planet ("still too low fi", said twice), fire breath that "still reads as an energy lance", a torso that "still reads organic beneath metallic wings", and framing that hides the mouth and crops the tail.
3. **The previous agent's own next step.** "The next HUD polish pass": the normal low-hull warning shows during the SONG comeback, and Gunship and target labels are dense. Also placeholder effects.

## What was chosen, and why

This session ran in a cloud container with **no Unity Editor, no shader compiler and no Blender**. The art requests in group 2 are judged by eye and need shaders or models. Written blind, a shader error turns the planet magenta and nothing here would catch it. They were left alone.

Group 3 and the missing impact feedback are about timing, layout and response. Those can be written as plain rules and proven with tests. So this pass does that:

| Switch (on by default) | What it adds |
| --- | --- |
| `EnableImpactCamera` | A short camera shake and a small lens punch on hits taken, kills, blasts, the claw finisher and the perfect roll. |
| `EnableKillSequence` | A disabled enemy flashes, drifts and tumbles for under half a second, then goes in a shockwave ring with debris. A gas pocket draws a ring at its real reach. |
| `EnableHitConfirm` | A reticle marker when the pilot's own shot lands, is stopped by a shield, or finishes a target. Each has its own shape. |
| `EnableHudClarity` | Each enemy shows its name and one status, never overlapping. During the SONG comeback and a crash, the HUD drops warnings and prompts for actions the pilot cannot take. |

One finding shaped the kill sequence. The existing explosion is a burst of sparks sized for the dragon's own hull: each is under two centimetres wide. Enemies fly 150 m or more away, where that burst works out to a fraction of a pixel. By that arithmetic, a kill until now showed as the drone vanishing, a sound and a line of text. The new sequence is sized in metres and its lines widen with distance. This is arithmetic from the code; nobody has looked at the build to confirm it.

## What it does not change

- No rule, number, control or reward of the eight combat stages. A kill, its count and its one salvage drop happen at the same moment as before; only what is drawn afterwards differs.
- No new button, meter, score or counter shown to the player.
- No art asset, shader, sound file, rig or collider. The new effects are code-built lines on the existing energy shader and are named as placeholders.
- With all four switches off the encounter plays as it did at `combat-upgrades-v002`. The QA fixture `upgrades:off` turns these four off as well. `feel:off` and `feel:on` set only these four.

## How it stays out of the rules

The aim ray, missile lock and breath lock are all computed from the game camera. A shake written straight to the camera would change what a shot hits. So the offset is added to the rendered camera at the end of each frame and removed again before the next step simulates and before a QA snapshot is taken. The chase camera state itself is untouched and its tests still pass.

Reduced motion removes the shake, the lens punch and the wreck's drift and tumble, and shows a small still ring instead. Pause and Restart clear the shake and the marker.

## What is PROPOSED and awaiting the owner

- Whether camera shake is wanted at all for young players, and whether it should start on. It starts on because every stage on this line does, and one switch turns it off.
- Every strength and duration. They are in `DogfightTuning` under "Impact camera", "Kill sequence" and "Hit confirmation".
- Moving the explosion sound of a kill to the moment the wreck goes, about half a second after the last shot. With reduced motion it stays immediate.
- Which status wins when an enemy has several: latched, then wounded, then shielded, then breath lock, then distance.
- Hiding the reticle, weapon panels and control legend during the SONG comeback.

## What stays open

- The owner's art requests in group 2. They need the Editor and the owner's eye.
- Both of the owner's own tests in group 1.
- Sound. Many events still have no cue, and none was added here because none can be heard here.

## Delivery

On November 22 the owner asked: "Can you push all work to main". It was pushed that day. Nothing is deployed.

## Records

[Verification receipt](../reports/2026-11-20-dogfight-presentation-continuation.md) · [how the two lines were joined](2026-11-20-dogfight-and-traversal-integration.md) · [switches and controls](../engineering/UNITY_DOGFIGHT.md) · [the owner's combat brief, whose rules this pass follows](../../ideas/2026-11-01-dogfight-combat-upgrades-source.md)
