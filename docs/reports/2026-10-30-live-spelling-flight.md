# Live spelling and dodging verification

## Scope

- Task / authorization: SD-041, owner's October 30 correction that the dragon keeps flying and spelling requires dodging. [The decision](../decisions/2026-10-30-live-spelling-flight.md) supersedes the prior automatic spelling hold for this mechanic.
- Base: HEAD `3b615b2` on `feat/first-contact-playable`, preserving the existing uncommitted Dogfight Lab and SD-038–SD-040 work. Final entry: 6,108 bytes, SHA-256 `03e0a0256f820497016535efb66a8201dff7ddb0ee6a66053df9c2f16b676caa`; bundle `dogfight-CbxjvbrP.js`: 638,820 bytes, SHA-256 `e53a494ce15921c1ff052cffe52f4810ac794510ef4da0ccb8348d8d0e35d47e`. Local identity file: `artifacts/live-spelling-identity.json`.
- Intended change: active flight, controls, enemy behavior, projectiles and damage during letter prompts; no spelling freeze/autopilot/invulnerability. Completion/help retains held flight controls. Normal pause remains.
- State boundary: encounter-only; no learner records, mastery claims, campaign rewards or main save changes.
- Changed runtime: `src/prototypes/dogfight/main.js`, `ui/hud.js` and `dogfight/index.html`; corresponding browser regressions in `tests/word-lock.spec.ts`. No asset payload, dependency, campaign or save changes.
- Environment: Windows Lenovo 82XM; Node 24.15.0, Vite 8.3.5, Playwright 1.64.1. Chromium tests use SwiftShader; separate installed Chrome 156.0.8078.76 smoke uses AMD Radeon / ANGLE D3D11, fresh headless profile at 1366 × 768.

## Checks

| Check or exact command | Result: PASS / FAIL / BLOCKED / NOT TESTED | Evidence and limitation |
| --- | --- | --- |
| Flight movement and steering during an incomplete word | PASS | Actual keyboard input turns the dragon while letter index remains incomplete; time, player position and enemy positions advance. Spelling keys use the separate reserved-binding check. |
| Enemy movement/fire, projectile movement and damage while spelling | PASS | Browser tests observe real enemy shots and energy loss with no simulation setter. Installed Chrome: Z moved from −3.591 to −98.9928, three enemy shots and energy 93 while letter index stayed 0. No spelling immunity, freeze or autopilot. Normal hit cooldown still applies. |
| Letters, word completion and assisted charging preserve held flight/fire controls | PASS | Arrow remains held through correct letters, charge completion and F1 help. Aiming and ordinary LMB plasma work while charging; wrong keys do not reset the word or cause a separate damage event. |
| Pause/blur/retry, mouse modes and word → lock → Space → one impact | PASS | Eight affected development cases retain mouse fire/zoom/mode cleanup, pause/focus/retry/reload, main save preservation, model failure recovery, word/lock/burst and exactly one chosen impact. Three built-game cases also pass. |
| `npm.cmd run test:unit`; `npm.cmd run build`; `npm.cmd test -- word-lock.spec.ts dogfight.spec.ts`; `npm.cmd run test:production -- dogfight.production.spec.ts` | PASS | 67 units, TypeScript/build, eight development browser cases and three production cases. Logs: local `artifacts/live-spelling-{unit,build,browser,production}.log`. Unchanged Earth rendering was not rerun; the existing global state/save tests remain in the 67-unit suite. |
| `node artifacts/live-spelling-chrome-smoke.mjs` | PASS, bounded | Installed Chrome observes movement/fire/damage while the first letter remains pending, held steering through completion/help, and regular pause stopping movement. No page errors. Local JSON/screenshot: `artifacts/live-spelling-chrome-smoke.json` and `artifacts/live-spelling-under-fire.png`. Human difficulty and performance are not established by this smoke. |
| `python tools/check_foundation.py`; `python tools/verify_family_references.py`; `git diff --check` | PASS | Guidance/mirrors/links, all 18 photo hashes/inventory and whitespace checks pass. These do not establish human gameplay or agent behavior. |
| Human Lenovo/Chrome concurrent spelling/dodging review | NOT TESTED | Letter legibility, motor demand, audio, comfort and sustained GPU performance need real play. |

## Review and release

- Implementation status: **IMPLEMENTED / technically VERIFIED** within the local Dogfight Lab.
- Authority: the scoped owner exception is explicit. General learning guidance remains in force elsewhere.
- Human review: NOT REVIEWED. No instructional-effectiveness or age-suitability claim.
- Publication/deployment approval: NOT GRANTED by this local correction; no new service or media upload is involved.
- Recovery: retry/reload preserves the lab's encounter-only reset and existing Earth saves.
- Remote verification: no commit, push, hosted CI or deployment claimed for this increment.
