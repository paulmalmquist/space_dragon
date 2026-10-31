# Current milestone

**ID:** SD-M1 — First Contact local foundation

**Story planning update — October 30:** [the campaign contract](../story/CAMPAIGN_STRUCTURE.md) now fixes Earth plus five off-Earth planets with five missions each, Viera relocation, and an active mission roster of at most three family members with one leader and a designated mostly autonomous sidekick/button. This is authoritative planning; no 25-mission campaign or party AI is implemented here. Preserve the existing five-person cast/suit introductions while adapting future mission participation to the roster cap. Fresh chats use [the repo guidance](../project/FRESH_CHAT.md).

**Prototype production update — SD-036:** the owner starts with Seele-generated dragon dogfight games, then combines useful parts of several prototypes into Space Dragon. [This parallel track](../engineering/PROTOTYPE_INTEGRATION.md) may precede the Earth slice in production while the narrative remains Earth-first. Inspect actual deliveries and select a bounded integration before changing runtime/engine or claiming flight completion.

**Authorized scope:** the owner's October 29 follow-up selects game CI, pure story state/save v2, the scripted keyboard/speech/help/suit/scan/map slice, and the first pod asset. The earlier SD-M0 covered rules/contracts/skills only.
**Game status:** First Contact IMPLEMENTED with automated browser/state coverage and a technically verified Blender pod. Human audibility/usability, final art, and public deployment are not complete. See [status](../project/STATUS.md) and [the current implementation decision](../decisions/2026-10-29-first-contact-v2.md).

**Latest authorized increment:** SD-021 adds walkable third-person navigation in the living-room/backyard blockout. The owner's instruction to begin this work permits this bounded increment while the family review is pending. It does not approve Mission 1, whole-town exploration or final art. SD-020 records later home/yard/garage video reference; no footage has arrived.

## SD-M0 acceptance

The root guidance routes tasks to relevant documents; the current Act I and photo-publication decision remain authoritative. Three usable skills cover feature building, Blender work and playtesting. Claude mirrors are reproducible. Static checks and their negative tests run without application dependencies. Manual agent-regression scenarios exist and are not misrepresented as executed agent evaluations. Existing story and photo content stays intact.

## SD-M1 — First Contact acceptance

**Status:** local code and automated scenario coverage now include the spoken-help path and five suit introductions. The narrator API/captions are tested; actual audibility and child usability remain a human gate. Host-site integration remains pending. Provisional art is not final art approval.

Player outcome: open the game, see the family at the living-room computer, receive the interrupted signal, investigate the backyard pod, complete one supported interaction, and resume from a saved checkpoint.

| Check | Observable result |
| --- | --- |
| M1-01 | The opening follows Act I; no invented dragon or preselected family origin. |
| M1-02 | A clear action moves from the computer interruption to the backyard arrival. A transition can substitute for free walking. |
| M1-03 | One pod interaction offers replayable spoken instructions and help. Assisted completion progresses the scene. |
| M1-04 | Suit acquisition is introduced without requiring five finished models or five tutorials. |
| M1-05 | Reload resumes at the last completed checkpoint; replay/skip cannot duplicate a reward. |
| M1-06 | Direct navigation to the intended `/space-dragon` route works in the tested integration; the existing homepage is unchanged. |
| M1-07 | The chosen input/device matrix, missing tests and asset limitations are recorded. |

Current technical evidence: M1-01/02 use the script's short form; M1-03 has browser speech/replay, three help levels and an assisted scan; M1-04 has five ordered suit cards; M1-05 has guarded rewards, versioned saves/migration and recovery; M1-07 records **Lenovo 82XM / Chrome / keyboard** with listening/human/GPU limitations. M1-06 is verified only as a local prefixed route, not an integration with the existing website. Use [the ten-minute playtest](../PLAYTEST_FIRST_CONTACT.md) before treating First Contact as a human-reviewed slice or expanding to Mission 1.

## SD-M1 navigation increment

**Status:** IMPLEMENTED and technically VERIFIED by the [navigation receipt](../reports/2026-10-29-third-person-navigation.md). The useful outcome is a person the player can walk around, with the world providing nearby things to do. This is a separate exploration mode alongside the existing scripted First Contact flow; it preserves the story's v2 checkpoint format and rewards. Human control feel, audible guidance and actual AMD renderer performance remain NOT TESTED.

| Check | Observable result |
| --- | --- |
| N1-01 | A clearly provisional humanoid is visible from behind; WASD and arrows move relative to a smooth third-person camera. |
| N1-02 | Walls, furniture and the yard boundary stop the player; the living-room doorway allows an ordinary walk into the backyard. |
| N1-03 | Computer and pod actions appear only within reach; Space/Enter performs the nearby action. The player cannot activate them from across the map. |
| N1-04 | One clearly labeled training module can be collected once, stays collected on reload, and does not grant a canonical suit/dragon reward. Position resumes safely using a separate exploration save. |
| N1-05 | Pause, window focus loss and notebook typing stop movement and clear held input. Returning does not continue walking until the player presses a movement key again. |
| N1-06 | Existing First Contact state/save and browser checks still pass. Navigation has reproducible unit and real keyboard browser coverage; human feel, audible guidance and AMD hardware performance are recorded separately. |

Current software evidence: `npm run check` passed **36 unit tests**, the TypeScript/production build, **21 development** and **5 production browser tests**, and all **18 reference image** inventory/hash checks. Navigation browser cases use real keyboard movement through the doorway, near the computer/pod and around the pod to the pickup; they also verify keyboard default start, camera follow/rotation, independent save reload, pause/focus/notebook input recovery, safe-pose recovery and First Contact help isolation. Chromium/SwiftShader is automation evidence, not a hardware benchmark or human review.

The [home-video guide](../REFERENCE_HOME_VIDEO.md) prepares later visual refinement. The current layout is generic and does not claim to reproduce the owner's actual property. Final likeness, complete character rigs, companions, jumping, stairs and full town traversal are outside this increment.

## Explicit exclusions

No whole town, all retrieval missions, complete combat/racing systems, full dragon flight, split parties, follower navigation, multiplayer, cloud accounts, telemetry platform, all five finished avatars, or public release of likeness assets. A placeholder is acceptable when labeled; it must not be presented as finished art.

## Before expansion and site integration

The local package/lockfile, browser checks and machine inventory are documented. The actual host website repository and deployment remain unidentified; inspect their routing and existing tests before integration. **Inputs:** keyboard first, with this Lenovo laptop/Chrome selected for the family playtest. An Xbox controller is supported only if it works with no setup, and touch is deferred; see [the decision](../decisions/2026-10-29-keyboard-first-input.md). Actual controller support, AMD performance and human listening remain untested. Do not infer a child's reading level from age. Deployment and paid infrastructure remain separate decisions.

## Next increments, not promises

A single town retrieval and return-home reveal can follow First Contact; expand only after its interaction and save loop works. The old flight-first Launch Day proposal may be a separate technical prototype, not a replacement for the narrative opening.

For every increment, record the request, bounded outcome, exclusions, acceptance checks and evidence. Close it with a receipt before expanding scope.


## Separately authorized Town Drive Lab — SD-046

The owner requests a bounded technical drive prototype based on two local videos, separate from Act I missions and the default home flow. [The decision](../decisions/2026-10-30-town-drive-lab.md) records reference-driven procedural roads after a failed reconstruction suitability spike, an estimated reference house layout authorized for the review build by [SD-052](../decisions/2026-10-30-town-drive-detail-override.md), four main legs with right/left/left turns and invented connectors. Acceptance: keyboard/analog-controller driving, safe reset/pause/focus/reload, complete loop, local comparisons and correct runtime asset packaging. SD-052 additionally requires a substantial upgrade toward photorealistic detail and removes the original privacy rule. [The receipt](../reports/2026-10-30-town-drive-lab.md) owns actual checks; human recognition/fun, physical controller and release approval remain separate.

Prior SD-052/055 detail/traffic evidence: clean PR check passed 58 unit, 28 development-browser, six production-browser and 18 photo checks, plus foundation/Python checks. A final 20-second installed Chrome/AMD chase sample at 1440 × 900 averages 60.04 fps. The complete cautious traffic-following loop and reload pass (456 simulated seconds). Manual lap timing, full-loop thermal/endurance and human/controller review remain pending; see the [combined receipt](../reports/2026-10-30-town-drive-detail.md).

The owner subsequently authorizes NPC traffic and agent-chosen roadside details under [SD-055](../decisions/2026-10-30-town-drive-traffic.md). Acceptance includes paused traffic freeze, two-way movement, signal/following behavior, forgiving collisions and preserved checkpoint completion.

[SD-057](../decisions/2026-10-30-town-drive-lived-in-streets.md) extends the same lab with sidewalk walkers, real street labels, developed side views and a white Odyssey-inspired minivan. Implemented checks cover optional first-person selection, cabin placement, left/right look without steering, release on pause/blur, visible development on both sides, pedestrian pause/sidewalk confinement and preserved traffic/checkpoints. [New verification](../reports/2026-10-30-town-drive-lived-in-streets.md) records 66 units, build, 29 development cases, six production cases, 18 photo checks, actual scene images and measured performance. Human appearance/handling and sustained-performance acceptance remain open.

[SD-058](../decisions/2026-10-30-town-drive-home-route.md) corrects the invented outbound connector to the mapped Starpass Court → Green Island Boulevard → Green Island Terrace → right onto Hypoluxo exit. Route geometry, turn order, labels and complete-loop/save checks pass; agent views show the court and gate approach. House parcels remain estimated and the video corroborates the gate/arterial sequence. Google Maps visual access was blocked; OSM geometry supplies road centerlines. Owner recognition remains unreviewed.

**SD-063, technically verified:** [correct junctions and stable driving presentation](../decisions/2026-10-31-town-drive-junctions-and-motion.md) are implemented: four T junctions, two crossings, seven police/barricade closures, shared car/camera interpolation and no body bob. [Verification](../reports/2026-10-31-town-drive-junctions-and-motion.md): 77 units, 31 distinct development cases (one isolated-port fix/retry), six production cases, 18 photo checks and foundation checks pass. The full traffic lap/save and cabin/chase attachment pass; human road recognition, comfort and sustained performance remain open.
