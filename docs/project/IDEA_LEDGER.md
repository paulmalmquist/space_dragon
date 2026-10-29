# Idea ledger

The owner supplies ideas in [the inbox](../../ideas/INBOX.md) or chat. Agents maintain this index. Keep the source wording in the inbox and put the full decision or design in its canonical destination.

**Authority:** CONFIRMED = owner direction or explicitly authorized implementation choice; PROPOSED = suggestion; BOOKMARKED = established future capability; OPEN = unresolved. **Work state:** captured, planned, in-progress, verified, parked. Verification describes evidence for the named task, not completion of the entire idea.

| ID | Idea and source | Authority | Work state | Destination and next action |
| --- | --- | --- | --- | --- |
| SD-001 | Accept unordered ideas and let agents maintain the plan. Owner, October 29. | CONFIRMED | verified | [Inbox](../../ideas/INBOX.md), [workflow](../../AGENTS.md), and these project files exist. Process new thoughts on each invoked session. |
| SD-002 | Rich cinematic browser game, Railway intended for backend. Owner's stated goal, October 29. | CONFIRMED | planned | [Vision](VISION.md). Prove the look with the First Contact slice and record actual-device results before setting budgets. |
| SD-003 | Install useful tools and create the local foundation. Owner, October 29. | CONFIRMED | verified | [Status](STATUS.md) records installations, build, 9 browser checks, media helpers, and limitations. No cloud deployment or final art implied. |
| SD-004 | Babylon/TypeScript, Blender → GLB, browser observation, local saves. Supplied recommendations; engineering choice under SD-003. | CONFIRMED implementation choice | verified | Local runtime, checkpoint, browser observation, and asset tooling verified; [first real GLB asset](../ASSET_PIPELINE.md) remains SD-006. Revisit engine only with concrete integration evidence. |
| SD-005 | First Contact: computer → signal → pod → interaction → checkpoint. Supplied recommendation. | PROPOSED polished milestone; local foundation authorized | in-progress | [Roadmap](ROADMAP.md), [Act I](../story/ACT_I_BUILD_THE_DRAGON.md). Guided placeholder loop is verified; art, animation, camera feel, sound, and owner review remain before calling it polished. |
| SD-006 | One reviewed pilot character and one pod/component through the full asset pipeline. Supplied recommendation. | PROPOSED | planned | [Blender handoff](../BLENDER_CHARACTER_HANDOFF.md). Inspect Blender, preserve source, use the confirmed Lyla anchor, and review before final production. |
| SD-007 | Visual board, short annotated videos, assembly views, photo labels, and sound direction. Supplied recommendations. | PROPOSED | captured | [Roadmap](ROADMAP.md). Accept these inputs incrementally; request only the next input that materially helps a task. |
| SD-008 | Named target devices and initial controls. Unresolved in supplied setup. | OPEN | captured | [Vision](VISION.md). Keep setup playable locally; identify actual player hardware before graphics acceptance claims. |
| SD-009 | Railway authenticated saves and public asset delivery. Supplied recommendation and existing spec. | PROPOSED | parked | [Historical save/API proposal](../space-dragon-spec-v0.1.md). Revisit after local checkpoint and site audit; record backend need, ownership, revision conflicts, and operating budget. |
| SD-010 | Line Leader: one controlled family member, companions follow, smaller groups later. Existing confirmed future direction. | BOOKMARKED | parked | [Act I implementation boundary](../story/ACT_I_BUILD_THE_DRAGON.md). Revisit after the core playable loop and one art pipeline are stable; does not imply multiplayer. |

Next unused ID: **SD-011**. Check the whole file before assigning it; concurrent agents must coordinate ID allocation.
