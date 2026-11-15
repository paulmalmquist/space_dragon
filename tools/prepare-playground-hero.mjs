// Offline, reproducible preparation of the Luke's Playground hero stand-in.
//
// The model is a generic MIT-licensed Microsoft Rocketbox child avatar. It is not a
// family likeness: no owner photo, scan or reference board is read by this tool.
// Upstream FBX/TGA files stay in the ignored assets/source/local/playground-hero/
// intake; tools/blender/rocketbox_fbx_to_glb.py converts the FBX files with Blender.
//
//   node tools/prepare-playground-hero.mjs            write the Unity and browser assets
//   node tools/prepare-playground-hero.mjs --verify   check committed outputs against PROVENANCE.json
//
// The model ships as .gltf + .bin + PNG textures, the same plain-file convention as the
// repository's other PNG surfaces, so Unity can set import options per texture.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const intake = path.join(root, 'assets/source/local/playground-hero');
const UPSTREAM = 'https://github.com/microsoft/Microsoft-Rocketbox';
const UPSTREAM_COMMIT = '0943055db6ec570bcef9f2c8b41c9e5467c808f9';
const AVATAR = 'Male_Child_01_facial';
const TEXTURE_PREFIX = 'cm001';
const MODEL_NAME = 'playground-kid.gltf';
const EXTRA_FILES = ['LICENSE-Microsoft-Rocketbox.txt'];

/** Clips keep their upstream names in provenance; runtime code uses the short ids. */
const CLIPS = [
  { id: 'idle', source: 'm_idle_neutral_01', folder: 'all_animations_max_motextr_static', locomotion: false },
  { id: 'walk', source: 'm_walk_neutral_01', folder: 'all_animations_max_motextr_xy', locomotion: true },
  { id: 'run', source: 'm_run_neutral_01', folder: 'all_animations_max_motextr_xy', locomotion: true },
  { id: 'sprint', source: 'm_run_fast_01', folder: 'all_animations_max_motextr_xy', locomotion: true },
];
/** A small expressive subset of the 175 upstream blend shapes keeps the file light. */
const KEEP_TARGETS = [
  'AK_03_BrowInnerUp', 'AK_09_EyeBlinkLeft', 'AK_10_EyeBlinkRight', 'AK_21_EyeWideLeft', 'AK_22_EyeWideRight',
  'AK_25_JawOpen', 'AK_44_MouthSmileLeft', 'AK_45_MouthSmileRight',
];
/**
 * Unity gets full-size colour and normal maps plus URP metallic-smoothness maps (smoothness
 * in alpha); the browser gets half-size maps. Roughness varies slowly, so it stays small.
 */
const TARGETS = [
  { id: 'unity', directory: 'unity/SpaceDragon/Assets/SpaceDragon/Playground/Imported/Characters', size: 2048, roughnessSize: 1024, smoothness: true },
  { id: 'browser', directory: 'public/assets/playground/hero', size: 1024, roughnessSize: 1024, smoothness: false },
];
const ROOT_BONE = 'Bip01';
const HEAD_BONE = 'Bip01 Head';
const FEET = [['Bip01 L Foot', 'Bip01 L Toe0'], ['Bip01 R Foot', 'Bip01 R Toe0']];

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const round = (value, digits = 5) => Number(value.toFixed(digits));

// --- small quaternion helpers (x, y, z, w) -----------------------------------------
const rotate = (q, v) => {
  const [x, y, z, w] = q;
  const tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
};
const angleBetween = (a, b) => {
  const dot = Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]));
  return 2 * Math.acos(dot) * 180 / Math.PI;
};

function decodeTga(bytes, label) {
  const idLength = bytes[0], colorMap = bytes[1], type = bytes[2];
  const width = bytes.readUInt16LE(12), height = bytes.readUInt16LE(14), depth = bytes[16], descriptor = bytes[17];
  if (colorMap !== 0 || type !== 2 || (depth !== 24 && depth !== 32)) throw new Error(`Unsupported TGA layout: ${label}`);
  const channels = depth / 8, offset = 18 + idLength, topDown = (descriptor & 0x20) !== 0;
  if (bytes.length < offset + width * height * channels) throw new Error(`Truncated TGA: ${label}`);
  const rgb = Buffer.alloc(width * height * 3);
  for (let row = 0; row < height; row++) {
    const source = offset + (topDown ? row : height - 1 - row) * width * channels;
    for (let column = 0; column < width; column++) {
      const from = source + column * channels, to = (row * width + column) * 3;
      rgb[to] = bytes[from + 2]; rgb[to + 1] = bytes[from + 1]; rgb[to + 2] = bytes[from];
    }
  }
  return { width, height, rgb };
}

/**
 * Rocketbox ships a dark greyscale specular-intensity map (skin and cloth sit near 0.04,
 * eyes and teeth reach 0.6). glTF wants roughness, so a brighter highlight becomes a
 * smoother surface. The head map is mostly skin and hair; the body map is mostly cloth.
 */
const ROUGHNESS = Object.freeze({
  head: { base: 0.72, slope: 1.9, min: 0.12, max: 0.72 },
  body: { base: 0.95, slope: 2.2, min: 0.35, max: 0.95 },
});
function roughnessFromSpecular(image, part) {
  const curve = ROUGHNESS[part];
  const out = Buffer.alloc(image.width * image.height * 3);
  let total = 0;
  for (let index = 0; index < image.width * image.height; index++) {
    const specular = (image.rgb[index * 3] + image.rgb[index * 3 + 1] + image.rgb[index * 3 + 2]) / 765;
    total += specular;
    const roughness = Math.min(curve.max, Math.max(curve.min, curve.base - curve.slope * specular));
    out[index * 3] = 255; out[index * 3 + 1] = Math.round(roughness * 255); out[index * 3 + 2] = 0;
  }
  return { image: { width: image.width, height: image.height, rgb: out }, meanSpecular: total / (image.width * image.height) };
}

const encodePng = (image, size) => sharp(image.rgb, { raw: { width: image.width, height: image.height, channels: 3 } })
  .resize(size, size, { kernel: 'lanczos3', fit: 'fill' }).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();

/** URP Lit reads metallic from red and smoothness from alpha; this model is never metallic. */
function smoothnessFromRoughness(image) {
  const rgba = Buffer.alloc(image.width * image.height * 4);
  for (let index = 0; index < image.width * image.height; index++) rgba[index * 4 + 3] = 255 - image.rgb[index * 3 + 1];
  return { width: image.width, height: image.height, rgba };
}
const encodeRgbaPng = (image, size) => sharp(image.rgba, { raw: { width: image.width, height: image.height, channels: 4 } })
  .resize(size, size, { kernel: 'lanczos3', fit: 'fill' }).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();

function rigOf(document) {
  const nodes = document.getRoot().listNodes();
  const parent = new Map();
  for (const node of nodes) for (const child of node.listChildren()) parent.set(child, node);
  const byName = new Map(nodes.map(node => [node.getName(), node]));
  return { byName, parent };
}

/** World position of a named joint for one pose (bone name -> rotation/translation override). */
function worldPosition(rig, name, pose) {
  let node = rig.byName.get(name);
  if (!node) throw new Error(`Missing joint ${name}`);
  let point = [0, 0, 0];
  while (node) {
    const override = pose.get(node.getName());
    const rotation = override?.rotation ?? node.getRotation();
    const translation = override?.translation ?? node.getTranslation();
    const scale = node.getScale();
    const rotated = rotate(rotation, [point[0] * scale[0], point[1] * scale[1], point[2] * scale[2]]);
    point = [rotated[0] + translation[0], rotated[1] + translation[1], rotated[2] + translation[2]];
    node = rig.parent.get(node);
  }
  return point;
}

function readClip(document, label) {
  const animation = document.getRoot().listAnimations().find(item => item.getName().startsWith(`${ROOT_BONE}|`));
  if (!animation) throw new Error(`No skeleton take in ${label}`);
  const tracks = new Map();
  let times = null;
  for (const channel of animation.listChannels()) {
    const node = channel.getTargetNode(), sampler = channel.getSampler();
    if (!node || !sampler) continue;
    const input = Array.from(sampler.getInput().getArray());
    if (!times) times = input;
    if (input.length !== times.length) throw new Error(`Unequal key counts in ${label}`);
    const key = `${node.getName()}|${channel.getTargetPath()}`;
    tracks.set(key, { size: sampler.getOutput().getElementSize(), values: Array.from(sampler.getOutput().getArray()) });
  }
  const start = times[0];
  return { times: times.map(time => time - start), tracks };
}

/** Bones under the head carry adult face-rig motion; the child keeps its own face. */
function underHead(rig, name) {
  let node = rig.parent.get(rig.byName.get(name));
  while (node) { if (node.getName() === HEAD_BONE) return true; node = rig.parent.get(node); }
  return false;
}

function retarget(rig, adultRig, clip, spec) {
  const frames = clip.times.length;
  const duration = clip.times[frames - 1];
  const legLength = source => ['Bip01 L Calf', 'Bip01 L Foot'].reduce((sum, name) => sum + Math.hypot(...source.byName.get(name).getTranslation()), 0);
  const legRatio = legLength(rig) / legLength(adultRig);

  const rotations = new Map();
  for (const [key, track] of clip.tracks) {
    const [name, targetPath] = key.split('|');
    if (targetPath !== 'rotation' || name === ROOT_BONE || !rig.byName.has(name) || underHead(rig, name)) continue;
    rotations.set(name, track.values);
  }
  if (rotations.size < 40) throw new Error(`Insufficient matching skeletal channels for ${spec.source}: ${rotations.size}`);

  const rootTrack = clip.tracks.get(`${ROOT_BONE}|translation`);
  const restRoot = rig.byName.get(ROOT_BONE).getTranslation();
  const adultHeights = Array.from({ length: frames }, (_, frame) => rootTrack ? rootTrack.values[frame * 3 + 1] : adultRig.byName.get(ROOT_BONE).getTranslation()[1]);
  const forward = rootTrack ? rootTrack.values[(frames - 1) * 3 + 2] - rootTrack.values[2] : 0;
  const lateral = rootTrack ? Math.max(...Array.from({ length: frames }, (_, frame) => Math.abs(rootTrack.values[frame * 3]))) : 0;

  const poseAt = (frame, height) => {
    const pose = new Map([[ROOT_BONE, { translation: [restRoot[0], height, restRoot[2]] }]]);
    for (const [name, values] of rotations) pose.set(name, { rotation: values.slice(frame * 4, frame * 4 + 4) });
    return pose;
  };
  const rest = new Map();
  const restSole = FEET.map(pair => pair.map(name => worldPosition(rig, name, rest)[1]));
  let lowest = Infinity;
  const footForward = [];
  for (let frame = 0; frame < frames; frame++) {
    const pose = poseAt(frame, adultHeights[frame] * legRatio);
    FEET.forEach((pair, side) => pair.forEach((name, part) => {
      lowest = Math.min(lowest, worldPosition(rig, name, pose)[1] - restSole[side][part]);
    }));
    footForward.push(worldPosition(rig, FEET[0][0], pose)[2]);
  }
  // One constant lift per clip plants the lowest contact on the ground and keeps any flight phase.
  const heights = adultHeights.map(height => height * legRatio - lowest);

  // Start every locomotion loop where the left foot reaches furthest forward so clips blend in phase.
  let shift = 0;
  const closure = Math.max(...Array.from(rotations.values(), values => angleBetween(values.slice(0, 4), values.slice((frames - 1) * 4, frames * 4))));
  if (spec.locomotion) {
    if (closure > 4) throw new Error(`${spec.source} is not a closed loop (${closure.toFixed(2)} degrees)`);
    for (let frame = 1; frame < frames - 1; frame++) if (footForward[frame] > footForward[shift]) shift = frame;
  }
  const cycle = frames - 1;
  const order = Array.from({ length: frames }, (_, index) => (index % cycle + shift) % cycle);
  const reorder = (values, size) => order.flatMap(frame => values.slice(frame * size, frame * size + size));
  const interval = duration / cycle;
  return {
    id: spec.id,
    frames,
    duration,
    times: Array.from({ length: frames }, (_, index) => index * interval),
    rotations: new Map(Array.from(rotations, ([name, values]) => [name, spec.locomotion ? reorder(values, 4) : values])),
    root: (spec.locomotion ? order.map(frame => heights[frame]) : heights).flatMap(height => [restRoot[0], height, restRoot[2]]),
    report: {
      id: spec.id, source: spec.source, frames, durationSeconds: round(duration, 4), channels: rotations.size,
      legRatio: round(legRatio, 4), groundLiftMetres: round(-lowest, 4), loopClosureDegrees: round(closure, 3), phaseShiftFrames: shift,
      // Speed at which the in-place loop matches ground travel for this child's leg length.
      naturalSpeedMetresPerSecond: round(forward * legRatio / duration, 3), removedLateralMetres: round(lateral, 4),
    },
  };
}

async function build(target, io, textures) {
  const document = await io.read(path.join(intake, 'converted', `${AVATAR}.glb`));
  const gltf = document.getRoot();
  for (const animation of gltf.listAnimations()) {
    for (const channel of animation.listChannels()) channel.dispose();
    for (const sampler of animation.listSamplers()) sampler.dispose();
    animation.dispose();
  }
  for (const extension of gltf.listExtensionsUsed()) extension.dispose();

  const rig = rigOf(document);
  const mesh = gltf.listMeshes()[0];
  if (gltf.listMeshes().length !== 1 || gltf.listSkins().length !== 1) throw new Error('Expected one skinned mesh');
  const names = mesh.getExtras().targetNames;
  const keep = KEEP_TARGETS.map(name => names.indexOf(name)).sort((a, b) => a - b);
  if (keep.includes(-1)) throw new Error('A required blend shape is missing upstream');
  for (const primitive of mesh.listPrimitives()) {
    primitive.listTargets().forEach((item, index) => { if (!keep.includes(index)) primitive.removeTarget(item); });
  }
  mesh.setWeights(keep.map(() => 0)).setExtras({ targetNames: keep.map(index => names[index]) });
  mesh.setName('PlaygroundKid');

  for (const material of gltf.listMaterials()) {
    const part = material.getName().endsWith('_head') ? 'head' : material.getName().endsWith('_body') ? 'body' : null;
    if (!part) throw new Error(`Unexpected material ${material.getName()}`);
    const texture = kind => document.createTexture(`playground-kid-${part}-${kind}`).setMimeType('image/png')
      .setImage(textures[target.id].maps[`${part}_${kind}`]).setURI(`playground-kid-${part}-${kind}.png`);
    material.setName(`PlaygroundKid.${part}`).setBaseColorFactor([1, 1, 1, 1]).setBaseColorTexture(texture('color'))
      .setNormalTexture(texture('normal')).setNormalScale(1).setMetallicRoughnessTexture(texture('roughness'))
      .setMetallicFactor(0).setRoughnessFactor(1).setAlphaMode('OPAQUE').setDoubleSided(false)
      .setEmissiveFactor([0, 0, 0]);
  }

  const buffer = gltf.listBuffers()[0];
  const reports = [];
  for (const spec of CLIPS) {
    const clipDocument = await io.read(path.join(intake, 'converted', `${spec.source}.glb`));
    const clip = retarget(rig, rigOf(clipDocument), readClip(clipDocument, spec.source), spec);
    const animation = document.createAnimation(spec.id);
    const input = document.createAccessor(`${spec.id}.time`).setType('SCALAR').setArray(new Float32Array(clip.times)).setBuffer(buffer);
    const add = (name, targetPath, type, values) => {
      const output = document.createAccessor(`${spec.id}.${name}.${targetPath}`).setType(type).setArray(new Float32Array(values)).setBuffer(buffer);
      const sampler = document.createAnimationSampler().setInterpolation('LINEAR').setInput(input).setOutput(output);
      animation.addSampler(sampler).addChannel(document.createAnimationChannel().setTargetNode(rig.byName.get(name)).setTargetPath(targetPath).setSampler(sampler));
    };
    add(ROOT_BONE, 'translation', 'VEC3', clip.root);
    for (const [name, values] of clip.rotations) add(name, 'rotation', 'VEC4', values);
    reports.push(clip.report);
  }
  document.getRoot().getAsset().copyright = 'Copyright (c) 2020 Microsoft; MIT License';
  document.getRoot().getAsset().generator = 'tools/prepare-playground-hero.mjs';
  await document.transform(prune());
  buffer.setURI('playground-kid.bin');

  const directory = path.join(root, target.directory);
  const { json, resources } = await io.writeJSON(document);
  const files = new Map([[MODEL_NAME, Buffer.from(`${JSON.stringify(json)}\n`)]]);
  for (const [uri, bytes] of Object.entries(resources)) files.set(uri, Buffer.from(bytes));
  for (const [name, bytes] of Object.entries(textures[target.id].extra)) files.set(name, bytes);
  const skin = gltf.listSkins()[0];
  const positions = mesh.listPrimitives().reduce((sum, primitive) => sum + primitive.getAttribute('POSITION').getCount(), 0);
  const triangles = mesh.listPrimitives().reduce((sum, primitive) => sum + primitive.getIndices().getCount() / 3, 0);
  const summary = {
    target: target.id, path: `${target.directory}/${MODEL_NAME}`, textureSize: target.size,
    files: Array.from(files, ([file, bytes]) => ({ file, bytes: bytes.length, sha256: sha256(bytes) })).sort((a, b) => a.file.localeCompare(b.file)),
    joints: skin.listJoints().length, vertices: positions, triangles, materials: gltf.listMaterials().length,
    blendShapes: keep.map(index => names[index]), clips: reports,
    jointNames: skin.listJoints().map(joint => joint.getName()),
  };
  return { directory, files, summary };
}

/** The production test requires every shipped browser asset to be declared with its hash. */
async function updateRuntimeManifest(build) {
  const manifestPath = path.join(root, 'public/assets/manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const base = build.summary.path.replace(/^public\//, '').replace(`/${MODEL_NAME}`, '');
  const files = [];
  for (const name of ['LICENSE-Microsoft-Rocketbox.txt', 'PROVENANCE.json', ...build.summary.files.map(item => item.file)]) {
    const bytes = await fs.readFile(path.join(build.directory, name));
    files.push({ path: `${base}/${name}`, bytes: bytes.length, sha256: sha256(bytes) });
  }
  const entry = {
    id: 'playground-hero',
    version: 'v001',
    status: 'runtime candidate; generic licensed stand-in, owner visual review pending',
    runtimePath: `${base}/${MODEL_NAME}`,
    provenance: 'MIT Microsoft Rocketbox child avatar and clips; processing recorded in PROVENANCE.json. Not a family likeness.',
    license: 'MIT',
    triangles: build.summary.triangles,
    joints: build.summary.joints,
    animationClips: build.summary.clips.map(clip => clip.id),
    files,
  };
  const index = manifest.assets.findIndex(asset => asset.id === entry.id);
  if (index >= 0) manifest.assets[index] = entry; else manifest.assets.push(entry);
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function main() {
  const verify = process.argv.includes('--verify');
  if (verify) {
    for (const target of TARGETS) {
      const directory = path.join(root, target.directory);
      const provenance = JSON.parse(await fs.readFile(path.join(directory, 'PROVENANCE.json'), 'utf8'));
      const output = provenance.outputs.find(item => item.target === target.id);
      if (!output) throw new Error(`${target.id}: no output recorded in PROVENANCE.json`);
      for (const expected of output.files) {
        const bytes = await fs.readFile(path.join(directory, expected.file));
        if (bytes.length !== expected.bytes || sha256(bytes) !== expected.sha256) throw new Error(`${target.id}: ${expected.file} does not match PROVENANCE.json`);
      }
      const present = (await fs.readdir(directory)).filter(name => !name.endsWith('.meta') && name !== 'PROVENANCE.json' && !EXTRA_FILES.includes(name)).sort();
      const recorded = output.files.map(item => item.file).sort();
      if (JSON.stringify(present) !== JSON.stringify(recorded)) throw new Error(`${target.id}: folder contents differ from PROVENANCE.json`);
      const license = await fs.readFile(path.join(directory, 'LICENSE-Microsoft-Rocketbox.txt'));
      if (sha256(license) !== provenance.licenseSha256) throw new Error(`${target.id}: licence text changed`);
      console.log(`${target.id}: ${output.files.length} model files match PROVENANCE.json`);
    }
    return;
  }

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const upstreamFiles = [];
  const record = async (relative, upstreamPath) => {
    const bytes = await fs.readFile(path.join(intake, 'upstream', relative));
    upstreamFiles.push({ file: relative, upstreamPath, bytes: bytes.length, sha256: sha256(bytes) });
    return bytes;
  };
  await record(`${AVATAR}.fbx`, `Assets/Avatars/Children/Male_Child_01/Export/${AVATAR}.fbx`);
  for (const spec of CLIPS) await record(`${spec.source}.max.fbx`, `Assets/Animations/${spec.folder}/${spec.source}.max.fbx`);

  const textures = Object.fromEntries(TARGETS.map(target => [target.id, { maps: {}, extra: {} }]));
  const specular = {};
  for (const part of ['body', 'head']) {
    const read = async kind => decodeTga(await record(`${TEXTURE_PREFIX}_${part}_${kind}.tga`,
      `Assets/Avatars/Children/Male_Child_01/Textures/${TEXTURE_PREFIX}_${part}_${kind}.tga`), `${part} ${kind}`);
    const color = await read('color'), normal = await read('normal');
    const rough = roughnessFromSpecular(await read('specular'), part);
    specular[part] = round(rough.meanSpecular, 4);
    for (const target of TARGETS) {
      textures[target.id].maps[`${part}_color`] = await encodePng(color, target.size);
      textures[target.id].maps[`${part}_normal`] = await encodePng(normal, target.size);
      textures[target.id].maps[`${part}_roughness`] = await encodePng(rough.image, target.roughnessSize);
      if (target.smoothness) textures[target.id].extra[`playground-kid-${part}-metallic-smoothness.png`] = await encodeRgbaPng(smoothnessFromRoughness(rough.image), target.size);
    }
  }
  const license = await record('LICENSE.md', 'LICENSE.md');
  const converted = [];
  for (const name of [AVATAR, ...CLIPS.map(spec => spec.source)]) {
    const bytes = await fs.readFile(path.join(intake, 'converted', `${name}.glb`));
    converted.push({ file: `${name}.glb`, bytes: bytes.length, sha256: sha256(bytes) });
  }

  const builds = [];
  for (const target of TARGETS) builds.push(await build(target, io, textures));
  const provenance = {
    schemaVersion: 1,
    date: '2026-11-15',
    status: 'IMPLEMENTED; Unity import and owner art review NOT TESTED',
    purpose: "Generic realistic child stand-in for the Luke's Playground hero and the indoor scene.",
    likeness: 'Generic licensed model. No owner photo, family reference, scan, voice or likeness was read, uploaded or used.',
    license: 'MIT',
    copyright: 'Copyright (c) 2020 Microsoft',
    licenseFile: 'LICENSE-Microsoft-Rocketbox.txt',
    licenseSha256: sha256(license),
    upstream: UPSTREAM,
    upstreamCommit: UPSTREAM_COMMIT,
    upstreamFiles,
    conversion: {
      blender: 'Blender 5.0.1 Python module: tools/blender/rocketbox_fbx_to_glb.py (FBX import, glTF export, no edits)',
      script: 'tools/prepare-playground-hero.mjs',
      convertedIntermediates: converted,
      steps: [
        'Convert the avatar and four clip FBX files to GLB with Blender; nothing is remodelled or repainted.',
        `Keep ${KEEP_TARGETS.length} of the upstream facial blend shapes for blinking and expression.`,
        'Decode the upstream TGA textures; derive a non-metallic roughness map from the greyscale specular map.',
        'For Unity, also write URP metallic-smoothness maps (metallic 0, smoothness = 1 - roughness in alpha).',
        'Copy clip rotations onto the child skeleton by exact bone name; the adult face rig is not copied.',
        'Scale hip height by the child/adult leg-length ratio, plant the lowest foot contact, remove forward travel.',
        'Rotate each locomotion loop to start at the left foot forward so walk, run and sprint blend in phase.',
      ],
      meanSpecular: specular,
      roughnessCurves: ROUGHNESS,
    },
    outputs: builds.map(item => item.summary),
  };
  for (const item of builds) {
    await fs.mkdir(item.directory, { recursive: true });
    for (const [name, bytes] of item.files) await fs.writeFile(path.join(item.directory, name), bytes);
    await fs.writeFile(path.join(item.directory, 'LICENSE-Microsoft-Rocketbox.txt'), license);
    await fs.writeFile(path.join(item.directory, 'PROVENANCE.json'), `${JSON.stringify(provenance, null, 2)}\n`);
    const total = Array.from(item.files.values()).reduce((sum, bytes) => sum + bytes.length, 0);
    console.log(`${item.summary.target}: ${item.files.size} files, ${total} bytes, ${item.summary.joints} joints, ${item.summary.triangles} triangles`);
    for (const file of item.summary.files) console.log(`  ${file.file} ${file.bytes}`);
  }
  await updateRuntimeManifest(builds.find(item => item.summary.target === 'browser'));
  for (const clip of builds[0].summary.clips) console.log(JSON.stringify(clip));
  console.log('mean specular', JSON.stringify(specular));
}

await main();
