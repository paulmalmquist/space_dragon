# First Contact suits and story integration — verification receipt

## Scope

- Owner request: “Continue coding based on the recent updates to the story.” SD-019/SD-M1 increment.
- Base commit: `4bcfd8d2396928950d2c68187b3ac1e44dac8c33`.
- Branch: `codex/first-contact-suits-and-story`.
- Outcome: supplied suits, five contextual demonstrations, supported scan, saved archive/town briefing, v1 migration, opt-in local-device speech, pause and reduced motion. New character/SOS sources reconciled with linear progression and Viera; detailed lore stays proposed.
- Changed runtime: firstContact/checkpoint/narration/scene modules, main UI/styles, Playwright configuration and tests, plus a repeatable production verifier/npm script. Project/story/intake/milestone/development/interaction documents updated with source authority and exact scope.
- Environment: Linux cloud container, Node 24.22.1, npm 11.9.0, repository-pinned Babylon/TypeScript/Vite/Playwright. Browser: Chromium 133.0.6943.0 from temporary `@sparticuz/chromium@133.0.0`; explicit executable override, SwiftShader. No new repository dependency or lockfile modification.

## Checks

Initial findings and fixes retained:

- Pinned Playwright Chromium 156 download and runtime-bundled Chromium 151 download both returned invalid/truncated archives. BLOCKED for those versions.
- Temporary Chromium package extraction encountered an unsupported chown. Brotli payloads were unpacked without ownership changes into the task's temporary browser directory. A premature test attempt using the incomplete executable could not launch browsers; no gameplay result is inferred from that run.
- First working-browser run: 18 passed, 1 failed. A double click could land on Skip after the card changed height. Fixed with a 350 ms input-settle guard across story controls, while progress saves immediately. Retest includes keyboard focus, held input and skip paths.

## Final verification

Tested artifact: SHA-256 of the sorted `dist/` SHA-256 manifest is `4032a178fc50485b0a40f1634171c9f9c8bef565f8d79b1452edc039a396aad2`. Manifest format is one lowercase file SHA, two spaces, repo-relative POSIX path per line, ending in a newline; saved locally in `artifacts/build-sha256.txt`. All runtime code was unchanged between this build, full suite and production smoke.

| Command/check | Result | Scope and evidence |
| --- | --- | --- |
| `npm ci` | PASS | Existing exact-pinned dependencies; lockfile unchanged. |
| `SPACE_DRAGON_BROWSER_PATH=/workspace/scratch/502802eded9c/browser-tools/bin/chromium npm run check` | PASS | TypeScript, Vite build, **22 Playwright checks**, all 18 reference-photo hashes. 18 browser flows, 3 pure state checks, 1 HTTP isolation check. |
| `python3 tools/check_foundation.py` | PASS | Documents, local links, canonical skills and unchanged mirrors. |
| `python3 -m unittest discover -s tests -p 'test_*.py' -v` | PASS | **41 tests**, no skips. Does not evaluate agent behavior. |
| `python3 tools/verify_family_references.py` | PASS | 18 approved references, no photo changes. |
| `SPACE_DRAGON_BROWSER_PATH=… node tools/verify-production.mjs` | PASS | Built app on `/space-dragon/`: full assisted flow, reload, no dev observation API/notebook, notebook POST 404, no page errors. |
| Runtime artifact inspection | PASS | 42 output files, no JPEG/Blender/Markdown/audio sources; no reference filenames or dev state API in output. No new external assets were used. |
| Screenshot review | PASS within placeholder scope | Desktop scan, desktop town briefing, 390-pixel briefing viewed. Text and controls readable, no horizontal overflow. This is agent visual inspection, not human suitability approval. |
| `git diff --check` | PASS | No whitespace errors. |

The suite covers suit actions and geometry changes; reload after every demonstration; all-help and skip equivalence; durable assistance; corrupt and impossible saves; v1 migration with legacy bytes retained; blocked writes; restart confirmation/backup; double clicks and held Enter; pause/notebook/visibility; initial reduced-motion preference; local speech selection/cancel via a stub and unavailable-voice fallback; WebGL-failure story completion; isolated notebook writes and narrow layout. It records **no independent learning mastery**. Browser speech audibility is not inferred from the stub.

The existing Vite large-chunk warning remains: main JS approximately 1.09 MB / 265 KB gzip. This is a prototype size measurement, not a hardware/loading performance pass. Default Playwright Chromium 156 remains untested because its download failed; Chromium 133 compatibility is the observed result.

Raw logs and screenshots stay in ignored `artifacts/`. After the input guard was added, two test helpers initially pressed a temporarily disabled button without waiting; those failures were retained in earlier run logs. The helpers now await enabled controls, and the full final run passed. The gameplay double-click fix remains covered.

## Review and release

No production deployment, website integration, backend change, final art, new likeness publication or cloud speech. The exact pinned browser, real player device/GPU, actual speech audibility, controller, Blender and human suitability review remain NOT TESTED/NOT REVIEWED. Narrow viewport checks are supplemental; touch support remains deferred. Town missions, flight, planet visits and SOS composition are future implementation, not claimed by the briefing.


## Handoff and recovery

- Implemented and VERIFIED within the scope above. Human review / production release approval: not established by this receipt.
- Old v1 saves remain intact. A confirmed reset keeps the previous checkpoint in `space-dragon.checkpoint.before-restart`; manual restoration to the v2 key is documented in development instructions.
- Rollback: revert this feature commit/PR; the untouched v1 key remains available to the old build.
- Remote `main` re-read before publication: `4bcfd8d2396928950d2c68187b3ac1e44dac8c33`. Branch/PR publication and remote CI are reported in the task handoff; local results above do not claim a CI run.
- Next increment: one Space Blocks retrieval and Assembly Module installation. Final art, speech/device review and website integration remain separate work.
