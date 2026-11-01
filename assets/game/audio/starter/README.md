# Space Dragon — Original SFX Preview Bank

**16 playable WAVs** in this directory: first-contact SOS and crash, Builder Core, suit activation, five character voices, dragon startup/flight, parry and portal.

These were created with deterministic synthesis rather than recorded sound libraries. **They are playable prototypes, not polished/approved AAA sound effects.** No licensed third-party or family recordings were imported.

All files: 32 kHz, mono, 16-bit PCM WAV, ~2.5 MB total. The manifest maps filenames to stable game audio event names.

## Listen

Open `tools/audio-preview.html` from a local checkout to play each sound. Auditory QA, levels, loop seam, headphones, real-device and browser tests have not yet been completed.

## Reproduce

From repository root, run:

    node tools/generate_sfx.mjs --verify

Default is `--verify`. It computes the 16 files and checks they are byte-identical, without overwriting them. `--write` generates only if the target does not already exist; it refuses overwrite.

## Shipping rules

This asset directory is not served automatically by Vite. When selected by a reviewer, work toward optimized game-delivery assets with provenance, gain, spatialization, concurrency and event mix settings. Keep professional source library downloads private; do not add purchased or Sonniss pack files to this public repository.

See `docs/audio/SOUND_BANK.md` for acquisition/licensing and pipeline gates.
