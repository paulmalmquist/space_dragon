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
