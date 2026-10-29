# CB-007 - Browser reliability, assistance and performance

**Authority:** CONFIRMED keyboard-first direction; detailed reliability/assistance rules PROPOSED. **Maturity:** SPECIFIED. **Gameplay evidence:** NOT TESTED.

## Player outcome and hypothesis

A fair timing mechanic remains fair on the supported device and control method. Family assistance must help play without changing story authority or pretending to measure learning mastery.

## Proposed contract

Separate simulation time from rendering. Replay identical timestamped input at 30/60/120 rendered frames per second against the same fixed simulation step; contact results must match. Record quantization and latency behavior explicitly. Test boundary inputs separately from human timing trials.

Pause/suspension clears stale held inputs and prevents unlimited catch-up or an unavoidable attack on return. Do not replay an old buffered parry after focus loss. Counter expiry uses the documented simulation-time policy. Local single-player actions must not wait for a backend. This is not a claim that a particular Railway deployment has been tested or selected.

Keyboard is the primary required input for on-foot play and dragon flight, per the owner decision in `docs/decisions/2026-10-29-keyboard-first-input.md`. Every interaction must be completable on keyboard. The actual computer/browser still needs to be named. Browser viewport emulation is not real-device verification. Measure input-to-visible-response, frame-time distribution, stalls, memory and loading on the named device and build. Numeric performance budgets remain OPEN until a baseline is measured; report p50/p95/p99 rather than only average FPS. Record browser, hardware, scene, quality settings, warm-up and sample duration.

Run CB-007-T04 on keyboard first, including all combat and flight interactions without a connected controller. An Xbox controller is opportunistic only when the browser standard layout works without setup; test connect/disconnect and retain keyboard fallback. Do not pursue drivers or configuration work. Touch is deferred, not a first-milestone pass requirement. Rebinding, visible focus, non-color-only cues and reduced-motion behavior need observations. Assistance settings are independent of avatar/learner identity. A wider parry window is an experiment, not an accessibility certification. No personal child records or public telemetry are needed.

## Smallest experiment

Use the existing duel and flight scenes rather than building a benchmark game. Replay after tab suspension, disconnect the optional service, toggle assistance and effects, and test on the selected real device. Runtime/network multiplayer validation is deferred unless separately authorized.

## Failure signs

Refresh rate changes outcomes, an old input fires after resume, latency requires a server response, or a green desktop run is reported as a phone test.

## Test specifications

Cases in the [registry](../../tests/combat_cases.json): CB-007-T01, CB-007-T02, CB-007-T03, CB-007-T04.
These cases are not executed by the notebook checker.

## Evidence and next revision

Record build/commit, tuning values, exact case IDs, input/device, observed results, failures and recording/log locations in a verification receipt. Human judgment remains separate from rule-test results. Revise this note after the smallest experiment; do not silently mark it accepted.

**2026-10-28 / v0.1:** initial hypothesis and test specification. No gameplay implemented or tested.
