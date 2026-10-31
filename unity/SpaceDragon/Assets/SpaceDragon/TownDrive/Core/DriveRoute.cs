using System;

namespace SpaceDragon.TownDrive
{
    /// <summary>Queries the exported, verified polyline; never reconstructs or rescales it.</summary>
    public sealed class DriveRoute
    {
        public readonly DriveRouteData Data;
        public double Length => Data.length;
        public DriveRoute(DriveRouteData data)
        {
            if (data == null || !DriveMath.Finite(data.length) || data.length <= 0 || data.samples == null ||
                data.samples.Length < 2 || data.sections == null || data.sections.Length == 0 ||
                data.checkpoints == null || data.checkpoints.Length == 0 || data.turns == null || data.streetSpans == null)
                throw new ArgumentException("Incomplete Town Drive route.", nameof(data));
            for (int i = 0; i < data.samples.Length; i++)
            {
                var sample = data.samples[i];
                if (!DriveMath.Finite(sample.x) || !DriveMath.Finite(sample.z) || !DriveMath.Finite(sample.s) ||
                    (i > 0 && sample.s <= data.samples[i - 1].s)) throw new ArgumentException("Invalid route samples.", nameof(data));
            }
            if (Math.Abs(data.samples[0].s) > 1e-9 || Math.Abs(data.samples[data.samples.Length - 1].s - data.length) > 1e-7)
                throw new ArgumentException("Route sample extent differs from its length.", nameof(data));
            for (int i = 0; i < data.sections.Length; i++)
            {
                var section = data.sections[i];
                if (section == null || section.lanes < 1 || !DriveMath.Finite(section.laneWidth) || section.laneWidth <= 0 ||
                    !DriveMath.Finite(section.medianWidth) || section.medianWidth < 0 || !DriveMath.Finite(section.endS) ||
                    section.endS <= section.startS || Math.Abs(section.startS - (i == 0 ? 0 : data.sections[i - 1].endS)) > 1e-7)
                    throw new ArgumentException("Invalid or disconnected route section.", nameof(data));
            }
            if (Math.Abs(data.sections[data.sections.Length - 1].endS - data.length) > 1e-7)
                throw new ArgumentException("Route sections do not cover the full route.", nameof(data));
            Data = data;
        }
        public static double RoadHalfWidth(RouteSection section) => section.lanes * section.laneWidth + section.medianWidth / 2;
        public static double LaneOffset(RouteSection section) => section.medianWidth / 2 + section.laneWidth / 2;
        private int SectionAt(double s)
        {
            for (int i = 0; i < Data.sections.Length; i++)
                if (s >= Data.sections[i].startS && s < Data.sections[i].endS) return i;
            return 0;
        }
        public RouteSample PointAtDistance(double s)
        {
            if (!DriveMath.Finite(s)) throw new ArgumentOutOfRangeException(nameof(s));
            double wrapped = DriveMath.Wrap(s, Length);
            int lo = 0, hi = Data.samples.Length - 1;
            while (lo + 1 < hi) { int mid = (lo + hi) >> 1; if (Data.samples[mid].s <= wrapped) lo = mid; else hi = mid; }
            var a = Data.samples[lo]; var b = Data.samples[hi];
            double t = (wrapped - a.s) / (b.s - a.s);
            return new RouteSample { x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t,
                yaw = Math.Atan2(b.x - a.x, b.z - a.z), s = wrapped, sectionIndex = SectionAt(wrapped) };
        }
        public RouteSample LanePoseAt(double s)
        {
            var point = PointAtDistance(s); double offset = LaneOffset(Data.sections[point.sectionIndex]);
            point.x += Math.Cos(point.yaw) * offset; point.z -= Math.Sin(point.yaw) * offset; return point;
        }
        public NearestRoutePoint Nearest(double x, double z, double? preferredS = null)
        {
            if (!DriveMath.Finite(x) || !DriveMath.Finite(z)) throw new ArgumentOutOfRangeException("Route query position");
            var first = Data.samples[0];
            var best = new NearestRoutePoint { x = first.x, z = first.z, yaw = first.yaw, s = first.s, sectionIndex = first.sectionIndex, distance = double.PositiveInfinity };
            var local = new NearestRoutePoint(); bool hasLocal = false; double localProgress = double.PositiveInfinity;
            for (int i = 0; i < Data.samples.Length - 1; i++)
            {
                var a = Data.samples[i]; var b = Data.samples[i + 1]; double dx = b.x - a.x, dz = b.z - a.z;
                double t = DriveMath.Clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
                double px = a.x + dx * t, pz = a.z + dz * t, yaw = Math.Atan2(dx, dz), rawS = a.s + (b.s - a.s) * t;
                double s = rawS >= Length - 1e-9 ? 0 : rawS;
                var candidate = new NearestRoutePoint { x = px, z = pz, yaw = yaw, s = s, sectionIndex = SectionAt(s),
                    distance = DriveMath.Hypot(x - px, z - pz), signedOffset = (x - px) * Math.Cos(yaw) - (z - pz) * Math.Sin(yaw) };
                if (candidate.distance < best.distance) best = candidate;
                if (preferredS.HasValue && DriveMath.Finite(preferredS.Value))
                {
                    // Match the TS progress window, including remainder semantics.
                    double progress = Math.Abs(((s - preferredS.Value + Length * 1.5) % Length) - Length / 2);
                    if (progress < 18 && (!hasLocal || candidate.distance < local.distance - .00001 ||
                        (Math.Abs(candidate.distance - local.distance) < .00001 && progress < localProgress)))
                    { local = candidate; localProgress = progress; hasLocal = true; }
                }
            }
            return hasLocal && local.distance <= best.distance + 3.6 ? local : best;
        }
        public string LabelAt(double s)
        {
            double wrapped = DriveMath.Wrap(s, Length);
            foreach (var span in Data.streetSpans) if (wrapped >= span.fromS && wrapped < span.toS) return span.label;
            return "Starpass Court";
        }
        public double RecommendedSpeedAt(double s)
        {
            double wrapped = DriveMath.Wrap(s, Length);
            if (wrapped >= Data.bulbStartS - 7 || wrapped < 8) return 4.5;
            if (wrapped < Data.sections[0].endS + 16 || wrapped > Data.returnMappedStartS - 25) return 8;
            foreach (var turn in Data.turns)
                if (turn.reference != "home" && wrapped >= turn.approachS - 25 && wrapped <= turn.exitS + 8) return 14;
            return 20;
        }
    }
}
