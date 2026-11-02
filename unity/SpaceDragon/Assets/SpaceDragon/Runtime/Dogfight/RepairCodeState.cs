using System;
using System.Globalization;

namespace SpaceDragon.Dogfight
{
    public enum RepairCodeMode { Numbers, Sums, Off }

    /// <summary>An optional, untimed encounter code. Correct fresh digits advance;
    /// wrong/repeated input does nothing. Completion only reports an event: TacticalState
    /// owns the bonus and all repair/resource rules. No learning profile or mastery writes.</summary>
    public sealed class RepairCodeState
    {
        readonly DogfightTuning tuning;
        readonly int initialSeed;
        Random random;
        int[] digits = Array.Empty<int>();
        string[] prompts = Array.Empty<string>();
        public RepairCodeMode Mode { get; private set; } = RepairCodeMode.Numbers;
        public int Index { get; private set; }
        public int Length => digits.Length;
        public bool Active { get; private set; }
        public bool Completed { get; private set; }
        public int? ExpectedDigit => Active ? digits[Index] : (int?)null;
        public string Prompt => Active ? prompts[Index] : "";

        public RepairCodeState(DogfightTuning tuning, int? seed = null)
        {
            this.tuning = tuning ?? throw new ArgumentNullException(nameof(tuning));
            if (tuning.RepairCodeLength <= 0) throw new ArgumentOutOfRangeException(nameof(tuning.RepairCodeLength));
            initialSeed = seed ?? new Random().Next(); random = new Random(initialSeed);
        }

        public void Start(RepairCodeMode mode)
        {
            if ((uint)mode > (uint)RepairCodeMode.Off) throw new ArgumentOutOfRangeException(nameof(mode));
            Cancel(); Mode = mode;
            if (!tuning.EnableRepairCode || mode == RepairCodeMode.Off) return;
            digits = new int[tuning.RepairCodeLength]; prompts = new string[digits.Length];
            int decimalMaximum = '9' - '0';
            int maximum = Math.Min(decimalMaximum, Math.Max(0, mode == RepairCodeMode.Sums ? tuning.RepairSumMaximum : tuning.RepairDigitMaximum));
            for (int i = 0; i < digits.Length; i++)
            {
                digits[i] = random.Next(maximum + 1);
                if (mode == RepairCodeMode.Numbers) prompts[i] = digits[i].ToString(CultureInfo.InvariantCulture);
                else
                {
                    int left = random.Next(digits[i] + 1), right = digits[i] - left;
                    prompts[i] = left.ToString(CultureInfo.InvariantCulture) + " + " + right.ToString(CultureInfo.InvariantCulture);
                }
            }
            Active = true;
        }

        /// <returns>True only on the fresh digit which completes this code.</returns>
        public bool PressDigit(int digit, bool repeat = false)
        {
            if (!tuning.EnableRepairCode || !Active || Completed || repeat || digit < 0 || digit > '9' - '0' || digit != digits[Index]) return false;
            Index++;
            if (Index != digits.Length) return false;
            Completed = true; Active = false; return true;
        }

        public void Cancel()
        { Active = Completed = false; Index = 0; digits = Array.Empty<int>(); prompts = Array.Empty<string>(); }
        public void Reset()
        { Cancel(); Mode = RepairCodeMode.Numbers; random = new Random(initialSeed); }
    }
}
