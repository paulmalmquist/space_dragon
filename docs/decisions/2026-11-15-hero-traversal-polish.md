# Hero traversal for the Earth slice — SD-087

November 15, 2026. **CONFIRMED direction / browser reference technically verified; agent visual inspection only.**

> Polish all facets of this game I'm trying to make. Make it more like spiderman and the dog fight. Needs to have higher quality visuals and better more polished gameplay. Inventory then improve

## What was decided

The inventory covered First Contact, the on-foot Earth slice, the Dogfight Lab, Town Drive, the Unity project, saves, input, audio and tests. The Dogfight Lab and Town Drive already had the most finish. The on-foot slice was the weakest facet: a blocky proxy sliding at constant speed through a small walled yard. It was rebuilt first.

- **Feel, not franchise.** "More like Spider-Man" is read as momentum, air control and swinging. The mechanic is an original energy tether on marked anchors. No Marvel names, marks, suit designs, music or sounds are used or implied.
- **Traversal core.** Pure, fixed-step (120 Hz) rules in `src/game/traversal/`: acceleration and braking, sprint on suit power, a jump whose height follows the held key, coyote time and input buffering, one thruster hop per airtime, a trampoline, tether swings with line of sight, perch anchors that set the hero down on roofs, and a **safety catch** that returns the hero to the nearest footing. There is no fail state, timer or damage.
- **Controls.** Keyboard first: Space is context-sensitive (use a nearby target when grounded, otherwise jump), Shift sprints on the ground and tethers in the air. Controller mapping follows opportunistically. Touch stays deferred.
- **Place.** A generic, fictional home block (house, yard, dock, lake edge, street). It is not the owner's property; the SD-052 real-layout override applies to Town Drive only.
- **Rewards.** Twelve practice sparks. They are practice items, not story parts, are awarded once, and survive reloads. Exploration save is now version 2 under the same key; version 1 saves migrate in memory, the previous bytes are kept as a backup, and newer versions are never overwritten.
- **State and drawing stay apart.** The hero state is authoritative; avatar, camera, effects and audio only read it.
- **Unity.** The same rules were ported to engine-free C# (`unity/SpaceDragon/Assets/SpaceDragon/Traversal/Core`) with generated level data and a golden parity harness, following SD-072.

## Not decided here

- The spark count, anchor placement and tuning are implementation choices and may change after play.
- Sound stays opt-in. Suit design remains unapproved art; Lyla's suit color stays OPEN.
- Dogfight Lab presentation polish was begun and is **parked**: the helper was interrupted mid-change and the owner then redirected the work to Unity (SD-088). Revisit when the owner asks, or when Unity Dogfight needs the same cues. Town Drive and the shared front end were not changed.

## Guidance this extends

[Third-person navigation](2026-10-29-third-person-navigation.md) described walking with collision and one practice pickup. Its interaction targets, independent exploration save and no-teleport test rule are kept; its constant-speed movement is replaced by the traversal core, and its single pickup remains valid inside the larger collectible set.
