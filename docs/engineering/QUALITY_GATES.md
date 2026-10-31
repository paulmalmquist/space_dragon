# Quality gates and evidence

## Four distinct statuses

| Status | Required evidence |
| --- | --- |
| IMPLEMENTED | Relevant code/content or asset exists and is reviewable. |
| VERIFIED | Named checks ran against a commit/artifact with recorded results. Scope is explicit. |
| REVIEWED | A human evaluated the applicable likeness, readability, tone or usability concerns. |
| APPROVED FOR RELEASE | The owner authorized the intended publication/deployment scope and release gates passed. |

These are not synonyms. A mesh file is not a rigged character; compilation is not playtesting; static instruction checks do not prove an assistant follows them.

## Checks available in this foundation

Run from the repository root with Python 3.10+:

```sh
python3 tools/check_foundation.py
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 tools/verify_family_references.py
```

The first check validates required documents, local inline Markdown link targets, supported skill metadata, byte-identical Claude mirrors, the single shared instruction import and policy-case structure. It does not validate external URLs or heading anchors, execute policy prompts, audit arbitrary prose, or test the game. The unit suite deliberately breaks inputs to test the checker. The existing photo verifier checks its manifest/inventory; do not describe it as a likeness or runtime-publication check.

`.github/workflows/foundation.yml` retains these checks and adds a separate Node 24 game job: exact npm install, pure TypeScript state/save tests, build, Chromium interaction tests, and production-artifact tests. The game checkout fetches LFS models; failure traces/screenshots exclude the fixture inbox. Both jobs have read-only repository permissions, no deployment step, no commit writes and no secrets. Workflow configuration is not proof a run passed; read the actual run result.

Locally, `npm run check` runs unit tests, build, development browser checks, production browser checks, and the photo verifier. Browser speech mocks establish calls/captions/error recovery, not audible output or a human suitability review. See [the ten-minute keyboard playtest](../PLAYTEST_FIRST_CONTACT.md).

## Skill authoring and discovery

Edit `.agents/skills/<name>/SKILL.md`, then run:

```sh
python3 tools/check_foundation.py --sync-skills
```

Only the three registered `sd-*` skills are managed; unrelated user skills are untouched. Mirrors use normal files for Windows portability, not symlinks. Keep skill frontmatter to the supported single-line `name` and `description` fields. Supporting files are not part of this first sync implementation: link shared repository documents instead. Extend and test the sync tool before adding such files.

`CLAUDE.md` imports root `AGENTS.md`. The canonical skills are discoverable by Codex, with generated equivalents for Claude Code. No MCP configuration, credentials, permissions or paid agent executions are added. Host-level discovery/invocation must still be smoke-tested in the actual installed clients.

## Behavioral regression cases: manual, not a passing CI badge

[Policy cases](../../tests/agent_policy_cases.json) contain synthetic test requests and expected/rejected behaviors. They are fixtures, not live instructions. In a disposable worktree, test them in the actual assistant, with no production credentials and no paid/external tools enabled. Record assistant/version, case IDs, observed response/diff and result using the [receipt](../templates/VERIFICATION_RECEIPT.md).

Cases test canon, open decisions, publication boundaries, honest test reporting, milestone limits, assisted learning, shared Blender ownership and preserving existing edits. The automated validator checks fixture structure only. Unexecuted agent cases remain NOT TESTED.

## Gates for later implementation

[The integration test plan](INTEGRATION_TEST_PLAN.md) (SD-039) maps current evidence and proposed missing coverage across features. It distinguishes isolated correctness, connected-journey behavior and human experience, and supplies prioritized transition/failure scenarios. Its planned cases are not passing tests or approval to implement the entire campaign. Keep existing evidence statuses below and link executed results to an identified artifact.

| Change | Evidence before VERIFIED |
| --- | --- |
| Gameplay | Logic tests plus an observed input-to-result playthrough; reload/retry/skip paths checked. |
| Learning | Correct/wrong/help/skip/interruption and observation tests; adult review remains separate. |
| Art | Recoverable source, review renders, export metrics and load/animation check in the real runtime. |
| Saves | Validation, reload, failure handling and version/migration coverage. |
| Site integration | Direct route load, navigation, correct asset paths and unchanged homepage. |
| Runtime assets | Explicit approved manifest, output inspection and no reference-board/source-photo packaging. |
| Performance | Named hardware, browser, scenario and measured values; no inferred device pass from viewport emulation. |

Use keyboard, touch and real device coverage only when tested. A screenshot does not verify controls, sound, collision or saving. Failed or unavailable checks are FAIL/BLOCKED/NOT TESTED, never silently PASS. Keep personal data out of screenshots and logs.

## Receipt and change review

Use [the template](../templates/VERIFICATION_RECEIPT.md). Include base/changed commit or artifact hashes, changed paths, exact commands, results, skipped checks and approval boundaries. Review the diff for unrelated changes and secrets. Stage only intended paths, reconcile a moved remote head, and never force-push to manufacture success.

## Authoring references

Discovery/import conventions checked against primary documentation on 2026-10-28; this is documentation verification, not a client execution test:
- [Codex project guidance](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Codex skills](https://learn.chatgpt.com/docs/build-skills)
- [Claude Code memory imports](https://code.claude.com/docs/en/memory)
- [Claude Code skills](https://code.claude.com/docs/en/skills)
