# First Contact v2 verification

Date: October 29, 2026. Scope: requested game CI, pure state/save v2, scripted keyboard/speech/help/suit/scan/map slice, and first pod asset. The owner selected **Lenovo 82XM / Chrome / keyboard** for the human playtest. That ten-minute session has not been performed by automation.

## Identity and implemented outcome

- Base: merged foundation `ea89a05`. Feature branch: `feat/first-contact-playable`.
- Local built `dist/index.html` SHA-256: `b82b52720ebe501d3df339d3d8305f2e0d234e15aac230b64d3d6ebf5c9e1fdc`.
- Changes: pure `state.ts`, save-v2 validation/migration/recovery, script-derived content, gesture-activated synthetic narrator, captions/replay/mute, Kid Keys, three help levels, pause/less-motion, suit cards, scan/archive/map; development notebook retained; game CI and production checks added.
- Asset: original Blender pod, named hinge and `pod_open` clip, ETC1S KTX2, same-origin decoders and hash allowlist. [Asset receipt](2026-10-29-pod-asset.md) records source/export/render evidence and validation limits.
- Environment: Windows Lenovo 82XM, Node 24.15.0, TypeScript 7.0.2, Babylon 9.33.0, Playwright 1.64.1 / Chromium with SwiftShader. Actual Chrome speakers, AMD GPU performance, Xbox and human child usability are separate evidence.

## Local checks

| Exact command/procedure | Result | Evidence and limits |
| --- | --- | --- |
| `npm.cmd run test:unit` | PASS: 17 | Script transitions/checkpoints; stale/duplicate suit/scan actions; replay/skip; assisted/independent completion; interrupted suit saves; strict state validation; all three v1 migrations; backups, corrupt/future saves, blocked/quota writes. |
| `npm.cmd run build` | PASS | Strict type check and static artifact; dynamic Babylon loaders and self-hosted payload copied. No final-device performance claim. |
| `npm.cmd test` and affected regressions | PASS | Initial 15-case full run, five affected cases after final test additions, and the final full-flow/focused-target regression passed. The resulting development suite has 17 cases. |
| Development browser flow | PASS | Actual WebGL 2 and textured GLB load, five ordered suit grants, suit interruption/reload, wrong-target gentle response, independent scan, all-help completion, archive/map durability, held Space/Enter, focused-target arrows/Action, pause/idle hints. |
| Speech browser tests | PASS, API boundary only | Mocked `speechSynthesis` receives the visible caption, H replays, errors/unavailable services have fallback. This does not verify an audible voice or child comprehension. |
| Notebook/source boundary | PASS | Modal typing does not play the game; real inbox untouched by test fixtures; failed/new drafts retained; cross-origin writes and source-reference access rejected. |
| `npm.cmd run test:production` | PASS: 4 | Actual built WebGL/KTX2 pod, keyboard-to-map/reload, no development API/notebook endpoint, source/photo exclusions, runtime allowlist and all 16 file hashes/byte sizes; model bytes are GLB, not an LFS pointer. |
| `python tools/check_foundation.py` | PASS | Guidance, links, skills/mirrors and policy-case structure, not real agent behavior. |
| `python -m unittest discover -s tests -p 'test_*.py' -q` | PASS with skips | 41 cases: 39 passed and 2 symlink cases skipped under this Windows session's privileges. |
| `python tools/check_combat_notes.py` | PASS | Registry/specification integrity only; combat is not executed. |
| `python tools/verify_family_references.py` | PASS: 18 | Existing inventory, sizes and hashes unchanged. No photo used in the pod or runtime textures. |
| `npm.cmd audit` | PASS | Zero known vulnerabilities at verification. |
| `git diff --check`; decoder Git-filter comparison | PASS | Vendored decoder bytes retain exact hashes across checkouts; LFS is configured for the GLB and game CI fetches it. |

Local screenshots are in ignored `artifacts/first-contact-{desktop,suit,scan,map,mobile}.png`. Root also visually inspected the actual suit/scan/map flow and completed the assisted route in a separate fresh browser context, with zero page errors. Pod samples were roughly 488–623 ms to load in ordinary local automation; these are SwiftShader integration samples, not a latency budget or hardware benchmark. First-load decoder transfer is additional to the approximately 464 KB model.

## GitHub execution

The workflow adds a read-only Node 24 game job alongside Python foundation checks: `npm ci`, state tests, build, Chromium with Linux dependencies, development tests and production tests. Checkout fetches LFS models. Failure screenshots/traces exclude inbox captures. Actual hosted run evidence is recorded on the feature PR; workflow configuration alone does not establish a pass. No job deploys the game.

## Remaining gates and next action

- Local software coverage implements the M1-01–05 / M1-07 scenarios; M1-03 still needs human audibility/comprehension confirmation. M1-06 remains local-route evidence only because the host website repository is unavailable.
- Run [the ten-minute adult-led playtest](../PLAYTEST_FIRST_CONTACT.md) in Chrome on the selected Lenovo. Report where help is needed, voice clarity, whether the assisted path completes, and what reload restores. Keep identifying child observations local.
- Human likeness/suit/final-pod art review: NOT REVIEWED. Actual AMD performance and Xbox plug-and-play: NOT TESTED. Touch remains deferred.
- The `new characters` note still lacks the source attachment. No missing dialogue, roles or Hush clue was invented.
- Mission 1 and the separate Cadet/Pilot flight experiment wait for the human First Contact gate. Site integration, Railway synchronization, Line Leader and Act II retain their holds.
- [The language decision](../decisions/2026-10-29-first-contact-v2.md) keeps TypeScript for gameplay and Python for support tooling; Rust/C++ would be considered only for a measured subsystem need.

This is a local/source implementation and verification task, not game deployment or final-art approval. Preserve v1 and backup saves during future changes; recover shared code with normal revert commits, not history rewrites.
