# Seele intake and migration guidance

## Scope

- **Request:** SD-028, recorded with the owner's original wording in [the inbox](../../ideas/INBOX.md): create a Seele intake folder and consider early refactoring around more refined environments/assets when easier.
- **Base:** `d159cd1e4ff7250123107629574c4ac473688a36` on `main`.
- **Candidate:** documentation and scoped ignore rules only. New `seeles-assets/README.md`, `.gitignore`, and `incoming/.gitkeep`; routing updates in the root guidance, asset/architecture/vision documents, inbox, ledger, roadmap, and status; this receipt. No runtime, dependency, existing skill, media, or deployment files changed.
- **Environment:** Linux scratch workspace with a UTF-8 repository snapshot retrieved through the connected GitHub tool. The 18 existing reference JPEGs were not copied locally or changed. Shell Git cloning was unavailable, so publication uses the connected GitHub API with a checked base and non-forced ref update.

## Checks

| Check | Result | Evidence and limitation |
| --- | --- | --- |
| `python3 tools/check_foundation.py` | PASS | Guidance structure, local links covered by the checker, and unchanged skill mirrors. Does not evaluate agent behavior or gameplay. |
| `python3 -m unittest discover -s tests -p 'test_*.py' -v` | PASS | 41 existing foundation/combat-note checks; no new test implementation added. |
| Local-link and whitespace review of changed Markdown | PASS | Checked with the existing `link_errors` helper and trailing-whitespace inspection. Root agent rules remain below 100 lines. |
| Scoped Git-ignore behavior | PASS | Nine paths checked with Git in an isolated temporary repository: README, ignore rules, and marker stay trackable; root/nested/raw export and credential examples are ignored; the existing game-asset destination is unaffected. No real download or credential was used. |
| Independent instruction review | REVIEWED | No blocking issue; clarified that review uses the selected runtime, currently Babylon. The first migration decision allows import, scene replacement, or broader refactoring without making Babylon permanent. |
| Runtime/browser/Blender/device checks | NOT TESTED | No export supplied or runtime changed. This work establishes no asset quality, game behavior, or performance result. |
| Local photo checksum verification | NOT TESTED | Original JPEGs were omitted from the text snapshot and are untouched in the GitHub base tree. The existing CI workflow verifies their inventory on the complete repository. |

## Review and release

The intake folder and agent procedure are implemented. Raw downloads stay local until reviewed; agents maintain technical receipts and choose a migration approach after inspecting actual files. The owner need not fill in a technical form. A cloud agent will need the export attached or otherwise transferred because ignored files do not travel through Git.

The requested repository guidance is the publication scope. Human acceptance of a generated asset, public release of new media, production deployment, and a particular engine migration are not established by this change. There is no Blender connection or asset import to report.

The commit containing this report identifies the published candidate; its changed-file inventory and GitHub Actions run provide the remote verification. The next useful action is a real export, a local run, and one further agent edit outside Seele. Reverting this documentation commit removes the new intake process without changing existing game behavior.
