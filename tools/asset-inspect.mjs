#!/usr/bin/env node
/** Read-only GLB inventory. Run the official glTF validator separately. */
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const args = process.argv.slice(2);
if (args.length !== 1 || args[0] === '--help' || args[0] === '-h') {
  console.log('Usage: node tools/asset-inspect.mjs <file.glb>');
  console.log('Prints a read-only JSON inventory. Does not validate the full glTF specification.');
  process.exit(args.length === 1 && ['--help', '-h'].includes(args[0]) ? 0 : 2);
}

try {
  const filename = path.resolve(args[0]);
  const fileStat = await stat(filename);
  if (!fileStat.isFile()) throw new Error('Input must be a file.');
  if (path.extname(filename).toLowerCase() !== '.glb') throw new Error('Input must be a .glb file.');
  if (fileStat.size > 512 * 1024 * 1024) throw new Error('File exceeds this helper\'s 512 MiB limit; use gltf-transform inspect instead.');
  const bytes = await readFile(filename);
  if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'glTF') throw new Error('Invalid GLB header.');
  if (bytes.readUInt32LE(4) !== 2) throw new Error('Only GLB version 2 is supported.');
  if (bytes.readUInt32LE(8) !== bytes.length) throw new Error('GLB declared length differs from actual file length.');

  let offset = 12;
  let gltf;
  let chunks = 0;
  const chunkTypes = [];
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) throw new Error('Truncated GLB chunk header.');
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    if (length % 4 !== 0) throw new Error('GLB chunk length is not aligned to four bytes.');
    if (offset + 8 + length > bytes.length) throw new Error('GLB chunk extends past the end of the file.');
    if (chunks === 0 && type !== 0x4e4f534a) throw new Error('First GLB chunk must contain JSON.');
    if (type === 0x4e4f534a) {
      if (gltf) throw new Error('GLB contains more than one JSON chunk.');
      gltf = JSON.parse(bytes.toString('utf8', offset + 8, offset + 8 + length).trim());
    }
    chunkTypes.push(type === 0x4e4f534a ? 'JSON' : type === 0x004e4942 ? 'BIN' : `0x${type.toString(16)}`);
    chunks += 1;
    offset += 8 + length;
  }
  if (!gltf || gltf.asset?.version !== '2.0') throw new Error('Missing glTF 2.0 asset declaration.');
  const collectionNames = ['scenes', 'nodes', 'meshes', 'materials', 'textures', 'images', 'animations', 'skins', 'accessors', 'buffers'];
  for (const name of collectionNames) {
    if (gltf[name] !== undefined && !Array.isArray(gltf[name])) throw new Error(`glTF ${name} must be an array.`);
  }
  const warnings = [];
  const meshSummary = (gltf.meshes ?? []).map((mesh, index) => {
    let triangles = 0;
    let unknownTrianglePrimitives = 0;
    let otherPrimitives = 0;
    for (const primitive of mesh.primitives ?? []) {
      const mode = primitive.mode ?? 4;
      if (![4, 5, 6].includes(mode)) { otherPrimitives += 1; continue; }
      const accessor = gltf.accessors?.[primitive.indices ?? primitive.attributes?.POSITION];
      if (!Number.isInteger(accessor?.count) || accessor.count < 0) { unknownTrianglePrimitives += 1; continue; }
      triangles += mode === 4 ? Math.floor(accessor.count / 3) : Math.max(0, accessor.count - 2);
    }
    return { index, name: mesh.name ?? null, primitives: mesh.primitives?.length ?? 0, declaredTriangles: triangles, unknownTrianglePrimitives, nonTrianglePrimitives: otherPrimitives };
  });
  const resources = [...(gltf.buffers ?? []), ...(gltf.images ?? [])];
  const externalResources = resources.filter((resource) => typeof resource.uri === 'string' && !resource.uri.startsWith('data:')).map((resource) => resource.uri);
  if (externalResources.length) warnings.push('External resources are referenced; this GLB is not self-contained.');
  const unnamedNodes = (gltf.nodes ?? []).filter((node) => !node.name).length;
  if (unnamedNodes) warnings.push(`${unnamedNodes} nodes have no name. Name components and joints needed by gameplay.`);
  if (meshSummary.some((mesh) => mesh.unknownTrianglePrimitives)) warnings.push('Some triangle counts could not be calculated from declared accessor counts.');
  warnings.push('Triangle counts describe mesh definitions; scene instancing and degenerate strip/fan triangles can change rendered counts.');
  console.log(JSON.stringify({
    file: filename,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    glbVersion: 2,
    generator: gltf.asset.generator ?? null,
    chunks: chunkTypes,
    counts: Object.fromEntries(collectionNames.map((name) => [name, gltf[name]?.length ?? 0])),
    extensionsUsed: gltf.extensionsUsed ?? [],
    extensionsRequired: gltf.extensionsRequired ?? [],
    meshDefinitions: meshSummary,
    nodes: (gltf.nodes ?? []).map((node, index) => ({ index, name: node.name ?? null, mesh: node.mesh ?? null, children: node.children ?? [] })),
    animations: (gltf.animations ?? []).map((animation, index) => ({ index, name: animation.name ?? null, channels: animation.channels?.length ?? 0 })),
    externalResources,
    warnings,
    validation: 'Container/header checks only. Run gltf-transform validate, then review the asset in the browser.'
  }, null, 2));
} catch (error) {
  console.error(`Asset inspection failed: ${error.message}`);
  process.exitCode = 1;
}
