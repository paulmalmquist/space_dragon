using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class FinisherFeedbackVfxTests
    {
        GameObject host,ship;
        DogfightTuning tuning;
        FinisherFeedbackVfx feedback;
        [SetUp] public void Setup()
        {
            host=new GameObject("Finisher feedback fixture");ship=new GameObject("Independent visual motion");
            ship.transform.SetPositionAndRotation(new Vector3(10,5,20),Quaternion.Euler(10,30,45));
            tuning=ScriptableObject.CreateInstance<DogfightTuning>();feedback=host.AddComponent<FinisherFeedbackVfx>();
            feedback.Setup(ship.transform,tuning);
        }
        [TearDown] public void Cleanup(){Object.DestroyImmediate(host);Object.DestroyImmediate(ship);Object.DestroyImmediate(tuning);}

        [Test] public void LungeIsAnOutputOnlyAndImpactRemainsAtAuthoritativeTarget()
        {
            Vector3 position=ship.transform.position;Quaternion rotation=ship.transform.rotation;
            var target=new Vector3(20,10,50);feedback.Trigger(target);feedback.Tick(.05f,false);
            Assert.AreEqual(position,ship.transform.position);Assert.AreEqual(rotation,ship.transform.rotation);
            Assert.AreEqual(target,feedback.TargetWorld);Assert.Greater(feedback.VisualLungeOffset.z,0);
            Assert.AreEqual(0,feedback.VisualLungeOffset.x);Assert.AreEqual(0,feedback.VisualLungeOffset.y);
            ship.transform.position+=Vector3.right*100;feedback.Tick(.05f,false);Assert.AreEqual(target,feedback.TargetWorld);
            Assert.AreEqual(4,host.GetComponentsInChildren<LineRenderer>().Length);
            Assert.AreEqual(0,host.GetComponentsInChildren<Collider>().Length);Assert.AreEqual(0,host.GetComponentsInChildren<Rigidbody>().Length);
        }
        [Test] public void PausedOrInvalidTicksDoNotMoveCueAndClearRemovesAllOffset()
        {
            feedback.Trigger(Vector3.forward*40);feedback.Tick(.05f,false);
            float radius=feedback.ShockwaveRadius,remaining=feedback.RemainingSeconds;Vector3 offset=feedback.VisualLungeOffset;
            feedback.Tick(0,false);feedback.Tick(-1,false);feedback.Tick(float.NaN,false);feedback.Tick(float.PositiveInfinity,false);
            Assert.AreEqual(radius,feedback.ShockwaveRadius);Assert.AreEqual(offset,feedback.VisualLungeOffset);Assert.AreEqual(remaining,feedback.RemainingSeconds);
            feedback.Clear();Assert.False(feedback.Active);Assert.AreEqual(Vector3.zero,feedback.VisualLungeOffset);
            foreach(var line in host.GetComponentsInChildren<LineRenderer>())Assert.False(line.enabled);
        }
        [Test] public void ReducedMotionUsesStableClawAndRingWithoutLungeOrExpansion()
        {
            feedback.Trigger(Vector3.forward*40);feedback.Tick(.05f,true);
            float radius=feedback.ShockwaveRadius;var line=host.GetComponentInChildren<LineRenderer>();var point=line.GetPosition(0);
            var color=line.sharedMaterial.GetColor("_Tint");feedback.Tick(.1f,true);
            Assert.AreEqual(Vector3.zero,feedback.VisualLungeOffset);Assert.AreEqual(radius,feedback.ShockwaveRadius);
            Assert.AreEqual(point,line.GetPosition(0));Assert.AreEqual(color,line.sharedMaterial.GetColor("_Tint"));
            feedback.Tick(tuning.FinisherVisualSeconds,true);Assert.False(feedback.Active);
        }
        [Test] public void RepeatedEventsReuseBoundedGeometryAndDisposeOwnedResources()
        {
            for(int i=0;i<5;i++){feedback.Trigger(Vector3.forward*(20+i));feedback.Tick(.01f,false);}
            Assert.AreEqual(4,host.GetComponentsInChildren<LineRenderer>().Length);
            var line=host.GetComponentInChildren<LineRenderer>();var material=line.sharedMaterial;
            Object.DestroyImmediate(feedback);Assert.True(line==null);Assert.True(material==null);Assert.NotNull(ship);
        }
    }
}
