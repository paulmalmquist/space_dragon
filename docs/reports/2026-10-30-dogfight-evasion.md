# Dogfight evasion verification — October 30, 2026

## Scope

- **SD-043**: closer chase camera, enemy targeting warnings, finite roll energy, hard break turns, motion-dependent enemy prediction and increased incoming fire. [Decision](../decisions/2026-10-30-dogfight-evasion.md); original wording in [the inbox](../../ideas/INBOX.md).
- Base: `3b615b2dc1dcf0237d3409a7da3e238e0033602d`, branch `feat/first-contact-playable`. This increment extends the existing uncommitted Dogfight Lab changes; no commit, push or deployment is included.
- Changed runtime: flight/config, enemy targeting and combat, input integration, HUD/HTML/CSS and synthesized warning audio, with extended pure logic and browser coverage. The raw Seele export, original GLBs, Earth story/save module and family references are outside the increment.
- Environment: Windows Lenovo development laptop; Node 24.15.0, Three.js 0.180.0, TypeScript 7.0.2, Vite 8.3.5 and Playwright 1.64.1. Installed Chrome 156.0.8078.76 was exercised headless at the full 1366 × 768 viewport; this is browser interaction evidence, not a human/sustained performance pass.

## Checks

| Check or exact command | Result | Evidence and limitation |
| --- | --- | --- |
| `node --check src/prototypes/dogfight/ui/hud.js` | PASS | Syntax check after warning/evasion UI edits. No gameplay claim. |
| `node --check src/prototypes/dogfight/assets/audio.js` | PASS | Syntax check after opt-in warning cues. Audibility NOT TESTED. |
| `npm.cmd run test:unit` | PASS | Final run: 95 tests, zero failures/skips. Includes resource/motion/targeting, moving-target prefire warning and B-reservation checks plus retained story/save, word-lock, wing and material/effect cases. `artifacts/dogfight-evasion-unit-final.log`; earlier 94-case run retained separately. |
| `npm.cmd run build` | PASS | TypeScript and production Vite build. Expected bundle-size advisory remains; no compile error. `artifacts/dogfight-evasion-build-final.log`. |
| `npx.cmd playwright test tests/dogfight.spec.ts tests/word-lock.spec.ts` | PASS | Nine development cases (6.6 minutes): targeting/finite rolls/physical break, aim/flight/rolls, mouse/fire/zoom and interruption cleanup, Earth-save return, deliberate missing-model recovery, word-to-lock-to-impact, live spelling/damage/control continuity, mode-switch cleanup and pause/reload/retry/assistance. `artifacts/dogfight-evasion-browser.log`. Software-rendered browser coverage is not a sustained device performance measurement. |
| `npx.cmd playwright test --config playwright.production.config.ts tests/dogfight.production.spec.ts` | PASS | Three production cases: shipped controls/evasion/warnings/pause/retry, raw-source/QA packaging boundary and live word-lock-breath/return flow. Individual durations 42.3 s, 0.817 s and 34.5 s. `artifacts/dogfight-evasion-production.log`. |
| `python tools/check_foundation.py` | PASS | Canonical links, structure and skill mirrors after routing/contracts. Does not test gameplay. |
| `python -m unittest discover -s tests -p 'test_*.py' -v` | PASS | 41 tests run; two host-symlink checks skipped because Windows privilege is unavailable. Does not verify game behavior. |
| `python tools/verify_family_references.py` | PASS | All 18 references accounted for; no new likeness or publication approval. |
| Original Seele delivery inventory comparison | PASS | All 29 original files remain byte-identical to the retained pre-edit inventory. Runtime editing did not overwrite the source delivery. |
| `node artifacts/dogfight-evasion-chrome.mjs` | PASS on frozen-source rerun | Installed Chrome 156.0.8078.76 at 1366 × 768. Observed target lock; Q roll spends exactly 40 and clears enemy lock, held repeat does not retrigger; two rolls leave 20 and reject a third. Hard break is accepted, physically changes heading, and pause/reset/zoom are exercised. Continued hostile fire causes ordinary damage while spelling. Zero page/console errors and external HTTP requests. `artifacts/dogfight-evasion-chrome-recheck.log` and `dogfight-evasion-chrome.json`. |
| Native Chrome screenshot inspection | PASS for local framing/UI scope | `dogfight-evasion-camera.png`, `-warning.png`, `-incoming.png`, `-break.png`, `-depleted.png`, `-zoom.png` under ignored `artifacts/`. Normal-flight silhouette remains visible with the closer camera; threat text and energy meter are readable. This does not approve final art or human control feel. |
| Sustained device performance, human difficulty/feel, family usability, audible output | NOT TESTED | Automated checks cannot approve these. |

## Review and release

**IMPLEMENTED and technically VERIFIED:** Q/E rolls and B + steer for a braking hard turn share a rechargeable evasion pool distinct from boost and wing health. Enemy warnings distinguish hostile tracking from the player's own breath lock. Active spelling/dodging continues; maneuvers create no immunity and do not delete airborne shots. Logic/build, nine affected development and three production cases, plus the native Chrome flow pass. These checks establish the bounded implementation behavior, not human difficulty/control approval.

The first native Chrome run failed because an ongoing source/UI write caused a Vite full reload during the snapshot check (`window.__SPACE_DRAGON_DOGFIGHT__` became unavailable). The Vite server log records the overlapping `hud.js` reload at 3:49:44; the original failed log is retained at `artifacts/dogfight-evasion-chrome.log`. Sources were frozen, then the complete flow passed; the failure was not replaced by a screenshot-only claim. The break resource sampled across frames reports a net decrease of about 24.10 because recharge elapsed between observations; exact 25-point acceptance is checked in authoritative logic/browser results rather than inferred from that wall-time sample.

## Tested build artifact

| Path | Bytes | SHA-256 |
| --- | ---: | --- |
| `dist/dogfight/index.html` | 6,840 | `469b58511b71ec5e95852d550334b747b5b096b2083879c44a18621383adf1f1` |
| `dist/assets/dogfight-8aLuhg-g.js` | 664,932 | `7dadb0d6aca78dd53d8ecb72bb157fb4ca4d563c46abc2c69b7c6f73eb89711f` |
| `dist/assets/dogfight-BTEnFftQ.css` | 19,035 | `7e425fe9556a8451f3bc31a772395ea8d36d7ebb9160abded916a346813162e8` |

These hashes identify the local production build, not a deployed release. The original GLBs remain unchanged.

The intentional missing-model test logs its intercepted asset/load error while verifying the usable reload/return recovery. This expected error is distinct from the normal native Chrome flow, which reported no page/console errors. The main Earth browser suite was not repeated for this bounded lab change; its state/save logic remains covered by the unit run and lab return tests.

Human review: **NOT REVIEWED**. Publication/deployment approval: **NOT GRANTED**. No paid tooling, external media generation, new likeness assets, remote service or backend is introduced. Recovery remains normal pause/retry/return; retry resets only the lab. A human Lenovo/Chrome playtest is the next check for warning clarity, challenge and the closer view. Audible output and sustained device performance remain **NOT TESTED**. Changes remain local and uncommitted on `feat/first-contact-playable`; no push, merge, remote CI verification or deployment was performed for this increment.
