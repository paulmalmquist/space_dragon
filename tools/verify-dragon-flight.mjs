import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

function parse(bytes) {
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, 'Expected GLB, not an LFS pointer');
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const end = 20 + bytes.readUInt32LE(12);
  return { json: JSON.parse(bytes.subarray(20, end).toString().trim()), binary: bytes.subarray(end + 8) };
}

export async function verifyDragonFlight(candidate, baseline = 'public/assets/dogfight/models/dragon-cinematic-benchmark-v002.glb') {
  const bytes = await readFile(candidate), prior = await readFile(baseline);
  const next = parse(bytes), old = parse(prior), doc = next.json;
  assert.ok(next.binary.subarray(0, old.binary.length).equals(old.binary), 'Reviewed geometry/maps/binds must remain byte-identical');
  for (const field of ['meshes', 'materials', 'skins', 'images', 'textures']) assert.deepEqual(doc[field], old.json[field], `${field} changed`);
  for (const field of ['accessors', 'bufferViews']) assert.deepEqual(doc[field].slice(0, old.json[field].length), old.json[field], `${field} changed`);
  const contract = doc.asset?.extras;
  assert.equal(contract?.assetContractVersion, 1, 'Missing asset contract version');
  assert.equal(contract.units, 'meters'); assert.equal(contract.metersPerUnit, 1);
  assert.equal(contract.upAxis, '+Y'); assert.equal(contract.forwardAxis, '-Z'); assert.equal(contract.scale, 1);
  assert.ok(Number.isFinite(contract.groundContactY) && contract.groundContactY < 0 && contract.groundContactY > -1, 'Invalid contact height');
  for (let i = 0; i < old.json.nodes.length; i++) {
    const current = { ...doc.nodes[i] }, original = { ...old.json.nodes[i] };
    current.children = (current.children || []).filter(child => child < old.json.nodes.length);
    original.children ||= [];
    assert.deepEqual(current, original, `Original node ${original.name || i} changed`);
  }
  assert.deepEqual(doc.animations.map(clip => clip.name).sort(), ['Boost', 'Flight', 'Glide']);
  const allowed = ['Wing_L', 'Wing_R', 'Tail_0', 'Tail_1', 'Tail_2', 'Tail_3', 'Tail_4'];
  const values = index => {
    const accessor = doc.accessors[index], view = doc.bufferViews[accessor.bufferView];
    assert.equal(accessor.componentType, 5126); assert.equal(accessor.sparse, undefined);
    const components = accessor.type === 'VEC4' ? 4 : 1, stride = view.byteStride || components * 4;
    return Array.from({ length: accessor.count }, (_, row) => Array.from({ length: components }, (_, column) =>
      next.binary.readFloatLE((view.byteOffset || 0) + (accessor.byteOffset || 0) + row * stride + column * 4)));
  };
  for (const clip of doc.animations) {
    assert.equal(clip.channels.length, 7);
    assert.deepEqual(clip.channels.map(channel => doc.nodes[channel.target.node].name).sort(), [...allowed].sort());
    for (const channel of clip.channels) {
      assert.equal(channel.target.path, 'rotation', 'Only local bone quaternion channels are allowed');
      const sampler = clip.samplers[channel.sampler], times = values(sampler.input).flat(), rotations = values(sampler.output);
      assert.equal(times[0], 0); assert.equal(times.at(-1), 1); assert.equal(rotations.length, times.length);
      assert.ok(times.every((time, i) => Number.isFinite(time) && (i === 0 || time > times[i - 1])));
      assert.ok(rotations.every(q => q.every(Number.isFinite) && Math.abs(Math.hypot(...q) - 1) < 1e-5));
    }
  }
  const sockets = ['muzzle', 'wing_l', 'wing_r', 'thruster_l', 'thruster_r', 'target', 'camera', 'ground'];
  for (const suffix of sockets) {
    const name = `socket_${suffix}`;
    assert.equal(doc.nodes.filter(node => node.name === name).length, 1);
    const index = doc.nodes.findIndex(node => node.name === name);
    const parent = suffix === 'wing_l' ? 'Wing_L' : suffix === 'wing_r' ? 'Wing_R' : 'Root';
    assert.deepEqual(doc.nodes.filter(node => node.children?.includes(index)).map(node => node.name), [parent], `${name} must follow ${parent}`);
  }
  assert.equal(doc.cameras?.length || 0, 0);
  const triangles = doc.meshes.reduce((sum, mesh) => sum + mesh.primitives.reduce((count, primitive) => count + doc.accessors[primitive.indices].count / 3, 0), 0);
  return { status: 'PASS', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
    meshes: doc.meshes.length, triangles, joints: doc.skins[0].joints.length,
    preservedBinaryBytes: old.binary.length, originalNodes: old.json.nodes.length,
    clips: doc.animations.map(clip => ({ name: clip.name, duration: 1, channels: clip.channels.length })),
    sockets: sockets.map(name => `socket_${name}`), contract };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(await verifyDragonFlight(process.argv[2] || 'public/assets/dogfight/models/dragon-flight-v003.glb', process.argv[3]), null, 2));
}
