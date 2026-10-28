# Space Dragon

A family of five accidentally receives rescue equipment sent with an SOS. They recover its scattered components around their familiar Florida town, assemble a giant mecha dragon, and choose to answer the call in another universe. Their supportive neighborhood cheers them on; a fictional across-the-street neighbor wants the dragon gone.

**Status:** concept, specification, and verified character-photo references. No playable game or deployment is supplied.

**Planned game location:** `paulmalmquist.com/space-dragon`. The existing homepage must remain intact. This is a target route, not a claim that the game is live.

## Start here

- [Railway Game Support context](docs/context/RAILWAY_GAME_SUPPORT.md) — consolidated decisions, source map, reading-game goals, photo references, and remaining work from the planning chat.
- [Family photo references](assets/reference/family/README.md) — 18 verified photos, a local gallery, and the reference manifest for Blender character design.

- [Prologue & Act I — Build the Dragon](docs/story/ACT_I_BUILD_THE_DRAGON.md) — current origin and opening-story baseline, scene treatment, proposed town retrievals, and the transition to answering the SOS. This takes precedence over conflicting opening assumptions in the initial specification.
- [Game & Technical Specification v0.1](docs/space-dragon-spec-v0.1.md) — the complete content of the initial 14-page Word specification, converted to Markdown for review and version control. Retained as the historical baseline; read the Act I update first for current story direction.
- [Implementation handoff](docs/IMPLEMENTATION_HANDOFF.md) — reading order, confirmed requirements, scope boundaries, and the evidence needed before building.
- [Blender/MCP character handoff](docs/BLENDER_CHARACTER_HANDOFF.md) — character-reference workflow, suit design, and the separately documented photo-transfer status.

## AI-assisted development

Start with [AGENTS.md](AGENTS.md), then load only the contract for the task. [CLAUDE.md](CLAUDE.md) imports the same rules; it is not a second policy.

- [Current milestone](docs/plans/CURRENT_MILESTONE.md): authorized foundation scope and the proposed First Contact playable increment.
- [Architecture](docs/engineering/ARCHITECTURE.md), [interactions](docs/gameplay/INTERACTION_CONTRACTS.md), and [learning rules](docs/learning/LEARNING_RULES.md): implementation boundaries without inventing an existing runtime.
- [Quality gates](docs/engineering/QUALITY_GATES.md) and [receipt template](docs/templates/VERIFICATION_RECEIPT.md): exact checks, honest status and review/release separation.

Three canonical skills live in `.agents/skills/`, with generated Claude mirrors: `sd-build-feature`, `sd-blender-asset`, and `sd-playtest`. No assistant permissions or MCP configuration are changed.

```sh
python3 tools/check_foundation.py
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 tools/verify_family_references.py
```

After changing a canonical skill, run `python3 tools/check_foundation.py --sync-skills`. Python 3.10+ is sufficient; Windows users can use `python` or `py -3`. [Foundation CI](.github/workflows/foundation.yml) runs these checks without deployment. [Policy regression cases](tests/agent_policy_cases.json) require separate real-agent evaluation; validating their structure is not proof that an assistant passed them.

## The family

| Character | Established suit or specialty |
| --- | --- |
| Paul | Iron Man-inspired armor |
| Luke | Iron Spider-inspired suit |
| Maria | Healer; purple suit |
| Luna | Pink suit; goo that makes enemies slip |
| Lyla | Gathering and storing information; suit color still open |

The first backyard arrival supplies the suits. Detailed powers, additional colors, working villain names, and exact mission mechanics remain proposals unless explicitly approved.

## The experience

**Prologue / Act I:** begin at the living-room computer, discover the backyard arrival, acquire the suits, retrieve components around town, reconstruct the SOS, and assemble the dragon. Earth was the closest planet in range; the equipment was sent deliberately but reached this family accidentally. The family did not invent the dragon and was not selected in advance.

**Act II direction:** choose to answer the SOS and travel to its source in another universe. The sender, emergency, and crossing mechanics remain open. Light-speed exploration remains part of the wider game, not an explanation by itself for crossing universes.

Town adventures mix supported early-learning interactions, exploration, racing, and playful combat. Florida-themed antagonists include iguanas and alligators, with other enemy ideas reserved for later missions.

The bookmarked **Line Leader** system allows the family to leave the dragon together or in smaller groups. The player controls one person at a time; everyone else in that party follows automatically. This is a future single-player party mechanic, not an approved multiplayer feature.

## Delivery planning

Story chronology and implementation order are separate. The original specification's flight-first **Launch Day** loop is not the current story opening. It can still serve as a separately labeled technical prototype.

Before building, audit the existing website and deployment. Then agree on the smallest playable milestone. The Act I document proposes a living-room/backyard sequence, one town retrieval, and a return-home payoff as a possible story-first prototype. It does not authorize implementing a whole town, all missions, full walking, or split parties now.

Uploading documentation does not start implementation or deployment. Preserve confirmed, proposed, bookmarked, and open decision labels.

## Public repository and source assets

Public documentation alone does not authorize publishing family photos, likeness assets, voices, private addresses, precise school details, identifying neighbor details, or credentials. The supplied 18-photo collection is now imported under `assets/reference/family/`; its narrow publication approval and import receipt are recorded in [the publication decision](docs/decisions/2026-10-28-family-photo-references.md). The Blender handoff describes how to use these references. Use fictionalized school and workplace environments.

## Document provenance

The full specification was imported from `Space_Dragon_Spec_v0_1.docx`, dated October 28, 2026. Its prose, tables, and source links are preserved in the Markdown edition. The original Word file remains in the originating planning conversation; the binary DOCX is not included in the original import.

The specification describes the evidence available when it was written. The original repository inspection established only that `main` contained a starter README; it did not audit the existing website, Vercel, Railway, devices, or assets. The later Act I narrative is a separate document rather than a silent rewrite of that historical specification.
