using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    /// <summary>
    /// The swept sphere test through its engine-free entry point. EncounterCollisionTests keeps
    /// the same cases through the encounter, which now forwards here.
    /// </summary>
    public sealed class CombatGeometryTests
    {
        [Test] public void FastPointCannotTunnelThroughSphere()
        {
            Assert.That(CombatGeometry.SegmentSphere(new Vector3(0,0,-20),new Vector3(0,0,20),Vector3.zero,3.3f,out float t),Is.True);
            Assert.That(t,Is.EqualTo(.4175f).Within(.0001f));
        }
        [Test] public void PathBesideOrShortOfSphereMisses()
        {
            Assert.That(CombatGeometry.SegmentSphere(new Vector3(8,0,-20),new Vector3(8,0,20),Vector3.zero,3.3f,out _),Is.False);
            Assert.That(CombatGeometry.SegmentSphere(new Vector3(0,0,5),new Vector3(0,0,10),Vector3.zero,3.3f,out _),Is.False);
        }
        [Test] public void StartInsideHitsAtZeroAndStationaryOutsideMisses()
        {
            Assert.That(CombatGeometry.SegmentSphere(Vector3.zero,Vector3.zero,Vector3.zero,3.3f,out float t),Is.True);
            Assert.That(t,Is.Zero);
            Assert.That(CombatGeometry.SegmentSphere(Vector3.one*10,Vector3.one*10,Vector3.zero,3.3f,out _),Is.False);
        }
        [Test] public void PathMovingAwayFromSphereMisses()
        {
            Assert.That(CombatGeometry.SegmentSphere(new Vector3(0,0,5),new Vector3(0,0,-20),Vector3.zero,3.3f,out float toward),Is.True);
            Assert.That(toward,Is.EqualTo(.068f).Within(.0001f));
            Assert.That(CombatGeometry.SegmentSphere(new Vector3(0,0,5),new Vector3(0,0,30),Vector3.zero,3.3f,out _),Is.False);
        }
    }
}
