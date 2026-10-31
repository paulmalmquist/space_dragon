// Offline, reproducible conversion of MIT Rocketbox adult models and walk clips.
// Original downloads remain in ignored assets/source/local/drive-pedestrians/.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { copyToDocument, dequantize, prune, unpartition } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const intake = path.join(root, 'assets/source/local/drive-pedestrians');
const output = path.join(root, 'public/assets/drive/pedestrians');
await fs.mkdir(output, { recursive: true });
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
for (const [name, sex, target] of [['female-adult-02', 'f', 'adult-female'], ['male-adult-11', 'm', 'adult-male']]) {
  const doc = await io.read(path.join(intake, `${name}.glb`));
  const clip = await io.read(path.join(intake, `${sex}-walk.glb`));
  const nodes = new Map(doc.getRoot().listNodes().map(node => [node.getName(), node]));
  const sourceAnimation = clip.getRoot().listAnimations()[0];
  const animation = doc.createAnimation('walk');
  const accessors = sourceAnimation.listSamplers().flatMap(sampler => [sampler.getInput(), sampler.getOutput()]);
  const map = copyToDocument(doc, clip, accessors);
  let mapped = 0;
  for (const channel of sourceAnimation.listChannels()) {
    const node = nodes.get(channel.getTargetNode().getName());
    if (!node) continue; // Bip01 Footsteps helpers are not deformation joints.
    const sampler = channel.getSampler();
    const copied = doc.createAnimationSampler().setInterpolation(sampler.getInterpolation())
      .setInput(map.get(sampler.getInput())).setOutput(map.get(sampler.getOutput()));
    animation.addSampler(copied).addChannel(doc.createAnimationChannel().setTargetNode(node)
      .setTargetPath(channel.getTargetPath()).setSampler(copied));
    mapped++;
  }
  if (mapped < 20) throw new Error(`Insufficient matching skeletal channels for ${name}`);
  // Decode geometry once at authoring time; runtime needs no remote WASM decoder.
  doc.getRoot().listExtensionsUsed().filter(ext => ext.extensionName === 'EXT_meshopt_compression').forEach(ext => ext.dispose());
  await doc.transform(dequantize(), prune(), unpartition());
  for (const material of doc.getRoot().listMaterials()) {
    // Original specular maps remain embedded, with a cloth/skin nonmetal response.
    material.setMetallicFactor(0).setRoughnessFactor(.82);
  }
  const destination = path.join(output, `${target}.glb`);
  await io.write(destination, doc);
  console.log(`${target}: ${mapped} walk channels, ${(await fs.stat(destination)).size} bytes`);
}
await fs.copyFile(path.join(intake, 'LICENSE-Microsoft-Rocketbox.txt'), path.join(output, 'LICENSE-Microsoft-Rocketbox.txt'));
