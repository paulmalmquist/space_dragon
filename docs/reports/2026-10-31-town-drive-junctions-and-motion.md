# Town Drive junctions and motion verification — October 31, 2026

## Scope

SD-084: [owner direction](../decisions/2026-10-31-town-drive-junctions-and-motion.md). Correct T/cross junctions with unused-road police/barricade closures, plus stable car/camera presentation.

Isolated branch `fix/town-drive-junctions`, base `3e05d8b467c74f2c3cab274f87f7944ccf210603` (merged Town Drive). The live workspace contains concurrent Dogfight/visual-foundation/Unity work, excluded from this increment. Do not infer those features' verification from this receipt.

## Checks

| Check | Result | Evidence and limitation |
| --- | --- | --- |
| Final unit tests | PASS | `npm.cmd run test:unit`: 77/77. Includes six junction tests and five presentation tests. The final sweep covers both NPC directions, all three lane indices, visible van bounds, actual collision discs, full bridge spans and all seven barrier impacts. |
| TypeScript / production build | PASS | `npm.cmd run check` completed its build stage. |
| Development browser cases | PASS across initial run and focused retry | 31 distinct cases: initial run 30/31; the sole failure was a hard-coded port in the notebook boundary test (`ECONNREFUSED :5175`) while the isolated server ran on 5196. Replaced that test URL/origin with Playwright `baseURL`; the focused retry passed. Assertions were retained. |
| Production browser cases | PASS | `npm.cmd run test:production`: 6/6, including direct Drive load and production boundaries. |
| Family reference inventory | PASS | `python tools/verify_family_references.py`: all 18 hashes, sizes and inventory entries match. No new photo publication claim. |
| Foundation checker | PASS | `python tools/check_foundation.py`. |
| Python checker tests | PASS | `python -m unittest discover -s tests -p 'test_*.py' -q`: 41 run, two platform skips. |
| Agent scene inspection | PASS for stated scope | Six overhead junction captures and a first-person Terrace approach, installed Chrome, 1440 × 900. Correct arm count, open route, readable police/closure dressing and no page errors. Final capture includes the reduced apron diameter. This is not owner road-recognition approval. |

The full wrapper initially exited with the isolated-port test failure, so it is not described as an uninterrupted green run. Final constituent checks above passed after the focused correction. The initial unit collection had 75 cases; two additional independent clearance/impact cases were added and the complete final 77-case unit suite was rerun. No gameplay source changed after the successful build/browser run. Failure output and trace were retained.

The complete route regression used steering/throttle/braking inputs, encountered traffic/signals, streamed all four legs, visited every checkpoint, finished once and retained completion after reload. The moving-car browser regression measured the cabin eye at the fixed car-local offset (-0.46, 1.42, 0.42), zero body-height bob and an attached chase camera through steering, cabin switching, pause and reset. Pure presentation cases cover 30/60/144 Hz and uneven frame cadences, angle wrapping and discontinuities. This establishes technical attachment/continuity, not a human comfort or sustained FPS verdict.

## Implemented geometry and motion

[Current map corroboration](town-drive-junction-sources-2026-10-31.md) establishes connectivity. Four junctions are T intersections and two are crossings:

| Junction | Shape | Closed game branch |
| --- | --- | --- |
| Starpass Court / Green Island Boulevard | T | None: preserve outbound, home return and the NPC through route. |
| Green Island Boulevard / Green Island Terrace | T | North Terrace. |
| Green Island Terrace / Hypoluxo Road | T | East Hypoluxo. |
| Hypoluxo Road / Jog Road | Cross | West Hypoluxo and south Jog. |
| Jog Road / Lantana Road | Cross | North Jog and east Lantana. |
| Lantana Road / Hagen Ranch Road | T | West Lantana; no invented north Hagen arm. |

The seven closures use original procedural orange/white barricades, cones, ROAD CLOSED signs and generic black/white police vehicles with steady roofbar lenses. They reuse existing traffic vehicle source meshes. Fixed collision discs align with the barriers and parked police vehicles; road/lot/prop exclusions clear the added branches. Required player and NPC lanes remain open. These are fictional game boundaries. Arterial distances remain compressed; the return connector remains authored. No Google Maps visual verification or survey accuracy is claimed.

Previously, the car advanced in visible fixed ticks while its camera independently eased in world space; collision contact also added a 2.5 cm oscillating body offset. The car, contact shadow, camera and shadow-light position now use one interpolated display pose. The visible car remains grounded. Local steering-wheel/front-wheel animation and speed-dependent camera framing ease without altering steering input, physics or saved progress. Pause rendering uses elapsed presentation time so camera recentering does not slow down with the 10 Hz paused render rate. Reset, pause/resume, inspection and discontinuities snap the display pose instead of blending across a teleport. Interpolation adds at most one 60 Hz tick of visual latency.

Changed source: `junctions.ts`, `junction-world.ts`, `presentation.ts`, and the existing Drive main, world, neighborhood, development, car and camera modules. Regression coverage lives in `drive-junctions.test.ts`, `drive-presentation.test.ts` and `drive.spec.ts`. Playwright gains an explicit installed-Chrome option for local verification; CI keeps its SwiftShader configuration. No dependency, family-reference inventory or campaign-save format changes.

## Local evidence

Ignored evidence in the isolated worktree:

- `artifacts/junction-check.log`: initial complete wrapper output, including the port failure.
- `artifacts/junction-final-units.log`, `artifacts/junction-port-retest.log`, `artifacts/junction-production.log`: final constituent passes.
- `artifacts/junction-first-run-failure/`: retained failing notebook-boundary trace/context.
- `artifacts/junction-review/review.json`: scene metrics and zero page errors.
- `artifacts/junction-review/*-overhead.jpg`: all six junctions.
- `artifacts/junction-review/terrace-approach.jpg`: cabin view of readable police and barricades.
- `artifacts/review-junctions.mjs`: repeatable capture helper; local dev server port 5187.

Local check uses `SPACE_DRAGON_NATIVE_CHROME=1`, `SPACE_DRAGON_TEST_PORT=5196`, `SPACE_DRAGON_PREVIEW_PORT=4196`, with `CI` unset, followed by `npm.cmd run check`. Focused retry: `npx.cmd --no-install playwright test tests/first-contact.spec.ts -g 'local capture rejects'`. Browser tests use the isolated fixture inbox. This is an actual installed-browser flow, not an endurance or frame-rate acceptance result.

## Review and release

Human junction-recognition and driving-comfort review remain NOT REVIEWED. Physical controller and sustained device performance remain NOT TESTED for this increment. Standing push/merge authorization applies; no production deployment is requested.

## Verified source and handoff

The final task-owned Drive source/tests were mirrored to the live workspace after checking each destination against its unchanged Git HEAD (or identical task output). Concurrent SD-061/062 files and edits remain intact. The live workspace then passed TypeScript and foundation checks. The broader live-workspace wrapper was not rerun for unrelated concurrent work.

Source fingerprint: SHA-256 `691f8583c6bd5d66c65db2dfe15c162e81534f47bf42f818ce05bb73e6662baf`, computed by concatenating each sorted relative path, LF, and LF-normalized bytes for these 12 files: `src/game/drive/camera.ts`, `src/game/drive/car.ts`, `src/game/drive/development.ts`, `src/game/drive/junction-world.ts`, `src/game/drive/junctions.ts`, `src/game/drive/main.ts`, `src/game/drive/neighborhood-world.ts`, `src/game/drive/presentation.ts`, `src/game/drive/world.ts`, `tests/drive-junctions.test.ts`, `tests/drive-presentation.test.ts`, `tests/drive.spec.ts`.

Push/merge uses the isolated `fix/town-drive-junctions` branch targeting `feat/first-contact-playable`; the base was re-fetched and remained `3e05d8b467c74f2c3cab274f87f7944ccf210603` before commit. No force push, visibility change or production deployment. Hosted CI is separate from the local evidence above.
