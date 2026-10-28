# Interaction contracts

**Status:** implementation rules for authorized features; not a claim that these systems exist. Current story authority is [Act I](../story/ACT_I_BUILD_THE_DRAGON.md).

## Common interaction lifecycle

A detectable target offers one clear action. Validate prerequisites, accept a semantic action, update game state once, present feedback, and create a checkpoint at the documented boundary. Repeated taps during feedback must not repeat rewards or queue an unbounded action backlog. Cancel, skip, retry and interruption behavior must be defined for each interaction.

| Interaction | Required behavior |
| --- | --- |
| Component recovery | Award the stable component ID once; leaving/re-entering and reloading preserve it. |
| Installation at home | Require the recovered component; install once; a replayed cinematic never consumes or awards it again. |
| Ability use | Validate the current state and show an understandable result; opening the menu or switching avatar cannot bypass cooldown/state guards. |
| Learning checkpoint | Give help and an assisted completion path. Required progress never depends on independent correctness. |
| Race | Clearly signal start/finish; recover from leaving the route. Steering assistance is independent of learning level. |
| Combat | Use readable warnings and forgiving recovery; disable, capture or retreat rather than graphic family injury. |
| Scene transition | Define checkpoint, load failure recovery and input ownership; no duplicate listeners or hidden active controls. |
| Pause/resume | Stop relevant simulation/timers, release held inputs and restore control without unintended movement. |

## Cinematics are not the database

A skip must resolve to the same intended story state as normal completion. A replay presents a past event without creating fresh rewards. An interrupted cinematic resumes or restarts safely from an explicit checkpoint. Define the checkpoint boundary before implementing the animation.

## Avatar, learner and party

The active learner determines educational scaffolding. The selected avatar determines suit presentation and available abilities. Action assistance controls steering, timing and defensive help. These are independent settings; neither avatar swaps nor family turns should overwrite another child's observations.

Use contextual companion assists where they simplify the current scene. Reserve stable party IDs, but do not build Line Leader navigation or split parties without an authorized milestone. When introduced, the mechanic controls exactly one leader in the active party; automatic companions are not network players. Later follower failures need a recover/regroup option rather than a permanent mission lock.

## Child-facing feedback

Use one immediate instruction, a visible objective, optional repeated audio and clear success feedback. Never make reading simultaneous with fast steering necessary for progress. Color is not the only cue. Recovery should not erase earned parts or shame a child. No sibling rankings, purchases, chat or timers attached to required learning locks.

## Minimum behavior tests when implemented

- Recover, reload, and return: inventory and checkpoint agree.
- Double-trigger a pickup or replay a cutscene: exactly one award.
- Skip and interrupt installation: no missing or duplicated component.
- Use all hints: story advances; learning observation records assistance.
- Switch avatar: learner-local ID and observations are unchanged.
- Lose focus, pause and resume: no stuck input or surprise time penalty.
- Fail a scene load or fall out of bounds: return/retry is available.

These are acceptance scenarios. They are not implemented tests until a runtime exists and the checks are executed against it.
