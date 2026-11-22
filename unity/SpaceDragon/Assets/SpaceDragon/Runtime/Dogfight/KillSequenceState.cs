using System;
using UnityEngine;

namespace SpaceDragon.Dogfight
{
    public enum KillStage { Idle = 0, Flash = 1, Breakup = 2, Blast = 3, Embers = 4 }

    /// <summary>
    /// The timeline shown after the rules have ALREADY disabled an enemy, or after a gas pocket
    /// has already gone off. It decides nothing about combat: the kill, its count and its one
    /// salvage drop happen in the encounter before <see cref="Begin"/> is called. This class only
    /// says where the wreck is drawn, how large, and how far the flash, shards and shockwave have
    /// spread. Sizes are in metres so that they can be seen at combat range.
    /// The blast cue is owed exactly once, even when one long frame skips a whole stage.
    /// Reduced motion hides the wreck at once and keeps a small still ring.
    /// </summary>
    public sealed class KillSequenceState
    {
        const float ReducedRingFraction = .3f;
        readonly DogfightTuning tuning;
        Vector3 velocity, spinRate;
        float flashEnd, breakupEnd, blastEnd, total, ringReach;
        bool blastFired, blastOwed, reduced;

        public bool Active { get; private set; }
        public KillStage Stage { get; private set; }
        public float Age { get; private set; }
        /// <summary>World position of the wreck, then of the blast centre once it is gone.</summary>
        public Vector3 Position { get; private set; }
        /// <summary>Accumulated tumble in degrees, applied on top of the pose the hull died in.</summary>
        public Vector3 SpinEuler { get; private set; }
        /// <summary>Multiplier on the hull's own scale.</summary>
        public float HullScale { get; private set; } = 1;
        public bool HullVisible { get; private set; }
        /// <summary>Length of the starburst spikes, and how bright they are.</summary>
        public float FlashRadius { get; private set; }
        public float FlashOpacity { get; private set; }
        /// <summary>How far the debris streaks have flown from the blast, their length and brightness.</summary>
        public float ShardDistance { get; private set; }
        public float ShardLength { get; private set; }
        public float ShardOpacity { get; private set; }
        public float RingRadius { get; private set; }
        public float RingOpacity { get; private set; }
        /// <summary>Only varies the look, so that wrecks do not all turn and scatter alike.</summary>
        public int Variant { get; private set; }
        /// <summary>Counts sequences begun, for tests and the QA snapshot.</summary>
        public int Serial { get; private set; }

        public KillSequenceState(DogfightTuning tuning)
        {
            this.tuning = tuning ?? throw new ArgumentNullException(nameof(tuning));
            if (!NonNegative(tuning.KillFlashSeconds) || !NonNegative(tuning.KillBreakupSeconds) ||
                !NonNegative(tuning.KillBlastSeconds) || !NonNegative(tuning.KillEmberSeconds) ||
                !NonNegative(tuning.KillHullSwell) || !NonNegative(tuning.KillHullShrink) ||
                !NonNegative(tuning.KillDriftDrag) || !Finite(tuning.KillSpinDegreesPerSecond) ||
                !NonNegative(tuning.KillFlashRadius) || !NonNegative(tuning.KillRingRadius) ||
                !NonNegative(tuning.KillShardLength) || !NonNegative(tuning.KillShardReach))
                throw new ArgumentException("Kill sequence tuning requires finite, nonnegative values.", nameof(tuning));
        }

        /// <summary>Starts the full timeline for a hull that the rules have just disabled.</summary>
        public void Begin(Vector3 position, Vector3 inheritedVelocity, int variant, bool reducedMotion)
        {
            if (!Finite(position) || !Finite(inheritedVelocity))
                throw new ArgumentException("A kill sequence needs a finite position and velocity.");
            Start(position, variant, tuning.KillRingRadius);
            velocity = inheritedVelocity; reduced = reducedMotion;
            float rate = tuning.KillSpinDegreesPerSecond;
            spinRate = new Vector3((variant & 1) == 0 ? .7f : -.7f, (variant & 2) == 0 ? 1f : -1f, (variant & 4) == 0 ? .45f : -.45f) * rate;
            if (reduced) SkipToBlast(true); else Evaluate();
        }

        /// <summary>
        /// Starts at the blast, with no hull: a gas pocket, whose own explosion cue has already
        /// played. The ring shows the real reach of the blast.
        /// </summary>
        public void BeginBlast(Vector3 position, float ringRadius, int variant, bool reducedMotion)
        {
            if (!Finite(position) || !NonNegative(ringRadius))
                throw new ArgumentException("A blast needs a finite position and a nonnegative radius.");
            Start(position, variant, ringRadius);
            reduced = reducedMotion;
            SkipToBlast(false);
        }

        public void Tick(float dt, bool reducedMotion)
        {
            if (!Active || !Finite(dt) || dt <= 0) return;
            if (reducedMotion && !reduced) { reduced = true; if (!blastFired) SkipToBlast(true); }
            float previous = Age;
            Age += dt;
            if (!reduced)
            {
                // Drift and tumble only while the hull is still shown.
                float moving = Mathf.Max(0, Mathf.Min(Age, breakupEnd) - Mathf.Min(previous, breakupEnd));
                if (moving > 0)
                {
                    velocity *= Mathf.Exp(-tuning.KillDriftDrag * moving);
                    Position += velocity * moving;
                    SpinEuler += spinRate * moving;
                }
            }
            if (!blastFired && Age >= breakupEnd) { blastFired = true; blastOwed = true; }
            if (Age >= total) { Finish(); return; }
            Evaluate();
        }

        /// <summary>True once per kill, when the blast is reached. The adapter plays the explosion cue.</summary>
        public bool TakeBlast() { bool owed = blastOwed; blastOwed = false; return owed; }

        /// <summary>Wave change and Restart: stop and drop a cue that was still owed. Pause needs
        /// nothing, because a sequence that is not ticked simply waits.</summary>
        public void Clear() { Finish(); blastOwed = false; }
        /// <summary>Restart: stop and forget the count as well.</summary>
        public void Reset() { Clear(); Serial = 0; }

        void Start(Vector3 position, int variant, float ringRadius)
        {
            Clear();
            Active = true; Serial++; Variant = variant; Position = position; ringReach = ringRadius;
            flashEnd = tuning.KillFlashSeconds;
            breakupEnd = flashEnd + tuning.KillBreakupSeconds;
            blastEnd = breakupEnd + tuning.KillBlastSeconds;
            total = blastEnd + tuning.KillEmberSeconds;
        }
        void SkipToBlast(bool oweCue)
        {
            Age = breakupEnd; SpinEuler = Vector3.zero; velocity = Vector3.zero;
            blastFired = true; blastOwed = oweCue;
            Evaluate();
        }
        // The timeline has run out. A cue that became due on this last step stays owed until taken.
        void Finish()
        {
            Active = false; Stage = KillStage.Idle; Age = 0; reduced = false;
            velocity = spinRate = SpinEuler = Vector3.zero;
            HullScale = 1; HullVisible = false;
            FlashRadius = FlashOpacity = ShardDistance = ShardLength = ShardOpacity = RingRadius = RingOpacity = 0;
            blastFired = false;
            flashEnd = breakupEnd = blastEnd = total = ringReach = 0;
        }

        void Evaluate()
        {
            if (Age < flashEnd)
            {
                float p = Fraction(Age, 0, flashEnd);
                Stage = KillStage.Flash; HullVisible = true;
                HullScale = Mathf.Lerp(1, tuning.KillHullSwell, EaseOut(p));
                FlashRadius = tuning.KillFlashRadius * .6f * p; FlashOpacity = 1;
                ShardDistance = ShardLength = ShardOpacity = RingRadius = RingOpacity = 0;
            }
            else if (Age < breakupEnd)
            {
                float p = Fraction(Age, flashEnd, breakupEnd);
                Stage = KillStage.Breakup; HullVisible = true;
                HullScale = Mathf.Lerp(tuning.KillHullSwell, tuning.KillHullShrink, p);
                FlashRadius = tuning.KillFlashRadius * Mathf.Lerp(.6f, .35f, p); FlashOpacity = Mathf.Lerp(1, .25f, p);
                ShardDistance = ShardLength = ShardOpacity = RingRadius = RingOpacity = 0;
            }
            else
            {
                float p = Fraction(Age, breakupEnd, blastEnd), whole = Fraction(Age, breakupEnd, total);
                Stage = Age < blastEnd ? KillStage.Blast : KillStage.Embers;
                HullVisible = false; HullScale = 1;
                if (reduced)
                {
                    FlashRadius = FlashOpacity = ShardDistance = ShardLength = ShardOpacity = 0;
                    RingRadius = ringReach * ReducedRingFraction; RingOpacity = 1 - whole;
                }
                else
                {
                    FlashRadius = Age < blastEnd ? tuning.KillFlashRadius * (1 + .8f * EaseOut(p)) : 0;
                    FlashOpacity = Age < blastEnd ? 1 - p : 0;
                    ShardDistance = ringReach * tuning.KillShardReach * EaseOut(whole);
                    ShardLength = tuning.KillShardLength * (1 - .5f * whole); ShardOpacity = 1 - whole;
                    RingRadius = ringReach * EaseOut(whole);
                    RingOpacity = (1 - whole) * (1 - whole);
                }
            }
        }

        static float Fraction(float value, float from, float to) => to <= from ? 1 : Mathf.Clamp01((value - from) / (to - from));
        static float EaseOut(float t) { float u = 1 - Mathf.Clamp01(t); return 1 - u * u * u; }
        static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
        static bool Finite(Vector3 value) => Finite(value.x) && Finite(value.y) && Finite(value.z);
        static bool NonNegative(float value) => Finite(value) && value >= 0;
    }
}
