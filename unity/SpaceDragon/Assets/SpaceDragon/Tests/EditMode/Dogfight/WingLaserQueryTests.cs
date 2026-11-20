using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class WingLaserQueryTests
    {
        [Test] public void BothWingsReachCurrentTargetWithoutTravelOrLeadPrediction()
        {
            var target = new WingLaserTarget(7,new Vector3(12,3,300));
            var targets = new[] { target };
            foreach(float side in new[] { -1f, 1f })
            {
                var origin = new Vector3(side*3,0,0);
                var hit = WingLaserQuery.Resolve(origin,target.Position-origin,targets);
                Assert.That(hit.TargetIndex,Is.EqualTo(7));
                Assert.That(Vector3.Distance(hit.Endpoint,target.Position),Is.EqualTo(5).Within(.001));
            }
            Assert.That(WingLaserQuery.DamagePerWing*2,Is.EqualTo(8));
        }
        [Test] public void NearShipAndEnvironmentOccludeTheFarShip()
        {
            var targets = new[] { new WingLaserTarget(2,new Vector3(0,0,300)),new WingLaserTarget(1,new Vector3(0,0,100)) };
            Assert.That(WingLaserQuery.Resolve(Vector3.zero,Vector3.forward,targets).TargetIndex,Is.EqualTo(1));
            var blocked = WingLaserQuery.Resolve(Vector3.zero,Vector3.forward,targets,40);
            Assert.That(blocked.TargetIndex,Is.EqualTo(-1)); Assert.That(blocked.Blocked,Is.True);
            Assert.That(blocked.Endpoint.z,Is.EqualTo(40).Within(.001));
        }
        [Test] public void AimingAwayAndOutOfRangeCannotGrantDamage()
        {
            Assert.That(WingLaserQuery.Resolve(Vector3.zero,Vector3.forward,new[] {new WingLaserTarget(0,new Vector3(10,0,100))}).TargetIndex,Is.EqualTo(-1));
            Assert.That(WingLaserQuery.Resolve(Vector3.zero,Vector3.forward,new[] {new WingLaserTarget(0,new Vector3(0,0,700))}).TargetIndex,Is.EqualTo(-1));
            Assert.That(WingLaserQuery.Resolve(Vector3.zero,Vector3.forward,null).Endpoint.z,Is.EqualTo(WingLaserQuery.Range));
        }
        [Test] public void OneBlockedWingDoesNotSuppressTheClearWing()
        {
            var target=new WingLaserTarget(0,new Vector3(0,0,100)); var targets=new[] {target};
            var left=new Vector3(-3,0,0);var right=new Vector3(3,0,0);
            Assert.That(WingLaserQuery.Resolve(left,target.Position-left,targets,20).TargetIndex,Is.EqualTo(-1));
            Assert.That(WingLaserQuery.Resolve(right,target.Position-right,targets).TargetIndex,Is.EqualTo(0));
        }
    }
}
