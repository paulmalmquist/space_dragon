using System;

namespace SpaceDragon.Traversal
{
    // Plain data read by generated level files and by the Unity scene generator.
    // Nothing here owns collision or game state.

    [Serializable] public sealed class RectSpec { public string id, color; public double minX, maxX, minZ, maxZ, height; }
    [Serializable] public sealed class HouseSpec { public string id, palette; public double minX, maxX, minZ, maxZ, wall, ridge, overhang; public bool ridgeAlongX, home; }
    /// <summary>A post with a side arm: street lamps, utility poles and mooring pilings.</summary>
    [Serializable] public sealed class ArmSpec { public string id; public double x, z, height, armX, armZ, floor; }
    [Serializable] public sealed class PalmSpec { public string id; public double x, z, height, leanX, leanZ; public bool anchor; }
    [Serializable] public sealed class TreeSpec { public string id; public double x, z, height, crown, limbX, limbZ; }
    [Serializable] public sealed class MastSpec { public string id; public double x, z, height, ridge; public bool home; }

    [Serializable] public sealed class ProbeSegment { public int steps; public double moveX, moveZ; public bool jump, power; }

    /// <summary>A scripted run recorded from the TypeScript reference; the C# port must end in the same place.</summary>
    [Serializable]
    public sealed class PlaygroundProbe
    {
        public string name;
        public double startX, startZ, startYaw, startY;
        public bool hasStartY;
        public ProbeSegment[] segments;
        public double endX, endY, endZ, endVx, endVy, endVz, endYaw;
        public HeroMode endMode;
        public string endGroundId;
        public int events;
        public string[] tethers, collected;
    }

    [Serializable] public sealed class PoseTurn { public string bone; public char axis; public double degrees; public bool landLeg; }
    [Serializable] public sealed class PoseSpec { public string id; public PoseTurn[] turns; }
    [Serializable] public sealed class TetherArm { public string bone, tip; public double weight; }
    [Serializable] public sealed class MotionSample { public double speed, idle, walk, run, sprint, stride; }
}
