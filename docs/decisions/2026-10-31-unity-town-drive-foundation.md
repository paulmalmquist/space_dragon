# Town Drive follows the shared Unity direction — SD-074

October 31, 2026 · **CONFIRMED engine direction; C# foundation implemented and natively verified; Unity scene migration planned**.

Owner wording, supplied to the Town Drive channel after the SD-064 map correction:

> another channel is upgrading to unity. please follow suit

This applies the existing SD-072 Unity direction to Town Drive. Forward Town Drive production work belongs in the shared `unity/SpaceDragon` Unity/C# project. Its other channel owns project setup, renderer/packages, First Contact and the active LaunchLab build. Use a separate `Assets/SpaceDragon/TownDrive` assembly boundary; do not create another project, replace shared settings or run a competing Editor.

The first implementation increment exports the technically verified SD-064 route/context and reference input results, ports the pure fixed-step driving/ordered-checkpoint/presentation core to C#, and verifies numerical/behavior parity independently of rendering. Preserve metre-scale coordinates, the corrected Winston Trails gate approach, shared Starpass return, eleven closures, stable route/checkpoint IDs and the owner's prior layout override. Browser saves remain untouched; automatic cross-engine save conversion is not part of this increment.

Retain the detailed browser lab as the current playable reference until the Unity scene, minivan/cabin, traffic, pedestrians, controls and persistence meet their own parity checks. An engine change is not a photorealism result. The next visual increment must import the existing detailed assets and geometry rather than replacing them with a primitive demonstration. The [Town Drive handoff](../engineering/UNITY_TOWN_DRIVE_HANDOFF.md) records that work and the [receipt](../reports/2026-10-31-unity-town-drive-foundation.md) distinguishes C# checks from Unity Editor/player verification.

The standing push/merge instruction applies to this task-owned foundation. Keep concurrent Unity/visual/cinematic work out of its commits. No hosting change, production deployment or new external asset service is implied.
