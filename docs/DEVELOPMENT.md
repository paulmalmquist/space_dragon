# Local development

Paul can use chat, [the inbox](../ideas/INBOX.md), or the notebook opened by `Start Space Dragon.cmd`. Agents own the commands below. See [AGENTS.md](../AGENTS.md) and [current status](project/STATUS.md) first.

## Reproduce the workspace

Node 24 LTS and Python 3.10+ are required. On this Windows machine both are already present.

```powershell
npm.cmd ci
npm.cmd run browser:install
npm.cmd run doctor
npm.cmd start
```

The server binds to this computer at `http://127.0.0.1:5173/space-dragon/`. Stop it with Ctrl+C. The launcher performs `npm ci` if its Vite dependency is missing. If port 5173 is already in use, use that running workspace or stop it before starting another. It will not silently switch ports.

The optional Windows media-tool setup is `powershell -NoProfile -ExecutionPolicy Bypass -File tools/setup-tools.ps1`. See [toolchain](TOOLCHAIN.md) for user-local installs, checksums, platform requirements, and optional art applications.

## Verify a change

```powershell
npm.cmd run check
```

This runs pure TypeScript state/save unit tests, type-checks, builds, runs development and production browser flows, and verifies all 18 family-photo references. `npm.cmd test` runs development browser checks; `npm.cmd run test:production` uses the built preview; `npm.cmd run test:unit` needs no browser. Development tests launch their own server on port 5175 and write notebook captures to ignored `artifacts/test-inbox.md`; they must never reuse the real notebook server or modify `ideas/INBOX.md`. Production tests launch a separate preview on port 4177.

Browser checks exercise actual WebGL rendering with Chromium/SwiftShader, checkpoint completion/reload/reset, malformed and unsupported saves, unavailable storage, idea persistence/error recovery, origin rejection, source-reference serving restrictions, and a narrow touch viewport. Screenshots, retained failure traces, and a development state sample are written under ignored `artifacts/`. SwiftShader timing and viewport emulation are not physical-device GPU results.

For a production artifact, run `npm.cmd run build`, then `npm.cmd run preview` and open `http://127.0.0.1:4173/space-dragon/`. The notebook button and file-writing endpoint are development-only. `dist/` is an isolated static game build; it does not contain the idea inbox, reference photos, or editable sources. Do not copy the repo root to a public web directory.

## Runtime layout

| Path | Responsibility |
| --- | --- |
| `src/main.ts` | Guided First Contact UI and development notebook |
| `src/game/scene.ts` | Small Babylon scene and rendering lifecycle |
| `src/game/checkpoint.ts` | Versioned local save validation and recovery |
| `tools/dev-idea-inbox.ts` | Loopback/origin-checked development append endpoint |
| `vite.config.ts` | `/space-dragon/` base path, private-source deny rules, isolated test inbox |
| `public/` | Explicitly promoted browser assets only |
| `assets/` | Source/reference/candidate workspace; not an automatic runtime directory |

The home environment and suit silhouettes are provisional. The pod now uses an actual Blender GLB with ETC1S KTX2 texture, articulated lid, same-origin decoders and an explicit [runtime manifest](../public/assets/manifest.json). See [the pod receipt](reports/2026-10-29-pod-asset.md). Full physics, character controllers, follower AI, final audio production, backend services, and account systems are deferred until their gameplay needs are concrete.

During development, `window.__SPACE_DRAGON__.snapshot()` returns the current step, checkpoint, frame sample, mesh/triangle counts, and WebGL version. This is an observation interface, not a remote control or a performance acceptance result. It is absent from production builds.

## Third-person exploration

**Walk around** starts a separate practice mode; First Contact remains selectable. WASD/arrows move, Space/Enter interacts nearby, left-drag or Q/E orbits, R recenters and Escape pauses. A provisional articulated person walks through the open doorway into a fenced yard. Walls, desk, sofa, pod and boundaries block walking; the low cutaway walls let the camera see the person. The garage is a backdrop, not an accessible interior.

`src/game/navigation.ts` owns position, collision/sliding, proximity and once-only practice collection; `src/game/exploration-save.ts` validates and recovers its independent save. The scene presents state and emits updates; the UI persists movement boundaries and periodic progress. The exploration key is `space-dragon.exploration.v1`, with a `.backup` predecessor. The prototype pickup is not a story reward. First Contact saves remain untouched by exploration/reset.

`tests/navigation.test.ts` adds pure navigation/persistence cases, `tests/navigation.spec.ts` drives real movement and interactions, and `tests/navigation.production.spec.ts` checks the built mode without developer APIs. Both Playwright configs include the new tests, so the existing GitHub game job exercises them. The debug snapshot's `navigation` field exposes state, nearby target, camera/focus positions and movement; it offers no teleport setter. See [the navigation decision](decisions/2026-10-29-third-person-navigation.md) and [future video guide](REFERENCE_HOME_VIDEO.md).

Save schema v2 lives in `space-dragon.checkpoint.v2`, with its last valid predecessor at `space-dragon.checkpoint.v2.backup`. It holds script phase, ordered suit IDs, validated flags, hint/scan-assistance state and the checkpoint ID. [state.ts](../src/game/state.ts) is authoritative and has no DOM/renderer/storage dependency; [checkpoint.ts](../src/game/checkpoint.ts) owns validation/migration/recovery. V1 saves at `space-dragon.checkpoint.v1` are upgraded conservatively and retained. Future-version saves are preserved until deliberate reset; unavailable/quota-limited storage falls back to the current visit with an honest notice. Notebook drafts use a separate key and remain in the form when a write fails. There is no cloud synchronization or learning assessment.

Restarting a progressed sequence requires confirmation; cancel preserves the current checkpoint. Keyboard is the confirmed first input. The automated narrow touch check is extra layout/input evidence, not a change to the owner's deferred-touch decision or a physical-device support claim.

Choose Start with sound for the browser's placeholder computer narrator, or Play quietly. Arrows point; Space/Enter acts; H replays speech; F1/? advances the hint ladder; Escape pauses. Blur/tab loss also pauses. Less motion follows the system preference and can be toggled. The final hint points out the target and makes one Action complete together. Narration is captioned, no family voice is cloned, and no microphone is used. Check actual audibility on the named Lenovo/Chrome target with [the family playtest sheet](PLAYTEST_FIRST_CONTACT.md).

## Integration still to resolve

Keep the `/space-dragon` URL prefix. This is a standalone local client, not a replacement homepage. The public host currently returns unexpected content and the game route was 404 during inspection; the website's actual source, routing, deployment, and Railway services remain unidentified. Audit them before integrating. Keep frontend engine decisions separate from the host UI framework; Babylon does not require replacing an existing site framework.


## Town Drive Lab — SD-046

Run `npm.cmd start`, then open `/space-dragon/drive/` (or use the Town Drive Lab link). The home entry and First Contact remain available. Keyboard: W/arrows throttle, S/down brake/reverse, A/D or left/right steer, Space handbrake, C camera, R checkpoint reset, M map, Esc pause, F2 handling. Standard mapped controller: R2 throttle, L2 brake/reverse, left stick steer, Cross handbrake, Triangle reset, R1 camera, Options pause. Physical-pad support remains NOT TESTED.

Chase, dashboard and orbit modes are available. Choose Assist, optional turn chimes and less camera motion before starting; F2 pauses to adjust session handling and Assist. Saves use only `space-dragon.drive.v1` and its backup. Completing the loop sets one completion flag; no campaign or learner rewards are granted.

Local development loads an optional ignored house layout through a fixed loopback-only endpoint. CI and production use `src/game/drive/fictional-house.json`. All original footage, redacted contact sheets, reconstruction evidence and reference comparisons stay under ignored local paths. See the [decision](decisions/2026-10-30-town-drive-lab.md) and [receipt](reports/2026-10-30-town-drive-lab.md). Never put private files in `public/`.

With a dev server on5182 and the local reference anchors present, run `node tools/town-drive-compare.mjs --url http://127.0.0.1:5182/space-dragon/drive/ --every 250`. It creates a new local-only HTML comparison folder; no frames load in the game. `tools/town-drive-reference.py` and `tools/town-drive-spike.py` reject existing output folders and destinations outside `assets/reference/local/`; the latter requires the isolated PyCOLMAP environment documented in the local spike receipt.
