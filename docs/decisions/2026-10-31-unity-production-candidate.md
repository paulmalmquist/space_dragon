# Unity production candidate beside the browser prototype

**Date:** October 31, 2026 · **Tracking:** local SD-062 · **Authority:** CONFIRMED side-by-side production feasibility evaluation; later SD-072 confirms Unity forward production direction.

**Later owner direction:** [SD-072 Unity alignment](2026-10-31-unity-channel-alignment.md) supersedes the candidate-only restriction for subsequent production work: use Unity/C# in the existing project, coordinated with its active writer. This decision retains the scope and evidence of the First Contact comparison. The owner selected the forward direction; the measurements do not establish an engine-quality winner or a completed whole-game migration. Babylon/Three.js remain behavior references and rollback. Local SD-062 and merged-main SD-062 have different source namespaces; preserve them until integration reconciliation.

## Request and interpretation

The owner's follow-up selects a Unity production candidate alongside the current Babylon version, requesting Unity 6.6, URP, WebGPU/WebGL2 browser delivery, common Blender assets, cinematic arrival, third-person movement, PlayStation controller input and a short interaction. The comparison must include actual-browser loading, memory and frame rate on named hardware, and evidence that agents can edit, test and build the Unity project through a repeatable workflow. [The inbox](../../ideas/INBOX.md) preserves the source requests; [the candidate plan](../plans/UNITY_PRODUCTION_CANDIDATE.md) separates requested capabilities from observed tool support.

Unity 6000.6.0f1 is an official release dated August 31, 2026. [Unity release notes](https://unity.com/releases/editor/whats-new/6000.6.0f1). Unity's Web Graphics team documents WebGPU as supported in 6.6, with WebGPU first and WebGL2 retained below it for runtime fallback. This must be configured; WebGL2 remains the default. [Official WebGPU announcement](https://discussions.unity.com/t/webgpu-out-of-experimental-in-unity-6-6/1734694).

Unity Hub 3.22.5.65535 and Editor 6000.6.7f1 are installed. The initial inspection found no Editor/license; after the owner explicitly signed in, the CLI activated Unity Personal. Batch setup/import, 11 EditMode tests, Web/Windows builds, actual WebGPU/WebGL2 keyboard browser play and a visible Windows rendering sample pass without manual Editor UI steps. [The receipt](../reports/2026-10-31-unity-production-candidate.md) retains failures/fixes, matched 720p captures, gzip loading and measured browser process memory. Physical PlayStation testing is owner-deferred; human final-quality and sustained performance remain open.

## Selected scope

Keep the working Babylon Earth scene and existing Three.js labs intact. Build or prepare an isolated Unity comparison candidate, depending on the verified local editor/toolchain, using the same original pod and/or existing dragon export with recorded source hashes, scale, hierarchy and animation semantics. Do not replace the current runtime or transfer campaign authority to the candidate.

The candidate's bounded playable scene is an arrival presentation followed by third-person movement and one short, repeatable interaction. Camera control must return predictably; pause, focus loss, repeat input and replay must not strand control or duplicate the interaction outcome. A provisional original avatar is acceptable for the control proof; new likeness assets and complete family production are outside this evaluation.

PlayStation input is an explicit acceptance target for this candidate. Preserve keyboard/mouse access and record the actual controller model, connection, OS, browser and mapping. Simulated input establishes adapter behavior only; it cannot close physical USB/Bluetooth or control-feel coverage. Existing browser input decisions remain applicable to their current runtimes.

## Relationship to existing work

- SD-061 is technically verified for its bounded Babylon visual foundation and supplies a preserved matched comparison baseline.
- The current repository is beyond the supplied “small placeholder” characterization: Earth already includes walking and an original Blender pod; the isolated Dogfight Lab includes combat and a rigged mechanical dragon. Compare with those actual artifacts, not an imagined earlier prototype.
- This request first superseded SD-061's engine-comparison deferral for a bounded evaluation. Later SD-072 selects Unity for forward production work; migration of each existing feature still needs bounded implementation and independent evidence.
- The [SD-037 lab boundary](2026-10-30-seele-dogfight-lab.md), [SD-060 dragon contract](../engineering/DRAGON_ASSET_CONTRACT.md), SD-041 live spelling/dodging and existing save contracts remain unchanged.
- No backend, multiplayer service, hosting change, purchase, new external media upload or production deployment is authorized by the comparison. Preserve original source art and the existing rollback path.

The source's Railway services, static CDN, Windows distribution and eventual whole-game migration remain proposed follow-ons. Browser delivery is the candidate's primary proof. A native Windows comparison can follow a working browser artifact; neither result alone authorizes publication or service changes.

## Decision gate

The [comparison plan](../plans/UNITY_PRODUCTION_CANDIDATE.md) must produce a reproducible browser artifact, matched asset/camera captures, named-device measurements and an agent edit/test/build demonstration before calling Unity a verified production candidate. A generated project, successful editor import or desktop play mode alone does not satisfy browser delivery.

Any unavailable editor/module/license/hardware capability blocks only its dependent operation. Report the concrete gap and never substitute scaffold existence for a successful build or launch. With SD-072 selecting Unity, use the measured visual/load/memory/frame costs and maintenance evidence to guide subsequent bounded work. The [dragon/Dogfight handoff](../engineering/UNITY_DOGFIGHT_HANDOFF.md) is the next migration reference; this First Contact proof does not implement that port.
