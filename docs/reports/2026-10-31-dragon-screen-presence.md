# Dragon screen presence — SD-079

**Subsequent steering:** SD-080 replaces the source-art direction with a purple organic reference after Blender Undo. SD-079 closer-camera/render-cadence edits pass 69 EditMode tests, and the camera/audio Web build plus both browser suites now pass; organic source-art approval and runtime promotion remain separate. New visual work follows [the later decision](../decisions/2026-10-31-purple-organic-dragon.md).

## Scope and current status

**IMPLEMENTED and technically VERIFIED for the named camera/presentation/player checks.** Owner, October 31: “it should also be a big bigger in view and more menacing somehow”. [Decision](../decisions/2026-10-31-dragon-screen-presence.md); [verbatim inbox](../../ideas/INBOX.md).

This is a bounded closer-framing, visual-posture and lighting pass on the heroic v005 dragon. The SD-078 source/export and its [final verified player](2026-10-31-near-orbit-heroic-dragon.md) are the before state. Those earlier checks do not establish this follow-on artifact. Source scale, rig, collision, controls, movement/combat and save boundaries must remain intact.

No new Blender/source edits are claimed at intake. Root owns implementation and final build/browser verification; records remain separate from that work. Shared branch `feat/town-drive-lab` has concurrent changes and must not be reset. Current tested source HEAD is `b89a0fc887ee60a57eac9f5aaad8e2ef588ca3d2` with uncommitted Dogfight changes. The player still uses the existing mechanical v005 GLB; organic v006 remains source-only.

## Checks

| Check | Result | Evidence and limitation |
| --- | --- | --- |
| Intake, source wording and scoped decision | RECORDED | SD-079; new screen-presence outcome, unchanged gameplay baseline. |
| Camera/render-cadence source inspection | IMPLEMENTED; player appearance reviewed below | Cruise camera distance 9.8 m / height 3.55 m, look height 1.2 m, wing strokes 1.05–1.55 s / glide holds 0.9–1.8 s, rim intensity 1.3. No new Blender source or collision/authoritative gameplay change claimed. |
| `run-dogfight.ps1 -Action test` | PASS | `artifacts/unity/dogfight-editmode-20261031-204803-111-33840.xml`: 69/69, zero failures/skips, 0.3037791 s. Logic/compilation only; not final visual acceptance. |
| Camera/audio Unity Web build | PASS | `artifacts/unity/dogfight-web-20261031-210111-045-34672.log`; created `2026-10-31T21:04:06.8096998Z`, 119.72 s, 130,569,568 bytes, settings restored. Receipt SHA-256 `7386f98c26d42f7e704066eda72738379e2ab271b13bbbef5990c052c7462361`; GLB remains `94f17d2c3f0026364aeffd7d5ceb0876f9f8e9c65ed66067c82f27260116fa60`. Separate final browser checks and screenshot observations follow. |
| Final EditMode run after audio bindings | PASS | `artifacts/unity/dogfight-editmode-20261031-211314-795-21960.xml`: **69/69**, zero failures/skips, 0.3162578 s. Complements actual-player checks; no audible mix/owner approval implied. |
| Final WebGPU browser framing and flight/combat checks | PASS | `artifacts/unity/dogfight-presence-audio-playtest/runs/2026-10-31T21-08-22-430Z/report.json`: 11/11. Normal flight, steering, boost/zoom, rolls, aiming/fire/breath and recovery; zero console/page/request errors or external requests, scoped localStorage unchanged. |
| Forced-WebGL2 final suite | PASS | `artifacts/unity/dogfight-presence-audio-playtest-webgl2/runs/2026-10-31T21-10-41-104Z/report.json`: **11/11**, sixteen screenshots, no console/page/failed/external requests, scoped localStorage unchanged. |
| Final natural-flight samples | RECORDED | WebGPU and WebGL2 measurements below; ten-second wall-clock samples, not GPU time/endurance/exact VRAM. |
| `python tools/check_foundation.py` and scoped `git diff --check` | PASS | Records/foundation only; not gameplay or appearance verification. |

## Actual framing review and measurement limits

Root inspected the final WebGPU `natural-flight.png`: larger wings occupy roughly the lower half of the view, the central reticle stays clear and the tail remains cropped at the lower edge as before. That is a bounded technical appearance review, not owner approval of menace or comfort. The actual steady-cruise camera test passes the **9.8 m** setpoint; the later 9.627 m trailing measurement occurs during a real turn and must not be presented as its steady value. Camera/visual changes do not scale the model or hitbox.

Final WebGPU ten-second samples use installed Chrome/AMD at 1366×768 with real steering, separately from quiet art fixtures. The sample averages about 58.8 fps; ordinary desktop load is not controlled. Unity's WebGPU texture API underreports allocations compared with WebGL2. Gzip response bodies total 43,270,033 bytes. These complete Development-player results do not establish sustained performance, final release packaging or organic v006 readiness.

Final WebGL2 screenshot inspection also finds the central reticle/targets clear while banking, with the larger dragon and horizon visible. Source scale/collision remain unchanged. Separate quiet heading capture `artifacts/unity/screen-presence-review/runs/2026-10-31T21-13-13-958Z/report.json` preserves 0/120/240-heading screenshots for review without overwriting SD-078 evidence; root actually inspected all three final PNGs at observed 0°, 120° and 242.5°. Larger wing construction is readable, the reticle stays free, horizon/HUD remain visible, and the belly/tail still extend below the lower help bar. Existing sky-seam dashes remain at the 242.5° view. Quiet conditions suppress threats/rock collision but lock/warning visuals may remain; these are art captures, not natural-performance, difficulty or owner-approval evidence.

| Backend | Frames | Mean interval | Approx. fps | p95 | Last-frame draws | Rendered triangles | Unity texture allocation |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| WebGPU | 592 | 16.998 ms | 58.8 | 19.999 ms | 422 | 330,710 | 1.167 MiB |
| WebGL2 | 593 | 16.892 ms | 59.2 | 18.000 ms | 421 | 329,080 | 91.422 MiB |

The different texture counters describe backend accounting, not comparable exact driver VRAM. Both final runs observed 43,270,033 gzip response-body bytes. [Local before/after and heading gallery](../../artifacts/unity/screen-presence-review/index.html). [WebGPU framing screenshot](../../artifacts/unity/dogfight-presence-audio-playtest/runs/2026-10-31T21-08-22-430Z/natural-flight.png), [WebGL2 framing screenshot](../../artifacts/unity/dogfight-presence-audio-playtest-webgl2/runs/2026-10-31T21-10-41-104Z/natural-flight.png). Earlier SD-078 imagery remains attached to its own artifact.

## Review and recovery

The owner requested more presence/menace, but has not reviewed the new result. Preserve the previous camera/presentation settings and SD-078 player evidence for comparison/rollback. No new physical dragon size, hitbox, campaign state, source redesign, deployment, commit or push is implied. This increment is technically verified for these named checks; owner judgment of menace/comfort and sustained performance remain open. No organic v006 game promotion is implied.
