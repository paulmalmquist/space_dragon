# Town Drive mapped home exit, streets and cabin verification — October 30, 2026

## Scope

- **SD-057**, [owner direction](../decisions/2026-10-30-town-drive-lived-in-streets.md): real route names, walking people, development on both sides, continued realism, white Odyssey-inspired minivan and optional detailed first-person.
- **SD-058**, [home-route correction](../decisions/2026-10-30-town-drive-home-route.md): real Starpass Court cul-de-sac and the filmed gate exit/right onto Hypoluxo.
- Base: `9e7de19572b90f14d09da90a0e3e08fe1bcdd78a`, branch `feat/town-drive-lab`, existing draft PR #23. Parallel Dogfight/audio/Blender work remains outside this increment.
- Source route: Starpass Court → right Green Island Boulevard → left Green Island Terrace → gate → right Hypoluxo → Jog → Lantana → Hagen Ranch. The home approach uses mapped centreline distances; arterial legs remain compressed and the return invented. Representative development and house placement are not a parcel survey.

## Implementation and sources

- Forty anonymous adult sidewalk walkers use deterministic, absolute simulation time. The pause clock freezes their poses and walk animation; their rounded patrols stay on sidewalks, without crossings or interactions. Two reused MIT-licensed Microsoft Rocketbox adult variants and corresponding walk clips are converted reproducibly into 2,047,660 bytes of runtime GLBs. License, source/hash and conversion records accompany the assets; raw sources remain local. Rendering uses a bounded visible population and baked animation matrices.
- Original white Odyssey-inspired geometry follows [Honda's 2026 US dimensions](https://hondanews.com/en-US/honda-automobiles/releases/release-5f9c753ac34573a2867fe50f480e53b1-2026-honda-odyssey-specifications-features): 5.212 × 1.994 × 1.768 m, 3 m wheelbase. Eight seats, door cards, headliner, console, steering, live instruments, glazing, wheels and lamps are modeled. No Honda CAD/model, logo or manufacturer imagery is shipped. Mirrors use environment reflections; the center navigation graphic is decorative. This is an approximation, not an exact photoreal scan.
- V explicitly switches cabin/chase; C/R1 retains the three-camera cycle. Q/E or pointer drag looks through developed side views without steering; release, pause and blur clear held look. The driver eye is inside the cabin, and its instrument panel remains readable.
- Batched development supplies varied houses, garages, porches, roofs, fences, gardens, pools, bins, air-conditioning units and retail units with glazing/display depth. Existing photographed surfaces/sky, vegetation, traffic and signals remain. Buildings are representative and do not reproduce every actual property.
- The home uses an estimated exterior shell and tiled roof by default. The original reference interior is retained underneath; development inspection can explicitly call `__TOWN_DRIVE__.setHomeCutaway(true)`. Ordinary orbit and driving do not expose the roofless cutaway.
- Google Maps was attempted but inaccessible through web access; native Computer Use stopped because it could not verify Chrome's active URL. No Google aerial inspection is claimed. Existing local OpenStreetMap geometry identifies ways 11227044, 11205953, 774605908, 774605910 and 774612523. OSM attribution/source records accompany derived geometry. The Census address match is interpolation, not a surveyed home location.
- Supplied `IMG_5754.MOV` video corroboration: residential T junction at 00:18; palm-planted junction at 00:35; curved approach at 00:55; booth/white gate rails at 01:05; arterial signal at 01:15; Hypoluxo turn at approximately 02:05. The owner's “visitors gate” designation is retained without claiming independent sign verification. Local comparison sheet: `assets/reference/local/environments/car-driving/home-exit-review/opening-road-sheet.jpg`.

## Checks

Tested in the isolated `C:\Projects\space_dragon_drive_city_review` projection of base `9e7de19`, excluding concurrent Dogfight/audio/cinematic edits. Node 24.15.0, npm 11.12.1 and Python 3.14.4 on Windows. The final 70-file source/test/asset inventory has SHA-256 `f7e40a2892d4a921fb55f2e03565c91ff036f078596011a03314dbd7272cafbf` (compact JSON inventory; text normalized to LF and binary bytes exact), retained locally in `artifacts/drive-city/tested-runtime-inventory.json`. Only `world.ts` changed after the initial full run, to clear the misplaced tree described below.

| Check | Result | Evidence and scope |
| --- | --- | --- |
| `npm.cmd run test:unit` | PASS | 66 tests, including mapped route, shared-stem return, deterministic traffic, pose-cache mutation safety, sidewalk confinement and save recovery. |
| `npm.cmd run build` | PASS | TypeScript and Vite static build. |
| Development browser cases | PASS after correction | Initial `npm.cmd run check` passed 28 of 29; the full lap exposed a misplaced roadside tree. The corrected rendered lap passes in 4.1 minutes with the original assertions/time budget. Final TypeScript/build also passes. Isolated ports 5195/4195 with `CI=1`. |
| Production browser cases | PASS | All six built-game and asset-boundary cases, 52.9 seconds, on the corrected build. |
| `python tools/verify_family_references.py` | PASS | All 18 approved reference hashes, sizes and inventory entries match. |
| Focused rendered home exit | PASS | Semantic steering reaches Hypoluxo, save/reload preserves the checkpoint, explicit fresh start returns to Starpass, Earth saves unchanged; 51.3 s test. |
| `python tools/check_foundation.py` | PASS | Guidance, links and skill mirrors; not gameplay evidence. |
| `python -m unittest discover -s tests -p 'test_*.py' -v` | PASS | 41 cases, two Windows symlink privilege skips. |
| Runtime manifest / provenance review | PASS | 34 Drive files, 21,805,676 bytes; all hashes/sizes match, eight GLBs are self-contained. MIT notice has an explicit LF checkout rule. New distant GLBs each validate with zero errors/warnings. |
| Unobstructed deterministic lap | PASS | 289.8 simulated seconds, ordered checkpoints, zero bonks/resets; excludes rendered traffic and actual human driving. |

The test configurations accept `SPACE_DRAGON_TEST_PORT` and `SPACE_DRAGON_PREVIEW_PORT` so concurrent local work cannot reuse the same server. Defaults remain 5175/4177 and notebook fixtures remain isolated. Full-check log: `artifacts/drive-city/full-check.log` in the review checkout.

Final gate coverage totals 66 units, TypeScript/build, all 29 development cases (28 initial passes plus the corrected lap rerun), all six production cases, and 18 photo inventory checks. The original monolithic `npm.cmd run check` exited on the tree failure; its successful stages were retained and affected checks plus downstream stages rerun separately. An orchestration typo invoked nonexistent `verify:photos` after production passed; the actual supported `python tools/verify_family_references.py` command passed independently. No passing result is inferred from that typo.

The first full lap hit a roadside trunk where the return joins Green Island. A native diagnostic observed a reset at 407.07 simulated seconds from route distance 4340.79 m back to the Hagen Ranch checkpoint at 1944.67 m. The original 800-second test then exhausted its budget while repeating the return; its trace is retained in `artifacts/drive-city/initial-lap-failure.zip`. Numeric inspection placed that trunk only 0.659 m from the returning lane centre. Roadside planting now checks the nearest road edge; exactly one of 227 deterministic trunk placements is removed. The test time budget and completion assertions remain unchanged. The corrected rendered test passes, including all ordered checkpoints, traffic following, streamed sections, completion and reload. A separate Node diagnostic with NPC collisions but no static scenery completes in 419.6 seconds with zero collisions/resets. A 0.25 m route-sampling audit found no lane overlaps among 1,023 building/parked collision discs; see local `artifacts/drive-city/static-clearance-audit.json`. These are automated-driver timings, not a human lap measurement.

The first final-detail moving chase sample on the Lenovo AMD GPU averaged **37.83 fps** over 20 seconds (p95 49.9 ms), below the roughly 60 fps target. This triggered an optimization pass: one material draw for building groups beyond 125 m (142 m hysteresis), a third vegetation tier beyond 170 m (956,148 additional asset bytes), hidden cabin fittings omitted in chase view, and cached NPC poses. Close vegetation geometry stays unchanged. Car exterior enabled geometry falls from 137,276 to 103,670 triangles; detailed cabin fittings restore in first-person, while the driver headrest stays hidden for sightline. A CPU-only Node diagnostic of mixed traffic work falls from 0.668 to 0.302 ms per simulated frame with identical final state/query checksums. These measurements describe the intermediate bottleneck and individual changes; the final whole-scene result is recorded separately.

Two subsequent optimized samples measured 26.72 fps chase and 23.54 fps cabin while an independent Playwright/SwiftShader process used approximately 16 CPU-seconds per 1.5 seconds. Its parent was outside this review run. A later separate software-rendered batch overlapped another attempt (27.40 chase, 22.50 cabin, 40.02 side fps). Those samples are retained as contested-load measurements and do not establish the optimization's effect.

Final native measurements started after a watcher confirmed no `chrome-headless-shell` process for ten consecutive seconds at 23:39:45 EDT. Installed Chrome **156.0.8078.76**, ANGLE **AMD Radeon Graphics / D3D11**, viewport and canvas **1440 × 900**, DPR 1. Each sample is an actual 20-second assisted drive of approximately 300 m, with no page errors and the simulation unpaused. The source is the final inventory above; local evidence is `artifacts/drive-city/hardware-{chase,dashboard,side}.json`.

| View | Average fps | p95 frame time | Longest frame |
| --- | ---: | ---: | ---: |
| Chase, Hypoluxo | 35.17 | 50.1 ms | 133.0 ms |
| First person, Hypoluxo | 42.32 | 33.6 ms | 83.4 ms |
| First person looking right, retail leg | 57.51 | 17.2 ms | 83.1 ms |

**The roughly 60 fps chase target is not met.** The final moving scene remains more expensive than the previous increment; isolated mesh/CPU savings do not establish whole-scene improvement. Further optimization is a known next action, along with owner appearance/road-recognition review. These short samples do not establish sustained thermal or full-route performance.

During development, appearance review found and corrected reversed building faces, a shop sign hidden behind its facade, repeated roof texture clones that prevented scene readiness, inverted instrument text, wheel obstruction of the speed digits and overlapping minivan bumper skin. These observations are development diagnostics, not final passing evidence.

The preceding commit's remote workflow run 41145850789 was canceled at its 15-minute game-job limit. All seven prior drive cases passed there, but a First Contact case exceeded its 45-second timeout. The game job now permits 35 minutes and CI defaults permit 90 seconds; gameplay assertions remain intact. A new remote result must be read before claiming CI passes.

## Review and release

Agent visual review on installed Chrome at 1440 × 900: [Starpass overhead](images/town-drive-city-2026-10-30-court-overhead.jpg), [gate approach](images/town-drive-city-2026-10-30-gate.jpg), [minivan](images/town-drive-city-2026-10-30-minivan.jpg), [cabin](images/town-drive-city-2026-10-30-cabin.jpg), [left view](images/town-drive-city-2026-10-30-left.jpg) and [right view](images/town-drive-city-2026-10-30-right.jpg). These are actual final-scene captures with no page errors, not generated concept images. They show road alignment, enclosed home roof, vehicle/cabin fit and development visible through both side windows.

Human appearance/road-recognition/handling review, physical controller, sustained thermal/endurance and exact house survey remain NOT TESTED. The start pose is on Starpass at the bulb mouth, beside the estimated home drive; it is not a measured driveway spawn. Gate arms remain raised scenery. Agent visual inspection is recorded separately from human REVIEWED status. The realism target remains an ongoing art judgment; compilation or screenshots do not establish photorealism.

No production deployment or final human appearance acceptance is claimed. Existing SD-052 reference-layout permission remains in effect. Preserve source assets and prior working traffic increment for rollback. The review projection isolates Town Drive from unrelated Dogfight/audio/Blender edits in the live workspace; no blanket staging is permitted.
