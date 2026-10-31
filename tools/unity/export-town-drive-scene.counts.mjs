/** glTFast 6.20 GameObject import counts, including EXT_mesh_gpu_instancing. */
export function expectedImportedCounts(gltf) {
  const reached = new Set();
  const visit = index => {
    if (reached.has(index)) return;
    reached.add(index);
    for (const child of gltf.nodes[index].children ?? []) visit(child);
  };
  for (const index of gltf.scenes[gltf.scene ?? 0].nodes ?? []) visit(index);
  let expectedImportedMeshCount = 0;
  let expectedImportedTriangleCount = 0;
  for (const index of reached) {
    const node = gltf.nodes[index];
    if (node.mesh === undefined) continue;
    const attributes = node.extensions?.EXT_mesh_gpu_instancing?.attributes;
    const instanceCounts = attributes ? Object.values(attributes).map(i => gltf.accessors[i].count) : [1];
    if (instanceCounts.some(n => n !== instanceCounts[0])) throw new Error(`Mismatched instance accessor counts: ${node.name}`);
    const instances = instanceCounts[0];
    const groups = new Set();
    for (const primitive of gltf.meshes[node.mesh].primitives) {
      // Mirrors glTFast VertexBufferDescriptor.FromPrimitive: matching vertex
      // layouts become submeshes of one Unity Mesh, rather than extra filters.
      const a = primitive.attributes;
      let texCoords = 0;
      while (a[`TEXCOORD_${texCoords}`] !== undefined) texCoords++;
      groups.add(JSON.stringify([a.NORMAL !== undefined, a.TANGENT !== undefined,
        texCoords, a.COLOR_0 !== undefined, a.WEIGHTS_0 !== undefined && a.JOINTS_0 !== undefined,
        primitive.targets?.length ?? 0]));
      const count = gltf.accessors[primitive.indices ?? a.POSITION].count;
      const mode = primitive.mode ?? 4;
      if (mode === 4) {
        if (count % 3 !== 0) throw new Error(`Invalid triangle index count: ${node.name}`);
        expectedImportedTriangleCount += instances * count / 3;
      } else if (mode === 5 || mode === 6) {
        expectedImportedTriangleCount += instances * Math.max(0, count - 2);
      } else if (mode < 0 || mode > 6) throw new Error(`Unknown primitive topology: ${mode}`);
      // Utility wires are line primitives. They create a MeshFilter but add no
      // triangles, matching the importer's topology-aware evidence counter.
    }
    expectedImportedMeshCount += instances * groups.size;
  }
  return { expectedImportedMeshCount, expectedImportedTriangleCount };
}
