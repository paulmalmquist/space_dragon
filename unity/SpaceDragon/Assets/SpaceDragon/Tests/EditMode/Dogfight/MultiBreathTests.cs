using System.Collections.Generic;
using NUnit.Framework;

namespace SpaceDragon.Dogfight.Tests
{
    public class MultiBreathTests
    {
        [Test] public void ThreeSweptLocksProduceOneImmutableImpactEvenWithRepeatedFireAndTargetLoss()
        {
            var state=new BreathState(3,seed:3);state.Assist();
            for(int target=0;target<3;target++)for(int tick=0;tick<7;tick++)
                state.Tick(.1f,new[]{new BreathCandidate(0,100,target==0?0:.5f),new BreathCandidate(1,100,target==1?0:.5f),new BreathCandidate(2,100,target==2?0:.5f)});
            CollectionAssert.AreEqual(new[]{0,1,2},state.LockedIds);Assert.That(state.RequestFire(),Is.True);
            var impacts=new List<BreathImpact>();
            for(int tick=0;tick<30;tick++)
            {Assert.That(state.RequestFire(),Is.False);var impact=state.Tick(.1f,new[]{new BreathCandidate(0,100,0,dead:true)});if(impact.HasValue)impacts.Add(impact.Value);}
            Assert.That(impacts.Count,Is.EqualTo(1));CollectionAssert.AreEqual(new[]{0,1,2},impacts[0].TargetIds);
            Assert.That(state.BurstsFired,Is.EqualTo(1));Assert.That(state.BurstsResolved,Is.EqualTo(1));
            state.Reset();Assert.That(state.LockedIds,Is.Empty);Assert.That(state.Burst,Is.Null);
        }
        [Test] public void WingmanBindingCannotBecomeAWordPrompt()
        {
            Assert.That(BreathState.IsReservedLetter('T'),Is.True);
            Assert.Throws<System.ArgumentException>(()=>new BreathState(words:new[]{"TONE"}));
            var state=new BreathState();Assert.That(state.PressLetter('T'),Is.False);
        }
    }
}
