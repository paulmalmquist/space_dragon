using System;
using System.Collections.Generic;

namespace SpaceDragon.Traversal
{
    // Plain data for Luke's Arena: the level as the generated file describes it, the tunable
    // rules, and the state one fixed step produces. Names match src/game/arena/arena.ts.

    public enum TrialId { None, Course, Ring, Stealth }
    public enum RobotKind { Iguana, Drone, Mower, Sentry }
    public enum RobotMode { Dormant, Patrol, Curious, Alert, Windup, Strike, Recover, Search, Resolved }
    /// <summary>What the one-button action would do to a robot right now.</summary>
    public enum ActionKind { None, Snare, Pounce, Quiet }
    /// <summary>Ready means an alley-oop is on offer this instant; Wait means he is holding back at a trial's line.</summary>
    public enum SidekickMode { Follow, Wait, Ready, Stun, Toss, Rest }
    /// <summary>An alley-oop in progress: thrown, floating at the top, then diving.</summary>
    public enum OopPhase { None, Rise, Hang, Dive }
    /// <summary>What the sidekick button would do right now.</summary>
    public enum SidekickAsk { None, Oop, Stun }

    /// <summary>One-step notifications for effects, sound and saving. They never own progress.</summary>
    [Flags]
    public enum ArenaEvent
    {
        None = 0, Snare = 1, Pounce = 2, Impact = 4, Resolve = 8, Quiet = 16, Hit = 32, Bonk = 64, Revive = 128,
        Caught = 256, Release = 512, Spotted = 1024, Wave = 2048, Pickup = 4096, Trial = 8192, Bounce = 16384, Star = 32768,
        Toss = 65536, Hang = 131072, Dive = 262144, Stun = 524288, Zip = 1048576,
    }

    [Serializable] public sealed class ArenaZone { public TrialId id; public double minX, maxX, minZ, maxZ; }
    [Serializable] public sealed class Waypoint { public double x, z, wait; }
    [Serializable]
    public sealed class RobotSpec
    {
        public string id;
        public RobotKind kind;
        public TrialId trial;
        /// <summary>Battle ring wave, starting at 1. Zero means always present in its trial.</summary>
        public int wave;
        public double x, z, yaw;
        public Waypoint[] patrol = new Waypoint[0];
        /// <summary>Sentry only: the gaze swings between these headings (radians) at sweepRate.</summary>
        public double sweepFrom, sweepTo, sweepRate;
    }
    [Serializable] public sealed class ArenaPickup { public string id; public TrialId trial; public double x, y, z; }
    [Serializable] public sealed class HideSpot { public string id; public double x, z, yaw; }
    [Serializable] public sealed class SidekickWait { public TrialId trial; public double x, z, yaw; }
    /// <summary>
    /// The mission sidekick: mostly on his own, with one button to ask for help. He keeps to the
    /// ground. In a trial listed under waits he stays at that spot outside its floor.
    /// </summary>
    [Serializable] public sealed class SidekickSpec { public string id; public double x, z, yaw; public SidekickWait[] waits = new SidekickWait[0]; }
    /// <summary>A solid as the scene builder should dress it. Collision reads the world's solids, not this.</summary>
    [Serializable] public sealed class ArenaBlock { public string id, look; public double minX, maxX, minZ, maxZ, top; }

    /// <summary>Every telegraph lasts at least a second. Sight cones are half-angles in radians.</summary>
    [Serializable]
    public sealed class RobotProfile
    {
        public int sparks;
        public bool large;
        public double radius, height, eye, hover, walk, chase, turn, sight, cone, hear;
        public double attackRange, windup, strikeSpeed, strikeDistance, recover, hit;
    }

    /// <summary>Arena tuning. Values are written by tools/unity/export-arena.mjs from the TypeScript rules.</summary>
    [Serializable]
    public sealed class ArenaRules
    {
        public int energyMax, catchHelpMax, diveCount;
        public double mercy, bonkSeconds, holdSeconds, snareRange, snareSeconds, snareCooldown, snareBreak;
        public double pounceRange, pounceSpeed, pounceMin, pounceMax, pounceArc, pounceCooldown, pounceBounce, pouncePin;
        public double unaware, sightAbove, feel, awareNear, awareFar, awareDecay, awareGrace;
        public double curiousSeconds, searchSeconds, loseSightSeconds, noiseRange, sprintNoiseSpeed, landNoiseImpact;
        public double pickupRadius, heroCentre, hideRadius, waveDelay, knockback, knockUp;
        public double catchHelpSeconds, courseSilver, courseGold, lapRest, leaveSeconds;
        // The sidekick: he follows on his own; one button asks him to stun a robot or to throw Luke.
        public double sidekickRadius, sidekickHeight, sidekickEye, sidekickSpeed, sidekickGain, sidekickTurn, followNear, followMin, zipDistance, zipStuck;
        public double stunRange, stunSeconds, stunCooldown, stunPose;
        public double oopReach, oopStep, oopApex, oopSeek, oopCarry, oopOutMin, oopOutMax, oopOutFree, oopRiseMax, oopHang, oopSlow, oopCooldown, oopRest, tossPose;
        public double diveRadius, diveSpeed, diveShort, diveLong, divePin, diveMercy;
    }

    [Serializable]
    public sealed class ArenaLayout
    {
        public TraversalWorld world;
        public RobotSpec[] robots;
        public ArenaPickup[] pickups;
        public ArenaZone[] zones;
        public HideSpot[] hides;
        public ArenaBlock[] blocks = new ArenaBlock[0];
        public int waves;
        /// <summary>Null in a level with no sidekick.</summary>
        public SidekickSpec sidekick;
        public ArenaRules rules;
        /// <summary>Indexed by RobotKind.</summary>
        public RobotProfile[] profiles;

        public RobotProfile Profile(RobotKind kind) => profiles[(int)kind];
        public int CourseSparkCount
        {
            get { int count = 0; foreach (var pickup in pickups) if (pickup.trial == TrialId.Course) count++; return count; }
        }
    }

    [Serializable]
    public sealed class RobotState
    {
        public string id;
        public RobotKind kind;
        public double x, y, z, yaw;
        public int sparks;
        public RobotMode mode;
        /// <summary>Seconds left in the current mode where the mode is timed.</summary>
        public double timer;
        public double awareness, unseen, lastSeenX, lastSeenZ;
        public int patrolIndex;
        public double patrolWait, sweepDir;
        /// <summary>Seconds left held still by a snare or a pin; while positive the robot cannot act.</summary>
        public double hold;
        /// <summary>True when the hold is a tether line rather than a pin.</summary>
        public bool tethered;
        /// <summary>True when the hold is the sidekick's stun: dizzy, with no spark taken.</summary>
        public bool stunned;
        public double strikeX, strikeY, strikeZ, travelled;

        public RobotState Clone() => (RobotState)MemberwiseClone();
        public bool InPlay => mode != RobotMode.Dormant && mode != RobotMode.Resolved;
    }

    [Serializable]
    public sealed class SidekickState
    {
        /// <summary>False in a level with no sidekick; nothing else here is used then.</summary>
        public bool present;
        /// <summary>He keeps to the floor, so there is no height.</summary>
        public double x, z, yaw;
        public SidekickMode mode;
        /// <summary>Seconds left in a pose played where he stands: reaching out, throwing, catching his breath.</summary>
        public double timer;
        /// <summary>Seconds until he can be asked again.</summary>
        public double cooldown;
        /// <summary>Seconds spent pushing against something on the way to Luke.</summary>
        public double stuck;
        /// <summary>Robot his stun is aimed at while the pose lasts, for drawing.</summary>
        public string aimId = "";

        public SidekickState Clone() => (SidekickState)MemberwiseClone();
    }

    /// <summary>
    /// What a visit can add to, and never take away. Each trial has three stars: the first for
    /// finishing, the others for finishing well. Nothing here records how a learner is doing.
    /// </summary>
    [Serializable]
    public sealed class ArenaProgress
    {
        public const int StarMax = 3;
        /// <summary>Practice sparks collected at least once, in level order.</summary>
        public List<string> course = new List<string>();
        public int courseStars;
        /// <summary>Fastest whole lap in seconds, or 0 before the first one.</summary>
        public double courseBest;
        public int ringStars, ringBest, stealthStars, quiet;

        public ArenaProgress Clone()
        {
            var copy = (ArenaProgress)MemberwiseClone();
            copy.course = new List<string>(course);
            return copy;
        }
    }

    [Serializable]
    public sealed class ArenaState
    {
        public HeroState hero;
        public RobotState[] robots;
        public int energy;
        public double mercy, bonk, held, snareCooldown, pounceCooldown;
        public bool actionHeld, pounceHeld;
        /// <summary>Robot Luke is leaping at, or an empty string.</summary>
        public string pounceId = "";
        public double pounceTime, pounceDuration, pounceFromX, pounceFromY, pounceFromZ;
        public bool pounceQuiet;
        /// <summary>Robot a tether line is drawn to, or an empty string.</summary>
        public string snareId = "";
        /// <summary>Robot the next action would aim at, or an empty string.</summary>
        public string targetId = "";
        /// <summary>True when a pounce on that robot right now would be a quiet takedown.</summary>
        public bool targetQuiet;
        public TrialId trial;
        /// <summary>Seconds Luke has been off the current trial's floor.</summary>
        public double away;
        /// <summary>Practice sparks collected on this lap of the course, and the seconds since its first one.</summary>
        public List<string> lap = new List<string>();
        public double lapTime, lapRest;
        public int wave;
        public double waveTimer;
        /// <summary>Hits and bonks taken since this run at the ring began.</summary>
        public int ringHits, ringBonks;
        /// <summary>Whether anything in the stealth yard noticed Luke on this attempt.</summary>
        public bool seen;
        /// <summary>Times the floodlight has caught Luke on this attempt; each one buys a longer dark spell.</summary>
        public int catches;
        public bool vaultTaken;
        public string hideId = "";
        public SidekickState sidekick = new SidekickState();
        public bool sidekickHeld;
        public OopPhase oop;
        /// <summary>Seconds in the current phase of the alley-oop, and the length of its dive.</summary>
        public double oopTime, oopDuration, oopFromX, oopFromY, oopFromZ, oopToX, oopToY, oopToZ;
        /// <summary>Robots the dive is landing on, nearest first; kept until the landing so lines can be drawn to them.</summary>
        public string[] diveIds = new string[0];
        public ArenaProgress progress = new ArenaProgress();
        public ArenaEvent events;

        public RobotState FindRobot(string robotId)
        {
            if (!string.IsNullOrEmpty(robotId)) foreach (var robot in robots) if (robot.id == robotId) return robot;
            return null;
        }
    }

    [Serializable]
    public struct ArenaInput
    {
        public double moveX, moveZ;
        public bool jump, power;
        /// <summary>The one-button action: pounce when that would count, otherwise snare.</summary>
        public bool action;
        /// <summary>Always pounce.</summary>
        public bool pounce;
        /// <summary>The sidekick button: an alley-oop beside him, a stun anywhere else.</summary>
        public bool sidekick;
        /// <summary>Camera heading on the ground plane; guides which robot is targeted. Zero means use Luke's facing.</summary>
        public double aimX, aimZ;
    }

    [Serializable] public sealed class ArenaProbeSegment { public int steps; public double moveX, moveZ, aimX, aimZ; public bool jump, power, action, pounce, sidekick; }
    /// <summary>A moment of a recorded run: enough of the state to notice any divergence.</summary>
    [Serializable]
    public sealed class ArenaProbeMark
    {
        public int step;
        public double heroX, heroY, heroZ, heroYaw, robotX, robotZ, robotYaw, awareness;
        /// <summary>The sidekick, and how long each robot is still held.</summary>
        public double dadX, dadZ, dadYaw, holds;
        public int energy, sparks, heroMode, trial, wave, modes, dadMode, oop, stunned, diving;
    }
    /// <summary>A scripted run recorded from the TypeScript rules; the C# port must pass through the same moments.</summary>
    [Serializable]
    public sealed class ArenaProbe
    {
        public string name;
        public double startX, startZ, startYaw, startY;
        public bool hasStartY;
        public ArenaProbeSegment[] segments;
        public ArenaProbeMark[] marks;
        public int events, courseStars, ringStars, ringBest, stealthStars, quiet, catches, ringHits;
        public double courseBest;
        public string[] course;
        public bool seen;
    }
}
