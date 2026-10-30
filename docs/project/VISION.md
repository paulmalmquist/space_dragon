# What we are making

Space Dragon is a browser family adventure about Paul, Maria, Luke, Luna, and Lyla. Familiar Florida surroundings open into a larger rescue story. Exploration, early learning, racing, playful combat, and family teamwork all contribute to the experience.

Paul supplies creative ideas without organizing technical requirements. Agents preserve those thoughts, connect them to decisions, maintain dependencies, make routine engineering choices, and show a playable result that can be adjusted.

## Creative foundation and authority

The [Act I story](../story/ACT_I_BUILD_THE_DRAGON.md) remains the canonical opening: living-room computer, interrupted signal, backyard arrival and suits, scattered town components, assembly of a pre-existing dragon design, and a choice to answer an SOS in another universe. The equipment was deliberately sent, reached this family accidentally, and did not select them in advance. They did not invent the dragon.

The [story index](../story/README.md) and [production scripts](../story/scripts/README.md) organize the later writing. Act I refinements, suit-reveal details, Act II, music/empathy/pacing, the talking Core, passenger, Bridge, Quiet, Caller, Hush and other dependent lore remain at their recorded proposal/owner-idea status. The selected short-form First Contact implementation does not approve every treatment detail. Living material is an owner idea with proposed explanations.

The root `new characters` file only mentions Mox, Tavi, Captain Nera, Rook and a Hush clue. Their referenced attachment and dialogue are missing. Do not assign them roles or invent that source.

**Confirmed later gameplay direction:** on-foot tandems are family alley-oops; dragon flight has a fighter-jet/simulator feel with one pilot and no crew roles. [The gameplay decision](../decisions/2026-10-29-alley-oops-and-jet-flight.md) owns that direction. Detailed combat, assist tiers and timing remain proposed and outside First Contact.

**Confirmed story structure (October 29):** the story is linear across a large world or set of worlds, in three acts. Act I is on Earth; then the dragon carries the family planet to planet, and the final landing is on planet Viera, where everyone is a space traveler. Suits grow from upgrades into powers by the end, and the dragon dogfights and navigates asteroid fields between planets. See [the decision](../decisions/2026-10-29-three-acts-linear-and-viera.md). The [three-act plan](../story/THREE_ACT_PLAN.md) and [Acts II & III treatment](../story/ACTS_II_III_THE_ROAD_TO_VIERA.md) propose how to fill it in, including Viera's lore, the Sweeper rival and draft powers; those stay proposals.

**Confirmed curriculum focus (October 30):** numbers/letters for the girls and addition/subtraction/reading for Luke inform [the curriculum puzzle plan](../learning/CURRICULUM_PUZZLE_PLAN.md). The proposed puzzle tracks use a parent's local content list; no learning implementation or assessment claim follows from the plan.

## Current production direction

**Confirmed goal:** rich cinematic presentation, as close to AAA style as practical in a browser, with Railway intended for later backend services. Recognizable family characters, engineered armor, strong lighting, animation and sound should create quality. Current placeholders and a technical pod candidate are not that final visual standard.

**Confirmed quality emphasis:** the game must feel right, with AAA-like care in a bounded world rather than extensive customization or open-world scale (SD-022). [The game-feel bar](../engineering/GAME_FEEL.md) guides camera, movement, animation, interaction feedback, sound and responsiveness reviews. Technical navigation checks establish working controls, not this final quality standard.

**Confirmed world scale and anchors:** a small-neighborhood microcosm of Winston Trails/Lake Worth, with compressed connections to Wellington South Target, Home Depot at Lantana/Jog, Lake Worth Christian, Manatee Elementary and a few nearby restaurants (SD-024). Real place names and public landmarks are allowed. [The map plan](../world/NEIGHBORHOOD_MAP.md) separates those confirmed anchors from its proposed layout. Google Maps reference logging is authorized (SD-025); source links are recorded, images still pending. The runtime currently contains only the generic room/yard.

The owner also supplied a home anchor and requested the surrounding streets and nearby lake (SD-026). Keep the exact location in local reference notes while using it to inform the compressed residential/lake setting. Actual home footage has not arrived.

**Resources and hardware:** the owner reports an available Railway backend and willingness to connect cloud compute if useful (SD-023); actual service/project access has not been inspected. Keep this Lenovo with Chrome as the initial target. A replacement computer is not planned now. Use measured bottlenecks to justify cloud production work, runtime changes or a later hardware discussion.

**Authorized increment:** follow the First Contact script through living-room signal, backyard, five placeholder suit introductions, Lyla's supported scan, symbol archive and town map. It should work without reading through spoken placeholder prompts, pictured targets, Kid Keys and an escalating help path. Assisted completion advances the same story; the scan is not a reading assessment or mastery claim. Checkpoints and one-time rewards belong to a pure state module.

**Latest authorized increment — walking:** a visible provisional person explores the living room and backyard with a third-person camera, collisions and nearby interactions. A practice pickup and position save live independently of First Contact rewards. This reversible movement slice is explicitly authorized now; it does not wait for the earlier story's human playtest. The owner also wants video of the actual house, yard and garage to inform a later environment pass. [The video idea](../REFERENCE_HOME_VIDEO.md) is recorded, but the current layout is generic and the garage is a backdrop.

**Confirmed first target:** this Lenovo 82XM with Chrome, on keyboard. In walking mode WASD/arrows move, drag or Q/E turns the camera, R recenters, and Space/Enter interacts nearby. In the story, arrows point and Space/Enter acts. An Xbox controller is opportunistic only if it works with no setup; that behavior is untested. Touch is deferred. Human movement feel and the ten-minute family story playtest, including audibility/help points, remain review gates; automated evidence does not replace them.

**Engineering split:** TypeScript/Babylon runs the browser game; Python runs small repository/asset tools. Retain that existing split for this increment. The owner's Rust/C++ question is not a request to rewrite the game. A Rust/C++ WebAssembly module can be evaluated later for a measured compute bottleneck; changing tooling language alone does not improve visuals. WebGPU and Havok also await a concrete measured need.

**Asset proof:** the original rescue-pod candidate now passes Blender → GLB → ETC1S KTX2 → actual browser loading with preserved lid/clip names and self-hosted decoding. [Its receipt](../reports/2026-10-29-pod-asset.md) records technical results; human art approval and real-GPU performance remain separate. Family characters still need their reference and likeness reviews.

The player's browser renders and runs the game. Keep the planned `paulmalmquist.com/space-dragon` prefix and existing homepage when integration becomes possible. Actual website source/routing/deployment and Railway services remain unverified. Local saves come first; backend expansion needs a concrete requirement.

## What remains open

- Ten-minute Lenovo/Chrome playtest, actual audible narration, child-friendly controls/feel and measured hardware budgets. Desktop 60 fps remains a goal, not an achieved result.
- Final dragon silhouette, scale, cockpit/access, hinges, recovered parts and assembly states.
- Lyla's final suit color, remaining photo labels, and family likeness/suit approvals.
- Approval or revision of proposed SOS sender/emergency/crossing and additional cast.
- Exact town mission count/order, future Line Leader schedule and site/backend integration.

[Status](STATUS.md) owns actual evidence; [the ledger](IDEA_LEDGER.md) owns traceability; [the roadmap](ROADMAP.md) sequences work without requiring Paul to sort new ideas first.
