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
