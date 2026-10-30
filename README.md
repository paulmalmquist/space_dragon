# Space Dragon

A family of five accidentally receives rescue equipment sent with an SOS. They recover its scattered components around their familiar Florida town, assemble a giant mecha dragon, and choose to answer the call in another universe. Their supportive neighborhood cheers them on; a fictional across-the-street neighbor wants the dragon gone.

**Status:** story foundation, 18 verified character-photo references, an idea workflow, and a local First Contact prototype. The prototype uses placeholder geometry and guided interactions; final art and a deployed game are still ahead.

**Planned game location:** `paulmalmquist.com/space-dragon`. The existing homepage must remain intact. This is a target route, not a claim that the game is live.

## Start here

- **Give us an idea:** say it in chat, paste it into [the idea inbox](ideas/INBOX.md), or use the local notebook. Unfinished thoughts and changes of mind are welcome. Agents keep the plan and technical details organized; [here is how](ideas/README.md).
- **Try it:** double-click **`Start Space Dragon.cmd`** in this folder. It opens the local game and its **Idea notebook** button. Leave the launcher running while you use it. The notebook saves to this repo; ask your agent to process the inbox to turn those thoughts into changes.
- **See where things stand:** [current status](docs/project/STATUS.md), [vision](docs/project/VISION.md), and [roadmap](docs/project/ROADMAP.md).
- **For agents:** read [AGENTS.md](AGENTS.md) before making changes. Track ideas in [the ledger](docs/project/IDEA_LEDGER.md).
- **For setup/art work:** [toolchain](docs/TOOLCHAIN.md), [repo inventory](docs/REPO_INVENTORY.md), [asset pipeline](docs/ASSET_PIPELINE.md), and [local development](docs/DEVELOPMENT.md).
- **Bring in a Seele export:** use [seeles-assets](seeles-assets/README.md). Drop downloads in its local `incoming/` folder; agents inspect them, decide whether importing or refactoring is easier, and continue in the existing asset workflow. Raw downloads are ignored by Git.

The game starts at [http://127.0.0.1:5173/space-dragon/](http://127.0.0.1:5173/space-dragon/). You can also run `npm start` from a terminal.

**PlayStation controller (development input):** connect a PS5 DualSense or PS4 DualShock by USB/Bluetooth, open the local game in Chrome/Edge or another Gamepad API-enabled browser, and press Cross (✕) to wake it for the page. A connection indicator appears in the 3D scene. Cross advances the story; left stick/D-pad pans the static camera, right stick orbits, L2/R2 zoom. Keyboard and mouse still work. This prototype does not yet have character movement, combat or dragon flight. Xbox/other pads with the browser's standard mapping can use the same input adapter. Real PlayStation hardware has **NOT TESTED** status; [input decision and validation plan](docs/decisions/2026-10-30-playstation-controller.md) details scope and limitations. Ideas added to the notebook are saved locally for the next agent session; no agent runs automatically. No technical template is required.

## Story and references

- [Railway Game Support context](docs/context/RAILWAY_GAME_SUPPORT.md) — consolidated decisions, source map, reading-game goals, photo references, and remaining work from the planning chat.
- [Family photo references](assets/reference/family/README.md) — 18 verified photos, a local gallery, and the reference manifest for Blender character design.

- [Prologue & Act I — Build the Dragon](docs/story/ACT_I_BUILD_THE_DRAGON.md) — current origin and opening-story baseline, scene treatment, proposed town retrievals, and the transition to answering the SOS. This takes precedence over conflicting opening assumptions in the initial specification.
- [Game & Technical Specification v0.1](docs/space-dragon-spec-v0.1.md) — the complete content of the initial 14-page Word specification, converted to Markdown for review and version control. Retained as the historical baseline; read the Act I update first for current story direction.
- [Implementation handoff](docs/IMPLEMENTATION_HANDOFF.md) — reading order, confirmed requirements, scope boundaries, and the evidence needed before building.
- [Blender/MCP character handoff](docs/BLENDER_CHARACTER_HANDOFF.md) — character-reference workflow, suit design, and the separately documented photo-transfer status.

## AI-assisted development

Start with [AGENTS.md](AGENTS.md), then load only the contract for the task. [CLAUDE.md](CLAUDE.md) imports the same rules; it is not a second policy.

- [Current milestone](docs/plans/CURRENT_MILESTONE.md): verified local foundation and the remaining First Contact quality work.
- [Architecture](docs/engineering/ARCHITECTURE.md), [interactions](docs/gameplay/INTERACTION_CONTRACTS.md), and [learning rules](docs/learning/LEARNING_RULES.md): implementation boundaries and remaining integration requirements.
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

The October 29 setup request authorizes the local foundation described in [the implementation decision](docs/decisions/2026-10-29-local-foundation.md). It starts with the computer, signal, backyard pod, one guided interaction, and a local checkpoint. Website integration remains pending identification of the actual host source and deployment. The broader Act I town retrieval and return-home payoff remain later work.

Uploading documentation does not start implementation or deployment. Preserve confirmed, proposed, bookmarked, and open decision labels.

## Public repository and source assets

Public documentation alone does not authorize publishing family photos, likeness assets, voices, private addresses, precise school details, identifying neighbor details, or credentials. The supplied 18-photo collection is now imported under `assets/reference/family/`; its narrow publication approval and import receipt are recorded in [the publication decision](docs/decisions/2026-10-28-family-photo-references.md). The Blender handoff describes how to use these references. Use fictionalized school and workplace environments.

## Document provenance

The full specification was imported from `Space_Dragon_Spec_v0_1.docx`, dated October 28, 2026. Its prose, tables, and source links are preserved in the Markdown edition. The original Word file remains in the originating planning conversation; the binary DOCX is not included in the original import.

The specification describes the evidence available when it was written. The original repository inspection established only that `main` contained a starter README; it did not audit the existing website, Vercel, Railway, devices, or assets. The later Act I narrative is a separate document rather than a silent rewrite of that historical specification.
