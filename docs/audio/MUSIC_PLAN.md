# Space Dragon — music production and implementation plan

**Date:** October 29, 2026  
**Status:** planning delivered under the owner's request; composition and implementation NOT STARTED. Musical choices below are proposals, not approved story canon.  
**Request:** “Explain where we are with the musical portion…plan that out if we’re nowhere”  
**Code audited:** `7011a63` on `codex/first-contact-suits-and-story`; remote main remains `4bcfd8d`. The latest runtime is in draft PR #15, not main or a production deployment.

## 1. Where we actually are

| Area | Evidence | Status |
| --- | --- | --- |
| Music's story role | [Music/empathy design](../story/MUSIC_EMPATHY_AND_PACING.md), [recent story integration](../story/RECENT_STORY_INTEGRATION.md), current planet/SOS attachment | Developed concept; detailed lore proposed |
| SOS melody | Written solfege placeholder, `sol–mi–la–sol–fa–re–ti`; no rhythm, recording or MIDI in the repo | Not composed |
| Family instrumental identities | Brass, cello, plucked strings, marimba and celesta proposed in the design | Not produced |
| Adaptive score | Tables describe layers, transitions and scene moods | Not implemented |
| Music assets | No WAV, MIDI, FLAC, OGG, MP3, M4A, AIFF, Opus or Ableton session found under `src/`, `public/` or `assets/` | None in the audited repository |
| Runtime audio | `src/game/narration.ts` uses opt-in local-device speech for instructions | Implemented speech only; not a score or musical sound effects |
| Browser music transport, mixer, settings | No music playback code or cue manifest in runtime | Not implemented |
| Heard and reviewed soundtrack | No audio render or listening receipt supplied | Not tested |

There is useful narrative design to build from. We have not yet made the music audible. A green gameplay test does not establish audio quality.

## 2. The creative direction

**Build the dragon on Earth. Compose the answer across the stars. Make room for quiet on Viera.**

Use a memorable orchestral/electronic adventure score: warm piano and strings for home, a small distinctive signal for the mystery, percussion and synth motion for travel, and broad orchestration for major rescues. Curiosity and warmth should survive the action arrangements. The emotional peak should come from how the music changes, not simply from adding volume.

Maintain three related but separate musical jobs:

1. **Story music:** the SOS exists inside the world. People transmit, remember, answer and reshape it.
2. **Score:** music follows exploration, pursuit, discovery, restoration and rest. It can quote the SOS without repeating it continuously.
3. **Action sound:** immediate, readable feedback for a tether, goo slide, scan or parry. Selected actions have brief musical signatures; ordinary repeated actions should not flood the mix with melody.

The composer/implementation workflow should produce concrete drafts without requiring Paul to prepare stems or write technical specifications. Human creative review concerns the actual audio candidates. Until then, agents can use original synthesized sketches with clearly provisional instrumentation. No external generation service is needed for this plan.

## 3. The SOS across the three acts

| Stage | What the player hears and contributes | What we produce |
| --- | --- | --- |
| Act I: Earth | Recover enough of a broken call to understand the rescue. Each installation changes the presentation. | Fragmented motif, clear motif, suit signatures, assembly arrangement and departure cue |
| Last Beacon | Hear the source's small, vulnerable call. Understand why it needs help reaching other worlds. | Exposed melody and a quiet accompaniment |
| Market Moon | Reopening the market turns carts, gates and local percussion into the pulse. | Two compatible groove choices, both keeping the same musical grid |
| Hatchery | Reunited creatures answer one another; Mox's family call is recognizable in its own right. | Warm harmony and call/response alternatives; a distinct Mox call |
| Climbing Spires | Luke's connections let resonators answer and extend the melody. | Two guided answering phrases; neither is a correct-answer test |
| Forge Ring | The ensemble gains accents and enough reach to connect the worlds. | Broadcast arrangement and restrained/strong accent choices |
| Act III: road to Viera | Travel reuses the voices already earned, alternating propulsion, wonder and rest. | Flight arrangement, quiet travel variant and transition cues |
| Viera finale | Reuse the familiar material with softer entries, rests and turn-taking, then a resolving home gesture. | Gentle conversational arrangement, final resolution and celebration |

This follows the current four-world production route. Whisperwood's bass and Tideglass's countermelody remain **optional expansion candidates**, not two new required planets. Until adopted, the existing world arrangements supply their own bass and answering parts. No player gets an incomplete score because a candidate world was cut.

The final musical resolution belongs at the proposed Viera climax in Act III. The older Act II finale, free-order planet assumptions and final Earth landing are not this plan's production structure. Tavi/Caller, Mox, Nera, Rook and Hush naming/lore retain their existing proposed status.

## 4. Compose the motif before scaling the soundtrack

First create **three short original motif candidates**, each supplied as MIDI and WAV. Audition them with the same simple instrument, tempo and approximate duration so production quality does not decide the winner by accident.

Working brief:

- One recognizable 2–4-bar phrase, roughly 5–7 note events. Its rhythm matters as much as the pitches.
- A hopeful call with a clear unfinished ending, followed later by an answering/resolving gesture.
- Audition bright/major and more mysterious/modal treatments. Final key, mode, tempo and note count are not fixed.
- Demonstrate each candidate alone, with a lively groove, and in a gentle version with pauses.
- Choose for recognizability, emotional range and a satisfying answer. A child can enjoy or recognize it without humming or singing on command.
- Avoid fixing one note per component or per planet. Musical phrasing must survive changes to mission count.
- Withhold the **signature SOS cadence**, not the tonic everywhere in the game's music. Home scenes and ordinary scene endings can resolve naturally.

The old solfege string has seven note events but six distinct scale degrees, because `sol` repeats. Adding `do` gives all seven degrees, not a performed ascending do–re–mi scale. It is still a draft contour, not a finished composition or a required curriculum.

No canonical family singing or voice recording is required. A synthesized or appropriately sourced instrumental/choral resolution can stand in for the proposed home note.

## 5. Family musical identities

| Character | Proposed sound | First useful test |
| --- | --- | --- |
| Paul | Warm horn/brass and a low percussive accent | Lift: a grounded upward gesture |
| Maria | Cello and a soft sustained texture | Restore energy: a gentle opening interval |
| Luke | Agile string articulation, with a longer answering phrase when needed | Tether: a quick rise and secure landing |
| Luna | Marimba and elastic, bubbly percussion | Goo rail: a playful slide with a clear finish |
| Lyla | Celesta/music-box tone and a light shimmer | Scan: a short recognizable archive signature |
| Dragon | Low resonant horn-like voice with layered breath texture | Assembly/departure preview later |

These are sound identities, not six permanent tracks that must all play at once. Family signatures and world contributions are different dimensions: the signatures identify who acted; the planet parts shape the shared composition. Arrange by musical role to prevent an ever-growing pile of simultaneous sounds.

For future alley-oops, the setter gives a brief call and the finisher answers. For routine actions, vary articulation sparingly and limit overlapping voices. Mechanical effects still communicate contact immediately.

## 6. Deliverable order and completion gates

| Milestone | Concrete deliverable | Done when |
| --- | --- | --- |
| MUS-01: hear the idea | Three motif candidates in MIDI/WAV, plus a 60–90-second comparison showing broken call → family answer → lively rescue → quiet resolution | Files exist, are listened to, and one direction can be selected from actual audio |
| MUS-02: score First Contact | One bounded music service wired to existing computer/pod/suit/scan/map states, initial sound opt-in, mute/volume, local assets | The playable opening has coherent sound; skip/reload/pause work; muted play completes identically |
| MUS-03: prove composition | A clearly labeled music test scene with a Market-style rescue and two groove choices | The rescue changes the score, the choice persists, and both choices produce satisfying music; no claim a full Market Moon is built |
| MUS-04: extend through planets | One small cue pack per implemented world; onboard original/current comparison and guided variation | Each world has its own voice, earns its part once, and later travel reflects the saved arrangement |
| MUS-05: pay off Viera | Reorchestrated gentle ensemble, meaningful gaps, final home gesture and celebration | The player hears why the earlier triumphant arrangement needed to change; listening review confirms the emotional transition |

**Immediate recommended build: MUS-01 and MUS-02, with one provisional motif.** Do not wait for final orchestration to exercise the browser, and do not mass-produce planet tracks before the motif and first interaction work. Keep each candidate labeled so an engineering placeholder does not become approved music by accident.

Suggested first integration pack: a short home loop; broken and clear SOS versions; five brief suit signatures; a scan/map arrival cue; and an 8-bar shared bed that can add/remove a few layers. The 60–90-second comparison is a listening demonstration, not a forced opening cinematic.

## 7. Ableton-ready asset workflow

The workflow fits Paul's Ableton Live 11 setup. A live Ableton/MCP session has **not** been inspected in this task; this is an export contract, not a claim that a session exists.

- Preserve editable MIDI for all original melodic/harmonic parts and any available `.als` source. Deliver WAV previews/masters rather than MP3-only output.
- Working prototype grid: 96 BPM, 4/4, 8 bars (20 seconds), common key/chord map within a pack. These are reversible engineering defaults, not a score-wide creative limit.
- Print aligned role stems from the same start to the same end, including intentional silence. Use a consistent sample rate; propose 48 kHz and 24-bit PCM WAV for reviewed runtime candidates, with higher-precision mix sources retained where useful.
- Keep mix balance and headroom; do not independently normalize every stem or print the same master limiter/reverb into every role. Treat shared reverb/tails deliberately.
- Separate full-tail listening masters from loop exports. Verify exact loop frames and seam behavior in the browser; checking an export option is not evidence of a seamless loop.
- Keep alternative grooves/phrases aligned and compatible with the same harmony. Use shared bus effects or deliberate self-contained tails, not arbitrary hard cuts.
- Start with source drafts in `assets/source/local/audio/` and candidates in `assets/game/local/audio/`, following [asset boundaries](../ASSET_PIPELINE.md). Only selected runtime files go into `public/audio/`. Record author/source, rights, version, review state and checksum; existing `.wav`/`.flac` LFS rules apply when publishing approved sources.
- Browser delivery encoding is separate from source masters. Short PCM WAVs are acceptable for the first proof; evaluate compressed alternatives on the named target browsers before adopting them. Do not upload a whole DAW project as the game's download.

Ableton's official stem workflow supports aligned exports with common start/length and PCM output [A]. The loop, mix and naming rules here are our proposed game-production contract.

## 8. Small runtime design

Use a focused TypeScript music module built on browser Web Audio for the first synchronized cue pack. This is a proposed local implementation choice; no new package, backend, account or commercial middleware is required to prove the loop.

- **Game state owns progress:** recovered parts, world contributions, choices and arrangement version. No musical callback grants a component or advances a mission.
- **Cue definitions own content:** stable ID, pack/version, URL, role, sample rate, channels, BPM, meter, key/chord-map reference, exact frame count/loop points, gain, transition rule and compatible alternatives.
- **Music director selects an arrangement:** home, discovery, exploration, action, restoration or quiet. It observes existing semantic transitions, not renderer meshes or UI labels.
- **Transport/mixer owns playback:** one shared audio timeline, synchronized stems, gain ramps, source disposal, mute and pause. Use the audio clock for scheduled starts [B]; a timer may fill a short scheduling window but must not define musical time.
- **Presentation stays immediate:** lift, scan, web shot, dodge and parry apply immediately. Their short contact sounds can play at once; the score's new phrase/layer enters on its next appropriate boundary. Never quantize the player's physical action to music.
- **Start deliberately:** create/resume the context from a player gesture and handle rejection/interruption [C]. Offer “Start with sound” and a fully functional muted path. Do not pretend sound is playing while the browser has suspended it.
- **Pause/resume:** cancel scheduled obsolete transitions, stop/retain voices safely, record musical position if needed and rebuild a single ensemble on resume. On reload reconstruct the saved arrangement at a clean boundary; exact frame-perfect resumption across sessions is unnecessary.
- **Narration:** existing device speech cannot simply be routed through a Web Audio gain bus. Use speech lifecycle callbacks to duck music, restore gain on completion/error/cancel, and offer separate speech enable/volume controls where supported. Keep synthesized instructions distinct from music samples.
- **Failures:** missing stem, decode failure, late load or unsupported codec falls back to a simpler available arrangement or silence. Never replay a whole queue of old sounds after loading completes.

First prototype needs only melody, harmony, pulse and texture. Set a provisional maximum of six simultaneous music stems for later packs. Use gain changes for compatible synchronized layers; use authored transition cues when key/tempo changes. Avoid changing the playback rate of finished mixes to simulate every combat tempo change.

Decoded audio also consumes memory. For a budgeting example, six stereo 20-second buffers at 48 kHz and 32-bit float use `6 × 20 × 48,000 × 2 × 4 = 46,080,000` bytes (about 44 MiB), before effects/engine overhead. This is arithmetic, not a device measurement. Do not keep every planet pack decoded or overlap two full packs casually. Measure resident buffers, peak transition memory, download bytes and startup latency before setting acceptance budgets. Encoding savings do not imply equal decoded-memory savings.

## 9. What the player actually composes

For a representative market encounter:

1. A damaged transport gate offers a weak, uneven rhythmic idea.
2. The family rescues locals and gets the route moving; that succeeds immediately.
3. Two clearly demonstrated routes produce a bouncing hand-drum pattern or rolling metallic pattern. Visual patterns distinguish them as well as sound.
4. The choice joins the SOS at a musical boundary. The market keeps its own music after the family leaves.
5. Aboard the dragon, the player can compare the original call with the growing answer, feature the market voice, or change its compatible variation.

Progress never depends on hearing a pitch, reading music, singing into a microphone or performing on beat. Assisted defaults compose a coherent piece. No composition score, sibling ranking or “wrong note” penalty is needed. Optional rhythm bonuses from older drafts are deferred until the basic system is enjoyable.

Store stable contribution IDs and a small variant choice per contribution, not rendered audio in save data. Replay/revisit changes arrangement preferences without granting story rewards again. Restored worlds remain restored. Finale rests are intentional musical events, not missing or failed assets.

## 10. Verification before calling it musical gameplay

| Check | Required observation |
| --- | --- |
| Fresh page, sound opt-in/decline | Sound starts only after a valid gesture; muted story path works |
| Start, stop, pause, tab hide, notebook, resume | One ensemble; no duplicate voices, stale stingers or accumulating listeners |
| Loop and transition timing | Stems share a timeline; capture/offline tests verify scheduled offsets; human listening checks seams, clicks and musical continuity |
| Repeated action/skip/reload | Unique saved progress; no sound queue explosion; same earned arrangement |
| Groove/phrase alternatives | Both fit all allowed combinations and remain readable visually |
| Narration/critical effects | Music does not mask instructions or warnings; gain recovers after cancellation and errors |
| Missing file/decode/storage failure | Clear fallback; required story still completes |
| Master/music/effects/voice controls, mono | Settings behave consistently; essential information survives muted/mono play |
| Full mix | No clipping in allowed combinations; dynamics and transitions listened to on actual speakers/headphones |
| Device/browser | Named computer/browser and playback device; actual output latency, resident memory and load times measured |
| Viera listening demo | The quiet version feels different through arrangement and space, without a painfully loud preceding mix |

Automated event assertions alone do not prove that audio was heard, sounds good, loops seamlessly or moves the player. Keep authored audio, browser execution evidence and human listening approval as separate statuses.

## 11. First coding brief

> Implement MUS-02 against the actual current First Contact runtime, using one clearly provisional MUS-01 motif and short original local audio assets. Preserve v1/v2 save behavior, current semantic transitions and story authority. Add an isolated music director/transport, explicit sound start and mute, bounded synchronized layers, local narration ducking, and pause/visibility cleanup. Wire only the existing opening states. Deliver editable MIDI, WAV previews and the exact runtime pack with a manifest. Verify direct, skipped, assisted, interrupted, repeated and reloaded paths with sound enabled and disabled. Record actual playback/listening gaps. Do not build planets, final powers, a DAW, external generation or backend services for this slice.

## Technical references

These substantiate the implementation approach, not the untested creative/gameplay outcomes. Checked October 29, 2026.

- [A — Ableton: Importing and exporting stems](https://help.ableton.com/hc/en-us/articles/360000843404-Importing-and-exporting-stems).
- [B — Chrome/web.dev: A tale of two clocks](https://web.dev/articles/audio-scheduling), audio-clock scheduling.
- [C — MDN: Web Audio API best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices), loading, user-gesture startup and controls.
