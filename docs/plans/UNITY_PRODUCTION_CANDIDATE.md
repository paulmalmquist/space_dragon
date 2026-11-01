# SD-083 — Unity production candidate comparison

**Captured:** October 31, 2026 · **Authority:** CONFIRMED bounded side-by-side evaluation · **Work state:** verified for named technical checks; physical controller owner-deferred and human final-quality review open.

[The decision](../decisions/2026-10-31-unity-production-candidate.md) preserves Babylon and the existing labs while evaluating the owner's Unity request. [SD-VIS-001](PRODUCTION_VISUAL_FOUNDATION.md) supplies the technically verified browser baseline; human/final-art acceptance remains open. The full source wording belongs in [the inbox](../../ideas/INBOX.md).

**Subsequent direction:** [SD-072](../decisions/2026-10-31-unity-channel-alignment.md) selects Unity/C# for forward production work in this existing project. The completed comparison remains evidence for the bounded First Contact candidate, not a measured engine winner or completed dragon/game migration. Coordinate future work through the [Unity dragon/Dogfight handoff](../engineering/UNITY_DOGFIGHT_HANDOFF.md).

## Verify the requested platform first

| Requested or required capability | Initial status | Evidence needed |
| --- | --- | --- |
| Unity 6.6 editor | Editor 6000.6.7f1 installed and batch setup passed | [Actual setup/test receipt](../reports/2026-10-31-unity-production-candidate.md); [official release family](https://unity.com/releases/editor/whats-new/6000.6.0f1). |
| Universal Render Pipeline | URP 17.6.0 installed and rendered in the generated scene | WebGPU, WebGL2 and Direct3D11 captures in the receipt. |
| WebGPU and WebGL2 web builds | Web build and both actual browser backends pass on the Lenovo/Chrome target | [Build/browser receipt](../reports/2026-10-31-unity-production-candidate.md); [official configuration](https://discussions.unity.com/t/webgpu-out-of-experimental-in-unity-6-6/1734694). Other devices/browsers remain untested. |
| Local editor license and batch access | Hub installed/licensed; setup, 11 EditMode tests, Web build and actual browser play pass | Named local evidence only; initial failures/fixes retained, no manual Editor UI steps. |
| Agent editing and validation | Source/edit→test→Web/Windows builds→WebGPU/WebGL2 browser flow demonstrated | Visible Windows rendering also passes; native gameplay and human art/feel review remain separate. |
| Physical PlayStation controller | NOT TESTED; owner answered “Not now” | Bindings remain implemented. Actual device/connection/mapping/reconnect/feel needs a later physical test. |
| Actual hardware comparison | Matched 1280 × 720 Babylon/Unity captures, short browser/native frame samples, gzip loading and browser process memory recorded on Lenovo/Chrome/AMD | Workloads/readiness still differ. No engine-only winner; stronger-device/endurance and native gameplay remain untested. |

Update this table only from observed evidence. Tooling verification determines exact editor/package/build commands before implementation claims. The official 6.6 feature announcement does not establish this integrated Radeon driver's WebGPU capability or a performance benefit; record the actual selected backend. Browser delivery is primary. The source's native Windows comparison is a follow-on to a working browser artifact; Railway/CDN services and publication remain outside this evaluation.

## Bounded playable candidate

1. Use the same original rescue pod and/or current dragon export as the Babylon comparison. Record input hashes, scale, required nodes, materials and clips. Keep transformations/export changes explicit and preserve the source.
2. Stage a brief arrival presentation with deliberate night lighting. Fix a matched camera for comparison; log deviations required by either renderer.
3. Hand control to a third-person character. A provisional original avatar is sufficient for this feasibility task; controls and collision behavior matter more than new likeness production.
4. Provide a short nearby interaction with a visible outcome. Guard repeated input; handle pause, focus loss, disconnect and replay safely. Use isolated candidate state; do not read or migrate production campaign/learner saves.
5. Support keyboard/mouse and the requested PlayStation controller. Prove actual input and disconnect recovery in the browser. Preserve controller identity/connection details in the receipt.
6. Produce a repeatable local web build and launch it. Separate editor/desktop success from browser success and from human appearance/feel review.

## Matched browser comparison

| Dimension | Record for each candidate | Interpretation limit |
| --- | --- | --- |
| Artifact identity | Source revision, dirty-file identity, build hash, asset hashes, editor/engine/package versions | A screenshot without artifact identity cannot be rerun reliably. |
| Visual result | Same asset, world scale, view direction, framing, viewport and documented quality settings; closed/open pod and gameplay view | Lighting/material differences must be described; engine labels alone do not explain fidelity. |
| Load cost | Cold/warm condition, served/compressed download bytes, time to visible scene and time to usable controls | Cache state, localhost and network conditions must be named. |
| Memory | Measurement method and available browser/process/JS/WASM categories; start and representative interaction samples | JS heap alone is not total game memory. Do not compare unlike counters as the same measure. |
| Frame timing | Sample duration/count, median/p95 frame interval, notable spikes, render dimensions/scale and actual backend/device | A short sample is not sustained-performance acceptance; software rendering is not a GPU result. |
| Inputs and state | Movement/camera, interaction, hold/repeat, pause/focus/reconnect/replay and isolated saves | Simulated pads and automated playback do not establish human feel or physical-device reliability. |
| Agent workflow | Reproducible edit, test and build commands, logs/results, resulting browser behavior | Project files or an intended command are not proof that agents can execute the full workflow. |

Keep the existing Playwright/browser verification framework where it can inspect the served candidates. Unity-specific unit/editor tests may supplement it when the real editor is available; they do not replace browser play. No second generic service or testing platform is required.

## Outcome categories

- **IMPLEMENTED:** the isolated candidate exists and the named behavior is authored.
- **VERIFIED for named checks:** actual commands and browser interactions passed on the identified artifact.
- **REVIEWED:** a named human has inspected appearance/control feel, if that occurs.
- **APPROVED FOR RELEASE:** separate explicit release authority; this feasibility request grants none.

If setup access or supported version/module availability prevents a later browser build, retain useful source/preparation and report the dependent checks as BLOCKED or NOT TESTED with the concrete cause. The present First Contact candidate has passed the named technical checks. SD-072 selects Unity for subsequent investment; move existing features in controlled increments with their own asset/state/control/save evidence and human review.
