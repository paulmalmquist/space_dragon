# Acceleration feel through camera and sound — SD-045

Date: October 30, 2026. Authority: **CONFIRMED owner direction**, retained verbatim in [the inbox](../../ideas/INBOX.md). Work/evidence: the active [cockpit and acceleration receipt](../reports/2026-10-30-dogfight-cockpit.md).

During [SD-044's cockpit polish](2026-10-30-dogfight-cockpit.md), the owner asked to replace stretching stars with stretching camera perspective and sound, then clarified that this refers to acceleration. Apply the change to acceleration feedback in the isolated Dogfight Lab; it does not replace the existing held right-button aiming zoom or change the third-person camera to first person.

## Local implementation choices

- Remove the inherited speed-star streak/trail presentation. Ordinary environment stars remain scenery, rather than a speed-stretch effect.
- Use a bounded, eased field-of-view response to speed/acceleration for the sensation of surging forward. Camera framing remains readable; this effect cannot change flight speed, position, collision or combat state.
- Feed actual acceleration into the local engine/airflow mix so acceleration has an audible rise and settling response. Preserve opt-in sound, controlled output, bounded voices and cleanup on mute/pause/return.
- Keep right-button aiming zoom distinct, with priority over acceleration widening. Reduced motion retains the stable normal/aim field-of-view values of 61/40 degrees and suppresses acceleration perspective changes. These values and response tuning are reversible implementation details.

The owner approves the direction, not a particular lens curve, sound mix, comfort threshold or final presentation. Flight remains active during word prompts under [SD-041](2026-10-30-live-spelling-flight.md); [SD-043](2026-10-30-dogfight-evasion.md) resource/targeting behavior and [SD-044](2026-10-30-dogfight-cockpit.md) radar/cockpit scope remain. No save, story, backend, deployment or new media service is introduced.

## Superseded presentation and verification

This supersedes the lab's inherited speed-star stretching and abrupt boost-driven lens treatment for acceleration feedback. It does not remove ordinary environmental stars or repurpose aiming zoom. The combined receipt identifies the earlier cockpit build/native/audio baseline separately from the passing final checks against the changed artifact.

Verify ordinary acceleration and boost, easing/settling, aiming-zoom priority, reduced motion, pause/resume/reset and retained radar/word-lock/control/save behavior. Check actual browser camera response and Web Audio acceleration output without treating those results as a human comfort or audibility pass. The combined receipt owns executed results and final artifact identity; normal pause, sound-off, retry and return remain available.
