# Dogfight camera, motion, targeting and visual polish

## Scope

- Authorization: SD-042, owner's October 30 request for a closer dragon view, irregular flap/glide beats, pointer-following aim while flying, more photorealistic dragon/drones/explosions and randomized word order. Original wording is preserved in [the inbox](../../ideas/INBOX.md).
- Base: HEAD `3b615b2` on `feat/first-contact-playable`, with the existing uncommitted Dogfight Lab and SD-038–SD-041 work preserved. Final entry: 6,108 bytes, SHA-256 `c3b99eeb54a935efd4cc3272297c3c6a85f304ec6ee3a667ed95846079959fbb`. Bundle `dogfight-DoGmKQ5x.js`: 655,432 bytes, SHA-256 `e56c281dad74471fd3480a5bc0552e30e269e7d0eb403fef38cfc65ab7ed8938`. Local full identity: `artifacts/dogfight-polish-identity.json`.
- Runtime boundary: local Three.js Dogfight Lab only. SD-041's active flight/combat/dodging while spelling remains in force. No campaign, learner-record, save-schema or backend change.
- Camera tuning starts at 15 m behind / 5.8 m high, from 18 / 7.1, retaining the existing 61° normal and 40° held-zoom FOV. These are reviewable camera choices, not measured performance claims.
- Wing animation uses deterministic irregular stroke groups and distinct steady glides; it poses named bones without changing authoritative flight state. Mouse flight now also points the reticle under the cursor; aim mode moves the reticle alone. Word selection uses a shuffled bag of the existing safe four-letter words.
- Visual scope: improve the existing candidate models' surface response, lighting and rendered effects. Original GLB/Blender files remain unchanged. This is a quality pass, not final geometry, photorealism approval or a public release.
- Runtime changes: lab camera config, `animation/wing-cadence.js` and dragon poses; pointer handling and presentation; shuffled `systems/breath-power.js`; `assets/surface-materials.js`, lighting/environment, effects and resource cleanup. Browser tests read the displayed word via `tests/helpers/dogfight.ts` rather than assuming a fixed first word.
- Environment: Windows Lenovo 82XM, Node 24.15.0, Vite 8.3.5, Playwright 1.64.1. Chromium interaction tests use full-resolution SwiftShader; separate Chrome **156.0.8078.76**, AMD Radeon / ANGLE D3D11, fresh headless profile, 1366 × 768 for inspection.

## Checks

| Check or exact command | Result: PASS / FAIL / BLOCKED / NOT TESTED | Evidence and limitation |
| --- | --- | --- |
| `node --test tests/wing-cadence.test.mjs` | PASS | Three tests: irregular stroke/hold duration and amplitude, exact steady-wing beats, smooth joins/reset and matching poses at 30/120 Hz through boost. Root flight position is unchanged by animation. |
| Closer chase view and held zoom | PASS, bounded | Installed Chrome renders the nearer view, full wing/tail framing and held zoom; automated input covers turning, both rolls and zoom/release. Captures: local `dogfight-polish-flight.png`, `-glide.png`, `-zoom.png`. Camera comfort is not human-reviewed. |
| Pointer-following reticle in flight and aim modes | PASS | Actual mouse events align the rendered reticle center to cursor pixels in both modes, including near viewport edges. Flight mode also turns; aim mode leaves the nose unchanged. W/A/D/Z, actual shots, lock acquisition and input cleanup remain covered. |
| Shuffled word order and safe letter bindings | PASS | 17 power-state tests include seeded reproducibility, each word once per bag, no adjacent repeat across refill/retry, reset and single-word pool behavior. Default runtime uses Math.random. Native sequence observed **KING → COIN → LION** across attack/retry; browser tests read each actual prompt. Letter bindings remain disjoint from flight controls. |
| Material, lighting and explosion result in the browser | PASS, bounded | Six dragon and four drone materials use physical finishes, six procedural normal/roughness maps, neutral PMREM reflections and a following 1024 shadow map. Soft irregular fire/smoke lobes, batched spark trails, fragments and brief flash lighting replace the earlier opaque particles; the expansion rim was reduced after visual inspection. Native observed 22 effect items at impact, one disabled ship and safe disposal on returning home. Underlying meshes/rig remain the prototype; final photorealism is not approved. |
| `npm.cmd run test:unit`; `npm.cmd run build`; affected Playwright flows | PASS | **78 unit tests**, TypeScript/build, all **eight development** dogfight/word cases and **three production** flight cases pass. Coverage includes live spelling/damage, mouse/keys, blast, retry/reload/main save preservation, missing-model recovery, local network boundary, production route and absent dev API. No dependency or public asset payload changed. Original 29-file delivery is byte-identical; all 18 photo checks pass. |
| `node artifacts/dogfight-polish-chrome.mjs` | PASS, bounded | Real pointer input, charge/lock/impact, glide, zoom, retry and return with zero page/console errors and no external HTTP requests. Native glide lasted ~0.908 s, flap/bodyLift both zero during the observed hold. A separate three-second idle-battle sample: 180 intervals, mean 16.758 ms (~59.67 fps), p95 17.1 ms. This short headless sample does not establish sustained device performance or human play acceptance. Local JSON/log/captures: `artifacts/dogfight-polish-*`. |
| `python tools/check_foundation.py`; `git diff --check` | PASS | Guidance, links/mirrors and whitespace pass. These do not test agent behavior or human visual suitability. |
| Human Lenovo/Chrome control feel, visual quality and sustained GPU performance | NOT TESTED | Automation/headless rendering does not establish these results. |

An initial full-resolution software-rendered motion check reached aim x=0.27 in its five-second window before needing x>0.35. The same run's other seven cases passed. Increased that polling window to 15 seconds; its assertion then passed. A subsequent run passed seven cases and needed the same timing allowance for reversing steering after a mode switch; the targeted rerun passed. Thresholds, actual input and render resolution were retained. Final evidence spans the full run plus that one-case correction and the three production cases. Logs: `dogfight-polish-final-{unit,build,browser,production}.log`, `dogfight-polish-mode-recheck.log`; the initial attempt remains in `dogfight-polish-browser.log`.

## Review and release

- Implementation status: **IMPLEMENTED / technically VERIFIED** for this local polish increment.
- Preserved rules: live spelling/dodging, one-target initial lock capacity, separate letter/flight bindings, nonlethal opponent feedback and unchanged Earth saves.
- Human review: NOT REVIEWED. Final art/photorealism, camera comfort, letter legibility and device budgets remain review items.
- Publication/deployment approval: NOT GRANTED. No new personal media, external generator upload or hosting change is involved.
- Recovery: preserve the original delivery and existing saves; revert the bounded working-copy changes together if needed.
- Remote verification: local changes on `feat/first-contact-playable`, HEAD `3b615b2`; no commit/push, hosted CI or deployment performed for this increment.
