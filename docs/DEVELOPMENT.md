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

This type-checks, builds, runs the browser flows, and verifies all 18 family-photo references. `npm.cmd test` runs only browser checks. Tests launch their own server on port 5175 and write notebook captures to ignored `artifacts/test-inbox.md`; they must never reuse the real notebook server or modify `ideas/INBOX.md`.

Browser checks exercise actual WebGL rendering with Chromium/SwiftShader, checkpoint completion/reload/reset, malformed and unsupported saves, unavailable storage, idea persistence/error recovery, origin rejection, source-reference serving restrictions, and a narrow touch viewport. Screenshots, retained failure traces, and a development state sample are written under ignored `artifacts/`. SwiftShader timing and viewport emulation are not physical-device GPU results.

`npm run test:production` builds and verifies the production flow, checkpoint reload and development-feature isolation on its own preview port 4177. It accepts the same optional browser override and writes a local receipt under `artifacts/`.

For a production artifact, run `npm.cmd run build`, then `npm.cmd run preview` and open `http://127.0.0.1:4173/space-dragon/`. The notebook button and file-writing endpoint are development-only. `dist/` is an isolated static game build; it does not contain the idea inbox, reference photos, or editable sources. Do not copy the repo root to a public web directory.

## Runtime layout

| Path | Responsibility |
| --- | --- |
| `src/main.ts` | Guided First Contact UI and development notebook |
| `src/game/scene.ts` | Small Babylon scene and rendering lifecycle |
| `src/game/checkpoint.ts` | Versioned local persistence, v1 migration and restart backup |
| `src/game/firstContact.ts` | Story content, guarded transitions, checkpoint validation and derived unique rewards |
| `src/game/narration.ts` | Opt-in local-device speech, replay/cancel and text fallback |
| `tools/dev-idea-inbox.ts` | Loopback/origin-checked development append endpoint |
| `vite.config.ts` | `/space-dragon/` base path, private-source deny rules, isolated test inbox |
| `public/` | Explicitly promoted browser assets only |
| `assets/` | Source/reference/candidate workspace; not an automatic runtime directory |

The first scene uses primitives; importing the loader dependency is not evidence of a finished GLB pipeline. Follow [the asset pipeline](ASSET_PIPELINE.md) for the first reviewed model. Full physics, character controllers, follower AI, audio production, backend services, and account systems are deferred until their gameplay needs are concrete.

During development, `window.__SPACE_DRAGON__.snapshot()` returns the current step, checkpoint, frame sample, mesh/triangle counts, and WebGL version. This is an observation interface, not a remote control or a performance acceptance result. It is absent from production builds.

Save schema v2 uses `space-dragon.checkpoint.v2`: `{version: 2, step, demonstrated, scan, scanHelp}`. Steps are computer, backyard, pod, suits, scan and map. Validation rejects impossible cross-field combinations. All five stable suit rewards derive from entry to the suits stage, and the symbol archive reward derives from the completed scan; demonstrations cannot grant duplicates. `scan` distinguishes direct from assisted interaction only, **not learning mastery**. No learner profiles or observations are created by this slice.

When no v2 save exists, valid v1 computer/backyard/pod saves resume at the same step. The original v1 bytes remain intact; the next accepted action writes v2. Unsupported/malformed saves show a notice; storage failure retains progress for this visit. Confirmed restart writes the previous state to `space-dragon.checkpoint.before-restart` before replacing v2. Recovery is manual for now: restore that JSON to the v2 key. Notebook drafts stay separate.

Hear instruction (or H) uses an available local English device voice, on request. Remote voices are not selected. Unsupported or not-yet-loaded voices fall back to the visible instruction and Help together. Actual audibility/accent on the player's device still needs review. Pause, tab hiding, notebook opening and scene changes cancel speech. Reduced motion respects the initial OS preference and can be toggled. Story controls settle for 350 ms after accepted input to prevent a double click hitting a different control as the card moves; no game-state reward depends on that timer.

For a host with an already installed compatible Chromium, set `SPACE_DRAGON_BROWSER_PATH` to its executable when running Playwright. The default still uses the pinned Playwright browser. Record the actual browser/version; compatibility tests do not establish GPU performance.

Restarting a progressed sequence requires confirmation; cancel preserves the current checkpoint. Keyboard is the confirmed first input. The automated narrow touch check is extra layout/input evidence, not a change to the owner's deferred-touch decision or a physical-device support claim.

## Integration still to resolve

Keep the `/space-dragon` URL prefix. This is a standalone local client, not a replacement homepage. The public host currently returns unexpected content and the game route was 404 during inspection; the website's actual source, routing, deployment, and Railway services remain unidentified. Audit them before integrating. Keep frontend engine decisions separate from the host UI framework; Babylon does not require replacing an existing site framework.
