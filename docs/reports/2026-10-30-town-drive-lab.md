# Town Drive Lab verification — October 30, 2026

Historical verification receipt. Its privacy/publication restriction is **REMOVED** by the owner’s later [SD-052 override](../decisions/2026-10-30-town-drive-detail-override.md).

## Scope

- **Authorization:** owner's attached Town Drive Lab task and two supplied phone-original paths; SD-046. Separate technical prototype, not town missions. [Decision](../decisions/2026-10-30-town-drive-lab.md).
- **Base:** `3b615b2dc1dcf0237d3409a7da3e238e0033602d`; local branch `feat/town-drive-lab`. The original working tree already contained unrelated, uncommitted Dogfight work through SD-045. Those edits remain preserved and are excluded from this task's commit.
- **Changed scope:** `src/game/drive/`, imported/extended `src/game/gamepad.ts`, `drive/`, entry link, Vite/local-layout middleware, drive tests, generic local-reference/compare tools, ignore rule, scoped reference/decision/project records.
- **Hardware:** Lenovo 82XM, AMD Ryzen 7 5825U, integrated Radeon; 13.84 GiB reported RAM. WMI's2GiB AdapterRAM is an inventory field, not measured available/shared VRAM. About 127 GB free during spike. Browser/runtime measurements below are separate from targets.
- **Tools:** Babylon/core+loaders 9.33.0, existing Node 24/Vite toolchain, installed Chrome 156. Blender 5.2.1 installed; live MCP connection failed. FFmpeg already installed. CPU PyCOLMAP 4.2.1 installed in ignored `.tools/town-drive-sfm/` after checking [PyPI version/license](https://pypi.org/project/pycolmap/) and [official wheel/platform support](https://colmap.github.io/pycolmap/index.html); BSD-3-Clause, CPU Windows wheel. No upload/purchase.

## Source and reconstruction evidence

Both new originals were independently hashed and probed; neither old compressed MP4 is present in this checkout. Phone originals are stored 1920×1080 with -90° rotation, displayed 1080×1920, 30 fps. The house is 195,403,134 bytes/99.84s and the drive 896,381,285 bytes/459.86s. Exact hashes, ffprobe receipts, source identity and timestamps stay in private local notes. Recheck confirms originals unchanged.

Five-second sampling produced 20 house and 92 drive frames plus contact sheets. Private route notes log signal stops/crossings, cross-sections and landscaping. Right/left/left turns are observed; compass bearings remain the owner's label, not GPS verification. The visible computer is upstairs, not confirmed in the living room. Dimensions are ESTIMATED; unseen rooms/features are UNSEEN. The P0 local layout covers an estimated downstairs subset with an explicitly fictional computer staging placeholder. The public layout is wholly fictional.

| Spike | Actual result | Verdict |
| --- | --- | --- |
| House 70–95 s, 50 frames at 2 fps, CPU SIFT/sequential matching | Largest model 16/50 registered (**32%**),3,638 points,0.917px mean reprojection error,54,758-byte sparse PLY,108.41s processing. Registered frames are 85–92.5 s **patio only**; indoor path did not reconstruct. | NO-GO for runtime house reconstruction this increment. |
| Road 210–250 s, 80 frames at 2 fps, conservative dashboard/mirror/traffic masking |2/80 registered (**2.5%**),33 points,0.658px mean reprojection error,681-byte PLY,51.59s processing. Only 238.5–239 s paired. | NO-GO for drivable reconstructed geometry. |
| Gaussian/mesh follow-up | Majority-registration gate failed; no CUDA GPU identified. No Gaussian trainer run and no candidate mesh/splat loaded. | NOT TESTED, appropriately skipped. Reconstruction browser FPS unavailable. |

Source clips, redaction/mask details, exact commands/options, sparse previews and full output are in ignored `assets/reference/local/environments/{house-interior,car-driving}/` (`notes-v001.md`, `spike-v001.md`, `sfm-v001/`). Raw inputs/geometry never entered `public/` or Git. Moving traffic was conservatively masked by regions, not guaranteed semantic segmentation; that limitation does not turn the failed solve into usable geometry.

Installed Babylon 9.33 SPLAT metadata/parser code was inspected: `.ply`, `.splat`, `.spz` are supported; SPZ parser accepts versions 2–4. A COLMAP sparse PLY is not trained Gaussian data. No splat runtime feature/dependency was added.

## Checks

| Command/check | Result | Evidence and limitation |
| --- | --- | --- |
| `node --test --experimental-strip-types tests/drive.test.ts` | PASS |12 cases: determinism, input/limits, actual geometric turns/connectivity, reset/bonk, ordered/idempotent gates, full loop, saves/backup/future/quota and analog mapping. Normal loop 239.08 simulated seconds across 4,669.42 invented metres. |
| Initial `npx playwright test tests/drive.spec.ts` | PASS after correction |Four input/save/privacy cases passed. Earlier failures from concurrent Vite reloads and a missing Babylon Ray side-effect were diagnosed; final source removes the diagnostic Ray dependency and separates optimizer caches. |
| `npm.cmd run check` | **PASS** | Executed in isolated `C:/Projects/space_dragon_drive_review` with only the proposed commit files and `npm.cmd ci`: **48 unit**, typecheck/build, **27 development browser**, **6 production browser**, **18 photo** checks. Includes all four legs with rendered chunk/prop collision, return-home/reload, standard analog gamepad, storage-failure honesty and retained First Contact/navigation. No private source files exist in that checkout. |
| `python tools/check_foundation.py`; `python -m unittest discover -s tests -p 'test_*.py' -v` | PASS | Foundation/link/skill checks pass in working and isolated source trees. Python 41 run, 2 host-specific skips. These do not test gameplay or agent behavior. |
| Installed Chrome/AMD visual input smoke | PASS, bounded |1440×900 actual Radeon ANGLE renderer. HoldingW for3s moved17.85m. Home/car/roads, dashboard and leg2 inspected; no page/shader errors after fixes. Final isolated 20.0001 s held-W chase sample: 1,200 frames, **59.9997fps**, p50=16.7ms,p95=17.0ms,max=17.5ms,zero frames over33.4ms; 13/47 chunks loaded, 344 meshes, 141 active. Chrome 156.0.8078.76 headless at 1440 × 900 used actual AMD Radeon ANGLE/D3D11, with no concurrent regression browser and no page errors. This measures the initial connector/first leg only, not a full-loop thermal/endurance or human-visible performance pass. Private evidence: `drive-review/benchmark-chase-v001.json`. |
| Local compare sheet | PASS, bounded visual review | `node tools/town-drive-compare.mjs --url http://127.0.0.1:5182/space-dragon/drive/ --every 250 --out assets/reference/local/environments/car-driving/compare-v002` produced 23 captures/15 paired references/no page errors. Three-leg review prompted denser Leg 2 palms, smaller median hedges and more broadleaf canopy. Current road widths retained pending camera calibration. Invented connectors have no match; owner recognition/fun remains unreviewed. |
| Private-output boundaries | **PASS** | Original/derived/local paths ignored; no media or real layout staged. Generic scripts reject nonlocal/existing outputs. Fixture endpoint/private-path denial and production recursive content/filename scan pass. Default public build uses fictional house; source videos and layouts are absent from the clean checkout. |

## Review and release

IMPLEMENTED: separate playable road loop, arcade car, checkpoint/return-home state, proportional standard-controller mapping, pause/focus release, reset, Assist, F2 tuning, three cameras, arrows/minimap/chime, procedural streaming kit and private/fallback house layout. Traffic/cycling signals and runtime splats are P1, not implemented.

Human driving feel, fun, recognizability, controller hardware/USB/Bluetooth, audible chime quality, thermal/endurance performance and complete measured house geometry remain **NOT TESTED**. Human review: **NOT REVIEWED**. This is not release/deployment approval. Real-layout publication remains OPEN; ask the owner after providing the local review result.

Rollback: revert only this task's commit; preserve local sources and prior work. Missing/invalid local layout falls back to fictional data. R recovers the current drive checkpoint, not Earth progress. Remote head/commit/PR and clean-artifact checks are recorded below when completed.


## Final artifact and review preparation

- Final isolated source fingerprint (sorted relevant filenames + NUL + LF-normalized bytes + NUL, SHA-256): `f9476c19720a8b2f532158fa9402bbfa2624f346616357cd1b9a6a19510231d4`. File inventory and bundle hashes are retained locally in `artifacts/town-drive-artifact.json`.
- Final drive entry bundle: `drive-DS135rPX.js`, 36698 bytes, SHA-256 `79e863f091243c6670ee2a31927caf9ad0d217359a0dc35b3347ea9509770b84`. Full test log is `artifacts/town-drive-final-check.log` in the isolated review worktree.
- Review caught and fixed: a fictional neighboring building blocking the final return road; missing final connector turn cues; misleading success toast after a failed save; Assist checkbox mismatch; tuning left open on resume; Escape inside form controls; controller-test release synchronization. The final complete-route browser case passes with collisions and chunk streaming.
- Earlier full working-tree run was interrupted during ongoing changes after an unrelated, uncommitted Dogfight case timed out. It is not the passing artifact. The clean PR check above excludes that earlier Dogfight work; this task does not re-certify or commit those ongoing changes. Initial comparison and failure evidence remain local.
- Comparison v002 has 23 views/15 paired safe references. Automated capture and agent visual review establish broad cues only; the owner's recognition/fun test remains pending. House dollhouse is an estimated downstairs subset, not full upstairs reconstruction.
- Staging review excluded a concurrently appended SD-047 spacecraft notebook entry and its separate report; both remain intact in the working tree. Concurrent tasks reserve SD-047–SD-048; next unused at final staging is SD-049. No blanket staging, private upload, deployment or reset occurred.
- Parent remote `feat/first-contact-playable` remained at `3b615b2`. Main advanced independently to `65f908b`; the stacked PR does not merge or overwrite its unrelated changes. Final commit/PR and remote verification follow in the handoff.
