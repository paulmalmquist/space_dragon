# Space Dragon — Blender/MCP character-design handoff

**Version:** 0.1 — October 28, 2026  
**Scope:** establish a family-reference workflow and develop five game-character assets. This handoff does not claim that Blender is connected, a model has been generated, or an asset has been approved.

## Transfer status

This document has been prepared for repository publication. The 18 cleaned photo references are in the conversation attachment `Space_Dragon_Character_References.zip`; they have **not yet been committed to this repository**. Do not interpret this document's presence as proof that photo transfer succeeded. Import and verify the reference collection before executing steps that require its files.

The package includes `assets/reference/family/README.md`, a local gallery, `manifest.json`, `photos/`, `tools/verify_family_references.py`, and a narrow photo-publication decision. Follow `UPLOAD_TO_GITHUB.md` in that package, preserve existing repository work, and do not overwrite this updated handoff with an older packaged copy.

## 1. Read the existing foundation

Read `docs/space-dragon-spec-v0.1.md` and `docs/IMPLEMENTATION_HANDOFF.md` before changing scope. This document supplements them; it does not convert proposals into canon or move planetary walking into the first playable release.

The owner explicitly requested: “Push these photos to the repo. I’m going to use blender mcp for a lot of the character design.” This authorizes publication of the supplied 18-photo collection only. It supersedes the earlier blanket photo-exclusion guidance for that collection, not for unrelated media. The repository is public; do not change its visibility as a side effect. No permission is implied to upload photos to third-party generation services, clone voices, or deploy final likeness-based game assets.

## 2. Inventory the real Blender environment

Inspect the available MCP tools, Blender version, active scene, project directory, and export capabilities. Do not assume a particular third-party Blender MCP implementation or tool name. Record what actually works. Do not claim a successful connection without a real tool response.

Before editing an existing scene, save a versioned copy. Do not run arbitrary downloaded scripts, buy assets, upload photographs to an external generation service, or enable additional integrations merely because a tool offers them.

After the photo package is imported, run `python3 tools/verify_family_references.py` from the repository root. Open `assets/reference/family/index.html` and the manifest. Load selected images as reference-only objects or boards, separate from game geometry. Use project-relative paths. Do not unintentionally pack reference photographs into exported character assets.

## 3. Preserve these character requirements

| Character ID | Confirmed suit concept | Proposals or open decisions |
|---|---|---|
| `paul` | Iron Man-inspired powered armor. | Heavy engineering tools and red/graphite/gold palette are proposals. |
| `luke` | Iron Spider-inspired suit. | Four retractable mechanical limbs, energy tethers, and red/blue/gold palette are proposed implementations. |
| `maria` | Purple suit; family healer. | Protective silhouette, healing drones, and shield effects are proposals. |
| `luna` | Pink suit; shoots goo that makes enemies slip. | Wrist nozzles, visible reservoirs, and later sticky-goo variants are proposals. |
| `lyla` | Gathering and storing information. | Scanners, holographic interface, and archive companion are proposals. Her suit color remains OPEN; teal/silver is only a candidate. |

The intended look is recognizable family likenesses in a cinematic science-fiction world. Keep natural age-appropriate proportions and expressions. Do not age the children up or turn them into scaled-down adult bodybuilders. Use the existing suit inspirations as direction; do not import ripped film or game models.

Retractable helmets, a shared dragon emblem, specific materials, and shared suit construction details are art-direction proposals until reviewed. Do not hide every face merely to avoid likeness work.

## 4. Use only established identity labels

The user confirmed Lyla as the viewer-left child in `IMG_3277.jpeg`, wearing a pink strawberry-print shirt. This is recorded in the packaged manifest. Other photo subjects remain unassigned; do not assume a group photo contains only crew members, and do not infer names by comparing faces across photos.

Start reference setup and suit blockouts with stable character IDs. Use the confirmed Lyla anchor for her likeness work. Keep the remaining faces provisional until the owner assigns the references. A simple filename-plus-position label is sufficient; do not request unnecessary personal details.

Treat the pictures as visual references, not as calibrated scans or measured anatomical data. Make uncertain geometry reviewable rather than presenting it as a faithful reconstruction.

## 5. Proposed production sequence

1. **Reference setup:** organize selected reference boards and create a neutral review scene. Keep background people out of character-design selections.
2. **Scale and silhouette:** create simple five-character blockouts. Establish believable family-scale relationships and distinct suit silhouettes before fine detail.
3. **Pilot character:** use the confirmed Lyla reference to test likeness review and the export pipeline. Keep her color neutral or visibly marked provisional.
4. **Review gate:** show neutral-light front, three-quarter, side, and full-body renders. Separate likeness approval from armor approval. Do not call unseen or unapproved views accurate.
5. **Reusable suit structure:** develop an articulated suit system with character-specific armor and equipment. Preserve different faces and body proportions; do not reuse one face across the family.
6. **Rig and movement:** test idle, walk, run, turn, and an interaction pose. Keep specialty equipment independently controllable where practical. Save editable sources.
7. **Game export:** export a test character into a format the actual browser runtime supports; `.glb` is the proposed target. Validate the file by loading it in that runtime, not by file existence alone.
8. **Remaining characters:** repeat the reviewed process with user-assigned references. Do not produce all five as final before the pilot establishes quality and performance.

## 6. Proposed repository layout

```text
assets/reference/family/             # Photo references, manifest and local gallery; transfer pending
art/blender/characters/<id>/         # Editable, versioned Blender sources
art/renders/characters/<id>/         # Review renders; no automatic publication
art/exports/characters/<id>/         # Candidate game exports
art/reports/characters/<id>/         # Measured counts, tests and approval receipts
```

These are intended destinations, not existing deliverables. Do not add large `.blend` files to Git without first agreeing on storage strategy. Use stable IDs `paul`, `maria`, `luke`, `luna`, and `lyla`; avoid filenames containing unrelated personal information.

Do not put source references under a web framework's `public/` directory or automatically include them in a game build. A reference directory in a public repository is still publicly accessible. Do not apply an open-source code license to family photos by assumption.

## 7. Browser-game constraints

Inspect the actual client and target devices before assigning triangle, material, texture, or animation budgets. Record measured values and loading behavior. Label proposed budgets as targets, never as verified performance.

Keep source reference boards, unused geometry, lights, cameras, and unapproved textures out of runtime exports. Check scale, transforms, skeleton behavior, materials, and required animation clips. Verify that files can be reopened and that the browser renderer can display and animate the exported character.

Reserve support for the future **Line Leader** system: one directly controlled character with automatic followers, later including smaller groups. Shared movement conventions and stable IDs should support that feature, but this art task does not implement follower AI, split parties, multiplayer, or planetary missions.

## 8. Evidence for a completed character milestone

Report the source `.blend` path, render paths, exported asset path, actual MCP actions performed, and Blender/export versions observed. Include reference IDs used, identity-label status, likeness/suit approval status, geometry and texture counts, animation checks, and runtime test results where performed.

Use **completed**, **proposed**, **blocked**, and **not tested** accurately. A written description, generated concept picture, or placeholder mesh is not a finished rigged character. No character is approved merely because the tool produced a file.
