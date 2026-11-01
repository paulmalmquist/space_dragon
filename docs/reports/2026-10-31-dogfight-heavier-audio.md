# Heavier Dogfight audio — SD-081

## Scope and status

**V002 cue/mix changes IMPLEMENTED and technically VERIFIED for file/binding/build/event-path checks on both browser backends. Human audition/mix approval remains NOT REVIEWED.** Owner: “sounds are dinkey too. please use better ones”. [Decision](../decisions/2026-10-31-dogfight-heavier-audio.md).

The current player deliberately retains mechanical v005 while the new purple organic v006 remains a source-only study. This audio work does not reapply Blender Undo or imply the organic model is in Unity. No family voices, supplied-video audio, new paid libraries or external generation are used.

## Actual cues and source preservation

Five fresh, additive stereo **48 kHz / PCM16** WAV derivatives total **2,045,020 bytes** under `assets/game/local/audio/dogfight-v002/`. Original Sonniss banks and earlier v001 cues remain. The source metadata `assets/source/audio/sonniss-gdc-2026/dogfight-cues-v002.json` records exact source paths/hashes, filters, onset selection, derivatives/hashes, measurements and the preserved bundled license evidence. Provider/license facts come from that previously supplied local library, not the owner-video filename.

| Cue | Duration | Bytes | True peak | Processing/role |
| --- | ---: | ---: | ---: | --- |
| dragon-roar | 2.25 s | 432,044 | -5.51 dBTP | 2.25s pitched dinosaur body plus low werewolf chest layer; fast onset,240ms release; no spoken voice |
| fire-breath | 1.10 s | 211,244 | -5.51 dBTP | 1.1s deep combustion body plus crackle; aligns with existing1.1s beam;100ms release |
| machine-blast | 2.40 s | 460,844 | -5.51 dBTP | 2.4s colossal impact plus debris tail; replaces the small cartoon explosion source |
| metal-impact | 0.90 s | 172,844 | -5.51 dBTP | 0.9s resonant recorded metal with broad impact body; no new collision timing |
| jet-surge | 4.00 s | 768,044 | -5.51 dBTP | 4.0s stable propulsion layer with200ms wrap crossfade; no repeated blast-off onset |

`tools/prepare-dogfight-audio-v002.py` selects sustained onsets, layers/pitches/equalizes the existing licensed recordings and retains headroom. Source families include dinosaur/werewolf body, deep fire/crackle, large impact/debris, resonant metal and a stable propulsion bed. All five derivatives report **zero clipped samples** and about **-5.51 dBTP** true peak. Those measurements do not establish perceived weight, loudness, speaker response or masking.

`tools/unity/prepare-dogfight-audio-v002.mjs` validates formats/hashes/peaks and writes a separate `audio-receipt-v002.json` without overwriting model/older audio receipts. The builder binds all five v002 clips. `DogfightAudio` adds dedicated protected roar and beam voices, richer ordinary weapon/launch layers, a steady boost loop, warning-driven effect ducking and bounded gain/headroom management. Sound opt-in/mute, pause and authoritative combat timing remain separate from presentation.

## Offline checks versus actual player

[Local audition/stress gallery](../../artifacts/audio/dogfight-v002/index.html) and `offline-mix-measurements.json` retain deterministic offline approximations of the cue/mix code. They are **not captured Unity playback and were not human-auditioned**. Python interpolation, timing and pitch differ slightly from the actual player; the report makes these limits explicit.

Offline weapon samples show true peaks approximately -3.89 dBTP (plasma) and -3.50 dBTP (launch). Six-second combat and combat-with-warning stress mixes report -8.82 / -7.84 dBTP, zero clipped samples, at most nine active modeled voices and a conservative coherent peak bound of 0.90 full scale. These are named sample results, not a blanket no-clipping guarantee on every device/mix.

Both final actual-player verifiers assert that **all five v002 cues are bound** through the actual player snapshot; `CueStatus` reports the protected roar/beam/ducking configuration. It explicitly enables sound in the live-spelling/breath case and exercises real Space windup/beam events while flight continues. This is runtime binding/event-path evidence. No browser waveform was recorded and no person judged audibility, intensity, perceived priority, comfort or final mix quality.

## Checks

| Check | Result | Evidence / limits |
| --- | --- | --- |
| Local source/cue preparation and metadata | IMPLEMENTED / measured | `artifacts/dogfight-audio-v002-preparation.json`, source cue metadata and `artifacts/audio/dogfight-v002/measurements.json`; five identified derivatives, originals retained. |
| Offline synthesis/mix stress | MEASURED | `tools/review-dogfight-audio-v002.py`, `offline-mix-measurements.json`; approximation limits above. |
| Camera/V002-audio Web build | PASS | `artifacts/unity/dogfight-web-20261031-210111-045-34672.log`; created `2026-10-31T21:04:06.8096998Z`, **130,569,568 bytes / 119.72 s**, settings restored. Receipt SHA-256 `7386f98c26d42f7e704066eda72738379e2ab271b13bbbef5990c052c7462361`. GLB remains `94f17d2c3f0026364aeffd7d5ceb0876f9f8e9c65ed66067c82f27260116fa60`. |
| `node tools/unity/verify-dogfight.mjs artifacts/unity/dogfight-presence-audio-playtest` | PASS | **11/11**, `2026-10-31T21-08-22-430Z`; zero console/page/failed/external requests, isolated localStorage sentinel unchanged. Actual v002 binding and enabled-sound breath path; no human audition. |
| Forced-WebGL2 final suite | PASS | **11/11**, `artifacts/unity/dogfight-presence-audio-playtest-webgl2/runs/2026-10-31T21-10-41-104Z/report.json`; sixteen screenshots, no console/page/failed/external requests, scoped localStorage unchanged. Same v002 binding and sound-enabled breath path; no human audition. |
| Final EditMode run after audio bindings | PASS | `artifacts/unity/dogfight-editmode-20261031-211314-795-21960.xml`: **69/69**, zero failures/skips. This is separate from perceived mix quality. |
| Human sound/mix/intensity/comfort review | NOT REVIEWED | Owner requested improvement, but has not approved these cues. |

Both camera and audio share this player artifact. [Screen-presence receipt](2026-10-31-dragon-screen-presence.md) records framing/performance evidence separately. Final build/source HEAD is `feat/town-drive-lab@b89a0fc887ee60a57eac9f5aaad8e2ef588ca3d2` with local uncommitted Dogfight changes; no deploy, commit or push is claimed.

## Limits and recovery

Select the retained v001 cues/earlier audio configuration to compare or roll back without replacing model data. No purchase, voice cloning, external upload, supplied-video audio reuse or deployment is included. The next useful review is human audition on the actual Lenovo speakers/headphones, separately from automated technical verification. Organic source/animation/game promotion remains SD-080 work, not evidence supplied by this audio pass.
