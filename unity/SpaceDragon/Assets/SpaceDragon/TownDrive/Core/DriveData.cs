using System;

namespace SpaceDragon.TownDrive
{
    // Public fields intentionally match the versioned JSON exactly. Unity and
    // native hosts provide serialization; the core has no engine dependency.
    [Serializable] public struct DrivePoint { public double x, z; }
    [Serializable] public struct DrivePose { public double x, z, yaw, speed; }
    [Serializable] public struct RouteSample { public double x, z, yaw, s; public int sectionIndex; }
    [Serializable] public struct NearestRoutePoint
    { public double x, z, yaw, s, distance, signedOffset; public int sectionIndex; }
    [Serializable] public sealed class RouteSection
    {
        public string id, label, character;
        public bool invented;
        public int lanes;
        public double startS, endS, laneWidth, medianWidth, curbWidth, sidewalkWidth, landscapingDensity, poleSpacing;
    }
    [Serializable] public sealed class RouteCheckpoint
    { public string id, label; public double x, z, yaw, s; public int sectionIndex; }
    [Serializable] public sealed class RouteTurn
    { public string id, direction, reference; public double s, approachS, exitS, radius; public int fromSection, toSection; }
    [Serializable] public sealed class RouteStreetSpan
    { public string label; public double fromS, toS; public bool invented; }
    [Serializable] public struct RouteSpan { public double fromS, toS; }
    [Serializable] public struct PedestrianSafeSpan { public double fromS, toS; public int sectionIndex; }
    [Serializable] public sealed class TrafficBridge
    { public double fromS, toS, length; public DrivePoint[] points; }
    [Serializable] public sealed class DriveRouteData
    {
        public string id;
        public double length, bulbStartS, returnMappedStartS, gateS, homeExitSignalS, estimatedDistanceScale, expectedCruiseSeconds;
        public DrivePose spawn;
        public RouteSample[] samples;
        public RouteSection[] sections;
        public RouteCheckpoint[] checkpoints;
        public RouteTurn[] turns;
        public RouteStreetSpan[] streetSpans;
        public RouteSpan[] sharedRoadSpans, visibleRoadSpans;
        public PedestrianSafeSpan[] safePedestrianSpans;
        public TrafficBridge trafficBridge;
    }
    [Serializable] public sealed class DriveConfig
    {
        public double topSpeed = 25, acceleration = 25.0 / 6, braking = 10, reverseSpeed = 6;
        public double steeringRate = 1.75, highSpeedSteering = .3, grip = 8, handbrakeGrip = 1.5;
        public double offroadMultiplier = .4, assistTopSpeed = 15, assistStrength = 1.8, corridorMargin = 18, stuckResetSeconds = 2;
        public bool IsValid()
        {
            var values = new[] { topSpeed, acceleration, braking, reverseSpeed, steeringRate, highSpeedSteering,
                grip, handbrakeGrip, offroadMultiplier, assistTopSpeed, assistStrength, corridorMargin, stuckResetSeconds };
            foreach (var value in values) if (!DriveMath.Finite(value) || value <= 0) return false;
            return topSpeed <= 40 && assistTopSpeed <= topSpeed && reverseSpeed <= 10 && highSpeedSteering <= 1 && offroadMultiplier <= 1 && corridorMargin <= 40;
        }
    }
    [Serializable] public struct DriveInput { public double throttle, brake, steer; public bool handbrake, paused; }
    [Serializable] public struct DriveObstacle { public string id; public double x, z, radius; }
    [Serializable] public sealed class DriveState
    {
        public double x, z, yaw, speed, velocityX, velocityZ, routeS, stuckSeconds, bonkSeconds, elapsedSeconds;
        public string checkpointId;
        public string[] visited;
        public bool completed, assist;
        public DriveState Clone()
        {
            var copy = (DriveState)MemberwiseClone();
            copy.visited = visited == null ? null : (string[])visited.Clone();
            return copy;
        }
        public DrivePose Pose() => new DrivePose { x = x, z = z, yaw = yaw, speed = speed };
    }
    [Serializable] public sealed class SourceHash { public string path, sha256; }
    [Serializable] public sealed class TownDriveData
    {
        public int schemaVersion;
        public string routeId, sourceFingerprint, sourceRevision, units, axes, attribution, attributionUrl;
        public SourceHash[] sourceHashes;
        public DriveConfig config;
        public DriveRouteData route;
        public DriveObstacle[] closureObstacles;
        // Geographic scenery remains in the same JSON. Its adapter is owned by
        // the Unity presentation layer, not by authoritative driving state.
    }
    internal static class DriveMath
    {
        public static bool Finite(double value) => !double.IsNaN(value) && !double.IsInfinity(value);
        public static double Clamp(double value, double min, double max) => Math.Max(min, Math.Min(max, value));
        public static double Clean(double value, double min, double max) => Finite(value) ? Clamp(value, min, max) : 0;
        public static double Hypot(double x, double z) => Math.Sqrt(x * x + z * z);
        public static double AngleDelta(double to, double from) => Math.Atan2(Math.Sin(to - from), Math.Cos(to - from));
        public static double Wrap(double value, double length) => ((value % length) + length) % length;
    }
}
