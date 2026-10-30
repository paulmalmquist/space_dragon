# Current project state

Updated: **October 30, 2026**. Agents update this file after each meaningful work session. See [the ledger](IDEA_LEDGER.md) for why work exists and [the roadmap](ROADMAP.md) for dependencies.

## Verified starting inventory

- Existing story/specification, implementation handoff, Blender handoff, context summary, and a photo-publication decision.
- Eighteen family-reference JPEGs, manifest, local gallery, and `tools/verify_family_references.py`. The previous import's checks are recorded in the publication decision; repeat the verifier when changing this collection.
- At initial inspection today: no game runtime, package manifest, completed models, build pipeline, backend configuration, deployment configuration, or gameplay-test results in this checkout.
- Development machine inventory: Lenovo 82XM, approximately 13.8 GiB usable physical RAM, AMD Radeon graphics; Windows reports approximately 2 GiB adapter RAM. Integrated-GPU shared memory is not fully described by that adapter field. Node 24.15.0, npm 11.12.1, Python 3.14.4, Git, Git LFS, and winget are present.

## Added project memory

- [Idea inbox](../../ideas/INBOX.md): plain-language intake with preserved source thoughts and routing receipts.
- [Agent instructions](../../AGENTS.md): read order, idea processing, decision authority, story constraints, and verification expectations.
- [Vision](VISION.md), [roadmap](ROADMAP.md), and [ledger](IDEA_LEDGER.md): current direction, production order, and traceability for SD-001 through SD-013, including the reconciled remote directions and proposals.

## Reconciled remote planning work

The publication branch incorporates the newer `origin/main` history through `0474b97` alongside the local foundation. The starting inventory above is the original checkout snapshot, not a claim that the combined repository lacks the later work.

- Shared contracts, canonical `.agents/skills/` and Claude mirrors, `CLAUDE.md`, static foundation/combat checks and unit fixtures, and a read-only GitHub Actions workflow are now present. Their existing receipts record earlier static results; the combined merge needs its own current verification receipt. Manual agent-behavior cases remain unexecuted unless a receipt says otherwise.
- The [story index](../story/README.md) and [scripts index](../story/scripts/README.md) organize Act I refinements, suit reveals, Act II, music/empathy/pacing, and proposed production scripts. These are writing deliverables, not implemented scenes. The Caller, Hush, passenger, musical SOS, Bridge, and other dependent lore remain proposed; living material is an owner idea with proposed details.
- The root `new characters` stub mentions Mox, Tavi, Captain Nera, and Rook as proposed names, but does not contain the referenced attachment or dialogue. Their complete designs and roles remain unavailable here.
- [Keyboard-first input](../decisions/2026-10-29-keyboard-first-input.md) and [on-foot alley-oops / single-pilot jet-like flight](../decisions/2026-10-29-alley-oops-and-jet-flight.md) are confirmed direction. Xbox support is opportunistic and not tested; touch is deferred. The detailed later combat systems are not part of the current runtime.
- **Story structure, October 29:** the owner confirmed a linear, three-act story ending with a final landing on planet Viera ([decision](../decisions/2026-10-29-three-acts-linear-and-viera.md), SD-014 to SD-017). A [three-act plan](../story/THREE_ACT_PLAN.md) and a proposed [Acts II & III treatment](../story/ACTS_II_III_THE_ROAD_TO_VIERA.md) (SD-018) were added. On October 30 the Act II treatment was rewritten to end at the Forge Ring, an Act III treatment was added, and the Silent Center and Encore and Home scripts moved to Act III as [The Rest Garden](../story/scripts/A3-04_THE_REST_GARDEN.md) and [The Final Landing](../story/scripts/A3-09_THE_FINAL_LANDING.md). Lane levels and A3-00 to A3-03 are not scripted yet. Documentation only; no runtime change.
- **Villain, October 30:** the owner confirmed a villain is the reason for the SOS, told at a mythic scale ([decision](../decisions/2026-10-30-villain-is-the-reason-for-the-sos.md), SD-031). A proposed [villain treatment](../story/VILLAIN_ARC.md) introduces Morrow, the Long Note, with an integration list; act treatments and scripts are flagged but not yet rewritten. Documentation only.
- **Morrow approved, Heartnote, translation, October 30:** the owner approved Morrow and asked for the "home note" to be renamed (SD-032) and for a way to translate language (SD-033). Morrow is now integrated across Act I seeds, Act II (the Old Song, his voice at the Spires, the Temptation at the Forge) and Act III (Landfall, the Garden, the Last Hold, the Lodestar). The note is now **the Heartnote**. Translation went through two drafts that day (SD-033, SD-034); the owner then settled it (SD-037): **the game is in English**, and the suits are a one-line hand-wave for why the family understands everyone ([language](../story/LANGUAGE_AND_TRANSLATION.md)). The Glyph Book and other translation mechanics are retired, and glyph puzzles use plain English. Documentation only.
- **Curriculum puzzles, October 30:** a proposed [curriculum puzzle plan](../learning/CURRICULUM_PUZZLE_PLAN.md) (SD-027) gives each learning stop a numbers-and-letters track and a math-and-reading track, fed by a parent's local This Week list. Documentation only; no learning feature is implemented.
- [The current milestone](../plans/CURRENT_MILESTONE.md) defines the bounded next work. The short guided prototype below is a foundation, not completion of the fuller proposed First Contact script or all SD-M1 acceptance checks.

## Seele intake guidance — October 30

[seeles-assets](../../seeles-assets/README.md) now provides a local incoming folder, scoped Git ignore rules, and agent migration instructions (SD-028). The first decision compares importing selected assets, replacing/refactoring the scene layer, and broader runtime/repo changes when a stronger export lowers total work. Existing source/candidate destinations remain the processing paths. The [verification receipt](../reports/2026-10-30-seele-intake.md) records foundation checks, 41 existing unit checks, local-link review, and nine Git-ignore cases. This is intake guidance only: no Seele export, model, engine change, Blender session, or deployment has been verified in this work. The next evidence is a real export running and accepting a further agent edit outside Seele.

## House interior reference — October 30

The owner's video is labeled **House interior** and saved as `house-interior.mp4` under the owner's `Space Dragon/House interior/` folder. A matching local copy is at `assets/reference/local/environments/house-interior/house-interior.mp4`; this ignored source does not travel with Git. [Source notes and the intake receipt](../../assets/reference/environments/house-interior/README.md), SD-029, record its purpose for the initial house's 3D environment, metadata, and verified byte preservation. Sampled frames were inspected. No house model, scan, external-generation upload, or runtime change is claimed.

## Car driving reference — October 30

The owner's `IMG_5754.mp4` is labeled **Car driving — West on Hypoluxo → North on Jog → West on Lantana → South on Hagen Ranch** and saved under the owner's `Space Dragon/Car driving/` files. [Source notes and the intake receipt](../../assets/reference/environments/car-driving/README.md), SD-030, now make the reference discoverable in the repo. The notes include metadata, checksum, sampled-frame observations, and retrieval instructions; the MP4 itself is not in Git. Its route is an owner-supplied label. Exterior reconstruction and runtime integration remain future work.

## Completed local foundation

- Babylon.js 9.33.0, TypeScript 7.0.2, Vite 8.3.5, Playwright 1.64.1 with its Chromium browser, and glTF Transform 4.5.1 are installed as exact-pinned project dependencies.
- The guided First Contact prototype renders a living-room computer and backyard pod, advances through the short interaction, and stores a versioned checkpoint. Geometry, story staging, and materials are placeholders; there are no family character models or finished dragon assets.
- `Start Space Dragon.cmd` starts the local workspace. The development server was left running at `http://127.0.0.1:5173/space-dragon/` at handoff; the launcher can restart it in a later session.
- The local **Idea notebook** appends original thoughts to `ideas/INBOX.md`, preserves failed/new drafts, and assigns capture IDs. Agents process those captures when invoked; capture does not automatically run an agent.
- FFmpeg/FFprobe 9.0.1 and Khronos KTX/toktx 4.4.2 were installed for the current user. All ten tools in `npm.cmd run doctor` report Ready, including existing Blender 5.2.1. This does not establish a live Blender MCP connection.
- Git LFS is initialized for this repo, with attributes for future large source/model/media files. Existing photos and Git history were preserved. Asset source/reference/candidate folders, read-only GLB inspection, safe reference-frame extraction, and repeatable setup helpers are ready.

## Original local-foundation verification — October 29, 2026

These results describe the local foundation before integration of the newer remote planning files. The merge verification receipt records checks against the combined work; do not infer that earlier results prove the later merge.

| Check | Actual result |
| --- | --- |
| `npm.cmd run check` | Passed: TypeScript/build, **9 browser tests**, and all **18 photo references**. |
| Browser flows | Actual WebGL 2 render; keyboard, pointer and supplemental narrow touch interaction; completion/reload/reset; malformed/unsupported/invalid-type saves; blocked storage; notebook file append and draft preservation; cross-origin rejection; reference-source access denied. Tests wrote only to the ignored fixture inbox. Touch remains deferred by the later input decision. |
| Built app preview | Passed at the prefixed route: checkpoint reload, no notebook button/development state API, notebook POST returns 404, no page errors. Artifact inventory excludes source/reference media and project docs. |
| Screenshots | Desktop and 390-pixel touch layout captured and visually reviewed in `artifacts/first-contact-desktop.png` and `artifacts/first-contact-mobile.png`. |
| Asset helpers | Valid/malformed GLB checks and unchanged input bytes passed. Synthetic FFmpeg clip produced four frames; an existing output directory was refused without overwriting. |
| KTX tools | FFmpeg-generated PNG → ETC1S KTX2 → `ktx validate` passed. |
| Windows setup | Exact npm doctor command and idempotent setup passed under Windows PowerShell 5.1. |
| Dependency/source hygiene | `npm.cmd audit`: zero known vulnerabilities. `git diff --check`: passed. Existing photo checksums unchanged. |

The browser run used **Chromium with SwiftShader software rendering**. It is compatibility evidence, not an actual-device performance benchmark. The observed scene has 32 meshes and 5,222 triangles; its frame sample is recorded in ignored `artifacts/browser-smoke-state.json`. The build emits an approximately 1.07 MB main JavaScript chunk (259 KB gzip) and a size warning; production download/renderer optimization remains work for the asset benchmark. No desktop 60 fps or mobile 30 fps claim is established.

The owner authorized pushing and merging this foundation on October 29. Use Git history and the pull request for the resulting publication state; this document does not claim a deployed game. Existing story updates from remote are retained, while the original specification and authorized photo bytes are preserved. The [combined-tree verification receipt](../reports/2026-10-29-local-foundation.md) records the merge-base/artifact identity, 9 browser passes, 39 Python passes with 2 host-related skips, production isolation, and preserved remote files. Restarting a progressed checkpoint now requires confirmation.

## Boundaries and open evidence

- The actual `paulmalmquist.com` website source and deployment remain unidentified. Public inspection returned unexpected homepage content and a 404 at `/space-dragon`; see [inventory](../REPO_INVENTORY.md). The homepage must be preserved during eventual integration.
- Railway connection, services, capacity, budget, and save synchronization are unverified. Local setup does not establish a backend.
- Blender 5.2.1 is installed. The Blender MCP connection was unavailable during this setup check; the active scene and live export path remain unverified. No finished character/dragon asset is claimed.
- The specific player computer/browser, measured graphics budgets, approved final art, and major open lore approvals remain unresolved. Keyboard is primary; Xbox plug-and-play is not tested and touch is deferred.
- The older handoff's no-implementation language records earlier documentation work. Today's owner instruction authorizes useful local setup and reversible implementation choices; it does not establish public deployment or new paid services.

## Next useful action

Process new inbox thoughts first and use the current milestone's keyboard-first acceptance scope. Inspect the proposed First Contact script for the next spoken-help/suit-introduction increment without treating its unconfirmed lore as settled. In parallel, open Blender with its existing MCP add-on running, inspect/save the scene, and take one reviewed pod/component through GLB export, validation, browser loading, and visual review. Establish measurements on a named computer/browser. The Lyla pilot character can follow the existing handoff once the next art review is useful; additional reference labels can arrive incrementally. Obtain the actual character/story attachment before expanding the `new characters` stub into designs or dialogue.
