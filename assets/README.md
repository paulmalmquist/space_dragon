# Asset workspace

Keep editable artwork, references, and browser exports separate. Nothing in this folder is automatically a finished game asset.

| Location | Purpose |
| --- | --- |
| `reference/family/` | The existing 18 authorized photos, gallery, and manifest. Preserve these files. |
| `reference/motion/` | Instructions for useful movement and camera references. |
| `reference/local/` | Ignored local videos, boards, photos, and other unapproved reference media. |
| `source/` | Approved editable artwork and source conventions. |
| `source/local/` | Ignored working Blender projects, paint files, and review renders. |
| `game/` | Reviewed browser export candidates and their conventions. |
| `game/local/` | Ignored export experiments awaiting review. |

New references can start as a file plus one sentence: “This is what I like about it.” Tell an agent about the file in chat or the idea inbox. Do not put family photos into runtime textures or copy this folder into the site's public directory.

See [the asset pipeline](../docs/ASSET_PIPELINE.md) and [the Blender character handoff](../docs/BLENDER_CHARACTER_HANDOFF.md). The older handoff's `art/` paths were a proposed layout; use the `assets/source/` and `assets/game/` layout established here for new work.
