using System;
using System.Collections.Generic;

namespace SpaceDragon.TownDrive
{
    [Serializable] public sealed class DrivePedestrian
    {
        public string id;
        public int sectionIndex, side, appearance;
        public double startS, endS, speed, phaseDistance, heightScale;
    }
    [Serializable] public struct DrivePedestrianPose
    {
        public string id;
        public int appearance, side, sectionIndex;
        public double x, z, yaw, walkPhase, heightScale, speed;
    }
    /// <summary>Port of the sidewalk-only distance-driven patrols; no wall-clock or collision actor.</summary>
    public sealed class DrivePedestrians
    {
        public readonly DrivePedestrian[] Population;
        private readonly DriveRoute route;
        private const double Radius = .34;
        public DrivePedestrians(DriveRoute route)
        {
            this.route = route;
            var people = new List<DrivePedestrian>();
            int[] allocation = { 4, 8, 8, 8, 6, 6 };
            for (int section = 0; section < route.Data.sections.Length; section++)
            {
                var spans = Array.FindAll(route.Data.safePedestrianSpans, span => span.sectionIndex == section);
                if (spans.Length == 0) continue;
                int perSide = allocation[section] / 2;
                for (int slot = 0; slot < perSide; slot++) foreach (int side in new[] { 1, -1 })
                {
                    int serial = people.Count, index = slot % spans.Length;
                    var span = spans[index];
                    int slots = (int)Math.Ceiling((double)(perSide - index) / spans.Length);
                    double slotLength = (span.toS - span.fromS) / slots, length = Math.Min(82, slotLength - 8);
                    double start = span.fromS + (slot / spans.Length) * slotLength + (slotLength - length) / 2;
                    people.Add(new DrivePedestrian { id = "walker." + route.Data.sections[section].id + "." + slot + "." + (side == 1 ? "right" : "left"),
                        sectionIndex = section, side = side, startS = start, endS = start + length,
                        speed = 1.12 + (serial * 7 % 6) * .055,
                        phaseDistance = DriveMath.Wrap(serial * 37.19 + (side == -1 ? length : 0), 2 * length + 2 * Math.PI * Radius),
                        appearance = (serial + slot) % 2, heightScale = .96 + (serial % 5) * .02 });
                }
            }
            Population = people.ToArray();
        }
        public DrivePedestrianPose PoseAt(DrivePedestrian person, double elapsedSeconds)
        {
            double time = DriveMath.Finite(elapsedSeconds) ? Math.Max(0, elapsedSeconds) : 0;
            double length = person.endS - person.startS, arc = Math.PI * Radius;
            double distance = time * person.speed + person.phaseDistance;
            double t = DriveMath.Wrap(distance, 2 * length + 2 * arc), along, lateral, heading = 0;
            if (t < length) { along = t; lateral = Radius; }
            else if ((t -= length) < arc) { double angle = t / Radius; along = length + Radius * Math.Sin(angle); lateral = Radius * Math.Cos(angle); heading = -angle; }
            else if ((t -= arc) < length) { along = length - t; lateral = -Radius; heading = Math.PI; }
            else { double angle = (t - length) / Radius; along = -Radius * Math.Sin(angle); lateral = -Radius * Math.Cos(angle); heading = Math.PI - angle; }
            var road = route.PointAtDistance(person.startS + along); var section = route.Data.sections[person.sectionIndex];
            double offset = person.side * (DriveRoute.RoadHalfWidth(section) + 3.2 + section.sidewalkWidth / 2) + lateral;
            return new DrivePedestrianPose { id = person.id, x = road.x + Math.Cos(road.yaw) * offset, z = road.z - Math.Sin(road.yaw) * offset,
                yaw = road.yaw + heading, walkPhase = DriveMath.Wrap(distance / 1.5, 1), appearance = person.appearance,
                heightScale = person.heightScale, speed = person.speed, side = person.side, sectionIndex = person.sectionIndex };
        }
    }
}
