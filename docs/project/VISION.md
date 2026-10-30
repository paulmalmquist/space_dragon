# What we are making

Space Dragon is a browser family adventure about Paul, Maria, Luke, Luna, and Lyla. Familiar Florida surroundings open into a much larger rescue story. Exploration, early learning, racing, playful combat, and family teamwork all contribute to the experience.

Paul wants to contribute creative ideas without organizing them into technical requirements. The repo should let agents remember decisions, connect ideas received out of order, choose practical implementation steps, and show a playable result that can be adjusted.

## Current creative foundation

The [Act I story](../story/ACT_I_BUILD_THE_DRAGON.md) is the canonical opening. The family is at the living-room computer when an interrupted signal and a backyard arrival introduce rescue equipment. The arrival supplies their suits; other components are recovered around town. Combining them assembles a pre-existing dragon design. The equipment was sent deliberately with an SOS, reached this family accidentally, and ultimately leads them to choose to help in another universe.

The [implementation handoff](../IMPLEMENTATION_HANDOFF.md) retains confirmed suit identities, supported learning, the future Line Leader, route constraints, and publication boundaries. The initial [v0.1 specification](../space-dragon-spec-v0.1.md) remains historical context; its flight-first opening does not replace Act I.

The [story index](../story/README.md) maps the later writing. [Act I refinements](../story/ACT_I_CRITIQUE_AND_REFINEMENTS.md), [suit reveals](../story/SUIT_REVEALS_AND_STARTING_ABILITIES.md), [Act II](../story/ACT_II_ANSWER_THE_CALL.md), [music/empathy/pacing](../story/MUSIC_EMPATHY_AND_PACING.md), and the [production scripts](../story/scripts/README.md) are available for review. Their talking Core, passenger, Bridge piece, musical SOS, Quiet, Caller, Elder Dragon, Hush, and stowaway treatment remain proposals. Living material is recorded as an owner idea whose detailed explanation is proposed. These documents provide possible answers to open lore; their presence does not settle those answers or authorize implementing all scenes.

The current character and planet-mission attachments have now been read in full. [Recent story integration](../story/RECENT_STORY_INTEGRATION.md) records Mox, Tavi, Nera and Rook's proposed roles and the owner's direction to compose the SOS across worlds. It explicitly reconciles selectable-world and home-ending proposals with the confirmed linear route and final landing on Viera.

**Confirmed story structure (October 29):** the story is linear across a large world or set of worlds, in three acts. Act I is on Earth; then the dragon carries the family planet to planet, and the final landing is on planet Viera, where everyone is a space traveler. Suits grow from upgrades into powers by the end, and the dragon dogfights and navigates asteroid fields between planets. See [the decision](../decisions/2026-10-29-three-acts-linear-and-viera.md). The [three-act plan](../story/THREE_ACT_PLAN.md) and [Acts II & III treatment](../story/ACTS_II_III_THE_ROAD_TO_VIERA.md) propose how to fill it in, including Viera's lore, the Sweeper rival and draft powers; those stay proposals.

**Confirmed later gameplay direction:** on-foot tandems are family alley-oops; the dragon has fighter-jet/flight-simulator feel with one pilot and no crew roles. See [the decision](../decisions/2026-10-29-alley-oops-and-jet-flight.md). Detailed combat, ability names, assist tiers, and timing stay proposed unless separately confirmed. These are later production directions, not added scope for the current guided pod prototype.

## Visual and technical direction

**Confirmed musical progression (October 30):** as the family gains powers, their instrumental identities morph into synth voices. See [the decision](../decisions/2026-10-30-powers-to-synth.md) and [music plan](../audio/MUSIC_PLAN.md). Exact instruments, patches and intermediate stages remain proposals; the music has not yet been produced.

**CONFIRMED goal, October 29:** rich, cinematic presentation, as close to AAA style as is practical in a browser, with Railway intended for backend services. Recognizable and expressive family characters, engineered armor, strong lighting, satisfying animation, and sound should create the sense of quality. The detailed material palette and final designs still need creative review.

**Selected local foundation under the owner's setup authorization:** Babylon.js and TypeScript; Blender source assets with GLB runtime exports; a tested WebGL2 starting point; versioned local checkpoints; browser checks and screenshots. The engine choice is an implementation decision that can be revised if the existing-site audit uncovers a strong reason. WebGPU and Havok are options to evaluate when a scene or mechanic needs them.

The player's browser renders and runs the game. Railway is intended for later services such as authenticated save synchronization. The actual website framework, Railway project, storage provider, access model, and deployment integration have not been established by this repo. Preserve `paulmalmquist.com/space-dragon` and the existing homepage when integrating.

**PROPOSED first quality benchmark:** the First Contact slice—living-room computer, interrupted signal, backyard pod, one satisfying interaction, and a local checkpoint that survives reload. Start with clear placeholders and establish the whole Blender-to-browser loop with one reviewed asset before producing the entire family and town.

**Confirmed inputs:** [keyboard first](../decisions/2026-10-29-keyboard-first-input.md). Every required interaction must be completable on keyboard. An Xbox controller is opportunistic only when it works with no setup; plug-and-play behavior is not tested. Touch is deferred. The narrow touch smoke check is supplemental layout evidence, not a commitment to touch support.

## What remains open

- The specific player computer/browser and keyboard playtest acceptance. Controller compatibility remains untested; touch is deferred. Desktop 60 fps is a suggested goal, not a measurement; the earlier reduced mobile 30 fps idea is a future option rather than a current acceptance target.
- Dragon silhouette, scale, access/cockpit, hinges, recovered parts, and assembly states.
- Lyla's suit color, remaining photo identity assignments, and final character/suit reviews.
- Approval or revision of the proposed SOS sender, emergency, crossing mechanism, additional cast, and fictional antagonist identity. The later treatments do not make these canon by themselves.
- Exact town mission count/order and the future Line Leader implementation schedule.

Agents should make progress on the current slice without inventing those answers as established canon. Refer to the [ledger](IDEA_LEDGER.md) for sources and the [roadmap](ROADMAP.md) for sequencing.
