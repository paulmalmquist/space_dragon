# Space Dragon — Implementation Handoff

**Initial planning baseline:** [Game & Technical Specification v0.1](space-dragon-spec-v0.1.md), October 28, 2026.

**Current narrative baseline:** [Prologue & Act I — Build the Dragon](story/ACT_I_BUILD_THE_DRAGON.md), October 28, 2026. This supersedes conflicting origin and opening-sequence assumptions in the initial specification. The dragon is pre-designed rescue equipment sent with an SOS, not the family's invention. The first backyard arrival supplies the suits; the family recovers other components around town and combines them to construct the dragon. Earth was the closest planet in range, and this family received the equipment accidentally. The completed message leads to a choice to help in another universe.

**Current handoff update — October 29, 2026:** the owner has now authorized useful tool installation, unordered idea intake, and a local development foundation. Start with [AGENTS.md](../AGENTS.md) and [current project status](project/STATUS.md). A Babylon/TypeScript guided prototype, local checkpoints, development idea notebook, asset helpers, and browser checks are now supplied; see [the implementation decision](decisions/2026-10-29-local-foundation.md). Final character assets, site integration, backend services, and deployment remain pending. Earlier authorization/status language below records the original documentation task and does not block the owner's later local-setup request.

**Original starting status:** planning documents and 18 verified character-photo references were available, with no application runtime or deployment supplied. The [context index](context/RAILWAY_GAME_SUPPORT.md) and [reference collection](../assets/reference/family/README.md) preserve that foundation.

## Read before implementation

Read the Act I narrative first for current story direction and its explicit confirmed/proposed/open distinctions. Then read the complete initial specification: section 1 for the earlier canon baseline, sections 4–6 for suit and Line Leader design, section 7 for the historical first-playable proposal, section 8 for likeness/privacy requirements, and sections 9–13 for engineering, acceptance, delivery, and open decisions.

For character work, also read [BLENDER_CHARACTER_HANDOFF.md](BLENDER_CHARACTER_HANDOFF.md). Its photo-publication decision and transfer status are separate from narrative approval.

Preserve the distinction between **CONFIRMED**, **PROPOSED**, **BOOKMARKED**, and **OPEN**. Do not turn assistant suggestions into approved canon or move bookmarked features into the first release without a recorded decision.

## Established requirements to preserve

- The crew is Paul, Maria, Luke, Luna, and Lyla, exploring in a mecha dragon capable of light-speed travel. The new narrative begins before the dragon is assembled.
- The living-room computer, backyard crash, suit acquisition, scattered town components, and SOS are the opening-story foundation. The dragon follows an existing design; the family is not preselected or secretly its original designer.
- The intended destination is another universe, connected to an SOS from another galaxy. The precise geography and crossing mechanism remain open; do not explain this as ordinary light-speed travel alone.
- The planned route is `/space-dragon` on the existing site; do not replace the homepage.
- Paul has Iron Man-inspired armor; Luke has Iron Spider-inspired armor. Maria is the healer in purple. Luna wears pink and sprays slippery goo. Lyla gathers and stores information; her color remains open.
- The neighborhood supports the dragon except for the fictionalized antagonist inspired by the across-the-street neighbor. Her schemes involve Florida-themed antagonists, including iguanas and alligators.
- Learning, racing, and playful combat coexist. Supported completion of a learning challenge must not block a child from receiving a suit or a required story component. Detailed challenge mechanics remain proposals.
- Future expeditions use the **Line Leader**: one directly controlled person, automatic followers, and eventually smaller groups. Networked multiplayer is not implied.
- Recognizable family likenesses are a creative goal. The 18 supplied photo references, manifest, gallery, and verification tool are now imported. The Blender handoff explains their use; no final character assets have been approved.

## First implementation task, when authorized

Establish what actually exists before choosing or changing the architecture. Inspect the relevant website repository and document its framework, versions, route ownership, deployment configuration, assets, saves, tests, and integration constraints. Inspect Railway only if the approved task requires backend work; do not infer current services, capacity, costs, or connections from this specification.

Report findings as **verified**, **proposed**, or **unverified**, with file paths, configuration evidence, or reproducible checks. Keep secrets out of the report and out of source control.

Then propose the smallest rendering/control prototype on an agreed device. Use placeholders if likeness references or final art are missing. Do not purchase services, increase hosting capacity, or publish family assets merely because the concept is ambitious.

## Scope boundary

The initial specification proposed a flight-first Launch Day loop: a compact home scene, guided departure, one jump, one playable space region, three discoveries, one enemy archetype, return, one upgrade, and reliable local saving. **That is now a historical technical-prototype option, not the canonical opening of the story.**

The current narrative starts with building the dragon. A possible story-first prototype is the living-room opening, backyard encounter, brief suit reveals, one town recovery mission, a persistent recovered-component state, and a return-home revelation. Select the implementation milestone explicitly; this document does not authorize either prototype to be built now.

Writing the full Act I does not automatically approve a complete town, six missions, five fully modeled family avatars, walking, follower navigation, split parties, cloud saves, multiplayer, or a larger universe for the first build. Reserve stable content IDs and extensible state without building the entire future game.

## Evidence required before declaring a release ready

Use acceptance checks A01–A08 in the initial specification where applicable. If the chosen prototype changes to Act I, extend the acceptance plan to cover its actual scope before claiming release readiness. Record the build or commit tested, device and browser, test procedure, result, and unresolved failures. Preserve the homepage, validate refresh-safe saves and recovery, and test real keyboard and touch interaction on the chosen devices.

Performance values in the specification are provisional goals, not existing benchmark results. Do not claim that a feature works, a service is connected, or a test passed without evidence.

## Privacy and publication boundary

The repository is public. Keep source family photos, voice recordings, original likeness references, precise home or school details, real neighbor identification, and credentials out of commits unless a specific publication decision authorizes them. The [publication decision](decisions/2026-10-28-family-photo-references.md) records the owner's narrow exception and completed import of the supplied 18-photo collection. It does not authorize other media. Use a fictional villain name and fictionalized school and workplace environments. A public code/documentation repository is not permission to publish the family-likeness game.

## Original import receipt

- Source document: `Space_Dragon_Spec_v0_1.docx`.
- Source document SHA-256: `5d412824a5ebf65596a5b143fd4a71e1d338c84564f8ecdfb4f050a3764f2510`.
- GitHub specification: `docs/space-dragon-spec-v0.1.md`.
- Markdown Git blob SHA-1: `0cb759c6fef55f60d440861c23e7f095acd2b049`.
- Original import verification: all extracted document paragraph text, table content, and external source links were retained; the uploaded Markdown blob matched the locally generated file.
- Pre-import repository state: `main` at `63d41071585efea61ed2436fa550605fd90f3bdb`, containing only `README.md`.

The Word file itself was not included in the original commit. The complete specification content is stored as Markdown for readable diffs and subsequent editing. The original Word document remains available in the planning conversation.

The later Act I treatment is stored separately at `docs/story/ACT_I_BUILD_THE_DRAGON.md`. This handoff and the README now point to it so the historical Launch Day proposal is not mistaken for the current opening story.
