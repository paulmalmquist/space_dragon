# Word-charged lock-on breath and mouse modes

**Date:** October 30, 2026 · **Tracking:** SD-040 · **Status:** authorized local increment; verification belongs to [the receipt](../reports/2026-10-30-word-lock-breath.md).

**Superseding owner correction — SD-041:** [live spelling flight](2026-10-30-live-spelling-flight.md) replaces the automatic action hold below. The dragon, controls, enemies, projectiles and damage now remain active during prompts; spelling requires dodging. The prior hold and SD-040 receipt describe the earlier artifact. All other word/lock/impact boundaries remain unless explicitly changed.

## Owner direction and scope

The owner requests one blinking letter at a time in the bottom-right corner, pressed on the keyboard in order to form a four-letter word. Completing it charges the dragon's lock-on fire breath. Start with one locked ship, leave room for later multi-target upgrades, and fire the animated attack with Space. The owner also requests a toggle between mouse steering and mouse aiming. [The inbox](../../ideas/INBOX.md) preserves the exact wording.

These are **CONFIRMED feature directions**. The following bindings, word list, lock timings and visual treatment are reversible implementation choices for the local Dogfight Lab. This does not implement an earned upgrade system, campaign departure or the separate SD-038 takeoff cinematic.

## Interaction

1. Show one large pulsing letter and four progress slots. The initial word pool is **LION, PINK, COIN, KING, SONG**. Every word has four letters and avoids W/A/D/Z, Q/E, X, R/F and the new M binding. Keyboard auto-repeat cannot fill multiple slots. Wrong keys retain progress and cost no health; there is no spelling deadline.
2. Hold action while spelling so a player does not have to read and dodge together. The normal pause remains a separate control. **F1 / Help together** can finish the charge with an assisted flag; it does not claim independent learning or mastery.
3. Once charged, place the reticle over a visible ship within **650 m**. Keep it within a **0.12 NDC** reticle radius for about **0.65 seconds**; the filling ring becomes a **LOCKED** bracket. At capacity one, dwelling on another ship replaces the selection. These numbers are tuning choices, not measured accessibility thresholds.
4. A confirmed lock survives looking away while the ship remains visible and in range. Losing visibility/range has about **1.2 seconds** of grace during which the confirmed lock is retained; a disabled target is removed immediately. Pressing Space without a retained confirmed lock never consumes a charge.
5. Press **Space once** to consume the charge and launch a roughly **0.85-second** breath arc at the selected ship. Authoritative state schedules one impact; the animation presents it. Repeated or held Space cannot duplicate an impact. Disable rather than graphically injure the opponent, then begin the next word.

**M / the visible mouse-mode button** selects **Mouse flies** or **Mouse aims**. Flight mode retains the center deadzone; aim mode moves the reticle without turning the dragon. Arrows steer in either mode when action is active. W/A/D/Z continues to move the aim independently. Left mouse button keeps ordinary plasma; right mouse button keeps held zoom. Space is now reserved for the charged attack, superseding its ordinary-plasma mapping in SD-037. Mode switches clear held controls so a prior click cannot become an unintended shot or zoom.

## State, learning and recovery

The pure breath module owns the word index, assistance flag, lock IDs, acquisition/grace timers, charge consumption and exactly-once impact events. It stores IDs, not renderer objects, and can accept a higher capacity in tests without claiming that upgrades are implemented. Rendering and the breath effect must not be the database.

This is **letter matching** (`letter_matching`), with a four-letter word as the completed presentation. It is not evidence of independent letter-name recognition, word decoding or improved reading. No learner identity, assessment or child learning records are created. The lab still has encounter-only state, no campaign reward and no changes to First Contact v2 or exploration v1 saves.

The authored challenge is **`lab-word-breath`, version 1**. Its prerequisite assumption is that a player can match a displayed uppercase character to a keyboard key, independently or with help. The stimulus/prompt is the single large letter and “Press this letter”; the four slots show current progress. Correct presses fill one slot, wrong presses retain it, and key-repeat is ignored. The assistance route is F1/Help together. Replay begins with the next word after a breath; leaving or retrying cancels the transient attempt. The reward is one encounter-only breath charge. There is **no saved observation format** in this lab; the current charge's assistance flag is transient and cannot establish mastery. No spoken-letter effectiveness is claimed.

Pause, focus loss and page navigation release input and freeze the relevant simulation. Retry/reload clears the current charge, locks and breath; existing Earth saves remain intact. Reduced motion keeps the letter readable without blinking and limits presentation motion. Human letter legibility, lock usability, audio and emotional tone need adult/device review.

Rollback removes this local mechanic and restores the earlier Space mapping together with its tests/instructions. The untouched Seele export remains available. No new dependency, paid service, backend, upload or production deployment is required.
