using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class EncounterCollisionTests
    {
        [Test] public void FastProjectileCannotTunnelThroughGameplaySphere()
        {
            Assert.That(DogfightEncounter.SegmentSphere(new Vector3(0,0,-20),new Vector3(0,0,20),Vector3.zero,3.3f,out float t),Is.True);
            Assert.That(t,Is.EqualTo(.4175f).Within(.0001f));
        }
        [Test] public void TrajectoryPastTargetMissesInsteadOfGrantingAutomaticDamage()
        {
            Assert.That(DogfightEncounter.SegmentSphere(new Vector3(8,0,-20),new Vector3(8,0,20),Vector3.zero,3.3f,out _),Is.False);
            Assert.That(DogfightEncounter.SegmentSphere(new Vector3(0,0,5),new Vector3(0,0,10),Vector3.zero,3.3f,out _),Is.False);
        }
        [Test] public void InitialOverlapHitsOnceAndStationaryOutsideDoesNot()
        {
            Assert.That(DogfightEncounter.SegmentSphere(Vector3.zero,Vector3.zero,Vector3.zero,3.3f,out float t),Is.True);
            Assert.That(t,Is.Zero);
            Assert.That(DogfightEncounter.SegmentSphere(Vector3.one*10,Vector3.one*10,Vector3.zero,3.3f,out _),Is.False);
        }
    }
}
