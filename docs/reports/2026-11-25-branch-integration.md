# Branch integration verification — November 25, 2026

- Base: `fca9ae0` on `origin/main`. Original branch tips retained in merge history: First Contact and Town Drive `e4c7c3f` (PR #13), First Contact gamepad `83cf9f0` (PR #22), VR readiness `18e0aa2` (PR #28), First Contact and music `b4e76bf` (PR #15).
- PR #13's playable Town Drive work already reached main in PR #30. Comparing its changed paths with the integration at `70e424d` found matching gameplay and scene source, with later configuration, tracking and metadata revisions. The module README covered only the foundation and now links to the playable scene workflow. PR #22's branch tree is identical to squash commit `96002d7`.
- PR #28 adds the Unity readiness standard under SD-096. PR #15 contributes the historical story/verification records, the music plan and the confirmed instrument-to-synth direction under SD-097–100. The retained First Contact state machine imports the draft v2 save shape using its existing transitions. It derives only earned progress, preserves assistance and backs up the original save on the first write.

| Check | Result | Evidence |
| --- | --- | --- |
| `git diff --cached --check`, `python tools/check_foundation.py` | PASS | Whitespace, relative links, foundation structure and skill mirrors. |
| `python -m unittest discover -s tests -p 'test_*.py' -v` | PASS | 51 discovered, 49 passed, two skipped. |
| `python tools/verify_family_references.py` | PASS | 18 inventory and hash matches. |
| `npm.cmd run test:unit`, `npm.cmd run build` | PASS | 334 tests, TypeScript and Vite build on Node 24.15.0. Before the migration, the new regression test reproduced the reset of a draft backyard save. |
| `npm.cmd test -- tests/first-contact.spec.ts -g 'resumes a draft First Contact' --output artifacts/branch-checkpoint` | PASS | Windows, Playwright Chromium 1.64.1 with SwiftShader, isolated port 5194. Seeded a two-suit draft, observed Luke's card, confirmed load left the source bytes alone, continued by keyboard, observed the byte-identical backup, and reloaded to Luna's card with three earned suits. |

Unity Editor, headset, Blender, physical controllers and human review were not exercised in this integration. The music work is planning. Existing Unity verification receipts apply to their named artifacts.
