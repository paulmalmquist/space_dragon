# Ideas — put anything here

Write below in whatever order it occurs to you. Plain text is enough. You can also send ideas in chat or use the local prototype's idea notebook. Notebook entries receive a `NOTE-...` capture ID; agents connect them to `SD-###` tracking IDs when they process the inbox.

## New thoughts

<!-- Add your next thought here. No form required. -->

## Captured and connected

### October 29, 2026 — a project that accepts unordered ideas

Source: owner's IDE request.

> “create a structure in this repo for me to input ideas and have agents know what to adjust along the way. i dont want to think too much about the technical details but rather feed ideas out of order sometimes.”

Receipt: **SD-001** · CONFIRMED · Implemented as this inbox, [agent instructions](../AGENTS.md), [ledger](../docs/project/IDEA_LEDGER.md), [vision](../docs/project/VISION.md), [roadmap](../docs/project/ROADMAP.md), and [status](../docs/project/STATUS.md). Future agents maintain those files as ideas arrive.

### October 29, 2026 — visual ambition and browser delivery

Source: owner's supplied technology discussion, introduced as what they want.

> “rich, close to AAA style as possible but runable on browser with railway backend”

Receipt: **SD-002** · CONFIRMED direction · Routed to [vision](../docs/project/VISION.md). Actual fidelity, target devices, graphics budgets, and backend scope still need evidence. This is an ambition, not a claim of current AAA quality or a working Railway service.

### October 29, 2026 — prepare the foundation

Source: owner's IDE request.

> “please install anything you think would help and create anything you think we need to get started”

Receipt: **SD-003** · CONFIRMED authorization · Local tooling and the small browser foundation are verified; completion evidence and remaining limits are in [status](../docs/project/STATUS.md). Routine implementation choices can proceed under this instruction.

### October 29, 2026 — supplied production recommendations

Source: the recommended technology setup pasted by the owner. These are recommendations to evaluate, not independently confirmed story decisions.

- **SD-004:** Babylon.js + TypeScript, Blender-to-GLB, WebGL2 baseline, browser observation, and local checkpoints before cloud services. Local foundation verified under SD-003; the first pod's technical GLB pipeline is now SD-017, while human art review and the pilot character remain SD-006.
- **SD-005:** First Contact as a compact first slice: living-room computer → interrupted signal → backyard pod → one satisfying interaction → saved checkpoint. PROPOSED production sequence adopted for local foundation work; final playable quality remains to be reviewed.
- **SD-006:** One reviewed pilot character, proposed as Lyla because her reference is labeled, and one finished pod/component through the real browser asset pipeline. PROPOSED art milestone; final character and asset are not delivered.
- **SD-007:** A compact visual board, annotated motion/camera clips, dragon assembly views, photo labels, and sound direction. PROPOSED preparation; useful inputs can arrive incrementally.
- **SD-008:** Test named real devices and controls, then set graphics budgets. The [owner decision](../docs/decisions/2026-10-29-keyboard-first-input.md) confirms keyboard first, Xbox only if it works with no setup, and touch deferred. The later SD-018 follow-up selects this Lenovo with Chrome; actual human/hardware performance remains OPEN.
- **SD-009:** Railway save synchronization and asset hosting when the first prototype establishes a need. PROPOSED later work; account state, cost, authentication, and site integration remain unverified.

Receipt: linked entries are in [the ledger](../docs/project/IDEA_LEDGER.md). Paid art software, subscriptions, generated likeness uploads, additional infrastructure, and an entire game production are not prerequisites for this local setup.

### October 29, 2026 — close First Contact's implementation gaps

Source: owner's IDE request to “get to work on” the supplied gap list and recommended path. These excerpts preserve the requested work; implementing this slice does not approve every proposed lore detail in the script.

> “Make CI test the game. Add Node 24, the build and the browser tests to the GitHub workflow.”
>
> “Pull story state out into its own tested module. Steps follow the First Contact script, suits are granted once, and the save format gets a version 2 that upgrades existing version 1 saves.”
>
> “Finish First Contact against its script.”
>
> “Kid Keys (arrows, Space, Enter).”
>
> “Spoken prompts using the browser's built-in speech as a placeholder narrator, clearly labeled and never a family voice.”
>
> “The hint ladder.” “Five placeholder suit cards.”
>
> “Lyla's scan as the one playable moment, then the town map, with checkpoints along the way.”

Receipt: **SD-014–SD-016** · CONFIRMED implementation scope · CI now includes the game job; the pure state/save module has 17 passing unit cases; the new playable flow is implemented, with final browser/production checks still in progress at this handoff. Agents record final results in [status](../docs/project/STATUS.md) and the task's verification receipt.

### October 29, 2026 — a real pod and the first family playtest

Source: the same owner request.

> “Send the first real asset through the pipeline. Use the pod rather than a person, so it needs no likeness review: Blender → GLB → compressed textures → in the scene, measured.”
>
> “Name the computer and browser, and run a 10-minute keyboard playtest with the kids. Note every point where they need help. That's the real gate for the slice.”

The owner's follow-up names **the current Lenovo with Chrome** as the first family-playtest target. The ten-minute playtest itself has not been observed or reported.

Receipt: **SD-017** · CONFIRMED scope · The pod's technical pipeline is verified in [its receipt](../docs/reports/2026-10-29-pod-asset.md). Blender MCP did not connect; a separate installed Blender process produced the asset without modifying a live scene. Design approval and real AMD-GPU performance remain pending. **SD-018** · CONFIRMED target and requested review · Human keyboard playtest pending.

### October 29, 2026 — language choice and the work after this slice

Source: the same owner request.

> “also is python the best choice or should we convert to rust or C++”

Receipt: **SD-019** · QUESTION / agent recommendation · The game is already TypeScript/Babylon; Python runs repository and asset tooling. Retain that split for this work. Rust or C++ through WebAssembly is an option for a measured compute bottleneck, rather than a rewrite requested by this question. This is technical advice, not a new owner-approved language migration.

The owner's requested sequence puts **Space Blocks and a separate Cadet/Pilot flight prototype after First Contact passes**. Site integration waits for the host repo; Railway waits for a concrete local-save limitation; Line Leader and Act II remain held. The missing Mox/Tavi/Captain Nera/Rook attachment remains **SD-013**, not newly supplied character content.

### October 29, 2026 — home video and a walkable third-person space

Source: owner's IDE conversation, following the discussion of moving beyond the text-driven prototype.

> “sounds good. i also have on my list using a video of my actual house and yard and garage to inform this space. lets put that on the list too. begin with coding the the next step to 3d navigation”

Receipt: **SD-020** · CONFIRMED future reference input · Routed to [the home-video guide](../docs/REFERENCE_HOME_VIDEO.md) and [roadmap](../docs/project/ROADMAP.md). No video has been supplied. New home footage belongs in ignored `assets/reference/local/home/`; the current space is a generic blockout. Video can guide the feeling and relationships between the living room, yard and garage without becoming a public reference asset or an exact home reconstruction.

Receipt: **SD-021** · CONFIRMED bounded implementation scope · A controllable humanoid placeholder, camera-relative WASD/arrows, third-person follow camera, collisions, a living-room doorway/backyard route, nearby computer/pod interactions on Space/Enter, and one training-module pickup that persists on reload. Exploration has its own local save and retains the existing First Contact story flow. The module is a test prop, not a newly approved dragon component or story reward. Implementation and software checks are recorded in [the navigation receipt](../docs/reports/2026-10-29-third-person-navigation.md) and [current milestone](../docs/plans/CURRENT_MILESTONE.md); human keyboard review remains pending. This new owner instruction authorizes the navigation increment before that review; the earlier review gate still applies before treating the slice as polished or expanding into Mission 1.

### October 29, 2026 — high expectations for feel, with a bounded world

Source: owner's follow-up while navigation was being verified.

> “i do have high expectations for this to at least feel like a AAA game. we wont go crazy with customizationsor open world, but it needs to feel right. just a note. so if we need to bring in some beefy compute or new language then so be it”

Receipt: **SD-022** · CONFIRMED quality direction · Reinforces SD-002 with particular emphasis on feel and restrained scope. [The quality bar](../docs/engineering/GAME_FEEL.md) makes movement, camera, animation, interaction feedback, sound and responsiveness explicit review priorities. The navigation blockout is a foundation, not an achieved AAA-quality result. Change tools or implementation language when evidence shows a useful improvement; this does not select a rewrite now.

### October 29, 2026 — available backend/cloud options and current hardware

Source: owner's immediate follow-ups.

> “we also have railway backend and can connect to some cloud computing tools if necessary”
>
> “i dont see myself getting an entire new machine for this project but potentially down the road if that becomes the moat”

Receipt: **SD-023** · CONFIRMED resource direction and hardware preference · Owner reports Railway is available and cloud tools can be connected when needed; actual project/service access remains to be inspected for a concrete task. Keep this Lenovo/Chrome as the initial development and playtest target. Consider cloud production jobs for a measured bottleneck before assuming a replacement machine. No hardware purchase or new cloud service is needed for the current navigation work. Routed to [vision](../docs/project/VISION.md), [quality bar](../docs/engineering/GAME_FEEL.md), and [roadmap](../docs/project/ROADMAP.md).

### October 29, 2026 — a compact, recognizable neighborhood map

Source: owner's follow-ups while the walking increment was being completed.

> “id like a map the size of a small neighborhood and a microcosm of winsotn trails / lake worth all the way to target home depot, lake worth christian and manatee elementary. its ok to use real places”
>
> “wellington target
> home depot on lantana and jog
> you can put a few of those restaurants there too”

Receipt: **SD-024** · CONFIRMED map direction · Build toward a compressed Winston Trails/Lake Worth neighborhood with the named public landmarks. The store clarification identifies Wellington South Target and Lake Worth II Home Depot at Lantana/Jog. A few restaurants are allowed; specific proposed picks are in [the map plan](../docs/world/NEIGHBORHOOD_MAP.md). [The decision](../docs/decisions/2026-10-29-neighborhood-map.md) records the change from the generic blockout and earlier fictional-place guidance. Real names/public landmarks are permitted; scale, road layout and travel times remain design choices to review. The current runtime still covers the living room and yard, not this planned neighborhood.

### October 29, 2026 — Google Maps references

Source: owner's same follow-up.

> “feel free to log images from google maps”

Receipt: **SD-025** · CONFIRMED reference permission · [The reference log](../docs/world/REFERENCE_LOG.md) records Google Maps links, verified public addresses and what each image should inform. Captures belong in ignored `assets/reference/local/neighborhood/`. No Google Maps screenshot was captured in this session: the browser-access host was unavailable, and Computer Use stopped when it could not verify Chrome's current URL. Source links and capture notes are ready for a later capture session; no image is represented as collected or packaged in the game.

### October 29, 2026 — home surroundings and the nearby lake

Source: the owner supplied the exact home address and asked to “just get the surrounding area and the lake too while youre at it.” The complete source wording/address is preserved in ignored local `assets/reference/local/home/OWNER_LOCATION.md`.

Receipt: **SD-026** · CONFIRMED reference scope · Use the supplied home anchor to gather the surrounding neighborhood and nearby lake as local references. [The map plan](../docs/world/NEIGHBORHOOD_MAP.md) now includes the residential surroundings and lake as anchors, with game distances still compressed. The exact address/query and derived vicinity files stay local; the tracked plan records the design intent. No lake name, shoreline, screenshot or new runtime geometry is assumed from the address alone.

### October 29, 2026 — three acts, linear, ending on Viera

Source: owner, in a Claude chat in the Space Dragon project.

> “Read the current state of the repo and start to make a plan to fill in narrative holes .
> We are staying linear but we have a large 3d world or set of worlds. I’d like 3 major acts where the first is on earth and then the dragon allows us to move from planet to planet.”

> “Final landing place is on planet viera where everyone is space travelers”

Receipt: **SD-028** (linear, large worlds, three acts) and **SD-029** (Viera as the final landing) · CONFIRMED direction · Recorded in [the decision](../docs/decisions/2026-10-29-three-acts-linear-and-viera.md). The assistant's [three-act plan](../docs/story/THREE_ACT_PLAN.md) lists the narrative holes this opens.

### October 29, 2026 — fill the holes: upgrades to powers, dogfights between planets

Source: owner, same chat.

> “Ok start filling those narrative holes please. Be creative .
>
> Leave room for suit upgrades and powers when we get to viera. At the start it’s just suit upgrades but then it’s power by the ends
>
> Dragon needs dog fights en route to planets and navigating asteroid Fields etc. feel free ro borrow from something that would be at home in Star Wars and starfield”

> “Can you put those in my space_dragon repo”

Receipt: **SD-030** (suit upgrades, then powers by the end) and **SD-031** (dogfights and asteroid fields between planets) · CONFIRMED direction, details PROPOSED · Recorded in [the decision](../docs/decisions/2026-10-29-three-acts-linear-and-viera.md). **SD-032** · PROPOSED · The assistant's fills are in [Acts II & III: The Road to Viera](../docs/story/ACTS_II_III_THE_ROAD_TO_VIERA.md), awaiting owner review. The last message authorized adding both documents to this repo.

### October 30, 2026 — puzzles that follow the kids' curriculum

Source: owner, Space Dragon chat.

> “We also need to plan puzzles that coincide with my kids curriculum”

> “The girls are learning to recognize numbers and letters and Luke is learning addition/subtraction and how to read”

Receipt: **SD-033** · CONFIRMED curriculum focus; puzzle designs and skill IDs PROPOSED · [Curriculum puzzle plan](../docs/learning/CURRICULUM_PUZZLE_PLAN.md) gives every learning stop in Acts I–III a numbers-and-letters track and a math-and-reading track, driven by a parent's local This Week list. Next: the owner's current letter, number, word and math lists, then one implemented template inside the first built town mission.

Owner request on the same day, “Go ahead and rewrite”, authorized the Act II/III rewrite merged in PR #16 (SD-032).

ID receipt: imported `origin/main` IDs were remapped to **SD-028–SD-033** during the October 30 merge. Original owner wording above is unchanged; [the crosswalk](../docs/decisions/2026-10-30-idea-id-reconciliation.md) preserves the incoming IDs and provenance. Local SD-014–SD-026 retain their existing meanings, and SD-027 records the preserved planet-missions filing.

### October 29, 2026 — account for the planet missions and SOS-composition draft

Source: owner's supplied root Markdown file and cleanup request.

> “SPACE_DRAGON_PLANET_MISSIONS_AND_SOS_COMPOSITION.md
> has this been accounted for? if not file it and if so delete it”

Receipt: **SD-027** · CONFIRMED filing instruction; source campaign content PROPOSED · The source was only partly covered when filed; the newly merged Act II/III rewrites now incorporate some composition ideas. Moved the complete source, byte-for-byte, to [the story folder](../docs/story/PLANET_MISSIONS_AND_SOS_COMPOSITION.md); no duplicate root copy remains. Its shared composition system, six-world development, additional worlds, named-character beats and revisits are now indexed. [The filing receipt](../docs/reports/2026-10-29-planet-missions-filing.md) maps overlaps and unresolved differences against the current linear Act II/Act III/Viera treatment and earlier scripts. This filing does not approve every proposal, update game behavior or supply the absent companion character document.

### October 30, 2026 — three-member missions and the five-planet campaign

Source: owner, IDE chat. Original wording:

> here are some ideas and make sure i can do this from a fresh chat too.
>
> maxium family members in a given mission is 3. you control one and 1 has a sidekick button and largely operates autonomously.
>
> let's lay out the structure of the story as:
> earth, use suits to find parts of dragon
>
> explore planets in other universes by traveling by dragon, interupted by dogfights
>
> 4 planets 5 missions per planet and then 5th and final planet viera where the family moves to
> commit all that structure to the story stuff

Clarification: the agent asked whether Viera also has five missions or a shorter final chapter. Owner answer:

> Viera also has five missions

Receipt: **SD-034** · CONFIRMED active-party maximum and leader/sidekick direction · **SD-035** · CONFIRMED campaign, mission count and Viera relocation · [The campaign contract](../docs/story/CAMPAIGN_STRUCTURE.md) and [decision](../docs/decisions/2026-10-30-campaign-and-mission-party.md) now govern older outlines. Five off-Earth planets × five missions = 25; Earth is additional and its mission count is open. Exact first-four planet names, missions, universe assignments and third-member controls remain proposed/open. [Fresh-chat guidance](../docs/project/FRESH_CHAT.md), AGENTS.md and the CLAUDE.md import preserve the intake path without requiring this conversation. This request records story/party structure; it does not claim a built campaign or autonomous companions.

### October 30, 2026 — Seele prototype games, starting with dragon dogfighting

Source: owner, same IDE session.

> also we are using seele as a way to generate prototype games. this game with be a combo of several games, and i am starting with the dragon dog-fight games

Receipt: **SD-036** · CONFIRMED production direction · [The prototype integration plan](../docs/engineering/PROTOTYPE_INTEGRATION.md) records several prototype games feeding one Space Dragon game, with dragon dogfighting first. [Seele intake](../seeles-assets/README.md) preserves raw exports and routes inspection/migration; the existing upstream intake instructions were reused. A parallel flight prototype does not reorder the Earth-first campaign or prove an export has been integrated. Agents inspect source, dependencies, controls/assets and shared-state boundaries, then choose one useful slice under normal build/playtest checks.


### October 30, 2026 — Town Drive Lab from house and driving videos

> give me a prompt to start working on driving around the 3D environment we can create from my house and the drive i went on. they will be stored as videos in the repo.

Supplied local originals: `assets/reference/videos/IMG_5753.MOV` and `assets/reference/videos/IMG_5754.MOV`. The accompanying Town Drive Lab task authorizes source verification, local-only analysis and reconstruction spike, a separate drivable lab, checks and a PR.

Receipt: **SD-046** · CONFIRMED drivable reference-based environment; lab structure, car tuning, invented connectors and distance factor PROPOSED · [Decision](../docs/decisions/2026-10-30-town-drive-lab.md), [verification](../docs/reports/2026-10-30-town-drive-lab.md). Private footage, derivatives and the real house layout stay local. Production uses a fictional layout. This does not add an Act I mission or settle who drives, the canonical car or town geography. Incoming main reference IDs SD-029/030 and controller SD-038 are source provenance, not replacements for this branch's existing entries.

## October 30, 2026 — Town Drive realism and rule removal (SD-052)

Owner source wording:

> i am overriding privacy rule. i dont know who put that. also this looks too basic. i want pretty close to photorealistic and detailed

> remove the rule

Routing receipt: **CONFIRMED**, technically verified. [Decision](../docs/decisions/2026-10-30-town-drive-detail-override.md) removes the original task’s Town Drive privacy/publication gate. The estimated house layout is bundled; materials, vegetation, lighting, road detail and car are upgraded while retaining driving behavior. [Verification](../docs/reports/2026-10-30-town-drive-detail.md) records passed checks and remaining human review.

## October 30, 2026 — Town Drive traffic and details (SD-055)

Owner source wording:

> fill the world with NPC cars, traffic and a few more details also. dealers choice on details

Routing receipt: **CONFIRMED**, technically verified. [Decision](../docs/decisions/2026-10-30-town-drive-traffic.md) adds traffic previously held outside the first lab increment. Bidirectional NPC vehicles, signal/following behavior and agent-selected street details are implemented; driving/save boundaries remain intact. [Combined verification](../docs/reports/2026-10-30-town-drive-detail.md).

## October 30, 2026 — Town Drive lived-in streets and minivan (SD-057)

Owner source wording:

> lets get some poeple walking around. use real street names please.
> increase the detail on the surroundings too. keep going on photorealism.
> make it a white minivan (looks like honda odyssey)
> also when you look left and right there needs to be development there too.
> make it optional to go into first person view and be concious of how detailed that needs to be in the car

Routing receipt: **CONFIRMED**, technically verified; human appearance/handling review remains open. [Decision](../docs/decisions/2026-10-30-town-drive-lived-in-streets.md) authorizes sidewalk walkers, real route labels, developed side views, an Odyssey-inspired white minivan and optional detailed cabin camera. Retain route, traffic, pause, recovery and separate drive saves. [Verification](../docs/reports/2026-10-30-town-drive-lived-in-streets.md) records actual results and limits.

## October 30, 2026 — Town Drive home-route correction (SD-058)

Owner wording:

> use google maps to understand 6826 starpass court and the culdesac i live on. i drove out to the visitors gate and turned right on hypoluxo. right now its a little wonky compared to reality

Routing receipt: **CONFIRMED**, technically verified; owner road recognition remains open. [Decision](../docs/decisions/2026-10-30-town-drive-home-route.md) supersedes the invented outbound connector; [SD-057/058 verification](../docs/reports/2026-10-30-town-drive-lived-in-streets.md) records source confidence, implementation and checks. Existing privacy override remains active. Preserve the ongoing pedestrians/minivan/detail work.

## October 31, 2026 — Town Drive junctions and vibration (SD-063)

Owner wording:

> make the correct T intersections but just blocked off by cop cars and barracards.
> car is vibrating too much as we drive

Routing receipt: **CONFIRMED**, technically verified; human road-recognition and comfort review remain open. [Decision](../docs/decisions/2026-10-31-town-drive-junctions-and-motion.md) and [verification](../docs/reports/2026-10-31-town-drive-junctions-and-motion.md). Correct junction branches and visible route closures; stabilize presentation without changing physics/checkpoints.
