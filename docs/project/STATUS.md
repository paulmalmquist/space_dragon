# Current project state

Updated: **October 29, 2026**. Read this file, [the vision](VISION.md), [inbox](../../ideas/INBOX.md), and [current milestone](../plans/CURRENT_MILESTONE.md) before changing the project. Ideas SD-001–SD-019 are indexed in [the ledger](IDEA_LEDGER.md).

## Current increment

The owner authorized closing the First Contact gaps: game CI, a pure state/save module, keyboard prompts/help/suit introductions, a playable scan and town-map checkpoint, and the first pod asset. The chosen family-playtest target is **this Lenovo 82XM with Chrome, using keyboard**. The requested ten-minute human playtest is still pending.

- The flow now covers living-room launch night → interrupted signal → backyard → five placeholder suit cards → Lyla's scan → symbol archive → town map. Arrow keys point; Space/Enter acts; H repeats speech; F1 advances help; Escape pauses. Family recordings are not used.
- Browser speech is a clearly labeled computer-narrator placeholder, with captions, sound-off play, repeat controls and a three-level hint ladder ending in one-action help together. API calls/error paths can be automated; audible output on the family's speakers remains to be checked.
- A pure [state module](../../src/game/state.ts) owns phases, ordered one-time suit rewards, flags, hints and semantic transitions. [Save v2](../../src/game/checkpoint.ts) validates progress, upgrades all three v1 steps conservatively, retains v1 bytes, recovers a prior checkpoint, and protects unsupported future saves. Restart requires confirmation.
- The [workflow](../../.github/workflows/foundation.yml) now declares Node 24, dependency/browser installation, the build, unit tests, and development/production browser tests alongside the Python foundation checks. A workflow edit alone is not a passing GitHub run.
- An original pod candidate was built in a separate Blender 5.2.1 background process because live MCP did not connect. Its GLB/KTX2 pipeline, opening lid, source hierarchy and actual browser load are technically verified; [the asset receipt](../reports/2026-10-29-pod-asset.md) records evidence and pending human art review.
- The pod runtime file is **463,644 bytes**, with **6,376 triangles**, **38 mesh objects**, five materials and one 256 × 256 ETC1S albedo. Same-origin decoders are included. A local Chromium/SwiftShader load sample was **623.2 ms**; it is not an AMD-GPU benchmark or download budget. Decoder transfer makes the first compressed load larger than the original PNG GLB alone.
- The idea notebook still appends original thoughts to the inbox for the next invoked agent session. It does not run agents automatically. No new family-reference media, missing character attachment or final likeness asset has been supplied.

## Verification for this increment

| Check | Current evidence |
| --- | --- |
| Pure state and save tests | **PASS: 17 tests** on Node 24.15.0; transition/duplicate/replay/skip, help, interrupted suit sequence, v1 migration, invalid/future saves, backup recovery and blocked writes. |
| TypeScript and production build | **PASS** in the current work session; final artifact identity belongs in the task receipt. The original foundation's approximately 1.07 MB main bundle is historical, not the current output. |
| Development/production browser tests | **PASS:** hosted run on code commit `46ae2a4` executed all 17 development and 4 production tests; local full/affected runs also passed. |
| Pod pipeline | **PASS, bounded:** source reopen/export, GLB checks, embedded KTX2 validation, hierarchy/clip, in-game load and same-origin decoding; human art approval pending. |
| GitHub game CI | **PASS:** [run 40958262541](https://github.com/paulmalmquist/space_dragon/actions/runs/40958262541), code commit `46ae2a4`: Node 24, 17 state tests, build, actual Chromium development/production tests. Foundation job also passed. |
| Installed target Chrome smoke | **PASS:** Chrome **156.0.8078.48**, fresh temporary headless profile, completed map and reloaded with all five suits; no page errors. This is not human listening or GPU acceptance. |
| Ten-minute Lenovo/Chrome family playtest | **NOT TESTED:** confirm audible speech, keyboard usability, points needing help and performance on the actual AMD renderer. |

The [current receipt](../reports/2026-10-29-first-contact-v2.md) records source/artifact identity and executed checks. The feature branch `feat/first-contact-playable` is published in [draft PR #13](https://github.com/paulmalmquist/space_dragon/pull/13), based on merged foundation `ea89a05`. The draft remains available for the selected family playtest; it is not merged or deployed. Check the PR for subsequent run results.

## What remains open

- Real family playtest and adult review, audible browser narration, AMD hardware performance and final art approval. Automated speech mocks and SwiftShader runs do not close these gates. Xbox remains opportunistic and untested; touch is deferred.
- The intended host website's repo/deployment and Railway services remain unidentified/unverified. Site integration waits for that source; cloud saves wait for a concrete need.
- Lyla's final suit color, other photo labels, approved family assets, final dragon design and open lore decisions retain their existing status. The `new characters` stub still lacks its source attachment (SD-013).
- First Contact uses a selected short-form script implementation. Broader Act I/II treatments, the Hush/Caller/Bridge and other proposed lore do not become confirmed canon through implementation.

## Next useful action and history

Finish the automated evidence, then run the requested **ten-minute keyboard playtest on this Lenovo in Chrome** with the children. Note each point needing adult help without committing identifying child observations. Use that review to fix First Contact before expanding scope. Space Blocks is next after that gate; the Cadet/Pilot flight experiment has its own later track. Line Leader, Act II and backend expansion remain held.

The original story/photo foundation, tools and unordered-idea workflow were merged in [PR #12](https://github.com/paulmalmquist/space_dragon/pull/12). Historical evidence remains in [the original merge receipt](../reports/2026-10-29-local-foundation.md), [toolchain](../TOOLCHAIN.md), [repo inventory](../REPO_INVENTORY.md), and [pod receipt](../reports/2026-10-29-pod-asset.md). Existing photo bytes, proposed story labels and publication boundaries are preserved.
