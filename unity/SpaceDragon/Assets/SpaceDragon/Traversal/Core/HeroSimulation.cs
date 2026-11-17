using System;
using System.Collections.Generic;

namespace SpaceDragon.Traversal
{
    public enum HeroMode { Ground, Air, Swing, Catch, Climb }

    /// <summary>One-step notifications for effects and sound. They never own progress.</summary>
    [Flags]
    public enum HeroEvent { None = 0, Jump = 1, Hop = 2, Attach = 4, Release = 8, Land = 16, Bounce = 32, Catch = 64, Recover = 128, Climb = 256, Mantle = 512 }

    [Serializable]
    public struct HeroInput
    {
        /// <summary>World-space intent on the ground plane, magnitude at most one.</summary>
        public double moveX, moveZ;
        public bool jump;
        /// <summary>Suit power: sprint on the ground, tether in the air.</summary>
        public bool power;
    }

    /// <summary>Authoritative on-foot hero state. Field names match the TypeScript reference and its fixtures.</summary>
    [Serializable]
    public sealed class HeroState
    {
        public double x, y, z, vx, vy, vz;
        /// <summary>Facing; zero looks toward +z.</summary>
        public double yaw;
        public HeroMode mode;
        public string groundId = "";
        public double groundTime, airTime, coyote, jumpBuffer;
        public bool jumpHeld, powerHeld, hopAvailable;
        /// <summary>A released jump key may shorten only an ordinary jump, never a hop, bounce or swing launch.</summary>
        public bool cutEligible;
        public string tetherId = "";
        public double ropeLength, ropeTarget, swingTime;
        /// <summary>Unit ground direction from the hero to the anchor at the moment of attaching.</summary>
        public double swingDirX, swingDirZ;
        public double tetherCooldown;
        public string lastAnchorId = "";
        public double lastAnchorAge, catchTime, catchX, catchY, catchZ;
        public double safeX, safeY, safeZ, safeYaw;
        public double impact;
        public HeroEvent events;
        /// <summary>Marked face being climbed, or empty.</summary>
        public string climbId = "";
        public double climbCooldown;

        public HeroState Clone() => (HeroState)MemberwiseClone();
    }

    /// <summary>
    /// Momentum running, a held-height jump, one thruster hop, tether swings on marked anchors, Spider
    /// Climb on marked faces and a safety catch instead of any fail state. Pure and fixed-step: no scene, storage or wall clock.
    /// A line-for-line port of src/game/traversal/hero.ts, checked by tools/unity/traversal-parity.
    /// </summary>
    public static class HeroSimulation
    {
        private static double WrapAngle(double angle) => Math.Atan2(Math.Sin(angle), Math.Cos(angle));

        /// <summary>
        /// Stand the hero on the surface under a pose. Without a height the search starts at the ground,
        /// so decks and floors are found but walls and roofs are not mistaken for footing.
        /// </summary>
        public static HeroState Create(TraversalWorld world, double x, double z, double yaw, double? height = null, TraversalTuning tuning = null)
        {
            var T = tuning ?? TraversalTuning.Default;
            if (!TraversalGeometry.Finite(x)) x = world.spawn.x;
            if (!TraversalGeometry.Finite(z)) z = world.spawn.z;
            if (!TraversalGeometry.Finite(yaw)) yaw = world.spawn.yaw;
            var support = TraversalGeometry.SupportAt(world, x, z, height.HasValue && TraversalGeometry.Finite(height.Value) ? height.Value : 0, T.placeReach);
            return new HeroState
            {
                x = x, y = support.height, z = z, yaw = yaw, mode = HeroMode.Ground, groundId = support.id,
                groundTime = T.safeDelay, coyote = T.coyote, hopAvailable = true, swingDirZ = 1,
                catchX = x, catchY = support.height, catchZ = z, safeX = x, safeY = support.height, safeZ = z, safeYaw = yaw,
            };
        }

        /// <summary>Direction the hero means to travel: stick first, then momentum, then facing.</summary>
        public static void TravelDirection(HeroState state, double moveX, double moveZ, out double dirX, out double dirZ)
        {
            double magnitude = Math.Sqrt(moveX * moveX + moveZ * moveZ);
            if (magnitude > 0.2) { dirX = moveX / magnitude; dirZ = moveZ / magnitude; return; }
            double speed = Math.Sqrt(state.vx * state.vx + state.vz * state.vz);
            if (speed > 1.5) { dirX = state.vx / speed; dirZ = state.vz / speed; return; }
            dirX = Math.Sin(state.yaw); dirZ = Math.Cos(state.yaw);
        }

        /// <summary>A rope may pass trunks and posts (anchors hang from them) but not walls, roofs or props.</summary>
        public static bool TetherSight(TraversalWorld world, double x, double y, double z, Anchor anchor, TraversalTuning tuning = null)
        {
            var T = tuning ?? TraversalTuning.Default;
            double dx = anchor.x - x, dy = anchor.y - y, dz = anchor.z - z;
            double distance = Math.Sqrt(dx * dx + dy * dy + dz * dz);
            int samples = Math.Max(1, (int)Math.Ceiling(distance / T.tetherSightStep));
            for (int index = 1; index < samples; index++)
            {
                double t = (double)index / samples;
                double px = x + dx * t, py = y + dy * t, pz = z + dz * t;
                foreach (var solid in world.solids) if (!solid.IsTrunk && TraversalGeometry.PointInSolid(solid, px, py, pz)) return false;
            }
            return true;
        }

        /// <summary>
        /// The anchor a tether would take now, or null. Deterministic: ties keep world order. Anchors must
        /// be above the hand, in range, in sight and not behind the direction of travel.
        /// </summary>
        public static Anchor SelectAnchor(TraversalWorld world, HeroState state, double dirX, double dirZ, string excludeId = "", TraversalTuning tuning = null)
        {
            var T = tuning ?? TraversalTuning.Default;
            double handY = state.y + T.handHeight;
            List<string> rejected = null;
            for (;;)
            {
                Anchor best = null;
                double bestScore = double.NegativeInfinity;
                foreach (var anchor in world.anchors)
                {
                    if (anchor.id == excludeId || (rejected != null && rejected.Contains(anchor.id))) continue;
                    double dx = anchor.x - state.x;
                    double dz = anchor.z - state.z;
                    double dy = anchor.y - handY;
                    if (dy < T.tetherMinRise) continue;
                    double flat = Math.Sqrt(dx * dx + dz * dz);
                    double distance = Math.Sqrt(flat * flat + dy * dy);
                    if (distance > T.tetherRange) continue;
                    double align = flat > 1e-6 ? (dx * dirX + dz * dirZ) / flat : 0.3;
                    if (align < T.tetherMinAlign) continue;
                    // Near anchors swing well; far ones need a long reel, and one directly overhead barely swings.
                    double reach = flat > T.tetherIdeal ? (flat - T.tetherIdeal) / T.tetherIdeal : (T.tetherIdeal - flat) / (T.tetherIdeal * 3);
                    double score = align * 2.2 - reach - (flat < 2 ? (2 - flat) * 0.5 : 0) - (dy > 9 ? (dy - 9) * 0.1 : 0);
                    if (score > bestScore) { bestScore = score; best = anchor; }
                }
                if (best == null || TetherSight(world, state.x, handY, state.z, best, T)) return best;
                if (rejected == null) rejected = new List<string>();
                rejected.Add(best.id);
            }
        }

        /// <summary>Circle footprint against prisms: slide along walls, pass under roofs, step onto low tops.</summary>
        private static void Slide(TraversalWorld world, HeroState hero, double targetX, double targetZ, double reach, TraversalTuning T)
        {
            double x = targetX, z = targetZ;
            double R = T.radius;
            for (int pass = 0; pass < 2; pass++)
            {
                foreach (var solid in world.solids)
                {
                    if (x < solid.minX - R || x > solid.maxX + R || z < solid.minZ - R || z > solid.maxZ + R) continue;
                    if (hero.y + T.height <= solid.minY) continue;
                    double cx = TraversalGeometry.Clamp(x, solid.minX, solid.maxX);
                    double cz = TraversalGeometry.Clamp(z, solid.minZ, solid.maxZ);
                    if (hero.y + reach >= TraversalGeometry.TopAt(solid, cx, cz)) continue;
                    double dx = x - cx;
                    double dz = z - cz;
                    double d2 = dx * dx + dz * dz;
                    if (d2 >= R * R) continue;
                    double nx = 0, nz = 0;
                    if (d2 > 1e-12)
                    {
                        double d = Math.Sqrt(d2);
                        nx = dx / d; nz = dz / d;
                        x = cx + nx * R; z = cz + nz * R;
                    }
                    else
                    {
                        double left = x - solid.minX;
                        double right = solid.maxX - x;
                        double near = z - solid.minZ;
                        double far = solid.maxZ - z;
                        double least = Math.Min(Math.Min(left, right), Math.Min(near, far));
                        if (least == left) { nx = -1; x = solid.minX - R; }
                        else if (least == right) { nx = 1; x = solid.maxX + R; }
                        else if (least == near) { nz = -1; z = solid.minZ - R; }
                        else { nz = 1; z = solid.maxZ + R; }
                    }
                    double into = hero.vx * nx + hero.vz * nz;
                    if (into < 0) { hero.vx -= into * nx; hero.vz -= into * nz; }
                }
            }
            var b = world.bounds;
            if (x < b.minX + R) { x = b.minX + R; if (hero.vx < 0) hero.vx = 0; }
            if (x > b.maxX - R) { x = b.maxX - R; if (hero.vx > 0) hero.vx = 0; }
            if (z < b.minZ + R) { z = b.minZ + R; if (hero.vz < 0) hero.vz = 0; }
            if (z > b.maxZ - R) { z = b.maxZ - R; if (hero.vz > 0) hero.vz = 0; }
            hero.x = x; hero.z = z;
        }

        /// <summary>Vertical resolution. Returns true while the feet rest on a surface.</summary>
        private static bool Settle(TraversalWorld world, HeroState hero, double targetY, bool grounded, TraversalTuning T)
        {
            double feet = hero.y;
            var support = TraversalGeometry.SupportAt(world, hero.x, hero.z, feet, (grounded ? T.stepHeight : T.airStepHeight) + 1e-9, T.edgeGrace);
            double y = targetY;
            if (hero.vy > 0)
            {
                double ceiling = TraversalGeometry.CeilingAt(world, hero.x, hero.z, feet + T.height, T.radius - 0.02);
                if (y + T.height > ceiling) { y = ceiling - T.height; hero.vy = 0; }
            }
            bool resting = hero.vy <= 0 && (y <= support.height || (grounded && y - support.height <= T.stepDown));
            if (!resting) { hero.y = y; return false; }
            hero.y = support.height;
            if (support.bounce > 0)
            {
                hero.vy = support.bounce; hero.hopAvailable = true; hero.cutEligible = false;
                hero.groundId = ""; hero.events |= HeroEvent.Bounce;
                return false;
            }
            if (!grounded) { hero.events |= HeroEvent.Land; hero.impact = -hero.vy; }
            hero.vy = 0; hero.groundId = support.id;
            return true;
        }

        /// <summary>Sub-stepped so a fast body cannot cross a thin wall or miss a landing.</summary>
        private static bool MoveBody(TraversalWorld world, HeroState hero, double dt, bool grounded, TraversalTuning T)
        {
            double speed = Math.Sqrt(hero.vx * hero.vx + hero.vy * hero.vy + hero.vz * hero.vz);
            int steps = Math.Max(1, (int)Math.Ceiling(speed * dt / T.maxMove));
            double sub = dt / steps;
            bool resting = grounded;
            for (int index = 0; index < steps; index++)
            {
                Slide(world, hero, hero.x + hero.vx * sub, hero.z + hero.vz * sub, resting ? T.stepHeight : T.airStepHeight, T);
                resting = Settle(world, hero, hero.y + hero.vy * sub, resting, T);
            }
            return resting;
        }

        private static void LimitSpeed(HeroState hero, double limit)
        {
            double speed = Math.Sqrt(hero.vx * hero.vx + hero.vy * hero.vy + hero.vz * hero.vz);
            if (speed > limit) { double scale = limit / speed; hero.vx *= scale; hero.vy *= scale; hero.vz *= scale; }
        }

        private static void Face(HeroState hero, double moveX, double moveZ, double magnitude, double dt, TraversalTuning T)
        {
            double flat = Math.Sqrt(hero.vx * hero.vx + hero.vz * hero.vz);
            double target = hero.yaw;
            if (flat > 0.4) target = Math.Atan2(hero.vx, hero.vz);
            else if (magnitude > 0.1) target = Math.Atan2(moveX, moveZ);
            double turn = T.turnRate * dt;
            double delta = WrapAngle(target - hero.yaw);
            // Leave a settled facing untouched: re-wrapping an unchanged angle adds rounding noise each step.
            if (Math.Abs(delta) > 1e-9) hero.yaw = WrapAngle(hero.yaw + TraversalGeometry.Clamp(delta, -turn, turn));
        }

        private static void Release(HeroState hero, bool jumpOff, TraversalTuning T)
        {
            hero.lastAnchorId = hero.tetherId; hero.lastAnchorAge = 0;
            hero.tetherId = ""; hero.mode = HeroMode.Air; hero.tetherCooldown = T.tetherRechain;
            hero.vx *= T.releaseBoost; hero.vz *= T.releaseBoost;
            if (jumpOff) hero.vy = Math.Max(hero.vy, 0) + T.jumpOffLift;
            else if (hero.vy > -2) hero.vy += T.releaseLift;
            hero.hopAvailable = true; hero.cutEligible = false;
            hero.events |= HeroEvent.Release;
        }

        /// <summary>Nearest of the last place the hero stood and the authored recovery spots.</summary>
        private static Recovery NearestRecovery(TraversalWorld world, HeroState hero)
        {
            Recovery best = null;
            double bestD2 = (hero.safeX - hero.x) * (hero.safeX - hero.x) + (hero.safeZ - hero.z) * (hero.safeZ - hero.z);
            foreach (var spot in world.recoveries)
            {
                double d2 = (spot.x - hero.x) * (spot.x - hero.x) + (spot.z - hero.z) * (spot.z - hero.z);
                if (d2 < bestD2) { bestD2 = d2; best = spot; }
            }
            return best;
        }

        private static void BeginCatch(TraversalWorld world, HeroState hero)
        {
            var spot = NearestRecovery(world, hero);
            if (spot != null) { hero.safeX = spot.x; hero.safeY = spot.y; hero.safeZ = spot.z; hero.safeYaw = spot.yaw; }
            hero.mode = HeroMode.Catch; hero.catchTime = 0;
            hero.catchX = hero.x; hero.catchY = hero.y; hero.catchZ = hero.z;
            hero.vx = 0; hero.vy = 0; hero.vz = 0;
            hero.tetherId = ""; hero.groundId = "";
            hero.events |= HeroEvent.Catch;
        }

        private static void StepCatch(TraversalWorld world, HeroState hero, double dt, TraversalTuning T)
        {
            hero.catchTime += dt;
            double span = Math.Sqrt((hero.safeX - hero.catchX) * (hero.safeX - hero.catchX) + (hero.safeZ - hero.catchZ) * (hero.safeZ - hero.catchZ));
            double u = Math.Min(1, hero.catchTime / TraversalGeometry.Clamp(span / T.catchSpeed, T.catchDuration, T.catchMaxDuration));
            double ease = u * u * (3 - 2 * u);
            hero.x = hero.catchX + (hero.safeX - hero.catchX) * ease;
            hero.z = hero.catchZ + (hero.safeZ - hero.catchZ) * ease;
            hero.y = hero.catchY + (hero.safeY - hero.catchY) * ease + Math.Sin(Math.PI * u) * T.catchArc;
            hero.airTime += dt;
            if (u < 1) return;
            hero.x = hero.safeX; hero.y = hero.safeY; hero.z = hero.safeZ; hero.yaw = hero.safeYaw;
            hero.mode = HeroMode.Ground; hero.groundId = TraversalGeometry.SupportAt(world, hero.x, hero.z, hero.y, T.stepHeight, T.edgeGrace).id;
            hero.groundTime = 0; hero.airTime = 0; hero.coyote = T.coyote; hero.hopAvailable = true;
            hero.events |= HeroEvent.Recover;
        }

        private static void StepSwing(TraversalWorld world, HeroState hero, double moveX, double moveZ, double magnitude, bool jumpPressed, bool power, double dt, TraversalTuning T)
        {
            var anchor = world.FindAnchor(hero.tetherId);
            if (anchor == null) { Release(hero, false, T); return; }
            double previousVy = hero.vy;
            hero.swingTime += dt; hero.airTime += dt; hero.coyote = 0;
            // Reel toward a rope that keeps the bottom of the arc clear, easing out near the target.
            if (hero.ropeLength > hero.ropeTarget)
                hero.ropeLength = Math.Max(hero.ropeTarget, hero.ropeLength - Math.Min(T.reelRate, (hero.ropeLength - hero.ropeTarget) * 5 + 0.6) * dt);
            hero.vy += T.swingGravity * dt;
            if (anchor.perch)
            {
                // A perch draws the hero in: drive toward it and bleed the sideways orbit.
                double toX = anchor.x - hero.x;
                double toZ = anchor.z - hero.z;
                double flatTo = Math.Sqrt(toX * toX + toZ * toZ);
                if (flatTo > 1e-6)
                {
                    double ux = toX / flatTo;
                    double uz = toZ / flatTo;
                    double side = hero.vx * -uz + hero.vz * ux;
                    double damp = Math.Min(1, T.perchSideDamp * dt);
                    hero.vx -= -uz * side * damp; hero.vz -= ux * side * damp;
                    hero.vx += ux * T.swingPump * dt; hero.vz += uz * T.swingPump * dt;
                }
            }
            else
            {
                // Keep the arc in the plane it began in so it passes under the anchor, then pump along
                // the stick (or current travel when only the tether is held) with limited sideways steer.
                double sx = hero.swingDirX;
                double sz = hero.swingDirZ;
                if ((hero.x - anchor.x) * sx + (hero.z - anchor.z) * sz < 0)
                {
                    double side = hero.vx * -sz + hero.vz * sx;
                    double damp = Math.Min(1, T.swingSideDamp * dt);
                    hero.vx -= -sz * side * damp; hero.vz -= sx * side * damp;
                }
                TravelDirection(hero, moveX, moveZ, out double driveX, out double driveZ);
                double strength = (magnitude > 0.2 ? magnitude : 1) * T.swingPump * dt;
                double along = driveX * sx + driveZ * sz;
                double lateral = (driveX * -sz + driveZ * sx) * T.swingSteer;
                hero.vx += (sx * along - sz * lateral) * strength;
                hero.vz += (sz * along + sx * lateral) * strength;
            }
            LimitSpeed(hero, T.swingMaxSpeed);
            if (MoveBody(world, hero, dt, false, T))
            {
                hero.lastAnchorId = hero.tetherId; hero.lastAnchorAge = 0;
                hero.tetherId = ""; hero.mode = HeroMode.Ground; hero.groundTime = 0; hero.airTime = 0;
                hero.hopAvailable = true; hero.coyote = T.coyote;
                return;
            }
            double rx = hero.x - anchor.x;
            double ry = hero.y + T.handHeight - anchor.y;
            double rz = hero.z - anchor.z;
            double distance = Math.Sqrt(rx * rx + ry * ry + rz * rz);
            bool taut = false;
            if (distance > hero.ropeLength && distance > 1e-9)
            {
                taut = true;
                rx /= distance; ry /= distance; rz /= distance;
                double excess = distance - hero.ropeLength;
                hero.x -= rx * excess; hero.y -= ry * excess; hero.z -= rz * excess;
                double outward = hero.vx * rx + hero.vy * ry + hero.vz * rz;
                if (outward > 0) { hero.vx -= outward * rx; hero.vy -= outward * ry; hero.vz -= outward * rz; }
                // The rope must never pull the body into a wall or an eave.
                Slide(world, hero, hero.x, hero.z, T.airStepHeight, T);
            }
            Face(hero, moveX, moveZ, magnitude, dt, T);
            if (jumpPressed) { Release(hero, true, T); return; }
            if (!power) { Release(hero, false, T); return; }
            if (hero.swingTime < T.swingMinTime) return;
            // Automatic launch on the far side of the arc, while there is still speed to carry.
            double awayX = hero.x - anchor.x;
            double awayZ = hero.z - anchor.z;
            // Only the far side counts: a hero who attached while drifting away must swing back first.
            bool leaving = awayX * hero.swingDirX + awayZ * hero.swingDirZ > 0 && awayX * hero.vx + awayZ * hero.vz > 0;
            double flat = Math.Sqrt(awayX * awayX + awayZ * awayZ);
            double below = anchor.y - (hero.y + T.handHeight);
            double speed = Math.Sqrt(hero.vx * hero.vx + hero.vy * hero.vy + hero.vz * hero.vz);
            if (anchor.perch && flat < T.perchRadius)
            {
                // Arrived: shed the swing's speed and drop onto the surface below the perch.
                Release(hero, false, T);
                hero.vx *= T.perchCarry; hero.vz *= T.perchCarry; hero.vy = Math.Min(hero.vy, 0);
                return;
            }
            if (taut && leaving && hero.vy > 0 && flat > below * T.releaseSpread) { Release(hero, false, T); return; }
            if (leaving && previousVy > 0 && hero.vy <= 0) { Release(hero, false, T); return; }
            if (hero.swingTime >= T.swingMaxTime || (hero.swingTime >= T.swingStallTime && speed < T.swingStallSpeed)) Release(hero, false, T);
        }

        private static void StepFree(TraversalWorld world, HeroState hero, double moveX, double moveZ, double magnitude,
            bool jumpPressed, bool jumpHeld, bool power, bool powerPressed, double dt, TraversalTuning T)
        {
            bool grounded = hero.mode == HeroMode.Ground;
            if (grounded)
            {
                double target = magnitude * (power ? T.sprintSpeed : T.runSpeed);
                double wantX = magnitude > 0 ? moveX / magnitude * target : 0;
                double wantZ = magnitude > 0 ? moveZ / magnitude * target : 0;
                double dvx = wantX - hero.vx;
                double dvz = wantZ - hero.vz;
                double gap = Math.Sqrt(dvx * dvx + dvz * dvz);
                double change = (magnitude > 0 ? T.groundAccel : T.groundBrake) * dt;
                if (gap <= change) { hero.vx = wantX; hero.vz = wantZ; }
                else { hero.vx += dvx / gap * change; hero.vz += dvz / gap * change; }
                hero.vy = 0;
            }
            else
            {
                double before = Math.Sqrt(hero.vx * hero.vx + hero.vz * hero.vz);
                if (magnitude > 0)
                {
                    hero.vx += moveX * T.airAccel * dt;
                    hero.vz += moveZ * T.airAccel * dt;
                    // Steering is free; gaining speed beyond what the hero carried is not.
                    double limit = Math.Max(before, T.airSpeed);
                    double after = Math.Sqrt(hero.vx * hero.vx + hero.vz * hero.vz);
                    if (after > limit) { hero.vx *= limit / after; hero.vz *= limit / after; }
                }
                else
                {
                    double drag = Math.Max(0, 1 - T.airDrag * dt);
                    hero.vx *= drag; hero.vz *= drag;
                }
            }
            bool jumped = false;
            if (hero.jumpBuffer > 0 && (grounded || hero.coyote > 0))
            {
                hero.vy = T.jumpSpeed; grounded = false; hero.mode = HeroMode.Air; hero.groundId = "";
                hero.coyote = 0; hero.jumpBuffer = 0; hero.cutEligible = true; hero.airTime = 0;
                hero.events |= HeroEvent.Jump; jumped = true;
            }
            else if (!grounded && jumpPressed && hero.hopAvailable)
            {
                hero.vy = T.hopSpeed; hero.hopAvailable = false; hero.jumpBuffer = 0; hero.cutEligible = false;
                if (magnitude > 0) { hero.vx += moveX / magnitude * T.hopPush; hero.vz += moveZ / magnitude * T.hopPush; }
                hero.events |= HeroEvent.Hop; jumped = true;
            }
            if (!grounded && !jumped && power && hero.tetherCooldown <= 0 && (powerPressed || hero.airTime >= T.tetherMinAir))
            {
                TravelDirection(hero, moveX, moveZ, out double dirX, out double dirZ);
                var anchor = SelectAnchor(world, hero, dirX, dirZ, hero.lastAnchorAge < T.tetherForget ? hero.lastAnchorId : "", T);
                if (anchor != null)
                {
                    double dx = hero.x - anchor.x;
                    double dy = hero.y + T.handHeight - anchor.y;
                    double dz = hero.z - anchor.z;
                    double distance = Math.Sqrt(dx * dx + dy * dy + dz * dz);
                    hero.tetherId = anchor.id; hero.mode = HeroMode.Swing; hero.swingTime = 0;
                    double flat = Math.Sqrt(dx * dx + dz * dz);
                    hero.swingDirX = flat > 1e-6 ? -dx / flat : dirX;
                    hero.swingDirZ = flat > 1e-6 ? -dz / flat : dirZ;
                    hero.ropeLength = distance;
                    hero.ropeTarget = Math.Min(distance, TraversalGeometry.Clamp(anchor.y - T.handHeight - anchor.floor - T.swingClearance, T.ropeMin, T.ropeMax));
                    hero.hopAvailable = true; hero.cutEligible = false;
                    hero.events |= HeroEvent.Attach;
                    return;
                }
            }
            if (!grounded)
            {
                double gravity = hero.vy > 0 ? (hero.cutEligible && !jumpHeld ? T.gravityCut : T.gravityRise) : T.gravityFall;
                hero.vy = Math.Max(-T.terminal, hero.vy + gravity * dt);
            }
            LimitSpeed(hero, T.maxSpeed);
            bool resting = MoveBody(world, hero, dt, grounded, T);
            Face(hero, moveX, moveZ, magnitude, dt, T);
            if (resting)
            {
                if (hero.mode != HeroMode.Ground) { hero.groundTime = 0; hero.hopAvailable = true; }
                hero.mode = HeroMode.Ground; hero.groundTime += dt; hero.airTime = 0; hero.coyote = T.coyote; hero.cutEligible = false;
            }
            else
            {
                if (hero.mode == HeroMode.Ground) { hero.groundId = ""; hero.airTime = 0; }
                hero.mode = HeroMode.Air; hero.groundTime = 0; hero.airTime += dt;
                hero.coyote = Math.Max(0, hero.coyote - dt);
            }
        }

        /// <summary>True when a standing body at these feet overlaps no solid it could not step onto.</summary>
        private static bool BodyFits(TraversalWorld world, double x, double z, double feet, TraversalTuning T)
        {
            foreach (var solid in world.solids)
            {
                double cx = TraversalGeometry.Clamp(x, solid.minX, solid.maxX);
                double cz = TraversalGeometry.Clamp(z, solid.minZ, solid.maxZ);
                double dx = x - cx;
                double dz = z - cz;
                if (dx * dx + dz * dz >= T.radius * T.radius - 1e-10) continue;
                if (TraversalGeometry.TopAt(solid, cx, cz) <= feet + T.stepHeight || solid.minY >= feet + T.height) continue;
                return false;
            }
            return true;
        }

        /// <summary>
        /// Spider Climb: walking into a marked face grabs it. Nothing else in the level is climbable.
        /// Returns true when the hero attached this step.
        /// </summary>
        private static bool TryClimb(TraversalWorld world, HeroState hero, double moveX, double moveZ, double magnitude, TraversalTuning T)
        {
            if (world.climbs == null || hero.climbCooldown > 0 || magnitude <= 0 || (hero.mode != HeroMode.Ground && hero.mode != HeroMode.Air)) return false;
            foreach (var surface in world.climbs)
            {
                bool alongX = surface.alongX;
                double outward = ((alongX ? hero.z : hero.x) - surface.at) * surface.facing;
                if (outward < -1e-6 || outward > T.radius + T.climbReach) continue;
                double along = alongX ? hero.x : hero.z;
                if (along < surface.min + T.radius || along > surface.max - T.radius) continue;
                if (hero.y < surface.minY - 0.05 || hero.y > surface.maxY - 0.02) continue;
                // Pushing toward the wall is what asks for the climb.
                if (-(alongX ? moveZ : moveX) * surface.facing < T.climbPush) continue;
                if (alongX) hero.z = surface.at + surface.facing * T.radius; else hero.x = surface.at + surface.facing * T.radius;
                hero.mode = HeroMode.Climb; hero.climbId = surface.id;
                hero.vx = 0; hero.vy = 0; hero.vz = 0;
                hero.yaw = alongX ? (surface.facing > 0 ? Math.PI : 0) : (surface.facing > 0 ? -Math.PI / 2 : Math.PI / 2);
                hero.groundId = ""; hero.tetherId = ""; hero.jumpBuffer = 0; hero.cutEligible = false; hero.hopAvailable = true;
                hero.airTime = 0; hero.groundTime = 0; hero.coyote = 0;
                hero.events |= HeroEvent.Climb;
                return true;
            }
            return false;
        }

        private static void StepClimb(TraversalWorld world, HeroState hero, double moveX, double moveZ, bool jumpPressed, double dt, TraversalTuning T)
        {
            var surface = world.FindClimb(hero.climbId);
            if (surface == null) { hero.mode = HeroMode.Air; hero.climbId = ""; return; }
            bool alongX = surface.alongX;
            double nx = alongX ? 0 : surface.facing;
            double nz = alongX ? surface.facing : 0;
            double into = -(moveX * nx + moveZ * nz);
            // The stick is a world-space intent, so its part along the wall shuffles the same way in the world.
            double side = alongX ? moveX : moveZ;
            hero.vx = 0; hero.vy = 0; hero.vz = 0;
            hero.airTime = 0; hero.groundTime = 0; hero.coyote = 0;
            if (jumpPressed)
            {
                hero.mode = HeroMode.Air; hero.climbId = ""; hero.climbCooldown = T.climbCooldown;
                hero.vx = nx * T.wallJumpOut + (alongX ? side * 2 : 0); hero.vz = nz * T.wallJumpOut + (alongX ? 0 : side * 2); hero.vy = T.wallJumpUp;
                hero.hopAvailable = true; hero.cutEligible = false; hero.jumpBuffer = 0;
                hero.yaw = Math.Atan2(nx, nz);
                hero.events |= HeroEvent.Jump;
                return;
            }
            double was = alongX ? hero.x : hero.z;
            double fromY = hero.y;
            double along = TraversalGeometry.Clamp(was + side * T.climbSide * dt, surface.min + T.radius, surface.max - T.radius);
            if (alongX) hero.x = along; else hero.z = along;
            double y = hero.y + (into > 0 ? into * T.climbSpeed : into * T.climbDown) * dt;
            if (into < 0)
            {
                // Stepping off at the foot of the wall.
                var floor = TraversalGeometry.SupportAt(world, hero.x, hero.z, hero.y, T.stepHeight);
                if (y <= floor.height)
                {
                    hero.y = floor.height; hero.mode = HeroMode.Ground; hero.groundId = floor.id; hero.climbId = "";
                    hero.coyote = T.coyote; hero.climbCooldown = T.climbCooldown;
                    return;
                }
                if (y < surface.minY) y = surface.minY;
            }
            double hold = surface.maxY - T.climbTop;
            if (y >= hold)
            {
                if (into > 0.2)
                {
                    double topX = hero.x - nx * (T.radius + T.mantleInset);
                    double topZ = hero.z - nz * (T.radius + T.mantleInset);
                    var top = TraversalGeometry.SupportAt(world, topX, topZ, surface.maxY, T.stepHeight);
                    if (top.height >= surface.maxY - T.stepHeight && top.bounce <= 0 && BodyFits(world, topX, topZ, top.height, T))
                    {
                        hero.x = topX; hero.z = topZ; hero.y = top.height;
                        hero.mode = HeroMode.Ground; hero.groundId = top.id; hero.climbId = "";
                        hero.coyote = T.coyote; hero.hopAvailable = true;
                        hero.events |= HeroEvent.Mantle;
                        return;
                    }
                }
                y = hold;
            }
            hero.y = y;
            // Report the real motion on the wall; every way off the wall sets its own velocity above.
            hero.vy = (y - fromY) / dt;
            if (alongX) hero.vx = (along - was) / dt; else hero.vz = (along - was) / dt;
        }

        /// <summary>Advance one fixed step. The input state is never mutated.</summary>
        public static HeroState Step(TraversalWorld world, HeroState state, HeroInput input, double dt = TraversalTuning.Step, TraversalTuning tuning = null)
        {
            if (!TraversalGeometry.Finite(dt) || dt <= 0) return state;
            var T = tuning ?? TraversalTuning.Default;
            var hero = state.Clone();
            hero.events = HeroEvent.None; hero.impact = 0;
            double moveX = TraversalGeometry.Finite(input.moveX) ? input.moveX : 0;
            double moveZ = TraversalGeometry.Finite(input.moveZ) ? input.moveZ : 0;
            double magnitude = Math.Sqrt(moveX * moveX + moveZ * moveZ);
            if (magnitude > 1) { moveX /= magnitude; moveZ /= magnitude; magnitude = 1; }
            bool jumpHeld = input.jump;
            bool power = input.power;
            bool jumpPressed = jumpHeld && !state.jumpHeld;
            bool powerPressed = power && !state.powerHeld;
            hero.jumpHeld = jumpHeld; hero.powerHeld = power;
            hero.jumpBuffer = jumpPressed ? T.jumpBuffer : Math.Max(0, state.jumpBuffer - dt);
            hero.tetherCooldown = Math.Max(0, state.tetherCooldown - dt);
            hero.lastAnchorAge = state.lastAnchorAge + dt;
            hero.climbCooldown = Math.Max(0, state.climbCooldown - dt);
            if (hero.mode == HeroMode.Catch) { StepCatch(world, hero, dt, T); return hero; }
            if (hero.mode == HeroMode.Climb) StepClimb(world, hero, moveX, moveZ, jumpPressed, dt, T);
            else if (hero.mode == HeroMode.Swing) StepSwing(world, hero, moveX, moveZ, magnitude, jumpPressed, power, dt, T);
            else
            {
                StepFree(world, hero, moveX, moveZ, magnitude, jumpPressed, jumpHeld, power, powerPressed, dt, T);
                TryClimb(world, hero, moveX, moveZ, magnitude, T);
            }
            var zone = TraversalGeometry.WaterAt(world, hero.x, hero.z);
            bool finite = TraversalGeometry.Finite(hero.x) && TraversalGeometry.Finite(hero.y) && TraversalGeometry.Finite(hero.z);
            if ((zone != null && hero.y < T.catchDepth) || hero.y < -6 || !finite)
            {
                if (!finite) { hero.x = hero.safeX; hero.y = hero.safeY; hero.z = hero.safeZ; }
                BeginCatch(world, hero);
            }
            else if (hero.mode == HeroMode.Ground && hero.groundTime >= T.safeDelay && hero.y > T.catchDepth)
            {
                hero.safeX = hero.x; hero.safeY = hero.y; hero.safeZ = hero.z; hero.safeYaw = hero.yaw;
            }
            return hero;
        }

        /// <summary>Cancel motion a paused or refocused player did not ask for; height and tether are kept.</summary>
        public static HeroState Settle(HeroState state)
        {
            var hero = state.Clone();
            hero.jumpHeld = false; hero.powerHeld = false; hero.jumpBuffer = 0;
            if (hero.mode == HeroMode.Ground) { hero.vx = 0; hero.vy = 0; hero.vz = 0; }
            return hero;
        }
    }

    /// <summary>One-time practice pickups. Idempotent: a spark already held is never awarded again.</summary>
    public static class PracticeSparks
    {
        public const double Radius = 1.5;
        /// <summary>Hero centre above the feet, used for pickups.</summary>
        public const double HeroCenter = 0.9;

        /// <summary>
        /// Adds every uncollected spark the hero's centre touches to <paramref name="collected"/>.
        /// Returns true when something new was found; the caller makes that durable at once.
        /// </summary>
        public static bool Collect(TraversalWorld world, HeroState hero, ISet<string> collected)
        {
            bool found = false;
            foreach (var spark in world.sparks)
            {
                if (collected.Contains(spark.id)) continue;
                double dx = spark.x - hero.x;
                double dy = spark.y - (hero.y + HeroCenter);
                double dz = spark.z - hero.z;
                if (dx * dx + dy * dy + dz * dz <= Radius * Radius) { collected.Add(spark.id); found = true; }
            }
            return found;
        }
    }
}
