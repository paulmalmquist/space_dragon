# Charged Space-bar windup, roar and fire beam — SD-054

October 30, 2026 · **CONFIRMED owner direction**, retained verbatim in [the inbox](../../ideas/INBOX.md): “when we use the spacebar attack, make it windup and make a loud roar and beam a fire beam”, clarified as “space bar that is”. [The current receipt](../reports/2026-10-30-asteroids-crash-breath.md) owns implementation/verification.

Refine the existing word-charged, target-locked Space attack with a visible windup, a strong original locally synthesized roar and a directed fire beam. Preserve charge/lock requirements, fresh-press and once-per-attack guards, ordinary left-button fire, finite evasion and existing encounter/save boundaries. Exact windup/beam timing, layered sound and visual treatment are implementation choices, not new story powers or a release approval.

The current local timeline uses 0.65 seconds of windup followed by a 1.1-second beam, with exactly one impact at the end of the 1.75-second attack. Crash interruption cancels the active attack without a charge refund or target reward. These are explicit integration choices to make interruption deterministic, not newly approved campaign progression. Roar/beam sound can be canceled separately while ordinary flight audio continues where gameplay remains active.

Flight, enemy movement/fire, dodging and normal damage remain active throughout windup and beam under [SD-041](2026-10-30-live-spelling-flight.md). Normal pause freezes the attack clock; repeated Space must not duplicate a charge, beam or impact. Resolve interruption/crash/reset through authoritative state rather than FX callbacks; no hidden post-retry impact/reward may survive. Retain the actual mechanical muzzle/socket alignment and one-target capacity until separately upgraded.

Sound remains opt-in with bounded voices/controlled output; “loud roar” authorizes a stronger effect, not family-voice imitation or external media generation. Inspect actual windup, roar scheduling, beam/impact, held-input continuity, pause/interruption/retry and reduced-motion behavior. Digital waveform/browser checks do not establish speaker audibility or human comfort/quality approval.
