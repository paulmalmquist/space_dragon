using System;
using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class ShipWeaponsVfxTests
    {
        GameObject host,sockets;
        Transform mouth,left,right;
        ShipWeaponsVfx vfx;
        static BreathBurst Burst(bool windup=false)=>new BreathBurst {Id=1,TargetIds=new[]{1,2,3},Elapsed=windup?.25f:.8f,WindupDuration=.65f,BeamDuration=1.1f,Duration=1.75f};
        [SetUp] public void Setup()
        {
            host=new GameObject("Weapon effects test");sockets=new GameObject("Unchanged weapon sockets");
            mouth=Child("Mouth",new Vector3(1,2,3));left=Child("Left",new Vector3(-2,1,0));right=Child("Right",new Vector3(2,1,0));
            vfx=host.AddComponent<ShipWeaponsVfx>();vfx.Configure(mouth,left,right);
        }
        Transform Child(string name,Vector3 point){var child=new GameObject(name).transform;child.SetParent(sockets.transform,false);child.position=point;return child;}
        [TearDown] public void Cleanup(){UnityEngine.Object.DestroyImmediate(host);UnityEngine.Object.DestroyImmediate(sockets);}

        [Test] public void SingleEndpointOverloadKeepsOriginalFourStreamMouthAndCoreOrigins()
        {
            Vector3 endpoint=new Vector3(0,0,150);vfx.Tick(.1f,Burst(),endpoint,Vector3.forward,Vector3.up,false);
            Assert.AreEqual(1,vfx.ActiveBeamCount);Assert.True(vfx.BeamActive);Assert.False(vfx.WindupActive);
            Assert.AreEqual(mouth.position,vfx.BeamOrigin);Assert.AreEqual(mouth.position,vfx.BeamCoreOrigin);
            Assert.AreEqual(endpoint,vfx.BeamEndpoints[0]);
            Assert.True(GameObject.Find("Fire stream 3").GetComponent<LineRenderer>().enabled);
            Assert.False(GameObject.Find("Additional breath target 1 layer 0").GetComponent<LineRenderer>().enabled);
        }
        [Test] public void ThreeBeamsStartAtOneMouthAndLostEndpointsCannotLeaveStaleStreams()
        {
            var endpoints=new[]{new Vector3(-30,5,130),new Vector3(0,10,140),new Vector3(40,-5,150)};
            vfx.Tick(.1f,Burst(),endpoints,Vector3.forward,Vector3.up,false);Assert.AreEqual(3,vfx.ActiveBeamCount);
            CollectionAssert.AreEqual(endpoints,vfx.BeamEndpoints);foreach(var origin in vfx.BeamOrigins)Assert.AreEqual(mouth.position,origin);
            var snapshot=vfx.BeamEndpoints;snapshot[0]=Vector3.one;Assert.AreEqual(endpoints[0],vfx.BeamEndpoints[0]);
            vfx.Tick(.1f,Burst(),new[]{endpoints[2]},Vector3.forward,Vector3.up,false);Assert.AreEqual(1,vfx.ActiveBeamCount);
            Assert.False(GameObject.Find("Additional breath target 1 layer 0").GetComponent<LineRenderer>().enabled);
            Assert.False(GameObject.Find("Additional breath target 2 layer 1").GetComponent<LineRenderer>().enabled);
            vfx.Tick(.1f,Burst(),Array.Empty<Vector3>(),Vector3.forward,Vector3.up,false);Assert.AreEqual(0,vfx.ActiveBeamCount);Assert.False(vfx.BeamActive);
        }
        [Test] public void MultipleTargetsShareOneWindupAndRejectInvalidEndpointsWithoutChangingBurst()
        {
            var burst=Burst(true);float elapsed=burst.Elapsed;
            var endpoints=new[]{new Vector3(float.NaN,0,10),new Vector3(0,0,120),new Vector3(float.PositiveInfinity,0,10)};
            vfx.Tick(.1f,burst,endpoints,Vector3.forward,Vector3.up,true);
            Assert.True(vfx.WindupActive);Assert.AreEqual(0,vfx.ActiveBeamCount);Assert.AreEqual(elapsed,burst.Elapsed);
            Assert.AreEqual(mouth.position,vfx.WindupOrigin);
            vfx.Tick(.1f,Burst(),endpoints,Vector3.forward,Vector3.up,true);Assert.AreEqual(1,vfx.ActiveBeamCount);
            vfx.Tick(.1f,Burst(),(Vector3[])null,Vector3.forward,Vector3.up,true);Assert.AreEqual(0,vfx.ActiveBeamCount);
        }
        [Test] public void PauseClearAndCleanupApplyToEveryBeamAndRetainBoundedCapacity()
        {
            var endpoints=new[]{Vector3.forward*100,Vector3.forward*110,Vector3.forward*120,Vector3.forward*130};
            vfx.Tick(.1f,Burst(),endpoints,Vector3.forward,Vector3.up,false);Assert.AreEqual(3,vfx.ActiveBeamCount);
            var line=GameObject.Find("Additional breath target 2 layer 0").GetComponent<LineRenderer>();var point=line.GetPosition(5);
            vfx.Tick(0,Burst(),Array.Empty<Vector3>(),Vector3.forward,Vector3.up,false);vfx.Tick(float.NaN,Burst(),endpoints,Vector3.forward,Vector3.up,false);
            Assert.AreEqual(3,vfx.ActiveBeamCount);Assert.AreEqual(point,line.GetPosition(5));
            vfx.Clear();Assert.AreEqual(0,vfx.ActiveBeamCount);Assert.False(line.enabled);Assert.False(vfx.WindupActive);
            vfx.Tick(.1f,Burst(),endpoints,Vector3.forward,Vector3.up,true);Assert.AreEqual(3,vfx.ActiveBeamCount);
            var material=line.sharedMaterial;UnityEngine.Object.DestroyImmediate(vfx);
            Assert.True(line==null);Assert.True(material==null);Assert.NotNull(mouth);
        }
    }
}
