using System;

namespace SpaceDragon.Dogfight
{
    /// <summary>One encounter-only SONG recovery opportunity. No reference to breath,
    /// health, animation, saves or input devices. The adapter observes SucceededSerial
    /// to restore hull and break locks once; Failed routes to its existing disabled flow.</summary>
    public sealed class ComebackState
    {
        public const string Word = "SONG";
        readonly DogfightTuning tuning;
        double remaining, protectionRemaining;
        public bool Active { get; private set; }
        public bool Used { get; private set; }
        public bool Assisted { get; private set; }
        public bool TimedOut { get; private set; }
        public bool Failed { get; private set; }
        public int LetterIndex { get; private set; }
        public int SucceededSerial { get; private set; }
        public char? ExpectedLetter => Active ? Word[LetterIndex] : (char?)null;
        public float Remaining => (float)remaining;
        public float ProtectionRemaining => (float)protectionRemaining;
        public bool Protected => protectionRemaining > 0;

        public ComebackState(DogfightTuning tuning)
        {
            this.tuning = tuning ?? throw new ArgumentNullException(nameof(tuning));
            if (!Finite(tuning.ComebackSeconds) || tuning.ComebackSeconds <= 0 ||
                !Finite(tuning.ComebackProtectionSeconds) || tuning.ComebackProtectionSeconds < 0)
                throw new ArgumentException("Comeback tuning requires a finite positive deadline and nonnegative protection duration.", nameof(tuning));
        }

        /// <summary>Caller supplies a real hull failure. Duplicate calls while the
        /// first tumble is active do not restart its deadline or consume a second life.</summary>
        public bool TryBegin()
        {
            if (!tuning.EnableComeback || Active) return false;
            if (Used) { Failed = true; protectionRemaining = 0; return false; }
            Used = Active = true; Assisted = TimedOut = Failed = false;
            LetterIndex = 0; remaining = tuning.ComebackSeconds; protectionRemaining = 0;
            return true;
        }

        /// <returns>True only for the fresh final G which succeeds before timeout.</returns>
        public bool PressLetter(char letter, bool repeat = false)
        {
            if (!tuning.EnableComeback || !Active || repeat || remaining <= 0 || char.ToUpperInvariant(letter) != Word[LetterIndex]) return false;
            LetterIndex++;
            if (LetterIndex != Word.Length) return false;
            Succeed(); return true;
        }

        public bool Assist()
        {
            if (!tuning.EnableComeback || !Active || remaining <= 0) return false;
            Assisted = true; LetterIndex = Word.Length; Succeed(); return true;
        }

        void Succeed()
        {
            Active = false; remaining = 0; SucceededSerial++;
            protectionRemaining = tuning.ComebackProtectionSeconds;
        }

        /// <summary>Advance using the unpaused encounter step. Once the deadline has
        /// elapsed, later input cannot resurrect the failed recovery. Do not call during pause.</summary>
        public void Tick(float dt)
        {
            if (!Finite(dt) || dt <= 0) return;
            if (!tuning.EnableComeback)
            {
                if (Active) { Active = false; Failed = true; remaining = 0; }
                protectionRemaining = 0; return;
            }
            if (Active)
            {
                remaining = Math.Max(0, remaining - dt);
                if (remaining < 1e-6) { remaining = 0; Active = false; TimedOut = Failed = true; }
            }
            else
            {
                protectionRemaining = Math.Max(0, protectionRemaining - dt);
                if (protectionRemaining < 1e-6) protectionRemaining = 0;
            }
        }

        public void Reset()
        {
            Active = Used = Assisted = TimedOut = Failed = false;
            LetterIndex = SucceededSerial = 0; remaining = protectionRemaining = 0;
        }
        static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);
    }
}
