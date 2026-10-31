# Town Drive Unity module

Town Drive's SD-074 continuation now includes the detailed scene exporter, C# driving/traffic/pedestrian state, keyboard/camera/save adapters, and a dedicated Unity scene importer and build path. It preserves the browser-generated art. **Scene import, player behavior and visual acceptance remain separate gates**; consult the [current receipt](../../../../../docs/reports/2026-10-31-unity-town-drive-scene.md) for actual results.

Use the existing `unity/SpaceDragon` project: Unity **6000.6.7f1**, URP **17.6.0**, glTFast **6.20.0**, Input System **1.20.1**, its configured renderer and existing `Assets/SpaceDragon/Imported/daylight.hdr` cubemap. The shared Unity channel owns packages, project settings and other scenes. An isolated authoring checkout is not a second Unity project. Guarded commands refuse a busy Editor; coordinate exclusive access instead of interrupting it.

## Included data and art

- Metre-scale Starpass → Green Island → Winston Trails South → Hypoluxo route, shared home return, four mapped lakes, 83 estimated context lots, 26 context street ways and 10 junctions / 11 closures.
- `Imported/town-drive-scene-v001.json`: **64 geometry assets plus two compatible pedestrian rigs, 146 listed files, 125 materials, 1,302 vegetation part placements, 157 parked vehicles and 1,564 static collision proxies**. Shared PNGs, original vegetation/pedestrian GLBs in the Unity-ignored `Sources~` archive, and provenance accompany detailed roads, homes, shops, signs, police closures and the white minivan/cabin.
- Fixed 60 Hz authoritative driving, separate presentation interpolation, traffic/signals and sidewalk pedestrians. Keyboard: WASD/arrows, Space handbrake, C chase/cabin, Q/E look, R checkpoint reset, F assist, Esc/P pause. Focus/pause clears driving input.
- Checkpoint-only PlayerPrefs under `space-dragon.unity.drive.v1`, with backup and newer-version protection. Browser and campaign saves are not migrated or overwritten.

## Reproduce

From the repository root, use Node 24, installed Chrome and pinned npm dependencies for authoring; use the .NET 8 runtime/targeting pack for portable parity checks. A newer .NET SDK may compile that target.

```powershell
node --experimental-strip-types tools/unity/export-town-drive.mjs --verify
node --experimental-strip-types tools/unity/export-town-drive-ambient.mjs --verify
dotnet run --project tools/unity/town-drive-parity/TownDriveParity.csproj --configuration Release
node tools/unity/export-town-drive-scene.mjs --verify
```

Rebuild art deliberately with `node tools/unity/export-town-drive-scene.mjs`; it constructs the actual browser world in its own local authoring browser without reading a player's save. `--refresh-metadata` re-reads source LOD metadata without rewriting geometry and rejects changed source hashes. `--verify` checks listed file hashes, expanded Unity import counts and positive ascending LOD distances. See the [full workflow](../../../../../docs/engineering/UNITY_TOWN_DRIVE_SCENE.md) before accepting a changed baseline.

Once task-owned files are integrated into the existing live project and its Editor is idle:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/unity/run-town-drive-tests.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File tools/unity/run-town-drive-scene.ps1 -Action Setup
powershell -NoProfile -ExecutionPolicy Bypass -File tools/unity/run-town-drive-scene.ps1 -Action TestScene
powershell -NoProfile -ExecutionPolicy Bypass -File tools/unity/run-town-drive-scene.ps1 -Action BuildWeb -ReviewBuild
node tools/unity/serve-town-drive.mjs
```

The first command requires all **18** core/adapter/runtime EditMode tests; `TestScene` separately requires four generated-scene cases. Setup creates `Generated/TownDrive.unity`; the Web build uses only that scene, its dedicated template and `Builds/TownDriveWeb`. Run the browser verifier from another terminal against `http://127.0.0.1:5208/space-dragon-town-drive/`; the [workflow](../../../../../docs/engineering/UNITY_TOWN_DRIVE_SCENE.md) includes full-lap and WebGL2 options.

Keep the browser Drive Lab as the current behavior/visual reference until the Unity candidate passes its own receipt. File validation and compilation do not establish a successful scene/player, photorealism, human comfort, hardware performance or release approval. [Owner decision](../../../../../docs/decisions/2026-10-31-unity-town-drive-scene.md) · [original visual handoff](../../../../../docs/engineering/UNITY_TOWN_DRIVE_HANDOFF.md).
