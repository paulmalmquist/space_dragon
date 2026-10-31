# Cockpit instruments, relative radar and layered sound — SD-044

Date: October 30, 2026. Authority: **CONFIRMED owner direction**, retained in [the inbox](../../ideas/INBOX.md). Work/evidence: [verification receipt](../reports/2026-10-30-dogfight-cockpit.md).

The owner requests a small minimap showing bogeys relative to the dragon, a more cockpit-like window with less web-application styling, and more intense sound effects. This refines the isolated Dogfight Lab's presentation. The existing third-person chase view and gameplay remain.

**Latest owner clarification — SD-045:** [acceleration through camera and sound](2026-10-30-acceleration-camera-sound.md) removes the inherited speed-star stretching and uses bounded camera perspective plus acceleration-responsive sound. Held right-button aiming zoom remains. The active receipt separates the earlier cockpit baseline from final verification after that change.

## Local implementation choices

- Head-up radar shows living bogeys relative to the dragon's orientation: ahead at the top, behind at the bottom, lateral bearing, altitude cues and marked range limits. Breath-locked contacts and enemies targeting/firing at the dragon use distinct shapes/states. Radar observes encounter state; it cannot steer, award rewards, reveal private map data or alter combat.
- Subtle canopy-edge trim, compact instrument typography and smoked panels replace the large webpage-like header/cards. Keep the dragon, targeting reticle, warnings and one-letter prompt readable. Settings, help, pause/retry and keyboard focus remain accessible. This is an instrument-overlay treatment, not a newly modeled cockpit or a first-person camera switch.
- Layered locally synthesized flight, boost, plasma, impact, breath, explosion and maneuver effects replace the simpler tones. Preserve opt-in sound; use a controlled master mix, bounded voices and cleanup on mute/pause/return/dispose. More intensity comes from texture and dynamics rather than uncontrolled loudness. No family voices, external uploads, paid service or new media license is introduced.

Radar range, layout, colors, sound profiles and mix settings are reversible engineering/art choices. They do not grant final art/audio approval. [SD-041](2026-10-30-live-spelling-flight.md) live spelling/dodging and [SD-043](2026-10-30-dogfight-evasion.md) resource/targeting behavior remain authoritative. No campaign/save, multiplayer, backend or publication scope changes.

## Evidence and recovery

Verify relative coordinates through turns, range/altitude/dead-contact handling, actual radar movement/removal during flight and targeted strikes, retained controls, pause/mute/retry cleanup, audio graph/output bounds and built local asset paths. Inspect the cockpit layout at the named desktop sizes. Automated waveform and browser checks do not establish human audio quality, speaker audibility, comfort or sustained device performance. Normal pause/retry/return remain available.
