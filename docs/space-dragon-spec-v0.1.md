CONCEPT FOUNDATION  /  LIVING SPECIFICATION

# SPACE DRAGON

**Game & Technical Specification**

Version 0.1  |  October 28, 2026  |  Owner: Paul Malmquist

Planned home: paulmalmquist.com/space-dragon

A family of five explores the universe in a giant mecha dragon, returning home to a supportive cul-de-sac and one very determined neighbor who wants the dragon gone.

> The promise  An extraordinary family adventure that starts across the street and reaches far beyond the solar system.

### What this draft establishes

The family, the dragon, the neighborhood conflict, specialized suits, and the future Line Leader exploration system. It also proposes a small first playable release and a technical foundation that can grow without requiring every feature on day one.

### How to read it

| Status | Meaning |
| --- | --- |
| CONFIRMED | Explicitly established by Paul in the planning conversation. |
| PROPOSED | A design recommendation or elaboration awaiting approval. |
| BOOKMARKED | A confirmed future capability; not a first-release commitment. |
| OPEN | A decision or dependency that has not been resolved. |

> This is a specification, not a build report. No repository, deployment, Railway account, or family photo library was inspected for this draft. No game functionality is claimed as implemented.

---

*01  /  CANON + SCOPE*

## Confirmed foundation

These decisions take precedence over earlier brainstorms. Proposed names, colors, powers, and mission details elsewhere in this document do not silently become canon.

| ID | Established requirement |
| --- | --- |
| C01 | Title: Space Dragon. The central crew is Paul, Maria, Luke, Luna, and Lyla. |
| C02 | The family explores the universe using a giant mecha dragon that flies into space and travels at “light speed” to faraway systems. |
| C03 | The game belongs at paulmalmquist.com/space-dragon; the existing homepage stays intact. |
| C04 | Family photos will be used as reference to make the characters close to realistic and recognizably themselves. |
| C05 | The main villain is inspired by the across-the-street neighbor: a blonde woman in her late 50s who objects to the dragon occupying the cul-de-sac. |
| C06 | The other neighbors love the family’s exploration and encourage them to keep building the dragon. |
| C07 | The villain’s plans involve iguanas, alligators, and other Florida-themed antagonists. |
| C08 | Paul’s suit resembles Iron Man armor. Luke’s resembles Spider-Man’s Iron Spider suit. |
| C09 | Maria is the healer and wears purple. Luna wears pink and shoots goo that makes enemies slip. |
| C10 | Lyla specializes in gathering and storing information. Her suit color is not decided. |
| C11 | Future exploration lets the family leave the dragon together, in pairs, or in smaller groups. |
| C12 | Only one person is directly controlled at a time: the Line Leader. The other members of that party follow automatically. |

### Not yet established

The dragon’s name separate from the game title, appearance, personality, origin, transformation modes, and voice remain open. “Commander Culdesac,” “Swamp League,” suit power names, teal for Lyla, and the detailed abilities in this draft remain proposals.

The earlier ancient-civilization / chosen-family premise is not required canon. Neither real-time multiplayer nor a public release has been approved.

---

*02  /  CONFIRMED PREMISE / PROPOSED TREATMENT*

## Story, tone & antagonists

### Narrative premise

A family builds an extraordinary exploration vehicle in an ordinary Florida neighborhood. Most of the street treats launch day like a celebration. Across the road, one neighbor sees only a giant obstruction and decides to make the dragon disappear. Her schemes grow from petty sabotage into increasingly absurd swamp-tech operations that follow the family into space.

### Tone and story rules — proposed

Lead with wonder, family teamwork, and suburban comedy. The villain’s escalating overreaction is the joke; age, gender, and appearance are not. Keep danger exciting but recoverable, with no graphic injury or permanent loss of a family member. Wildlife-inspired enemies should read as comic antagonists, robots, or creatures that can be safely escaped or helped.

The neighborhood remains a home worth returning to. Supportive neighbors contribute practical help, encouragement, and comic launch-day moments. The family should not spend the whole game defending the driveway: exploration remains the main attraction.

### Working antagonist roster

| Antagonist | Proposed gameplay purpose |
| --- | --- |
| The neighbor Working title: Commander Culdesac | Recurring mastermind. Escalates from complaints to sabotage and eventually remote-controlled attacks. Final name and identity remain open. |
| Iguana infiltrators | Small climbers that steal parts or interfere with launch systems. Their mechanical equipment makes the sabotage readable. |
| Armored alligator | Large, telegraphed charging enemy. A later suit-teamwork encounter, not a required first-release boss. |
| Mosquito drones | Simple flying nuisance enemies that interrupt scans or drain a small amount of suit/dragon energy. |
| Later Florida additions | Python grapplers, airboat raiders, flamingo decoys, or lawn-equipment machines. Select only when a mission needs them. |

### Repeatable episode structure

A neighborhood problem or new destination leads to launch, a discovery, an obstacle, a family solution, and a return with a new clue or upgrade. The villain may interfere, but not every planet or mystery needs to be her creation.

> Fictionalization requirement — proposed  Use a fictional villain name, house, dialogue, and neighborhood layout. Do not publish the real neighbor’s identifying details or treat the fictional sabotage as an allegation about an actual person.

---

*03  /  PROPOSED GAME DESIGN*

## The dragon & the play loop

### Core experience

Launch from home → choose a destination → make a light-speed jump → explore a compact region → solve a problem or recover a discovery → return and improve the dragon. After the walking expansion, landing and family expeditions become part of this same loop.

### Dragon identity

The dragon is a vehicle, home base, and central visual character—not the entire game. Its head, wings, articulated body, and tail should remain clearly recognizable during flight. Final scale, colors, cockpit arrangement, and degree of transformation require visual approval.

Recommended starting capabilities: assisted flight, short boost, scan pulse, one energy-breath action, and a destination-triggered jump. Shields, grapples, multiple combat forms, a walkable interior, and complex ship-building are later candidates rather than baseline requirements.

### Flight that Luke can enjoy

Use third-person chase-camera flight with automatic stabilization, assisted steering, generous collision recovery, and auto-leveling. The first control scheme should not require independent pitch, yaw, roll, throttle, weapon selection, and camera management. Landing and takeoff can be guided transitions initially.

### Family presence before walking exists

All five family members appear as crew portraits and contribute short contextual lines. Maria reports recovery, Lyla records discoveries, Luna comments on hazards, Luke spots routes, and Paul handles engineering guidance. These proposed shipboard moments convey personality without requiring five additional control systems.

### Progression and rewards

Discoveries unlock destinations, visible dragon improvements, and new mission opportunities. Favor meaningful rewards over repetitive resource grinding. Keep the archive and upgrade screen small enough that a young player can understand what was gained and what to do next.

### Two kinds of travel

Local movement is playable flight within a bounded scene. “Light speed” is the story’s fast interstellar travel mechanic, presented as a short, skippable transition between authored locations. It is not a literal real-time distance simulation or an astronomy claim.

> Experience principle  The player should quickly be doing something interesting with a dragon, not managing a dashboard about one.

---

*04  /  CONFIRMED INSPIRATION / PROPOSED ABILITIES*

## Family suits: power & agility

The visual inspirations below are confirmed. Detailed moves, palettes beyond the specified purple and pink, and balance rules are proposals. Every suit should contribute to exploration as well as encounters.

### Paul — heavy armor and engineering

Confirmed: Armor resembling Iron Man.

Proposed appearance: Substantial plated armor, a bright chest core, powerful gauntlets, boot thrusters, and a shared family-dragon emblem. Red, graphite, and gold are a candidate palette, not a locked choice.

Exploration: Lift heavy obstacles, brace doors, repair broken machinery, and make short powered flights. A tool-mode gauntlet handles welding and mechanical interactions through a simple contextual action.

Signature ability: Dragon Punch — a short rocket-assisted impact that breaks visibly cracked barriers or pushes an armored robot backward. Keep its function legible and avoid turning every object into a destructible prop.

Follower behavior: Automatically assist with a nearby marked heavy-lift or repair task when asked. Do not make the player repeatedly hold a separate repair button.

Boundary: Strength cannot replace scanning or agility. Paul can hold the door once someone discovers the mechanism or reaches the release.

### Luke — climbing, agility and rescue

Confirmed: Armor resembling Spider-Man’s Iron Spider suit.

Proposed appearance: A lighter suit with four retractable mechanical limbs. Red and blue armor with metallic gold limbs is a candidate palette. Preserve Luke’s child proportions and recognizable face.

Exploration: Climb marked surfaces, cross short gaps with a tether, reach maintenance spaces, and establish a route for the others. The extra limbs visibly catch missed jumps rather than forcing frequent restarts.

Signature ability: Spider Pounce — a forgiving leap that pins a small robot briefly or bounces away from a large enemy. Exploration targets and enemies need different, clearly signaled outcomes.

Follower behavior: Keep up using the same route logic as the party; use special traversal at authored obstacles rather than introducing unrestricted wall-climbing everywhere.

Boundary: Reaching a switch creates a usable route for the rest of the party. Luke must not strand four followers on the wrong side of a mandatory obstacle.

> Shared visual language — proposed  Use retractable helmets, common suit materials, and an original family-dragon emblem. Retain the requested armor influences while developing distinct Space Dragon designs and assets.

---

*05  /  CONFIRMED SPECIALTIES / PROPOSED ABILITIES*

## Family suits: care, goo & knowledge

### Maria — healing and protection

Confirmed: The family healer, wearing purple.

Proposed: Rounded protective armor with violet-white lights and small support drones. Healing Pulse restores a nearby ally or the group. Family Shield creates a temporary safe area during a clearly signaled hazard.

Exploration value: Help injured creatures, protect the family while crossing an environmental hazard, and enable peaceful resolutions. Healing companions happens automatically when appropriate; major shields remain deliberate player actions.

Balance: Use a forgiving cooldown rather than scarce medical supplies. Maria can contribute actively while her support continues; she should not be a compulsory full-time healing chore.

### Luna — slippery goo and inventive disruption

Confirmed: Pink suit; sprays gooey liquid that makes enemies slip.

Proposed: Visible bubbling reservoirs and wrist nozzles. Splat coats a small surface so a charging enemy slides past. Goo communicates its effect through animation, sound, and surface markings—not color alone.

Exploration value: Super Slip ’n Slide creates a temporary travel lane for the family. Their suit boots retain normal grip unless the player deliberately enters slide mode. Sticky bubble goo is a possible later upgrade, not part of her confirmed starting kit.

Balance: Limit active patches and clear them predictably. Ordinary goo must not trap family members, obscure the whole screen, or block required routes.

### Lyla — the Family Archive and Holo Replay

Confirmed: Gathers and stores information. Suit color remains open.

Proposed: Teal-and-silver armor, a scanning visor, and a small scanner companion. Record nearby discoveries automatically; a deliberate scan reveals a mechanism, pattern, weak point, or hidden route.

Signature ability: Holo Replay projects information actually recorded by the family—a symbol sequence, a ruined structure’s outline, or a harmless decoy. Start with authored replay targets, not an unrestricted simulation of every scanned object.

Exploration value: Her archive connects earlier discoveries to new solutions and makes the whole team more capable. It should use pictures, short narration, and simple captions rather than long encyclopedia entries.

### Example later mission — proposed

Lyla identifies an armored alligator’s exposed core. Luna makes its charge overshoot. Luke reaches the core, Maria shields the escape, and Paul holds a damaged exit open. These are generous contextual actions, not a five-character timing test.

---

*06  /  BOOKMARKED FUTURE CAPABILITY*

## Line Leader & party exploration

> Confirmed rule  Control one person at a time. That person is the Line Leader; everyone else in the active party follows automatically. The family can explore together or divide into smaller groups.

### Phase 2: one active family party — proposed detail

The player selects a leader by portrait. Camera and input transfer together; health, inventory, mission state, and party membership persist. Keep a clear “Line Leader” label so the mechanic uses the same name everywhere.

Followers use a loose formation, avoid collisions, wait at interactions, and perform supported traversal. If one falls behind or gets stuck, recover them to a safe position near the party. A follower must never permanently block a mission, doorway, checkpoint, or scene transition.

Contextual assists let the leader ask another family member to perform a specific task without switching control. Routine healing and discovery logging are automatic. Important shields, scans, traps, and special actions should stay visible and understandable.

### Phase 3: smaller groups — proposed detail

Begin with two parties whose memberships partition the five characters; a character cannot belong to both. Each party stores its own leader, location, and checkpoint. The player controls only the active party, even when another group is elsewhere.

Default inactive-party behavior: remain safely at a designated waiting point with no off-screen damage, resource drain, or timed failure. Switching groups resumes that group. Independent background missions and simultaneous combat are explicitly outside this first split-party implementation.

Regroup recalls the inactive party to an authored meeting point or offers a safe transition. It cannot silently teleport a character across a locked story gate. Cross-group puzzles should use persistent switches, not require simultaneous input.

### Technical invariants to preserve from the start

| Rule | Required behavior when implemented |
| --- | --- |
| One input owner | Only the active Line Leader receives direct movement and ability input. |
| Safe transition | All active-party members arrive at the correct spawn or recovery point. |
| No lost family | Unreachable followers recover safely; party membership never disappears. |
| Save fidelity | Leader, membership, location, and relevant puzzle state survive reload. |
| Ability access | Required team abilities remain available through assists or an obvious regroup route. |

> This is single-player party control, not a promise of networked multiplayer. Multiplayer would require a separate design and implementation decision.

---

*07  /  PROPOSED SCOPE / NOT YET APPROVED*

## First playable release

### Goal: complete one satisfying expedition

Build a short, replayable launch-to-return adventure that proves flight, exploration, the family identity, and the neighbor’s comic interference. Target an approximately 10–15 minute first session as a design goal, not a development estimate.

### Working mission: Launch Day

| Beat | Player experience |
| --- | --- |
| 1. The cul-de-sac | A compact launch scene introduces the parked dragon, supportive neighbors, and the antagonist’s complaint. Show all five family members through approved or temporary portraits. |
| 2. Lift off | A guided departure introduces steering, boost, and recovery. Avoid a fully simulated neighborhood or a walkable ship interior. |
| 3. Light-speed jump | Choose one available destination. A skippable transition delivers the fantasy of traveling to a faraway system. |
| 4. Explore and discover | Fly through one bounded space region, scan three authored discoveries, and restore or retrieve a beacon component. Encounter one simple drone enemy type. |
| 5. Return and improve | Return home through a guided transition, record discoveries, unlock one visible upgrade, and save. A short villain reaction sets up the next episode. |

### Required release content — proposed

One playable dragon; one compact home launch/return vignette; one playable remote space region; one mission; one enemy archetype; three discoveries; one upgrade; all five family identities; keyboard and touch controls; pause, restart, settings, and reliable local progress.

### Explicitly not in this release

Walking characters, Line Leader movement, split parties, five fully modeled suit avatars, a full solar system, multiple explorable planets, free-form construction, complex transformations, multiplayer, public chat, cloud-generated dialogue, and an unrestricted procedural universe.

### Delivery gate

A new player can start, launch, jump, complete the mission, return, and reload saved progress without developer intervention. The homepage still works; placeholder assets are labeled; a real target device has been tested. If these fail, adding another planet is not the next priority.

> Protect the idea without expanding the build  Reserve character IDs, party fields, ability definitions, and exploration scene hooks now. Do not implement the future follower system simply because the data model can accommodate it.

---

*08  /  PROPOSED PRODUCTION AND PRIVACY REQUIREMENTS*

## Visual identity & family likeness

### Art direction

Use recognizable, close-to-realistic family faces within a coherent cinematic-stylized world. Preserve facial structure, hair, complexion, relative height, and child proportions. Favor expressive faces and readable silhouettes over facial-scan realism that the rest of the game cannot match.

### Photo-to-character workflow

1. Collect parent-approved references: a clear front view, a three-quarter view, and optional full-body or expression references for each family member. Family photos have not yet been supplied for this spec.

2. Create a consistent cast reference sheet and suit concepts. Paul approves likeness, proportions, suit silhouette, and palette before final game assets are commissioned or generated.

3. Produce the required assets separately: portraits for the first release; modeled, textured, rigged, animated, and optimized characters for walking exploration. A concept image is not a finished playable 3D model.

4. Test the five characters together in actual game lighting and at gameplay distance. Verify recognizable faces during close moments and distinct silhouettes during movement.

### Initial asset checklist

| First release | Later exploration release |
| --- | --- |
| Dragon model with flight animation and clear effects | Five suit models with approved faces, rigs, and movement sets |
| Five temporary or approved crew portraits | Follower navigation, contextual ability animations, and helmet states |
| Compact home scene and one space region | One walkable destination with authored traversal and puzzle points |
| One drone enemy; scan markers; one upgrade change | Iguana and alligator encounters with recoverable defeat animations |

### Privacy and access

Default recommendation: keep the family-likeness build private or access-controlled until Paul explicitly approves sharing. A hidden URL or search-engine exclusion is not access control. Protect asset requests as well as the page; use anonymized placeholders in public previews.

Store original references outside public repositories and client bundles; remove location metadata before derivative use. Do not reproduce the real home’s address, school information, vehicle identifiers, or precise neighborhood layout. Do not collect separate child accounts, voice recordings, or behavioral profiles.

### Sound and dialogue

Use distinct suit sounds, short optional crew lines, captions, and separate music/effects controls. Recorded or synthetic family voices are optional and require a separate approval; they are not a first-release dependency.

---

*09  /  PROPOSED / DEPLOYMENT NOT AUDITED*

## Technical foundation

Preferred direction: keep rendering and the single-player game simulation in the browser; use backend services only for functions that need them. More server resources are not the proposed remedy for a slow rendering scene.

| Layer | Proposed responsibility |
| --- | --- |
| Website route | Integrate /space-dragon into the existing site without replacing /. Inspect the actual repository, framework, routing, and deployment before choosing the integration method. |
| Browser runtime | TypeScript with a client-rendered Three.js game. Use the surrounding React/Next.js application for menus and page UI if compatible with the existing site. Library and engine choices remain subject to a prototype. |
| Game state | Keep simulation, mission state, input, rendering, and content definitions separated. Use a single game-state owner rather than React rerenders for every object on every animation frame. |
| Assets | Load models, textures, and audio by scene. Use approved static assets or protected asset delivery; keep original family references out of deployable content. |
| Persistence | First playable: versioned local checkpoint saves. Later: an authenticated save API on Railway and PostgreSQL if cross-device progress is approved. |
| Operations | A separate game module and preview workflow; no changes to unrelated website features. Add backend services only with a measured need and an approved operating budget. |

### Routing and client/server boundaries

Next.js documents Client Components for interactive UI and browser APIs [T1]. Proposed implementation: load the game runtime at the /space-dragon route and keep server-only secrets out of the browser. Inspect actual package versions before using framework-specific APIs.

Vercel supports rewrites to other origins while preserving the visible URL [T2]. A separate game deployment is therefore an option, not a requirement. Prefer a normal site route when practical; otherwise validate nested routes, asset paths, and authentication behind the rewrite. Do not assume that arbitrary real-time traffic works through an HTTP rewrite.

### What Railway would add

Railway documents vertical scaling and configurable replicas [T3]. For this game, propose a small save/API service first—not a continuously running multiplayer simulation. Account capacity, existing services, prices, and actual usage have not been checked. Redis and multiple replicas are not first-release requirements.

> Before implementation  Inspect the website repository and deployment, record the supported device/browser, test one dragon scene, and confirm private-asset delivery. Do not upgrade infrastructure based on the size of the game idea alone.

---

*10  /  PROPOSED ENGINEERING CONTRACTS*

## State, content & persistence

### Small, stable content model

| Record | Minimum fields or responsibility |
| --- | --- |
| CharacterDefinition | Stable ID (paul, maria, luke, luna, lyla), display name, portrait/model references, suit role, ability IDs. No photo originals or birth dates. |
| AbilityDefinition | ID, owner, valid target categories, range/cooldown configuration, effect, animation/effect reference, and follower-assist policy. |
| Destination / Mission | Stable ID, scene and spawn references, prerequisites, objective state machine, completion reward, and safe retry checkpoint. |
| DiscoveryEntry | ID, scan target, image/audio/caption references, found state, and authored unlock or replay references. |
| SaveGame | Schema version, revision, timestamp, mission/checkpoint, discoveries, upgrades, settings, and optional party state reserved for later. |
| PartyState — later | Party ID, member IDs, leader ID, scene/checkpoint, and inactive-safe state. Exactly one active party and one directly controlled character. |

### Save behavior

Save after a completed objective, a return to home, and a confirmed upgrade. Keep one last-known-good checkpoint. Validate loaded data and migrate supported schema versions; if a save is corrupt or incompatible, explain the problem and offer safe recovery instead of a blank screen.

A local save is device/browser-specific, not cloud synchronization. Display clear “Saved on this device” feedback. If local storage fails or is unavailable, keep the current session playable and warn that progress may not persist. Do not silently promise a successful save.

### Cloud extension — only when approved

Use authenticated save ownership and optimistic concurrency: a write supplies its expected revision; the server rejects a stale overwrite. A successful response returns the accepted revision. Do not automatically discard one device’s progress when another device has a newer save.

Candidate API contract: GET /api/space-dragon/save returns the current save or an explicit empty state; PUT /api/space-dragon/save validates schema, ownership, and revision before committing. Route layout and backend language remain subject to the existing-site audit.

### Session and failure rules

Pausing or backgrounding the tab suspends active play. On return, restore a stable camera and simulation state. Missing assets show a recoverable error; repeated reloads must not duplicate rewards. Each mission objective has explicit not-started, active, completed, and retry behavior.

Maintain a content manifest with asset provenance, approval status, and version. Do not introduce live language-model calls into the core flight or combat loop; authored content is the proposed baseline.

---

*11  /  PROPOSED TESTABLE REQUIREMENTS*

## Controls, quality & acceptance

### Control and accessibility baseline

One consistent move control and a small set of contextual actions. Keyboard/mouse and landscape touch are proposed first-release targets; select exact devices before setting the support promise. Walking later reuses move, interact, suit ability, and leader selection rather than introducing a separate strategy-game interface.

Use large touch targets, icons with short labels, optional narration, captions, separate audio sliders, and reduced camera shake. Mission-critical information cannot rely on reading or color alone. No forced rapid button sequences, mandatory motion controls, or unskippable repeated cutscenes.

### Performance goals — unverified budgets

Provisional goals: a responsive 30 fps on the agreed tablet at low quality, 60 fps on an agreed desktop at normal quality, and first controllable play within 15 seconds on a documented 25 Mbps connection. Validate and revise these after the first scene; they are acceptance targets, not measured performance.

During the benchmark, record hardware, browser/version, resolution, quality setting, cold/warm cache, build ID, and a 10-minute representative play segment. Report frame-time distributions and stalls, not just an average fps. Run a separate 20-minute tablet soak to assess heat, stability, and memory growth.

### First-release acceptance checks

| ID | Pass condition |
| --- | --- |
| A01 · Site safety | / still works; /space-dragon opens and reloads correctly; game scripts do not load on unrelated pages. |
| A02 · Full loop | A fresh save completes launch, jump, discoveries, encounter, return, upgrade, and replay without a developer command. |
| A03 · Family identity | All five are represented; approved names/colors/roles are consistent; placeholders are explicit. |
| A04 · Inputs | Keyboard and target-device touch can complete the mission; overlays, pause, and orientation changes do not trap input. |
| A05 · Persistence | Checkpoint survives refresh; storage failure and corrupt/older saves yield clear recovery rather than silent loss. |
| A06 · Resilience | Test missing asset, connection loss after load, repeated objective completion, tab backgrounding, and restart. |
| A07 · Privacy | Private previews and likeness assets reject unauthorized access; originals and sensitive metadata are absent from shipped files. |
| A08 · Playtest | Luke can repeat the key actions after a brief introduction; record every point requiring adult intervention and fix the most frequent blockers. |

> Later gates: leader changes preserve state; stuck followers recover; all members cross scene boundaries; inactive parties remain safe; regroup cannot bypass locked progression.

---

*12  /  PROPOSED DELIVERY SEQUENCE*

## Phases, dependencies & risks

| Stage | Deliverable and exit condition |
| --- | --- |
| 0 · Foundation | Inspect existing site/repository and deployment. Confirm target device, privacy posture, and a dragon direction. Exit with a playable rendering/control test and documented integration plan. |
| 1 · First playable | Ship the Launch Day loop described in section 7. Exit only when the section 11 first-release checks pass on actual hardware. |
| 2 · Family expedition | Add one walkable location, five suit avatars, one active party, leader switching, automatic followers, contextual assists, and one small teamwork puzzle. Exit with no follower or ability soft-locks. |
| 3 · Group expeditions | Add two switchable parties, safe inactive-party handling, regroup, and a persistent cross-group puzzle. Exit with membership and save/load tests passing. |
| 4 · Expansion | Add locations, story episodes, dragon upgrades, and enemy variety guided by playtests. Consider cloud saves or multiplayer only through separate approved scope. |

### Risk register

| Risk | Mitigation / proof needed |
| --- | --- |
| Scope grows before the first fun loop | Keep one playable region and one mission. Record new ideas in the backlog; do not add them to phase 1 by default. |
| Realism exceeds device or asset capacity | Approve the cast art direction, then test one optimized face/model in-game before producing the full set. |
| Party AI turns into babysitting | Use authored traversal, wide recovery margins, safe catch-up, and explicit follower obstruction tests. |
| Real family / neighbor privacy | Approve fictionalization and access controls before sharing. Keep source references and identifying environment details private. |
| Hosting changes break the main site | Isolate the route, test previews, validate assets and authentication, and keep a rollback path. |
| Infrastructure costs without gameplay value | Measure client and backend separately. Set an operating budget before enabling paid services; do not equate replicas with better graphics. |

### Implementation handoff rule

An implementer must first report what already exists: repository, framework, deployment, route ownership, assets, saves, and tests. Mark missing evidence explicitly. Do not claim a feature is built, a service is connected, or a test passed without a runnable result or recorded test evidence.

> No delivery dates, total production budget, or hardware-capacity claims are established by this draft. Those follow the foundation inspection and first-scene benchmark.

---

*13  /  LIVING REGISTER*

## Open decisions & source notes

The project can proceed through low-risk prototyping without resolving every story choice. Decisions below should be settled only when they block the next stage.

| Priority | Decision | Current position |
| --- | --- | --- |
| Before build | Existing repository and deployment | Not inspected. Determine route ownership and integration constraints. |
| Before benchmark | Primary play device and controls | Desktop and tablet proposed; exact hardware and browser are open. |
| Before sharing | Private family build or public edition | Private/access-controlled recommended. Public likeness use needs explicit approval. |
| Before art production | Dragon silhouette, color, scale, personality | Open. No final dragon design or reference image approved. |
| Before likeness production | Family photo references and visual approval | Photos not supplied here; do not invent facial specifics. |
| Before suit finalization | Lyla’s color and proposed suit mechanics | Teal is a suggestion. All detailed powers need design approval. |
| Before narrative lock | Villain name, dragon origin, first destination | Working titles and mission treatment remain proposals. |
| Before phase 2 | Walking camera, ability controls, recovery rules | Single active party first; follower details require a prototype. |
| Before paid expansion | Cloud saves, cost ceiling, multiplayer | Not approved; local single-player baseline proposed. |

### Sources and evidence boundaries

Creative source: Paul’s Space Dragon planning conversation on October 28, 2026. Confirmed items in section 1 come from his statements. Assistant-generated elaborations are labeled proposed or open. This document does not establish that the game URL is live.

Technical references: official documentation checked October 28, 2026. They support the limited platform-capability statements in section 9; they are not evidence about Paul’s account, repository, costs, or deployed configuration.

[[T1] Next.js — Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)

[[T2] Vercel — Rewrites](https://vercel.com/docs/routing/rewrites)

[[T3] Railway — Scaling](https://docs.railway.com/deployments/scaling)

### Change log

v0.1 · October 28, 2026 — Initial specification: confirmed canon, proposed suit mechanics, Line Leader and group exploration, first playable scope, architecture, privacy, tests, and open decisions.
