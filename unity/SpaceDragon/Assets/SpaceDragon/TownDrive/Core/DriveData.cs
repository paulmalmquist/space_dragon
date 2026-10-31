using System;
using System.Runtime.Serialization;

namespace SpaceDragon.TownDrive
{
    // Public fields intentionally match the versioned JSON exactly. Unity and
    // native hosts provide serialization; the core has no engine dependency.
    [Serializable] public struct DrivePoint { [OptionalField] public double x, z; }
    [Serializable] public struct DrivePose { [OptionalField] public double x, z, yaw, speed; }
    [Serializable] public struct RouteSample { [OptionalField] public double x, z, yaw, s; [OptionalField] public int sectionIndex; }
    [Serializable] public struct NearestRoutePoint
    { [OptionalField] public double x, z, yaw, s, distance, signedOffset; [OptionalField] public int sectionIndex; }
    [Serializable] public sealed class RouteSection
    {
        [OptionalField] public string id, label, character;
        [OptionalField] public bool invented;
        [OptionalField] public int lanes;
        [OptionalField] public double startS, endS, laneWidth, medianWidth, curbWidth, sidewalkWidth, landscapingDensity, poleSpacing;
    }
    [Serializable] public sealed class RouteCheckpoint
    { [OptionalField] public string id, label; [OptionalField] public double x, z, yaw, s; [OptionalField] public int sectionIndex; }
    [Serializable] public sealed class RouteTurn
    { [OptionalField] public string id, direction, reference; [OptionalField] public double s, approachS, exitS, radius; [OptionalField] public int fromSection, toSection; }
    [Serializable] public sealed class RouteStreetSpan
    { [OptionalField] public string label; [OptionalField] public double fromS, toS; [OptionalField] public bool invented; }
    [Serializable] public struct RouteSpan { [OptionalField] public double fromS, toS; }
    [Serializable] public struct PedestrianSafeSpan { [OptionalField] public double fromS, toS; [OptionalField] public int sectionIndex; }
    [Serializable] public sealed class TrafficBridge
    { [OptionalField] public double fromS, toS, length; [OptionalField] public DrivePoint[] points; }
    [Serializable] public sealed class DriveRouteData
    {
        [OptionalField] public string id;
        [OptionalField] public double length, bulbStartS, returnMappedStartS, gateS, homeExitSignalS, estimatedDistanceScale, expectedCruiseSeconds;
        [OptionalField] public DrivePose spawn;
        [OptionalField] public RouteSample[] samples;
        [OptionalField] public RouteSection[] sections;
        [OptionalField] public RouteCheckpoint[] checkpoints;
        [OptionalField] public RouteTurn[] turns;
        [OptionalField] public RouteStreetSpan[] streetSpans;
        [OptionalField] public RouteSpan[] sharedRoadSpans, visibleRoadSpans;
        [OptionalField] public PedestrianSafeSpan[] safePedestrianSpans;
        [OptionalField] public TrafficBridge trafficBridge;
    }
    [Serializable] public sealed class DriveConfig
    {
        [OptionalField] public double topSpeed = 25, acceleration = 25.0 / 6, braking = 10, reverseSpeed = 6;
        [OptionalField] public double steeringRate = 1.75, highSpeedSteering = .3, grip = 8, handbrakeGrip = 1.5;
        [OptionalField] public double offroadMultiplier = .4, assistTopSpeed = 15, assistStrength = 1.8, corridorMargin = 18, stuckResetSeconds = 2;
        public bool IsValid()
        {
            var values = new[] { topSpeed, acceleration, braking, reverseSpeed, steeringRate, highSpeedSteering,
                grip, handbrakeGrip, offroadMultiplier, assistTopSpeed, assistStrength, corridorMargin, stuckResetSeconds };
            foreach (var value in values) if (!DriveMath.Finite(value) || value <= 0) return false;
            return topSpeed <= 40 && assistTopSpeed <= topSpeed && reverseSpeed <= 10 && highSpeedSteering <= 1 && offroadMultiplier <= 1 && corridorMargin <= 40;
        }
    }
    [Serializable] public struct DriveInput { [OptionalField] public double throttle, brake, steer; [OptionalField] public bool handbrake, paused; }
    [Serializable] public struct DriveObstacle { [OptionalField] public string id; [OptionalField] public double x, z, radius; }
    [Serializable] public sealed class DriveState
    {
        [OptionalField] public double x, z, yaw, speed, velocityX, velocityZ, routeS, stuckSeconds, bonkSeconds, elapsedSeconds;
        [OptionalField] public string checkpointId;
        [OptionalField] public string[] visited;
        [OptionalField] public bool completed, assist;
        public DriveState Clone()
        {
            var copy = (DriveState)MemberwiseClone();
            copy.visited = visited == null ? null : (string[])visited.Clone();
            return copy;
        }
        public DrivePose Pose() => new DrivePose { x = x, z = z, yaw = yaw, speed = speed };
    }
    [Serializable] public sealed class SourceHash { [OptionalField] public string path, sha256; }
    [Serializable] public sealed class TownDriveData
    {
        [OptionalField] public int schemaVersion;
        [OptionalField] public string routeId, sourceFingerprint, sourceRevision, units, axes, attribution, attributionUrl;
        [OptionalField] public SourceHash[] sourceHashes;
        [OptionalField] public DriveConfig config;
        [OptionalField] public DriveRouteData route;
        [OptionalField] public DriveObstacle[] closureObstacles;
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
