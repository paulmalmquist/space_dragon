using System;

namespace SpaceDragon.Traversal
{
    /// <summary>
    /// Hero traversal tuning. Units: metres, seconds, radians. These values mirror
    /// src/game/traversal/tuning.ts; change both together and regenerate the parity fixtures.
    /// </summary>
    [Serializable]
    public sealed class TraversalTuning
    {
        public const double Step = 1.0 / 120;
        public const double MaxFrameSeconds = 0.05;
        public static readonly TraversalTuning Default = new TraversalTuning();

        public double radius = 0.28, height = 1.7, handHeight = 1.45;
        public double runSpeed = 4.6, sprintSpeed = 8.2, groundAccel = 34, groundBrake = 46, turnRate = 14;
        public double airAccel = 16, airSpeed = 5.2, airDrag = 0.25, jumpSpeed = 8.6, hopSpeed = 9, hopPush = 2.2;
        public double gravityRise = -22, gravityCut = -48, gravityFall = -30, terminal = 34, coyote = 0.12, jumpBuffer = 0.14;
        public double stepHeight = 0.36, placeReach = 0.8, airStepHeight = 0.26, stepDown = 0.4, edgeGrace = 0.08, maxMove = 0.12;
        public double tetherRange = 16, tetherMinRise = 1.5, tetherIdeal = 9, tetherMinAir = 0.16, tetherMinAlign = 0.1;
        public double tetherRechain = 0.24, tetherForget = 0.9, tetherSightStep = 0.6;
        public double ropeMin = 0.9, ropeMax = 15, reelRate = 10, swingGravity = -24, swingPump = 6, swingSteer = 0.4, swingSideDamp = 4;
        public double swingMaxSpeed = 15.5, swingClearance = 0.9, swingMinTime = 0.35, swingMaxTime = 2.8;
        public double perchRadius = 1.1, perchCarry = 0.3, perchSideDamp = 5, swingStallSpeed = 2, swingStallTime = 0.9;
        public double releaseBoost = 1.04, releaseLift = 1.2, releaseSpread = 0.9, jumpOffLift = 5.5, maxSpeed = 28;
        public double catchDuration = 0.8, catchMaxDuration = 1.8, catchSpeed = 24, catchArc = 3.2, catchDepth = -0.45, safeDelay = 0.25;
    }
}
