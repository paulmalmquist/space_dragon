# Decision — PlayStation controller input for the browser prototype

**Later Unity Dogfight request — SD-089, November 1:** [the owner now includes controller bindings in the current combat pass](2026-11-01-unity-dogfight-playstation-input.md) and will bring a pad next test. That new Unity mapping does not inherit this Earth/browser adapter's simulated results. Physical DualShock 4/DualSense USB/Bluetooth, feel and haptics remain NOT TESTED; no rumble is promised. Keep the earlier runtime-specific mapping and evidence below intact.

> Originally imported from `origin/main@96002d7` for [SD-046 Town Drive](2026-10-30-town-drive-lab.md). The October 31 merge of `origin/main@65f908b` adapts the original controller work to the current walking and version-2 First Contact runtime. Its incoming SD-038 is recorded as **SD-070** in the merged ledger; this branch's existing SD-038 keeps its own meaning.

**Recorded:** October 30, 2026
**Authority:** CONFIRMED owner request: “Can we get this to work plugging in a PlayStation controller”
**Task:** SD-070 (incoming branch: SD-038)
**Supersedes:** only the assumption that Xbox was the sole opportunistic gamepad. [Keyboard-first](2026-10-29-keyboard-first-input.md) remains authoritative; touch remains deferred.

## Decision

Use the browser [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API) and its **standard** mapping, so a DualSense, DualShock 4, Xbox pad or other standardized pad can operate the web game without a new engine or device-specific software. Keep keyboard/mouse available throughout. A nonstandard/unmapped controller is reported, not guessed.

The current Earth runtime offers walking and the First Contact story. Keep their existing state transitions, collisions, saves, assistance and unique rewards, and route controller inputs through the same semantic actions as keyboard input:

| Controller | Walking | First Contact story |
| --- | --- | --- |
| PlayStation Cross / Xbox A (button 0) | Start walking from welcome; interact with a nearby object | Advance or scan once on each fresh press |
| Left stick / D-pad | Move the existing avatar relative to the camera | Bounded camera pan; select the scanner target during Lyla's scan |
| Right stick | Rotate the follow camera | Orbit the story camera |
| L2/R2 or LT/RT | No action | Zoom out/in |
| Square/X, Triangle/Y, L1/R1, Options/Menu | No additional Earth actions | No additional Earth actions |

The welcome screen's First Contact buttons still select that story. Keyboard/UI pause and help controls remain available; this change does not assign Earth pause to Options. Town Drive retains its separate standard-controller mapping, including analog triggers, handbrake, reset, camera and pause. Dogfight's existing keyboard/mouse controls are unchanged.

The adapter exposes semantic action and camera values, not controller hardware assumptions, for future game systems. It uses a radial dead zone, frame-time-based camera movement, trigger intensity, button rising edges, and one active standard pad (single-player). Camera pans are bounded to avoid losing the story scene. Releasing/holding inputs never queues extra story transitions. Input is ignored while paused, the idea notebook is open or the page is hidden. After connection, pause, dialog or mode changes, release the action button, sticks and triggers to neutral before inputs re-arm. Disconnect clears controller movement while keyboard input remains usable. Polling is disposed when the page ends.

## Connection and troubleshooting

- Connect a PS5 DualSense or PS4 DualShock to the computer by USB or supported Bluetooth. Open the local game in a browser supporting the Gamepad API on localhost or HTTPS and **press Cross once** to expose the pad to the page if necessary.
- A visible status distinguishes waiting, connected, browser unsupported, and nonstandard mapping. When connected, it displays currently functional controls.
- Some browsers or operating systems expose controller IDs/inputs differently; **do not promise universal plug-and-play**. In particular haptics, adaptive triggers, touchpad, speaker and motion sensing are not required or implemented.
- Keyboard/mouse continue to work if the pad disconnects.

## Verification boundary

The adapted Playwright cases use a simulated standard DualSense pad to cover current story Cross edge-triggering, camera inputs, unmapped-device rejection, disconnect fallback, notebook input isolation, walking/look and neutral re-arming after pause. `gamepad.spec.ts` is explicitly included in the full suite and the focused controller CI workflow. In the October 31 isolated merge review, `npm.cmd run typecheck` passed and `SPACE_DRAGON_NATIVE_CHROME=1 SPACE_DRAGON_TEST_PORT=5202 npx.cmd playwright test tests/gamepad.spec.ts --output artifacts/merge-gamepad-results` passed **4/4** in native Chrome; log: `artifacts/merge-gamepad.log`. Full merge checks are recorded separately. A simulated controller is **not a real hardware test**.

**NOT TESTED** until observed on a real PS4/PS5 pad: USB enumeration, Bluetooth pairing/reconnect, browser-specific button mapping, latency/drift, frame feel, and physical-device cross-browser reliability. Record a named OS/browser/controller/cable or Bluetooth adapter and direct observations before declaring plug-and-play verified.

This is not a Unity migration, deployment, or permission to add unrequested character/combat systems.
