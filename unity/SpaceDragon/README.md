# Space Dragon Unity production candidate

The separate [Launch Lab](LAUNCH_LAB.md) adds the SD-073 live/video cinematic rehearsal and safe-flight handoff. Its build and verification commands are isolated from the First Contact comparison below.

This is an isolated Unity First Contact candidate alongside the Babylon reference. It contains the same original rescue-pod v002 export, matching room/yard dimensions, a provisional capsule player and one local pod interaction. It does not read or migrate Babylon saves, replace the existing website, or deploy anything.

[SD-072](../../docs/decisions/2026-10-31-unity-channel-alignment.md) selects this existing Unity/C# project for forward production work. Coordinate exclusive Editor/build ownership and retain Babylon/Three.js as behavior references while features migrate. Verified local scope now includes the First Contact comparison and the separate [LaunchLab proof](../../docs/reports/2026-10-31-unity-launch-cinematic.md): live/video launch, bounded safe flight, WebGPU/WebGL2 checks and real headed focus recovery. This does not establish full Dragon Dogfight/combat parity or campaign migration; consult the [dragon/Dogfight handoff](../../docs/engineering/UNITY_DOGFIGHT_HANDOFF.md) for that independently owned work.

LaunchLab's [own instructions](LAUNCH_LAB.md) isolate its prepared inputs, scenes, output and server. With its server running, `node tools/unity/verify-launch-focus.mjs` launches a dedicated ordinary Chrome window for the narrow actual-focus test; foreground that game window before startup readiness if Windows leaves it occluded. The passing run needed one startup activation, followed by automated tab-switch/resume assertions. Its default CDP context preserves real focus behavior, with screenshots/state evidence and no final-probe video. Full live/video recordings are in the main LaunchLab browser receipts. This remains provisional art, with subsequent video authoring following [SD-076 Google Vids manual exports](../../docs/decisions/2026-10-31-google-vids-manual-exports.md). Runway is parked; native launch/physical controller/human audio-quality checks remain separate.

The target is **Unity 6000.6.7f1**, URP **17.6.0**, Input System **1.20.1** and Unity glTFast **6.20.0**. `Packages/manifest.json` pins direct dependencies; the Editor writes `packages-lock.json` after resolution. The installed Editor and generated receipt, rather than this target alone, establish what actually ran. The project requires a local Unity license and Web Build Support for its browser build.

## Reproduce the candidate

From the repository root, verify the supplied candidate inputs and use the batch entry point:

```powershell
node tools/unity/prepare-assets.mjs --verify
powershell -NoProfile -ExecutionPolicy Bypass -File tools/unity/run.ps1 -Action setup
powershell -NoProfile -ExecutionPolicy Bypass -File tools/unity/run.ps1 -Action test
powershell -NoProfile -ExecutionPolicy Bypass -File tools/unity/run.ps1 -Action web
powershell -NoProfile -ExecutionPolicy Bypass -File tools/unity/run.ps1 -Action windows
```

Run those operations sequentially; only one Editor may own this project. `run.ps1` discovers the pinned installation through Unity CLI or accepts `-EditorPath`, verifies asset hashes, writes a fresh log/test-result filename and rejects stale setup/build receipts. It needs an activated local Unity license and the requested build module. Setup, **11 EditMode tests, Web/Windows builds and WebGPU/WebGL2 browser checks** have run successfully; the latest [receipt](../../docs/reports/2026-10-31-unity-production-candidate.md) records encoding, runtime and native limitations separately.

`--verify` needs only the prepared `Imported/` files and their receipt, so a checkout does not need ignored Blender exports or the original HDR folder to validate/build this candidate. Re-run `node tools/unity/prepare-assets.mjs` **without** `--verify` only when those local source inputs are available and new derivatives are intentionally being prepared; it refuses to replace differing existing output bytes.

Setup creates the reviewable URP renderer/pipeline, scene, materials, volume profile and build-scene list through Editor APIs. Generated asset files are never handwritten YAML. It replaces only the generated candidate scene and generated settings; keep authored scene experiments elsewhere. The optional Editor menu **Space Dragon → Generate First Contact candidate** calls the same entry point, but the verified setup/test path used batch commands without manual Editor steps.

After a successful Web build, serve and inspect it locally:

```powershell
node tools/unity/serve.mjs
# In a second terminal, after the server is ready:
node tools/unity/verify-browser.mjs artifacts/unity/browser
```

The server binds only to `http://127.0.0.1:5194/space-dragon-unity/` and serves only `Builds/Web`. `SPACE_DRAGON_UNITY_PORT` changes its port; `SPACE_DRAGON_UNITY_URL` points the verifier at a matching local URL. The verifier uses installed Chrome and records actual backend, keyboard interaction, screenshots and short frame samples. `SPACE_DRAGON_FORCE_WEBGL=1` requests the fallback test; actual `OpenGLES3` plus unavailable WebGPU-adapter observations establish the passing fallback. Physical PlayStation testing is owner-deferred/NOT TESTED.

The completed [comparison gallery](../../artifacts/unity/comparison.html) links the browser, native, Babylon production-load and process-memory observations. With the respective local servers running, the auxiliary commands are:

```powershell
node tools/unity/measure-babylon-load.mjs artifacts/unity/babylon-production-load.json
node tools/unity/measure-browser-memory.mjs artifacts/unity/browser-memory.json
node tools/unity/render-comparison.mjs
```

Run GPU measurements sequentially with no concurrent Editor build or other benchmark. Process memory uses isolated browser instances and labels private committed/resident bytes separately; it is not GPU memory or a peak-memory test. Check each script's URL/port environment options before measuring a differently configured localhost server.

After a successful Windows build, run the bounded native rendering sample:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/unity/benchmark-windows.ps1
```

This opens a **visible game window**, waits for visual readiness, measures about ten seconds at a fixed 1280 × 720 arrival view, saves JSON/screenshot evidence in a new timestamped folder and exits. It disables candidate checkpoint reads/writes/rewards and is not an interactive gameplay test. The earlier batch-player attempt timed out waiting for its reflection capture; that failed report is preserved. The successful sample needs the visible graphics window, so do not reintroduce `-batchmode` or `-nographics` for this player measurement. Editor setup/build commands can still run in batch mode.

The two build entry points are `SpaceDragon.Editor.FirstContactProject.BuildWeb` and `SpaceDragon.Editor.FirstContactProject.BuildWindows`. Launch the former with `-buildTarget WebGL`, the latter with `-buildTarget Win64`. Both regenerate the candidate, build only `Assets/SpaceDragon/Generated/FirstContact.unity` and fail if the build does not succeed. Browser output is `Builds/Web`; desktop output is `Builds/Windows/SpaceDragon.exe`. Use a localhost HTTP server for the browser build, not a `file://` URL.

Web graphics are explicitly ordered **WebGPU, then OpenGLES3 (WebGL2 fallback)**. Desktop uses Direct3D11 as the initial comparable device path. Unity's build-file compression is disabled, preserving ordinary `.wasm`/`.data` outputs. The local helper now precompresses eligible files in memory before accepting traffic and sends standard HTTP gzip when the browser accepts it; build bytes remain unchanged. `SPACE_DRAGON_UNITY_HTTP_COMPRESSION=none` reproduces the retained raw-delivery baseline. This separates output size from encoded network transfer and makes the load comparison fairer to Vite preview's gzip. No deployment or hosting configuration changed. The custom `SpaceDragon` template and browser bridge live outside the gameplay-state module.

## Preserved source and visual meaning

- `Imported/rescue-pod-v002.glb` is the 537,228-byte original uncompressed v002 export. Babylon's 463,644-byte runtime variant has the same model with a KTX2 texture; this candidate deliberately uses the original PNG texture to avoid mixing decoder integration with the renderer comparison. Names, mesh count, triangle count and `pod_open` clip are inspected at setup.
- The glTFast Editor importer produces native Unity meshes/materials/clips. The required `hinge_pod_lid` and `pod_open` remain addressable. The runtime samples the authored clip; presentation does not grant rewards.
- glTFast 6.20 reports `KHR_materials_emissive_strength` unsupported. Setup reads that extension from the unchanged source GLB, clones only the affected imported material into `Generated/`, and applies the exact linear emissive-factor × strength product. It resets the clone from the imported subasset on every run to prevent multiplying the correction twice. The setup receipt records source/imported/effective values, shader and affected renderer slots; the original GLB and imported subasset remain unchanged.
- The four CC0 surface sets and photographed HDR come from the existing local runtime/source inventory. `Imported/asset-receipt.json` records provenance, original hashes and transformations. WebP albedo/normal maps are decoded to PNG. Dielectric roughness green is converted into the inverse smoothness alpha expected by URP/Lit; normal and data maps import as linear data.
- The HDR is the exact source used for Babylon's prefiltered `.env`. Unity convolves its own cubemap from that HDR, then a single 512-pixel sky-only reflection probe captures the rotated skybox at runtime. Its culling mask excludes all scene geometry, its influence covers the scene and it does not refresh during play. Runtime readiness waits for that capture's completion ID before measuring frames; the unrotated imported cube is only a startup fallback. Both engines use a subdued daylight source for the provisional night treatment. Their filtering, lighting and tone-mapping implementations differ; visually similar settings are not a claim of identical rendered pixels.
- This remains a generic dollhouse room/yard. No family photos, private home footage, child records or editable Blender sources enter the player build. The capsule is explicitly a proxy, not an approved family likeness.

The scene uses a directional moon key, warm practical lamp, cyan pod light, environment reflections, soft directional shadows, fog, ACES tone mapping and restrained bloom. Depth of field, motion blur, chromatic aberration, multiplayer and backend dependencies are absent from this bounded proof.

## Verification boundary

`Builds/setup-receipt.json` records the actual Editor, imported mesh/triangle counts, clip and Web graphics order. Each build produces its own `build-receipt.json`. Runtime snapshots measure the current renderer and frame intervals; the comparison harness must record viewport, quality, input path, named hardware, download size, loading time, median/p95 frame time and screenshots.

A successful import/build establishes technical construction. It does not establish better art, sustained hardware performance, physical PlayStation-controller behavior, family suitability or approval for release. Those results belong in the task's dated verification receipt after observed runs.

## Authoritative references checked

- [Unity 6.6 release family](https://unity.com/releases/editor/whats-new/6000.6.0f1) and [Unity 6.6 URP documentation](https://docs.unity.com/en-us/engine/6000.6/manual/render-pipelines/universal-render-pipeline/urp-introduction).
- [Web graphics ordering and fallback](https://docs.unity.com/en-us/engine/6000.6/manual/platform-specific/webgl/develop/class-player-settings-web-gl) and [WebGPU API enum](https://docs.unity.com/en-us/engine/6000.6/script-reference/unityengine/rendering/graphicsdevicetype/webgpu).
- [Unity glTFast Editor import](https://docs.unity3d.com/Packages/com.unity.cloud.gltfast@6.19/manual/ImportEditor.html); stable 6.20.0 and Unity 6000.0 minimum verified through the [official package registry](https://packages.unity.com/com.unity.cloud.gltfast).
- [Input System 1.20.1 documentation](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.20/manual/index.html), with exact version and Unity 6000.0 minimum checked against the [official registry](https://packages.unity.com/com.unity.inputsystem).
