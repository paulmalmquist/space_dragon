# Local production foundation

Date: October 29, 2026. Source: the owner's request to inventory the repository, accept unordered ideas, install useful tools, and create what is needed to start. This decision records engineering choices made under that authorization. It does not approve new story lore or final artwork.

## Selected now

- `ideas/INBOX.md` accepts original thoughts without a user-maintained template. `AGENTS.md` tells agents to route them into canonical documents, track dependencies, preserve conflicts, and update project status. The browser notebook is another input to that same inbox. Capture alone does not launch an agent.
- Babylon.js + TypeScript + Vite provide an isolated browser-game foundation. The initial spec's Three.js entry was a proposal; there was no runtime to preserve or migrate in this repo. The host website source is still unidentified, so this does not choose or change that site's UI framework.
- A small guided First Contact prototype exercises the computer, interrupted signal, backyard pod, one interaction, and local checkpoint. Scene geometry and staging are provisional. It is a technical starting point for the story, not the promised finished visual quality.
- Start with Babylon's WebGL renderer. Observe the actual WebGL version in the development snapshot. WebGPU, Havok, expensive effects, and fixed asset budgets await concrete content and measurements on named devices.
- Node 24 LTS is already installed. Dependencies are exact-pinned in `package-lock.json`, including Babylon 9.33.0, Vite 8.3.5, TypeScript 7.0.2, Playwright 1.64.1, and glTF Transform 4.5.1. No global JavaScript framework install is needed.
- Git LFS is initialized locally and attributes cover future large editable media/model formats. Existing authorized photo files were not rewritten into LFS history. Editable sources, private local references, candidate exports, and promoted runtime assets have separate destinations.
- FFmpeg/FFprobe and Khronos KTX tools are installed for the current Windows user. Blender was already installed. Optional paid authoring applications and cloud services are deferred until they address a specific need.

## Evidence and constraints

[Current status](../project/STATUS.md) records the final verification results. [The inventory](../REPO_INVENTORY.md) distinguishes observed machine/repo/site facts from open integration questions. [The toolchain](../TOOLCHAIN.md) records installation paths and checks; [the asset pipeline](../ASSET_PIPELINE.md) defines model/media preparation.

The local app binds to loopback, source references are denied by the dev server, and the production artifact includes only referenced runtime modules and `public/`. The notebook endpoint exists only in development, validates origin/content limits, and appends captures without replacing prior ideas. Automated notebook tests use a separate ignored file.

The story and photo-publication decisions retain their existing authority. No town, complete character, dragon rig, public deployment, Railway database, online save, or multiplayer system is established by this setup.

## Primary technical references checked

- [Babylon ES module packages](https://doc.babylonjs.com/setup/frameworkPackages/es6Support/) support typed modular engine/loader installation.
- [Vite getting started](https://vite.dev/guide/), [base-path builds](https://vite.dev/guide/build), and [asset handling](https://vite.dev/guide/assets) support a standalone prefixed game artifact.
- [Playwright browser installation](https://playwright.dev/docs/browsers) documents project-version browser binaries and platform requirements.
- [glTF Transform CLI](https://gltf-transform.dev/cli) and [Khronos KTX Software](https://github.com/KhronosGroup/KTX-Software) support the asset preparation tools. See the toolchain for the installed release verification.
