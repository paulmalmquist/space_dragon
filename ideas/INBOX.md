# Ideas — put anything here

Write below in whatever order it occurs to you. Plain text is enough. You can also send ideas in chat or use the local prototype's idea notebook. Notebook entries receive a `NOTE-...` capture ID; agents connect them to `SD-###` tracking IDs when they process the inbox.

## New thoughts

### October 31, 2026 — Google Vids with manual exports (SD-076)

Owner wording:

> forget runway for now we will use google vids with manual exports

Routing receipt: **CONFIRMED · planned; guidance recorded.** [Decision](../docs/decisions/2026-10-31-google-vids-manual-exports.md): Google Vids → manual file export → local inspection/encoding → Unity video playback and tested handoff. Runway is parked for now; reconnection is no longer a next action. No Google Vids export has been received or verified. Preserve the original exported file and the existing Blender/Unity proof. Next useful action: review the first manual export when available.

### October 31, 2026 — cinematic strategy and dragon launch proof (SD-073)

Later owner reply, October 31, 2026:

> Proceed locally; defer AI enhancement

This narrowed SD-073's completion gate to the fully live Unity launch, controlled local Blender-video alternative and their tested playable handoffs. Later **SD-076** above selects Google Vids with manual exports for subsequent video work and parks Runway; no reconnection prompt is a next action.

Source: owner, new cinematic-production request. The complete original wording and attachment availability note are preserved in [the source capture](2026-10-31-cinematic-launch-source.md); do not substitute this routing summary for the source.

Routing receipt: **SD-073 · CONFIRMED bounded local implementation · verified for named local checks; AI parked by owner.** [Decision](../docs/decisions/2026-10-31-cinematic-launch-proof.md), [plan](../docs/plans/UNITY_LAUNCH_CINEMATIC.md) and [verification](../docs/reports/2026-10-31-unity-launch-cinematic.md) record the separate **12-second Unity LaunchLab**: live 0–3 s, controlled Blender video 3–10 s, protected live 10–12 s and safe flight, alongside the fully live route. Original geometry/choreography remains authoritative. Setup, 21 EditMode tests, source/video/Web build, eleven actual cases per WebGPU/WebGL2 backend and separate real headed focus recovery pass. Prior failures and scoped save/performance limitations are retained. The visibly rough lab has no human final-quality approval; AI enhancement, physical controller, native launch, full Dogfight migration, campaign departure and release remain separate. This supersedes SD-038's old proof boundary while retaining continuity principles.

### October 31, 2026 — align this channel with the Unity upgrade (SD-072)

Owner wording:

> another channel is upgrading to unity. please follow suit

Routing receipt: **CONFIRMED · planned migration; guidance/handoff implemented.** [Decision](../docs/decisions/2026-10-31-unity-channel-alignment.md) makes Unity/C# in the existing project the forward path for this channel. [Dragon/Dogfight handoff](../docs/engineering/UNITY_DOGFIGHT_HANDOFF.md) preserves the versioned Blender asset, materials, sockets, clips, controls, active spelling/dodging, combat and saves. Coordinate with the active Unity project writer. No Unity scene/runtime change or competing Editor/build was made for this alignment. Browser labs remain references/rollback; Unity Dogfight is not yet implemented.

Tracking note: the historical local SD-062/063/064 aliases now map to canonical SD-083/084/085. Main retains canonical SD-062–071; see [the integration crosswalk](../docs/decisions/2026-11-01-unity-integration-identifiers.md). Original owner wording/dates remain intact.

## October 31, 2026 (America/New_York) / November 1 UTC — supplied Oscar Creativo dragon baseline (SD-086)

Source: owner, repo-attached chat. Exact wording:

> "C:\Projects\space_dragon\free-dragon-character-3d-by-oscar-creativo" that 3d model should be our baseline. properly done

Routing receipt: **CONFIRMED baseline selection / verified for the bounded Lenovo/Chrome integration**. [Decision](../docs/decisions/2026-11-01-oscar-dragon-baseline.md), [creator credit/provenance](../assets/source/dragons/oscar-creativo/README.md), [verification/history/gallery](../docs/reports/2026-11-01-oscar-dragon-baseline.md). Source/export/full-weight setup, 86 Unity tests, BC7 build and 11/11 cases on both WebGPU/WebGL2 pass; the root AI agent compared all six matched source/player views; no human/owner review is recorded. Lighting/material differences and HUD cropping remain; owner final quality/release approval remains open. Hosted CI and merge delivery are recorded by the resulting PR. Preserve the original package, v007/v005 rollback, creator credit and existing gameplay/save rules. Future art polish is separate from this completed baseline integration.

### November 1, 2026 (America/New_York) — Oscar presentation polish (SD-086 continuation)

Source: owner, repo-attached chat. Exact wording:

> continue polish

Routing receipt: **CONFIRMED continuation / verified for the bounded Lenovo/Chrome integration**. [Polish receipt](../docs/reports/2026-11-01-oscar-presentation-polish.md). Improve lighting/material response and lower HUD overlap while preserving the selected source/anatomy, attribution, gameplay, active spelling/dodging and saves. The prior baseline remains verified; final expanded `oscar-orbit-v004` setup/build, 86 Unity tests and both 11-case Chrome suites now pass, with matched neutral/HUD observations by AI agents. The earlier screenshot comparison was by the root AI agent, not human review or owner art approval. Continue SD-086; SD-087 belongs to the concurrent Luke work.

### November 1, 2026 (America/New_York) — mechanical dragon and planet detail (SD-086 continuation)

Source: owner, repo-attached chat with a screenshot. Exact wording:

> lets make the dragon look a bit more mechanical while youre at it. hopefully you are mid polish with planet surface

Routing receipt: **CONFIRMED expansion / verified for named local checks**. [Decision](../docs/decisions/2026-11-01-oscar-mechanical-and-near-orbit-polish.md), [active receipt](../docs/reports/2026-11-01-oscar-presentation-polish.md). Add fitted mechanical plates/joint details to a recoverable Oscar derivative while retaining anatomy/animation, and refine near-orbit surface/cloud/atmosphere detail. Original source, baseline and intermediate lighting/HUD evidence remain preserved. Gameplay, collision and saves remain unchanged. The final v009 source/v004 armor with `oscar-orbit-v004` passes source/intake/setup/build, 86 Unity tests and 11/11 WebGPU plus 11/11 WebGL2 cases (~58.7 / 48.6 fps short samples). AI agents inspected matched neutral/HUD/gameplay images; material/lighting differences, occlusion and human art/sound/comfort/release review remain open. Keep SD-086; do not reuse the concurrent Luke SD-087.

<!-- Add your next thought here. No form required. -->

## Captured and connected

### October 31, 2026 — Unity production candidate alongside Babylon

Source: owner, two follow-up messages in the same repo-attached chat. **Both complete original messages are preserved verbatim in [the Unity source capture](2026-10-31-unity-source.md)**, including the supplied performance targets, proposed stack, image links, reference labels and truncated ending of the first message. Source claims and illustrative images are not measured Space Dragon results or approved runtime art.

Owner follow-up, October 31, 2026, when asked about testing a physical PlayStation controller: **“Not now”**. Keep the bindings implemented and record physical hardware testing as deferred/NOT TESTED; do not treat simulated or keyboard results as a physical-controller pass.

Receipt: **SD-083** — CONFIRMED side-by-side Unity feasibility evaluation, now **verified for named technical checks**. Later [SD-072](../docs/decisions/2026-10-31-unity-channel-alignment.md) confirms Unity/C# as the forward production direction; the original local SD-062 alias is retained in the integration crosswalk. [Decision](../docs/decisions/2026-10-31-unity-production-candidate.md), [comparison plan](../docs/plans/UNITY_PRODUCTION_CANDIDATE.md) and [receipt](../docs/reports/2026-10-31-unity-production-candidate.md) record the shared pod, cinematic arrival, third-person input and once-only interaction. The supplied “small placeholder” baseline is corrected by existing Earth walking/pod and Dogfight combat/dragon work. Licensed Unity 6000.6.7f1 passes setup, 11 EditMode tests, Web/Windows builds, WebGPU/WebGL2 browser play and native rendering; matched 720p/gzip-load/process-memory evidence and agent edit/test/build workflow are recorded. Physical PlayStation is owner-deferred/NOT TESTED; human quality and sustained performance remain open. The measurements do not establish an engine-quality winner; whole-game migration is not complete. No backend/hosting, deployment or new likeness permission follows.

### October 31, 2026 — AAA visual upgrade plan

Source: owner, repo-attached chat. The supplied plan below is preserved in full; spacing is normalized for Markdown. Its reference labels did not include source URLs. The accompanying asset-flow image repeats the source/export/optimization/browser/registry sequence described in the text; no new media file was exported into the game.

Receipt: **SD-061 / SD-VIS-001** — CONFIRMED bounded local visual foundation assignment; wider roadmap/reference-project recommendations remain PROPOSED. Work state: **verified for the bounded technical foundation**. [Decision](../docs/decisions/2026-10-31-production-visual-foundation.md), [reconciled plan](../docs/plans/PRODUCTION_VISUAL_FOUNDATION.md) and [receipt](../docs/reports/2026-10-31-production-visual-foundation.md) correct the stale baseline and record quality/camera/performance controls plus backyard material/lighting around the existing Blender pod. 214 units/build, 46 development, nine production, 18 photo checks, fresh source/build/two production checks and six short AMD-renderer samples pass. Human art review, sustained acceptance and the full polished opening remain open. Later SD-083 authorizes the Unity comparison and SD-072 selects Unity for forward work; preserve this Babylon baseline. No whole-roadmap completion, new publication permission or deployment is implied.

<details>
<summary>Original supplied plan — October 31, 2026</summary>

Space Dragon: AAA Visual Upgrade Plan
Architecture review · October 31, 2026 · Based on the current paulmalmquist/space_dragon repository and reference projects
Executive recommendation
Keep the browser-first architecture, invest heavily in Blender assets and lighting, and develop one cinematic, playable vertical slice before expanding the game.

A critical finding from inspecting your GitHub repository: Space Dragon currently runs Babylon.js 9.33, not Three.js. The earlier specification proposed Three.js, but the actual prototype uses Babylon.js, TypeScript, and Vite.

I would not migrate to Three.js solely because some impressive reference games use it. Babylon already has much of the rendering technology we need. A migration should require a demonstrably better result.

The current baseline is also much earlier than the recent Blender screenshots might suggest:
- The committed gameplay scene is built from placeholder boxes, cylinders, and basic materials.
- No completed Blender model is integrated into the committed runtime.
- The GLB inspection pipeline, texture-compression tooling, and Playwright tests already exist.
- The current prototype has a 3-step First Contact sequence, checkpointing, and preliminary controller support—but no playable character locomotion or combat.
This changes the priorities considerably. The immediate bottleneck is art integration and visual production, not a lack of advanced engine capabilities.

My target would be a polished opening sequence: the family home at night, the mysterious pod arriving, a dramatic dragon-component reveal, and the transition into interactive gameplay.
1. What we should borrow from the reference games

| Reference | Strongest technique | Space Dragon application |
| --- | --- | --- |
| Halcyon | Scanned environments, LODs, instancing, selective rendering, adaptive resolution | Detailed Florida neighborhoods and planetary environments without overwhelming the GPU |
| Game Forge | Reusable lighting presets, asset catalog, procedural scenery, automated playtesting | Standardized scene quality and agent-friendly asset production |
| Null Range | Short-range fog, selective bloom, cockpit parallax, radar-reactive effects | Dragon flight, targeting UI, space battles, and otherworldly atmospheres |
| Stefan's Souls-like game | High-detail asset generation, coherent scene lighting, character integration | Dragon design, boss encounters, family armor, combat presentation |
| Chong-U's game workflow | assets.json, small design specifications, repeated agent/playtest iterations | Repeatable Blender-to-game workflow without losing track of assets |
| Voltane | Browser physics, controller-oriented gameplay, racing and multiplayer architecture | Jet-like dragon handling and responsive flight controls |

The most important discovery was Halcyon's rendering strategy. Its creator reports rendering an enormous tropical environment in real time using instancing, distance-based detail, half-resolution effects, texture streaming, and a frame-time-driven resolution governor. Those are much more transferable to Space Dragon than copying its custom ocean or atmospheric shaders.
GitHub+1

Null Range is equally interesting for a different reason. Its developer explains that fog, a disciplined cyan/orange palette, selective glow, and layered cockpit UI create a powerful sense of scale without needing photorealistic geometry everywhere. That's an ideal technique for our dragon's space and atmospheric flight.
reddit.com

Game Forge offers something less glamorous but extremely valuable: a model and material catalog that coding agents can actually search and use, alongside automated tests. We should adapt that organizational approach, not import its entire engine or asset library indiscriminately.
GitHub+1

2. Prioritized implementation roadmap
The order matters. We should not build the complete dragon, five characters, and three planets before proving that one polished asset can render beautifully and run smoothly.

| Priority | Work package | Deliverable | Relative effort |
| --- | --- | --- | --- |
| P0 · 1 | Rendering benchmark | Performance dashboard and reproducible screenshots | Low |
| P0 · 2 | Blender asset integration | One production-quality pod or dragon component loaded into the game | Medium |
| P0 · 3 | Cinematic rendering | PBR materials, HDR environment, shadows, fog, restrained post-processing | Medium |
| P1 · 4 | First Contact redesign | Visually polished, playable house-to-backyard opening | High |
| P1 · 5 | Dragon production pipeline | Rigged, animated dragon with component assembly and LODs | High |
| P1 · 6 | Asset optimization | Automated compression, validation, preloading, adaptive graphics | Medium |
| P1 · 7 | Cinematic director | Seamless transitions among cutscenes, animation, and gameplay | Medium |
| P2 · 8 | Character and combat rendering | One animated family avatar, hit reactions, parry effects, camera feedback | High |
| P2 · 9 | Dragon flight | Playable atmospheric flight and space combat prototype | High |
| P3 · 10 | Planet environments | Streaming world sections, vegetation, biomes, distant terrain | Very high |

Relative effort is a planning judgment, not an implementation estimate. P0 and P1 are the immediate production focus.
3. The graphics upgrades
P0: Replace the placeholder visual foundation
The current src/game/scene.ts uses StandardMaterial, a hemispheric light, two point lights, and primitive geometry. That is fine for validating interactions but isn't an adequate foundation for the look we're targeting.

A. Physically based materials

Use Blender's metallic/roughness PBR workflow for manufactured parts. Give the dragon brushed metal, ceramic armor, subtle edge wear, normal-map detailing, restrained clearcoat, and carefully controlled emissive channels.

B. Physically plausible lighting

Add HDR image-based lighting, directional moonlight, contact shadows, warm practical household lights, and blue light from the mysterious equipment. The contrast between ordinary home lighting and alien technology should be deliberate.

C. Atmospheric effects and grading

Add a controlled HDR post-processing pipeline: tone mapping, subtle bloom, atmospheric haze, selective glow, and camera-specific depth of field. Avoid excessive blur or chromatic aberration that makes gameplay harder to read.

Babylon already supports physically based materials, HDR environment lighting, post-processing pipelines, and advanced shadows. There is no engine migration required for this foundation.
GitHub+2

I would create three consistent visual presets initially:
- Home Night: photorealistic materials, warm interior lighting, cool moonlight, natural shadows.
- Dragon Cinematic: dramatic metallic reflections, controlled blue energy glow, rim lighting and atmospheric depth.
- Alien World: environment-specific lighting, fog, color grading and biome materials.
This lets agents reuse a coherent visual language without improvising lighting and material settings for every scene.
4. Blender-to-browser asset pipeline
This is probably the highest-leverage production investment.

The repo already has the right beginnings: Blender 5.2.1, glTF Transform, KTX tools, an asset inspector, versioned source folders, and a documented Blender handoff.

What's missing is a proven production asset moving through the entire pipeline and into the running game.
Proposed asset production flow
Concept and references
Dragon design · House video · Original asset libraries

Blender master source
Topology · UVs · Materials · Rig · Named sockets

GLB export and validation
Scale · Hierarchy · Animations · PBR compatibility

Optimization
LODs · Mesh compression · KTX2 textures

Babylon browser review
Visual comparison · Load test · Animation · Performance

Approved game asset
Asset registry → Scene loader → Playable scene

What to build into the asset tooling
The centerpiece should be an asset registry that records each asset's ID, version, source, license, dimensions, texture variants, animations, component sockets, and quality status.

A CLI should then inspect the source export, build optimized variants, verify the required nodes are preserved, and publish only approved runtime assets. The existing asset-inspect.mjs is a good starting point.

Use glTF Transform for geometry processing and KTX2 texture preparation. Meshoptimizer is worth testing for geometry and animation data; UASTC for quality-sensitive normal/ORM maps and ETC1S for more compressible textures. These are alternatives to evaluate per asset, not transformations that should be blindly stacked.
gltf-transform.dev+1

Important engineering detail: Babylon can load compressed glTF assets, but production deployment needs the relevant decoders available. Configure self-hosted decoder resources rather than accidentally introducing third-party runtime requests through default CDN behavior.
GitHub

Asset sources to adopt

| Asset source | Best use | License |
| --- | --- | --- |
| Poly Haven | Realistic HDRIs, surfaces, household props, rocks | CC0 |
| ambientCG | Concrete, wood, metal, dirt, terrain materials | CC0 |
| Game Forge catalog | Searchable collection of environment and prototype assets | Mixed, documented |
| Microsoft Rocketbox | Temporary human animation and rig references | MIT |
| Kenney | Collision proxies, UI, prototype props | CC0 packs |

The Game Forge license manifest is unusually useful because it identifies provenance per pack; Rocketbox assets in particular require their MIT license to be retained.
GitHub+1

For the dragon and family armor, I would favor original Blender models. Stock mechanical components and textures can accelerate production, but the central silhouettes should be distinctively Space Dragon rather than replicas of existing film characters.
5. The proposed game architecture
Don't replace the present repository wholesale. Extract small modules from the existing scene as new production features become necessary.

A reasonable target structure is:
```text
src/game/
  core/
    state.ts
    actions.ts
  runtime/
    renderer.ts
    asset-loader.ts
    quality-manager.ts
    scene-manager.ts
  visual/
    lighting-presets.ts
    material-presets.ts
    post-processing.ts
    effects.ts
  scenes/
    first-contact.ts
    backyard-arrival.ts
    dragon-reveal.ts
  cinematic/
    director.ts
    timeline.ts
  gameplay/
    movement.ts
    combat.ts
    flight.ts

assets/
  source/       # Blender editable sources
  game/         # candidate/reviewed exports
  reference/    # never shipped automatically

public/game/     # explicitly approved runtime assets
tools/
  asset-pipeline/
  perf/
```

Proposed additions and organization, not folders claimed to exist today.The architectural rule
Game state, controls, rendering, animation, and cinematic presentation must remain separate.

For example, when the player acquires a dragon wing, the game-state layer awards the wing once. The cinematic layer can then play a spectacular assembly animation, but replaying or skipping that cinematic cannot award another wing.

This is especially important for your existing story architecture, checkpoints, family abilities, and eventual Line Leader mechanic.

Babylon remains the renderer. We can use a renderer abstraction to limit engine dependencies, but avoid building an elaborate cross-engine framework before an actual migration need exists.
6. Performance strategy: learn from Halcyon
I would adopt four particularly useful techniques from Halcyon.

Adaptive resolution: Rather than choosing one fixed render resolution, adjust internal resolution based on sustained frame-time measurements. Your current code caps effective rendering density around 1.5 pixels per CSS pixel on high-density displays. Increasing it can improve sharpness, but only if the GPU has headroom.

Distance-based detail: The close-up dragon retains detailed geometry and texture quality. Mid-distance dragon and environment meshes use simpler models; far terrain, vegetation, and background structures use low-cost representations or impostors.

Progressive loading: Load what the player needs first, then stream higher-detail textures, nearby props, and the next scene while the opening proceeds.

Shader prewarming: Compile important shaders and upload essential textures before removing the loading/title overlay, reducing visible stalls during the first dramatic shot. Halcyon explicitly uses this approach.
GitHub

Proposed performance targets

| Desktop, capable GPU | 60 fps at 1080p |
| --- | --- |
| Integrated Radeon laptop | 30 fps at adaptive 720p–900p |
| Frame-time budget at 60 fps | 16.7 ms |
| Frame-time budget at 30 fps | 33.3 ms |

Engineering targets only. No real-GPU benchmark of the upgraded game has been performed.
The graphics settings should be Cinematic, High, Balanced, and Low, with automatic detection serving only as an initial recommendation.

We should benchmark on the actual Lenovo Radeon machine and at least one stronger gaming computer. Existing Playwright tests are valuable functional checks, but their software-rendered Chromium results do not establish hardware frame rates.
7. The first playable AAA-style slice
Recommended implementation sequence: First Contact — House → Backyard → Dragon Reveal

Scene A — The Signal

The actual house video informs room geometry and layout. High-quality furniture, surfaces, reflections and deliberate camera framing make it convincing. The computer emits a mysterious blue light while the existing sound-bank signal builds tension.

Scene B — The Arrival

A richly detailed pod with moving panels and glowing seams sits in the backyard. Real-time particles, decals, grass, shadows and environmental audio sell the impact. The camera moves toward the pod without switching to an unrelated scene.

Scene C — The Reveal

Dragon components appear in a holographic projection. Use individually addressable mesh nodes, animated assembly tracks, emissive effects, sound synchronization and a guided player interaction.

The sequence should be both cinematic and genuinely playable. The player can look around and interact where intended, the director temporarily controls the camera for key dramatic moments, and then control returns predictably.

For more demanding scenes—such as the dragon exploding into the atmosphere—we can later use a short prerendered cinematic, match the final frame to the live scene, preload the next environment, and hand back control. That hybrid method should be reserved for transitions where it achieves a clear visual benefit; it shouldn't replace live gameplay.
8. Verification requirements
Every production milestone should generate a short report containing screenshots, measured performance, and proof that the asset or feature actually works.

The key acceptance gates are:
- Asset fidelity: Blender and Babylon renders agree sufficiently on shape, materials, normals, emissive surfaces, and animation.
- Asset integrity: Required dragon hierarchy, sockets, bones, and clips survive optimization.
- Gameplay integrity: Checkpoints, controls, scene transitions, and unique item rewards still work.
- Performance: Record median and 95th-percentile frame times, draw calls, initial download size, render scale, and major frame-time spikes on named hardware.
- Visual consistency: Fixed-camera screenshots compare scene revisions without relying on subjective descriptions alone.
- Release safety: No private reference videos, source photos, editable assets, or unapproved likeness data enter the browser build.
I would extend the existing Playwright tests rather than establish a second test framework. Use real-device captures for visual/performance acceptance and headless browser tests for deterministic functionality.
9. What I would explicitly defer
I would not spend the next development cycle implementing a procedural galaxy, multiplayer networking, full vehicle physics, ray-traced rendering, or an experimental custom rendering engine.

Likewise, I wouldn't migrate immediately to Three.js, Unity WebGL, or WebGPU. Those are options, not automatic fidelity upgrades. Babylon already exposes WebGL2 and WebGPU support and has the necessary PBR and rendering capabilities.
babylonjs.com

The correct engine comparison would be the same Blender asset, same scene, same camera, and equivalent quality settings, measured on the same hardware. Only a meaningful performance, fidelity, or maintainability advantage would justify migration.
10. The immediate development assignment
I'd define the next milestone as SD-VIS-001: Production Visual Foundation, with three deliverables:
A. Baseline and controls

Add a performance overlay, fixed-camera screenshot positions, render-quality presets, and a before/after comparison harness.

B. First real Blender asset

Choose the pod or dragon head, complete its original source and PBR materials, export and optimize it, then load it into Babylon from the approved asset registry.

C. Cinematic visual proof

Produce the polished backyard-arrival shot with physically based lighting, shadows, atmospheric effects, and an interactive camera. Verify the existing First Contact progression still works.

Exit criterion: a running browser scene using a genuine reviewed Blender asset, with visibly better material and lighting quality, repeatable visual tests, and measured performance on actual hardware. Not just an attractive Blender render.

That milestone will tell us far more about Space Dragon's achievable quality than another large round of engine research.

Bottom line: The most promising route to a GTA V-class impression in selected scenes is excellent art, strong lighting, careful camera direction, and aggressive optimization—not generating a much larger world or switching engines. Once we establish that quality bar in the backyard, we can extend it systematically to the dragon, family characters, combat, and planets.

</details>

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

## October 31, 2026 — Town Drive junctions and vibration (SD-084)

Owner wording:

> make the correct T intersections but just blocked off by cop cars and barracards.
> car is vibrating too much as we drive

Routing receipt: **CONFIRMED**, technically verified; human road-recognition and comfort review remain open. [Decision](../docs/decisions/2026-10-31-town-drive-junctions-and-motion.md) and [verification](../docs/reports/2026-10-31-town-drive-junctions-and-motion.md). Correct junction branches and visible route closures; stabilize presentation without changing physics/checkpoints.


## October 31, 2026 — Google Maps gate route and proportions (SD-085)

Owner wording:

> please take another look at the layout of the world here in google maps. getting to the hypoluxo gate is straight out of the culdesac, right on green island left on winston trails. look at the proportions closely and make sure we have the world right

Three Google Maps screenshots supplied in chat (two repeat the close neighborhood view). Routing receipt: **CONFIRMED**, technically verified; human road recognition and comfort remain open. [Decision](../docs/decisions/2026-10-31-town-drive-map-proportions.md), [verification](../docs/reports/2026-10-31-town-drive-map-proportions.md). Correct the gate road to Winston Trails South, examine actual street/water/context proportions and preserve the earlier drive improvements.


## October 31, 2026 — Town Drive follows the Unity channel (SD-074)

Owner wording:

> another channel is upgrading to unity. please follow suit

Routing receipt: **CONFIRMED direction; C# foundation technically verified, Unity scene migration open.** This repeats the existing SD-072 engine direction for the Town Drive channel after its map correction. [Decision](../docs/decisions/2026-10-31-unity-town-drive-foundation.md), [Town Drive handoff](../docs/engineering/UNITY_TOWN_DRIVE_HANDOFF.md), [verification](../docs/reports/2026-10-31-unity-town-drive-foundation.md). Use the same Unity project, retain the corrected browser route as reference, and begin with C# state/data parity while coordinating around the active Unity writer.

## October 31, 2026 — Unity Dogfight and tactical combat (SD-075)

Owner supplied [the full tactical upgrade request](2026-10-31-unity-dogfight-source.md), preserved verbatim. Engine clarification:

> Unity, carrying over the existing Dogfight controls and behavior (Recommended)

> yeah lets fully migrate to unity for this pass

Routing receipt: **CONFIRMED / verified locally**. Migrated the playable Dogfight encounter to the existing Unity project; preserve flight, live spelling, breath and encounter-only save boundaries. Add localized damage, prioritized warnings, limited salvage-funded repairs and deliberate limited-turn missiles. Root owns the separate Dogfight scene/build; Launch and Town Drive channel files remain independently owned. [Decision](../docs/decisions/2026-10-31-unity-dogfight.md). All eight requested flows pass in both actual Unity browser backends; see [the receipt and screenshots](../docs/reports/2026-10-31-unity-dogfight.md). Next: owner feel/audio review and sustained performance. No deployment.


## October 31, 2026 — Continue the detailed Unity Town Drive scene (SD-074 continuation)

Owner wording:

> ok do we have to wait for the other channel in order to continue

After the next-step explanation (detailed scenery/minivan and corrected layout, isolated work while coordinating Editor access):

> ok so go ahead

Routing receipt: **CONFIRMED / technically verified**, continuing SD-074. [Final evidence](../docs/reports/2026-10-31-unity-town-drive-scene.md) records the integrated build, complete drive/reload and renderer/focus checks; human art/comfort and release remain open. [Decision](../docs/decisions/2026-10-31-unity-town-drive-scene.md). Implement the detailed playable Unity scene and its bindings in the existing project, preserving the browser reference, assets, route, cabin, traffic, controls and save boundaries. No new story direction or deployment.


## October 31, 2026 — Continue Dogfight art (SD-077)

Owner wording:

> ok change and ok continue with art and such. gameplay is solid

Routing receipt: **CONFIRMED / verified first environment increment**. The owner endorses the current gameplay feel and authorizes art continuation; this is not blanket art/release approval. Preserve combat rules, movement, controls and collider boundaries. First bounded increment: asteroid PBR surfaces, a less synthetic gas giant and decorative rings, with calmer sky exposure. [Decision](../docs/decisions/2026-10-31-dogfight-art-continuation.md). No new source-dragon redesign or external generation.

Verification: final Unity Web build and 11 Chrome cases per WebGPU/WebGL2 pass; [receipt and gallery](../docs/reports/2026-10-31-dogfight-environment-art.md). Gameplay tuning retained; further geometry/dragon art and human visual approval remain open.


## October 31, 2026 — Near-atmosphere battlefield and Blender dragon upgrade (SD-078)

Owner wording:

> rocks look better.
>
> make the planet more in range as if we are close to the planet's atompshere. then we're going to need a lot more thoughtful detail. id also like to see the improvement on the dragon now. update blender with the badass lookwe've agered upon

The supplied gameplay screenshot shows the current gunmetal/crimson dragon in the Unity Dogfight encounter, with the planet outside the view. It is appearance context, not new runtime media or a separate approved asset.

Routing receipt: **CONFIRMED / verified for named local source/player checks**. Rock appearance receives the owner's positive review; the previous “gameplay is solid” remains the gameplay baseline. Bring the battlefield visually close to a broad planetary horizon/atmospheric limb, and continue the agreed SD-059 mechanical-dragon art in Blender rather than limiting this increment to scenery. Preserve the original source and comparison collections, version a distinct upgraded source/game candidate, retain the nine rest bones/clips/sockets, and inspect the export in the actual Unity player. Gunmetal primary armor, crimson plates/membranes, intentional joint mechanisms and restrained orange energy remain the direction. [Decision](../docs/decisions/2026-10-31-near-orbit-dragon-art.md). Geometry, exposure and resource budgets are reversible implementation choices; source/export preservation and final Unity checks are now recorded in [the receipt/gallery](../docs/reports/2026-10-31-near-orbit-heroic-dragon.md). Final Web build, 69 tests and 11 Chrome cases per WebGPU/WebGL2 pass; short samples are about 59 fps. Owner art approval, sustained performance and minor sky-seam cleanup remain open. No combat tuning, landing/atmosphere simulation, new campaign planet assignment or deployment is implied.


## October 31, 2026 — Larger and more menacing dragon in view (SD-079)

Owner wording:

> it should also be a big bigger in view and more menacing somehow

Routing receipt: **CONFIRMED / verified for named technical checks**. In the ongoing SD-078 dragon review, “it” refers to the dragon. Treat this as a bounded presentation pass: a closer readable chase view, stronger visual presence/posture and intentional lighting within the agreed gunmetal/crimson mechanical design. Preserve the gameplay baseline, input/aiming, combat timings/resources, authored source scale, independent collision and save boundaries. [Decision](../docs/decisions/2026-10-31-dragon-screen-presence.md). Root will inspect and implement render-only changes; no new source changes, build pass or appearance approval is claimed at intake. SD-078 remains verified for its exact earlier artifact; this follow-on gets its own receipt and screenshots. No deployment.


Final technical evidence: 9.8 m camera/cadence/rim changes, combined camera/audio Web build, final 69 tests and 11 Chrome cases per backend pass; [receipt/screenshots](../docs/reports/2026-10-31-dragon-screen-presence.md). Tested player retains mechanical v005; organic v006 is source-only. No owner menace/comfort or sustained-performance approval.

## October 31, 2026 — Blender Undo and purple organic-dragon reference (SD-080)

Owner wording:

> i hit undo in blender.
> make it look like that please.

The owner supplied an image reference with this request: an organic-looking purple dragon with a powerful chest, long curved neck, predatory head, swept horns, visible scales, violet wing membranes and claws. This description records the chat reference's visual role only. No local image filename, download, source author, license, exported texture or external upload is assumed.

Initial routing receipt: **CONFIRMED / in-progress at intake**. The reported Undo and replacement reference mean the preceding mechanical result is not accepted as the next art direction. Inspect the actual post-Undo live Blender state and preserve it before making a fresh versioned candidate; do not automatically reapply the gunmetal/crimson mechanical edits. Follow the living purple-scaled silhouette/material direction in the attached reference. [Decision](../docs/decisions/2026-10-31-purple-organic-dragon.md). SD-078's v005 source/export/build remain historical technical evidence and rollback, not approval of the new selected appearance. SD-079's bigger/more-menacing framing intent can continue where compatible, but its mechanical styling assumptions are superseded; rendering edits and an EditMode run are in progress, with no new player build yet. Root owns Blender. New source/export/Unity appearance and performance verification are pending; no story/backstory, combat, save, deployment or external-asset permission change is implied.


First-source checkpoint: the actual post-Undo state was preserved separately. A first organic v006 source is implemented and visually inspected, with its own 15-bone rig; [source receipt/gallery](../docs/reports/2026-10-31-purple-organic-dragon.md). Anatomy remains stylized and needs sculpture; no optimized/baked organic export, validated deformation/clips or Unity promotion is claimed. The prior mechanical player is retained for separate camera/audio checks, not reinstated as the selected art direction.

October 31 continuation, exact owner wording:

> continue then

Continuation routing: **CONFIRMED / in-progress, same SD-080**. Continue the purple organic candidate through targeted face, wing and scale refinement, a flight-ready pose/export, and actual Unity integration with evidence at each stage. Preserve the post-Undo recovery and earlier reviewed sources. Root remains the sole live Blender/Unity writer; existing movement, combat, collision and save boundaries remain intact. This authorizes the next useful local work, not a claim that the new art/export/player is already verified or owner-approved. [Continuation checks](../docs/reports/2026-10-31-purple-organic-dragon.md#october-31-continuation--refinement-to-player).

Continuation outcome: **IMPLEMENTED / technically VERIFIED for bounded organic v007 integration**. Final Web build and 11 Chrome cases per WebGPU/WebGL2 pass; mouth-origin checks align and scoped saves remain unchanged. Isolated WebGPU 58.1 fps / WebGL2 24.3 fps at 1366×768; fallback below 30 fps remains an explicit limit. [Final receipt/gallery](../docs/reports/2026-10-31-purple-organic-dragon.md). Owner art approval, foot/wing/sculpt refinement and fallback LOD/performance remain open; installed-Chrome repository QA passes (237 units, 49 development, nine production, build/18 reference checks); earlier failures retained. Preserve all earlier failure and recovery evidence.

## October 31, 2026 — Better, heavier Dogfight sound (SD-081)

Owner wording:

> sounds are dinkey too. please use better ones

Routing receipt: **CONFIRMED / verified for named technical checks**. Improve the weight and quality of the actual Dogfight cues, preserving existing sound controls and action timing. An audio audit and heavier candidate versions are underway; file existence or technical playback does not establish human mix approval. [Decision](../docs/decisions/2026-10-31-dogfight-heavier-audio.md). Keep SD-080's purple organic-dragon focus and compatible SD-079 camera steering. No new paid library, voice cloning, external upload or deployment is implied.

Final technical evidence: five licensed v002 cues, file metrics, protected voices/ducking/headroom and final build/both 11-case browser runs pass; [receipt/audition](../docs/reports/2026-10-31-dogfight-heavier-audio.md). Sound-enabled breath exercised, but no captured waveform or human mix approval.

## October 31, 2026 — Flying and fire-breath video reference (SD-082)

Owner wording:

> gemini_generated_video_c520671c.mp4 theres the dragon flying and breathire fire for reference

Routing receipt: **CONFIRMED reference purpose / verified local reference inspection**. The exact file was found at repo root: 11,872,323 bytes, 20.032 seconds, 1280×720/24 fps, with audio; SHA-256 `b9cf5757b2d738faf3e31b557ff1712609ba8cdfdfb7dedce67f1243dde8cd86`. Root inspected five locally extracted frames; see [receipt](../docs/reports/2026-10-31-purple-dragon-motion-reference.md). Use the clip for SD-080 flying and fire-breath motion/appearance guidance, then record observed timing/shape details with provenance. [Decision](../docs/decisions/2026-10-31-purple-dragon-motion-reference.md). The request calls it a reference; it does not authorize publishing the clip, exporting it as a runtime cinematic, uploading private media or inferring its license/provider from the filename. Current organic Blender work, larger screen presence and gameplay boundaries continue.


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

Historical October 31 merge routing receipt: incoming SD-014/015/016/017/018/027 duplicate existing SD-028/029/030/031/032/033 and retain those canonical IDs. That reconciliation assigned SD-062–071 and reserved SD-061 for concurrent visual-foundation work. Its next-ID pointer was SD-072. The [November 1 crosswalk](../docs/decisions/2026-11-01-unity-integration-identifiers.md) now includes SD-061 and maps later local collisions to SD-083–085; next unused is SD-086. This reconciliation changes tracking, not creative authority, deployment, final art approval or mission scope.

### November 1, 2026 — dragon-shaped spacecraft and instant wing lasers

Source: owner, Space Dragon chat, America/New_York; accompanied by an in-game screenshot of the Oscar dragon and near-orbit planet. Exact wording:

> better.
> the planet is still too low fi
> let's make the dragon wings more for show. this is a dragon shaped spaceship rather than a dragon.
> we want the propulsion to be shown out of the dragon wings. head doesnt have to move. lets get closer on the dragon ship and make him bigger. wings more metallic
> the barrel roll is somewhat spastic
> make holding B sharper turn for evading
> let's have the windup for fire breath to be a bit more animated
> make the firebreath more detailed
> basic attack change to two lasers (one from each wing) that dont take any time to arrive at the target

Routing receipt: **SD-086 continuation** · **CONFIRMED** direction · **IMPLEMENTED / VERIFIED for named local v002 checks**. [Spacecraft decision](../docs/decisions/2026-11-01-dragon-shaped-spacecraft.md) records the overrides to organic flapping and fresh-press-only B for the current Oscar profile, while preserving original assets/clips and previous candidates for rollback. Affected files: Unity flight/camera state, encounter input and wing-laser queries, dragon/wing/weapon presentation, planetary materials and the [combat/input contract](../docs/gameplay/INTERACTION_CONTRACTS.md). Final `oscar-spacecraft-v002` passes **103 Unity tests**, Web build, **11/11 Chrome cases per WebGPU/WebGL2** and separate AI neutral/gameplay review; short 1366×768 samples are **59.70 / 59.41 fps**. [Receipt/gallery](../docs/reports/2026-11-01-dragon-spacecraft-pass.md) records actual evidence and organic-body, framing, cloud/fire and memory-counter limits. No new Blender export is claimed; v009/source GLBs are unchanged. Next: owner visual/feel review; human appearance/comfort/sound and release remain open. This intake adds no deployment, new provider upload or campaign/save scope.

## November 1, 2026 — Continue Unity Town Drive photorealism (SD-074 continuation)

Owner wording:

> continue photorealism
>
> ok continue judging visual result

Routing receipt: **CONFIRMED / technically verified; agent visual review complete**, continuing SD-052/074. [Decision](../docs/decisions/2026-11-01-town-drive-surface-art.md) and [evidence](../docs/reports/2026-11-01-town-drive-surface-art.md). Correct physical surface tiling, improve roof/stucco materials, low residential planting and daylight in the existing Unity scene; preserve mapped geometry, behavior and saves. Human art approval remains separate.


## November 1, 2026 — Continue Town Drive foliage and cabin realism (SD-074 continuation)

Owner wording:

> continue with photorealism

Routing receipt: **CONFIRMED / technically verified; agent visual inspection complete**, continuing SD-052/074 after PR #32. [Decision](../docs/decisions/2026-11-01-town-drive-foliage-cabin.md). Improve the conspicuously sparse palm crowns, repeated facade treatment and cabin materials/rear view in the existing Unity project, preserving route/anchors and driving state. Actual before/after player checks and performance samples inform acceptance; no full photorealism or production deployment claim.


## November 1, 2026 — Reference-led road markings and Blender realism (SD-074 continuation)

Owner wording:

> please take another lap through my reference video and come up with legitimate ideas for increasing the realism of the current iteration. the yellow lines are not straight (and not present in many of the example video's cases) and we need more photo realistic blender assets too. start with those and input them in the game

Routing receipt: **CONFIRMED / technically verified; agent visual inspection complete**, continuing SD-052/074. [Decision](../docs/decisions/2026-11-01-town-drive-reference-road-assets.md), [evidence](../docs/reports/2026-11-01-town-drive-reference-road-assets.md). Sampled both supplied timelines, corrected paint presence/geometry, authored and integrated three Blender plant families. Fourteen scene checks, both browser backends, focus recovery and full lap/reload pass. Driving/map/save data and source assets are preserved. Recorded remaining foliage darkness, repeated surroundings and memory cost; full photorealism remains unfinished.


### November 1, 2026 — skillful combat without more controls (SD-088)

Owner source: [complete attached brief and directional-movement wording](2026-11-01-dogfight-combat-upgrades-source.md). Authority **CONFIRMED**; work state **in-progress**. Implement eight reversible Unity encounter stages: perfect roll, enemy roles/waves, claw finishers, wingman, scenery weapons, multi-lock breath, optional repair code and one SONG comeback. At most one new key (T); no campaign changes. Preserve the tested spacecraft baseline and latest Town Drive work. [Decision](../docs/decisions/2026-11-01-dogfight-combat-upgrades.md), [receipt](../docs/reports/2026-11-01-dogfight-combat-upgrades.md). The chat summary says WAKE, but the detailed attachment explicitly chooses SONG to avoid reserved flight keys; use SONG. “Plasma” means the existing twin-laser ordinary weapon. Independent angle/translation intent is being clarified; proceed with independent combat work. Open PR only; do not merge or deploy.
