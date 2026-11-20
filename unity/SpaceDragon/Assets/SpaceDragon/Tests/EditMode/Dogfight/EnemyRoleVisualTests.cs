using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class EnemyRoleVisualTests
    {
        GameObject visual;
        DogfightTuning tuning;
        EnemyRoleVisual helper;
        [SetUp] public void Setup()
        {
            visual=GameObject.CreatePrimitive(PrimitiveType.Cube);visual.name="Untouched imported-drone fixture";
            Object.DestroyImmediate(visual.GetComponent<Collider>());
            visual.transform.SetPositionAndRotation(new Vector3(11,23,42),Quaternion.Euler(10,180,12));
            tuning=ScriptableObject.CreateInstance<DogfightTuning>();helper=new EnemyRoleVisual();
        }
        [TearDown] public void Cleanup(){helper.Dispose();Object.DestroyImmediate(visual);Object.DestroyImmediate(tuning);}

        [Test] public void FighterAndDisabledRoleFlagLeaveOriginalHierarchyAndMaterialUntouched()
        {
            var original=visual.GetComponent<Renderer>().sharedMaterial;
            helper.Setup(visual.transform,EnemyRole.Fighter,tuning);
            helper.Tick(new EnemyRoleState(EnemyRole.Fighter,tuning),1,false);
            Assert.AreEqual(0,helper.OwnedRendererCount);Assert.AreEqual(0,visual.transform.childCount);
            Assert.AreSame(original,visual.GetComponent<Renderer>().sharedMaterial);
            helper.Dispose();tuning.EnableEnemyRoles=false;
            helper.Setup(visual.transform,EnemyRole.Racer,tuning);
            helper.Tick(new EnemyRoleState(EnemyRole.Racer,tuning),1,false);
            Assert.AreEqual(EnemyRole.Fighter,helper.Role);Assert.AreEqual(0,helper.OwnedRendererCount);
            Assert.AreEqual(0,visual.transform.childCount);
        }

        [Test] public void GunshipShieldTracksAuthoritativeStateAndUsesVisualMinusZWithoutChangingDamage()
        {
            var position=visual.transform.position;var rotation=visual.transform.rotation;
            var state=new EnemyRoleState(EnemyRole.Gunship,tuning);helper.Setup(visual.transform,state.Role,tuning);
            helper.Tick(state,1,false);Assert.True(helper.VisibleShield);
            Assert.Less(Vector3.Distance(-visual.transform.forward,helper.ForwardWorld),.0001f);
            var shield=visual.transform.Find("PLACEHOLDER Gunship silhouette - removable/Gunship forward hexagonal shield").GetComponent<LineRenderer>();
            for(int i=0;i<shield.positionCount;i++)Assert.Less(shield.GetPosition(i).z,0);
            float health=state.Health;state.ApplyDamage(WeaponKind.Breath,10);helper.Tick(state,2,false);
            Assert.False(helper.VisibleShield);Assert.False(shield.enabled);Assert.AreEqual(health,state.Health);
            Assert.AreEqual(position,visual.transform.position);Assert.AreEqual(rotation,visual.transform.rotation);
            state.Reset();helper.Clear();helper.Tick(state,3,true);Assert.True(helper.VisibleShield);
            var tint=shield.sharedMaterial.GetColor("_Tint");helper.Tick(state,8,true);Assert.AreEqual(tint,shield.sharedMaterial.GetColor("_Tint"));
            Assert.AreEqual(0,visual.GetComponentsInChildren<Collider>(true).Length);
        }

        [Test] public void GrapplerHookAndStunPosesObserveStateWithoutAdvancingIt()
        {
            var state=new EnemyRoleState(EnemyRole.Grappler,tuning);helper.Setup(visual.transform,state.Role,tuning);
            Assert.True(state.TryLatch(0));helper.Tick(state,0,false);Assert.True(helper.LatchedPose);
            Assert.True(state.ShakeOff());float remaining=state.StunRemaining;
            helper.Tick(state,1,true);Assert.False(helper.LatchedPose);Assert.True(helper.VisibleStun);
            var star=visual.transform.Find("PLACEHOLDER Grappler silhouette - removable/Grappler stunned star 0");
            var position=star.localPosition;helper.Tick(state,100,true);
            Assert.AreEqual(position,star.localPosition);Assert.AreEqual(remaining,state.StunRemaining);
            state.Tick(tuning.GrapplerStunSeconds);helper.Tick(state,101,false);Assert.False(helper.VisibleStun);
            state.ApplyDamage(WeaponKind.Environment,state.MaximumHealth);helper.Tick(state,102,false);
            Assert.False(visual.transform.GetChild(0).gameObject.activeSelf);
        }

        [Test] public void RacerHasDistinctOwnedGeometryAndDisposePreservesOriginalAsset()
        {
            var originalMesh=visual.GetComponent<MeshFilter>().sharedMesh;var originalMaterial=visual.GetComponent<Renderer>().sharedMaterial;
            var state=new EnemyRoleState(EnemyRole.Racer,tuning);helper.Setup(visual.transform,state.Role,tuning);helper.Tick(state,0,false);
            Assert.AreEqual(3,helper.OwnedRendererCount);
            var fins=visual.transform.Find("PLACEHOLDER Racer silhouette - removable/Racer swept solid dart fins").GetComponent<MeshFilter>();
            var owned=fins.sharedMesh;Assert.Greater(owned.bounds.size.x,originalMesh.bounds.size.x);
            Assert.AreEqual(0,visual.GetComponentsInChildren<Rigidbody>(true).Length);Assert.AreEqual(0,visual.GetComponentsInChildren<Collider>(true).Length);
            helper.Dispose();Assert.True(owned==null);Assert.AreEqual(0,visual.transform.childCount);
            Assert.AreSame(originalMesh,visual.GetComponent<MeshFilter>().sharedMesh);Assert.AreSame(originalMaterial,visual.GetComponent<Renderer>().sharedMaterial);
        }
    }
}
