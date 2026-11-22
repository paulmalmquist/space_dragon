# November 20 — joining the Dogfight line and the traversal line

This is an administrative record. It changes no owner direction, no rule of play and no verification result.

## What was joined

Two lines of work were open against `main` at `5b86dda` and neither had been merged:

| Line | Branch and review | Last change | Contents |
| --- | --- | --- | --- |
| Dogfight | `feat/dogfight-combat-upgrades`, [PR #35](https://github.com/paulmalmquist/space_dragon/pull/35) | November 1 (`a30a162`) | Oscar spacecraft polish, eight combat stages, independent bank, PlayStation bindings |
| Traversal | `claude/keen-ritchie-ogadaj`, [PR #36](https://github.com/paulmalmquist/space_dragon/pull/36) | November 17 (`fcfebfa`) | Hero traversal, Luke's Playground for Unity, the realistic stand-in, Luke's Arena, the sidekick, the Tunnel Run idea, Dad's armor and weapons |

The owner asked on November 20 to continue the Dogfight line and allowed merging the work in flight. Branch `claude/blissful-fermi-3ir80u` now holds both lines. No source file conflicted. Five records did, because each line had added its entries at the same place: the status, the roadmap, the current milestone, the ledger and the inbox. Both sides were kept in each.

The owner's instruction on PR #35 was to open it for review only, with no merge and no deployment. Joining the lines on a working branch did not merge either one into `main` and deployed nothing.

**Later owner instruction, November 22:** "Can you push all work to main". The joined branch was pushed to `main` that day as a fast-forward from `5b86dda` to `ea1fc65`, with no history rewritten. GitHub then closed PR #35, PR #36 and PR #37 as merged. This replaces the review-only instruction for merging. It is not a deployment and none was made.

## The identifier collision

Both lines allocated SD-089 and SD-090. The Dogfight line did so on November 1. The traversal line did so on November 16 and 17, from `main`, where the ledger still said the next unused number was SD-087.

The earlier allocation keeps its numbers, which follows the [November 1 crosswalk](2026-11-01-combat-controller-identifiers.md). The traversal line's two entries move to the next unused numbers.

| Canonical ID | Meaning | Earlier label |
| --- | --- | --- |
| SD-087 | Polish every facet; hero traversal (November 15) | Unchanged |
| SD-088 | Unity-native Luke's Playground and the realistic stand-in (November 15) | Unchanged |
| SD-089 | [Unity Dogfight PlayStation bindings](2026-11-01-unity-dogfight-playstation-input.md) (November 1) | Unchanged |
| SD-090 | [Eight-stage Dogfight combat upgrades and independent bank](2026-11-01-dogfight-combat-upgrades.md) (November 1) | Unchanged; the Oscar worktree first called it SD-088 |
| SD-091 | [The Tunnel Run](2026-11-17-tunnel-run-and-dads-flight.md) (November 17) | Unchanged |
| SD-092 | [Dad's armor and weapons](2026-11-17-dads-armor-and-weapons.md) (November 17) | Unchanged |
| SD-093 | [Luke's Arena: abilities and stealth](2026-11-16-lukes-arena-abilities-and-stealth.md) (November 16) | Published on the traversal line as SD-089 |
| SD-094 | [Luke's sidekick and the first alley-oop](2026-11-17-lukes-sidekick-and-first-alley-oop.md) (November 17) | Published on the traversal line as SD-090 |

Commit messages on the traversal line from before this change, and the title of PR #36, still say SD-089 for the arena and SD-090 for the sidekick. Read those as SD-093 and SD-094. History was not rewritten. File names did not change, so existing links still work. SD-093 and SD-094 are out of date order in the ledger; the dates in each row are correct.

**Next unused ID at the time of the join: SD-095.** It was allocated the same day to the owner's request to continue the Dogfight line; the [ledger](../project/IDEA_LEDGER.md) holds the current next number.

## One allocation that cannot be checked from here

The November 1 crosswalk says that the original local checkout on the Lenovo (`C:/Projects/space_dragon`) had given SD-087 to a concurrent Luke traversal lab and SD-088 to a filmed Town Drive neighborhood slice. Neither allocation was ever pushed: no branch on GitHub carries them, and `main` at `5b86dda` has no ledger row above SD-086.

On GitHub, SD-087 and SD-088 now mean the November 15 entries in the table above. If the local Town Drive slice or the local Luke lab is pushed later, it needs a fresh number at that time and a line added here. Nothing in that local checkout was read, changed or assumed for this record.

## What this does not establish

- Nothing was run in Unity for this join. The Dogfight line's Unity results were measured on the Lenovo at its own commit; the traversal line's Unity code has never been opened in an Editor. Putting both in one tree has not been tested in Unity.
- The checks run on the joined tree are listed in [the November 20 receipt](../reports/2026-11-20-dogfight-presentation-continuation.md).
