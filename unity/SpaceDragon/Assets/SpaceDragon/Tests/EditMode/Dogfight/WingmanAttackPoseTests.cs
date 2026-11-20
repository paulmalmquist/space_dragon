using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class WingmanAttackPoseTests
    {
        DogfightTuning tuning;
        FlightState flight;
        [SetUp] public void Setup(){tuning=ScriptableObject.CreateInstance<DogfightTuning>();flight=new FlightState();}
        [TearDown] public void Cleanup(){Object.DestroyImmediate(tuning);}
        [Test] public void RunStartsAndEndsAtFormationWithoutChangingPlayerOrAllyState()
        {
            var target=new Vector3(0,0,140);var state=new WingmanState(tuning);state.TrySend("target");
            var first=WingmanAttackPose.Sample(flight,target,state.RunRemaining,tuning);
            var last=WingmanAttackPose.Sample(flight,target,0,tuning);
            Assert.AreEqual(WingmanAttackPose.Formation(flight,tuning),first.Position);
            Assert.AreEqual(first.Position,last.Position);Assert.AreEqual(tuning.WingmanRunSeconds,state.RunRemaining);
            Assert.AreEqual(Vector3.zero,flight.Position);Assert.AreEqual(1,state.RunsSent);
        }
        [Test] public void SharedNoseOriginIsScaledAndFacesTargetAtEverySample()
        {
            var target=new Vector3(40,30,160);
            for(int i=0;i<=16;i++)
            {
                var pose=WingmanAttackPose.Sample(flight,target,tuning.WingmanRunSeconds*i/16,tuning);
                Assert.That(Vector3.Dot((target-pose.Position).normalized,pose.Rotation*Vector3.forward),Is.GreaterThan(.99999f));
                Assert.That(Vector3.Distance(pose.BeamOrigin,pose.Position),Is.EqualTo(WingmanAttackPose.NoseLocalZ*tuning.WingmanVisualScale).Within(.0001f));
                var repeated=WingmanAttackPose.Sample(flight,target,tuning.WingmanRunSeconds*i/16,tuning);
                Assert.AreEqual(pose.Position,repeated.Position);Assert.AreEqual(pose.BeamOrigin,repeated.BeamOrigin);
            }
        }
        [Test] public void InvalidPoseInputsAreRejectedBeforeAnyWorldIsCreated()
        {
            Assert.Throws<System.ArgumentException>(()=>WingmanAttackPose.Sample(flight,new Vector3(float.NaN,0,0),1,tuning));
            Assert.Throws<System.ArgumentException>(()=>WingmanAttackPose.Sample(flight,Vector3.zero,float.PositiveInfinity,tuning));
            Assert.Throws<System.ArgumentNullException>(()=>WingmanAttackPose.Sample(null,Vector3.zero,1,tuning));
        }
    }
}
