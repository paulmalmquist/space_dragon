using System;

namespace SpaceDragon.TownDrive
{
    /// <summary>Presentation values never feed back into authoritative physics or checkpoints.</summary>
    public static class DrivePresentation
    {
        public static DrivePose Interpolate(DriveState previous, DriveState current, double alpha, bool paused = false, bool snap = false)
        {
            double elapsed = current.elapsedSeconds - previous.elapsedSeconds;
            double travel = DriveMath.Hypot(current.x - previous.x, current.z - previous.z);
            double maximumTravel = Math.Max(2, Math.Max(Math.Abs(previous.speed), Math.Abs(current.speed)) * DriveSimulation.StepSeconds * 2 + .5);
            double angle = DriveMath.AngleDelta(current.yaw, previous.yaw);
            if (paused || snap || elapsed <= 0 || elapsed > DriveSimulation.StepSeconds * 1.5 || travel > maximumTravel || Math.Abs(angle) > .5) return current.Pose();
            double amount = DriveMath.Finite(alpha) ? DriveMath.Clamp(alpha, 0, 1) : 1;
            return new DrivePose { x = previous.x + (current.x - previous.x) * amount, z = previous.z + (current.z - previous.z) * amount,
                yaw = previous.yaw + angle * amount, speed = previous.speed + (current.speed - previous.speed) * amount };
        }
        public static double SmoothSteering(double previous, double desired, double dt, bool paused = false)
        {
            if (paused) return previous;
            double elapsed = DriveMath.Finite(dt) ? DriveMath.Clamp(dt, 0, .1) : 0;
            return previous + ((DriveMath.Finite(desired) ? DriveMath.Clamp(desired, -1, 1) : 0) - previous) * (1 - Math.Exp(-elapsed * 14));
        }
    }
}
