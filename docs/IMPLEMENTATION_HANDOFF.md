# Space Dragon — Implementation Handoff

**Planning baseline:** [Game & Technical Specification v0.1](space-dragon-spec-v0.1.md), October 28, 2026.

**Current handoff status:** documentation only. No application code, assets, infrastructure changes, deployment, or gameplay test results are supplied by this import.

## Read before implementation

Read the complete specification. In particular, use section 1 for confirmed canon, sections 4–6 for suit and Line Leader design, section 7 for proposed first-playable scope, section 8 for likeness/privacy requirements, and sections 9–13 for engineering, acceptance, delivery, and open decisions.

Preserve the distinction between **CONFIRMED**, **PROPOSED**, **BOOKMARKED**, and **OPEN**. Do not turn assistant suggestions into approved canon or move bookmarked features into the first release without a recorded decision.

## Established requirements to preserve

- The crew is Paul, Maria, Luke, Luna, and Lyla, exploring the universe in a mecha dragon capable of light-speed travel.
- The planned route is `/space-dragon` on the existing site; do not replace the homepage.
- Paul has Iron Man-inspired armor; Luke has Iron Spider-inspired armor. Maria is the healer in purple. Luna wears pink and sprays slippery goo. Lyla gathers and stores information; her color remains open.
- The neighborhood supports the dragon except for the fictionalized antagonist inspired by the across-the-street neighbor. Her schemes involve Florida-themed antagonists, including iguanas and alligators.
- Future expeditions use the **Line Leader**: one directly controlled person, automatic followers, and eventually smaller groups. Networked multiplayer is not implied.
- Recognizable family likenesses are a creative goal; source photos and approved final character assets have not been provided in this handoff.

## First implementation task, when authorized

Establish what actually exists before choosing or changing the architecture. Inspect the relevant website repository and document its framework, versions, route ownership, deployment configuration, assets, saves, tests, and integration constraints. Inspect Railway only if the approved task requires backend work; do not infer current services, capacity, costs, or connections from this specification.

Report findings as **verified**, **proposed**, or **unverified**, with file paths, configuration evidence, or reproducible checks. Keep secrets out of the report and out of source control.

Then propose the smallest rendering/control prototype on an agreed device. Use placeholders if likeness references or final art are missing. Do not purchase services, increase hosting capacity, or publish family assets merely because the concept is ambitious.

## Scope boundary

The proposed first playable is the Launch Day loop: a compact home scene, guided departure, one jump, one playable space region, three discoveries, one enemy archetype, return, one upgrade, and reliable local saving.

Walking, five fully modeled family avatars, follower navigation, split parties, cloud saves, multiplayer, and a larger universe remain outside that first-playable proposal. Reserve stable content IDs and extensible state without building the entire future game.

## Evidence required before declaring a release ready

Use acceptance checks A01–A08 in the specification. Record the build or commit tested, device and browser, test procedure, result, and unresolved failures. Preserve the homepage, validate refresh-safe saves and recovery, and test real keyboard and touch interaction on the chosen devices.

Performance values in the specification are provisional goals, not existing benchmark results. Do not claim that a feature works, a service is connected, or a test passed without evidence.

## Privacy and publication boundary

The repository is public. Keep source family photos, voice recordings, original likeness references, precise home or school details, real neighbor identification, and credentials out of all commits. Use a fictional villain name and environment. A public code/documentation repository is not permission to publish the family-likeness game.

## Import receipt

- Source document: `Space_Dragon_Spec_v0_1.docx`.
- Source document SHA-256: `5d412824a5ebf65596a5b143fd4a71e1d338c84564f8ecdfb4f050a3764f2510`.
- GitHub specification: `docs/space-dragon-spec-v0.1.md`.
- Markdown Git blob SHA-1: `0cb759c6fef55f60d440861c23e7f095acd2b049`.
- Import verification: all extracted document paragraph text, table content, and external source links were retained; the uploaded Markdown blob matched the locally generated file.
- Pre-import repository state: `main` at `63d41071585efea61ed2436fa550605fd90f3bdb`, containing only `README.md`.

The Word file itself is not included in this commit. The complete specification content is stored as Markdown for readable diffs and subsequent editing. The original Word document remains available in the planning conversation.
