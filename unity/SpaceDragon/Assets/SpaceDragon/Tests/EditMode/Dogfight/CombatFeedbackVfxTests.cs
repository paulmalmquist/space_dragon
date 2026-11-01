using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class CombatFeedbackVfxTests
    {
        GameObject host,ship;
        DogfightTuning tuning;
        CombatFeedbackVfx feedback;
        [SetUp] public void Setup()
        {
            host=new GameObject("Feedback test");ship=new GameObject("Independent visual ship");
            ship.transform.SetPositionAndRotation(new Vector3(10,20,30),Quaternion.Euler(12,25,45));
            tuning=ScriptableObject.CreateInstance<DogfightTuning>();tuning.PerfectRollVisualSeconds=.35f;
            feedback=host.AddComponent<CombatFeedbackVfx>();feedback.Setup(ship.transform,tuning);
        }
        [TearDown] public void Cleanup()
        {Object.DestroyImmediate(host);Object.DestroyImmediate(ship);Object.DestroyImmediate(tuning);}

        [Test] public void CapturedOutlineStaysInWorldAndNeverMovesTheShipOrAddsPhysics()
        {
            var rotation=ship.transform.rotation;var position=ship.transform.position;
            feedback.PerfectRoll();Assert.True(feedback.Active);Assert.False(feedback.OutlineVisible);
            feedback.Tick(.05f,false);Assert.True(feedback.OutlineVisible);Assert.AreEqual(8,feedback.VisibleFlareCount);
            var lines=host.GetComponentsInChildren<LineRenderer>();var snapshot=lines[0].GetPosition(0);
            Assert.AreEqual(position,ship.transform.position);Assert.AreEqual(rotation,ship.transform.rotation);
            ship.transform.position+=Vector3.forward*100;
            feedback.Tick(.05f,false);Assert.AreEqual(snapshot,lines[0].GetPosition(0));Assert.AreEqual(position,feedback.SnapshotOrigin);
            Assert.AreEqual(0,host.GetComponentsInChildren<Collider>().Length);Assert.AreEqual(0,host.GetComponentsInChildren<Rigidbody>().Length);
            Assert.AreEqual(0,host.GetComponentsInChildren<Animator>().Length);
        }

        [Test] public void PauseByOmittingTickAndInvalidDeltasCannotAdvanceEffects()
        {
            feedback.PerfectRoll();feedback.Tick(.05f,false);
            float remaining=feedback.RemainingSeconds;var lines=host.GetComponentsInChildren<LineRenderer>();
            var flare=lines[lines.Length-1].GetPosition(0);
            feedback.Tick(0,false);feedback.Tick(-1,false);feedback.Tick(float.NaN,false);feedback.Tick(float.PositiveInfinity,false);
            Assert.AreEqual(remaining,feedback.RemainingSeconds);Assert.AreEqual(flare,lines[lines.Length-1].GetPosition(0));
            feedback.Tick(.4f,false);Assert.False(feedback.Active);Assert.False(feedback.OutlineVisible);Assert.AreEqual(0,feedback.VisibleFlareCount);
        }

        [Test] public void ReducedMotionShowsOnlyStableOutlineAndRestartClearsIt()
        {
            feedback.PerfectRoll();feedback.Tick(.05f,true);
            Assert.True(feedback.OutlineVisible);Assert.True(feedback.ReducedMotion);Assert.AreEqual(0,feedback.VisibleFlareCount);
            var lines=host.GetComponentsInChildren<LineRenderer>();var snapshot=lines[0].GetPosition(0);
            var tint=lines[0].sharedMaterial.GetColor("_Tint");
            feedback.Tick(.05f,true);Assert.AreEqual(snapshot,lines[0].GetPosition(0));Assert.AreEqual(tint,lines[0].sharedMaterial.GetColor("_Tint"));
            feedback.Clear();Assert.False(feedback.Active);Assert.AreEqual(0,feedback.RemainingSeconds);
            foreach(var line in lines)Assert.False(line.enabled);
            feedback.PerfectRoll();feedback.Tick(.05f,false);Assert.AreEqual(lines.Length,host.GetComponentsInChildren<LineRenderer>().Length);
            Assert.AreEqual(8,feedback.VisibleFlareCount);
        }

        [Test] public void DestroyReleasesOwnedObjectsAndMaterialsOnly()
        {
            feedback.PerfectRoll();feedback.Tick(.05f,false);
            var line=host.GetComponentInChildren<LineRenderer>();var material=line.sharedMaterial;
            Object.DestroyImmediate(feedback);
            Assert.True(line==null);Assert.True(material==null);Assert.NotNull(ship);
            Assert.AreEqual(0,host.transform.childCount);
        }
    }
}
