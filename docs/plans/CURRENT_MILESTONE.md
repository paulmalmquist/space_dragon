# Current milestone

**ID:** SD-M1 — First Contact local foundation

**Authorized scope:** the owner's October 29 setup request now includes idea intake, useful tools and a small local runtime. The earlier SD-M0 covered rules/contracts/skills only; it did not authorize gameplay by itself.
**Game status:** guided placeholder prototype IMPLEMENTED and browser-verified. A polished SD-M1, reviewed art, and public deployment are not complete. See [status](../project/STATUS.md) and [the implementation decision](../decisions/2026-10-29-local-foundation.md).

## SD-M0 acceptance

The root guidance routes tasks to relevant documents; the current Act I and photo-publication decision remain authoritative. Three usable skills cover feature building, Blender work and playtesting. Claude mirrors are reproducible. Static checks and their negative tests run without application dependencies. Manual agent-regression scenarios exist and are not misrepresented as executed agent evaluations. Existing story and photo content stays intact.

## SD-M1 — First Contact acceptance

**Status:** local foundation authorized and verified within its bounded scope. The acceptance checks below still describe the fuller polished slice: speech audibility on the player’s device, host-site integration and human play review remain pending. The current increment implements local speech replay/fallback, supported scanning and suit introductions. A prototype pass is not completion of every M1 check.

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

## Explicit exclusions

No whole town, all retrieval missions, complete combat/racing systems, full dragon flight, split parties, follower navigation, multiplayer, cloud accounts, telemetry platform, all five finished avatars, or public release of likeness assets. A placeholder is acceptable when labeled; it must not be presented as finished art.

## Before expansion and site integration

The local package/lockfile, browser checks and machine inventory are now documented. The actual host website repository and deployment remain unidentified; inspect their routing and existing tests before integration. **Inputs (owner decision, 2026-10-29):** keyboard first. An Xbox controller is supported only if it works with no setup, and touch is deferred; see [the decision](../decisions/2026-10-29-keyboard-first-input.md). Still to select: the actual player computer/browser. Do not infer a child's reading level from age. Further work can use authorized reversible placeholders; deployment and paid infrastructure remain separate decisions.

## Next increments, not promises

A single town retrieval and return-home reveal can follow First Contact; expand only after its interaction and save loop works. The old flight-first Launch Day proposal may be a separate technical prototype, not a replacement for the narrative opening.

For every increment, record the request, bounded outcome, exclusions, acceptance checks and evidence. Close it with a receipt before expanding scope.


## SD-019 — suits and the first-mission handoff

**Status:** IMPLEMENTED and VERIFIED for the bounded scope; see the receipt for browser/version and untested device/audio limitations.

**Authorization:** owner, October 29: “Continue coding based on the recent updates to the story”.
**Bounded outcome:** extend the existing pod endpoint through brief contextual suit demonstrations, a supported Lyla scan, and the saved town-map briefing. No playable town mission, later power tree or planet selection is added.

Acceptance: all five suits arrive together; each contribution changes the visible scene; skip preserves suits; direct/helped scans earn the same unique archive card; help survives reload without becoming an independent result; v1 saves migrate; pause/replay/repeated input cannot advance hidden work; all story actions work on keyboard; unavailable audio/storage/renderer retain the story fallback. Runtime props and colors remain placeholders.

The proposed town route is a briefing, with Space Blocks clearly marked as the next unbuilt chapter. The broader linear three-act/Viera direction and source-grounded cast/SOS proposals are reconciled in [recent story integration](../story/RECENT_STORY_INTEGRATION.md). Verification is recorded in the [increment receipt](../reports/2026-10-29-first-contact-suits.md).
