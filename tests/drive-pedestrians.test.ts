import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPedestrianPopulation, pedestrianPosesAt, PEDESTRIAN_BODY_RADIUS, PEDESTRIAN_TURN_RADIUS } from '../src/game/drive/pedestrians.ts';
import { nearestRoutePoint, ROUTE, SAFE_PEDESTRIAN_SPANS } from '../src/game/drive/route.ts';

test('anonymous pedestrian population is deterministic, bounded and distributed on both sides of every section', () => {
  const people = createPedestrianPopulation();
  assert.deepEqual(people, createPedestrianPopulation());
  assert.equal(people.length, 40);
  assert.equal(new Set(people.map(p => p.id)).size, 40);
  for (let i = 0; i < ROUTE.sections.length; i++) for (const side of [1, -1]) {
    assert.ok(people.some(p => p.sectionIndex === i && p.side === side));
  }
  assert.equal(createPedestrianPopulation(12).length, 12);
  assert.equal(createPedestrianPopulation(-1).length, 0);
  assert.equal(createPedestrianPopulation(900).length, 40);
  assert.equal(createPedestrianPopulation(NaN).length, 40);
});

test('walks remain inside actual sidewalks, outside roads and away from junctions for an entire patrol', () => {
  const people = createPedestrianPopulation();
  for (let time = 0; time <= 170; time += .5) {
    for (const pose of pedestrianPosesAt(time, people)) {
      const road = nearestRoutePoint(pose.x, pose.z);
      const section = ROUTE.sections[pose.sectionIndex];
      const roadHalf = section.lanes * section.laneWidth + section.medianWidth / 2;
      const sidewalkCenter = roadHalf + 3.2 + section.sidewalkWidth / 2;
      assert.equal(road.sectionIndex, pose.sectionIndex);
      assert.equal(Math.sign(road.signedOffset), pose.side);
      assert.ok(Math.abs(Math.abs(road.signedOffset) - sidewalkCenter) + PEDESTRIAN_BODY_RADIUS < section.sidewalkWidth / 2);
      assert.ok(Math.abs(road.signedOffset) - PEDESTRIAN_BODY_RADIUS > roadHalf);
      assert.ok(SAFE_PEDESTRIAN_SPANS.some(span => span.sectionIndex === pose.sectionIndex && pose.s >= span.fromS && pose.s <= span.toS));
      assert.ok(ROUTE.turns.every(turn => Math.abs(turn.s - pose.s) > 20));
      assert.ok(Number.isFinite(pose.x + pose.z + pose.yaw));
    }
  }
});

test('absolute simulation time reproduces positions and gait after pause, reload and skipped render frames', () => {
  const population = createPedestrianPopulation();
  const before = JSON.stringify(population);
  const paused = pedestrianPosesAt(81.25, population);
  assert.deepEqual(paused, pedestrianPosesAt(81.25, population));
  pedestrianPosesAt(90, population);
  assert.deepEqual(paused, pedestrianPosesAt(81.25, createPedestrianPopulation()));
  assert.notDeepEqual(paused, pedestrianPosesAt(82.25, population));
  assert.equal(JSON.stringify(population), before);
  assert.deepEqual(pedestrianPosesAt(-1), pedestrianPosesAt(0));
  assert.deepEqual(pedestrianPosesAt(NaN), pedestrianPosesAt(0));
  assert.deepEqual(pedestrianPosesAt(Infinity), pedestrianPosesAt(0));
});

test('rounded endpoint turns and phase wraps keep feet moving forward without teleports or yaw jumps', () => {
  for (const person of createPedestrianPopulation()) {
    const length = person.endS - person.startS;
    const arc = Math.PI * PEDESTRIAN_TURN_RADIUS;
    const circumference = 2 * length + 2 * arc;
    for (const distance of [0, length, length + arc, 2 * length + arc, circumference]) {
      const time = (circumference + distance - person.phaseDistance) / person.speed;
      const a = pedestrianPosesAt(time - .0001, [person])[0];
      const b = pedestrianPosesAt(time + .0001, [person])[0];
      const travelled = Math.hypot(b.x - a.x, b.z - a.z);
      assert.ok(travelled > person.speed * .00019 && travelled < person.speed * .00021);
      const yawDelta = Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw));
      assert.ok(Math.abs(yawDelta) < .002);
      const forward = (b.x - a.x) * Math.sin(a.yaw) + (b.z - a.z) * Math.cos(a.yaw);
      assert.ok(forward > travelled * .999);
      assert.ok(b.walkPhase >= 0 && b.walkPhase < 1);
    }
  }
});
