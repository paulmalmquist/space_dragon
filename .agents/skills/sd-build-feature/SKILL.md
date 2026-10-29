---
name: sd-build-feature
description: Implement a bounded Space Dragon feature or bug fix with state, input, save and test coverage. Use for authorized gameplay or app changes, not story-only brainstorming, whole-roadmap builds or deployment.
---

# Build one playable increment

Paths below are repository-relative. Read `AGENTS.md` and `docs/plans/CURRENT_MILESTONE.md`; load only contracts relevant to the request.

## Inputs and preflight

Identify the requested player-visible outcome, acceptance checks and exclusions. Inspect actual source, lockfiles, commands, current branch and existing edits. Do not infer an application from design docs. If the runtime is missing, implement a scaffold only when the task authorizes it; otherwise report that gap and finish independent work.

## Procedure

1. Choose the smallest reversible change that produces the requested behavior. Preserve current Act I authority and open decisions. State assumptions without reopening settled choices.
2. Identify authoritative state, semantic input, presentation and save boundaries. Use stable IDs; guard unique rewards against repeated events. Keep learner, avatar and action-assistance independent.
3. Add a failing regression test where feasible. For new interactions, cover success, help/failure, repeated trigger, interruption and reload at the relevant checkpoint.
4. Implement with existing conventions. Do not introduce a general engine, server, paid service or full-town system to solve a local task. Leave future systems as boundaries, not speculative implementations.
5. Run relevant logic/build checks and the foundation checks when their files change. Exercise the actual interaction using `sd-playtest`; compilation alone is insufficient. When a required tool/device is unavailable, mark that coverage NOT TESTED.
6. Review the diff for unrelated edits, secrets, reference-photo packaging and unsupported success claims. Update the milestone and affected contracts only where behavior or evidence changed.
7. Commit/push only within the requested repository operation; re-read the remote head and reconcile concurrent edits. Never overwrite someone else's work to clear a conflict.

## Output

Use `docs/templates/VERIFICATION_RECEIPT.md` for exact commands, results, tested artifact, remaining gaps and recovery. Tell the user what changed, what was verified and what is blocked. Do not claim a release or human approval from implementation completion.

## Stop conditions

Stop only the affected action for unapproved publication, production deployment, paid services, conflicting canon or missing access. A reversible placeholder or an untested status is preferable to silently inventing a decision or result.
