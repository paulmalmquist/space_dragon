# Testing prototypes as one Space Dragon game

**Date:** October 30, 2026. **Tracking:** SD-039. **Work state:** planned.
**Authority:** CONFIRMED request for testing guidance and integration blind spots. The sequence, additional tests and promotion criteria below are PROPOSED. Existing [quality gates](QUALITY_GATES.md), [architecture](ARCHITECTURE.md) and [interaction rules](../gameplay/INTERACTION_CONTRACTS.md) still govern implementation. This assessment changes documentation only.

## Main recommendation

Keep experiments small, and connect their entry/exit behavior while they are still rough. Maintain one short, repeatable journey through the accepted pieces. Every new prototype should prove a useful gameplay idea, then demonstrate how it enters, leaves, preserves progress and hands control to the next scene before extensive polish or replication.

Track three separate questions: **does the feature work alone, does it work in the journey, and does the journey feel good?** A passing isolated lab cannot answer the other two. Integration includes coherent controls, art, music, pacing and recovery as well as software compatibility.

## Evidence we actually have

Source inspection in this task covers the current unit/browser suites, workflow, input/audio/flight code and task receipts. Counts below describe recorded prior runs, not a newly executed gameplay run or the latest hosted result.

| Area | Existing evidence | What it does not establish |
| --- | --- | --- |
| Story, exploration and flight logic | 51 unit cases recorded in [SD-037](../reports/2026-10-30-seele-dogfight.md), including saves, once-only rewards, navigation, aiming, projectile hit logic and rolls | A continuous campaign or enjoyable controls |
| Development and built game | SD-037 records 25 development and seven production browser cases; [workflow](../../.github/workflows/foundation.yml) declares both suites | The current uncommitted tree has not acquired a new hosted CI pass merely because the workflow exists |
| Earth/lab boundary | [Dogfight browser tests](../../tests/dogfight.spec.ts) visit the lab, retry/reload/return and compare existing storage bytes | Shared campaign progress, rewards, destination entry or seamless camera/audio continuity |
| Failure handling | Missing model recovery, invalid/future saves, storage failure and synthetic blur are covered in selected tests | Every load-failure point, actual background-tab suspension, context restoration or long-session cleanup |
| Visible gameplay | Real keyboard/mouse input is used; development tests inspect flight state and aim geometry; production tests check UI/state markers without developer APIs | A `data-firing` flag alone cannot prove visible projectiles, lighting or an enjoyable battle. No complete victory/recovery browser journey is asserted by the inspected dogfight cases |
| Sound and hardware | Narrator API behavior is mocked in tests; SD-037 records an installed-Chrome/AMD smoke | Actual listening, sustained frame timing, temperature-related slowdown or family usability |
| Cinematics, party and later missions | [Takeoff plan](CINEMATIC_TRANSITIONS.md), campaign and party contracts | Runtime behavior: those planned systems have not been built |

The latest attempted browser rerun in [SD-038](../reports/2026-10-30-cinematic-transition-scope.md) was blocked by loopback `EACCES` after units/build passed. Keep that environmental result separate from the earlier successful browser evidence. Do not weaken tests or mark a blocked run green.

## Blind spots and how to expose them early

| Risk | Concrete Space Dragon example | Earliest useful test or decision |
| --- | --- | --- |
| Integration deferred until the end | Excellent walking, flight and cutscene demos each assume their own startup/reset | Connect a rough incoming scene, the candidate and a rough outgoing scene; exercise return/retry/reload before art polish |
| Conflicting state ownership | A flight retry resets earned parts, or both an animation callback and mission code grant a reward | One authoritative transition/reward owner; repeat, skip and interrupt the boundary; compare durable state |
| Inconsistent controls/settings | WASD walks on Earth; W/A/D/Z aims in flight. Q/E orbit on Earth and roll in flight. Sound/reduced-motion preferences belong to separate current implementations | Preserve authorized mappings, but cue each mode clearly and require fresh input. Test preference policy across entry/return; decide shared settings before claiming one-game consistency |
| A test verifies its own success flag | The HUD reports firing while a shader, muzzle transform or projectile rendering is broken | Pair state assertions with visible consequences and a brief rendered review. Keep tests of logic separate from visual acceptance |
| Costs appear only in combination | Scene A does not release textures, audio or listeners before B; camera handoff triggers shader work | Repeated transitions plus cold-load and long-session runs on the Lenovo. Measure active resources and hitches; verify only one input/render owner |
| Art cannot survive integration | New dragon export changes bone names, scale, forward axis, material exposure or recoverable-part pivots | Import a small representative asset, check neutral views and motion in-game, and retain the source/manifest/version. Match both sides of each transition |
| Difficulty and pacing are disconnected | A forgiving learning stop flows immediately into unfamiliar fast flight; dialogue continues over required aiming | A short whole-journey playtest with help available. Listen to overlap, assess readiness and recovery, and keep required reading away from fast control |
| Prototype multiplication hides production cost | Twenty-five missions each require bespoke code, a different HUD and manual fixes after every export | Produce a second variant from one proven mission recipe before committing to broad content production; record what was actually reused and what still needs custom work |
| Generated exports become unmaintainable forks | A later Seele export overwrites local controls or brings different dependencies/asset rights | Preserve immutable raw delivery, compare source/asset versions, adapt selected changes and rerun the boundary tests; prove another local edit works |
| Local success is mistaken for a releasable build | Ignored files or missing LFS objects exist only on this computer; website route behavior is unknown | After a selected commit, clean checkout/install/build with intended assets; test the actual site integration when its source is available. Keep publication and rights review separate |

These are risks inferred from the inspected structure, not claims that every example is an observed defect. Current separate pages deliberately limit resource overlap; they also conceal the work needed for a shared lifecycle. Choose the eventual scene boundary after the first connected proof, before making many scenes depend on a particular engine.

## Incubation and promotion

Use a small feature row linked to its receipt, not a new project-management platform. Record: idea ID, playable entry, upstream/downstream scene, authoritative state affected, input/settings owner, asset/source version, latest tested artifact, known limitations and next gate.

| Stage | Evidence needed to move onward |
| --- | --- |
| Experiment | One explicit question answered by a playable example; inspect source, dependencies and assets; retain a discard option |
| Isolated candidate | Core behavior and failure/retry work; clean local import; one subsequent edit succeeds; current campaign data stays safe |
| Connected candidate | Entry and exit work with a neighbor; shared-state/settings contract is satisfied; interruption and cleanup tests pass on the combined build |
| Human-reviewed slice | Someone plays and listens on the target computer; clarity, comfort, pacing and fun are assessed independently of automated counts |
| Reusable production piece | A second variant can use the same tested boundary; source assets, budgets and maintenance cost are understood |

These are proposed production stages, not replacements for IMPLEMENTED, VERIFIED, REVIEWED and APPROVED FOR RELEASE. Keep authority and work state separate as the [ledger](../project/IDEA_LEDGER.md) already requires. A second prototype should not indefinitely defer fixing a broken connected journey.

## The small shared boundary

Before connecting a candidate, define its required entry state, completion/cancel/retry results, and who owns loading, pause, input, sound and disposal. Stable mission/character/component IDs belong to the host state; scenes emit validated outcomes rather than writing arbitrary campaign saves.

For future adapters, the minimum capabilities are preparation/readiness, entry, pause/resume, exit/disposal and a completion result. Do not create a large generic framework until a second integrated use demonstrates the abstraction. Verify versioned data at a boundary; never pass Babylon/Three objects into the persistent campaign record.

The current one-pilot rule, at-most-three active party, separation of learner/avatar/action assistance, and assisted story completion remain nonnegotiable existing constraints. Learning observations use synthetic profiles in tests. Test help/skip without labeling it independent mastery. A sidekick cannot become a hidden fourth participant or a multiplayer dependency.

## Test layers and responsibility

| Layer | What to test | Who and when |
| --- | --- | --- |
| Pure rules and contracts | Valid/invalid transitions, unique rewards, migrations, assistance flags, pose/velocity validity | Agent-maintained deterministic unit tests when rules change |
| Boundary integration | Real entry/exit, storage/settings handoff, canceled loads, stale callbacks, input/audio ownership and cleanup | Agent-maintained tests whenever connecting or changing a scene boundary |
| Short browser journey | Actual keyboard/mouse actions through the public entry, a success/recovery route, reload and next objective | Existing Playwright development and production suites, extended with selected journey cases on relevant changes |
| Deliberate failure | Missing/delayed assets, rejected audio/video start, storage write failure, hidden tab/context loss and repeated input | Focused fault tests at the changed boundary; do not multiply every combination indiscriminately |
| Presentation and performance | Canonical-frame comparisons, camera motion clip, audible mix, cold/warm loading, frame-time distribution and repeated transitions | Automated captures/measurements plus observed Lenovo/Chrome review after rendering/asset changes |
| Family experience | Can the player understand the next action, regain control, get help and want to continue? | Brief adult-supervised playtest after technical blockers are removed |

Agents own the technical scripts, fixtures, captures, diagnosis and receipts. Paul's input can stay creative: "this feels slow," "the transition is confusing," "the camera makes me uncomfortable," or "this is the part we want to repeat." Human observation still matters for enjoyment and audible output; children should not be asked to debug the application. Use the existing [ten-minute playtest](../PLAYTEST_FIRST_CONTACT.md) and keep identifying observations local.

Follow [Playwright's guidance](https://playwright.dev/docs/best-practices) on independent fixtures, user-facing interaction and retrying assertions. For a 3D canvas, a read-only development snapshot is useful alongside actual input and visible consequences; it must not mutate progress to manufacture a pass. Production checks run without those hooks. Seed synthetic saves for targeted cases, but retain an unseeded journey so fixtures cannot conceal unreachable prerequisites.

For visual checks, seed random effects and select a known pose/time in a dedicated test fixture. Keep browser/OS/render settings consistent and review baseline changes. [Playwright notes](https://playwright.dev/docs/test-snapshots) that rendering varies across environment and hardware. Screenshot comparison can catch missing objects and framing changes; normal-speed video and play are still needed for jerk, responsiveness and comfort. Review new baselines rather than automatically accepting every diff.

## A connected journey, built in increments

**First, strengthen what exists:** start on Earth, make real progress, enter the lab through its link, fly, pause/retry, complete or recover from the encounter, return and reload Earth. Verify the original checkpoint and the intended settings/control policy. Existing tests cover parts of this; full outcome and repeated-lifecycle coverage still need implementation.

**Next, the cinematic proof:** implement SD-038's provisional takeoff inside flight and attach it to a safe corridor before the existing encounter. Test normal finish, skip and interruption against the same state outcome and actual fresh steering. This does not require finished Earth missions or an engine rewrite.

**Then, a short connected campaign rehearsal:** one walking interaction, a validated departure fixture, takeoff, flight encounter, a placeholder destination and checkpoint reload. Target roughly 5-10 minutes for review, not a development deadline. Use synthetic progress and a clearly labeled rehearsal until actual Earth assembly prerequisites exist; fixture access must not become a production bypass. The placeholder is a destination test, not an additional canon planet or an implemented mission claim.

Only after this works should the same pattern be expanded into richer missions/planets. When a feature is not ready, use a clearly identified stub to test the surrounding boundary, and record that the stub does not verify the missing feature.

## Prioritized missing coverage

All rows below are **planned / NOT TESTED by this assessment**. Existing partial coverage is named rather than claimed as a new pass.

| ID | Priority / scenario | Required observable result |
| --- | --- | --- |
| INT-01 | Next: complete dogfight and recovery paths through real input | Success/recovery UI appears appropriately; retry resets only encounter state; return/reload preserves earned Earth progress |
| INT-02 | Next: repeat Earth/lab enter-exit-retry cycle, including browser Back/Forward | No stale key/fire/zoom, duplicated audio or dead controls; exactly the intended active loop; existing save remains valid. Back/Forward behavior is explicitly defined |
| INT-03 | Next: actual tab backgrounding and settings continuity | Pause/resume needs fresh input; audio stops; no elapsed-time catch-up. Mode cues and the selected mute/reduced-motion policy are consistent |
| INT-04 | With SD-038: cinematic normal/skip/replay/held-input at each boundary | Same final state; no duplicate completion; camera/dragon pose and velocity are continuous; playable flight uses fresh input |
| INT-05 | With campaign transition: reload before, during and after checkpoint commit | Resume at documented source or destination; no missing/duplicate reward. Quota/blocked write is visible; recovery checkpoint remains available |
| INT-06 | With new scene assets: delayed/missing model, failed optional video, WebGL loss | Bounded recovery with retry/return; no indefinite hidden input lock. Existing progress survives; an optional effect cannot become a story gate |
| INT-07 | With connected rehearsal: cold load plus repeated transitions/long session | Measure frame times, worst handoff hitch, bytes, ready time and resource growth on actual AMD renderer; no unexplained accumulating resource trend |
| INT-08 | With learning/party features: help, absent member and avatar/profile boundaries | Required story remains completable; assistance stays recorded as assistance; no cross-profile overwrite or impossible party gate |
| INT-09 | Before scaling/release: second content variant and clean build | Reusable recipe holds, required asset identifiers exist, no ignored/private dependency, raw media is excluded, reviewed rights and actual host routes are accounted for |

Cover every high-consequence state boundary and representative combinations of lower-risk settings. Use a small set of valid fresh/in-progress/completed/legacy/corrupt synthetic saves; muted/reduced-motion combinations; warm/cold loads. Vary seeds for combat after a reproducible baseline. Preserve the failing seed/actions. Do not claim all cases from one happy-path run or hide flakiness behind repeated retries.

## Measurements and evidence

Start with the Lenovo 82XM/Chrome/keyboard target. Mouse is also part of the authorized flight controls; Xbox remains opportunistic and touch deferred. Other browsers/devices become gates when support is selected, not an unbounded test-matrix requirement today.

Use the existing 60 fps aspiration as a target, not a measured achievement. For a proposed 20-30 minute connected session and repeated transition cycles, record actual renderer, browser, viewport, render scale, power mode, cold/warm load time, frame-time percentiles, worst transition hitch and resource trends. Compare consistent runs; do not call JavaScript heap size total GPU memory or software-rendered CI a hardware benchmark. Choose numerical regression thresholds after a baseline, then include them with the scenario.

Keep local diagnostic records small: build/asset version, scene/transition ID, checkpoint revision, input owner, load failure and pause/resume events. No remote telemetry service or child records are needed. Reproduce a defect with the initial synthetic save, actions, expected/actual result, trace/screenshot and environment. Save loss, impossible progression and missing input/recovery block promotion; visual/pacing defects can be tracked for the next polish pass unless they impair play.

Every receipt identifies the tested artifact. Local uncommitted work, a built bundle, a pushed branch and a hosted CI run are different evidence. Once code is selected for commit, require fresh checkout/build and actual run results before calling the combined revision verified. A green CI badge from an older commit is not a current proof.

## Next useful action

Implement INT-01 through INT-03 against the existing Earth/lab boundary before adding more isolated systems. Combine their technical result with a short adult flight/transition review. Then pair SD-038's takeoff implementation with INT-04, and use its evidence to choose the campaign scene boundary. No full campaign, generic test platform, new backend, expanded device support or background automation is authorized by this planning request.

Official sources above were read on October 30, 2026. The project-specific risk assessment and recommended sequencing are inferences from the current code/contracts; the [assessment receipt](../reports/2026-10-30-integration-testing-scope.md) distinguishes source review, executed checks and unperformed gameplay tests.
