# Near-orbit satellite artwork v001

This candidate replaces the Dogfight Lab's repeated procedural green folds with real coastlines, mountains, vegetation and weather-front structure. Earth imagery is a visual reference for this local backdrop, not a new campaign destination or navigable Earth map.

The raw NASA files live in ignored `assets/source/local/environments/near-orbit-nasa-v001/`. Four selected runtime derivatives live in `unity/SpaceDragon/Assets/SpaceDragon/Dogfight/Imported/PlanetSatellite-v001/`. Keep [NOTICE.txt](NOTICE.txt) with published derivatives; [provenance.json](provenance.json) records exact URLs, hashes, transformations and sizes.

Prepare from pinned sources with Python, Pillow and NumPy:

```powershell
python tools/prepare_near_orbit_satellite.py --download
python tools/prepare_near_orbit_satellite.py --verify
```

`--download` fetches missing public NASA inputs only and validates SHA-256 before decoding. It does not upload anything. Omit it when raw sources are already present. Unity builds use the checked-in derivatives and never access the network. `--verify` needs no raw sources or network.

The global color map is 2048×1024. The 4096×2048 region covers 24°W–48°E and 18°N–54°N, centered above the Mediterranean; it feathers into the identical lower-resolution global image. The region is cropped from the 21600×10800 source, so added detail is real source information rather than enlargement. The 2048×1024 relief map comes from NASA's separate GEBCO display map. A 4096×2048 cloud map contains density and slopes from the 8192×4096 Blue Marble composite. Shader-only fine cloud erosion remains a small existing periodic detail texture.

All prepared maps flip vertically once for the mesh's north-at-UV-v=0 convention. The regional UV minimum/size is `(156/360, 36/180, 72/360, 36/180)`. Planet rotation puts 36°N/12°E overhead and geographic north at world +Z. Terrain slopes use local spherical distances and 180 m artistic relief on the existing 26 km visual globe. There is no displaced terrain, collision or change to the player's flight.

The import config uses mipmaps, 8× anisotropy, BC7 desktop/Web textures, sRGB color and linear packed maps. Four texture payloads total **26.67 MiB with full BC7 mips**, plus the existing 0.33 MiB fine cloud texture. This is a calculated payload, not measured GPU memory. A device without BC7 may use Unity's fallback and needs separate testing. Surface, cloud and atmosphere remain three draws and the same meshes. The surface replaces its former tiled-terrain sample with one additional regional-color sample; the cloud shader uses slopes already packed into its existing atlas sample.

The first actual WebGPU review showed correct coast mapping but too little cloud coverage and too little depth across the near horizon. A bounded follow-up rotates the cloud atlas 19.8° west, moving its existing Atlantic weather front into the composition; the surface-shadow query uses the same rotation. Surface and cloud shaders now apply distance-based aerial perspective, and ocean shading includes a restrained view-dependent blue reflection. Source derivatives remain unchanged. Sample counts remain five surface / two cloud samples; no additional texture or draw is introduced. This is composed historic reference weather, not an accurate simultaneous Earth observation. The revised player appearance still needs separate verification.

Verified locally: original source hashes, derivative hashes/dimensions/channels, deterministic preparation, source-region and cloud visual inspection. Unity import, shader compilation, player appearance, frame timing and actual compressed formats are **NOT TESTED by the asset preparation step**; the integration pass records those separately.

Known limits: static historic weather; color-classified water mask may be imperfect around dark/coastal pixels; GEBCO display JPEG is an 8-bit visual source; clouds use shaded shells rather than volumes; the detailed crop is for a camera-following backdrop, not planetary traversal. Prior procedural derivatives remain available for rollback.
