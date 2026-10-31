// Index and tangent cleanup for the SD-059 candidate. Preserve nodes and skins.
// Weld identical vertices, remove zero-area repeated-index triangles, retain
// mapped Mikk bases, and repair invalid zero tangent vectors explicitly.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, compactPrimitive } from '@gltf-transform/functions';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const [input, output] = process.argv.slice(2);
if (!input || !output || input === output) throw new Error('Usage: optimize_cinematic_dragon.mjs input.glb fresh-output.glb');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(input);
const paintNormalStrengths = [];
for (const material of document.getRoot().listMaterials()) {
  if (!material.getNormalTexture()) continue;
  const strength = material.getName().includes('Crimson painted') ? .22
    : material.getName().includes('Dark painted') ? .18 : null;
  if (strength !== null) {
    material.setNormalScale(strength);
    paintNormalStrengths.push({ material: material.getName(), normalScale: strength });
  }
}
await document.transform(weld());
const removed = [];
const repairedTangents = [];
for (const mesh of document.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
  // Body materials intentionally have no normal map; authored Mikk tangents
  // are required only by the baked section. Do not ship unused body tangents.
  if (!primitive.getMaterial()?.getNormalTexture() && primitive.getAttribute('TANGENT')) {
    const tangent = primitive.getAttribute('TANGENT');
    primitive.setAttribute('TANGENT', null);
    if (tangent.listParents().every(parent => parent.propertyType === 'Root')) tangent.dispose();
  }
  if (primitive.getMode() !== 4 || !primitive.getIndices()) continue;
  const accessor = primitive.getIndices(), array = accessor.getArray(), keep = [];
  let count = 0;
  for (let i = 0; i < array.length; i += 3) {
    const a = array[i], b = array[i + 1], c = array[i + 2];
    if (a === b || a === c || b === c) count++;
    else keep.push(a, b, c);
  }
  if (count) {
    accessor.setArray(new array.constructor(keep));
    compactPrimitive(primitive);
    removed.push({ mesh: mesh.getName(), repeatedIndexTrianglesRemoved: count });
  }
  const tangent = primitive.getAttribute('TANGENT');
  if (tangent) {
    const ta = tangent.getArray(), normal = primitive.getAttribute('NORMAL').getArray();
    const pos = primitive.getAttribute('POSITION').getArray(), uv = primitive.getAttribute('TEXCOORD_0').getArray();
    const indices = primitive.getIndices().getArray(), sum = new Float64Array(normal.length);
    for (let i = 0; i < indices.length; i += 3) {
      const [a, b, c] = [indices[i], indices[i + 1], indices[i + 2]];
      const du1 = uv[b * 2] - uv[a * 2], dv1 = uv[b * 2 + 1] - uv[a * 2 + 1];
      const du2 = uv[c * 2] - uv[a * 2], dv2 = uv[c * 2 + 1] - uv[a * 2 + 1];
      const determinant = du1 * dv2 - du2 * dv1;
      if (Math.abs(determinant) < 1e-12) continue;
      for (let axis = 0; axis < 3; axis++) {
        const direction = ((pos[b * 3 + axis] - pos[a * 3 + axis]) * dv2 - (pos[c * 3 + axis] - pos[a * 3 + axis]) * dv1) / determinant;
        for (const v of [a, b, c]) sum[v * 3 + axis] += direction;
      }
    }
    let repaired = 0, collapsedUv = 0;
    for (let v = 0; v < tangent.getCount(); v++) {
      if (Math.hypot(ta[v * 4], ta[v * 4 + 1], ta[v * 4 + 2]) > .9) continue;
      const n = normal.subarray(v * 3, v * 3 + 3), t = Array.from(sum.subarray(v * 3, v * 3 + 3));
      const dot = t[0] * n[0] + t[1] * n[1] + t[2] * n[2];
      for (let axis = 0; axis < 3; axis++) t[axis] -= dot * n[axis];
      let length = Math.hypot(...t);
      if (length < 1e-8) {
        // Sub-texel UV faces have no defined tangent direction. Keep the
        // authored geometric normal and choose a stable orthogonal basis.
        const axis = Math.abs(n[0]) < .7 ? [1, 0, 0] : [0, 1, 0];
        const projection = axis[0] * n[0] + axis[1] * n[1] + axis[2] * n[2];
        for (let i = 0; i < 3; i++) t[i] = axis[i] - projection * n[i];
        length = Math.hypot(...t); collapsedUv++;
      }
      for (let axis = 0; axis < 3; axis++) ta[v * 4 + axis] = t[axis] / length;
      ta[v * 4 + 3] = ta[v * 4 + 3] < 0 ? -1 : 1;
      repaired++;
    }
    if (repaired) repairedTangents.push({ mesh: mesh.getName(), zeroTangentsRepaired: repaired, collapsedUvFallback: collapsedUv });
  }
}
await io.write(output, document);
const bytes = await readFile(output);
console.log(JSON.stringify({ input, output, bytes: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'), removed, repairedTangents, paintNormalStrengths,
  totalRemoved: removed.reduce((sum, item) => sum + item.repeatedIndexTrianglesRemoved, 0),
  scope: 'Bitwise vertex weld; repeated-index zero-area triangle removal; unused body tangent removal; zero tangent reconstruction from adjacent UV derivatives or an orthogonal fallback. No node pruning, quantization, texture recompression, rig changes or external decoder.' }, null, 2));
