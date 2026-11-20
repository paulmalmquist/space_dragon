using System;
using System.Collections.Generic;
using System.Globalization;

namespace SpaceDragon.Dogfight
{
    public enum BreathPhase { Charging, Ready, Burst }

    [Serializable]
    public struct BreathCandidate
    {
        public int Id;
        public float Distance, Error; // Error is normalized screen distance, not degrees.
        public bool Eligible, Dead; // Eligible includes visibility/line of sight supplied by the encounter.
        public BreathCandidate(int id, float distance, float error, bool eligible = true, bool dead = false)
        { Id = id; Distance = distance; Error = error; Eligible = eligible; Dead = dead; }
    }

    [Serializable]
    public sealed class BreathBurst
    {
        public int Id;
        public int[] TargetIds;
        public float Elapsed, WindupDuration, BeamDuration, Duration;
        public string Stage => Elapsed + .000001f < WindupDuration ? "windup" : "beam";
        public float Progress => Stage == "windup" ? Elapsed / WindupDuration : Math.Min(1, (Elapsed - WindupDuration) / BeamDuration);
    }

    [Serializable]
    public struct BreathImpact
    {
        public int BurstId;
        public int[] TargetIds;
        public BreathImpact(int burstId, int[] targetIds) { BurstId = burstId; TargetIds = targetIds; }
    }

    [Serializable]
    public sealed class BreathSnapshot
    {
        public string Phase, Word, CompletedLetters;
        public int WordIndex, LetterIndex, Capacity, BurstsFired, BurstsResolved;
        public char? ExpectedLetter;
        public bool Assisted;
        public int? CandidateId;
        public float LockProgress;
        public int[] LockedIds;
        public BreathBurst Burst;
    }

    /// <summary>Encounter-only spelling, dwell and attack timeline. Never pauses flight or writes saves/mastery.</summary>
    public sealed class BreathState
    {
        public const float Range = 650, LockRadius = .12f, AcquireSeconds = .65f, GraceSeconds = 1.2f;
        public const float WindupSeconds = .65f, BeamSeconds = 1.1f, BurstSeconds = 1.75f, MaxStep = .1f;
        private const double Epsilon = .000001;
        private static readonly string[] DefaultWords = { "LION", "PINK", "COIN", "KING", "SONG" };
        // Key names remain in the input adapter; these letters overlap its flight controls.
        private const string ReservedLetters = "WADZQEBXRFMT";
        private readonly string[] words;
        private readonly Random random;
        private readonly List<string> bag = new List<string>();
        private readonly List<Lock> locks = new List<Lock>();
        private readonly Dictionary<int, BreathCandidate> ships = new Dictionary<int, BreathCandidate>();
        private string lastWord;
        private double candidateSeconds, burstElapsed;
        private int nextBurstId, burstId;
        private int[] burstTargets;
        private sealed class Lock { public int Id; public double InvalidFor; }

        public BreathPhase Phase { get; private set; }
        public string Word { get; private set; }
        public int WordIndex { get; private set; }
        public int LetterIndex { get; private set; }
        public char? ExpectedLetter => LetterIndex < Word.Length ? Word[LetterIndex] : (char?)null;
        public bool Assisted { get; private set; }
        public int Capacity { get; private set; }
        public int? CandidateId { get; private set; }
        public float LockProgress => (float)Math.Min(1, candidateSeconds / AcquireSeconds);
        public int BurstsFired { get; private set; }
        public int BurstsResolved { get; private set; }
        public string LastInputReason { get; private set; }
        public string LastFireReason { get; private set; }
        public int[] LockedIds
        {
            get { var result = new int[locks.Count]; for (int i = 0; i < locks.Count; i++) result[i] = locks[i].Id; return result; }
        }
        // Snapshots never expose the internal target list or mutable attack time.
        public BreathBurst Burst => Phase != BreathPhase.Burst ? null : new BreathBurst
        {
            Id = burstId, TargetIds = (int[])burstTargets.Clone(), Elapsed = (float)burstElapsed,
            WindupDuration = WindupSeconds, BeamDuration = BeamSeconds, Duration = BurstSeconds
        };

        public BreathState(int capacity = 1, string[] words = null, int? seed = null)
        {
            this.words = (string[])(words ?? DefaultWords).Clone();
            ValidateWords(this.words); random = seed.HasValue ? new Random(seed.Value) : new Random();
            SetCapacity(capacity); Reset();
        }
        public static bool IsReservedLetter(char letter) => ReservedLetters.IndexOf(char.ToUpperInvariant(letter)) >= 0;
        private static void ValidateWords(string[] bank)
        {
            if (bank.Length == 0) throw new ArgumentException("The word bank cannot be empty.");
            var unique = new HashSet<string>(StringComparer.Ordinal);
            foreach (string word in bank)
            {
                if (word == null || word.Length != 4 || !unique.Add(word)) throw new ArgumentException("Words must be unique, four uppercase letters and avoid flight keys.");
                foreach (char letter in word)
                    if (letter < 'A' || letter > 'Z' || IsReservedLetter(letter)) throw new ArgumentException("Word overlaps flight keys or contains invalid letters: " + word);
            }
        }
        public void SetCapacity(int capacity)
        {
            if (capacity < 1) throw new ArgumentOutOfRangeException(nameof(capacity));
            Capacity = capacity;
            if (locks.Count > capacity) locks.RemoveRange(0, locks.Count - capacity);
        }
        public void Reset()
        {
            lastWord = Word; bag.Clear(); WordIndex = BurstsFired = BurstsResolved = 0; nextBurstId = 1;
            LastInputReason = LastFireReason = null; StartWord();
        }
        private string NextWord()
        {
            if (bag.Count == 0)
            {
                bag.AddRange(words);
                for (int i = bag.Count - 1; i > 0; i--)
                {
                    int j = random.Next(i + 1); string temporary = bag[i]; bag[i] = bag[j]; bag[j] = temporary;
                }
                int last = bag.Count - 1;
                if (last > 0 && bag[last] == lastWord) { string temporary = bag[0]; bag[0] = bag[last]; bag[last] = temporary; }
            }
            lastWord = bag[bag.Count - 1]; bag.RemoveAt(bag.Count - 1); return lastWord;
        }
        private void ClearAimAndBurst()
        { CandidateId = null; candidateSeconds = burstElapsed = 0; locks.Clear(); burstTargets = null; burstId = 0; }
        private void StartWord()
        { Phase = BreathPhase.Charging; Word = NextWord(); LetterIndex = 0; Assisted = false; ClearAimAndBurst(); }

        public bool PressLetter(char letter, bool repeat = false)
        {
            letter = char.ToUpperInvariant(letter);
            LastInputReason = Phase != BreathPhase.Charging ? "not-charging" : repeat ? "repeat" : IsReservedLetter(letter) ? "reserved" :
                letter < 'A' || letter > 'Z' ? "invalid-key" : letter != Word[LetterIndex] ? "wrong-letter" : "correct-letter";
            if (LastInputReason != "correct-letter") return false;
            LetterIndex++;
            if (LetterIndex == Word.Length) Phase = BreathPhase.Ready;
            return true;
        }
        public bool PressLetter(string code, bool repeat = false)
        {
            if (code != null && code.Length == 4 && code.StartsWith("Key", StringComparison.Ordinal)) return PressLetter(code[3], repeat);
            if (code != null && code.Length == 1) return PressLetter(code[0], repeat);
            LastInputReason = "invalid-key"; return false;
        }
        public bool Assist()
        {
            if (Phase != BreathPhase.Charging) return false;
            Assisted = true; LetterIndex = Word.Length; Phase = BreathPhase.Ready; return true;
        }

        public BreathImpact? Tick(float dt, IReadOnlyList<BreathCandidate> candidates = null)
        {
            if (!FlightState.Finite(dt) || dt < 0) return null;
            dt = Math.Min(dt, MaxStep);
            if (Phase == BreathPhase.Charging) return null;
            if (Phase == BreathPhase.Burst)
            {
                burstElapsed = Math.Min(BurstSeconds, burstElapsed + dt);
                if (burstElapsed + Epsilon < BurstSeconds) return null;
                var impact = new BreathImpact(burstId, (int[])burstTargets.Clone());
                BurstsResolved++; WordIndex++; StartWord(); return impact;
            }
            ships.Clear();
            if (candidates != null) foreach (var candidate in candidates)
            {
                if (candidate.Id < 0 || ships.ContainsKey(candidate.Id)) continue;
                var ship = candidate;
                ship.Eligible &= !ship.Dead && FlightState.Finite(ship.Distance) && ship.Distance > 0 && ship.Distance <= Range;
                ships.Add(ship.Id, ship);
            }
            for (int i = locks.Count - 1; i >= 0; i--)
            {
                bool found = ships.TryGetValue(locks[i].Id, out var ship);
                if (found && ship.Dead) { locks.RemoveAt(i); continue; }
                locks[i].InvalidFor = found && ship.Eligible ? 0 : locks[i].InvalidFor + dt;
                if (locks[i].InvalidFor + Epsilon >= GraceSeconds) locks.RemoveAt(i);
            }
            BreathCandidate? choice = null;
            foreach (var ship in ships.Values)
            {
                if (!ship.Eligible || !FlightState.Finite(ship.Error) || ship.Error < 0 || ship.Error > LockRadius) continue;
                if (!choice.HasValue || Compare(ship, choice.Value) < 0) choice = ship;
            }
            if (!choice.HasValue || locks.Exists(item => item.Id == choice.Value.Id))
            { CandidateId = null; candidateSeconds = 0; return null; }
            if (CandidateId != choice.Value.Id) { CandidateId = choice.Value.Id; candidateSeconds = 0; }
            candidateSeconds += dt;
            if (candidateSeconds + Epsilon >= AcquireSeconds)
            {
                if (locks.Count >= Capacity) locks.RemoveAt(0);
                locks.Add(new Lock { Id = choice.Value.Id }); CandidateId = null; candidateSeconds = 0;
            }
            return null;
        }
        private static int Compare(BreathCandidate a, BreathCandidate b)
        {
            int order = a.Error.CompareTo(b.Error);
            if (order == 0) order = a.Distance.CompareTo(b.Distance);
            return order != 0 ? order : StringComparer.Ordinal.Compare(a.Id.ToString(CultureInfo.InvariantCulture), b.Id.ToString(CultureInfo.InvariantCulture));
        }
        public bool RequestFire()
        {
            LastFireReason = Phase != BreathPhase.Ready ? Phase == BreathPhase.Burst ? "burst-active" : "charging" : locks.Count == 0 ? "no-lock" : "fired";
            if (LastFireReason != "fired") return false;
            burstId = nextBurstId++; burstTargets = LockedIds; burstElapsed = 0; Phase = BreathPhase.Burst; BurstsFired++;
            CandidateId = null; candidateSeconds = 0; locks.Clear(); return true;
        }
        // A crash/interruption consumes the charge; it cannot deliver a delayed hit or advance word counters.
        public bool CancelBurst()
        {
            if (Phase != BreathPhase.Burst) return false;
            ClearAimAndBurst(); Phase = BreathPhase.Charging; LetterIndex = 0; Assisted = false; return true;
        }
        public BreathSnapshot Snapshot() => new BreathSnapshot
        {
            Phase = Phase.ToString().ToLowerInvariant(), Word = Word, WordIndex = WordIndex, LetterIndex = LetterIndex,
            CompletedLetters = Word.Substring(0, LetterIndex), ExpectedLetter = ExpectedLetter, Assisted = Assisted,
            Capacity = Capacity, CandidateId = CandidateId, LockProgress = LockProgress, LockedIds = LockedIds, Burst = Burst,
            BurstsFired = BurstsFired, BurstsResolved = BurstsResolved
        };
    }
}
