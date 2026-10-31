import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyDragonFlight } from '../tools/verify-dragon-flight.mjs';
import { ACTIVE_DRAGON, FLIGHT_DRAGON } from '../src/prototypes/dogfight/assets/dragon-model.js';
import { readFile, writeFile, mkdtemp, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('active flight export preserves reviewed geometry/maps and carries only allowed clips and named sockets', async () => {
  assert.equal(ACTIVE_DRAGON, FLIGHT_DRAGON);
  const result = await verifyDragonFlight(`public/assets/dogfight/models/${FLIGHT_DRAGON.filename}`);
  assert.equal(result.triangles, 81991); assert.equal(result.meshes, 41); assert.equal(result.joints, 9);
  assert.equal(result.sockets.length, 8); assert.equal(result.clips.length, 3);
  assert.equal(result.contract.units, 'meters'); assert.equal(result.contract.assetContractVersion, 1);
});

test('promotion rejects tampered buffer views, accessors and coordinate contracts before changing runtime files', async () => {
  const bytes = await readFile(`public/assets/dogfight/models/${FLIGHT_DRAGON.filename}`);
  const end = 20 + bytes.readUInt32LE(12), original = JSON.parse(bytes.subarray(20, end).toString().trim());
  const folder = await mkdtemp(path.join(tmpdir(), 'space-dragon-contract-')), target = path.join(folder, 'invalid.glb');
  const encode = json => {
    const text = Buffer.from(JSON.stringify(json)), padded = Buffer.concat([text, Buffer.alloc((4 - text.length % 4) % 4, 32)]);
    const header = Buffer.alloc(20); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
    header.writeUInt32LE(20 + padded.length + bytes.length - end, 8); header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
    return Buffer.concat([header, padded, bytes.subarray(end)]);
  };
  try {
    for (const [change, error] of [
      [json => { json.bufferViews[0].byteOffset = (json.bufferViews[0].byteOffset || 0) + 4; }, /bufferViews changed/],
      [json => { json.accessors[0].count++; }, /accessors changed/],
      [json => { json.asset.extras.forwardAxis = '+Z'; }, /-Z/],
      [json => { delete json.asset.extras.assetContractVersion; }, /Missing asset contract/],
    ]) {
      const invalid = structuredClone(original); change(invalid); await writeFile(target, encode(invalid));
      await assert.rejects(verifyDragonFlight(target), error);
    }
  } finally { await unlink(target).catch(() => {}); await rmdir(folder); }
});
