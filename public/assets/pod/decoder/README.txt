Space Dragon self-hosted KTX2 decoder payload

Source: official @babylonjs/ktx2decoder 9.33.0 npm tarball
https://registry.npmjs.org/@babylonjs/ktx2decoder/-/ktx2decoder-9.33.0.tgz
Verified npm integrity:
sha512-F10Qbv9nzXGZKHIw5MLOslPJw/Rm/3qxX5QbMMbVu3i1m4hIkREefTuqGL4Gbcpo1mjwyKoJXmhjSi0S04lbEA==

babylon.ktx2Decoder.js is an IIFE bundle of that package's index.js,
built with the existing Vite 8.3.5 library build, global name KTX2DECODER.
MSC JS and all WASM files are unmodified copies from the package's wasm/ folder.
The pod uses ETC1S, which currently loads the MSC pair. The other transcoders
are retained so every configured decoder URL stays on this origin.

See NOTICE.md, LICENSE-Babylon.md, LICENSE-Transcoders.md, and LICENSE-Zstandard.txt.
The Zstandard license text was fetched from the upstream v1.5.7 LICENSE file:
https://github.com/facebook/zstd/blob/v1.5.7/LICENSE

Keep decoder configuration in src/game/pod-asset.ts aligned with these filenames.
No model, image, voice, or family reference is part of this decoder payload.
