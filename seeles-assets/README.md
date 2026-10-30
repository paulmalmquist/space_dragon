# Seele exports: intake and migration

Use this folder to bring useful Seele prototype games into **one cohesive Space Dragon**, then continue refining them with coding agents. **CONFIRMED workflow, SD-036:** the owner is using Seele to generate several prototypes and is starting with **dragon dogfights**. The [prototype integration plan](../docs/engineering/PROTOTYPE_INTEGRATION.md) owns the shared-game boundaries and current candidate inventory. The existing [asset pipeline](../docs/ASSET_PIPELINE.md) owns editable sources, game exports, and browser review.

The dragon-dogfight track may proceed alongside Earth-story validation. Prototype priority does not reorder the story, replace the current room/yard runtime, or establish a completed flight integration.

## For Paul

1. Put the downloaded ZIP, project, or individual assets in `seeles-assets/incoming/` in your local repo. Keep textures and other companion files together. A separate subfolder per download is helpful; the agent can organize it.
2. Include the original prompt, a screenshot or clip, and what you like if convenient. Plain chat is enough; no technical form is required.
3. Tell the agent: **"Inspect the Seele export, choose the easiest maintainable migration, and integrate one useful part into Space Dragon."**

Raw downloads here are ignored by Git. They will not reach another computer or a cloud agent through a push. Run the agent against the local folder, or attach the export to the chat where the agent is working. Uploading through GitHub's website bypasses local ignore rules, so use the local drop folder for unreviewed exports.

Only these instructions, the ignore rules, and the empty incoming-folder marker are tracked here. Reviewed assets move to the existing asset destinations when appropriate.

## First decision: should the repo adapt to the export?

**Current tracking: SD-036** in [the ledger](../docs/project/IDEA_LEDGER.md); see [the owner's latest request](../ideas/INBOX.md). Compare selected-system/asset reuse with a justified scene or runtime refactor after inspecting the actual delivery. No engine migration has been selected.

**Provenance:** these three intake scaffold files were recovered read-only with `git show` from `origin/main@858e13a`, whose earlier Seele entry was **SD-028**. That incoming ID is provenance, not the current local idea number: local SD-028 already means the linear three-act direction. The earlier intake note proposed considering a refactor around a more refined export; it does not prove that any export is a better foundation. This adaptation uses SD-036 and the latest dogfight-first workflow without merging or overwriting the separate incoming changes at `de2864a`.

Inspect the actual export before choosing an approach. The current Babylon.js/TypeScript/Vite prototype is a starting point; its placeholder scene and folder layout need not be preserved for their own sake.

| Approach | Use when |
| --- | --- |
| Import selected assets | The models, materials, or animations are useful and the current scene can accommodate them cleanly. |
| Replace or refactor the scene layer | The environment, hierarchy, lighting, or animation setup provides a better foundation than the placeholder scene. |
| Restructure the runtime or repo more broadly | A runnable exported project demonstrably reduces total integration and future refinement work, including any engine migration. |

Compare the work needed to get a representative slice running, the quality and editability of the files, external service dependencies, browser suitability, future agent changes, and the cost of preserving working behavior. A polished preview alone does not settle that comparison. Record the choice and evidence in the migration receipt; uncertainty can be resolved with one bounded local experiment.

Keep a recoverable baseline and implement the selected approach on an isolated branch or worktree. Preserve the [campaign contract](../docs/story/CAMPAIGN_STRUCTURE.md), keyboard-first goal, checkpoint/reward semantics, the intended `/space-dragon` route, and the existing homepage. Keep 25 off-Earth mission slots, the three-member mission cap, one controlled leader and designated sidekick, and single-pilot dragon flight without crew roles. These are behavior requirements, not a demand to retain every old implementation file. If a consequential architecture or engine choice changes, record it in `docs/decisions/` and update the architecture, commands, and tests. Routine reversible refactoring within the authorized slice can proceed under agent judgment. Do not rewrite the repo before an actual export provides evidence for doing so.

## Agent migration procedure

### 1. Inspect and preserve the delivery

- Read [AGENTS.md](../AGENTS.md), [current status](../docs/project/STATUS.md), [the current milestone](../docs/plans/CURRENT_MILESTONE.md), and the asset pipeline. Inspect the branch and working-tree changes.
- Inventory what was actually delivered: editable project/source files, renderer, controls, state/save ownership, meshes, textures, rigs, animation clips, audio, dependency/lock files, prompts, and preview media. Inspect executable scripts and network calls before running or installing anything. Identify required files or services that are missing. A screenshot, hosted preview, or compiled build is not evidence that editable source was delivered.
- Keep the original download unchanged. Inspect archive paths and imported scripts before extraction or execution; use a separate working copy and do not overwrite unrelated files.
- Record source/provider, export date/version, and available license/usage evidence. Unknown rights or missing files stay explicit. This folder does not authorize purchases, new external uploads, publication of family likenesses, or deployment.

### 2. Route usable material

| Material | Working destination or treatment |
| --- | --- |
| Original package | Keep under `seeles-assets/incoming/` as the unchanged local reference. |
| Editable working art | `assets/source/local/<kind>/<id>/`; preserve source versions. If a `.blend` is made from an imported GLB, identify it as derived from that export. |
| Original and optimized GLB candidates | `assets/game/local/<kind>/<id>/`; use different filenames and compare results. |
| Screenshots, clips, prompts | Keep alongside the original delivery or under `assets/reference/local/`; record which aspects they guide. |
| Scene/gameplay code | Review in an isolated branch/worktree, then adapt or replace the relevant implementation according to the initial migration decision. |

GLB/glTF content is a candidate for the current Babylon runtime. Three.js, Unity, and Unreal code, physics, shaders, and engine-specific scene behavior need deliberate adaptation or a justified runtime change. Do not add a second engine merely to avoid understanding the export. Downloaded models may still need material, rig, or animation repair.

Keep character, mission, inventory and learning progress in the shared game's authoritative state. Do not join prototypes as separate games that reset or lose progress between them. Preserve the existing First Contact v2 and exploration v1 saves until an explicit, validated migration is implemented. Encounter restarts and repeated victory signals must not duplicate campaign rewards.

### 3. Refine and integrate a representative slice

- Follow the existing [Blender asset workflow](../.agents/skills/sd-blender-asset/SKILL.md) when editing artwork. Verify actual tool availability; do not assume Blender MCP is connected.
- Preserve gameplay-relevant dragon components, hinges, sockets, hierarchy, and animation channels. Keep source/reference material out of runtime exports.
- Run the existing GLB inspection and glTF validation commands from [the asset pipeline](../docs/ASSET_PIPELINE.md). Create optimized candidates separately; successful format checks do not establish appearance or performance.
- Explicitly wire selected assets into the runtime and its asset allowlist/destination. `assets/game/` is not automatically served or included in the build. If the selected approach refactors the runtime, update that loading path and its documentation together.
- Start with one useful scene or asset; the current backyard pod/component is a suggested candidate, not an obligation. Do not expand story or gameplay scope merely because the export includes extra features.

### 4. Prove that refinement can continue outside Seele

Run the resulting slice locally with no required calls to Seele. Inspect network requests for hosted assets, authentication, or other dependencies; vendor-hosted generation and local game execution are different concerns. Replace or document dependencies rather than claiming an independent handoff while they remain required.

Make one meaningful follow-up change with the local agent tools, then rebuild/re-export and check the game again. Review scale, materials, animation, interactions, checkpoint behavior, and representative loading/render measurements as relevant. Record the actual browser/device and distinguish software-rendered automation from hardware performance. Use the existing build/browser checks for runtime changes and add focused regression coverage only for behavior that changed.

## Migration receipt and completion

Agents maintain a short receipt beside the working candidate, using the [existing verification template](../docs/templates/VERIFICATION_RECEIPT.md). Include asset ID, original and working paths, source/rights evidence, chosen migration approach and reason, changed files, dependencies, validation/browser results, and remaining work. Keep raw or private evidence local; share only reviewed material.

The handoff is verified when the useful slice runs outside Seele, a subsequent agent edit works, and the relevant behavior and asset checks pass. Receipt statuses must distinguish inspected, migrated, browser-verified, and approved for publication. A successful import does not finish the entire game. No runtime migration, asset approval, live Blender connection, or deployment is established by creating this folder.

## Current delivery

A read-only inventory of the owner's untracked dogfight HTML and adjacent source project is recorded in [the integration plan](../docs/engineering/PROTOTYPE_INTEGRATION.md). The source was not executed, moved, imported or published during this documentation pass. Keep the original files where delivered; future incoming downloads can use this ignored intake folder.
