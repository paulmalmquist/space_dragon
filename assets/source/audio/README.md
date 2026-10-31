# Sound banks and editable audio

Keep full third-party banks in `assets/source/local/audio/<collection>/` (ignored by Git), with original filenames, folders, readmes and licenses intact. This is the project's sound-bank location. Keep reviewable catalogs, source hashes, cue mappings and processing recipes here in `assets/source/audio/<collection>/`.

Only selected, edited game cues go to `public/assets/audio/<collection>/`, declared in the runtime asset manifest. Never copy an entire bank into the browser build. Preserve original masters; version edited cues separately.

## Filed collections

- [Sonniss GDC 2026](sonniss-gdc-2026/README.md): five banks, 344 WAV files, 3.47 hours; five edited recordings used in Dogfight Lab.

