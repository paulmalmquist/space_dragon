# Space Dragon toolchain

Audit and setup: **October 29, 2026**. Run `npm run doctor` for the current machine's actual results. Version numbers here describe this setup, not a promise that every future machine has the same software.

## Ready on this computer

| Tool | Verified version | Role and installation evidence |
| --- | --- | --- |
| Git | 2.54.0.windows.1 | Existing source control; no upgrade needed for this task. |
| Git LFS | 3.7.1 | Existing binary tooling; the repo's attributes define which future source-art files use LFS. |
| Node.js / npm | 24.15.0 / 11.12.1 | Existing JavaScript runtime. Project versions belong in `package-lock.json`. |
| Python | 3.14.4 | Existing runtime; the reference verifier uses the standard library. |
| Blender | 5.2.1 LTS | Existing `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`; the CLI runs. |
| FFmpeg / FFprobe | 9.0.1 Essentials | Installed for the current user through WinGet; both version commands passed. |
| Khronos KTX / toktx | 4.4.2 | Official release payload extracted into the user's local tools folder; both version commands passed. |
| 7-Zip | Existing installation | Used to extract KTX; no replacement installed. |

Blender's live MCP connection **did not connect** during this setup. The returned error says Blender/add-on was not running. Installing Blender and running its CLI do not establish MCP connectivity. Open Blender and start its existing MCP add-on before an asset-editing session; inspect the live scene before changing it.

The project adds Babylon.js and its glTF loaders, TypeScript, Vite, Playwright, and glTF Transform as **project-local npm dependencies**. `package.json` and `package-lock.json` are the version authority. `npm ci` reproduces them; global npm installations are unnecessary.

## Repeatable setup

From the repository root in PowerShell:

```powershell
npm ci
npm run browser:install
.\tools\setup-tools.ps1
npm run doctor
npm run check
npm start
```

On Windows installations that intercept `npm.ps1`, use `npm.cmd` with the same arguments. The repository launcher also starts the local workspace. The scripts do not provision hosting or request an account.

`setup-tools.ps1` is for **Windows x64**. It skips an existing FFmpeg install, otherwise installs `Gyan.FFmpeg.Essentials` through WinGet with `--scope user`. It installs a pinned KTX 4.4.2 tool payload under `%LOCALAPPDATA%\SpaceDragon\tools\KTX-Software-4.4.2\bin`, preserving the bundled documentation. The downloaded release's SHA-256 must equal `1f323b0fec19794f5e6c0425a61d4b1da396872a10be862d105f4f4b2d2957fe` before extraction. Its original installer requests admin rights, so the script uses an existing 7-Zip installation to extract the tools and DLL instead of running the installer. Missing 7-Zip produces an actionable error. Downloads and extracted tools stay outside Git.

The script adds tool directories to the **user PATH**, without replacing existing entries. Restart other terminals to inherit changes. `setup-doctor.ps1` can find Blender, WinGet FFmpeg, and our user-local KTX folder even when the launching process has an older PATH. `-SkipFFmpeg` and `-SkipKTX` allow a partial setup. Re-running the full script on this computer passed without reinstalling either tool.

For another platform, use the official download links below and keep npm dependencies local to the project. The PowerShell installer intentionally does not attempt cross-platform package management.

## Verified media preparation

A synthetic, 16 × 16 PNG was generated with FFmpeg, compressed with `toktx --t2 --encode etc1s`, and accepted by `ktx validate` with exit code 0. This checks that the encoder and runtime DLLs actually work; it is not a game-asset quality or performance benchmark. Fixtures live outside the repository in `%LOCALAPPDATA%\SpaceDragon\verification`.

Use [the art pipeline](ASSET_PIPELINE.md) for source folders, export contracts, reference-video frames, and model inspection. Keep editable Blender sources, candidate exports, reviewed assets, and runtime delivery distinct. Always inspect a compressed asset in the browser before promoting it. Preserve dragon assembly components and pivots during optimization.

## Tools to add when their job arrives

| Tool or service | Timing |
| --- | --- |
| PureRef | Optional visual-board app. A folder plus annotated reference notes is enough to start; choose its license when an art session needs it. |
| Krita | Optional paintovers, decals, and texture corrections; not needed for the scaffold. |
| Substance 3D Painter | Optional paid texturing workflow after one pilot asset exposes a real need. |
| Spector.js | Add when inspecting a concrete WebGL scene. Its WebGL inspection is distinct from WebGPU tooling. |
| Havok | Add when the chosen gameplay needs physics; the initial interactions do not. |
| Mixamo / motion capture / scanning | Evaluate for a specific animation or physical object. A custom dragon needs a suitable custom rig. |
| Railway / asset storage | Plan against the actual website and asset sizes. No cloud service, paid plan, database, or public deployment was created. |

No extra sculpting suite, GPU purchase, paid subscription, or system-wide Node/Python upgrade is needed to begin.

## Unity candidate setup — October 31, 2026

[SD-083](decisions/2026-10-31-unity-production-candidate.md) establishes the First Contact comparison project; later [SD-072](decisions/2026-10-31-unity-channel-alignment.md) selects this existing Unity/C# project for forward production work, with Babylon/Three retained as references. Unity Hub **3.22.5.65535**, Unity CLI **1.0.0-beta.15** and Editor **6000.6.7f1** are installed locally. `unity editors path 6000.6.7f1 --json` resolves `C:\Program Files\Unity\Hub\Editor\6000.6.7f1`; after the owner signed in, the CLI activated Unity Personal. No credentials are stored in the repository.

The actual batch setup imports the original pod, generates URP 17.6.0 settings/scene and records 38 meshes/6,376 triangles with the required nodes/clip; **11 EditMode tests, Web/Windows builds and actual WebGPU/WebGL2 keyboard browser checks pass**. [The receipt](reports/2026-10-31-unity-production-candidate.md) records matched short 720p AMD samples, visible Windows rendering, gzip delivery and measured browser process memory. Web output is 58,779,167 bytes uncompressed, with 25,903,238 initial gzip body bytes; Windows output is 122,559,196 bytes. Physical PlayStation is owner-deferred/NOT TESTED; native gameplay, human final quality and sustained performance remain open. Hub/license installation alone is not build or performance evidence.

Use `powershell -NoProfile -ExecutionPolicy Bypass -File tools/unity/run.ps1 -Action setup` (or `test`, `web`, `windows`) from the repo root. The wrapper verifies already prepared asset bytes, resolves the pinned Editor, runs without manual Editor UI steps and requires fresh result evidence. Pass `-EditorPath` only to use an explicitly inspected executable. The [candidate README](../unity/SpaceDragon/README.md) gives the full local workflow. A fresh checkout with `Imported/` files can use `node tools/unity/prepare-assets.mjs --verify`; rebuilding derivatives without `--verify` additionally needs the ignored original export/HDR inputs.

## Hardware context

This is a Lenovo 82XM with an AMD Ryzen 7 5825U (8 cores / 16 logical processors), about **13.84 GiB of visible RAM**, and integrated AMD Radeon Graphics. Windows reports a 2 GiB adapter value; that is not a reliable dedicated-VRAM budget for this shared-memory GPU. Treat this machine as an important practical benchmark and start with compact scenes and scalable effects. Desktop 60 fps remains a **target to measure**, not an achieved result. The [confirmed first input is keyboard](decisions/2026-10-29-keyboard-first-input.md); Xbox support is opportunistic and untested, and touch is deferred. The named player computer/browser still needs confirmation. A reduced mobile 30 fps goal can be revisited if mobile enters scope.

## Official references

- [Babylon.js documentation](https://doc.babylonjs.com/) — runtime and rendering capabilities.
- [Vite guide](https://vite.dev/guide/) and [TypeScript documentation](https://www.typescriptlang.org/docs/) — local application toolchain.
- [Playwright browser installation](https://playwright.dev/docs/browsers) — test-browser setup.
- [glTF Transform CLI](https://gltf-transform.dev/cli) — model inspection and optimization.
- [Khronos KTX Software](https://github.com/KhronosGroup/KTX-Software) and [the pinned release](https://github.com/KhronosGroup/KTX-Software/releases/tag/v4.4.2) — official texture tools and payload.
- [KTX tool reference](https://github.khronos.org/KTX-Software/ktxtools/ktx.html) — KTX2 inspection and validation.
- [FFmpeg downloads](https://ffmpeg.org/download.html) — links to Windows binary providers; [Gyan's builds](https://www.gyan.dev/ffmpeg/builds/) documents the Essentials distribution and WinGet option used here.
- [Blender glTF exporter](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html) — supported export behavior.
- [Git LFS](https://git-lfs.com/) — large source-art file handling.
