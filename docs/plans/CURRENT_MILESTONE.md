# Current milestone

**ID:** SD-M1 — First Contact local foundation

**Authorized scope:** the owner's October 29 follow-up selects game CI, pure story state/save v2, the scripted keyboard/speech/help/suit/scan/map slice, and the first pod asset. The earlier SD-M0 covered rules/contracts/skills only.
**Game status:** First Contact IMPLEMENTED with automated browser/state coverage and a technically verified Blender pod. Human audibility/usability, final art, and public deployment are not complete. See [status](../project/STATUS.md) and [the current implementation decision](../decisions/2026-10-29-first-contact-v2.md).

## SD-M0 acceptance

The root guidance routes tasks to relevant documents; the current Act I and photo-publication decision remain authoritative. Three usable skills cover feature building, Blender work and playtesting. Claude mirrors are reproducible. Static checks and their negative tests run without application dependencies. Manual agent-regression scenarios exist and are not misrepresented as executed agent evaluations. Existing story and photo content stays intact.

## SD-M1 — First Contact acceptance

**Status:** local code and automated scenario coverage now include the spoken-help path and five suit introductions. The narrator API/captions are tested; actual audibility and child usability remain a human gate. Host-site integration remains pending. Provisional art is not final art approval.

Player outcome: open the game, see the family at the living-room computer, receive the interrupted signal, investigate the backyard pod, complete one supported interaction, and resume from a saved checkpoint.

| Check | Observable result |
| --- | --- |
| M1-01 | The opening follows Act I; no invented dragon or preselected family origin. |
| M1-02 | A clear action moves from the computer interruption to the backyard arrival. A transition can substitute for free walking. |
| M1-03 | One pod interaction offers replayable spoken instructions and help. Assisted completion progresses the scene. |
| M1-04 | Suit acquisition is introduced without requiring five finished models or five tutorials. |
| M1-05 | Reload resumes at the last completed checkpoint; replay/skip cannot duplicate a reward. |
| M1-06 | Direct navigation to the intended `/space-dragon` route works in the tested integration; the existing homepage is unchanged. |
| M1-07 | The chosen input/device matrix, missing tests and asset limitations are recorded. |

Current technical evidence: M1-01/02 use the script's short form; M1-03 has browser speech/replay, three help levels and an assisted scan; M1-04 has five ordered suit cards; M1-05 has guarded rewards, versioned saves/migration and recovery; M1-07 records **Lenovo 82XM / Chrome / keyboard** with listening/human/GPU limitations. M1-06 is verified only as a local prefixed route, not an integration with the existing website. Use [the ten-minute playtest](../PLAYTEST_FIRST_CONTACT.md) before treating First Contact as a human-reviewed slice or expanding to Mission 1.

## Explicit exclusions

No whole town, all retrieval missions, complete combat/racing systems, full dragon flight, split parties, follower navigation, multiplayer, cloud accounts, telemetry platform, all five finished avatars, or public release of likeness assets. A placeholder is acceptable when labeled; it must not be presented as finished art.

## Before expansion and site integration

The local package/lockfile, browser checks and machine inventory are documented. The actual host website repository and deployment remain unidentified; inspect their routing and existing tests before integration. **Inputs:** keyboard first, with this Lenovo laptop/Chrome selected for the family playtest. An Xbox controller is supported only if it works with no setup, and touch is deferred; see [the decision](../decisions/2026-10-29-keyboard-first-input.md). Actual controller support, AMD performance and human listening remain untested. Do not infer a child's reading level from age. Deployment and paid infrastructure remain separate decisions.

## Next increments, not promises

A single town retrieval and return-home reveal can follow First Contact; expand only after its interaction and save loop works. The old flight-first Launch Day proposal may be a separate technical prototype, not a replacement for the narrative opening.

For every increment, record the request, bounded outcome, exclusions, acceptance checks and evidence. Close it with a receipt before expanding scope.
