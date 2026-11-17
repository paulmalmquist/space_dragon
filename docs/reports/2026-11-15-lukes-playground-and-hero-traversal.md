# Hero traversal, Luke's Playground for Unity and the realistic stand-in — verification receipt

SD-087 and SD-088, November 15, 2026. **Browser reference: IMPLEMENTED / VERIFIED for the named software-rendered checks. Unity: IMPLEMENTED; import, play and builds NOT TESTED.** Not reviewed by a person. Not approved for release.

## Scope

- Task / authorization: the owner's November 15 requests, verbatim in [the inbox](../../ideas/INBOX.md); decisions for [SD-087](../decisions/2026-11-15-hero-traversal-polish.md) and [SD-088](../decisions/2026-11-15-unity-native-lukes-playground.md).
- Base: `main@5b86dda`. Branch `claude/keen-ritchie-ogadaj`, draft PR #36. Commits `2f4d72d` (traversal and C# port), `3688541` (realistic stand-in), `bb0dbcb` (Unity playground), `2ed5bd5` (fixes found by hosted CI) and the documentation commit that carries this receipt.
- Changed paths: `src/game/traversal/**`, `src/game/hero/**`, `src/game/world/**`, `src/game/scene.ts`, `src/game/navigation.ts`, `src/game/third-person-camera.ts`, `src/main.ts`, `src/style.css`, `tests/**`, `tools/prepare-playground-hero.mjs`, `tools/blender/rocketbox_fbx_to_glb.py`, `tools/unity/**`, `public/assets/playground/hero/**`, `public/assets/manifest.json`, `unity/SpaceDragon/Assets/SpaceDragon/Traversal/**`, `unity/SpaceDragon/Assets/SpaceDragon/Playground/**`, project documents.
- Environment: Linux cloud container, no GPU, no Unity Editor, no Blender application. Node 24, .NET SDK 8.0.134, Python 3.13, Blender 5.0.1 as a Python module for FBX conversion only. Chromium from the container image through `SPACE_DRAGON_CHROMIUM_PATH` (not the project-pinned build), SwiftShader software rendering at roughly 3–10 frames per second.
- Actual device: **none.** No Lenovo, controller hardware, phone or tablet was involved.

## Checks

| Check or exact command | Result | Evidence and limitation |
| --- | --- | --- |
| `npm run test:unit` | PASS | 278 of 278. Includes 20 traversal, 14 navigation/save, 5 playset, 4 hero-motion and 3 export/packaging drift tests. |
| `npx tsc --noEmit` and `npm run build` | PASS | Typecheck clean; production bundle built. |
| `python3 tools/check_foundation.py` | PASS | Structure and links only; it does not test gameplay. |
| `npm run test:production` (built site, 9 browser tests) | PASS | 9 of 9 on the build of `2ed5bd5`, including the manifest test that hashes every shipped asset, the new hero files among them. Software rendering. |
| Earth browser suites: `tests/navigation.spec.ts tests/gamepad.spec.ts tests/visual-foundation.spec.ts tests/first-contact.spec.ts tests/traversal.spec.ts` | PASS | 33 of 33 in 10.1 minutes at `2ed5bd5`, one clean run on a quiet container. Real keyboard and synthetic controller input; software rendering. Earlier runs on `2f4d72d` and `3688541` failed three or four tests for the causes listed under known gaps. |
| `npm run unity:traversal:verify` and `npm run unity:playground:verify` | PASS | Generated C#, golden fixtures, hero files and Unity `.meta` files match their sources. |
| `npm run unity:traversal:parity` (dotnet) | PASS | C# hero simulation against 14 TypeScript golden scenarios: 9,327 steps, 31,902 assertions, largest difference 7.2e-16. Home block only. |
| `npm run unity:playground:coretest` (dotnet test) | PASS | 22 of 22: 12 traversal plus 10 playground tests. Four scripted probes on the playground level end where TypeScript ends, to 1e-9. This runs the Unity EditMode test source outside Unity. |
| .NET Standard 2.1 build of the engine-free core | PASS | Confirms the core uses nothing newer than Unity's profile. |
| `npm run unity:playground:compile` | PASS, limited | All playground runtime and Editor C# compiles with 0 errors against public UnityEngine 2021.3 modules, UnityEditor 2021.1 and hand-written Input System / URP stubs. It proves syntax and types against those shapes only. It is **not** a Unity 6000.6 compile. |
| Hero conversion: `tools/blender/rocketbox_fbx_to_glb.py`, `node tools/prepare-playground-hero.mjs` | PASS | Deterministic output (same bytes on re-run). 80 joints, 6,660 triangles, 8 blend shapes, 4 loops with closure under 1 degree. Natural speeds 0.80 / 2.28 / 4.61 m/s. |
| Browser reference with the stand-in: idle, run, jump, tether swing | PASS, agent inspection | Screenshots viewed in-session: correct skinning and textures, plausible run cycle, both arms reach the tether. Not retained in the repository. Not a human art review. |
| Unity: asset import, `LukePlaygroundProject.Setup`, Play mode, EditMode tests inside Unity, Windows and Web builds | **NOT TESTED** | No Editor in this environment. Run the [runbook](../engineering/UNITY_PLAYGROUND_HANDOFF.md). |
| Unity visual result: materials, lighting, hero appearance, playset, HUD | **NOT TESTED** | Designed from the level data and proven calls in the existing generators; never rendered. |
| Hardware performance, real controller, touch, audio by ear | **NOT TESTED** | Software rendering and synthetic input only. |
| Hosted CI on the pull request | FAILED on `2f4d72d`, `3688541` and `bb0dbcb` (Earth browser job only); see the pull request for `2ed5bd5` and later | Foundation, browser, drive, dogfight and production jobs were not the failing ones. The Earth failures and their fixes are described under known gaps. This receipt does not claim a green hosted run. |

## Review and release

- Implemented outcome: a hero traversal core and rebuilt home block in the browser reference; the same rules in engine-free C# with golden parity; a generated Unity scene for Luke's Playground with a backyard playset; a realistic generic licensed child stand-in in both runtimes, with provenance.
- Coverage not performed: everything inside Unity; any real device; human play; human art review; agent-behavior tests.
- Human review: NOT REVIEWED.
- Publication / deployment approval: NOT GRANTED. Nothing was deployed. The stand-in is a generic MIT-licensed model; no family likeness was created or published.
- Known gaps and risks:
  - The first Unity run may stop on an import detail (clip names, path roots, a renamed volume property). The generator throws with specifics rather than continuing silently; see the runbook's first-run list.
  - Lighting, exposure and material balance in Unity were chosen without seeing them.
  - Sprint (8.2 m/s) is faster than the stand-in's fastest loop (4.6 m/s); stride rate is capped at 1.45x, so feet glide slightly at full sprint.
  - Hosted CI on the first two pushes failed three Earth browser tests. Each was traced to a cause and fixed, not retried: (1) an idle hero's facing changed in the sixteenth digit because an unchanged angle was re-wrapped every step, so a "nothing moves while paused" comparison failed — fixed in the simulation in both languages, with regression tests; (2) a plain jump while strafing nudged the chase camera, which curved the hero by a few centimetres — the camera now follows only above ordinary run and jump speeds, in the browser and Unity cameras; (3) two tests raced the new jump: one checked for the landing before take-off had been simulated, one recorded the pose while the hero was still airborne — both now wait for the real event. The wall check is back at its original half-centimetre precision. One more test waits for distance instead of a fixed half second. No test was skipped, disabled or loosened.
  - Dogfight Lab polish from SD-087 is parked; its interrupted partial change was reverted and is not in the repository.
- Recovery / rollback: the browser proxy avatar remains as the automatic fallback if the model fails to load. Unity changes are additive under `Playground/` and `Traversal/`; deleting those folders and `Playground/Generated` restores the project. Exploration save v1 bytes are preserved as a backup on migration.
- Remote verification: branch `claude/keen-ritchie-ogadaj` pushed; draft pull request #36.
