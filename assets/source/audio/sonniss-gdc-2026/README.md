# Sonniss GDC 2026 sound library — SD-056

Filed October 30, 2026 at `assets/source/local/audio/sonniss-gdc-2026/`. All five original `Sonniss.com-GDC2026-GameAudioBundleNof5` folders retain their names and contents. Originals are local and ignored; this tracked directory holds metadata only.

## Inventory

| Bank | WAV files | All files | Bytes |
| --- | ---: | ---: | ---: |
| 1 of 5 | 82 | 85 | 1,778,921,924 |
| 2 of 5 | 129 | 132 | 1,549,744,248 |
| 3 of 5 | 65 | 68 | 1,681,239,752 |
| 4 of 5 | 22 | 25 | 1,874,675,296 |
| 5 of 5 | 46 | 49 | 939,499,814 |
| Total | 344 | 359 | 7,824,081,034 |

WAV duration totals 3.47136 hours. The included readme and workbook list 347 WAVs; the supplied folders contain 344. [Filelist comparison](filelist-difference.json) identifies three absent originals: two Spanish crowd/walla recordings and one British detective voice line. All 344 supplied WAV names match the workbook. Every supplied file was preserved and verified by before/after SHA-256. No replacement download was performed; these three unused files do not block the selected game cues.

[CSV catalog](catalog.csv) supports filename/library/usage searches. [Full JSON catalog](catalog.json) records hashes for all 359 files, plus WAV duration, channels, bit depth and sample rate. Usage tags are filename-based suggestions, not listening judgments. Rebuild with `python tools/catalog-sound-banks.py`.

## Used now in Dogfight Lab

| Game event | Original publisher/library | Edited cue |
| --- | --- | --- |
| Charged windup roar | 344 Audio / Dinosaurs Vol. 2 | dragon-roar-v001.wav |
| Fire beam | Epic Stock Media / Elemental Mutation Whooshes and Impacts | fire-breath-v001.wav |
| Disabled enemy / mechanical crash | Epic Stock Media / Anime Game | machine-blast-v001.wav |
| Damage / collision impact | The Noisery / Moaning Metal | metal-impact-v001.wav |
| Boost / acceleration onset | 344 Audio / Air Designed | jet-surge-v001.wav |

[Cue provenance and exact processing](game-cues.json) records original paths/hashes, FFmpeg version, filters and runtime hashes. Rebuild with `python tools/prepare-sonniss-sounds.py`. The five mono 24 kHz 16-bit WAVs total 232,230 bytes. They layer into existing synthesis through the same bounded voice graph and compressor. Failed/unfinished loads use synthesis; loading never queues old events. All sound remains opt-in; mute, normal pause, retry, breath cancellation and disposal stop the corresponding voices. No audio callback awards progress.

## Candidate uses to revisit

- Town Drive: SoundBits Cars / Pass-By, InMotionAudio Car Interior Driving Ambience, 344 Audio Car Foley. Audition short vehicle layers when adding engine/pass-by audio; no new drive sound system in this increment.
- Home and neighborhood: clocks, books, telephone, garden storm, crowds and restaurant ambience. Choose scene-specific material when those interactions exist.
- Suits, pod and component assembly: interface feedback, mechanism locks, robot motor, magic and glitch libraries. Match future interaction timing before export.
- Other-world atmosphere: wind, coast, sci-fi drones and designed ice. Avoid prematurely assigning these to unconfirmed planets.

## Rights and review

Each bank retains its included `License - GDC Game Audio.pdf`, `Readme.txt` and filelist workbook. The [Sonniss license](https://sonniss.com/gdc-bundle-license/) was checked October 30, 2026: game use/modification is permitted; standalone redistribution and AI training are prohibited. The online license says the download-date version governs; the download date was not supplied. Keep both the bundled evidence and current source link. Sources were processed locally using FFmpeg; none were sent to an external generator.

Technical verification belongs to the [receipt](../../../../docs/reports/2026-10-30-sonniss-sound-banks.md). Human listening, tonal fit, speaker/headphone comfort and final mix are NOT REVIEWED. This is local game integration, not release approval or deployment.
