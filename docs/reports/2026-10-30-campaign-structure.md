# Campaign structure and prototype-workflow receipt

**Date:** October 30, 2026. Base: local `986d4de` on `feat/first-contact-playable`. Scope: SD-034–036, preserving the earlier uncommitted SD-027 filing.

## Recorded outcome

- [The canonical campaign](../story/CAMPAIGN_STRUCTURE.md) and [owner decision](../decisions/2026-10-30-campaign-and-mission-party.md) record Earth suit-assisted dragon recovery/assembly, four exploration planets plus final Viera, five missions each, 25 off-Earth slots, and the family moving to Viera. Earth count, first-four names/content and universe assignments remain open/proposed.
- Missions have at most three active family participants, one controlled leader and one mostly autonomous sidekick/button. Optional third-member behavior and control bindings remain open. Gameplay contracts and older-story authority notes prevent five-person gates or extra full planets from overriding this structure.
- [Fresh-chat guidance](../project/FRESH_CHAT.md), AGENTS.md, the unchanged CLAUDE.md import and the story/project indexes route new repo-attached chats to the same instructions without the previous transcript.
- [Seele prototype integration](../engineering/PROTOTYPE_INTEGRATION.md) records several prototypes feeding one shared game, with dragon dogfighting first. Intake guidance is reused from upstream `858e13a`; the local delivery is inventoried without executing or importing it. Raw deliveries remain ignored and separate from this documentation commit.

## Verification

The foundation/link checker and focused slot/ID checks cover the repository structure. A separate agent started without the conversation history, followed AGENTS.md/CLAUDE.md, and correctly recovered the 25-mission route, Viera residence, party rules, open details and idea-intake flow. It flagged four misleading older passages: the six-module canon label, named-world order attributed as confirmed, an on-foot-only party exception and an unlabeled proposed third-member role. Those passages were corrected. This is a fresh-context repository-read check, not a claim that every external assistant automatically has repo access.

Final results: `python tools/check_foundation.py` PASS; focused planning check PASS for five planet rows/25 unique mission slots, all 36 ledger IDs, next SD-037, the shared Claude import and AGENTS.md under 100 lines; diff checks PASS allowing intentional Markdown hard breaks. Scoped ignore checks confirm raw local Seele HTML/project and incoming ZIP paths are ignored, while intake instructions/marker remain trackable. The follow-up independent review found the four issues corrected and no blocking contradiction; its remaining old flight-scheduling gate was explicitly superseded for SD-036.

No runtime/dependency files or private home media are changed; no campaign, party AI, Seele migration, browser behavior or physical-device performance is claimed by these documentation checks. The original planet-composition source remains byte-identical with SHA-256 `55f6339b4f455440682cd7a6f88f36ea05abc861a61a6b832fa4f2915576044f`. Raw prototype deliveries remain local; only intake instructions and planning are published.

## Next work

Use the confirmed structure when filling mission slots and selecting rosters. Inspect the complete first Seele delivery and choose one bounded dragon-dogfight migration experiment, then use build and observed browser/input checks for any runtime change. Narrative order remains Earth-first even when flight is prototyped first.
