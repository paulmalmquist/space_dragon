# First Contact state, accessibility and verification

Date: October 29, 2026. Source: the owner's request to implement game CI, a tested story-state/save-v2 module, and First Contact against its production script, plus the first pod asset and a family playtest. The owner selected **this Lenovo laptop with Chrome** for that playtest.

## Selected increment

Implement the local First Contact slice: launch-night computer → interrupted signal → backyard → five provisional suit introductions → Lyla's scan → symbol archive → town map. The [production script](../story/scripts/A1-00_FIRST_CONTACT.md) supplies this implementation treatment; its unselected dialogue, later musical/lore systems and the rest of Act I/II retain their existing proposal labels. Lyla's final suit color remains open.

- A pure TypeScript state module owns allowed transitions, stable suit IDs, once-only grants, hint state and checkpoints. Rendering/UI observes it. Captured semantic intents reject stale phase/suit events; archive replay never grants inventory.
- Save schema v2 validates progress invariants and conservatively upgrades v1: `computer` → signal, `backyard` → backyard, `pod` → suit introductions. New content is not silently marked complete. Legacy bytes remain intact; valid previous v2 state is backed up before a changed write. Unsupported future saves are protected until an explicitly confirmed reset. Storage failure is reported and permits current-visit play.
- Keyboard is primary. Arrows point, Space/Enter perform Action, H repeats the prompt, F1/? advances help, and Escape pauses. Held Action keys do not chain progress. Editing in the notebook does not control the game. Tab remains available for browser/accessibility tools.
- Browser/OS speech is a clearly labeled **placeholder computer narrator**, activated by a user gesture, with matching captions, replay/mute, cancellation on pause, and unavailable/error fallback. No microphone, cloned family voice, recording upload or voice service account is added. Actual audibility and child comprehension require human listening.
- The door/scan hint ladder gives a visual cue, a spoken nudge, then a one-Action “do it together” route. It never withholds a suit or required story progress. Scan assistance is a game-action fact, not reading mastery, an educational assessment, or a real child's learning record.
- The map ends the slice. Mission 1 and the separate Cadet/Pilot flight experiment stay queued after the First Contact family playtest. Site integration, Railway synchronization, Line Leader and Act II remain outside this increment.

## Asset and verification choices

The installed Blender can run a new isolated background scene even while its live MCP add-on is unavailable. The pod is original parametric geometry with a locally generated texture, preserved editable source, GLB export, KTX2 compression, retained lid hinge/clip, same-origin decoders, provenance and file hashes. See [the asset receipt](../reports/2026-10-29-pod-asset.md). It is provisional art, not a likeness or final-art approval.

GitHub Actions retains Python foundation checks and adds a Node 24 job for exact npm install, state tests, build, actual Chromium gameplay and built-artifact tests. Its checkout fetches Git LFS game models. Failure evidence excludes inbox captures. Neither job deploys the game.

The [playtest sheet](../PLAYTEST_FIRST_CONTACT.md) records the remaining ten-minute human gate. Automated speech stubs test delivery/error handling, not speakers or voice quality. SwiftShader render/load samples do not establish AMD GPU or frame-rate acceptance.

## Language choice

Keep **TypeScript + Babylon.js for the browser game**, **Python for repository checks and Blender automation**, and existing media/texture CLIs for assets. Python is not the game renderer or gameplay runtime, and the repository has no implemented Railway backend to convert.

This is an engineering recommendation under the owner's request, not a claim that Rust/C++ cannot run in a browser. Rewriting the small Python checks would not change game rendering quality or remove a measured bottleneck. Rust/C++ through WebAssembly can be evaluated for a specific CPU-heavy subsystem if profiling later demonstrates the need. If a future backend needs a language decision, make it against its actual workload then.

Primary references checked: [Babylon typed ES-module packages](https://doc.babylonjs.com/setup/frameworkPackages/es6Support/), [browser speech synthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis), [local versus remote speech voices](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService), and [Emscripten's C/C++ to WebAssembly toolchain](https://emscripten.org/docs/introducing_emscripten/about_emscripten.html). Keeping this stack is a project judgment based on the installed code and current workload, not a benchmark comparison.

## Revisit and recovery

Revisit budgets after a real Chrome playtest on the named laptop, or WebAssembly after a reproducible CPU profile. Preserve v1 and backup saves when revising schema v2. Keep source versions and export candidates separate. If repository publication is requested, reconcile the latest remote branch and use normal revert commits for recovery; no game deployment is part of this increment.
