# Space Dragon — Cinematic Sound Bank

**Production plan — October 30, 2026**

## Current deliverable

- 16 newly synthesized, original, mono WAV cues in `assets/game/audio/starter/`, with manifest, source generator and local audition page.
- These are **sound-design candidates**, not professional recordings and not production-approved.
- The connected Drive folder `Space Dragon / Cinematic SFX Bank` was empty when checked. Nothing was downloaded from Sonniss, BOOM or Soundly. No third-party audio moved from Drive.
- The Babylon.js game does not yet play these sounds or include them in its build.

## Professional sound sources to audition and acquire

1. **Sonniss GDC 2026:** https://gdc.sonniss.com/ — free large collection, useful starting point. Current license https://sonniss.com/gdc-bundle-license/ allows synchronization in games, **not** public standalone sound-bank redistribution (including modified/re-designed files); also prohibits AI/ML training.
2. **BOOM Library Mechs & Robots:** https://www.boomlibrary.com/sound-effects/mechs-robots/ — armor assembly, articulated mechanisms, dragon mechanics.
3. **BOOM Library Sci-Fi:** https://www.boomlibrary.com/sound-effects/sci-fi/ — engines, portals, energy weapons, scanners.
4. **BOOM Library Magic:** https://www.boomlibrary.com/sound-effects/magic/ — healing, transformation and liquid-like abilities.
5. **BOOM Library Creatures:** https://www.boomlibrary.com/sound-effects/creatures/ — organic dragon roars and opponents.
6. **Soundly:** https://getsoundly.com/ — SFX search, audition and source workflow.

BOOM's current EULA (https://www.boomlibrary.com/terms-conditions/) also forbids standalone sharing or redistribution of raw/processed source effects. A game license is not permission to republish a source sample pack in this public GitHub repository.

## Intended sonic identities

| World/gameplay element | Sound palette | Preview event IDs |
| --- | --- | --- |
| SOS + pod | broken melody, analog/digital static, atmospheric friction, sub impact | `sos.broken`, `pod.entry`, `pod.impact` |
| Core | intelligent mechanical hum, sparkling projection | `core.activate`, `core.hologram` |
| Common suit | micro-servo layers, articulated clicks, sealing material | `suit.assemble` |
| Paul | grounded brassy power | `paul.pulse` |
| Maria | warm cello-like healing aura | `maria.heal` |
| Luke | elastic web snap with agile pitch bend | `luke.web` |
| Luna | watery goop with playful bubbles | `luna.goo` |
| Lyla | delicate celesta-like data scanner | `lyla.scan` |
| Dragon | immense horn/growl, turbine ignition, continuous flight bed | `dragon.awaken`, `dragon.thruster`, `dragon.cruise` |
| Combat | sharp, distinctive perfect parry feedback | `combat.parry` |
| Portal | rising energy and dimensional opening | `portal.open` |

Some character-instrument details follow existing **proposed** music treatments; no new lore is approved by adding an audio palette.

## Import and licensing gates

1. Download/acquire professional packs only under a valid license. Keep the original archives under ignored `assets/source/local/audio/` (not Git); save receipts: license URL/version, vendor/creator, source filename, SHA-256, date and permitted uses.
2. Layer original custom sounds in editable sessions. Export candidates under ignored `assets/game/local/audio/`. Maintain a per-event chain from source file to layers, processing, render and approval.
3. After a deliberate listening/scene review, copy only allowed, game-integrated delivery assets into an explicit Vite/public asset manifest; do **not** publish a sample library or unapproved family voices.
4. Preserve stable semantic sound events and volume/spatial parameters. Add priority, cooldown, voice limits, streaming vs preloading and unload/disposal policy.
5. For browser runtime, resume `AudioContext` after user input, handle autoplay/pause/blur/controller, accessible captions, separate music/SFX/voice volume and child-safe listening levels.
6. Test with headphones, normal desktop speakers, real browser and playback hardware. Check loop seam of `dragon.cruise`; no QA claim is made by deterministic file generation alone.
7. Optimize approved event audio into tested compressed formats (for example Ogg/Opus with appropriate fallback) and record download/memory cost. Never send a multi-gigabyte library to game players.

## Current state

**Generated / binary-structure checked:** 16 original WAV files. **Not done:** third-party library transfer, DAW production/mastering, perceptual audition, game wiring, controller haptics, deployment or actual device verification.
