/** Local-only LaunchLab source intake and shared Blender/Unity choreography. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const target = 'unity/SpaceDragon/Assets/SpaceDragon/LaunchLab';
const source = 'public/assets/dogfight/models/dragon-flight-v003.glb';
const expectedHash = '1446d3c3c9606a61ad8d871473ce5b1242107c0a6d52b59c795102adb74f853c';
const cueSource = 'public/assets/audio/sonniss-gdc-2026/jet-surge-v001.wav';
const cueHash = '3cbeb13f87b9b55dae46a2da6991dbe23a11dfc12c2c01e859f48b0b6ec05ec8';
const hash = value => createHash('sha256').update(value).digest('hex');
const xyz = v => ({ x: v[0], y: v[1], z: v[2] });
const clean = value => Math.round(value * 1e8) / 1e8;
const floorOffset = .665026843547821;
const keys = [
  { t: 0, p: [0, floorOffset, 0], v: [0, 0, 0], pitch: 0, camera: [11, 3, 12], fov: 45 },
  { t: 2, p: [0, floorOffset, 0], v: [0, 0, 0], pitch: 0, camera: [12, 4, 10], fov: 45 },
  { t: 3, p: [0, 3, 2], v: [0, 6, 7], pitch: -18, camera: [12, 4, 8], fov: 47 },
  { t: 5, p: [0, 35, 36], v: [0, 24, 32], pitch: -30, camera: [-16, 5, 1], fov: 50 },
  { t: 10, p: [0, 135, 215], v: [0, 14, 42], pitch: -18, camera: [9, 5, -18], fov: 52 },
  { t: 12, p: [0, 155, 290], v: [0, 35 * Math.sin(Math.PI / 18), 35 * Math.cos(Math.PI / 18)], pitch: -10, camera: [0, 5, -18], fov: 52 },
];
function sample(time) {
  const index = Math.min(keys.length - 2, Math.max(0, keys.findIndex((key, i) => i < keys.length - 1 && time <= keys[i + 1].t)));
  const a = keys[index], b = keys[index + 1], duration = b.t - a.t;
  const t = Math.min(1, Math.max(0, (time - a.t) / duration)), t2 = t * t, t3 = t2 * t;
  const h = [2 * t3 - 3 * t2 + 1, t3 - 2 * t2 + t, -2 * t3 + 3 * t2, t3 - t2];
  const dh = [(6 * t2 - 6 * t) / duration, 3 * t2 - 4 * t + 1, (-6 * t2 + 6 * t) / duration, 3 * t2 - 2 * t];
  const smooth = 3 * t2 - 2 * t3;
  const p = a.p.map((v, i) => clean(h[0] * v + h[1] * duration * a.v[i] + h[2] * b.p[i] + h[3] * duration * b.v[i]));
  const v = a.p.map((value, i) => clean(dh[0] * value + dh[1] * a.v[i] + dh[2] * b.p[i] + dh[3] * b.v[i]));
  const pitch = (a.pitch + (b.pitch - a.pitch) * smooth) * Math.PI / 180;
  const offset = a.camera.map((value, i) => value + (b.camera[i] - value) * smooth);
  return { time: clean(time), position: xyz(p), rotation: { x: clean(Math.sin(pitch / 2)), y: 0, z: 0, w: clean(Math.cos(pitch / 2)) },
    velocity: xyz(v), cameraPosition: xyz(p.map((value, i) => clean(value + offset[i]))),
    cameraTarget: xyz([p[0], clean(p[1] + 1.6), clean(p[2] + 1.5)]), cameraFov: clean(a.fov + (b.fov - a.fov) * smooth),
    animationPhase: clean(time % 1) };
}
const contract = {
  schemaVersion: 1, id: 'SD-073-launch-v001', duration: 12, frameRate: 30, videoStart: 3, videoEnd: 10,
  coordinates: 'Unity metres; +Y up, gameplay +Z forward; quaternions x/y/z/w. Camera FOV is vertical degrees; image aspect 16/9.',
  interpolation: 'Author root translation is cubic Hermite with explicit velocity tangents. Camera offsets, pitch and FOV use smoothstep between keys. Dense 30fps frames are authoritative: interpolate positions/FOV linearly and rotations with shortest-path slerp. Unity Timeline transform curves use linear frame tangents and normalized quaternion interpolation.',
  sourceModel: { path: source, sha256: expectedHash, scale: { x: 1, y: 1, z: 1 },
    visualEuler: { x: 0, y: 180, z: 0 }, collisionRadius: 3.3, groundSocketY: -floorOffset,
    blenderMapping: 'Using ORIGINAL Blender source: world position (u.x,u.z,u.y), quaternion xyzw (-u.qx,-u.qz,-u.qy,u.qw). Camera position and target use the same Y/Z swap; camera local -Z points at target and local +Y is up. glTFast already mirrors source X; do not mirror nodes again.' },
  animation: { clip: 'Flight', start: 0, end: 12, sourceDuration: 1, phase: 'time modulo 1 second', rootMotion: false,
    note: 'Existing seven wing/tail quaternion channels only; no authored takeoff clip. Animation owns bones, trajectory owns gameplay root.' },
  handoff: { time: 12, speed: 35, note: 'Capture pose, velocity, lens and camera before stopping Timeline; restore captured values before transferring control. Replay from flight restores its captured pre-replay state.' },
  keyframes: keys.map(key => sample(key.t)),
  frames: Array.from({ length: 361 }, (_, index) => sample(index / 30)),
};
const output = new Map([
  ['Imported/dragon-flight-v003.glb', await readFile(path.join(root, source))],
  ['Imported/jet-surge-v001.wav', await readFile(path.join(root, cueSource))],
  ['launch-choreography-v001.json', Buffer.from(JSON.stringify(contract, null, 2) + '\n')],
]);
if (hash(output.get('Imported/dragon-flight-v003.glb')) !== expectedHash) throw new Error('Dragon source differs from the inspected v003 contract; review it before changing the intake pin.');
if (hash(output.get('Imported/jet-surge-v001.wav')) !== cueHash) throw new Error('Existing approved runtime launch cue differs from its provenance hash.');
const receipt = { schemaVersion: 1, scope: 'SD-073 local LaunchLab; existing original dragon only; no family likeness, source photos or new external assets.',
  source, sourceSha256: expectedHash,
  audio: { source: cueSource, sha256: cueHash, publisher: '344 Audio / Air Designed', license: 'Existing Sonniss GDC 2026 licensed game cue; not an original score.',
    provenance: 'assets/source/audio/sonniss-gdc-2026/game-cues.json', duration: .7, format: 'mono 24kHz PCM16 WAV' },
  files: [...output].map(([destination, bytes]) => ({ destination, bytes: bytes.length, sha256: hash(bytes) })) };
output.set('asset-receipt.json', Buffer.from(JSON.stringify(receipt, null, 2) + '\n'));
for (const [relative, bytes] of output) {
  const destination = path.join(root, target, relative);
  if (process.argv.includes('--verify')) {
    if (!(await readFile(destination)).equals(bytes)) throw new Error(`Launch intake differs: ${relative}`);
  } else {
    await mkdir(path.dirname(destination), { recursive: true });
    // This receipt is derived from the pinned inputs, never a source/art asset.
    if (relative === 'asset-receipt.json') { await writeFile(destination, bytes); continue; }
    try { if (!(await readFile(destination)).equals(bytes)) throw new Error(`Refusing to overwrite different launch intake: ${relative}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; await writeFile(destination, bytes); }
  }
}
console.log(`${process.argv.includes('--verify') ? 'Verified' : 'Prepared'} original dragon and shared 12s/361-frame launch choreography; video insert 3–10s.`);
