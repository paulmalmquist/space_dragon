# Decision — PlayStation controller input for the browser prototype

**Recorded:** October 30, 2026  
**Authority:** CONFIRMED owner request: “Can we get this to work plugging in a PlayStation controller”  
**Task:** SD-038  
**Supersedes:** only the assumption that Xbox was the sole opportunistic gamepad. [Keyboard-first](2026-10-29-keyboard-first-input.md) remains authoritative; touch remains deferred.

## Decision

Use the browser [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API) and its **standard** mapping, so a DualSense, DualShock 4, Xbox pad or other standardized pad can operate the web game without a new engine or device-specific software. Keep keyboard/mouse available throughout. A nonstandard/unmapped controller is reported, not guessed.

The *existing* First Contact scene is a static camera-and-story prototype, not character locomotion, combat or dragon flight. Implement only actions that genuinely exist:

| Controller | First Contact now | Later systems, not implemented |
| --- | --- | --- |
| PlayStation Cross / Xbox A (button 0) | Advance story once on each fresh press | Interact / basic action |
| Left stick / D-pad | Camera-relative pan within the scene | Move Line Leader or steer |
| Right stick | Orbit camera | Look / aim |
| L2/R2 or LT/RT | Zoom out/in | Contextual flight/brake/throttle |
| Square/X, Triangle/Y, L1/R1, Options/Menu | No action | Suit power, tandem, avatar switching, pause (proposal only) |

The adapter exposes semantic action and camera values, not controller hardware assumptions, for future game systems. It uses a radial dead zone, frame-time-based camera movement, trigger intensity, button rising edges, and one active standard pad (single-player). Camera pans are bounded to avoid losing the story scene. Releasing/holding inputs never queues extra story transitions. Input is ignored while the idea notebook is open or the page is hidden, and polling is disposed when the page ends.

## Connection and troubleshooting

- Connect a PS5 DualSense or PS4 DualShock to the computer by USB or supported Bluetooth. Open the local game in a browser supporting the Gamepad API on localhost or HTTPS and **press Cross once** to expose the pad to the page if necessary.
- A visible status distinguishes waiting, connected, browser unsupported, and nonstandard mapping. When connected, it displays currently functional controls.
- Some browsers or operating systems expose controller IDs/inputs differently; **do not promise universal plug-and-play**. In particular haptics, adaptive triggers, touchpad, speaker and motion sensing are not required or implemented.
- Keyboard/mouse continue to work if the pad disconnects.

## Verification boundary

A Playwright test with a simulated standard DualSense pad covers Cross edge-triggering, camera inputs, unmapped-device rejection, disconnect fallback and notebook input isolation. The CI browser job runs TypeScript/build and the Playwright suite. A simulated controller is **not a real hardware test**.

**NOT TESTED** until observed on a real PS4/PS5 pad: USB enumeration, Bluetooth pairing/reconnect, browser-specific button mapping, latency/drift, frame feel, and physical-device cross-browser reliability. Record a named OS/browser/controller/cable or Bluetooth adapter and direct observations before declaring plug-and-play verified.

This is not a Unity migration, deployment, or permission to add unrequested character/combat systems.
