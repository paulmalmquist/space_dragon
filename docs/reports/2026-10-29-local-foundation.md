# Local foundation and merge verification

Date: October 29, 2026.

## Scope

- Owner authorization: create useful local tooling and unordered idea intake; subsequent request: “push and merge changes please.” This authorizes repository publication/merge, not game deployment.
- Local implementation commit: `5308596`; concurrent remote main reconciled: `0474b97`. The tested tree includes the resolved merge plus a deliberate-confirmation guard for resetting a progressed checkpoint.
- Built `dist/index.html` SHA-256: `266d362871e97e27685c80bc5670fb1a00897ca15f12e6e58d8e5d295bb0ea01`.
- Changed areas: idea workflow/project memory, agent guidance, asset/setup helpers, exact npm toolchain, standalone Babylon prototype, local checkpoint/notebook, and browser checks. Reconciled architecture/milestone descriptions with the implemented scope.
- Environment: Windows, Lenovo 82XM, integrated AMD Radeon, Node 24.15.0, npm 11.12.1, Python 3.14.4, Playwright 1.64.1 / Chromium 156 with SwiftShader. Software rendering is not a hardware-performance benchmark.

## Checks

| Exact command or procedure | Result | Evidence and limitation |
| --- | --- | --- |
| `python tools/check_foundation.py` | PASS | Shared guidance, local links, canonical/mirrored skills and case structure. Does not execute agent-policy cases. |
| `python -m unittest discover -s tests -p 'test_*.py' -v` | PASS with skips | 41 cases: 39 passed, 2 symlink cases skipped because the Windows session lacks symlink privileges. |
| `python tools/check_combat_notes.py` | PASS | Combat notebook/test-spec registry integrity only; no combat gameplay executed. |
| `npm.cmd run check` | PASS | TypeScript/build, all 9 browser tests, and all 18 photo inventory/checksum checks. |
| Browser checkpoint checks | PASS | Real WebGL 2 frames; keyboard/pointer progress; reload/reset; cancelling reset preserves progress; invalid/unsupported saves and unavailable storage. No migration or backup-save implementation claimed. |
| Browser notebook checks | PASS | Appends to isolated fixture inbox, preserves failed/new drafts, rejects cross-site requests, denies direct reference serving. The owner's real inbox is not test output. |
| Narrow touch viewport | PASS, supplemental | Layout/tap flow at 390 pixels. Touch remains deferred; no phone/tablet GPU or support claim. |
| `node artifacts/verify-built-app.mjs` against local built preview | PASS | Generated local verification helper: checkpoint reload, development API/button excluded, notebook endpoint 404, no page errors, 43 artifact entries with no source/reference media. Helper/results remain ignored local evidence. |
| `npm.cmd audit` | PASS | Zero known dependency vulnerabilities at verification. |
| `git diff --check origin/main` | PASS | Only this change's diff checked; inherited Markdown hard breaks are preserved. |
| Compare remote story/gameplay/skills/photos | PASS | No differences from remote main in `.agents/`, `.claude/`, story, gameplay, combat, `new characters`, or the family-photo collection. |

Desktop/narrow screenshots and rendering state are in ignored `artifacts/`. Earlier setup checks verified real FFmpeg frame extraction and a PNG → ETC1S KTX2 → Khronos validation flow; see [toolchain](../TOOLCHAIN.md) and [project status](../project/STATUS.md).

## Review and release

- IMPLEMENTED / locally VERIFIED: simple guided First Contact prototype, versioned local checkpoints, development notebook, agent idea routing, and local tool/asset scaffold.
- Remote reconciliation preserves confirmed keyboard-first input, alley-oop and single-pilot dragon direction; later narrative/scripts/characters remain at their recorded proposal/owner-idea authority.
- Human child-suitability, likeness, sound and feel review: NOT REVIEWED. Full spoken-help/suit-introduction acceptance, real target devices, physical Xbox input, live Blender exports, final GLB assets and host-site integration: NOT TESTED or not implemented as documented in the milestone.
- No final art, Railway service, game deployment, or performance acceptance is claimed. The build's roughly 1.07 MB main chunk emits a size warning; asset/performance work remains.
- Publication evidence belongs to the PR's head SHA, changed-file list, CI results and merge record. The only configured GitHub workflow is read-only foundation CI; local runtime checks are separate evidence.
- Recovery: use normal revert commits if needed; do not rewrite shared history. No deployment rollback is required by this repository-only publication.
