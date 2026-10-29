# Browser asset candidates

Use `assets/game/local/<kind>/<id>/` for local GLB exports awaiting review. A future reviewed asset can live at `assets/game/<kind>/<id>/`, with a short receipt recording its editable source, version, inspection/validation result, browser review, and approval status.

Export into a new filename. Keep the unoptimized GLB, create an optimized candidate, and compare them in the game. Do not overwrite the editable source or original export.

This folder is not automatically served or copied into the browser build. Add only explicitly selected, approved files to the runtime's asset destination after checking its actual configuration. Do not copy `assets/reference/` or `assets/source/` into a public build.

Inspect a candidate from the repository root:

```powershell
node tools/asset-inspect.mjs assets/game/local/props/pod/pod-v001.glb
npx --no-install gltf-transform inspect assets/game/local/props/pod/pod-v001.glb
npx --no-install gltf-transform validate assets/game/local/props/pod/pod-v001.glb
```

The first helper inventories a GLB's container and declared structure. The glTF Transform validator checks specification conformance. Neither replaces visual, animation, or performance review in the browser.
