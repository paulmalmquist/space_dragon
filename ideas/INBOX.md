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
