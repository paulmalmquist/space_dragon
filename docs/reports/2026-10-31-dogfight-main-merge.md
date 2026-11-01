# Dogfight pipeline and main reconciliation

## Scope

The owner requested “push and merge” on October 31, 2026. Integration combines `feat/town-drive-lab@deedd01` with `origin/main@65f908b` in the isolated `integrate/dragon-flight-pipeline` worktree. The original checkout contains concurrent, unfinished visual-foundation work and was not reset, cleaned or switched.

The merge retains completed First Contact/navigation, Town Drive and Dogfight changes, the versioned Blender-to-game dragon pipeline, main's Morrow/Heartnote/English story decisions, source-intake records, standard-controller support and 16 original audio candidates. The [identifier crosswalk](../decisions/2026-10-31-merge-idea-identifiers.md) preserves both branches' source records; SD-061 is reserved for the separate visual work.

The controller tests from main described an older three-step story and were adapted to current story/walking behavior. The dedicated controller workflow now fetches LFS assets and runs its focused browser tests; the foundation workflow owns the complete development and production suites. A missing import detected during the merge build exposed unfinished visual-controls hooks captured in `deedd01`; those hooks are excluded from this integration without changing the owner's ongoing source files.

## Evidence

Windows Lenovo host, Node 24.15.0, npm 11.12.1. Check logs are local under `C:/Projects/space_dragon/artifacts/merge-*`; browser artifacts use the isolated worktree's `artifacts/` directory. Runtime behavior and performance evidence before this reconciliation remains in the [dragon pipeline receipt](2026-10-30-dragon-asset-pipeline.md).

| Check | Result | Scope |
| --- | --- | --- |
| `npm ci` | PASS | Exact lockfile install. Existing dependency audit warnings were not repaired by an unrelated package upgrade. |
| `npm run test:unit` | PASS | 209 tests. |
| `python -m unittest discover -s tests -p 'test_*.py' -v` | PASS | 47 tests; two Windows symlink privilege skips. |
| `python tools/check_foundation.py` | PASS | Foundation structure, local links and generated skill mirrors. |
| `node tools/generate_sfx.mjs --verify` | PASS | All 16 original WAVs reproduce byte-for-byte. No listening-quality claim. |
| `node tools/verify-dragon-flight.mjs` | PASS | Versioned model, animation/socket contract and preserved geometry/material data. |
| `npm run build` | PASS | Combined TypeScript/runtime build after excluding unfinished visual hooks. |
| Focused native Chrome controller suite | PASS | Four simulated-controller cases; physical controller remains NOT TESTED. |
| Full development and production browser suites | PASS | 48 development cases in 7.7 minutes, nine production cases in 43.3 seconds. Native Chrome, isolated ports 5197/4197. All 18 reference-inventory checks also pass. |
| GitHub foundation and focused controller jobs | PASS on `c3ed1ae` | [PR #24](https://github.com/paulmalmquist/space_dragon/pull/24) records the actual runs. |
| Initial serial GitHub gameplay run `41208806473` | FAIL: 47/48 passed in 30.9 minutes | The boost fade after pause reached weight 0.282 instead of below 0.2 within a five-second wall-clock poll. Production was skipped after that failure. Original runs `41208806473` and `41208775812` remain as evidence. |
| Software-rendered focused retry with revised timing | PASS | `CI=1 SPACE_DRAGON_TEST_PORT=5198 npx playwright test tests/mechanical.spec.ts --grep 'imported boost clips' --output artifacts/merge-ci-halfscale-retry`: 30.6-second case, 49.6-second run. An earlier local attempt with the old five-second poll also failed at boost entry (0.751 versus above 0.8); its separate trace/log is retained. |

## Cloud test scheduling

The initial combined cloud run spent over 30 minutes in development gameplay before production could start. The foundation workflow now gives Earth, driving, dogfight and production separate runners with the same complete test selection and one worker each; failures do not cancel the other suites. Failure artifacts have distinct suite names. Discovery verifies 25 Earth + 8 Drive + 15 Dogfight = all 48 development cases, plus nine production cases. No case, assertion or driving-route checkpoint is removed.

The failed blend check now waits for 0.5 seconds of actual simulation advancement after resume, bounded by 30 seconds of wall time, before asserting the same weight below 0.2. Boost-entry polls use the same bounded allowance. This matches the runtime's frame-capped simulation clock without changing animation timing, gameplay or the expected blend result.

CI also uses a 0.5 device pixel ratio while retaining the 1440 × 1000 CSS viewport and input coordinates. Dogfight's renderer honors that ratio, reducing its framebuffer/postprocessing pixel count to one quarter; gameplay meshes, simulation, collision and tests are unchanged. Babylon Earth/Drive currently set their own internal scaling, so this does not claim an equivalent reduction there. Local native-device verification remains at full resolution. CI screenshots establish functionality, not hardware visual quality or performance. The final remote results and merge are recorded in PR #24.

## Boundaries

This operation publishes repository changes only. No deployment, hosting change, new external asset upload or raw Blender/reference/audio-source publication is performed. Physical PlayStation hardware, human playtesting, new Blender renders and long-duration performance remain outside this merge's verification. Existing measured screenshots/performance retain their original artifact and device scope.
