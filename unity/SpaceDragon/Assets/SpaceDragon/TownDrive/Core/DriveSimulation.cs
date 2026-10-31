using System;

namespace SpaceDragon.TownDrive
{
    /// <summary>Authoritative arcade driving, independent of rendering, wall time, input devices and storage.</summary>
    public sealed class DriveSimulation
    {
        public const double StepSeconds = 1.0 / 60;
        public readonly DriveRoute Route;
        private readonly DriveConfig defaultConfig = new DriveConfig();
        public DriveSimulation(DriveRoute route) { Route = route ?? throw new ArgumentNullException(nameof(route)); }
        public DriveState CreateState(bool assist = false) => new DriveState {
            x = Route.Data.spawn.x, z = Route.Data.spawn.z, yaw = Route.Data.spawn.yaw,
            checkpointId = "home", visited = new[] { "home" }, assist = assist
        };
        public DriveState Reset(DriveState state)
        {
            var checkpoint = Route.Data.checkpoints[0];
            foreach (var candidate in Route.Data.checkpoints) if (candidate.id == state.checkpointId) { checkpoint = candidate; break; }
            var next = state.Clone(); next.x = checkpoint.x; next.z = checkpoint.z; next.yaw = checkpoint.yaw; next.routeS = checkpoint.s;
            next.speed = next.velocityX = next.velocityZ = next.stuckSeconds = next.bonkSeconds = 0; return next;
        }
        public DriveState UpdateCheckpoints(DriveState previous, DriveState next)
        {
            if (next.completed) return next;
            if (next.visited.Length < Route.Data.checkpoints.Length)
            {
                var expected = Route.Data.checkpoints[next.visited.Length];
                bool forward = previous.routeS <= expected.s && next.routeS >= expected.s && next.routeS - previous.routeS < 12;
                if (forward && DriveMath.Hypot(next.x - expected.x, next.z - expected.z) < 11 &&
                    Math.Abs(DriveMath.AngleDelta(next.yaw, expected.yaw)) < Math.PI / 2)
                {
                    var awarded = next.Clone(); awarded.checkpointId = expected.id;
                    Array.Resize(ref awarded.visited, awarded.visited.Length + 1); awarded.visited[awarded.visited.Length - 1] = expected.id; return awarded;
                }
            }
            else if (previous.routeS > Route.Length - 15 && next.routeS < 15 && next.speed > 0)
            { var completed = next.Clone(); completed.checkpointId = "home"; completed.completed = true; return completed; }
            return next;
        }
        public DriveState Step(DriveState state, DriveInput input, DriveConfig config = null, DriveObstacle[] obstacles = null)
        {
            if (input.paused) return state;
            if (!DriveMath.Finite(state.x) || !DriveMath.Finite(state.z) || !DriveMath.Finite(state.yaw) || !DriveMath.Finite(state.speed)) return Reset(state);
            config = config ?? defaultConfig;
            var road = Route.Nearest(state.x, state.z, state.routeS); var section = Route.Data.sections[road.sectionIndex];
            double halfRoad = DriveRoute.RoadHalfWidth(section); bool offroad = road.distance > halfRoad;
            double throttle = DriveMath.Clean(input.throttle, 0, 1), brake = DriveMath.Clean(input.brake, 0, 1), steer = DriveMath.Clean(input.steer, -1, 1);
            double topSpeed = state.assist ? Math.Min(config.topSpeed, config.assistTopSpeed) : config.topSpeed;
            double cap = topSpeed * (offroad ? config.offroadMultiplier : 1), speed = state.speed;
            if (throttle > 0) speed += (speed < -.05 ? config.braking : config.acceleration) * throttle * StepSeconds;
            if (brake > 0) { if (speed > 0) speed = Math.Max(0, speed - config.braking * brake * StepSeconds); else speed -= config.acceleration * brake * StepSeconds; }
            if (throttle == 0 && brake == 0) speed *= Math.Exp(-.22 * StepSeconds);
            if (input.handbrake) speed *= Math.Exp(-StepSeconds);
            speed = DriveMath.Clamp(speed, -config.reverseSpeed * (offroad ? config.offroadMultiplier : 1), cap);
            if (state.assist && speed > .1)
            {
                var look = Route.PointAtDistance(road.s + 10 + speed * .5);
                double offset = Math.Min(DriveRoute.LaneOffset(section), DriveRoute.LaneOffset(Route.Data.sections[look.sectionIndex]));
                double targetX = look.x + Math.Cos(look.yaw) * offset, targetZ = look.z - Math.Sin(look.yaw) * offset;
                double correction = DriveMath.AngleDelta(Math.Atan2(targetX - state.x, targetZ - state.z), state.yaw);
                steer = DriveMath.Clamp(steer + DriveMath.Clamp(correction * config.assistStrength, -.55, .55), -1, 1);
                double lateral = Math.Sin(DriveMath.AngleDelta(state.yaw, road.yaw)) * speed;
                if (road.distance > halfRoad - .9 && road.signedOffset * lateral > 0) speed = Math.Max(0, speed - config.braking * 2 * StepSeconds);
            }
            double sensitivity = 1 - (1 - config.highSpeedSteering) * DriveMath.Clamp(Math.Abs(speed) / config.topSpeed, 0, 1);
            double turnScale = Math.Min(1, Math.Abs(speed) / 3) * Math.Sign(speed);
            double yaw = state.yaw + steer * config.steeringRate * sensitivity * turnScale * StepSeconds;
            double grip = 1 - Math.Exp(-(input.handbrake ? config.handbrakeGrip : config.grip) * StepSeconds);
            double velocityX = state.velocityX + (Math.Sin(yaw) * speed - state.velocityX) * grip;
            double velocityZ = state.velocityZ + (Math.Cos(yaw) * speed - state.velocityZ) * grip;
            double x = state.x + velocityX * StepSeconds, z = state.z + velocityZ * StepSeconds;
            var nearest = Route.Nearest(x, z, road.s); var nextSection = Route.Data.sections[nearest.sectionIndex];
            bool bonked = false; double corridor = DriveRoute.RoadHalfWidth(nextSection) + config.corridorMargin;
            if (nearest.distance > corridor)
            { double scale = corridor / nearest.distance; x = nearest.x + (x - nearest.x) * scale; z = nearest.z + (z - nearest.z) * scale; bonked = true; }
            bool intersection = false;
            foreach (var turn in Route.Data.turns) if (Math.Abs(nearest.s - turn.s) < 38) { intersection = true; break; }
            if (!intersection) foreach (var checkpoint in Route.Data.checkpoints) if (Math.Abs(nearest.s - checkpoint.s) < 18) { intersection = true; break; }
            double medianLimit = nextSection.medianWidth / 2 + .85;
            if (nextSection.medianWidth > 0 && !intersection && Math.Abs(nearest.signedOffset) < medianLimit)
            { double side = road.signedOffset < 0 ? -1 : 1; x = nearest.x + Math.Cos(nearest.yaw) * medianLimit * side; z = nearest.z - Math.Sin(nearest.yaw) * medianLimit * side; bonked = true; }
            if (obstacles != null) foreach (var obstacle in obstacles)
            {
                double dx = x - obstacle.x, dz = z - obstacle.z, length = DriveMath.Hypot(dx, dz), radius = obstacle.radius + 1;
                if (length >= radius) continue;
                x = obstacle.x + (length > .001 ? dx / length : 1) * radius; z = obstacle.z + (length > .001 ? dz / length : 0) * radius; bonked = true;
            }
            if (bonked) { speed *= .35; velocityX *= .2; velocityZ *= .2; }
            nearest = Route.Nearest(x, z, nearest.s);
            double stuck = (throttle > .25 || brake > .25) && (bonked || Math.Abs(speed) < .35) ? state.stuckSeconds + StepSeconds : 0;
            var next = state.Clone(); next.x = x; next.z = z; next.yaw = yaw; next.speed = speed; next.velocityX = velocityX; next.velocityZ = velocityZ;
            next.routeS = nearest.s; next.stuckSeconds = stuck; next.bonkSeconds = bonked ? .35 : Math.Max(0, state.bonkSeconds - StepSeconds); next.elapsedSeconds = state.elapsedSeconds + StepSeconds;
            return stuck >= config.stuckResetSeconds ? Reset(next) : UpdateCheckpoints(state, next);
        }
    }
}
