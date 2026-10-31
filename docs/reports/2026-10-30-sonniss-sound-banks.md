# Sonniss sound-bank filing and first game use — SD-056

## Scope

- Owner authorized filing five supplied banks and using suitable sounds. [Decision](../decisions/2026-10-30-sonniss-sound-banks.md).
- Base: `1495dedfa3a9ddb33f1d51b8ad6166400ba68a17`, branch `feat/town-drive-lab`, with extensive pre-existing local Town Drive and Dogfight changes. This task does not claim ownership or verification of all those changes.
- Changes: move five raw folders; add sound catalogs/guide, preparation tools, five runtime WAVs and manifest entry; extend existing Dogfight audio and focused tests; update intake/status/roadmap/pipeline records. Originals remain Git-ignored.
- Environment: Windows, Node 24.15.0, Python 3.14.4; FFmpeg version and processing filters are recorded in [cue provenance](../../assets/source/audio/sonniss-gdc-2026/game-cues.json).

## Checks

| Check or command | Result | Evidence and limitation |
| --- | --- | --- |
| Original intake / move | PASS | 359 original files, 7,824,081,034 bytes; all before/after SHA-256 hashes match. Python directory rename initially returned WinError 5; native PowerShell Move-Item then completed all five moves. No files overwritten. |
| `python tools/catalog-sound-banks.py` | PASS | 344 WAVs, 3.47136 hours, metadata and all-file hashes. Bundled workbook lists 347; exact filename comparison identifies two absent Spanish crowd/walla clips and one detective voice line. All 344 supplied WAVs are listed; none was lost during filing. |
| `git check-ignore` on filed bank readme | PASS | Raw banks fall under existing `assets/source/local/` ignore rule. |
| `python tools/prepare-sonniss-sounds.py` | PASS | Five local mono 24 kHz PCM16 cues, 232,230 total bytes, source/export hashes and exact recipe retained. |
| `node --test tests/dogfight-audio.test.mjs` | PASS | 11 tests: opt-in loading, no stale-event replay, cleanup, bounded voices, fallback and disposal during pending loads, plus existing audio behavior. |
| `npm.cmd run check` | BLOCKED at browser startup | 180 unit tests and TypeScript/production build PASS. Existing port 5175 was occupied; did not reuse or stop that server. Log: `artifacts/audio/npm-check.log`. |
| `npx.cmd playwright test --config artifacts/audio/playwright.audio.config.ts` | PARTIAL: four named cases PASS | Isolated fixture server on 5376. Two asteroid crash/reduced-motion cases and both cockpit cases passed, including real opt-in loading/decoding of all five WAVs, sampled boost event and pause/mute/retry cleanup. The remaining 38 cases were not completed: stopped this task's runner after discovering concurrent changes to shared production assets; no full-suite pass is claimed. Log: `artifacts/audio/browser-check.log`. |
| `npm.cmd run test:production` | FAIL: 6 pass / 3 fail | One new test focus error (Enter toggled focused Sound button instead of launching) was corrected by focusing the game before Enter. Town Drive timed out after 120 seconds; global manifest check found changed drive material/vegetation provenance bytes in the shared build. Neither is caused by a failed audio hash. No unrelated drive edits made. Log: `artifacts/audio/production-check.log`. |
| Focused production audio rerun | PASS | `npx.cmd playwright test --config playwright.production.config.ts tests/dogfight.production.spec.ts --grep 'launches directly'`; 1 passed in 46.4 seconds; all five same-origin audio requests returned 200 and keyboard/mouse flight/return completed. Log: `artifacts/audio/production-audio-rerun.log`. |
| Audio-only built output audit | PASS | All five files in both public and dist match manifest byte sizes/SHA-256. Raw masters absent from build. |
| PCM measurements | PASS | Five files have expected durations, finite nonzero RMS (0.06212–0.21316), absolute peaks 0.32950–0.70786; these are digital values, not speaker comfort or subjective quality. |
| `python tools/check_foundation.py` | PASS | Structure and skill mirrors only; not an agent-behavior test. |
| `python -m unittest discover -s tests -p 'test_*.py' -v` | PASS with skips | 41 tests, 39 pass / 2 Windows symlink-privilege skips. |
| `python tools/verify_family_references.py` | PASS | All 18 reference inventory/hash checks; no likeness/publication claim. |
| Human audition / speaker comfort / final mix | NOT TESTED | Filename selection and technical audio checks do not establish listening quality. |

## Review and release

IMPLEMENTED and technically VERIFIED for the named integrity/audio checks: five filed banks, searchable inventory and five selected recording layers in the existing opt-in Dogfight sound path. Catalog candidates for drive/home/suits/later scenes are deferred until their matching sound work.

Human review: NOT REVIEWED. Release/deployment: not requested, not performed. No commit or push. No hardware performance, physical controller, touch or Blender testing for this audio-only increment. Recovery: disable recording layers for synthesis fallback; preserve filed masters and provenance.

Next useful action: listen to the five cues in context with Sound on, then adjust cut lengths and relative levels; audition vehicle/ambience candidates when implementing those specific sound interactions.

Artifact identity: source/test/tool SHA-256 snapshot is retained locally at `artifacts/audio/tested-artifact.json`; runtime cue hashes are tracked in the cue provenance and manifest. Full project verification remains incomplete because of the occupied normal test port, concurrent shared-build differences and the unrelated Town Drive timeout. Human listening is the next audio-specific review.
