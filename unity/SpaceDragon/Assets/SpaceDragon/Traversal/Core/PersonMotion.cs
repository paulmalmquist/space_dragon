using System;

namespace SpaceDragon.Traversal
{
    /// <summary>
    /// Engine-free motion rules for the realistic hero stand-in: which locomotion loops play at a
    /// ground speed, how fast the stride advances and how far the hips drop in a landing crouch.
    /// A port of src/game/hero/person-motion.ts; PersonMotionData carries its numbers and
    /// reference samples. Presentation only: nothing here reads or writes game state.
    /// </summary>
    public static class PersonMotion
    {
        public const int ClipCount = 4;

        /// <summary>
        /// Fills weights for [idle, walk, run, sprint]. Adjacent loops cross-fade linearly between
        /// their natural speeds; above the sprint speed only the sprint loop plays.
        /// </summary>
        public static void LocomotionWeights(double speed, double[] weights)
        {
            if (weights == null || weights.Length < ClipCount) throw new ArgumentException("Four weights are required.", nameof(weights));
            for (int index = 0; index < ClipCount; index++) weights[index] = 0;
            double value = TraversalGeometry.Finite(speed) ? Math.Max(0, speed) : 0;
            double[] speeds = PersonMotionData.ClipSpeeds;
            int last = ClipCount - 1;
            if (value >= speeds[last]) { weights[last] = 1; return; }
            for (int index = 0; index < last; index++)
            {
                double low = speeds[index], high = speeds[index + 1];
                if (value >= low && value < high)
                {
                    double blend = (value - low) / (high - low);
                    weights[index] = 1 - blend;
                    weights[index + 1] = blend;
                    return;
                }
            }
        }

        /// <summary>
        /// Stride cycles per second for the blended locomotion loops (idle excluded). Playback
        /// follows the real ground speed inside a band so feet neither skate nor blur.
        /// </summary>
        public static double StrideCyclesPerSecond(double[] weights, double speed)
        {
            double total = 0, natural = 0, duration = 0;
            for (int index = 1; index < ClipCount; index++)
            {
                total += weights[index];
                natural += weights[index] * PersonMotionData.ClipSpeeds[index];
                duration += weights[index] * PersonMotionData.ClipDurations[index];
            }
            if (total <= 1e-6) return 0;
            natural /= total; duration /= total;
            double rate = Math.Min(PersonMotionData.MaxStrideRate, Math.Max(PersonMotionData.MinStrideRate, Math.Max(0, speed) / natural));
            return rate / duration;
        }

        /// <summary>How far the hips drop for a landing envelope in [0, 1]; keeps the feet planted.</summary>
        public static double CrouchDrop(double envelope)
        {
            double bend = Math.Max(0, Math.Min(1, envelope)) * PersonMotionData.LandBend * Math.PI / 180;
            return PersonMotionData.LegLength * (1 - Math.Cos(bend));
        }

        /// <summary>Frame-rate independent approach used for every presentation blend.</summary>
        public static double Damp(double current, double target, double rate, double seconds) =>
            current + (target - current) * (1 - Math.Exp(-rate * seconds));
    }
}
