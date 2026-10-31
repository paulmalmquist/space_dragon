import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RADAR_RANGE, projectRadarContact, radarContacts } from '../src/prototypes/dogfight/systems/radar.js';

const player = (position = new THREE.Vector3(), orientation = new THREE.Quaternion()) => ({ position, orientation });
const bogey = (id, x, y, z, dead = false) => ({ id, name: `WRAITH ${id + 1}`, position: new THREE.Vector3(x, y, z), dead, health: 216 });
const near = (actual, expected, epsilon = 1e-9) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);

test('radar places forward, right, behind and left relative to the dragon', () => {
  const flight = player();
  for (const [position, expected] of [
    [[0, 0, -600], [0, -.75]], [[600, 0, 0], [.75, 0]],
    [[0, 0, 600], [0, .75]], [[-600, 0, 0], [-.75, 0]],
  ]) {
    const contact = projectRadarContact(flight, bogey(0, ...position));
    near(contact.x, expected[0]); near(contact.y, expected[1]);
    near(contact.distance, 600); assert.equal(contact.elevation, 0); assert.equal(contact.outOfRange, false);
  }
});

test('turning and pitching keep the scope head-up instead of world- or camera-relative', () => {
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(.7, 1.4, .1, 'YXZ'));
  const flight = player(new THREE.Vector3(100, -40, 70), quaternion);
  const world = new THREE.Vector3(300, 150, -600).applyQuaternion(quaternion).add(flight.position);
  const contact = projectRadarContact(flight, { id: 5, position: world });
  near(contact.x, .375); near(contact.y, -.75); near(contact.altitudeMeters, 150); assert.equal(contact.elevation, 1);
  flight.rollAngle = Math.PI; flight.bank = 1; flight.camera = { position: new THREE.Vector3(999, 10, 5) };
  assert.deepEqual(projectRadarContact(flight, { id: 5, position: world }), contact);
  flight.orientation.identity();
  const afterTurn = projectRadarContact(flight, { id: 5, position: world });
  assert.ok(Math.hypot(contact.x - afterTurn.x, contact.y - afterTurn.y) > .25);
});

test('altitude signs distinguish above, below and level including vertical contacts', () => {
  const flight = player();
  const above = projectRadarContact(flight, bogey(0, 0, 200, 0));
  const below = projectRadarContact(flight, bogey(1, 0, -100, 0));
  assert.equal(above.elevation, 1); assert.equal(below.elevation, -1);
  near(above.x, 0); near(above.y, 0); assert.equal(above.hasBearing, false);
  assert.equal(projectRadarContact(flight, bogey(2, 10, 4, -100)).elevation, 0);
  const high = projectRadarContact(flight, bogey(3, 0, 2000, 0));
  assert.equal(high.outOfRange, true); assert.equal(high.elevation, 1);
  near(high.x, 0); near(high.y, 0); assert.equal(high.hasBearing, false);
});

test('beyond-range contacts pin to the rim without pretending to be nearby', () => {
  const flight = player();
  const diagonal = projectRadarContact(flight, bogey(0, 900, 0, -900));
  assert.equal(diagonal.outOfRange, true); near(Math.hypot(diagonal.x, diagonal.y), 1);
  near(diagonal.bearing, Math.PI / 4); assert.ok(diagonal.distance > RADAR_RANGE);
  const high = projectRadarContact(flight, bogey(1, 20, 1500, 0));
  assert.equal(high.outOfRange, true); near(high.x, 1); near(high.y, 0);
  const rim = projectRadarContact(flight, bogey(2, 0, 0, -RADAR_RANGE));
  assert.equal(rim.outOfRange, false); near(rim.y, -1);
});

test('coincident and invalid inputs cannot emit NaN coordinates', () => {
  const coincident = projectRadarContact(player(), bogey(0, 0, 0, 0));
  for (const key of ['x', 'y', 'distance', 'bearing', 'altitudeMeters']) assert.equal(Number.isFinite(coincident[key]), true);
  near(coincident.distance, 0); assert.equal(coincident.hasBearing, false);
  assert.equal(projectRadarContact(player(), bogey(0, NaN, 0, -10)), null);
  assert.equal(projectRadarContact(player(), bogey(0, Infinity, 0, -10)), null);
  assert.equal(projectRadarContact(player(undefined, new THREE.Quaternion(0, 0, 0, 0)), bogey(0, 0, 0, -10)), null);
  for (const range of [0, -1, NaN, Infinity]) assert.throws(() => projectRadarContact(player(), bogey(0, 0, 0, -10), range), RangeError);
});

test('radar omits disabled bogeys and distinguishes player lock from hostile aim', () => {
  const drones = [bogey(0, 20, 10, -100), bogey(1, -100, -30, 200), bogey(2, 0, 0, -300, true)];
  const options = { lockedIds: [0], threats: [{ id: 1, locked: true, firing: true }] };
  const contacts = radarContacts(player(), drones, options);
  assert.deepEqual(contacts.map(contact => contact.id), [0, 1]);
  assert.equal(contacts[0].locked, true); assert.equal(contacts[0].hostileLocked, false); assert.equal(contacts[0].firing, false);
  assert.equal(contacts[1].locked, false); assert.equal(contacts[1].hostileLocked, true); assert.equal(contacts[1].firing, true);
  drones[0].dead = true; assert.deepEqual(radarContacts(player(), drones, options).map(contact => contact.id), [1]);
  drones.forEach(drone => { drone.dead = false; });
  assert.equal(radarContacts(player(), drones).length, 3);
  assert.deepEqual(radarContacts(player(), []), []);
});

test('projection and returned snapshots never mutate flight, targets or targeting state', () => {
  const flight = player(new THREE.Vector3(5, 3, -8), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), .5));
  const drones = [bogey(0, 10, 50, -100)];
  const lockedIds = [0], threats = [{ id: 0, locked: true, firing: false }];
  const before = JSON.stringify({ flight, drones, lockedIds, threats });
  const first = radarContacts(flight, drones, { lockedIds, threats });
  first[0].x = 123; first[0].locked = false; first.push({ id: 99 });
  const next = radarContacts(flight, drones, { lockedIds, threats });
  assert.equal(JSON.stringify({ flight, drones, lockedIds, threats }), before);
  assert.equal(next.length, 1); assert.equal(next[0].locked, true); assert.ok(Math.abs(next[0].x) <= 1);
});
