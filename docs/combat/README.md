# Combat notebook: ideas -> experiments -> tests

**Request:** turn the third-person PvE, dragon-space PvE, parry and combat-core ideas into a series of notes that can evolve into tests (2026-10-28).
**Scope:** documentation, test specifications and specification-integrity checks only. No playable combat, engine selection, dependency installation, deployment or change to the current milestone.
**Authority:** the desire for rich PvE and a good parry is CONFIRMED. The mechanics and numbers below are PROPOSED. Future Line Leader work remains BOOKMARKED. "Core" is provisionally interpreted as the core combat loop, not a new reactor/resource mechanic.

## Compatibility with the existing combat proposal

Initial inspection: `82599acb8b58fb29146db057a41e4a22703f8264`; reconciled through `872959d64bd34d3758db65d822777cc60db6e7c6` to `b27f44cb7ae8c00e3c3d7d83ef1cb456f970de52` before committing. The latest baseline includes the owner-direction record `docs/decisions/2026-10-29-alley-oops-and-jet-flight.md`. The existing `docs/gameplay/COMBAT_SYSTEM.md` is a PROPOSED tandem-first design, not implemented gameplay. This notebook supplements it; a merged design document is not proof every detail is owner-approved.

Preserve its family-safe baseline: sparks and suit energy rather than required health bars, harmless enemy resolutions, bonk/revive rather than injury, no real-animal combat, no game over in story fights, and no learning questions during combat. Support simple tap controls and assisted completion without precise timing. Precision parry/guard/recovery experiments are an optional advanced control profile, not new requirements for children or story progress. Extra posture/guard meters are not approved UI merely because a debug experiment uses those values.

The newer owner decision supersedes the earlier corridor-only dragon proposal and status-pair tandem definitions. The dragon must have fighter-jet feel: speed, banking, throttle and dogfighting. Cadet/Pilot/Ace assistance tiers are proposed ways to preserve that feel without demanding expert controls from young players. On foot, a tandem is a setter launching a finisher: an alley-oop. CB-004 and CB-008 follow these directions. Detailed timing, tier implementation and names remain proposed or open. Later owner decisions remove all dragon crew roles and make keyboard the required input, with opportunistic plug-and-play Xbox support and touch deferred. Preserve one pilot with the standard flight kit; the notebook's optional pilot deflection is an experiment, not permission to restore a Wing Shield station. CB-007-T04 starts with complete keyboard coverage on a named computer/browser.

The existing two-character/one-alley-oop family slice, the proposed one-enemy precision lab, and the separate Cadet/Pilot flight prototype answer different questions. None is authorized for implementation by this documentation update.

Scripted local companion assists are PROPOSED in the existing design. They are not the BOOKMARKED exploration Line Leader/split-party system. CB-008 keeps that distinction and adds the existing tandem/recovery/persistence invariants to the test queue.

## Read in this order

| Note | Question | First experiment |
| --- | --- | --- |
| [CB-001](CB-001-core-loop.md) | Is one enemy enjoyable without progression or spectacle? | A small graybox duel. |
| [CB-002](CB-002-parry.md) | Does defense reward deliberate timing rather than tapping? | Scripted attack and timing overlay. |
| [CB-003](CB-003-counter-posture.md) | Does a parry create a useful, limited opening? | Parry -> counter -> recovery. |
| [CB-004](CB-004-dragon.md) | Does space combat feel like a powerful dragon? | Three drones and one reflectable bolt. |
| [CB-005](CB-005-encounters.md) | Are multiple enemies challenging but readable? | One melee, one ranged and one heavy enemy. |
| [CB-006](CB-006-contact-feedback.md) | Do collision, camera and effects tell the same story? | Fast attacks, occlusion and effects toggles. |
| [CB-007](CB-007-browser-assistance.md) | Is the result reliable across supported inputs and devices? | Replay, pause/resume and device checks. |
| [CB-008](CB-008-family.md) | Do tandems and recovery work without extra micromanagement? | Two-member alley-oop checks; Line Leader remains later. |

The [case registry](../../tests/combat_cases.json) owns test IDs and Given/When/Then specifications. Each note links its cases by ID. These are specifications, not implemented gameplay tests. All gameplay cases start NOT TESTED; there are no recorded passes.

## Evolution without rewriting history

Use DRAFT -> SPECIFIED -> PROTOTYPED -> VERIFIED -> PLAYTESTED -> ACCEPTED. These are notebook maturity labels, separate from canon approval and release approval. This first set is SPECIFIED. A prototype needs runnable code; VERIFIED needs executed rule/integration checks; PLAYTESTED needs observed human play; ACCEPTED needs the owner's decision. None alone authorizes release.

For each revision: retain the note/test ID, record what changed and why, name the build and tuning profile, execute the affected cases, and attach a receipt. Keep failures and contradictory observations; supersede old rules explicitly. Do not make a failing test pass by weakening its expectation without recording a design decision. No invented results, empty tests, mocked-success badges, or TODO/skipped cases counted as passed.

Separate three questions: **Does the rule work? Does it feel good? Does it run well?** Unit tests, playtests and real-device measurements answer different questions. Scores and numerical thresholds below are experimental proposals, not industry facts or measured results.

## Proposed experiment ladder

A: CB-001/002/003/006 in one graybox duel. B: CB-005 adds a small encounter after its chosen single-enemy or tandem baseline is readable and responsive. C: CB-004 reuses the combat rules with a separate flight controller. D: CB-007 checks the selected browser/input/device matrix throughout. CB-008 tandem/recovery checks accompany the family slice; its Line Leader cases remain later work, not a prerequisite. This is an experiment sequence, not a replacement for Act I's story order or authorization to implement the whole ladder.

When authorized to implement, inspect the real application repository and test runner. Connect these IDs to tests against production simulation code; do not create a second fake combat implementation merely to satisfy the registry. Keep deterministic rules separate from rendering. Single-player response must not require a Railway round trip. Multiplayer is not part of this increment.

## Research evidence queue

Earlier conversation named `euuuuuuan/hollowmere-public`, `noahbutcher97/KatanaCombat_Demo` and `Snaiel/Godot4ThirdPersonCombatPrototype`. They are UNVERIFIED CANDIDATES in this notebook, not approved dependencies. Previous descriptions, paths, license claims and suitability ratings have not been independently established here. Before borrowing, record the exact repository/commit, inspected source paths, observed behavior, code and asset licenses, and a browser-portability experiment. No external code or assets are copied in this change.

## Checks now

```sh
python3 tools/check_combat_notes.py
python3 -m unittest discover -s tests -p 'test_combat_notes.py' -v
```

These validate the notebook and its checker only. They cannot establish that parrying, flight, camera, performance, accessibility or fun works. The existing foundation unit discovery will also discover this new test module; no CI workflow or deployment configuration is changed.

## Next-note template

Copy one note, assign a new CB-NNN ID, and retain: authority/maturity; player outcome and hypothesis; falsifiable rules; smallest experiment; linked Given/When/Then cases; proposed tuning; failure signs; evidence and revision history. Register it and its cases in the JSON file. Keep detailed evidence in a verification receipt, not in outward-facing summaries.
