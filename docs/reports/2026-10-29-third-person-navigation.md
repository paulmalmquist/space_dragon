# Third-person navigation verification

Date: October 29, 2026. Owner authorization: “begin with coding the the next step to 3d navigation,” plus recording future house/yard/garage video reference. Scope is SD-020–021 and [the navigation decision](../decisions/2026-10-29-third-person-navigation.md).

## Tested scope and identity

- Base: `741d55d`, existing draft branch `feat/first-contact-playable`. This increment adds exploration alongside First Contact; it does not replace the story or change its save format.
- Local `dist/index.html`: **5,408 bytes**, SHA-256 `50f6ced4c01f324af3a52815f7662c25ee2a873de403768b5bbe3f40e019075d`.
- Main built module `dist/assets/index-CPpyY3xT.js`: **575,035 bytes**, SHA-256 `78b9b488c086335b31e5b020f2c5f3c876fdadcfb090e3bd39d1ada939197bdf`.
- Environment: Windows Lenovo 82XM, Node 24.15.0, Babylon 9.33.0, Playwright 1.64.1 / Chromium with SwiftShader. Separate smoke used installed Chrome **156.0.8078.48** in a fresh temporary headless profile.

## Actual checks

| Command or procedure | Result | Evidence / limitation |
| --- | --- | --- |
| `npm.cmd run check` | PASS, exit 0 | Full sequential run: 36 unit tests; strict TypeScript/build; 21 development browser tests; 5 production browser tests; all 18 photo checks. |
| Pure navigation/save tests | PASS: 19 new, 36 total | Diagonal normalization, camera-relative movement, bounded frame time, wall/door/furniture/fence collision and sliding, camera occlusion, proximity denial, once-only collection, reload, separate keys, unsafe-pose recovery, backup/future/corrupt/blocked/quota handling. |
| Real keyboard navigation browser tests | PASS: 4 new | Welcome Enter defaults to walking. A solid wall blocks movement; the real doorway passes. Camera follows/orbits. Walk to computer, pod and module without teleporting. Repeated pickup cannot duplicate inventory; exact position/inventory restore after reload; First Contact save bytes remain unchanged. |
| Pause/modal/focus regression | PASS | Pause, blur and notebook entry clear held movement. Typing does not move the person. F1 in exploration gives navigation help and preserves the story checkpoint. Resume does not walk until a fresh key press. |
| Existing First Contact browser suite | PASS: 17 | State progression, five suits, assisted scan, speech API boundary/fallback, v1/v2 recovery, storage failures, notebook isolation and source-reference protection still pass. |
| Built exploration browser test | PASS: 1 new, 5 production total | Actual keyboard movement into reach and once-only pickup/reload without a developer observation API. Existing production GLB/KTX2, notebook exclusion and hash/allowlist tests also pass. |
| Installed Chrome keyboard smoke | PASS | Actual room → computer → doorway → pod → module route, then reload. No page errors; one module and exact pose restored. `artifacts/navigation-installed-chrome.json` retains synthetic state evidence. |
| Visual inspection | PASS, bounded | Room, doorway and pickup screenshots show the articulated person, follow camera, open passage, pod action and 1/1 inventory. This is technical presentation review, not final art or child usability approval. |
| `python tools/check_foundation.py` | PASS | Guidance/skill/link structure. Agent behavior itself is not executed. |
| Foundation Python unit suite | PASS with skips | 41 cases, 2 Windows symlink cases skipped under host privileges. |
| `git diff --check` | PASS | Intended source/docs only; no changes to family photos, proposed story scripts or existing asset payloads. |

The complete development suite passed in **3.9 minutes** locally; production checks passed in **23.7 seconds**. These are test-run durations, not graphics benchmarks. Hosted CI uses the same commands and updated Playwright test lists; [draft PR #13](https://github.com/paulmalmquist/space_dragon/pull/13) records the published head and actual hosted results.

Hosted runs [40979156870](https://github.com/paulmalmquist/space_dragon/actions/runs/40979156870) and [40979161747](https://github.com/paulmalmquist/space_dragon/actions/runs/40979161747) on navigation commit `b464f05` exposed time limits in the long keyboard route. In the first trace the player was still moving at x=1.512 toward the 1.66 threshold when the ten-second axis budget expired; mean software-rendered frame time was 222.87 ms. The second run completed collection/reload before its 45-second total test budget expired. This is evidence of test timing on SwiftShader, not a hardware-performance pass. The follow-up keeps the real-keyboard route and every behavior assertion, allows 20 seconds per axis and 90 seconds for that long case, and reports actual coordinates on failure. Its affected local rerun passed in 26.7 seconds, with typecheck and diff checks passing. Hosted confirmation is recorded by the subsequent PR checks.

**Hosted confirmation: PASS on `3fb24a1`.** Both [PR run 40980602065](https://github.com/paulmalmquist/space_dragon/actions/runs/40980602065) and [push run 40980595929](https://github.com/paulmalmquist/space_dragon/actions/runs/40980595929) passed game and foundation jobs. The PR log records all 21 development tests passing in 3.3 minutes and all 5 production tests in 18.7 seconds, plus the unit/build checks. Supplemental installed-Chrome mouse-drag/recenter/reduced-motion smoke passed without page errors and reported ANGLE/AMD Radeon/D3D11; `artifacts/navigation-camera-smoke.json` contains that bounded evidence. No human comfort or sustained GPU-performance pass is inferred. Later neighborhood/reference documentation does not change this runtime artifact.

## Behavior and artifacts

**Walk around** is the primary entry. WASD/arrows move; left-drag or Q/E orbits; R recenters; Space/Enter interacts nearby; Escape pauses. The original humanoid has articulated legs/arms and a walking cycle. It is not an approved family likeness or final suit. The room uses cutaway walls to keep the player visible while collision boundaries remain solid.

The computer replays signal feedback, the pod opens, and a clearly provisional practice module disappears once collected. Pure rules grant it before presentation feedback. Exploration position/facing/inventory are saved independently; resetting the walk preserves story progress. This test module is not one of the canonical recovered dragon components.

Local evidence: `artifacts/navigation/room-reviewed.png`, `artifacts/navigation-doorway.png`, `artifacts/navigation-pickup.png`, `artifacts/navigation-browser-state.json`, `artifacts/navigation-installed-chrome.png`, and `artifacts/navigation-check-summary.md`. These are ignored, synthetic/local review artifacts.

## Limits and next action

- Walkable scope is the living room and fenced backyard. Garage geometry is a background placeholder; its interior is not explorable. No jumping, stairs, slopes, full town, companions or multiplayer are supplied.
- The current environment is generic. No house video has arrived or been used. [The reference idea and capture guide](../REFERENCE_HOME_VIDEO.md) are recorded; source footage belongs in ignored local references, not game/public assets.
- Human control feel, physical audibility, the ten-minute family playtest, final character/environment art and actual AMD performance acceptance remain pending. Automated/headless/software checks do not establish those.
- The existing First Contact story is still selectable. Mission 1, flight, site integration, Railway, Line Leader and later acts retain their current holds.
- The game is not deployed by this work. Source recovery uses ordinary revert commits. Exploration backup/future-save protection and safe-spawn recovery support later blockout revisions.
