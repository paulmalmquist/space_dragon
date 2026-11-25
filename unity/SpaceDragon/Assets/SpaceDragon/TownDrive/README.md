# Town Drive Unity module

Town Drive runs in the shared Unity project with the mapped route, detailed scenery and minivan, fixed-step C# driving and traffic, keyboard and chase/cabin views, and checkpoint saves. Read the [scene workflow](../../../../../docs/engineering/UNITY_TOWN_DRIVE_SCENE.md) for setup, tests, Web builds and browser verification.

The [foundation receipt](../../../../../docs/reports/2026-10-31-unity-town-drive-foundation.md) records the portable route and driving checks. The [playable scene receipt](../../../../../docs/reports/2026-10-31-unity-town-drive-scene.md) records the original import, build and complete route/reload checks. The browser Drive Lab remains the reference for behavior and art.

The simulation owns checkpoints and progress. Rendering uses the interpolated presentation pose. Unity, browser and campaign saves are separate. Coordinate exclusive access before opening the shared Editor or running a build.
