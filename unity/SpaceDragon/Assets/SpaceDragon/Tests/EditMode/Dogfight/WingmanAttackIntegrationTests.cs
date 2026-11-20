using System.Collections.Generic;
using System.Reflection;
using NUnit.Framework;
using UnityEngine;

namespace SpaceDragon.Dogfight.Tests
{
    public sealed class WingmanAttackIntegrationTests
    {
        GameObject host,rock;
        DogfightEncounter encounter;
        DogfightTuning tuning;
        FlightState flight;
        WingmanState wingman;
        RocksWeaponState gas;
        EnemyView target;
        const BindingFlags Private=BindingFlags.Instance|BindingFlags.NonPublic;
        FieldInfo Field(string name)=>typeof(DogfightEncounter).GetField(name,Private);
        void Set(string name,object value)=>Field(name).SetValue(encounter,value);
        [SetUp] public void Setup()
        {
            host=new GameObject("Wingman scenery adapter fixture");encounter=host.AddComponent<DogfightEncounter>();
            tuning=ScriptableObject.CreateInstance<DogfightTuning>();flight=new FlightState();wingman=new WingmanState(tuning);gas=new RocksWeaponState(tuning);
            typeof(DogfightEncounter).GetProperty(nameof(DogfightEncounter.Flight)).SetValue(encounter,flight);
            Set("tuning",tuning);Set("wingman",wingman);Set("rockWeapons",gas);
            Set("damageVfx",host.AddComponent<DamageVfx>());Set("sound",host.AddComponent<DogfightAudio>());
            var combat=new EnemyRoleState(EnemyRole.Fighter,tuning);var pilot=new RolePilotState(0,combat,tuning);
            target=new EnemyView{Id="test-target",Combat=combat,RolePilot=pilot,Pilot=pilot.Pilot,Position=Vector3.forward*400};
            ((List<EnemyView>)Field("enemies").GetValue(encounter)).Add(target);
            wingman.TrySend(target.Id);
        }
        [TearDown] public void Cleanup(){Object.DestroyImmediate(rock);Object.DestroyImmediate(host);Object.DestroyImmediate(tuning);}
        void Step(float dt)=>typeof(DogfightEncounter).GetMethod("TickWingman",Private).Invoke(encounter,new object[]{dt});
        void RockAt(Vector3 position,bool gasPocket)
        {
            rock=new GameObject("Unchanged solid test asteroid");rock.layer=8;rock.transform.position=position;rock.AddComponent<SphereCollider>().radius=3;
            if(gasPocket){((List<GameObject>)Field("gasRocks").GetValue(encounter)).Add(rock);gas.Reset(new[]{new RockPocket("gas-0",position)});}
            Physics.SyncTransforms();
        }
        [Test] public void WingmanShotDetonatesInterceptingGasOnceAndCannotDamageThroughIt()
        {
            var pose=WingmanAttackPose.Sample(flight,target.Position,tuning.WingmanRunSeconds-.01f,tuning);
            RockAt(Vector3.Lerp(pose.BeamOrigin,target.Position,.5f),true);float health=target.Health;
            Step(0);Assert.False(gas.Pockets[0].Detonated);
            Step(.01f);Assert.True(gas.Pockets[0].Detonated);Assert.AreEqual(health,target.Health);
            var end=(Vector3?)Field("wingmanBeamEndpoint").GetValue(encounter);
            Assert.True(end.HasValue);Assert.That(Vector3.Distance(end.Value,rock.transform.position),Is.EqualTo(3).Within(.01f));
            Step(.01f);Assert.AreEqual(1,(int)Field("gasDetonations").GetValue(encounter));Assert.AreEqual(health,target.Health);
            Assert.NotNull(rock.GetComponent<Collider>());Assert.AreEqual(3,rock.GetComponent<SphereCollider>().radius);
        }
        [Test] public void PlainSceneryClipsTheWingmanBeamWithoutTriggeringGasOrTargetDamage()
        {
            var pose=WingmanAttackPose.Sample(flight,target.Position,tuning.WingmanRunSeconds-.01f,tuning);
            RockAt(Vector3.Lerp(pose.BeamOrigin,target.Position,.5f),false);float health=target.Health;
            Step(.01f);Assert.AreEqual(health,target.Health);Assert.AreEqual(0,(int)Field("gasDetonations").GetValue(encounter));
            Assert.AreNotEqual(target.Position,(Vector3?)Field("wingmanBeamEndpoint").GetValue(encounter));
        }
        [Test] public void SceneryBlockingOnlyThePlayerDoesNotBlockTheAllysClearShot()
        {
            RockAt(Vector3.forward*100,false);float health=target.Health;
            Assert.True(Physics.Linecast(flight.Position,target.Position,1<<8));
            Step(.01f);Assert.That(target.Health,Is.EqualTo(health-tuning.WingmanDamagePerSecond*.01f).Within(.001f));
            Assert.AreEqual(target.Position,(Vector3?)Field("wingmanBeamEndpoint").GetValue(encounter));
        }
    }
}
