# Verification receipt template

Copy to a task-appropriate report path; replace placeholders, not historical receipts. Keep private data out of evidence. A report can be complete while individual checks are NOT TESTED.

## Scope

- Task / milestone / authorization:
- Base and tested commit (or artifact SHA-256 and dirty-tree description):
- Changed paths:
- Environment / tool versions / actual device:

## Checks

| Check or exact command | Result: PASS / FAIL / BLOCKED / NOT TESTED | Evidence and limitation |
| --- | --- | --- |
| Replace with a real check | NOT TESTED | No execution evidence yet |

## Review and release

- Implemented outcome:
- Browser/Blender/device and agent-behavior coverage not performed:
- Human review: NOT REVIEWED unless named evidence exists.
- Publication/deployment approval: NOT GRANTED unless linked to the actual authorization.
- Remaining failures / recovery or rollback:
- Remote verification: branch, commit, changed-file inventory and CI result if a push occurred.

Do not replace observed failures with intended behavior. Keep the user-facing summary to outcome, verification, commit and blockers; details belong here.
