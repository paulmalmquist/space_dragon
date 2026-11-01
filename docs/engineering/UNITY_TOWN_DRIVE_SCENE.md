# Detailed Town Drive scene in the shared Unity project

October 31, 2026. This is the implemented workflow for the [SD-074 scene continuation](../decisions/2026-10-31-unity-town-drive-scene.md), following the [foundation](../decisions/2026-10-31-unity-town-drive-foundation.md) and [visual handoff](UNITY_TOWN_DRIVE_HANDOFF.md). The [verification receipt](../reports/2026-10-31-unity-town-drive-scene.md) records portable checks, 18 Unity core/adapter/runtime cases, four generated-scene checks, the actual Development Web build, complete route/reload, both browser backends and focus recovery. Human visual quality and release approval remain separate. The shared Unity foundation is now integrated in main through PR #30. The November 1 surface/landscape continuation builds on that integrated tree; the original October 31 counts below describe their historical artifact.

## Project and ownership

Use **`C:/Projects/space_dragon/unity/SpaceDragon`**, the existing shared project. The authoring worktree holds task-owned source and export files; it must not bootstrap a competing Unity project. Prerequisites are Unity **6000.6.7f1**, URP **17.6.0**, glTFast **6.20.0**, Input System **1.20.1**, the configured shared renderer, and the already imported `Assets/SpaceDragon/Imported/daylight.hdr` cubemap. Town Drive reads these dependencies; their owning channel manages them.

Only one Editor/build process may use the project. `run-town-drive-scene.ps1` checks process ownership, holds a project lock and detects shared package/settings changes without rolling back another writer. Integrate only reviewed task-owned files. Never launch the Editor while another channel owns it. Preserve the existing `TownDrive/README.md.meta` GUID when copying the updated README.

## Exported source and parity

The route retains metres, **+X east / +Y up / +Z north**, yaw zero toward +Z. The measured neighborhood includes 4 mapped lakes, 83 estimated lots, 26 context street ways and 10 junctions / 11 closures. Estimated houses remain estimates. Original footage and map screenshots stay outside game exports.

`tools/unity/export-town-drive-scene.mjs` constructs the actual Babylon world in an isolated local Chrome authoring page, sweeps every streamed road chunk, and exports complete source geometry before unloading it. It uses pinned `@babylonjs/serializers@9.33.0` and `sharp@0.35.5`; it does not read a save or open Unity. The output is under `Assets/SpaceDragon/TownDrive/Imported`:

| Output | Current inventory |
| --- | --- |
| Geometry | 64 assets: 44 road chunks, 10 junction groups, 3 prepared vegetation libraries, 3 NPC templates, minivan, neighborhood, optional interior and terrain |
| Files/materials | 146 manifest-listed files; 125 material records; shared lossless PNG texture derivatives |
| Placements | 1,302 vegetation **parts**, 157 parked vehicles, 1,564 static collision proxies |
| Expected expanded import | 8,325 mesh components and 1,140,675 triangles across asset prefabs before runtime placement |
| Source preservation | Original vegetation GLBs, two rigged adults/walk clips, source licenses/provenance, source hashes and named anchors |

`sourceMeshCount` / `sourceTriangles` describe Babylon source meshes; `expectedImportedMeshCount` / `expectedImportedTriangleCount` account for glTF instancing expansion and topology. Utility wires are line meshes, not triangles. For example, road chunk 000 has 29 source meshes and expands to 101 imported mesh components. These are geometry checks, not rendered-frame measurements.

LOD metadata reads Babylon's actual `distanceOrScreenCoverage`, sorted nearest-first; it is not inferred from array order. Plant transitions are canopy **72/170/390m**, palm **95/170/390m**, hedge **48/170/390m**. Named mesh LODs retain individual source distances. Prepared vegetation parts have identity local transforms; manifest placements restore original scale/orientation.

The 64 generated GLBs passed Khronos validation with **zero errors**. The 1,074 warnings all concern omitted tangent data on normal-mapped primitives. The pinned glTFast source generates those tangents; the scene importer checks imported normals, tangents and UV0 instead of accepting the warning as proof of material parity. Two additional pedestrian derivatives replace unsupported WebP textures with PNG. Their nine decoded textures match pixel-for-pixel, and mesh/accessor/skin/node/animation data is unchanged. Both originals and derivatives pass with zero errors and four inherited warnings each; provenance records the exact conversion. `--refresh-pedestrians` reproduces these derivatives without rebuilding the world.

## Authoring and portable verification

Run from the repository root with Node 24, installed Chrome, pinned npm dependencies and the .NET 8 runtime/targeting pack:

```powershell
npm.cmd ci
node --experimental-strip-types tools/unity/export-town-drive.mjs --verify
node --experimental-strip-types tools/unity/export-town-drive-ambient.mjs --verify
dotnet run --project tools/unity/town-drive-parity/TownDriveParity.csproj --configuration Release
node tools/unity/export-town-drive-scene.mjs --verify
```

The route exporter checks its recorded source fingerprint; the ambient exporter checks deterministic traffic/signals/pedestrian fixtures. To intentionally regenerate, omit the corresponding `--verify`. Rebuild visual assets with `node tools/unity/export-town-drive-scene.mjs`. Use `--refresh-metadata` only when geometry/source hashes remain unchanged; it re-runs actual builders and updates metadata without GLB/texture writes. `--refresh-counts` recomputes import counts from existing GLBs. Review the manifest diff before accepting any new source baseline.

Copy `town-drive-scene-v001.json` and only its listed files into the live project's TownDrive/Imported directory. Original source copies live under `Imported/Sources~`, which Unity excludes from asset import; the archive remains versioned and hash-verified. This prevents unused original WebP rigs from generating unsupported-import errors. Existing `Sources` archives must be moved only while the shared Editor is idle; preserve every source byte and update the manifest/provenance paths. Import only the prepared geometry and PNG pedestrian derivatives. `--verify` checks bytes/SHA256, expanded counts and positive ascending LODs. Keep metadata/schema and source counts separate from an actual Unity import receipt.

## Import, materials and runtime

The importer configures shared external PNGs before forcing glTF imports, then creates Town Drive material derivatives. It preserves PBR factors, UV tiling, normal scale, emission strength, alpha clipping/blending and double-sided foliage. Additional URP metallic/smoothness maps store effective metallic in RGB and `1 − roughness` in alpha. Glass shadow exclusion and source node visibility/LOD groups are explicit. Seventy visible utility wires retain line topology and are excluded from the unsupported WebGPU line-shadow pass. Seven street-sign materials reuse their base texture for emissive modulation, retaining UV transforms. The owned pipeline uses four-sample MSAA and shadow depth/normal bias 1.5/1; these settings reduce artifacts without claiming photorealism. Imported materials remain immutable inputs.

The existing First Contact pipeline/renderer are immutable prerequisites. Town Drive clones them into its own generated assets and temporarily selects those assets during import/build, restoring the prior settings. The pinned glTFast detection/generator caches are reset through inspected Editor hooks, and imported shaders must support URP. The runtime binds the owned pipeline for the scene lifetime and restores only values it still owns on exit. No other scene's renderer or shared package configuration is rewritten.

Babylon's glTF conversion and glTFast's Unity conversion each flip X. Import acceptance checks vehicle origin/+X/+Z anchors plus mapped spawn, Green Island/Winston and gate/Hypoluxo anchors, rather than adding an unexplained mirror. The complete white minivan retains wheel/steering pivots, disabled cabin detail, local driver eye **(−0.46, 1.42, 0.42)m** and +Z forward. Front glazing uses separate exterior/cabin appearance. Source signals retain IDs for authoritative-clock phase changes.

`TownDriveSession` advances C# driving at 60 Hz; presentation interpolation moves car and camera together. Traffic and pedestrian state stay independent of animation. Runtime bindings include chase/cabin cameras, Q/E look, dashboard/steering/wheels, traffic paint/brake lights/signals and sampled pedestrian walk clips. Current controls are keyboard: WASD/arrows, Space handbrake, C camera, Q/E look, R reset, F assist and Esc/P pause. Focus loss releases input and pauses. Do not infer controller, touch, orbit/drag-look or audio support from the browser reference.

Each pedestrian rig supplies a bounded 60-pose shoe-floor profile. The runtime samples the same animation frame and floor, keeping the shoes at sidewalk height while retaining the authored hips and limbs. Distant walkers use every third pose, matching the source's reduced sampling. Anonymous model ordering is cosmetic rather than exact appearance parity.

Checkpoint persistence uses `space-dragon.unity.drive.v1` and its backup, validates ordered progress, and protects newer save versions. A failed storage read protects writes for the session; pause recovery requires all physical driving keys to return neutral, including opposing keys. It does not migrate browser or campaign saves. Geometry placement and inspection hooks cannot award checkpoints; the full-lap verifier feeds bounded semantic input into the real simulation.

## Editor, build and local player gates

After integration, run from the **live repository root**, with the shared Editor idle:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/unity/run-town-drive-tests.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File tools/unity/run-town-drive-scene.ps1 -Action Setup
powershell -NoProfile -ExecutionPolicy Bypass -File tools/unity/run-town-drive-scene.ps1 -Action TestScene
powershell -NoProfile -ExecutionPolicy Bypass -File tools/unity/run-town-drive-scene.ps1 -Action BuildWeb -ReviewBuild
node tools/unity/serve-town-drive.mjs
```

The test runner requires **18 cases: 10 core, 2 Unity adapter, 6 runtime**. `TestScene` now requires six scene acceptance cases (the original four plus two art checks). Setup creates `Assets/SpaceDragon/TownDrive/Generated/TownDrive.unity` and `Builds/town-drive-scene-setup-receipt.json`. BuildWeb regenerates setup, builds only TownDrive into `Builds/TownDriveWeb`, uses the dedicated template and restores the prior template setting. `-ReviewBuild` enables Development and semantic review inputs; omit it for a build without those inputs. The receipt records the actual mode. BuildWindows is a separate optional action/output; its presence is not Windows-player verification. Logs/results are retained under `artifacts/unity-town-drive*`.

The local server serves only the Web candidate at `http://127.0.0.1:5208/space-dragon-town-drive/`. In another terminal:

```powershell
node tools/unity/verify-town-drive.mjs
node tools/unity/verify-town-drive-focus.mjs
$env:SPACE_DRAGON_TOWN_DRIVE_FULL_LAP = '1'
node tools/unity/verify-town-drive.mjs
Remove-Item Env:SPACE_DRAGON_TOWN_DRIVE_FULL_LAP
```

`SPACE_DRAGON_TOWN_DRIVE_WEBGL2=1` requests a separate WebGL2 fallback run; `SPACE_DRAGON_TOWN_DRIVE_URL` and `SPACE_DRAGON_TOWN_DRIVE_PORT` override the verifier/server address. Full-lap mode requires the development-build review-input hook and adds a semantic-input drive with actual elapsed time, checkpoint order, home completion and reload checks; it does not teleport the vehicle. Reports and screenshots go to `artifacts/unity-town-drive/scene-browser/runs/<timestamp>` by default. An inspection placement is not evidence of completing the drive.

Keep the browser Drive Lab executable as the current visual/behavior reference until the Unity candidate passes its own [receipt](../reports/2026-10-31-unity-town-drive-scene.md). Inspect home/lakes, Winston frontage, gate T, arterial closures, minivan exterior and cabin views; measure the named backend/device separately. Import success, automated player checks, human quality review and release approval are distinct. This migration does not itself establish photorealism, performance improvement or production deployment.


## November 1 surface and landscape continuation

The [new art pass](../decisions/2026-11-01-town-drive-surface-art.md) leaves original imported GLBs and the route/simulation data unchanged. `ApplySurfaceArt` makes 1,192 native mesh derivatives with physically scaled UVs and rebuilt tangents; `ApplyRoofAndWallArt` binds photographed roof/stucco maps; `ApplyGardenArt` builds low original plants inside existing mapped garden beds. Derivatives live under `Generated/SurfaceArt`, `Generated/RoofArt` and `Generated/GardenArt`. Their receipts are distinct from the original import inventory. The source scene remains recoverable through the original manifest and prior commit.

Prepared texture inputs live under `TownDrive/Art/v002`, with source authors/URLs/hashes and CC0 provenance. `node tools/unity/prepare-town-drive-art.mjs --verify` works from a checkout without raw downloads. Regeneration without `--verify` requires the recorded local `assets/source/local/town-drive/surface-v002` originals. Runtime makes no network requests to Poly Haven.

The art pass expands `TestScene` to six cases: the original four plus physical UV/source preservation and persisted art/road-clearance acceptance. Run the guarded BuildWeb, TestScene and actual browser checks sequentially, with exclusive shared Editor access. `node tools/unity/review-town-drive-art.mjs` creates a local observed before/after gallery after the two named player reports exist. The [new receipt](../reports/2026-11-01-town-drive-surface-art.md) owns actual results and remaining appearance/performance limits.

The old route export's fingerprint deliberately includes its original tests. Main commit `308a32d` changed only `tests/drive.spec.ts` among those 40 fingerprint inputs (waiting for rendered frames), so the default frozen-fingerprint guard now refuses current main. All drive source files and native route bytes remain identical. To reproduce that historical export, use `--source-root` pointing to a checkout of source revision `56483d43bc744116dedb5b82dfe89e4f98c62b24`, and `--output-root` pointing to the current checkout, with `--verify`. Do not rewrite the frozen route merely to accept a test-only fingerprint change.

The November 1 browser harness observes the existing asynchronous Unity IDBFS save reaching committed storage before reload, and compares the Town Drive preference file bytes read-only. It does not force synchronization. The existing immediate-reload window and its failing receipt remain explicit in the art report; a completed-write reload pass is not evidence of synchronous storage.

## Foliage, facade and cabin continuation — v003

[The next increment](../decisions/2026-11-01-town-drive-foliage-cabin.md) preserves all original vegetation parts and source assets, hides only the replaced palm leaves, and creates spatially batched crown LODs at the existing anchors. `Generated/FoliageArt`, `ResidentialArt` and `CabinArt` hold owned geometry/material derivatives. Generated receipts keep added geometry separate from the unchanged imported-source inventory. Ten persisted scene tests now cover the combined scene.

`TownDriveRearView` uses the active URP's `SingleCameraRequest` after player/camera/population presentation. Its 320×86 rear-camera-style view is limited to six captures per second, with no catch-up; paused/chase/offscreen views do not capture. Main camera, route state, save logic and shared renderer settings are unchanged. The source side mirrors remain environment-shaded. Cabin textures are original periodic procedural patterns, with source-preserving physical UV derivatives.

The browser verifier now records a separate 240-frame cabin window, confirms live rear captures and checks pause/chase suppression. Actual render orientation and visual quality must be inspected. `review-town-drive-art.mjs <before-report> <after-report> v003` writes a separate gallery without replacing the v002 evidence. See [current results and limitations](../reports/2026-11-01-town-drive-foliage-cabin.md).


## Reference road paint and Blender planting — v004

The [reference-led increment](../decisions/2026-11-01-town-drive-reference-road-assets.md) adds `ApplyRoadArt` and `ApplyReferenceArt` after the retained v003 authoring steps. `Art/v004/reference-art.json` owns measured GLB hashes, LOD names/dimensions and source-provenance hash; the original scene export manifest remains unchanged. `node tools/unity/prepare-town-drive-reference.mjs --source-root <selected-candidate-directory>` promotes the three Blender exports and receipt. A normal checkout uses `--verify` after fetching LFS assets; it does not require the ignored source `.blend` files. Placements share the imported GLB mesh subassets, with per-plant LOD groups and five shared materials. Preserve GLB and material `.meta` files so scene references survive checkout. The source receipt retains its original hash-pinned bytes through an exact `-text` rule.

Run guarded Setup, fourteen TestScene cases, then BuildWeb with exclusive shared Editor ownership. The full-lap player verifier records additional driver-view screenshots at nine road spans using bounded semantic driving, without setting world pose or bypassing gameplay state. Set `SPACE_DRAGON_TOWN_DRIVE_FULL_LAP=1`; the ordinary six-case checks remain available. `review-town-drive-art.mjs <before-full-lap-report> <after-full-lap-report> v004` assembles observed route comparisons and the three locally extracted reference frames. Optional final arguments `<before-short-report> <after-short-report>` keep separate matched timing samples distinct from full-lap screenshots; driven poses are approximate post-capture telemetry. Eight route views pair with the original baseline; the added early taper view is explicitly after-only. An optional final `<hedge-report>` argument after the two timing reports supplies the supplemental stopped hedge report; the gallery checks its player hashes and stopped speeds before including two after-only images. Read [the receipt](../reports/2026-11-01-town-drive-reference-road-assets.md) for actual checks and remaining limits.

The verified v004 Web build uses a temporary 1024 MiB heap ceiling after three measured startup failures at 512 MiB, while preserving the 128 MiB initial allocation and geometric growth settings. `Build` restores the previous maximum/template in `finally`; the guarded runner verifies shared settings bytes afterward. Build receipts record configured values, and browser reports separately sample allocated WASM capacity (646.875 MiB in the final runs, excluding JavaScript/GPU/process memory). Superseded presentation and source vegetation templates remain in the Editor scene as `EditorOnly`; runtime traffic/pedestrian templates stay packaged. Actual WebGPU/WebGL2 startup, keyboard/cabin/save behavior, focus recovery and the full route/reload pass; human art and sustained performance acceptance remain separate.
