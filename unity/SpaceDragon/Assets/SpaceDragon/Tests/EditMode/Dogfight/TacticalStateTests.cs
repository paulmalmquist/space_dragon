using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class TacticalStateTests
    {
        DogfightTuning tuning;
        TacticalState state;
        [SetUp] public void SetUp() { tuning = ScriptableObject.CreateInstance<DogfightTuning>(); state = new TacticalState(tuning); }
        [TearDown] public void TearDown() { Object.DestroyImmediate(tuning); }
        void Lock(TacticalState target = null) { target = target ?? state; target.TickLock(new LockCandidate("bogey")); target.Tick(target.AcquireSeconds); }

        [Test] public void ComebackHullRestoreIsOneShotAndPreservesOtherSystemsAndResources()
        {
            Assert.That(state.RestoreComebackHull(30),Is.False);
            state.ApplyDamage(DragonSystem.Propulsion,40);float propulsion=state.Propulsion;
            state.ApplyDamage(DragonSystem.Hull,100);Assert.That(state.RestoreComebackHull(30),Is.True);
            Assert.That(state.Hull,Is.EqualTo(30));Assert.That(state.Propulsion,Is.EqualTo(propulsion));
            Assert.That(state.Salvage,Is.EqualTo(1));Assert.That(state.RepairsRemaining,Is.EqualTo(3));
            state.ApplyDamage(DragonSystem.Hull,30);Assert.That(state.RestoreComebackHull(30),Is.False);
            state.Reset();state.ApplyDamage(DragonSystem.Hull,100);Assert.That(state.RestoreComebackHull(30),Is.True);
            state.Reset();tuning.EnableComeback=false;state.ApplyDamage(DragonSystem.Hull,100);Assert.That(state.RestoreComebackHull(30),Is.False);
        }

        [Test] public void RestartRestoresAllEncounterResourcesAndClearsDamagePatchesAndTracking()
        {
            state.ApplyDamage(DragonSystem.Propulsion, 50); state.TryStartRepair(DragonSystem.Propulsion); state.Tick(4);
            Lock(); Assert.That(state.TryLaunch(true), Is.True);
            state.IncomingLockedMissile = true; state.Reset();
            Assert.That(new[] { state.Hull, state.Propulsion, state.Weapons }, Is.EqualTo(new[] { 100f, 100f, 100f }));
            Assert.That(state.Salvage, Is.EqualTo(1)); Assert.That(state.RepairsRemaining, Is.EqualTo(3));
            Assert.That(state.MissileCharges, Is.EqualTo(2)); Assert.That(state.PatchCount(DragonSystem.Propulsion), Is.Zero);
            Assert.That(state.MissilesLaunched + state.RepairsCompleted + state.LocksConfirmed, Is.Zero);
            Assert.That(state.RechargeProgress + state.LockProgress, Is.Zero); Assert.That(state.IncomingLockedMissile, Is.False);
        }

        [Test] public void LocalizedDamageAffectsItsSystemAndHullShareWithoutSteeringFailure()
        {
            state.ApplyDamage(DragonSystem.Propulsion, 40);
            Assert.That(state.Propulsion, Is.EqualTo(60)); Assert.That(state.Hull, Is.EqualTo(86)); Assert.That(state.Weapons, Is.EqualTo(100));
            Assert.That(state.BoostMultiplier, Is.EqualTo(.86f).Within(.0001f)); Assert.That(state.CanBoost, Is.True);
            state.ApplyDamage(DragonSystem.Propulsion, 60);
            Assert.That(state.BoostMultiplier, Is.EqualTo(.65f).Within(.0001f));
            float propulsion = state.Propulsion; state.ApplyDamage(DragonSystem.Hull, 5);
            Assert.That(state.Hull, Is.EqualTo(60)); Assert.That(state.Propulsion, Is.EqualTo(propulsion));
        }

        [Test] public void RepairConsumesOnlyAtCompletionAndLeavesPersistentLocalizedPatch()
        {
            state.ApplyDamage(DragonSystem.Propulsion, 50); Lock();
            Assert.That(state.TryStartRepair(DragonSystem.Propulsion), Is.True);
            Assert.That(state.CanBoost, Is.False); Assert.That(state.TryLaunch(true), Is.False);
            state.Tick(3.5f);
            Assert.That(state.RepairProgress, Is.EqualTo(.875f)); Assert.That(state.Propulsion, Is.EqualTo(50));
            Assert.That(state.Salvage, Is.EqualTo(1)); Assert.That(state.RepairsRemaining, Is.EqualTo(3));
            state.Tick(.5f);
            Assert.That(state.Propulsion, Is.EqualTo(85)); Assert.That(state.Hull, Is.EqualTo(82.5f));
            Assert.That(state.Salvage, Is.Zero); Assert.That(state.RepairsRemaining, Is.EqualTo(2));
            Assert.That(state.PatchCount(DragonSystem.Propulsion), Is.EqualTo(1)); Assert.That(state.CanBoost, Is.True);
            Assert.That(state.MissileCharges, Is.EqualTo(2));
            state.ApplyDamage(DragonSystem.Propulsion, 1); state.Tick(100);
            Assert.That(state.PatchCount(DragonSystem.Propulsion), Is.EqualTo(1));
        }

        [Test] public void SubstantialHitWinsAtCompletionBoundaryAndKeepsBothResources()
        {
            state.ApplyDamage(DragonSystem.Hull, 30); state.TryStartRepair(DragonSystem.Hull); state.Tick(3.99f);
            state.ApplyDamage(DragonSystem.Weapons, tuning.RepairInterruptDamage); state.Tick(.01f);
            Assert.That(state.IsRepairing, Is.False); Assert.That(state.RepairsInterrupted, Is.EqualTo(1));
            Assert.That(state.RepairsCompleted, Is.Zero); Assert.That(state.Salvage, Is.EqualTo(1));
            Assert.That(state.RepairsRemaining, Is.EqualTo(3)); Assert.That(state.Hull, Is.EqualTo(65.8f).Within(.0001f));
            Assert.That(state.PatchCount(DragonSystem.Hull), Is.Zero);
        }

        [Test] public void SmallHitDoesNotInterruptAndCancellationDoesNotSpend()
        {
            state.ApplyDamage(DragonSystem.Hull, 30); state.TryStartRepair(DragonSystem.Hull);
            state.ApplyDamage(DragonSystem.Hull, tuning.RepairInterruptDamage - .1f); state.Tick(1);
            Assert.That(state.IsRepairing, Is.True); state.CancelRepair(); state.Tick(10);
            Assert.That(state.RepairsCompleted, Is.Zero); Assert.That(state.Salvage, Is.EqualTo(1));
            Assert.That(state.RepairsRemaining, Is.EqualTo(3));
        }

        [Test] public void RepairLimitCannotBeBypassedByMoreSalvageOrRepeatedTriggers()
        {
            state.AddSalvage(2);
            for (int i = 0; i < 3; i++)
            {
                state.ApplyDamage(DragonSystem.Hull, 35);
                Assert.That(state.TryStartRepair(DragonSystem.Hull), Is.True);
                Assert.That(state.TryStartRepair(DragonSystem.Weapons), Is.False);
                state.Tick(4);
            }
            Assert.That(state.RepairsRemaining, Is.Zero); Assert.That(state.PatchCount(DragonSystem.Hull), Is.EqualTo(3));
            state.AddSalvage(100); state.ApplyDamage(DragonSystem.Hull, 30);
            Assert.That(state.Salvage, Is.EqualTo(3)); Assert.That(state.TryStartRepair(DragonSystem.Hull), Is.False);
            state.Tick(60); Assert.That(state.RepairsCompleted, Is.EqualTo(3)); Assert.That(state.Hull, Is.EqualTo(70));
        }

        [Test] public void DestroyedDragonCannotRepairLaunchCollectOrResurrect()
        {
            Lock(); state.ApplyDamage(DragonSystem.Hull, 30); state.TryStartRepair(DragonSystem.Hull);
            state.ApplyDamage(DragonSystem.Hull, 1000); state.Tick(100);
            Assert.That(state.IsDestroyed, Is.True); Assert.That(state.Hull, Is.Zero);
            Assert.That(state.TryStartRepair(DragonSystem.Hull), Is.False); Assert.That(state.TryLaunch(true), Is.False);
            Assert.That(state.PickupSalvage(), Is.False); Assert.That(state.CanBoost, Is.False);
            Assert.That(state.Salvage, Is.EqualTo(1)); Assert.That(state.RepairsRemaining, Is.EqualTo(3));
        }

        [Test] public void IntactOrUnfundedRepairIsRejectedWithoutSpending()
        {
            Assert.That(state.TryStartRepair(DragonSystem.Hull), Is.False);
            state.ApplyDamage(DragonSystem.Hull, 50); state.TryStartRepair(DragonSystem.Hull); state.Tick(4);
            Assert.That(state.TryStartRepair(DragonSystem.Hull), Is.False);
            Assert.That(state.RepairsRemaining, Is.EqualTo(2)); Assert.That(state.Hull, Is.EqualTo(85));
        }

        [Test] public void WarningPriorityIsHullThenIncomingThenCriticalThenCaution()
        {
            Assert.That(state.HighestWarning, Is.EqualTo(TacticalWarning.None));
            state.ApplyDamage(DragonSystem.Weapons, 40); Assert.That(state.HighestWarning, Is.EqualTo(TacticalWarning.Caution));
            state.ApplyDamage(DragonSystem.Weapons, 35); Assert.That(state.HighestWarning, Is.EqualTo(TacticalWarning.Critical));
            state.IncomingLockedMissile = true; Assert.That(state.HighestWarning, Is.EqualTo(TacticalWarning.IncomingMissile));
            state.ApplyDamage(DragonSystem.Hull, 60); Assert.That(state.HighestWarning, Is.EqualTo(TacticalWarning.HullImminent));
        }

        [Test] public void MissilesRequireValidConfirmedLockAndRegenerateSequentially()
        {
            Assert.That(state.TryLaunch(true), Is.False); state.TickLock(new LockCandidate("bogey")); state.Tick(1.4f);
            Assert.That(state.LockState, Is.EqualTo(TargetLockState.Acquiring)); Assert.That(state.TryLaunch(true), Is.False);
            state.Tick(.1f); Assert.That(state.LockState, Is.EqualTo(TargetLockState.Locked));
            Assert.That(state.TryLaunch(false), Is.False); Assert.That(state.MissileCharges, Is.EqualTo(2));
            Assert.That(state.TryLaunch(true), Is.True); Assert.That(state.TryLaunch(true), Is.True);
            Assert.That(state.TryLaunch(true), Is.False); Assert.That(state.LockState, Is.EqualTo(TargetLockState.Recharging));
            state.Tick(14); Assert.That(state.MissileCharges, Is.Zero); Assert.That(state.RechargeProgress, Is.EqualTo(14f / 15).Within(.0001f));
            state.Tick(1); Assert.That(state.MissileCharges, Is.EqualTo(1)); Assert.That(state.RechargeProgress, Is.Zero.Within(.0001f));
            state.Tick(15); Assert.That(state.MissileCharges, Is.EqualTo(2)); Assert.That(state.RechargeProgress, Is.Zero);
        }

        [Test] public void PartialChargeQueueSurvivesAnotherLaunch()
        {
            Lock(); state.TryLaunch(true); state.Tick(10); state.TryLaunch(true); state.Tick(5);
            Assert.That(state.MissileCharges, Is.EqualTo(1)); state.Tick(15); Assert.That(state.MissileCharges, Is.EqualTo(2));
        }

        [Test] public void WeaponDamageSlowsRechargeAndAcquisitionWithoutErasingExistingProgress()
        {
            Lock(); state.TryLaunch(true); state.Tick(7.5f); state.ApplyDamage(DragonSystem.Weapons, 100);
            Assert.That(state.RechargeSeconds, Is.EqualTo(30)); Assert.That(state.AcquireSeconds, Is.EqualTo(2.1f));
            state.Tick(14.9f); Assert.That(state.MissileCharges, Is.EqualTo(1)); state.Tick(.1f);
            Assert.That(state.MissileCharges, Is.EqualTo(2));
            state.TickLock(new LockCandidate("other")); state.Tick(1.5f); Assert.That(state.HasConfirmedLock, Is.False);
            state.Tick(.6f); Assert.That(state.HasConfirmedLock, Is.True);
        }

        [Test] public void BriefLineOfSightLossHasGraceButCannotLaunchOrAdvanceTracking()
        {
            state.TickLock(new LockCandidate("bogey")); state.Tick(.75f);
            state.TickLock(new LockCandidate("bogey", hasLineOfSight: false)); state.Tick(.1f);
            Assert.That(state.LockProgress, Is.EqualTo(.5f).Within(.0001f));
            state.TickLock(new LockCandidate("bogey")); state.Tick(.75f); Assert.That(state.HasConfirmedLock, Is.True);
            state.TickLock(new LockCandidate("bogey", hasLineOfSight: false)); state.Tick(.19f);
            Assert.That(state.HasConfirmedLock, Is.True); Assert.That(state.TryLaunch(true), Is.False);
            Assert.That(state.MissileCharges, Is.EqualTo(2)); state.Tick(.02f);
            Assert.That(state.HasConfirmedLock, Is.False); Assert.That(state.LockProgress, Is.Zero);
        }

        [TestCase(false, true, true, true)]
        [TestCase(true, false, true, true)]
        [TestCase(true, true, false, true)]
        [TestCase(true, true, true, false)]
        public void InvalidCandidateNeverAcquires(bool alive, bool range, bool cone, bool los)
        {
            state.TickLock(new LockCandidate("bogey", alive, range, cone, los)); state.Tick(20);
            Assert.That(state.LockProgress, Is.Zero); Assert.That(state.TryLaunch(true), Is.False);
        }

        [Test] public void ChangingTargetRequiresFreshSustainedTracking()
        {
            Lock(); state.TickLock(new LockCandidate("other")); Assert.That(state.TryLaunch(true), Is.False); state.Tick(.15f);
            Assert.That(state.LockProgress, Is.EqualTo(.1f).Within(.0001f)); Assert.That(state.LocksConfirmed, Is.EqualTo(1));
        }

        [Test] public void TimerResultsAreStableAcrossDtPartitionsIncludingWeaponRepairBoundary()
        {
            var other = new TacticalState(tuning);
            foreach (var s in new[] { state, other })
            { Lock(s); s.TryLaunch(true); s.TryLaunch(true); s.ApplyDamage(DragonSystem.Weapons, 100); s.TryStartRepair(DragonSystem.Weapons); }
            state.Tick(34);
            for (int i = 0; i < 3400; i++) other.Tick(.01f);
            Assert.That(state.Weapons, Is.EqualTo(other.Weapons)); Assert.That(state.MissileCharges, Is.EqualTo(other.MissileCharges));
            Assert.That(state.RechargeProgress, Is.EqualTo(other.RechargeProgress).Within(.0001f));
            Assert.That(state.RepairsCompleted, Is.EqualTo(other.RepairsCompleted)); Assert.That(state.LockProgress, Is.EqualTo(other.LockProgress));
        }

        [Test] public void NonfiniteAndNegativeInputsCannotCorruptState()
        {
            state.ApplyDamage(DragonSystem.Hull, float.NaN); state.ApplyDamage(DragonSystem.Hull, -5);
            state.Tick(float.PositiveInfinity); state.Tick(-5);
            Assert.That(state.Hull, Is.EqualTo(100)); Assert.That(state.MissileCharges, Is.EqualTo(2));
            Assert.That(state.AddSalvage(-1), Is.False);
        }

        [Test] public void OptionalCodeHalvesRemainingTimeOnceAndCommitsOnlyOnNormalCompletion()
        {
            state.ApplyDamage(DragonSystem.Hull, 50); state.TryStartRepair(DragonSystem.Hull); state.Tick(1);
            Assert.That(state.ApplyRepairSpeedBonus(.5f), Is.True);
            Assert.That(state.RepairBonusApplied, Is.True); Assert.That(state.RepairSecondsRemaining, Is.EqualTo(1.5f));
            Assert.That(state.RepairProgress, Is.EqualTo(.625f)); Assert.That(state.ApplyRepairSpeedBonus(.5f), Is.False);
            Assert.That(state.Hull, Is.EqualTo(50)); Assert.That(state.Salvage, Is.EqualTo(1)); Assert.That(state.RepairsRemaining, Is.EqualTo(3));
            state.Tick(1.49f); Assert.That(state.IsRepairing, Is.True); Assert.That(state.RepairsCompleted, Is.Zero);
            state.Tick(.01f); Assert.That(state.IsRepairing, Is.False); Assert.That(state.Hull, Is.EqualTo(85));
            Assert.That(state.RepairsCompleted, Is.EqualTo(1)); Assert.That(state.Salvage, Is.Zero); Assert.That(state.RepairsRemaining, Is.EqualTo(2));
            Assert.That(state.RepairBonusApplied, Is.False);
        }

        [Test] public void IgnoringCodeKeepsNormalDurationAndInvalidBonusCannotChangeIt()
        {
            Assert.That(state.ApplyRepairSpeedBonus(.5f), Is.False);
            state.ApplyDamage(DragonSystem.Hull, 50); state.TryStartRepair(DragonSystem.Hull);
            foreach (float multiplier in new[] { -1, 0, 1, 2, float.NaN, float.PositiveInfinity })
                Assert.That(state.ApplyRepairSpeedBonus(multiplier), Is.False);
            tuning.EnableRepairCode = false; Assert.That(state.ApplyRepairSpeedBonus(.5f), Is.False);
            state.Tick(3.99f); Assert.That(state.IsRepairing, Is.True); Assert.That(state.RepairsCompleted, Is.Zero);
            state.Tick(.01f); Assert.That(state.RepairsCompleted, Is.EqualTo(1));
        }

        [Test] public void BonusCannotBypassInterruptionAndEachNewRepairMayEarnOnlyOne()
        {
            state.ApplyDamage(DragonSystem.Hull, 50); state.TryStartRepair(DragonSystem.Hull); state.Tick(3.9f);
            Assert.That(state.ApplyRepairSpeedBonus(.5f), Is.True);
            state.ApplyDamage(DragonSystem.Weapons, tuning.RepairInterruptDamage); state.Tick(.05f);
            Assert.That(state.IsRepairing, Is.False); Assert.That(state.RepairsCompleted, Is.Zero);
            Assert.That(state.Salvage, Is.EqualTo(1)); Assert.That(state.RepairsRemaining, Is.EqualTo(3));
            Assert.That(state.RepairBonusApplied, Is.False); Assert.That(state.ApplyRepairSpeedBonus(.5f), Is.False);
            Assert.That(state.TryStartRepair(DragonSystem.Hull), Is.True);
            Assert.That(state.ApplyRepairSpeedBonus(.5f), Is.True); Assert.That(state.ApplyRepairSpeedBonus(.5f), Is.False);
            state.Reset(); Assert.That(state.RepairBonusApplied, Is.False); Assert.That(state.RepairSecondsRemaining, Is.Zero);
        }

        [Test] public void SalvageDropsOncePerEnemyAndEvictsOldestWithoutRecreatingIt()
        {
            var field = new SalvageField(tuning);
            for (int i = 0; i < 7; i++) Assert.That(field.Drop(i.ToString(), Vector3.zero, Vector3.right * 100), Is.Not.Null);
            Assert.That(field.Items.Count, Is.EqualTo(6)); Assert.That(field.Items[0].Id, Is.EqualTo("1"));
            Assert.That(field.Drop("0", Vector3.zero, Vector3.zero), Is.Null);
            Assert.That(field.TryPickup("1", state), Is.True); Assert.That(field.TryPickup("1", state), Is.False);
            Assert.That(field.Drop("1", Vector3.zero, Vector3.zero), Is.Null);
            field.Reset(); Assert.That(field.Drop("0", Vector3.zero, Vector3.zero), Is.Not.Null);
        }

        [Test] public void FullInventoryLeavesPickupAndNoticeAndNeverReplenishesRepairBudget()
        {
            var field = new SalvageField(tuning); state.AddSalvage(2);
            field.Drop("bogey", Vector3.zero, Vector3.zero);
            Assert.That(field.PickupWithin(Vector3.zero, state), Is.Zero); Assert.That(field.Items.Count, Is.EqualTo(1));
            Assert.That(state.LastNotice, Is.EqualTo("Salvage full"));
            state.ApplyDamage(DragonSystem.Hull, 40); state.TryStartRepair(DragonSystem.Hull); state.Tick(4);
            Assert.That(field.PickupWithin(Vector3.right * 18, state), Is.EqualTo(1));
            Assert.That(state.Salvage, Is.EqualTo(3)); Assert.That(state.RepairsRemaining, Is.EqualTo(2));
        }

        [Test] public void SalvageDriftHasInheritedVelocityDragAndStableDtPartitions()
        {
            var field = new SalvageField(tuning); var other = new SalvageField(tuning);
            var a = field.Drop("a", Vector3.zero, Vector3.right * 100); var b = other.Drop("a", Vector3.zero, Vector3.right * 100);
            Assert.That(a.Velocity.x, Is.EqualTo(30).Within(.0001f)); field.Tick(5);
            for (int i = 0; i < 500; i++) other.Tick(.01f);
            Assert.That(a.Velocity.x, Is.LessThan(3)); Assert.That(a.Position.x, Is.GreaterThan(10));
            Assert.That(Vector3.Distance(a.Position, b.Position), Is.LessThan(.005f)); Assert.That(a.Age, Is.EqualTo(5));
            Assert.That(field.PickupWithin(a.Position + Vector3.right * 19, state), Is.Zero);
        }
    }
}
