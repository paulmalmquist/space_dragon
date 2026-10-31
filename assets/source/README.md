# Editable artwork

Start local work under `assets/source/local/<kind>/<id>/`. This directory is ignored by Git so new media stays local while its publication status is unresolved.

When a source asset is approved for the public repository, use `assets/source/<kind>/<id>/` and a versioned filename such as `dragon-wing-left-v001.blend`. Save a new version before an agent changes an existing Blender scene. Preserve sources alongside exported candidates; exporting a GLB does not replace the `.blend` file.

Use stable IDs (`paul`, `maria`, `luke`, `luna`, `lyla`) and descriptive component IDs. Record source references, design approval, export settings, and rights in the asset's notes. Keep reference photos separate from export collections. Do not pack them into the game file.

Git LFS rules cover approved large source formats where configured; LFS is storage, not publication approval. The existing 18-photo decision does not authorize additional media.

Sound banks follow the same source boundary: [audio library guide](audio/README.md). Put complete banks under `assets/source/local/audio/`; keep catalogs and edit recipes under `assets/source/audio/`.
