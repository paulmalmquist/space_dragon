using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    /// <summary>
    /// Needs the Unity Editor: it builds real LineRenderers on the Weapon Energy shader. The
    /// timeline itself is covered engine-free by KillSequenceStateTests.
    /// </summary>
    public sealed class KillSequenceVisualTests
    {
        const string RootName="PLACEHOLDER kill sequence - cosmetic only";
        const float Step=1f/60;
        DogfightTuning tuning;
        KillSequenceState state;
        KillSequenceVisual visual;
        [SetUp] public void Setup()
        {
            tuning=ScriptableObject.CreateInstance<DogfightTuning>();state=new KillSequenceState(tuning);
            visual=new KillSequenceVisual();visual.Setup(tuning);
        }
        [TearDown] public void Cleanup(){visual.Dispose();Object.DestroyImmediate(tuning);}
        static LineRenderer[] Lines(){var root=GameObject.Find(RootName);return root==null?new LineRenderer[0]:root.GetComponentsInChildren<LineRenderer>(true);}

        [Test] public void OwnsNothingUntilASequenceIsShownThenOnlyLinesAndNoPhysics()
        {
            Assert.AreEqual(0,visual.OwnedRendererCount);Assert.IsNull(GameObject.Find(RootName));
            visual.Show(state,Vector3.zero,Vector3.right,Vector3.up);
            Assert.AreEqual(0,visual.OwnedRendererCount,"An idle sequence builds nothing.");Assert.False(visual.Visible);
            state.Begin(new Vector3(0,0,150),Vector3.zero,1,false);
            visual.Show(state,Vector3.zero,Vector3.right,Vector3.up);
            int expected=1+KillSequenceVisual.SpikeCount+KillSequenceVisual.ShardCount;
            Assert.AreEqual(expected,visual.OwnedRendererCount);Assert.AreEqual(expected,Lines().Length);Assert.True(visual.Visible);
            var root=GameObject.Find(RootName);
            Assert.AreEqual(0,root.GetComponentsInChildren<Collider>(true).Length);Assert.AreEqual(0,root.GetComponentsInChildren<Rigidbody>(true).Length);
        }

        [Test] public void FlashShowsFirstThenRingAndShardsAfterTheBlast()
        {
            state.Begin(new Vector3(0,0,150),Vector3.zero,0,false);state.Tick(Step,false);
            visual.Show(state,Vector3.zero,Vector3.right,Vector3.up);
            Assert.AreEqual(KillSequenceVisual.SpikeCount,visual.VisibleSpikes);Assert.False(visual.RingVisible);Assert.AreEqual(0,visual.VisibleShards);
            while(state.Active&&state.HullVisible)state.Tick(Step,false);
            state.Tick(Step,false);
            visual.Show(state,Vector3.zero,Vector3.right,Vector3.up);
            Assert.True(visual.RingVisible);Assert.AreEqual(KillSequenceVisual.ShardCount,visual.VisibleShards);
            Assert.AreEqual(state.RingRadius,visual.DrawnRingRadius,.0001f);
        }

        [Test] public void RingFacesTheGivenCameraAtTheStateRadiusAndThickensWithDistance()
        {
            var centre=new Vector3(30,-20,400);var eye=new Vector3(0,0,0);
            Vector3 right=new Vector3(1,0,0),up=new Vector3(0,1,0);
            state.BeginBlast(centre,120,0,false);for(int i=0;i<10;i++)state.Tick(Step,false);
            visual.Show(state,eye,right,up);
            LineRenderer ring=null;foreach(var line in Lines())if(line.positionCount==KillSequenceVisual.RingSegments+1)ring=line;
            Assert.NotNull(ring);Assert.True(ring.enabled);
            for(int i=0;i<=KillSequenceVisual.RingSegments;i++)
            {
                Vector3 offset=ring.GetPosition(i)-centre;
                Assert.AreEqual(state.RingRadius,offset.magnitude,.01f);
                Assert.AreEqual(0,offset.z,.001f,"The ring lies in the plane the camera faces.");
            }
            float expected=Mathf.Max(tuning.KillRingWidth,Vector3.Distance(eye,centre)*tuning.KillWidthPerMetre);
            Assert.AreEqual(expected,visual.DrawnLineWidth,.0001f);Assert.AreEqual(expected,ring.startWidth,.0001f);
            Assert.Greater(visual.DrawnLineWidth,tuning.KillRingWidth,"At 400 m the line is widened so that it can still be seen.");
        }

        [Test] public void ReducedMotionDrawsOnlyTheStillRing()
        {
            state.Begin(new Vector3(0,0,150),new Vector3(50,0,0),0,true);
            visual.Show(state,Vector3.zero,Vector3.right,Vector3.up);
            float radius=visual.DrawnRingRadius;
            Assert.True(visual.RingVisible);Assert.AreEqual(0,visual.VisibleSpikes);Assert.AreEqual(0,visual.VisibleShards);
            state.Tick(.2f,true);visual.Show(state,Vector3.zero,Vector3.right,Vector3.up);
            Assert.AreEqual(radius,visual.DrawnRingRadius,.0001f);
        }

        [Test] public void FinishedOrHiddenSequenceDisablesEveryLine()
        {
            state.Begin(new Vector3(0,0,150),Vector3.zero,0,false);
            for(int i=0;i<40;i++)state.Tick(Step,false);
            visual.Show(state,Vector3.zero,Vector3.right,Vector3.up);Assert.True(visual.Visible);
            visual.Hide();Assert.False(visual.Visible);foreach(var line in Lines())Assert.False(line.enabled);
            visual.Show(state,Vector3.zero,Vector3.right,Vector3.up);Assert.True(visual.Visible);
            state.Tick(10,false);Assert.False(state.Active);
            visual.Show(state,Vector3.zero,Vector3.right,Vector3.up);
            Assert.False(visual.Visible);foreach(var line in Lines())Assert.False(line.enabled);
        }

        [Test] public void DisposeReleasesEverythingItBuilt()
        {
            state.Begin(new Vector3(0,0,150),Vector3.zero,0,false);
            visual.Show(state,Vector3.zero,Vector3.right,Vector3.up);
            var line=Lines()[0];var material=line.sharedMaterial;
            visual.Dispose();
            Assert.True(line==null);Assert.True(material==null);Assert.IsNull(GameObject.Find(RootName));Assert.AreEqual(0,visual.OwnedRendererCount);
        }

        [Test] public void DirectionsAreUnitLengthSpreadAndVaryByVariant()
        {
            Vector3 sum=Vector3.zero;
            for(int i=0;i<KillSequenceVisual.ShardCount;i++)
            {
                Vector3 direction=KillSequenceVisual.Direction(i,KillSequenceVisual.ShardCount,0);
                Assert.AreEqual(1,direction.magnitude,.0001f);sum+=direction;
            }
            Assert.Less(sum.magnitude,1.5f,"Debris flies out in all directions, not to one side.");
            Assert.AreNotEqual(KillSequenceVisual.Direction(0,10,0),KillSequenceVisual.Direction(0,10,1));
            Assert.AreEqual(Vector3.up,KillSequenceVisual.Direction(0,0,0));
        }
    }
}
