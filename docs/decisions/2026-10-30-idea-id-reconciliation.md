# Decision — Reconcile idea IDs from concurrent branches

**Recorded:** October 30, 2026
**Status:** engineering reconciliation during the authorized latest-repository merge. This changes tracking references, not owner wording, story authority, implementation scope or verification results.

## Why the IDs changed

The navigation branch and incoming `origin/main` independently allocated some of the same IDs. The incoming revision is `d159cd1` (PRs #14, #16 and #17); the local branch was at `a3bef04` before merging. Preserve the established local SD-014–SD-026 entries and reserve SD-027 for the planet-missions/SOS-composition filing preserved before the merge. Give the conflicting incoming entries new IDs so every idea keeps one meaning in the combined ledger.

## Crosswalk

The old-ID column is explicitly namespaced to the incoming source; it is not an alias for the existing local idea with that number.

| Incoming source and old ID | Combined-repository ID | Meaning retained |
| --- | --- | --- |
| `origin/main@d159cd1 / SD-014` | SD-028 | Linear story, large 3D world/set of worlds and three acts, starting on Earth. |
| `origin/main@d159cd1 / SD-015` | SD-029 | Final landing on planet Viera, where everyone is a space traveler. |
| `origin/main@d159cd1 / SD-016` | SD-030 | Suit upgrades progressing into powers by the end. |
| `origin/main@d159cd1 / SD-017` | SD-031 | Between-planet dogfights and asteroid-field navigation. |
| `origin/main@d159cd1 / SD-018` | SD-032 | Proposed Viera/three-act treatment and the authorized writing revision. |
| `origin/main@d159cd1 / SD-027` | SD-033 | Curriculum-aligned number/letter recognition, arithmetic and reading puzzle plan. |
| `PR #15@b4e76bf / SD-020`, referenced by incoming story documents | No local ID allocated | Planet-to-planet SOS composition direction, as attributed by the incoming documents. This is not local SD-020, the home-video idea. |
| `PR #15@b4e76bf / SD-022`, referenced by incoming story documents | No local ID allocated | Instrument voices morphing into synth as powers arrive, as attributed by the incoming documents. This is not local SD-022, the AAA-like game-feel direction. |

The `PR #15` entries are provenance references to a separate concurrent branch, not imported local ledger entries. [PR #15](https://github.com/paulmalmquist/space_dragon/pull/15) is open at head `b4e76bf` on `origin/codex/first-contact-suits-and-story`; its ledger contains those two meanings. The full branch is not included in this merge. Preserve that attribution explicitly and reconcile its IDs when the branch is merged. This decision does not invent source wording or merge PR #15.

## Continuing rules

- The local SD-001–SD-026 meanings remain unchanged. SD-027 is reserved for the preserved planet-missions filing, rather than curriculum.
- Source quotes in [the inbox](../../ideas/INBOX.md) remain intact. Routing receipts, ledger rows and document references use the combined IDs above.
- Confirmed owner directions remain confirmed; treatments, puzzle designs, skill IDs, individual powers and lore retain their proposal/open labels. A tracking repair does not verify gameplay or approve a release.
- The next unused local ID is **SD-034**. Search the combined ledger before allocating it.

Future readers can use this crosswalk to interpret older commits, PR descriptions and receipts without rewriting historical evidence. Update current cross-references by meaning, not by globally replacing every occurrence of a reused number.
