using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class WingmanVisualTests
    {
        WingmanVisual visual;
        DogfightTuning tuning;
        FlightState flight;
        WingmanState state;
        [SetUp] public void Setup()
        {
            tuning=ScriptableObject.CreateInstance<DogfightTuning>();flight=new FlightState();state=new WingmanState(tuning);
            visual=new WingmanVisual();visual.Setup(tuning);
        }
        [TearDown] public void Cleanup(){visual.Dispose();Object.DestroyImmediate(tuning);}
        [Test] public void FormationIsLeftAboveForwardAndHasNoPhysicsOrStateWrites()
        {
            visual.Tick(.05f,flight,state,null,true);
            Assert.True(visual.Visible);Assert.False(visual.BeamVisible);
            Vector3 local=Quaternion.Inverse(flight.Rotation)*(visual.Position-flight.Position);
            Assert.That(local.x,Is.EqualTo(-tuning.WingmanFormationDistance).Within(.001f));Assert.Greater(local.y,0);Assert.Greater(local.z,0);
            Assert.AreEqual(Vector3.zero,flight.Position);Assert.AreEqual(0,state.RunsSent);
            var obj=GameObject.Find("PLACEHOLDER lab wingman - no crew or collision");Assert.NotNull(obj);
            Assert.AreEqual(0,obj.GetComponentsInChildren<Collider>(true).Length);Assert.AreEqual(0,obj.GetComponentsInChildren<Rigidbody>(true).Length);
            Assert.AreEqual(4,visual.OwnedRendererCount);
        }
        [Test] public void StrafeObservesRunWithoutAdvancingItAndLostTargetImmediatelyHidesBeam()
        {
            Assert.True(state.TrySend("target"));float remaining=state.RunRemaining;var target=new Vector3(0,0,140);
            visual.Tick(.1f,flight,state,target,false);Assert.True(visual.BeamVisible);Assert.AreEqual(remaining,state.RunRemaining);
            var start=visual.Position;state.Tick(1,true);visual.Tick(.1f,flight,state,target,false);Assert.AreNotEqual(start,visual.Position);
            visual.Tick(.1f,flight,state,null,false);Assert.False(visual.BeamVisible);
            Assert.True(state.Running,"Only authoritative state cancels its run.");
            state.CancelRun();for(int i=0;i<20;i++)visual.Tick(.1f,flight,state,null,true);
            Assert.Less(Vector3.Distance(visual.Position,visual.FormationPosition),.01f);
        }
        [Test] public void PauseAndReducedMotionDoNotIntroduceIdleDriftAndClearAllowsRestart()
        {
            visual.Tick(.1f,flight,state,null,true);Vector3 position=visual.Position;
            visual.Tick(0,flight,state,null,false);visual.Tick(float.NaN,flight,state,null,false);
            Assert.AreEqual(position,visual.Position);
            visual.Tick(.1f,flight,state,null,true);Assert.AreEqual(position,visual.Position);
            visual.Clear();Assert.False(visual.Visible);Assert.False(visual.BeamVisible);Assert.AreEqual(Vector3.zero,visual.FormationPosition);
            visual.Tick(.1f,flight,state,null,true);Assert.True(visual.Visible);Assert.AreEqual(position,visual.Position);
        }
        [Test] public void DisabledFlagAndDisposeLeaveNoVisibleObjectsOrOwnedResources()
        {
            visual.Tick(.05f,flight,state,null,true);var obj=GameObject.Find("PLACEHOLDER lab wingman - no crew or collision");
            var mesh=obj.GetComponentInChildren<MeshFilter>().sharedMesh;var material=obj.GetComponentInChildren<MeshRenderer>().sharedMaterial;
            tuning.EnableWingman=false;visual.Tick(.1f,flight,state,null,true);Assert.False(visual.Visible);
            visual.Dispose();Assert.True(obj==null);Assert.True(mesh==null);Assert.True(material==null);
            visual.Setup(tuning);visual.Tick(.1f,flight,state,null,true);Assert.False(visual.Visible);Assert.AreEqual(0,visual.OwnedRendererCount);
        }
        [Test] public void SceneryClippedBeamUsesExactlyTheAuthoritativeAttackPoseAndEndpoint()
        {
            var target=new Vector3(0,0,140);var rockHit=new Vector3(-10,4,75);
            state.TrySend("target");state.Tick(1,true);
            var pose=WingmanAttackPose.Sample(flight,target,state.RunRemaining,tuning);
            visual.Tick(.1f,flight,state,target,rockHit,false);
            Assert.True(visual.BeamVisible);Assert.AreEqual(pose.Position,visual.Position);
            Assert.AreEqual(pose.BeamOrigin,visual.BeamOrigin);Assert.AreEqual(rockHit,visual.BeamEndpoint);
            visual.Tick(0,flight,state,target,null,false);Assert.AreEqual(rockHit,visual.BeamEndpoint);
            visual.Tick(.1f,flight,state,target,null,false);Assert.False(visual.BeamVisible);
            Assert.True(state.Running,"Rendering a blocked/missing beam cannot cancel the attack state.");
        }
    }
}
