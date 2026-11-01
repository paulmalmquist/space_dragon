# Town Drive detailed Unity scene — SD-074 continuation

October 31, 2026 · **CONFIRMED direction; implemented and technically verified**.

After the Unity/C# foundation merged, the owner asked whether work had to wait for the other channel. The proposed next step was to bring the detailed scenery and white minivan into the existing Unity project while preserving the corrected street layout. Owner reply:

> ok so go ahead

This continues SD-074. Build a separate playable Town Drive scene in the shared `unity/SpaceDragon` project, using the actual detailed browser-generated scenery and minivan, mapped route/context, existing vegetation and pedestrian assets. Preserve the cabin, named moving parts, sidewalks/development on both sides, police closures and measured local street proportions. Forward runtime bindings use the verified C# core; traffic, pedestrians, input/cameras and isolated saves are part of the playable integration. An engine migration alone is not a photorealism improvement or human quality approval.

Author/export in the isolated task checkout. One Editor/build process may own the shared live project; never interrupt the other channel or replace its project settings, renderer, scenes, templates or build outputs. Town Drive has its own assembly, generated scene, template, build directory and local review server. Export runtime geometry/texture derivatives with provenance; keep original footage and map screenshots in reference storage. The existing SD-052 override remains applicable.

Verify actual asset/import scale and materials, scene anchors, C# state, pause/focus/reset, chase/cabin/look, traffic/pedestrian motion and isolated persistence. Run the complete route through real fixed-step driving; use review camera placements only for explicitly labeled visual inspection. Record Editor, build and observed player results separately. Preserve the browser lab as the reference until its Unity replacement meets the recorded checks.

The standing owner push-and-merge instruction applies. No production deployment or new external media service is authorized by this continuation. [Prior foundation](2026-10-31-unity-town-drive-foundation.md); [asset/behavior handoff](../engineering/UNITY_TOWN_DRIVE_HANDOFF.md).

[Scene verification](../reports/2026-10-31-unity-town-drive-scene.md) records the integrated local build, full driven loop, two renderer backends and focus/save checks. Human appearance/comfort, shared foundation publication and production release remain distinct.
