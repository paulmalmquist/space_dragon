using System;
using System.Collections.Generic;

namespace SpaceDragon.Traversal
{
    /// <summary>
    /// Luke's Arena rules: robots with sparks and telegraphed moves, Tether Snare, Spider Pounce,
    /// suit energy, and stealth by sight cones, cover and height. Pure and fixed-step, like the
    /// hero it wraps: no scene, storage or clock. Nobody is hurt and nothing can be lost: robots
    /// power down, Luke gets bonked or held for a moment, and every reward is kept.
    /// A line-for-line port of src/game/arena/arena.ts, checked against recorded runs.
    /// </summary>
    public static class ArenaSimulation
    {
        private static double Wrap(double angle) => Math.Atan2(Math.Sin(angle), Math.Cos(angle));
        private static double Clamp(double value, double low, double high) => TraversalGeometry.Clamp(value, low, high);

        public static ArenaProgress EmptyProgress() => new ArenaProgress();

        private static RobotState FreshRobot(ArenaLayout layout, RobotSpec spec)
        {
            var profile = layout.Profile(spec.kind);
            return new RobotState
            {
                id = spec.id, kind = spec.kind, x = spec.x, y = profile.hover, z = spec.z, yaw = spec.yaw, sparks = profile.sparks,
                mode = spec.wave > 0 ? RobotMode.Dormant : RobotMode.Patrol, lastSeenX = spec.x, lastSeenZ = spec.z, sweepDir = 1, strikeZ = 1,
            };
        }

        public static ArenaState Create(ArenaLayout layout, ArenaProgress progress = null)
        {
            var robots = new RobotState[layout.robots.Length];
            for (int index = 0; index < robots.Length; index++) robots[index] = FreshRobot(layout, layout.robots[index]);
            return new ArenaState
            {
                hero = HeroSimulation.Create(layout.world, layout.world.spawn.x, layout.world.spawn.z, layout.world.spawn.yaw),
                robots = robots, energy = layout.rules.energyMax, hideId = layout.hides.Length > 0 ? layout.hides[0].id : "",
                progress = progress == null ? new ArenaProgress() : progress.Clone(),
            };
        }

        private static ArenaZone ZoneOfTrial(ArenaLayout layout, TrialId trial)
        {
            foreach (var zone in layout.zones) if (zone.id == trial) return zone;
            return null;
        }

        public static TrialId TrialAt(ArenaLayout layout, double x, double z)
        {
            foreach (var zone in layout.zones) if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ) return zone.id;
            return TrialId.None;
        }

        /// <summary>True when nothing solid lies on the straight line between two points.</summary>
        public static bool SightLine(TraversalWorld world, double x, double y, double z, double toX, double toY, double toZ)
        {
            double dx = toX - x, dy = toY - y, dz = toZ - z;
            int samples = Math.Max(2, (int)Math.Ceiling(Math.Sqrt(dx * dx + dy * dy + dz * dz) / 0.4));
            for (int index = 1; index < samples; index++)
            {
                double t = (double)index / samples;
                foreach (var solid in world.solids) if (!solid.IsTrunk && TraversalGeometry.PointInSolid(solid, x + dx * t, y + dy * t, z + dz * t)) return false;
            }
            return true;
        }

        /// <summary>
        /// Stealth in one rule: a robot sees Luke when he is inside its range and cone, not above
        /// its line of sight, and no cover stands between them. Drones sense all round.
        /// </summary>
        public static bool CanSee(ArenaLayout layout, RobotState robot, HeroState hero)
        {
            var profile = layout.Profile(robot.kind);
            var rules = layout.rules;
            double dx = hero.x - robot.x, dz = hero.z - robot.z;
            double flat = Math.Sqrt(dx * dx + dz * dz);
            if (flat > profile.sight) return false;
            if (robot.kind != RobotKind.Drone)
            {
                if (hero.y - robot.y > rules.sightAbove) return false;
                // Close enough to bump into: noticed whichever way it faces.
                bool felt = flat < rules.feel;
                if (!felt && flat > 1e-6 && (dx * Math.Sin(robot.yaw) + dz * Math.Cos(robot.yaw)) / flat < Math.Cos(profile.cone)) return false;
            }
            return SightLine(layout.world, robot.x, robot.y + profile.eye, robot.z, hero.x, hero.y + rules.heroCentre, hero.z);
        }

        /// <summary>A robot that a pounce finishes in the open: held still, or recovering from its own attack.</summary>
        public static bool IsVulnerable(RobotState robot) => robot.hold > 0 || robot.mode == RobotMode.Recover;

        /// <summary>
        /// The stealth opening: the robot has not noticed Luke and cannot see him at this moment, so he
        /// is behind it, above it or coming out of cover. A pounce now is a quiet takedown.
        /// </summary>
        public static bool QuietOpening(ArenaLayout layout, RobotState robot, HeroState hero) =>
            robot.hold <= 0 && robot.awareness < layout.rules.unaware && !CanSee(layout, robot, hero);

        /// <summary>The robot an action would aim at: near, roughly ahead, in sight, with a bias toward easy finishes.</summary>
        public static string PickTarget(ArenaLayout layout, ArenaState state, double aimX = 0, double aimZ = 0)
        {
            var hero = state.hero;
            var rules = layout.rules;
            double dirX = aimX, dirZ = aimZ;
            double aim = Math.Sqrt(dirX * dirX + dirZ * dirZ);
            if (aim > 1e-6) { dirX /= aim; dirZ /= aim; } else { dirX = Math.Sin(hero.yaw); dirZ = Math.Cos(hero.yaw); }
            string best = "";
            double bestScore = double.NegativeInfinity;
            for (int index = 0; index < state.robots.Length; index++)
            {
                var robot = state.robots[index];
                // Only the robots of the trial Luke is standing in are part of the game.
                if (!robot.InPlay || layout.robots[index].trial != state.trial) continue;
                var profile = layout.Profile(robot.kind);
                double dx = robot.x - hero.x, dz = robot.z - hero.z, dy = robot.y + profile.height * 0.5 - (hero.y + rules.heroCentre);
                double flat = Math.Sqrt(dx * dx + dz * dz);
                double distance = Math.Sqrt(flat * flat + dy * dy);
                if (distance > rules.pounceRange) continue;
                double align = flat > 1e-6 ? (dx * dirX + dz * dirZ) / flat : 1;
                if (align < -0.25 && distance > 3) continue;
                if (!SightLine(layout.world, hero.x, hero.y + rules.heroCentre, hero.z, robot.x, robot.y + profile.height * 0.5, robot.z)) continue;
                double score = -distance - (1 - align) * 3 + (IsVulnerable(robot) || QuietOpening(layout, robot, hero) ? 1.5 : 0);
                if (score > bestScore) { bestScore = score; best = robot.id; }
            }
            return best;
        }

        /// <summary>What the one-button action would do to a robot right now. The rules and the on-screen hint both ask here.</summary>
        public static ActionKind ActionFor(ArenaLayout layout, ArenaState state, RobotState robot)
        {
            if (robot == null || state.bonk > 0 || state.held > 0 || state.pounceId.Length > 0 || state.hero.mode == HeroMode.Catch) return ActionKind.None;
            var hero = state.hero;
            var rules = layout.rules;
            double dx = robot.x - hero.x, dy = robot.y - hero.y, dz = robot.z - hero.z;
            bool canPounce = state.pounceCooldown <= 0;
            bool canSnare = state.snareCooldown <= 0 && robot.hold <= 0 && Math.Sqrt(dx * dx + dy * dy + dz * dz) <= rules.snareRange;
            if (canPounce && QuietOpening(layout, robot, hero)) return ActionKind.Quiet;
            if (canPounce && IsVulnerable(robot)) return ActionKind.Pounce;
            return canSnare ? ActionKind.Snare : canPounce ? ActionKind.Pounce : ActionKind.None;
        }

        private static void Resolve(ArenaState state, RobotState robot, bool quiet)
        {
            robot.sparks = 0; robot.mode = RobotMode.Resolved; robot.hold = 0; robot.tethered = false; robot.awareness = 0;
            state.events |= ArenaEvent.Resolve;
            if (quiet) { state.progress.quiet += 1; state.events |= ArenaEvent.Quiet; }
            if (state.snareId == robot.id) state.snareId = "";
        }

        /// <summary>Something loud happened here: nearby robots that can hear turn to look.</summary>
        private static void Noise(ArenaLayout layout, ArenaState state, double x, double z)
        {
            foreach (var robot in state.robots)
            {
                if (!robot.InPlay || robot.hold > 0) continue;
                double hear = layout.Profile(robot.kind).hear;
                double dx = x - robot.x, dz = z - robot.z;
                if (hear <= 0 || dx * dx + dz * dz > hear * hear) continue;
                robot.lastSeenX = x; robot.lastSeenZ = z;
                if (robot.awareness < 0.45) robot.awareness = 0.45;
                if (robot.mode == RobotMode.Patrol || robot.mode == RobotMode.Search) { robot.mode = RobotMode.Curious; robot.timer = layout.rules.curiousSeconds; }
            }
        }

        private static RobotSpec SpecOf(ArenaLayout layout, string id)
        {
            foreach (var spec in layout.robots) if (spec.id == id) return spec;
            return null;
        }

        private static void MarkSeen(ArenaLayout layout, ArenaState state, RobotState robot)
        {
            state.events |= ArenaEvent.Spotted;
            if (SpecOf(layout, robot.id).trial == TrialId.Stealth) state.seen = true;
        }

        private static void Snare(ArenaLayout layout, ArenaState state, RobotState robot)
        {
            var rules = layout.rules;
            state.snareCooldown = rules.snareCooldown;
            state.events |= ArenaEvent.Snare;
            robot.sparks -= 1;
            if (robot.sparks <= 0) { Resolve(state, robot, false); return; }
            robot.hold = rules.snareSeconds; robot.tethered = true;
            if (robot.awareness < 1) { robot.awareness = 1; MarkSeen(layout, state, robot); }
            robot.lastSeenX = state.hero.x; robot.lastSeenZ = state.hero.z;
            if (robot.kind != RobotKind.Sentry) robot.mode = RobotMode.Alert;
            state.snareId = robot.id;
        }

        private static void StartPounce(ArenaLayout layout, ArenaState state, RobotState robot)
        {
            var hero = state.hero;
            var rules = layout.rules;
            var profile = layout.Profile(robot.kind);
            double dx = robot.x - hero.x, dy = robot.y + profile.height - hero.y, dz = robot.z - hero.z;
            state.pounceId = robot.id; state.pounceTime = 0;
            state.pounceDuration = Clamp(Math.Sqrt(dx * dx + dy * dy + dz * dz) / rules.pounceSpeed, rules.pounceMin, rules.pounceMax);
            state.pounceFromX = hero.x; state.pounceFromY = hero.y; state.pounceFromZ = hero.z;
            state.pounceQuiet = QuietOpening(layout, robot, hero);
            state.pounceCooldown = rules.pounceCooldown;
            state.events |= ArenaEvent.Pounce;
        }

        /// <summary>Luke rides an authored arc that follows the robot, so the leap always lands.</summary>
        private static void StepPounce(ArenaLayout layout, ArenaState state, double dt)
        {
            var rules = layout.rules;
            var robot = state.FindRobot(state.pounceId);
            var hero = state.hero;
            if (robot == null || !robot.InPlay)
            {
                state.pounceId = "";
                var free = hero.Clone();
                free.mode = HeroMode.Air; free.groundId = ""; free.climbId = ""; free.tetherId = ""; free.hopAvailable = true; free.cutEligible = false;
                state.hero = free;
                return;
            }
            var profile = layout.Profile(robot.kind);
            state.pounceTime += dt;
            double u = Math.Min(1, state.pounceTime / state.pounceDuration);
            double toX = robot.x, toY = robot.y + profile.height, toZ = robot.z;
            double x = state.pounceFromX + (toX - state.pounceFromX) * u;
            double z = state.pounceFromZ + (toZ - state.pounceFromZ) * u;
            double y = state.pounceFromY + (toY - state.pounceFromY) * u + rules.pounceArc * 4 * u * (1 - u);
            double flatX = toX - state.pounceFromX, flatZ = toZ - state.pounceFromZ;
            double flat = Math.Sqrt(flatX * flatX + flatZ * flatZ);
            double yaw = flat > 1e-6 ? Math.Atan2(flatX, flatZ) : hero.yaw;
            var next = hero.Clone();
            next.vx = (x - hero.x) / dt; next.vy = (y - hero.y) / dt; next.vz = (z - hero.z) / dt;
            next.x = x; next.y = y; next.z = z; next.yaw = yaw;
            next.mode = HeroMode.Air; next.groundId = ""; next.climbId = ""; next.tetherId = "";
            next.airTime = hero.airTime + dt; next.events = HeroEvent.None; next.impact = 0;
            if (u < 1) { state.hero = next; return; }

            // Landing. Small robots are pinned or finished; a big one is a springboard.
            bool finishing = state.pounceQuiet || robot.hold > 0 || robot.mode == RobotMode.Recover;
            state.events |= ArenaEvent.Impact | ArenaEvent.Bounce;
            if (profile.large)
            {
                if (finishing) { robot.sparks -= 1; if (robot.sparks <= 0) Resolve(state, robot, state.pounceQuiet); }
            }
            else if (finishing) Resolve(state, robot, state.pounceQuiet);
            else
            {
                robot.sparks -= 1;
                if (robot.sparks <= 0) Resolve(state, robot, false);
                else { robot.hold = rules.pouncePin; robot.tethered = false; }
            }
            if (robot.InPlay && robot.awareness < 1) { robot.awareness = 1; MarkSeen(layout, state, robot); }
            if (!state.pounceQuiet) Noise(layout, state, x, z);
            double away = flat > 1e-6 ? -1.6 / flat : 0;
            next.vx = flatX * away; next.vz = flatZ * away; next.vy = rules.pounceBounce; next.hopAvailable = true; next.cutEligible = false;
            state.hero = next;
            state.mercy = Math.Max(state.mercy, 0.5);
            state.pounceId = "";
        }

        private static double TurnToward(RobotState robot, double yaw, double rate, double dt)
        {
            double delta = Wrap(yaw - robot.yaw);
            if (Math.Abs(delta) > 1e-9) robot.yaw = Wrap(robot.yaw + Clamp(delta, -rate * dt, rate * dt));
            return Math.Abs(delta);
        }

        /// <summary>Move a robot's footprint, sliding around solids and staying inside its own zone. Returns true when blocked.</summary>
        private static bool Shove(TraversalWorld world, ArenaZone zone, RobotState robot, RobotProfile profile, double nextX, double nextZ)
        {
            double x = nextX, z = nextZ;
            bool blocked = false;
            double R = profile.radius;
            foreach (var solid in world.solids)
            {
                if (robot.y >= solid.maxY - 0.05 || robot.y + profile.height <= solid.minY) continue;
                double cx = Clamp(x, solid.minX, solid.maxX), cz = Clamp(z, solid.minZ, solid.maxZ);
                double dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
                if (d2 >= R * R) continue;
                blocked = true;
                if (d2 > 1e-12) { double d = Math.Sqrt(d2); x = cx + dx / d * R; z = cz + dz / d * R; continue; }
                double left = x - solid.minX, right = solid.maxX - x, near = z - solid.minZ, far = solid.maxZ - z;
                double least = Math.Min(Math.Min(left, right), Math.Min(near, far));
                if (least == left) x = solid.minX - R; else if (least == right) x = solid.maxX + R; else if (least == near) z = solid.minZ - R; else z = solid.maxZ + R;
            }
            double inX = Clamp(x, zone.minX + R, zone.maxX - R), inZ = Clamp(z, zone.minZ + R, zone.maxZ - R);
            if (inX != x || inZ != z) blocked = true;
            robot.x = inX; robot.z = inZ;
            return blocked;
        }

        /// <summary>Walk toward a point. Returns the distance still to go.</summary>
        private static double Approach(TraversalWorld world, ArenaZone zone, RobotState robot, RobotProfile profile, double x, double z, double speed, double dt)
        {
            double dx = x - robot.x, dz = z - robot.z;
            double distance = Math.Sqrt(dx * dx + dz * dz);
            if (distance < 1e-6) return 0;
            TurnToward(robot, Math.Atan2(dx, dz), profile.turn, dt);
            double step = Math.Min(distance, speed * dt);
            Shove(world, zone, robot, profile, robot.x + dx / distance * step, robot.z + dz / distance * step);
            return distance - step;
        }

        private static void Patrol(TraversalWorld world, ArenaZone zone, RobotSpec spec, RobotState robot, RobotProfile profile, double dt)
        {
            if (robot.kind == RobotKind.Sentry)
            {
                // The gaze swings back and forth between its two limits.
                double span = Wrap(spec.sweepTo - spec.sweepFrom);
                double middle = spec.sweepFrom + span / 2;
                double offset = Wrap(robot.yaw - middle) + robot.sweepDir * spec.sweepRate * dt;
                if (offset > span / 2) { offset = span / 2; robot.sweepDir = -1; }
                if (offset < -span / 2) { offset = -span / 2; robot.sweepDir = 1; }
                robot.yaw = Wrap(middle + offset);
                return;
            }
            if (spec.patrol.Length == 0)
            {
                if (Approach(world, zone, robot, profile, spec.x, spec.z, profile.walk, dt) < 0.05) TurnToward(robot, spec.yaw, profile.turn, dt);
                return;
            }
            if (robot.patrolWait > 0) { robot.patrolWait -= dt; return; }
            var point = spec.patrol[robot.patrolIndex % spec.patrol.Length];
            if (Approach(world, zone, robot, profile, point.x, point.z, profile.walk, dt) < 0.2)
            {
                robot.patrolWait = point.wait;
                robot.patrolIndex = (robot.patrolIndex + 1) % spec.patrol.Length;
            }
        }

        private static void HitLuke(ArenaLayout layout, ArenaState state, RobotState robot, double dirX, double dirZ)
        {
            var rules = layout.rules;
            if (state.mercy > 0 || state.bonk > 0 || state.held > 0 || state.pounceId.Length > 0) return;
            state.energy -= 1; state.mercy = rules.mercy; state.events |= ArenaEvent.Hit;
            if (state.trial == TrialId.Ring) state.ringHits += 1;
            double length = Math.Sqrt(dirX * dirX + dirZ * dirZ);
            double kx = length > 1e-6 ? dirX / length : Math.Sin(robot.yaw), kz = length > 1e-6 ? dirZ / length : Math.Cos(robot.yaw);
            var knocked = state.hero.Clone();
            knocked.vx = kx * rules.knockback; knocked.vz = kz * rules.knockback; knocked.vy = rules.knockUp;
            knocked.mode = HeroMode.Air; knocked.groundId = ""; knocked.climbId = ""; knocked.tetherId = ""; knocked.hopAvailable = true; knocked.cutEligible = false;
            state.hero = knocked;
            if (state.energy > 0) return;
            // Bonked: dizzy for a moment. Robots lose interest and drift home; every spark already won stays won.
            state.energy = 0; state.bonk = rules.bonkSeconds; state.events |= ArenaEvent.Bonk;
            if (state.trial == TrialId.Ring) state.ringBonks += 1;
            foreach (var other in state.robots)
            {
                if (!other.InPlay) continue;
                other.awareness = 0; other.unseen = 0;
                if (other.mode != RobotMode.Recover || other.kind != RobotKind.Sentry) { other.mode = RobotMode.Patrol; other.timer = 0; }
            }
        }

        private static void StepRobot(ArenaLayout layout, ArenaState state, RobotState robot, bool targetable, double dt)
        {
            var rules = layout.rules;
            var spec = SpecOf(layout, robot.id);
            var profile = layout.Profile(robot.kind);
            var zone = ZoneOfTrial(layout, spec.trial);
            var world = layout.world;
            var hero = state.hero;
            if (robot.hold > 0)
            {
                robot.hold -= dt;
                double hx = hero.x - robot.x, hz = hero.z - robot.z;
                if (robot.hold <= 0 || (robot.tethered && hx * hx + hz * hz > rules.snareBreak * rules.snareBreak))
                {
                    robot.hold = 0; robot.tethered = false;
                    if (state.snareId == robot.id) state.snareId = "";
                    if (robot.kind != RobotKind.Sentry) robot.mode = RobotMode.Alert;
                }
                return;
            }
            // Perception.
            bool visible = targetable && CanSee(layout, robot, hero);
            if (visible)
            {
                double px = hero.x - robot.x, pz = hero.z - robot.z;
                double near = Clamp(Math.Sqrt(px * px + pz * pz) / profile.sight, 0, 1);
                robot.awareness = Math.Min(1, robot.awareness + (rules.awareNear + (rules.awareFar - rules.awareNear) * near) * dt);
                robot.unseen = 0; robot.lastSeenX = hero.x; robot.lastSeenZ = hero.z;
            }
            else
            {
                robot.unseen += dt;
                if (robot.unseen > rules.awareGrace) robot.awareness = Math.Max(0, robot.awareness - rules.awareDecay * (targetable ? 1 : 4) * dt);
            }
            if (robot.kind == RobotKind.Drone) robot.y = Math.Min(profile.hover, robot.y + (robot.mode == RobotMode.Strike ? 0 : 2.5 * dt));

            switch (robot.mode)
            {
                case RobotMode.Patrol:
                    if (robot.awareness >= 1) { robot.mode = RobotMode.Alert; MarkSeen(layout, state, robot); break; }
                    if (robot.awareness >= rules.unaware) { robot.mode = RobotMode.Curious; robot.timer = rules.curiousSeconds; break; }
                    Patrol(world, zone, spec, robot, profile, dt);
                    break;
                case RobotMode.Curious:
                    if (robot.kind != RobotKind.Sentry) TurnToward(robot, Math.Atan2(robot.lastSeenX - robot.x, robot.lastSeenZ - robot.z), profile.turn, dt);
                    if (robot.awareness >= 1) { robot.mode = RobotMode.Alert; MarkSeen(layout, state, robot); break; }
                    robot.timer = visible ? rules.curiousSeconds : robot.timer - dt;
                    if (robot.timer <= 0 && robot.awareness < rules.unaware) robot.mode = RobotMode.Patrol;
                    break;
                case RobotMode.Alert:
                {
                    if (robot.kind == RobotKind.Sentry)
                    {
                        // The floodlight's catch: Luke is held for a moment and set down out of sight. Nothing is lost.
                        if (targetable && state.pounceId.Length == 0)
                        {
                            state.held = rules.holdSeconds; state.seen = true; state.catches += 1; state.events |= ArenaEvent.Caught;
                            var still = hero.Clone();
                            still.vx = 0; still.vy = 0; still.vz = 0;
                            state.hero = still;
                        }
                        // No wall to get stuck on: every catch leaves the light dark for longer.
                        robot.mode = RobotMode.Recover; robot.awareness = 0;
                        robot.timer = profile.recover + Math.Min(state.catches, rules.catchHelpMax) * rules.catchHelpSeconds;
                        break;
                    }
                    if (!visible && robot.unseen >= rules.loseSightSeconds) { robot.mode = RobotMode.Search; robot.timer = rules.searchSeconds; break; }
                    double ax = hero.x - robot.x, az = hero.z - robot.z;
                    double flat = Math.Sqrt(ax * ax + az * az);
                    if (robot.kind == RobotKind.Mower)
                    {
                        // A mow-bot lines up, then charges straight.
                        double off = TurnToward(robot, Math.Atan2(robot.lastSeenX - robot.x, robot.lastSeenZ - robot.z), profile.turn, dt);
                        if (visible && off < 0.2 && flat <= profile.attackRange) { robot.mode = RobotMode.Windup; robot.timer = profile.windup; }
                        break;
                    }
                    if (visible && flat <= profile.attackRange) { robot.mode = RobotMode.Windup; robot.timer = profile.windup; break; }
                    Approach(world, zone, robot, profile, robot.lastSeenX, robot.lastSeenZ, profile.chase, dt);
                    break;
                }
                case RobotMode.Windup:
                {
                    // The telegraph. The robot tracks Luke for the first part, then commits to where he was.
                    robot.timer -= dt;
                    if (robot.timer > profile.windup * 0.4)
                    {
                        if (robot.kind != RobotKind.Mower) TurnToward(robot, Math.Atan2(hero.x - robot.x, hero.z - robot.z), profile.turn, dt);
                        robot.strikeX = hero.x; robot.strikeY = hero.y + rules.heroCentre; robot.strikeZ = hero.z;
                    }
                    if (robot.timer > 0) break;
                    robot.mode = RobotMode.Strike; robot.travelled = 0;
                    if (robot.kind == RobotKind.Drone)
                    {
                        double sx = robot.strikeX - robot.x, sy = robot.strikeY - robot.y, sz = robot.strikeZ - robot.z;
                        double length = Math.Sqrt(sx * sx + sy * sy + sz * sz);
                        if (length == 0) length = 1;
                        robot.strikeX = sx / length; robot.strikeY = sy / length; robot.strikeZ = sz / length;
                        robot.timer = length;
                    }
                    else
                    {
                        robot.strikeX = Math.Sin(robot.yaw); robot.strikeY = 0; robot.strikeZ = Math.Cos(robot.yaw);
                        robot.timer = profile.strikeDistance;
                    }
                    break;
                }
                case RobotMode.Strike:
                {
                    double step = profile.strikeSpeed * dt;
                    if (robot.kind == RobotKind.Drone) robot.y = Math.Max(0.3, robot.y + robot.strikeY * step);
                    bool blocked = Shove(world, zone, robot, profile, robot.x + robot.strikeX * step, robot.z + robot.strikeZ * step);
                    robot.travelled += step;
                    double ox = hero.x - robot.x, oz = hero.z - robot.z;
                    double reach = profile.hit + TraversalTuning.Default.radius;
                    bool overlapping = ox * ox + oz * oz < reach * reach && hero.y < robot.y + profile.height + 0.3 && hero.y + TraversalTuning.Default.height > robot.y;
                    if (overlapping && targetable) HitLuke(layout, state, robot, robot.strikeX, robot.strikeZ);
                    if (blocked || robot.travelled >= robot.timer || (overlapping && targetable))
                    {
                        robot.mode = RobotMode.Recover;
                        // A mow-bot that runs into something stalls for longer.
                        robot.timer = profile.recover + (blocked && robot.kind == RobotKind.Mower ? 1 : 0);
                    }
                    break;
                }
                case RobotMode.Recover:
                    robot.timer -= dt;
                    if (robot.timer > 0) break;
                    robot.mode = robot.kind == RobotKind.Sentry ? RobotMode.Patrol : robot.awareness >= rules.unaware && targetable ? RobotMode.Alert : RobotMode.Search;
                    robot.timer = rules.searchSeconds;
                    break;
                case RobotMode.Search:
                {
                    if (robot.awareness >= 1) { robot.mode = RobotMode.Alert; break; }
                    // Look around where Luke was last seen. A place it cannot reach is given up on a little later.
                    bool arrived = robot.kind == RobotKind.Mower || Approach(world, zone, robot, profile, robot.lastSeenX, robot.lastSeenZ, profile.walk * 1.4, dt) < 0.4;
                    robot.timer -= arrived ? dt : dt * 0.35;
                    if (robot.timer <= 0) { robot.mode = RobotMode.Patrol; robot.awareness = 0; }
                    break;
                }
                default:
                    break;
            }
        }

        private static void EnterTrial(ArenaLayout layout, ArenaState state, TrialId trial)
        {
            // Leaving: whatever was chasing loses interest and goes home.
            for (int index = 0; index < state.robots.Length; index++)
            {
                var robot = state.robots[index];
                if (!robot.InPlay || layout.robots[index].trial != state.trial) continue;
                robot.awareness = 0; robot.hold = 0; robot.tethered = false;
                if (robot.mode != RobotMode.Patrol) { robot.mode = RobotMode.Patrol; robot.timer = 0; }
            }
            state.snareId = "";
            state.trial = trial;
            if (trial == TrialId.Ring)
            {
                // A finished or never-started ring begins again at wave one; an unfinished wave carries on.
                if (state.wave < 1 || state.wave > layout.waves)
                {
                    state.wave = 1; state.ringHits = 0; state.ringBonks = 0;
                    for (int index = 0; index < state.robots.Length; index++) if (layout.robots[index].trial == TrialId.Ring) state.robots[index] = FreshRobot(layout, layout.robots[index]);
                }
                state.waveTimer = layout.rules.waveDelay;
            }
            else if (trial == TrialId.Course)
            {
                // Each visit starts a new lap with every practice spark back in place.
                state.lap = new List<string>(); state.lapTime = 0; state.lapRest = 0;
            }
            else if (trial == TrialId.Stealth)
            {
                // Each visit is a fresh attempt. Robots still on patrol carry on from where they are; the ones powered down are back at their posts.
                for (int index = 0; index < state.robots.Length; index++)
                    if (layout.robots[index].trial == TrialId.Stealth && state.robots[index].mode == RobotMode.Resolved) state.robots[index] = FreshRobot(layout, layout.robots[index]);
                state.seen = false; state.catches = 0; state.vaultTaken = false; state.hideId = layout.hides.Length > 0 ? layout.hides[0].id : "";
            }
        }

        /// <summary>Stars only ever go up, and the event fires only when they do.</summary>
        private static void Award(ArenaState state, TrialId trial, int stars)
        {
            var progress = state.progress;
            int current = trial == TrialId.Course ? progress.courseStars : trial == TrialId.Ring ? progress.ringStars : progress.stealthStars;
            if (stars <= current) return;
            if (trial == TrialId.Course) progress.courseStars = stars; else if (trial == TrialId.Ring) progress.ringStars = stars; else progress.stealthStars = stars;
            state.events |= ArenaEvent.Star;
        }

        private static void StepTrials(ArenaLayout layout, ArenaState state, double dt)
        {
            var rules = layout.rules;
            var hero = state.hero;
            TrialId here = state.held > 0 ? state.trial : TrialAt(layout, hero.x, hero.z);
            if (here == state.trial) state.away = 0;
            else if (here != TrialId.None) { state.away = 0; EnterTrial(layout, state, here); }
            else
            {
                // Out on the hub floor. A swing or a stumble over the line ends nothing; staying out does.
                state.away += dt;
                if (state.away >= rules.leaveSeconds) { state.away = 0; EnterTrial(layout, state, TrialId.None); }
            }

            if (state.trial == TrialId.Ring && state.wave >= 1 && state.wave <= layout.waves)
            {
                if (state.waveTimer > 0)
                {
                    state.waveTimer -= dt;
                    if (state.waveTimer <= 0)
                    {
                        state.waveTimer = 0;
                        bool started = false;
                        for (int index = 0; index < state.robots.Length; index++)
                        {
                            var robot = state.robots[index];
                            if (layout.robots[index].trial != TrialId.Ring || layout.robots[index].wave != state.wave || robot.mode != RobotMode.Dormant) continue;
                            robot.mode = RobotMode.Alert; robot.awareness = 1; robot.lastSeenX = hero.x; robot.lastSeenZ = hero.z; started = true;
                        }
                        if (started) state.events |= ArenaEvent.Wave;
                    }
                }
                else
                {
                    bool cleared = true;
                    for (int index = 0; index < state.robots.Length; index++)
                        if (layout.robots[index].trial == TrialId.Ring && layout.robots[index].wave == state.wave && state.robots[index].mode != RobotMode.Resolved) { cleared = false; break; }
                    if (cleared)
                    {
                        state.progress.ringBest = Math.Max(state.progress.ringBest, state.wave);
                        state.wave += 1;
                        if (state.wave > layout.waves) { state.events |= ArenaEvent.Trial; Award(state, TrialId.Ring, state.ringBonks > 0 ? 1 : state.ringHits > 0 ? 2 : 3); }
                        else state.waveTimer = rules.waveDelay;
                    }
                }
            }

            // The course clock runs from the first spark of a lap; a finished lap rests, then the sparks come back.
            double reach = rules.pickupRadius * rules.pickupRadius;
            if (state.trial == TrialId.Course)
            {
                if (state.lapRest > 0)
                {
                    state.lapRest -= dt;
                    if (state.lapRest <= 0)
                    {
                        // The sparks come back once Luke has stepped clear of them, so standing on the last one never starts the clock.
                        bool touching = false;
                        foreach (var item in layout.pickups)
                        {
                            if (item.trial != TrialId.Course) continue;
                            double tx = item.x - hero.x, ty = item.y - hero.y - rules.heroCentre, tz = item.z - hero.z;
                            if (tx * tx + ty * ty + tz * tz <= reach) { touching = true; break; }
                        }
                        if (touching) state.lapRest = dt; else { state.lapRest = 0; state.lap = new List<string>(); state.lapTime = 0; }
                    }
                }
                else if (state.lap.Count > 0) state.lapTime += dt;
            }

            // Pickups: practice sparks on the course and the vault spark in the yard.
            double cx = hero.x, cy = hero.y + rules.heroCentre, cz = hero.z;
            foreach (var pickup in layout.pickups)
            {
                if (pickup.trial != state.trial) continue;
                double dx = pickup.x - cx, dy = pickup.y - cy, dz = pickup.z - cz;
                if (dx * dx + dy * dy + dz * dz > reach) continue;
                if (pickup.trial == TrialId.Course)
                {
                    if (state.lapRest > 0 || state.lap.Contains(pickup.id)) continue;
                    state.lap = new List<string>(state.lap) { pickup.id };
                    state.events |= ArenaEvent.Pickup;
                    // Kept in level order so a save never depends on the route taken.
                    if (!state.progress.course.Contains(pickup.id))
                    {
                        var ordered = new List<string>();
                        foreach (var item in layout.pickups) if (item.trial == TrialId.Course && (item.id == pickup.id || state.progress.course.Contains(item.id))) ordered.Add(item.id);
                        state.progress.course = ordered;
                    }
                    int total = layout.CourseSparkCount;
                    // Every spark found once is the first star, however many visits it takes.
                    if (state.progress.course.Count == total) Award(state, TrialId.Course, 1);
                    if (state.lap.Count == total)
                    {
                        state.events |= ArenaEvent.Trial;
                        Award(state, TrialId.Course, state.lapTime <= rules.courseGold ? 3 : state.lapTime <= rules.courseSilver ? 2 : 1);
                        if (state.progress.courseBest == 0 || state.lapTime < state.progress.courseBest) state.progress.courseBest = state.lapTime;
                        state.lapRest = rules.lapRest;
                    }
                }
                else if (pickup.trial == TrialId.Stealth && !state.vaultTaken)
                {
                    state.vaultTaken = true;
                    state.events |= ArenaEvent.Pickup | ArenaEvent.Trial;
                    Award(state, TrialId.Stealth, !state.seen ? 3 : state.catches == 0 ? 2 : 1);
                }
            }

            // The last hiding place Luke stood in, unseen: where a catch sets him back down.
            if (state.trial == TrialId.Stealth && hero.mode == HeroMode.Ground)
            {
                bool noticed = false;
                foreach (var robot in state.robots) if (robot.InPlay && robot.awareness >= rules.unaware) { noticed = true; break; }
                foreach (var hide in layout.hides)
                {
                    double dx = hide.x - hero.x, dz = hide.z - hero.z;
                    if (dx * dx + dz * dz <= rules.hideRadius * rules.hideRadius && !noticed) state.hideId = hide.id;
                }
            }
        }

        /// <summary>Advance one fixed step. The input state is never mutated.</summary>
        public static ArenaState Step(ArenaLayout layout, ArenaState previous, ArenaInput input, double dt = TraversalTuning.Step)
        {
            if (!TraversalGeometry.Finite(dt) || dt <= 0) return previous;
            var rules = layout.rules;
            var world = layout.world;
            var state = (ArenaState)CloneShallow(previous);
            state.robots = new RobotState[previous.robots.Length];
            for (int index = 0; index < state.robots.Length; index++) state.robots[index] = previous.robots[index].Clone();
            state.progress = previous.progress.Clone();
            state.events = ArenaEvent.None;
            state.mercy = Math.Max(0, state.mercy - dt);
            state.snareCooldown = Math.Max(0, state.snareCooldown - dt);
            state.pounceCooldown = Math.Max(0, state.pounceCooldown - dt);
            bool actionPressed = input.action && !previous.actionHeld;
            bool pouncePressed = input.pounce && !previous.pounceHeld;
            state.actionHeld = input.action; state.pounceHeld = input.pounce;

            if (state.bonk > 0)
            {
                // Dizzy: the body settles on its own and no robot bothers it.
                state.hero = HeroSimulation.Step(world, state.hero, default(HeroInput), dt);
                state.bonk -= dt;
                if (state.bonk <= 0) { state.bonk = 0; state.energy = rules.energyMax; state.mercy = rules.mercy; state.events |= ArenaEvent.Revive; }
            }
            else if (state.held > 0)
            {
                state.held -= dt;
                if (state.held <= 0)
                {
                    HideSpot hide = null;
                    foreach (var spot in layout.hides) if (spot.id == state.hideId) { hide = spot; break; }
                    if (hide == null && layout.hides.Length > 0) hide = layout.hides[0];
                    state.held = 0; state.mercy = rules.mercy; state.events |= ArenaEvent.Release;
                    state.hero = hide != null ? HeroSimulation.Create(world, hide.x, hide.z, hide.yaw) : HeroSimulation.Create(world, world.spawn.x, world.spawn.z, world.spawn.yaw);
                }
            }
            else if (state.pounceId.Length > 0) StepPounce(layout, state, dt);
            else
            {
                state.hero = HeroSimulation.Step(world, state.hero, new HeroInput { moveX = input.moveX, moveZ = input.moveZ, jump = input.jump, power = input.power }, dt);
                var hero = state.hero;
                // Noise carries: a sprint or a heavy landing turns nearby heads.
                double planar = Math.Sqrt(hero.vx * hero.vx + hero.vz * hero.vz);
                if ((hero.mode == HeroMode.Ground && hero.powerHeld && planar > rules.sprintNoiseSpeed) || ((hero.events & HeroEvent.Land) != 0 && hero.impact > rules.landNoiseImpact)) Noise(layout, state, hero.x, hero.z);
                if ((actionPressed || pouncePressed) && hero.mode != HeroMode.Catch)
                {
                    var robot = state.FindRobot(PickTarget(layout, state, input.aimX, input.aimZ));
                    if (robot != null)
                    {
                        // The pounce button always leaps when it can; the one-button action picks what counts most.
                        ActionKind choice = pouncePressed ? (state.pounceCooldown <= 0 ? ActionKind.Pounce : ActionKind.None) : ActionFor(layout, state, robot);
                        if (choice == ActionKind.Snare) Snare(layout, state, robot);
                        else if (choice != ActionKind.None) StartPounce(layout, state, robot);
                    }
                }
            }

            // Robots notice and bother Luke only inside their own trial: stepping out of a zone is always safe.
            bool targetable = state.bonk <= 0 && state.held <= 0;
            for (int index = 0; index < state.robots.Length; index++)
            {
                var robot = state.robots[index];
                if (robot.InPlay) StepRobot(layout, state, robot, targetable && layout.robots[index].trial == state.trial, dt);
            }
            StepTrials(layout, state, dt);
            state.targetId = targetable && state.pounceId.Length == 0 ? PickTarget(layout, state, input.aimX, input.aimZ) : "";
            var aimed = state.FindRobot(state.targetId);
            state.targetQuiet = aimed != null && QuietOpening(layout, aimed, state.hero);
            if (state.snareId.Length > 0)
            {
                var snared = state.FindRobot(state.snareId);
                if (snared == null || !(snared.hold > 0 && snared.tethered)) state.snareId = "";
            }
            return state;
        }

        private static ArenaState CloneShallow(ArenaState source)
        {
            return new ArenaState
            {
                hero = source.hero, robots = source.robots, energy = source.energy, mercy = source.mercy, bonk = source.bonk, held = source.held,
                snareCooldown = source.snareCooldown, pounceCooldown = source.pounceCooldown, actionHeld = source.actionHeld, pounceHeld = source.pounceHeld,
                pounceId = source.pounceId, pounceTime = source.pounceTime, pounceDuration = source.pounceDuration,
                pounceFromX = source.pounceFromX, pounceFromY = source.pounceFromY, pounceFromZ = source.pounceFromZ, pounceQuiet = source.pounceQuiet,
                snareId = source.snareId, targetId = source.targetId, targetQuiet = source.targetQuiet, trial = source.trial, away = source.away,
                lap = source.lap, lapTime = source.lapTime, lapRest = source.lapRest, wave = source.wave, waveTimer = source.waveTimer,
                ringHits = source.ringHits, ringBonks = source.ringBonks, seen = source.seen, catches = source.catches, vaultTaken = source.vaultTaken,
                hideId = source.hideId, progress = source.progress, events = source.events,
            };
        }

        /// <summary>Merge stored progress with a run's progress. Rewards only ever accumulate.</summary>
        public static ArenaProgress MergeProgress(ArenaLayout layout, ArenaProgress a, ArenaProgress b)
        {
            var merged = new ArenaProgress();
            foreach (var item in layout.pickups) if (item.trial == TrialId.Course && (a.course.Contains(item.id) || b.course.Contains(item.id))) merged.course.Add(item.id);
            merged.courseBest = a.courseBest > 0 && b.courseBest > 0 ? Math.Min(a.courseBest, b.courseBest) : Math.Max(a.courseBest, b.courseBest);
            merged.courseStars = Math.Max(a.courseStars, b.courseStars);
            merged.ringStars = Math.Max(a.ringStars, b.ringStars); merged.ringBest = Math.Max(a.ringBest, b.ringBest);
            merged.stealthStars = Math.Max(a.stealthStars, b.stealthStars); merged.quiet = Math.Max(a.quiet, b.quiet);
            return merged;
        }

        /// <summary>True for progress this layout could really have produced: nothing unknown, out of order or self-contradicting.</summary>
        public static bool IsValidProgress(ArenaLayout layout, ArenaProgress progress)
        {
            if (progress == null || progress.course == null) return false;
            var rules = layout.rules;
            var ordered = new List<string>();
            int total = 0;
            foreach (var item in layout.pickups)
            {
                if (item.trial != TrialId.Course) continue;
                total++;
                if (progress.course.Contains(item.id)) ordered.Add(item.id);
            }
            if (ordered.Count != progress.course.Count) return false;
            for (int index = 0; index < ordered.Count; index++) if (ordered[index] != progress.course[index]) return false;
            if (progress.courseStars < 0 || progress.courseStars > ArenaProgress.StarMax || progress.ringStars < 0 || progress.ringStars > ArenaProgress.StarMax ||
                progress.stealthStars < 0 || progress.stealthStars > ArenaProgress.StarMax) return false;
            if (progress.ringBest < 0 || progress.ringBest > layout.waves || progress.quiet < 0 || progress.quiet > 1000000) return false;
            if (!TraversalGeometry.Finite(progress.courseBest) || progress.courseBest < 0) return false;
            if ((progress.course.Count == total) != (progress.courseStars >= 1)) return false;
            if (progress.courseBest > 0 && progress.courseStars < 1) return false;
            if (progress.courseStars >= 2 && !(progress.courseBest > 0 && progress.courseBest <= rules.courseSilver)) return false;
            if (progress.courseStars >= 3 && progress.courseBest > rules.courseGold) return false;
            return (progress.ringBest == layout.waves) == (progress.ringStars >= 1);
        }
    }
}
