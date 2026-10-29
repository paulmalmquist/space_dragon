# What we are making

Space Dragon is a browser family adventure about Paul, Maria, Luke, Luna, and Lyla. Familiar Florida surroundings open into a much larger rescue story. Exploration, early learning, racing, playful combat, and family teamwork all contribute to the experience.

Paul wants to contribute creative ideas without organizing them into technical requirements. The repo should let agents remember decisions, connect ideas received out of order, choose practical implementation steps, and show a playable result that can be adjusted.

## Current creative foundation

The [Act I story](../story/ACT_I_BUILD_THE_DRAGON.md) is the canonical opening. The family is at the living-room computer when an interrupted signal and a backyard arrival introduce rescue equipment. The arrival supplies their suits; other components are recovered around town. Combining them assembles a pre-existing dragon design. The equipment was sent deliberately with an SOS, reached this family accidentally, and ultimately leads them to choose to help in another universe.

The [implementation handoff](../IMPLEMENTATION_HANDOFF.md) retains confirmed suit identities, supported learning, the future Line Leader, route constraints, and publication boundaries. The initial [v0.1 specification](../space-dragon-spec-v0.1.md) remains historical context; its flight-first opening does not replace Act I.

## Visual and technical direction

**CONFIRMED goal, October 29:** rich, cinematic presentation, as close to AAA style as is practical in a browser, with Railway intended for backend services. Recognizable and expressive family characters, engineered armor, strong lighting, satisfying animation, and sound should create the sense of quality. The detailed material palette and final designs still need creative review.

**Selected local foundation under the owner's setup authorization:** Babylon.js and TypeScript; Blender source assets with GLB runtime exports; a tested WebGL2 starting point; versioned local checkpoints; browser checks and screenshots. The engine choice is an implementation decision that can be revised if the existing-site audit uncovers a strong reason. WebGPU and Havok are options to evaluate when a scene or mechanic needs them.

The player's browser renders and runs the game. Railway is intended for later services such as authenticated save synchronization. The actual website framework, Railway project, storage provider, access model, and deployment integration have not been established by this repo. Preserve `paulmalmquist.com/space-dragon` and the existing homepage when integrating.

**PROPOSED first quality benchmark:** the First Contact slice—living-room computer, interrupted signal, backyard pod, one satisfying interaction, and a local checkpoint that survives reload. Start with clear placeholders and establish the whole Blender-to-browser loop with one reviewed asset before producing the entire family and town.

## What remains open

- Named player devices and first supported controls. Desktop 60 fps and a reduced mobile 30 fps mode are suggested targets, not measurements or universal promises.
- Dragon silhouette, scale, access/cockpit, hinges, recovered parts, and assembly states.
- Lyla's suit color, remaining photo identity assignments, and final character/suit reviews.
- SOS sender, emergency, crossing mechanism, and the fictional antagonist's final identity.
- Exact town mission count/order and the future Line Leader implementation schedule.

Agents should make progress on the current slice without inventing those answers as established canon. Refer to the [ledger](IDEA_LEDGER.md) for sources and the [roadmap](ROADMAP.md) for sequencing.
