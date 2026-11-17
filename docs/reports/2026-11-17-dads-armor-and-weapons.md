# Dad's armor and weapons — verification receipt

SD-092, November 17, 2026. **Records: written. Placeholder redraw: browser reference IMPLEMENTED / VERIFIED for the named software-rendered checks and inspected by the agent in screenshots; Unity IMPLEMENTED, NOT TESTED. Usable weapons: NOT BUILT.** Not reviewed by a person. Not approved for release. See the [decision](../decisions/2026-11-17-dads-armor-and-weapons.md).

## Scope

- Task / authorization: the owner's November 17 message, verbatim in [the inbox](../../ideas/INBOX.md): Dad's armor is always black with red glowing trim, and his weapons. An explicit owner decision on a palette that was a proposal, and on weapons nobody had drafted.
- Base: `main@5b86dda`; work continues on branch `claude/keen-ritchie-ogadaj` after `b9a0914`, draft PR #36. The commits that carry this receipt are listed on the pull request.
- Changed code: `src/game/arena/sidekick-figure.ts` (materials and extra trim, sword and emitter pieces); `unity/SpaceDragon/Assets/SpaceDragon/Playground/Runtime/ArenaGame.cs` (`BuildSidekick` and one comment); `unity/SpaceDragon/Assets/SpaceDragon/Playground/Editor/LukeArenaScene.cs` (one material: the red plate became a red glowing trim).
- Changed records: the decision, [the inbox](../../ideas/INBOX.md), [the ledger](../project/IDEA_LEDGER.md), [status](../project/STATUS.md), [roadmap](../project/ROADMAP.md), [suit reveals](../story/SUIT_REVEALS_AND_STARTING_ABILITIES.md), the [combat design](../gameplay/COMBAT_SYSTEM.md), the [Blender handoff](../BLENDER_CHARACTER_HANDOFF.md), the [Tunnel Run](../decisions/2026-11-17-tunnel-run-and-dads-flight.md) and [sidekick](../decisions/2026-11-17-lukes-sidekick-and-first-alley-oop.md) records, and the [Unity runbook](../engineering/UNITY_PLAYGROUND_HANDOFF.md).
- **Not changed:** the arena's rules, inputs, saves and tests, the exporter and the generated `LukeArenaData.cs`. No test was added, because nothing a test can observe in the rules changed.
- Environment: Linux cloud container, no GPU, no Unity Editor. Node 24, .NET SDK 8.0.134, Python 3.13. Chromium from the container image through `SPACE_DRAGON_CHROMIUM_PATH` (not the project-pinned build), SwiftShader software rendering at about 3 frames a second.
- Actual device: **none.**

## Checks

| Check or exact command | Result | Evidence and limitation |
| --- | --- | --- |
| `npm run test:unit` | PASS | 333 of 333. The count is unchanged from SD-090. |
| `npm run build` (typecheck, then the four-page production build) | PASS | |
| `npm run unity:playground:verify` | PASS | The arena export reports the same source fingerprint as before this change, `8f462934…`: 16 recorded runs, 50,198 steps, 472 checkpoints. The rules did not move. |
| `npm run unity:playground:compile` | PASS | 0 warnings, 0 errors, against public reference assemblies and stubs. Language-level only: it says nothing about how the figure looks. |
| `npm run unity:playground:coretest` | PASS | 31 of 31 engine-free C# tests. They do not cover the figure. |
| `npx playwright test tests/arena.spec.ts --trace off` | PASS | 10 of 10, run alone after the redraw (9.2 minutes). Real keyboard, development server, software rendering. |
| `npx playwright test --config playwright.production.config.ts --trace off` | PASS | 10 of 10 after the redraw (3.4 minutes). The production build, including a real press of `T` that throws Luke. |
| `python3 tools/check_foundation.py`; `python3 -m unittest discover -s tests -p 'test_*.py'`; `python3 tools/verify_family_references.py` | PASS | Foundation structure and skill mirrors pass; 51 Python tests pass; 18 reference images match their manifest. No reference image was opened for this work. |
| Agent inspection of the arena page at 2560 × 1600: Dad from the front, from behind and from the side | INSPECTED | Black armor, red trim, the sword across his back and the hand emitters are all visible, and no page error was logged in any capture. The first render came out coral, not red (red pixels averaged `#e94f42`): the page's tone mapping pushes a bright red toward orange. The trim was made a purer red at lower strength and now averages `#d32824`. Two more captures were taken at a stun, one frozen on the frame where the game reports the beam showing. Both show the dizzy robot, but Dad is hidden behind the pillar Luke stands on: **the emitter and the beam together were not seen in a still.** |
| Earth, Town Drive and Dogfight browser suites | NOT RUN locally | No file of theirs changed. Hosted CI runs them. |
| Unity Editor: scene generation, how the figure looks, the trim's brightness | NOT TESTED | No Editor in this environment. The trim, sword and emitter pieces were placed by copying the browser figure's measurements; the trim's brightness (2.2) is a guess. |
| A person looking at it or playing with it | NOT TESTED | |
| Hosted CI on the pull request | See the pull request | This receipt does not claim a green hosted run. |

## Review and release

- Implemented outcome: the owner's decision is recorded where it will be looked for, with what is confirmed, proposed and open kept apart. Dad's placeholder in Luke's Arena is black with red glowing trim, with a sheathed katana and a red emitter in each hand, in the browser lab and in the Unity runtime's code.
- Known gaps:
  - **No weapon works.** The sword cannot be drawn. The emitters are lights. The stun is the one that existed before.
  - The sword is a straight stand-in; a katana curves.
  - Red is also the arena's danger color. His ring, arrow and stun beam were left amber for that reason; whether a child still reads him as an enemy is unknown.
  - The figure is a placeholder built from simple shapes. It is not a suit design and not a likeness.
- Human review: NOT REVIEWED.
- Publication / deployment approval: NOT GRANTED. Nothing was deployed.
- Recovery / rollback: revert the commit that changes the three code files to return to the earlier black-and-red figure. The records stand on their own.
- Remote verification: branch, commits and hosted results are on draft PR #36.
