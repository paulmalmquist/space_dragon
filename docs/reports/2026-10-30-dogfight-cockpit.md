# Dogfight cockpit and acceleration verification — October 30, 2026

## Scope

- **SD-044:** compact relative bogey radar, cockpit-style flight instruments and stronger layered sound. [Owner direction and scope](../decisions/2026-10-30-dogfight-cockpit.md).
- **SD-045:** the owner's [acceleration clarification](../decisions/2026-10-30-acceleration-camera-sound.md) replaces stretching stars with bounded camera perspective and acceleration-responsive sound. Earlier checks below identify the pre-SD-045 cockpit baseline; the final combined checks and artifact identity follow that history.
- Base: `3b615b2dc1dcf0237d3409a7da3e238e0033602d`, branch `feat/first-contact-playable`, extending the existing uncommitted local Dogfight Lab. No commit/push/deployment is included.
- Changed paths: lab HTML/CSS/HUD, radar projection module, local audio, presentation integration and relevant tests/docs. Original GLBs/raw Seele delivery, family reference assets and Earth/save state are outside this increment.
- Environment: existing Windows Lenovo development laptop, Node 24 and repository-local tooling. Installed Chrome 156.0.8078.76 was run headless at 1366 × 768, with layout inspection at 1440 × 1000 and 900 × 700. The final production artifact is identified in the final-check section below; no sustained performance or human audio/visual approval follows from these checks.

**Final outcome — IMPLEMENTED and technically VERIFIED:** 120 unit tests, build, eleven development and three production browser cases, installed Chrome functional/layout checks and fourteen offline audio profiles pass. The initial software-rendering timeouts, interrupted intermediate run and camera-framing correction are retained below. Human appearance/audio quality, actual speaker audibility, comfort and sustained device performance remain NOT TESTED.

## Recorded cockpit baseline checks — before SD-045

| Check or exact command | Result | Evidence and limitation |
| --- | --- | --- |
| `npm.cmd run test:unit` | PASS | 108 unit tests, including radar projection and bounded audio behavior. `artifacts/cockpit-unit.log`. State/save tests remain included; these logic checks do not establish human usability. |
| `npm.cmd run build` | PASS | TypeScript check and Vite production build, exit 0. `artifacts/cockpit-build.log`. The existing large-chunk advisory remains; compilation is not a performance measurement. |
| `npx.cmd playwright test tests/cockpit.spec.ts tests/dogfight.spec.ts tests/word-lock.spec.ts` | FAIL in initial run | Five cases pass and five fail in 6.3 minutes under SwiftShader. Failures affect evasion completion, WADZ firing, mouse turning and two word-lock/live-spelling flows. Selected timeout observations: a roll has not completed within 20 wall seconds; firing reaches one shot rather than more than one in five seconds; a turn reaches forward.x ≈ .0833 rather than greater than .1 in five seconds. `artifacts/cockpit-browser.log` and retained failure contexts. The corrected final development run below passes; the original failures are retained rather than counted as passes from the native check. |
| `npx.cmd playwright test --config playwright.production.config.ts tests/dogfight.production.spec.ts` | NOT TESTED at this baseline | Not run against the pre-SD-045 cockpit artifact. Final production checks are recorded below. |
| `node artifacts/cockpit-polish-chrome.mjs` | PASS | Installed Chrome 156.0.8078.76 headless at 1366 × 768. Actual steering changes radar coordinates; breath lock and disabling a ship update/remove its contact. Sound is explicitly enabled; firing, roll, breath, impacts and disable counters are observed. Pause clears active voices; mute/retry/return are exercised. Zero normal-flow page/console errors and external HTTP requests. Original baseline output is retained in `artifacts/cockpit-polish-chrome.log`; the script/JSON and screenshot filenames are reused by later passes. |
| Cockpit layout inspection | PASS for the named desktop scope | `artifacts/cockpit-final-ready.png`, `-flight.png`, `-breath.png`, `-1440.png` and `-900.png`. Inspected the canopy trim, unobstructed chase view, compact radar/gauges, word prompt and retained settings at 1366 × 768, 1440 × 1000 and 900 × 700. Narrow mobile/touch support is NOT TESTED. |
| `node artifacts/cockpit-audio-render.mjs` | PASS for output/cleanup bounds | Real Chrome `OfflineAudioContext` renders 13 profiles: fire, breath, hit, hurt, disable, roll, break, boost, incoming warning, victory, stress, muted and paused. All samples are finite; every peak is below .99. The stress mix peaks at .49109465 with RMS .04628917. Muted and paused profiles are exactly zero. Voice scheduling caps active voices at 24, with up to six release tails; cleanup is checked. Original baseline output is retained in `artifacts/cockpit-audio-render.log`; metrics/WAV filenames are reused by later passes. These are waveform/graph results, not an audibility or comfort review. |
| `python tools/check_foundation.py` | PASS | Canonical links, foundation structure and skill mirrors. Does not test gameplay or actual agent behavior. |
| `python -m unittest discover -s tests -p 'test_*.py' -v` | PASS | 41 tests run; two symlink tests skipped because Windows host privileges are unavailable. |
| `python tools/verify_family_references.py` | PASS | All 18 references match the retained manifest. No new likeness or publication approval. |
| Original Seele inventory SHA-256 comparison | PASS | Python compared file count, byte sizes and SHA-256 values against `artifacts/seele-original-inventory.json`; all 29 original files remain byte-identical. |
| Human visual/audio quality, speaker audibility, family usability and sustained performance | NOT TESTED | Not established by automated/browser output checks. |

## Recorded cockpit baseline artifact — before SD-045

| Path | Bytes | SHA-256 |
| --- | ---: | --- |
| `dist/dogfight/index.html` | 8,742 | `c565b213eaef28da0134c88b4315b3d08cc1e29da77355f7964a3e1bc0b2ad58` |
| `dist/assets/dogfight-PzSo1rGa.js` | 675,465 | `a7fe3372f4b18d3bdf740d07bb3eb56a87dceeaa0027ef94d4a6cc0ac7247283` |
| `dist/assets/dogfight-DVnK9uqD.css` | 24,734 | `19e836274f2c4c44b231b600707b167e295523f41e585b8da8d7e233e5488764` |

These hashes identify the pre-SD-045 local cockpit build, not a deployment or the final acceleration artifact. Runtime source was frozen for the corresponding browser/output checks. The final combined artifact identity appears below.

## Intermediate SD-045 checks — retained correction history

After adding acceleration lens/sound feedback, `npm.cmd run test:unit` passed 116 cases and `npm.cmd run build` passed (`artifacts/cockpit-final-unit.log` and `cockpit-final-build.log`). Installed Chrome functional checks passed with no page/console errors or external HTTP requests: ordinary acceleration reached 88 m/s with FOV about 65.971 and an acceleration audio event; boost reached 148 m/s with FOV about 73.888 (`cockpit-final-chrome.log`). Fourteen offline audio profiles, now including acceleration, passed; stress peak was about .49109453, RMS .04628917, and muted/paused profiles were exactly zero (`cockpit-final-audio-render.log`). These are intermediate results, not the final artifact.

The boost screenshot then exposed a framing defect: world-space follow smoothing increased the camera's distance at higher speed, making the dragon smaller than the intended close chase view. The relative-follow correction and its evidence appear below. The intermediate development browser run was deliberately stopped with Ctrl+C/exit 1 after its first cockpit case passed in 21.6 seconds; the acceleration case was underway. `artifacts/cockpit-final-browser.log` retains that partial run. It is not a complete passing or failing aggregate and does not resolve the earlier baseline failures.

The full-screen canopy drop shadow is removed to avoid unnecessary rendering work. Software-rendered browser waits are increased while retaining the same predicates and numeric assertion thresholds; this does not establish hardware performance.

## Final SD-044/SD-045 checks

| Check or exact command | Result | Evidence and limitation |
| --- | --- | --- |
| `npm.cmd run test:unit` | PASS | 120 tests. `artifacts/cockpit-camera-final-unit.log`. Camera coverage includes stable relative follow distance, roll-offset anchoring and acceleration/aim/reduced-motion behavior. |
| `npm.cmd run build` | PASS | TypeScript/Vite build, exit 0; `artifacts/cockpit-camera-final-build.log`. Existing large-chunk advisory remains. |
| `node artifacts/cockpit-polish-chrome.mjs` | PASS for the named functional/layout scope | `artifacts/cockpit-camera-final-chrome.log`; latest `cockpit-polish-chrome.json` and `cockpit-final-*.png`. Radar/turn/lock/disable, opt-in layered sound and cleanup, pause/mute/retry/return pass with zero page/console errors and external HTTP requests. Ordinary acceleration reaches 88 m/s with FOV ≈ 65.975 and an acceleration audio event; boost reaches 148 m/s with FOV ≈ 73.874. Relative-follow correction keeps the intended close framing instead of adding speed-dependent world-space lag. Normal and boost renders are inspected; no human feel/performance approval follows. |
| `node artifacts/cockpit-audio-render.mjs` | PASS for output/cleanup bounds | Fourteen profiles, including acceleration, with finite samples, all peaks below .99, and exact zero for muted/paused output. Stress peak .49109453 and RMS .04628917. `artifacts/cockpit-final-audio-render.log` and latest `cockpit-audio-metrics.json`. Audio source is unchanged after this render; human audibility, quality and comfort remain NOT TESTED. |
| `npx.cmd playwright test tests/cockpit.spec.ts tests/dogfight.spec.ts tests/word-lock.spec.ts` | PASS | Eleven frozen-source cases pass in 7.1 minutes, exit 0. `artifacts/cockpit-camera-final-browser.log`. Actual radar/audio/acceleration behavior and retained steering, roll/break, word-lock, pause/focus/retry/return and save boundaries are exercised. Same numeric predicates/assertion thresholds retained; software-rendering waits are longer. The deliberate missing-model recovery case logs its expected intercepted load error. |
| `npx.cmd playwright test --config playwright.production.config.ts tests/dogfight.production.spec.ts` | PASS | All three final production cases pass in 1.3 minutes, exit 0. `artifacts/cockpit-camera-final-production.log`. Direct launch, local assets, cockpit/radar controls, roll/break behavior, no mutable development hooks or raw source/reference packaging, return to Earth and one targeted word-to-breath impact are checked against the final artifact. |
| `python tools/check_foundation.py`; `git diff --check` | PASS | Final document/link/skill check after the controls, integration, receipt and summary updates; no whitespace errors. Existing CRLF normalization warnings are not test failures. The earlier 41 Python checks (two Windows skips), 18-photo verification and 29-file raw-source comparison remain applicable; their inputs are unchanged. |

The relative camera offset now follows the dragon without the previous speed-dependent world-space lag. Baseline follow distance is 11.5 meters and the bounded speed offset reaches 13.5 meters; the speed lens response is capped at 74 degrees. These are local presentation choices. Right-button aiming zoom, reduced motion and flight authority remain distinct.

| Tested final artifact path | Bytes | SHA-256 |
| --- | ---: | --- |
| `dist/dogfight/index.html` | 8,742 | `b561afa7ade5b473211861cbe48e8d971180dfab79ceac0c1770bd55caada328` |
| `dist/assets/dogfight-KUaMid7G.js` | 676,207 | `9fe1732eb67cdc097767ae62ba61041a6ae60f5746baf02063732650104e900b` |
| `dist/assets/dogfight-D2ok6vNP.css` | 24,698 | `896dd0b76ccb3b2dee4ad01dfbc2f59b58f285cb0a6fe65dd4e12749cddf6b1d` |

These identify the frozen final local artifact, not a deployed build. All eleven development and three production cases pass; neither software-rendered automation nor the installed headless Chrome check establishes sustained hardware performance or human approval.

## Implementation and review

**IMPLEMENTED and technically VERIFIED:** the head-up radar uses an 800-meter scope, forward at the top, relative lateral positions and above/below signs. Contacts outside the range stay on the rim with bearing arrows. Exact relative altitude/range remains in contact titles, accessible descriptions and diagnostic state rather than crowding the small display. Dead contacts disappear; the player's breath lock and hostile targeting/fire states remain distinct. Radar derives presentation from encounter state and does not change combat or saves.

**SD-045 IMPLEMENTED and technically VERIFIED:** speed-star stretching is removed; acceleration feedback uses bounded/eased camera perspective plus actual-acceleration engine/airflow response. Held right-button aiming zoom and reduced-motion values remain. The recorded cockpit baseline is retained as history; the final combined checks verify this additional change against the identified artifact.

The existing third-person chase view now sits inside subtle canopy trim and a smoked instrument deck, with compact telemetry and angular controls. Flight/combat sounds use layered local synthesis with opt-in sound, a controlled mix and bounded scheduling. No external sound assets, family voices, new cockpit model or paid service is introduced.

Preserved scope: third-person flight, controls, live spelling/dodging, energy/lock rules, pause/retry/return and campaign saves. The full Earth browser suite was not repeated for this isolated lab change; state/save logic and the lab's Earth-return/save boundary remain covered by the recorded checks.

Human visual/audio quality, actual speaker audibility, comfort and sustained device performance remain **NOT TESTED**. Human review: **NOT REVIEWED**. Publication/deployment approval: **NOT GRANTED**. A human Lenovo/Chrome playtest with sound is the next review for radar clarity, cockpit readability and the stronger mix. Normal sound-off, pause/retry and return remain available. Changes are local and uncommitted on `feat/first-contact-playable`; no push, merge, remote CI verification or deployment occurred for this increment.
