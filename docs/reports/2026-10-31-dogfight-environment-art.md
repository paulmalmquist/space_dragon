# Dogfight environment art — SD-077

## Scope

Owner, October 31: “ok change and ok continue with art and such. gameplay is solid”. Current gameplay feel is owner-reviewed; this is not final art or release approval. Work stays local on `feat/town-drive-lab`, preserving concurrent Town Drive/Launch work. [Decision](../decisions/2026-10-31-dogfight-art-continuation.md).

## Implemented

- Locally authored deterministic spherical regolith texture generation: 512×512 color, tangent normal and packed roughness/occlusion maps. Dry nonmetallic response, pits and restrained mineral variation. Occlusion stays separate from base color; no baked scene lighting.
- A 1024×512 turbulent gas-giant texture replaces the original regular blue bands. Slate/sand cloud bands retain quiet large forms.
- One decorative ring renderer, 512 triangles, cutout radial bands with a broad division. Opaque depth handles planet occlusion; no collision or additional lights.
- Visible nebula exposure lowered from 1.8 to 1.05; lighting/reflections and dragon material values retained.
- Recomputed asteroid tangent basis supports the new normal map. Vertex positions, random sequence, collider geometry, placement and combat parameters remain unchanged.

Editable source: `unity/SpaceDragon/Assets/SpaceDragon/Editor/Dogfight/DogfightEnvironmentArt.cs`. Derivatives: `Assets/SpaceDragon/Dogfight/Generated/EnvironmentArt/`. These assets are procedural local work, not external generated media, photographs or a Blender resculpt. Original imported dragon/planet/nebula files remain intact. The existing builder reproduces the scene; rollback removes the two EnvironmentArt calls, restores sky exposure and rebuilds.

## Verification

**IMPLEMENTED / VERIFIED for these local checks; screenshot appearance inspected, owner art approval pending.** Gameplay feel approval is the owner's statement, not inferred from automation.

- Final `powershell -ExecutionPolicy Bypass -File tools/unity/run-dogfight.ps1 -Action web`: PASS, `artifacts/unity/dogfight-web-20261031-182040-110-17648.log`. Unity 6000.6.7f1, Development Web player, shared settings restored. Created 2026-10-31T18:24:38.3212440Z; 122,416,418 uncompressed bytes; 213.35 seconds. Receipt SHA256 `9eacc6bd8662cfe83572198a30806bb6f7d53d418ac9773006259f7e54ce5587`.
- `node tools/unity/verify-dogfight.mjs artifacts/unity/dogfight-art-playtest`: **11/11 PASS**, final run `2026-10-31T18-24-59-973Z`. Installed Chrome on Lenovo/AMD Radeon, actual WebGPU.
- `$env:SPACE_DRAGON_DOGFIGHT_WEBGL2='1'; node tools/unity/verify-dogfight.mjs artifacts/unity/dogfight-art-playtest-webgl2`: **11/11 PASS**, run `2026-10-31T18-26-56-786Z`, actual OpenGLES3. Both runs have sixteen screenshots, zero page/console errors, zero failed/external requests, and unchanged localStorage sentinels. Fixture conditions are explicitly recorded; actual inputs/simulation resolve results.
- Flight/mouse modes, independent targeting, boost/evasion, missiles/plasma, salvage, repair completion/interruption/cap, live spelling/breath, pause, physical rock collision, loss and restart all pass. No new game rules were introduced. Earlier 69 EditMode tests and npm wrapper remain SD-075 evidence; not rerun for this presentation-only change.
- `python tools/check_foundation.py` and scoped `git diff --check`: PASS. Foundation does not establish gameplay.
- First build invocation safely declined while Town Drive owned the Editor. Retry after its exit succeeded in 409.54 seconds; its 11 Chrome checks passed in `2026-10-31T18-18-40-824Z`. Screenshot review found overly uniform bright rings; the final derivative lowers their intensity and varies density. A static soft planet-shadow calculation follows the fixed sun/ring geometry; this angle does not show a prominent ring shadow. No claim of general dynamic shadowing.
- [Before/after and interaction gallery](../../artifacts/unity/dogfight-art-review.html). Both final backends' natural-flight screenshots were inspected, alongside collision and beam/repair coverage. Same test/view size, but poses/headings differ; not a pixel-aligned comparison.
- [Generated asset hashes](../../artifacts/unity/dogfight-art-assets.json). Original dragon GLB hash remains `1446d3c3c9606a61ad8d871473ce5b1242107c0a6d52b59c795102adb74f853c`.

## Measurements

Ten seconds of natural flight after warm-up, 1366×768 / DPR1 / render scale1 / 2× MSAA. Wall-clock update intervals, not GPU timings or endurance. Same installed AMD renderer; ordinary desktop load was not experimentally controlled.

| Backend | Mean interval | Approx. fps | p95 | Last-frame draws | Rendered triangles | Unity texture allocation |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| WebGPU | 17.09 ms | 58.5 | 20.00 ms | 411 | 283,180 | 1.161 MiB |
| WebGL2 | 16.83 ms | 59.4 | 18.00 ms | 411 | 283,978 | 71.753 MiB |

SD-075 baseline: about 59 fps, 410 draws, 282,668 rendered triangles. Added ring: one renderer / 512 unique triangles; last-frame counts also vary with combat. No geometry/collider density was increased for rocks. WebGL2 texture allocation rises from 70.376 to about 71.753 MiB. WebGPU underreports allocations relative to WebGL2; neither counter is exact driver VRAM. WASM heap remains unavailable.

The final local gzip response bodies total 36,166,955 bytes on WebGPU, versus 32,565,654 in SD-075. Uncompressed build grows about 10.06 MB. These are complete development artifacts with concurrent shared-project code, not isolated texture-only cost. Release stripping/download optimization and sustained-device testing remain separate.


## Limits

This is a bounded scenery/material pass. Original asteroid silhouettes, drone art, dragon geometry, effects and HUD remain prototypes at their previous fidelity. Thin ring gaps show some aliasing, particularly on WebGL2; rings have a fixed planetary-shadow term, not dynamic self-shadowing. Original rocks still have stylized lumpy silhouettes. Next useful art work is better rock silhouettes and dragon wing/armor surface detail, with the same gameplay baseline. Human approval, sustained/fullscreen performance, standalone/controller coverage and release remain separate. No deployment, purchase, commit or push.
