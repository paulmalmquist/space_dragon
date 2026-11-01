# Unity Town Drive foundation — October 31, 2026

## Scope and authority

SD-074 applies the [owner's Unity instruction](../decisions/2026-10-31-unity-town-drive-foundation.md) to the Town Drive channel. The existing shared Unity project is the destination. The verified browser reference is SD-064 source commit `095c5b7c316ec8af60122bb3d348e9bf971f474d`, delivery head `56483d43bc744116dedb5b82dfe89e4f98c62b24`, merged as `55d5cc06f6ae271e8b2ec712b4dfa1a5b91657b3`. Its normalized drive source/test fingerprint is `ebfd1afb10cbe59c88c0bd0143e5e4a77a15dec5d8f09c5628b38041317286da`.

## Implementation and artifact

The task-owned module is `unity/SpaceDragon/Assets/SpaceDragon/TownDrive`: separate pure C# Core, Unity JSON adapter and two EditMode test assemblies. The other channel's Unity project/packages/renderer remain separate prerequisites. The scoped checkout is `C:/Projects/space_dragon_unity_drive`, branch `feat/unity-town-drive-foundation`, based on `55d5cc0`; no second Unity project is created or launched. New code was staged outside the active project's Assets while the other channel built LaunchLab, then copied into the shared project during an idle window. Its next Editor job generated 22 task-owned metadata files (including the TownDrive folder); those GUIDs are preserved in this commit.

The exporter reads the unchanged TypeScript modules and rejects source drift across all 40 recorded source/test files. Known input fingerprint pins source revision `56483d4`, so another checkout or a documentation commit produces the same bytes. The pure C# module uses doubles, the original sampled route and 60 Hz step, ordered/idempotent checkpoints, forgiving obstacle recovery, preferred route progress on the shared home stem and presentation interpolation. It has no Unity, wall-clock, storage, transform or physics-engine dependency.

The exported data contains 764 route samples, six sections, five checkpoints, four lakes, 83 estimated context lots, ten junctions, eleven closures and 278 closure collision discs. The standalone driving DTO consumes only driving authority; future scenery bindings retain the rest of the JSON. The new Unity adapter uses an explicit `TextAsset` and Unity `JsonUtility`, avoiding global Resources payloads in unrelated scene builds. No save migration is performed.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `TownDrive/Data/town-drive-v001.json` | 384,685 | `4c5eba111e226ffd53daf5dfe7ca68274eb1b643d58fb4c6955e863e401c47ff` |
| `TownDrive/Tests/EditMode/Fixtures/town-drive-fixtures-v001.json` | 329,818 | `66b5ed18261fedb397b544404c71ad2ef06fcc3657289c996cf5400b92a1f420` |

## Checks and evidence

The 20 source/data/tool files (excluding generated `.meta` files and documentation) have normalized path/content fingerprint `33d0f0c98809afd25bb0cfaa307c4ab27a08498a76b87ecfc377f08476b5d152`: sorted relative POSIX path + NUL + LF-normalized bytes + NUL. Full per-file inventory is in `artifacts/unity-town-drive/module-fingerprint.json`.

Windows; Node 24.15.0; .NET SDK 10.0.400 compiling C# 9 against net8.0. The .NET 8.0.424 SDK is also installed. The existing project pins Unity 6000.6.7f1. Native numerical results do not establish Unity serialization, Mono/IL2CPP or rendered behavior.

| Check | Result | Evidence / boundary |
| --- | --- | --- |
| `node --experimental-strip-types tools/unity/export-town-drive.mjs --verify` | PASS | Byte-identical export from the frozen SD-064 checkout and scoped checkout; live drive-source fingerprint matches. |
| `dotnet run --project tools/unity/town-drive-parity/TownDriveParity.csproj --configuration Release` | PASS | Actual linked Core files compile and pass thirteen groups / 50,010 assertions. 441 TypeScript oracle vectors: 188 distance/lane, 213 nearest, 13 semantic scenarios, 13 checkpoint transitions, three resets and eleven presentation cases. Golden-vector maximum difference `1.8189894035458565e-12`; including the independent elapsed-time assertion, maximum is about `6.34e-11`, tolerance `1e-7`. No claim of cross-engine bitwise determinism. |
| Complete C# semantic driving loop | PASS | 17,500 fixed ticks / 291.6667 simulated seconds, all 278 closure collision discs, zero contact ticks, ordered five checkpoint IDs, once-only home completion, shared return and home bulb visited. Largest per-tick displacement 0.333575 m; no pose teleports or reset shortcuts. This is a pure model drive, not rendered Unity gameplay. |
| Native invariants | PASS | Positive wrapping, shared-road preference, pause, sanitized input, caps, immutable input/state, repeated semantic replay, checkpoint order/duplicates and presentation at 30/60/144 Hz plus uneven cadence. Serialized state restoration is an in-memory test, not a persistence adapter. |
| Managed compatibility compilation against installed Unity/NUnit DLLs | PASS | C# 9 / netstandard2.1 compiled Core, UnityRuntime and both test assemblies separately: zero warnings/errors. Actual Unity 6000.6.7f1 CoreModule, JSONSerializeModule, Editor.CoreModule and Unity's NUnit references; exact DLL/source hashes in `artifacts/unity-town-drive/managed-compile/receipt.json`. This is compilation, not an Editor test run. |
| Shared-project import/runtime assembly compilation | PASS for named steps | The other channel's `artifacts/unity-launch/web-20261031-160600-672.log` records successful Csc, ILPostProcess and PlayerScriptAssemblies copies for Core and UnityRuntime. Task-owned `.meta` files were generated. This is incidental import/compile evidence, not Town Drive gameplay or a completed Town Drive build. |
| Guarded Unity EditMode runner | BLOCKED: shared Editor busy | `tools/unity/run-town-drive-tests.ps1` refused to start during the other channel's build, including the next job after source publication. No process interrupted and no concurrent Editor launched. It requires all twelve expected cases: ten Core and two Unity adapter, with no skips. Dedicated Town Drive EditMode tests remain NOT RUN. |
| Runner result validation | PASS | Six synthetic XML checks exercise the actual extracted guard: valid 12 cases accepted; adapter-only, missing Core case, wrong class, skipped case and false 13-case inventory rejected. `artifacts/unity-town-drive/runner-validation.json`. This is tooling validation, not Editor execution. |
| Unity scene/player build, browser driving, visual parity and sustained performance | NOT IMPLEMENTED / NOT TESTED | No claim that the current playable drive has already changed engines. |
| `python tools/check_foundation.py`; Python unittest discovery; `git diff --check` | PASS | Foundation links/structure/skills; 41 Python cases with two existing skips; scoped whitespace review. These checks do not establish Unity gameplay. |

Local evidence: `artifacts/unity-town-drive/parity-report.json`, `parity.log`, staged source and exporter receipts. The first native run found extra JavaScript spread properties (`s`, `sectionIndex`, `id`, `label`) in expected state fixtures; these are outside the authoritative DriveState contract. The exporter now emits the explicit state-field whitelist. Strict C# comparisons then passed without relaxing tolerance. Runtime JSON was relocated from Resources to Data before publication to keep unrelated scene payloads stable. The managed-compile harness initially referenced both Unity's compatibility facade and modular DLLs, producing duplicate-type errors; removing the redundant harness references gave clean builds without changing game source. That initial log is retained.

The [visual/behavior handoff](../engineering/UNITY_TOWN_DRIVE_HANDOFF.md) inventories the detailed existing minivan/cabin, scenery, vegetation, pedestrians, surfaces and PBR conversion path. Unity JSON uses public serializable fields, consistent with [Unity's serialization API](https://docs.unity.com/en-us/engine/6000.0/script-reference/unityengine/jsonutility/fromjson); actual Editor tests remain distinct from documentation verification.

## Review boundary

The migration foundation is distinct from a complete playable Unity Town Drive scene. Detailed world/minivan asset import, native Unity input/cameras, traffic, pedestrians, engine-specific persistence, actual Unity build/browser play and human visual/comfort acceptance must be recorded separately. The existing browser lab remains available with its corrected geometry. No deployment is performed.

IMPLEMENTED: exported data, C# core, Unity JSON adapter, tests and detailed migration handoff. VERIFIED: the named native behavioral and installed-reference compilation checks. Unity generated the module metadata and compiled its two runtime assemblies in the shared project. Dedicated Town Drive EditMode execution and player rendering remain NOT TESTED while the other channel owns the Editor. The same module and generated GUID metadata are assembled in the scoped review checkout. No other channel's project settings, packages, scenes, assets or build outputs are included in this task's commit.

The standing owner push/merge instruction applies to the source foundation. Source/merge identifiers and final inventory are recorded in the PR and local `artifacts/unity-town-drive/handoff.json`; no hosted CI pass is inferred from local results. The next useful action is to run `tools/unity/run-town-drive-tests.ps1` when the shared Editor is idle, then implement the detailed asset/scene bindings in the handoff.
