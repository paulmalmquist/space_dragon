using System;

namespace SpaceDragon.Traversal
{
    /// <summary>Axis-aligned prism with an optional planar top. Rendering reads it; it never owns collision.</summary>
    [Serializable]
    public sealed class Solid
    {
        public string id, kind;
        public double minX, maxX, minZ, maxZ, minY, maxY;
        /// <summary>Planar top: heights at the min and max edge of the slope axis replace maxY.</summary>
        public bool hasSlope, slopeAlongX;
        public double slopeAtMin, slopeAtMax;
        /// <summary>Upward launch speed applied on landing (trampoline).</summary>
        public double bounce;
        /// <summary>Part of the player's own house: drawn and clipped as a cutaway indoors.</summary>
        public bool house;
        public bool IsTrunk => kind == "trunk";
    }

    [Serializable]
    public sealed class Anchor
    {
        public string id;
        public double x, y, z;
        /// <summary>Height of the surface below the swing; keeps the bottom of the arc clear.</summary>
        public double floor;
        /// <summary>A destination: the tether lets go under it so the hero drops onto the surface below.</summary>
        public bool perch;
    }

    /// <summary>
    /// A marked wall face the hero can climb. `alongX` faces run along x at a fixed z (`at`);
    /// otherwise they run along z at a fixed x. `facing` is the side the hero hangs on: +1 or -1.
    /// </summary>
    [Serializable]
    public sealed class ClimbSurface
    {
        public string id;
        public bool alongX;
        public double at, facing, min, max, minY, maxY;
    }

    [Serializable] public sealed class WaterZone { public string id; public double minX, maxX, minZ, maxZ, surface, bed; }
    [Serializable] public sealed class SparkSpot { public string id; public double x, y, z; }
    [Serializable] public sealed class Recovery { public string id; public double x, y, z, yaw; }
    [Serializable] public sealed class WorldBounds { public double minX, maxX, minZ, maxZ; }
    [Serializable] public sealed class SpawnPose { public double x, z, yaw; }

    [Serializable]
    public sealed class TraversalWorld
    {
        public string id;
        public WorldBounds bounds;
        public Solid[] solids;
        public Anchor[] anchors;
        public WaterZone[] water;
        public SparkSpot[] sparks;
        public Recovery[] recoveries;
        public SpawnPose spawn;
        /// <summary>Marked faces for Spider Climb; empty in levels without any.</summary>
        public ClimbSurface[] climbs = new ClimbSurface[0];

        public Anchor FindAnchor(string anchorId)
        {
            foreach (var anchor in anchors) if (anchor.id == anchorId) return anchor;
            return null;
        }

        public ClimbSurface FindClimb(string climbId)
        {
            if (climbs != null) foreach (var surface in climbs) if (surface.id == climbId) return surface;
            return null;
        }
    }

    public struct Support { public double height; public string id; public double bounce; }

    /// <summary>Engine-independent geometry queries shared by movement, saves and the camera.</summary>
    public static class TraversalGeometry
    {
        /// <summary>Height at which the player's house is drawn cut open while they are indoors.</summary>
        public const double CutawayHeight = 0.8;

        public static bool Finite(double value) => !double.IsNaN(value) && !double.IsInfinity(value);
        public static double Clamp(double value, double low, double high) => value < low ? low : value > high ? high : value;

        /// <summary>Top surface height at the closest point of the footprint.</summary>
        public static double TopAt(Solid solid, double x, double z)
        {
            if (!solid.hasSlope) return solid.maxY;
            double low = solid.slopeAlongX ? solid.minX : solid.minZ;
            double high = solid.slopeAlongX ? solid.maxX : solid.maxZ;
            double span = high - low;
            if (span <= 0) return solid.maxY;
            double t = Clamp(((solid.slopeAlongX ? x : z) - low) / span, 0, 1);
            return solid.slopeAtMin + (solid.slopeAtMax - solid.slopeAtMin) * t;
        }

        public static WaterZone WaterAt(TraversalWorld world, double x, double z)
        {
            foreach (var zone in world.water) if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ) return zone;
            return null;
        }

        /// <summary>Bare ground height, before solids: dry land is zero and the lake bed lies below its surface.</summary>
        public static double TerrainAt(TraversalWorld world, double x, double z)
        {
            var zone = WaterAt(world, x, z);
            return zone != null ? zone.bed : 0;
        }

        /// <summary>Highest standable surface under a point that the feet can reach from <paramref name="feet"/>.</summary>
        public static Support SupportAt(TraversalWorld world, double x, double z, double feet, double reach, double grace = 0)
        {
            var support = new Support { height = TerrainAt(world, x, z), id = "terrain", bounce = 0 };
            foreach (var solid in world.solids)
            {
                if (x < solid.minX - grace || x > solid.maxX + grace || z < solid.minZ - grace || z > solid.maxZ + grace) continue;
                double top = TopAt(solid, x, z);
                if (top > feet + reach || top <= support.height) continue;
                support.height = top; support.id = solid.id; support.bounce = solid.bounce;
            }
            return support;
        }

        /// <summary>Lowest underside above the head within <paramref name="reach"/> of a point; infinity when the sky is open.</summary>
        public static double CeilingAt(TraversalWorld world, double x, double z, double head, double reach = 0)
        {
            double ceiling = double.PositiveInfinity;
            foreach (var solid in world.solids)
            {
                if (x < solid.minX - reach || x > solid.maxX + reach || z < solid.minZ - reach || z > solid.maxZ + reach) continue;
                if (solid.minY >= head - 0.05 && solid.minY < ceiling) ceiling = solid.minY;
            }
            return ceiling;
        }

        public static bool PointInSolid(Solid solid, double x, double y, double z, double padding = 0)
        {
            if (x < solid.minX - padding || x > solid.maxX + padding || z < solid.minZ - padding || z > solid.maxZ + padding) return false;
            return y >= solid.minY - padding && y <= TopAt(solid, x, z) + padding;
        }

        /// <summary>
        /// A standing pose is safe when inside the bounds, on dry footing near ground level and
        /// clear of every solid that would block a person there.
        /// </summary>
        public static bool IsStandable(TraversalWorld world, double x, double z, TraversalTuning tuning)
        {
            if (!Finite(x) || !Finite(z)) return false;
            var b = world.bounds;
            double radius = tuning.radius;
            if (x < b.minX + radius || x > b.maxX - radius || z < b.minZ + radius || z > b.maxZ - radius) return false;
            var support = SupportAt(world, x, z, 0, tuning.placeReach);
            if (support.bounce > 0 || (support.id == "terrain" && WaterAt(world, x, z) != null)) return false;
            double feet = support.height;
            foreach (var solid in world.solids)
            {
                double cx = Clamp(x, solid.minX, solid.maxX);
                double cz = Clamp(z, solid.minZ, solid.maxZ);
                double dx = x - cx;
                double dz = z - cz;
                if (dx * dx + dz * dz >= radius * radius - 1e-10) continue;
                if (TopAt(solid, cx, cz) <= feet + tuning.stepHeight) continue;
                if (solid.minY >= feet + tuning.height) continue;
                return false;
            }
            return true;
        }

        /// <summary>
        /// Fraction of a camera boom from focus toward desired that stays outside solids. Thin trunks
        /// are ignored; with <paramref name="cutaway"/>, the player's house only blocks below the cut.
        /// </summary>
        public static double ClipBoom(TraversalWorld world, double focusX, double focusY, double focusZ, double desiredX, double desiredY, double desiredZ,
            bool cutaway, double padding = 0.18, int samples = 24)
        {
            double dx = desiredX - focusX, dy = desiredY - focusY, dz = desiredZ - focusZ;
            double clear = 0;
            for (int index = 1; index <= samples; index++)
            {
                double t = (double)index / samples;
                if (Blocked(world, focusX + dx * t, focusY + dy * t, focusZ + dz * t, cutaway, padding))
                {
                    double low = clear, high = t;
                    for (int pass = 0; pass < 5; pass++)
                    {
                        double mid = (low + high) / 2;
                        if (Blocked(world, focusX + dx * mid, focusY + dy * mid, focusZ + dz * mid, cutaway, padding)) high = mid; else low = mid;
                    }
                    return low;
                }
                clear = t;
            }
            return 1;
        }

        private static bool Blocked(TraversalWorld world, double x, double y, double z, bool cutaway, double padding)
        {
            foreach (var solid in world.solids)
            {
                if (solid.IsTrunk) continue;
                if (cutaway && solid.house && (solid.minY > CutawayHeight || y > CutawayHeight + padding)) continue;
                if (PointInSolid(solid, x, y, z, padding)) return true;
            }
            return false;
        }
    }
}
