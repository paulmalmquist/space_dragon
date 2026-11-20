using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class RepairCodeStateTests
    {
        DogfightTuning tuning;
        RepairCodeState code;
        [SetUp] public void SetUp() { tuning = ScriptableObject.CreateInstance<DogfightTuning>(); code = new RepairCodeState(tuning, 71); }
        [TearDown] public void TearDown() { Object.DestroyImmediate(tuning); }

        [Test] public void NumbersAreDeterministicAndOnlyLastFreshDigitCompletesOnce()
        {
            var other = new RepairCodeState(tuning, 71);
            code.Start(RepairCodeMode.Numbers); other.Start(RepairCodeMode.Numbers);
            Assert.That(code.Length, Is.EqualTo(3));
            for (int i = 0; i < tuning.RepairCodeLength; i++)
            {
                Assert.That(code.Prompt, Is.EqualTo(other.Prompt)); Assert.That(code.ExpectedDigit, Is.EqualTo(other.ExpectedDigit));
                int digit = code.ExpectedDigit.Value;
                Assert.That(digit, Is.InRange(0, tuning.RepairDigitMaximum));
                Assert.That(code.PressDigit(digit), Is.EqualTo(i == tuning.RepairCodeLength - 1)); other.PressDigit(digit);
            }
            Assert.That(code.Completed, Is.True); Assert.That(code.Active, Is.False);
            Assert.That(code.ExpectedDigit, Is.Null); Assert.That(code.Prompt, Is.Empty);
            Assert.That(code.PressDigit(0), Is.False); Assert.That(code.Index, Is.EqualTo(3));
        }

        [Test] public void WrongInvalidAndRepeatedDigitsHaveNoPenaltyOrProgress()
        {
            code.Start(RepairCodeMode.Numbers); int expected = code.ExpectedDigit.Value;
            foreach (int wrong in new[] { -1, 10, (expected + 1) % 10 }) Assert.That(code.PressDigit(wrong), Is.False);
            Assert.That(code.PressDigit(expected, repeat: true), Is.False);
            Assert.That(code.Index, Is.Zero); Assert.That(code.ExpectedDigit, Is.EqualTo(expected));
            Assert.That(code.Active, Is.True);
        }

        [Test] public void SumPromptsUseSingleDigitAnswersAndTotalsWithinFive()
        {
            for (int attempt = 0; attempt < 30; attempt++)
            {
                code.Start(RepairCodeMode.Sums);
                while (code.Active)
                {
                    string[] parts = code.Prompt.Split('+'); int left = int.Parse(parts[0]), right = int.Parse(parts[1]);
                    Assert.That(left, Is.GreaterThanOrEqualTo(0)); Assert.That(right, Is.GreaterThanOrEqualTo(0));
                    Assert.That(left + right, Is.InRange(0, 5)); Assert.That(left + right, Is.EqualTo(code.ExpectedDigit.Value));
                    code.PressDigit(code.ExpectedDigit.Value);
                }
            }
        }

        [Test] public void OffFeatureSwitchCancellationAndResetClearAllCodeState()
        {
            code.Start(RepairCodeMode.Numbers); string first = code.Prompt; code.PressDigit(code.ExpectedDigit.Value);
            code.Cancel(); Assert.That(code.Active, Is.False); Assert.That(code.Completed, Is.False);
            Assert.That(code.Index, Is.Zero); Assert.That(code.ExpectedDigit, Is.Null);
            code.Start(RepairCodeMode.Off); Assert.That(code.Active, Is.False);
            tuning.EnableRepairCode = false; code.Start(RepairCodeMode.Numbers); Assert.That(code.Active, Is.False);
            tuning.EnableRepairCode = true; code.Reset(); code.Start(RepairCodeMode.Numbers);
            Assert.That(code.Prompt, Is.EqualTo(first)); Assert.That(code.Index, Is.Zero);
        }

        [Test] public void CodeCompletionAloneCannotHealOrSpendRepairResources()
        {
            var tactics = new TacticalState(tuning); tactics.ApplyDamage(DragonSystem.Hull, 50); tactics.TryStartRepair(DragonSystem.Hull);
            code.Start(RepairCodeMode.Numbers);
            while (code.Active) code.PressDigit(code.ExpectedDigit.Value);
            Assert.That(tactics.Hull, Is.EqualTo(50)); Assert.That(tactics.Salvage, Is.EqualTo(tuning.StartingSalvage));
            Assert.That(tactics.RepairsRemaining, Is.EqualTo(tuning.MaximumRepairs)); Assert.That(tactics.RepairProgress, Is.Zero);
            Assert.That(tactics.ApplyRepairSpeedBonus(tuning.RepairBonusRemainingMultiplier), Is.True);
            Assert.That(tactics.ApplyRepairSpeedBonus(tuning.RepairBonusRemainingMultiplier), Is.False);
        }
    }
}
