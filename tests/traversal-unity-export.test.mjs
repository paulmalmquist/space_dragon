import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

// The Unity project carries generated C# level data and golden trajectories for the
// engine-independent traversal port. They must never drift from the TypeScript source.
test('committed Unity traversal data and fixtures match the TypeScript reference', async () => {
  const output = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', 'tools/unity/export-traversal.mjs', '--verify'], { encoding: 'utf8' });
  const result = JSON.parse(output.trim().split('\n').at(-1));
  assert.equal(result.verified, true);
  assert.ok(result.scenarios >= 14 && result.steps > 9000 && result.samples > 600);
  const data = await readFile('unity/SpaceDragon/Assets/SpaceDragon/Traversal/Core/HomeBlockData.cs', 'utf8');
  assert.match(data, /auto-generated/);
  assert.ok(data.includes(`SourceFingerprint = "${result.sourceFingerprint}"`));
  const fixtures = JSON.parse(await readFile('unity/SpaceDragon/Assets/SpaceDragon/Traversal/Tests/EditMode/Fixtures/traversal-fixtures-v001.json', 'utf8'));
  assert.equal(fixtures.sourceFingerprint, result.sourceFingerprint);
  assert.equal(fixtures.counts.sparks, 12);
  // Every exported tuning value has a same-named C# field with the same number.
  const tuning = await readFile('unity/SpaceDragon/Assets/SpaceDragon/Traversal/Core/TraversalTuning.cs', 'utf8');
  for (const [name, value] of Object.entries(fixtures.tuning)) {
    const match = tuning.match(new RegExp(`\\b${name} = (-?[\\d.]+)`));
    assert.ok(match, `C# tuning is missing ${name}`);
    assert.equal(Number(match[1]), value, name);
  }
});
