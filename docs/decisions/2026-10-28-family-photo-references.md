# Decision — Family reference photo publication

**Recorded:** October 28, 2026
**Decision source:** the project owner's explicit request: “Push these photos to the repo. I’m going to use blender mcp for a lot of the character design.”

## Decision

Prepare the family-reference images supplied in the current conversation for `paulmalmquist/space_dragon`, with a reference-only directory, image inventory, and Blender/MCP handoff. The collection contains 18 photos across three upload batches. Preserve the supplied image dimensions and image data while removing embedded location and other personal metadata. Retain rendering-related color information.

## Visibility and consent boundary

The repository was verified **public** during preparation, and this was communicated in the conversation. Do not change repository visibility as a side effect of this task. Anyone able to access the public repository can access committed reference images; a directory name does not protect them.

This decision creates a narrow exception to the older photo-exclusion guidance in the v0.1 planning documents. It covers only the files inventoried in `assets/reference/family/manifest.json`. It does not authorize publication of unrelated family media, third-party photo uploads, face-recognition training, voice cloning, or deployment of final likeness-based game assets.

Visible background content remains in the photos. Do not extract school, home, or location details into character data. Do not treat unidentified bystanders as crew members.

## Execution receipt at package creation

All 18 cleaned images were prepared locally and passed pixel-preservation checks. The GitHub branch observed was `main` at `f174f7c6aba05d65e2d0a886ee1125d2cb94b959`.

**No upload or commit was completed in this preparation session.** The available GitHub tools exposed read operations but not upload/commit operations. A direct Git connection from the working environment also failed. Record the actual resulting commit and verify the remote inventory when this package is imported through an authenticated development environment. Never use the old baseline commit as an upload receipt.

## Completed repository import — October 28, 2026

The supplied collection and relevant “Railway Game Support” planning context were imported to the existing public repository without changing visibility, rewriting history, or deploying the game.

**Verified content commit:** [7bcba2ed7aaaf1970c9f5c87a0dcce59be2f5952](https://github.com/paulmalmquist/space_dragon/commit/7bcba2ed7aaaf1970c9f5c87a0dcce59be2f5952).

**Previous main:** 93f8c2d0b57f6da367ce4b0cf01ed8d9a1582141. The update was a normal fast-forward with an expected-head check.

Imported all 18 photos under assets/reference/family/photos/, the manifest, gallery, reference README, and verification tool. Added [the planning-chat context index](../context/RAILWAY_GAME_SUPPORT.md) and updated the README and current handoffs. Preserved the newer Act I story and existing Blender handoff; the older handoff inside the ZIP was not copied over them.

Source package: Space_Dragon_Character_References.zip, version 2. ZIP SHA-256: 32798c96881023d73ad505de3fe57acfe62f8862f5e1fe88d67aefb4c304b5cb.

Verification completed:

- ZIP integrity passed.
- The packaged verification tool confirmed exactly 18 images with matching sizes, SHA-256 checksums and Git blob hashes.
- All 18 decoded at the manifest dimensions; inspection found no EXIF, XMP or comment metadata. A contact-sheet review covered every image.
- The gallery references all 18 files; the checked documentation links resolve locally.
- The uploaded Git tree matched the locally reviewed tree exactly.
- After publication, fetching main confirmed the content commit, all 18 remote photo blob hashes, and the documentation, gallery, manifest and verification-tool paths.

The original preparation receipt above is retained as history. Its “no upload” statement describes package creation, not current repository status. This receipt records the already verified content commit; the commit adding this receipt is a later documentation-only update.

The original uploads were not available for a new pixel-by-pixel comparison in this import. Preparation-time pixel-preservation claims remain attributed to the package manifest. Character models, Blender connectivity, likeness approval and game deployment remain outside this import.
