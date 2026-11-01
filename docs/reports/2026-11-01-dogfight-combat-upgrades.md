# SD-088 — Unity Dogfight combat verification

**State:** in-progress; not yet verified. Owner-authorized local implementation. No deployment or merge.

## Baseline and scope

Worktree `C:\Projects\space_dragon_oscar_dragon`, branch `feat/dogfight-combat-upgrades`. Baseline commit `901862a` preserves the preceding Oscar spacecraft pass. `7b5a732` reconciles remote main `5b86dda` while retaining both Town Drive and Dogfight records. Only inbox and LFS attributes required additive conflict resolution. Original checkout and other channels remain untouched. No Unity Editor was active at preflight.

Full frozen player: `artifacts/unity/oscar-spacecraft-v002-rollback`. Baseline build-receipt SHA256 `45f647cd193bf4f57a85f91bdb9187299a532084459bc08dc97093179b7696ab`. The earlier pass's 103 EditMode and 11 cases per Chrome backend apply only to that baseline, not this new work.

All eight requested stages, stage flags, default migration, tests, actual browser play, screenshots and performance remain pending. The directional-movement clarification is recorded separately. [Owner source](../../ideas/2026-11-01-dogfight-combat-upgrades-source.md), [decision](../decisions/2026-11-01-dogfight-combat-upgrades.md).

## Failures retained

Initial baseline commit failed because this shell had no configured Git identity; retried successfully with the repository's established `Codex <codex@localhost>` identity supplied per command. No global identity setting changed. The first merge attempt was consequently rejected before modifications; after baseline commit the merge required preserving both appended records in two files.

## Human limits

Difficulty, fun, comfort, sound, sustained performance and release approval: **NOT TESTED / NOT APPROVED**. Automated rule checks cannot establish those qualities.
