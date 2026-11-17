# Luke's Arena: abilities and stealth — verification receipt

SD-089, November 16, 2026. **Browser reference: IMPLEMENTED / VERIFIED for the named software-rendered checks. Unity: IMPLEMENTED; import, play and builds NOT TESTED.** Not played by a person. Not reviewed. Not approved for release. Rules and numbers are PROPOSED.

## Scope

- Task / authorization: the owner's November 16 request, verbatim in [the inbox](../../ideas/INBOX.md); [decision](../decisions/2026-11-16-lukes-arena-abilities-and-stealth.md); ordered next steps in [the roadmap](../project/ROADMAP.md).
- Base: `main@5b86dda`; work continues on branch `claude/keen-ritchie-ogadaj` after `6d85210`, draft PR #36. The commits that carry this receipt are listed on the pull request.
- Changed paths: `src/game/arena/**`, `arena/index.html`, `src/game/traversal/{hero,tuning,world}.ts`, `src/game/hero/{person-motion,person-avatar,hero-avatar,hero-audio}.ts`, `src/game/third-person-camera.ts`, `src/main.ts`, `src/style.css`, `vite.config.ts`, both Playwright configs, `.github/workflows/foundation.yml`, `tests/arena*`, `tests/climb.test.ts`, `tests/person-motion.test.ts`, `tests/navigation.production.spec.ts`, `tests/*unity-export.test.mjs`, `tools/unity/export-arena.mjs`, `tools/unity/export-playground.mjs`, `tools/unity/run-playground.ps1`, `tools/unity/playground-compile/Stubs/InputSystemStubs.cs`, `package.json`, `unity/SpaceDragon/Assets/SpaceDragon/Traversal/**`, `unity/SpaceDragon/Assets/SpaceDragon/Playground/{Runtime,Editor}/**`, project documents.
- Environment: Linux cloud container, no GPU, no Unity Editor. Node 24, .NET SDK 8.0.134, Python 3.13. Chromium from the container image through `SPACE_DRAGON_CHROMIUM_PATH` (not the project-pinned build), SwiftShader software rendering: about 3 frames a second in the arena and about 1 to 2 in the Earth slice on this run, so the fixed-step game ran in slow motion.
- Actual device: **none.** No Lenovo, controller hardware, phone or tablet.

## Checks

| Check or exact command | Result | Evidence and limitation |
| --- | --- | --- |
| `npm run test:unit` | PASS | 319 of 319. New: 21 arena rules, 6 arena save, 3 arena input, 7 Spider Climb, 1 climbing-pose, 3 arena export-drift tests. |
| Arena rules on the real level (inside the above) | PASS | Scripted pilots using only move keys, jump, suit power and the one button: the course is lapped inside the gold time using ground, climb, air and swing; the ring's three waves are cleared with no hits by stepping aside after each commit, and with hits by a fighter who never dodges; the yard is crossed unnoticed by the catwalk and swing after waiting for a patrol to turn away; walking straight at the vault is caught and still arrives. 90,000 steps of random and idle input never leave Luke stuck, out of bounds, inside a solid, or with a reward lost. |
| `npx tsc --noEmit`, `npm run build` | PASS | Typecheck clean; four pages built (home, drive, dogfight, arena). |
| `python3 tools/check_foundation.py`; `python3 -m unittest discover -s tests -p 'test_*.py'`; `python3 tools/verify_family_references.py` | PASS | Structure and links; 51 Python tests; 18 reference images. None tests gameplay. |
| `npm test -- tests/arena.spec.ts` (dev server, real keyboard) | PASS | 8 of 8, twice (4.9 minutes each). Opens from the home page link; climbs and pulls up with W held; clears a ring wave by pressing F when offered; takes a quiet takedown when the purple ring is offered and finds it after a reload; is caught and set back by the floodlight with nothing saved; reaches the vault and sees its stars saved once; pauses without a stuck key; one **simulated** standard controller. Luke is placed at each start by a development-only hook; every action after that is real input. Software rendering. |
| `npm run test:production` (built site) | PASS, after one test was made robust | 10 of 10, including a new arena case that walks with real keys and confirms the built page exposes no placement or scene access. Before the change below it was 9 of 10. |
| Existing `tests/navigation.production.spec.ts` | FAILED as written, 3 of 3 alone; PASS after the change | It pressed Space, then held D and waited 5 seconds for the pickup prompt. At this run's 1 to 2 frames a second the 9-frame jump took 5.3 to 6.2 seconds. **The previous commit's build measured the same (5.7 s), so this is not caused by this change.** The old order could also miss the prompt on a fast machine, because Luke lands inside the pickup circle and walks out of it within a third of a second. The test now waits for the jump to be offered a tether and to land, then walks, with 40-second allowances. Every earlier assertion is kept; passes in normal and `CI=1` rendering. |
| Earth browser suites: `tests/first-contact.spec.ts tests/navigation.spec.ts tests/traversal.spec.ts tests/gamepad.spec.ts tests/visual-foundation.spec.ts` | 32 of 33 in the full run; the failed file PASSES alone | The full run shared the CPU with a compile and unit tests started by the agent. One 20-second walk in `navigation.spec.ts` timed out 0.11 m short. Run alone, that file passes 5 of 5. The full suite was not repeated afterwards; no Earth code changed after it. |
| `npm run unity:playground:verify` | PASS | Hero files, generated playground C#, generated arena C# and Unity `.meta` files match their sources. |
| `npm run unity:playground:coretest` (dotnet test) | PASS | 30 of 30: 12 traversal, 10 playground, 8 arena. The arena port replays **11 runs recorded from the TypeScript rules (34,001 steps) and matches all 290 checkpoints** to 1e-8, including robot positions, headings, awareness and modes; between them the runs raise all 16 arena events and use ground, air, swing and climb. This is the Unity EditMode test source run outside Unity. |
| `npm run unity:traversal:parity` (dotnet) | PASS | Hero simulation against 14 golden scenarios on the home block: 9,327 steps, largest difference 7.2e-16. |
| .NET Standard 2.1 build of the engine-free core | PASS | The arena rules use nothing newer than Unity's profile. |
| `npm run unity:playground:compile` | PASS, limited | `ArenaGame`, `LukeArenaScene` and the changed `PersonAvatar` compile with 0 errors against public UnityEngine 2021.3 modules, UnityEditor 2021.1 and hand-written Input System / URP stubs. Language errors only; **not** a Unity 6000.6 compile. |
| Browser lab appearance: welcome, hub, climbing, snare, wind-up, quiet opening, floodlight catch, catwalk view | PASS, agent inspection | Screenshots viewed in-session: sight fans are cut off behind crates, red lanes show under Luke during wind-ups, the snare line runs from his raised hand, the purple ring and "Quiet pounce" appear together, the floodlight lights the floor and its beam holds him. Not retained in the repository. Not a human art review. |
| Unity: scene generation, play, EditMode tests inside Unity, Windows and Web builds, for the arena and still for the playground | **NOT TESTED** | No Editor. Run the [runbook](../engineering/UNITY_PLAYGROUND_HANDOFF.md). The see-through materials and the spotlight are the least certain parts. |
| A person playing: difficulty, star times, whether a child finds the walls and the stealth rule | **NOT TESTED** | Nobody has played it. Every number is a first guess. |
| Hardware performance, real controller, touch, audio by ear | **NOT TESTED** | Software rendering and synthetic input only. |
| Town Drive and Dogfight development suites | NOT RUN locally | Their code is unchanged; the shared stylesheet gained one unrelated rule. Hosted CI runs them. |
| Hosted CI on the pull request | See the pull request | This receipt does not claim a green hosted run. |

## Review and release

- Implemented outcome: a third lab, Luke's Arena, with an ability course, a three-wave battle ring and a stealth yard; Spider Climb in the shared hero rules; a star save that only grows; the same rules in engine-free C# with recorded-run parity; a generated Unity scene and runtime that compile outside the Editor.
- Coverage not performed: everything inside Unity; any real device; human play; human art or sound review; agent-behavior tests.
- Human review: NOT REVIEWED.
- Publication / deployment approval: NOT GRANTED. Nothing was deployed. No likeness, voice, purchase or new external service.
- Known gaps and risks:
  - **Untuned.** A player who mashes the action button clears the ring; the star times, the 8.5 m pounce reach and the floodlight's patience are guesses. A passive player near the ring's edge is knocked out of the ring before a fourth hit can bonk him.
  - Robots, markers and floor signs are simple shapes, not authored models. The climbing pose is two procedural reaches; hands do not find individual holds.
  - The stealth yard's "unnoticed" route depends on waiting for a patrol; the scripted proof waits for a specific moment and a child may need the cue made stronger.
  - Unity transparency, spotlight strength and HUD were written blind.
  - The combat notebook's 43 specified cases remain NOT TESTED; this lab overlaps some in spirit only.
  - Local browser runs are slow enough that fixed real-time waits are fragile; two such waits were replaced by waits on game events in this and the previous change.
- Recovery / rollback: the lab is additive. Removing `arena/`, `src/game/arena/`, the home-page link and the Unity arena files restores the previous behavior; the hero's climb mode is inert in levels with no marked faces. Arena saves use their own key and never touch First Contact, the practice space or Town Drive.
- Remote verification: branch `claude/keen-ritchie-ogadaj`, draft pull request #36.
