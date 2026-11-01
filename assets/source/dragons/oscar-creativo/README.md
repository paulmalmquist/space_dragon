# Oscar Creativo dragon — source and attribution

**Selected baseline:** SD-086, October 31 New York / November 1, 2026 UTC. [Owner decision](../../../../docs/decisions/2026-11-01-oscar-dragon-baseline.md); [verification](../../../../docs/reports/2026-11-01-oscar-dragon-baseline.md). The original delivery remains at `C:/Projects/space_dragon/free-dragon-character-3d-by-oscar-creativo/`. This tracked folder contains provenance only, not the raw package.

Use `source/DRAGON CHARACTER 3D BY Oscar Creativo.fbx` together with `textures/`. The FBX is **28,080,332 bytes**, SHA-256 `5995203e4c99d683be82ce7157f6e3e40341f56d8de46ba9578f6d47123d8ea4`. Preserve it unchanged; keep editable and optimized derivatives separate under the [asset pipeline](../../../../docs/ASSET_PIPELINE.md). Original package license/readme files were absent; the dated public model API evidence below supplies attribution metadata.

## Credit to retain with the asset

[FREE DRAGON CHARACTER 3D BY Oscar Creativo](https://sketchfab.com/3d-models/free-dragon-character-3d-by-oscar-creativo-443971c0f42a49e5bedc0bfe2b544407) by [OSCAR CREATIVO](https://sketchfab.com/oscar_creativo), licensed under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).

Original listing notice: “Character FREE DRAGON By Oscar Creativo All rights reserved www.oscarcreativo.co”. Retain this notice with the attribution. The public model metadata identifies CC Attribution and permits commercial use with creator credit; this is not a CC0/public-domain asset. Metadata captured **2026-11-01T02:18:18.461736Z** from the [exact model API](https://api.sketchfab.com/v3/models/443971c0f42a49e5bedc0bfe2b544407); snapshot SHA-256 `237c46a0d04cc500c5a028abfc8fea50f830801357bb6733411adcee2b1601e5`.

**Modifications — imported master v001:** imported into Blender 5.2.1 with geometry/UVs/skin, bone rests/weights and animation channels preserved; rebuilt local baseline material links to supplied textures while retaining original material datablocks, packed mapped images and kept the separate rock hidden. The source FBX remains unchanged. At the v001 import checkpoint, no scale normalization, rig reduction, retargeting or game export had occurred; later preparation/export modifications are recorded below. Before promoting a derivative, append its actual material/texture, rig/animation, geometry and export changes here and in [provenance.json](provenance.json), with version/hash. Include creator/source/license credit and a modifications notice with the shipped derivative. Do not imply creator endorsement of Space Dragon or credit the original model to this project.

## Intake findings and next action

Structural reports measure **114,029 vertices / 224,407 triangles / 27 geometry objects**, **931 limb nodes / 101 positively weighted bones**, and one **5.133333-second** authored clip. Weighted `c_` bones must not be discarded merely because their names resemble controls. Source unit declaration is centimetres; the imported dragon now measures 91.4178 m across before normalization. This is source-space measurement, not selected gameplay scale; the later game contract measures its own forward/contact conventions.

The 106 supplied 2K PNG maps and three 4K Rocky_Sand JPGs need explicit relinking from absent creator-local paths. Body normal `1021`, metallic `1035` and roughness `1025` are missing; eyes have no metallic/roughness maps. `CUERPO_.002` on `DRAGON_BAJA1_1_9` was observed on UV tile 1036; later preparation uses the documented inferred horn-tile assignment, reviewed in complete views but not independently isolated for its six triangles. Do not silently invent missing authored detail; use documented neutral channel constants only where appropriate. The PNG base-level RGBA8 equivalent is about 1.66 GiB before mipmaps, not measured VRAM or a runtime budget. The presentation rock is retained separately and hidden in the imported source; it is not a proposed gameplay collider.

Focused read-only reports remain in `C:/Projects/space_dragon_unity_merge/artifacts/oscar-dragon-intake/`: `inventory.json`, `meshes-and-materials.json`, `rig.json`, `animations.json` and `sketchfab-model-license.json`. [Tracked provenance](provenance.json) preserves the source identity and relevant metadata. That structural intake itself did not test appearance or motion. Later source/player review and measured Unity checks are recorded below; structural intake alone does not establish them.

## Recoverable Blender import v001

`C:/Projects/space_dragon/assets/source/local/spacecraft/oscar-dragon/Oscar Dragon-v001-imported.blend` is **399,119,070 bytes**, SHA-256 `faef4cc1304176e7413753806181a59e535d305964c1b723fb13ab9b10cc37d6`. Background Blender **5.2.1 LTS** completed `tools/oscar_dragon_intake.py`; the report is `artifacts/oscar-dragon-intake/blender-import-v001.json` in the Oscar worktree. All four recorded preservation checks are true.

The root agent reopened it in live Blender and inspected front, side and three-quarter views plus animation frames **0, 31, 62, 93, 124, 154**. A looping wing flap, body motion and tail motion were observed. These sampled poses do not establish complete deformation coverage, named gameplay clips or Unity readiness. Continue in a separate game candidate; preserve this imported master and source package.

The first four-influence game candidate failed its deformation gate (0.1259 m maximum / 0.01024 m highest per-frame p95) and is not promoted. Preserve all source influences, originally up to 12, in the replacement. [Failure and replacement checks](../../../../docs/reports/2026-11-01-oscar-dragon-baseline.md) remain distinct from the successful source import.

## Full-weight game source v003

`Oscar Dragon-v003-game-fullweights.blend` in the same ignored source folder is **526,071,862 bytes**, SHA-256 `72d4f006c2ce891f47b52553690cb8ce3cb246f3be609c3b35255280f245aabd`. It retains 165 bones and all original positive skin assignments (up to 12), with zero vertices trimmed. It normalizes the frame-1 span to 10.8 m, retains the source anatomy/motion in a separate candidate, prepares maps/UVs and derives clips/sockets. [Provenance](provenance.json) records actual modifications. The sampled full-weight source comparison is about 2.38 micrometres at worst, below 1 mm.

The first raw export was rejected for an extra scene cube and preserved in the ignored artifacts; the exporter now restricts the active scene/exact mesh set. The corrected export and additive intake now pass as recorded below; Unity restoration subsequently passes; final visual approval remains open.

## Corrected export and current integration gate

`dragon-oscar-v001.glb` is **78,780,624 bytes**, SHA-256 `7c9ed83fef05fc1d2b3bf868e44f5893742dad1682d2368c78ca24acd1ed3292`: 217,465 triangles, 26 meshes, 165 joints and up to 12 influences across three sets. Khronos validation reports zero errors; Node preparation and checkout verification pass. Actual export modifications are listed in [provenance.json](provenance.json) and the copied runtime NOTICE. The immutable v005 intake chains the earlier v004 candidate rather than replacing it.

The root agent inspected the 1200×800 neutral/front/side Blender source renders; source hash remains unchanged. Earlier Unity setup failed a precision comparison; later readback retains all 446,278 positive influences across 26 meshes with no zeroed weights. The corrected complete v010 setup now passes four poses/12,856 sampled vertices, maximum error 0.01055 mm, along with rest/material/source checks. Unity appearance, gameplay and performance are **not verified** by export/intake or a diagnostic pose sample. [Current receipt](../../../../docs/reports/2026-11-01-oscar-dragon-baseline.md) preserves both passes and failures.

The first Web candidate passes 84 Unity tests and builds, but actual Chrome startup fails out of memory before runtime. That player/report is frozen; it has no FPS/gameplay result. The BC7 derivative retains candidate image dimensions/source data and now passes Editor setup, 86 tests and revised Web build. Actual Chrome passes all 11 gameplay cases on WebGPU and WebGL2; all six matched neutral source/player views are REVIEWED, with lighter/shinier Unity response and chest-color differences recorded. Final owner art/release approval remains open. See the [receipt](../../../../docs/reports/2026-11-01-oscar-dragon-baseline.md) for scoped artifact identities.

The bounded Lenovo/Chrome baseline integration is **IMPLEMENTED / VERIFIED**. The [gallery](../../../../artifacts/unity/oscar-inspection/index.html) links the separate visual review; BC7 is lossy, full material parity is not claimed, and the inferred six-triangle tile-1036 material still needs isolated inspection.
