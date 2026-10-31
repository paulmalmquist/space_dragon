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
| Full development and production browser suites | RUNNING at this commit | Native Chrome, isolated ports 5197/4197; final results belong to the integration PR description and checks. |
| GitHub checks and merge | NOT YET RUN at this commit | The integration PR records the eventual remote check and merge result. No remote success is inferred from local checks. |

## Boundaries

This operation publishes repository changes only. No deployment, hosting change, new external asset upload or raw Blender/reference/audio-source publication is performed. Physical PlayStation hardware, human playtesting, new Blender renders and long-duration performance remain outside this merge's verification. Existing measured screenshots/performance retain their original artifact and device scope.
