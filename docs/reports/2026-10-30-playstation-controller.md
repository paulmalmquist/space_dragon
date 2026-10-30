# Verification receipt — PlayStation controller input (SD-038)

**Date:** October 30, 2026  
**Request:** “Can we get this to work plugging in a PlayStation controller”  
**Authority:** implement a reversible browser controller layer within the existing First Contact foundation. No site deployment or new engine.

## Scope

- Baseline on main at branch creation: `edfe592a4cb336dcb3f20bf399adc7009a564316`.
- Tested source commit: `5eb5c47616745634c0893398678c9abde0305ddd` on `feature/playstation-gamepad-first-contact`; this receipt itself is documentation only.
- Runtime changes: `src/game/gamepad.ts`, `src/game/scene.ts`, `src/main.ts`, `src/style.css`. Test and workflow additions: `tests/gamepad.spec.ts`, `.github/workflows/browser.yml`. Other changes are project decisions, status and traceability documents.
- Environment: GitHub-hosted Ubuntu 24.04, Node.js 24, Chromium via Playwright 1.64.1, software WebGL (SwiftShader). **No real DualSense or DualShock device was attached.**

## Observed checks

| Check | Result | Evidence |
| --- | --- | --- |
| Node 24 pinned install and TypeScript/build | **PASS** | [Browser CI run 41117203790](https://github.com/paulmalmquist/space_dragon/actions/runs/41117203790), `npm ci`, `npm run build`. |
| Chromium browser regression, including simulated DualSense | **PASS** | Same CI run: **12 tests passed** in 55.8s. Included camera pan/orbit/zoom, Cross edge triggering, mapped/unmapped device handling, disconnect fallback, notebook isolation, and existing checkpoint/idea/safe-access flows. |
| Python foundation/agent rules and reference inventory | **PASS** | [Foundation CI run 41117203312](https://github.com/paulmalmquist/space_dragon/actions/runs/41117203312). |
| Native PS5 DualSense USB, Bluetooth, reconnect | **NOT TESTED** | No physically attached gamepad or named Windows device/browser in this runner. |
| Native PS4 DualShock USB, Bluetooth, reconnect | **NOT TESTED** | No physically attached controller. |
| Xbox controller, other OS/browser configurations | **NOT TESTED** | Standard mapping is supported in code; real device compatibility is not proved. |
| Input latency, analog drift, real hardware FPS | **NOT TESTED** | Chromium+SwiftShader is not hardware performance evidence. |
| Full character locomotion, combat and dragon flight | **NOT IMPLEMENTED** | This increment operates the current static camera and existing story interaction only. |

## Review and release

- Implemented: standard Gamepad API adapter, single-player active standard controller selection, camera controls, Cross/A story confirmation, live status, preservation of keyboard/mouse, masked actions when a dialog is open, and unsupported device fallback.
- Review: CI automation passed; no owner or child play review recorded.
- Deployment/site integration: **NOT PERFORMED**. `paulmalmquist.com/space-dragon` remains a target and is not claimed to be live.
- Risk/next test: on the real development computer, plug a DualSense using a data-capable USB cable; open the Vite local game in Chrome or Edge; press Cross to expose the controller; verify connected status, the first two story interactions and both sticks/triggers. Repeat over Bluetooth and record OS, browser, device and result. Verify focus recovery and reconnection. Keyboard remains the fallback.
- No secret, deployment, account, reference photo or story canon changes are part of this controller feature.

Earlier CI runs failed before fixes: an added `role=status` changed the prior test's first status locator, and using `ArcRotateCamera.setTarget()` for panning unexpectedly recomputed radius, masking trigger zoom. Both issues were corrected and the later 12-test run passed.
