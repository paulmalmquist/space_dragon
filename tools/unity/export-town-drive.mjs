import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

// Run with Node's native TypeScript stripping, from the repository root:
// node --experimental-strip-types tools/unity/export-town-drive.mjs
//   --source-root <frozen-checkout> --output-root <staging-root> [--verify]
// No Unity Editor, renderer, private videos or source art is loaded by this tool.
const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
const sourceRoot = resolve(option('--source-root') ?? process.cwd());
const outputRoot = resolve(option('--output-root') ?? process.cwd());
const compareRoot = option('--compare-source-root');
const referenceFingerprint = 'ebfd1afb10cbe59c88c0bd0143e5e4a77a15dec5d8f09c5628b38041317286da';
const referenceRevision = '56483d43bc744116dedb5b82dfe89e4f98c62b24';
const expectedFingerprint = option('--expected-fingerprint') ?? referenceFingerprint;
const verify = args.includes('--verify');
// Explicit scene injection later; Resources would bundle this into every lab build.
const outputDirectory = join(outputRoot, 'unity/SpaceDragon/Assets/SpaceDragon/TownDrive/Data');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : join(directory, entry.name)))).flat();
}
async function fingerprint(root) {
  const files = [...await walk(join(root, 'src/game/drive')),
    ...(await readdir(join(root, 'tests'))).filter(name => /^drive.*\.ts$/.test(name)).map(name => join(root, 'tests', name))]
    .map(path => relative(root, path).replaceAll('\\', '/')).sort();
  const aggregate = createHash('sha256'); const sourceHashes = [];
  for (const path of files) {
    const normalized = Buffer.from((await readFile(join(root, path), 'utf8')).replaceAll('\r\n', '\n'));
    aggregate.update(path).update('\0').update(normalized).update('\0');
    sourceHashes.push({ path, sha256: digest(normalized) });
  }
  return { sourceFingerprint: aggregate.digest('hex'), sourceHashes };
}
const source = await fingerprint(sourceRoot);
if (source.sourceFingerprint !== expectedFingerprint) throw new Error(`Source drift: expected ${expectedFingerprint}, observed ${source.sourceFingerprint}`);
if (compareRoot && (await fingerprint(resolve(compareRoot))).sourceFingerprint !== source.sourceFingerprint)
  throw new Error('The comparison working tree differs from the frozen source.');
const moduleAt = name => import(pathToFileURL(join(sourceRoot, `src/game/drive/${name}.ts`)).href);
const routeModule = await moduleAt('route');
const { ROUTE, NEIGHBORHOOD_ROUTE, HOME_EXIT_SIGNAL_S, pointAtDistance, lanePoseAt, nearestRoutePoint, routeLabelAt, recommendedSpeedAt, validateRoute } = routeModule;
const { DEFAULT_DRIVE_CONFIG, DRIVE_STEP } = await moduleAt('config');
const { NEIGHBORHOOD } = await moduleAt('neighborhood');
const { NEIGHBORHOOD_CONTEXT } = await moduleAt('neighborhood-context');
const { DRIVE_JUNCTIONS, JUNCTION_CLOSURES, JUNCTION_OBSTACLES, JUNCTION_SOURCES } = await moduleAt('junctions');
const { TRAFFIC_SIGNALS } = await moduleAt('traffic');
const { createDriveState, resetDrive, stepDrive, updateDriveCheckpoints } = await moduleAt('simulation');
const { interpolateDrivePose } = await moduleAt('presentation');
const { MINIVAN_DIMENSIONS, MINIVAN_DRIVER_EYE } = await moduleAt('minivan-config');
if (validateRoute().length) throw new Error(`Invalid route: ${validateRoute().join(', ')}`);
// Provenance identifies the verified source revision, not whichever later docs
// commit happens to be checked out. Identical source hashes export identical bytes.
const sourceRevision = option('--source-revision') ?? (source.sourceFingerprint === referenceFingerprint ? referenceRevision :
  execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim());
const data = {
  schemaVersion: 1, routeId: ROUTE.id, sourceRevision, ...source,
  sourceFingerprintAlgorithm: 'SHA-256 of sorted relative path + NUL + LF-normalized contents + NUL, all src/game/drive files and tests/drive*.ts',
  units: 'metres, seconds, radians', axes: 'x-east, y-up, z-north; yaw 0 is +z',
  attribution: NEIGHBORHOOD.attribution, attributionUrl: NEIGHBORHOOD.attributionUrl,
  config: DEFAULT_DRIVE_CONFIG, stepSeconds: DRIVE_STEP,
  route: { ...ROUTE, ...NEIGHBORHOOD_ROUTE, homeExitSignalS: HOME_EXIT_SIGNAL_S },
  neighborhood: NEIGHBORHOOD, context: NEIGHBORHOOD_CONTEXT,
  junctions: DRIVE_JUNCTIONS, closures: JUNCTION_CLOSURES, closureObstacles: JUNCTION_OBSTACLES, junctionSources: JUNCTION_SOURCES,
  trafficSignals: TRAFFIC_SIGNALS, minivan: { dimensions: MINIVAN_DIMENSIONS, driverEye: MINIVAN_DRIVER_EYE },
  scope: 'Data and driving core migration only. Scene, traffic/pedestrian simulation, art, input adapters and save migration are not implemented by this export.',
};

const initialAt = (s, assist = false, overrides = {}) => ({ ...createDriveState(assist), ...lanePoseAt(s), routeS: lanePoseAt(s).s, ...overrides });
const forward = { throttle: 1, brake: 0, steer: 0, handbrake: false };
const coast = { throttle: 0, brake: 0, steer: 0, handbrake: false };
const scenarios = [];
function scenario(name, initial, steps, obstacles = []) {
  let state = structuredClone(initial);
  for (const { input, ticks } of steps) for (let i = 0; i < ticks; i++) state = stepDrive(state, input, DEFAULT_DRIVE_CONFIG, obstacles);
  scenarios.push({ name, initial, steps, obstacles, expected: state });
}
const cruiseS = ROUTE.sections[1].startS + 100;
scenario('home-first-tick-retains-outbound-branch', createDriveState(), [{ input: forward, ticks: 1 }]);
scenario('accelerate-straight', initialAt(cruiseS), [{ input: forward, ticks: 450 }]);
scenario('accelerate-steer-coast-pause', initialAt(cruiseS), [
  { input: forward, ticks: 60 }, { input: { ...forward, steer: .4 }, ticks: 30 },
  { input: coast, ticks: 50 }, { input: { ...forward, paused: true }, ticks: 90 },
]);
scenario('assist-cap', initialAt(cruiseS, true), [{ input: forward, ticks: 450 }]);
scenario('braking', initialAt(cruiseS, false, { speed: 25, velocityX: -25 }), [{ input: { ...coast, brake: 1 }, ticks: 150 }]);
scenario('reverse-cap', initialAt(cruiseS), [{ input: { ...coast, brake: 1 }, ticks: 200 }]);
scenario('handbrake-turn', initialAt(cruiseS, false, { speed: 16, velocityX: -16 }), [{ input: { ...coast, steer: -.5, handbrake: true }, ticks: 70 }]);
const center = pointAtDistance(cruiseS), half = ROUTE.sections[1].lanes * ROUTE.sections[1].laneWidth + ROUTE.sections[1].medianWidth / 2;
scenario('offroad-speed-cap', initialAt(cruiseS, false, { x: center.x + Math.cos(center.yaw) * (half + 5), z: center.z - Math.sin(center.yaw) * (half + 5), speed: 25 }), [{ input: forward, ticks: 60 }]);
scenario('soft-corridor-recovery', initialAt(cruiseS, false, { x: center.x + Math.cos(center.yaw) * (half + 30), z: center.z - Math.sin(center.yaw) * (half + 30), yaw: center.yaw + Math.PI / 2 }), [{ input: forward, ticks: 180 }]);
scenario('raised-median-contact', initialAt(cruiseS, false, { x: center.x, z: center.z, speed: 4, velocityX: -4 }), [{ input: forward, ticks: 10 }]);
for (const closure of [JUNCTION_CLOSURES[0], JUNCTION_CLOSURES.at(-1)]) {
  const position = { x: closure.x - Math.sin(closure.yaw) * 5, z: closure.z - Math.cos(closure.yaw) * 5 };
  const s = nearestRoutePoint(position.x, position.z).s;
  scenario(`closure-${closure.junctionId}`, initialAt(s, false, { ...position, yaw: closure.yaw, speed: 4, velocityX: Math.sin(closure.yaw) * 4, velocityZ: Math.cos(closure.yaw) * 4 }), [{ input: forward, ticks: 90 }], JUNCTION_OBSTACLES);
}
scenario('pause-identity', initialAt(cruiseS, true, { speed: 12, elapsedSeconds: 45 }), [{ input: { ...forward, paused: true }, ticks: 100 }]);

const queryDistances = [-ROUTE.length * 3 - 2, -1, 0, .001, 8, 80, 240, ROUTE.length - .001, ROUTE.length, ROUTE.length * 4 + 2,
  ...ROUTE.sections.flatMap(section => [section.startS - .001, section.startS, section.startS + .001, section.endS - .001]),
  ...ROUTE.turns.flatMap(turn => [turn.approachS, turn.s, turn.exitS]),
];
for (let s = 0; s < ROUTE.length; s += 37) queryDistances.push(s);
const routeQueries = queryDistances.map(s => ({ s, point: pointAtDistance(s), lane: lanePoseAt(s), label: routeLabelAt(s), speed: recommendedSpeedAt(s) }));
const nearestQueries = [];
for (let s = 0; s < ROUTE.length; s += 67) {
  const p = lanePoseAt(s);
  for (const offset of [-4, 0, 4]) {
    const x = p.x + Math.cos(p.yaw) * offset, z = p.z - Math.sin(p.yaw) * offset;
    nearestQueries.push({ x, z, hasPreferredS: true, preferredS: s, expected: nearestRoutePoint(x, z, s) });
  }
}
for (const s of [10, NEIGHBORHOOD_ROUTE.bulbStartS - 10, ROUTE.length - 2]) {
  const p = lanePoseAt(s);
  for (const preferredS of [undefined, 10, NEIGHBORHOOD_ROUTE.bulbStartS - 10, ROUTE.length - 2])
    nearestQueries.push({ x: p.x, z: p.z, hasPreferredS: preferredS !== undefined, preferredS: preferredS ?? 0, expected: nearestRoutePoint(p.x, p.z, preferredS) });
}
const checkpoints = [];
let progress = createDriveState();
function checkpoint(name, previous, next) { const expected = updateDriveCheckpoints(previous, next); checkpoints.push({ name, previous, next, expected }); return expected; }
for (let i = 1; i < ROUTE.checkpoints.length; i++) {
  const gate = ROUTE.checkpoints[i], previous = { ...progress, routeS: gate.s - .2 }, next = { ...progress, ...gate, routeS: gate.s + .2, speed: 10 };
  progress = checkpoint(`ordered-${gate.id}`, previous, next);
  checkpoint(`duplicate-${gate.id}`, previous, progress);
}
const first = ROUTE.checkpoints[1], skipped = ROUTE.checkpoints[2];
checkpoint('backward-rejected', { ...createDriveState(), routeS: first.s + .2 }, { ...createDriveState(), ...first, routeS: first.s - .2 });
checkpoint('skipped-rejected', { ...createDriveState(), routeS: skipped.s - .2 }, { ...createDriveState(), ...skipped, routeS: skipped.s + .2 });
checkpoint('wrong-heading-rejected', { ...createDriveState(), routeS: first.s - .2 }, { ...createDriveState(), ...first, routeS: first.s + .2, yaw: first.yaw + Math.PI });
const completed = checkpoint('home-completion', { ...progress, routeS: ROUTE.length - 1 }, { ...progress, routeS: 1, speed: 5 });
checkpoint('completion-idempotent', completed, completed);
const resets = [progress, completed, { ...initialAt(cruiseS, true), checkpointId: 'unknown' }]
  .map((state, index) => ({ name: `reset-${index}`, state, expected: resetDrive(state) }));
const previous = { ...createDriveState(), x: 2, z: 3, yaw: Math.PI - .02, speed: 10, elapsedSeconds: 10 };
const current = { ...previous, x: 2.2, z: 3.1, yaw: -Math.PI + .02, speed: 10.2, elapsedSeconds: 10 + DRIVE_STEP };
const presentations = [];
function presentation(name, a, b, alpha, paused = false, snap = false) {
  presentations.push({ name, previous: a, current: b, alpha, paused, snap, expected: interpolateDrivePose(a, b, alpha, { paused, snap }) });
}
for (const alpha of [-1, 0, .25, .5, 1, 2]) presentation(`short-angle-${alpha}`, previous, current, alpha);
presentation('paused-snap', previous, current, .5, true);
presentation('explicit-snap', previous, current, .5, false, true);
presentation('teleport-snap', previous, { ...current, x: 1000 }, .5);
presentation('clock-rewind-snap', previous, { ...current, elapsedSeconds: 5 }, .5);
presentation('long-clock-gap-snap', previous, { ...current, elapsedSeconds: 15 }, .5);
// TS test setup spreads lane/checkpoint samples into state. Those convenience
// objects carry extra s/id/label fields that are not the DriveState contract.
// Export only authoritative state fields so native adapters compare the same DTO.
const stateFields = ['x', 'z', 'yaw', 'speed', 'velocityX', 'velocityZ', 'routeS', 'checkpointId',
  'visited', 'completed', 'assist', 'stuckSeconds', 'bonkSeconds', 'elapsedSeconds'];
const canonicalState = state => Object.fromEntries(stateFields.map(key => [key, key === 'visited' ? [...state.visited] : state[key]]));
const fixtures = { schemaVersion: 1, sourceFingerprint: source.sourceFingerprint, tolerance: 1e-7,
  routeQueries, nearestQueries,
  scenarios: scenarios.map(item => ({ ...item, initial: canonicalState(item.initial), expected: canonicalState(item.expected) })),
  checkpoints: checkpoints.map(item => ({ ...item, previous: canonicalState(item.previous), next: canonicalState(item.next), expected: canonicalState(item.expected) })),
  resets: resets.map(item => ({ ...item, state: canonicalState(item.state), expected: canonicalState(item.expected) })),
  presentations: presentations.map(item => ({ ...item, previous: canonicalState(item.previous), current: canonicalState(item.current) })),
};
if ((await fingerprint(sourceRoot)).sourceFingerprint !== source.sourceFingerprint) throw new Error('Source changed during export. Nothing was written.');
const outputs = [[join(outputDirectory, 'town-drive-v001.json'), data],
  [join(outputRoot, 'unity/SpaceDragon/Assets/SpaceDragon/TownDrive/Tests/EditMode/Fixtures/town-drive-fixtures-v001.json'), fixtures]];
const reports = [];
for (const [path, value] of outputs) {
  const bytes = JSON.stringify(value, null, 2) + '\n';
  if (verify) { if (await readFile(path, 'utf8') !== bytes) throw new Error(`Export is stale: ${path}`); }
  else { await mkdir(dirname(path), { recursive: true }); await writeFile(path, bytes, 'utf8'); }
  reports.push({ file: relative(outputRoot, path).replaceAll('\\', '/'), bytes: Buffer.byteLength(bytes), sha256: digest(bytes) });
}
console.log(JSON.stringify({ verified: verify, sourceFingerprint: source.sourceFingerprint, sourceFiles: source.sourceHashes.length,
  routeSamples: ROUTE.samples.length, routeLength: ROUTE.length, checkpoints: ROUTE.checkpoints.length, closures: JUNCTION_CLOSURES.length,
  fixtureCounts: { routeQueries: routeQueries.length, nearestQueries: nearestQueries.length, scenarios: scenarios.length, checkpoints: checkpoints.length, resets: resets.length, presentations: presentations.length }, outputs: reports }, null, 2));
