# Railway Game Support — project context

**Source chat:** “Railway Game Support” in the Space Dragon project.
**Consolidated:** October 28, 2026.
**Purpose:** preserve the actionable planning context and supplied photos for work in paulmalmquist/space_dragon.

This is a curated handoff, not a verbatim chat export. It combines the existing source-derived specification and accepted Act I narrative, the prepared photo package, and retrieved decisions from the named chat. Keep **CONFIRMED**, **PROPOSED**, **BOOKMARKED**, and **OPEN** distinct.

## Read in this order

| Source | Use and authority |
| --- | --- |
| [Act I: Build the Dragon](../story/ACT_I_BUILD_THE_DRAGON.md) | Current story baseline; supersedes conflicting opening/origin assumptions in the initial spec. Includes confirmed direction, proposed scene treatment, and open lore. |
| [Initial game/technical spec](../space-dragon-spec-v0.1.md) | Historical v0.1 baseline, preserved intact. Its flight-first opening and old photo-availability notes must be read with the later updates. |
| [Implementation handoff](../IMPLEMENTATION_HANDOFF.md) | Current scope, repository/site audit needs, evidence and release expectations. |
| [Blender/MCP handoff](../BLENDER_CHARACTER_HANDOFF.md) | Character workflow, reference identity constraints, review steps and export expectations. |
| [Photo references](../../assets/reference/family/README.md) | All 18 cleaned photographs, [manifest](../../assets/reference/family/manifest.json), and [local gallery](../../assets/reference/family/index.html). |
| [Photo-publication decision](../decisions/2026-10-28-family-photo-references.md) | Exact collection authorized for public GitHub publication and import receipt. |

## Confirmed creative direction

Space Dragon follows Paul, Maria, Luke, Luna, and Lyla. Recognizable, close-to-realistic family likenesses are a goal, and Paul plans to use Blender MCP for substantial character design.

The opening is at the living-room computer. A backyard arrival supplies the specialized suits; other components scatter around familiar town locations. Recovering and combining those components assembles a dragon from an existing design. The family did not invent it.

The equipment was deliberately sent with an SOS. Earth was the closest planet in range; this family found it accidentally and was not preselected. Act I culminates in assembling the dragon and choosing to help. The next journey leads toward the SOS in another universe. The sender, emergency and crossing mechanics remain open.

The neighborhood is supportive except for the fictional across-the-street antagonist. Florida-themed enemies include iguanas and alligators. Familiar-location retrievals mix exploration, early learning, fun racing and playful combat. Use the fictionalized school/workplace treatment in Act I; exact mission counts, component assignments and dialogue remain proposals.

| Character | Confirmed suit/specialty | Still open or proposed |
| --- | --- | --- |
| Paul | Iron Man-inspired armor | Detailed engineering moves and palette |
| Luke | Iron Spider-inspired suit | Detailed agility, limbs and tether mechanics |
| Maria | Purple suit; healer | Equipment, shields and detailed powers |
| Luna | Pink suit; goo makes enemies slip | Equipment and additional goo variants |
| Lyla | Gathers and stores information | Suit color and specific scanner/archive equipment |

The **Line Leader** is a bookmarked future mechanic: control one family member while the active party follows automatically; eventually explore in pairs or smaller groups. This does not establish networked multiplayer or move all walking/party systems into the first build.

## Reading and learning context

Paul explicitly asked for the game to help teach the children to read, including challenges involving recognition of a letter. He described the girls as three in that discussion. These are learning-design inputs, not a measured assessment of any child's skills.

Act I section 6 preserves the proposed implementation approach: spoken instructions, matching and letter activities, hints, assisted completion, and forgiving retries. Learning difficulty should follow the child playing rather than the character selected. Distinguish letter matching, letter-name recognition and letter-sound knowledge. Keep those detailed instructional rules labeled as proposals; no curriculum, assessment, progression algorithm or mastery claim has been validated.

The adventures should remain enjoyable as exploration, racing and playful combat. The existing treatment proposes presenting reading at safe moments rather than requiring decoding while steering at speed, and allowing assisted completion to advance required story progress.

## Photos and Blender continuation

The supplied package contains 18 photographs across three upload batches. It preserves original resolution and image data while removing non-rendering metadata; preparation-time pixel comparison is recorded in the manifest. This import verifies the cleaned package itself. The original uploads are not duplicated in the repository.

The precise filename-and-position identity anchor retained by the package is **Lyla, viewer-left in IMG_3277.jpeg, wearing the pink strawberry-print shirt**. Keep the existing manifest's confirmation status for all other subjects. Do not turn a general chat recollection into a new per-image identity label or match people across photos.

The imported collection is reference material, not finished characters or runtime textures. Next art steps from the Blender handoff are to inspect the actual Blender/MCP environment, set up references, create family-scale suit blockouts, and use the confirmed Lyla anchor for a reviewable pilot character. Blender connectivity, generated models, rigs and runtime exports remain unverified.

## Technical and delivery context

- Intended site route: paulmalmquist.com/space-dragon, preserving the existing homepage.
- Browser rendering/simulation, TypeScript/Three.js, local checkpoint saves, and later optional Railway save services are proposed architecture, not an inspected implementation.
- The chat title does not establish that Railway is connected or hosts the game. Existing website framework, deployment configuration, backend needs and budget still require inspection.
- Exact target devices, final input support, performance budgets and the next playable milestone remain to be selected and tested.
- The old **Launch Day** flight loop can be a technical prototype. It is no longer the chronological story opening.
- A living-room/backyard sequence, one retrieval and return-home revelation is the current proposed story-first prototype. Full town production, all missions, five finished avatars and split-party exploration are not automatically first-build scope.

## Migration provenance and verification

The repository already contained the initial specification, implementation handoff, Blender handoff, and Act I story when this import began. The verified remote baseline was 93f8c2d0b57f6da367ce4b0cf01ed8d9a1582141. Those documents were preserved; the README and handoffs were updated for the photo import.

Photo source: Space_Dragon_Character_References.zip, version 2, prepared October 28, 2026.
ZIP SHA-256: 32798c96881023d73ad505de3fe57acfe62f8862f5e1fe88d67aefb4c304b5cb.

Imported: assets/reference/family/, the photo-publication decision, and tools/verify_family_references.py. The older Blender handoff and upload instructions inside the package were not substituted for current repository documentation.

Validation: the ZIP integrity check passed; all 18 photo sizes, SHA-256 values and Git blob hashes matched the manifest; all images decoded at the recorded dimensions; EXIF, XMP and comments were absent in the image inspection; a contact-sheet review covered all 18 images. Preparation-time comparison against original uploads remains the package's recorded evidence, not a new comparison performed during this import.

See the publication decision for the final remote commit receipt. No playable game, Blender models, hosting changes or deployment are claimed by this migration.
