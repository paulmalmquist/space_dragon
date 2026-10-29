---
name: sd-blender-asset
description: Create, revise or export a Space Dragon character or environment through an available Blender connection. Use for reviewable asset work, not identity inference, external photo uploads or automatic publication.
---

# Blender asset workflow

Paths below are repository-relative. Read `AGENTS.md`, `docs/BLENDER_CHARACTER_HANDOFF.md` and the task's asset acceptance criteria. The handoff owns character/reference rules; this skill is its execution procedure.

## Inputs and preflight

Identify the asset ID, owner-assigned references, requested operation, source path and runtime target if one exists. Inspect actual MCP tools, Blender version, active scene and exporter. No fabricated connection or assumed tool names. Only one writer may modify the shared `.blend`; other agents may work on separate scripts or assets.

## Procedure

1. Verify the reference manifest when using family photos. Use only confirmed filename/position labels; do not infer names by facial matching. Keep unassigned likenesses provisional and Lyla's color open.
2. Save a versioned recoverable source before editing. Use stable collection/object names and idempotent scripts so rerunning creates no duplicate rigs or geometry. Do not delete unrelated scene objects.
3. Separate reference-only collections from exportable geometry. Do not pack original reference images into runtime assets or send them to external generators without separate authorization. Prefer local tools already available.
4. Work from scale/silhouette to likeness, armor, rig and animation. Preserve child proportions. Produce neutral front, side, three-quarter and full-body views for applicable review; likeness and suit approval are separate.
5. Export only the intended objects. Record units, transforms, bones, materials, textures, triangle counts, file size and required clip names. Do not invent performance budgets or substitute a render for a usable model.
6. Reopen the source/export and test clips, scale and materials. Load it into the actual browser runtime when available. Missing runtime means export/runtime verification is incomplete, not failed likeness and not a completed game asset.
7. Inspect textures and output for reference leakage. Record measured results and approvals separately. Do not commit large binary sources until the repository's storage approach is agreed.

## Output

Provide source/export/render paths, actual MCP actions, tool versions, reference-label status, metrics, observed tests and pending reviews using `docs/templates/VERIFICATION_RECEIPT.md`. Preserve working sources. No public release, new provider connection or likeness approval is implied.
