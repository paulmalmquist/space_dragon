# Ideas — put anything here

Write below in whatever order it occurs to you. Plain text is enough. You can also send ideas in chat or use the local prototype's idea notebook. Notebook entries receive a `NOTE-...` capture ID; agents connect them to `SD-###` tracking IDs when they process the inbox.

## New thoughts

<!-- Add your next thought here. No form required. -->

## Captured and connected

### October 30, 2026 - testing features and finding integration blind spots

Source: owner, follow-up to the cinematic scoping discussion. Original wording:

> ok and while we are at it how do we go about testing all of this? what are my blind spots for incubating these disparate features and blending them together in the end?

Receipt: **SD-039** - CONFIRMED request for testing guidance and integration assessment; proposed coverage and sequencing **planned**. [The integration test plan](../docs/engineering/INTEGRATION_TEST_PLAN.md) audits existing evidence, distinguishes isolated behavior from connected gameplay and human review, and prioritizes full encounter outcomes, repeated transitions/settings, then the cinematic handoff. It recommends connecting rough features early and maintaining one short journey before scaling content. [The assessment receipt](../docs/reports/2026-10-30-integration-testing-scope.md) records actual review/checks. This is planning, not an executed campaign playtest, new test harness or authorization to implement every proposed feature.

### October 30, 2026 - cinematic cutscenes blended into gameplay

Source: owner, repo-attached Space Dragon chat. Original wording:

> scope out a method to use cinematic looking cutscenes and blend them to gameplay such as the dragon taking off into the atmopshere etc

Receipt: **SD-038** - CONFIRMED scoping request; method and shot design PROPOSED; work state **planned**. Extends SD-002/SD-022 with a concrete takeoff-to-flight handoff. [The method](../docs/engineering/CINEMATIC_TRANSITIONS.md) recommends a real-time launch within the flight runtime, Blender-authored motion, a matched chase-camera/control transfer, and optional prerecorded establishing shots. It identifies the separate Babylon/Three.js page boundary, skip/pause/reload rules, production stages and acceptance checks. [The scope decision](../docs/decisions/2026-10-30-cinematic-transition-scope.md) preserves current canon and implementation boundaries. Next: select the bounded launch rehearsal for implementation; no cutscene, new campaign save, media upload or deployment was added by this scoping task.

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

### October 30, 2026 — practice a Seele import and change flight controls

Source: owner, IDE chat. Original wording:

> ok lets practice moving a seele prototype into our project and then making some meaningful changes so i know this workflow works
> "C:\Projects\space_dragon\assets\reference\seele\dragon_dogfight"
> is that the right place for our prototyles or should it be seele-assets?
> either way, its just the dragon dogfight which is conceptually correct. id like to add the ability to barrel roll and move the target independent of the plane. also, use the arrows to steer the plane and WADZ to move the target

Same-day follow-up, part of this increment:

> add the ability to use the mouse to fly also. left button fires and right button zooms

Receipt: **SD-037** · CONFIRMED import and control direction · Import a working copy into the local **Dogfight Lab**, retaining the unchanged original. Arrows or mouse steer; W/A/D/Z aim up/left/right/down independently of flight. Hold the left mouse button to fire and the right button to zoom. Screen-relative mouse steering with a center deadzone, automatic mouse/arrow switching, Q/E barrel rolls and X aim recenter are reversible implementation choices. The existing `seeles-assets/incoming/` folder is the standard for future raw exports; the supplied `assets/reference/seele/dragon_dogfight/` path remains a supported local intake location. [The scoped integration decision](../docs/decisions/2026-10-30-seele-dogfight-lab.md) keeps the export's Three.js renderer in a separate page while the Earth slice stays in Babylon. [The receipt](../docs/reports/2026-10-30-seele-dogfight.md) owns actual verification. This experiment grants no campaign rewards, changes no save format, and does not approve prototype lore or public release.


### October 30, 2026 — word-charged target-lock breath and mouse modes

Source: owner, IDE chat. Original wording:

> ok we need a system for a blinging letter to appear in the bottom right of the screen one at a time in order to form a 4 letter workd. the blinking letter demands someone to press it on the keyboard (avoid keyboard bindings for flight). when the word is compelted, the dragon's target lock fire breath is charged and it can lock onto 1 ship at first (upgrades to several) and upon pressing the space bar, an animation runs that blasts the bad guy youve target locked onto. help me with HOW to lock onto targets
>
> make a toggle mode for mouse moving the target vs mouse flying the dragon.

Receipt: **SD-040** · CONFIRMED mechanic and mouse-mode direction; timings, word pool and M binding are implementation choices · [The decision](../docs/decisions/2026-10-30-word-lock-breath.md) defines the first local slice: one pulsing letter at a time, a four-letter charge, reticle dwell to confirm one ship, then one Space press for animated nonlethal breath. M/button switches mouse flight and aim; LMB keeps ordinary plasma and RMB keeps zoom. Action is held during spelling, wrong keys do not reset or damage, and F1/Help together can complete it with assistance. This is letter matching, not a claim of independent reading or mastery. [The receipt](../docs/reports/2026-10-30-word-lock-breath.md) owns actual checks; no learning records, campaign rewards, earned upgrades or takeoff cinematic are included.

### October 30, 2026 — spelling requires live flight and dodging

Source: owner, follow-up IDE chat. Original wording:

> the dragon keeps flying as the word is asked for

The assistant suggested safe autopilot; the owner clarified:

> spelling should require dodging

Receipt: **SD-041** · CONFIRMED correction · [The live-spelling decision](../docs/decisions/2026-10-30-live-spelling-flight.md) supersedes SD-040's automatic action hold and the assistant's autopilot interpretation for this Dogfight mechanic. Flight, steering, enemy attacks, projectiles and damage continue during prompts, so dodging is required. Letter keys remain separate from flight controls; wrong keys retain progress without an added penalty, and F1/Help together still assists without clearing pilot controls or claiming mastery. Normal pause/recovery and encounter-only saves remain. [The receipt](../docs/reports/2026-10-30-live-spelling-flight.md) owns executed evidence; this scoped exception does not rewrite calmer learning guidance elsewhere.


### October 30, 2026 — closer, more natural dogfight presentation

Source: owner, IDE chat. Original wording:

> dogfight is going well. zoom in a little closer on the dragon view.
>
> vary the wing flapping so that it holds steady for a beat and make it irregular
> while using the mouse, the flight is good but the target should move with the pointer
>
> make explosions, dragon and drones more photorealistic
> randomize the order of the words

Receipt: **SD-042** · CONFIRMED polish/control direction; camera distances, cadence, material treatment and shuffle method are implementation choices · [The polish receipt](../docs/reports/2026-10-30-dogfight-polish.md) owns motion, framing, pointer/lock, word-order and visual checks. Mouse flight now steers and aims under the cursor; aim mode moves the target alone. Wing animation includes irregular strokes and deliberate steady glides without changing flight authority or pausing SD-041's live combat. Refine the existing candidate surfaces/explosions locally and shuffle the safe word pool; preserve raw sources, rig structure and saved progress. Human photorealism/control-feel approval and sustained device performance remain separate.

### October 30, 2026 — closer camera, readable targeting and active evasion

Source: owner, IDE chat. Original wording:

> even closer than that. more warnings that the dragon is being targeted, barrel rolling shakes them off, but uses finite energy (similar to boosting)
> make another realistic way of dodging other than barrel rolling. incentivize the dragon to move. the more steady you fly, the easier you are to hit. step up the incoming fire

Receipt: **SD-043** · CONFIRMED camera/threat/evasion direction; the B break-turn binding, costs, regeneration and tracking/fire tuning are implementation choices · [The decision](../docs/decisions/2026-10-30-dogfight-evasion.md) routes this to the local Dogfight Lab's flight state, enemy prediction, input, warnings and tests. Rolls spend finite evasion energy and break firing solutions; a braking hard turn provides a physical alternate dodge. Steady flight lets enemy aim settle and movement spoils it. More frequent fire uses readable windup and direction warnings. SD-041's live spelling/dodging, regular pause/retry, no maneuver immunity, airborne projectiles and untouched Earth saves remain. [The receipt](../docs/reports/2026-10-30-dogfight-evasion.md) records 95 units, build, nine development and three production cases plus installed Chrome inspection passing; human difficulty/control review remains separate. Local changes are uncommitted and not pushed.

### October 30, 2026 — cockpit presentation, bogey radar and stronger sound

Source: owner, chat. Original wording:

> ok start to give it more polish.
>
> give a small mini map that details where the bogeys are in relation.
>
> make the window look more cockpit like and less reacty
>
> upgrade the sound effects to be more intense

Receipt: **SD-044** · CONFIRMED presentation direction; radar range/layout, cockpit trim and synthesis/mix are reversible implementation choices · [The decision](../docs/decisions/2026-10-30-dogfight-cockpit.md) routes this to read-only relative-position radar, cockpit-style flight instruments and layered local audio in the isolated Dogfight Lab. Preserve the third-person chase view, live spelling/dodging, current controls, pause/retry and save boundaries. [The receipt](../docs/reports/2026-10-30-dogfight-cockpit.md) separates implementation/checks from human visual and audio review. No new cockpit model, external media service, campaign or deployment is implied.

### October 30, 2026 — acceleration through camera and sound

Source: owner, chat during the cockpit-polish increment. Original wording, in message order:

> also dont zoom with the stars stretching, make it zoom with the camera stretching and sound

> when you accelerate i mean

Receipt: **SD-045** · CONFIRMED acceleration-feedback direction; bounded field-of-view response and acceleration-driven engine/airflow tuning are implementation choices · [The decision](../docs/decisions/2026-10-30-acceleration-camera-sound.md) removes the lab's speed-star stretching/trails and routes acceleration feel to camera perspective and sound. The clarification applies when accelerating; held right-button aiming zoom remains. Reduced motion, opt-in sound, pause/retry, live spelling/dodging, controls and encounter/save boundaries remain. The [cockpit/acceleration receipt](../docs/reports/2026-10-30-dogfight-cockpit.md) separates the earlier cockpit baseline from the passing final checks and identified artifact; human comfort/audio approval remains separate.


### October 30, 2026 — Town Drive Lab from house and driving videos

> give me a prompt to start working on driving around the 3D environment we can create from my house and the drive i went on. they will be stored as videos in the repo.

Supplied local originals: `assets/reference/videos/IMG_5753.MOV` and `assets/reference/videos/IMG_5754.MOV`. The accompanying Town Drive Lab task authorizes source verification, local-only analysis and reconstruction spike, a separate drivable lab, checks and a PR.

Receipt: **SD-046** · CONFIRMED drivable reference-based environment; lab structure, car tuning, invented connectors and distance factor PROPOSED · [Decision](../docs/decisions/2026-10-30-town-drive-lab.md), [verification](../docs/reports/2026-10-30-town-drive-lab.md). Private footage, derivatives and the real house layout stay local. Production uses a fictional layout. This does not add an Act I mission or settle who drives, the canonical car or town geography. Incoming main reference IDs SD-029/030 and controller SD-038 are source provenance, not replacements for this branch's existing entries.

### October 30, 2026 — Space Dragon Spacecraft Blender session

Source: owner, chat. Original wording:

> find the dragon in the dogfight demo

> ok bring it into a new blender session and call it space dragon spacecraft

Receipt: **SD-047** · CONFIRMED session setup, verified · [Verification](../docs/reports/2026-10-30-space-dragon-spacecraft.md). Located the original `.blend`, opened a new interactive Blender process, saved an ignored local working version and connected MCP. Viewport, packed texture, rig inventory and source reopen verified. Original and runtime models retained. Next: owner-directed art changes; this name does not approve a redesigned model or change story canon.

### October 30, 2026 — mechanical dragon reference

Source: owner, chat with two attached dragon screenshots. Original wording:

> make it look more like that

Receipt: **SD-048** · CONFIRMED visual direction; implementation details remain a reviewable candidate · [Art receipt](../docs/reports/2026-10-30-mechanical-dragon.md). References show an angular mechanical dragon with blue-steel armor, red wing panels, exposed circular joints/pistons, orange eyes and a toothed jaw. Route to a new local Blender source version; preserve original rig and raw asset. No external generator, runtime replacement, fire effect or campaign change is implied.


### October 30, 2026 — integrate the mechanical spacecraft into Dogfight Lab

Source: owner, chat. Original wording:

> Integrate the new mechanical Space Dragon Spacecraft into the existing Dogfight Lab.
>
> Follow AGENTS.md and the relevant asset/build/playtest skills. Inspect the current branch and working tree first; preserve ongoing Dogfight edits.
>
> Use this local Blender source:
> C:\Projects\space_dragon\assets\source\local\spacecraft\space-dragon-spacecraft\Space Dragon Spacecraft-v002.blend
>
> Review images and verification:
> - Same folder: Space Dragon Spacecraft-v002-review.png
> - Same folder: Space Dragon Spacecraft-v002-head.png
> - docs/reports/2026-10-30-mechanical-dragon.md
>
> The owner requested the mechanical look: blue-steel armor, red wings, exposed joints/pistons, orange eyes and a toothed articulated jaw. Integrate this candidate without redesigning it.
>
> Important asset details:
> - SpaceDragonRig preserves the original nine bones and their rest transforms: Root, Wing_L, Wing_R, Jaw, Tail_0 through Tail_4.
> - New armor is weighted to that rig.
> - Hidden original organic meshes remain in the source for recovery. Exclude them from export.
> - Exclude the “Review Studio - not for export” collection.
> - The source has 706 visible meshes and about 135,780 evaluated triangles. Prepare a separate optimized game candidate; preserve materials, articulation, component names and pivots.
> - Procedural Blender material details may need baking or runtime equivalents. Verify the orange eye emission and red/blue materials in the browser.
>
> Current integration:
> - Runtime model: public/assets/dogfight/models/dragon.glb
> - Loader: src/prototypes/dogfight/main.js
> - Bone animation: src/prototypes/dogfight/animation/dragon.js
> - Runtime material treatment: src/prototypes/dogfight/assets/surface-materials.js
>
> Export to a new versioned GLB first and retain the previous model for rollback. Validate the export, wire it into the lab and asset manifest, and check existing material overrides against the new materials.
>
> Actually playtest loading, camera framing, flap/glide, rolls, jaw and tail movement, aiming, ordinary fire and charged breath. Adjust mouth effects/projectile origins to the new muzzle if needed. Preserve current controls, active flight/dodging during spelling, combat rules and save boundaries.
>
> Run appropriate build/browser/asset checks, inspect appearance in the actual browser, and record measured size/performance and remaining limitations. Update the verification receipt and relevant project records. Complete the local integration; do not deploy.

Receipt: **SD-049** · CONFIRMED local integration direction; export optimization and runtime adaptation remain reviewable engineering choices · [Decision](../docs/decisions/2026-10-30-mechanical-dragon-integration.md), [verification](../docs/reports/2026-10-30-mechanical-dragon-integration.md). Promote a new versioned mechanical candidate, preserve the original source/runtime for rollback, verify rig/components/materials/muzzle and actual play, and retain active spelling/dodging, controls/combat/saves. No redesign or deployment. Source-only SD-048 checks remain historical; they do not substitute for this integration.


### October 30, 2026 — make the mechanical dragon red

Source: owner, chat during SD-049 integration. Original wording:

> ok make the whole dragon red instead

Receipt: **SD-050** · CONFIRMED palette override · [Decision](../docs/decisions/2026-10-30-red-mechanical-dragon.md), [combined integration receipt](../docs/reports/2026-10-30-mechanical-dragon-integration.md). Red supersedes the blue-body/red-wing palette for the game candidate. Preserve the supplied blue v002 source and existing geometry/rig/component pivots; use a fresh red versioned export. Varied crimson/red finishes and retained orange emission are reviewable integration choices, not final appearance approval. Existing local-only gameplay/save/deployment boundaries remain.


### October 30, 2026 — steadier enemy targets

Source: owner, chat during mechanical integration. Original wording:

> also make the enemies a little more stationary instead of flying into me

Receipt: **SD-051** · CONFIRMED movement direction; exact standoff spacing/drift remains an implementation choice · [Decision](../docs/decisions/2026-10-30-dogfight-enemy-standoff.md), [combined receipt](../docs/reports/2026-10-30-mechanical-dragon-integration.md). Use steadier player-relative targets with gentle movement instead of head-on pursuit/flybys. Preserve incoming fire/tracking, health/damage, charging, roll/evasion and save boundaries. This supersedes only SD-043's pursuit movement; no verified behavior or human difficulty approval is inferred from the request.


## October 30, 2026 — Town Drive realism and rule removal (SD-052)

Owner source wording:

> i am overriding privacy rule. i dont know who put that. also this looks too basic. i want pretty close to photorealistic and detailed

> remove the rule

Routing receipt: **CONFIRMED**, technically verified. [Decision](../docs/decisions/2026-10-30-town-drive-detail-override.md) removes the original task’s Town Drive privacy/publication gate. The estimated house layout is bundled; materials, vegetation, lighting, road detail and car are upgraded while retaining driving behavior. [Verification](../docs/reports/2026-10-30-town-drive-detail.md) records passed checks and remaining human review.


### October 30, 2026 — cinematic detail, solid asteroids and graphic machine crashes

Source: owner, chat with a cinematic reference image. Original wording:

> also please make it look more detailed like this: also make real asteroids and design the crash mechanism and what happens to the dragon when you lose or crash. make it graphic

Reference description: red mechanical dragon, detailed rock field, ringed planet and dramatic lighting. The attached image is a visual-direction reference, not a runtime texture or an approval to upload it to a generator.

Receipt: **SD-053** · CONFIRMED visual/environment/crash direction; procedural geometry, collision thresholds and effect timing are implementation choices · [Decision](../docs/decisions/2026-10-30-asteroids-mechanical-crash.md), [new verification](../docs/reports/2026-10-30-asteroids-crash-breath.md). Add detailed solid 3D asteroids/colliders and intense mechanical graze/crash/loss feedback followed by recovery. Preserve pause/retry, save boundaries and reduced motion. No family injury/gore/death canon, external generator or deployment is implied. The prior red-model integration remains a named pre-expansion baseline.

### October 30, 2026 — Space-bar windup, roar and fire beam

Source: owner, chat. Original wording:

> when we use the spacebar attack, make it windup and make a loud roar and beam a fire beam

Clarification:

> space bar that is

Receipt: **SD-054** · CONFIRMED charged-attack presentation direction; timeline, synthesis and beam treatment are implementation choices · [Decision](../docs/decisions/2026-10-30-charged-breath-windup-roar.md), [new verification](../docs/reports/2026-10-30-asteroids-crash-breath.md). Refine the existing charged/locked Space attack with windup, a strong original local roar and a directed fire beam. Flight/dodging/enemy fire and normal damage remain active during windup; normal pause, once-only consumption/impact, opt-in audio, reduced motion and save boundaries remain. Do not infer final comfort/audio approval from the request or prior-scope checks.


## October 30, 2026 — Town Drive traffic and details (SD-055)

Owner source wording:

> fill the world with NPC cars, traffic and a few more details also. dealers choice on details

Routing receipt: **CONFIRMED**, technically verified. [Decision](../docs/decisions/2026-10-30-town-drive-traffic.md) adds traffic previously held outside the first lab increment. Bidirectional NPC vehicles, signal/following behavior and agent-selected street details are implemented; driving/save boundaries remain intact. [Combined verification](../docs/reports/2026-10-30-town-drive-detail.md).


## October 30, 2026 — supplied sound banks (SD-056)

Owner source wording:

> sound design agent:
> pelase file these sound banks and use them where we can
> Sonniss.com-GDC2026-GameAudioBundle1of5
> Sonniss.com-GDC2026-GameAudioBundle2of5
> Sonniss.com-GDC2026-GameAudioBundle3of5
> Sonniss.com-GDC2026-GameAudioBundle4of5
> Sonniss.com-GDC2026-GameAudioBundle5of5

Follow-up:

> put them where we are putting sound banks etc

Routing receipt: **CONFIRMED**, verified for named filing/audio checks. File intact banks under `assets/source/local/audio/sonniss-gdc-2026/`, catalog provenance/metadata and choose a small set for the existing Dogfight audio controls. Raw banks remain local. Future town/ambient/foley applications are candidates pending audition and the relevant feature. No new service or deployment.

SD-056 filing result: all 359 source files preserved with matching hashes. [Library and candidate uses](../assets/source/audio/sonniss-gdc-2026/README.md), [decision](../docs/decisions/2026-10-30-sonniss-sound-banks.md), [verification](../docs/reports/2026-10-30-sonniss-sound-banks.md). Five recording layers implemented; human audition pending.

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


## October 30, 2026 — cinematic mechanical dragon first-section benchmark (SD-059)

Source: owner, chat with a gunmetal/crimson mechanical-dragon reference image. The preceding visual-quality discussion distinguishes convincing assets from convincing rendering and proposes a measured benchmark before changing engines. The quoted quality comparisons are aspirations, not an inspection of this repository or proof of GTA V-equivalent performance. Owner's actionable production wording (chat escape formatting normalized):

> Upgrade my existing Space Dragon model into a cinematic, intimidating,
> game-ready mechanical dragon.
>
> Preserve the existing model in a separate collection. Create the upgrade
> in a new collection. Keep the original proportions available for comparison.
>
> DESIGN DIRECTION
>
> This is a powerful living machine built to protect a family.
> It should feel formidable, intelligent, and capable of spaceflight.
>
> Use black/gunmetal armor, deep crimson secondary plates, and restrained
> red-orange light inside the machinery. Distinguish painted armor,
> exposed metal, flexible joints, and wing membranes.
>
> Prioritize a recognizable silhouette and believable construction.
> Avoid random spikes, excessive glowing lines, and uniform surface noise.
>
> STAGE 1 — SILHOUETTE AND PRIMARY FORMS
>
> Show front, side, and three-quarter views before adding fine detail.
>
> • Make the head more predatory: stronger brow, recessed eyes, defined
>   cheek armor, and a powerful articulated jaw.
> • Develop swept-back horns that integrate with the skull armor.
> • Give the neck overlapping protective plates with room to bend.
> • Strengthen the chest and shoulders while keeping the waist narrower.
> • Give the wings a clear shoulder, elbow, and finger structure.
> • Shape the tail with a strong root and a deliberate taper.
> • Make claws and feet look capable of gripping and landing.
> • Check that wings, limbs, and neck can move without obvious collisions.
>
> STAGE 2 — ARMOR CONSTRUCTION
>
> • Replace simple slabs with layered plates of varied size and thickness.
> • Add actual thickness to exposed armor edges.
> • Use small bevels so edges catch highlights.
> • Add recessed seams and intentional gaps between moving parts.
> • Expose mechanisms mainly around joints and articulation points.
> • Establish three scales of detail:
>   large armor masses, medium mechanical structures, small surface details.
> • Concentrate detail around the face, chest, shoulders, and wing roots.
> • Keep broad areas visually quiet.
>
> STAGE 3 — MATERIALS
>
> Create a small, reusable material set:
>
> 1. Dark painted armor: mostly nonmetallic surface response,
>    with subtle roughness variation.
> 2. Crimson painted armor: rich red with controlled highlights.
> 3. Exposed metal: metallic, with directional surface variation.
> 4. Flexible joints: dark, rough, ribbed material.
> 5. Wing membrane: structured, subtly textured, with visible supporting ribs.
> 6. Internal energy: restrained emissive accents.
>
> Avoid using a single metallic blue material everywhere.
> Avoid pure black base colors that hide the forms.
> Keep wear selective: exposed edges, hinges, claws, and contact areas.
> Do not cover every surface with scratches.
>
> STAGE 4 — GAME ASSET
>
> • Keep a detailed source model and a separate optimized game mesh.
> • UV unwrap the game mesh with consistent texel density.
> • Give the head more texture space than rarely visible undersides.
> • Bake normal and ambient-occlusion detail where appropriate.
> • Keep ambient occlusion separate from base color.
> • Build materials that can be reproduced in glTF.
> • Keep emission separate from the bloom effect.
> • Preserve articulation and sensible object origins.
> • Export a GLB and inspect it in the actual game renderer.
>
> Do not choose polygon counts or texture sizes blindly.
> First measure the current asset and confirm gameplay camera distance.
>
> STAGE 5 — PRESENTATION AND VALIDATION
>
> Create two views:
> A. Neutral lighting that exposes modeling and material problems.
> B. Cinematic lighting with a large soft key, rim light, and restrained fill.
>
> Use an environment that provides readable reflections.
> Keep exposure controlled so red armor retains detail.
> Render full-body and head close-up comparisons with the original.
>
> Finish the head, neck, and one shoulder first.
> Export that section into the game before upgrading the entire dragon.

Reference description: layered dark gunmetal dragon armor, crimson wing panels, recessed red-orange eyes and internal jaw light, functional exposed joints, swept-back horns and a powerful toothed jaw against a cinematic sky. The attached image guides appearance; it is not a runtime texture or permission to upload private assets to a new service.

Routing receipt: **SD-059 · CONFIRMED · verified for named local first-section checks**. [Decision](../docs/decisions/2026-10-30-cinematic-dragon-benchmark.md), [verification receipt](../docs/reports/2026-10-30-cinematic-dragon-benchmark.md). New gunmetal/crimson direction supersedes all-red for this benchmark; original blue/red sources/exports remain. Measured camera, stage views, detailed head/neck/left shoulder, separate optimized textured export and actual gameplay checks are complete. The receipt retains full-wrapper failure, targeted retries, open Town route completion and bounded performance evidence. Full-body redesign and human appearance review follow this benchmark. Controls/live dodging/combat/crash/saves remain; local integration only, no deployment or inferred final quality approval.

## October 30, 2026 — Blender-to-game pipeline (SD-060)

Owner's original request:

> Inspect the existing Space Dragon renderer and dragon controller.
>
> Implement a Blender-to-game asset pipeline:
>
> 1. Load the exported dragon GLB through the existing asset-loading system.
> 2. Attach it beneath a stable gameplay root with documented scale,
>    forward direction, and ground/contact height.
> 3. Preserve existing movement and combat behavior.
> 4. Use simple gameplay collision shapes independent of the render mesh.
> 5. Connect exported animation clips to gameplay states and blend transitions.
> 6. Define named attachment points for mouth fire, wing effects, thrusters,
>    targeting, and camera tracking.
> 7. Audit imported materials, lighting, shadows, render resolution,
>    anti-aliasing, and color management.
> 8. Create a neutral asset inspection scene and a representative flight scene.
> 9. Compare Blender reference images with in-game screenshots from
>    matching angles. Identify specific remaining visual differences.
> 10. Measure frame time, draw calls, triangles, and texture memory.
>     Optimize based on those measurements.
>
> Inspect the actual implementation before choosing renderer settings.
> Deliver a working in-game integration with screenshots and performance
> results, and identify any limitations that remain.

Routing receipt: **SD-060 · CONFIRMED · verified for named local pipeline checks**. [Asset contract](../docs/engineering/DRAGON_ASSET_CONTRACT.md), [verification receipt](../docs/reports/2026-10-30-dragon-asset-pipeline.md). The retained loader/controller uses a versioned export with authored blended loops, eight sockets, stable transforms and independent collision. Earlier artwork/rollback, active flight/combat during spelling, collision tuning and saves remain. Matched Blender/browser views, measured resource reduction and final native wrapper pass are recorded, with the initial manifest failure preserved. Human art/sustained performance and deployment remain separate.


## October 31, 2026 — reconciled incoming planning and intake

These October 30 source captures arrived from `origin/main` at `65f908b`. Their original wording and dates are preserved below; routing IDs follow the [merge crosswalk](../docs/decisions/2026-10-31-merge-idea-identifiers.md). Earlier receipts describe the state at capture. Morrow approval and the English simplification supersede the intervening proposals; later local Dogfight/Town work remains in its existing records.

### October 30, 2026 — Seele intake and early refactoring

Source: owner, Space Dragon chat, after discussing exported assets and continued refinement with coding agents.

> Shall I make a folder in the repo called “seeles assets” and put instructions for migration

> At the beginning, we may want to refactor the repo around the more refined 3d environments and assets if it’s easier

Receipt: **SD-062** · CONFIRMED intake direction and conditional refactor evaluation; the actual migration/engine choice remains OPEN until an export is inspected. [Seele intake and migration](../seeles-assets/README.md) provides a local drop folder and agent procedure. It compares asset import, scene-layer replacement, and broader refactoring before implementation, while reusing the existing asset workflow. No paid generation, asset import, engine change, or deployment is claimed.

### October 30, 2026 — House interior video reference

Source: owner, Space Dragon chat, with uploaded `IMG_5753.mp4`.

> Put this video in a folder and label it house interior. It’s reference for 3d environment of initial house

Receipt: **SD-063** · CONFIRMED label and reference purpose · [House interior](../assets/reference/environments/house-interior/README.md) records the original, the saved `house-interior.mp4`, the ignored local authoring path, source checksum, and initial inspection. The video was organized in the owner's files and copied unchanged into the local reference workspace. Next: consult it when building the opening environment. A finished house model, a measured scan, a Seele upload, and public-video publication are not established by this intake.

### October 30, 2026 — Car driving video reference

Source: owner, Space Dragon chat; `IMG_5754.mp4` arrived after the initial labeling request.

> Label this video car driving West on Hypoluxo north on jog West on Lantana south on Hagen Ranch

> Ok is this saved in repo

Receipt: **SD-064** · CONFIRMED route label · [Car driving source and receipt](../assets/reference/environments/car-driving/README.md) records the saved video, source checksum and metadata, sampled-frame observations, and retrieval instructions. The notes are tracked in Git; the original MP4 is saved separately in the owner's `Space Dragon/Car driving/` files. The route is the owner's label, not an independently verified GPS track. Next: retrieve the source when exterior-environment work needs it; no road model or runtime change is claimed.

### October 30, 2026 — a villain, and the reason for the SOS

Source: owner, Space Dragon chat.

> “We need a villain arc, the reason for the SOS. Not kiddy please, this can be biblical or DC studios level”

Receipt: **SD-065** · CONFIRMED direction (a villain exists, causes the SOS, mythic tone); identity and lore PROPOSED · [Decision](../docs/decisions/2026-10-30-villain-is-the-reason-for-the-sos.md) and [villain treatment](../docs/story/VILLAIN_ARC.md): Morrow, the Lanemother's firstborn, holds the home note and has stopped the universe. Next: owner review, then integrate the beats listed in the treatment's §10 into the acts and scripts.

### October 30, 2026 — Morrow approved, rename the home note, translation

Source: owner, Space Dragon chat, in reply to the villain treatment.

> “Yes I like it. “Home note” should be called something else.
> We need: a way to translate language”

Receipt: **SD-066** · CONFIRMED Morrow and his arc as presented; "home note" retired, replacement **the Heartnote** PROPOSED · [Decision update](../docs/decisions/2026-10-30-villain-is-the-reason-for-the-sos.md); Morrow integrated across the acts and scripts. **SD-067** · CONFIRMED need; design PROPOSED · [Translation decision](../docs/decisions/2026-10-30-translation.md) and [language and translation](../docs/story/LANGUAGE_AND_TRANSLATION.md). Next: owner reaction to the Heartnote name and the translation design.

### October 30, 2026 — the suits translate

Source: owner, Space Dragon chat.

> “The suits can translate”

Receipt: **SD-068** · CONFIRMED · [Translation decision update](../docs/decisions/2026-10-30-translation.md) and [language and translation](../docs/story/LANGUAGE_AND_TRANSLATION.md): the suits replace the Core as the translator. Proposed details: they translate both ways, singing the family's words in Vieran in each wearer's instrument voice; they translate what they hear, not what they see, so the kids still decode writing in the Glyph Book; near Viera they drop words and the Caller fills the gaps; the neighbor's robot iguana translates for her. Scripts updated.

### October 30, 2026 — just English, with the suits as the hand-wave

Source: owner, Space Dragon chat.

> “The game just needs to be in English with the suit core hand waiving why we can understand”

Receipt: **SD-069** · CONFIRMED · Supersedes the translation details from SD-067 and SD-068. [Decision update](../docs/decisions/2026-10-30-translation.md) and [language](../docs/story/LANGUAGE_AND_TRANSLATION.md): everything is in English; the suits, made from the same living material as the Core, are why the family understands everyone, said once at Lantern Rock. The sung language, mistranslations, Glyph Book, dropped words and gift of tongues are retired, and glyph puzzles became plain English letters, numbers and words. The original remote branch skipped SD-035 and SD-036 because draft PR #13 used them; see the merge ID crosswalk for current allocations.

### October 30, 2026 — PlayStation controller input

Source: owner's Space Dragon request.

> “Can we get this to work plugging in a PlayStation controller”

Receipt: **SD-070** · CONFIRMED request · Routed to [controller input decision](../docs/decisions/2026-10-30-playstation-controller.md), a standard Gamepad API input adapter, a First Contact camera/story UI integration and simulated controller browser tests. Keyboard remains available. Physical USB/Bluetooth behavior is not yet tested; character movement, combat and dragon flight are later systems.

### October 30, 2026 — cinematic game sound effects bank

Source: owner, Space Dragon chat.

> “Need high quality, cinematic sound effects bank for this project”
>
> “Put a bunch of that in my Google Drive please”
>
> “Ok now transfer them to GitHub repo space_dragon”

Receipt: **SD-071** · CONFIRMED request · The Drive folder was created but contained zero audio files. An original 16-cue synthesized starter bank, manifest, source generator, sound preview and licensing workflow were committed to [the audio bank](../assets/game/audio/starter/). Those files were checked for byte-for-byte reproduction. This is **not** a transfer of Sonniss/BOOM recordings and **not** final cinematic-quality sound design; professional sourcing, listening QA and game integration remain open.

Merge routing receipt: incoming SD-014/015/016/017/018/027 duplicate existing SD-028/029/030/031/032/033 and retain those canonical IDs. New records use SD-062–071. SD-061 is reserved for concurrent visual-foundation work; next unused is SD-072. This merge reconciles records and existing implementations; it does not add deployment, final art approval or a new mission.
