# Word-charge and target-lock breath verification

## Scope

- Task / authorization: SD-040, owner's October 30 letter-charge, lock-on breath and mouse-mode request. [The decision](../decisions/2026-10-30-word-lock-breath.md) separates confirmed direction from tuning choices.
- Base: HEAD `3b615b2` on `feat/first-contact-playable`, with the existing uncommitted Dogfight Lab and separate SD-038/SD-039 planning work preserved. Final `dist/dogfight/index.html`: 6,109 bytes, SHA-256 `7120b8927e8e83b94736f29fbb66782e8dd5d6f4b5c11a9aa7ec9f303aeccd69`. Flight bundle `dogfight-mk4zG1sG.js`: 639,410 bytes, SHA-256 `5321a0c43fefe04b37f412a8f094f2c32b9216a28a7241976fc92a85ece7da81`. Local full identity: `artifacts/word-lock-final-identity.json`.
- Changed behavior: one-letter-at-a-time charge; assisted completion; dwell lock on one ship; atomic Space dispatch and one nonlethal impact; mouse flight/aim toggle. Later earned upgrades and cinematic takeoff are outside this increment.
- State boundary: transient lab encounter only. No learner records, mastery assessment, campaign reward or save-schema migration.
- Changed runtime: `systems/breath-power.js`, `assets/lock-breath.js`, main/HUD/styles/page, aim/combat/audio; tracked logic/browser tests and the existing root test configurations. No dependency or runtime-asset payload changes. Original 29-file Seele export remains byte-identical.
- Environment: Windows Lenovo 82XM; Node 24.15.0, npm 11.12.1, Python 3.14.4, Vite 8.3.5, Playwright 1.64.1. Automated Chromium uses SwiftShader; installed Chrome 156.0.8078.76 uses AMD Radeon / ANGLE D3D11 in its separate headless smoke.

## Checks

| Check or exact command | Result: PASS / FAIL / BLOCKED / NOT TESTED | Evidence and limitation |
| --- | --- | --- |
| `npm.cmd run test:unit`: safe content, letter/help actions and targeting | PASS | 67 tests total: 36 retained story/navigation/save, 15 flight, 13 pure power-state, three combat/visual/mouse-aim. Safe word validation uses the same reserved-control list as runtime input. Wrong/repeated keys retain progress; help marks assistance. Dwell, replacement, grace/death, no-lock charge retention and multi-target capacity are covered. Capacity tests do not implement earned upgrades. |
| Space dispatch, pause/interruption, exactly-once impact and next-word reset | PASS | Real keyboard tests and pure state timers verify one dispatch/impact, paused clock, one disabled ID and PINK after LION. A visual test follows a moving target without changing health. Added a failing replay regression, then fixed Combat to reject an already-applied burst ID even if a caller changes its target list; all 67 final units pass. Logs: local `word-lock-replay-before.log`, `word-lock-final-unit.log`. |
| Actual keyboard/mouse play: word → lock ring → Space → visible breath → disabled ship | PASS, bounded | Development and built-game cases use real letter/Space events and aim by moving the mouse to visible ship markers, with no state setter or teleport. Installed Chrome and inspected screenshots show the breath arc. Target 0 health becomes 0; the other two remain 216; one impact, next word PINK, no page errors or external HTTP requests. |
| M/button mode toggle, independent aiming, LMB plasma and RMB zoom | PASS | Mouse aim changes the reticle while the nose stays unchanged; arrows still steer. Mouse flight moves heading without moving aim. Switching clears fire/zoom/steering; pause, blur, retry and reload retain the established recovery checks. Held control repeats cannot resurrect cleared input. |
| Spelling action hold, F1/Help together and reduced-motion presentation | PASS, bounded | Charging freezes action, health and enemies. Partial word survives pause; letters/F1 do not advance while paused. Help completes with `assisted: true`; retry/reload reset the encounter. Reduced-motion CSS removes the letter pulse; no human comfort or audibility pass is inferred. |
| `npm.cmd run check`: existing First Contact/navigation, saves and build boundaries | PASS | Full run: 67 units, TypeScript/build, 28 development browser cases, eight production cases and 18 photo checks. Existing saves and notebook isolation remain covered. The separate raw export checksum comparison passes. Local full log: `artifacts/word-lock-full-check.log`. |
| Final replay-guard verification | PASS | After the defensive impact guard, reran 67 units, production build, all three word-lock development cases and all three flight production cases. Main Earth logic was unchanged, so its passing full-suite checks were not repeated. Local `word-lock-final-{unit,build,browser,production}.log` identify the final artifact above. |
| `python tools/check_foundation.py`; `python -m unittest discover -s tests -p 'test_*.py' -v` | PASS | Foundation links/mirrors pass; 41 Python cases with two Windows symlink skips. These are documentation/tooling checks, not a game or agent-behavior pass. |
| Human Lenovo/Chrome letter legibility, lock feel, audible feedback and sustained GPU performance | NOT TESTED | Automated checks cannot establish these outcomes. |

## Review and release

- Implementation status: **IMPLEMENTED / technically VERIFIED**, within the local encounter. No new campaign progression, earned upgrade screen, full cinematic director or backend was added.
- Learning scope: `letter_matching`, no independent decoding/mastery claim or learner data. Help may charge the same attack with an assistance flag.
- Human review: NOT REVIEWED. Final art, timing/comfort and child suitability remain separate.
- Publication/deployment approval: NOT GRANTED by this local feature request. No new external media upload or service is involved.
- Recovery: retry/reload clears this encounter mechanic while preserving existing story/exploration saves; original Seele source is unchanged.
- Remote verification: no commit, push, hosted CI or deployment result is claimed for this increment.

Screenshots/logs are local under `artifacts/word-lock-*`. Installed Chrome smoke command: `node artifacts/word-lock-chrome-smoke.mjs`, 1366 × 768, fresh headless profile. This establishes local browser compatibility and the observed input-to-result flow; human letter legibility, timing, audio and sustained GPU performance remain NOT TESTED.
