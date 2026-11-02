using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public class WaveStateTests
    {
        [Test] public void WavesWaitForClearAndDelay_ThenWinOnlyAtEnd_ResetReplays()
        {
            var t=ScriptableObject.CreateInstance<DogfightTuning>();var waves=new WaveState(t);
            Assert.That(waves.CurrentRoles.Length,Is.EqualTo(3));Assert.That(waves.Tick(10,false),Is.False);
            Assert.That(waves.Index,Is.Zero);
            for(int i=1;i<4;i++){Assert.That(waves.Tick(1,true),Is.False);Assert.That(waves.Tick(1,true),Is.True);Assert.That(waves.Index,Is.EqualTo(i));Assert.That(waves.Won,Is.False);}
            Assert.That(waves.Tick(.01f,true),Is.False);Assert.That(waves.Won,Is.True);waves.Tick(10,true);Assert.That(waves.Index,Is.EqualTo(3));
            waves.Reset();Assert.That(waves.Index,Is.Zero);Assert.That(waves.Won,Is.False);Object.DestroyImmediate(t);
        }
        [Test] public void DisabledRolesRestoreSingleOriginalWave()
        {
            var t=ScriptableObject.CreateInstance<DogfightTuning>();t.EnableEnemyRoles=false;var waves=new WaveState(t);
            Assert.That(waves.Count,Is.EqualTo(1));foreach(var role in waves.CurrentRoles)Assert.That(role,Is.EqualTo(EnemyRole.Fighter));
            waves.Tick(.01f,true);Assert.That(waves.Won,Is.True);Object.DestroyImmediate(t);
        }
        [Test] public void DefaultsMigrateOnceAndPreserveExistingBalanceAndOwnerSwitches()
        {
            var t=ScriptableObject.CreateInstance<DogfightTuning>();t.MissileDamage=120;
            Assert.That(t.EnsureCombatDefaults(),Is.True);Assert.That(t.PerfectRollWindow,Is.EqualTo(.4f));
            t.EnablePerfectRoll=false;t.RacerHealth=52;Assert.That(t.EnsureCombatDefaults(),Is.False);
            Assert.That(t.EnablePerfectRoll,Is.False);Assert.That(t.RacerHealth,Is.EqualTo(52));Assert.That(t.MissileDamage,Is.EqualTo(120));Object.DestroyImmediate(t);
        }
    }
}
