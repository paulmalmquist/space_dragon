# SD-VIS-001 — Production Visual Foundation

**Captured:** October 31, 2026 · **Idea:** SD-061 · **Current work state:** verified for the bounded technical foundation; full polished-opening/human acceptance remains open.

[The decision](../decisions/2026-10-31-production-visual-foundation.md) selects a bounded First Contact visual increment under the owner's supplied plan. The [inbox](../../ideas/INBOX.md) preserves the full source. This page reconciles the proposal with the local runtime; implementation evidence belongs in the task receipt.

**Current evidence:** [the receipt](../reports/2026-10-31-production-visual-foundation.md) records 214 units/build, 46 development, nine production and 18 photo checks, fresh source/build/two targeted production checks, fixed-camera views and six short native-AMD samples. Final human appearance and sustained performance remain separate.

**Later same-day steering:** [SD-062](UNITY_PRODUCTION_CANDIDATE.md) completed a bounded Unity comparison beside this Babylon foundation. [SD-072](../decisions/2026-10-31-unity-channel-alignment.md) then selected Unity/C# for forward production in the existing project, superseding the engine deferral below. Preserve the Babylon/Three.js references while migrating bounded features; the choice does not itself prove a visual advantage or completed migration.

## Actual starting point

| Supplied review premise | Current local evidence | Practical effect |
| --- | --- | --- |
| Babylon replaces an earlier Three.js proposal. | Earth is Babylon 9.33.0. The separately authorized Dogfight Lab uses Three.js 0.180.0. | Keep both existing bounded runtimes; no migration in this task. |
| No Blender asset is integrated. | SD-017's original rescue-pod v002 is loaded by `src/game/pod-asset.ts`; SD-060's mechanical dragon is loaded in Dogfight. | Reuse the technically reviewed pod for this Earth proof; preserve final-art review as pending. |
| No locomotion or combat exists. | SD-021 provides Earth walking. SD-037 and later increments provide isolated flight/combat. | Test those existing boundaries; do not plan their first implementation again. |
| Asset tooling and tests are beginnings only. | Runtime manifest, compression/decoder paths, asset inspection, production checks and dragon-specific validation already exist. | Extend concrete gaps, rather than establish a second pipeline or test framework. |
| House video should drive the opening. | Earth remains a generic blockout; footage and detailed geometry were used in the separately scoped Town Drive work. | Stage a generic backyard visual proof now. Actual Earth house reconstruction needs a selected art/layout task. |

## Bounded deliverables

| Deliverable | Work selected now | Acceptance evidence |
| --- | --- | --- |
| A. Baseline and controls | Explicit render-quality controls, performance statistics, repeatable camera positions and before/after capture tooling in the existing runtime. | Recorded sample size, median/p95 frame time, spikes, draw calls, render dimensions/scale, renderer and relevant asset/load bytes. Fixed cameras reproduce a comparison without changing rewards. |
| B. Genuine Blender asset | Reuse original rescue-pod v002 through the existing loader, manifest and same-origin KTX2 decoder. Preserve source/export and lid animation. | Existing source/GLB provenance plus a fresh actual-browser load/material/animation check. No “new first asset” or final-art approval claim. |
| C. Cinematic visual proof | Bounded PBR, night lighting, shadows and atmospheric presentation around the backyard pod, with interactive camera and preserved exploration/story controls. | Before/after browser views, inspection at selected quality levels, First Contact progression/help/reload checks and unchanged save/reward semantics. |

The target is a useful local visual foundation. The complete supplied exit criterion additionally requires human asset/visual review and measured acceptance on actual hardware. A running candidate with passing tests can be IMPLEMENTED/technically VERIFIED while that broader exit stays open.

## Proposed follow-on order

1. Review this backyard proof on the Lenovo/Chrome target, choose material/lighting corrections and measure a longer representative run. A stronger gaming computer remains unavailable until actually tested.
2. Refine the existing pod or one dragon section through the existing Blender/browser pipeline, with matched shape/material/animation views and preserved hierarchy.
3. Select a playable house-to-yard art/layout increment; keep camera transitions, collision layout and saves in step with geometry.
4. Select the existing [cinematic handoff proposal](../engineering/CINEMATIC_TRANSITIONS.md) as a separate implementation if wanted. Author named tracks and test interruption/skip/control return before extending the sequence.
5. Evaluate LODs, texture variants, shader prewarming and adaptive resolution against measured scene costs. Self-host any added decoders. Choose compression per asset and verify sockets/clips after each transform.
6. Expand character/combat presentation and planetary content only after the bounded visual bar and existing gameplay remain stable.

The source's Home Night, Dragon Cinematic and Alien World presets, target folder structure, asset catalog extensions and performance targets are PROPOSED design/engineering options. Desktop 60 fps at 1080p and integrated-GPU 30 fps at adaptive 720p–900p remain targets, not measurements. Halcyon, Game Forge and other reference-project claims are preserved as supplied research leads; the pasted citation labels did not include URLs, and this task does not independently verify those projects or their license manifests.

## Parked scope and revisit triggers

- Full dragon/body/character production: revisit after review of the current SD-059/060 candidate and a specifically selected art increment.
- Large streaming worlds, procedural galaxy, multiplayer, full vehicle physics and backend services: revisit only with a bounded gameplay requirement; none is needed for the visual proof.
- Historical engine deferral: superseded by SD-062's measured comparison and SD-072's owner-selected Unity direction. Subsequent ports use the existing Unity project and need feature-specific verification.
- New external asset packs/HDRIs: select only when the actual scene needs them, retain provenance/license evidence and review exports before promotion.
- Complete cinematic direction and prerendered/live transitions: revisit after selecting SD-038's handoff implementation; no campaign departure follows from a lighting pass.
