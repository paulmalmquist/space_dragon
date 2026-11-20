# Unity-native Luke's Playground and a realistic hero stand-in — SD-088

November 15, 2026. **CONFIRMED direction / IMPLEMENTED; Unity import, play and builds NOT TESTED.**

> We're moving to unity and doesn't have to be browser based. I want it good
> Do Luke's playground for me. That indoor scene needs to look like a person. As Photo realistic as possible

## What the owner decided

1. **Unity is the production runtime and the game does not have to run in a browser.** This strengthens [SD-072](2026-10-31-unity-channel-alignment.md): a native Windows player is a first-class target for new work, and a Web build is optional rather than required. The Babylon and Three.js labs remain behavior references and rollback while features migrate.
2. **Build Luke's playground.**
3. **The character in the indoor scene must look like a person, as photorealistic as possible.**

## How it was interpreted

- **Luke's Playground** is a generated scene in the existing `unity/SpaceDragon` project (no second project, no handwritten scene files). It is the SD-087 practice block plus a backyard **playset** — the story has Luke climb the playset's slide tower — with a climbing ramp, a tower deck under a perch mast, a slide and monkey bars. Play starts **indoors in the living room** and leads out through the doorway. It is a practice level. The story mission "M1-4 Playground Chase" (school playground, robot iguana, alley-oop) is not built and is not implied.
- **"Look like a person"** is met with a realistic child model with photographic skin, hair and clothing, authored walk/run loops and facial blend shapes, replacing the capsule and the suited proxy. The same model also replaces the proxy in the browser reference, which is where it could actually be inspected.

## The stand-in is generic and licensed, not a likeness

- Source: Microsoft Rocketbox `Male_Child_01` and four locomotion clips, MIT License, the same library already used for Town Drive pedestrians. Sources, hashes and every processing step are in `PROVENANCE.json` beside the model.
- **No family photo, reference board, scan or voice was read, uploaded or used.** The model is not Luke and must not be described as Luke's likeness. He wears ordinary clothes; Luke's Iron-Spider-inspired suit from the story notes is not represented and suit design stays unapproved art.
- "As photorealistic as possible" is bounded by what can be licensed and committed today: a 6,660-triangle game character with 2048-pixel photographic textures. Film-grade realism or a real likeness would need a scan or a MetaHuman / Character Creator class pipeline, new tools or services, and an explicit owner decision about publishing a child's likeness. That stays **OPEN** and nothing here pre-empts it.

## Engineering choices (routine, reversible)

- Level, scenery specs and motion rules are exported from TypeScript to generated C#, so the Unity scene is drawn from the same data the hero collides with.
- Game rules live in an engine-free `PlaygroundSession` (fixed step, latched jump, one-time sparks, text save). Unity only reads it for drawing.
- Authored loops are baked to plain numbers at scene generation; play mode needs no Animator, controller or humanoid avatar. Jump, fall, swing and landing are procedural poses shared with the browser reference.
- The model ships as plain glTF, bin and PNG files. The cloud session's network could not complete a Git LFS upload, and PNG surfaces are already plain files in this repository.
- The playground uses a private clone of the shared render pipeline and its own `Playground/Generated` folder. The First Contact, Dogfight and Town Drive generators, scenes and shared settings are not edited. An opt-in menu command can dress another scene's proxy player as the stand-in for review.
- The house keeps its roof in Unity; the chase camera is clipped by walls and ceilings instead of using the browser's cutaway.

## Boundaries

- Nothing was run in Unity. Scene generation, glTF import, materials, lighting, play and both builds are NOT TESTED until someone runs the [runbook](../engineering/UNITY_PLAYGROUND_HANDOFF.md) on a machine with the pinned Editor. The C# was compiled outside Unity against public reference assemblies and stubs, which catches language errors only.
- The stand-in, playset layout, lighting and HUD are PROPOSED art until the owner has seen them.
- No purchase, hosting change, deployment, new external generator or likeness publication is part of this work.
