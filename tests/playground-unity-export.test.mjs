import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const core = 'unity/SpaceDragon/Assets/SpaceDragon/Traversal/Core';
const run = (...parts) => execFileSync(process.execPath, ['--no-warnings', ...parts], { encoding: 'utf8' });

// Unity builds Luke's Playground from generated C#. It must never drift from the TypeScript
// level, scenery specs and hero motion rules it was exported from.
test("committed Luke's Playground C# matches the TypeScript source", async () => {
  const output = run('--experimental-strip-types', 'tools/unity/export-playground.mjs', '--verify');
  const line = output.trim().split('\n').at(-1);
  assert.match(line, /^PLAYGROUND_EXPORT_VERIFIED /);
  const result = JSON.parse(line.slice(line.indexOf('{')));
  assert.equal(result.world, 'luke-playground-v001');
  assert.equal(result.sparks, 14);
  assert.ok(result.probes >= 4 && result.probeSteps > 1500);
  const level = await readFile(`${core}/LukePlaygroundData.cs`, 'utf8');
  assert.match(level, /auto-generated/);
  assert.ok(level.includes(`SourceFingerprint = "${result.sourceFingerprint}"`));
  for (const id of ['playset-ramp', 'playset-deck', 'playset-slide', 'playset-bars', 'playset-mast', 'spark-13', 'spark-14']) assert.ok(level.includes(`"${id}"`), id);
  const scenery = await readFile(`${core}/HomeBlockScenery.cs`, 'utf8');
  for (const name of ['Houses', 'BackdropHouses', 'Lamps', 'Poles', 'Pilings', 'Palms', 'Trees', 'Cars', 'Fences', 'Hedges', 'RoofMasts']) assert.ok(scenery.includes(`[] ${name} =`), name);
  const motion = await readFile(`${core}/PersonMotionData.cs`, 'utf8');
  for (const pose of ['rise', 'fall', 'swing', 'land', 'climbLeft', 'climbRight', 'dizzy']) assert.ok(motion.includes(`id = "${pose}"`), pose);
  // The Unity avatar gives every exported pose its own weight and leaves an unknown one out.
  const avatar = await readFile('unity/SpaceDragon/Assets/SpaceDragon/Playground/Runtime/PersonAvatar.cs', 'utf8');
  for (const pose of ['rise', 'fall', 'swing', 'land', 'climbLeft', 'climbRight', 'dizzy']) assert.ok(avatar.includes(`case "${pose}":`), `${pose} is handled`);
  assert.match(avatar, /default: weight = 0; break;/);
});

test('every new Unity asset has a meta file and the hero model is plain glTF', async () => {
  assert.match(run('tools/unity/ensure-metas.mjs', 'Playground', 'Traversal', '--check'), /UNITY_METAS_COMPLETE/);
  for (const folder of ['unity/SpaceDragon/Assets/SpaceDragon/Playground/Imported/Characters', 'public/assets/playground/hero']) {
    const model = JSON.parse(await readFile(`${folder}/playground-kid.gltf`, 'utf8'));
    assert.equal(model.extensionsUsed, undefined, 'no glTF extensions');
    assert.ok(model.accessors.every(accessor => accessor.sparse === undefined), 'no sparse accessors');
    assert.deepEqual(model.animations.map(animation => animation.name), ['idle', 'walk', 'run', 'sprint']);
    assert.equal(model.skins.length, 1);
    assert.equal(model.skins[0].joints.length, 80);
    assert.equal(model.meshes[0].extras.targetNames.length, 8);
    assert.ok(model.images.every(image => /^playground-kid-(body|head)-(color|normal|roughness)\.png$/.test(image.uri)));
    assert.deepEqual(model.buffers.map(buffer => buffer.uri), ['playground-kid.bin']);
    // Every animated node is a real joint or the hip root, addressed by name in both runtimes.
    const animated = new Set(model.animations.flatMap(animation => animation.channels.map(channel => model.nodes[channel.target.node].name)));
    assert.ok(animated.has('Bip01') && animated.has('Bip01 L Thigh') && animated.has('Bip01 R Forearm'));
    assert.ok([...animated].every(name => !name.includes('Eye') && !name.includes('Jaw')), 'the adult face rig is not animated');
  }
});
