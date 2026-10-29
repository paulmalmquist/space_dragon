# Decision — Keyboard-first input

**Recorded:** October 29, 2026  
**Status:** CONFIRMED owner direction.  
**Decision source:** the owner, in conversation: "Gotta work on keyboard for now unless I plug in an Xbox controller and that works out of the gate."

## Decision

- **Keyboard is the primary, required input** for on-foot play and dragon flight. Every interaction must be completable on keyboard.
- **An Xbox controller is opportunistic.** It is supported when it works with no setup, through the browser's standard gamepad layout. If it doesn't work out of the gate, the keyboard remains the supported path, and no configuration work or drivers are pursued for now.
- **Touch is deferred.** It is not a first-milestone target.

## Consequences

- The [combat system](../gameplay/COMBAT_SYSTEM.md) maps on-foot controls to keyboard. A default layout (WASD + J/K/L) and **Kid Keys** (arrows + Space + Enter) work at the same time. Flight maps all three assist tiers to keyboard, using input ramping. Xbox mappings and the "works out of the gate" rules are listed alongside.
- [The current milestone](../plans/CURRENT_MILESTONE.md) records keyboard as the first supported input for SD-M1. The specific computer and browser are still to be named.
- Ace-tier flight is expected to feel best on a controller. On keyboard it relies on ramping and a precision modifier.

## Superseded guidance

v0.1's "keyboard/mouse and landscape touch are proposed first-release targets" and its acceptance check A04's touch coverage are deferred. Keyboard (plus the optional Xbox controller) replaces them for now.

## Verification status

Controller plug-and-play behavior is **NOT TESTED**. Verify it on the actual computer, browser and Xbox controller, and record the result on a verification receipt, before claiming support.
